import type {
  IntegrationAction,
  IntegrationDefinition,
  IntegrationRecord,
  IntegrationResult,
  IntegrationValue,
  IntegrationValues,
} from "@/lib/integrations/contracts";

export type OperationalFieldRole =
  | "recipient"
  | "subject"
  | "content"
  | "template"
  | "variables"
  | "mapping"
  | "target"
  | "name"
  | "enabled";

const roles: Record<OperationalFieldRole, RegExp> = {
  recipient: /recipient|(^|[\s_-])to($|[\s_-])|email address|destinatario/i,
  subject: /subject|asunto/i,
  content: /body|content|message|payload|cuerpo|contenido|mensaje/i,
  template: /template|plantilla/i,
  variables: /variables|parameters|parámetros/i,
  mapping: /mapping|field.?map|mapeo|correspondencia/i,
  target:
    /(^|[\s_-])(id|target|resource|job|flag|workflow|record|notification)(id|[\s_-]|$)|identifier/i,
  name: /(^|[\s_-])(name|title|nombre|título)($|[\s_-])/i,
  enabled: /enabled|active|read|consent|habilitado|activo|leído/i,
};

export function operationalAction(
  definition: IntegrationDefinition,
  ...kinds: IntegrationAction["kind"][]
) {
  for (const kind of kinds) {
    const action = definition.actions.find((item) => item.kind === kind);
    if (action) return action;
  }
  return null;
}

export function operationalPermitted(
  action: IntegrationAction | null,
  permissions: readonly string[],
) {
  return Boolean(
    action &&
    action.requiredPermissions?.every((permission) =>
      permissions.includes(permission),
    ) !== false,
  );
}

export function operationalDefaultQuery(
  definition: IntegrationDefinition,
  resourceIds: readonly string[],
  permissions: readonly string[],
) {
  const queries = definition.actions.filter(
    (action) => action.kind === "query",
  );
  return (
    queries.find(
      (action) =>
        operationalPermitted(action, permissions) &&
        !Object.keys(
          validateOperationalValues(
            action,
            scopedOperationalValues(action, resourceIds),
          ),
        ).length,
    ) ??
    queries.find((action) => operationalPermitted(action, permissions)) ??
    queries[0] ??
    null
  );
}

export function operationalSensitiveField(name: string) {
  return /api.?key|access.?token|refresh.?token|id.?token|secret|password|authorization|credential|cookie|private.?key/i.test(
    name,
  );
}

export function operationalField(
  action: IntegrationAction | null,
  role: OperationalFieldRole,
) {
  const candidates = action?.fields.filter(
    (field) =>
      !operationalSensitiveField(field.id) &&
      roles[role].test(
        `${field.id.replace(/([a-z])([A-Z])/g, "$1 $2")} ${field.label.en}`,
      ),
  );
  return role === "target"
    ? (candidates?.find(
        (field) => !/resource/i.test(`${field.id} ${field.label.en}`),
      ) ?? candidates?.[0])
    : candidates?.[0];
}

export function initialOperationalValues(action: IntegrationAction | null) {
  const values: IntegrationValues = {};
  for (const field of action?.fields ?? []) {
    if (operationalSensitiveField(field.id)) continue;
    values[field.id] =
      field.type === "toggle"
        ? false
        : field.type === "select"
          ? (field.options?.[0]?.value ?? "")
          : "";
  }
  return values;
}

export function scopedOperationalValues(
  action: IntegrationAction | null,
  resourceIds: readonly string[],
) {
  const values = initialOperationalValues(action);
  if (!resourceIds.length) return values;
  for (const field of action?.fields ?? []) {
    if (
      field.type === "text" &&
      /resource.?id|resource.?ref|selected resource/i.test(
        `${field.id} ${field.label.en}`,
      )
    )
      values[field.id] = resourceIds[0];
  }
  return values;
}

export function operationalReadState(
  record: IntegrationRecord,
): "read" | "unread" | "unknown" {
  if (
    record.fields?.read === true ||
    record.fields?.isRead === true ||
    record.status === "read"
  )
    return "read";
  if (
    record.fields?.read === false ||
    record.fields?.isRead === false ||
    record.status === "unread"
  )
    return "unread";
  return "unknown";
}

/** A backend read patch is offered only when a declared field expresses read state. */
export function operationalReadPatch(
  action: IntegrationAction | null,
  record: IntegrationRecord,
) {
  if (!action) return null;
  const target = operationalField(action, "target");
  const read = action.fields.find(
    (field) =>
      field.type === "toggle" && /read/i.test(`${field.id} ${field.label.en}`),
  );
  const status = action.fields.find(
    (field) =>
      /status/i.test(field.id) &&
      (field.type === "text" ||
        field.options?.some((option) => option.value === "read")),
  );
  if (!target || (!read && !status)) return null;
  let values: IntegrationValues = {};
  for (const field of action.fields) {
    if (operationalSensitiveField(field.id)) continue;
    const existing = record.fields?.[field.id];
    if (existing !== undefined) values[field.id] = existing;
    else if (field.required && field === operationalField(action, "name"))
      values[field.id] = record.name;
    else if (field.required && field === operationalField(action, "content"))
      values[field.id] = record.description;
  }
  values = { ...values, [target.id]: record.id };
  if (read) values[read.id] = true;
  else if (status) values[status.id] = "read";
  return Object.keys(validateOperationalValues(action, values)).length
    ? null
    : values;
}

/** Only declared fields cross the adapter boundary. Local preview state does not. */
export function operationalPayload(
  action: IntegrationAction,
  values: IntegrationValues,
) {
  const payload: IntegrationValues = {};
  for (const field of action.fields) {
    if (operationalSensitiveField(field.id)) continue;
    const value = values[field.id];
    if (value !== undefined && value !== "") payload[field.id] = value;
  }
  return payload;
}

export type OperationalFieldError =
  "required" | "number" | "url" | "option" | "json";
export function validateOperationalValues(
  action: IntegrationAction,
  values: IntegrationValues,
) {
  const errors: Record<string, OperationalFieldError> = {};
  for (const field of action.fields) {
    if (operationalSensitiveField(field.id)) {
      if (field.required) errors[field.id] = "required";
      continue;
    }
    const value = values[field.id];
    const empty =
      value === undefined ||
      value === "" ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && !value.length);
    if (empty) {
      if (field.required) errors[field.id] = "required";
      continue;
    }
    if (
      field.type === "number" &&
      (typeof value !== "number" || !Number.isFinite(value))
    )
      errors[field.id] = "number";
    if (
      field.type === "url" &&
      (typeof value !== "string" || !operationalPublicUrl(value))
    )
      errors[field.id] = "url";
    if (
      field.type === "select" &&
      !field.options?.some((option) => option.value === value)
    )
      errors[field.id] = "option";
    if (
      field.type === "text" &&
      /\bJSON\b/i.test(field.label.en) &&
      typeof value === "string"
    ) {
      try {
        JSON.parse(value);
      } catch {
        errors[field.id] = "json";
      }
    }
  }
  return errors;
}

export function operationalValue(
  action: IntegrationAction | null,
  values: IntegrationValues,
  role: OperationalFieldRole,
  fallback = "",
) {
  const field = operationalField(action, role);
  const value = field ? values[field.id] : undefined;
  return value === undefined || value === "" ? fallback : String(value);
}

export function withOperationalValue(
  action: IntegrationAction | null,
  values: IntegrationValues,
  role: OperationalFieldRole,
  value: IntegrationValue,
) {
  const field = operationalField(action, role);
  return field ? { ...values, [field.id]: value } : values;
}

/** Presentation only: do not display credentials or provider stack traces. */
export function operationalText(value: unknown, limit = 1600) {
  const text = Array.isArray(value) ? value.join(", ") : String(value ?? "");
  return text
    .replace(/^\s*(?:at\s+.+|(?:[A-Za-z]+)?Error:\s*.+)$/gm, "")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "[redacted]")
    .replace(
      /\b(?:sk-(?:proj-)?|ghp_|github_pat_)[A-Za-z0-9_-]{12,}\b/g,
      "[redacted]",
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[redacted]",
    )
    .replace(
      /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|authorization)["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;}]+)/gi,
      "$1[redacted]",
    )
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .trim()
    .slice(0, limit);
}

export function operationalPublicUrl(value: unknown): string | null {
  if (typeof value !== "string" || /[\\\u0000-\u001f]/.test(value)) return null;
  try {
    const relative = value.startsWith("/") && !value.startsWith("//");
    const url = new URL(
      value,
      relative ? "https://workbench.invalid" : undefined,
    );
    if (url.protocol !== "https:" || url.username || url.password) return null;
    for (const key of url.searchParams.keys()) {
      if (
        /token|secret|key|signature|credential|authorization|^auth$|x-amz|x-goog/i.test(
          key,
        )
      )
        return null;
    }
    if (
      /(?:token|secret|key|credential|authorization|auth)\s*=/i.test(
        decodeURIComponent(url.hash),
      )
    )
      return null;
    if (operationalText(value, value.length + 1).includes("[redacted]"))
      return null;
    return relative ? value : url.href;
  } catch {
    return null;
  }
}

export function operationalRecordFields(record: IntegrationRecord) {
  return Object.entries(record.fields ?? {}).filter(
    ([name]) => !operationalSensitiveField(name),
  );
}

export function operationalTemplateVariables(...templates: string[]) {
  const names = new Set<string>();
  for (const template of templates) {
    for (const match of template.matchAll(
      /\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/g,
    ))
      names.add(match[1]);
  }
  return [...names];
}

export function validOperationalRecipients(value: string, maxRecipients = 100) {
  const recipients = value.split(/[,;\n]/).map((part) => part.trim());
  return (
    recipients.length > 0 &&
    recipients.length <= maxRecipients &&
    recipients.every((recipient) =>
      /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient),
    )
  );
}

export function interpolateOperationalTemplate(
  template: string,
  variables: Record<string, string>,
) {
  const missing = new Set<string>();
  const text = template.replace(
    /\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/g,
    (token, name: string) => {
      if (!Object.hasOwn(variables, name) || !variables[name].trim()) {
        missing.add(name);
        return token;
      }
      return variables[name];
    },
  );
  return { text, missing: [...missing] };
}

export const operationalUploadLimit = 20 * 1024 * 1024;
export function operationalRasterImage(type: string) {
  return /^image\/(?:png|jpeg|webp|gif|avif)$/i.test(type);
}
export function validateOperationalFile(
  file: { name: string; size: number; type: string },
  alt: string,
  limit = operationalUploadLimit,
): "empty" | "size" | "alt" | null {
  if (!file.name || !Number.isFinite(file.size) || file.size <= 0)
    return "empty";
  if (file.size > limit) return "size";
  if (operationalRasterImage(file.type) && !alt.trim()) return "alt";
  return null;
}

export type OperationalMapping = {
  id: string;
  source: string;
  target: string;
  transform: "copy" | "trim" | "lowercase" | "uppercase" | "number" | "boolean";
};
export function applyOperationalMapping(
  input: IntegrationValues,
  mappings: readonly OperationalMapping[],
) {
  const output: IntegrationValues = {};
  const errors: {
    id: string;
    code: "missing" | "target" | "duplicate" | "conversion";
  }[] = [];
  for (const row of mappings) {
    const target = row.target.trim();
    if (
      !target ||
      ["__proto__", "prototype", "constructor"].includes(target) ||
      operationalSensitiveField(target) ||
      operationalSensitiveField(row.source)
    ) {
      errors.push({ id: row.id, code: "target" });
      continue;
    }
    if (Object.hasOwn(output, target)) {
      errors.push({ id: row.id, code: "duplicate" });
      continue;
    }
    if (!Object.hasOwn(input, row.source)) {
      errors.push({ id: row.id, code: "missing" });
      continue;
    }
    const value = input[row.source];
    let converted: IntegrationValue = value;
    if (row.transform === "trim") converted = String(value).trim();
    if (row.transform === "lowercase") converted = String(value).toLowerCase();
    if (row.transform === "uppercase") converted = String(value).toUpperCase();
    if (row.transform === "number") {
      converted =
        typeof value === "number" ? value : Number(String(value).trim());
      if (String(value).trim() === "" || !Number.isFinite(converted)) {
        errors.push({ id: row.id, code: "conversion" });
        continue;
      }
    }
    if (row.transform === "boolean") {
      const normalized = String(value).trim().toLowerCase();
      if (!["true", "false", "1", "0"].includes(normalized)) {
        errors.push({ id: row.id, code: "conversion" });
        continue;
      }
      converted = normalized === "true" || normalized === "1";
    }
    output[target] = converted;
  }
  return { output, errors };
}

export type OperationalSnapshot = {
  records: IntegrationRecord[];
  uploads: Extract<IntegrationResult, { kind: "upload" }>["asset"][];
  deliveries: Extract<IntegrationResult, { kind: "delivery" }>["delivery"][];
  metrics: Extract<IntegrationResult, { kind: "metrics" }>["metrics"];
  jobs: Extract<IntegrationResult, { kind: "job" }>["job"][];
  lastResult: IntegrationResult | null;
};
export function emptyOperationalSnapshot(): OperationalSnapshot {
  return {
    records: [],
    uploads: [],
    deliveries: [],
    metrics: [],
    jobs: [],
    lastResult: null,
  };
}
function upsert<T extends { id: string }>(items: T[], updates: T[]) {
  const next = new Map(items.map((item) => [item.id, item]));
  for (const item of updates) next.set(item.id, item);
  return [...next.values()];
}
export function mergeOperationalResult(
  previous: OperationalSnapshot,
  result: IntegrationResult,
  replaceRecords = false,
): OperationalSnapshot {
  const next = { ...previous, lastResult: result };
  switch (result.kind) {
    case "records":
      next.records = replaceRecords
        ? result.records
        : upsert(previous.records, result.records);
      break;
    case "record":
      next.records = upsert(previous.records, [result.record]);
      break;
    case "upload":
      next.uploads = upsert(previous.uploads, [result.asset]);
      break;
    case "delivery":
      next.deliveries = upsert(previous.deliveries, [result.delivery]);
      break;
    case "metrics":
      next.metrics = result.metrics;
      next.records = replaceRecords
        ? result.events
        : upsert(previous.records, result.events);
      break;
    case "job":
      next.jobs = upsert(previous.jobs, [result.job]);
      break;
    case "knowledge":
      next.records = replaceRecords
        ? result.documents
        : upsert(previous.records, result.documents);
      break;
  }
  return next;
}
