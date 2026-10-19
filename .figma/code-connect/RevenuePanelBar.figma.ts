// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=38-1736
// source=src/components/blocks/revenue-panel.tsx
// component=RevenuePanel
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
const chartInstance = instance.findConnectedInstance("aureform-chart");
let chartCode = figma.code``;
if (chartInstance && chartInstance.type === 'INSTANCE') {
  const result = chartInstance.executeTemplate();
  chartCode = result.example;
  nestedImports.push(...(result.metadata?.props?.imports ?? []));
}
const chartProps = chartInstance && chartInstance.type === "INSTANCE" ? chartInstance.executeTemplate().metadata?.props : undefined;
const imports = [...new Set([...["import { RevenuePanel } from \"@/components/blocks/revenue-panel\";"], ...nestedImports])];
export default {
  example: figma.code`<RevenuePanel title="Revenue overview" description="Current and previous periods" label={${JSON.stringify(chartProps?.chartLabel ?? "Revenue by month")}} valueLabel="Revenue" secondaryLabel="Previous" kind="${chartProps?.chartKind ?? "bar"}" data={${JSON.stringify(chartProps?.chartData ?? [{ label: "May", value: 28000, secondary: 24000 }, { label: "June", value: 34000, secondary: 28000 }])}} ${actionsCode.length ? figma.code`actions={<>${actionsCode}</>}` : ""} />`,
  id: "aureform-revenue-panel-bar",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "RevenuePanel / Bar", "node": "38:1736", "source": "src/components/blocks/revenue-panel.tsx", "sourceExport": "RevenuePanel", "axes": {}, "mappedProperties": [], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["This native Bar master has no reported component-property keys or axes. Without connected Chart metadata the example uses kind=\"bar\"; a connected Chart supplies its actual kind, label and data. Required source props are explicit local fixtures, never invented Figma properties."], "imports": imports, "nativePropertyValues": {  }} },
};
