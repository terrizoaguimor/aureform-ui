/**
 * Owner execution only, after the current native lease.
 * Evidence: .figma/state.json entities.pages["00 · Cover"], entities.cover.
 * Source counts: catalog.ts, chart.tsx, effects/index.ts, appearance.ts;
 * owner build 17106 registry 1.1.0 / 83.
 *
 * Start with preflight. It reads exact editable text IDs and proposed numeric
 * edits under the two recorded roots. Apply uses the same readback and loads
 * every existing font before touching text. No nodes, styles, variables,
 * pluginData, ledgers, thumbnails or publishing are created or changed.
 * Numeric range edits preserve surrounding mixed text styles and layout.
 * Native screenshots and final 65-root completeness remain owner checks.
 */
const RUN = {
  action: "preflight", // preflight | apply
  targetIds: null, // Optional exact text IDs from preflight; never invent IDs.
};
const FILE_KEY = "lHp5p10yGb7lqXJDnAox0N";
const PAGE_ID = "2:2";
const ROOT_IDS = ["27:2", "27:46"];
const SOURCE_COUNTS = {
  version: "1.1.0",
  suiteRoutes: 64,
  viewsIncludingLanding: 65,
  coreFamilies: 44,
  chartKinds: 13,
  palettes: 6,
  publicEffects: 6,
  registryEntries: 83,
};
const MAX_TARGETS = 30;
const MAX_RETURN_BYTES = 20000;
const mutated = new Set();
let stage = "preflight";

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}
function pageOf(node) {
  while (node && node.type !== "PAGE") node = node.parent;
  return node;
}
function editableText(node, root) {
  for (let parent = node.parent; parent && parent.id !== root.id; parent = parent.parent)
    if (["INSTANCE", "COMPONENT", "COMPONENT_SET"].includes(parent.type))
      return false;
  return true;
}
function countKey(unit, value, text) {
  const name = unit.toLowerCase().replace(/\s+/g, " ");
  if (/registry|registro/.test(name)) return "registryEntries";
  if (/chart|gr[aá]fico/.test(name)) return "chartKinds";
  if (/palette|paleta/.test(name)) return "palettes";
  if (/core|famil|component/.test(name))
    return value === 44 ? "coreFamilies" : null;
  if (/effect|efecto/.test(name))
    return /public|reusable|reutilizable/.test(name) || value === 6
      ? "publicEffects"
      : null;
  if (/theme|tema/.test(name))
    // Two Light/Dark modes are still correct; do not call them six modes.
    return value === 6 && !/light\s*[/&+]\s*dark|claro\s*[/&+]\s*oscuro/i.test(text)
      ? "palettes"
      : null;
  if (/suite|route|ruta|template|plantilla/.test(name))
    return [61, 62, 64, 65].includes(value) ? "suiteRoutes" : null;
  if (/view|screen|vista|pantalla/.test(name))
    return [61, 62, 64, 65].includes(value)
      ? "viewsIncludingLanding"
      : null;
  return null;
}
function numericEdits(text, name) {
  const edits = [];
  const ambiguous = [];
  const counts =
    /(\d+)(\s+)((?:(?:suite|source|core|public|reusable)\s+)?(?:routes?|views?|screens?|templates?|component families|components?|families|palettes?|themes?|effects?|chart kinds?|registry (?:items|entries))|rutas(?: de suite)?|vistas(?: de suite)?|pantallas(?: de suite)?|plantillas|familias(?: de componentes)?|componentes|paletas|temas|efectos(?: reutilizables)?|tipos de gr[aá]fico|elementos de registro)\b/gi;
  for (const match of text.matchAll(counts)) {
    const value = Number(match[1]);
    const key = countKey(match[3], value, text);
    if (!key) {
      ambiguous.push({ count: match[1], unit: match[3] });
      continue;
    }
    const after = String(SOURCE_COUNTS[key]);
    if (match[1] !== after)
      edits.push({
        start: match.index,
        end: match.index + match[1].length,
        before: match[1],
        after,
        sourceCount: key,
      });
  }
  const versions =
    /((?:Aureform(?:\s+UI)?[\s·—/-]*v?|(?:version|versi[oó]n|release|v)\s*))(1\.[01](?:\.0)?)(?![\d.])/gi;
  for (const match of text.matchAll(versions)) {
    const after =
      match[2].split(".").length === 3
        ? SOURCE_COUNTS.version
        : SOURCE_COUNTS.version.split(".").slice(0, 2).join(".");
    if (match[2] !== after)
      edits.push({
        start: match.index + match[1].length,
        end: match.index + match[0].length,
        before: match[2],
        after,
        sourceCount: "version",
      });
  }
  if (/version|release|edition|versi[oó]n/i.test(name) && /^1\.0(?:\.0)?$/.test(text.trim())) {
    const before = text.trim();
    const start = text.indexOf(before);
    edits.push({
      start,
      end: start + before.length,
      before,
      after: before === "1.0.0" ? SOURCE_COUNTS.version : "1.1",
      sourceCount: "version",
    });
  }
  edits.sort((a, b) => b.start - a.start);
  requireCondition(
    edits.every((edit, index) => !index || edit.end <= edits[index - 1].start),
    "Overlapping cover edits require owner inspection",
  );
  return { edits, ambiguous };
}
function patchedText(text, edits) {
  for (const edit of edits)
    text = text.slice(0, edit.start) + edit.after + text.slice(edit.end);
  return text;
}
function utf8Bytes(text) {
  let bytes = 0;
  for (const character of text) {
    const point = character.codePointAt(0);
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}
function receipt(payload) {
  const json = JSON.stringify({
    ...payload,
    fileKey: FILE_KEY,
    pageId: PAGE_ID,
    rootIds: ROOT_IDS,
    sourceCounts: SOURCE_COUNTS,
    createdNodeIds: [],
    mutatedNodeIds: [...mutated],
    nativeCompletionCertified: false,
    ownerVisualReview: "pending",
  });
  requireCondition(
    utf8Bytes(JSON.stringify(json)) <= MAX_RETURN_BYTES,
    "Cover receipt exceeds the response budget; use exact targetIds to narrow the next call",
  );
  return json;
}

try {
  requireCondition(["preflight", "apply"].includes(RUN.action), "Unsupported action");
  requireCondition(!figma.fileKey || figma.fileKey === FILE_KEY, "Wrong Figma file");
  const page = await figma.getNodeByIdAsync(PAGE_ID);
  requireCondition(page?.type === "PAGE", "Recorded Cover page is missing");
  const roots = await Promise.all(ROOT_IDS.map((id) => figma.getNodeByIdAsync(id)));
  requireCondition(
    roots.every((root) => root?.type === "FRAME" && pageOf(root)?.id === PAGE_ID),
    "Recorded cover roots no longer match their page/type",
  );
  await figma.setCurrentPageAsync(page);
  const textById = new Map();
  for (const root of roots)
    for (const node of root.findAllWithCriteria({ types: ["TEXT"] }))
      if (editableText(node, root)) textById.set(node.id, node);
  if (RUN.targetIds)
    requireCondition(
      Array.isArray(RUN.targetIds) &&
        RUN.targetIds.every((id) => textById.has(id)),
      "targetIds must come from editable text read back under the recorded roots",
    );
  const targets = [];
  const ambiguous = [];
  for (const node of textById.values()) {
    if (RUN.targetIds && !RUN.targetIds.includes(node.id)) continue;
    const plan = numericEdits(node.characters, node.name);
    if (plan.ambiguous.length)
      ambiguous.push({ id: node.id, counts: plan.ambiguous });
    if (!plan.edits.length) continue;
    targets.push({
      node,
      before: node.characters,
      after: patchedText(node.characters, plan.edits),
      edits: plan.edits,
    });
  }
  requireCondition(targets.length <= MAX_TARGETS, "Use exact targetIds for a bounded cover update");
  const previews = targets.map((target) => ({
    id: target.node.id,
    name: target.node.name.slice(0, 80),
    before: target.before.slice(0, 160),
    after: target.after.slice(0, 160),
    previewTruncated: target.before.length > 160 || target.after.length > 160,
    edits: target.edits,
  }));
  // Check the full receipt size before any mutation; no text IDs are dropped.
  const preflight = receipt({
    status: "read-only-cover-preflight",
    targets: previews,
    ambiguous,
    editableTextCount: textById.size,
  });
  if (RUN.action === "preflight") return preflight;
  const fonts = new Map();
  for (const target of targets) {
    for (const segment of target.node.getStyledTextSegments(["fontName"]))
      fonts.set(JSON.stringify(segment.fontName), segment.fontName);
    if (target.node.fontName !== figma.mixed)
      fonts.set(JSON.stringify(target.node.fontName), target.node.fontName);
  }
  await Promise.all([...fonts.values()].map((font) => figma.loadFontAsync(font)));
  stage = "numeric-text-update";
  for (const target of targets) {
    requireCondition(target.node.characters === target.before, "Cover text changed after preflight");
    mutated.add(target.node.id);
    for (const edit of target.edits) {
      target.node.insertCharacters(edit.end, edit.after, "BEFORE");
      target.node.deleteCharacters(edit.start, edit.end);
    }
    requireCondition(target.node.characters === target.after, "Cover numeric edit did not match its plan");
  }
  return receipt({
    status: "cover-counts-updated-awaiting-owner-visual-review",
    targets: previews,
    ambiguous,
    loadedFontCount: fonts.size,
  });
} catch (error) {
  return receipt({
    status: stage === "preflight" ? "needs-prerequisites" : "partial-update-needs-owner-inspection",
    stage,
    reason: String(error.message).slice(0, 1200),
  });
}
