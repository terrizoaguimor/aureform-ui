import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const fixtures = join(root, "scripts/optional-bindings");
const receiptPath = join(root, "docs/integrations/optional-binding-validation.json");
const arguments_ = new Set(process.argv.slice(2));
if (arguments_.has("--help")) {
  console.log(`Verify optional native SDK examples without adding root dependencies.

Usage: node scripts/verify-optional-bindings.mjs [--write-receipt] [--keep]

Requires the checkout's normal dependencies, Node >=22.12 and pnpm 10.
Installs exact SDK packages from the public npm registry into a new OS temp
directory with the included frozen lockfile and disabled lifecycle scripts.
Copies the six documented TSX files, checks the real Aureform imports with
strict/noEmit/skipLibCheck:true, checks Mapbox declarations separately without
skipLibCheck, and runs four offline serialization fixtures.
No ambient stubs, provider credentials or application build are used.
--write-receipt updates only docs/integrations/optional-binding-validation.json.
--keep preserves the temporary verification directory for inspection.`);
  process.exit(0);
}
for (const argument of arguments_) {
  assert.ok(["--write-receipt", "--keep"].includes(argument), `Unknown option: ${argument}`);
}
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
assert.ok(nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 12), "Use Node >=22.12.");
await readFile(join(root, "node_modules/next/package.json"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [
  "docs/integrations/editors.md",
  "docs/integrations/mapbox-binding.md",
];
const sources = [];
for (const file of sourceFiles) {
  const markdown = await readFile(join(root, file), "utf8");
  const blocks = [...markdown.matchAll(/^```tsx(?: filename="([^"]+)")?\n([\s\S]*?)^```/gm)];
  assert.equal(blocks.length, file.endsWith("/editors.md") ? 5 : 1, `Unexpected TSX block count in ${file}.`);
  for (const [index, block] of blocks.entries()) {
    const filename = block[1] ?? "mapbox-binding.tsx";
    assert.ok(basename(filename) === filename && filename.endsWith(".tsx"), "Unsafe example filename.");
    assert.ok(!sources.some((source) => source.filename === filename), "Duplicate example filename.");
    sources.push({ file, block: index + 1, filename, payload: block[2] });
  }
}
const sandbox = await mkdtemp(join(tmpdir(), "aureform-optional-bindings-"));
const environment = {
  PATH: [dirname(process.execPath), process.env.PATH ?? ""].join(delimiter),
  CI: "true",
  NPM_CONFIG_USERCONFIG: join(sandbox, "empty-user.npmrc"),
  NPM_CONFIG_GLOBALCONFIG: join(sandbox, "empty-global.npmrc"),
  XDG_CONFIG_HOME: join(sandbox, "config"),
  XDG_CACHE_HOME: join(sandbox, "cache"),
  XDG_STATE_HOME: join(sandbox, "state"),
};
for (const path of [environment.XDG_CONFIG_HOME, environment.XDG_CACHE_HOME, environment.XDG_STATE_HOME]) {
  await mkdir(path, { recursive: true });
}
await writeFile(environment.NPM_CONFIG_USERCONFIG, "");
await writeFile(environment.NPM_CONFIG_GLOBALCONFIG, "");
async function run(command, arguments_, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd: sandbox,
      env: environment,
      shell: false,
      stdio: capture ? ["ignore", "pipe", "pipe"] : ["ignore", "inherit", "inherit"],
    });
    let stdout = "", stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${command} exited ${code}.${stdout ? `\n${stdout}` : ""}${stderr ? `\n${stderr}` : ""}`));
    });
  });
}
try {
  await copyFile(join(fixtures, "package.json"), join(sandbox, "package.json"));
  await copyFile(join(fixtures, "pnpm-lock.yaml"), join(sandbox, "pnpm-lock.yaml"));
  const pnpmVersion = await run("pnpm", ["--version"], { capture: true });
  assert.ok(pnpmVersion.startsWith("10."), "Use pnpm 10 with the checked-in lockfile.");
  console.log("Installing optional SDKs in a new isolated temporary directory.");
  await run("pnpm", [
    "install", "--frozen-lockfile", "--ignore-scripts",
    "--registry=https://registry.npmjs.org",
    "--store-dir", join(sandbox, "store"),
    "--cache-dir", join(sandbox, "cache"),
  ]);
  for (const source of sources) await writeFile(join(sandbox, source.filename), source.payload);
  const config = {
    compilerOptions: {
      target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx",
      strict: true, noEmit: true, skipLibCheck: true,
      esModuleInterop: true, resolveJsonModule: true,
      baseUrl: root, paths: { "@/*": ["src/*"] },
      typeRoots: [join(sandbox, "node_modules/@types"), join(root, "node_modules/@types")],
    },
    files: sources.map((source) => source.filename),
  };
  await writeFile(join(sandbox, "tsconfig.json"), JSON.stringify(config, null, 2) + "\n");
  await run(process.execPath, [join(sandbox, "node_modules/typescript/bin/tsc"), "--project", join(sandbox, "tsconfig.json"), "--pretty", "false"]);
  const mapboxConfig = {
    compilerOptions: { ...config.compilerOptions, skipLibCheck: false },
    files: ["mapbox-binding.tsx"],
  };
  await writeFile(join(sandbox, "tsconfig.mapbox.json"), JSON.stringify(mapboxConfig, null, 2) + "\n");
  await run(process.execPath, [join(sandbox, "node_modules/typescript/bin/tsc"), "--project", join(sandbox, "tsconfig.mapbox.json"), "--pretty", "false"]);
  await copyFile(join(fixtures, "roundtrips.mjs"), join(sandbox, "roundtrips.mjs"));
  await run(process.execPath, [join(sandbox, "roundtrips.mjs"), join(sandbox, "roundtrip-results.json")]);
  const roundtrips = JSON.parse(await readFile(join(sandbox, "roundtrip-results.json"), "utf8"));
  assert.equal(roundtrips.passed, 4);
  assert.equal(roundtrips.failed, 0);
  assert.equal(roundtrips.networkRequests, 0);
  const manifest = JSON.parse(await readFile(join(fixtures, "package.json"), "utf8"));
  const pins = { ...manifest.dependencies, ...manifest.devDependencies };
  const packages = [];
  for (const [name, expectedVersion] of Object.entries(pins).sort(([a], [b]) => a.localeCompare(b))) {
    const directory = join(sandbox, "node_modules", name);
    const bytes = await readFile(join(directory, "package.json"));
    const package_ = JSON.parse(bytes);
    assert.equal(package_.version, expectedVersion, `${name} must retain its exact pinned version.`);
    const types = package_.types ?? package_.typings;
    packages.push({
      name, version: package_.version, license: package_.license ?? null,
      packageJsonSha256: sha256(bytes),
      ...(types ? { declarations: types, declarationsSha256: sha256(await readFile(join(directory, types))) } : {}),
    });
  }
  for (const source of sources) {
    const current = await readFile(join(root, source.file), "utf8");
    const block = [...current.matchAll(/^```tsx(?: filename="([^"]+)")?\n([\s\S]*?)^```/gm)][source.block - 1];
    assert.equal(block?.[2], source.payload, "An example changed during verification; rerun on the final source.");
  }
  const receipt = {
    schemaVersion: 1,
    status: "passed",
    checkedAt: new Date().toISOString(),
    aureformVersion: JSON.parse(await readFile(join(root, "package.json"), "utf8")).version,
    toolchain: { node: process.versions.node, pnpm: pnpmVersion, typescript: pins.typescript },
    reproduction: "node scripts/verify-optional-bindings.mjs --write-receipt",
    installation: {
      isolated: true, registry: "https://registry.npmjs.org", frozenLockfile: true, lifecycleScripts: false,
      manifest: "scripts/optional-bindings/package.json",
      manifestSha256: sha256(await readFile(join(fixtures, "package.json"))),
      lockfile: "scripts/optional-bindings/pnpm-lock.yaml",
      lockfileSha256: sha256(await readFile(join(fixtures, "pnpm-lock.yaml"))),
    },
    compiler: {
      strict: true, noEmit: true, skipLibCheck: true, ambientStubs: 0, diagnostics: 0,
      tsxBlocks: sources.length, realAureformImports: true,
      additionalCheck: { binding: "mapbox", strict: true, noEmit: true, skipLibCheck: false, diagnostics: 0, tsxBlocks: 1 },
    },
    scripts: ["scripts/verify-optional-bindings.mjs", "scripts/optional-bindings/roundtrips.mjs"].map((file) => ({ file })),
    examples: sources.map(({ payload, ...source }) => ({
      ...source, bytes: Buffer.byteLength(payload), sha256: sha256(payload),
    })),
    packages,
    roundtrips,
    scope: [
      "Strict consumer code using official SDK types; local JSON/change-event verification.",
      "Consumer examples skip upstream declaration checking as in G5; a separate Mapbox-only project checks declarations completely.",
      "Mapbox runtime fixture checks coordinates/bounds and GeoJSON serialization, not WebGL rendering or tile delivery.",
      "No native provider/account connection, credential validation, browser certification or Figma certification.",
      "BlockNote exports optional Yjs declarations; their library internals are not verified or replaced with ambient stubs.",
    ],
  };
  for (const script of receipt.scripts) script.sha256 = sha256(await readFile(join(root, script.file)));
  if (arguments_.has("--write-receipt")) await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
  console.log(`PASS: ${sources.length} TSX blocks, 0 diagnostics, ${roundtrips.passed}/4 local round-trips.`);
  console.log(`Mapbox ${pins["mapbox-gl"]}; Tiptap ${pins["@tiptap/core"]}; Lexical ${pins.lexical}; BlockNote ${pins["@blocknote/core"]}.`);
  if (arguments_.has("--write-receipt")) console.log("Public receipt: docs/integrations/optional-binding-validation.json");
} finally {
  if (arguments_.has("--keep")) console.log(`Temporary verification directory: ${sandbox}`);
  else await rm(sandbox, { recursive: true, force: true });
}
