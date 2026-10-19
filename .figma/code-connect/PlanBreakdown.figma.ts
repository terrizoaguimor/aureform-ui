// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=6-33
// source=src/components/blocks/plan-breakdown.tsx
// component=PlanBreakdown
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const actionsInstances = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-button" || child.codeConnectId() === "aureform-button-additional-styles" || child.codeConnectId() === "aureform-button-loading-icons");
let actionsCode = figma.code``;
for (const child of actionsInstances) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    if (result.example.length) actionsCode = figma.code`${actionsCode}{${result.example}}`;
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}
const imports = [...new Set([...["import { PlanBreakdown } from \"@/components/blocks/plan-breakdown\";"], ...nestedImports])];
export default {
  example: figma.code`<PlanBreakdown title="Plan mix" description="Local distribution fixture" items={[{ name: "Solo", value: "64 accounts", percentage: 64 }, { name: "Team", value: "36 accounts", percentage: 36 }]} ${actionsCode.length ? figma.code`footer={<>${actionsCode}</>}` : ""} />`,
  id: "aureform-plan-breakdown",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "PlanBreakdown", "node": "6:33", "source": "src/components/blocks/plan-breakdown.tsx", "sourceExport": "PlanBreakdown", "axes": {}, "mappedProperties": [], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["The ledger exposes a native node but no component-property keys or axes for this block. Required source props are explicit local fixtures, never invented Figma properties."], "imports": imports, "nativePropertyValues": {  }} },
};
