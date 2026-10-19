// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-282
// source=src/components/ui/sidebar.tsx
// component=Sidebar
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Expanded": false, "Compact": true});
const label = instance.getString("Label#23:8");
const markInstance = instance.findConnectedInstance("aureform-icon-aureform-mark");
let markCode = figma.code``;
if (markInstance && markInstance.type === 'INSTANCE') {
  const result = markInstance.executeTemplate();
  markCode = result.example;
  nestedImports.push(...(result.metadata?.props?.imports ?? []));
}
const links = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-sidebar-item");
let itemCode = figma.code``;
let applicationItemCode = figma.code``;
for (const child of links) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    const link = result.metadata?.props?.sidebarLink;
    if (link) {
      if (result.metadata?.props?.sidebarSection === 'applications') {
        applicationItemCode = figma.code`${applicationItemCode}${link},`;
      } else {
        itemCode = figma.code`${itemCode}${link},`;
      }
    }
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}
const imports = [...new Set([...["import { Sidebar } from \"@/components/ui/sidebar\";"], ...nestedImports])];
export default {
  example: figma.code`<Sidebar label="Main navigation" compact={${state}} brand={<span>${markCode.length ? figma.code`{${markCode}}` : ""}Aureform UI</span>} workspace={<span>{${JSON.stringify(label)}}</span>} groups={[{ label: "Workspace", items: [${itemCode}] }, { label: "Applications", collapsible: true, open: true, items: [${applicationItemCode}] }]} />`,
  id: "aureform-sidebar",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Sidebar", "node": "23:282", "source": "src/components/ui/sidebar.tsx", "sourceExport": "Sidebar", "axes": {"State": ["Expanded", "Compact"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "compact", "options": {"Expanded": false, "Compact": true}}, {"property": "Label#23:8", "type": "TEXT", "codeTarget": "workspace visible text"}], "intentionalVisualOnly": [], "notes": ["The native visible Label becomes workspace text. It is not assumed to be the navigation's accessible name.", "Navigation items come from dynamically executed SidebarItem metadata. No guessed icon or child component fallback is inserted; absent local connections yield an empty group."], "imports": imports, "nativePropertyValues": { "State": state, "Label#23:8": label }} },
};
