import { ArrowUpRight, ChevronDown, CircleGauge, Heart } from "lucide-react";
import type { Locale } from "@/i18n/messages";
import { githubUrl } from "@/lib/catalog";
import { publicPath } from "@/lib/public-path";
import {
  formatQualityMetric,
  qualityCategories,
  qualityMetrics,
  qualityReportUrl,
  qualityRoutePaths,
  qualityRows,
  type QualityCategory,
  type QualityRoute,
  type QualitySnapshot,
  type QualitySourceArchive,
} from "@/lib/quality";
import { localizedSitePath, sponsorsUrl } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import styles from "./quality.module.css";

const container = "mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12";
const reportLink =
  "inline-flex min-h-9 items-center gap-1.5 rounded text-xs font-semibold text-primary underline-offset-4 hover:underline";
const metricLabels = {
  fcp: "FCP",
  lcp: "LCP",
  cls: "CLS",
  tbt: "TBT",
  speedIndex: "Speed Index",
} as const;

export function QualityContent({
  locale,
  snapshots,
  sourceArchive,
}: {
  locale: Locale;
  snapshots: readonly QualitySnapshot[];
  sourceArchive?: QualitySourceArchive | null;
}) {
  const l = (en: string, es: string) => (locale === "es" ? es : en);
  const latest = snapshots[0];
  const reportOrigin = (snapshot?: QualitySnapshot) =>
    snapshot && sourceArchive?.missingSnapshotIds.includes(snapshot.id)
      ? sourceArchive.reportOrigin
      : undefined;
  return (
    <main id="quality-content" tabIndex={-1} className="min-w-0 outline-none">
      <section className={styles.hero}>
        <div
          className={cn(
            container,
            "grid gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] lg:items-center lg:gap-16",
          )}
        >
          <div>
            <p
              className={cn(
                styles.heroAccent,
                "mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]",
              )}
            >
              <CircleGauge className="size-4" aria-hidden="true" />
              {l("Public quality record", "Registro público de calidad")}
            </p>
            <h1 className="max-w-3xl font-editorial text-5xl leading-[1.05] font-normal tracking-[-0.035em] sm:text-7xl">
              {l("Quality, in the open.", "Calidad, a la vista.")}
              <span className={cn(styles.heroTitle, "mt-2 block italic")}>
                {l("Every detail counts.", "Cada detalle cuenta.")}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              {l(
                "An interface deserves a record you can inspect. Explore Lighthouse lab measurements, the original reports, and the exact source behind each published snapshot.",
                "Una interfaz merece un registro que puedas revisar. Explora las mediciones de laboratorio de Lighthouse, los informes originales y el código exacto de cada medición publicada.",
              )}
            </p>
            <a
              href="#quality-measurements"
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary/25 bg-accent/40 px-4 text-xs font-semibold transition-colors hover:bg-accent motion-reduce:transition-none"
            >
              {l("Explore the measurements", "Ver las mediciones")}
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </a>
          </div>
          <aside
            aria-label={l("Measurement coverage", "Cobertura de medición")}
            className={cn(styles.surface, "rounded-2xl p-6 sm:p-8")}
          >
            <div className="flex items-baseline justify-between gap-4 border-b border-border pb-5">
              <p className="text-xs font-semibold">
                {l("A considered sample", "Una muestra con intención")}
              </p>
              <span className="rounded-full border border-primary/20 bg-accent/50 px-2.5 py-1 text-[10px] font-semibold text-accent-foreground">
                Lighthouse
              </span>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <dt className="text-xs text-muted-foreground">
                  {l("Routes in scope", "Rutas en la muestra")}
                </dt>
                <dd
                  className={cn(
                    styles.heroAccent,
                    "mt-2 font-editorial text-5xl",
                  )}
                >
                  3
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  {l("Device profiles", "Perfiles de dispositivo")}
                </dt>
                <dd
                  className={cn(
                    styles.heroAccent,
                    "mt-2 font-editorial text-5xl",
                  )}
                >
                  2
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-xs leading-6 text-muted-foreground">
              {l(
                "Landing, documentation and dashboard. Each on mobile and desktop.",
                "Landing, documentación y dashboard. Cada ruta en móvil y escritorio.",
              )}
            </p>
            <div className="mt-6 border-t border-border pt-5 text-xs leading-6">
              <p className="font-semibold">
                {latest
                  ? l("Latest published snapshot", "Última medición publicada")
                  : l(
                      "Awaiting the first snapshot",
                      "A la espera de la primera medición",
                    )}
              </p>
              <p className="mt-1 text-muted-foreground">
                {latest
                  ? snapshotDate(latest, locale)
                  : l(
                      "No scores have been published yet.",
                      "Todavía no se han publicado puntuaciones.",
                    )}
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section
        id="quality-measurements"
        aria-labelledby="quality-measurements-title"
        className={cn(container, "scroll-mt-6 py-12 sm:py-16")}
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              {l("The measurements", "Las mediciones")}
            </p>
            <h2
              id="quality-measurements-title"
              className="font-editorial text-3xl font-normal tracking-tight sm:text-4xl"
            >
              {l(
                "The details behind the interface.",
                "Los detalles detrás de la interfaz.",
              )}
            </h2>
          </div>
          <p className="max-w-sm text-xs leading-6 text-muted-foreground">
            {l(
              "Category scores out of 100. Median measurements for each recorded route and device profile.",
              "Categorías sobre 100. Medianas de cada ruta y perfil de dispositivo con datos registrados.",
            )}
          </p>
        </div>
        {latest ? (
          <SnapshotContext
            snapshot={latest}
            locale={locale}
            reportOrigin={reportOrigin(latest)}
          />
        ) : (
          <div className="mb-6 rounded-xl border border-dashed border-primary/25 bg-accent/20 px-5 py-4">
            <p className="text-sm font-semibold">
              {l(
                "No published measurements yet.",
                "Aún no hay mediciones publicadas.",
              )}
            </p>
            <p className="mt-2 max-w-3xl text-xs leading-6 text-muted-foreground">
              {l(
                "The six planned route/profile pairs are shown below. A dash means that a measurement has not been published. Scores and report links will appear with their recorded evidence.",
                "Las seis combinaciones previstas de ruta y perfil aparecen debajo. Un guion indica que no se ha publicado esa medición. Las puntuaciones y los enlaces aparecerán junto a su evidencia registrada.",
              )}
            </p>
          </div>
        )}
        <SnapshotTable
          snapshot={latest}
          locale={locale}
          reportOrigin={reportOrigin(latest)}
        />
      </section>

      <section
        aria-labelledby="quality-method-title"
        className="border-y border-border bg-surface-subtle/40"
      >
        <div className={cn(container, "py-12 sm:py-16")}>
          <h2
            id="quality-method-title"
            className="font-editorial text-3xl font-normal tracking-tight sm:text-4xl"
          >
            {l(
              "A little context for the numbers.",
              "Un poco de contexto para los números.",
            )}
          </h2>
          <p className="mt-4 max-w-3xl text-xs leading-7 text-muted-foreground">
            {l(
              "The recorded URLs are English routes in the demo's default configuration. The dashboard deliberately uses noindex for fictional application records, so its SEO score reflects that policy. Each page keeps its own loading results.",
              "Las URLs registradas son rutas en inglés con la configuración predeterminada de la demo. El dashboard utiliza noindex para sus registros ficticios; su puntuación SEO refleja esa política. Cada página conserva sus propios resultados de carga.",
            )}
          </p>
          <div className="mt-8 grid gap-7 sm:grid-cols-3 sm:gap-10">
            {[
              [
                l(
                  "Medians of repeated runs",
                  "Medianas de ejecuciones repetidas",
                ),
                l(
                  "Each row combines the recorded runs for one route and profile. Individual JSON and HTML reports remain available, with their SHA-256 checksums.",
                  "Cada fila reúne las ejecuciones registradas de una ruta y un perfil. Los informes JSON y HTML individuales siguen disponibles con sus sumas SHA-256.",
                ),
              ],
              [
                l("Measured in a lab", "Mediciones de laboratorio"),
                l(
                  "Lighthouse results describe the recorded test environment. Real visits vary with the device, network and content. These are lab measurements, not field Core Web Vitals.",
                  "Los resultados de Lighthouse describen el entorno de la prueba. Las visitas reales varían según dispositivo, red y contenido. Son mediciones de laboratorio, no Core Web Vitals de usuarios reales.",
                ),
              ],
              [
                l("A source you can trace", "Un código que puedes rastrear"),
                l(
                  "Every snapshot names its version, target origin, tool versions and source commit. Accessibility scores cover automated checks; human review remains part of the work.",
                  "Cada medición identifica su versión, origen, herramientas y commit. La puntuación de accesibilidad cubre comprobaciones automáticas; la revisión humana sigue formando parte del trabajo.",
                ),
              ],
            ].map(([title, description], index) => (
              <div key={title}>
                <p className="font-editorial text-xl text-primary">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-3 text-xs leading-7 text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
          <details className="group mt-9 rounded-xl border border-border bg-surface px-5">
            <summary className="flex min-h-12 list-none items-center justify-between gap-3 text-xs font-semibold [&::-webkit-details-marker]:hidden">
              {l("What the metrics mean", "Qué significan las métricas")}
              <ChevronDown
                className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <dl className="grid gap-5 border-t border-border pt-5 pb-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [
                  "FCP",
                  l(
                    "First Contentful Paint: when the first content appears.",
                    "First Contentful Paint: cuándo aparece el primer contenido.",
                  ),
                ],
                [
                  "LCP",
                  l(
                    "Largest Contentful Paint: when the largest visible content appears.",
                    "Largest Contentful Paint: cuándo aparece el contenido visible más grande.",
                  ),
                ],
                [
                  "CLS",
                  l(
                    "Cumulative Layout Shift: unexpected movement of the layout. Unitless.",
                    "Cumulative Layout Shift: movimientos inesperados de la composición. Sin unidad.",
                  ),
                ],
                [
                  "TBT",
                  l(
                    "Total Blocking Time: time blocked by long main-thread tasks, in milliseconds.",
                    "Total Blocking Time: tiempo de bloqueo por tareas largas del hilo principal, en milisegundos.",
                  ),
                ],
                [
                  "Speed Index",
                  l(
                    "How quickly visible content is populated. Displayed in seconds, like FCP and LCP.",
                    "Rapidez con la que se completa el contenido visible. Se muestra en segundos, igual que FCP y LCP.",
                  ),
                ],
              ].map(([label, description]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold">{label}</dt>
                  <dd className="mt-2 text-xs leading-6 text-muted-foreground">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      </section>

      {snapshots.length > 1 && (
        <section
          className={cn(container, "py-12")}
          aria-labelledby="quality-history-title"
        >
          <h2
            id="quality-history-title"
            className="font-editorial text-3xl font-normal tracking-tight"
          >
            {l("The record, over time.", "El registro a lo largo del tiempo.")}
          </h2>
          <div className="mt-6 space-y-4">
            {snapshots.slice(1).map((snapshot) => (
              <details
                key={snapshot.id}
                className="group rounded-xl border border-border bg-surface"
              >
                <summary className="flex min-h-14 list-none flex-wrap items-center justify-between gap-3 rounded-xl px-5 py-4 text-xs [&::-webkit-details-marker]:hidden">
                  <span className="font-semibold">
                    {snapshotDate(snapshot, locale)}
                  </span>
                  <span className="ml-auto text-muted-foreground">
                    v{snapshot.version}
                  </span>
                  <ChevronDown
                    className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </summary>
                <div className="min-w-0 border-t border-border p-4 sm:p-5">
                  <SnapshotContext
                    snapshot={snapshot}
                    locale={locale}
                    reportOrigin={reportOrigin(snapshot)}
                  />
                  <SnapshotTable
                    snapshot={snapshot}
                    locale={locale}
                    reportOrigin={reportOrigin(snapshot)}
                  />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <section
        className={cn(container, "py-12 sm:py-16")}
        aria-labelledby="quality-sponsors-title"
      >
        <div
          className={cn(
            styles.surface,
            styles.support,
            "grid gap-7 rounded-2xl p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center",
          )}
        >
          <div>
            <p className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Heart className="size-3.5" aria-hidden="true" />
              {l("Made in the open", "Creado en abierto")}
            </p>
            <h2
              id="quality-sponsors-title"
              className="font-editorial text-3xl font-normal tracking-tight sm:text-4xl"
            >
              {l(
                "Help the craft keep growing.",
                "Ayuda a que el proyecto siga creciendo.",
              )}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              {l(
                "Support the maintainer behind Aureform UI through their personal GitHub Sponsors profile. The kit and its documentation remain open under Apache 2.0.",
                "Apoya al mantenedor de Aureform UI desde su perfil personal de GitHub Sponsors. El kit y su documentación siguen abiertos bajo Apache 2.0.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 lg:flex-col lg:items-start">
            <a
              href={sponsorsUrl}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover motion-reduce:transition-none"
            >
              <Heart className="size-4" aria-hidden="true" />
              {l("Support the maintainer", "Apoyar al mantenedor")}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
            <a
              href={publicPath(localizedSitePath(locale, "docs"))}
              className="inline-flex min-h-10 items-center gap-2 rounded text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {l("Explore the documentation", "Explorar la documentación")}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function snapshotDate(snapshot: QualitySnapshot, locale: Locale) {
  return (
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(snapshot.createdAt)) + " UTC"
  );
}

function SnapshotContext({
  snapshot,
  locale,
  reportOrigin,
}: {
  snapshot: QualitySnapshot;
  locale: Locale;
  reportOrigin?: string;
}) {
  const l = (en: string, es: string) => (locale === "es" ? es : en);
  return (
    <div className="mb-6 rounded-xl border border-border bg-surface px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2 text-xs">
        <p className="min-w-0 break-words font-semibold">
          v{snapshot.version}{" "}
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-normal text-muted-foreground">
            {snapshot.targetOrigin}
          </span>
        </p>
        <a
          href={`${githubUrl}/tree/${snapshot.sourceCommit}/src`}
          className={reportLink}
        >
          {l("Audited source on GitHub", "Código auditado en GitHub")}
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </a>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-border pt-4 text-[11px] sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Node", snapshot.environment.node],
          ["Lighthouse", snapshot.environment.lighthouse],
          ["Chrome", snapshot.environment.chrome],
          [l("Platform", "Plataforma"), snapshot.environment.platform],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words font-medium">{value}</dd>
          </div>
        ))}
        <div>
          <dt className="text-muted-foreground">
            {l("Source commit", "Commit del código")}
          </dt>
          <dd className="mt-1">
            <a
              href={`${githubUrl}/commit/${snapshot.sourceCommit}`}
              className="rounded font-mono font-medium underline decoration-primary/40 underline-offset-4 hover:text-primary"
            >
              {snapshot.sourceCommit.slice(0, 12)}
            </a>
          </dd>
        </div>
      </dl>
      {reportOrigin && (
        <p className="mt-4 text-xs leading-6 text-muted-foreground">
          {l(
            "Original reports are hosted on ",
            "Los informes originales están alojados en ",
          )}
          <span className="font-medium">{new URL(reportOrigin).hostname}</span>.
        </p>
      )}
    </div>
  );
}

function SnapshotTable({
  snapshot,
  locale,
  reportOrigin,
}: {
  snapshot?: QualitySnapshot;
  locale: Locale;
  reportOrigin?: string;
}) {
  const l = (en: string, es: string) => (locale === "es" ? es : en);
  const routes: Record<QualityRoute, string> = {
    landing: l("Landing", "Landing"),
    documentation: l("Documentation", "Documentación"),
    dashboard: l("Dashboard demo", "Demo de dashboard"),
  };
  const categories: Record<QualityCategory, string> = {
    performance: l("Performance", "Rendimiento"),
    accessibility: l("Accessibility", "Accesibilidad"),
    "best-practices": l("Best practices", "Buenas prácticas"),
    seo: "SEO",
  };
  const prefix = `quality-${snapshot?.id ?? "pending"}`;
  const unmeasured = l("Not measured", "Sin medición");
  return (
    <table className={styles.matrix} role="table">
      <caption className="sr-only">
        {l(
          "Lighthouse median category scores and lab metrics for all six route/profile pairs.",
          "Medianas de categorías y métricas de laboratorio de Lighthouse para las seis combinaciones de ruta y perfil.",
        )}
      </caption>
      <thead className={styles.matrixHead}>
        <tr role="row">
          <th id={`${prefix}-route`} scope="col" role="columnheader">
            {l("Route / profile", "Ruta / perfil")}
          </th>
          {qualityCategories.map((category) => (
            <th
              key={category}
              id={`${prefix}-${category}`}
              scope="col"
              role="columnheader"
            >
              {categories[category]}
            </th>
          ))}
          {qualityMetrics.map((metric) => (
            <th
              key={metric}
              id={`${prefix}-${metric}`}
              scope="col"
              role="columnheader"
            >
              {metricLabels[metric]}
            </th>
          ))}
          <th id={`${prefix}-reports`} scope="col" role="columnheader">
            {l("Reports", "Informes")}
          </th>
        </tr>
      </thead>
      <tbody className={styles.matrixBody}>
        {qualityRows(snapshot).map(({ route, profile, result }) => {
          const rowId = `${prefix}-${route}-${profile}`;
          return (
            <tr
              key={`${route}-${profile}`}
              role="row"
              data-quality-route={route}
              data-quality-profile={profile}
              data-quality-status={result ? "recorded" : "unmeasured"}
            >
              <th id={rowId} scope="row" role="rowheader">
                <span className="block text-xs font-semibold">
                  {routes[route]}
                </span>
                <span className="mt-1.5 block text-[10px] font-medium text-muted-foreground">
                  {profile === "mobile"
                    ? l("Mobile", "Móvil")
                    : l("Desktop", "Escritorio")}
                </span>
                <code className="mt-2 block break-all text-[10px] font-normal text-muted-foreground">
                  {result?.pathname ?? qualityRoutePaths[route]}
                </code>
              </th>
              {qualityCategories.map((category) => {
                const value = result?.scores[category];
                return (
                  <td
                    key={category}
                    role="cell"
                    headers={`${rowId} ${prefix}-${category}`}
                    data-label={categories[category]}
                  >
                    <span
                      className={
                        value == null ? styles.unmeasured : styles.score
                      }
                      aria-label={value == null ? unmeasured : undefined}
                    >
                      {value == null
                        ? "—"
                        : new Intl.NumberFormat(locale, {
                            maximumFractionDigits: 1,
                          }).format(value)}
                    </span>
                  </td>
                );
              })}
              {qualityMetrics.map((metric) => {
                const value = result?.metrics[metric];
                return (
                  <td
                    key={metric}
                    role="cell"
                    headers={`${rowId} ${prefix}-${metric}`}
                    data-label={metricLabels[metric]}
                  >
                    <span
                      className={value == null ? styles.unmeasured : undefined}
                      aria-label={value == null ? unmeasured : undefined}
                    >
                      {value == null
                        ? "—"
                        : formatQualityMetric(value, metric, locale)}
                    </span>
                  </td>
                );
              })}
              <td
                role="cell"
                headers={`${rowId} ${prefix}-reports`}
                data-label={l("Reports", "Informes")}
                className={styles.reportCell}
              >
                {snapshot && result ? (
                  <details className={styles.reports}>
                    <summary>
                      {result.runs.length} {l("runs", "ejecuciones")}
                    </summary>
                    <ol className="mt-2 space-y-3">
                      {result.runs.map((run) => (
                        <li key={run.id}>
                          <p className="break-all text-[10px] font-medium">
                            {run.id}
                          </p>
                          <div className="flex flex-wrap gap-x-3">
                            <a
                              href={publicPath(
                                qualityReportUrl(
                                  snapshot,
                                  run.html,
                                  reportOrigin,
                                ),
                              )}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              aria-label={`${routes[route]} · ${profile} · ${run.id} · HTML ${l("report (opens in a new tab)", "informe (abre en una pestaña nueva)")}`}
                              className={reportLink}
                            >
                              HTML{" "}
                              <ArrowUpRight
                                className="size-3"
                                aria-hidden="true"
                              />
                            </a>
                            <a
                              href={publicPath(
                                qualityReportUrl(
                                  snapshot,
                                  run.json,
                                  reportOrigin,
                                ),
                              )}
                              download={reportOrigin ? undefined : true}
                              target={reportOrigin ? "_blank" : undefined}
                              rel={
                                reportOrigin
                                  ? "noopener noreferrer nofollow"
                                  : "nofollow"
                              }
                              aria-label={`${routes[route]} · ${profile} · ${run.id} · JSON${reportOrigin ? ` · ${l("report (opens in a new tab)", "informe (abre en una pestaña nueva)")}` : ""}`}
                              className={reportLink}
                            >
                              JSON
                            </a>
                          </div>
                          <details className="text-[10px] text-muted-foreground">
                            <summary className="py-2">SHA-256</summary>
                            <dl className="space-y-2 pb-2">
                              <div>
                                <dt>HTML</dt>
                                <dd className="mt-1 break-all font-mono">
                                  {run.sha256.html}
                                </dd>
                              </div>
                              <div>
                                <dt>JSON</dt>
                                <dd className="mt-1 break-all font-mono">
                                  {run.sha256.json}
                                </dd>
                              </div>
                            </dl>
                          </details>
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : (
                  <span className="text-[10px] leading-5 text-muted-foreground">
                    {l("No reports yet", "Aún sin informes")}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
