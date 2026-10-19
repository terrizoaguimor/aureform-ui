// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-320
// source=src/components/ui/command.tsx
// component=Command
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Results": "Results", "Empty": "Empty"});
const imports = [...new Set([...["import { Command } from \"@/components/ui/command\";", "import type { CommandItem } from \"@/components/ui/command\";", "import { useState } from \"react\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  function CommandExample() {
    const [open, setOpen] = useState(true);
    const items: CommandItem[] = ${state === "Empty" ? "[]" : figma.code`[{ id: "docs", label: "Read documentation", group: "Workspace", onSelect: () => setOpen(false) }]`};
    return <Command open={open} onOpenChange={setOpen} label="Search actions" placeholder="Search actions…" emptyLabel="No results" items={items} />;
  }
  return <CommandExample />;
})()`,
  id: "aureform-command",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Command", "node": "23:320", "source": "src/components/ui/command.tsx", "sourceExport": "Command", "axes": {"State": ["Results", "Empty"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "items fixture for Results/Empty", "options": {"Results": "Results", "Empty": "Empty"}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
