// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-113
// source=src/components/ui/button.tsx
// component=Button
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const variant = instance.getEnum("Style", {"Primary": "default", "Outline": "outline", "Ghost": "ghost"});
const size = instance.getEnum("Size", {"Small": "sm", "Medium": "default", "Large": "lg"});
const state = instance.getEnum("State", {"Default": "Default", "Hover": "Hover", "Disabled": "Disabled"});
const label = instance.getString("Label#3:0");
const showIcon = instance.getBoolean("Show icon#3:28");
const iconInstance = showIcon ? instance.getInstanceSwap("Icon#3:56") : null;
let iconCode = figma.code``;
if (iconInstance && iconInstance.type === 'INSTANCE') {
  const result = iconInstance.executeTemplate();
  iconCode = result.example;
  nestedImports.push(...(result.metadata?.props?.imports ?? []));
}
const imports = [...new Set([...["import { Button } from \"@/components/ui/button\";"], ...nestedImports])];
export default {
  example: figma.code`<Button variant="${variant}" size="${size}" disabled={${state === "Disabled"}}>${iconCode}{${JSON.stringify(label)}}</Button>`,
  id: "aureform-button",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Button", "node": "3:113", "source": "src/components/ui/button.tsx", "sourceExport": "Button", "axes": {"Style": ["Primary", "Outline", "Ghost"], "Size": ["Small", "Medium", "Large"], "State": ["Default", "Hover", "Disabled"]}, "mappedProperties": [{"property": "Style", "type": "VARIANT", "codeTarget": "variant", "options": {"Primary": "default", "Outline": "outline", "Ghost": "ghost"}}, {"property": "Size", "type": "VARIANT", "codeTarget": "size", "options": {"Small": "sm", "Medium": "default", "Large": "lg"}}, {"property": "State", "type": "VARIANT", "codeTarget": "disabled (Disabled); CSS pointer hover (Hover)", "options": {"Default": "Default", "Hover": "Hover", "Disabled": "Disabled"}}, {"property": "Label#3:0", "type": "TEXT", "codeTarget": "children"}, {"property": "Show icon#3:28", "type": "BOOLEAN", "codeTarget": "conditional children"}, {"property": "Icon#3:56", "type": "INSTANCE_SWAP", "codeTarget": "children"}], "intentionalVisualOnly": [{"property": "State", "values": ["Hover"], "reason": "Hover is pointer/CSS presentation, not a force-hover source prop."}], "notes": [], "imports": imports, "nativePropertyValues": { "Style": variant, "Size": size, "State": state, "Label#3:0": label, "Show icon#3:28": showIcon }} },
};
