# Get started with Aureform UI

Aureform UI is an open-source frontend kit for SaaS products, dashboards and internal tools. It supplies editable Next.js, React and TypeScript source, reusable workflows, local demonstration data and an appearance system. You can run the complete application or copy only the parts your product needs.

Browse the [demo](https://aureformui.com/en/dashboard/) and [documentation](https://aureformui.com/en/docs/) on [aureformui.com](https://aureformui.com/), the primary site.

## Understand what is included

The application demo contains 69 original views, an integration hub and 65 provider recipe pages. The recipes share 17 workflow families and offer 86 provider choices. Its 44 core component families underpin 127 registry entries, including composed blocks, templates, providers and effects. Six palettes work in both light and dark themes; charts support 13 kinds. English and Spanish are included throughout the demo.

The 32 supplied generated images depict fictional people, organizations, products and editorial scenes. They are local assets with recorded prompts, alternative text and original masters. Running the kit requires no image generation service.

## Choose your first workflow

1. Follow [Installation](installation.md) to clone the complete suite and open `/en/` or `/es/` locally.
2. Explore Components for independent examples, then Charts and Data tables for interactive data presentation.
3. Open Appearance Studio to change colors, material, typography, density and motion. Export JSON, CSS or a configured React example.
4. Try Products → Orders → Invoices to understand the shared commerce flow, or open Maps and Authentication to inspect their integration boundaries.
5. Open [Integrations](/en/integrations/) to try the connected workflows, then follow the [connection guide](integrations.md) to inject your adapters.

For a smaller application, run the local installer from the checkout:

```sh
node bin/aureform.mjs init ../my-product --no-install
pnpm --dir ../my-product install
pnpm --dir ../my-product dev
```

The starter includes appearance controls, motion, local fonts and reusable effects. The full suite's navigation and galleries remain in the complete checkout.

## Connect application services

The default application stores demonstration records in the browser. Production identity, authorization, payments, shared storage, email and AI providers belong to your application. Role previews and mock payment success do not establish server permissions or a real charge.

Start with [Components](components.md), [Tokens](tokens.md) and the [architecture guide](../../../docs/architecture.md). The [integration guide](integrations.md) explains the full suite; the [earlier application contracts](../../../docs/application-integrations.md) remain available.

## Read design and release scope

Original Aureform work uses [Apache 2.0](license.md). The native Figma 1.2.1 checkpoint remains frozen; application blocks introduced in 1.4 and 1.5 are source additions. The 92 local Code Connect templates use synthetic validation and are not cloud certified. Consult [Roadmap](roadmap.md) and [design distribution](../../../docs/figma-distribution.md) before treating a historical receipt as current coverage.
