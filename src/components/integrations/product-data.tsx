"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { Pencil, RefreshCw, Save } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useIntegrationOperation } from "@/hooks/use-integration-operation";
import { DataTable, type DataTableQuery } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { parseIntegrationUpdate } from "@/lib/integrations/validation";
import type {
  IntegrationRecord,
  IntegrationUpdate,
  IntegrationValues,
  IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import {
  findProductAction,
  invalidProductField,
  optimisticProductRecord,
  parseProductFields,
  productActionValues,
  productQueryValues,
  rollbackProductRecord,
} from "./product-model";
import {
  ProductActionUnavailable,
  ProductDate,
  ProductDocumentPreview,
  ProductFields,
  ProductLabeledTextarea,
  ProductOperationFeedback,
  ProductPanel,
  ProductResourcePicker,
  ProductResult,
  ProductReview,
  ProductStatus,
  ProductValidation,
  useProductResources,
} from "./product-ui";
import {
  createProductDataEpoch,
  productDataUpdate,
  productReportedDataPage,
} from "./product-data-reactivity";
import { startProductSubscription } from "./product-subscription";

const initialQuery: DataTableQuery = {
  search: "",
  filters: [],
  sorting: [],
  pagination: { pageIndex: 0, pageSize: 10 },
};

export type ProductDataSubscription = {
  integrationId: string;
  connectionId: string;
  workspaceId: string;
  resourceId: string;
  actionId: string;
  query: DataTableQuery;
  values: IntegrationValues;
  querySignature: string;
  signal: AbortSignal;
  /** Complete, server-filtered and server-paginated page for this subscription. */
  onUpdate: (update: IntegrationUpdate) => void;
  onError: () => void;
};

export type ProductDataSubscribe = (
  subscription: ProductDataSubscription,
) => (() => void) | Promise<() => void>;

export function ProductDataWorkbench(
  props: IntegrationWorkbenchProps & { subscribeData?: ProductDataSubscribe },
) {
  const { l } = useLanguage();
  const { adapter, connection, definition, subscribeData } = props;
  const { workspaceId, signal: scopeSignal } = props.scope;
  const read = useIntegrationOperation(props);
  const write = useIntegrationOperation(props);
  const readRun = read.run;
  const readCancel = read.cancel;
  const writeCancel = write.cancel;
  const writeReset = write.reset;
  const resources = useProductResources(props);
  const queryAction = findProductAction(props.definition, "query");
  const saveAction = findProductAction(
    props.definition,
    "save-record",
    "update-record",
  );
  const canSave = Boolean(saveAction);
  const [resourceId, setResourceId] = useState(
    props.connection.resourceIds[0] ?? "",
  );
  const [query, setQuery] = useState<DataTableQuery>(initialQuery);
  const [readValues, setReadValues] = useState<IntegrationValues>({});
  const [records, setRecords] = useState<IntegrationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [base, setBase] = useState<IntegrationRecord | null>(null);
  const [draft, setDraft] = useState<IntegrationValues>({});
  const [fieldsText, setFieldsText] = useState("{}");
  const [review, setReview] = useState<IntegrationValues | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [reactive, setReactive] = useState(
    Boolean(props.subscribeData || props.adapter.subscribe),
  );
  const [reactiveRetry, setReactiveRetry] = useState(0);
  const [reactiveError, setReactiveError] = useState(false);
  const [reactiveAt, setReactiveAt] = useState<string | null>(null);
  const [scopeStale, setScopeStale] = useState(false);
  const [dataEpoch] = useState(createProductDataEpoch);
  const queryIdentity = JSON.stringify([query, readValues]);
  const subscriptionDispose = useRef<(() => void) | null>(null);
  const stopReactive = useCallback(() => {
    subscriptionDispose.current?.();
    subscriptionDispose.current = null;
  }, []);
  const allowed = props.connection.resourceIds.includes(resourceId);
  const cursorPages = useRef<{ key: string; pages: Record<number, string> }>({
    key: "",
    pages: {},
  });
  const mutationSequence = useRef(0);
  const statusField = saveAction?.fields.find((field) => field.id === "status");

  const load = useCallback(async () => {
    if (!queryAction || !allowed || scopeStale) return;
    const epoch = dataEpoch.capture();
    const cursorKey = JSON.stringify([
      resourceId,
      readValues,
      query.search,
      query.filters,
      query.sorting,
      query.pagination.pageSize,
    ]);
    if (cursorPages.current.key !== cursorKey)
      cursorPages.current = { key: cursorKey, pages: {} };
    const values = productActionValues(
      queryAction,
      {
        ...readValues,
        ...productQueryValues(query, resourceId),
        cursor:
          cursorPages.current.pages[query.pagination.pageIndex] ??
          readValues.cursor ??
          "",
      },
      resourceId,
    );
    if (invalidProductField(queryAction, values)) return;
    const result = await readRun(queryAction, values);
    if (!dataEpoch.isCurrent(epoch)) return;
    if (result?.kind === "records") {
      if (result.cursor)
        cursorPages.current.pages[query.pagination.pageIndex + 1] =
          result.cursor;
      setRecords(result.records);
      setTotal(result.total);
      setLoaded(true);
    } else if (result?.kind === "record") {
      setRecords([result.record]);
      setTotal(1);
      setLoaded(true);
    }
  }, [
    queryAction,
    allowed,
    scopeStale,
    dataEpoch,
    readValues,
    query,
    resourceId,
    readRun,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => {
      clearTimeout(timer);
      readCancel();
    };
  }, [load, refresh, readCancel]);

  useEffect(() => {
    if (
      (!subscribeData && !adapter.subscribe) ||
      !reactive ||
      !allowed ||
      scopeStale ||
      !queryAction ||
      queryAction.requiredPermissions?.some(
        (permission) => !connection.grantedPermissions.includes(permission),
      )
    )
      return;
    const streamValues = productActionValues(
      queryAction,
      {
        ...readValues,
        ...productQueryValues(query, resourceId),
        cursor:
          cursorPages.current.pages[query.pagination.pageIndex] ??
          readValues.cursor ??
          "",
      },
      resourceId,
    );
    if (invalidProductField(queryAction, streamValues)) return;
    const seen = new Set<string>();
    setReactiveError(false);
    setReactiveAt(null);
    const dispose = startProductSubscription(
      (listener, signal) =>
        subscribeData
          ? subscribeData({
              integrationId: definition.id,
              connectionId: connection.id,
              workspaceId,
              resourceId,
              actionId: queryAction.id,
              query: structuredClone(query),
              values: structuredClone(streamValues),
              querySignature: JSON.stringify([
                definition.id,
                connection.id,
                connection.revision,
                connection.providerOptionId,
                workspaceId,
                [...connection.resourceIds].sort(),
                [...connection.grantedPermissions].sort(),
                resourceId,
                queryAction.id,
                queryIdentity,
                streamValues,
              ]),
              signal,
              onUpdate: listener,
              onError: () => {
                if (!signal.aborted) setReactiveError(true);
              },
            })
          : adapter.subscribe!(connection.id, listener, {
              workspaceId,
              signal,
            }),
      {
        signal: scopeSignal,
        onUpdate: (raw) => {
          let update;
          try {
            update = parseIntegrationUpdate(raw, definition, connection.id, {
              workspaceId,
              signal: scopeSignal,
            });
          } catch {
            setReactiveError(true);
            return;
          }
          const change = productDataUpdate(update, connection, resourceId);
          if (change.kind === "ignore") return;
          if (change.kind === "scope-changed") {
            dataEpoch.invalidate();
            readCancel();
            writeCancel();
            setScopeStale(true);
            setRecords([]);
            setTotal(0);
            setBase(null);
            setReview(null);
            setSelection({});
            return;
          }
          const signature = JSON.stringify(update);
          if (seen.has(signature)) return;
          const page =
            subscribeData &&
            update.kind === "result" &&
            update.result.kind === "records"
              ? productReportedDataPage(
                  update.result,
                  connection,
                  resourceId,
                  query,
                )
              : undefined;
          if (
            subscribeData &&
            update.kind === "result" &&
            update.result.kind === "records" &&
            !page
          ) {
            setReactiveError(true);
            return;
          }
          seen.add(signature);
          if (seen.size > 128) seen.delete(seen.values().next().value!);
          dataEpoch.invalidate();
          readCancel();
          if (page) {
            setRecords(page.records);
            setTotal(page.total);
            setLoaded(true);
            if (page.cursor)
              cursorPages.current.pages[query.pagination.pageIndex + 1] =
                page.cursor;
          } else {
            // Connection-wide events carry no query identity. They invalidate
            // this query and never patch a different filter, sort or page.
            setRefresh((value) => value + 1);
          }
          setReactiveAt(new Date().toISOString());
          setReactiveError(false);
        },
        onError: () => setReactiveError(true),
      },
    );
    subscriptionDispose.current = dispose;
    return () => {
      dispose();
      if (subscriptionDispose.current === dispose)
        subscriptionDispose.current = null;
    };
  }, [
    adapter,
    subscribeData,
    connection,
    definition,
    workspaceId,
    scopeSignal,
    resourceId,
    queryIdentity,
    query,
    readValues,
    queryAction,
    reactive,
    reactiveRetry,
    allowed,
    scopeStale,
    dataEpoch,
    readCancel,
    writeCancel,
  ]);

  const edit = useCallback(
    (record: IntegrationRecord) => {
      setBase(record);
      setDraft({
        name: record.name,
        status: record.status,
        description: record.description,
      });
      setFieldsText(JSON.stringify(record.fields ?? {}, null, 2));
      setSelection({ [record.id]: true });
      setReview(null);
      writeReset();
    },
    [writeReset, setBase, setDraft, setFieldsText, setSelection, setReview],
  );

  const columns = useMemo<ColumnDef<IntegrationRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: l("Record", "Registro"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {row.original.id}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: l("Status", "Estado"),
        cell: ({ row }) => (
          <ProductStatus
            value={
              row.original.updatedAt.startsWith("pending:")
                ? "pending"
                : row.original.status
            }
          />
        ),
      },
      { accessorKey: "type", header: l("Type", "Tipo") },
      {
        accessorKey: "updatedAt",
        header: l("Updated", "Actualizado"),
        cell: ({ row }) => <ProductDate value={row.original.updatedAt} />,
      },
      {
        id: "edit",
        header: l("Actions", "Acciones"),
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            disabled={write.pending || !canSave}
            onClick={() => edit(row.original)}
            aria-label={`${l("Edit", "Editar")} ${row.original.name}`}
          >
            <Pencil />
            {l("Edit", "Editar")}
          </Button>
        ),
      },
    ],
    [l, canSave, write.pending, edit],
  );

  const parsed = parseProductFields(fieldsText);
  const prepared = productActionValues(
    saveAction,
    {
      ...draft,
      ...(base
        ? {
            id: base.id,
            recordId: base.id,
            expectedUpdatedAt: base.updatedAt,
            ...(base.fields?.revision !== undefined
              ? { revision: base.fields.revision }
              : {}),
          }
        : {}),
      fields: fieldsText,
    },
    resourceId,
  );
  const invalid = invalidProductField(saveAction, prepared);
  const latest = base
    ? records.find((record) => record.id === base.id)
    : undefined;
  const conflict = write.errorCode === "conflict";

  async function save() {
    if (
      !saveAction ||
      !base ||
      !review ||
      !parsed.ok ||
      write.pending ||
      scopeStale
    )
      return;
    const original = base;
    const marker = `pending:${props.connection.id}:${props.connection.revision}:${original.id}:${++mutationSequence.current}`;
    const optimistic = optimisticProductRecord(original, review, marker);
    setRecords((items) =>
      items.map((item) => (item.id === original.id ? optimistic : item)),
    );
    const result = await write.run(saveAction, review);
    if (result?.kind === "record" && result.record.id === original.id) {
      setRecords((items) =>
        items.map((item) => (item.id === original.id ? result.record : item)),
      );
      setBase(result.record);
      setDraft({
        name: result.record.name,
        status: result.record.status,
        description: result.record.description,
      });
      setFieldsText(JSON.stringify(result.record.fields ?? {}, null, 2));
      setReview(null);
      setRefresh((value) => value + 1);
    } else {
      setRecords((items) => rollbackProductRecord(items, original, marker));
      if (result) setReview(null);
    }
  }

  return (
    <div className="space-y-5">
      <ProductPanel
        title={l("Explore your data", "Explora tus datos")}
        description={l(
          "Search, filters, sorting and pages are applied by your connected data source.",
          "La fuente conectada aplica la búsqueda, los filtros, el orden y las páginas.",
        )}
      >
        {(props.subscribeData || props.adapter.subscribe) && (
          <div className="mb-4 space-y-3 rounded-xl border border-border bg-surface-subtle/40 p-3">
            <label className="flex min-h-11 items-center gap-3 text-xs">
              <Checkbox
                checked={reactive}
                onCheckedChange={(value) => {
                  if (!value) stopReactive();
                  setReactive(value);
                }}
                disabled={scopeStale}
              />
              {l("Follow reactive data", "Seguir datos reactivos")}
            </label>
            <p
              role="status"
              className="text-xs leading-6 text-muted-foreground"
            >
              {!reactive ? (
                l(
                  "Live updates paused. You can still refresh records.",
                  "Actualizaciones en vivo pausadas. Puedes actualizar los registros.",
                )
              ) : reactiveAt ? (
                <>
                  {l(
                    "Reactive update received",
                    "Actualización reactiva recibida",
                  )}{" "}
                  · <ProductDate value={reactiveAt} />
                </>
              ) : (
                l(
                  "Waiting for reactive rows from this connection.",
                  "Esperando filas reactivas de esta conexión.",
                )
              )}
            </p>
            {reactiveError && (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-3 text-xs"
              >
                <p>
                  {l(
                    "The live update was unavailable or invalid. Refresh records or reconnect the live transport.",
                    "La actualización en vivo no estaba disponible o no era válida. Actualiza los registros o reconecta el transporte.",
                  )}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={scopeStale}
                  onClick={() => setReactiveRetry((value) => value + 1)}
                >
                  {l("Reconnect live data", "Reconectar datos en vivo")}
                </Button>
              </div>
            )}
          </div>
        )}
        {scopeStale && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-destructive/25 p-3 text-xs leading-6"
          >
            {l(
              "The connection scope changed. Reopen the connection before reading or changing records.",
              "El alcance de la conexión cambió. Vuelve a abrir la conexión antes de consultar o modificar registros.",
            )}
          </p>
        )}
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <ProductResourcePicker
            {...resources}
            value={resourceId}
            onChange={(value) => {
              read.reset();
              write.reset();
              stopReactive();
              dataEpoch.invalidate();
              setReactiveAt(null);
              setResourceId(value);
              setRecords([]);
              setLoaded(false);
              setBase(null);
              setReview(null);
              setSelection({});
              setQuery(initialQuery);
            }}
            disabled={write.pending || scopeStale}
          />
          <label className="space-y-2 text-xs font-medium">
            {l("Status filter", "Filtro de estado")}
            <Input
              value={String(
                query.filters.find((filter) => filter.id === "status")?.value ??
                  "",
              )}
              placeholder={l("Any status", "Cualquier estado")}
              disabled={write.pending || scopeStale}
              onChange={(event) => {
                stopReactive();
                dataEpoch.invalidate();
                setQuery((current) => ({
                  ...current,
                  filters: event.target.value
                    ? [{ id: "status", value: event.target.value }]
                    : [],
                  pagination: { ...current.pagination, pageIndex: 0 },
                }));
              }}
            />
          </label>
        </div>
        <ProductFields
          action={queryAction}
          values={readValues}
          onChange={(values) => {
            stopReactive();
            dataEpoch.invalidate();
            setReadValues(values);
          }}
          disabled={write.pending || scopeStale}
          exclude={[
            "query",
            "search",
            "filter",
            "status",
            "page",
            "pageIndex",
            "pageSize",
            "limit",
            "offset",
            "sort",
            "order",
            "filters",
            "sorting",
            "queryState",
            "resourceId",
          ]}
        />
        <div className="my-4 flex justify-end">
          <Button
            variant="outline"
            loading={read.pending}
            disabled={!queryAction || !allowed || write.pending || scopeStale}
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw />
            {l("Refresh records", "Actualizar registros")}
          </Button>
        </div>
        <ProductActionUnavailable action={queryAction} />
        <DataTable
          mode="external"
          data={records}
          rowCount={total}
          columns={columns}
          query={query}
          onQueryChange={(value) => {
            if (!write.pending && !scopeStale) {
              stopReactive();
              dataEpoch.invalidate();
              setQuery(value);
            }
          }}
          rowSelection={selection}
          onRowSelectionChange={setSelection}
          pageSizeOptions={[5, 10, 25, 50]}
          columnVisibility
          loading={read.pending}
          error={read.error ?? undefined}
          onRetry={() => setRefresh((value) => value + 1)}
          labels={{
            search: l("Search records…", "Buscar registros…"),
            empty: l(
              loaded ? "No matching records" : "No records loaded",
              loaded
                ? "No hay registros coincidentes"
                : "No hay registros cargados",
            ),
            emptyDescription: l(
              "Choose an authorized source and adjust your query.",
              "Elige una fuente autorizada y ajusta la consulta.",
            ),
            previous: l("Previous page", "Página anterior"),
            next: l("Next page", "Página siguiente"),
            selectAll: l("Select this page", "Seleccionar esta página"),
            selectRow: l("Select record", "Seleccionar registro"),
            selected: l("selected", "seleccionados"),
            page: l("Page", "Página"),
            of: l("of", "de"),
            rows: l("records", "registros"),
            clear: l("Clear search", "Limpiar búsqueda"),
            error: l(
              "Could not load records",
              "No se pudieron cargar los registros",
            ),
            retry: l("Retry", "Reintentar"),
            loading: l("Loading records", "Cargando registros"),
            columns: l("Columns", "Columnas"),
            clearSelection: l("Clear selection", "Limpiar selección"),
            rowsPerPage: l("Records per page", "Registros por página"),
          }}
        />
        <div className="mt-3">
          <ProductOperationFeedback operation={read} />
        </div>
        {read.result && !["records", "record"].includes(read.result.kind) && (
          <ProductResult result={read.result} />
        )}
      </ProductPanel>
      {base && (
        <ProductPanel
          title={l("Edit record", "Editar registro")}
          description={
            <>
              {base.id} · {l("Base version", "Versión base")}:{" "}
              <ProductDate value={base.updatedAt} />
            </>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-xs font-medium">
              {l("Name", "Nombre")}
              <Input
                value={String(draft.name ?? "")}
                onChange={(event) => {
                  setReview(null);
                  setDraft({ ...draft, name: event.target.value });
                }}
                disabled={write.pending}
              />
            </label>
            <label className="space-y-2 text-xs font-medium">
              {l("Status", "Estado")}
              {statusField?.options?.length ? (
                <Select
                  aria-label={l("Status", "Estado")}
                  value={String(draft.status ?? "")}
                  options={statusField.options.map((option) => ({
                    value: option.value,
                    label: l(option.label.en, option.label.es),
                  }))}
                  onValueChange={(value) => {
                    setReview(null);
                    setDraft({ ...draft, status: value });
                  }}
                  disabled={write.pending}
                />
              ) : (
                <Input
                  value={String(draft.status ?? "")}
                  onChange={(event) => {
                    setReview(null);
                    setDraft({ ...draft, status: event.target.value });
                  }}
                  disabled={write.pending}
                />
              )}
            </label>
          </div>
          <div className="my-4">
            <ProductLabeledTextarea
              label={l("Description", "Descripción")}
              value={String(draft.description ?? "")}
              onChange={(event) => {
                setReview(null);
                setDraft({ ...draft, description: event.target.value });
              }}
              disabled={write.pending}
            />
          </div>
          <ProductFields
            action={saveAction}
            values={draft}
            onChange={(values) => {
              setReview(null);
              setDraft(values);
            }}
            disabled={write.pending}
            exclude={[
              "id",
              "recordId",
              "name",
              "status",
              "description",
              "fields",
              "resourceId",
              "revision",
              "expectedUpdatedAt",
            ]}
          />
          <div className="my-4">
            <ProductLabeledTextarea
              label={l(
                "Record fields · JSON object",
                "Campos del registro · Objeto JSON",
              )}
              value={fieldsText}
              spellCheck={false}
              className="font-mono text-xs"
              onChange={(event) => {
                setFieldsText(event.target.value);
                setReview(null);
              }}
              disabled={write.pending}
              aria-invalid={!parsed.ok}
            />
          </div>
          {!parsed.ok && (
            <p
              role="alert"
              className="mb-3 text-xs text-destructive-foreground"
            >
              {l(
                "Use valid JSON with text, numbers, booleans or lists of text.",
                "Usa JSON válido con texto, números, booleanos o listas de texto.",
              )}
            </p>
          )}
          <ProductValidation action={saveAction} values={prepared} />
          {conflict && (
            <div
              role="alert"
              className="mb-4 space-y-3 rounded-xl border border-primary/30 bg-accent/30 p-4"
            >
              <p className="text-xs leading-6">
                {l(
                  "Your draft is preserved. Refresh the records, compare the latest values, then choose a new base before retrying.",
                  "Tu borrador se conserva. Actualiza los registros, compara los valores actuales y elige una nueva base antes de reintentar.",
                )}
              </p>
              {latest && latest.updatedAt !== base.updatedAt && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold">
                      {l(
                        "Latest source values",
                        "Valores actuales de la fuente",
                      )}
                    </p>
                    <p className="text-xs leading-6">
                      {latest.name} · {latest.status}
                    </p>
                    <p className="text-xs leading-6">{latest.description}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold">
                      {l("Your draft", "Tu borrador")}
                    </p>
                    <p className="text-xs leading-6">
                      {String(draft.name)} · {String(draft.status)}
                    </p>
                    <p className="text-xs leading-6">
                      {String(draft.description)}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRefresh((value) => value + 1)}
                  disabled={read.pending}
                >
                  {l("Reload source", "Recargar fuente")}
                </Button>
                <Button
                  size="sm"
                  disabled={!latest || latest.updatedAt === base.updatedAt}
                  onClick={() => {
                    if (latest) {
                      setBase(latest);
                      setReview(null);
                      write.reset();
                    }
                  }}
                >
                  {l(
                    "Keep edits, use latest base",
                    "Conservar cambios y usar base actual",
                  )}
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              appearance="gradient"
              disabled={
                !saveAction ||
                !parsed.ok ||
                Boolean(invalid) ||
                write.pending ||
                conflict ||
                !String(draft.name ?? "").trim()
              }
              onClick={() => setReview(prepared)}
            >
              <Save />
              {l("Review changes", "Revisar cambios")}
            </Button>
            <Button
              variant="outline"
              disabled={write.pending}
              onClick={() => {
                setBase(null);
                setReview(null);
              }}
            >
              {l("Close editor", "Cerrar editor")}
            </Button>
          </div>
          <div className="mt-4">
            <ProductOperationFeedback operation={write} />
            <ProductActionUnavailable action={saveAction} />
          </div>
          {write.result && write.result.kind !== "record" && (
            <div className="mt-4">
              <ProductResult result={write.result} />
              <p className="mt-2 text-xs text-muted-foreground">
                {l(
                  "Refresh the source to confirm the stored version.",
                  "Actualiza la fuente para confirmar la versión guardada.",
                )}
              </p>
            </div>
          )}
        </ProductPanel>
      )}
      {review && saveAction && (
        <ProductReview
          action={saveAction}
          values={review}
          pending={write.pending}
          disabled={scopeStale}
          grantedPermissions={props.connection.grantedPermissions}
          onConfirm={() => {
            void save();
          }}
          onReject={() => setReview(null)}
        >
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold">
              {l("Record fields", "Campos del registro")}
            </p>
            <ProductDocumentPreview
              content={String(review.fields ?? "{}")}
              format="json"
            />
          </div>
        </ProductReview>
      )}
    </div>
  );
}
