import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const snapshots = JSON.parse(
  await readFile(new URL("docs/quality/lighthouse/index.json", root), "utf8"),
);
assert(Array.isArray(snapshots), "Quality history must be an array.");
const snapshot = [...snapshots].sort((a, b) =>
  b.createdAt.localeCompare(a.createdAt),
)[0];
if (!snapshot) {
  console.log("No measured snapshot: README score badges remain unpublished.");
  process.exit(0);
}
assert.match(snapshot.sourceCommit, /^[a-f0-9]{40}$/);
assert.match(snapshot.id, /^[a-zA-Z0-9_-]+$/);
assert.equal(snapshot.results.length, 6);
assert(!Number.isNaN(Date.parse(snapshot.createdAt)));
const categories = ["performance", "accessibility", "best-practices", "seo"];
for (const result of snapshot.results) {
  assert.equal(result.runs.length, 3);
  for (const category of categories) {
    const value = result.scores[category];
    assert(
      Number.isFinite(value) && value >= 0 && value <= 100,
      "README badges require actual finite Lighthouse scores.",
    );
  }
}
const title = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const badgeDirectory = new URL("public/badges/", root);
await mkdir(badgeDirectory, { recursive: true });
for (const profile of ["mobile", "desktop"]) {
  const result = snapshot.results.find(
    (item) => item.route === "landing" && item.profile === profile,
  );
  assert(result, `Missing landing/${profile} result.`);
  const score = Math.round(result.scores.performance);
  const color = score >= 90 ? "#1f7450" : score >= 50 ? "#9a6417" : "#af3f46";
  const description = `Lighthouse performance, landing, ${profile}, median of three runs: ${score}/100. Audited ${snapshot.createdAt}, commit ${snapshot.sourceCommit}.`;
  const label = `Lighthouse ${profile}`;
  const labelWidth = profile === "mobile" ? 124 : 132;
  const width = labelWidth + 65;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${title(description)}"><title>${title(description)}</title><clipPath id="r"><rect width="${width}" height="20" rx="3"/></clipPath><g clip-path="url(#r)"><path fill="#343a43" d="M0 0h${labelWidth}v20H0z"/><path fill="${color}" d="M${labelWidth} 0h65v20h-65z"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11"><text x="${labelWidth / 2}" y="14">${label}</text><text x="${labelWidth + 32.5}" y="14">${score} / 100</text></g></svg>\n`;
  await writeFile(
    new URL(`lighthouse-${profile}.svg`, badgeDirectory),
    svg,
    "utf8",
  );
}

for (const locale of ["en", "es"]) {
  const spanish = locale === "es";
  const file = new URL(spanish ? "README.es.md" : "README.md", root);
  const original = await readFile(file, "utf8");
  const pageNames = spanish
    ? {
        landing: "Landing",
        documentation: "Documentación",
        dashboard: "Dashboard demo",
      }
    : {
        landing: "Landing",
        documentation: "Documentation",
        dashboard: "Demo dashboard",
      };
  const profileNames = spanish
    ? { mobile: "Móvil", desktop: "Escritorio" }
    : { mobile: "Mobile", desktop: "Desktop" };
  const rows = snapshot.results.map((result) => {
    const scores = categories.map((key) => Math.round(result.scores[key]));
    return `| ${pageNames[result.route]} · ${profileNames[result.profile]} | ${scores.join(" | ")} |`;
  });
  const date = snapshot.createdAt.replace("T", " ").replace(/\.\d+Z$/, " UTC");
  const content = [
    "<!-- BEGIN:quality-results -->",
    `[![Lighthouse landing mobile median](public/badges/lighthouse-mobile.svg)](https://aureformui.com/${locale}/quality/) [![Lighthouse landing desktop median](public/badges/lighthouse-desktop.svg)](https://aureformui.com/${locale}/quality/)`,
    "",
    spanish
      ? `**Medición: ${date} · Lighthouse ${snapshot.environment.lighthouse} · commit [${snapshot.sourceCommit.slice(0, 7)}](https://github.com/terrizoaguimor/aureform-ui/commit/${snapshot.sourceCommit}).** Medianas de tres pasadas por página y dispositivo; puntajes sobre 100.`
      : `**Measured: ${date} · Lighthouse ${snapshot.environment.lighthouse} · commit [${snapshot.sourceCommit.slice(0, 7)}](https://github.com/terrizoaguimor/aureform-ui/commit/${snapshot.sourceCommit}).** Medians of three runs per page and device; scores out of 100.`,
    "",
    spanish
      ? "| Página · Dispositivo | Rendimiento | Accesibilidad | Buenas prácticas | SEO |"
      : "| Page · Device | Performance | Accessibility | Best practices | SEO |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...rows,
    "",
    spanish
      ? `[Metodología, métricas y los 18 informes →](https://aureformui.com/es/quality/) · [JSON y HTML originales](docs/quality/lighthouse/${snapshot.id}/)`
      : `[Methodology, metrics and all 18 reports →](https://aureformui.com/en/quality/) · [Original JSON and HTML](docs/quality/lighthouse/${snapshot.id}/)`,
    "<!-- END:quality-results -->",
  ].join("\n");
  const pattern =
    /<!-- BEGIN:quality-results -->[\s\S]*?<!-- END:quality-results -->/g;
  assert.equal(
    [...original.matchAll(pattern)].length,
    1,
    "One quality block is required.",
  );
  await writeFile(file, original.replace(pattern, content), "utf8");
}
console.log(
  `Updated both README quality tables and landing badges from ${snapshot.id}; audited commit ${snapshot.sourceCommit}.`,
);
