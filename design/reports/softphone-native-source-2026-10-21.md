# Softphone implementation source · 2026-10-21

This source supplement accompanies the implemented Softphone frontend. It is separate from the earlier Communications research prototypes and the frozen 69-route / 92-template checkpoints.

El suplemento acompaña al Softphone implementado: incluye componentes editables, estados de llamada, composiciones de escritorio/móvil y diálogos. Las propuestas anteriores de Communications conservan su alcance de investigación.

The [machine-readable source map](../figma/softphone-native-source-2026-10-21.json) records actual node IDs, source hashes, component properties and the final readback status.

| Native resource | Figma source | Application source |
| --- | --- | --- |
| Implementation page | [Softphone MVP](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=559-59) | [Suite template](../../src/components/templates/softphone-template.tsx) |
| Controlled call surface | [Softphone component set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=563-377) | [Softphone](../../src/components/blocks/softphone.tsx) |
| Workspace component | [SoftphoneWorkspace set](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=570-2797) | [SoftphoneWorkspace](../../src/components/blocks/softphone-workspace.tsx) |
| Desktop Light | [Default disconnected](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=574-1984) | `/en/softphone/` and `/es/softphone/` |
| Desktop Dark | [Default disconnected](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=574-2368) | The same responsive template |
| Mobile 390px | [Default disconnected](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=574-2748) | The same responsive template |
| Active call and queue | [Desktop Dark](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=574-3476) · [Mobile](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=574-3864) | Actual demo actions produce these states |
| State mode gallery | [Seven states in Light/Dark](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=576-6244) | The controlled `SoftphoneState` union |

The seven states are `idle`, `ringing`, `active`, `held`, `recovering`, `permission-denied` and `error`. The native set has eight sparse variants: a pending answer is an additional ringing presentation, not an eighth domain state or a complete State × Pending matrix.

The workspace has six source bodies and twelve compositions for default disconnected, active with queue, microphone permission and read-only hours scenarios. Ten desktop/mobile dialog masters cover hours, device permission, keypad, history and read-only hours. Actual IDs are listed in the source map. Native state illustrations do not simulate a carrier or browser permissions.

Original Twilio/Telnyx artwork is reused from the [communications asset manifest](../../public/assets/communications/manifest.json). Native text, auto-layout and source icon instances remain editable. The existing 714 variables, 14 text styles and six effect styles were reused without changing the shared foundations or research page.

## Code Connect and verification

Two local parserless templates map the new components:

- [Softphone.figma.ts](../../.figma/Softphone.figma.ts) maps actual state, pending, caller, metadata and duration props.
- [SoftphoneWorkspace.figma.ts](../../.figma/SoftphoneWorkspace.figma.ts) reads the verified nested provider Select. Viewport and activity are visual axes; responsive CSS and the real adapter determine those states.

The [portable check](../scripts/verify-softphone-code-connect.mjs) evaluates synthetic native properties and compiles the emitted examples against the current component APIs:

```sh
pnpm verify:communications-design
```

It does not execute the hosted Figma Code Connect service. These templates are local and unpublished. The retained 92 templates passed their own compatibility check; they were not replaced or relabelled as new Softphone mappings.

The [native PNG manifest](../proofs/softphone-2026-10-21/manifest.json) identifies actual Figma screenshots and their dimensions/hashes. The separate browser captures show [Light](../../docs/images/aureform-softphone-light.webp) and [Dark](../../docs/images/aureform-softphone-dark.webp) runtime views. The final mobile native PNG is exported at its full 390px frame width after the compact-header correction.

## Acceptance limits

The source map and selected screenshots establish a bounded native source association. They do not establish exhaustive pixel parity: native application chrome is a fixture, the source fixtures are English, and native radial background washes approximate the CSS gradients. Selected browser tests, template typing and native readback are distinct evidence classes.

The [communications validation record](../../docs/communications/VALIDATION.md) documents actual local tests, SDK declaration compatibility and reference-backend checks. Real audible Twilio/Telnyx calls, physical audio, uninterrupted media/token renewal and production security remain independently unverified.

No native `.fig` download or cloud Code Connect registration is included. Earlier release archives and design checkpoints retain their original bytes and scopes.
