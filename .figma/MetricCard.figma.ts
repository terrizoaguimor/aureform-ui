// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=3-160
// source=src/components/blocks/metric-card.tsx
// component=MetricCard
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const trend = instance.getEnum("Trend", {"Positive": "up", "Negative": "down"});
const label = instance.getString("Label#3:105");
const value = instance.getString("Value#3:108");
const imports = [...new Set([...["import { MetricCard } from \"@/components/blocks/metric-card\";"], ...nestedImports])];
export default {
  example: figma.code`<MetricCard label={${JSON.stringify(label)}} value={${JSON.stringify(value)}} trend="${trend}" change="12.8%" note="Compared with previous period" series={[8, 12, 11, 18, 24]} />`,
  id: "aureform-metric-card",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "MetricCard", "node": "3:160", "source": "src/components/blocks/metric-card.tsx", "sourceExport": "MetricCard", "axes": {"Trend": ["Positive", "Negative"]}, "mappedProperties": [{"property": "Label#3:105", "type": "TEXT", "codeTarget": "label"}, {"property": "Value#3:108", "type": "TEXT", "codeTarget": "value"}, {"property": "Trend", "type": "VARIANT", "codeTarget": "trend", "options": {"Positive": "up", "Negative": "down"}}], "intentionalVisualOnly": [], "notes": ["Mapped to the native Core node; change/note/series are labelled local fixtures. No duplicate block node is invented."], "imports": imports, "nativePropertyValues": { "Trend": trend, "Label#3:105": label, "Value#3:108": value }} },
};
