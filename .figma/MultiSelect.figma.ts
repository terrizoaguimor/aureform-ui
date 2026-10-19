// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-150
// source=src/components/ui/multi-select.tsx
// component=MultiSelect
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Empty": "Empty", "Selected": "Selected", "Open": "Open", "Disabled": "Disabled"});
const label = instance.getString("Label#15:20");
const imports = [...new Set([...["import { MultiSelect } from \"@/components/ui/multi-select\";", "import { useState } from \"react\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  function MultiSelectExample() {
    const [values, setValues] = useState<string[]>(${state === "Empty" ? "[]" : '["native-choice"]'});
    return <MultiSelect label="Tools" placeholder={${JSON.stringify(label)}} options={[{ value: "native-choice", label: ${JSON.stringify(label)} }, { value: "next", label: "Next.js" }]} value={values} onValueChange={setValues} />;
  }
  return <MultiSelectExample />;
})()`,
  id: "aureform-multi-select",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "MultiSelect", "node": "15:150", "source": "src/components/ui/multi-select.tsx", "sourceExport": "MultiSelect", "axes": {"State": ["Empty", "Selected", "Open", "Disabled"]}, "mappedProperties": [{"property": "Label#15:20", "type": "TEXT", "codeTarget": "options[0].label; placeholder"}, {"property": "State", "type": "VARIANT", "codeTarget": "value fixture for Empty/Selected/Open", "options": {"Empty": "Empty", "Selected": "Selected", "Open": "Open", "Disabled": "Disabled"}}], "intentionalVisualOnly": [{"property": "State", "values": ["Open", "Disabled"], "reason": "The source has no disabled prop and no public open prop."}], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#15:20": label }} },
};
