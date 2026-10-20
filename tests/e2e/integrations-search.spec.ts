import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

const mount = process.env.AUREFORM_BASE_URL
  ? new URL(process.env.AUREFORM_BASE_URL).pathname.replace(/\/+$/, "")
  : "";
const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [
    async ({ page }, use, info) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      await info.attach("search-browser-errors", {
        body: JSON.stringify(errors),
        contentType: "application/json",
      });
      expect(
        errors,
        "Search workflows have no uncaught browser errors",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

function hub(page: Page) {
  return page.locator("[data-integration-hub]");
}

function product(page: Page) {
  return page.locator('[data-product-workbench="search"]');
}

function panel(root: Page | Locator, name: string) {
  return root.getByRole("region", { name, exact: true });
}

async function openDemo(
  page: Page,
  recipe = "algolia",
  locale: "en" | "es" = "en",
) {
  await page.goto(`${mount}/${locale}/integrations/${recipe}/`);
  await expect(hub(page)).toHaveAttribute("data-integration-mode", "demo");
  const start = hub(page).getByRole("button", {
    name: locale === "es" ? "Iniciar demo local" : "Start local demo",
    exact: true,
  });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(product(page)).toBeVisible();
}

async function search(page: Page, query: string) {
  const form = panel(product(page), "Search connected sources");
  await form.getByLabel("Search query", { exact: true }).fill(query);
  await form.getByRole("button", { name: "Search", exact: true }).click();
  return form;
}

for (const recipe of ["algolia", "self-hostable-search"]) {
  test(`${recipe}: reported counts, draft review, AND/OR facet selection, clearing and empty results`, async ({
    page,
  }) => {
    await openDemo(page, recipe);
    await expect(
      product(page).getByRole("heading", {
        name: "Filters from your backend",
        exact: true,
      }),
    ).toHaveCount(0);
    await search(page, "local");
    await expect(
      product(page).getByRole("heading", { name: "2 results", exact: true }),
    ).toBeVisible();

    const filters = panel(product(page), "Filters from your backend");
    const type = filters.getByRole("group", {
      name: "Record type",
      exact: true,
    });
    const status = filters.getByRole("group", { name: "Status", exact: true });
    const ready = status.getByRole("checkbox", { name: /^ready\b/ });
    const review = status.getByRole("checkbox", { name: /^review\b/ });
    const recordType = type.getByRole("checkbox", { name: /^search-index\b/ });
    const apply = filters.getByRole("button", {
      name: "Apply facet filters",
      exact: true,
    });
    await expect(apply).toBeDisabled();
    await expect(recordType).toHaveAccessibleName("search-index 2");

    await ready.check();
    await recordType.check();
    await expect(filters).toContainText(
      "Counts and results still describe the last submitted request.",
    );
    await expect(
      product(page).getByRole("heading", { name: "2 results", exact: true }),
    ).toBeVisible();
    await expect(
      product(page).getByRole("button", { name: "Next", exact: true }),
    ).toBeDisabled();
    await apply.click();
    await expect(
      product(page).getByRole("heading", { name: "1 results", exact: true }),
    ).toBeVisible();
    await expect(apply).toBeDisabled();
    // This bucket describes all query-matching authorized records, even though
    // the selected status leaves just one displayed hit.
    await expect(recordType).toHaveAccessibleName("search-index 2");
    await expect(ready).toBeChecked();

    await review.check();
    await apply.click();
    await expect(
      product(page).getByRole("heading", { name: "2 results", exact: true }),
    ).toBeVisible();
    await expect(ready).toBeChecked();
    await expect(review).toBeChecked();
    await filters
      .getByRole("button", { name: "Clear facet filters", exact: true })
      .click();
    await expect(ready).not.toBeChecked();
    await expect(recordType).not.toBeChecked();
    await expect(apply).toBeDisabled();
    await expect(filters).toContainText("0 selected values");

    await search(page, "no-such-local-document-7d32");
    await expect(
      product(page).getByRole("heading", { name: "0 results", exact: true }),
    ).toBeVisible();
    await expect(filters.getByRole("checkbox")).toHaveCount(0);
    await expect(product(page)).toContainText("No matching passages.");
    await expect(
      product(page).getByRole("button", { name: "Next", exact: true }),
    ).toBeDisabled();
  });
}

test("search cancellation preserves the query and facet draft for an explicit retry", async ({
  page,
}) => {
  await openDemo(page);
  await search(page, "local");
  const filters = panel(product(page), "Filters from your backend");
  const ready = filters
    .getByRole("group", { name: "Status", exact: true })
    .getByRole("checkbox", { name: /^ready\b/ });
  await expect(ready).toBeVisible();
  await ready.check();

  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await filters
    .getByRole("button", { name: "Apply facet filters", exact: true })
    .click();
  const form = panel(product(page), "Search connected sources");
  await form.getByRole("button", { name: "Stop waiting", exact: true }).click();
  await expect(form.getByLabel("Search query", { exact: true })).toHaveValue(
    "local",
  );
  await expect(ready).toBeChecked();
  await expect(
    form.getByRole("button", { name: "Retry search", exact: true }),
  ).toBeVisible();
  await page.clock.runFor(500);
  await expect(
    product(page).getByRole("heading", { name: "2 results", exact: true }),
  ).toBeVisible();

  await form.getByRole("button", { name: "Retry search", exact: true }).click();
  await page.clock.runFor(1500);
  await expect(
    product(page).getByRole("heading", { name: "1 results", exact: true }),
  ).toBeVisible();
  await expect(ready).toBeChecked();
});

test("workspace switching aborts pending search and removes previous queries and facet results", async ({
  page,
}) => {
  await openDemo(page);
  await search(page, "local");
  const filters = panel(product(page), "Filters from your backend");
  await expect(filters).toBeVisible();
  await filters
    .getByRole("group", { name: "Status", exact: true })
    .getByRole("checkbox", { name: /^ready\b/ })
    .check();
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await filters
    .getByRole("button", { name: "Apply facet filters", exact: true })
    .click();
  await expect(
    product(page).getByRole("button", { name: "Stop waiting", exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /^Aureform Studio\s+Aureform$/ })
    .click();
  await page.clock.runFor(32);
  await page
    .getByRole("menuitem", { name: "Personal space", exact: true })
    .click();
  await page.clock.runFor(1500);
  await expect(product(page)).toHaveCount(0);
  const start = hub(page).getByRole("button", {
    name: "Start local demo",
    exact: true,
  });
  await expect(start).toBeEnabled();
  await start.click();
  await page.clock.runFor(1500);
  await expect(
    panel(product(page), "Search connected sources").getByLabel(
      "Search query",
      {
        exact: true,
      },
    ),
  ).toHaveValue("");
  await expect(
    product(page).getByRole("heading", {
      name: "Filters from your backend",
      exact: true,
    }),
  ).toHaveCount(0);
  await search(page, "local");
  await page.clock.runFor(1500);
  await expect(
    product(page).getByRole("heading", { name: "2 results", exact: true }),
  ).toBeVisible();
  await expect(
    panel(product(page), "Filters from your backend").getByRole("checkbox", {
      checked: true,
    }),
  ).toHaveCount(0);
});

test("the default palette supports keyboard navigation, empty queries and Escape", async ({
  page,
}) => {
  await openDemo(page);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", {
    name: "Search anything…",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const query = dialog.getByRole("combobox");
  await query.fill("zz-no-navigation-73bf");
  await expect(dialog.getByRole("option")).toHaveCount(0);
  await expect(dialog).toContainText("No results found");
  await query.fill("dashboard");
  await expect(dialog.getByRole("option")).not.toHaveCount(0);
  await query.press("ArrowDown");
  await query.press("Enter");
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/en\/dashboard\/?$/);
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("combobox")).toHaveValue("");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("the default palette opens exact Calendar on Enter and keeps Google Calendar searchable", async ({
  page,
}) => {
  await page.goto(`${mount}/en/customers/`);
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", {
    name: "Search anything…",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").fill("Calendar");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/calendar\/$/);

  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox").fill("Calendar");
  const options = dialog.getByRole("option");
  await expect(options.first()).toHaveText("Calendar");
  await expect(
    dialog.getByRole("option", { name: "Google Calendar", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("combobox").fill("Google Calendar");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/integrations\/google-calendar\/$/);
});

test.describe("Spanish search with touch and reduced motion", () => {
  test.use({
    viewport: { width: 360, height: 900 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });

  test("reported filters remain usable without horizontal overflow", async ({
    page,
  }) => {
    await openDemo(page, "algolia", "es");
    const form = panel(product(page), "Buscar en fuentes conectadas");
    await form
      .getByLabel("Consulta de búsqueda", { exact: true })
      .fill("local");
    await form.getByRole("button", { name: "Buscar", exact: true }).tap();
    await expect(
      product(page).getByRole("heading", { name: "2 resultados", exact: true }),
    ).toBeVisible();
    const filters = panel(product(page), "Filtros de tu backend");
    await filters
      .getByRole("group", { name: "Status", exact: true })
      .getByRole("checkbox", { name: /^ready\b/ })
      .tap();
    await filters
      .getByRole("button", { name: "Aplicar filtros de facetas", exact: true })
      .tap();
    await expect(
      product(page).getByRole("heading", { name: "1 resultados", exact: true }),
    ).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(dimensions.viewport).toBe(360);
    expect(dimensions.document).toBeLessThanOrEqual(361);
  });
});
