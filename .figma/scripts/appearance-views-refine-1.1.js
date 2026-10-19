// One owner-leased invocation per view; plain top-level await/return.
// Current native roots and completed build-88953 captures only. No master edits.
const VIEW = "studio";
const plans = {
  studio: {
    root: "134:8412", capture: "138:10024", sidebar: "138:10823", header: "138:10028",
    active: "Appearance Studio", charts: ["138:10632"],
    data: [
      { label: "Mon", value: 32, secondary: 24 },
      { label: "Tue", value: 45, secondary: 31 },
      { label: "Wed", value: 41, secondary: 37 },
      { label: "Thu", value: 68, secondary: 40 },
      { label: "Fri", value: 61, secondary: 51 },
      { label: "Sat", value: 82, secondary: 58 },
      { label: "Sun", value: 96, secondary: 67 },
    ],
  },
  themes: {
    root: "135:8894", capture: "139:10024", sidebar: "139:11165", header: "139:11094",
    active: "Palettes & materials",
    charts: ["139:10159", "139:10320", "139:10481", "139:10642", "139:10803", "139:10964"],
    data: [
      { label: "Mon", value: 28 }, { label: "Tue", value: 42 },
      { label: "Wed", value: 36 }, { label: "Thu", value: 64 }, { label: "Fri", value: 82 },
    ],
  },
  effects: {
    root: "136:9476", capture: "140:10024", sidebar: "140:10804", header: "140:10732",
    active: "Effects", charts: [],
  },
};
const plan = plans[VIEW];
if (!plan) throw new Error("Unknown appearance view.");
figma.skipInvisibleInstanceChildren = false;
const page = await figma.getNodeByIdAsync("2:6");
if (!page || page.type !== "PAGE") throw new Error("Suite page unavailable.");
await figma.setCurrentPageAsync(page);
const created = new Set(), mutated = new Set(), removed = new Set();
const [root, capture, sourceSidebar, sourceHeader, chartSources, assetRows, variables, collections, available] =
  await Promise.all([
    figma.getNodeByIdAsync(plan.root), figma.getNodeByIdAsync(plan.capture),
    figma.getNodeByIdAsync(plan.sidebar), figma.getNodeByIdAsync(plan.header),
    Promise.all(plan.charts.map(id => figma.getNodeByIdAsync(id))),
    Promise.all([["nav", "3:142"], ["button", "97:655"], ["coreButton", "3:113"], ["brand", "9:46"]]
      .map(async ([key, id]) => [key, await figma.getNodeByIdAsync(id)])),
    figma.variables.getLocalVariablesAsync(), figma.variables.getLocalVariableCollectionsAsync(),
    figma.listAvailableFontsAsync(),
  ]);
for (const n of [root, capture, sourceSidebar, sourceHeader, ...chartSources]) {
  if (!n || n.type !== "FRAME") throw new Error("A recorded root/capture/frame is missing.");
}
if (root.parent.id !== page.id || capture.parent.id !== page.id) throw new Error("Unexpected parent page.");
const assets = Object.fromEntries(assetRows);
for (const [key, node] of assetRows) if (!node) throw new Error("Missing native asset " + key);
const byId = new Map(variables.map(v => [v.id, v]));
const modes = {
  aurora: ["VariableCollectionId:2:36", "2:2"], violet: ["VariableCollectionId:95:317", "95:1"],
  ocean: ["VariableCollectionId:95:381", "95:3"], mint: ["VariableCollectionId:95:445", "95:5"],
  ember: ["VariableCollectionId:95:509", "95:7"], rose: ["VariableCollectionId:95:573", "95:9"],
};
const roles = Object.fromEntries(Object.entries(modes).map(([key, [id]]) =>
  [key, Object.fromEntries(variables.filter(v => v.variableCollectionId === id).map(v => [v.name, v]))]));
const dimensions = Object.fromEntries(variables.filter(v => v.variableCollectionId === "VariableCollectionId:2:58")
  .map(v => [v.name, v]));
function tree(n) { return [n, ...("findAll" in n ? n.findAll() : [])]; }
function mark(n) { for (const c of tree(n)) mutated.add(c.id); }
function own(n) { for (const c of tree(n)) created.add(c.id); return n; }
function resolved(v, palette = "aurora", depth = 0) {
  if (!v || depth > 8) return null;
  const c = collections.find(c => c.id === v.variableCollectionId);
  const mode = c.id === modes[palette][0] ? modes[palette][1] : c.defaultModeId;
  const value = v.valuesByMode[mode];
  return value?.type === "VARIABLE_ALIAS" ? resolved(byId.get(value.id), palette, depth + 1) : value;
}
function color(role, palette = "aurora", opacity = 1) {
  const v = roles[palette]["color/" + role] || roles[palette][role];
  if (!v) throw new Error("Missing semantic " + palette + ":" + role);
  return figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity }, "color", v);
}
const fonts = new Map();
const fontAvailable = f => available.some(a => a.fontName.family === f.family && a.fontName.style === f.style);
for (const node of [root, sourceSidebar, sourceHeader, ...chartSources, ...Object.values(assets)]) {
  for (const t of node.findAllWithCriteria({ types: ["TEXT"] })) {
    for (const f of t.fontName === figma.mixed ? t.getRangeAllFontNames(0, t.characters.length) : [t.fontName]) {
      if (fontAvailable(f)) fonts.set(f.family + "/" + f.style, f);
    }
  }
}
const manrope = {};
for (const style of ["Regular", "Medium", "SemiBold", "Bold"]) {
  const f = available.find(f => f.fontName.family === "Manrope" &&
    f.fontName.style.replace(/\s/g, "").toLowerCase() === style.toLowerCase());
  if (!f) throw new Error("Required Manrope font unavailable: " + style);
  manrope[style] = f.fontName; fonts.set(f.fontName.family + "/" + f.fontName.style, f.fontName);
}
await Promise.all([...fonts.values()].map(f => figma.loadFontAsync(f)));
function paletteOf(n) {
  for (let p = n; p && p.id !== root.id; p = p.parent) {
    const m = /^(\w+) \/ AppearanceScope$/.exec(p.name);
    if (m && modes[m[1].toLowerCase()]) return m[1].toLowerCase();
  }
  return "aurora";
}
function remapPaint(p, palette, text = false) {
  if (p.type !== "SOLID") return p;
  if (text) {
    const candidates = ["foreground", "muted-foreground", "primary", "primary-foreground", "accent-foreground"];
    let closest, distance = Infinity;
    for (const role of candidates) {
      const v = roles[palette]["color/" + role], rgb = resolved(v, palette);
      if (!rgb || !("r" in rgb)) continue;
      const d = ["r", "g", "b"].reduce((s, k) => s + (rgb[k] - p.color[k]) ** 2, 0);
      if (d < distance) { distance = d; closest = v; }
    }
    return closest ? figma.variables.setBoundVariableForPaint(p, "color", closest) : p;
  }
  const existing = p.boundVariables?.color && byId.get(p.boundVariables.color.id);
  const exact = existing && roles[palette][existing.name];
  if (exact) return figma.variables.setBoundVariableForPaint(p, "color", exact);
  let closest, distance = Infinity;
  for (const v of Object.values(roles[palette])) {
    if (!v.name.startsWith("color/") && !v.name.startsWith("brand/")) continue;
    const rgb = resolved(v, palette);
    if (!rgb || !("r" in rgb)) continue;
    const d = ["r", "g", "b"].reduce((s, k) => s + (rgb[k] - p.color[k]) ** 2, 0);
    if (d < distance) { distance = d; closest = v; }
  }
  return closest && distance < 0.035 ? figma.variables.setBoundVariableForPaint(p, "color", closest) : p;
}
function bind(n, palette = "aurora", chart = false) {
  // The browser capture's Linux monospace fallback is not installed in Figma.
  // Recreate only those cloned captions in Manrope; never mutate an unloaded font.
  for (const old of tree(n).filter(c => c.type === "TEXT" && c.fontName !== figma.mixed && !fontAvailable(c.fontName))) {
    const parent = old.parent, index = parent.children.findIndex(child => child.id === old.id);
    const text = own(figma.createText());
    text.name = old.name; text.fontName = manrope[old.fontName.style.toLowerCase().includes("bold") ? "SemiBold" : "Regular"];
    text.fontSize = typeof old.fontSize === "number" ? old.fontSize : 11;
    text.characters = old.characters; text.lineHeight = old.lineHeight; text.letterSpacing = old.letterSpacing;
    text.fills = old.fills; text.textAlignHorizontal = old.textAlignHorizontal;
    text.textAutoResize = old.textAutoResize; text.resize(Math.max(1, old.width), Math.max(1, old.height));
    parent.insertChild(index, text);
    text.layoutPositioning = old.layoutPositioning;
    text.layoutSizingHorizontal = "FIXED"; text.layoutSizingVertical = "FIXED";
    if (old.layoutPositioning === "ABSOLUTE" || !("layoutMode" in parent) || parent.layoutMode === "NONE") {
      text.x = old.x; text.y = old.y;
    }
    removed.add(old.id); old.remove(); mutated.add(parent.id);
  }
  for (const c of tree(n)) {
    if (c.type === "TEXT") {
      const style = c.fontName === figma.mixed ? "Regular" : c.fontName.style.replace(/\s/g, "").toLowerCase();
      c.fontName = manrope[style.includes("semibold") ? "SemiBold" : style.includes("bold") ? "Bold" :
        style.includes("medium") ? "Medium" : "Regular"];
    }
    for (const field of ["fills", "strokes"]) {
      if (!(field in c) || !Array.isArray(c[field])) continue;
      c[field] = c[field].map(p => c.type === "TEXT" && chart ? color("muted-foreground", palette, p.opacity ?? 1) :
        remapPaint(p, palette, c.type === "TEXT"));
    }
    if ("layoutMode" in c && c.layoutMode !== "NONE") {
      for (const field of ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "itemSpacing"]) {
        const v = dimensions["spacing/" + c[field] / 4];
        if (v) c.setBoundVariable(field, v);
      }
    }
    mutated.add(c.id);
  }
}
function variant(key, axes) {
  const owner = assets[key];
  if (owner.type === "COMPONENT") return owner;
  const v = owner.children.find(n => n.type === "COMPONENT" &&
    Object.entries(axes).every(([k, val]) => n.variantProperties[k] === val));
  if (!v) throw new Error("Missing native variant " + key + JSON.stringify(axes));
  return v;
}
function auto(parent, name, width, height, flow = "HORIZONTAL") {
  const n = own(figma.createAutoLayout(flow));
  n.name = name; n.resize(width, height); n.fills = []; n.itemSpacing = 0;
  parent.appendChild(n); n.layoutSizingHorizontal = "FIXED"; n.layoutSizingVertical = "FIXED";
  return n;
}
function words(n) { return n.findAllWithCriteria({ types: ["TEXT"] }).map(t => t.characters.trim()).filter(Boolean).join(" "); }
function sourceIcon(n) { return n.findOne(c => c.type === "FRAME" && c.name === "Icon" && c.width <= 28 && c.height <= 28); }
function overlayIcon(parent, source, x, y, size) {
  if (!source) return null;
  const n = own(source.clone()); parent.appendChild(n); n.name = "Source icon / " + parent.name;
  n.visible = true;
  const scale = size / Math.max(n.width, n.height); n.rescale(scale);
  n.layoutPositioning = "ABSOLUTE"; n.x = x; n.y = y; bind(n); return n;
}
const shell = root.children.find(n => n.type === "INSTANCE" && n.name === "SidebarDashboardShellNative / Sidebar");
if (!shell) throw new Error("Existing native shell missing.");
const slot = shell.children.find(n => n.type === "SLOT" && n.name === "Content");
if (!slot) throw new Error("Existing Content slot missing.");
const body = slot.children.find(n => n.type === "FRAME" && n.name === "Page content");
if (!body) throw new Error("Existing template body missing.");
mark(root);
let sidebar = root.children.find(n => n.name === "Appearance 1.1 / Current sidebar");
if (!sidebar) {
  sidebar = own(sourceSidebar.clone()); root.insertChild(0, sidebar);
  sidebar.name = "Appearance 1.1 / Current sidebar";
  sidebar.resize(256, 1000); sidebar.layoutSizingHorizontal = "FIXED"; sidebar.layoutSizingVertical = "FIXED";
  sidebar.clipsContent = true; bind(sidebar);
  const nav = sidebar.findOne(n => n.type === "FRAME" && n.name === "Navigation - Main navigation");
  if (!nav || nav.layoutMode !== "VERTICAL") throw new Error("Captured native navigation unavailable.");
  nav.clipsContent = true;
  for (const link of nav.findAll().filter(n => n.type === "FRAME" && n.name === "Link")) {
    const text = link.findAllWithCriteria({ types: ["TEXT"] }).map(t => t.characters.trim())
      .filter(v => v && v !== "AI").join(" ");
    if (!text) continue;
    const glyph = sourceIcon(link);
    const active = text === plan.active;
    for (const child of link.children) child.visible = false;
    link.name = "Navigation / " + text; link.layoutMode = "HORIZONTAL";
    for (const f of ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"]) link[f] = 0;
    link.itemSpacing = 0; link.fills = []; link.strokes = [];
    const item = own(variant("nav", { State: active ? "Active" : "Default" }).createInstance());
    link.appendChild(item); item.resize(link.width, 40); item.layoutSizingHorizontal = "FIXED"; item.layoutSizingVertical = "FIXED";
    item.setProperties({ "Label#3:95": text }); item.name = "SidebarItem / " + text;
    for (const n of item.findAllWithCriteria({ types: ["TEXT"] })) {
      n.fontName = manrope[active ? "SemiBold" : "Regular"]; n.fontSize = 13;
      n.lineHeight = { unit: "PIXELS", value: 20 };
      n.fills = [color(active ? "accent-foreground" : "muted-foreground")]; mutated.add(n.id);
    }
    for (const child of item.children) if (child.type === "INSTANCE") child.visible = false;
    overlayIcon(link, glyph, 12, 12, 16);
    if (text === "AI workspace") {
      const ai = link.findOne(n => n.type === "TEXT" && n.characters === "AI");
      if (ai) { let p = ai; while (p.parent.id !== link.id) p = p.parent; p.visible = true; }
    }
    mark(link);
  }
}
for (const child of shell.children) if (child.id !== slot.id) child.visible = false;
shell.resize(1184, shell.height); shell.layoutSizingHorizontal = "FIXED";
for (const n of slot.children) if (n.type === "INSTANCE" && n.componentProperties?.["Page title#29:0"]) n.visible = false;
let header = slot.children.find(n => n.name === "Appearance 1.1 / Current header");
if (!header) {
  header = own(sourceHeader.clone());
  // Resolve unavailable captured fonts before slot parenting changes descendant IDs.
  bind(header);
  slot.insertChild(0, header);
  header.name = "Appearance 1.1 / Current header"; header.resize(1184, 73);
  header.layoutSizingHorizontal = "FIXED"; header.layoutSizingVertical = "FIXED";
  const buttons = header.findAll().filter(n => n.type === "FRAME" && n.name === "Button");
  for (const frame of buttons) {
    const label = words(frame), glyph = sourceIcon(frame);
    if (!["Search", "Appearance", "EN", ""].includes(label)) continue;
    for (const child of frame.children) child.visible = false;
    const appearance = label === "Appearance" ? "Soft" : "Outline";
    const button = own(variant("button", { Appearance: appearance, State: "Default" }).createInstance());
    frame.appendChild(button); button.resize(frame.width, frame.height); button.layoutSizingHorizontal = "FIXED"; button.layoutSizingVertical = "FIXED";
    button.setProperties({ "Label#97:0": label }); button.name = "ButtonAppearance / " + (label || "source icon control");
    if (label !== "Appearance") { button.fills = []; button.strokes = []; button.effects = []; }
    for (const n of button.findAllWithCriteria({ types: ["TEXT"] })) { n.fontSize = label === "Search" ? 13 : 11; mutated.add(n.id); }
    frame.layoutMode = "HORIZONTAL"; frame.fills = []; frame.strokes = [];
    for (const f of ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"]) frame[f] = 0;
    overlayIcon(frame, glyph, label ? 8 : (frame.width - 16) / 2, (frame.height - 16) / 2, 16);
    if (label === "Search") {
      const kbd = own(figma.createText()); frame.appendChild(kbd); kbd.fontName = manrope.Regular;
      kbd.fontSize = 10; kbd.characters = "⌘ K"; kbd.fills = [color("muted-foreground")];
      kbd.layoutPositioning = "ABSOLUTE"; kbd.x = frame.width - 33; kbd.y = 9;
    }
    mark(frame);
  }
}
const chartProofs = [];
const currentCharts = body.findAllWithCriteria({ types: ["INSTANCE"] })
  .filter(n => n.componentProperties?.["Label#23:14"]);
if (currentCharts.length !== chartSources.length) throw new Error("Native/source chart count differs.");
for (let i = 0; i < currentCharts.length; i++) {
  const old = currentCharts[i], parent = old.parent, index = parent.children.findIndex(child => child.id === old.id);
  const label = old.componentProperties["Label#23:14"].value, palette = paletteOf(old);
  let host = parent.children.find(n => n.name === "Chart / source geometry / " + label);
  if (!host) {
    host = auto(parent, "Chart / source geometry / " + label, old.width, old.height, "VERTICAL");
    parent.insertChild(index, host); host.clipsContent = true;
    host.counterAxisAlignItems = "CENTER"; host.primaryAxisAlignItems = "CENTER";
    old.visible = false;
    const graphic = own(chartSources[i].clone()); host.appendChild(graphic);
    graphic.name = "Chart / editable captured SVG"; graphic.rescale(Math.min(host.width / graphic.width, host.height / graphic.height));
    graphic.layoutSizingHorizontal = "FIXED"; graphic.layoutSizingVertical = "FIXED"; bind(graphic, palette, true);
    for (const t of graphic.findAllWithCriteria({ types: ["TEXT"] })) { t.fontSize = 10; mutated.add(t.id); }
    mark(host);
  }
  chartProofs.push({ hostId: host.id, referenceId: chartSources[i].id, label, palette, width: host.width, height: host.height, data: plan.data });
}
const rangePlans = VIEW === "effects" ? [
  ["Aurora field", "Speed", "Speed", 0, 1, 0.2], ["Aurora field", "Scale", "Scale", 0.25, 4, 1],
  ["Aurora field", "Intensity", "Intensity", 0, 1, 0.55],
  ["Prismatic gradient", "Angle", "Angle", 0, 360, 125], ["Prismatic gradient", "Intensity", "Intensity", 0, 1, 0.55],
  ["Spotlight surface", "Light intensity", "Light intensity", 0, 1, 0.55],
  ["Spotlight surface", "Spotlight radius", "Spotlight size", 80, 800, 320],
  ["Luminous edge", "Edge width", "Edge width", 1, 6, 1.5], ["Luminous edge", "Orbit duration", "Orbit duration", 4, 60, 12],
  ["Perspective card", "Maximum tilt", "Tilt angle", 0, 12, 6], ["Perspective card", "Perspective", "Perspective", 400, 2000, 900],
  ["Magnetic action", "Attraction strength", "Pull strength", 0, 0.5, 0.18],
  ["Magnetic action", "Maximum distance", "Travel distance", 0, 24, 10],
] : [];
const rangeProofs = [];
if (VIEW === "effects") {
  const tuning = body.findOne(n => n.type === "FRAME" && n.name === "Aurora field tuning");
  const speed = tuning.children.find(n => n.name === "Speed"), scale = tuning.children.find(n => n.name === "Scale");
  if (speed && scale) {
    const position = tuning.children.findIndex(child => child.id === speed.id);
    const row = own(figma.createAutoLayout("HORIZONTAL"));
    row.name = "Shader / speed and scale"; row.resize(510, Math.max(speed.height, scale.height));
    row.fills = []; row.itemSpacing = 12; row.setBoundVariable("itemSpacing", dimensions["spacing/3"]);
    for (const source of [speed, scale]) {
      // Prepare copies before slot parenting; moving existing slot content changes descendant IDs.
      const field = own(source.clone()); field.resize(249, field.height);
      for (const child of field.children) if ("resize" in child) child.resize(249, child.height);
      row.appendChild(field); field.layoutSizingHorizontal = "FIXED";
    }
    tuning.insertChild(position, row); row.layoutSizingHorizontal = "FIXED"; row.layoutSizingVertical = "FIXED";
    speed.visible = false; scale.visible = false;
    mark(row);
  }
}
function visibleInsideBody(n) {
  for (let p = n; p && p.id !== body.id; p = p.parent) if (!p.visible) return false;
  return true;
}
const sliders = body.findAllWithCriteria({ types: ["INSTANCE"] })
  .filter(n => n.name === "Slider" && (VIEW !== "effects" || visibleInsideBody(n)));
for (const slider of sliders) {
  let rule;
  if (VIEW === "effects") {
    rule = rangePlans.find(([recipe, old, current]) => (slider.parent.name === old || slider.parent.name === current) &&
      tree(body.findOne(n => n.type === "FRAME" && n.name === recipe + " tuning")).some(n => n.id === slider.id));
    if (!rule) throw new Error("Unmapped live effect slider " + slider.parent.name);
  } else if (VIEW === "studio") {
    const label = slider.parent.name;
    let ratio;
    if (label === "Position") {
      const siblings = sliders.filter(n => n.parent.name === "Position");
      ratio = [0, 0.5, 1][siblings.findIndex(child => child.id === slider.id)];
    } else ratio = label === "Gradient angle" ? 125 / 360 : label === "Gradient intensity" ? 0.65 : undefined;
    if (ratio === undefined) throw new Error("Unmapped studio slider " + label);
    rule = ["Studio", label, label, 0, 1, ratio];
  } else continue;
  const [recipe, oldLabel, label, min, max, value] = rule, ratio = (value - min) / (max - min);
  if (oldLabel !== label) {
    slider.parent.name = label;
    for (const text of slider.parent.findAllWithCriteria({ types: ["TEXT"] })) if (text.characters === oldLabel) text.characters = label;
  }
  const originalTrack = slider.children.find(n => n.type === "RECTANGLE" && n.id.endsWith(";15:46"));
  if (!originalTrack) throw new Error("Native slider track missing.");
  // A newly inserted slot subtree exposes staged IDs through findAll and persistent IDs through children.
  // Each range field has exactly one linked Slider, so its typed name determines the stable insertion index.
  const parent = slider.parent, index = parent.children.findIndex(child => child.type === "INSTANCE" && child.name === "Slider");
  if (index < 0) throw new Error("Range field has no linked Slider.");
  let host = parent.children.find(n => n.name === "Slider / value geometry / " + label);
  if (!host) {
    host = auto(parent, "Slider / value geometry / " + label, slider.width, slider.height);
    parent.insertChild(index, host);
    slider.visible = false;
    for (const [type, name] of [["RECTANGLE", "Track"], ["RECTANGLE", "Filled track"], ["ELLIPSE", "Thumb"]]) {
      const part = own(type === "ELLIPSE" ? figma.createEllipse() : figma.createRectangle());
      host.appendChild(part); part.name = name; part.layoutPositioning = "ABSOLUTE";
    }
  }
  const track = host.children.find(n => n.name === "Track");
  const fill = host.children.find(n => n.name === "Filled track");
  const thumb = host.children.find(n => n.name === "Thumb");
  track.fills = originalTrack.fills; track.cornerRadius = 2;
  fill.cornerRadius = 2;
  track.resize(host.width, 4); track.x = 0; track.y = 16;
  fill.resize(Math.max(0.01, host.width * ratio), 4); fill.x = 0; fill.y = 16; fill.visible = ratio > 0;
  thumb.resize(16, 16); thumb.x = (host.width - 16) * ratio; thumb.y = 10;
  fill.fills = [color("primary")]; thumb.fills = [color("primary")];
  mark(slider.parent);
  rangeProofs.push({ sliderId: slider.id, hostId: host.id, recipe, label, min, max, value, ratio, width: host.width, thumbX: thumb.x, fillWidth: fill.width });
}
// Outline actions in the current source use neutral semantic borders/text.
for (const button of body.findAllWithCriteria({ types: ["INSTANCE"] }).filter(n => n.componentProperties?.["Label#97:0"])) {
  const main = await button.getMainComponentAsync();
  if (main?.variantProperties?.Appearance !== "Outline") continue;
  const palette = paletteOf(button);
  button.strokes = [color("border", palette)];
  for (const t of button.findAllWithCriteria({ types: ["TEXT"] })) t.fills = [color("foreground", palette)];
  mark(button);
}
const footerSource = capture.findAll().find(n => n.type === "FRAME" && n.name === "Footer" && n.width > 900);
if (footerSource && !body.children.some(n => n.name === "Appearance 1.1 / Current page footer")) {
  const footer = own(footerSource.clone()); bind(footer);
  body.appendChild(footer); footer.name = "Appearance 1.1 / Current page footer";
  footer.resize(body.width - body.paddingLeft - body.paddingRight, footer.height);
  footer.layoutSizingHorizontal = "FIXED"; footer.layoutSizingVertical = "FIXED";
}
mark(root);
const all = tree(root), nodeTypes = {};
for (const n of all) nodeTypes[n.type] = (nodeTypes[n.type] || 0) + 1;
const texts = all.filter(n => n.type === "TEXT");
const images = all.filter(n => "fills" in n && Array.isArray(n.fills) && n.fills.some(p => p.type === "IMAGE"));
const wrongFonts = texts.filter(n => n.fontName === figma.mixed || n.fontName.family !== "Manrope");
if (images.length || wrongFonts.length) throw new Error("Native proof failed: images or non-Manrope fonts.");
const instances = root.findAllWithCriteria({ types: ["INSTANCE"] });
const masters = await Promise.all(instances.map(async n => (await n.getMainComponentAsync())?.id));
const audit = {
  rootId: root.id, captureId: capture.id, view: VIEW, activeRoute: plan.active,
  bounds: { x: root.x, y: root.y, width: root.width, height: root.height },
  descendantCount: all.length - 1, nodeTypes, fontFamilies: ["Manrope"], wrongFonts: [],
  imageFillCount: 0, imageNodes: [], fullUIRasterCount: 0,
  autoLayoutFrames: all.filter(n => n.type === "FRAME" && n.layoutMode !== "NONE").length,
  boundPaintCount: all.reduce((sum, n) => sum + ["fills", "strokes"].reduce((s, f) =>
    s + (f in n && Array.isArray(n[f]) ? n[f].filter(p => p.type === "SOLID" && p.boundVariables?.color).length : 0), 0), 0),
  reusedMasterIds: [...new Set(masters.filter(Boolean))],
  sidebarId: sidebar.id, headerId: header.id, charts: chartProofs, ranges: rangeProofs,
};
function pack(a, b, c) {
  const ids = [...new Set([...a, ...b, ...c])], groups = new Map(), literals = [];
  const mask = id => (a.has(id) ? 1 : 0) | (b.has(id) ? 2 : 0) | (c.has(id) ? 4 : 0);
  for (const id of ids) {
    const m = /^([A-Za-z0-9;:_-]*:)(0|[1-9]\d*)$/.exec(id);
    if (!m || !Number.isSafeInteger(Number(m[2]))) { literals.push([mask(id), id]); continue; }
    const key = mask(id) + "," + m[1];
    if (!groups.has(key)) groups.set(key, { mask: mask(id), prefix: m[1], values: [] });
    groups.get(key).values.push(Number(m[2]));
  }
  const prefixes = [...new Set([...groups.values()].map(g => g.prefix))].sort(); let previous = "";
  const prefixCSV = prefixes.map(p => {
    let length = 0; while (length < Math.min(previous.length, p.length) && previous[length] === p[length]) length++;
    const row = length + "," + p.slice(length); previous = p; return row;
  }).join("\n");
  const rangesCSV = [...groups.values()].map(g => {
    const values = g.values.sort((x, y) => x - y), runs = [];
    for (let i = 0; i < values.length; i++) {
      const first = values[i]; let last = first;
      while (i + 1 < values.length && values[i + 1] === last + 1) last = values[++i];
      runs.push(first === last ? String(first) : first + "-" + last);
    }
    return g.mask + "," + prefixes.indexOf(g.prefix) + "," + runs.join(";");
  }).join("\n");
  return { encoding: "observed-prefix-ranges-v1", categoryBits: { created: 1, mutated: 2, removed: 4 },
    counts: { created: a.size, mutated: b.size, removed: c.size, unique: ids.length },
    prefixesFrontCodedCSV: prefixCSV, rangesCSV, literalsJSON: JSON.stringify(literals) };
}
const result = { status: "refined", ...audit, affectedNodeIds: pack(created, mutated, removed) };
const byteCount = encodeURIComponent(JSON.stringify(result)).replace(/%[A-F\d]{2}/gi, "x").length;
if (byteCount > 19000) throw new Error("Lossless result exceeds transport; split the scoped patch.");
result.returnByteCount = byteCount;
return result;
