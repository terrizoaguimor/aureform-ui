export const DEMO_AUTH_SESSION_KEY = "aureform:demo-session";
export const SOCIAL_AUTH_PROVIDERS = ["google", "github", "microsoft"] as const;

export type SocialAuthProvider = (typeof SOCIAL_AUTH_PROVIDERS)[number];
export type AuthIntent = "sign-in" | "sign-up";
export type DemoAuthProvider = SocialAuthProvider | "email" | "otp";

/** Local display data only. This is never proof of identity or authorization. */
export interface DemoAuthSession {
  version: 1;
  demo: true;
  provider: DemoAuthProvider;
  name: string;
  email: string;
  createdAt: string;
}

export type DemoAuthStorage = Pick<Storage, "setItem">;
export type DemoAuthPersistence = "local" | "memory";

export interface ProviderSignInRequest {
  provider: SocialAuthProvider;
  intent: AuthIntent;
  /** Required for sign-up, including when a consumer injects its own adapter. */
  consent: boolean;
  /** Abort pending work when the UI is unmounted; check before side effects. */
  signal?: AbortSignal;
}

export type ProviderSignInResult =
  | {
      kind: "demo";
      session: DemoAuthSession;
      persistence: DemoAuthPersistence;
    }
  | {
      /** The consumer owns authentication, its server session and any redirect. */
      kind: "handled";
    };

/**
 * Inject from a Client Component. Return `handled` when your application owns
 * the flow, or `demo` for local preview data. Never return passwords or tokens.
 * Reject to display a retryable error; raw exception messages are not rendered.
 */
export type ProviderSignInHandler = (
  request: ProviderSignInRequest,
) => Promise<ProviderSignInResult>;

export interface AuthAdapter {
  signInWithProvider: ProviderSignInHandler;
}

type DemoAuthErrorCode =
  | "consent-required"
  | "invalid-request"
  | "invalid-session"
  | "aborted"
  | "busy";

export class DemoAuthError extends Error {
  readonly code: DemoAuthErrorCode;

  constructor(code: DemoAuthErrorCode) {
    super(`Demo auth: ${code}`);
    this.name = "DemoAuthError";
    this.code = code;
  }
}

export function validateProviderSignInRequest(request: ProviderSignInRequest) {
  if (
    !SOCIAL_AUTH_PROVIDERS.includes(request.provider) ||
    !["sign-in", "sign-up"].includes(request.intent)
  ) {
    throw new DemoAuthError("invalid-request");
  }
  if (request.intent === "sign-up" && request.consent !== true) {
    throw new DemoAuthError("consent-required");
  }
  if (request.signal?.aborted) throw new DemoAuthError("aborted");
}

function safeDemoSession(session: DemoAuthSession): DemoAuthSession {
  if (
    session?.version !== 1 ||
    session.demo !== true ||
    ![...SOCIAL_AUTH_PROVIDERS, "email", "otp"].includes(session.provider) ||
    typeof session.name !== "string" ||
    !session.name.trim() ||
    session.name.length > 160 ||
    typeof session.email !== "string" ||
    !session.email.trim() ||
    session.email.length > 254 ||
    typeof session.createdAt !== "string" ||
    !Number.isFinite(Date.parse(session.createdAt))
  ) {
    throw new DemoAuthError("invalid-session");
  }
  // Reconstruct an allowlist rather than serializing an adapter's object.
  return {
    version: 1,
    demo: true,
    provider: session.provider,
    name: session.name.trim(),
    email: session.email.trim(),
    createdAt: session.createdAt,
  };
}

export function createDemoAuthSession(
  provider: DemoAuthProvider,
  identity?: { name?: string; email?: string },
): DemoAuthSession {
  return safeDemoSession({
    version: 1,
    demo: true,
    provider,
    name: identity?.name || "Alex Morgan",
    email:
      identity?.email ||
      (SOCIAL_AUTH_PROVIDERS.includes(provider as SocialAuthProvider)
        ? `alex.${provider}@example.com`
        : "alex.morgan@example.com"),
    createdAt: new Date().toISOString(),
  });
}

/**
 * Only the session allowlist is written. SecurityError, quota errors, SSR and
 * explicit `null` storage fall back to the result held in component memory.
 */
export function persistDemoAuthSession(
  session: DemoAuthSession,
  storage?: DemoAuthStorage | null,
): DemoAuthPersistence {
  const safeSession = safeDemoSession(session);
  try {
    const target =
      storage === undefined
        ? typeof window === "undefined"
          ? null
          : window.localStorage
        : storage;
    if (!target) return "memory";
    target.setItem(DEMO_AUTH_SESSION_KEY, JSON.stringify(safeSession));
    return "local";
  } catch {
    return "memory";
  }
}

export function waitForDemoAuth(
  milliseconds = 350,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DemoAuthError("aborted"));
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new DemoAuthError("aborted"));
    };
    const timer = setTimeout(
      () => {
        signal?.removeEventListener("abort", abort);
        resolve();
      },
      Math.max(0, milliseconds),
    );
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/** No network calls, OAuth navigation, cookies, passwords or access tokens. */
export function createDemoAuthAdapter({
  storage,
  delayMs = 350,
}: {
  storage?: DemoAuthStorage | null;
  delayMs?: number;
} = {}): AuthAdapter {
  return {
    async signInWithProvider(request) {
      validateProviderSignInRequest(request);
      await waitForDemoAuth(delayMs, request.signal);
      if (request.signal?.aborted) throw new DemoAuthError("aborted");
      const session = createDemoAuthSession(request.provider);
      return {
        kind: "demo",
        session,
        persistence: persistDemoAuthSession(session, storage),
      };
    },
  };
}

/**
 * One in-flight request per UI instance, including injected adapters. Duplicate
 * calls return null, validation happens before the callback, and failure unlocks
 * retries. This guard is UX behavior, never a server authorization check.
 */
export function createProviderSignInRunner() {
  let pending = false;
  return {
    get pending() {
      return pending;
    },
    async signIn(
      request: ProviderSignInRequest,
      handler: ProviderSignInHandler,
    ): Promise<ProviderSignInResult | null> {
      if (pending) return null;
      validateProviderSignInRequest(request);
      pending = true;
      try {
        const result = await handler(request);
        if (request.signal?.aborted) throw new DemoAuthError("aborted");
        if (result?.kind === "handled") return { kind: "handled" };
        if (
          result?.kind !== "demo" ||
          !["local", "memory"].includes(result.persistence)
        ) {
          throw new DemoAuthError("invalid-session");
        }
        const session = safeDemoSession(result.session);
        if (session.provider !== request.provider) {
          throw new DemoAuthError("invalid-session");
        }
        return {
          kind: "demo",
          session,
          persistence: result.persistence,
        };
      } finally {
        pending = false;
      }
    },
  };
}
