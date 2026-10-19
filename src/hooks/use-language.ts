"use client";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import type { Locale } from "@/i18n/messages";
export function useLanguage() {
  const locale = useLocale() as Locale;
  const common = useTranslations("common");
  const l = useCallback(
    (en: string, es: string) => (locale === "es" ? es : en),
    [locale],
  );
  const number = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(
        locale === "es" ? "es-CO" : "en-US",
        options,
      ).format(value),
    [locale],
  );
  const currency = useCallback(
    (value: number) =>
      number(value, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [number],
  );
  const date = useCallback(
    (value: Date | string, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(
        locale === "es" ? "es-CO" : "en-US",
        options ?? { month: "short", day: "numeric", year: "numeric" },
      ).format(
        new Date(
          typeof value === "string" && value.length === 10
            ? `${value}T12:00:00`
            : value,
        ),
      ),
    [locale],
  );
  return { locale, common, l, number, currency, date };
}
