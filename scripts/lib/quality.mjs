import { createHash, randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { hasGitCheckout } from "./git-checkout.mjs";

export const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const indexPath = "docs/quality/lighthouse/index.json";
export const lighthouseVersion = "13.5.0";
export const playwrightVersion = "1.64.1";
export const chromiumRevision = "1248";
export const chromeVersion = "156.0.8078.4";
export const categories = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
];
export const profiles = ["mobile", "desktop"];
export const routes = [
  { route: "landing", pathname: "/en/" },
  { route: "documentation", pathname: "/en/docs/installation/" },
  { route: "dashboard", pathname: "/en/dashboard/" },
];
export const metricAudits = {
  fcp: "first-contentful-paint",
  lcp: "largest-contentful-paint",
  cls: "cumulative-layout-shift",
  tbt: "total-blocking-time",
  speedIndex: "speed-index",
};

export function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function object(value, label) {
  requireCondition(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object.`,
  );
}

function keys(value, expected, label) {
  object(value, label);
  requireCondition(
    isDeepStrictEqual(Object.keys(value).sort(), [...expected].sort()),
    `${label} must contain exactly ${expected.join(", ")}.`,
  );
}

export function knownCommit(value, label = "sourceCommit") {
  requireCondition(
    typeof value === "string" &&
      /^[0-9a-f]{40}$/.test(value) &&
      !/^0+$/.test(value),
    `${label} must be a known, full, lowercase Git SHA; unknown is not publishable.`,
  );
  return value;
}

export function safeId(value, label = "id") {
  requireCondition(
    typeof value === "string" && /^[a-z0-9][a-z0-9_-]{0,95}$/.test(value),
    `${label} must be a flat identifier using lowercase letters, numbers, - or _.`,
  );
  return value;
}

export function isoDate(value, label) {
  requireCondition(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString() === value,
    `${label} must be an ISO UTC timestamp with milliseconds.`,
  );
  return value;
}

function version(value, label = "version") {
  requireCondition(
    typeof value === "string" &&
      /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value),
    `${label} must be a package version.`,
  );
}

export function supportsLighthouseNode(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value);
  return Boolean(
    match && (+match[1] > 22 || (+match[1] === 22 && +match[2] >= 19)),
  );
}

export function normalizeOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("targetOrigin must be a public HTTPS origin.");
  }
  requireCondition(
    url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      /^[a-z0-9.-]+$/.test(url.hostname) &&
      url.hostname.includes(".") &&
      !url.hostname.endsWith(".") &&
      !/^(?:localhost|.*\.localhost|.*\.local|.*\.internal)$/.test(
        url.hostname,
      ),
    "targetOrigin must be a public HTTPS origin without credentials, a port or a path.",
  );
  return url.origin;
}

export function validateBuildInfo(
  info,
  { allowUnknown = false, expectedCommit, expectedVersion } = {},
) {
  keys(info, ["sourceCommit", "version", "builtAt"], "build-info");
  if (!(allowUnknown && info.sourceCommit === "unknown"))
    knownCommit(info.sourceCommit);
  version(info.version, "build-info.version");
  isoDate(info.builtAt, "build-info.builtAt");
  if (expectedCommit !== undefined) {
    knownCommit(expectedCommit, "expected commit");
    requireCondition(
      info.sourceCommit === expectedCommit,
      "Public build-info does not match the expected commit.",
    );
  }
  if (expectedVersion !== undefined) {
    requireCondition(
      info.version === expectedVersion,
      "Public build-info does not match the expected version.",
    );
  }
  return info;
}

function validateEnvironment(environment) {
  keys(
    environment,
    ["node", "lighthouse", "chrome", "platform"],
    "environment",
  );
  requireCondition(
    supportsLighthouseNode(environment.node),
    "environment.node must support Lighthouse (Node >=22.19).",
  );
  requireCondition(
    environment.lighthouse === lighthouseVersion,
    `environment.lighthouse must be ${lighthouseVersion}.`,
  );
  requireCondition(
    environment.chrome === chromeVersion,
    `environment.chrome must be the pinned Chromium ${chromeVersion}.`,
  );
  requireCondition(
    typeof environment.platform === "string" &&
      /^[a-z0-9]+-[a-z0-9_]+$/.test(environment.platform),
    "environment.platform must identify the Node platform and architecture.",
  );
}

function numbers(value, expectedKeys, label, max = Infinity) {
  keys(value, expectedKeys, label);
  for (const [key, number] of Object.entries(value)) {
    requireCondition(
      typeof number === "number" &&
        Number.isFinite(number) &&
        number >= 0 &&
        number <= max,
      `${label}.${key} must be a finite number between 0 and ${max}.`,
    );
  }
}

export function validateSnapshot(snapshot) {
  keys(
    snapshot,
    [
      "id",
      "createdAt",
      "sourceCommit",
      "version",
      "targetOrigin",
      "environment",
      "results",
    ],
    "snapshot",
  );
  safeId(snapshot.id, "snapshot.id");
  isoDate(snapshot.createdAt, "snapshot.createdAt");
  knownCommit(snapshot.sourceCommit);
  version(snapshot.version);
  requireCondition(
    normalizeOrigin(snapshot.targetOrigin) === snapshot.targetOrigin,
    "targetOrigin must be normalized.",
  );
  validateEnvironment(snapshot.environment);
  requireCondition(
    Array.isArray(snapshot.results) && snapshot.results.length === 6,
    "A snapshot must have all six route/profile results.",
  );
  const combinations = new Set();
  const runIds = new Set();
  const filenames = new Set();
  for (const result of snapshot.results) {
    keys(
      result,
      ["route", "pathname", "profile", "scores", "metrics", "runs"],
      "result",
    );
    requireCondition(
      routes.some(
        (route) =>
          route.route === result.route && route.pathname === result.pathname,
      ),
      "Each result must identify one of the three agreed English routes.",
    );
    requireCondition(
      profiles.includes(result.profile),
      "Each result must use mobile or desktop.",
    );
    const combination = `${result.route}/${result.profile}`;
    requireCondition(
      !combinations.has(combination),
      `Duplicate result ${combination}.`,
    );
    combinations.add(combination);
    numbers(result.scores, categories, `${combination}.scores`, 100);
    numbers(
      result.metrics,
      Object.keys(metricAudits),
      `${combination}.metrics`,
    );
    requireCondition(
      Array.isArray(result.runs) && result.runs.length === 3,
      `${combination} must have exactly three runs.`,
    );
    for (const run of result.runs) {
      keys(run, ["id", "json", "html", "sha256"], "run");
      safeId(run.id, "run.id");
      requireCondition(!runIds.has(run.id), `Duplicate run id ${run.id}.`);
      runIds.add(run.id);
      keys(run.sha256, ["json", "html"], "run.sha256");
      for (const extension of ["json", "html"]) {
        requireCondition(
          run[extension] === `${run.id}.${extension}`,
          "Report filenames must be flat and match their run id.",
        );
        requireCondition(
          !filenames.has(run[extension]),
          `Duplicate report filename ${run[extension]}.`,
        );
        filenames.add(run[extension]);
        requireCondition(
          typeof run.sha256[extension] === "string" &&
            /^[0-9a-f]{64}$/.test(run.sha256[extension]),
          `run.sha256.${extension} must be a full lowercase SHA-256 hash.`,
        );
      }
    }
  }
  return snapshot;
}

export function validateIndex(index) {
  requireCondition(
    Array.isArray(index),
    "The Lighthouse index must be an array.",
  );
  const ids = new Set();
  for (const snapshot of index) {
    validateSnapshot(snapshot);
    requireCondition(
      !ids.has(snapshot.id),
      `Duplicate snapshot id ${snapshot.id}.`,
    );
    ids.add(snapshot.id);
  }
  return index;
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function median(values) {
  requireCondition(
    Array.isArray(values) &&
      values.length === 3 &&
      values.every(
        (value) => typeof value === "number" && Number.isFinite(value),
      ),
    "A lab median requires exactly three finite measurements.",
  );
  return [...values].sort((a, b) => a - b)[1];
}

export function measurements(lhr) {
  const rawScores = {};
  const metrics = {};
  for (const category of categories)
    rawScores[category] = lhr.categories?.[category]?.score;
  for (const [metric, audit] of Object.entries(metricAudits))
    metrics[metric] = lhr.audits?.[audit]?.numericValue;
  numbers(rawScores, categories, "Lighthouse raw scores", 1);
  numbers(metrics, Object.keys(metricAudits), "Lighthouse lab metrics");
  return { rawScores, metrics };
}

export function aggregateRuns(lhrs) {
  requireCondition(
    lhrs.length === 3,
    "Each result requires three full reports.",
  );
  const values = lhrs.map(measurements);
  return {
    scores: Object.fromEntries(
      categories.map((category) => [
        category,
        Math.round(
          median(values.map((value) => value.rawScores[category])) * 100,
        ),
      ]),
    ),
    metrics: Object.fromEntries(
      Object.keys(metricAudits).map((metric) => [
        metric,
        median(values.map((value) => value.metrics[metric])),
      ]),
    ),
  };
}

export async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON ${path}: ${error.message}`, {
      cause: error,
    });
  }
}

export async function readReportContract() {
  return readJson(
    resolve(projectRoot, "tools/lighthouse/report-contract.json"),
  );
}

export function reportFromHtml(html) {
  const marker = "<script>window.__LIGHTHOUSE_JSON__ = ";
  const start = html.indexOf(marker);
  requireCondition(
    start >= 0 && html.indexOf(marker, start + 1) < 0,
    "HTML must contain one standalone Lighthouse report.",
  );
  const jsonStart = start + marker.length;
  const end = html.indexOf(";</script>", jsonStart);
  requireCondition(end > jsonStart, "HTML Lighthouse data is incomplete.");
  let embedded;
  try {
    embedded = JSON.parse(html.slice(jsonStart, end));
  } catch {
    throw new Error("HTML Lighthouse data is invalid JSON.");
  }
  return {
    embedded,
    template: `${html.slice(0, jsonStart)}{}${html.slice(end)}`,
  };
}

export function validateLighthouseReport(lhr, html, { targetOrigin, result, contract }) {
  object(lhr, "Lighthouse report");
  requireCondition(
    lhr.lighthouseVersion === lighthouseVersion,
    "The raw Lighthouse version is not pinned.",
  );
  requireCondition(
    !lhr.runtimeError,
    "A report with a Lighthouse runtime error is incomplete.",
  );
  requireCondition(
    lhr.gatherMode === "navigation",
    "Reports must be complete navigation audits.",
  );
  const url = `${targetOrigin}${result.pathname}`;
  for (const field of [
    "requestedUrl",
    "finalUrl",
    "finalDisplayedUrl",
    "mainDocumentUrl",
  ]) {
    requireCondition(
      lhr[field] === url,
      `Lighthouse ${field} does not match the audited public route.`,
    );
  }
  isoDate(lhr.fetchTime, "Lighthouse fetchTime");
  keys(lhr.categories, categories, "Lighthouse categories");
  object(lhr.audits, "Lighthouse audits");
  requireCondition(
    isDeepStrictEqual(
      Object.keys(lhr.audits).sort(),
      [...contract.auditIds].sort(),
    ),
    "The raw report must contain every audit from the pinned four-category configuration.",
  );
  for (const [id, audit] of Object.entries(lhr.audits)) {
    object(audit, `audit ${id}`);
    requireCondition(
      audit.id === id &&
        typeof audit.title === "string" &&
        typeof audit.description === "string",
      `audit ${id} is incomplete.`,
    );
    requireCondition(
      [
        "binary",
        "numeric",
        "metricSavings",
        "manual",
        "informative",
        "notApplicable",
      ].includes(audit.scoreDisplayMode),
      `audit ${id} failed or has no score display mode.`,
    );
    requireCondition(
      audit.score === null ||
        (typeof audit.score === "number" &&
          Number.isFinite(audit.score) &&
          audit.score >= 0 &&
          audit.score <= 1),
      `audit ${id} has an invalid raw score.`,
    );
    requireCondition(
      !["binary", "numeric", "metricSavings"].includes(
        audit.scoreDisplayMode,
      ) || audit.score !== null,
      `audit ${id} is missing its scored measurement.`,
    );
  }
  const expectedConfig = contract.profiles[result.profile];
  for (const category of categories) {
    const actual = lhr.categories[category];
    requireCondition(
      actual.id === category &&
        typeof actual.title === "string" &&
        Array.isArray(actual.auditRefs) &&
        isDeepStrictEqual(
          actual.auditRefs.map((ref) => ref.id),
          expectedConfig.categories[category].auditRefs.map((ref) => ref.id),
        ),
      `The ${category} report is missing audits from the pinned full category.`,
    );
  }
  measurements(lhr);
  for (const [metric, auditId] of Object.entries(metricAudits)) {
    requireCondition(
      lhr.audits[auditId].numericUnit ===
        (metric === "cls" ? "unitless" : "millisecond"),
      `The ${metric} lab metric has the wrong unit.`,
    );
  }
  requireCondition(
    typeof lhr.environment?.hostUserAgent === "string" &&
      [chromeVersion, `${chromeVersion.split(".")[0]}.0.0.0`].includes(
        /(?:HeadlessChrome|Chrome)\/(\d+\.\d+\.\d+\.\d+)(?:\s|$)/.exec(
          lhr.environment.hostUserAgent,
        )?.[1],
      ) &&
      typeof lhr.environment.networkUserAgent === "string" &&
      typeof lhr.environment.benchmarkIndex === "number" &&
      Number.isFinite(lhr.environment.benchmarkIndex) &&
      lhr.environment.benchmarkIndex > 0 &&
      lhr.userAgent === lhr.environment.hostUserAgent,
    "The report is missing the actual pinned browser environment.",
  );
  requireCondition(
    typeof lhr.timing?.total === "number" &&
      Number.isFinite(lhr.timing.total) &&
      lhr.timing.total > 0 &&
      lhr.i18n?.rendererFormattedStrings &&
      typeof lhr.i18n.rendererFormattedStrings === "object",
    "The standalone report is missing timing or renderer data.",
  );
  requireCondition(
    isDeepStrictEqual(lhr.configSettings, expectedConfig.settings),
    "Lighthouse configuration must match the full default mobile or desktop preset.",
  );
  const { embedded, template } = reportFromHtml(html);
  requireCondition(
    isDeepStrictEqual(embedded, lhr),
    "HTML and JSON must contain the same full Lighthouse report.",
  );
  requireCondition(
    sha256(template) === contract.htmlTemplateSha256,
    "HTML is not the pinned standalone Lighthouse renderer.",
  );
  return measurements(lhr);
}

export function validateReport(lhr, html, { snapshot, result, run, contract }) {
  validateLighthouseReport(lhr, html, {
    targetOrigin: snapshot.targetOrigin,
    result,
    contract,
  });
  const expectedConfig = contract.profiles[result.profile];
  const evidence = lhr.aureformQuality;
  object(evidence, "aureformQuality provenance");
  requireCondition(
    evidence.schemaVersion === 1,
    "Unknown raw report provenance version.",
  );
  for (const [field, expected] of Object.entries({
    snapshotId: snapshot.id,
    runId: run.id,
    sourceCommit: snapshot.sourceCommit,
    version: snapshot.version,
    targetOrigin: snapshot.targetOrigin,
    route: result.route,
    pathname: result.pathname,
    profile: result.profile,
  }))
    requireCondition(
      evidence[field] === expected,
      `Raw report provenance ${field} does not match the snapshot.`,
    );
  requireCondition(
    isDeepStrictEqual(evidence.environment, snapshot.environment),
    "Raw report environment does not match the snapshot.",
  );
  if (evidence.runner !== undefined) {
    const runner = evidence.runner;
    keys(runner, ["kind", "platform", "kernel", "image"], "runner");
    keys(runner.image, ["label", "os", "version"], "runner.image");
    requireCondition(
      ["local", "github-actions"].includes(runner.kind) &&
        runner.platform === snapshot.environment.platform &&
        typeof runner.kernel === "string" &&
        runner.kernel.length > 0 &&
        Object.values(runner.image).every(
          (value) =>
            value === null || (typeof value === "string" && value.length > 0),
        ),
      "Raw runner provenance must identify its actual platform and available image fields.",
    );
  }
  requireCondition(
    isDeepStrictEqual(evidence.browser, {
      playwright: playwrightVersion,
      chromiumRevision,
      freshUserData: true,
    }),
    "Each run must attest a fresh pinned Playwright Chromium profile.",
  );
  requireCondition(
    evidence.config?.preset ===
      (result.profile === "mobile" ? "default-mobile" : "desktop") &&
      isDeepStrictEqual(evidence.config.resolved, expectedConfig) &&
      isDeepStrictEqual(lhr.configSettings, expectedConfig.settings),
    "Captured configuration must match the full default mobile or desktop preset.",
  );
  isoDate(evidence.startedAt, "run.startedAt");
  isoDate(evidence.completedAt, "run.completedAt");
  requireCondition(
    evidence.startedAt <= lhr.fetchTime &&
      lhr.fetchTime <= evidence.completedAt &&
      evidence.completedAt <= snapshot.createdAt,
    "Raw report timestamps do not fit the snapshot collection interval.",
  );
  for (const phase of ["before", "after"]) {
    validateBuildInfo(evidence.buildInfo?.[phase], {
      expectedCommit: snapshot.sourceCommit,
      expectedVersion: snapshot.version,
    });
  }
  requireCondition(
    isDeepStrictEqual(evidence.buildInfo.before, evidence.buildInfo.after) &&
      evidence.buildInfo.before.builtAt <= evidence.startedAt,
    "The public build changed during the run or was built after collection started.",
  );
  return evidence;
}

async function plainFile(path) {
  const info = await lstat(path);
  requireCondition(
    info.isFile() && !info.isSymbolicLink(),
    `Report must be a regular file: ${path}`,
  );
  return readFile(path);
}

export async function verifySnapshotReports(
  snapshot,
  directory,
  { allowMissingReports = false, contract } = {},
) {
  validateSnapshot(snapshot);
  let info;
  try {
    info = await lstat(directory);
  } catch (error) {
    if (error.code === "ENOENT" && allowMissingReports)
      return { snapshot, files: new Map(), reports: 0, summariesOnly: true };
    throw error;
  }
  requireCondition(
    info.isDirectory() && !info.isSymbolicLink(),
    "Report bundles must be regular directories.",
  );
  contract ??= await readReportContract();
  const files = new Map();
  const evidence = [];
  for (const result of snapshot.results) {
    const lhrs = [];
    for (const run of result.runs) {
      const paths = ["json", "html"].map((extension) =>
        resolve(directory, run[extension]),
      );
      const reads = await Promise.allSettled(paths.map(plainFile));
      for (let i = 0; i < reads.length; i++) {
        const read = reads[i];
        if (read.status === "rejected")
          throw new Error(
            `Incomplete report bundle: ${paths[i]} (${read.reason.message})`,
          );
        const extension = ["json", "html"][i];
        requireCondition(
          sha256(read.value) === run.sha256[extension],
          `SHA-256 mismatch for ${run[extension]}.`,
        );
        files.set(run[extension], read.value);
      }
      const lhr = JSON.parse(files.get(run.json).toString("utf8"));
      evidence.push(
        validateReport(lhr, files.get(run.html).toString("utf8"), {
          snapshot,
          result,
          run,
          contract,
        }),
      );
      lhrs.push(lhr);
    }
    const medians = aggregateRuns(lhrs);
    requireCondition(
      isDeepStrictEqual(result.scores, medians.scores),
      `Score medians do not match raw reports for ${result.route}/${result.profile}.`,
    );
    requireCondition(
      isDeepStrictEqual(result.metrics, medians.metrics),
      `Lab metric medians do not match raw reports for ${result.route}/${result.profile}.`,
    );
  }
  evidence.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (let i = 0; i < evidence.length; i++) {
    requireCondition(
      isDeepStrictEqual(
        evidence[i].buildInfo.before,
        evidence[0].buildInfo.before,
      ),
      "All 18 runs must audit the same public build.",
    );
    requireCondition(
      isDeepStrictEqual(evidence[i].runner, evidence[0].runner),
      "All 18 runs must use the same runner environment.",
    );
    if (i > 0)
      requireCondition(
        evidence[i - 1].completedAt <= evidence[i].startedAt,
        "Lighthouse runs must be sequential.",
      );
  }
  return { snapshot, files, reports: evidence.length, summariesOnly: false };
}

export async function readBundle(directory, { expectedCommit, contract } = {}) {
  const snapshot = validateSnapshot(
    await readJson(resolve(directory, "snapshot.json")),
  );
  if (expectedCommit !== undefined) {
    knownCommit(expectedCommit, "expected commit");
    requireCondition(
      snapshot.sourceCommit === expectedCommit,
      "The bundle does not match the expected commit.",
    );
  }
  return verifySnapshotReports(snapshot, directory, { contract });
}

export async function verifyIndex(root = projectRoot, options = {}) {
  const index = validateIndex(await readJson(resolve(root, indexPath)));
  const verified = [];
  for (const snapshot of index) {
    verified.push(
      await verifySnapshotReports(
        snapshot,
        resolve(root, "docs/quality/lighthouse", snapshot.id),
        options,
      ),
    );
  }
  return { index, verified };
}

export async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      flag: "wx",
    });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function containedOutput(root, output) {
  const destination = resolve(root, output);
  const local = relative(root, destination);
  requireCondition(
    local &&
      local !== ".." &&
      !local.startsWith(`..${sep}`) &&
      !local.startsWith(sep) &&
      !local.split(sep).includes(".git"),
    "Generated output must stay inside the project and outside .git.",
  );
  const actualRoot = await realpath(root);
  let ancestor = dirname(destination);
  for (;;) {
    try {
      const actual = await realpath(ancestor);
      requireCondition(
        actual === actualRoot || actual.startsWith(`${actualRoot}${sep}`),
        "Generated output cannot traverse an external symlink.",
      );
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      ancestor = dirname(ancestor);
    }
  }
  try {
    requireCondition(
      !(await lstat(destination)).isSymbolicLink(),
      "Generated output cannot be a symlink.",
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await mkdir(dirname(destination), { recursive: true });
  return destination;
}

export async function exportReports(
  root = projectRoot,
  output = "out",
  options = {},
) {
  const out = await containedOutput(root, output);
  await mkdir(out, { recursive: true });
  const info = validateBuildInfo(
    await readJson(resolve(root, "public/build-info.json")),
    { allowUnknown: true },
  );
  const { index, verified } = await verifyIndex(root, {
    ...options,
    allowMissingReports: !(await hasGitCheckout(root)),
  });
  const reportRoot = resolve(out, "quality-reports");
  // Replace this generated tree so an old export cannot retain removed snapshots.
  await rm(reportRoot, { recursive: true, force: true });
  for (const bundle of verified) {
    if (bundle.summariesOnly) continue;
    const destination = resolve(reportRoot, bundle.snapshot.id);
    await mkdir(destination, { recursive: true });
    for (const [filename, bytes] of bundle.files)
      await writeFile(resolve(destination, filename), bytes, { flag: "wx" });
  }
  await copyFile(
    resolve(root, "public/build-info.json"),
    resolve(out, "build-info.json"),
  );
  return {
    info,
    snapshots: index.length,
    exported: verified.filter((bundle) => !bundle.summariesOnly).length,
  };
}

export function summaryMarkdown(snapshot) {
  validateSnapshot(snapshot);
  const lines = [
    `## Lighthouse ${snapshot.id}`,
    "",
    `Source commit: \`${snapshot.sourceCommit}\` · Version: \`${snapshot.version}\``,
    "",
    `Target: ${snapshot.targetOrigin} · Collected: ${snapshot.createdAt}`,
    "",
    `Node ${snapshot.environment.node} · Lighthouse ${snapshot.environment.lighthouse} · Chromium ${snapshot.environment.chrome} · ${snapshot.environment.platform}`,
    "",
    "Three sequential runs per route/profile. Scores are rounded after the median; lab timings are milliseconds and CLS is unitless.",
    "",
    "| Route | Profile | Performance | Accessibility | Best practices | SEO | FCP | LCP | CLS | TBT | Speed index |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...snapshot.results.map(
      (result) =>
        `| ${result.pathname} | ${result.profile} | ${categories.map((category) => result.scores[category]).join(" | ")} | ${Object.keys(
          metricAudits,
        )
          .map((metric) => result.metrics[metric])
          .join(" | ")} |`,
    ),
    "",
    "Lab measurements are environment-specific evidence, not field Core Web Vitals. No performance score gate is applied.",
    "",
  ];
  return lines.join("\n");
}

export async function cli(main) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
