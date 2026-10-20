import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppPage } from "@/components/app-page";
import { routes } from "@/lib/catalog";
import { locales, type Locale } from "@/i18n/messages";
import { indexableDemoPaths } from "@/lib/site-config";
import { pageMetadata } from "@/lib/site-metadata";
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    routes
      .filter(
        (route) => route.path !== "docs" && !route.path.startsWith("docs/"),
      )
      .map((route) => ({ locale, slug: route.path.split("/") })),
  );
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug?: string[] }>;
}): Promise<Metadata> {
  const { locale, slug = [] } = await params,
    route = routes.find((item) => item.path === slug.join("/"));
  const language = locale === "es" ? "es" : "en";
  const path = slug.join("/");
  const title = route?.[language] ?? "Aureform UI";
  return pageMetadata({
    locale: language,
    path,
    title,
    description:
      language === "es"
        ? `${title} en Aureform UI: explora esta interfaz de demostración de Next.js, su diseño adaptable y su código reutilizable.`
        : `${title} in Aureform UI: explore this Next.js demo interface, responsive design and reusable source code.`,
    index: indexableDemoPaths.has(path),
  });
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
    !routes.some((route) => route.path === path)
  )
    notFound();
  return <AppPage locale={locale as Locale} path={path} />;
}
