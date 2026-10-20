import type {
  IntegrationJob,
  IntegrationRecord,
  IntegrationResult,
} from "../../lib/integrations/contracts";

export type ProductSourceRemovalPhase =
  | "submitted"
  | "pending"
  | "awaiting-status"
  | "deleted"
  | "failed"
  | "request-failed"
  | "unconfirmed";

export type ProductSourceRemoval = {
  sourceId: string;
  name: string;
  phase: ProductSourceRemovalPhase;
  source?: IntegrationRecord;
  job?: IntegrationJob;
  receipt?: Extract<IntegrationResult, { kind: "receipt" }>;
};

export function productReportedRemoval(record: IntegrationRecord) {
  const field = record.fields?.deletionStatus ?? record.fields?.deletionState;
  const status = typeof field === "string" ? field : record.status;
  if (status === "deleted") return "deleted" as const;
  if (
    [
      "deleting",
      "deletion-pending",
      "pending-deletion",
      "delete-pending",
    ].includes(status)
  )
    return "pending" as const;
  if (
    ["deletion-failed", "delete-failed"].includes(status) ||
    (typeof field === "string" && field === "failed")
  )
    return "failed" as const;
  if (typeof field === "string" && field === "pending")
    return "pending" as const;
  return undefined;
}

/**
 * A receipt, vanished source or completed job is not proof of synchronized
 * deletion. Only the requested source's reported state establishes "deleted".
 */
export function productSourceRemovalResult(
  current: ProductSourceRemoval,
  result: IntegrationResult,
): ProductSourceRemoval {
  const next = { ...current };
  const records =
    result.kind === "knowledge"
      ? result.documents
      : result.kind === "records"
        ? result.records
        : result.kind === "record"
          ? [result.record]
          : [];
  const source = records.find((record) => record.id === current.sourceId);
  if (source) {
    next.source = source;
    const phase = productReportedRemoval(source);
    if (phase) next.phase = phase;
  }
  if (
    result.kind === "job" &&
    (!current.job || result.job.id === current.job.id)
  ) {
    next.job = result.job;
    if (next.phase !== "deleted") {
      next.phase =
        result.job.status === "failed"
          ? "failed"
          : ["queued", "running"].includes(result.job.status)
            ? "pending"
            : "awaiting-status";
    }
  }
  if (result.kind === "receipt") {
    next.receipt = result;
    if (next.phase === "submitted") next.phase = "awaiting-status";
  }
  if (current.phase === "deleted") next.phase = "deleted";
  return next;
}
