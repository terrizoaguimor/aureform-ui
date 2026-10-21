import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChangelogContent } from "@/components/changelog-content";
import { PublicPageShell } from "@/components/public-page-shell";
import { locales, type Locale } from "@/i18n/messages";
import { pageMetadata } from "@/lib/site-metadata";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const language = locale === "es" ? "es" : "en";
  return pageMetadata({
    locale: language,
    path: "changelog",
    title:
      language === "es"
        ? "Changelog e historial de versiones"
        : "Changelog & release history",
    description:
      language === "es"
        ? "Consulta las novedades de Aureform UI, del lanzamiento Apache 2.0 a las 65 integraciones: fechas, cambios, validación y enlaces a cada release de GitHub."
        : "Explore Aureform UI updates, from the Apache 2.0 launch to 65 integrations: release dates, changes, validation and links to each GitHub release.",
  });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  return (
    <PublicPageShell locale={locale as Locale} section="changelog">
      <ChangelogContent locale={locale as Locale} />
    </PublicPageShell>
  );
}
