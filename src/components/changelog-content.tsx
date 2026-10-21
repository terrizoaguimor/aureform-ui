import {
  ArrowDown,
  ArrowUpRight,
  FileText,
  GitCompareArrows,
  History,
} from "lucide-react";
import type { Locale } from "@/i18n/messages";
import {
  changelogMarkdownUrl,
  changelogReleaseId,
  changelogReleases,
  changelogReleaseUrl,
  changelogRepository,
  changelogUnreleased,
  formatChangelogDate,
  latestChangelogRelease,
  type ChangelogEntry,
} from "@/lib/changelog";
import { publicPath } from "@/lib/public-path";
import { localizedSitePath, siteUrl } from "@/lib/site-config";
import { serializeStructuredData } from "@/lib/site-metadata";
import { cn } from "@/lib/utils";

const linkStyle =
  "inline-flex min-h-10 items-center gap-2 rounded-lg text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

export function ChangelogContent({ locale }: { locale: Locale }) {
  const l = (en: string, es: string) => (locale === "es" ? es : en);
  const latest = latestChangelogRelease;
  const compareUrl = `${changelogRepository}/compare/v${latest.version}...main`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: l("Aureform UI changelog", "Historial de cambios de Aureform UI"),
    description: l(
      "Release history for the open-source Aureform UI kit.",
      "Historial de versiones del UI kit abierto Aureform UI.",
    ),
    url: siteUrl(localizedSitePath(locale, "changelog")),
    inLanguage: locale,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: changelogReleases.length,
      itemListElement: changelogReleases.map((release, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "CreativeWork",
          name: `Aureform UI ${release.version}: ${release.title[locale]}`,
          version: release.version,
          datePublished: release.publishedAt,
          description: release.summary[locale],
          url: changelogReleaseUrl(release.version),
        },
      })),
    },
  };
  return (
    <main
      id="changelog-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-[1440px] px-5 py-8 outline-none sm:px-8 sm:py-10 lg:px-12"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(structuredData),
        }}
      />
      <section className="relative isolate overflow-hidden rounded-3xl border border-primary/20 bg-surface px-6 py-9 sm:p-10 lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at top right, color-mix(in srgb, var(--primary) 15%, transparent), transparent 65%), linear-gradient(135deg, color-mix(in srgb, var(--accent) 40%, transparent), transparent 60%)",
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[.16em] text-muted-foreground uppercase">
            <History className="size-4 text-primary" aria-hidden="true" />
            {l("Built in the open", "Construido en abierto")}
          </p>
          <a
            href={changelogReleaseUrl(latest.version)}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 text-xs font-semibold outline-none hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className="size-1.5 rounded-full bg-primary"
              aria-hidden="true"
            />
            {l("Latest release", "Última versión")} · v{latest.version}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>
        <h1 className="mt-7 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          Changelog<span className="text-primary">.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {l(
            "Every release, one clear history. Explore what arrived, what improved and the source behind each update.",
            "Cada versión, una historia clara. Explora qué llegó, qué mejoró y el código detrás de cada actualización.",
          )}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={`#${changelogReleaseId(latest.version)}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm outline-none transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            {l("Explore the latest release", "Explorar la última versión")}
            <ArrowDown className="size-4" aria-hidden="true" />
          </a>
          <a
            href={changelogMarkdownUrl(locale)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2 text-sm font-medium outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <FileText className="size-4" aria-hidden="true" />
            {l("Read on GitHub", "Leer en GitHub")}
            <ArrowUpRight
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
          </a>
        </div>
        <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/60 pt-5 text-xs text-muted-foreground">
          <span>
            {changelogReleases.length}{" "}
            {l("published releases", "versiones publicadas")}
          </span>
          <span>English / Español</span>
          <span>Apache 2.0</span>
          <span>
            {l("Publication dates in UTC", "Fechas de publicación en UTC")}
          </span>
        </div>
      </section>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
        <aside className="min-w-0 lg:sticky lg:top-8">
          <nav aria-label={l("Release navigation", "Navegación por versiones")}>
            <p className="text-[10px] font-semibold tracking-[.14em] text-muted-foreground uppercase">
              {l("The release journal", "Historial de versiones")}
            </p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1">
              <a
                href="#unreleased"
                className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-border px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring lg:justify-between lg:border-transparent"
              >
                {l("Unreleased", "Sin publicar")}
                <span className="ml-3 text-[10px] text-muted-foreground">
                  main
                </span>
              </a>
              {changelogReleases.map((release, index) => (
                <a
                  key={release.version}
                  href={`#${changelogReleaseId(release.version)}`}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-border px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring lg:justify-between lg:border-transparent"
                >
                  v{release.version}
                  {index === 0 && (
                    <span className="ml-3 rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">
                      {l("Latest", "Actual")}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </nav>
          <div className="mt-5 hidden rounded-2xl border border-border bg-surface p-4 lg:block">
            <p className="text-sm font-semibold">
              {l("Follow the progress", "Sigue el progreso")}
            </p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {l(
                "Browse the original releases, downloads and checksums on GitHub.",
                "Consulta las releases originales, descargas y checksums en GitHub.",
              )}
            </p>
            <a
              href={`${changelogRepository}/releases`}
              className={cn(linkStyle, "mt-2")}
            >
              {l("All releases", "Todas las releases")}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </aside>

        <div className="min-w-0 space-y-8">
          <article
            id="unreleased"
            aria-labelledby="unreleased-title"
            className="scroll-mt-8 rounded-2xl border border-dashed border-border bg-surface/60 p-5 sm:p-8"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="unreleased-title" className="text-xl font-semibold">
                {l("Unreleased", "Sin publicar")}
              </h2>
              <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                main
              </span>
            </div>
            <EntryContent locale={locale} entry={changelogUnreleased} />
            <a href={compareUrl} className={cn(linkStyle, "mt-4")}>
              <GitCompareArrows className="size-4" aria-hidden="true" />
              {l(
                `Compare v${latest.version} to main`,
                `Comparar v${latest.version} con main`,
              )}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </article>
          {changelogReleases.map((release, index) => {
            const id = changelogReleaseId(release.version);
            const older = changelogReleases[index + 1];
            return (
              <article
                key={release.version}
                id={id}
                data-changelog-version={release.version}
                aria-labelledby={`${id}-title`}
                className={cn(
                  "relative scroll-mt-8 rounded-2xl border bg-surface p-5 sm:p-8",
                  index === 0 ? "border-primary/30 shadow-sm" : "border-border",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2
                      id={`${id}-title`}
                      className="font-mono text-2xl font-semibold tracking-tight"
                    >
                      v{release.version}
                    </h2>
                    {index === 0 && (
                      <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold text-accent-foreground">
                        {l("Latest release", "Última versión")}
                      </span>
                    )}
                  </div>
                  <time
                    dateTime={release.publishedAt}
                    className="text-xs text-muted-foreground"
                  >
                    {formatChangelogDate(locale, release.publishedAt)}
                  </time>
                </div>
                <EntryContent locale={locale} entry={release} />
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-4">
                  <a
                    href={changelogReleaseUrl(release.version)}
                    className={linkStyle}
                  >
                    {l("GitHub release", "Release en GitHub")}
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </a>
                  {older && (
                    <a
                      href={`${changelogRepository}/compare/v${older.version}...v${release.version}`}
                      className={linkStyle}
                    >
                      <GitCompareArrows
                        className="size-3.5"
                        aria-hidden="true"
                      />
                      {l("Compare changes", "Comparar cambios")}
                    </a>
                  )}
                  {release.links.map((link) => (
                    <a
                      key={link.path}
                      href={`${changelogRepository}/blob/v${release.version}/${link.path}`}
                      className={linkStyle}
                    >
                      {link.label[locale]}
                      <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </article>
            );
          })}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-7">
            <div>
              <p className="text-sm font-semibold">
                {l("Ready to build something?", "¿Listo para crear algo?")}
              </p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                {l(
                  "Start with the current documentation and make the kit your own.",
                  "Empieza con la documentación actual y adapta el kit a tu producto.",
                )}
              </p>
            </div>
            <a
              href={publicPath(localizedSitePath(locale, "docs"))}
              className={linkStyle}
            >
              {l("Open documentation", "Abrir documentación")}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

function EntryContent({
  locale,
  entry,
}: {
  locale: Locale;
  entry: ChangelogEntry;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {entry.title[locale]}
      </h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        {entry.summary[locale]}
      </p>
      <div className="mt-6 space-y-6">
        {entry.groups.map((group) => (
          <div key={group.title.en}>
            <h4 className="text-[10px] font-semibold tracking-[.13em] text-primary uppercase">
              {group.title[locale]}
            </h4>
            <ul className="mt-3 space-y-2.5">
              {group.items.map((item) => (
                <li
                  key={item.en}
                  className="flex gap-3 text-sm leading-7 text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="mt-3 size-1 shrink-0 rounded-full bg-primary/60"
                  />
                  <span className="min-w-0">{item[locale]}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-6 border-l-2 border-border pl-4 text-xs leading-6 text-muted-foreground">
        {entry.notes[locale]}
      </p>
    </div>
  );
}
