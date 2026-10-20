import { parseArgs } from "node:util";
import { cli, exportReports, projectRoot } from "./lib/quality.mjs";

await cli(async () => {
  const { values } = parseArgs({
    options: { out: { type: "string", default: "out" } },
  });
  const { snapshots, exported, info } = await exportReports(
    projectRoot,
    values.out,
  );
  console.log(
    `Exported build-info (${info.sourceCommit}) and ${exported}/${snapshots} report bundles to ${values.out}.`,
  );
  if (exported < snapshots)
    console.log(
      "Absent source-archive reports were skipped; summary consumers must use the public website or repository fallback.",
    );
});
