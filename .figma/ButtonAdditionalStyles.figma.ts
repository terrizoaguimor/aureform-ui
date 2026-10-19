// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=25-700
// source=src/components/ui/button.tsx
// component=Button
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const variant = instance.getEnum("Style", {"Secondary": "secondary", "Destructive": "destructive", "Link": "link"});
const size = instance.getEnum("Size", {"Small": "sm", "Medium": "default", "Large": "lg"});
const state = instance.getEnum("State", {"Default": "Default", "Hover": "Hover", "Disabled": "Disabled"});
const label = instance.getString("Label#25:8");
const iconsInstances = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-icon-arrow-up-right" || child.codeConnectId() === "aureform-icon-plus");
let iconsCode = figma.code``;
for (const child of iconsInstances) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    if (result.example.length) iconsCode = figma.code`${iconsCode}{${result.example}}`;
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}
const imports = [...new Set([...["import { Button } from \"@/components/ui/button\";"], ...nestedImports])];
export default {
  example: figma.code`<Button variant="${variant}" size="${size}" disabled={${state === "Disabled"}}>${iconsCode}{${JSON.stringify(label)}}</Button>`,
  id: "aureform-button-additional-styles",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Button / Additional styles", "node": "25:700", "source": "src/components/ui/button.tsx", "sourceExport": "Button", "axes": {"Style": ["Secondary", "Destructive", "Link"], "Size": ["Small", "Medium", "Large"], "State": ["Default", "Hover", "Disabled"]}, "mappedProperties": [{"property": "Style", "type": "VARIANT", "codeTarget": "variant", "options": {"Secondary": "secondary", "Destructive": "destructive", "Link": "link"}}, {"property": "Size", "type": "VARIANT", "codeTarget": "size", "options": {"Small": "sm", "Medium": "default", "Large": "lg"}}, {"property": "State", "type": "VARIANT", "codeTarget": "disabled (Disabled); CSS pointer hover (Hover)", "options": {"Default": "Default", "Hover": "Hover", "Disabled": "Disabled"}}, {"property": "Label#25:8", "type": "TEXT", "codeTarget": "children"}], "intentionalVisualOnly": [{"property": "State", "values": ["Hover"], "reason": "Hover is pointer/CSS presentation, not a force-hover source prop."}], "notes": [], "imports": imports, "nativePropertyValues": { "Style": variant, "Size": size, "State": state, "Label#25:8": label }} },
};
