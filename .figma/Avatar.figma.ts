// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-149
// source=src/components/ui/avatar.tsx
// component=Avatar
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const size = instance.getEnum("Size", {"Small": "sm", "Medium": "md", "Large": "lg"});
const initials = instance.getString("Initials#3:101");
const fixtureName = Array.from(initials.trim()).slice(0, 2).join(" ");
const imports = [...new Set([...["import { Avatar } from \"@/components/ui/avatar\";"], ...nestedImports])];
export default {
  example: figma.code`<Avatar name={${JSON.stringify(fixtureName)}} size="${size}" />`,
  id: "aureform-avatar",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Avatar", "node": "3:149", "source": "src/components/ui/avatar.tsx", "sourceExport": "Avatar", "axes": {"Size": ["Small", "Medium", "Large"]}, "mappedProperties": [{"property": "Initials#3:101", "type": "TEXT", "codeTarget": "name fixture derived to preserve up to two initials"}, {"property": "Size", "type": "VARIANT", "codeTarget": "size", "options": {"Small": "sm", "Medium": "md", "Large": "lg"}}], "intentionalVisualOnly": [], "notes": ["Avatar has no initials prop; its name generates at most two initials. The letter-spaced synthetic name is only a preview fixture, not a person's accessible identity."], "imports": imports, "nativePropertyValues": { "Size": size, "Initials#3:101": initials }} },
};
