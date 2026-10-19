const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const ROOT = path.resolve(__dirname, "..");
const DEPS = path.resolve(
  process.env.AUREFORM_DEPENDENCIES || path.join(ROOT, "node_modules"),
);
const DEPENDENCY_ROOTS = [DEPS, fs.realpathSync(DEPS)];
const ts = require(path.join(DEPS, "typescript"));
const TMP = path.join(ROOT, ".figma/code-connect/validation");
const FOLDER = path.join(ROOT, ".figma");
const manifestPath = path.join(FOLDER, "code-connect-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const ledger = JSON.parse(
  fs.readFileSync(path.join(FOLDER, "component-properties.json"), "utf8"),
);
const state = JSON.parse(
  fs.readFileSync(path.join(FOLDER, "state.json"), "utf8"),
);
const additionsPath = path.join(FOLDER, "code-connect/native-additions.json");
const additions = fs.existsSync(additionsPath)
  ? JSON.parse(fs.readFileSync(additionsPath, "utf8"))
  : { fileKey: ledger.fileKey, components: {} };
assert.equal(additions.fileKey, ledger.fileKey);
const nativeEffectsPath = path.join(FOLDER, "native-effects-library-1.1.json");
const nativeEffects = fs.existsSync(nativeEffectsPath)
  ? JSON.parse(fs.readFileSync(nativeEffectsPath, "utf8"))
  : { families: {} };
const byId = new Map(manifest.templates.map((t) => [t.id, t]));
const compiled = new Map();
const scenarios = [];
const unique = new Map();
const virtual = new Map();
const calls = [];
const errorHandle = { type: "ERROR", message: "Synthetic missing child" };
let evaluations = 0;
let nestedExecutions = 0;

function sha(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function checkSnapshots() {
  for (const group of [
    "authoritativeInputs",
    "sourceSnapshots",
    "templateSnapshots",
  ]) {
    assert(
      manifest[group]?.length,
      `Missing ${group}; regenerate Code Connect.`,
    );
    for (const snapshot of manifest[group])
      assert.equal(
        sha(fs.readFileSync(path.join(ROOT, snapshot.file))),
        snapshot.sha256,
        `${snapshot.file} changed since generation; regenerate before validating.`,
      );
  }
}
checkSnapshots();
function raw(props) {
  return (
    props &&
    Object.fromEntries(
      Object.entries(props).filter(
        ([, v]) => typeof v === "string" && v.includes("#"),
      ),
    )
  );
}
function nativeProps(entry) {
  if (entry.kind === "icon") return {};
  if (entry.nativeName === "DashboardHeader")
    return { title: ledger.chrome.headerTitle };
  if (entry.nativeName === "DashboardSidebar")
    return ledger.chrome.applicationsOpen
      ? { applicationsOpen: ledger.chrome.applicationsOpen }
      : {};
  return (
    additions.components[entry.nativeName] ??
    ledger.components[entry.nativeName] ??
    ledger.applicationComponents[entry.nativeName] ??
    ledger.effects?.[entry.nativeName] ??
    nativeEffectProps(entry.nativeName) ??
    {}
  );
}
function nativeEffectProps(name) {
  const record = nativeEffects.families?.[name];
  if (!record) return null;
  const axes = {};
  for (const variant of record.variants)
    for (const part of variant.name.split(",")) {
      const match = /^([^=]+)=(.+)$/.exec(part.trim());
      assert(match, `${name}: malformed native variant name`);
      const [, axis, value] = match;
      const values = (axes[axis] ??= []);
      if (!values.includes(value)) values.push(value);
    }
  return { ...record, axes };
}
function flatten(sections) {
  if (sections == null) return "";
  if (
    typeof sections === "string" ||
    typeof sections === "number" ||
    typeof sections === "boolean"
  )
    return String(sections);
  if (Array.isArray(sections)) return sections.map(flatten).join("");
  if (sections.type === "CODE") return sections.code;
  throw new Error(`Unsupported synthetic section ${JSON.stringify(sections)}`);
}
function code(strings, ...values) {
  let text = "";
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += flatten(values[i]);
  }
  return text ? [{ type: "CODE", code: text }] : [];
}
function combinations(axes) {
  let result = [{}];
  for (const [name, values] of Object.entries(axes)) {
    result = result.flatMap((row) =>
      values.map((value) => ({ ...row, [name]: value })),
    );
  }
  return result;
}
function getDefaults(entry) {
  return Object.fromEntries(
    Object.entries(entry.axes).map(([axis, options]) => [
      axis,
      entry.defaultAxes?.[axis] ?? options[0],
    ]),
  );
}
function recordedCombinations(entry) {
  return entry.nativeVariants
    ? entry.nativeVariants.map((variant) => variant.axes)
    : combinations(entry.axes);
}
function validateNativeRecord(entry, properties) {
  if (!entry.nativeVariants) return;
  assert(properties.variants && properties.propertyDefinitions);
  const owner = state.entities.components[entry.nativeName];
  assert(owner, `${entry.id} has no owner state record`);
  assert.equal(entry.node, owner.setId ?? owner.id ?? owner.defaultId);
  assert.equal(entry.defaultNode, owner.defaultId);
  assert.deepEqual(entry.nativeVariants, properties.variants);
  const ids = new Set();
  const matrix = new Set();
  for (const variant of properties.variants) {
    assert(/^\d+:\d+$/.test(variant.id));
    assert(!ids.has(variant.id), `${entry.id} has duplicate native variants`);
    ids.add(variant.id);
    assert.deepEqual(Object.keys(variant.axes), Object.keys(entry.axes));
    for (const [axis, value] of Object.entries(variant.axes))
      assert(entry.axes[axis].includes(value));
    const key = JSON.stringify(variant.axes);
    assert(!matrix.has(key), `${entry.id} has duplicate native axis cases`);
    matrix.add(key);
    if (variant.name) {
      const namedAxes = Object.fromEntries(
        variant.name.split(",").map((part) => {
          const match = /^([^=]+)=(.+)$/.exec(part.trim());
          assert(match, `${entry.id} has an invalid native variant name`);
          return [match[1], match[2]];
        }),
      );
      assert.deepEqual(namedAxes, variant.axes);
    }
  }
  const defaultVariant = properties.variants.find(
    (variant) => variant.id === entry.defaultNode,
  );
  assert(defaultVariant, `${entry.id} default is not an observed variant`);
  for (const [axis, values] of Object.entries(entry.axes)) {
    const definition = properties.propertyDefinitions[axis];
    assert.equal(definition.type, "VARIANT");
    assert.deepEqual([...definition.variantOptions].sort(), [...values].sort());
    assert.equal(definition.defaultValue, defaultVariant.axes[axis]);
    assert.equal(entry.defaultAxes[axis], definition.defaultValue);
  }
  for (const [key, value] of Object.entries(raw(properties) ?? {})) {
    const expected = {
      label: "TEXT",
      showIcon: "BOOLEAN",
      icon: "INSTANCE_SWAP",
    }[key];
    if (expected)
      assert.equal(properties.propertyDefinitions[value]?.type, expected);
  }
  if (owner.native1_1) {
    const record = owner.native1_1;
    assert.equal(record.setId, entry.node);
    assert.deepEqual(record.properties, properties.propertyDefinitions);
    assert.equal(record.currentVariantCount, properties.variants.length);
    assert.equal(record.expectedFinalVariantCount, properties.variants.length);
    const variants = record.variants.map((row) => {
      assert.equal(row.length, record.variantSchema.length);
      const columns = Object.fromEntries(
        record.variantSchema.map((column, index) => [column, row[index]]),
      );
      return {
        id: columns.id,
        axes: Object.fromEntries(
          Object.entries(record.axisCodes).map(([axis, values]) => {
            const code = columns[`${axis}Code`];
            assert(Number.isInteger(code) && code >= 0 && code < values.length);
            return [axis, values[code]];
          }),
        ),
        width: columns.width,
        height: columns.height,
      };
    });
    assert.deepEqual(variants, properties.variants);
  } else if (entry.nativeName === "Chart") {
    assert.deepEqual(
      owner.componentPropertyDefinitions,
      properties.propertyDefinitions,
    );
    assert.deepEqual(owner.kindOptions, entry.axes.Kind);
    assert.deepEqual(
      Object.fromEntries(
        properties.variants.map((variant) => [variant.axes.Kind, variant.id]),
      ),
      owner.kindComponentIds,
    );
    assert.equal(properties.variants.length, 13);
    const rawChart = JSON.parse(
      fs.readFileSync(
        path.join(FOLDER, "code-connect/Chart.native-definitions-1.1.json"),
        "utf8",
      ),
    );
    assert.equal(rawChart.fileKey, state.fileKey);
    assert.deepEqual(
      rawChart.componentPropertyDefinitions,
      properties.propertyDefinitions,
    );
    assert.deepEqual(
      rawChart.kindComponents.map((variant) => ({
        id: variant.id,
        name: variant.name,
        axes: { Kind: variant.kind },
      })),
      properties.variants,
    );
    for (const [key, definition] of Object.entries(
      rawChart.booleanDefinitions,
    )) {
      assert.equal(definition.type, "BOOLEAN");
      assert.equal(typeof definition.defaultValue, "boolean");
      assert(Object.values(raw(properties)).includes(key));
    }
  } else {
    assert.deepEqual(owner.variants, properties.variants);
    assert.deepEqual(owner.propertyDefinitions, properties.propertyDefinitions);
  }
  if (entry.nativeName === "DataTable") {
    assert.equal(properties.variants.length, 28);
    for (const variant of properties.variants)
      if (variant.axes.Density === "Compact")
        assert(["Default", "Selected"].includes(variant.axes.State));
  } else if (entry.nativeName === "Table") {
    assert.equal(properties.variants.length, 16);
  } else if (entry.nativeName === "Button / Shapes") {
    assert.equal(properties.variants.length, 9);
    assert.equal(entry.defaultAxes.Shape, "Rounded");
    assert.equal(entry.defaultAxes.Size, "Medium");
  }
}
function childEntries(entry, mode, ctx = {}) {
  if (mode !== "connected") return [];
  if (
    ctx.iconChild &&
    (entry.id === "aureform-button-additional-styles" ||
      entry.id === "aureform-button-loading-icons")
  ) {
    const icon = byId.get(ctx.iconChild);
    assert(icon && icon.kind === "icon");
    return [icon];
  }
  const lookup = {
    "aureform-button-additional-styles": ["aureform-icon-plus"],
    "aureform-button-loading-icons": ["aureform-icon-arrow-up-right"],
    "aureform-button-group": [
      "aureform-button",
      "aureform-button-additional-styles",
      "aureform-button-loading-icons",
    ],
    "aureform-card": ["aureform-button", "aureform-button-additional-styles"],
    "aureform-dialog": ["aureform-button-additional-styles"],
    "aureform-empty": ["aureform-button"],
    "aureform-page-heading": ["aureform-button"],
    "aureform-revenue-panel": ["aureform-chart", "aureform-button"],
    "aureform-revenue-panel-bar": ["aureform-chart", "aureform-button"],
    "aureform-plan-breakdown": ["aureform-button"],
    "aureform-dashboard-header": ["aureform-button", "aureform-avatar"],
    "aureform-dashboard-brand-header": [
      "aureform-icon-aureform-mark",
      "aureform-button",
      "aureform-avatar",
    ],
    "aureform-sidebar": [
      "aureform-icon-aureform-mark",
      "aureform-sidebar-item",
      "aureform-sidebar-item",
    ],
    "aureform-dashboard-sidebar": [
      "aureform-icon-aureform-mark",
      "aureform-sidebar-item",
      "aureform-sidebar-item",
    ],
    "aureform-field": ["aureform-input"],
    "aureform-tooltip": ["aureform-button"],
    "aureform-popover": ["aureform-button"],
  };
  return (lookup[entry.id] ?? []).map((id) => {
    assert(byId.has(id), `Missing local child template ${id}`);
    return byId.get(id);
  });
}
function nativeText(entry, property, adversarial) {
  if (adversarial)
    return 'Quoted "value" {with braces}\nEN / ES · <texto> \\ path';
  if (entry.nativeName === "Avatar") return "AM";
  if (entry.nativeName === "Input") return "you@company.com";
  if (entry.nativeName === "InputOTP") return "1";
  if (entry.nativeName === "DatePicker") return "Oct 18, 2026";
  if (entry.nativeName === "DateRangePicker") return "Oct 18 – Oct 24";
  if (entry.nativeName === "MetricCard")
    return property.startsWith("Value#") ? "$34,000" : "Revenue";
  return property.split("#")[0] + " local fixture";
}
function execute(entry, ctx = {}, depth = 0) {
  assert(depth < 12, "Synthetic nested cycle");
  const properties = nativeProps(entry);
  const valid = Object.values(raw(properties) ?? {});
  const variants = { ...getDefaults(entry), ...ctx.variants };
  const mode = ctx.mode ?? "missing";
  const children = childEntries(entry, mode, ctx);
  const instanceFor = (child, index = 0) => ({
    type: "INSTANCE",
    name: child.nativeName,
    codeConnectId: () => child.id,
    executeTemplate() {
      nestedExecutions++;
      const childVariants = getDefaults(child);
      if (
        entry.id === "aureform-revenue-panel-bar" &&
        child.nativeName === "Chart"
      )
        childVariants.Kind = "Bar";
      if (child.nativeName === "SidebarItem" && index > 0)
        childVariants.State = "Active";
      if (child.nativeName === "Button / Loading & icons")
        childVariants.Kind = "Icon";
      const sidebarSwap =
        child.nativeName === "SidebarItem" &&
        index > 0 &&
        byId.has("aureform-icon-kanban-square")
          ? "aureform-icon-kanban-square"
          : ctx.swap;
      return execute(
        child,
        { ...ctx, variants: childVariants, swap: sidebarSwap },
        depth + 1,
      );
    },
  });
  const instance = {
    type: "INSTANCE",
    getEnum(property, mapping) {
      assert(
        entry.axes[property],
        `Invented native enum ${entry.nativeName}.${property}`,
      );
      assert.deepEqual(
        Object.keys(mapping).sort(),
        [...entry.axes[property]].sort(),
        `Non-exhaustive ${entry.nativeName}.${property}`,
      );
      assert(
        Object.hasOwn(mapping, variants[property]),
        `Undefined enum ${entry.nativeName}.${property}`,
      );
      calls.push({ id: entry.id, method: "getEnum", property });
      return mapping[variants[property]];
    },
    getString(property) {
      assert(
        valid.includes(property),
        `Unknown native text key ${entry.nativeName}.${property}`,
      );
      assert(!property.startsWith("Icon#") && !property.startsWith("Content#"));
      calls.push({ id: entry.id, method: "getString", property });
      return nativeText(entry, property, ctx.adversarial);
    },
    getBoolean(property) {
      assert(
        valid.includes(property) &&
          [...entry.mappedProperties, ...entry.intentionalVisualOnly].some(
            (item) => item.property === property && item.type === "BOOLEAN",
          ),
        `Unknown native boolean key ${entry.nativeName}.${property}`,
      );
      calls.push({ id: entry.id, method: "getBoolean", property });
      if (entry.nativeName === "Chart")
        return (
          ctx.nativeBooleans?.[property] ??
          properties.propertyDefinitions[property].defaultValue
        );
      if (property === properties.applicationsOpen)
        return ctx.applicationsOpen ?? mode === "connected";
      if (property === properties.paused) return ctx.paused ?? false;
      if (property === properties.disabled) return ctx.disabled ?? false;
      return ctx.showIcon ?? mode === "connected";
    },
    getPropertyValue(property) {
      assert(
        Object.hasOwn(entry.axes, property) || valid.includes(property),
        "Unknown raw property",
      );
      return variants[property];
    },
    getInstanceSwap(property) {
      assert.equal(
        property,
        properties.icon,
        `Swaps must use the authoritative key on ${entry.nativeName}`,
      );
      calls.push({ id: entry.id, method: "getInstanceSwap", property });
      if (ctx.swap === "error") return errorHandle;
      if (ctx.swap === "null" || mode === "missing") return null;
      const child = byId.get(ctx.swap ?? "aureform-icon-arrow-up-right");
      assert(
        child && child.kind === "icon",
        "Synthetic swap must refer to a prepared icon",
      );
      return instanceFor(child);
    },
    getSlot(property) {
      assert.equal(
        property,
        properties.slot,
        "getSlot must only read a declared SLOT",
      );
      calls.push({ id: entry.id, method: "getSlot", property });
      return [
        {
          type: "CODE",
          code:
            entry.nativeName === "DashboardShell"
              ? "<NativeHeaderMarker /><NativePageContentMarker />"
              : "<p>Native local slot fixture.</p>",
        },
      ];
    },
    findConnectedInstance(id) {
      const child = children.find((item) => item.id === id);
      return child ? instanceFor(child) : errorHandle;
    },
    findConnectedInstances(predicate) {
      return children.map(instanceFor).filter(predicate);
    },
    findInstance(layer) {
      assert.equal(
        layer,
        "Page content",
        "Only the explicitly named page-body lookup is expected",
      );
      if (ctx.pageContent === "frame") return { type: "FRAME" };
      if (ctx.pageContent !== "instance") return errorHandle;
      return instanceFor(byId.get("aureform-page-heading"));
    },
  };
  const exports = {};
  const fakeFigma = { selectedInstance: instance, code };
  const context = vm.createContext({
    exports,
    require(name) {
      assert.equal(name, "figma");
      return fakeFigma;
    },
    Object,
    JSON,
    Array,
    Boolean,
    Set,
    String,
  });
  const script = compiled.get(entry.id);
  assert(script, `Missing compiled template ${entry.id}`);
  script.runInContext(context, { timeout: 3000 });
  const result = exports.default;
  assert(
    result && Array.isArray(result.example) && Array.isArray(result.imports),
  );
  assert.equal(result.id, entry.id);
  assert.equal(result.metadata.props.status, "local-unpublished");
  evaluations++;
  return result;
}
function checkExample(entry, ctx, tag) {
  const result = execute(entry, ctx);
  const example = flatten(result.example);
  assert(example.trim(), `Empty example ${entry.id}`);
  assert(
    !example.includes("[object Object]"),
    `${entry.id} concatenated result sections`,
  );
  assert(
    !example.includes("NativeHeaderMarker"),
    "Raw shell Content duplicated the header",
  );
  assert(
    !/undefined=|="\s*undefined\s*"/.test(example),
    `${entry.id} emitted an undefined attribute`,
  );
  if (entry.export === "Button")
    assert(
      !/<Button\b[^>]*\bicon=/.test(example),
      "Fictitious Button icon prop",
    );
  const appearanceProperty = entry.sourceProperties?.find(
    (property) => property.property === "appearance",
  );
  if (entry.nativeName !== "Chart" && appearanceProperty?.nativeProperty) {
    const nativeValue =
      ctx.variants?.[appearanceProperty.nativeProperty] ??
      getDefaults(entry)[appearanceProperty.nativeProperty];
    assert(
      example.includes(`appearance="${nativeValue.toLowerCase()}"`),
      `${entry.id} lost the additive appearance prop`,
    );
  } else if (entry.nativeName !== "Chart" && appearanceProperty) {
    assert(
      !/\bappearance=/.test(example),
      `${entry.id} invented an unreported native Appearance axis`,
    );
  }
  if (entry.nativeName === "Button / Shapes") {
    const shape = ctx.variants?.Shape ?? getDefaults(entry).Shape;
    const size = ctx.variants?.Size ?? getDefaults(entry).Size;
    const contract = manifest.sourceContracts.shapes[0];
    assert(example.includes(`shape="${shape.toLowerCase()}"`));
    assert(example.includes(`size="${contract.sizeMapping[size]}"`));
    assert(
      !/\b(?:state|hover|forceHover)=/.test(example),
      "Button Shapes has no native State axis",
    );
  }
  if (entry.nativeName === "Table" || entry.nativeName === "DataTable") {
    const density = ctx.variants?.Density ?? getDefaults(entry).Density;
    if (density) assert(example.includes(`density="${density.toLowerCase()}"`));
    const nativeState = ctx.variants?.State ?? getDefaults(entry).State;
    assert(!/\b(?:state|selectedRows|initialSelection)=/.test(example));
    if (entry.nativeName === "DataTable") {
      assert(example.includes(`loading={${nativeState === "Loading"}}`));
      assert.equal(example.includes("onRetry="), nativeState === "Error");
      assert.equal(
        example.includes('error="Local data fixture'),
        nativeState === "Error",
      );
      assert.equal(
        example.includes("const rows: Row[] = []"),
        nativeState === "Empty",
      );
    } else {
      assert.equal(example.includes("No records"), nativeState === "Empty");
    }
  }
  if (entry.kind === "appearance-extension" && entry.export === "Button") {
    const nativeState = ctx.variants?.State ?? getDefaults(entry).State;
    if (nativeState)
      assert(
        example.includes(`disabled={${nativeState === "Disabled"}}`),
        `${entry.id} lost the native Disabled state`,
      );
  }
  if (entry.kind === "appearance-extension" && entry.export === "Card") {
    const titleProperty = nativeProps(entry).label;
    if (titleProperty)
      assert(
        example.includes(
          `<CardTitle>{${JSON.stringify(nativeText(entry, titleProperty, ctx.adversarial))}}</CardTitle>`,
        ),
        `${entry.id} lost the native card title`,
      );
    assert(
      !/\b(?:state|hover|forceHover)=/.test(example),
      `${entry.id} invented a Card state prop`,
    );
  }
  if (entry.kind === "effect") {
    const properties = nativeProps(entry);
    if (properties.label)
      assert(
        example.includes(
          `{${JSON.stringify(nativeText(entry, properties.label, ctx.adversarial))}}`,
        ),
        `${entry.id} lost its native text children`,
      );
    assert(
      !/\b(?:title|label|state|hover|forceHover)=/.test(example),
      `${entry.id} invented a native text/state source prop`,
    );
    if (entry.export === "MagneticButton") {
      const nativeState = ctx.variants?.State ?? getDefaults(entry).State;
      if (nativeState)
        assert(
          example.includes(`disabled={${nativeState === "Disabled"}}`),
          `${entry.id} lost the native Disabled state`,
        );
      assert(
        !example.includes("<p>"),
        "MagneticButton must retain phrasing content",
      );
    }
    if (
      entry.export === "GradientBackground" ||
      entry.export === "ShaderBackground"
    ) {
      const nativeKind = ctx.variants?.Kind ?? getDefaults(entry).Kind;
      if (nativeKind)
        assert(
          example.includes(`kind="${nativeKind.toLowerCase()}"`),
          `${entry.id} lost its native Kind`,
        );
    }
  }
  if (entry.nativeName === "Chart") {
    const contract = manifest.sourceContracts.charts?.[0];
    assert(
      contract,
      "Regenerate the chart contract after the owner API checkpoint.",
    );
    const nativeKind = ctx.variants?.Kind ?? getDefaults(entry).Kind;
    const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const expectedKind =
      nativeKind === "Donut"
        ? "pie"
        : contract.options.find(
            (option) => normalize(option) === normalize(nativeKind),
          );
    assert(expectedKind, `${entry.id} has an unreported source kind`);
    assert(example.includes(`kind="${expectedKind}"`));
    const properties = nativeProps(entry);
    const value = (field) =>
      ctx.nativeBooleans?.[properties[field]] ??
      properties.propertyDefinitions[properties[field]].defaultValue;
    assert(example.includes(`legend={${value("legend")}}`));
    assert(example.includes(`appearance="${value("glow") ? "glow" : "flat"}"`));
    const expectedSeries = ["series1", "series2", "series3"].flatMap(
      (field, index) =>
        value(field) ? [["value", "secondary", "tertiary"][index]] : [],
    );
    assert(
      example.includes(`visibleSeries={${JSON.stringify(expectedSeries)}}`),
    );
    for (const [field, property] of Object.entries(raw(properties)))
      if (properties.propertyDefinitions[property]?.type === "BOOLEAN")
        assert.equal(
          result.metadata.props.nativePropertyValues[property],
          value(field),
        );
    assert(
      !/\b(?:glow|showData|showLegend|category\d|series\d|visibleCategories)=/.test(
        example,
      ),
      "Chart must use only actual public source props",
    );
    const rows = result.metadata.props.chartData;
    assert(Array.isArray(rows) && rows.length);
    if (contract.supportsTertiary)
      assert(rows.every((row) => typeof row.tertiary === "number"));
    if (expectedKind === "diverging-bar")
      assert(
        rows.some((row) => row.value < 0) && rows.some((row) => row.value > 0),
      );
  }
  if (entry.nativeName === "InputOTP")
    assert(/label="Verification code"/.test(example));
  if (
    entry.nativeName === "DatePicker" ||
    entry.nativeName === "DateRangePicker"
  ) {
    assert(
      !example.includes("Oct 18"),
      "Native formatted date must not be parsed or used as accessible label",
    );
    assert(example.includes("new Date(2026, 9, 18)"), "Date fixture missing");
  }
  if (entry.nativeName === "Carousel")
    assert(example.includes('label="Featured compositions"'));
  if (entry.nativeName === "Input")
    assert(
      example.includes("placeholder=") &&
        !/\b(?:value|defaultValue)=/.test(example),
    );
  if (entry.nativeName === "MultiSelect")
    assert(!/\b(?:disabled|open|defaultOpen)=/.test(example));
  if (entry.nativeName === "Tabs")
    assert(
      example.includes("<p>{") && example.includes(">Overview</TabsTrigger>"),
    );
  if (entry.nativeName === "FileUpload")
    assert(
      example.includes("title:") &&
        !/labels=\{\{\s*browse:\s*"Label/.test(example),
    );
  const imports = [...new Set(result.imports)];
  const source =
    imports.join("\n") + `\nexport const Example = () => (${example});\n`;
  const parse = ts.transpileModule(source, {
    fileName: `${entry.id}.tsx`,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const failures = (parse.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(
    failures.length,
    0,
    `${entry.id} TSX syntax: ${failures.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("; ")}\n${source}`,
  );
  const key = sha(source);
  if (!unique.has(key)) unique.set(key, { source, entry: entry.id, tag });
  scenarios.push({ id: entry.id, tag });
}

assert.equal(manifest.coverage.totalTemplates, manifest.templates.length);
assert.equal(manifest.coverage.coreFamilies, 44);
const mappedBlocks = manifest.templates.filter(
  (entry) => entry.kind === "block",
);
assert(mappedBlocks.length >= 9, "Preserve established native block mappings");
assert.equal(manifest.coverage.mappedBlockExports, mappedBlocks.length);
assert.equal(
  manifest.coverage.sourceBlockExports,
  manifest.sourceBlocks.length,
);
assert.equal(
  manifest.coverage.sourceBlockFiles,
  new Set(manifest.sourceBlocks.map((block) => block.source)).size,
);
assert.equal(
  manifest.coverage.nativeIcons,
  Object.keys(state.entities.icons).length + 2,
);
assert.equal(manifest.status, "local-unpublished");
assert.equal(manifest.cloudPublication.performed, false);
const catalog = fs.readFileSync(path.join(ROOT, "src/lib/catalog.ts"), "utf8");
const coreFamilies = [
  ...catalog
    .split("export const componentFamilies = [")[1]
    .split("] as const;")[0]
    .matchAll(/"([^"]+)"/g),
].map((match) => match[1]);
assert.deepEqual(
  manifest.templates
    .filter((entry) => entry.kind === "core")
    .map((entry) => entry.nativeName)
    .sort(),
  coreFamilies.sort(),
  "Preserve every one of the 44 core-family mappings.",
);
assert.equal(byId.size, manifest.templates.length, "Duplicate template ID");
const seenNodes = new Set();
for (const entry of manifest.templates) {
  assert(!seenNodes.has(entry.node), "Duplicate authoritative node");
  seenNodes.add(entry.node);
  assert(
    entry.file.startsWith(".figma/code-connect/") &&
      entry.file.endsWith(".figma.ts") &&
      !entry.file.endsWith(".figma.tsx"),
  );
  const template = fs.readFileSync(path.join(ROOT, entry.file), "utf8");
  assert(
    template.includes("import figma from 'figma'") &&
      template.includes("figma.selectedInstance"),
  );
  assert(
    template.includes("example: figma.code`") &&
      !template.includes("figma.connect("),
  );
  assert(template.includes(`// source=${entry.source}`));
  assert(
    !template.includes("hasCodeConnect("),
    "Unnecessary hasCodeConnect gate",
  );
  const authoritative = nativeProps(entry);
  validateNativeRecord(entry, authoritative);
  const effectRecord = nativeEffectProps(entry.nativeName);
  if (effectRecord) {
    assert.equal(entry.node, effectRecord.setId);
    const ownerComponent = state.entities.components[entry.nativeName];
    assert.equal(
      entry.node,
      ownerComponent.setId ?? ownerComponent.id ?? ownerComponent.defaultId,
      `${entry.id} differs from the owner's component state`,
    );
    assert.equal(ownerComponent.label, effectRecord.label);
    assert.equal(ownerComponent.defaultId, effectRecord.defaultId);
    assert.deepEqual(authoritative.axes, effectRecord.axes);
    assert.equal(authoritative.label, effectRecord.label);
  }
  const declared = Object.keys(authoritative.axes ?? {});
  assert.deepEqual(
    Object.keys(entry.axes),
    declared,
    `${entry.id} axes differ from the native ledger`,
  );
  for (const prop of [
    ...declared,
    ...Object.values(raw(authoritative) ?? {}),
  ]) {
    assert(
      entry.mappedProperties.some((p) => p.property === prop) ||
        entry.intentionalVisualOnly.some((p) => p.property === prop),
      `${entry.id} unaccounted property ${prop}`,
    );
  }
  if (entry.source.startsWith("src/")) {
    const sourcePath = path.join(ROOT, entry.source);
    assert(
      fs.existsSync(sourcePath),
      `${entry.id} fictitious source path ${entry.source}`,
    );
    const source = fs.readFileSync(sourcePath, "utf8");
    const sourceExports = new RegExp(
      `export (?:function|const|type|\\{[^}]*\\b)\\s*${entry.export}\\b`,
    );
    assert(
      sourceExports.test(source) ||
        source.includes(`export { ${entry.export},`) ||
        source.includes(`, ${entry.export}`),
      `${entry.id} fictitious export ${entry.export}`,
    );
  } else {
    assert.equal(entry.source, "lucide-react");
    assert(fs.existsSync(path.join(DEPS, "lucide-react/package.json")));
  }
  for (const property of entry.sourceProperties ?? []) {
    if (!property.property) continue;
    if (entry.nativeName === "Chart" && property.property === "kind") {
      const contract = manifest.sourceContracts.charts?.[0];
      assert(
        contract,
        "Missing source chart contract; regenerate after the owner checkpoint.",
      );
      assert.deepEqual(property.options, contract.options);
      assert.equal(property.type, "ChartKind");
      assert.equal(property.nativeProperty, "Kind");
      continue;
    }
    if (entry.nativeName === "Chart") {
      const contract = manifest.sourceContracts.charts[0].booleanMappings.find(
        (item) => item.property === property.property,
      );
      assert(contract, "Unreported Chart source property");
      assert.equal(property.type, contract.type);
      assert.deepEqual(
        property.nativeProperties,
        contract.nativeFields.map((field) => authoritative[field]),
      );
      continue;
    }
    const contract =
      property.property === "shape"
        ? manifest.sourceContracts.shapes.find(
            (item) => item.export === entry.export,
          )
        : (manifest.sourceContracts.tables
            .find((item) => item.export === entry.export)
            ?.properties.find((item) => item.property === property.property) ??
          manifest.sourceContracts.appearance.find(
            (item) =>
              item.export === entry.export &&
              item.property === property.property,
          ));
    assert(contract, `Missing source property contract for ${entry.id}`);
    assert.deepEqual(property.options, contract.options);
    assert.equal(property.type, contract.type);
    if (property.nativeProperty)
      assert(
        entry.axes[property.nativeProperty],
        "Invented source-mapped axis",
      );
  }
  const parsed = ts.transpileModule(template, {
    fileName: entry.file,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  const failures = (parsed.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(failures.length, 0, `${entry.id} template syntax error`);
  compiled.set(
    entry.id,
    new vm.Script(parsed.outputText, { filename: entry.file }),
  );
}

let exhaustiveVariants = 0;
for (const entry of manifest.templates) {
  checkExample(entry, { mode: "missing" }, "recorded-default-or-first-listed");
  for (const variants of recordedCombinations(entry)) {
    exhaustiveVariants++;
    checkExample(
      entry,
      { variants, mode: "missing" },
      "exhaustive/missing-children",
    );
    checkExample(
      entry,
      { variants, mode: "connected", showIcon: true },
      "exhaustive/connected-children",
    );
  }
  checkExample(
    entry,
    { mode: "connected", adversarial: true },
    "quoted-newline-unicode-text",
  );
}
let nativeChartBooleanCases = 0;
const chartEntry = byId.get("aureform-chart");
const chartBooleanProperties = Object.entries(
  nativeProps(chartEntry).propertyDefinitions,
).filter(([, definition]) => definition.type === "BOOLEAN");
assert.equal(chartBooleanProperties.length, 12);
for (const variants of recordedCombinations(chartEntry)) {
  for (const [property] of chartBooleanProperties)
    for (const value of [false, true]) {
      checkExample(
        chartEntry,
        { variants, nativeBooleans: { [property]: value } },
        `chart-boolean/${property}/${value}`,
      );
      nativeChartBooleanCases++;
    }
  for (const value of [false, true]) {
    checkExample(
      chartEntry,
      {
        variants,
        nativeBooleans: Object.fromEntries(
          chartBooleanProperties.map(([property]) => [property, value]),
        ),
      },
      `chart-booleans/all-${value}`,
    );
    nativeChartBooleanCases++;
  }
}
const button = byId.get("aureform-button");
for (const entry of manifest.templates.filter((t) => t.kind === "icon")) {
  checkExample(
    button,
    { mode: "connected", showIcon: true, swap: entry.id },
    `swap/${entry.id}`,
  );
  checkExample(
    byId.get("aureform-sidebar-item"),
    { mode: "connected", swap: entry.id },
    `sidebar-swap/${entry.id}`,
  );
  checkExample(
    byId.get("aureform-button-additional-styles"),
    { mode: "connected", iconChild: entry.id },
    `unexposed-child/${entry.id}`,
  );
  checkExample(
    byId.get("aureform-button-loading-icons"),
    { mode: "connected", iconChild: entry.id, variants: { Kind: "Icon" } },
    `unexposed-child/${entry.id}`,
  );
}
for (const swap of ["null", "error"]) {
  checkExample(
    button,
    { mode: "connected", showIcon: true, swap },
    `swap/${swap}`,
  );
  checkExample(
    byId.get("aureform-sidebar-item"),
    { mode: "connected", swap },
    `sidebar-swap/${swap}`,
  );
  if (byId.has("aureform-button-shapes"))
    checkExample(
      byId.get("aureform-button-shapes"),
      { mode: "connected", showIcon: true, swap },
      `shape-swap/${swap}`,
    );
}
for (const mode of ["instance", "frame", "error"]) {
  for (const variants of combinations(
    byId.get("aureform-dashboard-shell").axes,
  )) {
    checkExample(
      byId.get("aureform-dashboard-shell"),
      { mode: "connected", pageContent: mode, variants },
      `page-content/${mode}`,
    );
  }
}
if (ledger.chrome.applicationsOpen) {
  for (const applicationsOpen of [false, true]) {
    checkExample(
      byId.get("aureform-dashboard-sidebar"),
      { mode: "connected", applicationsOpen },
      `applications-open/${applicationsOpen}`,
    );
  }
}
for (const entry of manifest.templates.filter(
  (item) => item.kind === "effect",
)) {
  const properties = nativeProps(entry);
  for (const key of ["paused", "disabled"]) {
    if (!properties[key]) continue;
    for (const value of [false, true])
      checkExample(
        entry,
        { mode: "connected", [key]: value },
        `${key}/${value}`,
      );
  }
}
console.log(
  `Evaluated ${scenarios.length} top-level cases, ${exhaustiveVariants} full variant combinations, ${unique.size} distinct typed examples.`,
);

fs.mkdirSync(TMP, { recursive: true });
let i = 0;
for (const [key, item] of unique) {
  const name = path.join(TMP, `example-${i++}-${key.slice(0, 10)}.tsx`);
  virtual.set(name, item.source);
}
const stubPath = path.join(TMP, "figma-runtime.d.ts");
virtual.set(
  stubPath,
  `
declare module "figma" {
  type Section = { type: "CODE"; code: string } | { type: "INSTANCE"; guid: string; symbolId: string } | { type: "ERROR"; message: string };
  type Metadata = { nestable?: boolean; props?: Record<string, any> };
  type ErrorHandle = { type: "ERROR" };
  type InstanceHandle = {
    type: "INSTANCE"; name: string;
    getString(name: string): string;
    getBoolean(name: string, mapping?: Record<string, any>): boolean;
    getEnum(name: string, mapping: Record<string, any>): any;
    getPropertyValue(name: string): string | boolean;
    getInstanceSwap(name: string): InstanceHandle | null;
    getSlot(name: string): Section[] | undefined;
    findConnectedInstance(id: string, opts?: { path?: string[]; traverseInstances?: boolean }): InstanceHandle | ErrorHandle;
    findConnectedInstances(fn: (child: InstanceHandle) => boolean, opts?: { path?: string[]; traverseInstances?: boolean }): InstanceHandle[];
    findInstance(name: string, opts?: { path?: string[]; traverseInstances?: boolean }): InstanceHandle | ErrorHandle;
    codeConnectId(): string | null;
    executeTemplate(): { example: Section[]; metadata?: Metadata };
  };
  const figma: {
    selectedInstance: InstanceHandle;
    code(strings: TemplateStringsArray, ...values: any[]): Section[];
  };
  export default figma;
}
declare module "*.css";
`,
);
assert.equal(manifest.sourceContracts.appearance.length, 3);
assert.equal(manifest.sourceContracts.effects.length, 6);
assert.equal(
  manifest.sourceContracts.charts?.length,
  1,
  "Regenerate source chart contracts after the owner API checkpoint.",
);
const contractImports = [];
const contractExamples = [];
const contractTypes = [
  "type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;",
  "type Assert<T extends true> = T;",
];
let sourceAppearanceCases = 0;
let sourceChartKindCases = 0;
let sourceButtonShapeSizeCases = 0;
let sourceTableMaterialDensityCases = 0;
let sourceDataTableStateCases = 0;
for (const contract of manifest.sourceContracts.appearance) {
  const source = fs.readFileSync(path.join(ROOT, contract.source), "utf8");
  const sourceFile = ts.createSourceFile(
    contract.source,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const alias = sourceFile.statements.find(
    (statement) =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === contract.type,
  );
  assert(alias && ts.isUnionTypeNode(alias.type), `Missing ${contract.type}`);
  const actualOptions = alias.type.types.map((type) => {
    assert(ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal));
    return type.literal.text;
  });
  assert.deepEqual(actualOptions, contract.options, "Stale appearance options");
  assert.equal(contract.property, "appearance");
  const sourceModule = contract.source
    .replace("src/", "@/")
    .replace(/\.tsx$/, "");
  contractImports.push(
    `import { ${contract.export}, type ${contract.type}, type ${contract.export}Props } from ${JSON.stringify(sourceModule)};`,
  );
  contractTypes.push(
    `export type ${contract.export}AppearanceMatches = Assert<Equal<${contract.type}, ${contract.options.map((option) => JSON.stringify(option)).join(" | ")}>>;`,
    `export type ${contract.export}AppearancePropMatches = Assert<Equal<NonNullable<${contract.export}Props["appearance"]>, ${contract.type}>>;`,
  );
  for (const value of contract.options) {
    contractExamples.push(
      `<${contract.export} key=${JSON.stringify(`${contract.export}-${value}`)} appearance=${JSON.stringify(value)}>Local appearance fixture</${contract.export}>`,
    );
    sourceAppearanceCases++;
  }
}
for (const contract of manifest.sourceContracts.effects) {
  const sourceModule = contract.source
    .replace("src/", "@/")
    .replace(/\.tsx$/, "");
  contractImports.push(
    `import { ${contract.export}, type ${contract.type} } from ${JSON.stringify(sourceModule)};`,
  );
  contractTypes.push(
    `export const ${contract.export}PropsFixture: ${contract.type} = {};`,
  );
  contractExamples.push(
    `<${contract.export} key="${contract.export}">Local effect fixture</${contract.export}>`,
  );
}
for (const contract of manifest.sourceContracts.charts) {
  const sourceText = fs.readFileSync(path.join(ROOT, contract.source), "utf8");
  const sourceFile = ts.createSourceFile(
    contract.source,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const alias = sourceFile.statements.find(
    (statement) =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === contract.type,
  );
  assert(alias && ts.isUnionTypeNode(alias.type), "Missing ChartKind union");
  const actualOptions = alias.type.types.map((type) => {
    assert(ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal));
    return type.literal.text;
  });
  assert.deepEqual(
    actualOptions,
    contract.options,
    "Stale ChartKind source contract",
  );
  const sourceModule = contract.source
    .replace("src/", "@/")
    .replace(/\.tsx$/, "");
  contractImports.push(
    `import { Chart, type ChartKind, type ChartProps, type ChartDatum } from ${JSON.stringify(sourceModule)};`,
  );
  contractTypes.push(
    `export type ChartKindMatches = Assert<Equal<ChartKind, ${contract.options.map((option) => JSON.stringify(option)).join(" | ")}>>;`,
    'export type ChartKindPropMatches = Assert<Equal<NonNullable<ChartProps["kind"]>, ChartKind>>;',
    'export type ChartLegendPropMatches = Assert<Equal<NonNullable<ChartProps["legend"]>, boolean>>;',
    `export type ChartAppearancePropMatches = Assert<Equal<NonNullable<ChartProps["appearance"]>, ${contract.booleanMappings
      .find((item) => item.property === "appearance")
      .options.map((option) => JSON.stringify(option))
      .join(" | ")}>>;`,
    `export type ChartVisibleSeriesPropMatches = Assert<Equal<NonNullable<ChartProps["visibleSeries"]>[number], ${contract.booleanMappings
      .find((item) => item.property === "visibleSeries")
      .options.map((option) => JSON.stringify(option))
      .join(" | ")}>>;`,
  );
  if (contract.supportsTertiary)
    contractTypes.push(
      'export type ChartTertiaryMatches = Assert<Equal<NonNullable<ChartDatum["tertiary"]>, number>>;',
    );
  for (const kind of contract.options) {
    const row = {
      label: "May",
      value: kind === "diverging-bar" ? -12 : 28,
      secondary: 24,
    };
    const second = { label: "June", value: 34, secondary: 28 };
    if (contract.supportsTertiary) {
      row.tertiary = 16;
      second.tertiary = 20;
    }
    const fixture = `ChartData${sourceChartKindCases}`;
    contractTypes.push(
      `export const ${fixture}: ChartDatum[] = ${JSON.stringify([row, second])};`,
    );
    contractExamples.push(
      `<Chart key=${JSON.stringify(`Chart-${kind}`)} kind=${JSON.stringify(kind)} data={${fixture}} label="Local chart fixture" valueLabel="Current" secondaryLabel="Previous" />`,
    );
    sourceChartKindCases++;
  }
}
assert.equal(manifest.sourceContracts.shapes.length, 1);
for (const contract of manifest.sourceContracts.shapes) {
  const sourceModule = contract.source
    .replace("src/", "@/")
    .replace(/\.tsx$/, "");
  contractImports.push(
    `import type { ButtonShape } from ${JSON.stringify(sourceModule)};`,
  );
  contractTypes.push(
    `export type ButtonShapeMatches = Assert<Equal<ButtonShape, ${contract.options.map((option) => JSON.stringify(option)).join(" | ")}>>;`,
    'export type ButtonShapePropMatches = Assert<Equal<NonNullable<ButtonProps["shape"]>, ButtonShape>>;',
  );
  for (const shape of contract.options)
    for (const size of Object.values(contract.sizeMapping)) {
      contractExamples.push(
        `<Button key=${JSON.stringify(`shape-${shape}-${size}`)} shape=${JSON.stringify(shape)} size=${JSON.stringify(size)}>Local shape fixture</Button>`,
      );
      sourceButtonShapeSizeCases++;
    }
}
assert.equal(manifest.sourceContracts.tables.length, 2);
contractImports.push('import type { ColumnDef } from "@tanstack/react-table";');
contractTypes.push(
  "type SourceTableRow = { id: string; name: string };",
  'const sourceTableRows: SourceTableRow[] = [{ id: "local-1", name: "Local table fixture" }];',
  'const sourceTableColumns: ColumnDef<SourceTableRow>[] = [{ accessorKey: "name", header: "Name" }];',
);
for (const contract of manifest.sourceContracts.tables) {
  const sourceModule = contract.source
    .replace("src/", "@/")
    .replace(/\.tsx$/, "");
  contractImports.push(
    `import { ${contract.export}, type ${contract.propsType}${contract.export === "Table" ? ", type TableAppearance, type TableDensity" : ""} } from ${JSON.stringify(sourceModule)};`,
  );
  const propsType =
    contract.export === "DataTable"
      ? "DataTableProps<SourceTableRow>"
      : "TableProps";
  for (const property of contract.properties) {
    const sourceFile = ts.createSourceFile(
      property.source,
      fs.readFileSync(path.join(ROOT, property.source), "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const alias = sourceFile.statements.find(
      (statement) =>
        ts.isTypeAliasDeclaration(statement) &&
        statement.name.text === property.type,
    );
    assert(alias && ts.isUnionTypeNode(alias.type));
    const actualOptions = alias.type.types.map((type) => {
      assert(ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal));
      return type.literal.text;
    });
    assert.deepEqual(actualOptions, property.options);
    contractTypes.push(
      `export type ${contract.export}${property.type}Matches = Assert<Equal<${property.type}, ${property.options.map((option) => JSON.stringify(option)).join(" | ")}>>;`,
      `export type ${contract.export}${property.type}PropMatches = Assert<Equal<NonNullable<${propsType}[${JSON.stringify(property.property)}]>, ${property.type}>>;`,
    );
  }
  for (const appearance of contract.properties.find(
    (item) => item.property === "appearance",
  ).options)
    for (const density of contract.properties.find(
      (item) => item.property === "density",
    ).options) {
      const attributes = `key=${JSON.stringify(`${contract.export}-${appearance}-${density}`)} appearance=${JSON.stringify(appearance)} density=${JSON.stringify(density)}`;
      contractExamples.push(
        contract.export === "Table"
          ? `<Table ${attributes}><caption>Local table fixture</caption><tbody><tr><td>Local record</td></tr></tbody></Table>`
          : `<DataTable<SourceTableRow> ${attributes} data={sourceTableRows} columns={sourceTableColumns} selectable pageSize={5} />`,
      );
      sourceTableMaterialDensityCases++;
    }
}
for (const stateName of ["Default", "Selected", "Empty", "Loading", "Error"]) {
  contractExamples.push(
    `<DataTable<SourceTableRow> key=${JSON.stringify(`state-${stateName}`)} data={${stateName === "Empty" ? "[]" : "sourceTableRows"}} columns={sourceTableColumns} selectable loading={${stateName === "Loading"}}${stateName === "Error" ? ' error="Local data fixture could not load." onRetry={() => console.info("Connect retry to your data adapter.")}' : ""} />`,
  );
  sourceDataTableStateCases++;
}
virtual.set(
  path.join(TMP, "source-contracts.tsx"),
  [
    ...contractImports,
    ...contractTypes,
    `export const SourceContracts = () => (<>${contractExamples.join("")}</>);`,
  ].join("\n"),
);
const cliSource = ts.createSourceFile(
  "bin/aureform.mjs",
  fs.readFileSync(path.join(ROOT, "bin/aureform.mjs"), "utf8"),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
);
const starterDeclaration = cliSource.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => statement.declarationList.declarations)
  .find((declaration) => declaration.name.getText(cliSource) === "starterPage");
assert(
  starterDeclaration &&
    ts.isNoSubstitutionTemplateLiteral(starterDeclaration.initializer),
  "The starter page must remain a complete reproducible source payload.",
);
virtual.set(
  path.join(TMP, "starter-page.tsx"),
  starterDeclaration.initializer.text,
);
const options = {
  strict: true,
  skipLibCheck: true,
  target: ts.ScriptTarget.ES2022,
  lib: ["lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.es2022.d.ts"],
  noEmit: true,
  incremental: false,
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  resolveJsonModule: true,
  types: ["node", "react"],
  typeRoots: [path.join(DEPS, "@types")],
  paths: { "@/*": [path.join(ROOT, "src/*")] },
};
const baseHost = ts.createCompilerHost(options);
const readFile = baseHost.readFile.bind(baseHost);
const fileExists = baseHost.fileExists.bind(baseHost);
baseHost.readFile = (file) => virtual.get(file) ?? readFile(file);
baseHost.fileExists = (file) => virtual.has(file) || fileExists(file);
baseHost.getSourceFile = (file, languageVersion) => {
  const text = baseHost.readFile(file);
  return text === undefined
    ? undefined
    : ts.createSourceFile(file, text, languageVersion, true);
};
baseHost.resolveModuleNames = (names, containingFile) =>
  names.map((name) => {
    const dependencyResolver = path.join(
      path.dirname(DEPS),
      "__code_connect_resolver__.tsx",
    );
    const external =
      !name.startsWith(".") && !name.startsWith("@/") && !path.isAbsolute(name);
    const fromDependencies = DEPENDENCY_ROOTS.some((root) =>
      containingFile.startsWith(`${root}${path.sep}`),
    );
    const direct = ts.resolveModuleName(
      name,
      external && !fromDependencies ? dependencyResolver : containingFile,
      options,
      baseHost,
    ).resolvedModule;
    if (direct || (external && !fromDependencies)) return direct;
    return ts.resolveModuleName(name, dependencyResolver, options, baseHost)
      .resolvedModule;
  });
const roots = [
  ...virtual.keys(),
  ...manifest.templates.map((t) => path.join(ROOT, t.file)),
];
console.log(
  `Type-checking canonical source props and all distinct emitted examples with TypeScript ${ts.version}…`,
);
const program = ts.createProgram(roots, options, baseHost);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (file) => file,
      getCurrentDirectory: () => ROOT,
      getNewLine: () => "\n",
    }),
  );
  process.exitCode = 1;
} else {
  const inputs = manifest.authoritativeInputs.map((input) => ({
    ...input,
    matchesCurrentFile:
      sha(fs.readFileSync(path.join(ROOT, input.file))) === input.sha256,
  }));
  assert(
    inputs.every((input) => input.matchesCurrentFile),
    "Authoritative ledgers changed; regenerate before recording success",
  );
  checkSnapshots();
  const summary = {
    status: "passed-local-smoke",
    checkedAt: new Date().toISOString(),
    templateCheckpointVersion:
      manifest.templateCheckpointVersion ?? manifest.version,
    sourceValidationVersion:
      manifest.sourceValidationVersion ?? manifest.version,
    scope:
      "Existing local templates checked against the recorded current source snapshot",
    runtime: "synthetic-figma-stub",
    typescript: ts.version,
    templateFiles: manifest.templates.length,
    firstListedVariantCases: manifest.templates.length,
    recordedNativeMatrixCases: Object.fromEntries(
      manifest.templates
        .filter((entry) => entry.nativeVariants)
        .map((entry) => [entry.nativeName, entry.nativeVariants.length]),
    ),
    exhaustiveVariantCombinations: exhaustiveVariants,
    topLevelCases: scenarios.length,
    nestedTemplateExecutions: nestedExecutions,
    totalTemplateEvaluations: evaluations,
    uniqueTypedExamples: unique.size,
    templateTypecheck: "passed-against-local-api-declaration-stub",
    emittedExampleTypecheck:
      "passed-against-canonical-source-and-installed-dependency-types",
    canonicalSources: "src",
    dependencyTypes:
      DEPS === path.join(ROOT, "node_modules")
        ? "node_modules"
        : "owner-mirror",
    diagnostics: 0,
    quoteNewlineUnicodeCases: manifest.templates.length,
    nativeIconSwapCases: manifest.coverage.nativeIcons * 2,
    unexposedIconChildCases: manifest.coverage.nativeIcons * 2,
    missingOrErrorSwapCases: byId.has("aureform-button-shapes") ? 6 : 4,
    shellPageContentCases: 18,
    sourceAppearanceCases,
    sourceEffectContracts: manifest.sourceContracts.effects.length,
    sourceChartKindCases,
    sourceButtonShapeSizeCases,
    sourceTableMaterialDensityCases,
    sourceDataTableStateCases,
    nativeChartVariantCombinations: byId.get("aureform-chart").axes.Kind.length,
    nativeChartBooleanDefinitions: chartBooleanProperties.length,
    nativeChartBooleanCases,
    starterSourceTypecheck: "passed-against-canonical-source",
    sourceSnapshotChecks: manifest.sourceSnapshots.length,
    templateSnapshotChecks: manifest.templateSnapshots.length,
    pendingNativeMappings: manifest.pendingNativeMappings.length,
    rawShellHeaderNotForwarded: true,
    liveFigmaRuntimeTested: false,
    cloudRegistered: false,
    testScript: "scripts/verify-code-connect.cjs",
  };
  manifest.validation = summary;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(
    path.join(TMP, "validation-summary.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
  console.log(JSON.stringify(summary, null, 2));
}
