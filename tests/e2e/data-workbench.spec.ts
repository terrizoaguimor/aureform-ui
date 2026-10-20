import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

const suppliedBaseURL = process.env.AUREFORM_BASE_URL;
const mount = (
  suppliedBaseURL
    ? new URL(suppliedBaseURL).pathname
    : (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
).replace(/\/+$/, "");
const mountedPath = (path: string) => `${mount}/${path.replace(/^\/+/, "")}`;

const storageKey = "aureform:saas:v1";
const firstPage = [
  "Olivia Rhye",
  "Phoenix Baker",
  "Lana Steiner",
  "Demi Wilkinson",
  "Drew Cano",
];
const secondPage = [
  "Isabel Torres",
  "Leo Martin",
  "Amelia Wilson",
  "Matías Vega",
  "Sofia Chen",
];
const lastPage = ["Lucas Moreau", "Noor Ahmed"];

const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [
    async ({ page }, use, info) => {
      const errors: string[] = [];
      page.on("pageerror", (error) =>
        errors.push(error.stack ?? error.message),
      );
      await use(errors);
      await info.attach("uncaught-browser-errors", {
        body: JSON.stringify(errors, null, 2),
        contentType: "application/json",
      });
      expect(
        errors,
        "No uncaught browser errors during the actual workflow",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

function workbench(page: Page) {
  return page.locator('[data-slot="data-workbench"]');
}

function table(page: Page) {
  return workbench(page).locator('[data-slot="data-table"]');
}

async function rowNames(page: Page) {
  return (
    await table(page).locator("tbody tr").getByRole("button").allTextContents()
  )
    .map((name) => name.trim())
    .filter(Boolean);
}

async function expectRows(page: Page, names: string[]) {
  await expect(table(page)).not.toHaveAttribute("aria-busy", "true");
  await expect.poll(() => rowNames(page)).toEqual(names);
  await expect(table(page).locator("tbody tr")).toHaveCount(names.length);
}

async function openCustomers(page: Page, locale = "en") {
  await page.goto(mountedPath(`/${locale}/customers/`));
  await expect(table(page)).toHaveAttribute("data-mode", "external");
  await expectRows(page, firstPage);
}

async function choose(page: Page, control: Locator, option: string) {
  await control.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function openFilters(page: Page, locale = "en") {
  const name = locale === "es" ? "Filtros" : "Filters";
  await workbench(page)
    .getByRole("button", { name: new RegExp(`^${name}\\b`) })
    .click();
  const dialog = page.getByRole("dialog", { name, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openColumns(page: Page, locale = "en") {
  const name = locale === "es" ? "Configurar columnas" : "Configure columns";
  await workbench(page).getByRole("button", { name, exact: true }).click();
  const dialog = page.getByRole("dialog", { name, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function selectFilterOption(
  page: Page,
  dialog: Locator,
  label: string,
  option: string,
  locale: "en" | "es" = "en",
) {
  const input = dialog.getByRole("combobox", { name: label, exact: true });
  await input.fill(option);
  await page.getByRole("option", { name: option, exact: true }).click();
  // Selection already closes this listbox. Escape on the closed input clears it.
  await expect(
    dialog.getByRole("button", {
      name: `${locale === "es" ? "Quitar" : "Remove"} ${option}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog).toBeVisible();
}

async function closePopover(page: Page, dialog: Locator) {
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
}

async function storedState(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "{}"),
    storageKey,
  );
}

async function savedViews(page: Page, workspace = "studio") {
  return (await storedState(page)).data[workspace].savedViews as {
    id: string;
    name: string;
    value: {
      query: { search: string; filters: { id: string; value: unknown }[] };
      columns: {
        visibility: Record<string, boolean>;
        order: string[];
        sizing: Record<string, number>;
        pinning: { left: string[]; right: string[] };
      };
      density: string;
    };
  }[];
}

async function saveView(page: Page, name: string, asNew = false) {
  await workbench(page)
    .getByRole("button", { name: "Save view", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Save view", exact: true });
  await dialog.getByLabel("View name", { exact: true }).fill(name);
  await dialog
    .getByRole("button", { name: asNew ? "Save as new" : "Save", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    workbench(page).getByRole("combobox", { name: "Saved views", exact: true }),
  ).toContainText(name);
}

function parseCsv(source: string): Record<string, string>[] {
  const records: string[][] = [];
  let record: string[] = [],
    cell = "",
    quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index++;
      } else quoted = !quoted;
    } else if (!quoted && char === ",") {
      record.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && source[index + 1] === "\n") index++;
      record.push(cell);
      records.push(record);
      record = [];
      cell = "";
    } else cell += char;
  }
  if (cell || record.length) {
    record.push(cell);
    records.push(record);
  }
  const [headers, ...rows] = records;
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index]])),
  );
}

async function exportCsv(page: Page, control: Locator, filename: string) {
  const nextDownload = page.waitForEvent("download");
  await control.click();
  const download = await nextDownload;
  expect(download.suggestedFilename()).toBe(filename);
  const path = await download.path();
  expect(path).not.toBeNull();
  return parseCsv(await readFile(path!, "utf8"));
}

async function assertA11y(page: Page, selector: string, attachment: string) {
  const result = await new AxeBuilder({ page })
    .include(selector)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  await test.info().attach(attachment, {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  expect(
    result.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target),
    })),
  ).toEqual([]);
}

test.afterEach(async ({ page }, info) => {
  if (page.isClosed() || !(await workbench(page).isVisible())) return;
  const state = await storedState(page);
  await info.attach("actual-workbench-checkpoint", {
    body: JSON.stringify(
      {
        url: page.url(),
        viewport: page.viewportSize(),
        mode: await table(page).getAttribute("data-mode"),
        rows: await rowNames(page),
        activeWorkspaceId: state.activeWorkspaceId,
        workspaces: Object.fromEntries(
          Object.entries(state.data ?? {}).map(([id, data]) => {
            const workspace = data as {
              customers: unknown[];
              customerView?: unknown;
              savedViews: unknown[];
            };
            return [
              id,
              {
                customerCount: workspace.customers.length,
                customerView: workspace.customerView,
                savedViews: workspace.savedViews,
              },
            ];
          }),
        ),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await info.attach("actual-production-workbench", {
    body: await page.screenshot({ fullPage: true, animations: "disabled" }),
    contentType: "image/png",
  });
});

test("external page 2 starts with Isabel, total stays 12 and page-size never double paginates", async ({
  page,
}) => {
  await openCustomers(page);
  await expect(
    table(page).getByText("1–5 of 12 customers", { exact: true }),
  ).toBeVisible();
  await table(page)
    .getByRole("button", { name: "Next page", exact: true })
    .click();
  await expectRows(page, secondPage);
  await expect(
    table(page).getByText("6–10 of 12 customers", { exact: true }),
  ).toBeVisible();
  await expect(
    table(page).getByText("Page 2 of 3", { exact: true }),
  ).toBeVisible();
  await table(page)
    .getByRole("button", { name: "Next page", exact: true })
    .click();
  await expectRows(page, lastPage);
  await expect(
    table(page).getByText("11–12 of 12 customers", { exact: true }),
  ).toBeVisible();
  await expect(
    table(page).getByRole("button", { name: "Next page", exact: true }),
  ).toBeDisabled();
  await table(page)
    .getByRole("button", { name: "Page 1", exact: true })
    .click();
  await expectRows(page, firstPage);
  await table(page)
    .getByRole("combobox", { name: "Rows per page", exact: true })
    .selectOption("10");
  await expectRows(page, [...firstPage, ...secondPage]);
  await expect(
    table(page).getByText("1–10 of 12 customers", { exact: true }),
  ).toBeVisible();
  await table(page)
    .getByRole("button", { name: "Next page", exact: true })
    .click();
  await expectRows(page, lastPage);
  await expect(
    table(page).getByText("Page 2 of 2", { exact: true }),
  ).toBeVisible();
});

test("text and numeric sorting change actual external rows and export the complete ordered set", async ({
  page,
}) => {
  await openCustomers(page);
  await table(page)
    .getByRole("button", { name: "Customer", exact: true })
    .click();
  await expectRows(page, [
    "Amelia Wilson",
    "Demi Wilkinson",
    "Drew Cano",
    "Isabel Torres",
    "Lana Steiner",
  ]);
  await expect(
    table(page).getByRole("columnheader", { name: "Customer", exact: true }),
  ).toHaveAttribute("aria-sort", "ascending");
  await table(page)
    .getByRole("button", { name: "Customer", exact: true })
    .click();
  await expectRows(page, [
    "Sofia Chen",
    "Phoenix Baker",
    "Olivia Rhye",
    "Noor Ahmed",
    "Matías Vega",
  ]);
  await table(page)
    .getByRole("button", { name: "Monthly spend", exact: true })
    .click();
  await expectRows(page, [
    "Phoenix Baker",
    "Drew Cano",
    "Amelia Wilson",
    "Noor Ahmed",
    "Olivia Rhye",
  ]);
  const rows = await exportCsv(
    page,
    page.getByRole("button", { name: "Export", exact: true }).first(),
    "customers.csv",
  );
  expect(rows).toHaveLength(12);
  expect(rows.map((row) => Number(row.amount))).toEqual([
    699, 699, 699, 699, 249, 249, 249, 249, 249, 99, 99, 99,
  ]);
  await table(page)
    .getByRole("button", { name: "Monthly spend", exact: true })
    .click();
  await expectRows(page, [
    "Demi Wilkinson",
    "Leo Martin",
    "Lucas Moreau",
    "Olivia Rhye",
    "Lana Steiner",
  ]);
});

test("AND filters combine typed multi-select, company, numeric and inclusive date ranges", async ({
  page,
}) => {
  await openCustomers(page);
  const dialog = await openFilters(page);
  await selectFilterOption(page, dialog, "Status", "Active");
  await selectFilterOption(page, dialog, "Plan", "Pro");
  await dialog
    .getByLabel("Monthly spend: Minimum", { exact: true })
    .fill("200");
  await dialog
    .getByLabel("Monthly spend: Maximum", { exact: true })
    .fill("300");
  await dialog
    .getByLabel("Joined: From date", { exact: true })
    .fill("2026-10-01");
  await dialog
    .getByLabel("Joined: To date", { exact: true })
    .fill("2026-10-14");
  await expectRows(page, ["Olivia Rhye", "Isabel Torres"]);
  await expect(
    table(page).getByText("1–2 of 2 customers", { exact: true }),
  ).toBeVisible();
  await dialog.getByLabel("Company", { exact: true }).fill("lum");
  await expectRows(page, ["Isabel Torres"]);
  await closePopover(page, dialog);
  await expect(
    workbench(page)
      .getByRole("list", { name: "Active filters" })
      .getByRole("listitem"),
  ).toHaveCount(5);
  await workbench(page)
    .getByRole("button", { name: "Remove filter: Company: lum", exact: true })
    .click();
  await expectRows(page, ["Olivia Rhye", "Isabel Torres"]);
  const exported = await exportCsv(
    page,
    page.getByRole("button", { name: "Export", exact: true }).first(),
    "customers.csv",
  );
  expect(exported.map((row) => row.id)).toEqual(["cus-001", "cus-006"]);
  await workbench(page)
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expectRows(page, firstPage);
  await expect(
    workbench(page).getByRole("list", { name: "Active filters" }),
  ).toHaveCount(0);
});

test("search resets page, preserves word separators, folds accents, and clears empty results", async ({
  page,
}) => {
  await openCustomers(page);
  await table(page)
    .getByRole("button", { name: "Next page", exact: true })
    .click();
  await expectRows(page, secondPage);
  const search = table(page).getByRole("textbox", {
    name: "Search records…",
    exact: true,
  });
  await search.fill("Lumina Pro");
  await expectRows(page, ["Isabel Torres"]);
  await expect(search).toHaveValue("Lumina Pro");
  await expect(
    table(page).getByText("Page 1 of 1", { exact: true }),
  ).toBeVisible();
  await search.fill("matias");
  await expectRows(page, ["Matías Vega"]);
  await search.fill("no such customer");
  await expect(
    table(page).getByText("No records found", { exact: true }),
  ).toBeVisible();
  await expect(
    table(page).getByText("0–0 of 0 customers", { exact: true }),
  ).toBeVisible();
  await table(page)
    .getByRole("button", { name: "Clear search", exact: true })
    .first()
    .click();
  await expectRows(page, firstPage);
  await search.fill("tangent");
  await expectRows(page, ["Noor Ahmed"]);
  await workbench(page)
    .getByRole("button", {
      name: "Remove filter: Search: tangent",
      exact: true,
    })
    .click();
  await expect(search).toHaveValue("");
  await expectRows(page, firstPage);
});

test("selection IDs survive page changes; whole and selected CSV contain all intended records", async ({
  page,
}) => {
  await openCustomers(page);
  await table(page)
    .getByRole("checkbox", { name: "Select row cus-001", exact: true })
    .check();
  await table(page)
    .getByRole("button", { name: "Next page", exact: true })
    .click();
  await expectRows(page, secondPage);
  await table(page)
    .getByRole("checkbox", { name: "Select row cus-006", exact: true })
    .check();
  const selection = table(page).locator(
    '[data-slot="table-selection-toolbar"]',
  );
  await expect(selection).toContainText("2 selected");
  const all = await exportCsv(
    page,
    page.getByRole("button", { name: "Export", exact: true }).first(),
    "customers.csv",
  );
  expect(all.map((row) => row.name)).toEqual([
    ...firstPage,
    ...secondPage,
    ...lastPage,
  ]);
  await table(page)
    .getByRole("button", { name: "Previous page", exact: true })
    .click();
  await expectRows(page, firstPage);
  await expect(
    table(page).getByRole("checkbox", {
      name: "Select row cus-001",
      exact: true,
    }),
  ).toBeChecked();
  const selected = await exportCsv(
    page,
    selection.getByRole("button", { name: "Export", exact: true }),
    "customers-selected.csv",
  );
  expect(selected.map((row) => row.id)).toEqual(["cus-001", "cus-006"]);
  expect(selected.map((row) => row.name)).toEqual([
    "Olivia Rhye",
    "Isabel Torres",
  ]);
  await expect(selection).toHaveCount(0);
  await expect(
    table(page).getByRole("checkbox", {
      name: "Select row cus-001",
      exact: true,
    }),
  ).not.toBeChecked();
});

test("column visibility, order, pixel width and sticky pinning affect the actual table", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await openCustomers(page);
  const dialog = await openColumns(page);
  await dialog
    .getByRole("checkbox", { name: "Show column: Company", exact: true })
    .uncheck();
  await expect(
    table(page).getByRole("columnheader", { name: "Company", exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Move earlier: Plan", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Move earlier: Plan", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await table(page).getByRole("columnheader").allTextContents())
        .map((text) => text.trim())
        .filter(Boolean)
        .slice(0, 2),
    )
    .toEqual(["Plan", "Customer"]);
  await dialog
    .getByLabel("Width in pixels: Customer", { exact: true })
    .fill("320");
  await dialog
    .getByLabel("Width in pixels: Customer", { exact: true })
    .press("Tab");
  await choose(
    page,
    dialog.getByRole("combobox", { name: "Pin: Customer", exact: true }),
    "Left",
  );
  await closePopover(page, dialog);
  const customerCell = table(page)
    .locator("tbody tr")
    .first()
    .getByRole("cell")
    .filter({
      has: page.getByRole("button", { name: "Olivia Rhye", exact: true }),
    });
  await expect
    .poll(() =>
      customerCell.evaluate((element) =>
        Math.round(element.getBoundingClientRect().width),
      ),
    )
    .toBe(320);
  await expect
    .poll(() =>
      customerCell.evaluate((element) => getComputedStyle(element).position),
    )
    .toBe("sticky");
  const scroller = table(page).locator('[data-slot="table-container"]');
  await scroller.evaluate((element) => {
    element.scrollLeft = 300;
  });
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  const pinned = await customerCell.boundingBox(),
    container = await scroller.boundingBox();
  expect(pinned).not.toBeNull();
  expect(container).not.toBeNull();
  expect(Math.abs(pinned!.x - container!.x - 48)).toBeLessThanOrEqual(2);
  const persisted = (await storedState(page)).data.studio.customerView.columns;
  expect(persisted.visibility.company).toBe(false);
  expect(persisted.order.slice(0, 2)).toEqual(["plan", "name"]);
  expect(persisted.sizing.name).toBe(320);
  expect(persisted.pinning.left).toEqual(["name"]);
  await page.reload();
  await expectRows(page, firstPage);
  await expect(
    table(page).getByRole("columnheader", { name: "Company", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      customerCell.evaluate((element) =>
        Math.round(element.getBoundingClientRect().width),
      ),
    )
    .toBe(320);
});

test("saved view create, load, rename, save-as-new and delete preserve query and column settings", async ({
  page,
}) => {
  await openCustomers(page);
  let dialog = await openFilters(page);
  await dialog.getByLabel("Company", { exact: true }).fill("Lumina");
  await closePopover(page, dialog);
  await expectRows(page, ["Isabel Torres"]);
  await choose(
    page,
    workbench(page).getByRole("combobox", { name: "Density", exact: true }),
    "Compact",
  );
  dialog = await openColumns(page);
  await dialog
    .getByRole("checkbox", { name: "Show column: Company", exact: true })
    .uncheck();
  await dialog
    .getByLabel("Width in pixels: Customer", { exact: true })
    .fill("320");
  await dialog
    .getByLabel("Width in pixels: Customer", { exact: true })
    .press("Tab");
  await choose(
    page,
    dialog.getByRole("combobox", { name: "Pin: Customer", exact: true }),
    "Left",
  );
  await closePopover(page, dialog);
  await saveView(page, "QA Lumina");
  await expect.poll(async () => (await savedViews(page)).length).toBe(1);
  const original = (await savedViews(page))[0];
  expect(original.value.density).toBe("compact");
  expect(original.value.columns.visibility.company).toBe(false);
  expect(original.value.columns.sizing.name).toBe(320);
  expect(original.value.columns.pinning.left).toEqual(["name"]);
  await workbench(page)
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await choose(
    page,
    workbench(page).getByRole("combobox", { name: "Density", exact: true }),
    "Comfortable",
  );
  await expectRows(page, firstPage);
  const views = workbench(page).getByRole("combobox", {
    name: "Saved views",
    exact: true,
  });
  await choose(page, views, "Current view");
  await expect(views).toContainText("Current view");
  await expect(
    workbench(page).getByRole("button", { name: /^Delete view:/ }),
  ).toHaveCount(0);
  await choose(page, views, "QA Lumina");
  await expectRows(page, ["Isabel Torres"]);
  await expect(table(page)).toHaveAttribute("data-density", "compact");
  await expect(
    workbench(page).getByRole("button", {
      name: "Delete view: QA Lumina",
      exact: true,
    }),
  ).toBeVisible();
  await saveView(page, "QA Lumina renamed");
  expect((await savedViews(page))[0].id).toBe(original.id);
  await saveView(page, "QA Lumina copy", true);
  await expect.poll(async () => (await savedViews(page)).length).toBe(2);
  await page.reload();
  await expectRows(page, ["Isabel Torres"]);
  await choose(page, views, "QA Lumina copy");
  await workbench(page)
    .getByRole("button", { name: "Delete view: QA Lumina copy", exact: true })
    .click();
  await expect
    .poll(async () => (await savedViews(page)).map((view) => view.name))
    .toEqual(["QA Lumina renamed"]);
  await choose(page, views, "QA Lumina renamed");
  await workbench(page)
    .getByRole("button", {
      name: "Delete view: QA Lumina renamed",
      exact: true,
    })
    .click();
  await expect.poll(async () => (await savedViews(page)).length).toBe(0);
  await page.reload();
  await expectRows(page, ["Isabel Torres"]);
  await views.click();
  await expect(page.getByRole("option", { name: /^QA Lumina/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("shared URL carries query, columns and density only; a fresh context restores it", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(baseURL!).origin,
  });
  await openCustomers(page);
  await table(page)
    .getByRole("textbox", { name: "Search records…", exact: true })
    .fill("Lumina Pro");
  await expectRows(page, ["Isabel Torres"]);
  await table(page)
    .getByRole("button", { name: "Monthly spend", exact: true })
    .click();
  const filters = await openFilters(page);
  await selectFilterOption(page, filters, "Status", "Active");
  await filters
    .getByLabel("Monthly spend: Minimum", { exact: true })
    .fill("200");
  await filters
    .getByLabel("Monthly spend: Maximum", { exact: true })
    .fill("300");
  await closePopover(page, filters);
  await table(page)
    .getByRole("combobox", { name: "Rows per page", exact: true })
    .selectOption("10");
  await choose(
    page,
    workbench(page).getByRole("combobox", { name: "Density", exact: true }),
    "Compact",
  );
  const dialog = await openColumns(page);
  await dialog
    .getByRole("checkbox", { name: "Show column: Joined", exact: true })
    .uncheck();
  await dialog
    .getByRole("button", { name: "Move earlier: Plan", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Move earlier: Plan", exact: true })
    .click();
  await dialog
    .getByLabel("Width in pixels: Customer", { exact: true })
    .fill("280");
  await dialog
    .getByLabel("Width in pixels: Customer", { exact: true })
    .press("Tab");
  await choose(
    page,
    dialog.getByRole("combobox", { name: "Pin: Monthly spend", exact: true }),
    "Right",
  );
  await closePopover(page, dialog);
  await workbench(page)
    .getByRole("button", { name: "Share view", exact: true })
    .click();
  await expect(
    page.getByText("View link copied", { exact: true }),
  ).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const url = new URL(link),
    payload = JSON.parse(url.searchParams.get("view")!);
  expect(url.origin).toBe(new URL(baseURL!).origin);
  expect(url.pathname).toBe(mountedPath("/en/customers/"));
  expect([...url.searchParams.keys()]).toEqual(["view"]);
  expect(Object.keys(payload).sort()).toEqual(["value", "version"]);
  expect(payload.version).toBe(1);
  expect(Object.keys(payload.value).sort()).toEqual([
    "columns",
    "density",
    "query",
  ]);
  expect(Object.keys(payload.value.query).sort()).toEqual([
    "filters",
    "pagination",
    "search",
    "sorting",
  ]);
  expect(payload.value.query.search).toBe("Lumina Pro");
  expect(payload.value.query.sorting).toEqual([{ id: "amount", desc: true }]);
  expect(payload.value.query.filters).toEqual([
    { id: "amount", value: { operator: "between", value: [200, 300] } },
    { id: "status", value: { operator: "in", value: ["active"] } },
  ]);
  expect(payload.value.query.pagination.pageSize).toBe(10);
  expect(payload.value.density).toBe("compact");
  expect(payload.value.columns.visibility.joined).toBe(false);
  expect(payload.value.columns.order.slice(0, 2)).toEqual(["plan", "name"]);
  expect(payload.value.columns.sizing.name).toBe(280);
  expect(payload.value.columns.pinning.right).toEqual(["amount"]);
  expect(link).not.toMatch(
    /cus-00|@lumina|Olivia|\"customers\"|\"rows\"|\"data\"|workspaceId/,
  );
  await test.info().attach("actual-shared-view-payload", {
    body: JSON.stringify(payload, null, 2),
    contentType: "application/json",
  });
  const isolated = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  try {
    expect((await isolated.storageState()).origins).toHaveLength(0);
    const receiver = await isolated.newPage(),
      errors: string[] = [];
    receiver.on("pageerror", (error) => errors.push(error.message));
    await receiver.goto(link);
    await expectRows(receiver, ["Isabel Torres"]);
    await expect(
      table(receiver).getByRole("columnheader", {
        name: "Monthly spend",
        exact: true,
      }),
    ).toHaveAttribute("aria-sort", "descending");
    await expect(
      workbench(receiver)
        .getByRole("list", { name: "Active filters" })
        .getByRole("listitem"),
    ).toHaveCount(3);
    await expect(table(receiver)).toHaveAttribute("data-density", "compact");
    await expect(
      table(receiver).getByRole("columnheader", {
        name: "Joined",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      table(receiver).getByRole("textbox", {
        name: "Search records…",
        exact: true,
      }),
    ).toHaveValue("Lumina Pro");
    await expect
      .poll(async () =>
        (await table(receiver).getByRole("columnheader").allTextContents())
          .map((text) => text.trim())
          .filter(Boolean)
          .slice(0, 2),
      )
      .toEqual(["Plan", "Customer"]);
    await choose(
      receiver,
      workbench(receiver).getByRole("combobox", {
        name: "Density",
        exact: true,
      }),
      "Comfortable",
    );
    await expect(receiver).not.toHaveURL(/[?&]view=/);
    await expectRows(receiver, ["Isabel Torres"]);
    const documentStartedAt = await receiver.evaluate(
      () => performance.timeOrigin,
    );
    await receiver.evaluate(
      (url) => window.history.pushState(null, "", url),
      link,
    );
    await expect(table(receiver)).toHaveAttribute("data-density", "compact");
    await expectRows(receiver, ["Isabel Torres"]);
    await receiver.goBack();
    await expect(receiver).not.toHaveURL(/[?&]view=/);
    await expect(table(receiver)).toHaveAttribute(
      "data-density",
      "comfortable",
    );
    await receiver.goForward();
    await expect(receiver).toHaveURL(link);
    await expect(table(receiver)).toHaveAttribute("data-density", "compact");
    await expectRows(receiver, ["Isabel Torres"]);
    expect(await receiver.evaluate(() => performance.timeOrigin)).toBe(
      documentStartedAt,
    );
    expect(errors).toEqual([]);
    await test.info().attach("actual-shared-view-fresh-context", {
      body: await receiver.screenshot({
        fullPage: true,
        animations: "disabled",
      }),
      contentType: "image/png",
    });
  } finally {
    await isolated.close();
  }
});

test("workspace switching isolates saved views and persists each workspace through reload", async ({
  page,
}) => {
  await openCustomers(page);
  await table(page)
    .getByRole("textbox", { name: "Search records…", exact: true })
    .fill("Olivia");
  await expectRows(page, ["Olivia Rhye"]);
  await saveView(page, "QA Studio only");
  await page
    .getByRole("button", { name: /^Aureform Studio\s+Aureform$/ })
    .click();
  await page
    .getByRole("menuitem", { name: "Personal space", exact: true })
    .click();
  await expectRows(page, ["Sofia Chen", "Lucas Moreau", "Noor Ahmed"]);
  await expect(
    table(page).getByText("1–3 of 3 customers", { exact: true }),
  ).toBeVisible();
  const views = workbench(page).getByRole("combobox", {
    name: "Saved views",
    exact: true,
  });
  await views.click();
  await expect(
    page.getByRole("option", { name: "QA Studio only", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await table(page)
    .getByRole("textbox", { name: "Search records…", exact: true })
    .fill("Sofia");
  await expectRows(page, ["Sofia Chen"]);
  await saveView(page, "QA Personal only");
  await page.reload();
  await expectRows(page, ["Sofia Chen"]);
  await page
    .getByRole("button", { name: /^Personal space\s+Personal$/ })
    .click();
  await page
    .getByRole("menuitem", { name: "Aureform Studio", exact: true })
    .click();
  await expectRows(page, ["Olivia Rhye"]);
  await views.click();
  await expect(
    page.getByRole("option", { name: "QA Studio only", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "QA Personal only", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  const state = await storedState(page);
  expect(state.activeWorkspaceId).toBe("studio");
  expect(
    state.data.studio.savedViews.map((view: { name: string }) => view.name),
  ).toEqual(["QA Studio only"]);
  expect(
    state.data.personal.savedViews.map((view: { name: string }) => view.name),
  ).toEqual(["QA Personal only"]);
  expect(state.data.studio.customerView.query.search).toBe("Olivia");
  expect(state.data.personal.customerView.query.search).toBe("Sofia");
  expect(state.data.studio.customers).toHaveLength(12);
  expect(state.data.personal.customers).toHaveLength(3);
});

test("keyboard opens filters, selects an option, restores focus and passes scoped WCAG checks", async ({
  page,
}) => {
  await openCustomers(page);
  await assertA11y(
    page,
    '[data-slot="data-workbench"]',
    "axe-workbench-desktop",
  );
  const trigger = workbench(page).getByRole("button", {
    name: /^Filters\b/,
  });
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Filters", exact: true });
  await expect(dialog).toBeVisible();
  const status = dialog.getByRole("combobox", { name: "Status", exact: true });
  await status.focus();
  await status.fill("Active");
  await expect(
    page.getByRole("option", { name: "Active", exact: true }),
  ).toBeVisible();
  await status.press("ArrowDown");
  await status.press("Enter");
  await expect(
    dialog.getByRole("button", { name: "Remove Active", exact: true }),
  ).toBeVisible();
  await expect(
    table(page).getByText("1–5 of 7 customers", { exact: true }),
  ).toBeVisible();
  await assertA11y(page, '[role="dialog"]', "axe-filter-popover-desktop");
  await dialog.getByLabel("Monthly spend: Minimum", { exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  const columnTrigger = workbench(page).getByRole("button", {
    name: "Configure columns",
    exact: true,
  });
  await columnTrigger.focus();
  await columnTrigger.press("Enter");
  const columns = page.getByRole("dialog", {
    name: "Configure columns",
    exact: true,
  });
  const company = columns.getByRole("checkbox", {
    name: "Show column: Company",
    exact: true,
  });
  await company.focus();
  await company.press("Space");
  await expect(company).not.toBeChecked();
  await expect(
    table(page).getByRole("columnheader", { name: "Company", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(columns).not.toBeVisible();
  await expect(columnTrigger).toBeFocused();
});

test.describe("Spanish mobile", () => {
  test.use({
    viewport: { width: 360, height: 900 },
    isMobile: true,
    hasTouch: true,
  });

  test("external paging, AND filters, density and accessible horizontal keyboard scrolling", async ({
    page,
  }) => {
    await openCustomers(page, "es");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(
      table(page).getByText("1–5 de 12 clientes", { exact: true }),
    ).toBeVisible();
    await table(page)
      .getByRole("button", { name: "Página siguiente", exact: true })
      .click();
    await expectRows(page, secondPage);
    await expect(
      table(page).getByText("6–10 de 12 clientes", { exact: true }),
    ).toBeVisible();
    const search = table(page).getByRole("textbox", {
      name: "Buscar registros…",
      exact: true,
    });
    await search.fill("lumina");
    await expectRows(page, ["Isabel Torres"]);
    await table(page)
      .getByRole("button", { name: "Limpiar búsqueda", exact: true })
      .click();
    await expectRows(page, firstPage);
    const dialog = await openFilters(page, "es");
    await selectFilterOption(page, dialog, "Estado", "Activo", "es");
    await dialog
      .getByLabel("Gasto mensual: Mínimo", { exact: true })
      .fill("200");
    await dialog
      .getByLabel("Gasto mensual: Máximo", { exact: true })
      .fill("300");
    await closePopover(page, dialog);
    await expectRows(page, ["Olivia Rhye", "Isabel Torres", "Sofia Chen"]);
    await expect(
      table(page).getByText("1–3 de 3 clientes", { exact: true }),
    ).toBeVisible();
    await choose(
      page,
      workbench(page).getByRole("combobox", { name: "Densidad", exact: true }),
      "Compacta",
    );
    await expect(table(page)).toHaveAttribute("data-density", "compact");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    const scroller = table(page).getByRole("region", {
      name: "Directorio de clientes",
      exact: true,
    });
    await expect(scroller).toHaveAttribute("tabindex", "0");
    await scroller.focus();
    for (let index = 0; index < 8; index++) await scroller.press("ArrowRight");
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    await expect(scroller).toBeFocused();
    await assertA11y(
      page,
      '[data-slot="data-workbench"]',
      "axe-workbench-spanish-mobile",
    );
  });

  test("column popover fits the viewport and all typed filter inputs have Spanish accessible names", async ({
    page,
  }) => {
    await openCustomers(page, "es");
    let dialog = await openFilters(page, "es");
    await expect(
      dialog.getByRole("combobox", { name: "Estado", exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("combobox", { name: "Plan", exact: true }),
    ).toBeVisible();
    for (const name of [
      "Empresa",
      "Gasto mensual: Mínimo",
      "Gasto mensual: Máximo",
      "Registro: Desde",
      "Registro: Hasta",
    ]) {
      await expect(dialog.getByLabel(name, { exact: true })).toHaveCount(1);
    }
    await closePopover(page, dialog);
    dialog = await openColumns(page, "es");
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(361);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(901);
    await expect(
      dialog.getByRole("checkbox", {
        name: "Mostrar columna: Cliente",
        exact: true,
      }),
    ).toBeChecked();
    await expect(
      dialog.getByRole("combobox", { name: "Fijar: Cliente", exact: true }),
    ).toHaveCount(1);
    await expect(
      dialog.getByLabel("Ancho en píxeles: Cliente", { exact: true }),
    ).toHaveCount(1);
    await assertA11y(page, '[role="dialog"]', "axe-columns-spanish-mobile");
    const lastWidth = dialog.getByLabel("Ancho en píxeles: Registro", {
      exact: true,
    });
    await lastWidth.scrollIntoViewIfNeeded();
    await lastWidth.focus();
    await expect(lastWidth).toBeFocused();
    expect(
      await dialog.evaluate((element) => element.scrollTop),
    ).toBeGreaterThan(0);
    const scrolledBounds = await dialog.boundingBox();
    const inputBounds = await lastWidth.boundingBox();
    expect(scrolledBounds).not.toBeNull();
    expect(inputBounds).not.toBeNull();
    expect(inputBounds!.y).toBeGreaterThanOrEqual(scrolledBounds!.y);
    expect(inputBounds!.y + inputBounds!.height).toBeLessThanOrEqual(
      scrolledBounds!.y + scrolledBounds!.height + 1,
    );
    await closePopover(page, dialog);
    await expect(
      workbench(page).getByRole("button", {
        name: "Configurar columnas",
        exact: true,
      }),
    ).toBeFocused();
  });
});
