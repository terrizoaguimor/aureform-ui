// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-142
// source=src/components/ui/sidebar.tsx
// component=Sidebar
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": false, "Active": true});
const label = instance.getString("Label#3:95");
const iconInstance = instance.getInstanceSwap("Icon#3:98");
let iconCode = figma.code``;
if (iconInstance && iconInstance.type === 'INSTANCE') {
  const result = iconInstance.executeTemplate();
  iconCode = result.example;
  nestedImports.push(...(result.metadata?.props?.imports ?? []));
}
const iconProps = iconInstance && iconInstance.type === "INSTANCE" ? iconInstance.executeTemplate().metadata?.props : undefined;
const applicationRoutes: Record<string, string> = {
  'kanban-square': 'tasks', 'calendar-days': 'calendar', mail: 'mail',
  'folder-open': 'files', package: 'products', 'shopping-bag': 'orders',
  'credit-card': 'invoices', 'map-pin': 'maps', 'circle-help': 'support',
};
const nativeIconName = iconProps?.nativeName ?? '';
const applicationRoute = applicationRoutes[nativeIconName];
const sidebarSection = applicationRoute ? 'applications' : 'workspace';
const fixtureHref = applicationRoute ? '/en/' + applicationRoute + '/' : '/en/dashboard/';
const sidebarLink = figma.code`{ label: ${JSON.stringify(label)}, href: ${JSON.stringify(fixtureHref)}, active: ${state}, icon: ${iconCode.length ? figma.code`(${iconCode})` : "undefined"} }`;
const imports = [...new Set([...["import type { SidebarLink } from \"@/components/ui/sidebar\";"], ...nestedImports])];
export default {
  example: figma.code`(${sidebarLink} satisfies SidebarLink)`,
  id: "aureform-sidebar-item",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "SidebarItem", "node": "3:142", "source": "src/components/ui/sidebar.tsx", "sourceExport": "Sidebar", "axes": {"State": ["Default", "Active"]}, "mappedProperties": [{"property": "Label#3:95", "type": "TEXT", "codeTarget": "SidebarLink.label"}, {"property": "State", "type": "VARIANT", "codeTarget": "SidebarLink.active", "options": {"Default": false, "Active": true}}, {"property": "Icon#3:98", "type": "INSTANCE_SWAP", "codeTarget": "icon"}], "intentionalVisualOnly": [], "notes": ["SidebarItem is not an exported source component. This template emits typed SidebarLink data for the exported Sidebar. Application grouping and hrefs are declared fixtures corresponding to source shell routes, derived from executed icon metadata; they are not native href properties."], "imports": imports, "nativePropertyValues": { "State": state, "Label#3:95": label }, "sidebarLink": sidebarLink, "sidebarSection": sidebarSection} },
};
