"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Plus,
  Copy,
  Check,
  RotateCcw,
  Trash2,
  Download,
  Code2,
  Feather,
  Lightbulb,
  SlidersHorizontal,
  TriangleAlert,
  Paperclip,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useDemoStore } from "@/hooks/use-demo-store";
import { useCopy } from "@/hooks/use-copy";
import { useAppearance } from "@/components/appearance-provider";
import {
  GlowBorder,
  ShaderBackground,
  SpotlightCard,
} from "@/components/effects";
import { AureformMark } from "@/components/brand";
import { AIComposer } from "@/components/blocks/ai-composer";
import { AiMessageParts } from "@/components/blocks/ai-message-parts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";

import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { cn, downloadText } from "@/lib/utils";
import type { DemoModel } from "@/demo/ai-adapter";
import {
  AiProtocolError,
  applyAiEvent,
  createDemoAiWorkspaceAdapter,
  defaultAiWorkspaceId,
  validateAiEventStream,
  validateAiWorkspaceRequest,
  type AiApprovalActionState,
  type AiApprovalPart,
  type AiMessage,
  type AiWorkspaceAdapter,
} from "@/lib/ai-integration";
import { demoAvatarSources } from "@/demo/avatar-assets";
type ChatMessage = AiMessage;
export type AIWorkspaceProps = {
  mode?: "chat" | "playground" | "code";
  /** Inject from a Client Component; adapters contain non-serializable functions. */
  adapter?: AiWorkspaceAdapter;
  /** Selection context only. A real selection without an adapter cannot run the demo. */
  providerOptionId?: string;
  /** Remounts the session and cancels work when the consumer workspace changes. */
  workspaceId?: string;
  initialModel?: string;
  /** Displays authorized backend diagnostics; this flag does not grant access. */
  diagnostics?: boolean;
};
export function AIWorkspace(props: AIWorkspaceProps) {
  const workspaceId = props.workspaceId ?? defaultAiWorkspaceId;
  return <AIWorkspaceSession key={`${workspaceId}:${props.mode ?? "chat"}`} {...props} workspaceId={workspaceId} />;
}
function AIWorkspaceSession({
  mode = "chat",
  adapter,
  initialModel,
  providerOptionId,
  workspaceId,
  diagnostics = false,
}: AIWorkspaceProps & { workspaceId: string }) {
  const { locale, l, common: t } = useLanguage();
  const { appearance } = useAppearance();
  const defaultDemoAllowed = !providerOptionId || providerOptionId === "demo";
  const colors = useMemo<[string, string, string]>(
    () => [
      appearance.colors.primary,
      appearance.colors.secondary,
      appearance.colors.tertiary,
    ],
    [
      appearance.colors.primary,
      appearance.colors.secondary,
      appearance.colors.tertiary,
    ],
  );
  const [demoMessages, setDemoMessages] = useDemoStore<ChatMessage[]>(
    workspaceId === defaultAiWorkspaceId ? `ai-${mode}` : `ai-${workspaceId}-${mode}`, [],
  );
  const [sessionMessages, setSessionMessages] = useState<ChatMessage[]>([]);
  const sessionOnly = Boolean(adapter) || !defaultDemoAllowed;
  const storedMessages = sessionOnly ? sessionMessages : demoMessages;
  const setMessages = sessionOnly ? setSessionMessages : setDemoMessages;
  const [prompt, setPrompt] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [model, setModel] = useState<DemoModel>("balanced"),
    [selectedModelId, setSelectedModelId] = useState<string | undefined>(initialModel),
    [temperature, setTemperature] = useState(0.7),
    [system, setSystem] = useState("");
  const [simulateError, setSimulateError] = useState(false),
    [clearOpen, setClearOpen] = useState(false),
    [attachment, setAttachment] = useState<{
      name: string;
      content: string;
    } | null>(null);
  const [approvalActions, setApprovalActions] = useState<Record<string, AiApprovalActionState>>({});
  const selectedModel = selectedModelId === undefined
    ? adapter?.models[0] : adapter?.models.find((option) => option.id === selectedModelId);
  const isDemo = adapter?.kind === "demo" || (!adapter && defaultDemoAllowed);
  const configured = adapter ? Boolean(selectedModel) : defaultDemoAllowed;
  const demoAdapter = useMemo(() => createDemoAiWorkspaceAdapter({ fail: simulateError }), [simulateError]);
  const activeRequest = useRef<{ id: string; adapter: AiWorkspaceAdapter; controller: AbortController } | null>(null);
  const resolvedApprovals = useRef(new Set<string>());
  const submittingApprovals = useRef(new Set<string>());
  const controller = useRef<AbortController | null>(null),
    lastPrompt = useRef(""),
    lastAssistant = useRef(""),
    bottom = useRef<HTMLDivElement>(null),
    mounted = useRef(true);
  const messages = storedMessages.map((message): ChatMessage =>
    (message.status === "streaming" || message.status === "waiting-approval") &&
    message.id !== activeRequest.current?.id
      ? { ...message, status: "cancelled", activity: undefined, activitySummary: undefined }
      : message,
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => () => { controller.current?.abort(); }, [adapter, mode, providerOptionId, workspaceId]);
  useEffect(() => {
    if (messages.length)
      bottom.current?.scrollIntoView({
        behavior:
          pending ||
          appearance.motion === "off" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        block: "nearest",
      });
  }, [messages.length, pending, appearance.motion]);
  const generate = async (
    text: string,
    addUser = true,
    ignoreFailure = false,
  ) => {
    if (controller.current || pending || !configured || !text.trim()) return;
    const active = new AbortController();
    controller.current = active;
    const current = () => mounted.current && controller.current === active;
    const previousAssistant = lastAssistant.current;
    const selectedAdapter = adapter ?? (ignoreFailure ? createDemoAiWorkspaceAdapter() : demoAdapter);
    setPending(true);
    setError("");
    setApprovalActions({});
    resolvedApprovals.current.clear();
    submittingApprovals.current.clear();
    lastPrompt.current = text;
    const id = crypto.randomUUID();
    lastAssistant.current = id;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(), role: "user", content: text, status: "complete",
    };
    let response: ChatMessage = { id, role: "assistant", content: "", status: "streaming", parts: [] };
    activeRequest.current = { id, adapter: selectedAdapter, controller: active };
    setMessages((previous) => [
      ...previous,
      ...(addUser
        ? [
            userMessage,
          ]
        : []),
      response,
    ]);
    setPrompt("");
    try {
      const history = (addUser
        ? [...messages, userMessage]
        : messages.filter((message) => message.id !== previousAssistant)
      ).filter((message) => message.content.trim()).slice(-20);
      if (history.at(-1)?.role !== "user") history.push(userMessage);
      const request = validateAiWorkspaceRequest({
        v: 1, id, workspaceId, locale, mode,
        model: adapter ? { id: selectedModel?.id, provider: selectedModel?.provider } : { id: model, provider: "demo" },
        messages: history.map((message) => ({ role: message.role, content: message.content.slice(-32 * 1024) })),
        system, temperature,
        attachments: attachment ? [{ name: attachment.name, mediaType: "text/plain", text: attachment.content }] : [],
      });
      for await (const event of validateAiEventStream(selectedAdapter.stream(request, active.signal), {
        requestId: id, workspaceId, signal: active.signal,
      })) {
        if (!current()) break;
        response = applyAiEvent(response, event);
        if (event.type === "approval" && event.state !== "requested") {
          resolvedApprovals.current.add(event.id);
          submittingApprovals.current.delete(event.id);
          setApprovalActions((previous) => {
            const next = { ...previous };
            delete next[event.id];
            return next;
          });
        }
        const published = response;
        setMessages((previous) =>
          previous.map((message) =>
            message.id === id ? published : message,
          ),
        );
      }
      if (current() && !active.signal.aborted) {
        if (response.status === "failed") setError(response.error?.message ?? l("Response interrupted.", "Respuesta interrumpida."));
        if (response.status === "incomplete") setError(l("The response ended before completion. You can retry.", "La respuesta terminó antes de completarse. Puedes reintentar."));
      }
    } catch (cause) {
      if (current()) {
        if (active.signal.aborted) {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === id ? { ...message, status: "cancelled", activity: undefined, activitySummary: undefined } : message,
            ),
          );
          toast(l("Generation stopped", "Generación detenida"));
        } else {
          setError(
            cause instanceof AiProtocolError || (selectedAdapter.kind === "demo" && cause instanceof Error)
              ? cause.message
              : l(
                  "The AI connection could not complete this response. Please retry.",
                  "La conexión de IA no pudo completar esta respuesta. Reintenta.",
                ),
          );
          setMessages((previous) =>
            previous.map((message) =>
              message.id === id ? { ...message, status: "failed", activity: undefined, activitySummary: undefined } : message,
            ),
          );
          setSimulateError(false);
        }
      }
    } finally {
      if (current()) {
        setPending(false);
        controller.current = null;
        activeRequest.current = null;
      }
    }
  };
  const retry = () => {
    if (controller.current || pending ||
        messages.find((message) => message.id === lastAssistant.current)?.error?.retryable === false) return;
    setMessages((previous) =>
      previous.filter((message) => message.id !== lastAssistant.current),
    );
    void generate(lastPrompt.current, false, true);
  };
  const decideApproval = async (approval: AiApprovalPart, approved: boolean) => {
    const active = activeRequest.current;
    if (!active || active.controller.signal.aborted || !active.adapter.respondToApproval ||
        submittingApprovals.current.has(approval.id) ||
        resolvedApprovals.current.has(approval.id)) return;
    submittingApprovals.current.add(approval.id);
    setApprovalActions((previous) => ({ ...previous, [approval.id]: { state: "sending" } }));
    try {
      await active.adapter.respondToApproval({
        v: 1, workspaceId, requestId: active.id, approvalId: approval.id, toolId: approval.toolId, approved,
      }, active.controller.signal);
      if (activeRequest.current === active && !resolvedApprovals.current.has(approval.id)) {
        setApprovalActions((previous) => ({ ...previous, [approval.id]: { state: "submitted" } }));
      }
    } catch (cause) {
      if (activeRequest.current === active && !active.controller.signal.aborted && !resolvedApprovals.current.has(approval.id)) {
        submittingApprovals.current.delete(approval.id);
        setApprovalActions((previous) => ({ ...previous, [approval.id]: {
          state: "failed", error: cause instanceof AiProtocolError ? cause.message : l("Could not send the decision. Try again.", "No se pudo enviar la decisión. Reintenta."),
        } }));
      }
    }
  };
  const attach = async (file: File) => {
    if (file.size > 1024 * 1024) {
      toast.error(
        l(
          "Use a text file smaller than 1 MB.",
          "Usa un archivo de texto de menos de 1 MB.",
        ),
      );
      return;
    }
    setAttachment({ name: file.name, content: await file.text() });
    toast.success(
      l(
        isDemo ? "File attached to demo context" : "Text file attached to this request",
        isDemo ? "Archivo añadido al contexto de demostración" : "Archivo de texto añadido a esta solicitud",
      ),
    );
  };
  const labels = {
    placeholder: l(
      "Ask a question, explore an idea, build something new…",
      "Haz una pregunta, explora una idea, crea algo nuevo…",
    ),
    input: l("Your message", "Tu mensaje"),
    send: l("Send message", "Enviar mensaje"),
    stop: l("Stop", "Detener"),
    model: l("Choose demo model", "Elegir modelo de demostración"),
    attach: l("Attach a text file", "Adjuntar archivo de texto"),
    balanced: l("Aureform · Balanced", "Aureform · Equilibrado"),
    precise: l("Aureform · Precise", "Aureform · Preciso"),
    creative: l("Aureform · Creative", "Aureform · Creativo"),
    attached: l("Attached", "Adjunto"),
  };
  const suggestions = [
    {
      icon: Feather,
      title: l("Find the right words", "Encuentra las palabras"),
      text: l(
        "Write a warm welcome email for a new product.",
        "Escribe un correo de bienvenida cercano para un nuevo producto.",
      ),
    },
    {
      icon: Lightbulb,
      title: l("Make space for an idea", "Dale espacio a una idea"),
      text: l(
        "Help me explore three directions for a SaaS dashboard.",
        "Ayúdame a explorar tres ideas para un dashboard SaaS.",
      ),
    },
    {
      icon: Code2,
      title: l("Build your next thing", "Crea lo que sigue"),
      text: l(
        "Create a reusable React summary component.",
        "Crea un componente de resumen reutilizable en React.",
      ),
    },
  ];
  const retryAllowed = messages.find((message) => message.id === lastAssistant.current)?.error?.retryable !== false;
  return (
    <div
      data-ai-workspace={workspaceId}
      data-ai-provider-option={providerOptionId ?? selectedModel?.provider ?? "demo"}
      data-ai-connection={!configured ? "unconfigured" : isDemo ? "demo" : "consumer"}
      className={cn(
        "grid min-w-0 gap-5",
        mode === "playground" ? "xl:grid-cols-[minmax(0,1fr)_280px]" : "",
      )}
    >
      <div className="flex min-h-[calc(100dvh-185px)] min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15">
              <Sparkles className="size-5 text-primary" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight">
                {mode === "playground"
                  ? l("AI playground", "Laboratorio de IA")
                  : mode === "code"
                    ? l("Code assistant", "Asistente de código")
                    : t("ai")}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {l(
                  "Think bigger. Build faster.",
                  "Piensa en grande. Crea más rápido.",
                )}
              </p>
            </div>
            <Badge variant={!configured ? "warning" : "outline"}>
              {!configured ? l("Not configured", "Sin configurar") : isDemo
                ? l("Demo", "Demostración") : l("Consumer adapter", "Adaptador del consumidor")}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/studio/`}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold"
            >
              <SlidersHorizontal className="size-3.5 text-primary" />
              {l("Customize", "Personalizar")}
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setClearOpen(true)}
            >
              <Plus />
              {l("New conversation", "Nueva conversación")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={l(
                      "Conversation actions",
                      "Acciones de la conversación",
                    )}
                  />
                }
              >
                <SlidersHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  disabled={!messages.length}
                  onClick={() =>
                    downloadText(
                      "aureform-conversation.json",
                      JSON.stringify(messages, null, 2),
                      "application/json",
                    )
                  }
                >
                  <Download />
                  {l("Export conversation", "Exportar conversación")}
                </DropdownMenuItem>
                 {!adapter && defaultDemoAllowed && (
                  <DropdownMenuItem onClick={() => setSimulateError(!simulateError)}>
                    <TriangleAlert />
                    {simulateError
                      ? l("Disable next error", "Desactivar próximo error")
                      : l("Simulate next error", "Simular próximo error")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setClearOpen(true)}>
                  <Trash2 />
                  {l("Clear conversation", "Borrar conversación")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div
          className={cn(
            "mx-auto flex w-full max-w-[920px] flex-col py-7",
            messages.length && "flex-1",
          )}
        >
          {!messages.length ? (
            <div className="relative isolate mx-auto w-full overflow-hidden rounded-3xl border border-primary/20 bg-surface px-5 py-9 text-center sm:px-8 sm:py-11">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
              >
                <ShaderBackground
                  kind={appearance.shader.kind}
                  colors={colors}
                  speed={appearance.shader.speed}
                  scale={appearance.shader.scale}
                  intensity={appearance.shader.intensity}
                  paused={
                    appearance.shader.paused || appearance.motion === "off"
                  }
                  className="h-full w-full"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      appearance.theme === "light"
                        ? "radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--surface) 98%, transparent), color-mix(in srgb, var(--surface) 94%, transparent) 72%)"
                        : "radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--surface) 95%, transparent), color-mix(in srgb, var(--surface) 65%, transparent) 72%)",
                  }}
                />
              </div>
              <div className="relative">
                <GlowBorder
                  colors={colors}
                  className="mx-auto mb-6 flex size-18 items-center justify-center rounded-2xl bg-surface/90 p-0"
                >
                  <AureformMark className="size-10 text-primary" />
                </GlowBorder>
                <p className="mb-4 text-xs font-semibold tracking-[.15em] text-primary">
                  {l("AUREFORM INTELLIGENCE", "INTELIGENCIA AUREFORM")}
                </p>
                <h2
                  className="text-[clamp(34px,4.6vw,56px)] font-bold leading-[1.08] tracking-[-.045em]"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight:
                      appearance.typography === "modern"
                        ? 750
                        : "var(--af-display-weight)",
                  }}
                >
                  {mode === "code"
                    ? l("From idea to working code.", "De la idea al código.")
                    : l("What’s on your mind?", "¿Qué tienes en mente?")}
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                  {l(
                    "Write, explore and build in one intelligent workspace. Bring the question. Find your next direction.",
                    "Escribe, explora y crea en un espacio inteligente. Trae tu pregunta. Encuentra tu próximo camino.",
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div
              aria-label={l("Conversation", "Conversación")}
              className="grid gap-7 rounded-2xl border border-border/70 bg-surface/35 p-4 sm:p-6"
            >
              {messages.map((message) => (
                <Message key={message.id} message={message} pending={pending} diagnostics={diagnostics}
                  approvalActions={message.id === activeRequest.current?.id ? approvalActions : undefined}
                  onApprovalDecision={pending && message.id === activeRequest.current?.id &&
                    activeRequest.current?.adapter.respondToApproval
                    ? (approval, approved) => { void decideApproval(approval, approved); } : undefined}
                />
              ))}
              {pending && (
                <Spinner
                  label={messages.at(-1)?.status === "waiting-approval"
                    ? l("Waiting for your tool decision…", "Esperando tu decisión sobre la herramienta…")
                    : l("Thinking with you…", "Pensando contigo…")}
                  className="ml-12"
                />
              )}
              <div ref={bottom} />
            </div>
          )}
        </div>
        <div className="mx-auto w-full max-w-[920px]">
          {!configured && (
            <Alert title={l("AI connection needed", "Falta la conexión de IA")} className="mb-3">
              {adapter
                ? l("Choose a model configured on the injected AI adapter. The initial model must match its exact ID.",
                    "Elige un modelo configurado en el adaptador de IA. El modelo inicial debe coincidir con su ID exacto.")
                : l("This provider needs an injected AI adapter. A connection for integration reports does not configure AI responses.",
                    "Este proveedor necesita un adaptador de IA inyectado. Una conexión para informes de integración no configura respuestas de IA.")}
            </Alert>
          )}
          {error && (
            <Alert
              variant="destructive"
              title={retryAllowed ? l("Let’s try that again.", "Intentémoslo de nuevo.")
                : l("Response interrupted", "Respuesta interrumpida")}
              className="mb-3"
            >
              {error}
              {retryAllowed && <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={retry}
              >
                <RotateCcw />
                {t("retry")}
              </Button>}
            </Alert>
          )}
          {attachment && (
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Paperclip className="size-3.5" />
              <span className="truncate">{attachment.name}</span>
              <Button
                aria-label={l("Remove attachment", "Eliminar adjunto")}
                variant="ghost"
                size="icon-sm"
                onClick={() => setAttachment(null)}
              >
                <X />
              </Button>
            </div>
          )}
          {adapter && (
            <Field label={l("Provider and model", "Proveedor y modelo")} className="mb-3">
              <Select
                value={selectedModel?.id}
                onValueChange={setSelectedModelId}
                options={adapter.models.map((option) => ({
                  value: option.id,
                  label: `${option.provider} · ${locale === "es" ? option.labelEs ?? option.label : option.label}`,
                }))}
                disabled={pending}
                aria-label={l("Choose provider and model", "Elegir proveedor y modelo")}
                className="w-full"
              />
            </Field>
          )}
          <fieldset disabled={!configured} className="min-w-0 border-0 p-0">
            <GlowBorder colors={colors} className="rounded-2xl p-0">
              <AIComposer
                prompt={prompt}
                onPromptChange={setPrompt}
                onSend={() => void generate(prompt)}
                onCancel={() => controller.current?.abort()}
                pending={pending}
                model={model}
                onModelChange={(value) => setModel(value as DemoModel)}
                labels={labels}
                onAttach={(file) => void attach(file)}
                className={cn("rounded-2xl border-primary/30 bg-surface/95 p-4 backdrop-blur-xl [&_textarea]:min-h-28 [&_textarea]:text-sm sm:p-5",
                  adapter && "[&_[role=combobox]]:hidden")}
              />
            </GlowBorder>
          </fieldset>
          <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
            {l(
              !configured ? "No AI request will run until an adapter and model are configured." : isDemo ? "Simulated responses · Connect your provider through the adapter." : "Responses from your injected backend · Usage appears only when reported.",
              !configured ? "No se enviará ninguna solicitud de IA hasta configurar adaptador y modelo." : isDemo ? "Respuestas simuladas · Conecta tu proveedor mediante el adaptador." : "Respuestas de tu backend inyectado · El consumo aparece solo cuando se reporta.",
            )}
          </p>
          {!messages.length && (
            <div className="mt-7 pb-4">
              <p className="mb-4 text-sm font-semibold">
                {l("Start with a spark", "Empieza con una idea")}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {suggestions.map((suggestion, index) => (
                  <SpotlightCard
                    key={suggestion.title}
                    spotlightColor={colors[index]}
                    className="h-full rounded-2xl p-0"
                  >
                    <button
                      type="button"
                      onClick={() => setPrompt(suggestion.text)}
                      className="flex h-full w-full flex-col rounded-2xl p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="mb-5 flex w-full items-center justify-between gap-3">
                        <span className="rounded-xl border border-primary/25 bg-primary/15 p-2.5">
                          <suggestion.icon className="size-5 text-primary" />
                        </span>
                        <ArrowUpRight className="size-4 text-primary" />
                      </span>
                      <span className="block text-sm font-bold">
                        {suggestion.title}
                      </span>
                      <span className="mt-3 block text-[13px] leading-6 text-muted-foreground">
                        {suggestion.text}
                      </span>
                    </button>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {mode === "playground" && (
        <Card
          appearance="glass"
          className="h-fit border-primary/25 p-5 xl:sticky xl:top-24"
        >
          <div className="mb-6 flex items-center gap-2">
            <SlidersHorizontal className="size-4" />
            <h2 className="text-base font-bold">
              {l("Playground settings", "Configuración del laboratorio")}
            </h2>
          </div>
          <div className="grid gap-6">
            <Field
              label={l("System instruction", "Instrucción del sistema")}
              description={l(
                isDemo ? "Passed into the local adapter context." : "Sent to the consumer backend with the request.",
                isDemo ? "Se envía al contexto del adaptador local." : "Se envía al backend del consumidor con la solicitud.",
              )}
            >
              <Textarea
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder={l(
                  "Be thoughtful, concise and useful.",
                  "Sé claro, conciso y útil.",
                )}
              />
            </Field>
            <div>
              <div className="mb-3 flex justify-between text-xs">
                <label>{l("Temperature", "Temperatura")}</label>
                <span className="font-mono">{temperature.toFixed(1)}</span>
              </div>
              <Slider
                label={l("Temperature", "Temperatura")}
                value={temperature}
                onValueChange={setTemperature}
                min={0}
                max={1}
                step={0.1}
              />
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                {l(
                  isDemo ? "Changes the creative model’s demo response." : "The backend applies parameters supported by the selected model.",
                  isDemo ? "Cambia la respuesta de ejemplo del modelo creativo." : "El backend aplica los parámetros que admite el modelo elegido.",
                )}
              </p>
            </div>
            {!adapter && defaultDemoAllowed && (
              <div className="flex items-center justify-between gap-3 text-xs">
                <label htmlFor="ai-failure">
                  {l("Simulate an error", "Simular un error")}
                </label>
                <Switch id="ai-failure" checked={simulateError} onCheckedChange={setSimulateError} />
              </div>
            )}
            <Alert title={isDemo ? l("Demo adapter", "Adaptador de demostración") : l("Consumer adapter", "Adaptador del consumidor")}>
              {l(
                isDemo ? "No model credentials or network calls are needed." : "Your backend owns provider connectivity, credentials and tool execution.",
                isDemo ? "No requiere credenciales ni llamadas a un modelo." : "Tu backend gestiona la conexión, las credenciales y la ejecución de herramientas.",
              )}
            </Alert>
          </div>
        </Card>
      )}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent closeLabel={t("close")}>
          <DialogTitle>
            {l("A fresh start?", "¿Un nuevo comienzo?")}
          </DialogTitle>
          <DialogDescription>
            {l(
              adapter ? "This clears this browser session, without deleting backend records." : "This clears the current demo conversation.",
              adapter ? "Se limpia esta sesión del navegador sin eliminar registros del backend." : "Se borrará la conversación actual de demostración.",
            )}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                const active = controller.current;
                controller.current = null;
                activeRequest.current = null;
                active?.abort();
                setPending(false);
                setApprovalActions({});
                resolvedApprovals.current.clear();
                submittingApprovals.current.clear();
                lastPrompt.current = "";
                lastAssistant.current = "";
                setMessages([]);
                setPrompt("");
                setError("");
                setClearOpen(false);
              }}
            >
              {l("Start fresh", "Empezar de nuevo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Message({
  message,
  pending,
  onApprovalDecision,
  approvalActions,
  diagnostics,
}: {
  message: ChatMessage;
  pending: boolean;
  onApprovalDecision?: (approval: AiApprovalPart, approved: boolean) => void;
  approvalActions?: Readonly<Record<string, AiApprovalActionState>>;
  diagnostics?: boolean;
}) {
  const { locale, l } = useLanguage(),
    { copy, copied } = useCopy();
  const user = message.role === "user";
  return (
    <div
      className={cn(
        "flex gap-3",
        user && "rounded-xl border border-border bg-surface p-4",
      )}
    >
      {user ? (
        <Avatar
          name="Alex Morgan"
          src={demoAvatarSources["alex-morgan"]}
          className="size-7 text-[10px]"
        />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent">
          <AureformMark className="size-5 text-primary" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-xs font-semibold">
          {user ? l("You", "Tú") : "Aureform"}
        </p>
        <AiMessageParts message={message} locale={locale}
          onApprovalDecision={onApprovalDecision} approvalActions={approvalActions} diagnostics={diagnostics} />
        {!user && message.content && !pending && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="mt-2"
            aria-label={l("Copy response", "Copiar respuesta")}
            onClick={() => {
              void copy(message.content);
            }}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        )}
      </div>
    </div>
  );
}
