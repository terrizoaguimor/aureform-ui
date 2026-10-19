// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-501
// source=src/components/ui/spinner.tsx
// component=Spinner
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Small": "text-xs", "Medium": "text-sm"});
const imports = [...new Set([...["import { Spinner } from \"@/components/ui/spinner\";"], ...nestedImports])];
export default {
  example: figma.code`<Spinner label="Loading…" className="${state}" />`,
  id: "aureform-spinner",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Spinner", "node": "24:501", "source": "src/components/ui/spinner.tsx", "sourceExport": "Spinner", "axes": {"State": ["Small", "Medium"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "className text size", "options": {"Small": "text-xs", "Medium": "text-sm"}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["Spinner has no size prop; its source fixes the SVG size. This mapping affects text size only."], "imports": imports, "nativePropertyValues": { "State": state }} },
};
