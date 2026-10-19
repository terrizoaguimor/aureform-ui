/** Pure CSV parsing, mapping and import planning. No files, stores or requests. */
export type ImportLocale = "en" | "es";
export type ImportText = string | Readonly<{ en: string; es: string }>;
export type ImportMode = "skip" | "update";
export type ImportKey = string | number;
export type ImportFieldKey<T extends object> = Extract<keyof T, string>;
export type ImportMapping<T extends object> = Partial<
  Record<ImportFieldKey<T>, number | null>
>;

export function importText(text: ImportText, locale: ImportLocale = "en") {
  return typeof text === "string" ? text : text[locale];
}

export type CSVLimits = {
  maxBytes: number;
  /** Nonblank data records, excluding the header. */
  maxRows: number;
  maxColumns: number;
};
export const defaultCSVLimits: Readonly<CSVLimits> = Object.freeze({
  maxBytes: 5 * 1024 * 1024,
  maxRows: 10_000,
  maxColumns: 200,
});

export type CSVErrorCode =
  | "invalid_limits"
  | "file_too_large"
  | "too_many_rows"
  | "too_many_columns"
  | "empty_file"
  | "no_records"
  | "unterminated_quote"
  | "unexpected_quote"
  | "unexpected_character"
  | "invalid_character"
  | "blank_header"
  | "duplicate_header"
  | "unsafe_header"
  | "unsafe_field"
  | "duplicate_field"
  | "invalid_result";

const errorMessages: Record<CSVErrorCode, ImportText> = {
  invalid_limits: {
    en: "CSV limits must be positive whole numbers.",
    es: "Los límites del CSV deben ser números enteros positivos.",
  },
  file_too_large: {
    en: "This file exceeds the allowed size.",
    es: "El archivo supera el tamaño permitido.",
  },
  too_many_rows: {
    en: "This file contains more records than allowed.",
    es: "El archivo contiene más registros de los permitidos.",
  },
  too_many_columns: {
    en: "This file contains more columns than allowed.",
    es: "El archivo contiene más columnas de las permitidas.",
  },
  empty_file: {
    en: "Choose a CSV with column headings and records.",
    es: "Elige un CSV con encabezados y registros.",
  },
  no_records: {
    en: "This CSV has headings but no records to import.",
    es: "El CSV tiene encabezados, pero no tiene registros para importar.",
  },
  unterminated_quote: {
    en: "A quoted value is missing its closing quote.",
    es: "Falta la comilla de cierre de un valor.",
  },
  unexpected_quote: {
    en: "A quote appeared inside an unquoted value.",
    es: "Hay una comilla dentro de un valor sin entrecomillar.",
  },
  unexpected_character: {
    en: "Unexpected text follows a closing quote.",
    es: "Hay texto inesperado después de una comilla de cierre.",
  },
  invalid_character: {
    en: "The file contains a null character. Choose a UTF-8 CSV.",
    es: "El archivo contiene un carácter nulo. Elige un CSV UTF-8.",
  },
  blank_header: {
    en: "Every CSV column needs a nonblank heading.",
    es: "Cada columna del CSV necesita un encabezado.",
  },
  duplicate_header: {
    en: "CSV column headings must be unique.",
    es: "Los encabezados de las columnas deben ser únicos.",
  },
  unsafe_header: {
    en: "This column heading is reserved and cannot be imported.",
    es: "Este encabezado está reservado y no se puede importar.",
  },
  unsafe_field: {
    en: "An import field uses a reserved key.",
    es: "Un campo de importación usa una clave reservada.",
  },
  duplicate_field: {
    en: "Each import field must have a unique key.",
    es: "Cada campo de importación debe tener una clave única.",
  },
  invalid_result: {
    en: "The import result could not be verified. Check your records before starting another import.",
    es: "No se pudo verificar el resultado. Revisa los registros antes de iniciar otra importación.",
  },
};

export class CSVImportError extends Error {
  readonly code: CSVErrorCode;
  readonly line?: number;
  readonly column?: number;
  readonly detail?: string;

  constructor(
    code: CSVErrorCode,
    location: { line?: number; column?: number; detail?: string } = {},
  ) {
    super(importText(errorMessages[code]));
    this.name = "CSVImportError";
    this.code = code;
    this.line = location.line;
    this.column = location.column;
    this.detail = location.detail;
  }
}

export function formatCSVError(
  error: unknown,
  locale: ImportLocale = "en",
): string {
  if (!(error instanceof CSVImportError)) {
    return error instanceof Error && error.message
      ? error.message
      : importText(
          { en: "The CSV could not be read.", es: "No se pudo leer el CSV." },
          locale,
        );
  }
  const location = error.line
    ? locale === "es"
      ? ` (línea ${error.line}${error.column ? `, columna ${error.column}` : ""})`
      : ` (line ${error.line}${error.column ? `, column ${error.column}` : ""})`
    : "";
  return `${importText(errorMessages[error.code], locale)}${error.detail ? `: ${error.detail}` : ""}${location}`;
}

export function resolveCSVLimits(options: Partial<CSVLimits> = {}): CSVLimits {
  const {
    maxBytes = defaultCSVLimits.maxBytes,
    maxRows = defaultCSVLimits.maxRows,
    maxColumns = defaultCSVLimits.maxColumns,
  } = options;
  const limits = { maxBytes, maxRows, maxColumns };
  if (
    Object.values(limits).some(
      (value) => !Number.isSafeInteger(value) || value <= 0,
    )
  ) {
    throw new CSVImportError("invalid_limits");
  }
  return limits;
}

const reservedKeys = new Set(
  [...Object.getOwnPropertyNames(Object.prototype), "prototype"].map((key) =>
    key.toLowerCase(),
  ),
);
const canonicalHeader = (value: string) =>
  value.trim().normalize("NFKC").toLowerCase();
const unsafeKey = (key: string) => reservedKeys.has(canonicalHeader(key));

function checkHeaders(headers: readonly string[], line = 1) {
  const seen = new Set<string>();
  for (const header of headers) {
    const key = canonicalHeader(header);
    if (!key) throw new CSVImportError("blank_header", { line });
    if (unsafeKey(header))
      throw new CSVImportError("unsafe_header", { line, detail: header });
    if (seen.has(key))
      throw new CSVImportError("duplicate_header", { line, detail: header });
    seen.add(key);
  }
}

export type CSVRecord = {
  /** Logical record number, with the header numbered 1. */
  rowNumber: number;
  /** Physical starting line; quoted records may span multiple lines. */
  line: number;
  values: readonly string[];
};
export type CSVDocument = {
  headers: readonly string[];
  records: readonly CSVRecord[];
  bytes: number;
};

/**
 * Comma-delimited UTF-8 CSV. Preserves quoted commas, doubled quotes and
 * multiline values. Blank records are ignored; malformed quoting is fatal.
 * A record with the wrong column count remains available for row validation.
 */
export function parseCSV(
  text: string,
  options: Partial<CSVLimits> = {},
): CSVDocument {
  const limits = resolveCSVLimits(options);
  if (text.length > limits.maxBytes) throw new CSVImportError("file_too_large");
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > limits.maxBytes) throw new CSVImportError("file_too_large");
  let headers: string[] | undefined;
  const records: CSVRecord[] = [];
  let row: string[] = [];
  let value = "";
  let state: "start" | "bare" | "quoted" | "closed" = "start";
  let line = 1;
  let column = 1;
  let startLine = 1;
  let cursor = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  function field() {
    row.push(value);
    if (row.length > limits.maxColumns)
      throw new CSVImportError("too_many_columns", { line, column });
    value = "";
    state = "start";
  }
  function record() {
    field();
    if (row.some((cell) => cell.trim() !== "")) {
      if (!headers) {
        headers = row.map((header) => header.trim());
        checkHeaders(headers, startLine);
      } else {
        if (records.length >= limits.maxRows)
          throw new CSVImportError("too_many_rows", { line: startLine });
        records.push({
          rowNumber: records.length + 2,
          line: startLine,
          values: row,
        });
      }
    }
    row = [];
  }
  function newline(quoted: boolean) {
    const width = text[cursor] === "\r" && text[cursor + 1] === "\n" ? 2 : 1;
    if (quoted) value += text.slice(cursor, cursor + width);
    cursor += width;
    line++;
    column = 1;
  }

  while (cursor < text.length) {
    const char = text[cursor];
    if (char === "\0")
      throw new CSVImportError("invalid_character", { line, column });
    if (state === "quoted") {
      if (char === '"') {
        if (text[cursor + 1] === '"') {
          value += '"';
          cursor += 2;
          column += 2;
        } else {
          state = "closed";
          cursor++;
          column++;
        }
      } else if (char === "\n" || char === "\r") {
        newline(true);
      } else {
        value += char;
        cursor++;
        column++;
      }
      continue;
    }
    if (char === ",") {
      field();
    } else if (char === "\n" || char === "\r") {
      record();
      newline(false);
      startLine = line;
      continue;
    } else if (state === "closed") {
      if (char !== " " && char !== "\t")
        throw new CSVImportError("unexpected_character", { line, column });
    } else if (char === '"') {
      if (state !== "start")
        throw new CSVImportError("unexpected_quote", { line, column });
      state = "quoted";
    } else {
      value += char;
      state = "bare";
    }
    cursor++;
    column++;
  }
  if (state === "quoted")
    throw new CSVImportError("unterminated_quote", { line, column });
  record();
  if (!headers) throw new CSVImportError("empty_file");
  return { headers, records, bytes };
}

export type ImportRowContext = {
  locale: ImportLocale;
  rowNumber: number;
  line: number;
};
export type ImportValidation = ImportText | readonly ImportText[] | void;
export type ImportField<
  T extends object,
  K extends ImportFieldKey<T> = ImportFieldKey<T>,
> = {
  key: K;
  label: ImportText;
  required?: boolean;
  aliases?: readonly string[];
  sample?: string;
  defaultValue?: T[K];
  parse?: (value: string, context: ImportRowContext) => T[K];
  validate?: (
    value: T[K],
    row: Readonly<Partial<T>>,
    context: ImportRowContext,
  ) => ImportValidation;
};

function checkFields<T extends object>(fields: readonly ImportField<T>[]) {
  const seen = new Set<string>();
  for (const field of fields) {
    if (!field.key.trim() || unsafeKey(field.key))
      throw new CSVImportError("unsafe_field", { detail: field.key });
    if (seen.has(field.key))
      throw new CSVImportError("duplicate_field", { detail: field.key });
    seen.add(field.key);
  }
}

const matchingHeader = (value: string) =>
  canonicalHeader(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "");

/** Ambiguous matches are left unmapped rather than guessed. */
export function autoMapCSVHeaders<T extends object>(
  headers: readonly string[],
  fields: readonly ImportField<T>[],
): ImportMapping<T> {
  checkHeaders(headers);
  checkFields(fields);
  const mapping: ImportMapping<T> = {};
  const claimed = new Set<number>();
  for (const field of fields) {
    const labels =
      typeof field.label === "string"
        ? [field.label]
        : [field.label.en, field.label.es];
    const aliases = new Set(
      [field.key, ...labels, ...(field.aliases ?? [])].map(matchingHeader),
    );
    const candidates = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => aliases.has(matchingHeader(header)));
    mapping[field.key] =
      candidates.length === 1 && !claimed.has(candidates[0].index)
        ? candidates[0].index
        : null;
    const index = mapping[field.key];
    if (typeof index === "number") claimed.add(index);
  }
  return mapping;
}

export type ImportIssue<T extends object> = {
  code:
    | "missing_mapping"
    | "invalid_mapping"
    | "duplicate_mapping"
    | "column_count"
    | "required"
    | "parse"
    | "validation"
    | "invalid_key";
  field?: ImportFieldKey<T>;
  message: string;
};

export function validateCSVMapping<T extends object>(
  headers: readonly string[],
  fields: readonly ImportField<T>[],
  mapping: ImportMapping<T>,
  locale: ImportLocale = "en",
): ImportIssue<T>[] {
  checkHeaders(headers);
  checkFields(fields);
  if (Object.keys(mapping).some(unsafeKey))
    throw new CSVImportError("unsafe_field");
  const issues: ImportIssue<T>[] = [];
  const claimed = new Map<number, string>();
  for (const field of fields) {
    const index = mapping[field.key];
    const label = importText(field.label, locale);
    if (index === null || index === undefined) {
      if (field.required && field.defaultValue === undefined)
        issues.push({
          code: "missing_mapping",
          field: field.key,
          message: locale === "es" ? `Asigna ${label}.` : `Map ${label}.`,
        });
      continue;
    }
    if (!Number.isInteger(index) || index < 0 || index >= headers.length) {
      issues.push({
        code: "invalid_mapping",
        field: field.key,
        message:
          locale === "es"
            ? `Elige una columna válida para ${label}.`
            : `Choose a valid column for ${label}.`,
      });
    } else if (claimed.has(index)) {
      issues.push({
        code: "duplicate_mapping",
        field: field.key,
        message:
          locale === "es"
            ? `${label} y ${claimed.get(index)} usan la misma columna.`
            : `${label} and ${claimed.get(index)} use the same column.`,
      });
    } else {
      claimed.set(index, label);
    }
  }
  return issues;
}

export type ValidatedImportRow<T extends object> = {
  record: CSVRecord;
  data: Partial<T>;
  issues: readonly ImportIssue<T>[];
  action: "create" | "update" | "skip" | "invalid";
  key?: string;
  duplicate?: {
    kind: "existing" | "file";
    rowNumber?: number;
  };
};
export type ImportPreview<T extends object> = {
  rows: readonly ValidatedImportRow<T>[];
  readyRows: readonly T[];
  mappingIssues: readonly ImportIssue<T>[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    /** Valid records matching an existing key or an earlier valid CSV record. */
    duplicates: number;
    skipped: number;
    created: number;
    updated: number;
    ready: number;
  };
};
export type ImportValidationOptions<T extends object> = {
  locale?: ImportLocale;
  mode?: ImportMode;
  getRowKey?: (row: Readonly<T>) => ImportKey | null | undefined;
  existingKeys?: ReadonlySet<ImportKey> | readonly ImportKey[];
  validateRow?: (
    row: Readonly<T>,
    context: ImportRowContext,
  ) => ImportValidation;
};

function messages(value: ImportValidation, locale: ImportLocale): string[] {
  if (value === undefined) return [];
  const entries: readonly ImportText[] = Array.isArray(value)
    ? value
    : [value as ImportText];
  return entries.map((message) => importText(message, locale)).filter(Boolean);
}
function keyString(value: ImportKey | null | undefined) {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    (typeof value === "number" && !Number.isFinite(value))
  )
    return "";
  return String(value).trim();
}

/**
 * Validates all records before deduplication. Invalid later records never
 * replace an earlier valid record. Skip keeps the first valid CSV occurrence;
 * update keeps the last valid occurrence, preserving its original row number.
 * No existing row or supplied key set is mutated.
 */
export function previewCSVImport<T extends object>(
  document: CSVDocument,
  fields: readonly ImportField<T>[],
  mapping: ImportMapping<T>,
  options: ImportValidationOptions<T> = {},
): ImportPreview<T> {
  const locale = options.locale ?? "en";
  const mode = options.mode ?? "skip";
  const mappingIssues = validateCSVMapping(
    document.headers,
    fields,
    mapping,
    locale,
  );
  const rows: ValidatedImportRow<T>[] = [];
  const existing = new Set(
    [...(options.existingKeys ?? [])].map(keyString).filter(Boolean),
  );
  const seen = new Map<string, number>();
  let duplicates = 0;

  for (const record of document.records) {
    const context = { locale, rowNumber: record.rowNumber, line: record.line };
    const data: Partial<T> = {};
    const issues: ImportIssue<T>[] = [];
    const failedFields = new Set<string>();
    if (record.values.length !== document.headers.length) {
      issues.push({
        code: "column_count",
        message:
          locale === "es"
            ? `Hay ${record.values.length} columnas; se esperaban ${document.headers.length}.`
            : `Found ${record.values.length} columns; expected ${document.headers.length}.`,
      });
    }
    for (const field of fields) {
      const index = mapping[field.key];
      const raw = typeof index === "number" ? (record.values[index] ?? "") : "";
      const label = importText(field.label, locale);
      if (!raw.trim()) {
        if (field.defaultValue !== undefined) {
          data[field.key] = field.defaultValue;
        } else if (field.required) {
          failedFields.add(field.key);
          issues.push({
            code: "required",
            field: field.key,
            message:
              locale === "es"
                ? `${label} es obligatorio.`
                : `${label} is required.`,
          });
        }
        continue;
      }
      try {
        data[field.key] = field.parse
          ? field.parse(raw, context)
          : (raw.trim() as T[ImportFieldKey<T>]);
      } catch (error) {
        failedFields.add(field.key);
        issues.push({
          code: "parse",
          field: field.key,
          message:
            error instanceof Error && error.message
              ? error.message
              : locale === "es"
                ? `${label} no es válido.`
                : `${label} is invalid.`,
        });
      }
    }
    for (const field of fields) {
      if (failedFields.has(field.key) || !field.validate) continue;
      try {
        for (const message of messages(
          field.validate(
            data[field.key] as T[ImportFieldKey<T>],
            data,
            context,
          ),
          locale,
        )) {
          issues.push({ code: "validation", field: field.key, message });
        }
      } catch (error) {
        issues.push({
          code: "validation",
          field: field.key,
          message: formatCSVError(error, locale),
        });
      }
    }
    if (!issues.length && options.validateRow) {
      try {
        for (const message of messages(
          options.validateRow(data as T, context),
          locale,
        ))
          issues.push({ code: "validation", message });
      } catch (error) {
        issues.push({
          code: "validation",
          message: formatCSVError(error, locale),
        });
      }
    }
    const row: ValidatedImportRow<T> = {
      record,
      data,
      issues,
      action: issues.length || mappingIssues.length ? "invalid" : "create",
    };
    if (row.action !== "invalid" && options.getRowKey) {
      try {
        row.key = keyString(options.getRowKey(data as T));
        if (!row.key) throw new Error();
      } catch {
        issues.push({
          code: "invalid_key",
          message:
            locale === "es"
              ? "El registro necesita una clave única válida."
              : "The record needs a valid unique key.",
        });
        row.action = "invalid";
      }
    }
    if (row.action !== "invalid" && row.key) {
      const previousIndex = seen.get(row.key);
      const previous =
        previousIndex === undefined ? undefined : rows[previousIndex];
      const matchesExisting = existing.has(row.key);
      if (previous || matchesExisting) {
        duplicates++;
        row.duplicate = matchesExisting
          ? { kind: "existing" }
          : { kind: "file", rowNumber: previous?.record.rowNumber };
        if (mode === "skip") {
          row.action = "skip";
        } else {
          row.action = matchesExisting ? "update" : "create";
          if (previous) {
            previous.action = "skip";
            previous.duplicate = {
              kind: "file",
              rowNumber: record.rowNumber,
            };
          }
        }
      }
      if (!previous || mode === "update") seen.set(row.key, rows.length);
    }
    rows.push(row);
  }
  const created = rows.filter((row) => row.action === "create").length;
  const updated = rows.filter((row) => row.action === "update").length;
  const skipped = rows.filter((row) => row.action === "skip").length;
  const invalid = rows.filter((row) => row.action === "invalid").length;
  return {
    rows,
    readyRows: rows
      .filter((row) => row.action === "create" || row.action === "update")
      .map((row) => row.data as T),
    mappingIssues,
    summary: {
      total: rows.length,
      valid: rows.length - invalid,
      invalid,
      duplicates,
      skipped,
      created,
      updated,
      ready: created + updated,
    },
  };
}

/** Zero-based index in the exact rows submitted to this callback invocation. */
export type ImportFailure = { index: number; message: string };
export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  /** Supply one entry for each failed row to enable a safe failed-only retry. */
  failures?: readonly ImportFailure[];
};
export type ImportProgress = {
  completed: number;
  total?: number;
  message?: string;
};
export type ImportContext = {
  mode: ImportMode;
  signal: AbortSignal;
  onProgress: (progress: ImportProgress) => void;
};
/**
 * The caller owns persistence. Stage writes and roll them back before rejecting.
 * On abort, roll back and reject with the signal's reason or an AbortError.
 * A cancelled/rejected invocation can be retried in full; a resolved partial
 * result is retried only by its failure indexes. Resolving after abort does not
 * confirm rollback and must not enable an automatic retry.
 */
export type ImportCallback<T extends object> = (
  rows: readonly T[],
  context: ImportContext,
) => Promise<ImportResult>;

/** Also prevents an unverifiable adapter response from becoming a false PASS. */
export function validateImportResult(
  value: ImportResult,
  submittedRows: number,
): ImportResult {
  if (!Number.isSafeInteger(submittedRows) || submittedRows < 0)
    throw new CSVImportError("invalid_result");
  const counts = [
    value?.created,
    value?.updated,
    value?.skipped,
    value?.failed,
  ];
  if (
    counts.some((count) => !Number.isSafeInteger(count) || count < 0) ||
    counts.reduce((sum, count) => sum + count, 0) !== submittedRows
  )
    throw new CSVImportError("invalid_result");
  if (value.failures !== undefined) {
    if (!Array.isArray(value.failures))
      throw new CSVImportError("invalid_result");
    const indexes = new Set<number>();
    for (const failure of value.failures) {
      if (
        !failure ||
        typeof failure !== "object" ||
        !Number.isInteger(failure.index) ||
        failure.index < 0 ||
        failure.index >= submittedRows ||
        indexes.has(failure.index) ||
        typeof failure.message !== "string"
      )
        throw new CSVImportError("invalid_result");
      indexes.add(failure.index);
    }
    if (indexes.size !== value.failed)
      throw new CSVImportError("invalid_result");
  }
  return {
    created: value.created,
    updated: value.updated,
    skipped: value.skipped,
    failed: value.failed,
    ...(value.failures
      ? { failures: value.failures.map((failure) => ({ ...failure })) }
      : {}),
  };
}

export type ImportSourceRow = { rowNumber: number; line: number };
export type ImportRowFailure = ImportSourceRow & { message: string };
export type ImportAttempt<T extends object> = {
  rows: readonly T[];
  sources: readonly ImportSourceRow[];
  mode: ImportMode;
  /** Earlier committed successes and rows omitted during preview. */
  base: Pick<ImportResult, "created" | "updated" | "skipped">;
};
export type ImportAttemptOutcome<T extends object> = {
  status: "complete" | "partial" | "cancelled" | "error" | "unverified";
  result: ImportResult | null;
  failures: readonly ImportRowFailure[];
  retry: ImportAttempt<T> | null;
  error: unknown;
};

/**
 * Executes the same transaction/retry contract used by ImportWizard, without
 * React or a store. The caller must roll back a rejected/aborted invocation.
 * Successful rows are never resubmitted by a partial retry. An unverified
 * response, including resolution after abort, cannot enable an automatic retry.
 */
export async function executeImportAttempt<T extends object>(
  attempt: ImportAttempt<T>,
  onImport: ImportCallback<T>,
  options: {
    signal: AbortSignal;
    onProgress?: (progress: ImportProgress) => void;
  },
): Promise<ImportAttemptOutcome<T>> {
  const { signal } = options;
  const unverified = (): ImportAttemptOutcome<T> => ({
    status: "unverified",
    result: null,
    failures: [],
    retry: null,
    error: new CSVImportError("invalid_result"),
  });
  if (
    attempt.rows.length !== attempt.sources.length ||
    [attempt.base.created, attempt.base.updated, attempt.base.skipped].some(
      (count) => !Number.isSafeInteger(count) || count < 0,
    ) ||
    !Number.isSafeInteger(
      attempt.base.created +
        attempt.base.updated +
        attempt.base.skipped +
        attempt.rows.length,
    )
  )
    return unverified();
  let resolved = false;
  let acceptingProgress = true;
  try {
    signal.throwIfAborted();
    const response = await onImport(attempt.rows, {
      mode: attempt.mode,
      signal,
      onProgress(progress) {
        if (acceptingProgress && !signal.aborted)
          options.onProgress?.(progress);
      },
    });
    resolved = true;
    if (signal.aborted) return unverified();
    const checked = validateImportResult(response, attempt.rows.length);
    const result: ImportResult = {
      created: attempt.base.created + checked.created,
      updated: attempt.base.updated + checked.updated,
      skipped: attempt.base.skipped + checked.skipped,
      failed: checked.failed,
    };
    const failures = (checked.failures ?? []).map(({ index, message }) => ({
      ...attempt.sources[index],
      message,
    }));
    const retry: ImportAttempt<T> | null =
      checked.failed && checked.failures?.length
        ? {
            rows: checked.failures.map(({ index }) => attempt.rows[index]),
            sources: checked.failures.map(
              ({ index }) => attempt.sources[index],
            ),
            mode: attempt.mode,
            base: {
              created: result.created,
              updated: result.updated,
              skipped: result.skipped,
            },
          }
        : null;
    return {
      status: checked.failed ? "partial" : "complete",
      result,
      failures,
      retry,
      error: null,
    };
  } catch (error) {
    if (resolved) return unverified();
    return {
      status: signal.aborted ? "cancelled" : "error",
      result: null,
      failures: [],
      retry: attempt,
      error: signal.aborted ? null : error,
    };
  } finally {
    acceptingProgress = false;
  }
}

/** Always quotes cells; text that could become a spreadsheet formula is escaped. */
export function serializeCSV(
  headers: readonly string[],
  records: readonly (readonly unknown[])[],
): string {
  checkHeaders(headers);
  const escape = (value: unknown) => {
    const raw = String(value ?? "");
    const safe =
      typeof value === "string" && /^\s*[=+@\t\r-]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return [headers, ...records]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}

export function createCSVSample<T extends object>(
  fields: readonly ImportField<T>[],
  rows?: readonly Partial<T>[],
): string {
  checkFields(fields);
  return serializeCSV(
    fields.map((field) => field.key),
    rows?.length
      ? rows.map((row) => fields.map((field) => row[field.key] ?? ""))
      : [fields.map((field) => field.sample ?? field.defaultValue ?? "")],
  );
}

/** Structurally compatible with Customer minus its caller-assigned id. */
export type CustomerImportRow = {
  name: string;
  email: string;
  company: string;
  plan: "Starter" | "Pro" | "Enterprise";
  status: "active" | "trial" | "paused";
  amount: number;
  joined: string;
};

const plans = ["Starter", "Pro", "Enterprise"] as const;
const statuses = ["active", "trial", "paused"] as const;
// Matches the existing foundation's default email format without adding a dependency.
const customerEmailPattern =
  /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
function choice<T extends string>(
  value: string,
  options: readonly T[],
  context: ImportRowContext,
): T {
  const found = options.find(
    (option) => option.toLowerCase() === value.trim().toLowerCase(),
  );
  if (!found)
    throw new Error(
      context.locale === "es"
        ? `Usa uno de estos valores: ${options.join(", ")}.`
        : `Use one of: ${options.join(", ")}.`,
    );
  return found;
}

export const customerImportFields: readonly ImportField<CustomerImportRow>[] = [
  {
    key: "name",
    label: { en: "Name", es: "Nombre" },
    required: true,
    aliases: ["full name", "nombre completo"],
    sample: "Alex Rivera",
    validate: (value) =>
      typeof value === "string" && value.length >= 2 && value.length <= 120
        ? undefined
        : {
            en: "Name must contain 2–120 characters.",
            es: "El nombre debe tener entre 2 y 120 caracteres.",
          },
  },
  {
    key: "email",
    label: { en: "Email", es: "Correo" },
    required: true,
    aliases: ["e-mail", "correo electrónico"],
    sample: "alex@example.demo",
    // Keep the imported spelling; normalize only the duplicate lookup key.
    parse: (value) => value.trim(),
    validate: (value) =>
      typeof value === "string" &&
      value.length <= 254 &&
      customerEmailPattern.test(value)
        ? undefined
        : {
            en: "Enter a valid email address.",
            es: "Escribe un correo válido.",
          },
  },
  {
    key: "company",
    label: { en: "Company", es: "Empresa" },
    aliases: ["organization", "organización"],
    defaultValue: "",
    sample: "Northstar",
    validate: (value) =>
      typeof value === "string" && value.length <= 200
        ? undefined
        : {
            en: "Company must be at most 200 characters.",
            es: "La empresa admite hasta 200 caracteres.",
          },
  },
  {
    key: "plan",
    label: "Plan",
    required: true,
    sample: "Pro",
    parse: (value, context) => choice(value, plans, context),
  },
  {
    key: "status",
    label: { en: "Status", es: "Estado" },
    required: true,
    sample: "active",
    parse: (value, context) => choice(value, statuses, context),
  },
  {
    key: "amount",
    label: { en: "Amount", es: "Importe" },
    required: true,
    aliases: ["monto"],
    sample: "249",
    parse: (value, context) => {
      const raw = value.trim();
      const amount = Number(raw);
      if (
        !/^(?:\d+\.?\d*|\.\d+)$/.test(raw) ||
        !Number.isFinite(amount) ||
        amount > Number.MAX_SAFE_INTEGER
      )
        throw new Error(
          context.locale === "es"
            ? "Usa un importe no negativo con punto decimal."
            : "Use a nonnegative amount with a decimal point.",
        );
      return amount;
    },
  },
  {
    key: "joined",
    label: { en: "Joined", es: "Fecha de alta" },
    required: true,
    aliases: ["joined date", "fecha", "alta"],
    sample: "2026-10-19",
    validate: (value) => {
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const date = new Date(`${value}T00:00:00Z`);
        if (
          Number.isFinite(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        )
          return;
      }
      return {
        en: "Use a real date in YYYY-MM-DD format.",
        es: "Usa una fecha válida con formato AAAA-MM-DD.",
      };
    },
  },
];

export const getCustomerImportKey = (
  row: Readonly<Pick<CustomerImportRow, "email">>,
) => row.email.trim().toLowerCase();
