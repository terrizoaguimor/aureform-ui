/**
 * Aureform 1.1 — original native Table / DataTable material polish.
 *
 * Prepared only; this file has not been executed against the canvas.
 * Source checkpoint: 2026-10-19T02:45:29Z. Recheck the hashes below after
 * Huygens's final table handoff. Code Connect files and product source are
 * outside this script's scope.
 *
 * Owner execution, one page per call:
 *   1. action=preflight, target=core, family=DataTable.
 *   2. action=apply, target=core, family=DataTable, pack=0..7 (eight calls).
 *      Four materials have all five states at Comfortable density. Compact
 *      density has Default/Selected for each material; final total = 28.
 *      Empty/Loading/Error references use Comfortable density so the native
 *      composition covers all materials and states within the 30 cap.
 *   3. action=apply, target=core, family=Table, pack=0..7 (eight calls).
 *      Each pack has Default/Empty; final total = 16.
 *   4. target=blocks, family=CustomerDataTable, then CustomerTable.
 *   5. target=customers synchronizes the existing customer/overview instances.
 *   6. target=suite, family=CustomerDataTable for the ES mobile customer review,
 *      or CustomerTable for the EN desktop recent-customer review.
 *   7. target=review, family=DataTable or Table, pack=0..7, state=Default
 *      or Selected (DataTable only), theme=Light/Dark. One review per call.
 *   action=audit reads the selected scope and never reconciles content.
 *
 * Changing RUN selects the work; no state is stored in the Figma document.
 * Existing main IDs and State keys remain; Appearance/Density are inferred
 * from variant names. Deterministic child names allow reconciliation/retry.
 * The full ID ledger is returned as lossless observed-prefix ranges, matching
 * flagships-1.1.js. decodeAffectedIds() below restores every exact ID.
 * Review screenshots and actual native execution are owner checks.
 *
 * Community references informed hierarchy and spacing:
 *   https://www.figma.com/community/file/1514746685758799870/
 *   https://www.figma.com/community/file/1332203037536263387
 * All table geometry and layouts here are original Aureform compositions.
 *
 * Exact icon SVG geometry is from installed lucide-react 0.562.0:
 *
 * ISC License
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as
 * part of Feather (MIT). All other copyright (c) for Lucide are held by
 * Lucide Contributors 2025.
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * The MIT License (MIT) (for portions derived from Feather)
 * Copyright (c) 2013-2023 Cole Bemis
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

const RUN = {
  action: 'preflight', // preflight | apply | audit
  target: 'core', // core | blocks | customers | suite | review
  family: 'DataTable', // core/review: DataTable|Table; blocks/suite: CustomerDataTable|CustomerTable
  pack: 0, // Elevated/Comfortable, Elevated/Compact, Glass/Comfortable, Glass/Compact, Gradient/Comfortable, Gradient/Compact, Flat/Comfortable, Flat/Compact
  state: 'Default', // review only
  theme: 'Light', // review only; other targets retain their existing resolved mode
};

const FILE_KEY = 'lHp5p10yGb7lqXJDnAox0N';
const SOURCE = {
  capturedAt: '2026-10-19T02:45:29Z',
  'src/components/ui/data-table.tsx': '81e073007cc6a20767adc4c3777b552eeb94df205916b338dc36eb8bd6101e84',
  'src/components/ui/table.tsx': '41dcdd1f646dde6a102aa1e6471e662994210fc104f3467fc426fadfe8d792fe',
  'src/components/blocks/table-toolbar.tsx': 'cfcf33679b7f474bff09e87d976963bc68444d6177add833782c767274226cf3',
  'src/components/blocks/customer-table.tsx': '268a97b24affeb0f8d039db1287cc2ed41bbeddd0a6b353bbbe78b5793202ed6',
  'src/components/templates/data-manager.tsx': 'c29dfbb6154c12d011204479c3684e77b033b1f3200cf60fb9aff67967a0531a',
  'src/demo/dashboard-data.ts': 'b59b8d38586c10324ba9ee300a4dbcbd20761c1af806cd01f03f51c9eb3be5f0',
  'src/styles/effects.css': '944f6d23be8d830a6e0473f754aa586bb80e11e2413a83bbcf87e982f44416ee',
  'src/lib/appearance.ts': '467c38aac52085ec0b054b03be64f935c73e73990d17b0038241a02879a8ae53',
  'src/hooks/use-language.ts': 'd28044071689786e41142fa124fab6dd00ead6b44ef80f7dc72197c405a8ca6a',
};
const IDS = {
  pages: { core: '2:3', blocks: '2:4', customers: '2:5', suite: '2:6', review: '2:3' },
  colorCollection: 'VariableCollectionId:2:36',
  dimensionCollection: 'VariableCollectionId:2:58',
  Table: { set: '23:355', legacy: { Default: '23:336', Empty: '23:353' } },
  DataTable: { set: '23:443', legacy: { Default: '23:356', Selected: '23:390', Empty: '23:424' } },
  blocks: { CustomerTable: '6:51', CustomerDataTable: '17:18' },
  customerScreen: '5:3',
  overviewScreen: '5:2',
  customerInstance: '19:341',
  customerContent: '19:302',
  customerHeading: '19:303',
  customerMetrics: '19:319',
  customerFilters: '19:332',
  desktopReview: '74:8012',
  desktopInstance: '74:8076',
  mobileReview: '77:8192',
  mobileBody: '77:8206',
  mobileViewport: '77:8254',
  mobileInstance: '77:8255',
  assets: {
    Button: '3:113', Badge: '3:124', Input: '3:133', Avatar: '3:149',
    Checkbox: '15:14', Skeleton: '24:512', Alert: '24:363', Search: '9:33',
  },
  properties: {
    buttonLabel: 'Label#3:0', buttonShowIcon: 'Show icon#3:28',
    badgeLabel: 'Label#3:84', inputValue: 'Value#3:90', avatarInitials: 'Initials#3:101',
    alertLabel: 'Label#24:0',
  },
};
const MATERIALS = ['Elevated', 'Glass', 'Gradient', 'Flat'];
const DENSITIES = ['Comfortable', 'Compact'];
const STATES = { Table: ['Default', 'Empty'], DataTable: ['Default', 'Selected', 'Empty', 'Loading', 'Error'] };
const PACKS = cartesianProduct([MATERIALS, DENSITIES]).map(([Appearance, Density]) => ({ Appearance, Density }));
function statesFor(family, pack) {
  return family === 'DataTable' && pack.Density === 'Compact' ? ['Default', 'Selected'] : STATES[family];
}
function finalVariantCount(family) {
  return PACKS.reduce((count, pack) => count + statesFor(family, pack).length, 0);
}
const WIDTH = 1138;
const ROWS = [
  { id: 'cus-001', name: 'Olivia Rhye', email: 'olivia@layers.studio', company: 'Layers', plan: 'Pro', status: 'active', amount: '$249', esAmount: 'US$\u00a0249', joined: 'Oct 14, 2026', esJoined: '14 de oct de 2026' },
  { id: 'cus-002', name: 'Phoenix Baker', email: 'phoenix@sisyphus.co', company: 'Sisyphus', plan: 'Enterprise', status: 'active', amount: '$699', esAmount: 'US$\u00a0699', joined: 'Oct 13, 2026', esJoined: '13 de oct de 2026' },
  { id: 'cus-003', name: 'Lana Steiner', email: 'lana@catalog.design', company: 'Catalog', plan: 'Pro', status: 'trial', amount: '$249', esAmount: 'US$\u00a0249', joined: 'Oct 12, 2026', esJoined: '12 de oct de 2026' },
  { id: 'cus-004', name: 'Demi Wilkinson', email: 'demi@circooles.co', company: 'Circooles', plan: 'Starter', status: 'active', amount: '$99', esAmount: 'US$\u00a099', joined: 'Oct 11, 2026', esJoined: '11 de oct de 2026' },
  { id: 'cus-005', name: 'Drew Cano', email: 'drew@hourglass.app', company: 'Hourglass', plan: 'Enterprise', status: 'paused', amount: '$699', esAmount: 'US$\u00a0699', joined: 'Oct 10, 2026', esJoined: '10 de oct de 2026' },
];
const SVG = {
  Search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  Columns3: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/>',
  ArrowUpDown: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
  ChevronLeft: '<path d="m15 18-6-6 6-6"/>',
  ChevronRight: '<path d="m9 18 6-6-6-6"/>',
  ChevronDown: '<path d="m6 9 6 6 6-6"/>',
  MoreHorizontal: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  X: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  Download: '<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  Trash2: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  Inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  TriangleAlert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
};

// Cartesian product follows the library skill's createComponentWithVariants
// helper. Existing sets are reconciled instead of recombined, preserving IDs.
function cartesianProduct(arrays) {
  return arrays.reduce((acc, values) => acc.flatMap(row => values.map(value => [...row, value])), [[]]);
}
function tree(node) {
  const out = [node];
  if ('children' in node) for (const child of node.children) out.push(...tree(child));
  return out;
}
function pageOf(node) {
  let current = node;
  while (current && current.type !== 'PAGE') current = current.parent;
  return current;
}
function propertyOwner(node) {
  if (node.type === 'COMPONENT_SET') return node;
  if (node.type === 'COMPONENT') return node.parent?.type === 'COMPONENT_SET' ? node.parent : node;
  throw new Error('Property owner must be a component or component set: ' + node.id);
}
function props(node) {
  return propertyOwner(node).componentPropertyDefinitions;
}
function variant(set, axes) {
  if (set.type !== 'COMPONENT_SET') throw new Error('Expected component set: ' + set.id);
  const definitions = props(set);
  for (const [key, value] of Object.entries(axes)) {
    if (!definitions[key]?.variantOptions?.includes(value)) throw new Error('Missing verified axis ' + key + '=' + value + ' in ' + set.name);
  }
  const matches = set.children.filter(node => node.type === 'COMPONENT' && Object.entries(axes).every(([key, value]) => node.variantProperties?.[key] === value));
  if (matches.length !== 1) throw new Error('Missing or ambiguous native variant: ' + set.name + ' ' + JSON.stringify(axes));
  return matches[0];
}
function variantName(axes) {
  return ['State', 'Appearance', 'Density'].map(key => key + '=' + axes[key]).join(', ');
}
function decodeAffectedIds(ledger) {
  const result = { createdNodeIds: [], mutatedNodeIds: [], removedNodeIds: [] };
  let previous = '';
  const prefixes = ledger.prefixesFrontCodedCSV ? ledger.prefixesFrontCodedCSV.split('\n').map(row => {
    const comma = row.indexOf(','), common = Number(row.slice(0, comma));
    previous = previous.slice(0, common) + row.slice(comma + 1);
    return previous;
  }) : [];
  function add(mask, id) {
    if (mask & 1) result.createdNodeIds.push(id);
    if (mask & 2) result.mutatedNodeIds.push(id);
    if (mask & 4) result.removedNodeIds.push(id);
  }
  if (ledger.rangesCSV) for (const row of ledger.rangesCSV.split('\n')) {
    const [mask, prefix, ranges] = row.split(',');
    for (const range of ranges.split(';')) {
      const [start, end = start] = range.split('-').map(Number);
      for (let suffix = start; suffix <= end; suffix++) add(Number(mask), prefixes[Number(prefix)] + suffix);
    }
  }
  for (const [mask, id] of JSON.parse(ledger.literalsJSON)) add(mask, id);
  return result;
}

async function context() {
  if (!['preflight', 'apply', 'audit'].includes(RUN.action) || !IDS.pages[RUN.target]) throw new Error('Unsupported RUN action/target');
  if (['blocks', 'suite'].includes(RUN.target) && !IDS.blocks[RUN.family]) throw new Error('blocks/suite family must be CustomerTable or CustomerDataTable');
  if (!Number.isInteger(RUN.pack) || RUN.pack < 0 || RUN.pack >= PACKS.length) throw new Error('pack must be 0..7');
  if (!['Light', 'Dark'].includes(RUN.theme)) throw new Error('theme must be Light or Dark');
  if (figma.fileKey && figma.fileKey !== FILE_KEY) throw new Error('Unexpected Figma file');
  const page = await figma.getNodeByIdAsync(IDS.pages[RUN.target]);
  if (!page || page.type !== 'PAGE') throw new Error('Missing target page');
  await figma.setCurrentPageAsync(page); // Exactly one page switch per invocation.

  const assetEntries = Object.entries(IDS.assets);
  const rootIds = RUN.target === 'core' ? [IDS[RUN.family]?.set]
    : RUN.target === 'blocks' ? [IDS.blocks[RUN.family]]
      : RUN.target === 'customers' ? [IDS.customerScreen, IDS.overviewScreen]
        : RUN.target === 'suite' ? [RUN.family === 'CustomerTable' ? IDS.desktopReview : IDS.mobileReview]
          : [IDS[RUN.family]?.set];
  if (rootIds.some(id => !id)) throw new Error('Unsupported family for target');
  if (RUN.target === 'review' && !statesFor(RUN.family, PACKS[RUN.pack]).includes(RUN.state)) throw new Error('Unsupported review state/density combination; Empty/Loading/Error references use Comfortable density');
  const [roots, assetNodes, variables, collections, styles, effects, availableFonts] = await Promise.all([
    Promise.all(rootIds.map(id => figma.getNodeByIdAsync(id))),
    Promise.all(assetEntries.map(([, id]) => figma.getNodeByIdAsync(id))),
    figma.variables.getLocalVariablesAsync(), figma.variables.getLocalVariableCollectionsAsync(),
    figma.getLocalTextStylesAsync(), figma.getLocalEffectStylesAsync(), figma.listAvailableFontsAsync(),
  ]);
  const assets = Object.fromEntries(assetEntries.map(([name], index) => [name, assetNodes[index]]));
  const byVariableId = new Map(variables.map(variable => [variable.id, variable]));
  const byCollectionId = new Map(collections.map(collection => [collection.id, collection]));
  const colorCollection = byCollectionId.get(IDS.colorCollection);
  const dimensionCollection = byCollectionId.get(IDS.dimensionCollection);
  const colors = new Map(variables.filter(variable => variable.variableCollectionId === IDS.colorCollection).map(variable => [variable.name, variable]));
  const dimensions = variables.filter(variable => variable.variableCollectionId === IDS.dimensionCollection);
  const prerequisites = [];
  roots.forEach((root, index) => {
    if (!root || pageOf(root)?.id !== page.id) prerequisites.push('Missing/wrong-page target ' + rootIds[index]);
    else {
      const expected = RUN.target === 'core' || RUN.target === 'review' ? 'COMPONENT_SET' : RUN.target === 'blocks' ? 'COMPONENT' : 'FRAME';
      if (root.type !== expected) prerequisites.push('Unexpected target type for ' + root.id);
      for (let parent = root.parent; parent && parent.type !== 'PAGE'; parent = parent.parent) {
        if (parent.type === 'INSTANCE') prerequisites.push('Target has immutable instance ancestor: ' + root.id);
      }
    }
  });
  for (const [name, node] of Object.entries(assets)) {
    if (!node || node.type !== (name === 'Search' ? 'COMPONENT' : 'COMPONENT_SET')) prerequisites.push('Missing source asset ' + name);
  }
  if (!colorCollection || !dimensionCollection) prerequisites.push('Missing existing color/dimension collection');
  const modeIds = Object.fromEntries((colorCollection?.modes ?? []).map(mode => [mode.name, mode.modeId]));
  if (!modeIds.Light || !modeIds.Dark) prerequisites.push('Missing Light/Dark color modes');
  for (const role of ['background', 'surface', 'surface-subtle', 'border', 'foreground', 'muted-foreground', 'primary', 'accent', 'accent-foreground', 'warning', 'warning-foreground', 'destructive', 'destructive-foreground']) {
    if (!colors.has('color/' + role)) prerequisites.push('Missing color/' + role);
  }
  if (!colors.has('brand/primary')) prerequisites.push('Missing existing brand/primary token');
  const fonts = {};
  for (const role of ['regular', 'medium', 'semibold']) {
    fonts[role] = availableFonts.map(font => font.fontName).find(font => font.family === 'Manrope' && font.style.replace(/\s/g, '').toLowerCase() === role);
    if (!fonts[role]) prerequisites.push('Missing verified Manrope ' + role);
  }
  const newTextFont = availableFonts.map(font => font.fontName).find(font => font.family === 'Inter' && font.style === 'Regular');
  if (!newTextFont) prerequisites.push('Missing verified default font for newly created text (Inter Regular)');
  const textStyles = styles.filter(style => style.fontName.family === 'Manrope');
  if (!textStyles.length) prerequisites.push('Missing native Manrope text styles');
  for (const theme of ['Light', 'Dark']) for (const kind of ['soft', 'elevated']) {
    if (!effects.some(style => style.name === 'Aureform/Shadow/' + theme + '/' + kind)) prerequisites.push('Missing existing ' + theme + '/' + kind + ' effect style');
  }
  const contracts = [
    ['Button', { Style: 'Outline', Size: 'Small', State: 'Default' }, [IDS.properties.buttonLabel, IDS.properties.buttonShowIcon]],
    ['Badge', { Tone: 'Outline' }, [IDS.properties.badgeLabel]],
    ['Input', { State: 'Empty' }, [IDS.properties.inputValue]],
    ['Avatar', { Size: 'Medium' }, [IDS.properties.avatarInitials]],
    ['Checkbox', { State: 'Mixed' }, []],
    ['Skeleton', { State: 'Text' }, []],
    ['Alert', { State: 'Destructive' }, [IDS.properties.alertLabel]],
  ];
  for (const [name, axes, fields] of contracts) if (assets[name]) {
    try {
      variant(assets[name], axes);
      for (const field of fields) if (!props(assets[name])[field]) throw new Error('Missing exact property ' + field);
    } catch (error) { prerequisites.push(name + ': ' + error.message); }
  }
  if ((RUN.target === 'core' || RUN.target === 'review') && roots[0]?.type === 'COMPONENT_SET') {
    const set = roots[0], definitions = props(set);
    for (const key of Object.keys(definitions)) if (!['State', 'Appearance', 'Density'].includes(key)) prerequisites.push('Unmapped existing core property must be preserved explicitly: ' + key);
    if (definitions.State?.type !== 'VARIANT') prerequisites.push('Original State variant key missing');
    if (set.children.length > finalVariantCount(RUN.family)) prerequisites.push('Variant cap exceeded');
    for (const [state, id] of Object.entries(IDS[RUN.family].legacy)) {
      const node = set.children.find(child => child.id === id);
      if (!node || node.variantProperties?.State !== state) prerequisites.push('Original main ID/state mismatch: ' + id);
    }
    const seen = new Set();
    for (const child of set.children) {
      if (child.type !== 'COMPONENT') { prerequisites.push('Unexpected non-variant child ' + child.id); continue; }
      const axes = child.variantProperties ?? {};
      const key = [axes.Appearance ?? 'Elevated', axes.Density ?? 'Comfortable', axes.State].join('/');
      if (seen.has(key)) prerequisites.push('Duplicate variant combination: ' + key);
      seen.add(key);
      if ((axes.Appearance && !MATERIALS.includes(axes.Appearance)) || (axes.Density && !DENSITIES.includes(axes.Density)) || !statesFor(RUN.family, { Density: axes.Density ?? 'Comfortable' }).includes(axes.State)) prerequisites.push('Unmapped existing variant: ' + child.name);
    }
    if (RUN.target === 'review') {
      try { variant(set, { ...PACKS[RUN.pack], State: RUN.state }); } catch (error) { prerequisites.push('Apply this core pack before reviewing: ' + error.message); }
    }
  }
  if (RUN.target === 'blocks' && roots[0]?.type === 'COMPONENT' && Object.keys(props(roots[0])).length) prerequisites.push('New block properties require an explicit binding-preservation plan');
  if (prerequisites.length) return { ready: false, page, prerequisites, roots: roots.filter(Boolean), created: new Set(), mutated: new Set(), removed: new Set() };

  // Current fonts, including mixed styled ranges and empty text, precede every
  // structural/text/mode mutation. Load style fonts as well as our chosen roles.
  const fontSet = new Map();
  for (const root of [...roots, ...Object.values(assets)]) for (const node of tree(root)) if (node.type === 'TEXT') {
    for (const segment of node.getStyledTextSegments(['fontName'])) fontSet.set(JSON.stringify(segment.fontName), segment.fontName);
    if (!node.characters.length && node.fontName !== figma.mixed) fontSet.set(JSON.stringify(node.fontName), node.fontName);
  }
  for (const font of [newTextFont, ...Object.values(fonts), ...textStyles.map(style => style.fontName)]) fontSet.set(JSON.stringify(font), font);
  await Promise.all([...fontSet.values()].map(font => figma.loadFontAsync(font)));

  const created = new Set(), mutated = new Set(), removed = new Set(), plans = new Map();
  const auditRoots = new Map(), usedVariables = new Map(), preserved = new Map(), warnings = [];
  for (const root of roots) preserved.set(root.id, { id: root.id, name: root.name, type: root.type });
  function mark(node, descendants = false) {
    for (const item of descendants ? tree(node) : [node]) mutated.add(item.id);
  }
  function assertOwned(node) {
    if (pageOf(node)?.id !== page.id) throw new Error('Mutation outside the selected page: ' + node.id);
  }
  function valueOf(variable, theme, seen = []) {
    if (seen.includes(variable.id)) throw new Error('Variable alias cycle: ' + variable.id);
    const collection = byCollectionId.get(variable.variableCollectionId);
    const mode = variable.variableCollectionId === colorCollection.id ? modeIds[theme] : collection?.defaultModeId;
    const value = variable.valuesByMode[mode] ?? variable.valuesByMode[collection?.defaultModeId];
    if (value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS') {
      const next = byVariableId.get(value.id);
      if (!next) throw new Error('Unresolved source variable alias: ' + value.id);
      return valueOf(next, theme, [...seen, variable.id]);
    }
    return value;
  }
  function variable(role) {
    const item = colors.get(role.includes('/') ? role : 'color/' + role);
    if (!item) throw new Error('Unverified color role: ' + role);
    usedVariables.set(item.id, item.name);
    return item;
  }
  function rgb(role, theme = 'Light') {
    const color = valueOf(variable(role), theme);
    if (!color || typeof color !== 'object' || !('r' in color)) throw new Error('Expected COLOR token: ' + role);
    return { r: color.r, g: color.g, b: color.b };
  }
  function solid(role, opacity = 1, theme = 'Light') {
    return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb(role, theme), opacity }, 'color', variable(role));
  }
  function dimension(node, field, value, prefix = 'spacing/') {
    node.setBoundVariable(field, null);
    node[field] = value;
    const token = dimensions.find(item => item.name.startsWith(prefix) && Math.abs(valueOf(item, 'Light') - value) < 0.01);
    if (token) { node.setBoundVariable(field, token); usedVariables.set(token.id, token.name); }
    mark(node);
  }
  function radius(node, value) {
    for (const field of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) dimension(node, field, value, 'radius/');
  }
  function adopt(parent, node) {
    assertOwned(parent);
    if (node.parent?.id !== parent.id) {
      if (node.parent) mark(node.parent);
      parent.appendChild(node); mark(parent); mark(node, true);
    }
    // Page siblings belong to other owners. Never reconcile a whole page.
    if (parent.type === 'PAGE') return node;
    if (!plans.has(parent.id)) plans.set(parent.id, { parent, children: [] });
    const list = plans.get(parent.id).children;
    if (!list.some(child => child.id === node.id)) list.push(node);
    return node;
  }
  function ensure(parent, name, type, create, reuse) {
    const matches = parent.children.filter(node => node.name === name);
    if (matches.length > 1 || (matches[0] && matches[0].type !== type)) throw new Error('Ambiguous/incompatible native child: ' + name);
    const node = matches[0] ?? (reuse?.type === type ? reuse : create());
    if (!matches.length && node !== reuse) for (const child of tree(node)) created.add(child.id);
    node.name = name; node.visible = true; mark(node);
    return adopt(parent, node);
  }
  function legacyChild(parent, names, type) {
    return parent.children.find(child => names.includes(child.name) && (!type || child.type === type));
  }
  function frame(parent, name, direction, width, height = null, options = {}, reuse) {
    const node = ensure(parent, name, 'FRAME', () => {
      const fresh = figma.createAutoLayout(direction);
      fresh.fills = []; // createAutoLayout's default white must never leak.
      return fresh;
    }, reuse);
    node.layoutMode = direction;
    node.resize(Math.max(1, width), Math.max(1, height ?? 1));
    node.layoutSizingHorizontal = options.fillWidth ? 'FILL' : 'FIXED';
    node.layoutSizingVertical = height == null ? 'HUG' : 'FIXED';
    node.primaryAxisAlignItems = options.align ?? 'MIN';
    node.counterAxisAlignItems = options.cross ?? 'MIN';
    node.fills = options.fill ? [solid(options.fill, options.opacity ?? 1)] : [];
    node.strokes = [];
    node.effects = [];
    node.clipsContent = options.clip ?? false;
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) dimension(node, 'padding' + side, options['padding' + side] ?? options.padding ?? 0);
    dimension(node, 'itemSpacing', options.gap ?? 0);
    if (options.radius != null) radius(node, options.radius);
    return node;
  }
  function rule(node, role = 'border', opacity = 1, side = 'Bottom') {
    node.strokes = [solid(role, opacity)]; node.strokeAlign = 'INSIDE';
    for (const edge of ['Top', 'Right', 'Bottom', 'Left']) node['stroke' + edge + 'Weight'] = edge === side ? 1 : 0;
    mark(node);
  }
  async function text(parent, name, content, width, size = 14, weight = 'regular', role = 'foreground', line = 20, options = {}, reuse) {
    const node = ensure(parent, name, 'TEXT', () => figma.createText(), reuse);
    const style = textStyles.slice().sort((a, b) => Math.abs(a.fontSize - size) - Math.abs(b.fontSize - size))[0];
    await node.setTextStyleIdAsync(style.id);
    node.fontName = fonts[weight]; node.fontSize = size;
    node.lineHeight = { unit: 'PIXELS', value: line };
    node.letterSpacing = { unit: 'PERCENT', value: options.tracking ?? 0 };
    node.textAlignHorizontal = options.align ?? 'LEFT';
    node.textAutoResize = 'HEIGHT'; node.resize(Math.max(1, width), Math.max(line, node.height));
    node.layoutSizingHorizontal = 'FIXED'; node.layoutSizingVertical = 'HUG';
    node.textTruncation = options.wrap ? 'DISABLED' : 'ENDING';
    node.maxLines = options.wrap ? null : 1;
    node.characters = content; node.fills = [solid(role)];
    if (!(node.width > 0)) throw new Error('Collapsed native text: ' + name);
    return node;
  }
  async function instance(parent, name, master, width, height, properties = {}, reuse) {
    const node = ensure(parent, name, 'INSTANCE', () => master.createInstance(), reuse);
    const main = await node.getMainComponentAsync();
    if (main?.id !== master.id) {
      const before = tree(node).map(child => child.id);
      node.swapComponent(master);
      const after = tree(node).map(child => child.id);
      for (const id of after) if (!before.includes(id)) created.add(id);
      for (const id of before) if (!after.includes(id)) removed.add(id);
    }
    for (const key of Object.keys(properties)) if (!node.componentProperties[key]) throw new Error('Unverified nested property: ' + key);
    node.setProperties(properties);
    node.resize(width, height); node.layoutSizingHorizontal = 'FIXED'; node.layoutSizingVertical = 'FIXED';
    mark(node, true);
    return node;
  }
  async function component(parent, name, family, axes, width, height, properties = {}, reuse) {
    return instance(parent, name, variant(assets[family], axes), width, height, properties, reuse);
  }
  function restyleInstanceText(node, size, role, weight = 'semibold', line = 20) {
    for (const child of tree(node)) if (child.type === 'TEXT') {
      child.fontName = fonts[weight]; child.fontSize = size; child.lineHeight = { unit: 'PIXELS', value: line };
      child.fills = [solid(role)]; child.textTruncation = 'ENDING'; child.maxLines = 1;
      mark(child);
    }
  }
  function absolute(node, x, y, width, height) {
    node.resize(width, height); node.layoutSizingHorizontal = 'FIXED'; node.layoutSizingVertical = 'FIXED';
    node.layoutPositioning = 'ABSOLUTE'; node.x = x; node.y = y; mark(node);
  }
  async function icon(parent, name, kind, size = 16, role = 'muted-foreground') {
    if (!SVG[kind]) throw new Error('Missing verified source SVG: ' + kind);
    const node = kind === 'Search'
      ? await instance(parent, name, assets.Search, size, size)
      : ensure(parent, name, 'FRAME', () => figma.createNodeFromSvg('<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">' + SVG[kind] + '</svg>'));
    node.fills = []; node.resize(size, size); node.layoutSizingHorizontal = 'FIXED'; node.layoutSizingVertical = 'FIXED';
    for (const child of tree(node)) if (child.type === 'VECTOR' || child.type === 'BOOLEAN_OPERATION') {
      for (const field of ['fills', 'strokes']) if (Array.isArray(child[field])) child[field] = child[field].map(paint => paint.type === 'SOLID' ? solid(role, paint.opacity ?? 1) : paint);
      mark(child);
    }
    return node;
  }
  async function button(parent, name, label, width, options = {}) {
    const host = frame(parent, name, 'HORIZONTAL', width, 32, { cross: 'CENTER', align: 'CENTER' }, options.reuseHost);
    const node = await component(host, 'Button / linked control', 'Button',
      { Style: options.style ?? 'Outline', Size: 'Small', State: options.disabled ? 'Disabled' : 'Default' },
      width, 32, { [IDS.properties.buttonLabel]: label, [IDS.properties.buttonShowIcon]: false }, options.reuse);
    radius(node, 10.4); // Source Button defaults to the rounded shape.
    node.opacity = options.disabled ? 0.45 : 1;
    if (options.active) { node.fills = [solid('accent')]; node.strokes = []; }
    if (options.destructive) { node.fills = [solid('destructive')]; node.strokes = []; }
    const role = options.destructive ? 'destructive-foreground' : options.active ? 'accent-foreground' : options.style === 'Ghost' ? 'muted-foreground' : 'foreground';
    restyleInstanceText(node, options.pageNumber ? 12 : 13, role);
    if (options.icon) {
      const glyph = await icon(host, 'Button / source ' + options.icon, options.icon, 16, role);
      absolute(glyph, label ? 12 : (width - 16) / 2, 8, 16, 16);
      if (label) { node.paddingLeft = 36; node.paddingRight = 12; mark(node); }
    }
    return host;
  }
  function gradientTransform(angle, width, height) {
    const radians = angle * Math.PI / 180;
    const dx = Math.sin(radians) * width, dy = -Math.cos(radians) * height;
    const extent = Math.abs(dx) + Math.abs(dy);
    const ux = dx / extent, uy = dy / extent;
    return [[ux, uy, (1 - ux - uy) / 2], [-uy, ux, (1 + uy - ux) / 2]];
  }
  function gradient(role, stops, opacity, angle, width, height, theme) {
    const color = rgb(role, theme);
    return {
      type: 'GRADIENT_LINEAR', opacity, gradientTransform: gradientTransform(angle, width, height),
      gradientStops: stops.map(([position, alpha]) => ({
        position, color: { ...color, a: alpha },
        // Binding a transparent stop replaces its RGBA alpha. Keep it literal.
        ...(alpha === 1 ? { boundVariables: { color: { type: 'VARIABLE_ALIAS', id: variable(role).id } } } : {}),
      })),
    };
  }
  function resolvedTheme(node) {
    return node.resolvedVariableModes?.[colorCollection.id] === modeIds.Dark ? 'Dark' : 'Light';
  }
  async function material(node, appearance, theme, contextDefault = false) {
    const width = node.width, height = node.height;
    node.fills = appearance === 'Glass'
      ? [gradient('primary', [[0, 1], [0.65, 0]], 0.08, 130, width, height, theme), solid('surface', theme === 'Dark' ? 0.8 : 0.87, theme)]
      : appearance === 'Gradient'
        ? [gradient('brand/primary', [[0.25, 0], [1, 1]], 0.2, 135, width, height, theme), solid('surface', 1, theme)]
        : [solid('surface', 1, theme)];
    node.strokes = appearance === 'Elevated' || appearance === 'Flat' ? [solid('border', 1, theme)] : [solid('primary', 0.3, theme), solid('border', 1, theme)];
    node.strokeWeight = 1; node.strokeAlign = 'INSIDE'; radius(node, 16);
    if (appearance === 'Flat') node.effects = [];
    else {
      const effectStyle = effects.find(style => style.name === 'Aureform/Shadow/' + theme + '/' + (appearance === 'Glass' ? 'soft' : 'elevated'));
      await node.setEffectStyleIdAsync(effectStyle.id);
    }
    if (appearance === 'Glass') node.effects = [...node.effects, { type: 'BACKGROUND_BLUR', blurType: 'NORMAL', radius: 18, visible: true }];
    // Unspecified appearance uses the provider's default elevated card shadow.
    if (contextDefault) node.effects = [{
      type: 'DROP_SHADOW', color: theme === 'Dark' ? { r: 0, g: 0, b: 0, a: 0.43875 } : { r: 31 / 255, g: 47 / 255, b: 87 / 255, a: 0.0975 },
      offset: { x: 0, y: 12 }, radius: 32, spread: 0, visible: true, blendMode: 'NORMAL',
    }];
    mark(node);
  }
  function rootLayout(root, width, height = null) {
    assertOwned(root);
    root.layoutMode = 'VERTICAL'; root.resize(width, Math.max(1, height ?? 1));
    root.layoutSizingHorizontal = 'FIXED'; root.layoutSizingVertical = height == null ? 'HUG' : 'FIXED';
    root.primaryAxisAlignItems = 'MIN'; root.counterAxisAlignItems = 'MIN';
    root.fills = []; root.strokes = []; root.effects = []; root.clipsContent = false;
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) dimension(root, 'padding' + side, 0);
    dimension(root, 'itemSpacing', 0); mark(root);
    auditRoots.set(root.id, root);
  }
  function finishPlans() {
    for (const { parent, children } of [...plans.values()].reverse()) {
      const wanted = new Set(children.map(child => child.id));
      for (const child of [...parent.children]) if (!wanted.has(child.id)) {
        for (const item of tree(child)) removed.add(item.id);
        child.remove(); mark(parent);
      }
      children.forEach((child, index) => {
        if (parent.children[index]?.id !== child.id) { parent.insertChild(index, child); mark(parent); mark(child, true); }
      });
    }
  }
  function safeCanvasPosition(node) {
    const right = Math.max(0, ...page.children.filter(child => child.id !== node.id).map(child => child.x + child.width));
    node.x = right + 160; node.y = 80; mark(node);
  }
  return {
    ready: true, page, roots, assets, colorCollection, modeIds, created, mutated, removed,
    plans, auditRoots, usedVariables, preserved, warnings, fontSet, fonts,
    mark, valueOf, variable, rgb, solid, dimension, radius, adopt, ensure, legacyChild,
    frame, rule, text, instance, component, restyleInstanceText, absolute, icon, button,
    resolvedTheme, material, rootLayout, finishPlans, safeCanvasPosition,
  };
}

function columnSpecs(width, classic = false) {
  return classic ? [
    { key: 'customer', label: 'Customer', width: width - 640 },
    { key: 'plan', label: 'Plan', width: 160 },
    { key: 'status', label: 'Status', width: 160 },
    { key: 'amount', label: 'Amount', width: 144, numeric: true },
    { key: 'joined', label: 'Joined', width: 176 },
  ] : [
    { key: 'select', label: '', width: 56 },
    { key: 'customer', label: 'Customer', width: width - 866 },
    { key: 'company', label: 'Company', width: 130 },
    { key: 'plan', label: 'Plan', width: 134 },
    { key: 'status', label: 'Status', width: 126 },
    { key: 'amount', label: 'Monthly spend', width: 176, numeric: true },
    { key: 'joined', label: 'Joined', width: 164 },
    { key: 'actions', label: '', width: 80 },
  ];
}

async function searchField(ctx, parent, width, reuse) {
  const host = ctx.frame(parent, 'Toolbar / search field', 'HORIZONTAL', width, 40, { cross: 'CENTER' });
  const input = await ctx.component(host, 'Input / linked search', 'Input', { State: 'Empty' }, width, 40,
    { [IDS.properties.inputValue]: 'Search records…' }, reuse);
  input.paddingLeft = 40; input.paddingRight = 40; ctx.mark(input);
  ctx.restyleInstanceText(input, 13, 'muted-foreground', 'regular');
  const glyph = await ctx.icon(host, 'Search / source icon', 'Search');
  ctx.absolute(glyph, 14, 12, 16, 16);
  return host;
}

async function toolbar(ctx, root, width, state, showcase) {
  const old = ctx.legacyChild(root, ['Table controls', 'Search toolbar'], 'FRAME');
  const legacyInput = old && ctx.legacyChild(old, ['Input'], 'INSTANCE');
  const host = ctx.frame(root, 'Table / toolbar', 'VERTICAL', width, null, { padding: 16, paddingLeft: 24, paddingRight: 24, gap: 16, fillWidth: true }, old);
  ctx.rule(host);
  if (showcase) {
    const heading = ctx.frame(host, 'Toolbar / heading', 'VERTICAL', width - 48, 52, { gap: 4 });
    const title = ctx.frame(heading, 'Toolbar / title and count', 'HORIZONTAL', width - 48, 24, { gap: 10, cross: 'CENTER' });
    await ctx.text(title, 'Toolbar / title', 'Customers', 100, 16, 'semibold', 'foreground', 24, { tracking: -1 });
    const count = ctx.frame(title, 'Toolbar / record count', 'HORIZONTAL', 86, 24, { paddingLeft: 10, paddingRight: 10, cross: 'CENTER', align: 'CENTER', fill: 'accent', opacity: 0.65, radius: 999 });
    count.strokes = [ctx.solid('primary', 0.2)]; count.strokeWeight = 1; ctx.mark(count);
    await ctx.text(count, 'Toolbar / count label', state === 'Empty' ? '0 rows' : '12 rows', 62, 12, 'medium', 'foreground', 20);
    await ctx.text(heading, 'Toolbar / description', 'Manage the people and subscriptions in your workspace.', width - 48, 13, 'regular', 'muted-foreground', 24, { wrap: true });
  }
  const controls = ctx.frame(host, 'Toolbar / controls', 'HORIZONTAL', width - 48, 40, { align: 'SPACE_BETWEEN', cross: 'CENTER' });
  await searchField(ctx, controls, 288, legacyInput);
  if (showcase) await ctx.button(controls, 'Toolbar / column visibility', 'Columns', 116, { icon: 'Columns3' });
  if (state === 'Selected') {
    const selection = ctx.frame(host, 'Toolbar / selection', 'HORIZONTAL', width - 48, 54,
      { paddingLeft: 12, paddingRight: 12, paddingTop: 10, paddingBottom: 10, cross: 'CENTER', align: 'SPACE_BETWEEN', fill: 'accent', opacity: 0.5, radius: 10.4 });
    selection.strokes = [ctx.solid('primary', 0.2)]; selection.strokeWeight = 1; ctx.mark(selection);
    await ctx.text(selection, 'Selection / live count', '2 selected', 160, 13, 'semibold');
    const actions = ctx.frame(selection, 'Selection / actions', 'HORIZONTAL', 258, 32, { gap: 8, cross: 'CENTER' });
    await ctx.button(actions, 'Selection / export', 'Export', 101, { icon: 'Download' });
    await ctx.button(actions, 'Selection / delete', 'Delete', 101, { icon: 'Trash2', destructive: true });
    await ctx.button(actions, 'Selection / clear', '', 32, { style: 'Ghost', icon: 'X' });
  }
}

async function planBadge(ctx, parent, value, reuse) {
  const width = Math.ceil(value.length * 6.4 + 22);
  const node = await ctx.component(parent, 'Plan / linked badge', 'Badge', { Tone: 'Outline' }, width, 26,
    { [IDS.properties.badgeLabel]: value }, reuse);
  node.fills = []; node.strokes = [ctx.solid('border')]; node.strokeWeight = 1;
  node.paddingLeft = 10; node.paddingRight = 10; ctx.radius(node, 999);
  ctx.restyleInstanceText(node, 11, 'foreground', 'semibold', 16); ctx.mark(node);
  return node;
}

async function statusBadge(ctx, parent, value, dot = true) {
  const label = value === 'active' ? 'Active' : value === 'trial' ? 'Trial' : 'Paused';
  const role = value === 'active' ? 'accent' : value === 'trial' ? 'warning' : 'surface-subtle';
  const foreground = value === 'active' ? 'accent-foreground' : value === 'trial' ? 'warning-foreground' : 'muted-foreground';
  const labelWidth = Math.ceil(label.length * 6.4);
  const host = ctx.frame(parent, 'Status / pill', 'HORIZONTAL', labelWidth + 22 + (dot ? 10 : 0), 26,
    { gap: 6, paddingLeft: 10, paddingRight: 10, fill: role, radius: 999, cross: 'CENTER' });
  if (dot) {
    const bullet = ctx.ensure(host, 'Status / dot', 'ELLIPSE', () => figma.createEllipse());
    bullet.resize(4, 4); bullet.fills = [ctx.solid(foreground)]; ctx.mark(bullet);
  }
  const labelNode = await ctx.component(host, 'Status / linked badge label', 'Badge',
    { Tone: value === 'active' ? 'Success' : value === 'trial' ? 'Warning' : 'Neutral' }, labelWidth, 16,
    { [IDS.properties.badgeLabel]: label });
  labelNode.fills = []; labelNode.strokes = [];
  labelNode.paddingLeft = 0; labelNode.paddingRight = 0;
  ctx.restyleInstanceText(labelNode, 11, foreground, 'semibold', 16); ctx.mark(labelNode);
}

async function identity(ctx, cell, record, available, oldRow) {
  const host = ctx.frame(cell, 'Identity / avatar and copy', 'HORIZONTAL', available, 42, { gap: 12, cross: 'CENTER' });
  const avatar = await ctx.component(host, 'Avatar / linked initials', 'Avatar', { Size: 'Medium' }, 32, 32,
    { [IDS.properties.avatarInitials]: record.name.split(' ').slice(0, 2).map(word => word[0]).join('') });
  ctx.restyleInstanceText(avatar, 10, 'accent-foreground', 'semibold', 14);
  const copy = ctx.frame(host, 'Identity / copy', 'VERTICAL', available - 44, 42, { gap: 2 });
  await ctx.text(copy, 'Identity / name', record.name, available - 44, 14, 'semibold', 'foreground', 20, {},
    oldRow && ctx.legacyChild(oldRow, [record.name], 'TEXT'));
  await ctx.text(copy, 'Identity / email', record.email, available - 44, 10, 'regular', 'muted-foreground', 20, {},
    oldRow && ctx.legacyChild(oldRow, [record.email], 'TEXT'));
}

async function grid(ctx, root, width, options = {}) {
  const { classic = false, density = 'Comfortable', state = 'Default', recent = false } = options;
  const specs = columnSpecs(width, classic), compact = density === 'Compact';
  const padding = compact ? 14 : 24, rowHeight = compact ? 62 : 74, headerHeight = compact ? 40 : 48;
  const headerOld = ctx.legacyChild(root, ['Row/0', 'Column headings', 'column headers'], 'FRAME');
  const header = ctx.frame(root, 'Table / header', 'HORIZONTAL', width, headerHeight,
    { fill: 'surface-subtle', opacity: 0.65, cross: 'CENTER', fillWidth: true }, headerOld);
  ctx.rule(header, 'border', 0.75);
  for (const spec of specs) {
    const cell = ctx.frame(header, 'Header / ' + spec.key, 'HORIZONTAL', spec.width, headerHeight,
      { paddingLeft: padding, paddingRight: spec.key === 'select' ? 0 : padding, cross: 'CENTER', gap: 8, align: spec.numeric && !recent ? 'MAX' : 'MIN' });
    if (spec.key === 'select') {
      const checkbox = await ctx.component(cell, 'Selection / page checkbox', 'Checkbox', { State: state === 'Selected' ? 'Mixed' : 'Unchecked' }, 20, 20, {},
        headerOld && ctx.legacyChild(headerOld, ['Checkbox'], 'INSTANCE'));
      checkbox.strokes = [ctx.solid(state === 'Selected' ? 'primary' : 'muted-foreground', state === 'Selected' ? 1 : 0.7)]; checkbox.strokeWeight = 1; ctx.mark(checkbox);
    } else if (spec.key !== 'actions') {
      const available = spec.width - padding * 2;
      const sort = !classic;
      const oldText = headerOld && ctx.legacyChild(headerOld, [spec.label, spec.key === 'company' ? 'Email' : spec.label], 'TEXT');
      await ctx.text(cell, 'Header / label', spec.label, available - (sort ? 22 : 0), 12, 'semibold', 'muted-foreground', 20,
        { align: spec.numeric && !recent ? 'RIGHT' : 'LEFT' }, oldText);
      if (sort) await ctx.icon(cell, 'Header / sort toggle (aria-sort none)', 'ArrowUpDown', 14);
    }
  }
  if (state === 'Empty') {
    const body = ctx.frame(root, 'Table / empty body', 'VERTICAL', width, 254, { padding: 24, paddingTop: 72, paddingBottom: 72, gap: 12, cross: 'CENTER', fillWidth: true });
    const well = ctx.frame(body, 'Empty / icon well', 'HORIZONTAL', 48, 48, { fill: 'surface-subtle', radius: 16, align: 'CENTER', cross: 'CENTER' });
    well.strokes = [ctx.solid('border')]; well.strokeWeight = 1; ctx.mark(well);
    await ctx.icon(well, 'Empty / source inbox', 'Inbox', 20);
    await ctx.text(body, 'Empty / title', 'No records found', 360, 14, 'semibold', 'foreground', 20, { align: 'CENTER' });
    await ctx.text(body, 'Empty / description', 'Try another search or clear the filters.', 320, 12, 'regular', 'muted-foreground', 18, { align: 'CENTER', wrap: true });
    return;
  }
  for (const [index, record] of ROWS.slice(0, classic ? 4 : 5).entries()) {
    const old = ctx.legacyChild(root, ['Row/' + (index + 1), 'Customer row ' + (index + 1), 'row/' + record.name], 'FRAME');
    const selected = state === 'Selected' && index < 2;
    const row = ctx.frame(root, 'Row / ' + record.id, 'HORIZONTAL', width, rowHeight, { cross: 'CENTER', fillWidth: true, ...(selected ? { fill: 'accent', opacity: 0.65 } : {}) }, old);
    if (index !== (classic ? 3 : 4)) ctx.rule(row, 'border', 0.75);
    if (selected) {
      const edge = ctx.ensure(row, 'Selection / primary inset edge', 'RECTANGLE', () => figma.createRectangle());
      edge.fills = [ctx.solid('primary')]; ctx.absolute(edge, 0, 0, 3, rowHeight);
    }
    for (const spec of specs) {
      const cell = ctx.frame(row, 'Cell / ' + spec.key, 'HORIZONTAL', spec.width, rowHeight,
        { paddingLeft: padding, paddingRight: spec.key === 'select' ? 0 : padding, paddingTop: compact ? 10 : 16, paddingBottom: compact ? 10 : 16, cross: 'CENTER', align: spec.numeric && !recent ? 'MAX' : 'MIN' });
      const available = spec.width - padding - (spec.key === 'select' ? 0 : padding);
      if (spec.key === 'select') {
        const checkbox = await ctx.component(cell, 'Selection / row checkbox', 'Checkbox', { State: selected ? 'Checked' : 'Unchecked' }, 20, 20, {},
          old && ctx.legacyChild(old, ['Checkbox'], 'INSTANCE'));
        checkbox.strokes = [ctx.solid(selected ? 'primary' : 'muted-foreground', selected ? 1 : 0.7)]; checkbox.strokeWeight = 1; ctx.mark(checkbox);
      } else if (spec.key === 'customer') await identity(ctx, cell, record, available, old);
      else if (spec.key === 'plan' && !recent) await planBadge(ctx, cell, record.plan);
      else if (spec.key === 'status') await statusBadge(ctx, cell, record.status, !recent);
      else if (spec.key === 'actions') await ctx.button(cell, 'Row actions / ' + record.id, '', 32, { style: 'Ghost', icon: 'MoreHorizontal' });
      else await ctx.text(cell, 'Cell / value', record[spec.key], available,
        spec.key === 'joined' ? 11 : compact ? 13 : 14,
        spec.numeric ? 'medium' : 'regular', spec.key === 'joined' ? 'muted-foreground' : 'foreground', 20,
        { align: spec.numeric && !recent ? 'RIGHT' : 'LEFT' },
        old && ctx.legacyChild(old, [record[spec.key], spec.key], 'TEXT'));
    }
  }
}

async function pagination(ctx, root, width, state, showcase) {
  const old = ctx.legacyChild(root, ['Table footer', 'Pagination'], 'FRAME');
  const footer = ctx.frame(root, 'Table / pagination', 'HORIZONTAL', width, 60,
    { paddingLeft: 24, paddingRight: 24, paddingTop: 14, paddingBottom: 14, cross: 'CENTER', align: 'SPACE_BETWEEN', gap: 12, fillWidth: true }, old);
  ctx.rule(footer, 'border', 1, 'Top');
  const empty = state === 'Empty', pages = empty ? 1 : 3;
  const summary = ctx.frame(footer, 'Pagination / live range', 'HORIZONTAL', 320, 20, { gap: 12, cross: 'CENTER' });
  const recordLabel = showcase ? 'rows' : 'records';
  await ctx.text(summary, 'Pagination / records', (empty ? '0–0 of 0 ' : '1–5 of 12 ') + recordLabel, 150, 12, 'medium');
  await ctx.text(summary, 'Pagination / page', 'Page 1 of ' + pages, 130, 12, 'regular', 'muted-foreground');
  if (showcase) {
    const sizes = ctx.frame(footer, 'Pagination / page size', 'HORIZONTAL', 164, 32, { gap: 8, cross: 'CENTER' });
    await ctx.text(sizes, 'Pagination / page size label', 'Rows per page', 90, 12, 'regular', 'muted-foreground');
    const select = ctx.frame(sizes, 'Pagination / native size selector', 'HORIZONTAL', 56, 32, { fill: 'surface', paddingLeft: 8, paddingRight: 8, cross: 'CENTER', radius: 10.4 });
    select.strokes = [ctx.solid('border')]; select.strokeWeight = 1; ctx.mark(select);
    await ctx.text(select, 'Pagination / current page size', '5', 22, 12);
    await ctx.icon(select, 'Pagination / native select indicator', 'ChevronDown', 12, 'foreground');
  }
  const nav = ctx.frame(footer, 'Pagination / navigation', 'HORIZONTAL', 32 * (pages + 2) + 6 * (pages + 1), 32, { gap: 6, cross: 'CENTER' });
  await ctx.button(nav, 'Pagination / previous', '', 32, { icon: 'ChevronLeft', disabled: true });
  for (let page = 1; page <= pages; page++) await ctx.button(nav, 'Pagination / page ' + page, String(page), 32, { style: 'Ghost', active: page === 1, pageNumber: true });
  await ctx.button(nav, 'Pagination / next', '', 32, { icon: 'ChevronRight', disabled: empty });
}

async function errorState(ctx, root, width) {
  ctx.rootLayout(root, width);
  root.layoutMode = 'HORIZONTAL'; ctx.dimension(root, 'itemSpacing', 12);
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) ctx.dimension(root, 'padding' + side, 16);
  root.fills = [ctx.solid('destructive')]; root.strokes = [ctx.solid('destructive-foreground', 0.2)];
  root.strokeWeight = 1; ctx.radius(root, 16); ctx.mark(root);
  await ctx.icon(root, 'Error / source warning', 'TriangleAlert', 16, 'destructive-foreground');
  const body = ctx.frame(root, 'Error / content', 'VERTICAL', width - 60, 84, { gap: 12 });
  const alert = await ctx.component(body, 'Alert / linked destructive message', 'Alert', { State: 'Destructive' }, width - 60, 40,
    { [IDS.properties.alertLabel]: 'Could not load records' });
  alert.fills = []; alert.strokes = []; alert.paddingTop = 0; alert.paddingBottom = 0; alert.paddingLeft = 0; alert.paddingRight = 0; alert.itemSpacing = 4;
  const texts = tree(alert).filter(node => node.type === 'TEXT');
  ctx.restyleInstanceText(alert, 12, 'destructive-foreground', 'regular', 18);
  if (texts[0]) { texts[0].fontName = ctx.fonts.semibold; ctx.mark(texts[0]); }
  if (texts[1]) { texts[1].characters = 'The connection failed. Check your connection and try again.'; ctx.mark(texts[1]); }
  ctx.mark(alert);
  await ctx.button(body, 'Error / retry', 'Try again', 98);
  return { appearanceIgnored: true, sourceProps: ['error', 'onRetry'] };
}

async function render(ctx, root, options = {}) {
  const { width = WIDTH, appearance = 'Elevated', density = 'Comfortable', state = 'Default', classic = false, showcase = false, recent = false } = options;
  if (state === 'Error') return errorState(ctx, root, width);
  ctx.rootLayout(root, width);
  if (recent) {
    const heading = ctx.frame(root, 'Table / recent heading', 'HORIZONTAL', width, 64,
      { paddingLeft: 20, paddingRight: 20, paddingTop: 16, paddingBottom: 16, cross: 'CENTER', align: 'SPACE_BETWEEN', fillWidth: true },
      ctx.legacyChild(root, ['table heading'], 'FRAME'));
    await ctx.text(heading, 'Recent / title', 'Recent customers', 300, 16, 'semibold', 'foreground', 24, {},
      ctx.legacyChild(heading, ['title'], 'TEXT'));
    await ctx.button(heading, 'Recent / view all', 'View all', 90, { reuse: ctx.legacyChild(heading, ['Button'], 'INSTANCE') });
  } else if (!classic) await toolbar(ctx, root, width, state, showcase);
  if (state === 'Loading') {
    const loading = ctx.frame(root, 'Table / loading body', 'VERTICAL', width, 288, { padding: 24, gap: 20, fillWidth: true });
    for (let index = 0; index < 5; index++) {
      await ctx.component(loading, 'Loading / linked skeleton ' + (index + 1), 'Skeleton', { State: 'Text' }, width - 48, 32);
    }
  } else await grid(ctx, root, width, { classic, density, state, recent });
  if (!classic) await pagination(ctx, root, width, state, showcase);
  if (recent) {
    const footer = ctx.frame(root, 'Table / recent footer', 'HORIZONTAL', width, 40,
      { paddingLeft: 20, paddingRight: 20, paddingTop: 12, paddingBottom: 12, fillWidth: true },
      ctx.legacyChild(root, ['footer'], 'FRAME'));
    ctx.rule(footer, 'border', 1, 'Top');
    await ctx.text(footer, 'Recent / summary', 'Showing the 4 most recent customers', width - 40, 10, 'regular', 'muted-foreground', 15);
  }
  // Fill dimensions are recomputed after reconciliation removes old content.
  return { appearance, density, state, classic, showcase, recent, contextDefault: Boolean(options.contextDefault) };
}

async function core(ctx) {
  const set = ctx.roots[0], pack = PACKS[RUN.pack], expected = statesFor(RUN.family, pack);
  const beforeAxes = props(set);
  const firstExpansion = !beforeAxes.Appearance && !beforeAxes.Density;
  if (firstExpansion) {
    ctx.safeCanvasPosition(set);
    set.layoutMode = 'NONE'; set.fills = []; set.strokes = []; ctx.mark(set);
  }
  const rendered = [];
  for (const state of expected) {
    const axes = { ...pack, State: state }, name = variantName(axes);
    let root = set.children.find(node => node.type === 'COMPONENT' && Object.entries(axes).every(([key, value]) => node.variantProperties?.[key] === value));
    if (!root && RUN.pack === 0 && IDS[RUN.family].legacy[state]) root = set.children.find(node => node.id === IDS[RUN.family].legacy[state]);
    if (!root) {
      root = figma.createComponent(); ctx.created.add(root.id);
      set.appendChild(root); ctx.mark(set);
    }
    root.name = name; ctx.mark(root);
    const options = await render(ctx, root, {
      appearance: pack.Appearance, density: pack.Density, state,
      classic: RUN.family === 'Table', showcase: RUN.family === 'DataTable',
    });
    rendered.push({ root, options });
  }
  set.description = RUN.family === 'DataTable'
    ? 'Aureform DataTable: native customer fixture, sorting headers, page selection, row actions, pagination. Appearance maps to flat/elevated/glass/gradient; Density maps to comfortable/compact. Selected shows a user-selected fixture, not an initialSelectedRows prop. Loading and Error map to loading/error/onRetry. All five states in Comfortable; Default/Selected in Compact. 28 composed variants, below the 30 cap. Core examples opt into title/description/columnVisibility/pageSizeOptions.'
    : 'Aureform Table primitive: editable customer cells, native header/body hierarchy, four materials and two densities. Compose caption, empty body and numeric alignment in children. Original State Default/Empty preserved. 16 variants.';
  ctx.mark(set);
  ctx.finishPlans();
  for (const { root, options } of rendered) if (!options.appearanceIgnored) await ctx.material(root, options.appearance, ctx.resolvedTheme(root));
  // Reserve the complete grid on the first pack; later packs keep the set ID,
  // canvas position and planned cell positions. Actual child bounds size it.
  const columns = STATES[RUN.family].length, slotHeight = RUN.family === 'DataTable' ? 850 : 450;
  for (const child of set.children) {
    const axes = child.variantProperties ?? {};
    const materialIndex = MATERIALS.indexOf(axes.Appearance ?? 'Elevated');
    const densityIndex = DENSITIES.indexOf(axes.Density ?? 'Comfortable');
    const row = materialIndex * 2 + densityIndex;
    child.x = 40 + STATES[RUN.family].indexOf(axes.State) * (WIDTH + 40);
    child.y = 40 + row * (slotHeight + 40); ctx.mark(child);
  }
  set.resizeWithoutConstraints(80 + columns * WIDTH + (columns - 1) * 40, 80 + PACKS.length * slotHeight + (PACKS.length - 1) * 40);
  ctx.mark(set);
  for (const [state, id] of Object.entries(IDS[RUN.family].legacy)) ctx.preserved.set(id, { id, state, type: 'COMPONENT' });
}

async function blocks(ctx) {
  const root = ctx.roots[0], recent = RUN.family === 'CustomerTable';
  const options = await render(ctx, root, { width: root.width, classic: recent, recent, showcase: false, contextDefault: true });
  ctx.finishPlans();
  await ctx.material(root, options.appearance, ctx.resolvedTheme(root), true);
  root.description = recent
    ? 'CustomerTable source fixture: four recent customers, plain plan text, status label without dot, currency/date, View all link and summary. Original main ID preserved.'
    : 'CustomerDataTable source fixture: five of twelve customer rows, page checkbox, Customer/Company/Plan/Status/Monthly spend/Joined/actions, search, page navigation. The actual CustomerManager adds status/plan filters and export/add actions outside this table. Original main ID preserved.';
  ctx.mark(root);
}

async function refreshInstance(ctx, instance, master, theme, locale = 'en') {
  if (instance.type !== 'INSTANCE' || pageOf(instance)?.id !== ctx.page.id) throw new Error('Expected same-page native instance: ' + instance.id);
  const main = await instance.getMainComponentAsync();
  if (main?.id !== master.id) throw new Error('Existing customer master link changed: ' + instance.id);
  if (!master.children.some(child => child.name === 'Table / header')) throw new Error('Apply the source block before synchronizing its flagship: ' + master.id);
  instance.resize(instance.width, master.height); instance.layoutSizingHorizontal = 'FIXED'; instance.layoutSizingVertical = 'FIXED';
  await ctx.material(instance, 'Elevated', theme, true);
  ctx.mark(instance, true); ctx.auditRoots.set(instance.id, instance); ctx.preserved.set(instance.id, { id: instance.id, mainId: master.id, type: 'INSTANCE' });
  if (locale === 'es') {
    const translations = {
      Customer: 'Cliente', Company: 'Empresa', Status: 'Estado', 'Monthly spend': 'Gasto mensual', Joined: 'Registro',
      'Search records…': 'Buscar registros…', Active: 'Activo', Trial: 'Prueba', Paused: 'Pausado',
      '1–5 of 12 rows': '1–5 de 12 registros', '1–5 of 12 records': '1–5 de 12 registros', 'Page 1 of 3': 'Página 1 de 3',
    };
    // Text/property overrides only: never insert or remove instance children.
    for (const node of tree(instance)) {
      if (node.type === 'INSTANCE') {
        const values = {};
        for (const [key, field] of Object.entries(node.componentProperties)) {
          if (field.type === 'TEXT' && translations[field.value]) values[key] = translations[field.value];
        }
        if (Object.keys(values).length) { node.setProperties(values); ctx.mark(node, true); }
      }
      if (node.type === 'TEXT') {
        const translated = translations[node.characters];
        const date = ROWS.find(record => record.joined === node.characters)?.esJoined;
        const amount = node.name === 'Cell / value' ? ROWS.find(record => record.amount === node.characters)?.esAmount : undefined;
        if (translated || date || amount) { node.characters = translated ?? date ?? amount; ctx.mark(node); }
      }
    }
    // Spanish labels need their natural width inside a fixed table column.
    for (const pill of tree(instance).filter(node => node.type === 'FRAME' && node.name === 'Status / pill')) {
      const label = tree(pill).find(node => node.type === 'TEXT');
      if (!label) continue;
      const labelWidth = Math.ceil(label.characters.length * 6.4);
      const badge = pill.children.find(node => node.type === 'INSTANCE');
      if (badge) { badge.resize(labelWidth, 16); ctx.mark(badge); }
      pill.resize(labelWidth + 32, 26); ctx.mark(pill);
    }
  }
}

function fitVerticalFlow(ctx, frame) {
  if (frame.type !== 'FRAME' || frame.layoutMode !== 'VERTICAL') return;
  const children = frame.children.filter(node => node.visible && node.layoutPositioning !== 'ABSOLUTE');
  const needed = frame.paddingTop + frame.paddingBottom + children.reduce((height, node) => height + node.height, 0) + Math.max(0, children.length - 1) * frame.itemSpacing;
  if (needed > frame.height + 0.5) {
    const horizontal = frame.layoutSizingHorizontal, vertical = frame.layoutSizingVertical;
    frame.resize(frame.width, needed); frame.layoutSizingHorizontal = horizontal; frame.layoutSizingVertical = vertical;
    ctx.mark(frame);
  }
}

async function customers(ctx) {
  const masters = await Promise.all(Object.values(IDS.blocks).map(id => figma.getNodeByIdAsync(id)));
  const byId = new Map(masters.map(master => [master.id, master]));
  const found = [];
  for (const root of ctx.roots) {
    for (const instance of root.findAllWithCriteria({ types: ['INSTANCE'] })) {
      const main = await instance.getMainComponentAsync();
      if (byId.has(main?.id)) found.push({ instance, master: byId.get(main.id) });
    }
  }
  if (!found.some(({ instance }) => instance.id === IDS.customerInstance)) throw new Error('Original customer flagship table instance missing');
  for (const { instance, master } of found) await refreshInstance(ctx, instance, master, ctx.resolvedTheme(instance));
  const content = await figma.getNodeByIdAsync(IDS.customerContent);
  if (content?.type === 'FRAME') fitVerticalFlow(ctx, content);
  for (const id of [IDS.customerScreen, IDS.overviewScreen, IDS.customerHeading, IDS.customerMetrics, IDS.customerFilters]) ctx.preserved.set(id, { id, purpose: 'Existing flagship/chrome retained' });
}

async function suite(ctx) {
  const mobile = RUN.family !== 'CustomerTable';
  const [instance, master] = await Promise.all([
    figma.getNodeByIdAsync(mobile ? IDS.mobileInstance : IDS.desktopInstance),
    figma.getNodeByIdAsync(mobile ? IDS.blocks.CustomerDataTable : IDS.blocks.CustomerTable),
  ]);
  if (!instance || !master) throw new Error('Missing recorded Suite table target/master');
  await refreshInstance(ctx, instance, master, 'Dark', mobile ? 'es' : 'en');
  if (mobile) {
    const [viewport, body] = await Promise.all([figma.getNodeByIdAsync(IDS.mobileViewport), figma.getNodeByIdAsync(IDS.mobileBody)]);
    if (!viewport || viewport.type !== 'FRAME' || viewport.width !== 328 || viewport.parent?.id !== IDS.mobileBody) throw new Error('Original 328px mobile scroll viewport changed');
    viewport.resize(328, master.height); viewport.layoutSizingHorizontal = 'FIXED'; viewport.layoutSizingVertical = 'FIXED';
    viewport.clipsContent = true; viewport.overflowDirection = 'HORIZONTAL'; ctx.mark(viewport);
    if (body?.type === 'FRAME') fitVerticalFlow(ctx, body);
    fitVerticalFlow(ctx, ctx.roots[0]);
    ctx.preserved.set(viewport.id, { id: viewport.id, width: 328, purpose: 'Unscaled horizontal-scroll viewport' });
  }
}

async function review(ctx) {
  const pack = PACKS[RUN.pack], master = variant(ctx.roots[0], { ...pack, State: RUN.state });
  const name = 'Review / ' + RUN.family + ' 1.1 / ' + pack.Appearance + ' / ' + pack.Density + ' / ' + RUN.state + ' / ' + RUN.theme;
  const matches = ctx.page.children.filter(node => node.name === name);
  if (matches.length > 1 || (matches[0] && matches[0].type !== 'FRAME')) throw new Error('Ambiguous review frame');
  const fresh = !matches.length;
  const host = ctx.frame(ctx.page, name, 'VERTICAL', WIDTH + 64, null, { padding: 32, gap: 20, fill: 'background', radius: 16 });
  if (fresh) ctx.safeCanvasPosition(host);
  host.setExplicitVariableModeForCollection(ctx.colorCollection, ctx.modeIds[RUN.theme]); ctx.mark(host);
  await ctx.text(host, 'Review / caption', RUN.family + ' · ' + pack.Appearance + ' · ' + pack.Density + ' · ' + RUN.state + ' · ' + RUN.theme, WIDTH, 13, 'semibold', 'muted-foreground', 20);
  const sample = await ctx.instance(host, 'Review / linked native table', master, WIDTH, master.height);
  if (RUN.state !== 'Error') await ctx.material(sample, pack.Appearance, RUN.theme);
  ctx.finishPlans();
  ctx.auditRoots.set(host.id, host);
  ctx.preserved.set(master.id, { id: master.id, purpose: 'Review references existing main component' });
}

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

async function finish(ctx, error) {
  if (!ctx?.ready) return {
    status: 'needs-prerequisites', run: RUN, fileKey: FILE_KEY, pageId: ctx?.page?.id,
    sourceSnapshot: SOURCE, prerequisites: ctx?.prerequisites ?? [String(error?.message ?? error)],
    createdNodeIds: [], mutatedNodeIds: [], removedNodeIds: [],
  };
  const ledger = encodeAffectedIds(ctx);
  const decoded = decodeAffectedIds(ledger);
  if (decoded.createdNodeIds.length !== ctx.created.size || decoded.mutatedNodeIds.length !== ctx.mutated.size || decoded.removedNodeIds.length !== ctx.removed.size) throw new Error('Lossless ID audit did not round-trip');
  const audits = [...(ctx.auditRoots.size ? ctx.auditRoots.values() : ctx.roots)].map(auditRoot);
  const definitions = {};
  if (RUN.target === 'core' || RUN.target === 'review') {
    const set = ctx.roots[0];
    definitions[set.name] = {
      setId: set.id, properties: props(set), currentVariantCount: set.children.length,
      expectedFinalVariantCount: finalVariantCount(RUN.family),
      variantComposition: PACKS.map((pack, index) => ({ pack: index, ...pack, states: statesFor(RUN.family, pack) })),
      variants: set.children.map(node => ({ id: node.id, name: node.name, width: node.width, height: node.height })),
    };
  }
  const result = {
    status: error ? 'partial-reconciliation-needs-review' : RUN.action === 'apply' ? (audits.some(audit => audit.failures.length) ? 'structural-review-needed' : 'reconciled-awaiting-owner-visual-review') : 'read-only-' + RUN.action,
    run: RUN, fileKey: FILE_KEY, pageId: ctx.page.id, sourceSnapshot: SOURCE,
    affectedNodeIds: ledger, preservedNodes: [...ctx.preserved.values()], definitions,
    reviewAudit: {
      roots: audits,
      fontsLoaded: [...ctx.fontSet.values()],
      usedVariableIds: [...ctx.usedVariables].map(([id, name]) => ({ id, name })),
      sourceFidelity: {
        coreSample: 'DataTable title/description/columnVisibility/pageSizeOptions are explicit supported opt-ins.',
        composition: 'Four materials: Flat/Elevated/Glass/Gradient. Comfortable exposes all five DataTable states; Compact exposes Default/Selected. Total 28 DataTable and 16 Table variants; no invented source API or forced full Cartesian matrix.',
        customerFlagship: 'Actual customer block uses search, five visible rows, selection, sorting, row actions and pagination. External filters/actions remain in the existing screen.',
        selectedState: 'Two user-selected rows; no initial selection API is invented.',
        loadingState: 'Five 32px skeletons; no table header or data rows; pagination remains.',
        errorState: 'Early destructive Alert return with retry; table materials/toolbars/pagination are absent.',
        mobile: 'Keep the linked table at full width in the original 328px scrolling viewport.',
        theme: 'Semantic colors remain bound. Glass opacity and effect styles are set to the reviewed Light/Dark mode; refresh a review after changing its theme.',
      },
      screenshotReview: 'Owner must inspect Light/Dark, default/selected/empty/loading/error, column alignment, avatar/email hierarchy, toolbar and Spanish mobile overflow before publishing.',
    },
    warnings: [...new Set(ctx.warnings)],
    ...(error ? { error: String(error.message ?? error), recovery: 'Inspect returned exact IDs, then reconcile the same scope and deterministic names. No source or Code Connect files are modified.' } : {}),
  };
  // Keep every ID. Compact secondary detail only if the MCP result is large.
  if (JSON.stringify(result).length > 17500) {
    result.reviewAudit.usedVariableIds = result.reviewAudit.usedVariableIds.map(variable => variable.id);
    for (const audit of result.reviewAudit.roots) delete audit.headers;
  }
  result.outputCharacterCount = JSON.stringify(result).length;
  return result;
}

let ctx;
try {
  ctx = await context();
  if (!ctx.ready || RUN.action !== 'apply') return await finish(ctx);
  if (RUN.target === 'core') await core(ctx);
  else if (RUN.target === 'blocks') await blocks(ctx);
  else if (RUN.target === 'customers') await customers(ctx);
  else if (RUN.target === 'suite') await suite(ctx);
  else await review(ctx);
  return await finish(ctx);
} catch (error) {
  return await finish(ctx, error);
}
