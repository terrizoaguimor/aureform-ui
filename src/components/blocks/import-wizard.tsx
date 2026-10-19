"use client";

import { publicPath } from "@/lib/public-path";
import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Upload,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  autoMapCSVHeaders,
  createCSVSample,
  CSVImportError,
  executeImportAttempt,
  formatCSVError,
  importText,
  parseCSV,
  previewCSVImport,
  resolveCSVLimits,
  type CSVDocument,
  type CSVLimits,
  type ImportAttempt,
  type ImportCallback,
  type ImportField,
  type ImportKey,
  type ImportLocale,
  type ImportMapping,
  type ImportMode,
  type ImportProgress,
  type ImportResult,
  type ImportRowFailure,
  type ImportRowContext,
  type ImportValidation,
} from "@/lib/csv-import";
import { cn, downloadText } from "@/lib/utils";

export type ImportWizardProps<T extends object> = {
  fields: readonly ImportField<T>[];
  /** Commits belong to the caller. Abort/rejection must roll back this attempt. */
  onImport: ImportCallback<T>;
  locale?: ImportLocale;
  getRowKey?: (row: Readonly<T>) => ImportKey | null | undefined;
  /** Use the same normalization as getRowKey, e.g. lowercase customer emails. */
  existingKeys?: ReadonlySet<ImportKey> | readonly ImportKey[];
  validateRow?: (
    row: Readonly<T>,
    context: ImportRowContext,
  ) => ImportValidation;
  limits?: Partial<CSVLimits>;
  sampleRows?: readonly Partial<T>[];
  sampleFilename?: string;
  resourceHref?: string;
  title?: string;
  description?: string;
  className?: string;
};

type Step = 0 | 1 | 2 | 3;
type Phase =
  | "idle"
  | "importing"
  | "cancelling"
  | "complete"
  | "partial"
  | "cancelled"
  | "error"
  | "unverified";
type RowFilter = "all" | "invalid" | "duplicates";
const pageSize = 10;
const unmapped = "__unmapped__";

const copy = {
  en: {
    title: "Import records",
    description:
      "Bring your CSV into the workspace with a clear review before importing.",
    steps: ["Choose file", "Map fields", "Preview", "Review"],
    stepDescriptions: [
      "Start with your CSV or download a sample with the expected columns.",
      "Match each field to a column in your file.",
      "Check the values, resolve errors and choose how to handle duplicates.",
      "Review the changes before importing your records.",
    ],
    choose: "Choose a CSV file",
    limits: (mb: string, rows: string) =>
      `UTF-8 CSV · up to ${mb} MiB · ${rows} records`,
    local:
      "Your file is read locally. Records are imported only after you confirm.",
    sample: "Download sample",
    resource: "View records",
    reading: "Reading your file…",
    fileReady: "File ready",
    records: (count: string) => `${count} records`,
    fileError: "Check your CSV",
    configError: "Import is unavailable",
    noFields: "Add at least one import field.",
    missingKey: "Existing keys require a row key callback.",
    notMapped: "Do not import this column",
    required: "Required",
    optional: "Optional",
    example: "First value",
    defaultValue: "Default",
    mappingError: "Complete the field mapping",
    duplicatePolicy: "Duplicate records",
    skip: "Skip duplicates",
    update: "Update duplicates",
    skipHelp:
      "Existing records stay unchanged. For repeated keys in this file, the first valid row is used.",
    updateHelp:
      "Existing records are updated. For repeated keys in this file, the last valid row is used.",
    create: "Create",
    updateAction: "Update",
    skipped: "Skipped",
    invalid: "Invalid",
    created: "Created",
    updated: "Updated",
    failed: "Failed",
    ready: "Ready to import",
    total: "Total records",
    invalidRows: "Records need attention",
    invalidHelp: (count: string) =>
      `${count} records have errors. Fix the file or explicitly exclude these records to continue.`,
    excludeInvalid: (count: string) => `Skip the ${count} invalid records`,
    excluded: (count: string) => `${count} invalid records will be skipped.`,
    noReady: "There are no records ready to import.",
    filter: "Show records",
    all: "All records",
    errorsOnly: "Records with errors",
    duplicatesOnly: "Duplicate records",
    preview: "CSV preview",
    row: "Row",
    line: "Line",
    action: "Action and validation",
    existing: "Matches an existing record",
    duplicateRow: (row: number) => `Same key as row ${row}`,
    noMatches: "No records match this filter.",
    pagination: "Preview pages",
    failurePagination: "Import error pages",
    range: (start: number, end: number, total: number) =>
      `Showing ${start}–${end} of ${total}`,
    previous: "Previous",
    next: "Next",
    back: "Back",
    continue: "Continue",
    review: "Review import",
    reviewHelp: "Only the records shown as ready will be submitted.",
    importing: "Importing records",
    importHelp: "You can stop this operation safely before it finishes.",
    cancelling: "Stopping the import",
    cancellingHelp: "Waiting for the operation to stop safely.",
    cancel: "Cancel import",
    progress: (done: number, total: number) => `${done} of ${total} completed`,
    import: (count: string) => `Import ${count} records`,
    complete: "Import complete",
    completeHelp: "Your records have been processed.",
    partial: "Some records could not be imported",
    partialHelp: "Successful records are kept. Review the errors below.",
    retry: "Retry failed records",
    retryAttempt: "Retry import",
    noSafeRetry: "Review the failed records before starting another import.",
    cancelled: "Import stopped",
    cancelledHelp: "You can retry the records from this attempt.",
    error: "Import could not finish",
    errorHelp: "You can retry the records from this attempt.",
    unverified: "Check the import outcome",
    unverifiedHelp:
      "The operation did not confirm a safe result. Check your records before starting another import.",
    retryHelp: (count: string) =>
      `Only the ${count} remaining records will be retried.`,
    again: "Import another file",
  },
  es: {
    title: "Importar registros",
    description:
      "Incorpora tu CSV al espacio de trabajo y revisa los cambios antes de importar.",
    steps: ["Elegir archivo", "Asignar campos", "Vista previa", "Revisar"],
    stepDescriptions: [
      "Elige tu CSV o descarga una muestra con las columnas esperadas.",
      "Asocia cada campo con una columna de tu archivo.",
      "Revisa los valores, corrige los errores y elige cómo tratar los duplicados.",
      "Confirma los cambios antes de importar los registros.",
    ],
    choose: "Elige un archivo CSV",
    limits: (mb: string, rows: string) =>
      `CSV UTF-8 · hasta ${mb} MiB · ${rows} registros`,
    local:
      "El archivo se lee localmente. Los registros se importan cuando confirmas.",
    sample: "Descargar muestra",
    resource: "Ver registros",
    reading: "Leyendo el archivo…",
    fileReady: "Archivo listo",
    records: (count: string) => `${count} registros`,
    fileError: "Revisa tu CSV",
    configError: "La importación no está disponible",
    noFields: "Añade al menos un campo de importación.",
    missingKey:
      "Las claves existentes necesitan una función para obtener la clave de cada fila.",
    notMapped: "No importar esta columna",
    required: "Obligatorio",
    optional: "Opcional",
    example: "Primer valor",
    defaultValue: "Valor predeterminado",
    mappingError: "Completa la asignación de campos",
    duplicatePolicy: "Registros duplicados",
    skip: "Omitir duplicados",
    update: "Actualizar duplicados",
    skipHelp:
      "Los registros existentes se conservan. Si una clave se repite en el archivo, se usa la primera fila válida.",
    updateHelp:
      "Los registros existentes se actualizan. Si una clave se repite en el archivo, se usa la última fila válida.",
    create: "Crear",
    updateAction: "Actualizar",
    skipped: "Omitidos",
    invalid: "No válidos",
    created: "Creados",
    updated: "Actualizados",
    failed: "Fallidos",
    ready: "Listos para importar",
    total: "Total de registros",
    invalidRows: "Hay registros que requieren atención",
    invalidHelp: (count: string) =>
      `${count} registros contienen errores. Corrige el archivo o exclúyelos explícitamente para continuar.`,
    excludeInvalid: (count: string) =>
      `Omitir los ${count} registros no válidos`,
    excluded: (count: string) => `Se omitirán ${count} registros no válidos.`,
    noReady: "No hay registros listos para importar.",
    filter: "Mostrar registros",
    all: "Todos los registros",
    errorsOnly: "Registros con errores",
    duplicatesOnly: "Registros duplicados",
    preview: "Vista previa del CSV",
    row: "Fila",
    line: "Línea",
    action: "Acción y validación",
    existing: "Coincide con un registro existente",
    duplicateRow: (row: number) => `Misma clave que la fila ${row}`,
    noMatches: "No hay registros para este filtro.",
    pagination: "Páginas de la vista previa",
    failurePagination: "Páginas de errores de importación",
    range: (start: number, end: number, total: number) =>
      `Mostrando ${start}–${end} de ${total}`,
    previous: "Anterior",
    next: "Siguiente",
    back: "Atrás",
    continue: "Continuar",
    review: "Revisar importación",
    reviewHelp: "Sólo se enviarán los registros que figuran como listos.",
    importing: "Importando registros",
    importHelp:
      "Puedes detener la operación de forma segura antes de que termine.",
    cancelling: "Deteniendo la importación",
    cancellingHelp: "Esperando a que la operación se detenga de forma segura.",
    cancel: "Cancelar importación",
    progress: (done: number, total: number) =>
      `${done} de ${total} completados`,
    import: (count: string) => `Importar ${count} registros`,
    complete: "Importación completada",
    completeHelp: "Se han procesado tus registros.",
    partial: "Algunos registros no se pudieron importar",
    partialHelp:
      "Se conservan los registros importados. Revisa los errores a continuación.",
    retry: "Reintentar registros fallidos",
    retryAttempt: "Reintentar importación",
    noSafeRetry:
      "Revisa los registros fallidos antes de iniciar otra importación.",
    cancelled: "Importación detenida",
    cancelledHelp: "Puedes reintentar los registros de este intento.",
    error: "La importación no pudo terminar",
    errorHelp: "Puedes reintentar los registros de este intento.",
    unverified: "Revisa el resultado de la importación",
    unverifiedHelp:
      "La operación no confirmó un resultado seguro. Revisa los registros antes de iniciar otra importación.",
    retryHelp: (count: string) =>
      `Sólo se reintentarán los ${count} registros pendientes.`,
    again: "Importar otro archivo",
  },
};

function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value !== "object") return String(value);
  try {
    return JSON.stringify(value) ?? "—";
  } catch {
    return "—";
  }
}

function RecordPages({
  count,
  page,
  onPageChange,
  locale,
  label,
}: {
  count: number;
  page: number;
  onPageChange: (page: number) => void;
  locale: ImportLocale;
  label: string;
}) {
  const t = copy[locale];
  if (!count) return null;
  const start = page * pageSize;
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-xs text-muted-foreground">
        {t.range(start + 1, Math.min(start + pageSize, count), count)}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ArrowLeft aria-hidden="true" />
          {t.previous}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={start + pageSize >= count}
          onClick={() => onPageChange(page + 1)}
        >
          {t.next}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

function Counts({
  values,
  locale,
}: {
  values: readonly { label: string; value: number }[];
  locale: ImportLocale;
}) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {values.map(({ label, value }) => (
        <div
          key={label}
          className="min-w-0 rounded-lg border border-border bg-surface-subtle/40 p-4"
        >
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {value.toLocaleString(locale)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A client-side CSV workflow. It never uploads files or mutates a data store.
 * Host this component in a Client Component to supply parser/commit callbacks.
 * On cancellation, onImport must roll back this attempt and reject; the wizard
 * waits for settlement before offering a retry. Partial successes are retried
 * only when the result identifies every failed row by its submitted index.
 */
export function ImportWizard<T extends object>({
  fields,
  onImport,
  locale = "en",
  getRowKey,
  existingKeys,
  validateRow,
  limits,
  sampleRows,
  sampleFilename = "import-sample.csv",
  resourceHref,
  title,
  description,
  className,
}: ImportWizardProps<T>) {
  const id = React.useId();
  const t = copy[locale];
  const formatNumber = (value: number) => value.toLocaleString(locale);
  const [step, setStep] = React.useState<Step>(0);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [document, setDocument] = React.useState<CSVDocument | null>(null);
  const [filename, setFilename] = React.useState("");
  const [reading, setReading] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [mapping, setMapping] = React.useState<ImportMapping<T>>({});
  const [mode, setMode] = React.useState<ImportMode>("skip");
  const [excludeInvalid, setExcludeInvalid] = React.useState(false);
  const [filter, setFilter] = React.useState<RowFilter>("all");
  const [page, setPage] = React.useState(0);
  const [progress, setProgress] = React.useState<Required<ImportProgress>>({
    completed: 0,
    total: 0,
    message: "",
  });
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [failures, setFailures] = React.useState<readonly ImportRowFailure[]>(
    [],
  );
  const [importError, setImportError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const active = React.useRef<AbortController | null>(null);
  const retryAttempt = React.useRef<ImportAttempt<T> | null>(null);
  const readVersion = React.useRef(0);
  const fileInput = React.useRef<HTMLInputElement | null>(null);
  const heading = React.useRef<HTMLHeadingElement | null>(null);
  const busy = phase === "importing" || phase === "cancelling";
  const finished = phase !== "idle" && !busy;

  React.useEffect(() => {
    return () => {
      readVersion.current += 1;
      active.current?.abort();
      active.current = null;
    };
  }, []);
  React.useEffect(() => {
    if (step !== 0) heading.current?.focus();
  }, [step, phase]);

  const configuration = React.useMemo(() => {
    try {
      if (!fields.length) throw new Error(t.noFields);
      const hasExistingKeys =
        existingKeys &&
        ("size" in existingKeys
          ? existingKeys.size > 0
          : existingKeys.length > 0);
      if (hasExistingKeys) {
        if (!getRowKey) throw new Error(t.missingKey);
      }
      return {
        limits: resolveCSVLimits(limits),
        sample: createCSVSample(fields, sampleRows),
        error: null,
      };
    } catch (error) {
      return {
        limits: null,
        sample: null,
        error: formatCSVError(error, locale),
      };
    }
  }, [
    fields,
    existingKeys,
    getRowKey,
    limits,
    sampleRows,
    locale,
    t.noFields,
    t.missingKey,
  ]);
  const planning = React.useMemo(() => {
    if (!document || configuration.error) return { preview: null, error: null };
    try {
      return {
        preview: previewCSVImport(document, fields, mapping, {
          locale,
          mode,
          getRowKey,
          existingKeys,
          validateRow,
        }),
        error: null,
      };
    } catch (error) {
      return { preview: null, error: formatCSVError(error, locale) };
    }
  }, [
    document,
    configuration.error,
    fields,
    mapping,
    locale,
    mode,
    getRowKey,
    existingKeys,
    validateRow,
  ]);
  const preview = planning.preview;
  const filteredRows = React.useMemo(
    () =>
      preview?.rows.filter((row) =>
        filter === "invalid"
          ? row.action === "invalid"
          : filter === "duplicates"
            ? Boolean(row.duplicate)
            : true,
      ) ?? [],
    [preview, filter],
  );
  const previewPage = Math.min(
    page,
    Math.max(0, Math.ceil(filteredRows.length / pageSize) - 1),
  );
  const failurePage = Math.min(
    page,
    Math.max(0, Math.ceil(failures.length / pageSize) - 1),
  );
  const ready = Boolean(
    preview &&
    !preview.mappingIssues.length &&
    preview.summary.ready > 0 &&
    (!preview.summary.invalid || excludeInvalid),
  );

  function resetOutcome() {
    retryAttempt.current = null;
    setRetryCount(0);
    setPhase("idle");
    setResult(null);
    setFailures([]);
    setImportError(null);
    setProgress({ completed: 0, total: 0, message: "" });
  }

  async function readFile(file: File | undefined) {
    if (!file || active.current || !configuration.limits) return;
    const version = ++readVersion.current;
    resetOutcome();
    setStep(0);
    setDocument(null);
    setMapping({});
    setFilename(file.name);
    setFileError(null);
    setExcludeInvalid(false);
    setFilter("all");
    setPage(0);
    setReading(true);
    try {
      if (file.size > configuration.limits.maxBytes)
        throw new CSVImportError("file_too_large");
      const parsed = parseCSV(await file.text(), configuration.limits);
      if (!parsed.records.length) throw new CSVImportError("no_records");
      const automatic = autoMapCSVHeaders(parsed.headers, fields);
      if (readVersion.current !== version) return;
      setDocument(parsed);
      setMapping(automatic);
    } catch (error) {
      if (readVersion.current === version)
        setFileError(formatCSVError(error, locale));
    } finally {
      if (readVersion.current === version) setReading(false);
    }
  }

  function downloadSample() {
    if (configuration.sample === null) return;
    try {
      downloadText(
        sampleFilename,
        configuration.sample,
        "text/csv;charset=utf-8",
      );
    } catch (error) {
      setFileError(formatCSVError(error, locale));
    }
  }

  function startAgain() {
    if (active.current) return;
    readVersion.current++;
    resetOutcome();
    setStep(0);
    setDocument(null);
    setFilename("");
    setFileError(null);
    setReading(false);
    setMapping({});
    setExcludeInvalid(false);
    setFilter("all");
    setPage(0);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function runImport(attempt: ImportAttempt<T>) {
    if (active.current || !attempt.rows.length) return;
    const controller = new AbortController();
    active.current = controller;
    retryAttempt.current = attempt;
    setRetryCount(0);
    setImportError(null);
    setResult(null);
    setFailures([]);
    setPage(0);
    setStep(3);
    setPhase("importing");
    setProgress({ completed: 0, total: attempt.rows.length, message: "" });
    try {
      const outcome = await executeImportAttempt(attempt, onImport, {
        signal: controller.signal,
        onProgress(update) {
          if (active.current !== controller || controller.signal.aborted)
            return;
          if (!Number.isSafeInteger(update.completed) || update.completed < 0)
            return;
          const total =
            update.total !== undefined &&
            Number.isSafeInteger(update.total) &&
            update.total > 0
              ? update.total
              : attempt.rows.length;
          setProgress((previous) => ({
            completed: Math.min(
              total,
              Math.max(previous.completed, update.completed),
            ),
            total,
            message: typeof update.message === "string" ? update.message : "",
          }));
        },
      });
      if (active.current !== controller) return;
      retryAttempt.current = outcome.retry;
      setRetryCount(outcome.retry?.rows.length ?? 0);
      setResult(outcome.result);
      setFailures(outcome.failures);
      setPhase(outcome.status);
      setImportError(
        outcome.error ? formatCSVError(outcome.error, locale) : null,
      );
    } finally {
      if (active.current === controller) active.current = null;
    }
  }

  function importReadyRows() {
    if (!ready || !preview) return;
    const eligible = preview.rows.filter(
      (row) => row.action === "create" || row.action === "update",
    );
    void runImport({
      rows: eligible.map((row) => row.data as T),
      sources: eligible.map(({ record }) => ({
        rowNumber: record.rowNumber,
        line: record.line,
      })),
      mode,
      base: {
        created: 0,
        updated: 0,
        skipped:
          preview.summary.skipped +
          (excludeInvalid ? preview.summary.invalid : 0),
      },
    });
  }

  function cancelImport() {
    if (!active.current) return;
    setPhase("cancelling");
    active.current.abort();
  }

  function retry() {
    const attempt = retryAttempt.current;
    if (attempt) void runImport(attempt);
  }

  const stepTitle = phase === "idle" ? t.steps[step] : t[phase];
  const stepDescription =
    phase === "idle"
      ? t.stepDescriptions[step]
      : phase === "importing"
        ? t.importHelp
        : phase === "cancelling"
          ? t.cancellingHelp
          : t[`${phase}Help`];

  return (
    <Card
      role="region"
      aria-labelledby={`${id}-title`}
      className={cn("overflow-hidden", className)}
      data-slot="import-wizard"
      data-step={step}
      data-phase={phase}
    >
      <CardHeader
        className="border-b border-border"
        style={{
          background:
            "linear-gradient(120deg, color-mix(in srgb, var(--primary) 12%, var(--surface)), var(--surface) 72%)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-surface/75 text-primary">
            <FileSpreadsheet className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <CardTitle id={`${id}-title`}>{title ?? t.title}</CardTitle>
            <CardDescription>{description ?? t.description}</CardDescription>
          </div>
        </div>
        <ol
          aria-label={title ?? t.title}
          className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {t.steps.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 text-xs",
                index === step
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border",
                  index <= step
                    ? "border-primary/25 bg-accent text-accent-foreground"
                    : "border-border bg-surface",
                )}
              >
                {index < step || phase === "complete" ? (
                  <Check className="size-3" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              {label}
            </li>
          ))}
        </ol>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        <div>
          <h3
            id={`${id}-step-title`}
            ref={heading}
            tabIndex={-1}
            className="text-sm font-semibold outline-none"
          >
            {stepTitle}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {stepDescription}
          </p>
        </div>

        {configuration.error && (
          <Alert variant="destructive" title={t.configError}>
            {configuration.error}
          </Alert>
        )}
        {planning.error && (
          <Alert variant="destructive" title={t.fileError}>
            {planning.error}
          </Alert>
        )}

        {step === 0 && !configuration.error && (
          <>
            <div className="rounded-xl border border-dashed border-border bg-surface-subtle/30 p-6">
              <Upload className="mb-3 size-6 text-primary" aria-hidden="true" />
              <label
                htmlFor={`${id}-file`}
                className="block text-sm font-semibold"
              >
                {t.choose}
              </label>
              <p
                id={`${id}-file-help`}
                className="mt-1 text-xs leading-5 text-muted-foreground"
              >
                {configuration.limits &&
                  t.limits(
                    (
                      configuration.limits.maxBytes /
                      1024 /
                      1024
                    ).toLocaleString(locale, { maximumFractionDigits: 2 }),
                    formatNumber(configuration.limits.maxRows),
                  )}
              </p>
              <Input
                ref={fileInput}
                id={`${id}-file`}
                type="file"
                accept=".csv,text/csv"
                disabled={reading}
                aria-describedby={`${id}-file-help ${id}-file-state`}
                aria-invalid={Boolean(fileError)}
                className="mt-4 h-auto min-h-10 max-w-xl p-2"
                onChange={(event) => {
                  void readFile(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {t.local}
              </p>
            </div>
            <div id={`${id}-file-state`} aria-live="polite">
              {reading && (
                <p className="text-xs text-muted-foreground">{t.reading}</p>
              )}
              {document && (
                <Alert title={t.fileReady} variant="success">
                  <span className="break-all">{filename}</span>
                  {" · "}
                  {t.records(formatNumber(document.records.length))}
                </Alert>
              )}
              {fileError && (
                <Alert title={t.fileError} variant="destructive">
                  {fileError}
                </Alert>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadSample}
                disabled={reading}
              >
                <Download aria-hidden="true" />
                {t.sample}
              </Button>
              {resourceHref && (
                <a
                  href={publicPath(resourceHref)}
                  className="rounded text-xs font-semibold text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t.resource}
                </a>
              )}
            </div>
          </>
        )}

        {step === 1 && document && preview && (
          <>
            <p className="break-all text-xs text-muted-foreground">
              {filename} · {t.records(formatNumber(document.records.length))}
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map((field, index) => {
                const column = mapping[field.key];
                const issues = preview.mappingIssues.filter(
                  (issue) => issue.field === field.key,
                );
                const helpId = `${id}-mapping-help-${index}`;
                return (
                  <div
                    key={field.key}
                    className="rounded-lg border border-border p-4"
                  >
                    <Select
                      id={`${id}-mapping-${index}`}
                      label={`${importText(field.label, locale)}${field.required ? " *" : ""}`}
                      value={
                        typeof column === "number" ? String(column) : unmapped
                      }
                      options={[
                        { value: unmapped, label: t.notMapped },
                        ...document.headers.map((header, columnIndex) => ({
                          value: String(columnIndex),
                          label: header,
                        })),
                      ]}
                      onValueChange={(value) => {
                        setMapping((previous) => ({
                          ...previous,
                          [field.key]:
                            value === unmapped ? null : Number(value),
                        }));
                        setExcludeInvalid(false);
                        setPage(0);
                      }}
                      aria-invalid={issues.length > 0}
                      aria-describedby={helpId}
                    />
                    <div
                      id={helpId}
                      className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground"
                    >
                      <p>{field.required ? t.required : t.optional}</p>
                      {typeof column === "number" ? (
                        <p className="line-clamp-2 break-all">
                          {t.example}:{" "}
                          {displayValue(document.records[0]?.values[column])}
                        </p>
                      ) : field.defaultValue !== undefined ? (
                        <p>
                          {t.defaultValue}: {displayValue(field.defaultValue)}
                        </p>
                      ) : null}
                      {issues.map((issue, issueIndex) => (
                        <p
                          key={issueIndex}
                          className="font-medium text-foreground"
                        >
                          {issue.message}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {preview.mappingIssues.length > 0 && (
              <Alert variant="warning" title={t.mappingError}>
                <ul className="list-inside list-disc space-y-1">
                  {preview.mappingIssues.map((issue, index) => (
                    <li key={index}>{issue.message}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </>
        )}

        {step === 2 && document && preview && (
          <>
            {getRowKey && (
              <div className="rounded-lg border border-border bg-surface-subtle/30 p-4">
                <Select
                  id={`${id}-mode`}
                  label={t.duplicatePolicy}
                  value={mode}
                  options={[
                    { value: "skip", label: t.skip },
                    { value: "update", label: t.update },
                  ]}
                  onValueChange={(value) => {
                    setMode(value as ImportMode);
                    setPage(0);
                  }}
                  aria-describedby={`${id}-mode-help`}
                  className="max-w-sm"
                />
                <p
                  id={`${id}-mode-help`}
                  className="mt-2 text-xs leading-5 text-muted-foreground"
                >
                  {mode === "skip" ? t.skipHelp : t.updateHelp}
                </p>
              </div>
            )}
            <Counts
              locale={locale}
              values={[
                { label: t.create, value: preview.summary.created },
                { label: t.updateAction, value: preview.summary.updated },
                { label: t.skipped, value: preview.summary.skipped },
                { label: t.invalid, value: preview.summary.invalid },
              ]}
            />
            {preview.summary.invalid > 0 && (
              <div className="space-y-3">
                <Alert title={t.invalidRows} variant="warning">
                  {t.invalidHelp(formatNumber(preview.summary.invalid))}
                </Alert>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={excludeInvalid}
                    onChange={(event) =>
                      setExcludeInvalid(event.currentTarget.checked)
                    }
                    className="size-4 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {t.excludeInvalid(formatNumber(preview.summary.invalid))}
                </label>
              </div>
            )}
            <Select
              id={`${id}-filter`}
              label={t.filter}
              value={filter}
              options={[
                { value: "all", label: t.all },
                { value: "invalid", label: t.errorsOnly },
                { value: "duplicates", label: t.duplicatesOnly },
              ]}
              onValueChange={(value) => {
                setFilter(value as RowFilter);
                setPage(0);
              }}
              className="max-w-xs"
            />
            <div className="overflow-hidden rounded-lg border border-border">
              <Table density="compact" aria-label={t.preview}>
                <TableCaption>
                  {t.records(formatNumber(preview.summary.total))} · {t.preview}
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.row}</TableHead>
                    {fields.map((field) => (
                      <TableHead key={field.key}>
                        {importText(field.label, locale)}
                      </TableHead>
                    ))}
                    <TableHead>{t.action}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows
                    .slice(previewPage * pageSize, (previewPage + 1) * pageSize)
                    .map((row) => (
                      <TableRow key={row.record.rowNumber}>
                        <TableCell className="align-top tabular-nums">
                          {row.record.rowNumber}
                          {row.record.line !== row.record.rowNumber && (
                            <span className="mt-1 block whitespace-nowrap text-[11px] text-muted-foreground">
                              {t.line} {row.record.line}
                            </span>
                          )}
                        </TableCell>
                        {fields.map((field) => {
                          const column = mapping[field.key];
                          const value = displayValue(
                            row.data[field.key] ??
                              (typeof column === "number"
                                ? row.record.values[column]
                                : undefined),
                          );
                          return (
                            <TableCell key={field.key} className="align-top">
                              <span
                                title={value}
                                className="block min-w-20 max-w-56 whitespace-pre-wrap break-words line-clamp-2"
                              >
                                {value}
                              </span>
                            </TableCell>
                          );
                        })}
                        <TableCell className="min-w-56 align-top">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              row.action === "invalid"
                                ? "border-warning-foreground/25 bg-warning text-warning-foreground"
                                : row.action === "skip"
                                  ? "border-border bg-surface-subtle text-muted-foreground"
                                  : "border-primary/20 bg-accent text-accent-foreground",
                            )}
                          >
                            {row.action === "create"
                              ? t.create
                              : row.action === "update"
                                ? t.updateAction
                                : row.action === "skip"
                                  ? t.skipped
                                  : t.invalid}
                          </span>
                          {row.duplicate && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {row.duplicate.kind === "existing"
                                ? t.existing
                                : t.duplicateRow(
                                    row.duplicate.rowNumber ??
                                      row.record.rowNumber,
                                  )}
                            </p>
                          )}
                          {row.issues.length > 0 && (
                            <ul className="mt-2 space-y-1 text-xs">
                              {row.issues.map((issue, index) => (
                                <li key={index}>{issue.message}</li>
                              ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  {!filteredRows.length && (
                    <TableRow>
                      <TableCell
                        colSpan={fields.length + 2}
                        className="py-8 text-center text-muted-foreground"
                      >
                        {t.noMatches}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <RecordPages
              count={filteredRows.length}
              page={previewPage}
              onPageChange={setPage}
              locale={locale}
              label={t.pagination}
            />
            {!preview.summary.ready && (
              <Alert title={t.noReady} variant="info" />
            )}
          </>
        )}

        {step === 3 && phase === "idle" && preview && (
          <>
            <Counts
              locale={locale}
              values={[
                { label: t.create, value: preview.summary.created },
                { label: t.updateAction, value: preview.summary.updated },
                {
                  label: t.skipped,
                  value:
                    preview.summary.skipped +
                    (excludeInvalid ? preview.summary.invalid : 0),
                },
                { label: t.total, value: preview.summary.total },
              ]}
            />
            <dl className="space-y-3 rounded-lg border border-border p-4 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <dt className="text-muted-foreground">{t.steps[0]}</dt>
                <dd className="break-all font-medium">{filename}</dd>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <dt className="text-muted-foreground">{t.ready}</dt>
                <dd className="font-medium tabular-nums">
                  {formatNumber(preview.summary.ready)}
                </dd>
              </div>
              {getRowKey && (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <dt className="text-muted-foreground">{t.duplicatePolicy}</dt>
                  <dd className="font-medium">
                    {mode === "skip" ? t.skip : t.update}
                  </dd>
                </div>
              )}
            </dl>
            <Alert title={t.review}>
              {t.reviewHelp}
              {excludeInvalid && preview.summary.invalid > 0 && (
                <p className="mt-1">
                  {t.excluded(formatNumber(preview.summary.invalid))}
                </p>
              )}
            </Alert>
            {!ready && (
              <Alert
                title={preview.summary.ready ? t.invalidRows : t.noReady}
                variant="warning"
              />
            )}
          </>
        )}

        {busy && (
          <div
            className="space-y-3 rounded-lg border border-border p-5"
            aria-busy="true"
          >
            <Progress
              value={progress.completed}
              max={progress.total}
              label={t.importing}
            />
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {t.progress(progress.completed, progress.total)}
            </p>
            {progress.message && <p className="text-xs">{progress.message}</p>}
          </div>
        )}

        {finished && (
          <>
            {result && (
              <Counts
                locale={locale}
                values={[
                  { label: t.created, value: result.created },
                  { label: t.updated, value: result.updated },
                  { label: t.skipped, value: result.skipped },
                  { label: t.failed, value: result.failed },
                ]}
              />
            )}
            <Alert
              title={stepTitle}
              variant={
                phase === "complete"
                  ? "success"
                  : phase === "error" || phase === "unverified"
                    ? "destructive"
                    : "warning"
              }
            >
              {importError ?? stepDescription}
              {phase === "partial" && !retryCount && (
                <p className="mt-1">{t.noSafeRetry}</p>
              )}
              {retryCount > 0 && (
                <p className="mt-1">{t.retryHelp(formatNumber(retryCount))}</p>
              )}
            </Alert>
            {failures.length > 0 && (
              <>
                <ul className="space-y-3 rounded-lg border border-border p-4 text-xs">
                  {failures
                    .slice(failurePage * pageSize, (failurePage + 1) * pageSize)
                    .map((failure) => (
                      <li key={failure.rowNumber}>
                        <p className="font-semibold">
                          {t.row} {failure.rowNumber}
                          {failure.line !== failure.rowNumber
                            ? ` · ${t.line} ${failure.line}`
                            : ""}
                        </p>
                        <p className="mt-1 leading-5 text-muted-foreground">
                          {failure.message}
                        </p>
                      </li>
                    ))}
                </ul>
                <RecordPages
                  count={failures.length}
                  page={failurePage}
                  onPageChange={setPage}
                  locale={locale}
                  label={t.failurePagination}
                />
              </>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="justify-between border-t border-border pt-4">
        {busy ? (
          <Button
            type="button"
            variant="outline"
            disabled={phase === "cancelling"}
            onClick={cancelImport}
          >
            {phase === "cancelling" ? t.cancelling : t.cancel}
          </Button>
        ) : finished ? (
          <>
            <Button type="button" variant="outline" onClick={startAgain}>
              {t.again}
            </Button>
            {resourceHref && (
              <a
                href={publicPath(resourceHref)}
                className={buttonVariants({ variant: "outline" })}
              >
                {t.resource}
                <ArrowRight aria-hidden="true" />
              </a>
            )}
            {retryCount > 0 && (
              <Button type="button" onClick={retry}>
                <RotateCcw aria-hidden="true" />
                {phase === "partial" ? t.retry : t.retryAttempt}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0 || reading}
              onClick={() => {
                setPage(0);
                setStep((step - 1) as Step);
              }}
            >
              <ArrowLeft aria-hidden="true" />
              {t.back}
            </Button>
            {step === 3 ? (
              <Button
                type="button"
                disabled={
                  !ready || Boolean(configuration.error || planning.error)
                }
                onClick={importReadyRows}
              >
                <Upload aria-hidden="true" />
                {t.import(formatNumber(preview?.summary.ready ?? 0))}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={
                  reading ||
                  Boolean(configuration.error || planning.error) ||
                  (step === 0
                    ? !document
                    : step === 1
                      ? !preview || preview.mappingIssues.length > 0
                      : !ready)
                }
                onClick={() => {
                  setPage(0);
                  setStep((step + 1) as Step);
                }}
              >
                {t.continue}
                <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
