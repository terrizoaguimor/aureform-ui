# Integration source installation verification

Run from the source kit with its frozen dependencies available:

```bash
node --experimental-strip-types --test tests/integration-installation.test.mjs
```

The test invokes the actual `bin/aureform.mjs add` CLI in temporary consumer projects. It selects these 13 entries together:

```text
integration-hub integrations-suite identity-integration-panel
ai-integration commerce-providers connected-map
drive-picker drive-picker-panel media-collection media-collection-panel
enterprise-diagnostics product-editor-controls search-bridge-command
```

UI, component, library and hook aliases use separate directories: `~ui/primitives`, `~components/widgets`, `~lib/services` and `~hooks/browser`. A fixture symlink supplies the kit's installed dependencies and their real declarations; it does not install provider packages or add ambient module stubs.

The observed run passed **6/6 tests**:

- **138 copied sources**, with **639 local imports** resolved within the consumer and **182 package imports** resolved against declared, installed dependencies.
- TypeScript **5.9.3** compiled **137 consumer TS/TSX sources**, including the consumer host, optional map/Picker/media factories, public component props and all eight `IntegrationSuite.ui` bindings, with `strict: true`, `noEmit` and no incremental output.
- **26 recorded assets** matched their original bytes and hashes. Eight product SVGs retained their exact embedded WebP crop rasters.
- `--dry-run` and `--diff` left the whole fixture unchanged. Repeated installation was unchanged; a customized file blocked installation atomically, including another missing file. Explicit `--overwrite` restored both files. An incompatible dependency also blocked without writes.

Each installation checks `.aureform/manifest.json` receipts: schema version, selected entry names, kit origin/version, source and target paths, SHA-256 hashes and dependency ranges. The test independently parses imports to detect missing local closure or incorrect alias rewriting. Fixtures seed the kit's `LICENSE`, `NOTICE` and `THIRD_PARTY_NOTICES.md` before installation and verify that the CLI preserves them.

Temporary projects and receipts are removed after each test. The counts above describe this observed working-tree run and can change with the source graph. This verifies source installation and real dependency typing; it does not demonstrate native provider authentication, SDK execution or acceptance of a remote operation.
