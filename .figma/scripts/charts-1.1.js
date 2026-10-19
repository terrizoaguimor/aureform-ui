/**
 * Aureform native Chart 1.1 — PREPARED, NOT EXECUTED.
 * A separate explicit owner lease is required for each phase below.
 * fileKey: lHp5p10yGb7lqXJDnAox0N
 * skillNames: figma-use,figma-generate-library,figma-generate-design
 * PHASE='library': existing Chart set 23:501 on Core 2:3; preserve default 23:444,
 * Label#23:14 and all original six variant IDs discovered from the actual set.
 * PHASE='screen': existing Charts root 59:2901 on Templates 2:5.
 * Execute sequentially, one page switch per invocation. No new file/page,
 * variables, styles, state-ledger writes, captures or raster UI imports.
 * Source is frozen /tmp/aureform-ui-build and read-only EN browser3010 data/SVG.
 */

// BEGIN SHARED NATIVE RECONCILER
async function nativeContext(rootIds, expectedPageId, requiredAssets, options = {}) {
  // Hidden instance descendants must remain accessible for font loading and exact ID audits.
  figma.skipInvisibleInstanceChildren = false;
  const fileKey = 'lHp5p10yGb7lqXJDnAox0N';
  const created = new Set(), mutated = new Set(), removed = new Set();
  const plans = new Map(), warnings = [], preserved = [];
  const ledger = {
    Chart: { id: '23:501', type: 'COMPONENT_SET', fields: { 'Label#23:14': 'TEXT' } },
    Button: { id: '3:113', type: 'COMPONENT_SET', fields: { 'Label#3:0': 'TEXT', 'Show icon#3:28': 'BOOLEAN', 'Icon#3:56': 'INSTANCE_SWAP' } },
    ButtonAppearance: { id: '97:655', type: 'COMPONENT_SET', fields: { 'Label#97:0': 'TEXT' } },
    BadgeAppearance: { id: '97:666', type: 'COMPONENT_SET', fields: { 'Label#97:16': 'TEXT' } },
    CardMaterial: { id: '97:715', type: 'COMPONENT_SET', fields: { 'Title#97:22': 'TEXT' } },
    MetricCard: { id: '3:160', type: 'COMPONENT_SET', fields: { 'Label#3:105': 'TEXT', 'Value#3:108': 'TEXT' } },
    Badge: { id: '3:124', type: 'COMPONENT_SET', fields: { 'Label#3:84': 'TEXT' } },
    Input: { id: '3:133', type: 'COMPONENT_SET', fields: { 'Value#3:90': 'TEXT' } },
    Select: { id: '15:98', type: 'COMPONENT_SET', fields: { 'Label#15:11': 'TEXT' } },
    InputOTP: { id: '15:387', type: 'COMPONENT_SET', fields: { 'Label#15:31': 'TEXT' } },
    Checkbox: { id: '15:14', type: 'COMPONENT_SET', fields: {} },
    SidebarItem: { id: '3:142', type: 'COMPONENT_SET', fields: { 'Label#3:95': 'TEXT', 'Icon#3:98': 'INSTANCE_SWAP' } },
    Avatar: { id: '3:149', type: 'COMPONENT_SET', fields: { 'Initials#3:101': 'TEXT' } },
    DashboardShell: { id: '30:969', type: 'COMPONENT_SET', fields: { 'Content#30:0': 'SLOT' } },
    RevenuePanel: { id: '6:2', type: 'COMPONENT', fields: {} },
    PlanBreakdown: { id: '6:33', type: 'COMPONENT', fields: {} },
    CustomerTable: { id: '6:51', type: 'COMPONENT', fields: {} },
    AIComposer: { id: '6:118', type: 'COMPONENT', fields: {} },
  };
  const iconIds = {
    ArrowUpRight: '3:2', AureformMark: '9:46', LayoutDashboard: '9:6',
    ChartNoAxesCombined: '9:12', Sparkles: '9:15', Users: '9:18',
    Layers: '9:23', BookOpen: '9:26', Settings: '9:29', Search: '9:33',
    Bell: '9:37', Plus: '9:43',
  };
  function tree(node) {
    const result = [node];
    if ('children' in node) for (const child of node.children) result.push(...tree(child));
    return result;
  }
  function mark(node) { for (const child of tree(node)) mutated.add(child.id); }
  function pageOf(node) {
    let parent = node;
    while (parent && parent.type !== 'PAGE') parent = parent.parent;
    return parent;
  }
  function ownerOf(node) {
    return node.type === 'COMPONENT' && node.parent?.type === 'COMPONENT_SET' ? node.parent : node;
  }
  const roots = await Promise.all(rootIds.map(id => figma.getNodeByIdAsync(id)));
  const rootFailures = roots.flatMap((root, index) => {
    const expectedType = options.rootType ?? 'FRAME';
    if (!root || root.type !== expectedType) return [{ id: rootIds[index], expected: expectedType, actual: root?.type ?? null }];
    const page = pageOf(root);
    if (!page || page.id !== expectedPageId) return [{ id: root.id, expectedPageId, actualPageId: page?.id ?? null }];
    let ancestor = root.parent;
    while (ancestor && ancestor.type !== 'PAGE') {
      if (['INSTANCE', 'COMPONENT', 'COMPONENT_SET'].includes(ancestor.type)) return [{ id: root.id, invalidAncestor: ancestor.id }];
      ancestor = ancestor.parent;
    }
    return [];
  });
  if (figma.fileKey && figma.fileKey !== fileKey) rootFailures.push({ expectedFileKey: fileKey, actualFileKey: figma.fileKey });
  if (rootFailures.length) return { ready: false, status: 'root-verification-failed', rootFailures, createdNodeIds: [], mutatedNodeIds: [] };
  const page = pageOf(roots[0]);
  // The sole page switch in this invocation. Reading other pages below never switches.
  await figma.setCurrentPageAsync(page);
  const names = [...new Set(requiredAssets)];
  const [assetNodes, iconNodes, variables, collections, textStyles, paintStyles, effectStyles, availableFonts] = await Promise.all([
    Promise.all(names.map(name => figma.getNodeByIdAsync(ledger[name].id))),
    Promise.all(Object.values(iconIds).map(id => figma.getNodeByIdAsync(id))),
    figma.variables.getLocalVariablesAsync(), figma.variables.getLocalVariableCollectionsAsync(),
    figma.getLocalTextStylesAsync(), figma.getLocalPaintStylesAsync(),
    figma.getLocalEffectStylesAsync(), figma.listAvailableFontsAsync(),
  ]);
  const assets = Object.fromEntries(names.map((name, index) => [name, assetNodes[index]]));
  const icons = Object.fromEntries(Object.keys(iconIds).map((name, index) => [name, iconNodes[index]]));
  const prerequisites = [];
  for (const name of names) {
    const node = assets[name], spec = ledger[name];
    if (!node || node.type !== spec.type) { prerequisites.push({ asset: name, id: spec.id, expectedType: spec.type }); continue; }
    const owner = ownerOf(node);
    const definitions = owner.componentPropertyDefinitions;
    for (const [key, type] of Object.entries(spec.fields)) {
      if (definitions[key]?.type !== type) prerequisites.push({ asset: name, id: spec.id, requiredProperty: key, expectedType: type });
    }
  }
  for (const [name, node] of Object.entries(icons)) {
    if (!node || node.type !== 'COMPONENT') prerequisites.push({ asset: 'Icon/' + name, id: iconIds[name], expectedType: 'COMPONENT' });
  }
  const colorCollection = collections.find(c => c.id === 'VariableCollectionId:2:36');
  const dimensionCollection = collections.find(c => c.id === 'VariableCollectionId:2:58');
  const darkMode = colorCollection?.modes.find(m => m.name === 'Dark');
  if (!darkMode || !dimensionCollection) prerequisites.push({ asset: 'Existing Aurora/Dark and dimension foundations' });
  const fonts = {};
  for (const [role, style] of Object.entries({ regular: 'regular', semibold: 'semibold', bold: 'bold', extraBold: 'extrabold' })) {
    fonts[role] = availableFonts.map(f => f.fontName).find(f => f.family === 'Manrope' && f.style.replace(/\s/g, '').toLowerCase() === style);
  }
  for (const role of ['regular', 'semibold', 'bold']) if (!fonts[role]) prerequisites.push({ asset: 'Manrope', fontStyle: role });
  if (!fonts.extraBold) fonts.extraBold = fonts.bold;
  const manropeStyles = textStyles.filter(s => s.fontName.family === 'Manrope');
  if (!manropeStyles.length) prerequisites.push({ asset: 'Existing Manrope text styles' });
  for (const kind of ['hero', 'surface', 'control']) {
    if (!paintStyles.some(s => s.name === 'Aureform/Gradient/Dark/' + kind)) prerequisites.push({ asset: 'Aureform/Gradient/Dark/' + kind });
  }
  // Owner-confirmed ledger IDs, verified against the exact master names and keys.
  // No master mutations, no second page switch, no reconstructed shader IDs.
  const effectLedger = {
    ShaderBackground: { id: '104:766', label: 'Title#104:25' },
    GradientBackground: { id: '104:734', label: 'Title#104:21' },
    SpotlightCard: { id: '104:777', label: 'Title#104:30' },
    GlowBorder: { id: '104:786', label: 'Title#104:33' },
    TiltCard: { id: '104:797', label: 'Title#104:36' },
    MagneticButton: { id: '104:804', label: 'Label#104:39' },
  };
  const effectNames = options.effects === false ? [] : Object.keys(effectLedger);
  const effectNodes = await Promise.all(effectNames.map(name => figma.getNodeByIdAsync(effectLedger[name].id)));
  const effects = {};
  for (const [index, name] of effectNames.entries()) {
    const node = effectNodes[index], spec = effectLedger[name];
    if (!node || node.type !== 'COMPONENT_SET' || node.name !== name || node.componentPropertyDefinitions[spec.label]?.type !== 'TEXT') {
      prerequisites.push({ asset: name, id: spec.id, requiredProperty: spec.label, reason: 'Exact owner-confirmed effect schema did not match' });
    } else effects[name] = node;
  }
  if (options.effects !== false && !effects.ShaderBackground) prerequisites.push({ asset: 'ShaderBackground', requiredVariant: 'Kind=Aurora', owner: 'effect-master builder' });
  function variant(node, axes = {}) {
    if (node.type === 'COMPONENT') {
      if (Object.keys(axes).length) throw new Error(node.name + ' must be a component set for ' + JSON.stringify(axes));
      return node;
    }
    if (node.type !== 'COMPONENT_SET') throw new Error('Expected a component or component set');
    const definitions = node.componentPropertyDefinitions;
    for (const [key, value] of Object.entries(axes)) {
      if (definitions[key]?.type !== 'VARIANT' || !definitions[key].variantOptions.includes(value)) throw new Error(node.name + ' has no verified ' + key + '=' + value);
    }
    const result = node.children.find(n => n.type === 'COMPONENT' && Object.entries(axes).every(([key, value]) => n.variantProperties?.[key] === value));
    if (!result) throw new Error('Missing exact variant in ' + node.name);
    return result;
  }
  let aurora;
  if (effects.ShaderBackground) {
    try {
      aurora = variant(effects.ShaderBackground, { Kind: 'Aurora' });
      const shaderPaints = tree(aurora).flatMap(n => ['fills', 'strokes'].flatMap(field => field in n && Array.isArray(n[field]) ? n[field].filter(p => p.type === 'SHADER') : []));
      // The exact owner-confirmed Aurora master is authoritative. Native
      // imported/versioned shader IDs may differ from resource UUIDs. Preserve
      // its actual paint and controls; do not assert a stale imported ID.
      if (aurora.id !== '104:735' || !shaderPaints.some(p => typeof p.id === 'string' && p.id.length)) {
        prerequisites.push({ asset: 'ShaderBackground / Kind=Aurora',
          reason: 'The owner-confirmed 104:735 master must contain a real native shader paint',
          actualShaderIds: shaderPaints.map(p => p.id) });
      }
    } catch (error) { prerequisites.push({ asset: 'ShaderBackground', reason: String(error.message) }); }
  }
  if (prerequisites.length) return { ready: false, status: 'needs-prerequisites', pageId: page.id, prerequisites, createdNodeIds: [], mutatedNodeIds: [] };
  const fontSet = new Map();
  for (const node of [...roots, ...Object.values(assets), ...Object.values(icons), ...Object.values(effects)]) {
    for (const text of tree(node).filter(n => n.type === 'TEXT')) {
      for (const segment of text.getStyledTextSegments(['fontName'])) fontSet.set(JSON.stringify(segment.fontName), segment.fontName);
      if (text.characters.length === 0 && text.fontName !== figma.mixed) fontSet.set(JSON.stringify(text.fontName), text.fontName);
    }
  }
  for (const font of [...Object.values(fonts), ...manropeStyles.map(s => s.fontName)]) fontSet.set(JSON.stringify(font), font);
  await Promise.all([...fontSet.values()].map(font => figma.loadFontAsync(font)));
  const byVariableId = new Map(variables.map(v => [v.id, v]));
  const colors = new Map(variables.filter(v => v.variableCollectionId === colorCollection.id).map(v => [v.name, v]));
  const dimensions = variables.filter(v => v.variableCollectionId === dimensionCollection.id);
  function valueOf(variable, stack = new Set()) {
    if (!variable || stack.has(variable.id)) throw new Error('Missing or cyclic variable alias');
    stack.add(variable.id);
    const collection = collections.find(c => c.id === variable.variableCollectionId);
    const mode = collection.modes.find(m => m.name === 'Dark')?.modeId ?? collection.defaultModeId;
    const value = variable.valuesByMode[mode];
    return value?.type === 'VARIABLE_ALIAS' ? valueOf(byVariableId.get(value.id), stack) : value;
  }
  function colorVariable(role, collectionId = colorCollection.id) {
    const variable = collectionId === colorCollection.id ? colors.get(role.includes('/') ? role : 'color/' + role)
      : variables.find(v => v.variableCollectionId === collectionId && v.name === (role.includes('/') ? role : 'color/' + role));
    if (!variable || variable.resolvedType !== 'COLOR') throw new Error('Missing verified color token ' + role);
    return variable;
  }
  function rgb(role) { const { r, g, b } = valueOf(colorVariable(role)); return { r, g, b }; }
  function solid(role, opacity = 1, collectionId) {
    const variable = colorVariable(role, collectionId), { r, g, b } = valueOf(variable);
    if (opacity === 1) return figma.variables.setBoundVariableForPaint(
      { type: 'SOLID', color: { r, g, b }, opacity: 1 }, 'color', variable);
    // A bound color can replace a SOLID's alpha. A monochrome gradient keeps
    // the token opaque and controls tint intensity exclusively at paint level.
    return { type: 'GRADIENT_LINEAR', opacity,
      gradientTransform: [[1, 0, 0], [0, 1, 0]], gradientStops: [0, 1].map(position => ({
        position, color: { r, g, b, a: opacity === 0 ? 0 : 1 },
        ...(opacity === 0 ? {} : { boundVariables: { color: { type: 'VARIABLE_ALIAS', id: variable.id } } }),
      })) };
  }
  // Adapted from figma-generate-library/scripts/bindVariablesToComponent.js.
  function dimension(node, field, value) {
    if (node.boundVariables?.[field]) node.setBoundVariable(field, null);
    node[field] = value;
    const variable = dimensions.find(v => v.resolvedType === 'FLOAT' && v.name.startsWith('spacing/') && valueOf(v) === value);
    if (variable) node.setBoundVariable(field, variable);
    mutated.add(node.id);
  }
  function radius(node, value = 16) {
    node.cornerRadius = value;
    const token = dimensions.find(v => v.name === (value === 16 ? 'radius/lg' : value === 10.4 ? 'radius/md' : value === 6.4 ? 'radius/sm' : 'radius/full'));
    if (token && valueOf(token) === value) for (const field of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) node.setBoundVariable(field, token);
    mutated.add(node.id);
  }
  function adopt(parent, node) {
    if (!['FRAME', 'SLOT', 'COMPONENT', 'COMPONENT_SET'].includes(parent.type)) throw new Error('Editable source containers must be FRAME or SLOT: ' + parent.id);
    if (!plans.has(parent.id)) plans.set(parent.id, { parent, children: [] });
    const plan = plans.get(parent.id);
    if (node.parent?.id !== parent.id) {
      const wasCreated = created.has(node.id);
      // Do not cache a new instance's inherited child handles before SLOT parenting.
      const before = wasCreated ? [node.id] : tree(node).map(child => child.id);
      if (node.parent) mutated.add(node.parent.id);
      parent.appendChild(node);
      // Appending within a native SLOT materializes new instance-qualified IDs.
      // Re-find the live child before reading descendants or editing its layout.
      const matches = parent.children.filter(child => child.name === node.name && child.type === node.type);
      if (matches.length !== 1) throw new Error('Could not resolve the appended source child: ' + node.name);
      node = matches[0];
      const after = tree(node);
      if (wasCreated) for (const child of after) created.add(child.id);
      for (const id of before) if (!after.some(child => child.id === id)) removed.add(id);
      mark(node); mutated.add(parent.id);
    }
    if (!plan.children.some(child => child.id === node.id)) plan.children.push(node);
    return node;
  }
  function ensure(parent, name, type, create) {
    const matches = parent.children.filter(n => n.name === name);
    if (matches.length > 1 || (matches[0] && matches[0].type !== type)) throw new Error('Ambiguous/incompatible source child: ' + name);
    const node = matches[0] ?? create();
    if (!matches.length) created.add(node.id);
    node.name = name; mutated.add(node.id);
    return adopt(parent, node);
  }
  function frame(parent, name, direction, width, height, options = {}) {
    const node = ensure(parent, name, 'FRAME', () => figma.createAutoLayout(direction));
    node.layoutMode = direction;
    node.resize(width, Math.max(1, height ?? 1));
    node.layoutSizingHorizontal = 'FIXED';
    node.layoutSizingVertical = height == null ? 'HUG' : 'FIXED';
    node.primaryAxisAlignItems = options.align ?? 'MIN';
    node.counterAxisAlignItems = options.cross ?? 'MIN';
    node.fills = options.fill ? [solid(options.fill, options.opacity ?? 1)] : [];
    node.strokes = options.border ? [solid(options.border, options.borderOpacity ?? 1)] : [];
    node.strokeWeight = 1; node.clipsContent = options.clip ?? false;
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) dimension(node, 'padding' + side, options['padding' + side] ?? options.padding ?? 0);
    dimension(node, 'itemSpacing', options.gap ?? 0);
    if (options.radius != null) radius(node, options.radius);
    return node;
  }
  function absolute(node, x, y, width, height) {
    node.resize(width, height);
    node.layoutSizingHorizontal = 'FIXED'; node.layoutSizingVertical = 'FIXED';
    node.layoutPositioning = 'ABSOLUTE'; node.x = x; node.y = y;
    mutated.add(node.id);
    return node;
  }
  async function text(parent, name, characters, width, size = 14, weight = 'regular', role = 'foreground', line = size * 1.5, tracking = 0, align = 'LEFT') {
    const node = ensure(parent, name, 'TEXT', () => figma.createText());
    const font = fonts[weight];
    const style = manropeStyles.slice().sort((a, b) => Math.abs(a.fontSize - size) - Math.abs(b.fontSize - size))[0];
    await node.setTextStyleIdAsync(style.id);
    for (const field of ['fontFamily', 'fontStyle', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing'])
      if (node.boundVariables?.[field]) node.setBoundVariable(field, null);
    node.fontName = font; node.fontSize = size;
    node.lineHeight = { unit: 'PIXELS', value: line };
    node.letterSpacing = { unit: 'PERCENT', value: tracking };
    node.textAutoResize = 'HEIGHT'; node.textAlignHorizontal = align;
    node.resize(width, Math.max(line, node.height));
    node.layoutSizingHorizontal = 'FIXED'; node.layoutSizingVertical = 'HUG';
    node.characters = characters; node.fills = [solid(role)];
    if (!(node.width > 0)) throw new Error('Collapsed text width: ' + name);
    return node;
  }
  async function paintStyle(node, kind) {
    const style = paintStyles.find(s => s.name === 'Aureform/Gradient/Dark/' + kind);
    if (!style) throw new Error('Missing gradient style: ' + kind);
    await node.setFillStyleIdAsync(style.id); mutated.add(node.id);
  }
  async function shadow(node, kind = 'elevated') {
    const style = effectStyles.find(s => s.name === 'Aureform/Shadow/Dark/' + kind);
    if (!style) throw new Error('Missing shadow style: ' + kind);
    await node.setEffectStyleIdAsync(style.id); mutated.add(node.id);
  }
  function gradient(roles, alphas, positions) {
    const opacity = alphas ? Math.max(...alphas) : 1;
    return [{
      type: 'GRADIENT_LINEAR',
      opacity,
      gradientTransform: [[.819152, .573576, -.196364], [-.573576, .819152, .377212]],
      gradientStops: roles.map((role, index) => {
        const variable = colorVariable(role);
        const alpha = alphas ? (opacity === 0 ? 0 : alphas[index] / opacity) : 1;
        // Aliases replace RGBA, including alpha. Bind only opaque stops; a=0
        // is a literal technical transparency, and strength is paint opacity.
        return { position: positions?.[index] ?? index / (roles.length - 1), color: { ...rgb(role), a: alpha },
          ...(alpha === 1 ? { boundVariables: { color: { type: 'VARIABLE_ALIAS', id: variable.id } } } : {}) };
      }),
    }];
  }
  function properties(node, values) {
    const actual = node.componentProperties;
    for (const key of Object.keys(values)) if (!actual[key]) throw new Error('Unverified instance property ' + key + ' on ' + node.name);
    node.setProperties(values); mutated.add(node.id);
  }
  async function instance(parent, name, master, width, height, values = {}) {
    let node = ensure(parent, name, 'INSTANCE', () => master.createInstance());
    const main = await node.getMainComponentAsync();
    if (main?.id !== master.id) {
      const before = tree(node).map(n => n.id);
      node.swapComponent(master);
      const after = tree(node);
      for (const child of after) if (!before.includes(child.id)) created.add(child.id);
      for (const id of before) if (!after.some(n => n.id === id)) removed.add(id);
    }
    const beforeProperties = tree(node).map(child => child.id);
    properties(node, values);
    node = await figma.getNodeByIdAsync(node.id);
    if (!node || node.type !== 'INSTANCE') throw new Error('The linked instance could not be refreshed: ' + name);
    const afterProperties = tree(node);
    for (const child of afterProperties) if (!beforeProperties.includes(child.id)) created.add(child.id);
    for (const id of beforeProperties) if (!afterProperties.some(child => child.id === id)) removed.add(id);
    node.visible = true; node.opacity = master.opacity;
    node.resize(width, height);
    node.layoutSizingHorizontal = 'FIXED'; node.layoutSizingVertical = 'FIXED';
    mark(node);
    return node;
  }
  async function component(parent, name, key, axes, width, height, values = {}) {
    return instance(parent, name, variant(assets[key], axes), width, height, values);
  }
  async function skin(parent, title, width, height, key = 'CardMaterial', appearance = 'Elevated') {
    const master = key === 'CardMaterial' ? variant(assets.CardMaterial, { Appearance: appearance, State: 'Default' }) : assets[key];
    const node = await instance(parent, 'Surface / ' + key, master, width, height, key === 'CardMaterial' ? { 'Title#97:22': title } : {});
    // These slotless 1.0/1.1 masters provide the linked material. Source content
    // remains semantic native auto-layout siblings, never a screen-image overlay.
    for (const child of node.children) { mark(child); child.visible = false; }
    absolute(node, 0, 0, width, height);
    return node;
  }
  async function effect(parent, name, width, height, intensity = 1) {
    const asset = effects[name];
    if (!asset) { warnings.push('Optional native master unavailable: ' + name); return null; }
    const master = name === 'ShaderBackground' ? aurora : name === 'GradientBackground' ? variant(asset, { Kind: 'Mesh' })
      : variant(asset, { State: 'Default' });
    const node = await instance(parent, 'Effect / ' + name, master, width, height, { [effectLedger[name].label]: parent.name });
    for (const child of tree(node).filter(n => n.type === 'TEXT')) { child.visible = false; mutated.add(child.id); }
    // Auto-layout defaults are white. Clear only unbound white layout fills in
    // the placed instance; intentional palette-bound surfaces remain linked.
    for (const child of tree(node)) {
      if ('layoutMode' in child && child.layoutMode !== 'NONE' && Array.isArray(child.fills) &&
        child.fills.length === 1 && child.fills[0].type === 'SOLID' && !child.fills[0].boundVariables?.color &&
        child.fills[0].color.r === 1 && child.fills[0].color.g === 1 && child.fills[0].color.b === 1) {
        child.fills = []; mutated.add(child.id);
      }
      if (intensity !== 1 && 'fills' in child && Array.isArray(child.fills)) {
        child.fills = child.fills.map(p => p.type.startsWith('GRADIENT_') ? { ...p, opacity: intensity } : p);
        mutated.add(child.id);
      }
    }
    absolute(node, 0, 0, width, height);
    return node;
  }
  async function shader(parent, width, height, role = 'background', opacityStops = [.92, .38, .22]) {
    await effect(parent, 'ShaderBackground', width, height);
    const veil = ensure(parent, 'Shader / source contrast veil', 'RECTANGLE', () => figma.createRectangle());
    veil.fills = gradient(opacityStops.map(() => role), opacityStops);
    absolute(veil, 0, 0, width, height);
  }
  // Exact SVG geometry read from the compiled source's lucide-react v0.562.0 (ISC).
  const svgBodies = {
    ArrowDownRight: '<path d="m7 7 10 10"/><path d="M17 7v10H7"/>',
    CreditCard: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    MousePointer2: '<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>',
    Sliders: '<path d="M10 5H3M12 19H3M14 3v4M16 17v4M21 12h-9M21 19h-5M21 5h-7M8 10v4M8 12H3"/>',
    Download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
    Activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 0 4.49 12H2"/>',
    Check: '<path d="M20 6 9 17l-5-5"/>',
    ArrowLeft: '<path d="m12 19-7-7 7-7M19 12H5"/>',
    Paperclip: '<path d="m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551"/>',
    ArrowUp: '<path d="m5 12 7-7 7 7M12 19V5"/>',
    Feather: '<path d="M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1zM16 8 2 22M17.5 15H9"/>',
    Lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>',
    Code: '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
    Eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    ChevronDown: '<path d="m6 9 6 6 6-6"/>',
    Building: '<path d="M10 12h4M10 8h4M14 21v-3a2 2 0 0 0-4 0v3M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>',
    Palette: '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>',
    Sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  };
  async function icon(parent, name, kind, size = 16, role = 'primary') {
    let node;
    if (icons[kind]) node = await instance(parent, name, icons[kind], size, size);
    else {
      if (!svgBodies[kind]) throw new Error('No verified source SVG for ' + kind);
      const source = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' + svgBodies[kind] + '</svg>';
      node = ensure(parent, name, 'FRAME', () => figma.createNodeFromSvg(source));
      node.fills = [];
      node.resize(size, size); node.layoutSizingHorizontal = 'FIXED'; node.layoutSizingVertical = 'FIXED';
    }
    for (const vector of tree(node).filter(n => n.type === 'VECTOR' || n.type === 'BOOLEAN_OPERATION')) {
      if (Array.isArray(vector.fills) && vector.fills.length) vector.fills = vector.fills.map(p => p.type === 'SOLID' ? solid(role, p.opacity ?? 1) : p);
      if (Array.isArray(vector.strokes) && vector.strokes.length) vector.strokes = vector.strokes.map(p => p.type === 'SOLID' ? solid(role, p.opacity ?? 1) : p);
      mutated.add(vector.id);
    }
    return node;
  }
  async function brand(parent, width = 141.1) {
    const row = frame(parent, 'Brand / Aureform', 'HORIZONTAL', width, 34.8, { gap: 10, cross: 'CENTER' });
    await icon(row, 'Brand / mark', 'AureformMark', 28);
    const wordmark = frame(row, 'Brand / wordmark and suffix', 'HORIZONTAL', 103.1, 34.8, { gap: 4, cross: 'CENTER' });
    await text(wordmark, 'Brand / wordmark', 'aureform', 87.1, 21, 'semibold', 'foreground', 31.5, -3.81);
    await text(wordmark, 'Brand / suffix', 'ui', 12, 12, 'regular', 'muted-foreground', 18);
    return row;
  }
  async function button(parent, name, label, width, height = 42, appearance = 'Gradient', leading, trailing = false) {
    const wrapper = frame(parent, name, 'HORIZONTAL', width, height, { cross: 'CENTER', radius: 10.4 });
    const node = await component(wrapper, 'Button / linked instance', 'ButtonAppearance', { Appearance: appearance, State: 'Default' }, width, height, { 'Label#97:0': label });
    if (appearance === 'Gradient') await paintStyle(node, 'control');
    for (const child of node.findAllWithCriteria({ types: ['TEXT'] })) {
      child.fontName = fonts.semibold; child.fontSize = height >= 48 ? 14 : 13;
      child.lineHeight = { unit: 'PIXELS', value: 20 }; mutated.add(child.id);
    }
    if (leading) absolute(await icon(wrapper, 'Button / leading icon', leading, 16, appearance === 'Gradient' || appearance === 'Solid' ? 'primary-foreground' : 'primary'), 14, (height - 16) / 2, 16, 16);
    if (trailing) absolute(await icon(wrapper, 'Button / trailing icon', 'ArrowUpRight', 16, appearance === 'Gradient' || appearance === 'Solid' ? 'primary-foreground' : 'primary'), width - 28, (height - 16) / 2, 16, 16);
    return wrapper;
  }
  async function functionalButton(parent, name, label, width, height = 32, style = 'Outline', leading) {
    const node = await component(parent, name, 'Button', { Style: style, Size: height >= 48 ? 'Large' : 'Small', State: 'Default' }, width, height,
      { 'Label#3:0': label, 'Show icon#3:28': !!leading, ...(leading ? { 'Icon#3:56': iconIds[leading] } : {}) });
    return node;
  }
  async function badge(parent, name, label, width, appearance = 'Soft', height = 26) {
    return component(parent, name, 'BadgeAppearance', { Appearance: appearance }, width, height, { 'Label#97:16': label });
  }
  const revenue = [26800, 31200, 28500, 36700, 41300, 48295], previous = [22200, 24500, 25100, 27100, 31200, 35800];
  async function chart(parent, name, width, height, compact = false, single = false) {
    const host = frame(parent, name, 'VERTICAL', width, height);
    const left = single ? 0 : 32, bottom = single ? 0 : 24, plotWidth = width - left, plotHeight = height - bottom - 4;
    const points = values => values.map((value, index) => [left + index / 5 * plotWidth, 4 + (1 - value / 60000) * plotHeight]);
    function curve(values) {
      const p = points(values);
      return 'M' + p[0].join(' ') + p.slice(1).map((point, index) => {
        const before = p[Math.max(0, index - 1)], a = p[index], after = p[Math.min(5, index + 2)];
        return ' C' + [a[0] + (point[0] - before[0]) / 6, a[1] + (point[1] - before[1]) / 6,
          point[0] - (after[0] - a[0]) / 6, point[1] - (after[1] - a[1]) / 6, ...point].join(' ');
      }).join('');
    }
    const c = rgb('chart-1'), d = rgb('chart-2'), b = rgb('border');
    const css = color => 'rgb(' + [color.r, color.g, color.b].map(v => Math.round(v * 255)).join(',') + ')';
    const ticks = compact ? [0, 30000, 60000] : [0, 15000, 30000, 45000, 60000];
    const grid = ticks.map(value => { const y = 4 + (1 - value / 60000) * plotHeight; return '<path d="M' + left + ' ' + y + 'H' + width + '" stroke="' + css(b) + '" stroke-dasharray="2 5"/>'; }).join('');
    const path = curve(revenue);
    const source = '<svg width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" xmlns="http://www.w3.org/2000/svg" fill="none">' +
      grid + (single ? '' : '<path d="' + path + 'L' + width + ' ' + (plotHeight + 4) + 'H' + left + 'Z" fill="' + css(c) + '" fill-opacity=".06"/>') +
      '<path d="' + path + '" stroke="' + css(c) + '" stroke-width="' + (single ? 3 : 2) + '" stroke-linecap="round"/>' +
      (single ? '' : '<path d="' + curve(previous) + '" stroke="' + css(d) + '" stroke-width="1.5" stroke-dasharray="4 4"/>') + '</svg>';
    const graphic = ensure(host, 'Chart / native revenue paths', 'FRAME', () => figma.createNodeFromSvg(source));
    graphic.fills = [];
    graphic.resize(width, height); graphic.layoutSizingHorizontal = 'FIXED'; graphic.layoutSizingVertical = 'FIXED';
    for (const child of tree(graphic)) for (const field of ['fills', 'strokes']) {
      if (!(field in child) || !Array.isArray(child[field])) continue;
      child[field] = child[field].map(paint => {
        if (paint.type !== 'SOLID') return paint;
        const role = ['chart-1', 'chart-2', 'border'].find(key => {
          const token = rgb(key);
          return ['r', 'g', 'b'].every(channel => Math.abs(token[channel] - paint.color[channel]) <= 1 / 255);
        });
        return role ? figma.variables.setBoundVariableForPaint(paint, 'color', colorVariable(role)) : paint;
      });
      mutated.add(child.id);
    }
    // Source Chart flat appearance fades 24% to 2%; use paint intensity and
    // unbound literal transparency so a color alias cannot make the area opaque.
    if (!single) for (const vector of tree(graphic).filter(n => n.type === 'VECTOR' && n.fills.length)) {
      vector.fills = [{ type: 'GRADIENT_LINEAR', opacity: .24, gradientTransform: [[0, 1, 0], [-1, 0, 1]], gradientStops: [
        { position: 0, color: { ...rgb('chart-1'), a: 1 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: colorVariable('chart-1').id } } },
        { position: 1, color: { ...rgb('chart-1'), a: .02 / .24 } },
      ] }]; mutated.add(vector.id);
    }
    if (!single) {
      for (const value of ticks) {
        const tick = await text(host, 'Axis / ' + value, value ? value / 1000 + 'k' : '0', 26, 10, 'regular', 'muted-foreground', 14, 0, 'RIGHT');
        absolute(tick, 0, Math.max(0, 4 + (1 - value / 60000) * plotHeight - 7), 26, 14);
      }
      for (const [index, month] of ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].entries()) {
        const tick = await text(host, 'Month / ' + month, month, 28, 10, 'regular', 'muted-foreground', 14, 0, 'CENTER');
        absolute(tick, Math.max(left - 10, Math.min(width - 28, left + index / 5 * plotWidth - 14)), height - 14, 28, 14);
      }
    }
    return host;
  }
  async function metric(parent, name, label, value, change, width, height = 190, primary = false, source = {}) {
    // Keep a prior 1.0 instance ID while adding the native 1.1 icon/sparkline layout.
    const old = parent.children.find(n => n.name === name && n.type === 'INSTANCE');
    if (old) { old.name = 'MetricCard / linked instance'; mark(old); }
    const host = frame(parent, name, 'VERTICAL', width, height, { radius: 16, clip: true });
    if (old) adopt(host, old);
    const node = await component(host, 'MetricCard / linked instance', 'MetricCard', { Trend: 'Positive' }, width, height,
      { 'Label#3:105': label, 'Value#3:108': value });
    absolute(node, 0, 0, width, height);
    if (primary) { node.fills = [solid('accent', .4)]; node.strokes = [solid('primary', .3)]; }
    // Instance child stack positioning is inherited and cannot be overridden.
    // Keep the linked native core as the surface and compose editable source content.
    for (const child of node.children) { mark(child); child.visible = false; }
    const title = await text(host, 'Metric / source label', label, width - 104, 13, 'semibold', 'muted-foreground', 20);
    absolute(title, 24, 28, width - 104, 20);
    const amount = await text(host, 'Metric / source value', value, width - 48, 32, 'semibold', 'foreground', 40);
    amount.letterSpacing = { unit: 'PIXELS', value: -1.2 };
    absolute(amount, 24, 76, width - 48, 40);
    const changeBadge = await badge(host, 'Metric / source change', '↗  ' + change, 74, 'Soft', 22);
    absolute(changeBadge, 24, 136, 74, 22);
    if (source.icon) {
      const well = frame(host, 'Metric / source icon well', 'HORIZONTAL', 36, 36,
        { fill: 'accent', opacity: .65, border: 'primary', borderOpacity: .2, radius: 12, align: 'CENTER', cross: 'CENTER' });
      await icon(well, 'Metric / source icon', source.icon, 16);
      absolute(well, width - 60, 24, 36, 36);
    }
    if (source.note) {
      const note = await text(host, 'Metric / source note', source.note, width - 144, 11, 'regular', 'muted-foreground', 20);
      absolute(note, 106, 136, width - 144, 20);
    }
    if (source.series) {
      const max = Math.max(1, ...source.series), min = Math.min(0, ...source.series);
      const points = source.series.map((n, i) => (i / Math.max(1, source.series.length - 1)) * 72 + ',' + (24 - ((n - min) / (max - min)) * 22)).join(' ');
      const svg = '<svg width="80" height="32" viewBox="0 0 72 30" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="0,30 ' + points + ' 72,30" fill="currentColor"/><polyline points="' + points + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      const graph = ensure(host, 'Metric / source sparkline', 'FRAME', () => figma.createNodeFromSvg(svg)); graph.fills = [];
      for (const vector of tree(graph).filter(n => n.type === 'VECTOR')) {
        if (vector.fills.length) { vector.fills = [solid('primary')]; vector.opacity = .12; }
        if (vector.strokes.length) vector.strokes = [solid('primary')];
        mutated.add(vector.id);
      }
      absolute(graph, width - 104, 132, 80, 32);
    }
    await shadow(host, 'soft');
    return host;
  }
  async function report(parent, name, width, height = 435.5, description = 'A closer look at your momentum over time.', select = false) {
    const node = frame(parent, name, 'VERTICAL', width, height, { fill: 'surface', radius: 16, border: 'border' });
    await skin(node, 'Revenue overview', width, height, 'RevenuePanel');
    const heading = frame(node, 'Report / header', 'VERTICAL', width, 113, { padding: 24, paddingBottom: 16, gap: 12, border: 'border' });
    const bars = frame(heading, 'Report / signature', 'HORIZONTAL', 56, 4, { gap: 6 });
    for (const [index, w] of [28, 12, 4].entries()) {
      const bar = ensure(bars, 'Signature / ' + index, 'RECTANGLE', () => figma.createRectangle());
      bar.resize(w, 4); bar.fills = [solid(['brand/primary', 'brand/secondary', 'brand/tertiary'][index])]; bar.cornerRadius = 2;
    }
    const titleRow = frame(heading, 'Report / title row', 'HORIZONTAL', width - 48, 24, { align: 'SPACE_BETWEEN', cross: 'CENTER' });
    await text(titleRow, 'Report / title', 'Revenue overview', width - (select ? 220 : 48), 15, 'semibold', 'foreground', 24, -2);
    if (select) {
      const period = await component(titleRow, 'Report / period', 'Select', { State: 'Closed' }, 144, 36, { 'Label#15:11': 'Last 6 months' });
      absolute(period, width - 192, -6, 144, 36);
    }
    await text(heading, 'Report / description', description, width - 48, 13, 'regular', 'muted-foreground', 20);
    const content = frame(node, 'Report / chart content', 'VERTICAL', width, height - 113, { paddingLeft: 24, paddingRight: 24, paddingTop: 24, paddingBottom: 20, gap: 24 });
    await chart(content, 'Report / plot', width - 48, height - 113 - 24 - 20 - 24 - 40);
    const legend = frame(content, 'Report / legend', 'HORIZONTAL', width - 48, 40, { fill: 'surface-subtle', opacity: .35, border: 'border', radius: 16, gap: 24, align: 'CENTER', cross: 'CENTER' });
    await text(legend, 'Legend / current', '●  This period', 100, 11, 'regular', 'muted-foreground', 16);
    await text(legend, 'Legend / previous', '– –  Previous', 100, 11, 'regular', 'muted-foreground', 16);
    return node;
  }
  function begin(root, direction, width, height) {
    root.layoutMode = direction; root.resize(width, height ?? 1);
    root.layoutSizingHorizontal = 'FIXED'; root.layoutSizingVertical = height == null ? 'HUG' : 'FIXED';
    root.primaryAxisAlignItems = 'MIN'; root.counterAxisAlignItems = 'MIN';
    root.itemSpacing = 0; root.paddingTop = 0; root.paddingRight = 0; root.paddingBottom = 0; root.paddingLeft = 0;
    root.fills = [solid('background')]; root.clipsContent = false;
    root.setExplicitVariableModeForCollection(colorCollection, darkMode.modeId); mark(root);
    if (!plans.has(root.id)) plans.set(root.id, { parent: root, children: [] });
  }
  function finalize() {
    for (const { parent, children } of [...plans.values()].reverse()) {
      const ids = new Set(children.map(n => n.id));
      // Exact IDs from this parent's live snapshot, in verified owned roots only.
      for (const child of [...parent.children]) if (!ids.has(child.id)) {
        for (const node of tree(child)) removed.add(node.id);
        child.remove(); mutated.add(parent.id);
      }
      children.forEach((child, index) => {
        if (parent.children[index]?.id !== child.id) { parent.insertChild(index, child); mark(child); mutated.add(parent.id); }
      });
    }
  }
  async function modernize() {
    const liveRoots = await Promise.all(rootIds.map(id => figma.getNodeByIdAsync(id)));
    for (const root of liveRoots) for (const node of tree(root)) {
      if ('layoutMode' in node && node.layoutMode !== 'NONE' && Array.isArray(node.fills) &&
        node.fills.length === 1 && node.fills[0].type === 'SOLID' && !node.fills[0].boundVariables?.color &&
        ['r', 'g', 'b'].every(channel => node.fills[0].color[channel] === 1)) {
        node.fills = []; mutated.add(node.id);
      }
    }
    for (const root of liveRoots) for (const node of tree(root).filter(n => n.type === 'TEXT')) {
      const segments = node.getStyledTextSegments(['fontName']);
      for (const segment of segments) if (segment.fontName.family !== 'Manrope') {
        const current = segment.fontName.style.replace(/\s/g, '').toLowerCase();
        const weight = current.includes('semibold') || current.includes('medium') ? 'semibold'
          : current.includes('extrabold') ? 'extraBold' : current.includes('bold') ? 'bold' : 'regular';
        // Preserve the source's size, line height, range fills, tracking and
        // emphasis. Reapplying a whole style would reset those local overrides.
        for (const field of ['fontFamily', 'fontStyle', 'fontWeight'])
          if (node.getRangeBoundVariable(segment.start, segment.end, field))
            node.setRangeBoundVariable(segment.start, segment.end, field, null);
        node.setRangeFontName(segment.start, segment.end, fonts[weight]);
        mutated.add(node.id);
      }
      if (!node.characters.length && node.fontName !== figma.mixed && node.fontName.family !== 'Manrope') {
        node.fontName = fonts.regular; mutated.add(node.id);
      }
    }
  }
  function audit(root) {
    const nodes = tree(root), descendants = nodes.slice(1), typeCounts = {}, fontFamilyCounts = {}, imageNodes = [], shaderNodes = [], whiteLayouts = [];
    for (const node of descendants) {
      typeCounts[node.type] = (typeCounts[node.type] ?? 0) + 1;
      if (node.type === 'TEXT') for (const segment of node.getStyledTextSegments(['fontName'])) fontFamilyCounts[segment.fontName.family] = (fontFamilyCounts[segment.fontName.family] ?? 0) + 1;
      if ('layoutMode' in node && node.layoutMode !== 'NONE' && Array.isArray(node.fills) &&
        node.fills.some(p => p.type === 'SOLID' && !p.boundVariables?.color && ['r', 'g', 'b'].every(channel => p.color[channel] === 1))) whiteLayouts.push(node.id);
      for (const field of ['fills', 'strokes']) if (field in node && Array.isArray(node[field])) for (const paint of node[field]) {
        if (paint.type === 'IMAGE') imageNodes.push({ id: node.id, name: node.name, type: node.type, width: node.width, height: node.height, field });
        if (paint.type === 'SHADER') shaderNodes.push({ id: node.id, name: node.name, type: node.type, shaderId: paint.id, field });
      }
    }
    return { id: root.id, name: root.name, type: root.type, parentId: root.parent?.id, pageId: pageOf(root)?.id, width: root.width, height: root.height,
      descendantCount: descendants.length, descendantTypeCounts: typeCounts, imageFillNodeCount: new Set(imageNodes.map(n => n.id)).size, imageNodes,
      fontFamilyCounts, nonManropeTextSegmentCount: Object.entries(fontFamilyCounts).filter(([family]) => family !== 'Manrope').reduce((sum, [, count]) => sum + count, 0),
      shaderFillNodeCount: new Set(shaderNodes.map(n => n.id)).size, shaderNodes,
      unboundWhiteLayoutCount: whiteLayouts.length, unboundWhiteLayoutNodeIds: whiteLayouts,
      directChildren: root.children.map(n => ({ id: n.id, name: n.name, type: n.type, x: n.x, y: n.y, width: n.width, height: n.height })) };
  }
  // Adapted from figma-generate-library/scripts/validateCreation.js; async lookup.
  async function validateCreation(checks) {
    const nodes = await Promise.all(checks.map(check => figma.getNodeByIdAsync(check.nodeId)));
    return checks.flatMap((check, index) => {
      const node = nodes[index];
      return !node || node.type !== check.expectedType || (check.expectedName && node.name !== check.expectedName) ? [{ ...check, actual: node?.type ?? null }] : [];
    });
  }
  function packAffectedIds() {
    const ids = [...new Set([...created, ...mutated, ...removed])], groups = new Map(), literals = [];
    const maskOf = id => (created.has(id) ? 1 : 0) | (mutated.has(id) ? 2 : 0) | (removed.has(id) ? 4 : 0);
    for (const id of ids) {
      const match = /^([A-Za-z0-9;:_-]*:)(0|[1-9]\d*)$/.exec(id);
      if (!match || !Number.isSafeInteger(Number(match[2]))) { literals.push([maskOf(id), id]); continue; }
      const prefix = match[1], key = maskOf(id) + ',' + prefix;
      if (!groups.has(key)) groups.set(key, { mask: maskOf(id), prefix, values: [] });
      groups.get(key).values.push(Number(match[2]));
    }
    const prefixes = [...new Set([...groups.values()].map(g => g.prefix))].sort();
    let previous = '';
    const prefixesFrontCodedCSV = prefixes.map(prefix => {
      let common = 0;
      while (common < Math.min(previous.length, prefix.length) && previous[common] === prefix[common]) common++;
      const row = common + ',' + prefix.slice(common); previous = prefix; return row;
    }).join('\n');
    const rangesCSV = [...groups.values()].map(group => {
      const values = group.values.sort((a, b) => a - b), runs = [];
      for (let i = 0; i < values.length; i++) {
        const start = values[i]; let end = start;
        while (i + 1 < values.length && values[i + 1] === end + 1) end = values[++i];
        runs.push(start === end ? String(start) : start + '-' + end);
      }
      return group.mask + ',' + prefixes.indexOf(group.prefix) + ',' + runs.join(';');
    }).join('\n');
    return { encoding: 'observed-prefix-ranges-v1', categoryBits: { created: 1, mutated: 2, removed: 4 },
      counts: { created: created.size, mutated: mutated.size, removed: removed.size, unique: ids.length },
      prefixesFrontCodedCSV, rangesCSV, literalsJSON: JSON.stringify(literals),
      decode: 'Prefix rows: commonPrefixLength,literalSuffix; restore against the previous prefix. Range rows: categoryMask,prefixIndex,semicolon-separated inclusive numeric ranges. Prepend the restored prefix to each observed suffix. literalsJSON contains [mask,exactID]. No IDs are omitted.' };
  }
  function compactResult(result) {
    function bytes(value) {
      const string = JSON.stringify(value); let count = 0;
      for (let i = 0; i < string.length; i++) {
        const code = string.charCodeAt(i);
        if (code < 128) count++;
        else if (code < 2048) count += 2;
        else if (code >= 55296 && code <= 56319 && i + 1 < string.length &&
          string.charCodeAt(i + 1) >= 56320 && string.charCodeAt(i + 1) <= 57343) { count += 4; i++; }
        else count += 3;
      }
      return count;
    }
    if (bytes(result) > 18000) {
      for (const field of ['fontsLoaded', 'usedAssets', 'resolvedEffectMasters',
        'ownerVisualReview', 'preservedNodes', 'warnings']) delete result[field];
      if (result.affectedNodeIds) delete result.affectedNodeIds.decode;
    }
    result.compactJSONCharacterCount = JSON.stringify(result).length;
    result.compactJSONUTF8ByteCount = bytes(result);
    for (let i = 0; i < 3; i++) {
      result.compactJSONCharacterCount = JSON.stringify(result).length;
      result.compactJSONUTF8ByteCount = bytes(result);
    }
    // Exact IDs and compact structural audits are never dropped.
    if (result.compactJSONUTF8ByteCount > 19000) throw new Error(
      'Return budget exceeded with all exact affected IDs retained: ' + result.compactJSONUTF8ByteCount);
    return result;
  }
  async function finish(error) {
    const structuralFailures = await validateCreation(roots.map(root => ({ nodeId: root.id, expectedType: options.rootType ?? 'FRAME' })));
    const liveRoots = await Promise.all(rootIds.map(id => figma.getNodeByIdAsync(id)));
    const audits = liveRoots.map(audit);
    const valid = !error && !structuralFailures.length && audits.every(a => a.imageFillNodeCount === 0 && a.nonManropeTextSegmentCount === 0 && (options.requireShader === false || a.shaderFillNodeCount > 0) && a.unboundWhiteLayoutCount === 0);
    const compactAudits = audits.map(({ id, name, type, parentId, pageId, width, height, descendantCount, descendantTypeCounts, imageFillNodeCount,
      fontFamilyCounts, nonManropeTextSegmentCount, shaderFillNodeCount, unboundWhiteLayoutCount }) => ({ id, name, type, parentId, pageId, width, height,
      descendantCount, descendantTypeCounts, imageFillNodeCount, fontFamilyCounts, nonManropeTextSegmentCount, shaderFillNodeCount, unboundWhiteLayoutCount }));
    const result = { status: error ? 'partial-reconciliation' : valid ? 'reconciled-awaiting-owner-visual-review' : 'validation-failed',
      fileKey, pageId: page.id, rootIds, affectedNodeIds: packAffectedIds(),
      preservedNodes: preserved, resolvedEffectMasters: Object.fromEntries(Object.entries(effects).map(([name, n]) => [name, n.id])),
      usedAssets: Object.fromEntries(Object.entries(assets).map(([name, n]) => [name, n.id])),
      fontsLoaded: [...fontSet.values()], warnings: [...new Set(warnings)], structuralFailures, audits: compactAudits,
      ...(error ? { error: String(error.message ?? error), retry: 'Read these existing roots before retrying; reconcile the same names and IDs.' } : {}),
      ownerVisualReview: 'Compare each existing root with the 1440px English Aurora/Dark browser source. This script does not claim screenshot validation.' };
    let json = JSON.stringify(result);
    if (json.length > 16500) {
      delete result.fontsLoaded; delete result.usedAssets; delete result.resolvedEffectMasters; delete result.ownerVisualReview;
      json = JSON.stringify(result);
    }
    result.compactJSONCharacterCount = json.length;
    return compactResult(result);
  }
  return { ready: true, roots, page, assets, icons, effects, ledger, colors, collections, colorCollection, darkMode, fonts, created, mutated, removed, preserved, warnings,
    tree, mark, pageOf, variant, adopt, ensure, frame, absolute, text, solid, rgb, colorVariable, valueOf, dimension, radius, paintStyle, shadow, gradient,
    properties, instance, component, skin, effect, shader, icon, brand, button, functionalButton, badge, chart, metric, report, begin, finalize, modernize, audit, finish, compactResult };
}

// END SHARED NATIVE RECONCILER

// BEGIN CHART OPERATIONS
// Existing state ledger: Chart 23:501, default 23:444, Label#23:14,
// original Kind options Area/Line/Bar/Donut/Radar/Radial; screen 59:2901.
const PHASE = 'library'; // Separate invocation: 'screen'. Never switch twice.
// Actual DOM-rendered source paths, four-decimal geometry precision; no images or text outlines.
// Data: default Last 6 months, three selected series, Glow; EN /charts at 1440px.
const SOURCE_SHA256 = {
  "/tmp/aureform-ui-build/src/components/ui/chart.tsx": "ef967ab0f2839221105eef95a0e5b9ab6c9b440707198554933c29014c168f5b",
  "/tmp/aureform-ui-build/src/components/templates/catalogs.tsx": "31bd44687d23f66534ac08f0a656ef7c63cc87db6853e8566369ef526343e309",
  "/tmp/aureform-ui-build/src/demo/dashboard-data.ts": "b59b8d38586c10324ba9ee300a4dbcbd20761c1af806cd01f03f51c9eb3be5f0"
};
const MODELS = PHASE === 'library'
  ? [
  {
    "kind": "area",
    "nativeKind": "Area",
    "title": "Revenue flow",
    "description": "Every rise, in context.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><g><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"172\" x2=\"320\" y2=\"172\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"131.5\" x2=\"320\" y2=\"131.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"91\" x2=\"320\" y2=\"91\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"50.5\" x2=\"320\" y2=\"50.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"10\" x2=\"320\" y2=\"10\" fill=\"none\"/></g></g></g><g><g><g><g/></g></g><g><g><g/></g></g></g><g><g/><g/></g></svg>",
    "layers": [
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><g><path stroke-width=\"2\" fill=\"transparent\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" id=\"recharts-area-_r_0_\" stroke=\"none\" d=\"M42,160.422C60.533,158.422,79.067,156.421,97.6,155.573C116.133,154.725,134.667,154.302,153.2,154.302C171.733,154.302,190.267,156.146,208.8,156.146C227.333,156.146,245.867,152.61,264.4,150.254C282.933,147.898,301.467,144.953,320,142.008L320,172C301.467,172,282.933,172,264.4,172C245.867,172,227.333,172,208.8,172C190.267,172,171.733,172,153.2,172C134.667,172,116.133,172,97.6,172C79.067,172,60.533,172,42,172Z\"/><path stroke-width=\"2\" fill=\"none\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" stroke=\"{{chart-3}}\" d=\"M42,160.422C60.533,158.422,79.067,156.421,97.6,155.573C116.133,154.725,134.667,154.302,153.2,154.302C171.733,154.302,190.267,156.146,208.8,156.146C227.333,156.146,245.867,152.61,264.4,150.254C282.933,147.898,301.467,144.953,320,142.008\"/></g></g></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><g><path stroke-width=\"2\" stroke-dasharray=\"4 4\" fill=\"transparent\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" id=\"recharts-area-_r_1_\" stroke=\"none\" d=\"M42,138.434C60.533,136.997,79.067,135.561,97.6,134.956C116.133,134.351,134.667,134.654,153.2,134.049C171.733,133.444,190.267,132.562,208.8,131.025C227.333,129.488,245.867,127.018,264.4,124.826C282.933,122.633,301.467,120.252,320,117.87L320,172C301.467,172,282.933,172,264.4,172C245.867,172,227.333,172,208.8,172C190.267,172,171.733,172,153.2,172C134.667,172,116.133,172,97.6,172C79.067,172,60.533,172,42,172Z\"/><path stroke-width=\"2\" stroke-dasharray=\"4 4\" fill=\"none\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" stroke=\"{{chart-2}}\" d=\"M42,138.434C60.533,136.997,79.067,135.561,97.6,134.956C116.133,134.351,134.667,134.654,153.2,134.049C171.733,133.444,190.267,132.562,208.8,131.025C227.333,129.488,245.867,127.018,264.4,124.826C282.933,122.633,301.467,120.252,320,117.87\"/></g></g></g></svg>"
      },
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><defs><linearGradient id=\"_R_233dav5uivb_-value\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"{{chart-1}}\" stop-opacity=\"0.24\"/><stop offset=\"100%\" stop-color=\"{{chart-1}}\" stop-opacity=\"0.02\"/></linearGradient></defs><g><g><g><path stroke-width=\"2\" fill=\"url(#_R_233dav5uivb_-value)\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" id=\"recharts-area-_r_2_\" stroke=\"none\" d=\"M42,99.64C60.533,93.7,79.067,87.76,97.6,87.76C116.133,87.76,134.667,95.05,153.2,95.05C171.733,95.05,190.267,78.67,208.8,72.91C227.333,67.15,245.867,65.708,264.4,60.49C282.933,55.272,301.467,48.438,320,41.604L320,172C301.467,172,282.933,172,264.4,172C245.867,172,227.333,172,208.8,172C190.267,172,171.733,172,153.2,172C134.667,172,116.133,172,97.6,172C79.067,172,60.533,172,42,172Z\"/><path stroke-width=\"2\" fill=\"none\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" stroke=\"{{chart-1}}\" d=\"M42,99.64C60.533,93.7,79.067,87.76,97.6,87.76C116.133,87.76,134.667,95.05,153.2,95.05C171.733,95.05,190.267,78.67,208.8,72.91C227.333,67.15,245.867,65.708,264.4,60.49C282.933,55.272,301.467,48.438,320,41.604\"/></g></g></g></svg>"
      }
    ],
    "labels": [
      {
        "text": "May",
        "x": 32.5312,
        "y": 184.1,
        "w": 19.6603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jun",
        "x": 89.3422,
        "y": 184.1,
        "w": 16.5752,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jul",
        "x": 146.7391,
        "y": 184.1,
        "w": 12.9219,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Aug",
        "x": 199.6984,
        "y": 184.1,
        "w": 18.2753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Sep",
        "x": 255.5094,
        "y": 184.1,
        "w": 17.8602,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Oct",
        "x": 309.2188,
        "y": 184.1,
        "w": 16.7812,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "0",
        "x": 27.8906,
        "y": 164.55,
        "w": 6.1094,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "15K",
        "x": 18.375,
        "y": 124.05,
        "w": 15.6752,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "30K",
        "x": 16.4219,
        "y": 83.55,
        "w": 17.6302,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "45K",
        "x": 16.3906,
        "y": 43.05,
        "w": 17.6703,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "60K",
        "x": 15.75,
        "y": 2.55,
        "w": 18.3053,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      }
    ],
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Product",
        "Services",
        "Expansion"
      ],
      [
        "May",
        "$26,800",
        "$12,432",
        "$4,288"
      ],
      [
        "Jun",
        "$31,200",
        "$13,720",
        "$6,084"
      ],
      [
        "Jul",
        "$28,500",
        "$14,056",
        "$6,555"
      ],
      [
        "Aug",
        "$36,700",
        "$15,176",
        "$5,872"
      ],
      [
        "Sep",
        "$41,300",
        "$17,472",
        "$8,054"
      ],
      [
        "Oct",
        "$48,295",
        "$20,048",
        "$11,108"
      ]
    ]
  },
  {
    "kind": "line",
    "nativeKind": "Line",
    "title": "Growth signals",
    "description": "Three paths. One clear view.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><g><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"172\" x2=\"320\" y2=\"172\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"131.5\" x2=\"320\" y2=\"131.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"91\" x2=\"320\" y2=\"91\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"50.5\" x2=\"320\" y2=\"50.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"10\" x2=\"320\" y2=\"10\" fill=\"none\"/></g></g></g><g><g><g><g/></g></g><g><g><g/></g></g></g><g><g/><g/></g></svg>",
    "layers": [
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path stroke=\"{{chart-1}}\" stroke-width=\"2\" fill=\"none\" id=\"recharts-line-_r_3_\" height=\"162\" width=\"278\" d=\"M42,99.64C60.533,93.7,79.067,87.76,97.6,87.76C116.133,87.76,134.667,95.05,153.2,95.05C171.733,95.05,190.267,78.67,208.8,72.91C227.333,67.15,245.867,65.708,264.4,60.49C282.933,55.272,301.467,48.438,320,41.604\"/></g></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path stroke=\"{{chart-2}}\" stroke-width=\"2\" fill=\"none\" id=\"recharts-line-_r_4_\" height=\"162\" width=\"278\" stroke-dasharray=\"4 4\" d=\"M42,138.434C60.533,136.997,79.067,135.561,97.6,134.956C116.133,134.351,134.667,134.654,153.2,134.049C171.733,133.444,190.267,132.562,208.8,131.025C227.333,129.488,245.867,127.018,264.4,124.826C282.933,122.633,301.467,120.252,320,117.87\"/></g></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path stroke=\"{{chart-3}}\" stroke-width=\"2\" fill=\"none\" id=\"recharts-line-_r_5_\" height=\"162\" width=\"278\" d=\"M42,160.422C60.533,158.422,79.067,156.421,97.6,155.573C116.133,154.725,134.667,154.302,153.2,154.302C171.733,154.302,190.267,156.146,208.8,156.146C227.333,156.146,245.867,152.61,264.4,150.254C282.933,147.898,301.467,144.953,320,142.008\"/></g></g></svg>"
      }
    ],
    "labels": [
      {
        "text": "May",
        "x": 32.5312,
        "y": 184.1,
        "w": 19.6603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jun",
        "x": 89.3422,
        "y": 184.1,
        "w": 16.5753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jul",
        "x": 146.7391,
        "y": 184.1,
        "w": 12.9219,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Aug",
        "x": 199.6984,
        "y": 184.1,
        "w": 18.2753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Sep",
        "x": 255.5094,
        "y": 184.1,
        "w": 17.8602,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Oct",
        "x": 309.2188,
        "y": 184.1,
        "w": 16.7812,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "0",
        "x": 27.8906,
        "y": 164.55,
        "w": 6.1094,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "15K",
        "x": 18.375,
        "y": 124.05,
        "w": 15.6752,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "30K",
        "x": 16.4219,
        "y": 83.55,
        "w": 17.6302,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "45K",
        "x": 16.3906,
        "y": 43.05,
        "w": 17.6703,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "60K",
        "x": 15.75,
        "y": 2.55,
        "w": 18.3053,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      }
    ],
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Product",
        "Services",
        "Expansion"
      ],
      [
        "May",
        "$26,800",
        "$12,432",
        "$4,288"
      ],
      [
        "Jun",
        "$31,200",
        "$13,720",
        "$6,084"
      ],
      [
        "Jul",
        "$28,500",
        "$14,056",
        "$6,555"
      ],
      [
        "Aug",
        "$36,700",
        "$15,176",
        "$5,872"
      ],
      [
        "Sep",
        "$41,300",
        "$17,472",
        "$8,054"
      ],
      [
        "Oct",
        "$48,295",
        "$20,048",
        "$11,108"
      ]
    ]
  },
  {
    "kind": "bar",
    "nativeKind": "Bar",
    "title": "Period comparison",
    "description": "Compare the parts side by side.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><g><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"172\" x2=\"320\" y2=\"172\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"131.5\" x2=\"320\" y2=\"131.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"91\" x2=\"320\" y2=\"91\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"50.5\" x2=\"320\" y2=\"50.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"10\" x2=\"320\" y2=\"10\" fill=\"none\"/></g></g></g><g><g><g><g/></g></g><g><g><g/></g></g></g><g><g/><g/></g></svg>",
    "layers": [
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_6_\"><g><g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"46.6333\" y=\"99.64\" width=\"10\" height=\"72.36\" d=\"M46.6333,103.64A 4,4,0,0,1,50.6333,99.64L 52.6333,99.64A 4,4,0,0,1,         56.6333,103.64L 56.6333,168A 4,4,0,0,1,         52.6333,172L 50.6333,172A 4,4,0,0,1,         46.6333,168Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"92.9667\" y=\"87.76\" width=\"10\" height=\"84.24\" d=\"M92.9667,91.76A 4,4,0,0,1,96.9667,87.76L 98.9667,87.76A 4,4,0,0,1,         102.9667,91.76L 102.9667,168A 4,4,0,0,1,         98.9667,172L 96.9667,172A 4,4,0,0,1,         92.9667,168Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"139.3\" y=\"95.05\" width=\"10\" height=\"76.95\" d=\"M139.3,99.05A 4,4,0,0,1,143.3,95.05L 145.3,95.05A 4,4,0,0,1,         149.3,99.05L 149.3,168A 4,4,0,0,1,         145.3,172L 143.3,172A 4,4,0,0,1,         139.3,168Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"185.6333\" y=\"72.91\" width=\"10\" height=\"99.09\" d=\"M185.6333,76.91A 4,4,0,0,1,189.6333,72.91L 191.6333,72.91A 4,4,0,0,1,         195.6333,76.91L 195.6333,168A 4,4,0,0,1,         191.6333,172L 189.6333,172A 4,4,0,0,1,         185.6333,168Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"231.9667\" y=\"60.49\" width=\"10\" height=\"111.51\" d=\"M231.9667,64.49A 4,4,0,0,1,235.9667,60.49L 237.9667,60.49A 4,4,0,0,1,         241.9667,64.49L 241.9667,168A 4,4,0,0,1,         237.9667,172L 235.9667,172A 4,4,0,0,1,         231.9667,168Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"278.3\" y=\"41.6035\" width=\"10\" height=\"130.3965\" d=\"M278.3,45.6035A 4,4,0,0,1,282.3,41.6035L 284.3,41.6035A 4,4,0,0,1,         288.3,45.6035L 288.3,168A 4,4,0,0,1,         284.3,172L 282.3,172A 4,4,0,0,1,         278.3,168Z\"/></g></g></g></g></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_7_\"><g><g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"59.6333\" y=\"138.4336\" width=\"10\" height=\"33.5664\" d=\"M59.6333,142.4336A 4,4,0,0,1,63.6333,138.4336L 65.6333,138.4336A 4,4,0,0,1,         69.6333,142.4336L 69.6333,168A 4,4,0,0,1,         65.6333,172L 63.6333,172A 4,4,0,0,1,         59.6333,168Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"105.9667\" y=\"134.956\" width=\"10\" height=\"37.044\" d=\"M105.9667,138.956A 4,4,0,0,1,109.9667,134.956L 111.9667,134.956A 4,4,0,0,1,         115.9667,138.956L 115.9667,168A 4,4,0,0,1,         111.9667,172L 109.9667,172A 4,4,0,0,1,         105.9667,168Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"152.3\" y=\"134.0488\" width=\"10\" height=\"37.9512\" d=\"M152.3,138.0488A 4,4,0,0,1,156.3,134.0488L 158.3,134.0488A 4,4,0,0,1,         162.3,138.0488L 162.3,168A 4,4,0,0,1,         158.3,172L 156.3,172A 4,4,0,0,1,         152.3,168Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"198.6333\" y=\"131.0248\" width=\"10\" height=\"40.9752\" d=\"M198.6333,135.0248A 4,4,0,0,1,202.6333,131.0248L 204.6333,131.0248A 4,4,0,0,1,         208.6333,135.0248L 208.6333,168A 4,4,0,0,1,         204.6333,172L 202.6333,172A 4,4,0,0,1,         198.6333,168Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"244.9667\" y=\"124.8256\" width=\"10\" height=\"47.1744\" d=\"M244.9667,128.8256A 4,4,0,0,1,248.9667,124.8256L 250.9667,124.8256A 4,4,0,0,1,         254.9667,128.8256L 254.9667,168A 4,4,0,0,1,         250.9667,172L 248.9667,172A 4,4,0,0,1,         244.9667,168Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"291.3\" y=\"117.8704\" width=\"10\" height=\"54.1296\" d=\"M291.3,121.8704A 4,4,0,0,1,295.3,117.8704L 297.3,117.8704A 4,4,0,0,1,         301.3,121.8704L 301.3,168A 4,4,0,0,1,         297.3,172L 295.3,172A 4,4,0,0,1,         291.3,168Z\"/></g></g></g></g></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_8_\"><g><g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"72.6333\" y=\"160.4224\" width=\"10\" height=\"11.5776\" d=\"M72.6333,164.4224A 4,4,0,0,1,76.6333,160.4224L 78.6333,160.4224A 4,4,0,0,1,         82.6333,164.4224L 82.6333,168A 4,4,0,0,1,         78.6333,172L 76.6333,172A 4,4,0,0,1,         72.6333,168Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"118.9667\" y=\"155.5732\" width=\"10\" height=\"16.4268\" d=\"M118.9667,159.5732A 4,4,0,0,1,122.9667,155.5732L 124.9667,155.5732A 4,4,0,0,1,         128.9667,159.5732L 128.9667,168A 4,4,0,0,1,         124.9667,172L 122.9667,172A 4,4,0,0,1,         118.9667,168Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"165.3\" y=\"154.3015\" width=\"10\" height=\"17.6985\" d=\"M165.3,158.3015A 4,4,0,0,1,169.3,154.3015L 171.3,154.3015A 4,4,0,0,1,         175.3,158.3015L 175.3,168A 4,4,0,0,1,         171.3,172L 169.3,172A 4,4,0,0,1,         165.3,168Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"211.6333\" y=\"156.1456\" width=\"10\" height=\"15.8544\" d=\"M211.6333,160.1456A 4,4,0,0,1,215.6333,156.1456L 217.6333,156.1456A 4,4,0,0,1,         221.6333,160.1456L 221.6333,168A 4,4,0,0,1,         217.6333,172L 215.6333,172A 4,4,0,0,1,         211.6333,168Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"257.9667\" y=\"150.2542\" width=\"10\" height=\"21.7458\" d=\"M257.9667,154.2542A 4,4,0,0,1,261.9667,150.2542L 263.9667,150.2542A 4,4,0,0,1,         267.9667,154.2542L 267.9667,168A 4,4,0,0,1,         263.9667,172L 261.9667,172A 4,4,0,0,1,         257.9667,168Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"304.3\" y=\"142.0084\" width=\"10\" height=\"29.9916\" d=\"M304.3,146.0084A 4,4,0,0,1,308.3,142.0084L 310.3,142.0084A 4,4,0,0,1,         314.3,146.0084L 314.3,168A 4,4,0,0,1,         310.3,172L 308.3,172A 4,4,0,0,1,         304.3,168Z\"/></g></g></g></g></g></svg>"
      }
    ],
    "labels": [
      {
        "text": "May",
        "x": 55.6979,
        "y": 184.1,
        "w": 19.6604,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jun",
        "x": 103.2422,
        "y": 184.1,
        "w": 16.5752,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jul",
        "x": 151.3724,
        "y": 184.1,
        "w": 12.9219,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Aug",
        "x": 195.0651,
        "y": 184.1,
        "w": 18.2753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Sep",
        "x": 241.6094,
        "y": 184.1,
        "w": 17.8604,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Oct",
        "x": 288.4427,
        "y": 184.1,
        "w": 16.7812,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "0",
        "x": 27.8906,
        "y": 164.55,
        "w": 6.1094,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "15K",
        "x": 18.375,
        "y": 124.05,
        "w": 15.6752,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "30K",
        "x": 16.4219,
        "y": 83.55,
        "w": 17.6302,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "45K",
        "x": 16.3906,
        "y": 43.05,
        "w": 17.6703,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "60K",
        "x": 15.75,
        "y": 2.55,
        "w": 18.3053,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      }
    ],
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Product",
        "Services",
        "Expansion"
      ],
      [
        "May",
        "$26,800",
        "$12,432",
        "$4,288"
      ],
      [
        "Jun",
        "$31,200",
        "$13,720",
        "$6,084"
      ],
      [
        "Jul",
        "$28,500",
        "$14,056",
        "$6,555"
      ],
      [
        "Aug",
        "$36,700",
        "$15,176",
        "$5,872"
      ],
      [
        "Sep",
        "$41,300",
        "$17,472",
        "$8,054"
      ],
      [
        "Oct",
        "$48,295",
        "$20,048",
        "$11,108"
      ]
    ]
  },
  {
    "kind": "pie",
    "nativeKind": "Donut",
    "title": "Revenue share",
    "description": "The contribution of each period.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g/></g></svg>",
    "layers": [
      {
        "key": "category-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path stroke=\"{{chart-1}}\" cx=\"163\" cy=\"105\" fill=\"{{chart-1}}\" stroke-width=\"1\" d=\"M 253,105     A 90,90,0,     0,0,     229.549,44.4094   L 207.366,64.6062             A 60,60,0,             0,1,             223,105 Z\"/></g></g></svg>"
      },
      {
        "key": "category-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path stroke=\"{{chart-2}}\" cx=\"163\" cy=\"105\" fill=\"{{chart-2}}\" stroke-width=\"1\" d=\"M 225.1603,39.9147     A 90,90,0,     0,0,     154.2471,15.4266   L 157.1647,45.2844             A 60,60,0,             0,1,             204.4402,61.6098 Z\"/></g></g></svg>"
      },
      {
        "key": "category-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path stroke=\"{{chart-3}}\" cx=\"163\" cy=\"105\" fill=\"{{chart-3}}\" stroke-width=\"1\" d=\"M 148.0201,16.2554     A 90,90,0,     0,0,     89.6547,52.8419   L 114.1031,70.2279             A 60,60,0,             0,1,             153.0134,45.8369 Z\"/></g></g></svg>"
      },
      {
        "key": "category-4",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path stroke=\"{{chart-4}}\" cx=\"163\" cy=\"105\" fill=\"{{chart-4}}\" stroke-width=\"1\" d=\"M 86.195,58.0853     A 90,90,0,     0,0,     82.4776,145.2012   L 109.3184,131.8008             A 60,60,0,             0,1,             111.7967,73.7235 Z\"/></g></g></svg>"
      },
      {
        "key": "category-5",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path stroke=\"{{chart-5}}\" cx=\"163\" cy=\"105\" fill=\"{{chart-5}}\" stroke-width=\"1\" d=\"M 85.478,150.7203     A 90,90,0,     0,0,     172.006,194.5483   L 169.004,164.6988             A 60,60,0,             0,1,             111.3187,135.4802 Z\"/></g></g></svg>"
      },
      {
        "key": "category-6",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path stroke=\"{{chart-1}}\" cx=\"163\" cy=\"105\" fill=\"{{chart-1}}\" stroke-width=\"1\" d=\"M 178.2306,193.7019     A 90,90,0,     0,0,     252.7808,111.2779   L 222.8539,109.1853             A 60,60,0,             0,1,             173.1537,164.1346 Z\"/></g></g></svg>"
      }
    ],
    "labels": [
      {
        "text": "212.8K",
        "x": 124.046875,
        "y": 79.5,
        "w": 77.90625,
        "h": 32,
        "size": 24,
        "weight": 600,
        "align": "middle",
        "role": "foreground",
        "lineHeight": 32,
        "tracking": -0.6
      },
      {
        "text": "Total",
        "x": 124.046875,
        "y": 115.5,
        "w": 77.90625,
        "h": 15,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      }
    ],
    "legendItems": [
      {
        "text": "May",
        "x": 1.421875,
        "y": 0,
        "w": 50.9375,
        "h": 32,
        "key": "category-1",
        "role": "chart-1"
      },
      {
        "text": "Jun",
        "x": 58.359375,
        "y": 0,
        "w": 48.515625,
        "h": 32,
        "key": "category-2",
        "role": "chart-2"
      },
      {
        "text": "Jul",
        "x": 112.875,
        "y": 0,
        "w": 44.921875,
        "h": 32,
        "key": "category-3",
        "role": "chart-3"
      },
      {
        "text": "Aug",
        "x": 163.796875,
        "y": 0,
        "w": 50.203125,
        "h": 32,
        "key": "category-4",
        "role": "chart-4"
      },
      {
        "text": "Sep",
        "x": 220,
        "y": 0,
        "w": 49.78125,
        "h": 32,
        "key": "category-5",
        "role": "chart-5"
      },
      {
        "text": "Oct",
        "x": 275.78125,
        "y": 0,
        "w": 48.78125,
        "h": 32,
        "key": "category-6",
        "role": "chart-1"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Product"
      ],
      [
        "May",
        "$26,800"
      ],
      [
        "Jun",
        "$31,200"
      ],
      [
        "Jul",
        "$28,500"
      ],
      [
        "Aug",
        "$36,700"
      ],
      [
        "Sep",
        "$41,300"
      ],
      [
        "Oct",
        "$48,295"
      ]
    ]
  },
  {
    "kind": "radar",
    "nativeKind": "Radar",
    "title": "Performance shape",
    "description": "Discover where each series leads.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><g><path cx=\"163\" cy=\"105\" stroke=\"{{border}}\" stroke-width=\"1\" fill=\"none\" d=\"M 163,105L 163,105L 163,105L 163,105L 163,105L 163,105Z\"/><path cx=\"163\" cy=\"105\" stroke=\"{{border}}\" stroke-width=\"1\" fill=\"none\" d=\"M 163,85L 180.3205,95L 180.3205,115L 163,125L 145.6795,115L 145.6795,95Z\"/><path cx=\"163\" cy=\"105\" stroke=\"{{border}}\" stroke-width=\"1\" fill=\"none\" d=\"M 163,65L 197.641,85L 197.641,125L 163,145L 128.359,125L 128.359,85Z\"/><path cx=\"163\" cy=\"105\" stroke=\"{{border}}\" stroke-width=\"1\" fill=\"none\" d=\"M 163,45L 214.9615,75L 214.9615,135L 163,165L 111.0385,135L 111.0385,75Z\"/><path cx=\"163\" cy=\"105\" stroke=\"{{border}}\" stroke-width=\"1\" fill=\"none\" d=\"M 163,25L 232.282,65L 232.282,145L 163,185L 93.718,145L 93.718,65Z\"/></g><g><line cx=\"163\" cy=\"105\" stroke=\"{{border}}\" stroke-width=\"1\" fill=\"none\" x1=\"163\" y1=\"105\" x2=\"163\" y2=\"25\"/><line cx=\"163\" cy=\"105\" stroke=\"{{border}}\" stroke-width=\"1\" fill=\"none\" x1=\"163\" y1=\"105\" x2=\"232.282\" y2=\"65\"/><line cx=\"163\" cy=\"105\" stroke=\"{{border}}\" stroke-width=\"1\" fill=\"none\" x1=\"163\" y1=\"105\" x2=\"232.282\" y2=\"145\"/><line cx=\"163\" cy=\"105\" stroke=\"{{border}}\" stroke-width=\"1\" fill=\"none\" x1=\"163\" y1=\"105\" x2=\"163\" y2=\"185\"/><line cx=\"163\" cy=\"105\" stroke=\"{{border}}\" stroke-width=\"1\" fill=\"none\" x1=\"163\" y1=\"105\" x2=\"93.718\" y2=\"145\"/><line cx=\"163\" cy=\"105\" stroke=\"{{border}}\" stroke-width=\"1\" fill=\"none\" x1=\"163\" y1=\"105\" x2=\"93.718\" y2=\"65\"/></g></g></g><g><g><path cx=\"163\" cy=\"105\" fill=\"none\" d=\"M163,25L232.282,65L232.282,145L163,185L93.718,145L93.718,65L163,25Z\"/><g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"163\" y1=\"25\" x2=\"163\" y2=\"17\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"232.282\" y1=\"65\" x2=\"239.2102\" y2=\"61\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"232.282\" y1=\"145\" x2=\"239.2102\" y2=\"149\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"163\" y1=\"185\" x2=\"163\" y2=\"193\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"93.718\" y1=\"145\" x2=\"86.7898\" y2=\"149\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"93.718\" y1=\"65\" x2=\"86.7898\" y2=\"61\"/></g></g></g></g></svg>",
    "layers": [
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path fill=\"{{chart-1}}\" fill-opacity=\"0.12\" stroke=\"{{chart-1}}\" stroke-width=\"2\" id=\"recharts-radar-_r_a_\" d=\"M163,69.2667L199.0267,84.2L195.909,124L163,153.9333L115.3109,132.5333L107.2337,72.8033L163,69.2667Z\"/></g></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path fill=\"{{chart-2}}\" fill-opacity=\"0.12\" stroke=\"{{chart-2}}\" stroke-width=\"2\" id=\"recharts-radar-_r_b_\" d=\"M163,88.424L178.8425,95.8533L179.2305,114.3707L163,125.2347L142.8251,116.648L139.8506,91.6347L163,88.424Z\"/></g></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path fill=\"{{chart-3}}\" fill-opacity=\"0.12\" stroke=\"{{chart-3}}\" stroke-width=\"2\" id=\"recharts-radar-_r_c_\" d=\"M163,99.2827L170.0252,100.944L170.5691,109.37L163,112.8293L153.7,110.3693L150.1736,97.5947L163,99.2827Z\"/></g></g></svg>"
      }
    ],
    "labels": [
      {
        "text": "May",
        "x": 153.5312,
        "y": 6,
        "w": 19.6603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jun",
        "x": 239.2102,
        "y": 53.55,
        "w": 16.5753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "start",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jul",
        "x": 239.2102,
        "y": 141.55,
        "w": 12.9219,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "start",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Aug",
        "x": 153.8984,
        "y": 189.1,
        "w": 18.2753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Sep",
        "x": 69.0085,
        "y": 141.55,
        "w": 17.8602,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Oct",
        "x": 70.0085,
        "y": 53.55,
        "w": 16.7812,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      }
    ],
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Product",
        "Services",
        "Expansion"
      ],
      [
        "May",
        "$26,800",
        "$12,432",
        "$4,288"
      ],
      [
        "Jun",
        "$31,200",
        "$13,720",
        "$6,084"
      ],
      [
        "Jul",
        "$28,500",
        "$14,056",
        "$6,555"
      ],
      [
        "Aug",
        "$36,700",
        "$15,176",
        "$5,872"
      ],
      [
        "Sep",
        "$41,300",
        "$17,472",
        "$8,054"
      ],
      [
        "Oct",
        "$48,295",
        "$20,048",
        "$11,108"
      ]
    ]
  },
  {
    "kind": "radial",
    "nativeKind": "Radial",
    "title": "Goal orbit",
    "description": "Four goals, moving forward.",
    "metric": "79%",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path fill=\"{{surface-subtle}}\" cx=\"163\" cy=\"105\" stroke=\"{{chart-1}}\" stroke-width=\"1\" d=\"M 118.375,105     A 44.625,44.625,0,     1,1,     118.375,105.0008   L 131.375,105.0006             A 31.625,31.625,0,             1,0,             131.375,105 Z\"/></g><g><path fill=\"{{surface-subtle}}\" cx=\"163\" cy=\"105\" stroke=\"{{chart-2}}\" stroke-width=\"1\" d=\"M 102.125,105     A 60.875,60.875,0,     1,1,     102.125,105.0011   L 115.125,105.0008             A 47.875,47.875,0,             1,0,             115.125,105 Z\"/></g><g><path fill=\"{{surface-subtle}}\" cx=\"163\" cy=\"105\" stroke=\"{{chart-3}}\" stroke-width=\"1\" d=\"M 85.875,105     A 77.125,77.125,0,     1,1,     85.875,105.0013   L 98.875,105.0011             A 64.125,64.125,0,             1,0,             98.875,105 Z\"/></g><g><path fill=\"{{surface-subtle}}\" cx=\"163\" cy=\"105\" stroke=\"{{chart-4}}\" stroke-width=\"1\" d=\"M 69.625,105     A 93.375,93.375,0,     1,1,     69.625,105.0016   L 82.625,105.0014             A 80.375,80.375,0,             1,0,             82.625,105 Z\"/></g></g><g><g><g/></g></g><g><g><path cx=\"163\" cy=\"105\" fill=\"none\" d=\"M68,105L86.1434,49.1604L133.6434,14.6496L192.3566,14.6496L239.8566,49.1604L258,105L239.8566,160.8396L192.3566,195.3504L133.6434,195.3504L86.1434,160.8396L68,105Z\"/><g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"68\" y1=\"105\" x2=\"60\" y2=\"105\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"86.1434\" y1=\"49.1604\" x2=\"79.6712\" y2=\"44.4581\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"133.6434\" y1=\"14.6496\" x2=\"131.1712\" y2=\"7.0412\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"192.3566\" y1=\"14.6496\" x2=\"194.8288\" y2=\"7.0412\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"239.8566\" y1=\"49.1604\" x2=\"246.3288\" y2=\"44.4581\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"258\" y1=\"105\" x2=\"266\" y2=\"105\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"239.8566\" y1=\"160.8396\" x2=\"246.3288\" y2=\"165.5419\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"192.3566\" y1=\"195.3504\" x2=\"194.8288\" y2=\"202.9588\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"133.6434\" y1=\"195.3504\" x2=\"131.1712\" y2=\"202.9588\"/></g><g><line cx=\"163\" cy=\"105\" fill=\"none\" x1=\"86.1434\" y1=\"160.8396\" x2=\"79.6712\" y2=\"165.5419\"/></g></g></g></g></svg>",
    "layers": [
      {
        "key": "category-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><path fill=\"{{chart-1}}\" cx=\"163\" cy=\"105\" stroke=\"{{chart-1}}\" stroke-width=\"1\" d=\"M 124.8439,105     A6,6,0,0,1,118.9167,98.068     A44.625,44.625,0,1,1,150.5025,147.8393     A6,6,0,0,1,146.7539,139.5247   L147.1851,138.6085       A6,6,0,0,1,154.2703,135.3963       A31.625,31.625,0,1,0,131.7797,99.9568       A6,6,0,0,1,125.8565,105Z\"/></svg>"
      },
      {
        "key": "category-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><path fill=\"{{chart-2}}\" cx=\"163\" cy=\"105\" stroke=\"{{chart-2}}\" stroke-width=\"1\" d=\"M 108.454,105     A6,6,0,0,1,102.49,98.344     A60.875,60.875,0,1,1,173.4424,164.9727     A6,6,0,0,1,166.425,159.4384   L166.3618,158.4342       A6,6,0,0,1,171.3087,152.1485       A47.875,47.875,0,1,0,115.4228,99.6682       A6,6,0,0,1,109.4601,105Z\"/></svg>"
      },
      {
        "key": "category-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><path fill=\"{{chart-3}}\" cx=\"163\" cy=\"105\" stroke=\"{{chart-3}}\" stroke-width=\"1\" d=\"M 92.1285,105     A6,6,0,0,1,86.1499,98.4938     A77.125,77.125,0,1,1,101.5995,151.6717     A6,6,0,0,1,103.1612,142.9748   L104.0086,142.4371       A6,6,0,0,1,111.9959,143.8664       A64.125,64.125,0,1,0,99.1102,99.5134       A6,6,0,0,1,93.1322,105Z\"/></svg>"
      },
      {
        "key": "category-4",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"50%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><path fill=\"{{chart-4}}\" cx=\"163\" cy=\"105\" stroke=\"{{chart-4}}\" stroke-width=\"1\" d=\"M 75.8313,105     A6,6,0,0,1,69.8454,98.588     A93.375,93.375,0,1,1,208.4651,186.5587     A6,6,0,0,1,200.1146,183.8726   L199.6878,182.9656       A6,6,0,0,1,202.1912,175.1726       A80.375,80.375,0,1,0,82.8192,99.4168       A6,6,0,0,1,76.8336,105Z\"/></svg>"
      }
    ],
    "labels": [],
    "legendItems": [
      {
        "text": "Activation",
        "x": 7.328125,
        "y": 0,
        "w": 78.75,
        "h": 32,
        "key": "category-1",
        "role": "chart-1"
      },
      {
        "text": "Retention",
        "x": 92.078125,
        "y": 0,
        "w": 77.796875,
        "h": 32,
        "key": "category-2",
        "role": "chart-2"
      },
      {
        "text": "Revenue",
        "x": 175.875,
        "y": 0,
        "w": 72.265625,
        "h": 32,
        "key": "category-3",
        "role": "chart-3"
      },
      {
        "text": "Quality",
        "x": 254.140625,
        "y": 0,
        "w": 64.53125,
        "h": 32,
        "key": "category-4",
        "role": "chart-4"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Progress"
      ],
      [
        "Activation",
        "82%"
      ],
      [
        "Retention",
        "74%"
      ],
      [
        "Revenue",
        "91%"
      ],
      [
        "Quality",
        "68%"
      ]
    ]
  },
  {
    "kind": "horizontal-bar",
    "nativeKind": "HorizontalBar",
    "title": "Revenue ranking",
    "description": "Room for labels and comparisons.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><g><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"64\" y=\"10\" width=\"256\" height=\"162\" x1=\"64\" y1=\"10\" x2=\"64\" y2=\"172\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"64\" y=\"10\" width=\"256\" height=\"162\" x1=\"128\" y1=\"10\" x2=\"128\" y2=\"172\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"64\" y=\"10\" width=\"256\" height=\"162\" x1=\"192\" y1=\"10\" x2=\"192\" y2=\"172\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"64\" y=\"10\" width=\"256\" height=\"162\" x1=\"256\" y1=\"10\" x2=\"256\" y2=\"172\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"64\" y=\"10\" width=\"256\" height=\"162\" x1=\"320\" y1=\"10\" x2=\"320\" y2=\"172\" fill=\"none\"/></g></g></g><g><g><g><g/></g></g><g><g><g/></g></g></g><g><g/><g/></g></svg>",
    "layers": [
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_e_\"><g><g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"64\" y=\"12.7\" width=\"114.3467\" height=\"5\" d=\"M64,12.7L 175.8467,12.7A 2.5,2.5,0,0,1,         178.3467,15.2L 178.3467,15.2A 2.5,2.5,0,0,1,         175.8467,17.7L 64,17.7Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"64\" y=\"39.7\" width=\"133.12\" height=\"5\" d=\"M64,39.7L 194.62,39.7A 2.5,2.5,0,0,1,         197.12,42.2L 197.12,42.2A 2.5,2.5,0,0,1,         194.62,44.7L 64,44.7Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"64\" y=\"66.7\" width=\"121.6\" height=\"5\" d=\"M64,66.7L 183.1,66.7A 2.5,2.5,0,0,1,         185.6,69.2L 185.6,69.2A 2.5,2.5,0,0,1,         183.1,71.7L 64,71.7Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"64\" y=\"93.7\" width=\"156.5867\" height=\"5\" d=\"M64,93.7L 218.0867,93.7A 2.5,2.5,0,0,1,         220.5867,96.2L 220.5867,96.2A 2.5,2.5,0,0,1,         218.0867,98.7L 64,98.7Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"64\" y=\"120.7\" width=\"176.2133\" height=\"5\" d=\"M64,120.7L 237.7133,120.7A 2.5,2.5,0,0,1,         240.2133,123.2L 240.2133,123.2A 2.5,2.5,0,0,1,         237.7133,125.7L 64,125.7Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"64\" y=\"147.7\" width=\"206.0587\" height=\"5\" d=\"M64,147.7L 267.5587,147.7A 2.5,2.5,0,0,1,         270.0587,150.2L 270.0587,150.2A 2.5,2.5,0,0,1,         267.5587,152.7L 64,152.7Z\"/></g></g></g></g></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_f_\"><g><g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"64\" y=\"20.7\" width=\"53.0432\" height=\"5\" d=\"M64,20.7L 114.5432,20.7A 2.5,2.5,0,0,1,         117.0432,23.2L 117.0432,23.2A 2.5,2.5,0,0,1,         114.5432,25.7L 64,25.7Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"64\" y=\"47.7\" width=\"58.5387\" height=\"5\" d=\"M64,47.7L 120.0387,47.7A 2.5,2.5,0,0,1,         122.5387,50.2L 122.5387,50.2A 2.5,2.5,0,0,1,         120.0387,52.7L 64,52.7Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"64\" y=\"74.7\" width=\"59.9723\" height=\"5\" d=\"M64,74.7L 121.4723,74.7A 2.5,2.5,0,0,1,         123.9723,77.2L 123.9723,77.2A 2.5,2.5,0,0,1,         121.4723,79.7L 64,79.7Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"64\" y=\"101.7\" width=\"64.7509\" height=\"5\" d=\"M64,101.7L 126.2509,101.7A 2.5,2.5,0,0,1,         128.7509,104.2L 128.7509,104.2A 2.5,2.5,0,0,1,         126.2509,106.7L 64,106.7Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"64\" y=\"128.7\" width=\"74.5472\" height=\"5\" d=\"M64,128.7L 136.0472,128.7A 2.5,2.5,0,0,1,         138.5472,131.2L 138.5472,131.2A 2.5,2.5,0,0,1,         136.0472,133.7L 64,133.7Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"64\" y=\"155.7\" width=\"85.5381\" height=\"5\" d=\"M64,155.7L 147.0381,155.7A 2.5,2.5,0,0,1,         149.5381,158.2L 149.5381,158.2A 2.5,2.5,0,0,1,         147.0381,160.7L 64,160.7Z\"/></g></g></g></g></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_g_\"><g><g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"64\" y=\"28.7\" width=\"18.2955\" height=\"5\" d=\"M64,28.7L 79.7955,28.7A 2.5,2.5,0,0,1,         82.2955,31.2L 82.2955,31.2A 2.5,2.5,0,0,1,         79.7955,33.7L 64,33.7Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"64\" y=\"55.7\" width=\"25.9584\" height=\"5\" d=\"M64,55.7L 87.4584,55.7A 2.5,2.5,0,0,1,         89.9584,58.2L 89.9584,58.2A 2.5,2.5,0,0,1,         87.4584,60.7L 64,60.7Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"64\" y=\"82.7\" width=\"27.968\" height=\"5\" d=\"M64,82.7L 89.468,82.7A 2.5,2.5,0,0,1,         91.968,85.2L 91.968,85.2A 2.5,2.5,0,0,1,         89.468,87.7L 64,87.7Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"64\" y=\"109.7\" width=\"25.0539\" height=\"5\" d=\"M64,109.7L 86.5539,109.7A 2.5,2.5,0,0,1,         89.0539,112.2L 89.0539,112.2A 2.5,2.5,0,0,1,         86.5539,114.7L 64,114.7Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"64\" y=\"136.7\" width=\"34.3637\" height=\"5\" d=\"M64,136.7L 95.8637,136.7A 2.5,2.5,0,0,1,         98.3637,139.2L 98.3637,139.2A 2.5,2.5,0,0,1,         95.8637,141.7L 64,141.7Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"64\" y=\"163.7\" width=\"47.3941\" height=\"5\" d=\"M64,163.7L 108.8941,163.7A 2.5,2.5,0,0,1,         111.3941,166.2L 111.3941,166.2A 2.5,2.5,0,0,1,         108.8941,168.7L 64,168.7Z\"/></g></g></g></g></g></svg>"
      }
    ],
    "labels": [
      {
        "text": "0",
        "x": 60.9453,
        "y": 176.1,
        "w": 6.1094,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "15K",
        "x": 120.1875,
        "y": 176.1,
        "w": 15.6752,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "30K",
        "x": 183.2109,
        "y": 176.1,
        "w": 17.6302,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "45K",
        "x": 247.1953,
        "y": 176.1,
        "w": 17.6703,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "60K",
        "x": 307.75,
        "y": 176.1,
        "w": 18.3053,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "May",
        "x": 37.0625,
        "y": 16.05,
        "w": 19.6603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jun",
        "x": 39.4844,
        "y": 43.05,
        "w": 16.5753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jul",
        "x": 43.0781,
        "y": 70.05,
        "w": 12.9219,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Aug",
        "x": 37.7969,
        "y": 97.05,
        "w": 18.2753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Sep",
        "x": 38.2188,
        "y": 124.05,
        "w": 17.8603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Oct",
        "x": 39.2188,
        "y": 151.05,
        "w": 16.7812,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      }
    ],
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Product",
        "Services",
        "Expansion"
      ],
      [
        "May",
        "$26,800",
        "$12,432",
        "$4,288"
      ],
      [
        "Jun",
        "$31,200",
        "$13,720",
        "$6,084"
      ],
      [
        "Jul",
        "$28,500",
        "$14,056",
        "$6,555"
      ],
      [
        "Aug",
        "$36,700",
        "$15,176",
        "$5,872"
      ],
      [
        "Sep",
        "$41,300",
        "$17,472",
        "$8,054"
      ],
      [
        "Oct",
        "$48,295",
        "$20,048",
        "$11,108"
      ]
    ]
  },
  {
    "kind": "stacked-bar",
    "nativeKind": "StackedBar",
    "title": "Revenue mix",
    "description": "See how the total comes together.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><g><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"172\" x2=\"320\" y2=\"172\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"131.5\" x2=\"320\" y2=\"131.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"91\" x2=\"320\" y2=\"91\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"50.5\" x2=\"320\" y2=\"50.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"10\" x2=\"320\" y2=\"10\" fill=\"none\"/></g></g></g><g><g><g><g/></g></g><g><g><g/></g></g></g><g><g/><g/></g></svg>",
    "layers": [
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_h_\"><g><g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"52.1333\" y=\"117.73\" width=\"26\" height=\"54.27\" d=\"M52.1333,121.73A 4,4,0,0,1,56.1333,117.73L 74.1333,117.73A 4,4,0,0,1,         78.1333,121.73L 78.1333,168A 4,4,0,0,1,         74.1333,172L 56.1333,172A 4,4,0,0,1,         52.1333,168Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"98.4667\" y=\"108.82\" width=\"26\" height=\"63.18\" d=\"M98.4667,112.82A 4,4,0,0,1,102.4667,108.82L 120.4667,108.82A 4,4,0,0,1,         124.4667,112.82L 124.4667,168A 4,4,0,0,1,         120.4667,172L 102.4667,172A 4,4,0,0,1,         98.4667,168Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"144.8\" y=\"114.2875\" width=\"26\" height=\"57.7125\" d=\"M144.8,118.2875A 4,4,0,0,1,148.8,114.2875L 166.8,114.2875A 4,4,0,0,1,         170.8,118.2875L 170.8,168A 4,4,0,0,1,         166.8,172L 148.8,172A 4,4,0,0,1,         144.8,168Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"191.1333\" y=\"97.6825\" width=\"26\" height=\"74.3175\" d=\"M191.1333,101.6825A 4,4,0,0,1,195.1333,97.6825L 213.1333,97.6825A 4,4,0,0,1,         217.1333,101.6825L 217.1333,168A 4,4,0,0,1,         213.1333,172L 195.1333,172A 4,4,0,0,1,         191.1333,168Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"237.4667\" y=\"88.3675\" width=\"26\" height=\"83.6325\" d=\"M237.4667,92.3675A 4,4,0,0,1,241.4667,88.3675L 259.4667,88.3675A 4,4,0,0,1,         263.4667,92.3675L 263.4667,168A 4,4,0,0,1,         259.4667,172L 241.4667,172A 4,4,0,0,1,         237.4667,168Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"283.8\" y=\"74.2026\" width=\"26\" height=\"97.7974\" d=\"M283.8,78.2026A 4,4,0,0,1,287.8,74.2026L 305.8,74.2026A 4,4,0,0,1,         309.8,78.2026L 309.8,168A 4,4,0,0,1,         305.8,172L 287.8,172A 4,4,0,0,1,         283.8,168Z\"/></g></g></g></g></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_i_\"><g><g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"52.1333\" y=\"92.5552\" width=\"26\" height=\"25.1748\" d=\"M52.1333,96.5552A 4,4,0,0,1,56.1333,92.5552L 74.1333,92.5552A 4,4,0,0,1,         78.1333,96.5552L 78.1333,113.73A 4,4,0,0,1,         74.1333,117.73L 56.1333,117.73A 4,4,0,0,1,         52.1333,113.73Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"98.4667\" y=\"81.037\" width=\"26\" height=\"27.783\" d=\"M98.4667,85.037A 4,4,0,0,1,102.4667,81.037L 120.4667,81.037A 4,4,0,0,1,         124.4667,85.037L 124.4667,104.82A 4,4,0,0,1,         120.4667,108.82L 102.4667,108.82A 4,4,0,0,1,         98.4667,104.82Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"144.8\" y=\"85.8241\" width=\"26\" height=\"28.4634\" d=\"M144.8,89.8241A 4,4,0,0,1,148.8,85.8241L 166.8,85.8241A 4,4,0,0,1,         170.8,89.8241L 170.8,110.2875A 4,4,0,0,1,         166.8,114.2875L 148.8,114.2875A 4,4,0,0,1,         144.8,110.2875Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"191.1333\" y=\"66.9511\" width=\"26\" height=\"30.7314\" d=\"M191.1333,70.9511A 4,4,0,0,1,195.1333,66.9511L 213.1333,66.9511A 4,4,0,0,1,         217.1333,70.9511L 217.1333,93.6825A 4,4,0,0,1,         213.1333,97.6825L 195.1333,97.6825A 4,4,0,0,1,         191.1333,93.6825Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"237.4667\" y=\"52.9867\" width=\"26\" height=\"35.3808\" d=\"M237.4667,56.9867A 4,4,0,0,1,241.4667,52.9867L 259.4667,52.9867A 4,4,0,0,1,         263.4667,56.9867L 263.4667,84.3675A 4,4,0,0,1,         259.4667,88.3675L 241.4667,88.3675A 4,4,0,0,1,         237.4667,84.3675Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"283.8\" y=\"33.6054\" width=\"26\" height=\"40.5972\" d=\"M283.8,37.6054A 4,4,0,0,1,287.8,33.6054L 305.8,33.6054A 4,4,0,0,1,         309.8,37.6054L 309.8,70.2026A 4,4,0,0,1,         305.8,74.2026L 287.8,74.2026A 4,4,0,0,1,         283.8,70.2026Z\"/></g></g></g></g></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_j_\"><g><g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"52.1333\" y=\"83.872\" width=\"26\" height=\"8.6832\" d=\"M52.1333,87.872A 4,4,0,0,1,56.1333,83.872L 74.1333,83.872A 4,4,0,0,1,         78.1333,87.872L 78.1333,88.5552A 4,4,0,0,1,         74.1333,92.5552L 56.1333,92.5552A 4,4,0,0,1,         52.1333,88.5552Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"98.4667\" y=\"68.7169\" width=\"26\" height=\"12.3201\" d=\"M98.4667,72.7169A 4,4,0,0,1,102.4667,68.7169L 120.4667,68.7169A 4,4,0,0,1,         124.4667,72.7169L 124.4667,77.037A 4,4,0,0,1,         120.4667,81.037L 102.4667,81.037A 4,4,0,0,1,         98.4667,77.037Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"144.8\" y=\"72.5502\" width=\"26\" height=\"13.2739\" d=\"M144.8,76.5502A 4,4,0,0,1,148.8,72.5502L 166.8,72.5502A 4,4,0,0,1,         170.8,76.5502L 170.8,81.8241A 4,4,0,0,1,         166.8,85.8241L 148.8,85.8241A 4,4,0,0,1,         144.8,81.8241Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"191.1333\" y=\"55.0603\" width=\"26\" height=\"11.8908\" d=\"M191.1333,59.0603A 4,4,0,0,1,195.1333,55.0603L 213.1333,55.0603A 4,4,0,0,1,         217.1333,59.0603L 217.1333,62.9511A 4,4,0,0,1,         213.1333,66.9511L 195.1333,66.9511A 4,4,0,0,1,         191.1333,62.9511Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"237.4667\" y=\"36.6774\" width=\"26\" height=\"16.3093\" d=\"M237.4667,40.6774A 4,4,0,0,1,241.4667,36.6774L 259.4667,36.6774A 4,4,0,0,1,         263.4667,40.6774L 263.4667,48.9867A 4,4,0,0,1,         259.4667,52.9867L 241.4667,52.9867A 4,4,0,0,1,         237.4667,48.9867Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"283.8\" y=\"11.1117\" width=\"26\" height=\"22.4937\" d=\"M283.8,15.1117A 4,4,0,0,1,287.8,11.1117L 305.8,11.1117A 4,4,0,0,1,         309.8,15.1117L 309.8,29.6054A 4,4,0,0,1,         305.8,33.6054L 287.8,33.6054A 4,4,0,0,1,         283.8,29.6054Z\"/></g></g></g></g></g></svg>"
      }
    ],
    "labels": [
      {
        "text": "May",
        "x": 55.6979,
        "y": 184.1,
        "w": 19.6603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jun",
        "x": 103.2422,
        "y": 184.1,
        "w": 16.5753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jul",
        "x": 151.3724,
        "y": 184.1,
        "w": 12.9219,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Aug",
        "x": 195.0651,
        "y": 184.1,
        "w": 18.2753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Sep",
        "x": 241.6094,
        "y": 184.1,
        "w": 17.8603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Oct",
        "x": 288.4427,
        "y": 184.1,
        "w": 16.7812,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "0",
        "x": 27.8906,
        "y": 164.55,
        "w": 6.1094,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "20K",
        "x": 16.25,
        "y": 124.05,
        "w": 17.8003,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "40K",
        "x": 16.0625,
        "y": 83.55,
        "w": 17.9953,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "60K",
        "x": 15.75,
        "y": 43.05,
        "w": 18.3053,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "80K",
        "x": 16.1562,
        "y": 2.55,
        "w": 17.9053,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      }
    ],
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Product",
        "Services",
        "Expansion"
      ],
      [
        "May",
        "$26,800",
        "$12,432",
        "$4,288"
      ],
      [
        "Jun",
        "$31,200",
        "$13,720",
        "$6,084"
      ],
      [
        "Jul",
        "$28,500",
        "$14,056",
        "$6,555"
      ],
      [
        "Aug",
        "$36,700",
        "$15,176",
        "$5,872"
      ],
      [
        "Sep",
        "$41,300",
        "$17,472",
        "$8,054"
      ],
      [
        "Oct",
        "$48,295",
        "$20,048",
        "$11,108"
      ]
    ]
  },
  {
    "kind": "stacked-area",
    "nativeKind": "StackedArea",
    "title": "Cumulative momentum",
    "description": "The whole story, layer by layer.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><g><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"172\" x2=\"320\" y2=\"172\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"131.5\" x2=\"320\" y2=\"131.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"91\" x2=\"320\" y2=\"91\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"50.5\" x2=\"320\" y2=\"50.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"10\" x2=\"320\" y2=\"10\" fill=\"none\"/></g></g></g><g><g><g><g/></g></g><g><g><g/></g></g></g><g><g/><g/></g></svg>",
    "layers": [
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><defs><linearGradient id=\"_R_2j3dav5uivb_-tertiary\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"{{chart-3}}\" stop-opacity=\"0.24\"/><stop offset=\"100%\" stop-color=\"{{chart-3}}\" stop-opacity=\"0.02\"/></linearGradient></defs><g><g><g><path stroke-width=\"2\" fill=\"url(#_R_2j3dav5uivb_-tertiary)\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" id=\"recharts-area-_r_k_\" stroke=\"none\" d=\"M42,163.317C60.533,161.816,79.067,160.316,97.6,159.68C116.133,159.044,134.667,158.726,153.2,158.726C171.733,158.726,190.267,160.109,208.8,160.109C227.333,160.109,245.867,157.458,264.4,155.691C282.933,153.924,301.467,151.715,320,149.506L320,172C301.467,172,282.933,172,264.4,172C245.867,172,227.333,172,208.8,172C190.267,172,171.733,172,153.2,172C134.667,172,116.133,172,97.6,172C79.067,172,60.533,172,42,172Z\"/><path stroke-width=\"2\" fill=\"none\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" stroke=\"{{chart-3}}\" d=\"M42,163.317C60.533,161.816,79.067,160.316,97.6,159.68C116.133,159.044,134.667,158.726,153.2,158.726C171.733,158.726,190.267,160.109,208.8,160.109C227.333,160.109,245.867,157.458,264.4,155.691C282.933,153.924,301.467,151.715,320,149.506\"/></g></g></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><defs><linearGradient id=\"_R_2j3dav5uivb_-secondary\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"{{chart-2}}\" stop-opacity=\"0.24\"/><stop offset=\"100%\" stop-color=\"{{chart-2}}\" stop-opacity=\"0.02\"/></linearGradient></defs><g><g><g><path stroke-width=\"2\" fill=\"url(#_R_2j3dav5uivb_-secondary)\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" id=\"recharts-area-_r_l_\" stroke=\"none\" d=\"M42,138.142C60.533,135.564,79.067,132.986,97.6,131.897C116.133,130.807,134.667,130.683,153.2,130.263C171.733,129.843,190.267,129.968,208.8,129.378C227.333,128.788,245.867,123.721,264.4,120.31C282.933,116.898,301.467,112.904,320,108.909L320,149.506C301.467,151.715,282.933,153.924,264.4,155.691C245.867,157.458,227.333,160.109,208.8,160.109C190.267,160.109,171.733,158.726,153.2,158.726C134.667,158.726,116.133,159.044,97.6,159.68C79.067,160.316,60.533,161.816,42,163.317Z\"/><path stroke-width=\"2\" fill=\"none\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" stroke=\"{{chart-2}}\" d=\"M42,138.142C60.533,135.564,79.067,132.986,97.6,131.897C116.133,130.807,134.667,130.683,153.2,130.263C171.733,129.843,190.267,129.968,208.8,129.378C227.333,128.788,245.867,123.721,264.4,120.31C282.933,116.898,301.467,112.904,320,108.909\"/></g></g></g></svg>"
      },
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><defs><linearGradient id=\"_R_2j3dav5uivb_-value\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"{{chart-1}}\" stop-opacity=\"0.24\"/><stop offset=\"100%\" stop-color=\"{{chart-1}}\" stop-opacity=\"0.02\"/></linearGradient></defs><g><g><g><path stroke-width=\"2\" fill=\"url(#_R_2j3dav5uivb_-value)\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" id=\"recharts-area-_r_m_\" stroke=\"none\" d=\"M42,83.872C60.533,76.294,79.067,68.717,97.6,68.717C116.133,68.717,134.667,72.55,153.2,72.55C171.733,72.55,190.267,61.039,208.8,55.06C227.333,49.081,245.867,44.002,264.4,36.677C282.933,29.353,301.467,20.232,320,11.112L320,108.909C301.467,112.904,282.933,116.898,264.4,120.31C245.867,123.721,227.333,128.788,208.8,129.378C190.267,129.968,171.733,129.843,153.2,130.263C134.667,130.683,116.133,130.807,97.6,131.897C79.067,132.986,60.533,135.564,42,138.142Z\"/><path stroke-width=\"2\" fill=\"none\" fill-opacity=\"0.6\" height=\"162\" width=\"278\" stroke=\"{{chart-1}}\" d=\"M42,83.872C60.533,76.294,79.067,68.717,97.6,68.717C116.133,68.717,134.667,72.55,153.2,72.55C171.733,72.55,190.267,61.039,208.8,55.06C227.333,49.081,245.867,44.002,264.4,36.677C282.933,29.353,301.467,20.232,320,11.112\"/></g></g></g></svg>"
      }
    ],
    "labels": [
      {
        "text": "May",
        "x": 32.5312,
        "y": 184.1,
        "w": 19.6603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jun",
        "x": 89.3422,
        "y": 184.1,
        "w": 16.5753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jul",
        "x": 146.739,
        "y": 184.1,
        "w": 12.9219,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Aug",
        "x": 199.6985,
        "y": 184.1,
        "w": 18.2753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Sep",
        "x": 255.5094,
        "y": 184.1,
        "w": 17.8602,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Oct",
        "x": 309.2188,
        "y": 184.1,
        "w": 16.7812,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "0",
        "x": 27.8906,
        "y": 164.55,
        "w": 6.1094,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "20K",
        "x": 16.25,
        "y": 124.05,
        "w": 17.8003,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "40K",
        "x": 16.0625,
        "y": 83.55,
        "w": 17.9952,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "60K",
        "x": 15.75,
        "y": 43.05,
        "w": 18.3053,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "80K",
        "x": 16.1562,
        "y": 2.55,
        "w": 17.9053,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      }
    ],
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Product",
        "Services",
        "Expansion"
      ],
      [
        "May",
        "$26,800",
        "$12,432",
        "$4,288"
      ],
      [
        "Jun",
        "$31,200",
        "$13,720",
        "$6,084"
      ],
      [
        "Jul",
        "$28,500",
        "$14,056",
        "$6,555"
      ],
      [
        "Aug",
        "$36,700",
        "$15,176",
        "$5,872"
      ],
      [
        "Sep",
        "$41,300",
        "$17,472",
        "$8,054"
      ],
      [
        "Oct",
        "$48,295",
        "$20,048",
        "$11,108"
      ]
    ]
  },
  {
    "kind": "diverging-bar",
    "nativeKind": "DivergingBar",
    "title": "Net movement",
    "description": "Gains above zero. Costs below.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><g><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"172\" x2=\"320\" y2=\"172\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"131.5\" x2=\"320\" y2=\"131.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"91\" x2=\"320\" y2=\"91\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"50.5\" x2=\"320\" y2=\"50.5\" fill=\"none\"/><line stroke=\"{{border}}\" stroke-dasharray=\"3 5\" x=\"42\" y=\"10\" width=\"278\" height=\"162\" x1=\"42\" y1=\"10\" x2=\"320\" y2=\"10\" fill=\"none\"/></g></g></g><g><g><line y=\"0\" stroke=\"{{muted-foreground}}\" fill=\"none\" fill-opacity=\"1\" stroke-width=\"1\" x1=\"42\" y1=\"91\" x2=\"320\" y2=\"91\"/></g></g><g><g><g><g/></g></g><g><g><g/></g></g></g><g><g/><g/></g></svg>",
    "layers": [
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_n_\"><g><g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"52.1333\" y=\"47.584\" width=\"26\" height=\"43.416\" d=\"M52.1333,51.584A 4,4,0,0,1,56.1333,47.584L 74.1333,47.584A 4,4,0,0,1,         78.1333,51.584L 78.1333,87A 4,4,0,0,1,         74.1333,91L 56.1333,91A 4,4,0,0,1,         52.1333,87Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"98.4667\" y=\"40.456\" width=\"26\" height=\"50.544\" d=\"M98.4667,44.456A 4,4,0,0,1,102.4667,40.456L 120.4667,40.456A 4,4,0,0,1,         124.4667,44.456L 124.4667,87A 4,4,0,0,1,         120.4667,91L 102.4667,91A 4,4,0,0,1,         98.4667,87Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"144.8\" y=\"44.83\" width=\"26\" height=\"46.17\" d=\"M144.8,48.83A 4,4,0,0,1,148.8,44.83L 166.8,44.83A 4,4,0,0,1,         170.8,48.83L 170.8,87A 4,4,0,0,1,         166.8,91L 148.8,91A 4,4,0,0,1,         144.8,87Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"191.1333\" y=\"31.546\" width=\"26\" height=\"59.454\" d=\"M191.1333,35.546A 4,4,0,0,1,195.1333,31.546L 213.1333,31.546A 4,4,0,0,1,         217.1333,35.546L 217.1333,87A 4,4,0,0,1,         213.1333,91L 195.1333,91A 4,4,0,0,1,         191.1333,87Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"237.4667\" y=\"24.094\" width=\"26\" height=\"66.906\" d=\"M237.4667,28.094A 4,4,0,0,1,241.4667,24.094L 259.4667,24.094A 4,4,0,0,1,         263.4667,28.094L 263.4667,87A 4,4,0,0,1,         259.4667,91L 241.4667,91A 4,4,0,0,1,         237.4667,87Z\"/></g></g><g><g><path fill=\"{{chart-1}}\" stroke=\"{{chart-1}}\" stroke-width=\"1\" x=\"283.8\" y=\"12.7621\" width=\"26\" height=\"78.2379\" d=\"M283.8,16.7621A 4,4,0,0,1,287.8,12.7621L 305.8,12.7621A 4,4,0,0,1,         309.8,16.7621L 309.8,87A 4,4,0,0,1,         305.8,91L 287.8,91A 4,4,0,0,1,         283.8,87Z\"/></g></g></g></g></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_o_\"><g><g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"52.1333\" y=\"107.1125\" width=\"26\" height=\"-16.1125\" d=\"M52.1333,103.1125A 4,4,0,0,0,56.1333,107.1125L 74.1333,107.1125A 4,4,0,0,0,         78.1333,103.1125L 78.1333,95A 4,4,0,0,0,         74.1333,91L 56.1333,91A 4,4,0,0,0,         52.1333,95Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"98.4667\" y=\"113.2264\" width=\"26\" height=\"-22.2264\" d=\"M98.4667,109.2264A 4,4,0,0,0,102.4667,113.2264L 120.4667,113.2264A 4,4,0,0,0,         124.4667,109.2264L 124.4667,95A 4,4,0,0,0,         120.4667,91L 102.4667,91A 4,4,0,0,0,         98.4667,95Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"144.8\" y=\"109.2169\" width=\"26\" height=\"-18.2169\" d=\"M144.8,105.2169A 4,4,0,0,0,148.8,109.2169L 166.8,109.2169A 4,4,0,0,0,         170.8,105.2169L 170.8,95A 4,4,0,0,0,         166.8,91L 148.8,91A 4,4,0,0,0,         144.8,95Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"191.1333\" y=\"115.5851\" width=\"26\" height=\"-24.5851\" d=\"M191.1333,111.5851A 4,4,0,0,0,195.1333,115.5851L 213.1333,115.5851A 4,4,0,0,0,         217.1333,111.5851L 217.1333,95A 4,4,0,0,0,         213.1333,91L 195.1333,91A 4,4,0,0,0,         191.1333,95Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"237.4667\" y=\"113.6444\" width=\"26\" height=\"-22.6444\" d=\"M237.4667,109.6444A 4,4,0,0,0,241.4667,113.6444L 259.4667,113.6444A 4,4,0,0,0,         263.4667,109.6444L 263.4667,95A 4,4,0,0,0,         259.4667,91L 241.4667,91A 4,4,0,0,0,         237.4667,95Z\"/></g></g><g><g><path fill=\"{{chart-2}}\" stroke=\"{{chart-2}}\" stroke-width=\"1\" x=\"283.8\" y=\"123.4778\" width=\"26\" height=\"-32.4778\" d=\"M283.8,119.4778A 4,4,0,0,0,287.8,123.4778L 305.8,123.4778A 4,4,0,0,0,         309.8,119.4778L 309.8,95A 4,4,0,0,0,         305.8,91L 287.8,91A 4,4,0,0,0,         283.8,95Z\"/></g></g></g></g></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g id=\"recharts-bar-_r_p_\"><g><g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"52.1333\" y=\"111.6275\" width=\"26\" height=\"-4.5149\" d=\"M52.1333,109.37A 2.2575,2.2575,0,0,0,54.3908,111.6275L 75.8759,111.6275A 2.2575,2.2575,0,0,0,         78.1333,109.37L 78.1333,109.37A 2.2575,2.2575,0,0,0,         75.8759,107.1125L 54.3908,107.1125A 2.2575,2.2575,0,0,0,         52.1333,109.37Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"98.4667\" y=\"119.6335\" width=\"26\" height=\"-6.4071\" d=\"M98.4667,116.43A 3.2036,3.2036,0,0,0,101.6702,119.6335L 121.2631,119.6335A 3.2036,3.2036,0,0,0,         124.4667,116.43L 124.4667,116.43A 3.2036,3.2036,0,0,0,         121.2631,113.2264L 101.6702,113.2264A 3.2036,3.2036,0,0,0,         98.4667,116.43Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"144.8\" y=\"116.1197\" width=\"26\" height=\"-6.9028\" d=\"M144.8,112.6683A 3.4514,3.4514,0,0,0,148.2514,116.1197L 167.3486,116.1197A 3.4514,3.4514,0,0,0,         170.8,112.6683L 170.8,112.6683A 3.4514,3.4514,0,0,0,         167.3486,109.2169L 148.2514,109.2169A 3.4514,3.4514,0,0,0,         144.8,112.6683Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"191.1333\" y=\"121.7687\" width=\"26\" height=\"-6.1835\" d=\"M191.1333,118.6769A 3.0918,3.0918,0,0,0,194.2251,121.7687L 214.0416,121.7687A 3.0918,3.0918,0,0,0,         217.1333,118.6769L 217.1333,118.6769A 3.0918,3.0918,0,0,0,         214.0416,115.5851L 194.2251,115.5851A 3.0918,3.0918,0,0,0,         191.1333,118.6769Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"237.4667\" y=\"122.1251\" width=\"26\" height=\"-8.4807\" d=\"M237.4667,118.1251A 4,4,0,0,0,241.4667,122.1251L 259.4667,122.1251A 4,4,0,0,0,         263.4667,118.1251L 263.4667,117.6444A 4,4,0,0,0,         259.4667,113.6444L 241.4667,113.6444A 4,4,0,0,0,         237.4667,117.6444Z\"/></g></g><g><g><path fill=\"{{chart-3}}\" stroke=\"{{chart-3}}\" stroke-width=\"1\" x=\"283.8\" y=\"135.1742\" width=\"26\" height=\"-11.6964\" d=\"M283.8,131.1742A 4,4,0,0,0,287.8,135.1742L 305.8,135.1742A 4,4,0,0,0,         309.8,131.1742L 309.8,127.4778A 4,4,0,0,0,         305.8,123.4778L 287.8,123.4778A 4,4,0,0,0,         283.8,127.4778Z\"/></g></g></g></g></g></svg>"
      }
    ],
    "labels": [
      {
        "text": "May",
        "x": 55.6979,
        "y": 184.1001,
        "w": 19.6603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jun",
        "x": 103.2422,
        "y": 184.1001,
        "w": 16.5753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jul",
        "x": 151.3724,
        "y": 184.1001,
        "w": 12.9219,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Aug",
        "x": 195.0651,
        "y": 184.1001,
        "w": 18.2753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Sep",
        "x": 241.6094,
        "y": 184.1001,
        "w": 17.8603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Oct",
        "x": 288.4427,
        "y": 184.1001,
        "w": 16.7812,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "-50K",
        "x": 11.9844,
        "y": 164.55,
        "w": 22.0754,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "-25K",
        "x": 12.375,
        "y": 124.05,
        "w": 21.6754,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "0",
        "x": 27.8906,
        "y": 83.55,
        "w": 6.1094,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "25K",
        "x": 16.5781,
        "y": 43.05,
        "w": 17.4753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "50K",
        "x": 16.1875,
        "y": 2.55,
        "w": 17.8753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      }
    ],
    "legendItems": [
      {
        "text": "Revenue",
        "x": 37.234375,
        "y": 0,
        "w": 72.265625,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Operations",
        "x": 115.5,
        "y": 0,
        "w": 83.40625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Acquisition",
        "x": 204.90625,
        "y": 0,
        "w": 83.859375,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Revenue",
        "Operations",
        "Acquisition"
      ],
      [
        "May",
        "$26,800",
        "-$9,946",
        "-$2,787"
      ],
      [
        "Jun",
        "$31,200",
        "-$13,720",
        "-$3,955"
      ],
      [
        "Jul",
        "$28,500",
        "-$11,245",
        "-$4,261"
      ],
      [
        "Aug",
        "$36,700",
        "-$15,176",
        "-$3,817"
      ],
      [
        "Sep",
        "$41,300",
        "-$13,978",
        "-$5,235"
      ],
      [
        "Oct",
        "$48,295",
        "-$20,048",
        "-$7,220"
      ]
    ]
  },
  {
    "kind": "gauge",
    "nativeKind": "Gauge",
    "title": "Activation pulse",
    "description": "A focused view of the next goal.",
    "metric": "82%",
    "width": 326,
    "height": 210,
    "cardHeight": 398,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"80%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><g><g><path fill=\"{{surface-subtle}}\" cx=\"163\" cy=\"168\" stroke=\"{{chart-1}}\" stroke-width=\"1\" d=\"M 81.1083,168     A10,10,0,0,1,71.182,156.7879     A92.5,92.5,0,0,1,254.818,156.7879     A10,10,0,0,1,244.8917,168   L244.8917,168       A10,10,0,0,1,234.9654,159.2121       A72.5,72.5,0,0,0,91.0346,159.2121       A10,10,0,0,1,81.1083,168Z\"/></g></g><g><g><g/></g></g><g><g><path cx=\"163\" cy=\"168\" fill=\"none\" d=\"M68,168L72.6496,138.6434L86.1434,112.1604L107.1604,91.1434L133.6434,77.6496L163,73L192.3566,77.6496L218.8396,91.1434L239.8566,112.1604L253.3504,138.6434L258,168L68,168Z\"/><g><g><line cx=\"163\" cy=\"168\" fill=\"none\" x1=\"68\" y1=\"168\" x2=\"60\" y2=\"168\"/></g><g><line cx=\"163\" cy=\"168\" fill=\"none\" x1=\"72.6496\" y1=\"138.6434\" x2=\"65.0412\" y2=\"136.1712\"/></g><g><line cx=\"163\" cy=\"168\" fill=\"none\" x1=\"86.1434\" y1=\"112.1604\" x2=\"79.6712\" y2=\"107.4581\"/></g><g><line cx=\"163\" cy=\"168\" fill=\"none\" x1=\"107.1604\" y1=\"91.1434\" x2=\"102.4581\" y2=\"84.6712\"/></g><g><line cx=\"163\" cy=\"168\" fill=\"none\" x1=\"133.6434\" y1=\"77.6496\" x2=\"131.1712\" y2=\"70.0412\"/></g><g><line cx=\"163\" cy=\"168\" fill=\"none\" x1=\"163\" y1=\"73\" x2=\"163\" y2=\"65\"/></g><g><line cx=\"163\" cy=\"168\" fill=\"none\" x1=\"192.3566\" y1=\"77.6496\" x2=\"194.8288\" y2=\"70.0412\"/></g><g><line cx=\"163\" cy=\"168\" fill=\"none\" x1=\"218.8396\" y1=\"91.1434\" x2=\"223.5419\" y2=\"84.6712\"/></g><g><line cx=\"163\" cy=\"168\" fill=\"none\" x1=\"239.8566\" y1=\"112.1604\" x2=\"246.3288\" y2=\"107.4581\"/></g><g><line cx=\"163\" cy=\"168\" fill=\"none\" x1=\"253.3504\" y1=\"138.6434\" x2=\"260.9588\" y2=\"136.1712\"/></g><g><line cx=\"163\" cy=\"168\" fill=\"none\" x1=\"258\" y1=\"168\" x2=\"266\" y2=\"168\"/></g></g></g></g></svg>",
    "layers": [
      {
        "key": "category-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" cx=\"50%\" cy=\"80%\" width=\"326\" height=\"210\" viewBox=\"0 0 326 210\"><path fill=\"{{chart-1}}\" cx=\"163\" cy=\"168\" stroke=\"{{chart-1}}\" stroke-width=\"1\" d=\"M 81.1083,168     A10,10,0,0,1,71.182,156.7879     A92.5,92.5,0,0,1,234.5167,109.3348     A10,10,0,0,1,232.1434,124.1202   L232.1434,124.1202       A10,10,0,0,1,219.0536,122.0191       A72.5,72.5,0,0,0,91.0346,159.2121       A10,10,0,0,1,81.1083,168Z\"/></svg>"
      }
    ],
    "labels": [
      {
        "text": "82%",
        "x": 132.015625,
        "y": 128,
        "w": 61.96875,
        "h": 41,
        "size": 30,
        "weight": 600,
        "align": "middle",
        "role": "foreground",
        "lineHeight": 36,
        "tracking": -0.75
      },
      {
        "text": "of 100%",
        "x": 0,
        "y": 171,
        "w": 326,
        "h": 15,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      }
    ],
    "legendItems": [],
    "legendHeight": 0,
    "table": [
      [
        "Period / goal",
        "Progress"
      ],
      [
        "Activation",
        "82%"
      ]
    ]
  },
  {
    "kind": "rings",
    "nativeKind": "Rings",
    "title": "Progress rings",
    "description": "Independent goals. Shared momentum.",
    "metric": "79%",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 260 230\" width=\"326\" height=\"210\"><g><circle cx=\"130\" cy=\"110\" r=\"96\" fill=\"none\" stroke=\"{{surface-subtle}}\" stroke-width=\"8\"/></g><g><circle cx=\"130\" cy=\"110\" r=\"83\" fill=\"none\" stroke=\"{{surface-subtle}}\" stroke-width=\"8\"/></g><g><circle cx=\"130\" cy=\"110\" r=\"70\" fill=\"none\" stroke=\"{{surface-subtle}}\" stroke-width=\"8\"/></g><g><circle cx=\"130\" cy=\"110\" r=\"57\" fill=\"none\" stroke=\"{{surface-subtle}}\" stroke-width=\"8\"/></g></svg>",
    "layers": [
      {
        "key": "category-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 260 230\" width=\"326\" height=\"210\"><g><circle cx=\"130\" cy=\"110\" r=\"96\" fill=\"none\" stroke=\"{{chart-1}}\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-dasharray=\"494.6123 603.1858\" transform=\"rotate(-90 130 110)\"/></g></svg>"
      },
      {
        "key": "category-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 260 230\" width=\"326\" height=\"210\"><g><circle cx=\"130\" cy=\"110\" r=\"83\" fill=\"none\" stroke=\"{{chart-2}}\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-dasharray=\"385.9132 521.5044\" transform=\"rotate(-90 130 110)\"/></g></svg>"
      },
      {
        "key": "category-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 260 230\" width=\"326\" height=\"210\"><g><circle cx=\"130\" cy=\"110\" r=\"70\" fill=\"none\" stroke=\"{{chart-3}}\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-dasharray=\"400.2389 439.823\" transform=\"rotate(-90 130 110)\"/></g></svg>"
      },
      {
        "key": "category-4",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 260 230\" width=\"326\" height=\"210\"><g><circle cx=\"130\" cy=\"110\" r=\"57\" fill=\"none\" stroke=\"{{chart-4}}\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-dasharray=\"243.5363 358.1416\" transform=\"rotate(-90 130 110)\"/></g></svg>"
      }
    ],
    "labels": [
      {
        "text": "79%",
        "x": 140.5938,
        "y": 75.6086,
        "w": 44.8125,
        "h": 30,
        "size": 21.913043478260867,
        "weight": 600,
        "align": "middle",
        "role": "foreground",
        "lineHeight": 32.869565217391305,
        "tracking": 0
      },
      {
        "text": "Average",
        "x": 145.9375,
        "y": 105.9565,
        "w": 34.125,
        "h": 13,
        "size": 9.130434782608695,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 13.695652173913043,
        "tracking": 0
      }
    ],
    "legendItems": [
      {
        "text": "Activation",
        "x": 7.328125,
        "y": 0,
        "w": 78.75,
        "h": 32,
        "key": "category-1",
        "role": "chart-1"
      },
      {
        "text": "Retention",
        "x": 92.078125,
        "y": 0,
        "w": 77.796875,
        "h": 32,
        "key": "category-2",
        "role": "chart-2"
      },
      {
        "text": "Revenue",
        "x": 175.875,
        "y": 0,
        "w": 72.265625,
        "h": 32,
        "key": "category-3",
        "role": "chart-3"
      },
      {
        "text": "Quality",
        "x": 254.140625,
        "y": 0,
        "w": 64.53125,
        "h": 32,
        "key": "category-4",
        "role": "chart-4"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Progress"
      ],
      [
        "Activation",
        "82%"
      ],
      [
        "Retention",
        "74%"
      ],
      [
        "Revenue",
        "91%"
      ],
      [
        "Quality",
        "68%"
      ]
    ]
  },
  {
    "kind": "heatmap",
    "nativeKind": "Heatmap",
    "title": "Activity spectrum",
    "description": "Find the busiest moments at a glance.",
    "metric": "1,265",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "baseSvg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g/><g/><g/><g/><g/><g/></svg>",
    "layers": [
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"66\" y=\"28\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-1}}\" fill-opacity=\"0.5927702702702702\" stroke=\"{{chart-1}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"148\" y=\"28\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-2}}\" fill-opacity=\"0.44594594594594594\" stroke=\"{{chart-2}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"230\" y=\"28\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-3}}\" fill-opacity=\"0.37668918918918914\" stroke=\"{{chart-3}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"66\" y=\"52\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-1}}\" fill-opacity=\"0.6980405405405405\" stroke=\"{{chart-1}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"148\" y=\"52\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-2}}\" fill-opacity=\"0.47364864864864864\" stroke=\"{{chart-2}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"230\" y=\"52\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-3}}\" fill-opacity=\"0.4597972972972973\" stroke=\"{{chart-3}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"66\" y=\"76\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-1}}\" fill-opacity=\"0.6952702702702702\" stroke=\"{{chart-1}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"148\" y=\"76\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-2}}\" fill-opacity=\"0.4791891891891892\" stroke=\"{{chart-2}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"230\" y=\"76\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-3}}\" fill-opacity=\"0.48195945945945945\" stroke=\"{{chart-3}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"66\" y=\"100\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-1}}\" fill-opacity=\"0.745135135135135\" stroke=\"{{chart-1}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"148\" y=\"100\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-2}}\" fill-opacity=\"0.5041216216216216\" stroke=\"{{chart-2}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"230\" y=\"100\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-3}}\" fill-opacity=\"0.4514864864864865\" stroke=\"{{chart-3}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"66\" y=\"124\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-1}}\" fill-opacity=\"0.8531756756756756\" stroke=\"{{chart-1}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"148\" y=\"124\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-2}}\" fill-opacity=\"0.5512162162162162\" stroke=\"{{chart-2}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"230\" y=\"124\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-3}}\" fill-opacity=\"0.5512162162162162\" stroke=\"{{chart-3}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-1",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"66\" y=\"148\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-1}}\" fill-opacity=\"1\" stroke=\"{{chart-1}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-2",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"148\" y=\"148\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-2}}\" fill-opacity=\"0.6066216216216216\" stroke=\"{{chart-2}}\" stroke-width=\"1\"/></g></svg>"
      },
      {
        "key": "series-3",
        "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 320 210\" width=\"326\" height=\"210\"><g><rect x=\"230\" y=\"148\" width=\"76\" height=\"19\" rx=\"4\" fill=\"{{chart-3}}\" fill-opacity=\"0.6924999999999999\" stroke=\"{{chart-3}}\" stroke-width=\"1\"/></g></svg>"
      }
    ],
    "labels": [
      {
        "text": "Product",
        "x": 91.5625,
        "y": 5,
        "w": 36.875,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Services",
        "x": 172.2422,
        "y": 5,
        "w": 39.5156,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Expansion",
        "x": 250.0859,
        "y": 5,
        "w": 47.886,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "middle",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "May",
        "x": 40.0625,
        "y": 31,
        "w": 19.6603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jun",
        "x": 42.4844,
        "y": 55,
        "w": 16.5753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Jul",
        "x": 46.0781,
        "y": 79,
        "w": 12.9219,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Aug",
        "x": 40.7969,
        "y": 103,
        "w": 18.2753,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Sep",
        "x": 41.2188,
        "y": 127,
        "w": 17.8603,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      },
      {
        "text": "Oct",
        "x": 42.2188,
        "y": 151,
        "w": 16.7812,
        "h": 14,
        "size": 10,
        "weight": 400,
        "align": "end",
        "role": "muted-foreground",
        "lineHeight": 15,
        "tracking": 0
      }
    ],
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32,
    "table": [
      [
        "Period / goal",
        "Product",
        "Services",
        "Expansion"
      ],
      [
        "May",
        "149",
        "96",
        "71"
      ],
      [
        "Jun",
        "187",
        "106",
        "101"
      ],
      [
        "Jul",
        "186",
        "108",
        "109"
      ],
      [
        "Aug",
        "204",
        "117",
        "98"
      ],
      [
        "Sep",
        "243",
        "134",
        "134"
      ],
      [
        "Oct",
        "296",
        "154",
        "185"
      ]
    ]
  }
]
  : [
  {
    "kind": "area",
    "nativeKind": "Area",
    "title": "Revenue flow",
    "description": "Every rise, in context.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32
  },
  {
    "kind": "line",
    "nativeKind": "Line",
    "title": "Growth signals",
    "description": "Three paths. One clear view.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32
  },
  {
    "kind": "bar",
    "nativeKind": "Bar",
    "title": "Period comparison",
    "description": "Compare the parts side by side.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32
  },
  {
    "kind": "pie",
    "nativeKind": "Donut",
    "title": "Revenue share",
    "description": "The contribution of each period.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "May",
        "x": 1.421875,
        "y": 0,
        "w": 50.9375,
        "h": 32,
        "key": "category-1",
        "role": "chart-1"
      },
      {
        "text": "Jun",
        "x": 58.359375,
        "y": 0,
        "w": 48.515625,
        "h": 32,
        "key": "category-2",
        "role": "chart-2"
      },
      {
        "text": "Jul",
        "x": 112.875,
        "y": 0,
        "w": 44.921875,
        "h": 32,
        "key": "category-3",
        "role": "chart-3"
      },
      {
        "text": "Aug",
        "x": 163.796875,
        "y": 0,
        "w": 50.203125,
        "h": 32,
        "key": "category-4",
        "role": "chart-4"
      },
      {
        "text": "Sep",
        "x": 220,
        "y": 0,
        "w": 49.78125,
        "h": 32,
        "key": "category-5",
        "role": "chart-5"
      },
      {
        "text": "Oct",
        "x": 275.78125,
        "y": 0,
        "w": 48.78125,
        "h": 32,
        "key": "category-6",
        "role": "chart-1"
      }
    ],
    "legendHeight": 32
  },
  {
    "kind": "radar",
    "nativeKind": "Radar",
    "title": "Performance shape",
    "description": "Discover where each series leads.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32
  },
  {
    "kind": "radial",
    "nativeKind": "Radial",
    "title": "Goal orbit",
    "description": "Four goals, moving forward.",
    "metric": "79%",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "Activation",
        "x": 7.328125,
        "y": 0,
        "w": 78.75,
        "h": 32,
        "key": "category-1",
        "role": "chart-1"
      },
      {
        "text": "Retention",
        "x": 92.078125,
        "y": 0,
        "w": 77.796875,
        "h": 32,
        "key": "category-2",
        "role": "chart-2"
      },
      {
        "text": "Revenue",
        "x": 175.875,
        "y": 0,
        "w": 72.265625,
        "h": 32,
        "key": "category-3",
        "role": "chart-3"
      },
      {
        "text": "Quality",
        "x": 254.140625,
        "y": 0,
        "w": 64.53125,
        "h": 32,
        "key": "category-4",
        "role": "chart-4"
      }
    ],
    "legendHeight": 32
  },
  {
    "kind": "horizontal-bar",
    "nativeKind": "HorizontalBar",
    "title": "Revenue ranking",
    "description": "Room for labels and comparisons.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32
  },
  {
    "kind": "stacked-bar",
    "nativeKind": "StackedBar",
    "title": "Revenue mix",
    "description": "See how the total comes together.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32
  },
  {
    "kind": "stacked-area",
    "nativeKind": "StackedArea",
    "title": "Cumulative momentum",
    "description": "The whole story, layer by layer.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32
  },
  {
    "kind": "diverging-bar",
    "nativeKind": "DivergingBar",
    "title": "Net movement",
    "description": "Gains above zero. Costs below.",
    "metric": "$212,795",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "Revenue",
        "x": 37.234375,
        "y": 0,
        "w": 72.265625,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Operations",
        "x": 115.5,
        "y": 0,
        "w": 83.40625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Acquisition",
        "x": 204.90625,
        "y": 0,
        "w": 83.859375,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32
  },
  {
    "kind": "gauge",
    "nativeKind": "Gauge",
    "title": "Activation pulse",
    "description": "A focused view of the next goal.",
    "metric": "82%",
    "width": 326,
    "height": 210,
    "cardHeight": 398,
    "legendItems": [],
    "legendHeight": 0
  },
  {
    "kind": "rings",
    "nativeKind": "Rings",
    "title": "Progress rings",
    "description": "Independent goals. Shared momentum.",
    "metric": "79%",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "Activation",
        "x": 7.328125,
        "y": 0,
        "w": 78.75,
        "h": 32,
        "key": "category-1",
        "role": "chart-1"
      },
      {
        "text": "Retention",
        "x": 92.078125,
        "y": 0,
        "w": 77.796875,
        "h": 32,
        "key": "category-2",
        "role": "chart-2"
      },
      {
        "text": "Revenue",
        "x": 175.875,
        "y": 0,
        "w": 72.265625,
        "h": 32,
        "key": "category-3",
        "role": "chart-3"
      },
      {
        "text": "Quality",
        "x": 254.140625,
        "y": 0,
        "w": 64.53125,
        "h": 32,
        "key": "category-4",
        "role": "chart-4"
      }
    ],
    "legendHeight": 32
  },
  {
    "kind": "heatmap",
    "nativeKind": "Heatmap",
    "title": "Activity spectrum",
    "description": "Find the busiest moments at a glance.",
    "metric": "1,265",
    "width": 326,
    "height": 210,
    "cardHeight": 442,
    "legendItems": [
      {
        "text": "Product",
        "x": 46.890625,
        "y": 0,
        "w": 68.875,
        "h": 32,
        "key": "series-1",
        "role": "chart-1"
      },
      {
        "text": "Services",
        "x": 121.765625,
        "y": 0,
        "w": 71.515625,
        "h": 32,
        "key": "series-2",
        "role": "chart-2"
      },
      {
        "text": "Expansion",
        "x": 199.28125,
        "y": 0,
        "w": 79.828125,
        "h": 32,
        "key": "series-3",
        "role": "chart-3"
      }
    ],
    "legendHeight": 32
  }
];

const OLD_KINDS = ['Area', 'Line', 'Bar', 'Donut', 'Radar', 'Radial'];
const ALL_KINDS = ['Area', 'Line', 'Bar', 'Donut', 'Radar', 'Radial',
  'HorizontalBar', 'StackedBar', 'StackedArea', 'DivergingBar', 'Gauge', 'Rings', 'Heatmap'];
const ROOT_IDS = PHASE === 'library' ? ['23:501'] : ['59:2901'];
const ctx = await nativeContext(ROOT_IDS, PHASE === 'library' ? '2:3' : '2:5',
  PHASE === 'library' ? ['Chart'] : [
    'Chart', 'DashboardShell', 'SidebarItem', 'Avatar', 'Button', 'ButtonAppearance',
    'BadgeAppearance', 'CardMaterial', 'Select',
  ], { rootType: PHASE === 'library' ? 'COMPONENT_SET' : 'FRAME', effects: false, requireShader: false });
if (!ctx.ready) return ctx;

const chartSet = ctx.assets.Chart;
const definitions = chartSet.componentPropertyDefinitions;
const prerequisiteFailures = [];
if (chartSet.name !== 'Chart' || definitions['Label#23:14']?.type !== 'TEXT'
  || definitions.Kind?.type !== 'VARIANT')
  prerequisiteFailures.push({ id: '23:501', reason: 'The existing Chart/Kind/Label#23:14 schema must match its ledger' });
if (chartSet.defaultVariant?.id !== '23:444')
  prerequisiteFailures.push({ id: '23:501', expectedDefaultId: '23:444', actualDefaultId: chartSet.defaultVariant?.id });
const initialVariants = chartSet.children.filter(node => node.type === 'COMPONENT');
const originalVariantIds = {};
for (const kind of OLD_KINDS) {
  const matches = initialVariants.filter(node => node.variantProperties?.Kind === kind);
  if (matches.length !== 1) prerequisiteFailures.push({ kind, reason: 'Expected exactly one original native variant',
    actualIds: matches.map(node => node.id) });
  else originalVariantIds[kind] = matches[0].id;
}
for (const kind of ALL_KINDS) {
  const matches = initialVariants.filter(node => node.variantProperties?.Kind === kind);
  if (matches.length > 1) prerequisiteFailures.push({ kind, reason: 'Duplicate native Chart variants',
    actualIds: matches.map(node => node.id) });
  if (PHASE === 'screen' && matches.length !== 1) prerequisiteFailures.push({ kind,
    reason: 'Execute the leased library phase successfully before the screen phase' });
}
const unexpectedVariants = initialVariants.filter(node => !ALL_KINDS.includes(node.variantProperties?.Kind));
if (unexpectedVariants.length) prerequisiteFailures.push({ reason: 'Unknown Chart variants must not be overwritten',
  ids: unexpectedVariants.map(node => node.id) });
for (const name of ['Show legend', 'Show data', 'Glow',
  ...[1, 2, 3].map(index => 'Series ' + index),
  ...[1, 2, 3, 4, 5, 6].map(index => 'Category ' + index)]) {
  const matches = Object.entries(definitions).filter(([key]) => key.split('#')[0] === name);
  if (matches.length > 1 || matches.some(([, definition]) => definition.type !== 'BOOLEAN'))
    prerequisiteFailures.push({ property: name, reason: 'Existing property must be one unambiguous Boolean',
      actualKeys: matches.map(([key]) => key) });
  if (PHASE === 'screen' && !matches.length)
    prerequisiteFailures.push({ property: name, reason: 'Execute the native library phase before screen mutation' });
}
if (prerequisiteFailures.length) return { status: 'chart-preflight-failed', phase: PHASE,
  fileKey: 'lHp5p10yGb7lqXJDnAox0N', pageId: ctx.page.id, rootIds: ROOT_IDS,
  prerequisiteFailures, createdNodeIds: [], mutatedNodeIds: [], removedNodeIds: [] };

function mark(node) { ctx.mutated.add(node.id); return node; }
function borderEdges(node, active, opacity = .65) {
  node.strokes = [ctx.solid('border', opacity)];
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
    const field = 'stroke' + side + 'Weight';
    if (node.boundVariables?.[field]) node.setBoundVariable(field, null);
    node[field] = active.includes(side) ? 1 : 0;
  }
  return mark(node);
}
function property(displayName, type, defaultValue, create) {
  const matches = Object.entries(chartSet.componentPropertyDefinitions)
    .filter(([key, value]) => key.split('#')[0] === displayName && value.type === type);
  if (matches.length > 1) throw new Error('Ambiguous native Chart property ' + displayName);
  if (matches[0]) return matches[0][0];
  if (!create) throw new Error('The native Chart library is missing ' + displayName);
  const key = chartSet.addComponentProperty(displayName, type, defaultValue);
  mark(chartSet);
  return key; // The exact returned property key, never a guessed suffix.
}
function showByProperty(node, key, visible = true) {
  node.visible = visible;
  node.componentPropertyReferences = { ...(node.componentPropertyReferences ?? {}), visible: key };
  return mark(node);
}
function resolveSvg(source) {
  return source.replace(/\{\{([a-z0-9-]+)\}\}/g, (_, role) => {
    const c = ctx.rgb(role);
    return 'rgb(' + [c.r, c.g, c.b].map(value => Math.round(value * 255)).join(',') + ')';
  });
}
function semanticRole(color) {
  return ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5', 'border',
    'surface-subtle', 'foreground', 'muted-foreground'].find(role => {
    const actual = ctx.rgb(role);
    return ['r', 'g', 'b'].every(channel => Math.abs(actual[channel] - color[channel]) <= 1.1 / 255);
  });
}
function normalizePaint(paint) {
  if (paint.type === 'SOLID') {
    const role = semanticRole(paint.color);
    return role ? ctx.solid(role, paint.opacity ?? 1) : paint;
  }
  if (!paint.type.startsWith('GRADIENT_')) return paint;
  const maximum = Math.max(0, ...paint.gradientStops.map(stop => stop.color.a ?? 1));
  return { ...paint, opacity: (paint.opacity ?? 1) * maximum,
    gradientStops: paint.gradientStops.map(stop => {
      const alpha = maximum ? (stop.color.a ?? 1) / maximum : 0;
      const role = semanticRole(stop.color);
      const { boundVariables: oldBindings, ...plain } = stop;
      return { ...plain, color: { ...stop.color, a: alpha },
        ...(alpha === 1 && role ? { boundVariables: { color: {
          type: 'VARIABLE_ALIAS', id: ctx.colorVariable(role).id,
        } } } : {}) };
    }) };
}
function importGeometry(parent, name, source, width, height) {
  if (!/<(?:path|rect|circle|ellipse|line|polyline|polygon)\b/.test(source)) return null;
  const frame = ctx.ensure(parent, name, 'FRAME', () => figma.createNodeFromSvg(resolveSvg(source)));
  frame.fills = []; frame.resize(width, height);
  frame.layoutSizingHorizontal = 'FIXED'; frame.layoutSizingVertical = 'FIXED';
  for (const node of ctx.tree(frame)) {
    if (node.type === 'TEXT') throw new Error('Chart SVG must contain geometry only; labels are native text');
    for (const field of ['fills', 'strokes']) if (field in node && Array.isArray(node[field])) {
      node[field] = node[field].map(normalizePaint); mark(node);
    }
  }
  return frame;
}
async function sourceText(parent, name, value, width, size, weight = 'regular',
  role = 'foreground', line = size * 1.5, tracking = 0, align = 'LEFT') {
  const text = await ctx.text(parent, name, value, Math.max(1, width), size, weight, role, line, 0, align);
  text.letterSpacing = { unit: 'PIXELS', value: tracking };
  return mark(text);
}
async function alignButton(wrapper, size = 13, iconSize = 16, role = 'foreground') {
  const linked = wrapper.children.find(node => node.type === 'INSTANCE');
  const leading = wrapper.children.find(node => node.name === 'Button / leading icon');
  if (!linked || !leading) return;
  const texts = ctx.tree(linked).filter(node => node.type === 'TEXT');
  for (const text of texts) {
    for (const field of ['fontFamily', 'fontStyle', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing'])
      if (text.boundVariables?.[field]) text.setBoundVariable(field, null);
    text.fontName = ctx.fonts.semibold; text.fontSize = size;
    text.lineHeight = { unit: 'PIXELS', value: 20 };
    text.letterSpacing = { unit: 'PIXELS', value: -.01 * size };
    text.textAutoResize = 'WIDTH_AND_HEIGHT'; text.fills = [ctx.solid(role)]; mark(text);
  }
  const labelWidth = Math.max(0, ...texts.map(text => text.width));
  const start = Math.max(13, (wrapper.width - iconSize - 8 - labelWidth) / 2);
  ctx.dimension(linked, 'paddingLeft', start + iconSize + 8);
  ctx.dimension(linked, 'paddingRight', Math.max(0, wrapper.width - start - iconSize - 8 - labelWidth));
  linked.primaryAxisAlignItems = 'MIN'; linked.counterAxisAlignItems = 'CENTER';
  ctx.absolute(leading, start, (wrapper.height - iconSize) / 2, iconSize, iconSize); mark(linked);
}

async function buildLibrary() {
  const keys = {
    legend: property('Show legend', 'BOOLEAN', false, true),
    data: property('Show data', 'BOOLEAN', false, true),
    glow: property('Glow', 'BOOLEAN', false, true),
  };
  for (let index = 1; index <= 3; index++)
    keys['series-' + index] = property('Series ' + index, 'BOOLEAN', true, true);
  for (let index = 1; index <= 6; index++)
    keys['category-' + index] = property('Category ' + index, 'BOOLEAN', true, true);
  const variants = {};
  const sourceGeometryCounts = {};
  for (const model of MODELS) {
    let master = chartSet.children.find(node => node.type === 'COMPONENT'
      && node.variantProperties?.Kind === model.nativeKind);
    if (!master) {
      master = figma.createComponent(); master.name = 'Kind=' + model.nativeKind;
      master.fills = []; chartSet.appendChild(master);
      ctx.created.add(master.id); mark(chartSet); mark(master);
    }
    master.name = 'Kind=' + model.nativeKind;
    master.description = 'Source Chart kind "' + model.kind + '". Real 6-month/goal data, editable vector paths and Manrope text. ' +
      'Use Show legend, Show data, Glow, series and category properties. Label#23:14 is preserved.';
    master.layoutMode = 'VERTICAL'; master.resize(model.width, model.height);
    master.layoutSizingHorizontal = 'FIXED'; master.layoutSizingVertical = 'HUG';
    master.paddingLeft = 0; master.paddingRight = 0; master.paddingTop = 0; master.paddingBottom = 0;
    master.itemSpacing = 0; master.fills = []; master.strokes = []; master.clipsContent = false;
    mark(master); variants[model.nativeKind] = master.id;
    const plot = ctx.frame(master, 'Chart / plot', 'VERTICAL', model.width, model.height,
      { fill: 'surface', radius: 16, clip: true });
    const base = importGeometry(plot, 'Chart / native grid and tracks', model.baseSvg, model.width, model.height);
    if (base) ctx.absolute(base, 0, 0, model.width, model.height);
    const glow = ctx.frame(plot, 'Chart / native glow', 'VERTICAL', model.width, model.height);
    ctx.absolute(glow, 0, 0, model.width, model.height);
    glow.effects = [{ type: 'LAYER_BLUR', blurType: 'NORMAL', radius: 2.5, visible: true }];
    showByProperty(glow, keys.glow, false);
    const plotted = ctx.frame(plot, 'Chart / data series', 'VERTICAL', model.width, model.height);
    ctx.absolute(plotted, 0, 0, model.width, model.height);
    for (const [index, layer] of model.layers.entries()) {
      const native = importGeometry(plotted, 'Chart / ' + layer.key + ' / ' + index,
        layer.svg, model.width, model.height);
      if (native) { ctx.absolute(native, 0, 0, model.width, model.height);
        showByProperty(native, keys[layer.key]); }
      const light = importGeometry(glow, 'Chart glow / ' + layer.key + ' / ' + index,
        layer.svg, model.width, model.height);
      if (light) { ctx.absolute(light, 0, 0, model.width, model.height);
        showByProperty(light, keys[layer.key]); }
    }
    for (const [index, label] of model.labels.entries()) {
      const width = Math.max(label.w + 4, label.align === 'middle' ? 28 : 26);
      const size = label.size;
      const line = label.lineHeight;
      const text = await sourceText(plot, 'Chart / native label / ' + index, label.text, width,
        size, label.weight >= 600 ? 'semibold' : 'regular', label.role, line, label.tracking,
        label.align === 'middle' ? 'CENTER' : label.align === 'end' ? 'RIGHT' : 'LEFT');
      const x = label.align === 'middle' ? label.x + label.w / 2 - width / 2
        : label.align === 'end' ? label.x + label.w - width : label.x;
      ctx.absolute(text, x, label.y + (label.h - line) / 2, width, line);
    }
    const legend = ctx.frame(master, 'Chart / legend', 'HORIZONTAL', model.width,
      model.legendHeight + 12, { paddingTop: 12, cross: 'CENTER' });
    showByProperty(legend, keys.legend, false);
    for (const [index, item] of model.legendItems.entries()) {
      const button = ctx.frame(legend, 'Chart legend / ' + item.text, 'HORIZONTAL', item.w, item.h,
        { paddingLeft: 9, paddingRight: 9, gap: 6, cross: 'CENTER', radius: 10.4 });
      const dot = ctx.ensure(button, 'Chart legend / native series dot', 'ELLIPSE', () => figma.createEllipse());
      dot.resize(8, 8); dot.fills = [ctx.solid(item.role)]; dot.strokes = []; mark(dot);
      await sourceText(button, 'Chart legend / label', item.text, Math.max(1, item.w - 32),
        10, 'regular', 'foreground', 15);
      ctx.absolute(button, item.x, 12 + item.y, item.w, item.h);
      showByProperty(button, keys[item.key]);
    }
    const accessible = await sourceText(master, 'Chart / accessible label',
      model.title + ' · Last 6 months', model.width, 11, 'regular', 'muted-foreground', 16);
    accessible.componentPropertyReferences = { characters: 'Label#23:14' };
    accessible.visible = false; mark(accessible);
    const data = ctx.frame(master, 'Chart / native data table', 'VERTICAL', model.width, null,
      { paddingTop: 12, gap: 0 });
    showByProperty(data, keys.data, false);
    const caption = await sourceText(data, 'Chart data / caption', model.title + ' · Last 6 months',
      model.width, 11, 'semibold', 'foreground', 20);
    caption.componentPropertyReferences = { characters: 'Label#23:14' }; mark(caption);
    const columns = model.table[0].length, columnWidth = model.width / columns;
    for (const [rowIndex, cells] of model.table.entries()) {
      const row = ctx.frame(data, 'Chart data / row / ' + rowIndex, 'HORIZONTAL', model.width, 28,
        { cross: 'CENTER' });
      if (rowIndex === 0) borderEdges(row, ['Bottom'], 1);
      else if (rowIndex < model.table.length - 1) borderEdges(row, ['Bottom'], .4);
      for (const [columnIndex, value] of cells.entries())
        await sourceText(row, 'Chart data / cell / ' + columnIndex, value, columnWidth,
          10, rowIndex === 0 || columnIndex === 0 ? 'semibold' : 'regular',
          rowIndex === 0 ? 'muted-foreground' : 'foreground', 15, 0,
          columnIndex ? 'RIGHT' : 'LEFT');
    }
    sourceGeometryCounts[model.nativeKind] = { layers: model.layers.length,
      nativeTextLabels: model.labels.length, dataRows: model.table.length - 1,
      period: model.kind === 'gauge' || ['radial', 'rings'].includes(model.kind) ? 'Goals' : 'Last 6 months' };
  }
  ctx.finalize();
  const arranged = chartSet.children.filter(node => node.type === 'COMPONENT');
  for (const [index, kind] of ALL_KINDS.entries()) {
    const master = arranged.find(node => node.variantProperties?.Kind === kind);
    if (!master) throw new Error('Actual native Kind=' + kind + ' was not created');
    if (chartSet.children[index]?.id !== master.id) { chartSet.insertChild(index, master); ctx.mark(master); mark(chartSet); }
  }
  const oldPosition = { x: chartSet.x, y: chartSet.y };
  chartSet.layoutMode = 'HORIZONTAL'; chartSet.layoutWrap = 'WRAP';
  chartSet.resize(1138, 1306); chartSet.layoutSizingHorizontal = 'FIXED'; chartSet.layoutSizingVertical = 'HUG';
  chartSet.primaryAxisAlignItems = 'MIN'; chartSet.counterAxisAlignItems = 'MIN';
  chartSet.counterAxisAlignContent = 'AUTO'; chartSet.itemSpacing = 48; chartSet.counterAxisSpacing = 48;
  chartSet.paddingLeft = 32; chartSet.paddingRight = 32; chartSet.paddingTop = 32; chartSet.paddingBottom = 32;
  chartSet.fills = []; chartSet.strokes = [];
  chartSet.x = oldPosition.x; chartSet.y = oldPosition.y;
  chartSet.setExplicitVariableModeForCollection(ctx.colorCollection, ctx.darkMode.modeId);
  chartSet.description = 'Aureform 1.1 Chart: 13 real source kinds. Original six component IDs, set 23:501, default 23:444 and Label#23:14 are preserved. ' +
    'Native vector geometry, styled Manrope axes/legends/data tables, palette variables, editable series/category visibility and optional native glow.';
  mark(chartSet);
  await ctx.modernize();
  const result = await ctx.finish();
  const actual = await figma.getNodeByIdAsync('23:501');
  const actualVariants = actual.children.filter(node => node.type === 'COMPONENT');
  const originalIdsPreserved = Object.entries(originalVariantIds).every(([kind, id]) =>
    actualVariants.find(node => node.variantProperties?.Kind === kind)?.id === id);
  const valid = actualVariants.length === 13 && ALL_KINDS.every(kind =>
    actualVariants.filter(node => node.variantProperties?.Kind === kind).length === 1) &&
    actual.defaultVariant.id === '23:444' && originalIdsPreserved &&
    actual.componentPropertyDefinitions['Label#23:14']?.type === 'TEXT';
  result.phase = 'library'; result.kindCount = actualVariants.length;
  result.kindComponentIds = Object.fromEntries(actualVariants.map(node => [node.variantProperties.Kind, node.id]));
  result.originalVariantIds = originalVariantIds; result.originalVariantIdsPreserved = originalIdsPreserved;
  result.componentPropertyKeys = keys; result.sourceGeometryCounts = sourceGeometryCounts;
  result.sourceSHA256 = SOURCE_SHA256;
  result.status = valid && result.status !== 'validation-failed'
    ? 'chart-library-13-kinds-awaiting-visual-review' : 'chart-library-validation-failed';
  return ctx.compactResult(result);
}

async function buildScreen() {
  const keys = {
    legend: property('Show legend', 'BOOLEAN', false, false),
    data: property('Show data', 'BOOLEAN', false, false),
    glow: property('Glow', 'BOOLEAN', false, false),
  };
  const shellVariant = ctx.variant(ctx.assets.DashboardShell, { Layout: 'Sidebar' });
  if (shellVariant.id !== '29:143') throw new Error('DashboardShell / Sidebar must retain 29:143');
  // BEGIN SOURCE CHROME
  async function sidebar(parent, active) {
    const node = ctx.frame(parent, 'Charts 1.1 / Sidebar', 'VERTICAL', 256, 1000, { fill: 'surface', border: 'border' });
    const identity = ctx.frame(node, 'Sidebar / brand', 'HORIZONTAL', 256, 76, { paddingLeft: 24, cross: 'CENTER' });
    await ctx.brand(identity);
    const workspaceRegion = ctx.frame(node, 'Sidebar / workspace region', 'HORIZONTAL', 256, 66, { paddingLeft: 16, paddingRight: 16 });
    const workspace = ctx.frame(workspaceRegion, 'Sidebar / workspace selector', 'HORIZONTAL', 223, 66, { padding: 12, gap: 12, cross: 'CENTER', fill: 'accent', opacity: .32, border: 'primary', borderOpacity: .25, radius: 16 });
    const workspaceIcon = ctx.frame(workspace, 'Workspace / icon well', 'HORIZONTAL', 36, 36, { fill: 'accent', border: 'primary', borderOpacity: .25, radius: 16, align: 'CENTER', cross: 'CENTER' });
    await ctx.icon(workspaceIcon, 'Workspace / building icon', 'Building', 18);
    const workspaceText = ctx.frame(workspace, 'Workspace / copy', 'VERTICAL', 125, 36, { gap: 4 });
    await ctx.text(workspaceText, 'Workspace / name', 'Studio workspace', 125, 13, 'semibold', 'foreground', 16);
    await ctx.text(workspaceText, 'Workspace / plan', 'Pro plan', 125, 11, 'regular', 'muted-foreground', 16);
    await ctx.icon(workspace, 'Workspace / chevron', 'ChevronDown', 14, 'muted-foreground');
    const navigation = ctx.frame(node, 'Sidebar / scrolling navigation', 'VERTICAL', 256, 596.5, { clip: true });
    navigation.overflowDirection = 'VERTICAL';
    borderEdges(node, ['Right'], 1);

    async function groupHeading(name, label, height, paddingTop = 20) {
      const heading = ctx.frame(navigation, name, 'VERTICAL', 256, height, { paddingLeft: 24, paddingRight: 24, paddingTop });
      await ctx.text(heading, 'Group / label', label, 208, 11, 'semibold', 'muted-foreground', 16, 10);
      return heading;
    }
    async function linkGroup(name, links, height) {
      const group = ctx.frame(navigation, name, 'VERTICAL', 256, height, { paddingLeft: 12, paddingRight: 12, gap: 2 });
      for (const [label, kind] of links) {
        const wrapper = ctx.frame(group, 'Navigation / ' + label, 'HORIZONTAL', 231, 40);
        const item = await ctx.component(wrapper, 'SidebarItem / linked instance', 'SidebarItem', { State: label === active ? 'Active' : 'Default' }, 231, 40,
          { 'Label#3:95': label, 'Icon#3:98': ctx.icons[kind].id });
        for (const text of item.findAllWithCriteria({ types: ['TEXT'] })) {
          text.fontName = label === active ? ctx.fonts.semibold : ctx.fonts.regular;
          text.fontSize = 13; text.lineHeight = { unit: 'PIXELS', value: 20 }; ctx.mutated.add(text.id);
        }
        if (label === 'AI workspace') {
          const badge = await ctx.badge(wrapper, 'Navigation / AI badge', 'AI', 24, 'Soft', 22);
          ctx.absolute(badge, 195, 9, 24, 22);
        }
      }
      return group;
    }
    await groupHeading('Sidebar / workspace heading', 'WORKSPACE', 44.5);
    await linkGroup('Sidebar / workspace links', [
      ['Overview', 'LayoutDashboard'], ['Analytics', 'ChartNoAxesCombined'], ['AI workspace', 'Sparkles'], ['Customers', 'Users'],
    ], 166);
    await groupHeading('Sidebar / system heading', 'DESIGN SYSTEM', 44.5);
    await linkGroup('Sidebar / system links', [
      ['Components', 'Layers'], ['Blocks', 'Layers'], ['Templates', 'LayoutDashboard'],
      ['Appearance Studio', 'Settings'], ['Effects', 'Sparkles'], ['Documentation', 'BookOpen'],
      ['Chart gallery', 'Layers'],
    ], 292);
    const applications = await groupHeading('Sidebar / applications heading', 'APPLICATIONS', 50, 26);
    const disclosure = await ctx.icon(applications, 'Applications / disclosure', 'ChevronDown', 12, 'muted-foreground');
    ctx.absolute(disclosure, 222, 28, 12, 12);
    await groupHeading('Sidebar / management heading', 'MANAGE', 41.5, 26);
    const footer = ctx.frame(node, 'Sidebar / footer', 'VERTICAL', 256, 261.5, { padding: 16, border: 'border' });
    borderEdges(footer, ['Top'], 1);
    const promo = ctx.frame(footer, 'Sidebar / next idea', 'VERTICAL', 223, 119.5, { padding: 16, gap: 12, fill: 'surface', border: 'primary', borderOpacity: .25, radius: 16 });
    const promoTop = ctx.frame(promo, 'Sidebar promo / icon row', 'HORIZONTAL', 191, 28, { align: 'SPACE_BETWEEN', cross: 'CENTER' });
    await ctx.icon(promoTop, 'Sidebar promo / sparkle', 'Sparkles', 24);
    await ctx.icon(promoTop, 'Sidebar promo / arrow', 'ArrowUpRight', 14);
    await ctx.text(promo, 'Sidebar promo / title', 'Built for your next idea.', 191, 13, 'semibold', 'foreground', 20);
    await ctx.text(promo, 'Sidebar promo / body', 'Your product. Your visual signature.', 191, 11, 'regular', 'muted-foreground', 16);
    const searchSpacing = ctx.frame(footer, 'Sidebar / search spacing', 'VERTICAL', 223, 48, { paddingTop: 16 });
    await ctx.functionalButton(searchSpacing, 'Sidebar / search', 'Search anything…   ⌘ K', 223, 32, 'Outline', 'Search');
    const accountSpacing = ctx.frame(footer, 'Sidebar / account spacing', 'VERTICAL', 223, 62, { paddingTop: 12 });
    const account = ctx.frame(accountSpacing, 'Sidebar / account', 'HORIZONTAL', 223, 50, { gap: 10, cross: 'CENTER' });
    await ctx.component(account, 'Account / avatar', 'Avatar', { Size: 'Medium' }, 40, 40, { 'Initials#3:101': 'AM' });
    const accountCopy = ctx.frame(account, 'Account / copy', 'VERTICAL', 148, 36, { gap: 4 });
    await ctx.text(accountCopy, 'Account / name', 'Alex Morgan', 148, 13, 'semibold', 'foreground', 16);
    await ctx.text(accountCopy, 'Account / email', 'alex@studio.demo', 148, 11, 'regular', 'muted-foreground', 16);
    await ctx.icon(account, 'Account / disclosure', 'ChevronDown', 12, 'muted-foreground');
    return node;
  }

  async function chrome(parent, title) {
    const header = ctx.frame(parent, 'Charts 1.1 / Header', 'HORIZONTAL', 1184, 73, { paddingLeft: 24, paddingRight: 24, fill: 'surface', opacity: .85, border: 'border', borderOpacity: .8, align: 'SPACE_BETWEEN', cross: 'CENTER' });
    const breadcrumbs = ctx.frame(header, 'Header / breadcrumbs', 'HORIZONTAL', 270, 16, { gap: 12, cross: 'CENTER' });
    const workspaceLabel = await ctx.text(breadcrumbs, 'Breadcrumb / workspace', 'Workspace', 75, 12, 'regular', 'muted-foreground', 16);
    await ctx.text(breadcrumbs, 'Breadcrumb / separator', '›', 8, 12, 'regular', 'muted-foreground', 16);
    await ctx.text(breadcrumbs, 'Breadcrumb / page', title, 165, 12, 'regular', 'foreground', 16);
    const controls = ctx.frame(header, 'Header / controls', 'HORIZONTAL', 458.8, 32, { gap: 8, cross: 'CENTER' });
    await ctx.functionalButton(controls, 'Header / search', 'Search       ⌘ K', 145.4, 32, 'Ghost', 'Search');
    await alignButton(await ctx.button(controls, 'Header / appearance', 'Appearance', 123.2, 32, 'Soft', 'Sliders'), 13, 16, 'accent-foreground');
    await ctx.functionalButton(controls, 'Header / language', 'EN', 50.2, 32, 'Ghost');
    const theme = ctx.frame(controls, 'Header / theme', 'HORIZONTAL', 32, 32, { align: 'CENTER', cross: 'CENTER' });
    await ctx.icon(theme, 'Header / sun', 'Sun', 16, 'muted-foreground');
    const notifications = ctx.frame(controls, 'Header / notifications', 'HORIZONTAL', 32, 32, { align: 'CENTER', cross: 'CENTER' });
    await ctx.icon(notifications, 'Header / bell', 'Bell', 16, 'muted-foreground');
    const account = ctx.frame(controls, 'Header / avatar spacing', 'HORIZONTAL', 36, 32, { paddingLeft: 4 });
    await ctx.component(account, 'Header / avatar', 'Avatar', { Size: 'Small' }, 32, 32, { 'Initials#3:101': 'AM' });
    borderEdges(header, ['Bottom'], .8);
    return header;
  }

  async function workspace(root, title, active, fullHeight, mainHeight) {
    ctx.begin(root, 'HORIZONTAL', 1440, fullHeight);
    await sidebar(root, active);
    const shell = await ctx.instance(root, 'Charts 1.1 / DashboardShell', shellVariant, 1184, fullHeight);
    const slots = shell.findAllWithCriteria({ types: ['SLOT'] });
    const contentSlots = slots.filter(n => n.name === 'Content' || Object.values(n.componentPropertyReferences ?? {}).includes('Content#30:0'));
    const content = contentSlots.length === 1 ? contentSlots[0] : slots.length === 1 ? slots[0] : null;
    if (!content) throw new Error('DashboardShell 29:143 needs one verified Content#30:0 slot; return structure to owner');
    // The original shared shell's chrome is 1.0. This instance keeps its real
    // Content slot; source-specific 1.1 chrome is reconciled inside that slot
    // and beside it, without detaching or changing the shared master.
    // The live read confirms a direct Content slot with VERTICAL / FILL,
    // zero padding and the shell's full size. Its stack properties are inherited.
    if (content.parent.id !== shell.id || content.layoutMode !== 'VERTICAL') throw new Error('DashboardShell Content slot structure changed');
    for (const child of shell.children) if (child.id !== content.id) { ctx.mark(child); child.visible = false; }
    for (const child of content.children) if (!child.name.startsWith('Charts 1.1 /')) {
      ctx.mark(child); child.visible = false; ctx.adopt(content, child);
    }
    shell.fills = []; shell.paddingLeft = 0; shell.paddingRight = 0; shell.paddingTop = 0; shell.paddingBottom = 0; shell.itemSpacing = 0;
    ctx.mark(shell);
    await chrome(content, title);
    const main = ctx.frame(content, 'Charts 1.1 / Main', 'VERTICAL', 1184, mainHeight, { paddingLeft: 32, paddingRight: 32, paddingTop: 36, paddingBottom: 40, gap: 24 });
    await ctx.paintStyle(main, 'hero');
    const footer = ctx.frame(content, 'Charts 1.1 / Footer', 'HORIZONTAL', 1184, 63, { paddingLeft: 32, paddingRight: 32, cross: 'CENTER', align: 'SPACE_BETWEEN' });
    const footerContent = ctx.frame(footer, 'Charts footer / source row', 'HORIZONTAL', 1120, 63, { cross: 'CENTER', align: 'SPACE_BETWEEN' });
    borderEdges(footerContent, ['Top'], .65);
    await sourceText(footerContent, 'Charts footer / local demo', 'Interactive demo · Changes stay in this browser.', 800, 11, 'regular', 'muted-foreground', 16.5);
    await sourceText(footerContent, 'Charts footer / identity', 'Aureform UI  1.1', 180, 11, 'regular', 'muted-foreground', 16.5, 0, 'RIGHT');
    return main;
  }
  // END SOURCE CHROME
  const root = ctx.roots[0];
  const main = await workspace(root, 'Chart gallery', 'Chart gallery', 3023.890625, 2887.890625);
  main.itemSpacing = 28;
  const heading = ctx.frame(main, 'Charts / source heading', 'HORIZONTAL', 1120, 113.390625,
    { cross: 'MAX', align: 'SPACE_BETWEEN' });
  const copy = ctx.frame(heading, 'Charts heading / copy', 'VERTICAL', 800, 113.390625);
  const eyebrow = ctx.frame(copy, 'Charts heading / eyebrow', 'HORIZONTAL', 800, 20,
    { gap: 8, cross: 'CENTER' });
  const rule = ctx.ensure(eyebrow, 'Charts heading / native signature rule', 'RECTANGLE', () => figma.createRectangle());
  rule.resize(20, 1); rule.fills = [ctx.solid('primary', .65)]; mark(rule);
  await sourceText(eyebrow, 'Charts heading / eyebrow label', 'THE DATA COLLECTION', 760,
    11, 'semibold', 'primary', 20, 1.1);
  const title = ctx.frame(copy, 'Charts heading / title spacing', 'VERTICAL', 800, 53.390625,
    { paddingTop: 12 });
  await sourceText(title, 'Charts heading / title', 'Data with a little electricity.', 800,
    36, 'semibold', 'foreground', 41.390625, -1.26);
  const description = ctx.frame(copy, 'Charts heading / description spacing', 'VERTICAL', 800, 40,
    { paddingTop: 12 });
  await sourceText(description, 'Charts heading / description',
    'Thirteen expressive views. Explore real values, switch periods and make every series your own.',
    800, 14, 'regular', 'muted-foreground', 28);
  const exportSpacing = ctx.frame(heading, 'Charts / export spacing', 'VERTICAL', 126.7, 36,
    { paddingBottom: 4 });
  const exportButton = await ctx.button(exportSpacing, 'Charts / export data', 'Export data', 126.7, 32, 'Outline', 'Download');
  await alignButton(exportButton);
  const controls = ctx.frame(main, 'Charts / source controls', 'HORIZONTAL', 1120, 272,
    { padding: 25, gap: 24, radius: 16, clip: true });
  await ctx.skin(controls, 'Chart controls', 1120, 272, 'CardMaterial', 'Glass');
  const controlLeft = ctx.frame(controls, 'Charts controls / period finish and series', 'VERTICAL',
    510.243902, 222, { gap: 20 });
  const contextRow = ctx.frame(controlLeft, 'Charts controls / context', 'HORIZONTAL', 510.243902, 26,
    { gap: 12, cross: 'CENTER' });
  await ctx.badge(contextRow, 'Charts controls / thirteen kinds', '13 chart types', 107.3, 'Soft', 26);
  await sourceText(contextRow, 'Charts controls / illustrative USD', 'Illustrative data · USD',
    260, 11, 'regular', 'muted-foreground', 16);
  const selects = ctx.frame(controlLeft, 'Charts controls / native select fields', 'VERTICAL',
    510.243902, 96, { gap: 16 });
  for (const [fieldName, value] of [['Chart period', 'Last 6 months'], ['Chart finish', 'Glow']]) {
    const row = ctx.frame(selects, 'Charts controls / ' + fieldName, 'HORIZONTAL', 510.243902, 40,
      { gap: 16, cross: 'CENTER' });
    await sourceText(row, 'Select field / label', fieldName, 247.121951, 12, 'semibold', 'foreground', 16);
    await ctx.component(row, 'Select field / linked instance', 'Select', { State: 'Closed' },
      247.121951, 40, { 'Label#15:11': value });
  }
  const series = ctx.frame(controlLeft, 'Charts controls / revenue series', 'VERTICAL', 510.243902, 60,
    { gap: 8 });
  await sourceText(series, 'Charts controls / series label', 'Revenue series', 510.243902, 12, 'semibold', 'foreground', 16);
  const toggles = ctx.frame(series, 'Charts controls / selected series', 'HORIZONTAL', 510.243902, 32,
    { gap: 8, cross: 'CENTER' });
  for (const [index, label] of ['Product', 'Services', 'Expansion'].entries()) {
    const width = [103.4, 106.8, 117.8][index];
    const button = await ctx.button(toggles, 'Charts series / ' + label, label, width, 32, 'Soft');
    const linked = button.children.find(node => node.type === 'INSTANCE');
    linked.fills = [ctx.solid('accent')]; linked.strokes = [ctx.solid('primary', .4)]; mark(linked);
    ctx.dimension(linked, 'paddingLeft', 28); ctx.dimension(linked, 'paddingRight', 12);
    const dot = ctx.ensure(button, 'Charts series / native color dot', 'ELLIPSE', () => figma.createEllipse());
    dot.resize(8, 8); dot.fills = [ctx.solid('chart-' + (index + 1))]; dot.strokes = []; mark(dot);
    ctx.absolute(dot, 13, 12, 8, 8);
  }
  const palettes = ctx.frame(controls, 'Charts controls / source palette picker', 'VERTICAL',
    535.756098, 164, { gap: 12 });
  await sourceText(palettes, 'Palette picker / label', 'Color palette', 535.756098,
    12, 'semibold', 'foreground', 16);
  const paletteRows = ctx.frame(palettes, 'Palette picker / native options', 'VERTICAL', 535.756098, 136, { gap: 8 });
  const paletteDefinitions = [
    ['Aurora', 'VariableCollectionId:2:36'], ['Violet', 'VariableCollectionId:95:317'],
    ['Ocean', 'VariableCollectionId:95:381'], ['Mint', 'VariableCollectionId:95:445'],
    ['Ember', 'VariableCollectionId:95:509'], ['Rose', 'VariableCollectionId:95:573'],
  ];
  for (let rowIndex = 0; rowIndex < 2; rowIndex++) {
    const row = ctx.frame(paletteRows, 'Palette options / row / ' + rowIndex, 'HORIZONTAL',
      535.756098, 64, { gap: 8 });
    for (const [index, [label, collectionId]] of paletteDefinitions.slice(rowIndex * 3, rowIndex * 3 + 3).entries()) {
      const width = (535.756098 - 16) / 3, selected = label === 'Aurora';
      const option = ctx.frame(row, 'Palette option / ' + label, 'VERTICAL', width, 64,
        { padding: 11, gap: 8, fill: selected ? 'accent' : 'surface',
          border: selected ? 'primary' : 'border', radius: 16, clip: true });
      const swatches = ctx.frame(option, 'Palette option / raw color swatches', 'HORIZONTAL', width - 22, 16,
        { radius: 10.4, clip: true });
      for (const role of ['brand/primary', 'brand/secondary', 'brand/tertiary']) {
        const shape = ctx.ensure(swatches, 'Palette swatch / ' + role, 'RECTANGLE', () => figma.createRectangle());
        shape.resize((width - 22) / 3, 16); shape.fills = [ctx.solid(role, 1, collectionId)]; shape.strokes = []; mark(shape);
      }
      await sourceText(option, 'Palette option / name', label, width - 22, 11, 'regular',
        selected ? 'accent-foreground' : 'foreground', 16);
      if (selected) ctx.absolute(await ctx.icon(option, 'Palette option / selected check', 'Check', 12),
        width - 23, 40, 12, 12);
    }
  }
  const summary = ctx.frame(main, 'Charts / source summary', 'HORIZONTAL', 1120, 52.5,
    { paddingLeft: 4, paddingRight: 4, align: 'SPACE_BETWEEN', cross: 'MAX' });
  const money = ctx.frame(summary, 'Charts summary / selected revenue', 'VERTICAL', 620, 52.5, { gap: 4 });
  await sourceText(money, 'Charts summary / period', 'Last 6 months', 620, 11, 'regular', 'muted-foreground', 16.5);
  const total = ctx.frame(money, 'Charts summary / total row', 'HORIZONTAL', 620, 32, { gap: 8, cross: 'CENTER' });
  await sourceText(total, 'Charts summary / actual selected total', '$347,660', 139,
    24, 'semibold', 'foreground', 32, -.6);
  await sourceText(total, 'Charts summary / selected revenue label', 'selected revenue', 180,
    11, 'regular', 'muted-foreground', 16.5);
  await sourceText(summary, 'Charts summary / interaction guidance',
    'Select a legend to hide a series. Focus or hover a value to inspect it. Every view includes its data.',
    384, 11, 'regular', 'muted-foreground', 20);
  const grid = ctx.frame(main, 'Charts / thirteen source cards', 'VERTICAL', 1120, 2290, { gap: 20 });
  const linkedCharts = [];
  for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
    const row = ctx.frame(grid, 'Charts grid / row / ' + rowIndex, 'HORIZONTAL', 1120, 442, { gap: 20 });
    for (const [columnIndex, model] of MODELS.slice(rowIndex * 3, rowIndex * 3 + 3).entries()) {
      const ordinal = rowIndex * 3 + columnIndex + 1;
      const card = ctx.frame(row, 'Chart card / ' + model.nativeKind, 'VERTICAL', 360, model.cardHeight,
        { radius: 16, clip: true });
      await ctx.skin(card, model.title, 360, model.cardHeight, 'CardMaterial', 'Glass');
      const cardHeader = ctx.frame(card, 'Chart card / source header', 'VERTICAL', 360, 112.5,
        { paddingLeft: 21, paddingRight: 21, paddingTop: 21, gap: 8 });
      const titleRow = ctx.frame(cardHeader, 'Chart card / title row', 'HORIZONTAL', 318, 19.5,
        { align: 'SPACE_BETWEEN', cross: 'CENTER' });
      await sourceText(titleRow, 'Chart card / title', model.title, 282, 13, 'semibold', 'foreground', 19.5, -.13);
      await sourceText(titleRow, 'Chart card / ordinal', String(ordinal).padStart(2, '0'),
        20, 10, 'regular', 'muted-foreground', 15, 0, 'RIGHT');
      await sourceText(cardHeader, 'Chart card / description', model.description, 318, 11, 'regular', 'muted-foreground', 20);
      const metricSpacing = ctx.frame(cardHeader, 'Chart card / metric spacing', 'HORIZONTAL', 318, 36,
        { paddingTop: 8, align: 'SPACE_BETWEEN', cross: 'CENTER' });
      await sourceText(metricSpacing, 'Chart card / real metric', model.metric, 146, 20, 'semibold', 'foreground', 28, -.5);
      const context = ['radial', 'gauge', 'rings'].includes(model.kind) ? 'of goal'
        : model.kind === 'heatmap' ? 'product events' : model.kind === 'pie' ? 'period total' : 'product revenue';
      await sourceText(metricSpacing, 'Chart card / metric context', context, 160, 10,
        'regular', 'muted-foreground', 15, 0, 'RIGHT');
      const content = ctx.frame(card, 'Chart card / source plot content', 'VERTICAL', 360,
        model.kind === 'gauge' ? 226 : 270, { paddingLeft: 17, paddingRight: 17, paddingTop: 16 });
      const master = ctx.variant(chartSet, { Kind: model.nativeKind });
      const chart = await ctx.instance(content, 'Chart / linked ' + model.nativeKind, master, 326,
        model.kind === 'gauge' ? 210 : 254, {
          'Label#23:14': model.title + ' · Last 6 months',
          [keys.legend]: model.kind !== 'gauge', [keys.data]: false, [keys.glow]: true,
        });
      linkedCharts.push({ id: chart.id, kind: model.nativeKind, mainComponentId: master.id });
      const detailSpacing = ctx.frame(card, 'Chart card / data disclosure spacing', 'VERTICAL', 360, 59.5,
        { paddingTop: 16, paddingLeft: 1, paddingRight: 1, paddingBottom: 1 });
      const disclosure = ctx.frame(detailSpacing, 'Chart card / native data disclosure', 'HORIZONTAL', 358, 42.5,
        { paddingLeft: 20, paddingRight: 20, gap: 4, cross: 'CENTER' });
      borderEdges(disclosure, ['Top']);
      const triangle = ctx.ensure(disclosure, 'Chart data / native disclosure indicator', 'VECTOR', () => figma.createVector());
      triangle.vectorPaths = [{ windingRule: 'NONZERO', data: 'M0 0L0 6L5 3Z' }];
      triangle.fills = [ctx.solid('muted-foreground')]; triangle.strokes = []; triangle.resize(5, 6); mark(triangle);
      await sourceText(disclosure, 'Chart data / disclosure label', 'View data · ' + model.kind,
        298, 11, 'regular', 'muted-foreground', 16.5);
    }
  }
  ctx.finalize();
  await ctx.modernize();
  const result = await ctx.finish();
  const live = await figma.getNodeByIdAsync('59:2901');
  const instances = ctx.tree(live).filter(node => node.type === 'INSTANCE' && node.name.startsWith('Chart / linked '));
  const actualInstances = [];
  for (const instance of instances) {
    const master = await instance.getMainComponentAsync();
    actualInstances.push({ id: instance.id, kind: master?.variantProperties?.Kind, mainComponentId: master?.id });
  }
  const valid = actualInstances.length === 13 && ALL_KINDS.every(kind =>
    actualInstances.filter(instance => instance.kind === kind).length === 1);
  result.phase = 'screen'; result.kindCount = actualInstances.length;
  result.kindInstances = actualInstances; result.chartSetId = '23:501'; result.defaultChartId = '23:444';
  result.source = { route: '/en/charts/', selectedPeriod: 'Last 6 months', selectedFinish: 'Glow',
    selectedSeries: ['Product', 'Services', 'Expansion'], selectedRevenue: 347660,
    sourceSHA256: SOURCE_SHA256,
    sourceScreenshot: '/tmp/aureform-native-source-1.1/charts-dark-1440.png' };
  result.status = valid && result.status !== 'validation-failed'
    ? 'chart-screen-13-kinds-awaiting-composition-screenshot' : 'chart-screen-validation-failed';
  return ctx.compactResult(result);
}

try {
  return PHASE === 'library' ? await buildLibrary() : await buildScreen();
} catch (error) {
  const result = await ctx.finish(error);
  result.phase = PHASE; result.status = 'partial-chart-reconciliation';
  return ctx.compactResult(result);
}
// END CHART OPERATIONS
