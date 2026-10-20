import { test as base, expect, type Page } from "@playwright/test";

const mount = process.env.AUREFORM_BASE_URL
  ? new URL(process.env.AUREFORM_BASE_URL).pathname.replace(/\/+$/, "")
  : "";
const test = base.extend<{ localBrowserBoundary: void }>({
  localBrowserBoundary: [
    async ({ context, page, baseURL }, use) => {
      const external: string[] = [],
        errors: string[] = [],
        consumerCalls: string[] = [];
      const origin = new URL(baseURL!).origin;
      page.on("pageerror", (error) => errors.push(error.message));
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (/^https?:$/.test(url.protocol) && url.origin !== origin) {
          external.push(`${url.origin}${url.pathname}`);
          await route.abort();
          return;
        }
        if (/\/api\/(?:integrations|identity|ai|commerce)\b/.test(url.pathname))
          consumerCalls.push(url.pathname);
        await route.continue();
      });
      await use();
      expect(errors).toEqual([]);
      expect(external).toEqual([]);
      expect(consumerCalls).toEqual([]);
    },
    { auto: true },
  ],
});
async function start(page: Page, recipe: string, locale = "en") {
  await page.goto(`${mount}/${locale}/integrations/${recipe}/`);
  const hub = page.locator("[data-integration-hub]");
  await hub
    .getByRole("button", {
      name: locale === "en" ? "Start local demo" : "Iniciar demo local",
      exact: true,
    })
    .click();
  await expect(
    hub.getByText(
      locale === "en" ? "Local preview configured." : "Demo local configurada.",
      { exact: true },
    ),
  ).toBeVisible();
  return hub;
}
test("Drive selection is reviewed before backend-scoped resource reconciliation", async ({
  page,
}) => {
  const hub = await start(page, "google-drive");
  const picker = hub.getByRole("region", {
    name: "Choose files from Drive",
    exact: true,
  });
  await picker
    .getByRole("button", { name: "Open file picker", exact: true })
    .click();
  await expect(picker.getByRole("listitem")).toHaveCount(3);
  const confirm = picker.getByRole("button", {
    name: "Confirm selected files",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  await picker.getByRole("checkbox").check();
  await confirm.click();
  await expect(
    picker.getByText(
      "Selected files reconciled with the connection. Reopen the resource selector to inspect their current status.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    hub.locator('[data-product-workbench="connectors"]'),
  ).toContainText("3 authorized resources");
  await picker
    .getByRole("button", { name: "Refresh authorized files", exact: true })
    .click();
  await expect(
    picker.getByText("Authorized file scope refreshed.", { exact: true }),
  ).toBeVisible();
});
test("public media reuses image ordering and alt controls then persists the reviewed collection", async ({
  page,
}) => {
  const hub = await start(page, "cloudinary");
  const media = hub.getByRole("region", {
    name: "Public media collection",
    exact: true,
  });
  await expect(media.getByRole("img")).toHaveCount(3);
  const alt = media.getByRole("textbox").first();
  await alt.fill("Refined public brand photograph");
  await media
    .getByRole("button", { name: "Review media changes", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Review public media changes",
    exact: true,
  });
  await expect(dialog).toContainText("Refined public brand photograph");
  await expect(
    dialog.getByRole("button", { name: "Save collection", exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Save collection", exact: true })
    .click();
  await expect(
    media.getByText("Media collection saved.", { exact: true }),
  ).toBeVisible();
  await expect(media.getByRole("textbox").first()).toHaveValue(
    "Refined public brand photograph",
  );
  await media
    .getByRole("button", { name: "Refresh and keep draft", exact: true })
    .click();
  await expect(media.getByRole("textbox").first()).toHaveValue(
    "Refined public brand photograph",
  );
});
test("enterprise policies, actual Graph scopes and sync diagnostics retain distinct status", async ({
  page,
}) => {
  let hub = await start(page, "enterprise-identity");
  let diagnostics = hub.locator("[data-enterprise-diagnostics]");
  await expect(diagnostics).toContainText("demo.example");
  await expect(diagnostics).toContainText("Domain verification");
  await expect(diagnostics).toContainText(
    "DNS record supplied by your backend",
  );
  await expect(diagnostics).toContainText(
    "No domain, tenant or provider administrator has been contacted.",
  );
  hub = await start(page, "microsoft-365");
  diagnostics = hub.locator("[data-enterprise-diagnostics]");
  await expect(
    diagnostics.getByRole("region", { name: "Provider consent", exact: true }),
  ).toContainText("Files.Read");
  await expect(
    diagnostics.getByRole("region", { name: "Provider consent", exact: true }),
  ).toContainText("Pending");
  await expect(diagnostics).toContainText("delta");
  await expect(diagnostics).toContainText("No server checkpoint reported.");
  hub = await start(page, "salesforce");
  await expect(hub.locator("[data-enterprise-diagnostics]")).toContainText(
    "Allowed object fields",
  );
  await expect(hub.locator("[data-enterprise-diagnostics]")).toContainText(
    "initial",
  );
});
test("Spanish Drive and enterprise diagnostics fit a narrow mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const hub = await start(page, "google-drive", "es");
  const picker = hub.getByRole("region", {
    name: "Elegir archivos de Drive",
    exact: true,
  });
  await picker
    .getByRole("button", { name: "Abrir selector de archivos", exact: true })
    .click();
  await expect(picker.getByRole("listitem")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await start(page, "microsoft-365", "es");
  await expect(page.locator("[data-enterprise-diagnostics]")).toContainText(
    "Consentimiento del proveedor",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});
