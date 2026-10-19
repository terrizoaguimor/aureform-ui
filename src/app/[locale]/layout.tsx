import { DocumentLayout } from "@/components/document-layout";

export { metadata, viewport } from "@/components/document-layout";

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  return (
    <DocumentLayout locale={locale === "es" ? "es" : "en"}>
      {children}
    </DocumentLayout>
  );
}
