"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MessageSquare,
  Paperclip,
  Pencil,
  Receipt,
  Save,
  Send,
} from "lucide-react";
import type { Customer } from "@/demo/dashboard-data";
import { useLanguage } from "@/hooks/use-language";
import {
  GenericRecordDetail,
  type RecordDetailTab,
} from "@/components/blocks/record-detail";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Field } from "@/components/ui/field";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TextLink } from "@/components/ui/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CustomerDetailNote = {
  id: string;
  text: string;
  author: string;
  authorAvatarSrc?: string;
  createdAt: string;
};

export type CustomerDetailActivity = {
  id: string;
  actor: string;
  detail: string;
  occurredAt: string;
};

export type CustomerDetailInvoice = {
  id: string;
  name?: string;
  number?: string;
  amount: number;
  status: string;
  date?: string;
  href?: string;
};

export type CustomerDetailFile = {
  id: string;
  name: string;
  size?: number;
  type?: string;
  createdAt?: string;
  url?: string;
};

export type CustomerDetailTemplateProps = {
  customer: Customer | null;
  avatarSrc?: string;
  loading?: boolean;
  error?: string | null;
  canEdit?: boolean;
  onSave?: (customer: Customer) => void | Promise<void>;
  notes: readonly CustomerDetailNote[];
  onAddNote?: (text: string) => void | Promise<void>;
  activity: readonly CustomerDetailActivity[];
  relatedInvoices?: readonly CustomerDetailInvoice[];
  attachedFiles?: readonly CustomerDetailFile[];
  filesDescription?: ReactNode;
  onAttach?: (files: File[]) => void | Promise<void>;
  backHref?: string;
  onBack?: () => void;
  onRetry?: () => void | Promise<void>;
};

type Localize = (en: string, es: string) => string;

export function createCustomerDetailSchema(l: Localize = (en) => en) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, l("Use at least two characters.", "Usa al menos dos caracteres."))
      .max(
        120,
        l("Use at most 120 characters.", "Usa como máximo 120 caracteres."),
      ),
    email: z
      .string()
      .trim()
      .max(
        254,
        l("Use at most 254 characters.", "Usa como máximo 254 caracteres."),
      )
      .pipe(
        z.email(l("Enter a valid email address.", "Escribe un correo válido.")),
      ),
    company: z
      .string()
      .trim()
      .max(
        200,
        l("Use at most 200 characters.", "Usa como máximo 200 caracteres."),
      ),
    plan: z
      .string()
      .trim()
      .min(1, l("Choose a plan.", "Elige un plan."))
      .max(
        60,
        l("Use at most 60 characters.", "Usa como máximo 60 caracteres."),
      ),
    status: z
      .string()
      .trim()
      .min(1, l("Choose a status.", "Elige un estado."))
      .max(
        60,
        l("Use at most 60 characters.", "Usa como máximo 60 caracteres."),
      ),
    amount: z
      .number({
        error: l("Enter a valid amount.", "Escribe un importe válido."),
      })
      .finite(l("Enter a valid amount.", "Escribe un importe válido."))
      .min(
        0,
        l(
          "The amount cannot be negative.",
          "El importe no puede ser negativo.",
        ),
      ),
  });
}

export type CustomerDetailValues = z.infer<
  ReturnType<typeof createCustomerDetailSchema>
>;

/** Only editable fields are merged; a draft cannot change record identity or join date. */
export function buildCustomerUpdate(
  customer: Customer,
  draft: CustomerDetailValues,
): Customer {
  return {
    ...customer,
    name: draft.name,
    email: draft.email,
    company: draft.company,
    plan: draft.plan,
    status: draft.status,
    amount: draft.amount,
  };
}

function draftFromCustomer(customer: Customer): CustomerDetailValues {
  return {
    name: customer.name,
    email: customer.email,
    company: customer.company,
    plan: customer.plan,
    status: customer.status,
    amount: customer.amount,
  };
}

function failureMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

function timestamp(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function useDetailFormatting() {
  const language = useLanguage();
  const money = (amount: number) =>
    language.number(amount, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
  const date = (value: string, withTime = false) => {
    if (!Number.isFinite(new Date(value).getTime()))
      return language.l("Date unavailable", "Fecha no disponible");
    return language.date(value, {
      month: "short",
      day: "numeric",
      year: "numeric",
      ...(value.length === 10 ? {} : { timeZone: "UTC" }),
      ...(withTime
        ? ({
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          } as const)
        : {}),
    });
  };
  return { ...language, money, date };
}

function statusLabel(value: string, l: Localize) {
  const labels: Record<string, string> = {
    active: l("Active", "Activo"),
    trial: l("Trial", "Prueba"),
    paused: l("Paused", "Pausado"),
    paid: l("Paid", "Pagada"),
    pending: l("Pending", "Pendiente"),
    overdue: l("Overdue", "Vencida"),
    draft: l("Draft", "Borrador"),
  };
  return labels[value] ?? value;
}

function StatusBadge({ value }: { value: string }) {
  const { l } = useLanguage();
  return (
    <Badge
      className="min-w-0 max-w-full whitespace-normal"
      variant={
        value === "trial" || value === "pending"
          ? "warning"
          : value === "overdue"
            ? "destructive"
            : value === "paused" || value === "draft"
              ? "neutral"
              : "default"
      }
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      <span className="min-w-0 break-words">{statusLabel(value, l)}</span>
    </Badge>
  );
}

function BackAction({
  backHref,
  onBack,
}: Pick<CustomerDetailTemplateProps, "backHref" | "onBack">) {
  const { l } = useLanguage();
  const label = l("Back to customers", "Volver a clientes");
  if (onBack) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        {label}
      </Button>
    );
  }
  if (backHref) {
    return (
      <Link
        href={backHref}
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        <ArrowLeft aria-hidden="true" />
        {label}
      </Link>
    );
  }
  return null;
}

export function CustomerDetailTemplate(props: CustomerDetailTemplateProps) {
  const { l } = useLanguage();
  const back =
    props.backHref || props.onBack ? (
      <BackAction backHref={props.backHref} onBack={props.onBack} />
    ) : undefined;
  if (!props.customer) {
    return (
      <GenericRecordDetail
        title={l("Customer", "Cliente")}
        loading={props.loading}
        error={props.error}
        onRetry={props.onRetry}
        notFound={!props.loading && !props.error}
        notFoundAction={back}
        backAction={props.loading || props.error ? back : undefined}
        labels={{
          loading: l("Loading customer…", "Cargando cliente…"),
          errorTitle: l(
            "Could not load this customer",
            "No se pudo cargar este cliente",
          ),
          notFoundTitle: l("Customer not found", "Cliente no encontrado"),
          notFoundDescription: l(
            "This customer may have been removed, or you may not have access. Return to the customer list to continue.",
            "Es posible que este cliente se haya eliminado o que no tengas acceso. Vuelve a la lista de clientes para continuar.",
          ),
        }}
      />
    );
  }
  return (
    <CustomerDetailBody
      key={props.customer.id}
      {...props}
      customer={props.customer}
      backAction={back}
    />
  );
}

function CustomerDetailBody({
  customer,
  avatarSrc,
  loading = false,
  error,
  canEdit = true,
  onSave,
  notes,
  onAddNote,
  activity,
  relatedInvoices = [],
  attachedFiles = [],
  filesDescription,
  onAttach,
  onRetry,
  backAction,
}: CustomerDetailTemplateProps & {
  customer: Customer;
  backAction?: ReactNode;
}) {
  const { l, money, date } = useDetailFormatting();
  const formId = useId();
  const editButton = useRef<HTMLButtonElement>(null);
  const editor = useRef<HTMLFormElement>(null);
  const savePending = useRef(false);
  const returnToEdit = useRef(false);
  const failedSubmitFocus = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const schema = useMemo(() => createCustomerDetailSchema(l), [l]);
  const form = useForm<CustomerDetailValues>({
    resolver: zodResolver(schema),
    defaultValues: draftFromCustomer(customer),
  });
  const { setFocus } = form;
  const rootError = form.formState.errors.root?.message;
  const busy = saving || form.formState.isSubmitting;
  const mayEdit = canEdit && !!onSave;
  const orderedActivity = [...activity].sort(
    (a, b) => timestamp(b.occurredAt) - timestamp(a.occurredAt),
  );

  useEffect(() => {
    if (editing) setFocus("name");
    else if (returnToEdit.current) {
      editButton.current?.focus();
      returnToEdit.current = false;
    }
  }, [editing, setFocus]);

  useEffect(() => {
    if (!busy && rootError && failedSubmitFocus.current) {
      failedSubmitFocus.current.focus();
      failedSubmitFocus.current = null;
    }
  }, [busy, rootError]);

  const beginEditing = () => {
    if (!mayEdit || loading) return;
    form.reset(draftFromCustomer(customer));
    setSaved(false);
    setActiveTab("summary");
    setEditing(true);
  };
  const cancel = () => {
    if (savePending.current) return;
    form.reset(draftFromCustomer(customer));
    returnToEdit.current = true;
    setEditing(false);
  };
  const submit = (event: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(
      async (values) => {
        if (!canEdit || !onSave || loading || savePending.current) return;
        savePending.current = true;
        setSaving(true);
        setSaved(false);
        const focused = document.activeElement;
        const focusTarget =
          focused instanceof HTMLElement && editor.current?.contains(focused)
            ? focused
            : null;
        try {
          await onSave(buildCustomerUpdate(customer, values));
          form.reset(values);
          returnToEdit.current = true;
          setEditing(false);
          setSaved(true);
        } catch (cause) {
          form.setError("root", {
            type: "server",
            message: failureMessage(
              cause,
              l(
                "Your changes could not be saved. Your draft is still here.",
                "No se pudieron guardar los cambios. Tu borrador sigue aquí.",
              ),
            ),
          });
          failedSubmitFocus.current = focusTarget;
        } finally {
          savePending.current = false;
          setSaving(false);
        }
      },
      (errors) => {
        const first = Object.keys(errors)[0];
        if (first === "plan" || first === "status") {
          document.getElementById(`${formId}-${first}`)?.focus();
        }
      },
    )(event);

  const plans = [...new Set([customer.plan, "Starter", "Pro", "Enterprise"])]
    .filter(Boolean)
    .map((value) => ({ value, label: value }));
  const statuses = [...new Set([customer.status, "active", "trial", "paused"])]
    .filter(Boolean)
    .map((value) => ({ value, label: statusLabel(value, l) }));
  const readOnlyCopy = !canEdit
    ? l(
        "You have read-only access to this customer.",
        "Tienes acceso de solo lectura a este cliente.",
      )
    : l(
        "Customer details are read-only.",
        "Los datos del cliente son de solo lectura.",
      );

  const summary = (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card appearance="flat">
        <CardHeader>
          <CardTitle>
            {editing
              ? l("Edit customer details", "Editar datos del cliente")
              : l("Customer details", "Datos del cliente")}
          </CardTitle>
          <CardDescription>
            {editing
              ? l(
                  "Keep contact and account information up to date.",
                  "Mantén al día la información de contacto y de la cuenta.",
                )
              : l(
                  "The essentials for a thoughtful customer relationship.",
                  "Lo esencial para una relación cercana con tu cliente.",
                )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form
              ref={editor}
              onSubmit={submit}
              noValidate
              aria-busy={busy}
              className="grid gap-5"
            >
              {!mayEdit && (
                <Alert
                  variant="warning"
                  title={l(
                    "Editing is unavailable",
                    "La edición no está disponible",
                  )}
                >
                  {l(
                    "Your draft is preserved. You can cancel or continue when editing is available again.",
                    "Tu borrador se conserva. Puedes cancelar o continuar cuando puedas editar de nuevo.",
                  )}
                </Alert>
              )}
              <fieldset
                disabled={saving || !mayEdit}
                className="grid min-w-0 gap-5 sm:grid-cols-2"
              >
                <legend className="sr-only">
                  {l("Customer details", "Datos del cliente")}
                </legend>
                <Field
                  label={l("Full name", "Nombre completo")}
                  error={form.formState.errors.name?.message}
                >
                  <Input
                    {...form.register("name")}
                    autoComplete="name"
                    maxLength={120}
                  />
                </Field>
                <Field
                  label={l("Email address", "Correo electrónico")}
                  error={form.formState.errors.email?.message}
                >
                  <Input
                    {...form.register("email")}
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                  />
                </Field>
                <Field
                  label={l("Company", "Empresa")}
                  description={l("Optional", "Opcional")}
                  error={form.formState.errors.company?.message}
                >
                  <Input
                    {...form.register("company")}
                    autoComplete="organization"
                    maxLength={200}
                  />
                </Field>
                <Controller
                  control={form.control}
                  name="plan"
                  render={({ field }) => (
                    <Field
                      label={l("Plan", "Plan")}
                      htmlFor={`${formId}-plan`}
                      error={form.formState.errors.plan?.message}
                    >
                      <Select
                        options={plans}
                        value={field.value}
                        name={field.name}
                        disabled={saving || !mayEdit}
                        onValueChange={(value) => {
                          field.onChange(value);
                          field.onBlur();
                        }}
                      />
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Field
                      label={l("Status", "Estado")}
                      htmlFor={`${formId}-status`}
                      error={form.formState.errors.status?.message}
                    >
                      <Select
                        options={statuses}
                        value={field.value}
                        name={field.name}
                        disabled={saving || !mayEdit}
                        onValueChange={(value) => {
                          field.onChange(value);
                          field.onBlur();
                        }}
                      />
                    </Field>
                  )}
                />
                <Field
                  label={l("Amount (USD)", "Importe (USD)")}
                  error={form.formState.errors.amount?.message}
                >
                  <Input
                    {...form.register("amount", { valueAsNumber: true })}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                  />
                </Field>
              </fieldset>
              {rootError && (
                <Alert
                  variant="destructive"
                  title={l(
                    "Could not save changes",
                    "No se pudieron guardar los cambios",
                  )}
                >
                  {rootError}
                </Alert>
              )}
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancel}
                  disabled={busy}
                >
                  {l("Cancel", "Cancelar")}
                </Button>
                {mayEdit && (
                  <Button type="submit" loading={busy} disabled={loading}>
                    <Save aria-hidden="true" />
                    {l("Save changes", "Guardar cambios")}
                  </Button>
                )}
              </div>
            </form>
          ) : (
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {[
                [l("Full name", "Nombre completo"), customer.name],
                [l("Email address", "Correo electrónico"), customer.email],
                [l("Company", "Empresa"), customer.company],
                [l("Customer ID", "ID de cliente"), customer.id],
                [l("Plan", "Plan"), customer.plan],
                [l("Status", "Estado"), statusLabel(customer.status, l)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1.5 text-[13px] leading-6 break-words">
                    {value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {!editing && !mayEdit && (
            <p className="mt-6 flex items-start gap-2 border-t border-border pt-4 text-xs leading-6 text-muted-foreground">
              <LockKeyhole
                aria-hidden="true"
                className="mt-1 size-3.5 shrink-0"
              />
              {readOnlyCopy}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-5">
        <Card appearance="flat">
          <CardHeader>
            <CardTitle>
              {l("Account at a glance", "La cuenta de un vistazo")}
            </CardTitle>
            <CardDescription>
              {l(
                "A little context, all in one place.",
                "Un poco de contexto, en un solo lugar.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {l("Account amount", "Importe de la cuenta")}
            </p>
            <p className="mt-2 text-[32px] font-semibold tracking-[-.04em] tabular-nums">
              {money(customer.amount)}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="min-w-0 max-w-full whitespace-normal break-words"
              >
                {customer.plan}
              </Badge>
              <StatusBadge value={customer.status} />
            </div>
            <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted-foreground">
                  {l("Customer since", "Cliente desde")}
                </dt>
                <dd>{date(customer.joined)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">
                  {l("Team notes", "Notas del equipo")}
                </dt>
                <dd className="tabular-nums">{notes.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">
                  {l("Attached files", "Archivos adjuntos")}
                </dt>
                <dd className="tabular-nums">{attachedFiles.length}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <ActivityPanel items={orderedActivity.slice(0, 3)} compact />
      </div>
    </div>
  );

  const tabs: RecordDetailTab[] = [
    {
      value: "summary",
      label: l("Summary", "Resumen"),
      icon: <LayoutDashboard />,
      content: summary,
    },
    {
      value: "activity",
      label: l("Activity", "Actividad"),
      icon: <Activity />,
      count: activity.length,
      content: <ActivityPanel items={orderedActivity} />,
    },
    {
      value: "notes",
      label: l("Notes", "Notas"),
      icon: <MessageSquare />,
      count: notes.length,
      content: (
        <NotesPanel
          notes={notes}
          canAdd={canEdit && !!onAddNote}
          loading={loading}
          onAddNote={onAddNote}
        />
      ),
    },
    {
      value: "files",
      label: l("Files", "Archivos"),
      icon: <FolderOpen />,
      count: attachedFiles.length,
      content: (
        <FilesPanel
          files={attachedFiles}
          description={filesDescription}
          canAttach={canEdit && !!onAttach}
          loading={loading}
          onAttach={onAttach}
        />
      ),
    },
    {
      value: "related",
      label: l("Related", "Relacionados"),
      icon: <Receipt />,
      count: relatedInvoices.length,
      content: <RelatedPanel invoices={relatedInvoices} />,
    },
  ];

  return (
    <GenericRecordDetail
      eyebrow={l("Customer profile", "Perfil de cliente")}
      title={customer.name}
      subtitle={
        <>
          {customer.company && (
            <>
              {customer.company}
              <span aria-hidden="true" className="mx-2">
                ·
              </span>
            </>
          )}
          <span className="break-all">{customer.email}</span>
        </>
      }
      avatar={
        <Avatar
          name={customer.name}
          src={avatarSrc}
          size="lg"
          className="size-14 rounded-2xl border-primary/20 text-lg sm:size-16"
        />
      }
      status={<StatusBadge value={customer.status} />}
      metadata={[
        {
          id: "company",
          label: l("Company", "Empresa"),
          value: customer.company || "—",
          icon: <Building2 />,
        },
        {
          id: "plan",
          label: l("Plan", "Plan"),
          value: customer.plan,
          icon: <CreditCard />,
        },
        {
          id: "joined",
          label: l("Customer since", "Cliente desde"),
          value: date(customer.joined),
          icon: <CalendarDays />,
        },
        {
          id: "email",
          label: l("Contact", "Contacto"),
          value: <span className="break-all">{customer.email}</span>,
          icon: <Mail />,
        },
      ]}
      actions={
        editing ? (
          <Badge variant="outline">
            <Pencil aria-hidden="true" />
            {l("Editing details", "Editando datos")}
          </Badge>
        ) : mayEdit ? (
          <Button
            ref={editButton}
            type="button"
            variant="outline"
            onClick={beginEditing}
            disabled={loading}
          >
            <Pencil aria-hidden="true" />
            {l("Edit customer", "Editar cliente")}
          </Button>
        ) : (
          <Badge variant="neutral">
            <LockKeyhole aria-hidden="true" />
            {!canEdit
              ? l("Read-only access", "Acceso de solo lectura")
              : l("Details read-only", "Datos de solo lectura")}
          </Badge>
        )
      }
      backAction={backAction}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      loading={loading}
      error={error}
      onRetry={onRetry}
      relatedContent={
        saved ? (
          <Alert
            variant="success"
            title={l("Changes saved", "Cambios guardados")}
          >
            {l(
              "The customer details have been saved.",
              "Los datos del cliente se han guardado.",
            )}
          </Alert>
        ) : undefined
      }
      labels={{
        refreshing: l(
          "Updating customer… Your current view stays available.",
          "Actualizando cliente… Tu vista actual sigue disponible.",
        ),
        errorTitle: l(
          "Could not update this customer",
          "No se pudo actualizar este cliente",
        ),
        tabs: l("Customer sections", "Secciones del cliente"),
      }}
    />
  );
}

function ActivityPanel({
  items,
  compact = false,
}: {
  items: readonly CustomerDetailActivity[];
  compact?: boolean;
}) {
  const { l, date } = useDetailFormatting();
  return (
    <Card appearance="flat">
      <CardHeader>
        <CardTitle>
          {compact
            ? l("Recent activity", "Actividad reciente")
            : l("Activity", "Actividad")}
        </CardTitle>
        <CardDescription>
          {l(
            "A shared history of this customer relationship.",
            "El historial compartido de la relación con este cliente.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!items.length ? (
          <Empty
            icon={<Activity aria-hidden="true" />}
            title={l("No activity yet", "Aún no hay actividad")}
            description={l(
              "Updates to this customer will appear here.",
              "Las actualizaciones de este cliente aparecerán aquí.",
            )}
            className="py-7"
          />
        ) : (
          <ol className="grid gap-5">
            {items.map((item, index) => (
              <li key={item.id} className="relative flex min-w-0 gap-3">
                {index < items.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-8 bottom-[-20px] left-[15px] w-px bg-border"
                  />
                )}
                <span
                  aria-hidden="true"
                  className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-subtle text-primary"
                >
                  <Activity className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] leading-6 break-words">
                    <span className="font-semibold">{item.actor}</span>
                    <span className="ml-2 text-muted-foreground">
                      {item.detail}
                    </span>
                  </p>
                  <time
                    dateTime={
                      timestamp(item.occurredAt) ? item.occurredAt : undefined
                    }
                    className="mt-1 block text-[11px] text-muted-foreground"
                  >
                    {date(item.occurredAt, true)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function NotesPanel({
  notes,
  canAdd,
  loading,
  onAddNote,
}: {
  notes: readonly CustomerDetailNote[];
  canAdd: boolean;
  loading: boolean;
  onAddNote?: CustomerDetailTemplateProps["onAddNote"];
}) {
  const { l, date } = useDetailFormatting();
  const pending = useRef(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const restoreFocus = useRef(false);
  const schema = z.object({
    text: z
      .string()
      .trim()
      .min(
        1,
        l(
          "Write a note before adding it.",
          "Escribe una nota antes de añadirla.",
        ),
      )
      .max(
        4000,
        l(
          "Keep your note within 4,000 characters.",
          "La nota debe tener como máximo 4.000 caracteres.",
        ),
      ),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { text: "" },
  });
  const { setFocus } = form;
  const failure = form.formState.errors.root?.message;
  const busy = adding || form.formState.isSubmitting;
  useEffect(() => {
    if (!busy && restoreFocus.current) {
      setFocus("text");
      restoreFocus.current = false;
    }
  }, [busy, failure, setFocus]);
  const submit = (event: FormEvent<HTMLFormElement>) =>
    form.handleSubmit(async ({ text }) => {
      if (!canAdd || !onAddNote || loading || pending.current) return;
      pending.current = true;
      setAdding(true);
      setAdded(false);
      try {
        await onAddNote(text);
        form.reset({ text: "" });
        setAdded(true);
        restoreFocus.current = true;
      } catch (cause) {
        form.setError("root", {
          type: "server",
          message: failureMessage(
            cause,
            l(
              "The note could not be added. Your text is still here.",
              "No se pudo añadir la nota. El texto sigue aquí.",
            ),
          ),
        });
        restoreFocus.current = true;
      } finally {
        pending.current = false;
        setAdding(false);
      }
    })(event);
  const ordered = [...notes].sort(
    (a, b) => timestamp(b.createdAt) - timestamp(a.createdAt),
  );
  return (
    <Card appearance="flat">
      <CardHeader>
        <CardTitle>{l("Team notes", "Notas del equipo")}</CardTitle>
        <CardDescription>
          {l(
            "Useful context for the next conversation.",
            "Contexto útil para la próxima conversación.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {canAdd && onAddNote ? (
          <form
            onSubmit={submit}
            noValidate
            aria-busy={busy}
            className="grid gap-3"
          >
            <Field
              label={l("Add a note", "Añadir una nota")}
              description={l(
                "Up to 4,000 characters. Shared with your team.",
                "Hasta 4.000 caracteres. Se comparte con tu equipo.",
              )}
              error={form.formState.errors.text?.message}
            >
              <Textarea
                {...form.register("text")}
                maxLength={4000}
                disabled={adding}
                placeholder={l(
                  "What should your team know?",
                  "¿Qué debería saber tu equipo?",
                )}
              />
            </Field>
            {failure && (
              <Alert
                variant="destructive"
                title={l("Could not add note", "No se pudo añadir la nota")}
              >
                {failure}
              </Alert>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span role="status" className="text-xs text-muted-foreground">
                {added ? l("Note added.", "Nota añadida.") : ""}
              </span>
              <Button type="submit" loading={busy} disabled={loading}>
                <Send aria-hidden="true" />
                {l("Add note", "Añadir nota")}
              </Button>
            </div>
          </form>
        ) : (
          <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
            <LockKeyhole
              aria-hidden="true"
              className="mt-1 size-3.5 shrink-0"
            />
            {l(
              "Notes are read-only. You can read the context shared by your team.",
              "Las notas son de solo lectura. Puedes leer el contexto compartido por tu equipo.",
            )}
          </p>
        )}
        {!ordered.length ? (
          <Empty
            icon={<MessageSquare aria-hidden="true" />}
            title={l("No notes yet", "Aún no hay notas")}
            description={l(
              "Customer notes will appear here.",
              "Las notas del cliente aparecerán aquí.",
            )}
            className="py-7"
          />
        ) : (
          <ul className="grid gap-4">
            {ordered.map((note) => (
              <li
                key={note.id}
                className="min-w-0 rounded-xl border border-border bg-surface-subtle/30 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar
                    name={note.author}
                    src={note.authorAvatarSrc}
                    size="sm"
                  />
                  <span className="text-xs font-semibold">{note.author}</span>
                  <time
                    dateTime={
                      timestamp(note.createdAt) ? note.createdAt : undefined
                    }
                    className="text-[11px] text-muted-foreground"
                  >
                    {date(note.createdAt, true)}
                  </time>
                </div>
                <p className="mt-3 text-[13px] leading-7 break-words whitespace-pre-wrap">
                  {note.text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function FilesPanel({
  files,
  description,
  canAttach,
  loading,
  onAttach,
}: {
  files: readonly CustomerDetailFile[];
  description?: ReactNode;
  canAttach: boolean;
  loading: boolean;
  onAttach?: CustomerDetailTemplateProps["onAttach"];
}) {
  const { l, number, date } = useDetailFormatting();
  const [selected, setSelected] = useState<File[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const pending = useRef(false);
  const attach = async () => {
    if (
      !canAttach ||
      !onAttach ||
      loading ||
      !selected.length ||
      pending.current
    )
      return;
    pending.current = true;
    setAttaching(true);
    setProblem(null);
    setComplete(false);
    try {
      await onAttach([...selected]);
      setSelected([]);
      setComplete(true);
    } catch (cause) {
      setProblem(
        failureMessage(
          cause,
          l(
            "The files could not be attached. Your selection is still here.",
            "No se pudieron adjuntar los archivos. Tu selección sigue aquí.",
          ),
        ),
      );
    } finally {
      pending.current = false;
      setAttaching(false);
    }
  };
  const sizeLabel = (size: number) => {
    if (!Number.isFinite(size) || size < 0) return "";
    if (size < 1024) return `${number(size)} B`;
    if (size < 1024 ** 2)
      return `${number(size / 1024, { maximumFractionDigits: 1 })} KB`;
    return `${number(size / 1024 ** 2, { maximumFractionDigits: 1 })} MB`;
  };
  return (
    <Card appearance="flat">
      <CardHeader>
        <CardTitle>{l("Customer files", "Archivos del cliente")}</CardTitle>
        <CardDescription>
          {description ??
            l(
              "Keep the relevant documents close to the relationship.",
              "Mantén los documentos relevantes junto a la relación con el cliente.",
            )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {canAttach && onAttach && (
          <div className="grid gap-3">
            <FileUpload
              files={selected}
              onFilesChange={(next) => {
                setSelected(next);
                setComplete(false);
              }}
              disabled={attaching}
              labels={{
                title: l(
                  "Attach customer files",
                  "Adjuntar archivos del cliente",
                ),
                description: l(
                  "Drop files here or browse. Up to 10 MB per file.",
                  "Arrastra archivos o selecciónalos. Hasta 10 MB por archivo.",
                ),
                browse: l("Choose files", "Seleccionar archivos"),
                remove: l("Remove", "Eliminar"),
                tooLarge: l(
                  "File exceeds 10 MB.",
                  "El archivo supera los 10 MB.",
                ),
                invalidType: l(
                  "This file type is not supported.",
                  "Este tipo de archivo no es compatible.",
                ),
              }}
            />
            {problem && (
              <Alert
                variant="destructive"
                title={l(
                  "Could not attach files",
                  "No se pudieron adjuntar los archivos",
                )}
              >
                {problem}
              </Alert>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span role="status" className="text-xs text-muted-foreground">
                {complete ? l("Files attached.", "Archivos adjuntados.") : ""}
              </span>
              <Button
                type="button"
                onClick={() => void attach()}
                loading={attaching}
                disabled={loading || !selected.length}
              >
                <Paperclip aria-hidden="true" />
                {l("Attach files", "Adjuntar archivos")}
              </Button>
            </div>
          </div>
        )}
        {!files.length ? (
          <Empty
            icon={<FolderOpen aria-hidden="true" />}
            title={l("No attached files", "No hay archivos adjuntos")}
            description={l(
              "Documents attached to this customer will appear here.",
              "Los documentos adjuntos de este cliente aparecerán aquí.",
            )}
            className="py-7"
          />
        ) : (
          <ul className="grid gap-3">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex min-w-0 items-start gap-3 rounded-xl border border-border p-4"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-primary"
                >
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium break-words">
                    {file.name}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {file.size !== undefined && (
                      <span>{sizeLabel(file.size)}</span>
                    )}
                    {file.type && (
                      <span className="break-all">{file.type}</span>
                    )}
                    {file.createdAt && (
                      <time
                        dateTime={
                          timestamp(file.createdAt) ? file.createdAt : undefined
                        }
                      >
                        {date(file.createdAt)}
                      </time>
                    )}
                  </p>
                </div>
                {file.url && (
                  <TextLink
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={l(`Open ${file.name}`, `Abrir ${file.name}`)}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs"
                  >
                    {l("Open", "Abrir")}
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </TextLink>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RelatedPanel({
  invoices,
}: {
  invoices: readonly CustomerDetailInvoice[];
}) {
  const { l, money, date } = useDetailFormatting();
  return (
    <Card appearance="flat">
      <CardHeader>
        <CardTitle>{l("Related invoices", "Facturas relacionadas")}</CardTitle>
        <CardDescription>
          {l(
            "Billing records associated with this customer.",
            "Registros de facturación asociados con este cliente.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!invoices.length ? (
          <Empty
            icon={<Receipt aria-hidden="true" />}
            title={l("No related invoices", "No hay facturas relacionadas")}
            description={l(
              "Associated invoices will appear here when available.",
              "Las facturas asociadas aparecerán aquí cuando estén disponibles.",
            )}
            className="py-7"
          />
        ) : (
          <Table
            aria-label={l("Related invoices", "Facturas relacionadas")}
            density="compact"
          >
            <TableHeader>
              <TableRow>
                <TableHead>{l("Invoice", "Factura")}</TableHead>
                <TableHead>{l("Status", "Estado")}</TableHead>
                <TableHead>{l("Date", "Fecha")}</TableHead>
                <TableHead className="text-right">
                  {l("Amount", "Importe")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    {invoice.href ? (
                      <TextLink href={invoice.href}>
                        {invoice.number || invoice.name || invoice.id}
                      </TextLink>
                    ) : (
                      <span className="font-medium">
                        {invoice.number || invoice.name || invoice.id}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={invoice.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {invoice.date ? date(invoice.date) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                    {money(invoice.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
