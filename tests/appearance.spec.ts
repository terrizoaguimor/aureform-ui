import { expect, test } from "@playwright/test";
import {
  appearanceBaseURL,
  appearanceCases,
  finishAppearanceReport,
  loadAppearanceReport,
  runAppearanceCase,
  verifyAppearanceSourceIntegrity,
  writeAppearanceReport,
} from "../scripts/verify-appearance.mjs";

test.beforeAll(async ({ browser }) => {
  const report = await loadAppearanceReport(appearanceBaseURL, "playwright");
  report.browserVersion = browser.version();
  report.status = "running";
  await writeAppearanceReport(report);
});

for (const spec of appearanceCases) {
  test(`appearance 1.1: ${spec.id}`, async ({ browser }, testInfo) => {
    const result = await runAppearanceCase(browser, spec, appearanceBaseURL);
    const report = await loadAppearanceReport(appearanceBaseURL, "playwright");
    report.scenarios.push(result);
    await writeAppearanceReport(report);
    await testInfo.attach("actual-appearance-evidence", {
      body: Buffer.from(JSON.stringify(result, null, 2)),
      contentType: "application/json",
    });
    expect(
      result.status,
      result.errors
        .map((error: { check: string; message: string }) => `${error.check}: ${error.message}`)
        .join("\n"),
    ).toBe("passed");
  });
}

test.afterAll(async () => {
  // A failed Playwright test restarts its worker. Load the persisted report so
  // later workers retain earlier failures and the final completeness audit.
  const report = await loadAppearanceReport(appearanceBaseURL, "playwright");
  await verifyAppearanceSourceIntegrity(report);
  finishAppearanceReport(report);
  await writeAppearanceReport(report);
});
