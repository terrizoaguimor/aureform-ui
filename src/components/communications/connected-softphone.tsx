"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CommunicationsSetup } from "@/components/blocks/communications-setup";
import { SoftphoneWorkspace } from "@/components/blocks/softphone-workspace";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import {
  CommunicationsError,
  type CommunicationsProvider,
} from "@/lib/communications/contracts";
import {
  createLiveCommunicationsAdapter,
  type BrowserVoiceClientFactory,
  type LiveCommunicationsAdapter,
} from "@/lib/communications/live-adapter";
import { createLiveCommunicationsSetupAdapter } from "@/lib/communications/setup-adapter";
import {
  communicationsSetupConfiguredSchema,
  type CommunicationsSetupAdapter,
  type CommunicationsSetupConfigured,
} from "@/lib/communications/setup-contracts";
import {
  createTelnyxBrowserVoiceClient,
  type TelnyxBrowserVoiceOptions,
} from "@/lib/communications/telnyx-browser";
import {
  createTwilioBrowserVoiceClient,
  type TwilioBrowserVoiceOptions,
} from "@/lib/communications/twilio-browser";

export type ConnectedTwilioSdkLoader = NonNullable<
  TwilioBrowserVoiceOptions["loadSdk"]
>;
export type ConnectedTelnyxSdkLoader = NonNullable<
  TelnyxBrowserVoiceOptions["loadSdk"]
>;

export type ConnectedSoftphoneLiveProps = {
  mode: "live";
  /** Approved voice API mount, ending in /v1/communications, without a query. */
  backendUrl: string;
  /**
   * Optional approved HTTPS setup mount, ending in /v1/communications/setup.
   * Defaults to backendUrl + "/setup". Approve both origins when separated.
   */
  setupBackendUrl?: string;
  provider: CommunicationsProvider;
  /**
   * Nonsecret authenticated principal/session identity. Keep it stable during
   * token renewal; change it on login, logout or an account/tenant change.
   */
  authSessionKey: string;
  getAuthHeaders: () => HeadersInit | Promise<HeadersInit>;
  trustedBackendOrigins: readonly string[];
  /** Optional controlled transport, shared by setup and voice requests. */
  fetch?: typeof fetch;
  /** Cookie mode is explicit and requires getAuthHeaders to supply CSRF. */
  authMode?: "bearer" | "cookie-csrf";
  /** Consumer-owned optional SDK loaders; configuring never invokes them. */
  twilioLoadSdk?: ConnectedTwilioSdkLoader;
  telnyxLoadSdk?: ConnectedTelnyxSdkLoader;
  /**
   * First public configured DTO selected by the app from authenticated
   * /setup/connections. Restore it without inspecting/applying credentials again.
   * Later values cannot replace this host's owned session.
   */
  initialConfiguration?: CommunicationsSetupConfigured;
  onConfigured?: (summary: CommunicationsSetupConfigured) => void;
  className?: string;
};

export type ConnectedSoftphoneProps =
  | {
      mode?: "demo";
      defaultProvider?: CommunicationsProvider;
      className?: string;
    }
  | ConnectedSoftphoneLiveProps;

type VoiceSession = {
  summary: CommunicationsSetupConfigured;
  adapter: LiveCommunicationsAdapter;
  hasLoader: boolean;
};
type ConfigurationError = "invalid" | "pending" | "different" | null;

/**
 * Demo is the inert default. Keep live props inside an authenticated Client
 * Component: callbacks and SDK loaders are not Server Component DTOs.
 *
 * The host owns one configured session. Registration remains the workspace's
 * explicit Connect session action; Answer is the microphone consent action.
 * Do not key this host by a route or locale if calls must survive those changes.
 */
export function ConnectedSoftphone(props: ConnectedSoftphoneProps) {
  if (props.mode !== "live") {
    return (
      <SoftphoneWorkspace
        defaultProvider={props.defaultProvider}
        className={props.className}
      />
    );
  }
  const identity = JSON.stringify([
    props.authSessionKey,
    props.provider,
    props.backendUrl,
    props.setupBackendUrl ?? `${props.backendUrl.replace(/\/+$/, "")}/setup`,
    props.authMode ?? "bearer",
    [...props.trustedBackendOrigins].sort(),
  ]);
  return <LiveConnectedSoftphone key={identity} {...props} />;
}

function LiveConnectedSoftphone(props: ConnectedSoftphoneLiveProps) {
  const { l } = useLanguage();
  const latest = useRef(props);
  const mounted = useRef(false);
  const lifetime = useRef<object | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const playbackEpoch = useRef(0);
  const ownedSetup = useRef<CommunicationsSetupAdapter | null>(null);
  const ownedVoice = useRef<VoiceSession | null>(null);
  const initialConfigurationUsed = useRef(false);
  const [setup, setSetup] = useState<CommunicationsSetupAdapter | null>(null);
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [configurationError, setConfigurationError] =
    useState<ConfigurationError>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const getAuthHeaders = useCallback(() => latest.current.getAuthHeaders(), []);
  const request = useCallback<typeof fetch>(
    (input, init) => (latest.current.fetch ?? globalThis.fetch)(input, init),
    [],
  );
  const [configuration] = useState(() => ({
    baseUrl:
      props.setupBackendUrl ?? `${props.backendUrl.replace(/\/+$/, "")}/setup`,
    provider: props.provider,
    trustedBackendOrigins: [...props.trustedBackendOrigins],
    authMode: props.authMode,
  }));

  // Rotating app tokens/callback identities do not recreate a registered SDK.
  useEffect(() => {
    latest.current = props;
  });

  const clearAudio = useCallback(() => {
    ++playbackEpoch.current;
    try {
      audio.current?.pause();
      if (audio.current) audio.current.srcObject = null;
    } catch {
      // Native teardown may already have removed the host media element.
    }
    if (mounted.current) setAudioBlocked(false);
  }, []);

  const tryPlayback = useCallback(() => {
    const element = audio.current;
    const stream = element?.srcObject;
    if (!mounted.current || !element || !stream) return;
    const epoch = ++playbackEpoch.current;
    const current = () =>
      mounted.current &&
      playbackEpoch.current === epoch &&
      element.srcObject === stream;
    try {
      void element.play().then(
        () => {
          if (current()) setAudioBlocked(false);
        },
        () => {
          if (current()) setAudioBlocked(true);
        },
      );
    } catch {
      if (current()) setAudioBlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!ownedSetup.current) {
      ownedSetup.current = createLiveCommunicationsSetupAdapter({
        ...configuration,
        getAuthHeaders,
        fetch: request,
      });
      setSetup(ownedSetup.current);
    }
    const token = {};
    lifetime.current = token;
    mounted.current = true;
    return () => {
      mounted.current = false;
      // React StrictMode replays setup before this microtask. A real unmount,
      // including a changed auth identity, releases the previously owned SDK.
      queueMicrotask(() => {
        if (lifetime.current !== token) return;
        const previous = ownedVoice.current;
        ownedVoice.current = null;
        if (previous) {
          // disconnect releases local media synchronously and attempts the
          // bounded backend reservation update; it does not claim PSTN ended.
          void previous.adapter.disconnect().catch(() => {});
          previous.adapter.dispose();
        }
        ownedSetup.current?.dispose();
        ownedSetup.current = null;
        clearAudio();
      });
    };
  }, [configuration, clearAudio, getAuthHeaders, request]);

  const onConfigured = useCallback(
    (input: unknown) => {
      if (!mounted.current) return;
      const parsed = communicationsSetupConfiguredSchema.safeParse(input);
      if (!parsed.success || parsed.data.provider !== props.provider) {
        setConfigurationError("invalid");
        return;
      }
      if (parsed.data.error || parsed.data.checks.webhooks !== "passed") {
        setConfigurationError("pending");
        return;
      }
      const previous = ownedVoice.current;
      if (previous) {
        if (
          previous.summary.connectionId === parsed.data.connectionId &&
          previous.summary.number.id === parsed.data.number.id &&
          previous.summary.number.phoneNumber === parsed.data.number.phoneNumber
        ) {
          setConfigurationError(null);
        } else {
          // A different configuration cannot replace an owned call/session.
          setConfigurationError("different");
        }
        return;
      }
      const summary: CommunicationsSetupConfigured = Object.freeze({
        ...parsed.data,
        number: Object.freeze({ ...parsed.data.number }),
        checks: Object.freeze({ ...parsed.data.checks }),
      });
      const options = latest.current;
      const twilioLoader = options.twilioLoadSdk;
      const telnyxLoader = options.telnyxLoadSdk;
      const hasLoader =
        props.provider === "twilio" ? !!twilioLoader : !!telnyxLoader;
      let factory: BrowserVoiceClientFactory | undefined;
      if (props.provider === "twilio" && twilioLoader) {
        factory = () =>
          createTwilioBrowserVoiceClient({ loadSdk: twilioLoader });
      } else if (props.provider === "telnyx" && telnyxLoader) {
        factory = () => {
          const element = audio.current;
          if (!element)
            throw new CommunicationsError(
              "disconnected",
              "Call audio is unavailable.",
            );
          const native = createTelnyxBrowserVoiceClient({
            loadSdk: telnyxLoader,
            remoteElement: element,
          });
          let audibleCallId: string | null = null;
          const off = native.subscribe((event) => {
            if (!mounted.current || event.type !== "call") return;
            if (
              event.call.state === "active" ||
              event.call.state === "connecting" ||
              event.call.state === "held" ||
              event.call.state === "reconnecting"
            )
              audibleCallId = event.call.nativeCallId;
            if (
              event.call.state === "ended" &&
              (!audibleCallId || audibleCallId === event.call.nativeCallId)
            ) {
              audibleCallId = null;
              clearAudio();
            }
          });
          return {
            ...native,
            dispose() {
              off();
              clearAudio();
              return native.dispose();
            },
          };
        };
      }
      try {
        const adapter = createLiveCommunicationsAdapter({
          provider: props.provider,
          baseUrl: options.backendUrl,
          trustedBackendOrigins: options.trustedBackendOrigins,
          voiceClientFactory: factory,
          getAuthHeaders,
          fetch: (input, init) =>
            request(input, {
              ...init,
              ...(options.authMode === "cookie-csrf"
                ? { credentials: "include" as const }
                : { credentials: "omit" as const }),
            }),
        });
        const owned = { summary, adapter, hasLoader };
        ownedVoice.current = owned;
        setSession(owned);
        setConfigurationError(null);
      } catch {
        setConfigurationError("invalid");
        return;
      }
      try {
        void Promise.resolve(options.onConfigured?.(summary)).catch(() => {});
      } catch {
        // The application's callback cannot undo a validated configuration.
      }
    },
    [props.provider, clearAudio, getAuthHeaders, request],
  );

  useEffect(() => {
    if (
      props.initialConfiguration === undefined ||
      initialConfigurationUsed.current
    )
      return;
    initialConfigurationUsed.current = true;
    onConfigured(props.initialConfiguration);
  }, [props.initialConfiguration, onConfigured]);

  useEffect(() => {
    if (!session) return;
    let previous = session.adapter.getSnapshot();
    return session.adapter.subscribe(() => {
      const next = session.adapter.getSnapshot();
      if (
        (previous.activeCall && !next.activeCall) ||
        (previous.connection !== "disconnected" &&
          next.connection === "disconnected")
      )
        clearAudio();
      previous = next;
    });
  }, [session, clearAudio]);

  const errorCopy =
    configurationError === "pending"
      ? l(
          "Number configuration is not confirmed. Check its setup status before connecting.",
          "La configuración del número no está confirmada. Revisa su estado antes de conectar.",
        )
      : configurationError === "different"
        ? l(
            "This session already owns a configured number. End and close it before changing configuration.",
            "Esta sesión ya tiene un número configurado. Finalízala y ciérrala antes de cambiar la configuración.",
          )
        : l(
            "The configured connection could not be validated.",
            "No se pudo validar la conexión configurada.",
          );

  return (
    <div className={props.className} data-testid="connected-softphone">
      {props.provider === "telnyx" && (
        <audio
          ref={audio}
          autoPlay
          playsInline
          aria-hidden="true"
          className="sr-only"
          data-testid="connected-softphone-audio"
          onLoadedMetadata={tryPlayback}
          onCanPlay={tryPlayback}
          onPlay={() => {
            if (mounted.current && audio.current?.srcObject)
              setAudioBlocked(false);
          }}
          onEmptied={() => {
            ++playbackEpoch.current;
            if (mounted.current) setAudioBlocked(false);
          }}
          onError={() => {
            if (mounted.current && audio.current?.srcObject)
              setAudioBlocked(true);
          }}
        />
      )}
      {configurationError && (
        <p
          role="alert"
          className="mb-4 text-sm text-destructive"
          data-testid="connected-softphone-error"
        >
          {errorCopy}
        </p>
      )}
      {session ? (
        <>
          <div
            className="mb-4 rounded-xl border border-border bg-surface p-4 text-sm"
            data-testid="connected-softphone-configured"
          >
            <p className="font-semibold text-foreground">
              {l("Number configured", "Número configurado")}:{" "}
              {session.summary.number.phoneNumber}
            </p>
            <p className="mt-1 text-muted-foreground">
              {l(
                "Browser connection is a separate step. A real test call has not been verified.",
                "La conexión del navegador es un paso separado. No se ha verificado una llamada real de prueba.",
              )}
            </p>
            {!session.hasLoader && (
              <p className="mt-2 text-muted-foreground">
                {l(
                  "Browser calling is not available in this application.",
                  "Las llamadas desde el navegador no están disponibles en esta aplicación.",
                )}
              </p>
            )}
          </div>
          {audioBlocked && (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm"
            >
              <span>
                {l(
                  "Call audio is blocked. Enable sound to hear the caller.",
                  "El audio de la llamada está bloqueado. Activa el sonido para escuchar.",
                )}
              </span>
              <Button
                variant="outline"
                className="min-h-11"
                data-testid="connected-softphone-enable-audio"
                onClick={tryPlayback}
              >
                {l("Enable call audio", "Activar audio de llamada")}
              </Button>
            </div>
          )}
          <SoftphoneWorkspace adapter={session.adapter} />
        </>
      ) : setup ? (
        <CommunicationsSetup
          adapter={setup}
          defaultProvider={props.provider}
          fixedProvider
          authSessionKey={props.authSessionKey}
          onConfigured={onConfigured}
        />
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          {l("Preparing connection…", "Preparando conexión…")}
        </p>
      )}
    </div>
  );
}
