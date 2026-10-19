// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-457
// source=src/components/ui/drawer.tsx
// component=Drawer
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Open": true, "Closed": false});
const label = instance.getString("Label#24:16");
const imports = [...new Set([...["import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from \"@/components/ui/drawer\";"], ...nestedImports])];
export default {
  example: figma.code`<Drawer defaultOpen={${state}}><DrawerContent><DrawerTitle>{${JSON.stringify(label)}}</DrawerTitle><DrawerDescription>Local detail content.</DrawerDescription></DrawerContent></Drawer>`,
  id: "aureform-drawer",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Drawer", "node": "24:457", "source": "src/components/ui/drawer.tsx", "sourceExport": "Drawer", "axes": {"State": ["Open", "Closed"]}, "mappedProperties": [{"property": "Label#24:16", "type": "TEXT", "codeTarget": "DrawerTitle children"}, {"property": "State", "type": "VARIANT", "codeTarget": "defaultOpen", "options": {"Open": true, "Closed": false}}], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#24:16": label }} },
};
