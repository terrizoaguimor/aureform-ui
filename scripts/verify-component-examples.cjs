const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const ROOT = path.resolve(__dirname, "..");
const DEPS = process.env.AUREFORM_QA_NODE_MODULES
  ? path.resolve(process.env.AUREFORM_QA_NODE_MODULES)
  : path.join(ROOT, "node_modules");
const ts = require(
  process.env.AUREFORM_QA_NODE_MODULES
    ? path.join(DEPS, "typescript")
    : "typescript",
);
const read = (file) => fs.readFileSync(file, "utf8");
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
const reportPath = path.resolve(
  process.env.AUREFORM_QA_REPORT_DIR || path.join(ROOT, "artifacts"),
  "examples-validation/validation-summary.json",
);

// Execute only the real, pure export helpers. This does not substitute a test
// implementation for appearance.ts, import React, or touch a browser.
function loadAppearanceAPI(root = ROOT) {
  const filename = path.join(root, "src/lib/appearance.ts");
  const compiled = ts.transpileModule(read(filename), {
    fileName: filename,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.length, 0);
  const exports = {};
  vm.runInNewContext(compiled.outputText, { exports }, { filename });
  return exports;
}

function configuredProfiles(api = loadAppearanceAPI()) {
  const profiles = api.palettePresets.flatMap(({ id }, paletteIndex) =>
    ["light", "dark"].map((theme, themeIndex) => {
      const index = paletteIndex * 2 + themeIndex;
      const config = api.createAppearance(id, theme);
      Object.assign(config, {
        material: ["flat", "elevated", "glass", "gradient"][index % 4],
        radius: [0, 7, 16, 24][index % 4],
        density: index % 2 ? "compact" : "comfortable",
        typography: index % 3 ? "modern" : "editorial",
        motion: ["off", "gentle", "expressive"][index % 3],
        hover: ["none", "lift", "glow", "spotlight", "tilt", "magnetic"][
          index % 6
        ],
        shadow: [0, 0.27, 0.65, 1][index % 4],
        border: [0, 0.55, 0.83, 1][index % 4],
      });
      const count = 2 + (index % 3);
      config.gradient = {
        kind: ["linear", "radial", "mesh"][index % 3],
        angle: [0, 125, 231, 360][index % 4],
        intensity: [0, 0.34, 0.65, 1][index % 4],
        stops: Array.from({ length: count }, (_, stop) => ({
          color: Object.values(config.colors)[stop % 3],
          position: stop / (count - 1),
        })),
      };
      config.shader = {
        kind: ["none", "aurora", "waves", "iridescent"][index % 4],
        speed: [0, 0.17, 0.2, 1][index % 4],
        scale: [0.25, 1, 2.75, 4][index % 4],
        intensity: [0, 0.41, 0.55, 1][index % 4],
        paused: index % 3 === 0,
      };
      return { id: `${id}-${theme}`, config: api.normalizeAppearance(config) };
    }),
  );
  for (const theme of ["light", "dark"]) {
    const config = api.createAppearance("rose", theme);
    Object.assign(config, {
      colors: {
        primary: "#D946EF",
        secondary: "#06B6D4",
        tertiary: "#F59E0B",
      },
      material: theme === "light" ? "glass" : "gradient",
      radius: 9,
      density: theme === "light" ? "compact" : "comfortable",
      typography: "editorial",
      motion: "expressive",
      hover: theme === "light" ? "tilt" : "magnetic",
      shadow: 0.27,
      border: 0.83,
      gradient: {
        kind: "linear",
        angle: 271,
        intensity: 0.34,
        stops: [
          { color: "#123456", position: 0 },
          { color: "#56789A", position: 0.4 },
          { color: "#ABCDEF", position: 1 },
        ],
      },
      shader: {
        kind: "iridescent",
        speed: 0.17,
        scale: 2.75,
        intensity: 0.41,
        paused: true,
      },
    });
    profiles.push({
      id: `custom-${theme}`,
      config: api.normalizeAppearance(config),
    });
  }
  // Remove VM realm identity; these are ordinary JSON consumer profiles.
  return JSON.parse(JSON.stringify(profiles));
}

function catalogFamilies(root = ROOT) {
  const filename = path.join(root, "src/lib/catalog.ts");
  const parsed = ts.createSourceFile(
    filename,
    read(filename),
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = parsed.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((item) => item.name.getText(parsed) === "componentFamilies");
  assert(declaration?.initializer);
  const values = ts.isAsExpression(declaration.initializer)
    ? declaration.initializer.expression
    : declaration.initializer;
  assert(ts.isArrayLiteralExpression(values));
  const families = values.elements.map((item) => {
    assert(ts.isStringLiteral(item));
    return item.text;
  });
  assert.equal(families.length, 44);
  assert.equal(new Set(families).size, 44);
  return families;
}

function sourceRecord(root = ROOT) {
  const filename = path.join(root, "src/lib/component-example-sources.ts");
  const source = read(filename);
  const parsed = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  assert.equal(parsed.parseDiagnostics.length, 0);
  assert(
    parsed.statements
      .filter(ts.isImportDeclaration)
      .every((statement) => statement.importClause?.isTypeOnly),
    "The source record must not execute component imports.",
  );
  const declarations = parsed.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations);
  assert.equal(declarations.length, 1);
  const declaration = declarations[0];
  assert.equal(declaration.name.getText(parsed), "componentExampleSources");
  assert.equal(declaration.type?.getText(parsed), "Record<ComponentFamily, string>");
  assert(ts.isObjectLiteralExpression(declaration.initializer));
  assert(
    declaration.initializer.properties.every(
      (property) =>
        ts.isPropertyAssignment(property) &&
        ts.isStringLiteral(property.initializer),
    ),
    "Every source record entry must be a literal complete example.",
  );
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  });
  assert.equal(compiled.diagnostics?.length, 0);
  const exports = {};
  vm.runInNewContext(compiled.outputText, { exports }, { filename });
  return { filename, source, ...exports };
}

function parseTSX(source, filename) {
  const parsed = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  assert.equal(parsed.parseDiagnostics.length, 0, `${filename}: invalid TSX.`);
  assert.equal(parsed.statements[0].expression?.text, "use client");
  return parsed;
}

const isDefaultFunction = (statement) =>
  ts.isFunctionDeclaration(statement) &&
  statement.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
  );

function exportedAppearance(source, filename = "configured-example.tsx") {
  const parsed = parseTSX(source, filename);
  const defaults = parsed.statements.filter(isDefaultFunction);
  assert.equal(defaults.length, 1, `${filename}: one default entry is required.`);
  assert.equal(defaults[0].parameters.length, 0);
  const declaration = parsed.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .find((item) => item.name.getText(parsed) === "appearance");
  assert(declaration?.initializer, `${filename}: complete profile missing.`);
  assert.equal(declaration.type?.getText(parsed), "AppearanceConfig");
  assert(ts.isObjectLiteralExpression(declaration.initializer));
  const appearance = JSON.parse(declaration.initializer.getText(parsed));
  let scopeCount = 0;
  const visit = (node) => {
    if (
      ts.isJsxOpeningElement(node) &&
      node.tagName.getText(parsed) === "AppearanceScope"
    ) {
      const attribute = node.attributes.properties.find(
        (item) => ts.isJsxAttribute(item) && item.name.getText(parsed) === "appearance",
      );
      assert(ts.isJsxExpression(attribute?.initializer));
      assert.equal(attribute.initializer.expression?.getText(parsed), "appearance");
      scopeCount++;
    }
    ts.forEachChild(node, visit);
  };
  visit(defaults[0]);
  assert.equal(scopeCount, 1, `${filename}: the entry must apply the profile.`);
  return { parsed, appearance, entry: defaults[0] };
}

function validateConfiguredExample(
  source,
  config,
  original,
  filename = "configured-example.tsx",
) {
  const { parsed, appearance, entry } = exportedAppearance(source, filename);
  assert.deepEqual(appearance, JSON.parse(JSON.stringify(config)), filename);
  const imports = parsed.statements.filter(ts.isImportDeclaration);
  assert(
    imports.some(
      (item) =>
        item.moduleSpecifier.text === "@/components/appearance-provider" &&
        item.importClause?.namedBindings?.elements?.some(
          (binding) => binding.name.text === "AppearanceScope",
        ),
    ),
    `${filename}: missing real AppearanceScope import.`,
  );
  assert(
    imports.some(
      (item) =>
        item.moduleSpecifier.text === "@/lib/appearance" &&
        item.importClause?.isTypeOnly &&
        item.importClause.namedBindings?.elements?.some(
          (binding) => binding.name.text === "AppearanceConfig",
        ),
    ),
    `${filename}: missing real AppearanceConfig type import.`,
  );
  if (original !== undefined) {
    const originalParsed = parseTSX(original, filename);
    const originalDefaults = originalParsed.statements.filter(isDefaultFunction);
    assert.equal(originalDefaults.length, 1);
    const originalEntry = originalDefaults[0];
    assert(originalEntry.name && originalEntry.body);
    const retained = parsed.statements.find(
      (item) =>
        ts.isFunctionDeclaration(item) &&
        item.name?.text === originalEntry.name.text,
    );
    assert(retained?.body, `${filename}: the original implementation disappeared.`);
    assert.equal(
      retained.body.getText(parsed),
      originalEntry.body.getText(originalParsed),
      `${filename}: state, handlers, or rendered example changed during export.`,
    );
    assert.equal(entry.name?.text, `Configured${originalEntry.name.text}`);
    const originalImports = originalParsed.statements
      .filter(ts.isImportDeclaration)
      .map((item) => item.getText(originalParsed));
    for (const statement of originalImports)
      assert(
        imports.some((item) => item.getText(parsed) === statement),
        `${filename}: original import omitted: ${statement}`,
      );
  }
  return {
    entry: entry.name.text,
    imports: imports.map((item) => item.moduleSpecifier.text),
    appearance,
    sha256: sha(source),
    bytes: Buffer.byteLength(source),
  };
}

// Virtual files preserve the exact clipboard/export payload, without generated
// source files or ambient stubs. Imports resolve against the real kit and its
// installed dependency declarations. transpileModule is not a typecheck.
function strictCheckPayloads(
  payloads,
  {
    root = ROOT,
    rootNames = [],
    dependencies = DEPS,
    expectErrors = false,
  } = {},
) {
  const virtualRoot = path.join(root, "artifacts/__appearance_qa_consumer__");
  const virtual = new Map(
    payloads.map(({ name, source }) => [path.resolve(virtualRoot, name), source]),
  );
  assert.equal(virtual.size, payloads.length, "Payload filenames must be unique.");
  const options = {
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2017,
    lib: ["lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.esnext.d.ts"],
    noEmit: true,
    incremental: false,
    isolatedModules: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    types: ["node", "react"],
    typeRoots: [path.join(dependencies, "@types")],
    paths: { "@/*": [path.join(root, "src/*")] },
  };
  const host = ts.createCompilerHost(options);
  const nativeRead = host.readFile.bind(host);
  const nativeExists = host.fileExists.bind(host);
  const nativeSource = host.getSourceFile.bind(host);
  host.readFile = (filename) => virtual.get(path.resolve(filename)) ?? nativeRead(filename);
  host.fileExists = (filename) => virtual.has(path.resolve(filename)) || nativeExists(filename);
  host.getSourceFile = (filename, languageVersion, onError, shouldCreateNewSourceFile) => {
    const source = virtual.get(path.resolve(filename));
    return source === undefined
      ? nativeSource(filename, languageVersion, onError, shouldCreateNewSourceFile)
      : ts.createSourceFile(filename, source, languageVersion, true, ts.ScriptKind.TSX);
  };
  const dependencyAnchor = path.join(
    path.dirname(dependencies),
    "__appearance_qa_dependency_resolution__.tsx",
  );
  host.resolveModuleNames = (names, containingFile) =>
    names.map(
      (name) =>
        ts.resolveModuleName(name, containingFile, options, host).resolvedModule ??
        ts.resolveModuleName(name, dependencyAnchor, options, host).resolvedModule,
    );
  const program = ts.createProgram(
    [...rootNames, ...virtual.keys()],
    options,
    host,
  );
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (!expectErrors && diagnostics.length)
    assert.fail(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (filename) => filename,
        getCurrentDirectory: () => root,
        getNewLine: () => "\n",
      }),
    );
  for (const file of program.getSourceFiles())
    if (file.fileName.startsWith(path.join(root, "src") + path.sep))
      assert.equal(
        read(file.fileName),
        file.text,
        `Canonical source changed during strict compilation: ${file.fileName}`,
      );
  return {
    typescript: ts.version,
    strict: options.strict,
    noEmit: options.noEmit,
    payloads: payloads.length,
    rootFiles: program.getRootFileNames().length,
    diagnostics: diagnostics.length,
    diagnosticCodes: diagnostics.map((item) => item.code),
    canonicalSourceFiles: program.getSourceFiles().filter(
      (file) => file.fileName.startsWith(path.join(root, "src") + path.sep),
    ).length,
  };
}

function studioExampleSource(config, locale, root = ROOT) {
  const filename = path.join(root, "src/components/templates/appearance-studio.tsx");
  const parsed = parseTSX(read(filename), filename);
  const names = ["controlAppearance", "exampleSource"];
  const functions = names.map((name) => {
    const declaration = parsed.statements.find(
      (item) => ts.isFunctionDeclaration(item) && item.name?.text === name,
    );
    assert(declaration, `${filename}: ${name} is missing.`);
    return declaration.getText(parsed);
  });
  const compiled = ts.transpileModule(
    `${functions.join("\n")}\nexports.exampleSource = exampleSource;`,
    {
      fileName: "studio-generator.ts",
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    },
  );
  const exports = {};
  vm.runInNewContext(compiled.outputText, { exports }, { filename });
  return exports.exampleSource(config, (en, es) => locale === "es" ? es : en);
}

function assertStrictNegativeControl(config, options = {}) {
  const invalid = { ...config, radius: "invalid-radius" };
  const source = `"use client";
import { Button, DefinitelyMissingExport } from "@/components/ui/button";
import { MissingModule } from "@/components/ui/__qa_nonexistent_component__";
import type { AppearanceConfig } from "@/lib/appearance";
const appearance: AppearanceConfig = ${JSON.stringify(invalid)};
export default function InvalidConsumer() {
  return <Button appearance="plastic">{appearance.radius}</Button>;
}`;
  const result = strictCheckPayloads(
    [{ name: "negative-control.tsx", source }],
    { ...options, expectErrors: true },
  );
  for (const code of [2307, 2305, 2322])
    assert(
      result.diagnosticCodes.includes(code),
      `Strict negative control must detect diagnostic ${code}: ${JSON.stringify(result)}`,
    );
  return { missingModule: true, missingExport: true, invalidTypes: true, ...result };
}

function runVerification() {
  const startedAt = new Date().toISOString();
  const api = loadAppearanceAPI();
  const families = catalogFamilies();
  const record = sourceRecord();
  const directory = path.join(ROOT, "examples/components");
  assert.deepEqual(
    fs.readdirSync(directory).filter((name) => name.endsWith(".tsx")).sort(),
    families.map((family) => `${family}.tsx`).sort(),
  );
  assert.deepEqual(
    Object.keys(record.componentExampleSources).sort(),
    families.slice().sort(),
  );
  const profiles = configuredProfiles(api);
  assert.equal(profiles.length, 14);
  const assets = new Set();
  const exampleHashes = {};
  const payloads = [];
  const roots = [record.filename];
  for (const family of families) {
    const filename = path.join(directory, `${family}.tsx`);
    const source = read(filename);
    assert.equal(record.componentExampleSources[family], source, `${family}: source record drift.`);
    assert.equal(record.getComponentExampleSource(family), source);
    const parsed = parseTSX(source, filename);
    const defaults = parsed.statements.filter(isDefaultFunction);
    assert.equal(defaults.length, 1);
    assert.equal(defaults[0].name?.text, `${family}Example`);
    assert.equal(defaults[0].parameters.length, 0);
    for (const statement of parsed.statements.filter(ts.isImportDeclaration))
      assert(
        !statement.moduleSpecifier.text.startsWith("."),
        `${family}: complete examples cannot depend on another example.`,
      );
    for (const match of source.matchAll(/"(\/assets\/[^"\n]+\.(?:svg|webm|vtt))"/g)) {
      assert(fs.existsSync(path.join(ROOT, "public", match[1].slice(1))));
      assets.add(match[1]);
    }
    roots.push(filename);
    payloads.push({ name: `raw-copy/${family}.tsx`, source });
    for (const { id, config } of profiles) {
      const configured = api.exportConfiguredExample(source, config);
      validateConfiguredExample(configured, config, source, `${id}/${family}.tsx`);
      payloads.push({ name: `configured/${id}/${family}.tsx`, source: configured });
    }
    exampleHashes[family] = sha(source);
  }
  assert(read(path.join(directory, "Toast.tsx")).includes("function ToastProvider("));
  assert(read(path.join(directory, "Toast.tsx")).includes("toasterId"));
  assert(read(path.join(directory, "Tooltip.tsx")).includes("<TooltipProvider"));
  for (const locale of ["en", "es"])
    for (const { id, config } of profiles) {
      const original = studioExampleSource(config, locale);
      const source = api.exportConfiguredExample(original, config);
      validateConfiguredExample(source, config, original, `studio/${locale}-${id}.tsx`);
      payloads.push({ name: `studio/${locale}-${id}.tsx`, source });
    }
  console.log(
    `Strict-checking 44 canonical examples, 44 source copies, ${44 * profiles.length} configured specimens, and ${2 * profiles.length} complete studio exports…`,
  );
  const negativeControl = assertStrictNegativeControl(profiles[0].config);
  const compilation = strictCheckPayloads(payloads, { rootNames: roots });
  for (const family of families)
    assert.equal(sha(read(path.join(directory, `${family}.tsx`))), exampleHashes[family]);
  assert.equal(read(record.filename), record.source);
  return {
    status: "passed-pure-strict-typecheck",
    startedAt,
    completedAt: new Date().toISOString(),
    targetVersion: JSON.parse(read(path.join(ROOT, "package.json"))).version,
    sourceRoot: ROOT,
    dependencyTypes: DEPS,
    families: families.length,
    canonicalExampleFiles: families.length,
    copiedSourcePayloads: families.length,
    configuredSpecimenPayloads: families.length * profiles.length,
    completeStudioPayloads: 2 * profiles.length,
    byteIdenticalRecordEntries: families.length,
    pureStaticTypedRecord: true,
    profiles,
    compilation,
    negativeControl,
    mediaAssetsVerified: [...assets].sort(),
    browserRuntimeTested: false,
    releaseVerified: false,
    sourceSha256: {
      "src/lib/appearance.ts": sha(read(path.join(ROOT, "src/lib/appearance.ts"))),
      "src/components/templates/appearance-studio.tsx": sha(read(path.join(ROOT, "src/components/templates/appearance-studio.tsx"))),
      "src/lib/component-example-sources.ts": sha(record.source),
    },
    exampleSha256: exampleHashes,
  };
}

module.exports = {
  loadAppearanceAPI,
  configuredProfiles,
  catalogFamilies,
  sourceRecord,
  exportedAppearance,
  validateConfiguredExample,
  strictCheckPayloads,
  studioExampleSource,
  assertStrictNegativeControl,
  runVerification,
};

if (require.main === module) {
  let summary = { status: "running", startedAt: new Date().toISOString(), browserRuntimeTested: false };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2) + "\n");
  try {
    summary = runVerification();
    console.log(JSON.stringify({
      status: summary.status,
      families: summary.families,
      configuredSpecimenPayloads: summary.configuredSpecimenPayloads,
      completeStudioPayloads: summary.completeStudioPayloads,
      compilation: summary.compilation,
      negativeControl: summary.negativeControl,
      browserRuntimeTested: false,
      reportPath,
    }, null, 2));
  } catch (error) {
    summary = {
      ...summary,
      status: "failed",
      completedAt: new Date().toISOString(),
      error: { name: error.name, message: error.message, stack: error.stack },
    };
    console.error(error);
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2) + "\n");
  }
}
