// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, chmod, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { EncryptedSetupStore } from "../lib/setup-store.js";
import { AutomaticSetup } from "../lib/automatic-setup.js";
import { sha256 } from "../lib/security.js";

const ORIGIN = "http://127.0.0.1:3000";
const CODE = "fixture_owner_login_code_not_a_carrier_secret_12345678";
const CREDENTIALS = { provider: "twilio", accountSid: "AC" + "a".repeat(32), authToken: "b".repeat(32) };
const NUMBER = { id: "PN" + "c".repeat(32), phoneNumber: "+12025550123", label: "Fixture owned number",
  voiceEnabled: true, hasExistingRouting: false };
const rejectsCode = (operation, code) => assert.rejects(operation, (error) => error.code === code);

async function fixture(t, options = {}) {
  const folder = await mkdtemp(join(tmpdir(), "aureform-setup-test-"));
  t.after(() => rm(folder, { recursive: true, force: true }));
  const file = join(folder, "state.json");
  const key = randomBytes(32).toString("base64");
  const store = new EncryptedSetupStore({ file, key });
  let epoch = Date.parse("2026-10-21T14:00:00Z");
  const effects = [];
  const operations = {
    twilio: {
      inspect: async () => ({ accountLabel: "Fixture account", numbers: [NUMBER] }),
      plan: async () => ({ number: NUMBER, routingFingerprint: "fixture-routing-v1", priorRouting: {},
        willReplaceRouting: false, steps: [{ id: "webhook", label: "Configure the selected number", kind: "update" }] }),
      apply: async ({ checkpoint }) => {
        effects.push("key-create");
        await checkpoint("key-created", { apiKeySecret: "fixture-generated-private-key" });
        return { ...CREDENTIALS, number: NUMBER, apiKeySid: "SK" + "d".repeat(32), apiKeySecret: "fixture-generated-private-key" };
      },
      ...options.operations,
    },
  };
  const activated = [];
  const env = { SETUP_ADMIN_AUTH_SHA256: sha256(CODE), SETUP_STATE_FILE: file, SETUP_MASTER_KEY: key };
  const setup = new AutomaticSetup({ env, config: { origins: [ORIGIN] }, operations, store,
    now: () => epoch, activate: async (value) => { activated.push(value); },
    canConfigure: options.canConfigure, authorizeTest: options.authorizeTest });
  await setup.initialize();
  return { setup, store, file, key, env, effects, activated, operations,
    advance: (milliseconds) => { epoch += milliseconds; } };
}

test("the vault encrypts carrier credentials, authenticates ciphertext, and preserves private permissions", async (t) => {
  const f = await fixture(t);
  await f.store.transaction((state) => { state.connections.example = CREDENTIALS; });
  const payload = await readFile(f.file, "utf8");
  assert.ok(!payload.includes(CREDENTIALS.authToken));
  assert.ok(!payload.includes(CREDENTIALS.accountSid));
  assert.ok(!payload.includes("authToken"));
  assert.equal((await stat(f.file)).mode & 0o777, 0o600);
  const reloaded = new EncryptedSetupStore({ file: f.file, key: f.key });
  assert.deepEqual((await reloaded.read()).connections.example, CREDENTIALS);
  const envelope = JSON.parse(payload);
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");
  ciphertext[0] ^= 1;
  envelope.ciphertext = ciphertext.toString("base64");
  await writeFile(f.file, JSON.stringify(envelope), { mode: 0o600 });
  await rejectsCode(reloaded.read(), "setup-storage-unreadable");
});

test("insecure existing vault files and incorrect keys are rejected rather than silently reset", async (t) => {
  const f = await fixture(t);
  const wrong = new EncryptedSetupStore({ file: f.file, key: randomBytes(32).toString("base64") });
  await rejectsCode(wrong.initialize(), "setup-storage-unreadable");
  await chmod(f.file, 0o644);
  await rejectsCode(f.store.read(), "insecure-setup-storage");
});

test("operator login is origin-scoped, opaque, expires in ten minutes and never returns carrier credentials", async (t) => {
  const f = await fixture(t);
  assert.throws(() => f.setup.login({ accessCode: CODE }, "https://untrusted.example.invalid"), { code: "origin-denied" });
  const session = f.setup.login({ accessCode: CODE }, ORIGIN);
  assert.notEqual(session.sessionToken, CODE);
  assert.equal(f.setup.authenticate("Bearer " + session.sessionToken, ORIGIN).origin, ORIGIN);
  assert.throws(() => f.setup.authenticate("Bearer " + session.sessionToken, "https://untrusted.example.invalid"), { code: "origin-denied" });
  f.advance(600001);
  assert.throws(() => f.setup.authenticate("Bearer " + session.sessionToken, ORIGIN), { code: "session-expired" });
});

test("operator password guessing is throttled without exposing a configured hash or a credential", async (t) => {
  const f = await fixture(t);
  for (let i = 0; i < 8; i++) assert.throws(() => f.setup.login({ accessCode: "x".repeat(40) }, ORIGIN), { code: "unauthorized" });
  assert.throws(() => f.setup.login({ accessCode: CODE }, ORIGIN), { code: "too-many-login-attempts" });
  f.advance(60001);
  assert.ok(f.setup.login({ accessCode: CODE }, ORIGIN).sessionToken);
});

test("inspection and plan require only provider credentials, never mutate a provider, and sanitize public DTOs", async (t) => {
  const f = await fixture(t);
  const inspection = await f.setup.inspect(CREDENTIALS);
  assert.equal(inspection.phase, "select-number");
  const plan = await f.setup.plan({ connectionId: inspection.connectionId, numberId: NUMBER.id });
  assert.equal(plan.phase, "review");
  assert.deepEqual(f.effects, []);
  assert.deepEqual(f.activated, []);
  for (const value of [inspection, plan]) {
    assert.ok(!JSON.stringify(value).includes(CREDENTIALS.authToken));
    assert.ok(!JSON.stringify(value).includes("credentials"));
    assert.ok(!JSON.stringify(value).includes("priorRouting"));
  }
  await rejectsCode(f.setup.inspect({ ...CREDENTIALS, apiKeySid: "client-must-not-supply-internal-key" }), "invalid-body");
  await rejectsCode(f.setup.plan({ connectionId: inspection.connectionId, numberId: "unowned-number" }), "number-not-eligible");
  await rejectsCode(f.setup.status("__proto__"), "invalid-argument");
});

test("carrier labels cannot echo submitted credentials, control characters or empty public text", async (t) => {
  const f = await fixture(t, { operations: {
    inspect: async () => ({ accountLabel: "\n" + CREDENTIALS.accountSid + " " + CREDENTIALS.authToken,
      numbers: [{ ...NUMBER, label: CREDENTIALS.authToken + "\u0000" }] }),
    plan: async () => ({ number: { ...NUMBER, label: "\u0000" }, routingFingerprint: "fixture", priorRouting: {},
      willReplaceRouting: false, steps: [{ id: "configure", label: CREDENTIALS.authToken + "\n", kind: "update" }] }),
  } });
  const inspection = await f.setup.inspect(CREDENTIALS);
  const plan = await f.setup.plan({ connectionId: inspection.connectionId, numberId: NUMBER.id });
  for (const value of [inspection, plan]) {
    const publicJson = JSON.stringify(value);
    assert.ok(!publicJson.includes(CREDENTIALS.accountSid));
    assert.ok(!publicJson.includes(CREDENTIALS.authToken));
    assert.ok(!publicJson.includes("\\u0000"));
    assert.ok(!publicJson.includes("\\n"));
  }
  assert.equal(plan.number.label, NUMBER.phoneNumber);
  assert.equal(plan.steps[0].label, "[redacted]");
  assert.deepEqual(f.effects, []);
});

test("plan rejects number drift, missing steps and duplicate step identifiers before any mutation", async (t) => {
  for (const change of [
    { number: { ...NUMBER, phoneNumber: "+12025550199" } },
    { steps: [] },
    { steps: [{ id: "same", label: "A", kind: "verify" }, { id: "same", label: "B", kind: "verify" }] },
  ]) {
    const f = await fixture(t, { operations: { plan: async () => ({
      number: NUMBER, routingFingerprint: "fixture", priorRouting: {}, willReplaceRouting: false,
      steps: [{ id: "verify", label: "Verify", kind: "verify" }], ...change,
    }) } });
    const inspection = await f.setup.inspect(CREDENTIALS);
    await rejectsCode(f.setup.plan({ connectionId: inspection.connectionId, numberId: NUMBER.id }), "invalid-provider-response");
    assert.deepEqual(f.effects, []);
  }
});

test("reviewed apply activates generated private credentials once and keeps browser/audio checks pending", async (t) => {
  const f = await fixture(t);
  const inspection = await f.setup.inspect(CREDENTIALS);
  const plan = await f.setup.plan({ connectionId: inspection.connectionId, numberId: NUMBER.id });
  await rejectsCode(f.setup.apply({ planId: plan.planId, confirmation: { configure: false, replaceExistingRouting: false } }), "setup-confirmation-required");
  assert.deepEqual(f.effects, []);
  const request = { planId: plan.planId, confirmation: { configure: true, replaceExistingRouting: false } };
  const result = await f.setup.apply(request);
  assert.equal(result.phase, "configured");
  assert.deepEqual(result.checks, { credentials: "passed", webhooks: "passed", browser: "pending", testCall: "pending" });
  assert.ok(!JSON.stringify(result).includes("fixture-generated-private-key"));
  assert.equal(f.activated[0].apiKeySecret, "fixture-generated-private-key");
  assert.deepEqual(await f.setup.apply(request), result);
  assert.deepEqual(f.effects, ["key-create"]);
  assert.equal((await f.setup.status(inspection.connectionId)).phase, "configured");
  const raw = await readFile(f.file, "utf8");
  assert.ok(!raw.includes("fixture-generated-private-key"));
});

test("routing replacement, stale plans and a busy agent block mutations before journaling", async (t) => {
  const f = await fixture(t, { operations: { plan: async () => ({ number: { ...NUMBER, hasExistingRouting: true },
    routingFingerprint: "existing", priorRouting: {}, willReplaceRouting: true,
    steps: [{ id: "routing", label: "Review existing routing", kind: "update" }] }) } });
  const inspection = await f.setup.inspect(CREDENTIALS);
  const plan = await f.setup.plan({ connectionId: inspection.connectionId, numberId: NUMBER.id });
  await rejectsCode(f.setup.apply({ planId: plan.planId, confirmation: { configure: true, replaceExistingRouting: false } }), "routing-replacement-confirmation-required");
  f.advance(600001);
  await rejectsCode(f.setup.apply({ planId: plan.planId, confirmation: { configure: true, replaceExistingRouting: true } }), "setup-plan-expired");
  assert.deepEqual(f.effects, []);
  const busy = await fixture(t, { canConfigure: () => { const error = new Error(); error.code = "setup-busy"; throw error; } });
  const other = await busy.setup.inspect(CREDENTIALS);
  const otherPlan = await busy.setup.plan({ connectionId: other.connectionId, numberId: NUMBER.id });
  await rejectsCode(busy.setup.apply({ planId: otherPlan.planId, confirmation: { configure: true, replaceExistingRouting: false } }), "setup-busy");
  assert.deepEqual(busy.effects, []);
});

test("an ambiguous remote mutation remains uncertain after restart and cannot be blindly replayed", async (t) => {
  let creates = 0;
  const f = await fixture(t, { operations: { apply: async ({ checkpoint }) => {
    await checkpoint("create-intent", { stage: "pending" });
    creates++;
    throw new Error("untrusted raw provider failure containing a hypothetical secret");
  } } });
  const inspection = await f.setup.inspect(CREDENTIALS);
  const plan = await f.setup.plan({ connectionId: inspection.connectionId, numberId: NUMBER.id });
  const request = { planId: plan.planId, confirmation: { configure: true, replaceExistingRouting: false } };
  await assert.rejects(f.setup.apply(request));
  const result = await f.setup.status(inspection.connectionId);
  assert.equal(result.phase, "unknown");
  assert.equal(result.error.code, "setup-reconciliation-required");
  assert.ok(!JSON.stringify(result).includes("hypothetical secret"));
  await rejectsCode(f.setup.apply(request), "setup-reconciliation-required");
  const restored = new AutomaticSetup({ env: f.env, config: { origins: [ORIGIN] }, operations: f.operations,
    activate: async () => {}, store: new EncryptedSetupStore({ file: f.file, key: f.key }) });
  await restored.initialize();
  await rejectsCode(restored.apply(request), "setup-reconciliation-required");
  const reinspection = await restored.inspect(CREDENTIALS);
  assert.notEqual(reinspection.connectionId, inspection.connectionId);
  await rejectsCode(restored.plan({
    connectionId: reinspection.connectionId, numberId: NUMBER.id,
  }), "setup-reconciliation-required");
  assert.equal(creates, 1);
});

test("a persisted mid-operation crash is classified as unknown before accepting new setup work", async (t) => {
  const f = await fixture(t);
  const inspection = await f.setup.inspect(CREDENTIALS);
  const plan = await f.setup.plan({ connectionId: inspection.connectionId, numberId: NUMBER.id });
  await f.store.transaction((state) => { state.journals[plan.planId] = {
    connectionId: inspection.connectionId, phase: "configuring", startedAt: 1, checkpoints: [], number: NUMBER,
  }; });
  await f.setup.initialize();
  assert.equal((await f.setup.status(inspection.connectionId)).phase, "unknown");
  await rejectsCode(f.setup.plan({ connectionId: inspection.connectionId, numberId: NUMBER.id }), "setup-reconciliation-required");
});

test("a configured number does not authorize calls; a separate bounded test requires explicit confirmation", async (t) => {
  const approved = [];
  const f = await fixture(t, { authorizeTest: async (_profile, body) => { approved.push(body); return { phase: "test-authorized" }; } });
  const inspection = await f.setup.inspect(CREDENTIALS);
  const plan = await f.setup.plan({ connectionId: inspection.connectionId, numberId: NUMBER.id });
  await f.setup.apply({ planId: plan.planId, confirmation: { configure: true, replaceExistingRouting: false } });
  assert.deepEqual(approved, []);
  const body = { connectionId: inspection.connectionId, callerNumber: "+12025550124", seconds: 120, confirmation: false };
  await rejectsCode(f.setup.testPermission(body), "bounded-call-confirmation-required");
  await f.setup.testPermission({ ...body, confirmation: true });
  assert.equal(approved.length, 1);
  await rejectsCode(f.setup.testPermission({ ...body, seconds: 121, confirmation: true }), "bounded-call-confirmation-required");
});
