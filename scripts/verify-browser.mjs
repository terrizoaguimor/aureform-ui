import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { access, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { routes } from "../src/lib/catalog.ts";
import { createAppearance } from "../src/lib/appearance.ts";

const baseURL = process.env.AUREFORM_BASE_URL || "http://127.0.0.1:3001";
const full = process.argv.includes("--full");
const capture = process.argv.includes("--capture");
const diagnostic = process.argv.includes("--diagnostic");
const executable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
  (await access("/usr/bin/chromium-browser").then(
    () => "/usr/bin/chromium-browser",
    () => undefined,
  ));
const browser = await chromium.launch({
  executablePath: executable,
  args: ["--no-sandbox"],
});
const representative = [
  "",
  "dashboard",
  "customers",
  "ai",
  "ai/images",
  "calendar",
  "mail",
  "files",
  "settings/profile",
  "components",
  "studio",
  "themes",
  "effects",
  "forms",
  "layouts",
  "media",
  "docs",
  "pricing",
  "auth/sign-up",
  "status/coming-soon",
];
const allPaths = ["", ...routes.map((route) => route.path)];
const report = {
  checkedAt: new Date().toISOString(),
  baseURL,
  scope: full ? "all-routes-matrix" : "all-routes-and-representative-matrix",
  widths: [360, 768, 1440],
  locales: ["en", "es"],
  themes: ["light", "dark"],
  checks: [],
  captures: [],
  errors: [],
};
await mkdir(resolve("artifacts/browser"), { recursive: true });
await mkdir(resolve("public/previews"), { recursive: true });
await mkdir(resolve("public/previews/light"), { recursive: true });

function url(locale, path) {
  return `${baseURL}/${locale}/${path ? `${path}/` : ""}`;
}

async function check(locale, theme, width, path, accessibility) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.addInitScript((config) => {
    localStorage.setItem("aureform:theme", config.theme);
    localStorage.setItem("aureform:appearance:v1", JSON.stringify(config));
  }, createAppearance("aurora", theme));
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|Minified React error|hydrating/i.test(message.text())
    )
      pageErrors.push(message.text());
  });
  const result = {
    path: path || "landing",
    locale,
    theme,
    width,
    status: null,
    language: null,
    themeApplied: false,
    horizontalOverflow: 0,
    pageErrors,
    seriousOrCritical: [],
  };
  try {
    const response = await page.goto(url(locale, path), {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    result.status = response.status();
    await page.locator("h1").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(70);
    const measurements = await page.evaluate(() => ({
      language: document.documentElement.lang,
      dark: document.documentElement.classList.contains("dark"),
      overflow: Math.max(
        0,
        document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
      heading: document.querySelector("h1")?.textContent,
    }));
    result.language = measurements.language;
    result.themeApplied = measurements.dark === (theme === "dark");
    result.horizontalOverflow = measurements.overflow;
    result.heading = measurements.heading;
    if (accessibility) {
      const analysis = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      result.seriousOrCritical = analysis.violations
        .filter((violation) =>
          ["serious", "critical"].includes(violation.impact),
        )
        .map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          nodes: violation.nodes.map((node) => ({
            target: node.target,
            failure: node.failureSummary,
          })),
        }));
    }
    const failed =
      result.status !== 200 ||
      result.language !== locale ||
      !result.themeApplied ||
      result.horizontalOverflow > 1 ||
      result.pageErrors.length > 0 ||
      result.seriousOrCritical.length > 0;
    if (failed) {
      report.errors.push({
        path: result.path,
        locale,
        theme,
        width,
        reason: "browser-check",
      });
      await page.screenshot({
        path: resolve(
          `artifacts/browser/${path.replaceAll("/", "-") || "landing"}-${locale}-${theme}-${width}.png`,
        ),
        fullPage: true,
      });
    }
    report.checks.push(result);
  } catch (error) {
    report.errors.push({
      path: result.path,
      locale,
      theme,
      width,
      reason: String(error),
    });
    report.checks.push(result);
  } finally {
    await context.close();
  }
}

async function runBatches(jobs, label) {
  const concurrency = Number(process.env.AUREFORM_BROWSER_WORKERS || 4);
  for (let offset = 0; offset < jobs.length; offset += concurrency) {
    const outcomes = await Promise.allSettled(
      jobs.slice(offset, offset + concurrency).map((job) => check(...job)),
    );
    for (const outcome of outcomes)
      if (outcome.status === "rejected")
        report.errors.push({ reason: String(outcome.reason) });
    await writeFile(
      resolve("artifacts/browser/report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    if (
      offset === 0 ||
      (offset + concurrency) % 40 === 0 ||
      offset + concurrency >= jobs.length
    )
      console.log(
        `${label}: ${Math.min(offset + concurrency, jobs.length)}/${jobs.length}; ${report.errors.length} failed checks`,
      );
  }
}

try {
  if (capture) {
    const require = createRequire(import.meta.url);
    const nextRequire = createRequire(require.resolve("next/package.json"));
    const sharp = nextRequire("sharp");
    for (const theme of ["dark", "light"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      });
      await context.addInitScript((config) => {
        localStorage.setItem("aureform:theme", config.theme);
        localStorage.setItem("aureform:appearance:v1", JSON.stringify(config));
      }, createAppearance("aurora", theme));
      const page = await context.newPage();
      for (const path of allPaths) {
        await page.goto(url("en", path), { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(90);
        const image = await page.screenshot();
        const target = `public/previews/${theme === "light" ? "light/" : ""}${path.replaceAll("/", "-") || "landing"}.webp`;
        await sharp(image)
          .resize(960)
          .webp({ quality: 84 })
          .toFile(resolve(target));
        report.captures.push(target);
      }
      await context.close();
    }
    console.log(`Captured ${report.captures.length} actual application previews.`);
  }

  const paths = full ? allPaths : representative;
  const matrix = [];
  for (const locale of report.locales)
    for (const theme of report.themes)
      for (const width of report.widths)
        for (const path of paths)
          matrix.push([locale, theme, width, path, true]);
  if (!full)
    await runBatches(
      report.locales.flatMap((locale) =>
        allPaths
          .filter((path) => !representative.includes(path))
          .map((path) => [locale, "light", 1440, path, false]),
      ),
      "Route smoke",
    );
  await runBatches(matrix, "Locale / theme / viewport matrix");
} finally {
  await browser.close();
  report.completedAt = new Date().toISOString();
  report.passed = report.errors.length === 0;
  report.summary = {
    checks: report.checks.length,
    uniqueRoutes: new Set(report.checks.map((check) => check.path)).size,
    accessibilityChecks: report.checks.filter(
      (check) =>
        full || representative.includes(check.path === "landing" ? "" : check.path),
    ).length,
    failed: report.errors.length,
  };
  await writeFile(
    resolve("artifacts/browser/report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(JSON.stringify(report.summary));
if (!report.passed && !diagnostic) process.exitCode = 1;
