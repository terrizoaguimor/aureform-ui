// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=9-43
// source=lucide-react
// component=Plus
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { Plus } from \"lucide-react\";"], ...nestedImports])];
export default {
  example: figma.code`<Plus aria-hidden="true" />`,
  id: "aureform-icon-plus",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Plus", "node": "9:43", "source": "lucide-react", "sourceExport": "Plus", "axes": {}, "mappedProperties": [], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["Source is the installed lucide-react package export, rather than a fictitious local icon module."], "imports": imports, "nativePropertyValues": {  }} },
};
