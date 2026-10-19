"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  Crown,
  Mail,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty } from "@/components/ui/empty";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type MemberRole = "owner" | "admin" | "member" | "viewer";
export type InvitationRole = Exclude<MemberRole, "owner">;
export type ManagedMember = {
  id: string;
  name: string;
  avatarSrc?: string;
  email: string;
  role: MemberRole;
  status: "active" | "suspended";
  joinedAt: string;
};
export type ManagedInvitation = {
  id: string;
  email: string;
  role: InvitationRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: string;
};
export type MemberManagementProps = {
  members: ManagedMember[];
  invitations: ManagedInvitation[];
  currentMemberId: string;
  canManage: boolean;
  canTransferOwnership?: boolean;
  onInvite: (email: string, role: InvitationRole) => void | Promise<void>;
  onChangeRole: (id: string, role: InvitationRole) => void | Promise<void>;
  onRemoveMember: (id: string) => void | Promise<void>;
  onResendInvitation: (id: string) => void | Promise<void>;
  onAcceptInvitation: (id: string) => void | Promise<void>;
  onRevokeInvitation: (id: string) => void | Promise<void>;
  onTransferOwnership: (id: string) => void | Promise<void>;
  locale?: "en" | "es";
  className?: string;
};

type Confirmation = { kind: "remove" | "revoke" | "transfer"; id: string };
const emailSchema = z.email();
function assignableRole(value: string): value is InvitationRole {
  return value === "admin" || value === "member" || value === "viewer";
}

/** The caller owns every member/invitation mutation and its permission boundary. */
export function MemberManagement({
  members,
  invitations,
  currentMemberId,
  canManage,
  canTransferOwnership = false,
  onInvite,
  onChangeRole,
  onRemoveMember,
  onResendInvitation,
  onAcceptInvitation,
  onRevokeInvitation,
  onTransferOwnership,
  locale = "en",
  className,
}: MemberManagementProps) {
  const l = (en: string, es: string) => (locale === "es" ? es : en);
  const id = useId();
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("member");
  const [emailError, setEmailError] = useState("");
  const [pending, setPending] = useState("");
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const owners = members.filter((member) => member.role === "owner");
  const activeOwners = owners.filter((member) => member.status === "active");
  const busy = !!pending;
  const roleLabels: Record<MemberRole, string> = {
    owner: l("Owner", "Propietario"),
    admin: l("Admin", "Administrador"),
    member: l("Member", "Miembro"),
    viewer: l("Viewer", "Lector"),
  };
  const roles = (["admin", "member", "viewer"] as const).map((value) => ({
    value,
    label: roleLabels[value],
  }));
  const statusLabels: Record<ManagedInvitation["status"], string> = {
    pending: l("Pending", "Pendiente"),
    accepted: l("Accepted", "Aceptada"),
    expired: l("Expired", "Caducada"),
    revoked: l("Revoked", "Revocada"),
  };
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const visibleMembers = members.filter((member) =>
    `${member.name} ${member.email}`
      .toLocaleLowerCase(locale)
      .includes(normalizedQuery),
  );
  const visibleInvitations = invitations.filter((invitation) =>
    invitation.email.toLocaleLowerCase(locale).includes(normalizedQuery),
  );
  const protectedOwner = (member: ManagedMember) =>
    member.role === "owner" &&
    (owners.length <= 1 ||
      (member.status === "active" && activeOwners.length <= 1));
  const editable = (member: ManagedMember) =>
    canManage && member.id !== currentMemberId && !protectedOwner(member);
  const transferable = (member: ManagedMember) =>
    canManage &&
    canTransferOwnership &&
    member.id !== currentMemberId &&
    member.role !== "owner" &&
    member.status === "active";
  const formatDate = (value: string) => {
    const parsed = new Date(
      /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value,
    );
    return Number.isNaN(parsed.getTime())
      ? l("Not available", "No disponible")
      : new Intl.DateTimeFormat(locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(parsed);
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = async (
    label: string,
    action: () => void | Promise<void>,
    success: string,
  ) => {
    if (!canManage || inFlight.current) return false;
    inFlight.current = true;
    setPending(label);
    setFailure("");
    setNotice("");
    try {
      await action();
      if (mounted.current) setNotice(success);
      return true;
    } catch (cause) {
      if (mounted.current)
        setFailure(
          cause instanceof Error && cause.message
            ? cause.message
            : l(
                "The change could not be completed. Try again.",
                "No se pudo completar el cambio. Reintenta.",
              ),
        );
      return false;
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending("");
    }
  };
  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManage || inFlight.current) return;
    const normalized = email.trim().toLowerCase();
    if (!emailSchema.safeParse(normalized).success) {
      setEmailError(
        l("Enter a valid email address.", "Escribe un correo válido."),
      );
      return;
    }
    if (
      members.some(
        (member) => member.email.trim().toLowerCase() === normalized,
      ) ||
      invitations.some(
        (invitation) =>
          invitation.status === "pending" &&
          invitation.email.trim().toLowerCase() === normalized,
      )
    ) {
      setEmailError(
        l(
          "This email already belongs to a member or pending invitation.",
          "Este correo ya pertenece a un miembro o invitación pendiente.",
        ),
      );
      return;
    }
    setEmailError("");
    if (
      (await run(
        "invite",
        () => onInvite(normalized, role),
        l(
          "Invitation created in this preview.",
          "Invitación creada en esta vista previa.",
        ),
      )) &&
      mounted.current
    ) {
      setEmail("");
    }
  };
  const confirm = async () => {
    if (!confirmation || !canManage || inFlight.current) return;
    const member = members.find((item) => item.id === confirmation.id);
    const invitation = invitations.find((item) => item.id === confirmation.id);
    const allowed =
      confirmation.kind === "remove"
        ? member && editable(member)
        : confirmation.kind === "transfer"
          ? member && transferable(member)
          : invitation &&
            (invitation.status === "pending" ||
              invitation.status === "expired");
    if (!allowed) {
      setFailure(
        l(
          "This action is no longer available. Review the current list.",
          "Esta acción ya no está disponible. Revisa la lista actual.",
        ),
      );
      setConfirmation(null);
      return;
    }
    const callback =
      confirmation.kind === "remove"
        ? onRemoveMember
        : confirmation.kind === "transfer"
          ? onTransferOwnership
          : onRevokeInvitation;
    const success =
      confirmation.kind === "remove"
        ? l("Member removed.", "Miembro eliminado.")
        : confirmation.kind === "transfer"
          ? l("Ownership transferred.", "Propiedad transferida.")
          : l("Invitation revoked.", "Invitación revocada.");
    if (
      (await run(
        confirmation.kind,
        () => callback(confirmation.id),
        success,
      )) &&
      mounted.current
    )
      setConfirmation(null);
  };
  const confirmedMember = members.find(
    (member) => member.id === confirmation?.id,
  );
  const confirmedInvitation = invitations.find(
    (invitation) => invitation.id === confirmation?.id,
  );
  const target =
    confirmation?.kind === "revoke"
      ? confirmedInvitation?.email
      : confirmedMember?.name;

  return (
    <section
      aria-label={l("Members and invitations", "Miembros e invitaciones")}
      aria-busy={busy}
      className={cn("grid min-w-0 gap-5", className)}
    >
      {!canManage && (
        <Alert title={l("View access", "Acceso de lectura")}>
          {l(
            "You can review the team. Ask a workspace administrator to manage members and invitations.",
            "Puedes consultar el equipo. Pide a un administrador que gestione miembros e invitaciones.",
          )}
        </Alert>
      )}
      <Card appearance="elevated">
        <CardHeader className="border-b border-primary/15 bg-[radial-gradient(ellipse_at_top_right,var(--accent),transparent_75%)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-primary/20 bg-accent p-3 text-primary">
                <Users aria-hidden="true" className="size-5" />
              </span>
              <CardTitle>{l("Your team", "Tu equipo")}</CardTitle>
            </div>
            <Badge variant="outline">
              {members.length} {l("members", "miembros")}
            </Badge>
          </div>
          <CardDescription>
            {l(
              "Keep responsibilities clear. Your own access and the last owner are protected.",
              "Mantén claras las responsabilidades. Tu propio acceso y el último propietario están protegidos.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5">
          <Field
            htmlFor={`${id}-search`}
            label={l(
              "Search members and invitations",
              "Buscar miembros e invitaciones",
            )}
          >
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={l("Name or email", "Nombre o correo")}
            />
          </Field>
          {visibleMembers.length ? (
            <ul
              className="grid gap-3"
              aria-label={l("Workspace members", "Miembros del espacio")}
            >
              {visibleMembers.map((member) => (
                <li
                  key={member.id}
                  className="grid min-w-0 gap-4 rounded-xl border border-border bg-surface p-4 xl:grid-cols-[minmax(0,1fr)_180px_auto] xl:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar
                      name={member.name}
                      src={member.avatarSrc}
                      className="size-9"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-sm font-semibold">
                          {member.name}
                        </h3>
                        {member.id === currentMemberId && (
                          <Badge variant="outline">{l("You", "Tú")}</Badge>
                        )}
                        <Badge
                          variant={
                            member.status === "active" ? "default" : "warning"
                          }
                        >
                          {member.status === "active"
                            ? l("Active", "Activo")
                            : l("Suspended", "Suspendido")}
                        </Badge>
                      </div>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {member.email}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {l("Joined", "Se unió")} {formatDate(member.joinedAt)}
                        {protectedOwner(member) &&
                          ` · ${l("Last owner protected", "Último propietario protegido")}`}
                      </p>
                    </div>
                  </div>
                  {canManage ? (
                    <Field
                      htmlFor={`${id}-role-${member.id}`}
                      label={`${l("Role for", "Rol de")} ${member.name}`}
                    >
                      <Select
                        value={member.role}
                        disabled={busy || !editable(member)}
                        options={[
                          {
                            value: "owner",
                            label: roleLabels.owner,
                            disabled: true,
                          },
                          ...roles,
                        ]}
                        onValueChange={(next) => {
                          if (
                            !editable(member) ||
                            !assignableRole(next) ||
                            next === member.role
                          )
                            return;
                          void run(
                            `role-${member.id}`,
                            () => onChangeRole(member.id, next),
                            l(
                              "Member role updated.",
                              "Rol del miembro actualizado.",
                            ),
                          );
                        }}
                      />
                    </Field>
                  ) : (
                    <Badge variant="outline" className="justify-self-start">
                      {roleLabels[member.role]}
                    </Badge>
                  )}
                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2">
                      {transferable(member) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          aria-label={`${l("Transfer ownership to", "Transferir propiedad a")} ${member.name}`}
                          onClick={() => {
                            setFailure("");
                            setConfirmation({
                              kind: "transfer",
                              id: member.id,
                            });
                          }}
                        >
                          <Crown aria-hidden="true" />
                          {l("Transfer", "Transferir")}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy || !editable(member)}
                        aria-label={`${l("Remove member", "Eliminar miembro")} ${member.name}`}
                        onClick={() => {
                          if (editable(member)) {
                            setFailure("");
                            setConfirmation({ kind: "remove", id: member.id });
                          }
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                        {l("Remove", "Eliminar")}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title={
                query
                  ? l("No matching members", "No hay miembros que coincidan")
                  : l("No members yet", "Aún no hay miembros")
              }
              description={
                query
                  ? l(
                      "Try another name or email.",
                      "Prueba otro nombre o correo.",
                    )
                  : l(
                      "Members will appear here when they join.",
                      "Los miembros aparecerán aquí cuando se unan.",
                    )
              }
              action={
                query ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setQuery("")}
                  >
                    <Search aria-hidden="true" />
                    {l("Clear search", "Limpiar búsqueda")}
                  </Button>
                ) : undefined
              }
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Mail aria-hidden="true" className="size-4 text-primary" />
              {l("Invitations", "Invitaciones")}
            </CardTitle>
            <Badge variant="outline">
              {invitations.filter((item) => item.status === "pending").length}{" "}
              {l("pending", "pendientes")}
            </Badge>
          </div>
          <CardDescription>
            {l(
              "Invitation actions are previews. Accept in demo changes the preview; this component does not send emails.",
              "Las acciones son vistas previas. Aceptar en demo modifica la vista previa; este componente no envía correos.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {canManage && (
            <form
              noValidate
              onSubmit={(event) => void invite(event)}
              className="grid items-end gap-3 rounded-xl border border-primary/20 bg-accent/30 p-4 sm:grid-cols-[minmax(0,1fr)_160px_auto]"
            >
              <Field
                htmlFor={`${id}-invite-email`}
                label={l("Email address", "Correo electrónico")}
                error={emailError}
              >
                <Input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  disabled={busy}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError("");
                  }}
                  placeholder="name@example.com"
                />
              </Field>
              <Field
                htmlFor={`${id}-invite-role`}
                label={l("Invitation role", "Rol de invitación")}
              >
                <Select
                  value={role}
                  options={roles}
                  disabled={busy}
                  onValueChange={(next) => {
                    if (assignableRole(next)) setRole(next);
                  }}
                />
              </Field>
              <Button
                type="submit"
                appearance="gradient"
                disabled={busy}
                loading={pending === "invite"}
              >
                <Plus aria-hidden="true" />
                {l("Create invitation", "Crear invitación")}
              </Button>
            </form>
          )}
          {visibleInvitations.length ? (
            <ul
              className="grid gap-3"
              aria-label={l(
                "Workspace invitations",
                "Invitaciones del espacio",
              )}
            >
              {visibleInvitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex min-w-0 flex-col gap-3 rounded-xl border border-border p-4 lg:flex-row lg:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-semibold">
                      {invitation.email}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      {roleLabels[invitation.role]} · {l("Expires", "Caduca")}{" "}
                      {formatDate(invitation.expiresAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      invitation.status === "expired"
                        ? "warning"
                        : invitation.status === "revoked"
                          ? "neutral"
                          : "outline"
                    }
                    className="self-start lg:self-center"
                  >
                    {statusLabels[invitation.status]}
                  </Badge>
                  {canManage &&
                    (invitation.status === "pending" ||
                      invitation.status === "expired") && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          aria-label={`${l("Refresh invitation for", "Renovar invitación de")} ${invitation.email}`}
                          onClick={() =>
                            void run(
                              `resend-${invitation.id}`,
                              () => onResendInvitation(invitation.id),
                              l(
                                "Invitation refreshed in this preview.",
                                "Invitación renovada en esta vista previa.",
                              ),
                            )
                          }
                        >
                          <RotateCcw aria-hidden="true" />
                          {l("Refresh invitation", "Renovar invitación")}
                        </Button>
                        {invitation.status === "pending" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            aria-label={`${l("Accept in demo for", "Aceptar en demo para")} ${invitation.email}`}
                            onClick={() =>
                              void run(
                                `accept-${invitation.id}`,
                                () => onAcceptInvitation(invitation.id),
                                l(
                                  "Invitation accepted in this preview.",
                                  "Invitación aceptada en esta vista previa.",
                                ),
                              )
                            }
                          >
                            {l("Accept in demo", "Aceptar en demo")}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          aria-label={`${l("Revoke invitation for", "Revocar invitación de")} ${invitation.email}`}
                          onClick={() => {
                            setFailure("");
                            setConfirmation({
                              kind: "revoke",
                              id: invitation.id,
                            });
                          }}
                        >
                          <Trash2 aria-hidden="true" />
                          {l("Revoke", "Revocar")}
                        </Button>
                      </div>
                    )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title={
                query
                  ? l(
                      "No matching invitations",
                      "No hay invitaciones que coincidan",
                    )
                  : l("No invitations yet", "Aún no hay invitaciones")
              }
              description={
                query
                  ? l("Try another email address.", "Prueba otro correo.")
                  : l(
                      "Create an invitation when you are ready to grow the team.",
                      "Crea una invitación cuando quieras ampliar el equipo.",
                    )
              }
            />
          )}
        </CardContent>
      </Card>
      {busy && (
        <p role="status" className="text-xs text-muted-foreground">
          {l("Applying your change…", "Aplicando tu cambio…")}
        </p>
      )}
      {notice && (
        <Alert
          variant="success"
          title={l("Change completed", "Cambio completado")}
        >
          {notice}
        </Alert>
      )}
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
      <Dialog
        open={!!confirmation}
        onOpenChange={(open) => {
          if (!open && !inFlight.current) {
            setConfirmation(null);
            setFailure("");
          }
        }}
      >
        <DialogContent
          closeLabel={l("Close confirmation", "Cerrar confirmación")}
        >
          <DialogTitle>
            {confirmation?.kind === "transfer"
              ? l(
                  "Transfer workspace ownership?",
                  "¿Transferir la propiedad del espacio?",
                )
              : confirmation?.kind === "remove"
                ? l("Remove this member?", "¿Eliminar este miembro?")
                : l("Revoke this invitation?", "¿Revocar esta invitación?")}
          </DialogTitle>
          <DialogDescription>
            {confirmation?.kind === "transfer"
              ? l(
                  `Make ${target ?? ""} the owner. Your own role may change when this completes.`,
                  `Haz propietario a ${target ?? ""}. Tu propio rol puede cambiar al completar la acción.`,
                )
              : confirmation?.kind === "remove"
                ? l(
                    `${target ?? ""} will lose access to this workspace.`,
                    `${target ?? ""} perderá acceso a este espacio.`,
                  )
                : l(
                    `Cancel the invitation for ${target ?? ""}.`,
                    `Cancela la invitación de ${target ?? ""}.`,
                  )}
          </DialogDescription>
          {confirmation?.kind === "transfer" && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-accent p-3 text-xs leading-6 text-accent-foreground">
              <ShieldCheck
                aria-hidden="true"
                className="mt-1 size-4 shrink-0"
              />
              {l(
                "Ownership must move to an active member. Your application completes the transfer together.",
                "La propiedad debe pasar a un miembro activo. Tu aplicación completa la transferencia como una sola operación.",
              )}
            </p>
          )}
          {failure && (
            <Alert
              variant="destructive"
              title={l("Try again", "Reintenta")}
              className="mt-4"
            >
              {failure}
            </Alert>
          )}
          <DialogFooter className="flex-wrap">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setConfirmation(null);
                setFailure("");
              }}
            >
              {l("Cancel", "Cancelar")}
            </Button>
            <Button
              type="button"
              variant={
                confirmation?.kind === "transfer" ? "default" : "destructive"
              }
              disabled={!canManage || busy}
              loading={busy && pending === confirmation?.kind}
              onClick={() => void confirm()}
            >
              {confirmation?.kind === "transfer"
                ? l("Transfer ownership", "Transferir propiedad")
                : confirmation?.kind === "remove"
                  ? l("Remove member", "Eliminar miembro")
                  : l("Revoke invitation", "Revocar invitación")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
