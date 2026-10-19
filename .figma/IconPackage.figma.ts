// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=38-1565
// source=lucide-react
// component=Package
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { Package } from \"lucide-react\";"], ...nestedImports])];
export default {
  example: figma.code`<Package aria-hidden="true" />`,
  id: "aureform-icon-package",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "package", "node": "38:1565", "source": "lucide-react", "sourceExport": "Package", "axes": {}, "mappedProperties": [], "intentionalVisualOnly": [], "notes": ["Source is the installed lucide-react package export, rather than a fictitious local icon module."], "imports": imports, "nativePropertyValues": {  }} },
};
