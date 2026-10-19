"use client";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ArrowRight, ArrowLeft, Download, Save } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-language";
import { useDemoStore } from "@/hooks/use-demo-store";
import { useUploadLabels } from "@/components/templates/files-support";
import { PageHeading } from "@/components/blocks/page-heading";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileUpload } from "@/components/ui/file-upload";
import { DatePicker } from "@/components/ui/date-picker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn, downloadText } from "@/lib/utils";
export function FormsTemplate() {
  const { l } = useLanguage();
  return (
    <div className="grid gap-6">
      <PageHeading
        eyebrow={l("Consider every next step", "Cuida cada siguiente paso")}
        title={l(
          "Forms with a little more care.",
          "Formularios con un poco más de cuidado.",
        )}
        description={l(
          "Validated, labelled patterns with visible error, loading and success states.",
          "Patrones validados y etiquetados con estados visibles de error, carga y éxito.",
        )}
      />
      <Tabs defaultValue="workspace">
        <TabsList>
          <TabsTrigger value="workspace">
            {l("Workspace setup", "Configuración del espacio")}
          </TabsTrigger>
          <TabsTrigger value="project">
            {l("Project steps", "Pasos de proyecto")}
          </TabsTrigger>
          <TabsTrigger value="upload">
            {l("File upload", "Carga de archivos")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="workspace">
          <WorkspaceForm />
        </TabsContent>
        <TabsContent value="project">
          <ProjectSteps />
        </TabsContent>
        <TabsContent value="upload">
          <UploadPattern />
        </TabsContent>
      </Tabs>
    </div>
  );
}
function WorkspaceForm() {
  const { l, common: t } = useLanguage(),
    [saved, setSaved] = useDemoStore("form-workspace", {
      name: "Studio",
      email: "alex@studio.demo",
      url: "studio",
      plan: "pro",
      framework: "next",
      tools: ["figma", "tailwind"],
      description: "",
      notifications: true,
      accepted: false,
    }),
    [busy, setBusy] = useState(false),
    [complete, setComplete] = useState(false);
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(2, l("Use at least two characters.", "Usa al menos dos caracteres."))
      .max(80),
    email: z.email(l("Enter a valid email.", "Escribe un correo válido.")),
    url: z
      .string()
      .regex(
        /^[a-z0-9-]{3,40}$/,
        l(
          "Use 3–40 lowercase letters, numbers or hyphens.",
          "Usa de 3 a 40 letras minúsculas, números o guiones.",
        ),
      ),
    plan: z.enum(["starter", "pro", "enterprise"]),
    framework: z
      .string()
      .min(1, l("Choose a framework.", "Elige un framework.")),
    tools: z
      .array(z.string())
      .min(
        1,
        l("Choose at least one tool.", "Elige al menos una herramienta."),
      ),
    description: z.string().max(400),
    notifications: z.boolean(),
    accepted: z
      .boolean()
      .refine(
        Boolean,
        l(
          "Accept the demo terms to continue.",
          "Acepta los términos de demostración para continuar.",
        ),
      ),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: { ...saved, plan: saved.plan as "starter" | "pro" | "enterprise" },
  });
  const tools = [
    { value: "figma", label: "Figma" },
    { value: "tailwind", label: "Tailwind CSS" },
    { value: "typescript", label: "TypeScript" },
    { value: "storybook", label: "Storybook" },
  ];
  const submit = form.handleSubmit(async (values) => {
    setBusy(true);
    setComplete(false);
    await new Promise((resolve) => setTimeout(resolve, 400));
    setSaved(values);
    setBusy(false);
    setComplete(true);
    toast.success(t("saved"));
  });
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card>
        <CardHeader>
          <CardTitle>
            {l(
              "A workspace that feels like yours",
              "Un espacio que se sienta tuyo",
            )}
          </CardTitle>
          <CardDescription>
            {l(
              "Complete the details below. Try an invalid email to inspect the error state.",
              "Completa los detalles. Prueba un correo inválido para revisar el estado de error.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} noValidate className="grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={l("Workspace name", "Nombre del espacio")}
                error={form.formState.errors.name?.message}
              >
                <Input
                  {...form.register("name")}
                  autoComplete="organization"
                  maxLength={80}
                />
              </Field>
              <Field
                label={l("Work email", "Correo de trabajo")}
                error={form.formState.errors.email?.message}
              >
                <Input
                  type="email"
                  {...form.register("email")}
                  autoComplete="email"
                />
              </Field>
            </div>
            <Field
              label={l("Workspace URL", "URL del espacio")}
              description={l(
                "A local example. This does not create a domain.",
                "Un ejemplo local. Esto no crea un dominio.",
              )}
              error={form.formState.errors.url?.message}
            >
              <Input
                {...form.register("url")}
                placeholder="studio"
                autoCapitalize="none"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="plan"
                render={({ field }) => (
                  <Select
                    label="Plan"
                    options={["starter", "pro", "enterprise"].map((value) => ({
                      value,
                      label: value[0].toUpperCase() + value.slice(1),
                    }))}
                    value={field.value}
                    onValueChange={field.onChange}
                  />
                )}
              />
              <div>
                <label
                  className="mb-2 block text-xs font-semibold"
                  htmlFor="form-framework"
                >
                  {l("Framework", "Framework")}
                </label>
                <Controller
                  control={form.control}
                  name="framework"
                  render={({ field }) => (
                    <Combobox
                      id="form-framework"
                      options={[
                        { value: "next", label: "Next.js" },
                        { value: "react", label: "React" },
                      ]}
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? "")}
                      label={l("Framework", "Framework")}
                      emptyLabel={t("empty")}
                    />
                  )}
                />
                {form.formState.errors.framework && (
                  <p
                    role="alert"
                    className="mt-2 text-xs text-destructive-foreground"
                  >
                    {form.formState.errors.framework.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold">
                {l("Your tools", "Tus herramientas")}
              </p>
              <Controller
                control={form.control}
                name="tools"
                render={({ field }) => (
                  <MultiSelect
                    options={tools}
                    value={field.value}
                    onValueChange={field.onChange}
                    label={l("Your tools", "Tus herramientas")}
                    emptyLabel={t("empty")}
                    removeLabel={l("Remove", "Eliminar")}
                    keyboardHint={l(
                      "Backspace to remove",
                      "Retroceso para eliminar",
                    )}
                  />
                )}
              />
              {form.formState.errors.tools && (
                <p
                  role="alert"
                  className="mt-2 text-xs text-destructive-foreground"
                >
                  {form.formState.errors.tools.message}
                </p>
              )}
            </div>
            <Field
              label={l(
                "A little about your workspace",
                "Un poco sobre tu espacio",
              )}
              description={l("Up to 400 characters.", "Hasta 400 caracteres.")}
              error={form.formState.errors.description?.message}
            >
              <Textarea {...form.register("description")} maxLength={400} />
            </Field>
            <label className="flex items-center justify-between gap-4 border-t border-border pt-5 text-xs">
              <span>
                <strong>{l("Keep me in the loop", "Manténme al día")}</strong>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {l(
                    "An example preference; no emails are sent.",
                    "Una preferencia de ejemplo; no se envían correos.",
                  )}
                </span>
              </span>
              <Controller
                control={form.control}
                name="notifications"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </label>
            <div>
              <label className="flex items-center gap-3 text-xs">
                <Controller
                  control={form.control}
                  name="accepted"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-invalid={!!form.formState.errors.accepted}
                    />
                  )}
                />
                {l(
                  "I understand this is a local demo.",
                  "Entiendo que esta es una demo local.",
                )}
              </label>
              {form.formState.errors.accepted && (
                <p
                  role="alert"
                  className="mt-2 text-xs text-destructive-foreground"
                >
                  {form.formState.errors.accepted.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset(saved as z.infer<typeof schema>);
                  setComplete(false);
                }}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" loading={busy}>
                <Save />
                {l("Save workspace", "Guardar espacio")}
              </Button>
            </div>
            {complete && (
              <Alert
                variant="success"
                title={l("A considered start.", "Un comienzo cuidado.")}
              >
                {l(
                  "Your workspace details were saved locally.",
                  "Los detalles del espacio se guardaron localmente.",
                )}
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
      <div className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {l("The form contract", "El comportamiento del formulario")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-xs leading-7 text-muted-foreground">
            {[
              l(
                "Labels and descriptions stay linked to their controls.",
                "Las etiquetas y descripciones están vinculadas a los controles.",
              ),
              l(
                "Errors appear beside the field that needs attention.",
                "Los errores aparecen junto al campo que necesita atención.",
              ),
              l(
                "Submit shows a pending state and prevents repeated actions.",
                "Guardar muestra un estado de carga y evita acciones repetidas.",
              ),
              l(
                "Success confirms the local save without losing context.",
                "El éxito confirma el guardado local sin perder el contexto.",
              ),
            ].map((item) => (
              <p key={item} className="flex items-start gap-2">
                <Check className="mt-1 size-3.5 shrink-0 text-primary" />
                {item}
              </p>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadText(
                  "workspace-demo.json",
                  JSON.stringify(saved, null, 2),
                  "application/json",
                )
              }
            >
              <Download />
              {l("Export saved data", "Exportar datos guardados")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function ProjectSteps() {
  const { l, common: t, locale } = useLanguage(),
    [step, setStep] = useState(0),
    [finish, setFinish] = useState(false),
    [due, setDue] = useState<Date | undefined>(new Date(2026, 10, 1));
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(2, l("Give the project a name.", "Dale un nombre al proyecto.")),
    description: z
      .string()
      .trim()
      .min(
        10,
        l("Add at least 10 characters.", "Añade al menos 10 caracteres."),
      ),
    type: z.enum(["saas", "commerce", "internal"]),
    owner: z.string().min(1),
    budget: z.number().min(0).max(1000000),
    consent: z
      .boolean()
      .refine(
        Boolean,
        l("Confirm the demo details.", "Confirma los detalles de ejemplo."),
      ),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      type: "saas",
      owner: "Alex Morgan",
      budget: 5000,
      consent: false,
    },
  });
  const steps = [
    l("Your direction", "Tu dirección"),
    l("The details", "Los detalles"),
    l("A final look", "Una última mirada"),
  ];
  const fields: (keyof z.infer<typeof schema>)[][] = [
    ["name", "description", "type"],
    ["owner", "budget"],
    ["consent"],
  ];
  const next = async () => {
    if (await form.trigger(fields[step]))
      setStep((current) => Math.min(2, current + 1));
  };
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>
          {l("A thoughtful project brief", "Un brief de proyecto cuidado")}
        </CardTitle>
        <CardDescription>
          {l(
            "Three small steps to a clearer beginning.",
            "Tres pasos pequeños para un comienzo más claro.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {finish ? (
          <div className="py-8 text-center">
            <Check className="mx-auto mb-6 size-10 rounded-full bg-accent p-2 text-primary" />
            <h2 className="editorial text-4xl">
              {l("A good beginning.", "Un buen comienzo.")}
            </h2>
            <p className="mt-4 text-xs text-muted-foreground">
              {l(
                "Your demo brief is ready to download.",
                "Tu brief de ejemplo está listo para descargar.",
              )}
            </p>
            <div className="mt-7 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setFinish(false);
                  setStep(0);
                }}
              >
                {l("Review brief", "Revisar brief")}
              </Button>
              <Button
                onClick={() =>
                  downloadText(
                    "project-brief.json",
                    JSON.stringify(
                      { ...form.getValues(), due: due?.toISOString() },
                      null,
                      2,
                    ),
                    "application/json",
                  )
                }
              >
                <Download />
                {l("Download brief", "Descargar brief")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ol className="mb-8 grid grid-cols-3 gap-3">
              {steps.map((label, i) => (
                <li
                  key={label}
                  aria-current={i === step ? "step" : undefined}
                  className={cn(
                    "border-t-2 pt-4 text-[10px]",
                    i <= step
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground",
                  )}
                >
                  <span className="mr-2 font-semibold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
            <form
              onSubmit={form.handleSubmit(() => setFinish(true))}
              noValidate
              className="grid gap-5"
            >
              {step === 0 && (
                <>
                  <Field
                    label={l("Project name", "Nombre del proyecto")}
                    error={form.formState.errors.name?.message}
                  >
                    <Input {...form.register("name")} maxLength={120} />
                  </Field>
                  <Field
                    label={l("What are you building?", "¿Qué estás creando?")}
                    error={form.formState.errors.description?.message}
                  >
                    <Textarea
                      {...form.register("description")}
                      maxLength={2000}
                      className="min-h-32"
                    />
                  </Field>
                  <fieldset>
                    <legend className="mb-3 text-xs font-semibold">
                      {l("Product direction", "Dirección del producto")}
                    </legend>
                    <Controller
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          aria-label={l(
                            "Product direction",
                            "Dirección del producto",
                          )}
                          className="grid gap-3 sm:grid-cols-3"
                        >
                          {[
                            { value: "saas", label: "SaaS" },
                            {
                              value: "commerce",
                              label: l("Commerce", "Comercio"),
                            },
                            {
                              value: "internal",
                              label: l("Internal tool", "Herramienta interna"),
                            },
                          ].map((item) => (
                            <label
                              key={item.value}
                              className="flex items-center gap-3 rounded-lg border border-border p-4 text-xs"
                            >
                              <RadioGroupItem value={item.value} />
                              {item.label}
                            </label>
                          ))}
                        </RadioGroup>
                      )}
                    />
                  </fieldset>
                </>
              )}
              {step === 1 && (
                <>
                  <Select
                    label={l("Project owner", "Responsable del proyecto")}
                    value={form.watch("owner")}
                    onValueChange={(v) => form.setValue("owner", v)}
                    options={[
                      "Alex Morgan",
                      "Isabel Torres",
                      "Leo Martin",
                      "Noor Ahmed",
                    ].map((value) => ({ value, label: value }))}
                  />
                  <Field
                    label={l(
                      "Illustrative budget (USD)",
                      "Presupuesto ilustrativo (USD)",
                    )}
                    error={form.formState.errors.budget?.message}
                  >
                    <Input
                      type="number"
                      min={0}
                      max={1000000}
                      {...form.register("budget", { valueAsNumber: true })}
                    />
                  </Field>
                  <div>
                    <p className="mb-2 text-xs font-semibold">
                      {l("Target date", "Fecha objetivo")}
                    </p>
                    <DatePicker
                      value={due}
                      onChange={setDue}
                      locale={locale}
                      label={l("Choose a date", "Elige una fecha")}
                    />
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="rounded-lg bg-surface-subtle p-5">
                    <p className="text-sm font-semibold">
                      {form.watch("name")}
                    </p>
                    <p className="mt-3 text-xs leading-7 text-muted-foreground">
                      {form.watch("description")}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">{form.watch("type")}</Badge>
                      <Badge variant="outline">{form.watch("owner")}</Badge>
                      <Badge variant="outline">
                        USD {form.watch("budget")}
                      </Badge>
                    </div>
                  </div>
                  <label className="flex items-center gap-3 text-xs">
                    <Controller
                      control={form.control}
                      name="consent"
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    {l(
                      "These are the demo details I want to export.",
                      "Estos son los detalles de ejemplo que quiero exportar.",
                    )}
                  </label>
                  {form.formState.errors.consent && (
                    <p
                      role="alert"
                      className="text-xs text-destructive-foreground"
                    >
                      {form.formState.errors.consent.message}
                    </p>
                  )}
                </>
              )}
              <div className="mt-4 flex justify-between border-t border-border pt-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  disabled={step === 0}
                >
                  <ArrowLeft />
                  {t("previous")}
                </Button>
                {step < 2 ? (
                  <Button type="button" onClick={() => void next()}>
                    {t("next")}
                    <ArrowRight />
                  </Button>
                ) : (
                  <Button type="submit">
                    {l("Complete demo brief", "Completar brief de ejemplo")}
                    <Check />
                  </Button>
                )}
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
function UploadPattern() {
  const { l } = useLanguage(),
    [files, setFiles] = useState<File[]>([]),
    [complete, setComplete] = useState(false),
    labels = useUploadLabels();
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>
          {l("A place for your inspiration", "Un lugar para tu inspiración")}
        </CardTitle>
        <CardDescription>
          {l(
            "Try dropping a file, removing it or selecting an unsupported type.",
            "Prueba arrastrar un archivo, eliminarlo o seleccionar un tipo no permitido.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FileUpload
          files={files}
          onFilesChange={(next) => {
            setFiles(next);
            setComplete(false);
          }}
          labels={labels}
          accept="image/*,.pdf,.txt,.md,.csv,.json"
        />
        <Button
          className="mt-5 w-full"
          disabled={!files.length}
          onClick={() => setComplete(true)}
        >
          {l("Confirm selected files", "Confirmar archivos seleccionados")}
        </Button>
        {complete && (
          <Alert
            className="mt-5"
            variant="success"
            title={l("Selection confirmed", "Selección confirmada")}
          >
            {l(
              `${files.length} files are ready. This pattern does not upload them to a server.`,
              `${files.length} archivos están listos. Este patrón no los sube a un servidor.`,
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
