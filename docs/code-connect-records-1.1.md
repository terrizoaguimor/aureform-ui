# Aureform 1.1 native records for final Code Connect

> **Historical checkpoint before the open-source release.** Results, pending work and references to private previews or archive licenses describe only the recorded version; they are not newly executed 1.3 checks. Distributed original Aureform work now uses [Apache 2.0](../LICENSE), including the sample, starter, design and original images. Earlier commercial proposals are not current terms; upstream notices still apply.

The [record schema](../.figma/code-connect/native-records-1.1.schema.json) describes complete owner records. [Native additions](../.figma/code-connect/native-additions.json) retains the actual 16 Table, 28 DataTable, nine Button Shapes and 13 Chart variants, checked against owner state and execution receipts. Table, Button and final Chart visual review passed their recorded scopes. Final state-bound local CC passes with 92 templates, 1,646 evaluations, 556 distinct typed examples and zero diagnostics or pending mappings. The actual 65-view structural audit passes against the same frozen state; schema validity, local typechecking, scoped native visual QA and cloud publication remain separate evidence.

The schema accepts one or more **complete** family records under `components`, with the authoritative `fileKey`. Keep partial Table builder pack receipts separate until the final family matrix is complete. Do not copy this schema into `native-additions.json` or an authoritative ledger.

| Native family   | Axes                                                                                         | Matrix          | Source correspondence                                                                      |
| --------------- | -------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| Button / Shapes | Shape: Rounded/Pill/Square; Size: Small/Medium/Large                                         | 9               | `shape`: rounded/pill/square; `size`: sm/default/lg                                        |
| Table           | Appearance: Elevated/Glass/Gradient/Flat; Density: Comfortable/Compact; State: Default/Empty | 16              | Four `TableAppearance` values, two `TableDensity` values and explicit body fixtures        |
| DataTable       | The same four Appearance and two Density values; State: Default/Selected/Empty/Loading/Error | 28              | Comfortable has all five states; Compact has Default/Selected only                         |
| Chart           | Kind corresponding to all 13 declared `ChartKind` values                                     | 13              | Preserve native Donut → source `pie`; retain the actual spelling of new native Kind values |

Table16, DataTable28, Shapes9 and Chart13 are complete actual records. These are native variant counts, separate from the 92-template local checkpoint. The 44 core families remain; Button Shapes is an additive map. Existing Button Appearance and loading/icon sets stay separate, and the nine Shapes variants do not imply a native Appearance or State axis.

The [Table report](../.figma/proofs/table-1.1/native-table-1.1-report.json) records all 44 variants structurally; its [owner visual review](../.figma/proofs/table-1.1/owner-visual-review.json) covers 20 representative instances across Light/Dark. The [Button visual review](../.figma/proofs/buttons-1.1/owner-visual-review.json) covers 54 examples: nine Shapes, 15 Appearance cases and three loading/icon add-ons in each theme. The icon-foreground and Aurora Brand Guide corrections passed actual post-fix PNG review. [Cover review](../.figma/proofs/buttons-1.1/owner-cover-review.json) passed version 1.1, 64 suite routes and 44 core families.

## Required readback

For each family, record `setId`, the actual `defaultId`, full `axes`, every variant's `id` and `axes`, and `propertyDefinitions` read from the owning component set. Retain actual returned names when available. Table receipts use `variantSchema` and `axisCodes` with exact observed IDs; their normalized records omit names that were not returned. Definitions retain exact keys, types, defaults and Variant options. Do not derive defaults from array order or synthesize names or IDs from an existing range.

Button Shapes also requires the returned `label`, `showIcon` and `icon` keys. They must resolve to TEXT, BOOLEAN and INSTANCE_SWAP definitions respectively. Its expected default is Rounded/Medium. Chart retains its observed Label key; Table and DataTable do not acquire invented text or slot properties.

The existing identities to preserve are:

| Family          | Set        | Default    | Text property |
| --------------- | ---------- | ---------- | ------------- |
| Table           | `23:355`   | `23:336`   | None recorded |
| DataTable       | `23:443`   | `23:356`   | None recorded |
| Button / Shapes | `176:4598` | `176:4562` | `Label#176:0` |
| Chart           | `23:501`   | `23:444`   | `Label#23:14` |

Shapes retains `Show icon#176:10` and `Icon#176:20`, with TEXT/BOOLEAN/INSTANCE_SWAP types checked from the owning definitions. Rounded/Medium is its observed default even though the exported Size list starts with Small. The [Button execution record](../.figma/native-buttons-1.1.json) preserves the complete Shapes record and foreground correction. Table/DataTable normalize the owner's complete `native1_1` state records, including final Loading/Error dimensions, and retain the [consolidated receipt](../.figma/proofs/table-1.1/native-table-1.1-report.json). Keep the original compact matrices as evidence.

Source currently exports ten blocks from nine files; the nine established native block maps remain. The optional `TableToolbar` is a source helper with no independent native master recorded. Coverage reports that scope explicitly and does not invent a component ID or an additional native gate.

The seven additional chart kinds are `horizontal-bar`, `stacked-bar`, `stacked-area`, `diverging-bar`, `gauge`, `rings` and `heatmap`. Their observed native Kind values are `HorizontalBar`, `StackedBar`, `StackedArea`, `DivergingBar`, `Gauge`, `Rings` and `Heatmap`. The original six native values and IDs remain intact. The schema now uses all 13 actual spellings from [the readback](../.figma/code-connect/Chart.native-definitions-1.1.json); proposed aliases are no longer substituted for native evidence. The generator normalizes recorded spelling and rejects kinds without a unique source correspondence.

Chart has 12 actual Boolean definitions with exact suffixes. `Show legend#189:0` maps to the public `legend` prop; `Glow#189:14` maps to `appearance="glow"` or `"flat"`; Series 1–3 map to the `visibleSeries` array of `value`, `secondary` and `tertiary`. Show data and Category 1–6 remain visual-only metadata: there is no public show-data or initial category-visibility prop, and the mapping does not filter fixture data or hide the accessible data table. All native definitions/defaults are preserved; 338 scoped Boolean cases cover both values and all-off/all-on across the 13 kinds.

## Button response budget and exact IDs

The Button builder now returns a **minified JSON string**, with a 20,000-byte budget that includes JSON string escaping. Parse it once when the transport supplies a string. Every created or mutated node ID, including instance descendants and partial work, is retained in `affectedNodeIds` using the same `observed-prefix-ranges-v1` format as the Table and flagship builders.

Copy the pure `decodeAffectedIds()` function from the Button builder into the local inspection script, then:

```js
const receipt =
  typeof ownerReturn === "string" ? JSON.parse(ownerReturn) : ownerReturn;
const affected = decodeAffectedIds(receipt.affectedNodeIds);
console.log(affected.createdNodeIds);
console.log(affected.mutatedNodeIds);
```

Ranges cover consecutive **observed** IDs only; gaps stay separate. Non-numeric or unsafe numeric suffixes remain exact literals. The receipt retains all set/default/variant IDs, full property keys, review frame IDs and dependency IDs. If secondary detail makes the response large, only loaded-font details, repeated source configuration and explanatory limits are compacted. Created/mutated style lists remain explicit. Serialization checks do not execute the script in Figma.

## Final handoff checks

Before regeneration, compare the normalized records with the owner's actual state and receipts:

- Each set and variant ID is real; variant IDs are unique and `defaultId` belongs to the recorded variants with the expected default axes.
- Returned variant names, axes, property-definition options and the observed matrix agree. Compact Table records need no invented names. Keep DataTable's sparse Compact matrix; do not expand it to 40 cases.
- Every suffixed text/Boolean/swap key resolves to the exact definition and type. Variant defaults belong to their reported options.
- Preserve the existing Table/DataTable/Chart identities and all core mappings. The owner records actual state; no preparation file grants authority for native writes.
- Map Table/DataTable Appearance and Density to their source props. Native Selected remains user-controlled selection; Loading uses `loading`; Error uses `error` and `onRetry`. No source `state`, forced selection or forced-hover prop is invented.
- Type-check nine Button shape/size examples, all four table materials and both densities, five DataTable state fixtures, all 13 actual source/native Chart kinds, numeric tertiary series, signed diverging data and the 12 native Boolean definitions. The approved checkpoint passed these checks; local execution remains separate from owner visual QA.

The [canonical Chart13 checkpoint](../.figma/code-connect/validation/chart13-checkpoint-1.1.json) and [final Chart owner review](../.figma/proofs/charts-1.1/owner-visual-review.json) remain preserved. After the owner froze state, [final CC generation/verification](../.figma/code-connect/validation/validation-summary.json) passed against SHA256 `7520e555c299b0978de6837e2f504271117a8e563a7538683cd61fc043c1aa52` before the read-only audit gate. Applied defaults/gallery corrections changed no IDs, properties, axes or state. The [actual 65-route audit](../.figma/native-audit.json) and scoped owner PNG reviews now pass; docs-only coverage and shipping docs use those final records. CC needs regeneration only if authoritative inputs change. Preserve the historical 62-view audit and earlier CC proofs. Code Connect remains local/unpublished; new archive/publication outcomes belong to the version-matched delivery receipt in [the release checklist](release-checklist-1.1.md).
