// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=591-1343
// source=src/components/blocks/communications-setup.tsx
// component=CommunicationsSetup
// Local parserless artifact; not registered or published.
import figma from "figma";

const instance = figma.selectedInstance;
const provider = instance.getEnum("Provider", {
  twilio: "twilio",
  telnyx: "telnyx",
});
const viewport = instance.getEnum("Viewport", {
  desktop: "desktop",
  mobile: "mobile",
});
const mode = instance.getEnum("Mode", {
  demo: "demo",
  live: "live",
});
const imports = [
  'import { CommunicationsSetup } from "@/components/blocks/communications-setup";',
];

export default {
  example: figma.code`<CommunicationsSetup defaultProvider="${provider}" />`,
  id: "aureform-communications-setup",
  imports,
  metadata: {
    nestable: true,
    props: {
      status: "local-unpublished",
      node: "591:1343",
      defaultNode: "591:105",
      page: "585:59",
      source: "src/components/blocks/communications-setup.tsx",
      sourceExport: "CommunicationsSetup",
      sourceHash:
        "425cc45e7751002fdbc9b8cf68625d2932d2d5665db8a9071d166257f3c71174",
      mappedProperties: [
        {
          property: "Provider",
          type: "VARIANT",
          codeTarget: "defaultProvider",
          values: { twilio: "twilio", telnyx: "telnyx" },
        },
      ],
      nativePropertyKeys: ["Provider", "Viewport", "Mode"],
      axes: {
        Provider: ["twilio", "telnyx"],
        Viewport: ["desktop", "mobile"],
        Mode: ["demo", "live"],
      },
      nativePropertyValues: {
        Provider: provider,
        Viewport: viewport,
        Mode: mode,
      },
      sparseVariantCount: 8,
      intentionalVisualOnly: [
        {
          property: "Viewport",
          reason: "Responsive CSS determines layout; no viewport prop exists.",
        },
        {
          property: "Mode",
          reason:
            "The supplied adapter determines mode; no mode prop exists. This snippet uses the actual inert default demo adapter.",
        },
        {
          property: "Phase",
          reason:
            "Phase snapshots live in separate native sets. The actual adapter determines phase; no forced phase prop exists.",
        },
      ],
      notes: [
        "Demo fields are explicitly fictitious and read-only. The snippet contains no credentials, URLs or access codes.",
        "Live rendering requires the consumer's authenticated setup adapter, stable authSessionKey and actual callbacks; this snippet supplies none.",
        "fixedProvider, adapter, authSessionKey, onConfigured, onOpenSoftphone and className remain consumer props without invented native bindings.",
        "Configured checks describe configuration readback. Signed webhook delivery, browser connection and a real carrier call require separate evidence.",
        "Native editable source does not establish browser behavior, pixel parity or carrier certification.",
      ],
      imports,
    },
  },
};
