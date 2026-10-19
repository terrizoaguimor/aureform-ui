// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-403
// source=src/components/ui/popover.tsx
// component=Popover
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Open": true, "Closed": false});
const label = instance.getString("Label#24:9");
const triggerInstance = instance.findConnectedInstance("aureform-button");
let triggerCode = figma.code``;
if (triggerInstance && triggerInstance.type === 'INSTANCE') {
  const result = triggerInstance.executeTemplate();
  triggerCode = result.example;
  nestedImports.push(...(result.metadata?.props?.imports ?? []));
}
const imports = [...new Set([...["import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from \"@/components/ui/popover\";"], ...nestedImports])];
export default {
  example: figma.code`<Popover defaultOpen={${state}}>${triggerCode.length ? figma.code`<PopoverTrigger render={${triggerCode}} />` : figma.code`<PopoverTrigger>Details</PopoverTrigger>`}<PopoverContent><PopoverTitle>{${JSON.stringify(label)}}</PopoverTitle><PopoverDescription>Local contextual content.</PopoverDescription></PopoverContent></Popover>`,
  id: "aureform-popover",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Popover", "node": "24:403", "source": "src/components/ui/popover.tsx", "sourceExport": "Popover", "axes": {"State": ["Open", "Closed"]}, "mappedProperties": [{"property": "Label#24:9", "type": "TEXT", "codeTarget": "PopoverTitle children"}, {"property": "State", "type": "VARIANT", "codeTarget": "defaultOpen", "options": {"Open": true, "Closed": false}}], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#24:9": label }} },
};
