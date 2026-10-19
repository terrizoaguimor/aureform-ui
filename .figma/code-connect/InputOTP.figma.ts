// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-387
// source=src/components/ui/input-otp.tsx
// component=InputOTP
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Empty": "Empty", "Filled": "Filled", "Error": "Error", "Disabled": "Disabled"});
const label = instance.getString("Label#15:31");
const imports = [...new Set([...["import { InputOTP } from \"@/components/ui/input-otp\";", "import { useState } from \"react\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  function InputOTPExample() {
    const [code, setCode] = useState(${state === "Empty" || state === "Disabled" ? '""' : state === "Error" ? '"123"' : '"123456"'});
    return <InputOTP label="Verification code" length={6} value={code} onChange={setCode} invalid={${state === "Error"}} disabled={${state === "Disabled"}} />;
  }
  return <InputOTPExample />;
})()`,
  id: "aureform-input-otp",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "InputOTP", "node": "15:387", "source": "src/components/ui/input-otp.tsx", "sourceExport": "InputOTP", "axes": {"State": ["Empty", "Filled", "Error", "Disabled"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "declared value fixture; invalid; disabled", "options": {"Empty": "Empty", "Filled": "Filled", "Error": "Error", "Disabled": "Disabled"}}], "sourceProperties": [], "intentionalVisualOnly": [{"property": "Label#15:31", "reason": "Native Label controls the first visual digit only. It must not become the accessible label or a six-digit source value."}], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#15:31": label }} },
};
