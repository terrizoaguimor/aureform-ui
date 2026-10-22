// SPDX-License-Identifier: Apache-2.0
// Independent HTTP acceptance of the actual setup/server/SDK code. All account
// responses and carrier transports are synthetic injected fixtures. This suite
// never calls a provider, provisions a real resource, or verifies real media.
import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import twilio from "twilio";
import { createBackend } from "../server.js";
import { validateConfig, fail } from "../lib/config.js";
import { createProviders, ProviderFailure } from "../lib/providers.js";
import { createSetupProviderOperations, SetupProviderError } from "../lib/setup-providers.js";
import { EncryptedSetupStore } from "../lib/setup-store.js";
import { parseForm, sha256 } from "../lib/security.js";

const ORIGIN = "http://127.0.0.1:3000";
const LOCALHOST_ORIGIN = "http://localhost:3000";
const OTHER_ALLOWED_ORIGIN = "https://second-ui.example.invalid";
const PUBLIC_URL = "https://setup-backend.example.invalid";
const NOW = Date.parse("2026-10-21T14:00:00Z");
const NUMBER = "+12025550123";
const CALLER = "+12025550124";
const OTHER_CALLER = "+12025550125";
const callSid = (value) => "CA" + value.toString(16).padStart(32, "0");
const privateFixture = () => randomBytes(32).toString("base64url");
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const decodeJWT = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
const safeJSON = (value) => JSON.stringify(value);

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "aureform-setup-http-"));
  await chmod(directory, 0o700);
  const file = join(directory, "state.encrypted.json");
  const credentials = {
    provider: "twilio",
    accountSid: "AC" + randomBytes(16).toString("hex"),
    authToken: randomBytes(16).toString("hex"),
  };
  const accessCode = privateFixture();
  const masterKey = randomBytes(32).toString("base64");
  const env = {
    SETUP_ADMIN_AUTH_SHA256: sha256(accessCode),
    SETUP_MASTER_KEY: masterKey,
    SETUP_STATE_FILE: file,
    ENABLE_CARRIER_OPERATIONS: "false",
    PUBLIC_BASE_URL: PUBLIC_URL,
  };
  const number = {
    sid: "PN" + randomBytes(16).toString("hex"),
    account_sid: credentials.accountSid,
    phone_number: NUMBER,
    friendly_name: "Synthetic owned laboratory number",
    capabilities: { voice: true, sms: true },
    voice_url: options.existingRouting ? "https://prior-route.example.invalid/inbound" : "",
    voice_method: "POST",
    voice_application_sid: "",
    trunk_sid: "",
    voice_fallback_url: "",
    voice_fallback_method: "POST",
    status_callback: "",
    status_callback_method: "POST",
    voice_receive_mode: "voice",
    voice_caller_id_lookup: false,
    sms_application_sid: "",
    sms_url: "https://messaging.example.invalid/untouched",
    sms_method: "POST",
    sms_fallback_url: "",
    sms_fallback_method: "POST",
  };
  const requests = [];
  const effects = [];
  const keys = new Map();
  const remote = new Map();
  const carrierCommands = [];
  let time = NOW;
  let operatorToken;
  let backend;
  let base;
  let accountResponseSid = credentials.accountSid;
  let accountStatus = "active";
  let keyGate;
  let failAfterKey;
  let failInspection;
  let providerResponseFailure;
  let providerTimeout;
  let regionResponse;
  let ownedNumberMissing;
  let failHangup;
  let numberReadOverride;
  const running = new Set();
  const stores = [];

  // This transport accepts only the actual configuration adapter's allowlisted
  // Twilio routes. An unknown method/host is a fixture failure, never a fetch.
  const providerHTTP = async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method ?? "GET";
    requests.push({ method, path: url.pathname, query: url.search });
    const regionRead = url.origin === "https://routes.twilio.com" && method === "GET" &&
      url.pathname === "/v2/PhoneNumbers/" + encodeURIComponent(NUMBER);
    assert.ok(url.origin === "https://api.twilio.com" || regionRead, "configuration transport must remain injected and strictly allowlisted");
    assert.equal(init.redirect, "error");
    assert.equal(init.headers.Authorization, "Basic " + Buffer.from(credentials.accountSid + ":" + credentials.authToken).toString("base64"));
    if (failInspection) throw new Error("Fixture raw error " + credentials.authToken + " " + accessCode);
    const prefix = "/2010-04-01/Accounts/" + credentials.accountSid;
    const json = (data, status = 200) => new Response(JSON.stringify(data), {
      status, headers: { "Content-Type": "application/json" },
    });
    if (providerResponseFailure) return json({
      code: "VENDOR_RAW_ERROR",
      message: "Vendor raw message " + credentials.authToken + " " + accessCode,
    }, providerResponseFailure);
    if (providerTimeout) throw new DOMException("Synthetic timeout " + credentials.authToken + " " + accessCode, "TimeoutError");
    if (regionRead && regionResponse) {
      if (typeof regionResponse.body === "string") return new Response(regionResponse.body, {
        status: regionResponse.status, headers: { "Content-Type": "text/html" },
      });
      return json(regionResponse.body, regionResponse.status);
    }
    if (regionRead) return json({
      account_sid: credentials.accountSid, phone_number: NUMBER, voice_region: "us1",
    });
    if (method === "GET" && url.pathname === prefix + ".json")
      return json({ sid: accountResponseSid, status: accountStatus, type: "Full", auth_token: credentials.authToken, friendly_name: "Synthetic account" });
    if (method === "GET" && url.pathname === prefix + "/IncomingPhoneNumbers.json")
      return json({ incoming_phone_numbers: [structuredClone(number)], next_page_uri: null });
    if (method === "GET" && url.pathname === prefix + "/IncomingPhoneNumbers/" + number.sid + ".json" && ownedNumberMissing)
      return json({ code: 20404, status: 404, message: "Synthetic missing owned number " + credentials.authToken }, 404);
    if (method === "GET" && url.pathname === prefix + "/IncomingPhoneNumbers/" + number.sid + ".json")
      return json(numberReadOverride ? numberReadOverride(structuredClone(number)) : structuredClone(number));
    if (method === "POST" && url.pathname === prefix + "/Keys.json") {
      effects.push("create-api-key");
      const form = new URLSearchParams(init.body);
      const key = {
        sid: "SK" + randomBytes(16).toString("hex"),
        secret: privateFixture(),
        friendly_name: form.get("FriendlyName"),
      };
      keys.set(key.sid, key);
      if (keyGate) {
        keyGate.entered.resolve();
        await keyGate.release.promise;
      }
      if (failAfterKey) throw new Error("Fixture response lost after key creation: " + key.secret);
      return json(key);
    }
    const keyPath = prefix + "/Keys/";
    if (method === "GET" && url.pathname.startsWith(keyPath) && url.pathname.endsWith(".json")) {
      const id = url.pathname.slice(keyPath.length, -5);
      const key = keys.get(id);
      assert.ok(key, "only a key created by this fake account can be read");
      return json({ sid: key.sid, friendly_name: key.friendly_name });
    }
    if (method === "POST" && url.pathname === prefix + "/IncomingPhoneNumbers/" + number.sid + ".json") {
      effects.push("update-number-routing");
      const form = new URLSearchParams(init.body);
      assert.deepEqual([...form.keys()].sort(), [
        "StatusCallback", "StatusCallbackMethod", "VoiceApplicationSid",
        "VoiceFallbackUrl", "VoiceMethod", "VoiceUrl",
      ]);
      number.voice_url = form.get("VoiceUrl");
      number.voice_method = form.get("VoiceMethod");
      number.voice_application_sid = form.get("VoiceApplicationSid");
      number.voice_fallback_url = form.get("VoiceFallbackUrl");
      number.status_callback = form.get("StatusCallback");
      number.status_callback_method = form.get("StatusCallbackMethod");
      return json(structuredClone(number));
    }
    throw new Error("Unexpected synthetic configuration route");
  };
  const setupOperations = createSetupProviderOperations({ fetch: providerHTTP, publicBaseUrl: PUBLIC_URL, now: () => time });
  const baseConfig = validateConfig({
    tenantId: "automatic-setup-http-laboratory",
    origins: [ORIGIN, LOCALHOST_ORIGIN, OTHER_ALLOWED_ORIGIN],
    schedule: { timezone: "America/Bogota", weekly: [
      { day: 1, start: "08:00", end: "18:00" },
      { day: 2, start: "08:00", end: "18:00" },
      { day: 3, start: "08:00", end: "18:00" },
      { day: 4, start: "08:00", end: "18:00" },
      { day: 5, start: "08:00", end: "18:00" },
    ], holidays: [] },
    providers: {}, agents: [], approvals: [],
  }, env);
  const fakeSDKClient = {
    calls(id) {
      return {
        async fetch() {
          carrierCommands.push({ operation: "inspect", id });
          const entry = remote.get(id);
          assert.ok(entry, "a synthetic transport must never inspect an unbound call");
          return { sid: id, ...entry };
        },
        async update(body) {
          carrierCommands.push({ operation: "hangup-request", id, status: body.status });
          if (failHangup) throw new Error("Fixture remote hangup uncertainty " + credentials.authToken);
          const entry = remote.get(id);
          assert.ok(entry);
          entry.status = body.status;
          return { sid: id, ...entry };
        },
      };
    },
  };
  const runtime = async () => {
    const state = await stores.at(-1).read();
    const profile = state.active.twilio;
    if (!profile) fail("provider-not-configured", 503);
    return createProviders(backend.engine.config, {
      TWILIO_ACCOUNT_SID: profile.accountSid,
      TWILIO_AUTH_TOKEN: profile.authToken,
      TWILIO_API_KEY_SID: profile.apiKeySid,
      TWILIO_API_KEY_SECRET: profile.apiKeySecret,
    }, {
      now: () => time,
      twilioClient: fakeSDKClient,
      fetch: async () => { assert.fail("No real or fallback carrier HTTP is permitted."); },
    }).twilio;
  };
  const carriers = {
    twilio: {
      // Actual Twilio JWT helper and actual termination/reconciliation logic;
      // only the underlying carrier I/O is synthetic.
      token: async (principal) => (await runtime()).token(principal),
      hangup: async (...args) => (await runtime()).hangup(...args),
      inspect: async (...args) => (await runtime()).inspect(...args),
    },
  };
  const start = async (overrides = {}) => {
    const store = new EncryptedSetupStore({ file, key: overrides.masterKey ?? masterKey });
    stores.push(store);
    backend = createBackend({
      config: structuredClone(baseConfig),
      env: { ...env, ...(overrides.env ?? {}) },
      providers: carriers, setupOperations, setupStore: store, now: () => time, timers: false,
    });
    running.add(backend);
    await backend.ready;
    await new Promise((resolve) => backend.server.listen(0, "127.0.0.1", resolve));
    base = "http://127.0.0.1:" + backend.server.address().port;
  };
  const stop = async () => {
    if (running.delete(backend)) await backend.close();
  };
  t.after(async () => {
    for (const value of running) await value.close();
    await rm(directory, { recursive: true, force: true });
  });
  await start();

  const request = async (path, { method = "GET", body, raw, token = operatorToken, origin = ORIGIN, headers = {} } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(origin === null ? {} : { Origin: origin }),
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(body !== undefined || raw !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(5000),
    });
    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { response, body: parsed, text };
  };
  const post = (path, body, overrides) => request("/v1/communications/setup/" + path, { method: "POST", body, ...overrides });
  const login = async (overrides) => {
    const value = await post("login", { accessCode }, { token: null, ...overrides });
    if (value.response.status === 200) operatorToken = value.body.sessionToken;
    return value;
  };
  const inspect = (input = credentials) => post("inspect", input);
  const plan = (inspection, overrides) => post("plan", { connectionId: inspection.connectionId, numberId: number.sid, ...overrides });
  const apply = (review, confirmation = { configure: true, replaceExistingRouting: false }) =>
    post("apply", { planId: review.planId, confirmation });
  const configure = async () => {
    assert.equal((await login()).response.status, 200);
    const inspection = await inspect();
    assert.equal(inspection.response.status, 200, "synthetic account inspection must succeed");
    const review = await plan(inspection.body);
    assert.equal(review.response.status, 200);
    const configured = await apply(review.body, { configure: true, replaceExistingRouting: options.existingRouting === true });
    assert.equal(configured.response.status, 200, "explicit synthetic setup must succeed");
    return { inspection: inspection.body, review: review.body, configured: configured.body };
  };
  const voiceSession = (token = operatorToken, body = { provider: "twilio" }) =>
    request("/v1/communications/session", { method: "POST", token, body });
  const snapshot = async (session) => {
    const controller = new AbortController();
    const response = await fetch(base + "/v1/communications/events", {
      headers: { Origin: ORIGIN, Authorization: "Bearer " + session.sessionToken },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
    });
    assert.equal(response.status, 200);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    try {
      while (!text.includes("\n\n")) {
        const value = await reader.read();
        assert.equal(value.done, false);
        text += decoder.decode(value.value, { stream: true });
      }
      return JSON.parse(text.match(/^data: (.+)$/m)[1]);
    } finally {
      await reader.cancel().catch(() => {});
      controller.abort();
    }
  };
  const command = async (session, type, payload = {}, callId, overrides = {}) => {
    const current = await snapshot(session);
    const body = {
      commandId: randomUUID(), expectedRevision: current.revision, type, payload,
      ...(callId ? { callId } : {}), ...overrides,
    };
    const result = await request("/v1/communications/commands", { method: "POST", token: session.sessionToken, body });
    return { ...result, request: body };
  };
  const available = async (session) => {
    assert.equal((await command(session, "connect")).response.status, 200);
    assert.equal((await command(session, "presence", { presence: "available" })).response.status, 200);
  };
  const authorize = (connectionId, overrides = {}) => post("authorize-test", {
    connectionId, callerNumber: CALLER, seconds: 90, confirmation: true, ...overrides,
  });
  const hook = async (path, form, headers = {}) => {
    const raw = new URLSearchParams(form).toString();
    return request(path, {
      method: "POST", raw, origin: null, token: null,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Twilio-Signature": twilio.getExpectedTwilioSignature(
          credentials.authToken, PUBLIC_URL + path, parseForm(Buffer.from(raw)),
        ),
        ...headers,
      },
    });
  };
  const form = (id = 1, overrides = {}) => ({
    AccountSid: credentials.accountSid, CallSid: callSid(id),
    From: CALLER, To: NUMBER, Direction: "inbound", CallStatus: "ringing",
    ...overrides,
  });
  const activeFlow = async () => {
    const setup = await configure();
    const session = await voiceSession();
    assert.equal(session.response.status, 200);
    await available(session.body);
    assert.equal((await authorize(setup.inspection.connectionId)).response.status, 200);
    const incoming = await hook("/webhooks/twilio/inbound", form());
    assert.equal(incoming.response.status, 200);
    const callbackURL = new URL(incoming.text.match(/statusCallback="([^"]+)"/)[1].replaceAll("&amp;", "&"));
    const callback = callbackURL.pathname + callbackURL.search;
    const id = new URLSearchParams(callbackURL.search).get("call");
    const identity = incoming.text.match(/<Identity>([^<]+)<\/Identity>/)[1];
    assert.equal(identity, decodeJWT(session.body.credentials.token).grants.identity);
    remote.set(callSid(1), { status: "in-progress", parentCallSid: null });
    remote.set(callSid(10), { status: "in-progress", parentCallSid: callSid(1) });
    assert.equal((await command(session.body, "accept", {}, id)).response.status, 200);
    assert.equal((await hook(callback, form(10, { ParentCallSid: callSid(1), CallStatus: "in-progress" }))).response.status, 200);
    return { ...setup, session: session.body, incoming, callback, id, identity };
  };

  return {
    directory, file, masterKey, env, credentials, accessCode, number,
    requests, effects, keys, remote, carrierCommands, setupOperations,
    request, post, login, inspect, plan, apply, configure, voiceSession,
    snapshot, command, available, authorize, hook, form, activeFlow,
    get backend() { return backend; },
    get operatorToken() { return operatorToken; },
    get store() { return stores.at(-1); },
    advance: (milliseconds) => { time += milliseconds; },
    restart: async (overrides) => { await stop(); await start(overrides); },
    setAccountResponseSid: (value) => { accountResponseSid = value; },
    setAccountStatus: (value) => { accountStatus = value; },
    setInspectionFailure: () => { failInspection = true; },
    setProviderResponseFailure: (status) => { providerResponseFailure = status; },
    setProviderTimeout: () => { providerTimeout = true; },
    setRegionResponse: (status, body) => { regionResponse = { status, body }; },
    setOwnedNumberMissing: () => { ownedNumberMissing = true; },
    setLostKeyResponse: () => { failAfterKey = true; },
    setHangupFailure: (value) => { failHangup = value; },
    setNumberReadOverride: (value) => { numberReadOverride = value; },
    gateKeyCreate: () => { keyGate = { entered: deferred(), release: deferred() }; return keyGate; },
  };
}

function noSecrets(text, f) {
  for (const value of [f.credentials.authToken, f.accessCode, f.masterKey, ...[...f.keys.values()].map((key) => key.secret)])
    assert.equal(text.includes(value), false, "HTTP must not expose a private fixture credential");
}

function jsonCors(reply, origin = ORIGIN) {
  assert.equal(reply.response.headers.get("access-control-allow-origin"), origin);
  assert.equal(reply.response.headers.get("vary"), "Origin");
  assert.match(reply.response.headers.get("content-type"), /^application\/json\b/);
  assert.equal(reply.response.headers.get("cache-control"), "no-store");
}

test("HTTP setup login is opaque, Origin-bound, no-store and expires at the exact ten-minute boundary", async (t) => {
  const f = await fixture(t);
  const login = await f.login();
  assert.equal(login.response.status, 200);
  assert.match(login.body.sessionToken, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(login.body.sessionToken, f.accessCode);
  assert.equal(Date.parse(login.body.expiresAt), NOW + 600000);
  assert.equal(login.response.headers.get("access-control-allow-origin"), ORIGIN);
  assert.equal(login.response.headers.get("cache-control"), "no-store");
  assert.equal(login.response.headers.get("referrer-policy"), "no-referrer");
  noSecrets(login.text, f);
  const crossOrigin = await f.post("inspect", f.credentials, { origin: OTHER_ALLOWED_ORIGIN });
  assert.equal(crossOrigin.response.status, 401, "an allowed Origin cannot reuse another Origin's session");
  const hostile = await f.post("inspect", f.credentials, { origin: "https://evil.example.invalid" });
  assert.equal(hostile.response.status, 403);
  assert.equal(hostile.response.headers.get("access-control-allow-origin"), null);
  f.advance(599999);
  assert.equal((await f.inspect()).response.status, 200);
  f.advance(1);
  assert.equal((await f.inspect()).response.status, 401);
  assert.deepEqual(f.effects, []);
});

test("CORS preflight is allowlisted; unauthenticated and oversized bodies never inspect or mutate a carrier", async (t) => {
  const f = await fixture(t);
  const preflight = await f.request("/v1/communications/setup/inspect", { method: "OPTIONS", token: null });
  assert.equal(preflight.response.status, 204);
  assert.equal(preflight.response.headers.get("access-control-allow-origin"), ORIGIN);
  assert.match(preflight.response.headers.get("access-control-allow-headers"), /Authorization/);
  const unauthenticated = await f.post("inspect", f.credentials, { token: null });
  assert.equal(unauthenticated.response.status, 401);
  const oversizeLogin = await f.request("/v1/communications/setup/login", {
    method: "POST", token: null, raw: JSON.stringify({ accessCode: "x".repeat(9000) }),
  });
  assert.equal(oversizeLogin.response.status, 413);
  const hostileOversize = await f.request("/v1/communications/setup/login", {
    method: "POST", token: null, origin: "https://evil.example.invalid", raw: "x".repeat(20000),
  });
  assert.equal(hostileOversize.response.status, 403);
  const noOrigin = await f.login({ origin: null });
  assert.equal(noOrigin.response.status, 403);
  const badJSON = await f.request("/v1/communications/setup/login", { method: "POST", token: null, raw: "{" });
  assert.equal(badJSON.response.status, 400);
  for (const response of [unauthenticated, oversizeLogin, hostileOversize, noOrigin, badJSON]) noSecrets(response.text, f);
  assert.deepEqual(f.requests, []);
  assert.deepEqual(f.effects, []);
});

test("query credentials and client scopes are denied while the exact authenticated status query remains usable", async (t) => {
  const f = await fixture(t);
  await f.login();
  const inspection = (await f.inspect()).body;
  const status = await f.request("/v1/communications/setup/status?connectionId=" + inspection.connectionId);
  assert.equal(status.response.status, 200, "setup status's reviewed connectionId is not a client voice-session scope override");
  assert.equal(status.body.connectionId, inspection.connectionId);
  for (const query of ["token", "access_token", "sessionToken", "authorization", "tenantId", "agentId"]) {
    const result = await f.request("/v1/communications/setup/status?connectionId=" + inspection.connectionId + "&" + query + "=" + f.operatorToken);
    assert.equal(result.response.status, 403);
    noSecrets(result.text, f);
  }
  for (const path of [
    "/v1/communications/session?connectionId=" + inspection.connectionId,
    "/v1/communications/setup/status?connectionId=" + inspection.connectionId + "&connectionId=" + inspection.connectionId,
    "/v1/communications/setup/status?connectionId=" + inspection.connectionId + "&provider=twilio",
  ]) {
    const result = await f.request(path);
    assert.ok([400, 403].includes(result.response.status));
  }
  assert.deepEqual(f.effects, []);
});

test("inspection and number planning are read-only and apply requires the exact reviewed explicit confirmation", async (t) => {
  const f = await fixture(t);
  await f.login();
  const inspection = await f.inspect();
  assert.equal(inspection.response.status, 200);
  assert.equal(inspection.body.phase, "select-number");
  const review = await f.plan(inspection.body);
  assert.equal(review.response.status, 200);
  assert.equal(review.body.number.id, f.number.sid);
  assert.equal(review.body.number.phoneNumber, NUMBER);
  assert.equal(review.body.phase, "review");
  assert.deepEqual(f.effects, []);
  assert.deepEqual(f.carrierCommands, []);
  for (const result of [inspection, review]) {
    noSecrets(result.text, f);
    assert.equal(result.text.includes("priorRouting"), false);
    assert.equal(result.text.includes("credentials"), false);
  }
  const notConfirmed = await f.apply(review.body, { configure: false, replaceExistingRouting: false });
  assert.equal(notConfirmed.response.status, 422);
  const extraField = await f.post("apply", { planId: review.body.planId, confirmation: { configure: true, replaceExistingRouting: false }, numberId: "other" });
  assert.equal(extraField.response.status, 400);
  assert.deepEqual(f.effects, []);
});

test("same operator bearer configures generated keys, mints an actual incoming-only Twilio JWT, and still authorizes no calls", async (t) => {
  const f = await fixture(t);
  const setup = await f.configure();
  assert.deepEqual(f.effects, ["create-api-key", "update-number-routing"]);
  assert.equal(f.number.voice_url, PUBLIC_URL + "/webhooks/twilio/inbound");
  assert.equal(f.number.status_callback, PUBLIC_URL + "/webhooks/twilio/status");
  assert.equal(f.number.sms_url, "https://messaging.example.invalid/untouched");
  const reply = await f.voiceSession();
  assert.equal(reply.response.status, 200);
  assert.equal(reply.body.envelope.snapshot.mode, "live");
  assert.equal(reply.body.envelope.snapshot.connection, "disconnected");
  assert.equal(reply.body.envelope.snapshot.activeCall, null);
  assert.equal(reply.body.agentId, "aureform-owner");
  assert.equal(reply.body.tenantId, "automatic-setup-http-laboratory");
  assert.equal(reply.body.credentials.kind, "twilio-access-token");
  const token = reply.body.credentials.token;
  const [header, payload, signature] = token.split(".");
  const claims = decodeJWT(token);
  const key = [...f.keys.values()][0];
  assert.equal(claims.iss, key.sid);
  assert.equal(claims.sub, f.credentials.accountSid);
  assert.equal(claims.grants.voice.incoming.allow, true);
  assert.equal(claims.grants.voice.outgoing, undefined);
  assert.equal(claims.exp - claims.iat, 300);
  assert.equal(Date.parse(reply.body.credentials.expiresAt), claims.exp * 1000);
  assert.equal(signature, createHmac("sha256", key.secret).update(header + "." + payload).digest("base64url"));
  assert.match(claims.grants.identity, /^[A-Za-z0-9_]+$/);
  noSecrets(reply.text, f);
  noSecrets(safeJSON(setup.configured), f);
  const health = await f.request("/health");
  assert.equal(health.body.carrierOperationsEnabled, false);
  const unsigned = await f.hook("/webhooks/twilio/inbound", f.form(), { "X-Twilio-Signature": "invalid" });
  assert.equal(unsigned.response.status, 403);
  const unapproved = await f.hook("/webhooks/twilio/inbound", f.form());
  assert.equal(unapproved.response.status, 200);
  assert.match(unapproved.text, /<Reject/);
  assert.deepEqual(f.carrierCommands, []);
  assert.equal((await f.snapshot(reply.body)).snapshot.activeCall, null);
});

test("one bounded caller authorization rejects another caller and replay cannot authorize a second call", async (t) => {
  const f = await fixture(t);
  const setup = await f.configure();
  const session = (await f.voiceSession()).body;
  const notReady = await f.authorize(setup.inspection.connectionId);
  assert.equal(notReady.response.status, 409);
  await f.available(session);
  for (const changes of [{ confirmation: false }, { seconds: 121 }, { seconds: 29 }, { callerNumber: "911" }])
    assert.equal((await f.authorize(setup.inspection.connectionId, changes)).response.status, 422);
  const allowed = await f.authorize(setup.inspection.connectionId);
  assert.equal(allowed.response.status, 200);
  assert.equal(allowed.body.maxCalls, 1);
  assert.equal(allowed.body.maxSeconds, 90);
  assert.equal(allowed.body.callerNumber, CALLER);
  assert.equal(allowed.body.observedCall, false);
  const repeated = await f.authorize(setup.inspection.connectionId);
  assert.equal(repeated.response.status, 409);
  const wrongCaller = await f.hook("/webhooks/twilio/inbound", f.form(2, { From: OTHER_CALLER }));
  assert.match(wrongCaller.text, /<Reject/);
  const proper = await f.hook("/webhooks/twilio/inbound", f.form(1));
  assert.equal(proper.response.status, 200);
  assert.match(proper.text, /<Dial[^>]*timeLimit="90"/);
  assert.match(proper.text, /<Client/);
  const second = await f.hook("/webhooks/twilio/inbound", f.form(3));
  assert.match(second.text, /<Reject/);
  assert.equal((await f.snapshot(session)).snapshot.activeCall.providerCallId, callSid(1));
  assert.deepEqual(f.carrierCommands, []);
});

test("HTTP configured parent/child callbacks enforce account, parent, reservation and raw browser-leg identity", async (t) => {
  const f = await fixture(t);
  const flow = await f.activeFlow();
  const current = await f.snapshot(flow.session);
  assert.equal(current.snapshot.activeCall.status, "active");
  assert.equal(current.snapshot.activeCall.id, flow.id);
  assert.equal(current.bindings[0].pstnCallId, callSid(1));
  assert.equal(current.bindings[0].browserCallId, callSid(10));
  assert.equal(current.bindings[0].bridgeObserved, true);
  for (const [path, form] of [
    [flow.callback, f.form(11, { ParentCallSid: callSid(99), CallStatus: "in-progress" })],
    [flow.callback.replace(/reservation=[^&]+/, "reservation=" + randomUUID()), f.form(10, { ParentCallSid: callSid(1), CallStatus: "in-progress" })],
    [flow.callback, f.form(11, { ParentCallSid: callSid(1), CallStatus: "in-progress" })],
    [flow.callback, f.form(10, { AccountSid: "AC" + "f".repeat(32), ParentCallSid: callSid(1), CallStatus: "in-progress" })],
  ]) {
    const reply = await f.hook(path, form);
    assert.ok([403, 409].includes(reply.response.status));
    noSecrets(reply.text, f);
  }
  const after = await f.snapshot(flow.session);
  assert.equal(after.bindings[0].browserCallId, callSid(10));
  assert.equal(after.snapshot.activeCall.status, "active");
  const duplicate = await f.hook("/webhooks/twilio/inbound", f.form());
  assert.equal(duplicate.text, flow.incoming.text);
  assert.equal(f.effects.filter((value) => value === "create-api-key").length, 1);
});

test("hangup HTTP success retains the reservation until both correlated legs have terminal observations", async (t) => {
  const f = await fixture(t);
  const flow = await f.activeFlow();
  const ended = await f.command(flow.session, "hangup", {}, flow.id);
  assert.equal(ended.response.status, 200);
  assert.equal(ended.body.snapshot.activeCall.id, flow.id);
  assert.equal(ended.body.snapshot.history.length, 0);
  assert.equal(ended.body.bindings[0].phase, "ending");
  assert.deepEqual(f.carrierCommands.filter((operation) => operation.operation === "hangup-request").map((operation) => operation.id).sort(), [callSid(1), callSid(10)]);
  const replay = await f.request("/v1/communications/commands", {
    method: "POST", token: flow.session.sessionToken, body: ended.request,
  });
  assert.equal(replay.response.status, 200);
  assert.equal(replay.body.result.outcome, "duplicate");
  assert.equal(f.carrierCommands.filter((operation) => operation.operation === "hangup-request").length, 2);
  await f.hook("/webhooks/twilio/status", f.form(1, { CallStatus: "completed" }));
  const remaining = await f.snapshot(flow.session);
  assert.equal(remaining.snapshot.activeCall.id, flow.id);
  assert.equal(remaining.bindings[0].phase, "reconciliation-required");
  assert.equal(remaining.snapshot.history.length, 0);
  await f.hook(flow.callback, f.form(10, { ParentCallSid: callSid(1), CallStatus: "completed" }));
  const observed = await f.snapshot(flow.session);
  assert.equal(observed.snapshot.activeCall, null);
  assert.equal(observed.bindings.length, 0);
  assert.equal(observed.snapshot.history.length, 1);
  assert.equal(observed.snapshot.history[0].status, "completed");
  const late = await f.hook(flow.callback, f.form(10, { ParentCallSid: callSid(1), CallStatus: "in-progress", SequenceNumber: "999" }));
  assert.equal(late.response.status, 200);
  assert.equal((await f.snapshot(flow.session)).snapshot.activeCall, null);
});

test("uncertain injected termination is secret-safe, keeps the call, and requires explicit remote reconciliation", async (t) => {
  const f = await fixture(t);
  const flow = await f.activeFlow();
  f.setHangupFailure(true);
  const reply = await f.command(flow.session, "hangup", {}, flow.id);
  assert.equal(reply.response.status, 202);
  assert.equal(reply.body.result.outcome, "unknown");
  assert.equal(reply.body.snapshot.activeCall.id, flow.id);
  assert.equal(reply.body.snapshot.history.length, 0);
  noSecrets(reply.text, f);
  const newPermission = await f.authorize(flow.inspection.connectionId);
  assert.equal(newPermission.response.status, 409);
  f.setHangupFailure(false);
  f.remote.get(callSid(1)).status = "completed";
  f.remote.get(callSid(10)).status = "completed";
  const reconciled = await f.command(flow.session, "reconcile", {}, flow.id);
  assert.equal(reconciled.response.status, 200);
  assert.equal(reconciled.body.snapshot.activeCall, null);
  assert.equal(reconciled.body.snapshot.history[0].status, "completed");
  assert.equal(reconciled.body.bindings.length, 0);
});

test("encrypted setup survives restart with the same key/profile; operator sessions and call permissions do not", async (t) => {
  const f = await fixture(t);
  const setup = await f.configure();
  const beforeRestart = await f.voiceSession();
  await f.available(beforeRestart.body);
  await f.authorize(setup.inspection.connectionId);
  const token = f.operatorToken;
  const opaqueState = await readFile(f.file, "utf8");
  noSecrets(opaqueState, f);
  assert.equal(opaqueState.includes(f.credentials.accountSid), false);
  assert.equal(opaqueState.includes("apiKeySecret"), false);
  assert.equal(JSON.parse(opaqueState).algorithm, "aes-256-gcm");
  assert.equal((await stat(f.directory)).mode & 0o777, 0o700);
  assert.equal((await stat(f.file)).mode & 0o777, 0o600);
  const key = [...f.keys.values()][0];
  const requestCount = f.requests.length;
  const effects = f.effects.slice();
  await f.restart();
  const oldSession = await f.voiceSession(token);
  assert.equal(oldSession.response.status, 401);
  assert.equal((await f.request("/health")).body.carrierOperationsEnabled, false);
  assert.equal((await f.login()).response.status, 200);
  const status = await f.request("/v1/communications/setup/status?connectionId=" + setup.inspection.connectionId);
  assert.equal(status.response.status, 200);
  assert.equal(status.body.phase, "configured");
  const restored = await f.voiceSession();
  assert.equal(restored.response.status, 200);
  const claims = decodeJWT(restored.body.credentials.token);
  assert.equal(claims.iss, key.sid);
  assert.equal(claims.sub, f.credentials.accountSid);
  assert.equal(claims.grants.identity, decodeJWT(beforeRestart.body.credentials.token).grants.identity);
  assert.equal(restored.body.envelope.snapshot.connection, "disconnected");
  assert.equal(restored.body.envelope.snapshot.activeCall, null);
  assert.equal(restored.body.envelope.snapshot.history.length, 0);
  assert.deepEqual(f.effects, effects);
  assert.equal(f.requests.length, requestCount, "bootstrap reload must not repeat provider configuration");
});

test("an unreadable encrypted setup fails closed over HTTP without exposing keys or erasing its file", async (t) => {
  const f = await fixture(t);
  await f.configure();
  const before = await readFile(f.file);
  await f.restart({ masterKey: randomBytes(32).toString("base64") });
  const health = await f.request("/health");
  assert.equal(health.response.status, 503);
  assert.equal(health.body.error.code, "setup-storage-unavailable");
  noSecrets(health.text, f);
  assert.deepEqual(await readFile(f.file), before);
  assert.deepEqual(f.effects, ["create-api-key", "update-number-routing"]);
});

test("double apply returns configured state without creating keys again or silently authorizing a test", async (t) => {
  const f = await fixture(t);
  const setup = await f.configure();
  const again = await f.apply(setup.review);
  assert.equal(again.response.status, 200);
  assert.deepEqual(again.body, setup.configured);
  assert.deepEqual(f.effects, ["create-api-key", "update-number-routing"]);
  assert.equal(f.keys.size, 1);
  assert.equal((await f.request("/health")).body.carrierOperationsEnabled, false);
  const session = (await f.voiceSession()).body;
  await f.available(session);
  await f.apply(setup.review);
  const denied = await f.hook("/webhooks/twilio/inbound", f.form());
  assert.match(denied.text, /<Reject/);
  assert.deepEqual(f.carrierCommands, []);
});

test("provider account mismatch and routing drift fail before any configuration write or runtime activation", async (t) => {
  const foreign = await fixture(t);
  await foreign.login();
  foreign.setAccountResponseSid("AC" + "e".repeat(32));
  const deniedAccount = await foreign.inspect();
  assert.ok(deniedAccount.response.status >= 400);
  noSecrets(deniedAccount.text, foreign);
  assert.deepEqual(foreign.effects, []);
  assert.equal((await foreign.voiceSession()).response.status, 409);
  const drift = await fixture(t);
  await drift.login();
  const inspection = (await drift.inspect()).body;
  const review = (await drift.plan(inspection)).body;
  drift.number.voice_url = "https://new-route.example.invalid/changed-after-review";
  const rejected = await drift.apply(review);
  assert.ok(rejected.response.status >= 400);
  noSecrets(rejected.text, drift);
  assert.deepEqual(drift.effects, []);
  assert.equal((await drift.voiceSession()).response.status, 409);
  const replay = await drift.apply(review);
  assert.equal(replay.response.status, 409);
  assert.equal(replay.body.error.code, "setup-reconciliation-required");
});

test("routing replacement, stale plan identity and client-injected plan resources cannot bypass a review", async (t) => {
  const f = await fixture(t, { existingRouting: true });
  await f.login();
  const inspection = (await f.inspect()).body;
  const review = (await f.plan(inspection)).body;
  assert.equal(review.willReplaceRouting, true);
  const replacementDenied = await f.apply(review);
  assert.equal(replacementDenied.response.status, 422);
  const forgedConnection = await f.plan({ connectionId: randomUUID() });
  assert.equal(forgedConnection.response.status, 404);
  const unownedNumber = await f.plan(inspection, { numberId: "PN" + "f".repeat(32) });
  assert.equal(unownedNumber.response.status, 422);
  const forgedPlan = await f.apply({ planId: randomUUID() });
  assert.equal(forgedPlan.response.status, 404);
  const injection = await f.post("apply", {
    planId: review.planId, confirmation: { configure: true, replaceExistingRouting: true },
    credentials: f.credentials, number: { phoneNumber: OTHER_CALLER },
  });
  assert.equal(injection.response.status, 400);
  assert.deepEqual(f.effects, []);
});

test("a concurrently pending apply blocks another reviewed replacement and persists intent before key creation", async (t) => {
  const f = await fixture(t);
  await f.login();
  const inspection = (await f.inspect()).body;
  const first = (await f.plan(inspection)).body;
  const second = (await f.plan(inspection)).body;
  const gate = f.gateKeyCreate();
  const applying = f.apply(first);
  await Promise.race([
    gate.entered.promise,
    applying.then(() => assert.fail("apply finished before reaching synthetic key creation")),
  ]);
  try {
    const state = await f.store.read();
    const journal = state.journals[first.planId];
    assert.equal(journal.phase, "configuring");
    assert.equal(journal.checkpoints[0].stage, "before-effect");
    assert.equal(journal.checkpoints[0].data.privateState.pending.operation, "create-standard-key");
    const replaced = await f.apply(second);
    assert.equal(replaced.response.status, 409);
    assert.equal(replaced.body.error.code, "setup-busy");
    assert.deepEqual(f.effects, ["create-api-key"]);
    const session = await f.voiceSession();
    assert.equal(session.response.status, 409);
  } finally { gate.release.resolve(); }
  assert.equal((await applying).response.status, 200);
  assert.equal(f.keys.size, 1);
});

test("a connected browser or active call blocks new setup before provider changes and preserves the session", async (t) => {
  const f = await fixture(t);
  const flow = await f.activeFlow();
  const secondInspection = (await f.inspect()).body;
  const secondReview = (await f.plan(secondInspection)).body;
  const changes = f.effects.slice();
  const replacing = await f.apply(secondReview, { configure: true, replaceExistingRouting: true });
  assert.equal(replacing.response.status, 409);
  assert.equal(replacing.body.error.code, "setup-busy");
  assert.deepEqual(f.effects, changes);
  const snapshot = await f.snapshot(flow.session);
  assert.equal(snapshot.snapshot.activeCall.id, flow.id);
  assert.equal(snapshot.snapshot.activeCall.status, "active");
  assert.equal(snapshot.scope.sessionId, flow.session.sessionId);
});

test("lost post-create response stays unknown across restart and cannot create a second key on retry", async (t) => {
  const f = await fixture(t);
  await f.login();
  const inspection = (await f.inspect()).body;
  const review = (await f.plan(inspection)).body;
  f.setLostKeyResponse();
  const lost = await f.apply(review);
  assert.ok(lost.response.status >= 400);
  noSecrets(lost.text, f);
  assert.equal(f.keys.size, 1);
  assert.deepEqual(f.effects, ["create-api-key"]);
  const unknown = await f.request("/v1/communications/setup/status?connectionId=" + inspection.connectionId);
  assert.equal(unknown.body.phase, "unknown");
  assert.equal(unknown.body.error.code, "setup-reconciliation-required");
  noSecrets(unknown.text, f);
  await f.restart();
  await f.login();
  const retry = await f.apply(review);
  assert.equal(retry.response.status, 409);
  assert.equal(retry.body.error.code, "setup-reconciliation-required");
  assert.equal(f.keys.size, 1);
  assert.deepEqual(f.effects, ["create-api-key"]);
  assert.equal((await f.voiceSession()).response.status, 409);
});

for (const [mismatch, change] of [
  ["account", (profile) => ({ ...profile, accountSid: "AC" + "f".repeat(32) })],
  ["phone number", (profile) => ({ ...profile, number: { ...profile.number, phoneNumber: OTHER_CALLER } })],
  ["number identity", (profile) => ({ ...profile, number: { ...profile.number, id: "PN" + "f".repeat(32) } })],
  ["provider", (profile) => ({ ...profile, provider: "telnyx" })],
  ["voice capability", (profile) => ({ ...profile, number: { ...profile.number, voiceEnabled: false } })],
  ["private auth token", (profile) => ({
    ...profile,
    authToken: (profile.authToken[0] === "0" ? "1" : "0") + profile.authToken.slice(1),
  })],
  ["missing private auth token", (profile) => ({ ...profile, authToken: undefined })],
]) {
  test(`orchestration rejects an unbound ${mismatch} before private runtime activation`, async (t) => {
    const f = await fixture(t);
    await f.login();
    const inspection = (await f.inspect()).body;
    const review = (await f.plan(inspection)).body;
    const originalApply = f.setupOperations.twilio.apply;
    f.setupOperations.twilio.apply = async (input) => change(await originalApply(input));
    const reply = await f.apply(review);
    assert.equal(reply.response.status, 502, "unbound results must not activate or replace the reviewed runtime");
    assert.equal(reply.body.error.code, "invalid-provider-response");
    noSecrets(reply.text, f);
    assert.equal((await f.voiceSession()).response.status, 409);
    const state = await f.store.read();
    assert.equal(state.active.twilio, undefined);
    assert.equal(state.journals[review.planId].phase, "unknown");
    assert.deepEqual((await f.request("/v1/communications/setup/connections")).body, []);
    assert.equal((await f.request("/health")).body.carrierOperationsEnabled, false);
  });
}

test("raw provider errors are secret-safe HTTP failures without effects or a configured connection", async (t) => {
  const f = await fixture(t);
  await f.login();
  f.setInspectionFailure();
  const failed = await f.inspect();
  assert.ok(failed.response.status >= 400);
  noSecrets(failed.text, f);
  assert.equal(failed.text.includes("Fixture raw error"), false);
  assert.deepEqual(f.effects, []);
  assert.deepEqual((await f.request("/v1/communications/setup/connections")).body, []);
  assert.equal((await f.voiceSession()).response.status, 409);
});

test("an expired reviewed plan cannot be applied with a fresh operator session at the ten-minute boundary", async (t) => {
  const f = await fixture(t);
  await f.login();
  const inspection = (await f.inspect()).body;
  const review = (await f.plan(inspection)).body;
  const requestsBeforeExpiry = f.requests.length;
  f.advance(600000);
  assert.equal((await f.login()).response.status, 200);
  const expired = await f.apply(review);
  assert.equal(expired.response.status, 409);
  assert.equal(expired.body.error.code, "setup-plan-expired");
  noSecrets(expired.text, f);
  assert.equal(f.requests.length, requestsBeforeExpiry, "expired approval must fail before provider I/O");
  assert.deepEqual(f.effects, []);
  const state = await f.store.read();
  assert.equal(state.journals[review.planId], undefined);
  assert.equal(state.active.twilio, undefined);
});

test("authenticated configured connections recover after encrypted restart without keys, media claims or duplicate setup", async (t) => {
  const f = await fixture(t);
  const path = "/v1/communications/setup/connections";
  const unauthenticated = await f.request(path, { token: null });
  assert.equal(unauthenticated.response.status, 401);
  const setup = await f.configure();
  const connections = await f.request(path);
  assert.equal(connections.response.status, 200);
  assert.equal(connections.response.headers.get("cache-control"), "no-store");
  assert.equal(connections.response.headers.get("access-control-allow-origin"), ORIGIN);
  assert.ok(Array.isArray(connections.body));
  assert.equal(connections.body.length, 1);
  assert.ok(connections.body.length <= 2);
  const [connection] = connections.body;
  assert.deepEqual(Object.keys(connection).sort(), [
    "checks", "connectionId", "contractVersion", "number", "phase", "provider",
  ]);
  assert.equal(connection.contractVersion, "aureform.setup.v1");
  assert.equal(connection.connectionId, setup.inspection.connectionId);
  assert.equal(connection.provider, "twilio");
  assert.equal(connection.phase, "configured");
  assert.equal(connection.number.id, f.number.sid);
  assert.equal(connection.number.phoneNumber, NUMBER);
  assert.equal(connection.number.voiceEnabled, true);
  assert.deepEqual(Object.keys(connection.number).sort(), [
    "hasExistingRouting", "id", "label", "phoneNumber", "voiceEnabled",
  ]);
  assert.deepEqual(connection.checks, {
    credentials: "passed", webhooks: "passed", browser: "pending", testCall: "pending",
  });
  noSecrets(connections.text, f);
  for (const key of f.keys.keys()) assert.equal(connections.text.includes(key), false);
  for (const query of [
    "?connectionId=" + connection.connectionId,
    "?provider=twilio",
    "?unknown=1",
    "?token=" + f.operatorToken,
  ]) {
    const result = await f.request(path + query);
    assert.ok([400, 403].includes(result.response.status), "connection recovery does not accept query parameters");
    noSecrets(result.text, f);
  }
  assert.equal((await f.request(path, { token: null })).response.status, 401);
  assert.equal((await f.request(path, { origin: OTHER_ALLOWED_ORIGIN })).response.status, 401);
  assert.equal((await f.request(path, { origin: "https://evil.example.invalid" })).response.status, 403);
  const operatorBeforeRestart = f.operatorToken;
  await f.restart();
  assert.equal(f.backend.initializationFailed, false);
  assert.equal((await f.request(path, { token: operatorBeforeRestart })).response.status, 401);
  assert.equal((await f.login()).response.status, 200);
  const recovered = await f.request(path);
  assert.equal(recovered.response.status, 200);
  assert.deepEqual(recovered.body, connections.body);
  noSecrets(recovered.text, f);
  const session = await f.voiceSession();
  assert.equal(session.response.status, 200);
  assert.equal(session.body.envelope.snapshot.connection, "disconnected");
  assert.equal(session.body.envelope.snapshot.activeCall, null);
  assert.equal(decodeJWT(session.body.credentials.token).iss, [...f.keys.keys()][0]);
  await f.available(session.body);
  assert.equal((await f.snapshot(session.body)).snapshot.connection, "ready");
  assert.equal((await f.request("/health")).body.carrierOperationsEnabled, false);
  const unapproved = await f.hook("/webhooks/twilio/inbound", f.form());
  assert.match(unapproved.text, /<Reject/);
  assert.deepEqual(f.carrierCommands, []);
  assert.deepEqual(f.effects, ["create-api-key", "update-number-routing"]);
  assert.equal(f.keys.size, 1);
});

test("SetupProviderError from a real injected 401 transport response becomes secret-safe invalid-credentials", async (t) => {
  const f = await fixture(t);
  await f.login();
  f.setProviderResponseFailure(401);
  const reply = await f.inspect();
  assert.equal(reply.response.status, 401);
  jsonCors(reply);
  noSecrets(reply.text, f);
  assert.deepEqual(reply.body, { error: { code: "invalid-credentials", message: "invalid-credentials" } });
  assert.equal(reply.text.includes("VENDOR_RAW_ERROR"), false);
  assert.equal(reply.text.includes("Vendor raw message"), false);
  assert.deepEqual(f.effects, []);
});

test("SetupProviderError from a real injected 403 transport response becomes secret-safe permission-denied", async (t) => {
  const f = await fixture(t);
  await f.login();
  f.setProviderResponseFailure(403);
  const reply = await f.inspect();
  assert.equal(reply.response.status, 403);
  jsonCors(reply);
  noSecrets(reply.text, f);
  assert.deepEqual(reply.body, { error: { code: "permission-denied", message: "permission-denied" } });
  assert.equal(reply.text.includes("VENDOR_RAW_ERROR"), false);
  assert.equal(reply.text.includes("Vendor raw message"), false);
  assert.deepEqual(f.effects, []);
});

test("SetupProviderError conflict, unknown effects and remaining failures use only fixed public classifications", async (t) => {
  for (const [scenario, expectedStatus, code] of [
    ["routing drift", 409, "setup-reconciliation-required"],
    ["unknown key creation", 503, "setup-reconciliation-required"],
    ["unavailable transport", 503, "setup-failed"],
    ["ineligible account", 422, "number-not-eligible"],
    ["private not-found code", 404, "number-not-eligible"],
    ["private other code", 400, "setup-failed"],
  ]) {
    const f = await fixture(t);
    await f.login();
    let reply;
    if (scenario === "routing drift" || scenario === "unknown key creation") {
      const inspection = (await f.inspect()).body;
      const review = (await f.plan(inspection)).body;
      if (scenario === "routing drift") {
        f.setNumberReadOverride((number) => ({ ...number, voice_url: "https://unexpected.example.invalid/inbound" }));
      } else {
        f.setLostKeyResponse();
      }
      reply = await f.apply(review);
      const state = await f.store.read();
      assert.equal(state.journals[review.planId].phase, "unknown");
      assert.equal(state.active.twilio, undefined);
    } else {
      if (scenario === "unavailable transport") f.setProviderResponseFailure(500);
      else if (scenario === "ineligible account") f.setAccountStatus("suspended");
      else f.setupOperations.twilio.inspect = async () => {
        throw new SetupProviderError(
          "VENDOR_RAW_ERROR " + f.credentials.authToken + " " + f.accessCode,
          "twilio", expectedStatus,
        );
      };
      reply = await f.inspect();
    }
    assert.equal(reply.response.status, expectedStatus, scenario);
    jsonCors(reply);
    noSecrets(reply.text, f);
    assert.deepEqual(reply.body, { error: { code, message: code } }, scenario);
    assert.equal(reply.text.includes("VENDOR_RAW_ERROR"), false);
    assert.equal(reply.text.includes("Vendor raw message"), false);
    assert.deepEqual((await f.request("/v1/communications/setup/connections")).body, []);
    assert.equal((await f.request("/health")).body.carrierOperationsEnabled, false);
  }
});

test("plan dependency failures return readable HTTP 503 JSON with the exact allowed Origin and no provider effects", async (t) => {
  for (const [origin, upstream] of [
    [ORIGIN, 503], [LOCALHOST_ORIGIN, 503], [LOCALHOST_ORIGIN, 502],
    [LOCALHOST_ORIGIN, 500], [LOCALHOST_ORIGIN, 429],
  ]) {
    const f = await fixture(t);
    await f.login({ origin });
    const inspected = await f.post("inspect", f.credentials, { origin });
    assert.equal(inspected.response.status, 200);
    f.setProviderResponseFailure(upstream);
    const reply = await f.post("plan", { connectionId: inspected.body.connectionId, numberId: f.number.sid }, { origin });
    assert.equal(reply.response.status, 503);
    jsonCors(reply, origin);
    noSecrets(reply.text, f);
    assert.deepEqual(reply.body, { error: { code: "setup-failed", message: "setup-failed" } });
    assert.equal(reply.text.includes("VENDOR_RAW_ERROR"), false);
    assert.equal(reply.text.includes("Vendor raw message"), false);
    assert.ok(f.requests.every((entry) => entry.method === "GET"), "planning stays read-only");
    assert.deepEqual(f.effects, []);
    assert.deepEqual(f.carrierCommands, []);
    assert.equal(f.keys.size, 0);
  }
});

test("plan transport exceptions and timeout classification preserve safe JSON and CORS without retries", async (t) => {
  for (const timeout of [false, true]) {
    const f = await fixture(t);
    await f.login();
    const inspection = (await f.inspect()).body;
    const before = f.requests.length;
    if (timeout) f.setProviderTimeout();
    else f.setInspectionFailure();
    const reply = await f.plan(inspection);
    assert.equal(reply.response.status, 503);
    jsonCors(reply);
    noSecrets(reply.text, f);
    assert.deepEqual(reply.body, { error: { code: "setup-failed", message: "setup-failed" } });
    assert.equal(reply.text.includes("Synthetic timeout"), false);
    assert.equal(reply.text.includes("Fixture raw error"), false);
    assert.equal(f.requests.length, before + 1, "read failure must not be blindly retried");
    assert.deepEqual(f.effects, []);
    assert.deepEqual(f.carrierCommands, []);
  }
});

test("malformed and unauthenticated plan errors retain allowed CORS while forbidden Origins are never reflected", async (t) => {
  const f = await fixture(t);
  const path = "/v1/communications/setup/plan";
  const unauthorized = await f.request(path, {
    method: "POST", origin: LOCALHOST_ORIGIN, token: null, raw: "{",
  });
  assert.equal(unauthorized.response.status, 401);
  jsonCors(unauthorized, LOCALHOST_ORIGIN);
  noSecrets(unauthorized.text, f);
  assert.deepEqual(unauthorized.body, { error: { code: "unauthorized", message: "unauthorized" } });
  await f.login({ origin: LOCALHOST_ORIGIN });
  const malformed = await f.request(path, { method: "POST", origin: LOCALHOST_ORIGIN, raw: "{" });
  assert.equal(malformed.response.status, 400);
  jsonCors(malformed, LOCALHOST_ORIGIN);
  noSecrets(malformed.text, f);
  assert.deepEqual(malformed.body, { error: { code: "invalid-json", message: "invalid-json" } });
  for (const origin of [
    "https://evil.example.invalid", "http://localhost:3000.evil.invalid",
    "http://localhost:3001", "null", null,
  ]) {
    const forbidden = await f.request(path, { method: "POST", origin, raw: "{" });
    assert.equal(forbidden.response.status, 403);
    assert.equal(forbidden.response.headers.get("access-control-allow-origin"), null);
    assert.match(forbidden.response.headers.get("content-type"), /^application\/json\b/);
    noSecrets(forbidden.text, f);
    assert.deepEqual(forbidden.body, { error: { code: "origin-denied", message: "origin-denied" } });
  }
  assert.deepEqual(f.requests, []);
  assert.deepEqual(f.effects, []);
  assert.deepEqual(f.carrierCommands, []);
});

test("dependency remapping leaves legacy ProviderFailure and explicit ReferenceError HTTP 502 unchanged", async (t) => {
  for (const legacy of [false, true]) {
    const f = await fixture(t);
    await f.login();
    const inspection = (await f.inspect()).body;
    f.setupOperations.twilio.plan = async () => {
      if (legacy) throw new ProviderFailure("synthetic-legacy-provider-failure", false);
      fail("invalid-provider-response", 502);
    };
    const reply = await f.plan(inspection);
    assert.equal(reply.response.status, 502);
    jsonCors(reply);
    noSecrets(reply.text, f);
    const code = legacy ? "synthetic-legacy-provider-failure" : "invalid-provider-response";
    assert.deepEqual(reply.body, { error: { code, message: code } });
    assert.deepEqual(f.effects, []);
    assert.deepEqual(f.carrierCommands, []);
  }
});

test("exact scoped region 404 allows a read-only implicit US1 plan while explicit approval still gates all writes", async (t) => {
  const f = await fixture(t);
  await f.login({ origin: LOCALHOST_ORIGIN });
  const inspected = await f.post("inspect", f.credentials, { origin: LOCALHOST_ORIGIN });
  assert.equal(inspected.response.status, 200);
  f.setRegionResponse(404, {
    code: 20404, status: 404, message: "Synthetic absent region resource " + f.credentials.authToken,
  });
  const reply = await f.post("plan", {
    connectionId: inspected.body.connectionId, numberId: f.number.sid,
  }, { origin: LOCALHOST_ORIGIN });
  assert.equal(reply.response.status, 200);
  jsonCors(reply, LOCALHOST_ORIGIN);
  noSecrets(reply.text, f);
  assert.equal(reply.body.phase, "review");
  assert.equal(reply.body.number.phoneNumber, NUMBER);
  assert.equal(reply.text.includes("20404"), false);
  assert.equal(reply.text.includes("Synthetic absent"), false);
  assert.ok(f.requests.some((entry) => entry.path === "/v2/PhoneNumbers/" + encodeURIComponent(NUMBER)));
  assert.ok(f.requests.every((entry) => entry.method === "GET"));
  assert.deepEqual(f.effects, []);
  assert.equal(f.keys.size, 0);
  const denied = await f.post("apply", {
    planId: reply.body.planId, confirmation: { configure: false, replaceExistingRouting: false },
  }, { origin: LOCALHOST_ORIGIN });
  assert.equal(denied.response.status, 422);
  jsonCors(denied, LOCALHOST_ORIGIN);
  assert.deepEqual(f.effects, []);
  assert.deepEqual(f.carrierCommands, []);
});

test("untrusted regional 404 payloads and JSON 200 cannot forge the internal implicit US1 fallback", async (t) => {
  for (const [status, body, expected] of [
    [404, "<!doctype html><html>not found</html>", 503],
    [404, { code: 99999, status: 404 }, 503],
    [404, { code: "20404", status: 404 }, 503],
    [404, { code: 20404, status: 500 }, 503],
    [404, { code: 20404 }, 503],
    [404, { code: 20404, status: "404" }, 503],
    [200, { code: 20404, status: 404 }, 422],
    [200, { implicitUS1: true }, 422],
    [403, { code: 20404, status: 404 }, 403],
    [500, { code: 20404, status: 404 }, 503],
  ]) {
    const f = await fixture(t);
    await f.login();
    const inspection = (await f.inspect()).body;
    f.setRegionResponse(status, body);
    const reply = await f.plan(inspection);
    assert.equal(reply.response.status, expected);
    jsonCors(reply);
    noSecrets(reply.text, f);
    assert.notEqual(reply.body.phase, "review");
    assert.deepEqual(f.effects, []);
    assert.deepEqual(f.carrierCommands, []);
    assert.equal(f.keys.size, 0);
  }
});

test("owned number 404 and an explicitly incompatible region never receive the regional fallback", async (t) => {
  for (const missingNumber of [false, true]) {
    const f = await fixture(t);
    await f.login();
    const inspection = (await f.inspect()).body;
    if (missingNumber) {
      f.setOwnedNumberMissing();
      f.setRegionResponse(404, { code: 20404, status: 404 });
    } else {
      f.setRegionResponse(200, { account_sid: f.credentials.accountSid, phone_number: NUMBER, voice_region: "ie1" });
    }
    const reply = await f.plan(inspection);
    assert.equal(reply.response.status, missingNumber ? 503 : 422);
    jsonCors(reply);
    noSecrets(reply.text, f);
    if (missingNumber) assert.equal(f.requests.some((entry) => entry.path.startsWith("/v2/PhoneNumbers/")), false);
    assert.deepEqual(f.effects, []);
    assert.deepEqual(f.carrierCommands, []);
    assert.equal(f.keys.size, 0);
  }
});
