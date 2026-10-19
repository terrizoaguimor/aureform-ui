// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=38-1580
// source=lucide-react
// component=MapPin
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { MapPin } from \"lucide-react\";"], ...nestedImports])];
export default {
  example: figma.code`<MapPin aria-hidden="true" />`,
  id: "aureform-icon-map-pin",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "map-pin", "node": "38:1580", "source": "lucide-react", "sourceExport": "MapPin", "axes": {}, "mappedProperties": [], "intentionalVisualOnly": [], "notes": ["Source is the installed lucide-react package export, rather than a fictitious local icon module."], "imports": imports, "nativePropertyValues": {  }} },
};
