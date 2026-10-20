# Aureform UI 1.5.0 — ready-to-connect frontend workflows

Version 1.5 adds an [integration hub](https://aureformui.com/en/integrations/) and
65 provider recipes covering 17 workflow families and 86 provider choices.
The existing 69 views remain available; the complete catalogue has 135 routes
before locale expansion. All workflows share the six palettes, light/dark
appearance, EN/ES copy and the existing reduced-motion contract.

## Frontend scope

The hub includes scoped connections, provider selection, public configuration,
logical permissions, authorized resource selection, activity, synchronization,
reviewed revocation and recoverable pending/error states. Provider choices in a
group expose only their declared capabilities.

Domain workbenches cover data, identity, commerce, files, email, diagnostics,
notifications, jobs, collaboration, content, search, maps, AI, knowledge,
agents, product connectors and automation. They include editable records and
documents, image management, model streams and tool decisions, search facets,
reviewed external-write requests and backend-reported progress.

`IntegrationSuite`, the shared `IntegrationsAdapter` and specialized identity,
AI and commerce contracts are injectable from Client Components. Same-origin
HTTP transports provide bounded DTO validation, cancellation, workspace
references, CSRF integration, explicit redirect origins, revision checks and
idempotency keys. An unchanged retry retains its key until a successful response.
Editor and realtime callbacks allow consumers to use their selected SDK.

The public demo uses local mocks. No account is provisioned, vendor OAuth is
performed, email is delivered, analytics are transmitted, model is called or
payment is charged by selecting a recipe. The consumer supplies authenticated
endpoints, provider connectivity, credentials, server authorization, reconciliation
and durable storage. Frontend permissions are presentation controls.

## Source and documentation

The [connection guide](website/en/integrations.md)
([Español](website/es/integrations.md)) contains a complete suite example and
the common endpoint contract. The domain references explain identity, AI,
commerce, operational and product workflows.

The [provider manifest](integrations/provider-coverage.json) maps the reviewed
candidates to options, actions and logical permissions. The
[coverage audit](integrations/coverage-audit.md) retains concrete review findings
and follow-through. Inventory and source review are distinct from runtime
acceptance or native provider certification.

The shadcn registry and local CLI distribute reached source, imports,
dependencies and portable assets. The full source archive includes the new
modules, documentation, tests and optional editor recipes. Its checksum must
match the corresponding GitHub release before Cloudflare deployment.

## Reproduce the checks

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm verify:examples
pnpm verify:integrations
pnpm verify:public
pnpm build:cloudflare
pnpm verify:pages
pnpm verify:website
pnpm verify:integrations-ui
```

Root and `/aureform-ui` exports are separate verification targets. Browser
checks use fresh contexts and reject unintended provider traffic. The
[version-scoped QA receipt](qa-runtime-1.5.0.json) records observed results and
their actual test scope; release assets retain public deployment observations.

Original source remains Apache 2.0. Upstream packages and optional SDKs retain
their independent licenses. The native Figma 1.2.1 checkpoint and existing
Lighthouse reports retain their original commit, version, hashes and scope.
This frontend release does not recertify those historical measurements.

## Recorded local validation

The [QA receipt](qa-runtime-1.5.0.json) records 865 passing unit tests, 688 strict
component payloads, 11 strict integration examples, six optional SDK examples
and 317 local provider/action bindings. Root acceptance covers 290 scenarios
through a 289-case successful broad cohort and two focused notification cases.
Mounted acceptance covers 216 integration/site/application cases, ten shell
cases and 64 SaaS cases. The receipt retains the initial test-harness failures
and scopes; these are not presented as two single clean 290-case runs.

Both exports contain 326 HTML pages and resolve 468 local destinations. Both
demo sweeps include 272 EN/ES desktop pages, 32 ES mobile/light pages and 14
observed Axe scans. Seventeen README captures have zero page errors. Real
provider-account acceptance and a new Lighthouse measurement are not claimed.
