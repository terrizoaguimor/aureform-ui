// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-363
// source=src/components/ui/alert.tsx
// component=Alert
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Info": "info", "Success": "success", "Warning": "warning", "Destructive": "destructive"});
const label = instance.getString("Label#24:0");
const imports = [...new Set([...["import { Alert } from \"@/components/ui/alert\";"], ...nestedImports])];
export default {
  example: figma.code`<Alert title={${JSON.stringify(label)}} variant="${state}">Local feedback detail.</Alert>`,
  id: "aureform-alert",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Alert", "node": "24:363", "source": "src/components/ui/alert.tsx", "sourceExport": "Alert", "axes": {"State": ["Info", "Success", "Warning", "Destructive"]}, "mappedProperties": [{"property": "Label#24:0", "type": "TEXT", "codeTarget": "title"}, {"property": "State", "type": "VARIANT", "codeTarget": "variant", "options": {"Info": "info", "Success": "success", "Warning": "warning", "Destructive": "destructive"}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#24:0": label }} },
};
