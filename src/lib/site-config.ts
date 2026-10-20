/** Public identity only. Deployment credentials belong outside the source tree. */
const configuredUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://aureformui.com";
const parsedUrl = new URL(configuredUrl);
if (!["https:", "http:"].includes(parsedUrl.protocol)) {
  throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) URL.");
}
export const siteOrigin = parsedUrl.origin;
export const siteName = "Aureform UI";
export const sponsorsUrl = "https://github.com/sponsors/terrizoaguimor";

export function siteUrl(path = "/"): string {
  return new URL(path.replace(/^\/?/, "/"), `${siteOrigin}/`).toString();
}

export function localizedSitePath(locale: "en" | "es", path = ""): string {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return `/${locale}/${normalized ? `${normalized}/` : ""}`;
}

/** Useful galleries have their own search pages; fictional app records do not. */
export const indexableDemoPaths = new Set([
  "components",
  "blocks",
  "templates",
  "charts",
  "themes",
  "effects",
  "studio",
  "forms",
  "layouts",
  "integrations",
]);
