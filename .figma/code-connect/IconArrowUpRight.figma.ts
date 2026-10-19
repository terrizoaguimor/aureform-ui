// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-2
// source=lucide-react
// component=ArrowUpRight
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { ArrowUpRight } from \"lucide-react\";"], ...nestedImports])];
export default {
  example: figma.code`<ArrowUpRight aria-hidden="true" />`,
  id: "aureform-icon-arrow-up-right",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "ArrowUpRight", "node": "3:2", "source": "lucide-react", "sourceExport": "ArrowUpRight", "axes": {}, "mappedProperties": [], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["Source is the installed lucide-react package export, rather than a fictitious local icon module."], "imports": imports, "nativePropertyValues": {  }} },
};
