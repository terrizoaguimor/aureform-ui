import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import ts from "typescript";

const sourceRoot = new URL("../src/", import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/link" || specifier === "next/navigation")
      return nextResolve(`${specifier}.js`, context);
    if (specifier.startsWith("@/"))
      specifier = new URL(specifier.slice(2), sourceRoot).href;
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        for (const extension of [".ts", ".tsx"]) {
          const candidate = new URL(
            `${specifier}${extension}`,
            context.parentURL,
          );
          if (existsSync(candidate))
            return nextResolve(candidate.href, context);
        }
      }
      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (url.startsWith(sourceRoot.href) && url.endsWith(".css"))
      return {
        format: "module",
        source: "export default {};",
        shortCircuit: true,
      };
    if (url.startsWith(sourceRoot.href) && url.endsWith(".json"))
      return {
        format: "module",
        source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`,
        shortCircuit: true,
      };
    if (url.startsWith(sourceRoot.href) && url.endsWith(".tsx"))
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
        shortCircuit: true,
      };
    return nextLoad(url, context);
  },
});
after(() => hooks.deregister());

const { createCommerceSeed } = await import("../src/demo/commerce-data.ts");
const {
  CommerceError,
  buildOrder,
  commerceBillingSchema,
  commerceProductSchema,
  getCommerceProviderLabel,
} = await import("../src/lib/commerce.ts");
const { completeMockCheckout, upsertCommerceProduct } =
  await import("../src/lib/commerce-state.ts");
const {
  createProviderCommerceAdapter,
  createPaddleCommerceAdapter,
  createPolarCommerceAdapter,
  createLemonSqueezyCommerceAdapter,
  isTrustedCommerceRedirect,
  normalizeCommerceRedirectOrigins,
  parseProviderCommerceAction,
  parseProviderCommerceSnapshot,
  resolveCommerceProviderIdentity,
} = await import("../src/lib/provider-commerce-adapter.ts");
const { createStripeCommerceAdapter, isTrustedStripeRedirect } =
  await import("../src/lib/stripe-commerce-adapter.ts");
const { CommerceBilling } =
  await import("../src/components/blocks/commerce-billing.tsx");
const { CommerceOrderDetail } =
  await import("../src/components/blocks/commerce-order-editor.tsx");
const { CommerceInvoiceView } =
  await import("../src/components/blocks/commerce-invoice-view.tsx");
const { CommerceProvider, useCommerce } =
  await import("../src/components/commerce-provider.tsx");
const { WorkspaceProvider } =
  await import("../src/components/workspace-provider.tsx");

const now = "2026-10-20T15:00:00.000Z";
const scope = { workspaceId: "studio" };
const trustedRedirectOrigins = [
  "https://checkout.example.test",
  "https://billing.example.test",
];
const customer = {
  customerName: "Demo Customer",
  customerEmail: "customer@example.test",
};
const invoiceInput = {
  ...customer,
  description: "Authorized service invoice",
  amount: 4300,
  currency: "usd",
  dueAt: "2026-11-20T15:00:00.000Z",
};
const factories = [
  [createPaddleCommerceAdapter, "paddle", "Paddle"],
  [createPolarCommerceAdapter, "polar", "Polar"],
  [createLemonSqueezyCommerceAdapter, "lemon-squeezy", "Lemon Squeezy"],
];

function json(value, status = 200, type = "application/json") {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": type },
  });
}
function adapterWith(value, extra = {}) {
  return createPaddleCommerceAdapter({
    trustedRedirectOrigins,
    fetcher: async () => json(value),
    ...extra,
  });
}
function code(expected) {
  return (error) => error instanceof CommerceError && error.code === expected;
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

// Native commerce fixtures exercise the complete transport without a provider SDK,
// a secret, a live payment, a browser redirect, or files outside this test.
function nativeBackend(provider) {
  let snapshot = createCommerceSeed();
  let sequence = 0;
  const requests = [];
  const fetcher = async (url, options) => {
    const target = new URL(url, "https://application.example.test");
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({ url, options, body });
    const requestedScope = body ?? Object.fromEntries(target.searchParams);
    if (
      requestedScope.workspaceId !== scope.workspaceId ||
      requestedScope.provider !== provider
    )
      return json({ error: "forbidden" }, 403);
    if (options.method === "GET") return json(snapshot);
    if (options.headers["X-CSRF-Token"] !== "test-csrf")
      return json({ error: "forbidden" }, 403);
    const path = target.pathname.replace("/api/commerce", "");
    const product = (id) => snapshot.products.find((item) => item.id === id);
    switch (path) {
      case "/products/save": {
        const saved = {
          ...body.product,
          updatedAt: now,
          providerProductId: product(body.product.id)?.providerProductId,
          providerPriceId: product(body.product.id)?.providerPriceId,
        };
        snapshot = upsertCommerceProduct(snapshot, saved, now);
        return json(product(saved.id));
      }
      case "/products/sync": {
        const saved = {
          ...product(body.productId),
          providerProductId: `mock-${provider}-product`,
          providerPriceId: `mock-${provider}-price`,
        };
        snapshot = upsertCommerceProduct(snapshot, saved, now);
        return json(product(saved.id));
      }
      case "/products/archive": {
        const saved = { ...product(body.productId), status: "archived" };
        snapshot = upsertCommerceProduct(snapshot, saved, now);
        return json(product(saved.id));
      }
      case "/orders/create": {
        // buildOrder reads server catalog cents, not the submitted totals.
        const order = buildOrder(
          body.input,
          snapshot.products,
          `ord-test-${++sequence}`,
          now,
        );
        snapshot.orders.unshift(order);
        return json(order);
      }
      case "/orders/status": {
        const order = snapshot.orders.find((item) => item.id === body.orderId);
        if (!order) return json({ error: "unavailable" }, 404);
        if (
          order.status === "cancelled" ||
          (["shipped", "delivered"].includes(body.status) &&
            order.paymentStatus !== "paid")
        )
          return json({ error: "conflict" }, 409);
        order.status = body.status;
        return json(order);
      }
      case "/invoices/create": {
        const invoice = {
          ...body.input,
          id: `inv-test-${++sequence}`,
          number: `TEST-${sequence}`,
          status: "open",
          issuedAt: now,
          providerInvoiceId: `mock-${provider}-invoice`,
        };
        snapshot.invoices.unshift(invoice);
        return json(invoice);
      }
      case "/checkout":
        return json({
          mode: "redirect",
          url: `https://checkout.example.test/session/${body.kind}/${body.id}`,
        });
      case "/portal":
        return json({
          mode: "redirect",
          url: "https://billing.example.test/customer/session",
        });
      default:
        return json({ error: "unavailable" }, 404);
    }
  };
  return {
    fetcher,
    requests,
    state: () => structuredClone(snapshot),
    fulfillOrder: (id) => {
      snapshot = completeMockCheckout(
        snapshot,
        { mode: "mock", kind: "order", id },
        "paid",
        now,
      );
    },
  };
}

for (const [factory, provider, label] of factories) {
  test(`${label} covers the complete catalog/order/invoice/checkout/portal contract`, async () => {
    const backend = nativeBackend(provider);
    const adapter = factory({
      baseUrl: "/api/commerce",
      trustedRedirectOrigins,
      getCsrfToken: async () => "test-csrf",
      fetcher: backend.fetcher,
    });
    assert.equal(adapter.mode, "provider");
    assert.deepEqual(adapter.provider, { id: provider, label });
    const initial = await adapter.load(scope);
    assert.equal(initial.products.length, 8);
    const updated = await adapter.saveProduct(
      {
        ...initial.products[0],
        name: "Edited native product",
        unitAmount: 14900,
        providerProductId: "client-forged-product",
        providerPriceId: "client-forged-price",
        stripeProductId: "client-forged-legacy",
        stripePriceId: "client-forged-legacy-price",
      },
      scope,
    );
    assert.equal(updated.name, "Edited native product");
    const savedBody = backend.requests.at(-1).body.product;
    for (const key of [
      "providerProductId",
      "providerPriceId",
      "stripeProductId",
      "stripePriceId",
    ])
      assert.equal(Object.hasOwn(savedBody, key), false);
    const synced = await adapter.syncProduct(updated.id, scope);
    assert.equal(synced.providerProductId, `mock-${provider}-product`);
    assert.equal(synced.providerPriceId, `mock-${provider}-price`);
    const order = await adapter.createOrder(
      {
        ...customer,
        total: 1,
        currency: "eur",
        paymentStatus: "paid",
        providerCustomerId: "someone-else",
        items: [
          { productId: updated.id, quantity: 1, unitAmount: 1 },
          { productId: updated.id, quantity: 2, name: "Forged line" },
        ],
      },
      scope,
    );
    assert.equal(order.total, 44700);
    assert.equal(order.paymentStatus, "unpaid");
    assert.deepEqual(backend.requests.at(-1).body.input, {
      ...customer,
      items: [{ productId: updated.id, quantity: 3 }],
    });
    const invoice = await adapter.createInvoice(invoiceInput, scope);
    assert.equal(invoice.amount, invoiceInput.amount);
    assert.equal(invoice.providerInvoiceId, `mock-${provider}-invoice`);
    for (const input of [
      { kind: "order", id: order.id },
      { kind: "invoice", id: invoice.id },
      { kind: "subscription", id: "Enterprise" },
    ]) {
      const action = await adapter.checkout(
        {
          ...input,
          total: 1,
          currency: "eur",
          customerId: "forged",
          successUrl: "https://attacker.example.test",
        },
        scope,
      );
      assert.equal(action.mode, "redirect");
      assert.deepEqual(backend.requests.at(-1).body, {
        workspaceId: "studio",
        provider,
        ...input,
      });
    }
    assert.equal(
      backend.state().orders.find((item) => item.id === order.id).paymentStatus,
      "unpaid",
    );
    assert.equal(
      (await adapter.portal(scope)).url,
      "https://billing.example.test/customer/session",
    );
    assert.deepEqual(backend.requests.at(-1).body, {
      workspaceId: "studio",
      provider,
    });
    await assert.rejects(
      () => adapter.updateOrderStatus(order.id, "shipped", scope),
      code("conflict"),
    );
    backend.fulfillOrder(order.id);
    assert.equal(
      (await adapter.updateOrderStatus(order.id, "shipped", scope)).status,
      "shipped",
    );
    assert.equal(
      (await adapter.updateOrderStatus(order.id, "delivered", scope))
        .paymentStatus,
      "paid",
    );
    assert.equal(
      (await adapter.archiveProduct(updated.id, scope)).status,
      "archived",
    );
    const final = await adapter.load(scope);
    assert.ok(parseProviderCommerceSnapshot(final));
    assert.deepEqual(final.orders.slice(1), initial.orders);
    for (const request of backend.requests) {
      assert.equal(request.options.credentials, "same-origin");
      assert.equal(request.options.mode, "same-origin");
      assert.equal(request.options.redirect, "error");
      assert.equal(request.options.cache, "no-store");
      assert.equal(request.options.headers["X-Aureform-Request"], "commerce");
      if (request.options.method === "POST")
        assert.equal(request.options.headers["X-CSRF-Token"], "test-csrf");
    }
  });
}

test("provider aliases and custom identities preserve actual labels and legacy Stripe fields", () => {
  for (const alias of [
    "lemon-squeezy",
    "lemonsqueezy",
    "lemonSqueezy",
    "lemon_squeezy",
  ])
    assert.deepEqual(
      createProviderCommerceAdapter({ provider: alias, trustedRedirectOrigins })
        .provider,
      { id: "lemon-squeezy", label: "Lemon Squeezy" },
    );
  const custom = createProviderCommerceAdapter({
    provider: { id: "acme-payments", label: "Acme Pay" },
    trustedRedirectOrigins,
  });
  assert.equal(getCommerceProviderLabel(custom), "Acme Pay");
  assert.equal(getCommerceProviderLabel({ mode: "stripe" }), "Stripe");
  assert.equal(getCommerceProviderLabel({ mode: "mock" }), "Demo");
  assert.equal(getCommerceProviderLabel({ mode: "provider" }), "Commerce");
  assert.throws(
    () => resolveCommerceProviderIdentity("unknown-provider"),
    code("validation"),
  );
  for (const provider of [
    null,
    { id: "bad/id", label: "Bad" },
    { id: "acme", label: "" },
    { id: "acme", label: "Bad\nLabel" },
  ])
    assert.throws(
      () => resolveCommerceProviderIdentity(provider),
      code("validation"),
    );
  const product = {
    ...createCommerceSeed().products[0],
    stripeProductId: "prod_legacy",
    stripePriceId: "price_legacy",
    providerProductId: "neutral_product",
    providerPriceId: "neutral_price",
  };
  assert.deepEqual(commerceProductSchema.parse(product), product);
});

test("redirect origins are explicit, exact, immutable and never inherited from Stripe", () => {
  assert.throws(
    () => createPaddleCommerceAdapter({ trustedRedirectOrigins: [] }),
    code("validation"),
  );
  for (const origin of [
    "http://checkout.example.test",
    "//checkout.example.test",
    "https://*.example.test",
    "https://checkout.example.test/path",
    "https://checkout.example.test?next=x",
    "https://checkout.example.test#x",
    "https://name:pass@checkout.example.test",
    " https://checkout.example.test",
    "https://checkout.example.test.",
    "https://%63heckout.example.test",
    "https:///checkout.example.test",
    "https://checkout.example.test/./",
    "https://checkout.example.test?",
    "https://checkout.example.test#",
  ])
    assert.throws(
      () => normalizeCommerceRedirectOrigins([origin]),
      code("validation"),
    );
  const input = ["https://CHECKOUT.example.test:443/"];
  const adapter = createPaddleCommerceAdapter({
    trustedRedirectOrigins: input,
  });
  input.push("https://attacker.example.test");
  assert.equal(
    isTrustedCommerceRedirect(
      "https://checkout.example.test/pay",
      adapter.trustedRedirectOrigins,
    ),
    true,
  );
  assert.equal(
    isTrustedCommerceRedirect(
      "https://attacker.example.test/pay",
      adapter.trustedRedirectOrigins,
    ),
    false,
  );
  assert.equal(
    isTrustedCommerceRedirect(
      "https://checkout.stripe.com/pay",
      adapter.trustedRedirectOrigins,
    ),
    false,
  );
  assert.equal(
    isTrustedCommerceRedirect("https://checkout.example.test:8443/pay", [
      "https://checkout.example.test:8443",
    ]),
    true,
  );
});

test("malicious redirects, credentials, URL parser aliases and mock actions fail closed", async () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,pay",
    "http://checkout.example.test/pay",
    "//checkout.example.test/pay",
    "/return",
    "https://checkout.example.test.attacker.test/pay",
    "https://checkout.example.test@attacker.test/pay",
    "https://user:pass@checkout.example.test/pay",
    "https://@checkout.example.test/pay",
    "https://checkout.example.test:8443/pay",
    "https://checkout.example.test./pay",
    "https://checkout.exаmple.test/pay",
    "https://checkout.example.test\\@attacker.test/pay",
    "https://checkout.example.test/\npay",
    " https://checkout.example.test/pay",
    "https://%63heckout.example.test/pay",
    "https:///checkout.example.test/pay",
  ]) {
    assert.equal(
      isTrustedCommerceRedirect(url, trustedRedirectOrigins),
      false,
      url,
    );
    await assert.rejects(
      () => adapterWith({ mode: "redirect", url }).portal(scope),
      code("provider"),
    );
  }
  for (const value of [
    null,
    {},
    { mode: "mock", kind: "order", id: "ord-x" },
    { mode: "redirect", url: 123 },
  ])
    assert.throws(
      () => parseProviderCommerceAction(value, trustedRedirectOrigins),
      code("provider"),
    );
  assert.deepEqual(
    parseProviderCommerceAction(
      {
        mode: "redirect",
        url: "https://checkout.example.test/pay?token=test-token",
        customerId: "must-not-escape",
      },
      trustedRedirectOrigins,
    ),
    {
      mode: "redirect",
      url: "https://checkout.example.test/pay?token=test-token",
    },
  );
});

test("base paths are same-origin and unsafe paths never issue a request", () => {
  for (const baseUrl of [
    "",
    "/",
    "https://foreign.example.test/api",
    "//foreign.example.test",
    "/api/../secret",
    "/api/./commerce",
    "/api?token=x",
    "/api#x",
    "/api/%2e%2e/secret",
    "/api/%252e%252e/secret",
    "/api/%2fsecret",
    "/api\\commerce",
    "/api/\ncommerce",
  ])
    assert.throws(
      () => createPaddleCommerceAdapter({ baseUrl, trustedRedirectOrigins }),
      code("validation"),
    );
  assert.equal(
    createPaddleCommerceAdapter({
      baseUrl: "/app/api/commerce.v1/",
      trustedRedirectOrigins,
    }).provider.id,
    "paddle",
  );
});

test("GET honors the build mount and uses encoded scope/provider without invoking CSRF", async () => {
  const previous = process.env.NEXT_PUBLIC_BASE_PATH;
  process.env.NEXT_PUBLIC_BASE_PATH = "/aureform-ui";
  try {
    let captured;
    const adapter = createPolarCommerceAdapter({
      trustedRedirectOrigins,
      getCsrfToken: () => {
        throw new Error("GET must not read a CSRF token");
      },
      fetcher: async (url, options) => {
        captured = { url, options };
        return json(
          createCommerceSeed(),
          200,
          "Application/JSON; charset=utf-8",
        );
      },
    });
    await adapter.load({ workspaceId: "scope&provider=attacker" });
    const url = new URL(captured.url, "https://app.example.test");
    assert.equal(url.pathname, "/aureform-ui/api/commerce");
    assert.equal(
      url.searchParams.get("workspaceId"),
      "scope&provider=attacker",
    );
    assert.equal(url.searchParams.get("provider"), "polar");
    assert.equal(captured.options.body, undefined);
    assert.equal(captured.options.headers["X-CSRF-Token"], undefined);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = previous;
  }
});

test("input validation strips payment aliases and rejects invalid mutations before transport", async () => {
  let calls = 0;
  const adapter = adapterWith(
    {},
    {
      fetcher: async () => {
        calls++;
        return json({});
      },
    },
  );
  for (const invoke of [
    () => adapter.load({ workspaceId: "" }),
    () => adapter.archiveProduct("", scope),
    () => adapter.syncProduct("x".repeat(101), scope),
    () => adapter.updateOrderStatus("ord-test", "paid", scope),
    () =>
      adapter.saveProduct(
        { ...createCommerceSeed().products[0], unitAmount: 1.5 },
        scope,
      ),
    () => {
      const product = createCommerceSeed().products[0];
      return adapter.saveProduct(
        {
          ...product,
          images: [product.images[0], product.images[0]],
        },
        scope,
      );
    },
    () => adapter.createOrder({ ...customer, items: [] }, scope),
    () =>
      adapter.createOrder(
        {
          ...customer,
          items: [
            { productId: "prd-001", quantity: 600 },
            { productId: "prd-001", quantity: 600 },
          ],
        },
        scope,
      ),
    () => adapter.createInvoice({ ...invoiceInput, amount: -1 }, scope),
    () => adapter.checkout({ kind: "portal", id: "x" }, scope),
    () =>
      adapter.checkout(
        { kind: "subscription", id: "price_client_selected" },
        scope,
      ),
    () => adapter.checkout({ kind: "order", id: "x".repeat(101) }, scope),
  ])
    await assert.rejects(invoke, code("validation"));
  assert.equal(calls, 0);
});

test("snapshots reject malformed shapes and relationships while retaining purchase-time prices", async () => {
  const changes = [
    (value) => {
      value.version = 2;
    },
    (value) => {
      value.products.push(structuredClone(value.products[0]));
    },
    (value) => {
      value.products[1].sku = value.products[0].sku.toLowerCase();
    },
    (value) => {
      value.products[0].images.push(
        structuredClone(value.products[0].images[0]),
      );
    },
    (value) => {
      value.orders.push(structuredClone(value.orders[0]));
    },
    (value) => {
      value.invoices.push(structuredClone(value.invoices[0]));
    },
    (value) => {
      value.orders[0].total += 1;
    },
    (value) => {
      value.orders[0].items[0].productId = "missing";
    },
    (value) => {
      value.orders[0].items = [
        value.orders[0].items[0],
        structuredClone(value.orders[0].items[0]),
      ];
      value.orders[0].total = value.orders[0].items.reduce(
        (sum, item) => sum + item.quantity * item.unitAmount,
        0,
      );
    },
    (value) => {
      value.orders[0].status = "shipped";
      value.orders[0].paymentStatus = "unpaid";
    },
    (value) => {
      value.billing.cardLast4 = "card-number";
    },
  ];
  for (const change of changes) {
    const snapshot = createCommerceSeed();
    change(snapshot);
    assert.equal(parseProviderCommerceSnapshot(snapshot), null);
    await assert.rejects(
      () => adapterWith(snapshot).load(scope),
      code("provider"),
    );
  }
  const edited = createCommerceSeed();
  edited.products[0].unitAmount += 100;
  edited.products[0].currency = "eur";
  assert.ok(parseProviderCommerceSnapshot(edited));
  const noCard = createCommerceSeed();
  noCard.billing.cardLast4 = "";
  noCard.billing.cardBrand = "Not disclosed";
  assert.ok(commerceBillingSchema.safeParse(noCard.billing).success);
  assert.ok(parseProviderCommerceSnapshot(noCard));
});

test("mutation results must match record identity, requested relationships and statuses", async () => {
  const seed = createCommerceSeed();
  const product = seed.products[0];
  await assert.rejects(
    () =>
      adapterWith({ ...product, id: "someone-else" }).saveProduct(
        product,
        scope,
      ),
    code("provider"),
  );
  await assert.rejects(
    () => adapterWith(product).archiveProduct(product.id, scope),
    code("provider"),
  );
  await assert.rejects(
    () =>
      adapterWith({ ...product, id: "someone-else" }).syncProduct(
        product.id,
        scope,
      ),
    code("provider"),
  );
  const orderInput = {
    ...customer,
    items: [{ productId: product.id, quantity: 2 }],
  };
  const order = buildOrder(orderInput, seed.products, "ord-test", now);
  for (const altered of [
    { ...order, total: order.total + 1 },
    { ...order, items: [{ ...order.items[0], productId: "prd-002" }] },
    { ...order, customerEmail: "another@example.test" },
    {
      ...order,
      items: [{ ...order.items[0], quantity: 1 }],
      total: product.unitAmount,
    },
  ])
    await assert.rejects(
      () => adapterWith(altered).createOrder(orderInput, scope),
      code("provider"),
    );
  await assert.rejects(
    () =>
      adapterWith({
        ...order,
        paymentStatus: "paid",
        status: "delivered",
      }).updateOrderStatus(order.id, "shipped", scope),
    code("provider"),
  );
  await assert.rejects(
    () =>
      adapterWith({ ...order, status: "shipped" }).updateOrderStatus(
        order.id,
        "shipped",
        scope,
      ),
    code("provider"),
  );
  const invoice = {
    ...invoiceInput,
    id: "inv-test",
    number: "TEST-1",
    status: "open",
    issuedAt: now,
  };
  for (const altered of [
    { ...invoice, currency: "eur" },
    { ...invoice, customerEmail: "another@example.test" },
    { ...invoice, dueAt: "not-a-date" },
  ])
    await assert.rejects(
      () => adapterWith(altered).createInvoice(invoiceInput, scope),
      code("provider"),
    );
});

test("HTTP failures use stable status codes and never reveal server response details", async () => {
  for (const [status, expected] of [
    [400, "validation"],
    [401, "forbidden"],
    [403, "forbidden"],
    [404, "unavailable"],
    [409, "conflict"],
    [422, "validation"],
    [429, "provider"],
    [500, "provider"],
    [503, "provider"],
  ]) {
    let calls = 0;
    const adapter = adapterWith(
      {},
      {
        fetcher: async () => {
          calls++;
          return new Response(
            "private provider credential or database details",
            { status },
          );
        },
      },
    );
    await assert.rejects(
      () => adapter.portal(scope),
      (error) => code(expected)(error) && !error.message.includes("private"),
    );
    assert.equal(calls, 1);
  }
});

test("successful API responses require actual JSON and cannot follow API redirects", async () => {
  for (const response of [
    new Response("html", { headers: { "Content-Type": "text/html" } }),
    new Response("{}", { headers: { "Content-Type": "application/jsonp" } }),
    new Response("{", { headers: { "Content-Type": "application/json" } }),
    new Response("{}"),
    new Response(null, {
      status: 302,
      headers: { Location: "https://foreign.example.test/api" },
    }),
  ])
    await assert.rejects(
      () => adapterWith({}, { fetcher: async () => response }).load(scope),
      code("provider"),
    );
  const redirected = json(createCommerceSeed());
  Object.defineProperty(redirected, "redirected", { value: true });
  await assert.rejects(
    () => adapterWith({}, { fetcher: async () => redirected }).load(scope),
    code("provider"),
  );
  assert.ok(
    await adapterWith(createCommerceSeed(), {
      fetcher: async () =>
        json(createCommerceSeed(), 200, "application/vnd.consumer+json"),
    }).load(scope),
  );
});

test("configured CSRF is mandatory for mutations and failures never leak callback details", async () => {
  for (const token of [null, "", " ", "bad\nheader", "bad\rheader", "☃"]) {
    let calls = 0;
    const adapter = adapterWith(
      {},
      {
        getCsrfToken: async () => token,
        fetcher: async () => {
          calls++;
          return json({});
        },
      },
    );
    await assert.rejects(() => adapter.portal(scope), code("forbidden"));
    assert.equal(calls, 0);
  }
  const failed = adapterWith(
    {},
    {
      getCsrfToken: () => {
        throw new Error("private csrf storage details");
      },
    },
  );
  await assert.rejects(
    () => failed.portal(scope),
    (error) => code("provider")(error) && !error.message.includes("private"),
  );
});

test("pre-cancelled requests issue no CSRF reads or HTTP calls", async () => {
  const controller = new AbortController();
  controller.abort("private cancellation reason");
  let calls = 0;
  const adapter = adapterWith(
    {},
    {
      getCsrfToken: () => {
        calls++;
        return "test-csrf";
      },
      fetcher: async () => {
        calls++;
        return json({});
      },
    },
  );
  await assert.rejects(
    () => adapter.portal({ ...scope, signal: controller.signal }),
    code("conflict"),
  );
  await assert.rejects(
    () => adapter.load({ ...scope, signal: controller.signal }),
    code("conflict"),
  );
  assert.equal(calls, 0);
});

test(
  "cancel during CSRF prevents transport even when the token getter ignores cancellation",
  { timeout: 2000 },
  async () => {
    const token = deferred();
    const entered = deferred();
    const controller = new AbortController();
    let calls = 0;
    const adapter = adapterWith(
      {},
      {
        getCsrfToken: () => {
          entered.resolve();
          return token.promise;
        },
        fetcher: async () => {
          calls++;
          return json({});
        },
      },
    );
    const operation = adapter.portal({ ...scope, signal: controller.signal });
    await entered.promise;
    controller.abort();
    await assert.rejects(operation, code("conflict"));
    token.resolve("test-csrf");
    await Promise.resolve();
    assert.equal(calls, 0);
  },
);

test(
  "cancel rejects promptly and ignores a late response from a custom fetcher",
  { timeout: 2000 },
  async () => {
    const response = deferred();
    const entered = deferred();
    const controller = new AbortController();
    const adapter = adapterWith(
      {},
      {
        fetcher: (_url, options) => {
          assert.strictEqual(options.signal, controller.signal);
          entered.resolve();
          return response.promise;
        },
      },
    );
    const operation = adapter.load({ ...scope, signal: controller.signal });
    await entered.promise;
    controller.abort();
    await assert.rejects(operation, code("conflict"));
    response.resolve(json(createCommerceSeed()));
  },
);

test(
  "cancel during JSON decoding rejects stale payloads without exposing parsing errors",
  { timeout: 2000 },
  async () => {
    const payload = deferred();
    const entered = deferred();
    const controller = new AbortController();
    const response = json({});
    Object.defineProperty(response, "json", {
      value: () => {
        entered.resolve();
        return payload.promise;
      },
    });
    const adapter = adapterWith({}, { fetcher: async () => response });
    const operation = adapter.load({ ...scope, signal: controller.signal });
    await entered.promise;
    controller.abort();
    await assert.rejects(operation, code("conflict"));
    payload.reject(new Error("private body parsing details"));
  },
);

test("network errors are sanitized, with no automatic retry of a mutation", async () => {
  let calls = 0;
  const adapter = adapterWith(
    {},
    {
      fetcher: async () => {
        calls++;
        throw new Error("private connection details");
      },
    },
  );
  await assert.rejects(
    () => adapter.createInvoice(invoiceInput, scope),
    (error) => code("provider")(error) && !error.message.includes("private"),
  );
  assert.equal(calls, 1);
});

function markup(Component, locale, props) {
  return renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      {
        locale,
        timeZone: "UTC",
        messages: { common: {} },
      },
      createElement(Component, props),
    ),
  );
}
const task = {
  pending: false,
  disabled: false,
  error: null,
  clearError() {},
  run: async () => true,
};

test("real billing, order and invoice views render provider labels in both languages", () => {
  for (const [factory, , label] of factories) {
    const adapter = factory({ trustedRedirectOrigins });
    const commerce = {
      ...createCommerceSeed(),
      ready: true,
      busy: null,
      mode: adapter.mode,
      provider: adapter.provider,
      error: null,
      persistenceError: null,
      canWrite: true,
      canManageBilling: true,
    };
    const order = commerce.orders.find(
      (item) => item.paymentStatus === "unpaid",
    );
    const invoice = commerce.invoices.find((item) => item.status === "open");
    for (const locale of ["en", "es"]) {
      const billing = markup(CommerceBilling, locale, {
        commerce,
        task,
        onPlan() {},
        onPortal() {},
      });
      assert.ok(billing.includes(label));
      assert.doesNotMatch(billing, /Stripe/);
      assert.ok(
        billing.includes(
          locale === "es"
            ? `Abrir portal de cliente de ${label}`
            : `Open ${label} customer portal`,
        ),
      );
      const orderView = markup(CommerceOrderDetail, locale, {
        order,
        commerce,
        task,
        onCheckout() {},
        onStatusChange() {},
      });
      assert.ok(
        orderView.includes(
          locale === "es"
            ? `Continuar al pago con ${label}`
            : `Continue to ${label} checkout`,
        ),
      );
      const invoiceView = markup(CommerceInvoiceView, locale, {
        invoice,
        requestedId: invoice.id,
        workspaceName: "Test workspace",
        commerce,
        task,
        onPay() {},
      });
      assert.ok(
        invoiceView.includes(
          locale === "es"
            ? `Pagar factura con ${label}`
            : `Pay invoice with ${label}`,
        ),
      );
      assert.doesNotMatch(orderView + invoiceView, /Stripe/);
    }
  }
});

test("billing renders missing provider card details honestly and preserves the demo", () => {
  const snapshot = createCommerceSeed();
  const commerce = {
    ...snapshot,
    ready: true,
    busy: null,
    mode: "provider",
    provider: { id: "polar", label: "Polar" },
    canWrite: true,
    canManageBilling: true,
    billing: { ...snapshot.billing, cardBrand: "Not disclosed", cardLast4: "" },
  };
  const connected = markup(CommerceBilling, "en", {
    commerce,
    task,
    onPlan() {},
    onPortal() {},
  });
  assert.match(connected, /No card details available/);
  assert.doesNotMatch(connected, /4242|••••/);
  const demo = markup(CommerceBilling, "en", {
    commerce: { ...commerce, mode: "mock", provider: undefined },
    task,
    onPlan() {},
    onPortal() {},
  });
  assert.match(demo, /Demo subscription/);
  assert.match(demo, /Preview portal/);
});

test("CommerceProvider exposes actual adapter identity and scoped demo identity without network calls", () => {
  function Probe() {
    const commerce = useCommerce();
    return createElement(
      "span",
      {
        "data-mode": commerce.mode,
        "data-provider": commerce.provider?.id,
        "data-billing": `${commerce.billing.plan}:${commerce.billing.cardLast4}`,
      },
      getCommerceProviderLabel(commerce),
    );
  }
  let calls = 0;
  const options = {
    trustedRedirectOrigins,
    fetcher: async () => {
      calls++;
      throw new Error("SSR must not make a commerce request");
    },
  };
  const cases = [
    ...factories.map(([factory, id, label]) => ({
      adapter: factory(options),
      mode: "provider",
      id,
      label,
    })),
    ...factories.map(([, id, label]) => ({
      demoProvider: { id, label },
      mode: "mock",
      id,
      label,
    })),
    {
      adapter: createStripeCommerceAdapter({ fetcher: options.fetcher }),
      demoProvider: { id: "paddle", label: "Paddle" },
      mode: "stripe",
      id: "stripe",
      label: "Stripe",
    },
    {
      adapter: createPolarCommerceAdapter(options),
      demoProvider: { id: "paddle", label: "Paddle" },
      mode: "provider",
      id: "polar",
      label: "Polar",
    },
    { mode: "mock", label: "Demo" },
  ];
  for (const { adapter, demoProvider, mode, id, label } of cases) {
    const output = renderToStaticMarkup(
      createElement(
        NextIntlClientProvider,
        {
          locale: "en",
          timeZone: "UTC",
          messages: { common: {} },
        },
        createElement(
          WorkspaceProvider,
          null,
          createElement(
            CommerceProvider,
            { adapter, demoProvider },
            createElement(Probe),
          ),
        ),
      ),
    );
    assert.ok(output.includes(`data-mode="${mode}"`));
    if (id) assert.ok(output.includes(`data-provider="${id}"`));
    else assert.doesNotMatch(output, /data-provider=/);
    assert.ok(output.includes(`>${label}</span>`));
    if (mode === "mock") assert.ok(output.includes('data-billing="Pro:4242"'));
  }
  assert.equal(calls, 0);
});

test("scoped provider demos keep mock portal/payment controls and truthful EN/ES labels", () => {
  for (const [, id, label] of factories) {
    const commerce = {
      ...createCommerceSeed(),
      mode: "mock",
      provider: { id, label },
      canWrite: true,
      canManageBilling: true,
    };
    for (const locale of ["en", "es"]) {
      const output = markup(CommerceBilling, locale, {
        commerce,
        task,
        onPlan() {},
        onPortal() {},
      });
      assert.ok(
        output.includes(
          locale === "es"
            ? `${label} · suscripción de ejemplo`
            : `${label} · demo subscription`,
        ),
      );
      assert.ok(
        output.includes(
          locale === "es" ? "Ver portal de ejemplo" : "Preview portal",
        ),
      );
      assert.doesNotMatch(output, /Stripe|connected|conectado/);
    }
  }
});

test("the existing Stripe factory still uses Stripe mode, payload and default redirect policy", async () => {
  let captured;
  const adapter = createStripeCommerceAdapter({
    baseUrl: "/api/commerce",
    fetcher: async (_url, options) => {
      captured = JSON.parse(options.body);
      return json({
        mode: "redirect",
        url: "https://checkout.stripe.com/c/pay/test",
      });
    },
  });
  assert.equal(adapter.mode, "stripe");
  assert.equal(getCommerceProviderLabel(adapter), "Stripe");
  await adapter.checkout({ kind: "order", id: "ord-test" }, scope);
  assert.deepEqual(captured, {
    workspaceId: "studio",
    kind: "order",
    id: "ord-test",
  });
  assert.equal(
    isTrustedStripeRedirect("https://checkout.stripe.com/c/pay/test"),
    true,
  );
  assert.equal(
    isTrustedStripeRedirect("https://checkout.example.test/pay"),
    false,
  );
});
