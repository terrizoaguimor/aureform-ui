import { lstat } from "node:fs/promises";
import { resolve } from "node:path";

export async function hasGitCheckout(root) {
  try {
    const info = await lstat(resolve(root, ".git"));
    return !info.isSymbolicLink() && (info.isDirectory() || info.isFile());
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
