import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createDemoAuthAdapter,
  createDemoAuthSession,
  createProviderSignInRunner,
  DEMO_AUTH_SESSION_KEY,
  DemoAuthError,
  persistDemoAuthSession,
  SOCIAL_AUTH_PROVIDERS,
} from "../src/lib/demo-auth.ts";

const request = (provider = "google", overrides = {}) => ({
  provider,
  intent: "sign-in",
  consent: false,
  ...overrides,
});

function recordingStorage() {
  const writes = [];
  return {
    writes,
    setItem(key, value) {
      writes.push({ key, value });
    },
  };
}

test("each social demo identifies its provider using only a local display profile", async () => {
  const storage = recordingStorage();
  const adapter = createDemoAuthAdapter({ storage, delayMs: 0 });
  for (const provider of SOCIAL_AUTH_PROVIDERS) {
    const result = await adapter.signInWithProvider(request(provider));
    assert.equal(result.kind, "demo");
    assert.equal(result.persistence, "local");
    assert.equal(result.session.provider, provider);
    assert.equal(result.session.demo, true);
    assert.match(result.session.email, /@example\.com$/);
    const written = storage.writes.at(-1);
    assert.equal(written.key, DEMO_AUTH_SESSION_KEY);
    assert.deepEqual(JSON.parse(written.value), result.session);
  }
  assert.equal(storage.writes.length, 3);
});

test("sign-up consent is required before an injected adapter is called", async () => {
  const runner = createProviderSignInRunner();
  let calls = 0;
  const handler = async () => {
    calls += 1;
    return { kind: "handled" };
  };
  await assert.rejects(
    runner.signIn(request("google", { intent: "sign-up" }), handler),
    (error) =>
      error instanceof DemoAuthError && error.code === "consent-required",
  );
  assert.equal(calls, 0);
  assert.equal(runner.pending, false);
  assert.deepEqual(
    await runner.signIn(
      request("google", { intent: "sign-up", consent: true }),
      handler,
    ),
    { kind: "handled" },
  );
  assert.equal(calls, 1);
});

test("the mock adapter independently validates sign-up consent before writing", async () => {
  const storage = recordingStorage();
  const adapter = createDemoAuthAdapter({ storage, delayMs: 0 });
  await assert.rejects(
    adapter.signInWithProvider(request("github", { intent: "sign-up" })),
    { code: "consent-required" },
  );
  assert.equal(storage.writes.length, 0);
  assert.equal(
    (
      await adapter.signInWithProvider(
        request("github", { intent: "sign-up", consent: true }),
      )
    ).session.provider,
    "github",
  );
});

test("unrecognized providers and intents never reach the consumer callback", async () => {
  const runner = createProviderSignInRunner();
  let calls = 0;
  const handler = async () => {
    calls += 1;
    return { kind: "handled" };
  };
  for (const invalid of [
    request("other"),
    request("google", { intent: "reset-password" }),
  ]) {
    await assert.rejects(runner.signIn(invalid, handler), {
      code: "invalid-request",
    });
  }
  assert.equal(calls, 0);
});

test("duplicate provider submissions share one in-flight guard", async () => {
  const runner = createProviderSignInRunner();
  let finish;
  let calls = 0;
  const first = runner.signIn(request(), async () => {
    calls += 1;
    return await new Promise((resolve) => {
      finish = resolve;
    });
  });
  assert.equal(runner.pending, true);
  assert.equal(
    await runner.signIn(request("microsoft"), async () => {
      calls += 1;
      return { kind: "handled" };
    }),
    null,
  );
  assert.equal(calls, 1);
  finish({ kind: "handled" });
  assert.deepEqual(await first, { kind: "handled" });
  assert.equal(runner.pending, false);
});

test("an adapter rejection releases the guard so the user can retry", async () => {
  const runner = createProviderSignInRunner();
  const failure = new Error("Consumer adapter failed");
  await assert.rejects(
    runner.signIn(request(), async () => {
      throw failure;
    }),
    (error) => error === failure,
  );
  assert.equal(runner.pending, false);
  assert.deepEqual(
    await runner.signIn(request("github"), async () => ({ kind: "handled" })),
    { kind: "handled" },
  );
});

test("blocked or full browser storage preserves a usable memory-only demo result", async () => {
  const adapter = createDemoAuthAdapter({
    delayMs: 0,
    storage: {
      setItem() {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    },
  });
  const result = await adapter.signInWithProvider(request("microsoft"));
  assert.equal(result.persistence, "memory");
  assert.equal(result.session.provider, "microsoft");
  assert.equal(result.session.demo, true);
});

test("SSR and explicit null storage do not require a browser global", () => {
  const session = createDemoAuthSession("email", {
    email: "qa@example.com",
    name: "Demo QA",
  });
  assert.equal(persistDemoAuthSession(session), "memory");
  assert.equal(persistDemoAuthSession(session, null), "memory");
});

test("a throwing localStorage getter is handled without crashing the flow", () => {
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      get localStorage() {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    },
  });
  try {
    assert.equal(
      persistDemoAuthSession(createDemoAuthSession("google")),
      "memory",
    );
  } finally {
    if (priorWindow) Object.defineProperty(globalThis, "window", priorWindow);
    else delete globalThis.window;
  }
});

test("email and OTP profiles use the same persistence allowlist", () => {
  const storage = recordingStorage();
  for (const provider of ["email", "otp"]) {
    const session = createDemoAuthSession(provider, {
      name: " Demo QA ",
      email: "qa@example.com",
      password: "discard-this-fixture",
      accessToken: "discard-this-fixture",
    });
    persistDemoAuthSession(
      {
        ...session,
        password: "discard-this-fixture",
        accessToken: "discard-this-fixture",
        refreshToken: "discard-this-fixture",
        extra: { credentials: "discard-this-fixture" },
      },
      storage,
    );
    const written = JSON.parse(storage.writes.at(-1).value);
    assert.equal(written.provider, provider);
    assert.equal(written.name, "Demo QA");
    assert.deepEqual(Object.keys(written).sort(), [
      "createdAt",
      "demo",
      "email",
      "name",
      "provider",
      "version",
    ]);
  }
});

test("a malformed or non-demo session is rejected before any storage write", () => {
  const storage = recordingStorage();
  const valid = createDemoAuthSession("google");
  for (const invalid of [
    { ...valid, demo: false },
    { ...valid, provider: "other" },
    { ...valid, name: " " },
    { ...valid, createdAt: "invalid" },
  ]) {
    assert.throws(() => persistDemoAuthSession(invalid, storage), {
      code: "invalid-session",
    });
  }
  assert.equal(storage.writes.length, 0);
});

test("adapter results discard extra fields, including tokens at both object levels", async () => {
  const runner = createProviderSignInRunner();
  const session = createDemoAuthSession("github");
  const result = await runner.signIn(request("github"), async () => ({
    kind: "demo",
    persistence: "memory",
    session: { ...session, accessToken: "discard-this-fixture" },
    accessToken: "discard-this-fixture",
  }));
  assert.deepEqual(result, { kind: "demo", persistence: "memory", session });
  assert.deepEqual(
    await runner.signIn(request(), async () => ({
      kind: "handled",
      accessToken: "discard-this-fixture",
    })),
    { kind: "handled" },
  );
});

test("invalid adapter results become retryable contract errors", async () => {
  const runner = createProviderSignInRunner();
  const session = createDemoAuthSession("google");
  for (const result of [
    undefined,
    { kind: "unknown" },
    { kind: "demo", session, persistence: "cookie" },
    {
      kind: "demo",
      session: { ...session, demo: false },
      persistence: "local",
    },
    {
      kind: "demo",
      session: { ...session, provider: "microsoft" },
      persistence: "local",
    },
  ]) {
    await assert.rejects(
      runner.signIn(request(), async () => result),
      { code: "invalid-session" },
    );
    assert.equal(runner.pending, false);
  }
});

test("aborting the mock request prevents session writes", async () => {
  const storage = recordingStorage();
  const adapter = createDemoAuthAdapter({ storage, delayMs: 100 });
  const controller = new AbortController();
  const pending = adapter.signInWithProvider(
    request("google", { signal: controller.signal }),
  );
  controller.abort();
  await assert.rejects(pending, { code: "aborted" });
  assert.equal(storage.writes.length, 0);
});

test("an already aborted request never reaches an injected adapter", async () => {
  const controller = new AbortController();
  controller.abort();
  const runner = createProviderSignInRunner();
  let called = false;
  await assert.rejects(
    runner.signIn(
      request("google", { signal: controller.signal }),
      async () => {
        called = true;
        return { kind: "handled" };
      },
    ),
    { code: "aborted" },
  );
  assert.equal(called, false);
});

test("a late result after cancellation cannot complete the UI flow", async () => {
  const runner = createProviderSignInRunner();
  const controller = new AbortController();
  const result = runner.signIn(
    request("github", { signal: controller.signal }),
    async () => {
      controller.abort();
      return { kind: "handled" };
    },
  );
  await assert.rejects(result, { code: "aborted" });
  assert.equal(runner.pending, false);
});
