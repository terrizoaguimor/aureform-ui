import type { Customer } from "./dashboard-data";
import {
  filterDataRows,
  normalizeDataTableQuery,
  type DataTableQuery,
} from "../lib/data-query";

export const customerColumnIds = [
  "name", "email", "company", "plan", "status", "amount", "joined",
] as const;
export type CustomerPage = {
  rows: Customer[];
  total: number;
  query: DataTableQuery;
};
const fold = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** The complete matching set is also used for exports; it is never truncated to one page. */
export function matchingCustomers(
  source: readonly Customer[],
  input: DataTableQuery,
): Customer[] {
  const query = normalizeDataTableQuery(input, { columnIds: customerColumnIds, pageSize: 5, maxPageSize: 100 });
  const words = fold(query.search).trim().split(/\s+/).filter(Boolean);
  const filtered = filterDataRows(source, query.filters, (row, field) =>
    Object.hasOwn(row, field) ? row[field as keyof Customer] : undefined,
  ).filter((row) => words.every((word) => fold(`${row.name} ${row.email} ${row.company} ${row.plan} ${row.status}`).includes(word)));
  const indexed = filtered.map((row, index) => ({ row, index }));
  indexed.sort((left, right) => {
    for (const sort of query.sorting) {
      const a = left.row[sort.id as keyof Customer];
      const b = right.row[sort.id as keyof Customer];
      const comparison = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
      if (comparison) return sort.desc ? -comparison : comparison;
    }
    return left.index - right.index;
  });
  return indexed.map(({ row }) => row);
}

/** Provider-neutral query behavior for the browser demo; no network request. */
export function queryCustomers(source: readonly Customer[], input: DataTableQuery): CustomerPage {
  const query = normalizeDataTableQuery(input, { columnIds: customerColumnIds, pageSize: 5, maxPageSize: 100 });
  const matches = matchingCustomers(source, query);
  const total = matches.length;
  const maximumPage = Math.max(0, Math.ceil(total / query.pagination.pageSize) - 1);
  const pageIndex = Math.min(query.pagination.pageIndex, maximumPage);
  const normalized = { ...query, pagination: { ...query.pagination, pageIndex } };
  const start = pageIndex * query.pagination.pageSize;
  return { rows: matches.slice(start, start + query.pagination.pageSize), total, query: normalized };
}

export async function loadDemoCustomerPage(
  source: readonly Customer[],
  query: DataTableQuery,
  { signal, delay = 180, fail = false }: { signal: AbortSignal; delay?: number; fail?: boolean },
): Promise<CustomerPage> {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, Math.max(0, delay));
    signal.addEventListener("abort", cancel, { once: true });
  });
  signal.throwIfAborted();
  if (fail) throw new Error("demo-load-failed");
  return queryCustomers(source, query);
}
