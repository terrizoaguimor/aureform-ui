/**
 * Owner execution only: standalone, sequential use_figma Plugin API body.
 * fileKey: lHp5p10yGb7lqXJDnAox0N
 * skillNames: figma-use,figma-generate-library
 *
 * Source: src/components/ui/button.tsx and tokens/aureform.tokens.json.
 * Creates Button / Shapes: three shapes × three sizes = nine variants.
 * Reuses the verified core icon and existing loading/icon addon masters.
 * Refreshes only the three existing Button / Appearance gradient states.
 * Each Light/Dark review has 27 button examples; no enlarged cross product.
 *
 * Evidence: state.json, component-properties.json, native-appearance-1.1.json,
 * native-appearance-type-review-1.1.json, native-runtime-sync-1.1.json.
 * Font/variant/property recipes: flagships-1.1.js and themes-1.1.js.
 * No pluginData, ledger writes, publishing, imports or shader changes.
 * Record the returned actual IDs/keys, then perform owner visual validation.
 * Returns minified JSON within a 20,000-byte response budget. Every affected
 * node ID is retained in observed-prefix-ranges-v1; decodeAffectedIds() below
 * restores the exact lists, including instance descendants and partial work.
 */
const FILE_KEY = "lHp5p10yGb7lqXJDnAox0N";
const PAGE_ID = "2:3";
const COLOR_COLLECTION_ID = "VariableCollectionId:2:36";
const DIMENSION_COLLECTION_ID = "VariableCollectionId:2:58";
const SHAPES_NAME = "Button / Shapes";
const REVIEW_PREFIX = "Review / Button 1.1 / ";
const RETURN_MAX_BYTES = 20000;
const SHAPES = { Rounded: "rounded", Pill: "pill", Square: "square" };
const SIZES = {
  Small: { source: "sm", height: 32, padding: 12, fontSize: 13 },
  Medium: { source: "default", height: 42, padding: 16, fontSize: 13 },
  Large: { source: "lg", height: 48, padding: 24, fontSize: 14 },
};
const SOURCE_DEFAULTS = {
  radius: { md: 10.4, full: 999 },
  gap: 8,
  lineHeight: 20,
  letterSpacingPercent: -1,
  gradientHoverGlow: { color: "#8B5CF6", radius: 31, Light: 0.16, Dark: 0.26 },
  controlColors: {
    Light: ["#8558EC", "#158191", "#218560", "#218560"],
    Dark: ["#8B5CF6", "#22D3EE", "#34D399", "#34D399"],
  },
};
const LEDGER = {
  core: {
    id: "3:113",
    defaultId: "3:17",
    name: "Button",
    fields: {
      "Label#3:0": "TEXT",
      "Show icon#3:28": "BOOLEAN",
      "Icon#3:56": "INSTANCE_SWAP",
    },
    axes: {
      Style: ["Primary", "Outline", "Ghost"],
      Size: ["Small", "Medium", "Large"],
      State: ["Default", "Hover", "Disabled"],
    },
    count: 27,
  },
  additional: {
    id: "25:700",
    defaultId: "25:646",
    name: "Button / Additional styles",
    fields: { "Label#25:8": "TEXT" },
    axes: {
      Style: ["Secondary", "Destructive", "Link"],
      Size: ["Small", "Medium", "Large"],
      State: ["Default", "Hover", "Disabled"],
    },
    count: 27,
  },
  addons: {
    id: "25:773",
    defaultId: "25:701",
    name: "Button / Loading & icons",
    fields: {},
    axes: {
      Style: [
        "Primary",
        "Outline",
        "Secondary",
        "Ghost",
        "Destructive",
        "Link",
      ],
      Kind: ["Loading", "Icon", "Small icon"],
    },
    count: 18,
  },
  appearance: {
    id: "97:655",
    defaultId: "97:625",
    name: "Button / Appearance",
    fields: { "Label#97:0": "TEXT" },
    axes: {
      Appearance: ["Solid", "Soft", "Outline", "Glass", "Gradient"],
      State: ["Default", "Hover", "Disabled"],
    },
    count: 15,
  },
};
const VARIABLE_IDS = {
  background: "VariableID:2:37",
  foreground: "VariableID:2:41",
  "muted-foreground": "VariableID:2:42",
  primary: "VariableID:2:43",
  "primary-foreground": "VariableID:2:45",
  "spacing/2": "VariableID:2:61",
  "spacing/3": "VariableID:2:62",
  "spacing/4": "VariableID:2:63",
  "spacing/6": "VariableID:2:65",
  "spacing/8": "VariableID:2:66",
  "spacing/12": "VariableID:2:68",
  "radius/md": "VariableID:2:71",
  "radius/full": "VariableID:2:74",
  "control/color-1": "VariableID:108:68",
  "control/color-2": "VariableID:108:69",
  "control/color-3": "VariableID:108:70",
  "control/color-4": "VariableID:108:71",
};
const STYLE_IDS = {
  Light: {
    control: "S:f94b92637c8981e80ad9cb928d38a6e14c05b74e,",
    soft: "S:c910c6bbb0ca23901963053979c2490f0ce268c6,",
  },
  Dark: {
    control: "S:4e792a1e5af7cc9f071c45e15dad490e18e5adff,",
    soft: "S:8f8bc239d6a0114d60d657275d4b60636e581880,",
  },
};
const created = new Set();
const mutated = new Set();
const createdPropertyKeys = new Set();
let stage = "preflight";
let page;

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}
function tree(node) {
  return [node, ...("children" in node ? node.children.flatMap(tree) : [])];
}
function register(node) {
  for (const child of tree(node)) created.add(child.id);
  if (page) mutated.add(page.id);
  return node;
}
function propertyOwner(node) {
  return node.type === "COMPONENT" && node.parent?.type === "COMPONENT_SET"
    ? node.parent
    : node;
}
// Compatibility recipe from the verified ledger and native builders.
// Property definitions are read from the owning set, never from a variant.
function compatibleMaster(node, spec) {
  requireCondition(
    node?.type === "COMPONENT_SET" &&
      node.id === spec.id &&
      node.name === spec.name,
    "Incompatible recorded master: " + spec.name,
  );
  const definitions = propertyOwner(node).componentPropertyDefinitions;
  for (const [key, type] of Object.entries(spec.fields))
    requireCondition(
      definitions[key]?.type === type,
      spec.name + ": missing " + key,
    );
  for (const [axis, values] of Object.entries(spec.axes))
    requireCondition(
      definitions[axis]?.type === "VARIANT" &&
        values.every((value) =>
          definitions[axis].variantOptions.includes(value),
        ),
      spec.name + ": incompatible " + axis,
    );
  requireCondition(
    node.children.length === spec.count,
    spec.name + ": variant count changed",
  );
  requireCondition(
    node.children.some(
      (child) => child.type === "COMPONENT" && child.id === spec.defaultId,
    ),
    spec.name + ": recorded default no longer belongs to the set",
  );
  return node;
}
function variant(set, axes) {
  const definitions = propertyOwner(set).componentPropertyDefinitions;
  for (const [key, value] of Object.entries(axes))
    requireCondition(
      definitions[key]?.type === "VARIANT" &&
        definitions[key].variantOptions.includes(value),
      set.name + ": unverified " + key + "=" + value,
    );
  const matches = set.children.filter(
    (child) =>
      child.type === "COMPONENT" &&
      Object.entries(axes).every(
        ([key, value]) => child.variantProperties?.[key] === value,
      ),
  );
  requireCondition(
    matches.length === 1,
    set.name + ": missing/ambiguous " + JSON.stringify(axes),
  );
  return matches[0];
}
function propertyText(component, key) {
  const matches = tree(component).filter(
    (node) =>
      node.type === "TEXT" &&
      node.componentPropertyReferences?.characters === key,
  );
  requireCondition(
    matches.length === 1,
    component.id + ": missing/ambiguous text reference " + key,
  );
  return matches[0];
}

// Same lossless ID format as the owner's Table/flagship builders. Only
// consecutive observed suffixes form a range; gaps are never filled.
function encodeAffectedIds(createdIds, mutatedIds) {
  const categories = [new Set(createdIds), new Set(mutatedIds), new Set()];
  const ids = [...new Set(categories.flatMap((values) => [...values]))];
  const groups = new Map();
  const literals = [];
  const maskOf = (id) =>
    categories.reduce(
      (mask, values, index) => mask | (values.has(id) ? 1 << index : 0),
      0,
    );
  for (const id of ids) {
    const match = /^([A-Za-z0-9;:_-]*:)(0|[1-9]\d*)$/.exec(id);
    if (!match || !Number.isSafeInteger(Number(match[2]))) {
      literals.push([maskOf(id), id]);
      continue;
    }
    const prefix = match[1];
    const key = maskOf(id) + "," + prefix;
    if (!groups.has(key))
      groups.set(key, { mask: maskOf(id), prefix, values: [] });
    groups.get(key).values.push(Number(match[2]));
  }
  const prefixes = [
    ...new Set([...groups.values()].map((group) => group.prefix)),
  ].sort();
  let previous = "";
  const prefixesFrontCodedCSV = prefixes
    .map((prefix) => {
      let common = 0;
      while (
        common < Math.min(previous.length, prefix.length) &&
        previous[common] === prefix[common]
      )
        common++;
      const row = common + "," + prefix.slice(common);
      previous = prefix;
      return row;
    })
    .join("\n");
  const rangesCSV = [...groups.values()]
    .map((group) => {
      const values = group.values.sort((a, b) => a - b);
      const runs = [];
      for (let index = 0; index < values.length; index++) {
        const start = values[index];
        let end = start;
        while (index + 1 < values.length && values[index + 1] === end + 1)
          end = values[++index];
        runs.push(start === end ? String(start) : start + "-" + end);
      }
      return (
        group.mask + "," + prefixes.indexOf(group.prefix) + "," + runs.join(";")
      );
    })
    .join("\n");
  return {
    encoding: "observed-prefix-ranges-v1",
    categoryBits: { created: 1, mutated: 2, removed: 4 },
    counts: {
      created: categories[0].size,
      mutated: categories[1].size,
      removed: 0,
      unique: ids.length,
    },
    prefixesFrontCodedCSV,
    rangesCSV,
    literalsJSON: JSON.stringify(literals),
  };
}
function decodeAffectedIds(ledger) {
  const result = {
    createdNodeIds: [],
    mutatedNodeIds: [],
    removedNodeIds: [],
  };
  let previous = "";
  const prefixes = ledger.prefixesFrontCodedCSV
    ? ledger.prefixesFrontCodedCSV.split("\n").map((row) => {
        const comma = row.indexOf(",");
        const common = Number(row.slice(0, comma));
        previous = previous.slice(0, common) + row.slice(comma + 1);
        return previous;
      })
    : [];
  function add(mask, id) {
    if (mask & 1) result.createdNodeIds.push(id);
    if (mask & 2) result.mutatedNodeIds.push(id);
    if (mask & 4) result.removedNodeIds.push(id);
  }
  if (ledger.rangesCSV)
    for (const row of ledger.rangesCSV.split("\n")) {
      const [mask, prefix, ranges] = row.split(",");
      for (const range of ranges.split(";")) {
        const [start, end = start] = range.split("-").map(Number);
        for (let suffix = start; suffix <= end; suffix++)
          add(Number(mask), prefixes[Number(prefix)] + suffix);
      }
    }
  for (const [mask, id] of JSON.parse(ledger.literalsJSON)) add(mask, id);
  return result;
}
function utf8Bytes(text) {
  let bytes = 0;
  for (const character of text) {
    const point = character.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}
function boundedResult(payload) {
  const result = { ...payload };
  const sourceLists = {
    createdNodeIds: result.createdNodeIds ?? [...created],
    mutatedNodeIds:
      result.mutatedNodeIds ?? [...mutated].filter((id) => !created.has(id)),
  };
  result.affectedNodeIds = encodeAffectedIds(
    sourceLists.createdNodeIds,
    sourceLists.mutatedNodeIds,
  );
  result.createdComponentPropertyKeys = [...createdPropertyKeys];
  delete result.createdNodeIds;
  delete result.mutatedNodeIds;
  const decoded = decodeAffectedIds(result.affectedNodeIds);
  for (const [key, count] of [
    ["createdNodeIds", result.affectedNodeIds.counts.created],
    ["mutatedNodeIds", result.affectedNodeIds.counts.mutated],
  ]) {
    const observed = new Set(sourceLists[key]);
    requireCondition(
      decoded[key].length === count &&
        decoded[key].every((id) => observed.has(id)),
      "Affected ID ledger did not round-trip",
    );
  }
  result.returnBudget = {
    maximumBytes: RETURN_MAX_BYTES,
    encoding: "minified-json-string",
    nodeIdDecoder: "decodeAffectedIds",
  };
  let json = JSON.stringify(result);
  // Include JSON string escaping in the budget, since MCP may wrap the string.
  if (utf8Bytes(JSON.stringify(json)) > RETURN_MAX_BYTES - 1000) {
    // These fields contain no IDs. Keep all records, property keys, dependency
    // IDs and the complete affected ledger when secondary detail is large.
    if (result.loadedFonts) {
      result.loadedFontCount = result.loadedFonts.length;
      delete result.loadedFonts;
    }
    if (result.sourceContract) {
      result.sourceContractFiles = [
        "src/components/ui/button.tsx",
        "tokens/aureform.tokens.json",
        ".figma/scripts/buttons-1.1.js",
      ];
      delete result.sourceContract;
    }
    if (result.limits)
      result.limits = [
        "Owner execution and visual validation remain required.",
      ];
    json = JSON.stringify(result);
  }
  requireCondition(
    utf8Bytes(JSON.stringify(json)) <= RETURN_MAX_BYTES,
    "Lossless Button receipt exceeds the 20,000-byte response budget",
  );
  return json;
}

try {
  requireCondition(
    !figma.fileKey || figma.fileKey === FILE_KEY,
    "Wrong Figma file",
  );
  page = await figma.getNodeByIdAsync(PAGE_ID);
  requireCondition(page?.type === "PAGE", "Recorded Core page is missing");
  // Exactly one page switch. All subsequent reads stay on the verified page.
  await figma.setCurrentPageAsync(page);
  const [
    masterNodes,
    variables,
    collections,
    paintStyles,
    effectStyles,
    textStyles,
    availableFonts,
  ] = await Promise.all([
    Promise.all(
      Object.values(LEDGER).map((spec) => figma.getNodeByIdAsync(spec.id)),
    ),
    figma.variables.getLocalVariablesAsync(),
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.getLocalPaintStylesAsync(),
    figma.getLocalEffectStylesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.listAvailableFontsAsync(),
  ]);
  const masters = Object.fromEntries(
    Object.entries(LEDGER).map(([name, spec], index) => [
      name,
      compatibleMaster(masterNodes[index], spec),
    ]),
  );
  for (const master of Object.values(masters))
    requireCondition(
      master.parent?.id === PAGE_ID,
      master.name + ": unexpected page/parent",
    );
  const colorCollection = collections.find((c) => c.id === COLOR_COLLECTION_ID);
  const dimensionCollection = collections.find(
    (c) => c.id === DIMENSION_COLLECTION_ID,
  );
  requireCondition(
    colorCollection && dimensionCollection,
    "Recorded foundations are missing",
  );
  const modes = Object.fromEntries(
    colorCollection.modes.map((mode) => [mode.name, mode.modeId]),
  );
  requireCondition(
    modes.Light === "2:1" && modes.Dark === "2:2",
    "Recorded Aurora modes changed",
  );
  const byId = new Map(variables.map((variable) => [variable.id, variable]));
  const tokens = Object.fromEntries(
    Object.entries(VARIABLE_IDS).map(([role, id]) => {
      const variable = byId.get(id);
      const numeric = role.startsWith("spacing/") || role.startsWith("radius/");
      requireCondition(
        variable &&
          variable.name ===
            (numeric || role.startsWith("control/") ? role : "color/" + role) &&
          variable.variableCollectionId ===
            (numeric ? DIMENSION_COLLECTION_ID : COLOR_COLLECTION_ID) &&
          variable.resolvedType === (numeric ? "FLOAT" : "COLOR"),
        "Incompatible recorded variable: " + role,
      );
      return [role, variable];
    }),
  );
  function valueOf(variable, mode, seen = new Set()) {
    requireCondition(
      variable && !seen.has(variable.id),
      "Missing/cyclic variable alias",
    );
    seen.add(variable.id);
    const collection = collections.find(
      (c) => c.id === variable.variableCollectionId,
    );
    requireCondition(collection, "Missing alias collection");
    const modeId =
      collection.modes.find((m) => m.name === mode)?.modeId ??
      collection.defaultModeId;
    const value = variable.valuesByMode[modeId];
    return value?.type === "VARIABLE_ALIAS"
      ? valueOf(byId.get(value.id), mode, seen)
      : value;
  }
  function hex(color) {
    requireCondition(
      color &&
        ["r", "g", "b"].every(
          (key) =>
            Number.isFinite(color[key]) && color[key] >= 0 && color[key] <= 1,
        ),
      "Invalid resolved RGB color",
    );
    return (
      "#" +
      ["r", "g", "b"]
        .map((key) =>
          Math.round(color[key] * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")
        .toUpperCase()
    );
  }
  const sourceMeasures = {
    "spacing/2": 8,
    "spacing/3": 12,
    "spacing/4": 16,
    "spacing/6": 24,
    "spacing/8": 32,
    "spacing/12": 48,
    "radius/md": SOURCE_DEFAULTS.radius.md,
    "radius/full": SOURCE_DEFAULTS.radius.full,
  };
  for (const [role, expected] of Object.entries(sourceMeasures))
    requireCondition(
      valueOf(tokens[role], "Dark") === expected,
      "Source dimension mismatch: " + role,
    );
  const styles = {};
  for (const mode of ["Light", "Dark"]) {
    for (let index = 0; index < 4; index++)
      requireCondition(
        hex(valueOf(tokens["control/color-" + (index + 1)], mode)) ===
          SOURCE_DEFAULTS.controlColors[mode][index],
        "Native control color differs from current source: " +
          mode +
          "/" +
          (index + 1),
      );
    const control = paintStyles.find(
      (style) => style.id === STYLE_IDS[mode].control,
    );
    const soft = effectStyles.find(
      (style) => style.id === STYLE_IDS[mode].soft,
    );
    requireCondition(
      control?.name === "Aureform/Gradient/" + mode + "/control",
      "Missing recorded " + mode + " control style",
    );
    requireCondition(
      soft?.name === "Aureform/Shadow/" + mode + "/soft",
      "Missing recorded " + mode + " soft shadow",
    );
    const gradient = control.paints.find(
      (paint) => paint.type === "GRADIENT_LINEAR",
    );
    requireCondition(
      gradient?.gradientStops.length === 3 &&
        gradient.gradientStops.every(
          (stop, index) =>
            stop.position === index / 2 &&
            stop.boundVariables?.color?.id ===
              VARIABLE_IDS["control/color-" + (index + 1)],
        ),
      mode + ": control style must use the recorded current control aliases",
    );
    styles[mode] = { control, soft };
  }
  const coreVariants = Object.fromEntries(
    Object.keys(SIZES).map((size) => [
      size,
      variant(masters.core, { Style: "Primary", Size: size, State: "Default" }),
    ]),
  );
  for (const component of Object.values(coreVariants))
    propertyText(component, "Label#3:0");
  for (const component of masters.appearance.children)
    propertyText(component, "Label#97:0");
  const addonVariants = Object.fromEntries(
    ["Loading", "Icon", "Small icon"].map((kind) => [
      kind,
      variant(masters.addons, { Style: "Primary", Kind: kind }),
    ]),
  );
  const iconId =
    masters.core.componentPropertyDefinitions["Icon#3:56"].defaultValue;
  requireCondition(
    typeof iconId === "string",
    "Core icon swap default must be an actual component ID",
  );
  const iconMaster = await figma.getNodeByIdAsync(iconId);
  requireCondition(
    iconMaster?.type === "COMPONENT",
    "Recorded core icon master is unavailable",
  );
  const fonts = {};
  for (const role of ["regular", "semibold", "bold"]) {
    fonts[role] = availableFonts
      .map((font) => font.fontName)
      .find(
        (font) =>
          font.family === "Manrope" &&
          font.style.replace(/\s/g, "").toLowerCase() === role,
      );
    requireCondition(fonts[role], "Manrope font unavailable: " + role);
  }
  const controlTextStyle = textStyles.find(
    (style) => style.name === "Aureform/Control",
  );
  requireCondition(
    controlTextStyle &&
      controlTextStyle.fontName.family === fonts.semibold.family &&
      controlTextStyle.fontName.style === fonts.semibold.style &&
      controlTextStyle.fontSize === 13 &&
      controlTextStyle.lineHeight.unit === "PIXELS" &&
      controlTextStyle.lineHeight.value === SOURCE_DEFAULTS.lineHeight,
    "Existing Control text style must match the current source font recipe",
  );
  const existingSets = page.children.filter(
    (node) => node.name === SHAPES_NAME,
  );
  const existingReviews = ["Dark", "Light"].map((mode) =>
    page.children.filter((node) => node.name === REVIEW_PREFIX + mode),
  );
  requireCondition(
    existingSets.length <= 1 &&
      existingReviews.every((matches) => matches.length <= 1),
    "Duplicate preparation roots",
  );
  const anyExisting =
    existingSets.length || existingReviews.some((matches) => matches.length);
  requireCondition(
    !anyExisting ||
      (existingSets.length === 1 &&
        existingReviews.every((matches) => matches.length === 1)),
    "Partial previous preparation: inspect the existing nodes before retrying",
  );
  const fontSet = new Map(
    Object.values(fonts).map((font) => [JSON.stringify(font), font]),
  );
  for (const root of [
    ...Object.values(masters),
    iconMaster,
    ...existingSets,
    ...existingReviews.flat(),
  ]) {
    for (const text of tree(root).filter((node) => node.type === "TEXT")) {
      for (const segment of text.getStyledTextSegments(["fontName"]))
        fontSet.set(JSON.stringify(segment.fontName), segment.fontName);
      if (!text.characters.length && text.fontName !== figma.mixed)
        fontSet.set(JSON.stringify(text.fontName), text.fontName);
    }
  }
  await Promise.all(
    [...fontSet.values()].map((font) => figma.loadFontAsync(font)),
  );
  function solid(role, mode = "Dark") {
    const variable = tokens[role],
      { r, g, b } = valueOf(variable, mode);
    return figma.variables.setBoundVariableForPaint(
      { type: "SOLID", color: { r, g, b } },
      "color",
      variable,
    );
  }
  function bindRadius(node, shape) {
    const role =
      shape === "Rounded"
        ? "radius/md"
        : shape === "Pill"
          ? "radius/full"
          : null;
    node.cornerRadius = role ? valueOf(tokens[role], "Dark") : 0;
    for (const field of [
      "topLeftRadius",
      "topRightRadius",
      "bottomLeftRadius",
      "bottomRightRadius",
    ])
      node.setBoundVariable(field, role ? tokens[role] : null);
  }
  function shapePropertyKeys(set) {
    const definitions = propertyOwner(set).componentPropertyDefinitions;
    const result = {};
    for (const [name, type, resultKey] of [
      ["Label", "TEXT", "label"],
      ["Show icon", "BOOLEAN", "showIcon"],
      ["Icon", "INSTANCE_SWAP", "icon"],
    ]) {
      const keys = Object.keys(definitions).filter(
        (key) => key.startsWith(name + "#") && definitions[key].type === type,
      );
      requireCondition(
        keys.length === 1,
        SHAPES_NAME + ": missing/ambiguous " + name,
      );
      result[resultKey] = keys[0];
    }
    return result;
  }
  function shapeRecord(set, keys) {
    return {
      setId: set.id,
      defaultId: variant(set, { Shape: "Rounded", Size: "Medium" }).id,
      ...keys,
      axes: { Shape: Object.keys(SHAPES), Size: Object.keys(SIZES) },
      sourceMappings: {
        shape: SHAPES,
        size: Object.fromEntries(
          Object.entries(SIZES).map(([name, spec]) => [name, spec.source]),
        ),
      },
      variants: set.children.map((node) => ({
        id: node.id,
        name: node.name,
        axes: node.variantProperties,
      })),
      propertyDefinitions: Object.fromEntries(
        Object.entries(propertyOwner(set).componentPropertyDefinitions).map(
          ([key, definition]) => [
            key,
            {
              type: definition.type,
              defaultValue: definition.defaultValue,
              ...(definition.type === "VARIANT"
                ? { variantOptions: definition.variantOptions }
                : {}),
            },
          ],
        ),
      ),
    };
  }
  if (anyExisting) {
    const set = existingSets[0];
    requireCondition(
      set.type === "COMPONENT_SET" && set.children.length === 9,
      "Existing Shapes matrix is incompatible",
    );
    const keys = shapePropertyKeys(set);
    for (const shape of Object.keys(SHAPES))
      for (const [size, spec] of Object.entries(SIZES)) {
        const component = variant(set, { Shape: shape, Size: size });
        requireCondition(
          component.height === spec.height,
          "Existing Shapes height differs from source",
        );
        propertyText(component, keys.label);
      }
    requireCondition(
      existingReviews
        .flat()
        .every(
          (root) =>
            root.type === "FRAME" &&
            root.children
              .filter((child) => child.type === "FRAME")
              .reduce(
                (count, row) =>
                  count +
                  row.children.filter((child) => child.type === "INSTANCE")
                    .length,
                0,
              ) === 27,
        ),
      "Existing review matrix is incomplete",
    );
    return boundedResult({
      status: "already-prepared-needs-owner-visual-validation",
      createdNodeIds: [],
      mutatedNodeIds: [],
      components: { [SHAPES_NAME]: shapeRecord(set, keys) },
      reviewFrames: existingReviews
        .flat()
        .map((root) => ({ id: root.id, name: root.name, buttonExamples: 27 })),
      nativeRuntimeTestedByThisPreparation: false,
    });
  }
  stage = "mutation";
  function recolorIcon(instance) {
    const variable = tokens["primary-foreground"],
      { r, g, b } = valueOf(variable, "Dark");
    for (const node of tree(instance))
      for (const field of ["fills", "strokes"]) {
        if (field in node && Array.isArray(node[field]))
          node[field] = node[field].map((paint) =>
            paint.type === "SOLID"
              ? figma.variables.setBoundVariableForPaint(
                  { ...paint, color: { r, g, b } },
                  "color",
                  variable,
                )
              : paint,
          );
      }
  }
  async function text(
    parent,
    name,
    characters,
    size = 13,
    role = "foreground",
    weight = "regular",
  ) {
    const node = register(figma.createText());
    parent.appendChild(node);
    node.name = name;
    await node.setTextStyleIdAsync(controlTextStyle.id);
    node.fontName = fonts[weight];
    node.fontSize = size;
    node.lineHeight = {
      unit: "PIXELS",
      value: size > 20 ? 32 : SOURCE_DEFAULTS.lineHeight,
    };
    node.letterSpacing = {
      unit: "PERCENT",
      value: weight === "semibold" ? SOURCE_DEFAULTS.letterSpacingPercent : 0,
    };
    node.textAutoResize = "WIDTH_AND_HEIGHT";
    node.characters = characters;
    node.fills = [solid(role)];
    return node;
  }
  async function primaryFinish(node, mode, disabled = false, hover = false) {
    await node.setFillStyleIdAsync("");
    node.fills = [solid("primary", mode)];
    if (!disabled) await node.setFillStyleIdAsync(styles[mode].control.id);
    await node.setEffectStyleIdAsync(disabled ? "" : styles[mode].soft.id);
    if (disabled) node.effects = [];
    else if (hover) {
      await node.setEffectStyleIdAsync("");
      const glow = SOURCE_DEFAULTS.gradientHoverGlow;
      const [r, g, b] = [1, 3, 5].map(
        (index) => parseInt(glow.color.slice(index, index + 2), 16) / 255,
      );
      node.effects = [
        {
          type: "DROP_SHADOW",
          color: { r, g, b, a: glow[mode] },
          radius: glow.radius,
          spread: 0,
          offset: { x: 0, y: 0 },
          blendMode: "NORMAL",
          visible: true,
        },
      ];
    }
    node.opacity = disabled ? 0.45 : 1;
  }
  const components = [];
  // Medium occupies the top-left position and is the actual native default.
  for (const shape of Object.keys(SHAPES))
    for (const size of ["Medium", "Small", "Large"]) {
      const spec = SIZES[size];
      const component = register(figma.createComponent());
      component.name = "Shape=" + shape + ", Size=" + size;
      component.description =
        "Button shape=" +
        SHAPES[shape] +
        ', size="' +
        spec.source +
        '". Default state; labels and optional icon remain editable.';
      component.layoutMode = "HORIZONTAL";
      component.primaryAxisSizingMode = "AUTO";
      component.counterAxisSizingMode = "FIXED";
      component.primaryAxisAlignItems = "CENTER";
      component.counterAxisAlignItems = "CENTER";
      component.resize(120, spec.height);
      component.paddingLeft = spec.padding;
      component.paddingRight = spec.padding;
      component.setBoundVariable(
        "paddingLeft",
        tokens["spacing/" + spec.padding / 4],
      );
      component.setBoundVariable(
        "paddingRight",
        tokens["spacing/" + spec.padding / 4],
      );
      component.itemSpacing = SOURCE_DEFAULTS.gap;
      component.setBoundVariable("itemSpacing", tokens["spacing/2"]);
      if (size !== "Medium")
        component.setBoundVariable(
          "height",
          tokens["spacing/" + spec.height / 4],
        );
      component.paddingTop = 0;
      component.paddingBottom = 0;
      component.strokes = [];
      component.clipsContent = false;
      bindRadius(component, shape);
      await primaryFinish(component, "Dark");
      const icon = register(iconMaster.createInstance());
      component.appendChild(icon);
      icon.name = "Icon";
      icon.resize(16, 16);
      icon.visible = false;
      recolorIcon(icon);
      await text(
        component,
        "Label",
        "Continue",
        spec.fontSize,
        "primary-foreground",
        "semibold",
      );
      component.primaryAxisSizingMode = "AUTO";
      component.counterAxisSizingMode = "FIXED";
      components.push(component);
    }
  const shapes = register(figma.combineAsVariants(components, page));
  shapes.name = SHAPES_NAME;
  shapes.description =
    "Aureform 1.1 source ButtonShape × label-bearing size. Nine variants. Existing core styles, 15 appearance states and loading/icon addons remain their existing families.";
  shapes.setExplicitVariableModeForCollection(colorCollection, modes.Dark);
  function shapeProperty(name, type, defaultValue) {
    const key = shapes.addComponentProperty(name, type, defaultValue);
    createdPropertyKeys.add(key);
    return key;
  }
  const keys = {
    label: shapeProperty("Label", "TEXT", "Continue"),
    showIcon: shapeProperty("Show icon", "BOOLEAN", false),
    icon: shapeProperty("Icon", "INSTANCE_SWAP", iconMaster.id),
  };
  for (const component of components) {
    component.children.find(
      (node) => node.type === "TEXT" && node.name === "Label",
    ).componentPropertyReferences = { characters: keys.label };
    const icon = component.children.find(
      (node) => node.type === "INSTANCE" && node.name === "Icon",
    );
    icon.componentPropertyReferences = {
      visible: keys.showIcon,
      mainComponent: keys.icon,
    };
    component.x =
      24 +
      ["Medium", "Small", "Large"].indexOf(component.variantProperties.Size) *
        240;
    component.y =
      24 + Object.keys(SHAPES).indexOf(component.variantProperties.Shape) * 88;
  }
  shapes.resize(744, 288);
  shapes.x =
    Math.max(
      0,
      ...page.children
        .filter((node) => node.id !== shapes.id)
        .map((node) => node.x + node.width),
    ) + 180;
  shapes.y = 80;
  requireCondition(
    shapes.defaultVariant.id === shapeRecord(shapes, keys).defaultId,
    "Native default must be Rounded/Medium",
  );
  for (const state of ["Default", "Hover", "Disabled"]) {
    const component = variant(masters.appearance, {
      Appearance: "Gradient",
      State: state,
    });
    await primaryFinish(
      component,
      "Dark",
      state === "Disabled",
      state === "Hover",
    );
    propertyText(component, "Label#97:0").fills = [solid("primary-foreground")];
    mutated.add(component.id);
    mutated.add(propertyText(component, "Label#97:0").id);
  }
  function row(parent, name) {
    const node = register(figma.createAutoLayout("HORIZONTAL"));
    parent.appendChild(node);
    node.name = name;
    node.fills = [];
    node.itemSpacing = 20;
    node.primaryAxisAlignItems = "MIN";
    node.counterAxisAlignItems = "CENTER";
    return node;
  }
  function specimen(parent, component, mode, values = {}) {
    const instance = register(component.createInstance());
    parent.appendChild(instance);
    instance.setExplicitVariableModeForCollection(colorCollection, modes[mode]);
    for (const key of Object.keys(values))
      requireCondition(
        instance.componentProperties[key],
        instance.id + ": unreported instance property " + key,
      );
    if (Object.keys(values).length) instance.setProperties(values);
    return instance;
  }
  const reviewFrames = [];
  for (const mode of ["Dark", "Light"]) {
    const root = register(figma.createAutoLayout("VERTICAL"));
    root.name = REVIEW_PREFIX + mode;
    root.resize(1360, 1);
    root.layoutSizingHorizontal = "FIXED";
    root.layoutSizingVertical = "HUG";
    root.paddingTop = 40;
    root.paddingBottom = 40;
    root.paddingLeft = 40;
    root.paddingRight = 40;
    root.itemSpacing = 24;
    root.fills = [solid("background", mode)];
    root.clipsContent = false;
    root.setExplicitVariableModeForCollection(colorCollection, modes[mode]);
    root.x =
      Math.max(
        0,
        ...page.children
          .filter((node) => node.id !== root.id)
          .map((node) => node.x + node.width),
      ) + 180;
    root.y = 80;
    await text(
      root,
      "Heading",
      "Button · Shapes, finishes & states · " + mode,
      24,
      "foreground",
      "bold",
    );
    await text(
      root,
      "Scope",
      "9 shape/size specimens · 15 appearance states · 3 existing loading/icon addons",
      13,
      "muted-foreground",
    );
    for (const shape of Object.keys(SHAPES)) {
      const group = row(root, "Shapes / " + shape);
      for (const size of ["Small", "Medium", "Large"]) {
        const instance = specimen(
          group,
          variant(shapes, { Shape: shape, Size: size }),
          mode,
          {
            [keys.label]: shape + " / " + SIZES[size].source,
            [keys.showIcon]: size === "Large",
          },
        );
        await primaryFinish(instance, mode);
      }
    }
    for (const state of ["Default", "Hover", "Disabled"]) {
      const group = row(root, "Appearance / " + state);
      for (const appearance of LEDGER.appearance.axes.Appearance) {
        const instance = specimen(
          group,
          variant(masters.appearance, { Appearance: appearance, State: state }),
          mode,
          { "Label#97:0": appearance + " / " + state },
        );
        if (appearance === "Gradient")
          await primaryFinish(
            instance,
            mode,
            state === "Disabled",
            state === "Hover",
          );
      }
    }
    const addonRow = row(root, "Existing addons / loading & icon sizes");
    for (const kind of ["Loading", "Icon", "Small icon"]) {
      const instance = specimen(addonRow, addonVariants[kind], mode);
      instance.name = "Existing " + kind + " / Button source";
      await primaryFinish(instance, mode, kind === "Loading");
      instance.resize(
        kind === "Loading" ? instance.width : kind === "Small icon" ? 32 : 42,
        kind === "Small icon" ? 32 : 42,
      );
    }
    const buttonExamples = root.children
      .filter((child) => child.type === "FRAME")
      .reduce(
        (count, group) =>
          count +
          group.children.filter((child) => child.type === "INSTANCE").length,
        0,
      );
    requireCondition(
      buttonExamples === 27 && buttonExamples <= 30,
      "Review matrix exceeds its verified scope",
    );
    reviewFrames.push({
      id: root.id,
      mode,
      width: root.width,
      height: root.height,
      buttonExamples,
    });
  }
  return boundedResult({
    status: "prepared-needs-owner-visual-validation",
    fileKey: FILE_KEY,
    pageId: PAGE_ID,
    createdNodeIds: [...created],
    mutatedNodeIds: [...mutated].filter((id) => !created.has(id)),
    createdStyleIds: [],
    mutatedStyleIds: [],
    components: { [SHAPES_NAME]: shapeRecord(shapes, keys) },
    existingAppearance: {
      setId: "97:655",
      defaultId: "97:625",
      label: "Label#97:0",
      variants: 15,
      gradientStatesRefreshed: 3,
    },
    reusedMasters: Object.values(LEDGER).map((spec) => ({
      name: spec.name,
      setId: spec.id,
      defaultId: spec.defaultId,
    })),
    iconMasterId: iconMaster.id,
    sourceContract: { shapes: SHAPES, sizes: SIZES, defaults: SOURCE_DEFAULTS },
    modeAwareControlStyles: Object.fromEntries(
      Object.entries(styles).map(([mode, values]) => [mode, values.control.id]),
    ),
    dependencies: {
      colorCollectionId: colorCollection.id,
      dimensionCollectionId: dimensionCollection.id,
      modeIds: modes,
      variableIds: Object.fromEntries(
        Object.entries(tokens).map(([role, variable]) => [role, variable.id]),
      ),
      styleIds: Object.fromEntries(
        Object.entries(styles).map(([mode, values]) => [
          mode,
          { control: values.control.id, soft: values.soft.id },
        ]),
      ),
      textStyleId: controlTextStyle.id,
      addonVariantIds: Object.fromEntries(
        Object.entries(addonVariants).map(([kind, component]) => [
          kind,
          component.id,
        ]),
      ),
    },
    loadedFonts: [...fontSet.values()],
    reviewFrames,
    limits: [
      "Owner execution and screenshots are still required; preparation is not a native visual audit.",
      "The existing non-gradient appearance and loading/icon masters retain their owner-authored structure.",
      "Native loading/hover specimens are static; browser accessibility, focus and interaction require source QA.",
      "Refresh the embedded source defaults if the owner's pure configuration changes.",
    ],
  });
} catch (error) {
  return boundedResult({
    status:
      stage === "preflight"
        ? "needs-prerequisites"
        : "execution-stopped-needs-owner-inspection",
    stage,
    reason: String(error.message).slice(0, 1200),
    fileKey: FILE_KEY,
    pageId: PAGE_ID,
    createdNodeIds: [...created],
    mutatedNodeIds: [...mutated].filter((id) => !created.has(id)),
    createdStyleIds: [],
    mutatedStyleIds: [],
  });
}
