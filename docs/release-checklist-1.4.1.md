# Aureform UI 1.4.1 — website and documentation delivery

Version 1.4.1 adds a public Cloudflare site at [aureformui.com](https://aureformui.com/), a new editorial landing and a dedicated documentation experience. The application services remain frontend mocks with typed integration boundaries.

The landing uses actual product captures, local fonts, six selectable palettes, light/dark themes, an interactive checklist, gradients and the existing GSAP/Lenis motion contract. The documentation exposes 22 chapters, 19 with actual English/Spanish sources and three clearly identified original-language fallbacks. It includes local heading search, a mobile drawer, section anchors, chapter navigation and real multiline clipboard copy.

SEO includes static article HTML, localized titles and descriptions, absolute canonical URLs, reciprocal hreflang for available translations, sitemap, robots, structured data and an original 1200 × 630 social image. Mock application records and untranslated duplicate articles carry `noindex`; they are excluded from the sitemap.

Marketing and documentation have separate routes and providers. Visible links and hover do not download the application bundle; opening the demo loads it on demand. This behavior is checked against actual network requests rather than inferred from initial HTML script tags.

## Evidence

The [version-scoped local QA receipt](qa-runtime-1.4.1.json) records unit tests, strict examples, browser cohorts at the domain root and `/aureform-ui`, and scoped Axe scans. It retains unresolved automated results and separates this evidence from historical Figma reviews.

The [initial loading receipt](research/1.4.1-website-loading.json) records fresh local Chromium contexts, actual themes and script body sizes. These are local observations, without a field Core Web Vitals or INP claim. The [research report](research-gaps-1.4.es.md) retains twenty findings against the immutable 1.4.0 baseline; proposed workflows are not delivered APIs.

The Cloudflare adapter packages the static export using the installed CF Build Output helpers. It keeps assets below 25 MiB and serves a real 404. The full source ZIP is redirected to its matching GitHub release because it exceeds that asset limit. The release gate streams that public ZIP and checks its size and SHA-256 against the manifest before deployment.

## Publication record

The [v1.4.1 release](https://github.com/terrizoaguimor/aureform-ui/releases/tag/v1.4.1) carries the source, starter, component sample, generated image collection, immutable native evidence companions and checksums. A separate `cloudflare-deployment-1.4.1.json` release asset records actual production checks after publication, including HTTPS, canonical redirects and archive hashes. This document describes the delivery procedure; the production receipt supplies the observed result.

The main branch has separate Cloudflare and GitHub Pages workflows. Pull requests run the Cloudflare build and browser checks without deployment credentials. Production receives account/zone-scoped credentials from encrypted GitHub secrets only in its deployment step. Credentials and local deployment state are excluded from Git and the source archive.

Apache 2.0 applies to Aureform's original source. Upstream package and font notices remain included. Native Figma and generated-image evidence retain their existing 1.2.1 and earlier checkpoints; this release does not recertify them.
