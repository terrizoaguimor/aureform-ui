"use client";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Column,
  type Row,
  type SortingState,
  type RowSelectionState,
  type Updater,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Columns3,
  Search,
  X,
} from "lucide-react";
import { TableToolbar } from "@/components/blocks/table-toolbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableFooter,
  type TableAppearance,
  type TableDensity,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Empty } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  matchesDataFilter,
  normalizeDataTableColumnState,
  normalizeDataTableQuery,
  serializeDataTableQuery,
  type DataTableColumnState,
  type DataTableQuery,
} from "@/lib/data-query";

export type { DataTableColumnState, DataTableQuery } from "@/lib/data-query";

function updateValue<Value>(updater: Updater<Value>, previous: Value): Value {
  return typeof updater === "function"
    ? (updater as (value: Value) => Value)(previous)
    : updater;
}

function columnFilter<T>(row: Row<T>, columnId: string, value: unknown) {
  return matchesDataFilter(row.getValue(columnId), value);
}

export type DataTableLabels = {
  search: string;
  empty: string;
  emptyDescription: string;
  previous: string;
  next: string;
  selectAll: string;
  selectRow: string;
  selected: string;
  page: string;
  of: string;
  rows: string;
  clear: string;
  error: string;
  retry: string;
  loading: string;
  columns?: string;
  clearSelection?: string;
  rowsPerPage?: string;
};
export const defaultTableLabels: Required<DataTableLabels> = {
  search: "Search records…",
  empty: "No records found",
  emptyDescription: "Try another search or clear the filters.",
  previous: "Previous page",
  next: "Next page",
  selectAll: "Select this page",
  selectRow: "Select row",
  selected: "selected",
  page: "Page",
  of: "of",
  rows: "rows",
  clear: "Clear search",
  error: "Could not load records",
  retry: "Try again",
  loading: "Loading records",
  columns: "Columns",
  clearSelection: "Clear selection",
  rowsPerPage: "Rows per page",
};
export type DataTableColumnMeta = {
  align?: "left" | "center" | "right";
  numeric?: boolean;
  label?: string;
};
export type DataTableModeProps =
  | { mode?: "client"; rowCount?: number }
  | { mode: "external"; rowCount: number };

export type DataTableProps<T extends { id: string }> = DataTableModeProps & {
  data: T[];
  columns: ColumnDef<T>[];
  labels?: Partial<DataTableLabels>;
  pageSize?: number;
  selectable?: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  toolbar?: ReactNode;
  onSelectionChange?: (rows: T[]) => void;
  selectedAction?: (rows: T[], clear: () => void) => ReactNode;
  className?: string;
  search?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  caption?: ReactNode;
  appearance?: TableAppearance;
  density?: TableDensity;
  striped?: boolean;
  columnVisibility?: boolean;
  pageSizeOptions?: readonly number[];
  query?: DataTableQuery;
  onQueryChange?: (query: DataTableQuery) => void;
  /** Stable IDs may include rows on pages that are not currently loaded. */
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  onSelectedIdsChange?: (ids: string[]) => void;
  columnState?: Partial<DataTableColumnState>;
  onColumnStateChange?: (state: DataTableColumnState) => void;
};
export function DataTable<T extends { id: string }>({
  data,
  columns,
  labels: overrides,
  pageSize = 5,
  selectable = true,
  loading,
  error,
  onRetry,
  toolbar,
  selectedAction,
  onSelectionChange,
  className,
  search = true,
  title,
  description,
  caption,
  appearance,
  density = "comfortable",
  striped = false,
  columnVisibility = false,
  pageSizeOptions,
  mode = "client",
  rowCount,
  query: controlledQuery,
  onQueryChange,
  rowSelection: controlledSelection,
  onRowSelectionChange,
  onSelectedIdsChange,
  columnState: controlledColumns,
  onColumnStateChange,
}: DataTableProps<T>) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const captionId = `${id}-caption`;
  const labels = useMemo(
    () => ({ ...defaultTableLabels, ...overrides }),
    [overrides],
  );
  const initialPageSize = Number.isFinite(pageSize)
    ? Math.max(1, Math.trunc(pageSize))
    : 5;
  const external = mode === "external";
  const totalRows = Number.isFinite(rowCount)
    ? Math.max(0, Math.trunc(rowCount!))
    : data.length;
  const queryControlled = controlledQuery !== undefined;
  const selectionControlled = controlledSelection !== undefined;
  const [internalQuery, setInternalQuery] = useState(() =>
    normalizeDataTableQuery({}, { pageSize: initialPageSize }),
  );
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>(
    {},
  );
  const [internalColumns, setInternalColumns] = useState(() =>
    normalizeDataTableColumnState(),
  );
  const query = useMemo(
    () =>
      normalizeDataTableQuery(controlledQuery ?? internalQuery, {
        pageSize: initialPageSize,
      }),
    [controlledQuery, internalQuery, initialPageSize],
  );
  const columnState = useMemo(
    () =>
      normalizeDataTableColumnState({
        ...internalColumns,
        ...controlledColumns,
      }),
    [internalColumns, controlledColumns],
  );
  const rowSelection = controlledSelection ?? internalSelection;
  const current = useRef({ query, columnState, rowSelection });
  useLayoutEffect(() => {
    current.current = { query, columnState, rowSelection };
  });
  const changeQuery = useCallback(
    (update: (previous: DataTableQuery) => DataTableQuery) => {
      const previous = current.current.query;
      const next = normalizeDataTableQuery(update(previous));
      // TanStack may request an automatic page reset that is already satisfied.
      // Keeping that a no-op avoids a new query/model cycle on every render.
      if (serializeDataTableQuery(next) === serializeDataTableQuery(previous))
        return;
      current.current.query = next;
      if (!queryControlled) setInternalQuery(next);
      onQueryChange?.(next);
    },
    [onQueryChange, queryControlled],
  );
  const changeColumns = useCallback(
    (update: (previous: DataTableColumnState) => DataTableColumnState) => {
      const next = normalizeDataTableColumnState(
        update(current.current.columnState),
      );
      if (JSON.stringify(next) === JSON.stringify(current.current.columnState))
        return;
      current.current.columnState = next;
      setInternalColumns(next);
      onColumnStateChange?.(next);
    },
    [onColumnStateChange],
  );
  const changeSelection = useCallback(
    (updater: Updater<RowSelectionState>) => {
      const next = { ...updateValue(updater, current.current.rowSelection) };
      current.current.rowSelection = next;
      if (!selectionControlled) setInternalSelection(next);
      onRowSelectionChange?.(next);
      onSelectedIdsChange?.(Object.keys(next).filter((id) => next[id]));
      // This legacy callback deliberately reports only known, loaded records.
      onSelectionChange?.(data.filter((row) => next[row.id]));
    },
    [
      data,
      onRowSelectionChange,
      onSelectedIdsChange,
      onSelectionChange,
      selectionControlled,
    ],
  );
  const selectionColumn = useMemo<ColumnDef<T>>(
    () => ({
      id: "select",
      size: 48,
      minSize: 48,
      maxSize: 48,
      enableSorting: false,
      enableGlobalFilter: false,
      enableColumnFilter: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          className="size-5 border-muted-foreground/70"
          aria-label={labels.selectAll}
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          className="size-5 border-muted-foreground/70"
          aria-label={`${labels.selectRow} ${row.original.id}`}
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(v)}
        />
      ),
    }),
    [labels.selectAll, labels.selectRow],
  );
  const tableColumns = useMemo(
    () => (selectable ? [selectionColumn, ...columns] : columns),
    [selectable, selectionColumn, columns],
  );
  const rowModels = useMemo(
    () => ({
      core: getCoreRowModel<T>(),
      filtered: getFilteredRowModel<T>(),
      sorted: getSortedRowModel<T>(),
      pagination: getPaginationRowModel<T>(),
    }),
    [],
  );
  const defaultColumn = useMemo(() => ({ filterFn: columnFilter<T> }), []);
  const columnOrder = useMemo(
    () =>
      selectable
        ? ["select", ...columnState.order.filter((id) => id !== "select")]
        : columnState.order,
    [selectable, columnState.order],
  );
  const columnPinning = useMemo(
    () => ({
      left:
        selectable && columnState.pinning.left?.length
          ? [
              "select",
              ...columnState.pinning.left.filter((id) => id !== "select"),
            ]
          : columnState.pinning.left,
      right: columnState.pinning.right?.filter((id) => id !== "select"),
    }),
    [selectable, columnState.pinning],
  );
  const table = useReactTable({
    data,
    columns: tableColumns,
    defaultColumn,
    state: {
      sorting: query.sorting,
      globalFilter: query.search,
      columnFilters: query.filters,
      pagination: query.pagination,
      rowSelection,
      columnVisibility: columnState.visibility,
      columnOrder,
      columnSizing: columnState.sizing,
      columnPinning,
    },
    onSortingChange: (updater: Updater<SortingState>) =>
      changeQuery((previous) => ({
        ...previous,
        sorting: updateValue(updater, previous.sorting),
        pagination: { ...previous.pagination, pageIndex: 0 },
      })),
    onGlobalFilterChange: (updater) =>
      changeQuery((previous) => ({
        ...previous,
        search: updateValue(updater, previous.search),
        pagination: { ...previous.pagination, pageIndex: 0 },
      })),
    onColumnFiltersChange: (updater) =>
      changeQuery((previous) => ({
        ...previous,
        filters: updateValue(updater, previous.filters),
        pagination: { ...previous.pagination, pageIndex: 0 },
      })),
    onPaginationChange: (updater) =>
      changeQuery((previous) => ({
        ...previous,
        pagination: updateValue(updater, previous.pagination),
      })),
    onColumnVisibilityChange: (updater) =>
      changeColumns((previous) => ({
        ...previous,
        visibility: updateValue(updater, previous.visibility),
      })),
    onColumnOrderChange: (updater) =>
      changeColumns((previous) => ({
        ...previous,
        order: updateValue(updater, previous.order).filter(
          (id) => id !== "select",
        ),
      })),
    onColumnSizingChange: (updater) =>
      changeColumns((previous) => ({
        ...previous,
        sizing: updateValue(updater, previous.sizing),
      })),
    onColumnPinningChange: (updater) =>
      changeColumns((previous) => ({
        ...previous,
        pinning: updateValue(updater, previous.pinning),
      })),
    onRowSelectionChange: changeSelection,
    getRowId: (row) => row.id,
    getCoreRowModel: rowModels.core,
    getSortedRowModel: external ? undefined : rowModels.sorted,
    getFilteredRowModel: external ? undefined : rowModels.filtered,
    getPaginationRowModel: external ? undefined : rowModels.pagination,
    manualFiltering: external,
    manualSorting: external,
    manualPagination: external,
    rowCount: external ? totalRows : undefined,
    enableRowSelection: selectable,
    enableHiding: columnVisibility,
  });
  useEffect(() => {
    if (
      !queryControlled &&
      table.getState().pagination.pageSize !== initialPageSize
    ) {
      table.setPageSize(initialPageSize);
    }
  }, [initialPageSize, queryControlled, table]);
  const selected = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original);
  const selectedCount = external
    ? Object.values(rowSelection).filter(Boolean).length
    : selected.length;
  const filteredCount = external
    ? totalRows
    : table.getFilteredRowModel().rows.length;
  const pagination = table.getState().pagination;
  const pageCount = Math.max(1, table.getPageCount());
  const pageIndex = external
    ? pagination.pageIndex
    : Math.min(pagination.pageIndex, pageCount - 1);
  const firstRecord =
    filteredCount && (!external || data.length)
      ? pageIndex * pagination.pageSize + 1
      : 0;
  const lastRecord =
    external && !data.length
      ? 0
      : Math.min(
          pageIndex * pagination.pageSize +
            (external ? data.length : pagination.pageSize),
          filteredCount,
        );
  const hasColumnLayout =
    Object.keys(columnState.sizing).length > 0 ||
    Boolean(
      columnState.pinning.left?.length || columnState.pinning.right?.length,
    );
  const columnStyle = (
    column: Column<T>,
    selected = false,
  ): CSSProperties | undefined => {
    if (!hasColumnLayout) return undefined;
    const pinned = column.getIsPinned();
    return {
      width: column.getSize(),
      minWidth: column.getSize(),
      position: pinned ? "sticky" : undefined,
      left: pinned === "left" ? column.getStart("left") : undefined,
      right: pinned === "right" ? column.getAfter("right") : undefined,
      background: pinned
        ? selected
          ? "color-mix(in oklab, var(--accent) 70%, var(--surface))"
          : "var(--surface)"
        : undefined,
      zIndex: pinned ? 2 : undefined,
    };
  };
  const visibleColumns = table.getVisibleLeafColumns();
  const dataColumns = visibleColumns.filter((column) => column.id !== "select");
  const visibleAccessorCount = dataColumns.filter(
    (column) => column.accessorFn,
  ).length;
  const primaryColumn =
    dataColumns.find((column) => column.accessorFn)?.id ?? dataColumns[0]?.id;
  const presentation = new Map(
    table.getAllLeafColumns().map((column) => {
      const meta = column.columnDef.meta as DataTableColumnMeta | undefined;
      const firstValue = column.accessorFn
        ? table
            .getCoreRowModel()
            .flatRows.find((row) => row.getValue(column.id) != null)
            ?.getValue(column.id)
        : undefined;
      const numeric = meta?.numeric ?? typeof firstValue === "number";
      return [
        column.id,
        {
          numeric,
          align:
            meta?.align ??
            (numeric || column.id === "actions" ? "right" : "left"),
          label:
            meta?.label ??
            (typeof column.columnDef.header === "string" &&
            column.columnDef.header.trim()
              ? column.columnDef.header
              : column.id),
        },
      ] as const;
    }),
  );
  const alignment = (columnId: string) => {
    const value = presentation.get(columnId);
    return cn(
      value?.align === "right" && "text-right",
      value?.align === "center" && "text-center",
      value?.numeric && "whitespace-nowrap tabular-nums",
    );
  };
  const footerGroups = table
    .getFooterGroups()
    .filter((group) =>
      group.headers.some(
        (header) => !header.isPlaceholder && header.column.columnDef.footer,
      ),
    );
  const pageStart = Math.min(
    Math.max(0, pageIndex - 2),
    Math.max(0, pageCount - 5),
  );
  const pages = Array.from(
    { length: Math.min(5, pageCount) },
    (_, index) => pageStart + index,
  );
  const pageSizes = [
    ...new Set(
      [initialPageSize, pagination.pageSize, ...(pageSizeOptions ?? [])]
        .filter((size) => Number.isFinite(size) && size >= 1)
        .map(Math.trunc),
    ),
  ].sort((a, b) => a - b);
  const clearSelection = () => table.resetRowSelection();
  if (error)
    return (
      <Alert variant="destructive" title={labels.error}>
        {error}
        {onRetry && (
          <Button
            type="button"
            className="mt-3"
            variant="outline"
            size="sm"
            onClick={onRetry}
          >
            {labels.retry}
          </Button>
        )}
      </Alert>
    );
  return (
    <div
      data-slot="data-table"
      data-mode={mode}
      data-appearance={appearance}
      data-density={density}
      aria-busy={loading || undefined}
      className={cn(
        "af-card af-shadow-soft min-w-0 overflow-hidden rounded-[var(--af-radius,16px)] border border-border text-foreground",
        appearance && `af-card-${appearance}`,
        className,
      )}
    >
      {(title ||
        description ||
        search ||
        toolbar ||
        columnVisibility ||
        selectedCount > 0) && (
        <TableToolbar
          title={title}
          titleId={titleId}
          description={description}
          descriptionId={descriptionId}
          count={
            <>
              {filteredCount} {labels.rows}
            </>
          }
          search={
            search ? (
              <div className="relative w-full sm:w-72 sm:max-w-full">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label={labels.search}
                  placeholder={labels.search}
                  value={query.search}
                  className="h-10 pr-10 pl-10"
                  onChange={(e) => table.setGlobalFilter(e.target.value)}
                />
                {query.search && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1 right-1"
                    aria-label={labels.clear}
                    onClick={() => table.setGlobalFilter("")}
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </div>
            ) : undefined
          }
          actions={
            <>
              {columnVisibility && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button type="button" variant="outline" size="sm" />
                    }
                  >
                    <Columns3 aria-hidden="true" />
                    {labels.columns}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{labels.columns}</DropdownMenuLabel>
                      {table
                        .getAllLeafColumns()
                        .filter((column) => column.getCanHide())
                        .map((column) => (
                          <MenuPrimitive.CheckboxItem
                            key={column.id}
                            checked={column.getIsVisible()}
                            disabled={
                              column.getIsVisible() &&
                              (column.accessorFn
                                ? visibleAccessorCount <= 1
                                : dataColumns.length <= 1)
                            }
                            onCheckedChange={(checked) =>
                              column.toggleVisibility(checked)
                            }
                            className="flex min-h-9 items-center gap-2.5 rounded-md px-3 py-2 text-[13px] outline-none data-highlighted:bg-surface-subtle data-disabled:opacity-50"
                          >
                            <span
                              aria-hidden="true"
                              className="flex size-4 items-center justify-center"
                            >
                              <MenuPrimitive.CheckboxItemIndicator>
                                <Check className="size-3.5" />
                              </MenuPrimitive.CheckboxItemIndicator>
                            </span>
                            {presentation.get(column.id)?.label}
                          </MenuPrimitive.CheckboxItem>
                        ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {toolbar}
            </>
          }
          selection={
            selectedCount ? (
              <>
                <span
                  role="status"
                  className="text-[13px] font-semibold tabular-nums"
                >
                  {selectedCount} {labels.selected}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedAction?.(selected, clearSelection)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={labels.clearSelection}
                    onClick={clearSelection}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              </>
            ) : undefined
          }
        />
      )}
      {loading ? (
        <div
          role="status"
          aria-label={labels.loading}
          aria-busy="true"
          className="grid gap-5 p-6"
        >
          <span className="sr-only">{labels.loading}</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-8 w-full" />
          ))}
        </div>
      ) : (
        <Table
          density={density}
          striped={striped}
          style={
            hasColumnLayout
              ? { tableLayout: "fixed", width: table.getTotalSize() }
              : undefined
          }
          aria-labelledby={captionId}
          aria-describedby={description ? descriptionId : undefined}
        >
          <TableCaption id={captionId} className="sr-only">
            {caption ?? title ?? labels.rows}
          </TableCaption>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    scope={header.colSpan > 1 ? "colgroup" : "col"}
                    style={columnStyle(header.column)}
                    className={cn(
                      alignment(header.column.id),
                      header.column.id === "select" && "w-12 pr-0 sm:w-14",
                    )}
                    aria-sort={
                      header.column.getCanSort()
                        ? header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : "none"
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className={cn(
                          "-ml-1.5 inline-flex min-h-8 items-center gap-2 rounded-md px-1.5 text-left outline-none hover:text-foreground focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-ring",
                          presentation.get(header.column.id)?.align ===
                            "right" && "-mr-1.5 ml-auto",
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc" ? (
                          <ArrowUp
                            aria-hidden="true"
                            className="size-3.5 text-foreground"
                          />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ArrowDown
                            aria-hidden="true"
                            className="size-3.5 text-foreground"
                          />
                        ) : (
                          <ArrowUpDown
                            aria-hidden="true"
                            className="size-3.5"
                          />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-selected={row.getIsSelected() || undefined}
                aria-selected={selectable ? row.getIsSelected() : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    style={columnStyle(cell.column, row.getIsSelected())}
                    className={cn(
                      alignment(cell.column.id),
                      cell.column.id === "select" && "pr-0",
                      cell.column.id === primaryColumn && "font-medium",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {!table.getRowModel().rows.length && (
              <TableRow>
                <TableCell colSpan={Math.max(1, visibleColumns.length)}>
                  <Empty
                    title={labels.empty}
                    description={labels.emptyDescription}
                    action={
                      query.search ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => table.setGlobalFilter("")}
                        >
                          {labels.clear}
                        </Button>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {footerGroups.length > 0 && table.getRowModel().rows.length > 0 && (
            <TableFooter>
              {footerGroups.map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => (
                    <TableCell
                      key={header.id}
                      colSpan={header.colSpan}
                      style={columnStyle(header.column)}
                      className={cn(
                        alignment(header.column.id),
                        header.column.id === "select" && "pr-0",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.footer,
                            header.getContext(),
                          )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableFooter>
          )}
        </Table>
      )}
      <div
        data-slot="data-table-pagination"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3.5 text-xs text-muted-foreground sm:px-6"
      >
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums"
        >
          <span>
            <span className="font-medium text-foreground">
              {firstRecord}–{lastRecord}
            </span>{" "}
            {labels.of} {filteredCount} {labels.rows}
          </span>
          <span>
            {labels.page} {pageIndex + 1} {labels.of} {pageCount}
          </span>
        </div>
        {pageSizeOptions && pageSizes.length > 1 && (
          <label className="flex items-center gap-2">
            {labels.rowsPerPage}
            <select
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={pagination.pageSize}
              onChange={(event) =>
                table.setPageSize(Number(event.target.value))
              }
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        <nav aria-label={labels.page} className="flex items-center gap-1.5">
          <Button
            type="button"
            aria-label={labels.previous}
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <div className="hidden items-center gap-1 sm:flex">
            {pages.map((index) => (
              <Button
                key={index}
                type="button"
                variant={index === pageIndex ? "secondary" : "ghost"}
                size="icon-sm"
                className="text-xs tabular-nums"
                aria-label={`${labels.page} ${index + 1}`}
                aria-current={index === pageIndex ? "page" : undefined}
                onClick={() => table.setPageIndex(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            aria-label={labels.next}
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      </div>
    </div>
  );
}
