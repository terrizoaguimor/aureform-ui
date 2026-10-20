# Official shadcn directory: local readiness evidence

Checked **2026-10-20 UTC**, completed at **05:49:26 UTC**. No external PR, issue, form or message was submitted. This report adds local technical evidence to the [existing proposal](github-submissions.md); it does not reserve a namespace or establish acceptance.

**Result:** the original upstream validator passed against a fixture containing only the proposed Aureform entry. A fresh Next.js consumer installed Button and the appearance provider through a manually configured `@aureform` namespace, passed TypeScript and a production build, and passed a scoped interaction probe with one recorded fixture favicon warning.

## Source identities and isolation

- Aureform production source: [`0caf7c8874ea8bb2b1580c0d59a9bda4497cbdd4`](https://github.com/terrizoaguimor/aureform-ui/commit/0caf7c8874ea8bb2b1580c0d59a9bda4497cbdd4), version **1.4.1**, confirmed by [`build-info.json`](https://aureformui.com/build-info.json) before installation and after the typecheck/build.
- Upstream source: [`ba1503c64472b82256d9de95e2e62c5901a38e8b`](https://github.com/shadcn-ui/ui/commit/ba1503c64472b82256d9de95e2e62c5901a38e8b), retrieved from public `main` with a shallow sparse clone.
- All temporary packages, consumer source, builds, logs and fixtures are under `artifacts/github-readiness/`. The application root, its dependencies, export output and existing promotion guides were not used as write/build targets.
- Every npm invocation used `NPM_CONFIG_USERCONFIG=/dev/null` and an npm cache inside the isolated artifact directory.

Before writing consumer code, the bundled Next.js **16.4.2** App Router guides were read: `01-installation.md`, `05-server-and-client-components.md` and `11-css.md`. The consumer uses their manual installation, client/provider boundary and Tailwind PostCSS setup.

## Original upstream validator

The inspected [script](https://github.com/shadcn-ui/ui/blob/ba1503c64472b82256d9de95e2e62c5901a38e8b/apps/v4/scripts/validate-registries.mts) reads `registry/directory.json` relative to its working directory. It validates the directory schema and the projected public `/r/registries.json` payload. It does **not** fetch registry endpoints or install components.

The [schema](https://github.com/shadcn-ui/ui/blob/ba1503c64472b82256d9de95e2e62c5901a38e8b/apps/v4/lib/registry-directory.ts) requires a valid namespace, homepage, URL containing `{name}`, description and logo; it rejects unknown fields and case-insensitive duplicate names.

The checked original directory contained **479 entries**, with no case-insensitive match for `@aureform`. That is an availability observation at this commit, not a reservation. The existing draft entry was extracted unchanged into `candidate.json`; the original directory was retained separately. Only the sparse clone's input directory was replaced with `[candidate]`.

The script, schema, both script configuration files and upstream application `package.json` were compared byte for byte with `git show HEAD:<path>` and remained unmodified. Runtime dependencies matched the upstream lockfile: **tsx 4.20.3** and **zod 3.25.76**. Only the dependencies needed by the inspected validator were installed; the full upstream monorepo was not installed.

Executed from the isolated artifact directory:

```sh
export NPM_CONFIG_USERCONFIG=/dev/null
export NPM_CONFIG_CACHE="$PWD/npm-cache"

npm install --prefix runtime --no-audit --no-fund
npm install --prefix runtime tsx@4.20.3 --save-exact --no-audit --no-fund
npm --prefix upstream/apps/v4 run validate:registries
```

The runtime package pins `zod` to `3.25.76`; the sparse clone's `apps/v4/node_modules` points only to this isolated runtime. The upstream npm script executes its original command:

```sh
tsx --tsconfig ./tsconfig.scripts.json ./scripts/validate-registries.mts
```

**Exit code: 0.** Both `directory.json` and the public projection passed. The script's “All registries” output refers to the **single-entry fixture**. This is an execution of the original validator with isolated input, not an adapted validator, a check of the other 479 entries, or a run of the root `pnpm validate:registries` wrapper. No approval gate prevented execution.

| Input                        | SHA-256                                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| Original validator script    | `08bcd964952e48e499f6fa9d4dfb3b0c6ec87441f42f4548a15d4551504f31d2` |
| Original directory schema    | `8873c74071b490ec420d890bb7324520262ae13bf702185f47a7d9c1fd91b272` |
| Original 479-entry directory | `0751f102363287d88664eb3dac137a31dd7091aa532f67010d10402368a363f9` |
| Candidate JSON               | `5a7cda1125bb176632aa6e07bc0e4a28b48f92d150b9ed79e5a83ab71ffb5660` |

## Fresh consumer installation

The consumer was created manually in `artifacts/github-readiness/consumer/`, with its own package manifest, lockfile, `node_modules`, configuration, `src/app/` and `.next/`. It uses no product-source substitutions or local registry payload repairs.

Observed environment: **Node 26.7.0**, **npm 11.19.0**. Installed package versions:

| Package                         | Version         |
| ------------------------------- | --------------- |
| shadcn                          | **4.22.0**      |
| Next.js                         | 16.4.2          |
| React / React DOM               | 19.3.1          |
| Tailwind CSS / Tailwind PostCSS | 4.3.3           |
| TypeScript                      | 5.9.3           |
| Base UI React                   | 1.9.0           |
| class-variance-authority / clsx | 0.7.1 / 2.1.1   |
| lucide-react / tailwind-merge   | 0.562.0 / 3.7.0 |

`components.json` uses `style: "base-nova"`, RSC, TypeScript, Tailwind CSS variables and `@/` aliases mapped to the consumer's `src/`. The namespace was supplied explicitly:

```json
{
  "registries": {
    "@aureform": "https://aureformui.com/r/{name}.json"
  }
}
```

This manual mapping is required for this test. Successful resolution does not mean `@aureform` has been added to the official directory.

Executed from `consumer/`, with the isolated npm environment above and `NEXT_TELEMETRY_DISABLED=1`:

```sh
npm install --no-audit --no-fund
./node_modules/.bin/shadcn --version
./node_modules/.bin/shadcn add @aureform/button @aureform/appearance-provider --yes --overwrite
npm run typecheck
npm run build
```

- Installer version output: **4.22.0**; installation **exit 0**.
- Created five files: Button, utilities, effects CSS, appearance provider and appearance model. The installer also updated the consumer's global CSS.
- `typecheck` runs `tsc --noEmit`: **exit 0**, about **1.1 seconds**.
- `build` runs `next build --webpack`: **exit 0**, about **12.0 seconds**. It compiled and prerendered `/` and `/_not-found`. The isolated Next configuration sets `outputFileTracingRoot: process.cwd()` and one build worker.
- Next added `.next/dev/types/**/*.ts` to this consumer's TypeScript include list during its normal build.

The client fixture renders the installed exports together:

```tsx
<AppearanceScope appearance={createAppearance("ocean", "light")}>
  <Button onClick={() => setCount((value) => value + 1)}>
    Installed Button: {count}
  </Button>
</AppearanceScope>
```

The complete local fixture and logs are retained in the isolated artifact directory. Consumer lockfile SHA-256: `721c33f4a86d7fed576c4b03a5a98ae1b22ca4969168091b070b2628cbb0c98e`.

## Production interaction probe

The consumer was served on loopback with `npm run start` (`next start --hostname 127.0.0.1 --port 4179`). The local probe used **Playwright 1.58.0** and an existing isolated browser context in **Chromium 156.0.8078.4**:

```sh
# From artifacts/github-readiness/, while the consumer server is running:
TMPDIR=tmp NEXT_TELEMETRY_DISABLED=1 node consumer-browser.mjs
```

The route returned HTTP 200. The installed Button hydrated and changed its counter from 0 to 1, with one button inside the Ocean Light scope and no nested buttons. The scope supplied `--primary: #2F67C2`; the button had a painted background. The document-level palette remained unset. No JavaScript page exceptions, failed requests or compiled-resource HTTP errors were observed.

**Recorded limitation:** the minimal fixture has no `/favicon.ico`, producing one identified HTTP 404 console warning. The report does not claim a completely clean console. An initial Chromium launch failed because the absolute temporary socket path was too long; using `TMPDIR=tmp` relative to the same artifact directory resolved it. No application source or registry payload was changed to recover either condition.

## Public payload identities and handoff

These public responses returned HTTP 200 and retained the same SHA-256 before installation and after typecheck/build:

| Public payload                                                                    | SHA-256                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`build-info.json`](https://aureformui.com/build-info.json)                       | `a8cc78e17d4cb6d8c25371a0e66900a2919fbd3bc4cb1dfd6fc6cac1652fda43` |
| [`r/registry.json`](https://aureformui.com/r/registry.json)                       | `1a62c04495fc03a69f8e330e485325121f31d0a911081c46e4c0e7dcb5533cba` |
| [`r/button.json`](https://aureformui.com/r/button.json)                           | `bbcf77c7dc5998a0e734746200e98d0bbb5c02e89b7faba1b25c51d646be1e61` |
| [`r/appearance-provider.json`](https://aureformui.com/r/appearance-provider.json) | `6f0c7571f831cddab72d3a320f7776597a0f42c35a0735a3bbe057ed22d391bf` |

The evidence covers **two registry items, one consumer configuration and one Chromium interaction scenario**. It does not certify all 107 entries, arbitrary host projects, accessibility conformance, other browser engines, the official directory's acceptance or any Lighthouse result.

Local technical evidence is available for a maintainer to review a proposed submission. Before any later external proposal, recheck the namespace and current contribution procedure, preserve these exact versions and source identities, and obtain explicit authorization to submit. Local artifacts and dependencies are not public downloads or submission attachments.
