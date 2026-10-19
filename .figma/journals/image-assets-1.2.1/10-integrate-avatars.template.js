const page = await figma.getNodeByIdAsync(PAGE_ID);
await figma.setCurrentPageAsync(page);
const rootIds = ROOT_IDS;
const roots = new Set(rootIds);
const assets = ASSETS;
const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const initialLetters = (s) => s.split(/\s+/).slice(0, 2).map((t) => t[0]).join("").toUpperCase();
const byName = new Map(assets.map((a) => [normalize(a.name), a]));
const taskOwners = TASK_OWNERS;
for (const a of assets) {
  const master = await figma.getNodeByIdAsync(a.componentId);
  if (master?.type !== "COMPONENT") throw Error("Missing image master " + a.componentId);
  const image = master.fills.find((p) => p.type === "IMAGE");
  if (!image?.imageHash) throw Error("Missing committed image " + a.id);
  a.imageHash = image.imageHash;
}
const scopeRoot = (n) => {
  for (let r = n; r; r = r.parent) if (roots.has(r.id)) return r.id;
  return null;
};
const selected = [];
const rootCounts = {};
const unknown = [];
const candidates = page.query("INSTANCE[mainComponent=3:143],INSTANCE[mainComponent=3:145],INSTANCE[mainComponent=3:147],FRAME[name^=Image]").toArray();
for (const n of candidates) {
  const rootId = scopeRoot(n);
  if (!rootId) continue;
  const texts = n.findAllWithCriteria({ types: ["TEXT"] });
  const letters = texts.map((t) => t.characters.trim()).join("");
  let asset = n.type === "FRAME" ? byName.get(normalize(n.name.replace(/^Image\s*-\s*/i, ""))) : null;
  if (n.type === "FRAME" && (!asset || n.width > 128 || n.height > 128)) continue;
  rootCounts[rootId] = (rootCounts[rootId] ?? 0) + 1;
  for (let p = n.parent, depth = 0; !asset && p && depth < 3 && "findAllWithCriteria" in p; p = p.parent, depth++) {
    const ts = p.findAllWithCriteria({ types: ["TEXT"] });
    if (ts.length > 32) break;
    const names = [...new Set(ts.map((t) => byName.get(normalize(t.characters))).filter(Boolean))].filter((a) => initialLetters(a.name) === letters);
    if (names.length === 1) asset = names[0];
    if (!asset && p.name === "TaskCard") {
      const owners = [...new Set(ts.map((t) => taskOwners[t.characters]).filter(Boolean))].filter((name) => initialLetters(name) === letters);
      if (owners.length === 1) asset = byName.get(normalize(owners[0]));
    }
  }
  if (!asset && letters === "AM" && n.id.endsWith(";29:127")) asset = byName.get("alex morgan");
  if (!asset && letters === "AM") {
    for (let p = n.parent, depth = 0; p && depth < 5; p = p.parent, depth++) {
      if (/^(Header tools|Header actions|Header controls|Profile trigger|Profile action)$/i.test(p.name)) { asset = byName.get("alex morgan"); break; }
    }
  }
  if (asset) selected.push({ node: n, texts, rootId, asset });
  else unknown.push({ id: n.id, rootId, letters });
}
const fonts = new Map();
for (const row of selected) for (const t of row.texts) for (const s of t.getStyledTextSegments(["fontName"])) fonts.set(JSON.stringify(s.fontName), s.fontName);
await Promise.all([...fonts.values()].map((f) => figma.loadFontAsync(f)));
const fullRadius = await figma.variables.getVariableByIdAsync("VariableID:2:74");
if (!fullRadius) throw Error("Existing radius/full is missing");
const ids = new Set(selected.flatMap((r) => [r.node.id, ...r.texts.map((t) => t.id)]));
const grouped = new Map();
for (const id of ids) {
  const match = /^(.*:)(\d+)$/.exec(id);
  if (!match) throw Error("Unencodable affected ID");
  if (!grouped.has(match[1])) grouped.set(match[1], []);
  grouped.get(match[1]).push(Number(match[2]));
}
const prefixes = [...grouped.keys()].sort();
let previous = "";
const front = prefixes.map((p) => { let same = 0; while (same < Math.min(previous.length, p.length) && previous[same] === p[same]) same++; const row = same + "," + p.slice(same); previous = p; return row; });
const ranges = prefixes.map((p, index) => {
  const numbers = grouped.get(p).sort((a, b) => a - b), runs = [];
  let first = numbers[0], last = first;
  for (const num of numbers.slice(1)) { if (num === last + 1) last = num; else { runs.push(first === last ? String(first) : first + "-" + last); first = last = num; } }
  runs.push(first === last ? String(first) : first + "-" + last);
  return "2," + index + "," + runs.join(";");
});
const prefixIndex = new Map(prefixes.map((p, i) => [p, i]));
const rootIndex = new Map(rootIds.map((id, i) => [id, i]));
const assetIndex = new Map(assets.map((a, i) => [a.id, i]));
const bindings = selected.map((r) => { const m = /^(.*:)(\d+)$/.exec(r.node.id); return [assetIndex.get(r.asset.id), rootIndex.get(r.rootId), prefixIndex.get(m[1]), m[2]].join(","); });
const assetCounts = {}, updatedRootCounts = {};
for (const r of selected) { assetCounts[r.asset.id] = (assetCounts[r.asset.id] ?? 0) + 1; updatedRootCounts[r.rootId] = (updatedRootCounts[r.rootId] ?? 0) + 1; }
const shapeCorrections = selected.filter((r) => Math.abs(r.node.width - r.node.height) > 0.5).map((r) => ({ id: r.node.id, before: [r.node.width, r.node.height], after: Math.max(r.node.width, r.node.height) }));
const result = {
  status: "named-avatars-updated-awaiting-native-visual-review", pageId: page.id, rootCounts, updatedRootCounts,
  photoSlots: selected.length, hiddenInitialTexts: selected.reduce((n, r) => n + r.texts.length, 0), assetCounts,
  unassignedFallbackSlots: unknown.length, unknownSamples: unknown.slice(0, 6), shapeCorrections,
  bindings: { assetIds: assets.map((a) => a.id), rootIds, rowsCSV: bindings.join("\n"), fields: ["assetIndex", "rootIndex", "affectedPrefixIndex", "numericSuffix"] },
  affectedNodeIds: { encoding: "observed-prefix-ranges-v1", categoryBits: { mutated: 2 }, counts: { created: 0, mutated: ids.size, removed: 0, unique: ids.size }, prefixesFrontCodedCSV: front.join("\n"), rangesCSV: ranges.join("\n") },
  createdNodeIds: [], removedNodeIds: [], masterAvatarFallbackVariantsChanged: false, canonicalRootIdsChanged: false,
};
if (JSON.stringify(result).length > 19000) throw Error("Preflight result exceeds safe response size");
for (const r of selected) {
  const n = r.node;
  if (Math.abs(n.width - n.height) > 0.5) n.resize(Math.max(n.width, n.height), Math.max(n.width, n.height));
  n.setBoundVariable("cornerRadius", fullRadius);
  n.fills = [{ type: "IMAGE", imageHash: r.asset.imageHash, scaleMode: "FILL" }];
  n.clipsContent = true;
  for (const t of r.texts) t.visible = false;
}
return result;
