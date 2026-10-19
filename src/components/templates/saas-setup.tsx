"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Building2, Check, Plus, RotateCcw, Save } from "lucide-react";
import {
  OnboardingFlow,
  type OnboardingFlowProps,
} from "@/components/blocks/onboarding-flow";
import { PageHeading } from "@/components/blocks/page-heading";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type OnboardingTemplateProps = OnboardingFlowProps;
export function OnboardingTemplate(props: OnboardingTemplateProps) {
  const es = props.locale === "es";
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeading
        eyebrow={es ? "Un buen comienzo" : "A good beginning"}
        title={
          es ? "Crea tu espacio compartido." : "Build your shared workspace."
        }
        description={
          es
            ? "Organiza tu equipo y elige una primera acción, a tu ritmo."
            : "Bring your team together and choose a first action, at your own pace."
        }
      />
      <OnboardingFlow {...props} />
    </div>
  );
}

export type WorkspaceSettingsValue = {
  id: string;
  name: string;
  slug: string;
  description: string;
};
export type WorkspaceSettingsTemplateProps = {
  workspace: WorkspaceSettingsValue;
  onSave: (workspace: WorkspaceSettingsValue) => void | Promise<void>;
  canManage: boolean;
  onCreate?: () => void | Promise<void>;
  locale?: "en" | "es";
  className?: string;
};
type WorkspaceErrors = Partial<Record<"name" | "slug" | "description", string>>;
function sameWorkspace(a: WorkspaceSettingsValue, b: WorkspaceSettingsValue) {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.slug === b.slug &&
    a.description === b.description
  );
}
function normalizedWorkspace(
  value: WorkspaceSettingsValue,
): WorkspaceSettingsValue {
  return {
    id: value.id,
    name: value.name.trim(),
    slug: value.slug.trim(),
    description: value.description.trim(),
  };
}

export function WorkspaceSettingsTemplate(
  props: WorkspaceSettingsTemplateProps,
) {
  return <WorkspaceSettingsForm key={props.workspace.id} {...props} />;
}
function WorkspaceSettingsForm({
  workspace,
  onSave,
  canManage,
  onCreate,
  locale = "en",
  className,
}: WorkspaceSettingsTemplateProps) {
  const l = (en: string, es: string) => (locale === "es" ? es : en);
  const id = useId();
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const [editor, setEditor] = useState({
    source: workspace,
    draft: workspace,
    conflict: false,
  });
  const [errors, setErrors] = useState<WorkspaceErrors>({});
  const [pending, setPending] = useState<"save" | "create" | null>(null);
  const [failure, setFailure] = useState("");
  const [saved, setSaved] = useState(false);
  const dirty = !sameWorkspace(editor.draft, workspace);
  if (!sameWorkspace(editor.source, workspace)) {
    const hasDraft = !sameWorkspace(editor.source, editor.draft);
    const matchesDraft = sameWorkspace(
      normalizedWorkspace(editor.draft),
      workspace,
    );
    setEditor({
      source: workspace,
      draft: hasDraft && !matchesDraft ? editor.draft : workspace,
      conflict: hasDraft && !matchesDraft,
    });
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reset = () => {
    if (inFlight.current) return;
    setEditor({ source: workspace, draft: workspace, conflict: false });
    setErrors({});
    setFailure("");
    setSaved(false);
  };
  const change = (next: Partial<WorkspaceSettingsValue>) => {
    if (!canManage || inFlight.current) return;
    setEditor((current) => ({
      ...current,
      draft: { ...current.draft, ...next },
    }));
    setErrors({});
    setFailure("");
    setSaved(false);
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || inFlight.current || editor.conflict || !dirty) return;
    const next = normalizedWorkspace({ ...editor.draft, id: workspace.id });
    const nextErrors: WorkspaceErrors = {};
    if (next.name.length < 2 || next.name.length > 100)
      nextErrors.name = l(
        "Use 2–100 characters for the workspace name.",
        "Usa entre 2 y 100 caracteres para el nombre.",
      );
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(next.slug) ||
      next.slug.length < 2 ||
      next.slug.length > 64
    )
      nextErrors.slug = l(
        "Use 2–64 lowercase letters, numbers and single hyphens.",
        "Usa entre 2 y 64 letras minúsculas, números y guiones simples.",
      );
    if (next.description.length > 500)
      nextErrors.description = l(
        "Keep the description within 500 characters.",
        "Limita la descripción a 500 caracteres.",
      );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    inFlight.current = true;
    setPending("save");
    setFailure("");
    setSaved(false);
    try {
      await onSave(next);
      if (mounted.current) {
        setEditor((current) => ({
          ...current,
          draft: current.conflict ? current.draft : next,
        }));
        setSaved(true);
      }
    } catch (cause) {
      if (mounted.current)
        setFailure(
          cause instanceof Error && cause.message
            ? cause.message
            : l(
                "The workspace could not be saved. Your draft is still here.",
                "No se pudo guardar el espacio. Tu borrador sigue aquí.",
              ),
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(null);
    }
  };
  const create = async () => {
    if (!canManage || !onCreate || inFlight.current || dirty) return;
    inFlight.current = true;
    setPending("create");
    setFailure("");
    setSaved(false);
    try {
      await onCreate();
    } catch (cause) {
      if (mounted.current)
        setFailure(
          cause instanceof Error && cause.message
            ? cause.message
            : l(
                "A new workspace could not be opened. Try again.",
                "No se pudo abrir un nuevo espacio. Reintenta.",
              ),
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(null);
    }
  };

  return (
    <section
      className={cn("grid min-w-0 gap-6", className)}
      aria-label={l("Workspace settings", "Ajustes del espacio")}
    >
      <PageHeading
        eyebrow={l("Your shared space", "Tu espacio compartido")}
        title={l("Workspace settings", "Ajustes del espacio")}
        description={l(
          "Keep the name, identifier and purpose clear for everyone.",
          "Mantén claros el nombre, identificador y propósito para todos.",
        )}
        actions={
          onCreate && canManage ? (
            <Button
              type="button"
              variant="outline"
              disabled={!!pending || dirty}
              loading={pending === "create"}
              onClick={() => void create()}
            >
              <Plus aria-hidden="true" />
              {l("New workspace", "Nuevo espacio")}
            </Button>
          ) : undefined
        }
      />
      {!canManage && (
        <Alert title={l("View access", "Acceso de lectura")}>
          {l(
            "You can review this workspace. Ask an administrator to update its details.",
            "Puedes consultar este espacio. Pide a un administrador que actualice sus datos.",
          )}
        </Alert>
      )}
      <Card appearance="elevated">
        <CardHeader className="border-b border-primary/15 bg-[radial-gradient(ellipse_at_top_right,var(--accent),transparent_75%)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-3">
              <span className="rounded-xl border border-primary/20 bg-accent p-3 text-primary">
                <Building2 aria-hidden="true" className="size-5" />
              </span>
              {l("Workspace details", "Datos del espacio")}
            </CardTitle>
            <Badge variant={dirty ? "warning" : "outline"}>
              {dirty
                ? l("Unsaved changes", "Cambios sin guardar")
                : l("Up to date", "Actualizado")}
            </Badge>
          </div>
          <CardDescription>
            {l(
              "Save your draft before opening a new workspace.",
              "Guarda tu borrador antes de abrir un nuevo espacio.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            noValidate
            onSubmit={(event) => void save(event)}
            aria-busy={!!pending}
            className="grid gap-5"
          >
            {editor.conflict && (
              <Alert
                variant="warning"
                title={l("The workspace changed", "El espacio ha cambiado")}
              >
                {l(
                  "Your draft is preserved. Load the latest details before saving so you do not overwrite another change.",
                  "Tu borrador se conserva. Carga los datos actuales antes de guardar para no sobrescribir otro cambio.",
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  disabled={!!pending}
                  onClick={reset}
                >
                  <RotateCcw aria-hidden="true" />
                  {l("Load latest details", "Cargar datos actuales")}
                </Button>
              </Alert>
            )}
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                htmlFor={`${id}-name`}
                label={l("Workspace name", "Nombre del espacio")}
                error={errors.name}
              >
                <Input
                  name="workspaceName"
                  value={editor.draft.name}
                  maxLength={100}
                  disabled={!canManage || !!pending}
                  onChange={(event) => change({ name: event.target.value })}
                />
              </Field>
              <Field
                htmlFor={`${id}-slug`}
                label={l("Workspace identifier", "Identificador del espacio")}
                description={l(
                  "Lowercase letters, numbers and hyphens.",
                  "Letras minúsculas, números y guiones.",
                )}
                error={errors.slug}
              >
                <Input
                  name="workspaceSlug"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={editor.draft.slug}
                  maxLength={64}
                  disabled={!canManage || !!pending}
                  onChange={(event) => change({ slug: event.target.value })}
                />
              </Field>
            </div>
            <Field
              htmlFor={`${id}-description`}
              label={l("Description", "Descripción")}
              description={l(
                "Help the team understand what this workspace is for.",
                "Ayuda al equipo a entender el propósito del espacio.",
              )}
              error={errors.description}
            >
              <Textarea
                name="workspaceDescription"
                value={editor.draft.description}
                maxLength={500}
                disabled={!canManage || !!pending}
                onChange={(event) =>
                  change({ description: event.target.value })
                }
              />
            </Field>
            {failure && (
              <Alert
                variant="destructive"
                title={l(
                  "The change needs another try",
                  "Hay que reintentar el cambio",
                )}
              >
                {failure}
              </Alert>
            )}
            {saved && !editor.conflict && (
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-primary"
              >
                <Check aria-hidden="true" className="size-4" />
                {l(
                  "Workspace changes saved.",
                  "Cambios del espacio guardados.",
                )}
              </p>
            )}
            {canManage && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                <p className="text-xs text-muted-foreground">
                  {dirty
                    ? l(
                        "Your draft is not saved yet.",
                        "Tu borrador aún no está guardado.",
                      )
                    : l(
                        "These are the current workspace details.",
                        "Estos son los datos actuales del espacio.",
                      )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!dirty || !!pending}
                    onClick={reset}
                  >
                    <RotateCcw aria-hidden="true" />
                    {l("Reset changes", "Restablecer cambios")}
                  </Button>
                  <Button
                    type="submit"
                    appearance="gradient"
                    loading={pending === "save"}
                    disabled={!dirty || !!pending || editor.conflict}
                  >
                    <Save aria-hidden="true" />
                    {l("Save workspace", "Guardar espacio")}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
