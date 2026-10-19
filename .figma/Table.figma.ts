// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-355
// source=src/components/ui/table.tsx
// component=Table
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Empty": "Empty"});
const imports = [...new Set([...["import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from \"@/components/ui/table\";"], ...nestedImports])];
export default {
  example: figma.code`<Table><caption className="sr-only">Plans</caption><TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Price</TableHead></TableRow></TableHeader><TableBody>${state === "Empty" ? figma.code`<TableRow><TableCell colSpan={2}>No records</TableCell></TableRow>` : figma.code`<TableRow><TableCell>Solo</TableCell><TableCell>$149</TableCell></TableRow>`}</TableBody></Table>`,
  id: "aureform-table",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Table", "node": "23:355", "source": "src/components/ui/table.tsx", "sourceExport": "Table", "axes": {"State": ["Default", "Empty"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "TableBody children fixture for Default/Empty", "options": {"Default": "Default", "Empty": "Empty"}}], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
