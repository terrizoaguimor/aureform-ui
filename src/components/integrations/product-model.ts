import type {
  IntegrationAction,
  IntegrationDefinition,
  IntegrationField,
  IntegrationOperationKind,
  IntegrationRecord,
  IntegrationResult,
  IntegrationValues,
  IntegrationWorkbenchProps,
} from "../../lib/integrations/contracts";
import type { DataTableQuery } from "../../lib/data-query";

export function findProductAction(
  definition: IntegrationDefinition,
  ...kinds: IntegrationOperationKind[]
) {
  for (const kind of kinds) {
    const action = definition.actions.find((item) => item.kind === kind);
    if (action) return action;
  }
  return undefined;
}

/** A configuration or permission change discards drafts tied to the old scope. */
export function productScopeKey({
  definition,
  connection,
  scope,
  adapter,
}: IntegrationWorkbenchProps) {
  return JSON.stringify([
    adapter.mode,
    definition.id,
    connection.id,
    connection.providerOptionId,
    connection.workspaceId,
    scope.workspaceId,
    connection.revision,
    connection.status,
    [...connection.resourceIds].sort(),
    [...connection.grantedPermissions].sort(),
  ]);
}

export function defaultActionValues(
  action?: IntegrationAction,
): IntegrationValues {
  return Object.fromEntries(
    (action?.fields ?? []).map((field) => [
      field.id,
      field.type === "toggle"
        ? false
        : field.type === "select"
          ? (field.options?.[0]?.value ?? "")
          : "",
    ]),
  );
}

/** A create recipe must never reuse the selected source record as its target. */
export function productRecordNeedsTarget(action?: IntegrationAction) {
  return (
    action?.kind === "update-record" ||
    (action?.kind === "save-record" &&
      action.fields.some(
        (field) => ["recordId", "id"].includes(field.id) && field.required,
      ))
  );
}

/** Demo reads can start immediately; consumer references remain explicit inputs. */
export function productReadDefaults(
  action: IntegrationAction | undefined,
  props: IntegrationWorkbenchProps,
): IntegrationValues {
  const values = defaultActionValues(action);
  if (props.adapter.mode !== "demo") return values;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  for (const field of action?.fields ?? []) {
    if (!field.required || field.type !== "text") continue;
    if (field.id === "startAt") values[field.id] = start.toISOString();
    else if (field.id === "endAt") values[field.id] = end.toISOString();
    else if (/(?:Id|Ref)$/.test(field.id))
      values[field.id] = props.connection.resourceIds[0] ?? "";
  }
  return values;
}

const resourceFields = new Set([
  "resourceId",
  "resource",
  "sourceId",
  "collectionId",
  "tableId",
  "indexId",
  "channelId",
  "repositoryId",
  "projectId",
  "databaseId",
  "siteId",
]);

/** Explicit values win. A resource binding is always a consumer-authorized ID. */
export function productActionValues(
  action: IntegrationAction | undefined,
  values: IntegrationValues,
  resourceId = "",
): IntegrationValues {
  const output = { ...defaultActionValues(action), ...values };
  if (resourceId) {
    output.resourceId = resourceId;
    for (const field of action?.fields ?? []) {
      if (resourceFields.has(field.id) && !output[field.id]) {
        output[field.id] = resourceId;
      }
    }
  }
  return output;
}

export function invalidProductField(
  action: Pick<IntegrationAction, "fields"> | undefined,
  values: IntegrationValues,
): IntegrationField | undefined {
  return action?.fields.find((field) => {
    const value = values[field.id];
    const empty =
      value === undefined ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && value.length === 0);
    if (empty) return field.required === true;
    if (field.type === "number") {
      return !Number.isFinite(
        typeof value === "number" ? value : Number(value),
      );
    }
    if (field.type === "toggle") return typeof value !== "boolean";
    if (field.type === "select") {
      return !field.options?.some((option) => option.value === value);
    }
    return false;
  });
}

export function parseProductArguments(
  source: string,
): { ok: true; json: string } | { ok: false } {
  function valid(value: unknown, depth = 0): boolean {
    if (depth > 20) return false;
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "boolean"
    )
      return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value))
      return value.every((item) => valid(item, depth + 1));
    if (!value || typeof value !== "object") return false;
    return Object.entries(value).every(
      ([key, item]) =>
        !["__proto__", "constructor", "prototype"].includes(key) &&
        valid(item, depth + 1),
    );
  }
  try {
    const value = JSON.parse(source);
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      !valid(value)
    )
      return { ok: false };
    return { ok: true, json: JSON.stringify(value) };
  } catch {
    return { ok: false };
  }
}

/** The backend applies filters/sorting/page boundaries; the UI never re-pages results. */
export function productQueryValues(
  query: DataTableQuery,
  resourceId = "",
): IntegrationValues {
  const sort = query.sorting[0];
  const status = query.filters.find((filter) => filter.id === "status");
  const filterValue = status?.value;
  return {
    resourceId,
    query: query.search,
    search: query.search,
    filter: typeof filterValue === "string" ? filterValue : "",
    status: typeof filterValue === "string" ? filterValue : "",
    page: query.pagination.pageIndex,
    pageNumber: query.pagination.pageIndex + 1,
    pageIndex: query.pagination.pageIndex,
    pageSize: query.pagination.pageSize,
    limit: query.pagination.pageSize,
    offset: query.pagination.pageIndex * query.pagination.pageSize,
    sort: sort?.id ?? "",
    order: sort?.desc ? "desc" : "asc",
    direction: sort?.desc ? "desc" : "asc",
    filters: JSON.stringify(query.filters),
    sorting: JSON.stringify(query.sorting),
    queryState: JSON.stringify(query),
  };
}

export function mergeProductRecords(
  previous: readonly IntegrationRecord[],
  incoming: readonly IntegrationRecord[],
) {
  const records = new Map(previous.map((record) => [record.id, record]));
  for (const record of incoming) {
    if (!record.id) continue;
    const current = records.get(record.id);
    if (
      current &&
      Number.isFinite(Date.parse(current.updatedAt)) &&
      Number.isFinite(Date.parse(record.updatedAt)) &&
      Date.parse(record.updatedAt) < Date.parse(current.updatedAt)
    ) {
      continue;
    }
    records.set(record.id, record);
  }
  return [...records.values()];
}

export function optimisticProductRecord(
  record: IntegrationRecord,
  values: IntegrationValues,
  marker: string,
): IntegrationRecord {
  return {
    ...record,
    name: typeof values.name === "string" ? values.name : record.name,
    description:
      typeof values.description === "string"
        ? values.description
        : record.description,
    status: typeof values.status === "string" ? values.status : record.status,
    updatedAt: marker,
  };
}

/** Roll back only this mutation, never a newer query or another acknowledged write. */
export function rollbackProductRecord(
  records: readonly IntegrationRecord[],
  original: IntegrationRecord,
  marker: string,
) {
  return records.map((record) =>
    record.id === original.id && record.updatedAt === marker
      ? original
      : record,
  );
}

export function parseProductFields(
  source: string,
):
  | { ok: true; values: IntegrationValues }
  | { ok: false; reason: "json" | "values" } {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return { ok: false, reason: "json" };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "values" };
  }
  const entries = Object.entries(value);
  if (
    entries.some(
      ([key, item]) =>
        ["__proto__", "constructor", "prototype"].includes(key) ||
        !(
          typeof item === "string" ||
          typeof item === "boolean" ||
          (typeof item === "number" && Number.isFinite(item)) ||
          (Array.isArray(item) &&
            item.every((part) => typeof part === "string"))
        ),
    )
  ) {
    return { ok: false, reason: "values" };
  }
  return { ok: true, values: Object.fromEntries(entries) };
}

export function safeProductUrl(value?: string) {
  if (!value) return undefined;
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return value;
  }
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function productSearchSegments(text: string, query: string) {
  const term = query.trim();
  if (!term) return [{ text, match: false }];
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .split(new RegExp(`(${escaped})`, "ig"))
    .filter(Boolean)
    .map((part) => ({
      text: part,
      match: part.toLocaleLowerCase() === term.toLocaleLowerCase(),
    }));
}

export function productMapLocations(
  result: Extract<IntegrationResult, { kind: "map" }>,
) {
  const seen = new Set<string>();
  return result.locations.filter((location) => {
    if (
      !location.id ||
      seen.has(location.id) ||
      !Number.isFinite(location.latitude) ||
      !Number.isFinite(location.longitude) ||
      Math.abs(location.latitude) > 90 ||
      Math.abs(location.longitude) > 180
    ) {
      return false;
    }
    seen.add(location.id);
    return true;
  });
}

export type ProductFieldMapping = { source: string; target: string };
export function validProductMapping(mapping: readonly ProductFieldMapping[]) {
  const targets = new Set<string>();
  return (
    mapping.length > 0 &&
    mapping.every(({ source, target }) => {
      if (
        !source.trim() ||
        !target.trim() ||
        targets.has(target) ||
        ["__proto__", "constructor", "prototype"].includes(target)
      ) {
        return false;
      }
      targets.add(target);
      return true;
    })
  );
}

export function mapProductRecord(
  record: IntegrationRecord,
  mapping: readonly ProductFieldMapping[],
): IntegrationValues {
  const fields: IntegrationValues = {
    ...record.fields,
    id: record.id,
    name: record.name,
    title: record.name,
    status: record.status,
    description: record.description,
    type: record.type,
    updatedAt: record.updatedAt,
  };
  return Object.fromEntries(
    mapping
      .filter(
        ({ source, target }) =>
          source in fields &&
          !["__proto__", "constructor", "prototype"].includes(target),
      )
      .map(({ source, target }) => [target, fields[source]]),
  );
}

/** Only declarative primitive input fields are read; schema code is never evaluated. */
export function productToolFields(
  record?: IntegrationRecord,
): IntegrationField[] {
  const source = record?.fields?.inputSchema ?? record?.fields?.schema;
  if (typeof source !== "string" || source.length > 50_000) return [];
  try {
    const schema = JSON.parse(source);
    if (
      !schema ||
      typeof schema !== "object" ||
      !schema.properties ||
      typeof schema.properties !== "object"
    )
      return [];
    const required = new Set(
      Array.isArray(schema.required) ? schema.required : [],
    );
    return Object.entries(schema.properties)
      .filter(([id]) => !["__proto__", "constructor", "prototype"].includes(id))
      .flatMap(([id, value]) => {
        if (!value || typeof value !== "object") return [];
        const property = value as {
          title?: string;
          description?: string;
          type?: string;
          enum?: unknown[];
        };
        if (
          !["string", "number", "integer", "boolean"].includes(
            property.type ?? "",
          )
        )
          return [];
        const title = typeof property.title === "string" ? property.title : id;
        const options = Array.isArray(property.enum)
          ? property.enum
              .filter((item): item is string => typeof item === "string")
              .map((item) => ({ value: item, label: { en: item, es: item } }))
          : [];
        return [
          {
            id,
            label: { en: title, es: title },
            description:
              typeof property.description === "string"
                ? { en: property.description, es: property.description }
                : undefined,
            type: options.length
              ? "select"
              : property.type === "boolean"
                ? "toggle"
                : ["number", "integer"].includes(property.type ?? "")
                  ? "number"
                  : "text",
            options: options.length ? options : undefined,
            required: required.has(id),
          } satisfies IntegrationField,
        ];
      });
  } catch {
    return [];
  }
}
