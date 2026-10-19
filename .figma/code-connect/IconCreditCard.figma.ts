// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=38-1576
// source=lucide-react
// component=CreditCard
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { CreditCard } from \"lucide-react\";"], ...nestedImports])];
export default {
  example: figma.code`<CreditCard aria-hidden="true" />`,
  id: "aureform-icon-credit-card",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "credit-card", "node": "38:1576", "source": "lucide-react", "sourceExport": "CreditCard", "axes": {}, "mappedProperties": [], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["Source is the installed lucide-react package export, rather than a fictitious local icon module."], "imports": imports, "nativePropertyValues": {  }} },
};
