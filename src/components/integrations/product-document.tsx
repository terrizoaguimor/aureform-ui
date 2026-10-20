"use client";

import { useRef, useState, type ReactNode } from "react";
import { Bold, Heading2, List, Plus, RefreshCw, Save } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useIntegrationOperation } from "@/hooks/use-integration-operation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  IntegrationDocument,
  IntegrationValues,
  IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import {
  findProductAction,
  invalidProductField,
  productActionValues,
} from "./product-model";
import {
  ProductActionUnavailable,
  ProductDate,
  ProductDocumentPreview,
  ProductFields,
  ProductOperationFeedback,
  ProductPanel,
  ProductRecordList,
  ProductResourcePicker,
  ProductResult,
  ProductReview,
  ProductValidation,
  useProductResources,
} from "./product-ui";
import {
  productBlankDocument,
  productDocumentFormats,
} from "./product-document-defaults";

export type ProductDocumentEditorProps = {
  value: IntegrationDocument;
  onChange: (
    value: Pick<IntegrationDocument, "title" | "content" | "format">,
  ) => void;
  disabled: boolean;
  locale: "en" | "es";
};
export type ProductEditorRenderer = (
  props: ProductDocumentEditorProps,
) => ReactNode;

export function ProductDocumentWorkbench(
  props: IntegrationWorkbenchProps & { renderEditor?: ProductEditorRenderer },
) {
  const { l, locale } = useLanguage();
  const read = useIntegrationOperation(props);
  const write = useIntegrationOperation(props);
  const resources = useProductResources(props);
  const queryAction = findProductAction(props.definition, "query");
  const saveAction = findProductAction(props.definition, "save-document");
  const [resourceId, setResourceId] = useState(
    props.connection.resourceIds[0] ?? "",
  );
  const [documentId, setDocumentId] = useState(
    props.connection.resourceIds[0] ?? "",
  );
  const [base, setBase] = useState<IntegrationDocument | null>(null);
  const [draft, setDraft] = useState<IntegrationDocument>(() =>
    productBlankDocument(saveAction, props.definition.id),
  );
  const [remote, setRemote] = useState<IntegrationDocument | null>(null);
  const [readValues, setReadValues] = useState<IntegrationValues>({});
  const [extra, setExtra] = useState<IntegrationValues>({});
  const [review, setReview] = useState<IntegrationValues | null>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const dirty =
    !base ||
    ["title", "content", "format"].some(
      (key) =>
        draft[key as "title" | "content" | "format"] !==
        base[key as "title" | "content" | "format"],
    );
  let validJson = true;
  if (draft.format === "json") {
    try {
      JSON.parse(draft.content);
    } catch {
      validJson = false;
    }
  }
  const saveValues = productActionValues(
    saveAction,
    {
      ...extra,
      documentId: draft.id || documentId,
      id: draft.id || documentId,
      title: draft.title,
      content: draft.content,
      format: draft.format,
      revision: base?.revision ?? 0,
      expectedRevision: base?.revision ?? 0,
    },
    resourceId,
  );
  const blocked = write.pending || read.pending;

  function accept(document: IntegrationDocument) {
    setBase(document);
    setDraft(document);
    setDocumentId(document.id);
    setRemote(null);
    setReview(null);
    write.reset();
  }
  async function load(id = documentId) {
    if (!queryAction) return;
    const values = productActionValues(
      queryAction,
      { ...readValues, documentId: id, id, view: "document" },
      resourceId,
    );
    if (invalidProductField(queryAction, values)) return;
    const result = await read.run(queryAction, values);
    if (result?.kind === "document") {
      if (
        base?.id === result.document.id &&
        result.document.revision < base.revision
      )
        return;
      if (base && dirty) setRemote(result.document);
      else accept(result.document);
    }
  }
  function change(
    value: Pick<IntegrationDocument, "title" | "content" | "format">,
  ) {
    setDraft((previous) => ({ ...previous, ...value }));
    setReview(null);
  }
  function insert(prefix: string, suffix = "") {
    const start = editor.current?.selectionStart ?? draft.content.length;
    const end = editor.current?.selectionEnd ?? start;
    change({
      ...draft,
      content: `${draft.content.slice(0, start)}${prefix}${draft.content.slice(start, end)}${suffix}${draft.content.slice(end)}`,
    });
    requestAnimationFrame(() => {
      editor.current?.focus();
      editor.current?.setSelectionRange(
        start + prefix.length,
        end + prefix.length,
      );
    });
  }
  async function save() {
    if (!saveAction || !review) return;
    const result = await write.run(saveAction, review);
    if (result?.kind === "document") accept(result.document);
    else if (result) setReview(null);
  }

  return (
    <div className="space-y-5">
      <ProductPanel
        title={l("Document workspace", "Espacio de documentos")}
        description={l(
          "Edit Markdown, text or structured documents with a versioned save.",
          "Edita Markdown, texto o documentos estructurados con guardado por versión.",
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ProductResourcePicker
            {...resources}
            value={resourceId}
            onChange={(value) => {
              setResourceId(value);
              setDocumentId(value);
              setBase(null);
              setDraft(productBlankDocument(saveAction, props.definition.id));
              read.reset();
              write.reset();
              setRemote(null);
              setReview(null);
            }}
            disabled={blocked || Boolean(base && dirty)}
          />
          <label className="space-y-2 text-xs font-medium">
            {l("Document ID", "ID del documento")}
            <Input
              value={documentId}
              onChange={(event) => {
                setDocumentId(event.target.value);
                setReview(null);
              }}
              disabled={blocked}
              placeholder={l(
                "Open an existing document",
                "Abrir un documento existente",
              )}
            />
          </label>
        </div>
        <div className="mt-4">
          <ProductFields
            action={queryAction}
            values={readValues}
            onChange={setReadValues}
            exclude={["resourceId", "id", "documentId"]}
            disabled={blocked}
          />
        </div>
        <div className="my-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            loading={read.pending}
            disabled={!queryAction || write.pending}
            onClick={() => {
              void load();
            }}
          >
            <RefreshCw />
            {l("Load document", "Cargar documento")}
          </Button>
          <Button
            variant="outline"
            disabled={blocked || Boolean(base && dirty)}
            onClick={() => {
              setBase(null);
              setDraft(productBlankDocument(saveAction, props.definition.id));
              setDocumentId("");
              setRemote(null);
              setReview(null);
              write.reset();
            }}
          >
            <Plus />
            {l("New document", "Nuevo documento")}
          </Button>
          {base && (
            <p className="self-center text-[11px] text-muted-foreground">
              {l("Revision", "Revisión")} {base.revision} ·{" "}
              <ProductDate value={base.updatedAt} />
            </p>
          )}
        </div>
        <ProductActionUnavailable action={queryAction} />
        <ProductOperationFeedback operation={read} />
        {read.result?.kind === "records" && (
          <ProductRecordList
            records={read.result.records}
            onSelect={(record) => {
              setDocumentId(record.id);
              void load(record.id);
            }}
            selected={base?.id}
          />
        )}
      </ProductPanel>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <ProductPanel
          title={l("Editor", "Editor")}
          description={
            dirty
              ? l("Unsaved changes", "Cambios sin guardar")
              : l(
                  "Matches the stored revision",
                  "Coincide con la versión guardada",
                )
          }
        >
          {props.renderEditor ? (
            props.renderEditor({
              value: draft,
              onChange: change,
              disabled: blocked,
              locale,
            })
          ) : (
            <div className="space-y-4">
              <label className="block space-y-2 text-xs font-medium">
                {l("Title", "Título")}
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    change({ ...draft, title: event.target.value })
                  }
                  disabled={blocked}
                />
              </label>
              <Select
                label={l("Document format", "Formato del documento")}
                value={draft.format}
                onValueChange={(value) =>
                  change({
                    ...draft,
                    format: value as IntegrationDocument["format"],
                  })
                }
                options={[
                  { value: "markdown", label: "Markdown" },
                  { value: "text", label: l("Plain text", "Texto") },
                  {
                    value: "json",
                    label: l("Structured JSON", "JSON estructurado"),
                  },
                ].filter((option) =>
                  productDocumentFormats(saveAction).includes(
                    option.value as IntegrationDocument["format"],
                  ),
                )}
                disabled={blocked}
              />
              {draft.format === "markdown" && (
                <div
                  role="toolbar"
                  aria-label={l("Formatting", "Formato")}
                  className="flex flex-wrap gap-2"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={l("Bold", "Negrita")}
                    disabled={blocked}
                    onClick={() => insert("**", "**")}
                  >
                    <Bold />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={l("Heading", "Encabezado")}
                    disabled={blocked}
                    onClick={() => insert("\n## ")}
                  >
                    <Heading2 />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={l("List item", "Elemento de lista")}
                    disabled={blocked}
                    onClick={() => insert("\n- ")}
                  >
                    <List />
                  </Button>
                </div>
              )}
              <label className="block space-y-2 text-xs font-medium">
                {l("Document content", "Contenido del documento")}
                <Textarea
                  ref={editor}
                  value={draft.content}
                  onChange={(event) =>
                    change({ ...draft, content: event.target.value })
                  }
                  className="min-h-72 font-mono text-xs"
                  disabled={blocked}
                  aria-invalid={!validJson}
                  spellCheck={draft.format !== "json"}
                />
              </label>
            </div>
          )}
          {!validJson && (
            <p
              role="alert"
              className="mt-3 text-xs text-destructive-foreground"
            >
              {l(
                "Correct the JSON syntax before saving.",
                "Corrige la sintaxis JSON antes de guardar.",
              )}
            </p>
          )}
          <div className="my-4">
            <ProductFields
              action={saveAction}
              values={extra}
              onChange={(value) => {
                setExtra(value);
                setReview(null);
              }}
              exclude={[
                "resourceId",
                "id",
                "documentId",
                "title",
                "content",
                "format",
                "revision",
                "expectedRevision",
              ]}
              disabled={blocked}
            />
          </div>
          <ProductValidation action={saveAction} values={saveValues} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              appearance="gradient"
              disabled={
                !saveAction ||
                blocked ||
                !draft.title.trim() ||
                !validJson ||
                Boolean(invalidProductField(saveAction, saveValues)) ||
                write.errorCode === "conflict"
              }
              onClick={() => setReview(saveValues)}
            >
              <Save />
              {l("Review and save", "Revisar y guardar")}
            </Button>
            {base && (
              <Button
                variant="outline"
                disabled={blocked}
                onClick={() => accept(base)}
              >
                {l("Discard local changes", "Descartar cambios locales")}
              </Button>
            )}
          </div>
          <div className="mt-4">
            <ProductActionUnavailable action={saveAction} />
            <ProductOperationFeedback operation={write} />
          </div>
          {write.result && write.result.kind !== "document" && (
            <div className="mt-4">
              <ProductResult result={write.result} />
              <p className="mt-2 text-xs text-muted-foreground">
                {l(
                  "Reload to confirm the stored document revision.",
                  "Recarga para confirmar la versión del documento guardado.",
                )}
              </p>
            </div>
          )}
        </ProductPanel>
        <ProductPanel title={l("Preview", "Vista previa")}>
          <ProductDocumentPreview
            content={draft.content}
            format={draft.format}
          />
        </ProductPanel>
      </div>
      {(remote || write.errorCode === "conflict") && (
        <ProductPanel
          title={l(
            "Resolve a document conflict",
            "Resolver un conflicto de documento",
          )}
        >
          <p className="mb-4 text-xs leading-6">
            {l(
              "Your edits are preserved. Load the latest revision and compare it before choosing which version to keep.",
              "Tus cambios se conservan. Carga la versión actual y compárala antes de elegir qué versión conservar.",
            )}
          </p>
          {remote && (
            <div className="mb-4">
              <p className="mb-3 text-xs font-medium">
                {remote.title} · {l("Revision", "Revisión")} {remote.revision}
              </p>
              <ProductDocumentPreview
                content={remote.content}
                format={remote.format}
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              loading={read.pending}
              onClick={() => {
                void load(base?.id ?? documentId);
              }}
            >
              {l("Load latest revision", "Cargar versión actual")}
            </Button>
            {remote && (
              <>
                <Button variant="outline" onClick={() => accept(remote)}>
                  {l("Use remote content", "Usar contenido remoto")}
                </Button>
                <Button
                  appearance="gradient"
                  onClick={() => {
                    setBase(remote);
                    setDraft((value) => ({
                      ...value,
                      id: remote.id,
                      revision: remote.revision,
                    }));
                    setDocumentId(remote.id);
                    setRemote(null);
                    setReview(null);
                    write.reset();
                  }}
                >
                  {l(
                    "Keep edits, use latest revision",
                    "Conservar cambios y usar revisión actual",
                  )}
                </Button>
              </>
            )}
          </div>
        </ProductPanel>
      )}
      {review && saveAction && (
        <ProductReview
          action={saveAction}
          values={review}
          pending={write.pending}
          grantedPermissions={props.connection.grantedPermissions}
          onConfirm={() => {
            void save();
          }}
          onReject={() => setReview(null)}
        />
      )}
    </div>
  );
}
