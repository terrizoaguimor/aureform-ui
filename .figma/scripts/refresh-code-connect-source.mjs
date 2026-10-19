import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { dependencyClosure } from "../../scripts/lib/source-graph.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (file) => fs.readFile(path.join(root, file));
const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const snapshot = async (file) => ({ file, sha256: sha(await read(file)) });
const manifestFile = ".figma/code-connect-manifest.json";
const original = await read(manifestFile);
const manifest = JSON.parse(original);
const library = JSON.parse(await read(".figma/native-saas-library-1.2.json"));
const version = JSON.parse(await read("package.json")).version;

assert.equal(manifest.templates.length, 92);
assert.equal(manifest.status, "local-unpublished");
assert.equal(manifest.cloudPublication.performed, false);
for (const template of manifest.templateSnapshots)
  assert.equal(
    sha(await read(template.file)),
    template.sha256,
    `Preserved template changed: ${template.file}`,
  );

async function archiveOnce(file, bytes) {
  try {
    await fs.writeFile(path.join(root, file), bytes, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}
await archiveOnce(
  ".figma/history/code-connect-manifest-1.1-final.json",
  original,
);
await archiveOnce(
  ".figma/history/code-connect-validation-1.1-final.json",
  await read(".figma/code-connect/validation/validation-summary.json"),
);

const mapped = manifest.templates.filter((entry) => entry.kind === "block");
const sourceBlocks = [];
for (const file of (
  await fs.readdir(path.join(root, "src/components/blocks"))
).sort()) {
  if (!file.endsWith(".tsx")) continue;
  const source = `src/components/blocks/${file}`;
  const ast = ts.createSourceFile(
    source,
    (await read(source)).toString(),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  for (const statement of ast.statements) {
    if (
      !statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    )
      continue;
    const names =
      ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)
        ? statement.name
          ? [statement.name.text]
          : []
        : ts.isVariableStatement(statement)
          ? statement.declarationList.declarations
              .filter((declaration) => ts.isIdentifier(declaration.name))
              .map((declaration) => declaration.name.text)
          : [];
    for (const name of names) {
      const association = Object.values(library.components).find(
        (component) => component.source === source && component.export === name,
      );
      sourceBlocks.push({
        export: name,
        source,
        mapped: mapped.some(
          (entry) => entry.source === source && entry.export === name,
        ),
        ...(association
          ? { nativeAssociation: "direct-native-source-map" }
          : {}),
      });
    }
  }
}
const graph = await dependencyClosure([
  ...manifest.templates
    .map((entry) => entry.source)
    .filter((source) => source.startsWith("src/")),
  ...sourceBlocks.map((block) => block.source),
  ...Object.values(library.components).map((component) => component.source),
]);
const sources = new Set([
  ...manifest.sourceSnapshots.map((entry) => entry.file),
  ...graph.files,
]);
manifest.sourceBlocks = sourceBlocks;
manifest.coverage.sourceBlockExports = sourceBlocks.length;
manifest.coverage.sourceBlockFiles = new Set(
  sourceBlocks.map((block) => block.source),
).size;
manifest.templateCheckpointVersion ??= manifest.version;
manifest.sourceValidationVersion = version;
manifest.sourceSnapshotRefreshedAt = new Date().toISOString();
manifest.authoritativeInputs = await Promise.all(
  [
    ...new Set([
      ...manifest.authoritativeInputs.map((entry) => entry.file),
      ".figma/native-saas-library-1.2.json",
      ".figma/native-saas-source-associations-1.2.json",
    ]),
  ].map(snapshot),
);
manifest.sourceSnapshots = await Promise.all([...sources].sort().map(snapshot));
manifest.validation = {
  status: "pending-local-smoke",
  templateCheckpointVersion: manifest.templateCheckpointVersion,
  sourceValidationVersion: version,
  liveFigmaRuntimeTested: false,
  cloudRegistered: false,
};
manifest.historicalCheckpoint = {
  manifest: await snapshot(
    ".figma/history/code-connect-manifest-1.1-final.json",
  ),
  validation: await snapshot(
    ".figma/history/code-connect-validation-1.1-final.json",
  ),
};
await fs.writeFile(
  path.join(root, manifestFile),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Preserved ${manifest.templateSnapshots.length} templates; refreshed ${manifest.sourceSnapshots.length} source snapshots for ${version}. No templates generated or published.`,
);
