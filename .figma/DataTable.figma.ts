// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-443
// source=src/components/ui/data-table.tsx
// component=DataTable
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Selected": "Selected", "Empty": "Empty"});
const imports = [...new Set([...["import { DataTable } from \"@/components/ui/data-table\";", "import type { ColumnDef } from \"@tanstack/react-table\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  type Row = { id: string; name: string };
  const rows: Row[] = ${state === "Empty" ? "[]" : '[{ id: "local-1", name: "Studio workspace" }]'};
  const columns: ColumnDef<Row>[] = [{ accessorKey: "name", header: "Name" }];
  return <DataTable<Row> data={rows} columns={columns} selectable pageSize={5} />;
})()`,
  id: "aureform-data-table",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "DataTable", "node": "23:443", "source": "src/components/ui/data-table.tsx", "sourceExport": "DataTable", "axes": {"State": ["Default", "Selected", "Empty"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "data fixture for Empty", "options": {"Default": "Default", "Selected": "Selected", "Empty": "Empty"}}], "intentionalVisualOnly": [{"property": "State", "values": ["Selected"], "reason": "Selection is internal source state. No initial selected-row prop exists; selectable enables real user interaction."}], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
