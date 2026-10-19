import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createAppearance } from "../src/lib/appearance.ts";

const origin = (
  process.env.AUREFORM_BASE_URL || "http://127.0.0.1:3012"
).replace(/\/$/, "");
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
const root = process.cwd();
const directory = resolve(root, "docs/images");
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const { version } = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
const captures = [
  {
    file: "aureform-overview-dark.webp",
    route: "dashboard",
    theme: "dark",
    palette: "aurora",
  },
  {
    file: "aureform-overview-light.webp",
    route: "dashboard",
    theme: "light",
    palette: "ocean",
  },
  {
    file: "aureform-studio.webp",
    route: "studio",
    theme: "dark",
    palette: "aurora",
  },
  {
    file: "aureform-charts.webp",
    route: "charts",
    theme: "dark",
    palette: "violet",
  },
  {
    file: "aureform-components.webp",
    route: "components",
    theme: "light",
    palette: "mint",
  },
  {
    file: "aureform-effects.webp",
    route: "effects",
    theme: "dark",
    palette: "violet",
  },
  {
    file: "aureform-media.webp",
    route: "media",
    theme: "dark",
    palette: "aurora",
  },
];
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync("/usr/bin/chromium-browser")
      ? "/usr/bin/chromium-browser"
      : undefined),
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const records = [];
const pageErrors = [];
await mkdir(directory, { recursive: true });
try {
  for (const capture of captures) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    await context.addInitScript(
      (appearance) => {
        localStorage.setItem("aureform:theme", appearance.theme);
        localStorage.setItem(
          "aureform:appearance:v1",
          JSON.stringify(appearance),
        );
      },
      createAppearance(capture.palette, capture.theme),
    );
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      pageErrors.push({ file: capture.file, message: error.message }),
    );
    const response = await page.goto(
      `${origin}${basePath}/en/${capture.route}/`,
      { waitUntil: "networkidle" },
    );
    if (!response?.ok())
      throw new Error(`Screenshot route failed: ${capture.route}`);
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
    await page.mouse.move(0, 0);
    const png = await page.screenshot({ animations: "disabled" });
    const webp = await sharp(png).webp({ quality: 90 }).toBuffer();
    await writeFile(resolve(directory, capture.file), webp);
    records.push({
      ...capture,
      locale: "en",
      width: 1440,
      height: 1000,
      bytes: webp.length,
      sha256: createHash("sha256").update(webp).digest("hex"),
    });
    console.log(`Captured actual application: ${capture.file}`);
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(
    resolve(directory, "screenshots.json"),
    JSON.stringify(
      {
        version,
        capturedAt: new Date().toISOString(),
        method:
          "Playwright screenshots of the actual built application, encoded as WebP",
        basePath,
        captures: records,
        pageErrors,
      },
      null,
      2,
    ) + "\n",
  );
}
if (pageErrors.length)
  throw new Error("The README capture found application errors.");
