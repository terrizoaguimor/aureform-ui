# Aureform UI 1.3.0 — open-source release

Version 1.3.0 opens Aureform-authored code, documentation, design resources, image masters and prepared assets under Apache 2.0. The full suite, starter and component sample share the same license. Upstream licenses are preserved.

The public repository is [terrizoaguimor/aureform-ui](https://github.com/terrizoaguimor/aureform-ui). Its [GitHub Pages demo](https://terrizoaguimor.github.io/aureform-ui/) uses a static export with a build-time base path.

## Release changes

- Replace the earlier commercial proposal with `LICENSE`, `NOTICE` and Apache 2.0 package metadata; remove paid-kit restrictions and commercial purchase language.
- Publish English and Spanish READMEs, real application screenshots, contribution guidelines, issue templates and private vulnerability-reporting instructions.
- Prefix public resources and native HTML links for subdirectory hosting, while retaining Next.js route handling.
- Publish all 32 original generated image masters, the full prompts, optimized images and Figma derivatives.
- Include actual Figma SVG exports, tokens, route/component maps, native proof PNGs and a local rebuild plugin. The connector cannot export a native `.fig` file; the bundle describes each format's limits.
- Exclude credentials, local environments, private deployment configuration and operational artifacts. Redact private publication metadata from the public historical 1.2 receipt; its earlier hash remains a record of the original private checkpoint.

## Checks

The executed checks and their scopes are recorded in [qa-runtime-1.3.0.json](qa-runtime-1.3.0.json). Final archive identities are in [checksums.json](../public/downloads/checksums.json), with the delivery receipt in [verification-1.3.0.json](../public/downloads/verification-1.3.0.json).

```sh
pnpm verify:public
pnpm typecheck
pnpm lint
pnpm test
pnpm verify:examples
pnpm verify:code-connect
pnpm build
pnpm test:e2e
NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm build
NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm verify:pages
```

`verify:public` scans Git's publication set and archive contents without printing secret values. GitHub secret scanning and push protection are also enabled for the upstream repository.

The 1.1, 1.2 and image-specific 1.2.1 native records retain their original evidence and review scope. This release does not claim a new visual review of every native Figma route, or cloud publication of Code Connect. The 92 local Code Connect templates are checked against the current source.

## Packages

Run `pnpm package:source` after freezing the source and design bundle. Source includes original masters and native proof files, so a complete checkout can reproduce the evidence gate. Dependencies, build output, private configuration, credentials and nested downloads are excluded.

Source is capped at 90 MiB, below GitHub's individual-file limit. Other application archives are capped at 25 MiB. The three native evidence archives preserve their historical bytes. The legacy `aureform-ui-free.zip` filename denotes an optional eight-component sample under the same Apache 2.0 license.

Publish the exact verified source and packages, wait for GitHub Pages to succeed, verify the public demo and downloads, then publish the launch article on dev.to. Runtime demo state remains local to the browser; production services belong to the integrating application.
