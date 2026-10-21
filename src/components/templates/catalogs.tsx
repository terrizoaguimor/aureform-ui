"use client";
import { publicPath } from "@/lib/public-path";
import { useState } from "react";
import {
  ArrowUpRight,
  Copy,
  Check,
  Search,
  Download,
  SlidersHorizontal,
  Layers,
  DollarSign,
  Users,
  Activity,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useCopy } from "@/hooks/use-copy";
import { useAppearance } from "@/components/appearance-provider";
import { useWorkspace } from "@/components/workspace-provider";
import { PalettePicker } from "@/components/appearance-controls";
import { exportConfiguredExample } from "@/lib/appearance";
import { PageHeading } from "@/components/blocks/page-heading";
import { MetricCard } from "@/components/blocks/metric-card";
import { RevenuePanel } from "@/components/blocks/revenue-panel";
import { PlanBreakdown } from "@/components/blocks/plan-breakdown";
import { CustomerTable } from "@/components/blocks/customer-table";
import { AIComposer } from "@/components/blocks/ai-composer";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Chart,
  type ChartAppearance,
  type ChartDatum,
  type ChartKind,
  type ChartSeries,
} from "@/components/ui/chart";
import { Empty } from "@/components/ui/empty";
import { customersSeed, revenueData } from "@/demo/dashboard-data";
import { getDemoCustomerAvatarSrc } from "@/demo/avatar-assets";
import { routes } from "@/lib/catalog";
import type { ShellLayout } from "@/components/blocks/dashboard-shell";
import { cn, csv, downloadText } from "@/lib/utils";
export function ChartsTemplate() {
  const { l, locale, currency, number } = useLanguage(),
    [period, setPeriod] = useState("6m"),
    [finish, setFinish] = useState<ChartAppearance>("glow"),
    [visibleSeries, setVisibleSeries] = useState<ChartSeries[]>([
      "value",
      "secondary",
      "tertiary",
    ]);
  const periodName =
    period === "month"
      ? l("This month", "Este mes")
      : period === "year"
        ? l("This year", "Este año")
        : l("Last 6 months", "Últimos 6 meses");
  const months = [
    l("Jan", "Ene"),
    l("Feb", "Feb"),
    l("Mar", "Mar"),
    l("Apr", "Abr"),
    l("May", "May"),
    l("Jun", "Jun"),
    l("Jul", "Jul"),
    l("Aug", "Ago"),
    l("Sep", "Sep"),
    l("Oct", "Oct"),
    l("Nov", "Nov"),
    l("Dec", "Dic"),
  ];
  const base =
    period === "month"
      ? revenueData.slice(2).map((item, index) => ({
          ...item,
          label: l(`Week ${index + 1}`, `Sem. ${index + 1}`),
          value: Math.round(item.value / 4),
          secondary: Math.round((item.secondary ?? 0) / 4),
        }))
      : period === "year"
        ? Array.from({ length: 12 }, (_, index) => {
            const seed = revenueData[index % revenueData.length];
            const factor = 0.68 + index * 0.062;
            return {
              label: months[index],
              value: Math.round(seed.value * factor),
              secondary: Math.round((seed.secondary ?? 0) * factor),
            };
          })
        : revenueData.map((item, index) => ({
            ...item,
            label: months[index + 4],
          }));
  const data: ChartDatum[] = base.map((item, index) => ({
    label: item.label,
    value: item.value,
    secondary: Math.round((item.secondary ?? 0) * 0.56),
    tertiary: Math.round(item.value * (0.16 + (index % 3) * 0.035)),
  }));
  const seriesNames = {
    value: l("Product", "Producto"),
    secondary: l("Services", "Servicios"),
    tertiary: l("Expansion", "Expansión"),
  };
  const periodOffset = period === "month" ? -9 : period === "year" ? 7 : 0;
  const targets: ChartDatum[] = [
    { label: l("Activation", "Activación"), value: 82 + periodOffset },
    { label: l("Retention", "Retención"), value: 74 + periodOffset },
    { label: l("Revenue", "Ingresos"), value: 91 + periodOffset },
    { label: l("Quality", "Calidad"), value: 68 + periodOffset },
  ];
  const diverging = data.map((item, index) => ({
    ...item,
    secondary: -Math.round((item.secondary ?? 0) * (0.8 + (index % 2) * 0.2)),
    tertiary: -Math.round((item.tertiary ?? 0) * 0.65),
  }));
  const heatmap = data.map((item, index) => ({
    label: item.label,
    value: Math.round(item.value / 180 + (index % 3) * 14),
    secondary: Math.round((item.secondary ?? 0) / 130),
    tertiary: Math.round((item.tertiary ?? 0) / 60),
  }));
  const allSeries: ChartSeries[] = ["value", "secondary", "tertiary"];
  const total = data.reduce(
    (sum, item) =>
      sum +
      allSeries.reduce(
        (subtotal, key) =>
          subtotal + (visibleSeries.includes(key) ? (item[key] ?? 0) : 0),
        0,
      ),
    0,
  );
  const families: {
    kind: ChartKind;
    name: string;
    description: string;
    dataset?: "targets" | "diverging" | "heatmap" | "gauge";
  }[] = [
    {
      kind: "area",
      name: l("Revenue flow", "Flujo de ingresos"),
      description: l("Every rise, in context.", "Cada avance, en contexto."),
    },
    {
      kind: "line",
      name: l("Growth signals", "Señales de crecimiento"),
      description: l(
        "Three paths. One clear view.",
        "Tres recorridos. Una vista clara.",
      ),
    },
    {
      kind: "bar",
      name: l("Period comparison", "Comparación de períodos"),
      description: l(
        "Compare the parts side by side.",
        "Compara cada parte en paralelo.",
      ),
    },
    {
      kind: "pie",
      name: l("Revenue share", "Distribución de ingresos"),
      description: l(
        "The contribution of each period.",
        "La contribución de cada período.",
      ),
    },
    {
      kind: "radar",
      name: l("Performance shape", "Perfil de rendimiento"),
      description: l(
        "Discover where each series leads.",
        "Descubre dónde destaca cada serie.",
      ),
    },
    {
      kind: "radial",
      name: l("Goal orbit", "Órbita de objetivos"),
      description: l(
        "Four goals, moving forward.",
        "Cuatro objetivos que avanzan.",
      ),
      dataset: "targets",
    },
    {
      kind: "horizontal-bar",
      name: l("Revenue ranking", "Ranking de ingresos"),
      description: l(
        "Room for labels and comparisons.",
        "Espacio para etiquetas y comparaciones.",
      ),
    },
    {
      kind: "stacked-bar",
      name: l("Revenue mix", "Composición de ingresos"),
      description: l(
        "See how the total comes together.",
        "Mira cómo se compone el total.",
      ),
    },
    {
      kind: "stacked-area",
      name: l("Cumulative momentum", "Impulso acumulado"),
      description: l(
        "The whole story, layer by layer.",
        "La historia completa, capa a capa.",
      ),
    },
    {
      kind: "diverging-bar",
      name: l("Net movement", "Movimiento neto"),
      description: l(
        "Gains above zero. Costs below.",
        "Ingresos sobre cero. Costos debajo.",
      ),
      dataset: "diverging",
    },
    {
      kind: "gauge",
      name: l("Activation pulse", "Pulso de activación"),
      description: l(
        "A focused view of the next goal.",
        "Una vista centrada en el próximo objetivo.",
      ),
      dataset: "gauge",
    },
    {
      kind: "rings",
      name: l("Progress rings", "Anillos de progreso"),
      description: l(
        "Independent goals. Shared momentum.",
        "Objetivos independientes. Un mismo impulso.",
      ),
      dataset: "targets",
    },
    {
      kind: "heatmap",
      name: l("Activity spectrum", "Espectro de actividad"),
      description: l(
        "Find the busiest moments at a glance.",
        "Encuentra los momentos más activos.",
      ),
      dataset: "heatmap",
    },
  ];
  return (
    <div className="grid min-w-0 gap-7">
      <PageHeading
        eyebrow={l("The data collection", "La colección de datos")}
        title={l(
          "Data with a little electricity.",
          "Datos con un poco de electricidad.",
        )}
        description={l(
          "Thirteen expressive views. Explore real values, switch periods and make every series your own.",
          "Trece vistas expresivas. Explora valores reales, cambia de período y personaliza cada serie.",
        )}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadText("chart-demo.csv", csv(data), "text/csv")
            }
          >
            <Download aria-hidden="true" />
            {l("Export data", "Exportar datos")}
          </Button>
        }
      />
      <Card
        appearance="glass"
        className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_1.05fr]"
      >
        <div className="grid min-w-0 gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge appearance="soft">
              {l("13 chart types", "13 tipos de gráfico")}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {l("Illustrative data · USD", "Datos ilustrativos · USD")}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={l("Chart period", "Período del gráfico")}
              value={period}
              onValueChange={setPeriod}
              options={[
                { value: "month", label: l("This month", "Este mes") },
                { value: "6m", label: l("Last 6 months", "Últimos 6 meses") },
                { value: "year", label: l("This year", "Este año") },
              ]}
            />
            <Select
              label={l("Chart finish", "Acabado del gráfico")}
              value={finish}
              onValueChange={(value) => setFinish(value as ChartAppearance)}
              options={[
                { value: "flat", label: l("Flat", "Plano") },
                { value: "gradient", label: l("Gradient", "Degradado") },
                { value: "glow", label: l("Glow", "Resplandor") },
              ]}
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold">
              {l("Revenue series", "Series de ingresos")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {allSeries.map((key, index) => {
                const selected = visibleSeries.includes(key);
                return (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    aria-pressed={selected}
                    disabled={selected && visibleSeries.length === 1}
                    onClick={() =>
                      setVisibleSeries((current) =>
                        selected
                          ? current.filter((item) => item !== key)
                          : [...current, key],
                      )
                    }
                    className={cn(
                      "gap-2",
                      selected &&
                        "border-primary/40 bg-accent text-accent-foreground",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full"
                      style={{ background: `var(--chart-${index + 1})` }}
                    />
                    {seriesNames[key]}
                  </Button>
                );
              })}
            </div>
          </fieldset>
        </div>
        <PalettePicker compact />
      </Card>
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[11px] text-muted-foreground">{periodName}</p>
          <p
            className="mt-1 text-2xl font-semibold tracking-tight tabular-nums"
            role="status"
          >
            {currency(total)}
            <span className="ml-2 text-[11px] font-normal tracking-normal text-muted-foreground">
              {l("selected revenue", "ingresos seleccionados")}
            </span>
          </p>
        </div>
        <p className="max-w-sm text-[11px] leading-5 text-muted-foreground">
          {l(
            "Select a legend to hide a series. Focus or hover a value to inspect it. Every view includes its data.",
            "Selecciona una leyenda para ocultar una serie. Enfoca un valor o pasa el cursor para verlo. Cada vista incluye sus datos.",
          )}
        </p>
      </div>
      <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        {families.map((family, index) => {
          const progress =
            family.dataset === "targets" || family.dataset === "gauge";
          const dataset =
            family.dataset === "targets"
              ? targets
              : family.dataset === "gauge"
                ? targets.slice(0, 1)
                : family.dataset === "diverging"
                  ? diverging
                  : family.dataset === "heatmap"
                    ? heatmap
                    : data;
          const names = progress
            ? { value: l("Progress", "Progreso"), secondary: "", tertiary: "" }
            : family.dataset === "diverging"
              ? {
                  value: l("Revenue", "Ingresos"),
                  secondary: l("Operations", "Operaciones"),
                  tertiary: l("Acquisition", "Adquisición"),
                }
              : seriesNames;
          const format = progress
            ? (value: number) => `${number(value)}%`
            : family.dataset === "heatmap"
              ? (value: number) => number(value)
              : currency;
          const metric = progress
            ? `${number(Math.round(dataset.reduce((sum, item) => sum + item.value, 0) / dataset.length))}%`
            : format(dataset.reduce((sum, item) => sum + item.value, 0));
          const label = `${family.name} · ${periodName}`;
          const tableKeys =
            progress || family.kind === "pie" ? ["value" as const] : allSeries;
          return (
            <Card
              key={family.kind}
              appearance="glass"
              data-chart-kind={family.kind}
              className="min-w-0 overflow-hidden"
            >
              <CardHeader className="gap-2 px-5 pt-5 pb-0">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-[13px]">{family.name}</CardTitle>
                  <span
                    aria-hidden="true"
                    className="font-mono text-[10px] text-muted-foreground"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <CardDescription className="text-[11px] leading-5">
                  {family.description}
                </CardDescription>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xl font-semibold tracking-tight tabular-nums">
                    {metric}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {progress
                      ? l("of goal", "del objetivo")
                      : family.dataset === "heatmap"
                        ? l("product events", "eventos de producto")
                        : family.kind === "pie"
                          ? l("period total", "total del período")
                          : l("product revenue", "ingresos de producto")}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pt-4 pb-0">
                <Chart
                  key={`${family.kind}-${period}-${visibleSeries.join("-")}`}
                  kind={family.kind}
                  data={dataset}
                  label={label}
                  valueLabel={names.value}
                  secondaryLabel={names.secondary}
                  tertiaryLabel={names.tertiary}
                  visibleSeries={
                    progress || family.kind === "pie"
                      ? undefined
                      : visibleSeries
                  }
                  legend={family.kind !== "gauge"}
                  appearance={finish}
                  locale={locale}
                  maxValue={progress ? 100 : undefined}
                  valueFormatter={format}
                  axisValueFormatter={(value) =>
                    number(value, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })
                  }
                  height={
                    family.kind === "horizontal-bar" && period === "year"
                      ? 320
                      : family.kind === "heatmap" && period === "year"
                        ? 320
                        : 210
                  }
                />
              </CardContent>
              <details className="mt-4 border-t border-border/65 px-5 py-3 text-[11px]">
                <summary className="cursor-pointer rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                  {l("View data", "Ver datos")} · <code>{family.kind}</code>
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-[10px] tabular-nums">
                    <caption className="sr-only">{label}</caption>
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th scope="col" className="py-2 pr-3 font-medium">
                          {l("Period / goal", "Período / objetivo")}
                        </th>
                        {tableKeys.map((key) => (
                          <th
                            key={key}
                            scope="col"
                            className="px-2 py-2 text-right font-medium"
                          >
                            {names[key]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataset.map((item) => (
                        <tr
                          key={item.label}
                          className="border-b border-border/40 last:border-0"
                        >
                          <th scope="row" className="py-2 pr-3 font-medium">
                            {item.label}
                          </th>
                          {tableKeys.map((key) => (
                            <td
                              key={key}
                              className="px-2 py-2 text-right whitespace-nowrap"
                            >
                              {format(item[key] ?? 0)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
export function TemplatesTemplate() {
  const { l, locale, common: t } = useLanguage(),
    [query, setQuery] = useState(""),
    [group, setGroup] = useState("all");
  const { appearance } = useAppearance();
  const { customers } = useWorkspace();
  const groups = [
    ["all", l("All templates", "Todas las plantillas")],
    ["dashboard", l("Dashboards", "Dashboards")],
    ["application", l("Applications", "Aplicaciones")],
    ["ai", l("AI", "IA")],
    ["data", l("Commerce & CRM", "Comercio y CRM")],
    ["settings", t("settings")],
    ["auth", l("Authentication", "Autenticación")],
    ["auxiliary", l("Auxiliary", "Auxiliares")],
  ];
  const visible = routes.filter(
    (route) =>
      route.group !== "catalog" &&
      !route.path.startsWith("integrations") &&
      (group === "all" || route.group === group) &&
      `${route[locale]} ${route.path}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="grid min-w-0 gap-7">
      <PageHeading
        eyebrow={l(
          "The application collection",
          "La colección de aplicaciones",
        )}
        title={l(
          "A head start for ambitious products.",
          "Un impulso para productos ambiciosos.",
        )}
        description={l(
          "Explore complete local application screens. Open a preview to experience your current palette, materials and effects.",
          "Explora pantallas completas de aplicaciones locales. Abre una vista previa para ver tu paleta, materiales y efectos actuales.",
        )}
        actions={
          <>
            <a
              href={publicPath(`/${locale}/integrations/`)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ArrowUpRight aria-hidden="true" />
              {l("Integration workflows", "Flujos de integración")}
            </a>
            <a
              href={publicPath(`/${locale}/studio/`)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <SlidersHorizontal aria-hidden="true" />
              {l("Appearance Studio", "Estudio de apariencia")}
            </a>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-surface/55 p-3">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label={l("Search templates", "Buscar plantillas")}
            placeholder={l(
              "Find a starting point…",
              "Busca un punto de partida…",
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          aria-label={l("Template category", "Categoría de plantilla")}
          value={group}
          onValueChange={setGroup}
          className="w-full sm:w-48"
          options={groups.map(([value, label]) => ({ value, label }))}
        />
        <span
          role="status"
          className="ml-auto px-2 text-[12px] text-muted-foreground tabular-nums"
        >
          {visible.length} {l("templates", "plantillas")}
        </span>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-5 text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-chart-2"
          />
          {l("Saved screen previews", "Vistas previas guardadas")}
        </span>
        <span className="hidden sm:inline" aria-hidden="true">
          /
        </span>
        <span>
          {l(
            "Full screens use your live configuration.",
            "Las pantallas completas usan tu configuración actual.",
          )}
        </span>
      </p>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((route) => (
          <a
            key={route.path}
            href={publicPath(
              `/${locale}/${route.path}/${route.path === "customers/detail" && customers[0] ? `?id=${encodeURIComponent(customers[0].id)}` : ""}`,
            )}
            className="af-card af-hover-card group min-w-0 overflow-hidden rounded-[var(--af-radius,16px)] border border-border bg-surface outline-none transition-colors hover:border-primary/45 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-surface-subtle">
              <img
                src={publicPath(
                  `/previews/${appearance.theme === "light" ? "light/" : ""}${route.path.replaceAll("/", "-")}.webp`,
                )}
                alt={l(`Preview of ${route.en}`, `Vista previa de ${route.es}`)}
                onError={(event) => {
                  const image = event.currentTarget;
                  const fallback = publicPath(
                    `/previews/${route.path.replaceAll("/", "-")}.webp`,
                  );
                  if (image.getAttribute("src") !== fallback) {
                    image.src = fallback;
                  }
                }}
                loading="lazy"
                width={640}
                height={400}
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transform-none"
              />
              <span className="absolute right-3 bottom-3 rounded-md border border-border bg-surface/95 px-2 py-1 text-[11px] font-medium text-foreground">
                {l("Saved preview", "Vista guardada")}
              </span>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[14px] leading-6 font-semibold tracking-tight">
                  {route[locale]}
                </h2>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-subtle/40 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                  {route.path}
                </span>
                <Badge variant="outline">
                  {l("Suite", "Suite")} {route.delivery}
                </Badge>
              </div>
            </div>
          </a>
        ))}
      </div>
      {!visible.length && (
        <Empty title={t("empty")} description={t("noMatch")} />
      )}
    </div>
  );
}
export function LayoutsTemplate({
  layout,
  onLayoutChange,
}: {
  layout: ShellLayout;
  onLayoutChange: (v: ShellLayout) => void;
}) {
  const { l, common: t } = useLanguage(),
    { copy, copied } = useCopy(),
    layouts: ShellLayout[] = [
      "sidebar",
      "compact",
      "topbar",
      "split",
      "centered",
      "floating",
    ];
  const names = [
    l("Classic sidebar", "Barra lateral clásica"),
    l("Compact navigation", "Navegación compacta"),
    l("Top navigation", "Navegación superior"),
    l("Split workspace", "Espacio dividido"),
    l("Centered content", "Contenido centrado"),
    l("Floating sidebar", "Barra lateral flotante"),
  ];
  const descriptions = [
    l(
      "A steady home for a growing product.",
      "Un espacio estable para un producto que crece.",
    ),
    l(
      "More room for the work in front of you.",
      "Más espacio para el trabajo que tienes delante.",
    ),
    l(
      "Navigation across the top. Space to explore.",
      "Navegación superior. Espacio para explorar.",
    ),
    l(
      "A wider rail for a connected workspace.",
      "Una barra amplia para un espacio conectado.",
    ),
    l(
      "A focused canvas with balanced margins.",
      "Un lienzo centrado con márgenes equilibrados.",
    ),
    l(
      "Layered navigation with a lighter feel.",
      "Navegación en capas con una sensación ligera.",
    ),
  ];
  const { appearance } = useAppearance();
  const code = exportConfiguredExample(
    `"use client";\n\nimport { Providers } from "@/components/providers";\nimport { DashboardShell } from "@/components/blocks/dashboard-shell";\nimport { MetricCard } from "@/components/blocks/metric-card";\nimport { PageHeading } from "@/components/blocks/page-heading";\n\nexport default function WorkspaceExample() {\n  return (\n    <Providers locale="en">\n      <DashboardShell path="dashboard" layout="${layout}">\n        <section className="grid gap-7">\n          <PageHeading title="Workspace overview" description="A local example of the selected layout." />\n          <div className="grid gap-4 sm:grid-cols-2">\n            <MetricCard label="Monthly revenue" value="$48,295" change="+12.8%" series={[12, 18, 15, 24, 22, 32]} />\n            <MetricCard label="Active customers" value="2,420" change="+8.2%" />\n          </div>\n        </section>\n      </DashboardShell>\n    </Providers>\n  );\n}\n`,
    appearance,
  );
  const copyLabel = copied
    ? l("Copied", "Copiado")
    : l("Copy source", "Copiar código");
  return (
    <div className="grid min-w-0 gap-7">
      <PageHeading
        eyebrow={l(
          "The workspace collection",
          "La colección de espacios de trabajo",
        )}
        title={l(
          "Find your product’s frame.",
          "Encuentra el marco de tu producto.",
        )}
        description={l(
          "Six distinct compositions. Choose one to reshape this workspace, with your palette and navigation intact.",
          "Seis composiciones distintas. Elige una para transformar este espacio con tu paleta y navegación.",
        )}
        actions={
          <Badge appearance="soft">
            <Layers aria-hidden="true" />
            {l("6 live layouts", "6 layouts en vivo")}
          </Badge>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {layouts.map((item, i) => (
          <button
            type="button"
            key={item}
            onClick={() => onLayoutChange(item)}
            aria-pressed={layout === item}
            className={cn(
              "af-card af-hover-card min-w-0 rounded-[var(--af-radius,16px)] border border-border bg-surface p-5 text-left outline-none hover:border-primary/45 focus-visible:ring-2 focus-visible:ring-ring",
              layout === item &&
                "border-primary/60 bg-accent/25 ring-1 ring-primary/20",
            )}
          >
            <div
              aria-hidden="true"
              className="relative mb-5 flex aspect-[16/9] gap-2 overflow-hidden rounded-xl border border-border bg-background bg-[image:var(--af-gradient-hero)] p-2.5"
            >
              {["sidebar", "compact", "split", "floating"].includes(item) && (
                <div
                  className={cn(
                    "flex shrink-0 flex-col gap-1.5 rounded-md border border-primary/15 bg-accent/65 p-1.5",
                    item === "compact"
                      ? "w-[9%]"
                      : item === "split"
                        ? "w-[28%]"
                        : "w-[18%]",
                    item === "floating" && "af-shadow-elevated my-2 rounded-lg",
                  )}
                >
                  <span className="mb-2 block size-2 rounded-sm bg-primary" />
                  <span className="h-2 rounded-sm bg-primary/60" />
                  <span className="h-2 rounded-sm bg-primary/15" />
                  <span className="h-2 rounded-sm bg-primary/15" />
                </div>
              )}
              <div className={cn("flex-1", item === "centered" && "mx-4")}>
                <div className="mb-3 flex h-3 items-center justify-between rounded bg-surface px-1.5">
                  <span className="h-1 w-8 rounded-full bg-muted-foreground/45" />
                  <span className="size-1.5 rounded-full bg-chart-2" />
                </div>
                {item === "topbar" && (
                  <div className="mb-2 flex h-3 gap-1 rounded bg-accent/70 p-1">
                    <span className="w-6 rounded-full bg-primary" />
                    <span className="w-4 rounded-full bg-muted-foreground/30" />
                  </div>
                )}
                <div className="mb-2 flex gap-2">
                  {[0, 1, 2].map((n) => (
                    <span
                      key={n}
                      className="flex h-7 flex-1 items-end rounded border border-border bg-surface p-1.5"
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1/2 rounded-full",
                          n === 0
                            ? "bg-chart-1/70"
                            : n === 1
                              ? "bg-chart-2/70"
                              : "bg-chart-3/70",
                        )}
                      />
                    </span>
                  ))}
                </div>
                <div className="flex h-13 items-end gap-1 rounded border border-border bg-surface p-2">
                  {[35, 55, 43, 70, 60, 85, 72, 94].map((height, n) => (
                    <span
                      key={n}
                      className="flex-1 rounded-t-sm bg-chart-1/35"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] leading-6 font-semibold tracking-tight">
                {names[i]}
              </h2>
              {layout === item && (
                <Check
                  aria-hidden="true"
                  className="size-4 shrink-0 text-primary"
                />
              )}
            </div>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              {descriptions[i]}
            </p>
            <p className="mt-3 font-mono text-[11px] text-primary">{`layout="${item}"`}</p>
          </button>
        ))}
      </div>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 border-b border-border/65">
          <div className="min-w-0 flex-1">
            <CardTitle>
              {l("One API. Six compositions.", "Una API. Seis composiciones.")}
            </CardTitle>
            <CardDescription>
              {l(
                "Copy a complete example with this layout and your current appearance settings.",
                "Copia un ejemplo completo con este layout y tus ajustes de apariencia actuales.",
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            aria-label={
              copied
                ? t("copied")
                : `${copyLabel}: ${l("layout example", "ejemplo de layout")}`
            }
            onClick={() => void copy(code)}
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
            {copyLabel}
          </Button>
        </CardHeader>
        <CardContent className="pt-5">
          <pre
            tabIndex={0}
            aria-label={l(
              "Configured workspace example",
              "Ejemplo de espacio configurado",
            )}
            className="max-h-96 overflow-auto rounded-xl border border-border bg-background p-5 font-mono text-[12px] leading-6 whitespace-pre-wrap break-words outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <code>{code}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
export function BlocksTemplate() {
  const { locale, l, common: t, currency, date } = useLanguage(),
    [prompt, setPrompt] = useState(""),
    [model, setModel] = useState<"balanced" | "precise" | "creative">(
      "balanced",
    ),
    [pending, setPending] = useState(false);
  const tableLabels = {
    title: l("Recent customers", "Clientes recientes"),
    viewAll: t("viewAll"),
    customer: l("Customer", "Cliente"),
    plan: "Plan",
    status: l("Status", "Estado"),
    amount: l("Amount", "Importe"),
    joined: l("Joined", "Registro"),
    active: l("Active", "Activo"),
    trial: l("Trial", "Prueba"),
    paused: l("Paused", "Pausado"),
    total: l("4 of 12 demo customers", "4 de 12 clientes de ejemplo"),
  };
  const source = (file: string) =>
    `node bin/aureform.mjs add ${file} --cwd ../my-app`;
  const blockHeader = (name: string, file: string) => (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2.5 text-[15px] leading-6 font-semibold tracking-tight">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-lg border border-primary/20 bg-accent/55 text-primary"
        >
          <Layers className="size-3.5" />
        </span>
        {name}
      </h2>
      <CopyCommand command={source(file)} />
    </div>
  );
  return (
    <div className="grid min-w-0 grid-cols-1 gap-9">
      <PageHeading
        eyebrow={l("The building blocks", "Los bloques de construcción")}
        title={l(
          "Assemble your next workspace.",
          "Construye tu próximo espacio.",
        )}
        description={l(
          "Reusable compositions built from the source components. Copy one block and its dependencies with the CLI.",
          "Composiciones reutilizables hechas con los componentes del kit. Copia un bloque y sus dependencias con el CLI.",
        )}
      />
      <section aria-label={l("Application blocks", "Bloques de aplicaciones")}>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h2 className="text-[15px] font-semibold">
            {l(
              "Applications that work together",
              "Aplicaciones que trabajan juntas",
            )}
          </h2>
          <Badge appearance="gradient">1.4</Badge>
        </div>
        <p className="mb-5 max-w-3xl text-[13px] leading-6 text-muted-foreground">
          {l(
            "Explore the mock workflows, copy their source and connect your own services through the documented adapters.",
            "Explora los flujos mock, copia su código y conecta tus servicios mediante los adaptadores documentados.",
          )}
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              name: "ProductsManager",
              install: "product-manager",
              path: "products",
              description: l(
                "A catalog with product details, pricing, inventory and a live editor preview.",
                "Un catálogo con detalles, precios, inventario y vista previa del editor.",
              ),
            },
            {
              name: "ProductImageEditor",
              install: "product-image-editor",
              path: "products",
              description: l(
                "Upload, crop, rotate and organize images with accessible alternatives.",
                "Carga, recorta, rota y organiza imágenes con texto alternativo.",
              ),
            },
            {
              name: "CommerceWorkspace",
              install: "commerce-workspace",
              path: "orders",
              description: l(
                "Shared orders and invoices with line items, checkout previews and stock updates.",
                "Pedidos y facturas conectados con artículos, pagos de ejemplo y existencias.",
              ),
            },
            {
              name: "CommerceBilling",
              install: "commerce-billing",
              path: "settings/billing",
              description: l(
                "Subscriptions, plan changes, invoice history and a customer portal preview.",
                "Suscripciones, cambios de plan, historial y vista previa del portal del cliente.",
              ),
            },
            {
              name: "MapsWorkspace",
              install: "maps-workspace",
              path: "maps",
              description: l(
                "Local routes, search, layers and optional Google Maps configuration.",
                "Rutas locales, búsqueda, capas y configuración opcional de Google Maps.",
              ),
            },
            {
              name: "SoftphoneWorkspace",
              install: "softphone-workspace",
              path: "softphone",
              description: l(
                "Inbound calls, a FIFO queue, business hours and a replaceable voice adapter.",
                "Llamadas entrantes, cola FIFO, horarios y un adaptador de voz sustituible.",
              ),
            },
            {
              name: "SocialAuth",
              install: "social-auth",
              path: "auth/sign-in",
              description: l(
                "Google, GitHub and Microsoft mock access with replaceable callbacks.",
                "Acceso mock con Google, GitHub y Microsoft y callbacks sustituibles.",
              ),
            },
          ].map((block) => (
            <Card
              key={block.install}
              appearance="glass"
              className="af-hover-card min-w-0"
            >
              <CardHeader>
                <CardTitle className="text-sm">{block.name}</CardTitle>
                <CardDescription>{block.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <CopyCommand command={source(block.install)} />
                <a
                  href={publicPath(`/${locale}/${block.path}/`)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {l(
                    "Explore the working example",
                    "Explorar el ejemplo funcional",
                  )}
                  <ArrowUpRight aria-hidden className="size-3.5" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section
        aria-label={l("SaaS operations blocks", "Bloques de operaciones SaaS")}
      >
        <div className="mb-5 flex items-center gap-3">
          <h2 className="text-[15px] font-semibold">
            {l(
              "From first setup to daily operations",
              "Del primer paso al trabajo diario",
            )}
          </h2>
          <Badge variant="outline">1.2</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              name: "OnboardingFlow",
              install: "onboarding-flow",
              path: "onboarding",
              description: l(
                "Four steps, validation and a resumable draft.",
                "Cuatro pasos, validación y un borrador que puedes retomar.",
              ),
            },
            {
              name: "WorkspaceStatus",
              install: "workspace-status",
              path: "settings/workspace",
              description: l(
                "Workspace scope, demo roles and storage recovery.",
                "Espacio activo, roles de ejemplo y recuperación del almacenamiento.",
              ),
            },
            {
              name: "MemberManagement",
              install: "member-management",
              path: "settings/team",
              description: l(
                "Invitations, roles and protected ownership transfer.",
                "Invitaciones, roles y transferencia protegida del titular.",
              ),
            },
            {
              name: "DataWorkbench",
              install: "data-workbench",
              path: "customers",
              description: l(
                "AND filters, saved views and external pagination.",
                "Filtros AND, vistas guardadas y paginación externa.",
              ),
            },
            {
              name: "GenericRecordDetail",
              install: "record-detail",
              path: "customers",
              description: l(
                "A record shell with activity, notes and related data.",
                "Un marco de registro con actividad, notas y datos relacionados.",
              ),
            },
            {
              name: "ImportWizard",
              install: "import-wizard",
              path: "imports",
              description: l(
                "CSV mapping, validation, duplicates and cancellation.",
                "Mapeo CSV, validación, duplicados y cancelación.",
              ),
            },
          ].map((block) => (
            <Card
              key={block.install}
              appearance="glass"
              className="af-hover-card min-w-0"
            >
              <CardHeader>
                <CardTitle className="text-sm">{block.name}</CardTitle>
                <CardDescription>{block.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <CopyCommand command={source(block.install)} />
                <a
                  href={publicPath(`/${locale}/${block.path}/`)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {l(
                    "Explore the working example",
                    "Explorar el ejemplo funcional",
                  )}
                  <ArrowUpRight aria-hidden className="size-3.5" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section>
        {blockHeader("MetricCard", "metric-card")}
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label={l("Monthly revenue", "Ingresos mensuales")}
            value={currency(48295)}
            change="+12.8%"
            trend="up"
            note={l("vs. last month", "vs. mes anterior")}
            series={[12, 18, 15, 24, 22, 32]}
            icon={<DollarSign />}
          />
          <MetricCard
            label={l("Active customers", "Clientes activos")}
            value="2,420"
            change="+8.2%"
            trend="up"
            icon={<Users />}
          />
          <MetricCard
            label={l("Churn", "Cancelaciones")}
            value="1.24%"
            change="−2.1%"
            trend="down"
            icon={<Activity />}
          />
        </div>
      </section>
      <section>
        {blockHeader("RevenuePanel + PlanBreakdown", "revenue-panel")}
        <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
          <RevenuePanel
            title={l("Revenue overview", "Resumen de ingresos")}
            description={l(
              "A considered view of your progress.",
              "Una visión cuidada de tu progreso.",
            )}
            data={revenueData}
            valueLabel={l("Revenue", "Ingresos")}
            secondaryLabel={l("Previous", "Anterior")}
            label={l(
              "Illustrative revenue chart",
              "Gráfico de ingresos ilustrativos",
            )}
          />
          <PlanBreakdown
            title={l("Revenue by plan", "Ingresos por plan")}
            description={l(
              "Room to grow in every direction.",
              "Espacio para crecer en cada dirección.",
            )}
            items={[
              { name: "Enterprise", percentage: 53, value: currency(25596) },
              { name: "Pro", percentage: 34, value: currency(16420) },
              { name: "Starter", percentage: 13, value: currency(6279) },
            ]}
          />
        </div>
        <CopyCommand command={source("plan-breakdown")} className="mt-3" />
      </section>
      <section>
        {blockHeader("CustomerTable + CustomerDataTable", "customer-table")}
        <CustomerTable
          data={customersSeed.map((customer) => ({
            ...customer,
            avatarSrc: getDemoCustomerAvatarSrc("studio", customer.id),
          }))}
          labels={tableLabels}
          viewAllHref={`/${locale}/customers/`}
          formatCurrency={currency}
          formatDate={date}
        />
      </section>
      <section>
        {blockHeader("AIComposer", "ai-composer")}
        <AIComposer
          prompt={prompt}
          onPromptChange={setPrompt}
          model={model}
          onModelChange={(value) => setModel(value as typeof model)}
          pending={pending}
          onSend={() => {
            if (!prompt.trim()) return;
            setPending(true);
            setTimeout(() => {
              setPending(false);
              setPrompt("");
            }, 900);
          }}
          onCancel={() => setPending(false)}
          labels={{
            placeholder: l(
              "A little room for a new idea…",
              "Un poco de espacio para una idea nueva…",
            ),
            input: l("Message", "Mensaje"),
            send: l("Send message", "Enviar mensaje"),
            stop: l("Stop", "Detener"),
            model: l("Model", "Modelo"),
            attach: l("Attach file", "Adjuntar archivo"),
            balanced: l("Aureform · Balanced", "Aureform · Equilibrado"),
            precise: l("Aureform · Precise", "Aureform · Preciso"),
            creative: l("Aureform · Creative", "Aureform · Creativo"),
            attached: l("Attached", "Adjunto"),
          }}
        />
      </section>
      <section>
        {blockHeader("DashboardShell", "dashboard-shell")}
        <Card className="p-6">
          <p className="text-[13px] leading-7 text-muted-foreground">
            {l(
              "The shell around this page is the live example. Choose from six compositions in the layout gallery.",
              "La estructura de esta página es el ejemplo real. Elige entre seis composiciones en la galería de layouts.",
            )}
          </p>
          <a
            href={publicPath(`/${locale}/layouts/`)}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-4",
            )}
          >
            {l("Explore layouts", "Explorar layouts")}
            <ArrowUpRight />
          </a>
        </Card>
      </section>
      <section>
        {blockHeader("PageHeading", "page-heading")}
        <Card className="p-6">
          <PageHeading
            eyebrow={l("A clear beginning", "Un comienzo claro")}
            title={l("A good place to begin.", "Un buen lugar para empezar.")}
            description={l(
              "A shared hierarchy for every page.",
              "Una jerarquía compartida para cada página.",
            )}
            editorial
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadText(
                    "heading-example.tsx",
                    `<PageHeading title="A good place to begin." editorial />`,
                  )
                }
              >
                <Download />
                {l("Example", "Ejemplo")}
              </Button>
            }
          />
        </Card>
      </section>
      <section>
        {blockHeader("RouteMap", "route-map")}
        <Card className="p-6">
          <p className="text-[13px] leading-7 text-muted-foreground">
            {l(
              "An offline map block using MapLibre with an SVG fallback. View the working route example.",
              "Un bloque de mapa local con MapLibre y alternativa SVG. Abre el ejemplo funcional de rutas.",
            )}
          </p>
          <a
            href={publicPath(`/${locale}/maps/`)}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-4",
            )}
          >
            {l("Open map", "Abrir mapa")}
            <ArrowUpRight />
          </a>
        </Card>
      </section>
    </div>
  );
}
export function CopyCommand({
  command,
  className,
}: {
  command: string;
  className?: string;
}) {
  const { l } = useLanguage(),
    { copy, copied } = useCopy();
  return (
    <button
      type="button"
      aria-label={`${l("Copy command", "Copiar comando")}: ${command}`}
      onClick={() => void copy(command)}
      className={cn(
        "flex min-h-10 min-w-0 max-w-full items-center gap-3 rounded-lg border border-border bg-surface-subtle/55 px-3 py-2 text-left font-mono text-[12px] leading-5 text-muted-foreground outline-none transition-colors hover:border-primary/30 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span className="min-w-0 break-all">{command}</span>
      {copied ? (
        <Check className="size-3 shrink-0" />
      ) : (
        <Copy className="size-3 shrink-0" />
      )}
    </button>
  );
}
