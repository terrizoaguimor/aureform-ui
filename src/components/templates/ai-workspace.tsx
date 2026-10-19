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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

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
import { streamDemoReply, type DemoModel } from "@/demo/ai-adapter";
import { demoAvatarSources } from "@/demo/avatar-assets";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "complete" | "streaming" | "cancelled" | "failed";
};
export function AIWorkspace({
  mode = "chat",
}: {
  mode?: "chat" | "playground" | "code";
}) {
  const { locale, l, common: t } = useLanguage();
  const { appearance } = useAppearance();
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
  const [messages, setMessages] = useDemoStore<ChatMessage[]>(`ai-${mode}`, []);
  const [prompt, setPrompt] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [model, setModel] = useState<DemoModel>("balanced"),
    [temperature, setTemperature] = useState(0.7),
    [system, setSystem] = useState("");
  const [simulateError, setSimulateError] = useState(false),
    [clearOpen, setClearOpen] = useState(false),
    [attachment, setAttachment] = useState<{
      name: string;
      content: string;
    } | null>(null);
  const controller = useRef<AbortController | null>(null),
    lastPrompt = useRef(""),
    lastAssistant = useRef(""),
    bottom = useRef<HTMLDivElement>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
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
    if (pending || !text.trim()) return;
    const active = new AbortController();
    controller.current = active;
    setPending(true);
    setError("");
    lastPrompt.current = text;
    const id = crypto.randomUUID();
    lastAssistant.current = id;
    setMessages((previous) => [
      ...previous,
      ...(addUser
        ? [
            {
              id: crypto.randomUUID(),
              role: "user" as const,
              content: text,
              status: "complete" as const,
            },
          ]
        : []),
      { id, role: "assistant", content: "", status: "streaming" },
    ]);
    setPrompt("");
    try {
      let content = "";
      const context = attachment
        ? `${text}\n\n${attachment.name}: ${attachment.content.slice(0, 1000)}`
        : text;
      for await (const chunk of streamDemoReply(
        system ? `${system}\n${context}` : context,
        {
          locale,
          model,
          signal: active.signal,
          fail: ignoreFailure ? false : simulateError,
          mode: mode === "code" ? "code" : "chat",
          temperature,
        },
      )) {
        if (!mounted.current) break;
        content += chunk;
        setMessages((previous) =>
          previous.map((message) =>
            message.id === id ? { ...message, content } : message,
          ),
        );
      }
      if (mounted.current && !active.signal.aborted)
        setMessages((previous) =>
          previous.map((message) =>
            message.id === id ? { ...message, status: "complete" } : message,
          ),
        );
    } catch (cause) {
      if (mounted.current) {
        if (active.signal.aborted) {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === id ? { ...message, status: "cancelled" } : message,
            ),
          );
          toast(l("Generation stopped", "Generación detenida"));
        } else {
          setError(
            cause instanceof Error
              ? cause.message
              : l(
                  "Could not generate a response.",
                  "No se pudo generar una respuesta.",
                ),
          );
          setMessages((previous) =>
            previous.map((message) =>
              message.id === id ? { ...message, status: "failed" } : message,
            ),
          );
          setSimulateError(false);
        }
      }
    } finally {
      if (mounted.current && controller.current === active) {
        setPending(false);
        controller.current = null;
      }
    }
  };
  const retry = () => {
    setMessages((previous) =>
      previous.filter((message) => message.id !== lastAssistant.current),
    );
    void generate(lastPrompt.current, false, true);
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
        "File attached to demo context",
        "Archivo añadido al contexto de demostración",
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
  return (
    <div
      className={cn(
        "grid min-w-0 gap-5",
        mode === "playground" ? "xl:grid-cols-[minmax(0,1fr)_280px]" : "",
      )}
    >
      <div className="flex min-h-[calc(100dvh-185px)] min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15">
              <Sparkles className="size-5 text-primary" />
            </span>
            <div>
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
            <Badge variant="outline" className="hidden sm:inline-flex">
              {l("Demo", "Demostración")}
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
                <DropdownMenuItem
                  onClick={() => setSimulateError(!simulateError)}
                >
                  <TriangleAlert />
                  {simulateError
                    ? l("Disable next error", "Desactivar próximo error")
                    : l("Simulate next error", "Simular próximo error")}
                </DropdownMenuItem>
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
                <Message key={message.id} message={message} pending={pending} />
              ))}
              {pending && (
                <Spinner
                  label={l("Thinking with you…", "Pensando contigo…")}
                  className="ml-12"
                />
              )}
              <div ref={bottom} />
            </div>
          )}
        </div>
        <div className="mx-auto w-full max-w-[920px]">
          {error && (
            <Alert
              variant="destructive"
              title={l("Let’s try that again.", "Intentémoslo de nuevo.")}
              className="mb-3"
            >
              {error}
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={retry}
              >
                <RotateCcw />
                {t("retry")}
              </Button>
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
              className="rounded-2xl border-primary/30 bg-surface/95 p-4 backdrop-blur-xl [&_textarea]:min-h-28 [&_textarea]:text-sm sm:p-5"
            />
          </GlowBorder>
          <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
            {l(
              "Simulated responses · Connect your provider through the adapter.",
              "Respuestas simuladas · Conecta tu proveedor mediante el adaptador.",
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
                "Passed into the local adapter context.",
                "Se envía al contexto del adaptador local.",
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
                  "Changes the creative model’s demo response.",
                  "Cambia la respuesta de ejemplo del modelo creativo.",
                )}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <label htmlFor="ai-failure">
                {l("Simulate an error", "Simular un error")}
              </label>
              <Switch
                id="ai-failure"
                checked={simulateError}
                onCheckedChange={setSimulateError}
              />
            </div>
            <Alert title={l("Demo adapter", "Adaptador de demostración")}>
              {l(
                "No model credentials or network calls are needed.",
                "No requiere credenciales ni llamadas a un modelo.",
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
              "This clears the current demo conversation.",
              "Se borrará la conversación actual de demostración.",
            )}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                controller.current?.abort();
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
}: {
  message: ChatMessage;
  pending: boolean;
}) {
  const { l } = useLanguage(),
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
        <Markdown text={message.content} />
        {message.status === "cancelled" && (
          <Badge variant="neutral" className="mt-3">
            {l("Stopped", "Detenido")}
          </Badge>
        )}
        {message.status === "failed" && (
          <p className="text-xs text-destructive-foreground">
            {l("Response interrupted", "Respuesta interrumpida")}
          </p>
        )}
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
function Markdown({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="text-[13px] leading-[1.85] text-foreground/90">
      {parts.map((part, i) =>
        part.startsWith("```") ? (
          <pre
            key={i}
            className="my-4 overflow-x-auto rounded-lg border border-border bg-surface-subtle p-4 font-mono text-xs"
          >
            <code>{part.replace(/^```\w*\n?/, "").replace(/```$/, "")}</code>
          </pre>
        ) : (
          <span key={i} className="whitespace-pre-wrap break-words">
            {part}
          </span>
        ),
      )}
    </div>
  );
}
