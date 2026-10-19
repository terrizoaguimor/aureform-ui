// Three copy-only corrections under the existing Light Brand Guide.
const mutated = new Set();
const affected = new Set();
const changes = [];
let stage = "preflight";
function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}
function hex(color) {
  return "#" + ["r", "g", "b"].map(key =>
    Math.round(color[key] * 255).toString(16).padStart(2, "0"),
  ).join("").toUpperCase();
}
function typography(node) {
  return JSON.stringify({
    fontName: node.fontName, fontSize: node.fontSize,
    textStyleId: node.textStyleId, lineHeight: node.lineHeight,
    letterSpacing: node.letterSpacing, fills: node.fills,
    textAutoResize: node.textAutoResize, width: node.width,
  });
}
try {
  const page = await figma.getNodeByIdAsync("2:2");
  requireCondition(page?.type === "PAGE", "Cover page missing");
  await figma.setCurrentPageAsync(page);
  const guide = await figma.getNodeByIdAsync("27:46");
  requireCondition(guide?.type === "FRAME", "Brand Guide missing");
  requireCondition(guide.resolvedVariableModes["VariableCollectionId:2:36"] === "2:1",
    "Brand Guide must retain its actual Light mode");
  const guideBefore = JSON.stringify({
    width: guide.width, height: guide.height,
    fills: guide.fills, effects: guide.effects,
    explicitVariableModes: guide.explicitVariableModes,
  });
  const variables = await figma.variables.getLocalVariablesAsync();
  const colors = {};
  for (const [role, id, name] of [
    ["background", "VariableID:2:37", "color/background"],
    ["foreground", "VariableID:2:41", "color/foreground"],
    ["primary", "VariableID:2:43", "color/primary"],
  ]) {
    const variable = variables.find(v => v.id === id);
    requireCondition(variable?.resolvedType === "COLOR" && variable.name === name, "Semantic color missing: " + role);
    const resolved = variable.resolveForConsumer(guide);
    requireCondition(resolved.resolvedType === "COLOR", "Semantic color did not resolve: " + role);
    colors[role] = { variableId: id, name, hex: hex(resolved.value), value: resolved.value };
  }
  const specs = [
    ["27:54", "Forest on ivory", "Aurora violet on light"],
    ["27:59", "Ivory on forest", "Light on Aurora violet"],
    ["27:69", "Manrope + Instrument Serif · Ivory #F7F7F2 · Graphite #222C26 · Forest #315D48",
      "Manrope + Instrument Serif · Light " + colors.background.hex + " · Ink " + colors.foreground.hex + " · Aurora violet " + colors.primary.hex],
  ];
  const allTexts = guide.findAllWithCriteria({ types: ["TEXT"] });
  const snapshots = new Map(allTexts.map(node => [node.id, {
    characters: node.characters, typography: typography(node), height: node.height,
  }]));
  const fonts = new Map();
  for (const node of allTexts)
    for (const segment of node.getStyledTextSegments(["fontName"]))
      fonts.set(JSON.stringify(segment.fontName), segment.fontName);
  requireCondition([...fonts.values()].some(font => font.family === "Manrope") &&
    [...fonts.values()].some(font => font.family === "Instrument Serif"), "Verified Guide font recipe changed");
  const plans = [];
  for (const [id, expectedBefore, after] of specs) {
    const node = allTexts.find(text => text.id === id);
    requireCondition(node?.type === "TEXT", "Recorded copy target missing: " + id);
    requireCondition(node.characters === expectedBefore || node.characters === after, "Copy target changed: " + id);
    requireCondition(node.getStyledTextSegments(["fontName"]).length === 1, "Mixed-font target requires inspection: " + id);
    plans.push({ node, before: node.characters, after, heightBefore: node.height });
  }
  await Promise.all([...fonts.values()].map(font => figma.loadFontAsync(font)));
  stage = "copy-update";
  for (const plan of plans) {
    if (plan.before !== plan.after) {
      mutated.add(plan.node.id);
      affected.add(plan.node.id);
      affected.add(plan.node.parent.id);
      // All three targets have one verified font; retain its existing styling.
      plan.node.insertCharacters(plan.before.length, plan.after, "BEFORE");
      plan.node.deleteCharacters(0, plan.before.length);
    }
    requireCondition(plan.node.characters === plan.after, "Copy replacement did not match its plan");
    changes.push({
      id: plan.node.id, before: plan.before, after: plan.after,
      fontName: plan.node.fontName, width: plan.node.width,
      heightBefore: plan.heightBefore, heightAfter: plan.node.height,
    });
  }
  const targetIds = new Set(plans.map(plan => plan.node.id));
  for (const node of allTexts) {
    const before = snapshots.get(node.id);
    requireCondition(typography(node) === before.typography, "Guide typography/style changed: " + node.id);
    requireCondition(node.height === before.height, "Guide text wrapped differently: " + node.id);
    if (!targetIds.has(node.id))
      requireCondition(node.characters === before.characters, "Unrelated Guide copy changed: " + node.id);
  }
  requireCondition(JSON.stringify({
    width: guide.width, height: guide.height,
    fills: guide.fills, effects: guide.effects,
    explicitVariableModes: guide.explicitVariableModes,
  }) === guideBefore, "Guide layout/fill/mode changed");
  affected.add(guide.id);
  return {
    status: "brand-guide-copy-corrected-with-observed-light-colors",
    pageId: page.id, rootId: guide.id,
    createdNodeIds: [], mutatedNodeIds: [...mutated], affectedNodeIds: [...affected],
    colors, changes, loadedFonts: [...fonts.values()],
    typographyPreserved: true, unrelatedCopyPreserved: true,
    geometryFillsAndModesPreserved: true, coverRootUnchanged: "27:2",
    ownerPostfixVisualReview: "pending",
  };
} catch (error) {
  return {
    status: stage === "preflight" ? "needs-prerequisites" : "partial-correction-needs-inspection",
    stage, reason: String(error.message).slice(0, 1200),
    createdNodeIds: [], mutatedNodeIds: [...mutated], affectedNodeIds: [...affected], changes,
  };
}
