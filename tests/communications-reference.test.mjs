import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

const resolver = registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        const url = new URL(`${specifier}.ts`, context.parentURL);
        if (existsSync(url)) return nextResolve(url.href, context);
      }
      throw error;
    }
  },
});
after(() => resolver.deregister());
const {
  ReferenceLabError,
  referenceBackendUrl,
  referenceLabLogin,
  referenceLabConnections,
  referenceLabRequest,
  referenceTestPermissionSchema,
} = await import("../src/lib/communications/reference-lab.ts");

const base = "https://voice.fixture.invalid/v1/communications";
const appToken = "private-owner-fixture-token-only-1234567890";
const response = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
const rejectsWith = (code) => (error) =>
  error instanceof ReferenceLabError && error.code === code;
const configured = {
  contractVersion: "aureform.setup.v1",
  connectionId: "11111111-1111-4111-8111-111111111111",
  provider: "twilio",
  phase: "configured",
  number: {
    id: "owned-number",
    phoneNumber: "+12025550100",
    label: "Fixture",
    voiceEnabled: true,
    hasExistingRouting: true,
  },
  checks: {
    credentials: "passed",
    webhooks: "passed",
    browser: "pending",
    testCall: "pending",
  },
};

test("private lab validates HTTPS mount before credentials can be dispatched", async () => {
  let requests = 0;
  for (const url of [
    "http://voice.fixture.invalid/v1/communications",
    "https://operator:secret@voice.fixture.invalid/v1/communications",
    `${base}?token=hidden`,
    `${base}#fragment`,
    "https://voice.fixture.invalid/other",
    "https://voice.fixture.invalid/v1/../v1/communications",
    "https://voice.fixture.invalid/v1/%63ommunications",
    "/v1/communications",
    `${base}\n`,
  ]) {
    await assert.rejects(
      referenceLabLogin(url, "secret-not-dispatched", {
        fetch: () => {
          requests++;
          throw new Error("must not run");
        },
      }),
      rejectsWith("invalid-configuration"),
    );
  }
  assert.equal(requests, 0);
  assert.equal(referenceBackendUrl(`${base}/`).href, base);
});

test("owner login uses one private JSON POST with no cookies, redirects or query authentication", async () => {
  const accessCode = "local-private-owner-access-code-fixture";
  const result = await referenceLabLogin(base, accessCode, {
    fetch: async (url, init) => {
      assert.equal(url, `${base}/setup/login`);
      assert.equal(init.method, "POST");
      assert.equal(init.credentials, "omit");
      assert.equal(init.redirect, "error");
      assert.equal(init.cache, "no-store");
      assert.equal(init.referrerPolicy, "no-referrer");
      assert.equal(init.headers.get("authorization"), null);
      assert.deepEqual(JSON.parse(init.body), { accessCode });
      return response({
        contractVersion: "aureform.setup.v1",
        sessionToken: appToken,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      });
    },
  });
  assert.equal(result.sessionToken, appToken);
  assert(!JSON.stringify(result).includes(accessCode));
});

test("owner login rejects expired, credential-echoing and incompatible responses", async () => {
  const valid = {
    contractVersion: "aureform.setup.v1",
    sessionToken: appToken,
    expiresAt: new Date(Date.now() + 600000).toISOString(),
  };
  for (const value of [
    { ...valid, expiresAt: new Date(0).toISOString() },
    { ...valid, authToken: "carrier-secret-echo" },
    { ...valid, contractVersion: "aureform.setup.v2" },
    { ...valid, sessionToken: "invalid token" },
  ]) {
    await assert.rejects(
      referenceLabLogin(base, "owner-fixture", {
        fetch: async () => response(value),
      }),
      rejectsWith("request-failed"),
    );
  }
});

test("authenticated recovery reads safe configured summaries without creating resources", async () => {
  let requests = 0;
  const results = await referenceLabConnections(base, appToken, {
    fetch: async (url, init) => {
      requests++;
      assert.equal(url, `${base}/setup/connections`);
      assert.equal(init.method, "GET");
      assert.equal(init.body, undefined);
      assert.equal(init.headers.get("authorization"), `Bearer ${appToken}`);
      return response([configured]);
    },
  });
  assert.equal(requests, 1);
  assert.deepEqual(results, [configured]);
  assert.equal(results[0].checks.browser, "pending");
  assert.equal(results[0].checks.testCall, "pending");
});

test("recovery rejects duplicated providers, private fields and fabricated browser completion", async () => {
  for (const value of [
    [configured, configured],
    [{ ...configured, apiKeySecret: "carrier-secret" }],
    [{ ...configured, checks: { ...configured.checks, browser: "passed" } }],
    [{ ...configured, phase: "unknown" }],
  ]) {
    await assert.rejects(
      referenceLabConnections(base, appToken, {
        fetch: async () => response(value),
      }),
      rejectsWith("request-failed"),
    );
  }
});

test("bounded authorization has an exact caller, one call and no observed-call claim", () => {
  const permission = {
    contractVersion: "aureform.setup.v1",
    provider: "twilio",
    phoneNumber: "+12025550100",
    callerNumber: "+12025550101",
    expiresAt: new Date(Date.now() + 300000).toISOString(),
    maxSeconds: 120,
    maxCalls: 1,
    phase: "test-authorized",
    observedCall: false,
  };
  assert(referenceTestPermissionSchema.safeParse(permission).success);
  for (const changes of [
    { maxCalls: 2 },
    { maxSeconds: 121 },
    { observedCall: true },
    { callerNumber: "*" },
    { authToken: "carrier-secret" },
  ])
    assert(
      !referenceTestPermissionSchema.safeParse({
        ...permission,
        ...changes,
      }).success,
    );
});

test("reference transport never exposes provider or fetch secrets through errors", async () => {
  const hidden = "private-provider-response-do-not-echo";
  for (const fetch of [
    async () => {
      throw new Error(hidden);
    },
    async () => response({ error: { code: hidden, message: hidden } }, 500),
    async () => response({ error: { code: hidden } }, 401),
  ]) {
    try {
      await referenceLabRequest(
        base,
        "authorize-test",
        {},
        {
          token: appToken,
          fetch,
        },
      );
      assert.fail("request must fail");
    } catch (error) {
      assert(error instanceof ReferenceLabError);
      assert(!JSON.stringify(error).includes(hidden));
      assert(!error.message.includes(hidden));
      assert(!error.stack.includes(hidden));
    }
  }
});

test("missing authentication fails before a bounded test is dispatched", async () => {
  let requests = 0;
  await assert.rejects(
    referenceLabRequest(
      base,
      "authorize-test",
      {},
      {
        fetch: async () => {
          requests++;
          return response({});
        },
      },
    ),
    rejectsWith("authentication-required"),
  );
  assert.equal(requests, 0);
});

test("invalid content and oversized replies cannot become successful lab actions", async () => {
  for (const reply of [
    new Response("<html>proxy error</html>", {
      headers: { "content-type": "text/html" },
    }),
    response({}, 200, { "content-length": "9000" }),
    response({ excess: "x".repeat(9000) }),
  ]) {
    await assert.rejects(
      referenceLabRequest(base, "connections", undefined, {
        token: appToken,
        fetch: async () => reply,
      }),
      rejectsWith("request-failed"),
    );
  }
});

test("reference transport maps readiness and pending test failures to fixed public copy", async () => {
  for (const [wire, code] of [
    ["agent-not-ready", "agent-not-ready"],
    ["credential-renewal-required", "agent-not-ready"],
    ["test-permission-already-pending", "test-pending"],
    ["test-call-already-active", "test-pending"],
  ]) {
    await assert.rejects(
      referenceLabRequest(
        base,
        "authorize-test",
        {},
        {
          token: appToken,
          fetch: async () => response({ error: { code: wire } }, 409),
        },
      ),
      rejectsWith(code),
    );
  }
});
