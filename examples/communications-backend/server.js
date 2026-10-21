// SPDX-License-Identifier: Apache-2.0
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { loadConfig, fail, onlyKeys, ReferenceError } from "./lib/config.js";
import { SessionAuth, readBody, utf8, sha256, verifyTwilioWebhook, verifyTelnyxWebhook } from "./lib/security.js";
import { createProviders, ProviderFailure } from "./lib/providers.js";
import { InboundEngine, CONTRACT } from "./lib/engine.js";

export function createBackend({ config = loadConfig(), env = process.env, providers, now = Date.now, timers = true } = {}) {
  config = { ...config, twilioAccountSid: env.TWILIO_ACCOUNT_SID ?? config.twilioAccountSid };
  const carriers = providers ?? createProviders(config, env, { now });
  const auth = new SessionAuth(config, now);
  const engine = new InboundEngine(config, carriers, { now });
  const streams = new Set();
  const send = (res, status, body, type = "application/json") => {
    res.writeHead(status, { "Content-Type": type + "; charset=utf-8", "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
    res.end(type === "application/json" ? JSON.stringify(body) : body);
  };
  const sessionResponse = async (request, data) => {
    onlyKeys(data, ["provider"]);
    let principal, previous;
    try { previous = auth.get(request.headers.authorization, request.headers.origin); } catch (error) {
      if (error.status !== 401) throw error;
      principal = auth.bootstrap(request.headers.authorization, request.headers.origin);
    }
    principal ??= previous.principal;
    const provider = data.provider ?? previous?.provider ?? principal.providers[0];
    if (!principal.providers.includes(provider) || (previous && provider !== previous.provider)) fail("provider-denied", 403);
    const agent = engine.agents.get(principal.id);
    if (agent.reservation && (!previous || previous.id !== agent.sessionId)) fail("agent-reservation-held", 409);
    // Only token/read requests here. Session creation never answers/dials a call.
    const credentials = await carriers[provider].token(principal);
    const { session, token } = auth.issue(principal, provider, request.headers.origin, previous);
    engine.bindSession(session);
    return {
      contractVersion: CONTRACT, sessionId: session.id, sessionToken: token,
      expiresAt: new Date(session.expires).toISOString(), provider,
      tenantId: config.tenantId, agentId: principal.id, credentials,
      envelope: engine.envelope(session),
    };
  };
  const requestHandler = async (request, response) => {
    let session;
    try {
      if (typeof request.url !== "string" || !request.url.startsWith("/") || request.url.startsWith("//") ||
        request.url.includes("\\") || request.url.length > 2048) fail("invalid-request-url");
      const url = new URL(request.url, "http://reference.invalid");
      if (["token", "access_token", "sessionToken", "authorization", "tenantId", "agentId", "connectionId"].some((p) => url.searchParams.has(p))) fail("client-scope-or-query-auth-denied", 403);
      const path = url.pathname;
      if (request.method === "GET" && path === "/health") return send(response, 200, {
        status: "reference-running", contractVersion: CONTRACT, memoryOnly: true,
        carrierOperationsEnabled: config.operationsEnabled, liveCallVerification: "not performed",
      });
      if (path.startsWith("/v1/communications/")) {
        auth.origin(request.headers.origin);
        response.setHeader("Access-Control-Allow-Origin", request.headers.origin);
        response.setHeader("Vary", "Origin");
        if (request.method === "OPTIONS") {
          response.writeHead(204, { "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, Last-Event-ID",
            "Access-Control-Max-Age": "300", "Cache-Control": "no-store" });
          return response.end();
        }
      }
      if (path === "/v1/communications/session" && ["GET", "POST"].includes(request.method)) {
        let data;
        if (request.method === "GET") {
          if ([...url.searchParams.keys()].some((key) => key !== "provider")) fail("invalid-body");
          data = url.searchParams.has("provider") ? { provider: url.searchParams.get("provider") } : {};
        } else {
          if (request.headers["content-type"]?.split(";")[0] !== "application/json") fail("unsupported-content-type", 415);
          data = JSON.parse(utf8(await readBody(request, 4096)));
        }
        return send(response, 200, await sessionResponse(request, data));
      }
      if (path === "/v1/communications/events" && request.method === "GET") {
        if (url.search) fail("query-not-allowed");
        session = auth.get(request.headers.authorization, request.headers.origin);
        engine.agent(session);
        if (streams.size >= 8) fail("too-many-event-streams", 429);
        response.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store",
          "X-Accel-Buffering": "no", "X-Content-Type-Options": "nosniff",
        });
        const stream = { response, session };
        streams.add(stream);
        const push = () => {
          if (response.destroyed || response.writableEnded) return;
          if (session.expires <= now() || !auth.sessions.has(session.tokenHash)) return response.end();
          let envelope;
          try { envelope = engine.envelope(session); } catch { return response.end(); }
          if (response.writableLength > 262144) return response.end();
          response.write(`id: ${envelope.cursor}\nevent: snapshot\ndata: ${JSON.stringify(envelope)}\n\n`);
        };
        const unsubscribe = engine.subscribe(push);
        const interval = setInterval(push, 15000);
        interval.unref();
        const expires = setTimeout(() => response.end(), Math.max(0, session.expires - now()));
        expires.unref();
        response.on("close", () => { clearTimeout(expires); clearInterval(interval); unsubscribe(); streams.delete(stream); });
        push();
        return;
      }
      if (path === "/v1/communications/commands" && request.method === "POST") {
        if (url.search) fail("query-not-allowed");
        session = auth.get(request.headers.authorization, request.headers.origin);
        if (request.headers["content-type"]?.split(";")[0] !== "application/json") fail("unsupported-content-type", 415);
        const body = JSON.parse(utf8(await readBody(request, 8192)));
        const envelope = await engine.command(session, body);
        return send(response, envelope.result?.outcome === "unknown" ? 202 : 200, envelope);
      }
      const twilioHook = /^\/webhooks\/twilio\/(inbound|wait|dial-action|client-status|status)$/.exec(path);
      if (twilioHook && request.method === "POST") {
        if (!config.publicBaseUrl) fail("public-url-not-configured", 503);
        if (!/^AC[0-9a-f]{32}$/i.test(config.twilioAccountSid ?? "")) fail("provider-not-configured", 503);
        if (request.headers["content-type"]?.split(";")[0] !== "application/x-www-form-urlencoded") fail("unsupported-content-type", 415);
        const raw = await readBody(request);
        // Host/Forwarded headers never define the signed external URL.
        const form = verifyTwilioWebhook(raw, request.headers["x-twilio-signature"], config.publicBaseUrl + request.url, env.TWILIO_AUTH_TOKEN);
        const key = sha256(request.url + "\n" + raw.toString("base64"));
        const cached = engine.webhookCache.get(key);
        if (cached) return send(response, 200, cached.body, cached.type);
        let body, type;
        if (["inbound", "wait", "dial-action"].includes(twilioHook[1])) {
          body = engine.twilioInstruction(twilioHook[1], form, url.searchParams);
          type = "text/xml";
        } else {
          engine.twilioEvent(twilioHook[1], form, url.searchParams);
          body = { accepted: true };
          type = "application/json";
        }
        engine.remember(engine.webhookCache, key, { body, type });
        return send(response, 200, body, type);
      }
      if (path === "/webhooks/telnyx" && request.method === "POST") {
        if (url.search) fail("query-not-allowed");
        if (request.headers["content-type"]?.split(";")[0] !== "application/json") fail("unsupported-content-type", 415);
        const raw = await readBody(request);
        const text = verifyTelnyxWebhook(raw, request.headers["telnyx-signature-ed25519"],
          request.headers["telnyx-timestamp"], env.TELNYX_PUBLIC_KEY, now());
        engine.telnyxEvent(JSON.parse(text));
        // Async effects are tracked in memory; this ACK is not durable delivery.
        return send(response, 200, { accepted: true });
      }
      fail("not-found", 404);
    } catch (error) {
      const known = error instanceof ReferenceError;
      const providerFailure = error instanceof ProviderFailure;
      const status = known ? error.status : providerFailure ? 502 : error instanceof SyntaxError ? 400 : 500;
      const code = known || providerFailure ? error.code : error instanceof SyntaxError ? "invalid-json" : "reference-error";
      const safe = { code, message: code };
      if (session) {
        try { return send(response, status, engine.envelope(session, undefined, safe)); } catch { /* stale session */ }
      }
      if (!response.headersSent) send(response, status, { error: safe });
      else response.end();
    }
  };
  const server = createServer((req, res) => { void requestHandler(req, res); });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 64;
  const ticker = timers ? setInterval(() => engine.tick(), 1000) : null;
  ticker?.unref();
  const close = async () => {
    if (ticker) clearInterval(ticker);
    for (const { response } of streams) response.end();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await engine.idle();
  };
  return { server, engine, auth, close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const backend = createBackend();
    const host = process.env.HOST ?? "127.0.0.1";
    const port = Number(process.env.PORT ?? 8788);
    if (!Number.isInteger(port) || port < 1 || port > 65535) fail("invalid-port");
    backend.server.listen(port, host, () => console.log(`Inbound voice reference listening on ${host}:${port}; carrier operations ${backend.engine.config.operationsEnabled ? "enabled by configuration" : "DENIED"}.`));
    let stopping = false;
    const stop = async () => { if (stopping) return; stopping = true; await backend.close(); };
    process.on("SIGTERM", () => { void stop(); });
    process.on("SIGINT", () => { void stop(); });
  } catch (error) {
    console.error("Inbound reference startup refused:", error instanceof ReferenceError ? error.code : "invalid-local-configuration");
    process.exitCode = 1;
  }
}
