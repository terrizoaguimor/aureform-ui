# Security policy

## Report a vulnerability privately

Use [GitHub's private vulnerability reporting form](https://github.com/terrizoaguimor/aureform-ui/security/advisories/new) for a security issue in Aureform. Include:

- The affected file, component or installer command and the version or commit.
- Reproduction steps or a minimal proof of concept.
- The expected boundary and the observed impact.
- Any proposed fix or mitigation.

Do not include real credentials, private records or data belonging to other people. Keep exploit details out of public issues while the report is being assessed.

If GitHub's private form is unavailable, open a minimal issue requesting a private reporting channel without sharing the vulnerability details. No separate reporting email or response-time commitment is currently published.

## Scope

Security reports may concern the source installer, registry generation, browser data handling, rendering of untrusted content or a dependency used by this project.

Aureform supplies a frontend and local demonstrations. Authentication screens, role previews, API-key settings, billing screens and AI flows do not provide production identity, authorization, payment processing or model services. Client validation and hidden controls are not server security boundaries.

Consuming applications must enforce authorization, validate mutations and protect credentials on their servers. Follow the [integration contracts](docs/saas-operations.md) when replacing the demo adapters.

## Fixes and disclosure

Security fixes target the current source on `main`. Historical QA documents describe particular versions and checks; they are not security certifications or guarantees for downstream applications.

Maintainers assess the report, coordinate a fix where appropriate and use a GitHub advisory for agreed disclosure. Ordinary visual bugs, feature requests and documentation corrections belong in public issues.
