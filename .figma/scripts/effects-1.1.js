// Standalone use_figma Plugin API body. Owner executes and visually validates.
// Native components only; no UI raster, imports, or master mutations.
const VIEW = {
  "key": "effects",
  "name": "Effects & Shaders · 1.1 · Dark",
  "header": "Effects & shaders",
  "eyebrow": "Effect gallery · a little energy",
  "title": "Interfaces with a pulse.",
  "description": "Six considered recipes for light, depth, and interaction. Tune the details, then take the complete code.",
  "actionWidth": 158,
  "actions": [
    {
      "label": "Open the studio",
      "width": 158,
      "appearance": "Gradient"
    }
  ],
  "source": {
    "route": "/en/effects/",
    "theme": "dark",
    "viewport": {
      "width": 1440,
      "height": 1000
    },
    "canonical": "src/components/templates/appearance-gallery.tsx",
    "browserReference": "/tmp/aureform-ui-integration-Y0Rdcz/interaction-qa/effects-full-dark-1440.png"
  }
};
const PALETTES = [
  {
    "id": "aurora",
    "name": "Aurora",
    "collectionId": "VariableCollectionId:2:36",
    "darkMode": "2:2",
    "story": "Electric optimism. A bright beginning."
  },
  {
    "id": "violet",
    "name": "Violet",
    "collectionId": "VariableCollectionId:95:317",
    "darkMode": "95:1",
    "story": "A little mystery. A lot of confidence."
  },
  {
    "id": "ocean",
    "name": "Ocean",
    "collectionId": "VariableCollectionId:95:381",
    "darkMode": "95:3",
    "story": "Clarity, in every direction."
  },
  {
    "id": "mint",
    "name": "Mint",
    "collectionId": "VariableCollectionId:95:445",
    "darkMode": "95:5",
    "story": "Fresh thinking. Lasting energy."
  },
  {
    "id": "ember",
    "name": "Ember",
    "collectionId": "VariableCollectionId:95:509",
    "darkMode": "95:7",
    "story": "A spark worth following."
  },
  {
    "id": "rose",
    "name": "Rose",
    "collectionId": "VariableCollectionId:95:573",
    "darkMode": "95:9",
    "story": "Warmth with a creative edge."
  }
];
const SVG_ICONS = {
  "download": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 15V3\"/><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m7 10 5 5 5-5\"/></svg>",
  "chevron-down": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"m6 9 6 6 6-6\"/></svg>",
  "paintbrush-2": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M10 2v2\"/><path d=\"M14 2v4\"/><path d=\"M17 2a1 1 0 0 1 1 1v9H6V3a1 1 0 0 1 1-1z\"/><path d=\"M6 12a1 1 0 0 0-1 1v1a2 2 0 0 0 2 2h2a1 1 0 0 1 1 1v2.9a2 2 0 1 0 4 0V17a1 1 0 0 1 1-1h2a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1\"/></svg>",
  "rotate-ccw": "<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/></svg>"
};
const DEFAULT_APPEARANCE = {
  "version": 1,
  "theme": "dark",
  "palette": "aurora",
  "colors": {
    "primary": "#8B5CF6",
    "secondary": "#22D3EE",
    "tertiary": "#34D399"
  },
  "material": "elevated",
  "radius": 16,
  "density": "comfortable",
  "typography": "modern",
  "motion": "expressive",
  "hover": "glow",
  "shadow": 0.65,
  "border": 0.55,
  "gradient": {
    "kind": "mesh",
    "angle": 125,
    "intensity": 0.65,
    "stops": [
      {
        "color": "#8B5CF6",
        "position": 0
      },
      {
        "color": "#22D3EE",
        "position": 0.5
      },
      {
        "color": "#34D399",
        "position": 1
      }
    ]
  },
  "shader": {
    "kind": "aurora",
    "speed": 0.2,
    "scale": 1,
    "intensity": 0.55,
    "paused": false
  }
};
const APPEARANCE_JSON = "{\n  \"version\": 1,\n  \"theme\": \"dark\",\n  \"palette\": \"aurora\",\n  \"colors\": {\n    \"primary\": \"#8B5CF6\",\n    \"secondary\": \"#22D3EE\",\n    \"tertiary\": \"#34D399\"\n  },\n  \"material\": \"elevated\",\n  \"radius\": 16,\n  \"density\": \"comfortable\",\n  \"typography\": \"modern\",\n  \"motion\": \"expressive\",\n  \"hover\": \"glow\",\n  \"shadow\": 0.65,\n  \"border\": 0.55,\n  \"gradient\": {\n    \"kind\": \"mesh\",\n    \"angle\": 125,\n    \"intensity\": 0.65,\n    \"stops\": [\n      {\n        \"color\": \"#8B5CF6\",\n        \"position\": 0\n      },\n      {\n        \"color\": \"#22D3EE\",\n        \"position\": 0.5\n      },\n      {\n        \"color\": \"#34D399\",\n        \"position\": 1\n      }\n    ]\n  },\n  \"shader\": {\n    \"kind\": \"aurora\",\n    \"speed\": 0.2,\n    \"scale\": 1,\n    \"intensity\": 0.55,\n    \"paused\": false\n  }\n}";
const SHADE_VALUES = {
  "primary": {
    "50": "#EFE9FE",
    "100": "#E4D9FD",
    "200": "#CEBAFB",
    "300": "#B89BF9",
    "400": "#A17BF8",
    "500": "#8B5CF6",
    "600": "#724CCB",
    "700": "#593DA1",
    "800": "#412D76",
    "900": "#281E4C",
    "950": "#1B1636"
  },
  "secondary": {
    "50": "#E1F9FD",
    "100": "#CCF5FB",
    "200": "#A2ECF8",
    "300": "#77E4F5",
    "400": "#4DDBF1",
    "500": "#22D3EE",
    "600": "#1DADC5",
    "700": "#17889C",
    "800": "#126273",
    "900": "#0D3D4A",
    "950": "#0A2A35"
  },
  "tertiary": {
    "50": "#E4F9F1",
    "100": "#D0F5E7",
    "200": "#A9ECD4",
    "300": "#82E4C0",
    "400": "#5BDBAD",
    "500": "#34D399",
    "600": "#2BAD80",
    "700": "#238866",
    "800": "#1A624D",
    "900": "#113D34",
    "950": "#0D2A27"
  }
};
const WEEKLY_DATA = [
  {
    "label": "Mon",
    "value": 28,
    "secondary": 22
  },
  {
    "label": "Tue",
    "value": 42,
    "secondary": 30
  },
  {
    "label": "Wed",
    "value": 38,
    "secondary": 34
  },
  {
    "label": "Thu",
    "value": 67,
    "secondary": 43
  },
  {
    "label": "Fri",
    "value": 61,
    "secondary": 50
  },
  {
    "label": "Sat",
    "value": 82,
    "secondary": 58
  },
  {
    "label": "Sun",
    "value": 96,
    "secondary": 67
  }
];
const MOMENTUM_DATA = [
  {
    "label": "Mon",
    "value": 28
  },
  {
    "label": "Tue",
    "value": 42
  },
  {
    "label": "Wed",
    "value": 36
  },
  {
    "label": "Thu",
    "value": 64
  },
  {
    "label": "Fri",
    "value": 82
  }
];
// Shared source embedded in each standalone builder. No imports or canvas capture.
const createdNodeIds = new Set();
const mutatedNodeIds = new Set();
const removedNodeIds = new Set();
const sourceBindings = [];
const dependencies = {
  shell: "30:969", sidebar: "29:143", heading: "29:142",
  button: "97:655", badge: "97:666", card: "97:715",
  input: "3:125", select: "15:79", slider: "15:45",
  metric: "3:150", chart: "23:501",
  gradient: "104:734", shader: "104:766",
  spotlight: "104:767", glow: "104:778", tilt: "104:787",
  magnetic: "104:798", arrow: "3:2", sparkles: "9:15",
};
const [page, entries, variables, collections, textStyles, paintStyles, availableFonts] =
  await Promise.all([
    figma.getNodeByIdAsync("2:6"),
    Promise.all(Object.entries(dependencies).map(async ([key, id]) =>
      [key, await figma.getNodeByIdAsync(id)])),
    figma.variables.getLocalVariablesAsync(),
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.getLocalTextStylesAsync(),
    figma.getLocalPaintStylesAsync(),
    figma.listAvailableFontsAsync(),
  ]);
if (!page || page.type !== "PAGE") throw new Error("Suite page 2:6 is unavailable.");
await figma.setCurrentPageAsync(page); // Exactly once, before any child traversal.
const masters = Object.fromEntries(entries);
for (const [key, node] of entries) {
  if (!node || !["COMPONENT", "COMPONENT_SET"].includes(node.type)) {
    throw new Error(`Missing native dependency ${key}: ${dependencies[key]}`);
  }
}
function variant(key, axes = {}) {
  const node = masters[key];
  if (node.type === "COMPONENT") return node;
  const candidate = node.children.find(child => child.type === "COMPONENT" &&
    Object.entries(axes).every(([axis, value]) =>
      child.variantProperties?.[axis] === value ||
      child.name.split(",").some(part => part.trim() === `${axis}=${value}`)));
  if (!candidate) throw new Error(`Missing ${key} variant: ${JSON.stringify(axes)}`);
  return candidate;
}
const mainSlot = masters.sidebar.findOne(node => node.type === "SLOT" &&
  (node.name === "Content" || Object.values(node.componentPropertyReferences || {})
    .includes("Content#30:0")));
if (!mainSlot) throw new Error("Sidebar 29:143 must expose its native Content slot.");
if (!mainSlot.children.some(node => node.name === "Page content")) {
  throw new Error("Native Content slot must contain the declared Page content fixture.");
}
const colorsById = new Map(variables.map(variable => [variable.id, variable]));
const dimension = Object.fromEntries(variables
  .filter(variable => variable.variableCollectionId === "VariableCollectionId:2:58")
  .map(variable => [variable.name, variable]));
const paletteById = Object.fromEntries(PALETTES.map(palette => {
  const collection = collections.find(item => item.id === palette.collectionId);
  if (!collection || !collection.modes.some(mode => mode.modeId === palette.darkMode)) {
    throw new Error(`Missing ${palette.name} color collection or Dark mode.`);
  }
  const roles = Object.fromEntries(variables
    .filter(variable => variable.variableCollectionId === palette.collectionId)
    .map(variable => [variable.name, variable]));
  for (const role of ["background", "surface", "foreground", "muted-foreground",
    "primary", "primary-foreground", "accent", "accent-foreground", "border"]) {
    if (!roles[`color/${role}`]) throw new Error(`${palette.name}: missing ${role}`);
  }
  for (const role of ["primary", "secondary", "tertiary"]) {
    if (!roles[`brand/${role}`]) throw new Error(`${palette.name}: missing brand/${role}`);
  }
  return [palette.id, { ...palette, collection, roles }];
}));
for (const token of ["spacing/2", "spacing/3", "spacing/4", "spacing/5",
  "spacing/6", "spacing/8", "radius/md", "radius/lg", "radius/full"]) {
  if (!dimension[token]) throw new Error(`Missing dimension variable: ${token}`);
}
const font = {};
for (const weight of ["Regular", "Medium", "SemiBold", "Bold"]) {
  const match = availableFonts.find(item => item.fontName.family === "Manrope" &&
    item.fontName.style.replace(/\s/g, "").toLowerCase() === weight.toLowerCase());
  if (!match) throw new Error(`Manrope ${weight} is unavailable.`);
  font[weight] = match.fontName;
}
const fontsToLoad = new Map(Object.values(font).map(name =>
  [`${name.family}/${name.style}`, name]));
for (const master of Object.values(masters)) {
  for (const text of master.findAllWithCriteria({ types: ["TEXT"] })) {
    const names = text.fontName === figma.mixed
      ? text.getRangeAllFontNames(0, text.characters.length) : [text.fontName];
    for (const name of names) fontsToLoad.set(`${name.family}/${name.style}`, name);
  }
}
await Promise.all([...fontsToLoad.values()].map(name => figma.loadFontAsync(name)));
const previous = page.children.find(node => node.name === VIEW.name);
if (previous) {
  if (previous.placeholder) {
    throw new Error(`An unfinished ${VIEW.name} wrapper already exists: ${previous.id}. Inspect it before retrying.`);
  }
  return await report(previous, "existing");
}
const root = figma.createAutoLayout("HORIZONTAL");
createdNodeIds.add(root.id);
root.name = VIEW.name;
root.resize(1440, 100);
root.fills = [solid("background")];
root.itemSpacing = 0;
root.clipsContent = false;
root.placeholder = true;
page.appendChild(root); // Root exists before any view children.
mutatedNodeIds.add(page.id);
root.layoutSizingHorizontal = "FIXED";
root.layoutSizingVertical = "HUG";
root.x = Math.max(0, ...page.children.filter(node => node.id !== root.id)
  .map(node => node.x + node.width)) + 160;
root.y = 80;
for (const palette of Object.values(paletteById)) {
  root.setExplicitVariableModeForCollection(palette.collection, palette.darkMode);
}
const backdrops = [];
function remember(node) {
  createdNodeIds.add(node.id);
  if ("findAll" in node) for (const child of node.findAll()) createdNodeIds.add(child.id);
  return node;
}
function solid(role, palette = "aurora", opacity = 1) {
  const key = role.startsWith("brand/") || role.startsWith("shade/") ? role : `color/${role}`;
  const variable = paletteById[palette]?.roles[key];
  if (!variable) throw new Error(`Missing color binding ${palette}:${key}`);
  return figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.2 }, opacity }, "color", variable);
}
function token(node, field, name, fallback) {
  node[field] = fallback;
  if (dimension[name]) node.setBoundVariable(field, dimension[name]);
}
function gap(node, value) {
  token(node, "itemSpacing", `spacing/${value / 4}`, value);
}
function padding(node, value) {
  for (const field of ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"]) {
    token(node, field, `spacing/${value / 4}`, value);
  }
}
function radius(node, name = "lg") {
  node.cornerRadius = name === "full" ? 999 : name === "md" ? 10.4 : 16;
  for (const field of ["topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius"]) {
    node.setBoundVariable(field, dimension[`radius/${name}`]);
  }
}
function frame(parent, name, width, options = {}) {
  const node = remember(figma.createAutoLayout(options.flow || "VERTICAL"));
  node.name = name;
  node.resize(width || parent.width, options.height || 100);
  node.fills = options.role ? [solid(options.role, options.palette || "aurora", options.opacity ?? 1)] : [];
  node.clipsContent = options.clip || false;
  gap(node, options.gap ?? 0);
  padding(node, options.padding ?? 0);
  parent.appendChild(node);
  node.layoutSizingHorizontal = width ? "FIXED" : "FILL";
  node.layoutSizingVertical = options.height ? "FIXED" : "HUG";
  if (options.radius) radius(node, options.radius);
  if (options.border) { node.strokes = [solid("border", options.palette || "aurora")]; node.strokeWeight = 1; }
  return node;
}
function text(parent, characters, size = 13, options = {}) {
  const node = remember(figma.createText());
  node.name = options.name || characters.slice(0, 48);
  const styleName = size >= 28 ? "Display" : size >= 16 ? "Card title"
    : size <= 11 ? "Label" : options.weight === "SemiBold" ? "Control" : "Body small";
  const style = textStyles.find(item => item.name === `Aureform/${styleName}` &&
    item.fontName.family === "Manrope");
  if (style) node.textStyleId = style.id;
  node.fontName = font[options.weight || "Regular"];
  node.fontSize = size;
  node.lineHeight = { unit: "PIXELS", value: options.lineHeight || Math.round(size * 1.5) };
  node.letterSpacing = { unit: "PERCENT", value: options.tracking ?? (size >= 24 ? -3.5 : 0) };
  node.characters = characters;
  node.fills = [solid(options.role || "foreground", options.palette || "aurora", options.opacity ?? 1)];
  parent.appendChild(node);
  if (options.width !== undefined) {
    node.textAutoResize = "HEIGHT";
    node.resize(options.width, Math.max(1, node.height));
    node.layoutSizingHorizontal = "FIXED";
  } else {
    node.textAutoResize = "WIDTH_AND_HEIGHT";
    node.layoutSizingHorizontal = "HUG";
  }
  node.layoutSizingVertical = "HUG";
  if (options.align) node.textAlignHorizontal = options.align;
  return node;
}
function normalizeFonts(instance) {
  for (const node of instance.findAllWithCriteria({ types: ["TEXT"] })) {
    const current = node.fontName === figma.mixed ? null : node.fontName;
    const name = (current?.style || "Regular").replace(/\s/g, "").toLowerCase();
    node.fontName = font[name.includes("semibold") ? "SemiBold"
      : name.includes("bold") ? "Bold" : name.includes("medium") ? "Medium" : "Regular"];
    mutatedNodeIds.add(node.id);
  }
}
function remapAlias(alias, palette) {
  if (!alias || alias.type !== "VARIABLE_ALIAS") return alias;
  const source = colorsById.get(alias.id);
  const target = source && paletteById[palette].roles[source.name];
  return target ? { type: "VARIABLE_ALIAS", id: target.id } : alias;
}
function recolor(instance, palette) {
  for (const node of [instance, ...instance.findAll()]) {
    for (const field of ["fills", "strokes"]) {
      if (!(field in node) || !Array.isArray(node[field])) continue;
      node[field] = node[field].map(paint => {
        if (paint.type === "SOLID" && paint.boundVariables?.color) {
          const alias = remapAlias(paint.boundVariables.color, palette);
          const variable = colorsById.get(alias.id);
          return variable ? figma.variables.setBoundVariableForPaint(paint, "color", variable) : paint;
        }
        if (paint.type.startsWith("GRADIENT") && paint.gradientStops) {
          return { ...paint, gradientStops: paint.gradientStops.map(stop => ({
            ...stop, ...(stop.boundVariables?.color ? { boundVariables: {
              color: remapAlias(stop.boundVariables.color, palette),
            } } : {}),
          })) };
        }
        if (paint.type === "SHADER") return { ...paint, properties: Object.fromEntries(
          Object.entries(paint.properties || {}).map(([key, value]) => [key, remapAlias(value, palette)])) };
        return paint;
      });
      mutatedNodeIds.add(node.id);
    }
  }
}
function instance(parent, key, width, height, axes = {}, properties = {}, palette = "aurora") {
  const node = remember(variant(key, axes).createInstance());
  parent.appendChild(node);
  node.resize(width, height);
  node.layoutSizingHorizontal = "FIXED";
  node.layoutSizingVertical = "FIXED";
  normalizeFonts(node);
  if (Object.keys(properties).length) {
    for (const key of Object.keys(properties)) {
      if (!(key in node.componentProperties)) throw new Error(`${node.name}: missing property ${key}`);
    }
    node.setProperties(properties);
    mutatedNodeIds.add(node.id);
  }
  if (palette !== "aurora") recolor(node, palette);
  return node;
}
function background(parent, key, axes = {}, palette = "aurora", properties = {}) {
  const node = instance(parent, key, parent.width, Math.max(1, parent.height), axes, properties, palette);
  parent.insertChild(0, node);
  node.name = `${key} / native material`;
  node.layoutPositioning = "ABSOLUTE";
  node.x = 0; node.y = 0;
  node.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
  if (key === "card") for (const child of node.children) { child.visible = false; mutatedNodeIds.add(child.id); }
  else for (const child of node.findAllWithCriteria({ types: ["TEXT"] })) {
    child.visible = false; mutatedNodeIds.add(child.id);
  }
  backdrops.push({ parent, node });
  return node;
}
function card(parent, name, width, options = {}) {
  const node = frame(parent, name, width, { gap: options.gap ?? 16,
    padding: options.padding ?? 20, radius: "lg", clip: true, ...options });
  background(node, "card", { Appearance: options.material || "Elevated", State: "Default" },
    options.palette || "aurora", { "Title#97:22": name });
  return node;
}
function button(parent, label, width, options = {}) {
  const node = instance(parent, "button", width, options.height || 42,
    { Appearance: options.appearance || "Outline", State: "Default" },
    { "Label#97:0": label }, options.palette || "aurora");
  node.name = `${label} / ButtonAppearance`;
  for (const labelNode of node.findAllWithCriteria({ types: ["TEXT"] })) {
    labelNode.fontSize = options.size || 12;
    if (options.role) labelNode.fills = [solid(options.role, options.palette || "aurora")];
  }
  if (options.ghost) { node.fills = []; node.strokes = []; node.effects = []; }
  return node;
}
function badge(parent, label, options = {}) {
  return instance(parent, "badge", options.width || Math.max(54, label.length * 6.2 + 20), 26,
    { Appearance: options.appearance || "Soft" }, { "Label#97:16": label }, options.palette || "aurora");
}
function input(parent, value, width, palette = "aurora") {
  return instance(parent, "input", width, 42, {}, { "Value#3:90": value }, palette);
}
function select(parent, label, value, width) {
  const group = frame(parent, label, width, { gap: 8 });
  text(group, label, 11, { weight: "Medium" });
  instance(group, "select", width, 42, {}, { "Label#15:11": value });
  return group;
}
function tabs(parent, labels, width, active = 0) {
  const row = frame(parent, labels.join(" / "), width, { flow: "HORIZONTAL",
    padding: 4, gap: 4, role: "surface-subtle", radius: "md" });
  labels.forEach((label, index) => button(row, label,
    (width - 8 - (labels.length - 1) * 4) / labels.length,
    { height: 32, size: 10, appearance: index === active ? "Soft" : "Outline", ghost: index !== active }));
  return row;
}
function icon(parent, name, size = 16, role = "muted-foreground") {
  if (masters[name]) return instance(parent, name, size, size);
  const svg = SVG_ICONS[name];
  if (!svg) throw new Error(`Missing source icon ${name}`);
  const node = remember(figma.createNodeFromSvg(svg));
  node.name = `icon/${name}`;
  parent.appendChild(node);
  node.resize(size, size);
  node.layoutSizingHorizontal = "FIXED"; node.layoutSizingVertical = "FIXED";
  for (const child of node.findAll()) {
    for (const field of ["fills", "strokes"]) if (field in child && Array.isArray(child[field])) {
      child[field] = child[field].map(paint =>
        paint.type === "SOLID" ? solid(role) : paint);
    }
  }
  return node;
}
function colorDot(parent, role, palette = "aurora", size = 16) {
  const node = remember(figma.createEllipse());
  parent.appendChild(node); node.resize(size, size);
  node.fills = [solid(role, palette)];
  node.layoutSizingHorizontal = "FIXED"; node.layoutSizingVertical = "FIXED";
  return node;
}
function palettePicker(parent, width) {
  const group = frame(parent, "Color palette", width, { gap: 8 });
  text(group, "Color palette", 12, { weight: "Medium" });
  for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
    const row = frame(group, "Palette choices", width, { flow: "HORIZONTAL", gap: 8 });
    PALETTES.slice(rowIndex * 3, rowIndex * 3 + 3).forEach(palette => {
      const choice = frame(row, palette.name, (width - 16) / 3,
        { gap: 8, padding: 10, radius: "lg", height: 72 });
      background(choice, "button", { Appearance: palette.id === "aurora" ? "Soft" : "Outline", State: "Default" });
      for (const label of choice.children[0].findAllWithCriteria({ types: ["TEXT"] })) label.visible = false;
      const strip = frame(choice, `${palette.name} colors`, choice.width - 20,
        { flow: "HORIZONTAL", height: 20, clip: true, radius: "md" });
      ["primary", "secondary", "tertiary"].forEach(role => {
        const swatch = remember(figma.createRectangle());
        strip.appendChild(swatch); swatch.resize(strip.width / 3, 20);
        swatch.fills = [solid(`brand/${role}`, palette.id)];
        swatch.layoutSizingHorizontal = "FIXED"; swatch.layoutSizingVertical = "FIXED";
      });
      text(choice, palette.name, 10);
    });
  }
  return group;
}
function range(parent, label, display, width, value) {
  const group = frame(parent, label, width, { gap: 4 });
  const line = frame(group, `${label} label`, width, { flow: "HORIZONTAL", gap: 12 });
  line.primaryAxisAlignItems = "SPACE_BETWEEN";
  text(line, label, 11, { weight: "Medium" });
  text(line, display, 10, { role: "muted-foreground" });
  const slider = instance(group, "slider", width, 36);
  sourceBindings.push({ nodeId: slider.id, kind: "slider", label, value });
  const thumb = slider.findOne(node => /^(thumb|knob|handle)$/i.test(node.name));
  const fill = slider.findOne(node => /^(active track|track fill|progress|fill)$/i.test(node.name));
  if (fill && "resize" in fill) { fill.resize(Math.max(1, width * value), fill.height); mutatedNodeIds.add(fill.id); }
  if (thumb && "x" in thumb) { thumb.x = (width - thumb.width) * value; mutatedNodeIds.add(thumb.id); }
  return group;
}
function disclosure(parent, width, filename) {
  const group = frame(parent, "React example", width, { padding: 16, gap: 12 });
  sourceBindings.push({ nodeId: group.id, kind: "download", filename });
  const row = frame(group, "Code actions", width - 32, { flow: "HORIZONTAL", gap: 8 });
  button(row, "Copy full React code", width - 80, { height: 40, size: 11 });
  const download = frame(row, "Download React example", 32, { height: 40 });
  download.counterAxisAlignItems = "CENTER"; download.primaryAxisAlignItems = "CENTER";
  icon(download, "download", 16);
  const summary = frame(group, "View complete example", width - 32, { flow: "HORIZONTAL", height: 36 });
  summary.primaryAxisAlignItems = "SPACE_BETWEEN"; summary.counterAxisAlignItems = "CENTER";
  text(summary, "View complete example", 10, { role: "muted-foreground" });
  icon(summary, "chevron-down", 14);
  return group;
}
const shell = instance(root, "sidebar", 1440, 1000);
shell.name = "SidebarDashboardShellNative / Sidebar";
const contentSlot = shell.findOne(node => node.type === "SLOT" &&
  (node.name === "Content" || Object.values(node.componentPropertyReferences || {}).includes("Content#30:0")));
const fixture = contentSlot.children.find(node => node.name === "Page content");
for (const node of [fixture, ...("findAll" in fixture ? fixture.findAll() : [])]) removedNodeIds.add(node.id);
fixture.remove(); // Only the disposable fixture in this new instance's native slot.
contentSlot.layoutMode = "VERTICAL";
contentSlot.itemSpacing = 0;
padding(contentSlot, 0);
const header = contentSlot.findOne(node => node.type === "INSTANCE" &&
  "Page title#29:0" in node.componentProperties);
if (!header) throw new Error("The native shell header is missing its Page title property.");
header.setProperties({ "Page title#29:0": VIEW.header });
header.resize(1184, 73);
mutatedNodeIds.add(header.id);
const headerAppearance = header.findOne(node => node.type === "TEXT" &&
  /^(Theme|Appearance|Customize)$/i.test(node.characters));
if (headerAppearance) { headerAppearance.characters = "Appearance"; mutatedNodeIds.add(headerAppearance.id); }
const body = frame(contentSlot, "Page content", 1184, { padding: 32, gap: 24 });
const heroStyle = paintStyles.find(style => style.name === "Aureform/Gradient/Dark/hero");
if (!heroStyle) throw new Error("Missing the existing Aureform Dark hero paint style.");
body.fillStyleId = heroStyle.id;
const headingRow = frame(body, "Page heading and actions", 1120,
  { flow: "HORIZONTAL", gap: 20 });
headingRow.counterAxisAlignItems = "MAX";
const headingWidth = 1120 - VIEW.actionWidth - 20;
const heading = instance(headingRow, "heading", headingWidth, 112, { Style: "Standard" }, {
  "Eyebrow#29:1": VIEW.eyebrow.toUpperCase(),
  "Title#29:4": VIEW.title,
  "Description#29:7": VIEW.description,
});
heading.layoutSizingVertical = "HUG";
for (const node of heading.findAllWithCriteria({ types: ["TEXT"] })) {
  const property = node.componentPropertyReferences?.characters;
  const isTitle = property === "Title#29:4" || node.characters === VIEW.title;
  const isEyebrow = property === "Eyebrow#29:1" || node.characters === VIEW.eyebrow.toUpperCase();
  node.fontName = font[isTitle || isEyebrow ? "SemiBold" : "Regular"];
  node.fontSize = isTitle ? 36 : isEyebrow ? 11 : 14;
  node.lineHeight = { unit: "PIXELS", value: isTitle ? 41.4 : isEyebrow ? 20 : 28 };
  node.letterSpacing = { unit: "PERCENT", value: isTitle ? -3.5 : isEyebrow ? 10 : 0 };
  node.fills = [solid(isEyebrow ? "primary" : isTitle ? "foreground" : "muted-foreground")];
  node.textAutoResize = "HEIGHT";
  node.resize(isTitle || isEyebrow ? headingWidth : Math.min(672, headingWidth), Math.max(1, node.height));
  node.layoutSizingHorizontal = "FIXED";
  mutatedNodeIds.add(node.id);
}
const actions = frame(headingRow, "Page actions", VIEW.actionWidth, { flow: "HORIZONTAL", gap: 8 });
for (const action of VIEW.actions) button(actions, action.label, action.width,
  { height: 32, appearance: action.appearance, ghost: action.ghost });
function finish() {
  // Recompute native backdrops after HUG layouts have their complete content.
  for (const { parent, node } of backdrops) {
    node.resize(Math.max(1, parent.width), Math.max(1, parent.height));
  }
  const fullHeight = Math.max(1000, header.height + body.height);
  shell.resize(1440, fullHeight);
  contentSlot.resize(1184, fullHeight);
  const sidebar = shell.children.find(node => node.id !== contentSlot.id &&
    node.type === "INSTANCE");
  if (sidebar) {
    sidebar.resize(256, 1000);
    sidebar.layoutSizingVertical = "FIXED";
    mutatedNodeIds.add(sidebar.id);
  }
  root.placeholder = false;
}
function packAffectedIds(created, mutated, removed) {
  const ids = [...new Set([...created, ...mutated, ...removed])], groups = new Map(), literals = [];
  const maskOf = id => (created.has(id) ? 1 : 0) | (mutated.has(id) ? 2 : 0) | (removed.has(id) ? 4 : 0);
  for (const id of ids) {
    const match = /^([A-Za-z0-9;:_-]*:)(0|[1-9]\d*)$/.exec(id);
    if (!match || !Number.isSafeInteger(Number(match[2]))) { literals.push([maskOf(id), id]); continue; }
    const prefix = match[1], key = maskOf(id) + ',' + prefix;
    if (!groups.has(key)) groups.set(key, { mask: maskOf(id), prefix, values: [] });
    groups.get(key).values.push(Number(match[2]));
  }
  const prefixes = [...new Set([...groups.values()].map(g => g.prefix))].sort();
  let previous = '';
  const prefixesFrontCodedCSV = prefixes.map(prefix => {
    let common = 0;
    while (common < Math.min(previous.length, prefix.length) && previous[common] === prefix[common]) common++;
    const row = common + ',' + prefix.slice(common); previous = prefix; return row;
  }).join('\n');
  const rangesCSV = [...groups.values()].map(group => {
    const values = group.values.sort((a, b) => a - b), runs = [];
    for (let i = 0; i < values.length; i++) {
      const start = values[i]; let end = start;
      while (i + 1 < values.length && values[i + 1] === end + 1) end = values[++i];
      runs.push(start === end ? String(start) : start + '-' + end);
    }
    return group.mask + ',' + prefixes.indexOf(group.prefix) + ',' + runs.join(';');
  }).join('\n');
  return { encoding: 'observed-prefix-ranges-v1', categoryBits: { created: 1, mutated: 2, removed: 4 },
    counts: { created: created.size, mutated: mutated.size, removed: removed.size, unique: ids.length },
    prefixesFrontCodedCSV, rangesCSV, literalsJSON: JSON.stringify(literals),
    decode: 'Prefix rows: commonPrefixLength,literalSuffix; restore against the previous prefix. Range rows: categoryMask,prefixIndex,semicolon-separated inclusive numeric ranges. Prepend the restored prefix to each observed suffix. literalsJSON contains [mask,exactID]. No IDs are omitted.' };
}

function boundedReturn(result) {
  const bytes = value => encodeURIComponent(JSON.stringify(value))
    .replace(/%[A-F\d]{2}/gi, "x").length;
  result.returnByteCount = bytes(result);
  if (result.returnByteCount <= 18000) return result;
  result.affectedNodeIds = packAffectedIds(createdNodeIds, mutatedNodeIds, removedNodeIds);
  delete result.createdNodeIds;
  delete result.mutatedNodeIds;
  delete result.removedNodeIds;
  result.componentUsage = result.componentUsage.map(({ masterId, instanceIds }) => ({
    masterId, instanceCount: instanceIds.length,
  }));
  result.returnByteCount = bytes(result);
  if (result.returnByteCount > 19000) throw new Error("Lossless native return exceeds safe transport: " + result.returnByteCount);
  return result;
}
async function report(node, status = "created") {
  const nodes = [node, ...node.findAll()];
  const nodeTypes = {};
  for (const child of nodes) nodeTypes[child.type] = (nodeTypes[child.type] || 0) + 1;
  const images = nodes.filter(child => "fills" in child && Array.isArray(child.fills) &&
    child.fills.some(paint => paint.type === "IMAGE"));
  const textNodes = node.findAllWithCriteria({ types: ["TEXT"] });
  const wrongFonts = textNodes.filter(child => child.fontName === figma.mixed ||
    child.fontName.family !== "Manrope").map(child => ({ id: child.id, name: child.name }));
  const components = await Promise.all(node.findAllWithCriteria({ types: ["INSTANCE"] })
    .map(async child => ({ id: child.id, name: child.name,
      mainComponentId: (await child.getMainComponentAsync())?.id || null })));
  return boundedReturn({
    status, rootId: node.id, pageId: "2:6", name: node.name,
    bounds: { x: node.x, y: node.y, width: node.width, height: node.height },
    createdNodeIds: [...createdNodeIds], mutatedNodeIds: [...mutatedNodeIds],
    removedNodeIds: [...removedNodeIds], descendantCount: nodes.length - 1,
    nodeTypes,
    componentUsage: [...new Set(components.map(item => item.mainComponentId).filter(Boolean))]
      .map(masterId => ({ masterId,
        instanceIds: components.filter(item => item.mainComponentId === masterId).map(item => item.id) })),
    reusedMasterIds: [...new Set(components.map(item => item.mainComponentId).filter(Boolean))],
    fontFamilies: [...new Set(textNodes.map(child => child.fontName === figma.mixed ? "mixed" : child.fontName.family))],
    wrongFonts, imageFillCount: images.length,
    imageNodes: images.map(child => ({ id: child.id, name: child.name, type: child.type,
      width: child.width, height: child.height })),
    shaderFillCount: nodes.filter(child => "fills" in child && Array.isArray(child.fills) &&
      child.fills.some(paint => paint.type === "SHADER")).length,
    source: VIEW.source, sourceBindings,
    visualValidation: "Owner must inspect a native composition screenshot after execution.",
  });
}

const options = card(body, "Effect gallery controls", 1120, { material: "Flat" });
const optionRow = frame(options, "Motion and palette", 1080, { flow: "HORIZONTAL", gap: 24 });
const intro = frame(optionRow, "Motion introduction", 708, { gap: 8 });
text(intro, "A signature, in motion.", 14, { weight: "SemiBold" });
text(intro, "Hover, focus, and play. Every recipe responds to your palette and motion choice.", 12,
  { width: 650, lineHeight: 24, role: "muted-foreground" });
select(intro, "Motion across previews", "Expressive · a little more energy", 320);
palettePicker(optionRow, 348);
const recipes = [
  { id: "aurora", title: "Aurora field", description: "Soft ribbons of light, moving at your pace.", category: "Shader",
    key: "shader", axes: { Kind: "Aurora" }, property: "Title#104:25", height: 288,
    ranges: [["Speed", "20%", 0.2], ["Scale", "1×", 0.2], ["Intensity", "55%", 0.55]] },
  { id: "gradient", title: "Prismatic gradient", description: "A wash of color. A precise point of view.", category: "Color",
    key: "gradient", axes: { Kind: "Linear" }, property: "Title#104:21", height: 288,
    ranges: [["Angle", "125°", 125 / 360], ["Intensity", "55%", 0.55]] },
  { id: "spotlight", title: "Spotlight surface", description: "A gentle light that follows your attention.", category: "Pointer",
    key: "spotlight", property: "Title#104:30", height: 298,
    ranges: [["Light intensity", "55%", 0.55], ["Spotlight radius", "320 px", 0.4]] },
  { id: "glow", title: "Luminous edge", description: "A fine line of color, quietly in motion.", category: "Border",
    key: "glow", property: "Title#104:33", height: 288,
    ranges: [["Edge width", "1.5 px", 0.15], ["Orbit duration", "12 s", 0.5]] },
  { id: "tilt", title: "Perspective card", description: "A little dimension for a closer look.", category: "Depth",
    key: "tilt", property: "Title#104:36", height: 288,
    ranges: [["Maximum tilt", "6°", 0.3], ["Perspective", "900 px", 0.45]] },
  { id: "magnetic", title: "Magnetic action", description: "An invitation with a little pull.", category: "Action",
    key: "magnetic", property: "Label#104:39", height: 288,
    ranges: [["Attraction strength", "18%", 0.18], ["Maximum distance", "10 px", 0.25]] },
];
for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
  const row = frame(body, `Effect recipe row ${rowIndex + 1}`, 1120, { flow: "HORIZONTAL", gap: 20 });
  row.counterAxisAlignItems = "MIN";
  for (const [index, recipe] of recipes.slice(rowIndex * 2, rowIndex * 2 + 2).entries()) {
    const article = card(row, recipe.title, 550, { padding: 0, gap: 0, material: "Flat" });
    sourceBindings.push({ nodeId: article.id, kind: "effect", sourceExport: recipe.key });
    const header = frame(article, `${recipe.title} heading`, 550, { padding: 20, gap: 8 });
    text(header, `RECIPE ${String(rowIndex * 2 + index + 1).padStart(2, "0")}`, 8,
      { role: "muted-foreground" });
    text(header, recipe.title, 16, { weight: "SemiBold" });
    text(header, recipe.description, 12, { role: "muted-foreground", width: 480, lineHeight: 24 });
    const preview = frame(article, `${recipe.title} preview`, 550,
      { padding: 16, role: "background" });
    const sample = frame(preview, `${recipe.key} / native effect`, 518,
      { padding: recipe.id === "magnetic" ? 24 : 20, gap: 16, height: recipe.height, radius: "lg", clip: true });
    if (recipe.id === "magnetic") {
      sample.counterAxisAlignItems = "CENTER";
      text(sample, "Follow your curiosity.", 24, { weight: "SemiBold", align: "CENTER" });
      text(sample, "An action that meets you halfway.", 12, { role: "muted-foreground" });
      const magnetic = instance(sample, "magnetic", 256, 48, {},
        { "Label#104:39": "Make your move" });
      magnetic.name = "MagneticButton / working source action";
    } else {
      background(sample, recipe.key, recipe.axes || {}, "aurora", { [recipe.property]: recipe.title });
      if (["aurora", "gradient"].includes(recipe.id)) {
        badge(sample, recipe.id === "aurora" ? "A little atmosphere" : "Color with intention",
          { appearance: "Outline", width: 150 });
        const space = frame(sample, "Atmosphere spacing", 1, { height: 20 });
        space.layoutSizingHorizontal = "FILL";
        text(sample, recipe.id === "aurora" ? "Stay curious." : "A brighter perspective.", 30,
          { weight: "SemiBold", width: 450, lineHeight: 36 });
        text(sample, recipe.id === "aurora" ? "Let a little light lead the way." : "Find a new angle on your next idea.",
          12, { role: "muted-foreground", width: 450 });
        button(sample, recipe.id === "aurora" ? "Pause" : "Explore color",
          recipe.id === "aurora" ? 84 : 130,
          { height: 32, appearance: recipe.id === "aurora" ? "Outline" : "Gradient" });
      } else {
        const top = frame(sample, "Recipe content heading", 478, { flow: "HORIZONTAL" });
        top.primaryAxisAlignItems = "SPACE_BETWEEN"; top.counterAxisAlignItems = "CENTER";
        icon(top, "sparkles", 20, "primary");
        badge(top, "The next chapter", { appearance: "Outline", width: 125 });
        text(sample, "Ideas deserve a little energy.", 20, { weight: "SemiBold", width: 478 });
        text(sample, "Make every interaction feel considered.", 12, { role: "muted-foreground", width: 478 });
        if (recipe.id === "spotlight") {
          text(sample, "Name your idea", 12, { weight: "Medium" });
          input(sample, "Something extraordinary...", 478);
        }
        button(sample, "Take a closer look", 174);
      }
    }
    const tuning = frame(article, `${recipe.title} tuning`, 550, { padding: 20, gap: 20 });
    const tuningHeader = frame(tuning, "Category and reset", 510, { flow: "HORIZONTAL" });
    tuningHeader.primaryAxisAlignItems = "SPACE_BETWEEN"; tuningHeader.counterAxisAlignItems = "CENTER";
    badge(tuningHeader, recipe.category);
    icon(tuningHeader, "rotate-ccw", 16);
    if (recipe.id === "aurora") select(tuning, "Shader type", "Aurora", 510);
    if (recipe.id === "gradient") select(tuning, "Gradient type", "Linear", 510);
    for (const [label, display, value] of recipe.ranges) range(tuning, label, display, 510, value);
    const refine = frame(tuning, "Studio refinement link", 510, { flow: "HORIZONTAL", height: 40 });
    refine.primaryAxisAlignItems = "SPACE_BETWEEN"; refine.counterAxisAlignItems = "CENTER";
    text(refine, "Refine this style in the studio", 12, { role: "primary" });
    icon(refine, "arrow", 16);
    disclosure(article, 550, `aureform-effect-${recipe.id}.tsx`);
  }
}
text(body, "Pointer effects respond to a mouse or trackpad. Keyboard focus stays clear, and reduced motion keeps the composition calm.",
  12, { width: 1120, lineHeight: 24, role: "muted-foreground" });
finish();
return await report(root);
