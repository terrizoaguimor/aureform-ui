// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=97-715
// source=src/components/ui/card.tsx
// component=Card
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const appearance = instance.getEnum("Appearance", {"Flat": "flat", "Elevated": "elevated", "Glass": "glass", "Gradient": "gradient"});
const state = instance.getEnum("State", {"Default": "Default", "Hover": "Hover"});
const label = instance.getString("Title#97:22");
const imports = [...new Set([...["import { Card } from \"@/components/ui/card\";", "import { CardHeader, CardTitle, CardContent } from \"@/components/ui/card\";"], ...nestedImports])];
export default {
  example: figma.code`<Card appearance="${appearance}"><CardHeader><CardTitle>{${JSON.stringify(label)}}</CardTitle></CardHeader><CardContent><p>Explicit local content fixture.</p></CardContent></Card>`,
  id: "aureform-card-material",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Card / Material", "node": "97:715", "source": "src/components/ui/card.tsx", "sourceExport": "Card", "axes": {"Appearance": ["Flat", "Elevated", "Glass", "Gradient"], "State": ["Default", "Hover"]}, "mappedProperties": [{"property": "Appearance", "type": "VARIANT", "codeTarget": "appearance", "options": {"Flat": "flat", "Elevated": "elevated", "Glass": "glass", "Gradient": "gradient"}}, {"property": "Title#97:22", "type": "TEXT", "codeTarget": "CardTitle children"}], "sourceProperties": [{"source": "src/components/ui/card.tsx", "export": "Card", "property": "appearance", "type": "CardAppearance", "options": ["flat", "elevated", "glass", "gradient"], "nativeProperty": "Appearance", "status": "mapped-native-axis"}], "intentionalVisualOnly": [{"property": "State", "values": ["Default", "Hover"], "reason": "Card has no forced hover/state prop. Material is mapped through appearance; hover remains interactive CSS presentation."}], "notes": ["Children and source defaults absent from the native ledger are explicit local fixtures, not inferred production content."], "imports": imports, "nativePropertyValues": { "Appearance": appearance, "State": state, "Title#97:22": label }} },
};
