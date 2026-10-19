"use client";
import { publicPath } from "@/lib/public-path";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  TrendingUp,
  Users,
  CreditCard,
  MousePointer2,
  ShoppingCart,
  Megaphone,
  Truck,
  DollarSign,
  Wallet,
  Handshake,
  Activity,
  ArrowDownRight,
  Sparkles,
  SlidersHorizontal,
  Package,
  ArrowRight,
  LampDesk,
  Armchair,
  NotebookPen,
} from "lucide-react";
import { toast } from "sonner";
import { MetricCard } from "@/components/blocks/metric-card";
import { PageHeading } from "@/components/blocks/page-heading";
import { RevenuePanel } from "@/components/blocks/revenue-panel";
import { PlanBreakdown } from "@/components/blocks/plan-breakdown";
import { CustomerTable } from "@/components/blocks/customer-table";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Chart, type ChartDatum } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/hooks/use-language";
import { useDemoStore } from "@/hooks/use-demo-store";
import { useAppearance } from "@/components/appearance-provider";
import {
  GradientBackground,
  ShaderBackground,
  GlowBorder,
} from "@/components/effects";
import { revenueData, channelData } from "@/demo/dashboard-data";
import { useWorkspace } from "@/components/workspace-provider";
import { entitySeeds } from "@/demo/entities";
import { getProductAsset } from "@/demo/product-assets";
import { getDemoCustomerAvatarSrc } from "@/demo/avatar-assets";
import { csv, downloadText } from "@/lib/utils";
type DashboardKind =
  | "dashboard"
  | "analytics"
  | "crm"
  | "ecommerce"
  | "sales"
  | "marketing"
  | "logistics"
  | "finance"
  | "stocks";
const profiles: Record<
  DashboardKind,
  {
    title: [string, string];
    description: [string, string];
    eyebrow: [string, string];
    metrics: {
      label: [string, string];
      value: number;
      type: "money" | "number" | "percent";
      change: string;
      icon: typeof TrendingUp;
    }[];
  }
> = {
  dashboard: {
    title: ["Your next growth chapter.", "Tu próxima etapa de crecimiento."],
    description: [
      "Revenue, customers and momentum. Your entire SaaS business, in focus.",
      "Ingresos, clientes y crecimiento. Todo tu negocio SaaS, en foco.",
    ],
    eyebrow: ["SaaS command center", "Centro de control SaaS"],
    metrics: [
      {
        label: ["Monthly revenue", "Ingresos mensuales"],
        value: 48295,
        type: "money",
        change: "+12.8%",
        icon: CreditCard,
      },
      {
        label: ["Active subscribers", "Suscriptores activos"],
        value: 2420,
        type: "number",
        change: "+8.2%",
        icon: Users,
      },
      {
        label: ["Conversion rate", "Tasa de conversión"],
        value: 4.82,
        type: "percent",
        change: "+1.3%",
        icon: MousePointer2,
      },
      {
        label: ["Churn rate", "Tasa de cancelación"],
        value: 1.24,
        type: "percent",
        change: "−2.1%",
        icon: Activity,
      },
    ],
  },
  analytics: {
    title: ["Every signal tells a story.", "Cada señal cuenta una historia."],
    description: [
      "Understand the people and paths behind your growth.",
      "Conoce a las personas y los recorridos detrás de tu crecimiento.",
    ],
    eyebrow: ["Product analytics", "Analítica de producto"],
    metrics: [
      {
        label: ["Total visitors", "Visitantes totales"],
        value: 128430,
        type: "number",
        change: "+18.4%",
        icon: Users,
      },
      {
        label: ["Page views", "Vistas de página"],
        value: 384210,
        type: "number",
        change: "+14.6%",
        icon: MousePointer2,
      },
      {
        label: ["Engagement rate", "Tasa de interacción"],
        value: 62.8,
        type: "percent",
        change: "+4.2%",
        icon: Activity,
      },
      {
        label: ["Conversion rate", "Tasa de conversión"],
        value: 4.82,
        type: "percent",
        change: "+1.3%",
        icon: TrendingUp,
      },
    ],
  },
  crm: {
    title: [
      "Relationships, with room to grow.",
      "Relaciones que pueden crecer.",
    ],
    description: [
      "A considered view of your customers and opportunities.",
      "Una visión clara de tus clientes y oportunidades.",
    ],
    eyebrow: ["Customer relationships", "Relaciones con clientes"],
    metrics: [
      {
        label: ["Pipeline value", "Valor del embudo"],
        value: 245800,
        type: "money",
        change: "+14.2%",
        icon: Handshake,
      },
      {
        label: ["Active leads", "Prospectos activos"],
        value: 384,
        type: "number",
        change: "+9.6%",
        icon: Users,
      },
      {
        label: ["Deals won", "Acuerdos cerrados"],
        value: 42,
        type: "number",
        change: "+16.7%",
        icon: TrendingUp,
      },
      {
        label: ["Win rate", "Tasa de cierre"],
        value: 32.4,
        type: "percent",
        change: "+3.8%",
        icon: Activity,
      },
    ],
  },
  ecommerce: {
    title: ["Your store. Full momentum.", "Tu tienda. Todo el impulso."],
    description: [
      "Connect your catalog, sales and fulfillment in one powerful view.",
      "Conecta tu catálogo, ventas y entregas en una sola vista.",
    ],
    eyebrow: ["Commerce overview", "Resumen de comercio"],
    metrics: [
      {
        label: ["Gross sales", "Ventas brutas"],
        value: 98240,
        type: "money",
        change: "+22.4%",
        icon: ShoppingCart,
      },
      {
        label: ["Orders", "Pedidos"],
        value: 1248,
        type: "number",
        change: "+12.3%",
        icon: CreditCard,
      },
      {
        label: ["Average order", "Pedido promedio"],
        value: 78.72,
        type: "money",
        change: "+8.1%",
        icon: DollarSign,
      },
      {
        label: ["Returning customers", "Clientes recurrentes"],
        value: 38.6,
        type: "percent",
        change: "+2.4%",
        icon: Users,
      },
    ],
  },
  sales: {
    title: [
      "A clearer path to your next win.",
      "Un camino claro al próximo logro.",
    ],
    description: [
      "Keep your sales momentum visible and your priorities close.",
      "Visualiza el ritmo de ventas y mantén cerca tus prioridades.",
    ],
    eyebrow: ["Sales performance", "Rendimiento de ventas"],
    metrics: [
      {
        label: ["Sales revenue", "Ingresos por ventas"],
        value: 185420,
        type: "money",
        change: "+16.3%",
        icon: Wallet,
      },
      {
        label: ["Deals closed", "Acuerdos cerrados"],
        value: 126,
        type: "number",
        change: "+11.8%",
        icon: Handshake,
      },
      {
        label: ["Average deal", "Acuerdo promedio"],
        value: 1472,
        type: "money",
        change: "+4.8%",
        icon: DollarSign,
      },
      {
        label: ["Quota attainment", "Cumplimiento de cuota"],
        value: 82.4,
        type: "percent",
        change: "+6.2%",
        icon: TrendingUp,
      },
    ],
  },
  marketing: {
    title: [
      "Make your next impression count.",
      "Haz que cada impresión cuente.",
    ],
    description: [
      "Understand where attention becomes lasting connection.",
      "Entiende cómo la atención se convierte en una conexión duradera.",
    ],
    eyebrow: ["Campaign performance", "Rendimiento de campañas"],
    metrics: [
      {
        label: ["Campaign reach", "Alcance de campañas"],
        value: 842300,
        type: "number",
        change: "+24.8%",
        icon: Megaphone,
      },
      {
        label: ["Qualified leads", "Prospectos calificados"],
        value: 2840,
        type: "number",
        change: "+19.2%",
        icon: Users,
      },
      {
        label: ["Ad spend", "Inversión publicitaria"],
        value: 12480,
        type: "money",
        change: "+8.4%",
        icon: Wallet,
      },
      {
        label: ["Return on spend", "Retorno de inversión"],
        value: 4.6,
        type: "number",
        change: "+12.2%",
        icon: TrendingUp,
      },
    ],
  },
  logistics: {
    title: ["Good things are on their way.", "Lo bueno ya está en camino."],
    description: [
      "Stay close to your fleet, shipments and delivery promises.",
      "Controla tu flota, envíos y compromisos de entrega.",
    ],
    eyebrow: ["Logistics overview", "Resumen de logística"],
    metrics: [
      {
        label: ["Active shipments", "Envíos activos"],
        value: 284,
        type: "number",
        change: "+12.8%",
        icon: Truck,
      },
      {
        label: ["Delivered today", "Entregas de hoy"],
        value: 126,
        type: "number",
        change: "+18.2%",
        icon: ShoppingCart,
      },
      {
        label: ["On-time rate", "Entregas a tiempo"],
        value: 98.2,
        type: "percent",
        change: "+1.4%",
        icon: Activity,
      },
      {
        label: ["Fleet utilization", "Utilización de flota"],
        value: 86.4,
        type: "percent",
        change: "+4.6%",
        icon: TrendingUp,
      },
    ],
  },
  finance: {
    title: ["Your money, in motion.", "Tu dinero, en movimiento."],
    description: [
      "A complete picture of your cash, income and operating expenses.",
      "Una visión completa de tu saldo, ingresos y gastos operativos.",
    ],
    eyebrow: ["Finance overview", "Resumen financiero"],
    metrics: [
      {
        label: ["Cash balance", "Saldo disponible"],
        value: 284620,
        type: "money",
        change: "+8.2%",
        icon: Wallet,
      },
      {
        label: ["Total income", "Ingresos totales"],
        value: 84295,
        type: "money",
        change: "+14.8%",
        icon: DollarSign,
      },
      {
        label: ["Expenses", "Gastos"],
        value: 28410,
        type: "money",
        change: "−4.2%",
        icon: CreditCard,
      },
      {
        label: ["Net margin", "Margen neto"],
        value: 66.3,
        type: "percent",
        change: "+5.4%",
        icon: TrendingUp,
      },
    ],
  },
  stocks: {
    title: [
      "Perspective for your portfolio.",
      "Perspectiva para tu portafolio.",
    ],
    description: [
      "An illustrative portfolio, designed for a clearer view.",
      "Un portafolio ilustrativo, diseñado para una visión más clara.",
    ],
    eyebrow: [
      "Portfolio overview · demo data",
      "Resumen de portafolio · datos de ejemplo",
    ],
    metrics: [
      {
        label: ["Portfolio value", "Valor del portafolio"],
        value: 124580,
        type: "money",
        change: "+8.4%",
        icon: Wallet,
      },
      {
        label: ["Total return", "Retorno total"],
        value: 14580,
        type: "money",
        change: "+13.2%",
        icon: TrendingUp,
      },
      {
        label: ["Dividend income", "Ingresos por dividendos"],
        value: 1284,
        type: "money",
        change: "+6.8%",
        icon: DollarSign,
      },
      {
        label: ["Cash allocation", "Asignación de efectivo"],
        value: 12.4,
        type: "percent",
        change: "+2.1%",
        icon: CreditCard,
      },
    ],
  },
};
export function DashboardTemplate({
  kind = "dashboard",
}: {
  kind?: DashboardKind;
}) {
  const { locale, l, common: t, currency, number, date } = useLanguage();
  const [period, setPeriod] = useState("6m"),
    [tab, setTab] = useState("overview");
  const { customers } = useWorkspace();
  const customerRows = useMemo(
    () =>
      customers.map((customer) => ({
        ...customer,
        avatarSrc: getDemoCustomerAvatarSrc("studio", customer.id),
      })),
    [customers],
  );
  const profile = profiles[kind],
    analytics = kind === "analytics";
  const flagship =
    kind === "dashboard" || kind === "finance" || kind === "ecommerce";
  const monthLabels = l(
    ["May", "Jun", "Jul", "Aug", "Sep", "Oct"].join(","),
    ["May", "Jun", "Jul", "Ago", "Sep", "Oct"].join(","),
  ).split(",");
  const factor = period === "year" ? 2.35 : period === "month" ? 0.64 : 1;
  const base = analytics ? channelData : revenueData;
  const data: ChartDatum[] = base.map((d, i) => ({
    ...d,
    label: analytics
      ? l(
          ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
          ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][i],
        )
      : monthLabels[i],
    value: Math.round(
      d.value *
        factor *
        (kind === "finance"
          ? 84295 / 48295
          : kind === "ecommerce"
            ? 98240 / 48295
            : 1),
    ),
    secondary: Math.round(
      (d.secondary ?? 0) *
        factor *
        (kind === "finance"
          ? 28410 / 35800
          : kind === "ecommerce"
            ? 98240 / 48295
            : 1),
    ),
  }));
  const formatMetric = (metric: (typeof profile.metrics)[number]) =>
    metric.type === "money"
      ? currency(metric.value * (period === "year" ? 2.35 : 1))
      : metric.type === "percent"
        ? number(metric.value, { maximumFractionDigits: 2 }) + "%"
        : number(metric.value);
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
    total: l(
      `Showing 4 of ${customers.length} customers`,
      `Mostrando 4 de ${customers.length} clientes`,
    ),
  };
  const report = () => {
    downloadText(
      `aureform-${kind}-${period}.csv`,
      csv(data as unknown as Record<string, unknown>[]),
      "text/csv;charset=utf-8",
    );
    toast.success(t("downloaded"));
  };
  return (
    <div className="grid min-w-0 gap-6">
      {flagship ? (
        <FlagshipHero
          kind={kind}
          primaryValue={formatMetric(profile.metrics[0])}
          data={data}
          onExport={report}
        />
      ) : (
        <PageHeading
          eyebrow={l(...profile.eyebrow)}
          title={l(...profile.title)}
          description={l(...profile.description)}
          actions={
            <Button size="sm" variant="outline" onClick={report}>
              <Download />
              {l("Export report", "Exportar informe")}
            </Button>
          }
        />
      )}
      <div
        className={`grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 ${flagship ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}
      >
        {(flagship ? profile.metrics.slice(1) : profile.metrics).map(
          (metric, i) => (
            <MetricCard
              key={metric.label[0]}
              label={l(...metric.label)}
              value={formatMetric(metric)}
              change={metric.change}
              trend="up"
              note={l("vs. last month", "vs. mes anterior")}
              icon={<metric.icon />}
              series={[12 + i * 2, 18, 15, 22 + i * 2, 19, 28, 30 + i * 2]}
              className="border-border/80 [&>p]:text-[32px]"
            />
          ),
        )}
      </div>
      {analytics ? (
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList>
            <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
            <TabsTrigger value="acquisition">
              {l("Acquisition", "Adquisición")}
            </TabsTrigger>
            <TabsTrigger value="retention">
              {l("Retention", "Retención")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <AnalyticsOverview
              data={data}
              period={period}
              setPeriod={setPeriod}
            />
          </TabsContent>
          <TabsContent value="acquisition">
            <AnalyticsAcquisition />
          </TabsContent>
          <TabsContent value="retention">
            <RetentionPanel />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
          <RevenuePanel
            title={l(
              kind === "stocks"
                ? "Portfolio performance"
                : kind === "finance"
                  ? "Cash flow"
                  : kind === "marketing"
                    ? "Campaign reach"
                    : kind === "logistics"
                      ? "Deliveries over time"
                      : "Revenue overview",
              kind === "stocks"
                ? "Rendimiento del portafolio"
                : kind === "finance"
                  ? "Flujo de caja"
                  : kind === "marketing"
                    ? "Alcance de campañas"
                    : kind === "logistics"
                      ? "Entregas por período"
                      : "Resumen de ingresos",
            )}
            description={
              kind === "finance"
                ? l(
                    "Income and expenses across your selected period.",
                    "Ingresos y gastos durante el período seleccionado.",
                  )
                : kind === "ecommerce"
                  ? l(
                      "Sales momentum across every channel.",
                      "El ritmo de ventas de todos tus canales.",
                    )
                  : l(
                      "A closer look at your progress over time.",
                      "Una mirada cercana a tu progreso en el tiempo.",
                    )
            }
            data={data}
            kind={kind === "marketing" || kind === "logistics" ? "bar" : "area"}
            valueLabel={
              kind === "finance"
                ? l("Income", "Ingresos")
                : l("This period", "Este período")
            }
            secondaryLabel={
              kind === "finance"
                ? l("Expenses", "Gastos")
                : l("Previous period", "Período anterior")
            }
            label={l(
              kind === "finance"
                ? "Income and expense comparison"
                : "Current and previous period comparison",
              kind === "finance"
                ? "Comparación de ingresos y gastos"
                : "Comparación del período actual y anterior",
            )}
            actions={
              <Select
                value={period}
                onValueChange={setPeriod}
                aria-label={l("Report period", "Período del informe")}
                className="h-9 w-36 text-xs"
                options={[
                  { value: "month", label: l("This month", "Este mes") },
                  { value: "6m", label: l("Last 6 months", "Últimos 6 meses") },
                  { value: "year", label: l("This year", "Este año") },
                ]}
              />
            }
          />
          <PlanBreakdown
            title={l(
              kind === "marketing"
                ? "Leads by channel"
                : kind === "finance"
                  ? "Expense allocation"
                  : kind === "ecommerce"
                    ? "Sales by channel"
                    : kind === "stocks"
                      ? "Asset allocation"
                      : kind === "logistics"
                        ? "Shipments by region"
                        : "Revenue by plan",
              kind === "marketing"
                ? "Prospectos por canal"
                : kind === "finance"
                  ? "Distribución de gastos"
                  : kind === "ecommerce"
                    ? "Ventas por canal"
                    : kind === "stocks"
                      ? "Asignación de activos"
                      : kind === "logistics"
                        ? "Envíos por región"
                        : "Ingresos por plan",
            )}
            description={l(
              "The composition behind your numbers.",
              "La distribución detrás de tus cifras.",
            )}
            items={(kind === "marketing"
              ? [
                  [l("Organic", "Orgánico"), 53],
                  [l("Paid", "Publicidad"), 34],
                  [l("Referral", "Referencias"), 13],
                ]
              : kind === "finance"
                ? [
                    [l("Operations", "Operaciones"), 55],
                    [l("Payroll", "Nómina"), 31],
                    [l("Infrastructure", "Infraestructura"), 14],
                  ]
                : kind === "ecommerce"
                  ? [
                      [l("Direct store", "Tienda directa"), 61],
                      [l("Marketplace", "Marketplace"), 26],
                      [l("Social", "Redes sociales"), 13],
                    ]
                  : kind === "stocks"
                    ? [
                        [l("Equities", "Acciones"), 53],
                        [l("Bonds", "Bonos"), 34],
                        [l("Cash", "Efectivo"), 13],
                      ]
                    : kind === "logistics"
                      ? [
                          [l("North America", "Norteamérica"), 53],
                          [l("Europe", "Europa"), 34],
                          [l("Latin America", "Latinoamérica"), 13],
                        ]
                      : [
                          ["Enterprise", 53],
                          ["Pro", 34],
                          ["Starter", 13],
                        ]
            ).map(([name, percentage]) => ({
              name: String(name),
              percentage: Number(percentage),
              value:
                kind === "logistics" || kind === "marketing"
                  ? number(Number(percentage) * 23)
                  : currency(
                      ((kind === "finance"
                        ? 28410
                        : kind === "ecommerce"
                          ? 98240
                          : 48295) *
                        factor *
                        Number(percentage)) /
                        100,
                    ),
            }))}
            footer={
              <p className="text-xs text-muted-foreground">
                {l(
                  "Updated just now · Demo data",
                  "Actualizado ahora · Datos de ejemplo",
                )}
              </p>
            }
          />
        </div>
      )}
      {kind === "finance" ? (
        <FinanceLedger />
      ) : kind === "ecommerce" ? (
        <CommerceOperations />
      ) : kind === "stocks" ? (
        <StockWatchlist />
      ) : kind === "logistics" ? (
        <ShipmentList />
      ) : kind === "crm" || kind === "sales" ? (
        <SalesSummary kind={kind} />
      ) : analytics ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <TopPages />
          <AudiencePanel />
        </div>
      ) : (
        <CustomerTable
          data={customerRows}
          labels={tableLabels}
          viewAllHref={`/${locale}/customers/`}
          formatCurrency={currency}
          formatDate={(value) => date(value)}
        />
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-primary" />
        {l(
          "Your business, in focus · Illustrative demo data.",
          "Tu negocio, en foco · Datos de demostración ilustrativos.",
        )}
      </div>
    </div>
  );
}
function FlagshipHero({
  kind,
  primaryValue,
  data,
  onExport,
}: {
  kind: DashboardKind;
  primaryValue: string;
  data: ChartDatum[];
  onExport: () => void;
}) {
  const { locale, l } = useLanguage();
  const { appearance } = useAppearance();
  const colors = useMemo<[string, string, string]>(
    () => [
      appearance.colors.primary,
      appearance.colors.secondary,
      appearance.colors.tertiary,
    ],
    [
      appearance.colors.primary,
      appearance.colors.secondary,
      appearance.colors.tertiary,
    ],
  );
  const profile = profiles[kind];
  return (
    <section className="relative isolate min-w-0 overflow-hidden rounded-3xl border border-primary/30 bg-surface">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <ShaderBackground
          kind={appearance.shader.kind}
          colors={colors}
          speed={appearance.shader.speed}
          scale={appearance.shader.scale}
          intensity={appearance.shader.intensity}
          paused={appearance.shader.paused || appearance.motion === "off"}
          className="h-full w-full"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              appearance.theme === "light"
                ? "linear-gradient(105deg, color-mix(in srgb, var(--surface) 98%, transparent), color-mix(in srgb, var(--surface) 96%, transparent) 55%, color-mix(in srgb, var(--surface) 54%, transparent))"
                : "linear-gradient(105deg, color-mix(in srgb, var(--surface) 97%, transparent), color-mix(in srgb, var(--surface) 84%, transparent) 45%, color-mix(in srgb, var(--surface) 48%, transparent))",
          }}
        />
      </div>
      <div className="relative grid min-w-0 items-center gap-7 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] xl:gap-10 xl:p-8">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Badge className="gap-1.5">
              {kind === "finance" ? (
                <Wallet className="size-3.5" />
              ) : kind === "ecommerce" ? (
                <ShoppingCart className="size-3.5" />
              ) : (
                <Activity className="size-3.5" />
              )}
              {l(...profile.eyebrow)}
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">
              {l("Demo workspace", "Espacio de demostración")}
            </span>
          </div>
          <h1
            data-motion="intro"
            className="max-w-2xl text-3xl font-bold leading-[1.12] tracking-[-.045em] sm:text-4xl xl:text-[44px]"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight:
                appearance.typography === "modern"
                  ? 700
                  : "var(--af-display-weight)",
            }}
          >
            {l(...profile.title)}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            {l(...profile.description)}
          </p>
          <div className="mt-7">
            <p className="text-sm font-medium text-muted-foreground">
              {l(...profile.metrics[0].label)}
            </p>
            <p className="mt-2 break-words text-[clamp(36px,4.7vw,64px)] font-bold leading-none tracking-[-.055em] tabular-nums">
              {primaryValue}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge>{profile.metrics[0].change}</Badge>
              <span className="text-xs text-muted-foreground">
                {l(
                  "vs. last month · illustrative figures",
                  "vs. mes anterior · cifras ilustrativas",
                )}
              </span>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={onExport}
              className="bg-surface/80 backdrop-blur-xl"
            >
              <Download />
              {l("Export report", "Exportar informe")}
            </Button>
            <Link
              href={`/${locale}/studio/`}
              className={buttonVariants({ size: "sm" })}
            >
              <SlidersHorizontal />
              {l("Customize", "Personalizar")}
              <ArrowUpRight />
            </Link>
          </div>
        </div>
        {kind === "finance" ? (
          <GlowBorder colors={colors} className="min-w-0 rounded-2xl p-0">
            <GradientBackground
              kind={appearance.gradient.kind}
              colors={colors}
              angle={appearance.gradient.angle}
              intensity={Math.min(appearance.gradient.intensity, 0.3)}
              className="min-w-0 rounded-2xl border border-border bg-surface p-6"
            >
              <div className="rounded-xl bg-surface/85 p-4 text-foreground backdrop-blur-xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-sm font-bold">
                      {l("Aureform Treasury", "Tesorería Aureform")}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {l("Demo account", "Cuenta de ejemplo")}
                    </p>
                  </div>
                  <Wallet className="size-7 text-primary" />
                </div>
                <div className="mt-9 flex items-end justify-between gap-3">
                  <p className="font-mono text-lg tracking-[.08em] sm:text-xl">
                    •••• 4242
                  </p>
                  <span className="text-sm font-bold text-primary">USD</span>
                </div>
                <div className="mt-7 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {l("Account holder", "Titular")}
                    </p>
                    <p className="mt-1 text-sm font-semibold">Alex Morgan</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {l("Environment", "Entorno")}
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {l("Local demo", "Demo local")}
                    </p>
                  </div>
                </div>
              </div>
              <Link
                href={`/${locale}/transactions/`}
                className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-border bg-surface/90 px-4 py-3 text-sm font-semibold text-foreground"
              >
                {l("Explore your transactions", "Explorar tus transacciones")}
                <ArrowRight className="size-4 shrink-0 text-primary" />
              </Link>
            </GradientBackground>
          </GlowBorder>
        ) : kind === "ecommerce" ? (
          <CommerceHeroPreview />
        ) : (
          <div className="af-shadow-elevated min-w-0 rounded-2xl border border-primary/25 bg-surface/90 p-5 backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold">
                {l("Growth signal", "Señal de crecimiento")}
              </p>
              <Sparkles className="size-5 text-primary" />
            </div>
            <p className="mt-4 text-4xl font-bold tracking-tight">+12.8%</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {l(
                "Monthly recurring revenue growth",
                "Crecimiento de ingresos recurrentes mensuales",
              )}
            </p>
            <div className="mt-4 min-w-0">
              <Chart
                kind="area"
                height={110}
                data={data}
                label={l("SaaS revenue trend", "Tendencia de ingresos SaaS")}
                valueLabel={l("Revenue", "Ingresos")}
                secondaryLabel={l("Previous", "Anterior")}
              />
            </div>
            <Link
              href={`/${locale}/ai/`}
              className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/10 p-3 text-sm font-semibold"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-primary" />
                {l("Open your AI workspace", "Abrir tu espacio de IA")}
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-primary" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function CommerceHeroPreview() {
  const { locale, l, number } = useLanguage();
  const [orders] = useDemoStore("orders", entitySeeds.orders);
  const [products] = useDemoStore("products", entitySeeds.products);
  const queue = orders.filter((order) => order.status === "processing").length;
  const sent = orders.filter((order) => order.status === "shipped").length;
  const delivered = orders.filter(
    (order) => order.status === "delivered",
  ).length;
  const total = orders.filter((order) => order.status !== "cancelled").length;
  return (
    <GlowBorder className="min-w-0 rounded-2xl p-0">
      <div className="rounded-2xl border border-border bg-surface/90 p-5 backdrop-blur-xl sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">
            {l("Fulfillment pulse", "Pulso de entregas")}
          </h2>
          <Package className="size-6 text-primary" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: l("Processing", "En proceso"), value: queue },
            { label: l("Shipped", "Enviados"), value: sent },
            { label: l("Delivered", "Entregados"), value: delivered },
          ].map((metric) => (
            <div key={metric.label} className="min-w-0">
              <p className="text-3xl font-bold tabular-nums">
                {number(metric.value)}
              </p>
              <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                {metric.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Progress
            value={total ? Math.round(((sent + delivered) / total) * 100) : 0}
            label={l(
              "Orders shipped or delivered",
              "Pedidos enviados o entregados",
            )}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            {l(
              `${products.length} products in your demo catalog`,
              `${products.length} productos en tu catálogo de ejemplo`,
            )}
          </p>
        </div>
        <Link
          href={`/${locale}/orders/`}
          className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/10 p-3 text-sm font-semibold"
        >
          {l("Open the order queue", "Abrir la lista de pedidos")}
          <ArrowUpRight className="size-4 shrink-0 text-primary" />
        </Link>
      </div>
    </GlowBorder>
  );
}

function FinanceLedger() {
  const { locale, l, currency, date } = useLanguage();
  const [transactions] = useDemoStore("transactions", entitySeeds.transactions);
  const translatedNames: Record<string, string> = {
    "Subscription payment": "Pago de suscripción",
    "Enterprise renewal": "Renovación Enterprise",
    "Service payment": "Pago de servicios",
    "Starter renewal": "Renovación Starter",
    "Pro renewal": "Renovación Pro",
    "Account credit": "Crédito a la cuenta",
    "Refund · #1053": "Reembolso · #1053",
  };
  const completed = transactions.filter(
    (transaction) => transaction.status === "completed",
  );
  const credited = completed.reduce(
    (total, transaction) => total + Math.max(transaction.amount, 0),
    0,
  );
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {l("Recent movements", "Movimientos recientes")}
            </CardTitle>
            <CardDescription>
              {l(
                "Recent activity across your account.",
                "La actividad reciente de tu cuenta.",
              )}
            </CardDescription>
          </div>
          <Link
            href={`/${locale}/transactions/`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {l("View all", "Ver todo")}
            <ArrowUpRight />
          </Link>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{l("Transaction", "Transacción")}</TableHead>
              <TableHead>{l("Date", "Fecha")}</TableHead>
              <TableHead>{l("Status", "Estado")}</TableHead>
              <TableHead className="text-right">
                {l("Amount", "Importe")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.slice(0, 5).map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <p className="font-semibold">
                    {l(
                      transaction.name,
                      translatedNames[transaction.name] ?? transaction.name,
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {transaction.detail}
                  </p>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {date(transaction.date)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      transaction.status === "completed"
                        ? "default"
                        : transaction.status === "failed"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {transaction.status === "completed"
                      ? l("Completed", "Completada")
                      : transaction.status === "pending"
                        ? l("Pending", "Pendiente")
                        : transaction.status === "refunded"
                          ? l("Refunded", "Reembolsada")
                          : l("Failed", "Fallida")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {currency(transaction.amount)}
                </TableCell>
              </TableRow>
            ))}
            {!transactions.length && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  {l(
                    "No transaction records yet.",
                    "Todavía no hay transacciones.",
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <Card
        className="relative overflow-hidden border-primary/30 p-6"
        style={{
          background:
            "radial-gradient(ellipse at 100% 0%, color-mix(in srgb, var(--af-color-secondary, var(--chart-2)) 18%, transparent), transparent 70%), var(--surface)",
        }}
      >
        <span className="inline-flex rounded-xl bg-accent p-3">
          <ArrowDownRight className="size-6 text-primary" />
        </span>
        <h2 className="mt-5 text-lg font-bold">
          {l("Account activity", "Actividad de la cuenta")}
        </h2>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          {l(
            "Completed credits in the local ledger",
            "Créditos completados en el registro local",
          )}
        </p>
        <p className="mt-2 break-words text-4xl font-bold tracking-tight tabular-nums">
          {currency(credited)}
        </p>
        <div className="mt-6 grid gap-3 border-t border-border pt-5 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">
              {l("Completed", "Completadas")}
            </span>
            <span className="font-semibold">{completed.length}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">
              {l("Pending", "Pendientes")}
            </span>
            <span className="font-semibold">
              {
                transactions.filter(
                  (transaction) => transaction.status === "pending",
                ).length
              }
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">
              {l("Total records", "Registros totales")}
            </span>
            <span className="font-semibold">{transactions.length}</span>
          </div>
        </div>
        <p className="mt-5 text-xs leading-6 text-muted-foreground">
          {l(
            "Demo figures · No bank or payment processor is connected.",
            "Cifras de ejemplo · No hay conexión con un banco o procesador de pagos.",
          )}
        </p>
      </Card>
    </div>
  );
}

function CommerceOperations() {
  const { locale, l, currency, number } = useLanguage();
  const [products] = useDemoStore("products", entitySeeds.products);
  const [orders] = useDemoStore("orders", entitySeeds.orders);
  const [failedProductImages, setFailedProductImages] = useState<string[]>([]);
  const productNames: Record<string, string> = {
    "Forma desk lamp": "Lámpara de escritorio Forma",
    "Arc lounge chair": "Sillón Arc",
    "Linea notebook": "Cuaderno Linea",
    "Studio tote": "Bolso Studio",
    "Morrow ceramic cup": "Taza de cerámica Morrow",
    "Silhouette vase": "Jarrón Silhouette",
    "Fold side table": "Mesa auxiliar Fold",
    "Essential wall print": "Lámina decorativa Essential",
  };
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {l("Catalog spotlight", "Productos destacados")}
            </CardTitle>
            <CardDescription>
              {l("Your catalog, at a glance.", "Tu catálogo, de un vistazo.")}
            </CardDescription>
          </div>
          <Link
            href={`/${locale}/products/`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            {l("View catalog", "Ver catálogo")}
            <ArrowUpRight className="size-4" />
          </Link>
        </CardHeader>
        <CardContent className="grid gap-4">
          {products.slice(0, 3).map((product, index) => {
            const asset = getProductAsset(product.id);
            const Icon =
              product.category === "Lighting"
                ? LampDesk
                : product.category === "Furniture"
                  ? Armchair
                  : product.category === "Stationery"
                    ? NotebookPen
                    : Package;
            return (
              <div
                key={product.id}
                className="flex min-w-0 items-center gap-4 rounded-xl border border-border bg-surface-subtle/50 p-3"
              >
                <span
                  className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/20"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, var(--chart-${(index % 3) + 1}) 28%, var(--surface)), var(--surface))`,
                  }}
                >
                  {asset && !failedProductImages.includes(asset.src) ? (
                    <img
                      src={publicPath(asset.src)}
                      alt={l(asset.alt.en, asset.alt.es)}
                      width={asset.width}
                      height={asset.height}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                      onError={() =>
                        setFailedProductImages((previous) =>
                          previous.includes(asset.src)
                            ? previous
                            : [...previous, asset.src],
                        )
                      }
                    />
                  ) : (
                    <Icon className="size-8 text-primary" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {l(
                      product.name,
                      productNames[product.name] ?? product.name,
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l(
                      `${number(product.stock ?? 0)} in stock`,
                      `${number(product.stock ?? 0)} en inventario`,
                    )}
                  </p>
                  <p className="mt-2 text-sm font-bold">
                    {currency(product.amount)}
                  </p>
                </div>
              </div>
            );
          })}
          {!products.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {l("Your catalog is empty.", "Tu catálogo está vacío.")}
            </p>
          )}
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {l("Latest orders", "Últimos pedidos")}
            </CardTitle>
            <CardDescription>
              {l("From checkout to delivery.", "De la compra a la entrega.")}
            </CardDescription>
          </div>
          <Link
            href={`/${locale}/orders/`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {l("Manage orders", "Gestionar pedidos")}
            <ArrowUpRight />
          </Link>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{l("Order", "Pedido")}</TableHead>
              <TableHead>{l("Customer", "Cliente")}</TableHead>
              <TableHead>{l("Status", "Estado")}</TableHead>
              <TableHead className="text-right">
                {l("Total", "Total")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.slice(0, 5).map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-semibold">{order.name}</TableCell>
                <TableCell>{order.detail}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      order.status === "delivered"
                        ? "default"
                        : order.status === "cancelled"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {order.status === "delivered"
                      ? l("Delivered", "Entregado")
                      : order.status === "shipped"
                        ? l("Shipped", "Enviado")
                        : order.status === "cancelled"
                          ? l("Cancelled", "Cancelado")
                          : l("Processing", "En proceso")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {currency(order.amount)}
                </TableCell>
              </TableRow>
            ))}
            {!orders.length && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-muted-foreground"
                >
                  {l("No order records yet.", "Todavía no hay pedidos.")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function AnalyticsOverview({
  data,
  period,
  setPeriod,
}: {
  data: ChartDatum[];
  period: string;
  setPeriod: (v: string) => void;
}) {
  const { l, number } = useLanguage();
  return (
    <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
      <RevenuePanel
        title={l("Visitors over time", "Visitantes por período")}
        description={l(
          "The paths that bring people to your product.",
          "Los caminos que traen personas a tu producto.",
        )}
        data={data}
        kind="bar"
        valueLabel={l("Visitors", "Visitantes")}
        secondaryLabel={l("Previous", "Anterior")}
        label={l(
          "Visitor comparison by day",
          "Comparación de visitantes por día",
        )}
        actions={
          <Select
            value={period}
            onValueChange={setPeriod}
            aria-label={l("Period", "Período")}
            className="h-8 w-28"
            options={[
              { value: "month", label: l("This month", "Este mes") },
              { value: "6m", label: l("Last 6 months", "Últimos 6 meses") },
              { value: "year", label: l("This year", "Este año") },
            ]}
          />
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{l("Traffic sources", "Fuentes de tráfico")}</CardTitle>
          <CardDescription>
            {l(
              "Where your next connection begins.",
              "Dónde empieza tu próxima conexión.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Chart
            kind="pie"
            height={170}
            label={l(
              "Traffic source distribution",
              "Distribución de fuentes de tráfico",
            )}
            data={[
              { label: l("Organic", "Orgánico"), value: 54 },
              { label: l("Direct", "Directo"), value: 28 },
              { label: l("Referral", "Referencias"), value: 18 },
            ]}
          />
          <div className="mt-4 grid gap-2">
            {[
              l("Organic search", "Búsqueda orgánica"),
              l("Direct", "Directo"),
              l("Referral", "Referencias"),
            ].map((label, i) => (
              <div key={label} className="flex justify-between text-xs">
                <span>{label}</span>
                <span className="font-medium">{number([54, 28, 18][i])}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function AnalyticsAcquisition() {
  const { l, number } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {l("Acquisition funnel", "Embudo de adquisición")}
        </CardTitle>
        <CardDescription>
          {l(
            "A clear path from first impression to active customer.",
            "Un recorrido claro de la primera impresión al cliente activo.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {[
          { label: l("Impressions", "Impresiones"), value: 128430, p: 100 },
          { label: l("Visitors", "Visitantes"), value: 42810, p: 74 },
          { label: l("Sign-ups", "Registros"), value: 8420, p: 46 },
          { label: l("Activated", "Activaciones"), value: 2420, p: 24 },
        ].map((stage) => (
          <div key={stage.label}>
            <div className="mb-2 flex justify-between text-xs">
              <span>{stage.label}</span>
              <span className="font-semibold">{number(stage.value)}</span>
            </div>
            <Progress label={stage.label} value={stage.p} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
function RetentionPanel() {
  const { l } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{l("Cohort retention", "Retención por cohortes")}</CardTitle>
        <CardDescription>
          {l(
            "Weekly cohorts from your demo product.",
            "Cohortes semanales de tu producto de ejemplo.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-96 text-center text-xs">
            <thead>
              <tr>
                <th className="p-3 text-left">{l("Cohort", "Cohorte")}</th>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <th key={n} className="p-3">
                    {l("Week", "Semana")} {n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map((row) => (
                <tr key={row}>
                  <th className="p-3 text-left font-medium">
                    {l("October", "Octubre")} {1 + row * 7}
                  </th>
                  {[0, 1, 2, 3, 4, 5].map((col) => (
                    <td
                      key={col}
                      className="border-4 border-surface p-3 font-medium"
                      style={{
                        background: `color-mix(in srgb, var(--primary) ${Math.max(8, 40 - col * 5 - row * 2)}%, var(--surface))`,
                        color: "var(--foreground)",
                      }}
                    >
                      {100 - col * 11 - row * 3}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
function TopPages() {
  const { l, number } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{l("Top pages", "Páginas principales")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {[
          ["/dashboard", 28420],
          ["/pricing", 18490],
          ["/features", 12410],
          ["/docs", 8240],
        ].map(([page, n]) => (
          <div key={page} className="flex justify-between text-xs">
            <span className="font-mono">{page}</span>
            <span className="tabular-nums">{number(Number(n))}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
function AudiencePanel() {
  const { l, number } = useLanguage();
  return (
    <PlanBreakdown
      title={l("Your audience", "Tu audiencia")}
      description={l(
        "People who make your product matter.",
        "Las personas que dan sentido a tu producto.",
      )}
      items={[
        [l("United States", "Estados Unidos"), 42],
        [l("United Kingdom", "Reino Unido"), 24],
        [l("Colombia", "Colombia"), 18],
        [l("Other", "Otros"), 16],
      ].map(([name, p]) => ({
        name: String(name),
        percentage: Number(p),
        value: number(Number(p)) + "%",
      }))}
    />
  );
}
function SalesSummary({ kind }: { kind: string }) {
  const { l, locale, currency } = useLanguage();
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader className="flex-row justify-between">
          <CardTitle>
            {l("Your next opportunities", "Tus próximas oportunidades")}
          </CardTitle>
          <a
            href={publicPath(`/${locale}/pipeline/`)}
            className="text-xs text-primary"
          >
            {l("View pipeline", "Ver embudo")} →
          </a>
        </CardHeader>
        <CardContent className="grid gap-4">
          {[
            [l("Studio partnership", "Acuerdo con estudio"), 24800],
            [l("Platform expansion", "Expansión de plataforma"), 18600],
            [l("Enterprise rollout", "Lanzamiento Enterprise"), 42500],
          ].map(([name, v], i) => (
            <div
              key={name}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
            >
              <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Handshake className="size-4" />
              </span>
              <div className="min-w-0 flex-[1_1_120px]">
                <p className="text-xs font-semibold">{name}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {l("Closing in October", "Cierre en octubre")}
                </p>
              </div>
              <span className="text-xs font-semibold">
                {currency(Number(v))}
              </span>
              <Badge variant={i === 1 ? "warning" : "default"}>
                {i === 1
                  ? l("Proposal", "Propuesta")
                  : l("Qualified", "Calificado")}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <PlanBreakdown
        title={l(
          kind === "crm" ? "Relationship health" : "Team attainment",
          kind === "crm"
            ? "Salud de las relaciones"
            : "Cumplimiento del equipo",
        )}
        description={l(
          "Progress that deserves a closer look.",
          "Progreso que merece una mirada cercana.",
        )}
        items={[
          { name: "Alex Morgan", value: "92%", percentage: 92 },
          { name: "Isabel Torres", value: "84%", percentage: 84 },
          { name: "Leo Martin", value: "78%", percentage: 78 },
        ]}
      />
    </div>
  );
}
function ShipmentList() {
  const { l, locale } = useLanguage();
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{l("Active shipments", "Envíos activos")}</CardTitle>
        <a
          href={publicPath(`/${locale}/maps/`)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {l("View map", "Ver mapa")}
          <ArrowUpRight className="size-3" />
        </a>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            {[
              l("Shipment", "Envío"),
              l("Route", "Ruta"),
              l("Carrier", "Transportista"),
              l("Status", "Estado"),
              l("ETA", "Llegada"),
            ].map((t) => (
              <TableHead key={t}>{t}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            [
              "SHP-1048",
              "Bogotá → Medellín",
              "Aureform Express",
              "In transit",
              l("Today, 16:30", "Hoy, 16:30"),
            ],
            [
              "SHP-1049",
              "Madrid → Barcelona",
              "Studio Freight",
              "In transit",
              l("Today, 18:00", "Hoy, 18:00"),
            ],
            [
              "SHP-1050",
              l("New York → Boston", "Nueva York → Boston"),
              "Arc Logistics",
              "Delivered",
              l("Today, 11:45", "Hoy, 11:45"),
            ],
          ].map((r, i) => (
            <TableRow key={r[0]}>
              {r.map((v, j) => (
                <TableCell key={j}>
                  {j === 3 ? (
                    <Badge variant={i === 2 ? "default" : "warning"}>
                      {i === 2
                        ? l("Delivered", "Entregado")
                        : l("In transit", "En tránsito")}
                    </Badge>
                  ) : (
                    v
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
function StockWatchlist() {
  const { l, currency, number } = useLanguage();
  const [sort, setSort] = useState(false);
  const stocks = [
    { s: "AUR", n: "Aureform Labs", p: 184.2, c: 2.84 },
    { s: "ARC", n: "Arc Systems", p: 242.8, c: 1.62 },
    { s: "LUM", n: "Lumina Technologies", p: 128.6, c: -0.84 },
    { s: "FRM", n: "Forma Group", p: 94.2, c: 3.24 },
  ].sort((a, b) => (sort ? b.c - a.c : a.s.localeCompare(b.s)));
  return (
    <Card>
      <CardHeader className="flex-row justify-between">
        <div>
          <CardTitle>{l("Watchlist", "Lista de seguimiento")}</CardTitle>
          <CardDescription>
            {l(
              "Fictional securities · illustrative prices",
              "Valores ficticios · precios ilustrativos",
            )}
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setSort(!sort)}>
          {l(
            sort ? "Sort by symbol" : "Sort by change",
            sort ? "Ordenar por símbolo" : "Ordenar por cambio",
          )}
        </Button>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            {[
              l("Symbol", "Símbolo"),
              l("Company", "Empresa"),
              l("Price", "Precio"),
              l("Change", "Cambio"),
            ].map((t) => (
              <TableHead key={t}>{t}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.map((s) => (
            <TableRow key={s.s}>
              <TableCell className="font-semibold">{s.s}</TableCell>
              <TableCell>{s.n}</TableCell>
              <TableCell className="tabular-nums">{currency(s.p)}</TableCell>
              <TableCell>
                <Badge variant={s.c > 0 ? "default" : "destructive"}>
                  {s.c > 0 ? (
                    <ArrowUpRight className="size-3" />
                  ) : (
                    <ArrowDownRight className="size-3" />
                  )}
                  {s.c > 0 ? "+" : ""}
                  {number(s.c, { maximumFractionDigits: 2 })}%
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
