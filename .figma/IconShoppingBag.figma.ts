// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=38-1571
// source=lucide-react
// component=ShoppingBag
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { ShoppingBag } from \"lucide-react\";"], ...nestedImports])];
export default {
  example: figma.code`<ShoppingBag aria-hidden="true" />`,
  id: "aureform-icon-shopping-bag",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "shopping-bag", "node": "38:1571", "source": "lucide-react", "sourceExport": "ShoppingBag", "axes": {}, "mappedProperties": [], "intentionalVisualOnly": [], "notes": ["Source is the installed lucide-react package export, rather than a fictitious local icon module."], "imports": imports, "nativePropertyValues": {  }} },
};
