import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

const sourcePaths = [
  "src/lib/integrations/definitions.ts",
  "src/lib/integrations/demo-adapter.ts",
  "src/lib/integrations/contracts.ts",
  "src/lib/integrations/validation.ts",
  "src/lib/integrations/request-keys.ts",
  "src/lib/public-path.ts",
  "tests/integration-provider-actions.test.mjs",
];
async function sourceHashes() {
  return Promise.all(
    sourcePaths.map(async (path) => ({
      path,
      sha256: createHash("sha256")
        .update(await readFile(new URL(`../${path}`, import.meta.url)))
        .digest("hex"),
    })),
  );
}
const sourcesAtImport = await sourceHashes();
const { IntegrationError } =
  await import("../src/lib/integrations/contracts.ts");
const { integrationDefinitions, getIntegrationActionsForOption } =
  await import("../src/lib/integrations/definitions.ts");
const { createDemoIntegrationsAdapter, demoIntegrationConfiguration } =
  await import("../src/lib/integrations/demo-adapter.ts");
const {
  parseIntegrationConnection,
  parseIntegrationResource,
  parseIntegrationResult,
  validateIntegrationFields,
} = await import("../src/lib/integrations/validation.ts");
assert.deepEqual(
  await sourceHashes(),
  sourcesAtImport,
  "Sources changed during module loading; rerun against a stable snapshot.",
);

const matrix = integrationDefinitions
  .flatMap((definition) =>
    definition.options.flatMap((option) =>
      getIntegrationActionsForOption(definition, option.id).map((action) => ({
        definition,
        option,
        action,
        id: `${definition.id}/${option.id}/${action.id}`,
      })),
    ),
  )
  .sort((a, b) => a.id.localeCompare(b.id));
const actionKey = (definition, action) => `${definition.id}/${action.id}`;
const errorCode = (code) => (error) =>
  error instanceof IntegrationError && error.code === code;
const isRecordMutation = (action) =>
  [
    "save-record",
    "update-record",
    "create-ticket",
    "create-pull-request",
    "create-notification",
    "publish-message",
    "transition-issue",
  ].includes(action.kind);
const hasField = (action, id) => action.fields.some((field) => field.id === id);
const recordsIn = (result) =>
  result.kind === "records"
    ? result.records
    : result.kind === "record"
      ? [result.record]
      : result.kind === "knowledge"
        ? result.documents
        : result.kind === "metrics"
          ? result.events
          : [];

/**
 * These are bounded local fixtures, not provider IDs or native SDK inputs.
 * Required dependency IDs and revisions are replaced with reported values.
 */
function declaredValues(action, context, overrides = {}) {
  const values = {};
  const title = `Local validation ${context.definition.id} ${action.id}`.slice(
    0,
    120,
  );
  const format = action.fields.find((field) => field.id === "format")
    ?.options?.[0]?.value;
  for (const field of action.fields) {
    if (Object.hasOwn(overrides, field.id)) {
      values[field.id] = overrides[field.id];
      continue;
    }
    if (
      !field.required &&
      !["select", "toggle"].includes(field.type) &&
      !(
        isRecordMutation(action) &&
        ["description", "content"].includes(field.id)
      )
    )
      continue;
    if (field.type === "select") {
      const choice =
        field.id === "state"
          ? (field.options?.find((option) => option.value === "all") ??
            field.options?.[0])
          : field.options?.[0];
      assert.ok(
        choice,
        `${action.id}/${field.id}: select has no fixture choice`,
      );
      values[field.id] = choice.value;
    } else if (field.type === "toggle") {
      values[field.id] = true;
    } else if (field.type === "number") {
      values[field.id] =
        field.id === "revision"
          ? (context.document?.revision ?? 1)
          : field.id === "limit"
            ? 5
            : 1;
    } else if (field.type === "url") {
      values[field.id] = "https://example.com/local-contract-fixture";
    } else {
      switch (field.id) {
        case "resourceId":
          values[field.id] = context.resource.id;
          break;
        case "recordId":
        case "assetId":
          values[field.id] = context.record?.id ?? `local-fixture-${field.id}`;
          break;
        case "sourceId":
          assert.ok(context.source, `${action.id}: no reported source`);
          values[field.id] = context.source.id;
          break;
        case "jobId":
          assert.ok(context.job, `${action.id}: no reported job`);
          values[field.id] = context.job.id;
          break;
        case "approvalId":
          assert.ok(
            context.tool?.approvalId,
            `${action.id}: no reported approval`,
          );
          values[field.id] = context.tool.approvalId;
          break;
        case "transitionId":
          assert.ok(
            context.transition?.fields?.transitionId,
            `${action.id}: no reported transition`,
          );
          values[field.id] = context.transition.fields.transitionId;
          break;
        case "documentId":
          values[field.id] = context.document?.id ?? context.resource.id;
          break;
        case "name":
        case "title":
        case "subject":
          values[field.id] =
            action.kind === "upload" ? "local-preview.svg" : title;
          break;
        case "description":
        case "content":
          values[field.id] =
            action.kind === "save-document" && format === "json"
              ? context.document?.format === "json"
                ? context.document.content
                : '{"fixture":"local contract document"}'
              : "Local contract fixture; no provider account was accessed.";
          break;
        case "recipient":
        case "attendees":
          values[field.id] = "local-fixture@example.com";
          break;
        case "contentType":
          values[field.id] = "image/svg+xml";
          break;
        case "startAt":
          values[field.id] = "2026-10-20T10:00:00.000Z";
          break;
        case "endAt":
          values[field.id] = "2026-10-20T11:00:00.000Z";
          break;
        case "payload":
        case "arguments":
          values[field.id] = '{"fixture":"local provider action"}';
          break;
        case "base":
          values[field.id] = "main";
          break;
        case "head":
          values[field.id] = "feature/local-contract-fixture";
          break;
        case "query":
          values[field.id] =
            context.source?.name ??
            context.record?.name ??
            "Local contract fixture";
          break;
        case "sourceField":
          values[field.id] = "name";
          break;
        case "targetField":
          values[field.id] = "title";
          break;
        case "propertyRef":
        case "fieldRef":
          values[field.id] = "priority";
          break;
        case "value":
          values[field.id] = "local-reviewed-priority";
          break;
        case "toolName":
          values[field.id] = "create_local_draft";
          break;
        default:
          values[field.id] = `local-fixture-${field.id}`.slice(0, 160);
      }
    }
  }
  for (const key of Object.keys(overrides))
    assert.ok(hasField(action, key), `${action.id}: undeclared fixture ${key}`);
  validateIntegrationFields(action.fields, values);
  return values;
}

function assertResultBoundary(result, context) {
  const records = recordsIn(result);
  assert.equal(
    new Set(records.map((record) => record.id)).size,
    records.length,
    "Reported record IDs must be unique within a result.",
  );
  for (const record of records) {
    if (record.fields?.resourceId !== undefined)
      assert.ok(
        context.connection.resourceIds.includes(record.fields.resourceId),
        `Unselected resource in reported record ${record.id}`,
      );
    if (record.fields?.workspaceId !== undefined)
      assert.equal(record.fields.workspaceId, context.scope.workspaceId);
  }
  if (result.kind === "records")
    assert.ok(result.total >= result.records.length);
  if (result.kind === "search") {
    assert.ok(result.total >= result.hits.length);
    assert.equal(
      new Set(result.hits.map((hit) => hit.id)).size,
      result.hits.length,
    );
  }
  if (result.kind === "document" && result.document.format === "json")
    assert.doesNotThrow(() => JSON.parse(result.document.content));
}

async function execute(context, action, values, purpose, key) {
  validateIntegrationFields(action.fields, values);
  const before = structuredClone(values);
  const raw = await context.adapter.execute(
    {
      integrationId: context.definition.id,
      connectionId: context.connection.id,
      actionId: action.id,
      values,
      ...(key ? { idempotencyKey: key } : {}),
    },
    context.scope,
  );
  const result = parseIntegrationResult(raw);
  assert.deepEqual(values, before, "The adapter must not mutate caller input.");
  assertResultBoundary(result, context);
  context.operations.push({
    purpose,
    actionId: action.id,
    kind: action.kind,
    resultKind: result.kind,
  });
  return result;
}

async function seed(context, action, overrides = {}) {
  assert.ok(
    action,
    `${context.binding.id}: required seed action is unavailable`,
  );
  return execute(
    context,
    action,
    declaredValues(action, context, overrides),
    "preparation",
  );
}

function recordQuery(context) {
  return context.actions.find(
    (action) =>
      action.kind === "query" &&
      !action.fields.some(
        (field) =>
          field.required && ["recordId", "jobId", "state"].includes(field.id),
      ),
  );
}

async function reportedRecord(context) {
  const creator = context.actions.find(
    (action) => action.kind === "create-ticket",
  );
  let result;
  if (creator) result = await seed(context, creator);
  else {
    const query = recordQuery(context);
    assert.ok(query, `${context.binding.id}: no declared target read`);
    result = await seed(context, query);
  }
  const record = recordsIn(result)[0];
  assert.ok(record, `${context.binding.id}: target read returned no record`);
  context.record = record;
  if (record.fields?.resourceId) {
    const resource = context.resources.find(
      (item) => item.id === record.fields.resourceId,
    );
    assert.ok(
      resource,
      "The reported record must belong to a selected resource",
    );
    context.resource = resource;
  }
  return record;
}

async function prepare(context) {
  const action = context.binding.action;
  if (
    ["save-record", "update-record", "transition-issue"].includes(
      action.kind,
    ) &&
    action.fields.some((field) => ["recordId", "assetId"].includes(field.id))
  )
    await reportedRecord(context);

  if (action.kind === "query" && hasField(action, "recordId"))
    await reportedRecord(context);

  if (action.kind === "cancel-job" || hasField(action, "jobId")) {
    const trigger = context.actions.find((item) =>
      ["trigger-job", "trigger-workflow"].includes(item.kind),
    );
    const result = await seed(context, trigger);
    assert.equal(result.kind, "job");
    assert.ok(["queued", "running"].includes(result.job.status));
    context.job = result.job;
  }

  if (action.kind === "approve-tool" || action.kind === "checkpoint") {
    const tool = context.actions.find((item) =>
      ["execute-tool", "run-agent"].includes(item.kind),
    );
    const result = await seed(context, tool);
    assert.equal(result.kind, "tool");
    assert.equal(result.run.state, "approval-required");
    assert.ok(result.run.approvalId);
    context.tool = result.run;
  }

  if (action.kind === "save-document") {
    const query = recordQuery(context);
    assert.ok(query, `${context.binding.id}: no document/context read`);
    const result = await seed(context, query);
    if (result.kind === "document") context.document = result.document;
    // A shared room has no document snapshot query in this demo contract.
    // Its initial local revision is a fixture; the returned save is still parsed.
  }

  if (action.kind === "delete-source" || action.kind === "search") {
    const ingest = context.actions.find((item) => item.kind === "ingest");
    const result = await seed(context, ingest);
    const name = declaredValues(ingest, context).name;
    const source = recordsIn(result).find((record) => record.name === name);
    assert.ok(
      source,
      `${context.binding.id}: ingestion reported no matching source`,
    );
    context.source = source;
    if (action.kind === "delete-source") {
      const search = context.actions.find((item) => item.kind === "search");
      const found = await seed(context, search, { query: source.name });
      assert.equal(found.kind, "search");
      assert.ok(found.hits.some((hit) => hit.id === source.id));
    }
  }

  if (action.kind === "transition-issue") {
    const query = context.actions.find(
      (item) =>
        item.kind === "query" &&
        hasField(item, "recordId") &&
        /transition/.test(item.id),
    );
    const result = await seed(context, query, { recordId: context.record.id });
    assert.equal(result.kind, "records");
    const transition = result.records.find(
      (record) =>
        record.type === "jira-transition" &&
        record.fields?.recordId === context.record.id &&
        typeof record.fields.transitionId === "string" &&
        typeof record.fields.targetStatus === "string",
    );
    assert.ok(transition, "The issue must report an allowed transition");
    context.transition = transition;
  }

  if (
    action.kind === "query" &&
    hasField(action, "state") &&
    context.actions.some((item) => item.kind === "create-pull-request")
  ) {
    const creator = context.actions.find(
      (item) => item.kind === "create-pull-request",
    );
    const result = await seed(context, creator);
    assert.equal(result.kind, "record");
    assert.equal(result.record.type, "pull-request");
    context.pullRequest = result.record;
  }
}

function primaryValues(context) {
  const action = context.binding.action;
  const overrides = {};
  const target = context.source ?? context.record;
  if (target && hasField(action, "expectedUpdatedAt"))
    overrides.expectedUpdatedAt = target.updatedAt;
  if (action.kind === "transition-issue" && hasField(action, "fields"))
    overrides.fields = '{"priority":"normal"}';
  return declaredValues(action, context, overrides);
}

async function assertActionOutcome(context, values, result) {
  const { action } = context.binding;
  if (isRecordMutation(action)) {
    assert.equal(result.kind, "record");
    if (
      context.record &&
      ["save-record", "update-record", "transition-issue"].includes(action.kind)
    )
      assert.equal(result.record.id, context.record.id);
    if (values.name ?? values.title ?? values.subject)
      assert.equal(
        result.record.name,
        values.name ?? values.title ?? values.subject,
      );
    if (values.description ?? values.content)
      assert.equal(
        result.record.description,
        values.description ?? values.content,
      );
    if (values.status) assert.equal(result.record.status, values.status);
    if (action.kind === "transition-issue") {
      assert.equal(result.record.name, context.record.name);
      assert.equal(result.record.description, context.record.description);
      assert.equal(
        result.record.status,
        context.transition.fields.targetStatus,
      );
    }
    if (action.kind === "create-pull-request") {
      assert.equal(result.record.type, "pull-request");
      assert.equal(result.record.status, values.draft ? "draft" : "open");
      assert.notEqual(values.head, values.base);
    }
  }
  if (action.kind === "query" && context.pullRequest) {
    assert.equal(result.kind, "records");
    assert.ok(
      result.records.some((record) => record.id === context.pullRequest.id),
    );
    assert.ok(
      result.records.every((record) =>
        ["pull-request", "github-pull-request"].includes(record.type),
      ),
    );
  }
  if (
    action.kind === "query" &&
    context.record &&
    hasField(action, "recordId")
  ) {
    assert.equal(result.kind, "records");
    assert.ok(result.records.length);
    for (const transition of result.records) {
      assert.equal(transition.type, "jira-transition");
      assert.equal(transition.fields?.recordId, context.record.id);
      assert.equal(transition.updatedAt, context.record.updatedAt);
      assert.ok(transition.fields?.transitionId);
      assert.ok(transition.fields?.targetStatus);
    }
  }
  if (action.kind === "cancel-job") {
    assert.equal(result.kind, "job");
    assert.equal(result.job.id, context.job.id);
    assert.equal(result.job.status, "cancelled");
  }
  if (action.kind === "query" && context.job) {
    assert.equal(result.kind, "job");
    assert.equal(result.job.id, context.job.id);
    assert.ok(result.job.progress >= context.job.progress);
  }
  if (action.kind === "approve-tool") {
    assert.equal(result.kind, "tool");
    assert.equal(result.run.id, context.tool.id);
    assert.equal(result.run.approvalId, context.tool.approvalId);
    assert.equal(result.run.state, values.approved ? "completed" : "rejected");
  }
  if (["execute-tool", "run-agent"].includes(action.kind)) {
    assert.equal(result.kind, "tool");
    assert.equal(result.run.state, "approval-required");
    assert.deepEqual(result.run.input, values);
  }
  if (action.kind === "search") {
    assert.equal(result.kind, "search");
    assert.ok(result.hits.some((hit) => hit.id === context.source.id));
  }
  if (action.kind === "ingest") {
    assert.equal(result.kind, "knowledge");
    assert.ok(
      result.documents.some((document) => document.name === values.name),
    );
  }
  if (action.kind === "save-document") {
    assert.equal(result.kind, "document");
    assert.equal(result.document.content, values.content);
    assert.equal(result.document.format, values.format);
    if (context.document) assert.equal(result.document.id, context.document.id);
    if (values.revision !== undefined)
      assert.equal(result.document.revision, values.revision + 1);
  }
  if (action.kind === "delete-source") {
    assert.equal(result.kind, "job");
    assert.ok(["queued", "running"].includes(result.job.status));
    const search = context.actions.find((item) => item.kind === "search");
    const found = await execute(
      context,
      search,
      declaredValues(search, context, { query: context.source.name }),
      "verification",
    );
    assert.equal(found.kind, "search");
    assert.ok(found.hits.every((hit) => hit.id !== context.source.id));
  }
  if (action.kind === "upload") {
    const file = new File(
      ['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'],
      values.name,
      { type: values.contentType },
    );
    const upload = parseIntegrationResult(
      await context.adapter.upload(
        {
          integrationId: context.definition.id,
          connectionId: context.connection.id,
          file,
          alt: "Local provider action validation fixture",
        },
        context.scope,
      ),
    );
    assert.equal(upload.kind, "upload");
    assert.equal(upload.asset.name, file.name);
    assert.equal(upload.asset.size, file.size);
    assert.equal(upload.asset.contentType, file.type);
    context.operations.push({
      purpose: "verification",
      actionId: action.id,
      kind: "upload",
      resultKind: upload.kind,
      transport: "upload",
    });
  }
}

test("every declared provider option/action binding validates and executes in an isolated local demo", async (t) => {
  assert.ok(matrix.length, "The option/action catalogue must not be empty.");
  assert.equal(
    new Set(matrix.map((binding) => binding.id)).size,
    matrix.length,
  );
  assert.deepEqual(
    new Set(
      matrix.map(({ definition, option }) => `${definition.id}/${option.id}`),
    ),
    new Set(
      integrationDefinitions.flatMap((definition) =>
        definition.options.map((option) => `${definition.id}/${option.id}`),
      ),
    ),
    "Every provider choice must expose at least one tested action.",
  );
  assert.deepEqual(
    new Set(
      matrix.map(({ definition, action }) => actionKey(definition, action)),
    ),
    new Set(
      integrationDefinitions.flatMap((definition) =>
        definition.actions.map((action) => actionKey(definition, action)),
      ),
    ),
    "Every declared action must be reachable from a provider option.",
  );
  let fetchAttempts = 0;
  t.mock.method(globalThis, "fetch", () => {
    fetchAttempts++;
    throw new Error("Provider action validation forbids network requests.");
  });
  const rows = [];
  const failures = [];
  let requiredFieldChecks = 0;

  for (const [index, binding] of matrix.entries()) {
    await t.test(`${binding.action.kind}: ${binding.id}`, async () => {
      const { definition, option, action } = binding;
      const scope = { workspaceId: `provider-binding-${index + 1}` };
      const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
      try {
        const resources = (await adapter.resources(definition.id, scope)).map(
          parseIntegrationResource,
        );
        assert.ok(resources.length);
        const connected = await adapter.connect(
          {
            integrationId: definition.id,
            providerOptionId: option.id,
            configuration: demoIntegrationConfiguration(definition),
            permissions: definition.permissions.map(
              (permission) => permission.id,
            ),
            resourceIds: resources.map((resource) => resource.id),
          },
          scope,
        );
        assert.equal(connected.kind, "connected");
        const connection = parseIntegrationConnection(
          connected.connection,
          definition,
          scope,
        );
        assert.equal(connection.providerOptionId, option.id);
        assert.deepEqual(
          connection.grantedPermissions,
          definition.permissions.map((permission) => permission.id),
        );
        assert.deepEqual(
          connection.resourceIds,
          resources.map((resource) => resource.id),
        );
        const context = {
          binding,
          definition,
          scope,
          adapter,
          resources,
          connection,
          actions: getIntegrationActionsForOption(definition, option.id),
          resource: resources[0],
          operations: [],
        };
        await prepare(context);
        const values = primaryValues(context);
        for (const field of action.fields.filter((field) => field.required)) {
          const incomplete = { ...values };
          delete incomplete[field.id];
          assert.throws(
            () => validateIntegrationFields(action.fields, incomplete),
            errorCode("validation"),
          );
          requiredFieldChecks++;
        }
        const key = `primary-binding-${index + 1}`;
        const result = await execute(context, action, values, "primary", key);
        await assertActionOutcome(context, values, result);
        const replay = await execute(context, action, values, "replay", key);
        assert.deepEqual(
          replay,
          result,
          "An unchanged idempotent retry must return the same snapshot.",
        );
        await assert.rejects(
          adapter.execute(
            {
              integrationId: definition.id,
              connectionId: connection.id,
              actionId: action.id,
              values,
            },
            { workspaceId: `foreign-binding-${index + 1}` },
          ),
          errorCode("configuration-required"),
        );
        const disconnected = parseIntegrationConnection(
          await adapter.disconnect(connection.id, scope),
          definition,
          scope,
        );
        assert.equal(disconnected.status, "disconnected");
        rows.push({
          candidateId: definition.id,
          providerOptionId: option.id,
          actionId: action.id,
          kind: action.kind,
          status: "passed",
          resultKind: result.kind,
          declaredFieldCount: action.fields.length,
          requiredFieldCount: action.fields.filter((field) => field.required)
            .length,
          workspaceIsolation: "passed",
          idempotentReplay: "passed",
          operations: context.operations,
        });
      } catch (error) {
        failures.push({ binding: binding.id, message: error.message });
        throw error;
      }
    });
  }

  const operations = rows.flatMap((row) => row.operations);
  const counts = {
    candidates: new Set(rows.map((row) => row.candidateId)).size,
    providerChoices: new Set(
      rows.map((row) => `${row.candidateId}/${row.providerOptionId}`),
    ).size,
    actions: new Set(rows.map((row) => `${row.candidateId}/${row.actionId}`))
      .size,
    bindings: rows.length,
    operationKinds: new Set(rows.map((row) => row.kind)).size,
    plannedBindings: matrix.length,
    failedBindings: failures.length,
    parsedResults: operations.length,
    preparationExecutions: operations.filter(
      (operation) => operation.purpose === "preparation",
    ).length,
    verificationExecutions: operations.filter(
      (operation) => operation.purpose === "verification",
    ).length,
    idempotentReplays: operations.filter(
      (operation) => operation.purpose === "replay",
    ).length,
    workspaceRejections: rows.length,
    requiredFieldRejections: requiredFieldChecks,
    fileUploads: operations.filter(
      (operation) => operation.transport === "upload",
    ).length,
    fetchAttempts,
  };
  t.diagnostic(
    JSON.stringify({ nativeProviderAcceptance: false, counts, failures }),
  );
  assert.deepEqual(
    failures,
    [],
    "All declared option/action bindings must pass.",
  );
  assert.equal(rows.length, matrix.length);
  assert.equal(fetchAttempts, 0);
  assert.deepEqual(
    await sourceHashes(),
    sourcesAtImport,
    "Sources changed during validation; do not publish this receipt.",
  );

  if (process.env.AUREFORM_PROVIDER_ACTION_RECEIPT === "1") {
    const receiptUrl = new URL(
      "../docs/integrations/provider-action-validation.json",
      import.meta.url,
    );
    const receipt = {
      schemaVersion: 1,
      checkedAt: new Date().toISOString(),
      validationType: "local-demo-contract",
      nativeProviderAcceptance: false,
      command:
        "node --experimental-strip-types --test tests/integration-provider-actions.test.mjs",
      suiteCommand: "pnpm test",
      receiptCommand:
        "AUREFORM_PROVIDER_ACTION_RECEIPT=1 node --experimental-strip-types --test tests/integration-provider-actions.test.mjs",
      nodeVersion: process.version,
      methodology: {
        en: "All option/action bindings discovered through the public recipe API are executed in separate in-memory demo adapters with all declared grants and reported resources. Dependencies use public adapter calls and returned IDs. Declared-field validation, result parsing, observable dependency outcomes, idempotent replay and workspace rejection are checked. Logical fixture references and local document defaults do not verify native provider accounts, SDKs, permissions, delivery, billing or resource existence.",
        es: "Todas las asociaciones de opción y acción obtenidas mediante la API pública de recetas se ejecutan en adaptadores demo separados, en memoria, con todos los permisos declarados y recursos reportados. Las dependencias usan llamadas públicas e IDs devueltos. Se comprueban campos declarados, parsing de resultados, efectos observables de dependencias, repetición idempotente y rechazo entre workspaces. Las referencias de prueba y valores iniciales locales de documentos no verifican cuentas, SDK, permisos, entregas, cobros ni existencia de recursos nativos.",
      },
      sources: sourcesAtImport,
      counts,
      kinds: [...new Set(rows.map((row) => row.kind))].sort().map((kind) => ({
        kind,
        bindingCount: rows.filter((row) => row.kind === kind).length,
        passedBindingCount: rows.filter((row) => row.kind === kind).length,
      })),
      bindings: rows,
    };
    await mkdir(new URL(".", receiptUrl), { recursive: true });
    await writeFile(receiptUrl, `${JSON.stringify(receipt, null, 2)}\n`);
    t.diagnostic(`Receipt: ${receiptUrl.pathname}`);
  }
});
