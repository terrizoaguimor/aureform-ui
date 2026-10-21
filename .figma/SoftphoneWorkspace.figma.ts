// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=570-2797
// source=src/components/blocks/softphone-workspace.tsx
// component=SoftphoneWorkspace
// Local parserless artifact. No registration or publication has been performed.
import figma from "figma";

const instance = figma.selectedInstance;
// This exact nested Core Select and TEXT property were read in all six bodies.
const providerSelect = instance.findInstance("Voice provider / Twilio", {
  traverseInstances: true,
});
if (providerSelect.type !== "INSTANCE") {
  throw new Error("The verified voice-provider Select is absent.");
}
const providerLabel = providerSelect.getString("Label#15:11");
if (providerLabel !== "Twilio" && providerLabel !== "Telnyx") {
  throw new Error("Unsupported voice-provider label; inspect the native source.");
}
const defaultProvider = providerLabel === "Telnyx" ? "telnyx" : "twilio";
const viewport = instance.getEnum("Viewport", {
  desktop: "desktop",
  mobile: "mobile",
});
const activity = instance.getEnum("Activity", {
  disconnected: "disconnected",
  active: "active",
  permission: "permission",
});
const imports = [
  'import { SoftphoneWorkspace } from "@/components/blocks/softphone-workspace";',
];

export default {
  example: figma.code`<SoftphoneWorkspace defaultProvider="${defaultProvider}" />`,
  id: "aureform-softphone-workspace",
  imports,
  metadata: {
    nestable: true,
    props: {
      status: "local-unpublished",
      node: "570:2797",
      source: "src/components/blocks/softphone-workspace.tsx",
      sourceExport: "SoftphoneWorkspace",
      sourceHash: "7f667da9a272cfb875d25f89bb90345f0ebc024c892ea55f98a32d4f48d71139",
      mappedProperties: [
        {
          layer: "Voice provider / Twilio",
          property: "Label#15:11",
          type: "TEXT",
          codeTarget: "defaultProvider",
          values: { Twilio: "twilio", Telnyx: "telnyx" },
        },
      ],
      axes: {
        Viewport: ["desktop", "mobile"],
        Activity: ["disconnected", "active", "permission"],
      },
      nativePropertyValues: { Viewport: viewport, Activity: activity },
      intentionalVisualOnly: [
        {
          property: "Viewport",
          reason: "Responsive source CSS determines layout; there is no viewport prop.",
        },
        {
          property: "Activity",
          reason: "The actual adapter state determines activity; there is no activity or forced permission prop.",
        },
      ],
      notes: [
        "Default rendering creates the actual local demo adapter and starts disconnected.",
        "Active/queue and permission illustrations require actual adapter actions and browser permission outcomes; this snippet does not force those states.",
        "adapter, onDemoProviderChange and className remain actual consumer props, without fabricated credentials or native bindings.",
        "The application supplies its existing language context. The native fixtures are English and are not a locale matrix.",
        "Native static source and typed SDK references do not establish real carrier certification.",
      ],
      imports,
    },
  },
};
