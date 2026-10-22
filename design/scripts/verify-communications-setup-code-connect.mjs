// Local parserless evaluation and strict emitted JSX typing. No Figma, React,
// setup adapter, SDK, provider, browser or network execution.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const output =
  "artifacts/communications-design/setup-code-connect-validation.json";
const sourceMapFile =
  "design/figma/communications-setup-native-source-2026-10-21.json";
const templateFile = ".figma/CommunicationsSetup.figma.ts";
const sourceFile = "src/components/blocks/communications-setup.tsx";
const sourceExport = "CommunicationsSetup";
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const serializable = (value) => JSON.parse(JSON.stringify(value));
const proof = {
  UTC: new Date().toISOString(),
  status: "FAILED",
  scope:
    "Local CommunicationsSetup parserless template and emitted source examples only",
  execution:
    "Synthetic selectedInstance; source AST inspection and strict compilation without emission",
  liveFigmaRuntimeTested: false,
  cloudRegistered: false,
  liveProviderTested: false,
  browserOrMediaTested: false,
  limitations: [
    "The local template remains unpublished and unregistered.",
    "Parserless VM evaluation does not verify the hosted Code Connect runtime.",
    "Read-only/default-demo checks inspect actual source syntax; they do not execute React or browser controls.",
    "Viewport, Mode and separate Phase snapshots are presentation evidence, not forced source props.",
    "No account permissions, provisioning, webhook delivery, browser registration, carrier call or pixel parity is certified.",
  ],
};

function read(file) {
  assert(
    typeof file === "string" && !path.isAbsolute(file),
    "Invalid source path",
  );
  const absolute = path.resolve(repo, file);
  assert(
    absolute.startsWith(`${repo}${path.sep}`),
    "Source path leaves checkout",
  );
  return fs.readFileSync(absolute, "utf8");
}

function sourceAst(file, code = read(file)) {
  const ast = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  assert.equal(ast.parseDiagnostics.length, 0, `${file}: source syntax failed`);
  return ast;
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

function alias(ast, name) {
  const declaration = ast.statements.find(
    (node) => ts.isTypeAliasDeclaration(node) && node.name.text === name,
  );
  assert(declaration, `Actual source alias missing: ${name}`);
  return declaration.type;
}

function literalUnion(ast, name) {
  const type = alias(ast, name);
  assert(ts.isUnionTypeNode(type), `${name}: expected actual literal union`);
  return type.types.map((node) => {
    assert(ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal));
    return node.literal.text;
  });
}

function checkSnapshots(entries, name) {
  assert(Array.isArray(entries) && entries.length, `Missing ${name}`);
  assert.equal(
    new Set(entries.map((entry) => entry.file)).size,
    entries.length,
  );
  return entries.map((entry) => {
    assert(
      /^[a-f0-9]{64}$/.test(entry.sha256),
      `Invalid digest: ${entry.file}`,
    );
    const currentSHA256 = sha(read(entry.file));
    assert.equal(currentSHA256, entry.sha256, `${name} changed: ${entry.file}`);
    return { ...entry, currentSHA256, recordedSourceMatches: true };
  });
}

function readonlyDefaultEvidence(ast) {
  let defaultFixtureAdapter = false;
  let modeDerivedFromSnapshot = false;
  const credentialInputs = [];
  walk(ast, (node) => {
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken &&
      ts.isIdentifier(node.left) &&
      node.left.text === "adapter" &&
      ts.isCallExpression(node.right) &&
      node.right.expression.getText(ast) ===
        "createDemoCommunicationsSetupAdapter"
    )
      defaultFixtureAdapter = true;
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(ast) === "demo" &&
      node.initializer &&
      ts.isBinaryExpression(node.initializer) &&
      node.initializer.operatorToken.kind ===
        ts.SyntaxKind.EqualsEqualsEqualsToken &&
      node.initializer.left.getText(ast) === "snapshot.mode" &&
      ts.isStringLiteral(node.initializer.right) &&
      node.initializer.right.text === "demo"
    )
      modeDerivedFromSnapshot = true;
    if (
      !ts.isJsxSelfClosingElement(node) ||
      node.tagName.getText(ast) !== "Input"
    )
      return;
    const attributes = node.attributes.properties;
    const testId = attributes.find(
      (entry) =>
        ts.isJsxAttribute(entry) && entry.name.getText(ast) === "data-testid",
    );
    if (!testId?.initializer || !ts.isStringLiteral(testId.initializer)) return;
    if (
      !["setup-credential-first", "setup-credential-second"].includes(
        testId.initializer.text,
      )
    )
      return;
    const readonly = attributes.find(
      (entry) =>
        ts.isJsxAttribute(entry) && entry.name.getText(ast) === "readOnly",
    );
    assert(
      readonly?.initializer &&
        ts.isJsxExpression(readonly.initializer) &&
        readonly.initializer.expression?.getText(ast) === "demo",
      `${testId.initializer.text}: source no longer marks demo credentials read-only`,
    );
    credentialInputs.push({
      testId: testId.initializer.text,
      line: ast.getLineAndCharacterOfPosition(readonly.getStart(ast)).line + 1,
      readonlyExpression: "demo",
    });
  });
  assert(
    defaultFixtureAdapter,
    "Source default is no longer the fixture-only adapter",
  );
  assert(
    modeDerivedFromSnapshot,
    "Source demo mode is no longer snapshot-derived",
  );
  assert.equal(credentialInputs.length, 2);
  return { defaultFixtureAdapter, modeDerivedFromSnapshot, credentialInputs };
}

function flatten(sections) {
  if (typeof sections === "string") return sections;
  assert(Array.isArray(sections), "Unexpected parserless result shape");
  return sections
    .map((section) => {
      assert(section?.type === "CODE" && typeof section.code === "string");
      return section.code;
    })
    .join("");
}

function validateValues(values, native) {
  assert.deepEqual(Object.keys(values).sort(), Object.keys(native.axes).sort());
  for (const [key, options] of Object.entries(native.axes))
    assert(
      options.includes(values[key]),
      `Unrecorded native variant value: ${key}`,
    );
}

function validateExample(code, props, providers, expectedProvider) {
  const ast = sourceAst("__setup_example__.tsx", code);
  assert.equal(
    ast.statements.length,
    2,
    "Only an import and inert component are allowed",
  );
  const expressions = ast.statements.filter(ts.isExpressionStatement);
  assert.equal(expressions.length, 1, "One inert source component is required");
  assert.equal(ast.statements.filter(ts.isImportDeclaration).length, 1);
  const imported = ast.statements.find(ts.isImportDeclaration);
  assert(ts.isStringLiteral(imported.moduleSpecifier));
  assert.equal(
    imported.moduleSpecifier.text,
    "@/components/blocks/communications-setup",
  );
  assert(
    imported.importClause?.namedBindings &&
      ts.isNamedImports(imported.importClause.namedBindings),
  );
  assert(!imported.importClause.isTypeOnly && !imported.importClause.name);
  assert(
    imported.importClause.namedBindings.elements.every(
      (entry) => !entry.isTypeOnly && !entry.propertyName,
    ),
  );
  assert.deepEqual(
    imported.importClause.namedBindings.elements.map(
      (entry) => entry.name.text,
    ),
    [sourceExport],
  );
  const element = expressions[0].expression;
  assert(
    ts.isJsxSelfClosingElement(element),
    "No fabricated children or live host",
  );
  assert.equal(element.tagName.getText(ast), sourceExport);
  const attributes = element.attributes.properties;
  for (const attribute of attributes) {
    assert(ts.isJsxAttribute(attribute), "No spread props in the demo snippet");
    assert(
      props.includes(attribute.name.getText(ast)),
      `Invented source prop: ${attribute.name.getText(ast)}`,
    );
    assert.equal(
      attribute.name.getText(ast),
      "defaultProvider",
      "Snippet must use the source's inert default demo adapter",
    );
  }
  assert.equal(attributes.length, 1);
  const provider = attributes[0].initializer;
  assert(provider && ts.isStringLiteral(provider));
  assert(providers.includes(provider.text), "Unrecognized source provider");
  if (expectedProvider !== undefined)
    assert.equal(provider.text, expectedProvider);
}

function rejectGuard(name, boundary, run) {
  assert.throws(run, undefined, `Guard accepted invalid input: ${name}`);
  return { name, boundary, rejected: true };
}

function compileExamples(cases) {
  const config = ts.readConfigFile(
    path.join(repo, "tsconfig.json"),
    ts.sys.readFile,
  );
  assert(!config.error, "Canonical source tsconfig unavailable");
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, repo);
  assert.equal(parsed.errors.length, 0);
  const options = {
    ...parsed.options,
    strict: true,
    noEmit: true,
    incremental: false,
    composite: false,
    baseUrl: repo,
    paths: { "@/*": ["src/*"] },
    jsx: ts.JsxEmit.ReactJSX,
    types: ["node", "react", "react-dom"],
  };
  const virtual = new Map(
    cases.map((entry, index) => [
      path.join(
        repo,
        "artifacts/communications-design",
        `__setup_example_${index}.tsx`,
      ),
      entry.emittedCode,
    ]),
  );
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host),
    fileExists = host.fileExists.bind(host);
  host.readFile = (file) => virtual.get(file) ?? readFile(file);
  host.fileExists = (file) => virtual.has(file) || fileExists(file);
  const program = ts.createProgram([...virtual.keys()], options, host);
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const at =
      diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
        : null;
    return {
      code: diagnostic.code,
      category: ts.DiagnosticCategory[diagnostic.category],
      file: diagnostic.file
        ? path.relative(repo, diagnostic.file.fileName)
        : null,
      line: at ? at.line + 1 : null,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    };
  });
}

function verify() {
  const mapText = read(sourceMapFile);
  const sourceMap = JSON.parse(mapText);
  const manifest = JSON.parse(read(".figma/code-connect-manifest.json"));
  assert.equal(
    manifest.templates.length,
    92,
    "Retained template count changed",
  );
  assert.equal(manifest.templateCheckpointVersion, "1.4.0");
  assert.equal(manifest.sourceValidationVersion, "1.5.0+automatic-setup");
  assert.equal(manifest.cloudPublication.performed, false);
  const native = sourceMap.components.find(
    (entry) =>
      entry.runtimeExport === sourceExport &&
      entry.codeConnectFile === templateFile,
  );
  assert(native, "Actual native CommunicationsSetup association missing");
  assert.equal(native.source, sourceFile);
  assert.equal(sourceMap.fileKey, manifest.fileKey);
  assert(
    /^\d+:\d+$/.test(native.masterID) && /^\d+:\d+$/.test(native.defaultID),
  );
  assert.deepEqual(
    native.nativePropertyKeys.slice().sort(),
    Object.keys(native.axes).sort(),
  );
  assert.deepEqual(
    Object.keys(native.propertyDefinitions).sort(),
    Object.keys(native.axes).sort(),
  );
  for (const [key, options] of Object.entries(native.axes)) {
    const definition = native.propertyDefinitions[key];
    assert.equal(definition.type, "VARIANT");
    assert.deepEqual(options, definition.variantOptions);
    assert(options.includes(definition.defaultValue));
  }
  assert.equal(native.nativeVariants.length, native.sparseVariantCount);
  assert.equal(
    new Set(native.nativeVariants.map((entry) => entry.id)).size,
    native.nativeVariants.length,
  );
  assert.equal(
    new Set(native.nativeVariants.map((entry) => JSON.stringify(entry.axes)))
      .size,
    native.nativeVariants.length,
  );
  assert(native.nativeVariants.some((entry) => entry.id === native.defaultID));
  for (const entry of native.nativeVariants) {
    assert(/^\d+:\d+$/.test(entry.id), "Unrecorded native variant ID");
    validateValues(entry.axes, native);
  }
  proof.sourceManifestVerified = checkSnapshots(
    sourceMap.sourceSnapshots,
    "native source snapshot",
  );
  assert(sourceMap.sourceSnapshots.some((entry) => entry.file === sourceFile));
  const source = sourceAst(sourceFile);
  const propsType = alias(source, "CommunicationsSetupProps");
  assert(ts.isTypeLiteralNode(propsType));
  const props = propsType.members.map((member) => member.name.getText(source));
  const providers = literalUnion(
    sourceAst("src/lib/communications/contracts.ts"),
    "CommunicationsProvider",
  );
  const phases = literalUnion(
    sourceAst("src/lib/communications/setup-contracts.ts"),
    "CommunicationsSetupPhase",
  );
  assert.deepEqual(native.axes.Provider, providers);
  proof.actualSourcePropKeys = { [sourceExport]: props };
  proof.actualStateUnion = phases;
  proof.readonlyDefaultDemo = readonlyDefaultEvidence(source);
  const code = read(templateFile);
  assert(
    !code.includes("figma.connect("),
    "Only parserless templates are allowed",
  );
  const urlText = /^\/\/ url=(.+)$/m.exec(code)?.[1];
  assert(urlText, "Missing native URL header");
  const url = new URL(urlText);
  assert.equal(url.hostname, "www.figma.com");
  assert.equal(url.pathname.split("/")[2], sourceMap.fileKey);
  assert.equal(
    url.searchParams.get("node-id")?.replaceAll("-", ":"),
    native.masterID,
  );
  assert(
    code.includes(`// source=${sourceFile}`) &&
      code.includes(`// component=${sourceExport}`),
  );
  const transpiled = ts.transpileModule(code, {
    fileName: templateFile,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  assert.equal(
    (transpiled.diagnostics ?? []).filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    ).length,
    0,
  );
  function evaluate(values) {
    validateValues(values, native);
    const readPropertyKeys = [];
    const selectedInstance = {
      getEnum(key, mapping) {
        assert.equal(
          native.propertyDefinitions[key]?.type,
          "VARIANT",
          `Unknown native property: ${key}`,
        );
        assert.deepEqual(
          Object.keys(mapping).sort(),
          native.axes[key].slice().sort(),
          `Incomplete enum mapping: ${key}`,
        );
        readPropertyKeys.push(key);
        return mapping[values[key]];
      },
    };
    const figma = {
      selectedInstance,
      code(strings, ...values) {
        return [
          {
            type: "CODE",
            code: strings.reduce(
              (text, part, index) =>
                text +
                part +
                (index < values.length
                  ? typeof values[index] === "string"
                    ? values[index]
                    : flatten(values[index])
                  : ""),
              "",
            ),
          },
        ];
      },
    };
    const localModule = { exports: {} };
    vm.runInNewContext(
      transpiled.outputText,
      {
        module: localModule,
        exports: localModule.exports,
        require(name) {
          assert.equal(
            name,
            "figma",
            "Native template cannot load runtime code",
          );
          return figma;
        },
      },
      { timeout: 1000, filename: templateFile },
    );
    const result = localModule.exports.default;
    const metadata = serializable(result.metadata.props);
    assert.equal(result.id, "aureform-communications-setup");
    assert.equal(metadata.status, "local-unpublished");
    assert.equal(metadata.node, native.masterID);
    assert.equal(metadata.defaultNode, native.defaultID);
    assert.equal(metadata.page, sourceMap.pageID);
    assert.equal(metadata.source, sourceFile);
    assert.equal(metadata.sourceExport, sourceExport);
    assert.equal(metadata.sourceHash, sha(read(sourceFile)));
    assert.deepEqual(metadata.axes, native.axes);
    assert.deepEqual(metadata.nativePropertyValues, values);
    assert.deepEqual(
      metadata.nativePropertyKeys.slice().sort(),
      native.nativePropertyKeys.slice().sort(),
    );
    assert.deepEqual(
      readPropertyKeys.slice().sort(),
      native.nativePropertyKeys.slice().sort(),
    );
    assert.deepEqual(metadata.mappedProperties, [
      {
        property: "Provider",
        type: "VARIANT",
        codeTarget: "defaultProvider",
        values: Object.fromEntries(
          providers.map((provider) => [provider, provider]),
        ),
      },
    ]);
    for (const property of ["Viewport", "Mode", "Phase"])
      assert(
        metadata.intentionalVisualOnly.some(
          (entry) => entry.property === property && entry.reason,
        ),
      );
    const emittedCode = `${result.imports.join("\n")}\n${flatten(result.example)}`;
    validateExample(emittedCode, props, providers, values.Provider);
    return { readPropertyKeys, emittedCode, metadata };
  }
  const cases = native.nativeVariants.map((entry) => ({
    name: entry.id,
    nativeVariantID: entry.id,
    nativeAxes: entry.axes,
    ...evaluate(entry.axes),
  }));
  proof.templates = [
    {
      name: sourceExport,
      file: templateFile,
      sha256: sha(code),
      syntax: "PASS",
      masterID: native.masterID,
      defaultID: native.defaultID,
    },
  ];
  proof.nativeProperties = native.propertyDefinitions;
  proof.nativePropertyKeys = native.nativePropertyKeys;
  proof.syntheticCases = cases;
  proof.emittedCases = cases.length;
  proof.distinctTypedExamples = new Set(
    cases.map((entry) => entry.emittedCode),
  ).size;
  proof.guardTests = Object.keys(native.axes).flatMap((key) => [
    rejectGuard(
      `missing native ${key}`,
      "verifier-native-value-boundary",
      () => {
        const values = { ...native.nativeVariants[0].axes };
        delete values[key];
        evaluate(values);
      },
    ),
    rejectGuard(
      `unrecorded native ${key}`,
      "verifier-native-value-boundary",
      () =>
        evaluate({ ...native.nativeVariants[0].axes, [key]: "__unrecorded__" }),
    ),
  ]);
  proof.guardTests.push(
    rejectGuard("invented phase prop", "emitted-source-prop-boundary", () =>
      validateExample(
        `${cases[0].emittedCode.replace(" />", ' phase="configured" />')}`,
        props,
        providers,
      ),
    ),
    rejectGuard(
      "adapter override in demo snippet",
      "emitted-default-demo-boundary",
      () =>
        validateExample(
          `${cases[0].emittedCode.replace(" />", " adapter={undefined} />")}`,
          props,
          providers,
        ),
    ),
    rejectGuard(
      "runtime initializer in demo snippet",
      "emitted-inert-source-boundary",
      () =>
        validateExample(
          `const request = fetch("/not-executed");\n${cases[0].emittedCode}`,
          props,
          providers,
        ),
    ),
  );
  const diagnostics = compileExamples(cases);
  proof.strictCompile = {
    strict: true,
    noEmit: true,
    sourceCheckout: ".",
    dependencyTypes: "node_modules",
    typescript: ts.version,
    sourceModuleFiles: [{ file: sourceFile, sha256: sha(read(sourceFile)) }],
    errors: diagnostics,
  };
  assert.equal(
    diagnostics.length,
    0,
    "Strict emitted-source compilation failed",
  );
  proof.retainedManifest = {
    templateCheckpointVersion: manifest.templateCheckpointVersion,
    sourceValidationVersion: manifest.sourceValidationVersion,
    templateCount: manifest.templates.length,
    authoritativeInputs: checkSnapshots(
      manifest.authoritativeInputs,
      "retained authoritative input",
    ).length,
    templateSnapshots: checkSnapshots(
      manifest.templateSnapshots,
      "retained template snapshot",
    ).length,
    sourceSnapshots: checkSnapshots(
      manifest.sourceSnapshots,
      "current manifest source snapshot",
    ).length,
    coverage: manifest.coverage,
    standaloneSetupTemplateRegisteredInRetainedManifest:
      manifest.templates.some((entry) => entry.file === templateFile),
  };
  assert.equal(
    proof.retainedManifest.standaloneSetupTemplateRegisteredInRetainedManifest,
    false,
  );
  const block = manifest.sourceBlocks.find(
    (entry) => entry.export === sourceExport && entry.source === sourceFile,
  );
  assert(
    block && block.mapped === false,
    "Standalone mapping must not alter retained coverage",
  );
  checkSnapshots(
    sourceMap.sourceSnapshots,
    "native source snapshot final readback",
  );
  assert.equal(
    sha(read(templateFile)),
    sha(code),
    "Template changed during verification",
  );
  assert.equal(
    sha(read(sourceMapFile)),
    sha(mapText),
    "Native source map changed during verification; rerun with the final record",
  );
  proof.nativeRecord = {
    file: sourceMapFile,
    sha256: sha(mapText),
    status: sourceMap.status,
    fileKey: sourceMap.fileKey,
    pageID: sourceMap.pageID,
    nativePageQACertifiedByThisVerifier: false,
  };
  proof.templateAPI = {
    execution: "local-synthetic-figma-port",
    typecheck:
      "template syntax only; emitted JSX checked against actual source and installed dependency types",
    hostedRuntimeVerified: false,
  };
  proof.status = "PASS";
}

try {
  verify();
} catch (error) {
  proof.error =
    error instanceof Error ? error.message : "Local validation failed";
  process.exitCode = 1;
}
fs.mkdirSync(path.dirname(path.join(repo, output)), { recursive: true });
fs.writeFileSync(
  path.join(repo, output),
  JSON.stringify(proof, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: proof.status,
    emittedCases: proof.emittedCases ?? 0,
    strictErrors: proof.strictCompile?.errors ?? [],
    sourceFilesVerified: proof.sourceManifestVerified?.length ?? 0,
    error: proof.error,
    proof: output,
  }),
);
