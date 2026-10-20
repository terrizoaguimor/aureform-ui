"use client";

import { ArrowRight, ArrowUpRight, Check, FileText, GitBranch, Link2, ListChecks, Route, ShieldCheck, Wrench, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { publicPath } from "@/lib/public-path";
import {
  aiProviders,
  isAiPublicLink,
  isAiTraceLink,
  type AiApprovalActionState,
  type AiApprovalPart,
  type AiMessage,
  type AiSafeTraceLink,
} from "@/lib/ai-integration";

export type AiMessagePartsProps = {
  message: AiMessage;
  locale?: "en" | "es";
  onApprovalDecision?: (approval: AiApprovalPart, approved: boolean) => void;
  approvalActions?: Readonly<Record<string, AiApprovalActionState>>;
  /** Presentation only. The backend must authorize every diagnostic field it publishes. */
  diagnostics?: boolean;
};

/** Published text and summaries only; provider payloads never become HTML. */
export function AiMessageParts({
  message, locale = "en", onApprovalDecision, approvalActions = {}, diagnostics = false,
}: AiMessagePartsProps) {
  const l = (en: string, es: string) => locale === "es" ? es : en;
  const number = (value: number | null | undefined) =>
    value == null ? "—" : new Intl.NumberFormat(locale).format(value);
  const parts = message.parts?.length
    ? message.parts
    : [{ type: "text" as const, id: "legacy-text", text: message.content }];
  const sources = parts.filter((part) => part.type === "source");
  const toolStates = {
    pending: l("Pending", "Pendiente"),
    running: l("Running", "En curso"),
    completed: l("Completed", "Completada"),
    failed: l("Failed", "Fallida"),
    rejected: l("Rejected", "Rechazada"),
  };
  const progressStates = {
    queued: l("Queued", "En cola"),
    running: l("Running", "En curso"),
    completed: l("Completed", "Completado"),
    failed: l("Failed", "Fallido"),
    cancelled: l("Cancelled", "Cancelado"),
  };
  const handoffStates = {
    requested: l("Requested", "Solicitado"),
    accepted: l("Accepted", "Aceptado"),
    completed: l("Completed", "Completado"),
    failed: l("Failed", "Fallido"),
    rejected: l("Rejected", "Rechazado"),
    cancelled: l("Cancelled", "Cancelado"),
  };
  const fallbackReasons = {
    "rate-limit": l("Rate limit", "Límite de solicitudes"),
    unavailable: l("Unavailable", "No disponible"),
    timeout: l("Timeout", "Tiempo agotado"),
    policy: l("Policy", "Política"),
    other: l("Other", "Otro"),
  };
  const providerLabel = (value: string | null) => value === null
    ? l("Not reported", "No reportado")
    : aiProviders.find((provider) => provider.id === value)?.label ?? value;
  const ended = Boolean(message.status && !["streaming", "waiting-approval"].includes(message.status));
  return (
    <div className="min-w-0 space-y-4" data-ai-message-parts>
      {parts.map((part) => {
        if (part.type === "text") return <PublishedText key={part.id} text={part.text} />;
        if (part.type === "source") return null;
        if (part.type === "routing") return diagnostics ? (
          <section key={part.id} data-ai-routing={part.id} data-ai-run-id={part.runId}
            aria-label={l("Routing diagnostics", "Diagnósticos de enrutamiento")}
            className="min-w-0 rounded-xl border border-border bg-surface-subtle/60 p-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <Route className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <p className="flex-1 text-xs font-semibold">{l("Routing diagnostics", "Diagnósticos de enrutamiento")}</p>
              <Badge variant="neutral">
                {part.basis === "demo" ? l("Simulated", "Simulado") : part.basis === "unavailable"
                  ? l("Unavailable", "No disponible") : l("Backend reported", "Reportado por el backend")}
              </Badge>
            </div>
            <dl className="mt-3 grid min-w-0 gap-x-5 gap-y-2 text-xs leading-6 sm:grid-cols-2">
              {([
                [l("Run", "Ejecución"), part.runId],
                [l("Attempt", "Intento"), number(part.attempt)],
                [l("Gateway", "Gateway"), providerLabel(part.gateway)],
                [l("Provider", "Proveedor"), providerLabel(part.provider)],
                [l("Model", "Modelo"), part.model ?? l("Not reported", "No reportado")],
              ] as const).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="break-all font-mono text-[11px]">{value}</dd>
                </div>
              ))}
            </dl>
            {part.fallback && (
              <div className="mt-3 min-w-0 rounded-lg border border-primary/20 bg-accent/25 p-3" data-ai-fallback>
                <p className="text-xs font-semibold">{l("Fallback", "Proveedor alternativo")} · {fallbackReasons[part.fallback.reason]}</p>
                <p className="mt-1 break-all font-mono text-[11px] leading-6">
                  {providerLabel(part.fallback.fromProvider)} · {part.fallback.fromModel}
                  <ArrowRight className="mx-1.5 inline size-3" aria-hidden="true" />
                  {providerLabel(part.provider)} · {part.model}
                </p>
                {part.fallback.summary && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{part.fallback.summary}</p>}
              </div>
            )}
            {part.summary && <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{part.summary}</p>}
            {part.basis === "demo" && <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {l("Local simulation; no gateway or native provider was called.", "Simulación local; no se llamó a un gateway ni a un proveedor nativo.")}
            </p>}
            <TraceReference link={part.basis === "reported" ? part.safeTraceLink : undefined} locale={locale} />
          </section>
        ) : null;
        if (part.type === "progress") {
          const lastReported = ended && ["queued", "running"].includes(part.state);
          return (
            <section key={part.id} data-ai-progress={part.id} data-ai-progress-state={part.state}
              data-ai-run-id={part.runId} data-ai-last-reported={lastReported || undefined}
              aria-label={l("Run progress", "Progreso de la ejecución")}
              className="min-w-0 rounded-xl border border-border bg-surface/65 p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <ListChecks className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="min-w-0 flex-1 break-words text-xs font-semibold">{part.label}</p>
                <Badge variant={part.state === "failed" ? "destructive" : part.state === "completed" ? "default" : "neutral"}>
                  {progressStates[part.state]}
                </Badge>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{part.summary}</p>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span>{part.basis === "demo" ? l("Simulated progress", "Progreso simulado") : l("Backend reported progress", "Progreso reportado por el backend")}</span>
                {part.completed === null && part.total === null
                  ? <span>{l("Counts unavailable", "Cifras no disponibles")}</span>
                  : <span className="font-mono">{number(part.completed)} / {number(part.total)}</span>}
                {lastReported && <span>{l("Last reported state; this session has ended.", "Último estado reportado; esta sesión ha terminado.")}</span>}
              </p>
            </section>
          );
        }
        if (part.type === "handoff") {
          const lastReported = ended && ["requested", "accepted"].includes(part.state);
          return (
            <section key={part.id} data-ai-handoff={part.id} data-ai-handoff-state={part.state}
              data-ai-run-id={part.runId} data-ai-last-reported={lastReported || undefined}
              aria-label={l("Agent handoff", "Transferencia entre agentes")}
              className="min-w-0 rounded-xl border border-primary/20 bg-accent/20 p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <GitBranch className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="flex-1 text-xs font-semibold">{l("Agent handoff", "Transferencia entre agentes")}</p>
                <Badge variant={part.state === "failed" ? "destructive" : part.state === "completed" ? "default" : "neutral"}>
                  {handoffStates[part.state]}
                </Badge>
              </div>
              <p className="mt-3 break-words text-xs font-medium">
                {part.from}<ArrowRight className="mx-2 inline size-3" aria-hidden="true" />{part.to}
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{part.summary}</p>
              <p className="mt-3 text-[11px] leading-6 text-muted-foreground">
                {part.basis === "demo" ? l("Simulated handoff · no external agent connected", "Transferencia simulada · sin agente externo conectado")
                  : l("Handoff reported by your backend", "Transferencia reportada por tu backend")}
                {lastReported && <span className="block">{l("Last reported state; this session has ended.", "Último estado reportado; esta sesión ha terminado.")}</span>}
              </p>
            </section>
          );
        }
        if (part.type === "tool") return (
          <div key={part.id} data-ai-tool={part.id} data-ai-tool-state={part.state}
            className="min-w-0 rounded-xl border border-border bg-surface-subtle/60 p-4 transition-colors hover:border-primary/35 motion-reduce:transition-none">
            <div className="flex flex-wrap items-center gap-2.5">
              <Wrench className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 break-all font-mono text-xs font-semibold">{part.name}</span>
              <Badge variant={part.state === "failed" ? "destructive" : part.state === "completed" ? "default" : "neutral"}>
                {toolStates[part.state]}
              </Badge>
            </div>
            <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{part.summary}</p>
          </div>
        );
        if (part.type === "approval") {
          const action = approvalActions[part.id];
          const active = part.state === "requested" && Boolean(onApprovalDecision);
          const busy = action?.state === "sending" || action?.state === "submitted";
          return (
            <section key={part.id} data-ai-approval={part.id} data-ai-approval-state={part.state}
              aria-label={l("Tool approval", "Aprobación de herramienta")}
              className="min-w-0 rounded-xl border border-primary/30 bg-accent/35 p-4">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">{part.title}</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">{part.summary}</p>
                </div>
              </div>
              {part.state !== "requested" ? (
                <Badge className="mt-3" variant={part.state === "approved" ? "default" : "neutral"}>
                  {part.state === "approved" ? l("Approved by backend", "Aprobada por el backend") : l("Rejected by backend", "Rechazada por el backend")}
                </Badge>
              ) : active ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" size="sm" className="min-h-11" disabled={busy}
                    loading={action?.state === "sending"} onClick={() => onApprovalDecision?.(part, true)}>
                    <Check aria-hidden="true" />{l("Approve tool", "Aprobar herramienta")}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="min-h-11" disabled={busy}
                    onClick={() => onApprovalDecision?.(part, false)}>
                    <X aria-hidden="true" />{l("Reject tool", "Rechazar herramienta")}
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-6 text-muted-foreground">
                  {l("This approval is not active in this session.", "Esta aprobación no está activa en esta sesión.")}
                </p>
              )}
              {action?.state === "submitted" && part.state === "requested" && (
                <p role="status" className="mt-3 text-xs text-muted-foreground">
                  {l("Decision sent. Waiting for backend confirmation.", "Decisión enviada. Esperando confirmación del backend.")}
                </p>
              )}
              {action?.state === "failed" && (
                <p role="alert" className="mt-3 text-xs leading-6 text-destructive-foreground">{action.error}</p>
              )}
            </section>
          );
        }
        const href = part.url && isAiPublicLink(part.url) ? publicPath(part.url) : undefined;
        return (
          <div key={part.id} data-ai-file={part.id}
            className="flex min-w-0 flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4">
            <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="break-all text-xs font-semibold">{part.name}</p>
              <p className="mt-1 break-all text-[11px] text-muted-foreground">
                {part.mediaType}{part.bytes == null ? "" : ` · ${number(part.bytes)} ${l("bytes", "bytes")}`}
              </p>
            </div>
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary underline-offset-4 hover:underline">
                {l("Open file", "Abrir archivo")}<ArrowUpRight className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{l("(new tab)", "(pestaña nueva)")}</span>
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">{l("Download unavailable", "Descarga no disponible")}</span>
            )}
          </div>
        );
      })}
      {sources.length > 0 && (
        <aside aria-label={l("Sources", "Fuentes")} className="rounded-xl border border-border bg-surface/65 p-4" data-ai-sources>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold">
            <Link2 className="size-3.5 text-primary" aria-hidden="true" />{l("Sources", "Fuentes")}
          </p>
          <ol className="grid gap-3">
            {sources.map((source, index) => {
              const href = source.url && isAiPublicLink(source.url) ? publicPath(source.url) : undefined;
              return (
                <li key={source.id} className="flex min-w-0 gap-2.5 text-xs leading-6">
                  <span className="shrink-0 font-mono text-primary">[{index + 1}]</span>
                  <div className="min-w-0">
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="break-words font-medium underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
                        {source.title}<ArrowUpRight className="ml-1 inline size-3" aria-hidden="true" />
                        <span className="sr-only">{l("(new tab)", "(pestaña nueva)")}</span>
                      </a>
                    ) : <span className="break-words font-medium">{source.title}</span>}
                    {source.summary && <p className="break-words text-muted-foreground">{source.summary}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>
      )}
      {diagnostics && message.role === "assistant" && message.status === "failed" && (
        <section aria-label={l("Error diagnostics", "Diagnósticos del error")} data-ai-error-diagnostics
          data-ai-run-id={message.error?.runId}
          className="min-w-0 rounded-xl border border-border bg-surface-subtle/60 p-4">
          <p className="text-xs font-semibold">{l("Error diagnostics", "Diagnósticos del error")}</p>
          {message.error?.code && <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">{message.error.code}</p>}
          {message.error?.runId && <p className="mt-2 break-all text-xs text-muted-foreground">
            {l("Run", "Ejecución")}: <span className="font-mono text-[11px]">{message.error.runId}</span>
          </p>}
          <TraceReference link={message.error?.runId ? message.error.safeTraceLink : undefined} locale={locale} />
        </section>
      )}
      {message.role === "assistant" && (
        <>
          {message.activity && (
            <p role="status" className="mb-3 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">
              {message.activity === "queued" ? l("Queued", "En cola") : message.activity === "waiting-approval"
                ? l("Waiting for approval", "Esperando aprobación") : l("Generating response", "Generando respuesta")}
              {message.activitySummary ? ` · ${message.activitySummary}` : ""}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3 text-[11px] text-muted-foreground" data-ai-usage>
            {message.status === "cancelled" && <Badge variant="neutral">{l("Stopped", "Detenido")}</Badge>}
            {message.status === "failed" && <Badge variant="destructive">{l("Response interrupted", "Respuesta interrumpida")}</Badge>}
            {message.status === "incomplete" && <Badge variant="warning">{l("Incomplete response", "Respuesta incompleta")}</Badge>}
            {message.status === "complete" && <span>{l("Completed", "Completada")}</span>}
            {message.usage && message.usage.basis !== "unavailable" ? (
              <>
                <span className="font-medium">{message.usage.basis === "demo" ? l("Demo tokens", "Tokens de ejemplo") : l("Reported tokens", "Tokens reportados")}</span>
                {([
                  [l("Input", "Entrada"), message.usage.inputTokens],
                  [l("Output", "Salida"), message.usage.outputTokens],
                  [l("Total", "Total"), message.usage.totalTokens],
                ] as const).map(([label, value]) => (
                  <span key={label}>{label}: <span className="font-mono" aria-label={value == null ? l("Unknown", "Desconocido") : undefined}>{number(value)}</span></span>
                ))}
                <span>{message.usage.basis === "demo" ? l("Illustrative counts · no billable usage", "Cifras ilustrativas · sin consumo facturable") : l("Cost unavailable", "Costo no disponible")}</span>
              </>
            ) : <span>{l("Usage unavailable", "Consumo no disponible")}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function TraceReference({ link, locale }: { link?: AiSafeTraceLink; locale: "en" | "es" }) {
  const l = (en: string, es: string) => locale === "es" ? es : en;
  const href = link && isAiTraceLink(link.href) ? publicPath(link.href) : undefined;
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" data-ai-trace
      className="mt-3 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="min-w-0 break-words">{link?.label ?? l("Open approved trace", "Abrir traza aprobada")}</span>
      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="sr-only">{l("(new tab)", "(pestaña nueva)")}</span>
    </a>
  ) : (
    <p className="mt-3 text-xs leading-6 text-muted-foreground" data-ai-trace-unavailable>
      {l("Trace unavailable", "Traza no disponible")}
    </p>
  );
}

function PublishedText({ text }: { text: string }) {
  return (
    <div className="min-w-0 text-[13px] leading-[1.85] text-foreground/90">
      {text.split(/(```[\s\S]*?```)/g).map((part, index) => part.startsWith("```") ? (
        <pre key={index} tabIndex={0} className="my-4 overflow-x-auto rounded-lg border border-border bg-surface-subtle p-4 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <code>{part.replace(/^```\w*\n?/, "").replace(/```$/, "")}</code>
        </pre>
      ) : <span key={index} className="whitespace-pre-wrap break-words">{part}</span>)}
    </div>
  );
}
