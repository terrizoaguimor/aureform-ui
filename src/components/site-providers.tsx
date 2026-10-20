"use client";

import { NextIntlClientProvider } from "next-intl";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import {
  AppearanceProvider,
  useAppearance,
} from "@/components/appearance-provider";
import { messages, type Locale } from "@/i18n/messages";

/** Marketing does not need a customer, billing or commerce workspace. */
export function SiteProviders({
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
        <SiteContent>{children}</SiteContent>
      </AppearanceProvider>
    </NextIntlClientProvider>
  );
}
function SiteContent({ children }: { children: ReactNode }) {
  const { appearance } = useAppearance();
  return (
    <TooltipPrimitive.Provider delay={300}>
      {children}
      <Toaster theme={appearance.theme} position="bottom-right" closeButton />
    </TooltipPrimitive.Provider>
  );
}
