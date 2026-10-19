// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=30-969
// source=src/components/blocks/dashboard-shell.tsx
// component=DashboardShell
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const layout = instance.getEnum("Layout", {"Sidebar": "sidebar", "Compact": "compact", "Topbar": "topbar", "Split": "split", "Centered": "centered", "Floating": "floating"});
const nativeContent = instance.getSlot("Content#30:0");
const pageInstance = instance.findInstance("Page content", {"traverseInstances": true});
let pageCode = figma.code``;
if (pageInstance && pageInstance.type === 'INSTANCE') {
  const result = pageInstance.executeTemplate();
  pageCode = result.example;
  nestedImports.push(...(result.metadata?.props?.imports ?? []));
}
const imports = [...new Set([...["import { DashboardShell } from \"@/components/blocks/dashboard-shell\";", "import { PageHeading } from \"@/components/blocks/page-heading\";"], ...nestedImports])];
export default {
  example: figma.code`<DashboardShell path="dashboard" layout="${layout}">${pageCode.length ? figma.code`{${pageCode}}` : figma.code`<section aria-label="Page content"><PageHeading title="Workspace overview" description="Explicit local body fixture; DashboardShell provides its own header." /><p className="mt-6 text-sm">Replace this body with your product page content.</p></section>`}</DashboardShell>`,
  id: "aureform-dashboard-shell",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "DashboardShell", "node": "30:969", "source": "src/components/blocks/dashboard-shell.tsx", "sourceExport": "DashboardShell", "axes": {"Layout": ["Sidebar", "Compact", "Topbar", "Split", "Centered", "Floating"]}, "mappedProperties": [{"property": "Layout", "type": "VARIANT", "codeTarget": "layout", "options": {"Sidebar": "sidebar", "Compact": "compact", "Topbar": "topbar", "Split": "split", "Centered": "centered", "Floating": "floating"}}], "sourceProperties": [], "intentionalVisualOnly": [{"property": "Content#30:0", "reason": "Content includes source-owned header plus Page content. It is intentionally not forwarded verbatim: DashboardShell already renders header."}], "notes": ["Only a real INSTANCE named Page content can be executed safely through this local lookup. A frame is not coerced into an instance.", "If Page content is not a connected instance, emit an explicit local page-body fixture. Never insert the raw Content slot, DashboardHeader or source chrome into children.", "path=dashboard is a declared source fixture. The actual app requires its existing language/theme/demo providers."], "imports": imports, "nativePropertyValues": { "Layout": layout }, "nativeContentAvailable": Boolean(nativeContent?.length)} },
};
