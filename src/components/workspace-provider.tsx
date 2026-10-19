"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createSaasSeed } from "@/demo/saas-data";
import type { Customer } from "@/demo/dashboard-data";
import {
  SAAS_STORAGE_KEY,
  SaasError,
  changeWorkspaceMemberRole,
  customerSchema,
  hasCapability,
  mergeImportedCustomers,
  parseSaasState,
  removeWorkspaceMember,
  transferWorkspaceOwnership,
  updateWorkspaceData,
  workspaceInputSchema,
  type CustomerNote,
  type CustomerAttachment,
  type CustomerImportResult,
  type InviteRole,
  type OnboardingDraft,
  type SaasDemoState,
  type SavedWorkspaceView,
  type Workspace,
  type WorkspaceActivity,
  type WorkspaceCapability,
  type WorkspaceData,
  type WorkspaceInvitation,
  type WorkspaceMember,
  type WorkspaceRole,
} from "@/lib/saas";

type WorkspaceInput = Omit<Workspace, "id">;
export type WorkspaceContextValue = {
  ready: boolean;
  persistenceError: "read" | "write" | "invalid" | null;
  workspace: Workspace;
  workspaces: Workspace[];
  workspaceId: string;
  currentMemberId: string;
  currentMember: WorkspaceMember;
  role: WorkspaceRole;
  previewRole: WorkspaceRole | null;
  setPreviewRole: (role: WorkspaceRole | null) => void;
  can: (capability: WorkspaceCapability) => boolean;
  setWorkspace: (id: string) => void;
  createWorkspace: (input: WorkspaceInput) => Workspace;
  updateWorkspace: (input: WorkspaceInput) => void;
  customers: Customer[];
  setCustomers: Dispatch<SetStateAction<Customer[]>>;
  importCustomers: (
    rows: readonly Customer[],
    mode: "skip" | "update",
  ) => CustomerImportResult;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  inviteMember: (email: string, role: InviteRole) => void;
  resendInvitation: (id: string) => void;
  acceptInvitation: (id: string) => void;
  revokeInvitation: (id: string) => void;
  changeMemberRole: (id: string, role: WorkspaceRole) => void;
  removeMember: (id: string) => void;
  transferOwnership: (id: string) => void;
  notes: Record<string, CustomerNote[]>;
  addNote: (customerId: string, text: string) => void;
  files: Record<string, CustomerAttachment[]>;
  attachFiles: (customerId: string, files: readonly File[]) => void;
  activity: WorkspaceActivity[];
  recordActivity: (
    detail: string,
    kind: WorkspaceActivity["kind"],
    resourceId?: string,
  ) => void;
  savedViews: SavedWorkspaceView[];
  setSavedViews: Dispatch<SetStateAction<SavedWorkspaceView[]>>;
  customerView: unknown;
  setCustomerView: (value: unknown) => void;
  onboarding: OnboardingDraft;
  setOnboarding: (value: OnboardingDraft) => void;
  completeOnboarding: (value: OnboardingDraft) => void;
  retryPersistence: () => void;
};

const Context = createContext<WorkspaceContextValue | null>(null);
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SaasDemoState>(createSaasSeed);
  const [ready, setReady] = useState(false);
  const [persistenceError, setPersistenceError] =
    useState<WorkspaceContextValue["persistenceError"]>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAAS_STORAGE_KEY);
      if (stored) {
        const parsed = parseSaasState(JSON.parse(stored));
        if (parsed) {
          stateRef.current = parsed;
          setState(parsed);
        } else {
          setPersistenceError("invalid");
        }
      }
    } catch {
      setPersistenceError("read");
    }
    setReady(true);
    const receive = (event: StorageEvent) => {
      if (event.key !== SAAS_STORAGE_KEY || !event.newValue) return;
      try {
        const incoming = parseSaasState(JSON.parse(event.newValue));
        if (!incoming) {
          setPersistenceError("invalid");
          return;
        }
        stateRef.current = incoming;
        setState(incoming);
      } catch {
        setPersistenceError("read");
      }
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(SAAS_STORAGE_KEY, JSON.stringify(state));
    } catch {
      setPersistenceError("write");
    }
  }, [ready, state]);

  // Validate synchronously, then commit once. Errors remain catchable by callers.
  const commit = useCallback(
    (updater: (previous: SaasDemoState) => SaasDemoState) => {
      const next = updater(stateRef.current);
      stateRef.current = next;
      setState(next);
    },
    [],
  );
  const previewRole = state.previewRole ?? null;
  const setPreviewRole = useCallback(
    (next: WorkspaceRole | null) => {
      commit((previous) => ({ ...previous, previewRole: next ?? undefined }));
    },
    [commit],
  );
  const workspaceId = state.activeWorkspaceId;
  const data = state.data[workspaceId];
  const workspace = state.workspaces.find((item) => item.id === workspaceId)!;
  const currentMember = data.members.find(
    (item) => item.id === state.currentMemberId,
  )!;
  const role = previewRole ?? currentMember.role;
  const can = useCallback(
    (capability: WorkspaceCapability) => hasCapability(role, capability),
    [role],
  );
  const assert = useCallback(
    (capability: WorkspaceCapability) => {
      const snapshot = stateRef.current;
      const actor = snapshot.data[workspaceId]?.members.find(
        (member) => member.id === snapshot.currentMemberId,
      );
      const liveRole = snapshot.previewRole ?? actor?.role;
      if (
        !ready ||
        snapshot.activeWorkspaceId !== workspaceId ||
        actor?.status !== "active" ||
        !liveRole ||
        !hasCapability(liveRole, capability)
      )
        throw new SaasError("permission");
    },
    [ready, workspaceId],
  );
  const updateData = useCallback(
    (updater: (previous: WorkspaceData) => WorkspaceData) => {
      commit((previous) => updateWorkspaceData(previous, workspaceId, updater));
    },
    [commit, workspaceId],
  );
  const newActivity = useCallback(
    (
      detail: string,
      kind: WorkspaceActivity["kind"],
      resourceId?: string,
    ): WorkspaceActivity => ({
      id: id("event"),
      actor: currentMember.name,
      detail,
      kind,
      resourceId,
      occurredAt: new Date().toISOString(),
    }),
    [currentMember.name],
  );
  const recordActivity = useCallback(
    (detail: string, kind: WorkspaceActivity["kind"], resourceId?: string) => {
      const activity = newActivity(detail, kind, resourceId);
      updateData((previous) => ({
        ...previous,
        activity: [activity, ...previous.activity].slice(0, 2000),
      }));
    },
    [newActivity, updateData],
  );

  const setWorkspace = useCallback(
    (targetId: string) => {
      const previous = stateRef.current;
      if (!previous.workspaces.some((item) => item.id === targetId))
        throw new SaasError("missing");
      setPreviewRole(null);
      commit((snapshot) => ({ ...snapshot, activeWorkspaceId: targetId }));
    },
    [commit, setPreviewRole],
  );
  const createWorkspace = useCallback(
    (input: WorkspaceInput) => {
      if (!ready || role === "viewer") throw new SaasError("permission");
      const parsed = workspaceInputSchema.safeParse(input);
      if (!parsed.success) throw new SaasError("invalid");
      if (
        stateRef.current.workspaces.some(
          (item) => item.slug === parsed.data.slug,
        )
      )
        throw new SaasError("duplicate");
      const created: Workspace = { id: id("workspace"), ...parsed.data };
      const member = {
        ...currentMember,
        role: "owner" as const,
        status: "active" as const,
      };
      commit((previous) => ({
        ...previous,
        activeWorkspaceId: created.id,
        workspaces: [...previous.workspaces, created],
        data: {
          ...previous.data,
          [created.id]: {
            customers: [],
            members: [member],
            invitations: [],
            notes: {},
            activity: [],
            savedViews: [],
          },
        },
      }));
      setPreviewRole(null);
      return created;
    },
    [commit, currentMember, ready, role, setPreviewRole],
  );
  const updateWorkspace = useCallback(
    (input: WorkspaceInput) => {
      assert("workspace.manage");
      const parsed = workspaceInputSchema.safeParse(input);
      if (!parsed.success) throw new SaasError("invalid");
      if (
        stateRef.current.workspaces.some(
          (item) => item.id !== workspaceId && item.slug === parsed.data.slug,
        )
      )
        throw new SaasError("duplicate");
      commit((previous) => ({
        ...previous,
        workspaces: previous.workspaces.map((item) =>
          item.id === workspaceId ? { ...item, ...parsed.data } : item,
        ),
      }));
      recordActivity("Workspace updated · Workspace actualizado", "workspace");
    },
    [assert, commit, recordActivity, workspaceId],
  );
  const setCustomers = useCallback<Dispatch<SetStateAction<Customer[]>>>(
    (next) => {
      assert("customers.write");
      updateData((previous) => {
        const candidates =
          typeof next === "function" ? next(previous.customers) : next;
        const parsed = candidates.map((candidate) =>
          customerSchema.safeParse(candidate),
        );
        if (parsed.length > 25000 || parsed.some((item) => !item.success))
          throw new SaasError("invalid");
        const records = parsed.map((item) => item.data!);
        if (
          new Set(records.map((item) => item.id)).size !== records.length ||
          new Set(records.map((item) => item.email.toLowerCase())).size !==
            records.length
        )
          throw new SaasError("duplicate");
        return { ...previous, customers: records };
      });
    },
    [assert, updateData],
  );
  const setSavedViews = useCallback<
    Dispatch<SetStateAction<SavedWorkspaceView[]>>
  >(
    (next) => {
      assert("views.manage");
      updateData((previous) => ({
        ...previous,
        savedViews:
          typeof next === "function" ? next(previous.savedViews) : next,
      }));
    },
    [assert, updateData],
  );
  const setCustomerView = useCallback(
    (next: unknown) => {
      updateData((previous) => ({ ...previous, customerView: next }));
    },
    [updateData],
  );
  const importCustomers = useCallback(
    (rows: readonly Customer[], mode: "skip" | "update") => {
      assert("customers.import");
      const current = stateRef.current.data[workspaceId];
      const merged = mergeImportedCustomers(current.customers, [...rows], mode);
      updateData((previous) => ({ ...previous, customers: merged.customers }));
      recordActivity(
        `Customers imported: ${merged.result.created + merged.result.updated} · Clientes importados: ${merged.result.created + merged.result.updated}`,
        "import",
      );
      return merged.result;
    },
    [assert, recordActivity, updateData, workspaceId],
  );
  const inviteMember = useCallback(
    (rawEmail: string, inviteRole: InviteRole) => {
      assert("members.manage");
      const email = rawEmail.trim().toLowerCase();
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !["admin", "member", "viewer"].includes(inviteRole)
      )
        throw new SaasError("invalid");
      const previous = stateRef.current.data[workspaceId];
      if (
        previous.members.some((item) => item.email.toLowerCase() === email) ||
        previous.invitations.some(
          (item) =>
            item.email.toLowerCase() === email && item.status === "pending",
        )
      )
        throw new SaasError("duplicate");
      const invitation: WorkspaceInvitation = {
        id: id("invite"),
        email,
        role: inviteRole,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      };
      updateData((snapshot) => ({
        ...snapshot,
        invitations: [...snapshot.invitations, invitation],
      }));
      recordActivity(
        `Invitation created · Invitación creada: ${email}`,
        "member",
      );
    },
    [assert, recordActivity, updateData, workspaceId],
  );
  const changeInvitation = useCallback(
    (targetId: string, status: "pending" | "revoked") => {
      assert("members.manage");
      const target = stateRef.current.data[workspaceId].invitations.find(
        (item) => item.id === targetId,
      );
      if (
        !target ||
        target.status === "accepted" ||
        target.status === "revoked"
      )
        throw new SaasError("invalid");
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      updateData((previous) => ({
        ...previous,
        invitations: previous.invitations.map((item) =>
          item.id === targetId
            ? {
                ...item,
                status,
                ...(status === "pending" ? { expiresAt } : {}),
              }
            : item,
        ),
      }));
      recordActivity(
        status === "pending"
          ? "Invitation renewed · Invitación renovada"
          : "Invitation revoked · Invitación revocada",
        "member",
      );
    },
    [assert, recordActivity, updateData, workspaceId],
  );
  const acceptInvitation = useCallback(
    (targetId: string) => {
      assert("members.manage");
      const snapshot = stateRef.current.data[workspaceId];
      const target = snapshot.invitations.find((item) => item.id === targetId);
      if (!target || target.status !== "pending")
        throw new SaasError("invalid");
      if (Date.parse(target.expiresAt) <= Date.now())
        throw new SaasError("expired");
      if (
        snapshot.members.some(
          (member) => member.email.toLowerCase() === target.email.toLowerCase(),
        )
      )
        throw new SaasError("duplicate");
      const member: WorkspaceMember = {
        id: id("member"),
        name: target.email.split("@")[0],
        email: target.email,
        role: target.role,
        status: "active",
        joinedAt: new Date().toISOString().slice(0, 10),
      };
      updateData((previous) => ({
        ...previous,
        members: [...previous.members, member],
        invitations: previous.invitations.map((item) =>
          item.id === targetId ? { ...item, status: "accepted" } : item,
        ),
      }));
      recordActivity(
        `Member joined · Miembro incorporado: ${target.email}`,
        "member",
      );
    },
    [assert, recordActivity, updateData, workspaceId],
  );
  const changeMemberRole = useCallback(
    (targetId: string, nextRole: WorkspaceRole) => {
      assert("members.manage");
      updateData((previous) => ({
        ...previous,
        members: changeWorkspaceMemberRole(
          previous.members,
          targetId,
          nextRole,
          stateRef.current.currentMemberId,
        ),
      }));
      recordActivity(
        "Member role changed · Rol de miembro actualizado",
        "member",
      );
    },
    [assert, recordActivity, updateData],
  );
  const removeMember = useCallback(
    (targetId: string) => {
      assert("members.manage");
      updateData((previous) => ({
        ...previous,
        members: removeWorkspaceMember(
          previous.members,
          stateRef.current.currentMemberId,
          targetId,
        ),
      }));
      recordActivity("Member removed · Miembro eliminado", "member");
    },
    [assert, recordActivity, updateData],
  );
  const transferOwnership = useCallback(
    (targetId: string) => {
      assert("ownership.transfer");
      updateData((previous) => ({
        ...previous,
        members: transferWorkspaceOwnership(
          previous.members,
          stateRef.current.currentMemberId,
          targetId,
        ),
      }));
      setPreviewRole(null);
      recordActivity(
        "Ownership transferred · Titularidad transferida",
        "member",
      );
    },
    [assert, recordActivity, setPreviewRole, updateData],
  );
  const addNote = useCallback(
    (customerId: string, rawText: string) => {
      assert("notes.write");
      const text = rawText.trim();
      if (!text || text.length > 10000) throw new SaasError("invalid");
      if (
        !stateRef.current.data[workspaceId].customers.some(
          (item) => item.id === customerId,
        )
      )
        throw new SaasError("missing");
      const note: CustomerNote = {
        id: id("note"),
        text,
        author: currentMember.name,
        authorMemberId: currentMember.id,
        createdAt: new Date().toISOString(),
      };
      updateData((previous) => ({
        ...previous,
        notes: {
          ...previous.notes,
          [customerId]: [...(previous.notes[customerId] ?? []), note],
        },
      }));
      recordActivity("Note added · Nota añadida", "note", customerId);
    },
    [
      assert,
      currentMember.id,
      currentMember.name,
      recordActivity,
      updateData,
      workspaceId,
    ],
  );
  const attachFiles = useCallback(
    (customerId: string, files: readonly File[]) => {
      assert("customers.write");
      const current = stateRef.current.data[workspaceId];
      if (!current.customers.some((item) => item.id === customerId))
        throw new SaasError("missing");
      const existing = current.files?.[customerId] ?? [];
      if (
        !files.length ||
        existing.length + files.length > 100 ||
        files.some(
          (file) =>
            !file.name ||
            file.name.length > 255 ||
            file.size > 10 * 1024 * 1024,
        )
      )
        throw new SaasError("invalid");
      const additions: CustomerAttachment[] = files.map((file) => ({
        id: id("file"),
        name: file.name,
        size: file.size,
        type: file.type,
        createdAt: new Date().toISOString(),
      }));
      updateData((previous) => ({
        ...previous,
        files: {
          ...previous.files,
          [customerId]: [...(previous.files?.[customerId] ?? []), ...additions],
        },
      }));
      recordActivity(
        `File details added: ${files.length} · Datos de archivos añadidos: ${files.length}`,
        "customer",
        customerId,
      );
    },
    [assert, recordActivity, updateData, workspaceId],
  );
  const setOnboarding = useCallback(
    (value: OnboardingDraft) => {
      commit((previous) => ({ ...previous, onboarding: value }));
    },
    [commit],
  );
  const completeOnboarding = useCallback(
    (value: OnboardingDraft) => {
      const existing = stateRef.current.onboarding;
      if (existing.completed && existing.workspaceId) {
        setWorkspace(existing.workspaceId);
        return;
      }
      const emails = value.invites.map((item) =>
        item.email.trim().toLowerCase(),
      );
      if (
        value.invites.length > 50 ||
        value.invites.some(
          (item) => !["admin", "member", "viewer"].includes(item.role),
        ) ||
        emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      )
        throw new SaasError("invalid");
      if (
        new Set(emails).size !== emails.length ||
        emails.includes(currentMember.email.toLowerCase())
      )
        throw new SaasError("duplicate");
      const created = createWorkspace({
        organizationName: value.organizationName,
        name: value.workspaceName,
        slug: value.workspaceSlug,
        description: "",
      });
      const invitations: WorkspaceInvitation[] = value.invites
        .filter((item) => item.email.trim())
        .map((item) => ({
          id: id("invite"),
          email: item.email.trim().toLowerCase(),
          role: item.role,
          status: "pending",
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        }));
      commit((previous) => ({
        ...previous,
        onboarding: {
          ...value,
          step: 3,
          completed: true,
          workspaceId: created.id,
        },
        data: {
          ...previous.data,
          [created.id]: { ...previous.data[created.id], invitations },
        },
      }));
    },
    [commit, createWorkspace, currentMember.email, setWorkspace],
  );
  const retryPersistence = useCallback(() => {
    try {
      localStorage.setItem(SAAS_STORAGE_KEY, JSON.stringify(stateRef.current));
      setPersistenceError(null);
    } catch {
      setPersistenceError("write");
    }
  }, []);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ready,
      persistenceError,
      workspace,
      workspaces: state.workspaces,
      workspaceId,
      currentMemberId: state.currentMemberId,
      currentMember,
      role,
      previewRole,
      setPreviewRole,
      can,
      setWorkspace,
      createWorkspace,
      updateWorkspace,
      customers: data.customers,
      setCustomers,
      importCustomers,
      members: data.members,
      invitations: data.invitations,
      inviteMember,
      resendInvitation: (targetId) => changeInvitation(targetId, "pending"),
      revokeInvitation: (targetId) => changeInvitation(targetId, "revoked"),
      acceptInvitation,
      changeMemberRole,
      removeMember,
      transferOwnership,
      notes: data.notes,
      addNote,
      files: data.files ?? {},
      attachFiles,
      activity: data.activity,
      recordActivity,
      savedViews: data.savedViews,
      setSavedViews,
      customerView: data.customerView,
      setCustomerView,
      onboarding: state.onboarding,
      setOnboarding,
      completeOnboarding,
      retryPersistence,
    }),
    [
      ready,
      persistenceError,
      workspace,
      state.workspaces,
      state.currentMemberId,
      state.onboarding,
      workspaceId,
      currentMember,
      role,
      previewRole,
      setPreviewRole,
      can,
      setWorkspace,
      createWorkspace,
      updateWorkspace,
      data,
      setCustomers,
      importCustomers,
      inviteMember,
      changeInvitation,
      acceptInvitation,
      changeMemberRole,
      removeMember,
      transferOwnership,
      addNote,
      attachFiles,
      recordActivity,
      setSavedViews,
      setCustomerView,
      setOnboarding,
      completeOnboarding,
      retryPersistence,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Frontend context; production services must independently authorize each action. */
export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(Context);
  if (!value) throw new Error("useWorkspace requires WorkspaceProvider.");
  return value;
}
