// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=34-1492
// source=src/components/blocks/dashboard-shell.tsx
// component=DashboardShell
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const markInstance = instance.findConnectedInstance("aureform-icon-aureform-mark");
let markCode = figma.code``;
if (markInstance && markInstance.type === 'INSTANCE') {
  const result = markInstance.executeTemplate();
  markCode = result.example;
  nestedImports.push(...(result.metadata?.props?.imports ?? []));
}
const controlsInstances = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-button" || child.codeConnectId() === "aureform-button-additional-styles" || child.codeConnectId() === "aureform-button-loading-icons" || child.codeConnectId() === "aureform-avatar");
let controlsCode = figma.code``;
for (const child of controlsInstances) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    if (result.example.length) controlsCode = figma.code`${controlsCode}{${result.example}}`;
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}
const imports = [...new Set([...[], ...nestedImports])];
export default {
  example: figma.code`<header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-8 py-4"><a href="/en/" aria-label="Aureform UI" className="inline-flex items-center gap-2">${markCode.length ? figma.code`{${markCode}}` : ""}<span>Aureform UI</span></a><div className="flex items-center gap-2">${controlsCode}</div></header>`,
  id: "aureform-dashboard-brand-header",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "DashboardBrandHeader", "node": "34:1492", "source": "src/components/blocks/dashboard-shell.tsx", "sourceExport": "DashboardShell", "axes": {}, "mappedProperties": [], "intentionalVisualOnly": [], "notes": ["Standalone source-header composition for brand-based topbar/centered layouts, not an exported DashboardBrandHeader React component. Mark and configurable controls are dynamic children. Never insert this header again into DashboardShell children."], "imports": imports, "nativePropertyValues": {  }} },
};
