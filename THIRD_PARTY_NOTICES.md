# Third-party notices

The original Aureform work is licensed under [Apache 2.0](LICENSE). Each upstream library retains its own license; that grant does not relicense dependencies, icons or fonts.

This table is generated from the installed runtime dependency manifests, rather than the package manifest's requested ranges. The 26 bundled upstream license texts are copied byte for byte from those installed distributions. GSAP's distribution declares its official license URL instead of bundling a standalone license text. Transitive dependencies and development tools retain the notices in their package distributions.

| Package | Verified version | Declared license | Included text |
| --- | --- | --- | --- |
| @base-ui/react | 1.9.0 | MIT | [License text](licenses/third-party/base-ui__react.txt) |
| @hookform/resolvers | 5.9.2 | MIT | [License text](licenses/third-party/hookform__resolvers.txt) |
| @tanstack/react-table | 8.21.3 | MIT | [License text](licenses/third-party/tanstack__react-table.txt) |
| class-variance-authority | 0.7.1 | Apache-2.0 | [License text](licenses/third-party/class-variance-authority.txt) |
| clsx | 2.1.1 | MIT | [License text](licenses/third-party/clsx.txt) |
| cmdk | 1.1.1 | MIT | [License text](licenses/third-party/cmdk.txt) |
| date-fns | 4.4.0 | MIT | [License text](licenses/third-party/date-fns.txt) |
| github-slugger | 2.0.0 | ISC | [License text](licenses/third-party/github-slugger.txt) |
| gsap | 3.15.0 | Standard No Charge license; separate from Apache 2.0 | [License reference](licenses/third-party/gsap-reference.txt) |
| input-otp | 1.5.0 | MIT | [License text](licenses/third-party/input-otp.txt) |
| lenis | 1.3.27 | MIT | [License text](licenses/third-party/lenis.txt) |
| lucide-react | 0.562.0 | ISC | [License text](licenses/third-party/lucide-react.txt) |
| maplibre-gl | 5.24.0 | BSD-3-Clause | [License text](licenses/third-party/maplibre-gl.txt) |
| next | 16.4.2 | MIT | [License text](licenses/third-party/next.txt) |
| next-intl | 4.14.9 | MIT | [License text](licenses/third-party/next-intl.txt) |
| react | 19.3.1 | MIT | [License text](licenses/third-party/react.txt) |
| react-day-picker | 9.14.0 | MIT | [License text](licenses/third-party/react-day-picker.txt) |
| react-dom | 19.3.1 | MIT | [License text](licenses/third-party/react-dom.txt) |
| react-hook-form | 7.90.0 | MIT | [License text](licenses/third-party/react-hook-form.txt) |
| react-markdown | 10.1.0 | MIT | [License text](licenses/third-party/react-markdown.txt) |
| recharts | 3.10.1 | MIT | [License text](licenses/third-party/recharts.txt) |
| remark-gfm | 4.0.1 | MIT | [License text](licenses/third-party/remark-gfm.txt) |
| remark-parse | 11.0.0 | MIT | [License text](licenses/third-party/remark-parse.txt) |
| sonner | 2.0.8 | MIT | [License text](licenses/third-party/sonner.txt) |
| tailwind-merge | 3.7.0 | MIT | [License text](licenses/third-party/tailwind-merge.txt) |
| unified | 11.0.5 | MIT | [License text](licenses/third-party/unified.txt) |
| zod | 4.6.7 | MIT | [License text](licenses/third-party/zod.txt) |

## Fonts

Manrope and Instrument Serif are bundled under the SIL Open Font License 1.1. Their full notices are in [Manrope-OFL.txt](src/assets/fonts/Manrope-OFL.txt) and [InstrumentSerif-OFL.txt](src/assets/fonts/InstrumentSerif-OFL.txt), with the [Manrope upstream notice](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt) and [Instrument Serif upstream notice](https://github.com/google/fonts/blob/main/ofl/instrumentserif/OFL.txt) available in the official font distribution. The fonts are included as individual assets, not sold on their own. The font licenses follow the [official SIL OFL 1.1 text](https://openfontlicense.org/open-font-license-official-text/).

## GSAP

GSAP remains subject to the [official Standard No Charge license](https://gsap.com/community/standard-license/), effective 30 April 2025 and last modified 30 May 2025 when checked on 19 October 2026. It permits use in websites and applications, including commercial projects, at no charge. It separately restricts use in visual animation tools that compete with Webflow's animation-building capabilities. Aureform distributes its own integration code under Apache 2.0 and installs GSAP as a dependency; it does not claim GSAP is Apache, MIT or an OSI-approved open-source dependency.

## Icons and original artwork

Lucide icons are covered by the [Lucide ISC license and inherited MIT/Feather notices](https://github.com/lucide-icons/lucide/blob/main/LICENSE), preserved in the included [installed license text](licenses/third-party/lucide-react.txt). Figma icon exports retain these notices. The Aureform split-A mark, geometric SVG compositions, prepared motion clip and generated image collection are original project assets covered by Apache 2.0 to the extent the contributors hold rights in them.

Generated-image prompts and their recorded model snapshot are in [the image catalog](docs/generated-images/catalog.json). Original masters are distributed in `design/images/masters`; optimized `.webp` files, text-portable `.svg` containers and native Figma PNG derivatives are included. They contain fictional demo subjects and are not upstream stock photographs.

Other runtime license identifiers are verified against the installed manifests and license texts listed above; their upstream source repositories are recorded in those packages. The primary upstream notices also confirm [Lenis MIT](https://github.com/darkroomengineering/lenis/blob/main/LICENSE), [MapLibre BSD-3-Clause and inherited notices](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt), [class-variance-authority 0.7.1 Apache 2.0](https://github.com/joe-bell/cva/blob/v0.7.1/LICENSE) and [Next.js MIT](https://github.com/vercel/next.js/blob/canary/license.md). The bundled texts describe the installed versions; a newer upstream branch does not change those included notices.

## Reference material

The 1.5 integration recipes do not install vendor SDKs into the application.
The isolated [optional SDK verification fixture](scripts/optional-bindings/package.json)
pins Tiptap 3.32.0 and Lexical 0.52.0 (MIT), BlockNote core/React 0.56.0
(MPL-2.0), and Mapbox GL JS 3.33.0 (its independent Mapbox license).
The [verification receipt](docs/integrations/optional-binding-validation.json)
records the actual installed package declarations. Optional BlockNote XL modules
have separate GPL/commercial terms and are not included. Refer to the
[editor recipes](docs/integrations/editors.md) and
[Mapbox recipe](docs/integrations/mapbox-binding.md) for the installation boundary;
Apache 2.0 covers Aureform's glue code, not those SDKs or hosted services.

Google, GitHub, Microsoft and Stripe names and marks belong to their respective owners. The inline provider marks identify mock sign-in choices; Apache 2.0 does not grant trademark rights or imply endorsement. Google Maps is loaded only after an explicit connection and remains subject to Google's service terms.

Integration provider logos are original third-party brand assets used to identify the corresponding services and projects. Their source URLs, consultation dates, file checksums, normalization notes and available brand terms are recorded in the [asset manifest](public/assets/integrations/manifest.json) and [brand asset notice](public/assets/integrations/README.md). They retain their owners' rights and are excluded from Aureform's Apache 2.0 grant. A source repository's code license does not by itself grant trademark rights. Their inclusion does not imply endorsement or a working provider connection.

The Softphone's original Twilio and Telnyx artwork has a separate [source manifest](public/assets/communications/manifest.json) and [brand notice](public/assets/communications/README.md). These marks are also excluded from the Apache grant; the records state the applicable permission boundary without claiming brand approval.

The optional [inbound backend reference](examples/communications-backend/) installs `twilio` 6.2.0 under MIT through its own package lock. Browser voice SDKs are supplied separately by the consuming application and retain their upstream licenses. The default Softphone demo installs and loads neither browser carrier SDK.

The proprietary TailAdmin Pro reference was read to understand feature categories. No proprietary TailAdmin source, image, font, template or license is included in this distribution.

Community files linked in [design research](docs/community-design-references.md) are references, not bundled asset grants. Their publishers' licenses remain independent. The Apache 2.0 grant covers Aureform's original work and does not grant rights to external linked Figma Community files.
