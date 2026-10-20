"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  File,
  Mail,
  Terminal,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chart } from "@/components/ui/chart";
import { DataTable } from "@/components/ui/data-table";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type {
  IntegrationJob,
  IntegrationRecord,
  IntegrationResult,
  IntegrationSearchHit,
} from "@/lib/integrations/contracts";
import {
  operationalPublicUrl,
  operationalRasterImage,
  operationalRecordFields,
  operationalSensitiveField,
  operationalText,
} from "./operational-model";
import { OperationalEmpty } from "./operational-fields";

export function OperationalStatus({ value }: { value: string }) {
  const { l } = useLanguage();
  const labels: Record<string, [string, string]> = {
    ready: ["Ready", "Listo"],
    active: ["Active", "Activo"],
    enabled: ["Enabled", "Activado"],
    disabled: ["Disabled", "Desactivado"],
    review: ["Needs review", "Por revisar"],
    pending: ["Pending", "Pendiente"],
    queued: ["Queued", "En cola"],
    sent: ["Sent", "Enviado"],
    delivered: ["Delivered", "Entregado"],
    bounced: ["Bounced", "Rebotado"],
    failed: ["Failed", "Falló"],
    running: ["Running", "En curso"],
    completed: ["Completed", "Completado"],
    cancelled: ["Cancelled", "Cancelado"],
    unread: ["Unread", "Sin leer"],
    read: ["Read", "Leído"],
    indexing: ["Indexing", "Indexando"],
    "approval-required": ["Approval required", "Requiere aprobación"],
    rejected: ["Rejected", "Rechazado"],
    "permission-denied": ["Permission denied", "Permiso denegado"],
  };
  const label = Object.hasOwn(labels, value) ? labels[value] : null;
  return (
    <Badge
      variant={
        ["failed", "rejected", "bounced", "permission-denied"].includes(value)
          ? "destructive"
          : ["pending", "review", "queued", "approval-required"].includes(value)
            ? "warning"
            : "neutral"
      }
      appearance="soft"
    >
      {label ? l(...label) : operationalText(value, 60)}
    </Badge>
  );
}

export function OperationalDate({ value }: { value: string }) {
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

export function OperationalRecordDetail({
  record,
}: {
  record: IntegrationRecord;
}) {
  const { l } = useLanguage();
  return (
    <article className="space-y-4 rounded-xl border border-border bg-surface-subtle/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words text-sm font-semibold">
            {operationalText(record.name, 200)}
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {operationalText(record.type, 80)} ·{" "}
            <OperationalDate value={record.updatedAt} />
          </p>
        </div>
        <OperationalStatus value={record.status} />
      </div>
      {record.description && (
        <p className="whitespace-pre-wrap break-words text-xs leading-6">
          {operationalText(record.description, 2200)}
        </p>
      )}
      <dl className="grid gap-3 sm:grid-cols-2">
        {operationalRecordFields(record).map(([name, value]) => (
          <div
            key={name}
            className="min-w-0 rounded-lg border border-border bg-surface p-3"
          >
            <dt className="break-words text-[11px] font-medium text-muted-foreground">
              {operationalText(name, 80)}
            </dt>
            <dd className="mt-1 break-words text-xs leading-6">
              {typeof value === "boolean"
                ? value
                  ? l("Yes", "Sí")
                  : l("No", "No")
                : operationalText(value, 1600)}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

export function OperationalRecordTable({
  records,
  loading,
  error,
  onRetry,
  onSelect,
  total,
  title,
}: {
  records: IntegrationRecord[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelect?: (record: IntegrationRecord) => void;
  total?: number | null;
  title?: string;
}) {
  const { l, number } = useLanguage();
  const columns = useMemo<ColumnDef<IntegrationRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: l("Name", "Nombre"),
        cell: ({ row }) => (
          <div className="min-w-32">
            <span className="block max-w-72 truncate font-medium">
              {operationalText(row.original.name, 200)}
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {operationalText(row.original.type, 80)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: l("Status", "Estado"),
        cell: ({ row }) => <OperationalStatus value={row.original.status} />,
      },
      {
        accessorKey: "updatedAt",
        header: l("Updated", "Actualizado"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            <OperationalDate value={row.original.updatedAt} />
          </span>
        ),
      },
      ...(onSelect
        ? [
            {
              id: "detail",
              header: l("Details", "Detalle"),
              enableSorting: false,
              cell: ({ row }: { row: { original: IntegrationRecord } }) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`${l("View", "Ver")} ${operationalText(row.original.name, 200)}`}
                  onClick={() => onSelect(row.original)}
                >
                  <ArrowUpRight aria-hidden="true" />
                  {l("View", "Ver")}
                </Button>
              ),
            } satisfies ColumnDef<IntegrationRecord>,
          ]
        : []),
    ],
    [l, onSelect],
  );
  return (
    <DataTable
      data={records}
      columns={columns}
      title={title}
      selectable={false}
      pageSize={5}
      pageSizeOptions={[5, 10, 20]}
      loading={loading && records.length === 0}
      error={error ?? undefined}
      onRetry={onRetry}
      appearance="flat"
      labels={{
        search: l("Search loaded records…", "Buscar en registros cargados…"),
        empty: l("No records to show", "No hay registros para mostrar"),
        emptyDescription: l(
          "Refresh the connection or clear the filters.",
          "Actualiza la conexión o limpia los filtros.",
        ),
        previous: l("Previous page", "Página anterior"),
        next: l("Next page", "Página siguiente"),
        selectAll: l("Select this page", "Seleccionar esta página"),
        selectRow: l("Select row", "Seleccionar fila"),
        selected: l("selected", "seleccionadas"),
        page: l("Page", "Página"),
        of: l("of", "de"),
        rows: l("rows", "filas"),
        clear: l("Clear search", "Limpiar búsqueda"),
        error: l(
          "Could not load records",
          "No se pudieron cargar los registros",
        ),
        retry: l("Try again", "Reintentar"),
        loading: l("Loading records", "Cargando registros"),
        columns: l("Columns", "Columnas"),
        clearSelection: l("Clear selection", "Limpiar selección"),
        rowsPerPage: l("Rows per page", "Filas por página"),
      }}
      caption={
        total != null && total > records.length
          ? l(
              `${number(records.length)} loaded records of ${number(total)} reported. Pagination covers this loaded set.`,
              `${number(records.length)} registros cargados de ${number(total)} reportados. La paginación cubre este conjunto cargado.`,
            )
          : l(
              "Records returned by this connection.",
              "Registros devueltos por esta conexión.",
            )
      }
    />
  );
}

export function OperationalUpload({
  asset,
}: {
  asset: Extract<IntegrationResult, { kind: "upload" }>["asset"];
}) {
  const { l, number } = useLanguage();
  const url = operationalPublicUrl(asset.url);
  const size =
    asset.size < 1024 * 1024
      ? `${number(asset.size / 1024, { maximumFractionDigits: 1 })} KB`
      : `${number(asset.size / (1024 * 1024), { maximumFractionDigits: 1 })} MB`;
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface">
      {url && operationalRasterImage(asset.contentType) && (
        <div className="flex h-36 items-center justify-center overflow-hidden bg-surface-subtle">
          <img
            src={url}
            alt={operationalText(asset.name, 160)}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex items-start gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <File className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-xs font-semibold">
            {operationalText(asset.name, 200)}
          </h4>
          <p className="mt-1 break-words text-[11px] text-muted-foreground">
            {size} · {operationalText(asset.contentType, 100)}
          </p>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="af-hover-link mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary"
            >
              {l("Open file", "Abrir archivo")}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          ) : (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {l(
                "Preview unavailable. Use an authorized backend preview URL.",
                "Vista previa no disponible. Usa una URL de vista previa autorizada por el backend.",
              )}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function OperationalDelivery({
  delivery,
  demo,
}: {
  delivery: Extract<IntegrationResult, { kind: "delivery" }>["delivery"];
  demo?: boolean;
}) {
  const { l } = useLanguage();
  return (
    <article className="space-y-3 rounded-xl border border-border bg-surface-subtle/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-xs font-semibold">
          <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="break-all">
            {operationalText(delivery.recipient, 200)}
          </span>
        </p>
        <OperationalStatus value={delivery.status} />
      </div>
      <h4 className="break-words text-sm font-semibold">
        {operationalText(delivery.subject, 300)}
      </h4>
      <p className="whitespace-pre-wrap break-words text-xs leading-6">
        {operationalText(delivery.preview, 3000)}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {demo
          ? l(
              "Demo status; no email was sent externally.",
              "Estado demo; no se envió un correo externo.",
            )
          : l(
              "Delivery status reported by the connected backend.",
              "Estado de entrega reportado por el backend conectado.",
            )}
      </p>
    </article>
  );
}

export function OperationalJob({
  job,
  children,
}: {
  job: IntegrationJob;
  children?: React.ReactNode;
}) {
  const { l } = useLanguage();
  const progress = Math.min(100, Math.max(0, job.progress));
  const logs = job.logs
    .map((line) => operationalText(line, 800))
    .filter(Boolean);
  return (
    <article className="space-y-4 rounded-xl border border-border bg-surface-subtle/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="break-words text-sm font-semibold">
          {operationalText(job.name, 200)}
        </h4>
        <OperationalStatus value={job.status} />
      </div>
      <Progress
        value={progress}
        label={l(
          "Progress reported by the backend",
          "Progreso reportado por el backend",
        )}
        className="motion-reduce:[&_*]:transition-none"
      />
      <ol className="grid gap-2">
        {job.steps.map((step) => (
          <li
            key={step.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              {step.status === "completed" ? (
                <CheckCircle2
                  className="size-3.5 shrink-0 text-primary"
                  aria-hidden="true"
                />
              ) : (
                <Clock3
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <span className="break-words">
                {operationalText(step.name, 200)}
              </span>
            </span>
            <OperationalStatus value={step.status} />
          </li>
        ))}
      </ol>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <h5 className="flex items-center gap-2 border-b border-border px-3 py-2 text-[11px] font-medium text-muted-foreground">
          <Terminal className="size-3.5" aria-hidden="true" />
          {l("Run log", "Registro de ejecución")}
        </h5>
        {logs.length ? (
          <ol className="max-h-48 space-y-2 overflow-auto p-3 font-mono text-[11px] leading-5">
            {logs.map((line, index) => (
              <li key={index} className="whitespace-pre-wrap break-words">
                {line}
              </li>
            ))}
          </ol>
        ) : (
          <p className="p-3 text-xs text-muted-foreground">
            {l(
              "No log entries returned.",
              "No se devolvieron entradas de registro.",
            )}
          </p>
        )}
      </div>
      {children}
    </article>
  );
}

export function OperationalMetrics({
  metrics,
}: {
  metrics: Extract<IntegrationResult, { kind: "metrics" }>["metrics"];
}) {
  const { l, locale, number } = useLanguage();
  if (!metrics.length)
    return (
      <OperationalEmpty>
        {l("No metrics returned.", "No se devolvieron métricas.")}
      </OperationalEmpty>
    );
  return (
    <div className="space-y-5">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="rounded-xl border border-border bg-surface-subtle/50 p-4"
          >
            <dt className="text-[11px] text-muted-foreground">
              {operationalText(metric.label, 100)}
            </dt>
            <dd className="mt-2 text-2xl font-semibold tracking-tight">
              {number(metric.value, { maximumFractionDigits: 2 })}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {operationalText(metric.unit, 30)}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <Chart
        kind="bar"
        data={metrics.map((metric) => ({
          label: `${operationalText(metric.label, 100)}${metric.unit ? ` (${operationalText(metric.unit, 30)})` : ""}`,
          value: metric.value,
        }))}
        label={l(
          "Metrics returned by the backend",
          "Métricas devueltas por el backend",
        )}
        valueLabel={l("Reported value", "Valor reportado")}
        locale={locale}
        height={220}
        appearance="gradient"
      />
    </div>
  );
}

function OperationalHits({ hits }: { hits: IntegrationSearchHit[] }) {
  const { l } = useLanguage();
  if (!hits.length)
    return (
      <OperationalEmpty>
        {l("No matches returned.", "No se devolvieron coincidencias.")}
      </OperationalEmpty>
    );
  return (
    <div className="grid gap-3">
      {hits.map((hit) => {
        const url = operationalPublicUrl(hit.url);
        return (
          <article
            key={hit.id}
            className="rounded-xl border border-border bg-surface-subtle/40 p-4"
          >
            <h4 className="text-sm font-semibold">
              {operationalText(hit.title, 200)}
            </h4>
            <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6">
              {operationalText(hit.snippet, 1600)}
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {operationalText(hit.source, 150)}
            </p>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="af-hover-link mt-2 inline-flex min-h-9 items-center gap-1 text-xs text-primary"
              >
                {l("Open source", "Abrir fuente")}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </article>
        );
      })}
    </div>
  );
}

/** Result kind, rather than the requested family, controls response presentation. */
export function OperationalResult({
  result,
  demo,
  className,
}: {
  result: IntegrationResult | null;
  demo?: boolean;
  className?: string;
}) {
  const { l, number } = useLanguage();
  if (!result)
    return (
      <OperationalEmpty>
        {l(
          "Run an action to see its backend response.",
          "Ejecuta una acción para ver la respuesta del backend.",
        )}
      </OperationalEmpty>
    );
  let content: React.ReactNode;
  switch (result.kind) {
    case "records":
      content = (
        <OperationalRecordTable records={result.records} total={result.total} />
      );
      break;
    case "record":
      content = <OperationalRecordDetail record={result.record} />;
      break;
    case "upload":
      content = <OperationalUpload asset={result.asset} />;
      break;
    case "delivery":
      content = <OperationalDelivery delivery={result.delivery} demo={demo} />;
      break;
    case "metrics":
      content = (
        <div className="space-y-5">
          <OperationalMetrics metrics={result.metrics} />
          <OperationalRecordTable
            records={result.events}
            title={l("Events", "Eventos")}
          />
        </div>
      );
      break;
    case "job":
      content = <OperationalJob job={result.job} />;
      break;
    case "document":
      content = (
        <article className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">
              {operationalText(result.document.title, 200)}
            </h4>
            <Badge variant="neutral">
              {result.document.format} · {l("Revision", "Revisión")}{" "}
              {number(result.document.revision)}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <OperationalDate value={result.document.updatedAt} />
          </p>
          <div
            className={cn(
              "mt-4 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-7",
              result.document.format === "json" && "font-mono",
            )}
          >
            {operationalText(result.document.content, 12000)}
          </div>
        </article>
      );
      break;
    case "search":
      content = <OperationalHits hits={result.hits} />;
      break;
    case "map":
      content = result.locations.length ? (
        <div className="grid gap-3">
          {result.locations.map((location) => (
            <article
              key={location.id}
              className="rounded-xl border border-border p-4"
            >
              <h4 className="text-sm font-semibold">
                {operationalText(location.name, 200)}
              </h4>
              <p className="mt-2 text-xs text-muted-foreground">
                {l("Latitude", "Latitud")}:{" "}
                {number(location.latitude, { maximumFractionDigits: 6 })} ·{" "}
                {l("Longitude", "Longitud")}:{" "}
                {number(location.longitude, { maximumFractionDigits: 6 })}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <OperationalEmpty>
          {l("No locations returned.", "No se devolvieron ubicaciones.")}
        </OperationalEmpty>
      );
      break;
    case "knowledge":
      content = (
        <div className="space-y-4">
          <OperationalStatus value={result.status} />
          <OperationalRecordTable
            records={result.documents}
            title={l("Documents", "Documentos")}
          />
          <OperationalHits hits={result.hits} />
        </div>
      );
      break;
    case "tool":
      content = (
        <article className="space-y-4 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">
              {operationalText(result.run.name, 200)}
            </h4>
            <OperationalStatus value={result.run.state} />
          </div>
          <dl className="grid gap-3">
            {Object.entries(result.run.input)
              .filter(([key]) => !operationalSensitiveField(key))
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[11px] text-muted-foreground">
                    {operationalText(key, 80)}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-xs leading-6">
                    {operationalText(value, 1200)}
                  </dd>
                </div>
              ))}
          </dl>
          {result.run.output && (
            <p className="whitespace-pre-wrap break-words text-xs leading-6">
              {operationalText(result.run.output, 4000)}
            </p>
          )}
          {result.run.state === "approval-required" && (
            <p className="text-xs text-muted-foreground">
              {l(
                "The backend requires a separate tool approval.",
                "El backend requiere una aprobación de herramienta separada.",
              )}
            </p>
          )}
        </article>
      );
      break;
    case "receipt":
      content = (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-primary/20 bg-accent/40 p-4"
        >
          <CheckCircle2
            className="mt-0.5 size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <p className="whitespace-pre-wrap break-words text-xs leading-6">
            {operationalText(result.message, 2000) ||
              l(
                "Backend response received.",
                "Se recibió la respuesta del backend.",
              )}
          </p>
        </div>
      );
      break;
  }
  return <div className={className}>{content}</div>;
}
