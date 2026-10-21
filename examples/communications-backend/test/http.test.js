// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import twilio from "twilio";
import { createBackend } from "../server.js";
import { parseForm } from "../lib/security.js";
import { fixtureConfig, fixtureProviders, ACCOUNT, NOW, ORIGIN, BOOTSTRAP, twilioForm, telnyxEvent, sid } from "./fixtures.js";

async function fixture(t, options = {}) {
  let time = NOW;
  const config = fixtureConfig(options), providers = fixtureProviders();
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const env = { TWILIO_ACCOUNT_SID: ACCOUNT, TWILIO_AUTH_TOKEN: "fixture-auth-token",
    TELNYX_PUBLIC_KEY: publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("base64") };
  const backend = createBackend({ config, env, providers, now: () => time, timers: false });
  await new Promise((resolve) => backend.server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + backend.server.address().port;
  t.after(() => backend.close());
  const session = async (provider = "twilio", token = BOOTSTRAP, method = "GET") => {
    const response = await fetch(base + "/v1/communications/session" + (method === "GET" ? "?provider=" + provider : ""), {
      method, headers: { Authorization: "Bearer " + token, Origin: ORIGIN, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      ...(method === "POST" ? { body: JSON.stringify({ provider }) } : {}),
    });
    return { response, body: await response.json() };
  };
  const command = async (s, type, payload = {}, callId, override = {}) => {
    const body = { commandId: randomUUID(), expectedRevision: backend.engine.envelope(backend.auth.get("Bearer " + s.sessionToken, ORIGIN)).revision,
      type, payload, ...(callId ? { callId } : {}), ...override };
    const response = await fetch(base + "/v1/communications/commands", {
      method: "POST", headers: { Authorization: "Bearer " + s.sessionToken, Origin: ORIGIN, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { response, body: await response.json(), request: body };
  };
  const twilioHook = async (path, form, headers = {}) => {
    const raw = new URLSearchParams(form).toString();
    return fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded",
        "X-Twilio-Signature": twilio.getExpectedTwilioSignature(env.TWILIO_AUTH_TOKEN, config.publicBaseUrl + path, parseForm(Buffer.from(raw))), ...headers },
      body: raw,
    });
  };
  const telnyxHook = async (event, offset = 0) => {
    const raw = JSON.stringify(event), timestamp = String(Math.floor((time + offset) / 1000));
    return fetch(base + "/webhooks/telnyx", { method: "POST",
      headers: { "Content-Type": "application/json", "telnyx-timestamp": timestamp,
        "telnyx-signature-ed25519": sign(null, Buffer.from(timestamp + "|" + raw), privateKey).toString("base64") }, body: raw });
  };
  return { ...backend, config, providers, base, session, command, twilioHook, telnyxHook, setTime: (v) => { time = v; } };
}
test("standalone health is runnable with no credentials; default auth fails closed", async (t) => {
  const backend = createBackend({ env: {}, config: fixtureConfig({ enabled: false }), providers: fixtureProviders(), timers: false });
  await new Promise((r) => backend.server.listen(0, "127.0.0.1", r)); t.after(() => backend.close());
  const base = "http://127.0.0.1:" + backend.server.address().port;
  assert.equal((await fetch(base + "/health")).status, 200);
  assert.equal((await fetch(base + "/v1/communications/session", { headers: { Origin: ORIGIN } })).status, 401);
});
test("session scope is fixed by authentication; tenant/connection/query auth overrides are denied", async (t) => {
  const f = await fixture(t);
  const { response, body } = await f.session();
  assert.equal(response.status, 200);
  assert.equal(body.tenantId, "fixture-tenant"); assert.equal(body.agentId, "agent-1");
  assert.equal(body.envelope.scope.provider, "twilio");
  assert.equal(body.envelope.snapshot.mode, "live");
   assert.deepEqual(body.envelope.snapshot.caps, { hold: false, mute: false, dtmf: false });
   assert.equal(body.envelope.capabilities.mute, true);
   assert.equal(body.envelope.capabilities.dtmf, true);
  assert.equal(body.envelope.capabilities.hold, false);
  const headers = { Authorization: "Bearer " + BOOTSTRAP, Origin: ORIGIN, "Content-Type": "application/json" };
  assert.equal((await fetch(f.base + "/v1/communications/session", { method: "POST", headers, body: '{"provider":"twilio","tenantId":"other"}' })).status, 400);
  assert.equal((await fetch(f.base + "/v1/communications/session?sessionToken=x", { headers })).status, 403);
  assert.equal((await fetch(f.base + "/v1/communications/session", { headers: { ...headers, Origin: "https://evil.example.invalid" } })).status, 403);
  assert.equal(f.providers.operations.length, 0);
});
test("renewal rotates auth token while preserving same session, agent, provider and reservation", async (t) => {
  const f = await fixture(t);
  const s = (await f.session()).body;
  await f.command(s, "connect"); await f.command(s, "presence", { presence: "available" });
  await f.twilioHook("/webhooks/twilio/inbound", twilioForm());
  const oldReservation = f.engine.agents.get("agent-1").reservation;
  const renewed = await f.session("twilio", s.sessionToken, "POST");
  assert.equal(renewed.response.status, 200);
  assert.equal(renewed.body.sessionId, s.sessionId);
  assert.notEqual(renewed.body.sessionToken, s.sessionToken);
  assert.equal(f.engine.agents.get("agent-1").reservation, oldReservation);
  const bad = await f.session("telnyx", renewed.body.sessionToken, "POST");
  assert.equal(bad.response.status, 403);
  const old = await fetch(f.base + "/v1/communications/events", { headers: { Authorization: "Bearer " + s.sessionToken, Origin: ORIGIN } });
  assert.equal(old.status, 401);
});
test("session expiry and revoked/forged authorization never run an agent command", async (t) => {
  const f = await fixture(t);
  const s = (await f.session()).body;
  f.setTime(NOW + 601000);
  const response = await fetch(f.base + "/v1/communications/commands", { method: "POST",
    headers: { Authorization: "Bearer " + s.sessionToken, Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ commandId: randomUUID(), expectedRevision: 1, type: "connect", payload: {} }) });
  assert.equal(response.status, 401);
  assert.equal(f.providers.operations.length, 0);
});
test("Twilio fixed external URL ignores spoofed Host/Forwarded headers and rejects wrong signatures", async (t) => {
  const f = await fixture(t, { enabled: false });
  const response = await f.twilioHook("/webhooks/twilio/inbound", twilioForm(), { "X-Forwarded-Host": "evil.example.invalid", "X-Forwarded-Proto": "http" });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<Reject/);
  const bad = await f.twilioHook("/webhooks/twilio/inbound", twilioForm(2), { "X-Twilio-Signature": "invalid" });
  assert.equal(bad.status, 403);
  assert.equal(f.providers.operations.length, 0);
});
test("bounded raw body and media types are enforced before webhook processing", async (t) => {
  const f = await fixture(t);
  const response = await fetch(f.base + "/webhooks/telnyx", { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(65537) });
  assert.equal(response.status, 413);
  assert.equal((await fetch(f.base + "/webhooks/twilio/inbound", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 415);
  assert.equal(f.engine.calls.size, 0);
});
test("Telnyx signatures/timestamp and application scope are validated, not browser assertions", async (t) => {
  const f = await fixture(t, { enabled: false });
  assert.equal((await f.telnyxHook(telnyxEvent("call.initiated"), -301000)).status, 403);
  assert.equal((await f.telnyxHook(telnyxEvent("call.initiated", 1, { connection_id: "foreign-app" }))).status, 403);
  assert.equal((await f.telnyxHook(telnyxEvent("call.initiated"))).status, 200);
  await f.engine.idle();
  assert.equal(f.providers.operations.length, 0);
});
test("commands return the same scope/snapshot envelope as authenticated fetch SSE", async (t) => {
  const f = await fixture(t);
  const s = (await f.session()).body;
  const answer = await f.command(s, "connect");
  const abort = new AbortController();
  const response = await fetch(f.base + "/v1/communications/events", {
    headers: { Authorization: "Bearer " + s.sessionToken, Origin: ORIGIN }, signal: abort.signal,
  });
  assert.equal(response.status, 200);
  const reader = response.body.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  const envelope = JSON.parse(first.match(/^data: (.*)$/m)[1]);
  assert.equal(envelope.type, "snapshot");
  assert.deepEqual(envelope.scope, answer.body.scope);
  assert.deepEqual(envelope.snapshot, answer.body.snapshot);
  assert.equal(envelope.revision, answer.body.revision);
  abort.abort();
});
test("stale revisions return a current envelope; unexpected command fields never reach transports", async (t) => {
  const f = await fixture(t);
  const s = (await f.session()).body;
  const stale = await f.command(s, "connect", {}, undefined, { expectedRevision: 0 });
  assert.equal(stale.response.status, 409);
  assert.equal(stale.body.error.code, "stale-revision");
  assert.equal(stale.body.type, "snapshot");
  const bad = await f.command(s, "connect", {}, undefined, { connectionId: "foreign" });
  assert.equal(bad.response.status, 400);
  assert.equal(f.providers.operations.length, 0);
});
test("HTTP fixture Twilio completes an independent parent/child browser lifecycle", async (t) => {
  const f = await fixture(t);
  const s = (await f.session()).body;
  await f.command(s, "connect"); await f.command(s, "presence", { presence: "available" });
  const inbound = await f.twilioHook("/webhooks/twilio/inbound", twilioForm());
  const xml = await inbound.text();
  assert.match(xml, /<Client/);
  const call = f.engine.calls.get(f.engine.agents.get("agent-1").reservation);
  const query = "?call=" + call.id + "&reservation=" + call.reservationId;
  assert.equal((await f.command(s, "accept", {}, call.id)).response.status, 200);
  await f.twilioHook("/webhooks/twilio/client-status" + query, twilioForm(10, { ParentCallSid: sid(1), CallStatus: "in-progress" }));
  assert.equal(f.engine.envelope(f.auth.get("Bearer " + s.sessionToken, ORIGIN)).snapshot.activeCall.status, "active");
  const duplicate = await f.twilioHook("/webhooks/twilio/inbound", twilioForm());
  assert.equal(await duplicate.text(), xml);
  assert.equal(call.approval.browserLegsUsed, 1);
  await f.twilioHook("/webhooks/twilio/dial-action" + query, twilioForm(1, { DialCallSid: sid(10), DialCallStatus: "completed", DialBridged: "true" }));
  assert.equal(call.phase, "ending");
  await f.twilioHook("/webhooks/twilio/status", twilioForm(1, { CallStatus: "completed" }));
  assert.equal(call.phase, "ended");
  assert.equal(f.engine.agents.get("agent-1").reservation, null);
});
test("HTTP fixture Telnyx queues and bridges separately, including duplicate event handling", async (t) => {
  const f = await fixture(t);
  const s = (await f.session("telnyx")).body;
  await f.command(s, "connect"); await f.command(s, "presence", { presence: "available" });
  const first = telnyxEvent("call.initiated");
  assert.equal((await f.telnyxHook(first)).status, 200);
  await f.engine.idle();
  assert.equal((await f.telnyxHook({ ...first, meta: { attempt: 2 } })).status, 200);
  await f.telnyxHook(telnyxEvent("call.answered")); await f.engine.idle();
  const call = f.engine.calls.get(f.engine.agents.get("agent-1").reservation);
  assert.equal(call.approval.browserLegsUsed, 1);
  await f.command(s, "accept", {}, call.id);
  await f.telnyxHook(telnyxEvent("call.answered", 1, { call_control_id: call.browserCallId }));
  assert.notEqual(call.phase, "connected");
  await f.telnyxHook(telnyxEvent("call.bridged", 1, { call_control_id: call.browserCallId }));
  assert.equal(call.phase, "connected");
  await f.command(s, "hangup", {}, call.id);
  assert.equal(call.phase, "ending");
  await f.telnyxHook(telnyxEvent("call.hangup", 1, { call_control_id: call.browserCallId }));
  await f.telnyxHook(telnyxEvent("call.hangup"));
  assert.equal(call.phase, "ended");
  assert.equal(f.providers.operations.filter((x) => x.action === "offer").length, 1);
});
