# Independent consumer verification — 1.2

> **Historical checkpoint before the open-source release.** Results, pending work and references to private previews or archive licenses describe only the recorded version; they are not newly executed 1.3 checks. Distributed original Aureform work now uses [Apache 2.0](../LICENSE), including the sample, starter, design and original images. Earlier commercial proposals are not current terms; upstream notices still apply.

This runner verifies actual installation, strict TypeScript, lint and production static builds in fresh temporary consumers. **The final 1.2 retake passed all three consumers and 811/811 checks:** custom-alias CLI add, official shadcn HTTP installation and CLI init followed by SaaS add. All three passed actual typecheck, zero-warning lint and production builds. The owner's source build and global unit results are separate evidence. ZIP consumption remains pending until the owner provides the final files and the SHA-256 of their checksum manifest.

The owned runner is [`scripts/verify-saas-consumers.mjs`](../scripts/verify-saas-consumers.mjs). It does not rebuild the shared source kit, substitute product files after installation, share `node_modules`, use credentials or operate a browser or Figma.

The first combined six-mode attempt is preserved at `/tmp/aureform-consumers-1.2-delivery-final`. Four modes completed; Source correctly rejected two raw internal anchors in the generated test host, and Free stopped when temporary inodes were exhausted. The test host now uses the installed Next.js `Link` component, following its bundled guide, without suppressing the lint rule or changing product components. Only inactive owned consumer caches were removed; sources, manifests, logs and reports remain. The final retake uses a new archive pin and fresh consumers, with its result recorded in the external delivery receipt.

## Contract and priority

| Mode       | Actual installation and host                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cli-add`  | A fresh Next.js host with `~/* → ./*`, `~/design`, `~/design/ui`, `~/core` and `~/hooks`. Actual CLI dry-run and diff precede actual add.                                      |
| `registry` | A fresh `@/* → ./src/*` host. A real consumer-local installation of the pinned official shadcn CLI consumes the live HTTP registry.                                            |
| `cli-init` | Actual CLI init with its default pnpm installation, followed by add of the SaaS items into that generated starter. The existing home remains intact.                           |
| `source`   | A fresh extraction of the exact final source ZIP, its supplied lockfile and an additional consumer host route.                                                                 |
| `starter`  | A fresh extraction of the final starter ZIP. Its new SaaS items are added by the CLI from the exact source ZIP in the same pinned manifest.                                    |
| `free`     | The exact eight-component MIT sample in a separately installed Next.js host. Framework and tooling are added to its manifest; supplied library files and styles are preserved. |

The first three modes prioritize `onboarding-flow`, `member-management`, `data-workbench`, `import-wizard`, `customer-detail`, `record-detail` and `workspace-provider`. The host renders their real exports, including `GenericRecordDetail`, beneath `NextIntlClientProvider` and the installed `WorkspaceProvider`, in EN and ES.

Typed caller-owned callbacks cover onboarding completion, membership operations, import results, saved views and customer edits. The external table receives a page of two synthetic records and an authoritative total of three. Production HTML must contain the supplied page rows and exclude the unloaded row. This is frontend integration evidence; no invitation delivery, production authorization, database or browser interaction is certified.

## Commands

Use Node 22.16+ and pnpm on PATH. ZIP validation and the runner's in-memory archive contract tests require Python 3.9+. The source kit must identify itself as `1.2.0`. Run the commands with a non-login shell in the shared 1.2 checkout.

Read-only planning and pure runner checks:

```sh
node scripts/verify-saas-consumers.mjs --plan
node scripts/verify-saas-consumers.mjs --self-test
node --check scripts/verify-saas-consumers.mjs
```

The focused installer regression suite passed 26 named tests. It covers import syntax, unchanged snippets and external aliases, independent compiler resolution of the actual copied WorkspaceProvider graph, init followed by add, receipt hashes and existing file protections:

```sh
node --experimental-strip-types --test --test-isolation=none \
  tests/installer-preview.test.mjs tests/installer.test.mjs
```

After the owner announces production 3012 ready, prioritize CLI add and official HTTP installation:

```sh
node scripts/verify-saas-consumers.mjs --run \
  --kit /tmp/aureform-ui-1.2 \
  --base-url http://127.0.0.1:3012 \
  --modes cli-add,registry \
  --out /tmp/aureform-consumers-1.2-http-UNIQUE
```

Run the generated starter separately, or omit `--modes` to execute all three core consumers:

```sh
node scripts/verify-saas-consumers.mjs --run \
  --kit /tmp/aureform-ui-1.2 \
  --modes cli-init \
  --out /tmp/aureform-consumers-1.2-init-UNIQUE
```

Each output directory must be new and outside the source kit. Modes execute sequentially, including installations; separate mode processes are unnecessary. Previous failure reports are preserved. If temporary inodes are scarce before the final run, dependency/build caches (`node_modules` and `.next`) from completed owned consumers can be removed while retaining their `out`, source files, manifests, lockfiles, logs and reports. Active 1.2 directories must be preserved.

The default install uses pnpm's configured store, `--prefer-offline` and `--ignore-scripts`. It does not force a historical store path or introduce dependency overrides. Supply `--store-dir /absolute/existing/store` when needed. `--offline` is an explicit cache-only choice; missing packages remain a recorded failure. The default CLI init inherits the same install policy and runs with `CI=0`, matching a new local project. Other command steps use `CI=1`.

Every project runs a real install followed by `pnpm install --frozen-lockfile`; the replay must preserve the actual lockfile. The source ZIP's first install uses its supplied frozen lockfile. Consumers then run:

```sh
pnpm exec tsc --noEmit
pnpm exec eslint . --max-warnings=0
pnpm build
```

The standard ESLint configuration is the source kit's existing configuration, copied without additional suppressions. It is part of the input hash inventory.

## CLI protection and receipt checks

In the fresh custom-alias consumer, both `--dry-run` and `--diff` must preserve the complete tree, including file bytes, modes, inodes, directory membership and modification timestamps. They must leave no receipt, lockfile or `node_modules`.

After actual add, the verifier recomputes every receipt's raw source and installed target hashes, checks origin/name/version and primary source membership, and checks that recorded dependencies appear in the consumer manifest. A repeated add must preserve file bytes and metadata, with no residue. Directory timestamps are excluded only from the idempotence comparison because an actual installation briefly acquires its project lock.

The verifier appends a synthetic customization in its own consumer. Preview must identify a customized conflict, actual add must reject it without changing any files, and an explicit overwrite diff must remain nonmutating. Only the subsequent explicit real overwrite may restore the source. All receipts are rechecked afterwards.

The CLI rewrites actual module literals in imports, type imports, re-exports, literal dynamic imports and require calls. Resolution uses the source graph and the consumer's configured import paths. It preserves external packages and aliases, comments, example strings, template text, regexes and JSX text or attributes. Executable imports inside template substitutions and JSX expressions are still recognized.

A relative import stays byte-identical when its source and copied dependency retain the same relative relationship. When a configured destination changes that relationship, the CLI uses the dependency's configured alias. For example, `demo/saas-data.ts` keeps `./dashboard-data`, while its original `../lib/saas` becomes `~/core/saas` in the custom consumer. In the default starter both original relatives remain correct, so init followed by add needs no overwrite of untouched bootstrap files. Receipt source hashes always describe the raw kit bytes; target hashes describe the actual preserved or rewritten consumer bytes.

## HTTP and archive provenance

The runner captures `/r/index.json`, `/r/registry.json` and each selected HTTP item. Their exact bytes must match the selected source kit's generated files. Index and standard registry inventories must agree, and required SaaS keys must exist. The installed official shadcn package validates registry documents with its own schemas. The official CLI performs its normal source, alias, dependency and CSS transformations; the verifier makes no library repairs.

The registry count is read from current documents, rather than hardcoded to the historical 83 entries. All consumed HTTP hashes are checked again at the end. Relevant source/configuration hashes are captured at the start and end; source drift invalidates the run. This inventory includes product source, tokens, configuration, registry descriptors and the executing runner. CLI/source/starter modes also include the CLI and its generator/helpers. Unrelated QA scripts and Figma evidence are outside that inventory.

When final ZIPs are ready, use the owner's explicit pin:

```sh
node scripts/verify-saas-consumers.mjs --run \
  --kit /tmp/aureform-ui-1.2 \
  --modes source,starter,free \
  --checksums /absolute/final/checksums.json \
  --checksums-sha256 OWNER_PROVIDED_64_HEX_SHA256 \
  --out /tmp/aureform-consumers-1.2-zip-UNIQUE
```

Python's independent standard ZIP reader checks every archive declared in the manifest, including the two companion native-evidence ZIPs, rather than silently skipping entries outside source/starter/free. All archives receive byte-length, SHA-256, file-count, CRC and normalized unique relative-path checks, regular-file validation and extraction confinement. It rejects traversal, encrypted entries, packaged dependency/build directories, environment files and nested generated downloads.

Only source/starter/free require `package.json`, package/starter version metadata and their documented payloads. The companion `aureform-ui-native-evidence-1.1.zip` and `aureform-ui-native-evidence-1.2.zip` do not require a package or enter installation/typecheck/build modes. They are extracted into separate `consumers/evidence/<archive-name-without-.zip>` directories and recorded with their actual names, file hashes and `consumerRequired: false`. Historical evidence is allowed under a current manifest; its bytes receive the same integrity checks. This certifies archive integrity, not native visual or structural approval.

Every captured source input must match its exact entry in the source ZIP, including lockfile, configuration, tokens, CLI, generators and the frozen executing runner. Protected compile inputs include supplied app CSS, other source libraries, tokens and shipped scripts/CLI; adding the host does not authorize repairing them. Old source/free package versions are never fallback inputs. The manifest and **all declared archive hashes, including both evidence ZIPs**, are checked again after execution.

After the owner freezes the exact five-entry manifest and provides its SHA-256, all six consumer modes can run in one sequential invocation:

```sh
node scripts/verify-saas-consumers.mjs --run \
  --kit /tmp/aureform-ui-1.2 \
  --base-url http://127.0.0.1:3012 \
  --modes cli-add,registry,cli-init,source,starter,free \
  --checksums /absolute/final/checksums.json \
  --checksums-sha256 OWNER_PROVIDED_64_HEX_SHA256 \
  --out /tmp/aureform-consumers-1.2-six-modes-UNIQUE
```

The checksum path and pin above are required owner inputs, not inferred values. This command has not yet been run against the final ZIPs.

## Evidence and present status

Each real run writes `consumer-report.json`, `source-inputs-start.json`, `source-inputs-end.json`, command logs and metadata under its chosen output directory. HTTP runs also preserve the actual payloads; ZIP runs preserve the archive inventory and the independent inspector's hash.

The report records executed checks, command arguments, exit codes, signals, timings, log hashes, resolved package versions, local package paths, lockfile hashes, installed library hashes, build IDs and exported HTML hashes. Every declared dependency must resolve within that consumer's real `node_modules` directory. pnpm store links are allowed; reusing another project's installed dependency tree is not.

`PASS` applies only to the selected consumers and the captured input bytes. It requires actual commands and checks, preserved library bytes and unchanged source/HTTP/archive inputs. Unselected ZIP modes remain explicitly pending. Runner self-tests and planning output are never counted as consumer installation proof.

| Evidence                                | Status                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------- |
| Runner syntax, lint and contract checks | PASS; 16 contracts, including the in-memory five-ZIP fixture test.         |
| Focused installer regressions           | PASS; 26 named tests. Scoped CLI/test/runner lint passed without warnings. |
| CLI add independent consumer            | PASS; 440/440 checks, custom aliases and actual production build.          |
| Official shadcn HTTP consumer           | PASS; 109/109 checks, seven items from the 96-item live registry.          |
| CLI init independent consumer           | PASS; 262/262 checks, default install followed by SaaS add.                |
| Final source/starter/free ZIP consumers | Pending owner artifacts and explicit manifest pin.                         |

### Frozen six-mode runner checkpoint

The current runner adds ZIP-only integrity protections after the executed three-consumer checkpoint below. Its self-test inspected five synthetic archives, accepted both evidence archives without package metadata, and rejected six deliberate defects: SHA, CRC and traversal for each evidence ZIP. It starts no consumers or installs and writes no files; Python executes in memory with bytecode writing disabled. These results do not certify future release ZIPs.

| Current QA input       | SHA-256                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| Six-mode runner        | `4608df8476bd40763522cd8348c6bbd4a08ca418997479f6736a291b97007207` |
| Embedded ZIP inspector | `e361396628350b986e76d96282b2408a48a76a9dde4008f76f1deebe4e3e8cd8` |
| Unchanged CLI          | `73fa08bbb372cea33dd974122815edd517388fcbfa94150e48e7983f5eaaf6c7` |

`--self-test` reports its actual runner and inspector hashes. Freeze this runner before packaging because the source ZIP comparison includes its shipped bytes. The earlier 811-check report remains bound to its own executed runner hash; it is not retroactively relabelled as proof of these new ZIP guards.

### Final executed consumer checkpoint

Report: `/tmp/aureform-consumers-1.2-final-20261019-g/consumer-report.json`.

The run completed at `2026-10-19T14:01:20.754Z` in 56.9 seconds. It executed three consumers with separate real dependency trees: CLI add installed 432 packages; the registry host installed its 556-package base and then used consumer-local shadcn 4.22 to install all seven HTTP items and their dependencies; CLI init installed its 431-package starter and then its additional SaaS dependencies. Each performed a frozen lockfile replay, strict typecheck, lint with `--max-warnings=0` and a production build. EN and ES host routes and the existing home were exported in each consumer.

All 33 command outcomes matched their expectations. Two are intentional exit-1 protection tests for a customized CLI file; all installation, typecheck, lint and build commands exited zero. The 811 checks comprise 440 CLI-add checks, 109 registry checks and 262 CLI-init checks. Source inputs, all nine captured HTTP payloads and installed library bytes remained unchanged. A separate readback verified 421 distinct file hashes, including command logs, source inputs, receipts, installed libraries, dependency manifests and production outputs, with no mismatches. That readback is not added to the runner's 811-check count.

| Bound input/output                   | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| Final report                         | `1d44b85a14e014b609d33ae05e00cc201ba92b51bca5d903fca31e9b8702cbf5` |
| Source inventory, both start and end | `798e38d0cb7e1b06101488280b636c68857b10b3079ac76aaed400cb7afb65f4` |
| Executed CLI                         | `73fa08bbb372cea33dd974122815edd517388fcbfa94150e48e7983f5eaaf6c7` |
| Executed runner                      | `74929117de7fab3721341e30bd983099af2842e6629db30ab2bb237244480b5b` |
| Installer preview regression file    | `60e9b47bcfd5449d242de2234edf0420db35b73d097ca1ebb488e4a3d0b78af5` |
| Captured standard HTTP registry      | `c7db5bd3a9b13ab563815cf9b84dda7bb02b8fe0c370f0266ffcdf4169c0d670` |

| Consumer | Actual lockfile SHA-256                                            | Preserved installed library inventory SHA-256                      |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| CLI add  | `ffc93c3399a23b77f7bad4c42ee77d6ddd486dd0ffd06a23b628c2d7dbc9e71e` | `0f05b1fb09047c884fb4b73a2000523c0fa04696ce465c8539922e2deea674a1` |
| Registry | `b340d8eeddfb772cdb0890e33d8efa3f42bed08169e4cf642a1230af38242148` | `0d226b640039c107da3a74457a2077e30674248fe5934817f8eff48041c97d39` |
| CLI init | `893123f06dfba547c35c89e2cf41df71033a897c32bdab8f35f90a0ac6cea573` | `f4bccfe353be910f94c7bf2bdbacfd22c922a476fac9167cb703afd05c957154` |

The actual environment was Node 26.7.0, pnpm 10.34.5 and store `/tmp/.pnpm-store/v10`. Installed package versions, physical paths, receipts, build IDs and HTML hashes are recorded in the report. No historical cache path, package version substitution or dependency override was forced.

No shared-source registry generation was necessary for this CLI-only correction. The runner consumed and checked the owner's existing generated 96-item registry against its exact local bytes. This checkpoint certifies consumer installation and static frontend integration for the captured inputs. It does not certify unexecuted ZIP consumption or browser interactions.

### Earlier CLI init checkpoint retained

Report: `/tmp/aureform-consumers-1.2-init-20261019-d/consumer-report.json`.

This earlier run predates the CLI import correction; it is separate historical evidence. It completed at `2026-10-19T13:18:22.634Z` in 19.8 seconds. CLI init installed 431 packages into its own directory; CLI add then installed the additional required dependencies. The frozen replay, strict typecheck, zero-warning lint and production build all exited zero. The generated home and EN/ES consumer routes were exported; installed library bytes and source inputs remained unchanged.

| Bound input/output                   | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| Report                               | `7ec04c26190eb61a9a890509d6d45d7e85f4616839892277fe7f787e359fec6e` |
| Source inventory, both start and end | `f033e5e75ac767d0716c9c666cbad776b7459682959f4d9137a470745e6d2689` |
| Executed runner                      | `74929117de7fab3721341e30bd983099af2842e6629db30ab2bb237244480b5b` |
| Consumer lockfile                    | `893123f06dfba547c35c89e2cf41df71033a897c32bdab8f35f90a0ac6cea573` |
| Installed library inventory          | `b3db77b918e697a48bca257d782c4bb1de1fa36eb9fc26f0093daa061555ac2c` |

The actual environment was Node 26.7.0, pnpm 10.34.5 and store `/tmp/.pnpm-store/v10`. Package versions and physical paths are recorded in the report. No historical cache path or dependency override was forced.

### Failures retained as historical evidence

`/tmp/aureform-consumers-1.2-http-20261019-b/consumer-report.json` records two actual consumers against the 96-item HTTP registry. Its 499 explicit checks passed, but two mandatory commands failed; **the run is FAIL**, not a consumer pass.

- CLI add passed 415 checks including nonmutation, receipt hashes, idempotence, protection, explicit overwrite and a real 432-package installation. In that run, `demo/saas-data.ts` retained `../lib/saas` after the consumer mapped `lib` to `core`. TypeScript reported TS2307. The precise log is `logs/012-cli-add-typecheck.log`. The CLI correction and final retake above resolve this failure; no consumer library repair or weakened alias test was used.
- Official shadcn 4.22 installed all seven items and created 41 files through HTTP. Both official schemas and actual typecheck passed. Lint found two anonymous default-export warnings in the verifier's generated `next.config.mjs` and `postcss.config.mjs`. The runner now generates named configuration variables, retaining `--max-warnings=0`. The old failure remains in `logs/019-registry-lint.log`.

The initial sandbox attempt `/tmp/aureform-consumers-1.2-http-20261019-a/consumer-report.json` and the subsequent unavailable-server retake `/tmp/aureform-consumers-1.2-registry-20261019-c/consumer-report.json` each executed **zero consumers**. They are not installation or product failure evidence. The latter failed HTTP capture, and an unsandboxed direct curl subsequently reported connection refused on 3012.

`/tmp/aureform-consumers-1.2-retake-20261019-e/consumer-report.json` then passed both CLI add and registry with 549/549 checks at `2026-10-19T13:50:37.766Z`. It captures the first import correction before the subsequent preservation of already-correct starter relative imports. Its input hashes belong to that intermediate checkpoint.

`/tmp/aureform-consumers-1.2-final-20261019-f` is an interrupted run on the final CLI bytes. CLI add completed 440 checks and its typecheck, lint and build; registry and init hit `ERR_PNPM_ENOSPC`. `/tmp` had exhausted all 1,048,576 inodes. The process ended, but disk exhaustion also prevented the final report save: the last saved JSON remains `RUNNING`, with registry marked failed and init unfinished. It is not an aggregate PASS or a still-active process. Logs and saved source/report artifacts are retained; dependency and build cache directories from completed consumers can be discarded while retaining their `out`, sources, lockfiles, logs and reports.

After space was recovered, the fresh `final-20261019-g` run completed all three modes on the final CLI bytes. Its complete 811-check report is the authoritative checkpoint above. ZIPs still require their final owner-provided pin.
