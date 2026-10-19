"use client";
import { publicPath } from "@/lib/public-path";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Download,
  Sun,
  Moon,
  ArrowLeft,
  RotateCcw,
  Mail,
  Construction,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/components/providers";
import { Brand } from "@/components/brand";
import { PageHeading } from "@/components/blocks/page-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { figmaUrl, githubUrl, kitVersion } from "@/lib/catalog";
import { cn } from "@/lib/utils";
export function PricingTemplate() {
  const { l } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState("workspace");
  const plans = [
    {
      id: "starter",
      name: l("Starter", "Inicial"),
      price: "0",
      description: l("For a small workspace", "Para un workspace pequeño"),
      features: [
        l("One sample workspace", "Un workspace de ejemplo"),
        l("Basic reporting", "Informes básicos"),
        l("Community collaboration", "Colaboración con la comunidad"),
      ],
    },
    {
      id: "workspace",
      name: "Workspace",
      price: "19",
      description: l(
        "For a growing product team",
        "Para un equipo en crecimiento",
      ),
      features: [
        l("Shared project workspaces", "Workspaces de proyectos compartidos"),
        l("Saved reports and views", "Informes y vistas guardados"),
        l("Team activity timeline", "Historial de actividad del equipo"),
        l("Configurable roles", "Roles configurables"),
      ],
    },
    {
      id: "scale",
      name: l("Scale", "Escala"),
      price: "49",
      description: l(
        "For a larger organization",
        "Para una organización más grande",
      ),
      features: [
        l("Everything in Workspace", "Todo lo incluido en Workspace"),
        l("Advanced reporting", "Informes avanzados"),
        l("Organization settings", "Ajustes de organización"),
        l("Priority workflows", "Flujos prioritarios"),
      ],
    },
  ];
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l(
          "Subscription interface example",
          "Ejemplo de interfaz de suscripciones",
        )}
        title={l(
          "Plans for your next product.",
          "Planes para tu próximo producto.",
        )}
        description={l(
          "An editable pricing pattern with local plan selection and illustrative monthly prices.",
          "Un patrón de precios editable con selección local de planes y precios mensuales ilustrativos.",
        )}
      />
      <Alert
        title={l(
          "Demo plans · Aureform is open source",
          "Planes de ejemplo · Aureform es código abierto",
        )}
      >
        {l(
          "These plans belong to a fictional SaaS product. Selecting one only updates this example; no payment is collected. The entire Aureform UI kit is available under Apache 2.0.",
          "Estos planes pertenecen a un SaaS ficticio. Elegir uno solo actualiza este ejemplo; no se cobra ningún pago. Todo el kit Aureform UI está disponible bajo Apache 2.0.",
        )}
      </Alert>
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative flex flex-col p-6 sm:p-8",
              selectedPlan === plan.id && "border-primary/45",
            )}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{plan.name}</h2>
              {selectedPlan === plan.id && (
                <Badge>
                  {l("Selected demo plan", "Plan de ejemplo elegido")}
                </Badge>
              )}
            </div>
            <p className="mt-8 text-4xl font-semibold tracking-tight">
              <span className="mr-1 text-sm font-normal text-muted-foreground">
                US$
              </span>
              {plan.price}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {l("/ month", "/ mes")}
              </span>
            </p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {plan.description}
            </p>
            <div className="my-7 h-px bg-border" />
            <ul className="mb-8 grid gap-4">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-xs leading-6">
                  <Check className="mt-1 size-3.5 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              variant={selectedPlan === plan.id ? "default" : "outline"}
              className="mt-auto"
              aria-pressed={selectedPlan === plan.id}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {selectedPlan === plan.id ? <Check /> : <ArrowUpRight />}
              {selectedPlan === plan.id
                ? l("Selected", "Elegido")
                : l("Select demo plan", "Elegir plan de ejemplo")}
            </Button>
          </Card>
        ))}
      </div>
      <p role="status" className="text-xs text-muted-foreground">
        {l("Selected in this example:", "Elegido en este ejemplo:")}{" "}
        {plans.find((plan) => plan.id === selectedPlan)?.name}
      </p>
      <Card className="flex flex-wrap items-center justify-between gap-5 p-6">
        <div>
          <h2 className="text-sm font-semibold">
            {l(
              "The complete kit belongs to the community.",
              "El kit completo es para la comunidad.",
            )}
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            {l(
              "Explore the source, use the editable Figma library and help shape what comes next.",
              "Explora el código, usa la biblioteca editable de Figma y ayuda a definir lo que sigue.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={githubUrl}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            GitHub <ArrowUpRight />
          </a>
          <a
            href={figmaUrl}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Figma <ArrowUpRight />
          </a>
          <a
            href={`${githubUrl}/releases/download/v${kitVersion}/aureform-ui-source.zip`}
            download
            className={buttonVariants({ size: "sm" })}
          >
            <Download /> {l("Download source", "Descargar código")}
          </a>
        </div>
      </Card>
    </div>
  );
}
export function FAQTemplate() {
  const { l, locale } = useLanguage();
  const questions = [
    [
      l("What exactly is included?", "¿Qué incluye exactamente?"),
      l(
        "A complete Next.js frontend suite, 44 component families, reusable blocks, local install tools, two languages, two themes, a native Figma library and matching local Code Connect templates.",
        "Una suite de interfaces Next.js, 44 familias de componentes, bloques reutilizables, instalador local, dos idiomas, dos temas, biblioteca nativa de Figma y plantillas locales de Code Connect.",
      ),
    ],
    [
      l("Is this a working application?", "¿Es una aplicación funcional?"),
      l(
        "The frontend interactions work: CRUD, sorting, filtering, paging, forms, boards, files, chat and simulated streaming. Data stays in your browser. Authentication, model calls, email delivery and billing require your own backend.",
        "Las interacciones funcionan: registros, ordenamiento, filtros, paginación, formularios, tableros, archivos, chat y transmisión simulada. Los datos permanecen en tu navegador. Identidad, modelos, correos y cobros requieren tu servidor.",
      ),
    ],
    [
      l(
        "Can I use individual components?",
        "¿Puedo usar componentes individuales?",
      ),
      l(
        "Yes. Use the local CLI to copy only the requested component and its dependency closure, or use the provided shadcn registry JSON. The complete starter is optional.",
        "Sí. La CLI local copia cada componente y sus dependencias, y también puedes usar el JSON del registro shadcn. El proyecto inicial completo es opcional.",
      ),
    ],
    [
      l("Does it use Base UI or Radix?", "¿Usa Base UI o Radix?"),
      l(
        "Interactive primitives use Base UI. The source follows shadcn conventions and Tailwind CSS 4. It is deliberately editable source, not a locked component runtime.",
        "Los controles interactivos usan Base UI. El código sigue las convenciones de shadcn y Tailwind CSS 4. Se entrega como código editable.",
      ),
    ],
    [
      l(
        "Does Figma contain real components?",
        "¿Figma contiene componentes reales?",
      ),
      l(
        "Yes. The companion design file uses editable frames, auto layout, variables, component sets, variants and instances. The component mappings are local source templates; they have not been published to Code Connect cloud.",
        "Sí. El archivo usa frames editables, auto layout, variables, conjuntos, variantes e instancias. Los vínculos con el código se entregan como plantillas locales; no se han publicado en Code Connect.",
      ),
    ],
    [
      l("What does Apache 2.0 allow?", "¿Qué permite Apache 2.0?"),
      l(
        "Use, modify and redistribute Aureform, including in commercial products, under Apache 2.0. Keep the required license and notices, identify your modifications and follow the licenses of third-party libraries and fonts. There are no developer-seat limits.",
        "Usa, modifica y redistribuye Aureform, incluso en productos comerciales, bajo Apache 2.0. Conserva la licencia y los avisos requeridos, identifica tus modificaciones y respeta las licencias de bibliotecas y fuentes externas. No hay límites por desarrollador.",
      ),
    ],
    [
      l(
        "Is proprietary TailAdmin source included?",
        "¿Se incluye código propietario de TailAdmin?",
      ),
      l(
        "No. The local reference was used to understand product categories and coverage. Aureform’s source, brand and layouts are original. Third-party open-source libraries and fonts retain their own licenses.",
        "La referencia local se usó para entender categorías y alcance. El código, la marca y las composiciones de Aureform son originales. Las bibliotecas y fuentes abiertas conservan sus propias licencias.",
      ),
    ],
    [
      l("How do I reset the demo?", "¿Cómo restablezco la demo?"),
      l(
        "Open the profile menu and choose the demo reset action. It clears Aureform browser records and local uploaded files. The theme preference is retained.",
        "Abre el menú del perfil y elige restablecer la demo. Se borran los registros de Aureform y archivos locales. La preferencia de tema se conserva.",
      ),
    ],
  ];
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l("A little clarity", "Un poco de claridad")}
        title={l(
          "Good questions. Clear answers.",
          "Buenas preguntas. Respuestas claras.",
        )}
        description={l(
          "The details that make the handoff easier.",
          "Los detalles que hacen más sencilla la entrega.",
        )}
      />
      <Card className="mx-auto w-full max-w-3xl p-6 sm:p-9">
        <Accordion>
          {questions.map(([question, answer], index) => (
            <AccordionItem value={String(index)} key={question}>
              <AccordionTrigger>{question}</AccordionTrigger>
              <AccordionContent>{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <a
          href={publicPath(`/${locale}/docs/`)}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-7",
          )}
        >
          {l("Read the documentation", "Leer la documentación")}
          <ArrowUpRight />
        </a>
      </Card>
    </div>
  );
}
export function StatusTemplate({ kind }: { kind: string }) {
  const { l, locale } = useLanguage(),
    { theme, setTheme } = useTheme(),
    [retry, setRetry] = useState(false),
    [email, setEmail] = useState(""),
    [emailError, setEmailError] = useState(""),
    [saved, setSaved] = useState(false);
  const content: Record<
    string,
    { number: string; title: string; description: string }
  > = {
    "not-found": {
      number: "404",
      title: l("A little off the path.", "Un pequeño desvío."),
      description: l(
        "The page you were looking for isn’t here. There is still a good place to begin.",
        "La página que buscas no está aquí. Aún hay un buen lugar para empezar.",
      ),
    },
    error: {
      number: "500",
      title: l("Let’s take another look.", "Veámoslo de nuevo."),
      description: l(
        "This is a simulated error state. Retry to see the recovery pattern.",
        "Este es un error simulado. Reintenta para ver el patrón de recuperación.",
      ),
    },
    maintenance: {
      number: "A little pause",
      title: l("Making room for better things.", "Preparando algo mejor."),
      description: l(
        "An example maintenance page for scheduled product updates. The rest of this demo remains available.",
        "Una página de mantenimiento para actualizaciones programadas. El resto de la demo sigue disponible.",
      ),
    },
    "coming-soon": {
      number: "Something considered",
      title: l("A good thing takes shape.", "Algo bueno toma forma."),
      description: l(
        "A coming-soon pattern with local form validation. Your address is saved only in this browser.",
        "Un patrón de próximo lanzamiento con validación local. Tu dirección se guarda solo en este navegador.",
      ),
    },
    success: {
      number: "All set",
      title: l("A good next step.", "Un buen siguiente paso."),
      description: l(
        "Your example flow is complete. Everything is ready for a fresh beginning.",
        "Tu flujo de ejemplo terminó. Todo está listo para un nuevo comienzo.",
      ),
    },
  };
  const page = retry
    ? {
        number: l("Recovered", "Recuperado"),
        title: l("Back in good shape.", "Todo está en orden."),
        description: l(
          "The simulated retry succeeded. Continue to the workspace.",
          "El reintento simulado terminó correctamente. Continúa al espacio de trabajo.",
        ),
      }
    : (content[kind] ?? content["not-found"]);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <a
          href={publicPath(`/${locale}/`)}
          aria-label={l("Aureform UI home", "Inicio de Aureform UI")}
        >
          <Brand />
        </a>
        <div className="flex gap-2">
          <a
            href={publicPath(
              `/${locale === "es" ? "en" : "es"}/status/${kind}/`,
            )}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            {locale === "es" ? "EN" : "ES"}
          </a>
          <Button
            variant="ghost"
            size="icon"
            aria-label={l("Switch color theme", "Cambiar tema")}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="relative mb-10 flex size-28 items-center justify-center rounded-full border border-primary/15 bg-accent/40 text-primary">
          <div className="absolute -inset-5 rounded-full border border-border/70" />
          {kind === "success" || retry ? (
            <CheckCircle2 className="size-10" strokeWidth={1} />
          ) : kind === "maintenance" ? (
            <Construction className="size-10" strokeWidth={1} />
          ) : kind === "coming-soon" ? (
            <Clock className="size-10" strokeWidth={1} />
          ) : (
            <span className="editorial text-5xl">{page.number}</span>
          )}
        </div>
        <p className="text-[10px] uppercase tracking-[.2em] text-muted-foreground">
          Aureform · {l("A considered pause", "Una pausa cuidada")}
        </p>
        <h1 className="editorial mt-5 text-4xl sm:text-6xl">{page.title}</h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
          {page.description}
        </p>
        {kind === "coming-soon" && !saved ? (
          <form
            className="mt-8 w-full max-w-sm text-left"
            onSubmit={(event) => {
              event.preventDefault();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setEmailError(
                  l(
                    "Enter a valid email address.",
                    "Escribe un correo válido.",
                  ),
                );
                return;
              }
              try {
                localStorage.setItem(
                  "aureform:interest",
                  JSON.stringify({ email, date: new Date().toISOString() }),
                );
                setSaved(true);
                setEmailError("");
              } catch {
                setEmailError(
                  l(
                    "Browser storage is unavailable.",
                    "El almacenamiento del navegador no está disponible.",
                  ),
                );
              }
            }}
          >
            <Field
              label={l("Email address", "Correo electrónico")}
              error={emailError}
            >
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
              />
            </Field>
            <Button type="submit" className="mt-4 w-full">
              <Mail />
              {l("Save local interest", "Guardar interés local")}
            </Button>
            <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
              {l(
                "No subscription is sent. This is a frontend example.",
                "No se envía ninguna suscripción. Este es un ejemplo de interfaz.",
              )}
            </p>
          </form>
        ) : saved ? (
          <Alert
            title={l("Saved in this browser", "Guardado en este navegador")}
            variant="success"
          >
            {l(
              "Thanks for exploring the pattern.",
              "Gracias por explorar el patrón.",
            )}
          </Alert>
        ) : null}
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {kind === "error" && !retry && (
            <Button onClick={() => setRetry(true)}>
              <RotateCcw />
              {l("Try again", "Reintentar")}
            </Button>
          )}
          <a
            href={publicPath(`/${locale}/dashboard/`)}
            className={buttonVariants({
              variant: kind === "error" && !retry ? "outline" : "default",
            })}
          >
            <ArrowLeft />
            {l("Back to the workspace", "Volver al espacio de trabajo")}
          </a>
        </div>
      </main>
      <footer className="px-6 py-6 text-center text-[10px] text-muted-foreground">
        Aureform UI ·{" "}
        {l("A frontend demonstration", "Una demostración de interfaces")}
      </footer>
    </div>
  );
}
