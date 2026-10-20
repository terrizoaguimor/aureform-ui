import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DocumentationShell } from "@/components/documentation-shell";
import { DocumentationArticleContent } from "@/components/documentation-article";
import { locales, type Locale } from "@/i18n/messages";
import {
  documentationArticles,
  documentationContentLocale,
  documentationPath,
  getDocumentationArticle,
} from "@/lib/documentation";
import {
  readDocumentationArticle,
  documentationSearchIndex,
} from "@/lib/documentation-server";
import { githubUrl } from "@/lib/catalog";
import { pageMetadata, serializeStructuredData } from "@/lib/site-metadata";
import { siteUrl, localizedSitePath } from "@/lib/site-config";

export const dynamicParams = false;
export function generateStaticParams() {
  return locales.flatMap((locale) =>
    documentationArticles.map((article) => ({
      locale,
      chapter: article.slug === "start" ? [] : [article.slug],
    })),
  );
}
type Props = {
  params: Promise<{ locale: string; chapter?: string[] }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, chapter = [] } = await params;
  const language = locale === "es" ? "es" : "en";
  const article = getDocumentationArticle(chapter[0] ?? "start");
  if (!article) return {};
  const contentLocale = documentationContentLocale(article, language);
  return pageMetadata({
    locale: language,
    path: article.slug === "start" ? "docs" : `docs/${article.slug}`,
    title: `${article.title[language]} · ${language === "es" ? "Documentación" : "Documentation"}`,
    description: article.description[language],
    contentLocale,
    translated: Boolean(article.files.en && article.files.es),
  });
}
export default async function Page({ params }: Props) {
  const { locale, chapter = [] } = await params;
  if (!locales.includes(locale as Locale) || chapter.length > 1) notFound();
  const language = locale as Locale;
  const slug = chapter[0] ?? "start";
  const [loaded, articles] = await Promise.all([
    readDocumentationArticle(language, slug),
    documentationSearchIndex(language),
  ]);
  if (!loaded) notFound();
  const { article, content, contentLocale, sourceFile, headings } = loaded;
  const canonical = siteUrl(documentationPath(contentLocale, article.slug));
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        headline: article.title[contentLocale],
        description: article.description[contentLocale],
        url: canonical,
        mainEntityOfPage: canonical,
        inLanguage: contentLocale,
        isAccessibleForFree: true,
        license: "https://www.apache.org/licenses/LICENSE-2.0",
        isPartOf: {
          "@type": "WebSite",
          name: "Aureform UI",
          url: siteUrl("/"),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Aureform UI",
            item: siteUrl(localizedSitePath(contentLocale)),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: contentLocale === "es" ? "Documentación" : "Documentation",
            item: siteUrl(documentationPath(contentLocale)),
          },
          ...(slug === "start"
            ? []
            : [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: article.title[contentLocale],
                  item: canonical,
                },
              ]),
        ],
      },
    ],
  };
  return (
    <DocumentationShell
      locale={language}
      activeSlug={slug}
      articles={articles}
      headings={headings}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(structuredData),
        }}
      />
      <article lang={contentLocale}>
        <header lang={language} className="mb-9 border-b border-border pb-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {article.group[language]}
          </p>
          <h1 className="text-4xl font-semibold leading-[1.15] tracking-[-0.05em] sm:text-5xl">
            {article.title[language]}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
            {article.description[language]}
          </p>
        </header>
        {contentLocale !== language && (
          <p
            lang={language}
            className="mb-7 rounded-xl border border-border bg-muted/30 p-4 text-sm leading-7 text-muted-foreground"
          >
            {language === "es"
              ? "La referencia técnica de este capítulo está en inglés. La navegación permanece en español."
              : "This research chapter is currently available in Spanish. Navigation remains in English."}
          </p>
        )}
        {article.retainedScope && (
          <p
            lang={language}
            className="mb-7 rounded-xl border border-border bg-muted/30 p-4 text-sm leading-7 text-muted-foreground"
          >
            {article.retainedScope[language]}
          </p>
        )}
        <DocumentationArticleContent
          content={content}
          sourceFile={sourceFile}
          locale={language}
        />
        <footer
          lang={language}
          className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground"
        >
          <span>
            {language === "es"
              ? "Documentación y código abiertos · Apache 2.0"
              : "Open documentation and source · Apache 2.0"}
          </span>
          <a
            href={`${githubUrl}/blob/main/${sourceFile}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {language === "es"
              ? "Ver esta página en GitHub"
              : "View this page on GitHub"}
          </a>
        </footer>
      </article>
    </DocumentationShell>
  );
}
