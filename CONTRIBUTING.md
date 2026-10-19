# Contributing to Aureform UI

Thank you for helping make Aureform useful to more people. We welcome focused fixes, interaction improvements, examples, translations, design work and documentation. Issues and pull requests may be written in English or Spanish.

Please follow our [Code of Conduct](CODE_OF_CONDUCT.md). Report vulnerabilities through the private route in [SECURITY.md](SECURITY.md).

## Start with a concrete problem

For a bug, include a route, reproduction steps, expected behavior and your browser. For a larger feature, open an issue describing the user's task and a proposed interaction before implementing it. Small fixes and documentation corrections can go straight to a pull request.

Screenshots help with appearance changes. Use real application captures and remove personal information.

## Set up

Use Node.js **22.16+** and pnpm **10**:

```sh
git clone https://github.com/terrizoaguimor/aureform-ui.git
cd aureform-ui
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `/en/` and `/es/` at `http://localhost:3000`. Supplied images and fonts work locally without API keys.

## Find the right layer

| Area                                     | Location                                 |
| ---------------------------------------- | ---------------------------------------- |
| Reusable primitives                      | `src/components/ui/`                     |
| Composed operation blocks                | `src/components/blocks/`                 |
| Suite pages and demos                    | `src/components/templates/`, `src/demo/` |
| Shared contracts, appearance and catalog | `src/lib/`                               |
| Complete component examples              | `examples/`                              |
| Tests and browser flows                  | `tests/`                                 |
| Tokens and registry generators           | `tokens/`, `scripts/`                    |
| Figma handoff and design exports         | `.figma/`, `design/`                     |

Check the [architecture](docs/architecture.md) and [SaaS contracts](docs/saas-operations.md) before changing data boundaries. The suite's local providers illustrate interactions; production authorization belongs on a consuming application's server.

## Keep the system coherent

- Use shared appearance variables for colors, shades, gradients, shadows and radii. Check both Light and Dark; new styles should work across the six palettes.
- Provide keyboard operation, visible focus and useful loading, empty, error and disabled states. Respect `prefers-reduced-motion`.
- Update English and Spanish copy together. Preserve descriptive alternative text for content images.
- Keep reusable blocks controlled through explicit data and callbacks. Place demonstration data and local persistence in the demo layer.
- Follow the motion contract: scoped GSAP effects with cleanup, native application scrolling and optional Lenis for the landing.
- Update the complete examples when a component's public props change. Keep dependencies intentional.
- Generate registry and token outputs from their scripts. Do not patch generated JSON or CSS as the only implementation.
- Add regression tests for behavior changes. Documentation, copy and simple visual adjustments can use an appropriate manual check.

## Verify your change

For source changes, run:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm verify:examples
pnpm build
```

`pnpm build` regenerates tokens and registry items and creates `out/`. Review the resulting changes.

The public-release checks are `pnpm verify:public` for the distributable source and `pnpm verify:pages` for the Pages export. Follow the [Pages guide](docs/github-pages.md) for the required build configuration.

For an interaction change, run the relevant browser tests against that build:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

The E2E configuration starts a static preview on port 3001. To use an already running preview, set `AUREFORM_BASE_URL`. To use an installed Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

For appearance, motion or copy/export changes, start a preview in one terminal:

```sh
PORT=3010 pnpm start
```

Then run the relevant check in another:

```sh
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm verify:appearance
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm verify:motion
AUREFORM_BASE_URL=http://127.0.0.1:3010 pnpm verify:copy
```

Check the changed flow at a narrow mobile width and desktop width, in both languages and themes. Describe exactly what you checked; historical QA receipts do not establish that a new change passed.

For documentation-only changes, check links, commands and formatting. Figma and Code Connect changes have separate handoff checks; consult [design notes](design/README.md) and [the verification guide](docs/verification.md).

## Open a pull request

Explain the problem, resulting behavior and relevant validation. Include before/after captures for visual changes, and note any public API or dependency changes. Keep unrelated refactors separate so reviewers can assess the change.

Do not include API keys, environment files, personal records, build output or assets you cannot redistribute. Credit upstream work and retain its required license notices.

Contributions to Aureform-authored files are made under the project's [Apache 2.0 license](LICENSE). Third-party files retain their own licenses.
