// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=31-1609
// source=src/components/blocks/route-map.tsx
// component=RouteMap
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const caption = instance.getString("Caption#31:50");
const imports = [...new Set([...["import { RouteMap } from \"@/components/blocks/route-map\";"], ...nestedImports])];
export default {
  example: figma.code`<RouteMap selected="all" label="Shipment routes" />`,
  id: "aureform-route-map",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "RouteMap", "node": "31:1609", "source": "src/components/blocks/route-map.tsx", "sourceExport": "RouteMap", "axes": {}, "mappedProperties": [], "sourceProperties": [], "intentionalVisualOnly": [{"property": "Caption#31:50", "reason": "Native Caption is a visual footer, not the source label (accessible map name). Source footer is internal and cannot be controlled with a caption prop."}], "notes": ["The ledger reports no exhaustive variant axes for this application block; selected=all is an explicit local source fixture, not a guessed native variant."], "imports": imports, "nativePropertyValues": { "Caption#31:50": caption }} },
};
