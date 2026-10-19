/**
 * Requires the owner-issued Figma lease: one sequential use_figma invocation per file.
 * fileKey: lHp5p10yGb7lqXJDnAox0N
 * skillNames: figma-use,figma-generate-library,figma-generate-design
 * SaaS 5:2 and AI 5:4 on page 2:5.
 * Read-only source measurements: /tmp/aureform-ui-build, /en/, 1440px, Aurora/Dark.
 * Preserves root IDs and positions. No page/root creation, state writes, or master edits.
 */

// BEGIN SHARED NATIVE RECONCILER — embedded because each owner invocation is isolated.
async function nativeContext(rootIds, expectedPageId, requiredAssets) {
  // Hidden instance descendants must remain accessible for font loading and exact ID audits.
  figma.skipInvisibleInstanceChildren = false;
  const fileKey = 'lHp5p10yGb7lqXJDnAox0N';
  const created = new Set(), mutated = new Set(), removed = new Set();
  const plans = new Map(), warnings = [], preserved = [];
  const ledger = {
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
    if (!root || root.type !== 'FRAME') return [{ id: rootIds[index], expected: 'FRAME', actual: root?.type ?? null }];
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
  const effectNames = Object.keys(effectLedger);
  const effectNodes = await Promise.all(effectNames.map(name => figma.getNodeByIdAsync(effectLedger[name].id)));
  const effects = {};
  for (const [index, name] of effectNames.entries()) {
    const node = effectNodes[index], spec = effectLedger[name];
    if (!node || node.type !== 'COMPONENT_SET' || node.name !== name || node.componentPropertyDefinitions[spec.label]?.type !== 'TEXT') {
      prerequisites.push({ asset: name, id: spec.id, requiredProperty: spec.label, reason: 'Exact owner-confirmed effect schema did not match' });
    } else effects[name] = node;
  }
  if (!effects.ShaderBackground) prerequisites.push({ asset: 'ShaderBackground', requiredVariant: 'Kind=Aurora', owner: 'effect-master builder' });
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
    if (!['FRAME', 'SLOT'].includes(parent.type)) throw new Error('Editable source containers must be FRAME or SLOT: ' + parent.id);
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
    const structuralFailures = await validateCreation(roots.map(root => ({ nodeId: root.id, expectedType: 'FRAME' })));
    const liveRoots = await Promise.all(rootIds.map(id => figma.getNodeByIdAsync(id)));
    const audits = liveRoots.map(audit);
    const valid = !error && !structuralFailures.length && audits.every(a => a.imageFillNodeCount === 0 && a.nonManropeTextSegmentCount === 0 && a.shaderFillNodeCount > 0 && a.unboundWhiteLayoutCount === 0);
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

// BEGIN TARGETED CORRECTIONS
// This path never calls begin() or finalize(): existing screen content is not
// reconciled or deleted. New native icon wrappers preserve each linked instance.
async function correctExistingComposition(ctx, scope) {
  const failures = [], checks = [], targets = [];
  const before = ctx.roots.map(root => ({
    id: root.id, parentId: root.parent.id, pageId: ctx.pageOf(root).id,
    name: root.name, x: root.x, y: root.y, width: root.width, height: root.height,
  }));
  const shaderBefore = ctx.roots.map(root => ctx.tree(root).flatMap(node =>
    ['fills', 'strokes'].flatMap(field => field in node && Array.isArray(node[field])
      ? node[field].filter(p => p.type === 'SHADER').map(p => JSON.stringify({
        nodeId: node.id, field, paint: p,
      })) : [])));
  function find(parent, name, types = ['FRAME'], required = true) {
    const matches = ctx.tree(parent).filter(node => node.name === name && types.includes(node.type));
    if (matches.length === 1) return matches[0];
    if (required) failures.push({ parentId: parent.id, name, expectedTypes: types,
      actualMatches: matches.map(node => ({ id: node.id, type: node.type })) });
    return null;
  }
  function target(root, name, types = ['FRAME']) {
    const node = find(root, name, types);
    if (node) targets.push({ rootId: root.id, id: node.id, name, type: node.type });
    return node;
  }
  const prepared = [];
  for (const root of ctx.roots) {
    const row = { root };
    if (scope === 'landing') {
      row.control = target(root, 'Header / customize');
      row.metrics = target(root, 'Preview / key metrics');
      row.monthly = target(root, 'Preview / monthly revenue', ['FRAME', 'INSTANCE']);
      row.subscribers = target(root, 'Preview / subscribers', ['FRAME', 'INSTANCE']);
      row.report = target(root, 'Preview / revenue report');
      row.footer = target(root, 'Landing 1.1 / Footer');
    } else if (scope === 'flagships') {
      row.sidebar = target(root, 'Flagship 1.1 / Sidebar');
      row.sidebarFooter = target(row.sidebar ?? root, 'Sidebar / footer');
      row.header = target(root, 'Flagship 1.1 / Header');
      row.footer = target(root, 'Flagship 1.1 / Footer');
      row.breadcrumbs = target(root, 'Header / breadcrumbs');
      row.workspace = target(row.breadcrumbs ?? root, 'Breadcrumb / workspace', ['TEXT']);
      row.pageLabel = target(row.breadcrumbs ?? root, 'Breadcrumb / page', ['TEXT']);
      row.control = target(root, 'Header / appearance');
      if (root.id === '5:2') {
        row.export = target(root, 'Revenue hero / export');
        row.customize = target(root, 'Revenue hero / customize');
        row.report = target(root, 'SaaS / revenue overview');
        row.planHeading = target(root, 'Plan breakdown / heading');
        row.planRows = ['Enterprise', 'Pro', 'Starter'].map(name => target(root, 'Plan / ' + name));
        row.metricCards = ['SaaS / active subscribers', 'SaaS / conversion rate',
          'SaaS / churn rate'].map(name => target(root, name));
        row.table = target(root, 'SaaS 1.1 / Recent customers', ['INSTANCE']);
      } else {
        row.toolbar = target(root, 'AI 1.1 / Toolbar');
        row.customize = target(root, 'AI toolbar / customize');
        row.composerFooter = target(root, 'Composer / footer');
        row.send = target(root, 'Composer / disabled send', ['INSTANCE']);
        row.sendArrow = target(root, 'Composer / send arrow', ['FRAME', 'INSTANCE']);
      }
    } else if (scope === 'auth') {
      row.control = target(root, 'Auth form / Customize');
      row.identity = target(root, 'Auth form / Identity badge', ['INSTANCE']);
      row.scene = target(root, 'Auth 1.1 / Shader scene');
      row.sheet = target(root, 'Auth scene / Depth sheet', ['RECTANGLE']);
      row.signature = target(root, 'Scene card / Visual signature');
      row.footer = target(root, 'Auth scene / Footer');
      row.effects = target(root, 'Auth scene / Effects link');
      row.effectsLabel = target(root, 'Auth scene / Effects label', ['TEXT']);
      row.studio = target(root, 'Auth scene / Studio link');
      row.growth = target(root, 'Scene card / Growth', ['INSTANCE']);
      row.polyline = target(root, 'Scene card / Native revenue polyline');
      if (root.id === '52:7581') row.otp = target(root, 'Auth form / Verification code', ['INSTANCE']);
    } else failures.push({ scope, reason: 'Unknown corrective scope' });
    prepared.push(row);
  }
  for (const row of prepared) {
    for (const wrapper of [row.control, row.export, row.customize, row.studio].filter(Boolean)) {
      const linked = find(wrapper, 'Button / linked instance', ['INSTANCE']);
      if (linked?.componentProperties['Label#97:0']?.type !== 'TEXT')
        failures.push({ id: wrapper.id, requiredProperty: 'Label#97:0' });
      if (!find(wrapper, 'Button / leading icon', ['FRAME', 'INSTANCE']))
        failures.push({ id: wrapper.id, reason: 'Expected the existing leading icon' });
    }
    for (const badge of [row.identity, row.growth].filter(Boolean))
      if (badge.componentProperties['Label#97:16']?.type !== 'TEXT')
        failures.push({ id: badge.id, requiredProperty: 'Label#97:16' });
    if (row.report) {
      row.reportHeading = target(row.report, 'Report / header');
      row.revenueGraphic = target(row.report, 'Chart / native revenue paths');
      row.legend = target(row.report, 'Report / legend');
      row.legendCurrent = target(row.legend ?? row.report, 'Legend / current', ['TEXT']);
      row.legendPrevious = target(row.legend ?? row.report, 'Legend / previous', ['TEXT']);
    }
    if (row.planRows) for (const plan of row.planRows) {
      if (!plan) continue;
      const labelRow = target(plan, 'Plan / label and amount');
      if (labelRow) target(labelRow, 'Plan / label', ['TEXT']);
    }
    if (row.metricCards) for (const card of row.metricCards) {
      if (!card) continue;
      const badges = ctx.tree(card).filter(node => node.type === 'INSTANCE' &&
        ['Metric / source change', 'Metric / linked change badge'].includes(node.name));
      if (badges.length !== 1 || badges[0].componentProperties['Label#97:16']?.type !== 'TEXT')
        failures.push({ id: card.id, reason: 'Expected one existing metric change badge with Label#97:16',
          actualIds: badges.map(badge => badge.id) });
    }
    if (row.otp) {
      if (row.otp.componentProperties['Label#15:31']?.type !== 'TEXT')
        failures.push({ id: row.otp.id, requiredProperty: 'Label#15:31' });
      row.otpCells = row.otp.children.filter(node => 'width' in node &&
        Math.abs(node.width - 40) < .6 && Math.abs(node.height - 48) < .6);
      if (row.otpCells.length !== 6) failures.push({ id: row.otp.id,
        reason: 'Expected six existing 40×48 source cells',
        actualChildren: row.otp.children.map(n => ({ id: n.id, type: n.type,
          width: n.width, height: n.height })) });
    }
  }
  if (failures.length) return { status: 'targeted-correction-preflight-failed',
    fileKey: 'lHp5p10yGb7lqXJDnAox0N', pageId: ctx.page.id,
    rootIds: ctx.roots.map(root => root.id), failures, createdNodeIds: [],
    mutatedNodeIds: [], removedNodeIds: [], retry: 'Read the named target only; do not rerun the full composition.' };

  function change(node) { ctx.mutated.add(node.id); return node; }
  function edges(node, active, role = 'border', opacity = 1) {
    node.strokes = [ctx.solid(role, opacity)];
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      const field = 'stroke' + side + 'Weight';
      if (node.boundVariables?.[field]) node.setBoundVariable(field, null);
      node['stroke' + side + 'Weight'] = active.includes(side) ? 1 : 0;
    }
    return change(node);
  }
  function sourceFormat(text, size, line, weight = 'regular', tracking = 0, role) {
    // Exact source overrides must not inherit an unrelated style's size binding.
    for (const field of ['fontFamily', 'fontStyle', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing'])
      if (text.boundVariables?.[field]) text.setBoundVariable(field, null);
    text.fontName = ctx.fonts[weight]; text.fontSize = size;
    text.lineHeight = { unit: 'PIXELS', value: line };
    text.letterSpacing = { unit: 'PIXELS', value: tracking };
    if (role) text.fills = [ctx.solid(role)];
    change(text);
  }
  async function refreshProperties(node, values) {
    const oldIds = ctx.tree(node).map(n => n.id);
    ctx.properties(node, values);
    const live = await figma.getNodeByIdAsync(node.id);
    if (!live || live.type !== 'INSTANCE') throw new Error('Linked corrective target disappeared: ' + node.id);
    const current = ctx.tree(live);
    for (const n of current) if (!oldIds.includes(n.id)) ctx.created.add(n.id);
    for (const id of oldIds) if (!current.some(n => n.id === id)) ctx.removed.add(id);
    ctx.mark(live);
    return live;
  }
  async function control(wrapper, fontSize = 13, iconSize = 16, sourceInset = 13,
    labelRole = 'foreground', leadingRole = labelRole) {
    const linked = find(wrapper, 'Button / linked instance', ['INSTANCE']);
    const leading = find(wrapper, 'Button / leading icon', ['FRAME', 'INSTANCE']);
    const trailing = find(wrapper, 'Button / trailing icon', ['FRAME', 'INSTANCE'], false);
    const labels = ctx.tree(linked).filter(n => n.type === 'TEXT');
    for (const text of labels) {
      sourceFormat(text, fontSize, 20, 'semibold', fontSize === 13 ? -.13 : 0, labelRole);
      text.textAutoResize = 'WIDTH_AND_HEIGHT'; change(text);
    }
    const labelWidth = Math.max(0, ...labels.map(n => n.width));
    const sourceGroup = iconSize + 8 + labelWidth + (trailing ? iconSize + 8 : 0);
    const groupStart = Math.max(sourceInset, (wrapper.width - sourceGroup) / 2);
    // Keep the linked label in auto-layout; padding reserves real icon space.
    ctx.dimension(linked, 'paddingLeft', groupStart + iconSize + 8);
    ctx.dimension(linked, 'paddingRight',
      Math.max(0, wrapper.width - groupStart - iconSize - 8 - labelWidth));
    ctx.dimension(linked, 'paddingTop', 0); ctx.dimension(linked, 'paddingBottom', 0);
    linked.primaryAxisAlignItems = 'MIN'; linked.counterAxisAlignItems = 'CENTER';
    ctx.absolute(leading, groupStart, (wrapper.height - iconSize) / 2, iconSize, iconSize);
    for (const n of ctx.tree(leading)) for (const field of ['fills', 'strokes'])
      if (field in n && Array.isArray(n[field]) && n[field].length) {
        n[field] = n[field].map(p => p.type === 'SOLID' ? ctx.solid(leadingRole, p.opacity ?? 1) : p);
        change(n);
      }
    if (trailing) ctx.absolute(trailing, groupStart + iconSize + 8 + labelWidth + 8,
      (wrapper.height - iconSize) / 2, iconSize, iconSize);
    change(linked);
    checks.push({ kind: 'control-icon-spacing', id: wrapper.id, labelWidth,
      availableLabelWidth: wrapper.width - linked.paddingLeft - linked.paddingRight,
      leadingEnd: leading.x + leading.width, labelStart: linked.paddingLeft,
      pass: linked.paddingLeft >= leading.x + leading.width + 7.9 &&
        sourceGroup <= wrapper.width - 2 + .5 });
    return linked;
  }
  function wrapInstance(parent, instance, name, width, height) {
    const existing = parent.children.find(n => n.name === name);
    if (existing) {
      if (existing.type !== 'FRAME' || instance.parent?.id !== existing.id)
        throw new Error('Incompatible existing corrective wrapper: ' + name);
      return existing;
    }
    if (parent.type !== 'FRAME') throw new Error('Correction wrapper needs an editable source frame: ' + parent.id);
    const index = parent.children.findIndex(n => n.id === instance.id);
    const positioning = instance.layoutPositioning;
    const x = instance.x, y = instance.y;
    const host = ctx.frame(parent, name, 'HORIZONTAL', width, height, { cross: 'CENTER' });
    const live = ctx.adopt(host, instance);
    parent.insertChild(index, host); change(parent);
    if (positioning === 'ABSOLUTE') ctx.absolute(host, x, y, width, height);
    ctx.absolute(live, 0, 0, width, height);
    return host;
  }
  async function changeBadge(card, label, negative = false) {
    let badge = find(card, 'Metric / source change', ['INSTANCE'], false) ??
      find(card, 'Metric / linked change badge', ['INSTANCE'], false);
    if (!badge) throw new Error('Expected an existing native metric badge: ' + card.id);
    const holder = badge.parent.name === 'Metric / vector change badge'
      ? badge.parent : wrapInstance(card, badge, 'Metric / vector change badge', 74, 22);
    badge.name = 'Metric / linked change badge'; change(badge);
    badge = await refreshProperties(badge, { 'Label#97:16': label });
    const fg = negative ? 'destructive-foreground' : 'accent-foreground';
    badge.fills = [ctx.solid(negative ? 'destructive' : 'accent')]; badge.strokes = [];
    ctx.radius(badge, 999);
    ctx.dimension(badge, 'paddingLeft', 26); ctx.dimension(badge, 'paddingRight', 8);
    badge.primaryAxisAlignItems = 'MIN'; badge.counterAxisAlignItems = 'CENTER';
    for (const text of ctx.tree(badge).filter(n => n.type === 'TEXT')) {
      sourceFormat(text, 11, 16, 'semibold', .11, fg);
      text.visible = true; text.textAutoResize = 'WIDTH_AND_HEIGHT'; change(text);
    }
    const arrow = await ctx.icon(holder, 'Metric / native trend arrow',
      negative ? 'ArrowDownRight' : 'ArrowUpRight', 12, fg);
    ctx.absolute(arrow, 8, 5, 12, 12);
    checks.push({ kind: 'native-trend-icon', id: holder.id, instanceId: badge.id,
      arrowId: arrow.id, pass: !ctx.tree(badge).some(n => n.type === 'TEXT' && /[↗↘]/.test(n.characters)) });
  }
  async function revenue(report, heading, graphic, legend, current, previous) {
    edges(heading, ['Bottom'], 'border', .65); report.clipsContent = true; change(report);
    for (const vector of ctx.tree(graphic).filter(n => n.type === 'VECTOR' && n.fills.length)) {
      vector.fills = [{ type: 'GRADIENT_LINEAR', opacity: .24,
        gradientTransform: [[0, 1, 0], [-1, 0, 1]], gradientStops: [
          { position: 0, color: { ...ctx.rgb('chart-1'), a: 1 },
            boundVariables: { color: { type: 'VARIABLE_ALIAS', id: ctx.colorVariable('chart-1').id } } },
          { position: 1, color: { ...ctx.rgb('chart-1'), a: .02 / .24 } },
        ] }]; change(vector);
    }
    // The source RevenuePanel genuinely has this rounded, bordered legend.
    legend.fills = [ctx.solid('surface-subtle', .35)];
    legend.strokes = [ctx.solid('border', .6)]; ctx.radius(legend, 10.4); change(legend);
    current.characters = 'This period'; previous.characters = 'Previous';
    sourceFormat(current, 11, 16, 'regular', 0, 'muted-foreground');
    sourceFormat(previous, 11, 16, 'regular', 0, 'muted-foreground');
    const dot = ctx.ensure(legend, 'Legend / native current dot', 'ELLIPSE', () => figma.createEllipse());
    dot.resize(8, 8); dot.fills = [ctx.solid('chart-1')]; dot.strokes = []; change(dot);
    const dash = ctx.ensure(legend, 'Legend / native previous dash', 'VECTOR', () => figma.createVector());
    dash.vectorPaths = [{ windingRule: 'NONE', data: 'M0 1L16 1' }];
    dash.fills = []; dash.strokes = [ctx.solid('chart-2')]; dash.strokeWeight = 2;
    dash.dashPattern = [3, 3]; change(dash);
    const totalWidth = 8 + 8 + 72 + 24 + 16 + 8 + 63;
    const start = (legend.width - totalWidth) / 2;
    ctx.absolute(dot, start, (legend.height - 8) / 2, 8, 8);
    ctx.absolute(current, start + 16, (legend.height - 16) / 2, 72, 16);
    ctx.absolute(dash, start + 112, (legend.height - 2) / 2, 16, 2);
    ctx.absolute(previous, start + 136, (legend.height - 16) / 2, 63, 16);
  }

  try {
    for (const row of prepared) {
      if (scope === 'landing') {
        await control(row.control, 13, 16, 13, 'foreground', 'primary');
        const metricDefinitions = [
          ['Preview / monthly revenue', 'Monthly revenue', '$48,295', '+12.8%', true,
            { icon: 'CreditCard', series: [12, 18, 15, 22, 19, 28, 30] }],
          ['Preview / subscribers', 'Subscribers', '2,420', '+8.2%', false,
            { icon: 'Users', series: [9, 14, 16, 14, 22, 25, 28] }],
        ];
        for (const [index, [name, label, value, trend, primary, data]] of metricDefinitions.entries()) {
          const old = find(row.metrics, name, ['FRAME', 'INSTANCE']);
          let card = old;
          if (old.type === 'INSTANCE') {
            const originalId = old.id;
            card = await ctx.metric(row.metrics, name, label, value, trend, 260.8, 190, primary, data);
            row.metrics.insertChild(index, card); change(row.metrics);
            ctx.preserved.push({ id: originalId, purpose: 'Existing linked landing MetricCard, now inside its source icon/sparkline wrapper' });
          }
          await changeBadge(card, trend);
        }
        edges(row.footer, ['Top']);
      } else if (scope === 'flagships') {
        edges(row.sidebar, ['Right']); edges(row.sidebarFooter, ['Top']);
        edges(row.header, ['Bottom'], 'border', .8); edges(row.footer, ['Top']);
        sourceFormat(row.workspace, 12, 16, 'regular', 0, 'muted-foreground');
        row.workspace.textAutoResize = 'WIDTH_AND_HEIGHT';
        const width = Math.max(61.3, Math.ceil(row.workspace.width));
        row.workspace.resize(width, 16);
        row.workspace.layoutSizingHorizontal = 'FIXED'; row.workspace.layoutSizingVertical = 'HUG';
        row.pageLabel.resize(row.breadcrumbs.width - width - 8 - 24, 16); change(row.pageLabel);
        checks.push({ kind: 'single-line-breadcrumb', id: row.workspace.id, pass: row.workspace.height <= 16.1 });
        await control(row.control, 13, 16, 13, 'accent-foreground');
        if (row.root.id === '5:2') {
          await control(row.export, 13, 16, 13, 'foreground');
          await control(row.customize, 13, 16, 13, 'primary-foreground');
          edges(row.planHeading, ['Bottom'], 'border', .65);
          for (const [index, card] of row.metricCards.entries())
            // The source explicitly passes trend="up" to all three metrics,
            // including the improving negative churn change.
            await changeBadge(card, ['+8.2%', '+1.3%', '−2.1%'][index]);
          for (const [index, plan] of row.planRows.entries()) {
            const labelRow = find(plan, 'Plan / label and amount');
            const label = find(labelRow, 'Plan / label', ['TEXT']);
            label.characters = ['Enterprise', 'Pro', 'Starter'][index];
            sourceFormat(label, 13, 20, 'regular', 0, 'foreground');
            const dot = ctx.ensure(labelRow, 'Plan / native series dot', 'ELLIPSE', () => figma.createEllipse());
            dot.resize(8, 8); dot.fills = [ctx.solid('chart-' + (index + 1))]; dot.strokes = []; change(dot);
            ctx.absolute(dot, 0, 6, 8, 8); ctx.absolute(label, 18, 0, 147, 20);
          }
          row.table.clipsContent = true; change(row.table);
        } else {
          edges(row.toolbar, ['Bottom'], 'border', .8);
          edges(row.composerFooter, ['Top'], 'border', .65);
          const customize = await control(row.customize, 12, 14, 13, 'foreground', 'primary');
          customize.fills = [ctx.solid('primary', .1)];
          customize.strokes = [ctx.solid('primary', .25)]; ctx.radius(customize, 16); change(customize);
          ctx.absolute(row.sendArrow, row.send.x + (row.send.width - 16) / 2,
            row.send.y + (row.send.height - 16) / 2, 16, 16);
          checks.push({ kind: 'centered-send-arrow', id: row.sendArrow.id,
            pass: Math.abs(row.sendArrow.x + 8 - row.send.x - row.send.width / 2) < .1 &&
              Math.abs(row.sendArrow.y + 8 - row.send.y - row.send.height / 2) < .1 });
        }
      } else {
        const customize = await control(row.control, 12, 14, 13, 'foreground', 'primary');
        customize.fills = [ctx.solid('primary', .1)];
        customize.strokes = [ctx.solid('primary', .25)]; ctx.radius(customize, 16); change(customize);
        const badgeHost = row.identity.parent.name === 'Auth form / Native identity badge'
          ? row.identity.parent : wrapInstance(row.identity.parent, row.identity,
            'Auth form / Native identity badge', 181, 30);
        row.identity = await refreshProperties(row.identity, { 'Label#97:16': 'Your next workspace' });
        row.identity.fills = [ctx.solid('accent')]; row.identity.strokes = [ctx.solid('primary', .3)];
        ctx.radius(row.identity, 999);
        ctx.dimension(row.identity, 'paddingLeft', 35); ctx.dimension(row.identity, 'paddingRight', 12);
        row.identity.primaryAxisAlignItems = 'MIN'; row.identity.counterAxisAlignItems = 'CENTER';
        for (const text of ctx.tree(row.identity).filter(n => n.type === 'TEXT')) {
          sourceFormat(text, 12, 16, 'semibold', 0, 'accent-foreground');
          text.visible = true; text.textAutoResize = 'WIDTH_AND_HEIGHT'; change(text);
        }
        const sparkle = await ctx.icon(badgeHost, 'Auth form / Native identity sparkle', 'Sparkles', 14, 'accent-foreground');
        ctx.absolute(sparkle, 13, 8, 14, 14);
        checks.push({ kind: 'visible-identity-copy', id: row.identity.id,
          pass: ctx.tree(row.identity).some(n => n.type === 'TEXT' && n.visible && n.characters === 'Your next workspace') });
        edges(row.scene, ['Left']); edges(row.signature, ['Top']);
        edges(row.footer, ['Top'], 'border', .7);
        row.sheet.fills = [ctx.solid('primary', .15)]; row.sheet.strokes = [ctx.solid('primary', .3)];
        row.sheet.opacity = 1; row.sheet.rotation = 0;
        ctx.absolute(row.sheet, 16, 12, 618.2, 335); row.sheet.rotation = 3;
        const angle = Math.PI / 60, cosine = Math.cos(angle), sine = Math.sin(angle);
        row.sheet.x = 16 + 309.1 * (1 - cosine) - 167.5 * sine;
        row.sheet.y = 12 + 309.1 * sine + 167.5 * (1 - cosine); change(row.sheet);
        sourceFormat(row.effectsLabel, 14, 20, 'semibold', 0, 'primary');
        row.effectsLabel.textAutoResize = 'WIDTH_AND_HEIGHT';
        const labelWidth = Math.max(100.5, Math.ceil(row.effectsLabel.width));
        row.effectsLabel.resize(labelWidth, 20);
        row.effectsLabel.layoutSizingHorizontal = 'FIXED'; row.effectsLabel.layoutSizingVertical = 'HUG';
        row.effects.resize(labelWidth + 22, 20); change(row.effects);
        checks.push({ kind: 'single-line-effects-link', id: row.effectsLabel.id,
          pass: row.effectsLabel.height <= 20.1 });
        const studio = await control(row.studio, 12, 14, 17, 'foreground', 'primary');
        studio.fills = [ctx.solid('surface', .8)]; studio.strokes = [ctx.solid('primary', .3)]; change(studio);
        row.growth.fills = [ctx.solid('accent')]; row.growth.strokes = [ctx.solid('primary', .25)]; change(row.growth);
        for (const text of ctx.tree(row.growth).filter(n => n.type === 'TEXT'))
          sourceFormat(text, 12, 16, 'semibold', 0, 'accent-foreground');
        const graphicVectors = ctx.tree(row.polyline).filter(n => n.type === 'VECTOR' && n.strokes.length);
        if (graphicVectors.length === 2) {
          graphicVectors[0].strokes = [ctx.solid('border')];
          graphicVectors[1].strokes = [ctx.solid('primary')];
          graphicVectors.forEach(change);
        }
        if (row.otp) {
          row.otp = await refreshProperties(row.otp, { 'Label#15:31': '', State: 'Empty' });
          for (const text of ctx.tree(row.otp).filter(n => n.type === 'TEXT')) {
            text.characters = ''; sourceFormat(text, 18, 28, 'semibold', 0, 'foreground');
          }
          row.otp.paddingLeft = 0; row.otp.paddingRight = 0;
          row.otp.paddingTop = 0; row.otp.paddingBottom = 0;
          row.otp.primaryAxisAlignItems = 'MIN'; row.otp.counterAxisAlignItems = 'CENTER';
          ctx.dimension(row.otp, 'itemSpacing', 8); change(row.otp);
          checks.push({ kind: 'six-empty-otp-cells', id: row.otp.id,
            cellIds: row.otp.children.map(n => n.id),
            pass: row.otp.children.length === 6 &&
              ctx.tree(row.otp).filter(n => n.type === 'TEXT').every(n => n.characters === '') });
        }
      }
      if (row.report) await revenue(row.report, row.reportHeading, row.revenueGraphic,
        row.legend, row.legendCurrent, row.legendPrevious);
    }
    // Refresh the slot descendants after native property changes, then correct
    // only family drift. Shared styles and variables are not resynchronized.
    await ctx.modernize();
    const result = await ctx.finish();
    const liveRoots = await Promise.all(ctx.roots.map(root => figma.getNodeByIdAsync(root.id)));
    const geometry = liveRoots.map((root, index) => ({
      id: root.id, pass: before[index].parentId === root.parent.id &&
        before[index].pageId === ctx.pageOf(root).id && before[index].name === root.name &&
        ['x', 'y', 'width', 'height'].every(field => Math.abs(before[index][field] - root[field]) < .1),
    }));
    const shaderUnchanged = liveRoots.every((root, index) => {
      const actual = ctx.tree(root).flatMap(node => ['fills', 'strokes'].flatMap(field =>
        field in node && Array.isArray(node[field]) ? node[field].filter(p => p.type === 'SHADER')
          .map(p => JSON.stringify({ nodeId: node.id, field, paint: p })) : []));
      return JSON.stringify(actual) === JSON.stringify(shaderBefore[index]);
    });
    const correctionFailures = [...checks.filter(check => !check.pass), ...geometry.filter(check => !check.pass),
      ...(shaderUnchanged ? [] : [{ kind: 'existing-shader-resource-preservation', pass: false }])];
    result.status = result.status === 'validation-failed' || correctionFailures.length
      ? 'targeted-correction-validation-failed' : 'targeted-correction-awaiting-postfix-screenshots';
    result.correctiveScope = scope; result.geometryPreserved = geometry;
    result.nativeShaderResourcesUnchanged = shaderUnchanged;
    result.correctionChecks = checks; result.correctionFailures = correctionFailures;
    result.ownerVisualReview = 'Take one post-fix screenshot of each changed root and compare with the source. Existing composition screenshots remain historical evidence.';
    return ctx.compactResult(result);
  } catch (error) {
    const result = await ctx.finish(error);
    result.status = 'partial-targeted-correction';
    result.correctiveScope = scope; result.correctionChecks = checks;
    return ctx.compactResult(result);
  }
}
// END TARGETED CORRECTIONS

// Built roots now default to edit-only correction. Full composition is an explicit recovery option.
const OPERATION = 'correct'; // 'reconcile' is reserved for an explicitly authorized full rebuild.





const ctx = await nativeContext(['5:2', '5:4'], '2:5', [
  'DashboardShell', 'SidebarItem', 'Avatar', 'Button', 'ButtonAppearance', 'BadgeAppearance',
  'CardMaterial', 'MetricCard', 'Badge', 'RevenuePanel', 'PlanBreakdown', 'CustomerTable', 'AIComposer', 'Select',
]);
if (!ctx.ready) return ctx;
if (OPERATION === 'correct') return await correctExistingComposition(ctx, 'flagships');

try {
  const shellVariant = ctx.variant(ctx.assets.DashboardShell, { Layout: 'Sidebar' });
  if (shellVariant.id !== '29:143') throw new Error('DashboardShell / Sidebar must retain the recorded main component 29:143');

  async function sidebar(parent, active) {
    const node = ctx.frame(parent, 'Flagship 1.1 / Sidebar', 'VERTICAL', 256, 1000, { fill: 'surface', border: 'border' });
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

    async function groupHeading(name, label, height, paddingTop = 20) {
      const heading = ctx.frame(node, name, 'VERTICAL', 256, height, { paddingLeft: 24, paddingRight: 24, paddingTop });
      await ctx.text(heading, 'Group / label', label, 208, 11, 'semibold', 'muted-foreground', 16, 10);
      return heading;
    }
    async function linkGroup(name, links, height) {
      const group = ctx.frame(node, name, 'VERTICAL', 256, height, { paddingLeft: 12, paddingRight: 12, gap: 2 });
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
    ], 250);
    const applications = await groupHeading('Sidebar / applications heading', 'APPLICATIONS', 50, 26);
    const disclosure = await ctx.icon(applications, 'Applications / disclosure', 'ChevronDown', 12, 'muted-foreground');
    ctx.absolute(disclosure, 222, 28, 12, 12);
    await groupHeading('Sidebar / management heading', 'MANAGE', 41.5, 26);
    const footer = ctx.frame(node, 'Sidebar / footer', 'VERTICAL', 256, 261.5, { padding: 16, border: 'border' });
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
    const header = ctx.frame(parent, 'Flagship 1.1 / Header', 'HORIZONTAL', 1184, 73, { paddingLeft: 24, paddingRight: 24, fill: 'surface', opacity: .85, border: 'border', borderOpacity: .8, align: 'SPACE_BETWEEN', cross: 'CENTER' });
    const breadcrumbs = ctx.frame(header, 'Header / breadcrumbs', 'HORIZONTAL', 270, 16, { gap: 12, cross: 'CENTER' });
    await ctx.text(breadcrumbs, 'Breadcrumb / workspace', 'Workspace', 61.3, 12, 'regular', 'muted-foreground', 16);
    await ctx.text(breadcrumbs, 'Breadcrumb / separator', '›', 8, 12, 'regular', 'muted-foreground', 16);
    await ctx.text(breadcrumbs, 'Breadcrumb / page', title, 178.7, 12, 'regular', 'foreground', 16);
    const controls = ctx.frame(header, 'Header / controls', 'HORIZONTAL', 458.8, 32, { gap: 8, cross: 'CENTER' });
    await ctx.functionalButton(controls, 'Header / search', 'Search       ⌘ K', 145.4, 32, 'Ghost', 'Search');
    await ctx.button(controls, 'Header / appearance', 'Appearance', 123.2, 32, 'Soft', 'Sliders');
    await ctx.functionalButton(controls, 'Header / language', 'EN', 50.2, 32, 'Ghost');
    const theme = ctx.frame(controls, 'Header / theme', 'HORIZONTAL', 32, 32, { align: 'CENTER', cross: 'CENTER' });
    await ctx.icon(theme, 'Header / sun', 'Sun', 16, 'muted-foreground');
    const notifications = ctx.frame(controls, 'Header / notifications', 'HORIZONTAL', 32, 32, { align: 'CENTER', cross: 'CENTER' });
    await ctx.icon(notifications, 'Header / bell', 'Bell', 16, 'muted-foreground');
    const account = ctx.frame(controls, 'Header / avatar spacing', 'HORIZONTAL', 36, 32, { paddingLeft: 4 });
    await ctx.component(account, 'Header / avatar', 'Avatar', { Size: 'Small' }, 32, 32, { 'Initials#3:101': 'AM' });
    return header;
  }

  async function workspace(root, title, active, fullHeight, mainHeight) {
    ctx.begin(root, 'HORIZONTAL', 1440, fullHeight);
    await sidebar(root, active);
    const shell = await ctx.instance(root, 'Flagship 1.1 / DashboardShell', shellVariant, 1184, fullHeight);
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
    for (const child of content.children) if (!child.name.startsWith('Flagship 1.1 /')) {
      ctx.mark(child); child.visible = false; ctx.adopt(content, child);
    }
    shell.fills = []; shell.paddingLeft = 0; shell.paddingRight = 0; shell.paddingTop = 0; shell.paddingBottom = 0; shell.itemSpacing = 0;
    ctx.mark(shell);
    await chrome(content, title);
    const main = ctx.frame(content, 'Flagship 1.1 / Main', 'VERTICAL', 1184, mainHeight, { paddingLeft: 32, paddingRight: 32, paddingTop: 36, paddingBottom: 40, gap: 24 });
    await ctx.paintStyle(main, 'hero');
    const footer = ctx.frame(content, 'Flagship 1.1 / Footer', 'HORIZONTAL', 1184, 64, { paddingLeft: 32, paddingRight: 32, cross: 'CENTER', align: 'SPACE_BETWEEN', border: 'border', fill: 'background' });
    await ctx.text(footer, 'Footer / identity', 'Aureform UI · Next.js + Figma', 600, 12, 'regular', 'muted-foreground', 18);
    await ctx.text(footer, 'Footer / demo', 'Local demo · Illustrative data', 360, 12, 'regular', 'muted-foreground', 18, 0, 'RIGHT');
    return main;
  }

  const saas = await workspace(ctx.roots[0], 'SaaS overview', 'Overview', 1787.3, 1650.3);
  const hero = ctx.frame(saas, 'SaaS 1.1 / Revenue hero', 'HORIZONTAL', 1120, 427.3, { padding: 33, gap: 40, cross: 'CENTER', fill: 'surface', border: 'primary', borderOpacity: .3, radius: 24, clip: true });
  await ctx.shader(hero, 1120, 427.3, 'surface', [.97, .84, .48]);
  const editorial = ctx.frame(hero, 'Revenue hero / narrative', 'VERTICAL', 557.7, null);
  const intro = ctx.frame(editorial, 'Revenue hero / introduction', 'HORIZONTAL', 557.7, 26, { gap: 12, cross: 'CENTER' });
  await ctx.badge(intro, 'Revenue hero / SaaS badge', 'SaaS command center', 164, 'Soft', 26);
  await ctx.text(intro, 'Revenue hero / demo context', 'Demo workspace', 250, 12, 'regular', 'muted-foreground', 16);
  const titleBlock = ctx.frame(editorial, 'Revenue hero / title spacing', 'VERTICAL', 557.7, null, { paddingTop: 20 });
  await ctx.text(titleBlock, 'Revenue hero / headline', 'Your next growth chapter.', 557.7, 44, 'bold', 'foreground', 49.28, -4.5);
  const descBlock = ctx.frame(editorial, 'Revenue hero / description spacing', 'VERTICAL', 557.7, null, { paddingTop: 16 });
  await ctx.text(descBlock, 'Revenue hero / description', 'Revenue, customers and momentum. Your entire SaaS business, in focus.', 557.7, 16, 'regular', 'muted-foreground', 28);
  const money = ctx.frame(editorial, 'Revenue hero / dominant metric', 'VERTICAL', 557.7, null, { paddingTop: 28 });
  await ctx.text(money, 'Revenue hero / metric label', 'Monthly revenue', 557.7, 14, 'regular', 'muted-foreground', 20);
  const value = ctx.frame(money, 'Revenue hero / metric value spacing', 'VERTICAL', 557.7, 72, { paddingTop: 8 });
  await ctx.text(value, 'Revenue hero / $48,295', '$48,295', 557.7, 64, 'bold', 'foreground', 64, -5.5);
  const change = ctx.frame(money, 'Revenue hero / change row', 'HORIZONTAL', 557.7, 42, { paddingTop: 16, gap: 12, cross: 'CENTER' });
  await ctx.badge(change, 'Revenue hero / +12.8%', '+12.8%', 60, 'Soft', 26);
  await ctx.text(change, 'Revenue hero / comparison', 'vs. last month · illustrative figures', 440, 12, 'regular', 'muted-foreground', 16);
  const heroActions = ctx.frame(editorial, 'Revenue hero / actions', 'HORIZONTAL', 557.7, 60, { paddingTop: 28, gap: 12, cross: 'CENTER' });
  await ctx.button(heroActions, 'Revenue hero / export', 'Export report', 130.7, 32, 'Outline', 'Download');
  await ctx.button(heroActions, 'Revenue hero / customize', 'Customize', 139.5, 32, 'Gradient', 'Sliders', true);
  const insight = ctx.frame(hero, 'Revenue hero / Growth signal', 'VERTICAL', 456.3, 341, { padding: 24, fill: 'surface', opacity: .9, border: 'primary', borderOpacity: .25, radius: 16 });
  await ctx.skin(insight, 'Growth signal', 456.3, 341);
  await ctx.shadow(insight);
  const insightHeading = ctx.frame(insight, 'Growth signal / heading', 'HORIZONTAL', 406.3, 20, { align: 'SPACE_BETWEEN', cross: 'CENTER' });
  await ctx.text(insightHeading, 'Growth signal / title', 'Growth signal', 350, 14, 'bold', 'foreground', 20);
  await ctx.icon(insightHeading, 'Growth signal / sparkle', 'Sparkles', 20);
  const insightValue = ctx.frame(insight, 'Growth signal / value spacing', 'VERTICAL', 406.3, 56, { paddingTop: 16 });
  await ctx.text(insightValue, 'Growth signal / +12.8%', '+12.8%', 406.3, 36, 'bold', 'foreground', 40, -2.5);
  const insightDescription = ctx.frame(insight, 'Growth signal / description spacing', 'VERTICAL', 406.3, 28, { paddingTop: 8 });
  await ctx.text(insightDescription, 'Growth signal / description', 'Monthly recurring revenue growth', 406.3, 14, 'regular', 'muted-foreground', 20);
  const insightPlot = ctx.frame(insight, 'Growth signal / chart spacing', 'VERTICAL', 406.3, 126, { paddingTop: 16 });
  await ctx.chart(insightPlot, 'Growth signal / revenue trend', 406.3, 110, true);
  const insightCTA = ctx.frame(insight, 'Growth signal / CTA spacing', 'VERTICAL', 406.3, 62, { paddingTop: 16 });
  await ctx.button(insightCTA, 'Growth signal / AI workspace', 'Open your AI workspace', 406.3, 46, 'Soft', 'Sparkles', true);
  const saasMetrics = ctx.frame(saas, 'SaaS 1.1 / Secondary metrics', 'HORIZONTAL', 1120, 190, { gap: 16 });
  await ctx.metric(saasMetrics, 'SaaS / active subscribers', 'Active subscribers', '2,420', '+8.2%', 362.6667, 190, false, {"icon":"Users","series":[12,18,15,22,19,28,30],"note":"vs. last month"});
  await ctx.metric(saasMetrics, 'SaaS / conversion rate', 'Conversion rate', '4.82%', '+1.3%', 362.6667, 190, false, {"icon":"MousePointer2","series":[14,18,15,24,19,28,32],"note":"vs. last month"});
  await ctx.metric(saasMetrics, 'SaaS / churn rate', 'Churn rate', '1.24%', '−2.1%', 362.6667, 190, false, {"icon":"Activity","series":[16,18,15,26,19,28,34],"note":"vs. last month"});
  const reports = ctx.frame(saas, 'SaaS 1.1 / Reports', 'HORIZONTAL', 1120, 435.5, { gap: 20 });
  await ctx.report(reports, 'SaaS / revenue overview', 745.2, 435.5, 'A closer look at your momentum over time.', true);
  const plans = ctx.frame(reports, 'SaaS / Revenue by plan', 'VERTICAL', 354.8, 435.5, { fill: 'surface', border: 'border', radius: 16 });
  await ctx.skin(plans, 'Revenue by plan', 354.8, 435.5, 'PlanBreakdown');
  const planHeader = ctx.frame(plans, 'Plan breakdown / heading', 'VERTICAL', 354.8, 105, { padding: 24, gap: 12, border: 'border' });
  await ctx.text(planHeader, 'Plan breakdown / title', 'Revenue by plan', 306.8, 15, 'semibold', 'foreground', 24, -2);
  await ctx.text(planHeader, 'Plan breakdown / description', 'The distribution behind your numbers.', 306.8, 13, 'regular', 'muted-foreground', 20);
  const planRows = ctx.frame(plans, 'Plan breakdown / values', 'VERTICAL', 354.8, 330.5, { padding: 24, gap: 24 });
  for (const [label, amount, share, role] of [['Enterprise', '$25,596', .53, 'chart-1'], ['Pro', '$16,905', .35, 'chart-2'], ['Starter', '$5,794', .12, 'chart-3']]) {
    const row = ctx.frame(planRows, 'Plan / ' + label, 'VERTICAL', 306.8, 62, { gap: 12 });
    const labelRow = ctx.frame(row, 'Plan / label and amount', 'HORIZONTAL', 306.8, 20, { align: 'SPACE_BETWEEN', cross: 'CENTER' });
    await ctx.text(labelRow, 'Plan / label', '●  ' + label, 165, 13, 'regular', 'foreground', 20);
    await ctx.text(labelRow, 'Plan / amount', amount, 130, 13, 'semibold', 'foreground', 20, 0, 'RIGHT');
    const track = ctx.frame(row, 'Plan / track', 'HORIZONTAL', 306.8, 8, { fill: 'surface-subtle', radius: 6.4 });
    const fill = ctx.ensure(track, 'Plan / native progress', 'RECTANGLE', () => figma.createRectangle());
    fill.resize(306.8 * share, 8); fill.fills = [ctx.solid(role)]; fill.cornerRadius = 4;
    await ctx.text(row, 'Plan / percentage', Math.round(share * 100) + '%', 306.8, 11, 'regular', 'muted-foreground', 16, 0, 'RIGHT');
  }
  await ctx.instance(saas, 'SaaS 1.1 / Recent customers', ctx.assets.CustomerTable, 1120, 409.5);

  const ai = await workspace(ctx.roots[1], 'AI workspace', 'AI workspace', 1219.5, 1082.5);
  ai.itemSpacing = 0;
  const toolbar = ctx.frame(ai, 'AI 1.1 / Toolbar', 'HORIZONTAL', 1120, 69, { paddingBottom: 20, border: 'border', borderOpacity: .8, align: 'SPACE_BETWEEN', cross: 'CENTER' });
  const aiIdentity = ctx.frame(toolbar, 'AI toolbar / identity', 'HORIZONTAL', 360, 48, { gap: 12, cross: 'CENTER' });
  const aiIcon = ctx.frame(aiIdentity, 'AI toolbar / icon well', 'HORIZONTAL', 44, 44, { fill: 'accent', border: 'primary', borderOpacity: .3, radius: 16, align: 'CENTER', cross: 'CENTER' });
  await ctx.icon(aiIcon, 'AI toolbar / sparkle', 'Sparkles', 20);
  const aiTitles = ctx.frame(aiIdentity, 'AI toolbar / titles', 'VERTICAL', 188, 48, { gap: 4 });
  await ctx.text(aiTitles, 'AI toolbar / title', 'AI workspace', 188, 18, 'bold', 'foreground', 28, -2);
  await ctx.text(aiTitles, 'AI toolbar / description', 'Think bigger. Build faster.', 188, 12, 'regular', 'muted-foreground', 16);
  await ctx.badge(aiIdentity, 'AI toolbar / demo', 'Demo', 62, 'Outline', 26);
  const toolbarActions = ctx.frame(toolbar, 'AI toolbar / actions', 'HORIZONTAL', 316.6, 36, { gap: 8, cross: 'CENTER' });
  await ctx.button(toolbarActions, 'AI toolbar / customize', 'Customize', 109.5, 36, 'Soft', 'Sliders');
  await ctx.functionalButton(toolbarActions, 'AI toolbar / new conversation', 'New conversation', 159.1, 32, 'Outline', 'Plus');
  const more = ctx.frame(toolbarActions, 'AI toolbar / conversation actions', 'HORIZONTAL', 32, 32, { align: 'CENTER', cross: 'CENTER' });
  await ctx.icon(more, 'AI toolbar / sliders', 'Sliders', 16, 'muted-foreground');
  const aiRegion = ctx.frame(ai, 'AI 1.1 / Centered region', 'VERTICAL', 1120, null, { paddingTop: 28, cross: 'CENTER' });
  const aiColumn = ctx.frame(aiRegion, 'AI / source column 920', 'VERTICAL', 920, null);
  const welcome = ctx.frame(aiColumn, 'AI / Empty welcome', 'VERTICAL', 920, 354.5, { paddingTop: 44, paddingBottom: 44, paddingLeft: 32, paddingRight: 32, fill: 'surface', border: 'primary', borderOpacity: .2, radius: 24, cross: 'CENTER', clip: true });
  await ctx.shader(welcome, 920, 354.5, 'surface', [.95, .65, .65]);
  const logo = ctx.frame(welcome, 'AI welcome / mark', 'HORIZONTAL', 72, 72, { fill: 'surface', opacity: .9, radius: 16, align: 'CENTER', cross: 'CENTER' });
  await ctx.effect(logo, 'GlowBorder', 72, 72);
  await ctx.icon(logo, 'AI welcome / Aureform mark', 'AureformMark', 40);
  const intelligence = ctx.frame(welcome, 'AI welcome / eyebrow spacing', 'VERTICAL', 854, 40, { paddingTop: 24 });
  await ctx.text(intelligence, 'AI welcome / eyebrow', 'AUREFORM INTELLIGENCE', 854, 12, 'semibold', 'primary', 16, 15, 'CENTER');
  const welcomeTitle = ctx.frame(welcome, 'AI welcome / headline spacing', 'VERTICAL', 854, 76.48, { paddingTop: 16 });
  await ctx.text(welcomeTitle, 'AI welcome / headline', 'What’s on your mind?', 854, 56, 'bold', 'foreground', 60.48, -4.5, 'CENTER');
  const welcomeDescription = ctx.frame(welcome, 'AI welcome / description spacing', 'VERTICAL', 576, null, { paddingTop: 20 });
  await ctx.text(welcomeDescription, 'AI welcome / description', 'Write, explore and build in one intelligent workspace. Bring the question. Find your next direction.', 576, 16, 'regular', 'muted-foreground', 28, 0, 'CENTER');
  const composerSpacing = ctx.frame(aiColumn, 'AI / Composer spacing', 'VERTICAL', 920, 251, { paddingTop: 28 });
  const composer = ctx.frame(composerSpacing, 'AI / Large composer', 'VERTICAL', 920, 223, { padding: 21, fill: 'surface', border: 'primary', borderOpacity: .3, radius: 16 });
  await ctx.skin(composer, 'AIComposer', 920, 223, 'AIComposer');
  await ctx.effect(composer, 'GlowBorder', 920, 223);
  await ctx.shadow(composer);
  const prompt = ctx.frame(composer, 'Composer / editable prompt area', 'VERTICAL', 878, 112, { paddingLeft: 8, paddingTop: 12 });
  await ctx.text(prompt, 'Composer / placeholder', 'Ask a question, explore an idea, make something new…', 862, 14, 'regular', 'muted-foreground', 28);
  const composerFooter = ctx.frame(composer, 'Composer / footer', 'HORIZONTAL', 878, 67, { paddingTop: 13, cross: 'CENTER', align: 'SPACE_BETWEEN', border: 'border', borderOpacity: .65 });
  const composerTools = ctx.frame(composerFooter, 'Composer / model and attachment', 'HORIZONTAL', 230, 42, { gap: 8, cross: 'CENTER' });
  await ctx.component(composerTools, 'Composer / model selector', 'Select', { State: 'Closed' }, 190, 36, { 'Label#15:11': 'Aureform · Balanced' });
  const attach = ctx.frame(composerTools, 'Composer / attachment button', 'HORIZONTAL', 32, 32, { cross: 'CENTER', align: 'CENTER' });
  await ctx.icon(attach, 'Composer / paperclip', 'Paperclip', 16, 'muted-foreground');
  const send = await ctx.component(composerFooter, 'Composer / disabled send', 'ButtonAppearance', { Appearance: 'Gradient', State: 'Disabled' }, 42, 42, { 'Label#97:0': '' });
  await ctx.paintStyle(send, 'control');
  const sendArrow = await ctx.icon(composerFooter, 'Composer / send arrow', 'ArrowUp', 16, 'primary-foreground');
  ctx.absolute(sendArrow, 836, 26, 16, 16); sendArrow.opacity = .45;
  const disclaimer = ctx.frame(aiColumn, 'AI / Local response notice', 'VERTICAL', 920, 40, { paddingTop: 16 });
  await ctx.text(disclaimer, 'AI / response notice', 'Simulated responses · Connect your provider through the adapter.', 920, 12, 'regular', 'muted-foreground', 24, 0, 'CENTER');
  const suggestions = ctx.frame(aiColumn, 'AI / Suggestions', 'VERTICAL', 920, 262, { paddingTop: 28, paddingBottom: 16, gap: 16 });
  await ctx.text(suggestions, 'Suggestions / heading', 'Start with a spark', 920, 14, 'semibold', 'foreground', 20);
  const suggestionRow = ctx.frame(suggestions, 'Suggestions / row', 'HORIZONTAL', 920, 182, { gap: 12 });
  for (const [title, body, kind] of [
    ['Find the right words', 'Write a warm welcome email for a new product.', 'Feather'],
    ['Make space for an idea', 'Help me explore three directions for a SaaS dashboard.', 'Lightbulb'],
    ['Build your next thing', 'Create a reusable React summary component.', 'Code'],
  ]) {
    const card = ctx.frame(suggestionRow, 'Suggestion / ' + title, 'VERTICAL', 298.6667, 182, { padding: 20, fill: 'surface', border: 'border', radius: 16 });
    await ctx.skin(card, title, 298.6667, 182, 'CardMaterial', 'Gradient');
    await ctx.effect(card, 'SpotlightCard', 298.6667, 182);
    const top = ctx.frame(card, 'Suggestion / icon row', 'HORIZONTAL', 258.6667, 42, { align: 'SPACE_BETWEEN', cross: 'CENTER' });
    const icon = ctx.frame(top, 'Suggestion / icon well', 'HORIZONTAL', 42, 42, { fill: 'accent', border: 'primary', borderOpacity: .25, radius: 16, cross: 'CENTER', align: 'CENTER' });
    await ctx.icon(icon, 'Suggestion / icon', kind, 20);
    await ctx.icon(top, 'Suggestion / arrow', 'ArrowUpRight', 16);
    const titleSpacing = ctx.frame(card, 'Suggestion / title spacing', 'VERTICAL', 258.6667, 40, { paddingTop: 20 });
    await ctx.text(titleSpacing, 'Suggestion / title', title, 258.6667, 14, 'bold', 'foreground', 20);
    const description = ctx.frame(card, 'Suggestion / description spacing', 'VERTICAL', 258.6667, 60, { paddingTop: 12 });
    await ctx.text(description, 'Suggestion / description', body, 258.6667, 13, 'regular', 'muted-foreground', 24);
  }
  ctx.finalize();
  await ctx.modernize();
  return await ctx.finish();
} catch (error) {
  return await ctx.finish(error);
}
