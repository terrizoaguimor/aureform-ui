"use client";
import { publicPath } from "@/lib/public-path";
import { useMemo, useState } from "react";
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
import { toast } from "sonner";
type AuthMode = "sign-in" | "sign-up" | "reset-password" | "verify";
export function AuthTemplate({ mode }: { mode: AuthMode }) {
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
    [otp, setOtp] = useState(""),
    [otpError, setOtpError] = useState(""),
    [consent, setConsent] = useState(false),
    [consentError, setConsentError] = useState("");
  const schema = z.object({
    name:
      mode === "sign-up"
        ? z.string().trim().min(2, l("Enter your name.", "Escribe tu nombre."))
        : z.string().optional(),
    email: z.email(l("Enter a valid email.", "Escribe un correo válido.")),
    password:
      mode === "sign-in" || mode === "sign-up"
        ? z
            .string()
            .min(
              8,
              l("Use at least 8 characters.", "Usa al menos 8 caracteres."),
            )
        : z.string().optional(),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    if (mode === "sign-up" && !consent) {
      setConsentError(
        l(
          "Accept the demo terms to continue.",
          "Acepta los términos de demostración para continuar.",
        ),
      );
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 350));
    setBusy(false);
    if (mode === "reset-password") {
      setComplete(true);
      return;
    }
    localStorage.setItem(
      "aureform:demo-session",
      JSON.stringify({
        email: values.email,
        name: values.name || "Alex Morgan",
        demo: true,
      }),
    );
    toast.success(
      l("Demo sign-in complete", "Sesión de demostración iniciada"),
    );
    router.push(
      `/${locale}/${mode === "sign-up" ? "onboarding" : "dashboard"}/`,
    );
  });
  const titles: Record<AuthMode, [string, string]> = {
    "sign-in": ["Welcome to what’s next.", "Bienvenido a lo que sigue."],
    "sign-up": ["Build your next chapter.", "Crea tu próximo capítulo."],
    "reset-password": ["Let’s get you back in.", "Volvamos a tu espacio."],
    verify: ["One code. You’re in.", "Un código. Estás dentro."],
  };
  return (
    <div className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[minmax(0,.94fr)_minmax(0,1.06fr)]">
      <div className="relative flex min-w-0 flex-col bg-surface px-5 py-7 sm:px-10 xl:px-14">
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
            {l("Back to Aureform", "Volver a Aureform")}
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
            {l(...titles[mode])}
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {mode === "sign-in"
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
          {complete ? (
            <div className="mt-7">
              <Alert
                variant="success"
                title={l(
                  "Recovery preview ready",
                  "Vista previa de recuperación lista",
                )}
              >
                {l(
                  "This demo records the request locally. No email was sent.",
                  "La demo registra la solicitud localmente. No se envió ningún correo.",
                )}
              </Alert>
              <a
                href={publicPath(`/${locale}/auth/sign-in/`)}
                className={
                  buttonVariants({ variant: "outline", size: "default" }) +
                  " mt-6 w-full"
                }
              >
                {l("Back to sign in", "Volver al inicio de sesión")}
              </a>
            </div>
          ) : mode === "verify" ? (
            <form
              className="mt-8 grid gap-5"
              onSubmit={async (e) => {
                e.preventDefault();
                if (otp !== "123456") {
                  setOtpError(
                    l(
                      "Use the demo code 123456.",
                      "Usa el código de ejemplo 123456.",
                    ),
                  );
                  return;
                }
                setBusy(true);
                await new Promise((r) => setTimeout(r, 250));
                router.push(`/${locale}/dashboard/`);
              }}
            >
              <InputOTP
                value={otp}
                onChange={(v) => {
                  setOtp(v);
                  setOtpError("");
                }}
                label={l("Verification code", "Código de verificación")}
                invalid={!!otpError}
              />
              {otpError && (
                <p role="alert" className="text-xs text-destructive-foreground">
                  {otpError}
                </p>
              )}
              <Button type="submit" loading={busy}>
                {l("Verify code", "Verificar código")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  toast(
                    l(
                      "Your demo code is 123456.",
                      "Tu código de ejemplo es 123456.",
                    ),
                  )
                }
              >
                {l("Resend code", "Volver a enviar código")}
              </Button>
            </form>
          ) : (
            <form onSubmit={submit} className="mt-8 grid gap-5">
              {mode === "sign-up" && (
                <Field
                  label={l("Full name", "Nombre completo")}
                  error={form.formState.errors.name?.message}
                >
                  <Input
                    {...form.register("name")}
                    autoComplete="name"
                    placeholder="Alex Morgan"
                  />
                </Field>
              )}
              <Field
                label={l("Email", "Correo")}
                error={form.formState.errors.email?.message}
              >
                <Input
                  {...form.register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                />
              </Field>
              {(mode === "sign-in" || mode === "sign-up") && (
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
                        mode === "sign-up" ? "new-password" : "current-password"
                      }
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      aria-label={
                        visible
                          ? l("Hide password", "Ocultar contraseña")
                          : l("Show password", "Mostrar contraseña")
                      }
                      onClick={() => setVisible(!visible)}
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
              {mode === "sign-up" && (
                <div>
                  <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
                    <Checkbox
                      className="mt-0.5"
                      checked={consent}
                      onCheckedChange={(v) => {
                        setConsent(v);
                        setConsentError("");
                      }}
                      aria-label={l(
                        "Accept demo terms",
                        "Aceptar términos de demostración",
                      )}
                    />
                    <span>
                      {l(
                        "I understand this is a frontend demo.",
                        "Entiendo que esta es una demostración de interfaz.",
                      )}
                    </span>
                  </label>
                  {consentError && (
                    <p
                      role="alert"
                      className="mt-2 text-xs text-destructive-foreground"
                    >
                      {consentError}
                    </p>
                  )}
                </div>
              )}
              {mode === "sign-in" && (
                <a
                  href={publicPath(`/${locale}/auth/reset-password/`)}
                  className="justify-self-end text-sm text-primary underline underline-offset-4"
                >
                  {l("Forgot password?", "¿Olvidaste tu contraseña?")}
                </a>
              )}
              <Button
                type="submit"
                className="min-h-12 w-full text-sm"
                loading={busy}
              >
                {mode === "sign-in"
                  ? l("Sign in to demo", "Entrar a la demo")
                  : mode === "sign-up"
                    ? l("Create demo account", "Crear cuenta de ejemplo")
                    : l("Preview recovery", "Probar recuperación")}
              </Button>
            </form>
          )}
          {(mode === "sign-in" || mode === "sign-up") && (
            <p className="mt-6 text-center text-sm leading-6 text-muted-foreground">
              {mode === "sign-in"
                ? l("New around here? ", "¿Eres nuevo aquí? ")
                : l("Already have an account? ", "¿Ya tienes una cuenta? ")}
              <a
                className="font-semibold text-primary underline underline-offset-4"
                href={publicPath(
                  `/${locale}/auth/${mode === "sign-in" ? "sign-up" : "sign-in"}/`,
                )}
              >
                {mode === "sign-in"
                  ? l("Create an account", "Crear una cuenta")
                  : l("Sign in", "Iniciar sesión")}
              </a>
            </p>
          )}
          <p className="mt-8 rounded-xl border border-border bg-background/60 p-3 text-xs leading-6 text-muted-foreground">
            {l(
              "Frontend demo · No real account or password is stored. Your email is only used as local demo state.",
              "Demo de interfaz · No se crea una cuenta real ni se guarda la contraseña. El correo solo se usa como estado local.",
            )}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© 2026 Aureform UI</p>
      </div>
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
