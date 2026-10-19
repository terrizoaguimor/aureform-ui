// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=15-412
// source=src/components/ui/file-upload.tsx
// component=FileUpload
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Empty": "Empty", "Uploaded": "Uploaded", "Error": "Error", "Disabled": "Disabled"});
const label = instance.getString("Label#15:36");
const imports = [...new Set([...["import { FileUpload } from \"@/components/ui/file-upload\";", "import { useState } from \"react\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  function FileUploadExample() {
    const [files, setFiles] = useState<File[]>(${state === "Uploaded" ? 'typeof File === "undefined" ? [] : [new File(["Local fixture"], "brief.txt", { type: "text/plain" })]' : "[]"});
    return <FileUpload files={files} onFilesChange={setFiles} accept=".txt,.pdf,image/*" disabled={${state === "Disabled"}} labels={{ title: ${JSON.stringify(label)}, description: "Drop files here or browse.", browse: "Browse files", remove: "Remove", tooLarge: "File is too large", invalidType: "Unsupported file type" }} />;
  }
  return <FileUploadExample />;
})()`,
  id: "aureform-file-upload",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "FileUpload", "node": "15:412", "source": "src/components/ui/file-upload.tsx", "sourceExport": "FileUpload", "axes": {"State": ["Empty", "Uploaded", "Error", "Disabled"]}, "mappedProperties": [{"property": "Label#15:36", "type": "TEXT", "codeTarget": "labels.title"}, {"property": "State", "type": "VARIANT", "codeTarget": "files fixture for Uploaded; disabled", "options": {"Empty": "Empty", "Uploaded": "Uploaded", "Error": "Error", "Disabled": "Disabled"}}], "sourceProperties": [], "intentionalVisualOnly": [{"property": "State", "values": ["Error"], "reason": "Validation errors are internal and appear after actual file validation; no error prop exists."}], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Label#15:36": label }} },
};
