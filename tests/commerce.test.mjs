import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const resolution = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      specifier = pathToFileURL(resolve(root, "src", specifier.slice(2))).href;
    }
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
const { createCommerceSeed } = await import("../src/demo/commerce-data.ts");
const { buildOrder, CommerceError, isProductImageSource } =
  await import("../src/lib/commerce.ts");
const { parseCommerceSnapshot, upsertCommerceProduct, completeMockCheckout } =
  await import("../src/lib/commerce-state.ts");
const { createStripeCommerceAdapter, isTrustedStripeRedirect } =
  await import("../src/lib/stripe-commerce-adapter.ts");
resolution.deregister();
const now = "2026-10-19T16:00:00.000Z";
const customer = {
  customerName: "Demo Customer",
  customerEmail: "demo@example.com",
};

test("commerce snapshots reject duplicate identities, SKUs and mismatched order totals", () => {
  const seed = createCommerceSeed();
  assert.ok(parseCommerceSnapshot(seed));
  assert.equal(parseCommerceSnapshot({ ...seed, version: 2 }), null);
  const duplicate = structuredClone(seed);
  duplicate.products.push(duplicate.products[0]);
  assert.equal(parseCommerceSnapshot(duplicate), null);
  const sku = structuredClone(seed);
  sku.products[1].sku = sku.products[0].sku.toLowerCase();
  assert.equal(parseCommerceSnapshot(sku), null);
  const altered = structuredClone(seed);
  altered.orders[0].total += 1;
  assert.equal(parseCommerceSnapshot(altered), null);
});

test("orders use catalog cents, merge quantities, and reject unavailable stock or mixed currencies", () => {
  const seed = createCommerceSeed();
  const input = {
    ...customer,
    total: 1,
    items: [
      { productId: "prd-001", quantity: 2, unitAmount: 1 },
      { productId: "prd-001", quantity: 1 },
    ],
  };
  const order = buildOrder(input, seed.products, "ord-qa", now);
  assert.equal(order.total, 44400);
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].quantity, 3);
  assert.equal(order.items[0].unitAmount, 14800);
  assert.equal(order.paymentStatus, "unpaid");
  for (const items of [
    [{ productId: "prd-001", quantity: 85 }],
    [{ productId: "prd-006", quantity: 1 }],
    [{ productId: "prd-004", quantity: 1 }],
    [{ productId: "missing", quantity: 1 }],
    [{ productId: "prd-001", quantity: 0 }],
    [{ productId: "prd-001", quantity: 1.5 }],
  ])
    assert.throws(
      () => buildOrder({ ...customer, items }, seed.products, "ord-qa", now),
      CommerceError,
    );
  seed.products[1].currency = "eur";
  assert.throws(
    () =>
      buildOrder(
        {
          ...customer,
          items: [
            { productId: "prd-001", quantity: 1 },
            { productId: "prd-002", quantity: 1 },
          ],
        },
        seed.products,
        "ord-qa",
        now,
      ),
    /one currency/,
  );
});

test("price edits invalidate a reused Stripe Price without changing purchase-time orders", () => {
  const seed = createCommerceSeed();
  seed.products[0].stripeProductId = "prod_demo_existing";
  seed.products[0].stripePriceId = "price_demo_existing";
  const edited = { ...seed.products[0], unitAmount: 15000 };
  const next = upsertCommerceProduct(seed, edited, now);
  assert.equal(next.products[0].stripePriceId, undefined);
  assert.equal(next.products[0].stripeProductId, "prod_demo_existing");
  assert.deepEqual(next.orders, seed.orders);
  const server = upsertCommerceProduct(
    seed,
    { ...edited, stripePriceId: "price_demo_new" },
    now,
  );
  assert.equal(server.products[0].stripePriceId, "price_demo_new");
  assert.throws(
    () =>
      upsertCommerceProduct(
        seed,
        { ...edited, sku: seed.products[1].sku },
        now,
      ),
    /SKU/,
  );
});

test("failed checkout leaves inventory intact; successful checkout consumes once and creates one invoice", () => {
  const seed = createCommerceSeed();
  const order = buildOrder(
    {
      ...customer,
      items: [{ productId: "prd-001", quantity: 2 }],
    },
    seed.products,
    "ord-qa",
    now,
  );
  seed.orders.unshift(order);
  const action = { mode: "mock", kind: "order", id: order.id };
  const failed = completeMockCheckout(seed, action, "failed", now);
  assert.equal(failed.orders[0].paymentStatus, "failed");
  assert.equal(failed.products[0].inventory, 84);
  assert.equal(failed.invoices.length, seed.invoices.length);
  const paid = completeMockCheckout(failed, action, "paid", now);
  assert.equal(paid.orders[0].paymentStatus, "paid");
  assert.equal(paid.products[0].inventory, 82);
  assert.equal(paid.invoices[0].amount, 29600);
  assert.equal(paid.invoices[0].status, "paid");
  assert.equal(paid.invoices.length, seed.invoices.length + 1);
  assert.strictEqual(completeMockCheckout(paid, action, "paid", now), paid);
  assert.ok(parseCommerceSnapshot(paid));
});

test("checkout rechecks current inventory and rejects cancelled orders without partial changes", () => {
  const seed = createCommerceSeed();
  const order = buildOrder(
    {
      ...customer,
      items: [{ productId: "prd-001", quantity: 2 }],
    },
    seed.products,
    "ord-qa",
    now,
  );
  seed.orders.unshift(order);
  seed.products[0].inventory = 1;
  const original = structuredClone(seed);
  assert.throws(
    () =>
      completeMockCheckout(
        seed,
        { mode: "mock", kind: "order", id: order.id },
        "paid",
        now,
      ),
    /Inventory changed/,
  );
  assert.deepEqual(seed, original);
  assert.throws(
    () =>
      completeMockCheckout(
        seed,
        { mode: "mock", kind: "order", id: "ord-1053" },
        "paid",
        now,
      ),
    /cannot be paid/,
  );
});

test("invoice and subscription previews apply successful state changes only", () => {
  const seed = createCommerceSeed();
  const invoiceAction = { mode: "mock", kind: "invoice", id: "inv-003" };
  assert.strictEqual(
    completeMockCheckout(seed, invoiceAction, "failed", now),
    seed,
  );
  const paid = completeMockCheckout(seed, invoiceAction, "paid", now);
  assert.equal(
    paid.invoices.find((invoice) => invoice.id === "inv-003").status,
    "paid",
  );
  assert.throws(
    () =>
      completeMockCheckout(
        seed,
        { ...invoiceAction, id: "inv-007" },
        "paid",
        now,
      ),
    /cannot be paid/,
  );
  const upgrade = { mode: "mock", kind: "subscription", id: "Enterprise" };
  assert.strictEqual(completeMockCheckout(seed, upgrade, "failed", now), seed);
  const upgraded = completeMockCheckout(seed, upgrade, "paid", now);
  assert.equal(upgraded.billing.plan, "Enterprise");
  assert.equal(upgraded.billing.amount, 69900);
  assert.equal(upgraded.invoices[0].description, "Enterprise subscription");
  assert.strictEqual(
    completeMockCheckout(upgraded, upgrade, "paid", now),
    upgraded,
  );
});

test("product image sources accept safe raster/local assets and reject executable or oversized payloads", () => {
  for (const source of [
    "/assets/products/forma-desk-lamp.svg",
    "https://images.example.com/product.png",
    "data:image/webp;base64,AAAA",
  ]) {
    assert.equal(isProductImageSource(source), true);
  }
  for (const source of [
    "javascript:alert(1)",
    "//foreign.example/x",
    "/../config",
    "/\\foreign",
    "blob:demo",
    "data:image/svg+xml;base64,AAAA",
    `data:image/png;base64,${"A".repeat(1_000_000)}`,
  ]) {
    assert.equal(isProductImageSource(source), false);
  }
});

test("Stripe redirects reject lookalike domains, credentials and non-HTTPS URLs", () => {
  for (const url of [
    "https://checkout.stripe.com/c/pay/demo",
    "https://billing.stripe.com/p/session/demo",
    "https://invoice.stripe.com/i/demo",
  ])
    assert.equal(isTrustedStripeRedirect(url), true);
  for (const url of [
    "javascript:alert(1)",
    "http://checkout.stripe.com/demo",
    "https://checkout.stripe.com.attacker.example/demo",
    "https://checkout.stripe.com@attacker.example/demo",
    "https://user:pass@checkout.stripe.com/demo",
    "https://checkout.stripe.com:8080/demo",
    "/en/dashboard/",
  ])
    assert.equal(isTrustedStripeRedirect(url), false);
});

test("Stripe transport uses same-origin credentials and CSRF while checkout posts ids, never prices", async () => {
  const requests = [];
  const adapter = createStripeCommerceAdapter({
    baseUrl: "/api/commerce",
    getCsrfToken: () => "demo-csrf",
    fetcher: async (url, options) => {
      requests.push({ url, options });
      return new Response(
        JSON.stringify({
          mode: "redirect",
          url: "https://checkout.stripe.com/c/pay/demo",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    },
  });
  const controller = new AbortController();
  const action = await adapter.checkout(
    { kind: "order", id: "ord-qa" },
    { workspaceId: "studio", signal: controller.signal },
  );
  assert.equal(action.mode, "redirect");
  const { url, options } = requests[0];
  assert.equal(url, "/api/commerce/checkout");
  assert.equal(options.credentials, "same-origin");
  assert.equal(options.redirect, "error");
  assert.equal(options.cache, "no-store");
  assert.equal(options.headers["X-CSRF-Token"], "demo-csrf");
  assert.strictEqual(options.signal, controller.signal);
  assert.deepEqual(JSON.parse(options.body), {
    workspaceId: "studio",
    kind: "order",
    id: "ord-qa",
  });
});

test("Stripe transport validates snapshots and suppresses backend error details", async () => {
  const adapter = createStripeCommerceAdapter({
    fetcher: async () =>
      new Response(JSON.stringify(createCommerceSeed()), {
        headers: { "Content-Type": "application/json" },
      }),
  });
  assert.equal(
    (await adapter.load({ workspaceId: "studio" })).products.length,
    8,
  );
  for (const [body, headers] of [
    [{}, { "Content-Type": "application/json" }],
    ["html", { "Content-Type": "text/html" }],
  ]) {
    const invalid = createStripeCommerceAdapter({
      fetcher: async () => new Response(JSON.stringify(body), { headers }),
    });
    await assert.rejects(
      () => invalid.load({ workspaceId: "studio" }),
      CommerceError,
    );
  }
  const denied = createStripeCommerceAdapter({
    fetcher: async () =>
      new Response("Sensitive database error", { status: 403 }),
  });
  await assert.rejects(
    () => denied.portal({ workspaceId: "studio" }),
    (error) =>
      error.code === "forbidden" && !error.message.includes("Sensitive"),
  );
  for (const baseUrl of [
    "https://foreign.example/api",
    "//foreign.example",
    "/api/../secret",
    "/api?token=x",
    "/api/%2e%2e/secret",
  ]) {
    assert.throws(
      () => createStripeCommerceAdapter({ baseUrl }),
      CommerceError,
    );
  }
});
