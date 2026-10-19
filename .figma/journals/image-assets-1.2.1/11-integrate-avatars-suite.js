const page = await figma.getNodeByIdAsync("2:6");
await figma.setCurrentPageAsync(page);
const rootIds = ["5:2","237:18891","5:4","39:24","39:730","39:1132","39:1521","39:1923","39:2310","39:2702","41:2363","41:2816","41:3207","41:3597","41:3982","41:4387","41:4794","41:5151","45:4589","45:5003","45:5363","45:5707","45:6076","45:6451","45:6768","45:7088","48:6454","237:19873","48:7128","48:7437","48:7753","48:8021","52:7472","52:7509","52:7551","52:7581","52:7622","52:7650","52:7684","52:7713","52:7751","53:494","53:1044","53:1272","54:1108","54:1451","54:1764","54:2045","54:2325","54:2600","54:2873","54:3151","55:7541","55:7856","55:8072","59:2549","59:2725","59:2901","59:3077","59:3253","59:3429","59:3605","134:8412","135:8894","136:9476","237:16692","237:17079","237:17522","237:17965"];
const roots = new Set(rootIds);
const assets = [{"id":"alex-morgan","name":"Alex Morgan","componentId":"263:68"},{"id":"isabel-torres","name":"Isabel Torres","componentId":"263:73"},{"id":"leo-martin","name":"Leo Martin","componentId":"263:78"},{"id":"noor-ahmed","name":"Noor Ahmed","componentId":"263:83"},{"id":"daniel-kim","name":"Daniel Kim","componentId":"263:89"},{"id":"olivia-rhye","name":"Olivia Rhye","componentId":"263:94"},{"id":"phoenix-baker","name":"Phoenix Baker","componentId":"263:100"},{"id":"lana-steiner","name":"Lana Steiner","componentId":"263:105"},{"id":"demi-wilkinson","name":"Demi Wilkinson","componentId":"263:111"},{"id":"drew-cano","name":"Drew Cano","componentId":"263:116"},{"id":"amelia-wilson","name":"Amelia Wilson","componentId":"263:121"},{"id":"matias-vega","name":"Matías Vega","componentId":"263:126"},{"id":"sofia-chen","name":"Sofia Chen","componentId":"263:133"},{"id":"lucas-moreau","name":"Lucas Moreau","componentId":"263:138"},{"id":"alex-rivera","name":"Alex Rivera","componentId":"263:143"},{"id":"isabel-moreno","name":"Isabel Moreno","componentId":"263:148"},{"id":"studio-updates","name":"Studio Updates","componentId":"263:154"},{"id":"forma-collective","name":"Forma Collective","componentId":"263:159"}];
const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const initialLetters = (s) => s.split(/\s+/).slice(0, 2).map((t) => t[0]).join("").toUpperCase();
const byName = new Map(assets.map((a) => [normalize(a.name), a]));
const taskOwners = {"Refine the onboarding flow":"Isabel Torres","Document the color tokens":"Alex Morgan","Build the customer table":"Leo Martin","Explore the new dashboard":"Isabel Torres","Review keyboard navigation":"Noor Ahmed","Set up local demo adapters":"Leo Martin","Define the editorial type scale":"Alex Morgan","Write the release notes":"Noor Ahmed","Northstar Studio":"Alex Morgan","Forma Collective":"Isabel Torres","Layers Platform":"Leo Martin","Arc Labs":"Alex Morgan","Sisyphus Systems":"Isabel Torres","Circo Studio":"Noor Ahmed","Goodform":"Alex Morgan"};
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
