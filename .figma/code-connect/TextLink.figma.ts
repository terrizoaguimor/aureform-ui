// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-110
// source=src/components/ui/link.tsx
// component=TextLink
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Hover": "Hover", "Disabled": "Disabled"});
const label = instance.getString("Label#23:0");
const imports = [...new Set([...["import { TextLink } from \"@/components/ui/link\";"], ...nestedImports])];
export default {
  example: figma.code`<TextLink href={${state === "Disabled" ? "undefined" : JSON.stringify("/en/docs/")}} aria-disabled={${state === "Disabled"}} tabIndex={${state === "Disabled" ? "-1" : "0"}}>{${JSON.stringify(label)}}</TextLink>`,
  id: "aureform-text-link",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "TextLink", "node": "23:110", "source": "src/components/ui/link.tsx", "sourceExport": "TextLink", "axes": {"State": ["Default", "Hover", "Disabled"]}, "mappedProperties": [{"property": "Label#23:0", "type": "TEXT", "codeTarget": "children"}, {"property": "State", "type": "VARIANT", "codeTarget": "href omission; aria-disabled; tabIndex for Disabled", "options": {"Default": "Default", "Hover": "Hover", "Disabled": "Disabled"}}], "sourceProperties": [], "intentionalVisualOnly": [{"property": "State", "values": ["Hover"], "reason": "Hover is pointer/CSS presentation."}], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#23:0": label }} },
};
