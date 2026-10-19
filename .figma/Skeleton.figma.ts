// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-512
// source=src/components/ui/skeleton.tsx
// component=Skeleton
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Text": "h-5 w-40", "Card": "h-36 w-full"});
const imports = [...new Set([...["import { Skeleton } from \"@/components/ui/skeleton\";"], ...nestedImports])];
export default {
  example: figma.code`<Skeleton className="${state}" />`,
  id: "aureform-skeleton",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Skeleton", "node": "24:512", "source": "src/components/ui/skeleton.tsx", "sourceExport": "Skeleton", "axes": {"State": ["Text", "Card"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "className", "options": {"Text": "h-5 w-40", "Card": "h-36 w-full"}}], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
