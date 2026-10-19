import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { entries, kitRoot, dependencyClosure } from "./lib/source-graph.mjs";

const require = createRequire(import.meta.url);
const ts = require(
  resolve(
    process.env.AUREFORM_DEPENDENCIES || resolve(kitRoot, "node_modules"),
    "typescript",
  ),
);
const options = new Set(process.argv.slice(2));
assert(
  [...options].every((option) => option === "--docs-only"),
  "Usage: node scripts/generate-coverage.mjs [--docs-only]",
);

const read = (file) => readFile(resolve(kitRoot, file), "utf8");
const readOptionalJson = async (file) => {
  try {
    return JSON.parse(await read(file));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};
const parsed = (file, text) =>
  ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
const [
  catalogText,
  appText,
  stateText,
  baselineStateText,
  imageManifestText,
  manifest,
  registry,
  packageManifest,
  appearanceText,
  tokens,
  effectIndexText,
  chartText,
] = await Promise.all([
  read("src/lib/catalog.ts"),
  read("src/components/app-page.tsx"),
  read(".figma/state.json"),
  read(".figma/history/state-1.2-final.json"),
  read("public/assets/generated-images.json"),
  read(".figma/code-connect-manifest.json").then(JSON.parse),
  entries(),
  read("package.json").then(JSON.parse),
  read("src/lib/appearance.ts"),
  read("tokens/aureform.tokens.json").then(JSON.parse),
  read("src/components/effects/index.ts"),
  read("src/components/ui/chart.tsx"),
]);
const state = JSON.parse(stateText);
const digest = (content) => createHash("sha256").update(content).digest("hex");
const stateSha256 = digest(stateText);
const baselineState = JSON.parse(baselineStateText);
const baselineStateSha256 = digest(baselineStateText);
const baselineStateFile = ".figma/history/state-1.2-final.json";
const imageManifest = JSON.parse(imageManifestText);
const imageManifestFile = "public/assets/generated-images.json";
const imageAuditFile = ".figma/native-generated-images-1.2.1.json";
const nativeAuditFile = ".figma/native-audit-1.2.json";
const nativeSaasLibraryFile = ".figma/native-saas-library-1.2.json";
const historicalNativeAuditFile = ".figma/native-audit.json";
const [nativeAudit, nativeSaasLibrary, historicalNativeAudit, imageAudit] =
  await Promise.all([
    readOptionalJson(nativeAuditFile),
    readOptionalJson(nativeSaasLibraryFile),
    readOptionalJson(historicalNativeAuditFile),
    readOptionalJson(imageAuditFile),
  ]);
const catalog = parsed("catalog.ts", catalogText);
const app = parsed("app-page.tsx", appText);

function literal(node) {
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node))
    return literal(node.expression);
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node))
    return Object.fromEntries(
      node.properties.map((property) => {
        assert(ts.isPropertyAssignment(property), "Expected catalog data");
        return [property.name.text, literal(property.initializer)];
      }),
    );
  throw new Error(`Unsupported catalog value: ${node.getText(catalog)}`);
}
const declarations = catalog.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => statement.declarationList.declarations);
const data = (name) => {
  const declaration = declarations.find(
    (item) => item.name.getText(catalog) === name,
  );
  assert(declaration, `Missing ${name}`);
  return literal(declaration.initializer);
};
const suiteRoutes = data("routes");
const families = data("componentFamilies");
assert.equal(suiteRoutes.length, 68, "Aureform 1.2 has 68 suite routes.");
assert.equal(families.length, 44);
assert.equal(
  new Set(suiteRoutes.map((route) => route.path)).size,
  suiteRoutes.length,
);
const appearanceRoutes = ["studio", "themes", "effects"];
const newRoutes = [
  "onboarding",
  "settings/workspace",
  "customers/detail",
  "imports",
];
const upgradedRoutes = ["customers", "settings/team"];
const saasRoutes = [...newRoutes, ...upgradedRoutes];
for (const path of [...appearanceRoutes, ...saasRoutes])
  assert(
    suiteRoutes.some((route) => route.path === path),
    `Missing preserved/new route: ${path}`,
  );
const saasNativeComponents = Object.entries(
  nativeSaasLibrary?.components ?? {},
).map(([nativeName, component]) => {
  assert(
    component &&
      typeof component.source === "string" &&
      typeof component.export === "string" &&
      typeof component.defaultId === "string" &&
      component.defaultId.length > 0,
    `Invalid SaaS native component metadata: ${nativeName}`,
  );
  return {
    nativeName,
    setId: component.setId ?? null,
    defaultId: component.defaultId,
    variants: component.variants ?? null,
    source: component.source,
    export: component.export,
    axes: component.axes ?? {},
  };
});
const saasNativeViews = nativeSaasLibrary?.views ?? [];
assert(Array.isArray(saasNativeViews), "Expected SaaS native views array");
assert.equal(
  new Set(saasNativeViews.map((view) => view.path)).size,
  saasNativeViews.length,
  "Duplicate SaaS native route metadata",
);
for (const view of saasNativeViews) {
  assert(
    saasRoutes.includes(view.path),
    `Native SaaS view outside the six-route scope: ${view.path}`,
  );
  assert(view.nodes && typeof view.nodes === "object", "Missing mode nodes");
  for (const mode of ["Light", "Dark"])
    assert(
      typeof view.nodes[mode] === "string" && view.nodes[mode].length > 0,
      `Missing ${mode} native node for ${view.path}`,
    );
}
const appearanceSource = parsed("appearance.ts", appearanceText);
const presetsDeclaration = appearanceSource.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => statement.declarationList.declarations)
  .find(
    (declaration) =>
      declaration.name.getText(appearanceSource) === "palettePresets",
  );
assert(presetsDeclaration, "Missing pure palette presets");
const palettes = literal(presetsDeclaration.initializer);
assert.equal(palettes.length, 6);
const effectIndex = parsed("effects/index.ts", effectIndexText);
const effects = effectIndex.statements
  .filter(ts.isExportDeclaration)
  .filter(
    (statement) =>
      statement.exportClause && ts.isNamedExports(statement.exportClause),
  )
  .flatMap((statement) =>
    statement.exportClause.elements
      .filter((element) => !element.isTypeOnly && !statement.isTypeOnly)
      .map((element) => ({
        export: element.name.text,
        source: `src/components/effects/${statement.moduleSpecifier.text.slice(2)}.tsx`,
        registry: statement.moduleSpecifier.text.slice(2),
      })),
  );
assert.equal(effects.length, 6);
for (const name of [
  "appearance-provider",
  "appearance-controls",
  "motion-system",
  ...effects.map((effect) => effect.registry),
])
  assert(registry[name], `Missing source-graph registry entry: ${name}`);
const registryGraphs = await Promise.all(
  Object.values(registry).map(async (entry) => ({
    ...entry,
    graph: await dependencyClosure([entry.file]),
  })),
);

const imports = new Map();
for (const statement of app.statements.filter(ts.isImportDeclaration)) {
  const bindings = statement.importClause?.namedBindings;
  if (bindings && ts.isNamedImports(bindings))
    for (const binding of bindings.elements)
      imports.set(
        binding.name.text,
        statement.moduleSpecifier.text.replace("@/", "src/") + ".tsx",
      );
}
const dispatcher = app.statements.find(
  (statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === "AppPage",
);
assert(dispatcher?.body, "Missing AppPage dispatcher");
const firstBranch = dispatcher.body.statements.find(ts.isIfStatement);

function condition(node, path) {
  if (ts.isParenthesizedExpression(node))
    return condition(node.expression, path);
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isIdentifier(node) && node.text === "path") return path;
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.ExclamationToken
  )
    return !condition(node.operand, path);
  if (ts.isArrayLiteralExpression(node))
    return node.elements.map((item) => condition(item, path));
  if (ts.isBinaryExpression(node)) {
    const left = condition(node.left, path);
    const right = condition(node.right, path);
    if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken)
      return left || right;
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
      return left && right;
    if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken)
      return left === right;
  }
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression)
  ) {
    const target = condition(node.expression.expression, path);
    const value = condition(node.arguments[0], path);
    if (node.expression.name.text === "includes") return target.includes(value);
    if (node.expression.name.text === "startsWith")
      return target.startsWith(value);
  }
  throw new Error(`Unsupported route condition: ${node.getText(app)}`);
}
function contentTag(statement) {
  let tag;
  function visit(node) {
    if (
      ts.isBinaryExpression(node) &&
      ts.isIdentifier(node.left) &&
      node.left.text === "content" &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      let value = node.right;
      while (ts.isParenthesizedExpression(value)) value = value.expression;
      if (ts.isJsxElement(value))
        tag = value.openingElement.tagName.getText(app);
      if (ts.isJsxSelfClosingElement(value)) tag = value.tagName.getText(app);
    }
    ts.forEachChild(node, visit);
  }
  visit(statement);
  assert(tag && imports.has(tag), "Missing imported template for route");
  return tag;
}
function handler(path) {
  let branch = firstBranch;
  while (branch && ts.isIfStatement(branch)) {
    if (condition(branch.expression, path)) {
      const component = contentTag(branch.thenStatement);
      return { component, file: imports.get(component) };
    }
    branch = branch.elseStatement;
  }
  throw new Error(`No rendered implementation for /${path}`);
}
const link = (id) => `${state.url}?node-id=${id.replaceAll(":", "-")}`;
const nativeRoots = state.entities.routeScreens;
const views = [
  {
    path: "",
    en: "Landing",
    es: "Presentación",
    group: "landing",
    delivery: "1.0",
  },
  ...suiteRoutes,
].map((route) => {
  const pairedView = saasNativeViews.find((view) => view.path === route.path);
  const recordedRoot = nativeRoots[route.path];
  const figmaNode = pairedView
    ? Object.values(pairedView.nodes).includes(recordedRoot)
      ? recordedRoot
      : pairedView.nodes.Dark
    : recordedRoot;
  assert(
    figmaNode || newRoutes.includes(route.path),
    `Missing established Figma root: ${route.path || "landing"}`,
  );
  return {
    ...route,
    source: handler(route.path),
    urls: {
      en: `/en/${route.path ? route.path + "/" : ""}`,
      es: `/es/${route.path ? route.path + "/" : ""}`,
    },
    figma: figmaNode
      ? {
          node: figmaNode,
          url: link(figmaNode),
          editable: true,
          status: "mapped-native-id",
          ...(pairedView
            ? {
                nodes: { ...pairedView.nodes },
                modeUrls: Object.fromEntries(
                  ["Light", "Dark"].map((mode) => [
                    mode,
                    link(pairedView.nodes[mode]),
                  ]),
                ),
                metadata: nativeSaasLibraryFile,
              }
            : {}),
        }
      : {
          node: null,
          url: null,
          editable: false,
          status: "pending-owner-native-id",
        },
  };
});
assert.equal(views.length, 69, "Aureform 1.2 has 69 views including landing.");
for (const path of Object.keys(nativeRoots))
  assert(
    views.some((view) => view.path === path),
    `Native root outside the route catalog: ${path}`,
  );
const pendingNativeRoutes = views
  .filter((view) => !view.figma.node)
  .map((view) => view.path);
const components = families.map((family) => {
  const connection = manifest.templates.find(
    (item) => item.kind === "core" && item.nativeName === family,
  );
  assert(connection, `Missing Code Connect mapping: ${family}`);
  return {
    family,
    source: connection.source,
    example: `examples/components/${family}.tsx`,
    demo: `/en/components/#dialog-${family}`,
    figma: {
      node: connection.node,
      url: connection.url,
      axes: connection.axes,
    },
    codeConnect: { file: connection.file, status: connection.status },
  };
});
const nativeBlocks = manifest.templates.filter((item) => item.kind === "block");
assert(
  nativeBlocks.length >= 9,
  "Preserve the established native block mappings",
);
const sourceBlockEntries = Object.values(registry).filter((entry) =>
  entry.file.startsWith("src/components/blocks/"),
);
const runtimeExports = (source) =>
  source.statements.flatMap((statement) => {
    if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    )
      return statement.exportClause.elements
        .filter((element) => !element.isTypeOnly)
        .map((element) => element.name.text);
    if (
      !statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    )
      return [];
    if (ts.isFunctionDeclaration(statement))
      return statement.name ? [statement.name.text] : [];
    if (ts.isVariableStatement(statement))
      return statement.declarationList.declarations
        .filter((declaration) => ts.isIdentifier(declaration.name))
        .map((declaration) => declaration.name.text);
    return [];
  });
await Promise.all(
  saasNativeComponents.map(async (component) => {
    assert(
      Object.values(registry).some((entry) => entry.file === component.source),
      `Native SaaS source is not in the registry: ${component.source}`,
    );
    const source = parsed(component.source, await read(component.source));
    assert(
      runtimeExports(source).includes(component.export),
      `Unknown native/source export ${component.export} in ${component.source}`,
    );
  }),
);
const normalizedName = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const blockExportOverrides = {
  "record-detail": ["GenericRecordDetail"],
  "record-actions": ["RowActions", "DeleteDialog"],
  "product-manager": ["ProductsManager"],
  "product-image-editor": ["ProductImageEditor", "ProductImageThumbnail"],
  "social-auth": ["SocialAuth", "SocialProviderLogo"],
  "commerce-checkout": [
    "CommerceCheckout",
    "CommerceStatusBadge",
    "CommerceTotals",
    "CommerceProductThumbnail",
  ],
  "commerce-order-editor": ["CommerceOrderEditor", "CommerceOrderDetail"],
  "commerce-invoice-view": [
    "CommerceInvoiceView",
    "CommerceInvoiceTable",
    "CommerceInvoiceEditor",
  ],
};
// 1.4 is a frontend expansion. These modules have no claimed native master;
// keep the owner's historical Figma IDs/reviews instead of inventing bindings.
const sourceOnlyApplicationFiles = new Set(
  [
    "commerce-workspace",
    "commerce-billing",
    "commerce-checkout",
    "commerce-order-editor",
    "commerce-invoice-view",
    "product-manager",
    "product-image-editor",
    "maps-workspace",
    "google-map",
    "social-auth",
  ].map((name) => `src/components/blocks/${name}.tsx`),
);
const blocks = (
  await Promise.all(
    sourceBlockEntries.map(async (entry) => {
      const source = parsed(entry.file, await read(entry.file));
      const names = runtimeExports(source);
      const overrides = blockExportOverrides[entry.name];
      const exports =
        overrides ??
        names.filter(
          (name) => normalizedName(name) === normalizedName(entry.name),
        );
      assert.equal(
        exports.length,
        overrides?.length ?? 1,
        `Missing expected source export for ${entry.name}`,
      );
      for (const name of exports)
        assert(
          names.includes(name),
          `Unknown source export ${name} in ${entry.file}`,
        );
      return exports.map((name) => {
        const connection = nativeBlocks.find(
          (item) => item.source === entry.file && item.export === name,
        );
        const directMappings = saasNativeComponents.filter(
          (item) => item.source === entry.file && item.export === name,
        );
        const direct = directMappings[0];
        const sourceOnly =
          !connection &&
          !direct &&
          ((entry.file === "src/components/blocks/table-toolbar.tsx" &&
            name === "TableToolbar") ||
            sourceOnlyApplicationFiles.has(entry.file));
        return {
          export: name,
          source: entry.file,
          registry: entry.name,
          figma: direct
            ? {
                node: direct.defaultId,
                url: link(direct.defaultId),
                setId: direct.setId,
                axes: direct.axes,
                nativeName: direct.nativeName,
                status: "mapped-direct-native-id",
                metadata: nativeSaasLibraryFile,
                associations: directMappings.map((item) => ({
                  ...item,
                  url: link(item.defaultId),
                })),
              }
            : connection
              ? {
                  node: connection.node,
                  url: connection.url,
                  axes: connection.axes,
                  status: "mapped-native-id",
                }
              : {
                  node: null,
                  url: null,
                  status: sourceOnly
                    ? "source-only-helper"
                    : "pending-owner-native-id",
                },
          codeConnect: connection?.file ?? null,
        };
      });
    }),
  )
).flat();
const pendingNativeBlocks = blocks
  .filter(
    (block) => !block.figma.node && block.figma.status !== "source-only-helper",
  )
  .map((block) => block.export);
const sourceOnlyBlocks = blocks
  .filter((block) => block.figma.status === "source-only-helper")
  .map((block) => block.export);
const layoutNames = [
  "sidebar",
  "compact",
  "topbar",
  "split",
  "centered",
  "floating",
];
const chartSource = parsed("chart.tsx", chartText);
const chartAlias = chartSource.statements.find(
  (statement) =>
    ts.isTypeAliasDeclaration(statement) && statement.name.text === "ChartKind",
);
assert(
  chartAlias && ts.isUnionTypeNode(chartAlias.type),
  "Missing source ChartKind union",
);
const chartNames = chartAlias.type.types.map((type) => {
  assert(ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal));
  return type.literal.text;
});
for (const legacyKind of ["area", "line", "bar", "pie", "radar", "radial"])
  assert(
    chartNames.includes(legacyKind),
    `Preserve the existing ${legacyKind} chart API.`,
  );
assert.equal(
  new Set(chartNames).size,
  chartNames.length,
  "Duplicate source chart kind",
);
const nativeChart = manifest.templates.find(
  (item) => item.nativeName === "Chart",
);
assert(nativeChart, "Preserve the established Chart mapping");
const nativeChartKindProperty = nativeChart.mappedProperties.find(
  (property) => property.type === "VARIANT" && property.codeTarget === "kind",
);
assert(
  nativeChartKindProperty?.options,
  "Missing recorded native chart Kind property",
);
const nativeChartKinds = Object.entries(nativeChartKindProperty.options);
for (const [nativeKind, sourceKind] of nativeChartKinds) {
  assert(
    nativeChart.axes.Kind.includes(nativeKind),
    "Unrecorded native chart Kind",
  );
  assert(
    chartNames.includes(sourceKind),
    "Native chart mapping lost a declared source kind",
  );
}
const referenceCategories = [
  {
    reference: [
      "saas",
      "analytics",
      "crm",
      "ecommerce",
      "sales",
      "marketing",
      "logistics",
      "finance",
      "stocks",
    ],
    routes: views
      .filter((route) => route.group === "dashboard")
      .map((route) => route.path),
  },
  {
    reference: ["tables", "transactions", "invoice"],
    routes: [
      "customers",
      "products",
      "orders",
      "invoices",
      "transactions",
      "invoice",
    ],
  },
  {
    reference: ["ai", "ai-dashboard"],
    routes: views
      .filter((route) => route.group === "ai")
      .map((route) => route.path),
  },
  {
    reference: ["task", "calendar"],
    routes: ["tasks", "task-list", "pipeline", "calendar"],
  },
  {
    reference: ["email", "chats", "file-manager", "support", "maps"],
    routes: ["mail", "chat", "files", "support", "maps"],
  },
  {
    reference: ["UserProfile", "api-keys", "ai-settings", "integration"],
    routes: views
      .filter((route) => route.group === "settings")
      .map((route) => route.path),
  },
  {
    reference: [
      "ui",
      "UiExample",
      "form",
      "charts",
      "example-layout",
      "cards",
      "links",
      "list",
    ],
    routes: [
      "components",
      "forms",
      "charts",
      "layouts",
      "blocks",
      "templates",
      "media",
      ...appearanceRoutes,
    ],
  },
  {
    reference: [
      "workspace",
      "onboarding",
      "members",
      "customer-detail",
      "import",
    ],
    routes: saasRoutes,
  },
  {
    reference: ["auth", "faqs", "price-table", "OtherPage"],
    routes: views
      .filter((route) => ["auth", "auxiliary"].includes(route.group))
      .map((route) => route.path),
  },
];
const sourceFiles = new Set([
  ...views.map((item) => item.source.file),
  ...components.flatMap((item) => [
    item.source,
    item.example,
    item.codeConnect.file,
  ]),
  ...blocks.flatMap((item) =>
    item.codeConnect ? [item.source, item.codeConnect] : [item.source],
  ),
  ...effects.map((effect) => effect.source),
  ...saasNativeComponents.map((component) => component.source),
  "src/components/appearance-provider.tsx",
  "src/components/appearance-controls.tsx",
  "src/lib/appearance.ts",
  "scripts/lib/appearance-tokens.mjs",
]);
await Promise.all(
  [...sourceFiles].map((file) => access(resolve(kitRoot, file))),
);
const nativeAuditBaselineMatches =
  nativeAudit?.status === "passed-native-structure-and-visual-review" &&
  (!nativeAudit.fileKey || nativeAudit.fileKey === baselineState.fileKey) &&
  nativeAudit.stateSha256 === baselineStateSha256 &&
  nativeAudit.summary?.routeRoots === views.length &&
  Array.isArray(nativeAudit.routes) &&
  nativeAudit.routes.length === views.length &&
  new Set(nativeAudit.routes.map((route) => route.route || "landing")).size ===
    views.length &&
  views.every((view) =>
    nativeAudit.routes.some(
      (route) =>
        (route.route || "landing") === (view.path || "landing") &&
        (!route.nodeId ||
          route.nodeId === baselineState.entities.routeScreens[view.path]),
    ),
  );
const saasNativeModeNodes = saasNativeViews.flatMap((view) =>
  ["Light", "Dark"].map((mode) => view.nodes[mode]),
);
const saasVariantCount = saasNativeComponents.reduce(
  (count, component) => count + (component.variants ?? 0),
  0,
);
const saasNativeScopeMatches =
  saasNativeViews.length === 6 &&
  saasRoutes.every((path) =>
    saasNativeViews.some((view) => view.path === path),
  ) &&
  new Set(saasNativeModeNodes).size === 12 &&
  saasNativeComponents.length === 9 &&
  saasNativeComponents.every(
    (component) =>
      Number.isInteger(component.variants) && component.variants > 0,
  ) &&
  saasVariantCount === 68 &&
  nativeSaasLibrary?.summary?.scopedViews === 6 &&
  nativeSaasLibrary?.summary?.scopedViewRoots === 12 &&
  nativeSaasLibrary?.summary?.componentSets === 9 &&
  nativeSaasLibrary?.summary?.variants === 68 &&
  nativeSaasLibrary?.fileKey === state.fileKey;
const saasNativeVisualPassed = [
  "passed-native-structure-and-visual-review",
  "passed-visual-review",
].includes(nativeSaasLibrary?.status);
const saasNativeProofBaseline =
  nativeAuditBaselineMatches &&
  saasNativeScopeMatches &&
  saasNativeVisualPassed;
const imageGroups = Object.fromEntries(
  ["avatars", "products", "art"].map((group) => [
    group,
    imageManifest.items.filter((item) => item.group === group).length,
  ]),
);
const imageManifestMatches =
  imageAudit?.manifest?.file === imageManifestFile &&
  imageAudit.manifest.sha256 === digest(imageManifestText);
const imageAssetsMatchManifest =
  imageManifest.version === imageAudit?.version &&
  imageManifest.items.length === 32 &&
  new Set(imageManifest.items.map((item) => item.id)).size === 32 &&
  imageGroups.avatars === 18 &&
  imageGroups.products === 8 &&
  imageGroups.art === 6 &&
  imageAudit?.assets?.length === 32 &&
  new Set(imageAudit.assets.map((item) => item.id)).size === 32 &&
  imageManifest.items.every((item) =>
    imageAudit.assets.some(
      (asset) =>
        asset.id === item.id &&
        asset.file === `public${item.downloadSrc}` &&
        asset.webSrc === item.src &&
        asset.sha256 === item.webpSha256 &&
        asset.bytes === item.webpBytes &&
        asset.componentId &&
        asset.imageNodeId &&
        asset.imageHash,
    ),
  );
const localProofPath = (proof) => {
  const path = proof.path ?? proof.file;
  if (typeof path !== "string") return null;
  if (path.startsWith(".figma/proofs/")) return path;
  const offset = path.indexOf("/.figma/proofs/");
  return offset >= 0 ? path.slice(offset + 1) : null;
};
const imageProofs = (imageAudit?.proofs ?? []).map((proof) => ({
  path: localProofPath(proof),
  sha256: proof.sha256 ?? null,
  ...(proof.nodeId ? { nodeId: proof.nodeId } : {}),
  ...(proof.mode ? { mode: proof.mode } : {}),
  ...(proof.scope ? { scope: proof.scope } : {}),
  ...(proof.assetIds ? { assetIds: proof.assetIds } : {}),
  ...(proof.route ? { route: proof.route } : {}),
}));
const baselineProofPaths = new Set(
  [historicalNativeAudit, nativeAudit].flatMap((audit) =>
    (audit?.proof?.reviewBatches ?? []).flatMap((batch) =>
      (batch.visualProofs ?? []).map(localProofPath),
    ),
  ),
);
const imageProofsVerified =
  imageProofs.length > 0 &&
  new Set(imageProofs.map((proof) => proof.path)).size === imageProofs.length &&
  (
    await Promise.all(
      imageProofs.map(async (proof) => {
        if (
          !proof.path?.startsWith(".figma/proofs/") ||
          !proof.path.endsWith(".png") ||
          proof.path.includes("\\") ||
          proof.path.split("/").includes("..") ||
          baselineProofPaths.has(proof.path)
        )
          return false;
        try {
          const content = await readFile(resolve(kitRoot, proof.path));
          return (
            digest(content) === proof.sha256 &&
            content
              .subarray(0, 8)
              .equals(Buffer.from("89504e470d0a1a0a", "hex"))
          );
        } catch (error) {
          if (error.code === "ENOENT") return false;
          throw error;
        }
      }),
    )
  ).every(Boolean);
const protectedBaselineMatches =
  [".figma/history/state-1.2-final.json", ".figma/native-audit-1.2.json"].every(
    (path) =>
      imageAudit?.protectedFiles?.some((snapshot) => snapshot.file === path),
  ) &&
  (
    await Promise.all(
      imageAudit.protectedFiles.map(async (snapshot) => {
        if (
          !snapshot.file?.startsWith(".figma/") ||
          snapshot.file.includes("\\") ||
          snapshot.file.split("/").includes("..")
        )
          return false;
        try {
          return (
            digest(await readFile(resolve(kitRoot, snapshot.file))) ===
            snapshot.sha256
          );
        } catch (error) {
          if (error.code === "ENOENT") return false;
          throw error;
        }
      }),
    )
  ).every(Boolean);
const canonicalRouteIdsPreserved =
  Object.keys(state.entities.routeScreens).length === 69 &&
  Object.entries(baselineState.entities.routeScreens).every(
    ([path, id]) => state.entities.routeScreens[path] === id,
  );
const generatedImageReviewCurrent =
  imageAudit?.version === imageManifest.version &&
  /^passed(?:-|$)/i.test(imageAudit.status ?? "") &&
  imageAudit.fileKey === state.fileKey &&
  imageAudit.stateSha256 === stateSha256 &&
  imageManifestMatches &&
  imageAssetsMatchManifest &&
  imageAudit.coverage?.uploadedAssets === 32 &&
  imageAudit.coverage?.assetComponents === 32 &&
  imageAudit.coverage?.wholeUiRasterCount === 0 &&
  imageProofsVerified &&
  protectedBaselineMatches &&
  canonicalRouteIdsPreserved;
const nativeHandoffComplete =
  nativeAuditBaselineMatches &&
  saasNativeProofBaseline &&
  generatedImageReviewCurrent &&
  !pendingNativeRoutes.length &&
  !pendingNativeBlocks.length;
const codeConnectSourceValidationCurrent =
  manifest.validation.status === "passed-local-smoke" &&
  manifest.validation.sourceValidationVersion === packageManifest.version &&
  (
    await Promise.all(
      [
        ...manifest.authoritativeInputs,
        ...manifest.sourceSnapshots,
        ...manifest.templateSnapshots,
      ].map(async (snapshot) => {
        const content = await readFile(resolve(kitRoot, snapshot.file));
        return (
          createHash("sha256").update(content).digest("hex") === snapshot.sha256
        );
      }),
    )
  ).every(Boolean);
const deliveryReceiptFile = `public/downloads/verification-${packageManifest.version}.json`;
const [deliveryReceipt, deliveryChecksums] = await Promise.all([
  readOptionalJson(deliveryReceiptFile),
  readOptionalJson("public/downloads/checksums.json"),
]);
const coverage = {
  schemaVersion: 1,
  version: packageManifest.version,
  status: nativeHandoffComplete
    ? "source-handoff-retained-baseline-and-current-image-review"
    : "source-handoff-pending-generated-image-closure",
  sourceOfTruth: [
    "src/lib/catalog.ts",
    "src/components/app-page.tsx",
    ".figma/state.json",
    ".figma/code-connect-manifest.json",
    ".figma/native-audit.json",
    baselineStateFile,
    imageManifestFile,
    ...(imageAudit ? [imageAuditFile] : []),
    ...(nativeAudit ? [nativeAuditFile] : []),
    ...(nativeSaasLibrary ? [nativeSaasLibraryFile] : []),
    "scripts/lib/source-graph.mjs",
    "src/lib/appearance.ts",
    "src/components/effects/index.ts",
    "src/components/ui/chart.tsx",
    "tokens/aureform.tokens.json",
    "scripts/lib/appearance-tokens.mjs",
  ],
  summary: {
    suiteRoutes: suiteRoutes.length,
    landingPages: 1,
    views: views.length,
    componentFamilies: components.length,
    completeExamples: components.length,
    blockFiles: new Set(blocks.map((item) => item.source)).size,
    blockExports: blocks.length,
    shellLayouts: layoutNames.length,
    chartFamilies: chartNames.length,
    registryItems: Object.keys(registry).length,
    codeConnectTemplates: manifest.templates.length,
    mappedNativeViews: views.length - pendingNativeRoutes.length,
    pendingNativeViews: pendingNativeRoutes.length,
    directNativeBlockExports: blocks.filter(
      (block) => block.figma.status === "mapped-direct-native-id",
    ).length,
    saasNativeViews: saasNativeViews.length,
    saasNativeModeRoots: saasNativeModeNodes.length,
    saasNativeVariants: saasVariantCount,
    palettes: palettes.length,
    reusableEffects: effects.length,
    nativeGalleryPreviews: state.entities.catalogComposition.templates.previews,
    semanticColors: Object.keys(tokens.semantic).length,
    primitiveColors: Object.keys(tokens.primitives).length,
    effectTokens: Object.values(tokens.effects).reduce(
      (count, group) => count + Object.keys(group).length,
      0,
    ),
  },
  motionRuntime: {
    source: "src/components/motion-system.tsx",
    registry: "public/r/motion-system.json",
    example: "examples/MotionSystem.tsx",
    engines: ["GSAP", "Lenis"],
    smoothScroll: "Landing only, fine pointer, no reduced-motion preference",
  },
  locales: ["en", "es"],
  themes: ["light", "dark"],
  generatedImages: {
    version: imageManifest.version,
    manifest: { file: imageManifestFile, sha256: digest(imageManifestText) },
    promptCatalog: "docs/generated-images/catalog.json",
    assets: imageManifest.items.map((item) => ({
      id: item.id,
      group: item.group,
      src: item.src,
      downloadSrc: item.downloadSrc,
      width: item.width,
      height: item.height,
      alt: item.alt,
      webpBytes: item.webpBytes,
      webpSha256: item.webpSha256,
      svgBytes: item.svgBytes,
      svgSha256: item.svgSha256,
    })),
    groups: imageGroups,
    count: imageManifest.items.length,
    bytes: {
      webp: imageManifest.items.reduce(
        (total, item) => total + item.webpBytes,
        0,
      ),
      svg: imageManifest.items.reduce(
        (total, item) => total + item.svgBytes,
        0,
      ),
    },
    delivery: {
      archive: "public/downloads/aureform-ui-images.zip",
      registry: "Text SVG wrappers embedding the exact optimized WebP bytes",
      nativeContentImageFillsAllowed: true,
      wholeUiRasterizationAllowed: false,
      mastersIncluded: true,
      mastersDirectory: "design/images/masters",
      runtimeApiKeyRequired: false,
    },
    nativeReview: {
      file: imageAuditFile,
      checkpointVersion: imageAudit?.version ?? null,
      historicalCheckpoint: imageAudit?.version !== packageManifest.version,
      status: imageAudit?.status ?? "pending-owner-generated-image-review",
      current: generatedImageReviewCurrent,
      scope: imageAudit?.scope ?? null,
      stateSha256: imageAudit?.stateSha256 ?? null,
      matchesCurrentState: imageAudit?.stateSha256 === stateSha256,
      manifestMatches: imageManifestMatches,
      assetsMatchManifest: imageAssetsMatchManifest,
      proofBytesVerified: imageProofsVerified,
      protectedBaselineMatches,
      canonicalRouteIdsPreserved,
      coverage: imageAudit?.coverage ?? null,
      proofs: imageProofs,
      freshFullRouteVisualReview: false,
      retainedBaseline: {
        version: "1.2.0",
        audit: nativeAuditFile,
        state: baselineStateFile,
      },
    },
  },
  delivery: {
    version: packageManifest.version,
    receipt: deliveryReceiptFile,
    status:
      deliveryReceipt?.version === packageManifest.version
        ? (deliveryReceipt.status ?? "recorded-owner-receipt")
        : `pending-${packageManifest.version}-delivery-qa`,
    checksums: "public/downloads/checksums.json",
    checksumsMatchVersion:
      deliveryChecksums?.version === packageManifest.version,
    historical: [
      {
        version: "1.2.0",
        archives: "artifacts/release-1.2-original",
        preservedChecksums: "artifacts/release-1.2-original/checksums.json",
        preservedReceipt:
          "artifacts/release-1.2-original/verification-1.2.json",
        checkpointReceipt: "public/downloads/verification-1.2.json",
        runtimeReceipt: "docs/qa-runtime-1.2.json",
        certifiesCurrentPatch: false,
      },
    ],
  },
  appearance: {
    source: "src/lib/appearance.ts",
    provider: "src/components/appearance-provider.tsx",
    controls: "src/components/appearance-controls.tsx",
    tokenHelper: "scripts/lib/appearance-tokens.mjs",
    studio: "/en/studio/",
    gallery: "/en/themes/",
    effectGallery: "/en/effects/",
    palettes,
    materials: ["flat", "elevated", "glass", "gradient"],
    motion: ["off", "gentle", "expressive"],
    exports: ["json", "css", "react"],
    persistence:
      "Browser localStorage; presets are not synchronized by a backend.",
    componentProperties: manifest.sourceContracts?.appearance ?? [],
  },
  effects: effects.map((effect) => {
    const template = manifest.templates.find(
      (entry) => entry.kind === "effect" && entry.export === effect.export,
    );
    return {
      ...effect,
      figma: template
        ? { node: template.node, url: template.url, status: "mapped-native-id" }
        : { node: null, url: null, status: "pending-owner-native-id" },
      codeConnect: template?.file ?? null,
    };
  }),
  nativeHandoff: {
    status:
      pendingNativeRoutes.length || pendingNativeBlocks.length
        ? "pending-owner-native-additions"
        : nativeHandoffComplete
          ? "passed-retained-baseline-and-current-generated-image-review"
          : !nativeAuditBaselineMatches
            ? "retained-baseline-mismatch"
            : "mapped-ids-pending-generated-image-review",
    pendingRoutes: pendingNativeRoutes,
    pendingBlocks: pendingNativeBlocks,
    sourceOnlyBlocks,
    pendingReusableMappings: manifest.pendingNativeMappings ?? [],
    codeConnectValidation: manifest.validation.status,
    codeConnectCheckpointVersion: manifest.version,
    codeConnectSourceValidationVersion:
      manifest.validation.sourceValidationVersion ?? manifest.version,
    codeConnectSourceValidationCurrent,
    codeConnectCloudRequired: false,
    newCodeConnectTemplatesRequired: false,
    ...(manifest.validation.reason
      ? { codeConnectReason: manifest.validation.reason }
      : {}),
    ownerQa: nativeHandoffComplete
      ? "passed-scoped-generated-image-review-with-retained-baseline"
      : "pending-scoped-generated-image-review",
    nativeAudit: {
      file: nativeAuditFile,
      version: "1.2.0",
      current: false,
      retainedBaseline: true,
      status: nativeAudit?.status ?? "pending-owner-native-audit",
      routeRoots: nativeAudit?.summary?.routeRoots ?? null,
      state: baselineStateFile,
      matchesBaselineState: nativeAuditBaselineMatches,
      matchesCurrentState: nativeAudit?.stateSha256 === stateSha256,
    },
    saasNativeProof: {
      file: nativeSaasLibraryFile,
      current: false,
      retainedBaseline: saasNativeProofBaseline,
      version: "1.2.0",
      status: nativeSaasLibrary?.status ?? "pending-owner-native-library",
      scopeMatches: saasNativeScopeMatches,
      requiredScope: { views: 6, modeRoots: 12, variants: 68 },
      recordedScope: {
        views: saasNativeViews.length,
        modeRoots: saasNativeModeNodes.length,
        variants: saasVariantCount,
      },
      visualPassed: saasNativeVisualPassed,
      requiresRetainedBaselineRouteAudit: true,
    },
    historicalNativeAudits: [
      {
        version: "1.2.0",
        file: nativeAuditFile,
        state: baselineStateFile,
        stateSha256: baselineStateSha256,
        status: nativeAudit?.status ?? "not-recorded",
        routeRoots: nativeAudit?.summary?.routeRoots ?? null,
        matchesFrozenState: nativeAuditBaselineMatches,
        current: false,
      },
      {
        version: "1.1",
        file: historicalNativeAuditFile,
        status: historicalNativeAudit?.status ?? "not-recorded",
        routeRoots: historicalNativeAudit?.summary?.routeRoots ?? null,
        current: false,
      },
    ],
  },
  nativeSaasLibrary: {
    file: nativeSaasLibraryFile,
    proofVersion: "1.2.0",
    retainedBaseline: true,
    status: nativeSaasLibrary?.status ?? "pending-owner-native-library",
    components: saasNativeComponents.map((component) => ({
      ...component,
      url: link(component.defaultId),
      association: "direct-native-source-map",
      codeConnect: null,
    })),
    views: saasNativeViews.map((view) => ({
      path: view.path,
      nodes: { ...view.nodes },
    })),
  },
  views,
  components,
  blocks,
  layouts: layoutNames.map((name) => ({
    name,
    source: "src/components/blocks/dashboard-shell.tsx",
    nativePreview:
      state.entities.applicationComponents.LayoutPreview.variants[name],
  })),
  charts: chartNames.map((name) => {
    const nativeKind = nativeChartKinds.find(
      ([, sourceKind]) => sourceKind === name,
    )?.[0];
    return {
      name,
      source: "src/components/ui/chart.tsx",
      demo: "/en/charts/",
      figmaName: nativeKind ?? null,
      nativeStatus: nativeKind
        ? "recorded-native-kind"
        : "pending-owner-native-kind",
    };
  }),
  registry: registryGraphs.map(({ graph, ...entry }) => ({
    ...entry,
    sourceFiles: graph.files.length,
    assets: graph.assets.length,
  })),
  reference: {
    purpose:
      "Category inventory only. Original source, layouts, mark and assets; no proprietary TailAdmin code or assets are copied or packaged.",
    categories: referenceCategories,
  },
  limits: {
    backend:
      "Deterministic local demo adapters; real auth, billing, AI providers and email are separate integrations.",
    figma:
      "Editable native compositions, including consolidated generic tables; mapping does not claim pixel-perfect parity for every route or browser behavior in Figma.",
    codeConnect:
      "Established local parserless templates retain their own checkpoint validation. New SaaS components use direct native/source associations without requiring cloud registration or new Code Connect templates; library unpublished / Professional scope.",
    brand:
      "Working name and provisional prices/license; domain and trademark clearance are unverified.",
  },
};
assert(
  coverage.summary.codeConnectTemplates >= 82,
  "Preserve the established local mapping set.",
);
assert.equal(coverage.summary.componentFamilies, 44);
const json = JSON.stringify(coverage, null, 2) + "\n";
const markdown = [
  `# Aureform UI ${coverage.version} — cobertura de entrega`,
  "",
  "Generado desde catálogo y dispatcher reales, state actual, baseline nativo 1.2 conservado y ledger independiente de imágenes 1.2.1. [Datos completos](coverage.json).",
  "",
  `${views.length} vistas (${suiteRoutes.length} rutas de suite + landing) · ${components.length} familias y ejemplos completos · ${coverage.summary.blockFiles} archivos / ${coverage.summary.blockExports} exports de bloques · ${layoutNames.length} layouts · ${chartNames.length} gráficos · ${palettes.length} paletas · ${effects.length} efectos reutilizables · ${coverage.summary.registryItems} elementos de registry · ${manifest.templates.length} templates locales de Code Connect.`,
  "",
  `Source verificado por el catálogo, dispatcher y grafo de imports. ${coverage.summary.mappedNativeViews} raíces con ID nativo; ${pendingNativeRoutes.length} rutas pendientes del owner${pendingNativeRoutes.length ? `: ${pendingNativeRoutes.join(", ")}` : ""}. Estos conteos describen source e IDs. El [recibo runtime 1.2](qa-runtime-1.2.json) y sus [checks al freeze](release-checklist-1.2.md#recorded-verification-at-source-freeze) son baselines históricos: los resultados 184/74 y sus demás scopes no se reetiquetan como pruebas de 1.2.1. La [verificación 1.1](verification.es.md) mantiene su alcance histórico.`,
  "",
  nativeAuditBaselineMatches
    ? `Baseline nativo 1.2 conservado: PASS compuesto para ${nativeAudit.summary.routeRoots} raíces (${nativeAudit.summary.inheritedRouteRoots} heredadas del checkpoint 1.1 y ${nativeAudit.summary.freshSaasRoutes} rutas SaaS revisadas en Light/Dark), ligado al SHA256 \`${baselineStateSha256}\` de [state-1.2-final](../${baselineStateFile}). [Informe inmutable](../${nativeAuditFile}). No certifica una revisión visual nueva de las 69 vistas en 1.2.1.`
    : `Baseline nativo 1.2: no coincide con su snapshot congelado en \`${baselineStateFile}\`; el informe retenido mantiene su propio alcance.`,
  "",
  `Auditoría histórica 1.1: ${historicalNativeAudit?.summary?.routeRoots ?? "no registrado"} raíces, status \`${historicalNativeAudit?.status ?? "not-recorded"}\`. [Informe histórico](../${historicalNativeAuditFile}). Conserva su propio checkpoint y no certifica 1.2.1.`,
  "",
  saasNativeProofBaseline
    ? `Prueba nativa SaaS 1.2 retenida: PASS, seis vistas / 12 raíces Light–Dark y 68 variantes en nueve sets. [Sidecar](../${nativeSaasLibraryFile}). La evidencia pertenece al audit compuesto y state congelado de 1.2.`
    : `Prueba nativa SaaS 1.2 retenida: baseline no verificado. Registrado: ${saasNativeViews.length} vistas / ${saasNativeModeNodes.length} raíces / ${saasVariantCount} variantes, status \`${nativeSaasLibrary?.status ?? "pending-owner-native-library"}\`.`,
  "",
  `Imágenes generadas 1.2.1: ${imageManifest.items.length} recursos (${imageGroups.avatars} avatares, ${imageGroups.products} productos y ${imageGroups.art} editoriales), con WebP optimizados y SVG que incorporan esos mismos bytes. [Manifest](../${imageManifestFile}) y [prompts completos](generated-images/catalog.json). Son imágenes de contenido; no son capturas de interfaz ni gráficos vectoriales editables. No requieren clave API para su uso.`,
  "",
  generatedImageReviewCurrent
    ? `Checkpoint nativo de imágenes 1.2.1 conservado: PASS acotado al scope \`${imageAudit.scope}\`, ligado al state \`${stateSha256}\` y al manifest exacto. ${imageProofs.length} PNG con bytes verificados; 32 recursos subidos/componentes, cero rasterizaciones de interfaz. [Ledger](../${imageAuditFile}). Es evidencia histórica de la misma colección, no una revisión visual nueva de ${packageManifest.version} ni de las 69 rutas.`
    : `Revisión nativa de imágenes 1.2.1: pendiente, status \`${imageAudit?.status ?? "pending-owner-generated-image-review"}\`. El ledger debe aprobar el manifest, los 32 recursos y el state actual con PNG nuevos y cero rasterizaciones de interfaz. [Ledger](../${imageAuditFile}).`,
  "",
  "| Prueba nueva de imágenes | SHA256 |",
  "| --- | --- |",
  ...imageProofs.map(
    (proof) =>
      `| \`${proof.path ?? "pending-path"}\` | \`${proof.sha256 ?? "pending-hash"}\` |`,
  ),
  "",
  codeConnectSourceValidationCurrent
    ? `Code Connect local: los ${manifest.templates.length} templates del checkpoint ${manifest.version} se conservaron sin modificar y se comprobaron contra el source actual ${manifest.validation.sourceValidationVersion}: ${manifest.validation.totalTemplateEvaluations} evaluaciones, ${manifest.validation.uniqueTypedExamples} ejemplos tipados y ${manifest.validation.diagnostics} diagnósticos. [Resumen de validación](../.figma/code-connect/validation/validation-summary.json). La prueba utiliza un runtime sintético local; no acredita ejecución en Figma ni publicación cloud.`
    : manifest.validation.status === "passed-local-smoke"
      ? `Code Connect local conservado, checkpoint ${manifest.version}: ${manifest.templates.length} templates. [Última validación registrada](../.figma/code-connect/validation/validation-summary.json). Este registro no coincide con todos los snapshots del source actual; falta una nueva comprobación local.`
      : `Code Connect local conservado, checkpoint ${manifest.version}: \`${manifest.validation.status}\`. El [manifest](../.figma/code-connect-manifest.json) mantiene su propio alcance; no hay publicación cloud.`,
  "",
  "Los nuevos bloques SaaS se asocian directamente por source/export e IDs del sidecar, aunque `codeConnect` sea null. No se exige cloud ni se generan templates nuevos: biblioteca sin publicar / alcance Professional. El checkpoint original de mappings 1.1 permanece archivado.",
  "",
  "La referencia TailAdmin se utiliza para inventariar categorías funcionales. Código, layouts, marca y recursos son originales. Las integraciones de backend se sustituyen mediante los adaptadores documentados.",
  "",
  `Las etiquetas 1.0–1.3 son categorías del roadmap original; las vistas listadas se incluyen en la versión ${coverage.version}.`,
  "",
  "| Vista | Categoría original | Implementación | Figma editable |",
  "| --- | --- | --- | --- |",
  ...views.map(
    (route) =>
      `| ${route.path || "landing"} | ${route.delivery} | [${route.source.component}](../${route.source.file}) | ${route.figma.modeUrls ? ["Light", "Dark"].map((mode) => `[${mode}](${route.figma.modeUrls[mode]})`).join(" / ") : route.figma.url ? `[Abrir](${route.figma.url})` : "Pendiente: ID nativo del owner"} |`,
  ),
  "",
  "| Bloque de source | Archivo | Registry | Figma | Code Connect local |",
  "| --- | --- | --- | --- | --- |",
  ...blocks.map(
    (block) =>
      `| ${block.export} | [Fuente](../${block.source}) | \`${block.registry}\` | ${block.figma.url ? `[Abrir](${block.figma.url})` : block.figma.status === "source-only-helper" ? "Helper de source" : "Pendiente: ID nativo"} | ${block.codeConnect ? `[Template](../${block.codeConnect})` : "Sin template local; asociación directa si consta ID"} |`,
  ),
  "",
  "| Master SaaS 1.2 | Export real | Fuente | Variantes registradas | Figma |",
  "| --- | --- | --- | --- | --- |",
  ...saasNativeComponents.map(
    (component) =>
      `| ${component.nativeName} | \`${component.export}\` | [Fuente](../${component.source}) | ${component.variants ?? "Pendiente"} | [Default](${link(component.defaultId)})${component.setId ? ` / [Set](${link(component.setId)})` : ""} |`,
  ),
  "",
  "| Efecto reutilizable | Código | Registry | Figma / Code Connect |",
  "| --- | --- | --- | --- |",
  ...coverage.effects.map(
    (effect) =>
      `| ${effect.export} | [Fuente](../${effect.source}) | \`${effect.registry}\` | ${effect.figma.url ? `[Abrir](${effect.figma.url})` : "Pendiente: master, propiedades e IDs del owner"} |`,
  ),
  "",
  `El registry se calcula desde el grafo de source e incluye \`appearance-provider\`, \`appearance-controls\`, \`motion-system\` y los seis efectos. Los presets y las exportaciones JSON/CSS/React están implementados en source; ver [uso de apariencia](appearance.md).`,
  ...(sourceOnlyBlocks.length
    ? [
        "",
        `Helpers de source sin master nativo independiente: ${sourceOnlyBlocks.join(", ")}. Se conserva cada export del registry y no se inventa un ID de Figma.`,
      ]
    : []),
  "",
  "| Familia | Código | Ejemplo completo | Figma |",
  "| --- | --- | --- | --- |",
  ...components.map(
    (item) =>
      `| ${item.family} | [Fuente](../${item.source}) | [Ejemplo](../${item.example}) | [Abrir](${item.figma.url}) |`,
  ),
  "",
  "Code Connect permanece local y sin publicar. El audit compuesto y la prueba SaaS 1.2 se conservan como baseline; el ledger de imágenes 1.2.1 registra exclusivamente su scope nuevo. Las composiciones no implican equivalencia pixel-perfect ni comportamiento de navegador en Figma. Ver [recibo runtime histórico 1.2](qa-runtime-1.2.json), [validación histórica 1.1](verification.es.md), [handoff](figma-handoff.es.md) y [gates de entrega 1.2.1](release-checklist-1.2.1.md).",
  "",
  `Este inventario no certifica ZIP ni publicación. La entrega actual es ${packageManifest.version}; el owner registra la nueva QA y las identidades finales en \`${deliveryReceiptFile}\` después de ejecutar los checks acordados. Los archivos originales de 1.2, su checksum manifest y su recibo se conservan en \`artifacts/release-1.2-original/\`; el checkpoint público \`public/downloads/verification-1.2.json\` mantiene su pin histórico y no se compara con checksums nuevos. Los documentos incluidos se congelan antes de empaquetar.`,
  "",
  `La distribución ${packageManifest.version} usa Apache 2.0 para el trabajo original: Source, Starter, muestra de componentes e imágenes. Source incluye los 32 originales en \`design/images/masters/\`, los recursos optimizados, las pruebas PNG, los tokens y los diseños disponibles. Se excluyen credenciales, configuración privada, dependencias instaladas y output/tmp locales. El límite de Source es 90 MiB y el de los otros ZIP es 25 MiB. Los tres ZIP de evidencia conservan sus bytes y scopes históricos: 23 PNG de 1.1, 22 de 1.2 y siete de 1.2.1. Ningún ZIP ni publicación queda certificado solo por generar este inventario. Ver [guía open source](open-source.es.md) y [checklist actual](release-checklist-1.3.0.md).`,
  "",
].join("\n");
const outputs = [
  writeFile(resolve(kitRoot, "docs/coverage.json"), json),
  writeFile(resolve(kitRoot, "docs/coverage.es.md"), markdown),
];
if (!options.has("--docs-only")) {
  await mkdir(resolve(kitRoot, "public/coverage"), { recursive: true });
  outputs.push(writeFile(resolve(kitRoot, "public/coverage.json"), json));
  outputs.push(writeFile(resolve(kitRoot, "public/coverage/index.json"), json));
}
await Promise.all(outputs);
console.log(
  `Verified ${views.length} source views, ${components.length} core examples, ${blocks.length} block exports and ${Object.keys(registry).length} registry graphs. Native route IDs: ${coverage.summary.mappedNativeViews} mapped, ${pendingNativeRoutes.length} pending. Retained 1.2 native baseline: ${nativeAuditBaselineMatches ? "matches frozen 1.2 state" : "baseline mismatch"}. Retained SaaS scope: ${saasNativeProofBaseline ? "recorded 1.2 PASS" : "baseline not verified"} (${saasNativeViews.length} views / ${saasNativeModeNodes.length} mode roots / ${saasVariantCount} variants). Image checkpoint ${imageManifest.version}: ${generatedImageReviewCurrent ? "verified retained scoped evidence" : "checkpoint mismatch"}. Delivery receipt: ${deliveryReceiptFile}.${options.has("--docs-only") ? " Wrote docs only." : ""}`,
);
