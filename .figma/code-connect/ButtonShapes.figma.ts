// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=176-4598
// source=src/components/ui/button.tsx
// component=Button
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const shape = instance.getEnum("Shape", {"Rounded": "rounded", "Pill": "pill", "Square": "square"});
const size = instance.getEnum("Size", {"Small": "sm", "Medium": "default", "Large": "lg"});
const label = instance.getString("Label#176:0");
const showIcon = instance.getBoolean("Show icon#176:10");
const iconInstance = showIcon ? instance.getInstanceSwap("Icon#176:20") : null;
let iconCode = figma.code``;
if (iconInstance && iconInstance.type === 'INSTANCE') {
  const result = iconInstance.executeTemplate();
  iconCode = result.example;
  nestedImports.push(...(result.metadata?.props?.imports ?? []));
}
const imports = [...new Set([...["import { Button } from \"@/components/ui/button\";"], ...nestedImports])];
export default {
  example: figma.code`<Button shape="${shape}" size="${size}">${iconCode}{${JSON.stringify(label)}}</Button>`,
  id: "aureform-button-shapes",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Button / Shapes", "node": "176:4598", "source": "src/components/ui/button.tsx", "sourceExport": "Button", "axes": {"Shape": ["Rounded", "Pill", "Square"], "Size": ["Small", "Medium", "Large"]}, "mappedProperties": [{"property": "Label#176:0", "type": "TEXT", "codeTarget": "children"}, {"property": "Shape", "type": "VARIANT", "codeTarget": "shape", "options": {"Rounded": "rounded", "Pill": "pill", "Square": "square"}}, {"property": "Size", "type": "VARIANT", "codeTarget": "size", "options": {"Small": "sm", "Medium": "default", "Large": "lg"}}, {"property": "Show icon#176:10", "type": "BOOLEAN", "codeTarget": "conditional children"}, {"property": "Icon#176:20", "type": "INSTANCE_SWAP", "codeTarget": "children"}], "sourceProperties": [{"source": "src/components/ui/button.tsx", "export": "Button", "property": "shape", "type": "ButtonShape", "options": ["rounded", "pill", "square"], "sizeMapping": {"Small": "sm", "Medium": "default", "Large": "lg"}, "nativeProperty": "Shape", "status": "mapped-native-axis"}, {"source": "src/components/ui/button.tsx", "export": "Button", "property": "appearance", "type": "ButtonAppearance", "options": ["solid", "soft", "outline", "glass", "gradient"], "nativeProperty": null, "status": "unreported-on-this-native-node"}], "intentionalVisualOnly": [], "notes": ["The source supports appearance: ButtonAppearance. No Appearance axis is recorded for this native node, so no native property or appearance value is invented.", "Shapes is additive to the existing core, appearance and loading/icon sets. This native set has no Appearance or State axis."], "imports": imports, "nativePropertyValues": { "Shape": shape, "Size": size, "Label#176:0": label, "Show icon#176:10": showIcon }} },
};
