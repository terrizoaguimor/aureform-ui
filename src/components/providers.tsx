"use client";
import { NextIntlClientProvider } from "next-intl";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { Toaster } from "sonner";
import { useEffect, type ReactNode } from "react";
import { messages, type Locale } from "@/i18n/messages";
import { AppearanceProvider, useAppearance } from "@/components/appearance-provider";
import { WorkspaceProvider } from "@/components/workspace-provider";
import type { Theme } from "@/lib/appearance";
export function useTheme() {
  const { appearance, setAppearance } = useAppearance();
  return { theme: appearance.theme, setTheme: (theme: Theme) => setAppearance((previous) => ({ ...previous, theme })) };
}
export function Providers({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone="America/Bogota"
    >
      <AppearanceProvider>
        <WorkspaceProvider>
          <ProviderContent locale={locale}>{children}</ProviderContent>
        </WorkspaceProvider>
      </AppearanceProvider>
    </NextIntlClientProvider>
  );
}
function ProviderContent({ children, locale }: { children: ReactNode; locale: Locale }) {
  const { appearance } = useAppearance();
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
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
