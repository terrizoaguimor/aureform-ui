import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { kitRoot } from "./lib/source-graph.mjs";
const manifest = JSON.parse(
    await readFile(resolve(kitRoot, "package.json"), "utf8"),
  ),
  rows = [],
  unresolved = [];
let licenseTextCount = 0;
await mkdir(resolve(kitRoot, "licenses/third-party"), { recursive: true });
for (const name of Object.keys(manifest.dependencies).sort()) {
  const path = resolve(kitRoot, "node_modules", name);
  const pkg = JSON.parse(
    await readFile(resolve(path, "package.json"), "utf8").catch(() => {
      unresolved.push(name);
      return "{}";
    }),
  );
  if (!pkg.name) continue;
  const licenseFile = (await readdir(path)).find((file) =>
    /^licen[cs]e(?:\.[a-z]+)?$/i.test(file),
  );
  let licensePath;
  let licenseLabel = "License text";
  if (licenseFile) {
    licenseTextCount += 1;
    licensePath = `licenses/third-party/${name.replaceAll("/", "__").replace("@", "")}.txt`;
    await writeFile(
      resolve(kitRoot, licensePath),
      await readFile(resolve(path, licenseFile)),
    );
  } else if (name === "gsap") {
    licensePath = "licenses/third-party/gsap-reference.txt";
    licenseLabel = "License reference";
    await writeFile(
      resolve(kitRoot, licensePath),
      `GSAP ${pkg.version}

Declared license: ${pkg.license}
Official terms: https://gsap.com/community/standard-license/

The npm distribution supplies its license URL instead of a standalone LICENSE file. GSAP retains its own Standard No Charge license; it is not relicensed under Aureform's Apache-2.0 license. Source ZIPs contain Aureform's original GSAP integration code; consumers install GSAP as a dependency. A compiled demo may include GSAP in its JavaScript bundles under GSAP's own license.

Official terms verified 19 October 2026:
https://gsap.com/community/standard-license/
Effective date: April 30, 2025.
Last modified date: May 30, 2025.

The official license permits use on websites and applications, including commercial projects at no charge, and separately restricts use in visual animation tools that compete with Webflow's animation-building capabilities. This reference summarizes the distinction only; the official license governs GSAP.
`,
    );
  }
  const license =
    name === "gsap"
      ? "Standard No Charge license; separate from Apache 2.0"
      : typeof pkg.license === "string"
        ? pkg.license
        : JSON.stringify(
            pkg.license ?? pkg.licenses ?? "See package distribution",
          );
  rows.push(
    `| ${name} | ${pkg.version} | ${license} | ${licensePath ? `[${licenseLabel}](${licensePath})` : "See dependency distribution"} |`,
  );
}
if (unresolved.length)
  throw new Error(
    `Install dependencies before generating notices: ${unresolved.join(", ")}`,
  );
await writeFile(
  resolve(kitRoot, "THIRD_PARTY_NOTICES.md"),
  `# Third-party notices

The original Aureform work is licensed under [Apache 2.0](LICENSE). Each upstream library retains its own license; that grant does not relicense dependencies, icons or fonts.

This table is generated from the installed runtime dependency manifests, rather than the package manifest's requested ranges. The ${licenseTextCount} bundled upstream license texts are copied byte for byte from those installed distributions. GSAP's distribution declares its official license URL instead of bundling a standalone license text. Transitive dependencies and development tools retain the notices in their package distributions.

| Package | Verified version | Declared license | Included text |
| --- | --- | --- | --- |
${rows.join("\n")}

## Fonts

Manrope and Instrument Serif are bundled under the SIL Open Font License 1.1. Their full notices are in [Manrope-OFL.txt](src/assets/fonts/Manrope-OFL.txt) and [InstrumentSerif-OFL.txt](src/assets/fonts/InstrumentSerif-OFL.txt), with the [Manrope upstream notice](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt) and [Instrument Serif upstream notice](https://github.com/google/fonts/blob/main/ofl/instrumentserif/OFL.txt) available in the official font distribution. The fonts are included as individual assets, not sold on their own. The font licenses follow the [official SIL OFL 1.1 text](https://openfontlicense.org/open-font-license-official-text/).

## GSAP

GSAP remains subject to the [official Standard No Charge license](https://gsap.com/community/standard-license/), effective 30 April 2025 and last modified 30 May 2025 when checked on 19 October 2026. It permits use in websites and applications, including commercial projects, at no charge. It separately restricts use in visual animation tools that compete with Webflow's animation-building capabilities. Aureform distributes its own integration code under Apache 2.0 and installs GSAP as a dependency; it does not claim GSAP is Apache, MIT or an OSI-approved open-source dependency.

## Icons and original artwork

Lucide icons are covered by the [Lucide ISC license and inherited MIT/Feather notices](https://github.com/lucide-icons/lucide/blob/main/LICENSE), preserved in the included [installed license text](licenses/third-party/lucide-react.txt). Figma icon exports retain these notices. The Aureform split-A mark, geometric SVG compositions, prepared motion clip and generated image collection are original project assets covered by Apache 2.0 to the extent the contributors hold rights in them.

Generated-image prompts and their recorded model snapshot are in [the image catalog](docs/generated-images/catalog.json). Original masters are distributed in \`design/images/masters\`; optimized \`.webp\` files, text-portable \`.svg\` containers and native Figma PNG derivatives are included. They contain fictional demo subjects and are not upstream stock photographs.

Other runtime license identifiers are verified against the installed manifests and license texts listed above; their upstream source repositories are recorded in those packages. The primary upstream notices also confirm [Lenis MIT](https://github.com/darkroomengineering/lenis/blob/main/LICENSE), [MapLibre BSD-3-Clause and inherited notices](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt), [class-variance-authority 0.7.1 Apache 2.0](https://github.com/joe-bell/cva/blob/v0.7.1/LICENSE) and [Next.js MIT](https://github.com/vercel/next.js/blob/canary/license.md). The bundled texts describe the installed versions; a newer upstream branch does not change those included notices.

## Reference material

The proprietary TailAdmin Pro reference was read to understand feature categories. No proprietary TailAdmin source, image, font, template or license is included in this distribution.

Community files linked in [design research](docs/community-design-references.md) are references, not bundled asset grants. Their publishers' licenses remain independent. The Apache 2.0 grant covers Aureform's original work and does not grant rights to external linked Figma Community files.
`,
);
console.log(`Recorded licenses for ${rows.length} installed runtime packages.`);
