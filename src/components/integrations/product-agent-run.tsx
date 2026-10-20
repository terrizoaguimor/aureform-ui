"use client";

import { ArrowRight, ArrowUpRight, GitBranch, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/use-language";
import type { IntegrationToolRun } from "@/lib/integrations/contracts";
import { isIntegrationTraceUrl } from "@/lib/integrations/validation";
import { publicPath } from "@/lib/public-path";

/** Syntax checking is separate from the backend's authorization of the trace. */
export function productAgentTraceHref(value?: string, demo = false) {
  return !demo && typeof value === "string" && value.length <= 2048 && isIntegrationTraceUrl(value)
    ? publicPath(value)
    : undefined;
}

/** Reads only published run fields; inputs, reasoning and raw payloads are excluded. */
export function ProductAgentRunSummary({
  run,
  demo = false,
}: {
  run: IntegrationToolRun;
  demo?: boolean;
}) {
  const { locale, l } = useLanguage();
  const stateLabels = {
    requested: l("Requested", "Solicitado"),
    accepted: l("Accepted", "Aceptado"),
    queued: l("Queued", "En cola"),
    running: l("Running", "En curso"),
    completed: l("Completed", "Completado"),
    failed: l("Failed", "Fallido"),
    rejected: l("Rejected", "Rechazado"),
    cancelled: l("Cancelled", "Cancelado"),
  };
  const number = (value: number | null) => value === null
    ? l("Unknown", "Desconocido")
    : new Intl.NumberFormat(locale).format(value);
  const href = productAgentTraceHref(run.safeTraceUrl, demo);
  const terminal = ["completed", "failed", "rejected"].includes(run.state);
  const progress = run.progress;
  return (
    <section className="mt-5 min-w-0 space-y-4 border-t border-border/70 pt-4"
      data-product-agent-run={run.id} aria-label={l("Published execution details", "Detalles publicados de la ejecución")}>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="neutral">{demo ? l("Local simulation", "Simulación local") : l("Backend reported", "Reportado por el backend")}</Badge>
        <span className="min-w-0 break-all">{l("Run", "Ejecución")}: <span className="font-mono">{run.id}</span></span>
      </div>
      {demo && <p className="text-xs leading-6 text-muted-foreground">
        {l("Local fixtures only; no agent service was called.", "Solo datos locales de ejemplo; no se llamó a un servicio de agentes.")}
      </p>}
      {progress ? (
        <div className="min-w-0 rounded-xl border border-border bg-surface-subtle/50 p-4"
          data-product-agent-progress-state={progress.state}
          data-product-agent-last-reported={terminal && ["queued", "running"].includes(progress.state) || undefined}>
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <ListChecks className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="min-w-0 flex-1 break-words text-xs font-semibold">{progress.label}</p>
            <Badge variant={progress.state === "failed" ? "destructive" : progress.state === "completed" ? "default" : "neutral"}>
              {stateLabels[progress.state]}
            </Badge>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{progress.summary}</p>
          <p className="mt-3 text-xs" data-product-agent-counts>
            {progress.completed === null && progress.total === null
              ? l("Counts not reported", "Cifras no reportadas")
              : <>{l("Completed units", "Unidades completadas")}: <span className="font-mono">{number(progress.completed)} / {number(progress.total)}</span></>}
          </p>
          {terminal && ["queued", "running"].includes(progress.state) && <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
            {l("Last reported progress; the run has ended.", "Último progreso reportado; la ejecución ha terminado.")}
          </p>}
        </div>
      ) : <p className="text-xs text-muted-foreground">{l("Progress not reported", "Progreso no reportado")}</p>}
      {run.handoffs?.length ? (
        <div className="min-w-0">
          <h5 className="mb-3 text-xs font-semibold">{l("Agent handoffs", "Transferencias entre agentes")}</h5>
          <ol className="grid min-w-0 gap-3">
            {run.handoffs.map((handoff) => {
              const lastReported = terminal && ["requested", "accepted"].includes(handoff.state);
              return (
                <li key={handoff.id} className="min-w-0 rounded-xl border border-primary/20 bg-accent/20 p-4"
                  data-product-agent-handoff={handoff.id} data-product-agent-handoff-state={handoff.state}
                  data-product-agent-last-reported={lastReported || undefined}>
                  <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <GitBranch className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <p className="min-w-0 flex-1 break-words text-xs font-medium">
                      {handoff.from}<ArrowRight className="mx-2 inline size-3" aria-hidden="true" />{handoff.to}
                    </p>
                    <Badge variant={handoff.state === "failed" ? "destructive" : handoff.state === "completed" ? "default" : "neutral"}>
                      {stateLabels[handoff.state]}
                    </Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{handoff.summary}</p>
                  {lastReported && <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
                    {l("Last reported handoff; the run has ended.", "Última transferencia reportada; la ejecución ha terminado.")}
                  </p>}
                </li>
              );
            })}
          </ol>
        </div>
      ) : <p className="text-xs text-muted-foreground">
        {run.handoffs
          ? l("No handoffs in this run", "Esta ejecución no tiene transferencias")
          : l("Handoffs not reported", "Transferencias no reportadas")}
      </p>}
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" data-product-agent-trace
          className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span>{l("Open approved trace", "Abrir traza aprobada")}</span>
          <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">{l("(new tab)", "(pestaña nueva)")}</span>
        </a>
      ) : <p className="text-xs text-muted-foreground" data-product-agent-trace-unavailable>
        {l("Trace unavailable", "Traza no disponible")}
      </p>}
    </section>
  );
}
