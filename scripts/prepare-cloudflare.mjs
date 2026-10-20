import assert from "node:assert/strict";
import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { findPackageJSON } from "node:module";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const exportDirectory = join(root, "out");
const archivePath = "downloads/aureform-ui-source.zip";
const assetSizeLimit = 25 * 1024 * 1024;
const assetCountLimit = 20_000;

const portablePath = (path) =>
  relative(exportDirectory, path).split(sep).join("/");

async function inventory(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await inventory(path)));
    } else {
      assert(
        entry.isFile(),
        `The export must contain regular files, not symlinks: ${path}`,
      );
      files.push({ path: portablePath(path), bytes: (await lstat(path)).size });
    }
  }
  return files;
}

async function main() {
  assert.equal(
    process.argv.length,
    2,
    "This command does not accept arguments.",
  );
  const { version } = JSON.parse(
    await readFile(join(root, "package.json"), "utf8"),
  );
  assert(
    typeof version === "string" && /^\d+\.\d+\.\d+$/.test(version),
    "package.json must contain a stable release version such as 1.4.1.",
  );
  // The owner publishes this matching release asset before deployment.
  // Preparation stays offline and does not check GitHub or Cloudflare.
  const archiveURL = `https://github.com/terrizoaguimor/aureform-ui/releases/download/v${version}/aureform-ui-source.zip`;
  const sourceInfo = await lstat(exportDirectory).catch((error) => {
    if (error.code === "ENOENT") {
      throw new Error("No out/ export exists. Run pnpm build first.");
    }
    throw error;
  });
  assert(sourceInfo.isDirectory(), "out/ must be a regular directory.");
  const files = await inventory(exportDirectory);
  for (const required of ["index.html", "404.html"]) {
    assert(
      files.some((file) => file.path === required && file.bytes > 0),
      `out/${required} is required. Run pnpm build first.`,
    );
  }
  const homepage = await readFile(join(exportDirectory, "index.html"), "utf8");
  const basePaths = new Set();
  for (const [, url] of homepage.matchAll(
    /\b(?:href|src)="([^"]*\/_next\/[^"]*)"/g,
  )) {
    if (url.startsWith("/") && !url.startsWith("//")) {
      const basePath = url.slice(0, url.indexOf("/_next/"));
      if (basePath) basePaths.add(basePath);
    }
  }
  const exportBasePaths = [...basePaths].sort();
  if (exportBasePaths.length) {
    console.warn(
      `The export uses ${exportBasePaths.join(", ")}. Packaging can be validated locally, but rebuild with NEXT_PUBLIC_BASE_PATH="" before deploying to aureformui.com.`,
    );
  }
  const assets = files.filter((file) => file.path !== archivePath);
  for (const file of assets) {
    assert(
      file.bytes <= assetSizeLimit,
      `${file.path} exceeds Cloudflare's 25 MiB asset limit (${file.bytes} bytes). Only ${archivePath} is excluded.`,
    );
  }
  assert(
    assets.length + 1 <= assetCountLimit,
    `The export exceeds the ${assetCountLimit} static asset limit for the Free plan.`,
  );

  const hasRedirects = files.some((file) => file.path === "_redirects");
  const existingRedirects = hasRedirects
    ? await readFile(join(exportDirectory, "_redirects"), "utf8")
    : "";
  assert(
    !existingRedirects
      .split("\n")
      .some((line) => line.trim().split(/\s+/)[0] === `/${archivePath}`),
    `out/_redirects already declares /${archivePath}; review that rule before packaging.`,
  );

  // These helpers are dependencies of the pinned cf package. Resolve through
  // cf so pnpm's isolated dependency layout needs no extra direct dependency.
  const cfPackageURL = import.meta.resolve("cf/package.json");
  const importDependency = async (name) => {
    const packageURL = pathToFileURL(findPackageJSON(name, cfPackageURL));
    const metadata = JSON.parse(await readFile(packageURL, "utf8"));
    const entrypoint = metadata.exports?.["."]?.import;
    assert(
      typeof entrypoint === "string",
      `${name} must expose an ESM entrypoint in the pinned cf dependency.`,
    );
    return import(new URL(entrypoint, packageURL).href);
  };
  const [buildOutputUtils, configUtils] = await Promise.all([
    importDependency("@cloudflare/build-output-utils"),
    importDependency("@cloudflare/config"),
  ]);
  const {
    getRootConfigPath,
    getWorkerAssetsDir,
    readBuildOutput,
    writeRootConfig,
    writeWorkerConfig,
  } = buildOutputUtils;
  const buildContext = { isPreview: false, mode: undefined };
  const { result } = await configUtils.loadAndParseConfig(
    join(root, "cloudflare.config.ts"),
    buildContext,
  );
  if (!result.success) throw result.error;
  const { worker, containers, ...settings } = result.data;
  assert(worker, "cloudflare.config.ts must define the static asset Worker.");
  assert(
    !worker.entrypoint,
    "This adapter prepares an assets-only deployment.",
  );
  assert(!containers?.length, "This adapter does not build Containers.");

  const outputDirectory = dirname(getRootConfigPath(root));
  // Only replace generated Build Output. Never follow a parent symlink into
  // the source export, dependencies, or the owner's authentication state.
  for (const directory of [
    join(root, ".cloudflare"),
    dirname(outputDirectory),
    outputDirectory,
  ]) {
    const info = await lstat(directory).catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    assert(
      !info || info.isDirectory(),
      `Refusing to replace Cloudflare output through a symlink or file: ${directory}`,
    );
  }
  await rm(outputDirectory, { recursive: true, force: true });
  const assetsDirectory = getWorkerAssetsDir(root);
  await mkdir(assetsDirectory, { recursive: true });
  await cp(exportDirectory, assetsDirectory, {
    recursive: true,
    filter: (path) => portablePath(path) !== archivePath,
  });
  await writeFile(
    join(assetsDirectory, "_redirects"),
    `# Cloudflare-only source download; the original out/ is unchanged.\n/${archivePath} ${archiveURL} 302\n${existingRedirects}`,
  );
  await writeWorkerConfig({ root, config: worker });
  await writeRootConfig(root, settings, buildContext);
  const output = await readBuildOutput(root);
  assert(
    output.workers.default.assetsDir,
    "Build Output must contain assets/.",
  );
  assert.equal(output.workers.default.bundleDir, undefined);
  assert.equal(output.workers.default.config.manifest, undefined);

  console.log(
    JSON.stringify(
      {
        status: "prepared",
        worker: output.workers.default.config.name,
        version,
        buildOutput: relative(root, outputDirectory),
        assets: assets.length + (hasRedirects ? 0 : 1),
        rootDomainExport: exportBasePaths.length === 0,
        exportBasePaths,
        preservedZIPs: assets.filter((file) => file.path.endsWith(".zip"))
          .length,
        largestAssetBytes: Math.max(...assets.map((file) => file.bytes)),
        excluded: files.filter((file) => file.path === archivePath),
        sourceArchiveRedirect: archiveURL,
        wwwRedirect:
          "Owner-managed Cloudflare Redirect Rule; see deployment docs.",
        validate: "pnpm exec cf deploy --prebuilt --dry-run",
      },
      null,
      2,
    ),
  );
}

await main().catch((error) => {
  console.error(
    `Cloudflare preparation failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
