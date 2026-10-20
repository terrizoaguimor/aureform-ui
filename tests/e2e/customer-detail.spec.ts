import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import {
  parseSaasState,
  SAAS_STORAGE_KEY,
  type SaasDemoState,
} from "../../src/lib/saas";
import type { Customer } from "../../src/demo/dashboard-data";

const suppliedBaseURL = process.env.AUREFORM_BASE_URL;
const mount = (
  suppliedBaseURL
    ? new URL(suppliedBaseURL).pathname
    : (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
).replace(/\/+$/, "");
const mountedPath = (path: string) => `${mount}/${path.replace(/^\/+/, "")}`;

type Locale = "en" | "es";
const copy = {
  en: {
    customers: "Customers",
    addCustomer: "Add customer",
    name: "Full name",
    email: "Email",
    detailEmail: "Email address",
    company: "Company",
    amount: "Amount (USD)",
    edit: "Edit customer",
    save: "Save changes",
    cancel: "Cancel",
    summary: "Summary",
    activity: "Activity",
    notes: "Notes",
    files: "Files",
    related: "Related",
    addNote: "Add a note",
    submitNote: "Add note",
    attach: "Attach files",
    previewRole: "Preview role",
    viewer: "Viewer",
    back: "Back to customers",
    notFound: "Customer not found",
    minimumName: "Use at least two characters.",
    fileDescription: "This demo keeps file names and details in this browser.",
  },
  es: {
    customers: "Clientes",
    addCustomer: "Añadir cliente",
    name: "Nombre completo",
    email: "Correo",
    detailEmail: "Correo electrónico",
    company: "Empresa",
    amount: "Importe (USD)",
    edit: "Editar cliente",
    save: "Guardar cambios",
    cancel: "Cancelar",
    summary: "Resumen",
    activity: "Actividad",
    notes: "Notas",
    files: "Archivos",
    related: "Relacionados",
    addNote: "Añadir una nota",
    submitNote: "Añadir nota",
    attach: "Adjuntar archivos",
    previewRole: "Ver como",
    viewer: "Lector",
    back: "Volver a clientes",
    notFound: "Cliente no encontrado",
    minimumName: "Usa al menos dos caracteres.",
    fileDescription:
      "Esta demo conserva los nombres y detalles de los archivos en este navegador.",
  },
} as const;

const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const errors = runtimeErrors.get(page) ?? [];
  await testInfo.attach("browser-errors", {
    body: JSON.stringify(errors, null, 2),
    contentType: "application/json",
  });
  expect.soft(errors, "No browser errors or hydration exceptions").toEqual([]);
});

/** Inspect the real persisted payload without stripping unknown metadata fields. */
async function readState(page: Page): Promise<SaasDemoState> {
  const raw: unknown = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    SAAS_STORAGE_KEY,
  );
  expect(
    parseSaasState(raw),
    "The actual persisted SaaS state passes its schema",
  ).not.toBeNull();
  return raw as SaasDemoState;
}

async function ready(page: Page, locale: Locale = "en") {
  await expect(
    page.getByRole("combobox", { name: copy[locale].previewRole, exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => localStorage.getItem(key) !== null,
        SAAS_STORAGE_KEY,
      ),
    )
    .toBe(true);
}

async function openDetail(page: Page, id: string, locale: Locale = "en") {
  await page.goto(
    mountedPath(`/${locale}/customers/detail/?id=${encodeURIComponent(id)}`),
  );
  await ready(page, locale);
}

async function tab(page: Page, name: string): Promise<Locator> {
  const trigger = page.getByRole("tab", {
    name: new RegExp(`^${name}(?:\\s|\\d|$)`),
  });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-selected", "true");
  const panel = page.getByRole("tabpanel");
  await expect(panel).toBeVisible();
  return panel;
}

async function createCustomer(
  page: Page,
  name: string,
  email: string,
): Promise<Customer> {
  await page.goto(mountedPath("/en/customers/"));
  await ready(page);
  await page
    .getByRole("button", { name: copy.en.addCustomer, exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(copy.en.name, { exact: true }).fill(name);
  await dialog.getByLabel(copy.en.email, { exact: true }).fill(email);
  // Empty company is a valid CSV/foundation value and must remain editable.
  await dialog.getByLabel(copy.en.company, { exact: true }).fill("");
  await dialog
    .getByRole("button", { name: copy.en.addCustomer, exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect
    .poll(async () =>
      (await readState(page)).data.studio.customers.some(
        (item) => item.email === email,
      ),
    )
    .toBe(true);
  const record = (await readState(page)).data.studio.customers.find(
    (item) => item.email === email,
  );
  if (!record)
    throw new Error("The real creation callback did not persist the customer");
  return record;
}

async function addNote(page: Page, text: string, locale: Locale = "en") {
  const panel = await tab(page, copy[locale].notes);
  await panel.getByLabel(copy[locale].addNote, { exact: true }).fill(text);
  await panel
    .getByRole("button", { name: copy[locale].submitNote, exact: true })
    .click();
  await expect(panel.getByText(text, { exact: true })).toBeVisible();
  await expect(
    panel.getByLabel(copy[locale].addNote, { exact: true }),
  ).toHaveValue("");
}

async function attachMetadata(page: Page, name: string, locale: Locale = "en") {
  const panel = await tab(page, copy[locale].files);
  const contents = Buffer.from(
    "Synthetic customer-detail QA file. Metadata only.",
  );
  await panel.locator('input[type="file"]').setInputFiles({
    name,
    mimeType: "text/plain",
    buffer: contents,
  });
  await panel
    .getByRole("button", { name: copy[locale].attach, exact: true })
    .click();
  await expect
    .poll(async () => {
      const state = await readState(page);
      const id = new URL(page.url()).searchParams.get("id")!;
      return (state.data[state.activeWorkspaceId].files?.[id] ?? []).filter(
        (file) => file.name === name,
      ).length;
    })
    .toBe(1);
  await expect(panel.getByText(name, { exact: true })).toHaveCount(1);
  return { panel, contents };
}

async function switchWorkspace(page: Page, target: "studio" | "personal") {
  const before = await readState(page);
  const current = before.workspaces.find(
    (item) => item.id === before.activeWorkspaceId,
  )!;
  const next = before.workspaces.find((item) => item.id === target)!;
  await page.getByRole("button", { name: new RegExp(current.name) }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("menuitem", { name: next.name, exact: true }).click();
  await expect
    .poll(async () => (await readState(page)).activeWorkspaceId)
    .toBe(target);
}

async function assertMetadataHasNoActions(panel: Locator) {
  await expect(panel.locator("a")).toHaveCount(0);
  await expect(
    panel.getByRole("button", {
      name: /^(Open|Download|Abrir|Descargar)(?:\s|$)/,
    }),
  ).toHaveCount(0);
  await expect(
    panel.locator('[download], [href^="blob:"], [href^="data:"]'),
  ).toHaveCount(0);
}

async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function mobileTab(
  page: Page,
  testInfo: TestInfo,
  name: string,
  phase: string,
) {
  const trigger = page.getByRole("tab", {
    name: new RegExp(`^${name}(?:\\s|\\d|$)`),
  });
  const viewport = page.viewportSize();
  const bounds = await page.evaluate(() => ({
    innerWidth,
    clientWidth: document.documentElement.clientWidth,
    documentWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    ),
    detail: document
      .querySelector('[data-slot="record-detail"]')
      ?.getBoundingClientRect()
      .toJSON(),
    tabList: document
      .querySelector('[role="tablist"]')
      ?.getBoundingClientRect()
      .toJSON(),
  }));
  expect
    .soft(
      bounds.documentWidth,
      `No document overflow in ${phase}; compare against the configured viewport`,
    )
    .toBeLessThanOrEqual((viewport?.width ?? bounds.clientWidth) + 1);
  let pointerError: string | null = null;
  try {
    await trigger.click({ timeout: 4000 });
  } catch (cause) {
    pointerError = cause instanceof Error ? cause.message : String(cause);
  }
  await testInfo.attach(`mobile-interaction-${phase}`, {
    body: JSON.stringify(
      {
        viewport,
        bounds,
        tabBounds: await trigger.boundingBox(),
        pointerError,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(
    pointerError,
    `The ${name} tab requires a real successful tap`,
  ).toBeNull();
  await expect(trigger).toHaveAttribute("aria-selected", "true");
  const panel = page.getByRole("tabpanel");
  await expect(panel).toBeVisible();
  return panel;
}

async function axe(page: Page, testInfo: TestInfo, phase: string) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  await testInfo.attach(`axe-${phase}`, {
    body: JSON.stringify(
      {
        phase,
        url: page.url(),
        testEngine: result.testEngine,
        violations: result.violations,
        incomplete: result.incomplete,
        passes: result.passes.length,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect
    .soft(
      result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          failureSummary: node.failureSummary,
        })),
      })),
      `Full-page axe, ${phase}; no rule exclusions`,
    )
    .toEqual([]);
}

test("creation from the list opens and preserves the real customer ID", async ({
  page,
}, testInfo) => {
  const created = await createCustomer(
    page,
    "Detail QA Customer",
    "detail-create@aureform.demo",
  );
  expect(created.id).toMatch(/^customer-/);
  expect(created.company).toBe("");
  const marker = "customer-list-to-detail-document";
  await page.evaluate((value) => {
    Object.assign(window, { __qaDetailDocument: value });
  }, marker);
  const transport: Record<string, unknown>[] = [];
  const recordResponse = (response: import("@playwright/test").Response) => {
    if (
      response.request().headers().rsc ||
      response.request().isNavigationRequest()
    ) {
      transport.push({
        type: response.request().resourceType(),
        url: response.url(),
        status: response.status(),
        contentType: response.headers()["content-type"],
      });
    }
  };
  page.on("response", recordResponse);
  await page
    .locator("tbody")
    .getByRole("button", { name: created.name, exact: true })
    .click();
  await expect(page).toHaveURL(
    mountedPath(`/en/customers/detail/?id=${encodeURIComponent(created.id)}`),
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    created.name,
  );
  const documentMarker = await page.evaluate(
    () =>
      (window as unknown as Record<string, unknown>).__qaDetailDocument ?? null,
  );
  page.off("response", recordResponse);
  await testInfo.attach("list-to-detail-transport", {
    body: JSON.stringify(
      {
        requestedId: created.id,
        url: page.url(),
        expectedDocumentMarker: marker,
        documentMarker,
        sameDocument: documentMarker === marker,
        responses: transport,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(documentMarker, "List → detail preserves the document").toBe(marker);
  expect(transport.filter((response) => response.type === "document")).toEqual(
    [],
  );
  const summary = page.getByRole("tabpanel");
  await expect(summary.getByText(created.id, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: copy.en.back, exact: true }),
  ).toHaveAttribute("href", mountedPath("/en/customers/"));
  await screenshot(page, testInfo, "created-customer-detail");
  await page.reload();
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    created.name,
  );
  expect(
    (await readState(page)).data.studio.customers.find(
      (item) => item.id === created.id,
    ),
  ).toEqual(created);
  await page.getByRole("link", { name: copy.en.back, exact: true }).click();
  await expect(page).toHaveURL(mountedPath("/en/customers/"));
  await ready(page);
  await page
    .locator("tbody")
    .getByRole("button", { name: created.name, exact: true })
    .click();
  await expect(page).toHaveURL(
    mountedPath(`/en/customers/detail/?id=${encodeURIComponent(created.id)}`),
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    created.name,
  );
});

test("validation and a real duplicate callback exception preserve draft, focus and identity", async ({
  page,
}, testInfo) => {
  const created = await createCustomer(
    page,
    "Detail QA Draft",
    "detail-draft@aureform.demo",
  );
  await openDetail(page, created.id);
  const before = await readState(page);
  const other = before.data.studio.customers.find(
    (item) => item.id !== created.id,
  )!;
  await page.getByRole("button", { name: copy.en.edit, exact: true }).click();
  const name = page.getByLabel(copy.en.name, { exact: true });
  const email = page.getByLabel(copy.en.detailEmail, { exact: true });
  const amount = page.getByLabel(copy.en.amount, { exact: true });
  await expect(name).toBeFocused();
  await name.fill("O");
  await email.fill("invalid");
  await amount.fill("-1");
  await page.getByRole("button", { name: copy.en.save, exact: true }).click();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(amount).toHaveAttribute("aria-invalid", "true");
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("O");
  expect((await readState(page)).data.studio).toEqual(before.data.studio);

  const draftName = "Detail QA Preserved Draft";
  await name.fill(draftName);
  await email.fill(`  ${other.email.toUpperCase()}  `);
  await amount.fill("312.75");
  const save = page.getByRole("button", { name: copy.en.save, exact: true });
  await save.click();
  const serverError = page
    .getByRole("alert")
    .filter({ hasText: "That email or workspace identifier already exists." });
  await expect(serverError).toBeVisible();
  await expect(name).toHaveValue(draftName);
  // Chromium's native email input sanitizes surrounding ASCII whitespace.
  await expect(email).toHaveValue(other.email.toUpperCase());
  await expect(amount).toHaveValue("312.75");
  await expect(save).toBeFocused();
  expect((await readState(page)).data.studio).toEqual(before.data.studio);
  await tab(page, copy.en.notes);
  await tab(page, copy.en.summary);
  await expect(name).toHaveValue(draftName);
  await expect(serverError).toBeVisible();
  await screenshot(page, testInfo, "duplicate-error-preserved-draft");

  await email.fill("detail-recovered@aureform.demo");
  await save.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(draftName);
  await expect(
    page.getByRole("button", { name: copy.en.edit, exact: true }),
  ).toBeFocused();
  const after = await readState(page);
  const updated = after.data.studio.customers.find(
    (item) => item.id === created.id,
  )!;
  expect(updated).toEqual({
    ...created,
    name: draftName,
    email: "detail-recovered@aureform.demo",
    amount: 312.75,
  });
  expect(
    after.data.studio.activity.filter(
      (item) =>
        item.resourceId === created.id && /Customer updated/.test(item.detail),
    ),
  ).toHaveLength(1);
  await page.reload();
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(draftName);
  await page.getByRole("button", { name: copy.en.edit, exact: true }).click();
  await name.fill("A cancelled change");
  await page.getByRole("button", { name: copy.en.cancel, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(draftName);
  expect(
    (await readState(page)).data.studio.customers.find(
      (item) => item.id === created.id,
    ),
  ).toEqual(updated);
});

test("notes survive tab changes and reload, with one scoped activity per callback", async ({
  page,
}, testInfo) => {
  await openDetail(page, "cus-001");
  const before = await readState(page);
  const text = "QA persistent note\nA second line of customer context.";
  let panel = await tab(page, copy.en.notes);
  await panel.getByLabel(copy.en.addNote, { exact: true }).fill(text);
  await tab(page, copy.en.activity);
  panel = await tab(page, copy.en.notes);
  await expect(panel.getByLabel(copy.en.addNote, { exact: true })).toHaveValue(
    text,
  );
  await panel
    .getByRole("button", { name: copy.en.submitNote, exact: true })
    .click();
  await expect(panel.getByText(text, { exact: true })).toBeVisible();
  await expect(
    panel.getByLabel(copy.en.addNote, { exact: true }),
  ).toBeFocused();
  const after = await readState(page);
  const notes = after.data.studio.notes["cus-001"].filter(
    (note) => note.text === text,
  );
  expect(notes).toHaveLength(1);
  expect(notes[0].author).toBe(
    after.data.studio.members.find(
      (member) => member.id === after.currentMemberId,
    )!.name,
  );
  expect(Number.isFinite(Date.parse(notes[0].createdAt))).toBe(true);
  expect(
    after.data.studio.activity.filter(
      (item) => item.resourceId === "cus-001" && item.kind === "note",
    ),
  ).toHaveLength(
    before.data.studio.activity.filter(
      (item) => item.resourceId === "cus-001" && item.kind === "note",
    ).length + 1,
  );
  expect(after.data.personal).toEqual(before.data.personal);
  await screenshot(page, testInfo, "notes-persisted");
  await page.reload();
  await ready(page);
  panel = await tab(page, copy.en.notes);
  await expect(panel.getByText(text, { exact: true })).toBeVisible();
  const activity = await tab(page, copy.en.activity);
  await expect(
    activity.getByText("Note added", { exact: true }).first(),
  ).toBeVisible();
  await openDetail(page, "cus-002");
  await expect(
    (await tab(page, copy.en.notes)).getByText(text, { exact: true }),
  ).toHaveCount(0);
  await expect(
    (await tab(page, copy.en.activity)).getByText("Note added", {
      exact: true,
    }),
  ).toHaveCount(0);
});

test("attached metadata survives reload without binary data, URLs or fake downloads", async ({
  page,
}, testInfo) => {
  await openDetail(page, "cus-001");
  const downloads: string[] = [];
  page.on("download", (download) =>
    downloads.push(download.suggestedFilename()),
  );
  const { panel, contents } = await attachMetadata(page, "detail-proof.txt");
  await expect(
    panel.getByText(copy.en.fileDescription, { exact: true }),
  ).toBeVisible();
  const state = await readState(page);
  const attachment = state.data.studio.files!["cus-001"][0];
  expect(Object.keys(attachment).sort()).toEqual([
    "createdAt",
    "id",
    "name",
    "size",
    "type",
  ]);
  expect(attachment).toMatchObject({
    name: "detail-proof.txt",
    size: contents.length,
    type: "text/plain",
  });
  expect(Number.isFinite(Date.parse(attachment.createdAt))).toBe(true);
  await assertMetadataHasNoActions(panel);
  await expect(panel.getByText("text/plain", { exact: true })).toBeVisible();
  expect(downloads).toEqual([]);
  await screenshot(page, testInfo, "file-metadata-only");
  await page.reload();
  await ready(page);
  const reloaded = await tab(page, copy.en.files);
  await expect(
    reloaded.getByText("detail-proof.txt", { exact: true }),
  ).toBeVisible();
  await assertMetadataHasNoActions(reloaded);
  expect((await readState(page)).data.studio.files!["cus-001"]).toEqual([
    attachment,
  ]);
  await openDetail(page, "cus-002");
  await expect(
    (await tab(page, copy.en.files)).getByText("detail-proof.txt", {
      exact: true,
    }),
  ).toHaveCount(0);
  expect(downloads).toEqual([]);
});

test("a customer ID from another workspace is not found and cannot leak notes or files", async ({
  page,
}, testInfo) => {
  await openDetail(page, "cus-001");
  const initialPersonal = (await readState(page)).data.personal;
  const privateNote = "QA studio-only customer context";
  await addNote(page, privateNote);
  await attachMetadata(page, "studio-only-proof.txt");
  const studio = (await readState(page)).data.studio;
  await switchWorkspace(page, "personal");
  await expect(page).toHaveURL(mountedPath("/en/customers/detail/?id=cus-001"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy.en.notFound,
  );
  await expect(page.getByText(privateNote, { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("studio-only-proof.txt", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: copy.en.edit, exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  expect((await readState(page)).data.personal).toEqual(initialPersonal);
  await screenshot(page, testInfo, "wrong-workspace-not-found");
  await page.reload();
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy.en.notFound,
  );
  expect((await readState(page)).activeWorkspaceId).toBe("personal");
  await page.getByRole("link", { name: copy.en.back, exact: true }).click();
  await expect(page).toHaveURL(mountedPath("/en/customers/"));
  await ready(page);
  await expect(
    page
      .locator("tbody")
      .getByRole("button", { name: "Olivia Rhye", exact: true }),
  ).toHaveCount(0);
  await switchWorkspace(page, "studio");
  await openDetail(page, "cus-001");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Olivia Rhye",
  );
  await expect(
    (await tab(page, copy.en.notes)).getByText(privateNote, { exact: true }),
  ).toBeVisible();
  await expect(
    (await tab(page, copy.en.files)).getByText("studio-only-proof.txt", {
      exact: true,
    }),
  ).toBeVisible();
  expect((await readState(page)).data.studio).toEqual(studio);
});

test("viewer role persists across navigation and reload without mutation controls", async ({
  page,
}, testInfo) => {
  await openDetail(page, "cus-001");
  await addNote(page, "QA context visible to viewers");
  await attachMetadata(page, "viewer-visible-metadata.txt");
  await page
    .getByRole("combobox", { name: copy.en.previewRole, exact: true })
    .click();
  await page.getByRole("option", { name: copy.en.viewer, exact: true }).click();
  await expect
    .poll(async () => (await readState(page)).previewRole)
    .toBe("viewer");
  const before = (await readState(page)).data.studio;
  await expect(
    page.getByRole("button", { name: copy.en.edit, exact: true }),
  ).toHaveCount(0);
  let panel = await tab(page, copy.en.notes);
  await expect(
    panel.getByText("QA context visible to viewers", { exact: true }),
  ).toBeVisible();
  await expect(panel.getByLabel(copy.en.addNote, { exact: true })).toHaveCount(
    0,
  );
  await expect(
    panel.getByRole("button", { name: copy.en.submitNote, exact: true }),
  ).toHaveCount(0);
  panel = await tab(page, copy.en.files);
  await expect(
    panel.getByText("viewer-visible-metadata.txt", { exact: true }),
  ).toBeVisible();
  await expect(panel.locator('input[type="file"]')).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: /Choose files|Attach files/ }),
  ).toHaveCount(0);
  await assertMetadataHasNoActions(panel);
  await screenshot(page, testInfo, "viewer-files-read-only");
  await page.getByRole("link", { name: copy.en.back, exact: true }).click();
  await expect(page).toHaveURL(mountedPath("/en/customers/"));
  await ready(page);
  await expect(
    page.getByRole("button", { name: copy.en.addCustomer, exact: true }),
  ).toHaveCount(0);
  expect((await readState(page)).previewRole).toBe("viewer");
  await page.reload();
  await ready(page);
  expect((await readState(page)).previewRole).toBe("viewer");
  await page
    .locator("tbody")
    .getByRole("button", { name: "Olivia Rhye", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Olivia Rhye",
  );
  await expect(
    page.getByRole("button", { name: copy.en.edit, exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("button", { name: copy.en.edit, exact: true }),
  ).toHaveCount(0);
  panel = await tab(page, copy.en.notes);
  await expect(panel.getByLabel(copy.en.addNote, { exact: true })).toHaveCount(
    0,
  );
  panel = await tab(page, copy.en.files);
  await expect(panel.locator('input[type="file"]')).toHaveCount(0);
  expect((await readState(page)).data.studio).toEqual(before);
});

test("a validated persisted workspace mismatch renders not-found without disclosing the source record", async ({
  page,
}, testInfo) => {
  await openDetail(page, "cus-001");
  await addNote(page, "QA origin workspace note");
  await attachMetadata(page, "origin-workspace-only.txt");
  const before = await readState(page);
  const fixture = { ...before, activeWorkspaceId: "personal" };
  expect(parseSaasState(fixture)).not.toBeNull();
  // A real persistence fixture for the provider's initial read; this is separate
  // from, and cannot establish a pass for, the workspace picker's pointer flow.
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: SAAS_STORAGE_KEY, state: fixture },
  );
  await page.reload();
  await ready(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy.en.notFound,
  );
  await expect(
    page.getByText("QA origin workspace note", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("origin-workspace-only.txt", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: copy.en.edit, exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  const after = await readState(page);
  expect(after.activeWorkspaceId).toBe("personal");
  expect(after.data.personal).toEqual(before.data.personal);
  expect(after.data.studio).toEqual(before.data.studio);
  await screenshot(page, testInfo, "persisted-wrong-workspace-not-found");
  await page.getByRole("link", { name: copy.en.back, exact: true }).click();
  await expect(page).toHaveURL(mountedPath("/en/customers/"));
  await ready(page);
  await expect(
    page
      .locator("tbody")
      .getByRole("button", { name: "Olivia Rhye", exact: true }),
  ).toHaveCount(0);
});

/**
 * Test-only access to the real mounted AppRouterContext. Next's production build
 * does not expose the development window.nd.router. No product code is patched.
 */
async function routerNavigate(
  page: Page,
  href: string,
  method: "push" | "replace",
) {
  await page.evaluate(
    ({ href, method }) => {
      type Fiber = { memoizedProps?: { value?: unknown }; return?: Fiber };
      const heading = document.querySelector("h1");
      if (!heading) throw new Error("No heading to locate the mounted router");
      const property = Object.keys(heading).find((key) =>
        key.startsWith("__reactFiber$"),
      );
      if (!property)
        throw new Error("React fiber instrumentation is unavailable");
      let fiber = (heading as unknown as Record<string, unknown>)[property] as
        Fiber | undefined;
      for (let depth = 0; fiber && depth < 150; depth++, fiber = fiber.return) {
        const value = fiber.memoizedProps?.value;
        if (typeof value !== "object" || value === null) continue;
        const candidate = value as Record<string, unknown>;
        if (
          typeof candidate.push === "function" &&
          typeof candidate.replace === "function" &&
          typeof candidate.back === "function" &&
          typeof candidate.prefetch === "function"
        ) {
          (candidate[method] as (url: string) => void)(href);
          return;
        }
      }
      throw new Error("The actual AppRouterContext instance was not found");
    },
    { href, method },
  );
}

test("actual Next router push and replace resolve the requested ID and preserve the document", async ({
  page,
}, testInfo) => {
  await openDetail(page, "cus-001");
  const records = (await readState(page)).data.studio.customers;
  const evidence: Record<string, unknown>[] = [];
  const responses: Record<string, unknown>[] = [];
  page.on("response", (response) => {
    if (
      response.request().headers().rsc ||
      response.request().isNavigationRequest()
    ) {
      responses.push({
        type: response.request().resourceType(),
        url: response.url(),
        status: response.status(),
        contentType: response.headers()["content-type"],
      });
    }
  });
  for (const [method, id] of [
    ["push", "cus-002"],
    ["replace", "cus-003"],
  ] as const) {
    const marker = `detail-${method}-document`;
    await page.evaluate((value) => {
      Object.assign(window, { __qaDetailDocument: value });
    }, marker);
    // Next's router adds basePath; browser navigation and native history do not.
    await routerNavigate(page, `/en/customers/detail/?id=${id}`, method);
    await expect(page).toHaveURL(mountedPath(`/en/customers/detail/?id=${id}`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      records.find((item) => item.id === id)!.name,
    );
    const actual = await page.evaluate(() => ({
      url: location.href,
      heading: document.querySelector("h1")?.textContent,
      documentMarker:
        (window as unknown as Record<string, unknown>).__qaDetailDocument ??
        null,
    }));
    evidence.push({
      method,
      requestedId: id,
      ...actual,
      sameDocument: actual.documentMarker === marker,
    });
    expect
      .soft(actual.documentMarker, `${method} preserves the document`)
      .toBe(marker);
  }
  await testInfo.attach("next-router-transport", {
    body: JSON.stringify({ evidence, responses }, null, 2),
    contentType: "application/json",
  });
  expect(evidence).toHaveLength(2);
  expect(responses.filter((response) => response.type === "document")).toEqual(
    [],
  );
});

test("same-document pushState and replaceState must refresh ID without an artificial popstate", async ({
  page,
}, testInfo) => {
  await openDetail(page, "cus-001");
  const records = (await readState(page)).data.studio.customers;
  await page.evaluate(() =>
    Object.assign(window, { __qaDetailDocument: "native-history-document" }),
  );
  const evidence = [];
  for (const [method, id] of [
    ["pushState", "cus-002"],
    ["replaceState", "cus-003"],
  ] as const) {
    await page.evaluate(
      ({ method, href }) =>
        window.history[method](
          // Use the public API with fresh state. Passing Next's internal __NA
          // deliberately bypasses its useSearchParams synchronization.
          null,
          "",
          href,
        ),
      { method, href: mountedPath(`/en/customers/detail/?id=${id}`) },
    );
    await expect(page).toHaveURL(mountedPath(`/en/customers/detail/?id=${id}`));
    const expectedName = records.find((item) => item.id === id)!.name;
    await expect
      .soft(
        page.getByRole("heading", { level: 1 }),
        `${method} must render ${id}`,
      )
      .toHaveText(expectedName, { timeout: 4000 });
    const actual = await page.evaluate(() => ({
      url: location.href,
      heading: document.querySelector("h1")?.textContent,
      documentMarker:
        (window as unknown as Record<string, unknown>).__qaDetailDocument ??
        null,
    }));
    evidence.push({ method, id, expectedName, ...actual });
    expect.soft(actual.documentMarker).toBe("native-history-document");
  }
  await testInfo.attach("native-history-id-refresh", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
  await screenshot(page, testInfo, "native-history-after-push-replace");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    records.find((item) => item.id === "cus-001")!.name,
  );
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    records.find((item) => item.id === "cus-003")!.name,
  );
});

test.describe("EN/ES mobile detail accessibility", () => {
  test.use({
    viewport: { width: 360, height: 900 },
    isMobile: true,
    hasTouch: true,
  });

  for (const locale of ["en", "es"] as const) {
    for (const theme of ["dark", "light"] as const) {
      test(`${locale} ${theme}: five tabs, editing, validation and not-found pass axe and reflow`, async ({
        page,
      }, testInfo) => {
        test.setTimeout(120000);
        const labels = copy[locale];
        await openDetail(page, "cus-001", locale);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          "Olivia Rhye",
        );
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        const dark = await page
          .locator("html")
          .evaluate((element) => element.classList.contains("dark"));
        if (dark !== (theme === "dark")) {
          await page
            .getByRole("button", { name: /color theme|tema de color/i })
            .click();
        }
        if (theme === "dark")
          await expect(page.locator("html")).toHaveClass(/dark/);
        else await expect(page.locator("html")).not.toHaveClass(/dark/);
        await screenshot(page, testInfo, `detail-${locale}-${theme}-mobile`);
        for (const name of [
          labels.summary,
          labels.activity,
          labels.notes,
          labels.files,
          labels.related,
        ]) {
          const panel = await mobileTab(
            page,
            testInfo,
            name,
            `${locale}-${theme}-${name}`,
          );
          if (name === labels.files) {
            await expect(
              panel.getByText(labels.fileDescription, { exact: true }),
            ).toBeVisible();
          }
          if (name === labels.activity) {
            await expect(
              panel
                .getByText(locale === "en" ? "Note added" : "Nota añadida", {
                  exact: true,
                })
                .first(),
            ).toBeVisible();
          }
          await axe(page, testInfo, `${locale}-${theme}-${name}`);
        }
        await tab(page, labels.summary);
        await page
          .getByRole("button", { name: labels.edit, exact: true })
          .click();
        await expect(
          page.getByLabel(labels.name, { exact: true }),
        ).toBeFocused();
        await expect(
          page.getByRole("combobox", { name: "Plan", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("combobox", {
            name: locale === "en" ? "Status" : "Estado",
            exact: true,
          }),
        ).toBeVisible();
        await axe(page, testInfo, `${locale}-${theme}-editor`);
        await page.getByLabel(labels.name, { exact: true }).fill("O");
        await page
          .getByRole("button", { name: labels.save, exact: true })
          .click();
        await expect(
          page.getByRole("alert").filter({ hasText: labels.minimumName }),
        ).toBeVisible();
        await expect(
          page.getByLabel(labels.name, { exact: true }),
        ).toBeFocused();
        await axe(page, testInfo, `${locale}-${theme}-validation`);
        await page
          .getByRole("button", { name: labels.cancel, exact: true })
          .click();
        await openDetail(page, "missing-qa-customer", locale);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(
          labels.notFound,
        );
        await expect(
          page.getByRole("link", { name: labels.back, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: labels.edit, exact: true }),
        ).toHaveCount(0);
        await axe(page, testInfo, `${locale}-${theme}-not-found`);
      });
    }
  }
});
