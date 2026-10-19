// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-98
// source=src/components/ui/select.tsx
// component=Select
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Closed": "Closed", "Open": "Open", "Disabled": "Disabled"});
const label = instance.getString("Label#15:11");
const imports = [...new Set([...["import { Select } from \"@/components/ui/select\";"], ...nestedImports])];
export default {
  example: figma.code`<Select aria-label="Plan" options={[{ value: "native-choice", label: ${JSON.stringify(label)} }, { value: "team", label: "Team" }]} defaultValue="native-choice" disabled={${state === "Disabled"}} />`,
  id: "aureform-select",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Select", "node": "15:98", "source": "src/components/ui/select.tsx", "sourceExport": "Select", "axes": {"State": ["Closed", "Open", "Disabled"]}, "mappedProperties": [{"property": "Label#15:11", "type": "TEXT", "codeTarget": "options[0].label"}, {"property": "State", "type": "VARIANT", "codeTarget": "disabled", "options": {"Closed": "Closed", "Open": "Open", "Disabled": "Disabled"}}], "intentionalVisualOnly": [{"property": "State", "values": ["Open"], "reason": "The wrapper does not expose open/defaultOpen."}], "notes": ["Native display text becomes a labelled fixture option, never an inferred domain value or accessible name."], "imports": imports, "nativePropertyValues": { "State": state, "Label#15:11": label }} },
};
