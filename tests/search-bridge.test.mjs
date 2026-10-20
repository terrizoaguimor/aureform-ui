import test from "node:test";
import assert from "node:assert/strict";
import {
  SearchBridgeError,
  createIntegrationSearchBridge,
  createSearchBridgeSession,
  filterShellNavigation,
  parseShellSearchResult,
  searchBridgeErrorCode,
  searchBridgeHref,
  selectSearchFacet,
  serializeSearchFacets,
} from "../src/lib/integrations/search-bridge.ts";

const text = (en) => ({ en, es: en });
const definition = {
  id: "application-search",
  name: "Application search",
  family: "search",
  priority: "P1",
  description: text("Authorized search"),
  options: [{ id: "provider-choice", name: "Provider" }],
  connectionMode: "server",
  configurationFields: [],
  permissions: [],
  resourceTypes: ["index"],
  resourceLabel: text("Indexes"),
  actions: [
    {
      id: "provider-specific-search",
      kind: "search",
      label: text("Search"),
      description: text("Search authorized records"),
      requiredPermissions: ["search.read"],
      fields: [
        { id: "query", type: "text", required: true, label: text("Query") },
        { id: "indexId", type: "text", required: true, label: text("Index") },
      ],
    },
  ],
  documentationUrl: "https://example.com/docs",
  packages: [],
  license: "Consumer-provided",
  serviceNote: text("Backend authentication"),
};
const hit = (title = "Release note", extra = {}) => ({
  id: title,
  title,
  snippet: `Passage for ${title}`,
  source: "Authorized index",
  url: "/en/docs/",
  ...extra,
});
const response = (title = "Release note") => ({
  hits: [hit(title)],
  total: 40,
});
const connection = (workspaceId = "studio", extra = {}) => ({
  id: `${workspaceId}:connection`,
  integrationId: definition.id,
  providerOptionId: "provider-choice",
  workspaceId,
  status: "connected",
  account: { name: "Application workspace" },
  configuration: {},
  grantedPermissions: ["search.read"],
  resourceIds: [`${workspaceId}:catalogue`],
  revision: 1,
  ...extra,
});
const request = (workspaceId = "studio") => ({
  workspaceId,
  query: "release",
  signal: new AbortController().signal,
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

test("reported totals and backend ranking survive normalization without re-counting hits", () => {
  const input = {
    hits: [
      hit("Second rank", { score: 0.2 }),
      hit("First rank", { score: 0.8 }),
    ],
    total: 105,
  };
  const parsed = parseShellSearchResult(input);
  assert.equal(parsed.total, 105);
  assert.deepEqual(
    parsed.hits.map((item) => item.title),
    ["Second rank", "First rank"],
  );
  assert.notEqual(parsed.hits[0], input.hits[0]);
});

test("malformed current responses fail instead of becoming empty or demo results", () => {
  for (const value of [
    null,
    { hits: [], total: -1 },
    { hits: [], total: Infinity },
    { hits: [hit()], total: 0 },
    { hits: [{ ...hit(), score: NaN }], total: 1 },
    { hits: [{ ...hit(), title: "" }], total: 1 },
    { hits: [{ ...hit(), snippet: {} }], total: 1 },
  ]) {
    assert.throws(
      () => parseShellSearchResult(value),
      (cause) =>
        cause instanceof SearchBridgeError && cause.code === "provider-error",
    );
  }
});

test("public destinations remain usable while credential or executable links become previews", () => {
  const credentialUrl = new URL("https://example.com");
  credentialUrl.username = "fixture";
  credentialUrl.password = "synthetic-fixture";
  assert.equal(
    searchBridgeHref("/en/docs/?id=release"),
    "/en/docs/?id=release",
  );
  assert.equal(
    searchBridgeHref("https://example.com/article"),
    "https://example.com/article",
  );
  assert.equal(searchBridgeHref("/en/docs/#search"), "/en/docs/#search");
  for (const value of [
    "javascript:alert(1)",
    "//example.com",
    "http://example.com",
    "/\\example.com",
    credentialUrl.href,
    "/en/docs/?access_token=example",
    "https://example.com/?X-Amz-Signature=example",
    "/en/docs/?api_key=example",
    "/en/docs/#access_token=example",
    "https://example.com/#/callback?id_token=example",
  ]) {
    assert.equal(searchBridgeHref(value), undefined);
    const parsed = parseShellSearchResult({
      hits: [hit("Preview", { url: value })],
      total: 1,
    });
    assert.equal(parsed.hits.length, 1);
    assert.equal(parsed.hits[0].url, undefined);
  }
});

test("the core bridge discovers action IDs and reads the authorized connection for each workspace", async () => {
  const calls = [];
  const adapter = {
    mode: "consumer",
    get: async (id, scope) => {
      calls.push({ kind: "get", id, scope });
      return connection(scope.workspaceId);
    },
    execute: async (input, scope) => {
      calls.push({ kind: "execute", input, scope });
      return { kind: "search", ...response(scope.workspaceId) };
    },
  };
  const bridge = createIntegrationSearchBridge({ adapter, definition });
  for (const workspaceId of ["studio", "personal"]) {
    const input = request(workspaceId);
    const result = await bridge.search(input);
    const execute = calls.at(-1);
    assert.equal(result.hits[0].title, workspaceId);
    assert.equal(result.total, 40);
    assert.equal(execute.input.actionId, "provider-specific-search");
    assert.equal(execute.input.connectionId, `${workspaceId}:connection`);
    assert.equal(execute.input.values.indexId, `${workspaceId}:catalogue`);
    assert.equal(execute.input.values.page, 0);
    assert.equal(execute.input.values.pageSize, 20);
    assert.equal(execute.scope.signal, input.signal);
  }
  assert.equal(bridge.mode, "consumer");
  assert.deepEqual(
    calls.map((call) => call.kind),
    ["get", "execute", "get", "execute"],
  );
});

test("provider-specific vocabulary follows the freshly read workspace connection", async () => {
  const first = { ...definition.actions[0], id: "first-provider-search" };
  const second = { ...definition.actions[0], id: "second-provider-search" };
  const multi = {
    ...definition,
    options: [
      { id: "first", name: "First" },
      { id: "second", name: "Second" },
    ],
    actions: [first, second],
  };
  const executed = [];
  const selected = [];
  const bridge = createIntegrationSearchBridge({
    definition: multi,
    actionsForOption: (optionId) => {
      selected.push(optionId);
      return optionId === "first" ? [first] : [second];
    },
    adapter: {
      mode: "consumer",
      get: async (_id, scope) =>
        connection(scope.workspaceId, {
          providerOptionId: scope.workspaceId === "studio" ? "first" : "second",
        }),
      execute: async (input) => {
        executed.push(input.actionId);
        return { kind: "search", ...response() };
      },
    },
  });
  await bridge.search(request("studio"));
  await bridge.search(request("personal"));
  assert.deepEqual(selected, ["first", "second"]);
  assert.deepEqual(executed, [
    "first-provider-search",
    "second-provider-search",
  ]);
});

test("cross-workspace metadata and unselected resource bindings cannot execute a search", async () => {
  for (const options of [
    { get: async () => connection("personal") },
    { resourceId: "personal:catalogue", get: async () => connection("studio") },
  ]) {
    let executed = false;
    const bridge = createIntegrationSearchBridge({
      definition,
      resourceId: options.resourceId,
      adapter: {
        mode: "consumer",
        get: options.get,
        execute: async () => {
          executed = true;
          return { kind: "search", ...response() };
        },
      },
    });
    await assert.rejects(
      bridge.search(request()),
      (cause) => cause.code === "permission-denied",
    );
    assert.equal(executed, false);
  }
});

test("missing grants and expired connections return explicit errors without a mock fallback", async () => {
  for (const [extra, expected] of [
    [{ grantedPermissions: [] }, "permission-denied"],
    [{ status: "expired" }, "expired"],
    [{ status: "not-configured" }, "configuration-required"],
  ]) {
    let executed = false;
    const bridge = createIntegrationSearchBridge({
      definition,
      adapter: {
        mode: "consumer",
        get: async () => connection("studio", extra),
        execute: async () => {
          executed = true;
          return { kind: "search", ...response() };
        },
      },
    });
    await assert.rejects(
      bridge.search(request()),
      (cause) => cause.code === expected,
    );
    assert.equal(executed, false);
  }
});

test("an abort while an adapter ignores the connection-read signal still prevents execution", async () => {
  const pending = deferred();
  const controller = new AbortController();
  let executed = false;
  const bridge = createIntegrationSearchBridge({
    definition,
    adapter: {
      mode: "consumer",
      get: async () => pending.promise,
      execute: async () => {
        executed = true;
        return { kind: "search", ...response() };
      },
    },
  });
  const outcome = bridge.search({ ...request(), signal: controller.signal });
  controller.abort();
  pending.resolve(connection());
  await assert.rejects(outcome, (cause) => cause.code === "cancelled");
  assert.equal(executed, false);
});

test("a non-search core response is rejected and never converted into invented search hits", async () => {
  const bridge = createIntegrationSearchBridge({
    definition,
    adapter: {
      mode: "consumer",
      get: async () => connection(),
      execute: async () => ({ kind: "records", records: [], total: 0 }),
    },
  });
  await assert.rejects(
    bridge.search(request()),
    (cause) => cause.code === "provider-error",
  );
});

test("a new workspace request aborts the old one and discards a late success", async () => {
  const session = createSearchBridgeSession();
  const first = deferred();
  const second = deferred();
  const requests = [];
  const adapter = {
    search: (input) => {
      requests.push(input);
      return requests.length === 1 ? first.promise : second.promise;
    },
  };
  const old = session.run(adapter, { workspaceId: "studio", query: "old" });
  const current = session.run(adapter, {
    workspaceId: "personal",
    query: "current",
  });
  assert.equal(requests[0].signal.aborted, true);
  second.resolve(response("Personal result"));
  assert.equal((await current).hits[0].title, "Personal result");
  first.resolve(response("Studio result"));
  assert.equal(await old, null);
});

test("replacing the adapter suppresses a stale rejection as well as stale data", async () => {
  const session = createSearchBridgeSession();
  const pending = deferred();
  const old = session.run(
    { search: async () => pending.promise },
    { workspaceId: "studio", query: "release" },
  );
  const current = await session.run(
    { search: async () => response("New backend") },
    { workspaceId: "studio", query: "release" },
  );
  pending.reject(new Error("An obsolete backend failed."));
  assert.equal(await old, null);
  assert.equal(current.hits[0].title, "New backend");
});

test("manual cancellation and an explicit retry use independent signals with retained query inputs", async () => {
  const session = createSearchBridgeSession();
  const pending = deferred();
  const requests = [];
  const adapter = {
    search: (input) => {
      requests.push(input);
      return requests.length === 1
        ? pending.promise
        : Promise.resolve(response("Retry result"));
    },
  };
  const old = session.run(adapter, {
    workspaceId: "studio",
    query: "same query",
  });
  session.cancel();
  assert.equal(requests[0].signal.aborted, true);
  const retry = await session.run(adapter, {
    workspaceId: "studio",
    query: "same query",
  });
  pending.resolve(response("Obsolete result"));
  assert.equal(await old, null);
  assert.equal(retry.hits[0].title, "Retry result");
  assert.equal(requests[1].query, "same query");
  assert.notEqual(requests[0].signal, requests[1].signal);
});

test("the palette receives only whitelisted error codes, never adapter error text", async () => {
  const session = createSearchBridgeSession();
  const cause = new Error(
    "Backend-specific diagnostics must remain outside the UI.",
  );
  cause.code = "permission-denied";
  await assert.rejects(
    session.run(
      {
        search: async () => {
          throw cause;
        },
      },
      { workspaceId: "studio", query: "release" },
    ),
    (error) =>
      error.code === "permission-denied" &&
      !error.message.includes("diagnostics"),
  );
  assert.equal(
    searchBridgeErrorCode(new Error("Network details")),
    "provider-error",
  );
  assert.equal(searchBridgeErrorCode({ code: "admin" }), "provider-error");
});

test("facet values support OR selection, single choice and stable JSON without altering reported counts", () => {
  const multiple = {
    id: "type",
    label: "Type",
    buckets: [
      { value: "alpha", label: "Alpha", count: 105 },
      { value: "beta", label: "Beta", count: 7 },
    ],
  };
  const single = {
    id: "status",
    label: "Status",
    selection: "single",
    buckets: [
      { value: "queued", label: "Queued", count: 44 },
      { value: "ready", label: "Ready", count: 68 },
    ],
  };
  let selection = selectSearchFacet({}, multiple, "beta", true);
  selection = selectSearchFacet(selection, multiple, "alpha", true);
  selection = selectSearchFacet(selection, single, "ready", true);
  selection = selectSearchFacet(selection, single, "queued", true);
  assert.equal(
    serializeSearchFacets(selection),
    '{"status":["queued"],"type":["alpha","beta"]}',
  );
  assert.equal(multiple.buckets[0].count, 105);
  assert.equal(
    selectSearchFacet(selection, multiple, "not-reported", true),
    selection,
  );
  selection = selectSearchFacet(selection, multiple, "beta", false);
  assert.deepEqual(selection.type, ["alpha"]);
  assert.equal(serializeSearchFacets({ empty: [] }), "{}");
});

test("local navigation filters ignore accents while keeping the supplied order", () => {
  const items = [
    { label: "Configuración", keywords: ["workspace settings"] },
    { label: "Documentación", keywords: ["docs"] },
    { label: "Appearance", keywords: ["design"] },
  ];
  assert.deepEqual(filterShellNavigation(items, "configuracion workspace"), [
    items[0],
  ]);
  assert.deepEqual(filterShellNavigation(items, ""), items);
});

test("an exact local Calendar title outranks provider recipes without hiding partial matches", () => {
  const items = Object.freeze([
    { label: "Google Calendar", keywords: ["integrations/google-calendar"] },
    { label: "Calendar", keywords: ["calendar", "Calendario"] },
    { label: "Calendar settings", keywords: ["workspace settings"] },
    { label: "Schedules", keywords: ["calendar"] },
  ]);
  assert.deepEqual(filterShellNavigation(items, "  cALeNDAr  "), [
    items[1],
    items[0],
    items[2],
    items[3],
  ]);
  assert.deepEqual(filterShellNavigation(items, "Google Calendar"), [items[0]]);
  assert.deepEqual(filterShellNavigation(items, "calend"), items);
  assert.deepEqual(filterShellNavigation(items, " \t "), items);
});

test("exact local title priority folds accents and whitespace while preserving tied and partial order", () => {
  const items = [
    { label: "Provider settings", keywords: ["configuracion avanzada"] },
    { label: "Configuración avanzada del proveedor" },
    { label: "Configuración avanzada" },
    { label: "CONFIGURACION  AVANZADA" },
  ];
  assert.deepEqual(
    filterShellNavigation(items, " \tCONFIGURACION \n AVANZADA "),
    [items[2], items[3], items[0], items[1]],
  );
});
