// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=29-142
// source=src/components/blocks/page-heading.tsx
// component=PageHeading
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const state = instance.getEnum("State", {"Standard": false, "Editorial": true});
const eyebrow = instance.getString("Eyebrow#29:1");
const title = instance.getString("Title#29:4");
const description = instance.getString("Description#29:7");
const actionsInstances = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-button" || child.codeConnectId() === "aureform-button-additional-styles" || child.codeConnectId() === "aureform-button-loading-icons");
let actionsCode = figma.code``;
for (const child of actionsInstances) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    if (result.example.length) actionsCode = figma.code`${actionsCode}{${result.example}}`;
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}
const imports = [...new Set([...["import { PageHeading } from \"@/components/blocks/page-heading\";"], ...nestedImports])];
export default {
  example: figma.code`<PageHeading eyebrow={${JSON.stringify(eyebrow)}} title={${JSON.stringify(title)}} description={${JSON.stringify(description)}} editorial={${state}} ${actionsCode.length ? figma.code`actions={<>${actionsCode}</>}` : ""} />`,
  id: "aureform-page-heading",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "PageHeading", "node": "29:142", "source": "src/components/blocks/page-heading.tsx", "sourceExport": "PageHeading", "axes": {"State": ["Standard", "Editorial"]}, "mappedProperties": [{"property": "Eyebrow#29:1", "type": "TEXT", "codeTarget": "eyebrow"}, {"property": "Title#29:4", "type": "TEXT", "codeTarget": "title"}, {"property": "Description#29:7", "type": "TEXT", "codeTarget": "description"}, {"property": "State", "type": "VARIANT", "codeTarget": "editorial", "options": {"Standard": false, "Editorial": true}}], "sourceProperties": [], "intentionalVisualOnly": [], "notes": [], "imports": imports, "nativePropertyValues": { "State": state, "Eyebrow#29:1": eyebrow, "Title#29:4": title, "Description#29:7": description }} },
};
