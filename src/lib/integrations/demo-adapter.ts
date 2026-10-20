import {
  IntegrationError,
  type IntegrationConnection,
  type IntegrationDefinition,
  type IntegrationEvent,
  type IntegrationJob,
  type IntegrationAction,
  type IntegrationRecord,
  type IntegrationResult,
  type IntegrationScope,
  type IntegrationToolRun,
  type IntegrationValues,
  type IntegrationsAdapter,
  type IntegrationListener,
  type IntegrationUpdate,
} from "./contracts";
import {
  integrationDefinitions,
  getIntegrationDefinition,
  getIntegrationActionsForOption,
} from "./definitions";
import {
  validateIntegrationFields,
  validateIntegrationScope,
  validateIntegrationSelection,
  integrationValuesSchema,
} from "./validation";
import { publicPath } from "../public-path";
import { integrationRequestSignature } from "./request-keys";

type ConnectionState = {
  connection: IntegrationConnection;
  records: IntegrationRecord[];
  events: IntegrationEvent[];
  document: {
    id: string;
    title: string;
    content: string;
    format: "markdown" | "text" | "json";
    revision: number;
    updatedAt: string;
  };
  jobs: Map<string, IntegrationJob>;
  removals: Map<string, { sourceId: string; previousStatus: string }>;
  tools: Map<string, IntegrationToolRun>;
  idempotency: Map<string, { signature: string; result: IntegrationResult }>;
  listeners: Set<IntegrationListener>;
};
const clone = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();
function wait(delay: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(new IntegrationError("cancelled"));
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new IntegrationError("cancelled"));
    };
    const timer = setTimeout(
      () => {
        signal?.removeEventListener("abort", abort);
        resolve();
      },
      Math.max(0, delay),
    );
    signal?.addEventListener("abort", abort, { once: true });
  });
}
export function demoIntegrationConfiguration(
  definition: IntegrationDefinition,
): IntegrationValues {
  return Object.fromEntries(
    definition.configurationFields.map((field) => [
      field.id,
      field.type === "toggle"
        ? true
        : field.type === "number"
          ? 100
          : field.type === "select"
            ? (field.options?.[0]?.value ?? "")
            : field.type === "url"
              ? "https://example.com"
              : field.id.toLowerCase().includes("region")
                ? "us-east-1"
                : field.id.toLowerCase().includes("key")
                  ? "DEMO_PUBLIC_KEY"
                  : field.id.toLowerCase().includes("email")
                    ? "alex@example.com"
                    : `demo-${definition.id}`,
    ]),
  );
}
const resourceNames: Partial<
  Record<IntegrationDefinition["family"], string[]>
> = {
  data: ["Customers", "Orders", "Product catalogue", "Workspace activity"],
  files: [
    "Product photography",
    "Brand library",
    "Shared documents",
    "Archive",
  ],
  email: [
    "Welcome email",
    "Workspace invitation",
    "Receipt",
    "Account recovery",
  ],
  observability: [
    "Production",
    "Preview",
    "Checkout funnel",
    "Feature rollout",
  ],
  notifications: ["Inbox", "Email digest", "Workspace alerts", "Activity feed"],
  jobs: [
    "Import customers",
    "Generate report",
    "Refresh index",
    "Process uploads",
  ],
  collaboration: [
    "Product room",
    "Design room",
    "Release room",
    "Support room",
  ],
  content: ["Product brief", "Release notes", "Team handbook", "Launch plan"],
  search: [
    "Products",
    "Knowledge articles",
    "Customers",
    "Workspace documents",
  ],
  maps: ["Bogotá studio", "Medellín warehouse", "Cali office", "Delivery area"],
  knowledge: [
    "Team handbook",
    "Product specifications",
    "Support knowledge",
    "Release notes",
  ],
  agents: [
    "Search documents",
    "Create a draft",
    "Review a record",
    "Send an update",
  ],
  connectors: [
    "Product workspace",
    "Release project",
    "Support queue",
    "Shared documents",
  ],
  automation: [
    "New customer",
    "Weekly digest",
    "Order completed",
    "Document updated",
  ],
};
function seedRecords(definition: IntegrationDefinition) {
  return Array.from({ length: 24 }, (_, index): IntegrationRecord => ({
    id: `${definition.id}-record-${index + 1}`,
    name: `${(resourceNames[definition.family] ?? ["Workspace", "Team", "Members", "Activity"])[index % 4]} ${Math.floor(index / 4) + 1}`,
    type:
      definition.family === "collaboration"
        ? "message"
        : (definition.resourceTypes[
            index % Math.max(1, definition.resourceTypes.length)
          ] ?? "record"),
    status: index % 5 === 0 ? "review" : "ready",
    updatedAt: now(),
    description: `Local ${definition.name} preview record. No external account data.`,
    fields: {
      owner: "Alex Morgan",
      priority: index % 2 ? "normal" : "high",
      amount: (index + 1) * 25,
      resourceId: `${definition.id}-resource-${(index % 12) + 1}`,
      ...(definition.family === "collaboration"
        ? {
            threadId: `${definition.id}-thread-${(index % 12) + 1}`,
            ...(index >= 12
              ? { parentId: `${definition.id}-record-${index - 11}` }
              : {}),
            authorId: index % 2 ? "demo-isabel" : "demo-alex",
            authorName: index % 2 ? "Isabel Torres" : "Alex Morgan",
          }
        : {}),
    },
  }));
}
function seedEnterprise(
  integrationId: string,
  providerOptionId: string,
): IntegrationConnection["enterprise"] {
  if (integrationId === "enterprise-identity")
    return {
      domain: {
        name: "demo.example",
        status: "pending",
        sso: "pending",
        verification: {
          type: "TXT",
          name: "_aureform.demo.example",
          value: "local-demo-verification",
        },
      },
      administratorApproval: { status: "pending", requestedBy: "Alex Morgan" },
      policy: {
        name: "Demo organization policy",
        status: "review",
        checks: [
          { id: "domain", name: "Domain verification", status: "review" },
          { id: "sso", name: "SSO activation", status: "review" },
        ],
      },
    };
  if (integrationId === "microsoft-365")
    return {
      permissionMode: "delegated",
      providerScopes:
        providerOptionId === "teams"
          ? ["Channel.ReadBasic.All"]
          : providerOptionId === "outlook-calendar"
            ? ["Calendars.Read"]
            : ["Files.Read"],
      consent: { status: "pending" },
      renewal: { status: "due" },
      synchronization: {
        mode: "delta",
        status: "idle",
        checkpointPresent: false,
      },
    };
  if (integrationId === "salesforce")
    return {
      policy: {
        name: "Demo selected-object and field policy",
        status: "review",
        checks: [
          {
            id: "org",
            name: "Organization and environment selection",
            status: "passing",
          },
          { id: "fields", name: "Allowed object fields", status: "review" },
        ],
      },
      synchronization: {
        mode: "initial",
        status: "idle",
        checkpointPresent: false,
      },
    };
}
function seedDocument(
  definition: IntegrationDefinition,
): ConnectionState["document"] {
  const allowed = definition.actions
    .find((action) => action.kind === "save-document")
    ?.fields.find((field) => field.id === "format")
    ?.options?.map((option) => option.value);
  const format =
    allowed && !allowed.includes("markdown") && allowed.includes("json")
      ? "json"
      : "markdown";
  let content =
    "# A considered product\n\nBuild a useful workflow, then connect your data.\n\n- Clear actions\n- Recoverable states\n- Permission-aware resources";
  if (format === "json") {
    content =
      definition.id === "lexical"
        ? JSON.stringify(
            {
              root: {
                children: [
                  {
                    children: [
                      {
                        detail: 0,
                        format: 0,
                        mode: "normal",
                        style: "",
                        text: "Build a useful workflow, then connect your data.",
                        type: "text",
                        version: 1,
                      },
                    ],
                    direction: null,
                    format: "",
                    indent: 0,
                    type: "paragraph",
                    version: 1,
                    textFormat: 0,
                    textStyle: "",
                  },
                ],
                direction: null,
                format: "",
                indent: 0,
                type: "root",
                version: 1,
              },
            },
            null,
            2,
          )
        : definition.id === "blocknote"
          ? JSON.stringify(
              [
                {
                  id: "demo-paragraph",
                  type: "paragraph",
                  props: {},
                  content: [
                    {
                      type: "text",
                      text: "Build a useful workflow, then connect your data.",
                      styles: {},
                    },
                  ],
                  children: [],
                },
              ],
              null,
              2,
            )
          : JSON.stringify(
              {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Build a useful workflow, then connect your data.",
                      },
                    ],
                  },
                ],
              },
              null,
              2,
            );
  }
  return {
    id: `${definition.id}-document`,
    title: "Product brief",
    content,
    format,
    revision: 1,
    updatedAt: now(),
  };
}

export type DemoIntegrationsOptions = {
  delayMs?: number;
  /** Deterministic failure injection, without real provider requests. */
  fail?: (
    integrationId: string,
    operation: string,
  ) => IntegrationError["code"] | undefined;
};
/** Isolated memory only. Never performs OAuth, sending, charging or tracking. */
export function createDemoIntegrationsAdapter(
  options: DemoIntegrationsOptions = {},
): IntegrationsAdapter {
  const states = new Map<string, ConnectionState>();
  let eventSequence = 0;
  const definition = (id: string) => {
    const found = getIntegrationDefinition(id);
    if (!found) throw new IntegrationError("validation");
    return found;
  };
  function stateFor(integrationId: string, scope: IntegrationScope) {
    validateIntegrationScope(scope);
    const item = definition(integrationId),
      key = `${scope.workspaceId}:${integrationId}`;
    let state = states.get(key);
    if (!state) {
      state = {
        connection: {
          id: `demo:${key}`,
          integrationId,
          providerOptionId: item.options[0].id,
          workspaceId: scope.workspaceId,
          status: "not-configured",
          account: {
            name: "Aureform demo workspace",
            email: "alex@example.com",
          },
          configuration: {},
          grantedPermissions: [],
          resourceIds: [],
          revision: 0,
        },
        records: seedRecords(item),
        events: [],
        jobs: new Map(),
        removals: new Map(),
        tools: new Map(),
        idempotency: new Map(),
        listeners: new Set(),
        document: seedDocument(item),
      };
      states.set(key, state);
    }
    return state;
  }
  function stateForConnection(connectionId: string, scope: IntegrationScope) {
    validateIntegrationScope(scope);
    const state = [...states.values()].find(
      (value) =>
        value.connection.id === connectionId &&
        value.connection.workspaceId === scope.workspaceId,
    );
    if (!state) throw new IntegrationError("configuration-required");
    return state;
  }
  async function ready(
    integrationId: string,
    operation: string,
    scope: IntegrationScope,
  ) {
    validateIntegrationScope(scope);
    await wait(options.delayMs ?? 180, scope.signal);
    validateIntegrationScope(scope);
    const failure = options.fail?.(integrationId, operation);
    if (failure) throw new IntegrationError(failure);
  }
  function event(
    state: ConnectionState,
    kind: IntegrationEvent["kind"],
    en: string,
    es: string,
  ) {
    state.events.unshift({
      id: `event-${++eventSequence}`,
      connectionId: state.connection.id,
      createdAt: now(),
      kind,
      status: "success",
      message: { en, es },
    });
    state.events = state.events.slice(0, 100);
  }
  function broadcast(state: ConnectionState, update: IntegrationUpdate) {
    for (const listener of state.listeners) {
      try {
        listener(clone(update));
      } catch {
        // An optional observer cannot turn an acknowledged write into a failure.
      }
    }
  }
  function validateSelection(
    item: IntegrationDefinition,
    permissions: string[],
    resourceIds: string[],
  ) {
    validateIntegrationSelection(item, permissions, resourceIds);
    if (
      resourceIds.some(
        (id) =>
          !Array.from(
            { length: 12 },
            (_, index) => `${item.id}-resource-${index + 1}`,
          ).includes(id),
      )
    )
      throw new IntegrationError("validation");
  }
  return {
    mode: "demo",
    async list(scope) {
      await ready("catalogue", "list", scope);
      return integrationDefinitions.map((item) =>
        clone(stateFor(item.id, scope).connection),
      );
    },
    async get(integrationId, scope) {
      await ready(integrationId, "get", scope);
      return clone(stateFor(integrationId, scope).connection);
    },
    async connect(request, scope) {
      const input = clone(request),
        item = definition(input.integrationId);
      validateIntegrationFields(item.configurationFields, input.configuration);
      validateSelection(item, input.permissions, input.resourceIds);
      if (!item.options.some((option) => option.id === input.providerOptionId))
        throw new IntegrationError("validation");
      await ready(item.id, "connect", scope);
      const state = stateFor(item.id, scope);
      state.connection = {
        ...state.connection,
        providerOptionId: input.providerOptionId,
        configuration: input.configuration,
        grantedPermissions: input.permissions,
        resourceIds: input.resourceIds,
        status: "connected",
        revision: state.connection.revision + 1,
        enterprise: seedEnterprise(item.id, input.providerOptionId),
      };
      event(
        state,
        "connection",
        "Demo connection configured; no external account was accessed.",
        "Conexión demo configurada; no se accedió a ninguna cuenta externa.",
      );
      broadcast(state, { kind: "connection", connection: state.connection });
      return { kind: "connected", connection: clone(state.connection) };
    },
    async configure(connectionId, request, scope) {
      const input = clone(request),
        state = stateForConnection(connectionId, scope);
      const item = definition(state.connection.integrationId);
      validateIntegrationFields(item.configurationFields, input.configuration);
      validateSelection(item, input.permissions, input.resourceIds);
      await ready(item.id, "configure", scope);
      if (input.revision !== state.connection.revision)
        throw new IntegrationError("conflict");
      state.connection = {
        ...state.connection,
        configuration: input.configuration,
        grantedPermissions: input.permissions,
        resourceIds: input.resourceIds,
        revision: state.connection.revision + 1,
      };
      event(
        state,
        "configuration",
        "Demo permissions and selected resources updated.",
        "Permisos y recursos seleccionados de la demo actualizados.",
      );
      broadcast(state, { kind: "connection", connection: state.connection });
      return clone(state.connection);
    },
    async disconnect(connectionId, scope) {
      const state = stateForConnection(connectionId, scope);
      await ready(state.connection.integrationId, "disconnect", scope);
      state.connection = {
        ...state.connection,
        status: "disconnected",
        grantedPermissions: [],
        resourceIds: [],
        configuration: {},
        revision: state.connection.revision + 1,
      };
      event(
        state,
        "connection",
        "Demo connection disconnected.",
        "Conexión demo desconectada.",
      );
      broadcast(state, { kind: "connection", connection: state.connection });
      return clone(state.connection);
    },
    async resources(integrationId, scope, query = "") {
      const item = definition(integrationId);
      await ready(integrationId, "resources", scope);
      const names = resourceNames[item.family] ?? [
        "Workspace",
        "Team",
        "Members",
        "Activity",
      ];
      return Array.from({ length: 12 }, (_, index) => ({
        id: `${integrationId}-resource-${index + 1}`,
        name: `${names[index % names.length]} ${Math.floor(index / names.length) + 1}`,
        type:
          item.resourceTypes[index % Math.max(1, item.resourceTypes.length)] ??
          "workspace",
        description: `${item.name} · local preview`,
      })).filter((resource) =>
        resource.name.toLowerCase().includes(query.toLowerCase()),
      );
    },
    async sync(connectionId, scope) {
      const state = stateForConnection(connectionId, scope);
      await ready(state.connection.integrationId, "sync", scope);
      if (state.connection.status !== "connected")
        throw new IntegrationError("configuration-required");
      state.connection = { ...state.connection, lastSyncAt: now() };
      event(
        state,
        "sync",
        "Demo resources refreshed successfully.",
        "Recursos de la demo actualizados correctamente.",
      );
      broadcast(state, { kind: "connection", connection: state.connection });
      return clone(state.connection);
    },
    async events(connectionId, scope) {
      const state = stateForConnection(connectionId, scope);
      await ready(state.connection.integrationId, "events", scope);
      return clone(state.events);
    },
    async execute(request, scope) {
      const input = clone(request),
        item = definition(input.integrationId);
      const state = stateForConnection(input.connectionId, scope);
      if (state.connection.integrationId !== item.id)
        throw new IntegrationError("validation");
      const action = item.actions.find(
        (action) => action.id === input.actionId,
      );
      if (!action || !integrationValuesSchema.safeParse(input.values).success)
        throw new IntegrationError("validation");
      if (
        !getIntegrationActionsForOption(
          item,
          state.connection.providerOptionId,
        ).some((allowed) => allowed.id === action.id)
      )
        throw new IntegrationError("validation");
      if (
        input.idempotencyKey &&
        (input.idempotencyKey.length > 200 ||
          /[\u0000-\u001f]/.test(input.idempotencyKey))
      )
        throw new IntegrationError("validation");
      await ready(item.id, action.kind, scope);
      if (state.connection.status !== "connected")
        throw new IntegrationError("configuration-required");
      if (
        action.requiredPermissions?.some(
          (id) => !state.connection.grantedPermissions.includes(id),
        )
      )
        throw new IntegrationError("permission-denied");
      const signature = integrationRequestSignature(input, scope.workspaceId);
      const cached = input.idempotencyKey
        ? state.idempotency.get(input.idempotencyKey)
        : undefined;
      if (cached) {
        if (cached.signature !== signature)
          throw new IntegrationError("conflict");
        return clone(cached.result);
      }
      const result = performAction(state, item, action, input.values);
      if (input.idempotencyKey) {
        state.idempotency.set(input.idempotencyKey, {
          signature,
          result: clone(result),
        });
        if (state.idempotency.size > 100)
          state.idempotency.delete(state.idempotency.keys().next().value!);
      }
      event(
        state,
        "action",
        `${action.label.en} completed in the local demo.`,
        `${action.label.es} completado en la demo local.`,
      );
      broadcast(state, { kind: "result", result });
      return clone(result);
    },
    async upload(input, scope) {
      const state = stateForConnection(input.connectionId, scope);
      if (
        state.connection.integrationId !== input.integrationId ||
        !input.file.size ||
        input.file.size > 20 * 1024 * 1024 ||
        (input.alt?.length ?? 0) > 2000 ||
        !["files", "knowledge"].includes(definition(input.integrationId).family)
      )
        throw new IntegrationError("validation");
      await ready(input.integrationId, "upload", scope);
      if (state.connection.status !== "connected")
        throw new IntegrationError("configuration-required");
      const item = definition(input.integrationId);
      const actions = getIntegrationActionsForOption(
        item,
        state.connection.providerOptionId,
      );
      const action =
        actions.find((entry) => entry.kind === "upload") ??
        (item.family === "knowledge"
          ? actions.find((entry) => entry.kind === "ingest")
          : undefined);
      if (!action) throw new IntegrationError("validation");
      if (
        action.requiredPermissions?.some(
          (id) => !state.connection.grantedPermissions.includes(id),
        )
      )
        throw new IntegrationError("permission-denied");
      const assetId = `upload-${++eventSequence}`;
      state.records.unshift({
        id: assetId,
        name: input.file.name,
        type: "file",
        status: "ready",
        description: input.alt ?? "Local file preview",
        updatedAt: now(),
        fields: {
          size: input.file.size,
          contentType: input.file.type,
          resourceId:
            state.connection.resourceIds[0] ??
            `${input.integrationId}-resource-1`,
        },
      });
      event(
        state,
        "action",
        "File added to the local preview; nothing was uploaded externally.",
        "Archivo añadido a la vista local; no se subió a un servicio externo.",
      );
      return {
        kind: "upload",
        asset: {
          id: assetId,
          name: input.file.name,
          size: input.file.size,
          contentType: input.file.type || "application/octet-stream",
          url: publicPath("/assets/products/linea-notebook.svg"),
        },
      };
    },
    subscribe(connectionId, listener, scope) {
      const state = stateForConnection(connectionId, scope);
      let closed = false;
      const receive: IntegrationListener = (update) => {
        if (!closed && !scope.signal?.aborted) listener(update);
      };
      state.listeners.add(receive);
      if (definition(state.connection.integrationId).family === "collaboration")
        queueMicrotask(() =>
          receive({
            kind: "presence",
            members: [
              {
                id: "demo-alex",
                name: "Alex Morgan",
                state: "online",
                avatarUrl: publicPath("/assets/avatars/alex-morgan.svg"),
              },
              {
                id: "demo-isabel",
                name: "Isabel Torres",
                state: "editing",
                avatarUrl: publicPath("/assets/avatars/isabel-torres.svg"),
              },
              {
                id: "demo-noor",
                name: "Noor Ahmed",
                state: "away",
                avatarUrl: publicPath("/assets/avatars/noor-ahmed.svg"),
              },
            ],
          }),
        );
      const close = () => {
        closed = true;
        state.listeners.delete(receive);
        scope.signal?.removeEventListener("abort", close);
      };
      scope.signal?.addEventListener("abort", close, { once: true });
      return close;
    },
  };
}

function demoJiraTransitions(record: IntegrationRecord) {
  return record.status === "completed"
    ? [{ id: "21", name: "Reopen", status: "ready" }]
    : record.status === "in-progress"
      ? [
          { id: "31", name: "Complete", status: "completed" },
          { id: "21", name: "Return to review", status: "review" },
        ]
      : [
          { id: "11", name: "Start progress", status: "in-progress" },
          { id: "31", name: "Complete", status: "completed" },
        ];
}
function performAction(
  state: ConnectionState,
  definition: IntegrationDefinition,
  action: IntegrationAction,
  values: IntegrationValues,
): IntegrationResult {
  const kind = action.kind;
  const inputText = (key: string, fallback = "") =>
    typeof values[key] === "string" ? (values[key] as string) : fallback;
  const query = inputText(
    "query",
    inputText("search", inputText("text")),
  ).toLowerCase();
  const matching = state.records.filter(
    (record) =>
      `${record.name} ${record.description} ${record.type}`
        .toLowerCase()
        .includes(query) &&
      (!state.connection.resourceIds.length ||
        !record.fields?.resourceId ||
        state.connection.resourceIds.includes(
          String(record.fields.resourceId),
        )) &&
      (!values.status ||
        values.status === "all" ||
        record.status === values.status) &&
      (!values.resourceId || record.fields?.resourceId === values.resourceId) &&
      (!values.recordId || record.id === values.recordId),
  );
  let selectedFacets: Record<string, string[]> = {};
  if (typeof values.facets === "string" && values.facets) {
    try {
      const input: unknown = JSON.parse(values.facets);
      if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.entries(input).some(
          ([key, selected]) =>
            !["type", "status"].includes(key) ||
            !Array.isArray(selected) ||
            selected.length > 100 ||
            selected.some((value) => typeof value !== "string"),
        )
      ) {
        throw new IntegrationError("validation");
      }
      selectedFacets = input as Record<string, string[]>;
    } catch {
      throw new IntegrationError("validation");
    }
  }
  const searched = matching.filter((record) =>
    Object.entries(selectedFacets).every(
      ([key, selected]) =>
        !selected.length ||
        selected.includes(key === "type" ? record.type : record.status),
    ),
  );
  const hits = () =>
    searched
      .map((record, index) => ({
        id: record.id,
        title: record.name,
        snippet: record.description,
        source: definition.name,
        score: Math.max(0.25, 0.96 - index * 0.03),
      }))
      .filter(
        (hit) =>
          !["deleting", "deleted"].includes(
            state.records.find((record) => record.id === hit.id)?.status ?? "",
          ),
      );
  function advanceJob(job: IntegrationJob) {
    if (job.status !== "running") return;
    job.progress = Math.min(100, job.progress + 34);
    if (job.progress === 100) job.status = "completed";
    job.steps = job.steps.map((step, index) => ({
      ...step,
      status: job.progress >= (index + 1) * 33 ? "completed" : "pending",
    }));
    job.logs.push(`Demo progress: ${job.progress}%`);
    job.logs = job.logs.slice(-200);
    const removal = state.removals.get(job.id);
    if (removal && job.status === "completed") {
      const source = state.records.find(
        (record) => record.id === removal.sourceId,
      );
      if (source) {
        source.status = "deleted";
        source.updatedAt = now();
      }
    }
  }
  const metrics = (): Extract<IntegrationResult, { kind: "metrics" }> => ({
    kind: "metrics",
    metrics: [
      { id: "events", label: "Demo events", value: state.records.length * 142 },
      { id: "users", label: "Demo active users", value: 1284 },
      { id: "conversion", label: "Demo conversion", value: 4.8, unit: "%" },
      { id: "errors", label: "Demo errors", value: 3 },
    ],
    events: searched.slice(0, 12),
  });
  switch (kind) {
    case "query": {
      if (action.id === "jira-transition-options") {
        const issue = matching.find(
          (record) => record.id === inputText("recordId"),
        );
        if (!issue) throw new IntegrationError("validation");
        if (
          values.expectedUpdatedAt !== undefined &&
          values.expectedUpdatedAt !== issue.updatedAt
        )
          throw new IntegrationError("conflict");
        const transitions = demoJiraTransitions(issue);
        return {
          kind: "records",
          total: transitions.length,
          records: transitions.map((transition) => ({
            id: `transition:${issue.id}:${transition.id}`,
            name: transition.name,
            type: "jira-transition",
            status: "available",
            updatedAt: issue.updatedAt,
            description:
              "Transition available in this local fixture; no Jira account was accessed.",
            fields: {
              transitionId: transition.id,
              recordId: issue.id,
              targetStatus: transition.status,
            },
          })),
        };
      }
      if (action.id === "repository-pull-requests") {
        const records = matching.filter(
          (record) =>
            ["pull-request", "github-pull-request"].includes(record.type) &&
            (!values.state ||
              values.state === "all" ||
              record.status === values.state),
        );
        return {
          kind: "records",
          records: records.slice(
            0,
            Math.max(1, Math.min(100, Number(values.limit ?? 10))),
          ),
          total: records.length,
        };
      }
      if (definition.family === "content")
        return { kind: "document", document: state.document };
      if (definition.family === "observability") return metrics();
      if (
        (definition.family === "jobs" || definition.family === "automation") &&
        state.jobs.size
      ) {
        const latest =
          state.jobs.get(inputText("jobId")) ??
          [...state.jobs.values()].at(-1)!;
        advanceJob(latest);
        return { kind: "job", job: latest };
      }
      if (definition.family === "knowledge") {
        for (const jobId of state.removals.keys()) {
          const job = state.jobs.get(jobId);
          if (job) advanceJob(job);
        }
        return {
          kind: "knowledge",
          documents: searched,
          hits: hits().slice(0, 4),
          status: "ready",
        };
      }
      if (definition.family === "maps")
        return {
          kind: "map",
          locations: [
            {
              id: "bogota",
              name: "Bogotá studio",
              latitude: 4.711,
              longitude: -74.0721,
            },
            {
              id: "medellin",
              name: "Medellín warehouse",
              latitude: 6.2442,
              longitude: -75.5812,
            },
            {
              id: "cali",
              name: "Cali office",
              latitude: 3.4516,
              longitude: -76.532,
            },
          ],
        };
      let sortKey = inputText("sort", "name");
      let descending = values.direction === "desc" || values.order === "desc";
      if (typeof values.sorting === "string" && values.sorting) {
        try {
          const sorting: unknown = JSON.parse(values.sorting);
          if (
            Array.isArray(sorting) &&
            sorting[0] &&
            typeof sorting[0].id === "string"
          ) {
            sortKey = sorting[0].id;
            descending = sorting[0].desc === true;
          }
        } catch {
          throw new IntegrationError("validation");
        }
      }
      const sortable = (record: IntegrationRecord) => {
        if (
          sortKey === "name" ||
          sortKey === "status" ||
          sortKey === "type" ||
          sortKey === "updatedAt"
        )
          return record[sortKey];
        return record.fields?.[sortKey] ?? record.name;
      };
      const sorted = [...searched].sort((a, b) => {
        const first = sortable(a),
          second = sortable(b);
        const difference =
          typeof first === "number" && typeof second === "number"
            ? first - second
            : String(first).localeCompare(String(second));
        return difference * (descending ? -1 : 1);
      });
      const pageSize = Math.max(
        1,
        Math.min(100, Number(values.pageSize ?? values.limit ?? 10) || 10),
      );
      const page = Math.max(0, Number(values.page ?? 0) || 0);
      return {
        kind: "records",
        records: sorted.slice(page * pageSize, (page + 1) * pageSize),
        total: searched.length,
      };
    }
    case "save-record":
    case "update-record":
    case "transition-issue":
    case "create-ticket":
    case "create-pull-request":
    case "publish-message":
    case "create-notification": {
      const recordId = inputText(
        "recordId",
        inputText("assetId", inputText("id")),
      );
      const existing = state.records.find((record) => record.id === recordId);
      if (kind === "transition-issue" && !existing)
        throw new IntegrationError("validation");
      if (
        existing &&
        values.expectedUpdatedAt !== undefined &&
        values.expectedUpdatedAt !== existing.updatedAt
      )
        throw new IntegrationError("conflict");
      const selectedTransition =
        kind === "transition-issue" && existing
          ? demoJiraTransitions(existing).find(
              (transition) => transition.id === values.transitionId,
            )
          : undefined;
      if (kind === "transition-issue" && !selectedTransition)
        throw new IntegrationError("permission-denied");
      if (
        existing &&
        state.connection.resourceIds.length &&
        existing.fields?.resourceId &&
        !state.connection.resourceIds.includes(
          String(existing.fields.resourceId),
        )
      )
        throw new IntegrationError("permission-denied");
      let customFields: IntegrationValues = {};
      if (typeof values.fields === "string") {
        try {
          const parsedFields = integrationValuesSchema.safeParse(
            JSON.parse(values.fields),
          );
          if (!parsedFields.success) throw new IntegrationError("validation");
          customFields = parsedFields.data;
        } catch {
          throw new IntegrationError("validation");
        }
      }
      const row: IntegrationRecord = {
        id: existing?.id ?? `${definition.id}-new-${state.records.length + 1}`,
        name: inputText(
          "name",
          inputText(
            "title",
            inputText("subject", existing?.name ?? "New demo record"),
          ),
        ),
        type:
          existing?.type ??
          (kind === "create-pull-request"
            ? "pull-request"
            : kind === "create-ticket"
              ? "ticket"
              : kind === "publish-message"
                ? "message"
                : (definition.resourceTypes[0] ?? "record")),
        status:
          selectedTransition?.status ??
          inputText(
            "status",
            kind === "create-pull-request"
              ? values.draft === true
                ? "draft"
                : "open"
              : (existing?.status ?? "ready"),
          ),
        updatedAt: now(),
        description: inputText(
          "description",
          inputText(
            "content",
            inputText("message", existing?.description ?? "Local demo update"),
          ),
        ),
        fields: {
          ...existing?.fields,
          ...values,
          ...customFields,
          resourceId: inputText(
            "resourceId",
            String(
              customFields.resourceId ??
                existing?.fields?.resourceId ??
                state.connection.resourceIds[0] ??
                `${definition.id}-resource-1`,
            ),
          ),
        },
      };
      if (existing)
        state.records = state.records.map((record) =>
          record.id === existing.id ? row : record,
        );
      else state.records.unshift(row);
      return { kind: "record", record: row };
    }
    case "search": {
      const found = hits();
      const pageSize = Math.max(
        1,
        Math.min(100, Number(values.pageSize ?? values.limit ?? 10) || 10),
      );
      const page = Math.max(
        0,
        Number(values.page ?? values.pageIndex ?? 0) || 0,
      );
      return {
        kind: "search",
        hits: found.slice(page * pageSize, (page + 1) * pageSize),
        total: found.length,
        facets: ["type", "status"].map((key) => {
          const counts = new Map<string, number>();
          for (const record of matching) {
            const value = key === "type" ? record.type : record.status;
            counts.set(value, (counts.get(value) ?? 0) + 1);
          }
          return {
            id: key,
            label: key === "type" ? "Record type" : "Status",
            selection: "multiple",
            buckets: [...counts].map(([value, count]) => ({
              value,
              label: value,
              count,
            })),
          };
        }),
      };
    }
    case "save-document": {
      if (
        values.revision !== undefined &&
        Number(values.revision) !== state.document.revision
      )
        throw new IntegrationError("conflict");
      const format = inputText("format", state.document.format);
      if (!["markdown", "text", "json"].includes(format))
        throw new IntegrationError("validation");
      const content = inputText("content", state.document.content);
      if (format === "json")
        try {
          JSON.parse(content);
        } catch {
          throw new IntegrationError("validation");
        }
      state.document = {
        ...state.document,
        title: inputText("title", state.document.title),
        content,
        format: format as "markdown" | "text" | "json",
        revision: state.document.revision + 1,
        updatedAt: now(),
      };
      return { kind: "document", document: state.document };
    }
    case "send-email": {
      const recipient = inputText("recipient", inputText("to"));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))
        throw new IntegrationError("validation");
      return {
        kind: "delivery",
        delivery: {
          id: `demo-delivery-${state.events.length + 1}`,
          status: "queued",
          recipient,
          subject: inputText("subject", "A considered invitation"),
          preview: inputText(
            "content",
            inputText("body", "Welcome to the workspace."),
          ),
        },
      };
    }
    case "track-event": {
      state.records.unshift({
        id: `demo-event-${state.records.length + 1}`,
        name: inputText("event", inputText("name", "workspace.action")),
        type: "event",
        status: "ready",
        updatedAt: now(),
        description: "Local event fixture; no analytics were transmitted.",
        fields: values,
      });
      return metrics();
    }
    case "set-flag": {
      const flag = inputText("flag", inputText("flagKey", "new-experience"));
      state.records = state.records.filter(
        (record) => record.id !== `flag:${flag}`,
      );
      state.records.unshift({
        id: `flag:${flag}`,
        name: flag,
        type: "flag",
        status: values.enabled === false ? "disabled" : "enabled",
        description: "Local flag preview.",
        updatedAt: now(),
        fields: values,
      });
      return {
        kind: "receipt",
        id: inputText("flag", "new-experience"),
        message: `Demo feature flag ${values.enabled === false ? "disabled" : "enabled"}. No tracking or rollout service was called.`,
      };
    }
    case "update-preferences": {
      state.records = state.records.filter(
        (record) => record.id !== "notification-preferences",
      );
      state.records.unshift({
        id: "notification-preferences",
        name: "Notification preferences",
        type: "preferences",
        status: "ready",
        description: "Saved local preview preferences.",
        updatedAt: now(),
        fields: values,
      });
      return {
        kind: "receipt",
        id: "notification-preferences",
        message: "Demo notification preferences saved.",
      };
    }
    case "trigger-job":
    case "trigger-workflow": {
      const id = `demo-job-${state.jobs.size + 1}`;
      const job: IntegrationJob = {
        id,
        name: inputText(
          "name",
          inputText("workflow", `${definition.name} preview run`),
        ),
        status: "running",
        progress: 32,
        steps: [
          { id: "validate", name: "Validate inputs", status: "completed" },
          { id: "process", name: "Process demo records", status: "running" },
          { id: "finish", name: "Publish result", status: "pending" },
        ],
        logs: [
          "Demo run started.",
          "Inputs validated.",
          "Processing local fixtures.",
        ],
        ...(kind === "trigger-workflow"
          ? {
              owner: { id: "demo-alex", name: "Alex Morgan" },
              accounts: [
                {
                  id: `demo-account:${definition.id}`,
                  name: state.connection.account.name,
                  status: "connected" as const,
                },
              ],
            }
          : {}),
      };
      state.jobs.set(id, job);
      return { kind: "job", job };
    }
    case "cancel-job": {
      const job =
        state.jobs.get(inputText("jobId", inputText("id"))) ??
        [...state.jobs.values()].at(-1);
      if (!job) throw new IntegrationError("validation");
      if (job.status === "completed") throw new IntegrationError("conflict");
      job.status = "cancelled";
      job.logs.push("Demo run cancelled.");
      const removal = state.removals.get(job.id);
      if (removal) {
        const source = state.records.find(
          (record) => record.id === removal.sourceId,
        );
        if (source && source.status === "deleting")
          source.status = removal.previousStatus;
      }
      return { kind: "job", job };
    }
    case "delete-source": {
      const sourceId = inputText(
        "sourceId",
        inputText("documentId", inputText("recordId", inputText("id"))),
      );
      const source = state.records.find((record) => record.id === sourceId);
      if (!source) throw new IntegrationError("validation");
      if (
        values.expectedUpdatedAt !== undefined &&
        values.expectedUpdatedAt !== source.updatedAt
      )
        throw new IntegrationError("conflict");
      if (["deleting", "deleted"].includes(source.status))
        throw new IntegrationError("conflict");
      if (
        state.connection.resourceIds.length &&
        source.fields?.resourceId &&
        !state.connection.resourceIds.includes(String(source.fields.resourceId))
      )
        throw new IntegrationError("permission-denied");
      const jobId = `demo-removal-${state.jobs.size + 1}`;
      state.removals.set(jobId, { sourceId, previousStatus: source.status });
      source.status = "deleting";
      source.updatedAt = now();
      const job: IntegrationJob = {
        id: jobId,
        name: `Remove ${source.name} · local demo`,
        status: "running",
        progress: 32,
        steps: [
          {
            id: "authorize",
            name: "Validate source selection",
            status: "completed",
          },
          { id: "index", name: "Remove local index entry", status: "running" },
          { id: "confirm", name: "Confirm local deletion", status: "pending" },
        ],
        logs: [
          "Local removal requested. No provider or vector database was contacted.",
        ],
      };
      state.jobs.set(jobId, job);
      return { kind: "job", job };
    }
    case "ingest": {
      const name = inputText("name", inputText("title", "Selected source"));
      const resourceId = inputText(
        "resourceId",
        state.connection.resourceIds[0] ?? `${definition.id}-resource-1`,
      );
      if (
        state.connection.resourceIds.length &&
        !state.connection.resourceIds.includes(resourceId)
      )
        throw new IntegrationError("permission-denied");
      const document: IntegrationRecord = {
        id: `source-${state.records.length + 1}`,
        name,
        type: "document",
        status: "ready",
        updatedAt: now(),
        fields: { resourceId },
        description: inputText(
          "content",
          "Local source ingestion preview; no embeddings were generated.",
        ),
      };
      state.records.unshift(document);
      return {
        kind: "knowledge",
        documents: [document, ...searched],
        hits: hits().slice(0, 4),
        status: "ready",
      };
    }
    case "evaluate":
      return {
        kind: "metrics",
        metrics: [
          { id: "reviewed", label: "Demo reviewed runs", value: 24 },
          { id: "feedback", label: "Demo useful feedback", value: 18 },
        ],
        events: searched.slice(0, 10),
      };
    case "geocode": {
      const name = inputText("address", inputText("query", "Bogotá studio"));
      return {
        kind: "map",
        locations: [
          { id: "demo-location", name, latitude: 4.711, longitude: -74.0721 },
        ],
      };
    }
    case "route":
      return {
        kind: "map",
        locations: [
          {
            id: "start",
            name: inputText("origin", "Bogotá"),
            latitude: 4.711,
            longitude: -74.0721,
          },
          {
            id: "end",
            name: inputText("destination", "Medellín"),
            latitude: 6.2442,
            longitude: -75.5812,
          },
        ],
        coordinates: [
          [-74.0721, 4.711],
          [-74.45, 5.02],
          [-75.08, 5.68],
          [-75.5812, 6.2442],
        ],
      };
    case "run-agent":
    case "execute-tool": {
      const id = `demo-tool-${state.tools.size + 1}`;
      const run: IntegrationToolRun = {
        id,
        name: inputText("tool", inputText("name", "create_document_draft")),
        state: "approval-required",
        input: values,
        approvalId: `approval-${id}`,
        ...(kind === "run-agent"
          ? {
              handoffs: [
                {
                  id: `${id}:handoff`,
                  from: "Demo coordinator",
                  to: "Demo document assistant",
                  state: "accepted" as const,
                  summary:
                    "Local handoff fixture prepared for review. No agent service was called.",
                },
              ],
              progress: {
                label: "Local run preparation",
                completed: 1,
                total: 3,
                state: "running" as const,
                summary: "The next local action waits for your review.",
              },
            }
          : {}),
      };
      state.tools.set(id, run);
      return { kind: "tool", run };
    }
    case "approve-tool": {
      const approvalId = inputText("approvalId");
      const run =
        [...state.tools.values()].find(
          (tool) => tool.approvalId === approvalId,
        ) ?? state.tools.get(inputText("runId"));
      if (!run || run.state !== "approval-required")
        throw new IntegrationError("conflict");
      const approved =
        values.approved !== false &&
        values.approve !== false &&
        values.decision !== "reject";
      run.state = approved ? "completed" : "rejected";
      run.output = approved
        ? "Demo action approved and completed using local fixtures."
        : "Demo action rejected; no side effect occurred.";
      if (run.handoffs)
        run.handoffs = run.handoffs.map((handoff) => ({
          ...handoff,
          state: approved ? "completed" : "rejected",
        }));
      if (run.progress)
        run.progress = {
          ...run.progress,
          state: approved ? "completed" : "cancelled",
          completed: approved ? run.progress.total : run.progress.completed,
        };
      return { kind: "tool", run };
    }
    case "upload":
      return {
        kind: "receipt",
        id: "upload-picker",
        message:
          "Select a file in the upload panel. The upload adapter receives the original File.",
      };
    case "map-fields": {
      state.records = state.records.filter(
        (record) => record.id !== "field-mapping",
      );
      state.records.unshift({
        id: "field-mapping",
        name: "Field mapping",
        type: "mapping",
        status: "ready",
        description: "Saved local preview field mapping.",
        updatedAt: now(),
        fields: values,
      });
      return {
        kind: "receipt",
        id: "field-mapping",
        message: "Demo field mapping saved. External records were not changed.",
      };
    }
    case "list-models":
      return {
        kind: "records",
        total: 3,
        records: ["Balanced", "Precise", "Creative"].map((name, index) => ({
          id: `demo-model-${index + 1}`,
          name,
          type: "demo-model",
          status: "ready",
          updatedAt: now(),
          description: "Local response style; not a public provider model.",
        })),
      };
    case "checkpoint": {
      const checkpointId = `demo-checkpoint-${state.records.filter((record) => record.type === "checkpoint").length + 1}`;
      state.records.unshift({
        id: checkpointId,
        name: inputText("name", "Agent checkpoint"),
        type: "checkpoint",
        status: "ready",
        description: "Checkpoint retained in this demo adapter's memory.",
        updatedAt: now(),
        fields: { ...values, runIds: [...state.tools.keys()] },
      });
      return {
        kind: "receipt",
        id: checkpointId,
        message:
          "Demo checkpoint retained in memory. Persistent execution belongs to the consumer backend.",
      };
    }
    case "test-connection":
      return {
        kind: "receipt",
        id: state.connection.id,
        message:
          "Local demo contract check succeeded; this does not verify a provider account.",
      };
  }
}
