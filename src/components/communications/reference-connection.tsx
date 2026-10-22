"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { KeyRound, LoaderCircle, Phone, ShieldCheck } from "lucide-react";
import { ConnectedSoftphone } from "./connected-softphone";
import { CommunicationsProviderLogo } from "./provider-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import type { CommunicationsProvider } from "@/lib/communications/contracts";
import type { CommunicationsSetupConfigured } from "@/lib/communications/setup-contracts";
import {
  ReferenceLabError,
  referenceBackendUrl,
  referenceLabConnections,
  referenceLabLogin,
  referenceLabRequest,
  referenceTestPermissionSchema,
  type ReferenceTestPermission,
} from "@/lib/communications/reference-lab";

/** SDKs load only after an explicitly requested live browser connection. */
const twilioLoadSdk = () => import("@twilio/voice-sdk");
const telnyxLoadSdk = () => import("@telnyx/webrtc");

/** Optional private reference host. The public site supplies no backend URL. */
export function ReferenceConnection({ backendUrl }: { backendUrl: string }) {
  const { l } = useLanguage();
  const token = useRef<string | null>(null);
  const running = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const [identity, setIdentity] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [renewing, setRenewing] = useState(false);
  const [pending, setPending] = useState(false);
  const [provider, setProvider] = useState<CommunicationsProvider>("twilio");
  const [configured, setConfigured] =
    useState<CommunicationsSetupConfigured | null>(null);
  const [initialConfiguration, setInitialConfiguration] = useState<
    CommunicationsSetupConfigured | undefined
  >(undefined);
  const [callerNumber, setCallerNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [permission, setPermission] = useState<ReferenceTestPermission | null>(
    null,
  );
  const [error, setError] = useState<ReferenceLabError["code"] | null>(null);
  let approvedOrigin: string | undefined;
  try {
    approvedOrigin = referenceBackendUrl(backendUrl).origin;
  } catch {
    // Invalid public configuration never receives application authentication.
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      running.current?.abort();
      token.current = null;
      busy.current = false;
    };
  }, []);
  useEffect(() => {
    if (!permission) return;
    const expires = setTimeout(
      () => {
        setPermission(null);
        setConsent(false);
      },
      Math.max(0, Date.parse(permission.expiresAt) - Date.now()),
    );
    return () => clearTimeout(expires);
  }, [permission]);
  const getAuthHeaders = useCallback((): HeadersInit => {
    if (!token.current) throw new ReferenceLabError("authentication-required");
    return { Authorization: `Bearer ${token.current}` };
  }, []);

  async function action(work: (signal: AbortSignal) => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    running.current = controller;
    setPending(true);
    setError(null);
    try {
      await work(controller.signal);
    } catch (failure) {
      if (mounted.current && !controller.signal.aborted)
        setError(
          failure instanceof ReferenceLabError
            ? failure.code
            : "request-failed",
        );
      else if (mounted.current) setError("request-failed");
    } finally {
      clearTimeout(timeout);
      if (running.current === controller) {
        running.current = null;
        busy.current = false;
        if (mounted.current) setPending(false);
      }
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action(async (signal) => {
      const value = await referenceLabLogin(backendUrl, accessCode, { signal });
      const connections = await referenceLabConnections(
        backendUrl,
        value.sessionToken,
        { signal },
      );
      if (!mounted.current || signal.aborted) return;
      token.current = value.sessionToken;
      setAccessCode("");
      if (!identity) {
        const previous = connections.find((item) => item.provider === provider);
        setInitialConfiguration(previous);
        setConfigured(previous ?? null);
      }
      // Renewal keeps the owned SDK/session mounted, including an active call.
      setIdentity((previous) => previous ?? crypto.randomUUID());
      setRenewing(false);
    });
  }
  async function authorize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured || !consent || !/^\+[1-9]\d{6,14}$/.test(callerNumber))
      return;
    await action(async (signal) => {
      const value = referenceTestPermissionSchema.safeParse(
        await referenceLabRequest(
          backendUrl,
          "authorize-test",
          {
            connectionId: configured.connectionId,
            callerNumber,
            seconds: 120,
            confirmation: true,
          },
          { token: token.current ?? undefined, signal },
        ),
      );
      if (
        !value.success ||
        value.data.provider !== configured.provider ||
        value.data.phoneNumber !== configured.number.phoneNumber ||
        value.data.callerNumber !== callerNumber ||
        Date.parse(value.data.expiresAt) <= Date.now()
      )
        throw new ReferenceLabError("request-failed");
      if (mounted.current && !signal.aborted) setPermission(value.data);
    });
  }
  const errorText =
    error === "authentication-required"
      ? l(
          "Sign in again to continue configuring or authorizing a test.",
          "Vuelve a iniciar sesión para configurar o autorizar una prueba.",
        )
      : error === "agent-not-ready"
        ? l(
            "Connect the browser session and set your presence to Available first.",
            "Conecta la sesión del navegador y cambia tu presencia a Disponible primero.",
          )
        : error === "test-pending"
          ? l(
              "A test is already authorized or a call is active. Wait until it finishes or expires.",
              "Ya hay una prueba autorizada o una llamada activa. Espera a que termine o caduque.",
            )
          : l(
              "The request could not be confirmed. Check the private backend before trying again.",
              "No se pudo confirmar la solicitud. Revisa el backend privado antes de reintentar.",
            );

  return (
    <section className="grid gap-5" data-testid="communications-reference">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-surface to-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="outline">
              <ShieldCheck aria-hidden="true" className="mr-1.5 size-3.5" />
              {l("Private call laboratory", "Laboratorio privado de llamadas")}
            </Badge>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">
              {l("Connect your phone line", "Conecta tu línea telefónica")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {l(
                "Use the owner access code to open this private backend. Then enter only your provider's two credentials and choose an existing voice number.",
                "Abre este backend privado con el código de acceso del propietario. Después introduce únicamente las dos credenciales del proveedor y elige un número de voz existente.",
              )}
            </p>
          </div>
          {identity && (
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => setRenewing((value) => !value)}
              disabled={pending}
            >
              <KeyRound aria-hidden="true" className="size-4" />
              {l("Renew owner access", "Renovar acceso del propietario")}
            </Button>
          )}
        </div>
        {!approvedOrigin ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {l(
              "Configure an approved HTTPS backend URL before signing in.",
              "Configura una URL HTTPS aprobada para el backend antes de iniciar sesión.",
            )}
          </p>
        ) : (
          <>
            {(!identity || renewing) && (
              <form onSubmit={login} className="mt-5 grid gap-4 sm:max-w-lg">
                <Field
                  label={l(
                    "Owner access code",
                    "Código de acceso del propietario",
                  )}
                  description={l(
                    "Application authentication. Find it in ~/.config/aureform-communications/access-code.txt after setup:init.",
                    "Autenticación de la aplicación. Está en ~/.config/aureform-communications/access-code.txt después de setup:init.",
                  )}
                >
                  <Input
                    type="password"
                    autoComplete="off"
                    value={accessCode}
                    onChange={(event) => setAccessCode(event.target.value)}
                    minLength={32}
                    maxLength={256}
                    required
                    spellCheck={false}
                    disabled={pending}
                  />
                </Field>
                <Button type="submit" className="min-h-11" disabled={pending}>
                  {pending ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <KeyRound aria-hidden="true" className="size-4" />
                  )}
                  {l("Open private setup", "Abrir configuración privada")}
                </Button>
              </form>
            )}
            {!identity && (
              <div
                className="mt-5 flex flex-wrap gap-3"
                role="group"
                aria-label={l("Call provider", "Proveedor de llamadas")}
              >
                {(["twilio", "telnyx"] as const).map((name) => (
                  <Button
                    key={name}
                    variant={provider === name ? "default" : "outline"}
                    className="min-h-11"
                    aria-pressed={provider === name}
                    onClick={() => setProvider(name)}
                    disabled={pending}
                  >
                    <CommunicationsProviderLogo
                      provider={name}
                      className="size-5"
                    />
                    {name === "twilio" ? "Twilio" : "Telnyx"}
                  </Button>
                ))}
              </div>
            )}
          </>
        )}
        {error && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {errorText}
          </p>
        )}
      </Card>
      {identity && approvedOrigin && (
        <ConnectedSoftphone
          mode="live"
          backendUrl={backendUrl}
          provider={provider}
          authSessionKey={identity}
          getAuthHeaders={getAuthHeaders}
          trustedBackendOrigins={[approvedOrigin]}
          twilioLoadSdk={twilioLoadSdk}
          telnyxLoadSdk={telnyxLoadSdk}
          onConfigured={setConfigured}
          initialConfiguration={initialConfiguration}
        />
      )}
      {configured && (
        <Card
          className="p-5 sm:p-6"
          data-testid="communications-test-permission"
        >
          <h3 className="flex items-center gap-2 font-semibold">
            <Phone aria-hidden="true" className="size-4 text-primary" />
            {l("Authorize one incoming test", "Autoriza una prueba entrante")}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {l(
              "Connect the browser and select Available. Only the exact caller below may then reach this number, once, within five minutes, for at most two minutes. Your carrier's call and number charges apply.",
              "Conecta el navegador y selecciona Disponible. Solo el teléfono indicado podrá llegar a este número, una vez, durante los próximos cinco minutos y por un máximo de dos minutos. Se aplican los cargos de llamadas y numeración de tu proveedor.",
            )}
          </p>
          <form onSubmit={authorize} className="mt-5 grid max-w-xl gap-4">
            <Field
              label={l(
                "Your calling phone number",
                "El teléfono desde el que llamarás",
              )}
              description={l(
                "International format, for example +573001234567.",
                "Formato internacional, por ejemplo +573001234567.",
              )}
            >
              <Input
                type="tel"
                value={callerNumber}
                onChange={(event) => {
                  setCallerNumber(event.target.value);
                  setConsent(false);
                }}
                pattern={"\\+[1-9][0-9]{6,14}"}
                required
                disabled={pending || !!permission}
              />
            </Field>
            <label className="flex items-start gap-3 text-sm leading-relaxed">
              <Checkbox
                checked={consent}
                onCheckedChange={(value) => setConsent(value === true)}
                disabled={pending || !!permission}
              />
              {l(
                "I authorize this one bounded test and the associated carrier charges.",
                "Autorizo esta única prueba limitada y los cargos del proveedor asociados.",
              )}
            </label>
            <Button
              type="submit"
              className="min-h-11"
              disabled={pending || !consent || !!permission}
            >
              {pending && (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              )}
              {l("Authorize test call", "Autorizar llamada de prueba")}
            </Button>
          </form>
          {permission && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"
            >
              <p className="font-semibold">
                {l("Now call", "Ahora llama al")} {permission.phoneNumber}
              </p>
              <p className="mt-2 text-muted-foreground">
                {l("From", "Desde")} {permission.callerNumber}
                {" · "}
                {l("Authorization expires", "La autorización caduca")}{" "}
                <time dateTime={permission.expiresAt}>
                  {new Intl.DateTimeFormat(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(permission.expiresAt))}
                </time>
                .
              </p>
              <p className="mt-2 text-muted-foreground">
                {l(
                  "No call has been placed by Aureform. Verify ringing, two-way audio and termination with your phone.",
                  "Aureform no ha iniciado ninguna llamada. Comprueba el timbrado, el audio en ambos sentidos y la finalización con tu teléfono.",
                )}
              </p>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}
