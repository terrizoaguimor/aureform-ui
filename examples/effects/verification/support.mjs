import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runInThisContext } from "node:vm";

export const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
export const dependenciesRoot =
  process.env.AUREFORM_EFFECTS_DEPS ??
  (existsSync(resolve(root, "node_modules/typescript"))
    ? root
    : "/tmp/aureform-ui-build");
export const installed = createRequire(
  resolve(dependenciesRoot, "package.json"),
);
export const ts = installed("typescript");

export async function ownedFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const file = resolve(directory, entry.name);
        return entry.isDirectory() ? ownedFiles(file) : [file];
      }),
    )
  ).flat();
}

export function transpile(source, file) {
  return ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
}

function localModule(specifier, from) {
  const base = specifier.startsWith("@/")
    ? resolve(root, "src", specifier.slice(2))
    : resolve(dirname(from), specifier);
  for (const extension of [
    "",
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".css",
    "/index.ts",
    "/index.tsx",
  ]) {
    if (existsSync(base + extension) && extname(base + extension)) {
      return base + extension;
    }
  }
  throw new Error(`Cannot resolve ${specifier} from ${from}`);
}

export function resolveModule(specifier, from) {
  if (specifier.startsWith(".") || specifier.startsWith("@/")) {
    return localModule(specifier, from);
  }
  try {
    return createRequire(from).resolve(specifier);
  } catch {
    return installed.resolve(specifier);
  }
}

/** Build in memory; no Next output, installation or temporary workspace writes. */
export async function browserBundle(entryFile, entrySource) {
  const modules = [];
  const ids = new Map();
  async function visit(file, virtualSource) {
    if (ids.has(file)) return ids.get(file);
    const id = modules.length;
    ids.set(file, id);
    modules.push(null);
    const source = virtualSource ?? (await readFile(file, "utf8"));
    let code;
    if (file.endsWith(".css")) code = "module.exports = {};";
    else if (file.endsWith(".json")) code = `module.exports = ${source};`;
    else if (/\.tsx?$/.test(file)) code = transpile(source, file);
    else code = source;
    const syntax = ts.createSourceFile(
      file,
      code,
      ts.ScriptTarget.Latest,
      true,
    );
    const requires = new Set();
    const find = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require" &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        requires.add(node.arguments[0].text);
      }
      ts.forEachChild(node, find);
    };
    find(syntax);
    const mapping = {};
    for (const specifier of requires) {
      mapping[specifier] = await visit(resolveModule(specifier, file));
    }
    modules[id] =
      `[function(module,exports,require){\n${code}\n},${JSON.stringify(mapping)}]`;
    return id;
  }
  const entry = await visit(entryFile, entrySource);
  return `(function(){const process={env:{NODE_ENV:"development"}};const modules=[${modules.join(",\n")}];const cache={};function load(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};const [fn,map]=modules[id];fn(module,module.exports,(name)=>{if(!(name in map))throw new Error("Unbundled module "+name);return load(map[name]);});return module.exports;}load(${entry});})();`;
}

const serverCache = new Map();
export async function serverModule(file) {
  if (serverCache.has(file)) return serverCache.get(file).exports;
  const loadedModule = { exports: {} };
  serverCache.set(file, loadedModule);
  if (file.endsWith(".css")) return loadedModule.exports;
  const source = await readFile(file, "utf8");
  const code = transpile(source, file);
  const syntax = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const local = new Map();
  const requires = new Set();
  const find = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require" &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      requires.add(node.arguments[0].text);
    }
    ts.forEachChild(node, find);
  };
  find(syntax);
  for (const specifier of requires) {
    if (specifier.startsWith(".") || specifier.startsWith("@/")) {
      local.set(specifier, await serverModule(resolveModule(specifier, file)));
    }
  }
  const fn = runInThisContext(`(function(module,exports,require){${code}\n})`, {
    filename: file,
  });
  fn(loadedModule, loadedModule.exports, (specifier) =>
    local.has(specifier) ? local.get(specifier) : installed(specifier),
  );
  return loadedModule.exports;
}

export async function verificationCss() {
  const tailwind = installed("tailwindcss");
  const theme = await readFile(
    installed.resolve("tailwindcss/theme.css"),
    "utf8",
  );
  const preflight = await readFile(
    installed.resolve("tailwindcss/preflight.css"),
    "utf8",
  );
  const files = [
    ...(await ownedFiles(resolve(root, "src/components/effects"))),
    ...(await ownedFiles(resolve(root, "examples/effects"))).filter((file) =>
      /\.tsx?$/.test(file),
    ),
  ];
  const source = (
    await Promise.all(files.map((file) => readFile(file, "utf8")))
  ).join("\n");
  const candidates = [
    ...new Set(source.match(/[A-Za-z0-9_!:[\]./%#()-]+/g) ?? []),
  ];
  const compiler =
    await tailwind.compile(`@layer theme, base, components, utilities;
@layer theme { ${theme} }
@layer base { ${preflight} }
@theme {
  --color-muted-foreground: #afb9d0;
  --color-foreground: #f4f7ff;
  --color-background: #0b0f18;
}
@layer utilities { @tailwind utilities; }`);
  return `${compiler.build(candidates)}\n${await readFile(resolve(root, "src/components/effects/effects.css"), "utf8")}
:root { color-scheme: dark; --surface: #121724; --foreground: #f4f7ff; --muted-foreground: #afb9d0; --border: #273045; --ring: #22d3ee; }
body { margin: 0; background: #0b0f18; color: #f4f7ff; font-family: ui-sans-serif, system-ui, sans-serif; }
button, a, input { -webkit-tap-highlight-color: transparent; }
`;
}

export async function staticChecks() {
  const owned = [
    ...(await ownedFiles(resolve(root, "src/components/effects"))),
    ...(await ownedFiles(resolve(root, "examples/effects"))),
  ];
  const files = owned.filter((file) => /\.tsx?$/.test(file));
  const options = {
    target: ts.ScriptTarget.ES2017,
    lib: ["lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.esnext.d.ts"],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    types: ["react", "react-dom", "node"],
    typeRoots: [resolve(dependenciesRoot, "node_modules/@types")],
    paths: { "@/*": [resolve(root, "src/*")] },
  };
  const host = ts.createCompilerHost(options);
  host.resolveModuleNames = (names, containing) =>
    names.map(
      (name) =>
        ts.resolveModuleName(name, containing, options, host).resolvedModule ??
        ts.resolveModuleName(
          name,
          resolve(dependenciesRoot, ".__effects_read_only_check__.ts"),
          options,
          host,
        ).resolvedModule,
    );
  const diagnostics = ts.getPreEmitDiagnostics(
    ts.createProgram(files, options, host),
  );
  if (diagnostics.length) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => root,
        getNewLine: () => "\n",
      }),
    );
  }
  const { ESLint } = installed("eslint");
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [
      ...installed("eslint-config-next/core-web-vitals"),
      ...installed("eslint-config-next/typescript"),
      {
        settings: { react: { version: "19.3.1" } },
        rules: {
          "react-hooks/set-state-in-effect": "off",
          "react-hooks/incompatible-library": "off",
          "@next/next/no-img-element": "off",
        },
      },
    ],
  });
  const lint = await eslint.lintFiles(
    owned.filter((file) => /\.(?:tsx?|mjs)$/.test(file)),
  );
  if (lint.some((result) => result.errorCount || result.warningCount)) {
    throw new Error((await eslint.loadFormatter("stylish")).format(lint));
  }
  return { typedFiles: files.length, lint: "passed" };
}
