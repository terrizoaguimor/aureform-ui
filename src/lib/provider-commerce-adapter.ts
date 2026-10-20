import { z } from "zod";
import {
  CommerceError,
  commerceBillingSchema,
  commerceInvoiceSchema,
  commerceOrderSchema,
  commerceProductSchema,
  newInvoiceSchema,
  newOrderSchema,
  type CheckoutRequest,
  type CommerceAction,
  type CommerceAdapter,
  type CommerceOrder,
  type CommerceProduct,
  type CommerceProviderIdentity,
  type CommerceScope,
  type CommerceSnapshot,
  type NewInvoiceInput,
  type NewOrderInput,
} from "./commerce";
import { parseCommerceSnapshot } from "./commerce-state";
import { publicPath } from "./public-path";

export const commerceProviderLabels = {
  stripe: "Stripe",
  paddle: "Paddle",
  polar: "Polar",
  "lemon-squeezy": "Lemon Squeezy",
} as const;

export type CommerceProviderName = keyof typeof commerceProviderLabels;
export type CommerceProviderSelection =
  | CommerceProviderName
  | "lemonsqueezy"
  | "lemonSqueezy"
  | "lemon_squeezy"
  | CommerceProviderIdentity;

export type ProviderCommerceTransportOptions = {
  /** A same-origin API path; defaults to the build-mounted /api/commerce. */
  baseUrl?: string;
  /** No built-in provider domains. Configure your actual checkout/portal origins. */
  trustedRedirectOrigins: readonly string[];
  /** When supplied, every mutation requires a nonempty token from this getter. */
  getCsrfToken?: () => string | null | Promise<string | null>;
  /** Consumer transport override, also useful for deterministic native mocks. */
  fetcher?: typeof fetch;
};
export type ProviderCommerceOptions = ProviderCommerceTransportOptions & {
  provider: CommerceProviderSelection;
};
export type ProviderCommerceAdapter = CommerceAdapter & {
  mode: "provider";
  provider: CommerceProviderIdentity;
  trustedRedirectOrigins: readonly string[];
};

export type ProviderCommerceScope = { workspaceId: string; provider: string };
export type ProviderCommerceProductInput = Omit<
  CommerceProduct,
  "providerProductId" | "providerPriceId" | "stripeProductId" | "stripePriceId"
>;
/** The JSON request contract, including server-authorized scope and provider. */
export type ProviderCommerceRequests = {
  load: ProviderCommerceScope;
  saveProduct: ProviderCommerceScope & {
    product: ProviderCommerceProductInput;
  };
  archiveProduct: ProviderCommerceScope & { productId: string };
  syncProduct: ProviderCommerceScope & { productId: string };
  createOrder: ProviderCommerceScope & { input: NewOrderInput };
  updateOrderStatus: ProviderCommerceScope & {
    orderId: string;
    status: CommerceOrder["status"];
  };
  createInvoice: ProviderCommerceScope & { input: NewInvoiceInput };
  checkout: ProviderCommerceScope & CheckoutRequest;
  portal: ProviderCommerceScope;
};

const identifier = z.string().trim().min(1).max(100);
const checkoutSchema = z.object({
  kind: z.enum(["order", "invoice", "subscription"]),
  id: identifier,
});
const orderStatusSchema = commerceOrderSchema.shape.status;
const invalidRecord = () =>
  new CommerceError(
    "provider",
    "The commerce backend returned an invalid record.",
  );
const cancelled = () =>
  new CommerceError("conflict", "The request was cancelled.");

/** Known aliases normalize only provider identity, never payment/customer IDs. */
export function resolveCommerceProviderIdentity(
  selection: CommerceProviderSelection,
): CommerceProviderIdentity {
  const raw = typeof selection === "string" ? selection : selection?.id;
  if (typeof raw !== "string")
    throw new CommerceError("validation", "Choose a commerce provider.");
  let id = raw.trim().toLowerCase();
  if (["lemonsqueezy", "lemon_squeezy"].includes(id)) id = "lemon-squeezy";
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id) || id.length > 100)
    throw new CommerceError("validation", "Use a stable commerce provider id.");
  const known = commerceProviderLabels[id as CommerceProviderName];
  const label = typeof selection === "string" ? known : selection.label;
  if (
    typeof label !== "string" ||
    !label.trim() ||
    label.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(label)
  )
    throw new CommerceError(
      "validation",
      "Supply a commerce provider display label.",
    );
  return { id, label: label.trim() };
}

function parseHttpsUrl(value: unknown): URL | null {
  if (
    typeof value !== "string" ||
    !/^https:\/\/[^/?#]/i.test(value) ||
    /[\s\\]/u.test(value) ||
    /^https:\/\/[^/?#]*[@%*]/i.test(value)
  )
    return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hostname.endsWith(".")
      ? url
      : null;
  } catch {
    return null;
  }
}

export function normalizeCommerceRedirectOrigins(
  origins: readonly string[],
): readonly string[] {
  if (!Array.isArray(origins) || origins.length === 0)
    throw new CommerceError(
      "validation",
      "Configure trusted HTTPS checkout and customer portal origins.",
    );
  const normalized = origins.map((origin) => {
    const url = parseHttpsUrl(origin);
    if (!url || !/^https:\/\/[^/?#]+\/?$/i.test(origin) || url.pathname !== "/")
      throw new CommerceError(
        "validation",
        "Use exact HTTPS origins without paths, credentials or wildcards.",
      );
    return url.origin;
  });
  return Object.freeze([...new Set(normalized)]);
}

export function isTrustedCommerceRedirect(
  value: unknown,
  trustedOrigins: readonly string[],
): boolean {
  const url = parseHttpsUrl(value);
  if (!url) return false;
  try {
    return normalizeCommerceRedirectOrigins(trustedOrigins).includes(
      url.origin,
    );
  } catch {
    return false;
  }
}

export function parseProviderCommerceAction(
  value: unknown,
  trustedOrigins: readonly string[],
): Extract<CommerceAction, { mode: "redirect" }> {
  if (
    typeof value !== "object" ||
    value === null ||
    !("mode" in value) ||
    value.mode !== "redirect" ||
    !("url" in value) ||
    !isTrustedCommerceRedirect(value.url, trustedOrigins)
  )
    throw new CommerceError(
      "provider",
      "The backend returned an untrusted commerce redirect.",
    );
  return { mode: "redirect", url: new URL(value.url as string).href };
}

function validOrderRelationships(order: CommerceOrder) {
  return (
    new Set(order.items.map((item) => item.productId)).size ===
      order.items.length &&
    order.total ===
      order.items.reduce(
        (sum, item) => sum + item.unitAmount * item.quantity,
        0,
      ) &&
    (!["shipped", "delivered"].includes(order.status) ||
      ["paid", "refunded"].includes(order.paymentStatus))
  );
}

/** Historical prices remain independent of today's catalog; IDs must still exist. */
export function parseProviderCommerceSnapshot(
  value: unknown,
): CommerceSnapshot | null {
  const snapshot = parseCommerceSnapshot(value);
  if (!snapshot) return null;
  const productIds = new Set(snapshot.products.map((product) => product.id));
  if (
    snapshot.orders.some(
      (order) =>
        !validOrderRelationships(order) ||
        order.items.some((line) => !productIds.has(line.productId)),
    )
  )
    return null;
  return snapshot;
}

function parseIdentifier(value: unknown, label: string) {
  const parsed = identifier.safeParse(value);
  if (!parsed.success)
    throw new CommerceError("validation", `Choose a valid ${label}.`);
  return parsed.data;
}

function checkCancellation(signal?: AbortSignal) {
  if (signal?.aborted) throw cancelled();
}

/** Reject promptly even when a custom fetcher/CSRF getter ignores AbortSignal. */
function withCancellation<T>(
  operation: () => T | PromiseLike<T>,
  signal?: AbortSignal,
): Promise<T> {
  checkCancellation(signal);
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal?.removeEventListener("abort", abort);
      reject(cancelled());
    };
    signal?.addEventListener("abort", abort, { once: true });
    const finish = () => signal?.removeEventListener("abort", abort);
    try {
      checkCancellation(signal);
      Promise.resolve(operation()).then(
        (result) => {
          finish();
          if (signal?.aborted) reject(cancelled());
          else resolve(result);
        },
        (error: unknown) => {
          finish();
          reject(signal?.aborted ? cancelled() : error);
        },
      );
    } catch (error) {
      finish();
      reject(error);
    }
  });
}

const statusErrors: Record<number, [CommerceError["code"], string]> = {
  400: ["validation", "Check the submitted fields."],
  401: ["forbidden", "Sign in to your application before continuing."],
  403: ["forbidden", "Your account cannot perform this action."],
  404: ["unavailable", "The requested record is no longer available."],
  409: ["conflict", "The record changed. Reload before trying again."],
  422: ["validation", "Check the submitted fields."],
  429: ["provider", "Too many requests. Try again shortly."],
};

/**
 * Consumer HTTP transport. Provider SDKs, secrets, prices, customer mappings,
 * payment status and webhook fulfillment stay on the authenticated backend.
 */
export function createProviderCommerceAdapter(
  options: ProviderCommerceOptions,
): ProviderCommerceAdapter {
  const provider = Object.freeze(
    resolveCommerceProviderIdentity(options?.provider),
  );
  const trustedRedirectOrigins = normalizeCommerceRedirectOrigins(
    options.trustedRedirectOrigins,
  );
  const configuredPath = options.baseUrl ?? publicPath("/api/commerce");
  if (typeof configuredPath !== "string")
    throw new CommerceError(
      "validation",
      "Use a same-origin commerce API path.",
    );
  const baseUrl = configuredPath.replace(/\/+$/, "");
  if (
    !/^\/[A-Za-z0-9/_.-]+$/.test(baseUrl) ||
    baseUrl.startsWith("//") ||
    baseUrl.split("/").some((segment) => segment === "." || segment === "..")
  )
    throw new CommerceError(
      "validation",
      "Use a same-origin commerce API path.",
    );
  const fetcher =
    options.fetcher ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const scopeBody = (scope: CommerceScope): ProviderCommerceScope => ({
    workspaceId: parseIdentifier(scope?.workspaceId, "workspace"),
    provider: provider.id,
  });

  async function request(
    path: string,
    scope: CommerceScope,
    body?: ProviderCommerceRequests[Exclude<
      keyof ProviderCommerceRequests,
      "load"
    >],
  ): Promise<unknown> {
    checkCancellation(scope.signal);
    let csrf: string | null = null;
    if (body !== undefined && options.getCsrfToken) {
      try {
        csrf = await withCancellation(options.getCsrfToken, scope.signal);
      } catch {
        checkCancellation(scope.signal);
        throw new CommerceError(
          "provider",
          "The CSRF token could not be read. Refresh and try again.",
        );
      }
      if (typeof csrf !== "string" || !/^[\x21-\x7e]{1,4096}$/.test(csrf))
        throw new CommerceError(
          "forbidden",
          "A valid CSRF token is required for this request.",
        );
    }
    let response: Response;
    try {
      response = await withCancellation(
        () =>
          fetcher(`${baseUrl}${path}`, {
            method: body === undefined ? "GET" : "POST",
            credentials: "same-origin",
            mode: "same-origin",
            redirect: "error",
            cache: "no-store",
            signal: scope.signal,
            headers: {
              Accept: "application/json",
              "X-Aureform-Request": "commerce",
              ...(body === undefined
                ? {}
                : { "Content-Type": "application/json" }),
              ...(csrf ? { "X-CSRF-Token": csrf } : {}),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          }),
        scope.signal,
      );
    } catch {
      checkCancellation(scope.signal);
      throw new CommerceError(
        "provider",
        "The commerce backend is unavailable. Try again.",
      );
    }
    checkCancellation(scope.signal);
    if (response.redirected || response.type === "opaqueredirect")
      throw new CommerceError(
        "provider",
        "The commerce API must not redirect requests.",
      );
    if (!response.ok) {
      const [code, message] = statusErrors[response.status] ?? [
        "provider",
        "The commerce backend could not complete the request.",
      ];
      throw new CommerceError(code, message);
    }
    const mediaType = response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim();
    if (
      !mediaType ||
      !/^application\/(?:[\w!#$&^.+-]+\+)?json$/i.test(mediaType)
    )
      throw new CommerceError(
        "provider",
        "The commerce backend must return JSON.",
      );
    try {
      return await withCancellation(
        () => response.json() as Promise<unknown>,
        scope.signal,
      );
    } catch {
      checkCancellation(scope.signal);
      throw new CommerceError(
        "provider",
        "The commerce backend returned invalid JSON.",
      );
    }
  }

  function parseProduct(value: unknown, id: string, archived = false) {
    const result = commerceProductSchema.safeParse(value);
    if (
      !result.success ||
      result.data.id !== id ||
      (archived && result.data.status !== "archived") ||
      new Set(result.data.images.map((image) => image.id)).size !==
        result.data.images.length
    )
      throw invalidRecord();
    return result.data;
  }

  function parseOrder(value: unknown) {
    const result = commerceOrderSchema.safeParse(value);
    if (!result.success || !validOrderRelationships(result.data))
      throw invalidRecord();
    return result.data;
  }

  return {
    mode: "provider",
    provider,
    trustedRedirectOrigins,
    async load(scope) {
      const query = new URLSearchParams(scopeBody(scope));
      const snapshot = parseProviderCommerceSnapshot(
        await request(`?${query}`, scope),
      );
      if (!snapshot) throw invalidRecord();
      return snapshot;
    },
    async saveProduct(product, scope) {
      const input = commerceProductSchema.safeParse(product);
      if (
        !input.success ||
        new Set(input.data.images.map((image) => image.id)).size !==
          input.data.images.length
      )
        throw new CommerceError("validation", "Check the product fields.");
      // Do not let editable display references select provider resources.
      const fields = { ...input.data };
      delete fields.providerProductId;
      delete fields.providerPriceId;
      delete fields.stripeProductId;
      delete fields.stripePriceId;
      return parseProduct(
        await request("/products/save", scope, {
          ...scopeBody(scope),
          product: fields,
        }),
        fields.id,
      );
    },
    async archiveProduct(productId, scope) {
      const id = parseIdentifier(productId, "product");
      return parseProduct(
        await request("/products/archive", scope, {
          ...scopeBody(scope),
          productId: id,
        }),
        id,
        true,
      );
    },
    async syncProduct(productId, scope) {
      const id = parseIdentifier(productId, "product");
      return parseProduct(
        await request("/products/sync", scope, {
          ...scopeBody(scope),
          productId: id,
        }),
        id,
      );
    },
    async createOrder(input, scope) {
      const parsed = newOrderSchema.safeParse(input);
      if (!parsed.success)
        throw new CommerceError("validation", "Check the order fields.");
      const quantities = new Map<string, number>();
      for (const item of parsed.data.items)
        quantities.set(
          item.productId,
          (quantities.get(item.productId) ?? 0) + item.quantity,
        );
      if ([...quantities.values()].some((quantity) => quantity > 999))
        throw new CommerceError("validation", "Check the order quantities.");
      const normalized = {
        ...parsed.data,
        items: [...quantities].map(([productId, quantity]) => ({
          productId,
          quantity,
        })),
      };
      const result = parseOrder(
        await request("/orders/create", scope, {
          ...scopeBody(scope),
          input: normalized,
        }),
      );
      if (
        result.items.length !== quantities.size ||
        result.items.some(
          (item) => quantities.get(item.productId) !== item.quantity,
        ) ||
        result.customerEmail.toLowerCase() !==
          normalized.customerEmail.toLowerCase()
      )
        throw invalidRecord();
      return result;
    },
    async updateOrderStatus(orderId, status, scope) {
      const id = parseIdentifier(orderId, "order");
      const parsed = orderStatusSchema.safeParse(status);
      if (!parsed.success)
        throw new CommerceError(
          "validation",
          "Choose an available order status.",
        );
      const result = parseOrder(
        await request("/orders/status", scope, {
          ...scopeBody(scope),
          orderId: id,
          status: parsed.data,
        }),
      );
      if (result.id !== id || result.status !== parsed.data)
        throw invalidRecord();
      return result;
    },
    async createInvoice(input, scope) {
      const parsed = newInvoiceSchema.safeParse(input);
      if (!parsed.success)
        throw new CommerceError("validation", "Check the invoice fields.");
      const result = commerceInvoiceSchema.safeParse(
        await request("/invoices/create", scope, {
          ...scopeBody(scope),
          input: parsed.data,
        }),
      );
      if (
        !result.success ||
        result.data.currency !== parsed.data.currency ||
        result.data.customerEmail.toLowerCase() !==
          parsed.data.customerEmail.toLowerCase()
      )
        throw invalidRecord();
      return result.data;
    },
    async checkout(input, scope) {
      const parsed = checkoutSchema.safeParse(input);
      if (
        !parsed.success ||
        (parsed.data.kind === "subscription" &&
          !commerceBillingSchema.shape.plan.safeParse(parsed.data.id).success)
      )
        throw new CommerceError(
          "validation",
          "Choose an available checkout record.",
        );
      return parseProviderCommerceAction(
        await request("/checkout", scope, {
          ...scopeBody(scope),
          ...parsed.data,
        }),
        trustedRedirectOrigins,
      );
    },
    async portal(scope) {
      return parseProviderCommerceAction(
        await request("/portal", scope, scopeBody(scope)),
        trustedRedirectOrigins,
      );
    },
  };
}

export function createPaddleCommerceAdapter(
  options: ProviderCommerceTransportOptions,
): ProviderCommerceAdapter {
  return createProviderCommerceAdapter({ ...options, provider: "paddle" });
}

export function createPolarCommerceAdapter(
  options: ProviderCommerceTransportOptions,
): ProviderCommerceAdapter {
  return createProviderCommerceAdapter({ ...options, provider: "polar" });
}

export function createLemonSqueezyCommerceAdapter(
  options: ProviderCommerceTransportOptions,
): ProviderCommerceAdapter {
  return createProviderCommerceAdapter({
    ...options,
    provider: "lemon-squeezy",
  });
}
