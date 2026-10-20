import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { setImmediate as nextTurn } from "node:timers/promises";
import { after, test } from "node:test";

const sourceRoot = new URL("../src/", import.meta.url);
const hooks = registerHooks({
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
after(() => hooks.deregister());

const { IntegrationError } =
  await import("../src/lib/integrations/contracts.ts");
const { createHttpMediaCollectionBinding } =
  await import("../src/lib/integrations/media-collection.ts");
const { createGoogleDrivePickerBinding } =
  await import("../src/lib/integrations/drive-picker.ts");
const { getIntegrationDefinition } =
  await import("../src/lib/integrations/definitions.ts");
const { demoIntegrationConfiguration } =
  await import("../src/lib/integrations/demo-adapter.ts");

// All transport responses and the browser Picker surface are controlled
// fixtures. These regressions exercise kit code, not native provider acceptance.
const originalFetch = globalThis.fetch;
globalThis.fetch = () => assert.fail("No external traffic is allowed.");
after(() => {
  globalThis.fetch = originalFetch;
});

const scope = { workspaceId: "safety-workspace" };
const connection = {
  id: "safety-cloudinary",
  integrationId: "cloudinary",
  providerOptionId: "cloudinary",
  workspaceId: scope.workspaceId,
  status: "connected",
  account: { name: "Safety fixture" },
  configuration: {},
  grantedPermissions: ["assets.read", "assets.transform"],
  resourceIds: [],
  revision: 1,
};
const collection = {
  id: "safety-collection",
  name: "Reviewed public imagery",
  revision: 1,
  images: [
    {
      id: "image-1",
      src: "/assets/products/forma-desk-lamp.svg",
      alt: "Fixture lamp",
      width: 900,
      height: 900,
    },
  ],
};
const saved = () =>
  new Response(JSON.stringify({ ...collection, revision: 2 }), {
    headers: { "Content-Type": "application/json" },
  });
const code = (expected) => (error) =>
  error instanceof IntegrationError && error.code === expected;
const input = () => ({
  connection,
  collection: structuredClone(collection),
  idempotencyKey: "reviewed-media-key",
  scope,
});
function deferred() {
  let resolve;
  const promise = new Promise((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

test("media transport rejects URL-normalizing control characters before a request", () => {
  for (const baseUrl of [
    "/\n/collector.invalid",
    "/\r/collector.invalid",
    "/\t/collector.invalid",
  ]) {
    assert.notEqual(
      new URL(`${baseUrl}/connection`, "https://consumer.example").origin,
      "https://consumer.example",
    );
    assert.throws(
      () =>
        createHttpMediaCollectionBinding({
          baseUrl,
          fetcher: () =>
            assert.fail("Unsafe endpoints cannot receive a request."),
        }),
      code("validation"),
      JSON.stringify(baseUrl),
    );
  }
});

test("media multipart requests explicitly prevent external redirects", async () => {
  let request;
  const binding = createHttpMediaCollectionBinding({
    baseUrl: "/api/media",
    csrfToken: () => "fixture-csrf",
    fetcher: async (url, init) => {
      request = { url, init };
      return saved();
    },
  });
  const result = await binding.save(input());
  assert.equal(result.revision, 2);
  assert.equal(request.init.method, "POST");
  assert(request.init.body instanceof FormData);
  assert.equal(request.init.headers.get("X-CSRF-Token"), "fixture-csrf");
  assert.equal(request.init.mode, "same-origin");
  assert.equal(request.init.redirect, "error");
  assert.equal(request.init.cache, "no-store");
});

test("media transport refuses a redirected response from an injected fetcher", async () => {
  const binding = createHttpMediaCollectionBinding({
    fetcher: async () => {
      const response = saved();
      Object.defineProperty(response, "redirected", { value: true });
      return response;
    },
  });
  await assert.rejects(binding.save(input()), code("provider-error"));
});

test("media transport cannot accept a late successful response after abort", async () => {
  const response = deferred();
  const started = deferred();
  const controller = new AbortController();
  const binding = createHttpMediaCollectionBinding({
    fetcher: (_url, init) => {
      assert.equal(init.signal, controller.signal);
      started.resolve();
      return response.promise;
    },
  });
  const pending = binding.save({
    ...input(),
    scope: { ...scope, signal: controller.signal },
  });
  pending.catch(() => {});
  await started.promise;
  controller.abort();
  response.resolve(saved());
  await assert.rejects(pending, code("cancelled"));
});

test("direct HTTP media save rejects a returned collection belonging to another ID", async () => {
  const binding = createHttpMediaCollectionBinding({
    fetcher: async () =>
      Response.json({ ...collection, id: "foreign-collection", revision: 2 }),
  });
  const draft = input();
  await assert.rejects(binding.save(draft), code("provider-error"));
  assert.deepEqual(draft.collection, collection);
});

test("direct HTTP media save rejects an older revision without inventing a success", async () => {
  const binding = createHttpMediaCollectionBinding({
    fetcher: async () => Response.json({ ...collection, revision: 0 }),
  });
  const draft = input();
  await assert.rejects(binding.save(draft), code("conflict"));
  assert.deepEqual(draft.collection, collection);
});

test("Picker abort settles while the consumer token callback is unresolved", async (t) => {
  const originalWindow = globalThis.window;
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  });
  globalThis.window = {
    location: { origin: "https://consumer.example" },
    google: { picker: {} },
  };
  const token = deferred();
  const requested = deferred();
  const controller = new AbortController();
  const definition = getIntegrationDefinition("google-drive");
  const pickerConnection = {
    ...connection,
    id: "safety-drive",
    integrationId: definition.id,
    providerOptionId: definition.options[0].id,
    configuration: demoIntegrationConfiguration(definition),
    grantedPermissions: definition.permissions.map(
      (permission) => permission.id,
    ),
  };
  const binding = createGoogleDrivePickerBinding({
    developerKey: "PUBLIC_BROWSER_FIXTURE",
    appId: "123456",
    getAccessToken: () => {
      requested.resolve();
      return token.promise;
    },
    registerFiles: () =>
      assert.fail("Aborted selection cannot register resource grants."),
  });
  let outcome;
  const pending = binding
    .select({
      connection: pickerConnection,
      scope: { ...scope, signal: controller.signal },
    })
    .then(
      (value) => {
        outcome = { value };
      },
      (error) => {
        outcome = { error };
      },
    );
  await requested.promise;
  controller.abort();
  try {
    await nextTurn();
    await nextTurn();
    assert(
      outcome && code("cancelled")(outcome.error),
      "Cancellation must settle before a stalled token callback returns.",
    );
  } finally {
    token.resolve("late-fixture");
    await pending;
  }
});
