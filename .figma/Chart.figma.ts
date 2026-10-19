// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-501
// source=src/components/ui/chart.tsx
// component=Chart
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const kind = instance.getEnum("Kind", {"Area": "area", "Line": "line", "Bar": "bar", "Donut": "pie", "Radar": "radar", "Radial": "radial"});
const label = instance.getString("Label#23:14");
const data = [{ label: "May", value: 28, secondary: 24 }, { label: "June", value: 34, secondary: 28 }, { label: "July", value: 42, secondary: 31 }];
const imports = [...new Set([...["import { Chart } from \"@/components/ui/chart\";"], ...nestedImports])];
export default {
  example: figma.code`<Chart kind="${kind}" label={${JSON.stringify(label)}} valueLabel="Revenue" secondaryLabel="Previous" data={${JSON.stringify(data)}} />`,
  id: "aureform-chart",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Chart", "node": "23:501", "source": "src/components/ui/chart.tsx", "sourceExport": "Chart", "axes": {"Kind": ["Area", "Line", "Bar", "Donut", "Radar", "Radial"]}, "mappedProperties": [{"property": "Label#23:14", "type": "TEXT", "codeTarget": "label"}, {"property": "Kind", "type": "VARIANT", "codeTarget": "kind", "options": {"Area": "area", "Line": "line", "Bar": "bar", "Donut": "pie", "Radar": "radar", "Radial": "radial"}}], "intentionalVisualOnly": [], "notes": ["Chart data is an explicit fixture, not reconstructed from plotted pixels. Native Donut maps to the source pie kind."], "imports": imports, "nativePropertyValues": { "Kind": kind, "Label#23:14": label }, "chartData": data, "chartKind": kind, "chartLabel": label} },
};
