/** Frontend contracts. Consumer backends own credentials and authorization. */
export type IntegrationText = { en: string; es: string };
export type IntegrationFamily =
  | "data"
  | "identity"
  | "commerce"
  | "files"
  | "email"
  | "observability"
  | "notifications"
  | "jobs"
  | "collaboration"
  | "content"
  | "search"
  | "maps"
  | "ai"
  | "knowledge"
  | "agents"
  | "connectors"
  | "automation";

export type IntegrationValue = string | number | boolean | string[];
export type IntegrationValues = Record<string, IntegrationValue>;
export type IntegrationField = {
  id: string;
  label: IntegrationText;
  description?: IntegrationText;
  placeholder?: string;
  type: "text" | "url" | "number" | "select" | "toggle";
  required?: boolean;
  options?: readonly { value: string; label: IntegrationText }[];
};
export type IntegrationOperationKind =
  | "query"
  | "save-record"
  | "upload"
  | "send-email"
  | "track-event"
  | "set-flag"
  | "create-notification"
  | "update-preferences"
  | "trigger-job"
  | "cancel-job"
  | "publish-message"
  | "save-document"
  | "search"
  | "geocode"
  | "route"
  | "ingest"
  | "evaluate"
  | "run-agent"
  | "execute-tool"
  | "approve-tool"
  | "trigger-workflow"
  | "map-fields"
  | "create-ticket"
  | "create-pull-request"
  | "transition-issue"
  | "delete-source"
  | "update-record"
  | "list-models"
  | "test-connection"
  | "checkpoint";
export type IntegrationAction = {
  id: string;
  kind: IntegrationOperationKind;
  label: IntegrationText;
  description: IntegrationText;
  fields: readonly IntegrationField[];
  /** Logical permission IDs required by this action; backend authorization is authoritative. */
  requiredPermissions?: readonly string[];
  /** The UI asks for a review before submitting an external write. */
  requiresReview?: boolean;
};
export type IntegrationDefinition = {
  /** Matches a reviewed research candidate; every candidate has a recipe. */
  id: string;
  name: string;
  family: IntegrationFamily;
  priority: "P0" | "P1" | "P2";
  description: IntegrationText;
  options: readonly {
    id: string;
    name: string;
    description?: IntegrationText;
  }[];
  connectionMode: "configuration" | "oauth" | "browser-key" | "server";
  configurationFields: readonly IntegrationField[];
  /** Logical UI permissions. The backend maps these to actual provider scopes. */
  permissions: readonly {
    id: string;
    label: IntegrationText;
    description: IntegrationText;
    required?: boolean;
  }[];
  resourceTypes: readonly string[];
  resourceLabel: IntegrationText;
  actions: readonly IntegrationAction[];
  documentationUrl: string;
  packages: readonly string[];
  license: string;
  serviceNote: IntegrationText;
};

export type IntegrationScope = {
  workspaceId: string;
  signal?: AbortSignal;
};
export type IntegrationStatus =
  | "not-configured"
  | "connected"
  | "syncing"
  | "expired"
  | "permission-denied"
  | "error"
  | "disconnected";
export type IntegrationConnection = {
  id: string;
  integrationId: string;
  providerOptionId: string;
  workspaceId: string;
  status: IntegrationStatus;
  account: { name: string; email?: string };
  configuration: IntegrationValues;
  grantedPermissions: string[];
  resourceIds: string[];
  lastSyncAt?: string;
  revision: number;
  /** Consumer-reported enterprise policy; never inferred from frontend grants. */
  enterprise?: IntegrationEnterpriseState;
};
export type IntegrationEnterpriseState = {
  domain?: {
    name: string;
    status: "unverified" | "pending" | "verified" | "rejected";
    sso: "not-configured" | "pending" | "active" | "disabled";
    verification?: { type: "TXT" | "CNAME"; name: string; value: string };
  };
  administratorApproval?: {
    status: "not-requested" | "pending" | "approved" | "rejected" | "revoked";
    requestedBy?: string;
    reviewedBy?: string;
    updatedAt?: string;
  };
  permissionMode?: "delegated" | "application";
  /** Actual provider scope names, separate from logical frontend permission IDs. */
  providerScopes?: string[];
  consent?: {
    status: "not-requested" | "pending" | "granted" | "rejected" | "revoked";
    reviewedBy?: string;
    updatedAt?: string;
  };
  renewal?: {
    status: "active" | "due" | "expired" | "failed";
    expiresAt?: string;
    lastRenewedAt?: string;
  };
  synchronization?: {
    mode: "initial" | "incremental" | "delta";
    status: "idle" | "running" | "completed" | "failed" | "paused";
    lastSuccessAt?: string;
    /** A presence flag is sufficient; credentials and delta links stay server-side. */
    checkpointPresent?: boolean;
  };
  policy?: {
    name: string;
    status: "passing" | "review" | "blocked";
    checks: {
      id: string;
      name: string;
      status: "passing" | "review" | "blocked";
    }[];
  };
};
export type IntegrationResource = {
  id: string;
  name: string;
  type: string;
  description: string;
  /** Consumer-authorized public presentation URL, never a signed credential. */
  url?: string;
};
export type IntegrationEvent = {
  id: string;
  connectionId: string;
  createdAt: string;
  kind: "connection" | "configuration" | "sync" | "action" | "error";
  status: "success" | "pending" | "error";
  message: IntegrationText;
};
export type IntegrationRecord = {
  id: string;
  name: string;
  type: string;
  status: string;
  updatedAt: string;
  description: string;
  fields?: IntegrationValues;
};
export type IntegrationJob = {
  id: string;
  name: string;
  status: "queued" | "running" | "completed" | "cancelled" | "failed";
  progress: number;
  steps: {
    id: string;
    name: string;
    status: "pending" | "running" | "completed" | "failed";
  }[];
  logs: string[];
  owner?: { id: string; name: string };
  accounts?: {
    id: string;
    name: string;
    status: "connected" | "expired" | "revoked" | "unknown";
  }[];
  templateUrl?: string;
  templateName?: string;
};
export type IntegrationDocument = {
  id: string;
  title: string;
  content: string;
  format: "markdown" | "text" | "json";
  revision: number;
  updatedAt: string;
};
export type IntegrationSearchHit = {
  id: string;
  title: string;
  snippet: string;
  source: string;
  url?: string;
  score?: number;
};
export type IntegrationSearchFacet = {
  id: string;
  label: string;
  /** Counts describe the consumer's search response, not this rendered page. */
  buckets: { value: string; label: string; count: number }[];
  selection?: "single" | "multiple";
};
export type IntegrationToolRun = {
  id: string;
  name: string;
  state: "approval-required" | "running" | "completed" | "rejected" | "failed";
  input: IntegrationValues;
  approvalId?: string;
  output?: string;
  /** Published operational summaries only; no private reasoning or raw provider payload. */
  handoffs?: {
    id: string;
    from: string;
    to: string;
    state:
      | "requested"
      | "accepted"
      | "completed"
      | "failed"
      | "rejected"
      | "cancelled";
    summary: string;
  }[];
  progress?: {
    label: string;
    completed: number | null;
    total: number | null;
    state: "queued" | "running" | "completed" | "failed" | "cancelled";
    summary: string;
  };
  /** Authorized trace/proxy path supplied by the backend, never a signed URL. */
  safeTraceUrl?: string;
};
export type IntegrationResult =
  | {
      kind: "records";
      records: IntegrationRecord[];
      total: number;
      cursor?: string;
    }
  | { kind: "record"; record: IntegrationRecord }
  | {
      kind: "upload";
      asset: {
        id: string;
        name: string;
        url: string;
        size: number;
        contentType: string;
      };
    }
  | {
      kind: "delivery";
      delivery: {
        id: string;
        status: "queued" | "sent" | "failed" | "rejected" | "bounced";
        recipient: string;
        subject: string;
        preview: string;
        reasonCode?: string;
        occurredAt?: string;
      };
    }
  | {
      kind: "metrics";
      metrics: { id: string; label: string; value: number; unit?: string }[];
      events: IntegrationRecord[];
    }
  | { kind: "job"; job: IntegrationJob }
  | { kind: "document"; document: IntegrationDocument }
  | {
      kind: "search";
      hits: IntegrationSearchHit[];
      total: number;
      facets?: IntegrationSearchFacet[];
    }
  | {
      kind: "map";
      locations: {
        id: string;
        name: string;
        latitude: number;
        longitude: number;
      }[];
      coordinates?: [number, number][];
    }
  | {
      kind: "knowledge";
      documents: IntegrationRecord[];
      hits: IntegrationSearchHit[];
      status: "ready" | "indexing" | "failed";
    }
  | { kind: "tool"; run: IntegrationToolRun }
  | { kind: "receipt"; id: string; message: string };

export type IntegrationOperation = {
  integrationId: string;
  connectionId: string;
  actionId: string;
  values: IntegrationValues;
  /** Backend-enforced idempotency; optional explicit key for consumer callers. */
  idempotencyKey?: string;
};
export type IntegrationConnectRequest = {
  integrationId: string;
  providerOptionId: string;
  configuration: IntegrationValues;
  permissions: string[];
  resourceIds: string[];
};
export type IntegrationConnectResult =
  | { kind: "connected"; connection: IntegrationConnection }
  | { kind: "authorization"; url: string; connection: IntegrationConnection };
export type IntegrationConfigurationRequest = {
  configuration: IntegrationValues;
  permissions: string[];
  resourceIds: string[];
  revision: number;
};
export type IntegrationUploadRequest = {
  integrationId: string;
  connectionId: string;
  file: File;
  /** User-visible metadata, never credentials. */
  alt?: string;
};
export type IntegrationUpdate =
  | { kind: "result"; result: IntegrationResult }
  | {
      kind: "presence";
      members: {
        id: string;
        name: string;
        state: "online" | "away" | "editing";
        avatarUrl?: string;
      }[];
    }
  | { kind: "connection"; connection: IntegrationConnection };
export type IntegrationListener = (update: IntegrationUpdate) => void;
export interface IntegrationsAdapter {
  readonly mode: "demo" | "consumer";
  readonly authorizationOrigins?: readonly string[];
  list(scope: IntegrationScope): Promise<IntegrationConnection[]>;
  get(
    integrationId: string,
    scope: IntegrationScope,
  ): Promise<IntegrationConnection>;
  connect(
    request: IntegrationConnectRequest,
    scope: IntegrationScope,
  ): Promise<IntegrationConnectResult>;
  configure(
    connectionId: string,
    request: IntegrationConfigurationRequest,
    scope: IntegrationScope,
  ): Promise<IntegrationConnection>;
  disconnect(
    connectionId: string,
    scope: IntegrationScope,
  ): Promise<IntegrationConnection>;
  resources(
    integrationId: string,
    scope: IntegrationScope,
    query?: string,
  ): Promise<IntegrationResource[]>;
  sync(
    connectionId: string,
    scope: IntegrationScope,
  ): Promise<IntegrationConnection>;
  events(
    connectionId: string,
    scope: IntegrationScope,
  ): Promise<IntegrationEvent[]>;
  execute(
    request: IntegrationOperation,
    scope: IntegrationScope,
  ): Promise<IntegrationResult>;
  upload(
    request: IntegrationUploadRequest,
    scope: IntegrationScope,
  ): Promise<Extract<IntegrationResult, { kind: "upload" }>>;
  /** Optional live transport. Return cleanup; consumers own SDK/SSE authentication. */
  subscribe?(
    connectionId: string,
    listener: IntegrationListener,
    scope: IntegrationScope,
  ): (() => void) | Promise<() => void>;
}

export type IntegrationWorkbenchProps = {
  definition: IntegrationDefinition;
  connection: IntegrationConnection;
  adapter: IntegrationsAdapter;
  scope: IntegrationScope;
};
export type IntegrationErrorCode =
  | "configuration-required"
  | "permission-denied"
  | "expired"
  | "rate-limited"
  | "validation"
  | "offline"
  | "cancelled"
  | "conflict"
  | "provider-error";
export class IntegrationError extends Error {
  readonly code: IntegrationErrorCode;
  readonly retryAfterSeconds?: number;
  constructor(code: IntegrationErrorCode, retryAfterSeconds?: number) {
    super(`Integration: ${code}`);
    this.name = "IntegrationError";
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
