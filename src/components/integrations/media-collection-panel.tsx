"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon, RefreshCw } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { integrationErrorMessage } from "@/hooks/use-integration-operation";
import { ProductImageEditor } from "@/components/blocks/product-image-editor";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IntegrationError,
  type IntegrationConnection,
  type IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import {
  parseMediaCollection,
  type IntegrationMediaCollection,
  type MediaCollectionBinding,
} from "@/lib/integrations/media-collection";
import { withIntegrationCancellation } from "@/lib/integrations/cancelled-task";
import {
  integrationConnectionScopeKey,
  integrationConnectionSnapshotMatches,
} from "@/lib/integrations/connection-snapshot";
import { ProductEmpty, ProductPanel } from "./product-ui";

export function MediaCollectionPanel({
  binding,
  ...props
}: IntegrationWorkbenchProps & { binding?: MediaCollectionBinding }) {
  const { l, locale } = useLanguage();
  const [collection, setCollection] =
    useState<IntegrationMediaCollection | null>(null);
  const [draft, setDraft] = useState<IntegrationMediaCollection | null>(null);
  const [review, setReview] = useState<IntegrationMediaCollection | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const request = useRef<AbortController | null>(null);
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const draftScope = useRef<string | null>(null);
  const reviewConnection = useRef<IntegrationConnection | null>(null);
  const currentScope = integrationConnectionScopeKey(
    props.connection,
    props.scope.workspaceId,
  );
  const ready =
    props.connection.status === "connected" &&
    props.connection.grantedPermissions.includes("assets.read");
  const writable =
    ready &&
    props.connection.grantedPermissions.includes(
      props.definition.id === "cloudinary"
        ? "assets.transform"
        : "assets.upload",
    );
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    retry.current = null;
    draftScope.current = null;
    reviewConnection.current = null;
    setCollection(null);
    setDraft(null);
    setReview(null);
    setAcknowledged(false);
    setBusy(false);
    setError(null);
    setSaved(false);
    setConflict(false);
    return () => request.current?.abort();
  }, [binding, props.adapter, currentScope, ready]);
  const perform = useCallback(
    async (input?: IntegrationMediaCollection, keepDraft = false) => {
      if (!binding || !ready || request.current) return;
      if (
        input &&
        (draftScope.current !== currentScope ||
          !reviewConnection.current ||
          !integrationConnectionSnapshotMatches(
            reviewConnection.current,
            props.connection,
          ))
      ) {
        setReview(null);
        setAcknowledged(false);
        setError(integrationErrorMessage("conflict", locale));
        return;
      }
      const controller = new AbortController();
      request.current = controller;
      setBusy(true);
      setError(null);
      setSaved(false);
      const scope = {
        workspaceId: props.scope.workspaceId,
        signal: controller.signal,
      };
      const abort = () => controller.abort();
      props.scope.signal?.addEventListener("abort", abort, { once: true });
      if (props.scope.signal?.aborted) controller.abort();
      try {
        if (input) {
          const signature = JSON.stringify(input);
          if (retry.current?.signature !== signature)
            retry.current = { signature, key: crypto.randomUUID() };
        }
        const result = parseMediaCollection(
          input
            ? await withIntegrationCancellation(
                () =>
                  binding.save({
                    connection: props.connection,
                    collection: structuredClone(input),
                    idempotencyKey: retry.current!.key,
                    scope,
                  }),
                scope,
              )
            : await withIntegrationCancellation(
                () => binding.load({ connection: props.connection, scope }),
                scope,
              ),
        );
        if (controller.signal.aborted) return;
        if (
          input &&
          (result.id !== input.id || result.revision < input.revision)
        )
          throw new IntegrationError("provider-error");
        draftScope.current = currentScope;
        setCollection(result);
        setDraft((previous) =>
          keepDraft && previous
            ? { ...previous, id: result.id, revision: result.revision }
            : structuredClone(result),
        );
        setReview(null);
        setAcknowledged(false);
        setConflict(false);
        if (input) {
          setSaved(true);
          retry.current = null;
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          const code =
            cause instanceof IntegrationError ? cause.code : "provider-error";
          setError(integrationErrorMessage(code, locale));
          if (code === "conflict") {
            setConflict(true);
            setReview(null);
            setAcknowledged(false);
          }
        }
      } finally {
        props.scope.signal?.removeEventListener("abort", abort);
        if (request.current === controller) {
          request.current = null;
          setBusy(false);
        }
      }
    },
    [
      binding,
      ready,
      props.connection,
      props.scope.workspaceId,
      props.scope.signal,
      currentScope,
      locale,
      setBusy,
      setError,
      setSaved,
      setCollection,
      setDraft,
      setReview,
      setAcknowledged,
      setConflict,
    ],
  );
  useEffect(() => {
    void perform(undefined, true);
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [perform]);
  const changed =
    draft &&
    collection &&
    JSON.stringify(draft.images) !== JSON.stringify(collection.images);
  return (
    <ProductPanel
      title={
        <span className="flex items-center gap-2">
          <ImageIcon aria-hidden className="size-4 text-primary" />
          {l("Public media collection", "Colección multimedia pública")}
        </span>
      }
      description={l(
        "Crop, replace, reorder and describe public brand imagery. The first image is the primary image.",
        "Recorta, reemplaza, ordena y describe imágenes públicas de marca. La primera imagen es la principal.",
      )}
    >
      {!binding ? (
        <ProductEmpty>
          {l(
            "Supply a media collection binding to load and save your public assets. Private attachments keep their separate authorized upload flow.",
            "Aporta un binding de colección multimedia para cargar y guardar tus recursos públicos. Los adjuntos privados conservan su flujo de subida autorizado por separado.",
          )}
        </ProductEmpty>
      ) : draft ? (
        <div className="space-y-4">
          <ProductImageEditor
            images={draft.images}
            onChange={(images) => {
              setDraft({ ...draft, images });
              setSaved(false);
            }}
            productName={draft.name}
            disabled={!writable || busy || !!review}
            onBusyChange={setEditing}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {props.adapter.mode === "demo"
                ? l(
                    "Edits stay in this local preview.",
                    "Los cambios permanecen en esta vista local.",
                  )
                : l(
                    "Edited raster files are persisted by your consumer backend.",
                    "Los archivos raster editados se guardan mediante tu backend.",
                  )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={busy || editing || !!review}
                onClick={() => void perform(undefined, true)}
              >
                <RefreshCw aria-hidden />
                {l("Refresh and keep draft", "Actualizar y conservar borrador")}
              </Button>
              <Button
                disabled={!writable || !changed || busy || editing || !!review}
                onClick={() => {
                  reviewConnection.current = structuredClone(props.connection);
                  setReview(structuredClone(draft));
                  setAcknowledged(false);
                }}
              >
                {l("Review media changes", "Revisar cambios multimedia")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <ProductEmpty>
          {busy
            ? l(
                "Loading authorized public media…",
                "Cargando medios públicos autorizados…",
              )
            : l(
                "No public media collection returned.",
                "No se ha devuelto una colección multimedia pública.",
              )}
        </ProductEmpty>
      )}
      {error && (
        <Alert className="mt-4" variant="destructive" title={error}>
          <Button
            className="mt-3"
            variant="outline"
            disabled={busy || editing}
            onClick={() => void perform(undefined, !!draft)}
          >
            {conflict
              ? l(
                  "Load latest revision and preserve edits",
                  "Cargar última revisión y conservar cambios",
                )
              : l("Retry loading", "Reintentar carga")}
          </Button>
        </Alert>
      )}
      {saved && (
        <Alert
          className="mt-4"
          variant="success"
          title={l("Media collection saved.", "Colección multimedia guardada.")}
        />
      )}
      {busy && (
        <Button
          className="mt-3"
          variant="ghost"
          onClick={() => request.current?.abort()}
        >
          {l("Cancel request", "Cancelar solicitud")}
        </Button>
      )}
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open && !busy) setReview(null);
        }}
      >
        <DialogContent>
          <DialogTitle>
            {l(
              "Review public media changes",
              "Revisar cambios multimedia públicos",
            )}
          </DialogTitle>
          <DialogDescription>
            {l(
              "Your backend stores the reviewed image bytes, order, primary image and descriptions. It validates the collection revision and allowed delivery profile.",
              "Tu backend guarda los bytes de imágenes, el orden, la imagen principal y las descripciones revisadas. Valida la revisión de la colección y el perfil de entrega permitido.",
            )}
          </DialogDescription>
          {review && (
            <ol className="grid gap-2 text-xs">
              {review.images.map((image, index) => (
                <li key={image.id} className="wrap-break-word">
                  {index + 1}.{" "}
                  {image.alt || l("No description", "Sin descripción")}
                  {index === 0 && ` · ${l("Primary", "Principal")}`}
                </li>
              ))}
            </ol>
          )}
          <label className="flex min-h-11 items-start gap-3 text-xs leading-6">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(value) => setAcknowledged(value === true)}
              disabled={busy}
            />
            {l(
              "I reviewed these public asset changes.",
              "He revisado estos cambios en recursos públicos.",
            )}
          </label>
          <DialogFooter>
            {busy && (
              <Button variant="ghost" onClick={() => request.current?.abort()}>
                {l("Stop waiting", "Dejar de esperar")}
              </Button>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setReview(null)}
            >
              {l("Keep editing", "Seguir editando")}
            </Button>
            <Button
              loading={busy}
              disabled={!acknowledged || busy}
              onClick={() => {
                if (review) void perform(review);
              }}
            >
              {l("Save collection", "Guardar colección")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProductPanel>
  );
}
