// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=6-51
// source=src/components/blocks/customer-table.tsx
// component=CustomerTable
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { CustomerTable } from \"@/components/blocks/customer-table\";"], ...nestedImports])];
export default {
  example: figma.code`<CustomerTable data={[{ id: "local-1", name: "Jordan Reed", email: "jordan@studio.demo", plan: "Team", status: "active", amount: 399, joined: "2026-10-18" }]} labels={{ title: "Customers", viewAll: "View all", customer: "Customer", plan: "Plan", status: "Status", amount: "Amount", joined: "Joined", active: "Active", trial: "Trial", paused: "Paused", total: "1 local record" }} viewAllHref="/en/customers/" formatCurrency={(value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)} formatDate={(value) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))} />`,
  id: "aureform-customer-table",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "CustomerTable", "node": "6:51", "source": "src/components/blocks/customer-table.tsx", "sourceExport": "CustomerTable", "axes": {}, "mappedProperties": [], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["The ledger exposes a native node but no component-property keys or axes for this block. Required source props are explicit local fixtures, never invented Figma properties."], "imports": imports, "nativePropertyValues": {  }} },
};
