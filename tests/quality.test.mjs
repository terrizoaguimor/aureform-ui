import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import {
  formatQualityMetric,
  parseQualitySnapshots,
  qualityReportPath,
  qualityReportUrl,
  qualityRoutePaths,
  qualityRows,
} from "../src/lib/quality.ts";
import { publicPath } from "../src/lib/public-path.ts";
import { siteOrigin } from "../src/lib/site-config.ts";

// Render the real server content without running Next or generating its state.
const sourceRoot = new URL("../src/", import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/navigation") {
      return nextResolve("next/navigation.js", context);
    }
    if (specifier.startsWith("@/")) {
      const base = new URL(specifier.slice(2), sourceRoot);
      if (existsSync(base)) return nextResolve(base.href, context);
      for (const suffix of [".ts", ".tsx"]) {
        const candidate = `${base.href}${suffix}`;
        if (existsSync(new URL(candidate))) {
          return nextResolve(candidate, context);
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(sourceRoot.href) && url.endsWith(".json")) {
      return {
        format: "module",
        source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`,
        shortCircuit: true,
      };
    }
    if (url.startsWith(sourceRoot.href) && url.endsWith(".css")) {
      return {
        format: "module",
        source:
          "export default new Proxy({}, { get: (_, name) => String(name) });",
        shortCircuit: true,
      };
    }
    if (url.startsWith(sourceRoot.href) && url.endsWith(".tsx")) {
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            jsx: ts.JsxEmit.ReactJSX,
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});
after(() => hooks.deregister());
const { QualityContent } =
  await import("../src/components/quality-content.tsx");
const { QualityShell } = await import("../src/components/quality-shell.tsx");
const qualityPage = await import("../src/app/[locale]/quality/page.tsx");
const { readQualityData } = await import("../src/lib/quality-server.ts");
const { default: robots } = await import("../src/app/robots.ts");
const { default: sitemap } = await import("../src/app/sitemap.ts");

// Synthetic evidence exists only in these tests, never in the public index.
function fixture() {
  return {
    id: "test-snapshot",
    createdAt: "2026-10-19T12:00:00.000Z",
    sourceCommit: "a".repeat(40),
    version: "1.4.1",
    targetOrigin: "https://example.test",
    environment: {
      node: "22.18.0",
      lighthouse: "test",
      chrome: "test",
      platform: "linux",
    },
    results: [
      {
        route: "landing",
        pathname: "/en/",
        profile: "mobile",
        scores: {
          performance: 0,
          accessibility: 97.5,
          "best-practices": 100,
          seo: null,
        },
        metrics: {
          fcp: 1200,
          lcp: 2450,
          cls: 0,
          tbt: 0,
          speedIndex: null,
        },
        runs: [
          {
            id: "run-1",
            json: "landing-mobile-1.json",
            html: "landing-mobile-1.html",
            sha256: { json: "b".repeat(64), html: "c".repeat(64) },
          },
        ],
      },
    ],
  };
}

function html(locale, snapshots, sourceArchive) {
  return renderToStaticMarkup(
    createElement(
      QualityShell,
      { locale },
      createElement(QualityContent, { locale, snapshots, sourceArchive }),
    ),
  );
}

async function sourceFixture(t, snapshots) {
  const directory = resolve("artifacts/quality-reader-tests");
  await mkdir(directory, { recursive: true });
  const root = await mkdtemp(resolve(directory, "source-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const reports = resolve(root, "docs/quality/lighthouse");
  await mkdir(reports, { recursive: true });
  await writeFile(resolve(reports, "index.json"), JSON.stringify(snapshots));
  return { root, reports };
}

test("an empty index renders all six pairs with honest bilingual empty states", () => {
  assert.deepEqual(parseQualitySnapshots([]), []);
  assert.equal(qualityRows().length, 6);
  assert.equal(qualityRoutePaths.documentation, "/en/docs/installation/");
  for (const locale of ["en", "es"]) {
    const output = html(locale, []);
    assert.equal((output.match(/data-quality-route="/g) ?? []).length, 6);
    assert.equal(
      (output.match(/data-quality-status="unmeasured"/g) ?? []).length,
      6,
    );
    assert.match(
      output,
      locale === "es"
        ? /Aún no hay mediciones publicadas/
        : /No published measurements yet/,
    );
    assert.doesNotMatch(output, /class="score"/);
    assert.match(output, /\/en\/docs\/installation\//);
    assert.doesNotMatch(output, /\/quality-reports\/|prefetch|<script/);
    assert.match(output, new RegExp(`href="/${locale}/dashboard/"[^>]*>Demo<`));
    assert.match(output, /https:\/\/github\.com\/sponsors\/terrizoaguimor/);
  }
});

test("recorded medians preserve real zeroes and never fill missing profiles", () => {
  const [snapshot] = parseQualitySnapshots([fixture()]);
  const output = html("en", [snapshot]);
  assert.equal(
    (output.match(/data-quality-status="recorded"/g) ?? []).length,
    1,
  );
  assert.equal(
    (output.match(/data-quality-status="unmeasured"/g) ?? []).length,
    5,
  );
  assert.match(output, /class="score">0</);
  assert.match(output, /class="score">97\.5</);
  assert.match(output, />0\.000</);
  assert.match(output, />0 ms</);
  assert.match(output, /\/commit\/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/);
  assert.match(output, /\/tree\/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\/src/);
  assert.match(
    output,
    /\/quality-reports\/test-snapshot\/landing-mobile-1\.html/,
  );
  assert.match(
    output,
    /\/quality-reports\/test-snapshot\/landing-mobile-1\.json/,
  );
  assert.match(output, /c{64}/);
  assert.match(output, /b{64}/);
});

test("a source ZIP without raw bundles uses canonical reports even with a local mount", async (t) => {
  const snapshot = fixture();
  // These fixtures live inside the real checkout: an ancestor .git must not
  // turn an extracted ZIP into a checkout or require its omitted raw bundles.
  const { root } = await sourceFixture(t, [snapshot]);
  const data = await readQualityData(root);
  assert.deepEqual(data.snapshots, [snapshot]);
  assert.deepEqual(data.sourceArchive, {
    reportOrigin: "https://aureformui.com",
    missingSnapshotIds: [snapshot.id],
  });
  assert.equal(Object.hasOwn(data.snapshots[0], "sourceArchive"), false);
  const report = snapshot.results[0].runs[0];
  assert.equal(
    publicPath(
      qualityReportUrl(snapshot, report.json, data.sourceArchive.reportOrigin),
      "/aureform-ui",
    ),
    `https://aureformui.com/quality-reports/${snapshot.id}/${report.json}`,
  );

  const previousBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
  process.env.NEXT_PUBLIC_BASE_PATH = "/aureform-ui";
  try {
    for (const locale of ["en", "es"]) {
      const output = html(locale, data.snapshots, data.sourceArchive);
      assert.match(
        output,
        /href="https:\/\/aureformui\.com\/quality-reports\/test-snapshot\/landing-mobile-1\.html"/,
      );
      assert.match(
        output,
        /href="https:\/\/aureformui\.com\/quality-reports\/test-snapshot\/landing-mobile-1\.json" target="_blank" rel="noopener noreferrer nofollow"/,
      );
      assert.doesNotMatch(
        output,
        /href="\/(?:aureform-ui\/)?quality-reports\/|prefetch|<script/,
      );
      assert.match(
        output,
        new RegExp(`href="/aureform-ui/${locale}/dashboard/"[^>]*>Demo<`),
      );
      assert.equal((output.match(/data-quality-route="/g) ?? []).length, 6);
      assert.match(output, /class="score">0</);
      assert.match(output, /c{64}/);
      assert.match(output, /b{64}/);
      assert.match(
        output,
        locale === "es"
          ? /Los informes originales están alojados en/
          : /Original reports are hosted on/,
      );
    }
  } finally {
    if (previousBasePath === undefined)
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = previousBasePath;
  }
  const empty = await sourceFixture(t, []);
  assert.deepEqual(await readQualityData(empty.root), {
    snapshots: [],
    sourceArchive: null,
  });
});

test("archive fallback applies per snapshot and never masks an incomplete present directory", async (t) => {
  const latest = fixture();
  const earlier = {
    ...fixture(),
    id: "earlier",
    createdAt: "2026-10-18T12:00:00.000Z",
  };
  const { root, reports } = await sourceFixture(t, [earlier, latest]);
  // A present but empty bundle must keep local links so the raw verifier fails,
  // rather than silently substituting remote files.
  await mkdir(resolve(reports, latest.id));
  const data = await readQualityData(root);
  assert.deepEqual(data.sourceArchive.missingSnapshotIds, [earlier.id]);
  const output = html("en", data.snapshots, data.sourceArchive);
  assert.match(
    output,
    /href="\/quality-reports\/test-snapshot\/landing-mobile-1\.json" download=""/,
  );
  assert.match(
    output,
    /href="https:\/\/aureformui\.com\/quality-reports\/earlier\/landing-mobile-1\.json"/,
  );
  assert.doesNotMatch(
    output,
    /href="https:\/\/aureformui\.com\/quality-reports\/test-snapshot\/|href="\/quality-reports\/earlier\//,
  );
});

test("a Git directory or worktree pointer rejects missing bundles instead of using archive fallback", async (t) => {
  for (const kind of ["directory", "file"]) {
    const snapshot = fixture();
    const { root, reports } = await sourceFixture(t, [snapshot]);
    const git = resolve(root, ".git");
    if (kind === "directory") await mkdir(git);
    else await writeFile(git, "gitdir: fixture-only\n");
    await assert.rejects(
      readQualityData(root),
      /Missing Lighthouse report bundle test-snapshot in Git checkout/,
    );
    await mkdir(resolve(reports, snapshot.id));
    const data = await readQualityData(root);
    assert.equal(data.sourceArchive, null);
    assert.match(
      html("en", data.snapshots, data.sourceArchive),
      /href="\/quality-reports\/test-snapshot\/landing-mobile-1\.json"/,
    );
  }
});

test("snapshots sort by their recorded dates without mutating the source index", () => {
  const earlier = {
    ...fixture(),
    id: "earlier",
    createdAt: "2026-10-18T12:00:00.000Z",
  };
  const input = [earlier, fixture()];
  assert.deepEqual(
    parseQualitySnapshots(input).map((snapshot) => snapshot.id),
    ["test-snapshot", "earlier"],
  );
  assert.equal(input[0].id, "earlier");
});

test("unsafe evidence paths, impossible scores and duplicate measurements fail", () => {
  for (const change of [
    (snapshot) => {
      snapshot.id = "..";
    },
    (snapshot) => {
      snapshot.sourceCommit = "main";
    },
    (snapshot) => {
      const origin = new URL("https://example.test");
      origin.username = "test-user";
      origin.password = "fixture";
      snapshot.targetOrigin = origin.href;
    },
    (snapshot) => {
      snapshot.results[0].runs[0].html = "../report.html";
    },
    (snapshot) => {
      snapshot.results[0].runs[0].json = "https://example.test/report.json";
    },
    (snapshot) => {
      snapshot.results[0].scores.performance = 101;
    },
    (snapshot) => {
      snapshot.results[0].metrics.lcp = -1;
    },
    (snapshot) => {
      snapshot.results[0].runs[0].sha256.html = "missing";
    },
    (snapshot) => {
      snapshot.results.push(structuredClone(snapshot.results[0]));
    },
  ]) {
    const snapshot = fixture();
    change(snapshot);
    assert.throws(
      () => parseQualitySnapshots([snapshot]),
      /Invalid Lighthouse quality index/,
    );
  }
  assert.throws(
    () => parseQualitySnapshots([fixture(), fixture()]),
    /Snapshot IDs must be unique/,
  );
});

test("metric units and report links work for root and mounted exports", () => {
  assert.equal(formatQualityMetric(1200, "fcp", "en"), "1.2 s");
  assert.equal(formatQualityMetric(2450, "lcp", "es"), "2,45 s");
  assert.equal(formatQualityMetric(0, "cls", "en"), "0.000");
  assert.equal(formatQualityMetric(0, "tbt", "en"), "0 ms");
  const [snapshot] = parseQualitySnapshots([fixture()]);
  const path = qualityReportPath(snapshot, snapshot.results[0].runs[0].html);
  assert.equal(publicPath(path, "/aureform-ui"), `/aureform-ui${path}`);
  const previousBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
  process.env.NEXT_PUBLIC_BASE_PATH = "/aureform-ui";
  try {
    for (const locale of ["en", "es"]) {
      const emptyOutput = html(locale, []);
      assert.match(
        emptyOutput,
        new RegExp(`href="/aureform-ui/${locale}/dashboard/"[^>]*>Demo<`),
      );
      assert.doesNotMatch(
        emptyOutput,
        /\/aureform-ui\/aureform-ui\/|\/quality-reports\/|prefetch/,
      );
    }
    const output = html("es", [snapshot]);
    assert.match(output, /href="\/aureform-ui\/es\/quality\/"/);
    assert.match(
      output,
      /href="\/aureform-ui\/quality-reports\/test-snapshot\/landing-mobile-1\.html"/,
    );
    assert.equal(robots().rules.disallow, "/aureform-ui/quality-reports/");
  } finally {
    if (previousBasePath === undefined)
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = previousBasePath;
  }
});

test("quality metadata keeps public canonical alternates while local links use the mount", async () => {
  assert.equal(qualityPage.dynamic, "force-static");
  assert.equal(qualityPage.dynamicParams, false);
  assert.deepEqual(qualityPage.generateStaticParams(), [
    { locale: "en" },
    { locale: "es" },
  ]);
  const previousBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
  try {
    for (const basePath of ["", "/aureform-ui"]) {
      process.env.NEXT_PUBLIC_BASE_PATH = basePath;
      for (const locale of ["en", "es"]) {
        const metadata = await qualityPage.generateMetadata({
          params: Promise.resolve({ locale }),
        });
        const canonical = `${siteOrigin}/${locale}/quality/`;
        assert.equal(metadata.metadataBase.href, `${siteOrigin}/`);
        assert.equal(metadata.alternates.canonical, canonical);
        assert.deepEqual(metadata.alternates.languages, {
          en: `${siteOrigin}/en/quality/`,
          es: `${siteOrigin}/es/quality/`,
          "x-default": `${siteOrigin}/en/quality/`,
        });
        assert.equal(metadata.openGraph.url, canonical);
        assert.equal(
          metadata.openGraph.locale,
          locale === "es" ? "es_ES" : "en_US",
        );
        assert.match(
          metadata.title.absolute,
          locale === "es"
            ? /Calidad e informes de Lighthouse/
            : /Quality & Lighthouse reports/,
        );
        assert.ok(metadata.description.length > 30);
        assert.equal(metadata.robots.index, true);
        assert.equal(metadata.robots.follow, true);
      }
    }
  } finally {
    if (previousBasePath === undefined)
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = previousBasePath;
  }
});

test("the sitemap includes both quality pages and excludes raw reports", () => {
  const paths = sitemap().map((entry) => new URL(entry.url).pathname);
  assert.ok(paths.includes("/en/quality/"));
  assert.ok(paths.includes("/es/quality/"));
  assert.ok(paths.every((path) => !path.startsWith("/quality-reports/")));
});
