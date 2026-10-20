"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import {
  IntegrationError,
  type IntegrationAction,
  type IntegrationErrorCode,
  type IntegrationResult,
  type IntegrationValues,
  type IntegrationWorkbenchProps,
} from "@/lib/integrations/contracts";
import { parseIntegrationResult } from "@/lib/integrations/validation";
import {
  createIntegrationRequestKeys,
  integrationRequestSignature,
} from "@/lib/integrations/request-keys";

const messages: Record<IntegrationErrorCode, [string, string]> = {
  "configuration-required": [
    "Configure this connection before running an action.",
    "Configura esta conexión antes de ejecutar una acción.",
  ],
  "permission-denied": [
    "This connection does not have the required permission.",
    "Esta conexión no tiene el permiso necesario.",
  ],
  expired: [
    "Reconnect this account to continue.",
    "Vuelve a conectar esta cuenta para continuar.",
  ],
  "rate-limited": [
    "The service is busy. Keep your changes and try again shortly.",
    "El servicio está ocupado. Conserva tus cambios y vuelve a intentarlo.",
  ],
  validation: [
    "Check the fields and try again.",
    "Revisa los campos y vuelve a intentarlo.",
  ],
  offline: [
    "The backend is unavailable. Your input is still here.",
    "El backend no está disponible. Tus datos siguen aquí.",
  ],
  cancelled: ["The action was cancelled.", "La acción se canceló."],
  conflict: [
    "The resource changed. Reload it before saving again.",
    "El recurso cambió. Recárgalo antes de volver a guardar.",
  ],
  "provider-error": [
    "The service could not finish this action. You can retry.",
    "El servicio no pudo completar esta acción. Puedes reintentar.",
  ],
};

export function integrationErrorMessage(
  code: IntegrationErrorCode,
  locale: "en" | "es",
) {
  return messages[code][locale === "es" ? 1 : 0];
}

/** One pending action, abort on scope changes, and no late-result overwrites. */
export function useIntegrationOperation({
  adapter,
  connection,
  definition,
  scope,
}: IntegrationWorkbenchProps) {
  const { locale } = useLanguage();
  const [result, setResult] = useState<IntegrationResult | null>(null);
  const [errorCode, setErrorCode] = useState<IntegrationErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const currentScope = useRef<string | null>(null);
  const requestKeys = useRef(createIntegrationRequestKeys());
  const scopeKey = `${scope.workspaceId}:${definition.id}:${connection.id}:${connection.revision}`;

  useEffect(() => {
    currentScope.current = scopeKey;
    sequence.current += 1;
    controller.current?.abort();
    controller.current = null;
    requestKeys.current.clear();
    setResult(null);
    setErrorCode(null);
    setPending(false);
    return () => {
      currentScope.current = null;
      sequence.current += 1;
      controller.current?.abort();
    };
  }, [adapter, scopeKey]);

  const perform = useCallback(
    async (
      operation: (signal: AbortSignal) => Promise<IntegrationResult>,
    ): Promise<IntegrationResult | null> => {
      if (controller.current) return null;
      if (connection.status !== "connected") {
        setErrorCode(
          connection.status === "expired"
            ? "expired"
            : connection.status === "permission-denied"
              ? "permission-denied"
              : "configuration-required",
        );
        return null;
      }
      const active = new AbortController();
      const ticket = ++sequence.current;
      const requestedScope = scopeKey;
      const abort = () => active.abort();
      if (scope.signal?.aborted) return null;
      scope.signal?.addEventListener("abort", abort, { once: true });
      controller.current = active;
      setPending(true);
      setErrorCode(null);
      try {
        const value = parseIntegrationResult(await operation(active.signal));
        if (
          active.signal.aborted ||
          ticket !== sequence.current ||
          currentScope.current !== requestedScope
        )
          return null;
        setResult(value);
        return value;
      } catch (error) {
        if (
          active.signal.aborted ||
          ticket !== sequence.current ||
          currentScope.current !== requestedScope
        )
          return null;
        setErrorCode(
          error instanceof IntegrationError ? error.code : "provider-error",
        );
        return null;
      } finally {
        scope.signal?.removeEventListener("abort", abort);
        if (ticket === sequence.current) {
          controller.current = null;
          setPending(false);
        }
      }
    },
    [connection.status, scope.signal, scopeKey],
  );

  const run = useCallback(
    async (
      actionOrId: IntegrationAction | string,
      values: IntegrationValues = {},
    ) => {
      const actionId =
        typeof actionOrId === "string" ? actionOrId : actionOrId.id;
      const action = definition.actions.find(
        (action) => action.id === actionId,
      );
      if (!action) {
        setErrorCode("validation");
        return null;
      }
      if (
        action.requiredPermissions?.some(
          (id) => !connection.grantedPermissions.includes(id),
        )
      ) {
        setErrorCode("permission-denied");
        return null;
      }
      const request = {
        integrationId: definition.id,
        connectionId: connection.id,
        actionId,
        values,
      };
      const signature = integrationRequestSignature(request, scope.workspaceId);
      const idempotencyKey = requestKeys.current.acquire(signature);
      const value = await perform((signal) =>
        adapter.execute(
          { ...request, idempotencyKey },
          { workspaceId: scope.workspaceId, signal },
        ),
      );
      if (value) requestKeys.current.confirm(signature, idempotencyKey);
      return value;
    },
    [
      adapter,
      connection.id,
      connection.grantedPermissions,
      definition,
      perform,
      scope.workspaceId,
    ],
  );
  const upload = useCallback(
    async (file: File, alt?: string) => {
      const action =
        definition.actions.find((entry) => entry.kind === "upload") ??
        (definition.family === "knowledge"
          ? definition.actions.find((entry) => entry.kind === "ingest")
          : undefined);
      if (!action) {
        setErrorCode("validation");
        return null;
      }
      if (
        action.requiredPermissions?.some(
          (id) => !connection.grantedPermissions.includes(id),
        )
      ) {
        setErrorCode("permission-denied");
        return null;
      }
      return perform((signal) =>
        adapter.upload(
          {
            integrationId: definition.id,
            connectionId: connection.id,
            file,
            alt,
          },
          { workspaceId: scope.workspaceId, signal },
        ),
      );
    },
    [
      adapter,
      connection.id,
      connection.grantedPermissions,
      definition,
      perform,
      scope.workspaceId,
    ],
  );
  const cancel = useCallback(() => {
    sequence.current += 1;
    controller.current?.abort();
    controller.current = null;
    setPending(false);
    setErrorCode("cancelled");
  }, []);
  const reset = useCallback(() => {
    sequence.current += 1;
    controller.current?.abort();
    controller.current = null;
    setResult(null);
    setErrorCode(null);
    setPending(false);
  }, []);
  return {
    result,
    error: errorCode ? integrationErrorMessage(errorCode, locale) : null,
    errorCode,
    pending,
    run,
    upload,
    cancel,
    reset,
  };
}
