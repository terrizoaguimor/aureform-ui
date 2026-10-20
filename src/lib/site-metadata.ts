import type { Metadata } from "next";
import type { Locale } from "@/i18n/messages";
import {
  siteName,
  siteOrigin,
  siteUrl,
  localizedSitePath,
} from "@/lib/site-config";

export const siteDescriptions = {
  en: "An open-source Next.js UI kit for dashboards, SaaS and internal tools. Explore 69 demo views, 44 component families, six palettes, editable Figma design and complete documentation. Apache 2.0.",
  es: "Un UI kit abierto de Next.js para dashboards, SaaS y herramientas internas. Explora 69 vistas demo, 44 familias de componentes, seis paletas, diseño editable en Figma y documentación. Apache 2.0.",
} satisfies Record<Locale, string>;
export const siteTitles = {
  en: "Aureform UI — Open-source Next.js UI kit & dashboard templates",
  es: "Aureform UI — UI kit y plantillas de Next.js de código abierto",
} satisfies Record<Locale, string>;

export function pageMetadata({
  locale,
  path = "",
  title,
  description,
  index = true,
  contentLocale = locale,
  translated = true,
}: {
  locale: Locale;
  path?: string;
  title?: string;
  description?: string;
  index?: boolean;
  contentLocale?: Locale;
  translated?: boolean;
}): Metadata {
  const pageTitle = title ? `${title} · ${siteName}` : siteTitles[locale];
  const pageDescription = description ?? siteDescriptions[locale];
  const canonical = siteUrl(localizedSitePath(contentLocale, path));
  const image = siteUrl("/og/aureform-cover.png");
  return {
    metadataBase: new URL(siteOrigin),
    title: { absolute: pageTitle },
    description: pageDescription,
    alternates: {
      canonical,
      languages: translated
        ? {
            en: siteUrl(localizedSitePath("en", path)),
            es: siteUrl(localizedSitePath("es", path)),
            "x-default": siteUrl(path ? localizedSitePath("en", path) : "/"),
          }
        : { [contentLocale]: canonical },
    },
    openGraph: {
      type: "website",
      title: pageTitle,
      description: pageDescription,
      siteName,
      url: canonical,
      locale: contentLocale === "es" ? "es_ES" : "en_US",
      alternateLocale: translated
        ? contentLocale === "es"
          ? ["en_US"]
          : ["es_ES"]
        : undefined,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt:
            locale === "es"
              ? "Aureform UI: código abierto, Next.js y diseño expresivo"
              : "Aureform UI: open source, Next.js and expressive design",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [image],
    },
    robots: {
      index: index && locale === contentLocale,
      follow: true,
      googleBot: {
        index: index && locale === contentLocale,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    category: "technology",
  };
}

export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
