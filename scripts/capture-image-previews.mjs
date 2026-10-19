import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { routes } from "../src/lib/catalog.ts";
import { createAppearance } from "../src/lib/appearance.ts";

const baseURL = process.env.AUREFORM_BASE_URL || "http://127.0.0.1:3012";
const root = process.cwd();
const reportDirectory = resolve(root, "artifacts/image-assets-1.2.1/previews");
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const manifest = JSON.parse(
  await readFile(resolve(root, "public/assets/generated-images.json"), "utf8"),
);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const paths = ["", ...routes.map((route) => route.path)];
const records = new Map();
const pageErrors = [];
const failedImages = [];
let completed = false;
let runError = null;
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium-browser",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

await mkdir(reportDirectory, { recursive: true });
const startedAt = new Date().toISOString();
const inputManifestSha256 = sha256(
  await readFile(resolve(root, "public/assets/generated-images.json")),
);

async function capture(context, theme, route) {
  const page = await context.newPage();
  page.on("pageerror", (error) =>
    pageErrors.push({ route, theme, message: error.message }),
  );
  const query = route === "customers/detail" ? "?id=cus-001" : "";
  const url = `${baseURL}/en/${route ? `${route}/` : ""}${query}`;
  const response = await page.goto(url, { waitUntil: "networkidle" });
  if (!response?.ok()) throw new Error(`Preview route failed: ${url}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => {
      const rect = image.getBoundingClientRect();
      const required =
        image.loading !== "lazy" || (rect.bottom > 0 && rect.top < innerHeight);
      return !required || image.complete;
    }),
  );
  const images = await page.evaluate(() =>
    Array.from(document.images).map((image) => {
      const rect = image.getBoundingClientRect();
      return {
        src: new URL(image.currentSrc || image.src).pathname,
        decoded: image.naturalWidth > 0 && image.naturalHeight > 0,
        required:
          image.loading !== "lazy" ||
          (rect.bottom > 0 && rect.top < innerHeight),
      };
    }),
  );
  for (const image of images)
    if (image.required && !image.decoded)
      failedImages.push({ route, theme, src: image.src });
  if (images.some((image) => image.required && !image.decoded))
    throw new Error(
      `Broken image in preview: ${route || "landing"} / ${theme}`,
    );
  await page.mouse.move(0, 0);
  const screenshot = await page.screenshot({ animations: "disabled" });
  const bytes = await sharp(screenshot)
    .resize(960)
    .webp({ quality: 84 })
    .toBuffer();
  const file = `public/previews/${theme === "light" ? "light/" : ""}${route.replaceAll("/", "-") || "landing"}.webp`;
  await mkdir(resolve(root, file, ".."), { recursive: true });
  await writeFile(resolve(root, file), bytes);
  // Keep the local production export in sync with these static assets. This is
  // needed before capturing catalogs whose cards display other actual previews.
  await mkdir(resolve(root, "out", file.slice(7), ".."), { recursive: true });
  await copyFile(resolve(root, file), resolve(root, "out", file.slice(7)));
  records.set(`${theme}:${route}`, {
    route: route || "landing",
    theme,
    locale: "en",
    file,
    bytes: bytes.length,
    sha256: sha256(bytes),
    generatedImageSlots: images.filter((image) =>
      manifest.items.some((asset) => asset.src === image.src),
    ).length,
  });
  await page.close();
}

try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
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
      createAppearance("aurora", theme),
    );
    for (let offset = 0; offset < paths.length; offset += 3) {
      const results = await Promise.allSettled(
        paths
          .slice(offset, offset + 3)
          .map((route) => capture(context, theme, route)),
      );
      for (const result of results)
        if (result.status === "rejected") throw result.reason;
      if (offset % 15 === 0 || offset + 3 >= paths.length)
        console.log(
          `Actual previews ${theme}: ${Math.min(offset + 3, paths.length)}/${paths.length}`,
        );
    }
    // Their embedded previews are now current, so recapture only the catalogs.
    for (const route of ["layouts", "templates"])
      await capture(context, theme, route);
    await context.close();
  }
  if (
    records.size !== paths.length * 2 ||
    pageErrors.length ||
    failedImages.length
  )
    throw new Error("Actual preview capture did not complete cleanly.");
  completed = true;
} catch (error) {
  runError = String(error);
  throw error;
} finally {
  await browser.close();
  const report = {
    schemaVersion: 1,
    version: "1.2.1",
    startedAt,
    finishedAt: new Date().toISOString(),
    status: completed ? "passed-actual-application-image-previews" : "failed",
    scope:
      "Actual EN desktop previews, all 69 views in Light and Dark; image decoding and page errors.",
    viewport: { width: 1440, height: 900 },
    exportedWidth: 960,
    generatedImageManifestSha256: inputManifestSha256,
    previews: [...records.values()],
    pageErrors,
    failedImages,
    runError,
  };
  await writeFile(
    resolve(reportDirectory, "report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
}
