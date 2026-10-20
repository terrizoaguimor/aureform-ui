"use client";

import { useEffect, useRef, useState } from "react";
import { FileCheck2, FolderOpen, RefreshCw } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { integrationErrorMessage } from "@/hooks/use-integration-operation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  IntegrationError,
  type IntegrationConnection,
  type IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import {
  parseDrivePickedFiles,
  type DrivePickedFile,
  type DrivePickerBinding,
} from "@/lib/integrations/drive-picker";
import { withIntegrationCancellation } from "@/lib/integrations/cancelled-task";
import {
  acceptIntegrationConnectionResponse,
  integrationConnectionSnapshotMatches,
} from "@/lib/integrations/connection-snapshot";
import { ProductEmpty, ProductPanel } from "./product-ui";

export function DrivePickerPanel({
  binding,
  canManage = true,
  onConnectionChange,
  ...props
}: IntegrationWorkbenchProps & {
  binding?: DrivePickerBinding;
  /** Presentation restriction; the registration backend enforces authorization. */
  canManage?: boolean;
  onConnectionChange(connection: IntegrationConnection): void;
}) {
  const { l, locale } = useLanguage();
  const [files, setFiles] = useState<DrivePickedFile[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [selectionConnection, setSelectionConnection] =
    useState<IntegrationConnection | null>(null);
  const [busy, setBusy] = useState<"picker" | "register" | "refresh" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const currentConnection = useRef(props.connection);
  const retryKey = useRef<string | null>(null);
  const ready =
    props.connection.status === "connected" &&
    props.connection.grantedPermissions.includes("files.read");
  useEffect(() => {
    currentConnection.current = props.connection;
  }, [props.connection]);
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setFiles([]);
    setConfirmed(false);
    setSelectionConnection(null);
    setBusy(null);
    setError(null);
    setNotice(null);
    retryKey.current = null;
    return () => request.current?.abort();
  }, [
    binding,
    props.adapter,
    props.scope.workspaceId,
    props.connection.id,
    props.connection.providerOptionId,
  ]);
  useEffect(() => {
    if (!ready || !canManage) {
      request.current?.abort();
      request.current = null;
      setFiles([]);
      setConfirmed(false);
      setSelectionConnection(null);
      setBusy(null);
      retryKey.current = null;
    }
  }, [ready, canManage]);
  async function run(kind: "picker" | "register" | "refresh") {
    if (request.current || !ready) return;
    if (kind === "register" && !canManage) {
      setError(integrationErrorMessage("permission-denied", locale));
      return;
    }
    const controller = new AbortController();
    const scope = {
      workspaceId: props.scope.workspaceId,
      signal: controller.signal,
    };
    const abort = () => controller.abort();
    props.scope.signal?.addEventListener("abort", abort, { once: true });
    if (props.scope.signal?.aborted) controller.abort();
    request.current = controller;
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      if (kind === "picker") {
        let selected: DrivePickedFile[];
        if (props.adapter.mode === "demo") {
          const resources = await props.adapter.resources(
            props.definition.id,
            scope,
          );
          selected = resources.slice(0, 3).map((resource) => ({
            id: resource.id,
            name: resource.name,
            mimeType: "application/vnd.google-apps.document",
          }));
        } else {
          if (!binding) throw new IntegrationError("configuration-required");
          const selection = await withIntegrationCancellation(
            () => binding.select({ connection: props.connection, scope }),
            scope,
          );
          if (controller.signal.aborted) return;
          if (selection.kind === "cancelled") {
            setNotice(
              l(
                "File selection cancelled. Your authorized files are unchanged.",
                "Selección cancelada. Tus archivos autorizados siguen igual.",
              ),
            );
            return;
          }
          selected = parseDrivePickedFiles(selection.files);
        }
        if (!controller.signal.aborted) {
          setFiles(selected);
          setConfirmed(false);
          setSelectionConnection(structuredClone(props.connection));
          retryKey.current = null;
        }
      } else if (kind === "register") {
        if (!confirmed || !files.length)
          throw new IntegrationError("validation");
        if (
          !selectionConnection ||
          !integrationConnectionSnapshotMatches(
            selectionConnection,
            props.connection,
          )
        ) {
          setConfirmed(false);
          throw new IntegrationError("conflict");
        }
        retryKey.current ??= crypto.randomUUID();
        const result =
          props.adapter.mode === "demo"
            ? await props.adapter.configure(
                props.connection.id,
                {
                  configuration: selectionConnection.configuration,
                  permissions: selectionConnection.grantedPermissions,
                  resourceIds: [
                    ...new Set([
                      ...selectionConnection.resourceIds,
                      ...files.map((file) => file.id),
                    ]),
                  ],
                  revision: selectionConnection.revision,
                },
                scope,
              )
            : await withIntegrationCancellation(
                () =>
                  binding!.register({
                    connection: selectionConnection,
                    files: structuredClone(files),
                    idempotencyKey: retryKey.current!,
                    scope,
                  }),
                scope,
              );
        const connection = acceptIntegrationConnectionResponse(
          result,
          currentConnection.current,
          props.definition,
          scope,
        );
        if (
          !integrationConnectionSnapshotMatches(
            selectionConnection,
            currentConnection.current,
          )
        ) {
          setConfirmed(false);
          throw new IntegrationError("conflict");
        }
        // Only the authoritative backend response establishes the new file scope.
        if (controller.signal.aborted) return;
        onConnectionChange(connection);
        setFiles([]);
        setConfirmed(false);
        setSelectionConnection(null);
        retryKey.current = null;
        setNotice(
          l(
            "Selected files reconciled with the connection. Reopen the resource selector to inspect their current status.",
            "Archivos elegidos conciliados con la conexión. Vuelve a abrir el selector de recursos para revisar su estado.",
          ),
        );
        try {
          await props.adapter.resources(props.definition.id, scope);
        } catch {
          if (!controller.signal.aborted)
            setNotice(
              l(
                "File registration confirmed. The resource list could not refresh; use Refresh authorized files to try again.",
                "Registro de archivos confirmado. No se pudo actualizar la lista; usa Actualizar archivos autorizados para reintentar.",
              ),
            );
        }
      } else {
        const result = await props.adapter.get(props.definition.id, scope);
        await props.adapter.resources(props.definition.id, scope);
        if (!controller.signal.aborted) {
          onConnectionChange(
            acceptIntegrationConnectionResponse(
              result,
              currentConnection.current,
              props.definition,
              scope,
            ),
          );
          setNotice(
            l(
              "Authorized file scope refreshed.",
              "Alcance de archivos autorizados actualizado.",
            ),
          );
        }
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          integrationErrorMessage(
            cause instanceof IntegrationError ? cause.code : "provider-error",
            locale,
          ),
        );
    } finally {
      props.scope.signal?.removeEventListener("abort", abort);
      if (request.current === controller) {
        request.current = null;
        setBusy(null);
      }
    }
  }
  return (
    <ProductPanel
      title={l("Choose files from Drive", "Elegir archivos de Drive")}
      description={l(
        "Select specific files, review them, then let your backend reconcile their authorized scope.",
        "Elige archivos concretos, revísalos y permite que tu backend concilie su alcance autorizado.",
      )}
    >
      {props.adapter.mode === "consumer" && !binding && (
        <ProductEmpty>
          {l(
            "Provide a Drive Picker binding to enable your Google file dialog. The native helper and limited-file OAuth recipe are included in the source.",
            "Aporta un binding de Drive Picker para activar tu diálogo Google. El helper nativo y la receta OAuth de archivos limitados están en el código.",
          )}
        </ProductEmpty>
      )}
      {props.adapter.mode === "demo" && (
        <p className="mb-4 text-xs leading-6 text-muted-foreground">
          {l(
            "This preview selects three local sample files. Google is loaded only by the opt-in consumer binding.",
            "Esta vista elige tres archivos locales de ejemplo. Google se carga solo con el binding optativo del consumidor.",
          )}
        </p>
      )}
      {!canManage && (
        <p className="mb-4 text-xs leading-6 text-muted-foreground">
          {l(
            "Your current role cannot register new files with this connection.",
            "Tu rol actual no puede registrar nuevos archivos en esta conexión.",
          )}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={
            !ready || !!busy || (props.adapter.mode === "consumer" && !binding)
          }
          loading={busy === "picker"}
          onClick={() => void run("picker")}
        >
          <FolderOpen aria-hidden />
          {l("Open file picker", "Abrir selector de archivos")}
        </Button>
        <Button
          variant="ghost"
          disabled={!ready || !!busy}
          loading={busy === "refresh"}
          onClick={() => void run("refresh")}
        >
          <RefreshCw aria-hidden />
          {l("Refresh authorized files", "Actualizar archivos autorizados")}
        </Button>
        {busy && (
          <Button variant="ghost" onClick={() => request.current?.abort()}>
            {l("Cancel", "Cancelar")}
          </Button>
        )}
      </div>
      {!!files.length && (
        <div className="mt-5 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <ul className="grid gap-3">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex min-w-0 items-start gap-3 text-xs"
              >
                <FileCheck2
                  aria-hidden
                  className="size-4 shrink-0 text-primary"
                />
                <div className="min-w-0">
                  <p className="font-medium wrap-break-word">{file.name}</p>
                  <p className="mt-1 wrap-break-word text-muted-foreground">
                    {file.mimeType}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <label className="flex min-h-11 items-start gap-3 text-xs leading-6">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(value) => setConfirmed(value === true)}
              disabled={!!busy || !canManage}
            />
            {l(
              "Register only these selected files with this workspace.",
              "Registrar solo estos archivos elegidos en este espacio.",
            )}
          </label>
          <Button
            loading={busy === "register"}
            disabled={!confirmed || !!busy || !ready || !canManage}
            onClick={() => void run("register")}
          >
            {l("Confirm selected files", "Confirmar archivos elegidos")}
          </Button>
        </div>
      )}
      {error && <Alert className="mt-4" variant="destructive" title={error} />}
      {notice && <Alert className="mt-4" variant="success" title={notice} />}
    </ProductPanel>
  );
}
