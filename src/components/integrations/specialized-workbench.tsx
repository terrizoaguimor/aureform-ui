"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Code2,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { CommerceProvider } from "@/components/commerce-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IntegrationWorkbenchProps } from "@/lib/integrations/contracts";
import type { IntegrationSuite } from "@/lib/integrations/suite";
import { publicPath } from "@/lib/public-path";
import { createDemoAiWorkspaceAdapter } from "@/lib/ai-integration";

const Loading = () => <Skeleton className="h-80 w-full" />;
const IdentityPanel = dynamic(
  () => import("./identity-panel").then((m) => m.IdentityIntegrationPanel),
  { loading: Loading },
);
const AiWorkspace = dynamic(
  () =>
    import("@/components/templates/ai-workspace").then((m) => m.AIWorkspace),
  { loading: Loading },
);
const ProductsManager = dynamic(
  () =>
    import("@/components/blocks/product-manager").then(
      (m) => m.ProductsManager,
    ),
  { loading: Loading },
);
const CommerceWorkspace = dynamic(
  () =>
    import("@/components/blocks/commerce-workspace").then(
      (m) => m.CommerceWorkspace,
    ),
  { loading: Loading },
);

export function SpecializedIntegrationWorkbench({
  definition,
  connection,
  adapter,
  scope,
  suite,
  canManage,
  aiDiagnostics,
}: IntegrationWorkbenchProps & {
  suite?: IntegrationSuite;
  canManage?: boolean;
  aiDiagnostics?: boolean;
}) {
  const { l, locale } = useLanguage();
  const [commerceTab, setCommerceTab] = useState("products");
  const selected = connection.providerOptionId;
  const identity =
    suite?.identity?.[selected] ?? suite?.identity?.[definition.id];
  const ai = suite?.ai?.[selected] ?? suite?.ai?.[definition.id];
  const commerce =
    suite?.commerce?.[selected] ?? suite?.commerce?.[definition.id];
  const consumer = adapter.mode === "consumer";
  const demoAi = useMemo(() => createDemoAiWorkspaceAdapter(), []);
  const configured =
    definition.family === "identity"
      ? !!identity
      : definition.family === "ai"
        ? !!ai
        : !!commerce;
  if (consumer && !configured)
    return (
      <Card>
        <Empty
          icon={<Code2 aria-hidden className="size-5" />}
          title={l(
            "Provide this workflow's adapter",
            "Aporta el adaptador de este flujo",
          )}
          description={l(
            "The connection is available. Add your identity, AI or commerce transport to the integration suite to use the full interface with your backend.",
            "La conexión está disponible. Añade el transporte de identidad, AI o comercio a la suite para usar la interfaz completa con tu backend.",
          )}
          action={
            <a
              href={publicPath(`/${locale}/docs/integrations/`)}
              className={buttonVariants({ variant: "outline" })}
            >
              {l("Connection examples", "Ejemplos de conexión")}
              <ArrowUpRight aria-hidden className="size-4" />
            </a>
          }
        />
      </Card>
    );
  if (definition.family === "identity")
    return (
      <div className="grid gap-5" data-integration-domain="identity">
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 text-primary" />
            <div>
              <h3 className="text-sm font-semibold">
                {l("Complete account flows", "Flujos completos de cuenta")}
              </h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {l(
                  "Email access, recovery, verification, social buttons, sessions, MFA and organizations.",
                  "Acceso por correo, recuperación, verificación, botones sociales, sesiones, MFA y organizaciones.",
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["sign-in", l("Sign in", "Iniciar sesión")],
              ["sign-up", l("Create account", "Crear cuenta")],
              ["reset-password", l("Recover account", "Recuperar cuenta")],
              ["verify", l("Verify code", "Verificar código")],
            ].map(([mode, label]) => (
              <a
                key={mode}
                href={publicPath(`/${locale}/auth/${mode}/`)}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {label}
                <ArrowUpRight aria-hidden className="size-3.5" />
              </a>
            ))}
          </div>
        </Card>
        <IdentityPanel
          key={`${scope.workspaceId}:${selected}`}
          providerId={selected}
          adapter={identity}
        />
      </div>
    );
  if (definition.family === "ai")
    return (
      <div className="grid gap-5" data-integration-domain="ai">
        <Alert
          title={
            consumer
              ? l("Your approved models", "Tus modelos autorizados")
              : l("Local AI workflow preview", "Demo local del flujo AI")
          }
        >
          {consumer
            ? l(
                "Streaming, citations, usage and tool decisions use your injected model adapter.",
                "Streaming, citas, consumo y decisiones de herramientas usan tu adaptador de modelos.",
              )
            : l(
                "Try streaming, cancellation, retry, sources and an explicit tool approval. Responses and usage are local fixtures.",
                "Prueba streaming, cancelación, reintento, fuentes y aprobación explícita de una herramienta. Las respuestas y el consumo son fixtures locales.",
              )}
        </Alert>
        <AiWorkspace
          key={`${scope.workspaceId}:${selected}`}
          adapter={ai ?? demoAi}
          providerOptionId={selected}
          workspaceId={scope.workspaceId}
          diagnostics={aiDiagnostics ?? canManage ?? !consumer}
        />
      </div>
    );
  return (
    <div className="grid gap-5" data-integration-domain="commerce">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ReceiptText aria-hidden className="size-5 text-primary" />
          {l("Commerce workspace", "Workspace de comercio")}
        </h3>
        <Badge variant="outline">
          {consumer
            ? connection.account.name
            : l("Local preview · no payments", "Demo local · sin pagos")}
        </Badge>
      </div>
      <CommerceProvider
        key={`${scope.workspaceId}:${selected}`}
        adapter={commerce}
        demoProvider={
          consumer
            ? undefined
            : {
                id: selected,
                label:
                  definition.options.find((option) => option.id === selected)
                    ?.name ?? definition.name,
              }
        }
      >
        <Tabs
          value={commerceTab}
          onValueChange={(value) => setCommerceTab(String(value))}
        >
          <TabsList aria-label={l("Commerce workflows", "Flujos de comercio")}>
            <TabsTrigger value="products">
              <Package aria-hidden />
              {l("Products & images", "Productos e imágenes")}
            </TabsTrigger>
            <TabsTrigger value="orders">{l("Orders", "Pedidos")}</TabsTrigger>
            <TabsTrigger value="invoices">
              {l("Invoices", "Facturas")}
            </TabsTrigger>
            <TabsTrigger value="billing">
              <Sparkles aria-hidden />
              {l("Plans & billing", "Planes y facturación")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="products">
            <ProductsManager />
          </TabsContent>
          <TabsContent value="orders">
            <CommerceWorkspace mode="orders" />
          </TabsContent>
          <TabsContent value="invoices">
            <CommerceWorkspace mode="invoices" />
          </TabsContent>
          <TabsContent value="billing">
            <CommerceWorkspace mode="billing" />
          </TabsContent>
        </Tabs>
      </CommerceProvider>
    </div>
  );
}
