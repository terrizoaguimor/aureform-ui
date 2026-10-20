"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Building2,
  Check,
  Fingerprint,
  KeyRound,
  Laptop,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-language";
import {
  authWorkflowErrorMessage,
  createMockAuthWorkflowAdapter,
  runAuthWorkflow,
  type AuthFlowResult,
  type AuthIdentityState,
  type AuthMfaEnrollment,
  type AuthRole,
  type AuthWorkflowAdapter,
  type AuthWorkflowOperation,
  type AuthWorkflowRequests,
  type AuthWorkflowResults,
} from "@/lib/auth-integration";

export interface IdentityIntegrationPanelProps {
  /** Presentation choice only. It does not activate a provider or OAuth. */
  providerId?: string;
  /** Construct in a Client Component. The default is a working memory-only mock. */
  adapter?: AuthWorkflowAdapter;
}

const providerNames: Record<string, string> = {
  mock: "Aureform",
  "better-auth": "Better Auth",
  betterauth: "Better Auth",
  clerk: "Clerk",
  "supabase-auth": "Supabase Auth",
  supabase: "Supabase Auth",
  authjs: "Auth.js",
  "auth-js": "Auth.js",
  workos: "WorkOS",
  auth0: "Auth0",
  consumer: "Identity",
};
type Challenge = Extract<
  AuthFlowResult,
  { kind: "verification-required" | "mfa-required" }
>;
type Review = {
  kind:
    | "logout"
    | "member"
    | "invitation"
    | "session"
    | "other-sessions"
    | "organization"
    | "factor";
  id?: string;
  label: string;
};
function IdentityCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-xs sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-primary/15 bg-accent text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {description && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
const text = (data: FormData, key: string) => String(data.get(key) ?? "");
/** DOM inputs and FormData are temporary; no credential enters React display state. */
async function submitSensitiveForm(
  event: FormEvent<HTMLFormElement>,
  action: (data: FormData) => Promise<unknown>,
) {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await action(new FormData(form));
  } finally {
    for (const input of form.querySelectorAll<HTMLInputElement>(
      "input[data-identity-sensitive]",
    ))
      input.value = "";
  }
}

export function IdentityIntegrationPanel(props: IdentityIntegrationPanelProps) {
  return (
    <IdentityPanel
      key={`${props.providerId ?? props.adapter?.providerId ?? "mock"}:${props.adapter?.mode ?? "demo"}`}
      {...props}
    />
  );
}

function IdentityPanel({ providerId, adapter }: IdentityIntegrationPanelProps) {
  const { l, locale, date } = useLanguage();
  const mock = useMemo(
    () => createMockAuthWorkflowAdapter({ providerId: providerId ?? "mock" }),
    [providerId],
  );
  const client = adapter ?? mock;
  const demo = client.mode === "demo";
  const providerName =
    providerNames[providerId ?? client.providerId] ??
    providerId ??
    client.providerId;
  const [identity, setIdentity] = useState<AuthIdentityState | null>(null);
  const [pending, setPending] = useState<AuthWorkflowOperation | null>(
    "getIdentity",
  );
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<
    "saved" | "refreshed" | "cancelled" | "challenge" | null
  >(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [enrollment, setEnrollment] = useState<AuthMfaEnrollment | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [tab, setTab] = useState<string>("profile");
  const enrollmentUri = enrollment ? new URL(enrollment.otpauthUri) : null;
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const session = identity?.session;
  const activeOrganization = identity?.organizations.find(
    (item) => item.id === identity.activeOrganizationId,
  );
  const canManage =
    activeOrganization?.role === "owner" ||
    activeOrganization?.role === "admin";
  const busy = pending !== null;
  const roleLabel = (role: AuthRole) =>
    role === "owner"
      ? l("Owner", "Propietario")
      : role === "admin"
        ? l("Admin", "Administrador")
        : l("Member", "Miembro");
  const roleOptions = [
    { value: "member", label: roleLabel("member") },
    { value: "admin", label: roleLabel("admin") },
  ];

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    request.current = controller;
    void runAuthWorkflow(
      client,
      "getIdentity",
      {},
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted && mounted.current)
          setIdentity(result.identity);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted && mounted.current) setError(failure);
      })
      .finally(() => {
        if (request.current === controller) {
          request.current = null;
          if (mounted.current) setPending(null);
        }
      });
    return () => {
      mounted.current = false;
      controller.abort();
      request.current?.abort();
    };
  }, [client]);

  async function execute<K extends AuthWorkflowOperation>(
    operation: K,
    values: AuthWorkflowRequests[K],
    onResult?: (result: AuthWorkflowResults[K]) => void,
  ) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(operation);
    setError(null);
    setNotice(null);
    try {
      const result = await runAuthWorkflow(client, operation, values, {
        signal: controller.signal,
      });
      if (!mounted.current || controller.signal.aborted) return;
      onResult?.(result);
      const current =
        operation === "getIdentity"
          ? (result as AuthWorkflowResults["getIdentity"])
          : await runAuthWorkflow(
              client,
              "getIdentity",
              {},
              { signal: controller.signal },
            );
      if (!mounted.current || controller.signal.aborted) return;
      setIdentity(current.identity);
      if (!current.identity.session) {
        setEnrollment(null);
        setReview(null);
        if (operation === "logout" || operation === "revokeSession")
          setChallenge(null);
      }
      if (
        result.kind === "verification-required" ||
        result.kind === "mfa-required"
      ) {
        setNotice("challenge");
      } else {
        setNotice(
          operation === "getIdentity" || operation === "getSession"
            ? "refreshed"
            : "saved",
        );
      }
    } catch (failure) {
      if (!mounted.current) return;
      if (controller.signal.aborted) setNotice("cancelled");
      else setError(failure);
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (mounted.current) setPending(null);
      }
    }
  }
  function handleCompletion(result: AuthWorkflowResults["verifyEmail"]) {
    if (
      result.kind === "verification-required" ||
      result.kind === "mfa-required"
    )
      setChallenge(result);
    else setChallenge(null);
    // Redirects are validated but never followed by a settings panel.
  }
  async function verifyChallenge(event: FormEvent<HTMLFormElement>) {
    if (!challenge) {
      event.preventDefault();
      return;
    }
    const current = challenge;
    await submitSensitiveForm(event, (data) =>
      current.kind === "mfa-required"
        ? execute(
            "verifyMfa",
            { challengeId: current.challengeId, code: text(data, "code") },
            handleCompletion,
          )
        : execute(
            "verifyEmail",
            { challengeId: current.challengeId, code: text(data, "code") },
            handleCompletion,
          ),
    );
  }
  async function submitReview(event: FormEvent<HTMLFormElement>) {
    if (!review) {
      event.preventDefault();
      return;
    }
    const current = review;
    await submitSensitiveForm(event, async (data) => {
      const close = () => setReview(null);
      if (current.kind === "logout") {
        await execute("logout", {}, () => {
          setEnrollment(null);
          setChallenge(null);
          close();
        });
      } else if (current.kind === "session") {
        await execute("revokeSession", { sessionId: current.id! }, close);
      } else if (current.kind === "other-sessions") {
        await execute("revokeOtherSessions", {}, close);
      } else if (current.kind === "factor") {
        await execute(
          "revokeMfa",
          {
            factorId: current.id!,
            password: text(data, "password") || undefined,
            code: text(data, "code") || undefined,
          },
          close,
        );
      } else if (activeOrganization) {
        if (current.kind === "member") {
          await execute(
            "removeMember",
            { organizationId: activeOrganization.id, memberId: current.id! },
            close,
          );
        } else if (current.kind === "invitation") {
          await execute(
            "revokeInvitation",
            {
              organizationId: activeOrganization.id,
              invitationId: current.id!,
            },
            close,
          );
        } else {
          await execute(
            "deleteOrganization",
            { organizationId: activeOrganization.id },
            close,
          );
        }
      }
    });
  }

  return (
    <section
      className="mx-auto w-full max-w-5xl space-y-5 text-foreground"
      aria-busy={busy}
    >
      <header
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-surface p-5 sm:p-7"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top right, color-mix(in srgb, var(--primary) 10%, transparent), transparent 65%)",
        }}
      >
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-primary/25 bg-accent text-primary">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{providerName}</Badge>
                <Badge variant={demo ? "neutral" : "default"}>
                  {demo
                    ? l("Separate local demo", "Demo local independiente")
                    : l("Consumer adapter", "Adaptador del consumidor")}
                </Badge>
              </div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {l("Identity & access", "Identidad y acceso")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                {l(
                  "A clear home for your account, security and team.",
                  "Un espacio claro para tu cuenta, seguridad y equipo.",
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void execute("getSession", {})}
            >
              <RefreshCw aria-hidden="true" />
              {l("Refresh session", "Actualizar sesión")}
            </Button>
            {session && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() =>
                  setReview({ kind: "logout", label: session.user.email })
                }
              >
                <LogOut aria-hidden="true" />
                {l("Sign out", "Cerrar sesión")}
              </Button>
            )}
          </div>
        </div>
        <p className="relative mt-5 border-t border-border/70 pt-4 text-xs leading-5 text-muted-foreground">
          {demo
            ? l(
                "Separate identity demo in memory. The provider choice does not connect an account. Changes disappear when you leave this preview. Use code 123456; no emails or server sessions are created.",
                "Demo de identidad independiente en memoria. Elegir un proveedor no conecta una cuenta. Los cambios desaparecen al salir de esta vista previa. Usa el código 123456; no se crean correos ni sesiones del servidor.",
              )
            : l(
                "Account and membership details come from your identity service. Your backend enforces sessions, permissions and reauthentication.",
                "Los datos de la cuenta y los miembros provienen de tu servicio de identidad. Tu backend valida sesiones, permisos y reautenticación.",
              )}
        </p>
      </header>

      {error !== null && (
        <Alert
          variant="destructive"
          title={l(
            "Could not complete the request",
            "No se pudo completar la solicitud",
          )}
        >
          <p>{authWorkflowErrorMessage(error, locale)}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            disabled={busy}
            onClick={() => void execute("getIdentity", {})}
          >
            {l("Reload account", "Volver a cargar la cuenta")}
          </Button>
        </Alert>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-border bg-surface-subtle/60 px-4 py-3 text-xs text-muted-foreground"
        >
          <Check
            className="size-3.5 shrink-0 text-primary"
            aria-hidden="true"
          />
          {notice === "cancelled"
            ? l(
                "Request cancelled. Refresh to check whether your service completed a change.",
                "Solicitud cancelada. Actualiza para comprobar si tu servicio completó algún cambio.",
              )
            : notice === "challenge"
              ? l(
                  "Your next verification step is ready below.",
                  "El siguiente paso de verificación está listo abajo.",
                )
              : notice === "refreshed"
                ? l(
                    "Account details refreshed.",
                    "Datos de la cuenta actualizados.",
                  )
                : demo
                  ? l(
                      "Local preview updated.",
                      "Vista previa local actualizada.",
                    )
                  : l(
                      "Request completed and account details reloaded.",
                      "Solicitud completada y datos de la cuenta recargados.",
                    )}
        </p>
      )}
      {busy && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground"
        >
          <span>
            {demo
              ? l("Updating local preview…", "Actualizando la vista previa…")
              : l(
                  "Waiting for your identity service…",
                  "Esperando a tu servicio de identidad…",
                )}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              request.current?.abort();
              if (pending === "enrollMfa" || pending === "verifyMfa")
                setEnrollment(null);
            }}
          >
            {l("Cancel", "Cancelar")}
          </Button>
        </div>
      )}

      {challenge && (
        <IdentityCard
          title={
            challenge.kind === "mfa-required"
              ? l(
                  "Complete your security check",
                  "Completa la comprobación de seguridad",
                )
              : l("Verify your email", "Verifica tu correo")
          }
          description={
            challenge.kind === "verification-required"
              ? challenge.email
              : l(
                  "Use your authenticator code or an enabled recovery code.",
                  "Usa el código de tu autenticador o un código de recuperación habilitado.",
                )
          }
          icon={challenge.kind === "mfa-required" ? Fingerprint : Mail}
        >
          <form
            className="grid gap-4 sm:grid-cols-[1fr_auto]"
            onSubmit={(event) => void verifyChallenge(event)}
          >
            <Field label={l("Verification code", "Código de verificación")}>
              <Input
                name="code"
                data-identity-sensitive
                autoComplete="one-time-code"
                minLength={6}
                maxLength={128}
                required
                disabled={busy}
                placeholder={demo ? "123456" : undefined}
              />
            </Field>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={busy}>
                {l("Verify", "Verificar")}
              </Button>
              {challenge.kind === "verification-required" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    void execute(
                      "resendVerification",
                      {
                        email: challenge.email,
                        challengeId: challenge.challengeId,
                      },
                      (result) => setChallenge(result),
                    )
                  }
                >
                  {l("Resend", "Volver a enviar")}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setChallenge(null)}
              >
                {l("Dismiss", "Descartar")}
              </Button>
            </div>
          </form>
        </IdentityCard>
      )}

      {!identity ? (
        !busy && (
          <IdentityCard
            title={l("Load your account", "Carga tu cuenta")}
            description={l(
              "Try again when your identity service is available.",
              "Inténtalo de nuevo cuando tu servicio de identidad esté disponible.",
            )}
            icon={UserRound}
          >
            <Button
              type="button"
              onClick={() => void execute("getIdentity", {})}
            >
              {l("Load account", "Cargar cuenta")}
            </Button>
          </IdentityCard>
        )
      ) : !session ? (
        <IdentityCard
          title={l(
            "Sign in to manage your account",
            "Inicia sesión para gestionar tu cuenta",
          )}
          icon={KeyRound}
        >
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) =>
              void submitSensitiveForm(event, (data) =>
                execute(
                  "signIn",
                  {
                    email: text(data, "email"),
                    password: text(data, "password"),
                  },
                  handleCompletion,
                ),
              )
            }
          >
            <Field label={l("Email", "Correo")}>
              <Input
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={busy}
                defaultValue={demo ? "alex.morgan@example.com" : ""}
              />
            </Field>
            <Field
              label={l("Password", "Contraseña")}
              description={
                demo
                  ? l(
                      "Any demo password works. Nothing is saved.",
                      "Cualquier contraseña de ejemplo funciona. No se guarda nada.",
                    )
                  : undefined
              }
            >
              <Input
                name="password"
                type="password"
                data-identity-sensitive
                autoComplete="current-password"
                maxLength={1024}
                required
                disabled={busy}
              />
            </Field>
            <Button
              type="submit"
              className="justify-self-start"
              disabled={busy || !!challenge}
            >
              {l("Sign in", "Iniciar sesión")}
            </Button>
          </form>
        </IdentityCard>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-surface p-4">
              <Avatar name={session.user.name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {session.user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">
                {l("Active workspace", "Espacio activo")}
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {activeOrganization?.name ??
                  l("Personal account", "Cuenta personal")}
              </p>
              <p className="mt-1 text-xs text-primary">
                {activeOrganization
                  ? roleLabel(activeOrganization.role)
                  : l("Individual", "Individual")}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">
                {l("Security", "Seguridad")}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {identity.factors.length
                  ? l("MFA enabled", "MFA habilitado")
                  : l("MFA available", "MFA disponible")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {l(
                  `${identity.sessions.length} active sessions`,
                  `${identity.sessions.length} sesiones activas`,
                )}
              </p>
            </div>
          </div>
          <Tabs
            value={tab}
            onValueChange={(value) => {
              if (value !== "security") setEnrollment(null);
              setTab(String(value));
            }}
          >
            <TabsList
              aria-label={l("Identity settings", "Configuración de identidad")}
              className="w-full justify-start"
            >
              <TabsTrigger value="profile">
                <UserRound aria-hidden="true" />
                {l("Profile", "Perfil")}
              </TabsTrigger>
              <TabsTrigger value="security">
                <ShieldCheck aria-hidden="true" />
                {l("Security", "Seguridad")}
              </TabsTrigger>
              <TabsTrigger value="organization">
                <Users aria-hidden="true" />
                {l("Team", "Equipo")}
              </TabsTrigger>
              <TabsTrigger value="sessions">
                <Laptop aria-hidden="true" />
                {l("Sessions", "Sesiones")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="grid gap-5 md:grid-cols-2">
              <IdentityCard
                title={l("Your profile", "Tu perfil")}
                description={l(
                  "Keep your account details up to date.",
                  "Mantén actualizados los datos de tu cuenta.",
                )}
                icon={UserRound}
              >
                <form
                  key={`${session.user.id}:${session.user.name}`}
                  className="grid gap-4"
                  onSubmit={(event) =>
                    void submitSensitiveForm(event, (data) =>
                      execute("updateProfile", { name: text(data, "name") }),
                    )
                  }
                >
                  <Field label={l("Full name", "Nombre completo")}>
                    <Input
                      name="name"
                      autoComplete="name"
                      defaultValue={session.user.name}
                      minLength={2}
                      maxLength={160}
                      required
                      disabled={busy}
                    />
                  </Field>
                  <Field label={l("Email", "Correo")}>
                    <Input type="email" value={session.user.email} readOnly />
                  </Field>
                  <Button
                    type="submit"
                    className="justify-self-start"
                    disabled={busy}
                  >
                    {l("Save profile", "Guardar perfil")}
                  </Button>
                </form>
              </IdentityCard>
              <IdentityCard
                title={l("Email verification", "Verificación del correo")}
                description={l(
                  "Verification status is supplied by your identity service.",
                  "Tu servicio de identidad proporciona el estado de verificación.",
                )}
                icon={Mail}
              >
                <Badge
                  variant={session.user.emailVerified ? "default" : "warning"}
                >
                  {session.user.emailVerified
                    ? l("Verified email", "Correo verificado")
                    : l("Verification needed", "Verificación pendiente")}
                </Badge>
                <p className="mt-4 break-all text-sm">{session.user.email}</p>
                {!session.user.emailVerified && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5"
                    disabled={busy}
                    onClick={() =>
                      void execute(
                        "resendVerification",
                        { email: session.user.email },
                        (result) => setChallenge(result),
                      )
                    }
                  >
                    {l("Request verification", "Solicitar verificación")}
                  </Button>
                )}
                <p className="mt-5 text-xs leading-5 text-muted-foreground">
                  {l(
                    "Changing your email address follows your consumer application's identity policy.",
                    "El cambio de correo sigue la política de identidad de la aplicación del consumidor.",
                  )}
                </p>
              </IdentityCard>
            </TabsContent>

            <TabsContent value="security" className="grid gap-5 md:grid-cols-2">
              <IdentityCard
                title={l("Change password", "Cambiar contraseña")}
                description={l(
                  "Your service verifies the current password and applies its password policy.",
                  "Tu servicio verifica la contraseña actual y aplica su política de contraseñas.",
                )}
                icon={KeyRound}
              >
                <form
                  className="grid gap-4"
                  onSubmit={(event) =>
                    void submitSensitiveForm(event, async (data) => {
                      if (
                        text(data, "newPassword") !== text(data, "confirmation")
                      ) {
                        setPasswordMismatch(true);
                        return;
                      }
                      setPasswordMismatch(false);
                      await execute("changePassword", {
                        currentPassword: text(data, "currentPassword"),
                        newPassword: text(data, "newPassword"),
                      });
                    })
                  }
                >
                  <Field label={l("Current password", "Contraseña actual")}>
                    <Input
                      name="currentPassword"
                      type="password"
                      data-identity-sensitive
                      autoComplete="current-password"
                      maxLength={1024}
                      required
                      disabled={busy}
                    />
                  </Field>
                  <Field label={l("New password", "Nueva contraseña")}>
                    <Input
                      name="newPassword"
                      type="password"
                      data-identity-sensitive
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={1024}
                      required
                      disabled={busy}
                    />
                  </Field>
                  <Field
                    error={
                      passwordMismatch
                        ? l(
                            "Passwords must match.",
                            "Las contraseñas deben coincidir.",
                          )
                        : undefined
                    }
                    label={l(
                      "Confirm new password",
                      "Confirmar nueva contraseña",
                    )}
                  >
                    <Input
                      name="confirmation"
                      onChange={() => setPasswordMismatch(false)}
                      type="password"
                      data-identity-sensitive
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={1024}
                      required
                      disabled={busy}
                    />
                  </Field>
                  <Button
                    type="submit"
                    className="justify-self-start"
                    disabled={busy}
                  >
                    {l("Update password", "Actualizar contraseña")}
                  </Button>
                </form>
              </IdentityCard>
              <IdentityCard
                title={l(
                  "Multi-factor authentication",
                  "Autenticación multifactor",
                )}
                description={l(
                  "Add an authenticator app for a second verification step.",
                  "Añade una aplicación de autenticación como segundo paso de verificación.",
                )}
                icon={Fingerprint}
              >
                <div className="space-y-3">
                  {identity.factors.length === 0 && (
                    <p className="rounded-xl border border-dashed border-border p-4 text-xs leading-5 text-muted-foreground">
                      {l(
                        "No authenticator enrolled yet.",
                        "Aún no hay un autenticador registrado.",
                      )}
                    </p>
                  )}
                  {identity.factors.map((factor) => (
                    <div
                      key={factor.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Smartphone
                          className="size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <p className="truncate text-sm font-medium">
                          {factor.label}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          setReview({
                            kind: "factor",
                            id: factor.id,
                            label: factor.label,
                          })
                        }
                      >
                        {l("Remove", "Eliminar")}
                      </Button>
                    </div>
                  ))}
                </div>
                {enrollment ? (
                  <div className="mt-5 rounded-xl border border-primary/20 bg-accent/30 p-4">
                    <p className="text-xs font-semibold">
                      {l(
                        "Enter this setup key in your authenticator",
                        "Escribe esta clave de configuración en tu autenticador",
                      )}
                    </p>
                    <code className="mt-3 block break-all rounded-lg border border-border bg-surface p-3 text-sm tracking-wider">
                      {enrollment.secret}
                    </code>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <dt className="text-muted-foreground">
                        {l("Account", "Cuenta")}
                      </dt>
                      <dd className="break-all">
                        {decodeURIComponent(enrollmentUri!.pathname.slice(1))}
                      </dd>
                      <dt className="text-muted-foreground">
                        {l("Algorithm", "Algoritmo")}
                      </dt>
                      <dd>
                        {enrollmentUri!.searchParams.get("algorithm") ?? "SHA1"}
                      </dd>
                      <dt className="text-muted-foreground">
                        {l("Digits", "Dígitos")}
                      </dt>
                      <dd>
                        {enrollmentUri!.searchParams.get("digits") ?? "6"}
                      </dd>
                      <dt className="text-muted-foreground">
                        {l("Interval", "Intervalo")}
                      </dt>
                      <dd>
                        {enrollmentUri!.searchParams.get("period") ?? "30"}{" "}
                        {l("seconds", "segundos")}
                      </dd>
                    </dl>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      {l(
                        "Temporary setup key. It is cleared when you confirm, cancel or leave this panel.",
                        "Clave temporal de configuración. Se borra al confirmar, cancelar o salir de este panel.",
                      )}
                    </p>
                    <form
                      className="mt-4 grid gap-3"
                      onSubmit={(event) =>
                        void submitSensitiveForm(event, (data) =>
                          execute(
                            "verifyMfa",
                            {
                              enrollmentId: enrollment.enrollmentId,
                              code: text(data, "code"),
                            },
                            () => setEnrollment(null),
                          ),
                        )
                      }
                    >
                      <Field
                        label={l(
                          "Authenticator code",
                          "Código del autenticador",
                        )}
                      >
                        <Input
                          name="code"
                          data-identity-sensitive
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          pattern={
                            enrollmentUri!.searchParams.get("digits") === "8"
                              ? "[0-9]{8}"
                              : "[0-9]{6}"
                          }
                          maxLength={8}
                          required
                          disabled={busy}
                          placeholder={demo ? "123456" : undefined}
                        />
                      </Field>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={busy}>
                          {l("Enable MFA", "Habilitar MFA")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setEnrollment(null)}
                        >
                          {l("Cancel setup", "Cancelar configuración")}
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <form
                    className="mt-5 grid gap-4"
                    onSubmit={(event) =>
                      void submitSensitiveForm(event, (data) =>
                        execute(
                          "enrollMfa",
                          {
                            label: text(data, "label"),
                            password: text(data, "password") || undefined,
                          },
                          (result) => setEnrollment(result),
                        ),
                      )
                    }
                  >
                    <Field
                      label={l("Authenticator name", "Nombre del autenticador")}
                    >
                      <Input
                        name="label"
                        defaultValue={l("My authenticator", "Mi autenticador")}
                        maxLength={80}
                        required
                        disabled={busy}
                      />
                    </Field>
                    <Field
                      label={l(
                        "Current password, if required",
                        "Contraseña actual, si se requiere",
                      )}
                    >
                      <Input
                        name="password"
                        type="password"
                        data-identity-sensitive
                        autoComplete="current-password"
                        maxLength={1024}
                        disabled={busy}
                      />
                    </Field>
                    <Button
                      type="submit"
                      variant="outline"
                      className="justify-self-start"
                      disabled={busy}
                    >
                      <Plus aria-hidden="true" />
                      {l("Set up authenticator", "Configurar autenticador")}
                    </Button>
                  </form>
                )}
              </IdentityCard>
            </TabsContent>

            <TabsContent value="organization" className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <IdentityCard
                  title={l("Workspace", "Espacio de trabajo")}
                  description={l(
                    "Choose the organization whose members you want to manage.",
                    "Elige la organización cuyos miembros quieres gestionar.",
                  )}
                  icon={Building2}
                >
                  {identity.organizations.length ? (
                    <Field
                      label={l("Active organization", "Organización activa")}
                    >
                      <Select
                        options={identity.organizations.map((item) => ({
                          value: item.id,
                          label: item.name,
                        }))}
                        value={activeOrganization?.id ?? ""}
                        disabled={busy}
                        onValueChange={(organizationId) => {
                          if (organizationId !== activeOrganization?.id)
                            void execute("switchOrganization", {
                              organizationId,
                            });
                        }}
                      />
                    </Field>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {l(
                        "You have no organizations yet.",
                        "Aún no tienes organizaciones.",
                      )}
                    </p>
                  )}
                  {activeOrganization && (
                    <form
                      key={`${activeOrganization.id}:${activeOrganization.name}:${activeOrganization.slug}`}
                      className="mt-5 grid gap-4"
                      onSubmit={(event) =>
                        void submitSensitiveForm(event, (data) =>
                          execute("updateOrganization", {
                            organizationId: activeOrganization.id,
                            name: text(data, "name"),
                            slug: text(data, "slug"),
                          }),
                        )
                      }
                    >
                      <Field
                        label={l(
                          "Organization name",
                          "Nombre de la organización",
                        )}
                      >
                        <Input
                          name="name"
                          defaultValue={activeOrganization.name}
                          minLength={2}
                          maxLength={160}
                          required
                          disabled={busy || !canManage}
                        />
                      </Field>
                      <Field
                        label={l(
                          "Organization slug",
                          "Identificador de la organización",
                        )}
                      >
                        <Input
                          name="slug"
                          defaultValue={activeOrganization.slug}
                          pattern="[a-z0-9]+(-[a-z0-9]+)*"
                          minLength={2}
                          maxLength={80}
                          required
                          disabled={busy || !canManage}
                        />
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={busy || !canManage}>
                          {l("Save workspace", "Guardar espacio")}
                        </Button>
                        {activeOrganization.role === "owner" && (
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              setReview({
                                kind: "organization",
                                id: activeOrganization.id,
                                label: activeOrganization.name,
                              })
                            }
                          >
                            <Trash2 aria-hidden="true" />
                            {l("Delete", "Eliminar")}
                          </Button>
                        )}
                      </div>
                    </form>
                  )}
                </IdentityCard>
                <IdentityCard
                  title={l("Create a workspace", "Crear un espacio")}
                  description={l(
                    "Create a new organization using your service's account policy.",
                    "Crea una organización con la política de cuentas de tu servicio.",
                  )}
                  icon={Plus}
                >
                  <form
                    className="grid gap-4"
                    onSubmit={(event) =>
                      void submitSensitiveForm(event, (data) =>
                        execute("createOrganization", {
                          name: text(data, "name"),
                          slug: text(data, "slug"),
                        }),
                      )
                    }
                  >
                    <Field
                      label={l(
                        "Organization name",
                        "Nombre de la organización",
                      )}
                    >
                      <Input
                        name="name"
                        minLength={2}
                        maxLength={160}
                        required
                        disabled={busy}
                        placeholder={l("Design team", "Equipo de diseño")}
                      />
                    </Field>
                    <Field
                      label={l("Unique slug", "Identificador único")}
                      description={l(
                        "Lowercase letters, numbers and hyphens.",
                        "Letras minúsculas, números y guiones.",
                      )}
                    >
                      <Input
                        name="slug"
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        minLength={2}
                        maxLength={80}
                        required
                        disabled={busy}
                        placeholder="design-team"
                      />
                    </Field>
                    <Button
                      type="submit"
                      variant="outline"
                      className="justify-self-start"
                      disabled={busy}
                    >
                      {l("Create workspace", "Crear espacio")}
                    </Button>
                  </form>
                </IdentityCard>
              </div>
              {activeOrganization && (
                <IdentityCard
                  title={l("Members", "Miembros")}
                  description={l(
                    "Role changes and removals are checked by your backend.",
                    "Tu backend valida los cambios de rol y la eliminación de miembros.",
                  )}
                  icon={Users}
                >
                  <ul className="divide-y divide-border">
                    {identity.members.map((member) => (
                      <li
                        key={member.id}
                        className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <Avatar name={member.user.name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {member.user.name}
                            {member.user.id === session.user.id && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {l("(you)", "(tú)")}
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.user.email}
                          </p>
                        </div>
                        {member.role === "owner" ||
                        member.user.id === session.user.id ? (
                          <Badge variant="outline">
                            {roleLabel(member.role)}
                          </Badge>
                        ) : (
                          <Select
                            className="w-36"
                            aria-label={l(
                              `Role for ${member.user.name}`,
                              `Rol de ${member.user.name}`,
                            )}
                            options={roleOptions}
                            value={member.role}
                            disabled={busy || !canManage}
                            onValueChange={(value) => {
                              if (value !== member.role)
                                void execute("updateMemberRole", {
                                  organizationId: activeOrganization.id,
                                  memberId: member.id,
                                  role: value as "admin" | "member",
                                });
                            }}
                          />
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={l(
                            `Remove ${member.user.name}`,
                            `Eliminar a ${member.user.name}`,
                          )}
                          disabled={
                            busy ||
                            !canManage ||
                            member.role === "owner" ||
                            member.user.id === session.user.id
                          }
                          onClick={() =>
                            setReview({
                              kind: "member",
                              id: member.id,
                              label: member.user.name,
                            })
                          }
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </IdentityCard>
              )}
              <div className="grid gap-5 md:grid-cols-2">
                {activeOrganization && (
                  <IdentityCard
                    title={l("Invite a teammate", "Invitar a un compañero")}
                    description={l(
                      "Your service owns invitation delivery, expiry and recipient verification.",
                      "Tu servicio gestiona el envío, vencimiento y verificación del destinatario de las invitaciones.",
                    )}
                    icon={Mail}
                  >
                    <form
                      className="grid gap-4"
                      onSubmit={(event) =>
                        void submitSensitiveForm(event, (data) =>
                          execute("inviteMember", {
                            organizationId: activeOrganization.id,
                            email: text(data, "email"),
                            role: text(data, "role") as "admin" | "member",
                          }),
                        )
                      }
                    >
                      <Field label={l("Email", "Correo")}>
                        <Input
                          name="email"
                          type="email"
                          autoComplete="off"
                          required
                          disabled={busy || !canManage}
                          placeholder="teammate@example.com"
                        />
                      </Field>
                      <Field label={l("Role", "Rol")}>
                        <Select
                          name="role"
                          options={roleOptions}
                          defaultValue="member"
                          disabled={busy || !canManage}
                        />
                      </Field>
                      <Button
                        type="submit"
                        className="justify-self-start"
                        disabled={busy || !canManage}
                      >
                        {l("Invite member", "Invitar miembro")}
                      </Button>
                    </form>
                    <ul className="mt-5 space-y-2">
                      {identity.invitations
                        .filter((item) => item.status === "pending")
                        .map((invitation) => (
                          <li
                            key={invitation.id}
                            className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="break-all text-xs font-medium">
                                {invitation.email}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">
                                {roleLabel(invitation.role)} ·{" "}
                                {l("Expires", "Vence")}{" "}
                                {date(invitation.expiresAt)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busy || !canManage}
                              onClick={() =>
                                setReview({
                                  kind: "invitation",
                                  id: invitation.id,
                                  label: invitation.email,
                                })
                              }
                            >
                              {l("Revoke", "Revocar")}
                            </Button>
                          </li>
                        ))}
                    </ul>
                  </IdentityCard>
                )}
                <IdentityCard
                  title={l("Accept an invitation", "Aceptar una invitación")}
                  description={
                    demo
                      ? l(
                          "Try the demo reference demo-invitation.",
                          "Prueba la referencia de ejemplo demo-invitation.",
                        )
                      : l(
                          "Paste the invitation reference supplied by your application. Your service checks the intended recipient.",
                          "Pega la referencia de invitación que te proporcionó tu aplicación. Tu servicio verifica el destinatario.",
                        )
                  }
                  icon={Building2}
                >
                  <form
                    className="grid gap-4"
                    onSubmit={(event) =>
                      void submitSensitiveForm(event, (data) =>
                        execute("acceptInvitation", {
                          token: text(data, "token"),
                        }),
                      )
                    }
                  >
                    <Field
                      label={l(
                        "Invitation reference",
                        "Referencia de invitación",
                      )}
                    >
                      <Input
                        name="token"
                        type="password"
                        data-identity-sensitive
                        autoComplete="off"
                        maxLength={2048}
                        required
                        disabled={busy}
                      />
                    </Field>
                    <Button
                      type="submit"
                      variant="outline"
                      className="justify-self-start"
                      disabled={busy}
                    >
                      {l("Accept invitation", "Aceptar invitación")}
                    </Button>
                  </form>
                </IdentityCard>
              </div>
            </TabsContent>

            <TabsContent value="sessions">
              <IdentityCard
                title={l("Active sessions", "Sesiones activas")}
                description={l(
                  "End access on devices you no longer use. Server-side revocation is handled by your identity service.",
                  "Finaliza el acceso de dispositivos que ya no utilizas. Tu servicio de identidad revoca las sesiones en el servidor.",
                )}
                icon={Laptop}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {l(
                      "Session identifiers shown here are display references, not access tokens.",
                      "Los identificadores de sesión son referencias de visualización, no tokens de acceso.",
                    )}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      busy || !identity.sessions.some((item) => !item.current)
                    }
                    onClick={() =>
                      setReview({
                        kind: "other-sessions",
                        label: l(
                          "All other sessions",
                          "Todas las demás sesiones",
                        ),
                      })
                    }
                  >
                    {l("Sign out other devices", "Cerrar otras sesiones")}
                  </Button>
                </div>
                <ul className="divide-y divide-border">
                  {identity.sessions.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-3 py-4 first:pt-1 last:pb-0"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-subtle">
                        <Laptop
                          className="size-4 text-primary"
                          aria-hidden="true"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {item.device}
                          {item.current && (
                            <Badge>{l("This session", "Esta sesión")}</Badge>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.location ? `${item.location} · ` : ""}
                          {l("Last active", "Última actividad")}{" "}
                          {date(item.lastActiveAt)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {l("Expires", "Vence")} {date(item.expiresAt)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          setReview({
                            kind: "session",
                            id: item.id,
                            label: item.device,
                          })
                        }
                      >
                        {l("Revoke session", "Revocar sesión")}
                      </Button>
                    </li>
                  ))}
                </ul>
              </IdentityCard>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open && !busy) setReview(null);
        }}
      >
        <DialogContent closeLabel={l("Close", "Cerrar")}>
          <DialogTitle>
            {review?.kind === "logout"
              ? l("Sign out of this account?", "¿Cerrar sesión en esta cuenta?")
              : review?.kind === "factor"
                ? l(
                    "Remove this authenticator?",
                    "¿Eliminar este autenticador?",
                  )
                : review?.kind === "organization"
                  ? l("Delete this workspace?", "¿Eliminar este espacio?")
                  : l("Confirm access change", "Confirmar cambio de acceso")}
          </DialogTitle>
          <DialogDescription>
            <span className="block break-all font-medium text-foreground">
              {review?.label}
            </span>
            <span className="mt-2 block">
              {review?.kind === "organization"
                ? l(
                    "This deletes the organization through your identity service. Your backend must enforce its deletion policy.",
                    "Esto elimina la organización mediante tu servicio de identidad. Tu backend debe aplicar su política de eliminación.",
                  )
                : review?.kind === "factor"
                  ? l(
                      "Your service applies its reauthentication policy. Enter a current password or code if required.",
                      "Tu servicio aplica su política de reautenticación. Escribe la contraseña actual o el código si se requiere.",
                    )
                  : l(
                      "Your service will apply this change to the selected account, membership or session.",
                      "Tu servicio aplicará este cambio a la cuenta, miembro o sesión seleccionada.",
                    )}
            </span>
          </DialogDescription>
          <form onSubmit={(event) => void submitReview(event)}>
            {review?.kind === "factor" && (
              <div className="mt-5 grid gap-4">
                <Field
                  label={l(
                    "Current password, if required",
                    "Contraseña actual, si se requiere",
                  )}
                >
                  <Input
                    name="password"
                    type="password"
                    data-identity-sensitive
                    autoComplete="current-password"
                    maxLength={1024}
                    disabled={busy}
                  />
                </Field>
                <Field
                  label={l(
                    "Authenticator code, if required",
                    "Código del autenticador, si se requiere",
                  )}
                >
                  <Input
                    name="code"
                    data-identity-sensitive
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    minLength={6}
                    maxLength={8}
                    required={demo}
                    disabled={busy}
                    placeholder={demo ? "123456" : undefined}
                  />
                </Field>
              </div>
            )}
            {error !== null && (
              <p
                role="alert"
                className="mt-4 text-xs text-destructive-foreground"
              >
                {authWorkflowErrorMessage(error, locale)}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  request.current?.abort();
                  setReview(null);
                }}
              >
                {l("Cancel", "Cancelar")}
              </Button>
              <Button type="submit" variant="destructive" loading={busy}>
                {l("Confirm", "Confirmar")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
