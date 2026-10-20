import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
const {
  integrationDefinitions,
  integrationFamilies,
  getIntegrationDefinition,
  getIntegrationActionsForOption,
} = await import("../src/lib/integrations/definitions.ts");
const { integrationRouteIndex } =
  await import("../src/lib/integrations/route-index.ts");
const { createDemoIntegrationsAdapter, demoIntegrationConfiguration } =
  await import("../src/lib/integrations/demo-adapter.ts");
const { createHttpIntegrationsAdapter } =
  await import("../src/lib/integrations/http-adapter.ts");
const { parseIntegrationResult, parseIntegrationConnection } =
  await import("../src/lib/integrations/validation.ts");
const { createIntegrationRequestKeys, integrationRequestSignature } =
  await import("../src/lib/integrations/request-keys.ts");
const catalogue = JSON.parse(
  readFileSync(
    new URL(
      "../docs/research/2026-10-20/integrations/catalogue.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const scope = { workspaceId: "workspace-a" };
const otherScope = { workspaceId: "workspace-b" };
const code = (expected) => (error) =>
  error instanceof IntegrationError && error.code === expected;
const json = (value, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
const definition = getIntegrationDefinition("supabase-data");
const action = (item, kind) => {
  const found = item.actions.find((entry) => entry.kind === kind);
  assert.ok(found, `${item.id} needs ${kind}`);
  return found;
};
const requestFor = (item, optionId = item.options[0].id) => ({
  integrationId: item.id,
  providerOptionId: optionId,
  configuration: demoIntegrationConfiguration(item),
  permissions: item.permissions.map((permission) => permission.id),
  resourceIds: [],
});
async function connected(adapter, item = definition, targetScope = scope) {
  return (await adapter.connect(requestFor(item), targetScope)).connection;
}
async function run(adapter, connection, kind, values = {}, extra = {}) {
  const item = getIntegrationDefinition(connection.integrationId);
  return adapter.execute(
    {
      integrationId: item.id,
      connectionId: connection.id,
      actionId: action(item, kind).id,
      values,
      ...extra,
    },
    { workspaceId: connection.workspaceId },
  );
}
function deferred() {
  let resolve;
  const promise = new Promise((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

test("every researched candidate has a bilingual, usable frontend recipe and provider options", () => {
  assert.equal(integrationDefinitions.length, 65);
  assert.equal(integrationFamilies.length, 17);
  assert.deepEqual(
    integrationDefinitions.map((item) => item.id).sort(),
    catalogue.candidates.map((item) => item.id).sort(),
  );
  assert.deepEqual(
    integrationRouteIndex.map((item) => ({ ...item })),
    integrationDefinitions.map(({ id, name }) => ({ id, name })),
  );
  for (const item of integrationDefinitions) {
    assert.ok(
      integrationFamilies.some((family) => family.id === item.family),
      item.id,
    );
    assert.ok(
      item.name &&
        item.description.en &&
        item.description.es &&
        item.serviceNote.en &&
        item.serviceNote.es,
      item.id,
    );
    assert.ok(
      item.options.length &&
        item.resourceTypes.length &&
        item.permissions.length &&
        item.configurationFields.length,
      item.id,
    );
    assert.equal(
      new Set(item.options.map((option) => option.id)).size,
      item.options.length,
    );
    assert.equal(
      new Set(item.actions.map((entry) => entry.id)).size,
      item.actions.length,
    );
    assert.ok(item.actions.some((entry) => entry.kind === "test-connection"));
    assert.ok(item.actions.length >= 2);
    assert.ok(item.documentationUrl.startsWith("https://"));
    for (const entry of item.actions) {
      assert.ok(
        entry.label.en &&
          entry.label.es &&
          entry.description.en &&
          entry.description.es,
      );
      for (const permission of entry.requiredPermissions ?? [])
        assert.ok(
          item.permissions.some((allowed) => allowed.id === permission),
          `${item.id}:${entry.id}:${permission}`,
        );
    }
    assert.ok(
      !item.configurationFields.some((field) =>
        /password|secret|privateKey|accessToken|refreshToken/i.test(field.id),
      ),
      item.id,
    );
  }
});

test("all provider choices support independent configuration, resources, diagnostics and disconnect in the local demo", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  let checked = 0;
  for (const item of integrationDefinitions)
    for (const option of item.options) {
      const ownScope = { workspaceId: `coverage-${++checked}` };
      const outcome = await adapter.connect(
        requestFor(item, option.id),
        ownScope,
      );
      assert.equal(outcome.kind, "connected");
      assert.equal(outcome.connection.providerOptionId, option.id);
      parseIntegrationConnection(outcome.connection, item, ownScope);
      const resources = await adapter.resources(item.id, ownScope);
      assert.ok(resources.length);
      assert.equal(
        new Set(resources.map((resource) => resource.id)).size,
        resources.length,
      );
      const receipt = await run(adapter, outcome.connection, "test-connection");
      assert.equal(parseIntegrationResult(receipt).kind, "receipt");
      assert.equal(
        (await adapter.sync(outcome.connection.id, ownScope)).status,
        "connected",
      );
      const revoked = await adapter.disconnect(outcome.connection.id, ownScope);
      assert.equal(revoked.status, "disconnected");
      assert.deepEqual(revoked.configuration, {});
      assert.ok((await adapter.events(revoked.id, ownScope)).length >= 3);
    }
  assert.ok(checked >= 65);
});

test("record mutation and selected resources remain scoped to one workspace", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  const first = await connected(adapter),
    second = await connected(adapter, definition, otherScope);
  const created = await run(adapter, first, "save-record", {
    name: "A scoped customer",
    description: "Local edit",
    resourceId: `${definition.id}-resource-1`,
  });
  assert.equal(created.kind, "record");
  assert.equal(
    (await run(adapter, first, "query", { query: "A scoped customer" })).total,
    1,
  );
  assert.equal(
    (await run(adapter, second, "query", { query: "A scoped customer" })).total,
    0,
  );
  await assert.rejects(
    adapter.events(first.id, otherScope),
    code("configuration-required"),
  );
  const configured = await adapter.configure(
    first.id,
    {
      configuration: first.configuration,
      permissions: first.grantedPermissions,
      resourceIds: [`${definition.id}-resource-1`],
      revision: first.revision,
    },
    scope,
  );
  const filtered = await run(adapter, configured, "query");
  assert.ok(
    filtered.records.every(
      (record) => record.fields.resourceId === `${definition.id}-resource-1`,
    ),
  );
  await assert.rejects(
    adapter.configure(
      first.id,
      {
        configuration: first.configuration,
        permissions: first.grantedPermissions,
        resourceIds: [],
        revision: first.revision,
      },
      scope,
    ),
    code("conflict"),
  );
});

test("ingested sources retain their authorized resource for search and subsequent refresh", async () => {
  for (const id of ["algolia", "pgvector"]) {
    const item = getIntegrationDefinition(id);
    const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
    const initial = await connected(adapter, item);
    const resourceId = `${id}-resource-1`;
    const connection = await adapter.configure(
      initial.id,
      {
        configuration: initial.configuration,
        permissions: initial.grantedPermissions,
        resourceIds: [resourceId],
        revision: initial.revision,
      },
      scope,
    );
    const outcome = await run(adapter, connection, "ingest", {
      resourceId,
      documentId: "local-document",
      sourceId: "local-source",
      name: "Retained source",
      content: "A unique scoped retrieval passage.",
    });
    assert.equal(outcome.kind, "knowledge");
    const source = outcome.documents.find(
      (document) => document.name === "Retained source",
    );
    assert.equal(source.fields.resourceId, resourceId);
    assert.ok(
      outcome.documents.every(
        (document) => document.fields.resourceId === resourceId,
      ),
    );
    const searched = await run(adapter, connection, "search", {
      query: "unique scoped retrieval passage",
      resourceId,
    });
    assert.deepEqual(
      searched.hits.map((hit) => hit.id),
      [source.id],
    );
    const refreshed = await run(adapter, connection, "query", { resourceId });
    assert.ok(
      (refreshed.documents ?? refreshed.records).some(
        (document) => document.id === source.id,
      ),
    );
    assert.equal(
      (
        await run(adapter, connection, "search", {
          query: "unique scoped retrieval passage",
          resourceId: `${id}-resource-2`,
        })
      ).hits.length,
      0,
    );
    await assert.rejects(
      run(adapter, connection, "ingest", {
        resourceId: `${id}-resource-2`,
        name: "Unapproved source",
      }),
      code("permission-denied"),
    );
  }
});

test("idempotency prevents duplicate writes and rejects a reused key with different input", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  const connection = await connected(adapter);
  const first = await run(
    adapter,
    connection,
    "save-record",
    { name: "One record" },
    { idempotencyKey: "same-write" },
  );
  const retry = await run(
    adapter,
    connection,
    "save-record",
    { name: "One record" },
    { idempotencyKey: "same-write" },
  );
  assert.deepEqual(first, retry);
  assert.equal(
    (await run(adapter, connection, "query", { query: "One record" })).total,
    1,
  );
  await assert.rejects(
    run(
      adapter,
      connection,
      "save-record",
      { name: "Changed record" },
      { idempotencyKey: "same-write" },
    ),
    code("conflict"),
  );
});

test("a lost response and an unchanged retry produce one write, while a confirmed repeat is a new action", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  const connection = await connected(adapter);
  const keys = createIntegrationRequestKeys();
  const request = {
    integrationId: definition.id,
    connectionId: connection.id,
    actionId: action(definition, "save-record").id,
    values: { name: "Lost response", description: "Retained draft" },
  };
  const signature = integrationRequestSignature(request, scope.workspaceId);
  const key = keys.acquire(signature);
  await adapter.execute({ ...request, idempotencyKey: key }, scope);
  const retriedRequest = {
    ...request,
    values: { description: "Retained draft", name: "Lost response" },
  };
  const retrySignature = integrationRequestSignature(
    retriedRequest,
    scope.workspaceId,
  );
  assert.equal(retrySignature, signature);
  assert.equal(keys.acquire(retrySignature), key);
  await adapter.execute({ ...retriedRequest, idempotencyKey: key }, scope);
  assert.equal(
    (await run(adapter, connection, "query", { query: "Lost response" })).total,
    1,
  );
  keys.confirm(signature, key);
  const intentionalRepeat = keys.acquire(signature);
  assert.notEqual(intentionalRepeat, key);
  await adapter.execute(
    { ...request, idempotencyKey: intentionalRepeat },
    scope,
  );
  assert.equal(
    (await run(adapter, connection, "query", { query: "Lost response" })).total,
    2,
  );
  assert.notEqual(
    integrationRequestSignature(request, otherScope.workspaceId),
    signature,
  );
});

test("partial record updates preserve the original fields and target media assets by stable ID", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  const connection = await connected(adapter);
  const original = (await run(adapter, connection, "query")).records[0];
  const updated = await run(adapter, connection, "save-record", {
    recordId: original.id,
    status: "archived",
  });
  assert.equal(updated.record.name, original.name);
  assert.equal(updated.record.description, original.description);
  assert.equal(updated.record.fields.owner, original.fields.owner);
  assert.equal(updated.record.status, "archived");
  assert.equal((await run(adapter, connection, "query")).total, 24);
  const media = getIntegrationDefinition("cloudinary");
  const mediaConnection = await connected(adapter, media);
  const asset = (await run(adapter, mediaConnection, "query")).records[0];
  const transformed = await run(adapter, mediaConnection, "update-record", {
    assetId: asset.id,
    width: 320,
  });
  assert.equal(transformed.record.id, asset.id);
  assert.equal(transformed.record.name, asset.name);
  assert.equal(transformed.record.fields.width, 320);
  assert.equal((await run(adapter, mediaConnection, "query")).total, 24);
});

test("record concurrency rejects an obsolete snapshot and stores edited structured fields", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  const connection = await connected(adapter);
  const original = (await run(adapter, connection, "query")).records[0];
  await run(adapter, connection, "save-record", {
    recordId: original.id,
    expectedUpdatedAt: original.updatedAt,
    fields: JSON.stringify({ priority: "urgent", amount: 0, enabled: false }),
  });
  await assert.rejects(
    run(adapter, connection, "save-record", {
      recordId: original.id,
      expectedUpdatedAt: original.updatedAt,
      name: "Obsolete overwrite",
    }),
    code("conflict"),
  );
  const stored = (await run(adapter, connection, "query")).records.find(
    (row) => row.id === original.id,
  );
  assert.equal(stored.name, original.name);
  assert.equal(stored.fields.priority, "urgent");
  assert.equal(stored.fields.amount, 0);
  assert.equal(stored.fields.enabled, false);
  await assert.rejects(
    run(adapter, connection, "save-record", {
      recordId: original.id,
      fields: "{invalid",
    }),
    code("validation"),
  );
});

test("faceted search applies selected buckets while preserving reported counts and zero values", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  const connection = await connected(
    adapter,
    getIntegrationDefinition("algolia"),
  );
  const unfiltered = await run(adapter, connection, "search", {
    query: "Products",
  });
  const ready = await run(adapter, connection, "search", {
    query: "Products",
    facets: JSON.stringify({ status: ["ready"] }),
    pageSize: 1,
  });
  assert.equal(ready.hits.length, 1);
  assert.ok(ready.total < unfiltered.total);
  assert.deepEqual(ready.facets, unfiltered.facets);
  assert.ok(
    ready.facets
      .find((facet) => facet.id === "status")
      .buckets.some((bucket) => bucket.value === "review" && bucket.count > 0),
  );
  const missing = await run(adapter, connection, "search", {
    query: "Products",
    facets: JSON.stringify({ status: ["absent"] }),
  });
  assert.equal(missing.total, 0);
  assert.equal(missing.hits.length, 0);
  const response = parseIntegrationResult({
    kind: "search",
    hits: [],
    total: 0,
    facets: [
      {
        id: "type",
        label: "Type",
        buckets: [{ value: "article", label: "Article", count: 0 }],
      },
    ],
  });
  assert.equal(response.facets[0].buckets[0].count, 0);
  assert.throws(
    () =>
      parseIntegrationResult({
        ...response,
        facets: [
          {
            ...response.facets[0],
            buckets: [
              ...response.facets[0].buckets,
              ...response.facets[0].buckets,
            ],
          },
        ],
      }),
    code("provider-error"),
  );
});

test("grouped provider options only expose and execute their own declared capabilities", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  for (const item of integrationDefinitions) {
    for (const option of item.options) {
      const connection = (
        await adapter.connect(requestFor(item, option.id), scope)
      ).connection;
      const allowedIds = new Set(
        getIntegrationActionsForOption(item, option.id).map(
          (entry) => entry.id,
        ),
      );
      assert.ok(allowedIds.has(action(item, "test-connection").id));
      for (const unsupported of item.actions.filter(
        (entry) => !allowedIds.has(entry.id),
      )) {
        await assert.rejects(
          adapter.execute(
            {
              integrationId: item.id,
              connectionId: connection.id,
              actionId: unsupported.id,
              values: {},
            },
            scope,
          ),
          code("validation"),
        );
      }
    }
  }
  assert.deepEqual(
    getIntegrationActionsForOption(definition, "unknown-option"),
    [],
  );
});

test("permission changes affect actions without changing data in another workspace", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  const write = action(definition, "save-record");
  assert.ok(
    write.requiredPermissions?.length,
    "write actions declare their logical permissions",
  );
  const input = requestFor(definition);
  input.permissions = definition.permissions
    .filter((permission) => permission.required)
    .map((permission) => permission.id);
  const connection = (await adapter.connect(input, scope)).connection;
  await assert.rejects(
    run(adapter, connection, "save-record", { name: "Denied" }),
    code("permission-denied"),
  );
  const refreshed = await adapter.configure(
    connection.id,
    {
      configuration: connection.configuration,
      permissions: definition.permissions.map((permission) => permission.id),
      resourceIds: [],
      revision: connection.revision,
    },
    scope,
  );
  assert.equal(
    (await run(adapter, refreshed, "save-record", { name: "Allowed" })).kind,
    "record",
  );
});

test("aborted writes do not mutate fixtures and disconnected connections cannot execute", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 20 });
  const connection = await connected(adapter);
  const controller = new AbortController();
  const writing = adapter.execute(
    {
      integrationId: definition.id,
      connectionId: connection.id,
      actionId: action(definition, "save-record").id,
      values: { name: "Cancelled record" },
    },
    { ...scope, signal: controller.signal },
  );
  controller.abort();
  await assert.rejects(writing, code("cancelled"));
  assert.equal(
    (await run(adapter, connection, "query", { query: "Cancelled record" }))
      .total,
    0,
  );
  await adapter.disconnect(connection.id, scope);
  await assert.rejects(
    run(adapter, connection, "query"),
    code("configuration-required"),
  );
});

test("documents preserve revisions, reject invalid JSON and remain retrievable after a conflict", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  const connection = await connected(
    adapter,
    getIntegrationDefinition("tiptap"),
  );
  const original = await run(adapter, connection, "query");
  assert.equal(original.kind, "document");
  const saved = await run(adapter, connection, "save-document", {
    content: "# Edited document",
    revision: original.document.revision,
    format: "markdown",
  });
  assert.equal(saved.document.revision, original.document.revision + 1);
  await assert.rejects(
    run(adapter, connection, "save-document", {
      content: "Overwrite",
      revision: original.document.revision,
    }),
    code("conflict"),
  );
  await assert.rejects(
    run(adapter, connection, "save-document", {
      content: "{broken",
      format: "json",
    }),
    code("validation"),
  );
  assert.equal(
    (await run(adapter, connection, "query")).document.content,
    "# Edited document",
  );
});

test("tool decisions resolve once and checkpoints are retained in memory", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  const connection = await connected(
    adapter,
    getIntegrationDefinition("cloudflare-agents"),
  );
  const requested = await run(adapter, connection, "run-agent", {
    prompt: "Create a draft",
  });
  assert.equal(requested.run.state, "approval-required");
  const approved = await run(adapter, connection, "approve-tool", {
    approvalId: requested.run.approvalId,
    approved: false,
  });
  assert.equal(approved.run.state, "rejected");
  await assert.rejects(
    run(adapter, connection, "approve-tool", {
      approvalId: requested.run.approvalId,
      approved: true,
    }),
    code("conflict"),
  );
  const checkpoint = await run(adapter, connection, "checkpoint", {
    name: "Reviewed task",
  });
  assert.match(checkpoint.id, /checkpoint/);
  const records = await run(adapter, connection, "query", {
    query: "Reviewed task",
  });
  assert.equal(records.total, 1);
});

test("live demo subscriptions emit scoped updates and stop after cleanup or abort", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  const connection = await connected(
    adapter,
    getIntegrationDefinition("realtime-messaging"),
  );
  const updates = [];
  const controller = new AbortController();
  const close = adapter.subscribe(
    connection.id,
    (update) => updates.push(update),
    { ...scope, signal: controller.signal },
  );
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.equal(updates[0].kind, "presence");
  await run(adapter, connection, "publish-message", {
    content: "A live message",
  });
  assert.ok(updates.some((update) => update.kind === "result"));
  controller.abort();
  close();
  const count = updates.length;
  await run(adapter, connection, "publish-message", {
    content: "After cleanup",
  });
  assert.equal(updates.length, count);
});

test("an optional observer failure cannot change a successful local write", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  const connection = await connected(adapter);
  const close = adapter.subscribe(
    connection.id,
    () => {
      throw new Error("Consumer observer failed");
    },
    scope,
  );
  const stored = await run(adapter, connection, "save-record", {
    name: "Acknowledged record",
  });
  assert.equal(stored.kind, "record");
  close();
  assert.equal(
    (await run(adapter, connection, "query", { query: "Acknowledged record" }))
      .total,
    1,
  );
});

test("local and HTTP file uploads respect write permissions and disconnected state", async () => {
  const item = integrationDefinitions.find(
    (definition) =>
      definition.family === "files" &&
      definition.actions.some(
        (action) =>
          action.kind === "upload" && action.requiredPermissions?.length,
      ),
  );
  assert.ok(item);
  const uploadAction = action(item, "upload");
  const input = requestFor(item);
  input.permissions = item.permissions
    .filter((permission) => permission.required)
    .map((permission) => permission.id);
  assert.ok(
    uploadAction.requiredPermissions.some(
      (permission) => !input.permissions.includes(permission),
    ),
  );
  const file = new File(["Small local fixture"], "fixture.txt", {
    type: "text/plain",
  });
  const local = createDemoIntegrationsAdapter({ delayMs: 0 });
  const connection = (await local.connect(input, scope)).connection;
  const upload = { integrationId: item.id, connectionId: connection.id, file };
  await assert.rejects(local.upload(upload, scope), code("permission-denied"));
  const approved = await local.configure(
    connection.id,
    {
      configuration: connection.configuration,
      permissions: item.permissions.map((permission) => permission.id),
      resourceIds: [],
      revision: connection.revision,
    },
    scope,
  );
  assert.equal((await local.upload(upload, scope)).kind, "upload");
  await local.disconnect(connection.id, scope);
  await assert.rejects(
    local.upload(upload, scope),
    code("configuration-required"),
  );

  let calls = 0;
  let reply = { ...approved, grantedPermissions: input.permissions };
  const http = createHttpIntegrationsAdapter({
    fetcher: async () => {
      calls++;
      return json(reply);
    },
  });
  await http.get(item.id, scope);
  await assert.rejects(http.upload(upload, scope), code("permission-denied"));
  assert.equal(calls, 1);
  reply = {
    ...approved,
    status: "disconnected",
    revision: approved.revision + 1,
  };
  await http.get(item.id, scope);
  await assert.rejects(
    http.upload(upload, scope),
    code("configuration-required"),
  );
  assert.equal(calls, 2);
});

function presentationConnection(overrides = {}) {
  return {
    id: "consumer-connection",
    integrationId: definition.id,
    providerOptionId: definition.options[0].id,
    workspaceId: scope.workspaceId,
    status: "connected",
    account: { name: "Application workspace" },
    configuration: demoIntegrationConfiguration(definition),
    grantedPermissions: definition.permissions.map(
      (permission) => permission.id,
    ),
    resourceIds: [],
    revision: 1,
    ...overrides,
  };
}
test("HTTP transport includes workspace, CSRF and bounded JSON without trusting provider error text", async () => {
  const calls = [];
  const connection = presentationConnection();
  const adapter = createHttpIntegrationsAdapter({
    getCsrfToken: () => "ephemeral-csrf",
    fetcher: async (url, init) => {
      calls.push({ url, init });
      return url.includes("/execute?")
        ? json({ kind: "receipt", id: "done", message: "Completed" })
        : json(connection);
    },
  });
  await adapter.get(definition.id, scope);
  await adapter.execute(
    {
      integrationId: definition.id,
      connectionId: connection.id,
      actionId: action(definition, "test-connection").id,
      values: {},
    },
    scope,
  );
  assert.ok(
    calls.every(
      (call) =>
        new URL(call.url, "https://application.test").searchParams.get(
          "workspaceId",
        ) === scope.workspaceId,
    ),
  );
  assert.equal(calls[1].init.headers["X-CSRF-Token"], "ephemeral-csrf");
  assert.equal(calls[1].init.redirect, "error");
  assert.equal(calls[1].init.credentials, "same-origin");
  const denied = createHttpIntegrationsAdapter({
    fetcher: async () =>
      json({ privateSecret: "untrusted-provider-response" }, 429, {
        "Retry-After": "45",
      }),
  });
  await assert.rejects(
    denied.get(definition.id, scope),
    (error) =>
      code("rate-limited")(error) &&
      error.retryAfterSeconds === 45 &&
      !error.message.includes("untrusted"),
  );
});

test("HTTP connection cache cannot be reused in another workspace or silently replace another connection", async () => {
  let reply = presentationConnection();
  let count = 0;
  const adapter = createHttpIntegrationsAdapter({
    fetcher: async () => {
      count++;
      return json(reply);
    },
  });
  const current = await adapter.get(definition.id, scope);
  await assert.rejects(
    adapter.events(current.id, otherScope),
    code("configuration-required"),
  );
  assert.equal(count, 1);
  reply = presentationConnection({ id: "different-connection" });
  await assert.rejects(
    adapter.configure(
      current.id,
      {
        configuration: current.configuration,
        permissions: current.grantedPermissions,
        resourceIds: [],
        revision: current.revision,
      },
      scope,
    ),
    code("provider-error"),
  );
  reply = presentationConnection({ workspaceId: otherScope.workspaceId });
  await assert.rejects(
    adapter.get(definition.id, scope),
    code("provider-error"),
  );
});

test("HTTP rejects secret-shaped unknown configuration and unsafe result URLs", async () => {
  const invalid = createHttpIntegrationsAdapter({
    fetcher: async () =>
      json(
        presentationConnection({
          configuration: {
            ...demoIntegrationConfiguration(definition),
            privateToken: "should-not-render",
          },
        }),
      ),
  });
  await assert.rejects(
    invalid.get(definition.id, scope),
    code("provider-error"),
  );
  assert.throws(
    () =>
      parseIntegrationResult({
        kind: "search",
        hits: [
          {
            id: "x",
            title: "Unsafe",
            snippet: "",
            source: "test",
            url: "javascript:alert(1)",
          },
        ],
        total: 1,
      }),
    code("provider-error"),
  );
});

test("separate HTTPS APIs require an exact trusted origin and default to omitted credentials", async () => {
  assert.throws(
    () =>
      createHttpIntegrationsAdapter({ baseUrl: "https://untrusted.test/api" }),
    code("validation"),
  );
  assert.throws(
    () => createHttpIntegrationsAdapter({ baseUrl: "/api/../other" }),
    code("validation"),
  );
  let options;
  const adapter = createHttpIntegrationsAdapter({
    baseUrl: "https://api.application.test/integrations",
    trustedBackendOrigins: ["https://api.application.test"],
    fetcher: async (_url, init) => {
      options = init;
      return json(presentationConnection());
    },
  });
  await adapter.get(definition.id, scope);
  assert.equal(options.credentials, "omit");
  assert.equal(options.mode, "cors");
});

test("OAuth only returns a configured authorization URL and never marks an unfinished authorization connected", async () => {
  const pending = presentationConnection({ status: "not-configured" });
  const adapter = createHttpIntegrationsAdapter({
    authorizationOrigins: ["https://authorize.application.test"],
    fetcher: async () =>
      json({
        kind: "authorization",
        connection: pending,
        url: "https://authorize.application.test/start",
      }),
  });
  assert.equal(
    (await adapter.connect(requestFor(definition), scope)).kind,
    "authorization",
  );
  const malicious = createHttpIntegrationsAdapter({
    fetcher: async () =>
      json({
        kind: "authorization",
        connection: pending,
        url: "https://untrusted.test/start",
      }),
  });
  await assert.rejects(
    malicious.connect(requestFor(definition), scope),
    code("provider-error"),
  );
  const falseSuccess = createHttpIntegrationsAdapter({
    authorizationOrigins: ["https://authorize.application.test"],
    fetcher: async () =>
      json({
        kind: "authorization",
        connection: presentationConnection(),
        url: "https://authorize.application.test/start",
      }),
  });
  await assert.rejects(
    falseSuccess.connect(requestFor(definition), scope),
    code("provider-error"),
  );
});

test("cancellation rejects promptly even if a custom fetcher ignores AbortSignal", async () => {
  const response = deferred();
  const adapter = createHttpIntegrationsAdapter({
    fetcher: () => response.promise,
  });
  const controller = new AbortController();
  const waiting = adapter.get(definition.id, {
    ...scope,
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(waiting, code("cancelled"));
  response.resolve(json(presentationConnection()));
});

test("a configured CSRF getter must provide a value before a mutation is sent", async () => {
  let calls = 0;
  const adapter = createHttpIntegrationsAdapter({
    getCsrfToken: () => null,
    fetcher: async () => {
      calls++;
      return json({});
    },
  });
  await assert.rejects(
    adapter.connect(requestFor(definition), scope),
    code("permission-denied"),
  );
  assert.equal(calls, 0);
});

test("live transport drops invalid updates, validates their scope and cleans up once", async () => {
  let publish;
  let cleaned = 0;
  const errors = [],
    updates = [];
  const adapter = createHttpIntegrationsAdapter({
    fetcher: async () => json(presentationConnection()),
    subscribe: (_id, listener) => {
      publish = listener;
      return () => {
        cleaned++;
      };
    },
    onSubscriptionError: (error) => errors.push(error.code),
  });
  const connection = await adapter.get(definition.id, scope);
  const controller = new AbortController();
  const close = await adapter.subscribe(
    connection.id,
    (update) => updates.push(update),
    { ...scope, signal: controller.signal },
  );
  publish({
    kind: "connection",
    connection: presentationConnection({ workspaceId: otherScope.workspaceId }),
  });
  assert.deepEqual(errors, ["provider-error"]);
  assert.equal(updates.length, 0);
  publish({
    kind: "result",
    result: { kind: "receipt", id: "update", message: "New event" },
  });
  assert.equal(updates.length, 1);
  controller.abort();
  close();
  publish({
    kind: "result",
    result: { kind: "receipt", id: "late", message: "Old event" },
  });
  assert.equal(updates.length, 1);
  assert.equal(cleaned, 1);
});
