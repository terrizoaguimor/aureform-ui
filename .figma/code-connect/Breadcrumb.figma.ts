// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-119
// source=src/components/ui/breadcrumb.tsx
// component=Breadcrumb
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Long labels": "Long labels"});
const imports = [...new Set([...["import { Breadcrumb } from \"@/components/ui/breadcrumb\";"], ...nestedImports])];
export default {
  example: figma.code`<Breadcrumb label="Breadcrumb" items={[{ label: "Workspace", href: "/en/dashboard/" }, { label: ${JSON.stringify(state === "Long labels" ? "A long project name for an ambitious product" : "Customers")} }]} />`,
  id: "aureform-breadcrumb",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Breadcrumb", "node": "23:119", "source": "src/components/ui/breadcrumb.tsx", "sourceExport": "Breadcrumb", "axes": {"State": ["Default", "Long labels"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "items fixture for Default/Long labels", "options": {"Default": "Default", "Long labels": "Long labels"}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
