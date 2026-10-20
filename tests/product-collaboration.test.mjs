import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, test } from "node:test";
import {
  productCollaborationAuthor,
  productCollaborationPublishValues,
  productCollaborationRecords,
  productPresenceAvatarUrl,
  productPresenceRecords,
  productReplyIsCurrent,
  productReportedConversation,
  productSupportsReplies,
} from "../src/components/integrations/product-collaboration-model.ts";

const sourceRoot = new URL("../src/", import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/"))
      specifier = new URL(specifier.slice(2), sourceRoot).href;
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        for (const extension of [".ts", ".tsx"]) {
          const candidate = new URL(
            `${specifier}${extension}`,
            context.parentURL,
          );
          if (existsSync(candidate))
            return nextResolve(candidate.href, context);
        }
      }
      throw error;
    }
  },
});
after(() => hooks.deregister());

const { getIntegrationDefinition } =
  await import("../src/lib/integrations/definitions.ts");
const { createDemoIntegrationsAdapter, demoIntegrationConfiguration } =
  await import("../src/lib/integrations/demo-adapter.ts");
const { parseIntegrationUpdate, validateIntegrationFields } =
  await import("../src/lib/integrations/validation.ts");

const scope = {
  resourceId: "room-a",
  workspaceId: "workspace-a",
  connectionId: "connection-a",
  integrationId: "liveblocks",
};
const record = (id, fields = {}) => ({
  id,
  name: `Message ${id}`,
  type: "comment",
  status: "ready",
  updatedAt: "2026-10-20T10:00:00.000Z",
  description: `Reported content ${id}`,
  fields: { resourceId: scope.resourceId, ...fields },
});
const publish = getIntegrationDefinition("liveblocks").actions.find(
  (action) => action.kind === "publish-message",
);

test("flat comments do not become inferred threads, including parent-only metadata", () => {
  const model = productReportedConversation(
    [
      record("one"),
      record("two", { parentId: "one" }),
      record("three", { threadId: ["invented"] }),
    ],
    scope,
  );
  assert.equal(model.threads.length, 0);
  assert.deepEqual(
    model.flat.map((message) => message.record.id),
    ["one", "two", "three"],
  );
  assert.ok(model.messages.every((message) => !message.replyTarget));
});

test("reported thread IDs group only their own messages and loaded parent IDs", () => {
  const root = record("root-a", { threadId: "thread-a" });
  const model = productReportedConversation(
    [
      root,
      record("reply-a", { threadId: "thread-a", parentId: root.id }),
      record("root-b", { threadId: "thread-b" }),
      record("reply-b", { threadId: "thread-b", parentId: "root-b" }),
      record("flat"),
    ],
    scope,
  );
  assert.deepEqual(
    model.threads.map((thread) => [
      thread.id,
      thread.messages.map((message) => message.record.id),
    ]),
    [
      ["thread-a", ["root-a", "reply-a"]],
      ["thread-b", ["root-b", "reply-b"]],
    ],
  );
  assert.equal(model.messages[1].parent, root);
  assert.equal(model.messages[1].relation, "reply");
  assert.deepEqual(model.messages[1].replyTarget, {
    resourceId: "room-a",
    threadId: "thread-a",
    parentId: "reply-a",
  });
  assert.deepEqual(
    model.flat.map((message) => message.record.id),
    ["flat"],
  );
});

test("explicit scope mismatches are excluded and connection streams need reported resources", () => {
  const records = [
    record("local"),
    record("foreign-room", { roomId: "room-b" }),
    record("foreign-resource", { resourceId: "room-b" }),
    record("foreign-channel", { channelId: "room-b" }),
    record("foreign-workspace", { workspaceId: "workspace-b" }),
    record("foreign-connection", { connectionId: "connection-b" }),
    record("foreign-provider", { integrationId: "realtime-messaging" }),
    { ...record("scoped-response"), fields: { threadId: "reported-thread" } },
  ];
  assert.deepEqual(
    productCollaborationRecords(records, scope).map((item) => item.id),
    ["local", "scoped-response"],
  );
  assert.deepEqual(
    productCollaborationRecords(records, scope, true).map((item) => item.id),
    ["local"],
  );
  assert.equal(productReportedConversation(records, scope).messages.length, 2);
});

test("partial history reports an unavailable parent without inventing a root", () => {
  const model = productReportedConversation(
    [
      record("loaded-reply", {
        threadId: "thread-a",
        parentId: "outside-page",
      }),
    ],
    scope,
  );
  assert.equal(model.threads.length, 1);
  assert.equal(model.messages[0].relation, "parent-unavailable");
  assert.equal(model.messages[0].parent, undefined);
  assert.equal(model.messages[0].parentId, "outside-page");
  // A new reply may target this loaded record, never the unloaded ancestor.
  assert.equal(model.messages[0].replyTarget.parentId, "loaded-reply");
  assert.equal(
    productReplyIsCurrent(model, {
      resourceId: scope.resourceId,
      threadId: "thread-a",
      parentId: "outside-page",
    }),
    false,
  );
});

test("duplicate IDs, cycles, self-parenting and cross-thread links cannot become reply targets", () => {
  const model = productReportedConversation(
    [
      record("duplicate", { threadId: "thread-a" }),
      record("duplicate", { threadId: "thread-b" }),
      record("cycle-a", { threadId: "cycle", parentId: "cycle-b" }),
      record("cycle-b", { threadId: "cycle", parentId: "cycle-a" }),
      record("self", { threadId: "self-thread", parentId: "self" }),
      record("root", { threadId: "thread-a" }),
      record("cross-thread", { threadId: "thread-b", parentId: "root" }),
    ],
    scope,
  );
  const invalid = model.messages.filter(
    (message) => message.relation === "invalid",
  );
  assert.equal(invalid.length, 6);
  assert.ok(invalid.every((message) => !message.replyTarget));
  assert.ok(
    model.messages.find((message) => message.record.id === "root").replyTarget,
  );
});

test("the loaded window and metadata are bounded without truncating or guessing identifiers", () => {
  const model = productReportedConversation(
    Array.from({ length: 120 }, (_, index) =>
      record(`message-${index}`, { threadId: "reported-thread" }),
    ),
    scope,
  );
  assert.equal(model.messages.length, 100);
  assert.equal(model.messages[0].record.id, "message-20");
  const malformed = productReportedConversation(
    [
      record("too-long", { threadId: "x".repeat(201) }),
      record("control", { threadId: "thread\ninjected" }),
      record("numeric", { threadId: 12 }),
      record("bad-parent", { threadId: "thread-a", parentId: ["not-flat"] }),
    ],
    scope,
  );
  assert.equal(malformed.threads.length, 0);
  assert.equal(malformed.messages.length, 4);
  assert.ok(malformed.messages.every((message) => !message.replyTarget));
});

test("reply reviews fail closed when a room, parent or reported thread changes", () => {
  const parent = record("parent", { threadId: "thread-a" });
  const original = productReportedConversation([parent], scope);
  const target = original.messages[0].replyTarget;
  assert.equal(productReplyIsCurrent(original, target), true);
  for (const next of [
    productReportedConversation([], scope),
    productReportedConversation([parent], { ...scope, resourceId: "room-b" }),
    productReportedConversation(
      [record("parent", { threadId: "thread-b" })],
      scope,
    ),
    productReportedConversation([{ ...parent, status: "deleted" }], scope),
    productReportedConversation([record("parent")], scope),
  ]) {
    assert.equal(productReplyIsCurrent(next, target), false);
    assert.equal(
      productCollaborationPublishValues({
        action: publish,
        extra: {},
        message: "Preserved reply draft",
        conversation: next,
        reply: target,
      }),
      undefined,
    );
  }
});

test("reply payloads use known selected-room IDs and never accept extra identity or secret fields", () => {
  const model = productReportedConversation(
    [record("parent", { threadId: "thread-a" })],
    scope,
  );
  const input = {
    action: publish,
    extra: {
      resourceId: "room-b",
      threadId: "forged-thread",
      parentId: "forged-parent",
      authorId: "forged-author",
      authorName: "Forged name",
      secret: "must-not-send",
    },
    message: "My reviewed reply",
    conversation: model,
    reply: model.messages[0].replyTarget,
  };
  const values = productCollaborationPublishValues(input);
  assert.deepEqual(values, {
    resourceId: "room-a",
    content: "My reviewed reply",
    threadId: "thread-a",
    parentId: "parent",
  });
  validateIntegrationFields(publish.fields, values);
  assert.deepEqual(
    productCollaborationPublishValues({ ...input, reply: null }),
    { resourceId: "room-a", content: "My reviewed reply" },
  );
});

test("definitions without explicit reply inputs keep their ordinary publishing role", () => {
  const ordinary = {
    ...publish,
    fields: publish.fields.filter(
      (field) => !["threadId", "parentId"].includes(field.id),
    ),
  };
  const model = productReportedConversation(
    [record("parent", { threadId: "thread-a" })],
    scope,
  );
  assert.equal(productSupportsReplies(ordinary), false);
  assert.equal(
    productCollaborationPublishValues({
      action: ordinary,
      extra: {},
      message: "Reply",
      conversation: model,
      reply: model.messages[0].replyTarget,
    }),
    undefined,
  );
  assert.deepEqual(
    productCollaborationPublishValues({
      action: ordinary,
      extra: {},
      message: "Top-level content",
      conversation: model,
      reply: null,
    }),
    { resourceId: "room-a", content: "Top-level content" },
  );
});

test("presence preserves only reported people and safe HTTPS/local proxy avatars", () => {
  const credentialUrl = new URL("https://images.example.test/avatar.webp");
  credentialUrl.username = "fixture";
  credentialUrl.password = "synthetic-fixture";
  for (const url of [
    "https://images.example.test/avatar.webp",
    "/assets/avatars/alex-morgan.svg",
    "/consumer/avatar-proxy/profile-7",
  ])
    assert.equal(productPresenceAvatarUrl(url), url);
  for (const url of [
    "http://images.example.test/avatar.webp",
    "//images.example.test/avatar.webp",
    credentialUrl.href,
    "javascript:alert(1)",
    "data:image/svg+xml,invalid",
    "blob:https://images.example.test/avatar",
    "/\\images.example.test/avatar",
    "/proxy/avatar\ninjected",
    " https://images.example.test/avatar.webp ",
    42,
  ])
    assert.equal(productPresenceAvatarUrl(url), undefined);
  const presence = productPresenceRecords([
    {
      id: "alex",
      name: "Alex Morgan",
      state: "online",
      avatarUrl: "/assets/avatars/alex-morgan.svg",
    },
    { id: "isabel", name: "Isabel Torres", state: "editing" },
    {
      id: "noor",
      name: "Noor Ahmed",
      state: "away",
      avatarUrl: "http://unsafe.test/avatar",
    },
  ]);
  assert.equal(presence.length, 3);
  assert.equal(presence[0].fields.avatarUrl, "/assets/avatars/alex-morgan.svg");
  assert.equal(presence[1].fields, undefined);
  assert.equal(presence[2].fields, undefined);
  assert.ok(presence.every((item) => item.updatedAt === ""));
  assert.deepEqual(productPresenceRecords([]), []);
});

test("message authors join server presence by ID and never by a matching name or owner field", () => {
  const presence = productPresenceRecords([
    {
      id: "alex",
      name: "Alex Morgan",
      state: "online",
      avatarUrl: "/assets/avatars/alex-morgan.svg",
    },
  ]);
  const author = productCollaborationAuthor(
    record("one", { authorId: "alex", authorName: "Alex Morgan" }),
    presence,
  );
  assert.equal(author.avatarUrl, "/assets/avatars/alex-morgan.svg");
  assert.equal(author.name, "Alex Morgan");
  assert.equal(
    productCollaborationAuthor(
      record("two", { authorName: "Alex Morgan" }),
      presence,
    ).avatarUrl,
    undefined,
  );
  assert.equal(
    productCollaborationAuthor(
      record("three", { owner: "Alex Morgan" }),
      presence,
    ).name,
    undefined,
  );
  assert.equal(
    productCollaborationAuthor(record("four", { authorId: "alex" }), [
      ...presence,
      ...presence,
    ]).avatarUrl,
    undefined,
  );
});

test("the current presence contract preserves validated avatar URLs and rejects unsafe schemes", () => {
  const definition = getIntegrationDefinition("liveblocks");
  const input = {
    kind: "presence",
    members: [
      {
        id: "alex",
        name: "Alex Morgan",
        state: "online",
        avatarUrl: "/assets/avatars/alex-morgan.svg",
      },
    ],
  };
  const update = parseIntegrationUpdate(input, definition, scope.connectionId, {
    workspaceId: scope.workspaceId,
  });
  assert.equal(
    productPresenceRecords(update.members)[0].fields.avatarUrl,
    input.members[0].avatarUrl,
  );
  assert.throws(() =>
    parseIntegrationUpdate(
      {
        ...input,
        members: [
          { ...input.members[0], avatarUrl: "http://unsafe.test/avatar" },
        ],
      },
      definition,
      scope.connectionId,
      { workspaceId: scope.workspaceId },
    ),
  );
});

test("all four collaboration choices preserve reviewed reply metadata in the demo and enforce write grants", async () => {
  const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
  let checked = 0;
  for (const id of ["realtime-messaging", "liveblocks"]) {
    const definition = getIntegrationDefinition(id);
    const action = definition.actions.find(
      (item) => item.kind === "publish-message",
    );
    assert.equal(productSupportsReplies(action), true);
    assert.equal(action.requiresReview, true);
    for (const option of definition.options) {
      const workspaceId = `thread-fixture-${++checked}`;
      const resourceId = `${id}-resource-1`;
      const request = {
        integrationId: id,
        providerOptionId: option.id,
        configuration: demoIntegrationConfiguration(definition),
        permissions: definition.permissions.map((permission) => permission.id),
        resourceIds: [resourceId],
      };
      const connection = (await adapter.connect(request, { workspaceId }))
        .connection;
      const operation = (values) => ({
        integrationId: id,
        connectionId: connection.id,
        actionId: action.id,
        values,
      });
      // This fixture models a server-reported thread; the frontend does not create its ID.
      const root = await adapter.execute(
        operation({
          resourceId,
          content: "Reported root",
          threadId: "server-thread-a",
        }),
        { workspaceId },
      );
      assert.equal(root.kind, "record");
      const room = {
        resourceId,
        workspaceId,
        connectionId: connection.id,
        integrationId: id,
      };
      const model = productReportedConversation([root.record], room);
      const values = productCollaborationPublishValues({
        action,
        extra: {},
        message: "Reviewed reply",
        conversation: model,
        reply: model.messages[0].replyTarget,
      });
      const reply = await adapter.execute(operation(values), { workspaceId });
      assert.equal(reply.kind, "record");
      assert.equal(reply.record.fields.threadId, "server-thread-a");
      assert.equal(reply.record.fields.parentId, root.record.id);
      const returned = productReportedConversation(
        [root.record, reply.record],
        room,
      );
      assert.equal(returned.threads.length, 1);
      assert.equal(returned.messages[1].parent.id, root.record.id);
      await adapter.configure(
        connection.id,
        {
          configuration: connection.configuration,
          permissions: request.permissions.filter(
            (permission) => !action.requiredPermissions.includes(permission),
          ),
          resourceIds: [resourceId],
          revision: connection.revision,
        },
        { workspaceId },
      );
      await assert.rejects(
        adapter.execute(operation(values), { workspaceId }),
        (error) => error.code === "permission-denied",
      );
    }
  }
  assert.equal(checked, 4);
});
