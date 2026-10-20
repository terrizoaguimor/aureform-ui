import type {
  IntegrationAction,
  IntegrationRecord,
  IntegrationResult,
  IntegrationText,
  IntegrationValues,
} from "@/lib/integrations/contracts";

export type ConnectorTransitionChoice = {
  value: string;
  label: IntegrationText;
};

export type ConnectorComparisonRow = {
  id: string;
  label: IntegrationText;
  before: IntegrationValues[string] | undefined;
  remote: IntegrationValues[string] | undefined;
  draft: IntegrationValues[string] | undefined;
};

const validChoice = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 2000 &&
  value === value.trim() &&
  !/[\u0000-\u001f\u007f]/.test(value);

/**
 * A record's explicit allowlist takes precedence, including an empty list.
 * Otherwise use the transition field's declared options. No Jira status names
 * or provider transition IDs are synthesized by the frontend.
 */
export function connectorTransitionChoices(
  action: IntegrationAction | undefined,
  record?: IntegrationRecord,
): ConnectorTransitionChoice[] {
  const reported =
    record?.fields?.allowedTransitionIds ?? record?.fields?.allowedTransitions;
  if (reported !== undefined) {
    if (!Array.isArray(reported) || !reported.every(validChoice)) return [];
    const labels = record?.fields?.allowedTransitionLabels;
    return [...new Set(reported)].map((value) => {
      const index = reported.indexOf(value);
      const label =
        Array.isArray(labels) && validChoice(labels[index])
          ? labels[index]
          : value;
      return { value, label: { en: label, es: label } };
    });
  }
  const field = action?.fields.find((item) => item.id === "transitionId");
  const seen = new Set<string>();
  return (field?.options ?? [])
    .filter((option) => {
      if (!validChoice(option.value) || seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    })
    .map((option) => ({ value: option.value, label: option.label }));
}

/** Only an issue snapshot or explicitly typed transition rows supply choices. */
export function connectorReportedTransitionChoices(
  result: IntegrationResult,
  issue: IntegrationRecord,
): ConnectorTransitionChoice[] {
  const records =
    result.kind === "records"
      ? result.records
      : result.kind === "record"
        ? [result.record]
        : [];
  const snapshot = records.find(
    (record) =>
      record.id === issue.id &&
      (record.fields?.allowedTransitionIds !== undefined ||
        record.fields?.allowedTransitions !== undefined),
  );
  if (snapshot) return connectorTransitionChoices(undefined, snapshot);
  const seen = new Set<string>();
  return records.flatMap((record) => {
    if (!["jira-transition", "transition"].includes(record.type)) return [];
    const subject = record.fields?.recordId ?? record.fields?.issueId;
    if (subject !== undefined && subject !== issue.id) return [];
    const value = record.fields?.transitionId ?? record.id;
    if (!validChoice(value) || seen.has(value)) return [];
    seen.add(value);
    const label = validChoice(record.name) ? record.name : value;
    return [{ value, label: { en: label, es: label } }];
  });
}

function branchField(
  action: IntegrationAction | undefined,
  role: "base" | "head",
) {
  const names =
    role === "base"
      ? ["base", "baseBranch", "baseRef", "targetBranch"]
      : ["head", "headBranch", "headRef", "sourceBranch"];
  return action?.fields.find((field) => names.includes(field.id));
}

export function connectorPullRequestProblem(
  action: IntegrationAction | undefined,
  values: IntegrationValues,
): IntegrationText | null {
  if (action?.kind !== "create-pull-request") return null;
  const base = values[branchField(action, "base")?.id ?? "base"];
  const head = values[branchField(action, "head")?.id ?? "head"];
  if (
    typeof base !== "string" ||
    !base.trim() ||
    typeof head !== "string" ||
    !head.trim()
  )
    return {
      en: "Choose a base branch and a head branch.",
      es: "Elige una rama base y una rama de origen.",
    };
  if (
    base.trim() === head.trim() &&
    !(
      typeof values.headRepositoryRef === "string" &&
      values.headRepositoryRef.trim()
    )
  )
    return {
      en: "Choose different base and head branches.",
      es: "Elige ramas base y de origen diferentes.",
    };
  return null;
}

export function connectorTransitionFieldsProblem(
  values: IntegrationValues,
): IntegrationText | null {
  if (values.fields === undefined || values.fields === "") return null;
  try {
    if (typeof values.fields !== "string") throw new Error("Invalid fields");
    const parsed: unknown = JSON.parse(values.fields);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      Object.entries(parsed).some(
        ([key, value]) =>
          ["__proto__", "constructor", "prototype"].includes(key) ||
          !(
            typeof value === "string" ||
            typeof value === "boolean" ||
            (typeof value === "number" && Number.isFinite(value)) ||
            (Array.isArray(value) &&
              value.every((item) => typeof item === "string"))
          ),
      )
    )
      throw new Error("Invalid fields");
    return null;
  } catch {
    return {
      en: "Enter transition fields as a JSON object of text, numbers, booleans or text lists. The backend validates the issue’s required fields.",
      es: "Introduce campos de transición como un objeto JSON de texto, números, booleanos o listas de texto. El backend valida los campos requeridos de la incidencia.",
    };
  }
}

/** Domain writes retain declared fields without clearing unrelated issue data. */
export function connectorDomainValues(
  action: IntegrationAction,
  values: IntegrationValues,
  resourceId: string,
  record?: IntegrationRecord,
): IntegrationValues {
  const declared = Object.fromEntries(
    action.fields
      .filter((field) => values[field.id] !== undefined)
      .map((field) => [field.id, values[field.id]]),
  );
  if (["transition-issue", "update-record"].includes(action.kind))
    return {
      ...declared,
      resourceId,
      recordId: record?.id ?? "",
      ...(action.fields.some((field) => field.id === "id")
        ? { id: record?.id ?? "" }
        : {}),
      ...(action.kind === "transition-issue"
        ? {
            transitionId:
              typeof values.transitionId === "string"
                ? values.transitionId
                : "",
          }
        : {}),
      ...(record ? { expectedUpdatedAt: record.updatedAt } : {}),
    };
  return { ...declared, resourceId };
}

/** A scoped refresh must identify the reviewed record, never a nearby row. */
export function connectorTargetRecord(
  result: IntegrationResult,
  recordId: string,
  resourceId: string,
): IntegrationRecord | undefined {
  const records =
    result.kind === "records"
      ? result.records
      : result.kind === "record"
        ? [result.record]
        : [];
  const record = records.find((item) => item.id === recordId);
  if (
    !record ||
    (record.fields?.resourceId !== undefined &&
      record.fields.resourceId !== resourceId)
  )
    return undefined;
  return structuredClone(record);
}

/** Capture the action, draft and actual remote revision independently. */
export function connectorReviewSnapshot(
  action: IntegrationAction,
  values: IntegrationValues,
  target?: IntegrationRecord,
) {
  const snapshot = structuredClone({
    action,
    values,
    ...(target ? { target } : {}),
  });
  if (target) snapshot.values.expectedUpdatedAt = snapshot.target!.updatedAt;
  return snapshot;
}

function recordField(
  record: IntegrationRecord,
  id: string,
): IntegrationValues[string] | undefined {
  if (record.fields?.[id] !== undefined) return record.fields[id];
  if (["name", "title", "subject"].includes(id)) return record.name;
  if (["description", "body", "content", "message"].includes(id))
    return record.description;
  if (id === "status") return record.status;
  return undefined;
}

export function connectorComparisonRows(
  action: IntegrationAction,
  before: IntegrationRecord,
  remote: IntegrationRecord | undefined,
  draft: IntegrationValues,
): ConnectorComparisonRow[] {
  const reference = action.fields.find((field) =>
    ["propertyRef", "fieldRef"].includes(field.id),
  );
  const referenced =
    reference && typeof draft[reference.id] === "string"
      ? String(draft[reference.id])
      : "";
  const propertyValue = (record: IntegrationRecord) =>
    recordField(record, referenced) ??
    (reference && record.fields?.[reference.id] === referenced
      ? record.fields?.value
      : undefined);
  return action.fields
    .filter(
      (field) =>
        ![
          "recordId",
          "id",
          "issueKey",
          "expectedUpdatedAt",
          "resourceId",
          "resourceIds",
          "sourceId",
          "destinationId",
        ].includes(field.id),
    )
    .map((field) => {
      const property = field.id === "value" && referenced;
      return {
        id: field.id,
        label: property
          ? {
              en: `${field.label.en} · ${referenced}`,
              es: `${field.label.es} · ${referenced}`,
            }
          : field.label,
        before: property
          ? propertyValue(before)
          : recordField(before, field.id),
        remote: remote
          ? property
            ? propertyValue(remote)
            : recordField(remote, field.id)
          : undefined,
        draft: draft[field.id],
      };
    });
}
