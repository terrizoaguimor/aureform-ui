// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { createSetupProviderOperations, SetupProviderError } from "../lib/setup-providers.js";

// Explicitly synthetic credentials and injected HTTP: no carrier or account IO.
const ACCOUNT = "AC" + "1".repeat(32);
const NUMBER = "PN" + "2".repeat(32);
const NUMBER2 = "PN" + "3".repeat(32);
const KEY = "SK" + "4".repeat(32);
const AUTH = "a".repeat(32);
const KEY_SECRET = "unit-test-key-secret-never-a-real-key";
const TW = { provider: "twilio", accountSid: ACCOUNT, authToken: AUTH };
const TE = { provider: "telnyx", apiKey: "KEY_UNIT_TEST_ONLY_NOT_REAL",
  publicKey: Buffer.alloc(32, 7).toString("base64") };
const BASE = "https://voice.example.test";
const CONNECTION = "fixture-owner-connection";
const TEL_NUMBER = "1555555555555555501";
const APP = "7001000000000000001";
const SIP = "7001000000000000002";
const NOW = Date.parse("2026-10-21T18:00:00.000Z");
const clone = (value) => structuredClone(value);
const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "Content-Type": "application/json" },
});
const journal = () => {
  const entries = [];
  return { entries, checkpoint: async (stage, data) => entries.push({ stage, ...clone(data) }),
    last: () => entries.at(-1)?.privateState };
};
function errorIs(code, unknown = false) {
  return (error) => {
    assert.ok(error instanceof SetupProviderError);
    assert.equal(error.code, code);
    assert.equal(error.unknown, unknown);
    assert.equal(error.retryable, false);
    const serialized = error.stack + JSON.stringify(error);
    for (const secret of [AUTH, KEY_SECRET, TE.apiKey]) assert.equal(serialized.includes(secret), false);
    assert.equal(Object.hasOwn(error, "cause"), false);
    return true;
  };
}
const isWrite = ({ method, path }) => method !== "GET" && path !== "/v2/numbers_features";
function operations(fixture) {
  return createSetupProviderOperations({ fetch: fixture.fetch, publicBaseUrl: BASE, now: () => NOW,
    wait: async () => {} });
}

function twFixture() {
  const fixture = {
    requests: [], keys: new Map(), intercept: null, onCreateKey: null, onUpdateNumber: null,
    accountStatus: "active", accountType: "Full", primaryAuthToken: AUTH,
    accountName: "Fixture account", pages: null, inboundRegion: "us1",
    number: {
      sid: NUMBER, account_sid: ACCOUNT, phone_number: "+12025550101", friendly_name: "Owned voice number",
      capabilities: { voice: true, sms: true, mms: true },
      voice_url: "https://previous.example.test/voice", voice_method: "GET",
      voice_application_sid: "AP" + "5".repeat(32), trunk_sid: null,
      voice_fallback_url: "https://previous.example.test/fallback", voice_fallback_method: "GET",
      voice_receive_mode: "voice", voice_caller_id_lookup: false, status: "in-use",
      status_callback: "https://previous.example.test/status", status_callback_method: "GET",
      sms_application_sid: "AP" + "6".repeat(32), sms_url: "https://messaging.example.test/sms",
      sms_method: "POST", sms_fallback_url: "https://messaging.example.test/fallback", sms_fallback_method: "GET",
    },
  };
  fixture.fetch = async (input, init) => {
    const url = new URL(input);
    assert.ok(["https://api.twilio.com", "https://routes.twilio.com"].includes(url.origin));
    assert.equal(init.redirect, "error");
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.headers.Authorization, "Basic " + Buffer.from(ACCOUNT + ":" + AUTH).toString("base64"));
    const req = { method: init.method, path: url.pathname, query: url.searchParams,
      body: init.body ? Object.fromEntries(new URLSearchParams(init.body)) : null };
    fixture.requests.push(req);
    const intercepted = await fixture.intercept?.(req);
    if (intercepted) return intercepted;
    if (url.origin === "https://routes.twilio.com") {
      assert.equal(req.method, "GET");
      assert.equal(decodeURIComponent(req.path), "/v2/PhoneNumbers/" + fixture.number.phone_number);
      return json({ phone_number: fixture.number.phone_number, account_sid: ACCOUNT, voice_region: fixture.inboundRegion });
    }
    const root = "/2010-04-01/Accounts/" + ACCOUNT;
    if (req.method === "GET" && req.path === root + ".json") {
      return json({ sid: ACCOUNT, status: fixture.accountStatus, type: fixture.accountType,
        friendly_name: fixture.accountName, auth_token: fixture.primaryAuthToken });
    }
    if (req.method === "GET" && req.path === root + "/IncomingPhoneNumbers.json") {
      if (fixture.pages) return json(fixture.pages[Number(url.searchParams.get("Page") ?? 0)]);
      return json({ incoming_phone_numbers: [fixture.number], next_page_uri: null });
    }
    if (req.path === root + "/IncomingPhoneNumbers/" + NUMBER + ".json") {
      if (req.method === "GET") return json(fixture.number);
      if (req.method === "POST") {
        assert.deepEqual(Object.keys(req.body).sort(), ["StatusCallback", "StatusCallbackMethod",
          "VoiceApplicationSid", "VoiceFallbackUrl", "VoiceMethod", "VoiceUrl"]);
        assert.equal(req.body.VoiceUrl, BASE + "/webhooks/twilio/inbound");
        assert.equal(req.body.StatusCallback, BASE + "/webhooks/twilio/status");
        assert.equal(req.body.VoiceMethod, "POST");
        assert.equal(req.body.StatusCallbackMethod, "POST");
        assert.equal(req.body.VoiceApplicationSid, "");
        assert.equal(req.body.VoiceFallbackUrl, "");
        Object.assign(fixture.number, { voice_url: req.body.VoiceUrl, voice_method: req.body.VoiceMethod,
          voice_application_sid: "", voice_fallback_url: "", status_callback: req.body.StatusCallback,
          status_callback_method: req.body.StatusCallbackMethod });
        fixture.onUpdateNumber?.();
        return json(fixture.number);
      }
    }
    if (req.method === "POST" && req.path === root + "/Keys.json") {
      assert.deepEqual(Object.keys(req.body), ["FriendlyName"]);
      assert.equal(req.body.FriendlyName, "aureform:" + CONNECTION + ":key");
      const key = { sid: KEY, friendly_name: req.body.FriendlyName };
      fixture.keys.set(KEY, key);
      fixture.onCreateKey?.();
      return json({ ...key, secret: KEY_SECRET }, 201);
    }
    if (req.method === "GET" && req.path === root + "/Keys/" + KEY + ".json") {
      return fixture.keys.has(KEY) ? json(fixture.keys.get(KEY)) : json({ message: "missing" }, 404);
    }
    assert.fail("Unexpected fixture route " + req.method + " " + req.path);
  };
  return fixture;
}
function telFixture() {
  const fixture = {
    requests: [], apps: new Map(), connections: new Map(), credentials: new Map(), intercept: null, pages: null,
    features: ["voice", "sms"], onCreateApp: null, onUpdateNumber: null,
    tokenSecondsExtra: 0,
    outbound: { outbound_voice_profile_id: null, call_parking_enabled: false },
    number: { id: TEL_NUMBER, phone_number: "+12025550102", status: "active",
      customer_reference: "Owned Telnyx number", connection_id: "6001000000000000001",
      messaging_profile_id: "fixture-messaging-profile", call_forwarding_enabled: false, call_recording_enabled: false },
    voice: { id: TEL_NUMBER, record_type: "voice_settings", connection_id: "6001000000000000001",
      translated_number: null, tech_prefix_enabled: false,
      call_forwarding: { call_forwarding_enabled: false, forwards_to: null, forwarding_type: "always" },
      call_recording: { inbound_call_recording_enabled: false, inbound_call_recording_format: "wav",
        inbound_call_recording_channels: "single" }, inbound_call_screening: "disabled" },
  };
  fixture.fetch = async (input, init) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://api.telnyx.com");
    assert.equal(init.redirect, "error");
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.headers.Authorization, "Bearer " + TE.apiKey);
    const req = { method: init.method, path: url.pathname, query: url.searchParams,
      body: init.body ? JSON.parse(init.body) : null };
    fixture.requests.push(req);
    const intercepted = await fixture.intercept?.(req);
    if (intercepted) return intercepted;
    if (req.method === "GET" && req.path === "/v2/phone_numbers") {
      assert.equal(url.searchParams.get("page[size]"), "100");
      if (fixture.pages) return json(fixture.pages[Number(url.searchParams.get("page[number]")) - 1]);
      return json({ data: [fixture.number], meta: { total_pages: 1, page_number: 1, page_size: 100, total_results: 1 } });
    }
    if (req.method === "POST" && req.path === "/v2/numbers_features") {
      assert.deepEqual(Object.keys(req.body), ["phone_numbers"]);
      return json({ data: req.body.phone_numbers.map((phone_number) => ({ phone_number, features: fixture.features })) });
    }
    if (req.method === "GET" && req.path === "/v2/phone_numbers/" + TEL_NUMBER + "/voice") {
      return json({ data: fixture.voice });
    }
    if (req.path === "/v2/phone_numbers/" + TEL_NUMBER) {
      if (req.method === "GET") return json({ data: fixture.number });
      if (req.method === "PATCH") {
        assert.deepEqual(req.body, { connection_id: APP });
        fixture.number.connection_id = APP;
        fixture.voice.connection_id = APP;
        fixture.onUpdateNumber?.();
        return json({ data: fixture.number });
      }
    }
    if (req.method === "POST" && req.path === "/v2/call_control_applications") {
      assert.deepEqual(req.body, { application_name: "aureform:" + CONNECTION + ":call-control",
        webhook_event_url: BASE + "/webhooks/telnyx", webhook_api_version: "2", active: true });
      fixture.apps.set(APP, { id: APP, ...req.body, webhook_event_failover_url: "" });
      fixture.onCreateApp?.();
      return json({ data: fixture.apps.get(APP) }, 201);
    }
    if (req.method === "GET" && req.path === "/v2/call_control_applications/" + APP) {
      return fixture.apps.has(APP) ? json({ data: fixture.apps.get(APP) }) : json({ errors: [] }, 404);
    }
    if (req.method === "POST" && req.path === "/v2/credential_connections") {
      assert.deepEqual(Object.keys(req.body).sort(), ["active", "connection_name", "password",
        "sip_uri_calling_preference", "user_name", "webhook_api_version"]);
      assert.equal(req.body.connection_name, "aureform:" + CONNECTION + ":browser");
      assert.match(req.body.user_name, /^[A-Za-z0-9]{4,32}$/);
      assert.ok(req.body.password.length >= 8 && req.body.password.length <= 128);
      assert.equal(req.body.sip_uri_calling_preference, "internal");
      assert.equal(req.body.active, true);
      assert.equal(req.body.webhook_api_version, "2");
      fixture.connections.set(SIP, { id: SIP, ...req.body, outbound: fixture.outbound });
      return json({ data: fixture.connections.get(SIP) }, 201);
    }
    if (req.method === "GET" && req.path === "/v2/credential_connections/" + SIP) {
      return fixture.connections.has(SIP) ? json({ data: { ...fixture.connections.get(SIP), password: "[masked]" } })
        : json({ errors: [] }, 404);
    }
    if (req.method === "POST" && req.path === "/v2/telephony_credentials") {
      assert.deepEqual(Object.keys(req.body).sort(), ["connection_id", "expires_at", "name"]);
      assert.equal(req.body.connection_id, SIP);
      assert.ok(req.body.name.startsWith("aureform:" + CONNECTION + ":device:"));
      const id = "credential-" + (fixture.credentials.size + 1);
      const credential = { id, resource_id: "connection:" + SIP, name: req.body.name,
        sip_username: "gencredFixture" + (fixture.credentials.size + 1), sip_password: "private-sip-password-fixture",
        expires_at: req.body.expires_at, expired: false };
      fixture.credentials.set(id, credential);
      return json({ data: credential }, 201);
    }
    const match = req.path.match(/^\/v2\/telephony_credentials\/(credential-\d+)(\/token)?$/);
    if (match && fixture.credentials.has(match[1])) {
      const credential = fixture.credentials.get(match[1]);
      if (req.method === "GET" && !match[2]) return json({ data: credential });
      if (req.method === "POST" && match[2]) {
        assert.equal(init.headers.Accept, "text/plain");
        assert.equal(init.body, undefined);
        const token = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url") + "." +
          Buffer.from(JSON.stringify({ exp: Math.floor(Date.parse(credential.expires_at) / 1000) + fixture.tokenSecondsExtra }))
            .toString("base64url") + ".unitTestSignature";
        return new Response(token, { status: 201, headers: { "Content-Type": "text/plain" } });
      }
    }
    assert.fail("Unexpected fixture route " + req.method + " " + req.path);
  };
  return fixture;
}
async function prepareTw(fixture = twFixture()) {
  const ops = operations(fixture);
  return { fixture, ops, plan: await ops.twilio.plan(TW, NUMBER), journal: journal() };
}
async function prepareTel(fixture = telFixture()) {
  const ops = operations(fixture);
  return { fixture, ops, plan: await ops.telnyx.plan(TE, TEL_NUMBER), journal: journal() };
}
const applyTw = (ctx, extra = {}) => ctx.ops.twilio.apply({ connectionId: CONNECTION, credentials: TW,
  plan: ctx.plan, checkpoint: ctx.journal.checkpoint, ...extra });
const applyTel = (ctx, extra = {}) => ctx.ops.telnyx.apply({ connectionId: CONNECTION, credentials: TE,
  plan: ctx.plan, checkpoint: ctx.journal.checkpoint, ...extra });

test("inspect Twilio authenticates account, paginates owned numbers, strips account secret", async () => {
  const fixture = twFixture();
  const second = { ...fixture.number, sid: NUMBER2, phone_number: "+12025550103", voice_url: "" };
  fixture.pages = [
    { incoming_phone_numbers: [fixture.number], next_page_uri: "/2010-04-01/Accounts/" + ACCOUNT + "/IncomingPhoneNumbers.json?Page=1&PageSize=100" },
    { incoming_phone_numbers: [second], next_page_uri: null },
  ];
  const inspected = await operations(fixture).twilio.inspect(TW);
  assert.equal(inspected.accountLabel, "Fixture account");
  assert.deepEqual(inspected.numbers.map((number) => number.id), [NUMBER, NUMBER2]);
  assert.equal(inspected.numbers[0].voiceEnabled, true);
  assert.equal(inspected.numbers[0].hasExistingRouting, true);
  assert.equal(JSON.stringify(inspected).includes(AUTH), false);
  assert.equal(fixture.requests.filter(isWrite).length, 0);
});

test("Twilio rejects foreign or repeating pagination without sending Basic auth to another host", async () => {
  for (const next of ["https://untrusted.example.test/list", "/2010-04-01/Accounts/AC" + "9".repeat(32) + "/IncomingPhoneNumbers.json",
    "/2010-04-01/Accounts/" + ACCOUNT + "/IncomingPhoneNumbers.json?PageSize=100"]) {
    const fixture = twFixture();
    fixture.pages = [{ incoming_phone_numbers: [fixture.number], next_page_uri: next }];
    await assert.rejects(operations(fixture).twilio.inspect(TW), errorIs("provider-pagination-invalid"));
    assert.equal(fixture.requests.length, 2);
  }
});

test("Telnyx inspect uses real number features and independent paginated number inventory", async () => {
  const fixture = telFixture();
  fixture.pages = [
    { data: [fixture.number], meta: { page_number: 1, total_pages: 2 } },
    { data: [{ ...fixture.number, id: "1555555555555555502", phone_number: "+12025550103", connection_id: null }],
      meta: { page_number: 2, total_pages: 2 } },
  ];
  const result = await operations(fixture).telnyx.inspect(TE);
  assert.equal(result.accountLabel, "Telnyx (API-key scope)");
  assert.deepEqual(result.numbers.map((number) => number.phoneNumber), ["+12025550102", "+12025550103"]);
  assert.equal(result.numbers[0].hasExistingRouting, true);
  assert.equal(result.numbers[1].hasExistingRouting, false);
  assert.equal(result.numbers.every((number) => number.voiceEnabled), true);
  assert.equal(fixture.requests.filter(isWrite).length, 0);
  assert.equal(fixture.requests.filter((req) => req.path === "/v2/numbers_features").length, 1);
});

test("Telnyx rejects missing feature proof and invalid pagination rather than assuming voice", async () => {
  const missing = telFixture();
  missing.intercept = (req) => req.path === "/v2/numbers_features" ? json({ data: [] }) : null;
  await assert.rejects(operations(missing).telnyx.inspect(TE), errorIs("provider-features-unverified"));
  const pages = telFixture();
  pages.pages = [{ data: [pages.number], meta: { page_number: 2, total_pages: 2 } }];
  await assert.rejects(operations(pages).telnyx.inspect(TE), errorIs("provider-pagination-invalid"));
});

test("invalid credential shapes, public key and callback origins fail before any HTTP", async () => {
  let requests = 0;
  const fetch = async () => { requests++; assert.fail("No HTTP allowed"); };
  const ops = createSetupProviderOperations({ fetch, publicBaseUrl: BASE });
  for (const credentials of [{ ...TW, authToken: "invalid" }, { ...TW, from: "+12025550199" },
    { ...TW, provider: "telnyx" }, { ...TW, accountSid: [ACCOUNT] }, { ...TW, authToken: [AUTH] }]) {
    await assert.rejects(ops.twilio.inspect(credentials), errorIs("invalid-setup-credentials"));
  }
  await assert.rejects(ops.telnyx.inspect({ ...TE, apiKey: "key\ninjection" }), errorIs("invalid-setup-credentials"));
  await assert.rejects(ops.telnyx.inspect({ ...TE, publicKey: "invalid" }), errorIs("invalid-setup-public-key"));
  for (const origin of ["http://voice.example.test", BASE + "/path", BASE + "?to=other",
    "https://user:test@voice.example.test", "https://localhost"]) {
    assert.throws(() => createSetupProviderOperations({ fetch, publicBaseUrl: origin }), errorIs("invalid-setup-public-url"));
  }
  assert.equal(requests, 0);
});

test("provider credential failures, policies and inactive accounts have sanitized errors", async () => {
  for (const [provider, make, input] of [["twilio", twFixture, TW], ["telnyx", telFixture, TE]]) {
    for (const [status, code] of [[401, "provider-credentials-rejected"], [403, "provider-policy-denied"]]) {
      const fixture = make();
      fixture.intercept = () => json({ message: [AUTH, KEY_SECRET, TE.apiKey].join(" ") }, status);
      await assert.rejects(operations(fixture)[provider].inspect(input), errorIs(code));
      assert.equal(fixture.requests.filter(isWrite).length, 0);
    }
  }
  const fixture = twFixture();
  fixture.accountStatus = "suspended";
  await assert.rejects(operations(fixture).twilio.inspect(TW), errorIs("provider-account-inactive"));
});

function accountErrorIs(code, status, returnedToken) {
  return (error) => {
    assert.ok(errorIs(code)(error));
    assert.equal(error.status, status);
    const serialized = error.stack + JSON.stringify(error);
    assert.equal(serialized.includes(ACCOUNT), false);
    if (typeof returnedToken === "string" && returnedToken.length >= 8) {
      assert.equal(serialized.includes(returnedToken), false);
    }
    return true;
  };
}
async function rejectsAccountBeforeEffects(phase, mutate, code, status) {
  const ctx = await prepareTw();
  const previousNumber = clone(ctx.fixture.number);
  ctx.fixture.requests.length = 0;
  mutate(ctx.fixture);
  const action = phase === "inspect" ? () => ctx.ops.twilio.inspect(TW)
    : phase === "plan" ? () => ctx.ops.twilio.plan(TW, NUMBER) : () => applyTw(ctx);
  await assert.rejects(action, accountErrorIs(code, status, ctx.fixture.primaryAuthToken));
  assert.equal(ctx.fixture.requests.length, 1, phase + " stops at the Account fetch");
  assert.equal(ctx.fixture.requests[0].method, "GET");
  assert.equal(ctx.fixture.requests[0].path, "/2010-04-01/Accounts/" + ACCOUNT + ".json");
  assert.equal(ctx.fixture.requests.filter(isWrite).length, 0);
  assert.equal(ctx.fixture.keys.size, 0);
  assert.equal(ctx.journal.entries.length, 0);
  assert.deepEqual(ctx.fixture.number, previousNumber);
}
const changedAccountCases = [
  { name: "Trial", mutate: (fixture) => { fixture.accountType = "Trial"; }, code: "provider-policy-denied", status: 403 },
  { name: "different primary", mutate: (fixture) => { fixture.primaryAuthToken = "b".repeat(32); },
    code: "provider-credentials-rejected", status: 401 },
  { name: "missing primary", mutate: (fixture) => { fixture.primaryAuthToken = undefined; },
    code: "provider-credentials-rejected", status: 401 },
];

// Register each guard case separately so the runner reports the actual matrix.
for (const [name, type] of [["Trial", "Trial"], ["missing", undefined], ["null", null],
  ["empty", ""], ["unknown", "unknown"], ["wrong case", "full"], ["object", { value: "Full" }]]) {
  for (const phase of ["inspect", "plan", "apply"]) {
    test("Twilio " + phase + " rejects " + name + " account type before any effects", async () => {
      await rejectsAccountBeforeEffects(phase, (fixture) => { fixture.accountType = type; }, "provider-policy-denied", 403);
    });
  }
}

for (const [name, token] of [["secondary", "b".repeat(32)], ["wrong case", AUTH.toUpperCase()],
  ["missing", undefined], ["null", null], ["empty", ""], ["masked label", "[masked]"],
  ["masked characters", "*".repeat(32)], ["short", "a".repeat(31)], ["long", "a".repeat(33)],
  ["nonhex", "g".repeat(32)], ["array", [AUTH]], ["object", { value: AUTH }]]) {
  for (const phase of ["inspect", "plan", "apply"]) {
    test("Twilio " + phase + " rejects " + name + " primary token before any effects", async () => {
      await rejectsAccountBeforeEffects(phase, (fixture) => { fixture.primaryAuthToken = token; },
        "provider-credentials-rejected", 401);
    });
  }
}

for (const trigger of ["number-read", "checkpoint"]) {
  for (const change of changedAccountCases) {
    test("Twilio pre-key recheck rejects " + change.name + " after " + trigger + " with zero writes", async () => {
      const ctx = await prepareTw();
      const previousNumber = clone(ctx.fixture.number);
      if (trigger === "number-read") {
        ctx.fixture.intercept = (req) => {
          if (req.method === "GET" && req.path.endsWith("/IncomingPhoneNumbers/" + NUMBER + ".json")) {
            change.mutate(ctx.fixture);
          }
          return null;
        };
      }
      const checkpoint = async (stage, data) => {
        await ctx.journal.checkpoint(stage, data);
        if (trigger === "checkpoint" && stage === "before-effect" && data.operation === "create-standard-key") {
          change.mutate(ctx.fixture);
        }
      };
      await assert.rejects(applyTw(ctx, { checkpoint }), (error) =>
        accountErrorIs(change.code, change.status, ctx.fixture.primaryAuthToken)(error));
      assert.equal(ctx.fixture.requests.filter(isWrite).length, 0);
      assert.equal(ctx.fixture.keys.size, 0);
      assert.deepEqual(ctx.fixture.number, previousNumber);
      assert.deepEqual(ctx.journal.entries.map((entry) => entry.stage), ["before-effect", "failed"]);
      assert.equal(ctx.journal.last().pending, null);
      assert.equal(ctx.journal.last().unknown, null);
      assert.equal(ctx.journal.last().resources.apiKey, undefined);
    });
  }
}

for (const trigger of ["key-created", "checkpoint"]) {
  for (const change of changedAccountCases) {
    test("Twilio pre-routing recheck rejects " + change.name + " after " + trigger + " and retains the key", async () => {
      const ctx = await prepareTw();
      const previousNumber = clone(ctx.fixture.number);
      if (trigger === "key-created") ctx.fixture.onCreateKey = () => change.mutate(ctx.fixture);
      const checkpoint = async (stage, data) => {
        await ctx.journal.checkpoint(stage, data);
        if (trigger === "checkpoint" && stage === "before-effect" && data.operation === "update-number-routing") {
          change.mutate(ctx.fixture);
        }
      };
      await assert.rejects(applyTw(ctx, { checkpoint }), (error) =>
        accountErrorIs(change.code, change.status, ctx.fixture.primaryAuthToken)(error));
      assert.deepEqual(ctx.fixture.requests.filter(isWrite).map((req) => req.path.split("/").at(-1)), ["Keys.json"]);
      assert.deepEqual(ctx.fixture.number, previousNumber);
      assert.equal(ctx.journal.last().resources.apiKey.secret, KEY_SECRET);
      assert.equal(ctx.journal.last().routingApplied, false);
      assert.equal(ctx.journal.last().pending, null);
      assert.equal(ctx.journal.last().unknown, null);
      assert.equal(ctx.journal.entries.some((entry) => entry.stage === "verified"), false);
      const writes = ctx.fixture.requests.filter(isWrite).length;
      await assert.rejects(applyTw({ ...ctx, ops: operations(ctx.fixture) }, { existing: ctx.journal.last() }),
        accountErrorIs(change.code, change.status, ctx.fixture.primaryAuthToken));
      assert.equal(ctx.fixture.requests.filter(isWrite).length, writes);
    });
  }
}

for (const change of changedAccountCases) {
  test("Twilio final recheck rejects late " + change.name + " and retains confirmed effects and secrets", async () => {
    const ctx = await prepareTw();
    ctx.fixture.onUpdateNumber = () => change.mutate(ctx.fixture);
    await assert.rejects(applyTw(ctx), (error) =>
      accountErrorIs(change.code, change.status, ctx.fixture.primaryAuthToken)(error));
    assert.deepEqual(ctx.fixture.requests.filter(isWrite).map((req) => req.path.split("/").at(-1)),
      ["Keys.json", NUMBER + ".json"]);
    assert.equal(ctx.journal.last().resources.apiKey.secret, KEY_SECRET);
    assert.equal(ctx.journal.last().resources.numberUpdate.id, NUMBER);
    assert.equal(ctx.journal.last().routingApplied, true);
    assert.equal(ctx.journal.last().pending, null);
    assert.equal(ctx.journal.last().unknown, null);
    assert.equal(ctx.journal.last().verifiedAt, undefined);
    assert.equal(ctx.journal.entries.at(-1).stage, "after-effect");
    const writes = ctx.fixture.requests.filter(isWrite).length;
    await assert.rejects(applyTw({ ...ctx, ops: operations(ctx.fixture) }, { existing: ctx.journal.last() }),
      accountErrorIs(change.code, change.status, ctx.fixture.primaryAuthToken));
    assert.equal(ctx.fixture.requests.filter(isWrite).length, writes);
  });
}

for (const change of changedAccountCases) {
  test("Twilio configured checkpoint resume rejects " + change.name + " before any effects", async () => {
    const ctx = await prepareTw();
    await applyTw(ctx);
    const existing = clone(ctx.journal.last());
    change.mutate(ctx.fixture);
    ctx.fixture.requests.length = 0;
    const checkpoints = ctx.journal.entries.length;
    await assert.rejects(applyTw({ ...ctx, ops: operations(ctx.fixture) }, { existing }),
      accountErrorIs(change.code, change.status, ctx.fixture.primaryAuthToken));
    assert.equal(ctx.fixture.requests.length, 1);
    assert.equal(ctx.fixture.requests.filter(isWrite).length, 0);
    assert.equal(ctx.journal.entries.length, checkpoints);
    assert.equal(existing.resources.apiKey.secret, KEY_SECRET);
    assert.equal(existing.routingApplied, true);
  });
}

test("selected number identity and Twilio account ownership are checked before planning effects", async () => {
  const foreign = twFixture();
  foreign.number.account_sid = "AC" + "9".repeat(32);
  await assert.rejects(operations(foreign).twilio.plan(TW, NUMBER), errorIs("provider-number-response-invalid"));
  assert.equal(foreign.requests.filter(isWrite).length, 0);
  const wrong = telFixture();
  wrong.number.id = "other-number";
  await assert.rejects(operations(wrong).telnyx.plan(TE, TEL_NUMBER), errorIs("provider-number-response-invalid"));
  assert.equal(wrong.requests.filter(isWrite).length, 0);
  const numeric = telFixture();
  numeric.number.id = 123;
  await assert.rejects(operations(numeric).telnyx.inspect(TE), errorIs("provider-number-response-invalid"));
});

test("inspection returns empty/disabled inventory while plan rejects ineligible selected numbers", async () => {
  const twNone = twFixture();
  twNone.pages = [{ incoming_phone_numbers: [], next_page_uri: null }];
  assert.deepEqual(await operations(twNone).twilio.inspect(TW), { accountLabel: "Fixture account", numbers: [] });
  const twNoVoice = twFixture();
  twNoVoice.number.capabilities.voice = false;
  assert.equal((await operations(twNoVoice).twilio.inspect(TW)).numbers[0].voiceEnabled, false);
  await assert.rejects(operations(twNoVoice).twilio.plan(TW, NUMBER), errorIs("number-not-voice-enabled"));
  const telNone = telFixture();
  telNone.pages = [{ data: [], meta: { page_number: 1, total_pages: 0 } }];
  assert.deepEqual(await operations(telNone).telnyx.inspect(TE), { accountLabel: "Telnyx (API-key scope)", numbers: [] });
  const telNoVoice = telFixture();
  telNoVoice.features = ["sms"];
  assert.equal((await operations(telNoVoice).telnyx.inspect(TE)).numbers[0].voiceEnabled, false);
  await assert.rejects(operations(telNoVoice).telnyx.plan(TE, TEL_NUMBER), errorIs("number-not-voice-enabled"));
});

test("Twilio plan explicitly reviews Application precedence/fallback; rejects Trunk and fax modes", async () => {
  const ctx = await prepareTw();
  assert.equal(ctx.plan.willReplaceRouting, true);
  assert.equal(ctx.plan.steps.find((step) => step.id === "application-precedence")?.kind, "update");
  assert.equal(ctx.plan.steps.find((step) => step.id === "voice-fallback")?.kind, "update");
  assert.equal(ctx.plan.priorRouting.messaging.url, ctx.fixture.number.sms_url);
  assert.match(ctx.plan.routingFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(ctx.fixture.requests.filter(isWrite).length, 0);
  const trunk = twFixture();
  trunk.number.trunk_sid = "TK" + "7".repeat(32);
  await assert.rejects(operations(trunk).twilio.plan(TW, NUMBER), errorIs("twilio-trunk-routing-unsupported"));
  const fax = twFixture();
  fax.number.voice_receive_mode = "fax";
  await assert.rejects(operations(fax).twilio.plan(TW, NUMBER), errorIs("twilio-number-voice-mode-required"));
  const status = twFixture();
  status.number.status = "not-in-use";
  await assert.rejects(operations(status).twilio.plan(TW, NUMBER), errorIs("twilio-number-status-unsupported"));
  const region = twFixture();
  region.inboundRegion = "ie1";
  await assert.rejects(operations(region).twilio.plan(TW, NUMBER), errorIs("twilio-processing-region-unsupported"));
  assert.equal(region.requests.filter(isWrite).length, 0);
});

const isRegionGet = (req) => req.method === "GET" && req.path.startsWith("/v2/PhoneNumbers/");
const missingRegionResponse = () => json({ code: 20404, status: 404,
  message: "Synthetic missing routing " + AUTH, more_info: "https://www.twilio.com/docs/api/errors/20404" }, 404);
function implicitRegionFixture() {
  const fixture = twFixture();
  fixture.intercept = (req) => isRegionGet(req) ? missingRegionResponse() : null;
  return fixture;
}

test("Twilio plan accepts documented implicit US1 only after owned eligible number verification, without writes", async () => {
  const fixture = implicitRegionFixture();
  const result = await operations(fixture).twilio.plan(TW, NUMBER);
  assert.equal(result.number.id, NUMBER);
  assert.equal(result.number.phoneNumber, fixture.number.phone_number);
  assert.equal(result.number.voiceEnabled, true);
  assert.deepEqual(fixture.requests.map(({ method, path }) => [method, path]), [
    ["GET", "/2010-04-01/Accounts/" + ACCOUNT + ".json"],
    ["GET", "/2010-04-01/Accounts/" + ACCOUNT + "/IncomingPhoneNumbers/" + NUMBER + ".json"],
    ["GET", "/v2/PhoneNumbers/" + encodeURIComponent(fixture.number.phone_number)],
  ]);
  assert.equal(fixture.requests.filter(isWrite).length, 0);
  assert.equal(fixture.keys.size, 0);
  assert.equal(JSON.stringify(result).includes("Synthetic missing routing"), false);
  assert.equal(JSON.stringify(result).includes(AUTH), false);
});

test("Twilio implicit US1 apply repeats every region readback and resumes without changing a Region or duplicating keys", async () => {
  const ctx = await prepareTw(implicitRegionFixture());
  const messaging = clone(ctx.plan.priorRouting.messaging);
  const result = await applyTw(ctx);
  assert.equal(result.number.phoneNumber, ctx.fixture.number.phone_number);
  assert.equal(result.publicResult.operationsEnabled, false);
  assert.equal(result.publicResult.labCallVerified, false);
  assert.equal(ctx.fixture.requests.filter(isRegionGet).length, 4); // Plan, initial, pre-routing, final.
  assert.equal(ctx.journal.entries.at(-1).stage, "verified");
  assert.equal(ctx.journal.last().routingApplied, true);
  assert.equal(ctx.journal.last().resources.apiKey.secret, KEY_SECRET);
  assert.deepEqual(ctx.fixture.requests.filter(isWrite).map((req) => req.path.split("/").at(-1)),
    ["Keys.json", NUMBER + ".json"]);
  assert.equal(ctx.fixture.requests.some((req) => req.path.startsWith("/v2/PhoneNumbers/") && isWrite(req)), false);
  assert.equal(ctx.fixture.number.sms_url, messaging.url);
  assert.equal(ctx.fixture.number.sms_application_sid, messaging.applicationSid);
  assert.equal(JSON.stringify(result.publicResult).includes(AUTH), false);
  assert.equal(JSON.stringify(ctx.journal.entries).includes("Synthetic missing routing"), false);
  const writes = ctx.fixture.requests.filter(isWrite).length;
  const readbacks = ctx.fixture.requests.filter(isRegionGet).length;
  await applyTw({ ...ctx, ops: operations(ctx.fixture) }, { existing: ctx.journal.last() });
  assert.equal(ctx.fixture.requests.filter(isWrite).length, writes);
  assert.equal(ctx.fixture.requests.filter(isRegionGet).length, readbacks + 2);
});

const regionFailureCases = [
  { name: "HTML 404", reply: () => new Response("<html>" + AUTH + "</html>", { status: 404,
    headers: { "Content-Type": "text/html" } }), code: "provider-response-invalid" },
  { name: "invalid JSON 404", reply: () => new Response("not JSON " + AUTH, { status: 404,
    headers: { "Content-Type": "application/json" } }), code: "provider-response-invalid" },
  ...[["null", null], ["array", []], ["string", "twilio-implicit-us1"]].map(([name, value]) => ({
    name: name + " error shape", reply: () => json(value, 404), code: "provider-response-invalid",
  })),
  ...[
    ["empty", {}], ["missing code", { status: 404 }], ["missing status", { code: 20404 }],
    ["different code", { code: 20403, status: 404 }], ["different status", { code: 20404, status: 400 }],
    ["string code", { code: "20404", status: 404 }], ["string status", { code: 20404, status: "404" }],
    ["nested", { error: { code: 20404, status: 404 } }],
  ].map(([name, value]) => ({
    name: name + " error contract", reply: () => json(value, 404), code: "provider-resource-not-found",
  })),
  ...[[401, "provider-credentials-rejected"], [403, "provider-policy-denied"],
    [429, "provider-rate-limited"], [500, "provider-http-rejected"]].map(([status, code]) => ({
    name: "HTTP " + status + " with qualifying error fields", reply: () => json({ code: 20404, status: 404 }, status),
    code, status: status === 401 || status === 403 ? status : 502,
  })),
  { name: "JSON 200 error forgery", reply: () => json({ code: 20404, status: 404 }),
    code: "twilio-processing-region-unverified", status: 422 },
  { name: "JSON 200 sentinel forgery", reply: () => json({ defaultUs1OnNotFound: true,
    implicitRegion: "twilio-implicit-us1", voice_region: "us1" }), code: "twilio-processing-region-unverified", status: 422 },
  { name: "JSON 200 string sentinel", reply: () => json("twilio-implicit-us1"), code: "provider-response-invalid" },
  ...[
    ["foreign account", { account_sid: "AC" + "9".repeat(32), phone_number: "+12025550101", voice_region: "us1" }],
    ["different number", { account_sid: ACCOUNT, phone_number: "+12025550199", voice_region: "us1" }],
    ["missing region", { account_sid: ACCOUNT, phone_number: "+12025550101" }],
  ].map(([name, value]) => ({
    name: "JSON 200 " + name, reply: () => json(value), code: "twilio-processing-region-unverified", status: 422,
  })),
  ...["ie1", "au1"].map((region) => ({
    name: "explicit " + region, reply: () => json({ account_sid: ACCOUNT, phone_number: "+12025550101",
      voice_region: region }), code: "twilio-processing-region-unsupported", status: 422,
  })),
  { name: "transport failure", reply: () => { throw new Error("Fixture transport " + AUTH); }, code: "provider-transport-failed" },
];
for (const failure of regionFailureCases) {
  for (const phase of ["plan", "apply"]) {
    test("Twilio " + phase + " denies implicit US1 for " + failure.name + " before effects", async () => {
      const ctx = await prepareTw();
      const previousNumber = clone(ctx.fixture.number);
      ctx.fixture.requests.length = 0;
      ctx.fixture.intercept = (req) => isRegionGet(req) ? failure.reply() : null;
      await assert.rejects(phase === "plan" ? () => ctx.ops.twilio.plan(TW, NUMBER) : () => applyTw(ctx),
        accountErrorIs(failure.code, failure.status ?? 502));
      assert.equal(ctx.fixture.requests.filter(isRegionGet).length, 1);
      assert.equal(ctx.fixture.requests.filter(isWrite).length, 0);
      assert.equal(ctx.fixture.keys.size, 0);
      assert.equal(ctx.journal.entries.length, 0);
      assert.deepEqual(ctx.fixture.number, previousNumber);
    });
  }
}

for (const invalid of [
  { name: "foreign ownership", mutate: (fixture) => { fixture.number.account_sid = "AC" + "9".repeat(32); },
    code: "provider-number-response-invalid", status: 502 },
  { name: "invalid E164", mutate: (fixture) => { fixture.number.phone_number = "%2B12025550101"; },
    code: "provider-number-response-invalid", status: 502 },
  { name: "voice disabled", mutate: (fixture) => { fixture.number.capabilities.voice = false; },
    code: "number-not-voice-enabled", status: 422 },
]) {
  for (const phase of ["plan", "apply"]) {
    test("Twilio " + phase + " checks " + invalid.name + " before any implicit-region request", async () => {
      const ctx = await prepareTw(implicitRegionFixture());
      invalid.mutate(ctx.fixture);
      ctx.fixture.requests.length = 0;
      await assert.rejects(phase === "plan" ? () => ctx.ops.twilio.plan(TW, NUMBER) : () => applyTw(ctx),
        accountErrorIs(invalid.code, invalid.status));
      assert.equal(ctx.fixture.requests.filter(isRegionGet).length, 0);
      assert.equal(ctx.fixture.requests.filter(isWrite).length, 0);
      assert.equal(ctx.journal.entries.length, 0);
    });
  }
}

for (const endpoint of [
  { name: "Account GET", method: "GET", suffix: ACCOUNT + ".json", attempts: 0 },
  { name: "owned-number GET", method: "GET", suffix: "/IncomingPhoneNumbers/" + NUMBER + ".json", attempts: 0 },
  { name: "key-create POST", method: "POST", suffix: "/Keys.json", attempts: 1 },
  { name: "owned-key GET", method: "GET", suffix: "/Keys/" + KEY + ".json", attempts: 1 },
  { name: "number-update POST", method: "POST", suffix: "/IncomingPhoneNumbers/" + NUMBER + ".json", attempts: 2 },
]) {
  test("Twilio never treats qualifying 404 at " + endpoint.name + " as implicit US1", async () => {
    const ctx = await prepareTw(implicitRegionFixture());
    const previousNumber = clone(ctx.fixture.number);
    const routingReply = ctx.fixture.intercept;
    ctx.fixture.intercept = (req) => req.method === endpoint.method && req.path.endsWith(endpoint.suffix)
      ? missingRegionResponse() : routingReply(req);
    await assert.rejects(applyTw(ctx), accountErrorIs("provider-resource-not-found", 502));
    assert.equal(ctx.fixture.requests.filter(isWrite).length, endpoint.attempts);
    assert.deepEqual(ctx.fixture.number, previousNumber);
    assert.equal(ctx.journal.entries.some((entry) => entry.stage === "verified"), false);
    if (endpoint.attempts === 0) assert.equal(ctx.journal.entries.length, 0);
    if (endpoint.name === "owned-key GET" || endpoint.name === "number-update POST") {
      assert.equal(ctx.journal.last().resources.apiKey.secret, KEY_SECRET);
      assert.equal(ctx.journal.last().routingApplied, false);
    }
  });
}

for (const stage of ["before-apply", "after-key", "after-routing"]) {
  test("Twilio implicit US1 plan rejects explicit region drift " + stage + " without further effects", async () => {
    const ctx = await prepareTw(implicitRegionFixture());
    const changeRegion = () => { ctx.fixture.intercept = null; ctx.fixture.inboundRegion = "ie1"; };
    if (stage === "before-apply") changeRegion();
    else if (stage === "after-key") ctx.fixture.onCreateKey = changeRegion;
    else ctx.fixture.onUpdateNumber = changeRegion;
    await assert.rejects(applyTw(ctx), accountErrorIs("twilio-processing-region-unsupported", 422));
    const writes = stage === "before-apply" ? 0 : stage === "after-key" ? 1 : 2;
    assert.equal(ctx.fixture.requests.filter(isWrite).length, writes);
    assert.equal(ctx.journal.entries.some((entry) => entry.stage === "verified"), false);
    if (writes === 0) assert.equal(ctx.journal.entries.length, 0);
    else {
      assert.equal(ctx.journal.last().resources.apiKey.secret, KEY_SECRET);
      assert.equal(ctx.journal.last().routingApplied, stage === "after-routing");
      assert.equal(ctx.journal.last().pending, null);
      assert.equal(ctx.journal.last().unknown, null);
      await assert.rejects(applyTw({ ...ctx, ops: operations(ctx.fixture) }, { existing: ctx.journal.last() }),
        accountErrorIs("twilio-processing-region-unsupported", 422));
      assert.equal(ctx.fixture.requests.filter(isWrite).length, writes);
    }
    assert.equal(ctx.fixture.requests.some((req) => req.path.startsWith("/v2/PhoneNumbers/") && isWrite(req)), false);
  });
}

test("Telnyx number GET never borrows Twilio's implicit US1 error semantics", async () => {
  const fixture = telFixture();
  fixture.intercept = (req) => req.method === "GET" && req.path === "/v2/phone_numbers/" + TEL_NUMBER
    ? missingRegionResponse() : null;
  await assert.rejects(operations(fixture).telnyx.plan(TE, TEL_NUMBER), errorIs("provider-resource-not-found"));
  assert.equal(fixture.requests.filter(isWrite).length, 0);
});

test("Telnyx plan rejects recording/forwarding/translation/screening and incomplete policy readback", async () => {
  for (const mutate of [
    (fixture) => { fixture.voice.call_recording.inbound_call_recording_enabled = true; },
    (fixture) => { fixture.voice.call_forwarding.call_forwarding_enabled = true; },
    (fixture) => { fixture.voice.translated_number = "+12025550199"; },
    (fixture) => { fixture.voice.inbound_call_screening = "always"; },
    (fixture) => { fixture.voice.tech_prefix_enabled = true; },
  ]) {
    const fixture = telFixture();
    mutate(fixture);
    await assert.rejects(operations(fixture).telnyx.plan(TE, TEL_NUMBER), errorIs("existing-voice-policy-unsupported"));
    assert.equal(fixture.requests.filter(isWrite).length, 0);
  }
  const unknown = telFixture();
  delete unknown.voice.call_recording;
  await assert.rejects(operations(unknown).telnyx.plan(TE, TEL_NUMBER), errorIs("number-voice-policy-unverified"));
  const inactive = telFixture();
  inactive.number.status = "purchase-pending";
  await assert.rejects(operations(inactive).telnyx.plan(TE, TEL_NUMBER), errorIs("number-not-active"));
});

test("Twilio apply checkpoints before effects, retains one-time secret, writes only reviewed voice fields", async () => {
  const ctx = await prepareTw();
  const messaging = clone(ctx.plan.priorRouting.messaging);
  ctx.fixture.intercept = (req) => {
    if (isWrite(req)) {
      assert.equal(ctx.journal.entries.at(-1)?.stage, "before-effect");
      assert.equal(ctx.journal.last().pending.operation,
        req.path.endsWith("/Keys.json") ? "create-standard-key" : "update-number-routing");
    }
    return null;
  };
  const result = await applyTw(ctx);
  assert.equal(result.provider, "twilio");
  assert.equal(result.accountSid, ACCOUNT);
  assert.equal(result.authToken, AUTH);
  assert.equal(result.apiKeySid, KEY);
  assert.equal(result.apiKeySecret, KEY_SECRET);
  const keyCheckpoint = ctx.journal.entries.find((entry) => entry.stage === "after-effect" &&
    entry.operation === "create-standard-key");
  assert.equal(keyCheckpoint.privateState.resources.apiKey.secret, KEY_SECRET);
  assert.deepEqual(ctx.plan.priorRouting.messaging, messaging);
  for (const [field, expected] of [["sms_url", messaging.url], ["sms_method", messaging.method],
    ["sms_application_sid", messaging.applicationSid], ["sms_fallback_url", messaging.fallbackUrl],
    ["sms_fallback_method", messaging.fallbackMethod]]) assert.equal(ctx.fixture.number[field], expected);
  assert.deepEqual(ctx.fixture.requests.filter(isWrite).map((req) => req.path.split("/").at(-1)), ["Keys.json", NUMBER + ".json"]);
  assert.equal(ctx.journal.entries.at(-1).stage, "verified");
  assert.equal(ctx.journal.last().routingApplied, true);
  for (const secret of [AUTH, KEY_SECRET]) assert.equal(JSON.stringify(result.publicResult).includes(secret), false);
  assert.equal(result.publicResult.operationsEnabled, false);
  assert.equal(result.publicResult.labCallVerified, false);
});

test("Telnyx apply creates distinct owned app/SIP resources, then only attaches selected number", async () => {
  const ctx = await prepareTel();
  const result = await applyTel(ctx);
  assert.equal(result.apiKey, TE.apiKey);
  assert.equal(result.publicKey, TE.publicKey);
  assert.equal(result.applicationId, APP);
  assert.equal(result.credentialConnectionId, SIP);
  assert.notEqual(result.applicationId, result.credentialConnectionId);
  assert.equal(ctx.fixture.number.connection_id, APP);
  assert.equal(ctx.fixture.number.messaging_profile_id, "fixture-messaging-profile");
  assert.equal(ctx.journal.last().resources.credentialConnectionSeed.password,
    ctx.fixture.requests.find((req) => req.path === "/v2/credential_connections" && req.method === "POST").body.password);
  assert.deepEqual(ctx.fixture.requests.filter(isWrite).map((req) => [req.method, req.path]), [
    ["POST", "/v2/call_control_applications"], ["POST", "/v2/credential_connections"],
    ["PATCH", "/v2/phone_numbers/" + TEL_NUMBER],
  ]);
  assert.deepEqual(ctx.journal.entries.map((entry) => entry.stage),
    ["before-effect", "after-effect", "before-effect", "after-effect", "before-effect", "after-effect", "verified"]);
  assert.equal(ctx.journal.last().verifiedAt, "2026-10-21T18:00:00.000Z");
  for (const secret of [TE.apiKey, ctx.journal.last().resources.credentialConnectionSeed.password]) {
    assert.equal(JSON.stringify(result.publicResult).includes(secret), false);
  }
  assert.equal(result.publicResult.operationsEnabled, false);
  assert.equal(result.publicResult.labCallVerified, false);
  assert.ok(result.publicResult.prerequisites.includes("managed-device-credential-issuer"));
});

test("apply rejects preexisting routing drift before any resource creation for both providers", async () => {
  const tw = await prepareTw();
  tw.fixture.number.voice_url = "https://changed.example.test/";
  await assert.rejects(applyTw(tw), errorIs("routing-drift"));
  assert.equal(tw.fixture.requests.filter(isWrite).length, 0);
  const tel = await prepareTel();
  tel.fixture.number.messaging_profile_id = "changed-after-review";
  await assert.rejects(applyTel(tel), errorIs("routing-drift"));
  assert.equal(tel.fixture.requests.filter(isWrite).length, 0);
});

test("routing is rechecked after creates; intervening console edits never get overwritten", async () => {
  const tw = await prepareTw();
  tw.fixture.onCreateKey = () => { tw.fixture.number.status_callback = "https://changed.example.test/status"; };
  await assert.rejects(applyTw(tw), errorIs("routing-drift"));
  assert.equal(tw.fixture.requests.filter(isWrite).length, 1);
  assert.equal(tw.journal.last().resources.apiKey.secret, KEY_SECRET);
  const tel = await prepareTel();
  tel.fixture.onCreateApp = () => {
    tel.fixture.number.connection_id = "changed-connection";
    tel.fixture.voice.connection_id = "changed-connection";
  };
  await assert.rejects(applyTel(tel), errorIs("routing-drift"));
  assert.equal(tel.fixture.requests.filter((req) => req.method === "PATCH").length, 0);
  assert.equal(tel.fixture.requests.some((req) => req.method === "DELETE"), false);
});

test("unbound/tampered plans and absent durable checkpoint cannot initiate effects", async () => {
  const ctx = await prepareTw();
  const before = ctx.fixture.requests.length;
  for (const plan of [{ ...ctx.plan, publicBaseUrl: "https://other.example.test" },
    { ...ctx.plan, credentialScope: "wrong" },
    { ...ctx.plan, priorRouting: { ...ctx.plan.priorRouting, phoneNumber: "+12025550199" } }]) {
    await assert.rejects(applyTw(ctx, { plan }), errorIs("invalid-or-unbound-setup-plan"));
  }
  await assert.rejects(applyTw(ctx, { checkpoint: null }), errorIs("durable-checkpoint-required"));
  await assert.rejects(applyTw(ctx, { connectionId: "x".repeat(49) }), errorIs("invalid-connection-id"));
  assert.equal(ctx.fixture.requests.length, before);
});

test("checkpoint failure before creation sends no remote write", async () => {
  for (const [prepare, apply] of [[prepareTw, applyTw], [prepareTel, applyTel]]) {
    const ctx = await prepare();
    await assert.rejects(apply(ctx, { checkpoint: async () => { throw new Error("storage " + AUTH); } }),
      errorIs("checkpoint-persistence-failed"));
    assert.equal(ctx.fixture.requests.filter(isWrite).length, 0);
    // The local pending intent conservatively blocks re-entry.
    await assert.rejects(apply(ctx), errorIs("setup-reconciliation-required", true));
    assert.equal(ctx.fixture.requests.filter(isWrite).length, 0);
  }
});

test("ambiguous Twilio key creation blocks same-instance replay and restored unknown checkpoints", async () => {
  const ctx = await prepareTw();
  ctx.fixture.intercept = (req) => {
    if (req.method === "POST" && req.path.endsWith("/Keys.json")) throw new Error("timeout " + AUTH);
    return null;
  };
  await assert.rejects(applyTw(ctx), errorIs("provider-transport-failed", true));
  assert.equal(ctx.journal.entries.at(-1).stage, "unknown");
  assert.equal(ctx.journal.last().pending.operation, "create-standard-key");
  await assert.rejects(applyTw(ctx), errorIs("setup-reconciliation-required", true));
  const restored = { ...ctx, ops: operations(ctx.fixture) };
  await assert.rejects(applyTw(restored, { existing: ctx.journal.last() }), errorIs("setup-reconciliation-required", true));
  assert.equal(ctx.fixture.requests.filter(isWrite).length, 1);
});

test("Telnyx partial create keeps known app and unknown SIP effect without duplicate creates or rollback", async () => {
  const ctx = await prepareTel();
  ctx.fixture.intercept = (req) => req.path === "/v2/credential_connections" && req.method === "POST"
    ? json({ errors: [{ detail: "unknown create " + TE.apiKey }] }, 503) : null;
  await assert.rejects(applyTel(ctx), errorIs("provider-http-rejected", true));
  assert.equal(ctx.journal.last().resources.application.id, APP);
  assert.ok(ctx.journal.last().resources.credentialConnectionSeed.password);
  assert.equal(ctx.journal.last().unknown.operation, "create-credential-connection");
  const restored = { ...ctx, ops: operations(ctx.fixture) };
  await assert.rejects(applyTel(restored, { existing: { privateState: ctx.journal.last() } }),
    errorIs("setup-reconciliation-required", true));
  assert.equal(ctx.fixture.requests.filter((req) => req.path === "/v2/call_control_applications").length, 1);
  assert.equal(ctx.fixture.requests.filter((req) => req.method === "PATCH" || req.method === "DELETE").length, 0);
});

test("lost response after a number update pauses outside the confirmed state and never replays it", async () => {
  for (const [prepare, apply] of [[prepareTw, applyTw], [prepareTel, applyTel]]) {
    const ctx = await prepare();
    ctx.fixture.intercept = (req) => {
      if (req.method === "POST" && req.path.endsWith(NUMBER + ".json")) {
        Object.assign(ctx.fixture.number, { voice_url: BASE + "/webhooks/twilio/inbound", voice_method: "POST",
          status_callback: BASE + "/webhooks/twilio/status", status_callback_method: "POST",
          voice_application_sid: "", voice_fallback_url: "" });
        throw new Error("lost response " + AUTH);
      }
      if (req.method === "PATCH" && req.path === "/v2/phone_numbers/" + TEL_NUMBER) {
        ctx.fixture.number.connection_id = APP;
        ctx.fixture.voice.connection_id = APP;
        throw new Error("lost response " + TE.apiKey);
      }
      return null;
    };
    await assert.rejects(apply(ctx), errorIs("provider-transport-failed", true));
    assert.equal(ctx.journal.last().pending.operation, "update-number-routing");
    assert.equal(ctx.journal.last().routingApplied, false);
    const count = ctx.fixture.requests.length;
    await assert.rejects(apply({ ...ctx, ops: operations(ctx.fixture) }, { existing: ctx.journal.last() }),
      errorIs("setup-reconciliation-required", true));
    assert.equal(ctx.fixture.requests.length, count);
  }
});

test("one-time key secret survives a failed post-create checkpoint and is never exposed in errors", async () => {
  const ctx = await prepareTw();
  const seen = [];
  const checkpoint = async (stage, data) => {
    seen.push({ stage, ...clone(data) });
    if (stage === "after-effect") throw new Error("disk error " + KEY_SECRET);
  };
  await assert.rejects(applyTw(ctx, { checkpoint }), errorIs("checkpoint-after-effect-unknown", true));
  assert.equal(seen.at(-1).stage, "unknown");
  assert.equal(seen.at(-1).privateState.resources.apiKey.secret, KEY_SECRET);
  assert.equal(seen.at(-1).privateState.pending.operation, "create-standard-key");
  assert.equal(ctx.fixture.requests.filter(isWrite).length, 1);
});

test("malformed create response marks unknown and retains available one-time secret", async () => {
  const ctx = await prepareTw();
  ctx.fixture.intercept = (req) => req.method === "POST" && req.path.endsWith("/Keys.json")
    ? json({ secret: KEY_SECRET }, 201) : null;
  await assert.rejects(applyTw(ctx), errorIs("created-or-updated-resource-unverified", true));
  assert.equal(ctx.journal.last().resources.apiKey.secret, KEY_SECRET);
  assert.equal(ctx.journal.last().resources.apiKey.sid, null);
  await assert.rejects(applyTw(ctx), errorIs("setup-reconciliation-required", true));
  assert.equal(ctx.fixture.requests.filter(isWrite).length, 1);
});

test("definite rejected routing update can resume with owned key; no duplicate key or unowned rollback", async () => {
  const ctx = await prepareTw();
  let rejected = false;
  ctx.fixture.intercept = (req) => {
    if (req.method === "POST" && req.path.endsWith(NUMBER + ".json") && !rejected) {
      rejected = true;
      return json({ message: "policy " + AUTH }, 403);
    }
    return null;
  };
  await assert.rejects(applyTw(ctx), errorIs("provider-policy-denied"));
  assert.equal(ctx.journal.entries.at(-1).stage, "failed");
  assert.equal(ctx.journal.last().pending, null);
  assert.equal(ctx.journal.last().resources.apiKey.sid, KEY);
  const restored = { ...ctx, ops: operations(ctx.fixture) };
  const result = await applyTw(restored, { existing: ctx.journal.last() });
  assert.equal(result.apiKeySecret, KEY_SECRET);
  assert.equal(ctx.fixture.requests.filter((req) => req.path.endsWith("/Keys.json")).length, 1);
  assert.equal(ctx.fixture.requests.some((req) => req.method === "DELETE"), false);
});

test("completed checkpoints re-verify both providers without creating or updating again", async () => {
  for (const [prepare, apply] of [[prepareTw, applyTw], [prepareTel, applyTel]]) {
    const ctx = await prepare();
    const result = await apply(ctx);
    const writes = ctx.fixture.requests.filter(isWrite).length;
    const restored = { ...ctx, ops: operations(ctx.fixture), journal: journal() };
    const again = await apply(restored, { existing: ctx.journal.last() });
    assert.deepEqual(again, result);
    assert.equal(ctx.fixture.requests.filter(isWrite).length, writes);
  }
});

test("Telnyx definite rejected SIP creation can reuse the checkpointed app and generated seed", async () => {
  const ctx = await prepareTel();
  let rejected = false;
  ctx.fixture.intercept = (req) => {
    if (req.method === "POST" && req.path === "/v2/credential_connections" && !rejected) {
      rejected = true;
      return json({ errors: [{ detail: "policy " + TE.apiKey }] }, 403);
    }
    return null;
  };
  await assert.rejects(applyTel(ctx), errorIs("provider-policy-denied"));
  const existing = clone(ctx.journal.last());
  assert.equal(existing.resources.application.id, APP);
  assert.equal(existing.pending, null);
  const resumed = await applyTel({ ...ctx, ops: operations(ctx.fixture) }, { existing });
  assert.equal(resumed.applicationId, APP);
  const posts = ctx.fixture.requests.filter((req) => req.method === "POST" && req.path === "/v2/credential_connections");
  assert.equal(posts.length, 2);
  assert.equal(posts[0].body.user_name, posts[1].body.user_name);
  assert.equal(posts[0].body.password, posts[1].body.password);
  assert.equal(ctx.fixture.requests.filter((req) => req.method === "POST" && req.path === "/v2/call_control_applications").length, 1);
});

test("resumption rejects resource ownership drift and number drift after a completed apply", async () => {
  const tw = await prepareTw();
  await applyTw(tw);
  tw.fixture.keys.get(KEY).friendly_name = "someone-else";
  const before = tw.fixture.requests.filter(isWrite).length;
  await assert.rejects(applyTw({ ...tw, ops: operations(tw.fixture) }, { existing: tw.journal.last() }),
    errorIs("owned-api-key-verification-failed"));
  assert.equal(tw.fixture.requests.filter(isWrite).length, before);
  const tel = await prepareTel();
  await applyTel(tel);
  tel.fixture.number.messaging_profile_id = "new-message-profile";
  const telBefore = tel.fixture.requests.filter(isWrite).length;
  await assert.rejects(applyTel({ ...tel, ops: operations(tel.fixture) }, { existing: tel.journal.last() }),
    errorIs("routing-verification-failed"));
  assert.equal(tel.fixture.requests.filter(isWrite).length, telBefore);
});

test("Telnyx missing, assigned or parked outbound policy rejects before attaching any number", async () => {
  for (const [outbound, code] of [[{}, "sip-outbound-policy-unverified"],
    [{ outbound_voice_profile_id: "existing-profile" }, "sip-outbound-policy-denied"],
    [{ outbound_voice_profile_id: null, call_parking_enabled: true }, "sip-outbound-policy-unverified"]]) {
    const fixture = telFixture();
    fixture.outbound = outbound;
    const ctx = await prepareTel(fixture);
    await assert.rejects(applyTel(ctx), errorIs(code));
    assert.equal(fixture.requests.filter((req) => req.method === "PATCH").length, 0);
    assert.equal(ctx.journal.last().resources.credentialConnection.id, SIP);
    assert.equal(fixture.requests.some((req) => req.method === "DELETE"), false);
  }
});

test("provider changing messaging during number update never reports successful configuration", async () => {
  const tw = await prepareTw();
  tw.fixture.onUpdateNumber = () => { tw.fixture.number.sms_url = "https://changed.example.test/sms"; };
  await assert.rejects(applyTw(tw), errorIs("created-or-updated-resource-unverified", true));
  assert.equal(tw.journal.entries.at(-1).stage, "unknown");
  const tel = await prepareTel();
  tel.fixture.onUpdateNumber = () => { tel.fixture.number.messaging_profile_id = "unexpected-change"; };
  await assert.rejects(applyTel(tel), errorIs("created-or-updated-resource-unverified", true));
  assert.equal(tel.journal.entries.at(-1).stage, "unknown");
});

test("same-instance overlapping applies are rejected and cannot replace the first attempt's state", async () => {
  const ctx = await prepareTw();
  let release;
  let entered;
  const waiting = new Promise((resolve) => { release = resolve; });
  const ready = new Promise((resolve) => { entered = resolve; });
  const checkpoint = async (stage, data) => {
    await ctx.journal.checkpoint(stage, data);
    if (stage === "before-effect" && data.operation === "create-standard-key") {
      entered();
      await waiting;
    }
  };
  const first = applyTw(ctx, { checkpoint });
  await ready;
  await assert.rejects(applyTw(ctx), errorIs("setup-apply-in-progress"));
  release();
  await first;
  await applyTw(ctx);
  assert.equal(ctx.fixture.requests.filter((req) => req.path.endsWith("/Keys.json")).length, 1);
});

test("API configuration does not authorize any spend, buy numbers, call, record or delete", async () => {
  for (const [prepare, apply] of [[prepareTw, applyTw], [prepareTel, applyTel]]) {
    const ctx = await prepare();
    const result = await apply(ctx);
    assert.equal(result.publicResult.verification, "configuration-readback");
    assert.equal(result.publicResult.operationsEnabled, false);
    assert.equal(result.publicResult.labCallVerified, false);
    assert.equal(ctx.fixture.requests.some(({ path, method }) =>
      /\/(Calls|calls|recordings|number_orders|telephony_credentials)(\/|\.|$)/.test(path) ||
      method === "DELETE" || (method === "POST" && path.endsWith("/IncomingPhoneNumbers.json"))), false);
  }
});

test("known secrets echoed in provider-owned labels are removed from public apply results", async () => {
  const tw = await prepareTw();
  tw.fixture.onUpdateNumber = () => { tw.fixture.number.friendly_name = "Label " + KEY_SECRET + " " + AUTH; };
  const twResult = await applyTw(tw);
  assert.equal(JSON.stringify(twResult.publicResult).includes(KEY_SECRET), false);
  assert.equal(JSON.stringify(twResult.publicResult).includes(AUTH), false);
  const tel = await prepareTel();
  tel.fixture.onUpdateNumber = () => {
    tel.fixture.number.customer_reference = "Label " + tel.journal.last().resources.credentialConnectionSeed.password;
  };
  const telResult = await applyTel(tel);
  assert.equal(JSON.stringify(telResult.publicResult).includes(tel.journal.last().resources.credentialConnectionSeed.password), false);
});

test("frontend echo guard accepts public labels with every submitted credential redacted before clipping", async () => {
  const noSubmittedValues = (data, credentials) => {
    const text = JSON.stringify(data);
    for (const [key, value] of Object.entries(credentials)) {
      if (key !== "provider") assert.equal(text.includes(value), false, "Public DTO echoes " + key);
    }
  };
  const twFixtureWithEcho = twFixture();
  // Twilio accounts can use Account SID as their default friendly name.
  twFixtureWithEcho.accountName = ACCOUNT;
  twFixtureWithEcho.number.friendly_name = ACCOUNT + " " + AUTH;
  const tw = await prepareTw(twFixtureWithEcho);
  noSubmittedValues(await tw.ops.twilio.inspect(TW), TW);
  noSubmittedValues(tw.plan.number, TW);
  tw.fixture.onUpdateNumber = () => {
    tw.fixture.number.friendly_name = "x".repeat(95) + ACCOUNT + AUTH + KEY_SECRET + KEY;
  };
  const twResult = await applyTw(tw);
  noSubmittedValues(twResult.number, TW);
  noSubmittedValues(twResult.publicResult, TW);
  for (const value of [ACCOUNT, AUTH, KEY_SECRET, KEY]) {
    assert.equal(twResult.number.label.includes(value.slice(0, 7)), false);
  }
  assert.equal(twResult.accountSid, ACCOUNT);
  assert.equal(twResult.authToken, AUTH);
  assert.equal(twResult.apiKeySid, KEY);
  assert.equal(twResult.apiKeySecret, KEY_SECRET);
  const telFixtureWithEcho = telFixture();
  telFixtureWithEcho.number.customer_reference = TE.apiKey + " " + TE.publicKey;
  const tel = await prepareTel(telFixtureWithEcho);
  noSubmittedValues(await tel.ops.telnyx.inspect(TE), TE);
  noSubmittedValues(tel.plan.number, TE);
  tel.fixture.onUpdateNumber = () => {
    tel.fixture.number.customer_reference = "x".repeat(95) + TE.apiKey + TE.publicKey +
      tel.journal.last().resources.credentialConnectionSeed.password;
  };
  const telResult = await applyTel(tel);
  noSubmittedValues(telResult.number, TE);
  noSubmittedValues(telResult.publicResult, TE);
  for (const value of [TE.apiKey, TE.publicKey, tel.journal.last().resources.credentialConnectionSeed.password]) {
    assert.equal(telResult.number.label.includes(value.slice(0, 7)), false);
  }
  assert.equal(telResult.apiKey, TE.apiKey);
  assert.equal(telResult.publicKey, TE.publicKey);
});

test("invalid successful response and oversized provider bodies fail closed with no secret echoes", async () => {
  for (const body of ["not JSON " + AUTH, JSON.stringify({ payload: "x".repeat(2 * 1024 * 1024 + 1) })]) {
    const fixture = twFixture();
    fixture.intercept = () => new Response(body, { status: 200 });
    await assert.rejects(operations(fixture).twilio.inspect(TW), errorIs("provider-response-invalid"));
    assert.equal(fixture.requests.filter(isWrite).length, 0);
  }
});

test("inventories larger than the coordinator's 1000-number bound reject without truncation", async () => {
  const fixture = telFixture();
  fixture.pages = [{ data: Array.from({ length: 1001 }, (_, index) => ({
    ...fixture.number, id: "number-" + index, phone_number: "+1202" + String(1000000 + index),
  })), meta: { page_number: 1, total_pages: 1 } }];
  await assert.rejects(operations(fixture).telnyx.inspect(TE), errorIs("provider-pagination-invalid"));
  assert.equal(fixture.requests.filter(isWrite).length, 0);
});

async function browserContext(options = {}) {
  const ctx = await prepareTel();
  await applyTel(ctx);
  const waits = [];
  const credentialJournal = journal();
  const ops = createSetupProviderOperations({ fetch: ctx.fixture.fetch, publicBaseUrl: BASE, now: () => NOW,
    wait: async (ms) => { waits.push(ms); await options.onWait?.(ctx.fixture); } });
  const input = { connectionId: CONNECTION, credentials: TE, credentialConnectionId: SIP,
    agentId: "agent-a", seconds: 300, checkpoint: credentialJournal.checkpoint };
  return { ...ctx, ops, waits, credentialJournal, input };
}

test("managed issuer creates one bounded device credential, mints text JWT, checkpoints and waits before return", async () => {
  const ctx = await browserContext();
  const before = ctx.fixture.requests.length;
  const result = await ctx.ops.telnyx.createBrowserCredential(ctx.input);
  assert.deepEqual(Object.keys(result).sort(), ["credentialId", "expiresAt", "sipUsername", "token"]);
  assert.equal(result.credentialId, "credential-1");
  assert.equal(result.sipUsername, "gencredFixture1");
  assert.equal(result.expiresAt, "2026-10-21T18:05:00.000Z");
  assert.deepEqual(ctx.waits, [5000]);
  assert.equal(ctx.credentialJournal.last().resources.token.token, result.token);
  const writes = ctx.fixture.requests.slice(before).filter(isWrite);
  assert.deepEqual(writes.map(({ method, path }) => [method, path]), [
    ["POST", "/v2/telephony_credentials"], ["POST", "/v2/telephony_credentials/credential-1/token"],
  ]);
  assert.deepEqual(ctx.credentialJournal.entries.map((entry) => entry.stage),
    ["before-effect", "after-effect", "before-effect", "after-effect", "verified"]);
  assert.equal(JSON.stringify(ctx.credentialJournal.last()).includes("private-sip-password-fixture"), false);
  assert.equal(ctx.fixture.requests.some((req) => /\/calls(\/|$)/.test(req.path)), false);
  const parent = ctx.fixture.credentials.get(result.credentialId);
  assert.equal(parent.resource_id, "connection:" + SIP);
  assert.equal(Date.parse(parent.expires_at), NOW + 300000);
});

test("issuer reuses the same valid device parent/token, separates actual devices and supports configured shorter TTL", async () => {
  const ctx = await browserContext();
  const first = await ctx.ops.telnyx.createBrowserCredential(ctx.input);
  const count = ctx.fixture.requests.filter(isWrite).length;
  assert.deepEqual(await ctx.ops.telnyx.createBrowserCredential(ctx.input), first);
  assert.equal(ctx.fixture.requests.filter(isWrite).length, count);
  const other = await ctx.ops.telnyx.createBrowserCredential({ ...ctx.input, deviceId: "second-device", seconds: 120 });
  assert.notEqual(other.credentialId, first.credentialId);
  assert.notEqual(other.sipUsername, first.sipUsername);
  assert.equal(other.expiresAt, "2026-10-21T18:02:00.000Z");
});

test("issuer rejects destinations/origins, unbounded TTL, missing checkpoint and non-owned connection before writes", async () => {
  const ctx = await browserContext();
  const before = ctx.fixture.requests.filter(isWrite).length;
  for (const extra of [{ to: "+12025550199" }, { publicBaseUrl: "https://other.example.test" },
    { seconds: 301 }, { deviceId: "sip:other@other.example.test" }]) {
    await assert.rejects(ctx.ops.telnyx.createBrowserCredential({ ...ctx.input, ...extra }),
      errorIs("invalid-browser-credential-request"));
  }
  await assert.rejects(ctx.ops.telnyx.createBrowserCredential({ ...ctx.input, checkpoint: undefined }),
    errorIs("durable-checkpoint-required"));
  ctx.fixture.connections.get(SIP).connection_name = "unowned";
  await assert.rejects(ctx.ops.telnyx.createBrowserCredential(ctx.input),
    errorIs("owned-credential-connection-verification-failed"));
  assert.equal(ctx.fixture.requests.filter(isWrite).length, before);
});

test("issuer checks no outbound profile both before creating and after propagation wait", async () => {
  const unverified = await browserContext();
  unverified.fixture.connections.get(SIP).outbound = {};
  const before = unverified.fixture.requests.filter(isWrite).length;
  await assert.rejects(unverified.ops.telnyx.createBrowserCredential(unverified.input), errorIs("sip-outbound-policy-unverified"));
  assert.equal(unverified.fixture.requests.filter(isWrite).length, before);
  const changed = await browserContext({ onWait: async (fixture) => {
    fixture.connections.get(SIP).outbound.outbound_voice_profile_id = "new-profile";
  } });
  await assert.rejects(changed.ops.telnyx.createBrowserCredential(changed.input), errorIs("sip-outbound-policy-denied"));
  assert.equal(changed.credentialJournal.entries.at(-1).stage, "after-effect");
  assert.ok(changed.credentialJournal.last().resources.token.token);
});

test("issuer blocks unknown create/mint across replay and restart with exact private state", async () => {
  for (const failMint of [false, true]) {
    const ctx = await browserContext();
    ctx.fixture.intercept = (req) => {
      if (req.method === "POST" && (failMint ? req.path.endsWith("/token") : req.path === "/v2/telephony_credentials")) {
        throw new Error("ambiguous issuer " + TE.apiKey);
      }
      return null;
    };
    await assert.rejects(ctx.ops.telnyx.createBrowserCredential(ctx.input), errorIs("provider-transport-failed", true));
    assert.equal(ctx.credentialJournal.entries.at(-1).stage, "unknown");
    if (failMint) assert.equal(ctx.credentialJournal.last().resources.credential.id, "credential-1");
    const count = ctx.fixture.requests.length;
    await assert.rejects(ctx.ops.telnyx.createBrowserCredential(ctx.input), errorIs("setup-reconciliation-required", true));
    const restarted = operations(ctx.fixture);
    await assert.rejects(restarted.telnyx.createBrowserCredential({ ...ctx.input, existing: ctx.credentialJournal.last() }),
      errorIs("setup-reconciliation-required", true));
    assert.equal(ctx.fixture.requests.length, count);
  }
});

test("issuer rejects provider JWT exceeding its five-minute parent; captures secret privately and marks unknown", async () => {
  const ctx = await browserContext();
  ctx.fixture.tokenSecondsExtra = 3600;
  await assert.rejects(ctx.ops.telnyx.createBrowserCredential(ctx.input),
    errorIs("created-or-updated-resource-unverified", true));
  assert.equal(ctx.credentialJournal.last().unknown.operation, "create-browser-token");
  assert.ok(ctx.credentialJournal.last().resources.token.token);
  assert.equal(ctx.credentialJournal.last().resources.token.expiresAt, null);
  assert.deepEqual(ctx.waits, []);
});

test("issuer parent identity drift, expiry drift and local wait failure do not report success or duplicate create", async () => {
  const drift = await browserContext({ onWait: async (fixture) => {
    fixture.credentials.get("credential-1").resource_id = "connection:unowned";
  } });
  await assert.rejects(drift.ops.telnyx.createBrowserCredential(drift.input), errorIs("browser-credential-verification-failed"));
  const expires = await browserContext({ onWait: async (fixture) => {
    fixture.credentials.get("credential-1").expires_at = new Date(NOW + 600000).toISOString();
  } });
  await assert.rejects(expires.ops.telnyx.createBrowserCredential(expires.input), errorIs("browser-credential-verification-failed"));
  const failure = await browserContext({ onWait: async () => { throw new Error("local " + TE.apiKey); } });
  await assert.rejects(failure.ops.telnyx.createBrowserCredential(failure.input), errorIs("credential-propagation-wait-failed"));
  for (const ctx of [drift, expires, failure]) {
    assert.equal(ctx.fixture.requests.filter((req) => req.path === "/v2/telephony_credentials" && req.method === "POST").length, 1);
    assert.ok(ctx.credentialJournal.last().resources.token.token);
  }
});
