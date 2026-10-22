"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Providers } from "@/components/providers";
import { MotionSystem } from "@/components/motion-system";
import {
  DashboardShell,
  type ShellLayout,
} from "@/components/blocks/dashboard-shell";
import { LandingTemplate } from "@/components/templates/landing";
import { AppearanceStudio } from "@/components/templates/appearance-studio";
import {
  ThemesTemplate,
  EffectsTemplate,
} from "@/components/templates/appearance-gallery";
import { DashboardTemplate } from "@/components/templates/dashboard";
import { DataManager } from "@/components/templates/data-manager";
import { SettingsTemplate } from "@/components/templates/settings";
import { AuthTemplate } from "@/components/templates/auth";
import {
  OnboardingOperationsTemplate,
  CustomerRecordOperationsTemplate,
} from "@/components/templates/saas-operations";
import { CustomerImportTemplate } from "@/components/templates/customer-import";
import { WorkBoard } from "@/components/templates/work-board";
import { CalendarTemplate } from "@/components/templates/calendar";
import {
  MailTemplate,
  ChatTemplate,
} from "@/components/templates/communication";
import {
  FilesTemplate,
  SupportTemplate,
} from "@/components/templates/files-support";
import {
  MapsTemplate,
  InvoiceTemplate,
} from "@/components/templates/map-invoice";
import {
  MediaTemplate,
  StudioTemplate,
} from "@/components/templates/media-studio";
import { ComponentsTemplate } from "@/components/templates/components";
import { FormsTemplate } from "@/components/templates/forms";
import {
  ChartsTemplate,
  TemplatesTemplate,
  LayoutsTemplate,
  BlocksTemplate,
} from "@/components/templates/catalogs";
import { DocsTemplate } from "@/components/templates/docs";
import {
  PricingTemplate,
  FAQTemplate,
  StatusTemplate,
} from "@/components/templates/auxiliary";
import type { Locale } from "@/i18n/messages";
import type { CommerceAdapter } from "@/lib/commerce";
import type { AuthAdapter, ProviderSignInHandler } from "@/lib/demo-auth";
import type { AiWorkspaceAdapter } from "@/lib/ai-integration";
import type { AIWorkspaceProps } from "@/components/templates/ai-workspace";
import type { AuthWorkflowAdapter } from "@/lib/auth-integration";
import type { IntegrationSuite } from "@/lib/integrations/suite";
import type { IntegrationUiBindings } from "@/lib/integrations/ui-bindings";
import type { IntegrationsAdapter } from "@/lib/integrations/contracts";
import type { CommunicationsAdapter } from "@/lib/communications/contracts";
import type { ConnectedSoftphoneLiveProps } from "@/components/communications/connected-softphone";
import { useWorkspace } from "@/components/workspace-provider";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";
import { buttonVariants } from "@/components/ui/button";
import { publicPath } from "@/lib/public-path";
import { Code2 } from "lucide-react";
const AIWorkspace = dynamic(() =>
  import("@/components/templates/ai-workspace").then(
    (module) => module.AIWorkspace,
  ),
);
const IntegrationHub = dynamic(() =>
  import("@/components/integrations/integration-hub").then(
    (module) => module.IntegrationHub,
  ),
);
const CommunicationsSoftphoneTemplate = dynamic(() =>
  import("@/components/templates/communications-softphone-template").then(
    (module) => module.CommunicationsSoftphoneTemplate,
  ),
);
export type AppPageProps = {
  locale: Locale;
  path: string;
  commerceAdapter?: CommerceAdapter;
  authAdapter?: AuthAdapter;
  onProviderSignIn?: ProviderSignInHandler;
  authWorkflowAdapter?: AuthWorkflowAdapter;
  aiAdapter?: AiWorkspaceAdapter;
  integrationsAdapter?: IntegrationsAdapter;
  integrationSuite?: IntegrationSuite;
  integrationUi?: IntegrationUiBindings;
  communicationsAdapter?: CommunicationsAdapter;
  communicationsConnection?: ConnectedSoftphoneLiveProps;
};
export function AppPage({
  locale,
  path,
  commerceAdapter,
  authAdapter,
  onProviderSignIn,
  authWorkflowAdapter,
  aiAdapter,
  integrationsAdapter,
  integrationSuite,
  integrationUi,
  communicationsAdapter,
  communicationsConnection,
}: AppPageProps) {
  const [layout, setLayout] = useState<ShellLayout>("sidebar");
  const selectedIdentity =
    authWorkflowAdapter ?? Object.values(integrationSuite?.identity ?? {})[0];
  const selectedAi = aiAdapter ?? Object.values(integrationSuite?.ai ?? {})[0];
  const selectedCommerce =
    commerceAdapter ?? Object.values(integrationSuite?.commerce ?? {})[0];
  const consumerConnections =
    (integrationSuite?.connections ?? integrationsAdapter)?.mode === "consumer";
  let content: React.ReactNode = null,
    standalone = false;
  if (!path) {
    content = <LandingTemplate />;
    standalone = true;
  } else if (path.startsWith("auth/")) {
    content = (
      <AuthTemplate
        authAdapter={authAdapter}
        onProviderSignIn={onProviderSignIn}
        workflowAdapter={selectedIdentity}
        mode={
          path.split("/")[1] as
            "sign-in" | "sign-up" | "reset-password" | "verify"
        }
      />
    );
    standalone = true;
  } else if (
    [
      "dashboard",
      "analytics",
      "crm",
      "ecommerce",
      "sales",
      "marketing",
      "logistics",
      "finance",
      "stocks",
    ].includes(path)
  )
    content = <DashboardTemplate kind={path as "dashboard"} />;
  else if (
    ["customers", "products", "orders", "invoices", "transactions"].includes(
      path,
    )
  )
    content = <DataManager kind={path as "customers"} />;
  else if (["ai", "ai/playground", "ai/code"].includes(path))
    content = (
      <ScopedAIWorkspace
        adapter={selectedAi}
        mode={
          path === "ai" ? "chat" : path === "ai/code" ? "code" : "playground"
        }
      />
    );
  else if (path === "onboarding") content = <OnboardingOperationsTemplate />;
  else if (path === "customers/detail")
    content = <CustomerRecordOperationsTemplate />;
  else if (path === "imports") content = <CustomerImportTemplate />;
  else if (path === "integrations" || path.startsWith("integrations/"))
    content = (
      <IntegrationHub
        selectedId={path.split("/")[1]}
        adapter={integrationsAdapter}
        suite={integrationSuite}
        {...integrationUi}
      />
    );
  else if (path.startsWith("settings/"))
    content = (
      <SettingsTemplate
        section={path.split("/")[1] as "profile"}
        integrationHubProps={{
          adapter: integrationsAdapter,
          suite: integrationSuite,
          ...integrationUi,
        }}
      />
    );
  else if (["tasks", "task-list", "pipeline"].includes(path))
    content = <WorkBoard mode={path as "tasks"} />;
  else if (path === "calendar") content = <CalendarTemplate />;
  else if (path === "mail") content = <MailTemplate />;
  else if (path === "chat") content = <ChatTemplate />;
  else if (path === "files") content = <FilesTemplate />;
  else if (path === "support") content = <SupportTemplate />;
  else if (path === "maps") content = <MapsTemplate />;
  else if (path === "softphone")
    content = (
      <CommunicationsSoftphoneTemplate
        adapter={communicationsAdapter}
        connection={communicationsConnection}
      />
    );
  else if (path === "invoice") content = <InvoiceTemplate />;
  else if (path === "ai/images" || path === "ai/video")
    content = (
      <StudioTemplate kind={path === "ai/images" ? "images" : "video"} />
    );
  else if (path === "media") content = <MediaTemplate />;
  else if (path === "components") content = <ComponentsTemplate />;
  else if (path === "studio") content = <AppearanceStudio />;
  else if (path === "themes") content = <ThemesTemplate />;
  else if (path === "effects") content = <EffectsTemplate />;
  else if (path === "forms") content = <FormsTemplate />;
  else if (path === "charts") content = <ChartsTemplate />;
  else if (path === "templates") content = <TemplatesTemplate />;
  else if (path === "blocks") content = <BlocksTemplate />;
  else if (path === "layouts")
    content = <LayoutsTemplate layout={layout} onLayoutChange={setLayout} />;
  else if (path === "docs" || path.startsWith("docs/"))
    content = (
      <DocsTemplate section={path === "docs" ? "start" : path.split("/")[1]} />
    );
  else if (path === "pricing") content = <PricingTemplate />;
  else if (path === "faq") content = <FAQTemplate />;
  else if (path.startsWith("status/")) {
    content = <StatusTemplate kind={path.split("/")[1]} />;
    standalone = true;
  }
  if (consumerConnections) {
    const missingIdentity =
      path.startsWith("auth/") &&
      !selectedIdentity &&
      !authAdapter &&
      !onProviderSignIn;
    const missingAi =
      ["ai", "ai/playground", "ai/code"].includes(path) && !selectedAi;
    const missingCommerce =
      [
        "products",
        "orders",
        "invoices",
        "transactions",
        "invoice",
        "pricing",
        "settings/billing",
      ].includes(path) && !selectedCommerce;
    const missingCommunications =
      path === "softphone" &&
      !communicationsAdapter &&
      !communicationsConnection;
    if (
      missingIdentity ||
      missingAi ||
      missingCommerce ||
      missingCommunications
    ) {
      content = <ConnectedWorkflowSetup locale={locale} />;
    }
  }
  return (
    <Providers locale={locale} commerceAdapter={selectedCommerce}>
      <MotionSystem key={`${locale}:${path}`} smoothScroll={!path}>
        {standalone ? (
          content
        ) : (
          <DashboardShell
            path={path}
            layout={layout}
            searchAdapter={
              integrationUi?.commandSearch ??
              integrationSuite?.ui?.commandSearch
            }
          >
            {content}
          </DashboardShell>
        )}
      </MotionSystem>
    </Providers>
  );
}

function ScopedAIWorkspace(props: AIWorkspaceProps) {
  const { workspaceId } = useWorkspace();
  return <AIWorkspace {...props} workspaceId={workspaceId} />;
}

function ConnectedWorkflowSetup({ locale }: { locale: Locale }) {
  return (
    <Card className="mx-auto my-8 w-full max-w-3xl">
      <Empty
        icon={<Code2 aria-hidden="true" className="size-5" />}
        title={
          locale === "es"
            ? "Conecta el adaptador de este flujo"
            : "Connect this workflow's adapter"
        }
        description={
          locale === "es"
            ? "Añade el adaptador de identidad, AI, comercio o comunicaciones para usar esta pantalla con los servicios de tu aplicación."
            : "Add the identity, AI, commerce or communications adapter to use this screen with your application's services."
        }
        action={
          <a
            className={buttonVariants({ variant: "outline" })}
            href={publicPath(`/${locale}/docs/integrations/`)}
          >
            {locale === "es"
              ? "Ver ejemplos de conexión"
              : "View connection examples"}
          </a>
        }
      />
    </Card>
  );
}
