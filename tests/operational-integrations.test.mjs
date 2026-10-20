import test from "node:test";
import assert from "node:assert/strict";
import {
  applyOperationalMapping,
  emptyOperationalSnapshot,
  initialOperationalValues,
  interpolateOperationalTemplate,
  mergeOperationalResult,
  operationalAction,
  operationalDefaultQuery,
  operationalField,
  operationalPayload,
  operationalPermitted,
  operationalPublicUrl,
  operationalReadPatch,
  operationalReadState,
  operationalRecordFields,
  operationalTemplateVariables,
  operationalText,
  operationalUploadLimit,
  scopedOperationalValues,
  validOperationalRecipients,
  validateOperationalFile,
  validateOperationalValues,
} from "../src/components/integrations/operational-model.ts";

const label = (en) => ({ en, es: en });
const field = (id, type = "text", required = false, extra = {}) => ({
  id,
  type,
  required,
  label: label(id),
  ...extra,
});
const action = (kind, fields = [], extra = {}) => ({
  id: `provider-specific-${kind}`,
  kind,
  label: label(kind),
  description: label(kind),
  fields,
  ...extra,
});
const record = (extra = {}) => ({
  id: "record-one",
  name: "Release note",
  type: "notification",
  status: "ready",
  updatedAt: "2026-10-20T12:00:00Z",
  description: "A release is available.",
  ...extra,
});

test("action resolution follows operation kind despite provider-specific IDs", () => {
  const query = action("query", [], { id: "provider-list-v4" });
  const send = action("send-email", [], { id: "resend-reviewed-message" });
  const definition = { actions: [query, send] };
  assert.equal(operationalAction(definition, "send-email"), send);
  assert.equal(
    operationalAction(definition, "trigger-workflow", "query"),
    query,
  );
  assert.equal(operationalAction(definition, "cancel-job"), null);
});

test("query selection prefers a permitted query that can load without invented fields", () => {
  const template = action("query", [field("templateRef", "text", true)], {
    id: "preview-approved-template",
    requiredPermissions: ["templates.read"],
  });
  const receipts = action("query", [], {
    id: "verified-deliveries",
    requiredPermissions: ["email.read"],
  });
  const definition = { actions: [template, receipts] };
  assert.equal(
    operationalDefaultQuery(definition, [], ["templates.read", "email.read"]),
    receipts,
  );
  assert.equal(
    operationalDefaultQuery(definition, [], ["templates.read"]),
    template,
  );
  assert.equal(operationalPermitted(receipts, ["templates.read"]), false);
  assert.equal(operationalPermitted(receipts, ["email.read"]), true);
  assert.equal(operationalPermitted(null, ["email.read"]), false);
});

test("fields explicitly labeled JSON reject malformed input without evaluating it", () => {
  const recipe = action("trigger-job", [
    field("payload", "text", true, { label: label("Task input (JSON)") }),
  ]);
  assert.deepEqual(
    validateOperationalValues(recipe, {
      payload: '{ "limit": 0, "active": false }',
    }),
    {},
  );
  assert.deepEqual(
    validateOperationalValues(recipe, { payload: "process.exit()" }),
    { payload: "json" },
  );
});

test("operation payloads exclude undeclared preview fields and credentials, preserving false and zero", () => {
  const recipe = action("update-preferences", [
    field("enabled", "toggle", true),
    field("limit", "number"),
    field("apiKey"),
    field("message"),
  ]);
  assert.deepEqual(
    operationalPayload(recipe, {
      enabled: false,
      limit: 0,
      apiKey: "not-for-the-ui",
      message: "",
      mappingPreview: "local only",
    }),
    { enabled: false, limit: 0 },
  );
  assert.deepEqual(
    validateOperationalValues(recipe, { enabled: false, limit: 0 }),
    {},
  );
});

test("required, numeric, URL and select validation rejects invalid operation inputs", () => {
  const recipe = action("trigger-job", [
    field("name", "text", true),
    field("count", "number"),
    field("url", "url"),
    field("channel", "select", true, {
      options: [{ value: "in-app", label: label("In app") }],
    }),
  ]);
  assert.deepEqual(
    validateOperationalValues(recipe, {
      name: "  ",
      count: Infinity,
      url: "javascript:alert(1)",
      channel: "sms",
    }),
    { name: "required", count: "number", url: "url", channel: "option" },
  );
  assert.deepEqual(
    validateOperationalValues(recipe, {
      name: "Export",
      count: 0,
      url: "/authorized/previews/file",
      channel: "in-app",
    }),
    {},
  );
});

test("default values and authorized resource references do not invent job IDs", () => {
  const recipe = action("query", [
    field("datasetReference", "text", true, {
      label: label("Selected resource reference"),
    }),
    field("jobId"),
    field("enabled", "toggle"),
    field("period", "select", true, {
      options: [{ value: "7d", label: label("Week") }],
    }),
  ]);
  assert.equal(initialOperationalValues(recipe).enabled, false);
  assert.deepEqual(scopedOperationalValues(recipe, ["selected-dataset"]), {
    datasetReference: "selected-dataset",
    jobId: "",
    enabled: false,
    period: "7d",
  });
  assert.equal(operationalField(recipe, "target").id, "jobId");
});

test("public preview links reject scripts, credential URLs and signed URL material", () => {
  assert.equal(
    operationalPublicUrl("https://cdn.example.com/image.webp?width=200"),
    "https://cdn.example.com/image.webp?width=200",
  );
  assert.equal(
    operationalPublicUrl("/assets/photo.webp"),
    "/assets/photo.webp",
  );
  for (const unsafe of [
    "javascript:alert(1)",
    "http://example.com",
    "//example.com/file",
    "https://user:pass@example.com/file",
    "https://example.com/?access_token=private",
    "https://example.com/?X-Amz-Signature=private",
    "https://example.com/#access_token=private",
    "https://example.com/?auth=private",
    "https://example.com\\evil",
  ])
    assert.equal(operationalPublicUrl(unsafe), null, unsafe);
});

test("presentation removes credential values and provider stack traces", () => {
  const text = operationalText(
    [
      "Upload started",
      'payload {"api_key": "very-private-value", "enabled": true}',
      "Authorization: Bearer private-token",
      "Error: private provider response",
      "    at transport (/private/path:20:1)",
      "Upload finished",
    ].join("\n"),
  );
  assert.match(text, /Upload started/);
  assert.match(text, /Upload finished/);
  for (const unsafe of [
    "very-private-value",
    "private-token",
    "private provider response",
    "/private/path",
  ])
    assert.equal(text.includes(unsafe), false);
  assert.deepEqual(
    operationalRecordFields(
      record({
        fields: {
          read: false,
          count: 0,
          apiKey: "private",
          refreshToken: "private",
        },
      }),
    ),
    [
      ["read", false],
      ["count", 0],
    ],
  );
});

test("template interpolation preserves unresolved variables and never evaluates content", () => {
  const template = "Hi {{ name }}, {{workspace}}: {{name}}. {{constructor}}";
  assert.deepEqual(
    operationalTemplateVariables(template, "{{url}} {{workspace}}"),
    ["name", "workspace", "constructor", "url"],
  );
  const result = interpolateOperationalTemplate(template, {
    name: "<script>alert(1)</script>",
    workspace: "",
  });
  assert.equal(
    result.text,
    "Hi <script>alert(1)</script>, {{workspace}}: <script>alert(1)</script>. {{constructor}}",
  );
  assert.deepEqual(result.missing, ["workspace", "constructor"]);
});

test("recipient validation supports an explicit address list and rejects malformed destinations", () => {
  assert.equal(
    validOperationalRecipients("one@example.com, two@example.org"),
    true,
  );
  assert.equal(
    validOperationalRecipients("one@example.com, two@example.org", 1),
    false,
  );
  assert.equal(
    validOperationalRecipients("one@example.com;\ntwo@example.org"),
    false,
  );
  for (const invalid of [
    "",
    "not-an-address",
    "name <one@example.com>",
    "one@example.com,",
  ])
    assert.equal(validOperationalRecipients(invalid), false);
});

test("upload validation requires content, a bounded size and alt text for raster previews", () => {
  assert.equal(
    validateOperationalFile(
      { name: "photo.webp", size: 1024, type: "image/webp" },
      "",
    ),
    "alt",
  );
  assert.equal(
    validateOperationalFile(
      { name: "photo.webp", size: 1024, type: "image/webp" },
      "A blue chair",
    ),
    null,
  );
  assert.equal(
    validateOperationalFile(
      { name: "report.pdf", size: 1024, type: "application/pdf" },
      "",
    ),
    null,
  );
  assert.equal(
    validateOperationalFile(
      { name: "empty.txt", size: 0, type: "text/plain" },
      "",
    ),
    "empty",
  );
  assert.equal(
    validateOperationalFile(
      {
        name: "large.zip",
        size: operationalUploadLimit + 1,
        type: "application/zip",
      },
      "",
    ),
    "size",
  );
});

test("mapping preserves falsy values and applies only the declared conversion", () => {
  const result = applyOperationalMapping(
    {
      zero: 0,
      enabled: false,
      email: " A@EXAMPLE.COM ",
      number: " 12.5 ",
      truth: "false",
    },
    [
      { id: "zero", source: "zero", target: "count", transform: "copy" },
      { id: "enabled", source: "enabled", target: "active", transform: "copy" },
      { id: "email", source: "email", target: "email", transform: "trim" },
      { id: "number", source: "number", target: "amount", transform: "number" },
      { id: "truth", source: "truth", target: "optIn", transform: "boolean" },
    ],
  );
  assert.deepEqual(result, {
    output: {
      count: 0,
      active: false,
      email: "A@EXAMPLE.COM",
      amount: 12.5,
      optIn: false,
    },
    errors: [],
  });
});

test("mapping prevents prototype writes, credentials and ambiguous duplicate destinations", () => {
  const result = applyOperationalMapping({ name: "Ada", apiKey: "private" }, [
    {
      id: "prototype",
      source: "name",
      target: " __proto__ ",
      transform: "copy",
    },
    { id: "secret", source: "apiKey", target: "copied", transform: "copy" },
    { id: "first", source: "name", target: "customer", transform: "copy" },
    {
      id: "duplicate",
      source: "name",
      target: " customer ",
      transform: "copy",
    },
    {
      id: "missing",
      source: "not-returned",
      target: "other",
      transform: "copy",
    },
  ]);
  assert.deepEqual(result.output, { customer: "Ada" });
  assert.deepEqual(result.errors, [
    { id: "prototype", code: "target" },
    { id: "secret", code: "target" },
    { id: "duplicate", code: "duplicate" },
    { id: "missing", code: "missing" },
  ]);
  assert.equal(Object.getPrototypeOf(result.output), Object.prototype);
});

test("mapping rejects blank numeric input and non-boolean truthy text", () => {
  const result = applyOperationalMapping(
    { empty: " ", invalid: "yes", false: "0" },
    [
      { id: "number", source: "empty", target: "count", transform: "number" },
      {
        id: "boolean",
        source: "invalid",
        target: "active",
        transform: "boolean",
      },
      { id: "zero", source: "false", target: "enabled", transform: "boolean" },
    ],
  );
  assert.deepEqual(result.output, { enabled: false });
  assert.deepEqual(result.errors, [
    { id: "number", code: "conversion" },
    { id: "boolean", code: "conversion" },
  ]);
});

test("notification read state remains unknown unless returned explicitly", () => {
  assert.equal(operationalReadState(record()), "unknown");
  assert.equal(
    operationalReadState(record({ fields: { read: false } })),
    "unread",
  );
  assert.equal(
    operationalReadState(record({ fields: { isRead: true } })),
    "read",
  );
  assert.equal(operationalReadState(record({ status: "unread" })), "unread");
});

test("notification read patches need a declared marker and valid required fields", () => {
  const update = action("update-record", [
    field("resourceId"),
    field("recordId", "text", true),
    field("isRead", "toggle", true),
    field("name", "text", true),
  ]);
  assert.deepEqual(operationalReadPatch(update, record()), {
    name: "Release note",
    recordId: "record-one",
    isRead: true,
  });
  assert.equal(
    operationalReadPatch(
      action("update-record", [
        field("recordId", "text", true),
        field("enabled", "toggle"),
      ]),
      record(),
    ),
    null,
  );
  assert.equal(
    operationalReadPatch(
      action("update-record", [
        field("recordId", "text", true),
        field("read", "toggle"),
        field("organization", "text", true),
      ]),
      record(),
    ),
    null,
  );
});

test("result merging is immutable, upserts typed records and preserves queued delivery status", () => {
  const original = emptyOperationalSnapshot();
  const first = mergeOperationalResult(original, {
    kind: "record",
    record: record(),
  });
  const second = mergeOperationalResult(first, {
    kind: "record",
    record: record({ status: "read" }),
  });
  assert.equal(original.records.length, 0);
  assert.equal(first.records[0].status, "ready");
  assert.equal(second.records.length, 1);
  assert.equal(second.records[0].status, "read");
  const delivery = {
    id: "delivery-one",
    status: "queued",
    recipient: "one@example.com",
    subject: "Hi",
    preview: "Hello",
  };
  const third = mergeOperationalResult(second, { kind: "delivery", delivery });
  assert.equal(third.deliveries[0].status, "queued");
  assert.equal(third.records, second.records);
  const fourth = mergeOperationalResult(
    third,
    { kind: "records", records: [], total: 0 },
    true,
  );
  assert.equal(fourth.records.length, 0);
  assert.equal(fourth.deliveries[0].status, "queued");
});
