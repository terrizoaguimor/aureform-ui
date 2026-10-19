# Release checklist 1.2

> **Historical checkpoint before the open-source release.** Results, pending work and references to private previews or archive licenses describe only the recorded version; they are not newly executed 1.3 checks. Distributed original Aureform work now uses [Apache 2.0](../LICENSE), including the sample, starter, design and original images. Earlier commercial proposals are not current terms; upstream notices still apply.

**Status: source/browser/native/local Code Connect checks recorded PASS in their stated scopes; preliminary five-archive generation passed.** Final pinned archive-byte/consumer verification belongs in the excluded static public receipt. Owner-private publication is proved separately by the native Sites host record and the post-deployment handoff.

The historical 1.1 baseline is **65 views, 44 core families and 83 registry entries**. Current [coverage](coverage.json) records **69 views: 68 suite plus landing**, 44 families, 18 block exports and **96 registry entries, including 13 new installs**. Four routes are new and customers/team are upgraded on two existing routes; six palettes and EN/ES remain. Historical evidence retains its original checkpoint.

**Implementation, delivery and owner-private publication are already authorized.** This checklist records execution and evidence under that scope; no additional approval is a delivery gate. Interviews, paid trials, participant contact, charging and third-party access are separate future work.

Accepted scope is premium frontend operations for teams: onboarding, workspaces, members, CSV import, external customer query, saved views and detail. Actual contracts and local-versus-consumer responsibilities are documented in [English](saas-operations.md) and [Spanish](saas-operations.es.md). State-by-state integration requirements remain in those guides and the scoped QA reports below; a passing recorded test does not certify unexercised host/backend behavior.

## Recorded verification at source freeze

The portable [current-source runtime receipt](qa-runtime-1.2.json) ships with source and preserves scope, commands, input stability and hashes/references to full reports. It is a source/browser checkpoint, not a final archive-byte or publication receipt.

| Check                     | Recorded result                                                                                                                                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integrated production E2E | **74/74 PASS**, 148.5 s: nine legacy desktop, one mobile and 64 SaaS cases. Zero retries, flaky results or skips. All 149 monitored source/config/spec inputs and the build ID remained unchanged during the run.                                                                                                   |
| Unit / types / lint       | Fresh **184/184 unit tests across five suites**, TypeScript PASS and ESLint with zero warnings. Production build checkpoint passed; integrated-run build identity remained unchanged.                                                                                                                               |
| Motion                    | **14 scenarios / 74 checks PASS**, zero errors; monitored sources unchanged.                                                                                                                                                                                                                                        |
| Actual copied examples    | **188 strict checks PASS**: 176 dynamic clipboard payloads plus 12 code-view combinations; monitored sources unchanged.                                                                                                                                                                                             |
| Example compilation       | **688 generated payloads = 44 copied + 616 configured + 28 Studio**; plus 44 canonical example files and one barrel, **733 root files** total. Strict/noEmit with zero diagnostics; negative controls for missing module/export and invalid types detected errors. Compile-only proof, separate from browser tests. |
| Responsive / previews     | **72/72 scoped checks PASS** across six routes, EN/ES, Light/Dark and three widths; six palettes are distributed across cases, not a full palette cross-product. Twelve served WebP previews and two gallery checks passed; sources unchanged.                                                                      |
| Preliminary packaging     | Five archives generated and passed the 25 MiB per-asset gate; largest 15.26 MiB, source 8.87 MiB. Evidence companions preserve 23 accepted historical PNGs and 22 accepted new PNGs. These pre-freeze measurements are not final byte identities or pins.                                                           |

| SaaS scope                       | Passing E2E cases | Scoped axe scans | Detailed evidence              |
| -------------------------------- | ----------------: | ---------------: | ------------------------------ |
| Customer detail                  |                13 |               32 | [Detail QA](qa-detail-1.2.md)  |
| DataWorkbench                    |                12 |                4 | [Table QA](qa-table-1.2.md)    |
| Onboarding / workspace / members |                23 |               10 | [Setup QA](qa-setup-1.2.md)    |
| CSV imports                      |                16 |                8 | [Imports QA](qa-imports1.2.md) |

The **54 scoped axe analyses recorded zero violations and 54 incomplete rule results**. Complete rule output is retained. Incomplete contrast/focus findings require review and are not counted as automated conformance; these scoped reports are not a whole-application accessibility certificate. The detailed documents preserve keyboard/focus, mobile, fixture and historical-attempt limitations.

## Completed source handoff

- [x] Record the real 69-view/96-entry inventory, dependency graphs and zero pending native IDs in [coverage](coverage.json), separately from any live MCP service.
- [x] Document actual source APIs, provider requirements, zero-based external pages, filtered export scope, saved views, callback failures and local persistence boundaries in the EN/ES guides.
- [x] Preserve metadata-only attachments: at most 100 per customer and 10 MiB per file, with no binary persistence or fabricated URLs. Production identity, server authorization, mail, database and file delivery remain host responsibilities.
- [x] Record the current unit/type/lint, production-build checkpoint, 74 integrated E2E cases, scoped axe results, responsive/gallery, motion, actual-copy and pure compilation results in [qa-runtime-1.2.json](qa-runtime-1.2.json).
- [x] Preserve the [executed three-mode consumer checkpoint](consumer-verification-1.2.md#final-executed-consumer-checkpoint): CLI add **440/440**, official HTTP registry **109/109**, CLI init **262/262**, total **811/811**, with actual consumer type/lint/build commands and unchanged captured inputs. These are three executed modes; six are planned for final delivery verification.
- [x] Record [native source associations](../.figma/native-saas-source-associations-1.2.json) and [fresh local Code Connect validation](../.figma/code-connect/validation/validation-summary.json): 92 unchanged 1.1 templates checked against source 1.2, 1,646 evaluations / 556 typed examples, zero diagnostics and 98 source snapshots. Local synthetic runtime only; no new templates or cloud publication are claimed.
- [x] Record the [SaaS native library](../.figma/native-saas-library-1.2.json), [22-PNG export manifest](../.figma/proofs/saas-1.2/export-manifest.json) and [owner approval](../.figma/proofs/saas-1.2/owner-visual-approval.json): six views / 12 Light–Dark roots, nine sets / 68 variants.
- [x] Record the [composite native audit](../.figma/native-audit-1.2.json): 69 roots = 63 inherited + six fresh SaaS routes / 12 mode roots, linked to [state](../.figma/state.json) SHA256 `8be9d3c1c46565296bd90c43f086b3d7159889c48167ab48d1d5f88e415b1963`. Preserve the [historical audit](../.figma/native-audit.json) and its [frozen state](../.figma/history/state-1.1-final.json).
- [x] Document the compact source/evidence split, fixed filenames, optional evidence usage, root extraction commands and the post-freeze delivery-receipt policy in [README](../README.md#figma-source-and-packages).
- [x] Keep pilot interviews/trials and live Code Connect publication unclaimed; record actual source/runtime scope and incomplete accessibility results explicitly.

## Delivery gates after the source-docs freeze

The fixed distribution has five archives: source, starter, free sample, `aureform-ui-native-evidence-1.1.zip` and `aureform-ui-native-evidence-1.2.zip`. Native proof PNGs stay outside source; source retains application assets, docs, manifests, audits and reproduction scripts.

- [ ] Regenerate all five archives from the frozen included payload and record their exact versions, file inventories, sizes and SHA-256 values in the final five-entry `checksums.json`.
- [ ] Pin that final manifest after regeneration; preliminary generation hashes are not release pins and are not embedded in this source snapshot.
- [ ] Verify each final archive against the 25 MiB per-asset limit and its promised payload; preserve original proof PNG bytes, relative paths and audit hashes.
- [ ] Run the pinned six-mode consumer verification: CLI add, official HTTP registry, CLI init, source ZIP, starter ZIP and free ZIP. Recheck exact manifest/archive bytes and captured inputs after execution.
- [ ] Integrity-check both evidence companions under the same pinned manifest. They are optional for kit use and are not installation consumers or additional consumer modes.
- [ ] Confirm source/starter/free use does not require optional proof PNGs. To reproduce `pnpm package:source`, restore both companions into the extracted kit root with `.figma/proofs/...` intact; verify original hashes using version-matched audits/manifests and [README commands](../README.md#figma-source-and-packages).
- [ ] Check final distributable text/metadata for credentials, private connector context and temporary signed asset URLs; preserve legitimate evidence and public references.
- [ ] Publish within the existing owner-private authorization. Use the native Sites saved-version/commit/deployment acknowledgment as publication authority; after deployment, retain the actual host record and URL/status in ignored `artifacts/publication-1.2.json` and the final handoff.
- [ ] Save the final five-ZIP pin, six-mode consumer results and all source/native/browser checks in `public/downloads/verification-1.2.json`, excluded from the Source ZIP. Bind it to the exact pinned manifest and fix it before publication; do not insert a later publication commit or mutate the public file after deployment.

This included checklist is the source-freeze snapshot. Complete archive-byte/consumer gates in the excluded public receipt before publication. Record publication separately from the native Sites host record after deployment; keep packaged documentation and the pre-deployment public receipt unchanged. A correction to any included file requires a new freeze, regenerated archives and a new manifest pin.

## Future pilot: outside delivery gates

The [pilot protocol](pilot-validation.es.md) and [research](research-saas.es.md) are plans, not completed commercial validation. They do not block source/package delivery or authorized owner-private publication.

| Future work       | Planned scope and current truth                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Interviews        | Target 8–12 qualified interviews; no outreach or sessions executed/authorized by this delivery task.                                                                                    |
| Paid trials       | Target 3–5; define the offer and consent in a future task. No sale, charge or third-party access is authorized here.                                                                    |
| Measurement       | Record real task times, blockers, assistance, value, price/decision and subsequent use when sessions exist; keep identifying notes private.                                             |
| Commercial review | Refresh primary-source price/license observations before using them in a future offer.                                                                                                  |
| Product follow-up | Review actual findings/support costs before committing to 1.3 scope or dates. Inbox, usage, billing, audit and webhooks are planned next; AI artifacts, editor and emails follow later. |

## Owner closeout record

| Field                          | Source-freeze value                                                                                                                                                                                                                                                                                              |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source/runtime evidence        | [Portable current-source receipt](qa-runtime-1.2.json); detailed scopes above. Source/browser checks are recorded, with accessibility incompletes preserved.                                                                                                                                                     |
| Native / local Code Connect    | Composite 69-root audit and scoped SaaS visual approval recorded; 92 preserved local templates validated against source 1.2. No cloud publication.                                                                                                                                                               |
| Independent consumer execution | Three modes / 811 checks passed on their recorded bytes. Final pinned six-mode retake belongs in the excluded delivery receipt.                                                                                                                                                                                  |
| Packaging                      | Preliminary five-archive generation/size gate passed. Final regenerated bytes, manifest pin and archive-specific results are external delivery evidence.                                                                                                                                                         |
| Delivery authorization         | Already provided for implementation, delivery and owner-private publication; no additional approval gate.                                                                                                                                                                                                        |
| Publication                    | Native Sites host saved-version/commit/deployment acknowledgment is authoritative; retain it after deployment in ignored `artifacts/publication-1.2.json` and the final handoff. The public static receipt attests bytes/checks, not the eventual publication commit; no completed publication is asserted here. |
| Interviews / paid trials       | Planned; no execution or outcomes asserted.                                                                                                                                                                                                                                                                      |
