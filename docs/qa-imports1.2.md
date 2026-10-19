# Imports QA — Aureform 1.2

> **Historical checkpoint before the open-source release.** Results, pending work and references to private previews or archive licenses describe only the recorded version; they are not newly executed 1.3 checks. Distributed original Aureform work now uses [Apache 2.0](../LICENSE), including the sample, starter, design and original images. Earlier commercial proposals are not current terms; upstream notices still apply.

**PASS: 16/16 imports cases in the final owner-run suite**, including Light/Dark × EN/ES × desktop/mobile. The integrated report recorded 74 passing tests, no skipped, unexpected or flaky tests, and no global errors, with two workers and zero retries. This document records the imports evidence from that run.

Verification used `http://127.0.0.1:3012`, build `BTAW6zd9K-Lz9R_XmVIOo`. The final report started at `2026-10-19T14:55:36.862Z` and took 148.482 seconds across the complete suite. No imports product defect was observed. The original 54 pure tests and scoped static checks also passed.

The eight axe attachments report zero violations and `color-contrast` as `incomplete`. That rule is not an automated contrast pass; this evidence does not claim a complete accessibility audit.

## Source and ownership

Only these product files were changed:

- `src/lib/csv-import.ts`: dependency-free parser, mapping, validation, duplicate policies, sample serialization, result validation and the async attempt engine.
- `src/components/blocks/import-wizard.tsx`: reusable client component using the existing tokens and components, with EN/ES copy and a gradient header.

Own test files are `tests/csv-import.test.mjs` and `tests/e2e/imports.spec.ts`. The owner maintains the customer template, workspace persistence and build. This work added no package dependencies, backend, upload endpoint, provider changes or global configuration.

The final owner run captured 149 source, configuration and spec hashes before and after execution; both inventories match. An independent read of those 149 files at `2026-10-19T15:00:44.553Z` also matched. No source or spec was edited during the frozen owner run.

| File                                           |  Bytes | SHA-256                                                            |
| ---------------------------------------------- | -----: | ------------------------------------------------------------------ |
| `src/lib/csv-import.ts`                        | 32,377 | `459b24c40f0a17140a54ef3ff18258972596a24985944649f8426c4bb96b30b7` |
| `src/components/blocks/import-wizard.tsx`      | 47,547 | `cf3793d1f3cae9ba9eb4ec24b4cc6fd7dc0ef26532651f5513d76529732c46a2` |
| `src/components/templates/customer-import.tsx` |  4,965 | `cfffb1f5c83f190a61c7eb63abd3d8d75ec152cf8dee20ec432028c1b065f3c8` |
| `src/lib/saas.ts`                              | 11,260 | `2050d8d6c5f5975eddc16ed56793fa78ad1d865d99352ec3fe0756eb7f1a4830` |
| `tests/csv-import.test.mjs`                    | 31,180 | `276c4fb435d1e636725ef6e93d5c20108468cdcae443cc04ae48bc100c194eeb` |
| `tests/e2e/imports.spec.ts`                    | 36,442 | `98eadb5e7fed405674313a9417059d0f488156181080582372c82458bd04c484` |

## Validation contract

`CustomerImportRow` has `name`, `email`, `company`, `plan`, `status`, `amount` and `joined`, without an ID. The host assigns IDs while staging the callback's batch and then commits transactionally.

- A trimmed name must contain **2–120 characters**, matching the foundation schema. Tests cover lengths 1, 2, 120 and 121 and validate successful customer rows against the actual `customerSchema`.
- Email validation matches the foundation format and 254-character limit. The submitted spelling is preserved; `getCustomerImportKey` trims and lowercases only the duplicate key.
- Plans are `Starter`, `Pro` and `Enterprise`; statuses are `active`, `trial` and `paused`. CSV choices accept case-insensitive input and return canonical values.
- Company defaults to an empty string and is limited to 200 characters. Amount is a finite, nonnegative decimal. Joined must be a real `YYYY-MM-DD` date.
- Invalid records cannot be submitted unless the user explicitly chooses to skip them.

Default CSV limits are **5 MiB of UTF-8 input, 10,000 nonblank data records and 200 columns**. They are configurable through `limits`. Header rows and blank records do not count toward the row limit.

The parser handles a BOM, LF/CRLF/CR, quoted commas, doubled quotes and multiline fields. Malformed quotes, NUL characters, blank or normalized duplicate headings and reserved prototype keys are rejected. Row-width errors are displayed against the affected record. Mapping rejects missing required fields, invalid column indexes and reused source columns.

For duplicate keys, `skip` retains the first valid occurrence and leaves existing records unchanged. `update` retains the last valid occurrence and updates matching existing records. A later invalid occurrence never replaces an earlier valid one.

## Callback API and host integration

The public component is `ImportWizard<T>`, with exported `ImportWizardProps<T>`. Fields use `ImportField<T>` with bilingual labels, aliases, samples, optional default values, a parser and validation. Optional props include `getRowKey`, `existingKeys`, `validateRow`, `limits`, `sampleRows`, `sampleFilename`, `resourceHref`, `title`, `description` and `className`.

The callback receives:

```ts
type ImportContext = {
  mode: "skip" | "update";
  signal: AbortSignal;
  onProgress: (progress: {
    completed: number;
    total?: number;
    message?: string;
  }) => void;
};

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  failures?: readonly { index: number; message: string }[];
};

type ImportCallback<T extends object> = (
  rows: readonly T[],
  context: ImportContext,
) => Promise<ImportResult>;
```

Minimal customer integration, with `importRows` supplied by the host:

```tsx
import { ImportWizard } from "@/components/blocks/import-wizard";
import {
  customerImportFields,
  getCustomerImportKey,
  type CustomerImportRow,
  type ImportCallback,
} from "@/lib/csv-import";

// The host stages IDs and changes, observes cancellation, and commits atomically.
// importRows: ImportCallback<CustomerImportRow>
<ImportWizard<CustomerImportRow>
  fields={customerImportFields}
  getRowKey={getCustomerImportKey}
  existingKeys={customers.map(getCustomerImportKey)}
  onImport={importRows}
  locale={locale}
  sampleFilename="aureform-customers.csv"
  resourceHref={`/${locale}/customers/`}
/>;
```

The wizard only changes host data through `onImport`. Cancellation aborts the signal and waits for callback settlement. **The caller must roll back the current attempt before rejecting**, including abort rejection; the UI cannot undo external commits.

Returned counts must be nonnegative integers summing to the submitted row count. Optional failure indexes are zero-based indexes in that attempt's submitted rows and must identify every failed row exactly once. Identified partial failures permit retrying only those rows while accumulating earlier successful counts once. A rejected, rolled-back attempt can retry all its pending rows. An unindexed partial result, malformed fulfilled result or fulfilled result after cancellation does not permit automatic replay.

The owner template currently returns counts from its transactional customer adapter. Browser QA exercises that real integration. Identified partial-result retries are verified in the shared pure attempt engine, rather than claimed as a browser scenario supported by that adapter.

## Pure tests and static checks

`tests/csv-import.test.mjs` passed **54 tests across five suites**. Coverage includes:

- CSV grammar, physical/logical row locations, blank records and malformed input.
- Exact 5 MiB and 10,000-record boundaries, multibyte UTF-8, column limits and invalid limit options.
- Mapping, parsers, bilingual field errors, customer schema compatibility and input immutability.
- Skip/update policies, invalid duplicate occurrences, existing keys and invalid runtime keys.
- Sample escaping, CRLF output and formula-like text protection.
- Progress settlement, pre-abort, rollback completion, cancellation, rejection and retry.
- Multiple partial retries, source-row identity, accumulated counts, malformed results and unsafe replay prevention.

Scoped TypeScript checking and ESLint passed for the changed implementation and tests. No global build was run by this task.

From `/tmp/aureform-ui-1.2`:

```sh
# Detailed 54-test output:
node --experimental-strip-types tests/csv-import.test.mjs

# Standard Node test runner:
node --experimental-strip-types --test tests/csv-import.test.mjs

node node_modules/eslint/bin/eslint.js \
  src/lib/csv-import.ts \
  src/components/blocks/import-wizard.tsx \
  tests/csv-import.test.mjs \
  tests/e2e/imports.spec.ts \
  --max-warnings=0
```

On the installed Node 26 runner, the standard `--test` invocation reported the test file as one passing unit. Direct execution produced the individual 54-test results.

## Production browser results

The final owner report contains **16/16 passing imports tests** in project `saas-chromium`. Every imports result has `retry: 0`, an empty test-error array and a passing status. Each test used a fresh browser context, reduced motion and the real workspace persistence.

The eight original cases passed again:

| Case                 | Concrete verification                                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Download and mapping | Actual sample download; manually mapped `who`/`contact`; BOM, quoted commas, doubled quotes and multiline CRLF company; preview did not change data; one committed record preserved email spelling. |
| Duplicate policies   | Existing case-insensitive email match; first valid occurrence on skip, last valid occurrence on update; one-character name rejected; explicit invalid-row exclusion; existing IDs preserved.        |
| Grammar recovery     | Unclosed quote, duplicate/blank/reserved headings discarded an earlier valid draft; errors blocked continuation; replacement file recovered normally.                                               |
| Limits               | An actual 5 MiB + 1 byte file and a 10,001-record CSV were rejected before mapping without data changes.                                                                                            |
| Preview navigation   | Twelve rows paginated 10 + 2; invalid-row filter exposed the affected record and blocked continuation.                                                                                              |
| Cancellation         | Cancelled staging of 1,000 records left workspace data unchanged; retry created exactly 1,000 records once.                                                                                         |
| Rejected callback    | A one-time UUID failure in the real template's staging operation produced an error without a commit; retry committed exactly two records; resource navigation and reload preserved them.            |
| Spanish              | Actual ES file → mapping → preview → review → successful workspace commit used Spanish labels and result copy.                                                                                      |

The rejection case deliberately injected a temporary error into `crypto.randomUUID` after review. It did not replace the component, callback or workspace adapter.

The eight additional matrix cases passed at 1440×1000 on desktop and 360×900 with mobile/touch emulation:

| Device  | Theme | Locale | Outcome | Axe violations | Axe incomplete   |
| ------- | ----- | ------ | ------- | -------------: | ---------------- |
| Desktop | Light | EN     | PASS    |              0 | `color-contrast` |
| Desktop | Light | ES     | PASS    |              0 | `color-contrast` |
| Desktop | Dark  | EN     | PASS    |              0 | `color-contrast` |
| Desktop | Dark  | ES     | PASS    |              0 | `color-contrast` |
| Mobile  | Light | EN     | PASS    |              0 | `color-contrast` |
| Mobile  | Light | ES     | PASS    |              0 | `color-contrast` |
| Mobile  | Dark  | EN     | PASS    |              0 | `color-contrast` |
| Mobile  | Dark  | ES     | PASS    |              0 | `color-contrast` |

Each matrix case downloaded the actual sample and imported a BOM CSV with manually mapped `who`/`contact` headings, quoted multiline content, an existing email, two occurrences of a new email, one invalid one-character name and 1,000 additional valid rows. It exercised the invalid-row filter, update policy, explicit invalid exclusion, review, cancellation, retry, resource navigation and reload.

Cancellation left the original workspace unchanged. Retry produced exactly **1,001 created, 1 updated, 2 skipped and 0 failed** records from 1,004 input records. Existing IDs and the submitted email spelling were preserved; the last valid duplicate occurrence was used once. The theme persisted after navigation and reload.

Every matrix case checked that the page had no horizontal overflow. Each mobile case also proved that the table retained all columns and could scroll horizontally inside its container. One actual PNG from each of the eight combinations was opened and inspected; the reviewed previews and review screens kept controls, text and footer actions inside the layout.

All 16 runtime attachments contain empty error arrays. No uncaught page errors, hydration/nesting errors or nested buttons were observed. Axe was scoped to the wizard with WCAG 2 A/AA and 2.1 A/AA tags. Its eight stored matrix results have zero violations, but all retain `color-contrast` under `incomplete`; no contrast certification is inferred from those results.

Reproduce against an existing server without building, starting another server or changing shared configuration:

```sh
AUREFORM_BASE_URL=http://127.0.0.1:3012 \
node node_modules/@playwright/test/cli.js test \
  tests/e2e/imports.spec.ts --project=saas-chromium \
  --workers=1 --reporter=list \
  --output=test-results/imports-1.2-retake \
  --max-failures=1
```

The spec has **no `baseURL` override or hardcoded 3012 fallback**. It inherits the shared configuration. Setting `AUREFORM_BASE_URL` selects an existing server and disables the shared web-server launcher; normal `pnpm test:e2e` inherits the configured server on 3001. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` optionally overrides Chromium's executable. The owner's final run used native `/usr/bin/chromium-browser`.

## Durable evidence

The primary proof directory is `/tmp/aureform-owner-qa-1.2/final-flows/`:

- `report.json`: 24,738,710 bytes; SHA-256 `00c3f44a74a6723536984d884d090c570e69852b6154643d8808be05f4ddf03e`.
- `summary.json`: 2,725 bytes; SHA-256 `2fdbeeb531da145793927b78b45f91165a568b419054b7cdda83e454239fc1bd`. Its imports entry records 16 passed, zero failed/skipped/retried results, eight axe runs with zero violations and eight incomplete rule results, and 16 page-error assertions with zero errors.
- `playwright.config.cjs`: the owner-run configuration with two workers, zero retries and 3012 supplied through `use.baseURL`.
- `source-before.json` and `source-after.json`: matching 149-file source/config/spec inventories and build ID. Their recording timestamps differ. The summary records SHA-256 `c916f427e79a439f9360730416c68376778b17fedffbd99ee57ef52b549f53cd` before and `8fc5d6a9d49cbdb0f0eb3dce4207379825d394e1b15ac047c663f8976a1508a2` after.
- `results/imports-source-build-start.json` and `results/imports-source-build-end.json`: matching 19-file import/build inventories, two served HTML routes, 12 served JS/CSS assets and two RSC payloads. Capture timestamps differ; the pinned content matches.
- The imports entries in `report.json` identify **42 readable attachments**: 18 PNGs, 16 runtime JSON files and eight axe JSON files. All attachment paths were read independently; their contents agree with the reported results.

The served HTML, JS/CSS assets and RSC payloads were compared to their actual `out/` files. The RSC payloads returned `text/plain; charset=utf-8`.

| Pinned input                           |  Bytes | SHA-256                                                            |
| -------------------------------------- | -----: | ------------------------------------------------------------------ |
| `.next/BUILD_ID`                       |     21 | `0a2bef43296f5a8ecd99d208fe28995188ebe05b0a7b34053470523e98a32d7f` |
| `.next/build-manifest.json`            |  1,785 | `6581c1de332ae644e8f6569f7ce5b55ed87c8b7e9c54eb6074956de3fee8cd48` |
| `.next/server/app-paths-manifest.json` |    214 | `a1d64f779871e7fe082a4033ddd67f4775841ee4f8b1b9be290240d387a4b960` |
| `/en/imports/` HTML                    | 50,870 | `8962b4dfe64651f59ab543eb6a42795c1077eb8fd31f7a7ed16d4f97ffa2dd78` |
| `/es/imports/` HTML                    | 51,001 | `d210b1962f2ff40e27361b05376247874430e0b30ff914ee0260a9e921822f7a` |
| `/en/imports/index.txt`                |  7,159 | `cffabb1aaa4f007bf6f686b7abf72304aa0a61013ab48799f5c47f6e51040303` |
| `/es/imports/index.txt`                |  7,162 | `ade9ca21945577f7d94019df81a52bc0ba46bc9a2093d41930f1ca89628dafe4` |

The following owner captures were opened and inspected. Paths are relative to the proof directory's `results/`; the report also preserves each corresponding attachment path.

| Matrix           | Opened file                                                                                               | Dimensions |   Bytes | SHA-256                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------- | ---------- | ------: | ------------------------------------------------------------------ |
| Desktop Light EN | `imports-imports-matrix-des-1f5c9-try-use-real-workspace-data-saas-chromium/desktop-light-en-preview.png` | 1440×2285  | 651,379 | `ffbdc515d7cd3cb55e6c2845ce0f592cea1dda5f3e7460005edae51134d49546` |
| Desktop Light ES | `imports-imports-matrix-des-b50cf-try-use-real-workspace-data-saas-chromium/desktop-light-es-review.png`  | 1440×1199  | 440,987 | `63d7fa04e49627a0b591683dda75527fe1356deb3467ac9f4302714d5cc4a041` |
| Desktop Dark EN  | `imports-imports-matrix-des-1f430-try-use-real-workspace-data-saas-chromium/desktop-dark-en-preview.png`  | 1440×2285  | 751,072 | `7e5ec4d0a4a884a9d2e8971be30be2090712ab0c97d0c3b0e96521cf9a62d2eb` |
| Desktop Dark ES  | `imports-imports-matrix-des-28809-try-use-real-workspace-data-saas-chromium/desktop-dark-es-review.png`   | 1440×1199  | 496,788 | `58dcf3ddd5fadc8d1dc21cbbcac90581d0dca5f946a3e487c0a18f976760bc0a` |
| Mobile Light EN  | `imports-imports-matrix-mob-540bb-try-use-real-workspace-data-saas-chromium/mobile-light-en-preview.png`  | 360×2802   | 311,474 | `9d9ec95556fa358fbb33c87b110ab84ce6fe722aa56e39c5eb2921ddc1f85c6b` |
| Mobile Light ES  | `imports-imports-matrix-mob-25c35-try-use-real-workspace-data-saas-chromium/mobile-light-es-preview.png`  | 360×2874   | 328,100 | `8c9d8face22640f8be9fe8c04d219294911f73d380c8173efe3d104f3bdace20` |
| Mobile Dark EN   | `imports-imports-matrix-mob-739b3-try-use-real-workspace-data-saas-chromium/mobile-dark-en-review.png`    | 360×1693   | 273,558 | `a0781c15881401acae94d1832130fb8041509cbe4c781d0409d4e7f91c718758` |
| Mobile Dark ES   | `imports-imports-matrix-mob-05486-try-use-real-workspace-data-saas-chromium/mobile-dark-es-review.png`    | 360×1769   | 289,493 | `86d86159a092b9327eb884c7c5625fe38ad1af545514977e747e6bcaf09317c2` |

## Historical attempts

These entries remain historical; they do not substitute for the final owner proof above. No earlier attempt was deleted or overwritten by this documentation update.

| Attempt                                 | Original output location                          | Observed result                                                                                                               |
| --------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Initial sandbox launch                  | `test-results/imports-1.2/`                       | Chromium terminated before navigation with `setsockopt: Operation not permitted` and `SIGTRAP`; seven tests did not run.      |
| First native launch                     | `test-results/imports-1.2-native/`                | `ENOSPC` while creating the output directory, before a worker ran.                                                            |
| Original browser checkpoint             | `test-results/imports-1.2-native-retry/`          | 8/8 PASS in 10.6 seconds, session `83056`.                                                                                    |
| Screenshot persistence check            | `test-results/imports-1.2-evidence/`              | 2/2 PASS in 4.0 seconds, session `55687`. The spec now writes PNGs before attaching their paths.                              |
| First final-build retake                | `test-results/imports-1.2-final-3012/`            | `ECONNREFUSED 127.0.0.1:3012` in build preflight; no UI case executed.                                                        |
| Restored-server retake                  | `test-results/imports-1.2-final-live-3012/`       | 16/16 PASS in 48.3 seconds, session `6290`; same build ID and import source hashes.                                           |
| Configuration-only verification request | `test-results/imports-1.2-config-inherited-3012/` | Interrupted before a completed result; no PASS is claimed. The final owner run subsequently verified inherited configuration. |

The final evidence is the owner report and its current proof directory. The documentation closes imports QA for that pinned build, while retaining the explicit axe contrast limitation.
