// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=97-666
// source=src/components/ui/badge.tsx
// component=Badge
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const appearance = instance.getEnum("Appearance", {"Solid": "solid", "Soft": "soft", "Outline": "outline", "Glass": "glass", "Gradient": "gradient"});
const label = instance.getString("Label#97:16");
const imports = [...new Set([...["import { Badge } from \"@/components/ui/badge\";"], ...nestedImports])];
export default {
  example: figma.code`<Badge appearance="${appearance}">{${JSON.stringify(label)}}</Badge>`,
  id: "aureform-badge-appearance",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Badge / Appearance", "node": "97:666", "source": "src/components/ui/badge.tsx", "sourceExport": "Badge", "axes": {"Appearance": ["Solid", "Soft", "Outline", "Glass", "Gradient"]}, "mappedProperties": [{"property": "Appearance", "type": "VARIANT", "codeTarget": "appearance", "options": {"Solid": "solid", "Soft": "soft", "Outline": "outline", "Glass": "glass", "Gradient": "gradient"}}, {"property": "Label#97:16", "type": "TEXT", "codeTarget": "children"}], "sourceProperties": [{"source": "src/components/ui/badge.tsx", "export": "Badge", "property": "appearance", "type": "BadgeAppearance", "options": ["solid", "soft", "outline", "glass", "gradient"], "nativeProperty": "Appearance", "status": "mapped-native-axis"}], "intentionalVisualOnly": [], "notes": ["Children and source defaults absent from the native ledger are explicit local fixtures, not inferred production content."], "imports": imports, "nativePropertyValues": { "Appearance": appearance, "Label#97:16": label }} },
};
