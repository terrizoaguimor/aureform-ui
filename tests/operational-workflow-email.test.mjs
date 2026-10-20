import assert from "node:assert/strict";
import test from "node:test";
import {
  operationalWorkflowAccountStatus,
  operationalWorkflowRetry,
  operationalWorkflowTemplateCatalog,
  reportedWorkflowMetadata,
} from "../src/components/integrations/operational-workflows.ts";
import {
  mapOperationalEmailEvent,
  operationalEmailStatus,
  reportedEmailDetails,
} from "../src/components/integrations/operational-email-events.ts";
import { operationalPublicUrl } from "../src/components/integrations/operational-model.ts";

const label = (en) => ({ en, es: en });
const action = {
  id: "provider-trigger-approved-workflow",
  kind: "trigger-workflow",
  label: label("Trigger"),
  description: label("Request an approved workflow run."),
  fields: [
    {
      id: "workflowRef",
      type: "text",
      required: true,
      label: label("Workflow"),
    },
    { id: "payload", type: "text", label: label("Input JSON") },
    { id: "enabled", type: "toggle", label: label("Enabled") },
    { id: "limit", type: "number", label: label("Limit") },
    { id: "accountRefs", type: "text", label: label("Account references") },
    { id: "privateKey", type: "text", label: label("Private key") },
  ],
};
const job = {
  id: "run-42",
  name: "Approved customer workflow",
  status: "failed",
  progress: 35,
  steps: [{ id: "load", name: "Load authorized data", status: "failed" }],
  logs: ["The consumer backend reported a failure."],
};
const context = {
  id: "workspace-one:delivery-event-42",
  name: "Authorized delivery event",
  updatedAt: "2026-10-20T15:00:00.000Z",
  recipient: "recipient@example.invalid",
};

test("workflow retries use current declared inputs, preserve false/zero and clone mutable arrays", () => {
  const values = {
    workflowRef: "approved-workflow-3",
    payload: '{"limit":0}',
    enabled: false,
    limit: 0,
    accountRefs: ["account-3"],
    privateKey: "excluded",
    undeclared: "excluded",
  };
  const history = [{ action, values, result: { kind: "job", job } }];
  const packet = operationalWorkflowRetry(action, job, history);
  assert.equal(packet.review, true);
  assert.equal(packet.action, action);
  assert.equal(packet.sourceRunId, "run-42");
  assert.deepEqual(packet.values, {
    workflowRef: "approved-workflow-3",
    payload: '{"limit":0}',
    enabled: false,
    limit: 0,
    accountRefs: ["account-3"],
  });
  packet.values.accountRefs.push("local-edit");
  assert.deepEqual(values.accountRefs, ["account-3"]);
  assert.equal(
    job.status,
    "failed",
    "Preparing a retry never changes a reported run.",
  );
});

test("unknown workflow inputs stay unknown rather than deriving a reference from a run ID or owner", () => {
  assert.equal(operationalWorkflowRetry(action, job, []), null);
  assert.equal(
    operationalWorkflowRetry(
      action,
      {
        ...job,
        owner: { id: "owner-1", name: "Workflow administrator" },
      },
      [
        {
          action,
          values: { workflowRef: "other" },
          result: { kind: "job", job: { ...job, id: "other-run" } },
        },
      ],
    ),
    null,
  );
});

test("a retry cannot replay an unrelated operation or a successful/active run", () => {
  const history = [
    {
      action,
      values: { workflowRef: "approved" },
      result: { kind: "job", job },
    },
  ];
  for (const status of ["queued", "running", "completed"]) {
    assert.equal(
      operationalWorkflowRetry(action, { ...job, status }, history),
      null,
    );
  }
  assert.equal(operationalWorkflowRetry(null, job, history), null);
  assert.equal(
    operationalWorkflowRetry({ ...action, kind: "trigger-job" }, job, history),
    null,
  );
  assert.equal(
    operationalWorkflowRetry(
      { ...action, id: "different-provider-action" },
      job,
      history,
    ),
    null,
  );
  assert.equal(
    operationalWorkflowRetry(action, job, [
      {
        action,
        values: { workflowRef: "approved" },
        result: { kind: "receipt", id: "run-42", message: "Acknowledged" },
      },
    ]),
    null,
  );
  assert.equal(
    operationalWorkflowRetry(action, { ...job, status: "cancelled" }, history)
      .review,
    true,
  );
});

test("workflow metadata never invents owner/accounts and distinguishes an empty report from unknown", () => {
  assert.deepEqual(reportedWorkflowMetadata(job), {
    owner: null,
    accounts: null,
    templateUrl: null,
    templateName: null,
  });
  assert.deepEqual(
    reportedWorkflowMetadata({ ...job, owner: null, accounts: null }),
    {
      owner: null,
      accounts: null,
      templateUrl: null,
      templateName: null,
    },
  );
  assert.deepEqual(
    reportedWorkflowMetadata({ ...job, accounts: [] }).accounts,
    [],
  );
});

test("reported workflow identity references and all four account states remain separate from credentials", () => {
  const accounts = ["connected", "expired", "revoked", "unknown"].map(
    (status, index) => ({
      id: `account-${index}`,
      name: `Reported account ${index}`,
      status,
    }),
  );
  const reported = reportedWorkflowMetadata({
    ...job,
    owner: { id: "owner-3", name: "Workflow administrator" },
    accounts,
    templateUrl: "https://consumer.example/templates/approved",
    templateName: "Approved customer workflow",
  });
  assert.deepEqual(reported.owner, {
    id: "owner-3",
    name: "Workflow administrator",
  });
  assert.deepEqual(reported.accounts, accounts);
  assert.notEqual(reported.accounts, accounts);
  assert.notEqual(reported.accounts[0], accounts[0]);
  assert.deepEqual(
    accounts.map(({ status }) => operationalWorkflowAccountStatus(status)),
    [
      ["Connected", "Conectada"],
      ["Expired", "Caducada"],
      ["Revoked", "Revocada"],
      ["Unknown", "Desconocida"],
    ],
  );
});

test("malformed metadata is unknown and unsafe template links cannot become UI anchors", () => {
  for (const input of [
    { owner: "owner-guessed-from-login" },
    { owner: { id: "bad\nowner", name: "Owner" } },
    { accounts: ["a"] },
    { accounts: [{ id: "a", name: "Account", status: "pretend-connected" }] },
    {
      accounts: Array.from({ length: 101 }, () => ({
        id: "a",
        name: "Account",
        status: "connected",
      })),
    },
  ]) {
    const metadata = reportedWorkflowMetadata({ ...job, ...input });
    if ("owner" in input) assert.equal(metadata.owner, null);
    if ("accounts" in input) assert.equal(metadata.accounts, null);
  }
  const credentialUrl = new URL("https://consumer.example/template");
  credentialUrl.username = "fixture";
  credentialUrl.password = "synthetic-fixture";
  for (const templateUrl of [
    "javascript:alert(1)",
    "http://consumer.example/template",
    credentialUrl.href,
    "https://consumer.example/template?token=private",
    "https://consumer.example/template?X-Amz-Signature=private",
    "https://consumer.example/template#secret=private",
    "//consumer.example/template",
  ]) {
    assert.equal(
      operationalPublicUrl(
        reportedWorkflowMetadata({ ...job, templateUrl }).templateUrl,
      ),
      null,
    );
  }
  assert.equal(
    operationalPublicUrl(
      reportedWorkflowMetadata({
        ...job,
        templateUrl: "/templates/approved-3",
      }).templateUrl,
    ),
    "/templates/approved-3",
  );
});

test("template discovery uses the selected public Make/Zapier catalogue and exposes no n8n builder", () => {
  assert.deepEqual(operationalWorkflowTemplateCatalog("make"), {
    provider: "Make",
    url: "https://www.make.com/templates",
  });
  assert.deepEqual(operationalWorkflowTemplateCatalog("zapier"), {
    provider: "Zapier",
    url: "https://zapier.com/templates",
  });
  for (const selected of [
    "n8n",
    "make-zapier",
    "unknown",
    "https://private.example/builder",
  ]) {
    assert.equal(operationalWorkflowTemplateCatalog(selected), null);
  }
});

const mappings = [
  ["resend", { type: "email.scheduled" }, "queued"],
  ["resend", { type: "email.sent" }, "sent"],
  ["resend", { type: "email.delivered" }, "delivered"],
  ["resend", { type: "email.failed" }, "failed"],
  [
    "resend",
    {
      type: "email.bounced",
      data: { bounce: { type: "Permanent", subType: "NoEmail" } },
    },
    "bounced",
  ],
  [
    "resend",
    {
      type: "email.suppressed",
      data: { suppressed: { type: "OnAccountSuppressionList" } },
    },
    "rejected",
  ],
  ["postmark", { RecordType: "Delivery" }, "delivered"],
  [
    "postmark",
    { RecordType: "Bounce", Type: "HardBounce", TypeCode: 1 },
    "bounced",
  ],
  [
    "postmark",
    { RecordType: "Bounce", Type: "SMTPApiError", TypeCode: 100007 },
    "rejected",
  ],
  ["sendgrid", { event: "processed" }, "queued"],
  ["sendgrid", { event: "delivered" }, "delivered"],
  ["sendgrid", { event: "bounce", type: "bounce", status: "5.1.1" }, "bounced"],
  [
    "sendgrid",
    { event: "bounce", type: "blocked", status: "4.7.0" },
    "bounced",
  ],
  ["sendgrid", { event: "dropped" }, "rejected"],
  ["ses", { eventType: "Send" }, "sent"],
  ["ses", { eventType: "Delivery" }, "delivered"],
  [
    "ses",
    {
      eventType: "Bounce",
      bounce: { bounceType: "Permanent", bounceSubType: "NoEmail" },
    },
    "bounced",
  ],
  [
    "ses",
    { eventType: "Reject", reject: { reason: "Bad content" } },
    "rejected",
  ],
  ["ses", { eventType: "Rendering Failure" }, "failed"],
];
for (const [provider, payload, expected] of mappings) {
  const native =
    provider === "resend"
      ? payload.type
      : provider === "postmark"
        ? payload.RecordType
        : provider === "sendgrid"
          ? payload.event
          : payload.eventType;
  test(`${provider} native ${native}${payload.Type ? `/${payload.Type}` : payload.type === "blocked" ? "/blocked" : ""} maps to exact ${expected} record status`, () => {
    const original = JSON.stringify(payload);
    const record = mapOperationalEmailEvent(provider, payload, context);
    assert.equal(record.status, expected);
    assert.equal(record.type, "email-delivery");
    assert.equal(record.id, context.id);
    assert.equal(record.updatedAt, context.updatedAt);
    assert.equal(record.fields.provider, provider);
    assert.equal(record.fields.recipient, context.recipient);
    assert.equal(JSON.stringify(payload), original);
  });
}

test("provider reason codes and native dispositions are bounded allowlisted metadata", () => {
  assert.deepEqual(
    mapOperationalEmailEvent(
      "resend",
      {
        type: "email.suppressed",
        data: {
          suppressed: {
            type: "OnAccountSuppressionList",
            message: "not copied",
          },
        },
      },
      context,
    ).fields,
    {
      provider: "resend",
      nativeEvent: "email.suppressed",
      recipient: context.recipient,
      reasonCode: "OnAccountSuppressionList",
    },
  );
  assert.equal(
    mapOperationalEmailEvent(
      "postmark",
      {
        RecordType: "Bounce",
        Type: "SMTPApiError",
        TypeCode: 100007,
      },
      context,
    ).fields.reasonCode,
    "100007",
  );
  const bounce = mapOperationalEmailEvent(
    "ses",
    {
      notificationType: "Bounce",
      bounce: {
        bounceType: "Transient",
        bounceSubType: "MailboxFull",
        diagnosticCode: "not copied",
      },
    },
    context,
  );
  assert.equal(bounce.status, "bounced");
  assert.equal(bounce.fields.disposition, "Transient");
  assert.equal(bounce.fields.reasonCode, "MailboxFull");
  const blocked = mapOperationalEmailEvent(
    "sendgrid",
    {
      event: "bounce",
      type: "blocked",
      status: "4.7.0",
      reason: "not copied",
      apiKey: "not copied",
      headers: { authorization: "not copied" },
    },
    context,
  );
  assert.deepEqual(blocked.fields, {
    provider: "sendgrid",
    nativeEvent: "bounce",
    recipient: context.recipient,
    reasonCode: "4.7.0",
    disposition: "blocked",
  });
});

test("unknown, delayed and engagement events retain their reported names without generic failure or delivery promotion", () => {
  for (const [provider, payload, native] of [
    ["resend", { type: "email.delivery_delayed" }, "email.delivery_delayed"],
    ["resend", { type: "email.opened" }, "email.opened"],
    ["postmark", { RecordType: "SpamComplaint" }, "SpamComplaint"],
    ["sendgrid", { event: "deferred" }, "deferred"],
    ["ses", { eventType: "DeliveryDelay" }, "DeliveryDelay"],
    ["ses", { eventType: "FutureStatus" }, "FutureStatus"],
    ["sendgrid", { event: "constructor" }, "constructor"],
  ]) {
    const record = mapOperationalEmailEvent(provider, payload, context);
    assert.equal(record.status, native);
    assert.deepEqual(operationalEmailStatus(record.status), {
      label: [native, native],
      variant: "neutral",
      known: false,
    });
  }
});

test("delivery badges distinguish rejected/bounced/failed/queued/sent in English and Spanish", () => {
  for (const [status, label, variant] of [
    ["rejected", ["Rejected", "Rechazado"], "destructive"],
    ["bounced", ["Bounced", "Rebotado"], "destructive"],
    ["failed", ["Failed", "Falló"], "destructive"],
    ["queued", ["Queued", "En cola"], "warning"],
    ["sent", ["Sent", "Enviado"], "neutral"],
    ["delivered", ["Delivered", "Entregado"], "neutral"],
  ])
    assert.deepEqual(operationalEmailStatus(status), {
      label,
      variant,
      known: true,
    });
});

test("event mapping rejects malformed context/types without inventing timestamps or scope", () => {
  for (const payload of [
    null,
    [],
    { event: "" },
    { event: "a".repeat(101) },
    { event: "bad\nevent" },
    Object.create({ event: "bounce" }),
  ]) {
    assert.throws(
      () => mapOperationalEmailEvent("sendgrid", payload, context),
      TypeError,
    );
  }
  for (const patch of [
    { id: "" },
    { name: "x".repeat(301) },
    { updatedAt: "unknown" },
    { description: "x".repeat(2001) },
    { recipient: "" },
  ])
    assert.throws(
      () =>
        mapOperationalEmailEvent(
          "sendgrid",
          { event: "bounce" },
          { ...context, ...patch },
        ),
      TypeError,
    );
  assert.throws(
    () => mapOperationalEmailEvent("__proto__", { event: "bounce" }, context),
    TypeError,
  );
});

test("missing/invalid optional delivery details remain unknown while valid backend times and codes are preserved", () => {
  const occurredAt = "2026-10-20T15:00:00.000Z";
  assert.deepEqual(reportedEmailDetails({ status: "bounced" }), {
    reasonCode: null,
    disposition: null,
    occurredAt: null,
  });
  assert.deepEqual(
    reportedEmailDetails({
      status: "bounced",
      reasonCode: "5.1.1",
      disposition: "blocked",
      occurredAt,
    }),
    { reasonCode: "5.1.1", disposition: "blocked", occurredAt },
  );
  assert.deepEqual(
    reportedEmailDetails({
      status: "bounced",
      reasonCode: "x".repeat(301),
      disposition: { secret: "not copied" },
      occurredAt: "yesterday",
    }),
    { reasonCode: null, disposition: null, occurredAt: null },
  );
});
