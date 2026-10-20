import type {
  IntegrationAction,
  IntegrationRecord,
  IntegrationUpdate,
  IntegrationValues,
} from "../../lib/integrations/contracts";

export type ProductCollaborationScope = {
  resourceId: string;
  workspaceId: string;
  connectionId: string;
  integrationId: string;
};

export type ProductReplyTarget = {
  resourceId: string;
  threadId: string;
  parentId: string;
};

export type ProductReportedMessage = {
  record: IntegrationRecord;
  threadId?: string;
  parentId?: string;
  parent?: IntegrationRecord;
  relation: "flat" | "root" | "reply" | "parent-unavailable" | "invalid";
  replyTarget?: ProductReplyTarget;
};

export type ProductReportedConversation = {
  resourceId: string;
  messages: ProductReportedMessage[];
  flat: ProductReportedMessage[];
  threads: { id: string; messages: ProductReportedMessage[] }[];
};

const messageTypes = new Set(["message", "chat", "comment"]);

function reportedText(value: unknown, maximum: number) {
  return typeof value === "string" &&
    value.length <= maximum &&
    value.trim().length > 0 &&
    !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : undefined;
}

function reportedId(value: unknown) {
  return reportedText(value, 200);
}

/** Local assets/proxy paths or HTTPS images; no credentials or alternate schemes. */
export function productPresenceAvatarUrl(value: unknown) {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 8192 ||
    value !== value.trim() ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return undefined;
  if (value.startsWith("/")) return value.startsWith("//") ? undefined : value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

/** Presence is a server snapshot, including an empty snapshot; never seed people. */
export function productPresenceRecords(
  members: Extract<IntegrationUpdate, { kind: "presence" }>["members"],
): IntegrationRecord[] {
  const seen = new Set<string>();
  return members.slice(0, 1000).flatMap((member) => {
    const id = reportedId(member.id);
    const name = reportedText(member.name, 160);
    if (!id || !name || seen.has(id)) return [];
    seen.add(id);
    const avatarUrl = productPresenceAvatarUrl(member.avatarUrl);
    return [
      {
        id,
        name,
        type: "presence",
        status: member.state,
        description: "",
        updatedAt: "",
        ...(avatarUrl ? { fields: { avatarUrl } } : {}),
      },
    ];
  });
}

/** Join an author to presence by an explicit ID, never by a guessed display name. */
export function productCollaborationAuthor(
  record: IntegrationRecord,
  presence: readonly IntegrationRecord[],
) {
  const id = reportedId(record.fields?.authorId);
  const matching = id ? presence.filter((member) => member.id === id) : [];
  const member = matching.length === 1 ? matching[0] : undefined;
  return {
    id,
    name:
      reportedText(record.fields?.authorName, 160) ??
      reportedText(member?.name, 160),
    avatarUrl: member
      ? productPresenceAvatarUrl(member.fields?.avatarUrl)
      : undefined,
  };
}

/**
 * Query/room-specific subscriptions may omit redundant room fields. A connection
 * stream must report a resource before its records can enter a selected room.
 */
export function productCollaborationRecords(
  records: readonly IntegrationRecord[],
  scope: ProductCollaborationScope,
  requireResource = false,
) {
  return records.filter((record) => {
    const fields = record.fields ?? {};
    const bindings = ["resourceId", "roomId", "channelId"];
    if (
      requireResource &&
      !bindings.some((key) => reportedId(fields[key]) !== undefined)
    )
      return false;
    return (
      bindings.every(
        (key) =>
          fields[key] === undefined ||
          fields[key] === "" ||
          fields[key] === scope.resourceId,
      ) &&
      ["workspaceId", "connectionId", "integrationId"].every(
        (key) =>
          fields[key] === undefined ||
          fields[key] === scope[key as keyof ProductCollaborationScope],
      )
    );
  });
}

/**
 * Bounded, flat projection. Only reported thread IDs create groups; a reply label
 * requires a loaded parent in that same group. Missing history stays visible.
 */
export function productReportedConversation(
  records: readonly IntegrationRecord[],
  scope: ProductCollaborationScope,
): ProductReportedConversation {
  const loaded = productCollaborationRecords(records.slice(-100), scope).filter(
    (record) => messageTypes.has(record.type),
  );
  const counts = new Map<string, number>();
  for (const record of loaded)
    counts.set(record.id, (counts.get(record.id) ?? 0) + 1);
  const messages: ProductReportedMessage[] = loaded.map((record) => {
    const threadId = reportedId(record.fields?.threadId);
    const parentId = reportedId(record.fields?.parentId);
    const invalidParent =
      record.fields?.parentId !== undefined &&
      record.fields.parentId !== "" &&
      !parentId;
    if (!reportedId(record.id) || counts.get(record.id) !== 1 || invalidParent)
      return { record, relation: "invalid" };
    if (!threadId) return { record, relation: "flat" };
    return {
      record,
      threadId,
      parentId,
      relation: parentId ? "parent-unavailable" : "root",
    };
  });
  const byId = new Map(
    messages
      .filter((message) => counts.get(message.record.id) === 1)
      .map((message) => [message.record.id, message]),
  );
  const groups = new Map<string, ProductReportedMessage[]>();
  for (const message of messages) {
    if (!message.threadId) continue;
    if (message.parentId) {
      const parent = byId.get(message.parentId);
      if (parent) {
        if (
          parent === message ||
          parent.threadId !== message.threadId ||
          parent.relation === "invalid"
        )
          message.relation = "invalid";
        else {
          message.parent = parent.record;
          message.relation = "reply";
        }
      }
    }
    // No recursive rendering or inferred roots, including cyclic provider data.
    const visited = new Set<string>([message.record.id]);
    let ancestor = message.parentId;
    while (ancestor) {
      if (visited.has(ancestor)) {
        message.relation = "invalid";
        message.parent = undefined;
        break;
      }
      visited.add(ancestor);
      const parent = byId.get(ancestor);
      if (!parent || parent.threadId !== message.threadId) break;
      ancestor = parent.parentId;
    }
    if (
      message.relation !== "invalid" &&
      reportedId(scope.resourceId) &&
      !["deleted", "removed", "deleting"].includes(message.record.status)
    )
      message.replyTarget = {
        resourceId: scope.resourceId,
        threadId: message.threadId,
        parentId: message.record.id,
      };
    const group = groups.get(message.threadId) ?? [];
    group.push(message);
    groups.set(message.threadId, group);
  }
  return {
    resourceId: scope.resourceId,
    messages,
    flat: messages.filter((message) => !message.threadId),
    threads: [...groups].map(([id, items]) => ({ id, messages: items })),
  };
}

/** Revalidate at review/confirmation; never downgrade a disappeared reply to a post. */
export function productReplyIsCurrent(
  conversation: ProductReportedConversation,
  target: ProductReplyTarget,
) {
  return (
    conversation.resourceId === target.resourceId &&
    conversation.messages.some(
      (message) =>
        message.replyTarget?.threadId === target.threadId &&
        message.replyTarget.parentId === target.parentId &&
        message.replyTarget.resourceId === target.resourceId,
    )
  );
}

export function productSupportsReplies(action?: IntegrationAction) {
  return (
    action?.kind === "publish-message" &&
    ["threadId", "parentId"].every((id) =>
      action.fields.some((field) => field.id === id && field.type === "text"),
    )
  );
}

/**
 * Build only declared inputs. Room and reply IDs come from the selected context;
 * author identity is supplied by the backend, not editable frontend values.
 */
export function productCollaborationPublishValues({
  action,
  extra,
  message,
  conversation,
  reply,
}: {
  action?: IntegrationAction;
  extra: IntegrationValues;
  message: string;
  conversation: ProductReportedConversation;
  reply: ProductReplyTarget | null;
}): IntegrationValues | undefined {
  if (
    !action ||
    action.kind !== "publish-message" ||
    !reportedId(conversation.resourceId) ||
    (reply &&
      (!productSupportsReplies(action) ||
        !productReplyIsCurrent(conversation, reply)))
  )
    return undefined;
  const values: IntegrationValues = {};
  for (const field of action.fields) {
    if (["threadId", "parentId", "authorId", "authorName"].includes(field.id))
      continue;
    if (["resourceId", "roomId", "channelId"].includes(field.id))
      values[field.id] = conversation.resourceId;
    else if (["message", "content"].includes(field.id))
      values[field.id] = message;
    else
      values[field.id] =
        extra[field.id] ??
        (field.type === "toggle"
          ? false
          : field.type === "select"
            ? (field.options?.[0]?.value ?? "")
            : "");
  }
  if (reply) {
    values.threadId = reply.threadId;
    values.parentId = reply.parentId;
  }
  return values;
}
