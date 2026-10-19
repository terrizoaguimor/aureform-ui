# SaaS setup QA — Aureform 1.2

> **Historical checkpoint before the open-source release.** Results, pending work and references to private previews or archive licenses describe only the recorded version; they are not newly executed 1.3 checks. Distributed original Aureform work now uses [Apache 2.0](../LICENSE), including the sample, starter, design and original images. Earlier commercial proposals are not current terms; upstream notices still apply.

The owner's final integrated production run on `http://127.0.0.1:3012` completed **74/74 tests PASS** in **148.5 seconds** on 19 October 2026, 14:55:36–14:58:05 UTC, using two Chromium workers and zero retries. Its `saas-setup.spec.ts` subset completed **23/23 PASS**, including the strengthened self-role protection after ownership transfer. Build ID: `BTAW6zd9K-Lz9R_XmVIOo`. There were no skipped, unexpected or flaky tests. The setup subset recorded **23 browser-error assertions and 0 errors**.

| Coverage                                                                                                       | Executed tests | Result          |
| -------------------------------------------------------------------------------------------------------------- | -------------: | --------------- |
| EN/ES onboarding drafts, reload at each step, queued invitations and one completed workspace                   |              2 | PASS            |
| EN/ES name/slug limits, slug collision recovery and a genuine second-tab conflict                              |              3 | PASS            |
| EN/ES invalid/duplicate invitation emails, acceptance, revocation, expired renewal and localized expiry errors |              2 | PASS            |
| EN/ES self and last-owner protection                                                                           |              2 | PASS            |
| EN/ES preview role across settings navigation/reload, without changing the actual member role                  |              2 | PASS            |
| EN/ES real ownership transfer, own-role/removal protection after transfer and owner preview, plus an admin fixture |           3 | PASS            |
| Invalid persistence fallback and storage-write failure/retry preserving the live session                       |              2 | PASS            |
| EN/ES mobile keyboard onboarding, workspace save, dialog focus containment and member role selection           |              6 | PASS            |
| Empty new workspace, actual dropdown selection and customer/member/invitation isolation                        |              1 | PASS            |

The six mobile setup tests used a 390 × 844 viewport; desktop setup tests used 1440 × 1000. Reduced motion was enabled. Ten Axe scans reported **0 tagged WCAG A/AA violations**. Twelve rule results remain incomplete: ten `color-contrast` results and two `aria-hidden-focus` results. The attachments request manual contrast evaluation on gradient backgrounds and focusability checks for the hidden modal background/focus guards. The keyboard tests passed dialog focus containment and Escape cancellation in both locales. This scoped result does not certify full accessibility conformance.

The actual EN and ES footer payloads showed `Aureform UI 1.2`. The owner's final `summary.json` confirms that **all 149 source, test and tooling files and the build ID were unchanged** between `source-before.json` and `source-after.json`. The earlier read-only setup comparison separately covers ten product inputs and the frozen spec. Those product inputs also match the earlier standalone 23/23 run, whose source, build and covered HTML hashes were stable from start to end.

The final spec SHA-256 is `948d801abad81b80b165aceb7006ab3eb05f91fa5902a97f8d2e2d92dbdea02a`. The owner report SHA-256 is `00c3f44a74a6723536984d884d090c570e69852b6154643d8808be05f4ddf03e`.

The earlier **67 PASS** assertions against the pure controlled blocks are historical evidence. They are separate from these production E2E results.

Tests read and validate the real `aureform:saas:v1` payload. Form submissions, invitation transitions, role changes and ownership transfers use the integrated UI callbacks. Explicit fixtures establish a pending invitation with a past expiry, an actual admin with another owner, malformed persistence, or a blocked storage write. Those fixtures are identified in the spec. The cross-tab conflict uses two real pages sharing browser storage. Invitation acceptance is the kit's local demo action.

The controlled callback contracts accept `void | Promise<void>` for onboarding `onComplete`, workspace `onSave`/optional `onCreate`, and all seven member mutations: `onInvite`, `onChangeRole`, `onRemoveMember`, `onResendInvitation`, `onAcceptInvitation`, `onRevokeInvitation` and `onTransferOwnership`. The blocks await these callbacks, block overlapping submissions while pending, and show a supplied `Error.message` as-is or an EN/ES fallback on failure. The caller owns the business commit and updated controlled props. Onboarding `onChange(next)` and optional navigation callbacks are synchronous; successful completion is committed by `onComplete`, without a later `onChange` overwriting the caller's newly created workspace ID. Workspace save preserves the draft on rejection, and an invitation form clears its email only after callback success. Promise support does not provide transport cancellation or server idempotency; the integrated results prove the shipped local adapter paths, not arbitrary remote callbacks.

Invitations accept only `admin | member | viewer`; ownership is transferred through its separate callback. Emails are trimmed and lowercased, with invalid addresses, existing-member duplicates and pending-invitation duplicates rejected. The EN/ES tests prove `pending → accepted` creates an active member in the current workspace, `pending → revoked` removes the accept action, and an expired invitation can be renewed to a future-expiring `pending` record and then accepted. A pending record with an elapsed expiry rejects acceptance with a localized error, stays pending and creates no member. Onboarding also completes with an empty invitation list. These are local demo state transitions: no email delivery, recipient identity verification or server authorization is claimed.

The source contracts are in [onboarding-flow.tsx](../src/components/blocks/onboarding-flow.tsx), [member-management.tsx](../src/components/blocks/member-management.tsx) and [saas-setup.tsx](../src/components/templates/saas-setup.tsx). The historical pure-block checks and this integrated run are separate evidence.

Current evidence is in:

- `/tmp/aureform-owner-qa-1.2/final-flows/report.json` — 74 total results, including 23 setup results, ten Axe attachments and 17 setup PNG attachments.
- `/tmp/aureform-owner-qa-1.2/final-flows/summary.json` — authoritative final counts, 23 setup browser-error assertions and unchanged 149-file/build inventory.
- `/tmp/aureform-owner-qa-1.2/final-flows/source-before.json` — owner input inventory and build ID.
- `/tmp/aureform-owner-qa-1.2/final-flows/source-after.json` — final owner inventory, SHA-256 `8fc5d6a9d49cbdb0f0eb3dce4207379825d394e1b15ac047c663f8976a1508a2`.
- `/tmp/aureform-setup-1.2-qa/owner-final-summary.json` — supplemental extraction of setup results, Axe limitations, persisted onboarding/isolation/ownership receipts and relevant source hashes.
- `/tmp/aureform-setup-1.2-qa/source-after-owner-scope.json` — read-only comparison of the eleven covered inputs after the owner run.
- `/tmp/aureform-setup-1.2-qa/scoped-checks-final.json` — scoped static checks bound to the final spec hash.

The scoped final spec passed TypeScript with **0 diagnostics** and ESLint with **0 warnings**. The owner's integrated run executed all four SaaS specs and the legacy desktop/mobile specs. No additional QA process ran in parallel for this review, and no product source, provider, global config or spec was changed during the owner's frozen run.

To reproduce setup separately against an already-running production server, use a fresh run label:

```bash
cd /tmp/aureform-ui-1.2
AUREFORM_QA_RUN=setup-retake \
node /tmp/aureform-setup-1.2-qa/run.mjs
```

This standalone runner uses one Chromium worker, records source hashes, the build ID and covered HTML before and after execution, and fails integrity checks if they change. It does not start a server or run a build. A fresh label preserves the original evidence.

The previously reported Base UI `Menu.GroupLabel` issue is resolved in this build: the final test opens the real dropdown, switches between the original and newly created workspaces, and verifies customer, member and invitation isolation after navigation and reload.

The EN/ES role-preview tests persist `viewer` across settings navigation and reload: the invitation form is unavailable and workspace fields are disabled, while the actual member remains owner. Resetting to the actual role clears the preview. In the ownership-transfer receipts, `member-you` becomes `admin`, `member-isabel` becomes the sole active owner, and `previewRole: "owner"` survives reload without changing those member roles. Own-role and own-removal controls remain disabled before preview, during owner preview and after reload; the demoted admin cannot transfer ownership back through the preview. A separate persisted admin/owner-preview fixture proves the same transfer restriction. This verifies the local demo's actual-role guards and controlled UI; real integrations supply their own authorization.

Historical evidence remains under `/tmp/aureform-setup-1.2-qa/independent/` (22/22, excluding the then-unfixed dropdown) and `/tmp/aureform-setup-1.2-qa/final/` (23/23 before the extra self-role assertions). An additional EN assertion initially expected `Administrator` instead of the member control's actual `Admin`; that test expectation was corrected and both strengthened cases passed in the owner run. Initial connection refusal, transient `ENOSPC` and the later interrupted retake did not produce executed tests in those attempts. No unresolved functional product defect was observed in the final setup results.
