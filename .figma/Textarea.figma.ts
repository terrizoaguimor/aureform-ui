// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-67
// source=src/components/ui/textarea.tsx
// component=Textarea
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Focus": "Focus", "Error": "Error", "Disabled": "Disabled"});
const label = instance.getString("Label#15:3");
const imports = [...new Set([...["import { Textarea } from \"@/components/ui/textarea\";"], ...nestedImports])];
export default {
  example: figma.code`<Textarea aria-label="Description" placeholder={${JSON.stringify(label)}} disabled={${state === "Disabled"}} aria-invalid={${state === "Error"}} />`,
  id: "aureform-textarea",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Textarea", "node": "15:67", "source": "src/components/ui/textarea.tsx", "sourceExport": "Textarea", "axes": {"State": ["Default", "Focus", "Error", "Disabled"]}, "mappedProperties": [{"property": "Label#15:3", "type": "TEXT", "codeTarget": "placeholder"}, {"property": "State", "type": "VARIANT", "codeTarget": "disabled; aria-invalid", "options": {"Default": "Default", "Focus": "Focus", "Error": "Error", "Disabled": "Disabled"}}], "intentionalVisualOnly": [{"property": "State", "values": ["Focus"], "reason": "Focus is interactive CSS presentation."}], "notes": ["The native text is mapped as visual placeholder text. The accessible name is an independent local fixture."], "imports": imports, "nativePropertyValues": { "State": state, "Label#15:3": label }} },
};
