# CLI previews and install receipts for 1.2

The local CLI supports reviewing an `add` before copying source into a Next.js
consumer. Existing `list`, `init`, and successful `add` output remains unchanged.
The kit version comes from the extracted kit's `package.json`; this change does
not set or release a version.

## Commands

```sh
node bin/aureform.mjs list
node bin/aureform.mjs add button revenue-panel --cwd ../product --dry-run
node bin/aureform.mjs add button revenue-panel --cwd ../product --diff
node bin/aureform.mjs add button --cwd ../product --diff --overwrite
node bin/aureform.mjs add button --cwd ../product --overwrite
```

`--dry-run` constructs the same source closure, alias rewrites, asset copies,
dependency merges, CSS integration and receipt that an actual `add` would use.
It prints destination paths, source paths, file status, intended actions, npm
requirements and every protected-file/dependency conflict.

`--diff` implies `--dry-run`, even without that flag. It additionally prints
contextual text changes against actual consumer bytes. New files use
`/dev/null` as the original path. Binary changes show SHA-256 hashes rather
than binary content. Neither preview writes files, creates directories, records
receipts, stages files, acquires an install lock, installs packages, or accesses
the network. `--overwrite` during a preview only changes the proposed plan.

A ready preview exits zero. A preview with conflicts prints the complete plan
and exits one. Invalid item names, project configuration, receipt formats or
unsafe destination paths also exit one. A text difference alone does not make
the preview fail. Preview flags are accepted only for `add`; supplying either
to `init` fails before it creates the destination.

An actual `add` still does not install dependencies. Run your package manager
after reviewing the merged consumer `package.json`. `--no-install` remains
accepted with `add`, but is redundant. `init --no-install` keeps its existing
behavior; `init` does not create per-item add receipts.

## File status and protection

| Status       | Meaning                                                                      |
| ------------ | ---------------------------------------------------------------------------- |
| `new`        | The destination file does not exist.                                         |
| `unmodified` | Current bytes match a prior Aureform receipt for this target.                |
| `customized` | A prior Aureform receipt exists, but current bytes differ.                   |
| `unknown`    | An existing source, asset or theme file has no matching Aureform provenance. |
| `consumer`   | An integration file: `package.json` or the configured global CSS entry.      |
| `recorded`   | An existing installation receipt.                                            |

Actions distinguish creation, unchanged bytes, source updates, integration
merges and receipt updates. A receipt identifies changes; it does not authorize
overwriting them. Every existing managed source, asset or generated theme whose
bytes differ from the proposed copy remains protected, including `unmodified`
files from an older kit. Use an explicit `--overwrite` after reviewing the diff.
Identical existing files do not need that flag.

Dependency requirements appear with the current version and package group.
Compatible existing majors are retained, including requirements already
present in the other dependency group. Incompatible majors block the complete
copy even with `--overwrite`; resolve those requirements in the consumer first.
This preserves the CLI's existing major-version check and is not a full semver
compatibility guarantee.

Protection and dependency checks finish before any consumer writes. Actual
copies stage all changed bytes, recheck the destination snapshots, and publish
the receipt after source, assets and integration files. A filesystem failure
rolls back completed copies and removes temporary files. A project-local lock
prevents concurrent Aureform installs. If an external editor changes a file
during rollback, the installer preserves that edit and retains the original
backup for recovery rather than replacing the edit. This is not a filesystem
transaction across unrelated processes.

## Receipt format

A successful `add` records `.aureform/manifest.json` in the consumer:

```json
{
  "schemaVersion": 1,
  "items": {
    "button": {
      "origin": "aureform-ui",
      "name": "button",
      "kitVersion": "<version read from the extracted kit>",
      "files": [
        {
          "sourcePath": "src/components/ui/button.tsx",
          "sourceHash": "<SHA-256 of original source bytes>",
          "targetPath": "design/ui/button.tsx",
          "targetHash": "<SHA-256 of copied bytes after alias rewriting>",
          "kind": "source"
        }
      ],
      "dependencies": {
        "@base-ui/react": "<required version>"
      },
      "devDependencies": {}
    }
  }
}
```

The example is abbreviated. Each item records its complete source and asset
closure and its own required dependency versions. The shared `aureform.css`
target has one record for each original CSS input: globals, tokens and effects.
Each input has its own original hash and the generated target's hash. Target
paths are relative to the consumer; source paths are relative to the kit.

Adding another item preserves previous item receipts. Repeating an identical
add leaves source, package, CSS and receipt bytes and modification times
unchanged. Old installations without receipts appear as `unknown`; identical
source can be adopted by a successful add, while different source remains
protected. Invalid or unsupported receipt JSON fails before copying.

Receipts are local provenance, not a signature or permission grant. They contain
no credentials, user identity or absolute machine paths.

## Registry discovery

When the owner next runs the registry generator, it emits:

- `registry.json`: the existing standard shadcn registry document.
- `public/r/registry.json`: the same standard document for root discovery at
  `/r/registry.json`.
- `public/r/index.json`: the existing lightweight Aureform index, including the
  kit version and per-item `/r/<name>.json` URLs.

Both standard manifests use the shadcn registry schema and receive the complete
inventory supplied by the source graph. There is no fixed item count: the
existing 83-item baseline and later entries use the same path. Per-item payloads,
dependency closure and `registrySafeContent` custom-slot protection are
unchanged. This scoped change does not regenerate registry artifacts.

## Verification

```sh
node --experimental-strip-types --test --test-isolation=none \
  tests/installer-preview.test.mjs tests/installer.test.mjs
node node_modules/eslint/bin/eslint.js \
  bin/aureform.mjs scripts/generate-registry.mjs tests/installer-preview.test.mjs
```

The tests use isolated consumers and compare complete trees for nonmutating
previews and protected conflicts. They independently hash actual original and
installed bytes, exercise alias rewriting and binary assets, preserve earlier
receipts and dependency groups, check idempotence, and inject an I/O failure to
verify rollback. The real `main` command parser/output path runs with package
execution forbidden. Pure registry-document construction is checked against
the installed shadcn schema with the current inventory plus a future entry;
the generator itself is not run.
