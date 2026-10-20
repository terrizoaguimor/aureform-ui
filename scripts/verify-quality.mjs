import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { hasGitCheckout } from "./lib/build-info.mjs";
import { cli, projectRoot, readBundle, verifyIndex } from "./lib/quality.mjs";

await cli(async () => {
  const { values } = parseArgs({
    options: {
      bundle: { type: "string" },
      "source-commit": { type: "string" },
      "require-reports": { type: "boolean", default: false },
    },
  });
  if (values.bundle) {
    const bundle = await readBundle(resolve(projectRoot, values.bundle), {
      expectedCommit: values["source-commit"],
    });
    console.log(
      `Verified ${bundle.snapshot.id}: ${bundle.reports} full reports, SHA-256 hashes, configuration, provenance and medians.`,
    );
    return;
  }
  if (values["source-commit"])
    throw new Error("--source-commit is only accepted with --bundle.");
  const allowMissingReports =
    !values["require-reports"] && !(await hasGitCheckout(projectRoot));
  const { index, verified } = await verifyIndex(projectRoot, {
    allowMissingReports,
  });
  const missing = verified.filter((bundle) => bundle.summariesOnly).length;
  console.log(
    `Verified ${index.length} snapshot summaries and ${verified.reduce((total, bundle) => total + bundle.reports, 0)} full reports.`,
  );
  if (missing)
    console.log(
      `Source archive: ${missing} summaries have no raw reports; hashes/provenance/medians could not be checked against raw bytes.`,
    );
});
