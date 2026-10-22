import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

// Run the real consumer modules. No provider SDK, account or HTTP is involved.
const hooks = registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        specifier.startsWith(".") &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        const candidate = new URL(`${specifier}.ts`, context.parentURL);
        if (existsSync(candidate)) return next(candidate.href, context);
      }
      throw error;
    }
  },
});
after(() => hooks.deregister());
const {
  communicationsSetupCredentialsSchema,
  communicationsSetupInspectionSchema,
  communicationsSetupPlanSchema,
  communicationsSetupConfiguredSchema,
  communicationsSetupStatusSchema,
  communicationsSetupVersion,
} = await import("../src/lib/communications/setup-contracts.ts");
const { createLiveCommunicationsSetupAdapter, createSetupController } =
  await import("../src/lib/communications/setup-adapter.ts");
const {
  createDemoCommunicationsSetupAdapter,
  getCommunicationsSetupDemoCredentials,
} = await import("../src/lib/communications/setup-demo.ts");

const origin = "https://setup.fixture.invalid";
const baseUrl = `${origin}/v1/communications/setup`;
const connectionId = "11111111-2222-4333-8444-555555555555";
const planId = "66666666-7777-4888-8999-aaaaaaaaaaaa";
const otherConnectionId = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const confirm = { configure: true, replaceExistingRouting: false };
const ownerAuthorization = "Bearer SYNTHETIC_OWNER_SESSION";
const syntheticCredentials = (provider = "twilio") =>
  provider === "twilio"
    ? {
        provider,
        accountSid: `AC${"1".repeat(32)}`,
        authToken: "SYNTHETIC12345678SYNTHETIC12345678",
      }
    : {
        provider,
        apiKey: "SYNTHETIC_TELNYX_API_KEY_123456789",
        publicKey: Buffer.alloc(32, 7).toString("base64"),
      };
const errorCode = (code) => ({ name: "CommunicationsSetupError", code });
const flush = () => new Promise(setImmediate);
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function number(id = "existing-voice", changes = {}) {
  return {
    id,
    phoneNumber: id === "existing-routing" ? "+12025550101" : "+12025550100",
    label: "Synthetic existing number",
    voiceEnabled: true,
    hasExistingRouting: false,
    ...changes,
  };
}
function inspection(provider = "twilio", changes = {}) {
  return {
    contractVersion: communicationsSetupVersion,
    connectionId,
    provider,
    accountLabel: "Synthetic fixture account",
    numbers: [
      number(),
      number("existing-routing", { hasExistingRouting: true }),
      number("messages-only", { voiceEnabled: false }),
    ],
    phase: "select-number",
    ...changes,
  };
}
function plan(provider = "twilio", selected = number(), changes = {}) {
  return {
    contractVersion: communicationsSetupVersion,
    connectionId,
    planId,
    provider,
    number: selected,
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    steps: [
      { id: "application", label: "Prepare voice application", kind: "create" },
      { id: "routing", label: "Update number routing", kind: "update" },
      { id: "verify", label: "Verify webhooks", kind: "verify" },
    ],
    willReplaceRouting: selected.hasExistingRouting,
    phase: "review",
    ...changes,
  };
}
function result(provider = "twilio", changes = {}) {
  return {
    contractVersion: communicationsSetupVersion,
    connectionId,
    provider,
    number: number(),
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
function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function backend(provider = "twilio", handlers = {}) {
  const requests = [];
  let authCalls = 0;
  const options = {
    baseUrl,
    provider,
    trustedBackendOrigins: [origin],
    getAuthHeaders: () => {
      authCalls++;
      return { authorization: ownerAuthorization };
    },
    fetch: async (input, init) => {
      const url = new URL(input);
      const resource = url.pathname.split("/").at(-1);
      assert.equal(url.origin, origin);
      assert.match(
        url.pathname,
        /^\/v1\/communications\/setup\/(inspect|plan|apply|status)$/,
      );
      const request = {
        url: url.href,
        resource,
        method: init.method,
        headers: new Headers(init.headers),
        body: init.body ? JSON.parse(init.body) : null,
        init,
      };
      requests.push(request);
      if (handlers[resource]) return handlers[resource](request);
      if (resource === "inspect") return json(inspection(provider));
      if (resource === "plan") {
        const selected = inspection(provider).numbers.find(
          (value) => value.id === request.body.numberId,
        );
        return json(plan(provider, selected));
      }
      return json(result(provider));
    },
  };
  return {
    options,
    requests,
    get authCalls() {
      return authCalls;
    },
  };
}
function live(t, boundary = backend(), extra = {}) {
  const adapter = createLiveCommunicationsSetupAdapter({
    ...boundary.options,
    ...extra,
  });
  t.after(() => adapter.dispose());
  return adapter;
}
function demo(t, options = {}) {
  const adapter = createDemoCommunicationsSetupAdapter({
    latencyMs: 0,
    ...options,
  });
  t.after(() => adapter.dispose());
  return adapter;
}
async function reviewed(
  adapter,
  provider = "twilio",
  numberId = "existing-voice",
) {
  await adapter.inspect(syntheticCredentials(provider));
  return adapter.plan(numberId);
}
function publicSurface(adapter, extra = null) {
  return JSON.stringify({
    snapshot: adapter.getSnapshot(),
    serverSnapshot: adapter.getServerSnapshot(),
    extra,
  });
}

test("construction is inert, defaults to Twilio and has a stable frozen SSR snapshot", (t) => {
  const boundary = backend();
  const adapter = live(t, boundary);
  assert.equal(adapter.getSnapshot().provider, "twilio");
  assert.equal(adapter.getSnapshot().phase, "credentials");
  assert.equal(adapter.getServerSnapshot(), adapter.getServerSnapshot());
  assert.ok(Object.isFrozen(adapter.getSnapshot()));
  assert.equal(boundary.authCalls, 0);
  assert.equal(boundary.requests.length, 0);
});

test("both providers have exactly two credential fields and reject extra keys", () => {
  for (const provider of ["twilio", "telnyx"]) {
    const input = syntheticCredentials(provider);
    assert.equal(
      communicationsSetupCredentialsSchema.safeParse(input).success,
      true,
    );
    assert.equal(Object.keys(input).length, 3); // Discriminator plus two inputs.
    assert.equal(
      communicationsSetupCredentialsSchema.safeParse({
        ...input,
        password: "unrequested",
      }).success,
      false,
    );
  }
  assert.equal(
    communicationsSetupCredentialsSchema.safeParse({
      provider: "twilio",
      accountSid: "wrong",
      authToken: "short",
    }).success,
    false,
  );
  assert.equal(
    communicationsSetupCredentialsSchema.safeParse({
      ...syntheticCredentials("telnyx"),
      publicKey: "not-canonical-base64",
    }).success,
    false,
  );
});

test("unapproved, non-HTTPS and malformed mounts reject before auth lookup or HTTP", async (t) => {
  for (const rejected of [
    "http://127.0.0.1:9000/v1/communications/setup",
    "http://setup.fixture.invalid/v1/communications/setup",
    "https://unapproved.fixture.invalid/v1/communications/setup",
    `${baseUrl}?authToken=never`,
    `${baseUrl}#fragment`,
    "https://username:test@setup.fixture.invalid/v1/communications/setup",
    "https://setup.fixture.invalid/v1/communications/../communications/setup",
    `${baseUrl}/%2e%2e`,
    "//setup.fixture.invalid/v1/communications/setup",
    `${origin}/other-api`,
  ]) {
    const boundary = backend();
    const adapter = live(t, boundary, { baseUrl: rejected });
    await assert.rejects(
      adapter.inspect(syntheticCredentials()),
      errorCode("invalid-configuration"),
    );
    assert.equal(boundary.authCalls, 0, rejected);
    assert.equal(boundary.requests.length, 0, rejected);
  }
});

test("relative API mounts resolve only in an approved HTTPS browser origin", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "location");
  t.after(() =>
    descriptor
      ? Object.defineProperty(globalThis, "location", descriptor)
      : delete globalThis.location,
  );
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin },
  });
  const boundary = backend();
  const adapter = live(t, boundary, { baseUrl: "/v1/communications/setup" });
  await adapter.inspect(syntheticCredentials());
  assert.equal(boundary.requests[0].url, `${baseUrl}/inspect`);
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin: "http://localhost:3000" },
  });
  const refused = live(t, backend(), { baseUrl: "/v1/communications/setup" });
  await assert.rejects(
    refused.inspect(syntheticCredentials()),
    errorCode("invalid-configuration"),
  );
});

test("authenticated POST inspect carries credentials only in its HTTPS body", async (t) => {
  for (const provider of ["twilio", "telnyx"]) {
    const boundary = backend(provider);
    const adapter = live(t, boundary);
    const input = syntheticCredentials(provider);
    await adapter.inspect(input);
    const request = boundary.requests[0];
    assert.deepEqual(request.body, input);
    assert.equal(request.method, "POST");
    assert.equal(new URL(request.url).search, "");
    assert.equal(request.headers.get("authorization"), ownerAuthorization);
    assert.equal(request.headers.get("content-type"), "application/json");
    assert.equal(request.init.credentials, "omit");
    assert.equal(request.init.redirect, "error");
    assert.equal(request.init.cache, "no-store");
    assert.equal(request.init.referrerPolicy, "no-referrer");
    const surface = publicSurface(adapter);
    for (const [key, value] of Object.entries(input)) {
      if (key !== "provider") {
        assert.equal(surface.includes(value), false);
        assert.equal(request.url.includes(value), false);
      }
    }
    assert.equal(surface.includes(ownerAuthorization), false);
  }
});

test("auth defaults fail closed; headers and cookie CSRF are explicitly constrained", async (t) => {
  for (const headers of [
    {},
    { authorization: "Basic not-allowed" },
    { authorization: ownerAuthorization, "x-api-key": "carrier-key" },
    {
      authorization: ownerAuthorization,
      cookie: "session=not-client-controlled",
    },
  ]) {
    const boundary = backend();
    const adapter = live(t, boundary, { getAuthHeaders: () => headers });
    await assert.rejects(
      adapter.inspect(syntheticCredentials()),
      errorCode("authentication-required"),
    );
    assert.equal(boundary.requests.length, 0);
  }
  const boundary = backend();
  const cookieAdapter = live(t, boundary, {
    authMode: "cookie-csrf",
    getAuthHeaders: () => ({ "x-csrf-token": "SYNTHETIC_CSRF_ONLY" }),
  });
  await cookieAdapter.inspect(syntheticCredentials());
  assert.equal(boundary.requests[0].init.credentials, "include");
  assert.equal(boundary.requests[0].headers.has("authorization"), false);
  const denied = live(t, backend(), {
    authMode: "cookie-csrf",
    getAuthHeaders: () => ({}),
  });
  await assert.rejects(
    denied.inspect(syntheticCredentials()),
    errorCode("authentication-required"),
  );
});

test("missing auth and invalid credentials cause no request", async (t) => {
  const boundary = backend();
  const unauthenticated = live(t, boundary, { getAuthHeaders: undefined });
  await assert.rejects(
    unauthenticated.inspect(syntheticCredentials()),
    errorCode("invalid-configuration"),
  );
  assert.equal(boundary.requests.length, 0);
  const invalid = live(t, boundary);
  await assert.rejects(
    invalid.inspect({
      ...syntheticCredentials(),
      authToken: "short",
    }),
    errorCode("invalid-credentials"),
  );
  assert.equal(boundary.authCalls, 0);
});

test("DTOs reject credential fields, duplicate IDs, unknown versions and false readiness", () => {
  assert.equal(
    communicationsSetupInspectionSchema.safeParse(inspection()).success,
    true,
  );
  assert.equal(
    communicationsSetupInspectionSchema.safeParse({
      ...inspection(),
      credentials: syntheticCredentials(),
    }).success,
    false,
  );
  assert.equal(
    communicationsSetupInspectionSchema.safeParse(
      inspection("twilio", {
        numbers: [number(), number()],
      }),
    ).success,
    false,
  );
  assert.equal(communicationsSetupPlanSchema.safeParse(plan()).success, true);
  assert.equal(
    communicationsSetupPlanSchema.safeParse(
      plan("twilio", number(), {
        steps: [
          { id: "same", label: "A", kind: "create" },
          { id: "same", label: "B", kind: "update" },
        ],
      }),
    ).success,
    false,
  );
  assert.equal(
    communicationsSetupConfiguredSchema.safeParse(result()).success,
    true,
  );
  for (const checks of [
    {
      credentials: "passed",
      webhooks: "passed",
      browser: "passed",
      testCall: "pending",
    },
    {
      credentials: "passed",
      webhooks: "passed",
      browser: "pending",
      testCall: "passed",
    },
  ]) {
    assert.equal(
      communicationsSetupConfiguredSchema.safeParse(
        result("twilio", { checks }),
      ).success,
      false,
    );
  }
  assert.equal(
    communicationsSetupConfiguredSchema.safeParse(
      result("twilio", {
        contractVersion: "another-version",
      }),
    ).success,
    false,
  );
});

test("GET status supports configuring and a pre-plan null number without asserting browser proof", () => {
  assert.equal(
    communicationsSetupStatusSchema.safeParse(
      result("twilio", {
        phase: "configuring",
        checks: {
          credentials: "passed",
          webhooks: "pending",
          browser: "pending",
          testCall: "pending",
        },
      }),
    ).success,
    true,
  );
  assert.equal(
    communicationsSetupStatusSchema.safeParse(
      result("twilio", {
        phase: "select-number",
        number: null,
        checks: {
          credentials: "passed",
          webhooks: "pending",
          browser: "pending",
          testCall: "pending",
        },
      }),
    ).success,
    true,
  );
  assert.equal(
    communicationsSetupStatusSchema.safeParse(
      result("twilio", {
        phase: "configured",
        number: null,
      }),
    ).success,
    false,
  );
});

test("inspection rejects provider mismatches and credential echoes even in allowed fields", async (t) => {
  const input = syntheticCredentials();
  for (const reply of [
    inspection("telnyx"),
    inspection("twilio", { accountLabel: input.authToken }),
    inspection("twilio", { accountLabel: input.accountSid }),
  ]) {
    const adapter = live(t, backend("twilio", { inspect: () => json(reply) }));
    await assert.rejects(adapter.inspect(input), errorCode("invalid-response"));
    const surface = publicSurface(adapter);
    assert.equal(surface.includes(input.authToken), false);
    assert.equal(surface.includes(input.accountSid), false);
    assert.equal(adapter.getSnapshot().inspection, null);
  }
});

test("HTTP credential, permission and network failures never echo provider messages or raw causes", async (t) => {
  const input = syntheticCredentials();
  for (const [status, code, expected] of [
    [401, "session-expired", "authentication-required"],
    [403, "origin-denied", "permission-denied"],
    [422, "invalid-credentials", "invalid-credentials"],
    [502, "unlisted-provider-code", "network-error"],
  ]) {
    const adapter = live(
      t,
      backend("twilio", {
        inspect: () =>
          json(
            {
              error: {
                code,
                message: input.authToken,
                authToken: input.authToken,
              },
            },
            status,
          ),
      }),
    );
    let caught;
    try {
      await adapter.inspect(input);
    } catch (error) {
      caught = error;
    }
    assert.equal(caught.code, expected);
    assert.equal(
      publicSurface(adapter, caught).includes(input.authToken),
      false,
    );
    assert.equal(caught.message.includes(input.authToken), false);
    assert.equal(caught.cause, undefined);
  }
  const adapter = live(
    t,
    backend("twilio", {
      inspect: () => {
        throw new Error(input.authToken);
      },
    }),
  );
  await assert.rejects(adapter.inspect(input), errorCode("network-error"));
  assert.equal(publicSurface(adapter).includes(input.authToken), false);
});

test("only eligible inspected numbers can reach plan, and plan is read-only", async (t) => {
  const boundary = backend();
  const adapter = live(t, boundary);
  await adapter.inspect(syntheticCredentials());
  await assert.rejects(
    adapter.plan("unknown"),
    errorCode("number-not-eligible"),
  );
  await assert.rejects(
    adapter.plan("messages-only"),
    errorCode("number-not-eligible"),
  );
  assert.equal(boundary.requests.length, 1);
  await adapter.plan("existing-voice");
  assert.deepEqual(boundary.requests[1].body, {
    connectionId,
    numberId: "existing-voice",
  });
  assert.equal(adapter.getSnapshot().phase, "review");
  assert.equal(
    boundary.requests.some((value) => value.resource === "apply"),
    false,
  );
  assert.equal(Object.isFrozen(adapter.getSnapshot().plan.number), true);
});

test("a plan cannot change the connection, provider, selected number or phone destination", async (t) => {
  for (const value of [
    plan("twilio", number(), { connectionId: otherConnectionId }),
    plan("telnyx"),
    plan("twilio", number("another-number")),
    plan("twilio", number("existing-voice", { phoneNumber: "+12025550999" })),
  ]) {
    const adapter = live(t, backend("twilio", { plan: () => json(value) }));
    await adapter.inspect(syntheticCredentials());
    await assert.rejects(
      adapter.plan("existing-voice"),
      errorCode("invalid-response"),
    );
    assert.equal(adapter.getSnapshot().phase, "select-number");
    assert.equal(adapter.getSnapshot().plan, null);
  }
});

test("an existing uncertain backend journal discovered during plan exposes reconciliation", async (t) => {
  const boundary = backend("twilio", {
    plan: () => json({ error: { code: "setup-reconciliation-required" } }, 409),
  });
  const adapter = live(t, boundary);
  await adapter.inspect(syntheticCredentials());
  await assert.rejects(
    adapter.plan("existing-voice"),
    errorCode("setup-reconciliation-required"),
  );
  assert.equal(adapter.getSnapshot().phase, "unknown");
  await assert.rejects(
    adapter.apply(confirm),
    errorCode("setup-reconciliation-required"),
  );
  await adapter.reconcile();
  assert.equal(adapter.getSnapshot().phase, "configured");
  assert.deepEqual(
    boundary.requests.map((request) => request.resource),
    ["inspect", "plan", "status"],
  );
});

test("apply requires explicit reviewed confirmation, including existing-routing replacement", async (t) => {
  const boundary = backend();
  const adapter = live(t, boundary);
  await assert.rejects(adapter.apply(confirm), errorCode("invalid-state"));
  await reviewed(adapter, "twilio", "existing-routing");
  for (const value of [
    {},
    { configure: false, replaceExistingRouting: true },
    { ...confirm, extra: true },
  ]) {
    await assert.rejects(
      adapter.apply(value),
      errorCode("setup-confirmation-required"),
    );
  }
  await assert.rejects(
    adapter.apply(confirm),
    errorCode("routing-replacement-confirmation-required"),
  );
  assert.equal(
    boundary.requests.filter((value) => value.resource === "apply").length,
    0,
  );
});

test("successful apply sends only plan ID and confirmation and preserves pending browser/call checks", async (t) => {
  for (const provider of ["twilio", "telnyx"]) {
    const boundary = backend(provider);
    const adapter = live(t, boundary);
    await reviewed(adapter, provider);
    const configured = await adapter.apply(confirm);
    assert.deepEqual(boundary.requests[2].body, {
      planId,
      confirmation: confirm,
    });
    assert.equal(configured.phase, "configured");
    assert.equal(configured.checks.browser, "pending");
    assert.equal(configured.checks.testCall, "pending");
    assert.equal(adapter.getSnapshot().busy, null);
    assert.equal(adapter.getSnapshot().phase, "configured");
    assert.deepEqual(
      boundary.requests.map((value) => value.resource),
      ["inspect", "plan", "apply"],
    );
  }
});

test("expired plans cannot reach apply or implicitly refresh themselves", async (t) => {
  let now = 1000;
  let applies = 0;
  const adapter = createSetupController({
    mode: "live",
    now: () => now,
    operations: {
      inspect: async () => inspection(),
      plan: async () =>
        plan("twilio", number(), { expiresAt: new Date(2000).toISOString() }),
      apply: async () => {
        applies++;
        return result();
      },
      status: async () => result(),
    },
  });
  t.after(() => adapter.dispose());
  await reviewed(adapter);
  now = 2000;
  await assert.rejects(adapter.apply(confirm), errorCode("setup-plan-expired"));
  assert.equal(applies, 0);
  assert.equal(adapter.getSnapshot().phase, "review");
});

test("duplicate inspect and apply clicks result in one request each", async (t) => {
  const inspectPending = deferred();
  const applyPending = deferred();
  const boundary = backend("twilio", {
    inspect: () => inspectPending.promise,
    apply: () => applyPending.promise,
  });
  const adapter = live(t, boundary);
  const first = adapter.inspect(syntheticCredentials());
  await assert.rejects(
    adapter.inspect(syntheticCredentials()),
    errorCode("setup-busy"),
  );
  await flush();
  assert.equal(boundary.requests.length, 1);
  inspectPending.resolve(json(inspection()));
  await first;
  await adapter.plan("existing-voice");
  const applying = adapter.apply(confirm);
  await assert.rejects(adapter.apply(confirm), errorCode("setup-busy"));
  await flush();
  assert.equal(
    boundary.requests.filter((value) => value.resource === "apply").length,
    1,
  );
  applyPending.resolve(json(result()));
  await applying;
});

test("back aborts inspection, clears public state and ignores the later response", async (t) => {
  const pending = deferred();
  const boundary = backend("twilio", { inspect: () => pending.promise });
  const adapter = live(t, boundary);
  const inspecting = adapter.inspect(syntheticCredentials());
  const rejected = assert.rejects(inspecting, errorCode("request-cancelled"));
  await flush();
  adapter.back();
  const afterBack = adapter.getSnapshot();
  assert.equal(boundary.requests[0].init.signal.aborted, true);
  pending.resolve(json(inspection()));
  await rejected;
  await flush();
  assert.equal(adapter.getSnapshot(), afterBack);
  assert.equal(afterBack.phase, "credentials");
  assert.equal(afterBack.inspection, null);
});

test("a cancelled older inspection cannot overwrite a newer provider's result", async (t) => {
  const pending = deferred();
  const boundary = backend("twilio", {
    inspect: (request) =>
      request.body.provider === "twilio"
        ? pending.promise
        : json(inspection("telnyx", { connectionId: otherConnectionId })),
  });
  const adapter = live(t, boundary);
  const old = adapter.inspect(syntheticCredentials());
  const rejected = assert.rejects(old, errorCode("request-cancelled"));
  await flush();
  adapter.back();
  adapter.setProvider("telnyx");
  await adapter.inspect(syntheticCredentials("telnyx"));
  const latest = adapter.getSnapshot();
  pending.resolve(json(inspection()));
  await rejected;
  await flush();
  assert.equal(adapter.getSnapshot(), latest);
  assert.equal(latest.provider, "telnyx");
  assert.equal(latest.inspection.connectionId, otherConnectionId);
});

test("dispose aborts pending work and prevents all later notifications or auth/HTTP", async (t) => {
  const pending = deferred();
  const boundary = backend("twilio", { inspect: () => pending.promise });
  const adapter = live(t, boundary);
  let notifications = 0;
  adapter.subscribe(() => notifications++);
  const inspecting = adapter.inspect(syntheticCredentials());
  const rejected = assert.rejects(inspecting, errorCode("request-cancelled"));
  await flush();
  adapter.dispose();
  const count = notifications;
  const snapshot = adapter.getSnapshot();
  pending.resolve(json(inspection()));
  await rejected;
  await flush();
  assert.equal(notifications, count);
  assert.equal(adapter.getSnapshot(), snapshot);
  await assert.rejects(
    adapter.inspect(syntheticCredentials()),
    errorCode("disposed"),
  );
  assert.equal(boundary.requests.length, 1);
});

test("cancellation while inspection auth is pending never dispatches credentials", async (t) => {
  const pendingAuth = deferred();
  const boundary = backend();
  const adapter = live(t, boundary, {
    getAuthHeaders: () => pendingAuth.promise,
  });
  const inspecting = adapter.inspect(syntheticCredentials());
  const rejected = assert.rejects(inspecting, errorCode("request-cancelled"));
  adapter.cancel();
  pendingAuth.resolve({ authorization: ownerAuthorization });
  await rejected;
  await flush();
  assert.equal(boundary.requests.length, 0);
});

test("cancellation while apply auth is pending restores review without dispatch or uncertainty", async (t) => {
  const pendingAuth = deferred();
  let authCalls = 0;
  const boundary = backend();
  const adapter = live(t, boundary, {
    getAuthHeaders: () =>
      ++authCalls < 3
        ? { authorization: ownerAuthorization }
        : pendingAuth.promise,
  });
  await reviewed(adapter);
  const applying = adapter.apply(confirm);
  const rejected = assert.rejects(applying, errorCode("request-cancelled"));
  await flush();
  adapter.cancel();
  pendingAuth.resolve({ authorization: ownerAuthorization });
  await rejected;
  await flush();
  assert.equal(adapter.getSnapshot().phase, "review");
  assert.equal(
    boundary.requests.filter((value) => value.resource === "apply").length,
    0,
  );
});

test("a lost apply response becomes unknown and permits GET reconciliation, never reapply", async (t) => {
  const boundary = backend("twilio", {
    apply: () => {
      throw new Error("SYNTHETIC_LOST_RESPONSE");
    },
  });
  const adapter = live(t, boundary);
  await reviewed(adapter);
  await assert.rejects(adapter.apply(confirm), errorCode("network-error"));
  assert.equal(adapter.getSnapshot().phase, "unknown");
  assert.equal(
    adapter.getSnapshot().error.code,
    "setup-reconciliation-required",
  );
  await assert.rejects(
    adapter.apply(confirm),
    errorCode("setup-reconciliation-required"),
  );
  assert.throws(
    () => adapter.back(),
    errorCode("setup-reconciliation-required"),
  );
  const reconciled = await adapter.reconcile();
  assert.equal(reconciled.phase, "configured");
  const get = boundary.requests.at(-1);
  assert.equal(get.method, "GET");
  assert.equal(get.body, null);
  assert.equal(new URL(get.url).searchParams.get("connectionId"), connectionId);
  assert.deepEqual([...new URL(get.url).searchParams.keys()], ["connectionId"]);
  assert.equal(
    boundary.requests.filter((value) => value.resource === "apply").length,
    1,
  );
});

test("a failed setup result remains reconciliation-only and uses a fixed safe error", async (t) => {
  const boundary = backend("twilio", {
    apply: () => json(result("twilio", { phase: "failed" })),
  });
  const adapter = live(t, boundary);
  await reviewed(adapter);
  const failed = await adapter.apply(confirm);
  assert.equal(failed.phase, "failed");
  assert.equal(
    adapter.getSnapshot().error.code,
    "setup-reconciliation-required",
  );
  await assert.rejects(
    adapter.apply(confirm),
    errorCode("setup-reconciliation-required"),
  );
  assert.throws(
    () => adapter.back(),
    errorCode("setup-reconciliation-required"),
  );
  await adapter.reconcile();
  assert.equal(adapter.getSnapshot().phase, "configured");
  assert.equal(
    boundary.requests.filter((value) => value.resource === "apply").length,
    1,
  );
});

test("abort after apply dispatch keeps unknown, even if a successful late response arrives", async (t) => {
  const pending = deferred();
  const boundary = backend("twilio", { apply: () => pending.promise });
  const adapter = live(t, boundary);
  await reviewed(adapter);
  const applying = adapter.apply(confirm);
  const rejected = assert.rejects(applying, errorCode("request-cancelled"));
  await flush();
  adapter.cancel();
  const unknown = adapter.getSnapshot();
  pending.resolve(json(result()));
  await rejected;
  await flush();
  assert.equal(adapter.getSnapshot(), unknown);
  assert.equal(unknown.phase, "unknown");
  await assert.rejects(
    adapter.apply(confirm),
    errorCode("setup-reconciliation-required"),
  );
});

test("malformed apply success does not invent configured status", async (t) => {
  for (const reply of [
    result("telnyx"),
    result("twilio", { connectionId: otherConnectionId }),
    result("twilio", { number: number("another-number") }),
    result("twilio", {
      number: number("existing-voice", { phoneNumber: "+12025550999" }),
    }),
    result("twilio", { credentials: syntheticCredentials() }),
  ]) {
    const adapter = live(t, backend("twilio", { apply: () => json(reply) }));
    await reviewed(adapter);
    await assert.rejects(adapter.apply(confirm), errorCode("invalid-response"));
    assert.equal(adapter.getSnapshot().phase, "unknown");
    assert.equal(adapter.getSnapshot().result.phase, "unknown");
  }
});

test("recovery configuring stays pending and later status can complete without another apply", async (t) => {
  let reads = 0;
  const boundary = backend("twilio", {
    status: () =>
      json(
        result(
          "twilio",
          reads++ === 0
            ? {
                phase: "configuring",
                checks: {
                  credentials: "passed",
                  webhooks: "pending",
                  browser: "pending",
                  testCall: "pending",
                },
              }
            : {},
        ),
      ),
  });
  const adapter = live(t, boundary, { connectionId });
  assert.equal(adapter.getSnapshot().phase, "unknown");
  assert.equal(boundary.requests.length, 0);
  await adapter.reconcile();
  assert.equal(adapter.getSnapshot().phase, "configuring");
  await assert.rejects(
    adapter.apply(confirm),
    errorCode("setup-reconciliation-required"),
  );
  await adapter.reconcile();
  assert.equal(adapter.getSnapshot().phase, "configured");
  assert.deepEqual(
    boundary.requests.map((value) => value.resource),
    ["status", "status"],
  );
});

test("recovery before a plan returns to credential entry and cannot apply an absent plan", async (t) => {
  const boundary = backend("twilio", {
    status: () =>
      json(
        result("twilio", {
          number: null,
          phase: "select-number",
          checks: {
            credentials: "passed",
            webhooks: "pending",
            browser: "pending",
            testCall: "pending",
          },
        }),
      ),
  });
  const adapter = live(t, boundary, { connectionId });
  await adapter.reconcile();
  assert.equal(adapter.getSnapshot().phase, "credentials");
  await assert.rejects(adapter.apply(confirm), errorCode("invalid-state"));
});

test("safe reconciliation error ignores the wire's arbitrary message", async (t) => {
  const secret = syntheticCredentials().authToken;
  const boundary = backend("twilio", {
    status: () =>
      json(
        result("twilio", {
          phase: "unknown",
          error: { code: "setup-reconciliation-required", message: secret },
        }),
      ),
  });
  const adapter = live(t, boundary, { connectionId });
  const response = await adapter.reconcile();
  assert.equal(response.error.message.includes(secret), false);
  assert.equal(publicSurface(adapter).includes(secret), false);
});

test("non-JSON and oversized or redirected responses fail safely", async (t) => {
  for (const reply of [
    () =>
      new Response("<html>secret echo</html>", {
        headers: { "content-type": "text/html" },
      }),
    () =>
      new Response("not JSON", {
        headers: { "content-type": "application/json" },
      }),
    () =>
      new Response("{}", {
        headers: {
          "content-type": "application/json",
          "content-length": "1048577",
        },
      }),
    () => {
      const response = json(inspection());
      Object.defineProperty(response, "redirected", { value: true });
      return response;
    },
  ]) {
    const adapter = live(t, backend("twilio", { inspect: reply }));
    await assert.rejects(
      adapter.inspect(syntheticCredentials()),
      errorCode("invalid-response"),
    );
    assert.equal(adapter.getSnapshot().inspection, null);
  }
});

test("bounded request timeout settles a host fetch that ignores its abort signal", async (t) => {
  const pending = deferred();
  const adapter = live(
    t,
    backend("twilio", { inspect: () => pending.promise }),
    {
      requestTimeoutMs: 20,
    },
  );
  await assert.rejects(
    adapter.inspect(syntheticCredentials()),
    errorCode("request-cancelled"),
  );
  assert.equal(adapter.getSnapshot().busy, null);
  assert.equal(adapter.getSnapshot().phase, "credentials");
  pending.resolve(json(inspection()));
  await flush();
  assert.equal(adapter.getSnapshot().inspection, null);
});

test("public demo completes both providers without network or storage and rejects non-fixture keys", async (t) => {
  const originalFetch = globalThis.fetch;
  let network = 0;
  globalThis.fetch = () => {
    network++;
    throw new Error("NO_DEMO_NETWORK");
  };
  const storageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("NO_DEMO_STORAGE");
    },
  });
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (storageDescriptor)
      Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    else delete globalThis.localStorage;
  });
  for (const provider of ["twilio", "telnyx"]) {
    const adapter = demo(t, { provider });
    await assert.rejects(
      adapter.inspect(syntheticCredentials(provider)),
      errorCode("demo-only"),
    );
    await adapter.inspect(getCommunicationsSetupDemoCredentials(provider));
    const selected = adapter
      .getSnapshot()
      .inspection.numbers.find((value) => value.voiceEnabled);
    await adapter.plan(selected.id);
    const configured = await adapter.apply(confirm);
    assert.equal(adapter.mode, "demo");
    assert.equal(configured.phase, "configured");
    assert.equal(configured.checks.browser, "pending");
    assert.equal(configured.checks.testCall, "pending");
  }
  assert.equal(network, 0);
});

test("demo empty, no-voice, permission and uncertain outcomes are explicit recoverable fixtures", async (t) => {
  for (const scenario of ["empty", "no-voice"]) {
    const adapter = demo(t, { scenario });
    await adapter.inspect(getCommunicationsSetupDemoCredentials("twilio"));
    assert.equal(
      adapter
        .getSnapshot()
        .inspection.numbers.some((value) => value.voiceEnabled),
      false,
    );
    await assert.rejects(
      adapter.plan("demo-twilio-support"),
      errorCode("number-not-eligible"),
    );
  }
  const denied = demo(t, { scenario: "permission-denied" });
  await assert.rejects(
    denied.inspect(getCommunicationsSetupDemoCredentials("twilio")),
    errorCode("permission-denied"),
  );
  for (const scenario of ["unknown", "configuring"]) {
    const adapter = demo(t, { scenario });
    await adapter.inspect(getCommunicationsSetupDemoCredentials("twilio"));
    await adapter.plan("demo-twilio-support");
    await adapter.apply(confirm);
    assert.equal(adapter.getSnapshot().phase, "unknown");
    await assert.rejects(
      adapter.apply(confirm),
      errorCode("setup-reconciliation-required"),
    );
    await adapter.reconcile();
    if (scenario === "configuring") {
      assert.equal(adapter.getSnapshot().phase, "configuring");
      await adapter.reconcile();
    }
    assert.equal(adapter.getSnapshot().phase, "configured");
  }
});
