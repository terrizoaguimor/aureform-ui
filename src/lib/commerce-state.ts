import {
  CommerceError,
  commerceProductSchema,
  commerceSnapshotSchema,
  type CommerceAction,
  type CommerceBilling,
  type CommerceProduct,
  type CommerceSnapshot,
} from "./commerce";

export const COMMERCE_STORAGE_PREFIX = "aureform:commerce:v1:";
export const commercePlans = [
  { name: "Starter", amount: 9900 },
  { name: "Pro", amount: 24900 },
  { name: "Enterprise", amount: 69900 },
] as const;

export function parseCommerceSnapshot(value: unknown): CommerceSnapshot | null {
  const parsed = commerceSnapshotSchema.safeParse(value);
  if (!parsed.success) return null;
  const snapshot = parsed.data;
  for (const records of [
    snapshot.products,
    snapshot.orders,
    snapshot.invoices,
  ]) {
    if (new Set(records.map((item) => item.id)).size !== records.length)
      return null;
  }
  if (
    new Set(snapshot.products.map((item) => item.sku.toLowerCase())).size !==
    snapshot.products.length
  )
    return null;
  if (
    snapshot.products.some(
      (item) =>
        new Set(item.images.map((image) => image.id)).size !==
        item.images.length,
    )
  )
    return null;
  if (
    snapshot.orders.some(
      (order) =>
        order.total !==
        order.items.reduce(
          (sum, item) => sum + item.unitAmount * item.quantity,
          0,
        ),
    )
  )
    return null;
  return snapshot;
}

/** A changed amount/currency needs a new Stripe Price; never reuse the old id. */
export function upsertCommerceProduct(
  snapshot: CommerceSnapshot,
  candidate: CommerceProduct,
  now: string,
): CommerceSnapshot {
  const validated = commerceProductSchema.safeParse(candidate);
  if (!validated.success)
    throw new CommerceError("validation", "Check the product fields.");
  const product = validated.data;
  if (
    snapshot.products.some(
      (item) =>
        item.id !== product.id &&
        item.sku.toLowerCase() === product.sku.toLowerCase(),
    )
  ) {
    throw new CommerceError(
      "conflict",
      "Another product already uses this SKU.",
    );
  }
  const previous = snapshot.products.find((item) => item.id === product.id);
  if (!previous && snapshot.products.length >= 500) {
    throw new CommerceError("conflict", "The demo catalog is full.");
  }
  const changedPrice =
    previous &&
    (previous.unitAmount !== product.unitAmount ||
      previous.currency !== product.currency);
  const { stripePriceId, ...fields } = product;
  const next: CommerceProduct = {
    ...fields,
    ...(stripePriceId &&
    (!changedPrice || stripePriceId !== previous?.stripePriceId)
      ? { stripePriceId }
      : {}),
    updatedAt: now,
  };
  return {
    ...snapshot,
    products: previous
      ? snapshot.products.map((item) => (item.id === next.id ? next : item))
      : [next, ...snapshot.products],
  };
}

/** Applies a demo payment once. Failed payments never consume stock. */
export function completeMockCheckout(
  snapshot: CommerceSnapshot,
  action: Extract<CommerceAction, { mode: "mock" }>,
  outcome: "paid" | "failed",
  now: string,
): CommerceSnapshot {
  if (action.kind === "portal") {
    throw new CommerceError(
      "validation",
      "The customer portal does not accept a payment.",
    );
  }
  if (action.kind === "order") {
    const order = snapshot.orders.find((item) => item.id === action.id);
    if (
      !order ||
      order.status === "cancelled" ||
      order.paymentStatus === "refunded"
    ) {
      throw new CommerceError("unavailable", "This order cannot be paid.");
    }
    if (order.paymentStatus === "paid") return snapshot;
    if (outcome === "failed")
      return {
        ...snapshot,
        orders: snapshot.orders.map((item) =>
          item.id === order.id ? { ...item, paymentStatus: "failed" } : item,
        ),
      };
    const quantities = new Map<string, number>();
    for (const line of order.items) {
      quantities.set(
        line.productId,
        (quantities.get(line.productId) ?? 0) + line.quantity,
      );
    }
    for (const [productId, quantity] of quantities) {
      const product = snapshot.products.find((item) => item.id === productId);
      if (
        !product ||
        product.status !== "active" ||
        product.inventory < quantity
      ) {
        throw new CommerceError(
          "conflict",
          "Inventory changed. Review the order before paying.",
        );
      }
    }
    const invoiceId = `inv-order-${order.id}`;
    return {
      ...snapshot,
      products: snapshot.products.map((product) => ({
        ...product,
        inventory: product.inventory - (quantities.get(product.id) ?? 0),
      })),
      orders: snapshot.orders.map((item) =>
        item.id === order.id ? { ...item, paymentStatus: "paid" } : item,
      ),
      invoices: snapshot.invoices.some((item) => item.id === invoiceId)
        ? snapshot.invoices
        : [
            {
              id: invoiceId,
              number: `INV-${order.number.replace("#", "")}`,
              customerName: order.customerName,
              customerEmail: order.customerEmail,
              description: `Order ${order.number}`,
              amount: order.total,
              currency: order.currency,
              status: "paid",
              issuedAt: now,
              dueAt: now,
            },
            ...snapshot.invoices,
          ],
    };
  }
  if (action.kind === "invoice") {
    const invoice = snapshot.invoices.find((item) => item.id === action.id);
    if (!invoice || invoice.status === "draft" || invoice.status === "void") {
      throw new CommerceError("unavailable", "This invoice cannot be paid.");
    }
    if (invoice.status === "paid" || outcome === "failed") return snapshot;
    return {
      ...snapshot,
      invoices: snapshot.invoices.map((item) =>
        item.id === invoice.id ? { ...item, status: "paid" } : item,
      ),
    };
  }
  const plan = commercePlans.find((item) => item.name === action.id);
  if (!plan) throw new CommerceError("validation", "Choose an available plan.");
  if (outcome === "failed") return snapshot;
  if (
    snapshot.billing.plan === plan.name &&
    snapshot.billing.status === "active"
  )
    return snapshot;
  const period = new Date(now);
  period.setUTCMonth(period.getUTCMonth() + 1);
  const billing: CommerceBilling = {
    ...snapshot.billing,
    plan: plan.name,
    amount: plan.amount,
    status: "active",
    interval: "month",
    currentPeriodEnd: period.toISOString(),
  };
  return {
    ...snapshot,
    billing,
    invoices: [
      {
        id: `inv-plan-${plan.name.toLowerCase()}-${Date.parse(now)}`,
        number: `SUB-${Date.parse(now).toString(36).toUpperCase()}`,
        customerName: "Aureform workspace",
        customerEmail: billing.customerEmail,
        description: `${plan.name} subscription`,
        amount: plan.amount,
        currency: billing.currency,
        status: "paid",
        issuedAt: now,
        dueAt: now,
      },
      ...snapshot.invoices,
    ],
  };
}
