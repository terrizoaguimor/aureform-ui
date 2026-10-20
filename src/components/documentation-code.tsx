"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/messages";

export function DocumentationCode({
  code,
  language,
  locale,
}: {
  code: string;
  language: string;
  locale: Locale;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setStatus("idle"), 2500);
  }
  const label =
    status === "copied"
      ? locale === "es"
        ? "Copiado"
        : "Copied"
      : locale === "es"
        ? "Copiar código"
        : "Copy code";
  return (
    <div className="af-doc-code my-6 overflow-hidden rounded-2xl border border-border bg-muted/30">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2.5 text-xs">
        <span className="font-mono text-muted-foreground">
          {language || "text"}
        </span>
        <button
          type="button"
          aria-label={label}
          onClick={() => void copy()}
          className="inline-flex min-h-8 items-center gap-2 rounded-lg px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {status === "copied" ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {label}
        </button>
      </div>
      <pre
        className="max-w-full overflow-x-auto p-5 text-[13px] leading-7"
        tabIndex={0}
        aria-label={locale === "es" ? "Ejemplo de código" : "Code example"}
      >
        <code>{code}</code>
      </pre>
      <span
        role="status"
        className={
          status === "error"
            ? "block px-5 pb-3 text-xs text-muted-foreground"
            : "sr-only"
        }
      >
        {status === "error"
          ? locale === "es"
            ? "No se pudo copiar. Selecciona el código para copiarlo manualmente."
            : "Could not copy. Select the code to copy it manually."
          : status === "copied"
            ? label
            : ""}
      </span>
    </div>
  );
}
