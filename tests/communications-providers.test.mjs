import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

// Exercise the actual TypeScript modules without installing either carrier SDK.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        const candidate = new URL(`${specifier}.ts`, context.parentURL);
        if (existsSync(candidate)) return nextResolve(candidate.href, context);
      }
      throw error;
    }
  },
});
after(() => hooks.deregister());
const {
  createLiveCommunicationsAdapter,
  communicationsLiveSnapshotSchema,
  communicationsSnapshotEnvelopeSchema,
  parseVoiceAccessToken,
} = await import("../src/lib/communications/live-adapter.ts");
const { createTwilioBrowserVoiceClient } =
  await import("../src/lib/communications/twilio-browser.ts");
const { createTelnyxBrowserVoiceClient } =
  await import("../src/lib/communications/telnyx-browser.ts");

const version = "aureform.inbound-voice.v1";
const childSid = `CA${"1".repeat(32)}`;
const parentSid = `CA${"2".repeat(32)}`;
const flush = () => new Promise(setImmediate);
const copy = (value) => JSON.parse(JSON.stringify(value));
const code = (expected) => (error) => error?.code === expected;
function jwt(offset = 600000, label = "fixture") {
  const exp = Math.floor((Date.now() + offset) / 1000);
  return {
    token: `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ exp, label })).toString("base64url")}.c3ludGhldGlj`,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}
function media() {
  const track = {
    kind: "audio",
    readyState: "live",
    stops: 0,
    stop() {
      this.stops += 1;
      this.readyState = "ended";
    },
  };
  return { track, getTracks: () => [track], getAudioTracks: () => [track] };
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
class FakeTwilioCall extends EventEmitter {
  direction = "INCOMING";
  parameters = { CallSid: childSid };
  customParameters = new Map([
    ["aureformCallId", "logical-call-a"],
    ["aureformReservationId", "reservation-a"],
  ]);
  currentState = "pending";
  muted = false;
  operations = [];
  local = undefined;
  remote = undefined;
  status() {
    return this.currentState;
  }
  isMuted() {
    return this.muted;
  }
  getLocalStream() {
    return this.local;
  }
  getRemoteStream() {
    return this.remote;
  }
  accept(options) {
    this.operations.push(["accept", options]);
    this.local = media();
    this.remote = media();
    this.currentState = "open";
    this.emit("accept", this);
  }
  reject() {
    this.operations.push(["reject"]);
    this.currentState = "closed";
    this.emit("reject");
  }
  disconnect() {
    this.operations.push(["disconnect"]);
    this.currentState = "closed";
    this.emit("disconnect", this);
  }
  mute(value) {
    this.operations.push(["mute", value]);
    this.muted = value;
    this.emit("mute", value, this);
  }
  sendDigits(value) {
    this.operations.push(["sendDigits", value]);
  }
}
class FakeTwilioDevice extends EventEmitter {
  registered = 0;
  destroyed = 0;
  disconnected = 0;
  tokens = [];
  options;
  failRegistration = false;
  async register() {
    this.registered += 1;
    if (this.failRegistration) throw new Error("synthetic SDK failure");
    this.emit("registered");
  }
  updateToken(token) {
    this.tokens.push(token);
  }
  disconnectAll() {
    this.disconnected += 1;
  }
  destroy() {
    this.destroyed += 1;
  }
  // Not in the injected structural port. Any accidental outbound call fails.
  connect() {
    throw new Error("OUTBOUND_DEVICE_CONNECT_FORBIDDEN");
  }
}
class FakeTelnyxClient extends EventEmitter {
  connected = false;
  connects = 0;
  disconnects = 0;
  cacheClears = 0;
  outboundCalls = 0;
  loginCalls = [];
  loginMode = "success";
  remoteElement = null;
  async connect() {
    this.connects += 1;
    this.connected = true;
    this.emit("telnyx.ready");
  }
  async disconnect() {
    this.disconnects += 1;
    this.connected = false;
  }
  clearReconnectToken() {
    this.cacheClears += 1;
  }
  async login(options) {
    this.loginCalls.push(options.creds);
    if (this.loginMode === "early-return") return;
    if (this.loginMode === "error")
      options.onError(new Error("synthetic SDK error"));
    else options.onSuccess();
  }
  newCall() {
    this.outboundCalls += 1;
    throw new Error("OUTBOUND_TELNYX_NEWCALL_FORBIDDEN");
  }
}
class FakeTelnyxCall {
  id = "sdk-local-uuid";
  direction = "inbound";
  state = "ringing";
  recoveredCallId = "";
  isAudioMuted = false;
  telnyxIDs = {
    telnyxCallControlId: "v3:actual-browser-control-id",
    telnyxSessionId: "actual-call-session",
    telnyxLegId: "actual-browser-leg",
  };
  localStream = null;
  remoteStream = null;
  operations = [];
  constructor(client) {
    this.client = client;
  }
  notify() {
    this.client.emit("telnyx.notification", { type: "callUpdate", call: this });
  }
  async answer(options) {
    this.operations.push(["answer", options]);
    this.localStream = media();
    this.remoteStream = media();
    this.state = "active";
    this.notify();
  }
  async hangup() {
    this.operations.push(["hangup"]);
    this.state = "hangup";
    this.notify();
  }
  muteAudio() {
    this.operations.push(["muteAudio"]);
    this.isAudioMuted = true;
  }
  unmuteAudio() {
    this.operations.push(["unmuteAudio"]);
    this.isAudioMuted = false;
  }
  dtmf(value) {
    this.operations.push(["dtmf", value]);
  }
  hold() {
    throw new Error("COMMON_SDK_HOLD_FORBIDDEN");
  }
  unhold() {
    throw new Error("COMMON_SDK_UNHOLD_FORBIDDEN");
  }
}
function native(provider, extra = {}) {
  if (provider === "twilio") {
    const sdk = new FakeTwilioDevice();
    let creations = 0;
    const binding = createTwilioBrowserVoiceClient({
      createDevice: (token, options) => {
        creations += 1;
        sdk.tokens.push(token);
        sdk.options = options;
        return sdk;
      },
      ...extra,
    });
    const call = new FakeTwilioCall();
    return {
      sdk,
      binding,
      call,
      get creations() {
        return creations;
      },
      incoming: () => sdk.emit("incoming", call),
    };
  }
  const sdk = new FakeTelnyxClient();
  let creations = 0;
  const binding = createTelnyxBrowserVoiceClient({
    createClient: (options) => {
      creations += 1;
      sdk.initialOptions = options;
      return sdk;
    },
    ...extra,
  });
  const call = new FakeTelnyxCall(sdk);
  return {
    sdk,
    binding,
    call,
    get creations() {
      return creations;
    },
    incoming: () => call.notify(),
  };
}
function initialSnapshot(provider) {
  return {
    mode: "live",
    provider,
    connection: "disconnected",
    presence: "offline",
    activeCall: null,
    queue: [],
    history: [],
    error: null,
    businessHours: {
      timezone: "America/Bogota",
      weekly: [{ day: 1, start: "08:00", end: "18:00" }],
      holidays: [],
    },
    businessHoursOpen: true,
    caps: { hold: false, mute: true, dtmf: true },
    events: [],
    audio: { microphonePermission: "unknown" },
  };
}
function callProjection(provider) {
  return {
    id: "logical-call-a",
    provider,
    providerCallId:
      provider === "twilio" ? parentSid : "v3:actual-pstn-control",
    direction: "inbound",
    from: "+12025550124",
    to: "+12025550100",
    callerName: "Synthetic caller",
    status: "ringing",
    queuedAt: 1700000000000,
    startedAt: 1700000001000,
    muted: false,
    notes: "",
  };
}
function callBinding(provider) {
  return {
    callId: "logical-call-a",
    provider,
    pstnCallId: provider === "twilio" ? parentSid : "v3:actual-pstn-control",
    browserCallId:
      provider === "twilio" ? childSid : "v3:actual-browser-control-id",
    ...(provider === "telnyx"
      ? {
          browserCallLegId: "actual-browser-leg",
          callSessionId: "actual-call-session",
        }
      : {}),
    reservationId: "reservation-a",
    phase: "offered",
    topology:
      provider === "twilio" ? "twilio-dial-client" : "telnyx-sip-bridge",
    browserAnswered: false,
    bridgeObserved: false,
  };
}

// Fake authenticated HTTP boundary. No SDK or provider API request leaves tests.
function backend(provider) {
  const requests = [];
  const streams = new Set();
  const scope = {
    sessionId: "session-a",
    tenantId: "tenant-a",
    agentId: "agent-a",
    provider,
  };
  let revision = 0;
  let cursor = 0;
  let snapshot = initialSnapshot(provider);
  let bindings = [];
  let sessionCounter = 0;
  let currentToken = "session-bearer-initial-fixture";
  let credentials = jwt();
  let commandReply;
  let sessionReply;
  let failCommandOnce = false;
  let replyLostOnce = false;
  let eventRequests = 0;
  const commandResults = new Map();
  const capabilities = {
    inbound: true,
    outboundPstn: false,
    hold: false,
    transfer: false,
    recording: false,
    dtmf: true,
    mute: true,
    notes: true,
  };
  function envelope(result, error = null) {
    return {
      type: "snapshot",
      contractVersion: version,
      scope,
      revision,
      cursor,
      snapshot: copy(snapshot),
      capabilities: copy(capabilities),
      bindings: copy(bindings),
      ...(result ? { result } : {}),
      error,
    };
  }
  function response(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
  function send(value = envelope(), split = false) {
    const frame = `: heartbeat\r\nid: ${value.cursor}\r\nevent: snapshot\r\ndata: ${JSON.stringify(value)}\r\n\r\n`;
    const bytes = new TextEncoder().encode(frame);
    for (const controller of streams) {
      if (split) {
        for (let i = 0; i < bytes.length; i += 7)
          controller.enqueue(bytes.slice(i, i + 7));
      } else controller.enqueue(bytes);
    }
  }
  const fetcher = async (url, init) => {
    const path = String(url);
    const headers = new Headers(init.headers);
    const input = init.body ? JSON.parse(init.body) : null;
    requests.push({ path, init, headers, input });
    assert.equal(
      path.includes("?"),
      false,
      "auth must never enter a query URL",
    );
    if (path.endsWith("/session")) {
      sessionCounter += 1;
      if (sessionReply) return response(sessionReply());
      if (headers.get("Authorization") === `Bearer ${currentToken}`) {
        currentToken = `session-bearer-renewed-fixture-${sessionCounter}`;
        credentials = jwt(900000, `renewed-${sessionCounter}`);
      } else {
        assert.equal(
          headers.get("Authorization"),
          "Bearer bootstrap-fixture-only",
        );
      }
      return response({
        contractVersion: version,
        ...scope,
        sessionToken: currentToken,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        credentials: {
          ...credentials,
          kind:
            provider === "twilio"
              ? "twilio-access-token"
              : "telnyx-login-token",
        },
        envelope: envelope(),
      });
    }
    assert.equal(headers.get("Authorization"), `Bearer ${currentToken}`);
    if (path.endsWith("/events")) {
      eventRequests += 1;
      return new Response(
        new ReadableStream({
          start(controller) {
            streams.add(controller);
          },
          cancel() {
            streams.clear();
          },
        }),
        { headers: { "Content-Type": "text/event-stream" } },
      );
    }
    assert.ok(path.endsWith("/commands"));
    assert.equal(init.method, "POST");
    assert.match(input.commandId, /^[0-9a-f-]{36}$/);
    if (failCommandOnce) {
      failCommandOnce = false;
      throw new Error("synthetic network failure with no command outcome");
    }
    if (commandReply) return commandReply(input, envelope, response);
    if (commandResults.has(input.commandId)) {
      const duplicate = copy(commandResults.get(input.commandId));
      duplicate.result.outcome = "duplicate";
      return response(duplicate);
    }
    assert.equal(input.expectedRevision, revision);
    revision += 1;
    cursor += 1;
    if (input.type === "connect")
      snapshot = { ...snapshot, connection: "ready" };
    if (input.type === "presence")
      snapshot = { ...snapshot, presence: input.payload.presence };
    if (input.type === "accept") {
      assert.equal(input.callId, snapshot.activeCall.id);
      snapshot = {
        ...snapshot,
        activeCall: { ...snapshot.activeCall, status: "connecting" },
      };
      bindings[0].phase = "connecting";
    }
    if (input.type === "mute")
      snapshot = {
        ...snapshot,
        activeCall: { ...snapshot.activeCall, muted: input.payload.muted },
      };
    if (input.type === "dtmf")
      snapshot = {
        ...snapshot,
        activeCall: {
          ...snapshot.activeCall,
          dtmfDigits:
            (snapshot.activeCall.dtmfDigits ?? "") + input.payload.digit,
        },
      };
    if (input.type === "notes")
      snapshot = {
        ...snapshot,
        activeCall: { ...snapshot.activeCall, notes: input.payload.text },
      };
    if (input.type === "hangup" || input.type === "decline")
      bindings[0].phase = "ending";
    if (input.type === "disconnect")
      snapshot = {
        ...snapshot,
        connection: "disconnected",
        presence: "offline",
      };
    const result = envelope({ commandId: input.commandId, outcome: "applied" });
    commandResults.set(input.commandId, result);
    if (replyLostOnce) {
      replyLostOnce = false;
      throw new Error("synthetic response lost after backend mutation");
    }
    return response(result);
  };
  return {
    requests,
    fetcher,
    scope,
    envelope,
    get eventRequests() {
      return eventRequests;
    },
    get sessionCounter() {
      return sessionCounter;
    },
    get streams() {
      return streams.size;
    },
    offer(change = {}) {
      revision += 1;
      cursor += 1;
      snapshot = {
        ...snapshot,
        activeCall: { ...callProjection(provider), ...change },
      };
      bindings = [callBinding(provider)];
      send();
    },
    confirmed() {
      revision += 1;
      cursor += 1;
      snapshot = {
        ...snapshot,
        activeCall: {
          ...snapshot.activeCall,
          status: "active",
          answeredAt: Date.now(),
        },
      };
      bindings[0].phase = "connected";
      bindings[0].browserAnswered = true;
      bindings[0].bridgeObserved = true;
      send();
    },
    finish() {
      revision += 1;
      cursor += 1;
      const ended = {
        ...snapshot.activeCall,
        status: "completed",
        endedAt: Date.now(),
      };
      snapshot = { ...snapshot, activeCall: null, history: [ended] };
      bindings[0].phase = "ended";
      send();
    },
    update(edit) {
      revision += 1;
      cursor += 1;
      edit({ snapshot, bindings, scope, capabilities });
      send();
    },
    inject: send,
    injectFrames(...values) {
      const bytes = new TextEncoder().encode(
        values
          .map(
            (value) =>
              `id: ${value.cursor}\nevent: snapshot\ndata: ${JSON.stringify(value)}\n\n`,
          )
          .join(""),
      );
      for (const controller of streams) controller.enqueue(bytes);
    },
    closeEvents() {
      for (const controller of streams) controller.close();
      streams.clear();
    },
    set commandReply(fn) {
      commandReply = fn;
    },
    set sessionReply(fn) {
      sessionReply = fn;
    },
    set failCommandOnce(value) {
      failCommandOnce = value;
    },
    set replyLostOnce(value) {
      replyLostOnce = value;
    },
  };
}
function live(t, provider, options = {}) {
  const sdk = native(provider);
  const http = backend(provider);
  const adapter = createLiveCommunicationsAdapter({
    provider,
    baseUrl: "/v1/communications",
    fetch: http.fetcher,
    getAuthHeaders: () => ({ Authorization: "Bearer bootstrap-fixture-only" }),
    voiceClientFactory: () => sdk.binding,
    ...options,
  });
  t.after(() => adapter.dispose());
  return {
    ...sdk,
    http,
    adapter,
    get creations() {
      return sdk.creations;
    },
  };
}
async function offered(env) {
  await env.adapter.connect();
  env.http.offer();
  env.incoming();
  await flush();
}
async function active(env) {
  await offered(env);
  await env.adapter.accept("logical-call-a");
  env.http.confirmed();
  await flush();
}

test("optional construction is inert; a missing SDK factory fails before HTTP", async () => {
  let calls = 0;
  const adapter = createLiveCommunicationsAdapter({
    provider: "twilio",
    baseUrl: "/v1/communications",
    fetch: async () => {
      calls += 1;
      throw new Error("must not fetch");
    },
  });
  assert.equal(adapter.getSnapshot().mode, "live");
  assert.equal(adapter.getSnapshot().connection, "disconnected");
  assert.equal(calls, 0);
  await assert.rejects(adapter.connect(), code("invalid-argument"));
  assert.equal(calls, 0);
  adapter.dispose();
  assert.throws(
    () =>
      createLiveCommunicationsAdapter({
        provider: "twilio",
        baseUrl: "https://approved.example/v1/../secret",
        trustedBackendOrigins: ["https://approved.example"],
      }),
    code("invalid-argument"),
  );
});
test("token validation rejects malformed/expired JWTs and mismatched expiry without SDK authentication claims", () => {
  const token = jwt();
  assert.deepEqual(parseVoiceAccessToken(token), token);
  for (const invalid of [
    null,
    {},
    { token: "secret", expiresAt: token.expiresAt },
    jwt(-10000),
    { ...token, token: "a.b.c" },
    { ...token, expiresAt: new Date(Date.now() + 900000).toISOString() },
    { ...token, secret: "must not become public" },
  ])
    assert.throws(
      () => parseVoiceAccessToken(invalid),
      code("invalid-argument"),
    );
});
test("API mount allowlist rejects query auth, redirects, encoded traversal and non-approved origins", () => {
  for (const baseUrl of [
    "//unapproved.example/v1",
    "/v1?token=x",
    "/v1#token",
    "/v1/../secret",
    "/v1/%2e%2e",
    "/v1\\bad",
    "https://unapproved.example/v1",
    "http://example.com/v1",
    "https://u:p@example.com/v1",
  ])
    assert.throws(
      () => createLiveCommunicationsAdapter({ provider: "twilio", baseUrl }),
      code("invalid-argument"),
    );
  const adapter = createLiveCommunicationsAdapter({
    provider: "telnyx",
    baseUrl: "http://127.0.0.1:8787/v1/communications",
    trustedBackendOrigins: ["http://127.0.0.1:8787"],
  });
  adapter.dispose();
});
test("wire schemas reject foreign providers, duplicate IDs, terminal queues and unbounded or demo payloads", () => {
  const http = backend("twilio");
  assert.ok(
    communicationsSnapshotEnvelopeSchema.safeParse(http.envelope()).success,
  );
  const call = callProjection("twilio");
  for (const invalid of [
    { ...initialSnapshot("twilio"), mode: "demo" },
    {
      ...initialSnapshot("twilio"),
      activeCall: { ...call, provider: "telnyx" },
    },
    { ...initialSnapshot("twilio"), queue: [{ ...call, status: "completed" }] },
    {
      ...initialSnapshot("twilio"),
      activeCall: call,
      queue: [{ ...call, status: "queued" }],
    },
    {
      ...initialSnapshot("twilio"),
      activeCall: { ...call, notes: "x".repeat(2001) },
    },
    { ...initialSnapshot("twilio"), credentials: "secret" },
  ])
    assert.equal(
      communicationsLiveSnapshotSchema.safeParse(invalid).success,
      false,
    );
});

for (const provider of ["twilio", "telnyx"]) {
  test(`${provider} native lifecycle: lazy registration, explicit answer, mute/DTMF and full local teardown`, async (t) => {
    const env = native(provider);
    t.after(() => env.binding.dispose());
    const events = [];
    env.binding.subscribe((event) => events.push(event));
    assert.equal(env.creations, 0);
    assert.deepEqual(env.binding.getCalls(), []);
    const signal = new AbortController().signal;
    await env.binding.connect(jwt(), signal);
    assert.equal(env.creations, 1);
    assert.ok(events.some((event) => event.type === "ready"));
    env.incoming();
    assert.equal(
      env.call.operations.length,
      0,
      "incoming must never auto-answer",
    );
    const view = env.binding.getCalls()[0];
    assert.equal(view.provider, provider);
    assert.equal(
      view.nativeCallId,
      provider === "twilio" ? childSid : "sdk-local-uuid",
    );
    assert.equal(
      view.browserCallId,
      provider === "twilio" ? childSid : "v3:actual-browser-control-id",
    );
    await env.binding.accept(view.nativeCallId);
    await env.binding.setMuted(view.nativeCallId, true);
    await env.binding.setMuted(view.nativeCallId, false);
    await env.binding.sendDtmf(view.nativeCallId, "#");
    assert.deepEqual(
      env.call.operations.map((op) => op[0]),
      provider === "twilio"
        ? ["accept", "mute", "mute", "sendDigits"]
        : ["answer", "muteAudio", "unmuteAudio", "dtmf"],
    );
    assert.deepEqual(
      env.call.operations[0][1],
      provider === "twilio"
        ? { rtcConstraints: { audio: true, video: false } }
        : { audio: true, video: false },
    );
    assert.ok(
      events.some(
        (event) =>
          event.type === "microphone" && event.permission === "granted",
      ),
    );
    const local = provider === "twilio" ? env.call.local : env.call.localStream;
    const remote =
      provider === "twilio" ? env.call.remote : env.call.remoteStream;
    await env.binding.hangup(view.nativeCallId);
    assert.deepEqual(env.binding.getCalls(), []);
    assert.ok(local.track.stops > 0 && remote.track.stops > 0);
    env.binding.dispose();
    env.binding.dispose();
    assert.equal(env.sdk.eventNames().length, 0);
    if (provider === "twilio") {
      assert.equal(env.sdk.destroyed, 1);
      assert.equal(env.sdk.options.tokenRefreshMs, 10000);
      assert.equal(env.call.eventNames().length, 0);
    } else {
      assert.equal(env.sdk.disconnects, 1);
      assert.equal(env.sdk.outboundCalls, 0);
      assert.ok(env.sdk.cacheClears >= 2);
    }
  });
  test(`${provider} native decline uses its exact official rejection primitive`, async (t) => {
    const env = native(provider);
    t.after(() => env.binding.dispose());
    await env.binding.connect(jwt(), new AbortController().signal);
    env.incoming();
    await env.binding.decline(env.binding.getCalls()[0].nativeCallId);
    assert.deepEqual(
      env.call.operations.map((op) => op[0]),
      [provider === "twilio" ? "reject" : "hangup"],
    );
  });
  test(`${provider} rejects bad tokens before invoking the consumer SDK factory`, async (t) => {
    const env = native(provider);
    t.after(() => env.binding.dispose());
    await assert.rejects(
      env.binding.connect(
        { token: "invalid", expiresAt: jwt().expiresAt },
        new AbortController().signal,
      ),
      code("invalid-argument"),
    );
    assert.equal(env.creations, 0);
    assert.equal(env.sdk.eventNames().length, 0);
  });
  test(`${provider} invalid notifications do not become offers, media or call actions`, async (t) => {
    const env = native(provider);
    t.after(() => env.binding.dispose());
    const events = [];
    env.binding.subscribe((event) => events.push(event));
    await env.binding.connect(jwt(), new AbortController().signal);
    if (provider === "twilio")
      env.sdk.emit("incoming", { parameters: { CallSid: "bad" } });
    else
      env.sdk.emit("telnyx.notification", {
        type: "callUpdate",
        call: { id: "bad", state: "ringing" },
      });
    assert.deepEqual(env.binding.getCalls(), []);
    assert.ok(
      events.some(
        (event) =>
          event.type === "error" && event.code === "invalid-notification",
      ),
    );
    assert.equal(env.call.operations.length, 0);
  });
  test(`${provider} renewal invokes the actual published native method and warning event`, async (t) => {
    const env = native(provider);
    t.after(() => env.binding.dispose());
    const events = [];
    env.binding.subscribe((event) => events.push(event));
    await env.binding.connect(jwt(), new AbortController().signal);
    if (provider === "twilio") env.sdk.emit("tokenWillExpire", env.sdk);
    else
      env.sdk.emit("telnyx.warning", {
        warning: { code: 34001 },
        sessionId: "sdk-session",
      });
    assert.ok(events.some((event) => event.type === "token-expiring"));
    const token = jwt(900000);
    await env.binding.refreshToken(token, new AbortController().signal);
    if (provider === "twilio") assert.equal(env.sdk.tokens.at(-1), token.token);
    else
      assert.deepEqual(env.sdk.loginCalls.at(-1), { login_token: token.token });
    assert.equal(env.call.operations.length, 0);
  });
  test(`${provider} live wire registers before connect, answers after ACK and keeps remote confirmation authoritative`, async (t) => {
    const env = live(t, provider);
    const original = env.adapter.getSnapshot();
    assert.equal(env.adapter.getSnapshot(), original);
    await offered(env);
    const offer = env.adapter.getSnapshot();
    assert.equal(offer.activeCall.id, "logical-call-a");
    assert.notEqual(
      offer.activeCall.providerCallId,
      provider === "twilio" ? childSid : "sdk-local-uuid",
    );
    assert.equal(env.call.operations.length, 0);
    assert.deepEqual(offer.caps, { hold: false, mute: false, dtmf: false });
    assert.equal(Object.isFrozen(offer.activeCall), true);
    const acceptHttp = deferred();
    const accepted = deferred();
    env.http.commandReply = (input, envelope, response) => {
      accepted.resolve(input);
      return acceptHttp.promise.then(() =>
        response(
          envelope({
            commandId: input.commandId,
            outcome: "applied",
          }),
        ),
      );
    };
    const pending = env.adapter.accept("logical-call-a");
    const command = await accepted.promise;
    assert.equal(command.type, "accept");
    assert.equal(
      env.call.operations.length,
      0,
      "SDK answer must wait for backend approval",
    );
    acceptHttp.resolve();
    await pending;
    assert.equal(
      env.call.operations[0][0],
      provider === "twilio" ? "accept" : "answer",
    );
    assert.equal(
      env.adapter.getSnapshot().activeCall.status,
      "ringing",
      "SDK media alone is not carrier answer/bridge evidence",
    );
    env.http.commandReply = undefined;
    env.http.confirmed();
    await flush();
    assert.equal(env.adapter.getSnapshot().activeCall.status, "active");
    assert.equal(
      env.adapter.getSnapshot().audio.microphonePermission,
      "granted",
    );
    assert.deepEqual(env.adapter.getSnapshot().caps, {
      hold: false,
      mute: true,
      dtmf: true,
    });
    assert.equal(env.http.requests[0].path, "/v1/communications/session");
    assert.equal(env.http.requests[1].input.type, "connect");
    for (const request of env.http.requests) {
      assert.equal(request.init.redirect, "error");
      assert.equal(request.init.cache, "no-store");
      assert.equal(request.init.credentials, "same-origin");
      assert.ok(request.init.signal instanceof AbortSignal);
    }
  });
  test(`${provider} actual SDK mute, DTMF and local hangup are separate from remote terminal evidence`, async (t) => {
    const env = live(t, provider);
    await active(env);
    await env.adapter.setMuted("logical-call-a", true);
    await env.adapter.setMuted("logical-call-a", false);
    await env.adapter.sendDtmf("logical-call-a", "5");
    await env.adapter.setNotes("logical-call-a", "Reviewed synthetic note.");
    assert.deepEqual(
      env.call.operations.slice(1).map((op) => op[0]),
      provider === "twilio"
        ? ["mute", "mute", "sendDigits"]
        : ["muteAudio", "unmuteAudio", "dtmf"],
    );
    await env.adapter.hangup("logical-call-a");
    assert.notEqual(env.adapter.getSnapshot().activeCall, null);
    assert.equal(env.adapter.getSnapshot().activeCall.status, "active");
    assert.match(env.adapter.getSnapshot().error, /reconciliation/);
    env.http.finish();
    await flush();
    assert.equal(env.adapter.getSnapshot().activeCall, null);
    assert.equal(env.adapter.getSnapshot().history[0].status, "completed");
  });
  test(`${provider} common hold and invalid input stop before SDK/HTTP effects`, async (t) => {
    const env = live(t, provider);
    await active(env);
    const count = env.http.requests.length;
    const nativeCount = env.call.operations.length;
    for (const digit of ["", "12", "w", "A", "1\n"])
      await assert.rejects(
        env.adapter.sendDtmf("logical-call-a", digit),
        code("invalid-argument"),
      );
    await assert.rejects(
      env.adapter.setMuted("logical-call-a", "true"),
      code("invalid-argument"),
    );
    await assert.rejects(
      env.adapter.setPresence("busy"),
      code("invalid-argument"),
    );
    await assert.rejects(
      env.adapter.setNotes("logical-call-a", "x".repeat(2001)),
      code("invalid-argument"),
    );
    await assert.rejects(
      env.adapter.setHeld("logical-call-a", true),
      code("invalid-transition"),
    );
    await assert.rejects(
      env.adapter.hangup("not-owned"),
      code("invalid-transition"),
    );
    assert.equal(env.http.requests.length, count);
    assert.equal(env.call.operations.length, nativeCount);
  });
  test(`${provider} exact leg mapping rejects mismatches before microphone or accept intent`, async (t) => {
    const env = live(t, provider);
    await offered(env);
    env.http.update(({ bindings }) => {
      bindings[0].browserCallId = "wrong-actual-browser-id";
      bindings[0].reservationId = "new-reservation";
    });
    await flush();
    const count = env.http.requests.length;
    await assert.rejects(
      env.adapter.accept("logical-call-a"),
      code("invalid-transition"),
    );
    assert.equal(env.call.operations.length, 0);
    assert.equal(env.http.requests.length, count);
    assert.equal(
      env.adapter.getSnapshot().audio.microphonePermission,
      "unknown",
    );
  });
  test(`${provider} unknown/denied command outcomes never auto-answer or claim success`, async (t) => {
    const env = live(t, provider);
    await offered(env);
    for (const status of [202, 403, 409, 422, 502]) {
      env.http.commandReply = (input, envelope, response) =>
        response(
          envelope({
            commandId: input.commandId,
            outcome: status === 202 ? "unknown" : "applied",
          }),
          status,
        );
      await assert.rejects(env.adapter.accept("logical-call-a"));
      assert.equal(env.call.operations.length, 0);
      assert.equal(env.adapter.getSnapshot().activeCall.id, "logical-call-a");
    }
  });
  test(`${provider} response loss retries the same command ID and sends a local tone only once`, async (t) => {
    const env = live(t, provider);
    await active(env);
    env.http.replyLostOnce = true;
    await assert.rejects(
      env.adapter.sendDtmf("logical-call-a", "2"),
      code("disconnected"),
    );
    const first = env.http.requests.at(-1).input;
    assert.equal(
      env.call.operations.filter((op) => ["dtmf", "sendDigits"].includes(op[0]))
        .length,
      0,
    );
    await env.adapter.sendDtmf("logical-call-a", "2");
    assert.equal(env.http.requests.at(-1).input.commandId, first.commandId);
    assert.equal(
      env.call.operations.filter((op) => ["dtmf", "sendDigits"].includes(op[0]))
        .length,
      1,
    );
  });
  test(`${provider} backend and carrier tokens remain private memory; disconnect releases native listeners/media`, async (t) => {
    const env = live(t, provider);
    await active(env);
    const snapshot = JSON.stringify(env.adapter.getSnapshot());
    assert.equal(snapshot.includes("session-bearer"), false);
    assert.equal(snapshot.includes("c3ludGhldGlj"), false);
    const local = provider === "twilio" ? env.call.local : env.call.localStream;
    await env.adapter.disconnect();
    assert.equal(env.adapter.getSnapshot().connection, "disconnected");
    assert.equal(env.adapter.getSnapshot().presence, "offline");
    assert.notEqual(
      env.adapter.getSnapshot().activeCall,
      null,
      "a browser disconnect is not a PSTN completion receipt",
    );
    assert.equal(env.sdk.eventNames().length, 0);
    assert.ok(local.track.stops > 0);
    assert.equal(env.http.streams, 0);
  });
}

test("Telnyx renewal rejects the published dead-socket early-return instead of treating a resolved login as success", async (t) => {
  const env = native("telnyx", { registrationTimeoutMs: 15 });
  t.after(() => env.binding.dispose());
  await env.binding.connect(jwt(), new AbortController().signal);
  env.sdk.loginMode = "early-return";
  await assert.rejects(
    env.binding.refreshToken(jwt(900000), new AbortController().signal),
    code("disconnected"),
  );
  env.sdk.connected = false;
  await assert.rejects(
    env.binding.refreshToken(jwt(900000), new AbortController().signal),
    code("disconnected"),
  );
});
test("Telnyx media errors report real denied/unavailable codes without invoking recovery callbacks or answering", async (t) => {
  const env = live(t, "telnyx");
  await offered(env);
  let resumed = 0;
  env.sdk.emit("telnyx.error", {
    error: { code: 42001, message: "private synthetic error" },
    recoverable: true,
    resume: () => {
      resumed += 1;
    },
    reject() {},
  });
  assert.equal(env.adapter.getSnapshot().audio.microphonePermission, "denied");
  assert.equal(resumed, 0);
  assert.equal(env.call.operations.length, 0);
  assert.equal(
    JSON.stringify(env.adapter.getSnapshot()).includes("private synthetic"),
    false,
  );
});
test("Twilio logical custom parameters require the exact reservation when the signed child callback is pending", async (t) => {
  const env = live(t, "twilio");
  await offered(env);
  env.http.update(({ bindings }) => {
    delete bindings[0].browserCallId;
  });
  await flush();
  await env.adapter.accept("logical-call-a");
  assert.equal(env.call.operations[0][0], "accept");
});
test("Twilio rejects stale or incomplete custom-parameter identity even when a logical label matches", async (t) => {
  const env = live(t, "twilio");
  env.call.customParameters.delete("aureformReservationId");
  await offered(env);
  env.http.update(({ bindings }) => {
    delete bindings[0].browserCallId;
  });
  await flush();
  await assert.rejects(
    env.adapter.accept("logical-call-a"),
    code("invalid-transition"),
  );
  assert.equal(env.call.operations.length, 0);
});
test("Telnyx local call.id equality cannot substitute for real control/leg/session IDs", async (t) => {
  const env = live(t, "telnyx");
  env.call.id = "v3:actual-browser-control-id";
  env.call.telnyxIDs.telnyxLegId = "wrong-leg";
  await offered(env);
  await assert.rejects(
    env.adapter.accept("logical-call-a"),
    code("invalid-transition"),
  );
  assert.equal(env.call.operations.length, 0);
});
test("SSE handles chunked UTF-8/CRLF and ignores stale revisions without guessing missed events", async (t) => {
  const env = live(t, "twilio");
  await offered(env);
  const old = env.http.envelope();
  env.http.update(({ snapshot }) => {
    snapshot.activeCall.callerName = "Número sintético — José";
  });
  const current = env.http.envelope();
  env.http.inject(current, true);
  await flush();
  assert.equal(
    env.adapter.getSnapshot().activeCall.callerName,
    "Número sintético — José",
  );
  const stable = env.adapter.getSnapshot();
  env.http.inject(old);
  await flush();
  assert.equal(env.adapter.getSnapshot(), stable);
  const gap = copy(current);
  gap.revision += 10;
  gap.cursor += 10;
  gap.snapshot.activeCall.callerName = "Full current projection";
  env.http.inject(gap);
  await flush();
  assert.equal(
    env.adapter.getSnapshot().activeCall.callerName,
    "Full current projection",
  );
});
test("foreign scope SSE state is rejected while remote reservations remain visible", async (t) => {
  const env = live(t, "telnyx");
  await offered(env);
  const bad = env.http.envelope();
  bad.scope.tenantId = "foreign-tenant";
  env.http.inject(bad);
  await flush();
  assert.equal(env.adapter.getSnapshot().connection, "error");
  assert.equal(env.adapter.getSnapshot().activeCall.id, "logical-call-a");
  assert.equal(env.call.operations.length, 0);
});
test("unrevisioned and late buffered SSE frames cannot resurrect a quarantined stream", async (t) => {
  const env = live(t, "twilio");
  await offered(env);
  const invalid = env.http.envelope();
  invalid.snapshot.activeCall.callerName = "Unrevisioned mutation";
  const later = copy(invalid);
  later.revision += 1;
  later.cursor += 1;
  later.snapshot.activeCall.callerName = "Late buffered frame";
  env.http.injectFrames(invalid, later);
  await flush();
  assert.equal(env.adapter.getSnapshot().connection, "error");
  assert.equal(
    env.adapter.getSnapshot().activeCall.callerName,
    "Synthetic caller",
  );
  assert.equal(env.http.streams, 0);
  assert.equal(env.call.operations.length, 0);
});
test("bounded SSE reconnect retains the SDK and offer; never answers or dials during recovery", async (t) => {
  const env = live(t, "telnyx", {
    eventReconnectDelayMs: 1,
    maxEventReconnectAttempts: 2,
  });
  await offered(env);
  env.http.closeEvents();
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(env.http.eventRequests, 2);
  assert.equal(env.sdk.connects, 1);
  assert.equal(env.sdk.outboundCalls, 0);
  assert.equal(env.call.operations.length, 0);
  assert.equal(env.adapter.getSnapshot().activeCall.id, "logical-call-a");
});
test("live token renewal preserves the exact authenticated session and updates the native Device", async (t) => {
  const env = live(t, "twilio");
  await env.adapter.connect();
  env.sdk.emit("tokenWillExpire");
  await flush();
  await flush();
  assert.equal(env.http.sessionCounter, 2);
  assert.equal(env.sdk.tokens.length, 2);
  assert.equal(env.sdk.registered, 1);
  assert.equal(
    env.http.requests
      .findLast((request) => request.path.endsWith("/session"))
      .headers.get("Authorization"),
    "Bearer session-bearer-initial-fixture",
  );
  assert.equal(env.adapter.getSnapshot().connection, "ready");
});
test("wrong identity during renewal is rejected before a native token update", async (t) => {
  const env = live(t, "twilio");
  await env.adapter.connect();
  env.http.sessionReply = () => {
    const envelope = env.http.envelope();
    envelope.scope.agentId = "other-agent";
    return {
      contractVersion: version,
      ...envelope.scope,
      sessionToken: "session-bearer-other-fixture",
      expiresAt: jwt().expiresAt,
      credentials: { ...jwt(), kind: "twilio-access-token" },
      envelope,
    };
  };
  env.sdk.emit("tokenWillExpire");
  await flush();
  await flush();
  assert.equal(env.sdk.tokens.length, 1);
  assert.equal(env.adapter.getSnapshot().connection, "error");
});
test("disposal cancels a pending SDK factory, disposes its late result and prevents state resurrection", async (t) => {
  const prepared = deferred();
  const requested = deferred();
  const sdk = native("twilio");
  const env = live(t, "twilio", {
    voiceClientFactory: () => {
      requested.resolve();
      return prepared.promise;
    },
  });
  const pending = env.adapter.connect();
  const rejected = assert.rejects(pending, code("cancelled"));
  await requested.promise;
  env.adapter.dispose();
  prepared.resolve(sdk.binding);
  await rejected;
  await flush();
  assert.equal(sdk.creations, 0);
  await assert.rejects(
    sdk.binding.connect(jwt(), new AbortController().signal),
    code("disposed"),
  );
  assert.equal(env.adapter.getSnapshot().connection, "disconnected");
  await assert.rejects(env.adapter.connect(), code("disposed"));
});
test("registration failure releases native listeners and never reports backend connect/ready", async (t) => {
  const env = live(t, "twilio");
  env.sdk.failRegistration = true;
  await assert.rejects(env.adapter.connect(), code("disconnected"));
  assert.equal(env.adapter.getSnapshot().connection, "error");
  assert.equal(env.sdk.eventNames().length, 0);
  assert.equal(env.sdk.destroyed, 1);
  assert.equal(
    env.http.requests.some((request) => request.input?.type === "connect"),
    false,
  );
});
test("invalid session credential payloads stop before any SDK factory invocation", async (t) => {
  const env = live(t, "telnyx");
  env.http.sessionReply = () => ({
    contractVersion: version,
    ...env.http.scope,
    sessionToken: "session-bearer-fixture-only",
    expiresAt: jwt().expiresAt,
    credentials: {
      kind: "telnyx-login-token",
      token: "invalid",
      expiresAt: jwt().expiresAt,
    },
    envelope: env.http.envelope(),
  });
  await assert.rejects(env.adapter.connect(), code("invalid-argument"));
  assert.equal(env.sdk.connects, 0);
});
test("subscribe/unsubscribe and stable snapshots isolate presentation failures from transport state", async (t) => {
  const env = live(t, "twilio");
  let emissions = 0;
  const unsubscribe = env.adapter.subscribe(() => {
    emissions += 1;
  });
  const throwing = env.adapter.subscribe(() => {
    throw new Error("presentation-only");
  });
  await env.adapter.connect();
  const stable = env.adapter.getSnapshot();
  env.http.inject(env.http.envelope());
  await flush();
  assert.equal(env.adapter.getSnapshot(), stable);
  unsubscribe();
  throwing();
  const count = emissions;
  await env.adapter.setPresence("away");
  assert.equal(env.adapter.getSnapshot().presence, "away");
  assert.equal(emissions, count);
});

for (const provider of ["twilio", "telnyx"]) {
  test(`${provider} direct binding cancels a pending factory and disposes its late result without registering`, async (t) => {
    for (const action of ["abort", "dispose"]) {
      const loaded = deferred();
      const requested = deferred();
      const sdk =
        provider === "twilio" ? new FakeTwilioDevice() : new FakeTelnyxClient();
      const factory = () => {
        requested.resolve();
        return loaded.promise;
      };
      const binding =
        provider === "twilio"
          ? createTwilioBrowserVoiceClient({ createDevice: factory })
          : createTelnyxBrowserVoiceClient({ createClient: factory });
      t.after(() => binding.dispose());
      const controller = new AbortController();
      const pending = binding.connect(jwt(), controller.signal);
      const rejected = assert.rejects(pending, code("cancelled"));
      await requested.promise;
      if (action === "abort") controller.abort();
      else binding.dispose();
      await rejected;
      loaded.resolve(sdk);
      await flush();
      assert.equal(provider === "twilio" ? sdk.registered : sdk.connects, 0);
      assert.equal(provider === "twilio" ? sdk.destroyed : sdk.disconnects, 1);
      assert.equal(sdk.eventNames().length, 0);
    }
  });
  test(`${provider} cancellation during an SDK module loader never constructs a late native client`, async (t) => {
    const loaded = deferred();
    const requested = deferred();
    let constructions = 0;
    const loader = () => {
      requested.resolve();
      return loaded.promise;
    };
    const binding =
      provider === "twilio"
        ? createTwilioBrowserVoiceClient({ loadSdk: loader })
        : createTelnyxBrowserVoiceClient({ loadSdk: loader });
    t.after(() => binding.dispose());
    const controller = new AbortController();
    const pending = binding.connect(jwt(), controller.signal);
    const rejected = assert.rejects(pending, code("cancelled"));
    await requested.promise;
    controller.abort();
    await rejected;
    const Constructor =
      provider === "twilio" ? FakeTwilioDevice : FakeTelnyxClient;
    class Native extends Constructor {
      constructor() {
        super();
        constructions += 1;
      }
    }
    loaded.resolve(
      provider === "twilio" ? { Device: Native } : { TelnyxRTC: Native },
    );
    await flush();
    assert.equal(constructions, 0);
  });
  test(`${provider} recovered registration confirms the same backend session without re-answering an offer`, async (t) => {
    const env = live(t, provider);
    await offered(env);
    if (provider === "twilio") env.sdk.emit("registering");
    else {
      env.sdk.connected = false;
      env.sdk.emit("telnyx.socket.close");
    }
    assert.equal(env.adapter.getSnapshot().connection, "reconnecting");
    assert.equal(env.adapter.getSnapshot().activeCall.id, "logical-call-a");
    if (provider === "twilio") env.sdk.emit("registered");
    else {
      env.sdk.connected = true;
      env.sdk.emit("telnyx.ready");
    }
    await flush();
    assert.equal(env.adapter.getSnapshot().connection, "ready");
    assert.equal(env.http.sessionCounter, 1);
    assert.equal(
      env.http.requests.filter((request) => request.input?.type === "connect")
        .length,
      2,
    );
    assert.equal(env.call.operations.length, 0);
    await env.adapter.accept("logical-call-a");
    assert.equal(env.call.operations.length, 1);
  });
  test(`${provider} explicit connect after SSE loss retains the existing session, native client and exact offer`, async (t) => {
    const env = live(t, provider, { eventReconnectDelayMs: 30000 });
    await offered(env);
    const original = env.binding.getCalls()[0];
    env.http.closeEvents();
    await flush();
    assert.equal(env.adapter.getSnapshot().connection, "reconnecting");
    await env.adapter.connect();
    assert.equal(env.adapter.getSnapshot().connection, "ready");
    assert.deepEqual(env.binding.getCalls()[0], original);
    assert.equal(env.http.sessionCounter, 1);
    assert.equal(env.creations, 1);
    assert.equal(
      provider === "twilio" ? env.sdk.registered : env.sdk.connects,
      1,
    );
    assert.equal(
      provider === "twilio" ? env.sdk.destroyed : env.sdk.disconnects,
      0,
    );
    assert.equal(env.call.operations.length, 0);
    await env.adapter.accept("logical-call-a");
    assert.equal(env.call.operations.length, 1);
  });
  test(`${provider} explicit connect re-registers the same native object after signaling loss without dial/answer`, async (t) => {
    const env = live(t, provider);
    await offered(env);
    if (provider === "twilio") env.sdk.emit("unregistered");
    else {
      env.sdk.connected = false;
      env.sdk.emit("telnyx.socket.close");
    }
    await env.adapter.connect();
    assert.equal(env.adapter.getSnapshot().connection, "ready");
    assert.equal(env.http.sessionCounter, 1);
    assert.equal(env.creations, 1);
    assert.equal(
      provider === "twilio" ? env.sdk.registered : env.sdk.connects,
      2,
    );
    assert.equal(
      provider === "twilio" ? env.sdk.destroyed : env.sdk.disconnects,
      0,
    );
    assert.equal(env.call.operations.length, 0);
    assert.equal(
      env.binding.getCalls()[0].nativeCallId,
      provider === "twilio" ? childSid : "sdk-local-uuid",
    );
    await env.adapter.accept("logical-call-a");
    assert.equal(env.call.operations.length, 1);
  });
  test(`${provider} failed explicit recovery retains the offer and identity for a later bounded retry`, async (t) => {
    const env = live(t, provider);
    await offered(env);
    let restore;
    if (provider === "twilio") {
      env.sdk.emit("unregistered");
      env.sdk.failRegistration = true;
      restore = () => {
        env.sdk.failRegistration = false;
      };
    } else {
      env.sdk.connected = false;
      env.sdk.emit("telnyx.socket.close");
      const connect = env.sdk.connect.bind(env.sdk);
      env.sdk.connect = async () => {
        throw new Error("synthetic socket failure");
      };
      restore = () => {
        env.sdk.connect = connect;
      };
    }
    await assert.rejects(env.adapter.connect(), code("disconnected"));
    assert.equal(env.adapter.getSnapshot().connection, "error");
    assert.equal(env.adapter.getSnapshot().activeCall.id, "logical-call-a");
    assert.equal(env.http.sessionCounter, 1);
    assert.equal(env.creations, 1);
    assert.equal(
      provider === "twilio" ? env.sdk.destroyed : env.sdk.disconnects,
      0,
    );
    restore();
    await env.adapter.connect();
    assert.equal(env.adapter.getSnapshot().connection, "ready");
    assert.equal(env.call.operations.length, 0);
  });
  test(`${provider} caps require both backend permission and a unique confirmed usable native leg`, async (t) => {
    const env = live(t, provider);
    await active(env);
    assert.deepEqual(env.adapter.getSnapshot().caps, {
      hold: false,
      mute: true,
      dtmf: true,
    });
    env.http.update(({ bindings }) => {
      bindings[0].browserCallId = "unmatched-leg";
      bindings[0].reservationId = "stale-reservation";
    });
    await flush();
    assert.deepEqual(env.adapter.getSnapshot().caps, {
      hold: false,
      mute: false,
      dtmf: false,
    });
    env.http.update(({ bindings, capabilities, snapshot }) => {
      Object.assign(bindings[0], callBinding(provider), { phase: "connected" });
      capabilities.mute = false;
      capabilities.dtmf = false;
      snapshot.caps = { hold: true, mute: true, dtmf: true };
    });
    await flush();
    assert.deepEqual(env.adapter.getSnapshot().caps, {
      hold: false,
      mute: false,
      dtmf: false,
    });
    assert.equal(Object.isFrozen(env.adapter.getCapabilities()), true);
  });
  test(`${provider} hangup remains an authorized backend action during SSE/SDK loss and preserves unknown remote state`, async (t) => {
    const env = live(t, provider, { eventReconnectDelayMs: 30000 });
    await active(env);
    if (provider === "twilio") env.sdk.emit("unregistered");
    else {
      env.sdk.connected = false;
      env.sdk.emit("telnyx.socket.close");
    }
    env.http.closeEvents();
    await flush();
    assert.equal(env.adapter.getSnapshot().connection, "reconnecting");
    env.http.commandReply = (input, envelope, response) =>
      response(
        envelope({ commandId: input.commandId, outcome: "unknown" }),
        202,
      );
    await assert.rejects(
      env.adapter.hangup("logical-call-a"),
      code("invalid-transition"),
    );
    assert.equal(env.http.requests.at(-1).input.type, "hangup");
    assert.equal(
      env.call.operations.at(-1)[0],
      provider === "twilio" ? "disconnect" : "hangup",
    );
    assert.equal(env.adapter.getSnapshot().activeCall.id, "logical-call-a");
    assert.equal(env.adapter.getSnapshot().history.length, 0);
    assert.equal(env.adapter.getSnapshot().connection, "reconnecting");
  });
  test(`${provider} nullable backend IDs are pending data rather than invented local correlation`, async (t) => {
    const env = live(t, provider);
    await offered(env);
    env.http.update(({ bindings }) => {
      bindings[0].browserCallId = null;
      bindings[0].browserCallLegId = null;
      bindings[0].callSessionId = null;
    });
    await flush();
    assert.equal(env.adapter.getSnapshot().connection, "ready");
    assert.equal(env.adapter.getSnapshot().activeCall.id, "logical-call-a");
    assert.deepEqual(env.adapter.getSnapshot().caps, {
      hold: false,
      mute: false,
      dtmf: false,
    });
    if (provider === "twilio") await env.adapter.accept("logical-call-a");
    else {
      await assert.rejects(
        env.adapter.accept("logical-call-a"),
        code("invalid-transition"),
      );
      assert.equal(env.call.operations.length, 0);
    }
  });
}

test("Telnyx renewal awaits its authentication callback without waiting for a hung SDK return promise", async (t) => {
  const env = native("telnyx");
  t.after(() => env.binding.dispose());
  await env.binding.connect(jwt(), new AbortController().signal);
  const pending = deferred();
  env.sdk.login = (input) => {
    input.onSuccess();
    return pending.promise;
  };
  await env.binding.refreshToken(jwt(900000), new AbortController().signal);
  pending.reject(new Error("late synthetic SDK failure"));
  await flush();
});
test("Telnyx disposal cancels a hung credential renewal and isolates its late callback", async (t) => {
  const env = native("telnyx");
  t.after(() => env.binding.dispose());
  await env.binding.connect(jwt(), new AbortController().signal);
  const started = deferred();
  const pending = deferred();
  let callback;
  env.sdk.login = (input) => {
    callback = input;
    started.resolve();
    return pending.promise;
  };
  const renewing = env.binding.refreshToken(
    jwt(900000),
    new AbortController().signal,
  );
  const rejected = assert.rejects(renewing, code("cancelled"));
  await started.promise;
  env.binding.dispose();
  await rejected;
  callback.onSuccess();
  pending.resolve();
  await flush();
  assert.equal(env.sdk.disconnects, 1);
  assert.equal(env.sdk.eventNames().length, 0);
});
test("Telnyx disposal cancels a pending explicit answer and stops any microphone stream acquired late", async (t) => {
  const env = live(t, "telnyx");
  await offered(env);
  const started = deferred();
  const release = deferred();
  env.call.answer = async () => {
    started.resolve();
    await release.promise;
    env.call.localStream = media();
    env.call.remoteStream = media();
    env.call.state = "active";
    env.call.notify();
  };
  const answering = env.adapter.accept("logical-call-a");
  const rejected = assert.rejects(answering, code("cancelled"));
  await started.promise;
  env.adapter.dispose();
  await rejected;
  release.resolve();
  await flush();
  assert.ok(env.call.localStream.track.stops > 0);
  assert.ok(env.call.remoteStream.track.stops > 0);
  assert.equal(env.sdk.eventNames().length, 0);
  assert.equal(env.adapter.getSnapshot().connection, "disconnected");
  assert.equal(env.adapter.getSnapshot().activeCall.status, "connecting");
});
test("Telnyx missing actual IDs cannot be replaced by call.id; later observed IDs can map the same offer", async (t) => {
  const env = live(t, "telnyx");
  env.call.telnyxIDs = {
    telnyxCallControlId: undefined,
    telnyxLegId: null,
    telnyxSessionId: "",
  };
  await offered(env);
  assert.equal(env.binding.getCalls()[0].browserCallId, undefined);
  await assert.rejects(
    env.adapter.accept("logical-call-a"),
    code("invalid-transition"),
  );
  env.call.telnyxIDs = {
    telnyxCallControlId: "v3:actual-browser-control-id",
    telnyxLegId: "actual-browser-leg",
    telnyxSessionId: "actual-call-session",
  };
  env.incoming();
  await env.adapter.accept("logical-call-a");
  assert.equal(env.call.operations[0][0], "answer");
});
test("malformed injected SDK events cannot grant microphone permission or expose raw payloads", async (t) => {
  const sdk = native("twilio");
  let listener;
  const env = live(t, "twilio", {
    voiceClientFactory: () => ({
      ...sdk.binding,
      subscribe(receive) {
        listener = receive;
        return sdk.binding.subscribe(receive);
      },
    }),
  });
  await env.adapter.connect();
  listener({
    type: "microphone",
    permission: "arbitrary",
    credential: "private-fixture",
  });
  assert.equal(env.adapter.getSnapshot().audio.microphonePermission, "unknown");
  assert.equal(env.adapter.getSnapshot().connection, "error");
  assert.equal(
    JSON.stringify(env.adapter.getSnapshot()).includes("private-fixture"),
    false,
  );
});
test("renewal serializes with commands and coalesces simultaneous native token warnings", async (t) => {
  const env = live(t, "twilio");
  await env.adapter.connect();
  const requested = deferred();
  const resumed = deferred();
  env.http.commandReply = (input, envelope, response) => {
    requested.resolve();
    return resumed.promise.then(() =>
      response(envelope({ commandId: input.commandId, outcome: "applied" })),
    );
  };
  const pending = env.adapter.setPresence("away");
  await requested.promise;
  env.sdk.emit("tokenWillExpire");
  env.sdk.emit("tokenWillExpire");
  await flush();
  assert.equal(env.http.sessionCounter, 1);
  resumed.resolve();
  await pending;
  await flush();
  await flush();
  assert.equal(env.http.sessionCounter, 2);
  assert.equal(env.sdk.tokens.length, 2);
});
test("an old injected subscription cannot mutate a newer SSE generation", async (t) => {
  const http = backend("twilio");
  const sdk = native("twilio");
  const subscriptions = [];
  const transport = {
    async request(resource, input) {
      const response = await http.fetcher(`/v1/communications/${resource}`, {
        method: "POST",
        headers: input.headers,
        body: JSON.stringify(input.body),
      });
      return { status: response.status, body: await response.json() };
    },
    subscribe(input) {
      subscriptions.push(input);
      return () => {};
    },
  };
  const adapter = createLiveCommunicationsAdapter({
    provider: "twilio",
    baseUrl: "/v1/communications",
    transport,
    getAuthHeaders: () => ({ Authorization: "Bearer bootstrap-fixture-only" }),
    voiceClientFactory: () => sdk.binding,
  });
  t.after(() => adapter.dispose());
  await adapter.connect();
  sdk.sdk.emit("tokenWillExpire");
  await flush();
  await flush();
  assert.equal(subscriptions.length, 2);
  const foreign = http.envelope();
  foreign.scope.tenantId = "foreign";
  subscriptions[0].onEnvelope(foreign);
  subscriptions[0].onError();
  assert.equal(adapter.getSnapshot().connection, "ready");
  assert.equal(adapter.getSnapshot().error, null);
});
test("wire normalization accepts queued null reservations and the real endReason/events/audio/caps shape", () => {
  const projection = backend("telnyx").envelope();
  const waiting = { ...callProjection("telnyx"), status: "queued" };
  projection.snapshot.queue = [waiting];
  projection.bindings = [
    {
      ...callBinding("telnyx"),
      phase: "queued",
      browserCallId: null,
      browserCallLegId: null,
      callSessionId: null,
      reservationId: null,
    },
  ];
  projection.snapshot.history = [
    {
      ...callProjection("telnyx"),
      id: "ended-a",
      status: "missed",
      endedAt: 1700000010000,
      endReason: "cancelled-before-answer",
    },
  ];
  projection.snapshot.events = [
    {
      id: "event-1",
      callId: "ended-a",
      type: "ended",
      at: 1700000010000,
      source: "backend",
    },
  ];
  const parsed = communicationsSnapshotEnvelopeSchema.safeParse(projection);
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.bindings[0].reservationId, undefined);
  const invalid = copy(projection);
  invalid.bindings[0].phase = "offered";
  assert.equal(
    communicationsSnapshotEnvelopeSchema.safeParse(invalid).success,
    false,
  );
});
