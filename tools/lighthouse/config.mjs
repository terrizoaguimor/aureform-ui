import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import lighthouse, { desktopConfig } from "lighthouse";
import {
  initializeConfig,
  getConfigDisplayString,
} from "lighthouse/core/config/config.js";
import { ReportGenerator } from "lighthouse/report/generator/report-generator.js";
import {
  categories,
  lighthouseVersion,
  profiles,
  readReportContract,
  reportFromHtml,
  requireCondition,
} from "../../scripts/lib/quality.mjs";

const require = createRequire(import.meta.url);

export function requirePinnedLighthouse() {
  requireCondition(
    require("lighthouse/package.json").version === lighthouseVersion,
    `Install frozen Lighthouse ${lighthouseVersion} in tools/lighthouse.`,
  );
}

export const auditFlags = {
  output: ["json", "html"],
  locale: "en-US",
  onlyCategories: categories,
  logLevel: "error",
};

export async function resolveProfile(profile) {
  requirePinnedLighthouse();
  requireCondition(profiles.includes(profile), "Unknown Lighthouse profile.");
  const config = profile === "desktop" ? desktopConfig : undefined;
  const { resolvedConfig } = await initializeConfig(
    "navigation",
    config,
    auditFlags,
  );
  return {
    config,
    captured: JSON.parse(getConfigDisplayString(resolvedConfig)),
    auditIds: resolvedConfig.audits.map(
      (audit) => audit.implementation.meta.id,
    ),
  };
}

export async function deriveReportContract() {
  const mobile = await resolveProfile("mobile");
  const desktop = await resolveProfile("desktop");
  requireCondition(
    isDeepStrictEqual(mobile.auditIds, desktop.auditIds),
    "Profile audit definitions differ.",
  );
  const { template } = reportFromHtml(ReportGenerator.generateReportHtml({}));
  return {
    lighthouseVersion,
    auditIds: mobile.auditIds,
    profiles: { mobile: mobile.captured, desktop: desktop.captured },
    htmlTemplateSha256: createHash("sha256").update(template).digest("hex"),
  };
}

export async function requirePinnedConfiguration() {
  const actual = await deriveReportContract();
  requireCondition(
    isDeepStrictEqual(actual, await readReportContract()),
    "Installed Lighthouse configuration does not match its committed report contract.",
  );
  return actual;
}

export { lighthouse, ReportGenerator };
