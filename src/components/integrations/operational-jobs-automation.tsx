"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  GitBranch,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  IntegrationAction,
  IntegrationJob,
  IntegrationRecord,
  IntegrationValues,
} from "@/lib/integrations/contracts";
import {
  applyOperationalMapping,
  operationalAction,
  operationalField,
  operationalRecordFields,
  operationalPublicUrl,
  operationalSensitiveField,
  operationalText,
  scopedOperationalValues,
  validateOperationalValues,
  withOperationalValue,
  type OperationalMapping,
} from "./operational-model";
import {
  OperationalActionForm,
  OperationalEmpty,
  OperationalPanel,
  OperationalRefresh,
} from "./operational-fields";
import {
  OperationalDate,
  OperationalJob,
  OperationalRecordDetail,
  OperationalRecordTable,
  OperationalResult,
  OperationalStatus,
} from "./operational-results";
import type { OperationalDomainProps } from "./operational-workbench";
import {
  operationalWorkflowAccountStatus,
  operationalWorkflowRetry,
  operationalWorkflowTemplateCatalog,
  reportedWorkflowMetadata,
} from "./operational-workflows";

function OperationalCancelJob({
  action,
  job,
  domain,
}: {
  action: IntegrationAction | null;
  job: IntegrationJob;
  domain: OperationalDomainProps;
}) {
  const { l } = useLanguage();
  const [values, setValues] = useState(() =>
    withOperationalValue(
      action,
      scopedOperationalValues(action, domain.props.connection.resourceIds),
      "target",
      job.id,
    ),
  );
  const terminal = ["completed", "cancelled", "failed"].includes(job.status);
  if (!action || terminal) return null;
  const valid = !Object.keys(validateOperationalValues(action, values)).length;
  return (
    <div className="space-y-3 border-t border-border pt-4">
      {valid ? (
        <Button
          type="button"
          variant="outline"
          disabled={
            !domain.session.connected ||
            domain.session.write.pending ||
            domain.session.read.pending
          }
          onClick={() => domain.stage(action, values, { review: true })}
        >
          <Square aria-hidden="true" />
          {l("Request job cancellation", "Solicitar cancelación del trabajo")}
        </Button>
      ) : (
        <OperationalActionForm
          action={action}
          values={values}
          onChange={setValues}
          disabled={!domain.session.connected || domain.session.read.pending}
          pending={domain.session.write.pending}
          onSubmit={(input) => domain.stage(action, input, { review: true })}
          buttonLabel={l("Review cancellation", "Revisar cancelación")}
        />
      )}
      <p className="text-[11px] leading-5 text-muted-foreground">
        {l(
          "This asks the backend to cancel the job. Cancelling a pending request only stops waiting for its response.",
          "Esto solicita al backend cancelar el trabajo. Cancelar una solicitud pendiente solo deja de esperar su respuesta.",
        )}
      </p>
    </div>
  );
}

export function OperationalJobs(domain: OperationalDomainProps) {
  const { props, session, stage } = domain;
  const { l, number } = useLanguage();
  const trigger = operationalAction(props.definition, "trigger-job");
  const cancel = operationalAction(props.definition, "cancel-job");
  const [values, setValues] = useState(() =>
    scopedOperationalValues(trigger, props.connection.resourceIds),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const busy = session.read.pending || session.write.pending;
  const queue = new Map(
    session.snapshot.records.map((record) => [record.id, record]),
  );
  for (const job of session.snapshot.jobs) {
    const existing = queue.get(job.id);
    queue.set(job.id, {
      id: job.id,
      name: job.name,
      type: existing?.type ?? "job",
      status: job.status,
      updatedAt: existing?.updatedAt ?? "",
      description: existing?.description ?? job.logs.at(-1) ?? "",
      fields: {
        ...existing?.fields,
        progress: job.progress,
        steps: job.steps.length,
      },
    });
  }
  const rows = [...queue.values()];
  const filtered = rows.filter(
    (record) => status === "all" || record.status === status,
  );
  const selectedJob =
    session.snapshot.jobs.find((job) => job.id === selectedId) ??
    (selectedId ? undefined : session.snapshot.jobs.at(-1));
  const selectedRecord = selectedId ? queue.get(selectedId) : null;
  const original = selectedJob
    ? session.history.find(
        (entry) =>
          entry.action.kind === "trigger-job" &&
          entry.result.kind === "job" &&
          entry.result.job.id === selectedJob.id,
      )
    : null;
  const queryValues = { ...session.initialQueryValues };
  const jobQueryField = session.query?.fields.find((field) =>
    /(?:job|run).?(?:id|ref)|(?:job|run) reference/i.test(
      `${field.id} ${field.label.en}`,
    ),
  );
  if (selectedJob && jobQueryField)
    queryValues[jobQueryField.id] = selectedJob.id;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {(["queued", "running", "completed"] as const).map((value) => (
          <div
            key={value}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <p className="text-[11px] text-muted-foreground">
              {value === "queued"
                ? l("Queued", "En cola")
                : value === "running"
                  ? l("Running", "En curso")
                  : l("Completed", "Completados")}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {number(rows.filter((record) => record.status === value).length)}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {l("In the loaded set", "En el conjunto cargado")}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <OperationalPanel
          title={l("Start a job", "Iniciar un trabajo")}
          description={l(
            "The backend schedules and executes the job. Review its inputs first.",
            "El backend programa y ejecuta el trabajo. Revisa antes sus parámetros.",
          )}
        >
          <OperationalActionForm
            action={trigger}
            values={values}
            onChange={setValues}
            disabled={!session.connected || busy}
            pending={session.write.pending}
            onSubmit={(input) => {
              if (trigger) stage(trigger, input, { review: true });
            }}
            buttonLabel={l("Review job", "Revisar trabajo")}
          />
          <p className="mt-4 flex items-center gap-2 text-[11px] leading-5 text-muted-foreground">
            <Play className="size-3.5 shrink-0" aria-hidden="true" />
            {l(
              "A run appears only after the adapter returns it.",
              "La ejecución aparece solo cuando el adapter la devuelve.",
            )}
          </p>
        </OperationalPanel>
        <OperationalPanel
          title={l("Run detail", "Detalle de ejecución")}
          accessory={
            <OperationalRefresh session={session} values={queryValues} />
          }
        >
          {selectedJob ? (
            <OperationalJob job={selectedJob}>
              <OperationalCancelJob
                key={selectedJob.id}
                action={cancel}
                job={selectedJob}
                domain={domain}
              />
              {trigger &&
                ["failed", "cancelled"].includes(selectedJob.status) && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!session.connected || busy}
                      onClick={() => {
                        if (original)
                          stage(original.action, original.values, {
                            review: true,
                          });
                        else {
                          setValues(
                            withOperationalValue(
                              trigger,
                              scopedOperationalValues(
                                trigger,
                                props.connection.resourceIds,
                              ),
                              "name",
                              selectedJob.name,
                            ),
                          );
                        }
                      }}
                    >
                      <RotateCcw aria-hidden="true" />
                      {original
                        ? l(
                            "Review a new retry run",
                            "Revisar una nueva ejecución de reintento",
                          )
                        : l(
                            "Prepare retry inputs",
                            "Preparar parámetros de reintento",
                          )}
                    </Button>
                    <p className="text-[11px] leading-5 text-muted-foreground">
                      {original
                        ? l(
                            "Retries submit the original inputs as a new run; the backend owns deduplication.",
                            "Los reintentos envían los parámetros originales como una nueva ejecución; el backend controla la deduplicación.",
                          )
                        : l(
                            "Original inputs were not returned. Complete the job form and review it before retrying.",
                            "No se devolvieron los parámetros originales. Completa el formulario y revísalo antes de reintentar.",
                          )}
                    </p>
                  </div>
                )}
            </OperationalJob>
          ) : selectedRecord ? (
            <OperationalRecordDetail record={selectedRecord} />
          ) : (
            <OperationalEmpty>
              {l(
                "Select a job or start one to inspect its reported progress, steps and logs.",
                "Selecciona o inicia un trabajo para revisar su progreso, pasos y registros reportados.",
              )}
            </OperationalEmpty>
          )}
        </OperationalPanel>
      </div>
      <OperationalPanel
        title={l("Job queue", "Cola de trabajos")}
        accessory={<OperationalRefresh session={session} />}
      >
        <div className="mb-4 max-w-xs">
          <Select
            value={status}
            onValueChange={setStatus}
            aria-label={l("Filter job status", "Filtrar estado de trabajo")}
            options={[
              { value: "all", label: l("All statuses", "Todos los estados") },
              ...[...new Set(rows.map((record) => record.status))].map(
                (value) => ({ value, label: operationalText(value, 80) }),
              ),
            ]}
          />
        </div>
        <OperationalRecordTable
          records={filtered}
          loading={session.read.pending}
          error={session.read.error}
          onRetry={() => void session.refresh()}
          onSelect={(record) => setSelectedId(record.id)}
          total={session.total}
        />
      </OperationalPanel>
    </div>
  );
}

function mappingInput(
  record: IntegrationRecord | undefined,
): IntegrationValues {
  return record
    ? {
        name: record.name,
        description: record.description,
        type: record.type,
        status: record.status,
        ...Object.fromEntries(operationalRecordFields(record)),
      }
    : {};
}

function attachMapping(
  action: IntegrationAction | null,
  values: IntegrationValues,
  rows: OperationalMapping[],
  output: IntegrationValues,
  includePayload: boolean,
) {
  const input = { ...values };
  const mapping = operationalField(action, "mapping");
  if (mapping?.type === "text" && rows.length)
    input[mapping.id] = JSON.stringify(
      rows.map(({ source, target, transform }) => ({
        source,
        target: target.trim(),
        transform,
      })),
    );
  const sourceField = action?.fields.find(
    (field) =>
      field.type === "text" &&
      /source.?field/i.test(`${field.id} ${field.label.en}`),
  );
  const targetField = action?.fields.find(
    (field) =>
      field.type === "text" &&
      /target.?field|destination.?field/i.test(`${field.id} ${field.label.en}`),
  );
  if (rows.length === 1 && sourceField) input[sourceField.id] = rows[0].source;
  if (rows.length === 1 && targetField)
    input[targetField.id] = rows[0].target.trim();
  const payload = action?.fields.find(
    (field) =>
      field.type === "text" &&
      /payload|input.?data|mapped.?data/i.test(`${field.id} ${field.label.en}`),
  );
  if (includePayload && payload && rows.length)
    input[payload.id] = JSON.stringify(output);
  return input;
}

function OperationalWorkflowMetadata({ job }: { job: IntegrationJob }) {
  const { l } = useLanguage();
  const metadata = reportedWorkflowMetadata(job);
  const templateUrl = operationalPublicUrl(metadata.templateUrl);
  return (
    <dl className="grid gap-4 border-t border-border pt-4 text-xs sm:grid-cols-2">
      <div className="min-w-0">
        <dt className="text-[11px] text-muted-foreground">
          {l(
            "Workflow owner reported by the backend",
            "Propietario reportado por el backend",
          )}
        </dt>
        <dd className="mt-1 break-words">
          {metadata.owner ? (
            <>
              <span>{operationalText(metadata.owner.name, 300)}</span>
              <span className="mt-1 block text-[10px] text-muted-foreground">
                {operationalText(metadata.owner.id, 200)}
              </span>
            </>
          ) : (
            l("Unknown", "Desconocido")
          )}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-[11px] text-muted-foreground">
          {l(
            "Selected accounts reported by the backend",
            "Cuentas seleccionadas reportadas por el backend",
          )}
        </dt>
        <dd className="mt-2">
          {metadata.accounts === null ? (
            l("Unknown", "Desconocidas")
          ) : metadata.accounts.length ? (
            <ul className="space-y-2">
              {metadata.accounts.map((account, index) => (
                <li
                  key={`${account.id}-${index}`}
                  className="flex flex-wrap items-start justify-between gap-2"
                >
                  <span className="min-w-0 break-words">
                    {operationalText(account.name, 300)}
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {operationalText(account.id, 200)}
                    </span>
                  </span>
                  <Badge
                    variant={
                      account.status === "connected" ? "neutral" : "warning"
                    }
                    appearance="soft"
                  >
                    {l(...operationalWorkflowAccountStatus(account.status))}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            l("No accounts reported", "No se reportaron cuentas")
          )}
        </dd>
      </div>
      <div className="min-w-0 sm:col-span-2">
        <dt className="text-[11px] text-muted-foreground">
          {l("Reported template", "Plantilla reportada")}
        </dt>
        <dd className="mt-1">
          {templateUrl ? (
            <a
              href={templateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center gap-2 text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {metadata.templateName
                ? operationalText(metadata.templateName, 300)
                : l(
                    "Open the reported template",
                    "Abrir la plantilla reportada",
                  )}
              <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
          ) : metadata.templateName ? (
            <span>{operationalText(metadata.templateName, 300)}</span>
          ) : (
            l("Not reported", "No reportada")
          )}
        </dd>
      </div>
    </dl>
  );
}

function OperationalWorkflowRun({
  job,
  domain,
  onDraft,
}: {
  job: IntegrationJob;
  domain: OperationalDomainProps;
  onDraft: (values: IntegrationValues, job: IntegrationJob) => void;
}) {
  const { l } = useLanguage();
  const trigger = operationalAction(
    domain.props.definition,
    "trigger-workflow",
  );
  const retry = operationalWorkflowRetry(trigger, job, domain.session.history);
  const canReview =
    retry &&
    !Object.keys(validateOperationalValues(retry.action, retry.values)).length;
  return (
    <OperationalJob job={job}>
      <OperationalWorkflowMetadata job={job} />
      {trigger && ["failed", "cancelled"].includes(job.status) && (
        <div className="space-y-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={
              !domain.session.can(trigger) ||
              domain.session.write.pending ||
              domain.session.read.pending
            }
            onClick={() => {
              if (retry && canReview) {
                domain.stage(retry.action, retry.values, {
                  review: retry.review,
                  content: `${l("New retry request for reported run", "Nueva solicitud de reintento de la ejecución reportada")}: ${operationalText(retry.sourceRunId, 200)}`,
                });
              } else {
                onDraft(
                  retry?.values ??
                    scopedOperationalValues(
                      trigger,
                      domain.props.connection.resourceIds,
                    ),
                  job,
                );
              }
            }}
          >
            <RotateCcw aria-hidden="true" />
            {canReview
              ? l(
                  "Review a new workflow retry run",
                  "Revisar una nueva ejecución de reintento de workflow",
                )
              : l(
                  "Prepare workflow retry inputs",
                  "Preparar parámetros de reintento del workflow",
                )}
          </Button>
          <p className="text-[11px] leading-5 text-muted-foreground">
            {canReview
              ? l(
                  "Review the original declared inputs before requesting a new run. The backend owns authorization, deduplication and retries.",
                  "Revisa los parámetros originales declarados antes de solicitar otra ejecución. El backend controla autorización, deduplicación y reintentos.",
                )
              : l(
                  "Original inputs are unavailable or incomplete. Complete the workflow draft and review it; the run ID is not a workflow reference.",
                  "Los parámetros originales no están disponibles o están incompletos. Completa y revisa el borrador; el ID de ejecución no es una referencia de workflow.",
                )}
          </p>
        </div>
      )}
    </OperationalJob>
  );
}

export function OperationalAutomation(domain: OperationalDomainProps) {
  const { props, session, stage } = domain;
  const { l, number } = useLanguage();
  const map = operationalAction(props.definition, "map-fields");
  const trigger = operationalAction(props.definition, "trigger-workflow");
  const [mapValues, setMapValues] = useState(() =>
    scopedOperationalValues(map, props.connection.resourceIds),
  );
  const [triggerValues, setTriggerValues] = useState(() =>
    scopedOperationalValues(trigger, props.connection.resourceIds),
  );
  const [sourceId, setSourceId] = useState("");
  const [template, setTemplate] = useState("custom");
  const [rows, setRows] = useState<OperationalMapping[]>([]);
  const nextRow = useRef(0);
  const [mappingNotice, setMappingNotice] = useState("");
  const [tab, setTab] = useState("trigger");
  const [retryDraft, setRetryDraft] = useState<Pick<
    IntegrationJob,
    "id" | "name"
  > | null>(null);
  const source =
    session.snapshot.records.find((record) => record.id === sourceId) ??
    session.snapshot.records[0];
  const sourceValues = mappingInput(source);
  const sourceKeys = Object.keys(sourceValues).filter(
    (key) => !operationalSensitiveField(key),
  );
  const mapped = applyOperationalMapping(sourceValues, rows);
  const preparedMap = attachMapping(map, mapValues, rows, mapped.output, false);
  const preparedTrigger = attachMapping(
    trigger,
    triggerValues,
    rows,
    mapped.output,
    true,
  );
  const busy = session.read.pending || session.write.pending;
  const errors = {
    missing: l(
      "Choose an available source field.",
      "Elige un campo de origen disponible.",
    ),
    target: l(
      "Use a non-sensitive destination field.",
      "Usa un campo de destino no sensible.",
    ),
    duplicate: l(
      "Each destination must be unique.",
      "Cada destino debe ser único.",
    ),
    conversion: l(
      "This value cannot use the selected conversion.",
      "Este valor no admite la conversión seleccionada.",
    ),
  };
  const transforms: {
    value: OperationalMapping["transform"];
    label: string;
  }[] = [
    { value: "copy", label: l("Copy value", "Copiar valor") },
    { value: "trim", label: l("Trim spaces", "Quitar espacios") },
    { value: "lowercase", label: l("Lowercase", "Minúsculas") },
    { value: "uppercase", label: l("Uppercase", "Mayúsculas") },
    { value: "number", label: l("To number", "A número") },
    { value: "boolean", label: l("To boolean", "A booleano") },
  ];
  const changeRow = (id: string, patch: Partial<OperationalMapping>) => {
    setTemplate("custom");
    setRows((previous) =>
      previous.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };
  const mappingField = operationalField(map, "mapping");
  const workflowMapping = operationalField(trigger, "mapping");
  const workflowPayload = trigger?.fields.find((field) =>
    /payload|input.?data|mapped.?data/i.test(`${field.id} ${field.label.en}`),
  );
  const mapSourceField = map?.fields.find((field) =>
    /source.?field/i.test(`${field.id} ${field.label.en}`),
  );
  const mapTargetField = map?.fields.find((field) =>
    /target.?field|destination.?field/i.test(`${field.id} ${field.label.en}`),
  );
  const attachesMap =
    mappingField?.type === "text" ||
    (rows.length === 1 && Boolean(mapSourceField && mapTargetField));
  const activeJobs = session.snapshot.jobs;
  const catalogue = operationalWorkflowTemplateCatalog(
    props.connection.providerOptionId,
  );
  return (
    <div className="space-y-5">
      <OperationalPanel
        title={l("Workflow studio", "Estudio de workflows")}
        description={l(
          "Map actual source fields, inspect the output and review the trigger request.",
          "Mapea campos reales del origen, revisa el resultado y confirma la solicitud de activación.",
        )}
        accessory={<OperationalRefresh session={session} />}
      >
        {catalogue && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-subtle/40 p-4">
            <p className="max-w-xl text-xs leading-6 text-muted-foreground">
              {l(
                "Explore the provider's public templates. Choosing a template here does not create, connect or activate an automation.",
                "Explora las plantillas públicas del proveedor. Elegir una plantilla aquí no crea, conecta ni activa una automatización.",
              )}
            </p>
            <a
              href={catalogue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-primary outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              {l(
                `Browse ${catalogue.provider} templates`,
                `Ver plantillas de ${catalogue.provider}`,
              )}
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={l("Source record", "Registro de origen")}>
            <Select
              value={source?.id ?? ""}
              options={session.snapshot.records.map((record) => ({
                value: record.id,
                label: operationalText(record.name, 160),
              }))}
              placeholder={l(
                "Load source records first",
                "Carga antes registros de origen",
              )}
              disabled={busy || !session.snapshot.records.length}
              onValueChange={(value) => {
                setSourceId(value);
                setRows([]);
                setTemplate("custom");
                setMappingNotice("");
              }}
            />
          </Field>
          <Field
            label={l("Mapping starting point", "Punto de partida del mapeo")}
            description={l(
              "Local drafts; choosing one does not change a backend workflow.",
              "Borradores locales; elegir uno no cambia un workflow del backend.",
            )}
          >
            <Select
              value={template}
              options={[
                { value: "custom", label: l("Custom mapping", "Mapeo propio") },
                {
                  value: "copy",
                  label: l("Copy source fields", "Copiar campos de origen"),
                },
                {
                  value: "clean",
                  label: l("Normalize text", "Normalizar texto"),
                },
                {
                  value: "contact",
                  label: l("Contact details", "Datos de contacto"),
                },
              ]}
              disabled={busy || !source}
              onValueChange={(value) => {
                setTemplate(value);
                setMappingNotice("");
                if (value === "custom") return;
                const keys =
                  value === "contact"
                    ? sourceKeys
                        .filter((key) => /email|name/i.test(key))
                        .slice(0, 8)
                    : sourceKeys.slice(0, 8);
                setRows(
                  keys.map((key) => ({
                    id: `mapping-${++nextRow.current}`,
                    source: key,
                    target:
                      value === "contact" && /name/i.test(key)
                        ? "displayName"
                        : key,
                    transform:
                      value === "copy"
                        ? "copy"
                        : value === "contact" && /email/i.test(key)
                          ? "lowercase"
                          : typeof sourceValues[key] === "string"
                            ? "trim"
                            : "copy",
                  })),
                );
                if (!keys.length)
                  setMappingNotice(
                    l(
                      "This source has no matching fields for that draft.",
                      "Este origen no tiene campos que coincidan con ese borrador.",
                    ),
                  );
              }}
            />
          </Field>
        </div>
        {mappingNotice && (
          <p role="status" className="mt-3 text-xs text-muted-foreground">
            {mappingNotice}
          </p>
        )}
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            {rows.length ? (
              rows.map((row, index) => {
                const rowError = mapped.errors.find(
                  (error) => error.id === row.id,
                );
                return (
                  <fieldset
                    key={row.id}
                    className="rounded-xl border border-border bg-surface-subtle/40 p-4"
                  >
                    <legend className="px-1 text-[11px] font-semibold">
                      {l("Mapping", "Mapeo")} {number(index + 1)}
                    </legend>
                    <div className="grid items-start gap-3 sm:grid-cols-2">
                      <Field label={l("Source field", "Campo de origen")}>
                        <Select
                          value={row.source}
                          options={sourceKeys.map((key) => ({
                            value: key,
                            label: operationalText(key, 80),
                          }))}
                          onValueChange={(value) =>
                            changeRow(row.id, { source: value })
                          }
                          disabled={busy}
                        />
                      </Field>
                      <Field label={l("Destination field", "Campo de destino")}>
                        <Input
                          value={row.target}
                          onChange={(event) =>
                            changeRow(row.id, { target: event.target.value })
                          }
                          disabled={busy}
                          maxLength={100}
                        />
                      </Field>
                      <Field label={l("Transform", "Transformación")}>
                        <Select
                          value={row.transform}
                          options={transforms}
                          onValueChange={(value) =>
                            changeRow(row.id, {
                              transform:
                                value as OperationalMapping["transform"],
                            })
                          }
                          disabled={busy}
                        />
                      </Field>
                      <div className="flex min-h-11 items-end justify-end pt-6">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          aria-label={`${l("Remove mapping", "Eliminar mapeo")} ${number(index + 1)}`}
                          onClick={() =>
                            setRows((previous) =>
                              previous.filter((item) => item.id !== row.id),
                            )
                          }
                        >
                          <Trash2 aria-hidden="true" />
                          {l("Remove", "Eliminar")}
                        </Button>
                      </div>
                    </div>
                    {rowError && (
                      <p
                        role="alert"
                        className="mt-3 text-xs text-destructive-foreground"
                      >
                        {errors[rowError.code]}
                      </p>
                    )}
                  </fieldset>
                );
              })
            ) : (
              <OperationalEmpty>
                {l(
                  "Choose a starting point or add a mapping row.",
                  "Elige un punto de partida o añade una fila de mapeo.",
                )}
              </OperationalEmpty>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy || !sourceKeys.length || rows.length >= 32}
              onClick={() => {
                const available =
                  sourceKeys.find(
                    (key) => !rows.some((row) => row.source === key),
                  ) ?? sourceKeys[0];
                setTemplate("custom");
                setRows((previous) => [
                  ...previous,
                  {
                    id: `mapping-${++nextRow.current}`,
                    source: available,
                    target: available,
                    transform: "copy",
                  },
                ]);
              }}
            >
              <Plus aria-hidden="true" />
              {l("Add mapping", "Añadir mapeo")}
            </Button>
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-surface-subtle/50 p-4">
            <h4 className="flex items-center gap-2 text-xs font-semibold">
              <GitBranch className="size-4 text-primary" aria-hidden="true" />
              {l("Mapped output preview", "Vista previa del resultado mapeado")}
            </h4>
            <p className="text-[11px] leading-5 text-muted-foreground">
              {l(
                "Calculated locally from the selected record. No workflow has run.",
                "Calculado localmente con el registro seleccionado. No se ha ejecutado un workflow.",
              )}
            </p>
            {Object.keys(mapped.output).length ? (
              <dl className="grid gap-3">
                {Object.entries(mapped.output).map(([key, value]) => (
                  <div
                    key={key}
                    className="min-w-0 rounded-lg border border-border bg-surface p-3"
                  >
                    <dt className="flex items-center gap-2 break-words text-[11px] text-muted-foreground">
                      <ArrowRight
                        className="size-3 shrink-0"
                        aria-hidden="true"
                      />
                      {operationalText(key, 100)}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-xs leading-6">
                      {typeof value === "boolean"
                        ? value
                          ? l("True", "Verdadero")
                          : l("False", "Falso")
                        : operationalText(value, 1800)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <OperationalEmpty>
                {l(
                  "The mapped values will appear here.",
                  "Los valores mapeados aparecerán aquí.",
                )}
              </OperationalEmpty>
            )}
          </div>
        </div>
      </OperationalPanel>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="trigger">
            {l("Review trigger", "Revisar activación")}
          </TabsTrigger>
          <TabsTrigger value="mapping">
            {l("Save mapping", "Guardar mapeo")}
          </TabsTrigger>
          <TabsTrigger value="history">
            {l("Run history", "Historial de ejecuciones")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="trigger">
          <OperationalPanel
            title={l(
              "Trigger an approved workflow",
              "Activar un workflow autorizado",
            )}
            description={l(
              "Review the destination and inputs before requesting a run.",
              "Revisa el destino y los parámetros antes de solicitar una ejecución.",
            )}
          >
            {retryDraft && (
              <Alert
                className="mb-4"
                title={l(
                  "Workflow retry draft",
                  "Borrador de reintento del workflow",
                )}
              >
                <p>
                  {l(
                    "Prepared for reported run",
                    "Preparado para la ejecución reportada",
                  )}{" "}
                  {operationalText(retryDraft.name, 200)} ·{" "}
                  {operationalText(retryDraft.id, 200)}.{" "}
                  {l(
                    "Complete the approved workflow reference and inputs before review.",
                    "Completa la referencia del workflow permitido y los parámetros antes de revisar.",
                  )}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setRetryDraft(null);
                    setTriggerValues(
                      scopedOperationalValues(
                        trigger,
                        props.connection.resourceIds,
                      ),
                    );
                  }}
                >
                  {l("Reset retry draft", "Restablecer borrador de reintento")}
                </Button>
              </Alert>
            )}
            <OperationalActionForm
              action={trigger}
              values={preparedTrigger}
              onChange={setTriggerValues}
              exclude={
                rows.length
                  ? [
                      workflowMapping?.type === "text"
                        ? workflowMapping.id
                        : "",
                      workflowPayload?.type === "text"
                        ? workflowPayload.id
                        : "",
                    ].filter(Boolean)
                  : []
              }
              disabled={!session.connected || busy || mapped.errors.length > 0}
              pending={session.write.pending}
              onSubmit={(values) => {
                if (trigger) stage(trigger, values, { review: true });
              }}
              buttonLabel={l(
                "Review workflow request",
                "Revisar solicitud de workflow",
              )}
            >
              {rows.length > 0 &&
                (workflowMapping?.type === "text" ||
                  workflowPayload?.type === "text") && (
                  <p className="text-xs leading-6 text-muted-foreground">
                    {l(
                      "The preview’s mapping and output are attached to the supported request fields.",
                      "El mapeo y el resultado de la vista previa se adjuntan a los campos compatibles de la solicitud.",
                    )}
                  </p>
                )}
            </OperationalActionForm>
          </OperationalPanel>
        </TabsContent>
        <TabsContent value="mapping">
          <OperationalPanel
            title={l("Save a mapping", "Guardar un mapeo")}
            description={
              attachesMap
                ? l(
                    "The checked mapping is included in the request fields below.",
                    "El mapeo revisado se incluye en los campos de solicitud de abajo.",
                  )
                : l(
                    "This request exposes its own mapping fields. The studio output remains a local preview.",
                    "Esta solicitud ofrece sus propios campos de mapeo. El resultado del estudio sigue siendo una vista local.",
                  )
            }
          >
            <OperationalActionForm
              action={map}
              values={preparedMap}
              onChange={setMapValues}
              exclude={[
                rows.length && mappingField?.type === "text"
                  ? mappingField.id
                  : "",
                rows.length === 1 && mapSourceField ? mapSourceField.id : "",
                rows.length === 1 && mapTargetField ? mapTargetField.id : "",
              ].filter(Boolean)}
              disabled={
                !session.connected ||
                busy ||
                mapped.errors.length > 0 ||
                (attachesMap && !rows.length)
              }
              pending={session.write.pending}
              onSubmit={(values) => {
                if (map) stage(map, values, { review: true });
              }}
              buttonLabel={l(
                "Review mapping request",
                "Revisar solicitud de mapeo",
              )}
            />
          </OperationalPanel>
        </TabsContent>
        <TabsContent value="history">
          <OperationalPanel
            title={l("Responses in this session", "Respuestas en esta sesión")}
            description={l(
              "Times below record when a response was received here, not when a provider completed a workflow.",
              "Las horas indican cuándo se recibió una respuesta aquí, no cuándo un proveedor completó un workflow.",
            )}
          >
            {session.history.length ? (
              <div className="space-y-3">
                {session.history.map((entry) => (
                  <article
                    key={entry.sequence}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-semibold">
                          {l(entry.action.label.en, entry.action.label.es)}
                        </h4>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          <OperationalDate value={entry.receivedAt} />
                        </p>
                      </div>
                      {entry.result.kind === "job" ? (
                        <OperationalStatus value={entry.result.job.status} />
                      ) : (
                        <Badge variant="neutral" appearance="soft">
                          {l("Response received", "Respuesta recibida")}
                        </Badge>
                      )}
                    </div>
                    <details className="mt-3">
                      <summary className="min-h-9 cursor-pointer text-xs text-primary">
                        {l("Inspect this response", "Revisar esta respuesta")}
                      </summary>
                      <OperationalResult
                        result={entry.result}
                        demo={props.adapter.mode === "demo"}
                        className="mt-3"
                      />
                    </details>
                  </article>
                ))}
              </div>
            ) : (
              <OperationalEmpty>
                {l(
                  "Run or save an action to start a session history.",
                  "Ejecuta o guarda una acción para iniciar el historial de sesión.",
                )}
              </OperationalEmpty>
            )}
          </OperationalPanel>
        </TabsContent>
      </Tabs>
      {activeJobs.length > 0 && (
        <OperationalPanel
          title={l(
            "Reported workflow runs",
            "Ejecuciones de workflow reportadas",
          )}
          accessory={<OperationalRefresh session={session} />}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            {activeJobs.map((job) => (
              <OperationalWorkflowRun
                key={job.id}
                job={job}
                domain={domain}
                onDraft={(values, failed) => {
                  setTriggerValues(values);
                  setRetryDraft({ id: failed.id, name: failed.name });
                  setRows([]);
                  setTemplate("custom");
                  setMappingNotice("");
                  setTab("trigger");
                }}
              />
            ))}
          </div>
        </OperationalPanel>
      )}
      <OperationalPanel
        title={l("Backend records", "Registros del backend")}
        accessory={<OperationalRefresh session={session} />}
      >
        <OperationalRecordTable
          records={session.snapshot.records}
          total={session.total}
          loading={session.read.pending}
          error={session.read.error}
          onRetry={() => void session.refresh()}
        />
      </OperationalPanel>
    </div>
  );
}
