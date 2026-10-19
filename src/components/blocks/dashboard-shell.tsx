"use client";
import { publicPath } from "@/lib/public-path";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ChevronDown,
  Command as CommandIcon,
  Globe2,
  LogOut,
  Menu,
  Sun,
  Building2,
  CircleHelp,
  Boxes,
  CalendarDays,
  KanbanSquare,
  Mail,
  FolderOpen,
  Package,
  CreditCard,
  MapPin,
  ShoppingBag,
  ShieldCheck,
  Terminal,
  CheckCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  ListChecks,
  Plus,
  LogIn,
  UserPlus,
  KeyRound,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { AppearanceControls } from "@/components/appearance-controls";
import { DesignIcon, type DesignIconName } from "@/components/design-icon";
import { Sidebar, type SidebarGroup } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Command } from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { useTheme } from "@/components/providers";
import { useLanguage } from "@/hooks/use-language";
import { useDemoStore } from "@/hooks/use-demo-store";
import { useWorkspace } from "@/components/workspace-provider";
import { kitVersion, routes } from "@/lib/catalog";
import { demoAvatarSources } from "@/demo/avatar-assets";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ShellLayout =
  "sidebar" | "compact" | "topbar" | "split" | "centered" | "floating";
export function DashboardShell({
  children,
  path,
  layout = "sidebar",
}: {
  children: ReactNode;
  path: string;
  layout?: ShellLayout;
}) {
  const { locale, common: t, l } = useLanguage();
  const { theme, setTheme } = useTheme(),
    router = useRouter();
  const [mobile, setMobile] = useState(false),
    [command, setCommand] = useState(false),
    [commandSearch, setCommandSearch] = useState(""),
    [resetOpen, setResetOpen] = useState(false);
  const {
    workspace,
    workspaces,
    workspaceId,
    setWorkspace,
    customers,
    setOnboarding,
    ready: workspaceReady,
  } = useWorkspace();
  const [seen, setSeen] = useDemoStore("notifications-seen", false);
  const shellRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const compact = layout === "compact",
    topbar = layout === "topbar",
    centered = layout === "centered";
  const current = routes.find((route) => route.path === path);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const horizontal = navigationRef.current;
      const navigation =
        horizontal ??
        (mobile
          ? document.querySelector<HTMLElement>(".af-shell-mobile-sidebar nav")
          : shellRef.current?.querySelector<HTMLElement>(
              ".af-shell-sidebar nav",
            ));
      const active = navigation?.querySelector<HTMLElement>(
        '[aria-current="page"]',
      );
      if (!navigation || !active || navigation.clientHeight === 0) return;
      const bounds = navigation.getBoundingClientRect();
      const activeBounds = active.getBoundingClientRect();
      if (horizontal) {
        const left =
          activeBounds.left -
          bounds.left +
          navigation.scrollLeft -
          (navigation.clientWidth - active.offsetWidth) / 2;
        navigation.scrollTo({ left: Math.max(0, left), behavior: "auto" });
      } else if (
        activeBounds.top < bounds.top ||
        activeBounds.bottom > bounds.bottom
      ) {
        const top =
          activeBounds.top -
          bounds.top +
          navigation.scrollTop -
          (navigation.clientHeight - active.offsetHeight) / 2;
        navigation.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [path, layout, mobile]);
  const href = (target: string) => `/${locale}/${target}/`;
  const link = (
    target: string,
    label: string,
    icon: ReactNode,
    badge?: ReactNode,
  ) => ({
    href: href(target),
    label,
    icon,
    badge,
    active: path === target,
  });
  const di = (name: DesignIconName) => <DesignIcon name={name} />;
  const groups: SidebarGroup[] = [
    {
      label: t("workspace"),
      items: [
        link("dashboard", t("dashboard"), di("layout-dashboard")),
        link("onboarding", l("Get started", "Primeros pasos"), <ListChecks />),
        link("analytics", t("analytics"), di("chart")),
        link(
          "ai",
          t("ai"),
          di("sparkles"),
          <Badge className="px-1.5 py-0 text-[11px]">AI</Badge>,
        ),
        link("customers", t("customers"), di("users")),
        link("imports", l("Import data", "Importar datos"), <Upload />),
      ],
    },
    {
      label: t("designSystem"),
      items: [
        link("components", t("components"), di("layers")),
        link("blocks", t("blocks"), <Boxes className="size-4" />),
        link("templates", t("templates"), di("layout-dashboard")),
        link(
          "studio",
          l("Appearance Studio", "Estudio de apariencia"),
          <SlidersHorizontal />,
        ),
        ...(routes.some((route) => route.path === "effects")
          ? [link("effects", l("Effects", "Efectos"), <Sparkles />)]
          : []),
        link("docs", t("docs"), di("book-open")),
      ],
    },
    {
      label: t("applications"),
      collapsible: true,
      open:
        compact ||
        current?.group === "application" ||
        (current !== undefined && current.delivery !== "1.0"),
      items: [
        link("tasks", l("Task board", "Tablero de tareas"), <KanbanSquare />),
        link("calendar", l("Calendar", "Calendario"), <CalendarDays />),
        link("mail", l("Inbox", "Bandeja de entrada"), <Mail />),
        link("files", l("Files", "Archivos"), <FolderOpen />),
        link("products", l("Products", "Productos"), <Package />),
        link("orders", l("Orders", "Pedidos"), <ShoppingBag />),
        link("invoices", l("Invoices", "Facturas"), <CreditCard />),
        link(
          "settings/billing",
          l("Billing & plans", "Facturación y planes"),
          <CreditCard />,
        ),
        link("maps", l("Maps", "Mapas"), <MapPin />),
        link("support", l("Support", "Soporte"), <CircleHelp />),
      ],
    },
    {
      label: l("Authentication", "Autenticación"),
      items: [
        link("auth/sign-in", l("Sign in", "Iniciar sesión"), <LogIn />),
        link("auth/sign-up", l("Create account", "Crear cuenta"), <UserPlus />),
        link(
          "auth/reset-password",
          l("Reset password", "Restablecer contraseña"),
          <KeyRound />,
        ),
        link(
          "auth/verify",
          l("Verify code", "Verificar código"),
          <ShieldCheck />,
        ),
      ],
    },
    {
      label: l("Manage", "Administrar"),
      items: [
        link("settings/workspace", l("Workspace", "Workspace"), <Building2 />),
        link("settings/profile", t("settings"), di("settings")),
        link("settings/team", t("team"), di("users")),
      ],
    },
  ];
  // Keep the actual route visible, including less common application screens.
  if (
    current &&
    !groups.some((group) => group.items.some((item) => item.active))
  ) {
    const groupIndex =
      current.group === "catalog"
        ? 1
        : current.group === "application"
          ? 2
          : current.group === "settings"
            ? 4
            : current.group === "auth"
              ? 3
              : 0;
    groups[groupIndex].items.push(
      link(
        path,
        current[locale],
        di(
          current.group === "ai"
            ? "sparkles"
            : current.group === "settings"
              ? "settings"
              : current.group === "catalog"
                ? "layers"
                : "layout-dashboard",
        ),
      ),
    );
    if (groups[groupIndex].collapsible) groups[groupIndex].open = true;
  }
  const primaryNavigation = groups.flatMap((group) => group.items);
  const workspaceControl = (
    <DropdownMenu>
      <DropdownMenuTrigger className="af-shadow-soft flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-accent/30 p-3 text-left outline-none transition-colors hover:bg-accent/55 focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-accent text-primary">
          <Building2 className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">
            {workspace.name}
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {workspace.organizationName}
          </span>
        </span>
        <ChevronDown
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("workspace")}</DropdownMenuLabel>
          {workspaces.map((item) => (
            <DropdownMenuItem
              key={item.id}
              disabled={!workspaceReady}
              onClick={() => setWorkspace(item.id)}
            >
              <Building2 className="size-4" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              {workspaceId === item.id && (
                <CheckCheck className="size-4 text-primary" aria-hidden />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!workspaceReady}
          onClick={() => {
            setOnboarding({
              step: 0,
              organizationName: workspace.organizationName,
              workspaceName: "",
              workspaceSlug: "",
              invites: [],
              completed: false,
            });
            router.push(href("onboarding"));
          }}
        >
          <Plus className="size-4" aria-hidden />
          {l("Create workspace", "Crear workspace")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const profileMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={
          compact
            ? `AM — ${t("profile")}`
            : `AM Alex Morgan alex@studio.demo — ${t("profile")}`
        }
      >
        <Avatar
          name="Alex Morgan"
          src={demoAvatarSources["alex-morgan"]}
          className="size-9 shrink-0 ring-2 ring-primary/15"
        />{" "}
        {!compact && (
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold">Alex Morgan</span>{" "}
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              alex@studio.demo
            </span>
          </span>
        )}
        <ChevronDown
          className="size-3 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => router.push(href("settings/profile"))}>
          {di("users")}
          {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(href("settings/preferences"))}
        >
          {di("settings")}
          {t("preferences")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(href("auth/sign-in"))}>
          <LogIn />
          {l("Sign in", "Iniciar sesión")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(href("auth/sign-up"))}>
          <UserPlus />
          {l("Create account", "Crear cuenta")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setResetOpen(true)}>
          <LogOut />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const sidebar = (isMobile = false) => (
    <Sidebar
      brand={
        <a href={publicPath(`/${locale}/`)} aria-label="Aureform UI">
          <Brand compact={compact && !isMobile} />
        </a>
      }
      compact={compact && !isMobile}
      workspace={compact && !isMobile ? undefined : workspaceControl}
      groups={groups}
      footer={
        <>
          {!compact && (
            <a
              href={publicPath(href("docs"))}
              className="af-surface-gradient group relative mb-4 block overflow-hidden rounded-xl border border-primary/20 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                aria-hidden="true"
                className="mb-3 inline-flex size-7 items-center justify-center rounded-lg bg-accent text-primary"
              >
                <Sparkles className="size-3.5" />
              </span>
              <p className="text-[13px] font-semibold tracking-tight">
                {l("Built for your next idea.", "Para tu próxima idea.")}
              </p>
              <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                {l(
                  "Your product. Your visual signature.",
                  "Tu producto. Tu identidad visual.",
                )}
              </p>
              <ArrowUpRight
                aria-hidden="true"
                className="absolute top-4 right-4 size-3.5 text-primary"
              />
            </a>
          )}
          {(!compact || isMobile) && (
            <Button
              variant="outline"
              size="sm"
              className="mb-3 w-full justify-start"
              onClick={() => {
                setMobile(false);
                setCommand(true);
              }}
            >
              <DesignIcon name="search" />
              {t("search")}
              <kbd className="ml-auto text-[11px] text-muted-foreground">
                ⌘ K
              </kbd>
            </Button>
          )}
          {profileMenu}
        </>
      }
      label={l("Main navigation", "Navegación principal")}
      onNavigate={() => setMobile(false)}
      className={cn(
        "af-shell-sidebar [&_nav]:px-3 [&_nav_a]:min-h-10 [&_nav_a]:rounded-lg [&_nav_a]:text-[13px] [&_nav_a]:leading-5 [&_nav_p]:text-[11px] [&_nav_summary]:py-1.5 [&_nav_summary]:text-[11px] [&_nav_a[aria-current=page]]:bg-accent [&_nav_a[aria-current=page]]:font-semibold [&_nav_a[aria-current=page]]:text-accent-foreground [&_nav_a[aria-current=page]]:shadow-[inset_3px_0_0_var(--primary)]",
        isMobile
          ? "af-shell-mobile-sidebar h-full w-full border-0"
          : cn(
              "fixed inset-y-0 left-0 z-30 hidden lg:flex",
              !compact && "w-64",
              layout === "floating" &&
                "af-shadow-floating inset-y-4 left-4 h-[calc(100dvh-32px)] rounded-2xl border border-primary/15 bg-surface/90 backdrop-blur-xl",
              layout === "split" &&
                "w-72 border-r-primary/20 bg-[image:var(--af-gradient-surface)] [&_nav]:px-5",
            ),
      )}
    />
  );
  return (
    <div
      ref={shellRef}
      data-shell={layout}
      className="min-h-dvh bg-background bg-[image:var(--af-gradient-hero)]"
    >
      <a
        href="#main-content"
        className="fixed top-2 left-2 z-100 -translate-y-20 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:translate-y-0"
      >
        {l("Skip to content", "Saltar al contenido")}
      </a>
      {!topbar && !centered && sidebar()}
      <div
        className={cn(
          !topbar &&
            !centered &&
            (compact
              ? "lg:ml-[76px]"
              : layout === "split"
                ? "lg:ml-72"
                : "lg:ml-64"),
          layout === "floating" && "lg:ml-[288px]",
        )}
      >
        <header
          className={cn(
            "sticky top-0 z-20 border-b border-border/80 bg-surface/85 backdrop-blur-xl",
            layout === "floating" &&
              "af-shadow-soft top-4 mx-4 mt-4 rounded-xl border sm:mx-8",
          )}
        >
          <div
            className={cn(
              "mx-auto flex min-h-[72px] w-full max-w-[1600px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6",
              centered && "max-w-6xl",
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Button
                aria-label={t("menu")}
                variant="ghost"
                size="icon-sm"
                className={!topbar && !centered ? "lg:hidden" : undefined}
                onClick={() => setMobile(true)}
              >
                <Menu aria-hidden="true" />
              </Button>
              {topbar || centered ? (
                <a
                  href={publicPath(`/${locale}/`)}
                  aria-label="Aureform UI"
                  className="shrink-0"
                >
                  <span className="sm:hidden">
                    <Brand compact />
                  </span>
                  <span className="hidden sm:inline-flex">
                    <Brand />
                  </span>
                </a>
              ) : (
                <div className="hidden min-w-0 sm:block">
                  <Breadcrumb
                    label={l("Breadcrumb", "Ruta de navegación")}
                    items={[
                      { label: t("workspace"), href: href("dashboard") },
                      { label: current?.[locale] ?? t("dashboard") },
                    ]}
                  />
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-border bg-surface-subtle/50 px-2.5 py-1.5 text-[11px] text-muted-foreground 2xl:flex">
                <span className="size-1.5 rounded-full bg-primary" />
                {t("demo")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="hidden gap-2 text-[13px] xl:inline-flex"
                onClick={() => setCommand(true)}
              >
                <DesignIcon name="search" />
                {l("Search", "Buscar")}
                <kbd className="ml-3 hidden items-center rounded border border-border px-1.5 py-0.5 text-[11px] opacity-70 xl:inline-flex">
                  <CommandIcon className="mr-0.5 size-2.5!" />K
                </kbd>
              </Button>
              <Button
                aria-label={t("search")}
                variant="ghost"
                size="icon-sm"
                className="hidden sm:inline-flex xl:hidden"
                onClick={() => setCommand(true)}
              >
                <DesignIcon name="search" />
              </Button>
              <AppearanceControls
                showLabel
                studioHref={`/${locale}/studio/`}
                className="border border-primary/20 bg-accent/35 text-accent-foreground hover:bg-accent/65"
              />
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`${locale.toUpperCase()} — ${t("language")}`}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold outline-none hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Globe2
                    className="hidden size-3.5 sm:block"
                    aria-hidden="true"
                  />
                  {locale.toUpperCase()}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => router.push(`/en/${path}/`)}>
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/es/${path}/`)}>
                    Español
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Tooltip content={t("toggleTheme")}>
                <Button
                  aria-label={t("toggleTheme")}
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                >
                  {theme === "light" ? <DesignIcon name="moon" /> : <Sun />}
                </Button>
              </Tooltip>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      aria-label={t("notifications")}
                      variant="ghost"
                      size="icon-sm"
                      className="relative hidden sm:inline-flex"
                    />
                  }
                >
                  <DesignIcon name="bell" />
                  {!seen && (
                    <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
                  )}
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-80 max-w-[calc(100vw-32px)]"
                >
                  <PopoverTitle className="text-sm font-semibold">
                    {t("notifications")}
                  </PopoverTitle>
                  <PopoverDescription className="mt-1 text-[13px] text-muted-foreground">
                    {l(
                      "Your demo workspace activity.",
                      "Actividad de tu espacio de demostración.",
                    )}
                  </PopoverDescription>
                  {seen ? (
                    <p className="py-8 text-center text-[13px] text-muted-foreground">
                      {l("You’re all caught up.", "Estás al día.")}
                    </p>
                  ) : (
                    <ul className="my-4 grid gap-3">
                      {[
                        l(
                          "October report is ready",
                          "El informe de octubre está listo",
                        ),
                        l(
                          "3 new customers joined",
                          "Se unieron 3 nuevos clientes",
                        ),
                        l(
                          "Your UI kit is up to date",
                          "Tu UI kit está actualizado",
                        ),
                      ].map((text) => (
                        <li key={text} className="flex gap-2 text-[13px]">
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                          {text}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setSeen(!seen)}
                  >
                    <CheckCheck />
                    {seen
                      ? l(
                          "Show demo notifications",
                          "Ver notificaciones de ejemplo",
                        )
                      : l("Mark all as read", "Marcar todas como leídas")}
                  </Button>
                </PopoverContent>
              </Popover>
              <a
                href={publicPath(href("settings/profile"))}
                aria-label={`AM — ${t("profile")}`}
                className="ml-1 hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring md:block"
              >
                <Avatar
                  name="Alex Morgan"
                  src={demoAvatarSources["alex-morgan"]}
                  className="size-8 text-[11px] ring-2 ring-primary/15"
                />
              </a>
            </div>
          </div>
        </header>
        {(topbar || centered) && (
          <nav
            ref={navigationRef}
            aria-label={l("Main navigation", "Navegación principal")}
            className={cn(
              "hide-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto border-b border-border bg-surface/65 px-4 py-3 sm:px-8",
              centered &&
                "mx-auto mt-5 max-w-6xl rounded-xl border bg-surface/80",
            )}
          >
            {primaryNavigation.map((item) => (
              <a
                key={item.href}
                href={publicPath(item.href)}
                aria-current={item.active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-transparent px-3 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4",
                  item.active
                    ? "border-primary/25 bg-accent font-semibold text-accent-foreground shadow-[inset_0_-2px_0_var(--primary)]"
                    : "font-medium text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
                )}
              >
                <span aria-hidden="true" className="flex items-center">
                  {item.icon}
                </span>
                {item.label}
              </a>
            ))}
          </nav>
        )}
        <main
          id="main-content"
          className={cn(
            "page-enter mx-auto min-w-0 max-w-[1600px] px-4 pt-7 pb-10 sm:px-8 sm:pt-9",
            centered && "max-w-6xl",
            path.startsWith("ai") && "max-w-none",
          )}
        >
          {children}
        </main>
        <footer
          data-no-print
          className="mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/65 py-5 text-[11px] text-muted-foreground sm:mx-8"
        >
          <span>{t("localDemo")}</span>
          <a
            href={publicPath(href("docs"))}
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            Aureform UI{" "}
            <span className="rounded-md border border-border bg-surface/65 px-1.5 py-0.5 text-[11px]">
              {kitVersion}
            </span>
          </a>
        </footer>
      </div>
      <Drawer open={mobile} onOpenChange={setMobile}>
        <DrawerContent
          className="left-0 right-auto w-[min(320px,calc(100%-24px))] p-0"
          closeLabel={t("close")}
        >
          <DrawerTitle className="sr-only">{t("menu")}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {t("workspace")}
          </DrawerDescription>
          {sidebar(true)}
        </DrawerContent>
      </Drawer>
      <Command
        open={command}
        onOpenChange={(open) => {
          setCommand(open);
          if (!open) setCommandSearch("");
        }}
        search={commandSearch}
        onSearchChange={setCommandSearch}
        label={t("search")}
        placeholder={t("search")}
        emptyLabel={t("empty")}
        closeLabel={t("close")}
        items={[
          ...routes.map((route) => ({
            id: route.path,
            label: route[locale],
            group:
              route.group === "catalog" ? t("designSystem") : t("workspace"),
            keywords: [route.path, route.en, route.es],
            icon:
              route.group === "ai" ? (
                <DesignIcon name="sparkles" />
              ) : route.group === "settings" ? (
                <ShieldCheck className="size-4" />
              ) : route.group === "catalog" ? (
                <Terminal className="size-4" />
              ) : (
                <DesignIcon name="layout-dashboard" />
              ),
            onSelect: () => router.push(href(route.path)),
          })),
          ...customers
            .filter((customer) => {
              const haystack =
                `${customer.name} ${customer.email} ${customer.company}`.toLocaleLowerCase(
                  locale,
                );
              return commandSearch
                .toLocaleLowerCase(locale)
                .trim()
                .split(/\s+/)
                .every((term) => haystack.includes(term));
            })
            .slice(0, 50)
            .map((customer) => ({
              id: `customer-${customer.id}`,
              label: customer.name,
              group: t("customers"),
              keywords: [customer.name, customer.email, customer.company],
              icon: <DesignIcon name="users" />,
              onSelect: () =>
                router.push(
                  `${href("customers/detail")}?id=${encodeURIComponent(customer.id)}`,
                ),
            })),
        ]}
      />
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent closeLabel={t("close")}>
          <DialogTitle>{l("Start fresh?", "¿Empezar de nuevo?")}</DialogTitle>
          <DialogDescription>
            {l(
              "This clears Aureform demo changes from this browser and restores the example data.",
              "Se borrarán los cambios de esta demo en el navegador y se restaurarán los datos de ejemplo.",
            )}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                try {
                  Object.keys(localStorage)
                    .filter(
                      (key) =>
                        key.startsWith("aureform:") && key !== "aureform:theme",
                    )
                    .forEach((key) => localStorage.removeItem(key));
                } catch {}
                try {
                  indexedDB.deleteDatabase("aureform-demo-files");
                } catch {}
                toast.success(l("Demo reset", "Demo restablecida"));
                window.location.href = publicPath(href("dashboard"));
              }}
            >
              {t("signOut")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
