import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { CommerceSnapshot } from "../../src/lib/commerce";

const providers = [
  { id: "paddle", label: "Paddle" },
  { id: "polar", label: "Polar" },
  { id: "lemon-squeezy", label: "Lemon Squeezy" },
] as const;
type Provider = (typeof providers)[number];
type Locale = "en" | "es";

const supplied = process.env.AUREFORM_BASE_URL;
const mount = supplied ? new URL(supplied).pathname.replace(/\/+$/, "") : "";
const route = (path: string, locale: Locale = "en") =>
  `${mount}/${locale}/${path ? `${path}/` : ""}`;
const commerceKey = "aureform:commerce:v1:studio";

// Every case exercises the anonymous local demo, including any popup. Block
// external traffic before it can reach a provider and fail on attempted calls.
const test = base.extend<{ localBoundary: void }>({
  localBoundary: [
    async ({ context, page, baseURL }, use) => {
      const origin = new URL(baseURL ?? supplied ?? "http://127.0.0.1:3124")
        .origin;
      const external: string[] = [];
      const consumer: string[] = [];
      const errors: string[] = [];
      await context.route(/^https?:\/\//, async (request) => {
        const url = new URL(request.request().url());
        if (url.origin !== origin) {
          external.push(url.href);
          await request.abort("blockedbyclient");
          return;
        }
        if (
          /\/api\/(?:commerce|stripe|integrations)(?:\/|$)/.test(url.pathname)
        )
          consumer.push(`${request.request().method()} ${url.pathname}`);
        await request.continue();
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await context.addInitScript(() => {
        if (!sessionStorage.getItem("aureform-commerce-integration-test")) {
          localStorage.clear();
          sessionStorage.setItem(
            "aureform-commerce-integration-test",
            "local-demo",
          );
        }
      });
      await use();
      expect(
        external,
        "Local previews must not contact external services",
      ).toEqual([]);
      expect(
        consumer,
        "Local commerce must not call consumer endpoints",
      ).toEqual([]);
      expect(
        errors,
        "The commerce interface must not throw runtime errors",
      ).toEqual([]);
      expect(
        context.pages(),
        "Mock checkout and portal stay in this page",
      ).toHaveLength(1);
    },
    { auto: true },
  ],
});

async function snapshot(page: Page): Promise<CommerceSnapshot | null> {
  return page.evaluate((key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }, commerceKey);
}

async function activate(page: Page, provider: Provider, locale: Locale = "en") {
  const workbench = page.locator(
    `[data-integration-workbench="${provider.id}"]`,
  );
  await expect(workbench).toBeVisible();
  const start = workbench.getByRole("button", {
    name: locale === "en" ? "Start local demo" : "Iniciar demo local",
    exact: true,
  });
  const domain = workbench.locator('[data-integration-domain="commerce"]');
  await expect(start.or(domain)).toBeVisible();
  if (await start.isVisible()) await start.click();
  await expect(domain).toBeVisible();
  await expect(
    domain.getByRole("tablist", {
      name: locale === "en" ? "Commerce workflows" : "Flujos de comercio",
      exact: true,
    }),
  ).toBeVisible();
  return domain;
}

async function openProvider(
  page: Page,
  provider: Provider,
  locale: Locale = "en",
) {
  await page.goto(route(`integrations/${provider.id}`, locale));
  await expect(
    page.locator('[data-integration-hub][data-integration-mode="demo"]'),
  ).toBeVisible();
  return activate(page, provider, locale);
}

async function commerceTab(domain: Locator, name: string) {
  const tab = domain.getByRole("tab", { name, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

async function expectProviderLabel(domain: Locator, provider: Provider) {
  // Finish the persistence checks even when a demo display label regresses.
  await expect
    .soft(
      domain.getByText(`${provider.label} · demo workspace · mock payments`, {
        exact: true,
      }),
    )
    .toBeVisible({ timeout: 3000 });
  await expect
    .soft(
      domain.getByText(`${provider.label} · demo subscription`, {
        exact: true,
      }),
    )
    .toBeVisible({ timeout: 3000 });
  await expect.soft(domain).not.toContainText("Stripe");
}

for (const provider of providers) {
  test(`${provider.label}: products, images, orders, invoices and portal remain a recoverable local demo`, async ({
    page,
  }) => {
    const deep = provider.id === "paddle";
    const productName = `${provider.label} desk lamp`;
    let domain = await openProvider(page, provider);
    await domain
      .getByRole("button", { name: "Open Forma desk lamp", exact: true })
      .click();
    const editor = page.getByRole("dialog", {
      name: "Edit product",
      exact: true,
    });
    await editor.getByLabel("Product name", { exact: true }).fill(productName);
    await editor.getByRole("tab", { name: "Pricing", exact: true }).click();
    await editor.getByLabel("Unit price", { exact: true }).fill("159.95");
    await editor.getByRole("tab", { name: "Inventory", exact: true }).click();
    await editor.getByLabel("Available quantity", { exact: true }).fill("90");
    await editor.getByRole("tab", { name: "Media", exact: true }).click();
    await editor
      .getByRole("button", { name: "Crop", exact: true })
      .first()
      .click();
    const crop = page.getByRole("dialog", { name: "Edit image", exact: true });
    await expect(
      crop.getByRole("img", {
        name: "Preview of the cropped image",
        exact: true,
      }),
    ).toBeVisible();
    await crop.getByRole("button", { name: "1:1", exact: true }).click();
    await crop.getByRole("slider", { name: "Zoom", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await crop
      .getByRole("button", { name: "Rotate right 90 degrees", exact: true })
      .click();
    await crop.getByRole("button", { name: "Apply crop", exact: true }).click();
    await expect(crop).not.toBeVisible();
    const images = editor
      .getByRole("list", { name: "Product image order", exact: true })
      .getByRole("listitem");
    if (deep) {
      await editor.locator('input[type="file"][multiple]').setInputFiles({
        name: "local-commerce-cover.webp",
        mimeType: "image/webp",
        buffer: await readFile("public/assets/products/arc-lounge-chair.webp"),
      });
      await expect(images).toHaveCount(2);
      await images
        .last()
        .getByLabel("Alt text", { exact: true })
        .fill(`${provider.label} local product cover`);
      await images
        .last()
        .getByRole("button", { name: "Make primary", exact: true })
        .click();
    } else {
      await expect(images).toHaveCount(1);
      await images
        .first()
        .getByLabel("Alt text", { exact: true })
        .fill(`${provider.label} local product cover`);
    }
    await editor
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await snapshot(page))?.products.find((item) => item.id === "prd-001")
            ?.name,
      )
      .toBe(productName);
    const product = (await snapshot(page))!.products.find(
      (item) => item.id === "prd-001",
    )!;
    expect(product.unitAmount).toBe(15995);
    expect(product.inventory).toBe(90);
    expect(product.images).toHaveLength(deep ? 2 : 1);
    expect(product.images[0].alt).toBe(`${provider.label} local product cover`);
    expect(product.images[0].src).toMatch(/^data:image\//);
    await editor
      .getByRole("button", { name: "Close product editor", exact: true })
      .click();

    await commerceTab(domain, "Orders");
    await domain
      .getByRole("button", { name: "New order", exact: true })
      .first()
      .click();
    const orderForm = page.getByRole("dialog", {
      name: "New order",
      exact: true,
    });
    const buyerEmail = `${provider.id}-buyer@example.com`;
    await orderForm
      .getByLabel("Customer name", { exact: true })
      .fill(`${provider.label} local buyer`);
    await orderForm
      .getByLabel("Customer email", { exact: true })
      .fill(buyerEmail);
    await orderForm
      .getByLabel("Shipping address · optional", { exact: true })
      .fill("Local demo collection");
    await orderForm
      .getByRole("button", { name: `Add ${productName}`, exact: true })
      .click();
    if (deep)
      await orderForm
        .getByRole("button", {
          name: `Increase quantity for ${productName}`,
          exact: true,
        })
        .click();
    await orderForm
      .getByRole("button", { name: "Create order", exact: true })
      .click();
    await expect(orderForm).not.toBeVisible();
    const order = (await snapshot(page))!.orders.find(
      (item) => item.customerEmail === buyerEmail,
    )!;
    expect(order.paymentStatus).toBe("unpaid");
    expect(order.total).toBe(15995 * (deep ? 2 : 1));
    await expect(
      domain.getByRole("button", { name: "Mark shipped", exact: true }),
    ).toBeDisabled();
    await domain
      .getByRole("button", { name: "Preview checkout", exact: true })
      .click();
    const checkout = page.getByRole("dialog");
    await expect(checkout).toHaveAccessibleName("Preview demo checkout");
    await expect(
      checkout.getByText("Mock · no charge", { exact: true }),
    ).toBeVisible();
    await checkout
      .getByRole("button", { name: "Close preview", exact: true })
      .click();
    await expect(checkout).not.toBeVisible();
    expect(
      (await snapshot(page))!.orders.find((item) => item.id === order.id)!
        .paymentStatus,
    ).toBe("unpaid");
    expect(
      (await snapshot(page))!.products.find((item) => item.id === "prd-001")!
        .inventory,
    ).toBe(90);
    await domain
      .getByRole("button", { name: "Preview checkout", exact: true })
      .click();
    await checkout
      .getByRole("button", { name: "Simulate failed payment", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await snapshot(page))?.orders.find((item) => item.id === order.id)
            ?.paymentStatus,
      )
      .toBe("failed");
    const failed = (await snapshot(page))!;
    expect(
      failed.products.find((item) => item.id === "prd-001")!.inventory,
    ).toBe(90);
    expect(
      failed.invoices.some((item) => item.id === `inv-order-${order.id}`),
    ).toBe(false);
    await expect(
      checkout.getByRole("alert").filter({ hasText: "Demo payment failed" }),
    ).toBeVisible();
    await checkout
      .getByRole("button", { name: "Retry demo payment", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await snapshot(page))?.orders.find((item) => item.id === order.id)
            ?.paymentStatus,
      )
      .toBe("paid");
    await expect(checkout).toHaveAccessibleName("Demo payment complete");
    const paid = (await snapshot(page))!;
    const remaining = 90 - (deep ? 2 : 1);
    expect(paid.products.find((item) => item.id === "prd-001")!.inventory).toBe(
      remaining,
    );
    const receipts = paid.invoices.filter(
      (item) => item.id === `inv-order-${order.id}`,
    );
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({ status: "paid", amount: order.total });
    await checkout.getByRole("button", { name: "Done", exact: true }).click();
    if (deep) {
      await domain
        .getByRole("button", { name: "Mark shipped", exact: true })
        .click();
      await domain
        .getByRole("button", { name: "Mark delivered", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (await snapshot(page))?.orders.find((item) => item.id === order.id)
              ?.status,
        )
        .toBe("delivered");
    }

    await commerceTab(domain, "Invoices");
    await expect(
      domain.locator(`[data-invoice-id="${receipts[0].id}"]`),
    ).toContainText("Paid");
    await domain
      .getByRole("button", { name: "New invoice", exact: true })
      .first()
      .click();
    const invoiceForm = page.getByRole("dialog", {
      name: "New invoice",
      exact: true,
    });
    const invoiceEmail = `${provider.id}-studio@example.com`;
    const description = `${provider.label} design <review> & handoff`;
    await invoiceForm
      .getByLabel("Customer name", { exact: true })
      .fill(`${provider.label} local studio`);
    await invoiceForm
      .getByLabel("Customer email", { exact: true })
      .fill(invoiceEmail);
    await invoiceForm
      .getByLabel("Description", { exact: true })
      .fill(description);
    await invoiceForm.getByLabel("Amount", { exact: true }).fill("35.95");
    await invoiceForm
      .getByLabel("Due date", { exact: true })
      .fill("2026-11-30");
    await invoiceForm
      .getByRole("button", { name: "Create invoice", exact: true })
      .click();
    await expect(invoiceForm).not.toBeVisible();
    const invoice = (await snapshot(page))!.invoices.find(
      (item) => item.customerEmail === invoiceEmail,
    )!;
    expect(invoice).toMatchObject({
      status: "open",
      amount: 3595,
      description,
    });
    await domain
      .getByRole("link", {
        name: `View invoice ${invoice.number}`,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/en/invoice/\\?id=${invoice.id}$`),
    );
    await expect(
      page.getByRole("heading", { name: "Invoice details", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(description, { exact: true })).toBeVisible();
    if (deep) {
      const downloading = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Download HTML", exact: true })
        .click();
      const download = await downloading;
      const html = await readFile((await download.path())!, "utf8");
      expect(html).toContain(
        `${provider.label} design &lt;review&gt; &amp; handoff`,
      );
      expect(html).not.toContain("<review>");
    }
    await page
      .getByRole("button", { name: "Preview payment", exact: true })
      .click();
    await checkout
      .getByRole("button", { name: "Simulate paid", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await snapshot(page))?.invoices.find(
            (item) => item.id === invoice.id,
          )?.status,
      )
      .toBe("paid");
    await checkout.getByRole("button", { name: "Done", exact: true }).click();

    domain = await openProvider(page, provider);
    await commerceTab(domain, "Plans & billing");
    if (deep) {
      await domain
        .getByRole("button", { name: "Preview Enterprise", exact: true })
        .click();
      await checkout
        .getByRole("button", { name: "Simulate paid", exact: true })
        .click();
      await expect
        .poll(async () => (await snapshot(page))?.billing.plan)
        .toBe("Enterprise");
      await checkout.getByRole("button", { name: "Done", exact: true }).click();
      expect(
        (await snapshot(page))!.invoices.some(
          (item) =>
            item.description === "Enterprise subscription" &&
            item.status === "paid",
        ),
      ).toBe(true);
    }
    const beforePortal = await snapshot(page);
    expect(beforePortal!.billing).toMatchObject({
      customerEmail: "billing@aureform.example",
      cardBrand: "Visa",
      cardLast4: "4242",
    });
    expect(beforePortal!.billing).not.toHaveProperty("providerCustomerId");
    await domain
      .getByRole("button", { name: "Preview portal", exact: true })
      .click();
    await expect(checkout).toHaveAccessibleName("Demo customer portal");
    await expect(
      checkout.getByText(deep ? "Enterprise" : "Pro", { exact: true }),
    ).toBeVisible();
    await expect(
      checkout.getByText("Mock · no charge", { exact: true }),
    ).toBeVisible();
    await checkout.getByRole("button", { name: "Done", exact: true }).click();
    expect(await snapshot(page)).toEqual(beforePortal);
    await expectProviderLabel(domain, provider);
    await page.reload();
    domain = await activate(page, provider);
    await expect(
      domain.getByRole("button", { name: `Open ${productName}`, exact: true }),
    ).toBeVisible();
    const restored = (await snapshot(page))!;
    expect(restored.billing).toEqual(beforePortal!.billing);
    expect(restored.billing.plan).toBe(deep ? "Enterprise" : "Pro");
    expect(
      restored.products.find((item) => item.id === "prd-001")!.inventory,
    ).toBe(remaining);
    expect(
      restored.invoices.filter((item) => item.id === receipts[0].id),
    ).toHaveLength(1);
    expect(
      restored.invoices.find((item) => item.id === invoice.id)!.status,
    ).toBe("paid");
  });
}

test("Hub search and provider choice select Paddle and Polar local commerce recipes", async ({
  page,
}) => {
  await page.goto(route("integrations"));
  const hub = page.locator("[data-integration-hub]");
  await expect(hub).toHaveAttribute("data-integration-mode", "demo");
  await expect(
    hub.getByText("Configuration and workflows included", { exact: true }),
  ).toBeVisible();
  for (const provider of providers.slice(0, 2)) {
    await hub
      .getByLabel("Find an integration", { exact: true })
      .fill(provider.label);
    const cards = hub.locator("[data-integration-card]");
    await expect(cards).toHaveCount(1);
    await hub.locator(`[data-integration-card="${provider.id}"]`).click();
    const workbench = hub.locator(
      `[data-integration-workbench="${provider.id}"]`,
    );
    await workbench
      .getByRole("tab", { name: "Connection", exact: true })
      .click();
    const selector = workbench.getByLabel("Provider choice", { exact: true });
    await expect(selector).toHaveText(provider.label);
    await selector.click();
    await page
      .getByRole("option", { name: provider.label, exact: true })
      .click();
    await workbench
      .getByRole("button", { name: "Connect local demo", exact: true })
      .click();
    const domain = workbench.locator('[data-integration-domain="commerce"]');
    await expect(domain).toBeVisible();
    await commerceTab(domain, "Plans & billing");
    await domain
      .getByRole("button", { name: "Preview portal", exact: true })
      .click();
    const portal = page.getByRole("dialog", {
      name: "Demo customer portal",
      exact: true,
    });
    await expect(portal.getByText("Pro", { exact: true })).toBeVisible();
    await portal.getByRole("button", { name: "Done", exact: true }).click();
    await expectProviderLabel(domain, provider);
    await hub
      .getByRole("button", { name: "All integrations", exact: true })
      .click();
  }
});

test("Spanish Lemon Squeezy tabs retain local image editing and a mock portal", async ({
  page,
}) => {
  const provider = providers[2];
  const domain = await openProvider(page, provider, "es");
  await domain
    .getByRole("button", { name: "Abrir Forma desk lamp", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Editar producto",
    exact: true,
  });
  await editor.getByRole("tab", { name: "Imágenes", exact: true }).click();
  await editor
    .getByRole("button", { name: "Recortar", exact: true })
    .first()
    .click();
  const crop = page.getByRole("dialog", { name: "Editar imagen", exact: true });
  await expect(crop).toBeVisible();
  await crop.getByRole("button", { name: "Cancelar", exact: true }).click();
  await editor
    .getByRole("button", { name: "Cerrar editor del producto", exact: true })
    .click();
  await commerceTab(domain, "Pedidos");
  await expect(
    domain.getByRole("heading", { name: "Pedidos", exact: true }),
  ).toBeVisible();
  await commerceTab(domain, "Facturas");
  await expect(
    domain.getByRole("heading", { name: "Facturas", exact: true }),
  ).toBeVisible();
  await commerceTab(domain, "Planes y facturación");
  await domain
    .getByRole("button", { name: "Ver portal de ejemplo", exact: true })
    .click();
  const portal = page.getByRole("dialog", {
    name: "Portal de cliente de ejemplo",
    exact: true,
  });
  await expect(
    portal.getByText("Simulación · sin cobro", { exact: true }),
  ).toBeVisible();
  await portal.getByRole("button", { name: "Listo", exact: true }).click();
  await expect
    .soft(
      domain.getByText(
        "Lemon Squeezy · workspace de ejemplo · pagos simulados",
        {
          exact: true,
        },
      ),
    )
    .toBeVisible({ timeout: 3000 });
  await expect
    .soft(
      domain.getByText("Lemon Squeezy · suscripción de ejemplo", {
        exact: true,
      }),
    )
    .toBeVisible({ timeout: 3000 });
  await expect.soft(domain).not.toContainText("Stripe");
});
