"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { integrationErrorMessage } from "@/hooks/use-integration-operation";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import type {
  EnterpriseConnectionAction,
  EnterpriseConnectionBinding,
} from "@/lib/integrations/enterprise";
import { isTrustedIntegrationAuthorizationUrl } from "@/lib/integrations/http-adapter";
import { withIntegrationCancellation } from "@/lib/integrations/cancelled-task";
import {
  acceptIntegrationConnectionResponse,
  integrationConnectionSnapshotMatches,
} from "@/lib/integrations/connection-snapshot";
import {
  ProductDate,
  ProductEmpty,
  ProductPanel,
  ProductStatus,
} from "./product-ui";

const actionLabels: Record<EnterpriseConnectionAction, [string, string]> = {
  "verify-domain": [
    "Check domain verification",
    "Comprobar verificación del dominio",
  ],
  "request-administrator-consent": [
    "Request administrator consent",
    "Solicitar consentimiento del administrador",
  ],
  "renew-subscription": [
    "Renew change subscription",
    "Renovar suscripción de cambios",
  ],
  synchronize: [
    "Start authorized synchronization",
    "Iniciar sincronización autorizada",
  ],
};

export function EnterpriseDiagnostics({
  binding,
  canManage,
  onConnectionChange,
  ...props
}: IntegrationWorkbenchProps & {
  binding?: EnterpriseConnectionBinding;
  canManage: boolean;
  onConnectionChange(connection: IntegrationConnection): void;
}) {
  const { l, locale } = useLanguage();
  const state = props.connection.enterprise;
  const [review, setReview] = useState<{
    action: EnterpriseConnectionAction;
    connection: IntegrationConnection;
  } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorization, setAuthorization] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const currentConnection = useRef(props.connection);
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const ready = props.connection.status === "connected";
  useEffect(() => {
    currentConnection.current = props.connection;
  }, [props.connection]);
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    retry.current = null;
    setReview(null);
    setAcknowledged(false);
    setBusy(false);
    setError(null);
    setAuthorization(null);
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
      setReview(null);
      setAcknowledged(false);
      setAuthorization(null);
      setBusy(false);
      retry.current = null;
    }
  }, [ready, canManage]);
  async function perform() {
    if (
      !binding ||
      !review ||
      !acknowledged ||
      !canManage ||
      request.current ||
      !ready
    )
      return;
    if (
      !integrationConnectionSnapshotMatches(review.connection, props.connection)
    ) {
      setReview(null);
      setAcknowledged(false);
      setError(integrationErrorMessage("conflict", locale));
      return;
    }
    const controller = new AbortController();
    const scope = {
      workspaceId: props.scope.workspaceId,
      signal: controller.signal,
    };
    const cancel = () => controller.abort();
    props.scope.signal?.addEventListener("abort", cancel, { once: true });
    if (props.scope.signal?.aborted) controller.abort();
    request.current = controller;
    setBusy(true);
    setError(null);
    setAuthorization(null);
    const signature = `${scope.workspaceId}:${review.connection.id}:${review.connection.revision}:${review.action}`;
    if (retry.current?.signature !== signature)
      retry.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await withIntegrationCancellation(
        () =>
          binding.perform({
            action: review.action,
            connection: structuredClone(review.connection),
            idempotencyKey: retry.current!.key,
            scope,
          }),
        scope,
      );
      if (!result || !["connected", "authorization"].includes(result.kind))
        throw new IntegrationError("provider-error");
      const connection = acceptIntegrationConnectionResponse(
        result.connection,
        currentConnection.current,
        props.definition,
        scope,
      );
      if (
        !integrationConnectionSnapshotMatches(
          review.connection,
          currentConnection.current,
        )
      )
        throw new IntegrationError("conflict");
      if (
        result.kind === "authorization" &&
        !isTrustedIntegrationAuthorizationUrl(
          result.url,
          props.adapter.authorizationOrigins,
        )
      )
        throw new IntegrationError("provider-error");
      if (controller.signal.aborted) return;
      onConnectionChange(connection);
      setReview(null);
      setAcknowledged(false);
      retry.current = null;
      if (result.kind === "authorization") setAuthorization(result.url);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          integrationErrorMessage(
            cause instanceof IntegrationError ? cause.code : "provider-error",
            locale,
          ),
        );
    } finally {
      props.scope.signal?.removeEventListener("abort", cancel);
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }
  const unknown = (
    <ProductEmpty>
      {l(
        "Not reported by the connection backend.",
        "El backend de la conexión no ha informado este estado.",
      )}
    </ProductEmpty>
  );
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5" data-enterprise-diagnostics>
      <div className="grid min-w-0 gap-5 xl:grid-cols-3">
        <ProductPanel
          title={
            <span className="flex items-center gap-2">
              <Building2 aria-hidden className="size-4 text-primary" />
              {l(
                "Domain and single sign-on",
                "Dominio e inicio de sesión único",
              )}
            </span>
          }
        >
          {state?.domain ? (
            <div className="space-y-4 text-xs">
              <p className="font-medium wrap-break-word">{state.domain.name}</p>
              <dl className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt>{l("Domain verification", "Verificación de dominio")}</dt>
                  <dd>
                    <ProductStatus value={state.domain.status} />
                  </dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <dt>SSO</dt>
                  <dd>
                    <ProductStatus value={state.domain.sso} />
                  </dd>
                </div>
              </dl>
              {state.domain.verification && (
                <div className="space-y-2 rounded-xl border border-border bg-surface-subtle p-3">
                  <p className="font-medium">
                    {l(
                      "DNS record supplied by your backend",
                      "Registro DNS proporcionado por tu backend",
                    )}
                  </p>
                  <dl className="space-y-2">
                    {[
                      ["Type", state.domain.verification.type],
                      ["Name", state.domain.verification.name],
                      ["Value", state.domain.verification.value],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="mt-1 select-all font-mono text-[11px] wrap-break-word">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          ) : (
            unknown
          )}
          {state?.administratorApproval && (
            <div className="mt-5 border-t border-border pt-4 text-xs">
              <p className="mb-2 text-muted-foreground">
                {l(
                  "Organization administrator approval",
                  "Aprobación del administrador de la organización",
                )}
              </p>
              <ProductStatus value={state.administratorApproval.status} />
              {state.administratorApproval.reviewedBy && (
                <p className="mt-2 wrap-break-word">
                  {state.administratorApproval.reviewedBy}
                </p>
              )}
            </div>
          )}
        </ProductPanel>
        <ProductPanel
          title={
            <span className="flex items-center gap-2">
              <KeyRound aria-hidden className="size-4 text-primary" />
              {l("Provider consent", "Consentimiento del proveedor")}
            </span>
          }
        >
          {state?.permissionMode || state?.consent || state?.providerScopes ? (
            <div className="space-y-4 text-xs">
              {state.permissionMode && (
                <p>
                  {l("Permission mode", "Modo de permisos")}:{" "}
                  <Badge variant="outline">
                    {state.permissionMode === "application"
                      ? l("Application", "Aplicación")
                      : l("Delegated", "Delegado")}
                  </Badge>
                </p>
              )}
              {state.consent && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {l("Administrator consent", "Consentimiento administrador")}
                  </span>
                  <ProductStatus value={state.consent.status} />
                </div>
              )}
              {state.providerScopes && (
                <div>
                  <p className="mb-2 text-muted-foreground">
                    {l("Actual provider scopes", "Scopes reales del proveedor")}
                  </p>
                  {state.providerScopes.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {state.providerScopes.map((name) => (
                        <li
                          key={name}
                          className="max-w-full rounded-lg border border-border bg-surface-subtle px-2 py-1 font-mono text-[10px] wrap-break-word"
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      {l("No scopes reported.", "No se han informado scopes.")}
                    </p>
                  )}
                </div>
              )}
              <p className="leading-6 text-muted-foreground">
                {l(
                  "Logical UI grants are displayed separately in Connection. They do not establish provider consent.",
                  "Los permisos lógicos de UI se muestran por separado en Conexión. No establecen el consentimiento del proveedor.",
                )}
              </p>
            </div>
          ) : (
            unknown
          )}
        </ProductPanel>
        <ProductPanel
          title={
            <span className="flex items-center gap-2">
              <ShieldCheck aria-hidden className="size-4 text-primary" />
              {l("Policy and synchronization", "Política y sincronización")}
            </span>
          }
        >
          {state?.policy || state?.synchronization || state?.renewal ? (
            <div className="space-y-4 text-xs">
              {state.policy && (
                <div>
                  <p className="mb-2 font-medium">{state.policy.name}</p>
                  <ProductStatus value={state.policy.status} />
                  <ul className="mt-3 space-y-3">
                    {state.policy.checks.map((check) => (
                      <li
                        key={check.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span className="min-w-0 wrap-break-word">
                          {check.name}
                        </span>
                        <ProductStatus value={check.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {state.synchronization && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="font-medium">
                    {l("Synchronization", "Sincronización")} ·{" "}
                    {state.synchronization.mode}
                  </p>
                  <ProductStatus value={state.synchronization.status} />
                  {state.synchronization.lastSuccessAt && (
                    <p>
                      <ProductDate
                        value={state.synchronization.lastSuccessAt}
                      />
                    </p>
                  )}
                  {state.synchronization.checkpointPresent !== undefined && (
                    <p className="text-muted-foreground">
                      {state.synchronization.checkpointPresent
                        ? l(
                            "Server checkpoint is present.",
                            "Existe un checkpoint del servidor.",
                          )
                        : l(
                            "No server checkpoint reported.",
                            "No se informa un checkpoint del servidor.",
                          )}
                    </p>
                  )}
                </div>
              )}
              {state.renewal && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="font-medium">
                    {l(
                      "Change-notification renewal",
                      "Renovación de notificaciones de cambios",
                    )}
                  </p>
                  <ProductStatus value={state.renewal.status} />
                  {state.renewal.expiresAt && (
                    <p>
                      {l("Expires", "Caduca")}:{" "}
                      <ProductDate value={state.renewal.expiresAt} />
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            unknown
          )}
        </ProductPanel>
      </div>
      {props.adapter.mode === "demo" && (
        <p className="text-xs leading-6 text-muted-foreground">
          {l(
            "These are local policy fixtures. No domain, tenant or provider administrator has been contacted.",
            "Estos son ejemplos de política locales. No se ha contactado ningún dominio, tenant ni administrador del proveedor.",
          )}
        </p>
      )}
      {!canManage && (
        <p className="text-xs leading-6 text-muted-foreground">
          {l(
            "Your current role cannot change this connection's enterprise settings.",
            "Tu rol actual no puede cambiar la configuración empresarial de esta conexión.",
          )}
        </p>
      )}
      {binding?.actions.length ? (
        <div className="flex flex-wrap gap-2">
          {[...new Set(binding.actions)].map((action) => (
            <Button
              key={action}
              variant="outline"
              disabled={!ready || !canManage || busy}
              onClick={() => {
                setReview({
                  action,
                  connection: structuredClone(props.connection),
                });
                setAcknowledged(false);
                setError(null);
              }}
            >
              <RefreshCw aria-hidden />
              {l(...actionLabels[action])}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-6 text-muted-foreground">
          {l(
            "Supply an enterprise binding to enable server-owned verification, consent, renewal and synchronization actions.",
            "Aporta un binding empresarial para activar verificación, consentimiento, renovación y sincronización gestionados por tu servidor.",
          )}
        </p>
      )}
      {error && <Alert variant="destructive" title={error} />}
      {authorization && (
        <Alert
          title={l(
            "Continue with the administrator",
            "Continuar con el administrador",
          )}
        >
          <a
            className="inline-flex min-h-11 items-center gap-2 text-xs font-medium underline"
            href={authorization}
            rel="noreferrer"
            target="_blank"
          >
            {l(
              "Open provider authorization",
              "Abrir autorización del proveedor",
            )}
            <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </Alert>
      )}
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!open && !busy) setReview(null);
        }}
      >
        <DialogContent>
          <DialogTitle>
            {review ? l(...actionLabels[review.action]) : ""}
          </DialogTitle>
          <DialogDescription>
            {l(
              "Your backend will authorize this request for the reviewed connection and workspace. Provider approval is reported only after it actually completes.",
              "Tu backend autorizará la solicitud para la conexión y el espacio revisados. La aprobación del proveedor se informa solo después de completarse.",
            )}
          </DialogDescription>
          {review && (
            <p className="text-xs">
              {review.connection.account.name} ·{" "}
              {review.connection.enterprise?.domain?.name ??
                review.connection.integrationId}
            </p>
          )}
          <label className="flex min-h-11 items-start gap-3 text-xs leading-6">
            <Checkbox
              checked={acknowledged}
              onCheckedChange={(value) => setAcknowledged(value === true)}
              disabled={busy}
            />
            {l(
              "I reviewed this connection and the requested action.",
              "He revisado esta conexión y la acción solicitada.",
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
              {l("Cancel", "Cancelar")}
            </Button>
            <Button
              loading={busy}
              disabled={!acknowledged || busy || !ready || !canManage}
              onClick={() => void perform()}
            >
              {l("Continue", "Continuar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
