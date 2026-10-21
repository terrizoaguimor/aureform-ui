// Local parserless evaluation and emitted-example typing; no live Figma or carrier execution.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import ts from "typescript";
const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const healthy = repo;
const out = path.join(repo, "artifacts/communications-design");
fs.mkdirSync(out, { recursive: true });
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
const nativeSource = JSON.parse(
  fs.readFileSync(
    path.join(repo, "design/figma/softphone-native-source-2026-10-21.json"),
    "utf8",
  ),
);
const verified = nativeSource.sourceSnapshots.map((entry) => {
  const current = sha(fs.readFileSync(path.join(repo, entry.file)));
  if (current !== entry.sha256) throw Error("Source changed: " + entry.file);
  return { ...entry, currentSHA256: current, recordedSourceMatches: true };
});
function aliasMembers(file, name) {
  const code = fs.readFileSync(path.join(repo, file), "utf8");
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declaration = source.statements.find(
    (n) => ts.isTypeAliasDeclaration(n) && n.name.text === name,
  );
  if (!declaration) throw Error("Actual source type missing: " + name);
  return declaration.type;
}
const stateType = aliasMembers(
  "src/components/blocks/softphone.tsx",
  "SoftphoneState",
);
const states = stateType.types.map((n) => n.literal.text);
const panelProps = aliasMembers(
  "src/components/blocks/softphone.tsx",
  "SoftphoneProps",
).members.map((n) => n.name.getText());
const workspaceProps = aliasMembers(
  "src/components/blocks/softphone-workspace.tsx",
  "SoftphoneWorkspaceProps",
).members.map((n) => n.name.getText());
const templates = ["Softphone", "SoftphoneWorkspace"].map((name) => {
  const file = path.join(repo, ".figma", name + ".figma.ts");
  const code = fs.readFileSync(file, "utf8");
  const emitted = ts.transpileModule(code, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: true,
    },
  });
  const errors = (emitted.diagnostics || []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  );
  if (errors.length)
    throw Error(
      ts.formatDiagnosticsWithColorAndContext(
        errors,
        ts.createCompilerHost({}),
      ),
    );
  return { name, file, code, emitted: emitted.outputText, sha256: sha(code) };
});
function evaluate(
  template,
  values,
  providerLabel = "Twilio",
  missingSelect = false,
) {
  const observed = [];
  const selectedInstance = {
    getEnum(key, mapping) {
      observed.push(key);
      if (!(values[key] in mapping)) throw Error("Missing enum " + key);
      return mapping[values[key]];
    },
    getString(key) {
      observed.push(key);
      if (!(key in values)) throw Error("Missing TEXT key " + key);
      return values[key];
    },
    findInstance(name, options) {
      if (
        name !== "Voice provider / Twilio" ||
        options.traverseInstances !== true
      )
        throw Error("Unexpected native Select lookup");
      return missingSelect
        ? { type: "ERROR" }
        : {
            type: "INSTANCE",
            getString(key) {
              if (key !== "Label#15:11")
                throw Error("Wrong actual Select TEXT key");
              observed.push("Voice provider / Twilio::" + key);
              return providerLabel;
            },
          };
    },
  };
  const figma = {
    selectedInstance,
    code: (strings, ...args) =>
      strings.reduce(
        (s, part, i) => s + part + (i < args.length ? args[i] : ""),
        "",
      ),
  };
  const context = {
    module: { exports: {} },
    exports: {},
    require: (name) => {
      if (name !== "figma") throw Error("Only synthetic figma may execute");
      return figma;
    },
  };
  context.exports = context.module.exports;
  vm.runInNewContext(template.emitted, context, { timeout: 1000 });
  const result = context.module.exports.default;
  return {
    code: result.imports.join("\n") + "\n" + result.example,
    observed,
    metadata: result.metadata,
  };
}
const cases = [];
const textValues = {
  "Contact#563:0": "Your call workspace",
  "Metadata#563:8": "Customer support · inbound calls",
  "Duration#563:16": "00:00",
};
for (const state of states) {
  const result = evaluate(templates[0], {
    State: state,
    Pending: "false",
    ...textValues,
  });
  cases.push({ name: "panel-" + state, template: "Softphone", ...result });
}
cases.push({
  name: "panel-ringing-pending",
  template: "Softphone",
  ...evaluate(templates[0], {
    State: "ringing",
    Pending: "true",
    ...textValues,
  }),
});
for (const viewport of ["desktop", "mobile"])
  for (const activity of ["disconnected", "active", "permission"])
    for (const provider of ["Twilio", "Telnyx"]) {
      cases.push({
        name: `workspace-${viewport}-${activity}-${provider}`,
        template: "SoftphoneWorkspace",
        ...evaluate(
          templates[1],
          { Viewport: viewport, Activity: activity },
          provider,
        ),
      });
    }
for (const [duration, expected] of [
  ["02:03", 123],
  ["1:02:03", 3723],
  ["invalid", 0],
]) {
  const result = evaluate(templates[0], {
    State: "active",
    Pending: "false",
    ...textValues,
    "Duration#563:16": duration,
  });
  if (!result.code.includes(`seconds={${expected}}`))
    throw Error("Duration conversion");
  cases.push({
    name: "duration-" + expected,
    template: "Softphone",
    ...result,
  });
}
for (const c of cases) {
  const ast = ts.createSourceFile(
    c.name + ".tsx",
    c.code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  if (ast.parseDiagnostics.length)
    throw Error("Emitted JSX parse error: " + c.name);
  const allowed = c.template === "Softphone" ? panelProps : workspaceProps;
  function inspect(n) {
    if (ts.isJsxAttribute(n) && !allowed.includes(n.name.getText()))
      throw Error("Invented source prop " + n.name.getText());
    ts.forEachChild(n, inspect);
  }
  inspect(ast);
}
const sourceFile = path.join(out, "code-connect-emitted-examples.tsx");
fs.writeFileSync(
  sourceFile,
  cases
    .map((c) =>
      c.code
        .split("\n")
        .filter((line) => !line.startsWith("import "))
        .join("\n"),
    )
    .map((code, i) => `export const example${i} = (${code});`)
    .join("\n") + "\n",
);
const imports =
  [
    ...new Set(
      cases.flatMap((c) =>
        c.code.split("\n").filter((line) => line.startsWith("import ")),
      ),
    ),
  ].join("\n") + "\n";
fs.writeFileSync(sourceFile, imports + fs.readFileSync(sourceFile, "utf8"));
const configPath = path.join(healthy, "tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw Error("Source tsconfig unavailable");
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, healthy);
const options = {
  ...parsed.options,
  strict: true,
  noEmit: true,
  incremental: false,
  composite: false,
  baseUrl: healthy,
  paths: { "@/*": ["src/*"] },
  jsx: ts.JsxEmit.ReactJSX,
  types: ["node", "react", "react-dom"],
};
const sourceModuleFiles = [
  "src/components/blocks/softphone.tsx",
  "src/components/blocks/softphone-workspace.tsx",
].map((file) => ({
  file,
  sha256: sha(fs.readFileSync(path.join(repo, file))),
}));
const host = ts.createCompilerHost(options);
// Resolve emitted examples against installed JSX/runtime packages from the
// actual source checkout, without stubs or changing its dependency tree.
host.resolveModuleNames = (names, containingFile) =>
  names.map(
    (name) =>
      ts.resolveModuleName(name, containingFile, options, ts.sys)
        .resolvedModule ||
      ts.resolveModuleName(
        name,
        path.join(healthy, "src/__native_template_check__.tsx"),
        options,
        ts.sys,
      ).resolvedModule,
  );
const program = ts.createProgram({ rootNames: [sourceFile], options, host });
const diagnostics = ts.getPreEmitDiagnostics(program);
const errors = diagnostics.filter(
  (d) => d.category === ts.DiagnosticCategory.Error,
);
const rendered = errors.map((d) => {
  const at =
    d.file && d.start !== undefined
      ? d.file.getLineAndCharacterOfPosition(d.start)
      : null;
  return {
    code: d.code,
    file: d.file?.fileName,
    line: at ? at.line + 1 : null,
    message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
  };
});
const guardTests = [
  [
    "missing native Select",
    () =>
      evaluate(
        templates[1],
        { Viewport: "desktop", Activity: "active" },
        "Twilio",
        true,
      ),
  ],
  [
    "unsupported provider label",
    () =>
      evaluate(
        templates[1],
        { Viewport: "desktop", Activity: "active" },
        "Unknown",
      ),
  ],
].map(([name, run]) => {
  let rejected = false;
  try {
    run();
  } catch {
    rejected = true;
  }
  if (!rejected) throw Error("Guard failed");
  return { name, rejected };
});
const proof = {
  UTC: new Date().toISOString(),
  status: errors.length ? "STRICT_COMPILE_FAILED" : "PASS",
  execution:
    "Only parserless template code evaluated with synthetic selectedInstance; no React/provider/network execution.",
  templates: templates.map(({ name, file, sha256 }) => ({
    name,
    file,
    sha256,
    syntax: "PASS",
  })),
  sourceManifestVerified: verified,
  actualSourcePropKeys: {
    Softphone: panelProps,
    SoftphoneWorkspace: workspaceProps,
  },
  actualStateUnion: states,
  syntheticCases: cases.map(({ name, template, observed, code }) => ({
    name,
    template,
    readPropertyKeys: observed,
    emittedCode: code,
  })),
  emittedCases: cases.length,
  strictCompile: {
    strict: true,
    noEmit: true,
    sourceCheckout: ".",
    sourceModuleFiles,
    errors: rendered,
  },
  guardTests,
  limitations: [
    "Local parserless artifacts, unpublished and unregistered.",
    "Synthetic template execution and actual-source compile do not prove execution inside the hosted Code Connect service.",
  ],
};
fs.writeFileSync(
  path.join(out, "code-connect-validation.json"),
  JSON.stringify(proof, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    status: proof.status,
    emittedCases: cases.length,
    strictErrors: rendered.slice(0, 10),
    sourceFilesVerified: verified.length,
    sourceProps: proof.actualSourcePropKeys,
    proof: path.relative(repo, path.join(out, "code-connect-validation.json")),
  }),
);
if (errors.length) process.exitCode = 1;
