# Aureform UI

**Expressive interfaces. Editable source. Open to everyone.**

A Next.js UI kit for dashboards, SaaS workspaces and internal tools, with a visual appearance studio and an editable Figma companion.

[**Explore the demo ↗**](https://terrizoaguimor.github.io/aureform-ui/) · [Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) · [Get started](#get-started) · [Contribute](CONTRIBUTING.md) · [Español](README.es.md)

![Aureform SaaS overview in dark mode, with navigation, metrics and charts](docs/images/aureform-overview-dark.webp)

**69 views · 44 core component families · 96 registry entries · 6 palettes · 13 chart types · English / Español · Light / Dark**

Built with **Next.js 16, React 19, TypeScript, Tailwind CSS 4, Base UI, GSAP and Lenis**. Aureform-authored source is available under [Apache 2.0](LICENSE).

## What you get

| Included                             | What you can build with it                                                                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **68 suite views + a landing page**  | Dashboards, CRM, commerce, onboarding, customer operations, team settings, mail, chat, tasks and AI workspace interfaces.                                                        |
| **Components, blocks and templates** | Buttons, forms, dialogs, data tables, navigation, charts and composed workflows. Copy the source you need through the local CLI or shadcn registry.                              |
| **An appearance studio**             | Aurora, Violet, Ocean, Mint, Ember and Rose; colors, shades, gradients, materials, typography, radius, density and hover treatments. Save presets and export JSON, CSS or React. |
| **Six reusable effects**             | Gradient background, shader background, spotlight, glow border, tilt card and magnetic button, with reduced-motion handling and a static shader fallback.                        |
| **Design and content assets**        | A native Figma library, shared tokens, local fonts and 32 original images generated with GPT Image 2.5: portraits, organization avatars, products and editorial scenes.          |

| Light mode                                                                   | Appearance studio                                                                                               |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| ![Aureform overview in light mode](docs/images/aureform-overview-light.webp) | ![Aureform appearance studio with palette and material controls](docs/images/aureform-studio.webp)              |
| **Charts**                                                                   | **Component library**                                                                                           |
| ![Aureform chart gallery](docs/images/aureform-charts.webp)                  | ![Aureform component gallery with buttons, inputs and surface treatments](docs/images/aureform-components.webp) |

## Get started

Use **Node.js 22.16+** and **pnpm 10**. The repository pins its pnpm version in `package.json`.

```sh
git clone https://github.com/terrizoaguimor/aureform-ui.git
cd aureform-ui
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000/en/](http://localhost:3000/en/) or [localhost:3000/es/](http://localhost:3000/es/). The included images and fonts are local files; **running the suite requires no API keys**.

To build and preview the static export:

```sh
pnpm build
pnpm start
```

The output lives in `out/`. GitHub Pages uses the project prefix at build time:

```sh
NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm build
```

See the [GitHub Pages guide](docs/github-pages.md) for hosting and the [open-source guide](docs/open-source.md) for integration.

## Use it in your own project

**Create a small starting application.** Run the local CLI from this checkout:

```sh
node bin/aureform.mjs list
node bin/aureform.mjs init ../my-product --no-install
pnpm --dir ../my-product install
pnpm --dir ../my-product dev
```

**Add selected source.** Preview an addition before applying it:

```sh
node bin/aureform.mjs add data-workbench import-wizard customer-detail \
  --cwd ../my-product --dry-run
node bin/aureform.mjs add data-workbench import-wizard customer-detail \
  --cwd ../my-product
pnpm --dir ../my-product install
```

The CLI copies dependencies and reached assets, respects configured aliases and protects existing source. `--diff` shows proposed changes without writing. [CLI guide →](docs/cli-updates-1.2.md)

**Use the shadcn registry.** From a Next.js / Tailwind 4 project with shadcn configured:

```sh
pnpm dlx shadcn@4.22.0 add \
  https://terrizoaguimor.github.io/aureform-ui/r/button.json
```

Browse the [96-entry registry](https://terrizoaguimor.github.io/aureform-ui/r/registry.json). Components and blocks may require the supplied styles and locale or appearance providers; check their examples before integrating. [Registry guide →](docs/registry-compatibility.md)

## A frontend you can connect

The demo has interactive flows for filtering, saved views, CSV imports, onboarding, members and customer detail. Its records and preferences persist **in your browser**.

Production authentication, server authorization, shared databases, email delivery, billing and AI model calls are integrations you provide. Role previews simulate permissions; they do not secure a backend. Customer-detail attachments store metadata, while the separate file-manager demo uses local browser storage.

Reusable operation blocks accept data and callbacks so you can connect your own services. Start with the [SaaS contracts](docs/saas-operations.md), [architecture](docs/architecture.md) and [component examples](examples/README.md).

<a id="figma-source-and-packages"></a>

## Design, motion and assets

- **Figma:** [editable design library](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) and [repository design bundle / export notes](design/README.md). Consult those notes for the actual available files and their formats.
- **Appearance:** [configuration and exports](docs/appearance.md), [effects](docs/effects.es.md), [shaders](docs/shaders.md) and [charts](docs/charts.md).
- **Motion:** GSAP handles scoped entrances; Lenis is optional on the landing. Application screens retain native scrolling. [Runtime contract](docs/motion-runtime.md).
- **Images:** [32-image collection](docs/generated-images/README.md), [full prompts](docs/generated-images/catalog.json), [original WebP masters](design/images/masters/) and [asset manifest](public/assets/generated-images.json). Optimized WebP files are included; SVG companions embed the same raster pixels for text-based registry transport.

Versioned packaging and QA records retain their original scope. See the [open-source guide](docs/open-source.md#check-changes-and-contribute) for how to interpret them.

## Contribute

Bug reports, better interactions, new patterns, translations and documentation are welcome. English and Spanish contributions are both welcome.

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm verify:examples
pnpm build
```

Read [CONTRIBUTING](CONTRIBUTING.md) for browser checks and design conventions, our [Code of Conduct](CODE_OF_CONDUCT.md) for community expectations, and [SECURITY](SECURITY.md) for private vulnerability reporting.

## License and credits

Aureform-authored code, documentation and included original assets are released under [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) and [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md) for attribution and upstream licenses.

Created by [terrizoaguimor](https://github.com/terrizoaguimor). Build something useful, make it your own, and share improvements with the community.
