import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

const mount = process.env.AUREFORM_BASE_URL
  ? new URL(process.env.AUREFORM_BASE_URL).pathname.replace(/\/+$/, "")
  : "";
type ProductBrowserEvidence = {
  errors: string[];
  externalRequests: string[];
};

const test = base.extend<{ evidence: ProductBrowserEvidence }>({
  evidence: [
    async ({ page, baseURL }, use, info) => {
      const evidence: ProductBrowserEvidence = {
        errors: [],
        externalRequests: [],
      };
      const origin = new URL(baseURL!).origin;
      page.on("pageerror", (error) => evidence.errors.push(error.message));
      await page.context().route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (/^https?:$/.test(url.protocol) && url.origin !== origin) {
          evidence.externalRequests.push(`${url.origin}${url.pathname}`);
          await route.abort();
          return;
        }
        await route.continue();
      });
      await use(evidence);
      await info.attach("product-browser-evidence", {
        body: JSON.stringify(evidence),
        contentType: "application/json",
      });
      expect(evidence.errors, "No uncaught product workflow errors").toEqual(
        [],
      );
      expect(
        evidence.externalRequests,
        "Local product demos do not attempt external HTTP requests",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

test.use({ serviceWorkers: "block" });

function hub(page: Page) {
  return page.locator("[data-integration-hub]");
}

function product(page: Page, family: string) {
  return page.locator(`[data-product-workbench="${family}"]`);
}

function panel(root: Page | Locator, name: string) {
  return root.getByRole("region", { name, exact: true });
}

async function choose(page: Page, control: Locator, option: string) {
  await control.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

async function openDemo(page: Page, recipe: string, family: string) {
  await page.goto(`${mount}/en/integrations/${recipe}/`);
  await expect(hub(page)).toHaveAttribute("data-integration-mode", "demo");
  const start = hub(page).getByRole("button", {
    name: "Start local demo",
    exact: true,
  });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(
    hub(page).getByText("Local preview configured.", { exact: true }),
  ).toBeVisible();
  await expect(product(page, family)).toBeVisible();
}

async function connectionSettings(page: Page) {
  await hub(page).getByRole("tab", { name: "Connection", exact: true }).click();
  const settings = hub(page).getByRole("tabpanel", {
    name: "Connection",
    exact: true,
  });
  await expect(
    settings.getByRole("combobox", { name: "Provider choice", exact: true }),
  ).toBeVisible();
  return settings;
}

async function saveSettings(
  page: Page,
  settings: Locator,
  family: string,
  notice = "Configuration saved.",
) {
  await settings
    .getByRole("button", { name: "Save configuration", exact: true })
    .click();
  await expect(hub(page).getByText(notice, { exact: true })).toBeVisible();
  await hub(page).getByRole("tab", { name: "Workflow", exact: true }).click();
  await expect(product(page, family)).toBeVisible();
}

async function authorizeAllDemoResources(page: Page, family: string) {
  const settings = await connectionSettings(page);
  for (const checkbox of await settings.getByRole("checkbox").all()) {
    if (await checkbox.isEnabled()) await checkbox.check();
  }
  await saveSettings(page, settings, family);
  await expect(product(page, family)).toContainText("12 authorized resources");
}

async function productReview(page: Page) {
  const review = panel(page, "Review this action");
  await expect(review).toBeVisible();
  await expect(
    review.getByRole("button", { name: "Confirm action", exact: true }),
  ).toBeEnabled();
  return review;
}

async function confirmProductReview(page: Page, expectClosed = true) {
  const review = await productReview(page);
  await review
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  if (expectClosed) await expect(review).not.toBeVisible();
}

async function confirmExplorerReview(page: Page) {
  const review = page.getByRole("dialog", {
    name: "Review before running",
    exact: true,
  });
  await expect(review).toBeVisible();
  const confirm = review.getByRole("button", {
    name: "Confirm and run",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  await review.getByRole("checkbox").check();
  await confirm.click();
  await expect(review).not.toBeVisible();
}

async function tableIds(table: Locator) {
  return table
    .getByRole("checkbox", { name: /^Select record / })
    .evaluateAll((inputs) =>
      inputs.map((input) =>
        input.getAttribute("aria-label")!.replace("Select record ", ""),
      ),
    );
}

async function tableNames(table: Locator) {
  return table
    .getByRole("button", { name: /^Edit / })
    .evaluateAll((buttons) =>
      buttons.map((button) =>
        button.getAttribute("aria-label")!.replace(/^Edit /, ""),
      ),
    );
}

async function recordCount(explorer: Locator) {
  const match = (await explorer.innerText()).match(
    /\d+–\d+ of ([\d,]+) records\b/,
  );
  return match ? Number(match[1].replaceAll(",", "")) : -1;
}

/** Seed only the local demo, using its reviewed upsert action and real results. */
async function ensureScopedPagingRows(page: Page, mutationLabel: string) {
  const explorer = panel(product(page, "data"), "Explore your data");
  await expect.poll(() => recordCount(explorer)).toBeGreaterThan(0);
  const actions = hub(page).locator("details").filter({
    hasText: "Explore all available actions",
  });
  await actions.locator("summary").click();
  await choose(
    page,
    actions.getByRole("combobox", { name: "Available action", exact: true }),
    mutationLabel,
  );
  // A scope change can still be replacing the previous query's total. Create
  // six reviewed rows instead of deriving fixture size from that stale total.
  for (let index = 0; index < 6; index += 1) {
    const name = `Customers E2E paging ${index + 1}`;
    await actions
      .getByLabel(/^Record reference\b/)
      .fill(`synthetic-pagination-row-${index + 1}`);
    await actions.getByLabel(/^Name\b/).fill(name);
    await choose(
      page,
      actions.getByRole("combobox", { name: /^Application status\b/ }),
      "Active",
    );
    await actions
      .getByRole("button", { name: mutationLabel, exact: true })
      .click();
    await confirmExplorerReview(page);
    await expect(
      actions.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  await actions.locator("summary").click();
  const search = explorer.getByRole("textbox", {
    name: "Search records…",
    exact: true,
  });
  await search.fill("Customers E2E paging");
  await explorer
    .getByRole("button", { name: "Refresh records", exact: true })
    .click();
  await expect(
    explorer.getByRole("button", { name: /^Edit Customers E2E paging \d+$/ }),
  ).toHaveCount(6);
  await expect.poll(() => recordCount(explorer)).toBe(6);
  await search.fill("");
  await expect.poll(() => recordCount(explorer)).toBeGreaterThanOrEqual(6);
}

test("data: remote paging, sorting, filtering, reviewed record mutation and authorized scope", async ({
  page,
}) => {
  await openDemo(page, "tanstack-query", "data");
  await authorizeAllDemoResources(page, "data");
  await ensureScopedPagingRows(page, "Save and invalidate");
  const root = product(page, "data");
  const explorer = panel(root, "Explore your data");
  const table = explorer.getByRole("table", { name: "records", exact: true });
  await explorer
    .getByRole("combobox", { name: "Records per page", exact: true })
    .selectOption("5");
  await expect(
    table.getByRole("checkbox", { name: /^Select record / }),
  ).toHaveCount(5);
  const total = await recordCount(explorer);
  expect(total).toBeGreaterThanOrEqual(6);
  await expect(explorer).toContainText(`1–5 of ${total} records`);
  await expect(
    table.getByRole("checkbox", { name: /^Select record / }),
  ).toHaveCount(5);
  const first = await tableIds(table);
  const firstName = (await tableNames(table))[0];
  expect(first).toHaveLength(5);
  await table
    .getByRole("checkbox", { name: `Select record ${first[0]}`, exact: true })
    .check();
  await explorer
    .getByRole("button", { name: "Next page", exact: true })
    .click();
  const secondCount = Math.min(5, total - 5);
  await expect(explorer).toContainText(
    `6–${Math.min(10, total)} of ${total} records`,
  );
  await expect
    .poll(async () => {
      const ids = await tableIds(table);
      return (
        ids.length === secondCount && ids.every((id) => !first.includes(id))
      );
    })
    .toBe(true);
  const second = await tableIds(table);
  expect(second).toHaveLength(secondCount);
  expect(second.some((id) => first.includes(id))).toBe(false);
  await explorer
    .getByRole("button", { name: "Previous page", exact: true })
    .click();
  await expect(explorer).toContainText(`1–5 of ${total} records`);
  await expect(
    table.getByRole("checkbox", {
      name: `Select record ${first[0]}`,
      exact: true,
    }),
  ).toBeChecked();

  const recordHeader = table.getByRole("columnheader", {
    name: "Record",
    exact: true,
  });
  await recordHeader
    .getByRole("button", { name: "Record", exact: true })
    .click();
  await expect(recordHeader).toHaveAttribute("aria-sort", "ascending");
  await recordHeader
    .getByRole("button", { name: "Record", exact: true })
    .click();
  await expect(recordHeader).toHaveAttribute("aria-sort", "descending");
  await expect
    .poll(async () => {
      const names = await tableNames(table);
      return (
        names.length === 5 &&
        names.every((name, index) =>
          index ? names[index - 1].localeCompare(name) >= 0 : true,
        )
      );
    })
    .toBe(true);
  expect(await tableIds(table)).not.toEqual(first);

  await explorer.getByRole("textbox", { name: "Status filter" }).fill("ready");
  const search = explorer.getByRole("textbox", {
    name: "Search records…",
    exact: true,
  });
  await search.fill("Customers");
  await expect
    .poll(async () => {
      const count = await recordCount(explorer);
      return count > 0 && count < total;
    })
    .toBe(true);
  await expect
    .poll(async () => (await tableIds(table)).length)
    .toBeGreaterThan(0);
  for (const row of await table.locator("tbody tr").all()) {
    await expect(row).toContainText("Customers");
    await expect(row.getByRole("cell").nth(2)).toHaveText("Ready");
  }
  await search.fill(firstName);
  await explorer.getByRole("textbox", { name: "Status filter" }).fill("");
  await table
    .getByRole("button", { name: `Edit ${firstName}`, exact: true })
    .click();
  const editor = panel(root, "Edit record");
  await editor
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Product data E2E");
  await choose(
    page,
    editor.getByRole("combobox", { name: "Status" }),
    "Active",
  );
  await editor
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("A reviewed update to the original stable record.");
  await editor
    .getByRole("textbox", { name: "Record fields · JSON object", exact: true })
    .fill('{"count":0,"enabled":false,"labels":["local"]}');
  await editor
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  await expect(await productReview(page)).toContainText("Product data E2E");
  await (
    await productReview(page)
  )
    .getByRole("button", { name: "Back to editing", exact: true })
    .click();
  await expect(table).not.toContainText("Product data E2E");
  await editor
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  await confirmProductReview(page);
  await expect(editor).toContainText(first[0]);
  await search.fill("Product data E2E");
  await expect(explorer).toContainText("1–1 of 1 records");
  await expect.poll(() => tableIds(table)).toEqual([first[0]]);
  await expect(table).toContainText("Active");

  const settings = await connectionSettings(page);
  const resourceChoices = settings
    .locator("label")
    .filter({ hasText: "TanStack Query · local preview" });
  for (const label of await resourceChoices.all()) {
    const checkbox = label.getByRole("checkbox");
    if ((await label.innerText()).startsWith("Orders 1"))
      await checkbox.check();
    else await checkbox.uncheck();
  }
  await saveSettings(page, settings, "data");
  await expect(root).toContainText("1 authorized resources");
  await expect(panel(root, "Edit record")).toHaveCount(0);
  await expect.poll(() => recordCount(explorer)).toBeGreaterThan(0);
  await expect
    .poll(async () => (await tableNames(table)).length)
    .toBeGreaterThan(0);
  for (const name of await tableNames(table)) expect(name).toContain("Orders");
  await expect(table).not.toContainText("Product data E2E");
});

test("data: broad reactive events requery the active filter and page; paused subscriptions require refresh", async ({
  page,
}) => {
  await openDemo(page, "convex", "data");
  await authorizeAllDemoResources(page, "data");
  await ensureScopedPagingRows(page, "Call configured mutation");
  const root = product(page, "data");
  const explorer = panel(root, "Explore your data");
  const table = explorer.getByRole("table", { name: "records", exact: true });
  const follow = explorer.getByRole("checkbox", {
    name: "Follow reactive data",
    exact: true,
  });
  await expect(follow).toBeChecked();
  await explorer
    .getByRole("combobox", { name: "Records per page", exact: true })
    .selectOption("5");
  await explorer
    .getByRole("textbox", { name: "Search records…", exact: true })
    .fill("Customers");
  await expect.poll(() => tableIds(table)).toHaveLength(5);
  await expect.poll(() => recordCount(explorer)).toBeGreaterThanOrEqual(6);
  const total = await recordCount(explorer);
  await expect(explorer).toContainText(`1–5 of ${total} records`);
  await expect.poll(() => tableIds(table)).toHaveLength(5);
  const firstIds = await tableIds(table);
  await explorer
    .getByRole("button", { name: "Next page", exact: true })
    .click();
  const secondCount = Math.min(5, total - 5);
  const secondPage = `6–${Math.min(10, total)} of ${total} records`;
  await expect(explorer).toContainText(secondPage);
  await expect
    .poll(async () => {
      const ids = await tableIds(table);
      return (
        ids.length === secondCount && ids.every((id) => !firstIds.includes(id))
      );
    })
    .toBe(true);
  const secondIds = await tableIds(table);
  expect(secondIds).toHaveLength(secondCount);
  const currentName = (await tableNames(table))[0];
  const currentRow = table.locator("tbody tr").filter({
    has: page.getByRole("checkbox", {
      name: `Select record ${secondIds[0]}`,
      exact: true,
    }),
  });
  const actions = hub(page).locator("details").filter({
    hasText: "Explore all available actions",
  });
  await actions.locator("summary").click();
  await choose(
    page,
    actions.getByRole("combobox", { name: "Available action", exact: true }),
    "Call configured mutation",
  );
  await actions.getByLabel(/^Record reference\b/).fill(secondIds[0]);
  await actions.getByLabel(/^Name\b/).fill(currentName);
  await choose(
    page,
    actions.getByRole("combobox", { name: /^Application status\b/ }),
    "Pending",
  );
  await actions
    .getByRole("button", { name: "Call configured mutation", exact: true })
    .click();
  await confirmExplorerReview(page);
  const mutationResult = actions.locator("article").filter({
    has: page.getByRole("heading", { name: currentName, exact: true }),
  });
  await expect(mutationResult).toContainText("Pending");
  await expect(currentRow.getByRole("cell").nth(2)).toHaveText("Pending");
  await expect(explorer).toContainText("Reactive update received");
  await expect(explorer).toContainText(secondPage);
  await expect.poll(() => tableIds(table)).toEqual(secondIds);
  await choose(
    page,
    actions.getByRole("combobox", { name: "Available action", exact: true }),
    "Call configured query",
  );
  await actions.getByLabel(/^Search text\b/).fill("Customers");
  await actions.getByLabel(/^Result limit\b/).fill("5");
  await actions
    .getByRole("button", { name: "Call configured query", exact: true })
    .click();
  await expect(actions).toContainText("Customers");
  await expect(currentRow.getByRole("cell").nth(2)).toHaveText("Pending");
  await expect.poll(() => tableIds(table)).toEqual(secondIds);
  await expect(explorer).toContainText(secondPage);
  await follow.uncheck();
  await expect(explorer).toContainText("Live updates paused");
  await choose(
    page,
    actions.getByRole("combobox", { name: "Available action", exact: true }),
    "Call configured mutation",
  );
  await actions.getByLabel(/^Record reference\b/).fill(secondIds[0]);
  await actions.getByLabel(/^Name\b/).fill(currentName);
  await choose(
    page,
    actions.getByRole("combobox", { name: /^Application status\b/ }),
    "Archived",
  );
  await actions
    .getByRole("button", { name: "Call configured mutation", exact: true })
    .click();
  await confirmExplorerReview(page);
  await expect(mutationResult).toContainText(/archived/i);
  await expect(currentRow.getByRole("cell").nth(2)).toHaveText("Pending");
  await expect(currentRow.getByRole("cell").nth(2)).not.toHaveText(
    /^archived$/i,
  );
  await explorer
    .getByRole("button", { name: "Refresh records", exact: true })
    .click();
  await expect(currentRow.getByRole("cell").nth(2)).toHaveText(/^archived$/i);
  await expect(explorer).toContainText("Live updates paused");
});

test("content: Markdown preview, reviewed saves and real compare-and-swap conflict recovery", async ({
  page,
}) => {
  await openDemo(page, "tiptap", "content");
  const root = product(page, "content");
  const workspace = panel(root, "Document workspace");
  const editor = panel(root, "Editor");
  await workspace
    .getByRole("button", { name: "Load document", exact: true })
    .click();
  await expect(workspace).toContainText("Revision 1");
  const documentId = await workspace
    .getByRole("textbox", { name: "Document ID" })
    .inputValue();
  const content = editor.getByRole("textbox", {
    name: "Document content",
    exact: true,
  });
  await editor
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Product document E2E");
  await content.fill("# Reviewed brief\n\nA **useful** local document.");
  await expect(
    panel(root, "Preview").getByRole("heading", {
      name: "Reviewed brief",
      exact: true,
    }),
  ).toBeVisible();
  await expect(panel(root, "Preview").locator("strong")).toHaveText("useful");
  await editor
    .getByRole("button", { name: "Review and save", exact: true })
    .click();
  await expect(await productReview(page)).toContainText(documentId);
  await confirmProductReview(page);
  await expect(workspace).toContainText("Revision 2");
  await content.fill("# Local conflict draft\n\nPreserve these edits.");

  const actions = hub(page).locator("details").filter({
    hasText: "Explore all available actions",
  });
  await actions.locator("summary").click();
  await choose(
    page,
    actions.getByRole("combobox", { name: "Available action", exact: true }),
    "Save Tiptap snapshot",
  );
  await actions.getByLabel(/^Document reference\b/).fill(documentId);
  await actions
    .getByLabel(/^Document title\b/)
    .fill("Concurrent product revision");
  await actions
    .getByLabel(/^Content\b/)
    .fill("# Saved from the second action path");
  await actions.getByLabel(/^Expected revision\b/).fill("2");
  await actions
    .getByRole("button", { name: "Save Tiptap snapshot", exact: true })
    .click();
  await confirmExplorerReview(page);
  await expect(actions).toContainText("Concurrent product revision");
  await expect(workspace).toContainText("Revision 2");
  await expect(content).toHaveValue(
    "# Local conflict draft\n\nPreserve these edits.",
  );

  await editor
    .getByRole("button", { name: "Review and save", exact: true })
    .click();
  await confirmProductReview(page, false);
  const conflict = panel(root, "Resolve a document conflict");
  await expect(conflict).toBeVisible();
  await expect(content).toHaveValue(
    "# Local conflict draft\n\nPreserve these edits.",
  );
  await conflict
    .getByRole("button", { name: "Load latest revision", exact: true })
    .click();
  await expect(conflict).toContainText(
    "Concurrent product revision · Revision 3",
  );
  await conflict
    .getByRole("button", {
      name: "Keep edits, use latest revision",
      exact: true,
    })
    .click();
  await expect(conflict).not.toBeVisible();
  await editor
    .getByRole("button", { name: "Review and save", exact: true })
    .click();
  await confirmProductReview(page);
  await expect(workspace).toContainText("Revision 4");
  await workspace
    .getByRole("button", { name: "Load document", exact: true })
    .click();
  await expect(content).toHaveValue(
    "# Local conflict draft\n\nPreserve these edits.",
  );
});

for (const recipe of ["lexical", "blocknote"]) {
  test(`content: ${recipe} initial, retrieved and new documents select valid structured JSON`, async ({
    page,
  }) => {
    await openDemo(page, recipe, "content");
    const root = product(page, "content");
    const workspace = panel(root, "Document workspace");
    const editor = panel(root, "Editor");
    const format = editor.getByRole("combobox", {
      name: "Document format",
      exact: true,
    });
    const content = editor.getByRole("textbox", {
      name: "Document content",
      exact: true,
    });
    await expect(format).toContainText("Structured JSON");
    const blank = JSON.parse(await content.inputValue());
    if (recipe === "lexical") expect(blank.root.type).toBe("root");
    else expect(Array.isArray(blank)).toBe(true);
    await format.click();
    await expect(
      page.getByRole("option", { name: "Markdown", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("option", { name: "Structured JSON", exact: true })
      .click();
    await workspace
      .getByRole("button", { name: "Load document", exact: true })
      .click();
    await expect(workspace).toContainText("Revision 1");
    const retrieved = JSON.parse(await content.inputValue());
    if (recipe === "lexical")
      expect(retrieved.root.children[0].type).toBe("paragraph");
    else expect(retrieved[0].type).toBe("paragraph");
    await editor
      .getByRole("textbox", { name: "Title", exact: true })
      .fill(`${recipe} structured E2E`);
    await editor
      .getByRole("button", { name: "Review and save", exact: true })
      .click();
    await confirmProductReview(page);
    await expect(workspace).toContainText("Revision 2");
    await workspace
      .getByRole("button", { name: "New document", exact: true })
      .click();
    await expect(format).toContainText("Structured JSON");
    expect(JSON.parse(await content.inputValue())).toEqual(blank);
    await expect(workspace).not.toContainText("Revision 2");
    await expect(
      editor.getByRole("alert").filter({ hasText: "Correct the JSON syntax" }),
    ).toHaveCount(0);
  });
}

test("search: ranked matching snippets and reviewed indexing produce searchable content", async ({
  page,
}) => {
  await openDemo(page, "algolia", "search");
  const root = product(page, "search");
  const composer = panel(root, "Search connected sources");
  const query = composer.getByRole("textbox", {
    name: "Search query",
    exact: true,
  });
  await query.fill("preview");
  await composer.getByRole("button", { name: "Search", exact: true }).click();
  const results = root.getByRole("region", { name: /^2 results$/ });
  await expect(results).toBeVisible();
  await expect(results.locator("mark")).toHaveCount(2);
  await expect(results.locator("mark").first()).toHaveText("preview");
  await expect(results).toContainText("Algolia");
  await expect(results).toContainText("0.96");
  await expect(results).toContainText("0.93");

  const index = panel(root, "Index documents");
  await index
    .getByRole("textbox", { name: "Document ID", exact: true })
    .fill("product-search-e2e");
  await index
    .getByRole("textbox", { name: "Document name", exact: true })
    .fill("Indexed product E2E");
  await index
    .getByRole("textbox", { name: "Document content", exact: true })
    .fill("An indexed e2e passage from a reviewed local source.");
  await index
    .getByRole("button", { name: "Review index update", exact: true })
    .click();
  await expect(await productReview(page)).toContainText("product-search-e2e");
  await confirmProductReview(page);
  await expect(index).toContainText("Indexed product E2E");
  await query.fill("indexed e2e passage");
  await composer.getByRole("button", { name: "Search", exact: true }).click();
  const indexed = root.getByRole("region", { name: /^1 results$/ });
  await expect(indexed).toContainText("Indexed product E2E");
  await expect(indexed.locator("mark")).toHaveText("indexed e2e passage");
});

test("collaboration: reported presence, reviewed messages, freshness, reconnect and subscription cleanup", async ({
  page,
}) => {
  await openDemo(page, "realtime-messaging", "collaboration");
  const root = product(page, "collaboration");
  const room = panel(root, "Shared workspace");
  const conversation = panel(root, "Conversation");
  await room
    .getByRole("checkbox", { name: "Follow live updates", exact: true })
    .check();
  await expect(panel(root, "Presence")).toContainText("Alex Morgan");
  await expect(room).toContainText("Recently updated");
  await conversation
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Product collaboration E2E message");
  await conversation
    .getByRole("button", { name: "Review message", exact: true })
    .click();
  await (
    await productReview(page)
  )
    .getByRole("button", { name: "Back to editing", exact: true })
    .click();
  await expect(
    conversation.locator("ol").getByText("Product collaboration E2E message", {
      exact: true,
    }),
  ).toHaveCount(0);
  await conversation
    .getByRole("button", { name: "Review message", exact: true })
    .click();
  await confirmProductReview(page);
  await expect(
    conversation.locator("ol").getByText("Product collaboration E2E message", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    conversation.getByRole("textbox", { name: "Message", exact: true }),
  ).toHaveValue("");
  await room
    .getByRole("button", { name: "Reconnect from cursor", exact: true })
    .click();
  await expect(panel(root, "Presence")).toContainText("Alex Morgan");
  await room
    .getByRole("checkbox", { name: "Follow live updates", exact: true })
    .uncheck();
  await expect(
    room.getByRole("button", { name: "Reconnect from cursor", exact: true }),
  ).toHaveCount(0);
  await room.getByRole("button", { name: "Refresh room", exact: true }).click();
  await expect(
    conversation.locator("ol").getByText("Product collaboration E2E message", {
      exact: true,
    }),
  ).toBeVisible();
});

for (const maps of [
  { recipe: "existing-maps", provider: "Google Maps" },
  { recipe: "mapbox", provider: "Mapbox" },
]) {
  test(`maps: ${maps.provider} demo uses local geometry without provider requests`, async ({
    page,
    evidence,
  }) => {
    await openDemo(page, maps.recipe, "maps");
    if (maps.provider === "Google Maps") {
      const settings = await connectionSettings(page);
      await choose(
        page,
        settings.getByRole("combobox", {
          name: "Provider choice",
          exact: true,
        }),
        maps.provider,
      );
      await saveSettings(page, settings, "maps", "Local preview configured.");
    }
    const root = product(page, "maps");
    await expect(
      root.getByRole("heading", { name: maps.provider, exact: true }),
    ).toBeVisible();
    const locations = panel(root, "Location workbench");
    await expect(locations).toContainText("local fixtures");
    const example = panel(root, "Aureform route-map example");
    await expect(
      example.getByRole("button", { name: "Hide example", exact: true }),
    ).toBeVisible();
    await expect(
      example.getByRole("button", { name: "AF-284: Bogotá", exact: true }),
    ).toBeVisible();
    await locations
      .getByRole("button", { name: "Load authorized locations", exact: true })
      .click();
    const route = panel(root, "Route request");
    await expect(
      route.getByRole("combobox", { name: "Origin", exact: true }),
    ).toContainText("Bogotá studio");
    await expect(
      route.getByRole("combobox", { name: "Destination", exact: true }),
    ).toContainText("Medellín warehouse");
    await route
      .getByRole("button", { name: "Request route", exact: true })
      .click();
    await expect(route).toContainText(
      "This is not a live directions response.",
    );
    await expect(
      root.locator(
        'svg[aria-label="Coordinates returned by the connected source"] polyline',
      ),
    ).toHaveAttribute("points", /[\d.,]+/);
    await locations
      .getByRole("textbox", { name: "Address or place", exact: true })
      .fill("Local map E2E place");
    await locations
      .getByRole("button", { name: "Resolve address", exact: true })
      .click();
    await expect(panel(root, "Returned locations")).toContainText(
      "Local map E2E place",
    );
    await example
      .getByRole("button", { name: "Hide example", exact: true })
      .click();
    await expect(
      example.getByRole("button", { name: "AF-284: Bogotá", exact: true }),
    ).toHaveCount(0);
    await example
      .getByRole("button", { name: "Show route-map example", exact: true })
      .click();
    await expect(
      example.getByRole("button", { name: "AF-284: Bogotá", exact: true }),
    ).toBeVisible();
    expect(evidence.externalRequests).toEqual([]);
  });
}

test("knowledge: upload, ingestion, citations, evaluation and reviewed source deletion advance only on reported refresh", async ({
  page,
}) => {
  await openDemo(page, "pgvector", "knowledge");
  const root = product(page, "knowledge");
  const sources = panel(root, "Knowledge sources");
  const ingestion = panel(root, "Add and ingest a source");
  const sourceName = "Product knowledge E2E";
  const sourceContent =
    "A retrieval e2e passage with local evidence and a clear source.";
  await ingestion
    .getByRole("textbox", { name: "Source name", exact: true })
    .fill(sourceName);
  await ingestion.getByLabel("Source file", { exact: true }).setInputFiles({
    name: "product-knowledge-e2e.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(sourceContent),
  });
  await ingestion
    .getByRole("button", { name: "Review source upload", exact: true })
    .click();
  await expect(ingestion).toContainText("product-knowledge-e2e.md");
  await ingestion
    .getByRole("button", { name: "Confirm upload", exact: true })
    .click();
  await expect(
    ingestion.getByRole("link", {
      name: "product-knowledge-e2e.md",
      exact: true,
    }),
  ).toBeVisible();
  await ingestion
    .getByRole("textbox", { name: "Source content", exact: true })
    .fill(sourceContent);
  await ingestion
    .getByRole("button", { name: "Review ingestion", exact: true })
    .click();
  await expect(await productReview(page)).toContainText(sourceName);
  await expect(sources).not.toContainText(sourceName);
  await confirmProductReview(page);
  await expect(sources).toContainText(sourceName);
  await expect(panel(root, "Ingestion progress")).toContainText("Ready");

  const retrieval = panel(root, "Search with citations");
  await retrieval
    .getByRole("textbox", { name: "Question or query", exact: true })
    .fill("retrieval e2e passage");
  await retrieval
    .getByRole("button", { name: "Find source passages", exact: true })
    .click();
  await expect(retrieval).toContainText(sourceName);
  await expect(retrieval.locator("mark")).toHaveText("retrieval e2e passage");
  const evaluation = panel(root, "Evaluate retrieval");
  await choose(
    page,
    evaluation.getByRole("combobox", {
      name: "Citation to evaluate",
      exact: true,
    }),
    `[1] ${sourceName}`,
  );
  await evaluation
    .getByRole("textbox", { name: "Evaluation notes", exact: true })
    .fill("The returned citation supports this local passage.");
  await evaluation
    .getByRole("textbox", { name: "Approved dataset", exact: true })
    .fill("local-e2e-retrieval-check");
  await evaluation
    .getByRole("button", { name: "Review evaluation", exact: true })
    .click();
  await expect(await productReview(page)).toContainText(
    "retrieval e2e passage",
  );
  await confirmProductReview(page);
  await expect(evaluation).toContainText("Demo useful feedback");

  const removal = panel(root, "Remove a knowledge source");
  const reviewRemoval = removal.getByRole("button", {
    name: "Review source removal",
    exact: true,
  });
  await expect(reviewRemoval).toBeDisabled();
  const sourceRow = sources
    .getByRole("list", { name: "Reported knowledge sources", exact: true })
    .locator("li")
    .filter({
      has: page.getByRole("button", {
        name: `Select source · ${sourceName}`,
        exact: true,
      }),
    });
  await sourceRow
    .getByRole("button", {
      name: `Select source · ${sourceName}`,
      exact: true,
    })
    .click();
  await reviewRemoval.click();
  await expect(await productReview(page)).toContainText(sourceName);
  await expect(await productReview(page)).toContainText(
    "This requests removal of this source and its indexed data.",
  );
  await (
    await productReview(page)
  )
    .getByRole("button", { name: "Back to editing", exact: true })
    .click();
  await expect(sourceRow).not.toContainText("Deleting · reported by service");
  await expect(removal).not.toContainText(
    "Deletion pending · reported by service",
  );
  await reviewRemoval.click();
  await confirmProductReview(page);
  await expect(removal).toContainText("Deletion pending · reported by service");
  await expect(removal.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "32",
  );
  await expect(removal).not.toContainText(
    "Source deletion reported by service",
  );
  const refreshRemoval = removal.getByRole("button", {
    name: "Refresh deletion status",
    exact: true,
  });
  await refreshRemoval.click();
  await expect(sourceRow).toContainText("Deleting · reported by service");
  await expect(removal).not.toContainText(
    "Source deletion reported by service",
  );
  await refreshRemoval.click();
  await expect(sourceRow).toContainText("Deleted · reported by service");
  await expect(sourceRow).toBeVisible();
  await expect(removal).toContainText("Source deletion reported by service");
  await expect(reviewRemoval).toBeDisabled();
  await expect(
    sourceRow.getByRole("button", {
      name: `Select source · ${sourceName}`,
      exact: true,
    }),
  ).toBeDisabled();
  await retrieval
    .getByRole("button", { name: "Find source passages", exact: true })
    .click();
  await expect(retrieval).toContainText("No matching source passages");
  await expect(retrieval.getByText(sourceName, { exact: true })).toHaveCount(0);
});

test("agents: explicit rejection, structured tool approval and persisted checkpoint", async ({
  page,
}) => {
  await openDemo(page, "cloudflare-agents", "agents");
  const root = product(page, "agents");
  const prepare = panel(root, "Prepare an execution");
  await prepare
    .getByRole("textbox", { name: "Task and expected outcome", exact: true })
    .fill("Draft the reviewed product E2E brief.");
  await prepare
    .getByRole("button", { name: "Review execution", exact: true })
    .click();
  await expect(panel(root, "Tool action and approval")).toHaveCount(0);
  await confirmProductReview(page);
  const approval = panel(root, "Tool action and approval");
  await expect(approval).toContainText("Approval required");
  await approval
    .getByRole("button", { name: "Review rejection", exact: true })
    .click();
  await expect(await productReview(page)).toContainText("reject");
  await confirmProductReview(page);
  await expect(approval).toContainText("Rejected");
  await expect(approval).toContainText("no side effect occurred");

  await choose(
    page,
    prepare.getByRole("combobox", { name: "Execution type", exact: true }),
    "Tool call",
  );
  await prepare
    .getByRole("textbox", {
      name: /^Or enter a tool name exposed by your backend\b/,
    })
    .fill("local_product_fixture");
  await prepare
    .getByRole("checkbox", { name: "Use a JSON input object", exact: true })
    .check();
  await prepare
    .getByRole("textbox", { name: "Tool arguments", exact: true })
    .fill('{"document":{"title":"Approved product E2E"},"labels":["local"]}');
  await prepare
    .getByRole("button", { name: "Review execution", exact: true })
    .click();
  await expect(await productReview(page)).toContainText("Approved product E2E");
  await confirmProductReview(page);
  await expect(approval).toContainText("Approval required");
  await approval
    .getByRole("button", { name: "Review approval", exact: true })
    .click();
  await expect(await productReview(page)).toContainText("approve");
  await confirmProductReview(page);
  await expect(approval).toContainText("Completed");
  await expect(approval).toContainText(
    "approved and completed using local fixtures",
  );

  const history = panel(root, "Checkpoints and execution history");
  await history
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Product checkpoint E2E");
  await history
    .getByRole("textbox", { name: "Actor reference", exact: true })
    .fill("local-product-actor");
  await history
    .getByRole("button", { name: "Review checkpoint", exact: true })
    .click();
  await expect(await productReview(page)).toContainText(
    "Product checkpoint E2E",
  );
  await confirmProductReview(page);
  await expect(
    prepare.getByRole("textbox", {
      name: "Resume checkpoint ID (optional)",
      exact: true,
    }),
  ).toHaveValue("demo-checkpoint-1");
  await history
    .getByRole("button", { name: "Load checkpoints", exact: true })
    .click();
  await expect(
    history.getByText("Product checkpoint E2E", { exact: true }),
  ).toBeVisible();
});

test("connectors: selected resources, reviewed field mapping and a mapped issue persisted by the mock", async ({
  page,
}) => {
  await openDemo(page, "jira", "connectors");
  const root = product(page, "connectors");
  const preview = panel(root, "Source preview");
  const mapping = panel(root, "Field mapping");
  const destination = panel(root, "Create or update a destination record");
  await preview
    .getByRole("button", { name: "Load source preview", exact: true })
    .click();
  await expect(
    preview.getByRole("button", { name: "Use record", exact: true }),
  ).toHaveCount(2);
  await choose(
    page,
    mapping.getByRole("combobox", { name: "Source field 2", exact: true }),
    "amount",
  );
  await preview
    .getByRole("button", { name: "Use record", exact: true })
    .first()
    .click();
  await expect(
    destination.getByRole("textbox", { name: "Title", exact: true }),
  ).toHaveValue("Product workspace 1");
  await expect(
    destination.getByRole("textbox", {
      name: "Description or message",
      exact: true,
    }),
  ).toHaveValue("25");
  await mapping
    .getByRole("button", { name: "Review field mapping", exact: true })
    .click();
  await expect(await productReview(page)).toContainText("amount → description");
  await confirmProductReview(page);
  await expect(destination).toContainText("Demo field mapping saved.");
  await destination
    .getByRole("textbox", { name: "Title", exact: true })
    .fill("Mapped product issue E2E");
  await destination
    .getByRole("button", { name: "Review destination action", exact: true })
    .click();
  await expect(await productReview(page)).toContainText("25");
  await confirmProductReview(page);
  await expect(destination).toContainText("jira-new-26");
  await expect(destination).toContainText("Mapped product issue E2E");
  await expect(
    panel(destination, "Destination action result")
      .locator("p")
      .filter({ hasText: /^25$/ }),
  ).toBeVisible();
  await preview
    .getByRole("textbox", { name: "Search source…", exact: true })
    .fill("Mapped product issue E2E");
  // Once a preview exists, its controlled search automatically requeries.
  await expect(preview.getByRole("table")).toContainText(
    "Mapped product issue E2E",
  );
  await expect(preview.getByRole("table")).toContainText("25");
  await expect(
    preview.getByRole("button", { name: "Use record", exact: true }),
  ).toHaveCount(1);
  const savedRow = preview
    .getByRole("row")
    .filter({ hasText: "Mapped product issue E2E" });
  await expect(
    savedRow.getByRole("cell", { name: "25", exact: true }),
  ).toBeVisible();
  await expect(preview.getByRole("alert")).toHaveCount(0);
  await expect(
    preview.getByRole("textbox", { name: "Search source…", exact: true }),
  ).toHaveValue("Mapped product issue E2E");
});
