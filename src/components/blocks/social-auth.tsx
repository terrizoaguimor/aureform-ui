"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import {
  createDemoAuthAdapter,
  createProviderSignInRunner,
  DemoAuthError,
  SOCIAL_AUTH_PROVIDERS,
  type AuthAdapter,
  type AuthIntent,
  type ProviderSignInHandler,
  type ProviderSignInResult,
  type SocialAuthProvider,
} from "@/lib/demo-auth";

export const socialProviderNames: Record<SocialAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
  microsoft: "Microsoft",
};

/** Inline provider marks; no external assets, SDKs or provider requests. */
export function SocialProviderLogo({
  provider,
}: {
  provider: SocialAuthProvider;
}) {
  return (
    <svg
      role="img"
      aria-label={socialProviderNames[provider]}
      focusable="false"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
    >
      {provider === "google" ? (
        <>
          <path
            fill="#4285F4"
            d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.36Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.6 0-4.8-1.75-5.59-4.1H3.07v2.59A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.41 13.95A6 6 0 0 1 6.1 12c0-.68.12-1.34.31-1.95V7.46H3.07A10 10 0 0 0 2 12c0 1.62.39 3.15 1.07 4.54l3.34-2.59Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.95c1.47 0 2.79.51 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.46l3.34 2.59c.79-2.35 2.99-4.1 5.59-4.1Z"
          />
        </>
      ) : provider === "github" ? (
        <path
          fill="currentColor"
          d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z"
        />
      ) : (
        <>
          <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
          <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
          <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
          <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
        </>
      )}
    </svg>
  );
}

export interface SocialAuthProps {
  intent?: AuthIntent;
  consent?: boolean;
  disabled?: boolean;
  authAdapter?: AuthAdapter;
  /** Overrides authAdapter. The default adapter is entirely local and mock. */
  onProviderSignIn?: ProviderSignInHandler;
  /** False requires a provider handler; missing connectivity disables the buttons. */
  demo?: boolean;
  onConsentRequired?: () => void;
  onComplete?: (result: ProviderSignInResult) => void;
  /** Explicit continuation only; this component never opens an OAuth URL. */
  onContinue?: (result: ProviderSignInResult) => void;
  continueLabel?: string;
  className?: string;
}

type SocialAuthState =
  | { phase: "idle" }
  | { phase: "busy"; provider: SocialAuthProvider }
  | { phase: "error"; provider: SocialAuthProvider; consentRequired: boolean }
  | {
      phase: "complete";
      provider: SocialAuthProvider;
      result: ProviderSignInResult;
    };

export function SocialAuth({
  intent = "sign-in",
  consent = false,
  disabled = false,
  authAdapter,
  onProviderSignIn,
  demo = !authAdapter && !onProviderSignIn,
  onConsentRequired,
  onComplete,
  onContinue,
  continueLabel,
  className,
}: SocialAuthProps) {
  const { l } = useLanguage();
  const headingId = useId();
  const disclosureId = useId();
  const defaultAdapter = useMemo(() => createDemoAuthAdapter(), []);
  const unconfigured = !demo && !authAdapter && !onProviderSignIn;
  const runner = useMemo(() => createProviderSignInRunner(), []);
  const pendingRequest = useRef<AbortController | null>(null);
  const [state, setState] = useState<SocialAuthState>({ phase: "idle" });
  const handler: ProviderSignInHandler =
    onProviderSignIn ??
    ((request) => (authAdapter ?? defaultAdapter).signInWithProvider(request));

  useEffect(() => {
    return () => {
      pendingRequest.current?.abort();
    };
  }, []);

  async function signIn(provider: SocialAuthProvider) {
    if (
      disabled ||
      unconfigured ||
      runner.pending ||
      state.phase === "complete"
    )
      return;
    const controller = new AbortController();
    pendingRequest.current = controller;
    setState({ phase: "busy", provider });
    try {
      const result = await runner.signIn(
        { provider, intent, consent, signal: controller.signal },
        handler,
      );
      if (!result || controller.signal.aborted) return;
      setState({ phase: "complete", provider, result });
      onComplete?.(result);
    } catch (error) {
      if (controller.signal.aborted) return;
      const consentRequired =
        error instanceof DemoAuthError && error.code === "consent-required";
      setState({ phase: "error", provider, consentRequired });
      if (consentRequired) onConsentRequired?.();
    } finally {
      if (pendingRequest.current === controller) pendingRequest.current = null;
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-describedby={disclosureId}
      aria-busy={state.phase === "busy"}
      className={cn(
        "mt-7 rounded-2xl border border-border bg-background/65 p-3.5 shadow-[0_14px_40px_-30px_var(--primary)] sm:p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-xs font-semibold">
          {l("Continue with a provider", "Continuar con un proveedor")}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
          <FlaskConical className="size-3" aria-hidden="true" />
          {unconfigured
            ? l("Not configured", "Sin configurar")
            : demo
              ? l("Demo", "Demo")
              : l("Adapter", "Adaptador")}
        </span>
      </div>
      <p
        id={disclosureId}
        className="mb-4 text-xs leading-5 text-muted-foreground"
      >
        {unconfigured
          ? l(
              "Configure a provider handler to enable social sign-in. No provider account or local demo session is created.",
              "Configura un handler de proveedor para habilitar el acceso social. No se crea ninguna cuenta del proveedor ni sesión local de demostración.",
            )
          : demo
            ? l(
                "Local preview. No connection to your provider account.",
                "Vista previa local. No se conecta con tu cuenta del proveedor.",
              )
            : l(
                "Your app handles provider requests and any server session.",
                "Tu aplicación gestiona al proveedor y la sesión del servidor.",
              )}
      </p>
      {state.phase === "complete" ? (
        <div className="grid gap-3">
          <Alert
            variant="success"
            title={
              state.result.kind === "demo"
                ? l(
                    `${socialProviderNames[state.provider]} demo ready`,
                    `Demo de ${socialProviderNames[state.provider]} lista`,
                  )
                : l(
                    "Provider callback complete",
                    "Callback del proveedor listo",
                  )
            }
          >
            {state.result.kind === "demo"
              ? state.result.persistence === "memory"
                ? l(
                    "Browser storage is unavailable. You can continue; this preview will not persist after leaving.",
                    "El almacenamiento del navegador no está disponible. Puedes continuar; la vista previa no se guardará al salir.",
                  )
                : l(
                    "Only a local demo profile was saved. No real provider session was created.",
                    "Solo se guardó un perfil de demostración local. No se creó una sesión real con el proveedor.",
                  )
              : l(
                  "Your application controls the next step. This UI does not verify authentication.",
                  "Tu aplicación controla el siguiente paso. Esta interfaz no verifica la autenticación.",
                )}
          </Alert>
          {state.result.kind === "demo" && onContinue && (
            <Button
              type="button"
              className="min-h-11 w-full"
              onClick={() => onContinue(state.result)}
            >
              <Check className="size-4" aria-hidden="true" />
              {continueLabel ??
                l("Continue to workspace", "Continuar al espacio")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {SOCIAL_AUTH_PROVIDERS.map((provider) => {
            const loading =
              state.phase === "busy" && state.provider === provider;
            const label = l(
              `Continue with ${socialProviderNames[provider]}`,
              `Continuar con ${socialProviderNames[provider]}`,
            );
            return (
              <Button
                key={provider}
                type="button"
                variant="outline"
                loading={loading}
                disabled={disabled || unconfigured || state.phase === "busy"}
                aria-label={label}
                aria-describedby={disclosureId}
                onClick={() => void signIn(provider)}
                className="group min-h-12 w-full justify-start gap-3 border-border/85 px-3 text-sm hover:border-primary/45 hover:shadow-[0_8px_24px_-16px_var(--primary)] motion-safe:hover:-translate-y-0.5"
                style={{
                  backgroundImage:
                    "linear-gradient(115deg, color-mix(in srgb, var(--primary) 5%, var(--surface)), var(--surface) 78%)",
                }}
              >
                {!loading && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-background text-foreground">
                    <SocialProviderLogo provider={provider} />
                  </span>
                )}
                <span className="min-w-0 flex-1 text-left">
                  {loading
                    ? l(
                        `Preparing ${socialProviderNames[provider]}…`,
                        `Preparando ${socialProviderNames[provider]}…`,
                      )
                    : label}
                </span>
                <ArrowRight
                  className="size-3.5 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Button>
            );
          })}
          {state.phase === "busy" && (
            <p role="status" className="text-xs text-muted-foreground">
              {demo
                ? l(
                    "Preparing a local demo profile…",
                    "Preparando un perfil local de demostración…",
                  )
                : l("Waiting for your adapter…", "Esperando al adaptador…")}
            </p>
          )}
          {state.phase === "error" && (
            <Alert
              variant="destructive"
              title={l("Could not continue", "No se pudo continuar")}
            >
              <p>
                {state.consentRequired
                  ? l(
                      demo
                        ? "Accept the demo terms, then try again."
                        : "Accept the account terms, then try again.",
                      demo
                        ? "Acepta los términos de demostración e inténtalo de nuevo."
                        : "Acepta los términos de la cuenta e inténtalo de nuevo.",
                    )
                  : l(
                      "The provider flow did not finish. Please try again.",
                      "El flujo del proveedor no se completó. Inténtalo de nuevo.",
                    )}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="mt-2 h-auto min-h-9 px-2 text-destructive-foreground"
                onClick={() => void signIn(state.provider)}
              >
                {l("Try again", "Intentar de nuevo")}
              </Button>
            </Alert>
          )}
        </div>
      )}
    </section>
  );
}
