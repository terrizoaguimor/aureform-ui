const page = await figma.getNodeByIdAsync("2:3");
if (!page || page.type !== "PAGE") throw Error("Missing recorded Core page");
await figma.setCurrentPageAsync(page);
const [fonts, textStyles, paintStyles, effectStyles, variables] = await Promise.all([
  figma.listAvailableFontsAsync(),
  figma.getLocalTextStylesAsync(),
  figma.getLocalPaintStylesAsync(),
  figma.getLocalEffectStylesAsync(),
  figma.variables.getLocalVariablesAsync(),
]);
const masters = page.findAllWithCriteria({ types: ["COMPONENT_SET", "COMPONENT"] })
  .filter(n => /^(Avatar|Gallery|Carousel|VideoPlayer)(?:$| \/)/.test(n.name))
  .map(n => ({
    id: n.id, name: n.name, type: n.type, parentId: n.parent.id,
    width: n.width, height: n.height,
    children: "children" in n ? n.children.map(c => ({
      id: c.id, name: c.name, type: c.type, width: c.width, height: c.height,
    })) : [],
  }));
return {
  status: "read-only-discovery",
  pages: figma.root.children.map(p => ({ id: p.id, name: p.name })),
  manropeFonts: fonts.filter(f => f.fontName.family === "Manrope").map(f => f.fontName),
  textStyles: textStyles.map(s => ({ id: s.id, name: s.name, fontName: s.fontName, fontSize: s.fontSize })),
  paintStyles: paintStyles.map(s => ({ id: s.id, name: s.name, paintTypes: s.paints.map(p => p.type) })),
  effectStyles: effectStyles.map(s => ({ id: s.id, name: s.name })),
  variables: variables.filter(v => ["background", "surface", "border", "foreground", "muted-foreground", "spacing/3", "spacing/4", "spacing/6", "spacing/8", "spacing/12", "radius/lg", "radius/full"].includes(v.name))
    .map(v => ({ id: v.id, name: v.name, scopes: v.scopes, valuesByMode: v.valuesByMode })),
  masters,
  createdNodeIds: [], mutatedNodeIds: [],
};
