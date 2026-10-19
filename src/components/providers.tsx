"use client";
import { NextIntlClientProvider } from "next-intl";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { Toaster } from "sonner";
import { useEffect, type ReactNode } from "react";
import { messages, type Locale } from "@/i18n/messages";
import {
  AppearanceProvider,
  useAppearance,
} from "@/components/appearance-provider";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { CommerceProvider } from "@/components/commerce-provider";
import type { CommerceAdapter } from "@/lib/commerce";
import type { Theme } from "@/lib/appearance";
export function useTheme() {
  const { appearance, setAppearance } = useAppearance();
  return {
    theme: appearance.theme,
    setTheme: (theme: Theme) =>
      setAppearance((previous) => ({ ...previous, theme })),
  };
}
export function Providers({
  children,
  locale,
  commerceAdapter,
}: {
  children: ReactNode;
  locale: Locale;
  commerceAdapter?: CommerceAdapter;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone="America/Bogota"
    >
      <AppearanceProvider>
        <WorkspaceProvider>
          <CommerceProvider adapter={commerceAdapter}>
            <ProviderContent locale={locale}>{children}</ProviderContent>
          </CommerceProvider>
        </WorkspaceProvider>
      </AppearanceProvider>
    </NextIntlClientProvider>
  );
}
function ProviderContent({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const { appearance } = useAppearance();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <TooltipPrimitive.Provider delay={300}>
      {children}
      <Toaster
        theme={appearance.theme}
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: "var(--font-manrope)",
            background: "var(--surface)",
            color: "var(--foreground)",
            borderColor: "var(--border)",
          },
        }}
        closeButton
      />
    </TooltipPrimitive.Provider>
  );
}
