"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Sparkles,
  SlidersHorizontal,
  Activity,
  Check,
  Layers,
} from "lucide-react";
import { Brand, AureformMark } from "@/components/brand";
import { SocialAuth } from "@/components/blocks/social-auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP } from "@/components/ui/input-otp";
import { Field } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { useLanguage } from "@/hooks/use-language";
import { useAppearance } from "@/components/appearance-provider";
import { GlowBorder, ShaderBackground } from "@/components/effects";
import { revenueData } from "@/demo/dashboard-data";
import {
  createDemoAuthAdapter,
  createDemoAuthSession,
  DemoAuthError,
  persistDemoAuthSession,
  waitForDemoAuth,
  type AuthAdapter,
  type ProviderSignInHandler,
} from "@/lib/demo-auth";
import {
  authWorkflowErrorMessage,
  runAuthWorkflow,
  type AuthCompletionResult,
  type AuthFlowResult,
  type AuthRedirectPolicy,
  type AuthWorkflowAdapter,
  type AuthWorkflowScope,
} from "@/lib/auth-integration";
import { toast } from "sonner";
export type AuthMode = "sign-in" | "sign-up" | "reset-password" | "verify";

export interface AuthTemplateProps {
  mode: AuthMode;
  /** Optional client-side integration. All built-in routes use the mock adapter. */
  authAdapter?: AuthAdapter;
  /**
   * Overrides authAdapter for social access only. Inject from a Client Component;
   * the consumer owns OAuth, server sessions and redirects.
   */
  onProviderSignIn?: ProviderSignInHandler;
  /** Separate from social callbacks and local demo persistence. */
  workflowAdapter?: AuthWorkflowAdapter;
  /** Opaque backend challenge reference, not a session/bearer token. */
  verification?: { challengeId: string; email: string; codeLength?: 6 | 8 };
  /** Explicit email-link confirmation. Never read from or written to storage. */
  verificationToken?: string;
  /** Enables the password-confirmation form in reset-password mode. Memory only. */
  resetToken?: string;
  /** Required for any redirect returned by a plain consumer adapter. */
  redirectPolicy?: AuthRedirectPolicy;
  /** Receives only validated results; your backend still owns authorization. */
  onWorkflowComplete?: (result: AuthCompletionResult) => void;
  consentLabel?: string;
}

export function AuthTemplate(props: AuthTemplateProps) {
  // Next Link can retain this component between auth routes; reset each screen.
  return (
    <AuthScreen
      key={`${props.mode}:${props.workflowAdapter?.providerId ?? "local"}:${props.verification?.challengeId ?? ""}:${!!props.resetToken}:${!!props.verificationToken}`}
      {...props}
    />
  );
}

function AuthScreen({
  mode,
  authAdapter,
  onProviderSignIn,
  workflowAdapter,
  verification,
  verificationToken,
  resetToken,
  redirectPolicy,
  onWorkflowComplete,
  consentLabel,
}: AuthTemplateProps) {
  const { locale, l, currency } = useLanguage(),
    router = useRouter();
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
  const [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [complete, setComplete] = useState(false),
    [providerComplete, setProviderComplete] = useState(false),
    [requestError, setRequestError] = useState(""),
    [otp, setOtp] = useState(""),
    [otpError, setOtpError] = useState(""),
    [consent, setConsent] = useState(false),
    [consentError, setConsentError] = useState("");
  const [challenge, setChallenge] = useState<Extract<
    AuthFlowResult,
    { kind: "verification-required" | "mfa-required" }
  > | null>(null);
  const [workflowResult, setWorkflowResult] =
    useState<AuthCompletionResult | null>(null);
  const [verificationEmail, setVerificationEmail] = useState(
    verification?.email ?? "",
  );
  const [recoveryCode, setRecoveryCode] = useState(false);
  const [requestKind, setRequestKind] = useState<"email" | "provider" | null>(
    null,
  );
  const connected = workflowAdapter?.mode === "consumer";
  const resetConfirmation = mode === "reset-password" && !!resetToken;
  const activeChallenge =
    challenge ??
    (verification
      ? { kind: "verification-required" as const, ...verification }
      : null);
  const verifying = mode === "verify" || !!activeChallenge;
  const hasSocialHandler = !!authAdapter || !!onProviderSignIn;
  const requestPending = useRef(false);
  const mounted = useRef(true);
  const emailRequest = useRef<AbortController | null>(null);
  const consentControl = useRef<HTMLButtonElement | null>(null);
  const defaultAuthAdapter = useMemo(() => createDemoAuthAdapter(), []);
  const signInWithProvider: ProviderSignInHandler =
    onProviderSignIn ??
    ((request) => {
      if (authAdapter) return authAdapter.signInWithProvider(request);
      if (connected) throw new DemoAuthError("invalid-request");
      return defaultAuthAdapter.signInWithProvider(request);
    });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      emailRequest.current?.abort();
    };
  }, [workflowAdapter, resetToken, verificationToken]);

  function requireConsent() {
    if (mode !== "sign-up" || consent) return true;
    setConsentError(
      l(
        connected
          ? "Accept the account terms to continue."
          : "Accept the demo terms to continue.",
        connected
          ? "Acepta los términos de la cuenta para continuar."
          : "Acepta los términos de demostración para continuar.",
      ),
    );
    consentControl.current?.focus();
    return false;
  }

  const handleProviderSignIn: ProviderSignInHandler = async (request) => {
    if (requestPending.current) throw new DemoAuthError("busy");
    requestPending.current = true;
    setRequestKind("provider");
    setBusy(true);
    setRequestError("");
    try {
      return await signInWithProvider(request);
    } finally {
      requestPending.current = false;
      if (mounted.current) {
        setBusy(false);
        setRequestKind(null);
      }
    }
  };

  function continueEmailDemo(
    provider: "email" | "otp",
    identity?: {
      email: string;
      name?: string;
    },
  ) {
    const persistence = persistDemoAuthSession(
      createDemoAuthSession(provider, identity),
    );
    form.resetField("password");
    toast.success(
      l("Demo sign-in complete", "Sesión de demostración iniciada"),
      {
        description:
          persistence === "memory"
            ? l(
                "Browser storage is unavailable. This demo profile will not persist.",
                "El almacenamiento no está disponible. El perfil de demostración no se guardará.",
              )
            : undefined,
      },
    );
    router.push(
      `/${locale}/${mode === "sign-up" ? "onboarding" : "dashboard"}/`,
    );
  }

  function showRequestError() {
    setRequestError(
      l(
        "The demo could not finish. Please try again.",
        "La demostración no se pudo completar. Inténtalo de nuevo.",
      ),
    );
  }

  function completeWorkflow(result: AuthCompletionResult) {
    form.resetField("password");
    form.resetField("passwordConfirmation");
    setOtp("");
    setOtpError("");
    setRecoveryCode(
      result.kind === "mfa-required" && !result.factors.includes("totp"),
    );
    if (
      result.kind === "verification-required" ||
      result.kind === "mfa-required"
    ) {
      setChallenge(result);
      if (result.kind === "verification-required")
        setVerificationEmail(result.email);
      setComplete(false);
      setWorkflowResult(null);
    } else {
      setChallenge(null);
      setWorkflowResult(result);
      setComplete(true);
    }
    onWorkflowComplete?.(result);
  }

  async function requestWorkflow(
    action: (scope: AuthWorkflowScope) => Promise<AuthCompletionResult>,
  ) {
    if (requestPending.current || !workflowAdapter) return;
    requestPending.current = true;
    setRequestKind("email");
    const controller = new AbortController();
    emailRequest.current = controller;
    setBusy(true);
    setRequestError("");
    try {
      const result = await action({ signal: controller.signal });
      if (mounted.current && !controller.signal.aborted)
        completeWorkflow(result);
    } catch (error) {
      if (mounted.current && !controller.signal.aborted) {
        setRequestError(authWorkflowErrorMessage(error, locale));
      }
    } finally {
      if (emailRequest.current === controller) {
        requestPending.current = false;
        emailRequest.current = null;
        if (mounted.current) {
          form.resetField("password");
          form.resetField("passwordConfirmation");
          setBusy(false);
          setRequestKind(null);
        }
      }
    }
  }

  const schema = z
    .object({
      name:
        mode === "sign-up"
          ? z
              .string()
              .trim()
              .min(2, l("Enter your name.", "Escribe tu nombre."))
              .max(
                160,
                l("Use at most 160 characters.", "Usa máximo 160 caracteres."),
              )
          : z.string().optional(),
      email: resetConfirmation
        ? z.string().optional()
        : z
            .string()
            .trim()
            .max(
              254,
              l("Use at most 254 characters.", "Usa máximo 254 caracteres."),
            )
            .pipe(
              z.email(l("Enter a valid email.", "Escribe un correo válido.")),
            ),
      password:
        mode === "sign-in" || mode === "sign-up" || resetConfirmation
          ? z
              .string()
              .min(
                mode === "sign-in" && connected ? 1 : 8,
                mode === "sign-in" && connected
                  ? l("Enter your password.", "Escribe tu contraseña.")
                  : l(
                      "Use at least 8 characters.",
                      "Usa al menos 8 caracteres.",
                    ),
              )
              .max(1024)
          : z.string().optional(),
      passwordConfirmation: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      if (
        resetConfirmation &&
        values.password !== values.passwordConfirmation
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["passwordConfirmation"],
          message: l(
            "Passwords must match.",
            "Las contraseñas deben coincidir.",
          ),
        });
      }
    });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
    },
  });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestPending.current) return;
    await form.handleSubmit(async (values) => {
      if (requestPending.current || !requireConsent()) return;
      if (workflowAdapter) {
        await requestWorkflow(async (scope) => {
          if (mode === "reset-password") {
            return resetConfirmation
              ? await runAuthWorkflow(
                  workflowAdapter,
                  "confirmPasswordReset",
                  {
                    token: resetToken!,
                    password: values.password ?? "",
                  },
                  scope,
                  redirectPolicy ?? workflowAdapter.redirectPolicy,
                )
              : await runAuthWorkflow(
                  workflowAdapter,
                  "requestPasswordReset",
                  {
                    email: values.email ?? "",
                  },
                  scope,
                );
          }
          if (mode === "sign-up") {
            return await runAuthWorkflow(
              workflowAdapter,
              "signUp",
              {
                name: values.name ?? "",
                email: values.email ?? "",
                password: values.password ?? "",
                consent: true,
              },
              scope,
              redirectPolicy ?? workflowAdapter.redirectPolicy,
            );
          }
          return await runAuthWorkflow(
            workflowAdapter,
            "signIn",
            {
              email: values.email ?? "",
              password: values.password ?? "",
            },
            scope,
            redirectPolicy ?? workflowAdapter.redirectPolicy,
          );
        });
        return;
      }
      requestPending.current = true;
      const controller = new AbortController();
      emailRequest.current = controller;
      setBusy(true);
      setRequestError("");
      let completed = false;
      try {
        await waitForDemoAuth(350, controller.signal);
        if (mode === "reset-password") {
          setComplete(true);
        } else {
          continueEmailDemo("email", {
            email: values.email ?? "",
            name: values.name,
          });
        }
        completed = true;
      } catch {
        if (!controller.signal.aborted && mounted.current) showRequestError();
      } finally {
        requestPending.current = completed;
        if (emailRequest.current === controller) emailRequest.current = null;
        if (mounted.current) setBusy(false);
      }
    })(event);
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestPending.current) return;
    if (workflowAdapter) {
      if (verificationToken) {
        await requestWorkflow((scope) =>
          runAuthWorkflow(
            workflowAdapter,
            "verifyEmail",
            { token: verificationToken },
            scope,
            redirectPolicy ?? workflowAdapter.redirectPolicy,
          ),
        );
        return;
      }
      if (!activeChallenge) {
        setOtpError(
          l(
            "Request a verification code first.",
            "Solicita primero un código de verificación.",
          ),
        );
        return;
      }
      await requestWorkflow((scope) =>
        activeChallenge.kind === "mfa-required"
          ? runAuthWorkflow(
              workflowAdapter,
              "verifyMfa",
              {
                challengeId: activeChallenge.challengeId,
                code: otp,
              },
              scope,
              redirectPolicy ?? workflowAdapter.redirectPolicy,
            )
          : runAuthWorkflow(
              workflowAdapter,
              "verifyEmail",
              {
                challengeId: activeChallenge.challengeId,
                code: otp,
              },
              scope,
              redirectPolicy ?? workflowAdapter.redirectPolicy,
            ),
      );
      return;
    }
    if (otp !== "123456") {
      setOtpError(
        l("Use the demo code 123456.", "Usa el código de ejemplo 123456."),
      );
      return;
    }
    requestPending.current = true;
    const controller = new AbortController();
    emailRequest.current = controller;
    setBusy(true);
    setRequestError("");
    let completed = false;
    try {
      await waitForDemoAuth(250, controller.signal);
      continueEmailDemo("otp");
      completed = true;
    } catch {
      if (!controller.signal.aborted && mounted.current) showRequestError();
    } finally {
      requestPending.current = completed;
      if (emailRequest.current === controller) emailRequest.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  async function resendCode() {
    if (!workflowAdapter) {
      toast(l("Your demo code is 123456.", "Tu código de ejemplo es 123456."));
      return;
    }
    if (activeChallenge?.kind === "mfa-required") return;
    await requestWorkflow((scope) =>
      runAuthWorkflow(
        workflowAdapter,
        "resendVerification",
        {
          email: verificationEmail,
          challengeId: activeChallenge?.challengeId,
        },
        scope,
      ),
    );
  }
  const titles: Record<AuthMode, [string, string]> = {
    "sign-in": ["Welcome to what’s next.", "Bienvenido a lo que sigue."],
    "sign-up": ["Build your next chapter.", "Crea tu próximo capítulo."],
    "reset-password": ["Let’s get you back in.", "Volvamos a tu espacio."],
    verify: ["One code. You’re in.", "Un código. Estás dentro."],
  };
  return (
    <div className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[minmax(0,.94fr)_minmax(0,1.06fr)]">
      <main className="relative flex min-w-0 flex-col bg-surface px-5 py-7 sm:px-10 xl:px-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href={`/${locale}/`} aria-label="Aureform UI">
            <Brand />
          </Link>
          <Link
            href={`/${locale}/studio/`}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold"
          >
            <SlidersHorizontal className="size-3.5 text-primary" />
            {l("Customize", "Personalizar")}
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12 sm:py-16">
          <Link
            href={`/${locale}/`}
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            {l("Back to demo", "Volver a la demo")}
          </Link>
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
            <Sparkles className="size-3.5" />
            {l("Your next workspace", "Tu próximo espacio")}
          </span>
          <h1
            className="text-[clamp(30px,3.6vw,42px)] font-bold leading-[1.12] tracking-[-.045em]"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight:
                appearance.typography === "modern"
                  ? 750
                  : "var(--af-display-weight)",
            }}
          >
            {resetConfirmation
              ? l("A fresh start.", "Un nuevo comienzo.")
              : activeChallenge?.kind === "mfa-required"
                ? l("One more security check.", "Una comprobación más.")
                : verificationToken || (workflowAdapter && verifying)
                  ? l("Verify your email.", "Verifica tu correo.")
                  : l(...titles[verifying ? "verify" : mode])}
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {workflowAdapter
              ? activeChallenge?.kind === "mfa-required"
                ? l(
                    "Enter a code from your authenticator or use a recovery code.",
                    "Escribe un código de tu autenticador o usa un código de recuperación.",
                  )
                : verificationToken
                  ? l(
                      "Confirm the email verification request with your identity service.",
                      "Confirma la solicitud de verificación de correo con tu servicio de identidad.",
                    )
                  : verifying
                    ? workflowAdapter.mode === "demo"
                      ? l(
                          "Preview verification with code 123456.",
                          "Prueba la verificación con el código 123456.",
                        )
                      : l(
                          "Enter the code from your identity service. You can request a new code below.",
                          "Escribe el código de tu servicio de identidad. Puedes solicitar uno nuevo abajo.",
                        )
                    : resetConfirmation
                      ? l(
                          "Choose a new password to complete your recovery request.",
                          "Elige una nueva contraseña para completar la recuperación.",
                        )
                      : mode === "reset-password"
                        ? l(
                            "Request recovery instructions for your account.",
                            "Solicita instrucciones para recuperar tu cuenta.",
                          )
                        : l(
                            "Continue with your configured identity service.",
                            "Continúa con tu servicio de identidad configurado.",
                          )
              : mode === "sign-in"
                ? l(
                    "Your workspace is ready. Sign in to explore the demo.",
                    "Tu espacio está listo. Inicia sesión para explorar la demo.",
                  )
                : mode === "sign-up"
                  ? l(
                      "A powerful starting point for your next product.",
                      "Un punto de partida potente para tu próximo producto.",
                    )
                  : mode === "verify"
                    ? l(
                        "Use the demo code 123456 to continue.",
                        "Usa el código de ejemplo 123456 para continuar.",
                      )
                    : l(
                        "Enter your email to preview password recovery.",
                        "Escribe tu correo para probar la recuperación de contraseña.",
                      )}
          </p>
          {(mode === "sign-in" || mode === "sign-up") &&
            !verifying &&
            !complete && (
              <>
                {mode === "sign-up" && !providerComplete && (
                  <div className="mt-6 rounded-xl border border-border bg-background/50 p-3.5">
                    <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
                      <Checkbox
                        ref={consentControl}
                        className="mt-0.5"
                        checked={consent}
                        disabled={busy}
                        onCheckedChange={(value) => {
                          setConsent(value);
                          setConsentError("");
                        }}
                        aria-invalid={!!consentError}
                        aria-describedby={
                          consentError ? "auth-consent-error" : undefined
                        }
                        aria-label={
                          connected
                            ? l(
                                "Accept account terms",
                                "Aceptar términos de la cuenta",
                              )
                            : l(
                                "Accept demo terms",
                                "Aceptar términos de demostración",
                              )
                        }
                      />
                      <span>
                        {consentLabel ??
                          (connected
                            ? l(
                                "I accept the account terms and privacy policy.",
                                "Acepto los términos de la cuenta y la política de privacidad.",
                              )
                            : l(
                                "I understand this is a frontend demo.",
                                "Entiendo que esta es una demostración de interfaz.",
                              ))}
                      </span>
                    </label>
                    {consentError && (
                      <p
                        id="auth-consent-error"
                        role="alert"
                        className="mt-2 text-xs text-destructive-foreground"
                      >
                        {consentError}
                      </p>
                    )}
                  </div>
                )}
                <SocialAuth
                  intent={mode}
                  consent={consent}
                  disabled={busy}
                  demo={!connected && !hasSocialHandler}
                  onProviderSignIn={
                    connected && !hasSocialHandler
                      ? undefined
                      : handleProviderSignIn
                  }
                  onConsentRequired={() => void requireConsent()}
                  onComplete={() => {
                    requestPending.current = true;
                    form.resetField("password");
                    setProviderComplete(true);
                  }}
                  onContinue={() =>
                    router.push(
                      `/${locale}/${mode === "sign-up" ? "onboarding" : "dashboard"}/`,
                    )
                  }
                  continueLabel={
                    mode === "sign-up"
                      ? l(
                          "Continue to onboarding",
                          "Continuar a la configuración",
                        )
                      : l("Continue to workspace", "Continuar al espacio")
                  }
                />
                {!providerComplete && (
                  <div className="mt-6 flex items-center gap-3">
                    <span
                      className="h-px flex-1 bg-border"
                      aria-hidden="true"
                    />
                    <span className="text-xs text-muted-foreground">
                      {l("or continue with email", "o continuar con correo")}
                    </span>
                    <span
                      className="h-px flex-1 bg-border"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </>
            )}
          {requestError && (
            <Alert
              className="mt-5"
              variant="destructive"
              title={l("Could not continue", "No se pudo continuar")}
            >
              {requestError}
            </Alert>
          )}
          {complete ? (
            <div className="mt-7">
              <Alert
                variant="success"
                title={
                  workflowAdapter
                    ? workflowResult?.kind === "session"
                      ? l("Session returned", "Sesión recibida")
                      : resetConfirmation
                        ? l("Password updated", "Contraseña actualizada")
                        : mode === "reset-password"
                          ? l("Request accepted", "Solicitud aceptada")
                          : l("Request complete", "Solicitud completada")
                    : l(
                        "Recovery preview ready",
                        "Vista previa de recuperación lista",
                      )
                }
              >
                {workflowAdapter
                  ? workflowAdapter.mode === "demo"
                    ? l(
                        "Local preview complete. No account, email or server session was created.",
                        "Vista previa local completa. No se creó una cuenta, correo ni sesión del servidor.",
                      )
                    : workflowResult?.kind === "session"
                      ? l(
                          "Your identity service returned a session. Your application controls access and the next step.",
                          "Tu servicio de identidad devolvió una sesión. Tu aplicación controla el acceso y el siguiente paso.",
                        )
                      : mode === "reset-password" && !resetConfirmation
                        ? l(
                            "If this address can receive recovery instructions, your service will handle the request.",
                            "Si esta dirección puede recibir instrucciones de recuperación, tu servicio gestionará la solicitud.",
                          )
                        : l(
                            "Your identity service completed the request. Sign-in and access still follow your application's session policy.",
                            "Tu servicio de identidad completó la solicitud. El inicio de sesión y el acceso siguen la política de sesiones de tu aplicación.",
                          )
                  : l(
                      "The recovery preview is complete. No email was sent.",
                      "La vista previa de recuperación está completa. No se envió ningún correo.",
                    )}
              </Alert>
              {workflowResult?.kind === "session" &&
              workflowResult.redirectTo ? (
                <Button
                  type="button"
                  className="mt-6 w-full"
                  onClick={() => {
                    if (workflowResult.redirectTo?.startsWith("/"))
                      router.push(workflowResult.redirectTo);
                    else if (workflowResult.redirectTo)
                      window.location.assign(workflowResult.redirectTo);
                  }}
                >
                  {l("Continue", "Continuar")}
                </Button>
              ) : workflowResult?.kind === "session" ? null : (
                <Link
                  href={`/${locale}/auth/sign-in/`}
                  className={
                    buttonVariants({ variant: "outline", size: "default" }) +
                    " mt-6 w-full"
                  }
                >
                  {l("Back to sign in", "Volver al inicio de sesión")}
                </Link>
              )}
            </div>
          ) : providerComplete ? null : verifying ? (
            <form
              className="mt-8 grid gap-5"
              aria-busy={busy}
              onSubmit={verifyOtp}
            >
              {workflowAdapter &&
                !verificationToken &&
                activeChallenge?.kind !== "mfa-required" && (
                  <Field
                    label={l("Verification email", "Correo de verificación")}
                  >
                    <Input
                      type="email"
                      autoComplete="email"
                      value={verificationEmail}
                      onChange={(event) =>
                        setVerificationEmail(event.target.value)
                      }
                      readOnly={
                        activeChallenge?.kind === "verification-required"
                      }
                      disabled={busy}
                      required
                    />
                  </Field>
                )}
              {verificationToken ? null : activeChallenge?.kind ===
                  "mfa-required" && recoveryCode ? (
                <Field
                  label={l("Recovery code", "Código de recuperación")}
                  error={otpError || undefined}
                >
                  <Input
                    value={otp}
                    onChange={(event) => {
                      setOtp(event.target.value);
                      setOtpError("");
                    }}
                    autoComplete="off"
                    disabled={busy}
                    maxLength={128}
                  />
                </Field>
              ) : (
                <div className="motion-reduce:[&_div]:animate-none [[data-motion-level=off]_&_div]:animate-none">
                  <InputOTP
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      setOtpError("");
                    }}
                    label={l("Verification code", "Código de verificación")}
                    length={activeChallenge?.codeLength ?? 6}
                    invalid={!!otpError}
                    disabled={busy || (!!workflowAdapter && !activeChallenge)}
                  />
                </div>
              )}
              {otpError && (
                <p role="alert" className="text-xs text-destructive-foreground">
                  {otpError}
                </p>
              )}
              <Button
                type="submit"
                loading={busy}
                disabled={
                  !!workflowAdapter && !activeChallenge && !verificationToken
                }
              >
                {verificationToken
                  ? l("Confirm email", "Confirmar correo")
                  : l("Verify code", "Verificar código")}
              </Button>
              {verificationToken ? null : activeChallenge?.kind ===
                "mfa-required" ? (
                activeChallenge.factors.includes("recovery-code") &&
                activeChallenge.factors.includes("totp") && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setRecoveryCode(!recoveryCode);
                      setOtp("");
                      setOtpError("");
                    }}
                  >
                    {recoveryCode
                      ? l("Use authenticator", "Usar autenticador")
                      : l(
                          "Use a recovery code",
                          "Usar un código de recuperación",
                        )}
                  </Button>
                )
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void resendCode()}
                >
                  {workflowAdapter && !activeChallenge
                    ? l("Request code", "Solicitar código")
                    : l("Resend code", "Volver a enviar código")}
                </Button>
              )}
            </form>
          ) : (
            <form
              onSubmit={submit}
              aria-busy={busy}
              className="mt-6 grid gap-5"
            >
              {mode === "sign-up" && (
                <Field
                  label={l("Full name", "Nombre completo")}
                  error={form.formState.errors.name?.message}
                >
                  <Input
                    {...form.register("name")}
                    autoComplete="name"
                    placeholder="Alex Morgan"
                    disabled={busy}
                  />
                </Field>
              )}
              {!resetConfirmation && (
                <Field
                  label={l("Email", "Correo")}
                  error={form.formState.errors.email?.message}
                >
                  <Input
                    {...form.register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    disabled={busy}
                  />
                </Field>
              )}
              {(mode === "sign-in" ||
                mode === "sign-up" ||
                resetConfirmation) && (
                <Field
                  htmlFor="auth-password"
                  label={l("Password", "Contraseña")}
                  error={form.formState.errors.password?.message}
                >
                  <div className="relative">
                    <Input
                      id="auth-password"
                      {...form.register("password")}
                      aria-describedby={
                        form.formState.errors.password
                          ? "auth-password-details"
                          : undefined
                      }
                      aria-invalid={!!form.formState.errors.password}
                      type={visible ? "text" : "password"}
                      autoComplete={
                        mode === "sign-up" || resetConfirmation
                          ? "new-password"
                          : "current-password"
                      }
                      placeholder="••••••••"
                      className="pr-10"
                      disabled={busy}
                    />
                    <button
                      type="button"
                      aria-label={
                        visible
                          ? l("Hide password", "Ocultar contraseña")
                          : l("Show password", "Mostrar contraseña")
                      }
                      onClick={() => setVisible(!visible)}
                      disabled={busy}
                      className="absolute top-3 right-3 text-muted-foreground"
                    >
                      {visible ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </Field>
              )}
              {resetConfirmation && (
                <Field
                  label={l(
                    "Confirm new password",
                    "Confirmar nueva contraseña",
                  )}
                  error={form.formState.errors.passwordConfirmation?.message}
                >
                  <Input
                    {...form.register("passwordConfirmation")}
                    type="password"
                    autoComplete="new-password"
                    disabled={busy}
                  />
                </Field>
              )}
              {mode === "sign-in" && (
                <Link
                  href={`/${locale}/auth/reset-password/`}
                  className="justify-self-end text-sm text-primary underline underline-offset-4"
                >
                  {l("Forgot password?", "¿Olvidaste tu contraseña?")}
                </Link>
              )}
              <Button
                type="submit"
                className="min-h-12 w-full text-sm"
                loading={busy}
              >
                {workflowAdapter
                  ? resetConfirmation
                    ? l("Update password", "Actualizar contraseña")
                    : mode === "sign-in"
                      ? l("Sign in", "Iniciar sesión")
                      : mode === "sign-up"
                        ? l("Create account", "Crear cuenta")
                        : l("Request recovery", "Solicitar recuperación")
                  : mode === "sign-in"
                    ? l("Sign in to demo", "Entrar a la demo")
                    : mode === "sign-up"
                      ? l("Create demo account", "Crear cuenta de ejemplo")
                      : l("Preview recovery", "Probar recuperación")}
              </Button>
            </form>
          )}
          {busy && workflowAdapter && requestKind === "email" && (
            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <p role="status">
                {l(
                  "Waiting for your identity service…",
                  "Esperando a tu servicio de identidad…",
                )}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => emailRequest.current?.abort()}
              >
                {l("Cancel", "Cancelar")}
              </Button>
            </div>
          )}
          {(mode === "sign-in" || mode === "sign-up") && (
            <p className="mt-6 text-center text-sm leading-6 text-muted-foreground">
              {mode === "sign-in"
                ? l("New around here? ", "¿Eres nuevo aquí? ")
                : l("Already have an account? ", "¿Ya tienes una cuenta? ")}
              <Link
                className="font-semibold text-primary underline underline-offset-4"
                href={`/${locale}/auth/${mode === "sign-in" ? "sign-up" : "sign-in"}/`}
              >
                {mode === "sign-in"
                  ? l("Create an account", "Crear una cuenta")
                  : l("Sign in", "Iniciar sesión")}
              </Link>
            </p>
          )}
          <p className="mt-8 rounded-xl border border-border bg-background/60 p-3 text-xs leading-6 text-muted-foreground">
            {workflowAdapter
              ? connected
                ? l(
                    "Consumer adapter · Your backend owns identity, consent and server sessions. Credentials are submitted for this request and are never saved by this UI. Social access requires a separate provider callback.",
                    "Adaptador del consumidor · Tu backend controla la identidad, el consentimiento y las sesiones del servidor. Las credenciales se envían para esta solicitud y esta interfaz nunca las guarda. El acceso social requiere un callback de proveedor independiente.",
                  )
                : l(
                    "Memory-only preview · Code 123456, reset reference demo-reset. No emails, provider accounts or server sessions are created.",
                    "Vista previa en memoria · Código 123456, referencia de recuperación demo-reset. No se crean correos, cuentas de proveedor ni sesiones del servidor.",
                  )
              : l(
                  "Frontend demo · Email, OTP and the built-in social buttons use local preview data. No password or token is stored; no provider account is connected.",
                  "Demo de interfaz · El correo, OTP y los botones sociales incluidos usan datos locales de ejemplo. No se guarda ninguna contraseña ni token; no se conecta una cuenta del proveedor.",
                )}
          </p>
          <nav
            aria-label={l(
              "Authentication screens",
              "Pantallas de autenticación",
            )}
            className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs"
          >
            {(
              [
                ["sign-in", "Sign in", "Iniciar sesión"],
                ["sign-up", "Sign up", "Crear cuenta"],
                ["reset-password", "Recovery", "Recuperar acceso"],
                ["verify", "Verify code", "Verificar código"],
              ] as const
            ).map(([path, en, es]) => (
              <Link
                key={path}
                href={`/${locale}/auth/${path}/`}
                aria-current={path === mode ? "page" : undefined}
                className="rounded px-1 py-1 text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:text-primary"
              >
                {l(en, es)}
              </Link>
            ))}
          </nav>
          <Link
            href={`/${locale}/dashboard/`}
            className={
              buttonVariants({ variant: "ghost", size: "sm" }) + " mt-4 w-full"
            }
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {l("Explore the demo workspace", "Explorar el espacio de demo")}
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Aureform UI</p>
      </main>
      <aside className="relative isolate hidden min-w-0 overflow-hidden border-l border-border bg-background p-9 lg:flex lg:flex-col lg:justify-between lg:gap-10 xl:p-14">
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
            paused={appearance.shader.paused || appearance.motion === "off"}
            className="h-full w-full"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                appearance.theme === "light"
                  ? "linear-gradient(180deg, color-mix(in srgb, var(--background) 97%, transparent), color-mix(in srgb, var(--background) 94%, transparent) 48%, color-mix(in srgb, var(--background) 97%, transparent))"
                  : "linear-gradient(180deg, color-mix(in srgb, var(--background) 76%, transparent), color-mix(in srgb, var(--background) 42%, transparent) 48%, color-mix(in srgb, var(--background) 85%, transparent)), linear-gradient(90deg, color-mix(in srgb, var(--background) 55%, transparent), transparent)",
            }}
          />
        </div>
        <div className="relative flex items-center justify-between gap-4">
          <AureformMark className="size-11 text-primary" />
          <Link
            href={`/${locale}/studio/`}
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface/80 px-4 py-2 text-xs font-semibold backdrop-blur-xl"
          >
            <SlidersHorizontal className="size-3.5 text-primary" />
            Aureform Studio
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <div className="relative my-auto min-w-0">
          <p className="mb-5 text-xs font-semibold tracking-[.18em] text-primary">
            {l(
              "A NEW STANDARD FOR YOUR NEXT PRODUCT",
              "UN NUEVO ESTÁNDAR PARA TU PRÓXIMO PRODUCTO",
            )}
          </p>
          <h2
            className="max-w-xl text-[clamp(40px,4.4vw,66px)] font-bold leading-[1.04] tracking-[-.055em]"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight:
                appearance.typography === "modern"
                  ? 800
                  : "var(--af-display-weight)",
            }}
          >
            {l("Built for your", "Creado para tu")}
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--af-gradient-text)" }}
            >
              {l("next big idea.", "próxima gran idea.")}
            </span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground">
            {l(
              "Intelligent workspaces. Expressive design. A visual identity that belongs to you.",
              "Espacios inteligentes. Diseño expresivo. Una identidad visual que te pertenece.",
            )}
          </p>
          <div className="relative mt-9 min-w-0 pb-5">
            <div
              aria-hidden="true"
              className="absolute inset-x-4 bottom-2 top-3 rounded-2xl border border-primary/30 bg-primary/15 rotate-[-3deg]"
            />
            <GlowBorder
              colors={colors}
              className="relative rounded-2xl bg-surface/90 p-0"
            >
              <div className="min-w-0 rounded-2xl bg-surface/95 p-5 backdrop-blur-xl xl:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <Activity className="size-4 text-primary" />
                    {l("Workspace overview", "Resumen del negocio")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {l("Demo data", "Datos de ejemplo")}
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {l("Monthly revenue", "Ingresos mensuales")}
                    </p>
                    <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">
                      {currency(revenueData.at(-1)!.value)}
                    </p>
                  </div>
                  <span className="rounded-full border border-primary/25 bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                    +12.8%
                  </span>
                </div>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 400 100"
                  className="mt-6 h-24 w-full text-primary"
                  fill="none"
                >
                  <path d="M0 98H400" stroke="var(--border)" />
                  <polyline
                    points={revenueData
                      .map(
                        (point, index) =>
                          `${(index / 5) * 400},${95 - (point.value / 50000) * 85}`,
                      )
                      .join(" ")}
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <Check className="size-4 text-primary" />
                    {l("Your visual signature", "Tu identidad visual")}
                  </span>
                  <span aria-hidden="true" className="flex gap-1.5">
                    {colors.map((color, index) => (
                      <span
                        key={index}
                        className="size-5 rounded-full border border-border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            </GlowBorder>
          </div>
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-5">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Layers className="size-4 text-primary" />
            Aureform UI · Next.js + Figma
          </span>
          <Link
            href={`/${locale}/effects/`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-4"
          >
            {l("Explore effects", "Explorar efectos")}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
