"use client";

import { SiteProviders } from "@/components/site-providers";
import { MotionSystem } from "@/components/motion-system";
import { LandingTemplate } from "@/components/templates/landing";
import type { Locale } from "@/i18n/messages";

export function MarketingPage({ locale }: { locale: Locale }) {
  return (
    <SiteProviders locale={locale}>
      <MotionSystem key={locale} smoothScroll>
        <LandingTemplate />
      </MotionSystem>
    </SiteProviders>
  );
}
