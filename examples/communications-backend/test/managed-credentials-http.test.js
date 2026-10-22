// SPDX-License-Identifier: Apache-2.0
// Independent HTTP acceptance of the actual Telnyx setup and managed issuer.
// REST responses, provider tokens and call events are synthetic fixtures.
// No provider requests, SDK registration, real calls or media are performed.
import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac, generateKeyPairSync, randomBytes, randomUUID, sign } from "node:crypto";
import { createBackend } from "../server.js";
import { validateConfig } from "../lib/config.js";
import { createSetupProviderOperations } from "../lib/setup-providers.js";
import { EncryptedSetupStore } from "../lib/setup-store.js";
import { sha256 } from "../lib/security.js";

const ORIGIN = "http://127.0.0.1:3000";
const PUBLIC_URL = "https://managed-issuer.example.invalid";
const NOW = Date.parse("2026-10-21T14:00:00Z");
const NUMBER = "+12025550132";
const CALLER = "+12025550133";
const NUMBER_ID = "555000000000000032";
const OWNER = "aureform-owner";
const opaque = () => randomBytes(32).toString("base64url");
const clone = (value) => structuredClone(value);
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const claims = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json" },
});

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), "aureform-managed-issuer-http-"));
  await chmod(directory, 0o700);
  const file = join(directory, "vault.encrypted.json");
  const masterKey = randomBytes(32).toString("base64");
  const accessCode = opaque();
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const credentials = {
    provider: "telnyx",
    apiKey: "KEY_SYNTHETIC_" + randomBytes(24).toString("hex"),
    publicKey: publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64"),
  };
  const tokenSecret = opaque();
  const privateValues = new Set([masterKey, accessCode, credentials.apiKey, tokenSecret]);
  const providerTokens = new Set();
  const env = {
    SETUP_STATE_FILE: file, SETUP_MASTER_KEY: masterKey,
    SETUP_ADMIN_AUTH_SHA256: sha256(accessCode),
    ENABLE_CARRIER_OPERATIONS: "false", PUBLIC_BASE_URL: PUBLIC_URL,
  };
  const baseConfig = validateConfig({
    tenantId: "managed-issuer-http-laboratory", origins: [ORIGIN],
    schedule: {
      timezone: "America/Bogota",
      weekly: Array.from({ length: 7 }, (_, day) => ({ day, start: "00:00", end: "24:00" })),
      holidays: [],
    },
    providers: {}, agents: [], approvals: [], carrierTokenSeconds: 300,
  }, env);
  const number = {
    id: NUMBER_ID, phone_number: NUMBER, status: "active", customer_reference: "Synthetic owned number",
    connection_id: null, messaging_profile_id: "synthetic-unchanged-messaging",
    call_forwarding_enabled: false, call_recording_enabled: false,
  };
  const voice = {
    id: NUMBER_ID, record_type: "voice_settings", connection_id: null, translated_number: null,
    tech_prefix_enabled: false, inbound_call_screening: "disabled",
    call_forwarding: { call_forwarding_enabled: false, forwards_to: null, forwarding_type: "always" },
    call_recording: {
      inbound_call_recording_enabled: false, inbound_call_recording_format: "wav",
      inbound_call_recording_channels: "single",
    },
  };
  const applications = new Map();
  const connections = new Map();
  const parents = new Map();
  const issuedTokens = new Map();
  const requests = [];
  const effects = [];
  const boundaries = [];
  const waits = [];
  const carrierAttempts = [];
  const running = new Set();
  let now = NOW;
  let backend;
  let store;
  let operations;
  let base;
  let operatorToken;
  let loseParent;
  let loseToken;
  let parentGate;
  let waitGate;
  let tokenExtraSeconds = 0;
  let outboundDrift;

  const assertPrivateAbsent = (text, allowProviderToken = false) => {
    for (const value of privateValues) assert.ok(!text.includes(value), "private fixture values must not appear in HTTP or raw vault bytes");
    if (!allowProviderToken) for (const value of providerTokens) assert.ok(!text.includes(value), "provider token belongs only in the authenticated credential response");
  };
  const device = async () => {
    const state = await store.read();
    const connectionId = state.active.telnyx?.connectionId;
    return state.devices?.[connectionId + ":" + OWNER];
  };
  const durableBoundary = async (operation) => {
    const state = await store.read();
    const active = state.active.telnyx;
    const entry = state.devices?.[active.connectionId + ":" + OWNER];
    assert.ok(entry, "a server-owned device must be durable before issuer I/O");
    assert.equal(entry.connectionId, active.connectionId);
    assert.equal(entry.agentId, OWNER);
    assert.match(entry.deviceId, /^owner-[0-9a-f]{32}$/);
    assert.equal(entry.phase, "issuing");
    assert.equal(entry.stage, "before-effect");
    assert.ok(entry.checkpointCount >= 1);
    assert.equal(entry.checkpoint.privateState.kind, "browser-credential");
    assert.equal(entry.checkpoint.privateState.deviceId, entry.deviceId);
    assert.equal(entry.checkpoint.privateState.credentialConnectionId, active.credentialConnectionId);
    assert.equal(entry.checkpoint.privateState.pending.operation, operation);
    assert.equal(entry.checkpoint.privateState.unknown, null);
    const raw = await readFile(file, "utf8");
    assertPrivateAbsent(raw);
    assert.equal(JSON.parse(raw).algorithm, "aes-256-gcm");
    boundaries.push({ operation, state: clone(state), deviceId: entry.deviceId });
    return { entry, active };
  };

  // Strict configuration/credential allowlist. There is no fallback fetch.
  const providerREST = async (input, init = {}) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://api.telnyx.com");
    assert.equal(init.redirect, "error");
    assert.ok(init.signal instanceof AbortSignal);
    assert.ok(init.headers.Authorization === "Bearer " + credentials.apiKey, "REST authentication uses the privately inspected key");
    const request = {
      method: init.method, path: url.pathname, query: url.search,
      body: init.body === undefined ? null : JSON.parse(init.body),
    };
    requests.push(request);
    const { method, path, body } = request;
    if (method === "GET" && path === "/v2/phone_numbers") {
      assert.equal(url.searchParams.get("page[number]"), "1");
      assert.equal(url.searchParams.get("page[size]"), "100");
      return json({ data: [clone(number)], meta: { total_pages: 1, page_number: 1, page_size: 100, total_results: 1 } });
    }
    if (method === "POST" && path === "/v2/numbers_features") {
      assert.deepEqual(body, { phone_numbers: [NUMBER] });
      return json({ data: [{ phone_number: NUMBER, features: ["voice", "sms"] }] });
    }
    if (method === "GET" && path === "/v2/phone_numbers/" + NUMBER_ID + "/voice") return json({ data: clone(voice) });
    if (path === "/v2/phone_numbers/" + NUMBER_ID) {
      if (method === "GET") return json({ data: clone(number) });
      if (method === "PATCH") {
        assert.deepEqual(Object.keys(body), ["connection_id"]);
        assert.ok(applications.has(body.connection_id));
        effects.push("attach-owned-number");
        number.connection_id = body.connection_id;
        voice.connection_id = body.connection_id;
        return json({ data: clone(number) });
      }
    }
    if (method === "POST" && path === "/v2/call_control_applications") {
      assert.deepEqual(Object.keys(body).sort(), ["active", "application_name", "webhook_api_version", "webhook_event_url"]);
      assert.match(body.application_name, /^aureform:[0-9a-f-]{36}:call-control$/);
      assert.equal(body.webhook_event_url, PUBLIC_URL + "/webhooks/telnyx");
      assert.equal(body.webhook_api_version, "2");
      assert.equal(body.active, true);
      const id = "application-" + (applications.size + 1);
      applications.set(id, { id, ...body, webhook_event_failover_url: "" });
      effects.push("create-call-control-application");
      return json({ data: clone(applications.get(id)) }, 201);
    }
    if (method === "GET" && path.startsWith("/v2/call_control_applications/")) {
      const value = applications.get(path.slice("/v2/call_control_applications/".length));
      assert.ok(value);
      return json({ data: clone(value) });
    }
    if (method === "POST" && path === "/v2/credential_connections") {
      assert.deepEqual(Object.keys(body).sort(), [
        "active", "connection_name", "password", "sip_uri_calling_preference", "user_name", "webhook_api_version",
      ]);
      assert.match(body.connection_name, /^aureform:[0-9a-f-]{36}:browser$/);
      assert.equal(body.sip_uri_calling_preference, "internal");
      assert.equal(body.active, true);
      assert.equal(body.webhook_api_version, "2");
      assert.ok(typeof body.password === "string" && body.password.length >= 8);
      privateValues.add(body.password);
      const id = "sip-connection-" + (connections.size + 1);
      connections.set(id, {
        id, ...body, outbound: { outbound_voice_profile_id: null, call_parking_enabled: false },
      });
      effects.push("create-internal-sip-connection");
      return json({ data: clone(connections.get(id)) }, 201);
    }
    if (method === "GET" && path.startsWith("/v2/credential_connections/")) {
      const value = connections.get(path.slice("/v2/credential_connections/".length));
      assert.ok(value);
      return json({ data: { ...clone(value), password: "[masked]" } });
    }
    if (method === "POST" && path === "/v2/telephony_credentials") {
      assert.deepEqual(Object.keys(body).sort(), ["connection_id", "expires_at", "name"]);
      const { entry, active } = await durableBoundary("create-browser-telephony-credential");
      assert.equal(body.connection_id, active.credentialConnectionId);
      assert.equal(Date.parse(body.expires_at) - now, 300000);
      assert.equal(body.name, "aureform:" + active.connectionId + ":device:" + sha256(JSON.stringify(entry.deviceId)).slice(0, 12));
      const id = "credential-" + (parents.size + 1);
      const password = opaque();
      privateValues.add(password);
      parents.set(id, {
        id, resource_id: "connection:" + body.connection_id, name: body.name,
        sip_username: "gencredSynthetic" + parents.size,
        sip_password: password, expires_at: body.expires_at, expired: false,
      });
      effects.push("create-browser-parent");
      if (parentGate) {
        parentGate.entered.resolve();
        await parentGate.release.promise;
      }
      if (loseParent) throw new Error("Synthetic parent response lost " + credentials.apiKey + " " + password);
      return json({ data: clone(parents.get(id)) }, 201);
    }
    const parent = path.match(/^\/v2\/telephony_credentials\/(credential-\d+)(\/token)?$/);
    if (parent) {
      const value = parents.get(parent[1]);
      assert.ok(value);
      if (method === "GET" && !parent[2]) return json({ data: clone(value) });
      if (method === "POST" && parent[2]) {
        assert.equal(init.headers.Accept, "text/plain");
        assert.equal(init.body, undefined);
        const { entry } = await durableBoundary("create-browser-token");
        assert.equal(entry.checkpoint.privateState.resources.credential.id, value.id);
        const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
        const payload = Buffer.from(JSON.stringify({
          exp: Math.floor(Date.parse(value.expires_at) / 1000) - (options.shortenTokenSeconds ?? 0) + tokenExtraSeconds,
          iat: Math.floor(now / 1000), sub: value.id,
        })).toString("base64url");
        const token = header + "." + payload + "." + createHmac("sha256", tokenSecret).update(header + "." + payload).digest("base64url");
        issuedTokens.set(value.id, token);
        providerTokens.add(token);
        effects.push("create-browser-token");
        if (loseToken) throw new Error("Synthetic token response lost " + credentials.apiKey + " " + token);
        return new Response(token, { status: 201, headers: { "Content-Type": "text/plain" } });
      }
    }
    assert.fail("Unexpected synthetic Telnyx configuration or credential route");
  };
  const propagationWait = async (milliseconds) => {
    assert.equal(milliseconds, 5000);
    waits.push(milliseconds);
    if (outboundDrift) for (const value of connections.values()) value.outbound.outbound_voice_profile_id = "synthetic-outbound-profile";
    if (waitGate) {
      waitGate.entered.resolve();
      await waitGate.release.promise;
    }
  };
  const start = async () => {
    store = new EncryptedSetupStore({ file, key: masterKey });
    // A new helper instance on every restart rules out in-memory-only recovery.
    operations = createSetupProviderOperations({ fetch: providerREST, publicBaseUrl: PUBLIC_URL, now: () => now, wait: propagationWait });
    const denyCarrier = (operation) => async () => {
      carrierAttempts.push(operation);
      assert.fail("Real call/media operations are forbidden in this fixture");
    };
    backend = createBackend({
      config: clone(baseConfig), env: { ...env }, setupStore: store, setupOperations: operations,
      providers: { telnyx: {
        token: denyCarrier("unmanaged-token"),
        answer: denyCarrier("answer"), offer: denyCarrier("offer"), bridge: denyCarrier("bridge"),
        hangup: denyCarrier("hangup"), inspect: denyCarrier("inspect"), closedMessage: denyCarrier("closed-message"),
      } },
      now: () => now, timers: false,
    });
    running.add(backend);
    await backend.ready;
    assert.equal(backend.initializationFailed, false);
    await new Promise((resolve) => backend.server.listen(0, "127.0.0.1", resolve));
    base = "http://127.0.0.1:" + backend.server.address().port;
  };
  const stop = async () => {
    if (running.delete(backend)) await backend.close();
  };
  t.after(async () => {
    parentGate?.release.resolve();
    waitGate?.release.resolve();
    for (const current of running) await current.close();
    await rm(directory, { recursive: true, force: true });
  });
  await start();
  const request = async (path, { method = "GET", body, raw, token = operatorToken, origin = ORIGIN, headers = {} } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(origin === null ? {} : { Origin: origin }),
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      ...(raw !== undefined ? { body: raw } : body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(8000),
    });
    const text = await response.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { response, body: parsed, text };
  };
  const post = (path, body, overrides) => request("/v1/communications/setup/" + path, { method: "POST", body, ...overrides });
  const login = async () => {
    const result = await post("login", { accessCode }, { token: null });
    assert.equal(result.response.status, 200);
    operatorToken = result.body.sessionToken;
    assertPrivateAbsent(result.text);
    return result;
  };
  const configure = async () => {
    await login();
    const inspected = await post("inspect", credentials);
    assert.equal(inspected.response.status, 200);
    assertPrivateAbsent(inspected.text);
    const planned = await post("plan", { connectionId: inspected.body.connectionId, numberId: NUMBER_ID });
    assert.equal(planned.response.status, 200);
    assertPrivateAbsent(planned.text);
    const applied = await post("apply", {
      planId: planned.body.planId, confirmation: { configure: true, replaceExistingRouting: false },
    });
    assert.equal(applied.response.status, 200);
    assertPrivateAbsent(applied.text);
    assert.equal(parents.size, 0, "configuration alone must not create browser credentials");
    assert.equal(backend.engine.config.operationsEnabled, false);
    return { inspected: inspected.body, planned: planned.body, applied: applied.body };
  };
  const voiceSession = (token = operatorToken, body = { provider: "telnyx" }) =>
    request("/v1/communications/session", { method: "POST", token, body });
  const sessionIsSafe = (reply) => {
    assertPrivateAbsent(reply.text, true);
    const exposed = clone(reply.body);
    const token = exposed.credentials.token;
    delete exposed.credentials.token;
    assertPrivateAbsent(JSON.stringify(exposed));
    assert.ok(providerTokens.has(token), "authenticated response contains only an actual token produced by the injected real helper");
  };
  const principal = (session) => backend.auth.get("Bearer " + session.sessionToken, ORIGIN).principal;
  const signedHook = async (type, controlId) => {
    const state = await store.read();
    const event = {
      data: {
        id: "synthetic-event-" + randomUUID(), event_type: type,
        payload: {
          connection_id: state.active.telnyx.applicationId,
          call_control_id: controlId, call_leg_id: "synthetic-leg", call_session_id: "synthetic-call-session",
          direction: "incoming", from: CALLER, to: NUMBER,
        },
      },
    };
    const raw = JSON.stringify(event);
    const timestamp = String(Math.floor(now / 1000));
    return request("/webhooks/telnyx", {
      method: "POST", raw, origin: null, token: null,
      headers: {
        "Content-Type": "application/json", "telnyx-timestamp": timestamp,
        "telnyx-signature-ed25519": sign(null, Buffer.from(timestamp + "|" + raw), privateKey).toString("base64"),
      },
    });
  };
  return {
    directory, file, credentials, masterKey, env, parents, applications, connections, issuedTokens,
    requests, effects, boundaries, waits, carrierAttempts,
    request, post, login, configure, voiceSession, principal, device, signedHook, sessionIsSafe, assertPrivateAbsent,
    get backend() { return backend; },
    get store() { return store; },
    get operatorToken() { return operatorToken; },
    advance: (milliseconds) => { now += milliseconds; },
    restart: async () => { await stop(); await start(); },
    loseParentResponse: () => { loseParent = true; },
    loseTokenResponse: () => { loseToken = true; },
    overlongToken: () => { tokenExtraSeconds = 3600; },
    driftOutboundDuringWait: () => { outboundDrift = true; },
    gateParent: () => { parentGate = { entered: deferred(), release: deferred() }; return parentGate; },
    gateWait: () => { waitGate = { entered: deferred(), release: deferred() }; return waitGate; },
  };
}

test("actual managed issuer crosses HTTP setup with encrypted device checkpoints and bounded real-helper token expiry", async (t) => {
  const f = await fixture(t, { shortenTokenSeconds: 45 });
  const setup = await f.configure();
  const reply = await f.voiceSession();
  assert.equal(reply.response.status, 200);
  f.sessionIsSafe(reply);
  assert.equal(reply.body.provider, "telnyx");
  assert.equal(reply.body.agentId, OWNER);
  assert.equal(reply.body.credentials.kind, "telnyx-login-token");
  assert.equal(reply.body.envelope.snapshot.connection, "disconnected");
  assert.equal(reply.body.envelope.snapshot.activeCall, null);
  const parent = [...f.parents.values()][0];
  assert.equal(Date.parse(parent.expires_at), NOW + 300000);
  assert.equal(Date.parse(reply.body.credentials.expiresAt), NOW + 255000);
  assert.equal(claims(reply.body.credentials.token).exp * 1000, Date.parse(reply.body.credentials.expiresAt));
  const principal = f.principal(reply.body);
  assert.equal(principal.telnyxCredentialId, parent.id);
  assert.equal(principal.telnyxSipUsername, parent.sip_username);
  assert.equal(principal.telnyxCredentialExpiresAt, reply.body.credentials.expiresAt);
  const stored = await f.device();
  assert.equal(stored.connectionId, setup.inspected.connectionId);
  assert.equal(stored.phase, "verified");
  assert.equal(stored.stage, "verified");
  assert.equal(stored.credentialId, parent.id);
  assert.equal(stored.sipUsername, parent.sip_username);
  assert.equal(stored.expiresAt, reply.body.credentials.expiresAt);
  assert.equal(stored.checkpoint.privateState.pending, null);
  assert.equal(stored.checkpoint.privateState.unknown, null);
  assert.ok(stored.checkpoint.privateState.resources.token.token === reply.body.credentials.token, "verified token must be privately durable");
  assert.deepEqual(f.boundaries.map((entry) => entry.operation), ["create-browser-telephony-credential", "create-browser-token"]);
  assert.deepEqual(f.waits, [5000]);
  for (const value of f.connections.values()) {
    assert.equal(value.sip_uri_calling_preference, "internal");
    assert.equal(value.outbound.outbound_voice_profile_id, null);
    assert.equal(value.outbound.call_parking_enabled, false);
  }
  const raw = await readFile(f.file, "utf8");
  f.assertPrivateAbsent(raw);
  assert.equal((await stat(f.file)).mode & 0o777, 0o600);
  assert.equal((await stat(f.directory)).mode & 0o777, 0o700);
  assert.equal(f.backend.engine.config.operationsEnabled, false);
  assert.deepEqual(f.carrierAttempts, []);
});

test("repeat and encrypted restart reuse the same verified parent, device and token without duplicate credential creation", async (t) => {
  const f = await fixture(t);
  await f.configure();
  const first = await f.voiceSession();
  assert.equal(first.response.status, 200);
  const before = await f.device();
  const effects = f.effects.slice();
  const repeated = await f.voiceSession(first.body.sessionToken);
  assert.equal(repeated.response.status, 200);
  f.sessionIsSafe(repeated);
  assert.equal(repeated.body.sessionId, first.body.sessionId);
  assert.ok(repeated.body.credentials.token === first.body.credentials.token, "verified token is reused");
  assert.equal((await f.device()).deviceId, before.deviceId);
  assert.deepEqual(f.effects, effects);
  await f.restart();
  await f.login();
  const recovered = await f.voiceSession();
  assert.equal(recovered.response.status, 200);
  f.sessionIsSafe(recovered);
  assert.equal(f.principal(recovered.body).telnyxCredentialId, before.credentialId);
  assert.equal((await f.device()).deviceId, before.deviceId);
  assert.ok(recovered.body.credentials.token === first.body.credentials.token, "fresh helper must reuse the encrypted token checkpoint");
  assert.deepEqual(f.effects, effects);
  assert.equal(f.parents.size, 1);
});

for (const stage of ["parent", "token"]) {
  test(`ambiguous ${stage} creation blocks restart and expired retry before any issuer I/O or duplicate parent`, async (t) => {
    const f = await fixture(t);
    await f.configure();
    if (stage === "parent") f.loseParentResponse();
    else f.loseTokenResponse();
    const failed = await f.voiceSession();
    assert.equal(failed.response.status, 503);
    f.assertPrivateAbsent(failed.text);
    assert.deepEqual(failed.body, { error: { code: "setup-reconciliation-required", message: "setup-reconciliation-required" } });
    const unknown = await f.device();
    assert.equal(unknown.phase, "unknown");
    assert.ok(unknown.checkpoint.privateState.pending);
    assert.ok(unknown.checkpoint.privateState.unknown);
    assert.equal(f.parents.size, 1);
    const effects = f.effects.slice();
    const requestCount = f.requests.length;
    await f.restart();
    f.advance(600000);
    await f.login();
    const retry = await f.voiceSession();
    assert.equal(retry.response.status, 409);
    f.assertPrivateAbsent(retry.text);
    assert.equal(retry.body.error.code, "setup-reconciliation-required");
    assert.equal(f.requests.length, requestCount, "persisted uncertainty must reject before REST");
    assert.equal((await f.device()).deviceId, unknown.deviceId);
    assert.deepEqual(f.effects, effects);
    assert.equal(f.parents.size, 1);
    const connections = await f.request("/v1/communications/setup/connections");
    assert.equal(connections.response.status, 200);
    f.assertPrivateAbsent(connections.text);
    assert.equal(connections.text.includes("privateState"), false);
    assert.equal(connections.text.includes(unknown.deviceId), false);
    assert.deepEqual(f.carrierAttempts, []);
  });
}

test("a crash at the durable pending-create boundary remains blocked even after expiry and a fresh helper", async (t) => {
  const f = await fixture(t);
  await f.configure();
  f.loseParentResponse();
  assert.equal((await f.voiceSession()).response.status, 503);
  const boundary = f.boundaries.find((entry) => entry.operation === "create-browser-telephony-credential");
  assert.ok(boundary, "actual pre-effect encrypted state must have been observed");
  // Restore exactly the state durably present when a process could have died.
  await f.store.write(clone(boundary.state));
  await f.restart();
  f.advance(600000);
  await f.login();
  const count = f.requests.length;
  const reply = await f.voiceSession();
  assert.equal(reply.response.status, 409);
  f.assertPrivateAbsent(reply.text);
  assert.equal(reply.body.error.code, "setup-reconciliation-required");
  assert.equal(f.requests.length, count);
  assert.equal(f.parents.size, 1);
  assert.equal((await f.device()).deviceId, boundary.deviceId);
});

test("two authenticated operator sessions for one owner serialize issuance and block setup replacement in flight", async (t) => {
  const f = await fixture(t);
  await f.configure();
  const firstOwner = f.operatorToken;
  await f.login();
  const secondOwner = f.operatorToken;
  const gate = f.gateParent();
  const issuing = f.voiceSession(firstOwner);
  await Promise.race([
    gate.entered.promise,
    issuing.then(() => assert.fail("issuance finished without entering the injected parent boundary")),
  ]);
  try {
    const second = await f.voiceSession(secondOwner);
    assert.equal(second.response.status, 409);
    assert.equal(second.body.error.code, "setup-busy");
    f.assertPrivateAbsent(second.text);
    assert.equal(f.parents.size, 1);
    const inspected = await f.post("inspect", f.credentials);
    assert.equal(inspected.response.status, 200);
    const planned = await f.post("plan", { connectionId: inspected.body.connectionId, numberId: NUMBER_ID });
    assert.equal(planned.response.status, 200);
    const writes = f.effects.slice();
    const replacement = await f.post("apply", {
      planId: planned.body.planId, confirmation: { configure: true, replaceExistingRouting: true },
    });
    assert.equal(replacement.response.status, 409);
    assert.equal(replacement.body.error.code, "setup-busy");
    assert.deepEqual(f.effects, writes);
  } finally {
    gate.release.resolve();
  }
  const first = await issuing;
  assert.equal(first.response.status, 200);
  f.sessionIsSafe(first);
  const next = await f.voiceSession(secondOwner);
  assert.equal(next.response.status, 200);
  assert.equal(f.parents.size, 1);
  assert.equal(f.effects.filter((effect) => effect === "create-browser-token").length, 1);
});

test("verified near-expiry and expired credentials rotate to new server-owned device IDs and bounded new parents", async (t) => {
  const f = await fixture(t);
  await f.configure();
  assert.equal((await f.voiceSession()).response.status, 200);
  const first = await f.device();
  f.advance(210000);
  const nearExpiry = await f.voiceSession();
  assert.equal(nearExpiry.response.status, 200);
  f.sessionIsSafe(nearExpiry);
  const second = await f.device();
  assert.notEqual(second.deviceId, first.deviceId);
  assert.notEqual(second.credentialId, first.credentialId);
  assert.equal(Date.parse(second.expiresAt), NOW + 510000);
  assert.equal(f.parents.size, 2);
  f.advance(300001);
  const expired = await f.voiceSession();
  assert.equal(expired.response.status, 200);
  f.sessionIsSafe(expired);
  const third = await f.device();
  assert.notEqual(third.deviceId, second.deviceId);
  assert.notEqual(third.credentialId, second.credentialId);
  assert.equal(f.parents.size, 3);
  assert.equal(Date.parse(third.expiresAt) - (NOW + 510001), 299999);
  assert.deepEqual(f.carrierAttempts, []);
});

test("nonterminal signed synthetic inbound state blocks renewal before issuer I/O and terminal observation restores it", async (t) => {
  const f = await fixture(t);
  await f.configure();
  const session = await f.voiceSession();
  assert.equal(session.response.status, 200);
  const original = await f.device();
  // No approval: the event admits a denied, nonterminal call without a carrier
  // action. It exercises the real signature/parser/guard, not real telephony.
  const incoming = await f.signedHook("call.initiated", "synthetic-inbound-guard");
  assert.equal(incoming.response.status, 200);
  assert.ok([...f.backend.engine.calls.values()].some((call) => call.provider === "telnyx" && call.phase !== "ended"));
  f.advance(210000);
  const count = f.requests.length;
  const blocked = await f.voiceSession(session.body.sessionToken);
  assert.equal(blocked.response.status, 409);
  assert.equal(blocked.body.error.code, "credential-renewal-requires-idle-agent");
  f.assertPrivateAbsent(blocked.text);
  assert.equal(f.requests.length, count);
  assert.equal((await f.device()).deviceId, original.deviceId);
  assert.equal(f.parents.size, 1);
  assert.equal((await f.signedHook("call.hangup", "synthetic-inbound-guard")).response.status, 200);
  const renewed = await f.voiceSession(session.body.sessionToken);
  assert.equal(renewed.response.status, 200);
  assert.notEqual((await f.device()).deviceId, original.deviceId);
  assert.deepEqual(f.carrierAttempts, []);
});

test("an inbound event during credential propagation prevents renewal from changing the active principal", async (t) => {
  const f = await fixture(t);
  await f.configure();
  const initial = await f.voiceSession();
  assert.equal(initial.response.status, 200);
  const original = await f.device();
  f.advance(210000);
  const gate = f.gateWait();
  const renewing = f.voiceSession(initial.body.sessionToken);
  await Promise.race([
    gate.entered.promise,
    renewing.then(() => assert.fail("renewal finished without entering propagation wait")),
  ]);
  try {
    const admitted = await f.signedHook("call.initiated", "synthetic-inbound-during-renewal");
    assert.equal(admitted.response.status, 200);
    assert.ok([...f.backend.engine.calls.values()].some((call) => call.phase !== "ended"));
  } finally {
    gate.release.resolve();
  }
  const blocked = await renewing;
  assert.equal(blocked.response.status, 409, "the idle check must also hold after the awaited issuer returns");
  f.assertPrivateAbsent(blocked.text);
  assert.equal(blocked.body.error.code, "credential-renewal-requires-idle-agent");
  const principal = f.backend.engine.config.agents.find((agent) => agent.id === OWNER);
  assert.equal(principal.telnyxCredentialId, original.credentialId);
  assert.equal(principal.telnyxSipUsername, original.sipUsername);
  assert.equal(f.parents.size, 2, "already verified new parent stays privately reusable without another create");
  assert.equal((await f.signedHook("call.hangup", "synthetic-inbound-during-renewal")).response.status, 200);
  const recovered = await f.voiceSession(initial.body.sessionToken);
  assert.equal(recovered.response.status, 200);
  assert.notEqual(f.principal(recovered.body).telnyxCredentialId, original.credentialId);
  assert.equal(f.parents.size, 2);
  assert.deepEqual(f.carrierAttempts, []);
});

test("provider JWT beyond its parent TTL remains encrypted and unknown instead of creating a live session", async (t) => {
  const f = await fixture(t);
  await f.configure();
  f.overlongToken();
  const reply = await f.voiceSession();
  assert.equal(reply.response.status, 503);
  f.assertPrivateAbsent(reply.text);
  assert.equal(reply.body.error.code, "setup-reconciliation-required");
  const stored = await f.device();
  assert.equal(stored.phase, "unknown");
  assert.equal(stored.checkpoint.privateState.unknown.operation, "create-browser-token");
  const raw = await readFile(f.file, "utf8");
  f.assertPrivateAbsent(raw);
  const count = f.requests.length;
  assert.equal((await f.voiceSession()).response.status, 409);
  assert.equal(f.requests.length, count);
  assert.equal(f.parents.size, 1);
  assert.deepEqual(f.carrierAttempts, []);
});

test("outbound policy drift during propagation cannot report a browser token or silently create another parent", async (t) => {
  const f = await fixture(t);
  await f.configure();
  f.driftOutboundDuringWait();
  const reply = await f.voiceSession();
  assert.ok(reply.response.status >= 400);
  f.assertPrivateAbsent(reply.text);
  assert.equal(f.parents.size, 1);
  const stored = await f.device();
  assert.notEqual(stored.phase, "verified");
  const principal = f.backend.engine.config.agents.find((agent) => agent.id === OWNER);
  assert.equal(principal.telnyxCredentialId, undefined);
  const before = f.effects.slice();
  const retry = await f.voiceSession();
  assert.ok(retry.response.status >= 400);
  assert.deepEqual(f.effects, before);
  assert.equal(f.parents.size, 1);
  assert.deepEqual(f.carrierAttempts, []);
});
