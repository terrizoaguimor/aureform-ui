// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=6-118
// source=src/components/blocks/ai-composer.tsx
// component=AIComposer
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const imports = [...new Set([...["import { AIComposer } from \"@/components/blocks/ai-composer\";", "import { useState } from \"react\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  function AIComposerExample() {
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("balanced");
    const [pending, setPending] = useState(false);
    return <AIComposer prompt={prompt} onPromptChange={setPrompt} model={model} onModelChange={setModel} pending={pending} onSend={() => setPending(true)} onCancel={() => setPending(false)} onAttach={(file) => setPrompt((current) => current + "\\nAttached local file: " + file.name)} labels={{ placeholder: "Describe your idea…", input: "Prompt", send: "Send", stop: "Stop", model: "Model", attach: "Attach file", balanced: "Balanced", precise: "Precise", creative: "Creative", attached: "Attached" }} />;
  }
  return <AIComposerExample />;
})()`,
  id: "aureform-ai-composer",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "AIComposer", "node": "6:118", "source": "src/components/blocks/ai-composer.tsx", "sourceExport": "AIComposer", "axes": {}, "mappedProperties": [], "intentionalVisualOnly": [], "notes": ["The ledger exposes a native node but no component-property keys or axes for this block. Required source props are explicit local fixtures, never invented Figma properties."], "imports": imports, "nativePropertyValues": {  }} },
};
