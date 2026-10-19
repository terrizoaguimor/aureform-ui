/** Local generated portraits. SVG containers embed their optimized WebP siblings. */
export const demoAvatarSources = {
  "alex-morgan": "/assets/avatars/alex-morgan.svg",
  "isabel-torres": "/assets/avatars/isabel-torres.svg",
  "leo-martin": "/assets/avatars/leo-martin.svg",
  "noor-ahmed": "/assets/avatars/noor-ahmed.svg",
  "daniel-kim": "/assets/avatars/daniel-kim.svg",
  "olivia-rhye": "/assets/avatars/olivia-rhye.svg",
  "phoenix-baker": "/assets/avatars/phoenix-baker.svg",
  "lana-steiner": "/assets/avatars/lana-steiner.svg",
  "demi-wilkinson": "/assets/avatars/demi-wilkinson.svg",
  "drew-cano": "/assets/avatars/drew-cano.svg",
  "amelia-wilson": "/assets/avatars/amelia-wilson.svg",
  "matias-vega": "/assets/avatars/matias-vega.svg",
  "sofia-chen": "/assets/avatars/sofia-chen.svg",
  "lucas-moreau": "/assets/avatars/lucas-moreau.svg",
  "alex-rivera": "/assets/avatars/alex-rivera.svg",
  "isabel-moreno": "/assets/avatars/isabel-moreno.svg",
  "studio-updates": "/assets/avatars/studio-updates.svg",
  "forma-collective": "/assets/avatars/forma-collective.svg",
} as const;

export type DemoAvatarId = keyof typeof demoAvatarSources;
type IdentityMap = Readonly<Record<string, DemoAvatarId>>;
type WorkspaceIdentities = Readonly<Record<string, IdentityMap>>;

/** Accept an explicitly assigned identity, never a display name or inferred slug. */
export function getDemoAvatarSrc(
  identity: string | null | undefined,
): string | undefined {
  return identity && Object.hasOwn(demoAvatarSources, identity)
    ? demoAvatarSources[identity as DemoAvatarId]
    : undefined;
}

function lookupIdentity(
  identities: IdentityMap,
  recordId: string,
): DemoAvatarId | undefined {
  return Object.hasOwn(identities, recordId) ? identities[recordId] : undefined;
}

function workspaceAvatarSrc(
  identities: WorkspaceIdentities,
  workspaceId: string,
  recordId: string,
): string | undefined {
  return Object.hasOwn(identities, workspaceId)
    ? getDemoAvatarSrc(lookupIdentity(identities[workspaceId], recordId))
    : undefined;
}

const customerIdentities: WorkspaceIdentities = {
  studio: {
    "cus-001": "olivia-rhye",
    "cus-002": "phoenix-baker",
    "cus-003": "lana-steiner",
    "cus-004": "demi-wilkinson",
    "cus-005": "drew-cano",
    "cus-006": "isabel-torres",
    "cus-007": "leo-martin",
    "cus-008": "amelia-wilson",
    "cus-009": "matias-vega",
    "cus-010": "sofia-chen",
    "cus-011": "lucas-moreau",
    "cus-012": "noor-ahmed",
  },
  personal: {
    "personal-cus-010": "sofia-chen",
    "personal-cus-011": "lucas-moreau",
    "personal-cus-012": "noor-ahmed",
  },
};

const memberIdentities: WorkspaceIdentities = {
  studio: {
    "member-you": "alex-morgan",
    "member-isabel": "isabel-torres",
    "member-daniel": "daniel-kim",
    "member-noor": "noor-ahmed",
  },
  personal: { "member-you": "alex-morgan" },
};

const noteAuthorIdentities: WorkspaceIdentities = {
  studio: { "note-olivia": "alex-morgan" },
};

/** Only the explicitly authored demo records receive a portrait. */
export function getDemoCustomerAvatarSrc(
  workspaceId: string,
  customerId: string,
): string | undefined {
  return workspaceAvatarSrc(customerIdentities, workspaceId, customerId);
}

export function getDemoMemberAvatarSrc(
  workspaceId: string,
  memberId: string,
): string | undefined {
  return workspaceAvatarSrc(memberIdentities, workspaceId, memberId);
}

export function getDemoNoteAuthorAvatarSrc(
  workspaceId: string,
  noteId: string,
): string | undefined {
  return workspaceAvatarSrc(noteAuthorIdentities, workspaceId, noteId);
}

const fixtureNames: IdentityMap = {
  "Alex Morgan": "alex-morgan",
  "Isabel Torres": "isabel-torres",
  "Leo Martin": "leo-martin",
  "Noor Ahmed": "noor-ahmed",
  "Daniel Kim": "daniel-kim",
  "Olivia Rhye": "olivia-rhye",
  "Phoenix Baker": "phoenix-baker",
  "Lana Steiner": "lana-steiner",
  "Demi Wilkinson": "demi-wilkinson",
  "Drew Cano": "drew-cano",
  "Amelia Wilson": "amelia-wilson",
  "Matías Vega": "matias-vega",
  "Sofia Chen": "sofia-chen",
  "Lucas Moreau": "lucas-moreau",
  "Alex Rivera": "alex-rivera",
  "Isabel Moreno": "isabel-moreno",
  "Studio Updates": "studio-updates",
  "Forma Collective": "forma-collective",
};

/**
 * For literal, authored fixtures and closed fixture rosters only.
 * Never resolve imported customers, editable profiles or new members by name.
 */
export function getDemoFixtureAvatarSrc(name: string): string | undefined {
  return getDemoAvatarSrc(lookupIdentity(fixtureNames, name));
}

const mailSenders: IdentityMap = {
  "mail-1": "isabel-torres",
  "mail-2": "leo-martin",
  "mail-3": "noor-ahmed",
  "mail-4": "studio-updates",
  "mail-5": "alex-morgan",
  "mail-6": "forma-collective",
};
const chatAuthors: IdentityMap = {
  "chat-1": "isabel-torres",
  "chat-2": "leo-martin",
  "chat-3": "alex-morgan",
  "chat-4": "isabel-torres",
  "chat-5": "leo-martin",
};
const routeDrivers: IdentityMap = {
  "AF-284": "isabel-torres",
  "AF-285": "leo-martin",
  "AF-286": "alex-morgan",
  "AF-287": "noor-ahmed",
};
const ticketCustomers: IdentityMap = {
  "AF-1042": "olivia-rhye",
  "AF-1041": "phoenix-baker",
  "AF-1040": "lana-steiner",
  "AF-1039": "demi-wilkinson",
  "AF-1038": "drew-cano",
};
const boardAssignees: IdentityMap = {
  "task-1": "isabel-torres",
  "task-2": "alex-morgan",
  "task-3": "leo-martin",
  "task-4": "isabel-torres",
  "task-5": "noor-ahmed",
  "task-6": "leo-martin",
  "task-7": "alex-morgan",
  "task-8": "noor-ahmed",
  "deal-1": "alex-morgan",
  "deal-2": "isabel-torres",
  "deal-3": "leo-martin",
  "deal-4": "alex-morgan",
  "deal-5": "isabel-torres",
  "deal-6": "noor-ahmed",
  "deal-7": "alex-morgan",
};

export function getDemoMailSenderAvatarSrc(id: string): string | undefined {
  return getDemoAvatarSrc(lookupIdentity(mailSenders, id));
}

export function getDemoChatAuthorAvatarSrc(id: string): string | undefined {
  return getDemoAvatarSrc(lookupIdentity(chatAuthors, id));
}

export function getDemoRouteDriverAvatarSrc(id: string): string | undefined {
  return getDemoAvatarSrc(lookupIdentity(routeDrivers, id));
}

export function getDemoTicketCustomerAvatarSrc(id: string): string | undefined {
  return getDemoAvatarSrc(lookupIdentity(ticketCustomers, id));
}

export function getDemoBoardAssigneeAvatarSrc(id: string): string | undefined {
  return getDemoAvatarSrc(lookupIdentity(boardAssignees, id));
}
