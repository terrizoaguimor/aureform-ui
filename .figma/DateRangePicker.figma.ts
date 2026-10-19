// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-334
// source=src/components/ui/date-picker.tsx
// component=DateRangePicker
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Closed": "Closed", "Open": "Open"});
const label = instance.getString("Label#15:28");
const imports = [...new Set([...["import { DateRangePicker } from \"@/components/ui/date-picker\";", "import { useState } from \"react\";", "import type { DateRange } from \"react-day-picker\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  function DateRangePickerExample() {
    const [value, setValue] = useState<DateRange | undefined>({ from: new Date(2026, 9, 18), to: new Date(2026, 9, 24) });
    return <DateRangePicker label="Choose date range" locale="en" value={value} onChange={setValue} />;
  }
  return <DateRangePickerExample />;
})()`,
  id: "aureform-date-range-picker",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "DateRangePicker", "node": "15:334", "source": "src/components/ui/date-picker.tsx", "sourceExport": "DateRangePicker", "axes": {"State": ["Closed", "Open"]}, "mappedProperties": [], "intentionalVisualOnly": [{"property": "Label#15:28", "reason": "Native Label is formatted display-date text. It is not an accessible label and is not parsed as a Date or DateRange."}, {"property": "State", "values": ["Closed", "Open"], "reason": "Popup open state is internal; the source wrapper exposes no open/defaultOpen prop."}], "notes": ["The date is a declared local fixture independent of the native display string; replace it with product state."], "imports": imports, "nativePropertyValues": { "State": state, "Label#15:28": label }} },
};
