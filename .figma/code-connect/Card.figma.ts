// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-335
// source=src/components/ui/card.tsx
// component=Card
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "With actions": "With actions"});
const label = instance.getString("Label#23:11");
const actionsInstances = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-button" || child.codeConnectId() === "aureform-button-additional-styles" || child.codeConnectId() === "aureform-button-loading-icons");
let actionsCode = figma.code``;
for (const child of actionsInstances) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    if (result.example.length) actionsCode = figma.code`${actionsCode}{${result.example}}`;
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}
const imports = [...new Set([...["import { Card, CardHeader, CardTitle, CardContent, CardFooter } from \"@/components/ui/card\";"], ...nestedImports])];
export default {
  example: figma.code`<Card><CardHeader><CardTitle>{${JSON.stringify(label)}}</CardTitle></CardHeader><CardContent><p>Local card content fixture.</p></CardContent>${state === "With actions" && actionsCode.length ? figma.code`<CardFooter>${actionsCode}</CardFooter>` : ""}</Card>`,
  id: "aureform-card",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Card", "node": "23:335", "source": "src/components/ui/card.tsx", "sourceExport": "Card", "axes": {"State": ["Default", "With actions"]}, "mappedProperties": [{"property": "Label#23:11", "type": "TEXT", "codeTarget": "CardTitle children"}], "sourceProperties": [{"source": "src/components/ui/card.tsx", "export": "Card", "property": "appearance", "type": "CardAppearance", "options": ["flat", "elevated", "glass", "gradient"], "nativeProperty": null, "status": "unreported-on-this-native-node"}], "intentionalVisualOnly": [{"property": "State", "values": ["Default", "With actions"], "reason": "With actions controls composition, not a Card state prop. Source children are dynamically resolved."}], "notes": ["The source supports appearance: CardAppearance. No Appearance axis is recorded for this native node, so no native property or appearance value is invented."], "imports": imports, "nativePropertyValues": { "State": state, "Label#23:11": label }} },
};
