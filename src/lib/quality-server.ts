import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cache } from "react";
import {
  parseQualitySnapshots,
  type QualitySnapshot,
  type QualitySourceArchive,
} from "@/lib/quality";

function isMissing(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

async function entry(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

/** Read evidence and archive context only during static rendering. */
export const readQualityData = cache(
  async (
    root = process.cwd(),
  ): Promise<{
    snapshots: QualitySnapshot[];
    sourceArchive: QualitySourceArchive | null;
  }> => {
    const reportsRoot = resolve(root, "docs/quality/lighthouse");
    let source: string;
    try {
      source = await readFile(resolve(reportsRoot, "index.json"), "utf8");
    } catch (error) {
      if (isMissing(error)) return { snapshots: [], sourceArchive: null };
      throw error;
    }
    const snapshots = parseQualitySnapshots(JSON.parse(source));
    if (!snapshots.length) return { snapshots, sourceArchive: null };

    // Check this root only; an extracted ZIP can live inside another repository.
    // Any .git entry, including a worktree pointer file, prevents archive fallback.
    const hasGit = Boolean(await entry(resolve(root, ".git")));
    const missingSnapshotIds: string[] = [];
    for (const snapshot of snapshots) {
      const bundle = await entry(resolve(reportsRoot, snapshot.id));
      if (!bundle) {
        if (hasGit) {
          throw new Error(
            `Missing Lighthouse report bundle ${snapshot.id} in Git checkout.`,
          );
        }
        missingSnapshotIds.push(snapshot.id);
      } else if (!bundle.isDirectory() || bundle.isSymbolicLink()) {
        throw new Error(
          `Lighthouse report bundle ${snapshot.id} must be a regular directory.`,
        );
      }
    }

    return {
      snapshots,
      sourceArchive: missingSnapshotIds.length
        ? { reportOrigin: "https://aureformui.com", missingSnapshotIds }
        : null,
    };
  },
);
