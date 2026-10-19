import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  kitRoot,
  entries,
  dependencyClosure,
  registryTarget,
  registryFileType,
  theme,
  registryCss,
  isTextAsset,
  resolveLocal,
} from "./lib/source-graph.mjs";
const require = createRequire(import.meta.url);
const ts = require(
  resolve(
    process.env.AUREFORM_DEPENDENCIES || resolve(kitRoot, "node_modules"),
    "typescript",
  ),
);
const effectNames = [
  "GradientBackground",
  "ShaderBackground",
  "SpotlightCard",
  "GlowBorder",
  "TiltCard",
  "MagneticButton",
];
const customSlotModules = new Map([
  ...effectNames.map((name) => [
    name,
    `src/components/effects/${name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}.tsx`,
  ]),
  ["EffectSurface", "src/components/effects/effect-surface.tsx"],
]);

/**
 * shadcn's base-* migration interprets named asChild attributes as Base UI
 * render props, even on unrelated custom components. Preserve Aureform slot
 * composition in payloads while leaving the installer transforms enabled.
 */
export async function registrySafeContent(file, source) {
  if (!file.endsWith(".tsx")) return source;
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const bindings = new Set();
  function supported(sourceModule, name) {
    return (
      customSlotModules.get(name) === sourceModule ||
      (sourceModule === "src/components/effects/index.ts" &&
        effectNames.includes(name))
    );
  }
  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.importClause?.isTypeOnly
    )
      continue;
    const imported = statement.importClause?.namedBindings;
    if (!imported) continue;
    const sourceModule = await resolveLocal(
      statement.moduleSpecifier.text,
      file,
    );
    if (ts.isNamedImports(imported)) {
      for (const binding of imported.elements) {
        if (
          !binding.isTypeOnly &&
          supported(
            sourceModule,
            binding.propertyName?.text ?? binding.name.text,
          )
        )
          bindings.add(binding.name.text);
      }
    } else if (ts.isNamespaceImport(imported)) {
      for (const name of customSlotModules.keys())
        if (supported(sourceModule, name))
          bindings.add(`${imported.name.text}.${name}`);
    }
  }
  const edits = [];
  function visit(node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      bindings.has(node.tagName.getText(sourceFile))
    ) {
      for (const attribute of node.attributes.properties) {
        if (!ts.isJsxAttribute(attribute) || attribute.name.text !== "asChild")
          continue;
        const initializer = attribute.initializer;
        let value = "true";
        if (initializer) {
          if (ts.isJsxExpression(initializer)) {
            if (!initializer.expression)
              throw new Error(`Empty custom asChild expression in ${file}`);
            value = initializer.getText(sourceFile).slice(1, -1);
          } else value = initializer.getText(sourceFile);
        }
        edits.push({
          start: attribute.getStart(sourceFile),
          end: attribute.getEnd(),
          text: `{...{ asChild: ${value} }}`,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  for (const edit of edits.sort((left, right) => right.start - left.start))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  return source;
}

export function registryIndex(version, items) {
  return {
    name: "aureform-ui",
    version,
    items: items.map(({ name, type, title }) => ({
      name,
      type,
      title,
      url: `/r/${name}.json`,
    })),
  };
}

export function registryManifest(items) {
  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "aureform-ui",
    homepage: "https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N",
    items,
  };
}

export function registryDocuments(version, items) {
  const manifest = registryManifest(items);
  return new Map([
    ["registry.json", manifest],
    ["public/r/registry.json", manifest],
    ["public/r/index.json", registryIndex(version, items)],
  ]);
}

export async function generateRegistry() {
  const [registryEntries, cssVars, packageManifest] = await Promise.all([
    entries(),
    theme(),
    readFile(resolve(kitRoot, "package.json"), "utf8").then(JSON.parse),
  ]);
  const items = [];
  const contentCache = new Map();
  function content(file) {
    if (!contentCache.has(file))
      contentCache.set(
        file,
        readFile(resolve(kitRoot, file), "utf8").then((source) =>
          registrySafeContent(file, source),
        ),
      );
    return contentCache.get(file);
  }
  await mkdir(resolve(kitRoot, "public/r"), { recursive: true });
  for (const entry of Object.values(registryEntries)) {
    const graph = await dependencyClosure([entry.file]);
    const item = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: entry.name,
      type: entry.type,
      title: entry.name
        .split("-")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" "),
      description: `Original Aureform ${entry.type === "registry:ui" ? "component" : "composition"}. Editable Base UI + Tailwind 4 source.`,
      dependencies: Object.entries(graph.dependencies)
        .filter(([name]) => !["react", "react-dom", "next"].includes(name))
        .map(([name, version]) => `${name}@${version}`),
      devDependencies: Object.entries(graph.devDependencies).map(
        ([name, version]) => `${name}@${version}`,
      ),
      files: await Promise.all(
        [...graph.files, ...graph.assets.filter(isTextAsset)].map(
          async (file) => ({
            path: file,
            type: registryFileType(file),
            target: registryTarget(file),
            content: await content(file),
          }),
        ),
      ),
      cssVars,
      css: registryCss,
    };
    await writeFile(
      resolve(kitRoot, `public/r/${entry.name}.json`),
      JSON.stringify(item, null, 2) + "\n",
    );
    items.push({
      ...item,
      files: item.files.map((file) => ({
        path: file.path,
        type: file.type,
        target: file.target,
      })),
    });
  }
  for (const [path, document] of registryDocuments(
    packageManifest.version,
    items,
  ))
    await writeFile(
      resolve(kitRoot, path),
      JSON.stringify(document, null, 2) + "\n",
    );
  console.log(
    `Generated ${items.length} self-contained shadcn registry items; all local imports resolved.`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await generateRegistry();
