import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
} from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { kitRoot, dependencyClosure } from "./lib/source-graph.mjs";
import { zipFiles } from "./lib/zip.mjs";
import { initProject } from "../bin/aureform.mjs";
const kitManifest = JSON.parse(
  await readFile(resolve(kitRoot, "package.json"), "utf8"),
);
if (kitManifest.license !== "Apache-2.0")
  throw new Error(
    "The source manifest must declare Apache-2.0 before packaging.",
  );
const sha256 = (content) => createHash("sha256").update(content).digest("hex");
const nativeAudit = JSON.parse(
  await readFile(resolve(kitRoot, ".figma/native-audit.json"), "utf8"),
);
if (nativeAudit.status !== "passed-native-structure-and-visual-review")
  throw new Error("Historical native review must pass before packaging.");
const baselineAudit = JSON.parse(
  await readFile(resolve(kitRoot, ".figma/native-audit-1.2.json"), "utf8"),
);
const currentState = await readFile(resolve(kitRoot, ".figma/state.json"));
const baselineState = await readFile(
  resolve(kitRoot, ".figma/history/state-1.2-final.json"),
);
const historicalState = await readFile(
  resolve(kitRoot, ".figma/history/state-1.1-final.json"),
);
if (
  baselineAudit.status !== "passed-native-structure-and-visual-review" ||
  baselineAudit.stateSha256 !== sha256(baselineState) ||
  baselineAudit.summary?.routeRoots !== 69
)
  throw new Error(
    "Retained 1.2 native review must match its frozen 1.2 state.",
  );
if (nativeAudit.stateSha256 !== sha256(historicalState))
  throw new Error("Historical native evidence must remain unchanged.");
const imageManifestPath = "public/assets/generated-images.json";
const imageCatalogPath = "docs/generated-images/catalog.json";
const imageAuditPath = ".figma/native-generated-images-1.2.1.json";
const [imageManifestContent, imageCatalogContent, imageAuditContent] =
  await Promise.all(
    [imageManifestPath, imageCatalogPath, imageAuditPath].map((path) =>
      readFile(resolve(kitRoot, path)),
    ),
  );
const imageManifest = JSON.parse(imageManifestContent.toString("utf8"));
const imageCatalog = JSON.parse(imageCatalogContent.toString("utf8"));
const imageAudit = JSON.parse(imageAuditContent.toString("utf8"));
// The image review remains a 1.2.1 checkpoint when a later source release
// changes licensing, documentation or deployment. Do not relabel that audit.
const imageCheckpointVersion = "1.2.1";
const imageCheckpointState = await readFile(
  resolve(kitRoot, ".figma/history/state-1.2.1-final.json"),
).catch((error) => {
  if (error.code === "ENOENT") return currentState;
  throw error;
});
const imageNativeState = JSON.parse(imageCheckpointState.toString("utf8"));
const currentNativeState = JSON.parse(currentState.toString("utf8"));
const retainedNativeState = JSON.parse(baselineState.toString("utf8"));
const retainedRoots = retainedNativeState.entities.routeScreens;
const currentRoots = currentNativeState.entities.routeScreens;
if (
  imageManifest.version !== imageCheckpointVersion ||
  imageAudit.version !== imageCheckpointVersion ||
  !/^passed(?:-|$)/i.test(imageAudit.status ?? "") ||
  imageAudit.stateSha256 !== sha256(imageCheckpointState) ||
  imageAudit.fileKey !== imageNativeState.fileKey ||
  imageAudit.fileKey !== currentNativeState.fileKey ||
  imageAudit.manifest?.file !== imageManifestPath ||
  imageAudit.manifest?.sha256 !== sha256(imageManifestContent) ||
  imageAudit.coverage?.uploadedAssets !== 32 ||
  imageAudit.coverage?.assetComponents !== 32 ||
  imageAudit.coverage?.wholeUiRasterCount !== 0 ||
  Object.keys(imageNativeState.entities.routeScreens).length !== 69 ||
  Object.keys(currentRoots).length < 69 ||
  Object.entries(imageNativeState.entities.routeScreens).some(
    ([path, id]) => currentRoots[path] !== id,
  ) ||
  Object.entries(retainedRoots).some(([path, id]) => currentRoots[path] !== id)
)
  throw new Error(
    "Generated-image review must match its immutable 1.2.1 state and manifest, 32 assets and zero UI rasterization. Preserve .figma/history/state-1.2.1-final.json before changing current native state; a later source release does not recertify that checkpoint.",
  );
for (const snapshot of imageAudit.protectedFiles ?? []) {
  if (
    !snapshot.file?.startsWith(".figma/") ||
    snapshot.file.includes("\\") ||
    snapshot.file.split("/").includes("..")
  )
    throw new Error("Unsafe retained native snapshot path.");
  if (
    sha256(await readFile(resolve(kitRoot, snapshot.file))) !== snapshot.sha256
  )
    throw new Error(`Retained native snapshot changed: ${snapshot.file}`);
}
for (const path of [
  ".figma/history/state-1.2-final.json",
  ".figma/native-audit-1.2.json",
])
  if (!imageAudit.protectedFiles?.some((snapshot) => snapshot.file === path))
    throw new Error(`Image review is missing the retained baseline: ${path}`);
async function acceptedProofs(records) {
  const proofs = new Map();
  for (const proof of records) {
    const recordedPath = proof.path ?? proof.file;
    if (typeof recordedPath !== "string")
      throw new Error("Visual proof is missing its local PNG path.");
    const marker = "/.figma/proofs/";
    const offset = recordedPath.indexOf(marker);
    const path = recordedPath.startsWith(".figma/proofs/")
      ? recordedPath
      : offset >= 0
        ? recordedPath.slice(offset + 1)
        : null;
    if (!path)
      throw new Error(`Unsupported visual proof path: ${recordedPath}`);
    if (
      path.includes("\\") ||
      path.split("/").includes("..") ||
      !path.endsWith(".png")
    )
      throw new Error(`Unsafe visual proof path: ${path}`);
    const content = await readFile(resolve(kitRoot, path));
    if (
      sha256(content) !== proof.sha256 ||
      !content.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
    )
      throw new Error(`Final visual proof changed: ${path}`);
    if (proofs.has(path))
      throw new Error(`Duplicate final visual proof: ${path}`);
    proofs.set(path, content);
  }
  if (proofs.size === 0)
    throw new Error("No accepted final visual proofs were recorded.");
  return proofs;
}
const [historicalVisualProofs, baselineVisualProofs, imageVisualProofs] =
  await Promise.all([
    acceptedProofs(
      nativeAudit.proof.reviewBatches.flatMap((batch) => batch.visualProofs),
    ),
    acceptedProofs(
      baselineAudit.proof.reviewBatches.flatMap((batch) => batch.visualProofs),
    ),
    acceptedProofs(imageAudit.proofs ?? []),
  ]);
for (const path of imageVisualProofs.keys())
  if (historicalVisualProofs.has(path) || baselineVisualProofs.has(path))
    throw new Error(`Image review must use new asset-review PNGs: ${path}`);
const imageFiles = new Map([
  [imageManifestPath, imageManifestContent],
  [imageCatalogPath, imageCatalogContent],
]);
const expectedGroups = { avatars: 18, products: 8, art: 6 };
if (
  imageManifest.items?.length !== 32 ||
  imageCatalog.items?.length !== 32 ||
  imageAudit.assets?.length !== 32 ||
  new Set(imageManifest.items.map((item) => item.id)).size !== 32 ||
  new Set(imageCatalog.items.map((item) => item.id)).size !== 32 ||
  new Set(imageAudit.assets.map((item) => item.id)).size !== 32
)
  throw new Error(
    "The image manifest, prompt catalog and review must contain the same 32 unique assets.",
  );
for (const [group, count] of Object.entries(expectedGroups))
  if (
    imageManifest.items.filter((item) => item.group === group).length !== count
  )
    throw new Error(`Unexpected generated-image group count: ${group}`);
for (const item of imageManifest.items) {
  const base = `/assets/${item.group}/${item.id}`;
  if (
    !/^[a-z0-9-]+$/.test(item.id) ||
    !Object.hasOwn(expectedGroups, item.group) ||
    item.src !== `${base}.svg` ||
    item.downloadSrc !== `${base}.webp`
  )
    throw new Error(`Unexpected generated-image path: ${item.id}`);
  const prompt = imageCatalog.items.find((entry) => entry.id === item.id);
  const review = imageAudit.assets.find((entry) => entry.id === item.id);
  if (
    typeof prompt?.prompt !== "string" ||
    prompt.group !== item.group ||
    sha256(prompt.prompt) !== item.promptSha256 ||
    review?.file !== `public${item.downloadSrc}` ||
    review.webSrc !== item.src ||
    review.sha256 !== item.webpSha256 ||
    review.bytes !== item.webpBytes ||
    !review.componentId ||
    !review.imageNodeId ||
    !review.imageHash
  )
    throw new Error(
      `Generated image is missing its matching prompt or native review: ${item.id}`,
    );
  if (
    typeof prompt.master !== "string" ||
    !/^[a-z0-9-]+\.webp$/.test(prompt.master) ||
    item.master !== `output/imagegen/masters/${prompt.master}`
  )
    throw new Error(`Unexpected original-image filename: ${item.id}`);
  const masterPath = `design/images/masters/${prompt.master}`;
  const [webp, svg, master] = await Promise.all([
    readFile(resolve(kitRoot, `public${item.downloadSrc}`)),
    readFile(resolve(kitRoot, `public${item.src}`)),
    readFile(resolve(kitRoot, masterPath)),
  ]);
  const embedded = svg
    .toString("utf8")
    .match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
  if (
    webp.length !== item.webpBytes ||
    sha256(webp) !== item.webpSha256 ||
    svg.length !== item.svgBytes ||
    sha256(svg) !== item.svgSha256 ||
    !embedded ||
    !Buffer.from(embedded[1], "base64").equals(webp) ||
    master.length !== item.masterBytes ||
    sha256(master) !== item.masterSha256 ||
    master.toString("ascii", 0, 4) !== "RIFF" ||
    master.toString("ascii", 8, 12) !== "WEBP"
  )
    throw new Error(
      `Generated-image bytes or embedded WebP changed: ${item.id}`,
    );
  imageFiles.set(`public${item.downloadSrc}`, webp);
  imageFiles.set(`public${item.src}`, svg);
  imageFiles.set(masterPath, master);
}
imageFiles.set(
  "README.md",
  `# Aureform UI ${kitManifest.version} — generated image collection

32 fictional generated assets: 16 portrait avatars, two organization avatars, eight product photos and six editorial images. Original masters in design/images/masters, optimized WebP files and self-contained SVG wrappers are included, with the immutable 1.2.1 image manifest, dimensions, EN/ES alternative text, SHA-256 values and full generation prompt catalog.

Extract this archive into your Next.js project root to preserve public/assets/... paths. Use /assets/<group>/<id>.svg with the supplied components or /assets/<group>/<id>.webp with your image component. The SVG contains the exact optimized WebP as a data URI: it is portable raster content, not editable vector artwork. Aureform's text registry can deliver this SVG through the official shadcn 4.22.0 installer. The local CLI and ZIP deliveries preserve binary WebP bytes.

No API key, image generation SDK, backend or remote image host is needed to display these files. All 32 original masters are openly distributed in this archive and the source package. Prompts document provenance; they do not imply that the receiving project must generate images. The historical image manifest records the original generation-workspace paths; use the same master filenames under design/images/masters in this distribution.

The original Aureform collection, prompts and masters are licensed under the included Apache 2.0 LICENSE, to the extent the contributors hold rights in them. Keep NOTICE when redistributing. The starter, eight-component sample and full source use the same license. Native asset review and delivery QA retain their own recorded scopes: the 1.2.1 image checkpoint is historical evidence, not a new native review of this source release.
`,
);
const excluded = new Set([
  "node_modules",
  ".next",
  "out",
  ".git",
  ".openai",
  "artifacts",
  "test-results",
  "playwright-report",
  ".DS_Store",
]);
async function tree(root, directory = "", files = new Map()) {
  for (const item of await readdir(resolve(root, directory), {
    withFileTypes: true,
  })) {
    if (
      excluded.has(item.name) ||
      item.name.startsWith(".env") ||
      item.name.endsWith(".tsbuildinfo") ||
      item.name === "next-env.d.ts" ||
      (directory === "" && ["output", "tmp"].includes(item.name)) ||
      (directory === "public" && item.name === "downloads")
    )
      continue;
    const path = [directory, item.name].filter(Boolean).join("/");
    // Include native proof files and original masters so the source archive
    // can reproduce packaging gates without unpublished workspace artifacts.
    if (item.isDirectory()) await tree(root, path, files);
    else if (item.isFile())
      files.set(path, await readFile(resolve(root, path)));
  }
  return files;
}
await mkdir(resolve(kitRoot, "public/downloads"), { recursive: true });
const archives = [];
const legalPaths = [
  "LICENSE",
  "LICENSE.md",
  "NOTICE",
  "THIRD_PARTY_NOTICES.md",
];
for (const item of await readdir(resolve(kitRoot, "licenses/third-party")))
  legalPaths.push(`licenses/third-party/${item}`);
for (const item of await readdir(resolve(kitRoot, "src/assets/fonts")))
  if (item.endsWith("-OFL.txt")) legalPaths.push(`src/assets/fonts/${item}`);
const legalFiles = new Map(
  await Promise.all(
    legalPaths.map(async (path) => [
      path,
      await readFile(resolve(kitRoot, path)),
    ]),
  ),
);
async function save(name, files, { historical = false } = {}) {
  // Native evidence companions retain their original, pinned checkpoint
  // bytes. Current source, starter, sample and image packages carry Apache.
  if (!historical) files = new Map([...files, ...legalFiles]);
  const content = zipFiles(files);
  const limitMiB = name === "aureform-ui-source" ? 90 : 25;
  if (content.length > limitMiB * 1024 * 1024)
    throw new Error(
      `${name}.zip exceeds the ${limitMiB} MiB distribution limit.`,
    );
  const archivePath = resolve(kitRoot, `public/downloads/${name}.zip`);
  const existing = await readFile(archivePath).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (historical && existing && !existing.equals(content))
    throw new Error(`Retained native evidence archive changed: ${name}.zip`);
  if (!existing?.equals(content)) await writeFile(archivePath, content);
  archives.push({
    name: `${name}.zip`,
    files: files.size,
    bytes: content.length,
    sha256: createHash("sha256").update(content).digest("hex"),
  });
}
await save("aureform-ui-native-evidence-1.1", historicalVisualProofs, {
  historical: true,
});
await save("aureform-ui-native-evidence-1.2", baselineVisualProofs, {
  historical: true,
});
await save("aureform-ui-native-evidence-1.2.1", imageVisualProofs, {
  historical: true,
});
await save("aureform-ui-images", imageFiles);
const staging = await mkdtemp(resolve(tmpdir(), "aureform-starter-package-"));
try {
  await initProject(staging, { install: false });
  await save("aureform-ui-starter", await tree(staging));
} finally {
  await rm(staging, { recursive: true, force: true });
}
const freeNames = [
    "button",
    "input",
    "textarea",
    "card",
    "badge",
    "avatar",
    "alert",
    "skeleton",
  ],
  graph = await dependencyClosure([
    ...freeNames.map((name) => `src/components/ui/${name}.tsx`),
    "scripts/generate-tokens.mjs",
  ]),
  free = new Map();
for (const file of [
  ...graph.files,
  "tokens/aureform.tokens.json",
  "src/styles/tokens.css",
  "src/styles/effects.css",
  "src/app/globals.css",
  "THIRD_PARTY_NOTICES.md",
  "components.json",
  ...freeNames.map((name) => `public/r/${name}.json`),
])
  free.set(file, await readFile(resolve(kitRoot, file)));
for (const item of await readdir(resolve(kitRoot, "licenses/third-party")))
  free.set(
    `licenses/third-party/${item}`,
    await readFile(resolve(kitRoot, `licenses/third-party/${item}`)),
  );
for (const item of await readdir(resolve(kitRoot, "src/assets/fonts")))
  free.set(
    `src/assets/fonts/${item}`,
    await readFile(resolve(kitRoot, `src/assets/fonts/${item}`)),
  );
free.set(
  "package.json",
  JSON.stringify(
    {
      name: "aureform-component-sample",
      version: kitManifest.version,
      private: true,
      type: "module",
      license: "Apache-2.0",
      scripts: { tokens: kitManifest.scripts.tokens },
      dependencies: {
        ...graph.dependencies,
        react: kitManifest.dependencies.react,
        "react-dom": kitManifest.dependencies["react-dom"],
      },
    },
    null,
    2,
  ) + "\n",
);
free.set(
  "README.md",
  `# Aureform UI ${kitManifest.version} — component sample\n\nEight original source components: Button, Input, Textarea, Card, Badge, Avatar, Alert and Skeleton. Their local imports, appearance props, semantic theme, pure palette configuration, token generator and its helper, local font assets and notices are included. The full suite is also open source at https://github.com/terrizoaguimor/aureform-ui; this smaller archive is an optional starting point with the same license.\n\nUse Node 22.16+ and a Next.js / React / TypeScript / Tailwind CSS 4 project with @/* mapped to ./src/*. Merge the listed npm dependencies and copy the supplied src/components/ui, src/lib and src/styles files. Import the supplied globals.css, which imports tokens.css and effects.css, from your app's root layout. Keep their relative paths intact. Configure local fonts or use your existing interface font. pnpm tokens refreshes defaults from src/lib/appearance.ts and requires Node's type stripping. Individual local shadcn registry files are in public/r/.\n\nOriginal Aureform files in this archive are licensed under the included Apache 2.0 LICENSE. Retain NOTICE and the applicable upstream notices when distributing them. Upstream libraries and fonts retain their licenses. The legacy aureform-ui-free.zip filename remains for existing links; it does not represent a separate license tier.\n`,
);
await save("aureform-ui-free", free);
await save("aureform-ui-source", await tree(kitRoot));
await writeFile(
  resolve(kitRoot, "public/downloads/checksums.json"),
  JSON.stringify({ version: kitManifest.version, archives }, null, 2) + "\n",
);
console.log(
  archives
    .map(
      (item) =>
        `${item.name}: ${item.files} files, ${(item.bytes / 1024 / 1024).toFixed(2)} MB, SHA256 ${item.sha256}`,
    )
    .join("\n"),
);
