"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Check, Plus, Users } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useWorkspace } from "@/components/workspace-provider";
import {
  WorkspaceLoading,
  WorkspacePermission,
  WorkspaceStatus,
} from "@/components/blocks/workspace-status";
import { MemberManagement } from "@/components/blocks/member-management";
import {
  OnboardingTemplate,
  WorkspaceSettingsTemplate,
} from "@/components/templates/saas-setup";
import { CustomerDetailTemplate } from "@/components/templates/customer-detail";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SaasError } from "@/lib/saas";
import {
  getDemoCustomerAvatarSrc,
  getDemoMemberAvatarSrc,
  getDemoNoteAuthorAvatarSrc,
} from "@/demo/avatar-assets";

/** Translate domain failures at the application boundary, keeping blocks reusable. */
export function useSaasAction() {
  const { l } = useLanguage();
  return <T,>(action: () => T): T => {
    try {
      return action();
    } catch (cause) {
      if (!(cause instanceof SaasError)) throw cause;
      const messages = {
        permission: l(
          "Your role cannot make this change.",
          "Tu rol no permite realizar este cambio.",
        ),
        invalid: l(
          "Review the details and try again.",
          "Revisa los datos e inténtalo de nuevo.",
        ),
        duplicate: l(
          "That email or workspace identifier already exists.",
          "Ese correo o identificador de espacio ya existe.",
        ),
        owner: l(
          "Transfer ownership before changing the owner.",
          "Transfiere la titularidad antes de cambiar al propietario.",
        ),
        expired: l(
          "This invitation has expired. Renew it first.",
          "Esta invitación ha caducado. Renuévala primero.",
        ),
        missing: l(
          "This record is no longer available in this workspace.",
          "Este registro ya no está disponible en este espacio.",
        ),
      };
      throw new Error(messages[cause.code], { cause });
    }
  };
}

export function OnboardingOperationsTemplate() {
  const scope = useWorkspace();
  const { l, locale } = useLanguage();
  const router = useRouter();
  const action = useSaasAction();
  if (!scope.ready) return <WorkspaceLoading />;
  const start = () =>
    scope.setOnboarding({
      step: 0,
      organizationName: scope.workspace.organizationName,
      workspaceName: "",
      workspaceSlug: "",
      invites: [],
      completed: false,
    });
  return (
    <div className="grid min-w-0 gap-5">
      <WorkspaceStatus />
      {scope.role === "viewer" ? (
        <WorkspacePermission
          description={l(
            "Ask a member or administrator to create a new workspace.",
            "Pide a un miembro o administrador que cree un nuevo espacio.",
          )}
        />
      ) : (
        <OnboardingTemplate
          locale={locale}
          value={scope.onboarding}
          onChange={scope.setOnboarding}
          onComplete={(value) => action(() => scope.completeOnboarding(value))}
          onOpenCustomers={() => router.push(`/${locale}/customers/`)}
          onOpenImports={() => router.push(`/${locale}/imports/`)}
        />
      )}
      {scope.onboarding.completed && scope.role !== "viewer" && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={start}>
            <Plus aria-hidden />
            {l("Create another workspace", "Crear otro espacio")}
          </Button>
        </div>
      )}
    </div>
  );
}

export function WorkspaceOperationsPanel() {
  const scope = useWorkspace();
  const { l, locale } = useLanguage();
  const router = useRouter();
  const action = useSaasAction();
  if (!scope.ready) return <WorkspaceLoading />;
  return (
    <div className="grid gap-5">
      <WorkspaceStatus />
      <WorkspaceSettingsTemplate
        locale={locale}
        workspace={scope.workspace}
        canManage={scope.can("workspace.manage")}
        onSave={(workspace) =>
          action(() =>
            scope.updateWorkspace({
              ...workspace,
              organizationName: scope.workspace.organizationName,
            }),
          )
        }
        onCreate={
          scope.role === "viewer"
            ? undefined
            : () => {
                scope.setOnboarding({
                  step: 0,
                  organizationName: scope.workspace.organizationName,
                  workspaceName: "",
                  workspaceSlug: "",
                  invites: [],
                  completed: false,
                });
                router.push(`/${locale}/onboarding/`);
              }
        }
      />
      <Card appearance="gradient">
        <CardContent className="flex flex-wrap items-center justify-between gap-5 py-6">
          <div className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-surface/80 text-primary">
              <Building2 aria-hidden className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                {scope.workspace.organizationName}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {l(
                  "A shared home for your team and customers.",
                  "Un lugar compartido para tu equipo y tus clientes.",
                )}
              </p>
            </div>
          </div>
          <Badge variant="outline">
            {
              scope.members.filter((member) => member.status === "active")
                .length
            }{" "}
            {l("members", "miembros")}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

export function MembersOperationsPanel() {
  const scope = useWorkspace();
  const { l, locale } = useLanguage();
  const action = useSaasAction();
  const [checkedAt] = useState(() => Date.now());
  const members = useMemo(
    () =>
      scope.members.map((member) => ({
        ...member,
        avatarSrc: getDemoMemberAvatarSrc(scope.workspaceId, member.id),
      })),
    [scope.members, scope.workspaceId],
  );
  if (!scope.ready) return <WorkspaceLoading />;
  return (
    <div className="grid gap-5">
      <WorkspaceStatus />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: l("Active members", "Miembros activos"),
            value: scope.members.filter((item) => item.status === "active")
              .length,
            icon: Users,
          },
          {
            label: l("Pending invitations", "Invitaciones pendientes"),
            value: scope.invitations.filter(
              (item) =>
                item.status === "pending" &&
                Date.parse(item.expiresAt) > checkedAt,
            ).length,
            icon: Plus,
          },
          {
            label: l("Workspace owner", "Titular del espacio"),
            value:
              scope.members.find((item) => item.role === "owner")?.name ?? "—",
            icon: Check,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} appearance="flat">
            <CardContent className="py-5">
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Icon aria-hidden className="size-3.5 text-primary" />
                {label}
              </div>
              <p className="truncate text-xl font-semibold tracking-tight">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <MemberManagement
        key={scope.workspaceId}
        locale={locale}
        members={members}
        invitations={scope.invitations}
        currentMemberId={scope.currentMemberId}
        canManage={scope.can("members.manage")}
        canTransferOwnership={
          scope.can("ownership.transfer") &&
          scope.currentMember.role === "owner"
        }
        onInvite={(email, role) =>
          action(() => scope.inviteMember(email, role))
        }
        onChangeRole={(id, role) =>
          action(() => scope.changeMemberRole(id, role))
        }
        onRemoveMember={(id) => action(() => scope.removeMember(id))}
        onResendInvitation={(id) => action(() => scope.resendInvitation(id))}
        onAcceptInvitation={(id) => action(() => scope.acceptInvitation(id))}
        onRevokeInvitation={(id) => action(() => scope.revokeInvitation(id))}
        onTransferOwnership={(id) => action(() => scope.transferOwnership(id))}
      />
    </div>
  );
}

export function CustomerRecordOperationsTemplate() {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <CustomerRecordWorkspace />
    </Suspense>
  );
}

function CustomerRecordWorkspace() {
  const scope = useWorkspace();
  const { l, locale } = useLanguage();
  const action = useSaasAction();
  const customerId = useSearchParams().get("id") ?? "";
  const customer =
    scope.customers.find((item) => item.id === customerId) ?? null;
  const notes = useMemo(
    () =>
      (scope.notes[customerId] ?? []).map((note) => ({
        ...note,
        authorAvatarSrc:
          "authorMemberId" in note && typeof note.authorMemberId === "string"
            ? getDemoMemberAvatarSrc(scope.workspaceId, note.authorMemberId)
            : getDemoNoteAuthorAvatarSrc(scope.workspaceId, note.id),
      })),
    [scope.notes, scope.workspaceId, customerId],
  );
  if (!scope.ready) return <WorkspaceLoading />;
  return (
    <div className="grid min-w-0 gap-5">
      <WorkspaceStatus />
      <CustomerDetailTemplate
        key={`${scope.workspaceId}:${customerId}`}
        customer={customer}
        avatarSrc={
          customer
            ? getDemoCustomerAvatarSrc(scope.workspaceId, customer.id)
            : undefined
        }
        canEdit={scope.can("customers.write")}
        onSave={(next) =>
          action(() => {
            scope.setCustomers((previous) =>
              previous.map((item) =>
                item.id === next.id
                  ? { ...next, id: item.id, joined: item.joined }
                  : item,
              ),
            );
            scope.recordActivity(
              "Customer updated · Cliente actualizado",
              "customer",
              next.id,
            );
          })
        }
        notes={notes}
        onAddNote={
          scope.can("notes.write")
            ? (text) => action(() => scope.addNote(customerId, text))
            : undefined
        }
        activity={scope.activity
          .filter((item) => item.resourceId === customerId)
          .map((item) => {
            const parts = item.detail.split(" · ");
            return {
              ...item,
              detail:
                parts.length === 2
                  ? parts[locale === "es" ? 1 : 0]
                  : item.detail,
            };
          })}
        attachedFiles={scope.files[customerId] ?? []}
        onAttach={
          scope.can("customers.write")
            ? (files) => action(() => scope.attachFiles(customerId, files))
            : undefined
        }
        filesDescription={l(
          "This demo keeps file names and details in this browser.",
          "Esta demo conserva los nombres y detalles de los archivos en este navegador.",
        )}
        backHref={`/${locale}/customers/`}
      />
      {customer && !scope.can("customers.write") && (
        <Alert
          variant="info"
          title={l(
            "Team context, in one place",
            "El contexto del equipo, en un lugar",
          )}
        >
          {l(
            "You can explore this customer’s history, notes and files with your current role.",
            "Con tu rol puedes consultar la historia, las notas y los archivos de este cliente.",
          )}
        </Alert>
      )}
    </div>
  );
}
