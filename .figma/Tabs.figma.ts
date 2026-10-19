// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-217
// source=src/components/ui/tabs.tsx
// component=Tabs
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Overview": "Overview", "Details": "Details", "Disabled": "Disabled"});
const label = instance.getString("Label#23:4");
const imports = [...new Set([...["import { Tabs, TabsList, TabsTrigger, TabsContent } from \"@/components/ui/tabs\";"], ...nestedImports])];
export default {
  example: figma.code`<Tabs defaultValue="${state === "Details" ? "details" : "overview"}"><TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="details" disabled={${state === "Disabled"}}>Details</TabsTrigger></TabsList><TabsContent value="overview"><p>{${JSON.stringify(label)}}</p></TabsContent><TabsContent value="details"><p>{${JSON.stringify(label)}}</p></TabsContent></Tabs>`,
  id: "aureform-tabs",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Tabs", "node": "23:217", "source": "src/components/ui/tabs.tsx", "sourceExport": "Tabs", "axes": {"State": ["Overview", "Details", "Disabled"]}, "mappedProperties": [{"property": "Label#23:4", "type": "TEXT", "codeTarget": "TabsContent paragraph children"}, {"property": "State", "type": "VARIANT", "codeTarget": "defaultValue; TabsTrigger.disabled", "options": {"Overview": "Overview", "Details": "Details", "Disabled": "Disabled"}}], "intentionalVisualOnly": [], "notes": ["Native Label is CONTENT paragraph text, not a tab name. Overview/Details trigger names are explicit source fixtures."], "imports": imports, "nativePropertyValues": { "State": state, "Label#23:4": label }} },
};
