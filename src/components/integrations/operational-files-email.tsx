"use client";

import { useEffect, useId, useRef, useState } from "react";
import { File, ImagePlus, Mail, Upload, X } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  initialOperationalValues,
  interpolateOperationalTemplate,
  operationalAction,
  operationalField,
  operationalRasterImage,
  operationalTemplateVariables,
  operationalText,
  operationalUploadLimit,
  operationalValue,
  validOperationalRecipients,
  validateOperationalFile,
  validateOperationalValues,
  withOperationalValue,
} from "./operational-model";
import {
  OperationalEmpty,
  OperationalFields,
  OperationalPanel,
  OperationalPermissionNote,
  OperationalRefresh,
} from "./operational-fields";
import {
  OperationalDate,
  OperationalRecordDetail,
  OperationalRecordTable,
  OperationalUpload,
} from "./operational-results";
import type {
  IntegrationRecord,
  IntegrationResult,
} from "@/lib/integrations/contracts";
import type { OperationalDomainProps } from "./operational-workbench";
import {
  operationalEmailStatus,
  reportedEmailDetails,
} from "./operational-email-events";

export function OperationalFiles({ props, session }: OperationalDomainProps) {
  const { l, number } = useLanguage();
  const id = useId();
  const picker = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [detail, setDetail] = useState<IntegrationRecord | null>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const busy = session.write.pending || session.read.pending;
  const uploadAction = operationalAction(props.definition, "upload");
  const canUpload =
    session.connected && (!uploadAction || session.can(uploadAction));
  const error = file ? validateOperationalFile(file, alt) : null;
  const messages = {
    empty: l("Choose a non-empty file.", "Elige un archivo con contenido."),
    size: l(
      "This workbench accepts files up to 20 MB. Your backend may apply a lower limit.",
      "Este workbench acepta archivos de hasta 20 MB. Tu backend puede aplicar un límite menor.",
    ),
    alt: l(
      "Add alternative text for this image.",
      "Añade texto alternativo para esta imagen.",
    ),
  };
  const choose = (next: File | null) => {
    setFile(next);
    setAlt("");
    setAttempted(false);
    setUploadedFile(null);
    setPreview(
      next &&
        next.size <= operationalUploadLimit &&
        operationalRasterImage(next.type)
        ? URL.createObjectURL(next)
        : null,
    );
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <OperationalPanel
          title={l("Upload a file", "Subir un archivo")}
          description={l(
            "Review the file and its description before uploading.",
            "Revisa el archivo y su descripción antes de subirlo.",
          )}
        >
          <form
            noValidate
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setAttempted(true);
              if (!file || error || busy || !canUpload || uploadedFile === file)
                return;
              const selected = file;
              void session
                .upload(selected, alt.trim() || undefined)
                .then((result) => {
                  if (result?.kind === "upload") setUploadedFile(selected);
                });
            }}
          >
            <input
              ref={picker}
              id={`${id}-file`}
              type="file"
              className="sr-only"
              tabIndex={-1}
              disabled={busy}
              aria-label={l("Choose file", "Elegir archivo")}
              aria-describedby={`${id}-policy`}
              onChange={(event) => choose(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => picker.current?.click()}
              className="group flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 bg-accent/30 p-5 text-center outline-none transition-colors hover:border-primary/60 hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 motion-reduce:transition-none"
              aria-describedby={`${id}-policy`}
            >
              <Upload className="size-6 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold">
                {file
                  ? operationalText(file.name, 200)
                  : l("Choose a file", "Elige un archivo")}
              </span>
              <span className="text-xs text-muted-foreground">
                {file
                  ? `${number(file.size / (1024 * 1024), { maximumFractionDigits: 2 })} MB · ${operationalText(file.type || l("Unknown type", "Tipo desconocido"), 100)}`
                  : l(
                      "Images, documents and other files",
                      "Imágenes, documentos y otros archivos",
                    )}
              </span>
            </button>
            <p
              id={`${id}-policy`}
              className="text-[11px] leading-5 text-muted-foreground"
            >
              {l(
                `Workbench limit: ${number(operationalUploadLimit / (1024 * 1024))} MB. Image previews require alternative text.`,
                `Límite del workbench: ${number(operationalUploadLimit / (1024 * 1024))} MB. Las vistas de imágenes requieren texto alternativo.`,
              )}
            </p>
            <Field
              label={l(
                "Alternative text / description",
                "Texto alternativo / descripción",
              )}
              description={l(
                "Describe the image’s content, rather than its filename.",
                "Describe el contenido de la imagen, en lugar de su nombre de archivo.",
              )}
              error={attempted && error ? messages[error] : undefined}
            >
              <Input
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                disabled={busy || (uploadedFile === file && Boolean(file))}
                maxLength={1000}
                placeholder={l(
                  "A product photo on a light background",
                  "Foto de un producto sobre fondo claro",
                )}
              />
            </Field>
            {attempted && !file && (
              <p role="alert" className="text-xs text-destructive-foreground">
                {l(
                  "Choose a file to continue.",
                  "Elige un archivo para continuar.",
                )}
              </p>
            )}
            {session.write.pending && (
              <div
                role="progressbar"
                aria-label={l(
                  "Uploading; byte progress is unavailable",
                  "Subiendo; el progreso de bytes no está disponible",
                )}
                aria-valuetext={l(
                  "Waiting for the upload response",
                  "Esperando la respuesta de subida",
                )}
                className="overflow-hidden rounded-full bg-surface-subtle"
              >
                <div className="h-1.5 w-full bg-primary/35 motion-safe:animate-pulse motion-reduce:animate-none" />
              </div>
            )}
            <OperationalPermissionNote action={uploadAction} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                appearance="gradient"
                loading={session.write.pending}
                disabled={
                  !canUpload ||
                  session.read.pending ||
                  (uploadedFile === file && Boolean(file))
                }
              >
                <Upload aria-hidden="true" />
                {uploadedFile === file && file
                  ? l("Upload confirmed", "Subida confirmada")
                  : session.write.error &&
                      session.write.errorCode !== "cancelled"
                    ? l("Retry upload", "Reintentar subida")
                    : l("Upload file", "Subir archivo")}
              </Button>
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    choose(null);
                    if (picker.current) picker.current.value = "";
                  }}
                >
                  <X aria-hidden="true" />
                  {l("Clear", "Limpiar")}
                </Button>
              )}
            </div>
          </form>
        </OperationalPanel>
        <OperationalPanel
          title={l("File preview", "Vista previa del archivo")}
          description={l(
            "The selected preview stays on this device until you upload.",
            "La vista seleccionada queda en este dispositivo hasta que la subas.",
          )}
        >
          {file ? (
            <div className="space-y-4">
              <div className="flex min-h-52 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-subtle/50">
                {preview ? (
                  <img
                    src={preview}
                    alt={
                      alt.trim() ||
                      l(
                        "Selected image preview",
                        "Vista previa de la imagen seleccionada",
                      )
                    }
                    className="max-h-72 max-w-full object-contain"
                  />
                ) : (
                  <File
                    className="size-12 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>
              <dl className="grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">
                    {l("Filename", "Nombre")}
                  </dt>
                  <dd className="mt-1 break-all font-medium">
                    {operationalText(file.name, 200)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {l("Size", "Tamaño")}
                  </dt>
                  <dd className="mt-1 font-medium">
                    {number(file.size / 1024, { maximumFractionDigits: 1 })} KB
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">
                    {l("Description", "Descripción")}
                  </dt>
                  <dd className="mt-1 break-words leading-6">
                    {operationalText(alt, 1000) ||
                      l(
                        "Add a description in the upload form.",
                        "Añade una descripción en el formulario de subida.",
                      )}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <OperationalEmpty>
              <ImagePlus
                className="mx-auto mb-3 size-8 text-muted-foreground"
                aria-hidden="true"
              />
              {l(
                "Choose a file to inspect its size and preview.",
                "Elige un archivo para revisar su tamaño y vista previa.",
              )}
            </OperationalEmpty>
          )}
        </OperationalPanel>
      </div>
      {session.snapshot.uploads.length > 0 && (
        <OperationalPanel title={l("Confirmed uploads", "Subidas confirmadas")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {session.snapshot.uploads.map((asset) => (
              <OperationalUpload key={asset.id} asset={asset} />
            ))}
          </div>
        </OperationalPanel>
      )}
      <OperationalPanel
        title={l("File library", "Biblioteca de archivos")}
        accessory={<OperationalRefresh session={session} />}
      >
        <OperationalRecordTable
          records={session.snapshot.records}
          total={session.total}
          loading={session.read.pending}
          error={session.read.error}
          onRetry={() => void session.refresh()}
          onSelect={setDetail}
        />
        {detail && (
          <div className="mt-4">
            <OperationalRecordDetail
              record={
                session.snapshot.records.find(
                  (item) => item.id === detail.id,
                ) ?? detail
              }
            />
          </div>
        )}
      </OperationalPanel>
    </div>
  );
}

function OperationalEmailDelivery({
  delivery,
  demo,
}: {
  delivery: Extract<IntegrationResult, { kind: "delivery" }>["delivery"];
  demo: boolean;
}) {
  const { l } = useLanguage();
  const presentation = operationalEmailStatus(delivery.status);
  const details = reportedEmailDetails(delivery);
  return (
    <article className="space-y-3 rounded-xl border border-border bg-surface-subtle/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-xs font-semibold">
          <Mail className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="break-all">
            {operationalText(delivery.recipient, 200)}
          </span>
        </p>
        <Badge variant={presentation.variant} appearance="soft">
          {l(...presentation.label)}
        </Badge>
      </div>
      <h4 className="break-words text-sm font-semibold">
        {operationalText(delivery.subject, 300)}
      </h4>
      <p className="whitespace-pre-wrap break-words text-xs leading-6">
        {operationalText(delivery.preview, 3000)}
      </p>
      <dl className="grid gap-3 border-t border-border pt-3 text-xs sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-[11px] text-muted-foreground">
            {l("Reported reason code", "Código de motivo reportado")}
          </dt>
          <dd className="mt-1 break-words">
            {details.reasonCode
              ? operationalText(details.reasonCode, 300)
              : l("Not reported", "No reportado")}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] text-muted-foreground">
            {l("Provider event time", "Hora del evento del proveedor")}
          </dt>
          <dd className="mt-1">
            {details.occurredAt ? (
              <OperationalDate value={details.occurredAt} />
            ) : (
              l("Not reported", "No reportada")
            )}
          </dd>
        </div>
      </dl>
      <p className="text-[11px] text-muted-foreground">
        {demo
          ? l(
              "Demo status; no email was sent externally.",
              "Estado demo; no se envió un correo externo.",
            )
          : l(
              "Delivery status reported by the connected backend.",
              "Estado de entrega reportado por el backend conectado.",
            )}
      </p>
    </article>
  );
}

export function OperationalEmail({
  props,
  session,
  stage,
}: OperationalDomainProps) {
  const { l } = useLanguage();
  const send = operationalAction(props.definition, "send-email");
  const [values, setValues] = useState(() => initialOperationalValues(send));
  const [template, setTemplate] = useState("custom");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);
  const [detail, setDetail] = useState<IntegrationRecord | null>(null);
  const subject = operationalValue(send, values, "subject");
  const body = operationalValue(send, values, "content");
  const recipient = operationalValue(send, values, "recipient");
  const variableNames = operationalTemplateVariables(subject, body);
  const renderedSubject = interpolateOperationalTemplate(subject, variables);
  const renderedBody = interpolateOperationalTemplate(body, variables);
  const missing = [
    ...new Set([...renderedSubject.missing, ...renderedBody.missing]),
  ];
  const variableField = operationalField(send, "variables");
  const recipientField = operationalField(send, "recipient");
  const multipleRecipients =
    recipientField &&
    /recipients|addresses|list/i.test(
      `${recipientField.id} ${recipientField.label.en}`,
    );
  let prepared = withOperationalValue(
    send,
    values,
    "subject",
    renderedSubject.text,
  );
  prepared = withOperationalValue(send, prepared, "content", renderedBody.text);
  if (variableField?.type === "text")
    prepared = {
      ...prepared,
      [variableField.id]: JSON.stringify(
        Object.fromEntries(
          variableNames.map((name) => [name, variables[name] ?? ""]),
        ),
      ),
    };
  const recipientInvalid =
    recipientField?.type === "text" &&
    !validOperationalRecipients(recipient, multipleRecipients ? 100 : 1);
  const errors = send ? validateOperationalValues(send, prepared) : {};
  const busy = session.write.pending || session.read.pending;
  const templates = {
    welcome: {
      subject: l("Welcome, {{name}}", "Te damos la bienvenida, {{name}}"),
      body: l(
        "Hi {{name}},\n\nYour {{workspace}} workspace is ready. You can open it here:\n{{url}}\n\nWelcome aboard.",
        "Hola, {{name}}:\n\nTu espacio {{workspace}} está listo. Puedes abrirlo aquí:\n{{url}}\n\nTe damos la bienvenida.",
      ),
    },
    digest: {
      subject: l(
        "Your {{workspace}} weekly update",
        "Tu resumen semanal de {{workspace}}",
      ),
      body: l(
        "Hi {{name}},\n\nHere is this week’s update:\n{{summary}}\n\nSee the full activity at {{url}}.",
        "Hola, {{name}}:\n\nEste es el resumen de la semana:\n{{summary}}\n\nRevisa toda la actividad en {{url}}.",
      ),
    },
    update: {
      subject: l(
        "An update about {{project}}",
        "Una actualización sobre {{project}}",
      ),
      body: l(
        "Hi {{name}},\n\n{{message}}\n\nThanks,\n{{team}}",
        "Hola, {{name}}:\n\n{{message}}\n\nGracias,\n{{team}}",
      ),
    },
  };
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <OperationalPanel
          title={l("Compose an email", "Redactar un correo")}
          description={l(
            "Draft, fill the variables and review the final message before sending.",
            "Redacta, completa las variables y revisa el mensaje final antes de enviarlo.",
          )}
        >
          {!send ? (
            <OperationalEmpty>
              {l(
                "This connection does not expose email sending.",
                "Esta conexión no ofrece envío de correo.",
              )}
            </OperationalEmpty>
          ) : (
            <form
              noValidate
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setAttempted(true);
                if (
                  busy ||
                  !session.can(send) ||
                  Object.keys(errors).length ||
                  recipientInvalid ||
                  missing.length
                )
                  return;
                stage(send, prepared, {
                  review: true,
                  content: renderedBody.text,
                });
              }}
            >
              <Field
                label={l("Draft example", "Ejemplo de borrador")}
                description={l(
                  "Local starting points. Provider template choices remain in the fields below.",
                  "Puntos de partida locales. Las plantillas del proveedor siguen en los campos de abajo.",
                )}
              >
                <Select
                  value={template}
                  options={[
                    {
                      value: "custom",
                      label: l("Custom draft", "Borrador propio"),
                    },
                    { value: "welcome", label: l("Welcome", "Bienvenida") },
                    {
                      value: "digest",
                      label: l("Weekly digest", "Resumen semanal"),
                    },
                    {
                      value: "update",
                      label: l("Project update", "Actualización de proyecto"),
                    },
                  ]}
                  onValueChange={(value) => {
                    setTemplate(value);
                    setVariables({});
                    if (value !== "custom") {
                      const draft = templates[value as keyof typeof templates];
                      if (draft)
                        setValues(
                          withOperationalValue(
                            send,
                            withOperationalValue(
                              send,
                              values,
                              "subject",
                              draft.subject,
                            ),
                            "content",
                            draft.body,
                          ),
                        );
                    }
                  }}
                  disabled={busy}
                />
              </Field>
              <OperationalFields
                action={send}
                values={values}
                onChange={setValues}
                disabled={busy}
                errors={attempted ? errors : {}}
                exclude={
                  variableField?.type === "text" ? [variableField.id] : []
                }
              />
              {variableNames.length > 0 && (
                <fieldset className="space-y-3 rounded-xl border border-border bg-surface-subtle/40 p-4">
                  <legend className="px-1 text-xs font-semibold">
                    {l("Template variables", "Variables de plantilla")}
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {variableNames.map((name) => (
                      <Field
                        key={name}
                        label={name}
                        error={
                          attempted && missing.includes(name)
                            ? l(
                                "Complete this variable.",
                                "Completa esta variable.",
                              )
                            : undefined
                        }
                      >
                        <Input
                          value={variables[name] ?? ""}
                          onChange={(event) =>
                            setVariables({
                              ...variables,
                              [name]: event.target.value,
                            })
                          }
                          disabled={busy}
                        />
                      </Field>
                    ))}
                  </div>
                </fieldset>
              )}
              {attempted && recipientInvalid && (
                <p role="alert" className="text-xs text-destructive-foreground">
                  {l(
                    "Enter a valid recipient email address.",
                    "Escribe un correo válido para el destinatario.",
                  )}
                </p>
              )}
              <OperationalPermissionNote action={send} />
              <Button
                type="submit"
                appearance="gradient"
                disabled={!session.can(send)}
                loading={busy}
              >
                <Mail aria-hidden="true" />
                {l("Review email", "Revisar correo")}
              </Button>
            </form>
          )}
        </OperationalPanel>
        <OperationalPanel
          title={l("Content preview", "Vista previa del contenido")}
          description={l(
            "Plain-text preview of the values that will be submitted.",
            "Vista en texto del contenido que se enviará.",
          )}
        >
          <article className="overflow-hidden rounded-xl border border-border">
            <dl className="space-y-3 border-b border-border bg-surface-subtle/50 p-4 text-xs">
              <div className="flex gap-3">
                <dt className="w-14 shrink-0 text-muted-foreground">
                  {l("To", "Para")}
                </dt>
                <dd className="break-all">
                  {operationalText(recipient, 500) ||
                    l("Add a recipient", "Añade un destinatario")}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-14 shrink-0 text-muted-foreground">
                  {l("Subject", "Asunto")}
                </dt>
                <dd className="break-words font-semibold">
                  {operationalText(renderedSubject.text, 500) ||
                    l("Add a subject", "Añade un asunto")}
                </dd>
              </div>
            </dl>
            <div className="min-h-52 whitespace-pre-wrap break-words p-5 text-sm leading-7">
              {operationalText(renderedBody.text, 8000) ||
                l(
                  "Your message preview appears here.",
                  "La vista previa de tu mensaje aparece aquí.",
                )}
            </div>
          </article>
          {missing.length > 0 && (
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {l("Variables still to fill:", "Variables por completar:")}{" "}
              {missing.map((name) => operationalText(name, 60)).join(", ")}
            </p>
          )}
        </OperationalPanel>
      </div>
      <OperationalPanel
        title={l("Delivery queue", "Cola de entrega")}
        description={l(
          "Statuses come from the backend. A queued response is not a delivery confirmation.",
          "Los estados vienen del backend. Una respuesta en cola no confirma la entrega.",
        )}
        accessory={<OperationalRefresh session={session} />}
      >
        {session.snapshot.deliveries.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[...session.snapshot.deliveries].reverse().map((delivery) => (
              <div key={delivery.id} className="space-y-2">
                <OperationalEmailDelivery
                  delivery={delivery}
                  demo={props.adapter.mode === "demo"}
                />
                {["failed", "rejected", "bounced"].includes(delivery.status) &&
                  send && (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy || !session.can(send)}
                        onClick={() => {
                          let next = initialOperationalValues(send);
                          next = withOperationalValue(
                            send,
                            next,
                            "recipient",
                            delivery.recipient,
                          );
                          next = withOperationalValue(
                            send,
                            next,
                            "subject",
                            delivery.subject,
                          );
                          next = withOperationalValue(
                            send,
                            next,
                            "content",
                            delivery.preview,
                          );
                          setValues(next);
                          setTemplate("custom");
                          setVariables({});
                          setAttempted(false);
                        }}
                      >
                        {l(
                          "Edit a retry draft",
                          "Editar borrador para reintentar",
                        )}
                      </Button>
                      <p className="text-[11px] leading-5 text-muted-foreground">
                        {l(
                          "Review the recipient and reported cause before sending a new message. The backend owns suppression and retry policy.",
                          "Revisa el destinatario y el motivo reportado antes de enviar otro mensaje. El backend controla la supresión y la política de reintentos.",
                        )}
                      </p>
                    </div>
                  )}
              </div>
            ))}
          </div>
        ) : (
          <OperationalEmpty>
            {l(
              "No email responses in this session yet.",
              "Aún no hay respuestas de correo en esta sesión.",
            )}
          </OperationalEmpty>
        )}
        <div className="mt-5">
          <OperationalRecordTable
            records={session.snapshot.records}
            total={session.total}
            loading={session.read.pending}
            error={session.read.error}
            onRetry={() => void session.refresh()}
            onSelect={setDetail}
          />
        </div>
        {detail && (
          <div className="mt-4">
            <OperationalRecordDetail
              record={
                session.snapshot.records.find(
                  (record) => record.id === detail.id,
                ) ?? detail
              }
            />
          </div>
        )}
      </OperationalPanel>
    </div>
  );
}
