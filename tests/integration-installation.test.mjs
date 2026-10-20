import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const execute = promisify(execFile);
const items = [
  "integration-hub",
  "integrations-suite",
  "identity-integration-panel",
  "ai-integration",
  "commerce-providers",
  "connected-map",
  "drive-picker",
  "drive-picker-panel",
  "media-collection",
  "media-collection-panel",
  "enterprise-diagnostics",
  "product-editor-controls",
  "search-bridge-command",
];
const entryFiles = {
  "integration-hub": "src/components/integrations/integration-hub.tsx",
  "integrations-suite": "src/lib/integrations/http-suite.ts",
  "identity-integration-panel":
    "src/components/integrations/identity-panel.tsx",
  "ai-integration": "src/lib/ai-integration.ts",
  "commerce-providers": "src/lib/provider-commerce-adapter.ts",
  "connected-map": "src/components/integrations/connected-map.tsx",
  "drive-picker": "src/lib/integrations/drive-picker.ts",
  "drive-picker-panel": "src/components/integrations/drive-picker-panel.tsx",
  "media-collection": "src/lib/integrations/media-collection.ts",
  "media-collection-panel":
    "src/components/integrations/media-collection-panel.tsx",
  "enterprise-diagnostics":
    "src/components/integrations/enterprise-diagnostics.tsx",
  "product-editor-controls":
    "src/components/integrations/product-editor-controls.tsx",
  "search-bridge-command":
    "src/components/integrations/search-bridge-command.tsx",
};
const notices = ["LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md"];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const slash = (path) => path.replaceAll(sep, "/");
const rootManifest = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
const environment = {
  ...process.env,
  NPM_CONFIG_USERCONFIG: "/dev/null",
  NO_COLOR: "1",
};

// Deliberately different roots exercise UI, component, lib, hook and other
// source aliases independently. There is no @/* escape back into the kit.
const compilerOptions = {
  target: "ES2017",
  lib: ["dom", "dom.iterable", "esnext"],
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  esModuleInterop: true,
  module: "esnext",
  moduleResolution: "bundler",
  resolveJsonModule: true,
  isolatedModules: true,
  jsx: "react-jsx",
  forceConsistentCasingInFileNames: true,
  types: ["node", "react", "react-dom"],
  paths: {
    "~/*": ["./application/*"],
    "~ui/*": ["./design-system/*"],
    "~components/*": ["./interface/*"],
    "~lib/*": ["./domain/*"],
    "~hooks/*": ["./behaviour/*"],
  },
};

function targetPath(source) {
  for (const [prefix, destination] of [
    ["src/components/ui/", "design-system/primitives/"],
    ["src/components/", "interface/widgets/"],
    ["src/lib/", "domain/services/"],
    ["src/hooks/", "behaviour/browser/"],
    ["src/", "application/"],
  ]) {
    if (source.startsWith(prefix))
      return destination + source.slice(prefix.length);
  }
  return source;
}

async function fixture(t) {
  const project = await mkdtemp(
    resolve(tmpdir(), "aureform-integration-install-"),
  );
  t.after(() => rm(project, { recursive: true, force: true }));
  await mkdir(resolve(project, "application/app"), { recursive: true });
  await writeFile(
    resolve(project, "application/app/globals.css"),
    '@import "tailwindcss";\n/* Consumer styles must remain. */\n',
  );
  await writeFile(
    resolve(project, "package.json"),
    JSON.stringify(
      {
        name: "integration-installation-consumer",
        private: true,
        type: "module",
        dependencies: Object.fromEntries(
          ["react", "react-dom", "next"].map((name) => [
            name,
            rootManifest.dependencies[name],
          ]),
        ),
        devDependencies: Object.fromEntries(
          [
            "typescript",
            "@types/node",
            "@types/react",
            "@types/react-dom",
            "tailwindcss",
          ].map((name) => [name, rootManifest.devDependencies[name]]),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    resolve(project, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions,
        include: ["**/*.ts", "**/*.tsx"],
        exclude: ["node_modules"],
      },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    resolve(project, "components.json"),
    JSON.stringify(
      {
        tailwind: { css: "application/app/globals.css" },
        aliases: {
          ui: "~ui/primitives",
          components: "~components/widgets",
          lib: "~lib/services",
          utils: "~lib/services/utils",
          hooks: "~hooks/browser",
        },
      },
      null,
      2,
    ) + "\n",
  );
  // add installs source, not distribution notices. The consumer retains the
  // source kit's notices explicitly; every CLI operation must preserve them.
  for (const path of notices) {
    await writeFile(
      resolve(project, path),
      await readFile(resolve(root, path)),
    );
  }
  // Real frozen dependencies and their actual declarations, never ambient
  // module stubs or replacement SDK types. This does not install packages.
  await symlink(
    resolve(root, "node_modules"),
    resolve(project, "node_modules"),
    "dir",
  );
  return project;
}

async function command(project, arguments_ = []) {
  try {
    const result = await execute(
      process.execPath,
      [
        resolve(root, "bin/aureform.mjs"),
        "add",
        ...items,
        "--cwd",
        project,
        ...arguments_,
      ],
      {
        cwd: project,
        env: environment,
        timeout: 30_000,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    return { ...result, status: 0 };
  } catch (error) {
    if (!Number.isInteger(error.code)) throw error;
    return { stdout: error.stdout, stderr: error.stderr, status: error.code };
  }
}

async function install(project) {
  const result = await command(project);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  for (const name of items) assert(result.stdout.includes(name), result.stdout);
  return JSON.parse(
    await readFile(resolve(project, ".aureform/manifest.json"), "utf8"),
  );
}

async function tree(project) {
  const result = {};
  async function visit(path) {
    const info = await lstat(path, { bigint: true });
    const name = slash(relative(project, path));
    result[name] = {
      mode: String(info.mode),
      inode: String(info.ino),
      modified: String(info.mtimeNs),
    };
    if (info.isSymbolicLink()) {
      result[name].link = await readlink(path);
    } else if (info.isDirectory()) {
      result[name].directory = true;
      for (const child of (await readdir(path)).sort())
        await visit(resolve(path, child));
    } else {
      assert(info.isFile(), name);
      result[name].sha256 = hash(await readFile(path));
    }
  }
  await visit(project);
  return result;
}

function sourcesFrom(receipt) {
  assert.equal(receipt.schemaVersion, 1);
  assert.deepEqual(Object.keys(receipt.items).sort(), [...items].sort());
  const files = new Map();
  for (const name of items) {
    const item = receipt.items[name];
    assert.equal(item.name, name);
    assert.equal(item.origin, rootManifest.name);
    assert.equal(item.kitVersion, rootManifest.version);
    assert(
      item.files.some((file) => file.sourcePath === entryFiles[name]),
      name,
    );
    for (const file of item.files.filter((file) => file.kind === "source")) {
      assert.equal(
        file.targetPath,
        targetPath(file.sourcePath),
        file.sourcePath,
      );
      if (files.has(file.sourcePath))
        assert.deepEqual(file, files.get(file.sourcePath));
      files.set(file.sourcePath, file);
    }
  }
  return files;
}

function configuration(project) {
  const path = resolve(project, "tsconfig.json");
  const loaded = ts.readConfigFile(path, ts.sys.readFile);
  assert.equal(loaded.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(
    loaded.config,
    ts.sys,
    project,
    {},
    path,
  );
  assert.deepEqual(parsed.errors, []);
  return parsed;
}

function sourceSyntax(path, source) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  assert.deepEqual(
    file.parseDiagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    ),
    [],
    path,
  );
  const imports = [];
  const assets = new Set();
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    )
      imports.push(node.moduleSpecifier.text);
    else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    )
      imports.push(node.argument.literal.text);
    else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    )
      imports.push(node.moduleReference.expression.text);
    else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    )
      imports.push(node.arguments[0].text);
    if (
      ts.isStringLiteralLike(node) &&
      node.text.startsWith("/assets/") &&
      !node.text.endsWith("/")
    )
      assets.add(node.text);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return { imports, assets };
}

function packageName(specifier) {
  return specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0];
}

function resolveModule(specifier, file, options) {
  if (specifier.endsWith(".css")) {
    // TypeScript does not resolve CSS modules. Resolve their actual copied
    // path or real package stylesheet without an ambient declaration.
    if (
      !specifier.startsWith(".") &&
      !specifier.startsWith("@/") &&
      !Object.keys(options.paths ?? {}).some((alias) =>
        specifier.startsWith(alias.slice(0, -1)),
      )
    ) {
      return createRequire(file).resolve(specifier);
    }
    const matches = Object.entries(options.paths ?? {}).find(([alias]) =>
      specifier.startsWith(alias.slice(0, -1)),
    );
    return matches
      ? resolve(
          dirname(options.configFilePath),
          matches[1][0].replace("*", specifier.slice(matches[0].length - 1)),
        )
      : resolve(dirname(file), specifier);
  }
  return ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule
    ?.resolvedFileName;
}

test("integration CLI dry-run and diff leave the entire custom-alias consumer unchanged", async (t) => {
  const project = await fixture(t);
  const before = await tree(project);
  for (const flag of ["--dry-run", "--diff"]) {
    const result = await command(project, [flag]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /Status: ready\. No files written; no packages installed\./,
    );
    for (const path of Object.values(entryFiles)) {
      assert(result.stdout.includes(targetPath(path)), path);
    }
    assert.match(
      result.stdout,
      /public\/assets\/products\/forma-desk-lamp\.svg/,
    );
    assert.match(result.stdout, /ADD zod:/);
    if (flag === "--diff")
      assert.match(result.stdout, /from ["']~lib\/services\//);
    assert.deepEqual(await tree(project), before, flag);
  }
});

test("all thirteen installed entries close every local import and merge only their real dependencies", async (t) => {
  const project = await fixture(t);
  const receipt = await install(project);
  const files = sourcesFrom(receipt);
  const kitOptions = configuration(root).options;
  const options = configuration(project).options;
  const manifest = JSON.parse(
    await readFile(resolve(project, "package.json"), "utf8"),
  );
  let localImports = 0;
  let externalImports = 0;
  for (const [path, record] of files) {
    const original = await readFile(resolve(root, path));
    const copied = await readFile(resolve(project, record.targetPath));
    assert.equal(record.sourceHash, hash(original), path);
    assert.equal(record.targetHash, hash(copied), path);
    if (!/\.[cm]?[jt]sx?$/.test(path)) continue;
    const originalImports = sourceSyntax(path, original.toString()).imports;
    const copiedImports = sourceSyntax(
      record.targetPath,
      copied.toString(),
    ).imports;
    assert.equal(copiedImports.length, originalImports.length, path);
    for (const [index, specifier] of originalImports.entries()) {
      const installedSpecifier = copiedImports[index];
      if (specifier.startsWith("@/") || specifier.startsWith(".")) {
        const originalFile = resolveModule(
          specifier,
          resolve(root, path),
          kitOptions,
        );
        assert(originalFile, `${path}: ${specifier}`);
        const sourcePath = slash(relative(root, originalFile));
        const required = files.get(sourcePath);
        assert(
          required,
          `Missing dependency in receipt: ${path} -> ${sourcePath}`,
        );
        assert(
          !installedSpecifier.startsWith("@/"),
          `${path}: ${installedSpecifier}`,
        );
        const installedFile = resolveModule(
          installedSpecifier,
          resolve(project, record.targetPath),
          options,
        );
        assert.equal(
          installedFile,
          resolve(project, required.targetPath),
          `${path}: ${installedSpecifier}`,
        );
        await lstat(installedFile);
        localImports++;
      } else {
        assert.equal(
          installedSpecifier,
          specifier,
          `${path}: external import changed`,
        );
        if (specifier.startsWith("node:")) continue;
        const name = packageName(specifier);
        const dependency = rootManifest.dependencies[name]
          ? name
          : `@types/${name}`;
        assert(
          manifest.dependencies[dependency] ||
            manifest.devDependencies[dependency],
          `Undeclared consumer dependency: ${path} -> ${dependency}`,
        );
        const resolved = resolveModule(
          installedSpecifier,
          resolve(project, record.targetPath),
          options,
        );
        assert(
          resolved,
          `Missing real installed dependency: ${path} -> ${specifier}`,
        );
        externalImports++;
      }
    }
  }
  for (const item of Object.values(receipt.items)) {
    for (const group of ["dependencies", "devDependencies"]) {
      for (const [name, version] of Object.entries(item[group])) {
        assert.equal(manifest[group][name], version, name);
      }
    }
  }
  for (const path of notices) {
    assert.deepEqual(
      await readFile(resolve(project, path)),
      await readFile(resolve(root, path)),
    );
  }
  assert(
    files.has("src/lib/integrations/definitions.ts"),
    "Copy complete provider recipes.",
  );
  assert(
    !files.has("src/components/app-page.tsx"),
    "A reusable installation needs no demo app shell.",
  );
  assert(localImports > 100);
  assert(externalImports > 25);
  t.diagnostic(
    `${files.size} copied sources; ${localImports} local imports; ${externalImports} real package imports.`,
  );
});

test("copied integration sources and a consumer host compile strictly against actual dependency types", async (t) => {
  const project = await fixture(t);
  const receipt = await install(project);
  const files = sourcesFrom(receipt);
  const example = `"use client";
import type { ComponentProps } from "react";
import { Providers } from "~components/widgets/providers";
import { IntegrationHub } from "~components/widgets/integrations/integration-hub";
import { IdentityIntegrationPanel } from "~components/widgets/integrations/identity-panel";
import { GoogleIntegrationMap, MapLibreIntegrationMap } from "~components/widgets/integrations/connected-map";
import { DrivePickerPanel } from "~components/widgets/integrations/drive-picker-panel";
import { MediaCollectionPanel } from "~components/widgets/integrations/media-collection-panel";
import { EnterpriseDiagnostics } from "~components/widgets/integrations/enterprise-diagnostics";
import { ProductEditorControls } from "~components/widgets/integrations/product-editor-controls";
import { SearchBridgeCommand } from "~components/widgets/integrations/search-bridge-command";
import { createHttpIntegrationSuite, type HttpIntegrationSuiteOptions } from "~lib/services/integrations/http-suite";
import type { IntegrationSuite } from "~lib/services/integrations/suite";
import type { IntegrationMapRenderer } from "~lib/services/integrations/map-renderer";
import { createGoogleDrivePickerBinding, type GoogleDrivePickerOptions } from "~lib/services/integrations/drive-picker";
import { createHttpMediaCollectionBinding } from "~lib/services/integrations/media-collection";
import { createAuthHttpAdapter, type AuthWorkflowAdapter } from "~lib/services/auth-integration";
import { createHttpAiWorkspaceAdapter, type AiWorkspaceAdapter } from "~lib/services/ai-integration";
import { createProviderCommerceAdapter } from "~lib/services/provider-commerce-adapter";
import type { CommerceAdapter } from "~lib/services/commerce";

const identity: AuthWorkflowAdapter = createAuthHttpAdapter({
  basePath: "/api/identity", providerId: "better-auth",
  redirectPolicy: { origin: "https://consumer.example" },
});
const aiOptions = {
  endpoint: "/api/ai/stream",
  models: [{ id: "consumer-model", provider: "openai-responses", label: "Consumer model" }],
} satisfies Parameters<typeof createHttpAiWorkspaceAdapter>[0];
export const ai: AiWorkspaceAdapter = createHttpAiWorkspaceAdapter(aiOptions);
const commerce: CommerceAdapter = createProviderCommerceAdapter({
  provider: "polar", baseUrl: "/api/commerce",
  trustedRedirectOrigins: ["https://checkout.consumer.example"],
});
const options = {
  connections: { baseUrl: "/api/integrations" },
  identity: { "better-auth": { basePath: "/api/identity", redirectPolicy: { origin: "https://consumer.example" } } },
  ai: { "openai-responses": aiOptions },
  commerce: { polar: { baseUrl: "/api/commerce", trustedRedirectOrigins: ["https://checkout.consumer.example"] } },
} satisfies HttpIntegrationSuiteOptions;
const suite: IntegrationSuite = createHttpIntegrationSuite(options);
export function withConsumerBindings(
  bindings: Required<NonNullable<IntegrationSuite["ui"]>>,
  pickerOptions: GoogleDrivePickerOptions,
): IntegrationSuite {
  const renderMap: IntegrationMapRenderer = (props) =>
    <MapLibreIntegrationMap {...props} style={{ version: 8, sources: {}, layers: [] }} />;
  return { ...suite, ui: {
    renderEditor: bindings.renderEditor,
    subscribeData: bindings.subscribeData,
    subscribe: bindings.subscribe,
    renderMap,
    drivePicker: createGoogleDrivePickerBinding(pickerOptions),
    media: createHttpMediaCollectionBinding({ baseUrl: "/api/integrations/media" }),
    enterprise: bindings.enterprise,
    commandSearch: bindings.commandSearch,
  } };
}
export function ConsumerIntegrations({ ui }: { ui?: IntegrationSuite["ui"] }) {
  return <Providers locale="en" commerceAdapter={commerce}>
    <IntegrationHub suite={{ ...suite, ui }} canManage />
    <IdentityIntegrationPanel providerId="better-auth" adapter={identity} />
  </Providers>;
}
// Compile the actual public component props and optional browser binding
// factories. No provider SDK is activated or exercised by this typecheck.
export function ConsumerOptionalPanels(props: {
  map: ComponentProps<typeof GoogleIntegrationMap>;
  drive: ComponentProps<typeof DrivePickerPanel>;
  media: ComponentProps<typeof MediaCollectionPanel>;
  enterprise: ComponentProps<typeof EnterpriseDiagnostics>;
  controls: ComponentProps<typeof ProductEditorControls>;
  search: ComponentProps<typeof SearchBridgeCommand>;
}) {
  return <>
    <GoogleIntegrationMap {...props.map} />
    <DrivePickerPanel {...props.drive} />
    <MediaCollectionPanel {...props.media} />
    <EnterpriseDiagnostics {...props.enterprise} />
    <ProductEditorControls {...props.controls} />
    <SearchBridgeCommand {...props.search} />
  </>;
}
`;
  await writeFile(resolve(project, "application/consumer.tsx"), example);
  const parsed = configuration(project);
  assert.equal(parsed.options.strict, true);
  assert(
    !parsed.fileNames.some((path) => path.endsWith(".d.ts")),
    "No ambient fixture declarations.",
  );
  for (const record of files.values()) {
    if (/\.tsx?$/.test(record.targetPath))
      assert(parsed.fileNames.includes(resolve(project, record.targetPath)));
  }
  const before = await tree(project);
  try {
    const result = await execute(
      process.execPath,
      [
        resolve(root, "node_modules/typescript/bin/tsc"),
        "--project",
        resolve(project, "tsconfig.json"),
        "--noEmit",
        "--incremental",
        "false",
        "--pretty",
        "false",
      ],
      {
        cwd: project,
        env: environment,
        timeout: 60_000,
        maxBuffer: 8 * 1024 * 1024,
      },
    );
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "");
  } catch (error) {
    assert.fail(
      `Strict compilation of copied sources failed:\n${error.stdout ?? ""}${error.stderr ?? error.message}`,
    );
  }
  assert.deepEqual(
    await tree(project),
    before,
    "No output or build-info emitted.",
  );
  t.diagnostic(
    `TypeScript ${ts.version}: ${parsed.fileNames.length} actual consumer sources, real declarations, no vendor SDK execution.`,
  );
});

test("installed integration assets preserve every local reference and embedded product crop raster", async (t) => {
  const project = await fixture(t);
  const receipt = await install(project);
  const files = sourcesFrom(receipt);
  const assets = new Set();
  for (const file of files.values()) {
    if (!/\.tsx?$/.test(file.targetPath)) continue;
    const source = await readFile(resolve(project, file.targetPath), "utf8");
    for (const asset of sourceSyntax(file.targetPath, source).assets)
      assets.add(asset);
  }
  const recordedAssets = new Map(
    Object.values(receipt.items).flatMap((item) =>
      item.files
        .filter((file) => file.kind === "asset")
        .map((file) => [file.sourcePath, file]),
    ),
  );
  const {
    canCropProductImage,
    extractProductRasterContainer,
    hasProductRasterSignature,
    productImageCropSource,
  } = await import(
    pathToFileURL(resolve(project, targetPath("src/lib/product-images.ts")))
      .href
  );
  for (const asset of assets) {
    const path = `public${asset}`;
    const original = await readFile(resolve(root, path));
    const installed = await readFile(resolve(project, path));
    assert.deepEqual(installed, original, path);
    const record = recordedAssets.get(path);
    assert(record, `Asset must appear in installation provenance: ${path}`);
    assert.equal(record.targetPath, path);
    assert.equal(record.sourceHash, hash(original));
    assert.equal(record.targetHash, hash(installed));
  }
  const products = [...assets].filter(canCropProductImage);
  assert(
    products.length >= 8,
    "Exercise all actual built-in product crop URLs.",
  );
  for (const asset of products) {
    // decodeProductRaster reads the SVG's embedded raster. Binary companions
    // are deliberately unnecessary in registry/source-only installations.
    const svg = await readFile(resolve(project, `public${asset}`), "utf8");
    const raster = extractProductRasterContainer(svg);
    assert.match(raster, /^data:image\/webp;base64,/);
    const bytes = Buffer.from(raster.slice(raster.indexOf(",") + 1), "base64");
    assert(hasProductRasterSignature(bytes, "image/webp"), asset);
    const companion = productImageCropSource(asset, (path) => path);
    assert.deepEqual(
      bytes,
      await readFile(resolve(root, `public${companion}`)),
      asset,
    );
  }
  t.diagnostic(
    `${recordedAssets.size} recorded assets; ${products.length} embedded crop rasters retain their exact WebP bytes.`,
  );
});

test("integration CLI protects customized source atomically and keeps repeated installs unchanged", async (t) => {
  const project = await fixture(t);
  const receipt = await install(project);
  const beforeRepeat = await tree(project);
  assert.equal((await command(project)).status, 0);
  assert.deepEqual(await tree(project), beforeRepeat);
  const identityPath = targetPath(entryFiles["identity-integration-panel"]);
  const original = await readFile(resolve(project, identityPath));
  await writeFile(
    resolve(project, identityPath),
    Buffer.concat([
      original,
      Buffer.from("\n/* Consumer-owned identity customization. */\n"),
    ]),
  );
  const missingPath = targetPath(entryFiles["ai-integration"]);
  await rm(resolve(project, missingPath));
  const customized = await tree(project);
  for (const flags of [["--dry-run"], ["--diff"], []]) {
    const result = await command(project, flags);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout + result.stderr, /Existing file protected:/);
    assert((result.stdout + result.stderr).includes(identityPath));
    if (flags.length) {
      assert.match(result.stdout, /CONFLICT \[customized\]/);
      assert.match(result.stdout, /Status: blocked/);
    }
    assert.deepEqual(
      await tree(project),
      customized,
      `No partial writes: ${flags.join(" ") || "add"}`,
    );
  }
  const approvedPreview = await command(project, ["--diff", "--overwrite"]);
  assert.equal(approvedPreview.status, 0, approvedPreview.stderr);
  assert.match(approvedPreview.stdout, /Status: ready/);
  assert.deepEqual(await tree(project), customized);
  const replaced = await command(project, ["--overwrite"]);
  assert.equal(replaced.status, 0, replaced.stderr);
  assert.deepEqual(await readFile(resolve(project, identityPath)), original);
  const aiRecord = receipt.items["ai-integration"].files.find(
    (file) => file.sourcePath === entryFiles["ai-integration"],
  );
  assert.equal(
    hash(await readFile(resolve(project, missingPath))),
    aiRecord.targetHash,
  );
  const replacedTree = await tree(project);
  for (const path of notices)
    assert.equal(replacedTree[path].sha256, customized[path].sha256);
});

test("an incompatible integration dependency blocks the CLI without merging or copying files", async (t) => {
  const project = await fixture(t);
  const path = resolve(project, "package.json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  manifest.dependencies.zod = "^3.0.0";
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
  const before = await tree(project);
  for (const flags of [["--dry-run"], []]) {
    const result = await command(project, flags);
    assert.equal(result.status, 1);
    assert.match(
      result.stdout + result.stderr,
      /Review dependency zod: destination uses \^3\.0\.0/,
    );
    assert.deepEqual(await tree(project), before);
  }
});
