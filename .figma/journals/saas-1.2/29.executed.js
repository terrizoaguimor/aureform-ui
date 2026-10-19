const page = await figma.getNodeByIdAsync("2:4");
await figma.setCurrentPageAsync(page);
const roots = await Promise.all(["228:1851", "228:2184", "228:2475", "228:2776", "228:3077", "228:3208", "228:3383", "228:3519", "232:3989", "232:4040"].map((id) => figma.getNodeByIdAsync(id)));
const fonts = new Map();
for (const root of roots) for (const text of root.findAllWithCriteria({ types: ["TEXT"] })) for (const segment of text.getStyledTextSegments(["fontName"])) fonts.set(JSON.stringify(segment.fontName), segment.fontName);
await Promise.all([...fonts.values()].map((font) => figma.loadFontAsync(font)));
const variables = new Map((await figma.variables.getLocalVariablesAsync()).map((variable) => [variable.id, variable]));
const created = new Set(); const mutated = new Set(); const removed = [];
function paint(node, id) { node.fills = [figma.variables.setBoundVariableForPaint({ type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", variables.get(id))]; mutated.add(node.id); }
function hugText(node) { node.textAutoResize = "WIDTH_AND_HEIGHT"; node.layoutSizingHorizontal = "HUG"; node.layoutSizingVertical = "HUG"; mutated.add(node.id); }
const proof = [];
for (const root of roots.slice(0, 8)) {
 let table = root.children.find((node) => node.name === "DataTable / controlled external page"); if (!table) throw new Error("Missing local table " + root.id);
 if (table.type === "INSTANCE") { removed.push(table.id); table = table.detachInstance(); created.add(table.id); for (const node of table.findAll(() => true)) created.add(node.id); table.name = "DataTable / controlled external page"; mutated.add(table.id); }
 for (const node of table.findAll((item) => item.type === "FRAME" && ["Toolbar / heading", "Toolbar / controls"].includes(item.name))) { node.layoutSizingHorizontal = "FILL"; mutated.add(node.id); }
 for (const node of table.findAll((item) => item.type === "TEXT" && item.name === "Toolbar / title")) hugText(node);
 const controls = table.findOne((node) => node.name === "Toolbar / controls"); if (controls) { const spacer = controls.children.find((node) => node.name.toLowerCase().includes("spacer")); if (spacer) { spacer.layoutSizingHorizontal = "FILL"; mutated.add(spacer.id); } }
 for (const row of table.children.filter((node) => node.type === "FRAME" && (node.name === "Table / header" || node.name.startsWith("Row /")))) {
  for (const cell of row.children.filter((node) => node.type === "FRAME" && /^(Header|Cell) \/ /.test(node.name))) {
   const kind = cell.name.split(" / ")[1]; if (kind === "customer") cell.layoutSizingHorizontal = "FILL"; else if (kind === "amount") cell.resize(156, cell.height); else if (kind === "joined") cell.resize(154, cell.height); else if (kind === "company") cell.resize(120, cell.height); else continue; mutated.add(cell.id);
  }
 }
 if (root.variantProperties.State === "Filtered") { for (const node of table.findAllWithCriteria({ types: ["TEXT"] })) { if (node.name === "Toolbar / count label") { node.characters = "3 rows"; hugText(node); } if (node.name === "label" && node.characters === "Active") { paint(node, "VariableID:2:47"); if (node.parent && "fills" in node.parent) paint(node.parent, "VariableID:2:46"); } } }
 proof.push({ root: root.id, table: table.id, titleWidth: table.findOne((node) => node.type === "TEXT" && node.name === "Toolbar / title")?.width, controlsWidth: controls?.width, tableWidth: table.width, visibleRows: table.children.filter((node) => node.visible && node.name.startsWith("Row /")).length });
}
for (const id of ["232:3953", "232:3969"]) { const node = await figma.getNodeByIdAsync(id); for (const text of node.findAllWithCriteria({ types: ["TEXT"] })) if (text.characters === "Delete") paint(text, "VariableID:2:51"); }
for (const id of ["250:6358", "250:6362"]) { const node = await figma.getNodeByIdAsync(id); for (const text of node.findAllWithCriteria({ types: ["TEXT"] })) { text.characters = text.name === "Something went wrong" ? "The records were not removed" : "Try again."; text.textAutoResize = "HEIGHT"; text.resize(348, text.height); text.layoutSizingVertical = "HUG"; paint(text, "VariableID:2:51"); } }
function encode(nodes) { const byPrefix = {}; const literal = []; for (const id of nodes) { const match = /^(\d+):(\d+)$/.exec(id); if (match) (byPrefix[match[1]] ??= []).push(Number(match[2])); else literal.push(id); } return { byPrefix, literal, count: nodes.size }; }
return { createdNodeIds: encode(created), mutatedNodeIds: encode(mutated), removedNodeIds: removed, tables: proof, alertTextToken: "VariableID:2:51", sharedMastersChanged: [], note: "Local table overrides preserve nested linked controls. Destructive surfaces retain the source-defined soft palette." };
