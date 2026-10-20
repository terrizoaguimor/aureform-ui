"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleGauge,
  Github,
  Heart,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { messages, type Locale } from "@/i18n/messages";
import type { DocNavigationItem } from "@/lib/documentation";
import { githubUrl, kitVersion } from "@/lib/catalog";
import { sponsorsUrl } from "@/lib/site-config";
import { Brand } from "@/components/brand";
import {
  AppearanceProvider,
  useAppearance,
} from "@/components/appearance-provider";
import { AppearanceControls } from "@/components/appearance-controls";
import {
  DocumentationSearch,
  documentationArticleHref,
  type DocumentationHeading,
} from "@/components/documentation-search";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export type { DocumentationHeading } from "@/components/documentation-search";

export interface DocumentationShellProps {
  /** UI locale. Server children may declare their own canonical fallback lang. */
  locale: Locale;
  /** Article path relative to /docs. "start" is the documentation home. */
  activeSlug: string;
  /**
   * Localized, serializable navigation metadata, in the desired reading order.
   * keywords from the server index make all article headings searchable.
   * Optional headings add direct section links; see DocumentationSearchArticle.
   * Do not pass the article bodies.
   */
  articles: readonly DocNavigationItem[];
  /** IDs must match the headings rendered by the server in children. */
  headings: readonly DocumentationHeading[];
  /** Pass server-rendered article content as a slot, without importing it here. */
  children: ReactNode;
}

type NavigationGroup = {
  title: string;
  articles: readonly DocNavigationItem[];
};

const navigationLink =
  "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-medium outline-none transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

/**
 * Server-rendered children remain a slot inside the appearance boundary.
 * Existing appearance controls get their own small Intl boundary; article
 * content and shell navigation do not require an internationalization provider.
 */
export function DocumentationShell(props: DocumentationShellProps) {
  return (
    <AppearanceProvider>
      <DocumentationFrame {...props} />
    </AppearanceProvider>
  );
}

function DocumentationFrame({
  locale,
  activeSlug,
  articles,
  headings,
  children,
}: DocumentationShellProps) {
  const l = wording(locale);
  const { appearance, setAppearance } = useAppearance();
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = useMemo(() => {
    const grouped = new Map<string, DocNavigationItem[]>();
    for (const article of articles) {
      grouped.set(article.group, [
        ...(grouped.get(article.group) ?? []),
        article,
      ]);
    }
    return [...grouped].map(([title, groupArticles]) => ({
      title,
      articles: groupArticles,
    }));
  }, [articles]);
  const readingOrder = groups.flatMap((group) => group.articles);
  const activeIndex = readingOrder.findIndex(
    (article) => article.slug === activeSlug,
  );
  const activeArticle = readingOrder[activeIndex];
  const previous = activeIndex > 0 ? readingOrder[activeIndex - 1] : undefined;
  const next = activeIndex >= 0 ? readingOrder[activeIndex + 1] : undefined;
  const tocHeadings = useMemo(
    () => headings.filter((heading) => heading.level > 1 && heading.id),
    [headings],
  );
  const activeHeadingId = useActiveHeading(tocHeadings);
  const docsHref = documentationArticleHref(locale, "start");
  const demoHref = `/${locale}/dashboard/`;
  const componentsHref = `/${locale}/components/`;

  return (
    <div lang={locale} className="min-h-dvh bg-background text-foreground">
      <a
        href="#documentation-content"
        className="fixed top-3 left-3 z-70 -translate-y-24 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg focus:translate-y-0"
      >
        {l("Skip to documentation", "Saltar a la documentación")}
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1536px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            prefetch={false}
            href={`/${locale}/`}
            aria-label={l("Aureform UI home", "Inicio de Aureform UI")}
            className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Brand compact className="sm:hidden" />
            <Brand className="hidden sm:inline-flex" />
          </Link>
          <span className="hidden rounded-full border border-primary/20 bg-accent/50 px-2.5 py-1 text-[10px] font-semibold text-accent-foreground lg:inline">
            v{kitVersion}
          </span>
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            <DocumentationSearch
              locale={locale}
              activeSlug={activeSlug}
              articles={articles}
              headings={headings}
            />
            <nav
              aria-label={l(
                "Documentation language",
                "Idioma de documentación",
              )}
              className="flex shrink-0 items-center rounded-lg border border-border bg-surface p-0.5"
            >
              {(["en", "es"] as const).map((language) => (
                <Link
                  prefetch={false}
                  key={language}
                  href={documentationArticleHref(language, activeSlug)}
                  hrefLang={language}
                  lang={language}
                  aria-label={
                    language === "en" ? "EN — English" : "ES — Español"
                  }
                  aria-current={language === locale ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                    language === locale
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
                  )}
                >
                  {language.toUpperCase()}
                </Link>
              ))}
            </nav>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                appearance.theme === "dark"
                  ? l("Switch to light mode", "Cambiar al modo claro")
                  : l("Switch to dark mode", "Cambiar al modo oscuro")
              }
              onClick={() =>
                setAppearance((current) => ({
                  ...current,
                  theme: current.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              {appearance.theme === "dark" ? (
                <Sun aria-hidden="true" />
              ) : (
                <Moon aria-hidden="true" />
              )}
            </Button>
            <DocumentationAppearanceControls
              locale={locale}
              showLabel={false}
              className="hidden sm:inline-flex"
            />
            <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
              <DrawerTrigger
                aria-label={l(
                  "Open documentation menu",
                  "Abrir menú de documentación",
                )}
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="lg:hidden"
                  />
                }
              >
                <Menu aria-hidden="true" />
              </DrawerTrigger>
              <DrawerContent
                lang={locale}
                closeLabel={l("Close menu", "Cerrar menú")}
                className="left-0 right-auto w-[min(360px,calc(100%-24px))] border-r border-l-0 p-5"
              >
                <DrawerTitle className="flex items-center gap-2 pr-10 text-base font-semibold">
                  <BookOpen
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  {l("Documentation", "Documentación")}
                </DrawerTitle>
                <DrawerDescription className="mt-2 pr-5 text-xs leading-relaxed text-muted-foreground">
                  {l(
                    "Choose a guide and continue building.",
                    "Elige una guía y continúa creando.",
                  )}
                </DrawerDescription>
                <div className="mt-7">
                  <DocumentationSidebar
                    groups={groups}
                    activeSlug={activeSlug}
                    locale={locale}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </div>
                <div className="mt-7 border-t border-border pt-5">
                  <DocumentationAppearanceControls locale={locale} />
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>
        <div className="mx-auto max-w-[1536px] px-4 sm:px-6 lg:px-8">
          <nav
            aria-label={l("Main navigation", "Navegación principal")}
            className="relative -mb-px flex min-h-12 items-end gap-1 overflow-x-auto"
          >
            <Link
              prefetch={false}
              href={docsHref}
              aria-current="true"
              className={cn(
                navigationLink,
                "shrink-0 rounded-b-none border-b-2 border-primary bg-accent/40 pb-3 text-foreground",
              )}
            >
              <BookOpen className="size-3.5" aria-hidden="true" />
              {l("Documentation", "Documentación")}
            </Link>
            <Link
              prefetch={false}
              href={demoHref}
              className={cn(
                navigationLink,
                "shrink-0 pb-3 text-muted-foreground",
              )}
            >
              {l("Demo", "Demo")}
            </Link>
            <Link
              prefetch={false}
              href={componentsHref}
              className={cn(
                navigationLink,
                "shrink-0 pb-3 text-muted-foreground",
              )}
            >
              {l("Components", "Componentes")}
            </Link>
            <Link
              prefetch={false}
              href={`/${locale}/quality/`}
              className={cn(
                navigationLink,
                "shrink-0 pb-3 text-muted-foreground",
              )}
            >
              <CircleGauge className="size-3.5" aria-hidden="true" />
              {l("Quality", "Calidad")}
            </Link>
            <a
              href={sponsorsUrl}
              className={cn(
                navigationLink,
                "shrink-0 pb-3 text-muted-foreground",
              )}
            >
              <Heart className="size-3.5" aria-hidden="true" />
              {l("Sponsors", "Patrocinar")}
            </a>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                navigationLink,
                "shrink-0 pb-3 text-muted-foreground",
              )}
            >
              <Github className="size-3.5" aria-hidden="true" />
              GitHub
              <ArrowUpRight className="size-3" aria-hidden="true" />
              <span className="sr-only">
                {l("(opens in a new tab)", "(abre en una pestaña nueva)")}
              </span>
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1536px] gap-8 px-4 sm:px-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:px-8 xl:grid-cols-[224px_minmax(0,1fr)_200px] xl:gap-10">
        <aside
          aria-label={l("Documentation guides", "Guías de documentación")}
          className="sticky top-36 mt-10 hidden max-h-[calc(100dvh-10rem)] self-start overflow-y-auto overscroll-contain pr-3 pb-6 lg:block"
        >
          <DocumentationSidebar
            groups={groups}
            activeSlug={activeSlug}
            locale={locale}
          />
          <div className="af-surface-gradient mt-8 rounded-xl border border-primary/15 p-4">
            <p className="text-xs font-semibold">
              {l("From guide to interface", "De la guía a la interfaz")}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {l(
                "Explore the components alongside a working demo.",
                "Explora los componentes junto a una demo funcional.",
              )}
            </p>
            <Link
              prefetch={false}
              href={componentsHref}
              className="mt-3 inline-flex min-h-8 items-center gap-2 rounded text-xs font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {l("Browse components", "Ver componentes")}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </aside>

        <main
          id="documentation-content"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-3xl scroll-mt-32 pt-8 pb-16 outline-none sm:pt-10"
        >
          <nav
            aria-label={l("Breadcrumbs", "Ruta de navegación")}
            className="mb-7 text-xs text-muted-foreground"
          >
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <li>
                <Link
                  prefetch={false}
                  href={docsHref}
                  className="rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {l("Documentation", "Documentación")}
                </Link>
              </li>
              {activeArticle?.group && (
                <li className="inline-flex items-center gap-2">
                  <ChevronRight className="size-3" aria-hidden="true" />
                  <span>{activeArticle.group}</span>
                </li>
              )}
              {activeArticle && (
                <li className="inline-flex min-w-0 items-center gap-2">
                  <ChevronRight
                    className="size-3 shrink-0"
                    aria-hidden="true"
                  />
                  <span
                    aria-current="page"
                    className="font-medium text-foreground"
                  >
                    {activeArticle.title}
                  </span>
                </li>
              )}
            </ol>
          </nav>

          {tocHeadings.length > 0 && (
            <details className="group mb-8 rounded-xl border border-border bg-surface/70 px-4 xl:hidden">
              <summary className="flex min-h-11 list-none items-center justify-between gap-3 rounded-md text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                {l("On this page", "En esta página")}
                <ChevronDown
                  className="size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </summary>
              <div className="border-t border-border pt-3 pb-4">
                <DocumentationToc
                  locale={locale}
                  headings={tocHeadings}
                  activeId={activeHeadingId}
                />
              </div>
            </details>
          )}

          <div className="min-w-0 [&_h2]:scroll-mt-36 [&_h3]:scroll-mt-36 [&_h4]:scroll-mt-36 [&_h5]:scroll-mt-36 [&_h6]:scroll-mt-36">
            {children}
          </div>

          {(previous || next) && (
            <nav
              aria-label={l("Continue reading", "Continuar leyendo")}
              className="mt-12 grid gap-3 border-t border-border pt-7 sm:grid-cols-2"
            >
              {previous ? (
                <ArticlePaginationLink
                  article={previous}
                  locale={locale}
                  direction="previous"
                />
              ) : (
                <span className="hidden sm:block" aria-hidden="true" />
              )}
              {next && (
                <ArticlePaginationLink
                  article={next}
                  locale={locale}
                  direction="next"
                />
              )}
            </nav>
          )}
          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
            <span>Aureform UI · v{kitVersion}</span>
            <nav
              aria-label={l("Quality and support", "Calidad y apoyo")}
              className="flex flex-wrap items-center gap-4"
            >
              <Link
                prefetch={false}
                href={`/${locale}/quality/`}
                className="inline-flex min-h-8 items-center gap-1.5 rounded hover:text-foreground"
              >
                <CircleGauge className="size-3.5" aria-hidden="true" />
                {l("Quality", "Calidad")}
              </Link>
              <a
                href={sponsorsUrl}
                className="inline-flex min-h-8 items-center gap-1.5 rounded hover:text-foreground"
              >
                <Heart className="size-3.5" aria-hidden="true" />
                {l("Sponsors", "Patrocinar")}
              </a>
            </nav>
            <a
              href={`${githubUrl}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-8 items-center gap-1.5 rounded outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {l(
                "Suggest a documentation improvement",
                "Sugerir una mejora en la documentación",
              )}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
              <span className="sr-only">
                {l("(opens in a new tab)", "(abre en una pestaña nueva)")}
              </span>
            </a>
          </footer>
        </main>

        {tocHeadings.length > 0 && (
          <aside
            aria-label={l("Article contents", "Contenido del artículo")}
            className="sticky top-36 mt-10 hidden max-h-[calc(100dvh-10rem)] self-start overflow-y-auto overscroll-contain pb-6 xl:block"
          >
            <p className="mb-4 text-xs font-semibold">
              {l("On this page", "En esta página")}
            </p>
            <DocumentationToc
              locale={locale}
              headings={tocHeadings}
              activeId={activeHeadingId}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function DocumentationSidebar({
  groups,
  activeSlug,
  locale,
  onNavigate,
}: {
  groups: readonly NavigationGroup[];
  activeSlug: string;
  locale: Locale;
  onNavigate?: () => void;
}) {
  const l = wording(locale);
  const labelId = useId();
  return (
    <nav aria-label={l("Documentation sections", "Secciones de documentación")}>
      <div className="space-y-7">
        {groups.map((group, index) => (
          <section key={group.title} aria-labelledby={`${labelId}-${index}`}>
            <h2
              id={`${labelId}-${index}`}
              className="mb-2 px-3 text-[11px] font-semibold text-muted-foreground"
            >
              {group.title || l("Guides", "Guías")}
            </h2>
            <ul className="space-y-1">
              {group.articles.map((article) => (
                <li key={article.slug}>
                  <Link
                    prefetch={false}
                    href={documentationArticleHref(locale, article.slug)}
                    aria-current={
                      article.slug === activeSlug ? "page" : undefined
                    }
                    onClick={onNavigate}
                    className={cn(
                      "flex min-h-10 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                      article.slug === activeSlug
                        ? "border-primary/20 bg-accent font-semibold text-accent-foreground"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-surface-subtle hover:text-foreground",
                    )}
                  >
                    {article.title}
                    {article.slug === activeSlug && (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}

function DocumentationToc({
  locale,
  headings,
  activeId,
}: {
  locale: Locale;
  headings: readonly DocumentationHeading[];
  activeId: string;
}) {
  const l = wording(locale);
  return (
    <nav aria-label={l("On this page", "En esta página")}>
      <ul className="space-y-1 border-l border-border">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${encodeURIComponent(heading.id)}`}
              aria-current={heading.id === activeId ? "location" : undefined}
              className={cn(
                "-ml-px block rounded-r-md border-l-2 px-3 py-2 text-xs leading-relaxed outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                heading.level > 2 && "pl-6",
                heading.id === activeId
                  ? "border-primary bg-accent/40 font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ArticlePaginationLink({
  article,
  locale,
  direction,
}: {
  article: DocNavigationItem;
  locale: Locale;
  direction: "previous" | "next";
}) {
  const l = wording(locale);
  const isNext = direction === "next";
  const Icon = isNext ? ArrowRight : ArrowLeft;
  return (
    <Link
      prefetch={false}
      href={documentationArticleHref(locale, article.slug)}
      className={cn(
        "group af-surface-gradient rounded-xl border border-border p-4 outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
        isNext && "text-right",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-2 text-[11px] text-muted-foreground",
          isNext && "flex-row-reverse",
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {isNext ? l("Next", "Siguiente") : l("Previous", "Anterior")}
      </span>
      <span className="mt-2 block text-sm font-semibold group-hover:text-primary">
        {article.title}
      </span>
    </Link>
  );
}

function wording(locale: Locale) {
  return (en: string, es: string) => (locale === "es" ? es : en);
}

function DocumentationAppearanceControls({
  locale,
  className,
  showLabel = true,
}: {
  locale: Locale;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone="America/Bogota"
    >
      <AppearanceControls className={className} showLabel={showLabel} />
    </NextIntlClientProvider>
  );
}

function useActiveHeading(headings: readonly DocumentationHeading[]) {
  const [activeId, setActiveId] = useState("");
  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (!elements.length) {
      setActiveId("");
      return;
    }
    let frame: number | null = null;
    const update = () => {
      frame = null;
      let current = elements[0].id;
      for (const element of elements) {
        if (element.getBoundingClientRect().top > 152) break;
        current = element.id;
      }
      setActiveId(current);
    };
    const scheduleUpdate = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
    };
  }, [headings]);
  return activeId;
}
