import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { routes } from "../src/lib/catalog.ts";
import { createAppearance } from "../src/lib/appearance.ts";

const baseURL = (
  process.env.AUREFORM_BASE_URL || "http://127.0.0.1:3012/aureform-ui"
).replace(/\/$/, "");
const manifest = JSON.parse(
  await readFile("public/assets/generated-images.json", "utf8"),
);
const version = JSON.parse(await readFile("package.json", "utf8")).version;
const reportDirectory = resolve(
  process.env.AUREFORM_QA_DIR || `artifacts/release-${version}/public-demo`,
);
const paths = ["", ...routes.map((route) => route.path)];
const records = [];
const pageErrors = [];
const failedResources = [];
const accessibility = [];
const interactions = [];
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync("/usr/bin/chromium-browser")
      ? "/usr/bin/chromium-browser"
      : undefined),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
let status = "failed";
let runError = null;
await mkdir(reportDirectory, { recursive: true });

async function contextFor(theme, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: "reduce",
  });
  await context.addInitScript(
    (appearance) => {
      if (!localStorage.getItem("aureform:appearance:v1")) {
        localStorage.setItem("aureform:theme", appearance.theme);
        localStorage.setItem(
          "aureform:appearance:v1",
          JSON.stringify(appearance),
        );
      }
    },
    createAppearance("aurora", theme),
  );
  return context;
}

async function visit(context, locale, route, options = {}) {
  const page = await context.newPage();
  page.on("pageerror", (error) =>
    pageErrors.push({ locale, route, error: error.message }),
  );
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().startsWith(baseURL)) {
      failedResources.push({
        locale,
        route,
        status: response.status(),
        url: response.url(),
      });
    }
  });
  const query = route === "customers/detail" ? "?id=cus-001" : "";
  const response = await page.goto(
    `${baseURL}/${locale}/${route ? `${route}/` : ""}${query}`,
    { waitUntil: "networkidle" },
  );
  assert.ok(response?.ok(), `${locale}/${route}: HTTP response`);
  // Auth views use a standalone split composition with a visible h1.
  await page.locator("main, h1").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => {
      const bounds = image.getBoundingClientRect();
      return (
        (image.loading === "lazy" &&
          (bounds.bottom < 0 || bounds.top > innerHeight)) ||
        (image.complete && image.naturalWidth > 0)
      );
    }),
  );
  const rendered = await page.evaluate(() => ({
    language: document.documentElement.lang,
    theme: document.documentElement.classList.contains("dark")
      ? "dark"
      : "light",
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    images: Array.from(document.images).filter(
      (image) => image.complete && image.naturalWidth > 0,
    ).length,
  }));
  assert.equal(rendered.language, locale);
  assert.equal(
    rendered.overflow,
    false,
    `${locale}/${route}: horizontal overflow`,
  );
  if (options.axe) {
    const result = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    accessibility.push({
      locale,
      route,
      violations: result.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        nodes: nodes.map((node) => node.target),
      })),
      incomplete: result.incomplete.map(({ id }) => id),
    });
    assert.equal(
      result.violations.length,
      0,
      `${locale}/${route}: accessibility violations in main`,
    );
  }
  records.push({
    locale,
    route: route || "landing",
    viewport: options.mobile ? "360x900" : "1440x1000",
    ...rendered,
  });
  if (options.keep) return page;
  await page.close();
}

try {
  for (const locale of ["en", "es"]) {
    const context = await contextFor("dark");
    for (let offset = 0; offset < paths.length; offset += 4) {
      const results = await Promise.allSettled(
        paths
          .slice(offset, offset + 4)
          .map((route) =>
            visit(context, locale, route, {
              axe:
                locale === "en" &&
                [
                  "dashboard",
                  "customers",
                  "docs/license",
                  "media",
                  "products",
                  "orders",
                  "invoices",
                  "maps",
                  "auth/sign-in",
                  "settings/billing",
                ].includes(route),
            }),
          ),
      );
      for (const result of results)
        if (result.status === "rejected") throw result.reason;
      if (offset % 16 === 0 || offset + 4 >= paths.length)
        console.log(
          `Public demo ${locale}: ${Math.min(offset + 4, paths.length)}/${paths.length}`,
        );
    }
    await context.close();
  }
  const mobile = await contextFor("light", { width: 360, height: 900 });
  for (const route of [
    "",
    "dashboard",
    "components",
    "studio",
    "docs/license",
    "customers",
    "products",
    "orders",
    "invoices",
    "maps",
    "auth/sign-in",
    "auth/sign-up",
    "settings/billing",
  ]) {
    await visit(mobile, "es", route, { mobile: true, theme: "light" });
  }
  await mobile.close();

  const controls = await contextFor("dark");
  const page = await visit(controls, "en", "dashboard", { keep: true });
  await page.getByRole("button", { name: /^EN —/ }).click();
  await page.getByRole("menuitem", { name: "Español" }).click();
  await page.waitForURL(`${baseURL}/es/dashboard/`);
  assert.equal(await page.locator("html").getAttribute("lang"), "es");
  interactions.push("Language switch retains the mounted route");
  await page
    .getByRole("button", { name: /Cambiar tema|tema de color/i })
    .click();
  await page.waitForFunction(
    () => !document.documentElement.classList.contains("dark"),
  );
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(
    await page
      .locator("html")
      .evaluate((html) => html.classList.contains("dark")),
    false,
  );
  interactions.push("Light theme persists after reload");
  await page.close();
  const imagePage = await visit(controls, "en", "ai/images", { keep: true });
  await imagePage
    .getByLabel("Prompt", { exact: true })
    .fill("A quiet architectural composition for a community project");
  await imagePage
    .getByRole("button", { name: "Prepare image previews", exact: true })
    .click();
  const [download] = await Promise.all([
    imagePage.waitForEvent("download"),
    imagePage
      .getByRole("button", { name: "Download image (.webp)", exact: true })
      .first()
      .click(),
  ]);
  const downloaded = await readFile(await download.path());
  const asset = manifest.items.find((item) =>
    item.downloadSrc.endsWith(`/${download.suggestedFilename()}`),
  );
  assert.ok(asset, "Downloaded filename identifies a prepared asset");
  assert.equal(
    createHash("sha256").update(downloaded).digest("hex"),
    asset.webpSha256,
  );
  assert.equal(downloaded.length, asset.webpBytes);
  interactions.push(
    "Real browser image download preserves the exact WebP bytes",
  );
  await imagePage.close();
  await controls.close();
  assert.equal(pageErrors.length, 0, "No browser application errors");
  assert.equal(failedResources.length, 0, "No failed local HTTP resources");
  status = "passed";
} catch (error) {
  runError = String(error);
  throw error;
} finally {
  await browser.close();
  await writeFile(
    resolve(reportDirectory, "report.json"),
    JSON.stringify(
      {
        version,
        status,
        baseURL,
        finishedAt: new Date().toISOString(),
        scope:
          "All 69 views in EN/ES desktop dark; thirteen ES mobile light views; ten main-region Axe scans; three real browser behaviors",
        records,
        accessibility,
        interactions,
        pageErrors,
        failedResources,
        runError,
      },
      null,
      2,
    ) + "\n",
  );
}
