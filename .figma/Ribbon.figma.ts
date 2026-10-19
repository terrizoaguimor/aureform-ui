// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=25-645
// source=src/components/ui/ribbon.tsx
// component=Ribbon
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Primary": "primary", "Subtle": "subtle", "Warning": "warning"});
const label = instance.getString("Label#25:4");
const imports = [...new Set([...["import { Ribbon } from \"@/components/ui/ribbon\";"], ...nestedImports])];
export default {
  example: figma.code`<Ribbon variant="${state}">{${JSON.stringify(label)}}</Ribbon>`,
  id: "aureform-ribbon",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Ribbon", "node": "25:645", "source": "src/components/ui/ribbon.tsx", "sourceExport": "Ribbon", "axes": {"State": ["Primary", "Subtle", "Warning"]}, "mappedProperties": [{"property": "Label#25:4", "type": "TEXT", "codeTarget": "children"}, {"property": "State", "type": "VARIANT", "codeTarget": "variant", "options": {"Primary": "primary", "Subtle": "subtle", "Warning": "warning"}}], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#25:4": label }} },
};
