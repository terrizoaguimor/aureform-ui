# Design distribution

[Español](figma-distribution.es.md) · [Design package](../design/README.md)

Aureform's original design assets are included under [Apache 2.0](../LICENSE), with third-party font and library notices preserved.

## What is available

The repository includes eight **actual downloaded Figma SVG exports**, the application token source and generated CSS, an open-source rebuild plugin, exact recorded route/component links, prepared local Code Connect source, and native PNG evidence. The [design ZIP](../design/downloads/aureform-design-snapshots.zip) bundles these selected resources for download.

The [original Figma file](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) remains the native design source. Signed-in connector access was verified. The owner confirmed on 2026-10-19 that public link viewing and copying/export are enabled. The available connector cannot independently read those sharing settings. The repository resources can be used without access to that file.

## Native file export status

As checked on 2026-10-19, the connected export tool supports PNG, JPG, SVG and PDF asset exports, plus a separate video exporter. It has no native `.fig` download operation. A real attempt to export a native component as `JSON_REST_V1` returned **“JSON_REST_V1 export format is not supported in this context.”** There was no enabled browser or native editor for downloading a local copy.

Consequently, **no native `.fig` file is bundled**. SVG and JSON files keep their real extensions. The rebuild plugin's scope and reconstruction limits are documented separately.

Figma supports a genuine local copy through **Main menu → File → Save local copy**. In a reachable editor with copying permission, that produces the `.fig` file. Reimporting creates a separate file and new component identities; it does not preserve comments or version history. [Figma's local-copy documentation](https://help.figma.com/hc/en-us/articles/8403626871063-Save-a-local-copy-of-files).

When a genuine export becomes available, add its actual bytes, byte count, SHA-256 and date under `design/figma/`. Validate it through Figma's importer before describing it as an editable native backup. No placeholder `.fig` is reserved in the repository.

## Source, design and evidence

The [route map](../design/maps/routes.md) contains the 69 root IDs recorded in the frozen 1.2.1 handoff. It is an index, not a fresh all-route inspection. The [component map](../design/maps/components.json) points to the real source and 92 local Code Connect templates. These mappings have not been registered with Figma; importing or rebuilding produces new IDs.

The seven image proofs retain their original hashes and scoped acceptance. They do not establish a fresh 69-view visual review. The eight new SVG exports were checked for byte counts, valid SVG structure and self-contained image content; this is export-integrity verification.

The separate [1.3.0 design release record](../design/release-1.3.0.json) records the Apache-2.0 cover and kit-license wording changes and their fresh readback. Earlier `.figma` audit files and canonical snapshot state remain unchanged. SaaS demo plan prices are illustrative application data.

The generated portraits and product/editorial images are raster content. Native Figma uses lossless PNG encodings of the same decoded optimized WebP pixels. Runtime SVG image wrappers are transport containers, not vector portraits. Prompts and masters are in [the image collection](../design/images/README.md).

## Reproducing the public package

From a complete checkout:

```bash
pnpm tokens
python3 design/scripts/prepare_design.py --bundle
node design/rebuild-plugin/build.mjs
```

These commands use supplied local source and assets. They do not access Figma or request new image generation. The bundle contains no credentials, account emails, tool transcripts or temporary signed download URLs.
