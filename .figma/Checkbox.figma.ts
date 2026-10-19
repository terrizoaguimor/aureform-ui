// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-14
// source=src/components/ui/checkbox.tsx
// component=Checkbox
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Unchecked": "Unchecked", "Checked": "Checked", "Mixed": "Mixed", "Disabled": "Disabled"});
const imports = [...new Set([...["import { Checkbox } from \"@/components/ui/checkbox\";"], ...nestedImports])];
export default {
  example: figma.code`<Checkbox aria-label="Select item" defaultChecked={${state === "Checked"}} indeterminate={${state === "Mixed"}} disabled={${state === "Disabled"}} />`,
  id: "aureform-checkbox",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Checkbox", "node": "15:14", "source": "src/components/ui/checkbox.tsx", "sourceExport": "Checkbox", "axes": {"State": ["Unchecked", "Checked", "Mixed", "Disabled"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "defaultChecked; indeterminate; disabled", "options": {"Unchecked": "Unchecked", "Checked": "Checked", "Mixed": "Mixed", "Disabled": "Disabled"}}], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
