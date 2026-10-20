import { z } from "zod";

/**
 * Presentation contracts, never proof of authorization. A consumer backend owns
 * password checks, challenges, cookies, sessions, memberships and provider SDKs.
 */
export const AUTH_WORKFLOW_PROVIDERS = [
  "better-auth",
  "clerk",
  "supabase-auth",
  "authjs",
  "workos",
  "auth0",
] as const;
export type AuthWorkflowProvider = (typeof AUTH_WORKFLOW_PROVIDERS)[number];
export type AuthWorkflowScope = { signal?: AbortSignal };
export type AuthRedirectPolicy = {
  /** Exact application origin; HTTPS, or an explicitly configured local origin. */
  origin: string;
  /** Additional exact HTTPS origins. No wildcard or subdomain matching. */
  allowedOrigins?: readonly string[];
};

const id = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .regex(/^[\w.:@-]+$/);
const name = z.string().trim().min(2).max(160);
const email = z.string().trim().max(254).pipe(z.email());
const timestamp = z.iso.datetime({ offset: true });
const password = z
  .string()
  .min(1)
  .max(1024)
  .refine((v) => !v.includes("\0"));
const newPassword = password.min(8);
const code = z
  .string()
  .trim()
  .min(6)
  .max(128)
  .regex(/^[A-Za-z0-9 -]+$/);
const token = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^[^\s\u0000-\u001f\u007f]+$/);
const role = z.enum(["owner", "admin", "member"]);
const assignableRole = z.enum(["admin", "member"]);
const slug = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const empty = z.object({});
const userSchema = z.object({
  id,
  name,
  email,
  emailVerified: z.boolean(),
});
const sessionSchema = z
  .object({
    id,
    user: userSchema,
    createdAt: timestamp,
    expiresAt: timestamp,
  })
  .refine((v) => Date.parse(v.expiresAt) > Date.parse(v.createdAt));
const organizationSchema = z.object({ id, name, slug, role });
const memberSchema = z.object({ id, user: userSchema, role });
const invitationSchema = z
  .object({
    id,
    email,
    role: assignableRole,
    status: z.enum(["pending", "accepted", "revoked"]),
    createdAt: timestamp,
    expiresAt: timestamp,
  })
  .refine((v) => Date.parse(v.expiresAt) > Date.parse(v.createdAt));
const deviceSessionSchema = z
  .object({
    id,
    device: z.string().trim().min(1).max(160),
    location: z.string().trim().min(1).max(160).optional(),
    createdAt: timestamp,
    lastActiveAt: timestamp,
    expiresAt: timestamp,
    current: z.boolean(),
  })
  .refine(
    (v) =>
      Date.parse(v.expiresAt) > Date.parse(v.createdAt) &&
      Date.parse(v.lastActiveAt) >= Date.parse(v.createdAt),
  );
const factorSchema = z.object({
  id,
  type: z.literal("totp"),
  label: z.string().trim().min(1).max(80),
  createdAt: timestamp,
});
const identitySchema = z
  .object({
    session: sessionSchema.nullable(),
    organizations: z.array(organizationSchema).max(1000),
    activeOrganizationId: id.nullable(),
    members: z.array(memberSchema).max(1000),
    invitations: z.array(invitationSchema).max(1000),
    sessions: z.array(deviceSessionSchema).max(1000),
    factors: z.array(factorSchema).max(100),
  })
  .superRefine((value, ctx) => {
    const lists = [
      value.organizations,
      value.members,
      value.invitations,
      value.sessions,
      value.factors,
    ];
    if (
      lists.some(
        (items) => new Set(items.map((item) => item.id)).size !== items.length,
      )
    ) {
      ctx.addIssue({ code: "custom", message: "Duplicate presentation IDs" });
    }
    if (!value.session) {
      if (
        value.activeOrganizationId !== null ||
        lists.some((items) => items.length)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Anonymous identity contains private data",
        });
      }
      return;
    }
    const current = value.sessions.filter((item) => item.current);
    if (current.length !== 1 || current[0].id !== value.session.id) {
      ctx.addIssue({
        code: "custom",
        message: "Current session does not match",
      });
    }
    if (value.activeOrganizationId === null) {
      if (value.members.length || value.invitations.length) {
        ctx.addIssue({
          code: "custom",
          message: "Members require an active organization",
        });
      }
    } else {
      const organization = value.organizations.find(
        (item) => item.id === value.activeOrganizationId,
      );
      const self = value.members.find(
        (item) => item.user.id === value.session?.user.id,
      );
      if (!organization || !self || self.role !== organization.role) {
        ctx.addIssue({
          code: "custom",
          message: "Active membership does not match",
        });
      }
    }
  });
const actionSchema = z.object({ kind: z.literal("ok") });
const verificationSchema = z.object({
  kind: z.literal("verification-required"),
  challengeId: id,
  email,
  codeLength: z.union([z.literal(6), z.literal(8)]).optional(),
});
const mfaChallengeSchema = z.object({
  kind: z.literal("mfa-required"),
  challengeId: id,
  factors: z
    .array(z.enum(["totp", "recovery-code"]))
    .min(1)
    .max(2)
    .refine((items) => new Set(items).size === items.length),
  codeLength: z.union([z.literal(6), z.literal(8)]).optional(),
});
const flowSessionSchema = z.object({
  kind: z.literal("session"),
  session: sessionSchema,
  redirectTo: z.string().min(1).max(2048).optional(),
});
const flowSchema = z.discriminatedUnion("kind", [
  flowSessionSchema,
  verificationSchema,
  mfaChallengeSchema,
]);
const completionSchema = z.union([flowSchema, actionSchema]);
const enrollmentSchema = z.object({
  kind: z.literal("mfa-enrollment"),
  enrollmentId: id,
  secret: z
    .string()
    .min(16)
    .max(128)
    .regex(/^[A-Z2-7]+$/),
  otpauthUri: z.string().min(1).max(2048),
});

export type AuthUser = z.infer<typeof userSchema>;
/** ID is a non-secret display/revocation reference, never a bearer credential. */
export type AuthSession = z.infer<typeof sessionSchema>;
export type AuthOrganization = z.infer<typeof organizationSchema>;
export type AuthMember = z.infer<typeof memberSchema>;
export type AuthInvitation = z.infer<typeof invitationSchema>;
export type AuthDeviceSession = z.infer<typeof deviceSessionSchema>;
export type AuthMfaFactor = z.infer<typeof factorSchema>;
export type AuthIdentityState = z.infer<typeof identitySchema>;
export type AuthFlowResult = z.infer<typeof flowSchema>;
export type AuthActionResult = z.infer<typeof actionSchema>;
export type AuthCompletionResult = z.infer<typeof completionSchema>;
/** Enrollment material is temporary UI state, cleared on completion/cancellation. */
export type AuthMfaEnrollment = z.infer<typeof enrollmentSchema>;
export type AuthRole = z.infer<typeof role>;

const requestSchemas = {
  signIn: z.object({ email, password }),
  signUp: z.object({
    name,
    email,
    password: newPassword,
    consent: z.literal(true),
  }),
  requestPasswordReset: z.object({ email }),
  confirmPasswordReset: z.object({ token, password: newPassword }),
  verifyEmail: z.union([
    z.object({ challengeId: id, code }),
    z.object({ token }),
  ]),
  resendVerification: z.object({ email, challengeId: id.optional() }),
  getSession: empty,
  logout: empty,
  getIdentity: empty,
  updateProfile: z.object({ name }),
  changePassword: z.object({ currentPassword: password, newPassword }),
  enrollMfa: z.object({
    password: password.optional(),
    label: z.string().trim().min(1).max(80),
  }),
  verifyMfa: z.union([
    z
      .object({ enrollmentId: id, code })
      .refine((v) => /^\d{6}(?:\d{2})?$/.test(v.code)),
    z.object({ challengeId: id, code }),
  ]),
  revokeMfa: z.object({
    factorId: id,
    password: password.optional(),
    code: code.optional(),
  }),
  createOrganization: z.object({ name, slug }),
  updateOrganization: z.object({ organizationId: id, name, slug }),
  switchOrganization: z.object({ organizationId: id }),
  deleteOrganization: z.object({ organizationId: id }),
  inviteMember: z.object({ organizationId: id, email, role: assignableRole }),
  revokeInvitation: z.object({ organizationId: id, invitationId: id }),
  acceptInvitation: z.object({ token }),
  updateMemberRole: z.object({
    organizationId: id,
    memberId: id,
    role: assignableRole,
  }),
  removeMember: z.object({ organizationId: id, memberId: id }),
  revokeSession: z.object({ sessionId: id }),
  revokeOtherSessions: empty,
} as const;
const resultSchemas = {
  signIn: flowSchema,
  signUp: completionSchema,
  requestPasswordReset: actionSchema,
  confirmPasswordReset: actionSchema,
  verifyEmail: completionSchema,
  resendVerification: verificationSchema,
  getSession: z.object({
    kind: z.literal("session"),
    session: sessionSchema.nullable(),
  }),
  logout: actionSchema,
  getIdentity: z.object({
    kind: z.literal("identity"),
    identity: identitySchema,
  }),
  updateProfile: actionSchema,
  changePassword: actionSchema,
  enrollMfa: enrollmentSchema,
  verifyMfa: completionSchema,
  revokeMfa: actionSchema,
  createOrganization: actionSchema,
  updateOrganization: actionSchema,
  switchOrganization: actionSchema,
  deleteOrganization: actionSchema,
  inviteMember: actionSchema,
  revokeInvitation: actionSchema,
  acceptInvitation: actionSchema,
  updateMemberRole: actionSchema,
  removeMember: actionSchema,
  revokeSession: actionSchema,
  revokeOtherSessions: actionSchema,
} as const;

export type AuthWorkflowOperation = keyof typeof requestSchemas;
export type AuthWorkflowRequests = {
  [K in AuthWorkflowOperation]: z.infer<(typeof requestSchemas)[K]>;
};
export type AuthWorkflowResults = {
  [K in AuthWorkflowOperation]: z.infer<(typeof resultSchemas)[K]>;
};
export type AuthWorkflowAdapter = {
  readonly mode: "demo" | "consumer";
  readonly providerId: string;
  readonly redirectPolicy?: AuthRedirectPolicy;
} & {
  [K in AuthWorkflowOperation]: (
    request: AuthWorkflowRequests[K],
    scope?: AuthWorkflowScope,
  ) => Promise<AuthWorkflowResults[K]>;
};
/** Callbacks normalize consumer APIs to these DTOs; raw SDK responses are rejected. */
export type AuthWorkflowHandlers = {
  [K in AuthWorkflowOperation]: (
    request: AuthWorkflowRequests[K],
    scope: AuthWorkflowScope,
  ) => unknown | Promise<unknown>;
};

export const AUTH_WORKFLOW_ENDPOINTS = {
  signIn: "sign-in",
  signUp: "sign-up",
  requestPasswordReset: "password/reset/request",
  confirmPasswordReset: "password/reset/confirm",
  verifyEmail: "email/verify",
  resendVerification: "email/resend",
  getSession: "session",
  logout: "logout",
  getIdentity: "identity",
  updateProfile: "profile/update",
  changePassword: "password/change",
  enrollMfa: "mfa/enroll",
  verifyMfa: "mfa/verify",
  revokeMfa: "mfa/revoke",
  createOrganization: "organizations/create",
  updateOrganization: "organizations/update",
  switchOrganization: "organizations/switch",
  deleteOrganization: "organizations/delete",
  inviteMember: "invitations/create",
  revokeInvitation: "invitations/revoke",
  acceptInvitation: "invitations/accept",
  updateMemberRole: "members/role",
  removeMember: "members/remove",
  revokeSession: "sessions/revoke",
  revokeOtherSessions: "sessions/revoke-others",
} as const satisfies Record<AuthWorkflowOperation, string>;

export const AUTH_WORKFLOW_ERROR_CODES = [
  "invalid-request",
  "invalid-response",
  "consent-required",
  "invalid-credentials",
  "invalid-code",
  "unauthorized",
  "forbidden",
  "expired",
  "conflict",
  "rate-limited",
  "unsupported",
  "network",
  "aborted",
  "busy",
  "unsafe-url",
] as const;
export type AuthWorkflowErrorCode = (typeof AUTH_WORKFLOW_ERROR_CODES)[number];
export class AuthWorkflowError extends Error {
  readonly code: AuthWorkflowErrorCode;
  readonly retryAfterSeconds?: number;
  constructor(code: AuthWorkflowErrorCode, retryAfterSeconds?: number) {
    // Do not retain a provider error, request body, password or response text.
    const safeCode = AUTH_WORKFLOW_ERROR_CODES.includes(code)
      ? code
      : "network";
    super(`Identity workflow: ${safeCode}`);
    this.name = "AuthWorkflowError";
    this.code = safeCode;
    if (
      Number.isInteger(retryAfterSeconds) &&
      retryAfterSeconds! >= 0 &&
      retryAfterSeconds! <= 86400
    ) {
      this.retryAfterSeconds = retryAfterSeconds;
    }
  }
}
export function authWorkflowErrorMessage(
  error: unknown,
  locale: string = "en",
): string {
  const code =
    error instanceof AuthWorkflowError &&
    AUTH_WORKFLOW_ERROR_CODES.includes(error.code)
      ? error.code
      : "network";
  const messages: Record<AuthWorkflowErrorCode, [string, string]> = {
    "invalid-request": [
      "Check the fields and try again.",
      "Revisa los campos e inténtalo de nuevo.",
    ],
    "invalid-response": [
      "The identity service returned an incomplete response. Try again or contact support.",
      "El servicio de identidad devolvió una respuesta incompleta. Inténtalo de nuevo o contacta a soporte.",
    ],
    "consent-required": [
      "Accept the account terms to continue.",
      "Acepta los términos de la cuenta para continuar.",
    ],
    "invalid-credentials": [
      "The email or password could not be verified.",
      "No se pudo verificar el correo o la contraseña.",
    ],
    "invalid-code": [
      "The code could not be verified. Check it and try again.",
      "No se pudo verificar el código. Revísalo e inténtalo de nuevo.",
    ],
    unauthorized: [
      "Sign in again to continue.",
      "Inicia sesión de nuevo para continuar.",
    ],
    forbidden: [
      "Your account does not have permission for this action.",
      "Tu cuenta no tiene permiso para esta acción.",
    ],
    expired: [
      "This challenge or session has expired. Request a new one.",
      "Este desafío o sesión venció. Solicita uno nuevo.",
    ],
    conflict: [
      "This record changed or already exists. Refresh and try again.",
      "Este registro cambió o ya existe. Actualiza e inténtalo de nuevo.",
    ],
    "rate-limited": [
      "Too many requests. Wait before trying again.",
      "Demasiadas solicitudes. Espera antes de intentarlo de nuevo.",
    ],
    unsupported: [
      "Your identity service has not enabled this operation.",
      "Tu servicio de identidad no ha habilitado esta operación.",
    ],
    network: [
      "Could not reach the identity service. Please try again.",
      "No se pudo contactar al servicio de identidad. Inténtalo de nuevo.",
    ],
    aborted: ["The request was cancelled.", "La solicitud se canceló."],
    busy: [
      "Wait for the current request to finish.",
      "Espera a que termine la solicitud actual.",
    ],
    "unsafe-url": [
      "The service returned a redirect or setup URL that is not allowed.",
      "El servicio devolvió una URL de redirección o configuración no permitida.",
    ],
  };
  return messages[code][locale === "es" ? 1 : 0];
}

const unsafeUrlCharacters = /[\u0000-\u0020\u007f\\]/;
function configuredOrigin(value: string): string {
  try {
    if (typeof value !== "string" || unsafeUrlCharacters.test(value))
      throw new Error();
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
      url.username ||
      url.password ||
      url.hostname.includes("*") ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new AuthWorkflowError("unsafe-url");
  }
}
function copyRedirectPolicy(
  policy?: AuthRedirectPolicy,
): AuthRedirectPolicy | undefined {
  if (!policy) return undefined;
  if (
    policy.allowedOrigins &&
    (!Array.isArray(policy.allowedOrigins) || policy.allowedOrigins.length > 16)
  ) {
    throw new AuthWorkflowError("unsafe-url");
  }
  return Object.freeze({
    origin: configuredOrigin(policy.origin),
    allowedOrigins: Object.freeze(
      (policy.allowedOrigins ?? []).map(configuredOrigin),
    ),
  });
}
function safePath(value: string): boolean {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    unsafeUrlCharacters.test(value) ||
    /%(?:2f|5c|00|0a|0d|25)/i.test(value)
  ) {
    return false;
  }
  try {
    return !value
      .split(/[?#]/, 1)[0]
      .split("/")
      .some((part) => {
        const decoded = decodeURIComponent(part);
        return (
          decoded === "." ||
          decoded === ".." ||
          unsafeUrlCharacters.test(decoded)
        );
      });
  } catch {
    return false;
  }
}
/** No policy means no redirect. Calling code chooses when to navigate. */
export function validateAuthRedirect(
  value: string,
  policy: AuthRedirectPolicy,
): string {
  const configured = copyRedirectPolicy(policy)!;
  try {
    if (
      typeof value !== "string" ||
      value.length > 2048 ||
      unsafeUrlCharacters.test(value)
    )
      throw new Error();
    const relative = value.startsWith("/");
    if (relative && !safePath(value)) throw new Error();
    if (!relative) {
      const absolute = value.match(/^https?:\/\/[^/?#]+([^?#]*)/);
      if (!absolute || !safePath(absolute[1] || "/")) throw new Error();
    }
    const url = new URL(value, configured.origin);
    if (
      url.username ||
      url.password ||
      ![configured.origin, ...(configured.allowedOrigins ?? [])].includes(
        url.origin,
      ) ||
      !safePath(url.pathname)
    )
      throw new Error();
    // Never put a credential returned by an auth API into browser history.
    const fragmentParameters = new URLSearchParams(url.hash.slice(1));
    for (const key of [
      ...url.searchParams.keys(),
      ...fragmentParameters.keys(),
    ]) {
      const normalized = key.replace(/[_-]/g, "").toLowerCase();
      if (
        /(?:token|password|secret|credential)/.test(normalized) ||
        /(?:^|[_-])(?:key|code)(?:$|[_-])/i.test(key) ||
        ["apikey", "verificationcode", "resetcode", "mfacode"].includes(
          normalized,
        )
      )
        throw new Error();
    }
    return relative ? `${url.pathname}${url.search}${url.hash}` : url.href;
  } catch {
    throw new AuthWorkflowError("unsafe-url");
  }
}
function validateEnrollment(value: AuthMfaEnrollment): AuthMfaEnrollment {
  try {
    if (unsafeUrlCharacters.test(value.otpauthUri)) throw new Error();
    const url = new URL(value.otpauthUri);
    const label = decodeURIComponent(url.pathname.slice(1));
    const allowed = ["secret", "issuer", "algorithm", "digits", "period"];
    if (
      url.protocol !== "otpauth:" ||
      url.hostname !== "totp" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      url.pathname.length < 2 ||
      label.length > 512 ||
      /[\u0000-\u001f\u007f\\]/.test(label) ||
      url.searchParams.get("secret") !== value.secret ||
      [...url.searchParams.keys()].some((key) => !allowed.includes(key)) ||
      new Set(url.searchParams.keys()).size !==
        [...url.searchParams.keys()].length ||
      !["SHA1", "SHA256", "SHA512"].includes(
        url.searchParams.get("algorithm") ?? "SHA1",
      ) ||
      !["6", "8"].includes(url.searchParams.get("digits") ?? "6") ||
      !["30", "60"].includes(url.searchParams.get("period") ?? "30")
    )
      throw new Error();
    return value;
  } catch {
    throw new AuthWorkflowError("unsafe-url");
  }
}

export function validateAuthWorkflowRequest<K extends AuthWorkflowOperation>(
  operation: K,
  value: unknown,
): AuthWorkflowRequests[K] {
  if (
    operation === "signUp" &&
    (!value ||
      typeof value !== "object" ||
      !("consent" in value) ||
      value.consent !== true)
  ) {
    throw new AuthWorkflowError("consent-required");
  }
  if (
    operation === "verifyMfa" &&
    value &&
    typeof value === "object" &&
    "enrollmentId" in value &&
    "challengeId" in value
  )
    throw new AuthWorkflowError("invalid-request");
  if (
    operation === "verifyEmail" &&
    value &&
    typeof value === "object" &&
    "token" in value &&
    ("challengeId" in value || "code" in value)
  )
    throw new AuthWorkflowError("invalid-request");
  const schema = requestSchemas[operation];
  if (!schema) throw new AuthWorkflowError("invalid-request");
  const result = schema.safeParse(value);
  if (!result.success) throw new AuthWorkflowError("invalid-request");
  return result.data as AuthWorkflowRequests[K];
}
export function validateAuthWorkflowResult<K extends AuthWorkflowOperation>(
  operation: K,
  value: unknown,
  policy?: AuthRedirectPolicy,
): AuthWorkflowResults[K] {
  const schema = resultSchemas[operation];
  if (!schema) throw new AuthWorkflowError("invalid-response");
  const result = schema.safeParse(value);
  if (!result.success) throw new AuthWorkflowError("invalid-response");
  const data = result.data;
  if ("redirectTo" in data && data.redirectTo !== undefined) {
    if (!policy) throw new AuthWorkflowError("unsafe-url");
    data.redirectTo = validateAuthRedirect(data.redirectTo, policy);
  }
  if (data.kind === "mfa-enrollment") validateEnrollment(data);
  return data as AuthWorkflowResults[K];
}
function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new AuthWorkflowError("aborted");
}
/** Abort races callbacks too, so a consumer ignoring signal cannot complete UI. */
async function abortable<T>(
  callback: () => Promise<T> | T,
  signal?: AbortSignal,
): Promise<T> {
  checkAbort(signal);
  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new AuthWorkflowError("aborted"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    Promise.resolve()
      .then(() => {
        checkAbort(signal);
        return callback();
      })
      .then(
        (value) => {
          signal?.removeEventListener("abort", onAbort);
          if (signal?.aborted) reject(new AuthWorkflowError("aborted"));
          else resolve(value);
        },
        (error: unknown) => {
          signal?.removeEventListener("abort", onAbort);
          reject(signal?.aborted ? new AuthWorkflowError("aborted") : error);
        },
      );
  });
}
async function invoke<K extends AuthWorkflowOperation>(
  operation: K,
  request: AuthWorkflowRequests[K],
  scope: AuthWorkflowScope,
  callback: () => unknown | Promise<unknown>,
  policy?: AuthRedirectPolicy,
): Promise<AuthWorkflowResults[K]> {
  try {
    const result = validateAuthWorkflowResult(
      operation,
      await abortable(callback, scope.signal),
      policy,
    );
    if (
      operation === "verifyMfa" &&
      "enrollmentId" in request &&
      result.kind !== "ok"
    ) {
      throw new AuthWorkflowError("invalid-response");
    }
    checkAbort(scope.signal);
    return result;
  } catch (error) {
    if (scope.signal?.aborted) throw new AuthWorkflowError("aborted");
    if (error instanceof AuthWorkflowError)
      throw new AuthWorkflowError(error.code, error.retryAfterSeconds);
    throw new AuthWorkflowError("network");
  }
}
/** Also validates plain injected adapters, not only adapters made by our factories. */
export async function runAuthWorkflow<K extends AuthWorkflowOperation>(
  adapter: AuthWorkflowAdapter,
  operation: K,
  request: AuthWorkflowRequests[K],
  scope: AuthWorkflowScope = {},
  policy?: AuthRedirectPolicy,
): Promise<AuthWorkflowResults[K]> {
  checkAbort(scope.signal);
  const input = validateAuthWorkflowRequest(operation, request);
  if (
    !adapter ||
    !["demo", "consumer"].includes(adapter.mode) ||
    typeof adapter[operation] !== "function"
  ) {
    throw new AuthWorkflowError("invalid-request");
  }
  const handler = adapter[operation] as (
    input: never,
    scope: AuthWorkflowScope,
  ) => Promise<unknown>;
  return await invoke(
    operation,
    input,
    scope,
    () => handler.call(adapter, input as never, scope),
    policy ?? adapter.redirectPolicy,
  );
}
export function createAuthWorkflowRunner() {
  let pending = false;
  return {
    get pending() {
      return pending;
    },
    async run<K extends AuthWorkflowOperation>(
      adapter: AuthWorkflowAdapter,
      operation: K,
      request: AuthWorkflowRequests[K],
      scope: AuthWorkflowScope = {},
      policy?: AuthRedirectPolicy,
    ): Promise<AuthWorkflowResults[K] | null> {
      if (pending) return null;
      pending = true;
      try {
        return await runAuthWorkflow(
          adapter,
          operation,
          request,
          scope,
          policy ?? adapter.redirectPolicy,
        );
      } finally {
        pending = false;
      }
    },
  };
}

type CallbackOptions = {
  handlers: AuthWorkflowHandlers;
  redirectPolicy?: AuthRedirectPolicy;
};
function makeAdapter(
  mode: AuthWorkflowAdapter["mode"],
  providerId: string,
  handlers: AuthWorkflowHandlers,
  policy?: AuthRedirectPolicy,
): AuthWorkflowAdapter {
  const redirectPolicy = copyRedirectPolicy(policy);
  if (!id.safeParse(providerId).success)
    throw new AuthWorkflowError("invalid-request");
  const methods: Record<string, unknown> = { mode, providerId, redirectPolicy };
  for (const operation of Object.keys(
    requestSchemas,
  ) as AuthWorkflowOperation[]) {
    if (typeof handlers[operation] !== "function")
      throw new AuthWorkflowError("invalid-request");
    const handler = handlers[operation];
    methods[operation] = async (
      request: unknown,
      scope: AuthWorkflowScope = {},
    ) => {
      checkAbort(scope.signal);
      const input = validateAuthWorkflowRequest(operation, request);
      return await invoke(
        operation,
        input,
        scope,
        () => handler(input as never, scope),
        redirectPolicy,
      );
    };
  }
  return Object.freeze(methods) as AuthWorkflowAdapter;
}
export function createAuthCallbackAdapter(
  options: CallbackOptions & { providerId: string },
): AuthWorkflowAdapter {
  return makeAdapter(
    "consumer",
    options.providerId,
    options.handlers,
    options.redirectPolicy,
  );
}
export const createBetterAuthWorkflowAdapter = (options: CallbackOptions) =>
  createAuthCallbackAdapter({ ...options, providerId: "better-auth" });
export const createClerkAuthWorkflowAdapter = (options: CallbackOptions) =>
  createAuthCallbackAdapter({ ...options, providerId: "clerk" });
export const createSupabaseAuthWorkflowAdapter = (options: CallbackOptions) =>
  createAuthCallbackAdapter({ ...options, providerId: "supabase-auth" });
export const createAuthJsWorkflowAdapter = (options: CallbackOptions) =>
  createAuthCallbackAdapter({ ...options, providerId: "authjs" });
export const createWorkOSAuthWorkflowAdapter = (options: CallbackOptions) =>
  createAuthCallbackAdapter({ ...options, providerId: "workos" });
export const createAuth0WorkflowAdapter = (options: CallbackOptions) =>
  createAuthCallbackAdapter({ ...options, providerId: "auth0" });

export type AuthHttpAdapterOptions = {
  /** Same-origin absolute path, e.g. /api/identity. No query, fragment or URL. */
  basePath: string;
  providerId?: string;
  /** Optional for browser use; required when invoking from non-browser tests. */
  origin?: string;
  redirectPolicy?: AuthRedirectPolicy;
  fetch?: typeof globalThis.fetch;
  /** Ephemeral anti-CSRF value from your app, never a provider key/bearer token. */
  csrfToken?: () => string | undefined | Promise<string | undefined>;
};
function transportOrigin(origin?: string): string {
  const browserOrigin =
    typeof window !== "undefined" ? window.location.origin : undefined;
  const configured = configuredOrigin(origin ?? browserOrigin ?? "");
  if (browserOrigin && configured !== browserOrigin)
    throw new AuthWorkflowError("unsafe-url");
  return configured;
}
function errorForStatus(
  status: number,
  operation: AuthWorkflowOperation,
): AuthWorkflowErrorCode {
  if (status === 400 || status === 422) return "invalid-request";
  if (status === 401)
    return operation === "signIn" ? "invalid-credentials" : "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404 || status === 405 || status === 501) return "unsupported";
  if (status === 409) return "conflict";
  if (status === 410) return "expired";
  if (status === 429) return "rate-limited";
  return "network";
}
async function responseJson(response: Response): Promise<unknown> {
  if (
    !/^application\/(?:json|[a-z0-9.+-]+\+json)(?:\s*;|$)/i.test(
      response.headers.get("content-type") ?? "",
    )
  ) {
    throw new AuthWorkflowError("invalid-response");
  }
  const limit = 2_000_000;
  if (Number(response.headers.get("content-length")) > limit)
    throw new AuthWorkflowError("invalid-response");
  const reader = response.body?.getReader();
  if (!reader) throw new AuthWorkflowError("invalid-response");
  const decoder = new TextDecoder();
  let text = "",
    size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new AuthWorkflowError("invalid-response");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch {
    await reader.cancel().catch(() => {});
    throw new AuthWorkflowError("invalid-response");
  } finally {
    reader.releaseLock();
  }
}
export function createAuthHttpAdapter(
  options: AuthHttpAdapterOptions,
): AuthWorkflowAdapter {
  const { basePath } = options;
  if (!safePath(basePath) || /[?#]/.test(basePath) || basePath === "/") {
    throw new AuthWorkflowError("unsafe-url");
  }
  if (options.origin) configuredOrigin(options.origin);
  const handlers = {} as Record<
    AuthWorkflowOperation,
    (
      request: AuthWorkflowRequests[AuthWorkflowOperation],
      scope: AuthWorkflowScope,
    ) => unknown | Promise<unknown>
  >;
  for (const operation of Object.keys(
    AUTH_WORKFLOW_ENDPOINTS,
  ) as AuthWorkflowOperation[]) {
    handlers[operation] = async (request, scope) => {
      const origin = transportOrigin(options.origin);
      const url = new URL(
        `${basePath.replace(/\/$/, "")}/${AUTH_WORKFLOW_ENDPOINTS[operation]}`,
        origin,
      );
      const csrf = await options.csrfToken?.();
      checkAbort(scope.signal);
      if (
        csrf !== undefined &&
        (typeof csrf !== "string" ||
          !csrf.length ||
          csrf.length > 1024 ||
          /[\u0000-\u0020\u007f]/.test(csrf))
      ) {
        throw new AuthWorkflowError("invalid-request");
      }
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (csrf) headers["X-CSRF-Token"] = csrf;
      const response = await (options.fetch ?? globalThis.fetch)(url.href, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
        signal: scope.signal,
      });
      checkAbort(scope.signal);
      if (
        response.redirected ||
        (response.url && new URL(response.url).origin !== origin)
      ) {
        throw new AuthWorkflowError("unsafe-url");
      }
      if (!response.ok) {
        let code = errorForStatus(response.status, operation);
        let retryAfterSeconds: number | undefined;
        try {
          const body = await responseJson(response);
          const parsed = z
            .object({
              error: z.object({
                code: z.enum(AUTH_WORKFLOW_ERROR_CODES),
                retryAfterSeconds: z
                  .number()
                  .int()
                  .min(0)
                  .max(86400)
                  .optional(),
              }),
            })
            .safeParse(body);
          if (parsed.success) ({ code, retryAfterSeconds } = parsed.data.error);
        } catch {
          /* Never expose provider/HTML error bodies. */
        }
        checkAbort(scope.signal);
        throw new AuthWorkflowError(code, retryAfterSeconds);
      }
      return await responseJson(response);
    };
  }
  return makeAdapter(
    "consumer",
    options.providerId ?? "consumer",
    handlers,
    options.redirectPolicy,
  );
}

type MockOrganization = {
  organization: AuthOrganization;
  members: AuthMember[];
  invitations: AuthInvitation[];
};
const OK: AuthActionResult = { kind: "ok" };
export type MockAuthWorkflowOptions = {
  delayMs?: number;
  signedIn?: boolean;
  providerId?: string;
};
/** Stateful, memory-only preview. It accepts demo passwords; it authenticates nobody. */
export function createMockAuthWorkflowAdapter({
  delayMs = 250,
  signedIn = true,
  providerId = "mock",
}: MockAuthWorkflowOptions = {}): AuthWorkflowAdapter {
  if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 10000)
    throw new AuthWorkflowError("invalid-request");
  let serial = 0;
  const nextId = (prefix: string) => `demo-${prefix}-${++serial}`;
  const now = () => new Date().toISOString();
  const later = (days = 7) =>
    new Date(Date.now() + days * 86400000).toISOString();
  let user: AuthUser = {
    id: "demo-user",
    name: "Alex Morgan",
    email: "alex.morgan@example.com",
    emailVerified: true,
  };
  const newSession = (): AuthSession => ({
    id: nextId("session"),
    user: { ...user },
    createdAt: now(),
    expiresAt: later(),
  });
  let session: AuthSession | null = signedIn ? newSession() : null;
  const device = (value: AuthSession): AuthDeviceSession => ({
    id: value.id,
    device: "Chrome · This browser",
    location: "Local preview",
    createdAt: value.createdAt,
    lastActiveAt: now(),
    expiresAt: value.expiresAt,
    current: true,
  });
  let sessions: AuthDeviceSession[] = session
    ? [
        device(session),
        {
          id: "demo-session-laptop",
          device: "Safari · MacBook",
          location: "Local preview",
          createdAt: now(),
          lastActiveAt: now(),
          expiresAt: later(),
          current: false,
        },
        {
          id: "demo-session-phone",
          device: "Chrome · Android",
          location: "Local preview",
          createdAt: now(),
          lastActiveAt: now(),
          expiresAt: later(),
          current: false,
        },
      ]
    : [];
  const organizations = new Map<string, MockOrganization>([
    [
      "demo-studio",
      {
        organization: {
          id: "demo-studio",
          name: "Aureform Studio",
          slug: "aureform-studio",
          role: "owner",
        },
        members: [
          { id: "demo-member-alex", user: { ...user }, role: "owner" },
          {
            id: "demo-member-sam",
            user: {
              id: "demo-user-sam",
              name: "Sam Rivera",
              email: "sam@example.com",
              emailVerified: true,
            },
            role: "admin",
          },
          {
            id: "demo-member-jordan",
            user: {
              id: "demo-user-jordan",
              name: "Jordan Lee",
              email: "jordan@example.com",
              emailVerified: true,
            },
            role: "member",
          },
        ],
        invitations: [
          {
            id: "demo-invitation-taylor",
            email: "taylor@example.com",
            role: "member",
            status: "pending",
            createdAt: now(),
            expiresAt: later(),
          },
        ],
      },
    ],
  ]);
  let activeOrganizationId: string | null = "demo-studio";
  const factors: AuthMfaFactor[] = [];
  const challenges = new Map<
    string,
    { kind: "email" | "mfa"; email: string; name: string }
  >();
  const enrollments = new Map<string, { label: string }>();
  const requireSession = () => {
    if (!session) throw new AuthWorkflowError("unauthorized");
    return session;
  };
  const organizationFor = (organizationId: string, manage = false) => {
    requireSession();
    const value = organizations.get(organizationId);
    if (!value) throw new AuthWorkflowError("forbidden");
    if (manage && value.organization.role === "member")
      throw new AuthWorkflowError("forbidden");
    return value;
  };
  const synchronizeUser = () => {
    if (session) session = { ...session, user: { ...user } };
    for (const entry of organizations.values()) {
      entry.members = entry.members.map((member) =>
        member.user.id === user.id ? { ...member, user: { ...user } } : member,
      );
    }
  };
  const establishSession = (): AuthFlowResult => {
    session = newSession();
    sessions = [device(session)];
    synchronizeUser();
    return { kind: "session", session: { ...session, user: { ...user } } };
  };
  const verifyDemoCode = (value: string, recovery = false) => {
    if (value !== "123456" && !(recovery && value === "DEMO-RECOVERY"))
      throw new AuthWorkflowError("invalid-code");
  };
  const identity = (): AuthIdentityState => {
    if (!session)
      return {
        session: null,
        organizations: [],
        activeOrganizationId: null,
        members: [],
        invitations: [],
        sessions: [],
        factors: [],
      };
    const active = activeOrganizationId
      ? organizations.get(activeOrganizationId)
      : undefined;
    return structuredClone({
      session,
      organizations: [...organizations.values()].map(
        (entry) => entry.organization,
      ),
      activeOrganizationId,
      members: active?.members ?? [],
      invitations: active?.invitations ?? [],
      sessions,
      factors,
    });
  };
  const handlers: AuthWorkflowHandlers = {
    signIn: (request) => {
      user = { ...user, email: request.email, emailVerified: true };
      if (factors.length) {
        const challengeId = nextId("mfa-challenge");
        challenges.set(challengeId, {
          kind: "mfa",
          email: user.email,
          name: user.name,
        });
        session = null;
        sessions = [];
        return {
          kind: "mfa-required",
          challengeId,
          factors: ["totp", "recovery-code"],
        };
      }
      return establishSession();
    },
    signUp: (request) => {
      user = {
        ...user,
        name: request.name,
        email: request.email,
        emailVerified: false,
      };
      session = null;
      sessions = [];
      const challengeId = nextId("email-challenge");
      challenges.set(challengeId, {
        kind: "email",
        email: request.email,
        name: request.name,
      });
      return {
        kind: "verification-required",
        challengeId,
        email: request.email,
      };
    },
    requestPasswordReset: () => OK,
    confirmPasswordReset: (request) => {
      if (request.token !== "demo-reset")
        throw new AuthWorkflowError("expired");
      return OK;
    },
    verifyEmail: (request) => {
      if ("token" in request) {
        if (request.token !== "demo-email")
          throw new AuthWorkflowError("expired");
        user = { ...user, emailVerified: true };
        for (const [challengeId, challenge] of challenges) {
          if (challenge.kind === "email") challenges.delete(challengeId);
        }
        synchronizeUser();
        return session ? OK : establishSession();
      }
      verifyDemoCode(request.code);
      const challenge = challenges.get(request.challengeId);
      if (!challenge || challenge.kind !== "email")
        throw new AuthWorkflowError("expired");
      user = {
        ...user,
        name: challenge.name,
        email: challenge.email,
        emailVerified: true,
      };
      challenges.delete(request.challengeId);
      synchronizeUser();
      return session ? OK : establishSession();
    },
    resendVerification: (request) => {
      if (request.challengeId) challenges.delete(request.challengeId);
      const challengeId = nextId("email-challenge");
      challenges.set(challengeId, {
        kind: "email",
        email: request.email,
        name: user.name,
      });
      return {
        kind: "verification-required",
        challengeId,
        email: request.email,
      };
    },
    getSession: () => ({
      kind: "session",
      session: session ? structuredClone(session) : null,
    }),
    logout: () => {
      session = null;
      sessions = [];
      challenges.clear();
      enrollments.clear();
      return OK;
    },
    getIdentity: () => ({ kind: "identity", identity: identity() }),
    updateProfile: (request) => {
      requireSession();
      user = { ...user, name: request.name };
      synchronizeUser();
      return OK;
    },
    changePassword: () => {
      requireSession();
      return OK;
    },
    enrollMfa: (request) => {
      requireSession();
      const enrollmentId = nextId("enrollment");
      enrollments.set(enrollmentId, { label: request.label });
      const secret = "JBSWY3DPEHPK3PXP";
      return {
        kind: "mfa-enrollment",
        enrollmentId,
        secret,
        otpauthUri: `otpauth://totp/Aureform%20demo:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Aureform%20demo&digits=6&period=30`,
      };
    },
    verifyMfa: (request) => {
      verifyDemoCode(request.code, "challengeId" in request);
      if ("enrollmentId" in request) {
        requireSession();
        const enrollment = enrollments.get(request.enrollmentId);
        if (!enrollment) throw new AuthWorkflowError("expired");
        factors.push({
          id: nextId("factor"),
          type: "totp",
          label: enrollment.label,
          createdAt: now(),
        });
        enrollments.delete(request.enrollmentId);
        return OK;
      }
      const challenge = challenges.get(request.challengeId);
      if (!challenge || challenge.kind !== "mfa")
        throw new AuthWorkflowError("expired");
      challenges.delete(request.challengeId);
      user = { ...user, name: challenge.name, email: challenge.email };
      return establishSession();
    },
    revokeMfa: (request) => {
      requireSession();
      verifyDemoCode(request.code ?? "");
      const index = factors.findIndex(
        (factor) => factor.id === request.factorId,
      );
      if (index < 0) throw new AuthWorkflowError("conflict");
      factors.splice(index, 1);
      return OK;
    },
    createOrganization: (request) => {
      requireSession();
      if (
        [...organizations.values()].some(
          (entry) => entry.organization.slug === request.slug,
        )
      )
        throw new AuthWorkflowError("conflict");
      const organizationId = nextId("organization");
      organizations.set(organizationId, {
        organization: { id: organizationId, ...request, role: "owner" },
        members: [{ id: nextId("member"), user: { ...user }, role: "owner" }],
        invitations: [],
      });
      activeOrganizationId = organizationId;
      return OK;
    },
    updateOrganization: (request) => {
      const value = organizationFor(request.organizationId, true);
      if (
        [...organizations.values()].some(
          (entry) =>
            entry.organization.id !== request.organizationId &&
            entry.organization.slug === request.slug,
        )
      )
        throw new AuthWorkflowError("conflict");
      value.organization = {
        ...value.organization,
        name: request.name,
        slug: request.slug,
      };
      return OK;
    },
    switchOrganization: (request) => {
      organizationFor(request.organizationId);
      activeOrganizationId = request.organizationId;
      return OK;
    },
    deleteOrganization: (request) => {
      const value = organizationFor(request.organizationId, true);
      if (value.organization.role !== "owner")
        throw new AuthWorkflowError("forbidden");
      organizations.delete(request.organizationId);
      if (activeOrganizationId === request.organizationId)
        activeOrganizationId = organizations.keys().next().value ?? null;
      return OK;
    },
    inviteMember: (request) => {
      const value = organizationFor(request.organizationId, true);
      if (
        value.members.some((member) => member.user.email === request.email) ||
        value.invitations.some(
          (invitation) =>
            invitation.email === request.email &&
            invitation.status === "pending",
        )
      ) {
        throw new AuthWorkflowError("conflict");
      }
      value.invitations.push({
        id: nextId("invitation"),
        email: request.email,
        role: request.role,
        status: "pending",
        createdAt: now(),
        expiresAt: later(),
      });
      return OK;
    },
    revokeInvitation: (request) => {
      const value = organizationFor(request.organizationId, true);
      const invitation = value.invitations.find(
        (item) => item.id === request.invitationId && item.status === "pending",
      );
      if (!invitation) throw new AuthWorkflowError("conflict");
      invitation.status = "revoked";
      return OK;
    },
    acceptInvitation: (request) => {
      requireSession();
      if (request.token !== "demo-invitation")
        throw new AuthWorkflowError("expired");
      if (organizations.has("demo-partners"))
        throw new AuthWorkflowError("conflict");
      organizations.set("demo-partners", {
        organization: {
          id: "demo-partners",
          name: "Design Partners",
          slug: "design-partners",
          role: "member",
        },
        members: [
          {
            id: nextId("member"),
            user: {
              id: "demo-partner-owner",
              name: "Taylor Chen",
              email: "taylor@example.com",
              emailVerified: true,
            },
            role: "owner",
          },
          { id: nextId("member"), user: { ...user }, role: "member" },
        ],
        invitations: [],
      });
      activeOrganizationId = "demo-partners";
      return OK;
    },
    updateMemberRole: (request) => {
      const value = organizationFor(request.organizationId, true);
      const member = value.members.find((item) => item.id === request.memberId);
      if (!member || member.role === "owner" || member.user.id === user.id)
        throw new AuthWorkflowError("forbidden");
      member.role = request.role;
      return OK;
    },
    removeMember: (request) => {
      const value = organizationFor(request.organizationId, true);
      const member = value.members.find((item) => item.id === request.memberId);
      if (!member || member.role === "owner" || member.user.id === user.id)
        throw new AuthWorkflowError("forbidden");
      value.members = value.members.filter(
        (item) => item.id !== request.memberId,
      );
      return OK;
    },
    revokeSession: (request) => {
      requireSession();
      const value = sessions.find((item) => item.id === request.sessionId);
      if (!value) throw new AuthWorkflowError("conflict");
      if (value.current) {
        session = null;
        sessions = [];
        challenges.clear();
        enrollments.clear();
      } else
        sessions = sessions.filter((item) => item.id !== request.sessionId);
      return OK;
    },
    revokeOtherSessions: () => {
      requireSession();
      sessions = sessions.filter((item) => item.current);
      return OK;
    },
  };
  const delayed = {} as Record<
    AuthWorkflowOperation,
    (
      request: AuthWorkflowRequests[AuthWorkflowOperation],
      scope: AuthWorkflowScope,
    ) => unknown | Promise<unknown>
  >;
  for (const operation of Object.keys(handlers) as AuthWorkflowOperation[]) {
    delayed[operation] = async (request, scope) => {
      await new Promise<void>((resolve, reject) => {
        checkAbort(scope.signal);
        const onAbort = () => {
          clearTimeout(timer);
          scope.signal?.removeEventListener("abort", onAbort);
          reject(new AuthWorkflowError("aborted"));
        };
        const timer = setTimeout(() => {
          scope.signal?.removeEventListener("abort", onAbort);
          resolve();
        }, delayMs);
        scope.signal?.addEventListener("abort", onAbort, { once: true });
      });
      checkAbort(scope.signal);
      return await handlers[operation](request as never, scope);
    };
  }
  return makeAdapter("demo", providerId, delayed);
}
