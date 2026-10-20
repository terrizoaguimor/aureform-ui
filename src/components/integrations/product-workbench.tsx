"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Layers3 } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import type { IntegrationWorkbenchProps } from "@/lib/integrations/contracts";
import type { IntegrationMapRenderer } from "@/lib/integrations/map-renderer";
import {
  ProductDataWorkbench,
  type ProductDataSubscribe,
} from "./product-data";
import {
  ProductDocumentWorkbench,
  type ProductEditorRenderer,
} from "./product-document";
import { ProductSearchWorkbench } from "./product-search";
import {
  ProductCollaborationWorkbench,
  type ProductCollaborationSubscribe,
} from "./product-collaboration";
import { ProductMapsWorkbench } from "./product-maps";
import { ProductKnowledgeWorkbench } from "./product-knowledge";
import { ProductAgentsWorkbench } from "./product-agents";
import { ProductConnectorsWorkbench } from "./product-connectors";
import { productScopeKey } from "./product-model";
import { ProductEmpty } from "./product-ui";

export type {
  ProductDocumentEditorProps,
  ProductEditorRenderer,
} from "./product-document";
export type {
  ProductCollaborationSubscribe,
  ProductCollaborationSubscription,
  ProductCollaborationUpdate,
} from "./product-collaboration";
export type {
  ProductDataSubscribe,
  ProductDataSubscription,
} from "./product-data";

export type ProductIntegrationWorkbenchProps = IntegrationWorkbenchProps & {
  /** Optional rich editor. Default Markdown/text/JSON editing remains complete. */
  renderEditor?: ProductEditorRenderer;
  /** Optional room-specific subscription; adapter.subscribe is also supported. */
  subscribe?: ProductCollaborationSubscribe;
  /** Optional query-aware data stream; complete remote pages retain server order. */
  subscribeData?: ProductDataSubscribe;
  /** Optional approved native basemap; coordinates and fallback remain shared. */
  renderMap?: IntegrationMapRenderer;
};

const families = new Set([
  "data",
  "content",
  "search",
  "collaboration",
  "maps",
  "knowledge",
  "agents",
  "connectors",
]);

/** Mount under a Client Component: adapters and render callbacks are not RSC props. */
export function ProductIntegrationWorkbench(
  props: ProductIntegrationWorkbenchProps,
) {
  const { l, number } = useLanguage();
  const subscribeToAbort = useCallback(
    (listener: () => void) => {
      props.scope.signal?.addEventListener("abort", listener, { once: true });
      return () => props.scope.signal?.removeEventListener("abort", listener);
    },
    [props.scope.signal],
  );
  const aborted = useSyncExternalStore(
    subscribeToAbort,
    () => Boolean(props.scope.signal?.aborted),
    () => Boolean(props.scope.signal?.aborted),
  );
  if (!families.has(props.definition.family)) return null;
  const mismatched =
    props.connection.integrationId !== props.definition.id ||
    props.connection.workspaceId !== props.scope.workspaceId;
  const ready =
    !mismatched && !aborted && props.connection.status === "connected";
  const selectedOption = props.definition.options.find(
    (option) => option.id === props.connection.providerOptionId,
  );
  const key = productScopeKey(props);
  const workbench = (() => {
    if (!ready) return null;
    switch (props.definition.family) {
      case "data":
        return <ProductDataWorkbench key={key} {...props} />;
      case "content":
        return <ProductDocumentWorkbench key={key} {...props} />;
      case "search":
        return <ProductSearchWorkbench key={key} {...props} />;
      case "collaboration":
        return <ProductCollaborationWorkbench key={key} {...props} />;
      case "maps":
        return <ProductMapsWorkbench key={key} {...props} />;
      case "knowledge":
        return <ProductKnowledgeWorkbench key={key} {...props} />;
      case "agents":
        return <ProductAgentsWorkbench key={key} {...props} />;
      case "connectors":
        return <ProductConnectorsWorkbench key={key} {...props} />;
    }
  })();
  return (
    <div
      className="space-y-5 [@media(pointer:coarse)]:[&_input]:min-h-11 [@media(pointer:coarse)]:[&_textarea]:min-h-28"
      data-product-workbench={props.definition.family}
      data-integration-mode={props.adapter.mode}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-primary/15 bg-linear-to-br from-primary/10 via-surface to-surface p-5 sm:p-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Layers3 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">
              {selectedOption?.name ?? props.definition.name}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">
              {l(
                props.definition.description.en,
                props.definition.description.es,
              )}
            </p>
          </div>
        </div>
        <div className="space-y-1 text-right text-[11px] text-muted-foreground">
          <p>
            {props.adapter.mode === "demo"
              ? l("Demonstration connection", "Conexión de demostración")
              : props.connection.account.name}
          </p>
          <p>
            {number(props.connection.resourceIds.length)}{" "}
            {l("authorized resources", "recursos autorizados")}
          </p>
        </div>
      </header>
      {!ready ? (
        <ProductEmpty>
          {mismatched || aborted
            ? l(
                "This workspace scope changed. Reopen the connection before continuing.",
                "El alcance de este espacio cambió. Vuelve a abrir la conexión para continuar.",
              )
            : props.connection.status === "expired"
              ? l(
                  "Reconnect this account to continue your workflow.",
                  "Vuelve a conectar esta cuenta para continuar tu flujo.",
                )
              : props.connection.status === "permission-denied"
                ? l(
                    "Review the connection permissions before continuing.",
                    "Revisa los permisos de la conexión antes de continuar.",
                  )
                : props.connection.status === "syncing"
                  ? l(
                      "The connection is syncing. Your workbench will be available when it finishes.",
                      "La conexión se está sincronizando. El espacio de trabajo estará disponible al terminar.",
                    )
                  : l(
                      "Configure and connect this integration to use its workbench.",
                      "Configura y conecta esta integración para usar su espacio de trabajo.",
                    )}
        </ProductEmpty>
      ) : (
        workbench
      )}
    </div>
  );
}
