import { z } from "zod";
import {
  communicationsSetupConfiguredSchema,
  communicationsSetupVersion,
} from "./setup-contracts";

/**
 * Private, single-owner laboratory transport. This is application
 * authentication, separate from the two carrier credential fields.
 * No credentials, tokens or access codes are persisted by this module.
 */
const loginSchema = z
  .object({
    contractVersion: z.literal(communicationsSetupVersion),
    sessionToken: z
      .string()
      .min(32)
      .max(512)
      .regex(/^[A-Za-z0-9_-]+$/),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const referenceTestPermissionSchema = z
  .object({
    contractVersion: z.literal(communicationsSetupVersion),
    provider: z.enum(["twilio", "telnyx"]),
    phoneNumber: z.string().regex(/^\+[1-9]\d{6,14}$/),
    callerNumber: z.string().regex(/^\+[1-9]\d{6,14}$/),
    expiresAt: z.iso.datetime({ offset: true }),
    maxSeconds: z.number().int().min(30).max(120),
    maxCalls: z.literal(1),
    phase: z.literal("test-authorized"),
    observedCall: z.literal(false),
  })
  .strict();

export type ReferenceTestPermission = z.infer<
  typeof referenceTestPermissionSchema
>;

export class ReferenceLabError extends Error {
  readonly code:
    | "invalid-configuration"
    | "authentication-required"
    | "agent-not-ready"
    | "test-pending"
    | "request-failed";
  constructor(code: ReferenceLabError["code"]) {
    super(code);
    this.name = "ReferenceLabError";
    this.code = code;
  }
}

export function referenceBackendUrl(input: string): URL {
  try {
    if (
      /[\u0000-\u0020\u007f\\?#%]/.test(input) ||
      /(?:^|\/)\.\.?(?:\/|$)/.test(input)
    )
      throw new Error();
    const url = new URL(input);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/v1\/communications\/?$/.test(url.pathname)
    )
      throw new Error();
    url.pathname = url.pathname.replace(/\/+$/, "");
    return url;
  } catch {
    throw new ReferenceLabError("invalid-configuration");
  }
}

export async function referenceLabRequest(
  backendUrl: string,
  resource: "login" | "authorize-test" | "connections",
  body: unknown,
  options: {
    token?: string;
    signal?: AbortSignal;
    fetch?: typeof fetch;
  } = {},
): Promise<unknown> {
  const base = referenceBackendUrl(backendUrl);
  if (!["login", "authorize-test", "connections"].includes(resource))
    throw new ReferenceLabError("invalid-configuration");
  const url = `${base.href}/setup/${resource}`;
  const headers = new Headers({
    "content-type": "application/json",
    accept: "application/json",
  });
  if (resource !== "login") {
    if (!/^[A-Za-z0-9_-]{32,512}$/.test(options.token ?? ""))
      throw new ReferenceLabError("authentication-required");
    headers.set("authorization", `Bearer ${options.token}`);
  }
  try {
    const response = await (options.fetch ?? globalThis.fetch)(url, {
      method: resource === "connections" ? "GET" : "POST",
      headers,
      ...(resource === "connections" ? {} : { body: JSON.stringify(body) }),
      signal: options.signal ?? AbortSignal.timeout(15000),
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
    if (
      response.redirected ||
      (response.url && response.url !== url) ||
      !/^application\/json(?:;|$)/i.test(
        response.headers.get("content-type") ?? "",
      ) ||
      Number(response.headers.get("content-length") ?? "0") > 8192
    )
      throw new ReferenceLabError("request-failed");
    const text = await response.text();
    if (text.length > 8192) throw new ReferenceLabError("request-failed");
    const value: unknown = JSON.parse(text);
    if (!response.ok) {
      if (response.status === 401)
        throw new ReferenceLabError("authentication-required");
      const code =
        value && typeof value === "object" && "error" in value
          ? (value as { error?: { code?: unknown } }).error?.code
          : undefined;
      if (code === "agent-not-ready" || code === "credential-renewal-required")
        throw new ReferenceLabError("agent-not-ready");
      if (
        code === "test-call-already-active" ||
        code === "test-permission-already-pending"
      )
        throw new ReferenceLabError("test-pending");
      throw new ReferenceLabError("request-failed");
    }
    return value;
  } catch (error) {
    if (error instanceof ReferenceLabError) throw error;
    // Never expose a provider response, entered code or native fetch cause.
    throw new ReferenceLabError("request-failed");
  }
}

export async function referenceLabLogin(
  backendUrl: string,
  accessCode: string,
  options?: { signal?: AbortSignal; fetch?: typeof fetch },
) {
  const parsed = loginSchema.safeParse(
    await referenceLabRequest(backendUrl, "login", { accessCode }, options),
  );
  if (!parsed.success || Date.parse(parsed.data.expiresAt) <= Date.now())
    throw new ReferenceLabError("request-failed");
  return parsed.data;
}

export async function referenceLabConnections(
  backendUrl: string,
  token: string,
  options?: { signal?: AbortSignal; fetch?: typeof fetch },
) {
  const parsed = z
    .array(communicationsSetupConfiguredSchema)
    .max(2)
    .refine(
      (items) =>
        new Set(items.map((item) => item.provider)).size === items.length,
    )
    .safeParse(
      await referenceLabRequest(backendUrl, "connections", undefined, {
        ...options,
        token,
      }),
    );
  if (!parsed.success) throw new ReferenceLabError("request-failed");
  return parsed.data;
}
