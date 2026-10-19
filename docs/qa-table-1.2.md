# Aureform 1.2 — DataWorkbench production QA

> **Historical checkpoint before the open-source release.** Results, pending work and references to private previews or archive licenses describe only the recorded version; they are not newly executed 1.3 checks. Distributed original Aureform work now uses [Apache 2.0](../LICENSE), including the sample, starter, design and original images. Earlier commercial proposals are not current terms; upstream notices still apply.

Target: `http://127.0.0.1:3012/en/customers/` and `/es/customers/`.

Status: **12/12 production browser cases PASS in 33.017 seconds, with zero retries, skipped cases, flaky cases or uncaught browser errors.** The complete final run started at `2026-10-19T14:15:43.355Z` against build `BTAW6zd9K-Lz9R_XmVIOo`. All sixteen fingerprinted source/build files remained unchanged during this run. No required DataWorkbench QA remains.

The original QA write scope comprises `tests/e2e/data-workbench.spec.ts` and this document. After reviewing the actual findings, the owner additionally authorized only `src/components/blocks/data-workbench.tsx` for the controlled-ID and popup-height fixes. The dashboard shell remains outside this agent’s write scope.

## Execution

The standalone Playwright config lives at `/tmp/aureform-1.2-workbench-qa/playwright.config.cjs`; it matches only `data-workbench.spec.ts`, uses Chromium, one worker, no retries and no `webServer`. It does not start or rebuild the application.

```bash
cd /tmp/aureform-ui-1.2
AUREFORM_BASE_URL=http://127.0.0.1:3012 \
  node node_modules/@playwright/test/cli.js \
  test --config=/tmp/aureform-1.2-workbench-qa/playwright.config.cjs
```

The first execution can be bounded to `--grep 'external page 2 starts'`. Browser launch failures must be preserved and reported rather than counted as application verdicts.

## Actual workflow assertions

| Case                     | Observable proof                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| External pagination      | Page 2 begins with Isabel Torres; totals stay 12; page-size changes render the supplied page without double pagination.                                                   |
| Sorting                  | Actual text and numeric row order changes; the downloaded CSV contains all 12 records in the requested order.                                                             |
| AND filters              | Status, plan, company, spend bounds and inclusive date bounds compose; chips remove one condition without clearing the others.                                            |
| Search                   | Page resets, spaces and accent folding work, empty results clear back to the complete directory.                                                                          |
| Selection and export     | Olivia and Isabel remain selected across pages; selected CSV contains both stable IDs; full export is not truncated to the current page.                                  |
| Columns                  | Visibility and order change DOM columns; a configured 320px width is measured; the pinned cell stays anchored during horizontal scrolling; reload restores configuration. |
| Saved views              | Create, load, rename, save as new, delete and reload use the real UI and workspace persistence.                                                                           |
| Shared URL               | Actual clipboard output contains only versioned query, columns and density; a fresh browser context restores the view; a local interaction releases the shared URL.       |
| Workspace isolation      | Studio and Personal retain different saved views and query state through switches and reloads; customer counts remain 12 and 3.                                           |
| Keyboard / accessibility | Keyboard selection and popup focus restoration; scoped WCAG 2/2.1 A/AA checks with complete Axe output.                                                                   |
| Spanish mobile           | 360px layout, translated controls, external paging, AND filtering, compact density and keyboard-accessible table scrolling.                                               |
| Mobile column popup      | Bounds fit the viewport; filter and column controls expose Spanish accessible names; scoped popup Axe checks.                                                             |

## Evidence and limits

Every executed test attaches uncaught browser errors, the actual URL and visible rows, compact workspace/view persistence evidence, and a production screenshot. Axe cases retain the complete analysis. Shared-link validation retains the actual serialized payload and the fresh-context screenshot.

Raw Playwright reports and screenshots are written outside the product source under `/tmp/aureform-1.2-workbench-qa/`. The final verdict comes from one complete run of all twelve cases, rather than a merge of earlier partial runs. Historical reports and their source checkpoints remain intact.

## Current production verdict

The complete final run passed every workflow in the table above, including the saved-view create/load/rename/copy/delete sequence, workspace isolation through switches and reloads, and both new regressions. Supplying `activeViewId={undefined}` clears the prior saved-view action; selecting the saved view again restores its query and settings. At 360×900 the column popup stays inside the viewport, its final date-column width input can be reached and focused through internal scrolling, and Escape restores trigger focus.

Four complete scoped Axe analyses report **zero violations**: desktop Workbench, desktop filter popup, Spanish mobile Workbench, and Spanish mobile column popup. These are scoped WCAG checks, not a whole-application accessibility certificate.

The final evidence directory contains 42 losslessly exported attachments, including 13 valid PNG screenshots, all four Axe reports, workspace/view checkpoints and browser-error reports. Screenshots were decoded from their actual inline Playwright report bodies; no extra browser run was needed.

- `final-full12-20261019T141309Z-report.json` — actual Playwright report; 12 expected, 0 unexpected, 0 skipped, 0 flaky.
- `final-full12-20261019T141309Z.log` — complete execution log.
- `final-full12-20261019T141309Z-source-checkpoint.json` — build ID and SHA-256 fingerprints captured before execution.
- `final-full12-20261019T141309Z-proof.json` — all twelve actual results, report/log hashes, before/after source comparison, attachment hashes and accessibility verdicts.
- `runtime3012/final-full12-20261019T141309Z/attachments-exported/manifest.json` — exact paths, sizes and SHA-256 values for all 42 attachments.
- `final-proof.json` — concise pointer to the completed final evidence.

DataWorkbench source SHA-256: `948820722af0312404966244a9276089b775675261ef89da1d3fda451ae6bceb`. E2E spec SHA-256: `513a26ddc49e6ac9be311c08e9d1d1a411b8eaed1359736e974eb2f6a0abaef8`.

## Historical production checkpoints

| Evidence                      | Actual result                                                                                                                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `post-rebuild-report.json`    | Five PASS: external pagination/page-size; text/numeric sorting and full CSV; search/clear/accent folding; stable selection IDs across pages and complete exports; column visibility/order/width/pinning and persistence. Seven initial failures, preserved with their original traces. |
| `retake-controls-report.json` | Four PASS: composed typed AND filters and filtered CSV; shared URL restored in a fresh browser context with native history push/back/forward and no reload; keyboard/filter focus restoration and scoped WCAG checks; Spanish 360px paging/filtering/density and keyboard scrolling.   |
| `merged-proofs.json`          | Nine PASS and three FAIL, with every result linked to its actual report. No product code changed between these runs.                                                                                                                                                                   |

The four retaken failures were test errors: the test sent Escape after the multi-select listbox had already closed on selection. The actual trace shows the selected chip appearing and then being cleared. The installed Base UI `ComboboxInput.js:290–298` explicitly clears the selected value when Escape is pressed on a closed input. The corrected tests assert the visible selected chip and move focus to a non-combobox field before closing the outer filter popup.

| Genuine defect                 | Actual production evidence                                                                                                                                              | Bounded proposal                                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controlled saved-view ID       | Choosing “Current view” after saving “QA Lumina” leaves the combobox displaying “QA Lumina”. The case stops before the remaining rename/copy/delete assertions.         | Distinguish a supplied `activeViewId={undefined}` from an absent uncontrolled prop. The current `activeViewId ?? internalActiveId` fallback restores a stale internal ID. |
| Workspace menu crashes         | Opening the workspace menu throws Base UI error #31 before “Personal space” is selectable. The installed `MenuGroupContext.js:18` identifies the missing group context. | Wrap the existing label and workspace items in `DropdownMenuGroup`; `DropdownMenuLabel` renders `Menu.GroupLabel`.                                                        |
| Mobile column popup is clipped | At 360×900, the popup bottom is 1110px. Its 630px height ignores the Positioner’s actual `--available-height: 415px`; the failure screenshot shows the clipped popup.   | Bound the column popup by `min(70dvh, var(--available-height))` while retaining vertical scrolling.                                                                       |

The original proposals remain preserved in `/tmp/aureform-1.2-workbench-qa/proposed/workbench-proposed-fixes.patch` and `workspace-menu-proposed-fix.patch`. The authorized Workbench changes are now applied: an own `activeViewId` prop is controlled even when its value is `undefined`; internal state is used only when that prop is omitted; the column popup height respects the Positioner’s available height. No public prop type changed. This agent did not apply the workspace patch.

Focused lint passed and the focused TypeScript program reported zero diagnostics. The saved-view regression additionally checks that “Current view” removes the previous saved-view delete action and reloading that view restores it. The mobile popup regression additionally scrolls to and focuses the final date-column width field inside the bounded popup. Both new assertions passed in the complete final production run. The owner’s workspace group correction also passed the complete workspace-switching case with no runtime error.

The owner requested and received a complete retake of all twelve cases after the final rebuild. Any later independent repeat must use a new output label to preserve the completed evidence:

```bash
cd /tmp/aureform-ui-1.2
AUREFORM_QA_RUN=another-unique-full-run \
  node node_modules/@playwright/test/cli.js \
  test --config=/tmp/aureform-1.2-workbench-qa/playwright.config.cjs
```

All three previously incomplete workflows are now complete proofs: saved-view rename/copy/delete, switching and reloading both workspace scopes, and all mobile popup accessibility and scrolling assertions.

## Execution checkpoint

| Report                               | Actual result                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseline-report.json`               | Chromium was blocked before navigation by `setsockopt: EPERM` / `SIGTRAP`; no application verdict.                                                                                                                                                                                                                                                             |
| `baseline-unsandboxed-report.json`   | Chromium reached production. Page 1, page 2 beginning with Isabel, page 3 with Lucas/Noor, total 12, the disabled final Next button, and returning to page 1 passed their assertions. The test then timed out on an exact-label selector for page-size. This test selector was corrected to the actual `combobox` role and accessible name; no product change. |
| `full-network-blocked-evidence.json` | All 12 actual error contexts and traces show `ERR_CONNECTION_REFUSED` at navigation; `.last-run.json` retains all 12 failed test IDs. Infrastructure failures, not product verdicts.                                                                                                                                                                           |

An independent `curl -I --max-time 5 http://127.0.0.1:3012/en/customers/` outside the sandbox also returned connection failure (exit7) during the historical server outage. The owner subsequently restored production before the two current runs. No server was started or rebuilt by this QA agent.

The spec passes its focused TypeScript check (one root, zero diagnostics) and scoped lint. Source and build fingerprints captured before navigation are retained in `/tmp/aureform-1.2-workbench-qa/source-checkpoint.json`.

The historical baseline snapshot exposed the global footer as `Aureform UI 1.1`. The restored production snapshot now displays `Aureform UI 1.2`. No product source was changed by this QA agent.

The restored build includes the owner’s shared-URL integration with `Suspense` and `useSearchParams`. The passing shared-URL case additionally exercises native history push/back/forward and checks that view state changes without a document reload.

The original full-run JSON was subsequently overwritten by a discovery-only `--list` invocation. Its listing output is preserved as `full-listing-report.json`; the connection-failure evidence above is explicitly derived from the unchanged actual contexts and traces, with their hashes. All later actual execution reports remain intact, including the complete final twelve-case run. Do not reuse its completed output label for discovery or another run.
