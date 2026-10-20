import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { release } from "node:os";
import {
  aggregateRuns,
  atomicJson,
  chromiumRevision,
  knownCommit,
  normalizeOrigin,
  playwrightVersion,
  profiles,
  requireCondition,
  routes,
  safeId,
  sha256,
  summaryMarkdown,
  validateBuildInfo,
  validateSnapshot,
  verifySnapshotReports,
} from "./quality.mjs";

export function isPublicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0)
    );
  }
  if (isIP(address) === 6) {
    // Only ordinary global unicast; mapped IPv4, local and special ranges fail.
    const first = Number.parseInt(address.split(":")[0], 16);
    return (
      first >= 0x2000 &&
      first <= 0x3fff &&
      !/^2001:(?:0:|db8:)/i.test(address) &&
      !/^2002:/i.test(address)
    );
  }
  return false;
}

export async function publicOrigin(origin, { resolveHost = lookup } = {}) {
  const normalized = normalizeOrigin(origin);
  const hostname = new URL(normalized).hostname;
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await resolveHost(hostname, { all: true, verbatim: true });
  requireCondition(
    addresses.length > 0 &&
      addresses.every(({ address }) => isPublicAddress(address)),
    "Collection only accepts public HTTPS targets, never loopback or private network addresses.",
  );
  return normalized;
}

export async function publicBuildInfo(
  origin,
  { sourceCommit, version, request = fetch } = {},
) {
  const url = new URL("/build-info.json", normalizeOrigin(origin));
  url.searchParams.set("quality-check", randomUUID());
  const response = await request(url, {
    redirect: "error",
    cache: "no-store",
    headers: { accept: "application/json", "cache-control": "no-cache" },
    signal: AbortSignal.timeout(20_000),
  });
  requireCondition(
    response.ok,
    `Public build-info request failed (${response.status}).`,
  );
  requireCondition(
    /(?:application\/json|application\/[^;]+\+json)(?:;|$)/i.test(
      response.headers.get("content-type") ?? "",
    ),
    "Public build-info is not JSON.",
  );
  const text = await response.text();
  requireCondition(
    Buffer.byteLength(text) <= 16_384,
    "Public build-info is unexpectedly large.",
  );
  return validateBuildInfo(JSON.parse(text), {
    expectedCommit: sourceCommit,
    expectedVersion: version,
  });
}

export function captureRunner(environment = process.env) {
  return {
    kind: environment.GITHUB_ACTIONS === "true" ? "github-actions" : "local",
    platform: `${process.platform}-${process.arch}`,
    kernel: release(),
    image: {
      label: environment.QUALITY_RUNNER_IMAGE || null,
      os: environment.ImageOS || null,
      version: environment.ImageVersion || null,
    },
  };
}

export async function collectSnapshot({
  id,
  sourceCommit,
  version,
  targetOrigin,
  environment,
  runner = captureRunner(),
  output,
  contract,
  audit,
  renderHtml,
  buildInfo = (origin) => publicBuildInfo(origin, { sourceCommit, version }),
  now = () => new Date(),
  progress = () => {},
}) {
  safeId(id);
  knownCommit(sourceCommit);
  targetOrigin = normalizeOrigin(targetOrigin);
  // Validate the public identity before creating a bundle that could look complete.
  const initialBuild = validateBuildInfo(await buildInfo(targetOrigin), {
    expectedCommit: sourceCommit,
    expectedVersion: version,
  });
  await mkdir(output, { recursive: false });
  const results = [];
  let count = 0;
  for (const route of routes) {
    for (const profile of profiles) {
      const runs = [];
      const lhrs = [];
      for (let iteration = 1; iteration <= 3; iteration++) {
        const runId = `${route.route}-${profile}-${iteration}`;
        const before = validateBuildInfo(await buildInfo(targetOrigin), {
          expectedCommit: sourceCommit,
          expectedVersion: version,
        });
        requireCondition(
          isDeepStrictEqual(before, initialBuild),
          "The public build changed during collection.",
        );
        const startedAt = now().toISOString();
        progress({ runId, count: ++count, total: 18 });
        const lhr = await audit({
          url: `${targetOrigin}${route.pathname}`,
          profile,
          runId,
        });
        const after = validateBuildInfo(await buildInfo(targetOrigin), {
          expectedCommit: sourceCommit,
          expectedVersion: version,
        });
        requireCondition(
          isDeepStrictEqual(before, after),
          `The public build changed during ${runId}.`,
        );
        const completedAt = now().toISOString();
        lhr.aureformQuality = {
          schemaVersion: 1,
          snapshotId: id,
          runId,
          sourceCommit,
          version,
          targetOrigin,
          environment,
          runner,
          ...route,
          profile,
          browser: {
            playwright: playwrightVersion,
            chromiumRevision,
            freshUserData: true,
          },
          config: {
            preset: profile === "mobile" ? "default-mobile" : "desktop",
            resolved: contract.profiles[profile],
          },
          buildInfo: { before, after },
          startedAt,
          completedAt,
        };
        const json = `${JSON.stringify(lhr, null, 2)}\n`;
        const html = renderHtml(lhr);
        const run = {
          id: runId,
          json: `${runId}.json`,
          html: `${runId}.html`,
          sha256: { json: sha256(json), html: sha256(html) },
        };
        await writeFile(resolve(output, run.json), json, { flag: "wx" });
        await writeFile(resolve(output, run.html), html, { flag: "wx" });
        runs.push(run);
        lhrs.push(lhr);
      }
      results.push({ ...route, profile, ...aggregateRuns(lhrs), runs });
    }
  }
  const snapshot = validateSnapshot({
    id,
    createdAt: now().toISOString(),
    sourceCommit,
    version,
    targetOrigin,
    environment,
    results,
  });
  await verifySnapshotReports(snapshot, output, { contract });
  await writeFile(resolve(output, "summary.md"), summaryMarkdown(snapshot), {
    flag: "wx",
  });
  // A failed or interrupted collection never leaves a publishable snapshot.
  await atomicJson(resolve(output, "snapshot.json"), snapshot);
  return snapshot;
}
