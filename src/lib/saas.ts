import { z } from "zod";
import type { Customer } from "../demo/dashboard-data";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type InviteRole = Exclude<WorkspaceRole, "owner">;
export type WorkspaceCapability =
  | "workspace.manage"
  | "members.manage"
  | "ownership.transfer"
  | "customers.write"
  | "customers.import"
  | "notes.write"
  | "views.manage";

export type Workspace = {
  id: string;
  organizationName: string;
  name: string;
  slug: string;
  description: string;
};
export type WorkspaceMember = {
  id: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  status: "active" | "suspended";
  joinedAt: string;
};
export type WorkspaceInvitation = {
  id: string;
  email: string;
  role: InviteRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: string;
};
export type CustomerNote = {
  id: string;
  text: string;
  author: string;
  authorMemberId?: string;
  createdAt: string;
};
export type CustomerAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  createdAt: string;
};
export type WorkspaceActivity = {
  id: string;
  actor: string;
  detail: string;
  occurredAt: string;
  resourceId?: string;
  kind: "workspace" | "member" | "customer" | "import" | "note" | "view";
};
export type OnboardingDraft = {
  step: number;
  organizationName: string;
  workspaceName: string;
  workspaceSlug: string;
  invites: { email: string; role: InviteRole }[];
  completed: boolean;
  workspaceId?: string;
};
export type SavedWorkspaceView = {
  id: string;
  name: string;
  value: unknown;
};
export type WorkspaceData = {
  customers: Customer[];
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  notes: Record<string, CustomerNote[]>;
  activity: WorkspaceActivity[];
  savedViews: SavedWorkspaceView[];
  customerView?: unknown;
  files?: Record<string, CustomerAttachment[]>;
};
export type SaasDemoState = {
  version: 1;
  activeWorkspaceId: string;
  currentMemberId: string;
  workspaces: Workspace[];
  data: Record<string, WorkspaceData>;
  onboarding: OnboardingDraft;
  previewRole?: WorkspaceRole;
};

export const SAAS_STORAGE_KEY = "aureform:saas:v1";
const allCapabilities: WorkspaceCapability[] = [
  "workspace.manage",
  "members.manage",
  "ownership.transfer",
  "customers.write",
  "customers.import",
  "notes.write",
  "views.manage",
];
const roleCapabilities: Record<WorkspaceRole, readonly WorkspaceCapability[]> =
  {
    owner: allCapabilities,
    admin: allCapabilities.filter((item) => item !== "ownership.transfer"),
    member: [
      "customers.write",
      "customers.import",
      "notes.write",
      "views.manage",
    ],
    viewer: [],
  };
export function hasCapability(
  role: WorkspaceRole,
  capability: WorkspaceCapability,
): boolean {
  return roleCapabilities[role].includes(capability);
}
export function workspaceSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");
}
export type SaasErrorCode =
  "permission" | "invalid" | "duplicate" | "owner" | "expired" | "missing";
export class SaasError extends Error {
  readonly code: SaasErrorCode;
  constructor(code: SaasErrorCode) {
    super(code);
    this.name = "SaasError";
    this.code = code;
  }
}

const roleSchema = z.enum(["owner", "admin", "member", "viewer"]);
const inviteRoleSchema = z.enum(["admin", "member", "viewer"]);
export const workspaceInputSchema = z.object({
  organizationName: z.string().trim().min(2).max(100),
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(500),
});
export const customerSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  company: z.string().max(200),
  plan: z.string().max(60),
  status: z.string().max(60),
  amount: z.number().finite().nonnegative(),
  joined: z.iso.date(),
});
const memberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  role: roleSchema,
  status: z.enum(["active", "suspended"]),
  joinedAt: z.string(),
});
const invitationSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
  role: inviteRoleSchema,
  status: z.enum(["pending", "accepted", "expired", "revoked"]),
  expiresAt: z.iso.datetime(),
});
const noteSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(10000),
  author: z.string(),
  authorMemberId: z.string().min(1).optional(),
  createdAt: z.iso.datetime(),
});
const activitySchema = z.object({
  id: z.string(),
  actor: z.string(),
  detail: z.string(),
  occurredAt: z.iso.datetime(),
  resourceId: z.string().optional(),
  kind: z.enum(["workspace", "member", "customer", "import", "note", "view"]),
});
const dataSchema = z.object({
  customers: z.array(customerSchema).max(25000),
  members: z.array(memberSchema).min(1).max(1000),
  invitations: z.array(invitationSchema).max(1000),
  notes: z.record(z.string(), z.array(noteSchema).max(1000)),
  activity: z.array(activitySchema).max(2000),
  savedViews: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(80),
        value: z.unknown(),
      }),
    )
    .max(100),
  customerView: z.unknown().optional(),
  files: z
    .record(
      z.string(),
      z
        .array(
          z.object({
            id: z.string().min(1),
            name: z.string().min(1).max(255),
            size: z
              .number()
              .int()
              .nonnegative()
              .max(10 * 1024 * 1024),
            type: z.string().max(255),
            createdAt: z.iso.datetime(),
          }),
        )
        .max(100),
    )
    .optional(),
});
const stateSchema = z.object({
  version: z.literal(1),
  activeWorkspaceId: z.string(),
  currentMemberId: z.string().min(1),
  previewRole: roleSchema.optional(),
  workspaces: z
    .array(workspaceInputSchema.extend({ id: z.string().min(1) }))
    .min(1)
    .max(100),
  data: z.record(z.string(), dataSchema),
  onboarding: z.object({
    step: z.number().int().min(0).max(3),
    organizationName: z.string().max(100),
    workspaceName: z.string().max(100),
    workspaceSlug: z.string().max(64),
    invites: z
      .array(z.object({ email: z.string().max(254), role: inviteRoleSchema }))
      .max(50),
    completed: z.boolean(),
    workspaceId: z.string().optional(),
  }),
});

/** Untrusted browser persistence is checked before it reaches any UI. */
export function parseSaasState(value: unknown): SaasDemoState | null {
  const parsed = stateSchema.safeParse(value);
  if (!parsed.success) return null;
  const state = parsed.data as SaasDemoState;
  const ids = state.workspaces.map((item) => item.id);
  if (
    new Set(ids).size !== ids.length ||
    !ids.includes(state.activeWorkspaceId)
  )
    return null;
  const slugs = state.workspaces.map((item) => item.slug);
  if (new Set(slugs).size !== slugs.length) return null;
  for (const id of ids) {
    if (!Object.hasOwn(state.data, id)) return null;
    const data = state.data[id];
    if (
      data.members.filter((member) => member.role === "owner").length !== 1 ||
      !data.members.some(
        (member) => member.role === "owner" && member.status === "active",
      )
    )
      return null;
    if (
      !data.members.some(
        (member) =>
          member.id === state.currentMemberId && member.status === "active",
      )
    )
      return null;
    if (
      new Set(data.customers.map((item) => item.id)).size !==
      data.customers.length
    )
      return null;
    if (
      new Set(data.members.map((item) => item.id)).size !== data.members.length
    )
      return null;
    if (
      new Set(data.members.map((item) => item.email.toLowerCase())).size !==
      data.members.length
    )
      return null;
  }
  return state;
}

export function updateWorkspaceData(
  state: SaasDemoState,
  id: string,
  updater: (previous: WorkspaceData) => WorkspaceData,
): SaasDemoState {
  if (!Object.hasOwn(state.data, id)) throw new SaasError("missing");
  return { ...state, data: { ...state.data, [id]: updater(state.data[id]) } };
}
export function transferWorkspaceOwnership(
  members: WorkspaceMember[],
  actorId: string,
  targetId: string,
): WorkspaceMember[] {
  const actor = members.find((item) => item.id === actorId);
  const target = members.find((item) => item.id === targetId);
  if (actor?.role !== "owner" || actor.status !== "active")
    throw new SaasError("permission");
  if (!target || target.status !== "active" || actorId === targetId)
    throw new SaasError("invalid");
  return members.map((item) =>
    item.id === actorId
      ? { ...item, role: "admin" }
      : item.id === targetId
        ? { ...item, role: "owner" }
        : item,
  );
}
export function changeWorkspaceMemberRole(
  members: WorkspaceMember[],
  targetId: string,
  role: WorkspaceRole,
  actorId?: string,
): WorkspaceMember[] {
  const target = members.find((item) => item.id === targetId);
  if (!target) throw new SaasError("missing");
  if (target.role === "owner" || role === "owner" || targetId === actorId)
    throw new SaasError("owner");
  return members.map((item) =>
    item.id === targetId ? { ...item, role } : item,
  );
}
export function removeWorkspaceMember(
  members: WorkspaceMember[],
  actorId: string,
  targetId: string,
): WorkspaceMember[] {
  const target = members.find((item) => item.id === targetId);
  if (!target) throw new SaasError("missing");
  if (target.role === "owner" || targetId === actorId)
    throw new SaasError("owner");
  return members.filter((item) => item.id !== targetId);
}

export type CustomerImportResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
};
/** Transactional merge; callers commit the result only after cancellation checks. */
export function mergeImportedCustomers(
  existing: Customer[],
  imported: Customer[],
  mode: "skip" | "update",
): { customers: Customer[]; result: CustomerImportResult } {
  const customers = existing.map((item) => ({ ...item }));
  const indices = new Map(
    customers.map((item, index) => [item.email.trim().toLowerCase(), index]),
  );
  const result: CustomerImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };
  for (const candidate of imported) {
    const parsed = customerSchema.safeParse(candidate);
    if (!parsed.success) {
      result.failed++;
      continue;
    }
    const customer = parsed.data;
    const email = customer.email.trim().toLowerCase();
    const index = indices.get(email);
    if (index !== undefined) {
      if (mode === "skip") {
        result.skipped++;
      } else {
        customers[index] = { ...customer, id: customers[index].id };
        result.updated++;
      }
    } else {
      if (customers.some((item) => item.id === customer.id)) {
        result.failed++;
        continue;
      }
      indices.set(email, customers.length);
      customers.push(customer);
      result.created++;
    }
  }
  return { customers, result };
}
