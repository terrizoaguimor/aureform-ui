---
title: "Aureform UI: an open-source Next.js kit with an appearance studio"
published: false
description: "69 views, editable source, six palettes, light and dark modes, GSAP, Lenis and a Figma companion. Released under Apache 2.0."
tags: nextjs, react, opensource, webdev
cover_image: https://raw.githubusercontent.com/terrizoaguimor/aureform-ui/main/docs/images/aureform-overview-dark.webp
---

I’m releasing **Aureform UI under Apache 2.0**: a Next.js kit for dashboards, SaaS workspaces and internal tools, with editable source and a Figma companion.

You can [try the live demo](https://terrizoaguimor.github.io/aureform-ui/) or [get the source on GitHub](https://github.com/terrizoaguimor/aureform-ui).

The project includes **69 views, 44 core component families and 96 registry entries**, built with Next.js 16, React 19, TypeScript, Tailwind CSS 4 and Base UI. All Aureform components, blocks and templates are part of the open-source release.

## The work between the screenshots

A dashboard becomes useful when someone can complete a task: find a customer, save a filtered view, import a CSV, recover from an error or finish onboarding. A collection of attractive cards is only one part of that work.

Aureform includes local demonstrations of those flows, together with dashboards, commerce screens, mail, chat, tasks, settings and AI workspace interfaces. The examples give you interactions to study and source to change.

For customer operations, the reusable blocks accept your data and callbacks. You can connect a table or an import workflow to your application's services without rebuilding its presentation from scratch.

## Appearance is part of the system

I wanted the kit to give people room to choose their own visual direction.

The appearance studio exposes six palettes—Aurora, Violet, Ocean, Mint, Ember and Rose—alongside colors, shades, typography, radii, density and materials. You can explore gradients, glass surfaces, shadows and hover treatments in both light and dark modes.

![Aureform appearance studio with palette and material controls](https://raw.githubusercontent.com/terrizoaguimor/aureform-ui/main/docs/images/aureform-studio.webp)

Presets can be saved locally, imported as JSON and exported as JSON, CSS or a React example. Shared appearance variables carry the configuration into the components.

There are also six effects you can use independently: gradient backgrounds, shader backgrounds, spotlight cards, glow borders, tilt cards and magnetic buttons.

GSAP handles scoped entrances with cleanup. Lenis is optional on the landing; application screens keep native scrolling. Motion respects reduced-motion preferences, and shaders have a static fallback.

## Charts and content you can actually reuse

The kit includes 13 chart types and a data-table system, with complete component examples in the repository. English and Spanish are included throughout the demo.

![Aureform chart gallery](https://raw.githubusercontent.com/terrizoaguimor/aureform-ui/main/docs/images/aureform-charts.webp)

The content collection includes **32 original images generated with GPT Image 2.5**: 16 fictional portraits, two organization avatars, eight products and six editorial scenes. The supplied images work without an API key or an image-generation service.

The repository includes optimized delivery files, the full prompt catalog and the original WebP masters in [`design/images/masters/`](https://github.com/terrizoaguimor/aureform-ui/tree/main/design/images/masters). SVG companions embed the optimized raster bytes so the images can travel through a text-based component registry.

The [editable Figma library](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) accompanies the code. The repository's [design notes](https://github.com/terrizoaguimor/aureform-ui/blob/main/design/README.md) describe the available design files and export formats.

## Run it or take the pieces you need

Use Node.js 22.16+ and pnpm 10:

```sh
git clone https://github.com/terrizoaguimor/aureform-ui.git
cd aureform-ui
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000/en/` or `/es/`. Images and fonts are bundled locally.

From that checkout, the source CLI can create a smaller starting application:

```sh
node bin/aureform.mjs init ../my-product --no-install
pnpm --dir ../my-product install
pnpm --dir ../my-product dev
```

For an existing configured Next.js project, `add` copies selected source and reached assets. `--dry-run` previews the plan; `--diff` shows proposed changes without writing files.

You can also install individual items through shadcn from a Next.js / Tailwind 4 host with shadcn configured:

```sh
pnpm dlx shadcn@4.22.0 add \
  https://terrizoaguimor.github.io/aureform-ui/r/button.json
```

The README links the provider requirements, examples and integration contracts.

## Where your backend fits

This release is a frontend kit. Demo records and preferences persist in the browser. Authentication, server authorization, shared databases, billing, email delivery and AI model calls are services you connect.

Role previews illustrate interactions; they do not enforce server permissions. The local demos make those boundaries visible so you can replace their adapters deliberately.

The public example is a static export hosted on GitHub Pages. You can build the same demo locally or use the source in an application with your own deployment and backend.

## Help make it useful to more people

The [contribution guide](https://github.com/terrizoaguimor/aureform-ui/blob/main/CONTRIBUTING.md) covers the source layout, verification commands and design conventions. English and Spanish contributions are welcome.

Useful improvements include clearer validation, better keyboard interactions, complete examples, translations and new workflows with explicit data contracts. If you find a problem, include the route and steps that reproduce it.

Explore the [demo](https://terrizoaguimor.github.io/aureform-ui/), browse the [repository](https://github.com/terrizoaguimor/aureform-ui) and make the source your own. Aureform-authored code, documentation and original assets are Apache 2.0; dependencies and fonts retain their upstream licenses.
