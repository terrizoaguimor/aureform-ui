# Cloudflare deployment

[Español](cloudflare-deployment.es.md)

Aureform UI uses Next.js 16.4.2 with `output: "export"` and `trailingSlash: true`. Cloudflare serves the existing `out/` export through Workers Static Assets. The packaging adapter does not change the application or require a Next.js runtime.

Use Node.js 22.18.0 or later, pnpm 10.34.5, and the project's pinned `cf@1.0.0-beta.18` development dependency. `cf` uses its own authentication; a Wrangler login does not authenticate it.

## Build and validate locally

Run these commands from the repository root:

```sh
NEXT_PUBLIC_BASE_PATH="" pnpm build
node scripts/prepare-cloudflare.mjs
CF_SEND_TELEMETRY=false pnpm exec cf deploy --prebuilt --dry-run
```

If `out/` already contains the desired root-domain build, start with the preparation command. Preparation is offline, copies files, and replaces only `.cloudflare/output/v0/`. It does not modify `out/`, `public/`, source code, or dependencies. A missing export, symlink, conflicting source-download redirect, oversized asset other than the source ZIP, or more than 20,000 assets stops preparation.

An old export with a GitHub Pages base path can validate packaging locally. The adapter warns and reports `rootDomainExport: false` with the detected `exportBasePaths`. Rebuild with `NEXT_PUBLIC_BASE_PATH=""` before deploying that export to the custom domain.

The dry run validates the prebuilt output without authentication, API requests, or uploads. Always include `--prebuilt`: the adapter supplies the deployment artifact, while CF's automatic framework setup is a different build path.

## GitHub Pages remains a separate build path

The existing `.github/workflows/pages.yml` workflow runs `pnpm build` with `NEXT_PUBLIC_BASE_PATH` supplied by `actions/configure-pages`, validates it with `pnpm verify:pages` using the same base path, and uploads `out/` as its Pages artifact.

The Cloudflare path builds for the domain root, then copies that export into CF Build Output with `node scripts/prepare-cloudflare.mjs`. It does not use the Pages upload or deploy actions. Keep each target's export separate or rebuild before switching targets; preparing a legacy export does not rewrite its embedded URLs.

## Configuration and Build Output

`cloudflare.config.ts` imports the typed `defineConfig` helper from `cf/config` and declares:

- Worker name: `aureform-ui`.
- Compatibility date: `2026-10-19`.
- Custom domains: `aureformui.com` and `www.aureformui.com`.
- `workersDev: false`; production uses the two custom domains, following [Cloudflare's routing guidance](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/). GitHub Pages supplies the separate backup.
- `assets.htmlHandling: "force-trailing-slash"`.
- `assets.notFoundHandling: "404-page"`.
- `assets.runWorkerFirst: false`.
- Observability enabled, logs sampled at 100%, traces sampled at 1%, and query-string redaction enabled.

The typed `assets` configuration controls runtime behavior and has no `directory` field. The adapter locates the asset directory using the installed CF build-output helpers:

```text
.cloudflare/output/v0/
├── config.json
└── workers/
    └── default/
        ├── worker.config.json
        └── assets/
            ├── _redirects
            ├── index.html
            ├── 404.html
            └── ...the remaining exported files
```

The root configuration is:

```json
{
  "buildContext": {
    "isPreview": false
  }
}
```

`worker.config.json` comes from the parsed source configuration through `writeWorkerConfig()`. It has no `entrypoint` or `manifest`; an assets-only artifact requires `assets/` and does not require `bundle/`. The adapter writes the root with `writeRootConfig()` and verifies the complete artifact with `readBuildOutput()`, using `@cloudflare/build-output-utils@0.9.3` and `@cloudflare/config@0.27.0` supplied by the pinned CF dependency.

No mode is recorded, so use `cf deploy --prebuilt` without `--mode`. Regenerate the artifact whenever `out/` or `cloudflare.config.ts` changes. Keep the complete `.cloudflare/output/v0/` tree when transferring a build between CI jobs, and keep `.cloudflare/` ignored by Git.

This artifact has no user Worker script. Asset requests and redirects do not invoke application Worker code. The logs/traces settings remain in the typed and built configuration for any future Worker code; CF beta.18's assets-only upload does not apply Worker observability metadata, and static asset requests do not produce user Worker invocation logs or traces.

## Source ZIP and smaller downloads

Workers Static Assets has a [25 MiB limit per file](https://developers.cloudflare.com/workers/platform/limits/#static-assets). The source ZIP exceeds that limit and remains in `public/downloads/` and the original export.

The adapter omits only `downloads/aureform-ui-source.zip` from the copied asset collection and generates this rule in the copied `_redirects` file:

```text
/downloads/aureform-ui-source.zip https://github.com/terrizoaguimor/aureform-ui/releases/download/v${version}/aureform-ui-source.zip 302
```

The adapter reads `version` from `package.json` and writes the actual `v${version}` tag into the rule; `${version}` above illustrates the template and is not left in the output. The filename remains `aureform-ui-source.zip`. The asset runtime preserves the incoming query string.

Before deployment, the owner must publish and verify the matching stable [GitHub release](https://github.com/terrizoaguimor/aureform-ui/releases) with that source asset. Preparation and the CF dry run do not check release availability. A version bump requires rebuilding the export, publishing the matching archives, and preparing fresh Build Output. Historical release archives and evidence remain unchanged.

Every smaller ZIP present in `out/` is copied without changing its bytes. Preparation does not add a ZIP absent from the export. Other oversized files fail validation rather than being silently omitted.

## Owner: configure `www` → apex

CF beta.18's `_redirects` file parser accepts relative source paths only; an absolute hostname source is rejected. The deployment therefore uses an owner-managed [Cloudflare Redirect Rule](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/create-dashboard/) for hostname canonicalization.

In the `aureformui.com` zone, configure a Single Redirect with:

| Setting                  | Value                                                     |
| ------------------------ | --------------------------------------------------------- |
| Custom filter expression | `http.host eq "www.aureformui.com"`                       |
| Redirect type            | Dynamic                                                   |
| Target expression        | `concat("https://aureformui.com", http.request.uri.path)` |
| Status code              | `308`                                                     |
| Preserve query string    | Enabled                                                   |

The rule requires proxied traffic for `www.aureformui.com`. The owner must review and apply it using their existing zone and account. Declaring both custom domains in the Worker configuration does not itself create this redirect.

For example, `https://www.aureformui.com/es/docs/?q=button` must return `308` with `Location: https://aureformui.com/es/docs/?q=button`. The rule applies before the static site, including missing paths and downloads, while avoiding a Worker invocation for every request.

## Owner: authenticate and deploy

The account owner completes `cf auth login` using the installed CF CLI, selects the correct account, and deploys the validated artifact:

```sh
CF_SEND_TELEMETRY=false pnpm exec cf deploy --prebuilt
```

Set `CLOUDFLARE_ACCOUNT_ID` in the owner's environment if explicit account selection is needed. No account ID is hardcoded in source or Build Output. Domain attachment requires access to the existing Cloudflare zone. This guide and the local dry run do not authenticate, change DNS or rules, or deploy anything.

In CI, build once, prepare once, and dry-run the same artifact. Only the owner's actual deployment step receives `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from protected repository/environment secrets. Never commit tokens, login state, or generated `.cloudflare/` files.

The supplied [Cloudflare workflow](../.github/workflows/cloudflare.yml) checks pull requests without deployment credentials, runs the website browser tests, and deploys the same root export on `main` or a manual run. Before deploying, `pnpm verify:cloudflare-release` streams the public source ZIP and checks its byte count and SHA-256 against the packaged manifest. A missing or mismatched release stops deployment.

Use account-scoped Workers Scripts Write and Account Settings Read, plus Workers Routes Write and Zone Read limited to the site's zone. Do not grant this deployment token access to all accounts or all zones. Keep it in GitHub's encrypted secrets, and rotate it before its configured expiry. For a fork, update the Worker name, custom domains, canonical origin and GitHub release URLs before deploying.

After deployment, verify a known English and Spanish route, the trailing-slash redirect, a missing route returning HTTP 404, every smaller ZIP, the source ZIP redirect, and the `www` redirect with a query string. An unknown route must serve the exported 404 page with status 404; there is no SPA fallback.

Official references: [typed configuration](https://developers.cloudflare.com/cf/projects/cloudflare-config/), [prebuilt deploys](https://developers.cloudflare.com/cf/projects/#deploy-a-prebuilt-build), [CF in CI](https://developers.cloudflare.com/cf/ci/), [static redirects](https://developers.cloudflare.com/workers/static-assets/redirects/), and [static-site 404 behavior](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/).
