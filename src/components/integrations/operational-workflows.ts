import type {
  IntegrationAction,
  IntegrationJob,
  IntegrationResult,
  IntegrationValues,
} from "@/lib/integrations/contracts";

type WorkflowHistory = {
  action: IntegrationAction;
  values: IntegrationValues;
  result: IntegrationResult;
};

/**
 * A retry is a new reviewed request using this session's declared inputs.
 * A run ID never substitutes for an unknown workflow/scenario reference.
 */
export function operationalWorkflowRetry(
  action: IntegrationAction | null,
  job: IntegrationJob,
  history: readonly WorkflowHistory[],
) {
  if (
    !action ||
    action.kind !== "trigger-workflow" ||
    !["failed", "cancelled"].includes(job.status)
  )
    return null;
  const original = history.find(
    (entry) =>
      entry.action.kind === "trigger-workflow" &&
      entry.action.id === action.id &&
      entry.result.kind === "job" &&
      entry.result.job.id === job.id,
  );
  if (!original) return null;
  const values: IntegrationValues = {};
  for (const field of action.fields) {
    if (
      /api.?key|token|secret|password|authorization|credential|cookie|private.?key/i.test(
        field.id,
      )
    )
      continue;
    const value = original.values[field.id];
    if (value === undefined) continue;
    values[field.id] = Array.isArray(value) ? [...value] : value;
  }
  return { action, values, sourceRunId: job.id, review: true as const };
}

function reportedText(value: unknown, max: number) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= max &&
    !/[\u0000-\u001f\u007f]/.test(value)
    ? value.trim()
    : null;
}

/** Missing metadata is unknown, not the signed-in user or connection account. */
export function reportedWorkflowMetadata(job: {
  id: string;
  owner?: unknown;
  accounts?: unknown;
  templateUrl?: unknown;
  templateName?: unknown;
}) {
  const reference = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const object = value as Record<string, unknown>;
    const id = reportedText(object.id, 200);
    const name = reportedText(object.name, 300);
    return id ? { id, name: name ?? id } : null;
  };
  const reportedAccounts = Array.isArray(job.accounts)
    ? job.accounts.map((value: unknown) => {
        const account = reference(value);
        const status =
          value && typeof value === "object"
            ? (value as Record<string, unknown>).status
            : undefined;
        return account &&
          typeof status === "string" &&
          ["connected", "expired", "revoked", "unknown"].includes(status)
          ? {
              ...account,
              status: status as "connected" | "expired" | "revoked" | "unknown",
            }
          : null;
      })
    : null;
  const accounts =
    reportedAccounts &&
    reportedAccounts.length <= 100 &&
    reportedAccounts.every((value) => value !== null)
      ? reportedAccounts.filter((value) => value !== null)
      : null;
  return {
    owner: reference(job.owner),
    accounts,
    templateUrl: reportedText(job.templateUrl, 8192),
    templateName: reportedText(job.templateName, 300),
  };
}

export function operationalWorkflowAccountStatus(
  status: "connected" | "expired" | "revoked" | "unknown",
): readonly [string, string] {
  const labels = {
    connected: ["Connected", "Conectada"],
    expired: ["Expired", "Caducada"],
    revoked: ["Revoked", "Revocada"],
    unknown: ["Unknown", "Desconocida"],
  } as const;
  return labels[status];
}

/** Public discovery links only; these neither create nor activate automations. */
export function operationalWorkflowTemplateCatalog(providerId: string) {
  if (providerId === "make")
    return {
      provider: "Make",
      url: "https://www.make.com/templates",
    };
  if (providerId === "zapier")
    return {
      provider: "Zapier",
      url: "https://zapier.com/templates",
    };
  return null;
}
