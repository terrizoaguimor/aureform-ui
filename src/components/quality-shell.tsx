import type { ReactNode } from "react";
import { PublicPageShell } from "@/components/public-page-shell";
import type { Locale } from "@/i18n/messages";

export function QualityShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <PublicPageShell locale={locale} section="quality">
      {children}
    </PublicPageShell>
  );
}
