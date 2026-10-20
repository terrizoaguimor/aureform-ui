"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Code2,
  Copy,
  Download,
  Figma,
  Heart,
  Layers,
  Menu,
  Moon,
  Palette,
  Play,
  SlidersHorizontal,
  Sun,
  Terminal,
  WandSparkles,
  X,
} from "lucide-react";
import { Brand, AureformMark } from "@/components/brand";
import { buttonVariants, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppearance } from "@/components/appearance-provider";
import {
  GradientBackground,
  ShaderBackground,
  GlowBorder,
} from "@/components/effects";
import { useLanguage } from "@/hooks/use-language";
import { useCopy } from "@/hooks/use-copy";
import { figmaUrl, githubUrl, kitVersion } from "@/lib/catalog";
import {
  createAppearance,
  palettePresets,
  type PaletteId,
} from "@/lib/appearance";
import { publicPath } from "@/lib/public-path";
import { sponsorsUrl } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const sourceCommands = [
  "git clone https://github.com/terrizoaguimor/aureform-ui.git",
  "cd aureform-ui",
  "corepack enable",
  "pnpm install --frozen-lockfile",
  "pnpm dev",
].join("\n");
const registryCommands = [
  "pnpm dlx shadcn@4.22.0 add \\",
  "  https://aureformui.com/r/button.json",
].join("\n");
const editorialFont = { fontFamily: "var(--font-instrument, Georgia, serif)" };
const sectionWidth = "mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12";
const textLink =
  "inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:rounded-sm";

type ScreenshotProps = {
  page: string;
  title: string;
  alt: string;
  href: string;
  light: boolean;
  className?: string;
  priority?: boolean;
  compact?: boolean;
};

function Screenshot({
  page,
  title,
  alt,
  href,
  light,
  className,
  priority = false,
  compact = false,
}: ScreenshotProps) {
  const { l } = useLanguage();
  return (
    <Link
      prefetch={false}
      href={href}
      className={cn(
        "af-shadow-floating af-hover-card group block min-w-0 rounded-2xl border border-border bg-surface p-1.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:rounded-[22px] sm:p-2",
        className,
      )}
    >
      <figure className="min-w-0 overflow-hidden rounded-xl sm:rounded-2xl">
        <div className="flex min-h-9 items-center justify-between gap-3 bg-surface px-3 py-2 sm:px-4">
          <span className="flex min-w-0 items-center gap-2.5 text-[11px] font-medium text-muted-foreground">
            <span aria-hidden="true" className="flex shrink-0 gap-1">
              <span className="size-1.5 rounded-full bg-muted-foreground/30" />
              <span className="size-1.5 rounded-full bg-muted-foreground/30" />
              <span className="size-1.5 rounded-full bg-primary/60" />
            </span>
            <span className="truncate">{title}</span>
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
          />
        </div>
        <Image
          src={publicPath(`/previews/${light ? "light/" : ""}${page}.webp`)}
          width={960}
          height={600}
          unoptimized
          priority={priority}
          sizes="(min-width: 1024px) 740px, 100vw"
          alt={alt}
          className="h-auto w-full border border-border/60 object-cover"
        />
        {!compact && (
          <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-surface px-3 pb-1 pt-3 text-[10px] text-muted-foreground sm:px-4 sm:text-xs">
            <span>
              {l(
                "Actual kit screenshot · demo data",
                "Captura del kit · datos demo",
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              {l("Open the demo", "Abrir la demo")}
              <ArrowRight aria-hidden="true" className="size-3" />
            </span>
          </figcaption>
        )}
      </figure>
    </Link>
  );
}

function LiveChecklist({ className }: { className?: string }) {
  const { l } = useLanguage();
  const [completed, setCompleted] = useState([true, false, false]);
  const count = completed.filter(Boolean).length;
  const tasks = [
    l("Find your starting point", "Elige tu punto de partida"),
    l("Choose your palette", "Elige tu paleta"),
    l("Make it your own", "Hazlo tuyo"),
  ];
  return (
    <div
      className={cn(
        "af-shadow-floating min-w-0 rounded-2xl border border-border bg-surface/95 p-4 backdrop-blur-xl sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-semibold">
          <span className="flex size-6 items-center justify-center rounded-lg bg-accent text-primary">
            <Check aria-hidden="true" className="size-3.5" />
          </span>
          {l("A small beginning", "Un pequeño comienzo")}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">
          {l("Local demo", "Demo local")}
        </span>
      </div>
      <fieldset>
        <legend className="sr-only">
          {l("Try the interactive checklist", "Prueba la lista interactiva")}
        </legend>
        <div className="grid gap-3">
          {tasks.map((task, index) => (
            <label
              key={index}
              className="flex cursor-pointer items-center gap-2.5 text-xs leading-5"
            >
              <input
                type="checkbox"
                checked={completed[index]}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setCompleted((previous) =>
                    previous.map((value, position) =>
                      position === index ? checked : value,
                    ),
                  );
                }}
                className="size-4 shrink-0 accent-primary"
              />
              <span
                className={cn(
                  completed[index] && "text-muted-foreground line-through",
                )}
              >
                {task}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3 text-[10px] text-muted-foreground">
        <span role="status" aria-live="polite">
          {l(`${count} of 3 complete`, `${count} de 3 completados`)}
        </span>
        <span>{l("Try a checkbox", "Prueba una casilla")}</span>
      </div>
      <div
        role="progressbar"
        aria-label={l("Demo checklist progress", "Progreso de la lista demo")}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={count}
        className="mt-2 h-1 overflow-hidden rounded-full bg-surface-subtle"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(count / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function LandingTemplate() {
  const { locale, l, common: t } = useLanguage();
  const { appearance, setAppearance } = useAppearance();
  const [menu, setMenu] = useState(false);
  const [workflow, setWorkflow] = useState(0);
  const [installMethod, setInstallMethod] = useState<"source" | "registry">(
    "source",
  );
  const [copiedMethod, setCopiedMethod] = useState("");
  const [copyError, setCopyError] = useState("");
  const menuButton = useRef<HTMLButtonElement>(null);
  const { copied, copy } = useCopy();
  const href = (path: string) => `/${locale}/${path}/`;
  const light = appearance.theme === "light";
  const downloadUrl = `${githubUrl}/releases/download/v${kitVersion}/aureform-ui-source.zip`;
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
  const activePalette = palettePresets.find(
    (preset) => preset.id === appearance.palette,
  )!;
  const navigation = [
    { label: l("The kit", "El kit"), href: "#kit" },
    { label: l("Integrations", "Integraciones"), href: href("integrations") },
    { label: "Studio", href: href("studio") },
    { label: l("Quality", "Calidad"), href: href("quality") },
  ];
  const workflows = [
    {
      title: l("Give your team a home.", "Dale un lugar a tu equipo."),
      label: l("Set up your workspace", "Prepara tu espacio"),
      description: l(
        "Walk through onboarding, invite your team and explore member roles. A considered first run, already connected in the local demo.",
        "Recorre el onboarding, invita a tu equipo y explora los roles. Una primera experiencia cuidada, conectada en la demo local.",
      ),
      page: "onboarding",
      path: "onboarding",
      action: l("Try the onboarding", "Probar el onboarding"),
      detail: l(
        "Onboarding · members · role previews",
        "Onboarding · miembros · vista de roles",
      ),
    },
    {
      title: l("Bring your work into focus.", "Pon tu trabajo en foco."),
      label: l("Make everyday work flow", "Organiza el trabajo diario"),
      description: l(
        "Import customer data, find what matters and move from a list into the details. Forms, empty states and recoverable errors belong to the same system.",
        "Importa clientes, encuentra lo que importa y pasa de la lista al detalle. Formularios, estados vacíos y errores recuperables comparten el mismo sistema.",
      ),
      page: "customers-detail",
      path: "customers",
      action: l(
        "Explore customer workflows",
        "Explorar los flujos de clientes",
      ),
      detail: l(
        "Imports · saved views · customer detail",
        "Importación · vistas guardadas · detalle",
      ),
    },
    {
      title: l(
        "Make room for the next idea.",
        "Dale espacio a tu próxima idea.",
      ),
      label: l("Explore a new possibility", "Explora nuevas posibilidades"),
      description: l(
        "Try a conversation, stop a response and pick up where you left off. The AI workspace uses a local mock; your model provider is yours to connect.",
        "Prueba una conversación, detén una respuesta y continúa después. El espacio de IA usa un mock local; tú conectas tu proveedor de modelos.",
      ),
      page: "ai",
      path: "ai",
      action: l("Try the AI demo", "Probar la demo de IA"),
      detail: l(
        "Simulated AI · streaming · playground",
        "IA simulada · streaming · playground",
      ),
    },
  ];
  const selectedWorkflow = workflows[workflow];
  const guides = [
    {
      slug: "cli",
      title: l("Install & compose", "Instala y compón"),
      detail: l(
        "Source, local CLI and registry",
        "Código, CLI local y registro",
      ),
      icon: Terminal,
    },
    {
      slug: "tokens",
      title: l("Shape your visual language", "Define tu lenguaje visual"),
      detail: l(
        "Tokens, palettes and appearance",
        "Tokens, paletas y apariencia",
      ),
      icon: Palette,
    },
    {
      slug: "integrations",
      title: l("Connect your own services", "Conecta tus servicios"),
      detail: l(
        "65 recipes and typed connection contracts",
        "65 recetas y contratos de conexión tipados",
      ),
      icon: Code2,
    },
    {
      slug: "figma",
      title: l("Design alongside your code", "Diseña junto a tu código"),
      detail: l(
        "Figma files and design handoff",
        "Archivos Figma y entrega de diseño",
      ),
      icon: Figma,
    },
  ];

  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menu]);

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
  const copyCommands = async () => {
    setCopyError("");
    try {
      await copy(
        installMethod === "source" ? sourceCommands : registryCommands,
      );
      setCopiedMethod(installMethod);
    } catch {
      setCopyError(
        l(
          "Clipboard unavailable. You can select and copy the commands below.",
          "El portapapeles no está disponible. Puedes seleccionar y copiar los comandos.",
        ),
      );
    }
  };

  return (
    <div className="min-w-0 overflow-x-clip bg-background text-foreground">
      <a
        href="#landing-content"
        className="sr-only absolute z-50 m-4 rounded-lg bg-surface p-3 font-semibold focus:not-sr-only"
      >
        {l("Skip to content", "Saltar al contenido")}
      </a>
      <header className="relative z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div
          className={cn(
            sectionWidth,
            "flex min-h-20 items-center justify-between gap-2 py-4 sm:gap-4",
          )}
        >
          <Link
            prefetch={false}
            href={`/${locale}/`}
            aria-label="Aureform UI"
            className="shrink-0 rounded-md"
          >
            <span className="sm:hidden">
              <Brand compact />
            </span>
            <span className="hidden sm:inline-flex">
              <Brand />
            </span>
          </Link>
          <nav
            aria-label={l("Product navigation", "Navegación del producto")}
            className="hidden items-center gap-5 text-[13px] font-medium lg:flex xl:gap-7"
          >
            {navigation.map((item) => (
              <Link
                prefetch={false}
                key={item.href}
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <a
              href={sponsorsUrl}
              className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-primary motion-reduce:transition-none"
            >
              <Heart className="size-3.5" aria-hidden="true" />
              {l("Sponsors", "Patrocinar")}
            </a>
          </nav>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <Link
              prefetch={false}
              href={href("docs")}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "min-h-10 border-primary/25 bg-accent/35 px-3 text-foreground",
              )}
            >
              <BookOpen aria-hidden="true" />
              {l("Documentation", "Documentación")}
            </Link>
            <Link
              prefetch={false}
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
              {light ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </Button>
            <div className="hidden items-center gap-1 border-l border-border pl-3 lg:flex">
              <Link
                prefetch={false}
                href={href("auth/sign-in")}
                aria-describedby="landing-auth-demo"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {l("Log in", "Entrar")}
              </Link>
              <span
                id="landing-auth-demo"
                className="text-[10px] text-muted-foreground"
              >
                Demo
              </span>
            </div>
            <Button
              ref={menuButton}
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              aria-label={t("menu")}
              aria-expanded={menu}
              aria-controls="landing-navigation"
              onClick={() => setMenu((current) => !current)}
            >
              {menu ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
          </div>
        </div>
        {menu && (
          <nav
            id="landing-navigation"
            aria-label={l("Mobile navigation", "Navegación móvil")}
            className="mx-5 mb-5 grid gap-1 rounded-2xl border border-border bg-surface p-3 sm:mx-8 lg:hidden"
          >
            {navigation.map((item) => (
              <Link
                prefetch={false}
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-sm hover:bg-accent"
                onClick={() => setMenu(false)}
              >
                {item.label}
              </Link>
            ))}
            <a
              href={sponsorsUrl}
              className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm hover:bg-accent"
              onClick={() => setMenu(false)}
            >
              <Heart className="size-4" aria-hidden="true" />
              {l("Sponsors", "Patrocinar")}
            </a>
            <Link
              prefetch={false}
              href={href("dashboard")}
              className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-semibold text-primary"
              onClick={() => setMenu(false)}
            >
              {l("Explore the demo", "Explorar la demo")}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
            <div className="my-1 border-t border-border" />
            <p className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
              {l(
                "Mock authentication screens",
                "Pantallas de autenticación mock",
              )}
            </p>
            <Link
              prefetch={false}
              href={href("auth/sign-in")}
              className="rounded-lg px-3 py-3 text-sm hover:bg-accent"
              onClick={() => setMenu(false)}
            >
              {l("Log in", "Entrar")}
            </Link>
            <Link
              prefetch={false}
              href={href("auth/sign-up")}
              className="rounded-lg px-3 py-3 text-sm hover:bg-accent"
              onClick={() => setMenu(false)}
            >
              {l("Create a demo account", "Crear una cuenta demo")}
            </Link>
            <Link
              prefetch={false}
              href={`/${locale === "en" ? "es" : "en"}/`}
              className="rounded-lg px-3 py-3 text-sm hover:bg-accent"
              aria-label={l("ES — Cambiar a español", "EN — Switch to English")}
              onClick={() => setMenu(false)}
            >
              {l("Español", "English")}
            </Link>
          </nav>
        )}
      </header>

      <main id="landing-content">
        <section
          aria-labelledby="landing-title"
          className="relative isolate border-b border-border/60"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div
              className="absolute -right-40 -top-40 size-[700px] rounded-full opacity-20"
              style={{
                background: "radial-gradient(circle, #c6a261, transparent 67%)",
              }}
            />
            <div
              className="absolute inset-x-0 bottom-0 h-2/3"
              style={{
                background:
                  "linear-gradient(0deg, var(--surface), transparent)",
              }}
            />
          </div>
          <div
            className={cn(
              sectionWidth,
              "relative grid items-center gap-10 pb-14 pt-12 sm:gap-14 sm:pb-20 sm:pt-20 lg:grid-cols-[minmax(0,.84fr)_minmax(0,1.16fr)] lg:gap-12 lg:pb-20 lg:pt-16",
            )}
          >
            <div className="min-w-0 lg:pb-10">
              <div
                data-motion="intro"
                className="mb-7 flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[.16em] sm:text-xs"
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-[#b99557]/35 px-3 py-1.5">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-[#b99557]"
                  />
                  Aureform UI {kitVersion}
                </span>
                <span className="text-muted-foreground">Next.js + Figma</span>
              </div>
              <h1
                id="landing-title"
                data-motion="intro"
                className="max-w-[650px] text-[clamp(3.25rem,5.2vw,5.25rem)] font-normal leading-[1.04] tracking-[-.045em]"
                style={editorialFont}
              >
                <span className="block">
                  {l("Your next product.", "Tu próximo producto.")}
                </span>
                <span
                  className="mt-1 block bg-clip-text pb-2 text-transparent italic"
                  style={{
                    backgroundImage: light
                      ? "linear-gradient(115deg, #72501f 0%, #a07731 45%, #6b471b 100%)"
                      : "linear-gradient(115deg, #b89350 0%, #f3dfaf 45%, #c5a062 100%)",
                  }}
                >
                  {l("Beautifully formed.", "Bien diseñado.")}
                </span>
              </h1>
              <p
                data-motion="intro"
                className="mt-6 max-w-[480px] text-base leading-8 text-muted-foreground sm:text-[17px]"
              >
                {l(
                  "An open source interface system for Next.js and Figma. Start with complete workflows, make every detail yours, and build on code you own.",
                  "Un sistema de interfaces de código abierto para Next.js y Figma. Empieza con flujos completos, cuida cada detalle y construye sobre tu propio código.",
                )}
              </p>
              <div
                data-motion="intro"
                className="mt-8 grid gap-3 min-[480px]:flex min-[480px]:flex-wrap"
              >
                <Link
                  prefetch={false}
                  href={href("dashboard")}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "border-foreground bg-foreground text-background [background-image:none] hover:bg-foreground/90 hover:text-background",
                  )}
                >
                  <Play aria-hidden="true" className="size-3.5" />
                  {l("Explore the demo", "Explorar la demo")}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
                <Link
                  prefetch={false}
                  href={href("docs")}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "bg-surface/70",
                  )}
                >
                  <BookOpen aria-hidden="true" />
                  {l("Read the docs", "Leer la documentación")}
                </Link>
              </div>
              <div
                data-motion="intro"
                className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-muted-foreground"
              >
                <a
                  href={githubUrl}
                  className="inline-flex items-center gap-1.5 rounded-sm hover:text-foreground"
                >
                  <Code2 aria-hidden="true" className="size-3.5" />
                  {l("Open source", "Código abierto")}
                  <ArrowUpRight aria-hidden="true" className="size-3" />
                </a>
                <Link
                  prefetch={false}
                  href={href("docs/license")}
                  className="rounded-sm hover:text-foreground"
                >
                  Apache 2.0
                </Link>
                <span className="inline-flex items-center gap-1.5">
                  <Check aria-hidden="true" className="size-3.5" />
                  {l("No account needed", "Sin crear una cuenta")}
                </span>
              </div>
              <a
                href="#kit"
                className={cn(textLink, "mt-10 text-xs text-muted-foreground")}
              >
                {l("A closer look at the kit", "Descubre el kit")}
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </a>
            </div>

            <div
              data-motion="intro"
              className="relative isolate min-w-0 pb-2 pt-8 sm:pb-24 sm:pt-14 lg:min-h-[640px] lg:pb-36 lg:pt-20"
            >
              <div
                aria-hidden="true"
                className="absolute right-0 top-0 -z-10 h-[80%] w-[62%] overflow-hidden rounded-[28px] border border-[#b99557]/20 sm:rounded-[42px]"
              >
                <Image
                  src={publicPath("/assets/art/quiet-forms.webp")}
                  width={1536}
                  height={1024}
                  unoptimized
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-background/20" />
              </div>
              <div
                aria-hidden="true"
                className="absolute left-1 top-12 -z-10 h-[64%] w-[86%] rotate-[-5deg] rounded-[24px] border border-[#b99557]/25 bg-surface/50 sm:top-20"
              />
              <Screenshot
                page="dashboard"
                title={l("Workspace / Overview", "Espacio / Resumen")}
                alt={l(
                  "Aureform dashboard in English with navigation, metrics and revenue charts using demo data.",
                  "Dashboard Aureform en inglés con navegación, métricas y gráficos de ingresos de ejemplo.",
                )}
                href={href("dashboard")}
                light={light}
                priority
                className="relative z-10 sm:mr-5 lg:mr-8"
              />
              <LiveChecklist className="relative z-20 ml-auto mt-5 w-full max-w-[300px] sm:absolute sm:bottom-0 sm:left-0 sm:ml-0 sm:mt-0 lg:-left-3" />
              <Screenshot
                page="ai"
                title={l("AI / Local mock", "IA / Mock local")}
                alt={l(
                  "The included AI conversation screen in English, with a prompt composer and local demo disclosure.",
                  "Pantalla de conversación IA incluida, en inglés, con editor de mensajes y aviso de demo local.",
                )}
                href={href("ai")}
                light={light}
                compact
                className="absolute bottom-3 right-0 z-20 hidden w-[43%] max-w-[280px] sm:block lg:bottom-10"
              />
            </div>
          </div>
        </section>

        <div className="border-b border-border/60 bg-surface/40">
          <dl
            className={cn(
              sectionWidth,
              "grid grid-cols-2 gap-x-5 gap-y-8 py-8 sm:py-10 md:grid-cols-4",
            )}
          >
            {[
              ["69", l("core views", "vistas principales")],
              ["65", l("integration recipes", "recetas de integración")],
              ["127", l("registry entries", "entradas de registro")],
              ["6", l("signature palettes", "paletas de color")],
            ].map(([value, label]) => (
              <div
                key={value}
                className="flex min-w-0 flex-col gap-1 border-l border-border pl-4 sm:flex-row sm:items-center sm:gap-4 sm:pl-6"
              >
                <dd
                  className="order-first text-[35px] font-normal leading-none tracking-[-.04em]"
                  style={editorialFont}
                >
                  {value}
                </dd>
                <dt className="max-w-[140px] text-[11px] leading-5 text-muted-foreground sm:text-xs">
                  {label}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        <section
          id="kit"
          aria-labelledby="kit-title"
          className={cn(sectionWidth, "scroll-mt-8 py-16 sm:py-24 lg:py-28")}
        >
          <div
            data-motion="reveal"
            className="mb-10 flex flex-col justify-between gap-6 sm:mb-14 lg:flex-row lg:items-end"
          >
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
                {l(
                  "01 / More than a first screen",
                  "01 / Más allá de la primera pantalla",
                )}
              </p>
              <h2
                id="kit-title"
                className="max-w-2xl text-4xl font-normal leading-[1.1] tracking-[-.035em] sm:text-5xl lg:text-[56px]"
                style={editorialFont}
              >
                {l("From a first impression", "De la primera impresión")}
                <br />
                <span className="text-muted-foreground italic">
                  {l("to the work that follows.", "al trabajo de cada día.")}
                </span>
              </h2>
            </div>
            <p className="max-w-[350px] text-sm leading-7 text-muted-foreground">
              {l(
                "The details between screens matter. Explore a suite where setup, daily operations and visual expression share a foundation.",
                "Los detalles entre pantallas importan. Explora una suite donde configuración, trabajo diario y expresión visual comparten una base.",
              )}
            </p>
          </div>
          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.28fr)] lg:gap-14">
            <div data-motion="reveal" className="min-w-0">
              <ol
                aria-label={l(
                  "Explore the product workflows",
                  "Explora los flujos del producto",
                )}
                className="divide-y divide-border border-y border-border"
              >
                {workflows.map((item, index) => (
                  <li key={item.page}>
                    <button
                      type="button"
                      onClick={() => setWorkflow(index)}
                      aria-pressed={workflow === index}
                      className={cn(
                        "flex w-full items-start gap-4 py-6 text-left transition-colors hover:text-primary sm:gap-5",
                        workflow === index
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                          workflow === index
                            ? "border-primary/40 bg-accent text-primary"
                            : "border-border",
                        )}
                      >
                        0{index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold">
                          {item.label}
                        </span>
                        <span className="mt-2 block text-xs leading-6 text-muted-foreground">
                          {item.detail}
                        </span>
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className={cn(
                          "mt-1 size-4 shrink-0",
                          workflow === index ? "text-primary" : "opacity-40",
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ol>
              <div className="mt-7 rounded-2xl border border-border/80 bg-surface/40 p-5">
                <p className="inline-flex items-center gap-2 text-xs font-semibold">
                  <Layers aria-hidden="true" className="size-4 text-primary" />
                  {l("Connected in the demo", "Conectado en la demo")}
                </p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {l(
                    "Explore with sample data in your browser. Reusable blocks accept data and callbacks from your application.",
                    "Explora con datos de ejemplo en tu navegador. Los bloques reutilizables reciben datos y callbacks de tu aplicación.",
                  )}
                </p>
                <Link
                  prefetch={false}
                  href={href("docs/adapters")}
                  className={cn(textLink, "mt-3 text-xs")}
                >
                  {l(
                    "Read the integration contracts",
                    "Leer los contratos de integración",
                  )}
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              </div>
            </div>
            <div data-motion="reveal" className="min-w-0">
              <Screenshot
                page={selectedWorkflow.page}
                title={`0${workflow + 1} / ${selectedWorkflow.label}`}
                alt={l(
                  `Aureform ${selectedWorkflow.page} screen in English with sample workspace data.`,
                  `Pantalla ${selectedWorkflow.page} de Aureform, en inglés, con datos de ejemplo.`,
                )}
                href={href(selectedWorkflow.path)}
                light={light}
              />
              <div className="mt-7 grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <h3 className="text-xl font-semibold tracking-[-.025em]">
                    {selectedWorkflow.title}
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
                    {selectedWorkflow.description}
                  </p>
                </div>
                <Link
                  prefetch={false}
                  href={href(selectedWorkflow.path)}
                  className={cn(textLink, "mt-1 text-xs")}
                >
                  {selectedWorkflow.action}
                  <ArrowUpRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>
          </div>
          <div
            data-motion="reveal"
            className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground"
          >
            <p>
              {l(
                "Dashboards. Data. Tasks. Conversations. One visual language.",
                "Dashboards. Datos. Tareas. Conversaciones. Un mismo lenguaje visual.",
              )}
            </p>
            <Link
              prefetch={false}
              href={href("templates")}
              className={cn(textLink, "text-xs text-foreground")}
            >
              {l("See all templates", "Ver todas las plantillas")}
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </section>

        <section
          id="integrations"
          aria-labelledby="integrations-title"
          className={cn(sectionWidth, "pb-16 sm:pb-24")}
        >
          <div className="af-shadow-floating relative isolate overflow-hidden rounded-3xl border border-border bg-surface p-6 sm:p-10 lg:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(ellipse at top right, color-mix(in srgb, var(--primary) 12%, transparent), transparent 65%)" }} />
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
              <div className="min-w-0">
                <Badge appearance="soft">{l("New in 1.5 · 17 workflow families", "Nuevo en 1.5 · 17 familias de flujos")}</Badge>
                <h2 id="integrations-title" className="mt-5 text-3xl font-normal leading-[1.12] tracking-[-.035em] sm:text-4xl lg:text-5xl" style={editorialFont}>
                  {l("Your services.", "Tus servicios.")}
                  <br />
                  <span className="italic text-muted-foreground">{l("A considered interface.", "Una interfaz cuidada.")}</span>
                </h2>
                <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground">
                  {l(
                    "Explore 65 working frontend recipes for identity, data, commerce, AI and everyday operations. Try the local workflows, then supply your application's connections.",
                    "Explora 65 recetas frontend funcionales para identidad, datos, comercio, AI y operaciones diarias. Prueba los flujos locales y conecta los servicios de tu aplicación.",
                  )}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link prefetch={false} href={href("integrations")} className={buttonVariants({ size: "lg" })}>
                    {l("Explore integrations", "Explorar integraciones")}<ArrowUpRight aria-hidden="true" />
                  </Link>
                  <Link prefetch={false} href={href("docs/integrations")} className={buttonVariants({ variant: "outline", size: "lg" })}>
                    {l("Connection guide", "Guía de conexión")}<BookOpen aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div className="min-w-0 lg:pt-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Supabase", l("Connected tables", "Tablas conectadas"), "supabase-data"],
                    ["Clerk", l("Accounts & teams", "Cuentas y equipos"), "clerk"],
                    ["Stripe", l("Products & billing", "Productos y cobros"), "stripe"],
                    ["OpenAI", l("Streaming & tools", "Streaming y herramientas"), "openai-responses"],
                    [
                      "Resend",
                      l("Email workflows", "Flujos de correo"),
                      "resend-react-email",
                    ],
                    ["Cloudflare", l("Agents & checkpoints", "Agentes y checkpoints"), "cloudflare-agents"],
                  ].map(([name, detail, path]) => (
                    <Link prefetch={false} key={path} href={href(`integrations/${path}`)} className="af-hover-card group min-w-0 rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold">{name}<ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" /></span>
                      <span className="mt-2 block text-xs leading-5 text-muted-foreground">{detail}</span>
                    </Link>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-6 text-muted-foreground">{l("86 provider choices · local mocks · replaceable adapters", "86 opciones de proveedor · mocks locales · adaptadores reemplazables")}</p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="appearance"
          aria-labelledby="appearance-title"
          className="relative isolate border-y border-border/60 bg-surface/35"
        >
          <div
            className={cn(
              sectionWidth,
              "grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:py-28",
            )}
          >
            <div data-motion="reveal" className="min-w-0">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
                {l("02 / Your visual signature", "02 / Tu identidad visual")}
              </p>
              <h2
                id="appearance-title"
                className="text-4xl font-normal leading-[1.1] tracking-[-.035em] sm:text-5xl lg:text-[56px]"
                style={editorialFont}
              >
                {l("A system with character.", "Un sistema con carácter.")}
                <br />
                <span className="text-muted-foreground italic">
                  {l("Make it yours.", "Hazlo tuyo.")}
                </span>
              </h2>
              <p className="mt-6 max-w-lg text-sm leading-8 text-muted-foreground sm:text-base">
                {l(
                  "Six palettes, light and dark. Fine-tune color, materials, type, gradients and motion in Studio. Your choices travel across the interface.",
                  "Seis paletas, claro y oscuro. Ajusta colores, materiales, tipografía, gradientes y movimiento en Studio. Tus elecciones acompañan toda la interfaz.",
                )}
              </p>
              <fieldset className="mt-8">
                <legend className="mb-4 text-xs font-semibold">
                  {l("Choose a color palette", "Elige una paleta de colores")}
                </legend>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {palettePresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => choosePalette(preset.id)}
                      aria-pressed={appearance.palette === preset.id}
                      aria-label={l(
                        `Use ${preset.name} palette`,
                        `Usar paleta ${paletteNames[preset.id]}`,
                      )}
                      className={cn(
                        "min-w-0 rounded-xl border bg-background/65 px-2.5 py-3 text-left transition-colors sm:px-3",
                        appearance.palette === preset.id
                          ? "border-primary ring-1 ring-primary/25"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="mb-2.5 flex -space-x-1"
                      >
                        {preset.colors.map((color) => (
                          <span
                            key={color}
                            className="size-5 rounded-full border-2 border-surface sm:size-6"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </span>
                      <span className="flex items-center justify-between gap-1 text-[11px] font-semibold sm:text-xs">
                        {l(preset.name, paletteNames[preset.id])}
                        {appearance.palette === preset.id && (
                          <Check
                            aria-hidden="true"
                            className="size-3 shrink-0 text-primary"
                          />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <p className="mt-4 text-xs leading-6 text-muted-foreground">
                {l(
                  "Change a palette. Watch the live preview follow.",
                  "Cambia la paleta y observa la vista en vivo.",
                )}
              </p>
              <div className="mt-7 flex flex-wrap gap-5">
                <Link
                  prefetch={false}
                  href={href("studio")}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <SlidersHorizontal aria-hidden="true" />
                  {l("Open Studio", "Abrir Studio")}
                  <ArrowUpRight aria-hidden="true" />
                </Link>
                <Link
                  prefetch={false}
                  href={href("effects")}
                  className={textLink}
                >
                  {l("Explore the effects", "Explorar los efectos")}
                  <WandSparkles aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>
            <div
              data-motion="reveal"
              className="relative min-w-0 pb-5 sm:pl-7 sm:pt-7"
            >
              <div
                aria-hidden="true"
                className="absolute bottom-0 left-0 top-16 w-2/3 rotate-[-3deg] rounded-[28px] border border-primary/20 bg-accent/40"
              />
              <GlowBorder
                colors={colors}
                className="relative rounded-[24px] p-0"
              >
                <div className="relative isolate min-w-0 overflow-hidden rounded-[24px] border border-border bg-surface">
                  <div className="relative h-52 overflow-hidden sm:h-64">
                    <ShaderBackground
                      kind={appearance.shader.kind}
                      colors={colors}
                      speed={appearance.shader.speed}
                      scale={appearance.shader.scale}
                      intensity={appearance.shader.intensity}
                      paused={
                        appearance.shader.paused || appearance.motion === "off"
                      }
                      className="h-full w-full rounded-none"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,var(--surface),transparent_75%)]" />
                    <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
                      <div className="flex items-center justify-between gap-3">
                        <AureformMark className="size-8 text-foreground" />
                        <Badge
                          variant="outline"
                          className="bg-surface/80 backdrop-blur-sm"
                        >
                          {l("Live preview", "Vista en vivo")}
                        </Badge>
                      </div>
                      <p
                        className="text-4xl font-normal leading-none tracking-[-.035em] sm:text-5xl"
                        style={editorialFont}
                      >
                        {l("A little more you.", "Más de ti.")}
                      </p>
                    </div>
                  </div>
                  <div className="p-6 pt-4 sm:p-8 sm:pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <Palette
                          aria-hidden="true"
                          className="size-4 text-primary"
                        />
                        {l(
                          activePalette.name,
                          paletteNames[appearance.palette],
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {light
                          ? l("Light mode", "Modo claro")
                          : l("Dark mode", "Modo oscuro")}
                      </span>
                    </div>
                    <div className="grid gap-4 py-5 min-[400px]:grid-cols-[84px_minmax(0,1fr)]">
                      <Image
                        src={publicPath("/assets/art/goodform.webp")}
                        alt={l(
                          "Included artwork: sculptural amber and pale green forms on lavender.",
                          "Arte incluido: formas escultóricas ámbar y verde claro sobre lavanda.",
                        )}
                        width={1536}
                        height={1024}
                        unoptimized
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                      <div className="min-w-0 self-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                          Aureform Studio
                        </p>
                        <h3 className="mt-1.5 text-lg font-semibold tracking-[-.025em]">
                          {l(
                            "Your product. Your signature.",
                            "Tu producto. Tu identidad.",
                          )}
                        </h3>
                        <p className="mt-2 text-xs leading-6 text-muted-foreground">
                          {l(
                            "The same foundation. A new expression.",
                            "La misma base. Una nueva expresión.",
                          )}
                        </p>
                      </div>
                    </div>
                    <div aria-hidden="true" className="grid grid-cols-3 gap-2">
                      {colors.map((color, index) => (
                        <div
                          key={index}
                          className="h-2.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        prefetch={false}
                        href={href("components")}
                        className={buttonVariants({ size: "sm" })}
                      >
                        {l("Explore components", "Explorar componentes")}
                        <ArrowUpRight aria-hidden="true" />
                      </Link>
                      <Link
                        prefetch={false}
                        href={href("themes")}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        {l("Theme gallery", "Galería de temas")}
                      </Link>
                    </div>
                  </div>
                </div>
              </GlowBorder>
            </div>
          </div>
        </section>

        <section
          id="installation"
          aria-labelledby="installation-title"
          className={cn(
            sectionWidth,
            "grid min-w-0 items-start gap-10 py-16 sm:py-24 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:gap-16 lg:py-28",
          )}
        >
          <div data-motion="reveal" className="min-w-0 lg:pt-5">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
              {l("03 / A foundation you own", "03 / Una base que te pertenece")}
            </p>
            <h2
              id="installation-title"
              className="text-4xl font-normal leading-[1.1] tracking-[-.035em] sm:text-5xl lg:text-[56px]"
              style={editorialFont}
            >
              {l("From here,", "Desde aquí,")}
              <br />
              <span className="text-muted-foreground italic">
                {l("it's your code.", "el código es tuyo.")}
              </span>
            </h2>
            <p className="mt-6 max-w-lg text-sm leading-8 text-muted-foreground sm:text-base">
              {l(
                "Take the complete source or install a component from the registry. Keep the pieces you need, shape the rest, and connect your own application.",
                "Descarga el código completo o instala un componente del registro. Elige las piezas que necesitas, adapta el resto y conecta tu aplicación.",
              )}
            </p>
            <ul className="mt-7 grid gap-3 text-sm">
              {[
                l(
                  "Original source under Apache 2.0",
                  "Código original bajo Apache 2.0",
                ),
                l(
                  "TypeScript · Next.js · Tailwind · Base UI",
                  "TypeScript · Next.js · Tailwind · Base UI",
                ),
                l(
                  "English and Spanish, light and dark",
                  "Inglés y español, claro y oscuro",
                ),
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Check
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-primary"
                  />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-5">
              <a
                href={downloadUrl}
                download
                className={buttonVariants({ variant: "outline" })}
              >
                <Download aria-hidden="true" />
                {l("Download the source", "Descargar el código")}
              </a>
              <a href={githubUrl} className={textLink}>
                GitHub
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </a>
            </div>
          </div>
          <div data-motion="reveal" className="min-w-0">
            <div className="af-shadow-elevated min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
                <span className="inline-flex items-center gap-2 text-xs font-semibold">
                  <Terminal
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                  {l("A good place to begin", "Un buen lugar para empezar")}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  v{kitVersion}
                </span>
              </div>
              <Tabs
                value={installMethod}
                onValueChange={(value) => {
                  if (value === "source" || value === "registry") {
                    setInstallMethod(value);
                    setCopyError("");
                  }
                }}
                className="min-w-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
                  <TabsList
                    aria-label={l(
                      "Installation method",
                      "Método de instalación",
                    )}
                    className="border-0 bg-background/65"
                  >
                    <TabsTrigger value="source">
                      {l("Full source", "Código completo")}
                    </TabsTrigger>
                    <TabsTrigger value="registry">
                      {l("One component", "Un componente")}
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={l(
                      "Copy installation commands",
                      "Copiar comandos de instalación",
                    )}
                    onClick={() => void copyCommands()}
                  >
                    {copied && copiedMethod === installMethod ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Copy aria-hidden="true" />
                    )}
                    {copied && copiedMethod === installMethod
                      ? t("copied")
                      : t("copy")}
                  </Button>
                </div>
                {(["source", "registry"] as const).map((method) => (
                  <TabsContent
                    key={method}
                    value={method}
                    className="mt-0 rounded-none"
                  >
                    <pre
                      tabIndex={0}
                      aria-label={
                        method === "source"
                          ? l(
                              "Commands to run the full Aureform source",
                              "Comandos para ejecutar el código completo de Aureform",
                            )
                          : l(
                              "Command to install a registry component",
                              "Comando para instalar un componente del registro",
                            )
                      }
                      className="min-w-0 max-w-full overflow-x-auto px-5 py-6 text-[11px] leading-8 sm:px-6 sm:text-[13px]"
                    >
                      <code>
                        {method === "source"
                          ? sourceCommands
                          : registryCommands}
                      </code>
                    </pre>
                    <div className="border-t border-border bg-background/35 px-5 py-4 sm:px-6">
                      <p className="text-xs leading-6 text-muted-foreground">
                        {method === "source"
                          ? l(
                              "Node.js 22.18+ and pnpm 10. Open localhost:3000/en/ or /es/. The local demo needs no API keys.",
                              "Node.js 22.18+ y pnpm 10. Abre localhost:3000/en/ o /es/. La demo local no requiere API keys.",
                            )
                          : l(
                              "For a Next.js / Tailwind 4 project with shadcn configured. Read the provider and style requirements for the blocks you choose.",
                              "Para un proyecto Next.js / Tailwind 4 con shadcn configurado. Revisa los proveedores y estilos que requieren tus bloques.",
                            )}
                      </p>
                      {method === "registry" && (
                        <a
                          href="https://terrizoaguimor.github.io/aureform-ui/r/button.json"
                          target="_blank"
                          rel="noreferrer"
                          className={cn(textLink, "mt-2 text-xs")}
                        >
                          {l("GitHub Pages backup", "Respaldo en GitHub Pages")}
                          <ArrowUpRight
                            aria-hidden="true"
                            className="size-3.5"
                          />
                        </a>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
            <p
              role="status"
              aria-live="polite"
              className="mt-3 min-h-6 text-xs leading-6 text-muted-foreground"
            >
              {copyError ||
                (copied && copiedMethod === installMethod
                  ? l(
                      "Installation commands copied.",
                      "Comandos de instalación copiados.",
                    )
                  : "")}
            </p>
            <Link
              prefetch={false}
              href={href("docs/cli")}
              className={cn(textLink, "mt-1 text-xs")}
            >
              {l("Read the installation guide", "Leer la guía de instalación")}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </section>

        <section
          id="documentation"
          aria-labelledby="documentation-title"
          className="border-y border-border/60 bg-surface/40"
        >
          <div
            className={cn(
              sectionWidth,
              "grid min-w-0 gap-10 py-16 sm:py-24 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)] lg:gap-16",
            )}
          >
            <div data-motion="reveal" className="min-w-0">
              <div className="mb-5 inline-flex size-12 items-center justify-center rounded-2xl border border-[#b99557]/30 bg-[#b99557]/10">
                <BookOpen
                  aria-hidden="true"
                  className="size-5 text-foreground"
                />
              </div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
                {l("The documentation", "La documentación")}
              </p>
              <h2
                id="documentation-title"
                className="text-4xl font-normal leading-[1.1] tracking-[-.035em] sm:text-5xl lg:text-[56px]"
                style={editorialFont}
              >
                {l("Built to be used.", "Creado para usarlo.")}
                <br />
                <span className="text-muted-foreground italic">
                  {l("And understood.", "Y para entenderlo.")}
                </span>
              </h2>
              <p className="mt-6 max-w-lg text-sm leading-8 text-muted-foreground sm:text-base">
                {l(
                  "Explore 24 documentation chapters, from foundations and practical examples to integration recipes and contracts. Articles are translated where available; otherwise, their original source language is shown.",
                  "Explora 24 capítulos de documentación: bases, ejemplos prácticos, recetas y contratos de integración. Los artículos tienen traducción cuando está disponible; en los demás se indica el idioma de la fuente original.",
                )}
              </p>
              <Link
                prefetch={false}
                href={href("docs")}
                className={cn(buttonVariants({ size: "lg" }), "mt-7")}
              >
                <BookOpen aria-hidden="true" />
                {l("Explore the documentation", "Explorar la documentación")}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
            <div data-motion="reveal" className="min-w-0 lg:pt-2">
              <nav
                aria-label={l("Documentation guides", "Guías de documentación")}
                className="divide-y divide-border border-y border-border"
              >
                {guides.map((guide, index) => (
                  <Link
                    prefetch={false}
                    key={guide.slug}
                    href={href(`docs/${guide.slug}`)}
                    className="group flex min-w-0 items-center gap-4 py-5 transition-colors hover:text-primary sm:gap-5 sm:py-6"
                  >
                    <span
                      aria-hidden="true"
                      className="text-[10px] text-muted-foreground"
                    >
                      0{index + 1}
                    </span>
                    <guide.icon
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {guide.title}
                      </span>
                      <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
                        {guide.detail}
                      </span>
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    />
                  </Link>
                ))}
              </nav>
              <div className="mt-6 rounded-xl border border-border/80 bg-background/40 p-4 sm:p-5">
                <p className="text-xs font-semibold">
                  {l(
                    "A frontend, ready for your services.",
                    "Un frontend listo para tus servicios.",
                  )}
                </p>
                <p className="mt-2 text-xs leading-7 text-muted-foreground">
                  {l(
                    "Auth and AI are clearly labeled local mocks. Stripe and Maps have optional consumer integration contracts. Your application supplies production identity, authorization and backend services.",
                    "Auth e IA son mocks locales identificados. Stripe y Maps tienen contratos de integración opcionales. Tu aplicación aporta identidad, autorización y servicios de backend de producción.",
                  )}
                </p>
                <Link
                  prefetch={false}
                  href={href("docs/adapters")}
                  className={cn(textLink, "mt-3 text-xs")}
                >
                  {l("Explore the contracts", "Explorar los contratos")}
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="closing-title"
          className="relative isolate overflow-hidden"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <GradientBackground
              kind="mesh"
              colors={colors}
              intensity={0.17}
              className="h-full w-full rounded-none"
            />
          </div>
          <div
            className={cn(
              sectionWidth,
              "relative flex flex-col items-center py-20 text-center sm:py-28",
            )}
          >
            <AureformMark className="mb-7 size-10 text-primary" />
            <p
              data-motion="reveal"
              className="mb-5 text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground"
            >
              Aureform UI / {kitVersion}
            </p>
            <h2
              id="closing-title"
              data-motion="reveal"
              className="max-w-3xl text-5xl font-normal leading-[1.05] tracking-[-.04em] sm:text-6xl lg:text-7xl"
              style={editorialFont}
            >
              {l("Make something", "Crea algo")}
              <br />
              <span className="text-muted-foreground italic">
                {l("worth making.", "que valga la pena.")}
              </span>
            </h2>
            <p
              data-motion="reveal"
              className="mt-6 max-w-xl text-sm leading-8 text-muted-foreground sm:text-base"
            >
              {l(
                "The components. The workflows. The space to make it yours. A considered beginning for whatever you build next.",
                "Los componentes. Los flujos. El espacio para hacerlos tuyos. Un comienzo cuidado para lo que construyas después.",
              )}
            </p>
            <div
              data-motion="reveal"
              className="mt-8 flex w-full flex-col justify-center gap-3 min-[480px]:w-auto min-[480px]:flex-row"
            >
              <a
                href={downloadUrl}
                download
                className={buttonVariants({ size: "lg" })}
              >
                <Download aria-hidden="true" />
                {l("Get Aureform UI", "Descargar Aureform UI")}
              </a>
              <a
                href={figmaUrl}
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <Figma aria-hidden="true" />
                {l("Open in Figma", "Abrir en Figma")}
                <ArrowUpRight aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div
          className={cn(
            sectionWidth,
            "grid gap-10 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_auto]",
          )}
        >
          <div>
            <Link
              prefetch={false}
              href={`/${locale}/`}
              aria-label="Aureform UI"
            >
              <Brand />
            </Link>
            <p className="mt-4 max-w-xs text-xs leading-6 text-muted-foreground">
              {l(
                "A thoughtful interface system. Open source, and open to your next idea.",
                "Un sistema de interfaces con intención. Código abierto para tu próxima idea.",
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-7 gap-y-6 sm:grid-cols-3 sm:gap-x-12">
            {[
              {
                title: l("Explore", "Explora"),
                links: [
                  [l("Live demo", "Demo en vivo"), href("dashboard")],
                  [l("Templates", "Plantillas"), href("templates")],
                  ["Studio", href("studio")],
                  [l("Effects", "Efectos"), href("effects")],
                ],
              },
              {
                title: l("Learn", "Aprende"),
                links: [
                  [l("Documentation", "Documentación"), href("docs")],
                  [l("Quality", "Calidad"), href("quality")],
                  [l("Installation", "Instalación"), href("docs/cli")],
                  [l("Tokens & themes", "Tokens y temas"), href("docs/tokens")],
                  [
                    l("Integration contracts", "Contratos de integración"),
                    href("docs/adapters"),
                  ],
                ],
              },
            ].map((group) => (
              <nav
                key={group.title}
                aria-label={group.title}
                className="grid content-start gap-3"
              >
                <p className="mb-1 text-xs font-semibold">{group.title}</p>
                {group.links.map(([label, url]) => (
                  <Link
                    prefetch={false}
                    key={url}
                    href={url}
                    className="w-fit text-xs leading-6 text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            ))}
            <nav
              aria-label={l("Source & design", "Código y diseño")}
              className="grid content-start gap-3"
            >
              <p className="mb-1 text-xs font-semibold">
                {l("Source & design", "Código y diseño")}
              </p>
              <a
                href={githubUrl}
                className="w-fit text-xs leading-6 text-muted-foreground hover:text-foreground hover:underline"
              >
                GitHub
              </a>
              <a
                href={sponsorsUrl}
                className="inline-flex w-fit items-center gap-1.5 text-xs leading-6 text-muted-foreground hover:text-primary hover:underline"
              >
                <Heart className="size-3" aria-hidden="true" />
                {l("Sponsors", "Patrocinar")}
              </a>
              <a
                href={figmaUrl}
                className="w-fit text-xs leading-6 text-muted-foreground hover:text-foreground hover:underline"
              >
                Figma
              </a>
              <a
                href={`${githubUrl}/releases/tag/v${kitVersion}`}
                className="w-fit text-xs leading-6 text-muted-foreground hover:text-foreground hover:underline"
              >
                {l("Release", "Versión")} {kitVersion}
              </a>
              <Link
                prefetch={false}
                href={href("docs/license")}
                className="w-fit text-xs leading-6 text-muted-foreground hover:text-foreground hover:underline"
              >
                Apache 2.0
              </Link>
            </nav>
          </div>
        </div>
        <div
          className={cn(
            sectionWidth,
            "flex flex-wrap items-center justify-between gap-3 border-t border-border/60 py-6 text-[10px] leading-5 text-muted-foreground sm:text-xs",
          )}
        >
          <p>
            © 2026 Aureform UI ·{" "}
            {l(
              "Original source under Apache 2.0",
              "Código original bajo Apache 2.0",
            )}
          </p>
          <p>
            {l(
              "English + Spanish · Light + dark",
              "Inglés + español · Claro + oscuro",
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
