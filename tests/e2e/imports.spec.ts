import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { SAAS_STORAGE_KEY } from "../../src/lib/saas";
import type { Customer } from "../../src/demo/dashboard-data";

// The shared saas-chromium project supplies baseURL. Set AUREFORM_BASE_URL to
// reuse an existing server; normal CI inherits the config's server on port 3001.
test.use({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
  launchOptions: {
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      (existsSync("/usr/bin/chromium-browser")
        ? "/usr/bin/chromium-browser"
        : undefined),
    args: ["--no-sandbox"],
  },
});
test.setTimeout(45_000);

const sha256 = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");
const pinnedFiles = [
  "src/lib/csv-import.ts",
  "src/components/blocks/import-wizard.tsx",
  "src/components/templates/customer-import.tsx",
  "src/lib/saas.ts",
  "src/demo/dashboard-data.ts",
  "src/components/workspace-provider.tsx",
  "src/components/appearance-provider.tsx",
  "src/lib/appearance.ts",
  "src/components/ui/table.tsx",
  "src/components/ui/select.tsx",
  "src/app/globals.css",
  "scripts/preview.mjs",
  ".next/BUILD_ID",
  ".next/build-manifest.json",
  ".next/server/app-paths-manifest.json",
  "out/en/imports/index.html",
  "out/es/imports/index.html",
  "out/en/imports/index.txt",
  "out/es/imports/index.txt",
];
async function snapshotBuild(baseURL: string) {
  const files = await Promise.all(
    pinnedFiles.map(async (path) => {
      const content = await readFile(path);
      return { path, bytes: content.length, sha256: sha256(content) };
    }),
  );
  const assetPaths = new Set<string>();
  const routes = await Promise.all(
    ["/en/imports/", "/es/imports/"].map(async (path) => {
      const response = await fetch(new URL(path, baseURL), {
        signal: AbortSignal.timeout(15_000),
      });
      expect(response.status, path).toBe(200);
      expect(response.headers.get("content-type"), path).toContain("text/html");
      const content = Buffer.from(await response.arrayBuffer());
      const exported = await readFile(`out${path}index.html`);
      expect(sha256(content), `served/exported HTML ${path}`).toBe(
        sha256(exported),
      );
      for (const match of content
        .toString("utf8")
        .matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)) {
        if (match[1].startsWith("/_next/")) assetPaths.add(match[1]);
      }
      return {
        path,
        status: response.status,
        contentType: response.headers.get("content-type"),
        bytes: content.length,
        sha256: sha256(content),
      };
    }),
  );
  const assets = await Promise.all(
    [...assetPaths].sort().map(async (path) => {
      const response = await fetch(new URL(path, baseURL), {
        signal: AbortSignal.timeout(15_000),
      });
      expect(response.status, path).toBe(200);
      const content = Buffer.from(await response.arrayBuffer());
      const exported = await readFile(`out${new URL(path, baseURL).pathname}`);
      expect(sha256(content), `served/exported asset ${path}`).toBe(
        sha256(exported),
      );
      return {
        path,
        bytes: content.length,
        sha256: sha256(content),
        contentType: response.headers.get("content-type"),
      };
    }),
  );
  const rsc = await Promise.all(
    ["/en/imports/index.txt", "/es/imports/index.txt"].map(async (path) => {
      const response = await fetch(new URL(path, baseURL), {
        signal: AbortSignal.timeout(15_000),
      });
      expect(response.status, path).toBe(200);
      expect(response.headers.get("content-type"), path).toContain(
        "text/plain",
      );
      const content = Buffer.from(await response.arrayBuffer());
      expect(sha256(content), `served/exported RSC ${path}`).toBe(
        sha256(await readFile(`out${path}`)),
      );
      return {
        path,
        bytes: content.length,
        sha256: sha256(content),
        contentType: response.headers.get("content-type"),
      };
    }),
  );
  return {
    baseURL,
    buildId: (await readFile(".next/BUILD_ID", "utf8")).trim(),
    files,
    routes,
    assets,
    rsc,
  };
}
let buildAtStart: Awaited<ReturnType<typeof snapshotBuild>>;
test.beforeAll(async ({}, info) => {
  const baseURL = info.project.use.baseURL;
  if (typeof baseURL !== "string")
    throw new Error(
      "Run imports with the shared saas-chromium project, which supplies baseURL.",
    );
  buildAtStart = await snapshotBuild(baseURL);
  await mkdir(info.project.outputDir, { recursive: true });
  await writeFile(
    join(info.project.outputDir, "imports-source-build-start.json"),
    JSON.stringify(
      { capturedAt: new Date().toISOString(), ...buildAtStart },
      null,
      2,
    ),
  );
});
test.afterAll(async ({}, info) => {
  if (!buildAtStart) return;
  const buildAtEnd = await snapshotBuild(buildAtStart.baseURL);
  await writeFile(
    join(info.project.outputDir, "imports-source-build-end.json"),
    JSON.stringify(
      { capturedAt: new Date().toISOString(), ...buildAtEnd },
      null,
      2,
    ),
  );
  expect(buildAtEnd, "imports source and served build stayed pinned").toEqual(
    buildAtStart,
  );
});

const headings = [
  "name",
  "email",
  "company",
  "plan",
  "status",
  "amount",
  "joined",
];
type InputRow = {
  name: string;
  email: string;
  company: string;
  plan: string;
  status: string;
  amount: number | string;
  joined: string;
};
const row = (
  name: string,
  email: string,
  overrides: Partial<InputRow> = {},
): InputRow => ({
  name,
  email,
  company: "QA Studio",
  plan: "Pro",
  status: "active",
  amount: 249,
  joined: "2026-10-19",
  ...overrides,
});
function csv(rows: readonly InputRow[], columns = headings) {
  const quote = (value: unknown) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    columns.map(quote).join(","),
    ...rows.map((record) =>
      headings.map((key) => quote(record[key as keyof InputRow])).join(","),
    ),
  ].join("\r\n");
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydrat|nested.*button|<button>|validateDOMNesting/i.test(message.text())
    )
      collected.push(message.text());
  });
});
test.afterEach(async ({ page }, info) => {
  const collected = errors.get(page) ?? [];
  const runtimeReport = info.outputPath("runtime-errors.json");
  await writeFile(
    runtimeReport,
    JSON.stringify(
      {
        title: info.titlePath,
        status: info.status,
        durationMs: info.duration,
        viewport: page.viewportSize(),
        errors: collected,
      },
      null,
      2,
    ),
  );
  await info.attach("uncaught-hydration-nesting-errors", {
    path: runtimeReport,
    contentType: "application/json",
  });
  if (info.status !== info.expectedStatus) {
    await page.screenshot({
      path: info.outputPath("failure.png"),
      fullPage: true,
    });
  }
  if (info.status === info.expectedStatus) expect(collected).toEqual([]);
});

async function open(page: Page, locale: "en" | "es" = "en") {
  await page.goto(`/${locale}/imports/`);
  const wizard = page.locator('[data-slot="import-wizard"]');
  await expect(wizard).toBeVisible();
  await page.waitForFunction(
    (key) => localStorage.getItem(key) !== null,
    SAAS_STORAGE_KEY,
  );
  return wizard;
}
async function customers(page: Page): Promise<Customer[]> {
  return page.evaluate((key) => {
    const text = localStorage.getItem(key);
    if (!text) throw new Error("The demo workspace has not been initialized");
    const state = JSON.parse(text);
    return state.data[state.activeWorkspaceId].customers;
  }, SAAS_STORAGE_KEY);
}
async function upload(
  wizard: Locator,
  text: string,
  filename = "customers.csv",
) {
  await wizard.locator('input[type="file"]').setInputFiles({
    name: filename,
    mimeType: "text/csv",
    buffer: Buffer.from(text, "utf8"),
  });
}
async function choose(
  page: Page,
  wizard: Locator,
  label: string | RegExp,
  option: string,
) {
  await wizard.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function preview(wizard: Locator, text: string) {
  await upload(wizard, text);
  await expect(wizard.getByText("File ready", { exact: true })).toBeVisible();
  await wizard.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    wizard.getByRole("heading", { name: "Map fields", exact: true }),
  ).toBeVisible();
  await wizard.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    wizard.getByRole("heading", { name: "Preview", exact: true }),
  ).toBeVisible();
}
async function review(wizard: Locator) {
  await wizard.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    wizard.getByRole("heading", { name: "Review", exact: true }),
  ).toBeVisible();
}
async function count(wizard: Locator, label: string, value: number) {
  await expect(
    wizard.getByText(label, { exact: true }).locator("..").locator("dd"),
  ).toHaveText(value.toLocaleString("en"));
}

test("download, manual mapping and quoted multiline preview remain local until confirmation", async ({
  page,
}, info) => {
  const wizard = await open(page);
  const original = await customers(page);
  const downloading = page.waitForEvent("download");
  await wizard
    .getByRole("button", { name: "Download sample", exact: true })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("aureform-customers.csv");
  const stream = await download.createReadStream();
  if (!stream) throw new Error("Sample download has no stream");
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const sample = Buffer.concat(chunks).toString("utf8");
  expect(sample.split("\r\n")[0]).toBe(
    '"name","email","company","plan","status","amount","joined"',
  );
  expect(sample).toContain("Alex Rivera");

  const company = 'A "quoted" company\r\nSecond line';
  const input = row("QA, Native Name", "Native.Case@example.test", { company });
  await upload(
    wizard,
    `\uFEFF${csv([input], ["who", "contact", ...headings.slice(2)])}`,
    "mapped.csv",
  );
  await expect(wizard.getByText("File ready", { exact: true })).toBeVisible();
  await wizard.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    wizard.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await choose(page, wizard, /^Name/, "who");
  await choose(page, wizard, /^Email/, "contact");
  await wizard.getByRole("button", { name: "Continue", exact: true }).click();
  const table = wizard.getByRole("table", { name: "CSV preview" });
  await expect(table).toContainText("QA, Native Name");
  await expect(table).toContainText("Native.Case@example.test");
  await expect(
    table.locator("tbody tr").first().locator("td").nth(3).locator("span"),
  ).toHaveAttribute("title", company);
  expect(await customers(page)).toEqual(original);
  expect(await wizard.locator("button button").count()).toBe(0);
  const accessibility = await new AxeBuilder({ page })
    .include('[data-slot="import-wizard"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  const previewScreenshot = info.outputPath("imports-preview.png");
  await page.screenshot({ path: previewScreenshot, fullPage: true });
  await info.attach("imports-preview", {
    path: previewScreenshot,
    contentType: "image/png",
  });
  await review(wizard);
  await wizard
    .getByRole("button", { name: "Import 1 records", exact: true })
    .click();
  await expect(
    wizard.getByRole("heading", { name: "Import complete", exact: true }),
  ).toBeVisible();
  await count(wizard, "Created", 1);
  await count(wizard, "Failed", 0);
  await expect
    .poll(
      async () =>
        (await customers(page)).find(
          (customer) => customer.email === input.email,
        )?.name,
    )
    .toBe(input.name);
});

test("skip and update apply real duplicate policies and preserve existing ids", async ({
  page,
}, info) => {
  let wizard = await open(page);
  const original = await customers(page);
  const existing = original[0];
  const newEmail = "duplicate-new@example.test";
  await preview(
    wizard,
    csv([
      row("Should not replace existing", existing.email.toUpperCase()),
      row("First valid occurrence", newEmail),
      row("Last valid occurrence", newEmail.toUpperCase()),
      row("Q", "invalid-name@example.test"),
    ]),
  );
  await expect(
    wizard.getByText("Name must contain 2–120 characters.", { exact: true }),
  ).toBeVisible();
  await expect(
    wizard.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await wizard
    .getByRole("checkbox", { name: "Skip the 1 invalid records", exact: true })
    .check();
  await review(wizard);
  await count(wizard, "Skipped", 3);
  const reviewScreenshot = info.outputPath("imports-review.png");
  await page.screenshot({ path: reviewScreenshot, fullPage: true });
  await info.attach("imports-review", {
    path: reviewScreenshot,
    contentType: "image/png",
  });
  await wizard
    .getByRole("button", { name: "Import 1 records", exact: true })
    .click();
  await expect(
    wizard.getByRole("heading", { name: "Import complete", exact: true }),
  ).toBeVisible();
  await count(wizard, "Created", 1);
  await count(wizard, "Skipped", 3);
  await expect
    .poll(async () => (await customers(page)).length)
    .toBe(original.length + 1);
  const afterSkip = await customers(page);
  expect(afterSkip.find((customer) => customer.id === existing.id)).toEqual(
    existing,
  );
  const added = afterSkip.find((customer) => customer.email === newEmail);
  expect(added?.name).toBe("First valid occurrence");
  expect(
    afterSkip.filter((customer) => customer.email.toLowerCase() === newEmail),
  ).toHaveLength(1);

  await page.reload();
  wizard = page.locator('[data-slot="import-wizard"]');
  await expect(wizard).toBeVisible();
  await preview(
    wizard,
    csv([
      row("Existing updated", existing.email.toUpperCase(), {
        plan: "Enterprise",
        amount: 850,
      }),
      row("New earlier update", newEmail, { company: "Earlier" }),
      row("New final update", newEmail.toUpperCase(), { company: "Final" }),
    ]),
  );
  await choose(page, wizard, "Duplicate records", "Update duplicates");
  await count(wizard, "Update", 2);
  await count(wizard, "Skipped", 1);
  await review(wizard);
  await wizard
    .getByRole("button", { name: "Import 2 records", exact: true })
    .click();
  await expect(
    wizard.getByRole("heading", { name: "Import complete", exact: true }),
  ).toBeVisible();
  await count(wizard, "Created", 0);
  await count(wizard, "Updated", 2);
  await count(wizard, "Skipped", 1);
  await expect
    .poll(
      async () =>
        (await customers(page)).find((customer) => customer.id === existing.id)
          ?.name,
    )
    .toBe("Existing updated");
  const afterUpdate = await customers(page);
  expect(afterUpdate).toHaveLength(original.length + 1);
  expect(
    afterUpdate.find((customer) => customer.id === existing.id)?.email,
  ).toBe(existing.email.toUpperCase());
  expect(afterUpdate.find((customer) => customer.id === added?.id)?.name).toBe(
    "New final update",
  );
  expect(
    afterUpdate.find((customer) => customer.id === added?.id)?.company,
  ).toBe("Final");
});

test("grammar errors and reserved headings discard any earlier draft without writing data", async ({
  page,
}) => {
  const wizard = await open(page);
  const original = await customers(page);
  await upload(wizard, csv([row("Earlier draft", "earlier@example.test")]));
  await expect(
    wizard.getByRole("button", { name: "Continue", exact: true }),
  ).toBeEnabled();
  for (const [text, message] of [
    ['name,email\n"Unclosed', /missing its closing quote/],
    ["name,name\nAlex,alex@example.test", /headings must be unique/],
    ["name,,email\nAlex,x,alex@example.test", /nonblank heading/],
    [
      "__proto__,email\nAlex,alex@example.test",
      /reserved and cannot be imported/,
    ],
  ] as const) {
    await upload(wizard, text, "invalid.csv");
    await expect(wizard.getByRole("alert")).toContainText(message);
    await expect(
      wizard.getByRole("button", { name: "Continue", exact: true }),
    ).toBeDisabled();
    expect(await customers(page)).toEqual(original);
  }
  await upload(wizard, csv([row("Fresh replacement", "fresh@example.test")]));
  await expect(wizard.getByRole("alert")).toHaveCount(0);
  await expect(
    wizard.getByRole("button", { name: "Continue", exact: true }),
  ).toBeEnabled();
});

test("file and record limits report actionable errors before mapping", async ({
  page,
}) => {
  const wizard = await open(page);
  const original = await customers(page);
  await wizard.locator('input[type="file"]').setInputFiles({
    name: "too-large.csv",
    mimeType: "text/csv",
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1, "x"),
  });
  await expect(wizard.getByRole("alert")).toContainText(
    "exceeds the allowed size",
  );
  await expect(
    wizard.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  await upload(
    wizard,
    csv(
      Array.from({ length: 10_001 }, (_, index) =>
        row(`Limit ${index}`, `limit-${index}@example.test`),
      ),
    ),
    "too-many.csv",
  );
  await expect(wizard.getByRole("alert")).toContainText(
    "more records than allowed",
  );
  await expect(
    wizard.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
  expect(await customers(page)).toEqual(original);
});

test("preview pages and invalid-row filter reveal the actual affected record", async ({
  page,
}) => {
  const wizard = await open(page);
  const rows = Array.from({ length: 12 }, (_, index) =>
    row(`Preview ${index}`, `preview-${index}@example.test`),
  );
  rows[11] = row("Q", "preview-11@example.test");
  await preview(wizard, csv(rows));
  const body = wizard
    .getByRole("table", { name: "CSV preview" })
    .locator("tbody");
  await expect(body.locator("tr")).toHaveCount(10);
  await wizard.getByRole("button", { name: "Next", exact: true }).click();
  await expect(body.locator("tr")).toHaveCount(2);
  await expect(body).toContainText("Name must contain 2–120 characters.");
  await choose(page, wizard, "Show records", "Records with errors");
  await expect(body.locator("tr")).toHaveCount(1);
  await expect(body).toContainText("preview-11@example.test");
  await expect(
    wizard.getByRole("button", { name: "Continue", exact: true }),
  ).toBeDisabled();
});

test("cancel waits for the callback, leaves the workspace unchanged and permits retry", async ({
  page,
}) => {
  const wizard = await open(page);
  const original = await customers(page);
  const rows = Array.from({ length: 1000 }, (_, index) =>
    row(`Cancel ${index}`, `cancel-${index}@example.test`),
  );
  await preview(wizard, csv(rows));
  await review(wizard);
  await wizard
    .getByRole("button", { name: "Import 1,000 records", exact: true })
    .click();
  await expect(wizard.getByRole("progressbar")).toBeVisible();
  await wizard
    .getByRole("button", { name: "Cancel import", exact: true })
    .click();
  await expect(
    wizard.getByRole("heading", { name: "Import stopped", exact: true }),
  ).toBeVisible();
  expect(await customers(page)).toEqual(original);
  await wizard
    .getByRole("button", { name: "Retry import", exact: true })
    .click();
  await expect(
    wizard.getByRole("heading", { name: "Import complete", exact: true }),
  ).toBeVisible();
  await count(wizard, "Created", 1000);
  await count(wizard, "Failed", 0);
  await expect
    .poll(async () => (await customers(page)).length)
    .toBe(original.length + rows.length);
  expect(
    (await customers(page)).filter((customer) =>
      customer.email.startsWith("cancel-"),
    ),
  ).toHaveLength(rows.length);
});

test("an actual rejected staging callback retries once without duplicate commits", async ({
  page,
}) => {
  const wizard = await open(page);
  const original = await customers(page);
  const input = [
    row("Retry first", "retry-first@example.test"),
    row("Retry second", "retry-second@example.test"),
  ];
  await preview(wizard, csv(input));
  await review(wizard);
  // Fault injection targets the existing template's staging operation only.
  // It does not replace ImportWizard, its callback or the workspace API.
  await page.evaluate(() => {
    const nativeUUID = crypto.randomUUID.bind(crypto);
    let failOnce = true;
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: () => {
        if (failOnce) {
          failOnce = false;
          throw new Error("Temporary import fixture");
        }
        return nativeUUID();
      },
    });
  });
  await wizard
    .getByRole("button", { name: "Import 2 records", exact: true })
    .click();
  await expect(
    wizard.getByRole("heading", {
      name: "Import could not finish",
      exact: true,
    }),
  ).toBeVisible();
  await expect(wizard.getByRole("alert")).toContainText(
    "Temporary import fixture",
  );
  expect(await customers(page)).toEqual(original);
  await wizard
    .getByRole("button", { name: "Retry import", exact: true })
    .click();
  await expect(
    wizard.getByRole("heading", { name: "Import complete", exact: true }),
  ).toBeVisible();
  await count(wizard, "Created", 2);
  await count(wizard, "Failed", 0);
  await expect
    .poll(async () => (await customers(page)).length)
    .toBe(original.length + 2);
  const stored = await customers(page);
  for (const record of input)
    expect(
      stored.filter((customer) => customer.email === record.email),
    ).toHaveLength(1);
  await wizard.getByRole("link", { name: "View records", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/customers\/$/);
  await page.reload();
  expect(
    (await customers(page)).filter((customer) =>
      customer.email.startsWith("retry-"),
    ),
  ).toHaveLength(2);
});

test("Spanish workflow uses the same validation and actual commit contract", async ({
  page,
}) => {
  const wizard = await open(page, "es");
  await expect(
    wizard.getByText("Elige un archivo CSV", { exact: true }),
  ).toBeVisible();
  await upload(wizard, csv([row("Cliente de prueba", "cliente@example.test")]));
  await expect(
    wizard.getByText("Archivo listo", { exact: true }),
  ).toBeVisible();
  await wizard.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    wizard.getByRole("heading", { name: "Asignar campos", exact: true }),
  ).toBeVisible();
  await wizard.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    wizard.getByRole("heading", { name: "Vista previa", exact: true }),
  ).toBeVisible();
  await wizard.getByRole("button", { name: "Continuar", exact: true }).click();
  await wizard
    .getByRole("button", { name: "Importar 1 registros", exact: true })
    .click();
  await expect(
    wizard.getByRole("heading", {
      name: "Importación completada",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    wizard.getByText("Creados", { exact: true }).locator("..").locator("dd"),
  ).toHaveText("1");
  await expect
    .poll(async () =>
      (await customers(page)).some(
        (customer) => customer.email === "cliente@example.test",
      ),
    )
    .toBe(true);
});

const matrixCopy = {
  en: {
    sample: "Download sample",
    fileReady: "File ready",
    continue: "Continue",
    mapping: "Map fields",
    previewHeading: "Preview",
    reviewHeading: "Review",
    name: /^Name/,
    email: /^Email/,
    nameError: "Name must contain 2–120 characters.",
    duplicatePolicy: "Duplicate records",
    updatePolicy: "Update duplicates",
    filter: "Show records",
    errorsOnly: "Records with errors",
    all: "All records",
    preview: "CSV preview",
    exclude: "Skip the 1 invalid records",
    create: "Create",
    update: "Update",
    skipped: "Skipped",
    created: "Created",
    updated: "Updated",
    failed: "Failed",
    cancel: "Cancel import",
    stopped: "Import stopped",
    retry: "Retry import",
    complete: "Import complete",
    resource: "View records",
    import: (amount: number) => `Import ${amount.toLocaleString("en")} records`,
  },
  es: {
    sample: "Descargar muestra",
    fileReady: "Archivo listo",
    continue: "Continuar",
    mapping: "Asignar campos",
    previewHeading: "Vista previa",
    reviewHeading: "Revisar",
    name: /^Nombre/,
    email: /^Correo/,
    nameError: "El nombre debe tener entre 2 y 120 caracteres.",
    duplicatePolicy: "Registros duplicados",
    updatePolicy: "Actualizar duplicados",
    filter: "Mostrar registros",
    errorsOnly: "Registros con errores",
    all: "Todos los registros",
    preview: "Vista previa del CSV",
    exclude: "Omitir los 1 registros no válidos",
    create: "Crear",
    update: "Actualizar",
    skipped: "Omitidos",
    created: "Creados",
    updated: "Actualizados",
    failed: "Fallidos",
    cancel: "Cancelar importación",
    stopped: "Importación detenida",
    retry: "Reintentar importación",
    complete: "Importación completada",
    resource: "Ver registros",
    import: (amount: number) =>
      `Importar ${amount.toLocaleString("es")} registros`,
  },
};

for (const device of ["desktop", "mobile"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const locale of ["en", "es"] as const) {
      const key = `${device}-${theme}-${locale}`;
      test.describe(`imports matrix ${key}`, () => {
        test.use({
          viewport:
            device === "mobile"
              ? { width: 360, height: 900 }
              : { width: 1440, height: 1000 },
          isMobile: device === "mobile",
          hasTouch: device === "mobile",
          colorScheme: theme,
        });

        test("mapping, validation, duplicates, cancellation and retry use real workspace data", async ({
          page,
        }, info) => {
          const text = matrixCopy[locale];
          await page.addInitScript((selected) => {
            localStorage.setItem("aureform:theme", selected);
          }, theme);
          const wizard = await open(page, locale);
          await expect(page.locator("html")).toHaveAttribute("lang", locale);
          if (theme === "dark")
            await expect(page.locator("html")).toHaveClass(/dark/);
          else await expect(page.locator("html")).not.toHaveClass(/dark/);
          await expect(page.locator("html")).toHaveAttribute(
            "data-palette",
            "aurora",
          );
          const original = await customers(page);
          const existing = original[0];
          const duplicateEmail = `matrix-${key}@example.test`;
          const batch = Array.from({ length: 1000 }, (_, index) =>
            row(`Matrix ${key} ${index}`, `bulk-${key}-${index}@example.test`),
          );

          const downloading = page.waitForEvent("download");
          await wizard
            .getByRole("button", { name: text.sample, exact: true })
            .click();
          const sample = await downloading;
          expect(sample.suggestedFilename()).toBe("aureform-customers.csv");
          expect(await sample.failure()).toBeNull();

          await upload(
            wizard,
            `\uFEFF${csv(
              [
                row("Matrix existing updated", existing.email.toUpperCase()),
                row("Matrix first valid", duplicateEmail),
                row("Matrix last valid", duplicateEmail.toUpperCase(), {
                  company: 'A "quoted" company\r\nSecond line',
                }),
                row("Q", `invalid-${key}@example.test`),
                ...batch,
              ],
              ["who", "contact", ...headings.slice(2)],
            )}`,
            `matrix-${key}.csv`,
          );
          await expect(
            wizard.getByText(text.fileReady, { exact: true }),
          ).toBeVisible();
          await wizard
            .getByRole("button", { name: text.continue, exact: true })
            .click();
          await expect(
            wizard.getByRole("heading", { name: text.mapping, exact: true }),
          ).toBeVisible();
          await expect(
            wizard.getByRole("button", { name: text.continue, exact: true }),
          ).toBeDisabled();
          await choose(page, wizard, text.name, "who");
          await choose(page, wizard, text.email, "contact");
          await wizard
            .getByRole("button", { name: text.continue, exact: true })
            .click();
          await expect(
            wizard.getByRole("heading", {
              name: text.previewHeading,
              exact: true,
            }),
          ).toBeVisible();
          await expect(
            wizard.getByText(text.nameError, { exact: true }),
          ).toBeVisible();
          await expect(
            wizard.getByRole("button", { name: text.continue, exact: true }),
          ).toBeDisabled();
          await choose(page, wizard, text.filter, text.errorsOnly);
          const table = wizard.getByRole("table", {
            name: text.preview,
            exact: true,
          });
          await expect(table.locator("tbody tr")).toHaveCount(1);
          await expect(table).toContainText(`invalid-${key}@example.test`);
          await choose(page, wizard, text.filter, text.all);
          await expect(table.locator("tbody tr")).toHaveCount(10);
          await choose(page, wizard, text.duplicatePolicy, text.updatePolicy);
          const localizedCount = async (label: string, amount: number) =>
            expect(
              wizard
                .getByText(label, { exact: true })
                .locator("..")
                .locator("dd"),
            ).toHaveText(amount.toLocaleString(locale));
          await localizedCount(text.create, 1001);
          await localizedCount(text.update, 1);
          const pageOverflow = await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          );
          expect(
            pageOverflow,
            `${key}: no page-level horizontal overflow`,
          ).toBeLessThanOrEqual(1);
          if (device === "mobile") {
            const container = wizard.locator('[data-slot="table-container"]');
            const scroll = await container.evaluate((element) => {
              const before = element.scrollLeft;
              element.scrollLeft = element.scrollWidth;
              const after = element.scrollLeft;
              const available = element.scrollWidth - element.clientWidth;
              element.scrollLeft = before;
              return { after, available };
            });
            expect(
              scroll.available,
              `${key}: table retains all columns`,
            ).toBeGreaterThan(0);
            expect(
              scroll.after,
              `${key}: columns can be scrolled`,
            ).toBeGreaterThan(0);
          }
          const accessibility = await new AxeBuilder({ page })
            .include('[data-slot="import-wizard"]')
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();
          const axePath = info.outputPath("axe-preview.json");
          await writeFile(
            axePath,
            JSON.stringify(
              {
                key,
                violations: accessibility.violations,
                passes: accessibility.passes.map((rule) => rule.id),
                incomplete: accessibility.incomplete.map((rule) => rule.id),
              },
              null,
              2,
            ),
          );
          await info.attach("axe-preview", {
            path: axePath,
            contentType: "application/json",
          });
          expect(accessibility.violations, key).toEqual([]);
          expect(await customers(page)).toEqual(original);
          expect(await wizard.locator("button button").count()).toBe(0);
          await page.evaluate(() => window.scrollTo(0, 0));
          const previewPath = info.outputPath(`${key}-preview.png`);
          await page.screenshot({ path: previewPath, fullPage: true });
          await info.attach("matrix-preview", {
            path: previewPath,
            contentType: "image/png",
          });

          await wizard
            .getByRole("checkbox", { name: text.exclude, exact: true })
            .check();
          await wizard
            .getByRole("button", { name: text.continue, exact: true })
            .click();
          await expect(
            wizard.getByRole("heading", {
              name: text.reviewHeading,
              exact: true,
            }),
          ).toBeVisible();
          await localizedCount(text.skipped, 2);
          expect(await customers(page)).toEqual(original);
          await page.evaluate(() => window.scrollTo(0, 0));
          const reviewPath = info.outputPath(`${key}-review.png`);
          await page.screenshot({ path: reviewPath, fullPage: true });
          await info.attach("matrix-review", {
            path: reviewPath,
            contentType: "image/png",
          });
          await wizard
            .getByRole("button", { name: text.import(1002), exact: true })
            .click();
          await expect(wizard.getByRole("progressbar")).toBeVisible();
          await wizard
            .getByRole("button", { name: text.cancel, exact: true })
            .click();
          await expect(
            wizard.getByRole("heading", { name: text.stopped, exact: true }),
          ).toBeVisible();
          expect(await customers(page)).toEqual(original);
          await wizard
            .getByRole("button", { name: text.retry, exact: true })
            .click();
          await expect(
            wizard.getByRole("heading", { name: text.complete, exact: true }),
          ).toBeVisible();
          await localizedCount(text.created, 1001);
          await localizedCount(text.updated, 1);
          await localizedCount(text.skipped, 2);
          await localizedCount(text.failed, 0);
          await expect
            .poll(async () => (await customers(page)).length)
            .toBe(original.length + 1001);
          const stored = await customers(page);
          expect(
            stored.find((customer) => customer.id === existing.id)?.name,
          ).toBe("Matrix existing updated");
          expect(
            stored.find((customer) => customer.id === existing.id)?.email,
          ).toBe(existing.email.toUpperCase());
          expect(
            stored.filter(
              (customer) =>
                customer.email.toLowerCase() === duplicateEmail.toLowerCase(),
            ),
          ).toHaveLength(1);
          expect(
            stored.find(
              (customer) =>
                customer.email.toLowerCase() === duplicateEmail.toLowerCase(),
            )?.name,
          ).toBe("Matrix last valid");
          expect(
            stored.some(
              (customer) => customer.email === `invalid-${key}@example.test`,
            ),
          ).toBe(false);
          await wizard
            .getByRole("link", { name: text.resource, exact: true })
            .click();
          await expect(page).toHaveURL(new RegExp(`/${locale}/customers/$`));
          await page.reload();
          expect(await customers(page)).toHaveLength(original.length + 1001);
          if (theme === "dark")
            await expect(page.locator("html")).toHaveClass(/dark/);
          else await expect(page.locator("html")).not.toHaveClass(/dark/);
        });
      });
    }
  }
}
