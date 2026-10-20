import assert from "node:assert/strict";
import test from "node:test";
import { deriveReportContract, requirePinnedConfiguration } from "./config.mjs";
import { readReportContract } from "../../scripts/lib/quality.mjs";

test("frozen Lighthouse 13.5.0 resolves both full presets to the committed report contract", async () => {
  const actual = await deriveReportContract();
  const pinned = await readReportContract();
  assert.deepEqual(actual, pinned);
  assert.equal(actual.lighthouseVersion, "13.5.0");
  assert.equal(actual.auditIds.length, 155);
  for (const profile of ["mobile", "desktop"]) {
    assert.deepEqual(Object.keys(actual.profiles[profile].categories), [
      "performance",
      "accessibility",
      "best-practices",
      "seo",
    ]);
    assert.equal(actual.profiles[profile].settings.formFactor, profile);
    assert.equal(
      actual.profiles[profile].settings.throttlingMethod,
      "simulate",
    );
    assert.equal(actual.profiles[profile].settings.disableStorageReset, false);
    assert.equal(actual.profiles[profile].settings.onlyAudits, null);
    assert.equal(actual.profiles[profile].settings.skipAudits, null);
  }
  assert.equal(
    actual.profiles.mobile.categories.accessibility.auditRefs.length,
    76,
  );
  assert.equal(actual.profiles.mobile.categories.seo.auditRefs.length, 11);
  assert.deepEqual(await requirePinnedConfiguration(), pinned);
});
