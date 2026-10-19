# Using the open-source kit

[Español](open-source.es.md) · [README](../README.md)

The Apache 2.0 launch is **Aureform UI 1.3.0**. It makes the complete kit available as editable source: components, blocks, templates, shared appearance configuration, tokens, examples, documentation and original assets.

**1.4.0** expands Maps, product/image editing, orders, invoices, billing and social-auth mock templates. See the [application integration guide](application-integrations.md); new application blocks are source additions, with the native Figma checkpoints retained.

## License and attribution

Aureform-authored files use [Apache License 2.0](../LICENSE). Retain the applicable license and attribution files when redistributing the project. [NOTICE](../NOTICE) and [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md) identify attribution and upstream license information.

Dependencies and bundled fonts retain their own licenses. Opening Aureform does not replace those terms.

## Choose your starting point

| Approach                               | Use it when                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Run or fork the suite                  | You want to explore the full set of screens and reuse its navigation and providers.                            |
| Initialize a smaller application       | You want the appearance and motion system in a minimal Next.js starting point.                                 |
| Add selected source with the local CLI | You want particular components or workflows and their transitive dependencies.                                 |
| Install a registry item with shadcn    | You already have a configured Next.js / Tailwind 4 host and want to copy selected source through a public URL. |

The kit has **69 views: 68 suite routes and one landing**, **44 core component families** and **107 registry entries**. You do not need to adopt every screen to use a component.

### Run the full suite

```sh
git clone https://github.com/terrizoaguimor/aureform-ui.git
cd aureform-ui
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Use Node.js **22.16+** and pnpm **10**. Open `http://localhost:3000/en/` or `/es/`. Use a local filesystem that supports package symlinks.

### Create a starting application

From the Aureform checkout:

```sh
node bin/aureform.mjs init ../my-product --no-install
pnpm --dir ../my-product install
pnpm --dir ../my-product dev
```

The starter includes local fonts, appearance and motion providers, palette controls and an illustrative overview. The full suite remains in the Aureform checkout.

### Copy a workflow

The receiving project needs `components.json`, configured aliases and a global CSS entry. The generated starter supplies these.

```sh
node bin/aureform.mjs add data-workbench import-wizard customer-detail \
  --cwd ../my-product --diff
node bin/aureform.mjs add data-workbench import-wizard customer-detail \
  --cwd ../my-product
pnpm --dir ../my-product install
```

`--diff` and `--dry-run` write nothing. The installer protects existing source; review any conflict before choosing `--overwrite`. Successful additions record source and installed hashes in `.aureform/manifest.json`. [CLI details](cli-updates-1.2.md).

### Install a public registry item

From your configured host:

```sh
pnpm dlx shadcn@4.22.0 add \
  https://terrizoaguimor.github.io/aureform-ui/r/data-table.json
```

The [discovery manifest](https://terrizoaguimor.github.io/aureform-ui/r/registry.json) lists the available items. Supply the styles and providers required by their examples. Interactive callbacks belong in a Client Component. [Registry compatibility](registry-compatibility.md).

## Build and host

```sh
pnpm build
pnpm start
```

The build regenerates tokens and registry JSON, then exports static files to `out/`. The preview serves that output.

The public demo at [terrizoaguimor.github.io/aureform-ui](https://terrizoaguimor.github.io/aureform-ui/) uses a repository prefix:

```sh
NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm build
```

The prefix is compiled into the export. Rebuild when changing it; use an empty prefix for hosting at a domain root. The [GitHub Pages guide](github-pages.md) covers publishing and Pages verification.

GitHub Pages serves the frontend. A production application's authentication, API routes and server services require an appropriate backend and deployment configuration.

## Connect real services

The suite demonstrates local workflows; its browser state is not a shared database.

| Demo capability                               | Production responsibility                                         |
| --------------------------------------------- | ----------------------------------------------------------------- |
| Authentication screens and role previews      | Identity, sessions and server-side authorization                  |
| Customers, onboarding, workspaces and members | Authorized queries and mutations against shared storage           |
| CSV mapping, validation and import feedback   | Validated server ingestion and a suitable persistence strategy    |
| Customer-detail attachment metadata           | Authorized object storage, upload validation and real file access |
| Billing, inbox and AI interfaces              | Payment, messaging and model-provider integrations                |

Operation blocks accept explicit data and callbacks. Start with [SaaS integration contracts](saas-operations.md), [architecture](architecture.md) and [complete examples](../examples/README.md). Preserve loading, empty, error, retry and cancellation states while replacing adapters.

## Reuse design and images

The [Figma companion](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N) contains editable native UI. The [design bundle notes](../design/README.md) describe the files actually distributed and their formats; use those notes to check native export availability.

The 32-image collection is already generated. Optimized WebP files and SVG raster containers live in `public/assets/`; original WebP masters live in [`design/images/masters/`](../design/images/masters/). Prompts are in the [catalog](generated-images/catalog.json), and the [manifest](../public/assets/generated-images.json) records dimensions, alternative text and hashes.

The collection contains 16 fictional portraits, two organization avatars, eight fictional products and six editorial scenes. No generation account, API key or image service is required to run the demo or use the supplied files.

## Check changes and contribute

Follow [CONTRIBUTING](../CONTRIBUTING.md) for type, lint, unit, example, build and browser checks. `pnpm verify:public` checks the distributable source; `pnpm verify:pages` checks the Pages export with the configuration described in the hosting guide.

Current application checks are in the [1.4 runtime record](qa-runtime-1.4.0.json) and [release scope](release-checklist-1.4.0.md). Versioned design and QA receipts retain their original scopes. In particular, the image collection's **1.2.1** checkpoint remains historical provenance within the **1.3.0** open-source release. Those records do not claim that a downstream application, new contribution or native export has been independently certified.
