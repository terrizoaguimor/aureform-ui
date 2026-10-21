# Aureform design, open to everyone

[Español](README.es.md) · [Source code](../README.md) · [Figma file](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N)

Use Aureform's original source and design under [Apache 2.0](../LICENSE). Fonts and dependencies retain the licenses in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

Third-party provider logos retain their owners' rights; the [brand asset manifest](../public/assets/integrations/manifest.json) records their original sources and usage boundaries.

![Aureform's native Figma cover for the open-source release](releases/1.3.0/cover.png)

Start with the [design bundle](downloads/aureform-design-snapshots.zip), or clone the repository to get the source, tokens and editable design resources together.

| Resource | What you can use |
| --- | --- |
| [Figma file](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) | The original native library and templates; the owner confirmed public view and copy/export access on 2026-10-19. |
| [Rebuild plugin](rebuild-plugin/README.md) | A local, open-source plugin for recreating foundations and native starter component variants, and importing the supplied SVG snapshots. |
| [SVG snapshots](exports/README.md) | Eight actual Figma exports: three templates, two palette boards, and the Button Shapes, Chart and Table sets. |
| [Route map](maps/routes.md) | The 69 recorded native route roots, with exact Figma links and source entry points. |
| [Component map](maps/components.json) | The 92 prepared local Code Connect mappings and their real source files. |
| [Tokens](tokens/README.md) | The application's token JSON and generated CSS, including six palettes and Light/Dark values. |
| [Image collection](images/README.md) | Generated portraits, products and editorial images, with original prompts and delivery metadata. |
| [Native image proofs](proofs/manifest.json) | Seven accepted, frozen image-integration exports from the 1.2.1 checkpoint. |
| [Dated artwork and source proofs](proofs/2026-10-21/manifest.json) | Additional actual artifacts, with hashes and explicit distinctions between native Figma exports and offline artwork composites. |
| [Open-source design change record](release-1.3.0.json) | The separately recorded cover and licensing changes; earlier audit evidence remains historical. |
| [Communications research and source recovery](reports/communications-2026-10-21.md) | Proposed Communications views and RFC boards, plus native recovery of 1.4/1.5 application and integration sources, with explicit acceptance limits. |
| [Original integration logos](../public/assets/integrations/README.md) | 79 brand identities for 86 provider choices, including the original artwork, attribution and the two declared raster originals. |

The SVGs contain editable vector geometry and embedded photos. Their text is outlined. Importing them does **not** recreate Figma auto-layout, text properties, component variants or variable bindings. The rebuild plugin creates native editable text and starter components separately; its documented scope is smaller than the complete original Figma library.

A native `.fig` download is **not included**. The available connector does not export that format, and its REST-shaped node export is unsupported in this execution context. This package does not rename JSON or SVG to `.fig`. See [distribution details](../docs/figma-distribution.md) for the exact export status, sharing limits and supported local-copy procedure.

The Code Connect files are **local and unpublished**. Their source is in [`.figma/code-connect`](../.figma/code-connect); publishing this repository does not register them in Figma or create a live Dev Mode connection. Imported or rebuilt components receive new IDs and need their own mappings.

The [1.4 application expansion](../docs/application-integrations.md) adds source blocks and actual browser screenshots. The [2026-10-21 recovery](reports/communications-2026-10-21.md) adds native product, commerce, maps, social-auth and 1.5 integration sources to the same Figma file. Its dated source map separates native creation, selected visual reviews and browser parity that remains unverified; the earlier checkpoints keep their historical scope.

Refresh the derived indexes and the download from a complete checkout:

```bash
python3 design/scripts/prepare_design.py --bundle
```

The refresh is local. It does not access Figma, call an image model or change the historical native audit files.
