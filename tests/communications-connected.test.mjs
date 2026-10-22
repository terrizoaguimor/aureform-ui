import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, test } from "node:test";
import { setImmediate as nextTurn } from "node:timers/promises";
import vm from "node:vm";
import ts from "typescript";

const sourceRoot = new URL("../src/", import.meta.url);
const resolver = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/"))
      specifier = new URL(specifier.slice(2), sourceRoot).href;
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        for (const extension of [".ts", ".tsx"]) {
          const candidate = new URL(
            `${specifier}${extension}`,
            context.parentURL,
          );
          if (existsSync(candidate))
            return nextResolve(candidate.href, context);
        }
      }
      throw error;
    }
  },
});
after(() => resolver.deregister());
const [contracts, live, setup, setupContracts, twilio, telnyx] =
  await Promise.all([
    import("../src/lib/communications/contracts.ts"),
    import("../src/lib/communications/live-adapter.ts"),
    import("../src/lib/communications/setup-adapter.ts"),
    import("../src/lib/communications/setup-contracts.ts"),
    import("../src/lib/communications/twilio-browser.ts"),
    import("../src/lib/communications/telnyx-browser.ts"),
  ]);
const originalFetch = globalThis.fetch;
globalThis.fetch = () =>
  assert.fail("Connected host tests may not use the network.");
after(() => {
  globalThis.fetch = originalFetch;
});

const mount = "https://voice.fixture.invalid/v1/communications";
const connectionId = "11111111-1111-4111-8111-111111111111";
const planId = "22222222-2222-4222-8222-222222222222";
const childSid = `CA${"1".repeat(32)}`;
const parentSid = `CA${"2".repeat(32)}`;
const copy = (value) => JSON.parse(JSON.stringify(value));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
function configured(provider = "twilio", changes = {}) {
  return {
    contractVersion: "aureform.setup.v1",
    connectionId,
    provider,
    number: {
      id: "number-a",
      phoneNumber: "+12025550100",
      label: "Fixture inbound number",
      voiceEnabled: true,
      hasExistingRouting: false,
    },
    phase: "configured",
    checks: {
      credentials: "passed",
      webhooks: "passed",
      browser: "pending",
      testCall: "pending",
    },
    ...changes,
  };
}
function credentialFixture(provider) {
  return provider === "twilio"
    ? { provider, accountSid: `AC${"a".repeat(32)}`, authToken: "T".repeat(32) }
    : {
        provider,
        apiKey: "test-private-carrier-api-key-only",
        publicKey: Buffer.alloc(32, 7).toString("base64"),
      };
}
function media() {
  const track = {
    readyState: "live",
    stop() {
      this.readyState = "ended";
    },
  };
  return { track, getTracks: () => [track], getAudioTracks: () => [track] };
}
function audioElement() {
  return {
    srcObject: null,
    pauses: 0,
    plays: 0,
    playResult: () => Promise.resolve(),
    pause() {
      this.pauses += 1;
    },
    play() {
      this.plays += 1;
      return this.playResult();
    },
  };
}

// Run the actual TSX bodies, handlers, adapters and SDK bindings. Only React
// scheduling, language and presentation boundaries are replaced. This proves
// state/lifetime behavior, not DOM rendering, native autoplay or carrier media.
function renderer() {
  const contexts = new Map();
  const audioHosts = new Map();
  let current,
    pending = [],
    seen,
    audioSeen;
  let dirty = true,
    alive = true,
    component,
    props,
    tree,
    lateUpdates = 0;
  const same = (a, b) =>
    a &&
    b &&
    a.length === b.length &&
    a.every((value, index) => Object.is(value, b[index]));
  const slot = () => {
    const index = current.cursor++;
    return [current, index, current.slots[index]];
  };
  const hooks = {
    useState(initial) {
      const [context, index] = slot();
      const state = (context.slots[index] ??= {
        value: typeof initial === "function" ? initial() : initial,
      });
      state.set ??= (value) => {
        if (!context.alive) {
          lateUpdates += 1;
          return;
        }
        const next = typeof value === "function" ? value(state.value) : value;
        if (!Object.is(next, state.value)) {
          state.value = next;
          dirty = true;
        }
      };
      return [state.value, state.set];
    },
    useRef(initial) {
      const [context, index] = slot();
      return (context.slots[index] ??= { current: initial });
    },
    useCallback(callback, dependencies) {
      const [context, index, previous] = slot();
      if (!previous || !same(previous.dependencies, dependencies))
        context.slots[index] = { value: callback, dependencies };
      return context.slots[index].value;
    },
    useEffect(effect, dependencies) {
      const [context, index] = slot();
      const state = (context.slots[index] ??= {});
      state.effect = effect;
      if (!same(state.dependencies, dependencies)) {
        state.dependencies = dependencies;
        pending.push(state);
      }
    },
  };
  const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
  function render(node, path = "root") {
    if (Array.isArray(node))
      return node.map((child, index) => render(child, `${path}/${index}`));
    if (!node || typeof node !== "object" || !node.props) return node;
    if (typeof node.type === "function") {
      const id = `${path}/${node.key ?? node.type.name}`;
      const context = contexts.get(id) ?? { slots: [], alive: true };
      contexts.set(id, context);
      context.cursor = 0;
      seen.add(id);
      const previous = current;
      current = context;
      const result = node.type(node.props);
      current = previous;
      return render(result, id);
    }
    if (node.type === "audio") {
      const host = audioHosts.get(path) ?? {
        element: audioElement(),
        ref: node.props.ref,
      };
      audioHosts.set(path, host);
      audioSeen.add(path);
      if (host.ref) host.ref.current = host.element;
    }
    return {
      ...node,
      props: {
        ...node.props,
        children: render(node.props.children, `${path}/children`),
      },
    };
  }
  function cleanup(context) {
    context.alive = false;
    for (const state of context.slots) state?.cleanup?.();
  }
  function flush() {
    for (let iteration = 0; alive && dirty; iteration++) {
      assert(iteration < 30, "Host effects must settle.");
      dirty = false;
      pending = [];
      seen = new Set();
      audioSeen = new Set();
      tree = render(jsx(component, props));
      for (const [id, context] of contexts) {
        if (!seen.has(id)) {
          cleanup(context);
          contexts.delete(id);
        }
      }
      for (const [path, host] of audioHosts) {
        if (!audioSeen.has(path)) {
          if (host.ref) host.ref.current = null;
          audioHosts.delete(path);
        }
      }
      for (const state of pending) state.cleanup?.();
      for (const state of pending) state.cleanup = state.effect();
    }
    return tree;
  }
  const bindings = {
    react: hooks,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "@/components/blocks/communications-setup": {
      CommunicationsSetup: "setup",
    },
    "@/components/blocks/softphone-workspace": {
      SoftphoneWorkspace: "workspace",
    },
    "@/components/ui/button": { Button: "button" },
    "@/components/providers": { Providers: "providers" },
    "@/hooks/use-language": { useLanguage: () => ({ l: (en) => en }) },
    "@/lib/communications/contracts": contracts,
    "@/lib/communications/live-adapter": live,
    "@/lib/communications/setup-adapter": setup,
    "@/lib/communications/setup-contracts": setupContracts,
    "@/lib/communications/twilio-browser": twilio,
    "@/lib/communications/telnyx-browser": telnyx,
  };
  function load(file) {
    const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
      fileName: file.pathname,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    const localModule = { exports: {} };
    vm.runInNewContext(
      compiled.outputText,
      {
        module: localModule,
        exports: localModule.exports,
        queueMicrotask,
        require(id) {
          assert(
            Object.hasOwn(bindings, id),
            `Unexpected host dependency: ${id}`,
          );
          return bindings[id];
        },
      },
      { filename: file.pathname },
    );
    return localModule.exports;
  }
  const exports = load(
    new URL(
      "../src/components/communications/connected-softphone.tsx",
      import.meta.url,
    ),
  );
  bindings["@/components/communications/connected-softphone"] = exports;
  const example = load(
    new URL("../examples/communications-connected.tsx", import.meta.url),
  );
  return {
    exports,
    example,
    mount(initialProps = {}, root = exports.ConnectedSoftphone) {
      component = root;
      props = initialProps;
      return flush();
    },
    update(value) {
      props = value;
      dirty = true;
      return flush();
    },
    get tree() {
      return flush();
    },
    get audio() {
      return [...audioHosts.values()][0]?.element;
    },
    get lateUpdates() {
      return lateUpdates;
    },
    async settle() {
      for (let index = 0; index < 3; index++) {
        flush();
        await nextTurn();
      }
      return flush();
    },
    replayEffects() {
      const effects = [...contexts.values()]
        .flatMap((c) => c.slots)
        .filter((s) => s?.effect);
      for (const state of effects) state.cleanup?.();
      for (const state of effects) state.cleanup = state.effect();
    },
    unmount() {
      alive = false;
      for (const context of contexts.values()) cleanup(context);
      for (const host of audioHosts.values())
        if (host.ref) host.ref.current = null;
      contexts.clear();
      audioHosts.clear();
    },
  };
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== "object" || !node.props) return [];
  return [node, ...nodes(node.props.children)];
}
function element(ui, type) {
  return nodes(ui.tree).find((node) => node.type === type);
}
function byTestId(ui, id) {
  return nodes(ui.tree).find((node) => node.props["data-testid"] === id);
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (node && typeof node === "object") return text(node.props?.children);
  return typeof node === "string" || typeof node === "number"
    ? String(node)
    : "";
}

function sdkFixture(provider) {
  const instances = [];
  let loads = 0,
    outbound = 0,
    answers = 0;
  class Device extends EventEmitter {
    destroyed = 0;
    registrations = 0;
    constructor(token, options) {
      super();
      this.token = token;
      this.options = options;
      instances.push(this);
    }
    async register() {
      this.registrations += 1;
      this.emit("registered");
    }
    updateToken(token) {
      this.token = token;
    }
    disconnectAll() {}
    destroy() {
      this.destroyed += 1;
    }
    connect() {
      outbound += 1;
      assert.fail("No outbound Twilio call is authorized.");
    }
  }
  class TelnyxRTC extends EventEmitter {
    connected = false;
    connects = 0;
    disconnects = 0;
    remoteElement = null;
    constructor(options) {
      super();
      this.options = options;
      instances.push(this);
    }
    async connect() {
      this.connected = true;
      this.connects += 1;
      this.emit("telnyx.ready");
    }
    async disconnect() {
      this.connected = false;
      this.disconnects += 1;
    }
    clearReconnectToken() {}
    async login({ onSuccess }) {
      onSuccess();
    }
    newCall() {
      outbound += 1;
      assert.fail("No outbound Telnyx call is authorized.");
    }
  }
  function incoming() {
    const sdk = instances.at(-1);
    if (provider === "twilio") {
      const call = new EventEmitter();
      Object.assign(call, {
        direction: "INCOMING",
        parameters: { CallSid: childSid },
        customParameters: new Map([
          ["aureformCallId", "call-a"],
          ["aureformReservationId", "reservation-a"],
        ]),
        currentState: "pending",
        muted: false,
        status() {
          return this.currentState;
        },
        isMuted() {
          return this.muted;
        },
        getLocalStream() {
          return this.local;
        },
        getRemoteStream() {
          return this.remote;
        },
        accept() {
          answers += 1;
          this.currentState = "open";
          this.local = media();
          this.remote = media();
          this.emit("accept", this);
        },
        reject() {
          this.currentState = "closed";
          this.emit("reject");
        },
        disconnect() {
          this.currentState = "closed";
          this.emit("disconnect", this);
        },
        mute(value) {
          this.muted = value;
          this.emit("mute", value, this);
        },
        sendDigits() {},
      });
      sdk.emit("incoming", call);
      return call;
    }
    const call = {
      id: "native-call-a",
      direction: "inbound",
      state: "ringing",
      isAudioMuted: false,
      telnyxIDs: {
        telnyxCallControlId: "v3:browser-control",
        telnyxLegId: "browser-leg-a",
        telnyxSessionId: "carrier-session-a",
      },
      localStream: null,
      remoteStream: media(),
      notify() {
        sdk.emit("telnyx.notification", { type: "callUpdate", call: this });
      },
      async answer() {
        answers += 1;
        this.localStream = media();
        this.state = "active";
        if (sdk.remoteElement) sdk.remoteElement.srcObject = this.remoteStream;
        this.notify();
      },
      async hangup() {
        this.state = "hangup";
        this.notify();
      },
      muteAudio() {
        this.isAudioMuted = true;
        this.notify();
      },
      unmuteAudio() {
        this.isAudioMuted = false;
        this.notify();
      },
      dtmf() {},
    };
    call.notify();
    return call;
  }
  return {
    instances,
    incoming,
    async load() {
      loads += 1;
      return provider === "twilio" ? { Device } : { TelnyxRTC };
    },
    get loads() {
      return loads;
    },
    get outbound() {
      return outbound;
    },
    get answers() {
      return answers;
    },
  };
}

// Schema-real setup + session + HTTP command/SSE fixtures. Backend bridge and
// native answer are distinct events; a local end does not fabricate PSTN end.
function backendFixture(provider) {
  const requests = [],
    streams = new Set();
  let revision = 0,
    cursor = 0;
  let appToken = "operator-fixture-token";
  const voiceToken = "voice-session-fixture-token";
  const scope = {
    provider,
    sessionId: "session-a",
    tenantId: "tenant-a",
    agentId: "agent-a",
  };
  const summary = configured(provider);
  let bindings = [];
  let snapshot = {
    mode: "live",
    provider,
    connection: "disconnected",
    presence: "offline",
    activeCall: null,
    queue: [],
    history: [],
    error: null,
    businessHours: { timezone: "UTC", weekly: [], holidays: [] },
    businessHoursOpen: true,
    caps: { hold: false, mute: true, dtmf: true },
    events: [],
    audio: { microphonePermission: "unknown" },
  };
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
  const envelope = (result) => ({
    type: "snapshot",
    contractVersion: "aureform.inbound-voice.v1",
    scope,
    revision,
    cursor,
    snapshot: copy(snapshot),
    capabilities,
    bindings: copy(bindings),
    ...(result ? { result } : {}),
    error: null,
  });
  function send() {
    const value = envelope();
    const bytes = new TextEncoder().encode(
      `id: ${cursor}\nevent: snapshot\ndata: ${JSON.stringify(value)}\n\n`,
    );
    for (const controller of streams) controller.enqueue(bytes);
  }
  const response = (body) =>
    new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
    });
  const fetcher = async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init.headers);
    const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ url, init, headers, body });
    assert(
      !/[?&](?:token|auth|key|accessCode)=/i.test(url.href),
      "Authentication is header-only.",
    );
    const bootstrap = () => {
      if (headers.has("authorization"))
        assert.equal(headers.get("authorization"), `Bearer ${appToken}`);
      else {
        assert.equal(headers.get("x-csrf-token"), "fixture-csrf");
        assert.equal(init.credentials, "include");
      }
    };
    if (url.pathname.includes("/setup/")) {
      bootstrap();
      if (url.pathname.endsWith("/inspect"))
        return response({
          contractVersion: "aureform.setup.v1",
          connectionId,
          provider,
          phase: "select-number",
          accountLabel: "Fixture owner",
          numbers: [summary.number],
        });
      if (url.pathname.endsWith("/plan"))
        return response({
          contractVersion: "aureform.setup.v1",
          connectionId,
          provider,
          planId,
          number: summary.number,
          phase: "review",
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          steps: [
            {
              id: "runtime",
              label: "Configure inbound runtime",
              kind: "create",
            },
          ],
          willReplaceRouting: false,
        });
      if (url.pathname.endsWith("/apply") || url.pathname.endsWith("/status"))
        return response(summary);
      assert.fail("Unexpected setup resource.");
    }
    if (url.pathname.endsWith("/session")) {
      bootstrap();
      const exp = Math.floor(Date.now() / 1000) + 600;
      return response({
        contractVersion: "aureform.inbound-voice.v1",
        ...scope,
        sessionToken: voiceToken,
        expiresAt: new Date(exp * 1000).toISOString(),
        credentials: {
          kind:
            provider === "twilio"
              ? "twilio-access-token"
              : "telnyx-login-token",
          token: `e30.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.c3ludGhldGlj`,
          expiresAt: new Date(exp * 1000).toISOString(),
        },
        envelope: envelope(),
      });
    }
    assert.equal(headers.get("authorization"), `Bearer ${voiceToken}`);
    if (url.pathname.endsWith("/events")) {
      return new Response(
        new ReadableStream({
          start(controller) {
            streams.add(controller);
          },
          cancel() {
            streams.clear();
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    assert(url.pathname.endsWith("/commands"));
    assert.equal(body.expectedRevision, revision);
    ++revision;
    ++cursor;
    if (body.type === "connect")
      snapshot = { ...snapshot, connection: "ready" };
    if (body.type === "disconnect")
      snapshot = {
        ...snapshot,
        connection: "disconnected",
        presence: "offline",
      };
    if (body.type === "accept") {
      snapshot = {
        ...snapshot,
        activeCall: { ...snapshot.activeCall, status: "connecting" },
      };
      bindings[0].phase = "connecting";
    }
    if (body.type === "hangup" || body.type === "decline")
      bindings[0].phase = "ending";
    return response(
      envelope({ commandId: body.commandId, outcome: "applied" }),
    );
  };
  return {
    fetcher,
    requests,
    summary,
    get streams() {
      return streams.size;
    },
    set appToken(value) {
      appToken = value;
    },
    offer() {
      ++revision;
      ++cursor;
      snapshot = {
        ...snapshot,
        activeCall: {
          id: "call-a",
          provider,
          providerCallId: provider === "twilio" ? parentSid : "v3:pstn-control",
          direction: "inbound",
          from: "+12025550124",
          to: summary.number.phoneNumber,
          callerName: "Fixture caller",
          status: "ringing",
          queuedAt: Date.now(),
          muted: false,
          notes: "",
        },
      };
      bindings = [
        {
          callId: "call-a",
          provider,
          pstnCallId: snapshot.activeCall.providerCallId,
          browserCallId:
            provider === "twilio" ? childSid : "v3:browser-control",
          ...(provider === "telnyx"
            ? {
                browserCallLegId: "browser-leg-a",
                callSessionId: "carrier-session-a",
              }
            : {}),
          reservationId: "reservation-a",
          phase: "offered",
          topology:
            provider === "twilio" ? "twilio-dial-client" : "telnyx-sip-bridge",
          browserAnswered: false,
          bridgeObserved: false,
        },
      ];
      send();
    },
    bridge() {
      ++revision;
      ++cursor;
      snapshot = {
        ...snapshot,
        activeCall: {
          ...snapshot.activeCall,
          status: "active",
          answeredAt: Date.now(),
        },
      };
      bindings[0] = {
        ...bindings[0],
        phase: "connected",
        browserAnswered: true,
        bridgeObserved: true,
      };
      send();
    },
    finish() {
      ++revision;
      ++cursor;
      const ended = {
        ...snapshot.activeCall,
        status: "completed",
        endedAt: Date.now(),
        endReason: "agent-hangup",
      };
      snapshot = { ...snapshot, activeCall: null, history: [ended] };
      bindings[0].phase = "ended";
      send();
    },
  };
}
function host(t, provider = "twilio", changes = {}) {
  const ui = renderer(),
    sdk = sdkFixture(provider),
    http = backendFixture(provider);
  const props = {
    mode: "live",
    backendUrl: mount,
    provider,
    authSessionKey: "principal-a",
    trustedBackendOrigins: ["https://voice.fixture.invalid"],
    getAuthHeaders: () => ({ authorization: "Bearer operator-fixture-token" }),
    fetch: http.fetcher,
    ...(provider === "twilio"
      ? { twilioLoadSdk: () => sdk.load() }
      : { telnyxLoadSdk: () => sdk.load() }),
    ...changes,
  };
  ui.mount(props);
  t.after(async () => {
    ui.unmount();
    await nextTurn();
  });
  return { ui, sdk, http, props };
}
async function configure(env) {
  const wizard = element(env.ui, "setup").props;
  await wizard.adapter.inspect(credentialFixture(env.props.provider));
  await wizard.adapter.plan("number-a");
  const result = await wizard.adapter.apply({
    configure: true,
    replaceExistingRouting: false,
  });
  wizard.onConfigured(result);
  await env.ui.settle();
  return element(env.ui, "workspace").props.adapter;
}

test("default host and default example render only the inert workspace", () => {
  const ui = renderer();
  ui.mount();
  assert.equal(element(ui, "setup"), undefined);
  assert.equal(element(ui, "workspace").props.adapter, undefined);
  ui.unmount();
  const example = renderer();
  example.mount({}, example.example.default);
  assert.equal(element(example, "setup"), undefined);
  assert.equal(element(example, "workspace").props.adapter, undefined);
  example.unmount();
});

for (const provider of ["twilio", "telnyx"]) {
  test(`${provider}: separate HTTPS setup and explicitly approved loopback voice route real adapter REST/SSE to their own origins`, async (t) => {
    const setupUrl = "https://setup.fixture.invalid/v1/communications/setup";
    const voiceUrl = "http://127.0.0.1:8788/v1/communications";
    const env = host(t, provider, {
      backendUrl: voiceUrl,
      setupBackendUrl: setupUrl,
      trustedBackendOrigins: [
        "https://setup.fixture.invalid",
        "http://127.0.0.1:8788",
      ],
    });
    const adapter = await configure(env);
    assert.equal(env.sdk.loads, 0);
    assert(
      env.http.requests.every((r) => r.url.href.startsWith(`${setupUrl}/`)),
    );
    await adapter.connect();
    const voiceRequests = env.http.requests.filter(
      (r) => !r.url.pathname.includes("/setup/"),
    );
    assert.deepEqual(
      voiceRequests.map((r) => r.url.href),
      [`${voiceUrl}/session`, `${voiceUrl}/commands`, `${voiceUrl}/events`],
    );
    assert.equal(env.http.streams, 1);
    assert.equal(env.sdk.loads, 1);
    assert.equal(
      voiceRequests[0].headers.get("authorization"),
      "Bearer operator-fixture-token",
    );
    assert.equal(
      voiceRequests[2].headers.get("authorization"),
      "Bearer voice-session-fixture-token",
    );
    assert(
      voiceRequests.every(
        (r) => !JSON.stringify(r.body).includes("T".repeat(32)),
      ),
    );
    assert.equal(adapter.getSnapshot().connection, "ready");
  });

  test(`${provider}: authenticated initial configuration restores without HTTP/apply/SDK until explicit connect`, async (t) => {
    const callbacks = [];
    const env = host(t, provider, {
      initialConfiguration: configured(provider),
      onConfigured: (summary) => callbacks.push(summary),
    });
    const adapter = element(env.ui, "workspace").props.adapter;
    assert.equal(element(env.ui, "setup"), undefined);
    assert.equal(env.http.requests.length, 0);
    assert.equal(env.sdk.loads, 0);
    assert.equal(env.sdk.answers, 0);
    assert.equal(adapter.getSnapshot().connection, "disconnected");
    assert.equal(adapter.getSnapshot().activeCall, null);
    assert.equal(callbacks.length, 1);
    assert.equal(callbacks[0].checks.browser, "pending");
    assert.equal(callbacks[0].checks.testCall, "pending");
    await adapter.connect();
    assert.equal(adapter.getSnapshot().connection, "ready");
    assert.equal(env.sdk.loads, 1);
    assert.equal(env.sdk.outbound, 0);
    assert(env.http.requests.every((r) => !r.url.pathname.includes("/setup/")));
  });

  test(`${provider}: setup construction/configuration are inert for SDK, microphone and voice session`, async (t) => {
    const callbacks = [];
    const env = host(t, provider, {
      onConfigured: (summary) => callbacks.push(summary),
    });
    assert.equal(env.http.requests.length, 0);
    assert.equal(env.sdk.loads, 0);
    assert.equal(element(env.ui, "setup").props.fixedProvider, true);
    const adapter = await configure(env);
    assert.equal(env.http.requests.length, 3);
    assert(
      env.http.requests.every((request) =>
        request.url.pathname.includes("/setup/"),
      ),
    );
    assert.equal(env.sdk.loads, 0);
    assert.equal(env.sdk.answers, 0);
    assert.equal(adapter.getSnapshot().connection, "disconnected");
    assert.equal(adapter.getSnapshot().activeCall, null);
    assert.equal(callbacks.length, 1);
    assert.equal(callbacks[0].checks.browser, "pending");
    assert.equal(callbacks[0].checks.testCall, "pending");
    assert(Object.isFrozen(callbacks[0].number));
    assert.match(text(env.ui.tree), /real test call has not been verified/);
    assert(
      !JSON.stringify(callbacks).includes(
        Object.values(credentialFixture(provider))[1],
      ),
    );
  });

  test(`${provider}: only explicit connect registers; answer and backend bridge remain separate`, async (t) => {
    const env = host(t, provider);
    const adapter = await configure(env);
    await adapter.connect();
    assert.equal(env.sdk.loads, 1);
    assert.equal(env.sdk.instances.length, 1);
    assert.equal(adapter.getSnapshot().connection, "ready");
    assert.equal(adapter.getSnapshot().activeCall, null);
    assert.equal(env.sdk.outbound, 0);
    if (provider === "telnyx") {
      assert.equal(env.sdk.instances[0].remoteElement, env.ui.audio);
      const audio = byTestId(env.ui, "connected-softphone-audio");
      assert.equal(audio.props.autoPlay, true);
      assert.equal(audio.props.playsInline, true);
    }
    env.http.offer();
    const call = env.sdk.incoming();
    await env.ui.settle();
    assert.equal(adapter.getSnapshot().activeCall.status, "ringing");
    assert.equal(env.sdk.answers, 0);
    await adapter.accept("call-a");
    assert.equal(env.sdk.answers, 1);
    assert.equal(adapter.getSnapshot().activeCall.status, "connecting");
    env.http.bridge();
    await env.ui.settle();
    assert.equal(adapter.getSnapshot().activeCall.status, "active");
    await adapter.hangup("call-a");
    assert.equal(
      adapter.getSnapshot().activeCall.id,
      "call-a",
      "Local hangup does not certify the PSTN ended.",
    );
    if (provider === "telnyx") {
      assert.equal(env.ui.audio.srcObject, null);
      assert.equal(call.localStream.track.readyState, "ended");
    }
    env.http.finish();
    await env.ui.settle();
    assert.equal(adapter.getSnapshot().activeCall, null);
    assert.equal(adapter.getSnapshot().history[0].status, "completed");
    assert.equal(env.sdk.outbound, 0);
  });
}

test("the first asynchronous recovered summary is consumed once; later props cannot replace the session", async (t) => {
  let callbacks = 0;
  const env = host(t, "twilio", {
    onConfigured: () => {
      callbacks += 1;
    },
  });
  assert(element(env.ui, "setup"));
  env.ui.update({ ...env.props, initialConfiguration: configured() });
  await env.ui.settle();
  const adapter = element(env.ui, "workspace").props.adapter;
  await adapter.connect();
  const before = env.http.requests.length;
  env.ui.update({ ...env.props, initialConfiguration: copy(configured()) });
  env.ui.replayEffects();
  await env.ui.settle();
  env.ui.update({
    ...env.props,
    initialConfiguration: configured("twilio", {
      connectionId: "33333333-3333-4333-8333-333333333333",
    }),
  });
  await env.ui.settle();
  assert.equal(element(env.ui, "workspace").props.adapter, adapter);
  assert.equal(callbacks, 1);
  assert.equal(env.http.requests.length, before);
  assert.equal(env.sdk.loads, 1);
  assert.equal(env.sdk.instances[0].destroyed, 0);
  assert.equal(byTestId(env.ui, "connected-softphone-error"), undefined);
});

test("recovered summary schema/provider/webhook drift is rejected and a rejected first value cannot auto-replace itself", async (t) => {
  const cases = [
    configured("telnyx"),
    { ...configured(), contractVersion: "drifted" },
    { ...configured(), credentials: { apiKey: "NEVER_RENDER_RESUME_SECRET" } },
    configured("twilio", {
      checks: { ...configured().checks, webhooks: "pending" },
    }),
    configured("twilio", {
      checks: { ...configured().checks, browser: "passed" },
    }),
    configured("twilio", {
      error: { code: "setup-failed", message: "NEVER_RENDER_RESUME_SECRET" },
    }),
  ];
  for (const value of cases) {
    const env = host(t, "twilio", { initialConfiguration: value });
    assert.equal(element(env.ui, "workspace"), undefined);
    assert(byTestId(env.ui, "connected-softphone-error"));
    env.ui.update({ ...env.props, initialConfiguration: configured() });
    await env.ui.settle();
    assert.equal(element(env.ui, "workspace"), undefined);
    assert.equal(env.http.requests.length, 0);
    assert.equal(env.sdk.loads, 0);
    assert(!text(env.ui.tree).includes("NEVER_RENDER_RESUME_SECRET"));
  }
});

test("malformed, wrong-provider, failed, unverified or secret-bearing configured results cannot create a session", async (t) => {
  const env = host(t);
  const callback = element(env.ui, "setup").props.onConfigured;
  const pending = configured().checks;
  const cases = [
    { ...configured(), contractVersion: "wrong" },
    configured("telnyx"),
    configured("twilio", { checks: { ...pending, webhooks: "pending" } }),
    configured("twilio", { checks: { ...pending, webhooks: "failed" } }),
    configured("twilio", { checks: { ...pending, browser: "passed" } }),
    configured("twilio", {
      number: { ...configured().number, voiceEnabled: false },
    }),
    configured("twilio", {
      error: { code: "setup-failed", message: "NEVER_RENDER_SECRET" },
    }),
    { ...configured(), runtimeApiKey: "NEVER_RENDER_SECRET" },
    null,
  ];
  for (const value of cases) {
    callback(value);
    await env.ui.settle();
    assert.equal(element(env.ui, "workspace"), undefined);
    assert(byTestId(env.ui, "connected-softphone-error"));
    assert(!text(env.ui.tree).includes("NEVER_RENDER_SECRET"));
  }
  assert.equal(env.sdk.loads, 0);
  assert.equal(env.http.requests.length, 0);
});

test("a repeated configured callback is idempotent; a different connection cannot replace an owned session", async (t) => {
  let callbacks = 0;
  const env = host(t, "twilio", {
    onConfigured: () => {
      callbacks += 1;
    },
  });
  const callback = element(env.ui, "setup").props.onConfigured;
  const adapter = await configure(env);
  await adapter.connect();
  callback(copy(env.http.summary));
  await env.ui.settle();
  assert.equal(element(env.ui, "workspace").props.adapter, adapter);
  assert.equal(callbacks, 1);
  callback(
    configured("twilio", {
      connectionId: "33333333-3333-4333-8333-333333333333",
    }),
  );
  await env.ui.settle();
  assert.equal(element(env.ui, "workspace").props.adapter, adapter);
  assert.match(text(env.ui.tree), /already owns/);
  assert.equal(env.sdk.loads, 1);
  assert.equal(env.sdk.instances[0].destroyed, 0);
});

test("missing provider loader fails connect before session HTTP; configuration never installs SDKs", async (t) => {
  const env = host(t, "twilio", { twilioLoadSdk: undefined });
  const adapter = await configure(env);
  assert.match(text(env.ui.tree), /not available in this application/);
  await assert.rejects(
    adapter.connect(),
    (error) => error.code === "invalid-argument",
  );
  assert.equal(env.http.requests.length, 3);
  assert.equal(env.sdk.loads, 0);
});

test("latest authentication callbacks are used without recreating a configured or registered session", async (t) => {
  const env = host(t);
  const adapter = await configure(env);
  env.http.appToken = "operator-renewed-token";
  env.ui.update({
    ...env.props,
    getAuthHeaders: () => ({ authorization: "Bearer operator-renewed-token" }),
  });
  await adapter.connect();
  assert.equal(element(env.ui, "workspace").props.adapter, adapter);
  assert.equal(
    env.http.requests
      .find((r) => r.url.pathname.endsWith("/session"))
      .headers.get("authorization"),
    "Bearer operator-renewed-token",
  );
  env.ui.update({
    ...env.props,
    getAuthHeaders: () => ({ authorization: "Bearer expired-operator-token" }),
  });
  await adapter.disconnect();
  const last = env.http.requests.at(-1);
  assert.equal(
    last.headers.get("authorization"),
    "Bearer voice-session-fixture-token",
  );
  assert.equal(last.body.type, "disconnect");
  assert.equal(env.sdk.loads, 1);
});

test("StrictMode effect replay keeps one live adapter; a real unmount removes SDK listeners/media/SSE", async (t) => {
  const env = host(t, "telnyx");
  const setupAdapter = element(env.ui, "setup").props.adapter;
  env.ui.replayEffects();
  await env.ui.settle();
  assert.equal(element(env.ui, "setup").props.adapter, setupAdapter);
  const adapter = await configure(env);
  await adapter.connect();
  env.ui.replayEffects();
  await env.ui.settle();
  assert.equal(element(env.ui, "workspace").props.adapter, adapter);
  assert.equal(env.sdk.instances.length, 1);
  assert.equal(env.sdk.instances[0].disconnects, 0);
  env.http.offer();
  const call = env.sdk.incoming();
  await env.ui.settle();
  await adapter.accept("call-a");
  const audio = env.ui.audio;
  env.ui.unmount();
  await nextTurn();
  assert(env.sdk.instances[0].disconnects >= 1);
  assert.equal(env.sdk.instances[0].eventNames().length, 0);
  assert.equal(env.http.streams, 0);
  assert.equal(audio.srcObject, null);
  assert.equal(call.localStream.track.readyState, "ended");
  assert.equal(env.ui.lateUpdates, 0);
  assert.equal(adapter.getSnapshot().connection, "disconnected");
});

test("identity changes release the old session and reject its stale configured callback", async (t) => {
  const env = host(t);
  const oldCallback = element(env.ui, "setup").props.onConfigured;
  const oldAdapter = await configure(env);
  await oldAdapter.connect();
  env.ui.update({ ...env.props, authSessionKey: "principal-b" });
  await env.ui.settle();
  assert.equal(element(env.ui, "workspace"), undefined);
  assert.equal(oldAdapter.getSnapshot().connection, "disconnected");
  assert.equal(env.sdk.instances[0].destroyed, 1);
  oldCallback(configured());
  await env.ui.settle();
  assert.equal(element(env.ui, "workspace"), undefined);
  assert.equal(env.ui.lateUpdates, 0);
});

test("unmount cancels a pending SDK loader and never registers its late module", async (t) => {
  const loader = deferred();
  const env = host(t, "twilio", { twilioLoadSdk: () => loader.promise });
  const adapter = await configure(env);
  const connecting = adapter.connect().catch((error) => error);
  await nextTurn();
  env.ui.unmount();
  await nextTurn();
  loader.resolve(await env.sdk.load());
  await connecting;
  await nextTurn();
  assert.equal(env.sdk.instances.length, 0);
  assert.equal(adapter.getSnapshot().connection, "disconnected");
  assert.equal(env.ui.lateUpdates, 0);
});

test("Telnyx blocked playback exposes an explicit retry and native end clears audio without faking backend completion", async (t) => {
  const env = host(t, "telnyx");
  const adapter = await configure(env);
  await adapter.connect();
  env.http.offer();
  const call = env.sdk.incoming();
  await env.ui.settle();
  await adapter.accept("call-a");
  const audio = env.ui.audio;
  audio.playResult = () =>
    Promise.reject(new Error("Autoplay blocked with private fixture"));
  byTestId(env.ui, "connected-softphone-audio").props.onLoadedMetadata();
  await env.ui.settle();
  assert(byTestId(env.ui, "connected-softphone-enable-audio"));
  assert(!text(env.ui.tree).includes("private fixture"));
  audio.playResult = () => Promise.resolve();
  byTestId(env.ui, "connected-softphone-enable-audio").props.onClick();
  await env.ui.settle();
  assert.equal(byTestId(env.ui, "connected-softphone-enable-audio"), undefined);
  assert.equal(audio.plays, 2);
  await call.hangup();
  await env.ui.settle();
  assert.equal(audio.srcObject, null);
  assert.equal(adapter.getSnapshot().activeCall.id, "call-a");
});

test("late rejected playback after an ended call cannot resurrect the recovery control", async (t) => {
  const env = host(t, "telnyx");
  const adapter = await configure(env);
  await adapter.connect();
  env.http.offer();
  const call = env.sdk.incoming();
  await env.ui.settle();
  await adapter.accept("call-a");
  const playing = deferred();
  env.ui.audio.playResult = () => playing.promise;
  byTestId(env.ui, "connected-softphone-audio").props.onCanPlay();
  await call.hangup();
  playing.reject(new Error("stale playback"));
  await env.ui.settle();
  assert.equal(byTestId(env.ui, "connected-softphone-enable-audio"), undefined);
  assert.equal(env.ui.audio.srcObject, null);
  assert.equal(env.ui.lateUpdates, 0);
});

test("backend-confirmed call end clears the host audio even if a terminal SDK event has not arrived", async (t) => {
  const env = host(t, "telnyx");
  const adapter = await configure(env);
  await adapter.connect();
  env.http.offer();
  env.sdk.incoming();
  await env.ui.settle();
  await adapter.accept("call-a");
  env.http.bridge();
  await env.ui.settle();
  assert(env.ui.audio.srcObject);
  env.http.finish();
  await env.ui.settle();
  assert.equal(env.ui.audio.srcObject, null);
  assert.equal(adapter.getSnapshot().activeCall, null);
});

test("Bearer mode omits cookies and keeps authentication out of URLs, callback DTOs and visible copy", async (t) => {
  const env = host(t);
  const adapter = await configure(env);
  await adapter.connect();
  for (const request of env.http.requests) {
    assert.equal(request.init.credentials, "omit");
    assert(!request.url.href.includes("operator-fixture-token"));
    assert(!request.url.href.includes("voice-session-fixture-token"));
  }
  assert(!text(env.ui.tree).includes("fixture-token"));
  assert(!text(env.ui.tree).includes("T".repeat(32)));
});

test("cookie/CSRF mode is explicit and shared by setup and authenticated voice HTTP/SSE", async (t) => {
  const env = host(t, "telnyx", {
    authMode: "cookie-csrf",
    getAuthHeaders: () => ({ "x-csrf-token": "fixture-csrf" }),
  });
  const adapter = await configure(env);
  await adapter.connect();
  for (const request of env.http.requests) {
    assert.equal(request.init.credentials, "include");
    assert.equal(request.headers.get("x-csrf-token"), "fixture-csrf");
  }
  assert.equal(adapter.getSnapshot().connection, "ready");
});

test("invalid backend origin fails before authentication material or carrier credentials are transmitted", async (t) => {
  let authReads = 0;
  const env = host(t, "twilio", {
    trustedBackendOrigins: ["https://another.fixture.invalid"],
    getAuthHeaders: () => {
      authReads += 1;
      return { authorization: "Bearer operator-fixture-token" };
    },
  });
  await assert.rejects(
    element(env.ui, "setup").props.adapter.inspect(credentialFixture("twilio")),
    (error) => error.code === "invalid-configuration",
  );
  assert.equal(authReads, 0);
  assert.equal(env.http.requests.length, 0);
  assert.equal(env.sdk.loads, 0);
});

test("a changed setup mount is part of host identity and releases the prior voice session", async (t) => {
  const env = host(t, "twilio", {
    setupBackendUrl: "https://setup-a.fixture.invalid/v1/communications/setup",
    trustedBackendOrigins: [
      "https://voice.fixture.invalid",
      "https://setup-a.fixture.invalid",
      "https://setup-b.fixture.invalid",
    ],
    initialConfiguration: configured(),
  });
  const previous = element(env.ui, "workspace").props.adapter;
  await previous.connect();
  env.ui.update({
    ...env.props,
    setupBackendUrl: "https://setup-b.fixture.invalid/v1/communications/setup",
  });
  await env.ui.settle();
  const next = element(env.ui, "workspace").props.adapter;
  assert.notEqual(next, previous);
  assert.equal(previous.getSnapshot().connection, "disconnected");
  assert.equal(next.getSnapshot().connection, "disconnected");
  assert.equal(env.sdk.instances[0].destroyed, 1);
  assert.equal(env.sdk.loads, 1);
  assert(env.http.requests.every((r) => !r.url.pathname.includes("/setup/")));
});

test("unapproved separate setup receives neither authentication lookup nor credentials", async (t) => {
  let authReads = 0;
  const env = host(t, "twilio", {
    setupBackendUrl: "https://foreign.fixture.invalid/v1/communications/setup",
    getAuthHeaders: () => {
      authReads += 1;
      return { authorization: "Bearer operator-fixture-token" };
    },
  });
  await assert.rejects(
    element(env.ui, "setup").props.adapter.inspect(credentialFixture("twilio")),
    (error) => error.code === "invalid-configuration",
  );
  assert.equal(authReads, 0);
  assert.equal(env.http.requests.length, 0);
  assert.equal(env.sdk.loads, 0);
});

test("setup credentials require HTTPS even if its loopback HTTP origin is approved for voice", async (t) => {
  let authReads = 0;
  const env = host(t, "twilio", {
    setupBackendUrl: "http://127.0.0.1:8788/v1/communications/setup",
    trustedBackendOrigins: [
      "https://voice.fixture.invalid",
      "http://127.0.0.1:8788",
    ],
    getAuthHeaders: () => {
      authReads += 1;
      return { authorization: "Bearer operator-fixture-token" };
    },
  });
  await assert.rejects(
    element(env.ui, "setup").props.adapter.inspect(credentialFixture("twilio")),
    (error) => error.code === "invalid-configuration",
  );
  assert.equal(authReads, 0);
  assert.equal(env.http.requests.length, 0);
});

test("approving setup separately does not authorize a foreign voice origin or leak bootstrap auth", async (t) => {
  let authReads = 0;
  const env = host(t, "twilio", {
    backendUrl: "https://foreign.fixture.invalid/v1/communications",
    setupBackendUrl: "https://setup.fixture.invalid/v1/communications/setup",
    trustedBackendOrigins: ["https://setup.fixture.invalid"],
    initialConfiguration: configured(),
    getAuthHeaders: () => {
      authReads += 1;
      return { authorization: "Bearer operator-fixture-token" };
    },
  });
  assert.equal(element(env.ui, "workspace"), undefined);
  assert(byTestId(env.ui, "connected-softphone-error"));
  assert.equal(authReads, 0);
  assert.equal(env.http.requests.length, 0);
  assert.equal(env.sdk.loads, 0);
});

test("consumer loader factories remain lazy, return the actual constructors and contain no credentials", async () => {
  const ui = renderer();
  const tw = sdkFixture("twilio"),
    te = sdkFixture("telnyx");
  const loadTwilio = ui.example.createTwilioLoadSdk(() => tw.load());
  const loadTelnyx = ui.example.createTelnyxLoadSdk(() => te.load());
  assert.equal(tw.loads, 0);
  assert.equal(te.loads, 0);
  const [twilioModule, telnyxModule] = await Promise.all([
    loadTwilio(),
    loadTelnyx(),
  ]);
  assert.equal(tw.loads, 1);
  assert.equal(te.loads, 1);
  assert.equal(typeof twilioModule.Device, "function");
  assert.equal(typeof telnyxModule.TelnyxRTC, "function");
  assert.deepEqual(Object.keys(twilioModule), ["Device"]);
  assert.deepEqual(Object.keys(telnyxModule), ["TelnyxRTC"]);
  assert.equal(tw.instances.length, 0);
  assert.equal(te.instances.length, 0);
});
