const FILE_KEY = "lHp5p10yGb7lqXJDnAox0N";
const page = await figma.getNodeByIdAsync("2:3");
await figma.setCurrentPageAsync(page);
const [dataSet, tableSet, variables, collections, styles, effects, available] = await Promise.all([
  figma.getNodeByIdAsync("23:443"), figma.getNodeByIdAsync("23:355"),
  figma.variables.getLocalVariablesAsync(), figma.variables.getLocalVariableCollectionsAsync(),
  figma.getLocalTextStylesAsync(), figma.getLocalEffectStylesAsync(), figma.listAvailableFontsAsync()
]);
if (dataSet?.type !== "COMPONENT_SET" || tableSet?.type !== "COMPONENT_SET" || dataSet.children.length !== 28 || tableSet.children.length !== 16) throw new Error("Expected actual 28+16 inventory");
const color = collections.find(c => c.id === "VariableCollectionId:2:36");
const dimensions = collections.find(c => c.id === "VariableCollectionId:2:58");
if (!color || !dimensions) throw new Error("Existing collections missing");
const byId = new Map(variables.map(v => [v.id, v]));
const collectionsById = new Map(collections.map(c => [c.id, c]));
const colors = new Map(variables.filter(v => v.variableCollectionId === color.id).map(v => [v.name, v]));
const modes = Object.fromEntries(color.modes.map(m => [m.name, m.modeId]));
const fonts = new Map();
function tree(n) { return [n, ...("children" in n ? n.children.flatMap(tree) : [])]; }
function pageOf(n) { while (n && n.type !== "PAGE") n = n.parent; return n; }
for (const set of [dataSet, tableSet]) for (const n of tree(set)) if (n.type === "TEXT") for (const s of n.getStyledTextSegments(["fontName"])) fonts.set(JSON.stringify(s.fontName), s.fontName);
const captionFont = available.map(f => f.fontName).find(f => f.family === "Manrope" && f.style.replace(/\s/g, "").toLowerCase() === "semibold");
const defaultFont = available.map(f => f.fontName).find(f => f.family === "Inter" && f.style === "Regular");
const captionStyle = styles.filter(s => s.fontName.family === "Manrope").sort((a,b) => Math.abs(a.fontSize-13)-Math.abs(b.fontSize-13))[0];
if (!captionFont || !defaultFont || !captionStyle || !modes.Light || !modes.Dark) throw new Error("Current native typography or modes missing");
for (const f of [captionFont, defaultFont, captionStyle.fontName]) fonts.set(JSON.stringify(f), f);
await Promise.all([...fonts.values()].map(f => figma.loadFontAsync(f)));
function value(v, theme, chain = []) {
  if (chain.includes(v.id)) throw new Error("Variable alias cycle");
  const c = collectionsById.get(v.variableCollectionId);
  const result = v.valuesByMode[v.variableCollectionId === color.id ? modes[theme] : c.defaultModeId] ?? v.valuesByMode[c.defaultModeId];
  return result?.type === "VARIABLE_ALIAS" ? value(byId.get(result.id), theme, [...chain, v.id]) : result;
}
function solid(role, theme = "Light", opacity = 1) {
  const v = colors.get(role.includes("/") ? role : "color/" + role);
  if (!v) throw new Error("Missing color role " + role);
  const c = value(v, theme);
  return figma.variables.setBoundVariableForPaint({type:"SOLID", color:{r:c.r,g:c.g,b:c.b},opacity}, "color", v);
}
const created = new Set(), mutated = new Set(), removed = new Set();
function mark(n, fresh = false) { for (const node of tree(n)) { mutated.add(node.id); if (fresh) created.add(node.id); } }
function dimension(n, key, amount, category = "spacing/") {
  n.setBoundVariable(key, null); n[key] = amount;
  const v = variables.find(v => v.variableCollectionId === dimensions.id && v.name.startsWith(category) && Math.abs(value(v,"Light")-amount) < .01);
  if (v) n.setBoundVariable(key, v);
  mutated.add(n.id);
}
function frame(parent, name, mode, width, padding = 0, gap = 0) {
  const f = figma.createAutoLayout(mode); f.fills = []; f.strokes = [];
  f.name = name; parent.appendChild(f); mutated.add(parent.id);
  f.resize(width,1); f.layoutSizingHorizontal = "FIXED"; f.layoutSizingVertical = "HUG";
  f.primaryAxisAlignItems = "MIN"; f.counterAxisAlignItems = "MIN"; f.clipsContent = false;
  for (const side of ["Top","Right","Bottom","Left"]) dimension(f,"padding"+side,padding);
  dimension(f,"itemSpacing",gap); mark(f,true); return f;
}
async function caption(parent, label, width, size = 13) {
  const n = figma.createText(); parent.appendChild(n); mutated.add(parent.id);
  await n.setTextStyleIdAsync(captionStyle.id); n.name = "Review / caption";
  n.fontName = captionFont; n.fontSize = size; n.lineHeight = {unit:"PIXELS",value:size === 22 ? 32 : 20};
  n.textAutoResize = "HEIGHT"; n.resize(width,32); n.layoutSizingHorizontal = "FIXED"; n.layoutSizingVertical = "HUG";
  n.characters = label; n.fills = [solid("muted-foreground")]; mark(n,true); return n;
}
function transform(angle, width, height) {
  const radians = angle*Math.PI/180, dx = Math.sin(radians)*width, dy = -Math.cos(radians)*height, length = Math.abs(dx)+Math.abs(dy), sx = dx/length, sy = dy/length;
  return [[sx,sy,(1-sx-sy)/2],[-sy,sx,(1+sy-sx)/2]];
}
function gradient(role, stops, opacity, angle, node, theme) {
  const v = colors.get(role.includes("/") ? role : "color/"+role), c = value(v,theme);
  return {type:"GRADIENT_LINEAR",opacity,gradientTransform:transform(angle,node.width,node.height),gradientStops:stops.map(([position,alpha])=>({position,color:{r:c.r,g:c.g,b:c.b,a:alpha},...(alpha === 1 ? {boundVariables:{color:{type:"VARIABLE_ALIAS",id:v.id}}} : {})}))};
}
async function material(node, appearance, theme) {
  node.fills = appearance === "Glass"
    ? [gradient("primary",[[0,1],[.65,0]],.08,130,node,theme),solid("surface",theme,theme === "Dark" ? .8 : .87)]
    : appearance === "Gradient"
      ? [gradient("brand/primary",[[.25,0],[1,1]],.2,135,node,theme),solid("surface",theme)]
      : [solid("surface",theme)];
  node.strokes = appearance === "Elevated" || appearance === "Flat" ? [solid("border",theme)] : [solid("primary",theme,.3),solid("border",theme)];
  node.strokeWeight = 1; node.strokeAlign = "INSIDE";
  for (const key of ["topLeftRadius","topRightRadius","bottomLeftRadius","bottomRightRadius"]) dimension(node,key,16,"radius/");
  if (appearance === "Flat") node.effects = [];
  else {
    const style = effects.find(s => s.name === "Aureform/Shadow/"+theme+"/"+(appearance === "Glass" ? "soft" : "elevated"));
    if (!style) throw new Error("Existing effect style missing");
    await node.setEffectStyleIdAsync(style.id);
    if (appearance === "Glass") node.effects = [...node.effects,{type:"BACKGROUND_BLUR",blurType:"NORMAL",radius:18,visible:true}];
  }
  mark(node);
}
const cases = [
  ["DataTable","Default","Elevated","Comfortable"],
  ["DataTable","Selected","Glass","Comfortable"],
  ["DataTable","Empty","Gradient","Comfortable"],
  ["DataTable","Loading","Flat","Comfortable"],
  ["DataTable","Error","Elevated","Comfortable"],
  ["DataTable","Default","Glass","Compact"],
  ["Table","Default","Glass","Comfortable"],
  ["Table","Default","Elevated","Compact"],
  ["Table","Empty","Flat","Comfortable"],
  ["Table","Empty","Gradient","Compact"]
];
const masters = cases.map(([family,State,Appearance,Density]) => {
  const set = family === "DataTable" ? dataSet : tableSet;
  const matches = set.children.filter(n => n.type === "COMPONENT" && n.variantProperties.State === State && n.variantProperties.Appearance === Appearance && n.variantProperties.Density === Density);
  if (matches.length !== 1) throw new Error("Actual native variant missing");
  return matches[0];
});
const name = "Review / Table 1.1 / Light + Dark";
if (page.children.some(n => n.name === name)) throw new Error("Review composition already exists; reconcile its returned ID");
const freeX = Math.max(0,...page.children.map(n => n.x+n.width)) + 160;
const board = frame(page,name,"VERTICAL",2492,24,24); board.x = freeX; board.y = 80;
board.setExplicitVariableModeForCollection(color,modes.Light); board.fills = [solid("background")];
await caption(board,"Aureform · Tables 1.1 · Light + Dark",2444,22);
await caption(board,"28 DataTable + 16 Table · four materials · two densities · Default / Selected / Empty / Loading / Error",2444);
const inventory = [];
for (let index = 0; index < cases.length; index++) {
  const [family,state,appearance,density] = cases[index], master = masters[index];
  const row = frame(board,"Review / "+family+" / "+state+" / "+appearance+" / "+density,"HORIZONTAL",2444,0,40);
  for (const [themeIndex,theme] of ["Light","Dark"].entries()) {
    const panel = frame(row,"Review / "+theme+" / "+family,"VERTICAL",1202,32,16);
    panel.setExplicitVariableModeForCollection(color,modes[theme]); panel.fills = [solid("background",theme)];
    const label = await caption(panel,theme+" · "+family+" · "+appearance+" · "+density+" · "+state,1138);
    const sample = master.createInstance(); sample.name = "Review / linked native "+family; panel.appendChild(sample); mutated.add(panel.id);
    sample.resize(1138,master.height); sample.layoutSizingHorizontal = "FIXED"; sample.layoutSizingVertical = "FIXED"; mark(sample,true);
    if (state !== "Error") await material(sample,appearance,theme);
    inventory.push([index,themeIndex,row.id,panel.id,label.id,sample.id,master.id,sample.width,sample.height]);
  }
}
const ctx = {created,mutated,removed};
function encodeAffectedIds(ctx) {
  const { created, mutated, removed } = ctx;
  const ids = [...new Set([...created, ...mutated, ...removed])], groups = new Map(), literals = [];
  const maskOf = id => (created.has(id) ? 1 : 0) | (mutated.has(id) ? 2 : 0) | (removed.has(id) ? 4 : 0);
  for (const id of ids) {
    const match = /^([A-Za-z0-9;:_-]*:)(0|[1-9]\d*)$/.exec(id);
    if (!match || !Number.isSafeInteger(Number(match[2]))) { literals.push([maskOf(id), id]); continue; }
    const prefix = match[1], key = maskOf(id) + ',' + prefix;
    if (!groups.has(key)) groups.set(key, { mask: maskOf(id), prefix, values: [] });
    groups.get(key).values.push(Number(match[2]));
  }
  const prefixes = [...new Set([...groups.values()].map(group => group.prefix))].sort();
  let previous = '';
  const prefixesFrontCodedCSV = prefixes.map(prefix => {
    let common = 0;
    while (common < Math.min(previous.length, prefix.length) && previous[common] === prefix[common]) common++;
    const row = common + ',' + prefix.slice(common); previous = prefix; return row;
  }).join('\n');
  const rangesCSV = [...groups.values()].map(group => {
    const values = group.values.sort((a, b) => a - b), runs = [];
    for (let index = 0; index < values.length; index++) {
      const start = values[index]; let end = start;
      while (index + 1 < values.length && values[index + 1] === end + 1) end = values[++index];
      runs.push(start === end ? String(start) : start + '-' + end);
    }
    return group.mask + ',' + prefixes.indexOf(group.prefix) + ',' + runs.join(';');
  }).join('\n');
  return {
    encoding: 'observed-prefix-ranges-v1', categoryBits: { created: 1, mutated: 2, removed: 4 },
    counts: { created: created.size, mutated: mutated.size, removed: removed.size, unique: ids.length },
    prefixesFrontCodedCSV, rangesCSV, literalsJSON: JSON.stringify(literals),
    decode: 'Use decodeAffectedIds() in this script. Inclusive ranges contain only consecutive observed IDs; every exact created/mutated/removed ID is recoverable.',
  };
}

function auditRoot(root) {
  const nodes = tree(root), typeCounts = {}, families = {}, failures = [], selectedRows = [], rowActions = [], headers = [];
  let instanceCount = 0, boundPaints = 0, gradientCount = 0, imageCount = 0;
  for (const node of nodes) {
    typeCounts[node.type] = (typeCounts[node.type] ?? 0) + 1;
    if (node.type === 'INSTANCE') instanceCount++;
    if (node.name === 'Selection / primary inset edge') selectedRows.push(node.id);
    if (node.name.startsWith('Row actions /')) rowActions.push(node.id);
    if (node.type === 'TEXT') {
      for (const segment of node.getStyledTextSegments(['fontName'])) families[segment.fontName.family] = (families[segment.fontName.family] ?? 0) + 1;
      if (node.visible && node.characters && !(node.width > 0)) failures.push({ id: node.id, issue: 'Collapsed text width' });
      if (node.name === 'Header / label') headers.push({ id: node.id, text: node.characters, width: node.width });
    }
    for (const field of ['fills', 'strokes']) if (field in node && Array.isArray(node[field])) {
      for (const paint of node[field]) {
        if (paint.type === 'IMAGE') imageCount++;
        if (paint.boundVariables?.color) boundPaints++;
        if (paint.type.startsWith('GRADIENT_')) {
          gradientCount++;
          for (const stop of paint.gradientStops) if (stop.color.a < 1 && stop.boundVariables?.color) failures.push({ id: node.id, issue: 'Transparent gradient stop has a color alias' });
        }
      }
    }
    if ('layoutMode' in node && node.layoutMode !== 'NONE' && Array.isArray(node.fills) && node.fills.some(paint => paint.type === 'SOLID' && !paint.boundVariables?.color && paint.opacity !== 0 && ['r', 'g', 'b'].every(channel => paint.color[channel] === 1))) {
      failures.push({ id: node.id, issue: 'Unbound white auto-layout fill' });
    }
  }
  return {
    id: root.id, name: root.name, type: root.type, pageId: pageOf(root)?.id,
    width: root.width, height: root.height, nodeCount: nodes.length, typeCounts,
    fontFamilies: families, nativeInstanceCount: instanceCount, boundPaintCount: boundPaints,
    gradientCount, imageFillCount: imageCount, selectedRowEdgeIds: selectedRows, rowActionIds: rowActions, headers,
    failures, visualReview: 'Pending owner screenshot review; structural audit does not certify pixels or prototype interaction.',
  };
}


const affectedNodeIds = encodeAffectedIds(ctx);
affectedNodeIds.encoding = "observed-prefix-ranges-base36-v1";
affectedNodeIds.rangesCSV = affectedNodeIds.rangesCSV.split("\n").filter(Boolean).map(line => {
  const [mask,prefix,ranges] = line.split(",");
  return mask+","+Number(prefix).toString(36)+","+ranges.split(";").map(range=>range.split("-").map(n=>Number(n).toString(36)).join("-")).join(";");
}).join("\n");
affectedNodeIds.decode = "Front-coded prefixes use decimal common lengths. CSV: decimal category mask, base36 prefix index, base36 inclusive suffix ranges. Literals are exact.";
const audit = auditRoot(board);
const result = {
  status: audit.failures.length ? "structural-review-needed" : "review-composition-ready-awaiting-owner-visual-review",
  fileKey:FILE_KEY,pageId:page.id,boardId:board.id,bounds:[board.x,board.y,board.width,board.height],
  frozenBuilderSHA256:"fe82d1303d080363a35c8aaaa204dbebd92599d1cf80d4849efe80fe6f16db6f",
  affectedNodeIds,themeCodes:["Light","Dark"],caseSchema:["family","state","appearance","density"],cases,
  inventorySchema:["caseIndex","themeIndex","rowId","panelId","captionId","instanceId","mainId","width","height"],inventory,
  preservedMainIds:[...new Set(masters.map(m=>m.id))],
  reviewAudit:{rootsChecked:1,totals:{nodeCount:audit.nodeCount,nativeInstanceCount:audit.nativeInstanceCount,boundPaintCount:audit.boundPaintCount,gradientCount:audit.gradientCount,imageFillCount:audit.imageFillCount,fontFamilies:audit.fontFamilies,failures:audit.failures}},
  screenshotReview:"One composition, both themes and all states; owner must inspect the actual PNG."
};
result.outputBytes = unescape(encodeURIComponent(JSON.stringify(result))).length;
return result;
