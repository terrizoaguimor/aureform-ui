import { z } from "zod";
import type { CommunicationsProvider } from "./contracts";
import {
  CommunicationsSetupError,
  communicationsSetupConfirmationSchema,
  communicationsSetupCredentialsSchema,
  communicationsSetupInspectionSchema,
  communicationsSetupPlanSchema,
  communicationsSetupResultSchema,
  communicationsSetupStatusSchema,
  communicationsSetupVersion,
  setupErrorMessages,
  setupPublicError,
  type CommunicationsSetupAdapter,
  type CommunicationsSetupConfirmation,
  type CommunicationsSetupCredentials,
  type CommunicationsSetupErrorCode,
  type CommunicationsSetupPlan,
  type CommunicationsSetupResult,
  type CommunicationsSetupSnapshot,
} from "./setup-contracts";

export type LiveCommunicationsSetupAdapterOptions = {
  /** API mount ending in /v1/communications/setup; HTTPS is required. */
  baseUrl: string;
  provider?: CommunicationsProvider;
  fetch?: typeof fetch;
  getAuthHeaders?: () => HeadersInit | Promise<HeadersInit>;
  trustedBackendOrigins?: readonly string[];
  /** Cookie auth is opt-in and requires a supplied x-csrf-token header. */
  authMode?: "bearer" | "cookie-csrf";
  requestTimeoutMs?: number;
  /** An opaque connection supplied by the authenticated host, never a key. */
  connectionId?: string;
};

type Operation = {
  id: number;
  kind: NonNullable<CommunicationsSetupSnapshot["busy"]>;
  controller: AbortController;
  dispatched: boolean;
  timer: ReturnType<typeof setTimeout>;
};

/** Internal ports also used by the network-free demo. Responses are untrusted. */
export type SetupOperations = {
  inspect(
    credentials: CommunicationsSetupCredentials,
    signal: AbortSignal,
  ): Promise<unknown>;
  plan(
    input: { connectionId: string; numberId: string },
    signal: AbortSignal,
  ): Promise<unknown>;
  apply(
    input: {
      planId: string;
      confirmation: CommunicationsSetupConfirmation;
    },
    signal: AbortSignal,
    dispatched: () => void,
  ): Promise<unknown>;
  status(connectionId: string, signal: AbortSignal): Promise<unknown>;
};

function fail(code: CommunicationsSetupErrorCode): never {
  throw new CommunicationsSetupError(code);
}

function normalizeError(error: unknown): CommunicationsSetupError {
  return new CommunicationsSetupError(
    error instanceof CommunicationsSetupError &&
      Object.prototype.hasOwnProperty.call(setupErrorMessages, error.code)
      ? error.code
      : "network-error",
  );
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function withCancellation<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(new CommunicationsSetupError("request-cancelled"));
    if (signal.aborted) {
      // Attach a rejection handler even if the host's promise ignores abort.
      void promise.catch(() => {});
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort))
      .catch(() => {});
  });
}

function publicResult(
  plan: CommunicationsSetupPlan,
): CommunicationsSetupResult {
  return {
    contractVersion: communicationsSetupVersion,
    connectionId: plan.connectionId,
    provider: plan.provider,
    number: plan.number,
    phase: "unknown",
    checks: {
      credentials: "passed",
      webhooks: "pending",
      browser: "pending",
      testCall: "pending",
    },
    error: setupPublicError("setup-reconciliation-required"),
  };
}

/**
 * A bounded state machine shared by live and fixture transports. Only public
 * DTOs survive an operation. Late or cancelled promises cannot publish state.
 */
export function createSetupController(options: {
  mode: "demo" | "live";
  provider?: CommunicationsProvider;
  operations: SetupOperations;
  requestTimeoutMs?: number;
  connectionId?: string;
  now?: () => number;
}): CommunicationsSetupAdapter {
  const provider = options.provider ?? "twilio";
  if (!["twilio", "telnyx"].includes(provider)) fail("invalid-configuration");
  if (
    options.connectionId !== undefined &&
    !z.uuid({ version: "v4" }).safeParse(options.connectionId).success
  )
    fail("invalid-configuration");
  const timeout = options.requestTimeoutMs ?? 15000;
  if (!Number.isFinite(timeout) || timeout < 1 || timeout > 120000)
    fail("invalid-configuration");
  const now = options.now ?? Date.now;
  let recoveryId = options.connectionId;
  const initial: CommunicationsSetupSnapshot = freeze({
    mode: options.mode,
    provider,
    phase: recoveryId ? "unknown" : "credentials",
    busy: null,
    inspection: null,
    plan: null,
    result: null,
    error: recoveryId
      ? setupPublicError("setup-reconciliation-required")
      : null,
  });
  let snapshot = initial;
  let active: Operation | null = null;
  let sequence = 0;
  let disposed = false;
  const listeners = new Set<() => void>();

  function update(patch: Partial<CommunicationsSetupSnapshot>) {
    if (disposed) return;
    snapshot = freeze({ ...snapshot, ...patch });
    for (const listener of listeners) {
      // A consumer subscriber must not corrupt a completed setup operation.
      try {
        listener();
      } catch {
        /* Subscriber owns its exception. */
      }
    }
  }

  function available() {
    if (disposed) fail("disposed");
    if (active) fail("setup-busy");
  }
  function current(operation: Operation) {
    return !disposed && active?.id === operation.id;
  }
  function guard(operation: Operation) {
    if (!current(operation) || operation.controller.signal.aborted)
      fail("request-cancelled");
  }

  async function perform<T>(
    kind: Operation["kind"],
    work: (operation: Operation) => Promise<T>,
    accept: (value: T) => void,
    reject: (error: CommunicationsSetupError, operation: Operation) => void,
    patch: Partial<CommunicationsSetupSnapshot> = {},
  ): Promise<T> {
    available();
    const controller = new AbortController();
    const operation: Operation = {
      id: ++sequence,
      kind,
      controller,
      dispatched: false,
      timer: setTimeout(() => controller.abort(), timeout),
    };
    active = operation;
    update({ ...patch, busy: kind, error: null });
    try {
      guard(operation);
      const value = await withCancellation(work(operation), controller.signal);
      guard(operation);
      accept(value);
      return value;
    } catch (error) {
      const safe = normalizeError(error);
      if (current(operation)) reject(safe, operation);
      throw safe;
    } finally {
      clearTimeout(operation.timer);
      if (current(operation)) {
        active = null;
        update({ busy: null });
      }
    }
  }

  function cancel() {
    if (!active || disposed) return;
    const operation = active;
    active = null;
    ++sequence;
    clearTimeout(operation.timer);
    operation.controller.abort();
    if (operation.kind === "apply" && operation.dispatched && snapshot.plan) {
      update({
        phase: "unknown",
        result: publicResult(snapshot.plan),
        busy: null,
        error: setupPublicError("setup-reconciliation-required"),
      });
    } else {
      update({
        busy: null,
        phase:
          operation.kind === "apply"
            ? "review"
            : operation.kind === "plan"
              ? "select-number"
              : snapshot.phase,
        error: null,
      });
    }
  }

  return {
    mode: options.mode,
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe(listener) {
      if (!disposed) listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setProvider(nextProvider) {
      available();
      if (
        snapshot.phase !== "credentials" ||
        !["twilio", "telnyx"].includes(nextProvider)
      )
        fail("invalid-state");
      recoveryId = undefined;
      update({
        provider: nextProvider,
        inspection: null,
        plan: null,
        result: null,
        error: null,
      });
    },
    async inspect(credentials) {
      available();
      if (snapshot.phase !== "credentials") fail("invalid-state");
      const parsed =
        communicationsSetupCredentialsSchema.safeParse(credentials);
      if (!parsed.success || parsed.data.provider !== snapshot.provider) {
        update({ error: setupPublicError("invalid-credentials") });
        return fail("invalid-credentials");
      }
      // This local reference is not copied to the adapter or any public DTO.
      let ephemeral: CommunicationsSetupCredentials | null = parsed.data;
      try {
        return await perform(
          "inspect",
          async (operation) => {
            const input = ephemeral!;
            const raw = await options.operations.inspect(
              input,
              operation.controller.signal,
            );
            guard(operation);
            const response = communicationsSetupInspectionSchema.safeParse(raw);
            if (!response.success || response.data.provider !== input.provider)
              return fail("invalid-response");
            // Even a nominally valid response must not echo submitted keys.
            const publicText = JSON.stringify(response.data);
            const values = Object.entries(input)
              .filter(([key]) => key !== "provider")
              .map(([, value]) => value);
            if (values.some((value) => publicText.includes(value)))
              return fail("invalid-response");
            return response.data;
          },
          (inspection) => {
            recoveryId = inspection.connectionId;
            update({
              phase: "select-number",
              inspection,
              plan: null,
              result: null,
            });
          },
          (error) =>
            update({
              phase: "credentials",
              inspection: null,
              plan: null,
              result: null,
              error: error.toJSON(),
            }),
        );
      } finally {
        ephemeral = null;
      }
    },
    async plan(numberId) {
      available();
      const inspection = snapshot.inspection;
      if (snapshot.phase !== "select-number" || !inspection)
        fail("invalid-state");
      const selected = inspection.numbers.find(
        (number) => number.id === numberId,
      );
      if (!selected?.voiceEnabled) {
        update({ error: setupPublicError("number-not-eligible") });
        return fail("number-not-eligible");
      }
      return perform(
        "plan",
        async (operation) => {
          const raw = await options.operations.plan(
            { connectionId: inspection.connectionId, numberId },
            operation.controller.signal,
          );
          const parsed = communicationsSetupPlanSchema.safeParse(raw);
          if (
            !parsed.success ||
            parsed.data.connectionId !== inspection.connectionId ||
            parsed.data.provider !== inspection.provider ||
            parsed.data.number.id !== selected.id ||
            parsed.data.number.phoneNumber !== selected.phoneNumber
          )
            return fail("invalid-response");
          if (Date.parse(parsed.data.expiresAt) <= now())
            return fail("setup-plan-expired");
          return parsed.data;
        },
        (plan) => update({ phase: "review", plan, result: null }),
        (error) =>
          update({
            ...(error.code === "setup-reconciliation-required"
              ? { phase: "unknown" as const, result: null }
              : {}),
            error: error.toJSON(),
          }),
      );
    },
    async apply(confirmation) {
      available();
      if (["unknown", "configuring", "failed"].includes(snapshot.phase))
        fail("setup-reconciliation-required");
      const plan = snapshot.plan;
      if (snapshot.phase !== "review" || !plan) fail("invalid-state");
      const parsed =
        communicationsSetupConfirmationSchema.safeParse(confirmation);
      if (!parsed.success) {
        update({ error: setupPublicError("setup-confirmation-required") });
        return fail("setup-confirmation-required");
      }
      if (plan.willReplaceRouting && !parsed.data.replaceExistingRouting) {
        update({
          error: setupPublicError("routing-replacement-confirmation-required"),
        });
        return fail("routing-replacement-confirmation-required");
      }
      if (Date.parse(plan.expiresAt) <= now()) {
        update({ error: setupPublicError("setup-plan-expired") });
        return fail("setup-plan-expired");
      }
      return perform(
        "apply",
        async (operation) => {
          const raw = await options.operations.apply(
            { planId: plan.planId, confirmation: parsed.data },
            operation.controller.signal,
            () => {
              guard(operation);
              operation.dispatched = true;
            },
          );
          const result = communicationsSetupResultSchema.safeParse(raw);
          if (
            !result.success ||
            result.data.connectionId !== plan.connectionId ||
            result.data.provider !== plan.provider ||
            result.data.number.id !== plan.number.id ||
            result.data.number.phoneNumber !== plan.number.phoneNumber
          )
            return fail("invalid-response");
          return result.data;
        },
        (result) =>
          update({
            phase: result.phase,
            result,
            error:
              result.error ??
              (result.phase === "configured"
                ? null
                : setupPublicError("setup-reconciliation-required")),
          }),
        (error, operation) =>
          update(
            operation.dispatched
              ? {
                  phase: "unknown",
                  result: publicResult(plan),
                  error: setupPublicError("setup-reconciliation-required"),
                }
              : { phase: "review", error: error.toJSON() },
          ),
        { phase: "configuring" },
      );
    },
    async reconcile(connectionId) {
      available();
      const target = connectionId ?? recoveryId;
      if (!target || !z.uuid({ version: "v4" }).safeParse(target).success)
        fail("invalid-state");
      if (connectionId && recoveryId && connectionId !== recoveryId)
        fail("invalid-state");
      return perform(
        "status",
        async (operation) => {
          const raw = await options.operations.status(
            target,
            operation.controller.signal,
          );
          const result = communicationsSetupStatusSchema.safeParse(raw);
          if (
            !result.success ||
            result.data.connectionId !== target ||
            result.data.provider !== snapshot.provider ||
            (snapshot.plan &&
              result.data.number &&
              (result.data.number.id !== snapshot.plan.number.id ||
                result.data.number.phoneNumber !==
                  snapshot.plan.number.phoneNumber))
          )
            return fail("invalid-response");
          return result.data;
        },
        (result) => {
          recoveryId = result.connectionId;
          update({
            phase:
              result.phase === "select-number" && !snapshot.inspection
                ? "credentials"
                : result.phase,
            result,
            plan: result.phase === "select-number" ? null : snapshot.plan,
            error:
              result.error ??
              (["unknown", "failed"].includes(result.phase)
                ? setupPublicError("setup-reconciliation-required")
                : null),
          });
        },
        (error) => update({ error: error.toJSON() }),
      );
    },
    back() {
      if (disposed) fail("disposed");
      if (
        ["configuring", "unknown", "failed", "configured"].includes(
          snapshot.phase,
        )
      )
        fail("setup-reconciliation-required");
      cancel();
      if (snapshot.phase === "review") {
        update({
          phase: "select-number",
          plan: null,
          result: null,
          error: null,
        });
      } else {
        recoveryId = undefined;
        update({
          phase: "credentials",
          inspection: null,
          plan: null,
          result: null,
          error: null,
        });
      }
    },
    cancel,
    dispose() {
      if (disposed) return;
      cancel();
      disposed = true;
      recoveryId = undefined;
      listeners.clear();
    },
  };
}

function approvedBase(
  baseInput: string,
  trustedOrigins: readonly string[],
): URL {
  try {
    if (
      typeof baseInput !== "string" ||
      /[\u0000-\u0020\u007f\\?#%]/.test(baseInput) ||
      /(?:^|\/)\.\.?(?:\/|$)/.test(baseInput)
    )
      return fail("invalid-configuration");
    const relative = baseInput.startsWith("/") && !baseInput.startsWith("//");
    const locationOrigin =
      typeof location === "undefined" ? undefined : location.origin;
    const url = new URL(baseInput, relative ? locationOrigin : undefined);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/\/v1\/communications\/setup\/?$/.test(url.pathname) ||
      !trustedOrigins.includes(url.origin)
    )
      return fail("invalid-configuration");
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url;
  } catch {
    return fail("invalid-configuration");
  }
}

function responseError(status: number, raw: unknown): CommunicationsSetupError {
  const wire =
    raw && typeof raw === "object" && "error" in raw
      ? (raw as { error: unknown }).error
      : null;
  const code =
    wire && typeof wire === "object" && "code" in wire
      ? (wire as { code: unknown }).code
      : null;
  // Reference aliases are normalized; arbitrary provider text is never shown.
  if (code === "unauthorized" || code === "session-expired")
    return new CommunicationsSetupError("authentication-required");
  if (code === "origin-denied" || code === "forbidden")
    return new CommunicationsSetupError("permission-denied");
  if (
    typeof code === "string" &&
    Object.prototype.hasOwnProperty.call(setupErrorMessages, code)
  )
    return new CommunicationsSetupError(code as CommunicationsSetupErrorCode);
  return new CommunicationsSetupError(
    status === 401
      ? "authentication-required"
      : status === 403
        ? "permission-denied"
        : status === 409
          ? "setup-reconciliation-required"
          : status >= 500
            ? "network-error"
            : "invalid-response",
  );
}

/** No request, auth lookup, SDK, storage or browser permission on construction. */
export function createLiveCommunicationsSetupAdapter(
  options: LiveCommunicationsSetupAdapterOptions,
): CommunicationsSetupAdapter {
  const baseInput = options.baseUrl;
  const trustedOrigins = [...(options.trustedBackendOrigins ?? [])];
  const fetcher = options.fetch ?? globalThis.fetch;
  const getAuthHeaders = options.getAuthHeaders;
  const authMode = options.authMode ?? "bearer";

  async function request(
    resource: "inspect" | "plan" | "apply" | "status",
    signal: AbortSignal,
    body?: unknown,
    dispatched?: () => void,
    connectionId?: string,
  ): Promise<unknown> {
    // Validate destination before asking the host for authentication material.
    const base = approvedBase(baseInput, trustedOrigins);
    if (
      typeof fetcher !== "function" ||
      !getAuthHeaders ||
      !["bearer", "cookie-csrf"].includes(authMode)
    )
      return fail("invalid-configuration");
    const supplied = await withCancellation(
      Promise.resolve().then(getAuthHeaders),
      signal,
    );
    let headers: Headers;
    try {
      headers = new Headers(supplied);
    } catch {
      return fail("authentication-required");
    }
    for (const [name, value] of headers) {
      if (
        !["authorization", "x-csrf-token"].includes(name) ||
        !/^[\x21-\x7e][\x20-\x7e]{0,4095}$/.test(value)
      )
        return fail("authentication-required");
    }
    if (
      (authMode === "bearer" &&
        !/^Bearer [A-Za-z0-9._~+/-]+=*$/i.test(
          headers.get("authorization") ?? "",
        )) ||
      (authMode === "cookie-csrf" && !headers.get("x-csrf-token"))
    )
      return fail("authentication-required");
    if (signal.aborted) return fail("request-cancelled");
    headers.set("accept", "application/json");
    if (resource !== "status") headers.set("content-type", "application/json");
    const url = new URL(`${base.href}/${resource}`);
    if (resource === "status") {
      if (
        !connectionId ||
        !z.uuid({ version: "v4" }).safeParse(connectionId).success
      )
        return fail("invalid-state");
      url.searchParams.set("connectionId", connectionId);
    }
    const response = await withCancellation(
      Promise.resolve().then(() => {
        if (signal.aborted) return fail("request-cancelled");
        dispatched?.();
        return fetcher(url.href, {
          method: resource === "status" ? "GET" : "POST",
          headers,
          ...(resource === "status" ? {} : { body: JSON.stringify(body) }),
          signal,
          credentials: authMode === "cookie-csrf" ? "include" : "omit",
          cache: "no-store",
          redirect: "error",
          referrerPolicy: "no-referrer",
        });
      }),
      signal,
    );
    if (
      response.redirected ||
      (response.url && response.url !== url.href) ||
      !/^(?:application\/json|application\/[\w.+-]+\+json)(?:;|$)/i.test(
        response.headers.get("content-type") ?? "",
      ) ||
      Number(response.headers.get("content-length") ?? "0") > 1048576
    )
      return fail("invalid-response");
    const text = await withCancellation(response.text(), signal);
    if (text.length > 1048576) return fail("invalid-response");
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return fail("invalid-response");
    }
    if (!response.ok) throw responseError(response.status, raw);
    return raw;
  }

  return createSetupController({
    mode: "live",
    provider: options.provider,
    requestTimeoutMs: options.requestTimeoutMs,
    connectionId: options.connectionId,
    operations: {
      inspect: (credentials, signal) => request("inspect", signal, credentials),
      plan: (input, signal) => request("plan", signal, input),
      apply: (input, signal, dispatched) =>
        request("apply", signal, input, dispatched),
      status: (connectionId, signal) =>
        request("status", signal, undefined, undefined, connectionId),
    },
  });
}
