import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

const sourceRoot = new URL("../src/", import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/"))
      specifier = new URL(specifier.slice(2), sourceRoot).href;
    try {
      return nextResolve(specifier, context);
    } catch (cause) {
      if (
        cause.code === "ERR_MODULE_NOT_FOUND" &&
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
      throw cause;
    }
  },
});
after(() => hooks.deregister());

const { IntegrationError } =
  await import("../src/lib/integrations/contracts.ts");
const { getIntegrationDefinition, getIntegrationActionsForOption } =
  await import("../src/lib/integrations/definitions.ts");
const { createHttpIntegrationsAdapter } =
  await import("../src/lib/integrations/http-adapter.ts");
const { createIntegrationSearchBridge, createSearchBridgeSession } =
  await import("../src/lib/integrations/search-bridge.ts");
const { createGoogleDrivePickerBinding, parseDrivePickedFiles } =
  await import("../src/lib/integrations/drive-picker.ts");
const {
  createDemoMediaCollectionBinding,
  createHttpMediaCollectionBinding,
  parseMediaCollection,
} = await import("../src/lib/integrations/media-collection.ts");
const { parseIntegrationResult } =
  await import("../src/lib/integrations/validation.ts");

const scope = { workspaceId: "consumer-workspace-a" };
const code = (expected) => (cause) =>
  cause instanceof IntegrationError && cause.code === expected;
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
function connection(recipe, workspaceId = scope.workspaceId, extra = {}) {
  const definition = getIntegrationDefinition(recipe);
  assert.ok(definition);
  return {
    id: `${recipe}-consumer-connection`,
    integrationId: recipe,
    providerOptionId: definition.options[0].id,
    workspaceId,
    status: "connected",
    account: { name: "Consumer test account" },
    configuration: {},
    grantedPermissions: definition.permissions.map(
      (permission) => permission.id,
    ),
    resourceIds: ["approved-resource"],
    revision: 3,
    ...extra,
  };
}
const publicCollection = (extra = {}) => ({
  id: "brand-imagery",
  name: "Consumer brand imagery",
  revision: 1,
  images: [
    {
      id: "primary-image",
      src: "/assets/approved-image.png",
      alt: "Approved product image",
      width: 1,
      height: 1,
    },
  ],
  ...extra,
});
const raster =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN3sAAAAASUVORK5CYII=";

for (const recipe of ["algolia", "self-hostable-search"]) {
  test(`consumer palette: ${recipe} bridge uses the real HTTP adapter and declared provider vocabulary`, async () => {
    const definition = getIntegrationDefinition(recipe);
    const calls = [];
    let providerOptionId = definition.options[0].id;
    let revision = 3;
    const adapter = createHttpIntegrationsAdapter({
      baseUrl: "/api/consumer-integrations",
      fetcher: async (target, init) => {
        calls.push({ target: String(target), init });
        const url = new URL(target, "https://consumer.example");
        const workspaceId = url.searchParams.get("workspaceId");
        if (url.pathname.endsWith("/execute")) {
          return json({
            kind: "search",
            total: 17,
            hits: [
              {
                id: `hit-${workspaceId}`,
                title: "Approved passage",
                snippet: "Backend-provided matching passage.",
                source: "Selected search index",
                url: "/en/docs/#consumer-search",
                score: 0.7,
              },
            ],
            facets: [
              {
                id: "status",
                label: "Status",
                buckets: [{ value: "ready", label: "Ready", count: 17 }],
              },
            ],
          });
        }
        return json(
          connection(recipe, workspaceId, { providerOptionId, revision }),
        );
      },
    });
    const bridge = createIntegrationSearchBridge({
      adapter,
      definition,
      actionsForOption: (optionId) =>
        getIntegrationActionsForOption(definition, optionId),
    });
    assert.equal(bridge.mode, "consumer");
    for (const option of definition.options) {
      providerOptionId = option.id;
      revision += 1;
      for (const workspaceId of [scope.workspaceId, "consumer-workspace-b"]) {
        const result = await createSearchBridgeSession().run(bridge, {
          workspaceId,
          query: "matching passage",
        });
        assert.equal(result.total, 17);
        assert.equal(result.hits[0].id, `hit-${workspaceId}`);
        const read = calls.at(-2);
        const execute = calls.at(-1);
        assert.equal(read.init.method, "GET");
        assert.equal(execute.init.method, "POST");
        assert.equal(execute.init.credentials, "same-origin");
        assert.equal(execute.init.redirect, "error");
        assert.ok(read.init.signal instanceof AbortSignal);
        assert.equal(read.init.signal, execute.init.signal);
        assert.equal(
          new URL(execute.target, "https://consumer.example").searchParams.get(
            "workspaceId",
          ),
          workspaceId,
        );
        const input = JSON.parse(execute.init.body);
        assert.equal(input.integrationId, recipe);
        assert.equal(input.values.query, "matching passage");
        assert.equal(input.values.resourceId, "approved-resource");
        const permitted = getIntegrationActionsForOption(
          definition,
          providerOptionId,
        );
        assert.ok(
          permitted.some(
            (action) =>
              action.id === input.actionId && action.kind === "search",
          ),
        );
      }
    }
    assert.equal(calls.length, definition.options.length * 4);
  });
}

test("consumer palette: denied grants stop before execute and backend errors remain localized codes", async () => {
  const definition = getIntegrationDefinition("algolia");
  let calls = 0;
  const adapter = createHttpIntegrationsAdapter({
    fetcher: async () => {
      calls += 1;
      return json(
        connection("algolia", scope.workspaceId, {
          grantedPermissions: [],
        }),
      );
    },
  });
  const bridge = createIntegrationSearchBridge({ adapter, definition });
  await assert.rejects(
    createSearchBridgeSession().run(bridge, {
      workspaceId: scope.workspaceId,
      query: "approved",
    }),
    (cause) =>
      cause.code === "permission-denied" &&
      !cause.message.includes("consumer-connection"),
  );
  assert.equal(calls, 1);

  const denied = createHttpIntegrationsAdapter({
    fetcher: async () =>
      json(
        { diagnostic: "Synthetic backend detail must stay out of UI." },
        403,
      ),
  });
  await assert.rejects(
    createSearchBridgeSession().run(
      createIntegrationSearchBridge({ adapter: denied, definition }),
      { workspaceId: scope.workspaceId, query: "approved" },
    ),
    (cause) =>
      cause.code === "permission-denied" &&
      !cause.message.includes("Synthetic"),
  );
});

test("Drive selection DTO strips native payload extras and rejects duplicate or oversized scopes", () => {
  const file = {
    id: "picked-file",
    name: "Approved document",
    mimeType: "text/plain",
  };
  assert.deepEqual(
    parseDrivePickedFiles([
      {
        ...file,
        url: "https://example.invalid/private",
        owner: "Unused owner",
        oauthToken: "synthetic",
      },
    ]),
    [file],
  );
  assert.throws(
    () => parseDrivePickedFiles([file, file]),
    code("provider-error"),
  );
  assert.throws(() => parseDrivePickedFiles([]), code("provider-error"));
  assert.throws(
    () =>
      parseDrivePickedFiles(
        Array.from({ length: 101 }, (_, index) => ({
          ...file,
          id: `picked-${index}`,
        })),
      ),
    code("provider-error"),
  );
});

async function withPickerBrowser(run) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const opened = deferred();
  const picker = {
    visibility: [],
    disposed: 0,
    setVisible(value) {
      this.visibility.push(value);
      if (value) opened.resolve();
    },
    dispose() {
      this.disposed += 1;
    },
  };
  const state = { callback: null, token: null, origin: null, opened, picker };
  class PickerBuilder {
    addView() {
      return this;
    }
    setAppId() {
      return this;
    }
    setDeveloperKey() {
      return this;
    }
    setOAuthToken(value) {
      state.token = value;
      return this;
    }
    setOrigin(value) {
      state.origin = value;
      return this;
    }
    setLocale() {
      return this;
    }
    enableFeature() {
      return this;
    }
    setCallback(callback) {
      state.callback = callback;
      return this;
    }
    build() {
      return picker;
    }
  }
  class DocsView {
    setIncludeFolders() {}
    setMimeTypes() {}
  }
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { origin: "https://consumer.example" },
      google: {
        picker: {
          PickerBuilder,
          DocsView,
          Feature: { MULTISELECT_ENABLED: "multiple" },
        },
      },
    },
  });
  try {
    await run(state);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else delete globalThis.window;
  }
}

const pickerOptions = (extra = {}) => ({
  developerKey: "public-test-browser-key",
  appId: "123456",
  getAccessToken: async () => "short-lived-synthetic-token",
  registerFiles: async ({ connection: selected }) => selected,
  ...extra,
});

test("Drive native boundary: explicit selection keeps the token in the SDK and disposes the picker", async () => {
  await withPickerBrowser(async (state) => {
    const binding = createGoogleDrivePickerBinding(pickerOptions());
    const pending = binding.select({
      connection: connection("google-drive"),
      scope,
    });
    await state.opened.promise;
    const file = {
      id: "file-from-picker",
      name: "Approved document",
      mimeType: "text/plain",
    };
    state.callback({
      action: "picked",
      docs: [
        {
          ...file,
          url: "https://example.invalid/download",
          owner: "Unused owner",
        },
      ],
    });
    const result = await pending;
    assert.deepEqual(result, { kind: "selected", files: [file] });
    assert.equal(state.origin, "https://consumer.example");
    assert.equal(state.token, "short-lived-synthetic-token");
    assert.equal(JSON.stringify(result).includes("synthetic-token"), false);
    assert.deepEqual(state.picker.visibility, [true, false]);
    assert.equal(state.picker.disposed, 1);
  });
});

test("Drive native boundary: scope abort disposes the open dialog and ignores a late selection", async () => {
  await withPickerBrowser(async (state) => {
    const controller = new AbortController();
    const binding = createGoogleDrivePickerBinding(pickerOptions());
    const pending = binding.select({
      connection: connection("google-drive"),
      scope: { ...scope, signal: controller.signal },
    });
    const rejection = assert.rejects(pending, code("cancelled"));
    await state.opened.promise;
    controller.abort();
    state.callback({
      action: "picked",
      docs: [{ id: "late", name: "Late document", mimeType: "text/plain" }],
    });
    await rejection;
    assert.deepEqual(state.picker.visibility, [true, false]);
    assert.equal(state.picker.disposed, 1);
  });
});

test("Drive native boundary: token retrieval settles on abort before an ignored OAuth callback returns", async () => {
  await withPickerBrowser(async (state) => {
    const token = deferred();
    const requested = deferred();
    const controller = new AbortController();
    const binding = createGoogleDrivePickerBinding(
      pickerOptions({
        getAccessToken: async (input) => {
          assert.equal(input.scope.signal, controller.signal);
          requested.resolve();
          return token.promise;
        },
      }),
    );
    const pending = binding.select({
      connection: connection("google-drive"),
      scope: { ...scope, signal: controller.signal },
    });
    let settled = false;
    const rejection = assert.rejects(pending, code("cancelled")).then(() => {
      settled = true;
    });
    await requested.promise;
    controller.abort();
    await new Promise(setImmediate);
    const settledBeforeToken = settled;
    token.resolve("synthetic-token-after-abort");
    await rejection;
    assert.equal(
      settledBeforeToken,
      true,
      "Cancel must release the caller without waiting for the OAuth callback.",
    );
    assert.equal(state.callback, null);
    assert.equal(state.token, null);
    assert.deepEqual(state.picker.visibility, []);
  });
});

test("public media parsing accepts prepared rasters only before upload, preserves alt text and enforces image identity", () => {
  const draft = publicCollection({
    images: [
      {
        id: "edited-image",
        src: raster,
        alt: "Prepared crop",
        width: 1,
        height: 1,
      },
    ],
  });
  assert.equal(parseMediaCollection(draft).images[0].src, raster);
  assert.throws(
    () => parseMediaCollection(draft, true),
    code("provider-error"),
  );
  assert.throws(
    () =>
      parseMediaCollection(
        publicCollection({
          images: [{ ...draft.images[0], src: "javascript:alert(1)" }],
        }),
      ),
    code("provider-error"),
  );
  assert.throws(
    () =>
      parseMediaCollection(
        publicCollection({ images: [draft.images[0], draft.images[0]] }),
      ),
    code("provider-error"),
  );
});

test("demo media revisions, idempotent retries, permission denial and workspace data remain isolated", async () => {
  const binding = createDemoMediaCollectionBinding();
  const first = connection("cloudinary");
  const initial = await binding.load({ connection: first, scope });
  initial.images[0].alt = "Reviewed crop description";
  const input = {
    connection: first,
    scope,
    collection: initial,
    idempotencyKey: "reviewed-edit",
  };
  const saved = await binding.save(input);
  assert.equal(saved.revision, initial.revision + 1);
  assert.equal(saved.images[0].alt, "Reviewed crop description");
  assert.deepEqual(await binding.save(input), saved);
  await assert.rejects(
    binding.save({ ...input, idempotencyKey: "stale-revision" }),
    code("conflict"),
  );
  await assert.rejects(
    binding.save({
      ...input,
      collection: { ...initial, name: "Different draft" },
    }),
    code("conflict"),
  );
  const otherScope = { workspaceId: "consumer-workspace-b" };
  const other = await binding.load({
    connection: { ...first, workspaceId: otherScope.workspaceId },
    scope: otherScope,
  });
  assert.equal(other.revision, 1);
  assert.notEqual(other.images[0].alt, saved.images[0].alt);
  const readOnly = { ...first, grantedPermissions: ["assets.read"] };
  await assert.rejects(
    binding.save({ ...input, connection: readOnly }),
    code("permission-denied"),
  );
  await assert.rejects(
    binding.load({ connection: first, scope: otherScope }),
    code("configuration-required"),
  );
});

test("HTTP media uploads raster bytes and revision metadata through a reviewed scoped multipart request", async () => {
  const calls = [];
  let csrfCalls = 0;
  const binding = createHttpMediaCollectionBinding({
    baseUrl: "/api/consumer-media",
    csrfToken: () => {
      csrfCalls += 1;
      return "synthetic-csrf";
    },
    fetcher: async (target, init) => {
      calls.push({ target: String(target), init });
      return json(
        publicCollection({ revision: init.method === "POST" ? 2 : 1 }),
      );
    },
  });
  const current = connection("cloudinary");
  await binding.load({ connection: current, scope });
  assert.equal(csrfCalls, 0);
  const result = await binding.save({
    connection: current,
    scope,
    collection: publicCollection({
      images: [
        {
          id: "edited-image",
          src: raster,
          alt: "Reviewed raster crop",
          width: 1,
          height: 1,
        },
      ],
    }),
    idempotencyKey: "reviewed-raster-upload",
  });
  assert.equal(result.revision, 2);
  const upload = calls.at(-1).init;
  assert.equal(upload.method, "POST");
  assert.equal(upload.credentials, "same-origin");
  assert.equal(upload.headers.get("X-Workspace-Id"), scope.workspaceId);
  assert.equal(upload.headers.get("X-CSRF-Token"), "synthetic-csrf");
  assert.equal(upload.headers.get("Idempotency-Key"), "reviewed-raster-upload");
  assert.equal(csrfCalls, 1);
  const metadata = JSON.parse(upload.body.get("metadata"));
  assert.equal(metadata.connectionRevision, current.revision);
  assert.equal(metadata.revision, 1);
  assert.equal(metadata.images[0].alt, "Reviewed raster crop");
  assert.equal("src" in metadata.images[0], false);
  const file = upload.body.get(metadata.images[0].fileKey);
  assert.equal(file.type, "image/png");
  assert.deepEqual(
    new Uint8Array(await file.arrayBuffer()),
    new Uint8Array(Buffer.from(raster.split(",")[1], "base64")),
  );
});

test("HTTP media refuses mismatched scopes, missing grants and pre-aborted requests before contacting the backend", async () => {
  let calls = 0;
  const binding = createHttpMediaCollectionBinding({
    fetcher: async () => {
      calls += 1;
      return json(publicCollection());
    },
  });
  const current = connection("cloudinary");
  await assert.rejects(
    binding.load({
      connection: current,
      scope: { workspaceId: "different-workspace" },
    }),
    code("configuration-required"),
  );
  await assert.rejects(
    binding.load({ connection: { ...current, grantedPermissions: [] }, scope }),
    code("permission-denied"),
  );
  await assert.rejects(
    binding.save({
      connection: { ...current, grantedPermissions: ["assets.read"] },
      scope,
      collection: publicCollection(),
      idempotencyKey: "denied-edit",
    }),
    code("permission-denied"),
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    binding.load({
      connection: current,
      scope: { ...scope, signal: controller.signal },
    }),
    code("cancelled"),
  );
  assert.equal(calls, 0);
});

test("HTTP media rejects a late response from a fetcher that ignores an aborted signal", async () => {
  const fetched = deferred();
  const requested = deferred();
  const controller = new AbortController();
  const binding = createHttpMediaCollectionBinding({
    fetcher: async (_target, init) => {
      assert.equal(init.signal, controller.signal);
      requested.resolve();
      return fetched.promise;
    },
  });
  const pending = binding.load({
    connection: connection("cloudinary"),
    scope: { ...scope, signal: controller.signal },
  });
  const rejection = assert.rejects(pending, code("cancelled"));
  await requested.promise;
  controller.abort();
  fetched.resolve(json(publicCollection()));
  await rejection;
});

test("HTTP media ignores a response body that finishes after its scope is aborted", async () => {
  const body = deferred();
  const reading = deferred();
  const controller = new AbortController();
  const binding = createHttpMediaCollectionBinding({
    fetcher: async () => {
      const response = json(publicCollection());
      response.text = async () => {
        reading.resolve();
        return body.promise;
      };
      return response;
    },
  });
  const pending = binding.load({
    connection: connection("cloudinary"),
    scope: { ...scope, signal: controller.signal },
  });
  const rejection = assert.rejects(pending, code("cancelled"));
  await reading.promise;
  controller.abort();
  body.resolve(JSON.stringify(publicCollection()));
  await rejection;
});

test("HTTP media scopes multipart requests to the same origin without following redirects", async () => {
  let init;
  const binding = createHttpMediaCollectionBinding({
    fetcher: async (_target, input) => {
      init = input;
      return json(publicCollection({ revision: 2 }));
    },
  });
  await binding.save({
    connection: connection("cloudinary"),
    scope,
    collection: publicCollection(),
    idempotencyKey: "same-origin-edit",
  });
  assert.equal(init.redirect, "error");
});

test("returned map selections keep unique location IDs, longitude/latitude order and bounded geometry", () => {
  const payload = {
    kind: "map",
    locations: [
      {
        id: "returned-place",
        name: "Returned place",
        latitude: 4.7,
        longitude: -74.1,
      },
    ],
    coordinates: [
      [-74.1, 4.7],
      [-73.9, 4.8],
    ],
  };
  assert.deepEqual(
    parseIntegrationResult(payload).coordinates,
    payload.coordinates,
  );
  for (const coordinates of [[[181, 4.7]], [[-74.1, 91]], [[NaN, 4.7]]])
    assert.throws(
      () => parseIntegrationResult({ ...payload, coordinates }),
      code("provider-error"),
    );
  assert.throws(
    () =>
      parseIntegrationResult({
        ...payload,
        locations: [
          payload.locations[0],
          {
            ...payload.locations[0],
            name: "Different place with the same selection ID",
            latitude: 5.2,
          },
        ],
      }),
    code("provider-error"),
  );
});
