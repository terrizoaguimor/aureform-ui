# Aureform UI 1.4.0 — application workflows

This release expands the frontend application kit under Apache 2.0. The public demo keeps commerce and authentication local and mock; Google Maps is an explicit optional connection.

- Product catalog and a tabbed editor for details, pricing, inventory and media, with live preview.
- Image upload, validation, crop, rotation, alt text, primary image and ordering, including the supplied product photos.
- Shared workspace commerce state: purchase-time prices, order creation, fulfillment, mock payment failure/retry, inventory updates and one invoice per paid order.
- Invoice creation, detail, safe local HTML export/print and mock payment.
- Billing plans, invoice history and a customer portal preview.
- Typed Stripe transport for the consuming application's authenticated backend, with documented endpoint and webhook responsibilities.
- Local Maps search, layers, selection and GeoJSON export, plus a lazy Google Maps SDK adapter and public browser-key configuration.
- Discoverable sign-in, sign-up, recovery and verification views; Google, GitHub and Microsoft mock buttons with replaceable callbacks.
- 107 registry entries, application block discovery, English/Spanish guides and 13 actual browser screenshots.

The [integration guide](application-integrations.md), [Spanish guide](application-integrations.es.md), [Maps guide](google-maps.md) and [Client examples](../examples/ApplicationAdapters.tsx) explain how to connect services.

## Executed checks

The [runtime record](qa-runtime-1.4.0.json) binds the source fingerprint and evidence scopes: 244 unit tests, 92 full-suite browser tests, 18 final mounted application tests, all 69 views in EN/ES desktop dark, 13 ES mobile light views, ten main-region Axe scans, type/lint/build, strict component examples and 92 local Code Connect templates.

The final mounted tests also cover product catalog accessibility after the photo-button label correction, synced labels and products without images. Automated contrast incomplete results remain recorded; these checks are not a complete accessibility certification.

The CLI and official shadcn consumers are independent minimal hosts. Installation, supplied assets, types, lint and builds are recorded separately in the delivery receipt. No real Stripe/OAuth transaction or Google project was used.

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm verify:examples
pnpm build
pnpm test:e2e
NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm build
NEXT_PUBLIC_BASE_PATH=/aureform-ui pnpm verify:pages
python3 scripts/generate-code-connect.py
pnpm verify:code-connect
pnpm coverage
pnpm verify:public
```

## Distribution

Run `pnpm package:source` against the frozen source. The source archive is capped at 90 MiB; other application archives at 25 MiB. Keep the three historical native evidence archives byte-identical. Verify archive CRC, source conservation and public-download hashes against [checksums.json](../public/downloads/checksums.json).

The matching [delivery receipt](../public/downloads/verification-1.4.0.json) records archive and publication results. The public repository is [terrizoaguimor/aureform-ui](https://github.com/terrizoaguimor/aureform-ui), with its [Pages demo](https://terrizoaguimor.github.io/aureform-ui/). Documentation download buttons use the corresponding GitHub release assets; the source ZIP excludes nested downloads and builds without needing a copy of itself.

Native Figma, image provenance and earlier review scopes remain historical. New application blocks are source additions; this release claims no new native master, all-route native visual review or cloud Code Connect publication.
