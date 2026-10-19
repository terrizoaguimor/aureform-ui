// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=24-373
// source=src/components/ui/toast.tsx
// component=toast
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Success": "success", "Error": "error", "Loading": "loading"});
const label = instance.getString("Label#24:5");
const imports = [...new Set([...["import { toast, Toaster } from \"@/components/ui/toast\";"], ...nestedImports])];
export default {
  example: figma.code`<><Toaster /><button type="button" onClick={() => { toast.${state}(${JSON.stringify(label)}); }}>Show toast</button></>`,
  id: "aureform-toast",
  imports,
  metadata: { nestable: false, props: {"status": "local-unpublished", "nativeName": "Toast", "node": "24:373", "source": "src/components/ui/toast.tsx", "sourceExport": "toast", "axes": {"State": ["Success", "Error", "Loading"]}, "mappedProperties": [{"property": "Label#24:5", "type": "TEXT", "codeTarget": "toast method message"}, {"property": "State", "type": "VARIANT", "codeTarget": "toast.success/error/loading", "options": {"Success": "success", "Error": "error", "Loading": "loading"}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": ["Toast is a function export, not a Toast React component. This standalone fixture mounts Toaster; omit that mount in an app already providing it."], "imports": imports, "nativePropertyValues": { "State": state, "Label#24:5": label }} },
};
