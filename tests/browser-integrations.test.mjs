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
const { getIntegrationDefinition } =
  await import("../src/lib/integrations/definitions.ts");
const { createDemoIntegrationsAdapter, demoIntegrationConfiguration } =
  await import("../src/lib/integrations/demo-adapter.ts");
const {
  parseIntegrationConnection,
  parseIntegrationResult,
  validateIntegrationFields,
} = await import("../src/lib/integrations/validation.ts");
const { createGoogleDrivePickerBinding, parseDrivePickedFiles } =
  await import("../src/lib/integrations/drive-picker.ts");
const {
  createDemoMediaCollectionBinding,
  createHttpMediaCollectionBinding,
  parseMediaCollection,
} = await import("../src/lib/integrations/media-collection.ts");
const scope = { workspaceId: "binding-workspace" };
const code = (expected) => (error) =>
  error instanceof IntegrationError && error.code === expected;
async function connect(id, providerOptionId) {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 }),
    definition = getIntegrationDefinition(id);
  const { connection } = await adapter.connect(
    {
      integrationId: id,
      providerOptionId: providerOptionId ?? definition.options[0].id,
      configuration: demoIntegrationConfiguration(definition),
      permissions: definition.permissions.map((permission) => permission.id),
      resourceIds: [],
    },
    scope,
  );
  return { adapter, definition, connection };
}
async function execute(context, actionId, values = {}) {
  return context.adapter.execute(
    {
      integrationId: context.definition.id,
      connectionId: context.connection.id,
      actionId,
      values,
    },
    scope,
  );
}
function mockPicker(t, payload) {
  const original = globalThis.window;
  let builds = 0,
    disposed = 0,
    sentToken;
  class DocsView {
    setIncludeFolders() {
      return this;
    }
    setMimeTypes() {
      return this;
    }
  }
  class PickerBuilder {
    addView() {
      return this;
    }
    setOAuthToken(token) {
      sentToken = token;
      return this;
    }
    setDeveloperKey() {
      return this;
    }
    setAppId() {
      return this;
    }
    setOrigin() {
      return this;
    }
    setLocale() {
      return this;
    }
    enableFeature() {
      return this;
    }
    setCallback(callback) {
      this.callback = callback;
      return this;
    }
    build() {
      builds++;
      return {
        setVisible: (visible) => {
          if (visible) queueMicrotask(() => this.callback(payload));
        },
        dispose() {
          disposed++;
        },
      };
    }
  }
  globalThis.window = {
    location: { origin: "https://consumer.example" },
    google: {
      picker: {
        DocsView,
        PickerBuilder,
        Feature: { MULTISELECT_ENABLED: "multi" },
      },
    },
  };
  t.after(() => {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  });
  return {
    builds: () => builds,
    disposed: () => disposed,
    token: () => sentToken,
  };
}

test("Picker selections keep only bounded explicit file metadata and reject duplicates", () => {
  assert.deepEqual(
    parseDrivePickedFiles([
      {
        id: "file-1",
        name: "Brief",
        mimeType: "application/pdf",
        unrelatedSecret: "not-projected",
      },
    ]),
    [{ id: "file-1", name: "Brief", mimeType: "application/pdf" }],
  );
  assert.throws(
    () =>
      parseDrivePickedFiles([
        { id: "same", name: "First", mimeType: "text/plain" },
        { id: "same", name: "Second", mimeType: "text/plain" },
      ]),
    code("provider-error"),
  );
  assert.throws(() => parseDrivePickedFiles([]), code("provider-error"));
  assert.throws(
    () =>
      parseDrivePickedFiles([
        { id: "\nfile", name: "Bad", mimeType: "text/plain" },
      ]),
    code("provider-error"),
  );
});
test("native Picker is opt-in, returns explicit files and disposes without persisting a token", async (t) => {
  const context = await connect("google-drive");
  const mock = mockPicker(t, {
    action: "picked",
    docs: [
      {
        id: "drive-file-1",
        name: "Roadmap",
        mimeType: "application/vnd.google-apps.document",
        url: "https://drive.google.com/file/d/drive-file-1",
      },
    ],
  });
  let registered = 0;
  const binding = createGoogleDrivePickerBinding({
    developerKey: "PUBLIC_TEST_BROWSER_KEY",
    appId: "123456",
    getAccessToken: async () => "short-lived-fixture",
    registerFiles: async () => {
      registered++;
      return context.connection;
    },
  });
  assert.equal(mock.builds(), 0);
  const selected = await binding.select({
    connection: context.connection,
    scope,
  });
  assert.deepEqual(selected, {
    kind: "selected",
    files: [
      {
        id: "drive-file-1",
        name: "Roadmap",
        mimeType: "application/vnd.google-apps.document",
      },
    ],
  });
  assert.equal(mock.token(), "short-lived-fixture");
  assert.equal(mock.disposed(), 1);
  assert.equal(
    registered,
    0,
    "Selection itself is not an authoritative resource grant.",
  );
  assert.deepEqual(context.connection.resourceIds, []);
});
test("Picker cancellation and a late token after abort cannot register files", async (t) => {
  const context = await connect("google-drive");
  const mock = mockPicker(t, { action: "cancel" });
  const binding = createGoogleDrivePickerBinding({
    developerKey: "PUBLIC_TEST_BROWSER_KEY",
    appId: "123456",
    getAccessToken: async () => "fixture",
    registerFiles: async () => context.connection,
  });
  assert.deepEqual(
    await binding.select({ connection: context.connection, scope }),
    { kind: "cancelled" },
  );
  assert.equal(mock.disposed(), 1);
  let resolveToken;
  const token = new Promise((resolve) => {
    resolveToken = resolve;
  });
  const abort = new AbortController();
  const late = createGoogleDrivePickerBinding({
    developerKey: "PUBLIC_TEST_BROWSER_KEY",
    appId: "123456",
    getAccessToken: () => token,
    registerFiles: async () => context.connection,
  });
  const pending = late.select({
    connection: context.connection,
    scope: { ...scope, signal: abort.signal },
  });
  await Promise.resolve();
  abort.abort();
  resolveToken("late-fixture");
  await assert.rejects(pending, code("cancelled"));
  assert.equal(
    mock.builds(),
    1,
    "An obsolete workspace never opens another Picker.",
  );
});
test("public media ordering, alt text and cropped bytes survive save with revision/idempotency checks", async () => {
  const context = await connect("cloudinary"),
    binding = createDemoMediaCollectionBinding();
  const original = await binding.load({
    connection: context.connection,
    scope,
  });
  const draft = structuredClone(original);
  draft.images.reverse();
  draft.images[0].alt = "Edited primary description";
  draft.images[0].src = `data:image/webp;base64,${Buffer.from("fixture-raster").toString("base64")}`;
  const input = {
    connection: context.connection,
    collection: draft,
    idempotencyKey: "save-1",
    scope,
  };
  const saved = await binding.save(input);
  assert.equal(saved.revision, original.revision + 1);
  assert.deepEqual(saved.images, draft.images);
  assert.deepEqual(await binding.save(input), saved);
  await assert.rejects(
    binding.save({ ...input, idempotencyKey: "save-2" }),
    code("conflict"),
  );
  await assert.rejects(
    binding.load({
      connection: context.connection,
      scope: { workspaceId: "different" },
    }),
    code("configuration-required"),
  );
  await assert.rejects(
    binding.save({
      ...input,
      connection: {
        ...context.connection,
        grantedPermissions: ["assets.read"],
      },
    }),
    code("permission-denied"),
  );
});
test("multipart media binding transfers raster bytes with scoped metadata, CSRF and safe persisted URLs", async () => {
  const context = await connect("cloudinary");
  const original = await createDemoMediaCollectionBinding().load({
    connection: context.connection,
    scope,
  });
  const draft = structuredClone(original);
  draft.images[0].src = `data:image/webp;base64,${Buffer.from("cropped-fixture").toString("base64")}`;
  const calls = [];
  const binding = createHttpMediaCollectionBinding({
    baseUrl: "/api/media",
    csrfToken: () => "fixture-csrf",
    fetcher: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ ...original, revision: 2 }), {
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  const result = await binding.save({
    connection: context.connection,
    collection: draft,
    idempotencyKey: "media-1",
    scope,
  });
  assert.equal(result.revision, 2);
  assert.equal(
    calls[0].url,
    `/api/media/${encodeURIComponent(context.connection.id)}`,
  );
  assert.equal(calls[0].init.headers.get("X-Workspace-Id"), scope.workspaceId);
  assert.equal(calls[0].init.headers.get("X-CSRF-Token"), "fixture-csrf");
  assert.equal(calls[0].init.headers.get("Idempotency-Key"), "media-1");
  const metadata = JSON.parse(calls[0].init.body.get("metadata"));
  assert.equal(metadata.images[0].src, undefined);
  assert.equal(metadata.images[0].fileKey, `image-${draft.images[0].id}`);
  assert.equal(
    await calls[0].init.body.get(metadata.images[0].fileKey).text(),
    "cropped-fixture",
  );
  assert.equal(metadata.images[1].src, draft.images[1].src);
  assert.throws(
    () =>
      parseMediaCollection({
        ...original,
        images: [{ ...original.images[0], src: "javascript:alert(1)" }],
      }),
    code("provider-error"),
  );
  assert.throws(
    () =>
      parseMediaCollection({
        ...original,
        images: [
          { ...original.images[0], src: "/api/preview?access_token=fixture" },
        ],
      }),
    code("provider-error"),
  );
  assert.throws(
    () => parseMediaCollection(draft, true),
    code("provider-error"),
  );
});
test("enterprise DTOs retain provider scopes separately and never infer consent from logical grants", async () => {
  const context = await connect("microsoft-365", "teams");
  const parsed = parseIntegrationConnection(
    context.connection,
    context.definition,
    scope,
  );
  assert.deepEqual(parsed.enterprise.providerScopes, ["Channel.ReadBasic.All"]);
  assert.equal(parsed.enterprise.consent.status, "pending");
  assert.ok(parsed.grantedPermissions.includes("messages.publish"));
  assert.equal(parsed.enterprise.permissionMode, "delegated");
  assert.throws(
    () =>
      parseIntegrationConnection(
        {
          ...parsed,
          enterprise: { consent: { status: "implicitly-approved" } },
        },
        context.definition,
        scope,
      ),
    code("provider-error"),
  );
  const without = { ...parsed };
  delete without.enterprise;
  assert.equal(
    parseIntegrationConnection(without, context.definition, scope).enterprise,
    undefined,
  );
});
test("required text rejects whitespace without rejecting valid zero/false inputs", () => {
  assert.throws(
    () =>
      validateIntegrationFields(
        [
          {
            id: "name",
            type: "text",
            required: true,
            label: { en: "Name", es: "Nombre" },
          },
        ],
        { name: "   " },
      ),
    code("validation"),
  );
  assert.doesNotThrow(() =>
    validateIntegrationFields(
      [
        {
          id: "amount",
          type: "number",
          required: true,
          label: { en: "Amount", es: "Importe" },
        },
        {
          id: "enabled",
          type: "toggle",
          required: true,
          label: { en: "Enabled", es: "Activo" },
        },
      ],
      { amount: 0, enabled: false },
    ),
  );
});
test("GitHub PR reading/creation uses existing branch references and returns an acknowledged PR", async () => {
  const context = await connect("github-apps");
  const created = await execute(context, "create-pull-request", {
    resourceId: "github-apps-resource-1",
    title: "A considered change",
    description: "Reviewed frontend update",
    head: "feature/ui",
    base: "main",
    draft: true,
  });
  assert.equal(created.kind, "record");
  assert.equal(created.record.type, "pull-request");
  assert.equal(created.record.fields.head, "feature/ui");
  assert.equal(created.record.status, "draft");
  const queried = await execute(context, "repository-pull-requests", {
    resourceId: "github-apps-resource-1",
    state: "all",
    limit: 10,
  });
  assert.ok(queried.records.some((record) => record.id === created.record.id));
  assert.ok(
    queried.records.every((record) =>
      ["pull-request", "github-pull-request"].includes(record.type),
    ),
  );
});
test("Jira uses issue-specific reported transitions and refuses unreported or obsolete choices", async () => {
  const context = await connect("jira");
  const issue = (await execute(context, "query-jira-issues", { limit: 10 }))
    .records[0];
  const options = await execute(context, "jira-transition-options", {
    recordId: issue.id,
    expectedUpdatedAt: issue.updatedAt,
  });
  assert.ok(options.records.length);
  assert.ok(
    options.records.every(
      (record) =>
        record.type === "jira-transition" &&
        record.fields.recordId === issue.id,
    ),
  );
  await assert.rejects(
    execute(context, "transition-jira-issue", {
      recordId: issue.id,
      transitionId: "not-reported",
    }),
    code("permission-denied"),
  );
  const transition = options.records[0];
  const result = await execute(context, "transition-jira-issue", {
    recordId: issue.id,
    transitionId: transition.fields.transitionId,
    expectedUpdatedAt: issue.updatedAt,
  });
  assert.equal(result.record.id, issue.id);
  assert.equal(result.record.status, transition.fields.targetStatus);
  await assert.rejects(
    execute(context, "transition-jira-issue", {
      recordId: issue.id,
      transitionId: transition.fields.transitionId,
      expectedUpdatedAt: issue.updatedAt,
    }),
    code("conflict"),
  );
});
test("all three source-removal provider bindings preserve tombstones and report completion after reconciliation", async () => {
  for (const [id, option] of [
    ["pgvector", "pgvector"],
    ["vector-stores", "pinecone"],
    ["vector-stores", "qdrant"],
  ]) {
    const context = await connect(id, option);
    const query = context.definition.actions.find(
      (action) => action.kind === "query",
    );
    const removal = context.definition.actions.find(
      (action) => action.kind === "delete-source",
    );
    const library = await execute(context, query.id);
    const source = library.documents[0];
    const result = await execute(context, removal.id, {
      sourceId: source.id,
      resourceId: source.fields.resourceId,
      expectedUpdatedAt: source.updatedAt,
    });
    assert.equal(result.kind, "job");
    assert.equal(result.job.status, "running");
    assert.equal(parseIntegrationResult(result).job.progress, 32);
    const pending = await execute(context, query.id);
    assert.equal(
      pending.documents.find((record) => record.id === source.id).status,
      "deleting",
    );
    assert.ok(!pending.hits.some((hit) => hit.id === source.id));
    const reconciled = await execute(context, query.id);
    assert.equal(
      reconciled.documents.find((record) => record.id === source.id).status,
      "deleted",
    );
    assert.ok(!reconciled.hits.some((hit) => hit.id === source.id));
  }
});
