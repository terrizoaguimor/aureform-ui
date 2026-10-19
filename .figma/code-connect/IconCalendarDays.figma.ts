// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=38-1546
// source=lucide-react
// component=CalendarDays
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { CalendarDays } from \"lucide-react\";"], ...nestedImports])];
export default {
  example: figma.code`<CalendarDays aria-hidden="true" />`,
  id: "aureform-icon-calendar-days",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "calendar-days", "node": "38:1546", "source": "lucide-react", "sourceExport": "CalendarDays", "axes": {}, "mappedProperties": [], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["Source is the installed lucide-react package export, rather than a fictitious local icon module."], "imports": imports, "nativePropertyValues": {  }} },
};
