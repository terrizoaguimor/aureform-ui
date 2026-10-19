import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import type { CommerceSnapshot } from "../../src/lib/commerce";

const supplied = process.env.AUREFORM_BASE_URL;
const mount = supplied ? new URL(supplied).pathname.replace(/\/+$/, "") : "";
const route = (path: string, locale = "en") =>
  `${mount}/${locale}/${path ? `${path}/` : ""}`;
const commerceKey = "aureform:commerce:v1:studio";

async function fresh(page: Page, path: string, locale = "en") {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("aureform-application-test")) {
      localStorage.clear();
      sessionStorage.setItem("aureform-application-test", "ready");
    }
  });
  await page.goto(route(path, locale));
  await expect(page.locator("h1").first()).toBeVisible();
}
async function snapshot(page: Page): Promise<CommerceSnapshot | null> {
  return page.evaluate((key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }, commerceKey);
}

async function expectAccessibleCatalog(page: Page) {
  const result = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
}

for (const locale of ["en", "es"]) {
  for (const provider of ["Google", "GitHub", "Microsoft"]) {
    test(`${locale}: ${provider} sign-in creates a mock profile without OAuth, passwords or tokens`, async ({
      page,
    }) => {
      const requests: string[] = [];
      page.on("request", (request) => requests.push(request.url()));
      await fresh(page, "auth/sign-in", locale);
      const name =
        locale === "en"
          ? `Continue with ${provider}`
          : `Continuar con ${provider}`;
      await page.getByRole("button", { name, exact: true }).click();
      const ready =
        locale === "en"
          ? `${provider} demo ready`
          : `Demo de ${provider} lista`;
      await expect(page.getByText(ready, { exact: true })).toBeVisible();
      const session = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("aureform:demo-session") ?? "{}"),
      );
      expect(session.demo).toBe(true);
      expect(session.provider).toBe(provider.toLowerCase());
      expect(Object.keys(session).sort()).toEqual(
        ["createdAt", "demo", "email", "name", "provider", "version"].sort(),
      );
      expect(
        requests.some((url) =>
          /accounts\.google\.com|login\.microsoftonline\.com|login\.live\.com|github\.com\/login\/oauth/.test(
            url,
          ),
        ),
      ).toBe(false);
      await page
        .getByRole("button", {
          name:
            locale === "en" ? "Continue to workspace" : "Continuar al espacio",
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard/$`));
    });
  }
}

test("social sign-up enforces consent and continues into onboarding", async ({
  page,
}) => {
  await fresh(page, "auth/sign-up");
  await page
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Accept the demo terms" })
      .first(),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("aureform:demo-session")),
  ).toBeNull();
  await page
    .getByRole("checkbox", { name: "Accept demo terms", exact: true })
    .check();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByText("Google demo ready", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: /Continue to onboarding|Continue to workspace/,
      exact: false,
    })
    .click();
  await expect(page).toHaveURL(/\/en\/onboarding\/$/);
});

test("auth templates are discoverable from the landing and workspace navigation", async ({
  page,
}) => {
  await fresh(page, "");
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/auth\/sign-in\/$/);
  const nav = page.getByRole("navigation", {
    name: "Authentication screens",
    exact: true,
  });
  await expect(nav.getByRole("link")).toHaveCount(4);
  await page.goto(route("dashboard"));
  for (const path of ["sign-in", "sign-up", "reset-password", "verify"]) {
    await expect(
      page.locator(`nav a[href$="/en/auth/${path}/"]`).first(),
    ).toBeAttached();
  }
});

test("product price and stock edits persist, built-in photos crop, and uploaded images become primary", async ({
  page,
}) => {
  await fresh(page, "products");
  await page
    .getByRole("button", { name: "Open Forma desk lamp", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Edit product",
    exact: true,
  });
  await editor
    .getByLabel("Product name", { exact: true })
    .fill("Community desk lamp");
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
  await editor.locator('input[type="file"][multiple]').setInputFiles({
    name: "community-cover.webp",
    mimeType: "image/webp",
    buffer: await readFile("public/assets/products/arc-lounge-chair.webp"),
  });
  const images = editor
    .getByRole("list", { name: "Product image order", exact: true })
    .getByRole("listitem");
  await expect(images).toHaveCount(2);
  await images
    .last()
    .getByLabel("Alt text", { exact: true })
    .fill("Community product cover");
  await images
    .last()
    .getByRole("button", { name: "Make primary", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await snapshot(page))?.products.find(
          (product) => product.id === "prd-001",
        )?.name,
    )
    .toBe("Community desk lamp");
  const saved = (await snapshot(page))!.products.find(
    (product) => product.id === "prd-001",
  )!;
  expect(saved.unitAmount).toBe(15995);
  expect(saved.inventory).toBe(90);
  expect(saved.images).toHaveLength(2);
  expect(saved.images[0].alt).toBe("Community product cover");
  expect(
    saved.images.every((image) =>
      image.src.startsWith("data:image/webp;base64,"),
    ),
  ).toBe(true);
  expect(
    saved.images.every(
      (image) => (image.width ?? 0) <= 900 && (image.height ?? 0) <= 900,
    ),
  ).toBe(true);
  await editor
    .getByRole("button", { name: "Close product editor", exact: true })
    .click();
  await page.reload();
  await page
    .getByPlaceholder("Search name, SKU or tag…")
    .fill("Community desk lamp");
  await expect(
    page.getByRole("button", { name: "Open Community desk lamp", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sync Community desk lamp", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Synced Community desk lamp",
      exact: true,
    }),
  ).toBeEnabled();
  await expectAccessibleCatalog(page);
});

test("product image validation and dirty-close confirmation preserve the previous record", async ({
  page,
}) => {
  await fresh(page, "products");
  await page
    .getByRole("button", { name: "Open Forma desk lamp", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Edit product",
    exact: true,
  });
  await editor.getByRole("tab", { name: "Media", exact: true }).click();
  await editor.locator('input[type="file"][multiple]').setInputFiles({
    name: "disguised.png",
    mimeType: "image/png",
    buffer: Buffer.from("<svg></svg>"),
  });
  await expect(
    editor.getByRole("alert").filter({ hasText: "contents do not match" }),
  ).toBeVisible();
  await expect(
    editor
      .getByRole("list", { name: "Product image order" })
      .getByRole("listitem"),
  ).toHaveCount(1);
  await editor.getByRole("tab", { name: "Details", exact: true }).click();
  await editor
    .getByLabel("Product name", { exact: true })
    .fill("Unsaved product");
  await editor
    .getByRole("button", { name: "Close product editor", exact: true })
    .click();
  await expect(
    page.getByText("Discard unsaved changes?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Keep editing", exact: true })
    .filter({ hasText: "Keep editing" })
    .click();
  await expect(editor.getByLabel("Product name", { exact: true })).toHaveValue(
    "Unsaved product",
  );
  await editor
    .getByRole("button", { name: "Close product editor", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Forma desk lamp", exact: true }),
  ).toBeVisible();
});

test("new products validate required fields and appear in the order catalog", async ({
  page,
}) => {
  await fresh(page, "products");
  await page.getByRole("button", { name: "New product", exact: true }).click();
  const editor = page.getByRole("dialog", {
    name: "Create a product",
    exact: true,
  });
  await editor
    .getByRole("button", { name: "Create product", exact: true })
    .click();
  await expect(editor.getByRole("alert").first()).toBeVisible();
  await editor
    .getByLabel("Product name", { exact: true })
    .fill("Community desk tray");
  await editor.getByLabel("SKU", { exact: true }).fill("COMMUNITY-TRAY");
  await editor.getByLabel("Category", { exact: true }).fill("Objects");
  await editor.getByLabel("Status", { exact: true }).click();
  await page.getByRole("option", { name: "Active", exact: true }).click();
  await editor.getByRole("tab", { name: "Pricing", exact: true }).click();
  await editor.getByLabel("Unit price", { exact: true }).fill("12.50");
  await editor.getByRole("tab", { name: "Inventory", exact: true }).click();
  await editor.getByLabel("Available quantity", { exact: true }).fill("10");
  await editor
    .getByRole("button", { name: "Create product", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await snapshot(page))?.products.find(
          (product) => product.sku === "COMMUNITY-TRAY",
        )?.unitAmount,
    )
    .toBe(1250);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close product editor", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Community desk tray", exact: true }),
  ).toBeVisible();
  await expectAccessibleCatalog(page);
  await page.goto(route("orders"));
  await page
    .getByRole("button", { name: "New order", exact: true })
    .first()
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Add Community desk tray", exact: true }),
  ).toBeEnabled();
});

test("viewer roles cannot mutate products or manage subscription billing", async ({
  page,
}) => {
  await fresh(page, "products");
  await expect(
    page.getByRole("button", { name: "New product", exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    const key = "aureform:saas:v1";
    const state = JSON.parse(localStorage.getItem(key)!);
    state.previewRole = "viewer";
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "New product", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Open Forma desk lamp", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Product details",
    exact: true,
  });
  await expect(
    editor.getByLabel("Product name", { exact: true }),
  ).toBeDisabled();
  await expect(
    editor.getByRole("button", { name: "Save changes", exact: true }),
  ).toHaveCount(0);
  await page.goto(route("settings/billing"));
  await expect(
    page.getByRole("button", { name: "Preview Enterprise", exact: true }),
  ).toBeDisabled();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Billing management is restricted" }),
  ).toBeVisible();
});

test("commerce edits stay in their workspace and changing workspace closes the product editor", async ({
  page,
}) => {
  await fresh(page, "products");
  await page
    .getByRole("button", { name: "Open Forma desk lamp", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Edit product",
    exact: true,
  });
  await editor
    .getByLabel("Product name", { exact: true })
    .fill("Studio-only desk lamp");
  await editor
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await snapshot(page))?.products.find(
          (product) => product.id === "prd-001",
        )?.name,
    )
    .toBe("Studio-only desk lamp");
  // A storage event follows the same live scope change as the workspace menu.
  await page.evaluate(() => {
    const key = "aureform:saas:v1";
    const state = JSON.parse(localStorage.getItem(key)!);
    state.activeWorkspaceId = "personal";
    localStorage.setItem(key, JSON.stringify(state));
    window.dispatchEvent(
      new StorageEvent("storage", { key, newValue: JSON.stringify(state) }),
    );
  });
  await expect(editor).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Forma desk lamp", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Open Studio-only desk lamp",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(
    (await snapshot(page))!.products.find(
      (product) => product.id === "prd-001",
    )!.name,
  ).toBe("Studio-only desk lamp");
});

test("mock order checkout retries, consumes inventory once and links a paid invoice", async ({
  page,
}) => {
  await fresh(page, "orders");
  const stripeRequests: string[] = [];
  page.on("request", (request) => {
    if (/stripe\.com/.test(request.url())) stripeRequests.push(request.url());
  });
  await page
    .getByRole("button", { name: "New order", exact: true })
    .first()
    .click();
  const builder = page.getByRole("dialog", { name: "New order", exact: true });
  await builder
    .getByLabel("Customer name", { exact: true })
    .fill("Community Buyer");
  await builder
    .getByLabel("Customer email", { exact: true })
    .fill("buyer@example.com");
  await builder
    .getByRole("button", { name: "Add Forma desk lamp", exact: true })
    .click();
  await builder
    .getByRole("button", {
      name: "Increase quantity for Forma desk lamp",
      exact: true,
    })
    .click();
  await builder
    .getByRole("button", { name: "Create order", exact: true })
    .click();
  await expect(builder).not.toBeVisible();
  await page
    .getByRole("button", { name: "Preview checkout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate failed payment", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await snapshot(page))?.orders.find(
          (order) => order.customerEmail === "buyer@example.com",
        )?.paymentStatus,
    )
    .toBe("failed");
  expect(
    (await snapshot(page))!.products.find(
      (product) => product.id === "prd-001",
    )!.inventory,
  ).toBe(84);
  await page
    .getByRole("button", { name: "Retry demo payment", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await snapshot(page))?.orders.find(
          (order) => order.customerEmail === "buyer@example.com",
        )?.paymentStatus,
    )
    .toBe("paid");
  const stored = (await snapshot(page))!;
  const order = stored.orders.find(
    (item) => item.customerEmail === "buyer@example.com",
  )!;
  expect(order.total).toBe(29600);
  expect(
    stored.products.find((product) => product.id === "prd-001")!.inventory,
  ).toBe(82);
  expect(
    stored.invoices.filter((invoice) => invoice.id === `inv-order-${order.id}`),
  ).toHaveLength(1);
  expect(stripeRequests).toHaveLength(0);
  await page.goto(
    `${route("invoice")}?id=${encodeURIComponent(`inv-order-${order.id}`)}`,
  );
  await expect(
    page.getByText("Community Buyer", { exact: true }),
  ).toBeVisible();
  await page.reload();
  expect(
    (await snapshot(page))!.products.find(
      (product) => product.id === "prd-001",
    )!.inventory,
  ).toBe(82);
});

test("invoice creation, safe HTML export and mock payment use the shared record", async ({
  page,
}) => {
  await fresh(page, "invoices");
  await page
    .getByRole("button", { name: "New invoice", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog", { name: "New invoice", exact: true });
  await form
    .getByLabel("Customer name", { exact: true })
    .fill("Community Studio");
  await form
    .getByLabel("Customer email", { exact: true })
    .fill("studio@example.com");
  await form
    .getByLabel("Description", { exact: true })
    .fill("Design <review> & handoff");
  await form.getByLabel("Amount", { exact: true }).fill("35.95");
  await form.getByLabel("Due date", { exact: true }).fill("2026-11-30");
  await form
    .getByRole("button", { name: "Create invoice", exact: true })
    .click();
  await expect(form).not.toBeVisible();
  await expect
    .poll(
      async () =>
        (await snapshot(page))?.invoices.find(
          (invoice) => invoice.customerEmail === "studio@example.com",
        )?.amount,
    )
    .toBe(3595);
  const invoice = (await snapshot(page))!.invoices.find(
    (item) => item.customerEmail === "studio@example.com",
  )!;
  await page.goto(`${route("invoice")}?id=${encodeURIComponent(invoice.id)}`);
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download HTML", exact: true })
    .click();
  const download = await downloading;
  const html = await readFile((await download.path())!, "utf8");
  expect(html).toContain("Design &lt;review&gt; &amp; handoff");
  expect(html).not.toContain("<review>");
  await page
    .getByRole("button", { name: "Preview payment", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate paid", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await snapshot(page))?.invoices.find((item) => item.id === invoice.id)
          ?.status,
    )
    .toBe("paid");
});

test("billing plan checkout updates subscription history and portal stays mock", async ({
  page,
}) => {
  await fresh(page, "settings/billing");
  await page
    .getByRole("button", { name: "Preview Enterprise", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate paid", exact: true })
    .click();
  await expect
    .poll(async () => (await snapshot(page))?.billing.plan)
    .toBe("Enterprise");
  const paid = (await snapshot(page))!;
  expect(paid.billing.amount).toBe(69900);
  expect(
    paid.invoices.some(
      (invoice) =>
        invoice.description === "Enterprise subscription" &&
        invoice.status === "paid",
    ),
  ).toBe(true);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Close|Done/, exact: false })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Preview portal", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Demo customer portal", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Enterprise", { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  expect((await snapshot(page))!.billing.plan).toBe("Enterprise");
});

test("maps filter and export local routes and handle an opted-in SDK failure without saving keys", async ({
  page,
}) => {
  const googleRequests: string[] = [];
  page.on("request", (request) => {
    if (/maps\.googleapis\.com/.test(request.url()))
      googleRequests.push(request.url());
  });
  await fresh(page, "maps");
  expect(googleRequests).toHaveLength(0);
  await page
    .getByRole("searchbox", { name: "Search routes or locations", exact: true })
    .fill("Boston");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export routes", exact: true })
    .click();
  const download = await downloading;
  const geo = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(geo.type).toBe("FeatureCollection");
  expect(geo.features.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Map settings", exact: true }).click();
  const settings = page.getByRole("dialog", {
    name: "Connect your map project",
    exact: true,
  });
  await settings
    .getByRole("button", { name: "Connect Google Maps", exact: true })
    .click();
  await expect(
    settings.getByText("Add a browser API key.", { exact: true }),
  ).toBeVisible();
  await page.route("https://maps.googleapis.com/maps/api/js**", (request) =>
    request.abort("failed"),
  );
  await settings
    .getByLabel("Google Maps browser API key", { exact: true })
    .fill("aureform_demo_maps_key");
  await settings
    .getByRole("button", { name: "Connect Google Maps", exact: true })
    .click();
  await expect(settings).not.toBeVisible();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /Google Maps|mapa/ })
      .first(),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    [...Object.values(localStorage), ...Object.values(sessionStorage)].join(
      "\n",
    ),
  );
  expect(stored).not.toContain("aureform_demo_maps_key");
  expect(googleRequests).toHaveLength(1);
});

test("commerce and auth stay within mobile bounds in Spanish and retain accessible controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await fresh(page, "products", "es");
  await expectAccessibleCatalog(page);
  await page
    .getByRole("button", { name: "Abrir Forma desk lamp", exact: true })
    .click();
  const editor = page.getByRole("dialog", {
    name: "Editar producto",
    exact: true,
  });
  await editor.getByRole("tab", { name: "Imágenes", exact: true }).click();
  await expect(
    editor.getByRole("button", { name: "Recortar", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const result = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await editor
    .getByRole("button", { name: "Cerrar editor del producto", exact: true })
    .click();
  for (const path of [
    "orders",
    "invoices",
    "maps",
    "settings/billing",
    "auth/sign-in",
    "auth/sign-up",
  ]) {
    await page.goto(route(path, "es"));
    await expect(page.locator("h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      path,
    ).toBe(true);
  }
});
