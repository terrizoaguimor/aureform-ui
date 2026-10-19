// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=29-128
// source=src/components/blocks/dashboard-shell.tsx
// component=DashboardShell
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const title = instance.getString("Page title#29:0");
const controlsInstances = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-button" || child.codeConnectId() === "aureform-button-additional-styles" || child.codeConnectId() === "aureform-button-loading-icons" || child.codeConnectId() === "aureform-avatar");
let controlsCode = figma.code``;
for (const child of controlsInstances) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    if (result.example.length) controlsCode = figma.code`${controlsCode}{${result.example}}`;
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}
const imports = [...new Set([...["import { Breadcrumb } from \"@/components/ui/breadcrumb\";"], ...nestedImports])];
export default {
  example: figma.code`<header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-8 py-4"><Breadcrumb label="Breadcrumb" items={[{ label: "Workspace", href: "/en/dashboard/" }, { label: ${JSON.stringify(title)} }]} /><div className="flex items-center gap-2">${controlsCode}</div></header>`,
  id: "aureform-dashboard-header",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "DashboardHeader", "node": "29:128", "source": "src/components/blocks/dashboard-shell.tsx", "sourceExport": "DashboardShell", "axes": {}, "mappedProperties": [{"property": "Page title#29:0", "type": "TEXT", "codeTarget": "Breadcrumb.items[1].label"}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["DashboardHeader is a local composition template name, not an exported React component. The actual header is internal to DashboardShell. Never render this composition again inside DashboardShell children."], "imports": imports, "nativePropertyValues": { "Page title#29:0": title }} },
};
