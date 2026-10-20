import { parseArgs } from "node:util";
import {
  readJson,
  projectRoot,
  cli,
  containedOutput,
  knownCommit,
  safeId,
  lighthouseVersion,
  chromeVersion,
  supportsLighthouseNode,
} from "../../scripts/lib/quality.mjs";
import { resolve } from "node:path";
import {
  pinnedBrowser,
  freshAuditBrowser,
} from "../../scripts/lib/quality-browser.mjs";
import {
  collectSnapshot,
  publicOrigin,
} from "../../scripts/lib/quality-collection.mjs";

await cli(async () => {
  const { values } = parseArgs({
    options: {
      "source-commit": { type: "string" },
      origin: { type: "string", default: "https://aureformui.com" },
      id: { type: "string" },
      output: { type: "string" },
    },
  });
  const sourceCommit = knownCommit(values["source-commit"], "--source-commit");
  if (!supportsLighthouseNode(process.version))
    throw new Error(
      "Lighthouse collection requires Node >=22.19.0; CI uses Node 24.",
    );
  const {
    lighthouse,
    ReportGenerator,
    auditFlags,
    resolveProfile,
    requirePinnedConfiguration,
  } = await import("./config.mjs");
  const contract = await requirePinnedConfiguration();
  const browser = await pinnedBrowser();
  const targetOrigin = await publicOrigin(values.origin);
  const manifest = await readJson(resolve(projectRoot, "package.json"));
  const id =
    values.id ??
    `lighthouse-${new Date().toISOString().replace(/[-:.]/g, "").toLowerCase()}-${sourceCommit.slice(0, 12)}`;
  safeId(id);
  const output = await containedOutput(
    projectRoot,
    values.output ?? `artifacts/quality/lighthouse/${id}`,
  );
  const configurations = {};
  for (const profile of ["mobile", "desktop"])
    configurations[profile] = await resolveProfile(profile);
  const snapshot = await collectSnapshot({
    id,
    sourceCommit,
    version: manifest.version,
    targetOrigin,
    environment: {
      node: process.version,
      lighthouse: lighthouseVersion,
      chrome: chromeVersion,
      platform: `${process.platform}-${process.arch}`,
    },
    output,
    contract,
    audit: async ({ url, profile }) => {
      const fresh = await freshAuditBrowser({ ...browser });
      try {
        const result = await lighthouse(
          url,
          { ...auditFlags, hostname: "127.0.0.1", port: fresh.port },
          configurations[profile].config,
        );
        if (!result?.lhr)
          throw new Error(
            `Lighthouse returned no report for ${url} (${profile}).`,
          );
        return result.lhr;
      } finally {
        await fresh.close();
      }
    },
    renderHtml: (lhr) => ReportGenerator.generateReportHtml(lhr),
    progress: ({ runId, count, total }) =>
      console.log(`[${count}/${total}] ${runId}`),
  });
  console.log(
    `Validated ${snapshot.id}: 18 sequential audits saved to ${output}. Import is a separate manual action.`,
  );
});
