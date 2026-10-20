import assert from "node:assert/strict";
import test from "node:test";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import {
  aggregateRuns,
  containedOutput,
  exportReports,
  knownCommit,
  median,
  readBundle,
  sha256,
  supportsLighthouseNode,
  validateBuildInfo,
  validateLighthouseReport,
  validateReport,
  validateSnapshot,
  verifyIndex,
  verifySnapshotReports,
} from "../scripts/lib/quality.mjs";
import {
  generateBuildInfo,
  hasGitCheckout,
  sourceState,
} from "../scripts/lib/build-info.mjs";
import {
  collectSnapshot,
  captureRunner,
  isPublicAddress,
  publicBuildInfo,
  publicOrigin,
} from "../scripts/lib/quality-collection.mjs";
import { freshAuditBrowser } from "../scripts/lib/quality-browser.mjs";
import { importBundle } from "../scripts/lib/quality-import.mjs";
import { excludeQualitySource } from "../scripts/lib/quality-source.mjs";
import {
  collectionFixture,
  fixtureHtml,
  initialBuild,
  rewriteReport,
  sourceCommit,
  temporaryProject,
} from "./helpers/lighthouse-fixture.mjs";

test("collection records 18 sequential full runs and checks public build identity around every run", async (t) => {
  const fixture = await collectionFixture(t);
  assert.equal(fixture.maximumActive, 1);
  assert.equal(
    fixture.operations.filter((operation) => operation === "build-info").length,
    37,
  );
  assert.equal(
    fixture.operations.filter((operation) => operation.startsWith("audit:"))
      .length,
    18,
  );
  for (let i = 1; i < fixture.operations.length; i += 3) {
    assert.equal(fixture.operations[i], "build-info");
    assert.match(fixture.operations[i + 1], /^audit:/);
    assert.equal(fixture.operations[i + 2], "build-info");
  }
  assert.equal(
    (
      await readBundle(fixture.output, {
        contract: fixture.contract,
        expectedCommit: sourceCommit,
      })
    ).reports,
    18,
  );
  assert.deepEqual(fixture.snapshot.results[0].scores, {
    performance: 68,
    accessibility: 90,
    "best-practices": 99,
    seo: 95,
  });
  assert.deepEqual(fixture.snapshot.results[0].metrics, {
    fcp: 2600,
    lcp: 3100,
    cls: 0.03,
    tbt: 110,
    speedIndex: 2700,
  });
  assert.equal((await readdir(fixture.output)).length, 38);
  assert.match(
    await readFile(resolve(fixture.output, "summary.md"), "utf8"),
    /No performance score gate/,
  );
});

test("lab medians use the middle run value independently and preserve zero measurements", () => {
  assert.equal(median([0, 2000, 10]), 10);
  assert.equal(median([0, 0, 900]), 0);
  assert.throws(() => median([1, 2]), /exactly three/);
  assert.throws(() => median([1, NaN, 2]), /finite/);
  const lhr = (score, fcp) => ({
    categories: Object.fromEntries(
      ["performance", "accessibility", "best-practices", "seo"].map(
        (category) => [category, { score }],
      ),
    ),
    audits: Object.fromEntries(
      [
        "first-contentful-paint",
        "largest-contentful-paint",
        "cumulative-layout-shift",
        "total-blocking-time",
        "speed-index",
      ].map((audit) => [audit, { numericValue: fcp }]),
    ),
  });
  const values = aggregateRuns([lhr(0, 0), lhr(0.001, 100), lhr(1, 4000)]);
  assert.equal(values.scores.performance, 0);
  assert.equal(values.metrics.fcp, 100);
});

test("snapshot schema refuses unknown/abbreviated SHAs, malformed hashes and traversal filenames", async (t) => {
  const { snapshot } = await collectionFixture(t);
  for (const commit of [
    "unknown",
    null,
    "70b40b5",
    "0".repeat(40),
    "A".repeat(40),
  ]) {
    assert.throws(() => knownCommit(commit), /known, full/);
  }
  for (const hash of ["a".repeat(63), "A".repeat(64), "../report", null]) {
    const bad = structuredClone(snapshot);
    bad.results[0].runs[0].sha256.json = hash;
    assert.throws(() => validateSnapshot(bad), /SHA-256/);
  }
  const traversal = structuredClone(snapshot);
  traversal.results[0].runs[0].json = "../outside.json";
  assert.throws(() => validateSnapshot(traversal), /flat/);
  traversal.id = "../outside";
  assert.throws(() => validateSnapshot(traversal), /flat/);
});

test("incomplete route/profile groups and fewer than three runs cannot be published", async (t) => {
  const { snapshot } = await collectionFixture(t);
  const bad = structuredClone(snapshot);
  bad.results.pop();
  assert.throws(() => validateSnapshot(bad), /six route/);
  const missingRun = structuredClone(snapshot);
  missingRun.results[0].runs.pop();
  assert.throws(() => validateSnapshot(missingRun), /three runs/);
  const duplicate = structuredClone(snapshot);
  duplicate.results[1] = duplicate.results[0];
  assert.throws(() => validateSnapshot(duplicate), /Duplicate result/);
});

test("byte changes fail SHA-256 verification and import leaves the index untouched", async (t) => {
  const fixture = await collectionFixture(t);
  const run = fixture.snapshot.results[0].runs[0];
  await writeFile(resolve(fixture.output, run.json), " ");
  const indexFile = resolve(fixture.root, "docs/quality/lighthouse/index.json");
  const before = await readFile(indexFile);
  await assert.rejects(
    readBundle(fixture.output, { contract: fixture.contract }),
    /SHA-256 mismatch/,
  );
  await assert.rejects(
    importBundle(fixture.output, {
      root: fixture.root,
      contract: fixture.contract,
    }),
    /SHA-256 mismatch/,
  );
  assert.deepEqual(await readFile(indexFile), before);
  assert.deepEqual(
    await readdir(resolve(fixture.root, "docs/quality/lighthouse")),
    ["index.json"],
  );
});

test("truncated raw reports fail even when their hashes are recomputed", async (t) => {
  const fixture = await collectionFixture(t);
  const run = fixture.snapshot.results[0].runs[0];
  await rewriteReport(fixture, run, (lhr) => {
    delete lhr.audits["is-on-https"];
  });
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /every audit/,
  );
});

test("a reduced category cannot pass with intact scores and recomputed hashes", async (t) => {
  const fixture = await collectionFixture(t);
  const run = fixture.snapshot.results[0].runs[0];
  await rewriteReport(fixture, run, (lhr) => {
    lhr.categories.accessibility.auditRefs.pop();
  });
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /full category/,
  );
});

test("runtime errors, audit errors and null category scores are incomplete evidence", async (t) => {
  const fixture = await collectionFixture(t);
  const run = fixture.snapshot.results[0].runs[0];
  const original = JSON.parse(
    await readFile(resolve(fixture.output, run.json), "utf8"),
  );
  for (const [edit, message] of [
    [
      (lhr) => {
        lhr.runtimeError = { code: "NO_FCP", message: "synthetic failure" };
      },
      /runtime error/,
    ],
    [
      (lhr) => {
        lhr.audits["is-on-https"].scoreDisplayMode = "error";
      },
      /failed/,
    ],
    [
      (lhr) => {
        lhr.categories.seo.score = null;
      },
      /raw scores/,
    ],
  ]) {
    await rewriteReport(fixture, run, (lhr) => {
      for (const key of Object.keys(lhr)) delete lhr[key];
      Object.assign(lhr, structuredClone(original));
      edit(lhr);
    });
    await assert.rejects(
      verifySnapshotReports(fixture.snapshot, fixture.output, {
        contract: fixture.contract,
      }),
      message,
    );
  }
});

test("Lighthouse 13.5 insight savings are valid, while a missing scored audit measurement is incomplete", async (t) => {
  const fixture = await collectionFixture(t);
  const run = fixture.snapshot.results[0].runs[0];
  await rewriteReport(fixture, run, (lhr) => {
    lhr.audits["is-on-https"].scoreDisplayMode = "metricSavings";
  });
  assert.equal(
    (
      await verifySnapshotReports(fixture.snapshot, fixture.output, {
        contract: fixture.contract,
      })
    ).reports,
    18,
  );
  await rewriteReport(fixture, run, (lhr) => {
    lhr.audits["is-on-https"].score = null;
  });
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /scored measurement/,
  );
});

test("median summaries are recomputed from reports rather than trusted", async (t) => {
  const fixture = await collectionFixture(t);
  fixture.snapshot.results[0].scores.performance = 66;
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /Score medians/,
  );
  fixture.snapshot.results[0].scores.performance = 68;
  fixture.snapshot.results[0].metrics.fcp = 9999;
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /Lab metric medians/,
  );
});

test("wrong source provenance and a changed public build fail despite valid hashes", async (t) => {
  const fixture = await collectionFixture(t);
  const run = fixture.snapshot.results[0].runs[0];
  await rewriteReport(fixture, run, (lhr) => {
    lhr.aureformQuality.sourceCommit = "f".repeat(40);
  });
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /provenance sourceCommit/,
  );
  await rewriteReport(fixture, run, (lhr) => {
    lhr.aureformQuality.sourceCommit = sourceCommit;
    lhr.aureformQuality.buildInfo.after.builtAt = "2026-10-01T01:00:00.000Z";
  });
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /build changed/,
  );
});

test("a different device configuration and non-pinned Chromium cannot be mislabeled", async (t) => {
  const fixture = await collectionFixture(t);
  const run = fixture.snapshot.results[0].runs[0];
  await rewriteReport(fixture, run, (lhr) => {
    lhr.aureformQuality.config.resolved.settings.throttling.cpuSlowdownMultiplier = 1;
  });
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /Captured configuration/,
  );
  await rewriteReport(fixture, run, (lhr) => {
    lhr.aureformQuality.config.resolved = structuredClone(
      fixture.contract.profiles.mobile,
    );
    lhr.environment.hostUserAgent = "Chrome/155.0.0.0";
    lhr.userAgent = lhr.environment.hostUserAgent;
  });
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /pinned browser/,
  );
});

test("native LHR accepts Chromium's reduced User-Agent while publication still requires provenance", async (t) => {
  const fixture = await collectionFixture(t);
  const result = fixture.snapshot.results[0];
  const lhr = JSON.parse(await readFile(resolve(fixture.output, result.runs[0].json), "utf8"));
  const userAgent = "Mozilla/5.0 HeadlessChrome/156.0.0.0 Safari/537.36";
  lhr.userAgent = userAgent;
  lhr.environment.hostUserAgent = userAgent;
  lhr.environment.networkUserAgent = "Mozilla/5.0 Chrome/156.0.0.0 Mobile Safari/537.36";
  delete lhr.aureformQuality;
  assert.equal(validateLighthouseReport(lhr, fixtureHtml(lhr), {
    targetOrigin: fixture.snapshot.targetOrigin, result, contract: fixture.contract,
  }).rawScores.performance, 0.37);
  assert.throws(() => validateReport(lhr, fixtureHtml(lhr), {
    snapshot: fixture.snapshot, result, run: result.runs[0], contract: fixture.contract,
  }), /provenance/);
});

test("HTML must embed the exact JSON and use the pinned renderer", async (t) => {
  const fixture = await collectionFixture(t);
  const run = fixture.snapshot.results[0].runs[0];
  const lhr = JSON.parse(
    await readFile(resolve(fixture.output, run.json), "utf8"),
  );
  lhr.requestedUrl = "https://example.com/en/";
  let html = fixtureHtml(lhr);
  await writeFile(resolve(fixture.output, run.html), html);
  run.sha256.html = sha256(html);
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /same full/,
  );
  const original = JSON.parse(
    await readFile(resolve(fixture.output, run.json), "utf8"),
  );
  html = `${fixtureHtml(original)}<script>alert("unexpected")</script>`;
  await writeFile(resolve(fixture.output, run.html), html);
  run.sha256.html = sha256(html);
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /pinned standalone/,
  );
});

test("an incomplete present bundle cannot use the source-archive fallback", async (t) => {
  const fixture = await collectionFixture(t);
  await rm(resolve(fixture.output, fixture.snapshot.results[0].runs[0].html));
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      allowMissingReports: true,
      contract: fixture.contract,
    }),
    /Incomplete report bundle/,
  );
});

test("overlapping report intervals cannot claim sequential collection", async (t) => {
  const fixture = await collectionFixture(t);
  const [first, second] = fixture.snapshot.results[0].runs;
  const firstLhr = JSON.parse(
    await readFile(resolve(fixture.output, first.json), "utf8"),
  );
  await rewriteReport(fixture, second, (lhr) => {
    lhr.fetchTime = firstLhr.fetchTime;
    lhr.aureformQuality.startedAt = firstLhr.aureformQuality.startedAt;
    lhr.aureformQuality.completedAt = firstLhr.aureformQuality.completedAt;
  });
  await assert.rejects(
    verifySnapshotReports(fixture.snapshot, fixture.output, {
      contract: fixture.contract,
    }),
    /sequential/,
  );
});

test("import validates all reports, is idempotent and exports only one exact copy per report", async (t) => {
  const fixture = await collectionFixture(t);
  const imported = await importBundle(fixture.output, {
    root: fixture.root,
    contract: fixture.contract,
    expectedCommit: sourceCommit,
  });
  assert.equal(imported.imported, true);
  assert.equal(
    (
      await importBundle(fixture.output, {
        root: fixture.root,
        contract: fixture.contract,
      })
    ).imported,
    false,
  );
  assert.equal(
    (await verifyIndex(fixture.root, { contract: fixture.contract }))
      .verified[0].reports,
    18,
  );
  await mkdir(resolve(fixture.root, "out/quality-reports/stale"), {
    recursive: true,
  });
  await writeFile(
    resolve(fixture.root, "out/quality-reports/stale/old.html"),
    "old",
  );
  const exported = await exportReports(fixture.root, "out", {
    contract: fixture.contract,
  });
  assert.equal(exported.exported, 1);
  assert.deepEqual(
    await readdir(resolve(fixture.root, "out/quality-reports")),
    [fixture.snapshot.id],
  );
  const publicReports = resolve(
    fixture.root,
    "out/quality-reports",
    fixture.snapshot.id,
  );
  assert.equal((await readdir(publicReports)).length, 36);
  const run = fixture.snapshot.results[0].runs[0];
  assert.deepEqual(
    await readFile(resolve(publicReports, run.json)),
    await readFile(resolve(fixture.output, run.json)),
  );
  assert.deepEqual(
    await readFile(resolve(fixture.root, "out/build-info.json")),
    await readFile(resolve(fixture.root, "public/build-info.json")),
  );
  await assert.rejects(
    access(resolve(fixture.root, "public/quality-reports")),
    { code: "ENOENT" },
  );
});

test("source archives retain valid summaries and build-info without requiring bulky raw reports", async (t) => {
  const fixture = await collectionFixture(t);
  await writeFile(
    resolve(fixture.root, "docs/quality/lighthouse/index.json"),
    JSON.stringify([fixture.snapshot]),
  );
  assert.equal(await hasGitCheckout(fixture.root), false);
  const { info } = await generateBuildInfo(fixture.root, {
    git: () => {
      throw new Error("Ancestor Git must not be queried");
    },
  });
  assert.equal(info.sourceCommit, "unknown");
  const checked = await verifyIndex(fixture.root, {
    allowMissingReports: true,
    contract: fixture.contract,
  });
  assert.equal(checked.verified[0].summariesOnly, true);
  await assert.rejects(
    verifyIndex(fixture.root, { contract: fixture.contract }),
    { code: "ENOENT" },
  );
  const exported = await exportReports(fixture.root, "out", {
    contract: fixture.contract,
  });
  assert.equal(exported.exported, 0);
  assert.equal(exported.info.sourceCommit, "unknown");
  for (const path of [
    "docs/quality/lighthouse/index.json",
    "docs/quality/README.md",
    "tools/lighthouse/package.json",
    "tools/lighthouse/pnpm-lock.yaml",
    "tools/lighthouse/report-contract.json",
  ]) {
    assert.equal(excludeQualitySource(path), false, path);
  }
  for (const path of [
    "public/build-info.json",
    "docs/quality/lighthouse/snapshot-id",
    "docs/quality/lighthouse/snapshot-id/landing-mobile-1.json",
    "docs/quality/lighthouse/snapshot-id/landing-mobile-1.html",
  ]) {
    assert.equal(excludeQualitySource(path), true, path);
  }
});

test("Git exports require raw reports and cannot silently use the source-archive fallback", async (t) => {
  const fixture = await collectionFixture(t);
  await mkdir(resolve(fixture.root, ".git"));
  await writeFile(
    resolve(fixture.root, "docs/quality/lighthouse/index.json"),
    JSON.stringify([fixture.snapshot]),
  );
  await assert.rejects(
    exportReports(fixture.root, "out", {
      contract: fixture.contract,
    }),
    { code: "ENOENT" },
  );
  await assert.rejects(
    exportReports(fixture.root, "out", {
      contract: fixture.contract,
      allowMissingReports: true,
    }),
    { code: "ENOENT" },
  );
  await assert.rejects(access(resolve(fixture.root, "out/build-info.json")), {
    code: "ENOENT",
  });
  await writeFile(
    resolve(fixture.root, "docs/quality/lighthouse/index.json"),
    "[]\n",
  );
  await importBundle(fixture.output, {
    root: fixture.root,
    contract: fixture.contract,
  });
  assert.equal(
    (await exportReports(fixture.root, "out", { contract: fixture.contract }))
      .exported,
    1,
  );
});

test("dirty tracked or untracked source becomes unknown; a clean isolated checkout retains its full SHA", async (t) => {
  const root = await temporaryProject(t);
  await mkdir(resolve(root, ".git"));
  let status = "";
  const git = (_command, args, options) => {
    assert.equal(options.env.GIT_OPTIONAL_LOCKS, "0");
    assert.equal(options.env.GIT_CONFIG_GLOBAL, "/dev/null");
    const command = args[2];
    const stdout =
      command === "status"
        ? status
        : args.includes("--show-toplevel")
          ? root
          : sourceCommit;
    return { status: 0, stdout };
  };
  assert.equal((await sourceState(root, { git })).sourceCommit, sourceCommit);
  for (const change of [" M public/r/index.json", "?? src/new-page.tsx"]) {
    status = change;
    const { info, reason } = await generateBuildInfo(root, { git });
    assert.equal(info.sourceCommit, "unknown");
    assert.equal(reason, "dirty source");
    assert.throws(() => validateBuildInfo(info), /not publishable/);
  }
  status = "";
  const generated = await generateBuildInfo(root, { git });
  assert.equal(generated.info.sourceCommit, sourceCommit);
  assert.deepEqual(Object.keys(generated.info).sort(), [
    "builtAt",
    "sourceCommit",
    "version",
  ]);
});

test("collection rejects an unversioned public build before creating a publishable bundle", async (t) => {
  const root = await temporaryProject(t);
  let audits = 0;
  const output = resolve(root, "refused");
  await assert.rejects(
    collectSnapshot({
      id: "refused",
      sourceCommit,
      version: "1.4.1",
      targetOrigin: "https://aureformui.com",
      output,
      buildInfo: async () => ({ ...initialBuild, sourceCommit: "unknown" }),
      audit: async () => {
        audits++;
      },
    }),
    /not publishable/,
  );
  assert.equal(audits, 0);
  await assert.rejects(access(output), { code: "ENOENT" });
});

test("a deployment race aborts collection and never writes snapshot.json", async (t) => {
  const root = await temporaryProject(t);
  const output = resolve(root, "raced");
  let calls = 0;
  let audits = 0;
  await assert.rejects(
    collectSnapshot({
      id: "raced",
      sourceCommit,
      version: "1.4.1",
      targetOrigin: "https://aureformui.com",
      output,
      buildInfo: async () => ({
        ...initialBuild,
        sourceCommit: ++calls === 3 ? "f".repeat(40) : sourceCommit,
      }),
      audit: async () => {
        audits++;
        return {};
      },
    }),
    /expected commit/,
  );
  assert.equal(audits, 1);
  await assert.rejects(access(resolve(output, "snapshot.json")), {
    code: "ENOENT",
  });
});

test("public provenance requests use no credentials, reject redirects/HTML and match full build identity", async () => {
  let calls = 0;
  const request = async (url, options) => {
    calls++;
    assert.equal(url.origin, "https://aureformui.com");
    assert.equal(url.pathname, "/build-info.json");
    assert.ok(url.searchParams.get("quality-check"));
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.deepEqual(Object.keys(options.headers).sort(), [
      "accept",
      "cache-control",
    ]);
    return new Response(JSON.stringify(initialBuild), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  };
  assert.deepEqual(
    await publicBuildInfo("https://aureformui.com", {
      sourceCommit,
      version: "1.4.1",
      request,
    }),
    initialBuild,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    publicBuildInfo("https://aureformui.com", {
      sourceCommit: "f".repeat(40),
      request,
    }),
    /expected commit/,
  );
  await assert.rejects(
    publicBuildInfo("https://aureformui.com", {
      sourceCommit,
      request: async () =>
        new Response("<html>", { headers: { "content-type": "text/html" } }),
    }),
    /not JSON/,
  );
});

test("audits cannot target private addresses, URL credentials or non-public routes/origins", async () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "169.254.169.254",
    "::1",
    "fc00::1",
    "::ffff:127.0.0.1",
    "2001:db8::1",
  ])
    assert.equal(isPublicAddress(address), false, address);
  assert.equal(isPublicAddress("93.184.216.34"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
  await assert.rejects(
    publicOrigin("https://aureformui.com", {
      resolveHost: async () => [{ address: "10.0.0.1" }],
    }),
    /public HTTPS/,
  );
  for (const origin of [
    "http://aureformui.com",
    "https://user:pass@aureformui.com",
    "https://aureformui.com/private",
    "https://aureformui.com?token=test",
    "https://127.1",
  ])
    await assert.rejects(publicOrigin(origin), /public HTTPS/);
});

test("each browser gets a fresh profile, validates the Chromium version and removes its storage", async (t) => {
  const root = await temporaryProject(t);
  const directories = [];
  const chromium = {
    launchPersistentContext: async (directory, options) => {
      assert.equal(options.headless, true);
      assert.equal(options.viewport, null);
      assert.ok(options.args.includes("--remote-debugging-address=127.0.0.1"));
      directories.push(directory);
      await writeFile(
        resolve(directory, "DevToolsActivePort"),
        "54321\n/devtools/browser/fixture\n",
      );
      return {
        browser: () => ({ version: () => "156.0.8078.4" }),
        close: async () => {},
      };
    },
  };
  for (let i = 0; i < 2; i++) {
    const browser = await freshAuditBrowser({
      root,
      chromium,
      executable: "/fixture/chromium",
    });
    assert.equal(browser.port, 54321);
    await browser.close();
    await assert.rejects(access(directories[i]), { code: "ENOENT" });
  }
  assert.notEqual(directories[0], directories[1]);
  const broken = {
    launchPersistentContext: async () => {
      throw new Error("launch failed");
    },
  };
  await assert.rejects(
    freshAuditBrowser({
      root,
      chromium: broken,
      executable: "/fixture/chromium",
    }),
    /launch failed/,
  );
  assert.deepEqual(
    await readdir(resolve(root, "artifacts/quality/browser-profiles")),
    [],
  );
});

test("the isolated Lighthouse minimum does not raise the root build minimum", () => {
  assert.equal(supportsLighthouseNode("v22.18.0"), false);
  assert.equal(supportsLighthouseNode("v22.19.0"), true);
  assert.equal(supportsLighthouseNode("v24.0.0"), true);
  assert.equal(supportsLighthouseNode("v20.19.0"), false);
});

test("runner image provenance uses exact available values and keeps missing image fields unknown", () => {
  const runner = captureRunner({
    GITHUB_ACTIONS: "true",
    QUALITY_RUNNER_IMAGE: "ubuntu-24.04",
    ImageOS: "ubuntu24",
    ImageVersion: "20261018.1.0",
  });
  assert.equal(runner.kind, "github-actions");
  assert.deepEqual(runner.image, {
    label: "ubuntu-24.04",
    os: "ubuntu24",
    version: "20261018.1.0",
  });
  assert.deepEqual(captureRunner({}).image, {
    label: null,
    os: null,
    version: null,
  });
});

test("generated output cannot escape the project or write Git metadata", async (t) => {
  const root = await temporaryProject(t);
  await assert.rejects(
    containedOutput(root, "../outside"),
    /inside the project/,
  );
  await assert.rejects(containedOutput(root, ".git/quality"), /outside .git/);
});
