import { chromium, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appearanceStorageKey,
  createAppearance,
  palettePresets,
  resolveAppearance,
} from "../src/lib/appearance.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const baseURL = process.env.AUREFORM_BASE_URL || "http://127.0.0.1:3012";
const runLabel =
  process.env.AUREFORM_QA_RUN ||
  `actual-${new Date().toISOString().replace(/[-:.]/g, "")}`;
const output = path.join("/tmp/aureform-saas-responsive-1.2-qa", runLabel);
const widths = [360, 768, 1440];
const locales = ["en", "es"];
const themes = ["light", "dark"];
const routes = [
  { route: "onboarding", ready: "form" },
  { route: "settings/workspace", ready: "form" },
  { route: "settings/team", ready: "form" },
  { route: "customers", ready: '[data-slot="data-workbench"]' },
  {
    route: "customers/detail",
    query: "?id=cus-001",
    ready: '[role="tablist"]',
  },
  { route: "imports", ready: 'input[type="file"]' },
];
const sourcePaths = [
  ".next/BUILD_ID",
  "package.json",
  "src/lib/appearance.ts",
  "src/components/appearance-provider.tsx",
  "src/components/workspace-provider.tsx",
  "src/components/blocks/dashboard-shell.tsx",
  "src/components/blocks/data-workbench.tsx",
  "src/components/templates/catalogs.tsx",
  "src/components/templates/saas-setup.tsx",
  "src/components/templates/saas-operations.tsx",
  "src/components/templates/settings.tsx",
  "src/components/templates/customer-operations.tsx",
  "src/components/templates/customer-detail.tsx",
  "src/components/templates/customer-import.tsx",
  "src/demo/saas-data.ts",
  "src/app/globals.css",
  "src/styles/effects.css",
  "scripts/preview.mjs",
  "scripts/qa-saas-responsive-1.2.mjs",
];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fileInfo = async (file) => {
  const bytes = await fs.readFile(file);
  return { path: file, bytes: bytes.length, sha256: hash(bytes) };
};
const fingerprint = async () => {
  const reads = await Promise.allSettled(
    sourcePaths.map(async (file) => ({
      path: file,
      sha256: hash(await fs.readFile(path.join(root, file))),
    })),
  );
  for (const read of reads) if (read.status === "rejected") throw read.reason;
  return reads.map((read) => read.value);
};
const cases = routes.flatMap((route, routeIndex) =>
  locales.flatMap((locale, localeIndex) =>
    themes.flatMap((theme, themeIndex) =>
      widths.map((width, widthIndex) => ({
        ...route,
        locale,
        theme,
        width,
        height: 900,
        palette:
          palettePresets[
            (routeIndex + widthIndex + 3 * localeIndex + 2 * themeIndex) % 6
          ].id,
        id: `${route.route.replaceAll("/", "-")}-${locale}-${theme}-${width}`,
      })),
    ),
  ),
);

await fs.mkdir(output, { recursive: true });
await fs.mkdir(path.join(output, "screens"), { recursive: true });
await fs.mkdir(path.join(output, "previews"), { recursive: true });
const reportPath = path.join(output, "report.json");
const progressPath = path.join(output, "progress.jsonl");
const report = {
  status: "running",
  startedAt: new Date().toISOString(),
  baseURL,
  runLabel,
  output,
  scope: {
    routes: routes.map((route) => route.route),
    locales,
    themes,
    widths,
    height: 900,
    combinations: 72,
    paletteDistribution: Object.fromEntries(
      palettePresets.map((palette) => [
        palette.id,
        cases.filter((entry) => entry.palette === palette.id).length,
      ]),
    ),
    formula: "(routeIndex + widthIndex + 3*localeIndex + 2*themeIndex) % 6",
    fullPaletteCrossProduct: false,
    appearance:
      "Real createAppearance presets, preference storage and provider hydration; resolved root tokens are checked. No CSS overrides.",
    state:
      "Fresh local-demo owner workspace. Initial onboarding form, workspace form, team, first customer page, Olivia overview, and initial CSV upload.",
    screenshots: "Native prefers-reduced-motion: reduce; DPR 1; fonts loaded.",
  },
  buildId: (
    await fs.readFile(path.join(root, ".next/BUILD_ID"), "utf8")
  ).trim(),
  sourceBefore: await fingerprint(),
  matrix: [],
  previews: [],
  gallery: [],
};
if (
  cases.length !== 72 ||
  Object.values(report.scope.paletteDistribution).some((count) => count !== 12)
) {
  throw new Error("The requested scope must contain 72 cases, 12 per palette.");
}
await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    event: "start",
    reportPath,
    buildId: report.buildId,
    cases: cases.length,
    paletteDistribution: report.scope.paletteDistribution,
  }),
);

function preference(config) {
  const serialized = JSON.stringify(config);
  return {
    key: appearanceStorageKey,
    serialized,
    theme: config.theme,
    origin: new URL(baseURL).origin,
    paint: JSON.stringify({
      config: serialized,
      variables: resolveAppearance(config),
    }),
  };
}

async function openPage(browser, spec) {
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    deviceScaleFactor: 1,
    colorScheme: spec.theme,
    reducedMotion: "reduce",
    locale: spec.locale === "es" ? "es-ES" : "en-US",
  });
  context.setDefaultTimeout(12000);
  context.setDefaultNavigationTimeout(30000);
  const config = createAppearance(spec.palette, spec.theme);
  await context.addInitScript((data) => {
    if (location.origin !== data.origin) return;
    localStorage.setItem(data.key, data.serialized);
    localStorage.setItem("aureform:theme", data.theme);
    localStorage.setItem("aureform:appearance-paint:v1", data.paint);
  }, preference(config));
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) =>
    pageErrors.push(error.stack || error.message),
  );
  return { context, page, pageErrors, config };
}

async function ready(page, spec, config) {
  await page.waitForFunction(
    ({ key, theme, palette }) => {
      const rootElement = document.documentElement;
      return (
        rootElement.dataset.palette === palette &&
        rootElement.classList.contains("dark") === (theme === "dark") &&
        JSON.parse(localStorage.getItem(key) || "{}").palette === palette &&
        Boolean(localStorage.getItem("aureform:saas:v1")) &&
        !document.querySelector('[data-slot="data-table"][aria-busy="true"]')
      );
    },
    { key: appearanceStorageKey, theme: config.theme, palette: config.palette },
  );
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("main h1").first()).toBeVisible();
  if (spec.route === "customers/detail") {
    await expect(page.locator("main h1").first()).toHaveText("Olivia Rhye");
  }
  if (spec.ready) {
    await page
      .locator(`main ${spec.ready}`)
      .first()
      .waitFor({ state: "attached" });
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((done) =>
      requestAnimationFrame(() => requestAnimationFrame(done)),
    );
  });
}

async function appearanceEvidence(page, config) {
  const expected = resolveAppearance(config);
  const actual = await page.evaluate((key) => {
    const element = document.documentElement;
    const style = getComputedStyle(element);
    return {
      palette: element.dataset.palette,
      theme: element.classList.contains("dark") ? "dark" : "light",
      typography: element.dataset.typography,
      colorScheme: style.colorScheme,
      stored: JSON.parse(localStorage.getItem(key)),
      tokens: Object.fromEntries(
        [
          "--background",
          "--surface",
          "--primary",
          "--af-color-secondary",
          "--af-color-tertiary",
        ].map((name) => [name, style.getPropertyValue(name).trim()]),
      ),
      fontFamily: getComputedStyle(document.querySelector("main")).fontFamily,
      fontsLoaded: document.fonts.status === "loaded",
    };
  }, appearanceStorageKey);
  expect(actual.palette).toBe(config.palette);
  expect(actual.theme).toBe(config.theme);
  expect(actual.colorScheme).toBe(config.theme);
  expect(actual.typography).toBe("modern");
  expect(actual.stored).toEqual(config);
  expect(actual.fontsLoaded).toBe(true);
  for (const [name, value] of Object.entries(actual.tokens)) {
    expect(value.toLowerCase(), `Real provider token ${name}`).toBe(
      expected[name].toLowerCase(),
    );
  }
  return actual;
}

async function geometry(page) {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const visible = (element) => {
      const style = getComputedStyle(element);
      return (
        element.getClientRects().length > 0 &&
        style.visibility === "visible" &&
        style.display !== "none" &&
        !element.closest('[hidden],[inert],[aria-hidden="true"],.sr-only')
      );
    };
    const intentionalScroller = (element) => {
      for (
        let ancestor = element.parentElement;
        ancestor && ancestor !== document.body;
        ancestor = ancestor.parentElement
      ) {
        const style = getComputedStyle(ancestor);
        if (
          /^(auto|scroll)$/.test(style.overflowX) &&
          ancestor.scrollWidth > ancestor.clientWidth + 1
        ) {
          return true;
        }
      }
      return false;
    };
    const describe = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName,
        id: element.id,
        role: element.getAttribute("role"),
        name: (
          element.getAttribute("aria-label") ||
          element.textContent ||
          element.getAttribute("name") ||
          ""
        )
          .trim()
          .slice(0, 180),
        left: rect.left,
        right: rect.right,
        width: rect.width,
        className: element.className,
      };
    };
    const main = document.querySelector("main");
    const controls = Array.from(
      main.querySelectorAll(
        'button,a,input,select,textarea,[role="tab"],[role="combobox"],[role="checkbox"],h1,h2,h3,label',
      ),
    ).filter(visible);
    const clipped = controls
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          (rect.left < -1 || rect.right > viewportWidth + 1) &&
          !intentionalScroller(element)
        );
      })
      .map(describe);
    const scrollers = Array.from(main.querySelectorAll("*"))
      .filter(
        (element) =>
          visible(element) &&
          /^(auto|scroll)$/.test(getComputedStyle(element).overflowX) &&
          element.scrollWidth > element.clientWidth + 1,
      )
      .map((element) => ({
        ...describe(element),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        tabIndex: element.tabIndex,
      }));
    return {
      viewportWidth,
      clientWidth: document.documentElement.clientWidth,
      documentScrollWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      main: describe(main),
      controlsMeasured: controls.length,
      clipped,
      intentionalHorizontalScrollers: scrollers,
      lang: document.documentElement.lang,
      headings: Array.from(main.querySelectorAll("h1")).map((node) =>
        node.textContent.trim(),
      ),
    };
  });
}

async function capturePreview(page, spec, pageErrors) {
  const config = createAppearance("aurora", spec.theme);
  await page.evaluate((data) => {
    const previous = localStorage.getItem(data.key);
    localStorage.setItem(data.key, data.serialized);
    localStorage.setItem("aureform:theme", data.theme);
    localStorage.setItem("aureform:appearance-paint:v1", data.paint);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: data.key,
        oldValue: previous,
        newValue: data.serialized,
        storageArea: localStorage,
        url: location.href,
      }),
    );
  }, preference(config));
  await ready(page, spec, config);
  const appearance = await appearanceEvidence(page, config);
  const fileName = `${spec.route.replaceAll("/", "-")}.webp`;
  const relative = `previews/${spec.theme === "light" ? "light/" : ""}${fileName}`;
  const candidatePath = path.join(
    output,
    "previews",
    `${spec.theme}-${fileName}`,
  );
  const pngPath = candidatePath.replace(/\.webp$/, ".png");
  const png = await page.screenshot({ fullPage: false, path: pngPath });
  const bytes = await sharp(png)
    .resize(960, 600)
    .webp({ quality: 84, effort: 5 })
    .toBuffer();
  await fs.writeFile(candidatePath, bytes);
  expect(pageErrors, "No errors during the actual preview capture").toEqual([]);
  report.previews.push({
    route: spec.route,
    url: page.url(),
    theme: spec.theme,
    palette: "aurora",
    viewport: { width: 1440, height: 900 },
    outputDimensions: { width: 960, height: 600 },
    appearance,
    relative,
    png: await fileInfo(pngPath),
    candidate: await fileInfo(candidatePath),
  });
}

const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium-browser",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
report.browserVersion = browser.version();
let nextCase = 0;
try {
  async function worker() {
    while (nextCase < cases.length) {
      const spec = cases[nextCase++];
      const started = Date.now();
      const opened = await openPage(browser, spec);
      const result = {
        ...spec,
        startedAt: new Date().toISOString(),
        status: "running",
        pageErrors: opened.pageErrors,
      };
      try {
        const url = new URL(
          `/${spec.locale}/${spec.route}/${spec.query || ""}`,
          baseURL,
        ).href;
        const response = await opened.page.goto(url, {
          waitUntil: "domcontentloaded",
        });
        result.httpStatus = response.status();
        expect(result.httpStatus).toBe(200);
        await ready(opened.page, spec, opened.config);
        result.appearance = await appearanceEvidence(
          opened.page,
          opened.config,
        );
        result.geometry = await geometry(opened.page);
        const screenshotPath = path.join(output, "screens", `${spec.id}.png`);
        await opened.page.screenshot({
          fullPage: true,
          path: screenshotPath,
        });
        result.screenshot = await fileInfo(screenshotPath);
        expect(result.geometry.viewportWidth).toBe(spec.width);
        expect(result.geometry.lang).toBe(spec.locale);
        expect(result.geometry.documentScrollWidth).toBeLessThanOrEqual(
          spec.width + 1,
        );
        expect(result.geometry.main.left).toBeGreaterThanOrEqual(-1);
        expect(result.geometry.main.right).toBeLessThanOrEqual(spec.width + 1);
        expect(result.geometry.clipped).toEqual([]);
        expect(opened.pageErrors).toEqual([]);
        result.status = "passed";
      } catch (error) {
        result.status = "failed";
        result.error = error.stack || String(error);
        if (!result.screenshot) {
          const failurePath = path.join(
            output,
            "screens",
            `${spec.id}-failure.png`,
          );
          try {
            await opened.page.screenshot({
              fullPage: true,
              path: failurePath,
              timeout: 5000,
            });
            result.screenshot = await fileInfo(failurePath);
          } catch (captureError) {
            result.captureError = String(captureError);
          }
        }
      } finally {
        await opened.context.close();
      }
      result.durationMs = Date.now() - started;
      report.matrix.push(result);
      await fs.appendFile(progressPath, JSON.stringify(result) + "\n");
      console.log(
        JSON.stringify({
          event: "case",
          id: spec.id,
          palette: spec.palette,
          status: result.status,
          completed: report.matrix.length,
          pageErrors: result.pageErrors.length,
          overflow: result.geometry
            ? result.geometry.documentScrollWidth - spec.width
            : null,
          clipped: result.geometry?.clipped.length,
          error: result.error?.split("\n").slice(0, 5).join("\n"),
        }),
      );
    }
  }
  // Publish the twelve preview assets first, so independent gallery/motion QA
  // can continue while this process completes the responsive matrix.
  for (const route of routes) {
    for (const theme of themes) {
      const spec = {
        ...route,
        locale: "en",
        theme,
        palette: "aurora",
        width: 1440,
        height: 900,
      };
      const opened = await openPage(browser, spec);
      try {
        const response = await opened.page.goto(
          new URL(`/en/${spec.route}/${spec.query || ""}`, baseURL).href,
          { waitUntil: "domcontentloaded" },
        );
        expect(response.status()).toBe(200);
        await ready(opened.page, spec, opened.config);
        await capturePreview(opened.page, spec, opened.pageErrors);
        console.log(
          JSON.stringify({
            event: "preview-captured",
            route: spec.route,
            theme,
            completed: report.previews.length,
          }),
        );
      } finally {
        await opened.context.close();
      }
    }
  }

  if (report.previews.length === 12) {
    for (const preview of report.previews) {
      const sourceFile = path.join(root, "public", preview.relative);
      const runtimeFile = path.join(root, "out", preview.relative);
      const previous = {};
      for (const [label, target] of [
        ["public", sourceFile],
        ["runtime", runtimeFile],
      ]) {
        try {
          const existing = await fs.readFile(target);
          const backup = path.join(
            output,
            "previews",
            `before-${label}-${preview.theme}-${path.basename(target)}`,
          );
          await fs.writeFile(backup, existing);
          previous[label] = await fileInfo(backup);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          previous[label] = { missing: true };
        }
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(preview.candidate.path, target);
      }
      preview.previous = previous;
      preview.public = await fileInfo(sourceFile);
      preview.runtime = await fileInfo(runtimeFile);
      const response = await fetch(new URL(`/${preview.relative}`, baseURL));
      const served = Buffer.from(await response.arrayBuffer());
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/webp");
      expect(hash(served)).toBe(preview.public.sha256);
      preview.served = {
        status: response.status,
        contentType: response.headers.get("content-type"),
        sha256: hash(served),
      };
    }
    await fs.writeFile(
      path.join(output, "previews", "manifest.json"),
      JSON.stringify(report.previews, null, 2) + "\n",
    );
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
    console.log(
      JSON.stringify({
        event: "previews-ready",
        http200: report.previews.length,
        byteIdentical: report.previews.length,
        manifest: path.join(output, "previews", "manifest.json"),
      }),
    );
    for (const theme of themes) {
      const spec = {
        route: "templates",
        locale: "en",
        theme,
        palette: "aurora",
        width: 1440,
        height: 900,
      };
      const opened = await openPage(browser, spec);
      const gallery = { theme, images: [], pageErrors: opened.pageErrors };
      try {
        const response = await opened.page.goto(
          new URL("/en/templates/", baseURL).href,
          { waitUntil: "domcontentloaded" },
        );
        expect(response.status()).toBe(200);
        await ready(opened.page, spec, opened.config);
        for (const route of routes) {
          const src = `/previews/${theme === "light" ? "light/" : ""}${route.route.replaceAll("/", "-")}.webp`;
          const image = opened.page.locator(`img[src="${src}"]`);
          await image.scrollIntoViewIfNeeded();
          await expect(image).toHaveJSProperty("naturalWidth", 960);
          await expect(image).toHaveJSProperty("naturalHeight", 600);
          const href = await image
            .locator("xpath=ancestor::a[1]")
            .getAttribute("href");
          const target = new URL(href, baseURL);
          expect(target.pathname).toBe(`/en/${route.route}/`);
          if (route.route === "customers/detail") {
            expect(target.searchParams.get("id")).toBe("cus-001");
          }
          gallery.images.push({ route: route.route, src, href, loaded: true });
        }
        expect(opened.pageErrors).toEqual([]);
        gallery.status = "passed";
      } catch (error) {
        gallery.status = "failed";
        gallery.error = error.stack || String(error);
      } finally {
        await opened.context.close();
      }
      report.gallery.push(gallery);
    }
  }
  await Promise.all([worker(), worker()]);
} finally {
  await browser.close();
  report.sourceAfter = await fingerprint();
  report.sourceUnchanged =
    JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.finishedAt = new Date().toISOString();
  report.summary = {
    planned: 72,
    completed: report.matrix.length,
    passed: report.matrix.filter((entry) => entry.status === "passed").length,
    failed: report.matrix.filter((entry) => entry.status === "failed").length,
    pageErrors: report.matrix.reduce(
      (count, entry) => count + entry.pageErrors.length,
      0,
    ),
    previews: report.previews.length,
    galleryChecks: report.gallery.length,
    galleryPassed: report.gallery.filter((entry) => entry.status === "passed")
      .length,
    paletteCounts: Object.fromEntries(
      palettePresets.map((palette) => [
        palette.id,
        report.matrix.filter((entry) => entry.palette === palette.id).length,
      ]),
    ),
    sourceUnchanged: report.sourceUnchanged,
  };
  report.status =
    report.summary.completed === 72 &&
    report.summary.passed === 72 &&
    report.summary.previews === 12 &&
    report.summary.galleryPassed === 2 &&
    report.sourceUnchanged
      ? "passed-real-responsive-matrix-and-gallery-previews"
      : "incomplete-or-failed";
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  await fs.writeFile(
    path.join(output, "previews", "manifest.json"),
    JSON.stringify(report.previews, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      event: "finish",
      status: report.status,
      summary: report.summary,
      reportPath,
    }),
  );
}
if (report.status !== "passed-real-responsive-matrix-and-gallery-previews") {
  process.exitCode = 1;
}
