// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-133
// source=src/components/ui/input.tsx
// component=Input
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Empty": "Empty", "Focus": "Focus", "Error": "Error", "Disabled": "Disabled"});
const value = instance.getString("Value#3:90");
const imports = [...new Set([...["import { Input } from \"@/components/ui/input\";"], ...nestedImports])];
export default {
  example: figma.code`<Input aria-label="Email" type="email" placeholder={${JSON.stringify(value)}} disabled={${state === "Disabled"}} aria-invalid={${state === "Error"}} />`,
  id: "aureform-input",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Input", "node": "3:133", "source": "src/components/ui/input.tsx", "sourceExport": "Input", "axes": {"State": ["Empty", "Focus", "Error", "Disabled"]}, "mappedProperties": [{"property": "Value#3:90", "type": "TEXT", "codeTarget": "placeholder"}, {"property": "State", "type": "VARIANT", "codeTarget": "disabled; aria-invalid", "options": {"Empty": "Empty", "Focus": "Focus", "Error": "Error", "Disabled": "Disabled"}}], "sourceProperties": [], "intentionalVisualOnly": [{"property": "State", "values": ["Focus"], "reason": "Focus is interactive CSS presentation, not an input prop."}], "notes": ["Native Value is currently the empty input's placeholder. It is never emitted as value or defaultValue."], "imports": imports, "nativePropertyValues": { "State": state, "Value#3:90": value }} },
};
