// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-443
// source=src/components/ui/data-table.tsx
// component=DataTable
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Selected": "Selected", "Empty": "Empty", "Loading": "Loading", "Error": "Error"});
const appearance = instance.getEnum("Appearance", {"Elevated": "elevated", "Glass": "glass", "Gradient": "gradient", "Flat": "flat"});
const density = instance.getEnum("Density", {"Comfortable": "comfortable", "Compact": "compact"});
const imports = [...new Set([...["import { DataTable } from \"@/components/ui/data-table\";", "import type { ColumnDef } from \"@tanstack/react-table\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  type Row = { id: string; name: string };
  const rows: Row[] = ${state === "Empty" ? "[]" : '[{ id: "local-1", name: "Studio workspace" }]'};
  const columns: ColumnDef<Row>[] = [{ accessorKey: "name", header: "Name" }];
  return <DataTable<Row> data={rows} columns={columns} appearance="${appearance}" density="${density}" selectable pageSize={5} loading={${state === "Loading"}}${state === "Error" ? figma.code` error="Local data fixture could not load." onRetry={() => console.info("Connect retry to your data adapter.")}` : figma.code``} />;
})()`,
  id: "aureform-data-table",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "DataTable", "node": "23:443", "source": "src/components/ui/data-table.tsx", "sourceExport": "DataTable", "axes": {"State": ["Default", "Selected", "Empty", "Loading", "Error"], "Appearance": ["Elevated", "Glass", "Gradient", "Flat"], "Density": ["Comfortable", "Compact"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "data fixture for Empty; loading/error/onRetry for Loading/Error", "options": {"Default": "Default", "Selected": "Selected", "Empty": "Empty", "Loading": "Loading", "Error": "Error"}}, {"property": "Appearance", "type": "VARIANT", "codeTarget": "appearance", "options": {"Elevated": "elevated", "Glass": "glass", "Gradient": "gradient", "Flat": "flat"}}, {"property": "Density", "type": "VARIANT", "codeTarget": "density", "options": {"Comfortable": "comfortable", "Compact": "compact"}}], "sourceProperties": [{"source": "src/components/ui/table.tsx", "export": "DataTable", "property": "appearance", "type": "TableAppearance", "options": ["flat", "elevated", "glass", "gradient"], "nativeProperty": "Appearance", "status": "mapped-native-axis"}, {"source": "src/components/ui/table.tsx", "export": "DataTable", "property": "density", "type": "TableDensity", "options": ["comfortable", "compact"], "nativeProperty": "Density", "status": "mapped-native-axis"}], "intentionalVisualOnly": [{"property": "State", "values": ["Selected"], "reason": "Selection is internal source state. No initial selected-row prop exists; selectable enables real user interaction."}], "notes": ["Rows and error text are explicit local fixtures. The retry callback records the local interaction; replace it with the application's data adapter."], "imports": imports, "nativePropertyValues": { "State": state, "Appearance": appearance, "Density": density }} },
};
