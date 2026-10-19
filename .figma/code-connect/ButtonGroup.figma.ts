// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-97
// source=src/components/ui/button-group.tsx
// component=ButtonGroup
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Selected": "Selected", "Disabled": "Disabled"});
const childrenInstances = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-button" || child.codeConnectId() === "aureform-button-additional-styles" || child.codeConnectId() === "aureform-button-loading-icons");
let childrenCode = figma.code``;
for (const child of childrenInstances) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    if (result.example.length) childrenCode = figma.code`${childrenCode}{${result.example}}`;
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}
const imports = [...new Set([...["import { ButtonGroup } from \"@/components/ui/button-group\";"], ...nestedImports])];
export default {
  example: figma.code`<ButtonGroup aria-label="View mode">${childrenCode}</ButtonGroup>`,
  id: "aureform-button-group",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "ButtonGroup", "node": "23:97", "source": "src/components/ui/button-group.tsx", "sourceExport": "ButtonGroup", "axes": {"State": ["Default", "Selected", "Disabled"]}, "mappedProperties": [], "sourceProperties": [], "intentionalVisualOnly": [{"property": "State", "values": ["Default", "Selected", "Disabled"], "reason": "Selected/Disabled belong to child buttons; ButtonGroup is a div and has no selected or disabled prop. Child templates preserve their own states."}], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
