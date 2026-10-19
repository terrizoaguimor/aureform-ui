# Deploy the demo to GitHub Pages

The live demo is [terrizoaguimor.github.io/aureform-ui](https://terrizoaguimor.github.io/aureform-ui/). It contains the same frontend source as this repository, exported as static HTML. The demo stores its sample data and appearance preferences in your browser; it does not submit them to a backend.

The [Pages workflow](../.github/workflows/pages.yml) installs the frozen pnpm lockfile, checks the public files, types, lint, unit tests and component examples, then builds all routes. GitHub supplies the deployment base path through `actions/configure-pages`. The workflow verifies links and assets in the exported HTML before deploying `out/`.

## Reproduce the Pages build locally

```sh
pnpm install --frozen-lockfile
NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm build
NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm verify:pages
NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm start
# http://127.0.0.1:3000/aureform-ui/en/dashboard/
```

The prefix is a build-time setting. Use the same value when previewing that export. For localhost development or a domain-root deployment, leave `NEXT_PUBLIC_BASE_PATH` empty and rebuild.

Next.js prefixes `next/link` routes. Aureform's public-path helper handles images, media, raw download links and browser fetches. Keep route links unprefixed when passing them to `next/link`.

To check the actual browser demo, install Playwright's Chromium browser (`pnpm exec playwright install chromium`) and run:

```sh
AUREFORM_BASE_URL=http://127.0.0.1:3000/aureform-ui pnpm verify:demo
```

This checks every view in both languages, six mobile views, four main-region accessibility scans, language navigation, theme persistence and a real image download. Reports stay in the ignored `artifacts/` directory. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an existing Chromium installation.

The README screenshots come from the actual application:

```sh
AUREFORM_BASE_URL=http://127.0.0.1:3000 \
  NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm capture:readme
```

## Deploy your fork

Enable GitHub Pages under **Settings → Pages → Build and deployment → Source → GitHub Actions**, then run the **GitHub Pages** workflow or push to `main`. The workflow reads your site's own base path, including a root path for a user site or custom domain.

Keep deployment tokens in GitHub's managed workflow credentials or repository secrets. The application requires no OpenAI, Figma, Stripe or other API key to build or run.

GitHub Pages hosts the static frontend. Connect production authentication, storage, payments, email and AI providers through your own application and its server-side adapters.

The deployment follows [GitHub's workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and the installed Next.js static-export and `basePath` guides.
