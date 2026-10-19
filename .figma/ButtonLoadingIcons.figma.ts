// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=25-773
// source=src/components/ui/button.tsx
// component=Button
// Local parserless artifact. No Figma registration or publication has been performed.
import figma from 'figma';
const instance = figma.selectedInstance;
const nestedImports: string[] = [];
const variant = instance.getEnum("Style", {"Primary": "default", "Outline": "outline", "Ghost": "ghost", "Secondary": "secondary", "Destructive": "destructive", "Link": "link"});
const kind = instance.getEnum("Kind", {"Loading": "default", "Icon": "icon", "Small icon": "icon-sm"});
const loading = instance.getPropertyValue('Kind') === 'Loading';
const iconsInstances = instance.findConnectedInstances(child => child.codeConnectId() === "aureform-icon-arrow-up-right" || child.codeConnectId() === "aureform-icon-plus" || child.codeConnectId() === "aureform-icon-sparkles");
let iconsCode = figma.code``;
for (const child of iconsInstances) {
  if (child && child.type === 'INSTANCE') {
    const result = child.executeTemplate();
    if (result.example.length) iconsCode = figma.code`${iconsCode}{${result.example}}`;
    nestedImports.push(...(result.metadata?.props?.imports ?? []));
  }
}
const imports = [...new Set([...["import { Button } from \"@/components/ui/button\";"], ...nestedImports])];
export default {
  example: figma.code`<Button variant="${variant}" size="${kind}" loading={${loading}} aria-label="Continue">${loading ? figma.code`Continue` : iconsCode}</Button>`,
  id: "aureform-button-loading-icons",
  imports,
  metadata: { nestable: true, props: {"status": "local-unpublished", "nativeName": "Button / Loading & icons", "node": "25:773", "source": "src/components/ui/button.tsx", "sourceExport": "Button", "axes": {"Style": ["Primary", "Outline", "Secondary", "Ghost", "Destructive", "Link"], "Kind": ["Loading", "Icon", "Small icon"]}, "mappedProperties": [{"property": "Style", "type": "VARIANT", "codeTarget": "variant", "options": {"Primary": "default", "Outline": "outline", "Ghost": "ghost", "Secondary": "secondary", "Destructive": "destructive", "Link": "link"}}, {"property": "Kind", "type": "VARIANT", "codeTarget": "size; loading", "options": {"Loading": "default", "Icon": "icon", "Small icon": "icon-sm"}}], "intentionalVisualOnly": [], "notes": ["Button renders its own loading spinner. Icon content is resolved dynamically and remains children; no icon prop is emitted. The accessible name is a local fixture."], "imports": imports, "nativePropertyValues": { "Style": variant, "Kind": kind }} },
};
