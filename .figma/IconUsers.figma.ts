// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=9-18
// source=src/components/design-icon.tsx
// component=DesignIcon
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { DesignIcon } from \"@/components/design-icon\";"], ...nestedImports])];
export default {
  example: figma.code`<DesignIcon name="users" />`,
  id: "aureform-icon-users",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Users", "node": "9:18", "source": "src/components/design-icon.tsx", "sourceExport": "DesignIcon", "axes": {}, "mappedProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": {  }} },
};
