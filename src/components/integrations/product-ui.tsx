"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, Check, ExternalLink, RefreshCw, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type {
  IntegrationAction,
  IntegrationField,
  IntegrationJob,
  IntegrationRecord,
  IntegrationResource,
  IntegrationResult,
  IntegrationSearchHit,
  IntegrationValues,
  IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import {
  invalidProductField,
  productSearchSegments,
  safeProductUrl,
} from "./product-model";

export type ProductOperation = ReturnType<
  typeof import("@/hooks/use-integration-operation").useIntegrationOperation
>;

export function ProductPanel({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6",
        className,
      )}
    >
      <header className="mb-5">
        <h3 id={id} className="text-sm font-semibold tracking-tight">
          {title}
        </h3>
        {description && (
          <div className="mt-1 text-xs leading-6 text-muted-foreground">
            {description}
          </div>
        )}
      </header>
      {children}
    </section>
  );
}

export function ProductEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-surface-subtle/50 p-6 text-center text-xs leading-6 text-muted-foreground">
      {children}
    </p>
  );
}

export function ProductStatus({ value }: { value: string }) {
  const { l } = useLanguage();
  const labels: Record<string, [string, string]> = {
    connected: ["Connected", "Conectado"],
    syncing: ["Syncing", "Sincronizando"],
    ready: ["Ready", "Listo"],
    indexing: ["Indexing", "Indexando"],
    active: ["Active", "Activo"],
    archived: ["Archived", "Archivado"],
    online: ["Online", "En línea"],
    away: ["Away", "Ausente"],
    editing: ["Editing", "Editando"],
    connecting: ["Connecting", "Conectando"],
    reconnecting: ["Reconnecting", "Reconectando"],
    closed: ["Closed", "Cerrado"],
    pending: ["Pending", "Pendiente"],
    queued: ["Queued", "En cola"],
    running: ["Running", "En curso"],
    completed: ["Completed", "Completado"],
    failed: ["Failed", "Falló"],
    cancelled: ["Cancelled", "Cancelado"],
    rejected: ["Rejected", "Rechazado"],
    "approval-required": ["Approval required", "Requiere aprobación"],
    "permission-denied": ["Access denied", "Acceso denegado"],
    expired: ["Expired", "Caducado"],
    offline: ["Offline", "Sin conexión"],
    "not-configured": ["Not configured", "Sin configurar"],
    "not-requested": ["Not requested", "Sin solicitar"],
    unverified: ["Unverified", "Sin verificar"],
    verified: ["Verified", "Verificado"],
    granted: ["Granted", "Concedido"],
    approved: ["Approved", "Aprobado"],
    revoked: ["Revoked", "Revocado"],
    due: ["Renewal due", "Renovación pendiente"],
    disabled: ["Disabled", "Desactivado"],
    passing: ["Passing", "Cumple"],
    review: ["Needs review", "Requiere revisión"],
    blocked: ["Blocked", "Bloqueado"],
    deleting: ["Deleting", "Eliminando"],
    deleted: ["Deleted", "Eliminado"],
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-border bg-surface-subtle px-2.5 py-1 text-[11px]",
        ["failed", "permission-denied", "expired"].includes(value) &&
          "border-destructive/30 text-destructive-foreground",
      )}
    >
      {labels[value] ? l(...labels[value]) : value}
    </span>
  );
}

export function ProductDate({ value }: { value: string }) {
  const { date, l } = useLanguage();
  return (
    <>
      {Number.isFinite(Date.parse(value))
        ? date(value, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : l("Not available", "No disponible")}
    </>
  );
}

export function ProductFields({
  action,
  fields = action?.fields ?? [],
  values,
  onChange,
  exclude = [],
  disabled,
}: {
  action?: IntegrationAction;
  fields?: readonly IntegrationField[];
  values: IntegrationValues;
  onChange: (values: IntegrationValues) => void;
  exclude?: readonly string[];
  disabled?: boolean;
}) {
  const { l } = useLanguage();
  const id = useId();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields
        .filter((field) => !exclude.includes(field.id))
        .map((field) => {
          const inputId = `${id}-${field.id}`;
          const descriptionId = `${inputId}-description`;
          const value = values[field.id];
          const label = l(field.label.en, field.label.es);
          const change = (next: string | number | boolean) =>
            onChange({ ...values, [field.id]: next });
          return (
            <div key={field.id} className="min-w-0 space-y-1.5">
              <label htmlFor={inputId} className="block text-xs font-medium">
                {label}
                {field.required && <span aria-hidden="true"> *</span>}
              </label>
              {field.type === "toggle" ? (
                <div className="flex min-h-10 items-center gap-2">
                  <Checkbox
                    id={inputId}
                    checked={value === true}
                    onCheckedChange={change}
                    disabled={disabled}
                    aria-describedby={
                      field.description ? descriptionId : undefined
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {value === true
                      ? l("Enabled", "Activado")
                      : l("Disabled", "Desactivado")}
                  </span>
                </div>
              ) : field.type === "select" ? (
                <Select
                  id={inputId}
                  aria-label={label}
                  value={
                    typeof value === "string"
                      ? value
                      : (field.options?.[0]?.value ?? "")
                  }
                  options={(field.options ?? []).map((option) => ({
                    value: option.value,
                    label: l(option.label.en, option.label.es),
                  }))}
                  onValueChange={change}
                  disabled={disabled}
                  aria-describedby={
                    field.description ? descriptionId : undefined
                  }
                />
              ) : (
                <Input
                  id={inputId}
                  type={
                    field.type === "number"
                      ? "number"
                      : field.type === "url"
                        ? "url"
                        : "text"
                  }
                  step={field.type === "number" ? "any" : undefined}
                  value={
                    typeof value === "string" || typeof value === "number"
                      ? value
                      : ""
                  }
                  placeholder={field.placeholder}
                  required={field.required}
                  disabled={disabled}
                  aria-describedby={
                    field.description ? descriptionId : undefined
                  }
                  onChange={(event) =>
                    change(
                      field.type === "number" && event.target.value !== ""
                        ? Number(event.target.value)
                        : event.target.value,
                    )
                  }
                />
              )}
              {field.description && (
                <p
                  id={descriptionId}
                  className="text-[11px] leading-5 text-muted-foreground"
                >
                  {l(field.description.en, field.description.es)}
                </p>
              )}
            </div>
          );
        })}
    </div>
  );
}

export function ProductValidation({
  action,
  values,
}: {
  action?: IntegrationAction;
  values: IntegrationValues;
}) {
  const { l } = useLanguage();
  const field = invalidProductField(action, values);
  return field ? (
    <p className="text-xs text-muted-foreground">
      {l("Complete or correct", "Completa o corrige")}{" "}
      {l(field.label.en, field.label.es)}.
    </p>
  ) : null;
}

export function ProductActionUnavailable({
  action,
}: {
  action?: IntegrationAction;
}) {
  const { l } = useLanguage();
  return action ? null : (
    <ProductEmpty>
      {l(
        "This connection does not expose this operation. Choose a supported workflow or update its backend recipe.",
        "Esta conexión no ofrece esta operación. Elige un flujo compatible o actualiza su receta en el backend.",
      )}
    </ProductEmpty>
  );
}

export function ProductOperationFeedback({
  operation,
}: {
  operation: ProductOperation;
}) {
  const { l } = useLanguage();
  if (!operation.pending && !operation.error) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-subtle p-3",
        operation.error && "border-destructive/25",
      )}
      role={operation.error ? "alert" : "status"}
      aria-live="polite"
    >
      <p className="flex min-w-0 items-center gap-2 text-xs leading-6">
        <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
        {operation.error ??
          l("Waiting for the connection…", "Esperando a la conexión…")}
      </p>
      <Button
        size="sm"
        variant="ghost"
        onClick={operation.pending ? operation.cancel : operation.reset}
      >
        <X />
        {operation.pending
          ? l("Stop waiting", "Dejar de esperar")
          : l("Dismiss", "Cerrar")}
      </Button>
    </div>
  );
}

export function ProductReview({
  action,
  values,
  onConfirm,
  onReject,
  pending,
  disabled,
  grantedPermissions,
  children,
}: {
  action: IntegrationAction;
  values: IntegrationValues;
  onConfirm: () => void;
  onReject: () => void;
  pending?: boolean;
  disabled?: boolean;
  grantedPermissions?: readonly string[];
  children?: ReactNode;
}) {
  const { l } = useLanguage();
  const invalid = invalidProductField(action, values);
  const missingPermissions = grantedPermissions
    ? (action.requiredPermissions ?? []).filter(
        (id) => !grantedPermissions.includes(id),
      )
    : [];
  return (
    <ProductPanel
      title={l("Review this action", "Revisa esta acción")}
      description={l(action.description.en, action.description.es)}
      className="border-primary/35 bg-linear-to-br from-primary/5 via-surface to-surface"
    >
      <p className="mb-4 text-sm font-medium">
        {l(action.label.en, action.label.es)}
      </p>
      <dl className="mb-4 grid gap-3 sm:grid-cols-2">
        {Object.entries(values)
          .filter(
            ([key]) =>
              ![
                "queryState",
                "filters",
                "sorting",
                "input",
                "arguments",
                "fields",
                "mapping",
                "fieldMapping",
              ].includes(key),
          )
          .map(([key, value]) => (
            <div key={key} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">
                {action.fields.find((field) => field.id === key)
                  ? l(
                      action.fields.find((field) => field.id === key)!.label.en,
                      action.fields.find((field) => field.id === key)!.label.es,
                    )
                  : key}
              </dt>
              <dd className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap wrap-break-word text-xs leading-6">
                {Array.isArray(value)
                  ? value.join(", ")
                  : typeof value === "boolean"
                    ? value
                      ? l("Yes", "Sí")
                      : l("No", "No")
                    : String(value === "" ? "—" : value)}
              </dd>
            </div>
          ))}
      </dl>
      {children}
      <ProductValidation action={action} values={values} />
      {missingPermissions.length > 0 && (
        <p
          role="alert"
          className="text-xs leading-6 text-destructive-foreground"
        >
          {l(
            "This action needs additional connection permissions. Review the connection settings.",
            "Esta acción necesita permisos adicionales. Revisa la configuración de la conexión.",
          )}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          appearance="gradient"
          loading={pending}
          disabled={
            disabled || Boolean(invalid) || missingPermissions.length > 0
          }
          onClick={onConfirm}
        >
          <Check />
          {l("Confirm action", "Confirmar acción")}
        </Button>
        <Button variant="outline" disabled={pending} onClick={onReject}>
          {l("Back to editing", "Volver a editar")}
        </Button>
      </div>
    </ProductPanel>
  );
}

export function useProductResources(props: IntegrationWorkbenchProps) {
  const [resources, setResources] = useState<IntegrationResource[]>([]);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const idsKey = JSON.stringify([...props.connection.resourceIds].sort());
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    const abort = () => controller.abort();
    if (props.scope.signal?.aborted) return;
    props.scope.signal?.addEventListener("abort", abort, { once: true });
    const allowed = new Set<string>(JSON.parse(idsKey));
    setPending(true);
    setFailed(false);
    setResources([]);
    props.adapter
      .resources(props.definition.id, {
        workspaceId: props.scope.workspaceId,
        signal: controller.signal,
      })
      .then((items) => {
        if (!live || controller.signal.aborted) return;
        const seen = new Set<string>();
        setResources(
          items.filter(
            (item) =>
              allowed.has(item.id) &&
              !seen.has(item.id) &&
              Boolean(seen.add(item.id)),
          ),
        );
      })
      .catch(() => {
        if (live && !controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (live && !controller.signal.aborted) setPending(false);
      });
    return () => {
      live = false;
      controller.abort();
      props.scope.signal?.removeEventListener("abort", abort);
    };
  }, [
    props.adapter,
    props.definition.id,
    props.connection.revision,
    props.scope.workspaceId,
    props.scope.signal,
    idsKey,
    reload,
  ]);
  return {
    resources,
    pending,
    failed,
    retry: () => setReload((value) => value + 1),
  };
}

export function ProductResourcePicker({
  resources,
  value,
  onChange,
  label,
  pending,
  failed,
  retry,
  disabled,
}: ReturnType<typeof useProductResources> & {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const { l } = useLanguage();
  return (
    <div className="space-y-2">
      <Select
        label={label ?? l("Authorized resource", "Recurso autorizado")}
        value={value}
        options={resources.map((resource) => ({
          value: resource.id,
          label: resource.name,
        }))}
        placeholder={
          pending
            ? l("Loading resources…", "Cargando recursos…")
            : l("Choose a resource", "Elige un recurso")
        }
        onValueChange={onChange}
        disabled={disabled || pending || resources.length === 0}
      />
      {failed ? (
        <Button size="sm" variant="outline" onClick={retry}>
          <RefreshCw />
          {l("Retry resource discovery", "Reintentar descubrimiento")}
        </Button>
      ) : !pending && resources.length === 0 ? (
        <p className="text-xs leading-6 text-muted-foreground">
          {l(
            "No authorized resources were returned. Review the resources in connection settings.",
            "No se devolvieron recursos autorizados. Revisa los recursos en la configuración de la conexión.",
          )}
        </p>
      ) : null}
    </div>
  );
}

export function ProductRecordList({
  records,
  onSelect,
  selected,
}: {
  records: readonly IntegrationRecord[];
  onSelect?: (record: IntegrationRecord) => void;
  selected?: string;
}) {
  const { l } = useLanguage();
  if (!records.length)
    return (
      <ProductEmpty>
        {l(
          "No records in this response.",
          "No hay registros en esta respuesta.",
        )}
      </ProductEmpty>
    );
  return (
    <ul className="divide-y divide-border">
      {records.map((record) => (
        <li
          key={record.id}
          className="flex flex-wrap items-start justify-between gap-3 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="wrap-break-word text-xs font-semibold">
              {record.name}
            </p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              {record.description}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {record.id} · <ProductDate value={record.updatedAt} />
            </p>
          </div>
          <ProductStatus value={record.status} />
          {onSelect && (
            <Button
              variant={record.id === selected ? "secondary" : "outline"}
              size="sm"
              onClick={() => onSelect(record)}
            >
              {l("Open", "Abrir")}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ProductSearchResults({
  hits,
  query = "",
}: {
  hits: readonly IntegrationSearchHit[];
  query?: string;
}) {
  const { l, number } = useLanguage();
  return (
    <ol className="space-y-3">
      {hits.map((hit, index) => {
        const url = safeProductUrl(hit.url);
        return (
          <li
            key={hit.id}
            className="rounded-xl border border-border bg-surface p-4 motion-safe:transition-colors hover:border-primary/35"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                {index + 1}
              </span>
              <span className="wrap-break-word">{hit.source}</span>
              {Number.isFinite(hit.score) && (
                <span className="ml-auto">
                  {l("Score", "Puntuación")}{" "}
                  {number(hit.score!, { maximumFractionDigits: 3 })}
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold">
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 underline-offset-4 hover:underline"
                >
                  {hit.title}
                  <ExternalLink className="size-3" aria-hidden="true" />
                  <span className="sr-only">
                    {l("opens in a new tab", "abre en una pestaña nueva")}
                  </span>
                </a>
              ) : (
                hit.title
              )}
            </h4>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-7 text-muted-foreground">
              {productSearchSegments(hit.snippet, query).map((part, i) =>
                part.match ? (
                  <mark
                    key={i}
                    className="rounded bg-primary/15 px-0.5 text-foreground"
                  >
                    {part.text}
                  </mark>
                ) : (
                  <span key={i}>{part.text}</span>
                ),
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function ProductTree({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const { l } = useLanguage();
  if (depth >= 8)
    return (
      <span className="text-xs text-muted-foreground">
        {l("Nested value", "Valor anidado")}
      </span>
    );
  if (value === null || typeof value !== "object")
    return (
      <span className="whitespace-pre-wrap wrap-break-word text-xs">
        {String(value ?? "null")}
      </span>
    );
  const entries = Object.entries(value);
  return (
    <dl className="space-y-2">
      {entries.slice(0, 50).map(([key, item]) => (
        <div
          key={key}
          className="grid gap-1 rounded-lg border border-border bg-surface-subtle/30 p-2 sm:grid-cols-[minmax(90px,1fr)_3fr]"
        >
          <dt className="wrap-break-word text-[11px] font-medium">{key}</dt>
          <dd className="min-w-0">
            <ProductTree value={item} depth={depth + 1} />
          </dd>
        </div>
      ))}
      {entries.length > 50 && (
        <p className="text-xs text-muted-foreground">
          {l(
            "Preview shows the first 50 entries.",
            "La vista previa muestra las primeras 50 entradas.",
          )}
        </p>
      )}
    </dl>
  );
}

export function ProductDocumentPreview({
  content,
  format,
}: {
  content: string;
  format: "markdown" | "text" | "json";
}) {
  const { l } = useLanguage();
  if (!content)
    return (
      <ProductEmpty>
        {l(
          "Your document preview will appear here.",
          "La vista previa de tu documento aparecerá aquí.",
        )}
      </ProductEmpty>
    );
  if (format === "json") {
    let parsed: unknown;
    let valid = true;
    try {
      parsed = JSON.parse(content);
    } catch {
      valid = false;
    }
    return valid ? (
      <ProductTree value={parsed} />
    ) : (
      <p role="status" className="text-xs text-destructive-foreground">
        {l(
          "Correct the JSON syntax to preview this document.",
          "Corrige la sintaxis JSON para ver este documento.",
        )}
      </p>
    );
  }
  if (format === "text")
    return (
      <p className="whitespace-pre-wrap wrap-break-word text-sm leading-7">
        {content}
      </p>
    );
  return (
    <div className="min-w-0 wrap-break-word text-sm leading-7 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-accent [&_code]:px-1 [&_h1]:my-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:my-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:my-3 [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-3 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-surface-subtle [&_pre]:p-3 [&_table]:block [&_table]:overflow-auto [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_ul]:list-disc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const url = safeProductUrl(href);
            return url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
          img: ({ alt }) => (
            <span className="text-xs text-muted-foreground">
              [{l("Image", "Imagen")}: {alt ?? ""}]
            </span>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function ProductJobResult({ job }: { job: IntegrationJob }) {
  const { l } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold">{job.name}</h4>
        <ProductStatus value={job.status} />
      </div>
      <Progress
        value={job.progress}
        label={l("Job progress", "Progreso del trabajo")}
      />
      <ol className="grid gap-2 sm:grid-cols-2">
        {job.steps.map((step) => (
          <li
            key={step.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-xs"
          >
            <span>{step.name}</span>
            <ProductStatus value={step.status} />
          </li>
        ))}
      </ol>
      {job.logs.length > 0 && (
        <details className="rounded-xl bg-surface-subtle p-3">
          <summary className="cursor-pointer text-xs font-medium">
            {l("Execution log", "Registro de ejecución")}
          </summary>
          <ol className="mt-3 space-y-2">
            {job.logs.map((line, index) => (
              <li
                key={index}
                className="whitespace-pre-wrap wrap-break-word text-xs leading-6"
              >
                {line}
              </li>
            ))}
          </ol>
        </details>
      )}
      <p className="text-[10px] text-muted-foreground">{job.id}</p>
    </div>
  );
}

/** Useful fallback when a backend returns a different supported domain result. */
export function ProductResult({
  result,
}: {
  result: IntegrationResult | null;
}) {
  const { l, number } = useLanguage();
  if (!result) return null;
  switch (result.kind) {
    case "records":
      return <ProductRecordList records={result.records} />;
    case "record":
      return <ProductRecordList records={[result.record]} />;
    case "document":
      return (
        <div className="space-y-3">
          <h4 className="font-medium">{result.document.title}</h4>
          <p className="text-xs text-muted-foreground">
            {l("Revision", "Revisión")} {result.document.revision}
          </p>
          <ProductDocumentPreview {...result.document} />
        </div>
      );
    case "search":
      return result.hits.length ? (
        <ProductSearchResults hits={result.hits} />
      ) : (
        <ProductEmpty>
          {l("No matching sources.", "No hay fuentes coincidentes.")}
        </ProductEmpty>
      );
    case "knowledge":
      return (
        <div className="space-y-4">
          <ProductStatus value={result.status} />
          <ProductRecordList records={result.documents} />
          <ProductSearchResults hits={result.hits} />
        </div>
      );
    case "job":
      return <ProductJobResult job={result.job} />;
    case "tool":
      return (
        <div className="space-y-3">
          <p className="text-xs font-medium">{result.run.name}</p>
          <ProductStatus value={result.run.state} />
          {result.run.output && (
            <ProductDocumentPreview
              content={result.run.output}
              format="markdown"
            />
          )}
        </div>
      );
    case "upload": {
      const url = safeProductUrl(result.asset.url);
      return (
        <p className="text-xs leading-6">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              {result.asset.name}
            </a>
          ) : (
            result.asset.name
          )}{" "}
          · {number(result.asset.size)} {l("bytes", "bytes")}
        </p>
      );
    }
    case "receipt":
      return (
        <div role="status" className="space-y-2">
          <p className="text-xs leading-6">{result.message}</p>
          <p className="text-[10px] text-muted-foreground">{result.id}</p>
        </div>
      );
    case "map":
      return (
        <ul className="space-y-2">
          {result.locations.map((location) => (
            <li key={location.id} className="text-xs">
              {location.name} ·{" "}
              {number(location.latitude, { maximumFractionDigits: 5 })},{" "}
              {number(location.longitude, { maximumFractionDigits: 5 })}
            </li>
          ))}
        </ul>
      );
    case "delivery":
      return (
        <div className="space-y-2">
          <ProductStatus value={result.delivery.status} />
          <p className="text-xs">
            {result.delivery.recipient} · {result.delivery.subject}
          </p>
          <p className="whitespace-pre-wrap text-xs leading-6">
            {result.delivery.preview}
          </p>
        </div>
      );
    case "metrics":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {result.metrics.map((metric) => (
            <div
              key={metric.id}
              className="rounded-xl border border-border p-3"
            >
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="mt-2 text-lg font-semibold">
                {number(metric.value)} {metric.unit}
              </p>
            </div>
          ))}
        </div>
      );
  }
}

export function ProductLabeledTextarea({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Textarea>) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <Textarea id={id} {...props} />
    </div>
  );
}
