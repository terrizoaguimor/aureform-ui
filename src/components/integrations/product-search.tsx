"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import {
  integrationErrorMessage,
  useIntegrationOperation,
} from "@/hooks/use-integration-operation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type {
  IntegrationErrorCode,
  IntegrationSearchFacet,
  IntegrationSearchHit,
  IntegrationValues,
  IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import {
  findProductAction,
  invalidProductField,
  productActionValues,
  productScopeKey,
} from "./product-model";
import {
  searchBridgeErrorCode,
  serializeSearchFacets,
  type SearchFacetSelection,
} from "@/lib/integrations/search-bridge";
import { SearchBridgeFacets } from "./search-bridge-facets";
import {
  ProductActionUnavailable,
  ProductEmpty,
  ProductFields,
  ProductLabeledTextarea,
  ProductOperationFeedback,
  ProductPanel,
  ProductResourcePicker,
  ProductResult,
  ProductReview,
  ProductSearchResults,
  ProductValidation,
  useProductResources,
} from "./product-ui";

const searchAdapters = new WeakMap<
  IntegrationWorkbenchProps["adapter"],
  number
>();
let searchAdapterSequence = 0;

/** A replaced transport must not retain another backend's drafts or results. */
export function ProductSearchWorkbench(props: IntegrationWorkbenchProps) {
  let identity = searchAdapters.get(props.adapter);
  if (identity === undefined) {
    identity = ++searchAdapterSequence;
    searchAdapters.set(props.adapter, identity);
  }
  return (
    <ScopedProductSearchWorkbench
      key={`${productScopeKey(props)}:${identity}`}
      {...props}
    />
  );
}

function ScopedProductSearchWorkbench(props: IntegrationWorkbenchProps) {
  const { l, locale, number } = useLanguage();
  const operation = useIntegrationOperation(props);
  const indexRead = useIntegrationOperation(props);
  const indexWrite = useIntegrationOperation(props);
  const resources = useProductResources(props);
  const action = findProductAction(props.definition, "search", "query");
  const ingestAction = findProductAction(props.definition, "ingest");
  const reportAction = findProductAction(props.definition, "query");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [resourceId, setResourceId] = useState(
    props.connection.resourceIds[0] ?? "",
  );
  const [values, setValues] = useState<IntegrationValues>({});
  const [hits, setHits] = useState<IntegrationSearchHit[]>([]);
  const [facets, setFacets] = useState<IntegrationSearchFacet[]>([]);
  const [facetSelection, setFacetSelection] = useState<SearchFacetSelection>(
    {},
  );
  const [searchFailure, setSearchFailure] =
    useState<IntegrationErrorCode | null>(null);
  const mounted = useRef(false);
  const searchSequence = useRef(0);
  const searchPending = useRef(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [submitted, setSubmitted] = useState<{
    query: string;
    filter: string;
    resourceId: string;
    pageSize: number;
    values: IntegrationValues;
    facets: string;
    kind: "search" | "knowledge";
  } | null>(null);
  const changed =
    submitted &&
    (submitted.query !== query ||
      submitted.filter !== filter ||
      submitted.resourceId !== resourceId ||
      submitted.pageSize !== pageSize ||
      submitted.facets !== serializeSearchFacets(facetSelection) ||
      JSON.stringify(submitted.values) !== JSON.stringify(values));
  const [indexValues, setIndexValues] = useState<IntegrationValues>({});
  const [recordId, setRecordId] = useState("");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [ingestReview, setIngestReview] = useState<IntegrationValues | null>(
    null,
  );
  const preparedIngest = productActionValues(
    ingestAction,
    { ...indexValues, recordId, name, content },
    resourceId,
  );
  const prepared = productActionValues(
    action,
    {
      ...values,
      query,
      filter,
      facets: serializeSearchFacets(facetSelection),
      page: 0,
      pageNumber: 1,
      pageIndex: 0,
      pageSize,
      limit: pageSize,
      offset: 0,
    },
    resourceId,
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      searchSequence.current += 1;
      searchPending.current = false;
    };
  }, []);

  async function search(nextPage = 0, selection?: SearchFacetSelection) {
    if (!action || searchPending.current || props.scope.signal?.aborted) return;
    const searchQuery = nextPage === 0 ? query : (submitted?.query ?? query);
    const searchFilter =
      nextPage === 0 ? filter : (submitted?.filter ?? filter);
    const source =
      nextPage === 0 ? resourceId : (submitted?.resourceId ?? resourceId);
    const size = nextPage === 0 ? pageSize : (submitted?.pageSize ?? pageSize);
    const extra = nextPage === 0 ? values : (submitted?.values ?? values);
    const searchFacets =
      nextPage === 0
        ? serializeSearchFacets(selection ?? facetSelection)
        : (submitted?.facets ?? serializeSearchFacets(facetSelection));
    const input = productActionValues(
      action,
      {
        ...extra,
        query: searchQuery,
        filter: searchFilter,
        facets: searchFacets,
        page: nextPage,
        pageNumber: nextPage + 1,
        pageIndex: nextPage,
        pageSize: size,
        limit: size,
        offset: nextPage * size,
      },
      source,
    );
    if (!searchQuery.trim() || invalidProductField(action, input)) return;
    const ticket = ++searchSequence.current;
    searchPending.current = true;
    setSearchFailure(null);
    try {
      const result = await operation.run(action, input);
      if (
        !result ||
        !mounted.current ||
        ticket !== searchSequence.current ||
        props.scope.signal?.aborted
      )
        return;
      if (result.kind === "search" || result.kind === "knowledge") {
        setHits(result.hits);
        setFacets(result.kind === "search" ? (result.facets ?? []) : []);
        setTotal(result.kind === "search" ? result.total : result.hits.length);
        setPage(nextPage);
        setSubmitted({
          query: searchQuery,
          filter: searchFilter,
          resourceId: source,
          pageSize: size,
          values: Object.fromEntries(
            Object.entries(extra).map(([key, value]) => [
              key,
              Array.isArray(value) ? [...value] : value,
            ]),
          ),
          facets: searchFacets,
          kind: result.kind,
        });
      } else {
        setHits([]);
        setFacets([]);
        setSubmitted(null);
      }
    } catch (cause) {
      if (mounted.current && ticket === searchSequence.current)
        setSearchFailure(searchBridgeErrorCode(cause));
    } finally {
      if (ticket === searchSequence.current) searchPending.current = false;
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <ProductPanel
        title={l("Search connected sources", "Buscar en fuentes conectadas")}
        description={l(
          "Keep the source ranking and inspect the matching passage before opening a result.",
          "Conserva el orden de la fuente y revisa el fragmento coincidente antes de abrir un resultado.",
        )}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
          className="space-y-4"
        >
          <label className="block space-y-2 text-xs font-medium">
            {l("Search query", "Consulta de búsqueda")}
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={l(
                "What are you looking for?",
                "¿Qué estás buscando?",
              )}
              required
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <ProductResourcePicker
              {...resources}
              value={resourceId}
              onChange={(value) => {
                searchSequence.current += 1;
                searchPending.current = false;
                operation.reset();
                indexRead.reset();
                indexWrite.reset();
                setResourceId(value);
                setIngestReview(null);
                setHits([]);
                setTotal(0);
                setPage(0);
                setFacets([]);
                setFacetSelection({});
                setSearchFailure(null);
                setSubmitted(null);
              }}
            />
            <label className="block space-y-2 text-xs font-medium">
              {l("Source filter", "Filtro de la fuente")}
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={l(
                  "Optional source expression",
                  "Expresión opcional de la fuente",
                )}
              />
            </label>
            <Select
              label={l("Results per page", "Resultados por página")}
              value={String(pageSize)}
              options={[5, 10, 20].map((value) => ({
                value: String(value),
                label: String(value),
              }))}
              onValueChange={(value) => setPageSize(Number(value))}
            />
          </div>
          <ProductFields
            action={action}
            values={values}
            onChange={setValues}
            exclude={[
              "query",
              "filter",
              "facets",
              "facetRef",
              "resourceId",
              "page",
              "pageNumber",
              "pageIndex",
              "pageSize",
              "limit",
              "offset",
            ]}
          />
          <ProductValidation action={action} values={prepared} />
          <Button
            type="submit"
            appearance="gradient"
            loading={operation.pending}
            disabled={
              !action ||
              !query.trim() ||
              Boolean(invalidProductField(action, prepared))
            }
          >
            <Search />
            {l("Search", "Buscar")}
          </Button>
        </form>
        <div className="mt-4">
          <ProductActionUnavailable action={action} />
          <ProductOperationFeedback operation={operation} />
          {searchFailure && (
            <Alert
              variant="destructive"
              title={integrationErrorMessage(searchFailure, locale)}
            />
          )}
          {(operation.error || searchFailure) && (
            <Button
              className="mt-3"
              variant="outline"
              disabled={operation.pending}
              onClick={() => void search()}
            >
              {l("Retry search", "Reintentar búsqueda")}
            </Button>
          )}
        </div>
      </ProductPanel>
      {submitted?.kind === "search" && (
        <SearchBridgeFacets
          facets={facets}
          selection={facetSelection}
          pending={operation.pending}
          changed={Boolean(changed)}
          canApply={Boolean(
            action && query.trim() && !invalidProductField(action, prepared),
          )}
          onChange={setFacetSelection}
          onApply={() => void search(0)}
          onClear={() => {
            setFacetSelection({});
            void search(0, {});
          }}
        />
      )}
      <ProductPanel
        title={
          submitted
            ? `${number(total)} ${
                submitted.kind === "knowledge"
                  ? l("returned passages", "fragmentos devueltos")
                  : l("results", "resultados")
              }`
            : l("Ranked results", "Resultados ordenados")
        }
      >
        {changed && (
          <p
            role="status"
            className="mb-4 rounded-lg bg-accent p-3 text-xs leading-6"
          >
            {l(
              "Showing the previous query. Run Search to apply your edits.",
              "Se muestra la consulta anterior. Pulsa Buscar para aplicar los cambios.",
            )}
          </p>
        )}
        {hits.length ? (
          <ProductSearchResults hits={hits} query={submitted?.query ?? ""} />
        ) : (
          <ProductEmpty>
            {submitted
              ? l(
                  "No matching passages. Try a broader query or another authorized source.",
                  "No hay fragmentos coincidentes. Prueba una consulta más amplia u otra fuente autorizada.",
                )
              : l(
                  "Run a query to see ranked passages and source links.",
                  "Ejecuta una consulta para ver fragmentos ordenados y enlaces a sus fuentes.",
                )}
          </ProductEmpty>
        )}
        {submitted?.kind === "search" && (
          <nav
            aria-label={l("Search result pages", "Páginas de resultados")}
            className="mt-5 flex flex-wrap items-center justify-between gap-3"
          >
            <p className="text-xs text-muted-foreground">
              {l("Page", "Página")} {page + 1} · {number(total)}{" "}
              {l("results", "resultados")}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={operation.pending || page === 0 || Boolean(changed)}
                onClick={() => {
                  void search(page - 1);
                }}
              >
                <ChevronLeft />
                {l("Previous", "Anterior")}
              </Button>
              <Button
                variant="outline"
                disabled={
                  operation.pending ||
                  (page + 1) * submitted.pageSize >= total ||
                  Boolean(changed)
                }
                onClick={() => {
                  void search(page + 1);
                }}
              >
                {l("Next", "Siguiente")}
                <ChevronRight />
              </Button>
            </div>
          </nav>
        )}
        {operation.result &&
          !["search", "knowledge"].includes(operation.result.kind) && (
            <ProductResult result={operation.result} />
          )}
      </ProductPanel>
      {(ingestAction || (reportAction && reportAction.id !== action?.id)) && (
        <ProductPanel
          title={l("Index documents", "Indexar documentos")}
          description={l(
            "Review a document's stable ID and content before sending it to the selected index. The backend reports indexing outcomes.",
            "Revisa el ID estable y el contenido del documento antes de enviarlo al índice seleccionado. El backend informa el resultado de la indexación.",
          )}
        >
          {ingestAction && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-xs font-medium">
                  {l("Document ID", "ID del documento")}
                  <Input
                    value={recordId}
                    disabled={indexWrite.pending}
                    onChange={(event) => {
                      setRecordId(event.target.value);
                      setIngestReview(null);
                    }}
                  />
                </label>
                <label className="space-y-2 text-xs font-medium">
                  {l("Document name", "Nombre del documento")}
                  <Input
                    value={name}
                    disabled={indexWrite.pending}
                    onChange={(event) => {
                      setName(event.target.value);
                      setIngestReview(null);
                    }}
                  />
                </label>
              </div>
              <ProductLabeledTextarea
                label={l("Document content", "Contenido del documento")}
                value={content}
                disabled={indexWrite.pending}
                onChange={(event) => {
                  setContent(event.target.value);
                  setIngestReview(null);
                }}
              />
              <ProductFields
                action={ingestAction}
                values={indexValues}
                onChange={(value) => {
                  setIndexValues(value);
                  setIngestReview(null);
                }}
                exclude={["resourceId", "recordId", "name", "content"]}
                disabled={indexWrite.pending}
              />
              <ProductValidation
                action={ingestAction}
                values={preparedIngest}
              />
              <Button
                appearance="gradient"
                disabled={
                  indexWrite.pending ||
                  Boolean(invalidProductField(ingestAction, preparedIngest))
                }
                onClick={() => setIngestReview(preparedIngest)}
              >
                {l("Review index update", "Revisar actualización del índice")}
              </Button>
              <ProductOperationFeedback operation={indexWrite} />
              {indexWrite.result && (
                <ProductResult result={indexWrite.result} />
              )}
            </div>
          )}
          {reportAction && reportAction.id !== action?.id && (
            <div className="mt-5 space-y-4 border-t border-border pt-5">
              <ProductFields
                action={reportAction}
                values={indexValues}
                onChange={setIndexValues}
                exclude={["resourceId"]}
              />
              <Button
                variant="outline"
                loading={indexRead.pending}
                disabled={
                  indexWrite.pending ||
                  Boolean(
                    invalidProductField(
                      reportAction,
                      productActionValues(
                        reportAction,
                        indexValues,
                        resourceId,
                      ),
                    ),
                  )
                }
                onClick={() => {
                  void indexRead.run(
                    reportAction,
                    productActionValues(reportAction, indexValues, resourceId),
                  );
                }}
              >
                <RefreshCw />
                {l(reportAction.label.en, reportAction.label.es)}
              </Button>
              <ProductOperationFeedback operation={indexRead} />
              {indexRead.result && <ProductResult result={indexRead.result} />}
            </div>
          )}
        </ProductPanel>
      )}
      {ingestReview && ingestAction && (
        <ProductReview
          action={ingestAction}
          values={ingestReview}
          pending={indexWrite.pending}
          grantedPermissions={props.connection.grantedPermissions}
          onReject={() => setIngestReview(null)}
          onConfirm={() => {
            void indexWrite.run(ingestAction, ingestReview).then((result) => {
              if (result) setIngestReview(null);
            });
          }}
        />
      )}
    </div>
  );
}
