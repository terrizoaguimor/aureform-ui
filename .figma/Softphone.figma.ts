// url=https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N/Aureform-UI?node-id=563-377
// source=src/components/blocks/softphone.tsx
// component=Softphone
// Local parserless artifact. No registration or publication has been performed.
import figma from "figma";

const instance = figma.selectedInstance;
const state = instance.getEnum("State", {
  idle: "idle",
  ringing: "ringing",
  active: "active",
  held: "held",
  recovering: "recovering",
  "permission-denied": "permission-denied",
  error: "error",
});
const pending = instance.getEnum("Pending", { false: false, true: true });
const contact = instance.getString("Contact#563:0");
const metadata = instance.getString("Metadata#563:8");
const duration = instance.getString("Duration#563:16");
// The native display maps to the actual numeric `seconds` prop.
const durationParts = /^\d+:\d{2}(?::\d{2})?$/.test(duration)
  ? duration.split(":").map(Number)
  : [];
const parsedSeconds = durationParts.length
  ? durationParts.reduce((total, part) => total * 60 + part, 0)
  : 0;
const seconds = Number.isFinite(parsedSeconds) ? parsedSeconds : 0;
// This caption is supplied by the actual workspace while accept is pending.
const pendingLabels = pending
  ? figma.code` labels={{ ringing: "Connecting call" }}`
  : figma.code``;
const imports = [
  'import { Softphone } from "@/components/blocks/softphone";',
];

export default {
  example: figma.code`<Softphone state="${state}" contact={${JSON.stringify(contact)}} metadata={${JSON.stringify(metadata)}} seconds={${seconds}} pending={${pending}}${pendingLabels} />`,
  id: "aureform-softphone",
  imports,
  metadata: {
    nestable: true,
    props: {
      status: "local-unpublished",
      node: "563:377",
      source: "src/components/blocks/softphone.tsx",
      sourceExport: "Softphone",
      sourceHash: "d3723d29f43272e352503250cc503dc46f4c77eefd661ac72c653826e1d8be42",
      mappedProperties: [
        { property: "State", type: "VARIANT", codeTarget: "state" },
        { property: "Pending", type: "VARIANT", codeTarget: "pending" },
        { property: "Contact#563:0", type: "TEXT", codeTarget: "contact" },
        { property: "Metadata#563:8", type: "TEXT", codeTarget: "metadata" },
        {
          property: "Duration#563:16",
          type: "TEXT",
          codeTarget: "seconds",
          conversion: "MM:SS or H:MM:SS display to nonnegative seconds",
        },
      ],
      axes: {
        State: [
          "idle",
          "ringing",
          "active",
          "held",
          "recovering",
          "permission-denied",
          "error",
        ],
        Pending: ["false", "true"],
      },
      notes: [
        "Eight sparse variants: pending=true exists only for ringing; it is not an eighth state.",
        "Seven states have actual Light and Dark previews using the existing color modes.",
        "Callbacks, busy, muted, holdAvailable, disabled and locale remain consumer props; no invented native bindings.",
        "This controlled snippet supplies no action callbacks. The source disables unavailable actions; the host must provide its actual adapter callbacks.",
        "Native static source and local frontend evidence do not certify live carrier calls.",
      ],
      imports,
    },
  },
};
