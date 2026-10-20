import type { MetadataRoute } from "next";
import { routes } from "@/lib/catalog";
import { documentationArticles, documentationPath } from "@/lib/documentation";
import { locales } from "@/i18n/messages";
import {
  indexableDemoPaths,
  localizedSitePath,
  siteUrl,
} from "@/lib/site-config";

export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const path of [
      "",
      ...routes
        .filter((route) => indexableDemoPaths.has(route.path))
        .map((route) => route.path),
    ]) {
      pages.push({
        url: siteUrl(localizedSitePath(locale, path)),
        alternates: {
          languages: {
            en: siteUrl(localizedSitePath("en", path)),
            es: siteUrl(localizedSitePath("es", path)),
          },
        },
      });
    }
    for (const article of documentationArticles) {
      if (!article.files[locale]) continue;
      const languages = Object.fromEntries(
        locales
          .filter((language) => article.files[language])
          .map((language) => [
            language,
            siteUrl(documentationPath(language, article.slug)),
          ]),
      );
      pages.push({
        url: siteUrl(documentationPath(locale, article.slug)),
        alternates: { languages },
      });
    }
  }
  return pages;
}
