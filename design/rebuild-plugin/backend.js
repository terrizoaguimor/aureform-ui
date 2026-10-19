/* SPDX-License-Identifier: Apache-2.0
 * Scoped reconstruction from application tokens and observed native family axes.
 * It is not a serializer/importer for a complete Figma file.
 */

function afHex(value) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error("Expected a six-digit color in the supplied tokens.");
  }
  return {
    r: parseInt(value.slice(1, 3), 16) / 255,
    g: parseInt(value.slice(3, 5), 16) / 255,
    b: parseInt(value.slice(5, 7), 16) / 255,
  };
}

function afValidateTokens(tokens) {
  if (!tokens || typeof tokens !== "object" || !tokens.primitives || !tokens.semantic ||
      !tokens.spacing || !tokens.radius || !Array.isArray(tokens.palettes) ||
      tokens.palettes.length < 1 || tokens.palettes.length > 6 ||
      Object.keys(tokens.primitives).length > 1024) {
    throw new Error("Choose the supplied Aureform application token JSON.");
  }
  for (const value of Object.values(tokens.primitives)) afHex(value);
  for (const palette of tokens.palettes) {
    if (!/^[a-z][a-z0-9-]{0,23}$/.test(palette.id) ||
        !Array.isArray(palette.colors) || palette.colors.length !== 3) {
      throw new Error("Invalid palette definition.");
    }
    palette.colors.forEach(afHex);
    for (const mode of ["light", "dark"]) {
      for (const name of Object.keys(tokens.semantic)) afHex(palette.themes?.[mode]?.[name]);
    }
  }
  for (const group of [tokens.spacing, tokens.radius]) {
    for (const value of Object.values(group)) {
      if (!Number.isFinite(value) || value < 0 || value > 10000) {
        throw new Error("Invalid spacing or radius token.");
      }
    }
  }
}

async function afRebuild(tokens, options, progress = () => {}) {
  afValidateTokens(tokens);
  const palette = tokens.palettes.find(item => item.id === options.palette);
  if (!palette || !["light", "dark"].includes(options.mode)) throw new Error("Choose a palette and appearance.");
  const prefix = String(options.prefix || "Aureform community").trim().slice(0, 40);
  if (!prefix || /[\r\n\u0000]/.test(prefix)) throw new Error("Choose a short, single-line library name.");
  const boardName = `${prefix} / ${palette.name} / ${options.mode === "dark" ? "Dark" : "Light"}`;
  const page = figma.currentPage;
  const existing = page.children.find(node => node.name === boardName && node.type === "FRAME");
  if (existing) return { boardId: existing.id, reused: true, createdNodeIds: [], createdVariableIds: [], createdCollectionIds: [] };

  progress("Checking fonts");
  const available = await figma.listAvailableFontsAsync();
  const font = weight => {
    const match = available.find(item => item.fontName.family === "Manrope" &&
      item.fontName.style.replace(/\s/g, "").toLowerCase() === weight.toLowerCase());
    if (!match) throw new Error("Manrope Regular, Medium and SemiBold are required. Install the supplied OFL font before rebuilding.");
    return match.fontName;
  };
  const fonts = { regular: font("Regular"), medium: font("Medium"), semibold: font("SemiBold") };
  await Promise.all(Object.values(fonts).map(item => figma.loadFontAsync(item)));
  const loadedFonts = new Map(Object.values(fonts).map(item => [JSON.stringify(item), Promise.resolve()]));
  const createdNodeIds = [], createdVariableIds = [], createdCollectionIds = [], createdStyleIds = [];
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();
  const styles = await figma.getLocalTextStylesAsync();
  const theme = palette.themes[options.mode];
  const collection = (name, twoModes) => {
    let value = collections.find(item => item.name === name);
    if (!value) {
      value = figma.variables.createVariableCollection(name);
      createdCollectionIds.push(value.id);
      collections.push(value);
      value.renameMode(value.modes[0].modeId, twoModes ? "Light" : "Value");
      if (twoModes) value.addMode("Dark");
    }
    if (twoModes && (!value.modes.find(item => item.name === "Light") || !value.modes.find(item => item.name === "Dark"))) {
      throw new Error(`The existing ${name} collection needs Light and Dark modes. Choose a fresh library name.`);
    }
    return value;
  };
  const variable = (name, owner, type, scopes, syntax, values) => {
    const existingVariable = variables.find(item => item.variableCollectionId === owner.id && item.name === name);
    if (existingVariable) {
      if (existingVariable.resolvedType !== type) throw new Error("An existing variable has a different type. Choose a fresh library name.");
      return existingVariable;
    }
    const value = figma.variables.createVariable(name, owner, type);
    value.scopes = scopes;
    value.setVariableCodeSyntax("WEB", `var(${syntax})`);
    for (const [mode, modeValue] of values) value.setValueForMode(mode, modeValue);
    variables.push(value);
    createdVariableIds.push(value.id);
    return value;
  };
  const track = node => { createdNodeIds.push(node.id); return node; };
  const frame = (name, direction = "VERTICAL") => {
    const value = track(figma.createFrame());
    value.name = name; value.layoutMode = direction;
    value.primaryAxisSizingMode = "AUTO"; value.counterAxisSizingMode = "AUTO";
    value.itemSpacing = 16; value.fills = []; value.clipsContent = false;
    return value;
  };
  const text = async (characters, size = 13, weight = "regular") => {
    const value = track(figma.createText());
    const initialKey = JSON.stringify(value.fontName);
    if (!loadedFonts.has(initialKey)) loadedFonts.set(initialKey, figma.loadFontAsync(value.fontName));
    await loadedFonts.get(initialKey);
    value.fontName = fonts[weight]; value.fontSize = size;
    value.characters = characters; value.textAutoResize = "WIDTH_AND_HEIGHT";
    value.name = characters.split("\n")[0].slice(0, 64);
    return value;
  };

  try {
    progress("Rebuilding local variables");
    const primitives = collection(`${prefix} · Primitives`, false);
    const primitiveMode = primitives.modes[0].modeId;
    const primitiveByColor = new Map();
    for (const [name, value] of Object.entries(tokens.primitives)) {
      const item = variable(name, primitives, "COLOR", [], `--primitive-${name}`, [[primitiveMode, afHex(value)]]);
      primitiveByColor.set(value.toUpperCase(), item);
    }
    const colors = {};
    const modes = {};
    for (const item of tokens.palettes) {
      const owner = collection(`${prefix} · Color · ${item.name}`, true);
      const light = owner.modes.find(mode => mode.name === "Light").modeId;
      const dark = owner.modes.find(mode => mode.name === "Dark").modeId;
      modes[item.id] = { collection: owner, light, dark };
      colors[item.id] = {};
      for (const [name, role] of Object.entries(tokens.semantic)) {
        const values = [];
        for (const [modeName, modeId] of [["light", light], ["dark", dark]]) {
          const value = item.themes[modeName][name];
          let primitive = primitiveByColor.get(value.toUpperCase());
          if (!primitive) {
            primitive = variable(`derived/${value.slice(1).toLowerCase()}`, primitives, "COLOR", [],
              `--primitive-derived-${value.slice(1).toLowerCase()}`, [[primitiveMode, afHex(value)]]);
            primitiveByColor.set(value.toUpperCase(), primitive);
          }
          values.push([modeId, figma.variables.createVariableAlias(primitive)]);
        }
        const scopes = role.scope === "text" ? ["TEXT_FILL"] :
          role.scope === "stroke" ? ["STROKE_COLOR"] : ["FRAME_FILL", "SHAPE_FILL"];
        colors[item.id][name] = variable(name, owner, "COLOR", scopes, `--${name}`, values);
      }
    }
    const dimensions = collection(`${prefix} · Dimension`, false);
    const dimensionMode = dimensions.modes[0].modeId;
    const measures = {};
    for (const [group, source, css, scope] of [
      ["spacing", tokens.spacing, "space", "GAP"], ["radius", tokens.radius, "radius", "CORNER_RADIUS"],
    ]) {
      for (const [name, value] of Object.entries(source)) {
        measures[`${group}/${name}`] = variable(`${group}/${name}`, dimensions, "FLOAT", [scope],
          `--${css}-${name}`, [[dimensionMode, value]]);
      }
    }
    const selected = colors[palette.id];
    const selectedMode = modes[palette.id][options.mode];
    const paint = (name, opacity = 1) => figma.variables.setBoundVariableForPaint(
      { type: "SOLID", color: afHex(theme[name]), opacity }, "color", selected[name]);
    const labelStyles = {};
    for (const [name, size, weight] of [["Body", 13, "regular"], ["Label", 13, "semibold"], ["Title", 18, "semibold"]]) {
      let style = styles.find(item => item.name === `${prefix} / ${name}`);
      if (!style) {
        style = figma.createTextStyle(); createdStyleIds.push(style.id);
        style.name = `${prefix} / ${name}`; style.fontName = fonts[weight]; style.fontSize = size;
        style.lineHeight = { unit: "PERCENT", value: 150 }; styles.push(style);
      }
      labelStyles[name] = style;
    }
    const board = frame(boardName);
    const right = Math.max(0, ...page.children.filter(node => node.id !== board.id).map(node => node.x + node.width));
    board.x = right + 160; board.y = 80;
    board.paddingTop = board.paddingRight = board.paddingBottom = board.paddingLeft = 36;
    board.itemSpacing = 28; board.fills = [paint("background")];
    board.setExplicitVariableModeForCollection(modes[palette.id].collection, selectedMode);
    const heading = await text("Aureform · Community foundations", 28, "semibold");
    heading.fills = [paint("foreground")]; board.appendChild(heading);
    const note = await text("Apache 2.0 · Native starter variants · Original source and design resources in the repository", 13);
    note.fills = [paint("muted-foreground")]; board.appendChild(note);

    const swatches = frame("Semantic colors");
    const names = Object.keys(tokens.semantic);
    for (let offset = 0; offset < names.length; offset += 4) {
      const row = frame("Color row", "HORIZONTAL");
      for (const name of names.slice(offset, offset + 4)) {
        const chip = frame(name, "HORIZONTAL"); chip.counterAxisAlignItems = "CENTER"; chip.itemSpacing = 10;
        const swatch = track(figma.createRectangle()); swatch.resize(32, 32); swatch.cornerRadius = 8;
        swatch.fills = [tokens.semantic[name].scope === "fill" ? paint(name) : { type: "SOLID", color: afHex(theme[name]) }];
        chip.appendChild(swatch);
        const caption = await text(`${name}\n${theme[name]}`, 11);
        caption.fills = [paint("foreground")]; chip.appendChild(caption); row.appendChild(chip);
      }
      swatches.appendChild(row);
    }
    board.appendChild(swatches);
    const shade = (radius, alpha, y) => ({ type: "DROP_SHADOW", visible: true, radius,
      color: { r: 0, g: 0, b: 0, a: alpha }, offset: { x: 0, y }, spread: 0,
      blendMode: "NORMAL", showShadowBehindNode: true });
    const gradient = (card = false) => ({
      type: "GRADIENT_LINEAR",
      gradientTransform: [[0.819, 0.573, -0.196], [-0.573, 0.819, 0.377]],
      gradientStops: (card ? [theme.surface, theme.accent] : palette.colors).map((value, index, values) => ({
        position: index / (values.length - 1), color: { ...afHex(value), a: 1 },
      })),
    });
    const applyAppearance = (node, appearance, hover, card = false) => {
      node.fills = appearance === "Gradient" ? [gradient(card)] :
        [paint(card || ["Outline", "Glass"].includes(appearance) ? "surface" : appearance === "Soft" ? "accent" : "primary",
          appearance === "Glass" ? 0.8 : 1)];
      node.strokes = ["Outline", "Glass"].includes(appearance) || card ? [paint("border")] : [];
      node.strokeWeight = 1;
      node.effects = appearance === "Glass" ? [{ type: "BACKGROUND_BLUR", visible: true, radius: 18 }] :
        (hover || (card && ["Elevated", "Gradient"].includes(appearance))) ?
          [shade(24, options.mode === "dark" ? 0.28 : 0.1, 8)] : [];
      node.setExplicitVariableModeForCollection(modes[palette.id].collection, selectedMode);
    };
    const family = async (name, variants, columns, gap, width, height, description) => {
      const section = frame(name); const title = await text(name, 20, "semibold");
      title.fills = [paint("foreground")]; section.appendChild(title);
      const set = track(figma.combineAsVariants(variants, section));
      set.name = name; set.description = description;
      set.fills = []; set.strokes = []; set.clipsContent = false;
      for (let i = 0; i < variants.length; i++) {
        variants[i].x = 16 + (i % columns) * (width + gap);
        variants[i].y = 16 + Math.floor(i / columns) * (height + gap);
      }
      set.resize(32 + Math.min(columns, variants.length) * (width + gap) - gap,
        32 + Math.ceil(variants.length / columns) * (height + gap) - gap);
      board.appendChild(section);
      return set;
    };

    progress("Creating Button, Badge and Card starter variants");
    const appearances = ["Solid", "Soft", "Outline", "Glass", "Gradient"];
    const buttons = [];
    for (const appearance of appearances) {
      for (const state of ["Default", "Hover", "Disabled"]) {
        const item = track(figma.createComponent());
        item.name = `Appearance=${appearance}, State=${state}`; item.layoutMode = "HORIZONTAL";
        item.primaryAxisAlignItems = "CENTER"; item.counterAxisAlignItems = "CENTER";
        item.resize(180, 42); item.cornerRadius = 10.4; item.itemSpacing = 12;
        applyAppearance(item, appearance, state === "Hover"); item.opacity = state === "Disabled" ? 0.45 : 1;
        const caption = await text("Continue", 13, "semibold");
        await caption.setTextStyleIdAsync(labelStyles.Label.id);
        caption.fills = [paint(["Solid", "Gradient"].includes(appearance) ? "primary-foreground" :
          appearance === "Soft" ? "accent-foreground" : "foreground")];
        item.appendChild(caption); buttons.push(item);
      }
    }
    const buttonSet = await family("Button / Appearance", buttons, 5, 16, 180, 42,
      "Native starter recreation. Source: src/components/ui/button.tsx. Hover is a visual specimen, not a forced source prop.");
    const buttonLabel = buttonSet.addComponentProperty("Label", "TEXT", "Continue");
    for (const item of buttons) item.children[0].componentPropertyReferences = { characters: buttonLabel };

    const badges = [];
    for (const appearance of appearances) {
      const item = track(figma.createComponent());
      item.name = `Appearance=${appearance}`; item.layoutMode = "HORIZONTAL";
      item.primaryAxisAlignItems = "CENTER"; item.counterAxisAlignItems = "CENTER";
      item.resize(114, 26); item.cornerRadius = 999;
      applyAppearance(item, appearance, false);
      const caption = await text("Continue", 11, "medium");
      caption.fills = [paint(["Solid", "Gradient"].includes(appearance) ? "primary-foreground" :
        appearance === "Soft" ? "accent-foreground" : "foreground")];
      item.appendChild(caption); badges.push(item);
    }
    const badgeSet = await family("Badge / Appearance", badges, 5, 16, 114, 26,
      "Native starter recreation. Source: src/components/ui/badge.tsx. Edit Label on instances.");
    const badgeLabel = badgeSet.addComponentProperty("Label", "TEXT", "Continue");
    for (const item of badges) item.children[0].componentPropertyReferences = { characters: badgeLabel };

    const cards = [];
    for (const appearance of ["Flat", "Elevated", "Glass", "Gradient"]) {
      for (const state of ["Default", "Hover"]) {
        const item = track(figma.createComponent());
        item.name = `Appearance=${appearance}, State=${state}`; item.layoutMode = "VERTICAL";
        item.resize(312, 180); item.primaryAxisSizingMode = "FIXED"; item.counterAxisSizingMode = "FIXED";
        item.paddingTop = item.paddingRight = item.paddingBottom = item.paddingLeft = 20;
        item.itemSpacing = 12; item.cornerRadius = 16;
        if (measures["spacing/5"]) {
          for (const property of ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"]) item.setBoundVariable(property, measures["spacing/5"]);
        }
        applyAppearance(item, appearance, state === "Hover", true);
        const title = await text("A considered surface", 18, "semibold");
        await title.setTextStyleIdAsync(labelStyles.Title.id); title.fills = [paint("foreground")]; item.appendChild(title);
        const body = await text("Color, depth and clarity.\nA place for your next idea.", 13);
        await body.setTextStyleIdAsync(labelStyles.Body.id); body.fills = [paint("muted-foreground")];
        body.textAutoResize = "HEIGHT"; body.resize(272, 40); item.appendChild(body);
        const action = track(buttons[3].createInstance());
        item.appendChild(action); action.resize(130, 32); action.setProperties({ [buttonLabel]: "View details" });
        cards.push(item);
      }
    }
    const cardSet = await family("Card / Material", cards, 4, 24, 312, 180,
      "Native starter recreation. Source: src/components/ui/card.tsx. Title is editable; body and actions are explicit examples.");
    const cardTitle = cardSet.addComponentProperty("Title", "TEXT", "A considered surface");
    for (const item of cards) item.children[0].componentPropertyReferences = { characters: cardTitle };
    return {
      boardId: board.id, reused: false, createdNodeIds, createdVariableIds, createdCollectionIds, createdStyleIds,
      families: 3, componentVariants: buttons.length + badges.length + cards.length,
      palettes: tokens.palettes.length, modes: ["Light", "Dark"],
      componentSetIds: [buttonSet.id, badgeSet.id, cardSet.id],
    };
  } catch (error) {
    // Only this operation's newly created objects are rolled back.
    for (const id of [...createdNodeIds].reverse()) {
      const node = await figma.getNodeByIdAsync(id);
      if (node) node.remove();
    }
    for (const id of [...createdVariableIds].reverse()) {
      const item = await figma.variables.getVariableByIdAsync(id);
      if (item) item.remove();
    }
    for (const id of [...createdCollectionIds].reverse()) {
      const item = await figma.variables.getVariableCollectionByIdAsync(id);
      if (item) item.remove();
    }
    for (const id of [...createdStyleIds].reverse()) {
      const item = await figma.getStyleByIdAsync(id);
      if (item) item.remove();
    }
    throw error;
  }
}
