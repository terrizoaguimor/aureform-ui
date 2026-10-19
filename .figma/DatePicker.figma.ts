// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-242
// source=src/components/ui/date-picker.tsx
// component=DatePicker
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Closed": "Closed", "Open": "Open"});
const label = instance.getString("Label#15:25");
const imports = [...new Set([...["import { DatePicker } from \"@/components/ui/date-picker\";", "import { useState } from \"react\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  function DatePickerExample() {
    const [value, setValue] = useState<Date | undefined>(new Date(2026, 9, 18));
    return <DatePicker label="Choose date" locale="en" value={value} onChange={setValue} />;
  }
  return <DatePickerExample />;
})()`,
  id: "aureform-date-picker",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "DatePicker", "node": "15:242", "source": "src/components/ui/date-picker.tsx", "sourceExport": "DatePicker", "axes": {"State": ["Closed", "Open"]}, "mappedProperties": [], "intentionalVisualOnly": [{"property": "Label#15:25", "reason": "Native Label is formatted display-date text. It is not an accessible label and is not parsed as a Date or DateRange."}, {"property": "State", "values": ["Closed", "Open"], "reason": "Popup open state is internal; the source wrapper exposes no open/defaultOpen prop."}], "notes": ["The date is a declared local fixture independent of the native display string; replace it with product state."], "imports": imports, "nativePropertyValues": { "State": state, "Label#15:25": label }} },
};
