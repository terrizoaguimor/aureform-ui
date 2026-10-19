"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  Columns3,
  Save,
  Share2,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  DataTable,
  defaultTableLabels,
  type DataTableColumnMeta,
  type DataTableLabels,
  type DataTableModeProps,
  type DataTableProps,
} from "@/components/ui/data-table";
import type { TableDensity } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import {
  isDataFilter,
  matchesDataFilter,
  normalizeDataTableColumnState,
  normalizeDataTableQuery,
  serializeDataTableQuery,
  type DataFilter,
  type DataFilterScalar,
  type DataTableColumnState,
  type DataTableQuery,
} from "@/lib/data-query";
import { cn } from "@/lib/utils";

export type DataWorkbenchValue = {
  query: DataTableQuery;
  columns?: Partial<DataTableColumnState>;
  density?: TableDensity;
};

export type DataWorkbenchSavedView = {
  id: string;
  name: string;
  value: DataWorkbenchValue;
};

export type DataWorkbenchFilterOption = {
  value: DataFilterScalar;
  label: string;
};

type FilterFieldBase = { id: string; label: string; placeholder?: string };

/** All fields are AND conditions. A multi-select matches any selected option within its field. */
export type DataWorkbenchFilterField<T> = FilterFieldBase &
  (
    | {
        type: "text";
        operator?: "contains" | "startsWith";
        getValue?: (row: T) => string | null | undefined;
      }
    | {
        type: "select" | "multi-select";
        options: readonly DataWorkbenchFilterOption[];
        getValue?: (row: T) => DataFilterScalar | undefined;
      }
    | { type: "number-range"; getValue?: (row: T) => number | null | undefined }
    | {
        type: "date-range";
        getValue?: (row: T) => string | Date | null | undefined;
      }
  );

const englishLabels = {
  toolbar: "Table controls",
  savedViews: "Saved views",
  allRecords: "Current view",
  filters: "Filters",
  filterDescription: "Records must match every condition.",
  activeFilters: "Active filters",
  search: "Search",
  clearFilters: "Clear filters",
  removeFilter: "Remove filter",
  anyValue: "Any value",
  minimum: "Minimum",
  maximum: "Maximum",
  fromDate: "From date",
  toDate: "To date",
  invalidRange: "The end of the range must not precede its start.",
  columns: "Configure columns",
  columnDescription:
    "Choose visibility, order, pinned columns and widths for this view.",
  density: "Density",
  comfortable: "Comfortable",
  compact: "Compact",
  showColumn: "Show column",
  moveEarlier: "Move earlier",
  moveLater: "Move later",
  pin: "Pin",
  unpinned: "Not pinned",
  pinLeft: "Left",
  pinRight: "Right",
  width: "Width in pixels",
  saveView: "Save view",
  viewName: "View name",
  save: "Save",
  saveNewView: "Save as new",
  cancel: "Cancel",
  deleteView: "Delete view",
  shareView: "Share view",
  actionError: "Could not complete the view action",
  emptyOptions: "No options found",
  removeOption: "Remove",
  keyboardHint: "Press Backspace or Delete to remove",
  emptyValue: "Empty",
  hasValue: "Has a value",
  trueValue: "Yes",
  falseValue: "No",
  not: "Not",
  startsWith: "Starts with",
  activeCondition: "Active condition",
};
export type DataWorkbenchLabels = {
  [Key in keyof typeof englishLabels]: string;
};
const spanishLabels: DataWorkbenchLabels = {
  toolbar: "Controles de la tabla",
  savedViews: "Vistas guardadas",
  allRecords: "Vista actual",
  filters: "Filtros",
  filterDescription: "Los registros deben cumplir todas las condiciones.",
  activeFilters: "Filtros activos",
  search: "Búsqueda",
  clearFilters: "Limpiar filtros",
  removeFilter: "Quitar filtro",
  anyValue: "Cualquier valor",
  minimum: "Mínimo",
  maximum: "Máximo",
  fromDate: "Desde",
  toDate: "Hasta",
  invalidRange: "El final del rango no puede ser anterior al inicio.",
  columns: "Configurar columnas",
  columnDescription:
    "Elige visibilidad, orden, columnas fijas y anchos para esta vista.",
  density: "Densidad",
  comfortable: "Cómoda",
  compact: "Compacta",
  showColumn: "Mostrar columna",
  moveEarlier: "Mover antes",
  moveLater: "Mover después",
  pin: "Fijar",
  unpinned: "Sin fijar",
  pinLeft: "Izquierda",
  pinRight: "Derecha",
  width: "Ancho en píxeles",
  saveView: "Guardar vista",
  viewName: "Nombre de la vista",
  save: "Guardar",
  saveNewView: "Guardar como nueva",
  cancel: "Cancelar",
  deleteView: "Eliminar vista",
  shareView: "Compartir vista",
  actionError: "No se pudo completar la acción de la vista",
  emptyOptions: "No se encontraron opciones",
  removeOption: "Quitar",
  keyboardHint: "Pulsa Retroceso o Suprimir para quitar",
  emptyValue: "Vacío",
  hasValue: "Tiene un valor",
  trueValue: "Sí",
  falseValue: "No",
  not: "No",
  startsWith: "Empieza por",
  activeCondition: "Condición activa",
};

const spanishTableLabels: Required<DataTableLabels> = {
  search: "Buscar registros…",
  empty: "No se encontraron registros",
  emptyDescription: "Prueba otra búsqueda o limpia los filtros.",
  previous: "Página anterior",
  next: "Página siguiente",
  selectAll: "Seleccionar esta página",
  selectRow: "Seleccionar fila",
  selected: "seleccionados",
  page: "Página",
  of: "de",
  rows: "registros",
  clear: "Limpiar búsqueda",
  error: "No se pudieron cargar los registros",
  retry: "Reintentar",
  loading: "Cargando registros",
  columns: "Columnas",
  clearSelection: "Limpiar selección",
  rowsPerPage: "Registros por página",
};

export type DataWorkbenchProps<T extends { id: string }> = Omit<
  DataTableProps<T>,
  | "query"
  | "onQueryChange"
  | "columnState"
  | "onColumnStateChange"
  | "density"
  | "labels"
  | "mode"
  | "rowCount"
> &
  DataTableModeProps & {
    value: DataWorkbenchValue;
    onValueChange: (value: DataWorkbenchValue) => void;
    onQueryChange?: (query: DataTableQuery) => void;
    filterFields?: readonly DataWorkbenchFilterField<T>[];
    savedViews?: readonly DataWorkbenchSavedView[];
    activeViewId?: string;
    onActiveViewChange?: (id: string | undefined) => void;
    onSaveView?: (view: DataWorkbenchSavedView) => void | Promise<void>;
    onDeleteView?: (id: string) => void | Promise<void>;
    onShareView?: (
      value: DataWorkbenchValue,
      view?: DataWorkbenchSavedView,
    ) => void | Promise<void>;
    columnConfig?: boolean;
    labels?: Partial<DataWorkbenchLabels>;
    tableLabels?: Partial<DataTableLabels>;
  };

type ResolvedValue = {
  query: DataTableQuery;
  columns: DataTableColumnState;
  density: TableDensity;
};
const emptyItems = [] as const;

function resolveValue(value: DataWorkbenchValue): ResolvedValue {
  return {
    query: normalizeDataTableQuery(value.query),
    columns: normalizeDataTableColumnState(value.columns),
    density: value.density === "compact" ? "compact" : "comfortable",
  };
}

function columnId<T>(column: ColumnDef<T>): string | undefined {
  if (column.id) return column.id;
  if ("accessorKey" in column)
    return String(column.accessorKey).replaceAll(".", "_");
  return typeof column.header === "string" ? column.header : undefined;
}

function leafColumns<T>(columns: ColumnDef<T>[]) {
  return columns.flatMap(
    (
      column,
    ): {
      id: string;
      label: string;
      definition: ColumnDef<T>;
      accessor: boolean;
    }[] => {
      if ("columns" in column && column.columns)
        return leafColumns(column.columns);
      const id = columnId(column);
      if (!id) return [];
      const meta = column.meta as DataTableColumnMeta | undefined;
      return [
        {
          id,
          label:
            meta?.label ??
            (typeof column.header === "string" ? column.header : id),
          definition: column,
          accessor: "accessorKey" in column || "accessorFn" in column,
        },
      ];
    },
  );
}

function scalarLabel<T>(
  value: DataFilterScalar,
  field: DataWorkbenchFilterField<T> | undefined,
  labels: DataWorkbenchLabels,
) {
  if (field && (field.type === "select" || field.type === "multi-select")) {
    const option = field.options.find((option) =>
      Object.is(option.value, value),
    );
    if (option) return option.label;
  }
  return value === null
    ? labels.emptyValue
    : value === true
      ? labels.trueValue
      : value === false
        ? labels.falseValue
        : String(value);
}

function filterLabel<T>(
  value: unknown,
  field: DataWorkbenchFilterField<T> | undefined,
  labels: DataWorkbenchLabels,
): string {
  const format = (value: DataFilterScalar) => scalarLabel(value, field, labels);
  if (!isDataFilter(value)) {
    if (Array.isArray(value))
      return value.map((item) => format(item)).join(", ");
    return typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
      ? format(value)
      : labels.activeCondition;
  }
  switch (value.operator) {
    case "contains":
    case "equals":
      return format(value.value);
    case "startsWith":
      return `${labels.startsWith} ${value.value}`;
    case "notEquals":
      return `≠ ${format(value.value)}`;
    case "in":
      return value.value.map(format).join(", ");
    case "notIn":
      return `${labels.not}: ${value.value.map(format).join(", ")}`;
    case "between":
    case "dateBetween":
      return `${value.value[0] ?? "…"} – ${value.value[1] ?? "…"}`;
    case "isEmpty":
      return labels.emptyValue;
    case "isNotEmpty":
      return labels.hasValue;
    case "gt":
      return `> ${value.value}`;
    case "gte":
      return `≥ ${value.value}`;
    case "lt":
      return `< ${value.value}`;
    case "lte":
      return `≤ ${value.value}`;
  }
}

function FilterControl<T>({
  field,
  value,
  onChange,
  labels,
}: {
  field: DataWorkbenchFilterField<T>;
  value: unknown;
  onChange: (value: DataFilter | undefined) => void;
  labels: DataWorkbenchLabels;
}) {
  const id = useId();
  if (field.type === "text") {
    const text =
      isDataFilter(value) &&
      (value.operator === "contains" || value.operator === "startsWith")
        ? value.value
        : typeof value === "string"
          ? value
          : "";
    return (
      <label className="grid gap-2 text-xs font-medium">
        {field.label}
        <Input
          value={text}
          placeholder={field.placeholder}
          onChange={(event) =>
            onChange({
              operator: field.operator ?? "contains",
              value: event.target.value,
            })
          }
        />
      </label>
    );
  }
  if (field.type === "select" || field.type === "multi-select") {
    const options = field.options.map((option) => ({
      value: JSON.stringify(option.value),
      label: option.label,
    }));
    if (field.type === "select") {
      const selected =
        isDataFilter(value) && value.operator === "equals"
          ? value.value
          : value;
      const code =
        options.find((option, index) =>
          Object.is(field.options[index].value, selected),
        )?.value ?? "";
      return (
        <Select
          label={field.label}
          options={[{ value: "", label: labels.anyValue }, ...options]}
          value={code}
          onValueChange={(code) => {
            const option = field.options.find(
              (option) => JSON.stringify(option.value) === code,
            );
            onChange(
              option ? { operator: "equals", value: option.value } : undefined,
            );
          }}
        />
      );
    }
    const selected =
      isDataFilter(value) && value.operator === "in"
        ? value.value
        : Array.isArray(value)
          ? value
          : [];
    return (
      <div className="grid gap-2">
        <span className="text-xs font-medium">{field.label}</span>
        <MultiSelect
          label={field.label}
          options={options}
          value={options
            .filter((option, index) =>
              selected.some((item) =>
                Object.is(item, field.options[index].value),
              ),
            )
            .map((option) => option.value)}
          placeholder={field.placeholder ?? labels.anyValue}
          emptyLabel={labels.emptyOptions}
          removeLabel={labels.removeOption}
          keyboardHint={labels.keyboardHint}
          onValueChange={(codes) =>
            onChange({
              operator: "in",
              value: field.options
                .filter((option) =>
                  codes.includes(JSON.stringify(option.value)),
                )
                .map((option) => option.value),
            })
          }
        />
      </div>
    );
  }
  const date = field.type === "date-range";
  let range: [number | string | null, number | string | null] = [null, null];
  if (isDataFilter(value)) {
    if (date && value.operator === "dateBetween") range = value.value;
    if (!date && value.operator === "between") range = value.value;
  }
  const invalid = range[0] !== null && range[1] !== null && range[0] > range[1];
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-xs font-medium">{field.label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map((index) => (
          <Input
            key={index}
            type={date ? "date" : "number"}
            step={date ? undefined : "any"}
            aria-label={`${field.label}: ${date ? (index ? labels.toDate : labels.fromDate) : index ? labels.maximum : labels.minimum}`}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? id : undefined}
            placeholder={index ? labels.maximum : labels.minimum}
            value={range[index] ?? ""}
            onChange={(event) => {
              const input = event.target.value;
              if (date) {
                const next: [string | null, string | null] = [
                  range[0] as string | null,
                  range[1] as string | null,
                ];
                next[index] = input || null;
                onChange({ operator: "dateBetween", value: next });
              } else {
                const number = input === "" ? null : Number(input);
                if (number !== null && !Number.isFinite(number)) return;
                const next: [number | null, number | null] = [
                  range[0] as number | null,
                  range[1] as number | null,
                ];
                next[index] = number;
                onChange({ operator: "between", value: next });
              }
            }}
          />
        ))}
      </div>
      {invalid && (
        <p
          id={id}
          role="status"
          className="text-xs text-destructive-foreground"
        >
          {labels.invalidRange}
        </p>
      )}
    </fieldset>
  );
}

/** Controlled data UI; fetching, URL state and saved-view persistence belong to the caller. */
export function DataWorkbench<T extends { id: string }>(
  props: DataWorkbenchProps<T>,
) {
  const {
    value,
    onValueChange,
    onQueryChange,
    columns,
    filterFields = emptyItems,
    savedViews = emptyItems,
    activeViewId,
    onActiveViewChange,
    onSaveView,
    onDeleteView,
    onShareView,
    columnConfig = true,
    labels: labelOverrides,
    tableLabels: tableLabelOverrides,
    className,
    ...tableProps
  } = props;
  const locale = useLocale();
  const id = useId();
  const labels = useMemo(
    () => ({
      ...(locale.startsWith("es") ? spanishLabels : englishLabels),
      ...labelOverrides,
    }),
    [locale, labelOverrides],
  );
  const tableLabels = useMemo(
    () => ({
      ...(locale.startsWith("es") ? spanishTableLabels : defaultTableLabels),
      ...tableLabelOverrides,
    }),
    [locale, tableLabelOverrides],
  );
  const resolved = useMemo(() => resolveValue(value), [value]);
  const current = useRef(resolved);
  useLayoutEffect(() => {
    current.current = resolved;
  });
  const [internalActiveId, setInternalActiveId] = useState<string>();
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "save" | "delete" | "share"
  >();
  const [actionError, setActionError] = useState<string>();
  const activeViewControlled = Object.hasOwn(props, "activeViewId");
  const activeView = savedViews.find(
    (view) =>
      view.id === (activeViewControlled ? activeViewId : internalActiveId),
  );
  const setActiveView = (id: string | undefined) => {
    if (!activeViewControlled) setInternalActiveId(id);
    onActiveViewChange?.(id);
  };
  const emit = useCallback(
    (update: (previous: ResolvedValue) => DataWorkbenchValue) => {
      const previous = current.current;
      const next = resolveValue(update(previous));
      const queryChanged =
        serializeDataTableQuery(previous.query) !==
        serializeDataTableQuery(next.query);
      if (
        !queryChanged &&
        JSON.stringify(previous.columns) === JSON.stringify(next.columns) &&
        previous.density === next.density
      )
        return;
      current.current = next;
      onValueChange(next);
      if (queryChanged) onQueryChange?.(next.query);
    },
    [onValueChange, onQueryChange],
  );
  const updateColumns = (
    update: (previous: DataTableColumnState) => DataTableColumnState,
  ) => emit((previous) => ({ ...previous, columns: update(previous.columns) }));
  const setFilter = (id: string, filter: DataFilter | undefined) =>
    emit((previous) => ({
      ...previous,
      query: {
        ...previous.query,
        filters: [
          ...previous.query.filters.filter((filter) => filter.id !== id),
          ...(filter ? [{ id, value: filter }] : []),
        ],
        pagination: { ...previous.query.pagination, pageIndex: 0 },
      },
    }));
  const configuredColumns = useMemo(() => {
    const fields = new Map(filterFields.map((field) => [field.id, field]));
    const configure = (definitions: ColumnDef<T>[]): ColumnDef<T>[] =>
      definitions.map((column) => {
        if ("columns" in column && column.columns)
          return { ...column, columns: configure(column.columns) };
        const id = columnId(column),
          field = id ? fields.get(id) : undefined;
        return field
          ? {
              ...column,
              filterFn: (row, columnId, filter) =>
                matchesDataFilter(
                  field.getValue
                    ? field.getValue(row.original)
                    : row.getValue(columnId),
                  filter,
                ),
            }
          : column;
      });
    return configure(columns);
  }, [columns, filterFields]);
  const leaves = useMemo(() => leafColumns(columns), [columns]);
  const orderedLeaves = useMemo(() => {
    const byId = new Map(leaves.map((column) => [column.id, column]));
    const ordered = resolved.columns.order.flatMap((id) =>
      byId.has(id) ? [byId.get(id)!] : [],
    );
    return [
      ...ordered,
      ...leaves.filter((column) => !resolved.columns.order.includes(column.id)),
    ];
  }, [leaves, resolved.columns.order]);
  const visibleAccessors = leaves.filter(
    (column) =>
      column.accessor && resolved.columns.visibility[column.id] !== false,
  ).length;
  const chipCount =
    resolved.query.filters.length + (resolved.query.search ? 1 : 0);
  const clearFilters = () =>
    emit((previous) => ({
      ...previous,
      query: {
        ...previous.query,
        search: "",
        filters: [],
        pagination: { ...previous.query.pagination, pageIndex: 0 },
      },
    }));
  const runAction = async (
    kind: "save" | "delete" | "share",
    action: () => void | Promise<void>,
  ) => {
    setPendingAction(kind);
    setActionError(undefined);
    try {
      await action();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : labels.actionError,
      );
    } finally {
      setPendingAction(undefined);
    }
  };
  const saveView = (asNew: boolean) => {
    if (!onSaveView || !viewName.trim()) return;
    void runAction("save", async () => {
      const next: DataWorkbenchSavedView = {
        id:
          !asNew && activeView
            ? activeView.id
            : (globalThis.crypto?.randomUUID?.() ?? `${id}-${Date.now()}`),
        name: viewName.trim(),
        value: resolveValue(current.current),
      };
      await onSaveView(next);
      setActiveView(next.id);
      setSaveOpen(false);
    });
  };
  return (
    <div
      data-slot="data-workbench"
      className={cn("min-w-0 space-y-3", className)}
    >
      <div
        role="group"
        aria-label={labels.toolbar}
        className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/55 p-3"
      >
        {(savedViews.length > 0 || onSaveView) && (
          <Select
            aria-label={labels.savedViews}
            className="w-full sm:w-48"
            options={[
              { value: "", label: labels.allRecords },
              ...savedViews.map((view) => ({
                value: view.id,
                label: view.name,
              })),
            ]}
            value={activeView?.id ?? ""}
            onValueChange={(id) => {
              const view = savedViews.find((view) => view.id === id);
              if (view) emit(() => view.value);
              setActiveView(view?.id);
            }}
          />
        )}
        {filterFields.length > 0 && (
          <Popover>
            <PopoverTrigger
              render={<Button type="button" variant="outline" size="sm" />}
            >
              <SlidersHorizontal aria-hidden="true" />
              {labels.filters}
              {resolved.query.filters.length > 0 && (
                <span className="rounded bg-accent px-1.5 text-accent-foreground tabular-nums">
                  {resolved.query.filters.length}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="max-h-[70dvh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto"
            >
              <PopoverTitle className="text-sm font-semibold">
                {labels.filters}
              </PopoverTitle>
              <PopoverDescription className="mt-1 text-xs leading-5 text-muted-foreground">
                {labels.filterDescription}
              </PopoverDescription>
              <div className="mt-4 grid gap-4">
                {filterFields.map((field) => (
                  <FilterControl
                    key={field.id}
                    field={field}
                    value={
                      resolved.query.filters.find(
                        (filter) => filter.id === field.id,
                      )?.value
                    }
                    labels={labels}
                    onChange={(value) => setFilter(field.id, value)}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-4"
                disabled={!chipCount}
                onClick={clearFilters}
              >
                {labels.clearFilters}
              </Button>
            </PopoverContent>
          </Popover>
        )}
        {columnConfig && (
          <Popover>
            <PopoverTrigger
              render={<Button type="button" variant="outline" size="sm" />}
            >
              <Columns3 aria-hidden="true" />
              {labels.columns}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="max-h-[min(70dvh,var(--available-height))] w-[min(40rem,calc(100vw-2rem))] overflow-y-auto"
            >
              <PopoverTitle className="text-sm font-semibold">
                {labels.columns}
              </PopoverTitle>
              <PopoverDescription className="mt-1 text-xs leading-5 text-muted-foreground">
                {labels.columnDescription}
              </PopoverDescription>
              <div className="mt-4 grid gap-3">
                {orderedLeaves.map((column, index) => {
                  const visible =
                    resolved.columns.visibility[column.id] !== false;
                  const hideDisabled =
                    column.definition.enableHiding === false ||
                    (visible && column.accessor && visibleAccessors <= 1);
                  const pinned = resolved.columns.pinning.left?.includes(
                    column.id,
                  )
                    ? "left"
                    : resolved.columns.pinning.right?.includes(column.id)
                      ? "right"
                      : "";
                  return (
                    <div
                      key={column.id}
                      className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_7rem_6rem]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Checkbox
                          checked={visible}
                          disabled={hideDisabled}
                          aria-label={`${labels.showColumn}: ${column.label}`}
                          onCheckedChange={(visible) =>
                            updateColumns((previous) => ({
                              ...previous,
                              visibility: {
                                ...previous.visibility,
                                [column.id]: visible,
                              },
                            }))
                          }
                        />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">
                          {column.label}
                        </span>
                        {[-1, 1].map((direction) => (
                          <Button
                            key={direction}
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={
                              direction < 0
                                ? index === 0
                                : index === orderedLeaves.length - 1
                            }
                            aria-label={`${direction < 0 ? labels.moveEarlier : labels.moveLater}: ${column.label}`}
                            onClick={() =>
                              updateColumns((previous) => {
                                const order = orderedLeaves.map(
                                  (column) => column.id,
                                );
                                [order[index], order[index + direction]] = [
                                  order[index + direction],
                                  order[index],
                                ];
                                return { ...previous, order };
                              })
                            }
                          >
                            {direction < 0 ? (
                              <ArrowUp aria-hidden="true" />
                            ) : (
                              <ArrowDown aria-hidden="true" />
                            )}
                          </Button>
                        ))}
                      </div>
                      <Select
                        aria-label={`${labels.pin}: ${column.label}`}
                        options={[
                          { value: "", label: labels.unpinned },
                          { value: "left", label: labels.pinLeft },
                          { value: "right", label: labels.pinRight },
                        ]}
                        value={pinned}
                        onValueChange={(side) =>
                          updateColumns((previous) => ({
                            ...previous,
                            pinning: {
                              left: [
                                ...(previous.pinning.left ?? []).filter(
                                  (id) => id !== column.id,
                                ),
                                ...(side === "left" ? [column.id] : []),
                              ],
                              right: [
                                ...(previous.pinning.right ?? []).filter(
                                  (id) => id !== column.id,
                                ),
                                ...(side === "right" ? [column.id] : []),
                              ],
                            },
                          }))
                        }
                      />
                      <Input
                        type="number"
                        min={column.definition.minSize ?? 20}
                        max={column.definition.maxSize}
                        step={1}
                        aria-label={`${labels.width}: ${column.label}`}
                        placeholder={String(column.definition.size ?? 150)}
                        value={resolved.columns.sizing[column.id] ?? ""}
                        onChange={(event) =>
                          updateColumns((previous) => {
                            const sizing = { ...previous.sizing };
                            const width =
                              event.target.value === ""
                                ? undefined
                                : Number(event.target.value);
                            if (width === undefined) delete sizing[column.id];
                            else if (Number.isFinite(width) && width > 0)
                              sizing[column.id] = width;
                            return { ...previous, sizing };
                          })
                        }
                        onBlur={(event) => {
                          if (!event.target.value) return;
                          const width = Math.min(
                            column.definition.maxSize ??
                              Number.MAX_SAFE_INTEGER,
                            Math.max(
                              column.definition.minSize ?? 20,
                              Number(event.target.value),
                            ),
                          );
                          updateColumns((previous) => ({
                            ...previous,
                            sizing: { ...previous.sizing, [column.id]: width },
                          }));
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <Select
          aria-label={labels.density}
          className="w-full sm:ml-auto sm:w-36"
          value={resolved.density}
          options={[
            { value: "comfortable", label: labels.comfortable },
            { value: "compact", label: labels.compact },
          ]}
          onValueChange={(density) =>
            emit((previous) => ({
              ...previous,
              density: density === "compact" ? "compact" : "comfortable",
            }))
          }
        />
        {onSaveView && (
          <Popover
            open={saveOpen}
            onOpenChange={(open) => {
              setSaveOpen(open);
              if (open) {
                setViewName(activeView?.name ?? "");
                setActionError(undefined);
              }
            }}
          >
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={Boolean(pendingAction)}
                />
              }
            >
              <Save aria-hidden="true" />
              {labels.saveView}
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[min(22rem,calc(100vw-2rem))]"
            >
              <PopoverTitle className="text-sm font-semibold">
                {labels.saveView}
              </PopoverTitle>
              <label className="mt-4 grid gap-2 text-xs font-medium">
                {labels.viewName}
                <Input
                  value={viewName}
                  onChange={(event) => setViewName(event.target.value)}
                  maxLength={100}
                />
              </label>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={Boolean(pendingAction)}
                  onClick={() => setSaveOpen(false)}
                >
                  {labels.cancel}
                </Button>
                {activeView && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!viewName.trim() || Boolean(pendingAction)}
                    onClick={() => saveView(true)}
                  >
                    {labels.saveNewView}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  loading={pendingAction === "save"}
                  disabled={!viewName.trim() || Boolean(pendingAction)}
                  onClick={() => saveView(false)}
                >
                  {labels.save}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
        {onDeleteView && activeView && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${labels.deleteView}: ${activeView.name}`}
            loading={pendingAction === "delete"}
            disabled={Boolean(pendingAction)}
            onClick={() => {
              void runAction("delete", async () => {
                await onDeleteView(activeView.id);
                setActiveView(undefined);
              });
            }}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        )}
        {onShareView && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={pendingAction === "share"}
            disabled={Boolean(pendingAction)}
            onClick={() => {
              void runAction("share", () =>
                onShareView(resolveValue(current.current), activeView),
              );
            }}
          >
            <Share2 aria-hidden="true" />
            {labels.shareView}
          </Button>
        )}
      </div>
      {actionError && (
        <Alert variant="destructive" title={labels.actionError}>
          {actionError}
        </Alert>
      )}
      {chipCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <ul
            aria-label={labels.activeFilters}
            className="flex min-w-0 flex-wrap gap-2"
          >
            {[
              ...(resolved.query.search
                ? [
                    {
                      id: "search",
                      label: `${labels.search}: ${resolved.query.search}`,
                      filterId: undefined,
                    },
                  ]
                : []),
              ...resolved.query.filters.map((filter) => {
                const field = filterFields.find(
                  (field) => field.id === filter.id,
                );
                const label =
                  field?.label ??
                  leaves.find((column) => column.id === filter.id)?.label ??
                  filter.id;
                return {
                  id: `filter:${filter.id}`,
                  label: `${label}: ${filterLabel(filter.value, field, labels)}`,
                  filterId: filter.id,
                };
              }),
            ].map((chip) => (
              <li
                key={chip.id}
                className="flex min-w-0 max-w-full items-center gap-1 rounded-full border border-border bg-accent/55 py-1 pr-1 pl-3 text-xs"
              >
                <span className="truncate text-foreground">{chip.label}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="size-7 shrink-0 rounded-full"
                  aria-label={`${labels.removeFilter}: ${chip.label}`}
                  onClick={() => {
                    if (chip.filterId !== undefined) {
                      setFilter(chip.filterId, undefined);
                    } else {
                      emit((previous) => ({
                        ...previous,
                        query: {
                          ...previous.query,
                          search: "",
                          pagination: {
                            ...previous.query.pagination,
                            pageIndex: 0,
                          },
                        },
                      }));
                    }
                  }}
                >
                  <X aria-hidden="true" className="size-3" />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            {labels.clearFilters}
          </Button>
        </div>
      )}
      <DataTable
        {...tableProps}
        columns={configuredColumns}
        query={resolved.query}
        onQueryChange={(query) => emit((previous) => ({ ...previous, query }))}
        columnState={resolved.columns}
        onColumnStateChange={(columns) =>
          emit((previous) => ({ ...previous, columns }))
        }
        density={resolved.density}
        labels={tableLabels}
      />
    </div>
  );
}
