// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import twilio from "twilio";
import { verifyTwilioWebhook, verifyTelnyxWebhook, parseForm, SessionAuth } from "../lib/security.js";
import { createProviders, twilioXml } from "../lib/providers.js";
import { fixtureConfig, fixtureEngine, ACCOUNT, NOW, ORIGIN, BOOTSTRAP, twilioForm, sid } from "./fixtures.js";

test("Twilio official helper authenticates fixed external URL and every decoded form parameter", () => {
  const url = "https://backend.example.invalid/webhooks/twilio/inbound?hello=%2B1";
  const raw = Buffer.from(new URLSearchParams({ ...twilioForm(), FutureParameter: "hello + world" }).toString());
  const token = "fixture-auth-token-not-a-real-account";
  const signature = twilio.getExpectedTwilioSignature(token, url, parseForm(raw));
  assert.equal(verifyTwilioWebhook(raw, signature, url, token).FutureParameter, "hello + world");
  assert.throws(() => verifyTwilioWebhook(raw, signature, url.replace("https:", "http:"), token), /invalid-webhook-signature/);
  assert.throws(() => verifyTwilioWebhook(Buffer.concat([raw, Buffer.from("&extra=1")]), signature, url, token), /invalid-webhook-signature/);
});
test("Twilio signature validation retains duplicate-valued future parameters", () => {
  const raw = Buffer.from("CallSid=" + sid(1) + "&Future=x&Future=y");
  const url = "https://backend.example.invalid/webhooks/twilio/status";
  const signature = twilio.getExpectedTwilioSignature("fixture", url, parseForm(raw));
  assert.deepEqual(verifyTwilioWebhook(raw, signature, url, "fixture").Future, ["x", "y"]);
});
test("Telnyx verifies Ed25519 timestamp|EXACT raw Unicode body before JSON parsing", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const key = publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("base64");
  const raw = Buffer.from('{ "data": {"message":"hola 🧪"} }');
  const timestamp = String(NOW / 1000);
  const signature = sign(null, Buffer.concat([Buffer.from(timestamp + "|"), raw]), privateKey).toString("base64");
  assert.equal(verifyTelnyxWebhook(raw, signature, timestamp, key, NOW), raw.toString());
  assert.throws(() => verifyTelnyxWebhook(Buffer.from(JSON.stringify(JSON.parse(raw))), signature, timestamp, key, NOW), /invalid-webhook-signature/);
  assert.throws(() => verifyTelnyxWebhook(raw, signature, timestamp, key, NOW + 301000), /stale-webhook-timestamp/);
  assert.throws(() => verifyTelnyxWebhook(raw, signature, timestamp, key, NOW - 301000), /stale-webhook-timestamp/);
  assert.throws(() => verifyTelnyxWebhook(raw, signature, "1e12", key, NOW), /invalid-webhook-timestamp/);
});
test("backend sessions are short, origin-bound, server-scoped and rotated on renewal", () => {
  let now = NOW;
  const config = fixtureConfig();
  const auth = new SessionAuth(config, () => now);
  const principal = auth.bootstrap("Bearer " + BOOTSTRAP, ORIGIN);
  const first = auth.issue(principal, "twilio", ORIGIN);
  assert.equal(auth.get("Bearer " + first.token, ORIGIN).principal.id, "agent-1");
  const next = auth.issue(principal, "twilio", ORIGIN, first.session);
  assert.equal(next.session.id, first.session.id);
  assert.throws(() => auth.get("Bearer " + first.token, ORIGIN), /session-expired/);
  assert.throws(() => auth.get("Bearer " + next.token, "https://evil.example.invalid"), /origin-denied/);
  now += 601000;
  assert.throws(() => auth.get("Bearer " + next.token, ORIGIN), /session-expired/);
});
test("real Twilio SDK mints incoming-only five-minute VoiceGrant without any carrier request", async () => {
  const config = fixtureConfig();
  const providers = createProviders(config, {
    TWILIO_ACCOUNT_SID: ACCOUNT, TWILIO_API_KEY_SID: "SK" + "b".repeat(32), TWILIO_API_KEY_SECRET: "fixture-secret",
  }, { now: () => NOW, fetch: () => assert.fail("network forbidden") });
  const result = await providers.twilio.token(config.agents[0]);
  const jwt = JSON.parse(Buffer.from(result.token.split(".")[1], "base64url"));
  assert.equal(jwt.grants.identity, "fixture_1");
  assert.equal(jwt.grants.voice.incoming.allow, true);
  assert.equal(jwt.grants.voice.outgoing, undefined);
  assert.equal(jwt.exp - jwt.iat, 300);
  assert.equal(result.kind, "twilio-access-token");
});
test("Twilio XML never exposes arbitrary destinations, recording or provider queues", () => {
  const { config, engine } = fixtureEngine();
  const call = engine.admit("twilio", sid(1), "+12025550103", config.providers.twilio.inboundNumber);
  call.reservationId = "fixture-reservation";
  const xml = twilioXml("offer", config, call, config.agents[0]);
  assert.match(xml, /record="do-not-record"/);
  assert.match(xml, /statusCallbackEvent="initiated ringing answered completed"/);
  assert.match(xml, /https:\/\/backend.example.invalid\/webhooks\/twilio\/client-status/);
  assert.doesNotMatch(xml, /<Number|<Conference|<Queue|<Record/);
});

function tokenFixture({
  expiry = NOW + 250000, resource = "connection:fixture-connection",
  username = "gencred_fixture_1", outbound = null, exp = expiry, expired = false,
  connection = { id: "fixture-connection", outbound: { outbound_voice_profile_id: outbound } },
} = {}) {
  const config = fixtureConfig(), calls = [];
  const fakeJwt = [
    Buffer.from('{"alg":"RS256"}').toString("base64url"),
    Buffer.from(JSON.stringify({ exp: Math.floor(exp / 1000) })).toString("base64url"), "fixture-signature",
  ].join(".");
  const http = async (url, options) => {
    calls.push({ url, ...options });
    if (url.includes("/credential_connections/")) return Response.json({ data: connection });
    if (url.endsWith("/token")) return new Response(fakeJwt, { headers: { "Content-Type": "text/plain" } });
    return Response.json({ data: { id: "fixture-credential-1", resource_id: resource, sip_username: username,
      expires_at: new Date(expiry).toISOString(), expired, sip_password: "NEVER_RETURN_THIS" } });
  };
  return { config, calls, providers: createProviders(config, { TELNYX_API_KEY: "fixture-server-secret" }, { fetch: http, now: () => NOW }) };
}
test("Telnyx actual HTTP token flow checks outbound policy, parent identity/expiry and text JWT", async () => {
  const { config, providers, calls } = tokenFixture();
  const value = await providers.telnyx.token(config.agents[0]);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[1].method, "GET");
  assert.equal(calls[2].method, "POST");
  assert.match(calls[2].url, /\/v2\/telephony_credentials\/fixture-credential-1\/token$/);
  assert.equal(calls[2].headers.Accept, "text/plain");
  assert.equal(value.kind, "telnyx-login-token");
  assert.ok(Date.parse(value.expiresAt) - NOW <= 300000);
  assert.doesNotMatch(JSON.stringify(value), /NEVER_RETURN_THIS|fixture-server-secret/);
});
test("Telnyx rejects 24-hour/no-expiry/expired/wrong-SIP/wrong-connection credentials before minting", async () => {
  for (const options of [
    { expiry: NOW + 86400000 }, { expiry: NOW - 1000 }, { expired: true },
    { username: "gencred_other" }, { resource: "connection:other" },
  ]) {
    const { config, providers, calls } = tokenFixture(options);
    await assert.rejects(providers.telnyx.token(config.agents[0]), /short-lived-credential-required/);
    assert.ok(calls.every((c) => !c.url.endsWith("/token")));
  }
});
test("Telnyx rejects a JWT whose actual expiration exceeds the verified parent", async () => {
  const { config, providers } = tokenFixture({ exp: NOW + 86400000 });
  await assert.rejects(providers.telnyx.token(config.agents[0]), /provider-token-ttl-unbounded/);
});
test("Telnyx token issuer fails closed on configured or observed browser outbound policy", async () => {
  for (const flag of [false, undefined, "true", "false", 1]) {
    const first = tokenFixture();
    first.config.providers.telnyx.browserOutboundDisabledVerified = flag;
    await assert.rejects(first.providers.telnyx.token(first.config.agents[0]), /sip-outbound-policy-unverified/);
    assert.equal(first.calls.length, 0);
  }
  const second = tokenFixture({ outbound: "outbound-profile" });
  await assert.rejects(second.providers.telnyx.token(second.config.agents[0]), /sip-outbound-policy-denied/);
  assert.equal(second.calls.length, 1);
});
test("Telnyx ambiguous or missing outbound policy cannot authorize a browser JWT", async () => {
  for (const outbound of [undefined, null, [], {}, { outbound_voice_profile_id: "" },
    { outbound_voice_profile_id: false }, { outbound_voice_profile_id: 0 }]) {
    const { config, providers, calls } = tokenFixture({ connection: { id: "fixture-connection", outbound } });
    await assert.rejects(providers.telnyx.token(config.agents[0]), /sip-outbound-policy-unverified/);
    assert.equal(calls.length, 1);
    assert.ok(calls.every((c) => !c.url.includes("/telephony_credentials/")));
  }
});
test("actual Telnyx offer payload is fixed SIP-only, links actual PSTN, and disables extra features", async () => {
  const { config, engine } = fixtureEngine();
  const calls = [];
  const providers = createProviders(config, { TELNYX_API_KEY: "fixture-api" }, {
    fetch: async (url, options) => {
      calls.push({ url, options });
      return Response.json({ data: { call_control_id: "cc-browser", call_leg_id: "leg-browser", call_session_id: "session-browser", is_alive: false } });
    },
    now: () => NOW,
  });
  const call = engine.admit("telnyx", "fixture-pstn-1", "+12025550103", config.providers.telnyx.inboundNumber);
  call.reservationId = "reservation-fixture";
  const commandId = "12345678-1234-4234-8234-123456789012";
  const ids = await providers.telnyx.offer(call, config.agents[0], commandId);
  const body = JSON.parse(calls[0].options.body);
  assert.equal(calls[0].url, "https://api.telnyx.com/v2/calls");
  assert.equal(body.to, "sip:gencred_fixture_1@sip.telnyx.com");
  assert.equal(body.link_to, "fixture-pstn-1");
  assert.equal(body.bridge_on_answer, true);
  assert.equal(body.prevent_double_bridge, true);
  assert.equal(body.record, undefined); assert.equal(body.stream_url, undefined); assert.equal(body.assistant, undefined);
  assert.equal(body.command_id, commandId);
  assert.equal(ids.browserCallId, "cc-browser");
  assert.equal(ids.browserCallLegId, "leg-browser");
  assert.equal(body.webhook_url, "https://backend.example.invalid/webhooks/telnyx");
  assert.equal(JSON.parse(Buffer.from(body.client_state, "base64")).callId, call.id);
});
test("disabled real transports block both call-control carriers before network", async () => {
  const config = fixtureConfig({ enabled: false });
  const providers = createProviders(config, { TELNYX_API_KEY: "fixture" }, { fetch: () => assert.fail("network forbidden") });
  await assert.rejects(providers.telnyx.answer({ pstnCallId: "x" }, "uuid"), /carrier-operations-disabled/);
  await assert.rejects(providers.twilio.hangup(sid(1)), /carrier-operations-disabled/);
});
test("Twilio SDK transport cancels ringing legs and completes active legs after inspecting status", async () => {
  const actions = [];
  const providers = createProviders(fixtureConfig(), {}, {
    fetch: () => assert.fail("HTTP carrier request forbidden"),
    twilioClient: { calls: (id) => ({
      async fetch() { actions.push({ action: "fetch", id }); return { status: id === sid(10) ? "ringing" : "in-progress" }; },
      async update(body) { actions.push({ action: "update", id, body }); },
    }) },
  });
  await providers.twilio.hangup(sid(1));
  await providers.twilio.hangup(sid(10));
  assert.equal(actions[1].body.status, "completed");
  assert.equal(actions[3].body.status, "canceled");
});
