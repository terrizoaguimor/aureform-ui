// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-387
// source=src/components/ui/tooltip.tsx
// component=Tooltip
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Open": "Open", "Closed": "Closed"});
const triggerInstance = instance.findConnectedInstance("aureform-button");
let triggerCode = figma.code``;
if (triggerInstance && triggerInstance.type === 'INSTANCE') {
  const result = triggerInstance.executeTemplate();
  triggerCode = result.example;
  nestedImports.push(...(result.metadata?.props?.imports ?? []));
}
const imports = [...new Set([...["import { Tooltip, TooltipProvider } from \"@/components/ui/tooltip\";"], ...nestedImports])];
export default {
  example: figma.code`<TooltipProvider><Tooltip content="Helpful context">${triggerCode.length ? figma.code`{${triggerCode}}` : figma.code`<button type="button">Show help</button>`}</Tooltip></TooltipProvider>`,
  id: "aureform-tooltip",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Tooltip", "node": "24:387", "source": "src/components/ui/tooltip.tsx", "sourceExport": "Tooltip", "axes": {"State": ["Open", "Closed"]}, "mappedProperties": [], "intentionalVisualOnly": [{"property": "State", "values": ["Open", "Closed"], "reason": "Tooltip exposes content/children only. Open/Closed require pointer or keyboard interaction."}], "notes": ["Missing local trigger connections use a native HTML button fixture, never a guessed Figma child. TooltipProvider is included for a standalone snippet."], "imports": imports, "nativePropertyValues": { "State": state }} },
};
