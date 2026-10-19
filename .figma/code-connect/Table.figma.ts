// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-355
// source=src/components/ui/table.tsx
// component=Table
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Empty": "Empty"});
const appearance = instance.getEnum("Appearance", {"Elevated": "elevated", "Glass": "glass", "Gradient": "gradient", "Flat": "flat"});
const density = instance.getEnum("Density", {"Comfortable": "comfortable", "Compact": "compact"});
const imports = [...new Set([...["import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from \"@/components/ui/table\";"], ...nestedImports])];
export default {
  example: figma.code`<Table appearance="${appearance}" density="${density}"><caption className="sr-only">Plans</caption><TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Price</TableHead></TableRow></TableHeader><TableBody>${state === "Empty" ? figma.code`<TableRow><TableCell colSpan={2}>No records</TableCell></TableRow>` : figma.code`<TableRow><TableCell>Solo</TableCell><TableCell>$149</TableCell></TableRow>`}</TableBody></Table>`,
  id: "aureform-table",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Table", "node": "23:355", "source": "src/components/ui/table.tsx", "sourceExport": "Table", "axes": {"State": ["Default", "Empty"], "Appearance": ["Elevated", "Glass", "Gradient", "Flat"], "Density": ["Comfortable", "Compact"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "TableBody children fixture for Default/Empty", "options": {"Default": "Default", "Empty": "Empty"}}, {"property": "Appearance", "type": "VARIANT", "codeTarget": "appearance", "options": {"Elevated": "elevated", "Glass": "glass", "Gradient": "gradient", "Flat": "flat"}}, {"property": "Density", "type": "VARIANT", "codeTarget": "density", "options": {"Comfortable": "comfortable", "Compact": "compact"}}], "sourceProperties": [{"source": "src/components/ui/table.tsx", "export": "Table", "property": "appearance", "type": "TableAppearance", "options": ["flat", "elevated", "glass", "gradient"], "nativeProperty": "Appearance", "status": "mapped-native-axis"}, {"source": "src/components/ui/table.tsx", "export": "Table", "property": "density", "type": "TableDensity", "options": ["comfortable", "compact"], "nativeProperty": "Density", "status": "mapped-native-axis"}], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Appearance": appearance, "Density": density }} },
};
