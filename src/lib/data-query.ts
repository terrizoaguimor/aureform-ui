import type {
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

/** Serializable table state. Filtering, sorting and pagination belong to the data owner in external mode. */
export type DataTableQuery = {
  search: string;
  filters: ColumnFiltersState;
  sorting: SortingState;
  pagination: PaginationState;
};

/** Separate from DataTable's existing `columnVisibility` menu flag. */
export type DataTableColumnState = {
  visibility: VisibilityState;
  order: ColumnOrderState;
  sizing: ColumnSizingState;
  pinning: ColumnPinningState;
};

export type DataFilterScalar = string | number | boolean | null;
export type DataFilter =
  | { operator: "contains" | "startsWith"; value: string }
  | { operator: "equals" | "notEquals"; value: DataFilterScalar }
  | { operator: "in" | "notIn"; value: DataFilterScalar[] }
  | { operator: "gt" | "gte" | "lt" | "lte"; value: number }
  | { operator: "between"; value: [number | null, number | null] }
  | { operator: "dateBetween"; value: [string | null, string | null] }
  | { operator: "isEmpty" | "isNotEmpty" };

type JsonValue = DataFilterScalar | JsonValue[] | { [key: string]: JsonValue };

export type DataQueryNormalizationOptions = {
  pageSize?: number;
  maxPageSize?: number;
  columnIds?: readonly string[];
};

function record(value: unknown): Record<string, unknown> | undefined {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function jsonValue(value: unknown, depth = 0): JsonValue | undefined {
  if (depth > 12) return undefined;
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    const values = value.map((item) => jsonValue(item, depth + 1));
    return values.some((item) => item === undefined)
      ? undefined
      : (values as JsonValue[]);
  }
  const object = record(value);
  if (!object) return undefined;
  const entries = Object.keys(object)
    .sort()
    .map((key) => [key, jsonValue(object[key], depth + 1)] as const);
  return entries.some(([, item]) => item === undefined)
    ? undefined
    : (Object.fromEntries(entries) as { [key: string]: JsonValue });
}

function integer(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER,
) {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  return Number.isFinite(number)
    ? Math.min(maximum, Math.max(minimum, Math.trunc(number)))
    : fallback;
}

function scalar(value: unknown): value is DataFilterScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function dateDay(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return undefined;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp
    : undefined;
}

export function isDataFilter(value: unknown): value is DataFilter {
  const filter = record(value);
  if (!filter) return false;
  switch (filter.operator) {
    case "contains":
    case "startsWith":
      return typeof filter.value === "string";
    case "equals":
    case "notEquals":
      return scalar(filter.value);
    case "in":
    case "notIn":
      return Array.isArray(filter.value) && filter.value.every(scalar);
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return typeof filter.value === "number" && Number.isFinite(filter.value);
    case "between":
      return (
        Array.isArray(filter.value) &&
        filter.value.length === 2 &&
        filter.value.every(
          (bound) =>
            bound === null ||
            (typeof bound === "number" && Number.isFinite(bound)),
        )
      );
    case "dateBetween":
      return (
        Array.isArray(filter.value) &&
        filter.value.length === 2 &&
        filter.value.every(
          (bound) => bound === null || dateDay(bound) !== undefined,
        )
      );
    case "isEmpty":
    case "isNotEmpty":
      return true;
    default:
      return false;
  }
}

function emptyFilter(value: unknown) {
  if (value === undefined || value === "") return true;
  if (!isDataFilter(value)) return Array.isArray(value) && value.length === 0;
  if (value.operator === "contains" || value.operator === "startsWith")
    return value.value === "";
  if (value.operator === "in" || value.operator === "notIn")
    return value.value.length === 0;
  if (value.operator === "between" || value.operator === "dateBetween") {
    return value.value.every((bound) => bound === null);
  }
  return false;
}

export function normalizeDataTableQuery(
  value: unknown = {},
  options: DataQueryNormalizationOptions = {},
): DataTableQuery {
  const input = record(value) ?? {};
  const allowed = options.columnIds ? new Set(options.columnIds) : undefined;
  const id = (value: unknown) =>
    typeof value === "string" &&
    value.trim() &&
    (!allowed || allowed.has(value))
      ? value
      : undefined;
  const filters = new Map<string, JsonValue>();
  for (const item of Array.isArray(input.filters) ? input.filters : []) {
    const filter = record(item),
      columnId = id(filter?.id);
    if (!filter || !columnId) continue;
    const normalized = jsonValue(filter.value);
    if (
      emptyFilter(normalized) ||
      (record(normalized)?.operator !== undefined && !isDataFilter(normalized))
    ) {
      filters.delete(columnId);
    } else if (normalized !== undefined) {
      filters.set(columnId, normalized);
    }
  }
  const sorting = new Map<string, { id: string; desc: boolean }>();
  for (const item of Array.isArray(input.sorting) ? input.sorting : []) {
    const sort = record(item),
      columnId = id(sort?.id);
    if (columnId)
      sorting.set(columnId, { id: columnId, desc: sort?.desc === true });
  }
  const pagination = record(input.pagination) ?? {};
  const maximum = integer(options.maxPageSize, Number.MAX_SAFE_INTEGER, 1);
  const fallbackSize = integer(options.pageSize, 5, 1, maximum);
  return {
    // Preserve spaces while typing. Trimming controlled input state loses word separators.
    search: typeof input.search === "string" ? input.search : "",
    filters: [...filters]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([id, value]) => ({ id, value })),
    // Multi-sort precedence is ordered, unlike AND filters.
    sorting: [...sorting.values()],
    pagination: {
      pageIndex: integer(pagination.pageIndex, 0, 0),
      pageSize: integer(pagination.pageSize, fallbackSize, 1, maximum),
    },
  };
}

export function serializeDataTableQuery(query: DataTableQuery): string {
  return JSON.stringify({ version: 1, query: normalizeDataTableQuery(query) });
}

export function parseDataTableQuery(
  source: string | null | undefined,
  options: DataQueryNormalizationOptions = {},
): DataTableQuery {
  if (!source) return normalizeDataTableQuery({}, options);
  try {
    const input = record(JSON.parse(source));
    return input?.version === 1
      ? normalizeDataTableQuery(input.query, options)
      : normalizeDataTableQuery({}, options);
  } catch {
    return normalizeDataTableQuery({}, options);
  }
}

export function normalizeDataTableColumnState(
  value: Partial<DataTableColumnState> | unknown = {},
): DataTableColumnState {
  const input = record(value) ?? {};
  const visibility = record(input.visibility) ?? {},
    sizing = record(input.sizing) ?? {};
  const ids = (value: unknown) => [
    ...new Set(
      (Array.isArray(value) ? value : []).filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      ),
    ),
  ];
  const pinning = record(input.pinning) ?? {},
    left = ids(pinning.left);
  return {
    visibility: Object.fromEntries(
      Object.entries(visibility)
        .filter(([, visible]) => typeof visible === "boolean")
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ) as VisibilityState,
    order: ids(input.order),
    sizing: Object.fromEntries(
      Object.entries(sizing)
        .filter(
          ([, size]) =>
            typeof size === "number" && Number.isFinite(size) && size > 0,
        )
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    ) as ColumnSizingState,
    pinning: {
      left,
      right: ids(pinning.right).filter((id) => !left.includes(id)),
    },
  };
}

function fold(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function numeric(value: unknown): number | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/** AND across columns; `in` is OR within one field. No implicit conversion of empty cells to zero. */
export function matchesDataFilter(value: unknown, filter: unknown): boolean {
  if (emptyFilter(filter)) return true;
  if (!isDataFilter(filter)) {
    if (Array.isArray(filter))
      return filter.some((item) => Object.is(item, value));
    return typeof filter === "string"
      ? fold(value).includes(fold(filter))
      : Object.is(value, filter);
  }
  switch (filter.operator) {
    case "contains":
      return fold(value).includes(fold(filter.value));
    case "startsWith":
      return fold(value).startsWith(fold(filter.value));
    case "equals":
      return Object.is(value, filter.value);
    case "notEquals":
      return !Object.is(value, filter.value);
    case "in":
      return filter.value.some((item) => Object.is(item, value));
    case "notIn":
      return !filter.value.some((item) => Object.is(item, value));
    case "isEmpty":
      return (
        value === null ||
        value === undefined ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      );
    case "isNotEmpty":
      return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        (!Array.isArray(value) || value.length > 0)
      );
    case "dateBetween": {
      const timestamp =
        value instanceof Date
          ? value.getTime()
          : typeof value === "string"
            ? value.length === 10
              ? (dateDay(value) ?? NaN)
              : Date.parse(value)
            : NaN;
      const [from, to] = filter.value;
      return (
        Number.isFinite(timestamp) &&
        (from === null || timestamp >= dateDay(from)!) &&
        (to === null || timestamp < dateDay(to)! + 86_400_000)
      );
    }
    default: {
      const number = numeric(value);
      if (number === undefined) return false;
      if (filter.operator === "between") {
        const [from, to] = filter.value;
        return (
          (from === null || number >= from) && (to === null || number <= to)
        );
      }
      if (filter.operator === "gt") return number > filter.value;
      if (filter.operator === "gte") return number >= filter.value;
      if (filter.operator === "lt") return number < filter.value;
      return number <= filter.value;
    }
  }
}

export function filterDataRows<T>(
  rows: readonly T[],
  filters: ColumnFiltersState,
  getValue: (row: T, columnId: string) => unknown,
): T[] {
  return rows.filter((row) =>
    filters.every((filter) =>
      matchesDataFilter(getValue(row, filter.id), filter.value),
    ),
  );
}
