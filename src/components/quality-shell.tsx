"use client";

import type { ReactNode } from "react";
import { BookOpen, CircleGauge, Heart, Moon, Sun } from "lucide-react";
import {
  AppearanceProvider,
  useAppearance,
} from "@/components/appearance-provider";
import { Brand } from "@/components/brand";
import type { Locale } from "@/i18n/messages";
import { githubUrl, kitVersion } from "@/lib/catalog";
import { publicPath } from "@/lib/public-path";
import { localizedSitePath, sponsorsUrl } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const navigationLink =
  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-t-lg border-b-2 border-transparent px-3 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

/** Appearance is the only provider; the server-rendered evidence stays a slot. */
export function QualityShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <AppearanceProvider>
      <QualityFrame locale={locale}>{children}</QualityFrame>
    </AppearanceProvider>
  );
}

function QualityFrame({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const l = (en: string, es: string) => (locale === "es" ? es : en);
  const { appearance, setAppearance } = useAppearance();
  const href = (path = "") => publicPath(localizedSitePath(locale, path));
  return (
    <div
      lang={locale}
      className="min-h-dvh min-w-0 bg-background text-foreground"
    >
      <a
        href="#quality-content"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg focus:translate-y-0"
      >
        {l("Skip to quality reports", "Saltar a los informes de calidad")}
      </a>
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex min-h-18 max-w-[1440px] items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-12">
          <a
            href={href()}
            aria-label="Aureform UI"
            className="shrink-0 rounded"
          >
            <Brand />
          </a>
          <div className="flex items-center gap-2">
            <nav
              aria-label={l("Page language", "Idioma de la página")}
              className="flex rounded-lg border border-border bg-surface p-0.5"
            >
              {(["en", "es"] as const).map((language) => (
                <a
                  key={language}
                  href={publicPath(localizedSitePath(language, "quality"))}
                  hrefLang={language}
                  lang={language}
                  aria-label={
                    language === "en" ? "EN — English" : "ES — Español"
                  }
                  aria-current={language === locale ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-9 min-w-9 items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors motion-reduce:transition-none",
                    language === locale
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {language.toUpperCase()}
                </a>
              ))}
            </nav>
            <button
              type="button"
              aria-label={
                appearance.theme === "dark"
                  ? l("Switch to light theme", "Cambiar al tema claro")
                  : l("Switch to dark theme", "Cambiar al tema oscuro")
              }
              aria-pressed={appearance.theme === "dark"}
              onClick={() =>
                setAppearance((current) => ({
                  ...current,
                  theme: current.theme === "dark" ? "light" : "dark",
                }))
              }
              className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground motion-reduce:transition-none"
            >
              {appearance.theme === "dark" ? (
                <Sun className="size-4" aria-hidden="true" />
              ) : (
                <Moon className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        <nav
          aria-label={l("Main navigation", "Navegación principal")}
          className="mx-auto -mb-px flex max-w-[1440px] gap-1 overflow-x-auto px-5 sm:px-8 lg:px-12"
        >
          <a href={href()} className={navigationLink}>
            {l("The kit", "El kit")}
          </a>
          <a href={href("docs")} className={navigationLink}>
            <BookOpen className="size-3.5" aria-hidden="true" />
            {l("Documentation", "Documentación")}
          </a>
          <a href={href("dashboard")} className={navigationLink}>
            Demo
          </a>
          <a
            href={href("quality")}
            aria-current="page"
            className={cn(
              navigationLink,
              "border-primary bg-accent/40 text-foreground",
            )}
          >
            <CircleGauge className="size-3.5" aria-hidden="true" />
            {l("Quality", "Calidad")}
          </a>
          <a href={sponsorsUrl} className={navigationLink}>
            <Heart className="size-3.5" aria-hidden="true" />
            {l("Sponsors", "Patrocinar")}
          </a>
          <a href={githubUrl} className={navigationLink}>
            GitHub
          </a>
        </nav>
      </header>

      {children}

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-muted-foreground sm:px-8 lg:px-12">
          <span>Aureform UI · v{kitVersion} · Apache 2.0</span>
          <nav
            aria-label={l("Footer navigation", "Navegación del pie de página")}
            className="flex flex-wrap items-center gap-x-5 gap-y-3"
          >
            <a href={href("docs")} className="rounded hover:text-foreground">
              {l("Documentation", "Documentación")}
            </a>
            <a href={href("quality")} className="rounded hover:text-foreground">
              {l("Quality", "Calidad")}
            </a>
            <a href={sponsorsUrl} className="rounded hover:text-foreground">
              {l("Sponsors", "Patrocinar")}
            </a>
            <a href={githubUrl} className="rounded hover:text-foreground">
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
