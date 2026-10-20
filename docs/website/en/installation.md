# Installation

Choose between the complete demonstration application and a smaller consumer project. Aureform copies editable source into your project; it is not a published global npm package or a hosted backend.

[aureformui.com](https://aureformui.com/) is the primary site for the demo, documentation and registry. [GitHub Pages](https://terrizoaguimor.github.io/aureform-ui/) remains a backup.

## Run the complete suite

Use Node.js 22.18.0 or newer and pnpm 10. The repository pins its package manager in `package.json`. Install on a filesystem that supports package symlinks.

If `corepack` is unavailable, first run `npm install --global corepack`. Node.js 25 and newer do not bundle it; see the [official installation guide](https://github.com/nodejs/corepack#default-installs).

```sh
git clone https://github.com/terrizoaguimor/aureform-ui.git
cd aureform-ui
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000/en/` or `http://localhost:3000/es/`. Images and fonts are supplied locally. Authentication, commerce and other application services use frontend mocks; no API keys are required.

1. Keep the supplied lockfile when reproducing the full checkout.
2. Leave `NEXT_PUBLIC_BASE_PATH` empty for a domain root such as aureformui.com.
3. Leave the optional Google Maps variables blank to use the local map. The [environment example](../../../.env.example) documents these public build settings.

## Initialize a smaller application

From the Aureform checkout, choose a new directory outside the kit:

```sh
node bin/aureform.mjs init ../my-product --no-install
pnpm --dir ../my-product install
pnpm --dir ../my-product dev
```

The starter supplies Next.js, React, Tailwind 4, local fonts, appearance controls and motion/effect dependencies. Its first install creates a consumer lockfile; the checkout's frozen install command is not a substitute for that step.

To extend an existing host, configure `components.json`, a root wildcard TypeScript alias and global CSS first. Preview changes with `node bin/aureform.mjs add button --cwd ../my-product --diff`, then apply and install the merged dependencies. See [CLI](cli.md).

## Install from the public registry

In a Next.js / Tailwind 4 host with shadcn configured, use the full registry URL:

```sh
pnpm dlx shadcn@4.22.0 add \
  https://aureformui.com/r/button.json
```

Keep Tailwind's global stylesheet and Aureform semantic styles available. A Button needs no suite providers; translated application blocks may need locale, appearance and workspace context. Follow [Components](components.md), [Tokens](tokens.md) and [registry compatibility](../../../docs/registry-compatibility.md).

## Prepare your own deployment

Review asset paths, navigation destinations, environment values and licenses in the consumer. The kit's demonstration data is browser state, not a database. Real authentication, Stripe endpoints and webhooks require your backend. The [open-source guide](../../../docs/open-source.md) describes full-suite builds and source reuse.
