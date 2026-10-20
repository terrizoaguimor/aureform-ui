import { mkdir, open, rename, rm, writeFile, lstat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  atomicJson,
  indexPath,
  projectRoot,
  readBundle,
  readJson,
  requireCondition,
  validateIndex,
  verifySnapshotReports,
} from "./quality.mjs";

export async function importBundle(
  directory,
  { root = projectRoot, expectedCommit, contract } = {},
) {
  const bundle = await readBundle(directory, { expectedCommit, contract });
  const reportsRoot = resolve(root, "docs/quality/lighthouse");
  await mkdir(reportsRoot, { recursive: true });
  requireCondition(
    !(await lstat(reportsRoot)).isSymbolicLink(),
    "Import destination cannot be a symlink.",
  );
  const lockPath = resolve(reportsRoot, ".import.lock");
  const lock = await open(lockPath, "wx");
  const temporary = resolve(reportsRoot, `.import-${randomUUID()}`);
  const destination = resolve(reportsRoot, bundle.snapshot.id);
  let installed = false;
  try {
    const index = validateIndex(await readJson(resolve(root, indexPath)));
    const existing = index.find(
      (snapshot) => snapshot.id === bundle.snapshot.id,
    );
    if (existing) {
      requireCondition(
        isDeepStrictEqual(existing, bundle.snapshot),
        "Snapshot id already exists with different data.",
      );
      await verifySnapshotReports(existing, destination, { contract });
      return { snapshot: existing, imported: false };
    }
    try {
      await lstat(destination);
      throw new Error(
        "Report directory already exists without an indexed snapshot; refusing to overwrite.",
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await mkdir(temporary);
    for (const [filename, bytes] of bundle.files)
      await writeFile(resolve(temporary, filename), bytes, { flag: "wx" });
    await rename(temporary, destination);
    installed = true;
    index.push(bundle.snapshot);
    // Oldest first; consumers should select the newest createdAt explicitly.
    index.sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
    await atomicJson(resolve(root, indexPath), index);
    return { snapshot: bundle.snapshot, imported: true };
  } catch (error) {
    if (installed) await rm(destination, { recursive: true, force: true });
    throw error;
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
