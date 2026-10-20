"use client";

import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import { Check, CircleAlert, RefreshCw, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  IntegrationAction,
  IntegrationValues,
} from "@/lib/integrations/contracts";
import {
  operationalSensitiveField,
  operationalPermitted,
  operationalText,
  validateOperationalValues,
  type OperationalFieldError,
} from "./operational-model";
import type { OperationalSession } from "./operational-session";

const permissionContext = createContext<readonly string[] | null>(null);

export function OperationalPermissionsProvider({
  permissions,
  children,
}: {
  permissions: readonly string[];
  children: ReactNode;
}) {
  return (
    <permissionContext.Provider value={permissions}>
      {children}
    </permissionContext.Provider>
  );
}

export function OperationalPermissionNote({
  action,
}: {
  action: IntegrationAction | null;
}) {
  const { l } = useLanguage();
  const permissions = useContext(permissionContext);
  if (!action || !permissions || operationalPermitted(action, permissions))
    return null;
  return (
    <p
      role="status"
      className="rounded-lg border border-border bg-surface-subtle p-3 text-xs leading-6 text-muted-foreground"
    >
      {l(
        "This connection needs permission for this action. Update its permissions in connection settings.",
        "Esta conexión necesita permiso para esta acción. Actualiza los permisos en sus ajustes de conexión.",
      )}
    </p>
  );
}

export function OperationalPanel({
  title,
  description,
  children,
  className,
  accessory,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  accessory?: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 id={id} className="text-sm font-semibold tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {accessory}
      </div>
      {children}
    </section>
  );
}

export function OperationalEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-subtle/50 px-5 py-8 text-center text-xs leading-6 text-muted-foreground">
      {children}
    </div>
  );
}

export function OperationalFields({
  action,
  values,
  onChange,
  disabled,
  errors = {},
  exclude = [],
}: {
  action: IntegrationAction;
  values: IntegrationValues;
  onChange: (values: IntegrationValues) => void;
  disabled?: boolean;
  errors?: Record<string, OperationalFieldError>;
  exclude?: string[];
}) {
  const { l } = useLanguage();
  const prefix = useId();
  const messages: Record<OperationalFieldError, string> = {
    required: l("Complete this field.", "Completa este campo."),
    number: l("Enter a finite number.", "Escribe un número válido."),
    url: l(
      "Use a public HTTPS URL or a relative path.",
      "Usa una URL HTTPS pública o una ruta relativa.",
    ),
    option: l("Choose an available option.", "Elige una opción disponible."),
    json: l("Enter valid JSON.", "Escribe JSON válido."),
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {action.fields
        .filter((field) => !exclude.includes(field.id))
        .map((field) => {
          const id = `${prefix}-${field.id}`;
          const label = l(field.label.en, field.label.es);
          const value = values[field.id];
          const error = errors[field.id]
            ? messages[errors[field.id]]
            : undefined;
          const description = field.description
            ? l(field.description.en, field.description.es)
            : undefined;
          const change = (next: string | number | boolean) =>
            onChange({ ...values, [field.id]: next });
          if (operationalSensitiveField(field.id)) {
            return (
              <p
                key={field.id}
                className="text-xs leading-6 text-muted-foreground sm:col-span-2"
              >
                {l(
                  "This action requires server configuration. Credentials belong in your backend connection.",
                  "Esta acción requiere configuración del servidor. Las credenciales pertenecen a la conexión de tu backend.",
                )}
              </p>
            );
          }
          const multiline =
            field.type === "text" &&
            /body|content|message|payload|variables|mapping|properties|arguments|cuerpo|contenido/i.test(
              `${field.id} ${field.label.en}`,
            );
          if (field.type === "toggle") {
            return (
              <div key={field.id} className="space-y-1.5">
                <label
                  htmlFor={id}
                  className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-surface-subtle/40 px-3 text-xs font-medium"
                >
                  <span>
                    {label}
                    {field.required ? " *" : ""}
                  </span>
                  <Switch
                    id={id}
                    checked={value === true}
                    onCheckedChange={change}
                    disabled={disabled}
                    aria-describedby={
                      description || error ? `${id}-help` : undefined
                    }
                    aria-invalid={Boolean(error)}
                  />
                </label>
                {(description || error) && (
                  <p
                    id={`${id}-help`}
                    role={error ? "alert" : undefined}
                    className={cn(
                      "text-xs leading-5",
                      error
                        ? "text-destructive-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {error ?? description}
                  </p>
                )}
              </div>
            );
          }
          return (
            <Field
              key={field.id}
              htmlFor={id}
              label={`${label}${field.required ? " *" : ""}`}
              description={description}
              error={error}
              className={multiline ? "sm:col-span-2" : undefined}
            >
              {field.type === "select" ? (
                <Select
                  value={typeof value === "string" ? value : ""}
                  options={(field.options ?? []).map((option) => ({
                    value: option.value,
                    label: l(option.label.en, option.label.es),
                  }))}
                  onValueChange={change}
                  disabled={disabled}
                  placeholder={l("Choose…", "Elige…")}
                  aria-label={label}
                />
              ) : multiline ? (
                <Textarea
                  value={typeof value === "string" ? value : ""}
                  onChange={(event) => change(event.target.value)}
                  disabled={disabled}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={4}
                />
              ) : (
                <Input
                  value={
                    typeof value === "number" || typeof value === "string"
                      ? value
                      : ""
                  }
                  type={
                    field.type === "number"
                      ? "number"
                      : field.type === "url"
                        ? "url"
                        : /recipient|email|(^|[_-])to($|[_-])/i.test(field.id)
                          ? "email"
                          : "text"
                  }
                  step={field.type === "number" ? "any" : undefined}
                  onChange={(event) =>
                    change(
                      field.type === "number" && event.target.value !== ""
                        ? Number(event.target.value)
                        : event.target.value,
                    )
                  }
                  disabled={disabled}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </Field>
          );
        })}
    </div>
  );
}

export function OperationalActionForm({
  action,
  values,
  onChange,
  onSubmit,
  disabled,
  pending,
  buttonLabel,
  children,
  exclude = [],
}: {
  action: IntegrationAction | null;
  values: IntegrationValues;
  onChange: (values: IntegrationValues) => void;
  onSubmit: (values: IntegrationValues) => void;
  disabled?: boolean;
  pending?: boolean;
  buttonLabel?: string;
  children?: ReactNode;
  exclude?: string[];
}) {
  const { l } = useLanguage();
  const permissions = useContext(permissionContext);
  const [attempted, setAttempted] = useState(false);
  if (!action) {
    return (
      <OperationalEmpty>
        {l(
          "This connection does not expose this action.",
          "Esta conexión no ofrece esta acción.",
        )}
      </OperationalEmpty>
    );
  }
  const errors = validateOperationalValues(action, values);
  const permitted = !permissions || operationalPermitted(action, permissions);
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setAttempted(true);
        if (!Object.keys(errors).length && !disabled && !pending && permitted)
          onSubmit(values);
      }}
    >
      <OperationalFields
        action={action}
        values={values}
        onChange={onChange}
        disabled={pending}
        errors={attempted ? errors : {}}
        exclude={exclude}
      />
      {children}
      <OperationalPermissionNote action={action} />
      <Button
        type="submit"
        disabled={disabled || !permitted}
        loading={pending}
        appearance="gradient"
      >
        {buttonLabel ?? l(action.label.en, action.label.es)}
      </Button>
    </form>
  );
}

export function OperationalFeedback({
  operation,
  label,
}: {
  operation: OperationalSession["read"];
  label?: string;
}) {
  const { l } = useLanguage();
  if (!operation.pending && !operation.error) return null;
  const cancelled = operation.errorCode === "cancelled";
  return (
    <div
      role={operation.error && !cancelled ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-subtle px-4 py-3",
        operation.error && !cancelled && "border-destructive/30",
      )}
    >
      <div className="min-w-0 flex-1 text-xs leading-6">
        <p className="flex items-center gap-2">
          {operation.pending ? (
            <Spinner
              label={label ?? l("Working", "Procesando")}
              className="size-4"
            />
          ) : (
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          )}
          {operation.error ??
            label ??
            l("Waiting for the backend…", "Esperando al backend…")}
        </p>
        {cancelled && (
          <p className="text-muted-foreground">
            {l(
              "Waiting stopped. Check the backend before repeating a side effect.",
              "Se dejó de esperar. Comprueba el backend antes de repetir una operación con efectos.",
            )}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        type="button"
        onClick={operation.pending ? operation.cancel : operation.reset}
      >
        <X aria-hidden="true" />
        {operation.pending
          ? l("Cancel request", "Cancelar solicitud")
          : l("Dismiss", "Cerrar")}
      </Button>
    </div>
  );
}

export function OperationalRefresh({
  session,
  values,
}: {
  session: OperationalSession;
  values?: IntegrationValues;
}) {
  const { l } = useLanguage();
  if (!session.query) return null;
  const input = values ?? session.initialQueryValues;
  const needsInput =
    !values &&
    !session.loaded &&
    Object.keys(validateOperationalValues(session.query, input)).length > 0;
  if (needsInput) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      type="button"
      loading={session.read.pending}
      disabled={!session.can(session.query) || session.write.pending}
      onClick={() => void session.refresh(values ? input : undefined)}
    >
      <RefreshCw aria-hidden="true" />
      {l("Refresh", "Actualizar")}
    </Button>
  );
}

export type OperationalReviewPacket = {
  action: IntegrationAction;
  values: IntegrationValues;
  summary?: { label: string; value: string }[];
  content?: string;
};

export function OperationalReviewDialog({
  packet,
  demo,
  onConfirm,
  onReject,
}: {
  packet: OperationalReviewPacket;
  demo: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const { l } = useLanguage();
  const checkId = useId();
  const [acknowledged, setAcknowledged] = useState(false);
  const rows =
    packet.summary ??
    packet.action.fields
      .filter(
        (field) =>
          !operationalSensitiveField(field.id) &&
          packet.values[field.id] !== undefined,
      )
      .map((field) => ({
        label: l(field.label.en, field.label.es),
        value: operationalText(packet.values[field.id], 1200),
      }));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onReject();
      }}
    >
      <DialogContent
        closeLabel={l("Close review", "Cerrar revisión")}
        className="max-w-2xl"
      >
        <DialogTitle>
          {l("Review before running", "Revisa antes de ejecutar")}
        </DialogTitle>
        <DialogDescription>
          {l(packet.action.label.en, packet.action.label.es)} ·{" "}
          {demo
            ? l(
                "Local demo. No external delivery or trigger.",
                "Demo local. Sin envío ni activación externa.",
              )
            : l(
                "The confirmed values will be sent to your connected backend.",
                "Los valores confirmados se enviarán a tu backend conectado.",
              )}
        </DialogDescription>
        <dl className="mt-5 grid gap-3 rounded-xl border border-border bg-surface-subtle/50 p-4">
          {rows.map((row, index) => (
            <div
              key={`${row.label}-${index}`}
              className="grid gap-1 sm:grid-cols-[9rem_1fr]"
            >
              <dt className="text-xs font-medium text-muted-foreground">
                {row.label}
              </dt>
              <dd className="whitespace-pre-wrap break-words text-xs leading-6">
                {operationalText(row.value, 1800) || l("Empty", "Vacío")}
              </dd>
            </div>
          ))}
        </dl>
        {packet.content && (
          <div className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border p-4 text-sm leading-7">
            {operationalText(packet.content, 64000)}
          </div>
        )}
        <label
          htmlFor={checkId}
          className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 text-xs leading-6"
        >
          <Checkbox
            id={checkId}
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
          />
          {l(
            "I reviewed the recipient, resource and content of this action.",
            "Revisé el destinatario, el recurso y el contenido de esta acción.",
          )}
        </label>
        <DialogFooter className="flex-wrap">
          <Button variant="outline" type="button" onClick={onReject}>
            {l("Back to editing", "Volver a editar")}
          </Button>
          <Button type="button" disabled={!acknowledged} onClick={onConfirm}>
            <Check aria-hidden="true" />
            {l("Confirm and run", "Confirmar y ejecutar")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
