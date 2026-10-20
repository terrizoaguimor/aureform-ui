import { spawnSync } from "node:child_process";
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import {
  atomicJson,
  projectRoot,
  readJson,
  validateBuildInfo,
} from "./quality.mjs";

import { hasGitCheckout } from "./git-checkout.mjs";
export { hasGitCheckout } from "./git-checkout.mjs";

export async function sourceState(root, { git = spawnSync } = {}) {
  if (!(await hasGitCheckout(root)))
    return { sourceCommit: "unknown", reason: "unversioned source" };
  const environment = {
    ...process.env,
    GIT_OPTIONAL_LOCKS: "0",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
  };
  // Do not let inherited Git overrides redirect discovery outside this source.
  for (const key of [
    "GIT_DIR",
    "GIT_COMMON_DIR",
    "GIT_WORK_TREE",
    "GIT_INDEX_FILE",
  ])
    delete environment[key];
  function query(args) {
    const result = git("git", ["-C", root, ...args], {
      encoding: "utf8",
      env: environment,
    });
    return result.status === 0 ? result.stdout.trim() : null;
  }
  const top = query(["rev-parse", "--show-toplevel"]);
  if (!top || (await realpath(top)) !== (await realpath(root))) {
    return {
      sourceCommit: "unknown",
      reason: "source is not its own Git checkout",
    };
  }
  const head = query(["rev-parse", "--verify", "HEAD"]);
  const status = query([
    "status",
    "--porcelain=v1",
    "--untracked-files=normal",
  ]);
  if (!head || !/^[0-9a-f]{40}$/.test(head) || status === null) {
    return { sourceCommit: "unknown", reason: "Git identity unavailable" };
  }
  if (status !== "") return { sourceCommit: "unknown", reason: "dirty source" };
  return { sourceCommit: head, reason: "clean Git checkout" };
}

export async function generateBuildInfo(
  root = projectRoot,
  { now = () => new Date(), git } = {},
) {
  const manifest = await readJson(resolve(root, "package.json"));
  const state = await sourceState(root, { git });
  const info = validateBuildInfo(
    {
      sourceCommit: state.sourceCommit,
      version: manifest.version,
      builtAt: now().toISOString(),
    },
    { allowUnknown: true },
  );
  await atomicJson(resolve(root, "public/build-info.json"), info);
  return { info, reason: state.reason };
}
