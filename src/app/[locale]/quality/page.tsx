import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QualityContent } from "@/components/quality-content";
import { QualityShell } from "@/components/quality-shell";
import { locales, type Locale } from "@/i18n/messages";
import { readQualityData } from "@/lib/quality-server";
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
    path: "quality",
    title:
      language === "es"
        ? "Calidad e informes de Lighthouse"
        : "Quality & Lighthouse reports",
    description:
      language === "es"
        ? "Mediciones públicas de Aureform UI: medianas de Lighthouse para tres rutas en móvil y escritorio, informes originales y código asociado a cada medición."
        : "Public Aureform UI measurements: Lighthouse medians for three routes on mobile and desktop, original reports, and the source behind each snapshot.",
  });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const { snapshots, sourceArchive } = await readQualityData();
  return (
    <QualityShell locale={locale as Locale}>
      <QualityContent
        locale={locale as Locale}
        snapshots={snapshots}
        sourceArchive={sourceArchive}
      />
    </QualityShell>
  );
}
