// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-537
// source=src/components/ui/accordion.tsx
// component=Accordion
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Expanded": true, "Collapsed": false});
const label = instance.getString("Label#24:22");
const imports = [...new Set([...["import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from \"@/components/ui/accordion\";"], ...nestedImports])];
export default {
  example: figma.code`<Accordion defaultValue={${state ? '["details"]' : "[]"}}><AccordionItem value="details"><AccordionTrigger>{${JSON.stringify(label)}}</AccordionTrigger><AccordionContent>Source, tokens and local examples.</AccordionContent></AccordionItem></Accordion>`,
  id: "aureform-accordion",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Accordion", "node": "24:537", "source": "src/components/ui/accordion.tsx", "sourceExport": "Accordion", "axes": {"State": ["Expanded", "Collapsed"]}, "mappedProperties": [{"property": "Label#24:22", "type": "TEXT", "codeTarget": "AccordionTrigger children"}, {"property": "State", "type": "VARIANT", "codeTarget": "defaultValue fixture", "options": {"Expanded": true, "Collapsed": false}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#24:22": label }} },
};
