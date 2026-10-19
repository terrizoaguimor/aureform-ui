import {
  normalizeDataTableColumnState,
  normalizeDataTableQuery,
  type DataTableColumnState,
  type DataTableQuery,
} from "./data-query";

export type DataView = {
  query: DataTableQuery;
  columns: DataTableColumnState;
  density: "comfortable" | "compact";
};

/** URL and browser storage are inputs, never trusted table state. */
export function normalizeDataView(value: unknown, columnIds: readonly string[]): DataView {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const columns = normalizeDataTableColumnState(input.columns);
  const allowed = new Set([...columnIds, "select", "actions"]);
  return {
    query: normalizeDataTableQuery(input.query, { columnIds, pageSize: 5, maxPageSize: 100 }),
    columns: {
      visibility: Object.fromEntries(Object.entries(columns.visibility).filter(([id]) => allowed.has(id))),
      order: columns.order.filter((id) => allowed.has(id)),
      sizing: Object.fromEntries(Object.entries(columns.sizing).filter(([id]) => allowed.has(id))),
      pinning: {
        left: columns.pinning.left?.filter((id) => allowed.has(id)),
        right: columns.pinning.right?.filter((id) => allowed.has(id)),
      },
    },
    density: input.density === "compact" ? "compact" : "comfortable",
  };
}

export function serializeDataView(value: unknown, columnIds: readonly string[]): string {
  return JSON.stringify({ version: 1, value: normalizeDataView(value, columnIds) });
}

export function parseDataView(source: string | null | undefined, columnIds: readonly string[]): DataView | null {
  if (!source || source.length > 12000) return null;
  try {
    const input = JSON.parse(source);
    if (!input || input.version !== 1 || !input.value || typeof input.value !== "object") return null;
    return normalizeDataView(input.value, columnIds);
  } catch {
    return null;
  }
}
