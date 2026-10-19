// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-437
// source=src/components/ui/dialog.tsx
// component=Dialog
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Open": true, "Destructive": true, "Closed": false});
const label = instance.getString("Label#24:12");
const actionsInstances = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-button" || child.codeConnectId() === "aureform-button-additional-styles" || child.codeConnectId() === "aureform-button-loading-icons");
let actionsCode = figma.code``;
for (const child of actionsInstances) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    if (result.example.length) actionsCode = figma.code`${actionsCode}{${result.example}}`;
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}
const imports = [...new Set([...["import { Dialog, DialogContent, DialogTitle, DialogDescription } from \"@/components/ui/dialog\";"], ...nestedImports])];
export default {
  example: figma.code`<Dialog defaultOpen={${state}}><DialogContent><DialogTitle>{${JSON.stringify(label)}}</DialogTitle><DialogDescription>Review this local example before continuing.</DialogDescription>${actionsCode}</DialogContent></Dialog>`,
  id: "aureform-dialog",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Dialog", "node": "24:437", "source": "src/components/ui/dialog.tsx", "sourceExport": "Dialog", "axes": {"State": ["Open", "Destructive", "Closed"]}, "mappedProperties": [{"property": "Label#24:12", "type": "TEXT", "codeTarget": "DialogTitle children"}, {"property": "State", "type": "VARIANT", "codeTarget": "defaultOpen", "options": {"Open": true, "Destructive": true, "Closed": false}}], "sourceProperties": [], "intentionalVisualOnly": [{"property": "State", "values": ["Destructive"], "reason": "Destructive is a visual/action treatment; Dialog has no destructive variant prop."}], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#24:12": label }} },
};
