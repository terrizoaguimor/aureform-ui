import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTable,
  functionalUpdate,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  filterDataRows,
  isDataFilter,
  matchesDataFilter,
  normalizeDataTableColumnState,
  normalizeDataTableQuery,
  parseDataTableQuery,
  serializeDataTableQuery,
} from "../src/lib/data-query.ts";

test("query URLs round-trip Unicode, typed filter values and multi-sort precedence", () => {
  const query = normalizeDataTableQuery({
    search: " José & Sons / 東京 ",
    filters: [
      { id: "active", value: { operator: "equals", value: false } },
      { id: "amount", value: { operator: "between", value: [0, 250.5] } },
      { id: "status", value: { operator: "in", value: ["active", "pending"] } },
    ],
    sorting: [
      { id: "amount", desc: true },
      { id: "name", desc: false },
    ],
    pagination: { pageIndex: 4, pageSize: 25 },
  });
  const params = new URLSearchParams();
  params.set("table", serializeDataTableQuery(query));
  assert.deepEqual(
    parseDataTableQuery(new URLSearchParams(params.toString()).get("table")),
    query,
  );
  assert.deepEqual(
    query.sorting.map((sort) => sort.id),
    ["amount", "name"],
  );
  assert.equal(query.search, " José & Sons / 東京 ");
});

test("AND filter order and JSON property order serialize canonically; sorting order matters", () => {
  const first = normalizeDataTableQuery({
    filters: [
      { id: "z", value: { value: 0, operator: "equals" } },
      { id: "a", value: { value: ["pending"], operator: "in" } },
    ],
    sorting: [
      { id: "z", desc: true },
      { id: "a", desc: false },
    ],
  });
  const second = normalizeDataTableQuery({
    ...first,
    filters: [...first.filters].reverse(),
  });
  assert.equal(serializeDataTableQuery(first), serializeDataTableQuery(second));
  assert.notEqual(
    serializeDataTableQuery(first),
    serializeDataTableQuery({
      ...second,
      sorting: [...second.sorting].reverse(),
    }),
  );
});

test("normalization clamps pagination, restricts known columns and resolves duplicate IDs", () => {
  assert.deepEqual(
    normalizeDataTableQuery(
      {
        filters: [
          { id: "status", value: "old" },
          { id: "status", value: { operator: "equals", value: false } },
          { id: "missing", value: "ignored" },
          { id: "", value: "ignored" },
        ],
        sorting: [
          { id: "status", desc: false },
          { id: "amount", desc: false },
          { id: "status", desc: true },
          { id: "missing", desc: true },
        ],
        pagination: { pageIndex: -12, pageSize: 200 },
      },
      { columnIds: ["status", "amount"], pageSize: 10, maxPageSize: 50 },
    ),
    {
      search: "",
      filters: [{ id: "status", value: { operator: "equals", value: false } }],
      sorting: [
        { id: "status", desc: true },
        { id: "amount", desc: false },
      ],
      pagination: { pageIndex: 0, pageSize: 50 },
    },
  );
  assert.deepEqual(
    normalizeDataTableQuery({
      pagination: { pageIndex: "3.9", pageSize: "11.9" },
    }).pagination,
    { pageIndex: 3, pageSize: 11 },
  );
  assert.deepEqual(
    normalizeDataTableQuery(
      { pagination: { pageIndex: Infinity, pageSize: NaN } },
      { pageSize: 20 },
    ).pagination,
    { pageIndex: 0, pageSize: 20 },
  );
});

test("invalid URLs and unknown versions recover to explicit defaults", () => {
  const defaults = {
    search: "",
    filters: [],
    sorting: [],
    pagination: { pageIndex: 0, pageSize: 12 },
  };
  for (const source of [
    null,
    undefined,
    "",
    "{broken",
    "null",
    "[]",
    '{"version":99,"query":{"search":"ignore"}}',
  ]) {
    assert.deepEqual(parseDataTableQuery(source, { pageSize: 12 }), defaults);
  }
  assert.deepEqual(
    parseDataTableQuery('{"version":1,"query":{"pagination":{"pageSize":0}}}', {
      pageSize: 12,
    }).pagination,
    { pageIndex: 0, pageSize: 1 },
  );
});

test("empty conditions disappear while false, zero and null stay actionable", () => {
  const query = normalizeDataTableQuery({
    filters: [
      { id: "text", value: { operator: "contains", value: "" } },
      { id: "choices", value: { operator: "in", value: [] } },
      { id: "range", value: { operator: "between", value: [null, null] } },
      { id: "dates", value: { operator: "dateBetween", value: [null, null] } },
      { id: "active", value: { operator: "equals", value: false } },
      { id: "amount", value: { operator: "equals", value: 0 } },
      { id: "missing", value: { operator: "equals", value: null } },
    ],
  });
  assert.deepEqual(
    query.filters.map((filter) => filter.id),
    ["active", "amount", "missing"],
  );
  assert.equal(matchesDataFilter(false, query.filters[0].value), true);
  assert.equal(matchesDataFilter(0, query.filters[1].value), true);
  assert.equal(matchesDataFilter(null, query.filters[2].value), true);
  assert.equal(matchesDataFilter("0", query.filters[1].value), false);
});

test("normalization drops nonserializable or malformed conditions without mutating saved snapshots", () => {
  const filterValue = Object.freeze({
    operator: "in",
    value: Object.freeze(["active", "pending"]),
  });
  const original = Object.freeze({
    search: "two words ",
    filters: Object.freeze([{ id: "status", value: filterValue }]),
    sorting: Object.freeze([{ id: "name", desc: false }]),
    pagination: Object.freeze({ pageIndex: 2, pageSize: 10 }),
  });
  const next = normalizeDataTableQuery(original);
  next.filters[0].value.value.push("closed");
  next.pagination.pageIndex = 9;
  assert.deepEqual(original.filters[0].value.value, ["active", "pending"]);
  assert.equal(original.pagination.pageIndex, 2);
  assert.equal(next.search, "two words ");
  const circular = {};
  circular.self = circular;
  const malformed = normalizeDataTableQuery({
    filters: [
      { id: "a", value: { operator: "unrecognized", value: "x" } },
      { id: "b", value: { operator: "gt", value: Infinity } },
      { id: "c", value: { operator: "between", value: [1] } },
      { id: "d", value: new Date() },
      { id: "e", value: circular },
      { id: "f", value: () => true },
      {
        id: "g",
        value: { operator: "dateBetween", value: ["2026-02-30", null] },
      },
    ],
  });
  assert.deepEqual(malformed.filters, []);
});

test("text filters match accented Spanish input, while explicit equality retains scalar types", () => {
  assert.equal(
    matchesDataFilter("José Álvarez", {
      operator: "contains",
      value: "JOSE alv",
    }),
    true,
  );
  assert.equal(
    matchesDataFilter("Álvarez", { operator: "startsWith", value: "alv" }),
    true,
  );
  assert.equal(
    matchesDataFilter("Álvarez", { operator: "startsWith", value: "var" }),
    false,
  );
  assert.equal(
    matchesDataFilter("42", { operator: "equals", value: 42 }),
    false,
  );
  assert.equal(matchesDataFilter(42, { operator: "in", value: [0, 42] }), true);
  assert.equal(
    matchesDataFilter("42", { operator: "in", value: [0, 42] }),
    false,
  );
  assert.equal(
    matchesDataFilter(false, { operator: "notIn", value: [true] }),
    true,
  );
  assert.equal(matchesDataFilter(null, { operator: "isEmpty" }), true);
  assert.equal(matchesDataFilter(0, { operator: "isNotEmpty" }), true);
});

test("numeric ranges are inclusive and never coerce blank or boolean cells into zero", () => {
  const zero = { operator: "between", value: [0, 0] };
  assert.equal(matchesDataFilter(0, zero), true);
  assert.equal(matchesDataFilter("0", zero), true);
  for (const value of [null, undefined, "", " ", false, true, Infinity, NaN]) {
    assert.equal(
      matchesDataFilter(value, zero),
      false,
      `unexpected numeric value ${String(value)}`,
    );
  }
  assert.equal(
    matchesDataFilter(10, { operator: "between", value: [10, 20] }),
    true,
  );
  assert.equal(
    matchesDataFilter(20, { operator: "between", value: [10, 20] }),
    true,
  );
  assert.equal(
    matchesDataFilter(15, { operator: "between", value: [20, 10] }),
    false,
  );
  assert.equal(
    matchesDataFilter(-5, { operator: "between", value: [null, 0] }),
    true,
  );
  assert.equal(matchesDataFilter(5, { operator: "gt", value: 5 }), false);
  assert.equal(matchesDataFilter(5, { operator: "gte", value: 5 }), true);
  assert.equal(matchesDataFilter(5, { operator: "lte", value: 5 }), true);
});

test("date ranges include the whole final UTC day and reject invalid calendar boundaries", () => {
  const range = {
    operator: "dateBetween",
    value: ["2026-10-01", "2026-10-19"],
  };
  assert.equal(isDataFilter(range), true);
  assert.equal(matchesDataFilter("2026-10-19T23:59:59.999Z", range), true);
  assert.equal(
    matchesDataFilter(new Date("2026-10-01T00:00:00Z"), range),
    true,
  );
  assert.equal(matchesDataFilter("2026-10-20T00:00:00Z", range), false);
  assert.equal(matchesDataFilter("2026-09-30", range), false);
  assert.equal(matchesDataFilter("not-a-date", range), false);
  assert.equal(
    matchesDataFilter("2026-02-30", {
      operator: "dateBetween",
      value: ["2026-03-01", "2026-03-03"],
    }),
    false,
  );
  assert.equal(
    isDataFilter({ operator: "dateBetween", value: ["2026-02-29", null] }),
    false,
  );
  assert.equal(
    isDataFilter({ operator: "dateBetween", value: ["2024-02-29", null] }),
    true,
  );
});

const records = [
  {
    id: "c1",
    name: "José Alba",
    status: "active",
    amount: 120,
    joined: "2026-10-01",
  },
  {
    id: "c2",
    name: "Joan Park",
    status: "pending",
    amount: 80,
    joined: "2026-10-19",
  },
  {
    id: "c3",
    name: "José Ruiz",
    status: "closed",
    amount: 160,
    joined: "2026-10-15",
  },
  {
    id: "c4",
    name: "Josef Lee",
    status: "pending",
    amount: 200,
    joined: "2026-09-30",
  },
  {
    id: "c5",
    name: "José Chen",
    status: "pending",
    amount: 140,
    joined: "2026-10-19",
  },
];

test("configured fields use AND between conditions and OR within multi-select", () => {
  const filters = [
    { id: "name", value: { operator: "contains", value: "jose" } },
    { id: "status", value: { operator: "in", value: ["active", "pending"] } },
    { id: "amount", value: { operator: "between", value: [100, 150] } },
    {
      id: "joined",
      value: { operator: "dateBetween", value: ["2026-10-01", "2026-10-19"] },
    },
  ];
  assert.deepEqual(
    filterDataRows(records, filters, (row, id) => row[id]).map((row) => row.id),
    ["c1", "c5"],
  );
  assert.equal(records.length, 5);
  assert.deepEqual(
    filterDataRows(records, [], (row, id) => row[id]),
    records,
  );
});

test("saved column configuration retains false, order and sizes without overlapping pins", () => {
  const columns = normalizeDataTableColumnState({
    visibility: { status: false, name: true, invalid: "false" },
    order: ["amount", "name", "amount", ""],
    sizing: { amount: 220, name: 180, zero: 0, negative: -1, invalid: NaN },
    pinning: { left: ["name", "name"], right: ["name", "amount"] },
  });
  assert.deepEqual(columns, {
    visibility: { name: true, status: false },
    order: ["amount", "name"],
    sizing: { amount: 220, name: 180 },
    pinning: { left: ["name"], right: ["amount"] },
  });
  const cloned = normalizeDataTableColumnState(columns);
  cloned.pinning.left.push("status");
  cloned.visibility.status = true;
  assert.deepEqual(columns.pinning.left, ["name"]);
  assert.equal(columns.visibility.status, false);
});

function tableFixture({
  data = records,
  query = normalizeDataTableQuery(),
  external = false,
  rowCount,
  selection = {},
  columns,
} = {}) {
  let state = {
    globalFilter: query.search,
    columnFilters: query.filters,
    sorting: query.sorting,
    pagination: query.pagination,
    rowSelection: selection,
    columnVisibility: {},
    columnOrder: [],
    columnSizing: {},
    columnPinning: { left: [], right: [] },
  };
  const table = createTable({
    data,
    columns:
      columns ??
      ["name", "status", "amount", "joined"].map((id) => ({
        accessorKey: id,
        header: id,
      })),
    defaultColumn: {
      filterFn: (row, id, value) => matchesDataFilter(row.getValue(id), value),
    },
    state,
    onStateChange: (updater) => {
      state = functionalUpdate(updater, state);
      table.setOptions((previous) => ({ ...previous, state }));
    },
    renderFallbackValue: null,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: external ? undefined : getFilteredRowModel(),
    getSortedRowModel: external ? undefined : getSortedRowModel(),
    getPaginationRowModel: external ? undefined : getPaginationRowModel(),
    manualFiltering: external,
    manualSorting: external,
    manualPagination: external,
    autoResetPageIndex: false,
    rowCount,
    enableRowSelection: true,
  });
  return table;
}

test("real TanStack client models compose typed filtering, sorting and pagination", () => {
  const query = normalizeDataTableQuery({
    filters: [
      { id: "status", value: { operator: "in", value: ["active", "pending"] } },
    ],
    sorting: [{ id: "amount", desc: true }],
    pagination: { pageIndex: 0, pageSize: 2 },
  });
  const table = tableFixture({ query });
  assert.deepEqual(
    table.getFilteredRowModel().rows.map((row) => row.id),
    ["c1", "c2", "c4", "c5"],
  );
  assert.deepEqual(
    table.getRowModel().rows.map((row) => row.id),
    ["c4", "c5"],
  );
  table.nextPage();
  assert.deepEqual(
    table.getRowModel().rows.map((row) => row.id),
    ["c1", "c2"],
  );
  table.setGlobalFilter("Alba");
  table.setPageIndex(0);
  assert.deepEqual(
    table.getRowModel().rows.map((row) => row.id),
    ["c1"],
  );
  table.setColumnFilters([
    { id: "amount", value: { operator: "between", value: [130, 170] } },
  ]);
  table.setGlobalFilter("");
  assert.deepEqual(
    table.getRowModel().rows.map((row) => row.id),
    ["c3", "c5"],
  );
});

test("real TanStack external models preserve the supplied page despite active query and totals", () => {
  const page = [records[4], records[0], records[2]];
  const query = normalizeDataTableQuery({
    search: "deliberately absent",
    filters: [
      { id: "status", value: { operator: "equals", value: "impossible" } },
    ],
    sorting: [{ id: "amount", desc: true }],
    pagination: { pageIndex: 7, pageSize: 2 },
  });
  const table = tableFixture({
    data: page,
    query,
    external: true,
    rowCount: 101,
  });
  assert.deepEqual(
    table.getRowModel().rows.map((row) => row.id),
    ["c5", "c1", "c3"],
  );
  assert.equal(table.getPageCount(), 51);
  assert.equal(table.getCanNextPage(), true);
  table.setPageIndex(50);
  assert.equal(table.getCanNextPage(), false);
  assert.deepEqual(
    table.getRowModel().rows.map((row) => row.id),
    ["c5", "c1", "c3"],
  );
  table.setPageSize(25);
  assert.equal(table.getPageCount(), 5);
  assert.deepEqual(
    table.getRowModel().rows.map((row) => row.id),
    ["c5", "c1", "c3"],
  );
});

test("external selection keeps unloaded IDs while legacy row models expose only known rows", () => {
  const table = tableFixture({
    data: [records[0], records[1]],
    external: true,
    rowCount: 20,
    selection: { unloaded: true },
  });
  table.getRow("c1").toggleSelected(true);
  assert.deepEqual(table.getState().rowSelection, { unloaded: true, c1: true });
  assert.deepEqual(
    table.getFilteredSelectedRowModel().rows.map((row) => row.original.id),
    ["c1"],
  );
  table.toggleAllPageRowsSelected(true);
  assert.deepEqual(table.getState().rowSelection, {
    unloaded: true,
    c1: true,
    c2: true,
  });
  table.toggleAllPageRowsSelected(false);
  assert.deepEqual(table.getState().rowSelection, { unloaded: true });
  table.resetRowSelection();
  assert.deepEqual(table.getState().rowSelection, {});
});

test("real TanStack column controls apply saved visibility, ordering, sizing and pinning", () => {
  const table = tableFixture();
  const config = normalizeDataTableColumnState({
    visibility: { joined: false },
    order: ["amount", "name", "status", "joined"],
    sizing: { amount: 220 },
    pinning: { left: ["name"], right: ["status"] },
  });
  table.setColumnVisibility(config.visibility);
  table.setColumnOrder(config.order);
  table.setColumnSizing(config.sizing);
  table.setColumnPinning(config.pinning);
  assert.deepEqual(
    table.getVisibleLeafColumns().map((column) => column.id),
    ["amount", "name", "status"],
  );
  assert.deepEqual(
    table.getLeftVisibleLeafColumns().map((column) => column.id),
    ["name"],
  );
  assert.deepEqual(
    table.getRightVisibleLeafColumns().map((column) => column.id),
    ["status"],
  );
  assert.deepEqual(
    table.getCenterVisibleLeafColumns().map((column) => column.id),
    ["amount"],
  );
  assert.equal(table.getColumn("amount").getSize(), 220);
});
