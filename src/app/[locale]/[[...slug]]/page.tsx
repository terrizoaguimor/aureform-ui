import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppPage } from "@/components/app-page";
import { routes } from "@/lib/catalog";
import { locales, type Locale } from "@/i18n/messages";
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) => [
    { locale, slug: [] },
    ...routes.map((route) => ({ locale, slug: route.path.split("/") })),
  ]);
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug?: string[] }>;
}): Promise<Metadata> {
  const { locale, slug = [] } = await params,
    route = routes.find((item) => item.path === slug.join("/"));
  return {
    title: route
      ? route[locale === "es" ? "es" : "en"]
      : { absolute: "Aureform UI — Refined interfaces for ambitious products" },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const { locale, slug = [] } = await params,
    path = slug.join("/");
  if (
    !locales.includes(locale as Locale) ||
    (path && !routes.some((route) => route.path === path))
  )
    notFound();
  return <AppPage locale={locale as Locale} path={path} />;
}
