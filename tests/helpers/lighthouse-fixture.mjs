import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  chromeVersion,
  metricAudits,
  projectRoot,
  readReportContract,
  sha256,
} from "../../scripts/lib/quality.mjs";
import { collectSnapshot } from "../../scripts/lib/quality-collection.mjs";

export const sourceCommit = "1234567890abcdef1234567890abcdef12345678";
export const initialBuild = {
  sourceCommit,
  version: "1.4.1",
  builtAt: "2026-10-01T00:00:00.000Z",
};
export const fixtureTemplate =
  "<!doctype html><title>Synthetic test fixture, not an audit</title><script>window.__LIGHTHOUSE_JSON__ = {};</script>";
export function fixtureHtml(lhr) {
  return fixtureTemplate.replace(
    "{}",
    JSON.stringify(lhr).replaceAll("<", "\\u003c"),
  );
}

export async function temporaryProject(t) {
  const parent = resolve(projectRoot, "artifacts/quality/tests");
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(resolve(parent, "fixture-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, "docs/quality/lighthouse"), { recursive: true });
  await writeFile(resolve(root, "docs/quality/lighthouse/index.json"), "[]\n");
  await writeFile(resolve(root, "package.json"), '{"version":"1.4.1"}\n');
  await mkdir(resolve(root, "public"), { recursive: true });
  await writeFile(
    resolve(root, "public/build-info.json"),
    JSON.stringify(initialBuild),
  );
  return root;
}

export function syntheticLhr(contract, { url, profile, iteration, fetchTime }) {
  // All numbers below are deliberately synthetic test inputs, never published.
  const scores = {
    performance: [0.37, 0.94, 0.68],
    accessibility: [0.9, 0.83, 1],
    "best-practices": [0.99, 1, 0.8],
    seo: [1, 0.9, 0.95],
  };
  const metrics = {
    fcp: [1500, 9000, 2600],
    lcp: [2000, 12000, 3100],
    cls: [0.02, 0.5, 0.03],
    tbt: [0, 800, 110],
    speedIndex: [1600, 8000, 2700],
  };
  const audits = Object.fromEntries(
    contract.auditIds.map((id) => [
      id,
      {
        id,
        title: `Synthetic ${id}`,
        description: "Synthetic fixture for validation only.",
        score: 1,
        scoreDisplayMode: "binary",
      },
    ]),
  );
  for (const [metric, auditId] of Object.entries(metricAudits)) {
    Object.assign(audits[auditId], {
      numericValue: metrics[metric][iteration - 1],
      numericUnit: metric === "cls" ? "unitless" : "millisecond",
      scoreDisplayMode: "numeric",
    });
  }
  const userAgent = `Mozilla/5.0 HeadlessChrome/${chromeVersion} Safari/537.36`;
  return {
    lighthouseVersion: "13.5.0",
    requestedUrl: url,
    mainDocumentUrl: url,
    finalUrl: url,
    finalDisplayedUrl: url,
    fetchTime,
    gatherMode: "navigation",
    userAgent,
    environment: {
      hostUserAgent: userAgent,
      networkUserAgent: userAgent,
      benchmarkIndex: 1000,
    },
    categories: Object.fromEntries(
      Object.entries(contract.profiles[profile].categories).map(
        ([id, category]) => [
          id,
          {
            ...structuredClone(category),
            id,
            score: scores[id][iteration - 1],
          },
        ],
      ),
    ),
    audits,
    configSettings: structuredClone(contract.profiles[profile].settings),
    timing: { total: 1000 },
    i18n: { rendererFormattedStrings: {} },
  };
}

export async function collectionFixture(t, options = {}) {
  const root = await temporaryProject(t);
  const output = resolve(root, "bundle");
  const contract = {
    ...(await readReportContract()),
    htmlTemplateSha256: sha256(fixtureTemplate),
  };
  const environment = {
    node: "v24.13.0",
    lighthouse: "13.5.0",
    chrome: chromeVersion,
    platform: "linux-x64",
  };
  let tick = 0;
  let active = 0;
  let maximumActive = 0;
  const operations = [];
  const base = Date.parse("2026-10-02T00:00:00.000Z");
  const now = () => new Date(base + tick++ * 1000);
  const input = {
    id: "synthetic-test-only",
    sourceCommit,
    version: "1.4.1",
    targetOrigin: "https://aureformui.com",
    environment,
    runner: {
      kind: "local",
      platform: "linux-x64",
      kernel: "synthetic-fixture-only",
      image: { label: null, os: null, version: null },
    },
    output,
    contract,
    now,
    renderHtml: fixtureHtml,
    buildInfo: async () => {
      operations.push("build-info");
      return structuredClone(initialBuild);
    },
    audit: async ({ url, profile, runId }) => {
      operations.push(`audit:${runId}`);
      active++;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active--;
      return syntheticLhr(contract, {
        url,
        profile,
        iteration: Number(runId.at(-1)),
        fetchTime: new Date(base + (tick - 1) * 1000 + 500).toISOString(),
      });
    },
  };
  const snapshot = await collectSnapshot({ ...input, ...options });
  return { root, output, contract, snapshot, operations, maximumActive };
}

export async function rewriteReport(fixture, run, edit) {
  const lhr = JSON.parse(
    await readFile(resolve(fixture.output, run.json), "utf8"),
  );
  edit(lhr);
  const json = `${JSON.stringify(lhr, null, 2)}\n`;
  const html = fixtureHtml(lhr);
  await writeFile(resolve(fixture.output, run.json), json);
  await writeFile(resolve(fixture.output, run.html), html);
  run.sha256 = { json: sha256(json), html: sha256(html) };
  return lhr;
}
