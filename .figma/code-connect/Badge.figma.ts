// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-124
// source=src/components/ui/badge.tsx
// component=Badge
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const tone = instance.getEnum("Tone", {"Success": "default", "Neutral": "neutral", "Warning": "warning", "Destructive": "destructive", "Outline": "outline"});
const label = instance.getString("Label#3:84");
const imports = [...new Set([...["import { Badge } from \"@/components/ui/badge\";"], ...nestedImports])];
export default {
  example: figma.code`<Badge variant="${tone}">{${JSON.stringify(label)}}</Badge>`,
  id: "aureform-badge",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Badge", "node": "3:124", "source": "src/components/ui/badge.tsx", "sourceExport": "Badge", "axes": {"Tone": ["Success", "Neutral", "Warning", "Destructive", "Outline"]}, "mappedProperties": [{"property": "Tone", "type": "VARIANT", "codeTarget": "variant", "options": {"Success": "default", "Neutral": "neutral", "Warning": "warning", "Destructive": "destructive", "Outline": "outline"}}, {"property": "Label#3:84", "type": "TEXT", "codeTarget": "children"}], "sourceProperties": [{"source": "src/components/ui/badge.tsx", "export": "Badge", "property": "appearance", "type": "BadgeAppearance", "options": ["solid", "soft", "outline", "glass", "gradient"], "nativeProperty": null, "status": "unreported-on-this-native-node"}], "intentionalVisualOnly": [], "notes": ["The source supports appearance: BadgeAppearance. No Appearance axis is recorded for this native node, so no native property or appearance value is invented."], "imports": imports, "nativePropertyValues": { "Tone": tone, "Label#3:84": label }} },
};
