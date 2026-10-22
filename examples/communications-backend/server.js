// SPDX-License-Identifier: Apache-2.0
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { loadConfig, validateConfig, fail, onlyKeys, ReferenceError } from "./lib/config.js";
import { SessionAuth, readBody, utf8, sha256, verifyTwilioWebhook, verifyTelnyxWebhook } from "./lib/security.js";
import { createProviders, ProviderFailure } from "./lib/providers.js";
import { InboundEngine, CONTRACT } from "./lib/engine.js";
import { AutomaticSetup, SETUP_CONTRACT } from "./lib/automatic-setup.js";
import { createSetupProviderOperations, SetupProviderError } from "./lib/setup-providers.js";
import { randomUUID } from "node:crypto";

export function createBackend({ config = loadConfig(), env = process.env, providers, setupOperations, setupStore,
  now = Date.now, timers = true } = {}) {
  const baseConfig = structuredClone(config);
  const runtimeEnv = { ...env };
  config = { ...config, twilioAccountSid: runtimeEnv.TWILIO_ACCOUNT_SID ?? config.twilioAccountSid };
  let carriers = providers ?? createProviders(config, runtimeEnv, { now });
  let auth = new SessionAuth(config, now);
  let engine = new InboundEngine(config, carriers, { now });
  const streams = new Set();
  const profiles = new Map();
  const canConfigure = () => {
    if (setup?.credentialWorking.size) fail("setup-busy", 409);
    if (Object.keys(baseConfig.providers).length) fail("setup-manual-runtime-conflict", 409);
    if (engine.pending.size || [...engine.calls.values()].some((call) => call.phase !== "ended") ||
      [...engine.agents.values()].some((agent) => agent.connected || agent.reservation)) fail("setup-busy", 409);
  };
  const activate = async (result) => {
    canConfigure();
    if (Object.keys(baseConfig.providers).length) fail("setup-manual-runtime-conflict", 409);
    if (result.provider === "twilio" &&
      (!/^AC[0-9a-f]{32}$/i.test(result.accountSid ?? "") || !/^SK[0-9a-f]{32}$/i.test(result.apiKeySid ?? "") ||
      typeof result.authToken !== "string" || !result.authToken || typeof result.apiKeySecret !== "string" || !result.apiKeySecret)) {
      fail("invalid-provider-response", 502);
    }
    const nextProfiles = new Map(profiles);
    nextProfiles.set(result.provider, result);
    const nextEnv = { ...runtimeEnv };
    const owner = { id: "aureform-owner", bootstrapHashEnv: "SETUP_ADMIN_AUTH_SHA256",
      providers: [...nextProfiles.keys()], operator: true };
    const pc = {};
    for (const [provider, profile] of nextProfiles) {
      pc[provider] = { inboundNumber: profile.number.phoneNumber };
      if (provider === "twilio") {
        nextEnv.TWILIO_ACCOUNT_SID = profile.accountSid;
        nextEnv.TWILIO_AUTH_TOKEN = profile.authToken;
        nextEnv.TWILIO_API_KEY_SID = profile.apiKeySid;
        nextEnv.TWILIO_API_KEY_SECRET = profile.apiKeySecret;
        owner.twilioIdentity = profile.twilioIdentity ?? "aureform_" + profile.connectionId.replaceAll("-", "").slice(0, 24);
      } else {
        nextEnv.TELNYX_API_KEY = profile.apiKey;
        nextEnv.TELNYX_PUBLIC_KEY = profile.publicKey;
        pc.telnyx.applicationId = profile.applicationId;
        pc.telnyx.credentialConnectionId = profile.credentialConnectionId;
        pc.telnyx.browserOutboundDisabledVerified = true;
        owner.managedTelnyxCredentials = true;
      }
    }
    const next = validateConfig({ ...baseConfig, providers: pc, agents: [owner], approvals: [] },
      { ...nextEnv, ENABLE_CARRIER_OPERATIONS: "false" });
    next.twilioAccountSid = nextEnv.TWILIO_ACCOUNT_SID;
    const nextCarriers = providers ?? createProviders(next, nextEnv, { now });
    if (nextProfiles.has("telnyx")) {
      const profile = nextProfiles.get("telnyx");
      nextCarriers.telnyx.token = async (principal) => {
        if ([...engine.calls.values()].some((call) => call.provider === "telnyx" && call.phase !== "ended")) {
          fail("credential-renewal-requires-idle-agent", 409);
        }
        const issuer = operations.telnyx.createBrowserCredential;
        if (!issuer) fail("managed-credential-issuer-unavailable", 503);
        const value = await setup.issueBrowserCredential(profile, principal.id, issuer, next.carrierTokenSeconds);
        if ([...engine.calls.values()].some((call) => call.provider === "telnyx" && call.phase !== "ended")) {
          fail("credential-renewal-requires-idle-agent", 409);
        }
        principal.telnyxCredentialId = value.credentialId;
        principal.telnyxSipUsername = value.sipUsername;
        principal.telnyxCredentialExpiresAt = value.expiresAt;
        return { kind: "telnyx-login-token", token: value.token, expiresAt: value.expiresAt };
      };
    }
    for (const { response } of streams) response.end();
    profiles.clear();
    for (const [provider, profile] of nextProfiles) profiles.set(provider, profile);
    Object.assign(runtimeEnv, nextEnv);
    config = next;
    carriers = nextCarriers;
    auth = new SessionAuth(config, now);
    engine = new InboundEngine(config, carriers, { now });
  };
  const authorizeTest = (profile, body) => {
    if ([...engine.calls.values()].some((call) => call.phase !== "ended")) fail("test-call-already-active", 409);
    const agent = engine.agents.get("aureform-owner");
    if (!agent?.connected || agent.provider !== profile.provider || agent.presence !== "available") fail("agent-not-ready", 409);
    if (profile.provider === "telnyx" &&
      Date.parse(agent.principal.telnyxCredentialExpiresAt) < now() + (body.seconds + 30) * 1000) fail("credential-renewal-required", 409);
    if (config.approvals.some((rule) => !engine.usedApprovals.has(rule.id) && Date.parse(rule.expiresAt) > now())) fail("test-permission-already-pending", 409);
    const rule = { id: "test-" + randomUUID(), provider: profile.provider,
      to: profile.number.phoneNumber, from: body.callerNumber, expiresAt: new Date(now() + 300000).toISOString(),
      maxCalls: 1, maxSeconds: body.seconds, maxBrowserLegs: 1, maxActions: 8, consentScope: "inbound-lab-single-call" };
    config.approvals = [rule];
    config.operationsEnabled = true;
    return { contractVersion: SETUP_CONTRACT, provider: profile.provider, phoneNumber: rule.to,
      callerNumber: rule.from, expiresAt: rule.expiresAt, maxSeconds: rule.maxSeconds, maxCalls: 1,
      phase: "test-authorized", observedCall: false };
  };
  const setupEnabled = Boolean(setupStore || (env.SETUP_STATE_FILE && env.SETUP_MASTER_KEY && env.SETUP_ADMIN_AUTH_SHA256));
  const operations = setupEnabled ? (setupOperations ?? createSetupProviderOperations({ publicBaseUrl: config.publicBaseUrl, now })) : null;
  const setup = setupEnabled ? new AutomaticSetup({ env: runtimeEnv, config, operations, activate, canConfigure,
    authorizeTest, now, store: setupStore }) : null;
  let initializationError;
  const ready = setup?.initialize().catch((error) => { initializationError = error; }) ?? Promise.resolve();
  const send = (res, status, body, type = "application/json") => {
    res.writeHead(status, { "Content-Type": type + "; charset=utf-8", "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
    res.end(type === "application/json" ? JSON.stringify(body) : body);
  };
  const sessionResponse = async (request, data) => {
    if (setup?.working.size) fail("setup-busy", 409);
    onlyKeys(data, ["provider"]);
    let principal, previous;
    try { previous = auth.get(request.headers.authorization, request.headers.origin); } catch (error) {
      if (error.status !== 401) throw error;
      let setupAuthenticated = false;
      if (setup) {
        try { setup.authenticate(request.headers.authorization, request.headers.origin); setupAuthenticated = true; }
        catch (setupError) { if (setupError.status !== 401) throw setupError; }
      }
      if (setupAuthenticated) {
        principal = config.agents.find((agent) => agent.id === "aureform-owner");
        if (!principal) fail("provider-not-configured", 409);
      } else principal = auth.bootstrap(request.headers.authorization, request.headers.origin);
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
      await ready;
      if (initializationError) fail("setup-storage-unavailable", 503);
      if (typeof request.url !== "string" || !request.url.startsWith("/") || request.url.startsWith("//") ||
        request.url.includes("\\") || request.url.length > 2048) fail("invalid-request-url");
      const url = new URL(request.url, "http://reference.invalid");
      if (["token", "access_token", "sessionToken", "authorization", "tenantId", "agentId"].some((p) => url.searchParams.has(p)) ||
        (url.searchParams.has("connectionId") && url.pathname !== "/v1/communications/setup/status")) fail("client-scope-or-query-auth-denied", 403);
      const path = url.pathname;
      if (request.method === "GET" && path === "/health") return send(response, 200, {
        status: "reference-running", contractVersion: CONTRACT, memoryOnly: true,
        carrierOperationsEnabled: config.operationsEnabled, liveCallVerification: "not performed",
        automaticSetupEnabled: Boolean(setup),
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
      if (path.startsWith("/v1/communications/setup/")) {
        if (!setup) fail("setup-not-configured", 503);
        if (url.search && !(request.method === "GET" && path === "/v1/communications/setup/status" &&
          [...url.searchParams.keys()].every((key) => key === "connectionId") &&
          url.searchParams.getAll("connectionId").length === 1)) fail("query-not-allowed");
        let data;
        if (request.method === "POST") {
          if (request.headers["content-type"]?.split(";")[0] !== "application/json") fail("unsupported-content-type", 415);
          if (path !== "/v1/communications/setup/login") setup.authenticate(request.headers.authorization, request.headers.origin);
          data = JSON.parse(utf8(await readBody(request, 8192)));
          if (path === "/v1/communications/setup/login") return send(response, 200, setup.login(data, request.headers.origin));
          if (path === "/v1/communications/setup/inspect") return send(response, 200, await setup.inspect(data));
          if (path === "/v1/communications/setup/plan") return send(response, 200, await setup.plan(data));
          if (path === "/v1/communications/setup/apply") return send(response, 200, await setup.apply(data));
          if (path === "/v1/communications/setup/authorize-test") return send(response, 200, await setup.testPermission(data));
        }
        setup.authenticate(request.headers.authorization, request.headers.origin);
        if (request.method === "GET" && path === "/v1/communications/setup/status") return send(response, 200, await setup.status(url.searchParams.get("connectionId")));
        if (request.method === "GET" && path === "/v1/communications/setup/connections") return send(response, 200, await setup.connections());
        fail("not-found", 404);
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
        const form = verifyTwilioWebhook(raw, request.headers["x-twilio-signature"], config.publicBaseUrl + request.url, runtimeEnv.TWILIO_AUTH_TOKEN);
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
          request.headers["telnyx-timestamp"], runtimeEnv.TELNYX_PUBLIC_KEY, now());
        engine.telnyxEvent(JSON.parse(text));
        // Async effects are tracked in memory; this ACK is not durable delivery.
        return send(response, 200, { accepted: true });
      }
      fail("not-found", 404);
    } catch (error) {
      const known = error instanceof ReferenceError;
      const providerFailure = error instanceof ProviderFailure;
      const setupFailure = error instanceof SetupProviderError;
      const status = known ? error.status : setupFailure ? error.status : providerFailure ? 502 : error instanceof SyntaxError ? 400 : 500;
      const code = known || providerFailure ? error.code : setupFailure
        ? error.unknown || error.status === 409 ? "setup-reconciliation-required"
          : error.status === 401 ? "invalid-credentials"
            : error.status === 403 ? "permission-denied"
              : error.status === 404 || error.status === 422 ? "number-not-eligible" : "setup-failed"
        : error instanceof SyntaxError ? "invalid-json" : "reference-error";
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
  return { server, get engine() { return engine; }, get auth() { return auth; }, setup, ready,
    get initializationFailed() { return Boolean(initializationError); }, close };
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
