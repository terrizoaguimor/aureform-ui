// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-53
// source=src/components/ui/slider.tsx
// component=Slider
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Default": "Default", "Disabled": "Disabled"});
const imports = [...new Set([...["import { Slider } from \"@/components/ui/slider\";", "import { useState } from \"react\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  function SliderExample() {
    const [value, setValue] = useState(64);
    return <Slider label="Intensity" value={value} onValueChange={setValue} disabled={${state === "Disabled"}} min={0} max={100} />;
  }
  return <SliderExample />;
})()`,
  id: "aureform-slider",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Slider", "node": "15:53", "source": "src/components/ui/slider.tsx", "sourceExport": "Slider", "axes": {"State": ["Default", "Disabled"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "disabled", "options": {"Default": "Default", "Disabled": "Disabled"}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
