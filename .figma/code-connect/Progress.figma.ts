// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-492
// source=src/components/ui/progress.tsx
// component=Progress
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"64": 64, "0": 0, "100": 100});
const imports = [...new Set([...["import { Progress } from \"@/components/ui/progress\";"], ...nestedImports])];
export default {
  example: figma.code`<Progress value={${state}} max={100} label="Project progress" />`,
  id: "aureform-progress",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Progress", "node": "24:492", "source": "src/components/ui/progress.tsx", "sourceExport": "Progress", "axes": {"State": ["64", "0", "100"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "value", "options": {"64": 64, "0": 0, "100": 100}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
