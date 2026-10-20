"use client";

import { useCallback, useEffect, useState } from "react";
import { FileUp, RefreshCw, Search, ThumbsUp, Trash2 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useIntegrationOperation } from "@/hooks/use-integration-operation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  IntegrationAction,
  IntegrationJob,
  IntegrationRecord,
  IntegrationResult,
  IntegrationSearchHit,
  IntegrationValues,
  IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import {
  findProductAction,
  invalidProductField,
  mergeProductRecords,
  productActionValues,
} from "./product-model";
import {
  ProductActionUnavailable,
  ProductEmpty,
  ProductFields,
  ProductJobResult,
  ProductLabeledTextarea,
  ProductOperationFeedback,
  ProductPanel,
  ProductResourcePicker,
  ProductResult,
  ProductReview,
  ProductSearchResults,
  ProductStatus,
  ProductValidation,
  useProductResources,
} from "./product-ui";
import {
  productReportedRemoval,
  productSourceRemovalResult,
  type ProductSourceRemoval,
} from "./product-source-removal";

export function ProductKnowledgeWorkbench(props: IntegrationWorkbenchProps) {
  const { l, locale } = useLanguage();
  const read = useIntegrationOperation(props);
  const readRun = read.run;
  const readPending = read.pending;
  const upload = useIntegrationOperation(props);
  const ingest = useIntegrationOperation(props);
  const search = useIntegrationOperation(props);
  const evaluate = useIntegrationOperation(props);
  const remove = useIntegrationOperation(props);
  const resources = useProductResources(props);
  const queryAction = findProductAction(props.definition, "query");
  const ingestAction = findProductAction(props.definition, "ingest");
  const searchAction = findProductAction(props.definition, "search");
  const evaluateAction = findProductAction(props.definition, "evaluate");
  const cancelAction = findProductAction(props.definition, "cancel-job");
  const deleteAction = findProductAction(props.definition, "delete-source");
  const [resourceId, setResourceId] = useState(
    props.connection.resourceIds[0] ?? "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [uploadReview, setUploadReview] = useState<{
    file: File;
    alt: string;
  } | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [asset, setAsset] = useState<Extract<
    IntegrationResult,
    { kind: "upload" }
  > | null>(null);
  const [sources, setSources] = useState<IntegrationRecord[]>([]);
  const [indexStatus, setIndexStatus] = useState<string | null>(null);
  const [job, setJob] = useState<IntegrationJob | null>(null);
  const [follow, setFollow] = useState(false);
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [hits, setHits] = useState<IntegrationSearchHit[]>([]);
  const [selectedHit, setSelectedHit] = useState("");
  const [rating, setRating] = useState("relevant");
  const [feedback, setFeedback] = useState("");
  const [extra, setExtra] = useState<IntegrationValues>({});
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [removal, setRemoval] = useState<ProductSourceRemoval | null>(null);
  const [review, setReview] = useState<{
    action: IntegrationAction;
    values: IntegrationValues;
    operation: "ingest" | "evaluate" | "cancel" | "delete";
    source?: IntegrationRecord;
  } | null>(null);
  const selectedSource = sources.find(
    (source) => source.id === selectedSourceId,
  );
  const removalActive = Boolean(
    removal &&
    ["submitted", "pending", "awaiting-status"].includes(removal.phase),
  );

  const accept = useCallback(
    (result: IntegrationResult | null, deletionSourceId?: string) => {
      if (!result) return;
      if (result?.kind === "knowledge") {
        setSources(result.documents);
        setIndexStatus(result.status);
      }
      if (result?.kind === "records") setSources(result.records);
      if (result.kind === "record")
        setSources((current) => mergeProductRecords(current, [result.record]));
      if (["knowledge", "records", "record"].includes(result.kind)) {
        setRemoval((current) =>
          current ? productSourceRemovalResult(current, result) : null,
        );
      }
      if (result?.kind === "job") {
        if (deletionSourceId) {
          setRemoval((current) =>
            current?.sourceId === deletionSourceId
              ? productSourceRemovalResult(current, result)
              : current,
          );
          return;
        }
        setJob(result.job);
        if (["completed", "failed", "cancelled"].includes(result.job.status))
          setFollow(false);
      }
      if (result.kind === "receipt" && deletionSourceId) {
        setRemoval((current) =>
          current?.sourceId === deletionSourceId
            ? productSourceRemovalResult(current, result)
            : current,
        );
      }
    },
    [setSources, setIndexStatus, setRemoval, setJob, setFollow],
  );
  const refresh = useCallback(async () => {
    if (!queryAction || readPending) return;
    const values = productActionValues(
      queryAction,
      {
        ...extra,
        view: removalActive ? "deletion" : job ? "ingestion" : "sources",
        jobId: removalActive ? (removal?.job?.id ?? "") : (job?.id ?? ""),
        ...(removalActive && removal
          ? {
              sourceId: removal.sourceId,
              documentId: removal.sourceId,
              recordId: removal.sourceId,
            }
          : {}),
      },
      resourceId,
    );
    if (invalidProductField(queryAction, values)) return;
    accept(
      await readRun(queryAction, values),
      removalActive ? removal?.sourceId : undefined,
    );
  }, [
    queryAction,
    readPending,
    readRun,
    extra,
    job,
    resourceId,
    removalActive,
    removal,
    accept,
  ]);
  useEffect(() => {
    if (
      removalActive ||
      !follow ||
      !job ||
      !["queued", "running"].includes(job.status)
    )
      return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [follow, job, refresh, removalActive]);

  async function uploadSource() {
    if (!uploadReview || upload.pending) return;
    const result = await upload.upload(uploadReview.file, uploadReview.alt);
    if (result?.kind === "upload") {
      setAsset(result);
      setUploadReview(null);
    }
  }
  function stage(
    action: IntegrationAction | undefined,
    values: IntegrationValues,
    operation: "ingest" | "evaluate" | "cancel" | "delete",
  ) {
    if (!action) return;
    const prepared = productActionValues(
      action,
      { ...extra, ...values },
      resourceId,
    );
    if (
      operation === "delete" &&
      (!selectedSource || productReportedRemoval(selectedSource) === "deleted")
    )
      return;
    if (!invalidProductField(action, prepared))
      setReview({
        action,
        values: prepared,
        operation,
        ...(operation === "delete" ? { source: selectedSource } : {}),
      });
  }
  async function submit() {
    if (!review) return;
    if (review.operation === "delete") {
      if (remove.pending || read.pending || removalActive) return;
      const source = sources.find((item) => item.id === review.source?.id);
      if (
        !source ||
        source.updatedAt !== review.source?.updatedAt ||
        productReportedRemoval(source) === "deleted"
      )
        return;
      read.cancel();
      search.cancel();
      setFollow(false);
      const pending: ProductSourceRemoval = {
        sourceId: source.id,
        name: source.name,
        source,
        phase: "submitted",
      };
      setRemoval(pending);
      const result = await remove.run(review.action, review.values);
      if (result) {
        accept(result, source.id);
        setReview(null);
        setHits([]);
        setSelectedHit("");
        setSearchedQuery("");
      } else {
        setRemoval((current) =>
          current?.sourceId === source.id && current.phase === "submitted"
            ? { ...current, phase: "unconfirmed" }
            : current,
        );
      }
      return;
    }
    const operation = review.operation === "evaluate" ? evaluate : ingest;
    const result = await operation.run(review.action, review.values);
    if (!result) return;
    accept(result);
    if (review.operation === "evaluate") setFeedback("");
    setReview(null);
  }
  async function searchSources() {
    if (!searchAction || !query.trim()) return;
    const values = productActionValues(
      searchAction,
      { ...extra, query },
      resourceId,
    );
    if (invalidProductField(searchAction, values)) return;
    const result = await search.run(searchAction, values);
    if (result?.kind === "knowledge" || result?.kind === "search") {
      setHits(result.hits);
      setSearchedQuery(query);
      setSelectedHit("");
      setReview(null);
      if (result.kind === "knowledge") accept(result);
    }
  }
  const ingestValues = productActionValues(
    ingestAction,
    {
      ...extra,
      assetId: asset?.asset.id ?? "",
      sourceId: asset?.asset.id ?? resourceId,
      sourceRef: asset?.asset.id || sourceUrl || resourceId,
      source: sourceUrl || asset?.asset.id || resourceId,
      url: sourceUrl,
      title: sourceName || asset?.asset.name || "",
      name: sourceName || asset?.asset.name || "",
      content: sourceContent,
    },
    resourceId,
  );
  const evaluationValues = productActionValues(
    evaluateAction,
    {
      ...extra,
      hitId: selectedHit,
      sourceId: hits.find((hit) => hit.id === selectedHit)?.source ?? "",
      query: searchedQuery,
      rating,
      feedback,
      comment: feedback,
    },
    resourceId,
  );
  const deletionValues = productActionValues(
    deleteAction,
    {
      ...extra,
      sourceId: selectedSource?.id ?? "",
      sourceRef: selectedSource?.id ?? "",
      documentId: selectedSource?.id ?? "",
      recordId: selectedSource?.id ?? "",
      id: selectedSource?.id ?? "",
      expectedUpdatedAt: selectedSource?.updatedAt ?? "",
    },
    resourceId,
  );
  const reviewSourceCurrent =
    review?.operation !== "delete" ||
    Boolean(
      review.source &&
      selectedSource &&
      review.source.id === selectedSource.id &&
      review.source.updatedAt === selectedSource.updatedAt &&
      productReportedRemoval(selectedSource) !== "deleted",
    );

  return (
    <div className="space-y-5">
      <ProductPanel
        title={l("Knowledge sources", "Fuentes de conocimiento")}
        description={l(
          "Inspect the access and indexing status reported for your selected source.",
          "Revisa el acceso y el estado de indexación reportados para tu fuente seleccionada.",
        )}
      >
        <ProductResourcePicker
          {...resources}
          value={resourceId}
          onChange={(value) => {
            [read, upload, ingest, search, evaluate, remove].forEach(
              (operation) => operation.reset(),
            );
            setResourceId(value);
            setSources([]);
            setHits([]);
            setAsset(null);
            setUploadReview(null);
            setJob(null);
            setReview(null);
            setIndexStatus(null);
            setFollow(false);
            setSelectedSourceId("");
            setRemoval(null);
          }}
          disabled={
            ingest.pending ||
            upload.pending ||
            evaluate.pending ||
            remove.pending ||
            removalActive
          }
        />
        <div className="mt-4">
          <ProductFields
            action={queryAction}
            values={extra}
            onChange={(value) => {
              setExtra(value);
              setReview(null);
            }}
            exclude={["resourceId", "view", "jobId"]}
          />
        </div>
        <div className="my-4 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            loading={read.pending}
            disabled={!queryAction || remove.pending}
            onClick={() => {
              void refresh();
            }}
          >
            <RefreshCw />
            {l("Refresh sources and access", "Actualizar fuentes y acceso")}
          </Button>
          {indexStatus && <ProductStatus value={indexStatus} />}
        </div>
        {sources.length ? (
          <ul
            className="space-y-3"
            aria-label={l(
              "Reported knowledge sources",
              "Fuentes de conocimiento reportadas",
            )}
          >
            {sources.map((source) => (
              <li
                key={source.id}
                className="rounded-xl border border-border bg-surface-subtle/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{source.name}</p>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      {source.description}
                    </p>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      {source.id}
                    </p>
                  </div>
                  <KnowledgeSourceStatus source={source} />
                </div>
                {deleteAction && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    disabled={
                      remove.pending ||
                      removalActive ||
                      productReportedRemoval(source) === "deleted"
                    }
                    aria-pressed={selectedSourceId === source.id}
                    onClick={() => {
                      setSelectedSourceId(source.id);
                      setReview(null);
                    }}
                  >
                    {l("Select source", "Seleccionar fuente")} · {source.name}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <ProductEmpty>
            {l(
              "Refresh to load sources and their reported access status.",
              "Actualiza para cargar fuentes y su acceso reportado.",
            )}
          </ProductEmpty>
        )}
        <div className="mt-3">
          <ProductOperationFeedback operation={read} />
          <ProductActionUnavailable action={queryAction} />
        </div>
      </ProductPanel>
      <ProductPanel
        title={l(
          "Remove a knowledge source",
          "Eliminar una fuente de conocimiento",
        )}
        description={l(
          "Choose a known source and review its removal. Deletion remains pending until your connected service reports its outcome.",
          "Elige una fuente conocida y revisa su eliminación. Quedará pendiente hasta que el servicio conectado informe el resultado.",
        )}
      >
        <div className="space-y-4">
          <Select
            label={l("Source to remove", "Fuente a eliminar")}
            value={selectedSourceId}
            options={sources.map((source) => ({
              value: source.id,
              label: source.name,
              disabled: productReportedRemoval(source) === "deleted",
            }))}
            onValueChange={(value) => {
              setSelectedSourceId(value);
              setReview(null);
            }}
            disabled={remove.pending || read.pending || removalActive}
          />
          {selectedSource && (
            <div className="rounded-xl bg-surface-subtle p-3">
              <p className="text-xs font-semibold">{selectedSource.name}</p>
              <p className="my-2 text-xs text-muted-foreground">
                {selectedSource.id}
              </p>
              <KnowledgeSourceStatus source={selectedSource} />
            </div>
          )}
          <ProductFields
            action={deleteAction}
            values={extra}
            onChange={(value) => {
              setExtra(value);
              setReview(null);
            }}
            exclude={[
              "resourceId",
              "sourceId",
              "sourceRef",
              "documentId",
              "recordId",
              "id",
              "expectedUpdatedAt",
            ]}
            disabled={remove.pending || removalActive}
          />
          <ProductValidation action={deleteAction} values={deletionValues} />
          <Button
            variant="outline"
            disabled={
              !deleteAction ||
              !selectedSource ||
              remove.pending ||
              read.pending ||
              removalActive ||
              productReportedRemoval(selectedSource) === "deleted" ||
              Boolean(invalidProductField(deleteAction, deletionValues))
            }
            onClick={() => stage(deleteAction, deletionValues, "delete")}
          >
            <Trash2 />
            {l("Review source removal", "Revisar eliminación de fuente")}
          </Button>
          <ProductActionUnavailable action={deleteAction} />
          <ProductOperationFeedback operation={remove} />
          {removal && (
            <div
              className="space-y-4 rounded-xl border border-border p-4"
              role="status"
            >
              <p className="text-xs font-semibold">{removal.name}</p>
              <KnowledgeRemovalStatus removal={removal} />
              {removal.source && (
                <KnowledgeSourceStatus source={removal.source} />
              )}
              {removal.job && removal.phase !== "deleted" && (
                <div className="space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    {l(
                      "Last reported deletion job",
                      "Último trabajo de eliminación reportado",
                    )}
                  </p>
                  <ProductJobResult job={removal.job} />
                </div>
              )}
              {removal.receipt && <ProductResult result={removal.receipt} />}
              <Button
                variant="outline"
                loading={read.pending}
                disabled={!queryAction || remove.pending}
                onClick={() => {
                  void refresh();
                }}
              >
                <RefreshCw />
                {l(
                  "Refresh deletion status",
                  "Actualizar estado de eliminación",
                )}
              </Button>
            </div>
          )}
        </div>
      </ProductPanel>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <ProductPanel
          title={l("Add and ingest a source", "Añadir e ingerir una fuente")}
        >
          <div className="space-y-4">
            <label className="block space-y-2 text-xs font-medium">
              {l("Source name", "Nombre de la fuente")}
              <Input
                value={sourceName}
                onChange={(event) => {
                  setSourceName(event.target.value);
                  setUploadReview(null);
                  setReview(null);
                }}
              />
            </label>
            <label className="block space-y-2 text-xs font-medium">
              {l("Source file", "Archivo de la fuente")}
              <Input
                type="file"
                accept=".pdf,.txt,.md,.markdown,.csv,.json,.docx"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setAsset(null);
                  setUploadReview(null);
                  setReview(null);
                  upload.reset();
                }}
                disabled={upload.pending || ingest.pending}
              />
            </label>
            <Button
              variant="outline"
              loading={upload.pending}
              disabled={!file || ingest.pending}
              onClick={() => {
                if (file)
                  setUploadReview({ file, alt: sourceName || file.name });
              }}
            >
              <FileUp />
              {l("Review source upload", "Revisar subida de fuente")}
            </Button>
            {uploadReview && (
              <div className="space-y-3 rounded-xl border border-primary/30 bg-accent/30 p-4">
                <p className="text-xs font-semibold">
                  {uploadReview.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {uploadReview.file.size.toLocaleString(
                    locale === "es" ? "es-CO" : "en-US",
                  )}{" "}
                  {l("bytes", "bytes")} ·{" "}
                  {uploadReview.file.type ||
                    l(
                      "Unspecified file type",
                      "Tipo de archivo sin especificar",
                    )}
                </p>
                <p className="text-xs">{uploadReview.alt}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    appearance="gradient"
                    loading={upload.pending}
                    onClick={() => {
                      void uploadSource();
                    }}
                  >
                    {l("Confirm upload", "Confirmar subida")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={upload.pending}
                    onClick={() => setUploadReview(null)}
                  >
                    {l("Back to editing", "Volver a editar")}
                  </Button>
                </div>
              </div>
            )}
            <ProductOperationFeedback operation={upload} />
            {asset && (
              <div className="rounded-xl bg-accent/40 p-3">
                <ProductResult result={asset} />
              </div>
            )}
            <label className="block space-y-2 text-xs font-medium">
              {l("Or source URL", "O URL de la fuente")}
              <Input
                type="url"
                value={sourceUrl}
                onChange={(event) => {
                  setSourceUrl(event.target.value);
                  setReview(null);
                }}
              />
            </label>
            <ProductLabeledTextarea
              label={l("Source content", "Contenido de la fuente")}
              value={sourceContent}
              onChange={(event) => {
                setSourceContent(event.target.value);
                setReview(null);
              }}
              disabled={ingest.pending}
            />
            <ProductFields
              action={ingestAction}
              values={extra}
              onChange={(value) => {
                setExtra(value);
                setReview(null);
              }}
              exclude={[
                "resourceId",
                "sourceId",
                "sourceRef",
                "assetId",
                "source",
                "url",
                "title",
                "name",
                "content",
              ]}
              disabled={ingest.pending}
            />
            <ProductValidation action={ingestAction} values={ingestValues} />
            <Button
              appearance="gradient"
              disabled={
                !ingestAction ||
                (!asset && !sourceUrl.trim() && !sourceContent.trim()) ||
                ingest.pending ||
                Boolean(invalidProductField(ingestAction, ingestValues))
              }
              onClick={() => stage(ingestAction, ingestValues, "ingest")}
            >
              {l("Review ingestion", "Revisar ingestión")}
            </Button>
            <ProductActionUnavailable action={ingestAction} />
            <ProductOperationFeedback operation={ingest} />
          </div>
        </ProductPanel>
        <ProductPanel title={l("Ingestion progress", "Progreso de ingestión")}>
          {job ? (
            <>
              <ProductJobResult job={job} />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <label className="flex min-h-11 items-center gap-2 text-xs">
                  <Checkbox
                    checked={follow}
                    onCheckedChange={setFollow}
                    disabled={
                      !queryAction ||
                      removalActive ||
                      !["queued", "running"].includes(job.status)
                    }
                  />
                  {l(
                    "Refresh progress every 5 seconds",
                    "Actualizar progreso cada 5 segundos",
                  )}
                </label>
                {cancelAction && (
                  <Button
                    variant="outline"
                    disabled={
                      ingest.pending ||
                      !["queued", "running"].includes(job.status)
                    }
                    onClick={() =>
                      stage(
                        cancelAction,
                        { jobId: job.id, id: job.id },
                        "cancel",
                      )
                    }
                  >
                    {l("Review job cancellation", "Revisar cancelación")}
                  </Button>
                )}
              </div>
            </>
          ) : ingest.result ? (
            <ProductResult result={ingest.result} />
          ) : (
            <ProductEmpty>
              {l(
                "Start ingestion to see the returned steps, progress and execution log.",
                "Inicia la ingestión para ver sus pasos, progreso y registro de ejecución.",
              )}
            </ProductEmpty>
          )}
          {job && ingest.result && ingest.result.kind !== "job" && (
            <div className="mt-4">
              <ProductResult result={ingest.result} />
            </div>
          )}
        </ProductPanel>
      </div>
      <ProductPanel title={l("Search with citations", "Buscar con citas")}>
        <form
          className="mb-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void searchSources();
          }}
        >
          <label className="block space-y-2 text-xs font-medium">
            {l("Question or query", "Pregunta o consulta")}
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              required
            />
          </label>
          <ProductFields
            action={searchAction}
            values={extra}
            onChange={setExtra}
            exclude={["resourceId", "query"]}
          />
          <Button
            type="submit"
            appearance="gradient"
            loading={search.pending}
            disabled={!searchAction || !query.trim()}
          >
            <Search />
            {l("Find source passages", "Buscar fragmentos fuente")}
          </Button>
        </form>
        <ProductOperationFeedback operation={search} />
        <ProductActionUnavailable action={searchAction} />
        {hits.length ? (
          <ProductSearchResults hits={hits} query={searchedQuery} />
        ) : (
          <ProductEmpty>
            {searchedQuery
              ? l(
                  "No matching source passages",
                  "No hay fragmentos fuente coincidentes",
                )
              : l(
                  "Search results will include the source passage and citation link returned by your backend.",
                  "Los resultados incluirán el fragmento fuente y el enlace de cita devueltos por tu backend.",
                )}
          </ProductEmpty>
        )}
        {search.result &&
          !["search", "knowledge"].includes(search.result.kind) && (
            <ProductResult result={search.result} />
          )}
      </ProductPanel>
      <ProductPanel title={l("Evaluate retrieval", "Evaluar recuperación")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={l("Citation to evaluate", "Cita para evaluar")}
            options={hits.map((hit, index) => ({
              value: hit.id,
              label: `[${index + 1}] ${hit.title}`,
            }))}
            value={selectedHit}
            onValueChange={(value) => {
              setSelectedHit(value);
              setReview(null);
            }}
          />
          <Select
            label={l("Assessment", "Evaluación")}
            value={rating}
            onValueChange={(value) => {
              setRating(value);
              setReview(null);
            }}
            options={[
              { value: "relevant", label: l("Relevant", "Relevante") },
              { value: "incorrect", label: l("Incorrect", "Incorrecta") },
              { value: "outdated", label: l("Outdated", "Desactualizada") },
              {
                value: "access-concern",
                label: l("Access concern", "Problema de acceso"),
              },
            ]}
          />
        </div>
        <div className="my-4">
          <ProductLabeledTextarea
            label={l("Evaluation notes", "Notas de evaluación")}
            value={feedback}
            onChange={(event) => {
              setFeedback(event.target.value);
              setReview(null);
            }}
          />
        </div>
        <ProductFields
          action={evaluateAction}
          values={extra}
          onChange={(value) => {
            setExtra(value);
            setReview(null);
          }}
          exclude={[
            "resourceId",
            "hitId",
            "sourceId",
            "query",
            "rating",
            "feedback",
            "comment",
          ]}
        />
        <div className="mt-4">
          <ProductValidation
            action={evaluateAction}
            values={evaluationValues}
          />
          <Button
            appearance="gradient"
            disabled={
              !evaluateAction ||
              !selectedHit ||
              evaluate.pending ||
              Boolean(invalidProductField(evaluateAction, evaluationValues))
            }
            onClick={() => stage(evaluateAction, evaluationValues, "evaluate")}
          >
            <ThumbsUp />
            {l("Review evaluation", "Revisar evaluación")}
          </Button>
        </div>
        <div className="mt-4">
          <ProductActionUnavailable action={evaluateAction} />
          <ProductOperationFeedback operation={evaluate} />
          <ProductResult result={evaluate.result} />
        </div>
      </ProductPanel>
      {review && (
        <ProductReview
          action={review.action}
          values={review.values}
          pending={ingest.pending || evaluate.pending || remove.pending}
          disabled={
            !reviewSourceCurrent ||
            (review.operation === "delete" && read.pending)
          }
          grantedPermissions={props.connection.grantedPermissions}
          onConfirm={() => {
            void submit();
          }}
          onReject={() => setReview(null)}
        >
          {review.operation === "delete" && review.source && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-semibold">{review.source.name}</p>
              <p className="mt-2 text-xs leading-6">
                {l(
                  "This requests removal of this source and its indexed data. Only a reported source deletion marks it as deleted.",
                  "Se solicita eliminar esta fuente y sus datos indexados. Solo se marcará como eliminada cuando el servicio lo reporte.",
                )}
              </p>
              {!reviewSourceCurrent && (
                <p role="alert" className="mt-2 text-xs">
                  {l(
                    "The selected source changed. Refresh and review the current source again.",
                    "La fuente seleccionada cambió. Actualiza y vuelve a revisar la fuente actual.",
                  )}
                </p>
              )}
            </div>
          )}
        </ProductReview>
      )}
    </div>
  );
}

function KnowledgeSourceStatus({ source }: { source: IntegrationRecord }) {
  const { l } = useLanguage();
  const status = productReportedRemoval(source);
  return (
    <ProductStatus
      value={
        status === "deleted"
          ? l(
              "Deleted · reported by service",
              "Eliminada · reportada por el servicio",
            )
          : status === "pending"
            ? l(
                "Deleting · reported by service",
                "Eliminando · reportado por el servicio",
              )
            : status === "failed"
              ? l(
                  "Deletion failed · reported by service",
                  "Eliminación fallida · reportada por el servicio",
                )
              : source.status
      }
    />
  );
}

function KnowledgeRemovalStatus({
  removal,
}: {
  removal: ProductSourceRemoval;
}) {
  const { l } = useLanguage();
  const labels: Record<ProductSourceRemoval["phase"], [string, string]> = {
    submitted: [
      "Submitting deletion request",
      "Enviando solicitud de eliminación",
    ],
    pending: [
      "Deletion pending · reported by service",
      "Eliminación pendiente · reportada por el servicio",
    ],
    "awaiting-status": [
      "Source deletion is not yet reported. Refresh its status.",
      "La eliminación de la fuente aún no ha sido reportada. Actualiza su estado.",
    ],
    deleted: [
      "Source deletion reported by service",
      "Eliminación de fuente reportada por el servicio",
    ],
    failed: [
      "Deletion failed · reported by service",
      "Eliminación fallida · reportada por el servicio",
    ],
    "request-failed": [
      "Deletion request failed; source state is unchanged in this view",
      "La solicitud falló; el estado de la fuente no cambió en esta vista",
    ],
    unconfirmed: [
      "The request outcome is unconfirmed. Refresh to inspect the source.",
      "El resultado de la solicitud no está confirmado. Actualiza para consultar la fuente.",
    ],
  };
  return <p className="text-xs leading-6">{l(...labels[removal.phase])}</p>;
}
