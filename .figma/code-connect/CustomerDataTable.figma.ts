// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=17-18
// source=src/components/blocks/customer-table.tsx
// component=CustomerDataTable
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { CustomerDataTable } from \"@/components/blocks/customer-table\";", "import type { CustomerRecord } from \"@/components/blocks/customer-table\";", "import type { ColumnDef } from \"@tanstack/react-table\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  const data: CustomerRecord[] = [{ id: "local-1", name: "Jordan Reed", email: "jordan@studio.demo", plan: "Team", status: "active", amount: 399, joined: "2026-10-18" }];
  const columns: ColumnDef<CustomerRecord>[] = [{ accessorKey: "name", header: "Customer" }, { accessorKey: "plan", header: "Plan" }, { accessorKey: "amount", header: "Amount" }];
  return <CustomerDataTable data={data} columns={columns} labels={{ search: "Search customers…", empty: "No customers" }} />;
})()`,
  id: "aureform-customer-data-table",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "CustomerDataTable", "node": "17:18", "source": "src/components/blocks/customer-table.tsx", "sourceExport": "CustomerDataTable", "axes": {}, "mappedProperties": [], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["The ledger exposes a native node but no component-property keys or axes for this block. Required source props are explicit local fixtures, never invented Figma properties."], "imports": imports, "nativePropertyValues": {  }} },
};
