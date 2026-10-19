"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Database,
  Layers,
  Plus,
  Upload,
  Users,
  X,
} from "lucide-react";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type OnboardingInviteRole = "admin" | "member" | "viewer";
export type OnboardingFlowValue = {
  step: number;
  organizationName: string;
  workspaceName: string;
  workspaceSlug: string;
  invites: { email: string; role: OnboardingInviteRole }[];
  completed: boolean;
};
export type OnboardingFlowProps = {
  value: OnboardingFlowValue;
  onChange: (next: OnboardingFlowValue) => void;
  /** Commit completion in the caller, including any newly created workspace ID. */
  onComplete: (value: OnboardingFlowValue) => void | Promise<void>;
  onOpenCustomers?: () => void;
  onOpenImports?: () => void;
  locale?: "en" | "es";
  className?: string;
};

type Errors = Partial<
  Record<
    "organizationName" | "workspaceName" | "workspaceSlug" | "invite",
    string
  >
>;
const emailSchema = z.email();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function slugFor(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/, "");
}
function inviteRole(value: string): value is OnboardingInviteRole {
  return value === "admin" || value === "member" || value === "viewer";
}

/** Business values and resume persistence belong to the caller. */
export function OnboardingFlow({
  value,
  onChange,
  onComplete,
  onOpenCustomers,
  onOpenImports,
  locale = "en",
  className,
}: OnboardingFlowProps) {
  const l = (en: string, es: string) => (locale === "es" ? es : en);
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const [errors, setErrors] = useState<Errors>({});
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OnboardingInviteRole>("member");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState("");
  const step = Number.isFinite(value.step)
    ? Math.max(0, Math.min(3, Math.trunc(value.step)))
    : 0;
  const steps = [
    l("Organization", "Organización"),
    l("Workspace", "Espacio de trabajo"),
    l("Invite your team", "Invita a tu equipo"),
    l("Your first record", "Tu primer registro"),
  ];
  const titles = [
    l("Give your organization a home.", "Dale un hogar a tu organización."),
    l("Make room for your work.", "Crea un espacio para tu trabajo."),
    l("Good work starts together.", "El buen trabajo empieza en equipo."),
    l("A clear first step.", "Un primer paso claro."),
  ];
  const roles = [
    { value: "admin", label: l("Admin", "Administrador") },
    { value: "member", label: l("Member", "Miembro") },
    { value: "viewer", label: l("Viewer", "Lector") },
  ];

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    heading.current?.focus();
  }, [step, value.completed]);

  const change = (next: Partial<OnboardingFlowValue>) => {
    if (inFlight.current) return;
    onChange({ ...value, ...next });
    setErrors({});
    setFailure("");
  };
  const validate = (target: number): Errors => {
    const next: Errors = {};
    if (
      target >= 0 &&
      (value.organizationName.trim().length < 2 ||
        value.organizationName.trim().length > 100)
    ) {
      next.organizationName = l(
        "Use 2–100 characters for the organization name.",
        "Usa entre 2 y 100 caracteres para la organización.",
      );
    }
    if (target >= 1) {
      if (
        value.workspaceName.trim().length < 2 ||
        value.workspaceName.trim().length > 100
      ) {
        next.workspaceName = l(
          "Use 2–100 characters for the workspace name.",
          "Usa entre 2 y 100 caracteres para el espacio.",
        );
      }
      if (
        !slugPattern.test(value.workspaceSlug) ||
        value.workspaceSlug.length < 2 ||
        value.workspaceSlug.length > 64
      ) {
        next.workspaceSlug = l(
          "Use 2–64 lowercase letters, numbers and single hyphens.",
          "Usa entre 2 y 64 letras minúsculas, números y guiones simples.",
        );
      }
    }
    return next;
  };
  const queuedInvites = () => {
    if (!email.trim()) return value.invites;
    const normalized = email.trim().toLowerCase();
    if (!emailSchema.safeParse(normalized).success) {
      setErrors({
        invite: l("Enter a valid email address.", "Escribe un correo válido."),
      });
      return null;
    }
    if (
      value.invites.some(
        (item) => item.email.trim().toLowerCase() === normalized,
      )
    ) {
      setErrors({
        invite: l(
          "This email is already on the invitation list.",
          "Este correo ya está en la lista de invitaciones.",
        ),
      });
      return null;
    }
    return [...value.invites, { email: normalized, role }];
  };
  const addInvite = () => {
    if (inFlight.current || !email.trim()) return;
    const invites = queuedInvites();
    if (!invites) return;
    change({ invites });
    setEmail("");
  };
  const continueStep = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || value.completed) return;
    const nextErrors = validate(step);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      changeInvalidStep(nextErrors);
      return;
    }
    if (step < 3) {
      const invites = step === 2 ? queuedInvites() : value.invites;
      if (!invites) return;
      change({ step: step + 1, invites });
      setEmail("");
      return;
    }
    const invalidInvitation = value.invites.some(
      (item) =>
        !emailSchema.safeParse(item.email.trim()).success ||
        !inviteRole(item.role),
    );
    const uniqueEmails = new Set(
      value.invites.map((item) => item.email.trim().toLowerCase()),
    );
    if (invalidInvitation || uniqueEmails.size !== value.invites.length) {
      onChange({ ...value, step: 2 });
      setErrors({
        invite: l(
          "Review the invitation emails and roles before finishing.",
          "Revisa los correos y roles antes de terminar.",
        ),
      });
      return;
    }
    const completed: OnboardingFlowValue = {
      ...value,
      step: 3,
      organizationName: value.organizationName.trim(),
      workspaceName: value.workspaceName.trim(),
      invites: value.invites.map((item) => ({
        ...item,
        email: item.email.trim().toLowerCase(),
      })),
      completed: true,
    };
    inFlight.current = true;
    setSaving(true);
    setFailure("");
    try {
      await onComplete(completed);
    } catch (cause) {
      if (mounted.current)
        setFailure(
          cause instanceof Error && cause.message
            ? cause.message
            : l(
                "Setup could not be completed. Your details are still here; try again.",
                "No se pudo completar la configuración. Tus datos siguen aquí; reintenta.",
              ),
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const changeInvalidStep = (next: Errors) => {
    const target = next.organizationName ? 0 : 1;
    if (target !== step) onChange({ ...value, step: target });
  };

  return (
    <section
      aria-label={l("Workspace setup", "Configuración del espacio")}
      className={cn("grid min-w-0 gap-5", className)}
    >
      <ol
        aria-label={l("Setup progress", "Progreso de configuración")}
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={
              !value.completed && step === index ? "step" : undefined
            }
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-xl border p-3 text-xs",
              step === index && !value.completed
                ? "border-primary/40 bg-accent text-foreground shadow-sm"
                : "border-border bg-surface text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                index < step || value.completed
                  ? "border-primary/25 bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {index < step || value.completed ? (
                <Check aria-hidden="true" className="size-3.5" />
              ) : (
                index + 1
              )}
            </span>
            <span className="leading-5">{label}</span>
          </li>
        ))}
      </ol>
      <Card appearance="elevated" className="overflow-hidden">
        <CardHeader className="border-b border-primary/15 bg-[radial-gradient(ellipse_at_top_right,var(--accent),transparent_75%)]">
          <div className="flex items-center justify-between gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-accent text-primary">
              {step === 0 ? (
                <Building2 aria-hidden="true" />
              ) : step === 1 ? (
                <Layers aria-hidden="true" />
              ) : step === 2 ? (
                <Users aria-hidden="true" />
              ) : (
                <Database aria-hidden="true" />
              )}
            </span>
            <Badge variant="outline">
              {value.completed
                ? l("Setup complete", "Configuración completa")
                : `${l("Step", "Paso")} ${step + 1} / 4`}
            </Badge>
          </div>
          <CardTitle
            ref={heading}
            tabIndex={-1}
            className="mt-3 text-xl outline-none sm:text-2xl"
          >
            {value.completed
              ? l("Your workspace is ready.", "Tu espacio está listo.")
              : titles[step]}
          </CardTitle>
          <CardDescription>
            {value.completed
              ? l(
                  "Choose your next action when you are ready.",
                  "Elige tu siguiente acción cuando quieras.",
                )
              : l(
                  "Your progress belongs to this workspace. You can return to these details later.",
                  "Tu progreso pertenece a este espacio. Puedes volver a estos datos más tarde.",
                )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            noValidate
            onSubmit={(event) => void continueStep(event)}
            aria-busy={saving}
            className="grid gap-6"
          >
            {!value.completed && step === 0 && (
              <Field
                htmlFor={`${id}-organization`}
                label={l("Organization name", "Nombre de organización")}
                description={l(
                  "The team or company this workspace belongs to.",
                  "El equipo o empresa al que pertenece este espacio.",
                )}
                error={errors.organizationName}
              >
                <Input
                  name="organizationName"
                  autoComplete="organization"
                  value={value.organizationName}
                  maxLength={100}
                  disabled={saving}
                  onChange={(event) =>
                    change({ organizationName: event.target.value })
                  }
                  placeholder={l(
                    "e.g. Northstar Studio",
                    "p. ej. Estudio Northstar",
                  )}
                />
              </Field>
            )}
            {!value.completed && step === 1 && (
              <div className="grid gap-5">
                <Field
                  htmlFor={`${id}-workspace`}
                  label={l("Workspace name", "Nombre del espacio")}
                  error={errors.workspaceName}
                >
                  <Input
                    name="workspaceName"
                    value={value.workspaceName}
                    maxLength={100}
                    disabled={saving}
                    onChange={(event) => {
                      const workspaceName = event.target.value;
                      const automatic =
                        !value.workspaceSlug ||
                        value.workspaceSlug === slugFor(value.workspaceName);
                      change({
                        workspaceName,
                        ...(automatic
                          ? { workspaceSlug: slugFor(workspaceName) }
                          : {}),
                      });
                    }}
                    placeholder={l(
                      "e.g. Product team",
                      "p. ej. Equipo de producto",
                    )}
                  />
                </Field>
                <Field
                  htmlFor={`${id}-slug`}
                  label={l("Workspace identifier", "Identificador del espacio")}
                  description={l(
                    "A short identifier using lowercase letters, numbers and hyphens.",
                    "Un identificador corto con letras minúsculas, números y guiones.",
                  )}
                  error={errors.workspaceSlug}
                >
                  <Input
                    name="workspaceSlug"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={value.workspaceSlug}
                    maxLength={64}
                    disabled={saving}
                    onChange={(event) =>
                      change({ workspaceSlug: event.target.value })
                    }
                    placeholder="product-team"
                  />
                </Field>
              </div>
            )}
            {!value.completed && step === 2 && (
              <div className="grid gap-5">
                <p className="text-sm leading-6 text-muted-foreground">
                  {l(
                    "Queue invitations now or continue on your own. This preview does not send invitation emails.",
                    "Prepara invitaciones o continúa por tu cuenta. Esta vista previa no envía correos de invitación.",
                  )}
                </p>
                <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,160px)_auto]">
                  <Field
                    htmlFor={`${id}-email`}
                    label={l("Invitation email", "Correo de invitación")}
                    error={errors.invite}
                  >
                    <Input
                      name="invitationEmail"
                      type="email"
                      autoComplete="email"
                      value={email}
                      disabled={saving}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setErrors({});
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          addInvite();
                        }
                      }}
                      placeholder="name@example.com"
                    />
                  </Field>
                  <Field htmlFor={`${id}-invite-role`} label={l("Role", "Rol")}>
                    <Select
                      options={roles}
                      value={role}
                      disabled={saving}
                      onValueChange={(next) => {
                        if (inviteRole(next)) setRole(next);
                      }}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving || !email.trim()}
                    onClick={addInvite}
                  >
                    <Plus aria-hidden="true" />
                    {l("Add", "Añadir")}
                  </Button>
                </div>
                {!!value.invites.length && (
                  <ul
                    className="grid gap-2"
                    aria-label={l(
                      "Queued invitations",
                      "Invitaciones preparadas",
                    )}
                  >
                    {value.invites.map((item, index) => (
                      <li
                        key={`${item.email}-${index}`}
                        className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-subtle p-3"
                      >
                        <span className="min-w-0 flex-1 break-all text-sm">
                          {item.email}
                        </span>
                        <Badge variant="outline">
                          {roles.find((option) => option.value === item.role)
                            ?.label ?? item.role}
                        </Badge>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          disabled={saving}
                          aria-label={`${l("Remove invitation for", "Quitar invitación de")} ${item.email}`}
                          onClick={() =>
                            change({
                              invites: value.invites.filter(
                                (_, position) => position !== index,
                              ),
                            })
                          }
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {(step === 3 || value.completed) && (
              <div className="grid gap-5">
                <dl className="grid gap-4 rounded-xl border border-border bg-surface-subtle p-4 sm:grid-cols-3">
                  {[
                    [l("Organization", "Organización"), value.organizationName],
                    [l("Workspace", "Espacio"), value.workspaceName],
                    [
                      l("Invitations queued", "Invitaciones preparadas"),
                      String(value.invites.length),
                    ],
                  ].map(([label, detail]) => (
                    <div key={label} className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 break-words text-sm font-semibold">
                        {detail}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card className="flex flex-col gap-3 p-4">
                    <Database
                      aria-hidden="true"
                      className="size-5 text-primary"
                    />
                    <h3 className="text-sm font-semibold">
                      {l("Add a first customer", "Añade tu primer cliente")}
                    </h3>
                    <p className="flex-1 text-xs leading-6 text-muted-foreground">
                      {l(
                        "Start with one record and build your shared customer list.",
                        "Empieza con un registro y crea la lista compartida de clientes.",
                      )}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving || !onOpenCustomers}
                      onClick={onOpenCustomers}
                    >
                      {l("Open customers", "Abrir clientes")}
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  </Card>
                  <Card className="flex flex-col gap-3 p-4">
                    <Upload
                      aria-hidden="true"
                      className="size-5 text-primary"
                    />
                    <h3 className="text-sm font-semibold">
                      {l(
                        "Bring your existing data",
                        "Trae tus datos existentes",
                      )}
                    </h3>
                    <p className="flex-1 text-xs leading-6 text-muted-foreground">
                      {l(
                        "Review an import before adding existing records.",
                        "Revisa una importación antes de añadir registros existentes.",
                      )}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving || !onOpenImports}
                      onClick={onOpenImports}
                    >
                      {l("Open imports", "Abrir importaciones")}
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  </Card>
                </div>
                {!value.completed && (
                  <p className="text-xs leading-6 text-muted-foreground">
                    {l(
                      "You can finish setup now and add your first record later.",
                      "Puedes terminar la configuración y añadir tu primer registro después.",
                    )}
                  </p>
                )}
              </div>
            )}
            {failure && (
              <Alert
                variant="destructive"
                title={l(
                  "Setup needs another try",
                  "Hay que reintentar la configuración",
                )}
              >
                {failure}
              </Alert>
            )}
            {!value.completed && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saving || step === 0}
                  onClick={() => change({ step: step - 1 })}
                >
                  <ArrowLeft aria-hidden="true" />
                  {l("Back", "Atrás")}
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  {step === 2 && !value.invites.length && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={saving}
                      onClick={() => {
                        setEmail("");
                        change({ step: 3 });
                      }}
                    >
                      {l("Skip invitations", "Omitir invitaciones")}
                    </Button>
                  )}
                  <Button type="submit" appearance="gradient" loading={saving}>
                    {step === 3
                      ? l("Finish setup", "Terminar configuración")
                      : l("Continue", "Continuar")}
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
