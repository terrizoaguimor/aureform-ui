import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { routes } from "../src/lib/catalog.ts";
import { documentationArticles } from "../src/lib/documentation.ts";
import { locales } from "../src/i18n/messages.ts";

const root = resolve("out");
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
const failures = [];
const seen = new Set();
const htmlFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith(".html")) htmlFiles.push(path);
  }
}

await walk(root);
const applicationPaths = routes
  .map((route) => route.path)
  .filter((path) => path !== "docs" && !path.startsWith("docs/"));
const expectedLocalePages = locales.flatMap((locale) => [
  `${locale}/index.html`,
  ...applicationPaths.map((path) => `${locale}/${path}/index.html`),
  ...documentationArticles.map(
    ({ slug }) =>
      `${locale}/docs/${slug === "start" ? "" : `${slug}/`}index.html`,
  ),
]);
const exportedLocalePages = htmlFiles
  .map((file) => relative(root, file).split(sep).join("/"))
  .filter((file) => locales.some((locale) => file.startsWith(`${locale}/`)));
assert.deepEqual(
  [...exportedLocalePages].sort(),
  [...expectedLocalePages].sort(),
  "Every catalog application and documentation chapter must be exported in both languages.",
);
await stat(resolve(root, ".nojekyll"));

async function checkURL(raw, from) {
  const url = raw.replaceAll("&amp;", "&");
  if (!url.startsWith("/") || url.startsWith("//")) return;
  const pathname = new URL(url, "https://example.invalid").pathname;
  if (
    basePath &&
    pathname !== basePath &&
    !pathname.startsWith(`${basePath}/`)
  ) {
    failures.push({ from, url, reason: "Missing deployment base path" });
    return;
  }
  const local = decodeURIComponent(pathname.slice(basePath.length) || "/");
  if (seen.has(local)) return;
  seen.add(local);
  const file = resolve(root, `.${local}`);
  if (file !== root && !file.startsWith(root + sep)) {
    failures.push({ from, url, reason: "Path escapes export" });
    return;
  }
  const info = await stat(file).catch(() => null);
  if (
    !info ||
    (info.isDirectory() &&
      !(await stat(resolve(file, "index.html")).catch(() => null)))
  ) {
    failures.push({ from, url, reason: "Missing exported destination" });
  }
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const from = relative(root, file);
  for (const tag of html.matchAll(/<[^>]+>/g)) {
    for (const attribute of tag[0].matchAll(
      /\b(?:href|src|poster)="([^"]+)"/g,
    )) {
      await checkURL(attribute[1], from);
    }
    for (const cssURL of tag[0].matchAll(
      /url\((?:&quot;|["'])?(\/[^)"'\s&]+)(?:&quot;|["'])?\)/g,
    )) {
      await checkURL(cssURL[1], from);
    }
  }
}

console.log(
  JSON.stringify(
    {
      status: failures.length ? "failed" : "passed",
      basePath: basePath || "/",
      htmlPages: htmlFiles.length,
      documentationChapters: documentationArticles.length,
      uniqueLocalDestinations: seen.size,
      failures,
    },
    null,
    2,
  ),
);
assert.equal(
  failures.length,
  0,
  "Exported HTML must resolve every local asset and link.",
);
