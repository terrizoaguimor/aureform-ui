"use client";

import { publicPath } from "@/lib/public-path";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Sun,
  Moon,
  Check,
  Code2,
  Layers,
  MousePointer2,
  Menu,
  X,
  Download,
  Sparkles,
  SlidersHorizontal,
  Palette,
  WandSparkles,
  Activity,
  CreditCard,
  Users,
  ShoppingBag,
} from "lucide-react";
import { Brand, AureformMark } from "@/components/brand";
import { buttonVariants, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/blocks/metric-card";
import { RevenuePanel } from "@/components/blocks/revenue-panel";
import { CustomerTable } from "@/components/blocks/customer-table";
import { AppearanceControls } from "@/components/appearance-controls";
import { useAppearance } from "@/components/appearance-provider";
import {
  GradientBackground,
  ShaderBackground,
  GlowBorder,
  SpotlightCard,
} from "@/components/effects";
import { useLanguage } from "@/hooks/use-language";
import { customersSeed, revenueData } from "@/demo/dashboard-data";
import { getDemoCustomerAvatarSrc } from "@/demo/avatar-assets";
import {
  routes,
  componentFamilies,
  figmaUrl,
  githubUrl,
  kitVersion,
} from "@/lib/catalog";
import {
  createAppearance,
  palettePresets,
  type PaletteId,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

export function LandingTemplate() {
  const { locale, l, common: t, currency, date } = useLanguage();
  const { appearance, setAppearance } = useAppearance();
  const [menu, setMenu] = useState(false);
  const href = (path: string) => `/${locale}/${path}/`;
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
  const paletteNames: Record<PaletteId, string> = {
    aurora: "Aurora",
    violet: "Violeta",
    ocean: "Océano",
    mint: "Menta",
    ember: "Brasa",
    rose: "Rosa",
  };
  const navigation = [
    { label: l("Templates", "Plantillas"), href: href("templates") },
    { label: "Studio", href: href("studio") },
    { label: l("Effects", "Efectos"), href: href("effects") },
    { label: l("Themes", "Temas"), href: href("themes") },
    { label: l("Documentation", "Documentación"), href: href("docs") },
  ];
  const choosePalette = (palette: PaletteId) => {
    setAppearance((current) => {
      const next = createAppearance(palette, current.theme);
      return {
        ...current,
        palette,
        colors: next.colors,
        gradient: {
          ...current.gradient,
          stops: current.gradient.stops.map((stop, index) => ({
            ...stop,
            color:
              next.gradient.stops[index % next.gradient.stops.length].color,
          })),
        },
      };
    });
  };
  const previewRevenue = revenueData.map((point, index) => ({
    ...point,
    label: l(
      ["May", "Jun", "Jul", "Aug", "Sep", "Oct"][index],
      ["May", "Jun", "Jul", "Ago", "Sep", "Oct"][index],
    ),
  }));

  return (
    <div className="overflow-x-clip bg-background text-foreground">
      <header className="relative z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-8 lg:px-10">
          <Link href={`/${locale}/`} aria-label="Aureform UI">
            <span className="sm:hidden">
              <Brand compact />
            </span>
            <span className="hidden sm:inline-flex">
              <Brand />
            </span>
          </Link>
          <nav
            aria-label={l("Product navigation", "Navegación del producto")}
            className="hidden items-center gap-5 text-sm font-medium xl:flex"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={`/${locale === "en" ? "es" : "en"}/`}
              className="hidden rounded-md px-1 py-2 text-xs font-semibold sm:block"
              aria-label={l("ES — Cambiar a español", "EN — Switch to English")}
            >
              {locale === "en" ? "ES" : "EN"}
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("toggleTheme")}
              onClick={() =>
                setAppearance((current) => ({
                  ...current,
                  theme: current.theme === "light" ? "dark" : "light",
                }))
              }
            >
              {appearance.theme === "light" ? <Moon /> : <Sun />}
            </Button>
            <Link
              href={href("studio")}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-primary/40 bg-primary/10 text-foreground",
              )}
            >
              <SlidersHorizontal />
              {l("Customize", "Personalizar")}
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className="xl:hidden"
              aria-label={t("menu")}
              aria-expanded={menu}
              aria-controls="landing-navigation"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {menu && (
          <nav
            id="landing-navigation"
            aria-label={l("Mobile navigation", "Navegación móvil")}
            className="mx-4 mb-4 grid gap-1 rounded-2xl border border-border bg-surface p-3 xl:hidden"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-sm hover:bg-accent"
                onClick={() => setMenu(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={href("dashboard")}
              className="rounded-lg px-3 py-3 text-sm font-semibold text-primary"
            >
              {l("Explore the demo", "Explorar la demo")}{" "}
              <ArrowUpRight className="ml-1 inline size-4" />
            </Link>
            <Link
              href={`/${locale === "en" ? "es" : "en"}/`}
              className="rounded-lg px-3 py-3 text-sm"
              aria-label={l("ES — Cambiar a español", "EN — Switch to English")}
            >
              {l("Español", "English")}
            </Link>
          </nav>
        )}
      </header>

      <main>
        <section className="relative isolate border-b border-border/60">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
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
                    ? "linear-gradient(110deg, color-mix(in srgb, var(--background) 98%, transparent), color-mix(in srgb, var(--background) 96%, transparent) 48%, color-mix(in srgb, var(--background) 18%, transparent) 75%, color-mix(in srgb, var(--background) 38%, transparent)), linear-gradient(0deg, var(--background), transparent 38%)"
                    : "linear-gradient(110deg, color-mix(in srgb, var(--background) 92%, transparent), color-mix(in srgb, var(--background) 38%, transparent) 60%, color-mix(in srgb, var(--background) 22%, transparent)), linear-gradient(0deg, var(--background), transparent 38%)",
              }}
            />
          </div>
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-4 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[minmax(0,.94fr)_minmax(0,1.06fr)] lg:gap-10 lg:px-10 lg:pb-28">
            <div className="min-w-0">
              <div
                data-motion="intro"
                className="mb-7 flex flex-wrap items-center gap-3"
              >
                <Badge className="gap-1.5 px-3 py-1.5">
                  <Sparkles className="size-3.5" />
                  Aureform {kitVersion}
                </Badge>
                <span className="text-xs font-semibold tracking-[.12em] text-muted-foreground">
                  NEXT.JS + FIGMA · APACHE 2.0
                </span>
              </div>
              <h1
                data-motion="intro"
                className="max-w-[680px] text-[clamp(46px,6.2vw,88px)] font-extrabold leading-[1.02] tracking-[-.065em]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight:
                    appearance.typography === "modern"
                      ? 800
                      : "var(--af-display-weight)",
                }}
              >
                {l("Build beyond", "Construye")}
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--af-gradient-text)" }}
                >
                  {l("ordinary.", "sin límites.")}
                </span>
              </h1>
              <p
                data-motion="intro"
                className="mt-7 max-w-[540px] text-base leading-8 text-muted-foreground sm:text-lg"
              >
                {l(
                  "The interface your ambition deserves. Complete workspaces, expressive effects and a visual studio that makes every pixel yours.",
                  "La interfaz que tu ambición merece. Espacios de trabajo completos, efectos expresivos y un estudio visual para hacer tuyo cada píxel.",
                )}
              </p>
              <div
                data-motion="intro"
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Link
                  href={href("dashboard")}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "af-shadow-elevated",
                  )}
                >
                  <Layers />
                  {l("Step into the workspace", "Entrar al espacio de trabajo")}
                  <ArrowUpRight />
                </Link>
                <a
                  href={publicPath("/downloads/aureform-ui-source.zip")}
                  download
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "bg-surface/70 backdrop-blur-xl",
                  )}
                >
                  <Download />
                  {l("Download the source", "Descargar el código")}
                </a>
              </div>
              <div className="mt-9 max-w-[540px] rounded-2xl border border-border/80 bg-surface/75 p-4 backdrop-blur-xl sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Palette className="size-4 text-primary" />
                    {l(
                      "Your palette. Your signature.",
                      "Tu paleta. Tu identidad.",
                    )}
                  </p>
                  <Link
                    href={href("studio")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4"
                  >
                    {l("Customize", "Personalizar")}
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
                <div
                  role="group"
                  aria-label={l(
                    "Choose a color palette",
                    "Elegir una paleta de color",
                  )}
                  className="grid grid-cols-3 gap-2"
                >
                  {palettePresets.map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      aria-pressed={appearance.palette === preset.id}
                      aria-label={l(
                        `Use ${preset.name} palette`,
                        `Usar paleta ${paletteNames[preset.id]}`,
                      )}
                      onClick={() => choosePalette(preset.id)}
                      className={cn(
                        "min-w-0 rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        appearance.palette === preset.id
                          ? "border-primary bg-accent"
                          : "border-border bg-background/40 hover:border-primary/60",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="mb-2 flex h-7 overflow-hidden rounded-md"
                      >
                        {preset.colors.map((color, index) => (
                          <span
                            key={index}
                            className="flex-1"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </span>
                      <span className="flex items-center justify-between gap-1 text-xs font-semibold">
                        {l(preset.name, paletteNames[preset.id])}
                        {appearance.palette === preset.id && (
                          <Check
                            className="size-3 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" />
                  {l("Light + dark", "Claro + oscuro")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" />
                  {l("English + Spanish", "Inglés + español")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-primary" />
                  {l("Editable source", "Código editable")}
                </span>
              </div>
            </div>

            <div className="relative min-w-0 pb-10 pt-3 sm:pb-14 lg:pt-8">
              <div
                aria-hidden="true"
                className="absolute inset-x-4 bottom-7 top-8 rounded-3xl border border-primary/25 bg-primary/10 rotate-[-3deg]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-7 bottom-3 top-14 rounded-3xl border border-border bg-surface/50 rotate-[2deg]"
              />
              <GlowBorder colors={colors} className="relative rounded-2xl p-0">
                <div className="af-shadow-floating relative min-w-0 overflow-hidden rounded-2xl border border-border bg-surface/95 backdrop-blur-xl">
                  <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex gap-1.5">
                        <span className="size-2 rounded-full bg-chart-4" />
                        <span className="size-2 rounded-full bg-chart-3" />
                        <span className="size-2 rounded-full bg-chart-2" />
                      </span>
                      <span className="text-xs font-medium">
                        {l("Aureform Workspace", "Espacio Aureform")}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {l("Interactive preview", "Vista interactiva")}
                    </Badge>
                  </div>
                  <div className="grid min-w-0 xl:grid-cols-[126px_minmax(0,1fr)]">
                    <aside
                      aria-label={l(
                        "Preview navigation",
                        "Navegación de la vista previa",
                      )}
                      className="hidden flex-col gap-1 border-r border-border p-3 xl:flex"
                    >
                      <AureformMark className="mb-6 mt-2 size-7 text-primary" />
                      {[
                        { path: "dashboard", icon: Activity },
                        { path: "ai", icon: Sparkles },
                        { path: "customers", icon: Users },
                        { path: "studio", icon: Palette },
                      ].map((item) => (
                        <Link
                          key={item.path}
                          href={href(item.path)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2 py-3 text-xs font-medium",
                            item.path === "dashboard"
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-surface-subtle",
                          )}
                        >
                          <item.icon className="size-3.5 shrink-0" />
                          {item.path === "studio"
                            ? "Studio"
                            : routes.find(
                                (route) => route.path === item.path,
                              )?.[locale]}
                        </Link>
                      ))}
                      <Link
                        href={href("effects")}
                        className="mt-auto rounded-xl border border-primary/30 bg-primary/10 px-3 py-4 text-xs font-semibold"
                      >
                        <WandSparkles className="mb-2 size-5 text-primary" />
                        {l("Explore effects", "Explorar efectos")}
                        <ArrowUpRight className="mt-2 size-4" />
                      </Link>
                    </aside>
                    <div className="min-w-0 bg-background/70 p-4 sm:p-5">
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">
                            {l(
                              "Your business, in focus",
                              "Tu negocio, en foco",
                            )}
                          </p>
                          <h2 className="text-2xl font-bold tracking-tight">
                            {l("Workspace overview", "Resumen del negocio")}
                          </h2>
                        </div>
                        <Link
                          href={href("dashboard")}
                          aria-label={l("Open workspace", "Abrir espacio")}
                          className="rounded-lg border border-border bg-surface p-2 text-primary"
                        >
                          <ArrowUpRight className="size-4" />
                        </Link>
                      </div>
                      <div className="grid min-w-0 grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                        <MetricCard
                          label={l("Monthly revenue", "Ingresos mensuales")}
                          value={currency(48295)}
                          change="+12.8%"
                          trend="up"
                          icon={<CreditCard />}
                          series={[12, 18, 15, 22, 19, 28, 30]}
                          className="border-primary/30 bg-accent/40"
                        />
                        <MetricCard
                          label={l("Subscribers", "Suscriptores")}
                          value={l("2,420", "2.420")}
                          change="+8.2%"
                          trend="up"
                          icon={<Users />}
                          series={[9, 14, 16, 14, 22, 25, 28]}
                        />
                      </div>
                      <div className="mt-3">
                        <RevenuePanel
                          title={l("Revenue overview", "Resumen de ingresos")}
                          description={l(
                            "Current and previous period",
                            "Período actual y anterior",
                          )}
                          data={previewRevenue}
                          valueLabel={l("This period", "Este período")}
                          secondaryLabel={l("Previous", "Anterior")}
                          label={l(
                            "Demo monthly revenue",
                            "Ingresos mensuales de ejemplo",
                          )}
                        />
                      </div>
                      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-chart-3" />
                        {l(
                          "Illustrative business data",
                          "Datos de negocio ilustrativos",
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </GlowBorder>
              <Link
                href={href("ai")}
                className="af-shadow-floating relative -mt-4 ml-3 block w-[min(290px,calc(100%-24px))] rounded-2xl border border-primary/40 bg-surface/95 p-4 backdrop-blur-xl sm:absolute sm:-bottom-1 sm:left-1 sm:ml-0 lg:-left-5"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-bold">
                    <Sparkles className="size-4 text-primary" />
                    Aureform AI
                  </span>
                  <ArrowUpRight className="size-4 text-primary" />
                </div>
                <p className="text-sm leading-6">
                  {l(
                    "Turn your next idea into a conversation.",
                    "Convierte tu próxima idea en una conversación.",
                  )}
                </p>
                <span className="mt-3 block text-xs text-muted-foreground">
                  {l(
                    "Try the local AI workspace",
                    "Prueba el espacio de IA local",
                  )}
                </span>
              </Link>
              <div className="af-shadow-elevated absolute -right-1 -top-3 hidden rounded-xl border border-border bg-surface/95 px-4 py-3 backdrop-blur-xl sm:block lg:top-0">
                <p className="flex items-center gap-2 text-xs font-semibold">
                  <Palette className="size-3.5 text-primary" />
                  {l("Live appearance", "Apariencia en vivo")}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {l(
                    palettePresets.find(
                      (preset) => preset.id === appearance.palette,
                    )?.name ?? "Aurora",
                    paletteNames[appearance.palette],
                  )}{" "}
                  <span className="font-normal text-muted-foreground">
                    /{" "}
                    {appearance.theme === "dark"
                      ? l("Dark", "Oscuro")
                      : l("Light", "Claro")}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="kit"
          className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 sm:py-24 lg:px-10"
        >
          <div className="mb-10 grid items-end gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-sm font-semibold text-accent-foreground">
                {l(
                  "One system. Your next product.",
                  "Un sistema. Tu próximo producto.",
                )}
              </p>
              <h2 className="max-w-2xl text-4xl font-bold leading-tight tracking-[-.045em] sm:text-5xl">
                {l(
                  "From first impression to full application.",
                  "De la primera impresión a la aplicación completa.",
                )}
              </h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-muted-foreground">
              {l(
                "A complete source kit with a shared visual language. Beautiful in the browser, editable in Figma and ready to become your own product.",
                "Un kit completo con un lenguaje visual compartido. Potente en el navegador, editable en Figma y listo para convertirse en tu producto.",
              )}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: MousePointer2,
                number: `${componentFamilies.length}`,
                title: l("Component families", "Familias de componentes"),
                body: l(
                  "Accessible states, shared tokens and complete examples you can copy.",
                  "Estados accesibles, tokens compartidos y ejemplos completos para copiar.",
                ),
                path: "components",
              },
              {
                icon: Layers,
                number: `${routes.length}`,
                title: l("Application routes", "Rutas de aplicación"),
                body: l(
                  "Dashboards, AI, commerce, authentication and everyday product flows.",
                  "Dashboards, IA, comercio, autenticación y flujos de producto completos.",
                ),
                path: "templates",
              },
              {
                icon: Code2,
                number: "100%",
                title: l("Editable source", "Código editable"),
                body: l(
                  "Base UI, Tailwind and TypeScript. Install only what your product needs.",
                  "Base UI, Tailwind y TypeScript. Instala solo lo que tu producto necesita.",
                ),
                path: "docs/cli",
              },
            ].map((item) => (
              <SpotlightCard key={item.path} className="h-full rounded-2xl p-0">
                <Link
                  data-motion="reveal"
                  href={href(item.path)}
                  className="block h-full rounded-2xl border border-border bg-surface/70 p-6 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-7"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-xl border border-primary/25 bg-primary/15 p-3">
                      <item.icon className="size-6 text-primary" />
                    </span>
                    <span className="text-5xl font-bold tracking-tight text-foreground">
                      {item.number}
                    </span>
                  </div>
                  <h3 className="mt-7 text-xl font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.body}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    {l("Take a closer look", "Ver de cerca")}
                    <ArrowRight className="size-4" />
                  </span>
                </Link>
              </SpotlightCard>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,.92fr)] lg:items-center lg:px-10 lg:py-24">
            <div className="min-w-0">
              <Badge className="mb-5">
                <WandSparkles className="mr-1 size-3.5" />
                Aureform Studio
              </Badge>
              <h2 className="text-4xl font-bold leading-[1.1] tracking-[-.045em] sm:text-5xl">
                {l(
                  "Your brand, in every dimension.",
                  "Tu marca, en cada dimensión.",
                )}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
                {l(
                  "Six palettes are just the beginning. Shape the colors, materials, gradients, shaders and motion of your whole interface in the live Studio.",
                  "Seis paletas son solo el comienzo. Define colores, materiales, gradientes, shaders y movimiento de toda tu interfaz en Studio.",
                )}
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: SlidersHorizontal,
                    path: "studio",
                    title: l("Appearance Studio", "Estudio de apariencia"),
                    subtitle: l(
                      "Make every detail yours",
                      "Haz tuyo cada detalle",
                    ),
                  },
                  {
                    icon: WandSparkles,
                    path: "effects",
                    title: l("Effect playground", "Laboratorio de efectos"),
                    subtitle: l(
                      "Shaders, depth and motion",
                      "Shaders, relieve y movimiento",
                    ),
                  },
                  {
                    icon: Palette,
                    path: "themes",
                    title: l("Theme gallery", "Galería de temas"),
                    subtitle: l(
                      "Find your starting point",
                      "Elige tu punto de partida",
                    ),
                  },
                ].map((item) => (
                  <Link
                    key={item.path}
                    href={href(item.path)}
                    className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <item.icon className="mb-3 size-5 text-primary" />
                    <span className="block text-sm font-bold">
                      {item.title}
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                      {item.subtitle}
                    </span>
                    <ArrowUpRight className="mt-3 size-4 text-primary" />
                  </Link>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={href("studio")}
                  className={buttonVariants({ size: "lg" })}
                >
                  <SlidersHorizontal />
                  {l("Open Studio", "Abrir Studio")}
                  <ArrowUpRight />
                </Link>
                <AppearanceControls
                  showLabel
                  studioHref={`/${locale}/studio/`}
                />
              </div>
            </div>
            <GlowBorder colors={colors} className="rounded-3xl p-0">
              <div className="relative isolate min-w-0 overflow-hidden rounded-3xl border border-border bg-surface">
                <GradientBackground
                  kind={appearance.gradient.kind}
                  colors={colors}
                  angle={appearance.gradient.angle}
                  intensity={appearance.gradient.intensity}
                  className="relative min-h-[360px] p-6 sm:p-8"
                >
                  <div className="relative rounded-2xl border border-border bg-surface/90 p-5 text-foreground backdrop-blur-xl sm:p-6">
                    <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
                      <Brand />
                      <Badge variant="outline">
                        {l("Live preview", "Vista en vivo")}
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold tracking-tight sm:text-4xl">
                      {l("Designed by you.", "Diseñado por ti.")}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {l(
                        "The same interface. A completely different signature.",
                        "La misma interfaz. Una identidad completamente distinta.",
                      )}
                    </p>
                    <div aria-hidden="true" className="mt-6 flex gap-3">
                      {colors.map((color, index) => (
                        <span
                          key={index}
                          className="h-14 flex-1 rounded-xl border border-border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={href("components")}
                        className={buttonVariants({ size: "sm" })}
                      >
                        {l("Explore components", "Explorar componentes")}
                        <ArrowUpRight />
                      </Link>
                      <Badge>
                        {appearance.theme === "dark"
                          ? l("Dark mode", "Modo oscuro")
                          : l("Light mode", "Modo claro")}
                      </Badge>
                    </div>
                  </div>
                </GradientBackground>
              </div>
            </GlowBorder>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-4 text-sm font-semibold text-accent-foreground">
                {l(
                  "Built for actual products",
                  "Pensado para productos reales",
                )}
              </p>
              <h2 className="text-4xl font-bold tracking-[-.045em] sm:text-5xl">
                {l(
                  "Three businesses. Three perspectives.",
                  "Tres negocios. Tres perspectivas.",
                )}
              </h2>
            </div>
            <Link
              href={href("templates")}
              className={buttonVariants({ variant: "outline" })}
            >
              {l("See all templates", "Ver todas las plantillas")}
              <ArrowUpRight />
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                path: "dashboard",
                icon: Activity,
                title: l("SaaS workspace", "Espacio SaaS"),
                body: l(
                  "Recurring revenue, customers and product growth.",
                  "Ingresos recurrentes, clientes y crecimiento.",
                ),
                label: l("Monthly revenue", "Ingresos mensuales"),
                value: currency(48295),
                values: [28, 41, 35, 58, 72, 90],
              },
              {
                path: "finance",
                icon: CreditCard,
                title: l("Finance command center", "Centro financiero"),
                body: l(
                  "Cash balance, allocation and every movement.",
                  "Saldo, distribución y cada movimiento.",
                ),
                label: l("Cash balance", "Saldo disponible"),
                value: currency(284620),
                values: [72, 48, 63, 40, 85, 67],
              },
              {
                path: "ecommerce",
                icon: ShoppingBag,
                title: l("Commerce operations", "Operaciones de comercio"),
                body: l(
                  "Your catalog, orders and delivery progress.",
                  "Tu catálogo, pedidos y entregas.",
                ),
                label: l("Gross sales", "Ventas brutas"),
                value: currency(98240),
                values: [38, 52, 47, 64, 78, 96],
              },
            ].map((item, itemIndex) => (
              <Link
                data-motion="reveal"
                key={item.path}
                href={href(item.path)}
                className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-surface outline-none transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div
                  className="relative border-b border-border p-6"
                  style={{
                    background: `radial-gradient(ellipse at 90% 10%, color-mix(in srgb, ${colors[itemIndex]} 24%, transparent), transparent 75%)`,
                  }}
                >
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <item.icon className="size-6 text-primary" />
                    <Badge variant="outline">{l("Demo", "Demostración")}</Badge>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 break-words text-4xl font-bold tracking-tight">
                    {item.value}
                  </p>
                  <div
                    aria-hidden="true"
                    className="mt-6 flex h-20 items-end gap-2"
                  >
                    {item.values.map((value, index) => (
                      <span
                        key={index}
                        className="flex-1 rounded-t-md"
                        style={{
                          height: `${value}%`,
                          backgroundColor: `color-mix(in srgb, ${colors[itemIndex]} ${35 + index * 11}%, var(--surface))`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="flex items-center justify-between gap-3 text-xl font-bold">
                    {item.title}
                    <ArrowUpRight className="size-5 shrink-0 text-primary" />
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 min-w-0">
            <CustomerTable
              data={customersSeed.slice(0, 3).map((customer) => ({
                ...customer,
                avatarSrc: getDemoCustomerAvatarSrc("studio", customer.id),
              }))}
              labels={{
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
                total: l("Illustrative data", "Datos ilustrativos"),
              }}
              viewAllHref={href("customers")}
              formatCurrency={currency}
              formatDate={date}
            />
          </div>
        </section>

        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-2 lg:px-10 lg:py-24">
            <div>
              <p className="mb-4 text-sm font-semibold text-accent-foreground">
                NEXT.JS + FIGMA
              </p>
              <h2 className="text-4xl font-bold leading-tight tracking-[-.045em] sm:text-5xl">
                {l(
                  "Designed to build. Built to evolve.",
                  "Diseñado para crear. Creado para evolucionar.",
                )}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
                {l(
                  "Native Figma components and an original Next.js source kit share the same foundations. Start from a complete interface and take it in your own direction.",
                  "Componentes nativos de Figma y un kit original para Next.js comparten las mismas bases. Empieza con una interfaz completa y llévala en tu propia dirección.",
                )}
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  l(
                    "Editable variables, components and variants",
                    "Variables, componentes y variantes editables",
                  ),
                  l(
                    "Local Code Connect templates",
                    "Plantillas locales de Code Connect",
                  ),
                  l(
                    "Your backend, through replaceable demo adapters",
                    "Tu backend, mediante adaptadores de ejemplo reemplazables",
                  ),
                ].map((text) => (
                  <p key={text} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 shrink-0 text-primary" />
                    {text}
                  </p>
                ))}
              </div>
              <a
                href={publicPath(figmaUrl)}
                className={cn(buttonVariants({ variant: "outline" }), "mt-7")}
              >
                {l("Open the Figma library", "Abrir la biblioteca en Figma")}
                <ArrowUpRight />
              </a>
            </div>
            <div className="af-shadow-elevated overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Code2 className="size-4 text-primary" />
                  {l("Your next interface", "Tu próxima interfaz")}
                </span>
                <Badge variant="outline">TypeScript</Badge>
              </div>
              <pre
                tabIndex={0}
                aria-label={l(
                  "Aureform component composition example",
                  "Ejemplo de composición de componentes Aureform",
                )}
                className="overflow-x-auto p-5 text-[13px] leading-8 sm:p-7"
              >
                <code>{`import { Card, CardContent } from "@/components/ui/card";\nimport { ShaderBackground } from "@/components/effects";\n\n<ShaderBackground kind="aurora">\n  <Card appearance="glass">\n    <CardContent>\n      ${l("Your product. Your signature.", "Tu producto. Tu identidad.")}\n    </CardContent>\n  </Card>\n</ShaderBackground>`}</code>
              </pre>
              <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
                <Badge>Next.js</Badge>
                <Badge variant="outline">Base UI</Badge>
                <Badge variant="outline">Tailwind</Badge>
                <Badge variant="outline">Figma</Badge>
              </div>
            </div>
          </div>
        </section>

        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <GradientBackground
              kind="mesh"
              colors={colors}
              intensity={0.3}
              className="h-full w-full"
            />
          </div>
          <div className="relative mx-auto max-w-[1000px] px-4 py-20 text-center sm:px-8 sm:py-28">
            <AureformMark className="mx-auto mb-7 size-12 text-primary" />
            <h2 className="text-4xl font-bold leading-tight tracking-[-.05em] sm:text-6xl">
              {l(
                "Your next product starts here.",
                "Tu próximo producto empieza aquí.",
              )}
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-8 text-muted-foreground">
              {l(
                "Open source, from the components to the design. A shared foundation for whatever you build next.",
                "Código abierto, desde los componentes hasta el diseño. Una base compartida para lo que construyas después.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href={publicPath("/downloads/aureform-ui-source.zip")}
                download
                className={buttonVariants({ size: "lg" })}
              >
                <Download />
                {l("Get Aureform UI", "Descargar Aureform UI")}
              </a>
              <Link
                href={href("studio")}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <Palette />
                {l("Make it yours", "Hazlo tuyo")}
                <ArrowUpRight />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-6 px-4 py-8 sm:px-8 lg:px-10">
          <Brand />
          <p className="text-xs text-muted-foreground">
            © 2026 Aureform UI ·{" "}
            {l("Open source · Apache 2.0", "Código abierto · Apache 2.0")}
          </p>
          <div className="flex flex-wrap gap-5 text-xs text-muted-foreground">
            <Link
              href={href("docs/license")}
              className="underline underline-offset-4"
            >
              Apache 2.0
            </Link>
            <Link href={href("docs")} className="underline underline-offset-4">
              {t("docs")}
            </Link>
            <a href={githubUrl} className="underline underline-offset-4">
              GitHub
            </a>
            <a
              href={publicPath(figmaUrl)}
              className="underline underline-offset-4"
            >
              Figma
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
