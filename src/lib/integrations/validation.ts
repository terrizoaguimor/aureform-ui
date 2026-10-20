import { z } from "zod";
import {
  IntegrationError,
  type IntegrationDefinition,
  type IntegrationScope,
  type IntegrationValues,
  type IntegrationResult,
  type IntegrationConnection,
  type IntegrationResource,
  type IntegrationEvent,
  type IntegrationUpdate,
} from "./contracts";

const id = z
  .string()
  .min(1)
  .max(200)
  .refine((v) => !/[\u0000-\u001f]/.test(v));
const text = z.string().max(64_000);
const timestamp = z.string().refine((v) => Number.isFinite(Date.parse(v)));
const value = z.union([
  text,
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(2000)).max(100),
]);
export const integrationValuesSchema = z
  .record(z.string().max(100), value)
  .refine((v) => Object.keys(v).length <= 64);
export function isPresentationUrl(value: string) {
  if (/[\\\u0000-\u0020\u007f]/.test(value) || value.startsWith("//"))
    return false;
  if (!value.startsWith("/") && !value.startsWith("https://")) return false;
  try {
    const url = new URL(value, "https://aureform.invalid");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      ![...url.searchParams.keys()].some((key) =>
        /^(?:token|access_token|refresh_token|api[-_]?key|secret|password|authorization|signature|sig|x-amz-.+|x-goog-(?:signature|credential|security-token))$/i.test(
          key,
        ),
      )
    );
  } catch {
    return false;
  }
}
const url = z.string().max(8192).refine(isPresentationUrl);
const enterprise = z.object({
  domain: z
    .object({
      name: z.string().min(1).max(253),
      status: z.enum(["unverified", "pending", "verified", "rejected"]),
      sso: z.enum(["not-configured", "pending", "active", "disabled"]),
      verification: z
        .object({
          type: z.enum(["TXT", "CNAME"]),
          name: z.string().max(253),
          value: z.string().max(2000),
        })
        .optional(),
    })
    .optional(),
  administratorApproval: z
    .object({
      status: z.enum([
        "not-requested",
        "pending",
        "approved",
        "rejected",
        "revoked",
      ]),
      requestedBy: z.string().max(300).optional(),
      reviewedBy: z.string().max(300).optional(),
      updatedAt: timestamp.optional(),
    })
    .optional(),
  permissionMode: z.enum(["delegated", "application"]).optional(),
  providerScopes: z.array(z.string().max(300)).max(100).optional(),
  consent: z
    .object({
      status: z.enum([
        "not-requested",
        "pending",
        "granted",
        "rejected",
        "revoked",
      ]),
      reviewedBy: z.string().max(300).optional(),
      updatedAt: timestamp.optional(),
    })
    .optional(),
  renewal: z
    .object({
      status: z.enum(["active", "due", "expired", "failed"]),
      expiresAt: timestamp.optional(),
      lastRenewedAt: timestamp.optional(),
    })
    .optional(),
  synchronization: z
    .object({
      mode: z.enum(["initial", "incremental", "delta"]),
      status: z.enum(["idle", "running", "completed", "failed", "paused"]),
      lastSuccessAt: timestamp.optional(),
      checkpointPresent: z.boolean().optional(),
    })
    .optional(),
  policy: z
    .object({
      name: z.string().max(300),
      status: z.enum(["passing", "review", "blocked"]),
      checks: z
        .array(
          z.object({
            id,
            name: z.string().max(300),
            status: z.enum(["passing", "review", "blocked"]),
          }),
        )
        .max(100),
    })
    .optional(),
});
export const integrationConnectionSchema = z.object({
  id,
  integrationId: id,
  providerOptionId: id,
  workspaceId: id,
  status: z.enum([
    "not-configured",
    "connected",
    "syncing",
    "expired",
    "permission-denied",
    "error",
    "disconnected",
  ]),
  account: z.object({ name: z.string().max(160), email: z.email().optional() }),
  configuration: integrationValuesSchema,
  grantedPermissions: z.array(id).max(100),
  resourceIds: z.array(id).max(500),
  lastSyncAt: timestamp.optional(),
  revision: z.number().int().nonnegative(),
  enterprise: enterprise.optional(),
});
export const integrationResourceSchema = z.object({
  id,
  name: z.string().max(300),
  type: id,
  description: z.string().max(2000),
  url: url.optional(),
});
export const integrationEventSchema = z.object({
  id,
  connectionId: id,
  createdAt: timestamp,
  kind: z.enum(["connection", "configuration", "sync", "action", "error"]),
  status: z.enum(["success", "pending", "error"]),
  message: z.object({ en: z.string().max(2000), es: z.string().max(2000) }),
});
const record = z.object({
  id,
  name: z.string().max(300),
  type: id,
  status: z.string().max(100),
  updatedAt: timestamp,
  description: z.string().max(2000),
  fields: integrationValuesSchema.optional(),
});
const hit = z.object({
  id,
  title: z.string().max(500),
  snippet: z.string().max(4000),
  source: z.string().max(500),
  url: url.optional(),
  score: z.number().finite().optional(),
});
const facet = z.object({
  id,
  label: z.string().min(1).max(300),
  buckets: z
    .array(
      z.object({
        value: z.string().max(2000),
        label: z.string().max(300),
        count: z.number().int().nonnegative(),
      }),
    )
    .max(500)
    .refine(
      (buckets) =>
        new Set(buckets.map((bucket) => bucket.value)).size === buckets.length,
    ),
  selection: z.enum(["single", "multiple"]).optional(),
});
const job = z.object({
  id,
  name: z.string().max(300),
  status: z.enum(["queued", "running", "completed", "cancelled", "failed"]),
  progress: z.number().min(0).max(100),
  steps: z
    .array(
      z.object({
        id,
        name: z.string().max(300),
        status: z.enum(["pending", "running", "completed", "failed"]),
      }),
    )
    .max(100),
  logs: z.array(z.string().max(2000)).max(200),
  owner: z.object({ id, name: z.string().max(300) }).optional(),
  accounts: z
    .array(
      z.object({
        id,
        name: z.string().max(300),
        status: z.enum(["connected", "expired", "revoked", "unknown"]),
      }),
    )
    .max(100)
    .optional(),
  templateUrl: url.optional(),
  templateName: z.string().max(300).optional(),
});
const document = z.object({
  id,
  title: z.string().max(500),
  content: text,
  format: z.enum(["markdown", "text", "json"]),
  revision: z.number().int().nonnegative(),
  updatedAt: timestamp,
});
export function isIntegrationTraceUrl(value: string) {
  if (!isPresentationUrl(value)) return false;
  try {
    const parsed = new URL(value, "https://aureform.invalid");
    if (parsed.search || parsed.hash) return false;
    let path = parsed.pathname;
    for (let pass = 0; pass < 2; pass++) path = decodeURIComponent(path);
    return !path.startsWith("//") && !/[\u0000-\u0020\u007f\\]/.test(path);
  } catch {
    return false;
  }
}
const toolProgress = z
  .object({
    label: z.string().min(1).max(300),
    completed: z.number().int().min(0).max(1_000_000).nullable(),
    total: z.number().int().min(0).max(1_000_000).nullable(),
    state: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
    summary: z.string().max(3000),
  })
  .refine(
    (progress) =>
      progress.total === null ||
      progress.completed === null ||
      progress.completed <= progress.total,
  );
const toolRun = z.object({
  id,
  name: z.string().max(300),
  state: z.enum([
    "approval-required",
    "running",
    "completed",
    "rejected",
    "failed",
  ]),
  input: integrationValuesSchema,
  approvalId: id.optional(),
  output: text.optional(),
  handoffs: z
    .array(
      z.object({
        id,
        from: z.string().min(1).max(160),
        to: z.string().min(1).max(160),
        state: z.enum([
          "requested",
          "accepted",
          "completed",
          "failed",
          "rejected",
          "cancelled",
        ]),
        summary: z.string().max(3000),
      }),
    )
    .max(100)
    .refine(
      (handoffs) =>
        new Set(handoffs.map((handoff) => handoff.id)).size === handoffs.length,
    )
    .optional(),
  progress: toolProgress.optional(),
  safeTraceUrl: z.string().max(2048).refine(isIntegrationTraceUrl).optional(),
});
export const integrationResultSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("records"),
    records: z.array(record).max(1000),
    total: z.number().int().nonnegative(),
    cursor: id.optional(),
  }),
  z.object({ kind: z.literal("record"), record }),
  z.object({
    kind: z.literal("upload"),
    asset: z.object({
      id,
      name: z.string().max(300),
      url,
      size: z.number().int().nonnegative(),
      contentType: z.string().max(100),
    }),
  }),
  z.object({
    kind: z.literal("delivery"),
    delivery: z.object({
      id,
      status: z.enum(["queued", "sent", "failed", "rejected", "bounced"]),
      recipient: z.string().max(500),
      subject: z.string().max(500),
      preview: text,
      reasonCode: z.string().max(300).optional(),
      occurredAt: timestamp.optional(),
    }),
  }),
  z.object({
    kind: z.literal("metrics"),
    metrics: z
      .array(
        z.object({
          id,
          label: z.string().max(300),
          value: z.number().finite(),
          unit: z.string().max(30).optional(),
        }),
      )
      .max(100),
    events: z.array(record).max(1000),
  }),
  z.object({ kind: z.literal("job"), job }),
  z.object({ kind: z.literal("document"), document }),
  z.object({
    kind: z.literal("search"),
    hits: z.array(hit).max(1000),
    total: z.number().int().nonnegative(),
    facets: z
      .array(facet)
      .max(64)
      .refine(
        (facets) =>
          new Set(facets.map((entry) => entry.id)).size === facets.length,
      )
      .optional(),
  }),
  z.object({
    kind: z.literal("map"),
    locations: z
      .array(
        z.object({
          id,
          name: z.string().max(300),
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
        }),
      )
      .max(1000)
      .refine((locations) => new Set(locations.map((location) => location.id)).size === locations.length),
    coordinates: z
      .array(
        z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
      )
      .max(10_000)
      .optional(),
  }),
  z.object({
    kind: z.literal("knowledge"),
    documents: z.array(record).max(1000),
    hits: z.array(hit).max(1000),
    status: z.enum(["ready", "indexing", "failed"]),
  }),
  z.object({ kind: z.literal("tool"), run: toolRun }),
  z.object({ kind: z.literal("receipt"), id, message: z.string().max(4000) }),
]);

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new IntegrationError("provider-error");
  return result.data;
}
export const parseIntegrationResult = (input: unknown): IntegrationResult =>
  parsed(integrationResultSchema, input);
export const parseIntegrationResource = (input: unknown): IntegrationResource =>
  parsed(integrationResourceSchema, input);
export const parseIntegrationEvent = (input: unknown): IntegrationEvent =>
  parsed(integrationEventSchema, input);
export function validateIntegrationScope(scope: IntegrationScope) {
  if (!id.safeParse(scope.workspaceId).success)
    throw new IntegrationError("validation");
  if (scope.signal?.aborted) throw new IntegrationError("cancelled");
}
export function parseIntegrationConnection(
  input: unknown,
  definition: IntegrationDefinition,
  scope: IntegrationScope,
): IntegrationConnection {
  const connection = parsed(integrationConnectionSchema, input);
  if (
    connection.integrationId !== definition.id ||
    connection.workspaceId !== scope.workspaceId ||
    !definition.options.some(
      (option) => option.id === connection.providerOptionId,
    ) ||
    connection.grantedPermissions.some(
      (permission) =>
        !definition.permissions.some((allowed) => allowed.id === permission),
    ) ||
    new Set(connection.grantedPermissions).size !==
      connection.grantedPermissions.length ||
    new Set(connection.resourceIds).size !== connection.resourceIds.length
  )
    throw new IntegrationError("provider-error");
  try {
    validateIntegrationFields(
      definition.configurationFields,
      connection.configuration,
      false,
    );
  } catch {
    throw new IntegrationError("provider-error");
  }
  return connection;
}

export function validateIntegrationFields(
  fields: IntegrationDefinition["configurationFields"],
  values: IntegrationValues,
  requireAll = true,
) {
  if (!integrationValuesSchema.safeParse(values).success)
    throw new IntegrationError("validation");
  for (const key of Object.keys(values))
    if (!fields.some((field) => field.id === key))
      throw new IntegrationError("validation");
  for (const field of fields) {
    const input = values[field.id];
    if (
      requireAll &&
      field.required &&
      (input === undefined ||
        (typeof input === "string" && !input.trim()) ||
        (Array.isArray(input) && !input.length))
    )
      throw new IntegrationError("validation");
    if (input === undefined || input === "") continue;
    if (
      field.type === "number" &&
      (typeof input !== "number" || !Number.isFinite(input))
    )
      throw new IntegrationError("validation");
    if (field.type === "toggle" && typeof input !== "boolean")
      throw new IntegrationError("validation");
    if (
      ["text", "url", "select"].includes(field.type) &&
      typeof input !== "string"
    )
      throw new IntegrationError("validation");
    if (
      field.type === "url" &&
      typeof input === "string" &&
      !isPresentationUrl(input)
    )
      throw new IntegrationError("validation");
    if (
      field.type === "select" &&
      !field.options?.some((option) => option.value === input)
    )
      throw new IntegrationError("validation");
  }
}

const selection = z
  .array(id)
  .max(500)
  .refine((ids) => new Set(ids).size === ids.length);
export function validateIntegrationSelection(
  definition: IntegrationDefinition,
  permissions: string[],
  resourceIds: string[],
  requirePermissions = true,
) {
  if (
    !selection.safeParse(permissions).success ||
    !selection.safeParse(resourceIds).success ||
    permissions.some(
      (permission) =>
        !definition.permissions.some((allowed) => allowed.id === permission),
    ) ||
    (requirePermissions &&
      definition.permissions.some(
        (permission) =>
          permission.required && !permissions.includes(permission.id),
      ))
  )
    throw new IntegrationError("validation");
}

export function parseIntegrationUpdate(
  input: unknown,
  definition: IntegrationDefinition,
  connectionId: string,
  scope: IntegrationScope,
): IntegrationUpdate {
  validateIntegrationScope(scope);
  if (!input || typeof input !== "object" || !("kind" in input))
    throw new IntegrationError("provider-error");
  if (input.kind === "result" && "result" in input)
    return { kind: "result", result: parseIntegrationResult(input.result) };
  if (input.kind === "connection" && "connection" in input) {
    const connection = parseIntegrationConnection(
      input.connection,
      definition,
      scope,
    );
    if (connection.id !== connectionId)
      throw new IntegrationError("provider-error");
    return { kind: "connection", connection };
  }
  if (input.kind === "presence" && "members" in input) {
    const schema = z
      .array(
        z.object({
          id,
          name: z.string().min(1).max(160),
          state: z.enum(["online", "away", "editing"]),
          avatarUrl: url.optional(),
        }),
      )
      .max(1000)
      .refine(
        (members) =>
          new Set(members.map((member) => member.id)).size === members.length,
      );
    return { kind: "presence", members: parsed(schema, input.members) };
  }
  throw new IntegrationError("provider-error");
}
