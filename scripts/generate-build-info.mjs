import { cli } from "./lib/quality.mjs";
import { generateBuildInfo } from "./lib/build-info.mjs";

await cli(async () => {
  if (process.argv.length !== 2) throw new Error("Usage: pnpm build:info");
  const { info, reason } = await generateBuildInfo();
  console.log(
    `Generated public/build-info.json: ${info.sourceCommit} (${reason}), version ${info.version}.`,
  );
});
