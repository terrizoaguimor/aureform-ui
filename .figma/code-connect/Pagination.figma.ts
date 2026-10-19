// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=23-183
// source=src/components/ui/pagination.tsx
// component=Pagination
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"First": 1, "Middle": 4, "Last": 8});
const imports = [...new Set([...["import { Pagination } from \"@/components/ui/pagination\";", "import { useState } from \"react\";"], ...nestedImports])];
export default {
  example: figma.code`(() => {
  function PaginationExample() {
    const [page, setPage] = useState(${state});
    return <Pagination page={page} count={8} onPageChange={setPage} label="Pages" />;
  }
  return <PaginationExample />;
})()`,
  id: "aureform-pagination",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Pagination", "node": "23:183", "source": "src/components/ui/pagination.tsx", "sourceExport": "Pagination", "axes": {"State": ["First", "Middle", "Last"]}, "mappedProperties": [{"property": "State", "type": "VARIANT", "codeTarget": "initial page fixture", "options": {"First": 1, "Middle": 4, "Last": 8}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state }} },
};
