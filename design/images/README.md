# Original image collection

All 32 original generated WebP masters are included in [`masters/`](masters/), alongside their [dimensions and SHA-256 manifest](masters.json). These original Aureform assets are released under [Apache 2.0](../../LICENSE).

The [full prompt catalog](../../docs/generated-images/catalog.json) records the prompts, model, dimensions and fictional identities. Optimized runtime files are in [`public/assets/`](../../public/assets/); native Figma PNG derivatives are in [`.figma/assets/generated-images-1.2.1/`](../../.figma/assets/generated-images-1.2.1/). Their decoded pixels come from the same optimized WebP images.

The collection contains 16 fictional portrait avatars, two organization avatars, eight product images and six editorial images. It requires no model access, API key or remote host at runtime. Existing generated images can be optimized again with `python3 scripts/prepare-image-assets.py --help`; generation is optional and is a separate operation with a model provider.

The SVG runtime files are self-contained wrappers embedding WebP bytes. They preserve the actual photographs in text-based component registries; they are not editable vector portraits.
