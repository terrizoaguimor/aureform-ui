// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-21
// source=src/components/ui/switch.tsx
// component=Switch
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Off": "Off", "On": "On", "Disabled": "Disabled"});
const imports = [...new Set([...["import { Switch } from \"@/components/ui/switch\";"], ...nestedImports])];
export default {
  example: figma.code`<Switch aria-label="Weekly summary" defaultChecked={${state === "On"}} disabled={${state === "Disabled"}} />`,
  id: "aureform-switch",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Switch", "node": "15:21", "source": "src/components/ui/switch.tsx", "sourceExport": "Switch", "axes": {"State": ["Off", "On", "Disabled"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "defaultChecked; disabled", "options": {"Off": "Off", "On": "On", "Disabled": "Disabled"}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
