import { z } from "zod";

export const commerceCurrencies = ["usd", "eur", "gbp"] as const;
export type CommerceCurrency = (typeof commerceCurrencies)[number];
export type ProductStatus = "active" | "draft" | "archived";
export type ProductImage = {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
};
/** Amounts are integer minor units. The supported currencies use two decimals. */
export type CommerceProduct = {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  status: ProductStatus;
  unitAmount: number;
  currency: CommerceCurrency;
  inventory: number;
  images: ProductImage[];
  tags: string[];
  /** Optional display references; the backend owns the actual provider mapping. */
  providerProductId?: string;
  providerPriceId?: string;
  stripeProductId?: string;
  stripePriceId?: string;
  updatedAt: string;
};
export type OrderLine = {
  productId: string;
  name: string;
  quantity: number;
  unitAmount: number;
  image?: string;
};
export type CommerceOrder = {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  currency: CommerceCurrency;
  total: number;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "failed" | "refunded";
  items: OrderLine[];
  createdAt: string;
  shippingAddress: string;
  providerSessionId?: string;
  stripeSessionId?: string;
};
export type CommerceInvoice = {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  description: string;
  amount: number;
  currency: CommerceCurrency;
  status: "draft" | "open" | "paid" | "overdue" | "void";
  issuedAt: string;
  dueAt: string;
  providerInvoiceId?: string;
  stripeInvoiceId?: string;
};
export type CommerceBilling = {
  plan: "Starter" | "Pro" | "Enterprise";
  status: "active" | "trialing" | "past_due" | "cancelled";
  amount: number;
  currency: CommerceCurrency;
  interval: "month" | "year";
  currentPeriodEnd: string;
  cardBrand: string;
  /** Empty when the provider does not expose card details. */
  cardLast4: string;
  customerEmail: string;
  providerCustomerId?: string;
  stripeCustomerId?: string;
};
export type CommerceSnapshot = {
  version: 1;
  products: CommerceProduct[];
  orders: CommerceOrder[];
  invoices: CommerceInvoice[];
  billing: CommerceBilling;
};
export type NewOrderInput = {
  customerName: string;
  customerEmail: string;
  shippingAddress?: string;
  items: { productId: string; quantity: number }[];
};
export type NewInvoiceInput = {
  customerName: string;
  customerEmail: string;
  description: string;
  amount: number;
  currency: CommerceCurrency;
  dueAt: string;
};
export type CheckoutRequest = {
  kind: "order" | "invoice" | "subscription";
  id: string;
};
export type CommerceAction =
  | { mode: "mock"; kind: CheckoutRequest["kind"] | "portal"; id: string }
  | { mode: "redirect"; url: string };
export type CommerceScope = { workspaceId: string; signal?: AbortSignal };
export type CommerceProviderIdentity = { id: string; label: string };

/** Implement this contract on your own authenticated backend. */
export type CommerceAdapter = {
  mode: "stripe" | "provider";
  /** Legacy Stripe adapters can omit these fields and retain their old policy. */
  provider?: CommerceProviderIdentity;
  /** Required for provider mode; exact HTTPS origins, with no wildcard hosts. */
  trustedRedirectOrigins?: readonly string[];
  load: (scope: CommerceScope) => Promise<CommerceSnapshot>;
  saveProduct: (
    product: CommerceProduct,
    scope: CommerceScope,
  ) => Promise<CommerceProduct>;
  archiveProduct: (
    productId: string,
    scope: CommerceScope,
  ) => Promise<CommerceProduct>;
  syncProduct: (
    productId: string,
    scope: CommerceScope,
  ) => Promise<CommerceProduct>;
  createOrder: (
    input: NewOrderInput,
    scope: CommerceScope,
  ) => Promise<CommerceOrder>;
  updateOrderStatus: (
    orderId: string,
    status: CommerceOrder["status"],
    scope: CommerceScope,
  ) => Promise<CommerceOrder>;
  createInvoice: (
    input: NewInvoiceInput,
    scope: CommerceScope,
  ) => Promise<CommerceInvoice>;
  checkout: (
    input: CheckoutRequest,
    scope: CommerceScope,
  ) => Promise<CommerceAction>;
  portal: (scope: CommerceScope) => Promise<CommerceAction>;
};

export type CommerceContextValue = CommerceSnapshot & {
  ready: boolean;
  busy: string | null;
  mode: "mock" | CommerceAdapter["mode"];
  provider?: CommerceProviderIdentity;
  error: CommerceError | null;
  persistenceError: "read" | "write" | "invalid" | null;
  canWrite: boolean;
  canManageBilling: boolean;
  reload: () => Promise<void>;
  retryPersistence: () => void;
  saveProduct: (product: CommerceProduct) => Promise<CommerceProduct>;
  archiveProduct: (id: string) => Promise<CommerceProduct>;
  syncProduct: (id: string) => Promise<CommerceProduct>;
  createOrder: (input: NewOrderInput) => Promise<CommerceOrder>;
  updateOrderStatus: (
    id: string,
    status: CommerceOrder["status"],
  ) => Promise<CommerceOrder>;
  createInvoice: (input: NewInvoiceInput) => Promise<CommerceInvoice>;
  checkoutOrder: (id: string) => Promise<CommerceAction>;
  payInvoice: (id: string) => Promise<CommerceAction>;
  checkoutPlan: (plan: CommerceBilling["plan"]) => Promise<CommerceAction>;
  openPortal: () => Promise<CommerceAction>;
  simulateCheckout: (
    action: Extract<CommerceAction, { mode: "mock" }>,
    outcome: "paid" | "failed",
  ) => Promise<void>;
};

/** Shared by connected views; legacy Stripe contexts keep their display name. */
export function getCommerceProviderLabel(
  value: Pick<CommerceContextValue, "mode" | "provider">,
) {
  return (
    value.provider?.label ??
    (value.mode === "mock"
      ? "Demo"
      : value.mode === "stripe"
        ? "Stripe"
        : "Commerce")
  );
}

const integerAmount = z.number().int().nonnegative().max(100_000_000);
const identifier = z.string().trim().min(1).max(100);
const currency = z.enum(commerceCurrencies);
export function isProductImageSource(src: string) {
  if (src.startsWith("/") && !src.startsWith("//") && !src.includes("\\")) {
    return !src.includes("..");
  }
  if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src)) {
    return src.length <= 1_000_000;
  }
  try {
    return new URL(src).protocol === "https:";
  } catch {
    return false;
  }
}
export const productImageSchema = z.object({
  id: identifier,
  src: z
    .string()
    .refine(isProductImageSource, "Use a local, HTTPS or prepared image."),
  alt: z.string().trim().min(1).max(240),
  width: z.number().int().positive().max(16384).optional(),
  height: z.number().int().positive().max(16384).optional(),
});
export const commerceProductSchema = z.object({
  id: identifier,
  name: z.string().trim().min(2).max(140),
  sku: z.string().trim().min(2).max(64),
  description: z.string().trim().max(5000),
  category: z.string().trim().min(1).max(80),
  status: z.enum(["active", "draft", "archived"]),
  unitAmount: integerAmount,
  currency,
  inventory: z.number().int().nonnegative().max(1_000_000),
  images: z.array(productImageSchema).max(6),
  tags: z.array(z.string().trim().min(1).max(40)).max(12),
  providerProductId: identifier.optional(),
  providerPriceId: identifier.optional(),
  stripeProductId: identifier.optional(),
  stripePriceId: identifier.optional(),
  updatedAt: z.iso.datetime(),
});
const orderLineSchema = z.object({
  productId: identifier,
  name: z.string().min(1).max(140),
  quantity: z.number().int().min(1).max(999),
  unitAmount: integerAmount,
  image: z.string().refine(isProductImageSource).optional(),
});
export const commerceOrderSchema = z.object({
  id: identifier,
  number: z.string().min(1).max(40),
  customerName: z.string().trim().min(2).max(140),
  customerEmail: z.email(),
  currency,
  total: integerAmount,
  status: z.enum(["processing", "shipped", "delivered", "cancelled"]),
  paymentStatus: z.enum(["unpaid", "paid", "failed", "refunded"]),
  items: z.array(orderLineSchema).min(1).max(50),
  createdAt: z.iso.datetime(),
  shippingAddress: z.string().max(500),
  providerSessionId: identifier.optional(),
  stripeSessionId: identifier.optional(),
});
export const commerceInvoiceSchema = z.object({
  id: identifier,
  number: z.string().min(1).max(40),
  customerName: z.string().trim().min(2).max(140),
  customerEmail: z.email(),
  description: z.string().max(1000),
  amount: integerAmount,
  currency,
  status: z.enum(["draft", "open", "paid", "overdue", "void"]),
  issuedAt: z.iso.datetime(),
  dueAt: z.iso.datetime(),
  providerInvoiceId: identifier.optional(),
  stripeInvoiceId: identifier.optional(),
});
export const commerceBillingSchema = z.object({
  plan: z.enum(["Starter", "Pro", "Enterprise"]),
  status: z.enum(["active", "trialing", "past_due", "cancelled"]),
  amount: integerAmount,
  currency,
  interval: z.enum(["month", "year"]),
  currentPeriodEnd: z.iso.datetime(),
  cardBrand: z.string().min(1).max(40),
  cardLast4: z.string().regex(/^(?:\d{4})?$/),
  customerEmail: z.email(),
  providerCustomerId: identifier.optional(),
  stripeCustomerId: identifier.optional(),
});
export const commerceSnapshotSchema = z.object({
  version: z.literal(1),
  products: z.array(commerceProductSchema).max(500),
  orders: z.array(commerceOrderSchema).max(1000),
  invoices: z.array(commerceInvoiceSchema).max(1000),
  billing: commerceBillingSchema,
});
export const newOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(140),
  customerEmail: z.email(),
  shippingAddress: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        productId: identifier,
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .min(1)
    .max(50),
});
export const newInvoiceSchema = z.object({
  customerName: z.string().trim().min(2).max(140),
  customerEmail: z.email(),
  description: z.string().trim().min(2).max(1000),
  amount: integerAmount,
  currency,
  dueAt: z.iso.datetime(),
});

export class CommerceError extends Error {
  readonly code:
    "validation" | "unavailable" | "conflict" | "forbidden" | "provider";
  constructor(code: CommerceError["code"], message: string) {
    super(message);
    this.name = "CommerceError";
    this.code = code;
  }
}

export function buildOrder(
  input: NewOrderInput,
  products: readonly CommerceProduct[],
  id: string,
  createdAt: string,
): CommerceOrder {
  const result = newOrderSchema.safeParse(input);
  if (!result.success)
    throw new CommerceError("validation", "Check the order fields.");
  const merged = new Map<string, number>();
  for (const line of result.data.items) {
    merged.set(
      line.productId,
      (merged.get(line.productId) ?? 0) + line.quantity,
    );
  }
  let orderCurrency: CommerceCurrency | undefined;
  const items = [...merged].map(([productId, quantity]) => {
    const product = products.find((item) => item.id === productId);
    if (!product || product.status !== "active") {
      throw new CommerceError(
        "unavailable",
        "The selected product is unavailable.",
      );
    }
    if (quantity > 999 || quantity > product.inventory) {
      throw new CommerceError("conflict", "There is not enough inventory.");
    }
    if (orderCurrency && orderCurrency !== product.currency) {
      throw new CommerceError("validation", "Use one currency per order.");
    }
    orderCurrency = product.currency;
    return {
      productId,
      name: product.name,
      quantity,
      unitAmount: product.unitAmount,
      ...(product.images[0] ? { image: product.images[0].src } : {}),
    };
  });
  const order: CommerceOrder = {
    id,
    number: `#${id.replace(/^ord-/, "").slice(0, 12).toUpperCase()}`,
    customerName: result.data.customerName,
    customerEmail: result.data.customerEmail,
    currency: orderCurrency ?? "usd",
    total: items.reduce(
      (sum, item) => sum + item.unitAmount * item.quantity,
      0,
    ),
    status: "processing",
    paymentStatus: "unpaid",
    items,
    createdAt,
    shippingAddress: result.data.shippingAddress ?? "",
  };
  const validated = commerceOrderSchema.safeParse(order);
  if (!validated.success)
    throw new CommerceError("validation", "The order total is out of range.");
  return validated.data;
}
