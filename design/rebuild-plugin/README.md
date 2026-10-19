# Aureform design rebuild

This open-source local Figma plugin recreates **foundations and three native starter families**. It also imports the eight supplied, actual Figma SVG snapshots. It requires no account connection, external endpoint or API key.

The rebuild creates primitive colors, six semantic palette collections with Light/Dark aliases, spacing/radius variables, three text styles, a color specimen board and **28 native component variants**:

| Family | Native starter variants | Editable properties |
| --- | ---: | --- |
| Button / Appearance | 15 | Appearance, State, Label |
| Badge / Appearance | 5 | Appearance, Label |
| Card / Material | 8 | Appearance, State, Title |

The axes and base geometry follow the recorded native families. Values come from the supplied application tokens. Body copy and card actions are explicit starter fixtures. This is a useful reconstruction starting point; it does **not** recreate all 44 native families, all 69 templates, original IDs, prototype motion, shader fills or every historical style. The complete 44-family application source and the 92 local mappings are available in the main repository.

Manrope Regular, Medium and SemiBold must be available in Figma. Its source font and OFL notice are in [`src/assets/fonts`](../../src/assets/fonts). Missing fonts produce an actionable error before any canvas changes.

## Run locally

From the full repository:

```bash
python3 design/scripts/prepare_design.py
node design/rebuild-plugin/build.mjs
```

The generated `code.js`, UI and manifest are included in the design download.

In Figma Design, use **Plugins → Development → Import plugin from manifest**, select `manifest.json` and run **Aureform design rebuild**. If your Figma client requests a development ID, use its **New plugin** dialog to obtain a Figma-assigned ID and add that value to the manifest; none has been invented or reserved here. This local source has not been submitted to the Community plugin directory.

Choose a library name, palette and appearance, then **Rebuild foundations**. The output is placed alongside existing content. Repeating the same board name selects the existing result without changing it. Existing variables and unrelated layers are preserved.

For the exported templates and library specimens, choose the files in `design/exports/svg/` and click **Import selected snapshots**. Their geometry and embedded images are retained; text stays outlined, and SVG import does not restore native bindings, variant relationships or auto-layout.

## Source and scope

`backend.js` contains the reconstruction functions, `entry.js` the sandbox/UI protocol, and `ui.html` the local interface. `build.mjs` embeds the reviewed token JSON and validates JavaScript syntax. The manifest explicitly disables external network access.

The primitive and semantic counts are computed from the application's token JSON. They are not a claim to reproduce the original file's separate 714-variable native inventory. Imported/rebuilt components receive new IDs; the original file's Code Connect mappings remain local, unpublished references and need rebinding for a new library.
