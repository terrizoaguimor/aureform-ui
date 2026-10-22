"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  KeyRound,
  LoaderCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { CommunicationsProviderLogo } from "@/components/communications/provider-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import type { CommunicationsProvider } from "@/lib/communications/contracts";
import {
  CommunicationsSetupError,
  type CommunicationsSetupAdapter,
  type CommunicationsSetupConfigured,
  type CommunicationsSetupCredentials,
  type CommunicationsSetupErrorCode,
  type CommunicationsSetupPhase,
} from "@/lib/communications/setup-contracts";
import {
  createDemoCommunicationsSetupAdapter,
  getCommunicationsSetupDemoCredentials,
} from "@/lib/communications/setup-demo";
import { cn } from "@/lib/utils";

export type CommunicationsSetupProps = {
  /** Supply live adapters from an authenticated client host, never a server prop. */
  adapter?: CommunicationsSetupAdapter;
  defaultProvider?: CommunicationsProvider;
  /** Live hosts keep their selected provider and SDK binding concordant. */
  fixedProvider?: boolean;
  /** The host supplies a fresh live adapter when this identity changes. */
  authSessionKey?: string;
  onConfigured?: (summary: CommunicationsSetupConfigured) => void;
  onOpenSoftphone?: () => void;
  className?: string;
};

type Localize = (en: string, es: string) => string;
const errors: Record<CommunicationsSetupErrorCode, readonly [string, string]> =
  {
    "invalid-credentials": [
      "Check both credential fields and try again.",
      "Revisa los dos campos de credenciales e inténtalo de nuevo.",
    ],
    "authentication-required": [
      "Sign in to the authenticated host to continue.",
      "Inicia sesión en el host autenticado para continuar.",
    ],
    "permission-denied": [
      "This account does not permit the requested setup.",
      "Esta cuenta no permite la configuración solicitada.",
    ],
    "invalid-configuration": [
      "Authenticated setup is unavailable.",
      "La configuración autenticada no está disponible.",
    ],
    "network-error": [
      "The setup service could not be reached.",
      "No se pudo contactar con el servicio de configuración.",
    ],
    "invalid-response": [
      "The setup service returned an invalid response.",
      "El servicio de configuración devolvió una respuesta no válida.",
    ],
    "number-not-eligible": [
      "Choose an existing voice-enabled number.",
      "Elige un número existente habilitado para voz.",
    ],
    "setup-confirmation-required": [
      "Review and confirm the configuration first.",
      "Revisa y confirma la configuración primero.",
    ],
    "routing-replacement-confirmation-required": [
      "Confirm replacing the selected number's existing routing.",
      "Confirma el reemplazo del routing existente del número seleccionado.",
    ],
    "setup-plan-expired": [
      "This plan has expired. Review a new plan.",
      "Este plan ha caducado. Revisa un plan nuevo.",
    ],
    "setup-connection-expired": [
      "This setup session has expired. Inspect again.",
      "Esta sesión de configuración ha caducado. Inspecciona de nuevo.",
    ],
    "setup-failed": [
      "Setup needs attention. Check the result before continuing.",
      "La configuración requiere atención. Consulta el resultado antes de continuar.",
    ],
    "setup-reconciliation-required": [
      "The setup result is not confirmed. Check its status before continuing.",
      "El resultado de la configuración no está confirmado. Consulta su estado antes de continuar.",
    ],
    "setup-busy": [
      "A setup request is already in progress.",
      "Ya hay una solicitud de configuración en curso.",
    ],
    "invalid-state": [
      "Complete the previous setup step first.",
      "Completa primero el paso anterior.",
    ],
    "request-cancelled": [
      "The setup request was cancelled.",
      "La solicitud de configuración se canceló.",
    ],
    disposed: [
      "This setup session is no longer available.",
      "Esta sesión de configuración ya no está disponible.",
    ],
    "demo-only": [
      "The local demo accepts read-only fixture credentials only.",
      "La demo local sólo acepta credenciales ficticias de sólo lectura.",
    ],
  };

function errorCopy(code: CommunicationsSetupErrorCode, l: Localize) {
  const labels = errors[code] ?? errors["invalid-response"];
  return l(...labels);
}

function stepIndex(phase: CommunicationsSetupPhase) {
  if (phase === "credentials") return 0;
  if (phase === "select-number") return 1;
  if (phase === "review") return 2;
  if (phase === "configuring" || phase === "unknown" || phase === "failed")
    return 3;
  return 4;
}

function stepKind(kind: "create" | "reuse" | "update" | "verify", l: Localize) {
  const labels = {
    create: ["Create", "Crear"],
    reuse: ["Reuse", "Reutilizar"],
    update: ["Update", "Actualizar"],
    verify: ["Verify", "Verificar"],
  } as const;
  return l(labels[kind][0], labels[kind][1]);
}

function planStepCopy(
  provider: CommunicationsProvider,
  id: string,
  label: string,
  l: Localize,
) {
  const fixtureLabels: Record<string, readonly [string, string]> = {
    "voice-application": [
      "Prepare browser voice application",
      "Preparar la aplicación de voz del navegador",
    ],
    "inbound-routing": [
      "Set inbound number routing",
      "Configurar el routing del número entrante",
    ],
    "webhook-verification": [
      "Verify webhook configuration",
      "Verificar la configuración de webhooks",
    ],
  };
  const providerLabels: Record<
    CommunicationsProvider,
    Record<string, readonly [string, string]>
  > = {
    twilio: {
      account: [
        "Verify active account, owned voice number and US1 inbound processing region (US1 only)",
        "Verificar la cuenta activa, el número de voz propio y la región de procesamiento entrante US1 (sólo US1)",
      ],
      "standard-key": [
        "Create an internally owned Standard API key; store its one-time secret",
        "Crear una clave API Standard propia y guardar su secreto, mostrado una sola vez",
      ],
      "application-precedence": [
        "Clear VoiceApplicationSid; the existing Application overrides VoiceUrl",
        "Vaciar VoiceApplicationSid; la aplicación existente tiene prioridad sobre VoiceUrl",
      ],
      "voice-fallback": [
        "Clear the existing voice fallback URL to avoid inheriting an external route",
        "Vaciar la URL de respaldo de voz existente para evitar heredar una ruta externa",
      ],
      "number-routing": [
        "Set fixed inbound/status HTTPS URLs using POST; preserve SMS settings",
        "Configurar las URL HTTPS fijas de entrada y estado mediante POST; conservar la configuración de SMS",
      ],
      readback: [
        "Re-read API key ownership, routing and preserved messaging configuration",
        "Volver a leer la propiedad de la clave API, el routing y la configuración de mensajería conservada",
      ],
    },
    telnyx: {
      number: [
        "Verify active owned number, voice feature and compatible voice settings",
        "Verificar que el número propio esté activo, habilitado para voz y con ajustes de voz compatibles",
      ],
      "call-control-app": [
        "Create an owned Call Control Application with the fixed v2 webhook",
        "Crear una Call Control Application propia con el webhook v2 fijo",
      ],
      "credential-connection": [
        "Create a separate owned internal SIP credential connection; no outbound profile",
        "Crear una conexión de credenciales SIP interna, propia y separada; sin perfil de salida",
      ],
      "sip-policy": [
        "Require explicit no-profile readback; omission is not outbound policy proof",
        "Exigir una lectura que confirme explícitamente la ausencia de perfil; su omisión no verifica la política de salida",
      ],
      "number-routing": [
        "Attach only this number to the application; preserve messaging and voice settings",
        "Vincular únicamente este número a la aplicación; conservar la configuración de mensajería y voz",
      ],
      readback: [
        "Re-read both owned resources and the selected number; real calls remain disabled",
        "Volver a leer ambos recursos propios y el número seleccionado; las llamadas reales siguen deshabilitadas",
      ],
    },
  };
  const labels = Object.hasOwn(providerLabels[provider], id)
    ? providerLabels[provider][id]
    : Object.hasOwn(fixtureLabels, id)
      ? fixtureLabels[id]
      : undefined;
  return labels ? l(...labels) : label;
}

export function CommunicationsSetup({
  adapter,
  defaultProvider = "twilio",
  fixedProvider,
  authSessionKey,
  onConfigured,
  onOpenSoftphone,
  className,
}: CommunicationsSetupProps) {
  const { l, date } = useLanguage();
  const scope = useMemo(
    () => ({
      authSessionKey,
      instance:
        adapter ??
        createDemoCommunicationsSetupAdapter({
          provider: defaultProvider,
        }),
    }),
    [adapter, defaultProvider, authSessionKey],
  );
  const instance = scope.instance;
  const snapshot = useSyncExternalStore(
    instance.subscribe,
    instance.getSnapshot,
    instance.getServerSnapshot,
  );
  const id = useId();
  const firstInput = useRef<HTMLInputElement>(null);
  const secondInput = useRef<HTMLInputElement>(null);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  const lifetime = useRef({ instance, token: 0 });
  const mounted = useRef(false);
  const action = useRef<number | null>(null);
  const sequence = useRef(0);
  const previousPhase = useRef(snapshot.phase);
  const configuredKeys = useRef(new Set<string>());
  const configuredCallback = useRef(onConfigured);
  const [selectedNumber, setSelectedNumber] = useState("");
  const [replaceRouting, setReplaceRouting] = useState(false);
  const [actionError, setActionError] =
    useState<CommunicationsSetupErrorCode | null>(null);
  const demo = snapshot.mode === "demo";
  const busy = snapshot.busy !== null;
  const providerName = snapshot.provider === "twilio" ? "Twilio" : "Telnyx";
  const fixture = getCommunicationsSetupDemoCredentials(snapshot.provider);
  const firstLabel =
    snapshot.provider === "twilio" ? "Account SID" : l("API key", "Clave API");
  const secondLabel =
    snapshot.provider === "twilio"
      ? l("Auth token", "Token de autenticación")
      : l("Public key", "Clave pública");
  const firstFixture =
    fixture.provider === "twilio" ? fixture.accountSid : fixture.apiKey;
  const secondFixture =
    fixture.provider === "twilio" ? fixture.authToken : fixture.publicKey;
  const phase = snapshot.phase;
  const plan = snapshot.plan;
  const result = snapshot.result;
  const chosenNumber =
    plan?.number ??
    result?.number ??
    snapshot.inspection?.numbers.find((number) => number.id === selectedNumber);
  const error = actionError ?? snapshot.error?.code;
  const steps = [
    l("Credentials", "Credenciales"),
    l("Number", "Número"),
    l("Review", "Revisar"),
    l("Configure", "Configurar"),
    l("Checks", "Comprobaciones"),
  ];
  const index = stepIndex(phase);

  function clearCredentials() {
    if (firstInput.current) firstInput.current.value = "";
    if (secondInput.current) secondInput.current.value = "";
  }

  useEffect(() => {
    configuredCallback.current = onConfigured;
  }, [onConfigured]);

  useEffect(() => {
    const token = ++sequence.current;
    lifetime.current = { instance, token };
    mounted.current = true;
    action.current = null;
    configuredKeys.current.clear();
    setSelectedNumber("");
    setReplaceRouting(false);
    setActionError(null);
    previousPhase.current = instance.getSnapshot().phase;
    return () => {
      mounted.current = false;
      clearCredentials();
      instance.cancel();
      // React Strict Mode replays effects; dispose only a retired owned demo.
      queueMicrotask(() => {
        if (
          !adapter &&
          (lifetime.current.instance !== instance ||
            lifetime.current.token === token)
        )
          instance.dispose();
      });
    };
  }, [instance, adapter, scope.authSessionKey]);

  useEffect(() => {
    if (previousPhase.current !== phase) {
      previousPhase.current = phase;
      stageHeading.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  useEffect(() => {
    setReplaceRouting(false);
  }, [plan?.planId]);

  useEffect(() => {
    const eligible =
      snapshot.inspection?.numbers.filter((number) => number.voiceEnabled) ??
      [];
    setSelectedNumber(eligible.length === 1 ? eligible[0].id : "");
  }, [snapshot.inspection]);

  useEffect(() => {
    if (result?.phase !== "configured" || phase !== "configured") return;
    const key = [
      result.connectionId,
      result.number.id,
      result.checks.webhooks,
    ].join(":");
    if (configuredKeys.current.has(key)) return;
    configuredKeys.current.add(key);
    configuredCallback.current?.(result);
  }, [result, phase]);

  async function run(operation: () => Promise<unknown>) {
    if (action.current !== null || busy) return;
    const token = ++sequence.current;
    action.current = token;
    setActionError(null);
    try {
      await operation();
    } catch (caught) {
      if (mounted.current && action.current === token) {
        setActionError(
          instance.getSnapshot().error?.code ??
            (caught instanceof CommunicationsSetupError
              ? caught.code
              : "invalid-response"),
        );
      }
    } finally {
      if (action.current === token) action.current = null;
    }
  }

  function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (action.current !== null || busy) return;
    const input: CommunicationsSetupCredentials = demo
      ? getCommunicationsSetupDemoCredentials(snapshot.provider)
      : snapshot.provider === "twilio"
        ? {
            provider: "twilio",
            accountSid: firstInput.current?.value ?? "",
            authToken: secondInput.current?.value ?? "",
          }
        : {
            provider: "telnyx",
            apiKey: firstInput.current?.value ?? "",
            publicKey: secondInput.current?.value ?? "",
          };
    const first = firstInput.current;
    const second = secondInput.current;
    void run(() => instance.inspect(input)).finally(() => {
      // Clear the original nodes, not fields belonging to a newer request.
      if (first) first.value = "";
      if (second) second.value = "";
    });
    if (!demo) clearCredentials();
  }

  function back() {
    clearCredentials();
    setActionError(null);
    setReplaceRouting(false);
    try {
      instance.back();
    } catch (caught) {
      setActionError(
        caught instanceof CommunicationsSetupError
          ? caught.code
          : "invalid-response",
      );
    }
  }

  const title =
    phase === "credentials"
      ? l("Your provider credentials", "Credenciales del proveedor")
      : phase === "select-number"
        ? l("Choose an existing number", "Elige un número existente")
        : phase === "review"
          ? l("Review the setup plan", "Revisa el plan de configuración")
          : phase === "configuring"
            ? l("Configuring your number", "Configurando tu número")
            : phase === "configured"
              ? demo
                ? l("Demo setup complete", "Configuración demo completada")
                : l("Number configured", "Número configurado")
              : phase === "failed"
                ? l(
                    "Setup needs attention",
                    "La configuración requiere atención",
                  )
                : l("Check the setup result", "Consulta el resultado");

  return (
    <section
      aria-label={l("Communications setup", "Configuración de comunicaciones")}
      data-testid="communications-setup"
      data-mode={snapshot.mode}
      data-phase={phase}
      className={cn("grid min-w-0 gap-6", className)}
    >
      <Card appearance="gradient" className="flex min-w-0 gap-4 p-5 sm:p-6">
        <CommunicationsProviderLogo provider={snapshot.provider} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-muted-foreground">
              {l("Voice setup", "Configuración de voz")} · {providerName}
            </p>
            <Badge variant="outline" data-testid="setup-mode">
              {demo
                ? l("Local demo", "Demo local")
                : l("Authenticated setup", "Configuración autenticada")}
            </Badge>
          </div>
          <h2 className="text-2xl leading-8 font-semibold tracking-tight">
            {l("Connect your voice provider.", "Conecta tu proveedor de voz.")}
          </h2>
          <p className="text-[13px] leading-6 text-muted-foreground">
            {l(
              "Inspect your account, review the changes and configure an existing number.",
              "Inspecciona tu cuenta, revisa los cambios y configura un número existente.",
            )}
          </p>
        </div>
      </Card>

      <ol
        aria-label={l("Setup progress", "Progreso de configuración")}
        className="grid grid-cols-5 gap-2"
      >
        {steps.map((label, position) => (
          <li
            key={position}
            aria-current={position === index ? "step" : undefined}
            className="flex min-w-0 flex-col items-center gap-2 text-center"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-8 items-center justify-center rounded-full border text-xs font-semibold",
                position <= index
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface-subtle text-muted-foreground",
              )}
            >
              {position < index ? <Check className="size-4" /> : position + 1}
            </span>
            <span
              className={cn(
                "max-w-full text-[10px] leading-4 wrap-break-word sm:text-xs",
                position === index ? "font-semibold" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card
          aria-busy={busy}
          className="grid min-w-0 gap-4 p-5 sm:p-6"
          data-testid="setup-stage"
        >
          <h3
            id={`${id}-stage-title`}
            ref={stageHeading}
            tabIndex={-1}
            className="text-[15px] leading-6 font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {title}
          </h3>

          {error && (
            <div
              role="alert"
              data-testid="setup-error"
              data-error-code={error}
              className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-[13px] leading-6 text-destructive-foreground"
            >
              <CircleAlert
                aria-hidden="true"
                className="mt-1 size-4 shrink-0"
              />
              <p>{errorCopy(error, l)}</p>
            </div>
          )}

          {phase === "credentials" && (
            <form
              onSubmit={inspect}
              method="post"
              noValidate
              className="grid gap-4"
            >
              <Select
                label={l("Voice provider", "Proveedor de voz")}
                aria-label={l("Voice provider", "Proveedor de voz")}
                value={snapshot.provider}
                disabled={busy || (fixedProvider ?? !demo)}
                className="min-h-11"
                onValueChange={(value) => {
                  if (value !== "twilio" && value !== "telnyx") return;
                  clearCredentials();
                  setActionError(null);
                  instance.setProvider(value);
                }}
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
              <div
                role="note"
                data-testid="setup-credentials-note"
                className="rounded-xl border border-border bg-surface-subtle p-4 text-[13px] leading-6 text-muted-foreground"
              >
                {demo
                  ? l(
                      "This local demo uses read-only fixture credentials. It never contacts a provider or stores secrets.",
                      "Esta demo local usa credenciales ficticias de sólo lectura. No contacta con proveedores ni almacena secretos.",
                    )
                  : l(
                      "Credentials authorize inspection only. They are sent securely to your authenticated backend and cleared from this form.",
                      "Las credenciales sólo autorizan la inspección. Se envían de forma segura a tu backend autenticado y se borran de este formulario.",
                    )}
              </div>
              <Field label={firstLabel} htmlFor={`${id}-first-credential`}>
                <Input
                  key={`${snapshot.provider}-${snapshot.mode}-first`}
                  ref={firstInput}
                  data-testid="setup-credential-first"
                  type={snapshot.provider === "telnyx" ? "password" : "text"}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={snapshot.provider === "twilio" ? 34 : 1024}
                  readOnly={demo}
                  disabled={busy}
                  defaultValue={demo ? firstFixture : ""}
                  className="min-h-11"
                />
              </Field>
              <Field label={secondLabel} htmlFor={`${id}-second-credential`}>
                <Input
                  key={`${snapshot.provider}-${snapshot.mode}-second`}
                  ref={secondInput}
                  data-testid="setup-credential-second"
                  type="password"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={snapshot.provider === "twilio" ? 128 : 44}
                  readOnly={demo}
                  disabled={busy}
                  defaultValue={demo ? secondFixture : ""}
                  className="min-h-11"
                />
              </Field>
              <Button
                type="submit"
                loading={busy}
                appearance="gradient"
                className="min-h-11 w-full sm:w-auto sm:justify-self-start"
                data-testid="setup-inspect"
              >
                <KeyRound aria-hidden="true" />
                {demo
                  ? l("Explore demo setup", "Explorar configuración demo")
                  : l("Inspect account", "Inspeccionar cuenta")}
              </Button>
            </form>
          )}

          {phase === "select-number" && (
            <>
              <p className="text-[13px] leading-6 text-muted-foreground">
                {l(
                  "Choose a voice-enabled number already in your account.",
                  "Elige un número de tu cuenta que ya esté habilitado para voz.",
                )}
              </p>
              {!snapshot.inspection?.numbers.length ? (
                <div
                  data-testid="setup-empty"
                  className="grid justify-items-start gap-3 rounded-xl border border-dashed border-border p-5"
                >
                  <Phone
                    aria-hidden="true"
                    className="size-5 text-muted-foreground"
                  />
                  <p className="text-[13px] font-semibold">
                    {l("No existing numbers", "No hay números existentes")}
                  </p>
                  <p className="text-[13px] leading-6 text-muted-foreground">
                    {l(
                      "Add an eligible number in your provider account, then inspect again.",
                      "Añade un número elegible en tu cuenta del proveedor e inspecciona de nuevo.",
                    )}
                  </p>
                </div>
              ) : (
                <fieldset className="grid min-w-0 gap-3" disabled={busy}>
                  <legend className="sr-only">
                    {l("Existing numbers", "Números existentes")}
                  </legend>
                  {snapshot.inspection.numbers.map((number) => (
                    <label
                      key={number.id}
                      className={cn(
                        "flex min-w-0 items-start gap-3 rounded-xl border p-4",
                        selectedNumber === number.id
                          ? "border-primary bg-accent/30"
                          : "border-border",
                        !number.voiceEnabled && "bg-surface-subtle",
                      )}
                    >
                      <input
                        type="radio"
                        name={`${id}-number`}
                        value={number.id}
                        checked={selectedNumber === number.id}
                        disabled={!number.voiceEnabled}
                        onChange={() => {
                          setSelectedNumber(number.id);
                          setActionError(null);
                        }}
                        className="mt-1 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      />
                      <span className="grid min-w-0 gap-1">
                        <span className="text-[13px] font-semibold break-all">
                          {number.phoneNumber}
                        </span>
                        <span className="text-xs leading-5 text-muted-foreground wrap-break-word">
                          {number.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {number.voiceEnabled
                            ? number.hasExistingRouting
                              ? l("Existing routing", "Routing existente")
                              : l(
                                  "No existing routing",
                                  "Sin routing existente",
                                )
                            : l("Voice not enabled", "Voz no habilitada")}
                        </span>
                      </span>
                      <Badge
                        variant={number.voiceEnabled ? "outline" : "neutral"}
                        className="ml-auto shrink-0"
                      >
                        {number.voiceEnabled
                          ? l("Voice", "Voz")
                          : l("Unavailable", "No disponible")}
                      </Badge>
                    </label>
                  ))}
                </fieldset>
              )}
              {!!snapshot.inspection?.numbers.length &&
                !snapshot.inspection.numbers.some(
                  (number) => number.voiceEnabled,
                ) && (
                  <p
                    role="status"
                    data-testid="setup-no-eligible"
                    className="text-[13px] leading-6 text-muted-foreground"
                  >
                    {l(
                      "None of these numbers supports voice setup.",
                      "Ninguno de estos números admite la configuración de voz.",
                    )}
                  </p>
                )}
              <div className="flex flex-wrap justify-between gap-3">
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={busy}
                  onClick={back}
                  data-testid="setup-back"
                >
                  <ArrowLeft aria-hidden="true" />
                  {l("Back", "Atrás")}
                </Button>
                <Button
                  className="min-h-11"
                  disabled={
                    !snapshot.inspection?.numbers.some(
                      (number) =>
                        number.id === selectedNumber && number.voiceEnabled,
                    ) || busy
                  }
                  loading={snapshot.busy === "plan"}
                  data-testid="setup-plan"
                  onClick={() => void run(() => instance.plan(selectedNumber))}
                >
                  {l("Review setup", "Revisar configuración")}
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </>
          )}

          {phase === "review" && plan && (
            <>
              <p className="text-[13px] leading-6 text-muted-foreground">
                {l(
                  "These changes apply only after your confirmation.",
                  "Estos cambios se aplicarán únicamente después de tu confirmación.",
                )}
              </p>
              <dl className="grid gap-3 rounded-xl border border-border bg-surface-subtle p-4 text-[13px]">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {l("Selected number", "Número seleccionado")}
                  </dt>
                  <dd className="font-semibold">{plan.number.phoneNumber}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {l("Plan expires", "El plan caduca")}
                  </dt>
                  <dd>
                    {date(plan.expiresAt, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "UTC",
                    })}{" "}
                    UTC
                  </dd>
                </div>
              </dl>
              <ul
                aria-label={l("Planned changes", "Cambios previstos")}
                className="grid gap-3"
                data-testid="setup-plan-steps"
              >
                {plan.steps.map((step) => (
                  <li
                    key={step.id}
                    className="flex min-w-0 items-start gap-3 text-[13px] leading-6"
                  >
                    <Badge variant="outline" className="mt-0.5 shrink-0">
                      {stepKind(step.kind, l)}
                    </Badge>
                    <span className="min-w-0 wrap-break-word">
                      {planStepCopy(plan.provider, step.id, step.label, l)}
                    </span>
                  </li>
                ))}
              </ul>
              {plan.willReplaceRouting ? (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-[13px] leading-6">
                  <Checkbox
                    checked={replaceRouting}
                    onCheckedChange={(checked) => setReplaceRouting(!!checked)}
                    disabled={busy}
                    className="mt-1"
                    data-testid="setup-replace-routing"
                  />
                  <span>
                    {l(
                      "Replace this number's existing routing with the reviewed configuration.",
                      "Reemplazar el routing existente de este número por la configuración revisada.",
                    )}
                  </span>
                </label>
              ) : (
                <p className="text-[13px] leading-6 text-muted-foreground">
                  {l(
                    "This plan does not replace existing routing.",
                    "Este plan no reemplaza routing existente.",
                  )}
                </p>
              )}
              <div className="flex flex-wrap justify-between gap-3">
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={busy}
                  onClick={back}
                  data-testid="setup-back"
                >
                  <ArrowLeft aria-hidden="true" />
                  {l("Back", "Atrás")}
                </Button>
                <Button
                  appearance="gradient"
                  className="min-h-11"
                  data-testid="setup-apply"
                  disabled={
                    busy || (plan.willReplaceRouting && !replaceRouting)
                  }
                  onClick={() =>
                    void run(() =>
                      instance.apply({
                        configure: true,
                        replaceExistingRouting:
                          plan.willReplaceRouting && replaceRouting,
                      }),
                    )
                  }
                >
                  <ShieldCheck aria-hidden="true" />
                  {l("Connect and configure", "Conectar y configurar")}
                </Button>
              </div>
            </>
          )}

          {phase === "configuring" && (
            <>
              <div
                role="progressbar"
                aria-label={l(
                  "Configuration progress",
                  "Progreso de la configuración",
                )}
                aria-valuetext={l(
                  "Configuration in progress",
                  "Configuración en curso",
                )}
                className="flex items-start gap-4 rounded-xl border border-border bg-surface-subtle p-5"
                data-testid="setup-progress"
              >
                <LoaderCircle
                  aria-hidden="true"
                  className="size-6 shrink-0 motion-safe:animate-spin"
                />
                <p className="text-[13px] leading-6 text-muted-foreground">
                  {snapshot.busy === "apply"
                    ? l(
                        "Applying the reviewed plan. Wait for the setup result.",
                        "Aplicando el plan revisado. Espera el resultado de la configuración.",
                      )
                    : l(
                        "The setup service reports that configuration is still in progress.",
                        "El servicio informa que la configuración sigue en curso.",
                      )}
                </p>
              </div>
              {!busy && (
                <Button
                  variant="outline"
                  className="min-h-11 justify-self-start"
                  data-testid="setup-reconcile"
                  onClick={() => void run(() => instance.reconcile())}
                >
                  <RefreshCw aria-hidden="true" />
                  {l("Check setup status", "Consultar configuración")}
                </Button>
              )}
            </>
          )}

          {(phase === "configured" ||
            phase === "failed" ||
            phase === "unknown") && (
            <>
              {phase !== "configured" && (
                <p className="text-[13px] leading-6 text-muted-foreground">
                  {l(
                    "Check the setup status to continue. The configuration will not be sent again.",
                    "Consulta el estado para continuar. La configuración no se enviará de nuevo.",
                  )}
                </p>
              )}
              {result && (
                <dl
                  aria-label={l(
                    "Setup checks",
                    "Comprobaciones de configuración",
                  )}
                  className="grid gap-3"
                  data-testid="setup-checks"
                >
                  {(
                    [
                      ["credentials", l("Credentials", "Credenciales")],
                      [
                        "webhooks",
                        l("Webhook configuration", "Configuración de webhooks"),
                      ],
                      [
                        "browser",
                        l("Browser connection", "Conexión del navegador"),
                      ],
                      [
                        "testCall",
                        l("Real test call", "Llamada real de prueba"),
                      ],
                    ] as const
                  ).map(([key, label]) => {
                    const check = result.checks[key];
                    return (
                      <div
                        key={key}
                        data-check={key}
                        data-check-state={check}
                        className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border p-4 text-[13px]"
                      >
                        <dt className="flex min-w-0 items-center gap-2">
                          {check === "passed" ? (
                            <Check
                              aria-hidden="true"
                              className="size-4 shrink-0 text-primary"
                            />
                          ) : check === "failed" ? (
                            <CircleAlert
                              aria-hidden="true"
                              className="size-4 shrink-0 text-destructive-foreground"
                            />
                          ) : (
                            <Clock3
                              aria-hidden="true"
                              className="size-4 shrink-0 text-muted-foreground"
                            />
                          )}
                          {label}
                        </dt>
                        <dd>
                          <Badge
                            variant={
                              check === "failed"
                                ? "destructive"
                                : check === "pending"
                                  ? "neutral"
                                  : "outline"
                            }
                          >
                            {check === "passed"
                              ? l("Passed", "Comprobado")
                              : check === "failed"
                                ? l("Failed", "Falló")
                                : l("Pending", "Pendiente")}
                          </Badge>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
              <p className="text-[13px] leading-6 text-muted-foreground">
                {demo
                  ? l(
                      "These results are local fixtures. Browser connection and a real test call have not been performed.",
                      "Estos resultados son fixtures locales. No se ha conectado el navegador ni realizado una llamada real de prueba.",
                    )
                  : l(
                      "Browser connection and a real test call remain pending. Opening the softphone does not place a call.",
                      "La conexión del navegador y una llamada real de prueba siguen pendientes. Abrir el softphone no realiza una llamada.",
                    )}
              </p>
              <div className="flex flex-wrap gap-3">
                {(phase !== "configured" ||
                  result?.checks.webhooks !== "passed") && (
                  <Button
                    variant="outline"
                    className="min-h-11"
                    loading={snapshot.busy === "status"}
                    disabled={busy}
                    data-testid="setup-reconcile"
                    onClick={() => void run(() => instance.reconcile())}
                  >
                    <RefreshCw aria-hidden="true" />
                    {l("Check setup status", "Consultar configuración")}
                  </Button>
                )}
                {phase === "configured" && onOpenSoftphone && (
                  <Button
                    className="min-h-11"
                    disabled={
                      busy ||
                      result?.checks.webhooks !== "passed" ||
                      !!result?.error
                    }
                    onClick={onOpenSoftphone}
                    data-testid="setup-open-softphone"
                  >
                    <Phone aria-hidden="true" />
                    {l("Open softphone", "Abrir softphone")}
                  </Button>
                )}
              </div>
            </>
          )}

          {busy && phase !== "configuring" && (
            <p
              role="status"
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <LoaderCircle
                aria-hidden="true"
                className="size-4 motion-safe:animate-spin"
              />
              {snapshot.busy === "inspect"
                ? l("Inspecting credentials…", "Inspeccionando credenciales…")
                : snapshot.busy === "plan"
                  ? l("Preparing the plan…", "Preparando el plan…")
                  : l("Checking setup status…", "Consultando configuración…")}
            </p>
          )}
        </Card>

        <Card
          className="grid min-w-0 gap-4 p-5 sm:p-6"
          data-testid="setup-summary"
        >
          <h3 className="text-[15px] leading-6 font-semibold">
            {l("Setup summary", "Resumen de configuración")}
          </h3>
          <dl className="grid min-w-0 gap-4 text-[13px]">
            <div className="grid gap-1">
              <dt className="text-muted-foreground">
                {l("Provider", "Proveedor")}
              </dt>
              <dd className="flex items-center gap-2 font-semibold">
                <CommunicationsProviderLogo
                  provider={snapshot.provider}
                  size="inline"
                />
                {providerName}
              </dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-muted-foreground">
                {l("Account", "Cuenta")}
              </dt>
              <dd className="wrap-break-word">
                {snapshot.inspection?.accountLabel ??
                  l("Not inspected", "Sin inspeccionar")}
              </dd>
            </div>
            <div className="grid gap-1">
              <dt className="text-muted-foreground">{l("Number", "Número")}</dt>
              <dd className="wrap-break-word">
                {chosenNumber?.phoneNumber ??
                  l("Not selected", "Sin seleccionar")}
              </dd>
            </div>
          </dl>
          <div className="border-t border-border pt-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold">
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
              {l("Existing numbers only", "Sólo números existentes")}
            </p>
            <p className="text-xs leading-6 text-muted-foreground">
              {l(
                "Setup does not purchase numbers or place calls. Inspection is read-only; configuration requires reviewing and confirming the plan.",
                "La configuración no compra números ni realiza llamadas. La inspección es de sólo lectura; configurar requiere revisar y confirmar el plan.",
              )}
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
