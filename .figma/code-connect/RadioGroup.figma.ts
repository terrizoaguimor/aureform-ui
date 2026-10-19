// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-44
// source=src/components/ui/radio-group.tsx
// component=RadioGroup
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Disabled": "Disabled"});
const label = instance.getString("Label#15:0");
const imports = [...new Set([...["import { RadioGroup, RadioGroupItem } from \"@/components/ui/radio-group\";"], ...nestedImports])];
export default {
  example: figma.code`<RadioGroup aria-label="Plan" defaultValue="starter" disabled={${state === "Disabled"}}><label className="flex items-center gap-2"><RadioGroupItem value="starter" />{${JSON.stringify(label)}}</label><label className="flex items-center gap-2"><RadioGroupItem value="team" />Team</label></RadioGroup>`,
  id: "aureform-radio-group",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "RadioGroup", "node": "15:44", "source": "src/components/ui/radio-group.tsx", "sourceExport": "RadioGroup", "axes": {"State": ["Default", "Disabled"]}, "mappedProperties": [{"property": "Label#15:0", "type": "TEXT", "codeTarget": "RadioGroupItem visible children"}, {"property": "State", "type": "VARIANT", "codeTarget": "disabled", "options": {"Default": "Default", "Disabled": "Disabled"}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["Plan IDs and the second option are explicit source fixtures, not native properties."], "imports": imports, "nativePropertyValues": { "State": state, "Label#15:0": label }} },
};
