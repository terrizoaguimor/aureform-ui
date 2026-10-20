import { publicPath } from "../public-path";
import { withIntegrationCancellation as withCancellation } from "./cancelled-task";
import {
  IntegrationError,
  type IntegrationsAdapter,
  type IntegrationScope,
  type IntegrationDefinition,
  type IntegrationErrorCode,
  type IntegrationListener,
  type IntegrationConnection,
} from "./contracts";
import {
  getIntegrationDefinition,
  getIntegrationActionsForOption,
} from "./definitions";
import {
  integrationConnectionSchema,
  parseIntegrationConnection,
  parseIntegrationResource,
  parseIntegrationEvent,
  parseIntegrationResult,
  validateIntegrationScope,
  validateIntegrationFields,
  integrationValuesSchema,
  isPresentationUrl,
  validateIntegrationSelection,
  parseIntegrationUpdate,
} from "./validation";

export type HttpIntegrationsOptions = {
  baseUrl?: string;
  fetcher?: typeof fetch;
  getCsrfToken?: () => string | null | Promise<string | null>;
  /** Explicit opt-in for a separately deployed HTTPS consumer API. */
  trustedBackendOrigins?: readonly string[];
  credentials?: RequestCredentials;
  /** OAuth initiation/callback destinations, never a blanket redirect allowlist. */
  authorizationOrigins?: readonly string[];
  getDefinition?: (id: string) => IntegrationDefinition | undefined;
  /** An authenticated SDK/SSE callback that returns cleanup. HTTP never guesses a live endpoint. */
  subscribe?: (
    connectionId: string,
    listener: IntegrationListener,
    scope: IntegrationScope,
  ) => (() => void) | Promise<() => void>;
  onSubscriptionError?: (error: IntegrationError) => void;
};
const statusCodes: Record<number, IntegrationErrorCode> = {
  400: "validation",
  401: "expired",
  403: "permission-denied",
  404: "configuration-required",
  409: "conflict",
  410: "expired",
  422: "validation",
  429: "rate-limited",
};
function requireDefinition(
  id: string,
  lookup: HttpIntegrationsOptions["getDefinition"],
) {
  const definition = (lookup ?? getIntegrationDefinition)(id);
  if (!definition) throw new IntegrationError("validation");
  return definition;
}
export function isTrustedIntegrationAuthorizationUrl(
  value: string,
  origins: readonly string[] = [],
) {
  if (!isPresentationUrl(value)) return false;
  if (value.startsWith("/")) return true;
  const url = new URL(value);
  return (
    origins.includes(url.origin) ||
    (typeof window !== "undefined" && url.origin === window.location.origin)
  );
}
function requestBase(options: HttpIntegrationsOptions) {
  const base = (options.baseUrl ?? publicPath("/api/integrations")).replace(
    /\/+$/,
    "",
  );
  if (
    base.startsWith("/") &&
    !base.startsWith("//") &&
    !/[\u0000-\u0020\u007f\\?#]/.test(base) &&
    !base.includes("..") &&
    !/%(?:2e|2f|5c|0[0-9a-f]|1[0-9a-f]|20|7f)/i.test(base) &&
    new URL(base, "https://aureform.invalid").origin ===
      "https://aureform.invalid"
  )
    return { base, crossOrigin: false };
  try {
    const url = new URL(base);
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      options.trustedBackendOrigins?.includes(url.origin)
    )
      return { base, crossOrigin: true };
  } catch {
    /* Invalid or untrusted endpoints do not receive requests. */
  }
  throw new IntegrationError("validation");
}

/** Provider-agnostic transport. Credentials, SDK calls and ACLs stay server-side. */
export function createHttpIntegrationsAdapter(
  options: HttpIntegrationsOptions = {},
): IntegrationsAdapter {
  const { base, crossOrigin } = requestBase(options);
  const fetcher =
    options.fetcher ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  async function request(
    path: string,
    scope: IntegrationScope,
    body?: unknown,
    multipart?: FormData,
  ) {
    validateIntegrationScope(scope);
    const query = new URLSearchParams({ workspaceId: scope.workspaceId });
    const mutating = body !== undefined || !!multipart;
    const csrf =
      mutating && options.getCsrfToken
        ? await withCancellation(options.getCsrfToken, scope)
        : null;
    if (
      mutating &&
      options.getCsrfToken &&
      (typeof csrf !== "string" || !/^[\x21-\x7e]{1,4096}$/.test(csrf))
    )
      throw new IntegrationError("permission-denied");
    validateIntegrationScope(scope);
    let response: Response;
    try {
      response = await withCancellation(
        () =>
          fetcher(`${base}${path}${path.includes("?") ? "&" : "?"}${query}`, {
            method: body === undefined && !multipart ? "GET" : "POST",
            credentials:
              options.credentials ?? (crossOrigin ? "omit" : "same-origin"),
            mode: crossOrigin ? "cors" : "same-origin",
            redirect: "error",
            cache: "no-store",
            signal: scope.signal,
            headers: {
              Accept: "application/json",
              "X-Aureform-Request": "integrations",
              ...(body === undefined || multipart
                ? {}
                : { "Content-Type": "application/json" }),
              ...(csrf ? { "X-CSRF-Token": csrf } : {}),
            },
            ...(multipart
              ? { body: multipart }
              : body === undefined
                ? {}
                : { body: JSON.stringify(body) }),
          }),
        scope,
      );
    } catch {
      throw new IntegrationError(
        scope.signal?.aborted ? "cancelled" : "offline",
      );
    }
    validateIntegrationScope(scope);
    if (response.redirected || response.type === "opaqueredirect")
      throw new IntegrationError("provider-error");
    if (!response.ok) {
      const retry = Number(response.headers.get("retry-after"));
      throw new IntegrationError(
        statusCodes[response.status] ?? "provider-error",
        Number.isFinite(retry) && retry > 0 && retry <= 3600
          ? retry
          : undefined,
      );
    }
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new IntegrationError("provider-error");
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > 2_000_000)
      throw new IntegrationError("provider-error");
    try {
      const text = await withCancellation(() => response.text(), scope);
      if (text.length > 2_000_000) throw new IntegrationError("provider-error");
      validateIntegrationScope(scope);
      return JSON.parse(text) as unknown;
    } catch {
      throw new IntegrationError(
        scope.signal?.aborted ? "cancelled" : "provider-error",
      );
    }
  }
  const connectionDefinitions = new Map<string, IntegrationConnection>();
  const connectionKey = (connectionId: string, scope: IntegrationScope) =>
    `${scope.workspaceId}:${connectionId}`;
  const definitionForConnection = (
    connectionId: string,
    scope: IntegrationScope,
  ) => {
    validateIntegrationScope(scope);
    const connection = connectionDefinitions.get(
      connectionKey(connectionId, scope),
    );
    if (!connection) throw new IntegrationError("configuration-required");
    return requireDefinition(connection.integrationId, options.getDefinition);
  };
  const acceptConnection = (
    input: unknown,
    definition: IntegrationDefinition,
    scope: IntegrationScope,
    expectedId?: string,
  ) => {
    validateIntegrationScope(scope);
    const value = parseIntegrationConnection(input, definition, scope);
    if (expectedId && value.id !== expectedId)
      throw new IntegrationError("provider-error");
    const known = connectionDefinitions.get(connectionKey(value.id, scope));
    if (known && value.revision < known.revision)
      throw new IntegrationError("conflict");
    connectionDefinitions.set(connectionKey(value.id, scope), value);
    return value;
  };
  return {
    mode: "consumer",
    authorizationOrigins: options.authorizationOrigins
      ? [...options.authorizationOrigins]
      : [],
    async list(scope) {
      const result = await request("/connections", scope);
      if (!Array.isArray(result) || result.length > 500)
        throw new IntegrationError("provider-error");
      const values = result.map((value) => {
        const parsed = integrationConnectionSchema.safeParse(value);
        if (!parsed.success) throw new IntegrationError("provider-error");
        return acceptConnection(
          value,
          requireDefinition(parsed.data.integrationId, options.getDefinition),
          scope,
        );
      });
      if (
        new Set(values.map((connection) => connection.id)).size !==
          values.length ||
        new Set(values.map((connection) => connection.integrationId)).size !==
          values.length
      )
        throw new IntegrationError("provider-error");
      return values;
    },
    async get(integrationId, scope) {
      return acceptConnection(
        await request(
          `/connections/${encodeURIComponent(integrationId)}`,
          scope,
        ),
        requireDefinition(integrationId, options.getDefinition),
        scope,
      );
    },
    async connect(input, scope) {
      const definition = requireDefinition(
        input.integrationId,
        options.getDefinition,
      );
      validateIntegrationFields(
        definition.configurationFields,
        input.configuration,
      );
      validateIntegrationSelection(
        definition,
        input.permissions,
        input.resourceIds,
      );
      if (
        !definition.options.some(
          (option) => option.id === input.providerOptionId,
        )
      )
        throw new IntegrationError("validation");
      const result = await request("/connect", scope, input);
      if (
        !result ||
        typeof result !== "object" ||
        !("kind" in result) ||
        !("connection" in result)
      )
        throw new IntegrationError("provider-error");
      const connection = acceptConnection(result.connection, definition, scope);
      if (connection.providerOptionId !== input.providerOptionId)
        throw new IntegrationError("provider-error");
      if (result.kind === "connected" && connection.status === "connected")
        return { kind: "connected", connection };
      if (
        result.kind === "authorization" &&
        connection.status !== "connected" &&
        "url" in result &&
        typeof result.url === "string" &&
        isTrustedIntegrationAuthorizationUrl(
          result.url,
          options.authorizationOrigins,
        )
      )
        return { kind: "authorization", url: result.url, connection };
      throw new IntegrationError("provider-error");
    },
    async configure(connectionId, input, scope) {
      const definition = definitionForConnection(connectionId, scope);
      validateIntegrationFields(
        definition.configurationFields,
        input.configuration,
      );
      validateIntegrationSelection(
        definition,
        input.permissions,
        input.resourceIds,
      );
      if (!Number.isSafeInteger(input.revision) || input.revision < 0)
        throw new IntegrationError("validation");
      return acceptConnection(
        await request(
          `/connections/${encodeURIComponent(connectionId)}/configure`,
          scope,
          input,
        ),
        definition,
        scope,
        connectionId,
      );
    },
    async disconnect(connectionId, scope) {
      const definition = definitionForConnection(connectionId, scope);
      return acceptConnection(
        await request(
          `/connections/${encodeURIComponent(connectionId)}/disconnect`,
          scope,
          {},
        ),
        definition,
        scope,
        connectionId,
      );
    },
    async resources(integrationId, scope, query = "") {
      requireDefinition(integrationId, options.getDefinition);
      if (query.length > 500) throw new IntegrationError("validation");
      const result = await request(
        `/resources/${encodeURIComponent(integrationId)}?query=${encodeURIComponent(query)}`,
        scope,
      );
      if (!Array.isArray(result) || result.length > 1000)
        throw new IntegrationError("provider-error");
      const resources = result.map(parseIntegrationResource);
      if (
        new Set(resources.map((resource) => resource.id)).size !==
        resources.length
      )
        throw new IntegrationError("provider-error");
      return resources;
    },
    async sync(connectionId, scope) {
      const definition = definitionForConnection(connectionId, scope);
      return acceptConnection(
        await request(
          `/connections/${encodeURIComponent(connectionId)}/sync`,
          scope,
          {},
        ),
        definition,
        scope,
        connectionId,
      );
    },
    async events(connectionId, scope) {
      definitionForConnection(connectionId, scope);
      const result = await request(
        `/connections/${encodeURIComponent(connectionId)}/events`,
        scope,
      );
      if (!Array.isArray(result) || result.length > 1000)
        throw new IntegrationError("provider-error");
      const events = result.map(parseIntegrationEvent);
      if (events.some((event) => event.connectionId !== connectionId))
        throw new IntegrationError("provider-error");
      return events;
    },
    async execute(input, scope) {
      const definition = requireDefinition(
        input.integrationId,
        options.getDefinition,
      );
      if (
        definitionForConnection(input.connectionId, scope).id !== definition.id
      )
        throw new IntegrationError("validation");
      const action = definition.actions.find(
        (action) => action.id === input.actionId,
      );
      if (!action || !integrationValuesSchema.safeParse(input.values).success)
        throw new IntegrationError("validation");
      const connection = connectionDefinitions.get(
        connectionKey(input.connectionId, scope),
      )!;
      if (
        !getIntegrationActionsForOption(
          definition,
          connection.providerOptionId,
        ).some((allowed) => allowed.id === action.id)
      )
        throw new IntegrationError("validation");
      if (connection.status !== "connected")
        throw new IntegrationError(
          connection.status === "expired"
            ? "expired"
            : "configuration-required",
        );
      if (
        action.requiredPermissions?.some(
          (id) => !connection.grantedPermissions.includes(id),
        )
      )
        throw new IntegrationError("permission-denied");
      if (
        input.idempotencyKey &&
        (input.idempotencyKey.length > 200 ||
          /[\u0000-\u001f]/.test(input.idempotencyKey))
      )
        throw new IntegrationError("validation");
      // Actions with richer domain payloads still use the bounded value contract.
      // Declared fields are checked when provided; domain adapters validate further.
      const response = await request("/execute", scope, input);
      return parseIntegrationResult(response);
    },
    async upload(input, scope) {
      const definition = requireDefinition(
        input.integrationId,
        options.getDefinition,
      );
      if (definition.family !== "files" && definition.family !== "knowledge")
        throw new IntegrationError("validation");
      if (
        definitionForConnection(input.connectionId, scope).id !==
          definition.id ||
        !input.file.size ||
        input.file.size > 20 * 1024 * 1024 ||
        (input.alt?.length ?? 0) > 2000
      )
        throw new IntegrationError("validation");
      const connection = connectionDefinitions.get(
        connectionKey(input.connectionId, scope),
      )!;
      if (connection.status !== "connected")
        throw new IntegrationError(
          connection.status === "expired"
            ? "expired"
            : "configuration-required",
        );
      const actions = getIntegrationActionsForOption(
        definition,
        connection.providerOptionId,
      );
      const action =
        actions.find((entry) => entry.kind === "upload") ??
        (definition.family === "knowledge"
          ? actions.find((entry) => entry.kind === "ingest")
          : undefined);
      if (!action) throw new IntegrationError("validation");
      if (
        action.requiredPermissions?.some(
          (id) => !connection.grantedPermissions.includes(id),
        )
      )
        throw new IntegrationError("permission-denied");
      const form = new FormData();
      form.set("file", input.file);
      form.set("integrationId", definition.id);
      form.set("connectionId", input.connectionId);
      if (input.alt) form.set("alt", input.alt);
      const result = parseIntegrationResult(
        await request("/upload", scope, undefined, form),
      );
      if (result.kind !== "upload")
        throw new IntegrationError("provider-error");
      return result;
    },
    ...(options.subscribe
      ? {
          async subscribe(
            connectionId: string,
            listener: IntegrationListener,
            scope: IntegrationScope,
          ) {
            const definition = definitionForConnection(connectionId, scope);
            let active = true;
            const cleanup = await options.subscribe!(
              connectionId,
              (update) => {
                if (!active || scope.signal?.aborted) return;
                try {
                  const value = parseIntegrationUpdate(
                    update,
                    definition,
                    connectionId,
                    scope,
                  );
                  if (value.kind === "connection")
                    acceptConnection(
                      value.connection,
                      definition,
                      scope,
                      connectionId,
                    );
                  listener(value);
                } catch {
                  options.onSubscriptionError?.(
                    new IntegrationError("provider-error"),
                  );
                }
              },
              scope,
            );
            if (scope.signal?.aborted) {
              active = false;
              cleanup();
              throw new IntegrationError("cancelled");
            }
            const close = () => {
              if (!active) return;
              active = false;
              scope.signal?.removeEventListener("abort", close);
              cleanup();
            };
            scope.signal?.addEventListener("abort", close, { once: true });
            return close;
          },
        }
      : {}),
  };
}
