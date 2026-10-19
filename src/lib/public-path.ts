/**
 * Add the build's mount point to a public asset or native HTML link.
 * Keep next/link and Next's router paths unprefixed: Next handles those itself.
 */
export function publicPath(
  path: string,
  basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "",
): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const prefix = basePath.trim().replace(/^\/+|\/+$/g, "");
  if (!prefix) return path;
  const base = `/${prefix}`;
  if (
    path === base ||
    path.startsWith(`${base}/`) ||
    path.startsWith(`${base}?`) ||
    path.startsWith(`${base}#`)
  ) {
    return path;
  }
  return `${base}${path}`;
}
