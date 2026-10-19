"use client";

import { Building2, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useWorkspace } from "@/components/workspace-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkspaceRole } from "@/lib/saas";

/** A demo control for inspecting the same workflow through different roles. */
export function WorkspaceStatus({ roles = true }: { roles?: boolean }) {
  const { l } = useLanguage();
  const scope = useWorkspace();
  const roleNames: Record<WorkspaceRole, string> = {
    owner: l("Owner", "Titular"),
    admin: l("Administrator", "Administrador"),
    member: l("Member", "Miembro"),
    viewer: l("Viewer", "Lector"),
  };
  return (
    <div className="grid gap-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/80 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Building2 aria-hidden className="size-4 shrink-0 text-primary" />
          <span className="truncate text-xs font-semibold">{scope.workspace.name}</span>
          <Badge variant="outline">{roleNames[scope.role]}</Badge>
        </div>
        {roles && (
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-muted-foreground" aria-hidden />
            <Select
              aria-label={l("Preview role", "Ver como")}
              value={scope.previewRole ?? "actual"}
              options={[
                { value: "actual", label: l("Your role", "Tu rol") },
                ...(["owner", "admin", "member", "viewer"] as WorkspaceRole[]).map((role) => ({ value: role, label: roleNames[role] })),
              ]}
              onValueChange={(role) => scope.setPreviewRole(role === "actual" ? null : role as WorkspaceRole)}
              className="h-8 min-w-36 text-xs"
            />
          </div>
        )}
      </div>
      {scope.persistenceError && (
        <Alert variant="warning" title={l("Changes are kept in this session", "Los cambios se conservan en esta sesión")}>
          <p>{l("Browser storage could not be used. Try saving again before you leave.", "No se pudo usar el almacenamiento del navegador. Intenta guardar de nuevo antes de salir.")}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={scope.retryPersistence}>{l("Try saving again", "Reintentar guardado")}</Button>
        </Alert>
      )}
    </div>
  );
}

export function WorkspaceLoading() {
  const { l } = useLanguage();
  return (
    <div role="status" aria-label={l("Loading workspace", "Cargando workspace")} className="grid gap-5">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-72 w-full" />
      <span className="sr-only">{l("Loading workspace", "Cargando workspace")}</span>
    </div>
  );
}

export function WorkspacePermission({ description }: { description?: string }) {
  const { l } = useLanguage();
  return (
    <Alert variant="info" title={l("Read-only access", "Acceso de lectura")}>
      {description ?? l("Your role can view this workspace. An administrator can help with changes.", "Tu rol permite consultar este workspace. Un administrador puede ayudarte con los cambios.")}
    </Alert>
  );
}
