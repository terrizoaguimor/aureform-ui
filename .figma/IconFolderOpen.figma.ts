// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=38-1562
// source=lucide-react
// component=FolderOpen
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { FolderOpen } from \"lucide-react\";"], ...nestedImports])];
export default {
  example: figma.code`<FolderOpen aria-hidden="true" />`,
  id: "aureform-icon-folder-open",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "folder-open", "node": "38:1562", "source": "lucide-react", "sourceExport": "FolderOpen", "axes": {}, "mappedProperties": [], "intentionalVisualOnly": [], "notes": ["Source is the installed lucide-react package export, rather than a fictitious local icon module."], "imports": imports, "nativePropertyValues": {  }} },
};
