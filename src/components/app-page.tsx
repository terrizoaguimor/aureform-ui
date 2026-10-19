"use client";
import { useState } from "react";
import { Providers } from "@/components/providers";
import { MotionSystem } from "@/components/motion-system";
import {
  DashboardShell,
  type ShellLayout,
} from "@/components/blocks/dashboard-shell";
import { LandingTemplate } from "@/components/templates/landing";
import { AppearanceStudio } from "@/components/templates/appearance-studio";
import { ThemesTemplate, EffectsTemplate } from "@/components/templates/appearance-gallery";
import { DashboardTemplate } from "@/components/templates/dashboard";
import { DataManager } from "@/components/templates/data-manager";
import { AIWorkspace } from "@/components/templates/ai-workspace";
import { SettingsTemplate } from "@/components/templates/settings";
import { AuthTemplate } from "@/components/templates/auth";
import { OnboardingOperationsTemplate, CustomerRecordOperationsTemplate } from "@/components/templates/saas-operations";
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
export function AppPage({ locale, path }: { locale: Locale; path: string }) {
  const [layout, setLayout] = useState<ShellLayout>("sidebar");
  let content: React.ReactNode = null,
    standalone = false;
  if (!path) {
    content = <LandingTemplate />;
    standalone = true;
  } else if (path.startsWith("auth/")) {
    content = (
      <AuthTemplate
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
      <AIWorkspace
        mode={
          path === "ai" ? "chat" : path === "ai/code" ? "code" : "playground"
        }
      />
    );
  else if (path === "onboarding") content = <OnboardingOperationsTemplate />;
  else if (path === "customers/detail") content = <CustomerRecordOperationsTemplate />;
  else if (path === "imports") content = <CustomerImportTemplate />;
  else if (path.startsWith("settings/"))
    content = <SettingsTemplate section={path.split("/")[1] as "profile"} />;
  else if (["tasks", "task-list", "pipeline"].includes(path))
    content = <WorkBoard mode={path as "tasks"} />;
  else if (path === "calendar") content = <CalendarTemplate />;
  else if (path === "mail") content = <MailTemplate />;
  else if (path === "chat") content = <ChatTemplate />;
  else if (path === "files") content = <FilesTemplate />;
  else if (path === "support") content = <SupportTemplate />;
  else if (path === "maps") content = <MapsTemplate />;
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
  return (
    <Providers locale={locale}>
      <MotionSystem key={`${locale}:${path}`} smoothScroll={!path}>
        {standalone ? (
          content
        ) : (
          <DashboardShell path={path} layout={layout}>
            {content}
          </DashboardShell>
        )}
      </MotionSystem>
    </Providers>
  );
}
