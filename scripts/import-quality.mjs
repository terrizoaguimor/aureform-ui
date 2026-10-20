import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { cli, projectRoot } from "./lib/quality.mjs";
import { importBundle } from "./lib/quality-import.mjs";

await cli(async () => {
  const { values } = parseArgs({
    options: {
      bundle: { type: "string" },
      "source-commit": { type: "string" },
    },
  });
  if (!values.bundle)
    throw new Error(
      "Usage: pnpm quality:import --bundle <dir> [--source-commit <full-sha>]",
    );
  const { snapshot, imported } = await importBundle(
    resolve(projectRoot, values.bundle),
    { expectedCommit: values["source-commit"] },
  );
  console.log(
    `${imported ? "Imported" : "Already imported"} ${snapshot.id}: 18 reports. No commit, README update or deployment was performed.`,
  );
});
