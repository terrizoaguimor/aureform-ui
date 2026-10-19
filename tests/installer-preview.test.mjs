import test from "node:test";
import assert from "node:assert/strict";
import fs, {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  lstat,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";
import {
  addItems,
  initProject,
  main,
  rewriteImports,
} from "../bin/aureform.mjs";
import {
  entries,
  kitRoot,
  registryFileType,
  registryTarget,
} from "../scripts/lib/source-graph.mjs";
import {
  registryDocuments,
  registrySafeContent,
} from "../scripts/generate-registry.mjs";
import { registrySchema } from "shadcn/schema";
import ts from "typescript";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const receiptPath = ".aureform/manifest.json";

async function consumer(t) {
  const project = await mkdtemp(resolve(tmpdir(), "aureform-cli-12-test-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  const kit = JSON.parse(
    await readFile(resolve(kitRoot, "package.json"), "utf8"),
  );
  await mkdir(resolve(project, "app"));
  await writeFile(
    resolve(project, "app/globals.css"),
    '@import "tailwindcss";\n/* Product styles remain here. */\n',
  );
  await writeFile(
    resolve(project, "package.json"),
    JSON.stringify({
      name: "existing-saas",
      private: true,
      dependencies: Object.fromEntries(
        ["react", "react-dom", "next"].map((name) => [
          name,
          kit.dependencies[name],
        ]),
      ),
      devDependencies: {},
    }) + "\n",
  );
  await writeFile(
    resolve(project, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { paths: { "~/*": ["./*"] } } }),
  );
  await writeFile(
    resolve(project, "components.json"),
    JSON.stringify({
      tailwind: { css: "app/globals.css" },
      aliases: {
        ui: "~/design/ui",
        components: "~/design",
        lib: "~/core",
        utils: "~/core/utils",
        hooks: "~/hooks",
      },
    }),
  );
  return project;
}

async function tree(project, metadata = true) {
  const result = {};
  async function visit(path = "") {
    const file = resolve(project, path);
    const info = await lstat(file);
    result[path || "."] = {
      type: info.isSymbolicLink()
        ? "link"
        : info.isDirectory()
          ? "directory"
          : "file",
      ...(metadata
        ? { mode: info.mode, mtime: info.mtimeMs, inode: info.ino }
        : {}),
      ...(info.isSymbolicLink()
        ? { target: await readlink(file) }
        : info.isFile()
          ? { hash: hash(await readFile(file)) }
          : {}),
    };
    if (info.isDirectory())
      for (const child of (await readdir(file)).sort())
        await visit(path ? `${path}/${child}` : child);
  }
  await visit();
  return result;
}

async function readReceipt(project) {
  return JSON.parse(await readFile(resolve(project, receiptPath), "utf8"));
}

async function runCli(project, args) {
  const stdout = [];
  const stderr = [];
  const previous = {
    log: console.log,
    error: console.error,
    exitCode: process.exitCode,
    execFileSync: childProcess.execFileSync,
  };
  console.log = (...values) => stdout.push(values.join(" "));
  console.error = (...values) => stderr.push(values.join(" "));
  process.exitCode = 0;
  childProcess.execFileSync = () => {
    throw new Error("Package-manager execution is forbidden in this test.");
  };
  syncBuiltinESMExports();
  try {
    try {
      await main([...args, "--cwd", project]);
    } catch (error) {
      console.error(`Aureform: ${error.message}`);
      process.exitCode = 1;
    }
    return {
      status: process.exitCode ?? 0,
      stdout: stdout.join("\n"),
      stderr: stderr.join("\n"),
    };
  } finally {
    console.log = previous.log;
    console.error = previous.error;
    process.exitCode = previous.exitCode;
    childProcess.execFileSync = previous.execFileSync;
    syncBuiltinESMExports();
  }
}

// The installed compiler supplies an independent syntax tree and resolver;
// these assertions do not use the CLI's tokenizer or its path calculation.
function moduleSpecifiers(source, path) {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  assert.deepEqual(
    file.parseDiagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    ),
    [],
    path,
  );
  const specifiers = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    )
      specifiers.push(node.moduleSpecifier.text);
    else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression
    )
      specifiers.push(node.moduleReference.expression.text);
    else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require")) &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    )
      specifiers.push(node.arguments[0].text);
    else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    )
      specifiers.push(node.argument.literal.text);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return specifiers;
}

test("local imports, type imports, re-exports and literal dynamic imports use consumer aliases while external aliases stay intact", async () => {
  const file = "src/demo/installer-imports.tsx";
  const mapped = new Map([
    ["src/demo/dashboard-data.ts", "~/demo/dashboard-data"],
    ["src/lib/saas.ts", "~/core/saas"],
    ["src/components/workspace-provider.tsx", "~/design/workspace-provider"],
    ["src/components/ui/button.tsx", "~/design/ui/button"],
    ["src/styles/effects.css", "~/styles/effects.css"],
  ]);
  const cases = [
    [
      'import { customersSeed } from "./dashboard-data";',
      "./dashboard-data",
      "~/demo/dashboard-data",
    ],
    [
      "import type { WorkspaceData } from '../lib/saas';",
      "../lib/saas",
      "~/core/saas",
    ],
    [
      'import workspaceDefault from "../components/workspace-provider";',
      "../components/workspace-provider",
      "~/design/workspace-provider",
    ],
    ['import * as saas from "../lib/saas";', "../lib/saas", "~/core/saas"],
    [
      'import type DefaultType from "../lib/saas";',
      "../lib/saas",
      "~/core/saas",
    ],
    [
      'import type * as Types from "../lib/saas";',
      "../lib/saas",
      "~/core/saas",
    ],
    [
      'import /* keep */ { Button } /* keep */ from "@/components/ui/button";',
      "@/components/ui/button",
      "~/design/ui/button",
    ],
    [
      'import "../styles/effects.css";',
      "../styles/effects.css",
      "~/styles/effects.css",
    ],
    [
      'export { customersSeed as seed } from "./dashboard-data";',
      "./dashboard-data",
      "~/demo/dashboard-data",
    ],
    [
      'export type { WorkspaceData as Data } from "../lib/saas";',
      "../lib/saas",
      "~/core/saas",
    ],
    [
      'export * from "./dashboard-data";',
      "./dashboard-data",
      "~/demo/dashboard-data",
    ],
    [
      'export * as exportedSaas from "../lib/saas";',
      "../lib/saas",
      "~/core/saas",
    ],
    [
      'export type * as exportedTypes from "../lib/saas";',
      "../lib/saas",
      "~/core/saas",
    ],
    [
      'const lazy = import(/* keep */ "../lib/saas");',
      "../lib/saas",
      "~/core/saas",
    ],
    [
      'const attributed = import("./dashboard-data", { with: { type: "json" } });',
      "./dashboard-data",
      "~/demo/dashboard-data",
    ],
    [
      "const templateLiteral = import(`../lib/saas`);",
      "../lib/saas",
      "~/core/saas",
    ],
    ['const common = require("../lib/saas");', "../lib/saas", "~/core/saas"],
    [
      'import equal = require("./dashboard-data");',
      "./dashboard-data",
      "~/demo/dashboard-data",
    ],
    [
      'type Imported = import("../lib/saas").WorkspaceData;',
      "../lib/saas",
      "~/core/saas",
    ],
    [
      String.raw`import { customersSeed as escaped } from ".\u002fdashboard-data";`,
      String.raw`.\u002fdashboard-data`,
      "~/demo/dashboard-data",
    ],
    [
      'import { Button as explicitExtension } from "../components/ui/button.tsx";',
      "../components/ui/button.tsx",
      "~/design/ui/button",
    ],
  ];
  const externals = [
    'import { useState } from "react";',
    'export * from "@external/workspace";',
    'const external = import("customer-alias/saas");',
    'const externalRequire = require("node:fs");',
    'import customerAlias from "~/customer-owned";',
  ];
  const source = [...cases.map(([line]) => line), ...externals].join("\n");
  const expected = [
    ...cases.map(([line, original, replacement]) =>
      line.replace(original, replacement),
    ),
    ...externals,
  ].join("\n");
  const rewritten = await rewriteImports(source, file, {
    importPath(path) {
      assert(mapped.has(path), path);
      return mapped.get(path);
    },
  });
  assert.equal(rewritten, expected);
  assert.deepEqual(moduleSpecifiers(rewritten, file), [
    ...cases.map(([, , replacement]) => replacement),
    "react",
    "@external/workspace",
    "customer-alias/saas",
    "node:fs",
    "~/customer-owned",
  ]);
});

test("comments, strings, templates, regexes and JSX snippets remain byte-identical while executable template and JSX imports are rewritten", async () => {
  const file = "src/demo/installer-examples.tsx";
  const source = [
    '// import "../lib/not-a-module";',
    '/* export * from "../lib/not-a-module"; */',
    'const sameString = "../lib/saas";',
    "const example = 'import(\"../lib/not-a-module\")';",
    'const exampleTemplate = `export * from "../lib/not-a-module";`;',
    'const tagged = String.raw`import("../lib/not-a-module")`;',
    String.raw`const pattern = /import\(["']\.\.\/lib\/not-a-module["']\)/;`,
    String.raw`if (true) /import\(["']\.\.\/lib\/not-a-module["']\)/.test(example);`,
    String.raw`if (true) {} /import "..\/lib\/not-a-module"/.test(example);`,
    'export default <pre>import "../lib/not-a-module";</pre>;',
    'const regexTemplate = `text ${/import "..\\/lib\\/not-a-module"/.test(example)}`;',
    'const regexView = <div>{true}{/import "..\\/lib\\/not-a-module"/.test(example)}</div>;',
    "const object = { import: (value: string) => value, require: (value: string) => value };",
    'object.import("../lib/not-a-module");',
    'object?.require("../lib/not-a-module");',
    'const computed = import("../lib/" + example);',
    "const substituted = import(`../lib/${example}`);",
    'const embedded = `example import("../lib/not-a-module") ${import("../lib/saas")} tail`;',
    'const view = <section data-path="../lib/saas" data-example=\'import("../lib/not-a-module")\'><pre>import "../lib/not-a-module";</pre>{import("../lib/saas")}{() => import("./dashboard-data")}</section>;',
    "const generic = <T,>(value: T) => value;",
    'const objectDivision = { value: 1 } / import("../lib/saas");',
    'const functionDivision = function () {} / import("../lib/saas");',
    'const classDivision = class {} / import("../lib/saas");',
    'import type { WorkspaceData } from "../lib/saas";',
  ].join("\n");
  const expected = source
    .replace('${import("../lib/saas")}', '${import("~/core/saas")}')
    .replace('{import("../lib/saas")}', '{import("~/core/saas")}')
    .replace(
      '{() => import("./dashboard-data")}',
      '{() => import("~/demo/dashboard-data")}',
    )
    .replaceAll('/ import("../lib/saas");', '/ import("~/core/saas");')
    .replace('from "../lib/saas";', 'from "~/core/saas";');
  assert.deepEqual(moduleSpecifiers(source, file), [
    "../lib/saas",
    "../lib/saas",
    "./dashboard-data",
    "../lib/saas",
    "../lib/saas",
    "../lib/saas",
    "../lib/saas",
  ]);
  const rewritten = await rewriteImports(source, file, {
    importPath(path) {
      assert(["src/lib/saas.ts", "src/demo/dashboard-data.ts"].includes(path));
      return path === "src/lib/saas.ts"
        ? "~/core/saas"
        : "~/demo/dashboard-data";
    },
  });
  assert.equal(rewritten, expected);
  assert.deepEqual(moduleSpecifiers(rewritten, file), [
    "~/core/saas",
    "~/core/saas",
    "~/demo/dashboard-data",
    "~/core/saas",
    "~/core/saas",
    "~/core/saas",
    "~/core/saas",
  ]);
});

test("unresolved genuine local imports fail closed without treating displayed snippets as dependencies", async () => {
  const config = {
    importPath: () => assert.fail("An unresolved import cannot be mapped."),
  };
  for (const source of [
    'import type { Missing } from "../lib/not-a-module";',
    'export * from "../lib/not-a-module";',
    'const lazy = import("../lib/not-a-module");',
    'const common = require("../lib/not-a-module");',
    'type Missing = import("../lib/not-a-module").Missing;',
  ])
    await assert.rejects(
      () => rewriteImports(source, "src/demo/installer-missing.ts", config),
      /Unresolved local import \.\.\/lib\/not-a-module/,
    );
  const snippet =
    "const displayed = 'import type { Missing } from \"../lib/not-a-module\";';";
  assert.equal(
    await rewriteImports(snippet, "src/demo/installer-missing.ts", config),
    snippet,
  );
});

test("actual WorkspaceProvider copies resolve every local dependency under custom aliases and record original versus rewritten SaaS hashes", async (t) => {
  const project = await consumer(t);
  const before = await tree(project);
  const preview = await addItems(["workspace-provider"], project, {
    diff: true,
  });
  assert.equal(preview.status, "ready");
  assert.match(preview.diff, /from "~\/core\/saas"/);
  assert.deepEqual(await tree(project), before);
  await addItems(["workspace-provider"], project);
  const files = (await readReceipt(project)).items[
    "workspace-provider"
  ].files.filter((file) => file.kind === "source");
  const targets = new Map(
    files.map((file) => [file.sourcePath, file.targetPath]),
  );
  const consumerConfig = ts.parseJsonConfigFileContent(
    ts.readConfigFile(resolve(project, "tsconfig.json"), ts.sys.readFile)
      .config,
    ts.sys,
    project,
    {},
    resolve(project, "tsconfig.json"),
  ).options;
  const kitConfig = ts.parseJsonConfigFileContent(
    ts.readConfigFile(resolve(kitRoot, "tsconfig.json"), ts.sys.readFile)
      .config,
    ts.sys,
    kitRoot,
    {},
    resolve(kitRoot, "tsconfig.json"),
  ).options;
  let resolvedLocals = 0;
  for (const file of files) {
    const raw = await readFile(resolve(kitRoot, file.sourcePath), "utf8");
    const installed = await readFile(resolve(project, file.targetPath), "utf8");
    assert.equal(file.sourceHash, hash(raw));
    assert.equal(file.targetHash, hash(installed));
    const originalImports = moduleSpecifiers(raw, file.sourcePath);
    const installedImports = moduleSpecifiers(installed, file.targetPath);
    assert.equal(installedImports.length, originalImports.length);
    for (let i = 0; i < originalImports.length; i++) {
      const specifier = originalImports[i];
      if (!specifier.startsWith("@/") && !specifier.startsWith(".")) {
        assert.equal(
          installedImports[i],
          specifier,
          "External imports must remain intact.",
        );
        continue;
      }
      const original = ts.resolveModuleName(
        specifier,
        resolve(kitRoot, file.sourcePath),
        kitConfig,
        ts.sys,
      ).resolvedModule;
      assert(original, `${file.sourcePath}: ${specifier}`);
      const expectedTarget = targets.get(
        relative(kitRoot, original.resolvedFileName),
      );
      assert(
        expectedTarget,
        `Receipt must include ${original.resolvedFileName}`,
      );
      const actual = ts.resolveModuleName(
        installedImports[i],
        resolve(project, file.targetPath),
        consumerConfig,
        ts.sys,
      ).resolvedModule;
      assert(actual, `${file.targetPath}: ${installedImports[i]}`);
      assert.equal(actual.resolvedFileName, resolve(project, expectedTarget));
      resolvedLocals++;
    }
  }
  assert(
    resolvedLocals >= 8,
    "Exercise the actual provider, demo, types and UI dependency cycle.",
  );
  const saasData = files.find(
    (file) => file.sourcePath === "src/demo/saas-data.ts",
  );
  assert.equal(saasData.targetPath, "demo/saas-data.ts");
  assert.notEqual(saasData.sourceHash, saasData.targetHash);
  assert.deepEqual(
    moduleSpecifiers(
      await readFile(resolve(project, saasData.targetPath), "utf8"),
      saasData.targetPath,
    ),
    ["./dashboard-data", "~/core/saas"],
  );
  const copied = await tree(project);
  await addItems(["workspace-provider"], project);
  assert.deepEqual(await tree(project), copied);
});

test("CLI init followed by SaaS add preserves correct relative imports and needs no overwrite", async (t) => {
  const project = await mkdtemp(
    resolve(tmpdir(), "aureform-cli-init-12-test-"),
  );
  t.after(() => rm(project, { recursive: true, force: true }));
  await initProject(project, { install: false });
  const originalFiles = new Map(
    await Promise.all(
      ["src/demo/saas-data.ts", "src/lib/saas.ts"].map(async (file) => [
        file,
        await readFile(resolve(project, file)),
      ]),
    ),
  );
  const before = await tree(project);
  const preview = await addItems(["workspace-provider"], project, {
    diff: true,
  });
  assert.equal(preview.status, "ready");
  assert.deepEqual(preview.conflicts, []);
  for (const file of originalFiles.keys())
    assert.equal(
      preview.files.find((entry) => entry.path === file).action,
      "unchanged",
      file,
    );
  assert.deepEqual(await tree(project), before);
  await addItems(["workspace-provider"], project);
  for (const [file, bytes] of originalFiles)
    assert.deepEqual(await readFile(resolve(project, file)), bytes, file);
  const receipt = (await readReceipt(project)).items["workspace-provider"];
  for (const entry of receipt.files.filter((file) =>
    originalFiles.has(file.sourcePath),
  )) {
    assert.equal(entry.sourceHash, hash(originalFiles.get(entry.sourcePath)));
    assert.equal(entry.targetHash, entry.sourceHash);
  }
  const installed = await tree(project);
  await addItems(["workspace-provider"], project);
  assert.deepEqual(await tree(project), installed);
});

test("fresh dry-run and diff report the real plan without changing any consumer file or directory", async (t) => {
  const project = await consumer(t);
  const before = await tree(project);
  for (const options of [
    { dryRun: true },
    { diff: true },
    { diff: true, overwrite: true },
  ]) {
    const preview = await addItems(
      ["button", "revenue-panel"],
      project,
      options,
    );
    assert.equal(preview.preview, true);
    assert.equal(preview.status, "ready");
    assert.deepEqual(preview.conflicts, []);
    assert.equal(
      preview.files.find((file) => file.path === "design/ui/button.tsx").status,
      "new",
    );
    assert(
      preview.files.some(
        (file) => file.path === receiptPath && file.action === "create",
      ),
    );
    assert(
      preview.files.some(
        (file) => file.path === "app/globals.css" && file.action === "merge",
      ),
    );
    assert(
      preview.dependencyChanges.some(
        (dependency) =>
          dependency.name === "recharts" && dependency.action === "add",
      ),
    );
    if (options.diff) {
      assert.match(
        preview.diff,
        /--- \/dev\/null\n\+\+\+ b\/design\/ui\/button\.tsx/,
      );
      assert.match(preview.diff, /\+.*from "~\/core\/utils"/);
      assert.match(preview.diff, /@@ -0,0 \+1,\d+ @@/);
      assert.match(preview.diff, /\+@import "\.\/aureform\.css";/);
    }
    assert.deepEqual(await tree(project), before);
  }
});

test("CLI --diff implies preview, prints readable paths and dependencies, and performs no installation", async (t) => {
  const project = await consumer(t);
  const before = await tree(project);
  const result = await runCli(project, [
    "add",
    "button",
    "--diff",
    "--no-install",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /Status: ready\. No files written; no packages installed/,
  );
  assert.match(result.stdout, /CREATE \[new\] design\/ui\/button\.tsx/);
  assert.match(result.stdout, /ADD @base-ui\/react:/);
  assert.match(result.stdout, /\+\+\+ b\/design\/ui\/button\.tsx/);
  assert.deepEqual(await tree(project), before);
});

test("successful copy records independently verifiable original and rewritten hashes for every item", async (t) => {
  const project = await consumer(t);
  const result = await addItems(["button", "revenue-panel"], project);
  assert.deepEqual(result.items, ["button", "revenue-panel"]);
  const receipt = await readReceipt(project);
  const kit = JSON.parse(
    await readFile(resolve(kitRoot, "package.json"), "utf8"),
  );
  assert.equal(receipt.schemaVersion, 1);
  assert.deepEqual(Object.keys(receipt.items), ["button", "revenue-panel"]);
  for (const [name, item] of Object.entries(receipt.items)) {
    assert.equal(item.name, name);
    assert.equal(item.origin, kit.name);
    assert.equal(item.kitVersion, kit.version);
    assert(item.files.length > 1, `${name} must include its dependency files.`);
    for (const file of item.files) {
      assert(
        !file.targetPath.startsWith("/") && !file.targetPath.startsWith("../"),
      );
      assert.equal(
        file.sourceHash,
        hash(await readFile(resolve(kitRoot, file.sourcePath))),
        file.sourcePath,
      );
      assert.equal(
        file.targetHash,
        hash(await readFile(resolve(project, file.targetPath))),
        file.targetPath,
      );
    }
    assert.deepEqual(
      item.files
        .filter((file) => file.kind === "theme")
        .map((file) => file.sourcePath),
      [
        "src/app/globals.css",
        "src/styles/tokens.css",
        "src/styles/effects.css",
      ],
    );
  }
  const button = receipt.items.button.files.find(
    (file) => file.targetPath === "design/ui/button.tsx",
  );
  assert.notEqual(
    button.sourceHash,
    button.targetHash,
    "Alias rewriting must be reflected in the target hash.",
  );
  assert.match(
    await readFile(resolve(project, button.targetPath), "utf8"),
    /from "~\/core\/utils"/,
  );
  assert.equal(
    receipt.items.button.dependencies["@base-ui/react"],
    kit.dependencies["@base-ui/react"],
  );
  assert.equal(
    receipt.items["revenue-panel"].dependencies.recharts,
    kit.dependencies.recharts,
  );
  assert.match(
    await readFile(resolve(project, "app/globals.css"), "utf8"),
    /Product styles remain here/,
  );
});

test("repeating an add is idempotent, keeps package bytes, and reports tracked files as unmodified", async (t) => {
  const project = await consumer(t);
  await addItems(["button"], project);
  const before = await tree(project);
  const duplicate = await addItems(["button", "button"], project);
  assert.deepEqual(duplicate.items, ["button", "button"]);
  assert.deepEqual(await tree(project), before);
  const preview = await addItems(["button"], project, { diff: true });
  assert.equal(preview.status, "ready");
  assert(preview.files.every((file) => file.action === "unchanged"));
  assert.equal(preview.diff, "");
  assert.equal(
    preview.files.find((file) => file.path === "design/ui/button.tsx").status,
    "unmodified",
  );
  const result = await runCli(project, ["add", "button", "--no-install"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /^Added button: \d+ source files and \d+ assets\./,
  );
  assert.deepEqual(await tree(project), before);
});

test("customized tracked files block all new sources, dependency merges, CSS and receipt writes", async (t) => {
  const project = await consumer(t);
  await addItems(["button"], project);
  const file = resolve(project, "design/ui/button.tsx");
  const original = await readFile(file, "utf8");
  await writeFile(file, original + "// Team customization.\n");
  const before = await tree(project);
  const preview = await addItems(["button", "customer-data-table"], project, {
    diff: true,
  });
  assert.equal(preview.status, "blocked");
  assert.equal(
    preview.files.find((file) => file.path === "design/ui/button.tsx").status,
    "customized",
  );
  assert(preview.files.some((file) => file.action === "create"));
  assert.match(preview.diff, /-\/\/ Team customization\./);
  await assert.rejects(
    () => addItems(["button", "customer-data-table"], project),
    /Existing file protected/,
  );
  assert.deepEqual(await tree(project), before);
  const cliResult = await runCli(project, ["add", "button", "--dry-run"]);
  assert.equal(cliResult.status, 1, cliResult.stderr);
  assert.match(
    cliResult.stdout,
    /CONFLICT \[customized\] design\/ui\/button\.tsx/,
  );
  assert.deepEqual(await tree(project), before);
  const approvedPreview = await addItems(["button"], project, {
    diff: true,
    overwrite: true,
  });
  assert.equal(approvedPreview.status, "ready");
  assert.deepEqual(await tree(project), before);
  await addItems(["button"], project, { overwrite: true });
  assert.equal(await readFile(file, "utf8"), original);
  const receipt = await readReceipt(project);
  const recorded = receipt.items.button.files.find(
    (entry) => entry.targetPath === "design/ui/button.tsx",
  );
  assert.equal(recorded.targetHash, hash(await readFile(file)));
});

test("unknown existing files and all dependency conflicts are reported together without writes", async (t) => {
  const project = await consumer(t);
  await mkdir(resolve(project, "design/ui"), { recursive: true });
  await writeFile(
    resolve(project, "design/ui/button.tsx"),
    "// Untracked product button.\n",
  );
  const manifest = JSON.parse(
    await readFile(resolve(project, "package.json"), "utf8"),
  );
  manifest.dependencies.recharts = "^2.0.0";
  await writeFile(resolve(project, "package.json"), JSON.stringify(manifest));
  const before = await tree(project);
  const preview = await addItems(["button", "revenue-panel"], project, {
    dryRun: true,
  });
  assert.equal(preview.status, "blocked");
  assert.equal(
    preview.files.find((file) => file.path === "design/ui/button.tsx").status,
    "unknown",
  );
  assert(
    preview.conflicts.some((message) =>
      /Existing file protected/.test(message),
    ),
  );
  assert(
    preview.conflicts.some((message) =>
      /Review dependency recharts/.test(message),
    ),
  );
  assert.equal(
    preview.dependencyChanges.find(
      (dependency) => dependency.name === "recharts",
    ).action,
    "conflict",
  );
  const overwritePreview = await addItems(
    ["button", "revenue-panel"],
    project,
    { overwrite: true, diff: true },
  );
  assert.equal(
    overwritePreview.status,
    "blocked",
    "--overwrite must not override dependency incompatibility.",
  );
  await assert.rejects(
    () => addItems(["button", "revenue-panel"], project, { overwrite: true }),
    /Review dependency recharts/,
  );
  assert.deepEqual(await tree(project), before);
});

test("adding another item keeps earlier receipts and dependencies already installed in devDependencies", async (t) => {
  const project = await consumer(t);
  await addItems(["button"], project);
  const previous = (await readReceipt(project)).items.button;
  const manifest = JSON.parse(
    await readFile(resolve(project, "package.json"), "utf8"),
  );
  manifest.devDependencies["@base-ui/react"] =
    manifest.dependencies["@base-ui/react"];
  delete manifest.dependencies["@base-ui/react"];
  await writeFile(resolve(project, "package.json"), JSON.stringify(manifest));
  const preview = await addItems(["select", "revenue-panel"], project, {
    dryRun: true,
  });
  const dependency = preview.dependencyChanges.find(
    (entry) => entry.name === "@base-ui/react",
  );
  assert.equal(dependency.action, "keep");
  assert.equal(dependency.currentGroup, "devDependencies");
  await addItems(["select", "revenue-panel"], project);
  assert.deepEqual((await readReceipt(project)).items.button, previous);
  const installed = JSON.parse(
    await readFile(resolve(project, "package.json"), "utf8"),
  );
  assert(!installed.dependencies["@base-ui/react"]);
  assert.equal(installed.devDependencies["@base-ui/react"], dependency.current);
});

test("asset preview includes a binary diff and copied assets receive exact byte hashes", async (t) => {
  const project = await consumer(t);
  const before = await tree(project);
  const preview = await addItems(["media-studio"], project, { diff: true });
  assert.equal(preview.status, "ready");
  assert.match(
    preview.diff,
    /Binary file public\/assets\/aureform-motion\.webm: absent -> [a-f0-9]{64}/,
  );
  assert.deepEqual(await tree(project), before);
  await addItems(["media-studio"], project);
  const receipt = (await readReceipt(project)).items["media-studio"];
  const asset = receipt.files.find((file) => file.targetPath.endsWith(".webm"));
  assert(asset && asset.kind === "asset");
  const source = await readFile(resolve(kitRoot, asset.sourcePath));
  const target = await readFile(resolve(project, asset.targetPath));
  assert(source.equals(target));
  assert.equal(asset.sourceHash, hash(source));
  assert.equal(asset.targetHash, hash(target));
});

test("invalid receipts fail closed before source, package or CSS writes", async (t) => {
  const project = await consumer(t);
  await mkdir(resolve(project, ".aureform"));
  await writeFile(
    resolve(project, receiptPath),
    '{"schemaVersion":99,"items":{}}\n',
  );
  const before = await tree(project);
  for (const options of [{ dryRun: true }, { overwrite: true }])
    await assert.rejects(
      () => addItems(["button"], project, options),
      /Invalid \.aureform\/manifest\.json/,
    );
  assert.deepEqual(await tree(project), before);
});

test("preview and copy reject external and broken symlink destinations before creating files", async (t) => {
  const project = await consumer(t);
  const outside = await mkdtemp(resolve(tmpdir(), "aureform-cli-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await mkdir(resolve(project, "design"));
  await symlink(outside, resolve(project, "design/ui"));
  const before = await tree(project);
  await assert.rejects(
    () => addItems(["button"], project, { diff: true }),
    /symlink outside/,
  );
  assert.deepEqual(await tree(project), before);
  assert.deepEqual(await readdir(outside), []);
  await rm(resolve(project, "design/ui"));
  await mkdir(resolve(project, "design/ui"));
  await symlink(
    resolve(outside, "missing.tsx"),
    resolve(project, "design/ui/button.tsx"),
  );
  const brokenBefore = await tree(project);
  await assert.rejects(
    () => addItems(["button"], project, { overwrite: true }),
    /broken symlink/,
  );
  assert.deepEqual(await tree(project), brokenBefore);
});

test("an I/O failure publishing the receipt restores every copied file and existing integration file", async (t) => {
  for (const installed of [false, true]) {
    const project = await consumer(t);
    if (installed) await addItems(["button"], project);
    const before = await tree(project, false);
    const originalLink = fs.link;
    let failed = false;
    const mock = t.mock.method(fs, "link", async (source, target) => {
      if (!failed && target === resolve(project, receiptPath)) {
        failed = true;
        const error = new Error("Simulated receipt publication failure.");
        error.code = "EIO";
        throw error;
      }
      return originalLink(source, target);
    });
    syncBuiltinESMExports();
    try {
      await assert.rejects(
        () => addItems([installed ? "revenue-panel" : "button"], project),
        /Simulated receipt publication failure/,
      );
    } finally {
      mock.mock.restore();
      syncBuiltinESMExports();
    }
    assert.equal(failed, true);
    assert.deepEqual(await tree(project, false), before);
  }
});

test("preview flags cannot accidentally turn init into a mutating command and list keeps its output", async (t) => {
  const project = await consumer(t);
  const before = await tree(project);
  for (const flag of ["--dry-run", "--diff"]) {
    const result = await runCli(project, ["init", "not-created", flag]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /supported only by add/);
    assert.deepEqual(await tree(project), before);
  }
  const output = await runCli(project, ["list"]);
  assert.equal(output.status, 0, output.stderr);
  assert.match(output.stdout, /^button\s+component$/m);
  assert.match(output.stdout, /^revenue-panel\s+block \/ template$/m);
  assert.deepEqual(await tree(project), before);
});

test("registry documents validate against installed shadcn for the current inventory and future entries without generation", async () => {
  const inventory = Object.values(await entries());
  assert(
    inventory.length >= 83,
    "The complete existing inventory must remain available.",
  );
  const items = inventory.map((entry) => ({
    name: entry.name,
    type: entry.type,
    title: entry.name,
    files: [
      {
        path: entry.file,
        type: registryFileType(entry.file),
        target: registryTarget(entry.file),
      },
    ],
  }));
  const future = {
    name: "future-workspace-members",
    type: "registry:block",
    title: "Future workspace members",
    dependencies: ["zod@^4.0.0"],
    registryDependencies: ["button"],
    files: [
      {
        path: "src/components/blocks/future-workspace-members.tsx",
        type: "registry:component",
        target: "@components/blocks/future-workspace-members.tsx",
        content: "export function WorkspaceMembers() { return null; }\n",
      },
    ],
  };
  const documents = registryDocuments("1.2.0-test", [...items, future]);
  assert.deepEqual(
    [...documents.keys()],
    ["registry.json", "public/r/registry.json", "public/r/index.json"],
  );
  for (const path of ["registry.json", "public/r/registry.json"]) {
    const manifest = documents.get(path);
    registrySchema.parse(manifest);
    assert.equal(manifest.items.length, inventory.length + 1);
    assert.deepEqual(
      manifest.items.map((item) => item.name),
      [...inventory.map((entry) => entry.name), future.name],
    );
  }
  assert.deepEqual(
    documents.get("registry.json"),
    documents.get("public/r/registry.json"),
  );
  const index = documents.get("public/r/index.json");
  assert.equal(index.version, "1.2.0-test");
  assert.equal(index.items.length, inventory.length + 1);
  assert.equal(index.items.at(-1).url, "/r/future-workspace-members.json");
});

test("the registry's real MagneticButton slot protection stays intact and ordinary Base UI source stays unchanged", async () => {
  const path = "src/components/effects/magnetic-button.tsx";
  const source = await readFile(resolve(kitRoot, path), "utf8");
  const protectedSource = await registrySafeContent(path, source);
  assert.match(protectedSource, /\{\.\.\.\{\s*asChild:\s*asChild\s*\}\}/);
  assert.doesNotMatch(protectedSource, /\s+asChild=\{asChild\}/);
  const buttonPath = "src/components/ui/button.tsx";
  const button = await readFile(resolve(kitRoot, buttonPath), "utf8");
  assert.equal(await registrySafeContent(buttonPath, button), button);
  const namespaceSource =
    'import * as Effects from "@/components/effects";\nexport const x = <Effects.MagneticButton asChild={false}><a href="/">Go</a></Effects.MagneticButton>;\n';
  assert.match(
    await registrySafeContent(
      "src/components/effects/test.tsx",
      namespaceSource,
    ),
    /\{\.\.\.\{\s*asChild:\s*false\s*\}\}/,
  );
});
