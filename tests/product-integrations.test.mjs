import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultActionValues,
  findProductAction,
  invalidProductField,
  mapProductRecord,
  mergeProductRecords,
  optimisticProductRecord,
  parseProductArguments,
  parseProductFields,
  productActionValues,
  productMapLocations,
  productQueryValues,
  productReadDefaults,
  productRecordNeedsTarget,
  productScopeKey,
  productSearchSegments,
  productToolFields,
  rollbackProductRecord,
  safeProductUrl,
  validProductMapping,
} from "../src/components/integrations/product-model.ts";
import { startProductSubscription } from "../src/components/integrations/product-subscription.ts";
import {
  createProductDataEpoch,
  productDataUpdate,
  productReportedDataPage,
} from "../src/components/integrations/product-data-reactivity.ts";
import {
  productBlankDocument,
  productDocumentFormats,
} from "../src/components/integrations/product-document-defaults.ts";
import {
  productReportedRemoval,
  productSourceRemovalResult,
} from "../src/components/integrations/product-source-removal.ts";

const text = (en) => ({ en, es: en });
const action = {
  id: "custom-save-v2",
  kind: "save-record",
  label: text("Save"),
  description: text("Save"),
  fields: [
    { id: "resourceId", label: text("Resource"), type: "text", required: true },
    { id: "name", label: text("Name"), type: "text", required: true },
    { id: "count", label: text("Count"), type: "number" },
    {
      id: "status",
      label: text("Status"),
      type: "select",
      options: [{ value: "active", label: text("Active") }],
    },
    { id: "approved", label: text("Approved"), type: "toggle", required: true },
  ],
};
const record = {
  id: "stable-7",
  name: "Original",
  type: "record",
  status: "active",
  description: "Stored content",
  updatedAt: "2026-10-20T10:00:00.000Z",
  fields: { count: 0, tags: ["public"], enabled: false },
};

test("reactive connection events are restricted to the authorized resource and workspace", () => {
  const connection = {
    id: "connection-1",
    integrationId: "convex",
    providerOptionId: "convex",
    workspaceId: "studio",
    revision: 1,
    status: "connected",
    resourceIds: ["resource-1", "resource-2"],
    grantedPermissions: ["queries.read"],
  };
  const scoped = {
    ...record,
    fields: { resourceId: "resource-1", workspaceId: "studio" },
  };
  const update = (value) => ({
    kind: "result",
    result: { kind: "record", record: value },
  });
  assert.equal(
    productDataUpdate(update(scoped), connection, "resource-1").kind,
    "rows",
  );
  assert.deepEqual(
    productDataUpdate(
      update({
        ...scoped,
        fields: { ...scoped.fields, resourceId: "resource-2" },
      }),
      connection,
      "resource-1",
    ),
    { kind: "rows", records: [] },
  );
  assert.equal(
    productDataUpdate(
      update({
        ...scoped,
        fields: { ...scoped.fields, resourceId: "ungranted-resource" },
      }),
      connection,
      "resource-1",
    ).kind,
    "ignore",
  );
  assert.equal(
    productDataUpdate(
      update({
        ...scoped,
        fields: { ...scoped.fields, workspaceId: "personal" },
      }),
      connection,
      "resource-1",
    ).kind,
    "ignore",
  );
  assert.equal(
    productDataUpdate(update(scoped), connection, "ungranted").kind,
    "ignore",
  );
  assert.deepEqual(
    productDataUpdate(
      update({ ...record, fields: {} }),
      connection,
      "resource-1",
    ),
    { kind: "rows", records: [] },
  );
  assert.equal(
    productDataUpdate(
      {
        kind: "connection",
        connection: { ...connection, workspaceId: "personal" },
      },
      connection,
      "resource-1",
    ).kind,
    "ignore",
  );
  assert.equal(
    productDataUpdate(
      { kind: "connection", connection: { ...connection, revision: 2 } },
      connection,
      "resource-1",
    ).kind,
    "scope-changed",
  );
  assert.equal(
    productDataUpdate(
      {
        kind: "connection",
        connection: { ...connection, grantedPermissions: [] },
      },
      connection,
      "resource-1",
    ).kind,
    "scope-changed",
  );
});

test("query-bound reactive pages preserve server order and total without client pagination", () => {
  const connection = {
    id: "c",
    integrationId: "convex",
    workspaceId: "studio",
    status: "connected",
    resourceIds: ["r"],
  };
  const query = {
    search: "remote",
    filters: [{ id: "status", value: "ready" }],
    sorting: [{ id: "name", desc: true }],
    pagination: { pageIndex: 8, pageSize: 2 },
  };
  const page = {
    kind: "records",
    records: [
      { ...record, id: "z" },
      { ...record, id: "a" },
    ],
    total: 25,
    cursor: "server-next",
  };
  assert.equal(productReportedDataPage(page, connection, "r", query), page);
  const joinedPage = {
    ...page,
    records: [
      { ...page.records[0], fields: { resourceId: "r" } },
      { ...page.records[1], fields: { resourceId: "joined-resource" } },
    ],
  };
  assert.equal(
    productReportedDataPage(
      joinedPage,
      { ...connection, resourceIds: ["r", "joined-resource"] },
      "r",
      query,
    ),
    joinedPage,
  );
  assert.deepEqual(
    page.records.map((row) => row.id),
    ["z", "a"],
  );
  assert.equal(
    productReportedDataPage(
      { ...page, records: [...page.records, { ...record, id: "b" }] },
      connection,
      "r",
      query,
    ),
    undefined,
  );
  assert.equal(
    productReportedDataPage(
      { ...page, records: [page.records[0], page.records[0]] },
      connection,
      "r",
      query,
    ),
    undefined,
  );
  assert.equal(
    productReportedDataPage({ ...page, total: 1 }, connection, "r", query),
    undefined,
  );
  assert.equal(
    productReportedDataPage(
      { ...page, records: [{ ...record, fields: { resourceId: "other" } }] },
      connection,
      "r",
      query,
    ),
    undefined,
  );
  assert.equal(
    productReportedDataPage(
      {
        ...page,
        records: [{ ...record, fields: { workspaceId: "personal" } }],
      },
      connection,
      "r",
      query,
    ),
    undefined,
  );
});

test("a query completing after a reactive page cannot replace the current rows", async () => {
  const epoch = createProductDataEpoch();
  const captured = epoch.capture();
  let resolve;
  const delayedQuery = new Promise((done) => {
    resolve = done;
  });
  let table = [{ ...record, name: "Reactive page" }];
  const pending = delayedQuery.then((rows) => {
    if (epoch.isCurrent(captured)) table = rows;
  });
  epoch.invalidate();
  resolve([{ ...record, name: "Older query page" }]);
  await pending;
  assert.equal(table[0].name, "Reactive page");
  assert.equal(epoch.isCurrent(epoch.capture()), true);
});

test("changing a reactive query aborts its old page callback and disposes asynchronous setup", async () => {
  const listeners = {};
  const signals = {};
  const resolveSetup = {};
  const cleanups = [];
  const received = [];
  const subscribe = (query) =>
    startProductSubscription(
      (listener, signal) => {
        listeners[query] = listener;
        signals[query] = signal;
        return new Promise((resolve) => {
          resolveSetup[query] = () => resolve(() => cleanups.push(query));
        });
      },
      {
        onUpdate: (page) => received.push({ query, page }),
        onError: () => assert.fail("No transport error expected."),
      },
    );
  const stopFirst = subscribe("customers-ready-page-1");
  listeners["customers-ready-page-1"]("first-current-page");
  stopFirst();
  assert.equal(signals["customers-ready-page-1"].aborted, true);
  const stopSecond = subscribe("orders-active-page-2");
  listeners["customers-ready-page-1"]("late-wrong-filter-and-page");
  listeners["orders-active-page-2"]("second-current-page");
  resolveSetup["customers-ready-page-1"]();
  resolveSetup["orders-active-page-2"]();
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(received, [
    { query: "customers-ready-page-1", page: "first-current-page" },
    { query: "orders-active-page-2", page: "second-current-page" },
  ]);
  assert.deepEqual(cleanups, ["customers-ready-page-1"]);
  stopSecond();
  listeners["orders-active-page-2"]("late-after-unmount");
  assert.equal(received.length, 2);
  assert.deepEqual(cleanups, [
    "customers-ready-page-1",
    "orders-active-page-2",
  ]);
});

test("JSON-only editor recipes initialize and reset to a selectable valid document", () => {
  const jsonOnly = {
    ...action,
    fields: [{ id: "format", type: "select", options: [{ value: "json" }] }],
  };
  for (const id of ["lexical", "blocknote"]) {
    const blank = productBlankDocument(jsonOnly, id);
    assert.equal(blank.format, "json");
    assert.deepEqual(productDocumentFormats(jsonOnly), ["json"]);
    const content = JSON.parse(blank.content);
    if (id === "lexical") {
      assert.equal(content.root.type, "root");
      assert.equal(content.root.children[0].type, "paragraph");
      assert.deepEqual(content.root.children[0].children, []);
    } else {
      assert.equal(Array.isArray(content), true);
      assert.equal(content[0].type, "paragraph");
      assert.deepEqual(content[0].content, []);
    }
    assert.equal(blank.revision, 0);
    assert.notEqual(productBlankDocument(jsonOnly, id), blank);
  }
  assert.deepEqual(JSON.parse(productBlankDocument(jsonOnly).content), {});
  const textOnly = {
    ...jsonOnly,
    fields: [{ id: "format", type: "select", options: [{ value: "text" }] }],
  };
  assert.equal(productBlankDocument(textOnly).format, "text");
});

test("source removal requires the requested source's reported tombstone; receipts and completed jobs are insufficient", () => {
  const source = { ...record, id: "source-1", status: "ready" };
  const initial = {
    sourceId: source.id,
    name: source.name,
    phase: "submitted",
    source,
  };
  const receipt = productSourceRemovalResult(initial, {
    kind: "receipt",
    id: "request-1",
    message: "Request received.",
  });
  assert.equal(receipt.phase, "awaiting-status");
  const job = {
    id: "delete-job",
    name: "Remove source",
    status: "running",
    progress: 32,
    steps: [],
    logs: [],
  };
  const pending = productSourceRemovalResult(initial, { kind: "job", job });
  assert.equal(pending.phase, "pending");
  const completed = productSourceRemovalResult(pending, {
    kind: "job",
    job: { ...job, status: "completed", progress: 100 },
  });
  assert.equal(completed.phase, "awaiting-status");
  assert.equal(
    productSourceRemovalResult(completed, {
      kind: "knowledge",
      documents: [],
      hits: [],
      status: "ready",
    }).phase,
    "awaiting-status",
  );
  assert.equal(
    productSourceRemovalResult(completed, {
      kind: "record",
      record: { ...source, id: "other-source", status: "deleted" },
    }).phase,
    "awaiting-status",
  );
  const deleted = productSourceRemovalResult(completed, {
    kind: "knowledge",
    documents: [{ ...source, status: "deleted" }],
    hits: [],
    status: "ready",
  });
  assert.equal(deleted.phase, "deleted");
  assert.equal(deleted.source.status, "deleted");
});

test("reported deletion failures and job identities do not relabel ingestion failures or another job", () => {
  const initial = {
    sourceId: record.id,
    name: record.name,
    phase: "pending",
    source: record,
    job: {
      id: "delete-job",
      name: "Removal",
      status: "running",
      progress: 32,
      steps: [],
      logs: [],
    },
  };
  assert.equal(
    productReportedRemoval({ ...record, status: "failed" }),
    undefined,
  );
  assert.equal(
    productReportedRemoval({ ...record, fields: { deletionStatus: "failed" } }),
    "failed",
  );
  assert.equal(
    productReportedRemoval({ ...record, status: "deleting" }),
    "pending",
  );
  const unrelated = productSourceRemovalResult(initial, {
    kind: "job",
    job: {
      ...initial.job,
      id: "ingest-job",
      status: "completed",
      progress: 100,
    },
  });
  assert.equal(unrelated.phase, "pending");
  assert.equal(unrelated.job.id, "delete-job");
  const failed = productSourceRemovalResult(initial, {
    kind: "job",
    job: { ...initial.job, status: "failed" },
  });
  assert.equal(failed.phase, "failed");
});

test("creation and calendar save recipes do not reuse a source record as the destination", () => {
  assert.equal(
    productRecordNeedsTarget({ ...action, kind: "create-ticket" }),
    false,
  );
  assert.equal(
    productRecordNeedsTarget({
      ...action,
      fields: [
        { id: "title", label: text("Title"), type: "text", required: true },
        { id: "startAt", label: text("Start"), type: "text", required: true },
      ],
    }),
    false,
  );
  assert.equal(
    productRecordNeedsTarget({
      ...action,
      fields: [
        { id: "recordId", label: text("Record"), type: "text", required: true },
      ],
    }),
    true,
  );
  assert.equal(
    productRecordNeedsTarget({ ...action, kind: "update-record" }),
    true,
  );
});

test("demo read defaults bind authorized references and a date window without inventing consumer inputs", () => {
  const query = {
    ...action,
    kind: "query",
    fields: [
      { id: "threadId", label: text("Thread"), type: "text", required: true },
      { id: "startAt", label: text("Start"), type: "text", required: true },
      { id: "endAt", label: text("End"), type: "text", required: true },
      { id: "query", label: text("Query"), type: "text" },
    ],
  };
  const props = {
    adapter: { mode: "demo" },
    connection: { resourceIds: ["authorized-fixture"] },
  };
  const demo = productReadDefaults(query, props);
  assert.equal(demo.threadId, "authorized-fixture");
  assert.equal(demo.query, "");
  assert.equal(
    Date.parse(demo.endAt) - Date.parse(demo.startAt),
    7 * 24 * 60 * 60 * 1000,
  );
  const consumer = productReadDefaults(query, {
    ...props,
    adapter: { mode: "consumer" },
  });
  assert.equal(consumer.threadId, "");
  assert.equal(consumer.startAt, "");
  assert.equal(consumer.endAt, "");
  const empty = productReadDefaults(query, {
    ...props,
    connection: { resourceIds: [] },
  });
  assert.equal(empty.threadId, "");
});

test("action lookup uses the supplied definition ID and validates declarative fields", () => {
  const definition = { actions: [action] };
  assert.equal(
    findProductAction(definition, "query", "save-record")?.id,
    "custom-save-v2",
  );
  assert.equal(findProductAction(definition, "search"), undefined);
  const values = productActionValues(
    action,
    { name: "Updated", count: 0, approved: false },
    "allowed-3",
  );
  assert.equal(values.resourceId, "allowed-3");
  assert.equal(values.status, "active");
  assert.equal(invalidProductField(action, values), undefined);
  assert.equal(
    invalidProductField(action, { ...values, count: Infinity })?.id,
    "count",
  );
  assert.equal(
    invalidProductField(action, { ...values, status: "unknown" })?.id,
    "status",
  );
  assert.equal(
    invalidProductField(action, { ...values, name: " " })?.id,
    "name",
  );
  assert.equal(defaultActionValues(action).approved, false);
});

test("external queries preserve remote pagination and the ordered sort/filter envelope", () => {
  const query = {
    search: "two words",
    filters: [{ id: "status", value: "active" }],
    sorting: [
      { id: "name", desc: true },
      { id: "updatedAt", desc: false },
    ],
    pagination: { pageIndex: 3, pageSize: 25 },
  };
  const values = productQueryValues(query, "collection-3");
  assert.equal(values.page, 3);
  assert.equal(values.pageNumber, 4);
  assert.equal(values.offset, 75);
  assert.equal(values.limit, 25);
  assert.equal(values.query, "two words");
  assert.equal(values.sort, "name");
  assert.equal(values.order, "desc");
  assert.deepEqual(JSON.parse(values.queryState), query);
  assert.deepEqual(JSON.parse(values.sorting), query.sorting);
});

test("optimistic updates retain stable IDs and rollback cannot overwrite a newer response", () => {
  const optimistic = optimisticProductRecord(
    record,
    { name: "Edited", status: "pending" },
    "pending:ours",
  );
  assert.equal(optimistic.id, record.id);
  assert.equal(optimistic.name, "Edited");
  assert.deepEqual(
    rollbackProductRecord([optimistic], record, "pending:ours"),
    [record],
  );
  const acknowledged = {
    ...optimistic,
    name: "Latest",
    updatedAt: "2026-10-20T11:00:00.000Z",
  };
  assert.deepEqual(
    rollbackProductRecord([acknowledged], record, "pending:ours"),
    [acknowledged],
  );
});

test("incremental records merge by stable ID without accepting older replayed records", () => {
  const latest = {
    ...record,
    name: "Latest",
    updatedAt: "2026-10-20T12:00:00.000Z",
  };
  assert.deepEqual(mergeProductRecords([latest], [record]), [latest]);
  assert.deepEqual(
    mergeProductRecords([record], [latest, { ...record, id: "second" }]).map(
      (item) => item.id,
    ),
    ["stable-7", "second"],
  );
});

test("a workspace, resource, permission or configuration change invalidates the workbench scope", () => {
  const props = {
    definition: { id: "integration" },
    adapter: { mode: "demo" },
    connection: {
      id: "connection",
      providerOptionId: "option",
      workspaceId: "one",
      revision: 1,
      status: "connected",
      resourceIds: ["b", "a"],
      grantedPermissions: ["read"],
    },
    scope: { workspaceId: "one" },
  };
  const key = productScopeKey(props);
  assert.equal(
    productScopeKey({
      ...props,
      connection: { ...props.connection, resourceIds: ["a", "b"] },
    }),
    key,
  );
  assert.notEqual(
    productScopeKey({ ...props, scope: { workspaceId: "two" } }),
    key,
  );
  assert.notEqual(
    productScopeKey({
      ...props,
      connection: { ...props.connection, resourceIds: ["a"] },
    }),
    key,
  );
  assert.notEqual(
    productScopeKey({
      ...props,
      connection: {
        ...props.connection,
        grantedPermissions: ["read", "write"],
      },
    }),
    key,
  );
  assert.notEqual(
    productScopeKey({
      ...props,
      connection: { ...props.connection, revision: 2 },
    }),
    key,
  );
});

test("record fields stay within IntegrationValues while MCP arguments can be structured", () => {
  assert.deepEqual(
    parseProductFields('{"count":0,"enabled":false,"tags":["a"]}'),
    { ok: true, values: { count: 0, enabled: false, tags: ["a"] } },
  );
  assert.equal(parseProductFields('{"nested":{"x":1}}').ok, false);
  assert.equal(parseProductFields('{"__proto__":"x"}').ok, false);
  assert.equal(
    parseProductArguments('{"filter":{"ids":[1,2],"active":false}}').ok,
    true,
  );
  assert.equal(
    parseProductArguments('{"nested":{"constructor":"x"}}').ok,
    false,
  );
  assert.equal(parseProductArguments('{"score":1e999}').ok, false);
  assert.equal(parseProductArguments("[]").ok, false);
});

test("mapping rejects ambiguous destinations and retains zero, false and list values", () => {
  assert.equal(
    validProductMapping([
      { source: "name", target: "title" },
      { source: "status", target: "title" },
    ]),
    false,
  );
  assert.equal(
    validProductMapping([{ source: "name", target: "__proto__" }]),
    false,
  );
  assert.equal(
    validProductMapping([{ source: "name", target: "title" }]),
    true,
  );
  assert.deepEqual(
    mapProductRecord(record, [
      { source: "count", target: "number" },
      { source: "enabled", target: "flag" },
      { source: "tags", target: "labels" },
    ]),
    { number: 0, flag: false, labels: ["public"] },
  );
});

test("presentation URLs and highlighted snippets cannot introduce active HTML or unsafe schemes", () => {
  assert.equal(safeProductUrl("javascript:alert(1)"), undefined);
  assert.equal(safeProductUrl("data:text/html,x"), undefined);
  const syntheticUserInfoUrl = new URL("https://example.invalid/");
  syntheticUserInfoUrl.username = "synthetic-fixture-user";
  syntheticUserInfoUrl.password = "synthetic-fixture-not-a-secret";
  assert.equal(safeProductUrl(syntheticUserInfoUrl.href), undefined);
  assert.equal(safeProductUrl("//unselected.example.com/"), undefined);
  assert.equal(safeProductUrl("/docs/"), "/docs/");
  assert.equal(
    safeProductUrl("https://example.com/source"),
    "https://example.com/source",
  );
  assert.deepEqual(
    productSearchSegments("a [scope] b [SCOPE]", "[scope]")
      .filter((part) => part.match)
      .map((part) => part.text),
    ["[scope]", "[SCOPE]"],
  );
});

test("map results omit invalid coordinates and duplicate or missing stable IDs", () => {
  const location = {
    id: "place-1",
    name: "Place",
    latitude: 4.7,
    longitude: -74,
  };
  const result = {
    kind: "map",
    locations: [
      location,
      location,
      { ...location, id: "bad", latitude: 91 },
      { ...location, id: "nan", longitude: NaN },
      { ...location, id: "" },
    ],
  };
  assert.deepEqual(productMapLocations(result), [location]);
});

test("tool schemas produce only declarative primitive controls", () => {
  const tool = {
    ...record,
    fields: {
      inputSchema: JSON.stringify({
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", title: "Query" },
          count: { type: "integer" },
          enabled: { type: "boolean" },
          mode: { type: "string", enum: ["safe", "full"] },
          nested: { type: "object" },
        },
      }),
    },
  };
  assert.deepEqual(
    productToolFields(tool).map((field) => [
      field.id,
      field.type,
      Boolean(field.required),
    ]),
    [
      ["query", "text", true],
      ["count", "number", false],
      ["enabled", "toggle", false],
      ["mode", "select", false],
    ],
  );
  assert.deepEqual(
    productToolFields({ ...tool, fields: { inputSchema: "not json" } }),
    [],
  );
});

test("subscription cleanup arriving after a workspace abort is called once and late updates are ignored", async () => {
  let resolveCleanup;
  let listener;
  let signal;
  let cleaned = 0;
  const updates = [];
  const parent = new AbortController();
  const dispose = startProductSubscription(
    (notify, abortSignal) => {
      listener = notify;
      signal = abortSignal;
      return new Promise((resolve) => {
        resolveCleanup = resolve;
      });
    },
    {
      signal: parent.signal,
      onUpdate: (value) => updates.push(value),
      onError: () => assert.fail("Unexpected error"),
    },
  );
  listener({ kind: "presence", members: [] });
  assert.equal(updates.length, 1);
  parent.abort();
  assert.equal(signal.aborted, true);
  listener({
    kind: "presence",
    members: [{ id: "late", name: "Late", state: "online" }],
  });
  resolveCleanup(() => {
    cleaned += 1;
  });
  await Promise.resolve();
  dispose();
  dispose();
  assert.equal(cleaned, 1);
  assert.equal(updates.length, 1);
});

test("subscription errors are reported only while active and pre-aborted setup never starts", async () => {
  let errors = 0;
  const dispose = startProductSubscription(
    () => Promise.reject(new Error("private provider detail")),
    {
      onUpdate: () => {},
      onError: () => {
        errors += 1;
      },
    },
  );
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(errors, 1);
  dispose();
  const parent = new AbortController();
  parent.abort();
  startProductSubscription(() => assert.fail("Must not start"), {
    signal: parent.signal,
    onUpdate: () => {},
    onError: () => assert.fail("Must not report"),
  });
});
