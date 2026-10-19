import { customersSeed } from "./dashboard-data";
import type { SaasDemoState, WorkspaceData } from "../lib/saas";

function workspaceData(personal = false): WorkspaceData {
  return {
    customers: personal
      ? customersSeed.slice(9).map((item) => ({ ...item, id: `personal-${item.id}` }))
      : customersSeed.map((item) => ({ ...item })),
    members: [
      {
        id: "member-you",
        name: "Alex Morgan",
        email: "alex@aureform.demo",
        role: "owner",
        status: "active",
        joinedAt: "2026-09-01",
      },
      ...(!personal ? [
        { id: "member-isabel", name: "Isabel Torres", email: "isabel@aureform.demo", role: "admin" as const, status: "active" as const, joinedAt: "2026-09-08" },
        { id: "member-daniel", name: "Daniel Kim", email: "daniel@aureform.demo", role: "member" as const, status: "active" as const, joinedAt: "2026-09-14" },
        { id: "member-noor", name: "Noor Ahmed", email: "noor@aureform.demo", role: "viewer" as const, status: "active" as const, joinedAt: "2026-10-02" },
      ] : []),
    ],
    invitations: personal ? [] : [
      { id: "invite-lana", email: "lana@aureform.demo", role: "member", status: "pending", expiresAt: "2027-10-26T12:00:00.000Z" },
      { id: "invite-leo", email: "leo@aureform.demo", role: "viewer", status: "expired", expiresAt: "2026-09-20T12:00:00.000Z" },
    ],
    notes: personal ? {} : {
      "cus-001": [
        { id: "note-olivia", text: "Interested in bringing the design team into the next workspace.", author: "Alex Morgan", createdAt: "2026-10-16T14:20:00.000Z" },
      ],
    },
    activity: personal ? [] : [
      { id: "activity-olivia", actor: "Alex Morgan", detail: "Customer added · Cliente añadido", resourceId: "cus-001", kind: "customer", occurredAt: "2026-10-14T10:30:00.000Z" },
      { id: "activity-note", actor: "Alex Morgan", detail: "Note added · Nota añadida", resourceId: "cus-001", kind: "note", occurredAt: "2026-10-16T14:20:00.000Z" },
    ],
    savedViews: [],
  };
}

/** Every mount starts from the same deterministic snapshot before hydration. */
export function createSaasSeed(): SaasDemoState {
  return {
    version: 1,
    activeWorkspaceId: "studio",
    currentMemberId: "member-you",
    workspaces: [
      { id: "studio", organizationName: "Aureform", name: "Aureform Studio", slug: "aureform-studio", description: "A shared space for product operations." },
      { id: "personal", organizationName: "Personal", name: "Personal space", slug: "personal-space", description: "A smaller workspace for your own projects." },
    ],
    data: { studio: workspaceData(), personal: workspaceData(true) },
    onboarding: {
      step: 0,
      organizationName: "",
      workspaceName: "",
      workspaceSlug: "",
      invites: [],
      completed: false,
    },
  };
}
