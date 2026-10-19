// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-480
// source=src/components/ui/dropdown-menu.tsx
// component=DropdownMenu
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Open": "Open", "Disabled": "Disabled"});
const imports = [...new Set([...["import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from \"@/components/ui/dropdown-menu\";"], ...nestedImports])];
export default {
  example: figma.code`<DropdownMenu defaultOpen={${state === "Open"}}><DropdownMenuTrigger disabled={${state === "Disabled"}}>Actions</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={() => { /* Local edit action. */ }}>Edit</DropdownMenuItem></DropdownMenuContent></DropdownMenu>`,
  id: "aureform-dropdown-menu",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "DropdownMenu", "node": "24:480", "source": "src/components/ui/dropdown-menu.tsx", "sourceExport": "DropdownMenu", "axes": {"State": ["Open", "Disabled"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "defaultOpen; DropdownMenuTrigger.disabled", "options": {"Open": "Open", "Disabled": "Disabled"}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
