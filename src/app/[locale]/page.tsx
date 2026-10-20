import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MarketingPage } from "@/components/marketing-page";
import { SiteStructuredData } from "@/components/site-structured-data";
import { locales, type Locale } from "@/i18n/messages";
import { pageMetadata } from "@/lib/site-metadata";

export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale: locale === "es" ? "es" : "en" });
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  return (
    <>
      <SiteStructuredData locale={locale as Locale} />
      <MarketingPage locale={locale as Locale} />
    </>
  );
}
