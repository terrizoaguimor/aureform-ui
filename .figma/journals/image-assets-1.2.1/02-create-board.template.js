const assets = __ASSETS__;
const pageName = "06 · Image assets 1.2.1";
const created = new Set();
const mutated = new Set();
let page = figma.root.children.find(p => p.name === pageName);
if (!page) {
  page = figma.createPage();
  page.name = pageName;
  created.add(page.id);
}
await figma.setCurrentPageAsync(page);
if (page.children.some(n => n.name === "Generated images / 1.2.1"))
  throw Error("Recorded board already exists; resume from its returned IDs");
const variables = {};
await Promise.all(Object.entries({
  background: "VariableID:2:37", surface: "VariableID:2:38",
  border: "VariableID:2:40", foreground: "VariableID:2:41",
  muted: "VariableID:2:42", gap: "VariableID:2:65",
  smallGap: "VariableID:2:62", padding: "VariableID:2:68",
  cardPadding: "VariableID:2:63", radius: "VariableID:2:72",
  fullRadius: "VariableID:2:74",
}).map(async ([key, id]) => {
  variables[key] = await figma.variables.getVariableByIdAsync(id);
  if (!variables[key]) throw Error("Missing recorded variable " + key);
}));
const styles = await figma.getLocalTextStylesAsync();
const roles = Object.fromEntries(["Display", "Title", "Body", "Body strong", "Caption", "Label"]
  .map(role => [role, styles.find(s => s.name === "Aureform/" + role)]));
if (Object.values(roles).some(s => !s)) throw Error("Missing existing text style");
await Promise.all(Object.values(roles).map(s => figma.loadFontAsync(s.fontName)));
const paint = variable => figma.variables.setBoundVariableForPaint(
  { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", variable);
function own(node) { created.add(node.id); return node; }
function container(name, parent, direction, width) {
  const n = own(figma.createAutoLayout(direction));
  n.name = name;
  parent.appendChild(n);
  n.resize(width, 1);
  n.primaryAxisSizingMode = direction === "VERTICAL" ? "AUTO" : "FIXED";
  n.counterAxisSizingMode = direction === "VERTICAL" ? "FIXED" : "AUTO";
  n.fills = [];
  n.setBoundVariable("itemSpacing", variables.gap);
  return n;
}
async function text(value, role, parent, width, mutedText = false) {
  const t = own(figma.createText());
  t.name = value;
  t.fontName = roles[role].fontName;
  t.textStyleId = roles[role].id;
  t.characters = value;
  t.textAutoResize = "HEIGHT";
  t.resize(width, t.height);
  t.fills = [paint(mutedText ? variables.muted : variables.foreground)];
  parent.appendChild(t);
  return t;
}
const board = container("Generated images / 1.2.1", page, "VERTICAL", 1440);
board.x = 100;
board.y = 100;
board.fills = [paint(variables.background)];
board.setExplicitVariableModeForCollection("VariableCollectionId:2:36", "2:2");
for (const field of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"])
  board.setBoundVariable(field, variables.padding);
board.placeholder = true;
await text("Aureform · Image collection", "Display", board, 1344);
await text("32 original generated assets · portraits, products and editorial photography", "Body", board, 1344, true);
const shelf = container("Generated image masters / 1.2.1", page, "VERTICAL", 1344);
shelf.x = 1660;
shelf.y = 100;
shelf.setExplicitVariableModeForCollection("VariableCollectionId:2:36", "2:2");
const records = [];
const groups = [];
for (const group of ["avatars", "products", "art"]) {
  const list = assets.filter(a => a.group === group);
  const title = { avatars: "Portraits & organisations", products: "Products", art: "Editorial collection" }[group];
  const section = container(title, board, "VERTICAL", 1344);
  await text(title + " · " + list.length, "Title", section, 1344);
  const columns = { avatars: 6, products: 4, art: 3 }[group];
  const cardWidth = (1344 - (columns - 1) * 24) / columns;
  let reviewRow, masterRow;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (i % columns === 0) reviewRow = container(title + " / row " + Math.floor(i / columns), section, "HORIZONTAL", 1344);
    if (i % 4 === 0) masterRow = container("Masters / " + group + " / row " + Math.floor(i / 4), shelf, "HORIZONTAL", 1344);
    const component = own(figma.createComponent());
    component.name = "Image assets/" + group + "/" + a.id;
    component.description = a.name + "\nLocal WebP: " + a.file + "\nSHA256: " + a.sha256 + "\nSource dimensions: " + a.width + " × " + a.height;
    component.layoutMode = "VERTICAL";
    component.resize(256, 256 * a.height / a.width);
    component.fills = [paint(variables.surface)];
    component.clipsContent = true;
    component.setBoundVariable("cornerRadius", variables.radius);
    masterRow.appendChild(component);
    const card = container(a.name, reviewRow, "VERTICAL", cardWidth);
    card.fills = [paint(variables.surface)];
    card.strokes = [paint(variables.border)];
    card.strokeWeight = 1;
    card.setBoundVariable("cornerRadius", variables.radius);
    card.setBoundVariable("itemSpacing", variables.smallGap);
    for (const field of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"])
      card.setBoundVariable(field, variables.cardPadding);
    const instance = own(component.createInstance());
    card.appendChild(instance);
    const imageWidth = cardWidth - 32;
    instance.resize(imageWidth, imageWidth * a.height / a.width);
    instance.name = "Image / " + a.name;
    if (group === "avatars") instance.setBoundVariable("cornerRadius", variables.fullRadius);
    await text(a.name, "Body strong", card, imageWidth);
    await text(a.width + " × " + a.height + " · " + (a.bytes / 1024).toFixed(1) + " KB", "Label", card, imageWidth, true);
    records.push({ id: a.id, group: a.group, componentId: component.id, imageNodeId: component.id, reviewInstanceId: instance.id, reviewCardId: card.id });
  }
  groups.push({ group, sectionId: section.id, count: list.length });
}
const all = [board, ...board.findAll(() => true)];
const result = {
  status: "board-built-awaiting-durable-uploads",
  pageId: page.id, boardId: board.id, shelfId: shelf.id,
  boardBounds: { x: board.x, y: board.y, width: board.width, height: board.height },
  assets: records, groups,
  fonts: [...new Set(all.filter(n => n.type === "TEXT").flatMap(n =>
    n.getStyledTextSegments(["fontName"]).map(s => s.fontName.family)))],
  createdNodeIds: [...created], mutatedNodeIds: [...mutated],
};
if (JSON.stringify(result).length > 19000) throw Error("Result exceeds bounded return size");
return result;
