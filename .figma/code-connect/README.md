# Aureform 1.1 local Code Connect

These parserless `.figma.ts` files are the current generated handoff. [The manifest](../code-connect-manifest.json) selects them and preserves all 44 core families plus the established local maps. Legacy `.figma/*.figma.ts` files and the root `figma.config.json` remain unchanged snapshots.

Templates use `figma.selectedInstance`, exact reported property keys, exhaustive `getEnum` mappings, dynamic child instances and `figma.code` result sections. They do not use parser-based `.figma.tsx` or `figma.connect()`. Native presentation with no public source control is recorded in `intentionalVisualOnly`.

Button, Badge and Card metadata records their actual additive appearance source types. An `Appearance` axis is emitted only when the owner’s property ledger reports it. Otherwise the supported source values remain documented and locally type checked; no native property is invented.

The owner's recorded **Button / Appearance**, **Badge / Appearance** and **Card / Material** sets are additive maps alongside the preserved 44 core families. Button's native Disabled state maps to `disabled`; Card's `Title#97:22` maps to `CardTitle`. Native Hover is recorded as CSS presentation because the source has no forced-hover prop.

All six effects have owner-recorded native sets in [`native-effects-library-1.1.json`](../native-effects-library-1.1.json). The generator reads their exact variant names, IDs and text keys directly. Native Title becomes a children fixture; MagneticButton Label stays inline and its Disabled state maps to `disabled`. Hover is visual-only when there is no public state control. Shader fill uniforms are separate from component properties and do not create instance property reads.

Optional additional records go in `native-additions.json`, with the authoritative file key and exact IDs/axes/property keys; see [the owner handoff](../../docs/handoff-1.1.md).

The [1.1 native record schema](native-records-1.1.schema.json), [native additions](native-additions.json) and [record guide](../../docs/code-connect-records-1.1.md) retain complete actual records for Button Shapes (9), Table (16), sparse DataTable (28) and Chart (13). Exact IDs, property suffixes, definitions, defaults and observed matrices are checked against owner state and receipts. Shapes is a separate additive map; no 40-variant DataTable matrix or native Appearance/State axis for Shapes is invented. The Button builder's lossless affected-ID ledger remains preserved.

Chart maps all 13 observed native Kind values, including Donut → source `pie`. Its 12 exact Boolean definitions map Show legend to `legend`, Glow to `appearance` (`glow`/`flat`) and Series 1–3 to `visibleSeries`. Show data and Category 1–6 remain visual-only metadata. Source fixtures include numeric tertiary values and signed diverging data; no plotted pixels are treated as production data.

The generator records hashes for authoritative ledgers, canonical source and generated templates. The validator checks them before and after evaluation, so a changed source is not silently recertified by replacing its hash. It checks all source appearance values, effect props and distinct emitted JSX against installed dependency types. Validation uses a synthetic Figma API and cannot establish live Figma behavior.

**Current local validation: PASS.** Final generation and verification completed against frozen state SHA256 `7520e555c299b0978de6837e2f504271117a8e563a7538683cd61fc043c1aa52`. The [current flat summary](validation/validation-summary.json) records **92 templates, 1,646 evaluations, 556 distinct typed examples, zero diagnostics and zero pending mappings**. It covers 338 recorded variant combinations, 1,312 top-level cases, 334 nested executions, 338 Chart Boolean cases, all 14 source appearance values, six effect contracts and the complete starter. Earlier [Chart13 checkpoint](validation/chart13-checkpoint-1.1.json) and [isolated preparation](validation/preparation-summary-1.1.json) remain historical records.

All 65 native route roots and the expanded component records exist. The owner-recorded inventory is **714 variables, including 332 native primitives, across eight collections; 14 text, 36 paint and six effect styles**. Native totals and generated source-token totals are separate inventories. The owner's default-font/mode corrections on [page 2:5](../native-owner-default-fix-2-5-1.1.json) and [page 2:6](../native-owner-default-fix-2-6-1.1.json) were applied without changing IDs, component properties, axes or frozen state. The [scoped defaults/gallery visual review](../proofs/defaults-1.1/owner-visual-review.json) passed with zero findings after 185 font/mode assignments, 198 token and transparent surface corrections, four version-label fixes and two Table slot clips.

**Native and local handoff complete.** The [actual 65-route structural audit](../native-audit.json) passed against the same frozen state, covering 21 + 44 roots with zero flags, missing fonts or UI image fills and no canvas mutations. Its white-layout policy includes SLOT fills at a minimum height of 8 px. Scoped owner PNG reviews remain separate visual evidence. Current application QA passes 780/780 EN/ES combinations, 130 English Light/Dark gallery previews, appearance 44/348, motion 14/74 and the fresh official consumer 85/85. Docs-only coverage and shipping docs use these final records. Native audit, README and docs are excluded from CC's authoritative inputs, so this closure does not require another CC run. New ZIP verification and private publication remain pending; consult the version-matched `public/downloads/verification-1.1.json` delivery receipt and [the release checklist](../../docs/release-checklist-1.1.md).

```sh
python3 scripts/generate-code-connect.py
pnpm verify:code-connect
```

When dependencies are restored in the owner’s mirror:

```sh
AUREFORM_DEPENDENCIES=/tmp/aureform-ui-build/node_modules \
  node scripts/verify-code-connect.cjs
```

Run from the canonical kit root. Output stays in this directory and the manifest; source is read from the canonical kit. `figma.config.json` in this directory selects these `.figma.ts` files for a future owner workflow; it is separate from the legacy root configuration.

**Local and unpublished:** live Figma template execution, native library publication and cloud Code Connect registration have not been performed by this workflow. The recorded Professional account and unpublished library do not establish cloud eligibility. Source/browser QA, native design review and synthetic Code Connect validation are separate evidence.
