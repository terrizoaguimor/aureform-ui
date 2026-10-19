// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-531
// source=src/components/ui/empty.tsx
// component=Empty
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Initial": "Initial", "Search": "Search"});
const label = instance.getString("Label#24:19");
const actionsInstances = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-button" || child.codeConnectId() === "aureform-button-additional-styles" || child.codeConnectId() === "aureform-button-loading-icons");
let actionsCode = figma.code``;
for (const child of actionsInstances) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    if (result.example.length) actionsCode = figma.code`${actionsCode}{${result.example}}`;
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}
const imports = [...new Set([...["import { Empty } from \"@/components/ui/empty\";"], ...nestedImports])];
export default {
  example: figma.code`<Empty title={${JSON.stringify(label)}} description={${JSON.stringify(state === "Search" ? "Try another search or clear the filters." : "Create a first item to get started.")}} ${actionsCode.length ? figma.code`action={<>${actionsCode}</>}` : ""} />`,
  id: "aureform-empty",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Empty", "node": "24:531", "source": "src/components/ui/empty.tsx", "sourceExport": "Empty", "axes": {"State": ["Initial", "Search"]}, "mappedProperties": [{"property": "Label#24:19", "type": "TEXT", "codeTarget": "title"}, {"property": "State", "type": "VARIANT", "codeTarget": "description fixture", "options": {"Initial": "Initial", "Search": "Search"}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#24:19": label }} },
};
