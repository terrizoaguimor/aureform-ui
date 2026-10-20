"use client";
import { publicPath } from "@/lib/public-path";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useDemoStore } from "@/hooks/use-demo-store";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/components/providers";
import { PageHeading } from "@/components/blocks/page-heading";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/templates/data-manager";
import {
  MembersOperationsPanel,
  WorkspaceOperationsPanel,
} from "@/components/templates/saas-operations";
import { demoAvatarSources } from "@/demo/avatar-assets";
import { cn } from "@/lib/utils";
import { CommerceWorkspace } from "@/components/blocks/commerce-workspace";
import type { IntegrationHubProps } from "@/components/integrations/integration-hub";
const IntegrationHub = dynamic(() => import("@/components/integrations/integration-hub").then((module) => module.IntegrationHub));
const profileSeed = {
  name: "Alex Morgan",
  email: "alex@studio.demo",
  company: "Studio",
  role: "Product designer",
  bio: "Building thoughtful products, one considered detail at a time.",
  website: "https://example.com",
};
export function SettingsTemplate({ section, integrationHubProps }: { section: string; integrationHubProps?: IntegrationHubProps }) {
  const { l, common: t, locale } = useLanguage();
  const tabs = [
    ["workspace", l("Workspace", "Espacio de trabajo")],
    ["profile", t("profile")],
    ["team", t("team")],
    ["preferences", t("preferences")],
    ["billing", t("billing")],
    ["api-keys", t("apiKeys")],
    ["integrations", t("integrations")],
  ];
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l("Make it yours", "Hazlo tuyo")}
        title={t("settings")}
        description={l(
          "The details that make your workspace work for you.",
          "Los detalles que hacen que tu espacio funcione para ti.",
        )}
      />
      <nav
        aria-label={l("Settings sections", "Secciones de configuración")}
        className="flex gap-6 overflow-x-auto border-b border-border text-xs"
      >
        {tabs.map(([path, label]) => (
          <a
            key={path}
            href={publicPath(`/${locale}/settings/${path}/`)}
            aria-current={path === section ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-0.5 pb-3",
              path === section
                ? "border-primary font-semibold text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className={section === "integrations" ? "min-w-0" : "max-w-5xl"}>
        {section === "workspace" ? (
          <WorkspaceOperationsPanel />
        ) : section === "profile" ? (
          <ProfileSettings />
        ) : section === "team" ? (
          <MembersOperationsPanel />
        ) : section === "preferences" ? (
          <Preferences />
        ) : section === "billing" ? (
          <CommerceWorkspace mode="billing" />
        ) : section === "api-keys" ? (
          <ApiKeys />
        ) : (
          <IntegrationHub {...integrationHubProps} />
        )}
      </div>
    </div>
  );
}
function ProfileSettings() {
  const { l, common: t } = useLanguage(),
    [profile, setProfile] = useDemoStore("profile", profileSeed),
    [busy, setBusy] = useState(false);
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(
        2,
        l("Use at least two characters.", "Usa al menos dos caracteres."),
      ),
    email: z.email(l("Enter a valid email.", "Escribe un correo válido.")),
    company: z
      .string()
      .trim()
      .min(1, l("Enter a company name.", "Escribe una empresa.")),
    role: z.string(),
    bio: z
      .string()
      .max(
        400,
        l(
          "Keep the bio under 400 characters.",
          "La biografía debe tener menos de 400 caracteres.",
        ),
      ),
    website: z.union([
      z.url(l("Enter a complete URL.", "Escribe una URL completa.")),
      z.literal(""),
    ]),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: profile,
  });
  const save = form.handleSubmit(async (values) => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 250));
    setProfile(values);
    setBusy(false);
    toast.success(t("saved"));
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{l("Your profile", "Tu perfil")}</CardTitle>
        <CardDescription>
          {l(
            "A few details, thoughtfully presented.",
            "Unos cuantos detalles, presentados con cuidado.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid gap-5">
          <div className="flex items-center gap-4 border-b border-border pb-5">
            <Avatar
              name={form.watch("name") || "Alex Morgan"}
              src={demoAvatarSources["alex-morgan"]}
              className="size-16 text-lg"
            />
            <div>
              <p className="text-xs font-semibold">
                {l("Profile photo", "Foto de perfil")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {l(
                  "A personal touch for your workspace.",
                  "Un toque personal para tu espacio.",
                )}
              </p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={l("Full name", "Nombre completo")}
              error={form.formState.errors.name?.message}
            >
              <Input {...form.register("name")} autoComplete="name" />
            </Field>
            <Field
              label={l("Email", "Correo")}
              error={form.formState.errors.email?.message}
            >
              <Input
                type="email"
                {...form.register("email")}
                autoComplete="email"
              />
            </Field>
            <Field
              label={l("Company", "Empresa")}
              error={form.formState.errors.company?.message}
            >
              <Input {...form.register("company")} />
            </Field>
            <Field label={l("Role", "Cargo")}>
              <Input {...form.register("role")} />
            </Field>
          </div>
          <Field
            label={l("Bio", "Biografía")}
            description={l(
              "A little about you. Up to 400 characters.",
              "Un poco sobre ti. Hasta 400 caracteres.",
            )}
            error={form.formState.errors.bio?.message}
          >
            <Textarea {...form.register("bio")} maxLength={400} />
          </Field>
          <Field
            label={l("Website", "Sitio web")}
            error={form.formState.errors.website?.message}
          >
            <Input
              {...form.register("website")}
              type="url"
              placeholder="https://example.com"
            />
          </Field>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset(profile)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" loading={busy}>
              {t("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
function Preferences() {
  const { l, locale, common: t } = useLanguage(),
    { theme, setTheme } = useTheme(),
    router = useRouter();
  const [prefs, setPrefs, { ready }] = useDemoStore("preferences", {
    email: true,
    product: false,
    weekly: true,
    timezone: "America/Bogota",
    dateFormat: "medium",
    compact: false,
  });
  const [values, setValues] = useState(prefs);
  useEffect(() => {
    if (ready) setValues(prefs);
  }, [ready, prefs]);
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>{l("Your environment", "Tu entorno")}</CardTitle>
          <CardDescription>
            {l(
              "Small preferences. A more comfortable workspace.",
              "Pequeñas preferencias. Un espacio más cómodo.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Select
              label={l("Color theme", "Tema de color")}
              value={theme}
              onValueChange={(v) => setTheme(v as "light" | "dark")}
              options={[
                { value: "light", label: t("light") },
                { value: "dark", label: t("dark") },
              ]}
            />
            <Select
              label={t("language")}
              value={locale}
              onValueChange={(v) => router.push(`/${v}/settings/preferences/`)}
              options={[
                { value: "en", label: "English" },
                { value: "es", label: "Español" },
              ]}
            />
            <Select
              label={l("Timezone", "Zona horaria")}
              value={values.timezone}
              onValueChange={(v) => setValues((p) => ({ ...p, timezone: v }))}
              options={[
                { value: "America/Bogota", label: "Bogotá (UTC−5)" },
                { value: "America/New_York", label: "New York" },
                { value: "Europe/Madrid", label: "Madrid" },
                { value: "UTC", label: "UTC" },
              ]}
            />
            <Select
              label={l("Date format", "Formato de fecha")}
              value={values.dateFormat}
              onValueChange={(v) => setValues((p) => ({ ...p, dateFormat: v }))}
              options={[
                { value: "medium", label: l("Oct 18, 2026", "18 oct 2026") },
                { value: "short", label: l("10/18/2026", "18/10/2026") },
              ]}
            />
          </div>
          <div className="rounded-lg bg-surface-subtle p-4 text-xs">
            {l("Date preview", "Vista previa de fecha")}:{" "}
            <strong>
              {new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
                dateStyle: values.dateFormat === "short" ? "short" : "medium",
                timeStyle: "short",
                timeZone: values.timezone,
              }).format(new Date("2026-10-18T15:00:00Z"))}
            </strong>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{l("Keep in touch", "Mantente al día")}</CardTitle>
          <CardDescription>
            {l(
              "Choose the updates that feel useful.",
              "Elige las actualizaciones que te resultan útiles.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {[
            {
              key: "email" as const,
              title: l("Account notifications", "Notificaciones de cuenta"),
              desc: l(
                "Important workspace activity and security updates.",
                "Actividad importante y actualizaciones de seguridad.",
              ),
            },
            {
              key: "product" as const,
              title: l("Product updates", "Actualizaciones de producto"),
              desc: l(
                "New components, templates and improvements.",
                "Nuevos componentes, plantillas y mejoras.",
              ),
            },
            {
              key: "weekly" as const,
              title: l("Weekly summary", "Resumen semanal"),
              desc: l(
                "A thoughtful look back at your week.",
                "Una mirada a lo que pasó en tu semana.",
              ),
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-5"
            >
              <div>
                <label htmlFor={item.key} className="text-xs font-semibold">
                  {item.title}
                </label>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.desc}
                </p>
              </div>
              <Switch
                id={item.key}
                checked={values[item.key]}
                onCheckedChange={(v) =>
                  setValues((p) => ({ ...p, [item.key]: v }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setPrefs(values);
            toast.success(t("saved"));
          }}
        >
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
type DemoKey = { id: string; name: string; token: string; created: string };
function ApiKeys() {
  const { l, common: t, date } = useLanguage(),
    [keys, setKeys] = useDemoStore<DemoKey[]>("api-keys", [
      {
        id: "key-1",
        name: "Development",
        token: "af_demo_local_preview_4f8e2a9b",
        created: "2026-10-01",
      },
    ]);
  const [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [revealed, setRevealed] = useState<string[]>([]),
    [revoking, setRevoking] = useState<string | null>(null),
    [error, setError] = useState("");
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError(l("Give the key a name.", "Dale un nombre a la clave."));
      return;
    }
    const key = {
      id: crypto.randomUUID(),
      name: name.trim(),
      token: `af_demo_${crypto.randomUUID().replaceAll("-", "")}`,
      created: new Date().toISOString().slice(0, 10),
    };
    setKeys((p) => [...p, key]);
    setRevealed((p) => [...p, key.id]);
    setOpen(false);
    setName("");
    setError("");
    toast.success(l("Demo key created", "Clave de ejemplo creada"));
  };
  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t("apiKeys")}</CardTitle>
            <CardDescription>
              {l(
                "A thoughtful starting point for developer settings.",
                "Un punto de partida cuidado para ajustes de desarrolladores.",
              )}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus />
            {l("Create key", "Crear clave")}
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          {keys.length ? (
            keys.map((key) => (
              <div key={key.id} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <KeyRound className="size-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{key.name}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {l("Created", "Creada")} {date(key.created)}
                    </p>
                  </div>
                  <Badge variant="outline">Demo</Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${l("Revoke", "Revocar")} ${key.name}`}
                    onClick={() => setRevoking(key.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-md bg-surface-subtle px-3 py-2">
                  <code className="min-w-0 flex-1 truncate text-[11px]">
                    {revealed.includes(key.id)
                      ? key.token
                      : "af_demo_••••••••••••••••••••"}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={l(
                      "Reveal demo key",
                      "Mostrar clave de ejemplo",
                    )}
                    onClick={() =>
                      setRevealed((p) =>
                        p.includes(key.id)
                          ? p.filter((id) => id !== key.id)
                          : [...p, key.id],
                      )
                    }
                  >
                    {revealed.includes(key.id) ? <EyeOff /> : <Eye />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={l("Copy demo key", "Copiar clave de ejemplo")}
                    onClick={async () => {
                      await navigator.clipboard.writeText(key.token);
                      toast.success(t("copied"));
                    }}
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {l("No keys yet.", "Aún no hay claves.")}
            </p>
          )}
        </CardContent>
      </Card>
      <Alert
        title={l(
          "Non-functional demo keys",
          "Claves de ejemplo sin acceso real",
        )}
      >
        {l(
          "These tokens do not authenticate requests. Replace the demo adapter with your key management service.",
          "Estos tokens no autentican solicitudes. Sustituye el adaptador por tu servicio de gestión de claves.",
        )}
      </Alert>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("close")}>
          <DialogTitle>
            {l("Create a demo API key", "Crear una clave API de ejemplo")}
          </DialogTitle>
          <DialogDescription>
            {l(
              "Choose a name you’ll recognize later.",
              "Elige un nombre que puedas reconocer después.",
            )}
          </DialogDescription>
          <form onSubmit={create} className="mt-6">
            <Field label={l("Key name", "Nombre de la clave")} error={error}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={l("Development", "Desarrollo")}
              />
            </Field>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button type="submit">{l("Create key", "Crear clave")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        count={1}
        open={!!revoking}
        onOpenChange={(v) => {
          if (!v) setRevoking(null);
        }}
        onDelete={() => {
          setKeys((p) => p.filter((key) => key.id !== revoking));
          setRevoking(null);
          toast.success(l("Demo key revoked", "Clave de ejemplo revocada"));
        }}
      />
    </div>
  );
}
