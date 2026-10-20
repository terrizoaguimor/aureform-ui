# Local CLI and registry

Aureform's installer ships as `bin/aureform.mjs`. Run it with Node from a cloned or extracted checkout. It copies local source and reached assets; there is no published global Aureform npm package or registry download inside this CLI.

## Create and extend a consumer

Use Node.js 22.18.0+ and the repository's pnpm version. Choose a new directory outside the kit:

```sh
node bin/aureform.mjs list
node bin/aureform.mjs init ../my-product --no-install
pnpm --dir ../my-product install
node bin/aureform.mjs add data-table chart --cwd ../my-product --diff
node bin/aureform.mjs add data-table chart --cwd ../my-product
pnpm --dir ../my-product install
```

`list` discovers available names. `init` creates the starter and runs pnpm unless `--no-install` is supplied. `add` follows local imports, dynamic dependencies and assets, merges package requirements and integrates the semantic theme. It never runs the consumer's package manager.

## Configure supported aliases and styles

An existing destination needs `components.json`, `tsconfig.json`, a root wildcard alias such as `@/*` → `./src/*`, and a global CSS file. The stock [components configuration](../../../components.json) uses:

```json
{
  "components": "@/components",
  "utils": "@/lib/utils",
  "ui": "@/components/ui",
  "lib": "@/lib",
  "hooks": "@/hooks"
}
```

This is the `aliases` object, not a complete configuration file. The installer resolves supported destination aliases and rewrites copied imports. Keep `tailwind.css` in `components.json` pointing to the real global entry.

The local installer adds shared `aureform.css` and its import. Review global CSS alongside component source: `AppearanceScope` scopes variables, but does not undo every global selector.

## Preview updates before replacing files

1. Use `--dry-run` to inspect paths, dependencies, actions and conflicts.
2. Use `--diff` for text changes; it always implies a non-writing preview.
3. Review protected files before applying an explicit `--overwrite`.
4. Install merged dependencies after a successful add.

Preview flags work only with `add`. Conflicts exit nonzero; a preview with `--overwrite` still writes nothing. Existing differing files remain protected, including previously installed source. Incompatible dependency majors block copying even with overwrite; the check is not full semver compatibility.

Successful adds record original and installed hashes in `.aureform/manifest.json`. Receipts describe provenance and customization; they do not implement automatic three-way upgrades.

## Use shadcn as a separate installation path

From a configured consumer, install by full public URL:

```sh
pnpm dlx shadcn@4.22.0 add \
  https://aureformui.com/r/data-table.json
```

See [Installation](installation.md), [preview/receipt details](../../../docs/cli-updates-1.2.md) and [registry compatibility](../../../docs/registry-compatibility.md). Preserve required styles, contexts and asset paths in either approach.
