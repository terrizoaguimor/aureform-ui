import type {
  IntegrationConnection,
  IntegrationRecord,
  IntegrationResult,
  IntegrationUpdate,
} from "../../lib/integrations/contracts";
import type { DataTableQuery } from "../../lib/data-query";

export type ProductDataUpdate =
  | { kind: "ignore" }
  | { kind: "scope-changed" }
  | { kind: "rows"; records: IntegrationRecord[] };

/**
 * Connection-wide result DTOs carry no query/page identity. They identify when
 * remote membership, sorting and totals need revalidation with the current query.
 */
export function productDataUpdate(
  update: IntegrationUpdate,
  connection: IntegrationConnection,
  resourceId: string,
): ProductDataUpdate {
  if (
    connection.status !== "connected" ||
    !connection.resourceIds.includes(resourceId)
  )
    return { kind: "ignore" };
  if (update.kind === "connection") {
    const next = update.connection;
    if (
      next.id !== connection.id ||
      next.integrationId !== connection.integrationId ||
      next.workspaceId !== connection.workspaceId
    )
      return { kind: "ignore" };
    const scope = (item: IntegrationConnection) =>
      JSON.stringify([
        item.status,
        item.providerOptionId,
        item.revision,
        [...item.resourceIds].sort(),
        [...item.grantedPermissions].sort(),
      ]);
    return scope(next) === scope(connection)
      ? { kind: "ignore" }
      : { kind: "scope-changed" };
  }
  if (update.kind !== "result") return { kind: "ignore" };
  const result = update.result;
  const records =
    result.kind === "record"
      ? [result.record]
      : result.kind === "records"
        ? result.records
        : undefined;
  if (!records) return { kind: "ignore" };
  const matching: IntegrationRecord[] = [];
  let unspecifiedResource = records.length === 0;
  let otherAuthorizedResource = false;
  for (const record of records) {
    const fields = record.fields ?? {};
    if (
      (fields.workspaceId !== undefined &&
        fields.workspaceId !== connection.workspaceId) ||
      (fields.connectionId !== undefined &&
        fields.connectionId !== connection.id) ||
      (fields.integrationId !== undefined &&
        fields.integrationId !== connection.integrationId)
    )
      continue;
    if (fields.resourceId === undefined) {
      unspecifiedResource = true;
      continue;
    }
    if (fields.resourceId === resourceId) matching.push(record);
    else if (
      typeof fields.resourceId === "string" &&
      connection.resourceIds.includes(fields.resourceId)
    )
      otherAuthorizedResource = true;
  }
  // An authenticated query can join several granted resources. A broad event
  // may invalidate that membership, but never identifies the current page.
  return matching.length || unspecifiedResource || otherAuthorizedResource
    ? { kind: "rows", records: matching }
    : { kind: "ignore" };
}

/** Prevent a slower query from replacing rows invalidated by a live update. */
export function createProductDataEpoch() {
  let value = 0;
  return {
    invalidate() {
      value += 1;
    },
    capture() {
      return value;
    },
    isCurrent(snapshot: number) {
      return snapshot === value;
    },
  };
}

/** Only a subscription bound to this exact server query may replace its page. */
export function productReportedDataPage(
  result: IntegrationResult,
  connection: IntegrationConnection,
  resourceId: string,
  query: DataTableQuery,
) {
  if (
    result.kind !== "records" ||
    connection.status !== "connected" ||
    !connection.resourceIds.includes(resourceId) ||
    result.records.length > query.pagination.pageSize ||
    result.total < result.records.length ||
    new Set(result.records.map((record) => record.id)).size !==
      result.records.length
  )
    return undefined;
  if (
    result.records.some((record) => {
      const fields = record.fields ?? {};
      return (
        (fields.workspaceId !== undefined &&
          fields.workspaceId !== connection.workspaceId) ||
        (fields.connectionId !== undefined &&
          fields.connectionId !== connection.id) ||
        (fields.integrationId !== undefined &&
          fields.integrationId !== connection.integrationId) ||
        (fields.resourceId !== undefined &&
          (typeof fields.resourceId !== "string" ||
            !connection.resourceIds.includes(fields.resourceId)))
      );
    })
  )
    return undefined;
  return result;
}
