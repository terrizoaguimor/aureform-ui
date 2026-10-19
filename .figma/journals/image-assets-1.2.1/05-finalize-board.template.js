const assets = __ASSETS__;
const page = await figma.getNodeByIdAsync("263:59");
if (!page || page.type !== "PAGE") throw Error("Missing recorded image page");
await figma.setCurrentPageAsync(page);
const board = await figma.getNodeByIdAsync("263:60");
const shelf = await figma.getNodeByIdAsync("263:63");
if (!board || !shelf) throw Error("Missing recorded board or masters");
const fonts = new Map();
for (const node of board.findAllWithCriteria({ types: ["TEXT"] }))
  for (const segment of node.getStyledTextSegments(["fontName"]))
    fonts.set(JSON.stringify(segment.fontName), segment.fontName);
await Promise.all([...fonts.values()].map(font => figma.loadFontAsync(font)));
const results = await Promise.all(assets.map(async asset => {
  const node = await figma.getNodeByIdAsync(asset.componentId);
  if (!node || node.type !== "COMPONENT") throw Error("Missing asset component " + asset.id);
  const fill = node.fills.find(p => p.type === "IMAGE");
  if (!fill || fill.imageHash !== asset.imageHash) throw Error("Durable fill mismatch " + asset.id);
  return { id: asset.id, componentId: node.id, imageHash: fill.imageHash,
    sourceWidth: asset.width, sourceHeight: asset.height };
}));
const background = await figma.variables.getVariableByIdAsync("VariableID:2:37");
if (!background) throw Error("Missing existing background variable");
const mutated = new Set([board.id]);
board.placeholder = false;
const groupSpecs = [
  ["avatars", "263:64"], ["products", "263:164"], ["art", "263:210"],
];
const groups = [];
for (const [name, id] of groupSpecs) {
  const node = await figma.getNodeByIdAsync(id);
  if (!node || node.type !== "FRAME") throw Error("Missing recorded group " + name);
  node.fills = [figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } }, "color", background)];
  mutated.add(node.id);
  figma.io.write("images-1.2.1-" + name + ".png", await node.exportAsync({
    format: "PNG", constraint: { type: "SCALE", value: 1 },
  }));
  groups.push({ group: name, id, width: node.width, height: node.height });
}
const trees = [board, ...board.findAll(() => true), shelf, ...shelf.findAll(() => true)];
return {
  status: "32-durable-assets-native-board-awaiting-owner-review",
  pageId: page.id, boardId: board.id, groups, assets: results,
  componentCount: shelf.findAllWithCriteria({ types: ["COMPONENT"] }).length,
  imageFillNodes: trees.filter(n => "fills" in n && Array.isArray(n.fills) &&
    n.fills.some(p => p.type === "IMAGE")).length,
  uniqueImageHashes: [...new Set(results.map(a => a.imageHash))].length,
  fontFamilies: [...new Set([...fonts.values()].map(f => f.family))],
  wholeUiRasterCount: 0,
  createdNodeIds: [], mutatedNodeIds: [...mutated],
};
