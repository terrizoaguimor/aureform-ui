// Scoped, idempotent owner-VIEW correction. Does not edit the shared icon master.
const mutated = new Set();
const affected = new Set();
const repairs = [];
let stage = "preflight";
function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}
function paintState(node) {
  return { fills: node.fills, strokes: node.strokes };
}
function labelState(node) {
  return JSON.stringify({
    characters: node.characters,
    fontName: node.fontName,
    textStyleId: node.textStyleId,
    fills: node.fills,
    references: node.componentPropertyReferences,
  });
}
function containerState(node) {
  return JSON.stringify({
    width: node.width, height: node.height,
    fills: node.fills, effects: node.effects,
    fillStyleId: node.fillStyleId, effectStyleId: node.effectStyleId,
    cornerRadius: node.cornerRadius,
    explicitVariableModes: node.explicitVariableModes,
    componentPropertyReferences: node.componentPropertyReferences,
  });
}
function hex(color) {
  return "#" + ["r", "g", "b"].map(key =>
    Math.round(color[key] * 255).toString(16).padStart(2, "0"),
  ).join("").toUpperCase();
}
try {
  const page = await figma.getNodeByIdAsync("2:3");
  requireCondition(page?.type === "PAGE", "Core page missing");
  await figma.setCurrentPageAsync(page);
  const set = await figma.getNodeByIdAsync("176:4598");
  requireCondition(set?.type === "COMPONENT_SET" && set.children.length === 9, "Shapes matrix changed");
  const definitionsBefore = JSON.stringify(set.componentPropertyDefinitions);
  const variantsBefore = JSON.stringify(set.children.map(node => ({ id: node.id, name: node.name, axes: node.variantProperties })));
  const defaultBefore = set.defaultVariant.id;
  const variables = await figma.variables.getLocalVariablesAsync();
  const variable = variables.find(v => v.id === "VariableID:2:45");
  requireCondition(variable?.resolvedType === "COLOR" && variable.name === "color/primary-foreground", "Recorded control foreground missing");
  const baseGlyph = await figma.getNodeByIdAsync("3:4");
  requireCondition(baseGlyph?.type === "VECTOR", "Shared icon glyph missing");
  const baseBefore = JSON.stringify(paintState(baseGlyph));
  const plans = [];
  const boardPlans = [];
  const fonts = new Map();
  function plan(root, mode, masterId) {
    const label = root.children.find(node => node.type === "TEXT" && node.name === "Label");
    const icon = root.children.find(node => node.type === "INSTANCE" && node.name === "Icon");
    requireCondition(label && icon, root.id + ": Label/Icon missing");
    requireCondition(icon.mainComponent?.id === "3:2", root.id + ": shared icon changed");
    const glyphs = icon.findAllWithCriteria({ types: ["VECTOR"] });
    requireCondition(glyphs.length === 1, root.id + ": unexpected glyph structure");
    requireCondition(label.fills.length === 1 && label.fills[0].type === "SOLID" &&
      label.fills[0].boundVariables?.color?.id === variable.id, root.id + ": Label foreground changed");
    requireCondition(glyphs[0].strokes.some(paint => paint.type === "SOLID"), root.id + ": arrow stroke missing");
    for (const segment of label.getStyledTextSegments(["fontName"]))
      fonts.set(JSON.stringify(segment.fontName), segment.fontName);
    const resolved = variable.resolveForConsumer(label);
    requireCondition(resolved.resolvedType === "COLOR", root.id + ": foreground did not resolve");
    return {
      root, label, icon, glyph: glyphs[0], mode, masterId,
      labelBefore: labelState(label), rootBefore: containerState(root),
      iconReferencesBefore: JSON.stringify(icon.componentPropertyReferences),
      foregroundHex: hex(resolved.value),
      glyphBefore: paintState(glyphs[0]),
    };
  }
  for (const id of ["176:4570", "176:4582", "176:4594"]) {
    const root = await figma.getNodeByIdAsync(id);
    requireCondition(root?.type === "COMPONENT" && root.parent.id === set.id &&
      root.variantProperties.Size === "Large", "Recorded Large master changed: " + id);
    plans.push(plan(root, "Dark", id));
  }
  for (const [reviewId, mode] of [["176:4599", "Dark"], ["176:4696", "Light"]]) {
    const review = await figma.getNodeByIdAsync(reviewId);
    requireCondition(review?.type === "FRAME", "Review missing: " + reviewId);
    let count = 0;
    for (const row of review.children.filter(node => node.type === "FRAME" && node.name.startsWith("Shapes / ")))
      for (const root of row.children.filter(node => node.type === "INSTANCE")) {
        const master = await root.getMainComponentAsync();
        if (master?.type !== "COMPONENT" || master.variantProperties.Size !== "Large") continue;
        requireCondition(plans.some(entry => entry.root.id === master.id), "Review Large master mismatch");
        boardPlans.push(plan(root, mode, master.id));
        count++;
      }
    requireCondition(count === 3, reviewId + ": expected three Large examples");
    affected.add(reviewId);
  }
  await Promise.all([...fonts.values()].map(font => figma.loadFontAsync(font)));
  stage = "foreground-binding";
  function align(entry, kind) {
    const resolved = variable.resolveForConsumer(entry.label).value;
    for (const field of ["fills", "strokes"]) {
      const paints = entry.glyph[field];
      if (!paints.some(paint => paint.type === "SOLID" && paint.boundVariables?.color?.id !== variable.id)) continue;
      mutated.add(entry.glyph.id);
      entry.glyph[field] = paints.map(paint => paint.type === "SOLID"
        ? figma.variables.setBoundVariableForPaint({
          ...paint, color: { r: resolved.r, g: resolved.g, b: resolved.b },
        }, "color", variable)
        : paint);
      repairs.push({ id: entry.glyph.id, field, kind });
    }
    for (const node of [entry.root, entry.icon, entry.glyph]) affected.add(node.id);
  }
  for (const entry of plans) align(entry, "Large master");
  // Board glyphs normally inherit the corrected master; repair only a stale explicit override.
  for (const entry of boardPlans) {
    entry.glyph = await figma.getNodeByIdAsync(entry.glyph.id);
    requireCondition(entry.glyph?.type === "VECTOR", "Propagated glyph missing");
    align(entry, "stale board override");
  }
  const verified = [];
  for (const entry of [...plans, ...boardPlans]) {
    requireCondition(labelState(entry.label) === entry.labelBefore, "Label changed: " + entry.label.id);
    requireCondition(containerState(entry.root) === entry.rootBefore, "Container geometry/style changed: " + entry.root.id);
    requireCondition(JSON.stringify(entry.icon.componentPropertyReferences) === entry.iconReferencesBefore, "Icon swap/visibility references changed");
    const solidPaints = [...entry.glyph.fills, ...entry.glyph.strokes].filter(paint => paint.type === "SOLID");
    requireCondition(solidPaints.length > 0 && solidPaints.every(paint => paint.boundVariables?.color?.id === variable.id),
      "Glyph foreground alias did not match Label: " + entry.glyph.id);
    const labelHex = hex(variable.resolveForConsumer(entry.label).value);
    const glyphHex = hex(variable.resolveForConsumer(entry.glyph).value);
    requireCondition(labelHex === glyphHex, "Resolved glyph foreground differs from Label");
    requireCondition(labelHex === (entry.mode === "Light" ? "#FFFFFF" : "#080D17"), "Observed foreground mode changed");
    verified.push({
      rootId: entry.root.id, masterId: entry.masterId, mode: entry.mode,
      labelId: entry.label.id, iconId: entry.icon.id, glyphId: entry.glyph.id,
      variableId: variable.id, labelHex, glyphHex,
      labelUnchanged: true, geometryAndStylesUnchanged: true,
      glyphBefore: entry.glyphBefore, glyphAfter: paintState(entry.glyph),
    });
  }
  requireCondition(JSON.stringify(paintState(baseGlyph)) === baseBefore, "Shared icon master changed");
  requireCondition(JSON.stringify(set.componentPropertyDefinitions) === definitionsBefore, "Shape/Size properties changed");
  requireCondition(JSON.stringify(set.children.map(node => ({ id: node.id, name: node.name, axes: node.variantProperties }))) === variantsBefore,
    "Shapes variants changed");
  requireCondition(set.defaultVariant.id === defaultBefore, "Shapes default changed");
  affected.add(set.id);
  return {
    status: "control-foreground-corrected-and-mode-verified",
    pageId: page.id, setId: set.id,
    createdNodeIds: [], mutatedNodeIds: [...mutated], affectedNodeIds: [...affected],
    repairs, verified, loadedFonts: [...fonts.values()],
    sharedIconMasterUnchanged: true, shapeSizePropertiesUnchanged: true,
    ownerPostfixVisualReview: "pending",
  };
} catch (error) {
  return {
    status: stage === "preflight" ? "needs-prerequisites" : "partial-correction-needs-inspection",
    stage, reason: String(error.message).slice(0, 1200),
    createdNodeIds: [], mutatedNodeIds: [...mutated], affectedNodeIds: [...affected], repairs,
  };
}
