import {
  CommerceError,
  commerceInvoiceSchema,
  commerceOrderSchema,
  commerceProductSchema,
  commerceSnapshotSchema,
  newInvoiceSchema,
  newOrderSchema,
  type CommerceAction,
  type CommerceAdapter,
  type CommerceScope,
} from "./commerce";
import { parseCommerceSnapshot } from "./commerce-state";
import { publicPath } from "./public-path";

export const STRIPE_REDIRECT_HOSTS = [
  "checkout.stripe.com",
  "billing.stripe.com",
  "invoice.stripe.com",
] as const;

export function isTrustedStripeRedirect(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      STRIPE_REDIRECT_HOSTS.some((host) => url.hostname === host)
    );
  } catch {
    return false;
  }
}

export function parseStripeAction(
  value: unknown,
): Extract<CommerceAction, { mode: "redirect" }> {
  if (
    typeof value !== "object" ||
    value === null ||
    !("mode" in value) ||
    value.mode !== "redirect" ||
    !("url" in value) ||
    typeof value.url !== "string" ||
    !isTrustedStripeRedirect(value.url)
  )
    throw new CommerceError(
      "provider",
      "The backend returned an invalid Stripe redirect.",
    );
  return { mode: "redirect", url: value.url };
}

export type StripeCommerceOptions = {
  /** A same-origin API path. The default follows the demo's build mount point. */
  baseUrl?: string;
  /** Inject your framework's CSRF token; authentication remains on the server. */
  getCsrfToken?: () => string | null | Promise<string | null>;
  /** Useful for consumer-specific transport and deterministic tests. */
  fetcher?: typeof fetch;
};

const statusErrors: Record<number, [CommerceError["code"], string]> = {
  400: ["validation", "Check the submitted fields."],
  401: ["forbidden", "Sign in to your application before continuing."],
  403: ["forbidden", "Your account cannot perform this action."],
  404: ["unavailable", "The requested record is no longer available."],
  409: ["conflict", "The record changed. Reload before trying again."],
  429: ["provider", "Too many requests. Try again shortly."],
};

/**
 * Browser-to-backend transport only. This module never receives a Stripe key,
 * card details, client-supplied payment totals or a client-side customer id.
 */
export function createStripeCommerceAdapter(
  options: StripeCommerceOptions = {},
): CommerceAdapter {
  const baseUrl = (options.baseUrl ?? publicPath("/api/commerce")).replace(
    /\/+$/,
    "",
  );
  if (
    !baseUrl.startsWith("/") ||
    baseUrl.startsWith("//") ||
    /[\\?#]/.test(baseUrl) ||
    baseUrl.includes("..") ||
    /%2e|%2f|%5c/i.test(baseUrl)
  )
    throw new CommerceError(
      "validation",
      "Use a same-origin commerce API path.",
    );
  const fetcher =
    options.fetcher ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  async function request(path: string, scope: CommerceScope, body?: unknown) {
    const csrf = body === undefined ? null : await options.getCsrfToken?.();
    if (scope.signal?.aborted)
      throw new CommerceError("conflict", "The request was cancelled.");
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}${path}`, {
        method: body === undefined ? "GET" : "POST",
        credentials: "same-origin",
        mode: "same-origin",
        redirect: "error",
        cache: "no-store",
        signal: scope.signal,
        headers: {
          Accept: "application/json",
          "X-Aureform-Request": "commerce",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new CommerceError(
        scope.signal?.aborted ? "conflict" : "provider",
        scope.signal?.aborted
          ? "The request was cancelled."
          : "The commerce backend is unavailable. Try again.",
      );
    }
    if (!response.ok) {
      const [code, message] = statusErrors[response.status] ?? [
        "provider",
        "The commerce backend could not complete the request.",
      ];
      throw new CommerceError(code, message);
    }
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new CommerceError(
        "provider",
        "The commerce backend must return JSON.",
      );
    }
    try {
      return (await response.json()) as unknown;
    } catch {
      throw new CommerceError(
        "provider",
        "The commerce backend returned invalid JSON.",
      );
    }
  }
  const scopeBody = (scope: CommerceScope) => ({
    workspaceId: scope.workspaceId,
  });
  const invalid = () =>
    new CommerceError(
      "provider",
      "The commerce backend returned an invalid record.",
    );
  return {
    mode: "stripe",
    async load(scope) {
      const query = new URLSearchParams({ workspaceId: scope.workspaceId });
      const response = await request(`?${query}`, scope);
      // Check both the shape and relationships, including purchase-time totals.
      const snapshot = parseCommerceSnapshot(response);
      if (!snapshot || !commerceSnapshotSchema.safeParse(response).success)
        throw invalid();
      return snapshot;
    },
    async saveProduct(product, scope) {
      const input = commerceProductSchema.safeParse(product);
      if (!input.success)
        throw new CommerceError("validation", "Check the product fields.");
      const result = commerceProductSchema.safeParse(
        await request("/products/save", scope, {
          ...scopeBody(scope),
          product: input.data,
        }),
      );
      if (!result.success || result.data.id !== product.id) throw invalid();
      return result.data;
    },
    async archiveProduct(productId, scope) {
      const result = commerceProductSchema.safeParse(
        await request("/products/archive", scope, {
          ...scopeBody(scope),
          productId,
        }),
      );
      if (!result.success || result.data.id !== productId) throw invalid();
      return result.data;
    },
    async syncProduct(productId, scope) {
      const result = commerceProductSchema.safeParse(
        await request("/products/sync", scope, {
          ...scopeBody(scope),
          productId,
        }),
      );
      if (!result.success || result.data.id !== productId) throw invalid();
      return result.data;
    },
    async createOrder(input, scope) {
      const validated = newOrderSchema.safeParse(input);
      if (!validated.success)
        throw new CommerceError("validation", "Check the order fields.");
      const result = commerceOrderSchema.safeParse(
        await request("/orders/create", scope, {
          ...scopeBody(scope),
          input: validated.data,
        }),
      );
      if (!result.success) throw invalid();
      return result.data;
    },
    async updateOrderStatus(orderId, status, scope) {
      const result = commerceOrderSchema.safeParse(
        await request("/orders/status", scope, {
          ...scopeBody(scope),
          orderId,
          status,
        }),
      );
      if (!result.success || result.data.id !== orderId) throw invalid();
      return result.data;
    },
    async createInvoice(input, scope) {
      const validated = newInvoiceSchema.safeParse(input);
      if (!validated.success)
        throw new CommerceError("validation", "Check the invoice fields.");
      const result = commerceInvoiceSchema.safeParse(
        await request("/invoices/create", scope, {
          ...scopeBody(scope),
          input: validated.data,
        }),
      );
      if (!result.success) throw invalid();
      return result.data;
    },
    async checkout(input, scope) {
      if (
        !["order", "invoice", "subscription"].includes(input.kind) ||
        !input.id ||
        input.id.length > 100
      )
        throw new CommerceError(
          "validation",
          "Choose an available checkout record.",
        );
      return parseStripeAction(
        await request("/checkout", scope, {
          ...scopeBody(scope),
          ...input,
        }),
      );
    },
    async portal(scope) {
      return parseStripeAction(
        await request("/portal", scope, scopeBody(scope)),
      );
    },
  };
}
