# Aureform UI

[![Latest release](https://img.shields.io/github/v/release/terrizoaguimor/aureform-ui?style=flat-square&color=8F652A&label=release)](https://github.com/terrizoaguimor/aureform-ui/releases/latest) [![Apache 2.0 license](https://img.shields.io/github/license/terrizoaguimor/aureform-ui?style=flat-square&color=8F652A)](LICENSE) [![Cloudflare build, checks and deployment](https://img.shields.io/github/actions/workflow/status/terrizoaguimor/aureform-ui/cloudflare.yml?branch=main&style=flat-square&logo=cloudflare&logoColor=white&label=Cloudflare%20CI)](https://github.com/terrizoaguimor/aureform-ui/actions/workflows/cloudflare.yml) [![GitHub Pages build and deployment](https://img.shields.io/github/actions/workflow/status/terrizoaguimor/aureform-ui/pages.yml?branch=main&style=flat-square&logo=github&label=Pages%20CI)](https://github.com/terrizoaguimor/aureform-ui/actions/workflows/pages.yml)

**Expressive interfaces. Editable source. Open to everyone.**

A Next.js UI kit for dashboards, SaaS workspaces and internal tools, with a visual appearance studio and an editable Figma companion.

[**Explore the demo ↗**](https://aureformui.com/en/) · [**Documentation**](https://aureformui.com/en/docs/) · [Quality & Lighthouse](https://aureformui.com/en/quality/) · [Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) · [Sponsor](https://github.com/sponsors/terrizoaguimor) · [Get started](#get-started) · [Contribute](CONTRIBUTING.md) · [Español](README.es.md)

[![Live demo on Cloudflare](https://img.shields.io/badge/demo-aureformui.com-8F652A?style=flat-square&logo=cloudflare&logoColor=white)](https://aureformui.com/en/) [![Documentation: 22 chapters](https://img.shields.io/badge/docs-22%20chapters-8F652A?style=flat-square&logo=readthedocs&logoColor=white)](https://aureformui.com/en/docs/) [![Editable Figma library](https://img.shields.io/badge/Figma-editable%20library-8F652A?style=flat-square&logo=figma&logoColor=white)](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) [![shadcn source registry](https://img.shields.io/badge/shadcn-source%20registry-8F652A?style=flat-square&logo=shadcnui&logoColor=white)](https://aureformui.com/r/registry.json)

![Aureform homepage in dark mode, with its interface preview and documentation entry](docs/images/aureform-landing-dark.webp)

**69 views · 44 core component families · 107 registry entries · 6 palettes · 13 chart types · English / Español · Light / Dark**

Built with **Next.js 16, React 19, TypeScript, Tailwind CSS 4, Base UI, GSAP and Lenis**. Aureform-authored source is available under [Apache 2.0](LICENSE).

[![Next.js 16](https://img.shields.io/badge/Next.js-16-111827?style=flat-square&logo=nextdotjs&logoColor=white)](package.json) [![React 19](https://img.shields.io/badge/React-19-111827?style=flat-square&logo=react&logoColor=61DAFB)](package.json) [![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-111827?style=flat-square&logo=typescript&logoColor=3178C6)](package.json) [![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-4-111827?style=flat-square&logo=tailwindcss&logoColor=06B6D4)](package.json) [![Base UI 1.9](https://img.shields.io/badge/Base%20UI-1.9-111827?style=flat-square)](package.json) [![Node.js 22.18.0 or later](https://img.shields.io/badge/Node.js-%E2%89%A522.18.0-111827?style=flat-square&logo=nodedotjs&logoColor=5FA04E)](#get-started) [![pnpm 10](https://img.shields.io/badge/pnpm-10-111827?style=flat-square&logo=pnpm&logoColor=F69220)](package.json) [![English and Spanish navigation](https://img.shields.io/badge/i18n-English%20%2F%20Espa%C3%B1ol-111827?style=flat-square)](https://aureformui.com/en/docs/) [![Light and dark themes](https://img.shields.io/badge/themes-light%20%2F%20dark-111827?style=flat-square)](https://aureformui.com/en/docs/tokens/)

## What you get

[![TanStack Table 8](https://img.shields.io/badge/TanStack%20Table-8-111827?style=flat-square&logo=tanstack&logoColor=FF4154)](https://aureformui.com/en/docs/data-table/) [![Recharts 3](https://img.shields.io/badge/Recharts-3-111827?style=flat-square)](https://aureformui.com/en/docs/charts/) [![React Hook Form 7](https://img.shields.io/badge/React%20Hook%20Form-7-111827?style=flat-square&logo=reacthookform&logoColor=EC5990)](https://aureformui.com/en/forms/) [![Zod 4](https://img.shields.io/badge/Zod-4-111827?style=flat-square&logo=zod&logoColor=3E67B1)](package.json) [![MapLibre GL 5](https://img.shields.io/badge/MapLibre%20GL-5-111827?style=flat-square&logo=maplibre&logoColor=white)](https://aureformui.com/en/docs/maps/)

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

## Application workflows in 1.4

[![Stripe typed frontend adapter](https://img.shields.io/badge/Stripe-typed%20adapter-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://aureformui.com/en/docs/adapters/) [![Google Maps with an optional browser key](https://img.shields.io/badge/Google%20Maps-optional%20key-1D4ED8?style=flat-square&logo=googlemaps&logoColor=white)](https://aureformui.com/en/docs/maps/) [![Google, GitHub and Microsoft OAuth frontend mocks](https://img.shields.io/badge/OAuth-frontend%20mocks-111827?style=flat-square)](https://aureformui.com/en/docs/authentication/)

Explore [Products](https://aureformui.com/en/products/), [Orders](https://aureformui.com/en/orders/), [Invoices](https://aureformui.com/en/invoices/), [Billing](https://aureformui.com/en/settings/billing/) and [Maps](https://aureformui.com/en/maps/).

The product editor includes a live preview and an image gallery with upload, crop, rotation, alt text, primary image and reordering. Catalog prices feed new orders; a successful mock payment updates inventory and creates an invoice. Billing has plan changes, history and a customer portal preview. The included typed Stripe adapter connects those screens to **your authenticated backend**.

Maps starts locally and can connect to Google Maps with a restricted browser key. [Sign in](https://aureformui.com/en/auth/sign-in/) and [sign up](https://aureformui.com/en/auth/sign-up/) expose **Google, GitHub and Microsoft mock buttons**, with callbacks for your own auth provider. Recovery and verification are available too. No real OAuth or payment is performed by the public demo.

| Product catalog                                                                                    | Social access                                                                                         |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| ![Product catalog with images, inventory and Stripe mock sync](docs/images/aureform-products.webp) | ![Sign-in template with Google, GitHub and Microsoft mock buttons](docs/images/aureform-auth.webp)    |
| **Billing and plans**                                                                              | **Maps workspace**                                                                                    |
| ![Billing plans, subscription and customer portal preview](docs/images/aureform-billing.webp)      | ![Local routes, shipment filters and optional Google Maps connection](docs/images/aureform-maps.webp) |

| Product image editor                                                                                   | Orders and checkout                                                                      |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| ![Product image editor with crop, alt text and live preview](docs/images/aureform-product-editor.webp) | ![Orders, payment status and purchase-time line items](docs/images/aureform-orders.webp) |

[Application contracts and integration examples →](docs/application-integrations.md) · [Español →](docs/application-integrations.es.md)

[1.4 validation and release scope →](docs/release-checklist-1.4.0.md)

## Get started

Use **Node.js 22.18.0+** and **pnpm 10**. The repository pins its pnpm version in `package.json`. If `corepack` is unavailable, install it first with `npm install --global corepack`; Node.js 25+ requires a separate install. See the [Corepack guide](https://github.com/nodejs/corepack#default-installs).

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
  https://aureformui.com/r/button.json
```

Browse the [107-entry registry](https://aureformui.com/r/registry.json). Components and blocks may require the supplied styles and locale or appearance providers; check their examples before integrating. [Registry guide →](docs/registry-compatibility.md)

## A frontend you can connect

The demo has interactive flows for filtering, saved views, CSV imports, onboarding, members and customer detail. Its records and preferences persist **in your browser**.

Production OAuth, server authorization, shared databases, email delivery, Stripe endpoints/webhooks and AI model calls are integrations you provide. The application kit supplies the frontend workflows, typed contracts and mock adapters. Role previews simulate permissions; they do not secure a backend. Customer-detail attachments store metadata, while the separate file-manager demo uses local browser storage.

Reusable operation blocks accept data and callbacks so you can connect your own services. Start with the [SaaS contracts](docs/saas-operations.md), [architecture](docs/architecture.md) and [component examples](examples/README.md).

<a id="figma-source-and-packages"></a>

## Design, motion and assets

[![GSAP 3.15](https://img.shields.io/badge/GSAP-3.15-111827?style=flat-square&logo=gsap&logoColor=88CE02)](docs/motion-runtime.md) [![Lenis 1.3](https://img.shields.io/badge/Lenis-1.3-111827?style=flat-square)](docs/motion-runtime.md) [![32 original assets generated with GPT Image 2.5](https://img.shields.io/badge/GPT%20Image%202.5-32%20original%20assets-8F652A?style=flat-square)](docs/generated-images/README.md)

- **Figma:** [editable design library](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) and [repository design bundle / export notes](design/README.md). Consult those notes for the actual available files and their formats.
- **Appearance:** [configuration and exports](docs/appearance.md), [effects](docs/effects.es.md), [shaders](docs/shaders.md) and [charts](docs/charts.md).
- **Motion:** GSAP handles scoped entrances; Lenis is optional on the landing. Application screens retain native scrolling. [Runtime contract](docs/motion-runtime.md).
- **Images:** [32-image collection](docs/generated-images/README.md), [full prompts](docs/generated-images/catalog.json), [original WebP masters](design/images/masters/) and [asset manifest](public/assets/generated-images.json). Optimized WebP files are included; SVG companions embed the same raster pixels for text-based registry transport.

Versioned packaging and QA records retain their original scope. See the [open-source guide](docs/open-source.md#check-changes-and-contribute) for how to interpret them.

## Documentation and deployment

[![Cloudflare Workers Static Assets](https://img.shields.io/badge/Cloudflare-Workers%20Static%20Assets-111827?style=flat-square&logo=cloudflare&logoColor=F38020)](docs/cloudflare-deployment.md) [![Static HTML, canonical URLs and hreflang](https://img.shields.io/badge/SEO-static%20HTML%20%2B%20hreflang-111827?style=flat-square)](docs/release-checklist-1.4.1.md) [![Gemini 4 Argon research: eight priorities](https://img.shields.io/badge/research-8%20priorities-8F652A?style=flat-square)](https://aureformui.com/en/docs/research/)

[Read the documentation](https://aureformui.com/en/docs/) without opening the demo workspace. Its 22 chapters cover installation, components, tokens, motion, charts, tables, application integrations, Figma and deployment, with searchable headings, a page outline and copyable code. Navigation is available in English and Spanish; references that retain their original language are identified on the page.

![Aureform documentation with grouped navigation, copyable code and page outline](docs/images/aureform-documentation.webp)

The primary site runs on **Cloudflare Workers Static Assets**. The [deployment guide](docs/cloudflare-deployment.md) describes the prebuilt export, custom domains and source-download redirect. [GitHub Pages](https://terrizoaguimor.github.io/aureform-ui/) remains a separate deployment with its own base path.

```sh
NEXT_PUBLIC_BASE_PATH="" pnpm build:cloudflare
pnpm exec cf deploy --prebuilt --dry-run
pnpm deploy:cloudflare
```

Set `NEXT_PUBLIC_SITE_URL` for your own canonical origin. Cloudflare deployment requires your account credentials; the demo and local build require none. Generated deployment state is excluded from Git and source packages.

The [bilingual product research](docs/website/en/research.md) combines three headless Gemini 4 Argon investigations, 52 observed searches, independent source review and eight priorities with acceptance criteria. Its [execution and verification ledgers](docs/research/2026-10-20/) separate recorded evidence from proposals that need user validation. The [original 20-finding study](docs/research-gaps-1.4.es.md) remains available.

## Quality you can inspect

[![Lighthouse audit workflow](https://img.shields.io/github/actions/workflow/status/terrizoaguimor/aureform-ui/quality.yml?branch=main&style=flat-square&label=Lighthouse%20CI)](https://github.com/terrizoaguimor/aureform-ui/actions/workflows/quality.yml)

<!-- BEGIN:quality-results -->
[![Lighthouse landing mobile median](public/badges/lighthouse-mobile.svg)](https://aureformui.com/en/quality/) [![Lighthouse landing desktop median](public/badges/lighthouse-desktop.svg)](https://aureformui.com/en/quality/)

**Measured: 2026-10-20 05:47:39 UTC · Lighthouse 13.5.0 · commit [0caf7c8](https://github.com/terrizoaguimor/aureform-ui/commit/0caf7c8874ea8bb2b1580c0d59a9bda4497cbdd4).** Medians of three runs per page and device; scores out of 100.

| Page · Device | Performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| Landing · Mobile | 93 | 100 | 100 | 100 |
| Landing · Desktop | 100 | 100 | 100 | 100 |
| Documentation · Mobile | 94 | 100 | 100 | 100 |
| Documentation · Desktop | 100 | 100 | 100 | 100 |
| Demo dashboard · Mobile | 40 | 100 | 100 | 69 |
| Demo dashboard · Desktop | 67 | 100 | 100 | 69 |

[Methodology, metrics and all 18 reports →](https://aureformui.com/en/quality/) · [Original JSON and HTML](docs/quality/lighthouse/production-39375951507-1/)
<!-- END:quality-results -->

Each snapshot audits the landing, installation documentation and demo dashboard on mobile and desktop, three times per combination. Published values are medians of laboratory measurements. Raw HTML and JSON reports remain available in [the repository](docs/quality/lighthouse/) and on the website. See [the measurement guide](docs/quality/README.md) to reproduce or update them.

The demo dashboard deliberately remains `noindex`; its SEO result reflects that policy. Lighthouse accessibility checks cover the audited pages and do not certify the whole kit. Laboratory loading metrics are separate from field Core Web Vitals.

## Support the maintainer

[![GitHub Sponsors](https://img.shields.io/badge/GitHub%20Sponsors-support%20the%20maintainer-8F652A?style=flat-square&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/terrizoaguimor)

If Aureform helps your work, you can [sponsor the maintainer](https://github.com/sponsors/terrizoaguimor) through the existing personal GitHub Sponsors profile. Support is voluntary; the source, original assets and documentation remain open under Apache 2.0.

## Contribute

Help people find and evaluate the kit through relevant GitHub communities.
[Discovery research and eligible destinations](docs/github-discovery.md) include
maintained frontend lists, registry directories and focused submission drafts.
The repository's topics and About description identify its actual stack and
scope.

[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-8F652A?style=flat-square)](CONTRIBUTING.md) [![GitHub stars](https://img.shields.io/github/stars/terrizoaguimor/aureform-ui?style=flat-square&logo=github&color=8F652A)](https://github.com/terrizoaguimor/aureform-ui/stargazers) [![GitHub forks](https://img.shields.io/github/forks/terrizoaguimor/aureform-ui?style=flat-square&logo=github&color=8F652A)](https://github.com/terrizoaguimor/aureform-ui/forks) [![Open issues](https://img.shields.io/github/issues/terrizoaguimor/aureform-ui?style=flat-square&logo=github&color=8F652A)](https://github.com/terrizoaguimor/aureform-ui/issues)

Bug reports, better interactions, new patterns, translations and documentation are welcome. English and Spanish contributions are both welcome.

Validation evidence for **v1.4.1**:

[![v1.4.1: 244 passing unit tests](https://img.shields.io/badge/unit%20tests-244%20passed-246B43?style=flat-square&logo=nodedotjs&logoColor=white)](https://github.com/terrizoaguimor/aureform-ui/blob/v1.4.1/docs/qa-runtime-1.4.1.json) [![v1.4.1: 688 examples checked with strict types](https://img.shields.io/badge/strict%20examples-688%20checked-246B43?style=flat-square&logo=typescript&logoColor=white)](https://github.com/terrizoaguimor/aureform-ui/blob/v1.4.1/docs/qa-runtime-1.4.1.json) [![v1.4.1: 19 passing production website browser scenarios](https://img.shields.io/badge/production%20website-19%20passed-246B43?style=flat-square&logo=playwright&logoColor=white)](https://github.com/terrizoaguimor/aureform-ui/releases/download/v1.4.1/cloudflare-deployment-1.4.1.json)

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
