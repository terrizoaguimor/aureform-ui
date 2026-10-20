import type {
  IntegrationAction,
  IntegrationErrorCode,
  IntegrationSearchFacet,
  IntegrationSearchHit,
  IntegrationValues,
  IntegrationsAdapter,
  IntegrationDefinition,
} from "./contracts";

export type ShellSearchRequest = {
  workspaceId: string;
  query: string;
  signal: AbortSignal;
};

export type ShellSearchResult = {
  hits: IntegrationSearchHit[];
  /** The backend's total, not the number of items displayed in the palette. */
  total: number;
};

/** Implement in a Client Component; authentication and source ACLs belong to the backend. */
export interface ShellSearchAdapter {
  readonly mode?: "demo" | "consumer";
  search(request: ShellSearchRequest): Promise<ShellSearchResult>;
}

export class SearchBridgeError extends Error {
  readonly code: IntegrationErrorCode;

  constructor(code: IntegrationErrorCode) {
    super("Workspace search could not finish.");
    this.name = "SearchBridgeError";
    this.code = code;
  }
}

const errorCodes = new Set<IntegrationErrorCode>([
  "configuration-required",
  "permission-denied",
  "expired",
  "rate-limited",
  "validation",
  "offline",
  "cancelled",
  "conflict",
  "provider-error",
]);

/** Never render an adapter's raw message, stack, endpoint or response body. */
export function searchBridgeErrorCode(cause: unknown): IntegrationErrorCode {
  const code =
    cause && typeof cause === "object" && "code" in cause
      ? cause.code
      : undefined;
  return typeof code === "string" &&
    errorCodes.has(code as IntegrationErrorCode)
    ? (code as IntegrationErrorCode)
    : "provider-error";
}

/** Unsafe or credential-bearing URLs remain plain-text previews. */
export function searchBridgeHref(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 2048 ||
    /[\u0000-\u0020\\]/.test(value) ||
    value.startsWith("//") ||
    (!value.startsWith("/") && !value.startsWith("https://"))
  )
    return undefined;
  try {
    const parsed = new URL(value, "https://aureform.invalid");
    const fragment = parsed.hash.slice(1);
    const parameters = [
      parsed.searchParams,
      new URLSearchParams(
        fragment.includes("?")
          ? fragment.slice(fragment.indexOf("?") + 1)
          : fragment,
      ),
    ];
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parameters.some((params) =>
        [...params.keys()].some((key) =>
          /^(?:token|(?:access|refresh|id)[_-]?token|api[-_]?key|secret|password|authorization|signature|sig|x-amz-.+)$/i.test(
            key,
          ),
        ),
      )
    )
      return undefined;
    return value;
  } catch {
    return undefined;
  }
}

function boundedText(
  value: unknown,
  limit: number,
  required = false,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= limit &&
    (!required || Boolean(value.trim()))
  );
}

/** Runtime validation also covers adapters that return JSON without the core adapter. */
export function parseShellSearchResult(value: unknown): ShellSearchResult {
  if (
    !value ||
    typeof value !== "object" ||
    !("hits" in value) ||
    !Array.isArray(value.hits) ||
    value.hits.length > 100 ||
    !("total" in value) ||
    typeof value.total !== "number" ||
    !Number.isSafeInteger(value.total) ||
    value.total < value.hits.length ||
    value.total > 1_000_000_000
  )
    throw new SearchBridgeError("provider-error");

  const hits = value.hits.map((hit: unknown): IntegrationSearchHit => {
    if (
      !hit ||
      typeof hit !== "object" ||
      !("id" in hit) ||
      !boundedText(hit.id, 500, true) ||
      !("title" in hit) ||
      !boundedText(hit.title, 2000, true) ||
      !("snippet" in hit) ||
      !boundedText(hit.snippet, 12_000) ||
      !("source" in hit) ||
      !boundedText(hit.source, 2000) ||
      ("score" in hit &&
        hit.score !== undefined &&
        (typeof hit.score !== "number" || !Number.isFinite(hit.score)))
    )
      throw new SearchBridgeError("provider-error");
    const url = searchBridgeHref("url" in hit ? hit.url : undefined);
    return {
      id: hit.id,
      title: hit.title,
      snippet: hit.snippet,
      source: hit.source,
      ...(url ? { url } : {}),
      ...("score" in hit && typeof hit.score === "number"
        ? { score: hit.score }
        : {}),
    };
  });
  return { hits, total: value.total };
}

const resourceFields = new Set([
  "resourceId",
  "resource",
  "source",
  "sourceId",
  "collectionId",
  "indexId",
  "indexName",
  "collectionName",
]);

export type IntegrationSearchBridgeOptions = {
  adapter: IntegrationsAdapter;
  definition: IntegrationDefinition;
  resourceId?: string;
  /** Resolve the current workspace connection's provider-specific vocabulary. */
  actionsForOption?: (optionId: string) => readonly IntegrationAction[];
  /** Public business inputs for any additional required action fields. */
  values?: IntegrationValues;
};

/**
 * Read the connection afresh for each requested workspace. This bridge never
 * substitutes demo data, creates a connection or searches an unselected resource.
 */
export function createIntegrationSearchBridge({
  adapter,
  definition,
  resourceId,
  actionsForOption,
  values = {},
}: IntegrationSearchBridgeOptions): ShellSearchAdapter {
  return {
    mode: adapter.mode,
    async search({ workspaceId, query, signal }) {
      const text = query.trim();
      if (!workspaceId || !text || text.length > 2000)
        throw new SearchBridgeError("validation");
      if (signal.aborted) throw new SearchBridgeError("cancelled");
      const scope = { workspaceId, signal };
      const connection = await adapter.get(definition.id, scope);
      if (signal.aborted) throw new SearchBridgeError("cancelled");
      if (
        connection.workspaceId !== workspaceId ||
        connection.integrationId !== definition.id
      )
        throw new SearchBridgeError("permission-denied");
      if (
        !definition.options.some(
          (option) => option.id === connection.providerOptionId,
        )
      )
        throw new SearchBridgeError("configuration-required");
      if (connection.status !== "connected")
        throw new SearchBridgeError(
          connection.status === "expired"
            ? "expired"
            : connection.status === "permission-denied"
              ? "permission-denied"
              : "configuration-required",
        );
      const available = actionsForOption
        ? actionsForOption(connection.providerOptionId).filter((candidate) =>
            definition.actions.some((declared) => declared.id === candidate.id),
          )
        : definition.actions;
      const action =
        available.find((candidate) => candidate.kind === "search") ??
        available.find((candidate) => candidate.kind === "query");
      if (!action) throw new SearchBridgeError("configuration-required");
      if (
        action.requiredPermissions?.some(
          (permission) => !connection.grantedPermissions.includes(permission),
        )
      )
        throw new SearchBridgeError("permission-denied");

      const source = resourceId ?? connection.resourceIds[0];
      if (source && !connection.resourceIds.includes(source))
        throw new SearchBridgeError("permission-denied");
      const input: IntegrationValues = {
        ...Object.fromEntries(
          action.fields.map((field) => [
            field.id,
            field.type === "toggle"
              ? false
              : field.type === "select"
                ? (field.options?.[0]?.value ?? "")
                : "",
          ]),
        ),
        ...values,
        query: text,
        page: 0,
        pageIndex: 0,
        pageNumber: 1,
        pageSize: 20,
        limit: 20,
        offset: 0,
        ...(source ? { resourceId: source } : {}),
      };
      for (const field of action.fields) {
        if (source && resourceFields.has(field.id) && !input[field.id])
          input[field.id] = source;
        const value = input[field.id];
        if (
          field.required &&
          (value === undefined ||
            (typeof value === "string" && !value.trim()) ||
            (Array.isArray(value) && !value.length))
        )
          throw new SearchBridgeError("validation");
      }
      if (signal.aborted) throw new SearchBridgeError("cancelled");
      const result = await adapter.execute(
        {
          integrationId: definition.id,
          connectionId: connection.id,
          actionId: action.id,
          values: input,
        },
        scope,
      );
      if (signal.aborted) throw new SearchBridgeError("cancelled");
      if (result.kind !== "search")
        throw new SearchBridgeError("provider-error");
      return parseShellSearchResult(result);
    },
  };
}

/**
 * The same gate is used by the palette and tested independently. An adapter
 * ignoring AbortSignal still cannot publish an obsolete result or rejection.
 */
export function createSearchBridgeSession() {
  let sequence = 0;
  let controller: AbortController | null = null;
  const cancel = () => {
    sequence += 1;
    controller?.abort();
    controller = null;
  };
  return {
    cancel,
    async run(
      adapter: ShellSearchAdapter,
      input: Omit<ShellSearchRequest, "signal">,
    ): Promise<ShellSearchResult | null> {
      cancel();
      const ticket = sequence;
      const active = new AbortController();
      controller = active;
      try {
        const response = await adapter.search({
          ...input,
          signal: active.signal,
        });
        if (active.signal.aborted || ticket !== sequence) return null;
        return parseShellSearchResult(response);
      } catch (cause) {
        if (active.signal.aborted || ticket !== sequence) return null;
        throw new SearchBridgeError(searchBridgeErrorCode(cause));
      } finally {
        if (ticket === sequence) controller = null;
      }
    },
  };
}

export type SearchFacetSelection = Record<string, string[]>;

/** Stable serialization keeps pagination tied to the last submitted selection. */
export function serializeSearchFacets(selection: SearchFacetSelection): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(selection)
        .filter(([, values]) => Array.isArray(values) && values.length)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, values]) => [id, [...new Set(values)].sort()]),
    ),
  );
}

/** Only a value explicitly offered by this backend response can be selected. */
export function selectSearchFacet(
  selection: SearchFacetSelection,
  facet: IntegrationSearchFacet,
  value: string,
  checked: boolean,
): SearchFacetSelection {
  if (!facet.buckets.some((bucket) => bucket.value === value)) return selection;
  const selected = Array.isArray(selection[facet.id])
    ? selection[facet.id]
    : [];
  const next = checked
    ? facet.selection === "single"
      ? [value]
      : [...new Set([...selected, value])]
    : selected.filter((item) => item !== value);
  return Object.fromEntries([
    ...Object.entries(selection).filter(([id]) => id !== facet.id),
    ...(next.length ? [[facet.id, next]] : []),
  ]);
}

export function filterShellNavigation<
  T extends { label: string; keywords?: string[] },
>(items: T[], query: string): T[] {
  const normalize = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  const normalizedQuery = normalize(query);
  const terms = normalizedQuery.split(" ").filter(Boolean);
  const exactMatches: T[] = [];
  const partialMatches: T[] = [];
  for (const item of items) {
    const text = normalize([item.label, ...(item.keywords ?? [])].join(" "));
    if (!terms.every((term) => text.includes(term))) continue;
    // Rank only local titles; preserve catalog order within each match tier.
    const matches =
      normalizedQuery && normalize(item.label) === normalizedQuery
        ? exactMatches
        : partialMatches;
    matches.push(item);
  }
  return [...exactMatches, ...partialMatches];
}
