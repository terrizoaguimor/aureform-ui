// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-78
// source=src/components/ui/field.tsx
// component=Field
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Error": "Error"});
const label = instance.getString("Label#15:8");
const controlInstance = instance.findConnectedInstance("aureform-input");
let controlCode = figma.code``;
if (controlInstance && controlInstance.type === 'INSTANCE') {
  const result = controlInstance.executeTemplate();
  controlCode = result.example;
  nestedImports.push(...(result.metadata?.props?.imports ?? []));
}
const imports = [...new Set([...["import { Field } from \"@/components/ui/field\";", "import { Input } from \"@/components/ui/input\";"], ...nestedImports])];
export default {
  example: figma.code`<Field label={${JSON.stringify(label)}} error={${state === "Error" ? '"Enter a valid value."': "undefined"}}>${controlCode.length ? figma.code`{${controlCode}}` : figma.code`<Input placeholder="you@company.com" />`}</Field>`,
  id: "aureform-field",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Field", "node": "15:78", "source": "src/components/ui/field.tsx", "sourceExport": "Field", "axes": {"State": ["Default", "Error"]}, "mappedProperties": [{"property": "Label#15:8", "type": "TEXT", "codeTarget": "label"}, {"property": "State", "type": "VARIANT", "codeTarget": "error", "options": {"Default": "Default", "Error": "Error"}}], "intentionalVisualOnly": [], "notes": ["If no connected input is available, a labelled source Input is an explicit local fixture. Field assigns its accessible relationships."], "imports": imports, "nativePropertyValues": { "State": state, "Label#15:8": label }} },
};
