"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  ArrowDownLeft,
  Check,
  Clock3,
  Download,
  Headphones,
  History,
  ListOrdered,
  Mic,
  PhoneIncoming,
  Play,
  Plug,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Signal,
  Volume2,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useSoftphoneAudio } from "@/hooks/use-softphone-audio";
import { PageHeading } from "@/components/blocks/page-heading";
import {
  Softphone,
  formatCallDuration,
  type SoftphoneLabels,
  type SoftphoneState,
} from "@/components/blocks/softphone";
import { CommunicationsProviderLogo } from "@/components/communications/provider-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createDemoCommunicationsAdapter } from "@/lib/communications/demo-adapter";
import { validateBusinessHoursSchedule } from "@/lib/communications/business-hours";
import type {
  BusinessHoursSchedule,
  BusinessHoursWeekday,
  CommunicationsAdapter,
  CommunicationsCall,
  CommunicationsDemoScenario,
  CommunicationsProvider,
  DemoCommunicationsAdapter,
} from "@/lib/communications/contracts";
import { publicPath } from "@/lib/public-path";
import { cn, csv, downloadText } from "@/lib/utils";

type Localize = (en: string, es: string) => string;

const weekdayNames = [
  ["Sunday", "Domingo"],
  ["Monday", "Lunes"],
  ["Tuesday", "Martes"],
  ["Wednesday", "Miércoles"],
  ["Thursday", "Jueves"],
  ["Friday", "Viernes"],
  ["Saturday", "Sábado"],
] as const;
const keypad = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
  ["*", ""],
  ["0", "+"],
  ["#", ""],
] as const;

function isDemoAdapter(
  adapter: CommunicationsAdapter,
): adapter is DemoCommunicationsAdapter {
  return (
    adapter.getSnapshot().mode === "demo" &&
    "simulateIncoming" in adapter &&
    typeof adapter.simulateIncoming === "function" &&
    "setSchedule" in adapter &&
    typeof adapter.setSchedule === "function"
  );
}

function callOutcome(call: CommunicationsCall, l: Localize) {
  switch (call.endReason) {
    case "after-hours":
      return l("Outside business hours", "Fuera de horario");
    case "holiday":
      return l("Holiday", "Festivo");
    case "queue-overflow":
      return l("Queue full", "Cola llena");
    case "declined":
      return l("Declined", "Rechazada");
    case "ring-timeout":
      return l("No answer", "Sin respuesta");
    case "cancelled-before-answer":
      return l("Cancelled", "Cancelada");
    default:
      return call.status === "completed"
        ? l("Completed", "Completada")
        : call.status === "failed"
          ? l("Failed", "Fallida")
          : l("Missed", "Perdida");
  }
}

function activityLabel(type: string, l: Localize) {
  const labels: Record<string, readonly [string, string]> = {
    "connection.ready": ["Session connected", "Sesión conectada"],
    "connection.connecting": ["Connecting session", "Conectando sesión"],
    "connection.disconnected": ["Session disconnected", "Sesión desconectada"],
    "connection.reconnecting": ["Recovering session", "Recuperando sesión"],
    "presence.changed": ["Availability updated", "Disponibilidad actualizada"],
    "queue.offered": ["Call offered to agent", "Llamada ofrecida al agente"],
    "queue.requeued": [
      "Caller returned to queue",
      "Contacto devuelto a la cola",
    ],
    "queue.enqueued": ["Caller added to queue", "Contacto añadido a la cola"],
    "call.received": ["Incoming call received", "Llamada entrante recibida"],
    "call.connecting": ["Answering call", "Contestando llamada"],
    "call.active": ["Call answered", "Llamada contestada"],
    "call.completed": ["Call ended", "Llamada finalizada"],
    "call.missed": ["Call not answered", "Llamada sin respuesta"],
    "call.failed": ["Call failed", "La llamada falló"],
    "call.muted": ["Microphone muted", "Micrófono silenciado"],
    "call.unmuted": ["Microphone unmuted", "Micrófono activado"],
    "call.held": ["Call placed on hold", "Llamada en espera"],
    "call.resumed": ["Call resumed", "Llamada reanudada"],
    "call.dtmf": ["Keypad input sent", "Entrada de teclado enviada"],
    "call.notes": ["Call notes saved", "Notas guardadas"],
    "routing.after-hours": ["Outside business hours", "Fuera de horario"],
    "routing.holiday": ["Holiday closure", "Cierre por festivo"],
    "routing.queue-overflow": ["Queue capacity reached", "Cola llena"],
    "audio.permission": [
      "Audio permission updated",
      "Permiso de audio actualizado",
    ],
    "schedule.updated": ["Business hours updated", "Horario actualizado"],
    "demo.reset": ["Local demo reset", "Demo local reiniciada"],
  };
  const label = labels[type];
  return label
    ? l(label[0], label[1])
    : l("Session updated", "Sesión actualizada");
}

function useCallSeconds(answeredAt: number | undefined) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (answeredAt === undefined) return;
    const tick = () =>
      setSeconds(Math.max(0, Math.floor((Date.now() - answeredAt) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [answeredAt]);
  return answeredAt === undefined ? 0 : seconds;
}

export type SoftphoneWorkspaceProps = {
  adapter?: CommunicationsAdapter;
  defaultProvider?: CommunicationsProvider;
  /** Website session hosts may provide a stable demo adapter per provider. */
  onDemoProviderChange?: (provider: CommunicationsProvider) => void;
  className?: string;
};

/** Inbound agent workspace. The default local lab never connects to a carrier. */
export function SoftphoneWorkspace({
  adapter,
  defaultProvider = "twilio",
  onDemoProviderChange,
  className,
}: SoftphoneWorkspaceProps) {
  const { l, locale } = useLanguage();
  const [ownedAdapter, setOwnedAdapter] = useState(() =>
    createDemoCommunicationsAdapter({ provider: defaultProvider }),
  );
  const ownedAdapters = useRef(
    new Set<DemoCommunicationsAdapter>([ownedAdapter]),
  );
  const lifetime = useRef<object | null>(null);
  const instance = adapter ?? ownedAdapter;
  const subscribe = useCallback(
    (listener: () => void) => instance.subscribe(listener),
    [instance],
  );
  const getSnapshot = useCallback(() => instance.getSnapshot(), [instance]);
  // Static exports can be opened on a different day from their build. Keep the
  // server's time-dependent badge deterministic, then read the current store
  // immediately after hydration.
  const serverSnapshot = useMemo(
    () => ({ ...instance.getSnapshot(), businessHoursOpen: false }),
    [instance],
  );
  const getServerSnapshot = useCallback(() => serverSnapshot, [serverSnapshot]);
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const demo = isDemoAdapter(instance) ? instance : null;
  const localDemo = snapshot.mode === "demo";
  const call = snapshot.activeCall;
  const seconds = useCallSeconds(call?.answeredAt);
  const audio = useSoftphoneAudio();
  const [busy, setBusy] = useState(false);
  const pendingAction = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scenario, setScenario] = useState<CommunicationsDemoScenario>("open");
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] =
    useState<CommunicationsCall | null>(null);
  const notesId = useId();
  const active = call?.status === "active" || call?.status === "held";
  const connecting = snapshot.connection === "connecting";
  const recovering = snapshot.connection === "reconnecting";
  const ready = snapshot.connection === "ready";
  const muted = call?.muted ?? false;
  const providerName = snapshot.provider === "twilio" ? "Twilio" : "Telnyx";

  // A strict-mode rehearsal must not dispose the adapter that the second mount uses.
  useEffect(() => {
    const token = {};
    lifetime.current = token;
    const owned = ownedAdapters.current;
    return () => {
      queueMicrotask(() => {
        if (lifetime.current !== token) return;
        for (const entry of owned) entry.dispose();
      });
    };
  }, []);

  useEffect(() => {
    if (!demo) return;
    const permission =
      audio.state === "denied"
        ? "denied"
        : audio.state === "ready"
          ? "granted"
          : audio.state === "unavailable"
            ? "unavailable"
            : null;
    if (permission && permission !== snapshot.audio.microphonePermission) {
      void demo.setMicrophonePermission(permission).catch(() => undefined);
    }
  }, [audio.state, demo, snapshot.audio.microphonePermission]);

  const run = useCallback(
    async (operation: () => Promise<void>, success?: string) => {
      if (pendingAction.current) return;
      pendingAction.current = true;
      setBusy(true);
      setActionError(null);
      try {
        await operation();
        if (success) toast.success(success);
      } catch {
        setActionError(
          l(
            "This action could not be confirmed. Review the session and try again.",
            "No se pudo confirmar esta acción. Revisa la sesión e inténtalo de nuevo.",
          ),
        );
      } finally {
        pendingAction.current = false;
        setBusy(false);
      }
    },
    [l],
  );

  const viewState: SoftphoneState = recovering
    ? "recovering"
    : snapshot.connection === "error"
      ? "error"
      : call?.status === "held"
        ? "held"
        : call?.status === "active"
          ? "active"
          : call?.status === "ringing" || call?.status === "connecting"
            ? "ringing"
            : snapshot.audio.microphonePermission === "denied"
              ? "permission-denied"
              : "idle";
  const labels: SoftphoneLabels = {
    idle: ready
      ? l("Ready for calls", "Lista para llamadas")
      : l("Session disconnected", "Sesión desconectada"),
    ringing:
      call?.status === "connecting"
        ? l("Connecting call", "Conectando llamada")
        : l("Incoming call", "Llamada entrante"),
    active: l("In a call", "En llamada"),
    held: l("On hold", "En espera"),
    recovering: l("Reconnecting", "Reconectando"),
    permissionDenied: l(
      "Microphone permission denied",
      "Micrófono sin permiso",
    ),
    error: l("Connection unavailable", "Conexión no disponible"),
    accept: l("Answer", "Contestar"),
    decline: l("Decline", "Rechazar"),
    hangup: l("End call", "Finalizar"),
    mute: l("Mute", "Silenciar"),
    unmute: l("Unmute", "Activar micrófono"),
    hold: l("Hold", "En espera"),
    resume: l("Resume", "Reanudar"),
    reconnect: l("Reconnect", "Reconectar"),
    testDevice: l("Test device", "Probar dispositivo"),
    idleDescription: ready
      ? l(
          "Available agents receive the next caller in the queue.",
          "Los agentes disponibles reciben la siguiente llamada de la cola.",
        )
      : l(
          "Connect your session to receive calls from the support queue.",
          "Conecta tu sesión para recibir llamadas de la cola de soporte.",
        ),
    ringingDescription:
      call?.status === "connecting"
        ? l(
            "Waiting for call confirmation. The call remains open until its end is confirmed.",
            "Esperando confirmación de la llamada. Se conserva abierta hasta confirmar su finalización.",
          )
        : l(
            "A caller is waiting. Answer when you are ready.",
            "Una persona está esperando. Contesta cuando estés listo.",
          ),
    activeDescription: localDemo
      ? l(
          "Local simulation. Mute, hold and keypad do not transmit audio.",
          "Simulación local. Silenciar, espera y teclado no transmiten audio.",
        )
      : l(
          "Call controls use the capabilities confirmed by your backend.",
          "Los controles usan las capacidades confirmadas por tu backend.",
        ),
    recoveringDescription: l(
      "Connection interrupted. Reconnect to reconcile the session; a remote call is not assumed to have ended.",
      "Conexión interrumpida. Reconecta para reconciliar la sesión; una llamada remota no se da por finalizada.",
    ),
    permissionDescription: l(
      "Allow microphone access in your browser, then test the device again.",
      "Permite el acceso al micrófono en el navegador y vuelve a probar el dispositivo.",
    ),
    errorDescription: l(
      "Review the provider connection and reconnect.",
      "Revisa la conexión del proveedor y reconecta.",
    ),
  };

  const changeProvider = (value: string) => {
    if (value !== "twilio" && value !== "telnyx") return;
    if (adapter) {
      onDemoProviderChange?.(value);
      return;
    }
    const replacement = createDemoCommunicationsAdapter({ provider: value });
    ownedAdapters.current.add(replacement);
    setOwnedAdapter(replacement);
  };
  const statusText = connecting
    ? l("Connecting", "Conectando")
    : ready
      ? l("Connected", "Conectada")
      : recovering
        ? l("Reconnecting", "Reconectando")
        : snapshot.connection === "error"
          ? l("Connection error", "Error de conexión")
          : l("Disconnected", "Desconectada");
  const historyTime = (instant: number) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: snapshot.businessHours.timezone,
    }).format(new Date(instant));
  const historyDuration = (entry: CommunicationsCall) =>
    entry.answeredAt !== undefined && entry.endedAt !== undefined
      ? formatCallDuration((entry.endedAt - entry.answeredAt) / 1000)
      : "—";

  const exportHistory = () => {
    const rows = snapshot.history.map((entry) => ({
      [l("Contact", "Contacto")]: entry.callerName,
      [l("From", "Origen")]: entry.from,
      [l("To", "Destino")]: entry.to,
      [l("Provider", "Proveedor")]: entry.provider,
      [l("Outcome", "Resultado")]: callOutcome(entry, l),
      [l("Received", "Recibida")]: new Date(entry.queuedAt).toISOString(),
      [l("Ended", "Finalizada")]: entry.endedAt
        ? new Date(entry.endedAt).toISOString()
        : "",
      [l("Duration", "Duración")]: historyDuration(entry),
    }));
    downloadText("call-history.csv", csv(rows), "text/csv;charset=utf-8");
  };

  return (
    <div
      id="softphone-workspace"
      data-testid="softphone-workspace"
      className={cn("grid min-w-0 gap-6", className)}
    >
      <PageHeading
        eyebrow={l(
          "Communications / Agent workspace",
          "Comunicaciones / Espacio del agente",
        )}
        title="Softphone"
        description={l(
          "Every call, considered. One place for your caller, queue and next conversation.",
          "Cada llamada, bien atendida. Un lugar para tu contacto, tu cola y la próxima conversación.",
        )}
        actions={
          <>
            <Badge variant={localDemo ? "neutral" : "default"}>
              {localDemo
                ? l("Local demo", "Demo local")
                : l("Live adapter", "Adaptador real")}
            </Badge>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setDevicesOpen(true)}
            >
              <Headphones aria-hidden="true" />
              {l("Audio", "Audio")}
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setHoursOpen(true)}
              data-testid="softphone-hours"
            >
              <Clock3 aria-hidden="true" />
              {l("Business hours", "Horario")}
            </Button>
          </>
        }
      />

      <Card
        className="flex min-w-0 flex-col gap-4 p-4 xl:flex-row xl:items-end"
        data-testid="softphone-session"
      >
        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(150px,220px)_minmax(160px,240px)_minmax(140px,1fr)]">
          <div className="min-w-0">
            <Select
              label={l("Voice provider", "Proveedor de voz")}
              aria-label={l("Voice provider", "Proveedor de voz")}
              value={snapshot.provider}
              onValueChange={changeProvider}
              disabled={
                busy ||
                !demo ||
                (!!adapter && !onDemoProviderChange) ||
                snapshot.connection !== "disconnected" ||
                !!call ||
                snapshot.queue.length > 0
              }
              className="min-h-11"
              options={[
                {
                  value: "twilio",
                  label: "Twilio",
                  icon: (
                    <CommunicationsProviderLogo
                      provider="twilio"
                      size="inline"
                    />
                  ),
                },
                {
                  value: "telnyx",
                  label: "Telnyx",
                  icon: (
                    <CommunicationsProviderLogo
                      provider="telnyx"
                      size="inline"
                    />
                  ),
                },
              ]}
            />
          </div>
          <div className="min-w-0">
            <Select
              label={l("Agent availability", "Disponibilidad del agente")}
              aria-label={l("Agent availability", "Disponibilidad del agente")}
              value={snapshot.presence}
              disabled={busy || !ready}
              className="min-h-11"
              onValueChange={(value) => {
                if (
                  value === "available" ||
                  value === "away" ||
                  value === "offline"
                ) {
                  void run(() => instance.setPresence(value));
                }
              }}
              options={[
                { value: "available", label: l("Available", "Disponible") },
                { value: "away", label: l("Away", "Ausente") },
                { value: "offline", label: l("Offline", "No disponible") },
              ]}
            />
          </div>
          <div
            className="flex min-h-11 flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-1"
            role="status"
            aria-live="polite"
            data-testid="softphone-connection"
          >
            <Badge
              variant={
                ready
                  ? "default"
                  : snapshot.connection === "error"
                    ? "destructive"
                    : "neutral"
              }
            >
              <Signal aria-hidden="true" />
              {statusText}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {providerName}
            </span>
          </div>
        </div>
        <Button
          className="min-h-11"
          variant={ready ? "outline" : "default"}
          appearance={ready ? undefined : "gradient"}
          data-testid="softphone-connect"
          loading={connecting || busy}
          onClick={() =>
            void run(() => (ready ? instance.disconnect() : instance.connect()))
          }
          disabled={connecting}
        >
          <Plug aria-hidden="true" />
          {ready
            ? l("Disconnect", "Desconectar")
            : l("Connect session", "Conectar sesión")}
        </Button>
      </Card>

      {(actionError || snapshot.error) && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/15 p-4 text-sm text-destructive-foreground"
        >
          {actionError ||
            l(
              "The provider could not confirm the session. Reconnect or review your backend.",
              "El proveedor no pudo confirmar la sesión. Reconecta o revisa tu backend.",
            )}
        </div>
      )}
      {demo && (
        <Card className="flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Select
              label={l(
                "Incoming-call scenario",
                "Escenario de llamada entrante",
              )}
              aria-label={l(
                "Incoming-call scenario",
                "Escenario de llamada entrante",
              )}
              value={scenario}
              onValueChange={(value) => {
                if (["open", "closed", "holiday", "overflow"].includes(value)) {
                  setScenario(value as CommunicationsDemoScenario);
                }
              }}
              className="min-h-11"
              options={[
                {
                  value: "open",
                  label: l("During business hours", "En horario de atención"),
                },
                {
                  value: "closed",
                  label: l("Outside business hours", "Fuera de horario"),
                },
                { value: "holiday", label: l("Holiday", "Festivo") },
                {
                  value: "overflow",
                  label: l(
                    "Queue capacity reached",
                    "Capacidad de cola alcanzada",
                  ),
                },
              ]}
            />
          </div>
          <Button
            className="min-h-11"
            appearance="gradient"
            disabled={busy || !ready}
            data-testid="softphone-simulate"
            onClick={() => void run(() => demo.simulateIncoming({ scenario }))}
          >
            <PhoneIncoming aria-hidden="true" />
            {l("Simulate incoming call", "Simular llamada entrante")}
          </Button>
          <Button
            className="min-h-11"
            variant="outline"
            data-testid="softphone-simulate-disconnect"
            disabled={busy || !ready}
            onClick={() => void run(() => demo.simulateDisconnect())}
          >
            <WifiOff aria-hidden="true" />
            {l("Test recovery", "Probar recuperación")}
          </Button>
        </Card>
      )}

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4">
          <Softphone
            state={viewState}
            contact={
              call?.callerName ||
              l("Your call workspace", "Tu espacio de llamadas")
            }
            metadata={
              call
                ? `${call.from} · ${l("inbound", "entrante")} · ${providerName}`
                : l(
                    "Customer support · inbound calls",
                    "Atención al cliente · llamadas entrantes",
                  )
            }
            seconds={seconds}
            muted={muted}
            busy={busy}
            pending={call?.status === "connecting"}
            disabled={!ready && !recovering && snapshot.connection !== "error"}
            labels={labels}
            holdAvailable={snapshot.caps?.hold === true}
            onAccept={
              call ? () => void run(() => instance.accept(call.id)) : undefined
            }
            onDecline={
              call ? () => void run(() => instance.decline(call.id)) : undefined
            }
            onHangup={
              call ? () => void run(() => instance.hangup(call.id)) : undefined
            }
            onMute={
              call && snapshot.caps?.mute === true
                ? () => void run(() => instance.setMuted(call.id, !muted))
                : undefined
            }
            onHold={
              call
                ? () =>
                    void run(() =>
                      instance.setHeld(call.id, call.status !== "held"),
                    )
                : undefined
            }
            onReconnect={() => void run(() => instance.connect())}
            onTestDevice={() => setDevicesOpen(true)}
          />
          <Card className="grid gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Clock3 aria-hidden="true" className="size-4 text-primary" />
                {l("Support hours", "Horario de soporte")}
              </span>
              <Badge
                variant={snapshot.businessHoursOpen ? "default" : "neutral"}
              >
                {snapshot.businessHoursOpen
                  ? l("Open", "Abierto")
                  : l("Closed", "Cerrado")}
              </Badge>
            </div>
            <p className="break-words text-xs leading-5 text-muted-foreground">
              {snapshot.businessHours.timezone}
            </p>
            <Button
              className="min-h-11 w-fit"
              variant="ghost"
              onClick={() => setHoursOpen(true)}
            >
              <Settings2 aria-hidden="true" />
              {l("View schedule", "Ver horario")}
            </Button>
          </Card>
        </div>

        <Card className="min-w-0 p-4 sm:p-6">
          <Tabs defaultValue="context">
            <TabsList
              className="w-full"
              aria-label={l(
                "Call workspace panels",
                "Paneles del espacio de llamadas",
              )}
            >
              <TabsTrigger value="context" className="min-h-11 flex-1">
                {l("Call context", "Contexto")}
              </TabsTrigger>
              <TabsTrigger value="queue" className="min-h-11 flex-1">
                <ListOrdered aria-hidden="true" />
                {l("Queue", "Cola")}
                <Badge variant="neutral" data-testid="softphone-queue-count">
                  {snapshot.queue.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="context">
              <h2 className="mb-5 text-lg font-semibold">
                {l("Call context", "Contexto de la llamada")}
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <dt className="text-xs text-muted-foreground">
                    {l("Queue", "Cola")}
                  </dt>
                  <dd className="min-h-11 rounded-xl border border-border px-4 py-3 text-[13px]">
                    {l("Customer support", "Atención al cliente")}
                  </dd>
                </div>
                <div className="grid gap-2">
                  <dt className="text-xs text-muted-foreground">
                    {l("Active provider", "Proveedor activo")}
                  </dt>
                  <dd className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 text-[13px]">
                    <CommunicationsProviderLogo
                      provider={snapshot.provider}
                      size="inline"
                    />
                    {providerName}
                  </dd>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">
                    {l("Contact", "Contacto")}
                  </dt>
                  <dd className="min-h-11 break-words rounded-xl border border-border px-4 py-3 text-[13px]">
                    {call
                      ? `${call.callerName} · ${call.from}`
                      : l(
                          "Your caller's details will appear here.",
                          "Aquí aparecerán los datos de quien llama.",
                        )}
                  </dd>
                </div>
              </dl>
              <form
                className="mt-5 grid gap-3"
                key={call?.id || "no-call"}
                onSubmit={(event) => {
                  event.preventDefault();
                  const notes = new FormData(event.currentTarget).get("notes");
                  if (call && typeof notes === "string")
                    void run(
                      () => instance.setNotes(call.id, notes),
                      l(
                        "Call notes saved in this session.",
                        "Notas guardadas en esta sesión.",
                      ),
                    );
                }}
              >
                <Field
                  label={l("Call notes", "Notas de la llamada")}
                  htmlFor={notesId}
                >
                  <Textarea
                    id={notesId}
                    data-testid="softphone-notes"
                    name="notes"
                    defaultValue={call?.notes || ""}
                    placeholder={l(
                      "A few details to make the next conversation better…",
                      "Algunos detalles para atender mejor la próxima conversación…",
                    )}
                    maxLength={2000}
                    className="min-h-28"
                    disabled={!call || busy || !ready}
                  />
                </Field>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {l("Private to this session", "Privadas para esta sesión")}
                  </span>
                  <Button
                    className="min-h-11"
                    variant="outline"
                    type="submit"
                    data-testid="softphone-save-notes"
                    disabled={!call || busy || !ready}
                  >
                    <Save aria-hidden="true" />
                    {l("Save notes", "Guardar notas")}
                  </Button>
                </div>
              </form>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                <Button
                  className="min-h-11"
                  variant="outline"
                  data-testid="softphone-keypad"
                  disabled={
                    !active ||
                    call?.status === "held" ||
                    !ready ||
                    busy ||
                    snapshot.caps?.dtmf !== true
                  }
                  onClick={() => setKeypadOpen(true)}
                >
                  <PhoneIncoming aria-hidden="true" />
                  {l("Keypad", "Teclado")}
                </Button>
                <Button
                  className="min-h-11"
                  variant="ghost"
                  onClick={() => setDevicesOpen(true)}
                >
                  <Headphones aria-hidden="true" />
                  {l("Test audio devices", "Probar dispositivos de audio")}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="queue">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  {l("Next conversations", "Próximas conversaciones")}
                </h2>
                <Badge variant="outline">FIFO</Badge>
              </div>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                {l(
                  "The next available agent receives the caller who has waited longest.",
                  "El siguiente agente disponible recibe a quien lleva más tiempo esperando.",
                )}
              </p>
              {snapshot.queue.length ? (
                <ol
                  className="mt-5 grid gap-3"
                  aria-label={l("Waiting callers", "Llamadas en espera")}
                  data-testid="softphone-queue"
                >
                  {snapshot.queue.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-surface-subtle/35 p-4"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold">
                          {entry.callerName}
                        </p>
                        <p className="mt-1 break-words text-xs text-muted-foreground">
                          {entry.from}
                        </p>
                      </div>
                      <Badge variant="neutral">
                        {l("Waiting", "En espera")}
                      </Badge>
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty
                  icon={<ListOrdered className="size-5" aria-hidden="true" />}
                  title={l("A clear queue.", "Una cola despejada.")}
                  description={l(
                    "Waiting callers appear here while an agent is busy or away.",
                    "Las llamadas pendientes aparecen aquí mientras un agente está ocupado o ausente.",
                  )}
                />
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <History aria-hidden="true" className="size-4 text-primary" />
            {l("Call history", "Historial de llamadas")}
          </h2>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={!snapshot.history.length}
            onClick={exportHistory}
            data-testid="softphone-export"
          >
            <Download aria-hidden="true" />
            {l("Export CSV", "Exportar CSV")}
          </Button>
        </div>
        {snapshot.history.length ? (
          <div className="overflow-x-auto" data-testid="softphone-history">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">
                {l(
                  "Ended calls in this session",
                  "Llamadas finalizadas en esta sesión",
                )}
              </caption>
              <thead className="border-b border-border bg-surface-subtle/45 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 sm:px-6">
                    {l("Contact", "Contacto")}
                  </th>
                  <th scope="col" className="hidden px-4 py-3 sm:table-cell">
                    {l("Received", "Recibida")}
                  </th>
                  <th scope="col" className="px-4 py-3">
                    {l("Outcome", "Resultado")}
                  </th>
                  <th scope="col" className="hidden px-4 py-3 lg:table-cell">
                    {l("Duration", "Duración")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right sm:px-6">
                    {l("Details", "Detalles")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {snapshot.history.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border/70 last:border-b-0 hover:bg-surface-subtle/40"
                  >
                    <th scope="row" className="px-4 py-4 font-normal sm:px-6">
                      <span className="flex min-w-0 items-center gap-2">
                        <ArrowDownLeft
                          aria-hidden="true"
                          className="hidden size-4 shrink-0 text-primary sm:block"
                        />
                        <span className="min-w-0">
                          <span className="block break-words font-semibold">
                            {entry.callerName}
                          </span>
                          <span className="mt-1 block break-words text-xs text-muted-foreground">
                            {entry.from}
                          </span>
                        </span>
                      </span>
                    </th>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-muted-foreground sm:table-cell">
                      {historyTime(entry.queuedAt)}
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        variant={
                          entry.status === "completed" ? "default" : "neutral"
                        }
                      >
                        {callOutcome(entry, l)}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-4 font-medium tabular-nums lg:table-cell">
                      {historyDuration(entry)}
                    </td>
                    <td className="px-4 py-4 text-right sm:px-6">
                      <Button
                        variant="ghost"
                        className="min-h-11"
                        aria-label={`${l("View call", "Ver llamada")}: ${entry.callerName}`}
                        onClick={() => setSelectedHistory(entry)}
                      >
                        {l("View", "Ver")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={<History aria-hidden="true" className="size-5" />}
            title={l(
              "Your first conversation starts here.",
              "Tu primera conversación empieza aquí.",
            )}
            description={l(
              "Ended calls and their outcomes will appear in the history.",
              "Las llamadas finalizadas y sus resultados aparecerán en el historial.",
            )}
          />
        )}
      </Card>

      {(snapshot.events?.length ?? 0) > 0 && (
        <Card className="min-w-0 p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
            {l("Session activity", "Actividad de la sesión")}
          </h2>
          <ol
            className="grid gap-3"
            aria-label={l("Session activity", "Actividad de la sesión")}
            data-testid="softphone-events"
          >
            {snapshot.events
              ?.slice(-5)
              .reverse()
              .map((event) => (
                <li
                  key={event.id}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs"
                >
                  <span className="min-w-0 break-words font-medium">
                    {activityLabel(event.type, l)}
                  </span>
                  <span className="flex items-center gap-3 text-muted-foreground">
                    <Badge variant="neutral">
                      {event.source === "demo"
                        ? l("Local demo", "Demo local")
                        : event.source === "sdk"
                          ? "SDK"
                          : "Backend"}
                    </Badge>
                    <time dateTime={new Date(event.at).toISOString()}>
                      {new Intl.DateTimeFormat(
                        locale === "es" ? "es-CO" : "en-US",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          timeZone: snapshot.businessHours.timezone,
                        },
                      ).format(new Date(event.at))}
                    </time>
                  </span>
                </li>
              ))}
          </ol>
        </Card>
      )}

      <Card className="flex min-w-0 flex-col gap-4 border-primary/20 bg-accent/25 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary">
            {localDemo
              ? l(
                  "A complete local call workflow.",
                  "Un flujo completo de llamadas local.",
                )
              : l(
                  "Your backend remains the source of truth.",
                  "Tu backend conserva el estado autorizado.",
                )}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            {localDemo
              ? l(
                  "Provider selection and scenarios are simulated. No real call, purchase or message is sent. Session data stays in memory in this tab.",
                  "La selección de proveedor y los escenarios se simulan. No se realizan llamadas, compras ni mensajes reales. Los datos permanecen en memoria en esta pestaña.",
                )
              : l(
                  "Signaling, browser audio and the remote call are separate states. Live operations use the backend's permissions and confirmed capabilities.",
                  "La señalización, el audio del navegador y la llamada remota son estados separados. Las operaciones reales usan los permisos y capacidades confirmadas por el backend.",
                )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-[13px] font-semibold text-foreground hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ring"
            href={publicPath(`/${locale}/docs/communications/`)}
          >
            {l("Connection guide", "Guía de conexión")}
          </a>
          {demo && (
            <Button
              variant="ghost"
              className="min-h-11"
              data-testid="softphone-reset"
              disabled={busy}
              onClick={() => void run(() => demo.reset())}
            >
              <RotateCcw aria-hidden="true" />
              {l("Reset demo", "Reiniciar demo")}
            </Button>
          )}
        </div>
      </Card>

      <Dialog
        open={devicesOpen}
        onOpenChange={(open) => {
          setDevicesOpen(open);
          if (!open) audio.stop();
        }}
      >
        <DialogContent
          closeLabel={l("Close audio settings", "Cerrar ajustes de audio")}
        >
          <DialogTitle>
            {l("Make yourself heard.", "Hazte escuchar.")}
          </DialogTitle>
          <DialogDescription>
            {l(
              "Test your microphone for four seconds and play a short speaker tone. Nothing is recorded or uploaded.",
              "Prueba tu micrófono durante cuatro segundos y reproduce un tono breve. No se graba ni se sube audio.",
            )}
          </DialogDescription>
          <div className="mt-6 grid gap-5">
            <Card className="grid gap-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Mic aria-hidden="true" className="size-4" />
                  {l("Microphone", "Micrófono")}
                </span>
                <Badge
                  variant={
                    audio.state === "denied" || audio.state === "error"
                      ? "destructive"
                      : "neutral"
                  }
                  data-testid="softphone-audio-state"
                  role="status"
                >
                  {audio.state === "testing"
                    ? l("Testing", "Probando")
                    : audio.state === "ready"
                      ? l("Permission granted", "Permiso concedido")
                      : audio.state === "denied"
                        ? l("Permission denied", "Permiso denegado")
                        : audio.state === "unavailable"
                          ? l("Unavailable", "No disponible")
                          : audio.state === "error"
                            ? l("Device error", "Error de dispositivo")
                            : l("Not tested", "Sin probar")}
                </Badge>
              </div>
              <Progress
                value={audio.level}
                label={l(
                  "Microphone input level",
                  "Nivel de entrada del micrófono",
                )}
              />
              <p className="text-xs leading-5 text-muted-foreground">
                {audio.state === "denied"
                  ? l(
                      "Allow microphone access in the browser's site settings, then try again.",
                      "Permite el micrófono en los ajustes del sitio del navegador e inténtalo de nuevo.",
                    )
                  : audio.state === "unavailable"
                    ? l(
                        "Use HTTPS or localhost with an available microphone.",
                        "Usa HTTPS o localhost con un micrófono disponible.",
                      )
                    : audio.state === "ready"
                      ? l(
                          `${audio.deviceCount} audio input(s) found. The test stream has been stopped.`,
                          `${audio.deviceCount} entrada(s) de audio encontrada(s). La captura de prueba se detuvo.`,
                        )
                      : l(
                          "Microphone access is requested only when you press Test microphone.",
                          "El permiso del micrófono se solicita solo al pulsar Probar micrófono.",
                        )}
              </p>
              <Button
                variant="outline"
                className="min-h-11 w-fit"
                data-testid="softphone-test-microphone"
                disabled={audio.state === "testing"}
                onClick={() => void audio.testMicrophone()}
              >
                <Mic aria-hidden="true" />
                {l("Test microphone", "Probar micrófono")}
              </Button>
            </Card>
            <Card className="grid gap-3 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Volume2 aria-hidden="true" className="size-4" />
                {l("Speaker", "Altavoz")}
              </p>
              <p
                className="text-xs leading-5 text-muted-foreground"
                role={audio.speakerState === "error" ? "alert" : undefined}
              >
                {audio.speakerState === "error"
                  ? l(
                      "The browser could not play audio. Check your output device.",
                      "El navegador no pudo reproducir audio. Revisa tu salida de sonido.",
                    )
                  : l(
                      "Plays a brief tone through your browser's default output.",
                      "Reproduce un tono breve en la salida predeterminada del navegador.",
                    )}
              </p>
              <Button
                variant="outline"
                className="min-h-11 w-fit"
                data-testid="softphone-test-speaker"
                disabled={audio.speakerState === "playing"}
                onClick={() => void audio.testSpeaker()}
              >
                <Play aria-hidden="true" />
                {l("Play test tone", "Reproducir tono")}
              </Button>
            </Card>
          </div>
          <DialogFooter>
            <Button
              className="min-h-11"
              onClick={() => {
                audio.stop();
                setDevicesOpen(false);
              }}
            >
              {l("Done", "Listo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BusinessHoursDialog
        key={
          hoursOpen ? JSON.stringify(snapshot.businessHours) : "closed-hours"
        }
        open={hoursOpen}
        onOpenChange={setHoursOpen}
        schedule={snapshot.businessHours}
        editable={!!demo}
        localDemo={localDemo}
        onSave={async (schedule) => {
          if (!demo) return;
          await demo.setSchedule(schedule);
          setHoursOpen(false);
          toast.success(
            l("Support schedule updated.", "Horario de soporte actualizado."),
          );
        }}
      />
      <Dialog open={keypadOpen} onOpenChange={setKeypadOpen}>
        <DialogContent
          closeLabel={l("Close keypad", "Cerrar teclado")}
          className="max-w-sm"
        >
          <DialogTitle>{l("Call keypad", "Teclado de la llamada")}</DialogTitle>
          <DialogDescription>
            {demo
              ? l(
                  "Digits update this local simulation only. No tones are sent to a carrier.",
                  "Los dígitos actualizan solo esta simulación. No se envían tonos a un proveedor.",
                )
              : l(
                  "Send digits to the current call. Digits are not shown in the activity log.",
                  "Envía dígitos a la llamada actual. No se muestran en el registro de actividad.",
                )}
          </DialogDescription>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {keypad.map(([digit, letters]) => (
              <Button
                key={digit}
                variant="outline"
                className="h-16 flex-col gap-0 text-xl"
                data-testid={`softphone-key-${digit === "*" ? "star" : digit === "#" ? "hash" : digit}`}
                aria-label={`${l("Send", "Enviar")} ${digit}`}
                disabled={
                  !active ||
                  call?.status === "held" ||
                  !ready ||
                  busy ||
                  snapshot.caps?.dtmf !== true
                }
                onClick={() => {
                  if (call) void run(() => instance.sendDtmf(call.id, digit));
                }}
              >
                <span>{digit}</span>
                <span
                  aria-hidden="true"
                  className="text-[10px] leading-4 tracking-widest text-muted-foreground"
                >
                  {letters || "\u00a0"}
                </span>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button className="min-h-11" onClick={() => setKeypadOpen(false)}>
              {l("Done", "Listo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selectedHistory}
        onOpenChange={(open) => {
          if (!open) setSelectedHistory(null);
        }}
      >
        <DialogContent
          closeLabel={l("Close call details", "Cerrar detalles de llamada")}
        >
          <DialogTitle>
            {selectedHistory?.callerName ||
              l("Call details", "Detalles de llamada")}
          </DialogTitle>
          <DialogDescription>
            {selectedHistory
              ? `${selectedHistory.from} · ${historyTime(selectedHistory.queuedAt)}`
              : ""}
          </DialogDescription>
          {selectedHistory && (
            <dl className="mt-6 grid gap-4">
              <div className="flex flex-wrap justify-between gap-3">
                <dt className="text-sm text-muted-foreground">
                  {l("Outcome", "Resultado")}
                </dt>
                <dd className="text-sm font-medium">
                  {callOutcome(selectedHistory, l)}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <dt className="text-sm text-muted-foreground">
                  {l("Duration", "Duración")}
                </dt>
                <dd className="text-sm font-medium tabular-nums">
                  {historyDuration(selectedHistory)}
                </dd>
              </div>
              <div className="grid gap-2">
                <dt className="text-sm text-muted-foreground">
                  {l("Notes", "Notas")}
                </dt>
                <dd className="break-words rounded-lg bg-surface-subtle p-4 text-sm leading-6">
                  {selectedHistory.notes ||
                    l(
                      "No notes for this call.",
                      "Esta llamada no tiene notas.",
                    )}
                </dd>
              </div>
            </dl>
          )}
          <DialogFooter>
            <Button
              className="min-h-11"
              onClick={() => setSelectedHistory(null)}
            >
              {l("Done", "Listo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BusinessHoursDialog({
  open,
  onOpenChange,
  schedule,
  editable,
  localDemo,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: BusinessHoursSchedule;
  editable: boolean;
  localDemo: boolean;
  onSave: (schedule: BusinessHoursSchedule) => Promise<void>;
}) {
  const { l } = useLanguage();
  const [timezone, setTimezone] = useState(schedule.timezone);
  const [start, setStart] = useState(schedule.weekly[0]?.start ?? "08:00");
  const [end, setEnd] = useState(schedule.weekly[0]?.end ?? "18:00");
  const [days, setDays] = useState<BusinessHoursWeekday[]>(
    schedule.weekly.map((period) => period.day),
  );
  const [holidays, setHolidays] = useState(
    schedule.holidays.map((holiday) => holiday.date).join("\n"),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const commonPeriod = schedule.weekly[0];
  const uniformHours =
    new Set(schedule.weekly.map((period) => period.day)).size ===
      schedule.weekly.length &&
    schedule.weekly.every(
      (period) =>
        period.start === commonPeriod?.start &&
        period.end === commonPeriod?.end,
    );
  const canEdit = editable && uniformHours;
  const id = useId();
  const apply = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit || saving) return;
    setError(null);
    setSaving(true);
    try {
      const next: BusinessHoursSchedule = {
        timezone: timezone.trim(),
        weekly: days.map((day) => ({ day, start, end })),
        holidays: holidays
          .split(/\r?\n/)
          .map((date) => date.trim())
          .filter(Boolean)
          .map((date) => {
            const label = schedule.holidays.find(
              (holiday) => holiday.date === date,
            )?.label;
            return label ? { date, label } : { date };
          }),
      };
      validateBusinessHoursSchedule(next);
      await onSave(next);
    } catch {
      setError(
        l(
          "Check the timezone, time range and holiday dates.",
          "Revisa la zona horaria, el intervalo y las fechas de festivos.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={l("Close business hours", "Cerrar horario")}
        key={open ? JSON.stringify(schedule) : "closed"}
      >
        <DialogTitle>
          {l("Time for a conversation.", "Tiempo para una conversación.")}
        </DialogTitle>
        <DialogDescription>
          {canEdit
            ? l(
                "Edit the local lab schedule. Explicit holiday dates override weekly hours; this is not an official holiday calendar.",
                "Edita el horario del laboratorio local. Los festivos explícitos prevalecen sobre el horario semanal; no es un calendario oficial de festivos.",
              )
            : localDemo
              ? l(
                  "View every period in this schedule. Different daily hours are edited in the host application.",
                  "Consulta todos los intervalos del horario. Los horarios distintos por día se editan desde la aplicación que lo integra.",
                )
              : l(
                  "Your backend applies this schedule. Live routing changes require authorized backend controls.",
                  "Tu backend aplica este horario. Los cambios de routing real requieren controles autorizados del backend.",
                )}
        </DialogDescription>
        {!canEdit ? (
          <div className="mt-6 grid gap-5">
            <dl className="grid gap-1 text-sm">
              <dt className="font-semibold">
                {l("Time zone", "Zona horaria")}
              </dt>
              <dd className="break-words text-muted-foreground">
                {schedule.timezone}
              </dd>
            </dl>
            <div>
              <p className="mb-3 text-sm font-semibold">
                {l("Weekly hours", "Horario semanal")}
              </p>
              <ul className="grid gap-2 text-sm">
                {[...schedule.weekly]
                  .sort(
                    (a, b) => a.day - b.day || a.start.localeCompare(b.start),
                  )
                  .map((period) => (
                    <li
                      key={`${period.day}-${period.start}-${period.end}`}
                      className="flex flex-wrap justify-between gap-2 rounded-lg border border-border p-3"
                    >
                      <span>
                        {l(
                          weekdayNames[period.day][0],
                          weekdayNames[period.day][1],
                        )}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {period.start}–{period.end}
                      </span>
                    </li>
                  ))}
              </ul>
              {!schedule.weekly.length && (
                <p className="text-sm text-muted-foreground">
                  {l("No open periods.", "Sin intervalos de atención.")}
                </p>
              )}
            </div>
            {!!schedule.holidays.length && (
              <div>
                <p className="mb-3 text-sm font-semibold">
                  {l("Holiday dates", "Fechas de festivos")}
                </p>
                <ul className="grid gap-2 text-sm text-muted-foreground">
                  {schedule.holidays.map((holiday) => (
                    <li key={holiday.date}>
                      <time dateTime={holiday.date}>{holiday.date}</time>
                      {holiday.label && ` · ${holiday.label}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button className="min-h-11" onClick={() => onOpenChange(false)}>
                {l("Close", "Cerrar")}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="mt-6 grid gap-5"
            onSubmit={(event) => void apply(event)}
          >
            <Field
              label={l("Time zone", "Zona horaria")}
              htmlFor={`${id}-zone`}
            >
              <Input
                id={`${id}-zone`}
                value={timezone}
                disabled={!editable || saving}
                onChange={(event) => setTimezone(event.target.value)}
                placeholder="America/Bogota"
                className="min-h-11"
              />
            </Field>
            <fieldset disabled={!editable || saving}>
              <legend className="mb-3 text-xs font-semibold">
                {l("Open days", "Días de atención")}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {weekdayNames.map(([en, es], day) => (
                  <label
                    key={day}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-[13px]"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={days.includes(day as BusinessHoursWeekday)}
                      onChange={(event) =>
                        setDays((previous) =>
                          event.target.checked
                            ? [...previous, day as BusinessHoursWeekday].sort()
                            : previous.filter((entry) => entry !== day),
                        )
                      }
                    />
                    {l(en, es)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-4">
              <Field label={l("Opens", "Apertura")} htmlFor={`${id}-start`}>
                <Input
                  id={`${id}-start`}
                  type="time"
                  value={start}
                  disabled={!editable || saving}
                  onChange={(event) => setStart(event.target.value)}
                  className="min-h-11"
                />
              </Field>
              <Field label={l("Closes", "Cierre")} htmlFor={`${id}-end`}>
                <Input
                  id={`${id}-end`}
                  type="time"
                  value={end === "24:00" ? "00:00" : end}
                  disabled={!editable || saving}
                  onChange={(event) => setEnd(event.target.value)}
                  className="min-h-11"
                />
              </Field>
            </div>
            <Field
              label={l("Holiday dates", "Fechas de festivos")}
              htmlFor={`${id}-holidays`}
              description={l(
                "One YYYY-MM-DD date per line. Add your own verified regional dates.",
                "Una fecha YYYY-MM-DD por línea. Añade las fechas regionales que hayas verificado.",
              )}
            >
              <Textarea
                id={`${id}-holidays`}
                value={holidays}
                disabled={!editable || saving}
                onChange={(event) => setHolidays(event.target.value)}
                placeholder="2026-12-25"
                rows={3}
              />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-destructive-foreground">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => onOpenChange(false)}
              >
                {l("Close", "Cerrar")}
              </Button>
              {canEdit && (
                <Button
                  type="submit"
                  className="min-h-11"
                  loading={saving}
                  data-testid="softphone-save-hours"
                >
                  <Check aria-hidden="true" />
                  {l("Save hours", "Guardar horario")}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
