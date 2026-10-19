// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-124
// source=src/components/ui/combobox.tsx
// component=Combobox
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Closed": "Closed", "Open": "Open", "Empty": "Empty", "Disabled": "Disabled"});
const label = instance.getString("Label#15:15");
const imports = [...new Set([...["import { Combobox } from \"@/components/ui/combobox\";", "import { useState } from \"react\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  function ComboboxExample() {
    const [value, setValue] = useState<string | null>(${state === "Empty" ? "null" : '"native-choice"'});
    return <Combobox label="Framework" placeholder={${JSON.stringify(label)}} options={${state === "Empty" ? "[]" : figma.code`[{ value: "native-choice", label: ${JSON.stringify(label)} }, { value: "next", label: "Next.js" }]`}} value={value} onValueChange={setValue} emptyLabel="No matches" disabled={${state === "Disabled"}} />;
  }
  return <ComboboxExample />;
})()`,
  id: "aureform-combobox",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Combobox", "node": "15:124", "source": "src/components/ui/combobox.tsx", "sourceExport": "Combobox", "axes": {"State": ["Closed", "Open", "Empty", "Disabled"]}, "mappedProperties": [{"property": "Label#15:15", "type": "TEXT", "codeTarget": "options[0].label; placeholder"}, {"property": "State", "type": "VARIANT", "codeTarget": "options/value fixture (Empty); disabled", "options": {"Closed": "Closed", "Open": "Open", "Empty": "Empty", "Disabled": "Disabled"}}], "sourceProperties": [], "intentionalVisualOnly": [{"property": "State", "values": ["Open"], "reason": "Open is internal popup state with no public control prop."}], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#15:15": label }} },
};
