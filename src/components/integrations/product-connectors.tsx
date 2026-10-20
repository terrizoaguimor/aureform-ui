"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { ArrowRight, Plus, RefreshCw, Send, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useIntegrationOperation } from "@/hooks/use-integration-operation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type DataTableQuery } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  IntegrationAction,
  IntegrationRecord,
  IntegrationValues,
  IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import {
  findProductAction,
  invalidProductField,
  mapProductRecord,
  mergeProductRecords,
  productActionValues,
  productQueryValues,
  productReadDefaults,
  productRecordNeedsTarget,
  validProductMapping,
  type ProductFieldMapping,
} from "./product-model";
import {
  ProductActionUnavailable,
  ProductEmpty,
  ProductFields,
  ProductLabeledTextarea,
  ProductOperationFeedback,
  ProductPanel,
  ProductRecordList,
  ProductResourcePicker,
  ProductResult,
  ProductReview,
  ProductStatus,
  ProductValidation,
  useProductResources,
} from "./product-ui";
import { ProductAgentsWorkbench } from "./product-agents";
import {
  ProductDocumentWorkbench,
  type ProductEditorRenderer,
} from "./product-document";
import {
  connectorDomainValues,
  connectorComparisonRows,
  connectorPullRequestProblem,
  connectorReportedTransitionChoices,
  connectorReviewSnapshot,
  connectorTargetRecord,
  connectorTransitionChoices,
  connectorTransitionFieldsProblem,
  type ConnectorTransitionChoice,
} from "./product-connector-actions";

const initialQuery: DataTableQuery = {
  search: "",
  filters: [],
  sorting: [],
  pagination: { pageIndex: 0, pageSize: 5 },
};

export function ProductConnectorsWorkbench(
  props: IntegrationWorkbenchProps & { renderEditor?: ProductEditorRenderer },
) {
  const { l } = useLanguage();
  const read = useIntegrationOperation(props);
  const readRun = read.run;
  const readCancel = read.cancel;
  const readReset = read.reset;
  const sourceReadRequest = useRef<symbol | null>(null);
  const resetSourceRead = useCallback(() => {
    sourceReadRequest.current = null;
    readReset();
  }, [readReset]);
  const cancelSourceRead = useCallback(() => {
    sourceReadRequest.current = null;
    readCancel();
  }, [readCancel]);
  const targetRead = useIntegrationOperation(props);
  const remoteRead = useIntegrationOperation(props);
  const transitionRead = useIntegrationOperation(props);
  const write = useIntegrationOperation(props);
  const resources = useProductResources(props);
  const transitionQuery = props.definition.actions.find(
    (action) =>
      action.kind === "query" &&
      action.fields.some(
        (field) => field.id === "recordId" && field.required,
      ) &&
      /transition/.test(action.id),
  );
  const queryActions = props.definition.actions.filter(
    (action) => action.kind === "query" && action !== transitionQuery,
  );
  const [queryActionId, setQueryActionId] = useState(queryActions[0]?.id ?? "");
  const queryAction = props.definition.actions.find(
    (action) => action.kind === "query" && action.id === queryActionId,
  );
  const mapAction = findProductAction(props.definition, "map-fields");
  const writeActions = props.definition.actions.filter((action) =>
    [
      "create-ticket",
      "update-record",
      "publish-message",
      "save-record",
      "ingest",
      "create-pull-request",
      "transition-issue",
    ].includes(action.kind),
  );
  const [sourceId, setSourceId] = useState(
    props.connection.resourceIds[0] ?? "",
  );
  const [destinationId, setDestinationId] = useState(
    props.connection.resourceIds[0] ?? "",
  );
  const [resourceIds, setResourceIds] = useState(props.connection.resourceIds);
  const [records, setRecords] = useState<IntegrationRecord[]>([]);
  const [targetRecords, setTargetRecords] = useState<IntegrationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [querySnapshot, setQuerySnapshot] = useState("");
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [sample, setSample] = useState<IntegrationRecord | null>(null);
  const [mapping, setMapping] = useState<ProductFieldMapping[]>([
    { source: "name", target: "title" },
    { source: "description", target: "description" },
  ]);
  const [actionId, setActionId] = useState(writeActions[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [targetId, setTargetId] = useState("");
  const [transitionReport, setTransitionReport] = useState<{
    recordId: string;
    updatedAt: string;
    resourceId: string;
    choices: ConnectorTransitionChoice[];
  } | null>(null);
  const [extra, setExtra] = useState<IntegrationValues>(() =>
    productReadDefaults(queryAction, props),
  );
  const [review, setReview] = useState<{
    action: IntegrationAction;
    values: IntegrationValues;
    target?: IntegrationRecord;
  } | null>(null);
  const [comparison, setComparison] = useState<{
    actionId: string;
    resourceId: string;
    before: IntegrationRecord;
    remote?: IntegrationRecord;
    conflicted: boolean;
  } | null>(null);
  const [refreshMismatch, setRefreshMismatch] = useState(false);
  const [rebasedRevision, setRebasedRevision] = useState<string | null>(null);
  const resetRemoteRead = remoteRead.reset;
  const clearRecovery = useCallback(() => {
    resetRemoteRead();
    setComparison(null);
    setRefreshMismatch(false);
    setRebasedRevision(null);
  }, [resetRemoteRead]);
  const action = writeActions.find((item) => item.id === actionId);
  const pullRequest = action?.kind === "create-pull-request";
  const transition = action?.kind === "transition-issue";
  const update = transition || productRecordNeedsTarget(action);
  const propertyUpdate =
    action?.kind === "update-record" &&
    action.fields.some((field) =>
      ["propertyRef", "fieldRef"].includes(field.id),
    ) &&
    action.fields.some((field) => field.id === "value");
  const statusField = action?.fields.find((field) => field.id === "status");
  const selectedStatus = status || statusField?.options?.[0]?.value || "";
  const target =
    targetRecords.find((record) => record.id === targetId) ??
    (sourceId === destinationId && sample?.id === targetId
      ? sample
      : undefined);
  const transitions =
    target &&
    transitionReport?.recordId === target.id &&
    transitionReport.updatedAt === target.updatedAt &&
    transitionReport.resourceId === destinationId
      ? transitionReport.choices
      : connectorTransitionChoices(action, target);
  const transitionId =
    typeof extra.transitionId === "string" &&
    transitions.some((choice) => choice.value === extra.transitionId)
      ? extra.transitionId
      : "";
  const reviewedAction =
    transition && action
      ? {
          ...action,
          fields: action.fields.map((field) =>
            field.id === "transitionId"
              ? { ...field, type: "select" as const, options: transitions }
              : field,
          ),
        }
      : action;
  const destination = resources.resources.find(
    (resource) => resource.id === destinationId,
  );
  const changedQuery = JSON.stringify([
    queryAction?.id,
    query,
    sourceId,
    resourceIds,
    extra,
  ]);
  useEffect(() => {
    if (write.errorCode !== "conflict" || !review?.target) return;
    setComparison({
      actionId: review.action.id,
      resourceId: String(review.values.resourceId ?? destinationId),
      before: structuredClone(review.target),
      conflicted: true,
    });
    setRefreshMismatch(false);
    setRebasedRevision(null);
    setReview(null);
  }, [write.errorCode, review, destinationId]);
  const mapped = sample ? mapProductRecord(sample, mapping) : {};
  const mappingValid = validProductMapping(mapping);
  const sourceFields = [
    ...new Set([
      "id",
      "name",
      "type",
      "status",
      "description",
      "updatedAt",
      ...records.flatMap((record) => Object.keys(record.fields ?? {})),
    ]),
  ];

  const load = useCallback(async () => {
    if (!queryAction || !sourceId || !resourceIds.includes(sourceId)) return;
    const values = productActionValues(
      queryAction,
      {
        ...extra,
        ...productQueryValues(query, sourceId),
        sourceId,
        resourceIds,
      },
      sourceId,
    );
    if (invalidProductField(queryAction, values) || sourceReadRequest.current)
      return;
    const request = Symbol();
    sourceReadRequest.current = request;
    try {
      const result = await readRun(queryAction, values);
      if (sourceReadRequest.current !== request) return;
      // Retire this request before publishing its snapshot. Effect cleanup
      // must not turn an already completed read into a cancellation error.
      sourceReadRequest.current = null;
      if (result?.kind === "records") {
        setRecords(result.records);
        setTotal(result.total);
        setQuerySnapshot(
          JSON.stringify([queryAction.id, query, sourceId, resourceIds, extra]),
        );
      } else if (result?.kind === "record") {
        setRecords([result.record]);
        setTotal(1);
        setQuerySnapshot(
          JSON.stringify([queryAction.id, query, sourceId, resourceIds, extra]),
        );
      }
    } finally {
      if (sourceReadRequest.current === request)
        sourceReadRequest.current = null;
    }
  }, [queryAction, sourceId, resourceIds, extra, query, readRun]);
  useEffect(() => {
    if (!querySnapshot || querySnapshot === changedQuery) return;
    const timer = setTimeout(() => {
      void load();
    }, 200);
    return () => {
      clearTimeout(timer);
      if (sourceReadRequest.current) resetSourceRead();
    };
  }, [querySnapshot, changedQuery, load, resetSourceRead]);

  const select = useCallback(
    (record: IntegrationRecord) => {
      clearRecovery();
      setSample(record);
      setSelection({ [record.id]: true });
      setReview(null);
      const mapped = mapProductRecord(record, mapping);
      setTitle(String(mapped.title ?? mapped.name ?? record.name));
      setBody(String(mapped.description ?? mapped.body ?? record.description));
      setStatus(String(mapped.status ?? record.status));
      if (sourceId === destinationId) setTargetId(record.id);
    },
    [
      mapping,
      sourceId,
      destinationId,
      setSample,
      setSelection,
      setReview,
      setTitle,
      setBody,
      setStatus,
      setTargetId,
      clearRecovery,
    ],
  );
  const columns = useMemo<ColumnDef<IntegrationRecord>[]>(
    () => [
      {
        accessorKey: "name",
        header: l("Source record", "Registro fuente"),
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
        cell: ({ row }) => <ProductStatus value={row.original.status} />,
      },
      {
        accessorKey: "description",
        header: l("Preview", "Vista previa"),
        cell: ({ row }) => (
          <p className="max-w-64 whitespace-normal text-xs leading-6">
            {row.original.description}
          </p>
        ),
      },
      {
        id: "prepare",
        header: l("Prepare", "Preparar"),
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            disabled={write.pending}
            onClick={() => select(row.original)}
          >
            {l("Use record", "Usar registro")}
          </Button>
        ),
      },
    ],
    [l, write.pending, select],
  );

  async function loadTargets() {
    if (!queryAction || !destinationId || !resourceIds.includes(destinationId))
      return;
    const values = productActionValues(
      queryAction,
      {
        ...extra,
        ...productQueryValues(initialQuery, destinationId),
        sourceId: destinationId,
        resourceIds: [destinationId],
        view: "destination",
      },
      destinationId,
    );
    if (invalidProductField(queryAction, values)) return;
    const result = await targetRead.run(queryAction, values);
    if (result?.kind === "records")
      setTargetRecords(
        result.records.filter(
          (record) =>
            record.fields?.resourceId === undefined ||
            record.fields.resourceId === destinationId,
        ),
      );
    if (
      result?.kind === "record" &&
      (result.record.fields?.resourceId === undefined ||
        result.record.fields.resourceId === destinationId)
    )
      setTargetRecords([result.record]);
  }
  async function refreshTarget() {
    const before = comparison?.before ?? target;
    if (
      !queryAction ||
      !action ||
      !before ||
      !resourceIds.includes(destinationId)
    )
      return;
    setReview(null);
    setRefreshMismatch(false);
    setRebasedRevision(null);
    setComparison({
      actionId: action.id,
      resourceId: destinationId,
      before: structuredClone(before),
      conflicted: comparison?.conflicted ?? false,
    });
    const values = productActionValues(
      queryAction,
      {
        ...productReadDefaults(queryAction, props),
        ...productQueryValues(initialQuery, destinationId),
        recordId: before.id,
        id: before.id,
        sourceId: destinationId,
        resourceIds: [destinationId],
        view: "destination",
      },
      destinationId,
    );
    if (invalidProductField(queryAction, values)) {
      setRefreshMismatch(true);
      return;
    }
    const result = await remoteRead.run(queryAction, values);
    if (!result) return;
    const remote = connectorTargetRecord(result, before.id, destinationId);
    if (!remote) {
      setRefreshMismatch(true);
      return;
    }
    setComparison((current) =>
      current?.before.id === before.id &&
      current.resourceId === destinationId &&
      current.actionId === action.id
        ? { ...current, remote }
        : current,
    );
  }
  function rebaseTarget() {
    if (
      !comparison?.remote ||
      comparison.resourceId !== destinationId ||
      comparison.actionId !== action?.id
    )
      return;
    const remote = structuredClone(comparison.remote);
    setTargetRecords((items) => mergeProductRecords(items, [remote]));
    setTargetId(remote.id);
    if (sourceId === destinationId) {
      setRecords((items) =>
        items.map((item) => (item.id === remote.id ? remote : item)),
      );
      if (sample?.id === remote.id) setSample(remote);
    }
    setComparison(null);
    setReview(null);
    setRefreshMismatch(false);
    setRebasedRevision(remote.updatedAt);
    write.reset();
    if (transition) {
      setTransitionReport(null);
      transitionRead.reset();
      setExtra((values) => ({ ...values, transitionId: "" }));
    }
  }
  async function loadTransitions() {
    if (!transitionQuery || !target || !resourceIds.includes(destinationId))
      return;
    setTransitionReport(null);
    setExtra((values) => ({ ...values, transitionId: "" }));
    setReview(null);
    const result = await transitionRead.run(
      transitionQuery,
      productActionValues(
        transitionQuery,
        {
          recordId: target.id,
          expectedUpdatedAt: target.updatedAt,
        },
        destinationId,
      ),
    );
    if (result)
      setTransitionReport({
        recordId: target.id,
        updatedAt: target.updatedAt,
        resourceId: destinationId,
        choices: connectorReportedTransitionChoices(result, target),
      });
  }
  function stage(
    targetAction: IntegrationAction | undefined,
    values: IntegrationValues,
  ) {
    if (!targetAction) return;
    const needsTarget =
      targetAction.kind === "transition-issue" ||
      productRecordNeedsTarget(targetAction);
    if (needsTarget && (!target || comparison || remoteRead.pending)) return;
    if (!invalidProductField(targetAction, values))
      setReview(
        connectorReviewSnapshot(
          targetAction,
          values,
          needsTarget ? target : undefined,
        ),
      );
  }
  async function submit() {
    if (!review) return;
    const result = await write.run(review.action, review.values);
    if (!result) return;
    if (result.kind === "record") {
      setTargetRecords((items) => mergeProductRecords(items, [result.record]));
      setTargetId(result.record.id);
      if (
        review.action.kind === "transition-issue" &&
        sourceId === destinationId
      )
        setRecords((items) =>
          items.map((item) =>
            item.id === result.record.id ? result.record : item,
          ),
        );
      if (review.action.kind === "transition-issue") {
        setTransitionReport(null);
        transitionRead.reset();
        setExtra((values) => ({ ...values, transitionId: "" }));
      }
    }
    setReview(null);
  }
  const mappingValues = productActionValues(
    mapAction,
    {
      ...extra,
      sourceId,
      destinationId,
      resourceIds,
      sourceField: mapping[0]?.source ?? "",
      targetField: mapping[0]?.target ?? "",
      source: mapping[0]?.source ?? "",
      target: mapping[0]?.target ?? "",
      mapping: JSON.stringify(mapping),
      fieldMapping: JSON.stringify(mapping),
    },
    sourceId,
  );
  const genericWriteValues = productActionValues(
    action,
    {
      ...extra,
      ...mapped,
      resourceIds,
      sourceId,
      destinationId,
      sourceRecordId: sample?.id ?? "",
      recordId: update ? targetId : "",
      id: update ? targetId : "",
      title,
      subject: title,
      name: title,
      body,
      content: body,
      message: body,
      description: body,
      status: selectedStatus,
      ...(update && target ? { expectedUpdatedAt: target.updatedAt } : {}),
      mapping: JSON.stringify(mapping),
    },
    destinationId,
  );
  const writeValues =
    action && (pullRequest || transition || propertyUpdate)
      ? connectorDomainValues(
          action,
          {
            ...extra,
            title,
            name: title,
            description: body,
            body,
            content: body,
            draft: extra.draft === true,
            transitionId,
          },
          destinationId,
          transition || propertyUpdate ? target : undefined,
        )
      : genericWriteValues;
  const pullRequestProblem = connectorPullRequestProblem(action, writeValues);
  const transitionFieldsProblem = transition
    ? connectorTransitionFieldsProblem(writeValues)
    : null;
  const permitted = !action?.requiredPermissions?.some(
    (permission) => !props.connection.grantedPermissions.includes(permission),
  );
  const reviewTransition = transitions.find(
    (choice) => choice.value === review?.values.transitionId,
  );
  const comparisonRows =
    action && comparison?.actionId === action.id
      ? connectorComparisonRows(
          action,
          comparison.before,
          comparison.remote,
          writeValues,
        )
      : [];
  const staleReview = Boolean(
    review?.target &&
    (!target ||
      target.id !== review.target.id ||
      target.updatedAt !== review.target.updatedAt),
  );
  function compareValue(value: IntegrationValues[string] | undefined) {
    if (value === undefined) return l("Not reported", "No reportado");
    if (value === "") return l("Empty", "Vacío");
    if (typeof value === "boolean")
      return value ? l("Yes", "Sí") : l("No", "No");
    return Array.isArray(value) ? value.join(", ") : String(value);
  }
  return (
    <div className="space-y-5">
      <ProductPanel
        title={l("Resource scope", "Alcance de recursos")}
        description={l(
          "Choose from the resources already authorized for this connection.",
          "Elige entre los recursos ya autorizados para esta conexión.",
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ProductResourcePicker
            {...resources}
            label={l("Source resource", "Recurso fuente")}
            value={sourceId}
            onChange={(value) => {
              resetSourceRead();
              setSourceId(value);
              setRecords([]);
              setSample(null);
              setSelection({});
              setQuerySnapshot("");
              setReview(null);
              setQuery(initialQuery);
            }}
            disabled={write.pending}
          />
          <ProductResourcePicker
            {...resources}
            label={
              pullRequest
                ? l("Pull request repository", "Repositorio del pull request")
                : transition
                  ? l("Jira project", "Proyecto Jira")
                  : l("Destination resource", "Recurso destino")
            }
            value={destinationId}
            onChange={(value) => {
              setDestinationId(value);
              clearRecovery();
              targetRead.reset();
              transitionRead.reset();
              write.reset();
              setTargetRecords([]);
              setTargetId("");
              setExtra((values) => ({ ...values, transitionId: "" }));
              setTransitionReport(null);
              setReview(null);
            }}
            disabled={write.pending}
          />
        </div>
        <fieldset className="mt-4">
          <legend className="mb-2 text-xs font-medium">
            {l(
              "Resources included in this workflow",
              "Recursos incluidos en este flujo",
            )}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {resources.resources.map((resource) => (
              <label
                key={resource.id}
                className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-xs"
              >
                <Checkbox
                  checked={resourceIds.includes(resource.id)}
                  disabled={write.pending}
                  onCheckedChange={(checked) => {
                    setResourceIds((ids) =>
                      checked
                        ? [...new Set([...ids, resource.id])]
                        : ids.filter((id) => id !== resource.id),
                    );
                    setReview(null);
                    clearRecovery();
                  }}
                />
                <span>{resource.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </ProductPanel>
      <ProductPanel title={l("Source preview", "Vista previa de la fuente")}>
        {queryActions.length > 1 && (
          <div className="mb-4">
            <Select
              label={l("Source operation", "Operación de la fuente")}
              value={queryActionId}
              options={queryActions.map((item) => ({
                value: item.id,
                label: l(item.label.en, item.label.es),
              }))}
              disabled={write.pending}
              onValueChange={(value) => {
                resetSourceRead();
                targetRead.reset();
                transitionRead.reset();
                setTransitionReport(null);
                clearRecovery();
                setQueryActionId(value);
                setExtra((previous) => {
                  const next = productReadDefaults(
                    queryActions.find((item) => item.id === value),
                    props,
                  );
                  for (const field of action?.fields ?? []) {
                    if (previous[field.id] !== undefined)
                      next[field.id] = previous[field.id];
                  }
                  return next;
                });
                setQuerySnapshot("");
                setQuery(initialQuery);
                setRecords([]);
                setSample(null);
                setSelection({});
                setTargetRecords([]);
                setTargetId("");
                setReview(null);
              }}
            />
          </div>
        )}
        <ProductFields
          action={queryAction}
          values={extra}
          onChange={(value) => {
            setExtra(value);
            setReview(null);
          }}
          exclude={[
            "resourceId",
            "sourceId",
            "resourceIds",
            "query",
            "search",
            "page",
            "pageIndex",
            "pageSize",
            "limit",
            "offset",
            "sort",
            "order",
            "filter",
          ]}
        />
        <div className="my-4">
          <Button
            variant="outline"
            loading={read.pending}
            disabled={
              !queryAction || !resourceIds.includes(sourceId) || write.pending
            }
            onClick={() => {
              void load();
            }}
          >
            <RefreshCw />
            {l("Load source preview", "Cargar vista previa")}
          </Button>
        </div>
        <DataTable
          mode="external"
          data={records}
          rowCount={total}
          columns={columns}
          query={query}
          onQueryChange={setQuery}
          rowSelection={selection}
          onRowSelectionChange={setSelection}
          selectable={false}
          loading={read.pending}
          error={read.error ?? undefined}
          onRetry={() => {
            void load();
          }}
          labels={{
            search: l("Search source…", "Buscar en fuente…"),
            empty: l(
              "No source records loaded",
              "No hay registros fuente cargados",
            ),
            emptyDescription: l(
              "Load an authorized resource to preview and map its fields.",
              "Carga un recurso autorizado para revisar y mapear sus campos.",
            ),
            previous: l("Previous", "Anterior"),
            next: l("Next", "Siguiente"),
            page: l("Page", "Página"),
            of: l("of", "de"),
            rows: l("records", "registros"),
            selected: l("selected", "seleccionados"),
            clear: l("Clear search", "Limpiar búsqueda"),
            loading: l("Loading preview", "Cargando vista previa"),
            error: l("Preview unavailable", "Vista previa no disponible"),
            retry: l("Retry", "Reintentar"),
            columns: l("Columns", "Columnas"),
            rowsPerPage: l("Records per page", "Registros por página"),
          }}
        />
        <div className="mt-4">
          <ProductOperationFeedback
            operation={{
              ...read,
              cancel: cancelSourceRead,
              reset: resetSourceRead,
            }}
          />
          <ProductActionUnavailable action={queryAction} />
        </div>
        {read.result && !["records", "record"].includes(read.result.kind) && (
          <ProductResult result={read.result} />
        )}
      </ProductPanel>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <ProductPanel title={l("Field mapping", "Mapeo de campos")}>
          <div className="space-y-3">
            {mapping.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2"
              >
                <Select
                  label={`${l("Source field", "Campo fuente")} ${index + 1}`}
                  value={row.source}
                  options={sourceFields.map((field) => ({
                    value: field,
                    label: field,
                  }))}
                  disabled={write.pending}
                  onValueChange={(value) => {
                    setMapping((items) =>
                      items.map((item, i) =>
                        i === index ? { ...item, source: value } : item,
                      ),
                    );
                    setReview(null);
                  }}
                />
                <ArrowRight
                  className="mb-3 size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <label className="space-y-2 text-xs font-medium">
                  {l("Destination field", "Campo destino")}
                  <Input
                    value={row.target}
                    disabled={write.pending}
                    onChange={(event) => {
                      setMapping((items) =>
                        items.map((item, i) =>
                          i === index
                            ? { ...item, target: event.target.value }
                            : item,
                        ),
                      );
                      setReview(null);
                    }}
                  />
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={write.pending}
                  aria-label={l("Remove mapping", "Quitar mapeo")}
                  onClick={() => {
                    setMapping((items) => items.filter((_, i) => i !== index));
                    setReview(null);
                  }}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={write.pending}
            onClick={() => {
              setMapping((items) => [...items, { source: "", target: "" }]);
              setReview(null);
            }}
          >
            <Plus />
            {l("Add field mapping", "Añadir mapeo de campo")}
          </Button>
          {!mappingValid && (
            <p
              role="alert"
              className="mt-3 text-xs text-destructive-foreground"
            >
              {l(
                "Choose source fields and unique destination names.",
                "Elige campos fuente y nombres únicos de destino.",
              )}
            </p>
          )}
          <div className="my-4">
            <ProductFields
              action={mapAction}
              values={extra}
              onChange={(value) => {
                setExtra(value);
                setReview(null);
              }}
              exclude={[
                "resourceId",
                "sourceId",
                "destinationId",
                "resourceIds",
                "sourceField",
                "targetField",
                "source",
                "target",
                "mapping",
                "fieldMapping",
              ]}
            />
          </div>
          <ProductValidation action={mapAction} values={mappingValues} />
          <Button
            appearance="gradient"
            disabled={
              !mapAction ||
              !mappingValid ||
              write.pending ||
              !sample ||
              !resourceIds.includes(sourceId) ||
              Boolean(invalidProductField(mapAction, mappingValues))
            }
            onClick={() => stage(mapAction, mappingValues)}
          >
            {l("Review field mapping", "Revisar mapeo")}
          </Button>
          <div className="mt-4">
            <ProductActionUnavailable action={mapAction} />
          </div>
          {sample && (
            <div className="mt-5">
              <h4 className="mb-3 text-xs font-semibold">
                {l("Mapped preview", "Vista previa mapeada")} · {sample.name}
              </h4>
              <ProductDocumentValues values={mapped} />
            </div>
          )}
        </ProductPanel>
        <ProductPanel
          title={l(
            pullRequest
              ? "Create a pull request"
              : transition
                ? "Transition a Jira issue"
                : propertyUpdate
                  ? "Update a CRM field"
                  : "Create or update a destination record",
            pullRequest
              ? "Crear un pull request"
              : transition
                ? "Cambiar una incidencia Jira"
                : propertyUpdate
                  ? "Actualizar un campo CRM"
                  : "Crear o actualizar un registro destino",
          )}
          description={
            pullRequest
              ? l(
                  "Review the repository, branches and draft setting before creating a pull request.",
                  "Revisa el repositorio, las ramas y la opción de borrador antes de crear un pull request.",
                )
              : transition
                ? l(
                    "Choose an issue and an allowed transition. Its new status appears only after the connection reports it.",
                    "Elige una incidencia y una transición permitida. El nuevo estado aparece cuando lo informa la conexión.",
                  )
                : undefined
          }
        >
          <div className="space-y-4">
            <Select
              label={l("Destination action", "Acción de destino")}
              value={actionId}
              options={writeActions.map((item) => ({
                value: item.id,
                label: l(item.label.en, item.label.es),
              }))}
              onValueChange={(value) => {
                setActionId(value);
                clearRecovery();
                write.reset();
                transitionRead.reset();
                setTransitionReport(null);
                setExtra((values) => ({ ...values, transitionId: "" }));
                setReview(null);
              }}
              disabled={write.pending}
            />
            {!transition && !propertyUpdate && (
              <label className="block space-y-2 text-xs font-medium">
                {pullRequest
                  ? l("Pull request title", "Título del pull request")
                  : l("Title", "Título")}
                <Input
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setReview(null);
                  }}
                  disabled={write.pending}
                />
              </label>
            )}
            {!transition && !propertyUpdate && (
              <ProductLabeledTextarea
                label={
                  pullRequest
                    ? l(
                        "Pull request description",
                        "Descripción del pull request",
                      )
                    : l("Description or message", "Descripción o mensaje")
                }
                value={body}
                onChange={(event) => {
                  setBody(event.target.value);
                  setReview(null);
                }}
                disabled={write.pending}
              />
            )}
            {!pullRequest &&
              !transition &&
              !propertyUpdate &&
              (statusField?.type === "select" ? (
                <Select
                  label={l("Destination status", "Estado de destino")}
                  value={selectedStatus}
                  options={(statusField.options ?? []).map((option) => ({
                    value: option.value,
                    label: l(option.label.en, option.label.es),
                  }))}
                  onValueChange={(value) => {
                    setStatus(value);
                    setReview(null);
                  }}
                  disabled={write.pending}
                />
              ) : (
                <label className="block space-y-2 text-xs font-medium">
                  {l("Destination status", "Estado de destino")}
                  <Input
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value);
                      setReview(null);
                    }}
                    disabled={write.pending}
                  />
                </label>
              ))}
            {update && (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  loading={targetRead.pending}
                  disabled={
                    !queryAction ||
                    !resourceIds.includes(destinationId) ||
                    write.pending ||
                    remoteRead.pending
                  }
                  onClick={() => {
                    void loadTargets();
                  }}
                >
                  {transition
                    ? l("Load Jira issues", "Cargar incidencias Jira")
                    : l("Load destination records", "Cargar registros destino")}
                </Button>
                <ProductRecordList
                  records={targetRecords}
                  selected={targetId}
                  onSelect={(record) => {
                    if (write.pending) return;
                    setTargetId(record.id);
                    clearRecovery();
                    write.reset();
                    transitionRead.reset();
                    setTransitionReport(null);
                    setExtra((values) => ({ ...values, transitionId: "" }));
                    setReview(null);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {transition
                    ? l("Selected issue", "Incidencia elegida")
                    : l("Target ID", "ID de destino")}
                  : {targetId || "—"}
                </p>
                {transition && target && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span>{target.name}</span>
                    <span className="text-muted-foreground">
                      {l("Reported status", "Estado reportado")}
                    </span>
                    <ProductStatus value={target.status} />
                  </div>
                )}
                <ProductOperationFeedback operation={targetRead} />
                {target && (
                  <div className="space-y-3">
                    <p className="text-xs leading-6 text-muted-foreground">
                      {l(
                        "Observed record revision",
                        "Revisión observada del registro",
                      )}
                      : {target.updatedAt}
                    </p>
                    <Button
                      variant="outline"
                      loading={remoteRead.pending}
                      disabled={
                        !queryAction ||
                        write.pending ||
                        targetRead.pending ||
                        !resourceIds.includes(destinationId)
                      }
                      onClick={() => {
                        void refreshTarget();
                      }}
                    >
                      {l("Read latest record", "Leer registro más reciente")}
                    </Button>
                    <ProductOperationFeedback operation={remoteRead} />
                  </div>
                )}
              </div>
            )}
            {comparison && comparison.actionId === action?.id && (
              <ProductPanel
                title={l("Compare remote changes", "Comparar cambios remotos")}
                description={
                  comparison.conflicted
                    ? l(
                        "The connection reported a conflict. Your draft is retained; read the current record and decide before reviewing again.",
                        "La conexión reportó un conflicto. Tu borrador se conserva; lee el registro actual y decide antes de volver a revisarlo.",
                      )
                    : l(
                        "Compare the actual record response with your preserved draft before choosing its revision.",
                        "Compara la respuesta real del registro con tu borrador conservado antes de elegir su revisión.",
                      )
                }
              >
                <p className="mb-3 text-xs leading-6 text-muted-foreground">
                  {l(
                    "Previously read revision",
                    "Revisión leída anteriormente",
                  )}
                  : {comparison.before.updatedAt}
                  {comparison.remote && (
                    <>
                      {" "}
                      · {l("Current remote revision", "Revisión remota actual")}
                      : {comparison.remote.updatedAt}
                    </>
                  )}
                </p>
                <div className="overflow-x-auto">
                  <table
                    className="w-full table-fixed text-left text-xs"
                    aria-label={l(
                      "Draft and remote values",
                      "Valores del borrador y remotos",
                    )}
                  >
                    <thead>
                      <tr className="border-b border-border">
                        {[
                          l("Field", "Campo"),
                          l("Previously read", "Leído anteriormente"),
                          l("Current remote value", "Valor remoto actual"),
                          l("Your draft", "Tu borrador"),
                        ].map((label) => (
                          <th
                            key={label}
                            scope="col"
                            className="p-2 font-medium"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row) => (
                        <tr key={row.id} className="border-b border-border">
                          <th
                            scope="row"
                            className="p-2 font-medium wrap-break-word"
                          >
                            {l(row.label.en, row.label.es)}
                          </th>
                          {[row.before, row.remote, row.draft].map(
                            (value, index) => (
                              <td
                                key={index}
                                className="p-2 align-top whitespace-pre-wrap wrap-break-word"
                              >
                                {compareValue(value)}
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {refreshMismatch && (
                  <p
                    role="alert"
                    className="mt-3 text-xs leading-6 text-destructive-foreground"
                  >
                    {l(
                      "The response did not include this authorized record. Your draft is unchanged; retry the read or choose another authorized record.",
                      "La respuesta no incluyó este registro autorizado. Tu borrador sigue igual; reintenta la lectura o elige otro registro autorizado.",
                    )}
                  </p>
                )}
                {!comparison.remote && (
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">
                    {l(
                      "Read the latest record to obtain its values and revision. No draft fields are replaced automatically.",
                      "Lee el registro más reciente para obtener valores y revisión. Ningún campo del borrador se sustituye automáticamente.",
                    )}
                  </p>
                )}
                <Button
                  className="mt-4"
                  variant="outline"
                  disabled={
                    !comparison.remote ||
                    remoteRead.pending ||
                    write.pending ||
                    !resourceIds.includes(destinationId)
                  }
                  onClick={rebaseTarget}
                >
                  {l(
                    "Keep my draft on the latest revision",
                    "Conservar mi borrador sobre la última revisión",
                  )}
                </Button>
              </ProductPanel>
            )}
            {rebasedRevision && (
              <p
                role="status"
                className="text-xs leading-6 text-muted-foreground"
              >
                {l(
                  "Your draft was kept. Review it again using the newly read record revision.",
                  "Tu borrador se conservó. Revísalo de nuevo usando la revisión recién leída del registro.",
                )}{" "}
                · {rebasedRevision}
              </p>
            )}
            {transition && (
              <div className="space-y-3">
                {transitionQuery && (
                  <Button
                    variant="outline"
                    loading={transitionRead.pending}
                    disabled={!target || write.pending}
                    onClick={() => {
                      void loadTransitions();
                    }}
                  >
                    {l(
                      "Load allowed transitions",
                      "Cargar transiciones permitidas",
                    )}
                  </Button>
                )}
                <Select
                  label={l(
                    "Allowed issue transition",
                    "Transición permitida de la incidencia",
                  )}
                  placeholder={l(
                    "Choose a reported transition",
                    "Elige una transición reportada",
                  )}
                  value={transitionId}
                  options={transitions.map((choice) => ({
                    value: choice.value,
                    label: l(choice.label.en, choice.label.es),
                  }))}
                  disabled={
                    write.pending ||
                    transitionRead.pending ||
                    !target ||
                    !transitions.length
                  }
                  onValueChange={(value) => {
                    setExtra((values) => ({ ...values, transitionId: value }));
                    setReview(null);
                  }}
                />
                {!target ? (
                  <p className="text-xs leading-6 text-muted-foreground">
                    {l(
                      "Load and select an issue before choosing a transition.",
                      "Carga y elige una incidencia antes de seleccionar una transición.",
                    )}
                  </p>
                ) : !transitions.length ? (
                  <p
                    role="status"
                    className="text-xs leading-6 text-muted-foreground"
                  >
                    {l(
                      "No allowed transitions were reported for this issue.",
                      "No se reportaron transiciones permitidas para esta incidencia.",
                    )}
                  </p>
                ) : (
                  <p className="text-xs leading-6 text-muted-foreground">
                    {l(
                      "These choices come from the issue or its approved action. The connection verifies availability when you confirm.",
                      "Estas opciones vienen de la incidencia o su acción permitida. La conexión verifica su disponibilidad al confirmar.",
                    )}
                  </p>
                )}
                <ProductOperationFeedback operation={transitionRead} />
              </div>
            )}
            <ProductFields
              action={reviewedAction}
              values={extra}
              onChange={(value) => {
                setExtra(value);
                setReview(null);
              }}
              disabled={write.pending}
              exclude={[
                "resourceId",
                "resourceIds",
                "sourceId",
                "destinationId",
                "sourceRecordId",
                "recordId",
                "id",
                "title",
                "subject",
                "name",
                "body",
                "content",
                "message",
                "description",
                "status",
                "mapping",
                "expectedUpdatedAt",
                ...(transition ? ["transitionId", "issueKey"] : []),
              ]}
            />
            <ProductValidation action={reviewedAction} values={writeValues} />
            {pullRequestProblem && (
              <p
                role="alert"
                className="text-xs leading-6 text-destructive-foreground"
              >
                {l(pullRequestProblem.en, pullRequestProblem.es)}
              </p>
            )}
            {transitionFieldsProblem && (
              <p
                role="alert"
                className="text-xs leading-6 text-destructive-foreground"
              >
                {l(transitionFieldsProblem.en, transitionFieldsProblem.es)}
              </p>
            )}
            {(pullRequest || transition) && !permitted && (
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
            <Button
              appearance="gradient"
              disabled={
                !action ||
                write.pending ||
                !resourceIds.includes(destinationId) ||
                Boolean(invalidProductField(reviewedAction, writeValues)) ||
                Boolean(pullRequestProblem) ||
                Boolean(transitionFieldsProblem) ||
                transitionRead.pending ||
                (update &&
                  (Boolean(comparison) ||
                    remoteRead.pending ||
                    write.errorCode === "conflict")) ||
                ((pullRequest || transition) && !permitted) ||
                (transition && (!target || !transitionId)) ||
                (update
                  ? !targetId
                  : action.kind === "publish-message"
                    ? !body.trim()
                    : !title.trim())
              }
              onClick={() => stage(reviewedAction, writeValues)}
            >
              <Send />
              {pullRequest
                ? l("Review pull request", "Revisar pull request")
                : transition
                  ? l(
                      "Review issue transition",
                      "Revisar transición de incidencia",
                    )
                  : propertyUpdate
                    ? l("Review CRM update", "Revisar cambio CRM")
                    : l(
                        "Review destination action",
                        "Revisar acción de destino",
                      )}
            </Button>
            <ProductActionUnavailable action={action} />
            <ProductOperationFeedback operation={write} />
            {write.result && (
              <div
                role="region"
                aria-label={
                  pullRequest
                    ? l(
                        "Reported pull request result",
                        "Resultado reportado del pull request",
                      )
                    : transition
                      ? l(
                          "Reported issue transition result",
                          "Resultado reportado de la transición",
                        )
                      : l(
                          "Destination action result",
                          "Resultado de acción de destino",
                        )
                }
                className="space-y-3"
              >
                {(pullRequest || transition) && (
                  <>
                    <h4 className="text-xs font-semibold">
                      {pullRequest
                        ? l(
                            "Reported pull request result",
                            "Resultado reportado del pull request",
                          )
                        : l(
                            "Reported issue transition result",
                            "Resultado reportado de la transición",
                          )}
                    </h4>
                    <p className="text-xs leading-6 text-muted-foreground">
                      {l(
                        "State reported by this connection. A queued job or acknowledgement does not confirm completion.",
                        "Estado informado por esta conexión. Un trabajo en cola o una confirmación de recepción no acredita que haya terminado.",
                      )}
                    </p>
                    {pullRequest && write.result.kind === "record" && (
                      <p className="text-xs font-medium">
                        {l("Reported state", "Estado reportado")}:{" "}
                        {write.result.record.status === "draft"
                          ? l("Draft", "Borrador")
                          : write.result.record.status === "open"
                            ? l("Open", "Abierto")
                            : write.result.record.status}
                      </p>
                    )}
                  </>
                )}
                <ProductResult result={write.result} />
              </div>
            )}
          </div>
        </ProductPanel>
      </div>
      {findProductAction(props.definition, "save-document") && (
        <ProductDocumentWorkbench {...props} />
      )}
      {findProductAction(props.definition, "execute-tool", "run-agent") && (
        <ProductAgentsWorkbench {...props} />
      )}
      {review && (
        <ProductReview
          action={review.action}
          values={review.values}
          pending={write.pending}
          disabled={
            staleReview ||
            (Boolean(review.target) &&
              (Boolean(comparison) || remoteRead.pending))
          }
          grantedPermissions={props.connection.grantedPermissions}
          onConfirm={() => {
            void submit();
          }}
          onReject={() => setReview(null)}
        >
          {review.target && (
            <div className="mb-4 space-y-2 rounded-xl border border-border bg-surface-subtle/40 p-4 text-xs leading-6">
              <p>
                {l("Reviewed record", "Registro revisado")}:{" "}
                {review.target.name} · {review.target.id}
              </p>
              <p data-reviewed-target-revision={review.target.updatedAt}>
                {l("Reviewed remote revision", "Revisión remota revisada")}:{" "}
                {review.target.updatedAt}
              </p>
              {staleReview && (
                <p role="alert" className="text-destructive-foreground">
                  {l(
                    "The target changed after this review. Read it again and review your preserved draft.",
                    "El registro cambió después de esta revisión. Léelo de nuevo y revisa tu borrador conservado.",
                  )}
                </p>
              )}
            </div>
          )}
          {(review.action.kind === "create-pull-request" ||
            review.action.kind === "transition-issue") && (
            <div className="mb-4 space-y-2 rounded-xl border border-border bg-surface-subtle/40 p-4 text-xs leading-6">
              <p className="font-semibold">
                {review.action.kind === "create-pull-request"
                  ? l("Pull request review", "Revisión del pull request")
                  : l(
                      "Jira issue transition review",
                      "Revisión de transición Jira",
                    )}
              </p>
              <p>
                {review.action.kind === "create-pull-request"
                  ? l("Repository", "Repositorio")
                  : l("Project", "Proyecto")}
                : {destination?.name ?? destinationId} · {destinationId}
              </p>
              {review.action.kind === "create-pull-request" ? (
                <p>
                  {review.values.draft === true
                    ? l(
                        "Create as a draft pull request",
                        "Crear como pull request en borrador",
                      )
                    : l(
                        "Create as an open pull request",
                        "Crear como pull request abierto",
                      )}
                </p>
              ) : (
                <>
                  <p>
                    {l("Issue", "Incidencia")}: {review.values.recordId} ·{" "}
                    {l("Current reported status", "Estado actual reportado")}:{" "}
                    {target?.status ?? "—"}
                  </p>
                  <p>
                    {l("Selected transition", "Transición elegida")}:{" "}
                    {reviewTransition
                      ? l(reviewTransition.label.en, reviewTransition.label.es)
                      : review.values.transitionId}{" "}
                    · {review.values.transitionId}
                  </p>
                  {typeof review.values.fields === "string" &&
                    review.values.fields && (
                      <p className="whitespace-pre-wrap wrap-break-word">
                        {l("Transition fields", "Campos de transición")}:{" "}
                        {review.values.fields}
                      </p>
                    )}
                </>
              )}
              <p className="text-muted-foreground">
                {props.adapter.mode === "demo"
                  ? l(
                      "Local preview. No repository or Jira account is changed.",
                      "Vista local. No se modifica ningún repositorio ni cuenta Jira.",
                    )
                  : l(
                      "The confirmed request uses this workspace’s connected account and permissions.",
                      "La solicitud confirmada usa la cuenta y los permisos conectados de este workspace.",
                    )}
              </p>
            </div>
          )}
          {review.action.kind === "map-fields" && (
            <div className="mb-4">
              <ul className="mb-4 space-y-2">
                {mapping.map((row) => (
                  <li key={`${row.source}:${row.target}`} className="text-xs">
                    {row.source} → {row.target}
                  </li>
                ))}
              </ul>
              <ProductDocumentValues values={mapped} />
            </div>
          )}
        </ProductReview>
      )}
    </div>
  );
}

function ProductDocumentValues({ values }: { values: IntegrationValues }) {
  const { l } = useLanguage();
  if (!Object.keys(values).length)
    return (
      <ProductEmpty>
        {l(
          "Choose a source record to preview mapped fields.",
          "Elige un registro fuente para revisar los campos mapeados.",
        )}
      </ProductEmpty>
    );
  return (
    <dl className="space-y-2">
      {Object.entries(values).map(([key, value]) => (
        <div key={key} className="rounded-lg border border-border p-3">
          <dt className="text-[11px] text-muted-foreground">{key}</dt>
          <dd className="mt-1 whitespace-pre-wrap wrap-break-word text-xs leading-6">
            {Array.isArray(value) ? value.join(", ") : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
