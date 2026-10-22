// SPDX-License-Identifier: Apache-2.0
import { randomUUID } from "node:crypto";
import { fail, onlyKeys, E164 } from "./config.js";
import { bearer, constantEqual, opaque, sha256 } from "./security.js";
import { EncryptedSetupStore } from "./setup-store.js";

export const SETUP_CONTRACT = "aureform.setup.v1";
const providers = ["twilio", "telnyx"];
const objectId = (value) => {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) fail("invalid-argument");
  return value;
};
const summary = (connection, journal) => ({
  contractVersion: SETUP_CONTRACT, connectionId: connection.id,
  provider: connection.provider, number: journal?.number ?? null,
  phase: journal?.phase ?? "select-number",
  checks: { credentials: "passed", webhooks: journal?.phase === "configured" ? "passed" : "pending",
    browser: "pending", testCall: "pending" },
  ...(journal?.error ? { error: { code: journal.error, message: journal.error } } : {}),
});
const credentialsFor = (input) => {
  if (input?.provider === "twilio") {
    onlyKeys(input, ["provider", "accountSid", "authToken"]);
    if (!/^AC[0-9a-f]{32}$/i.test(input.accountSid ?? "") ||
      typeof input.authToken !== "string" || !/^[A-Za-z0-9]{32,128}$/.test(input.authToken)) fail("invalid-credentials");
  } else if (input?.provider === "telnyx") {
    onlyKeys(input, ["provider", "apiKey", "publicKey"]);
    if (typeof input.apiKey !== "string" || input.apiKey.length < 20 || input.apiKey.length > 1024 ||
      /\s/.test(input.apiKey) || typeof input.publicKey !== "string") fail("invalid-credentials");
    const key = Buffer.from(input.publicKey, "base64");
    if (key.length !== 32 || key.toString("base64") !== input.publicKey) fail("invalid-credentials");
  } else fail("invalid-provider");
  return structuredClone(input);
};
const privateValues = (value) => ["accountSid", "authToken", "apiKey", "publicKey", "apiKeySid", "apiKeySecret"]
  .map((key) => value?.[key]).filter((entry) => typeof entry === "string" && entry.length);
const publicText = (value, fallback, limit, secrets = []) => {
  let text = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim() : "";
  for (const secret of secrets) text = text.split(secret).join("[redacted]");
  return (text || fallback).slice(0, limit);
};
const publicNumber = (number, secrets = []) => {
  if (!number || typeof number.id !== "string" || !/^[\w.:@+-]{1,256}$/.test(number.id) ||
    secrets.some((secret) => number.id.includes(secret)) || !E164.test(number.phoneNumber) ||
    typeof number.voiceEnabled !== "boolean" || typeof number.hasExistingRouting !== "boolean") fail("invalid-provider-response", 502);
  return { id: number.id, phoneNumber: number.phoneNumber,
    label: publicText(number.label, number.phoneNumber, 160, secrets),
    voiceEnabled: number.voiceEnabled, hasExistingRouting: number.hasExistingRouting };
};

/** Authenticated, single-owner reference. Does not buy numbers or make calls. */
export class AutomaticSetup {
  constructor({ env, config, operations, activate, authorizeTest, canConfigure = () => {}, now = Date.now, store }) {
    this.env = env;
    this.config = config;
    this.operations = operations;
    this.activate = activate;
    this.authorizeTest = authorizeTest;
    this.canConfigure = canConfigure;
    this.now = now;
    this.sessions = new Map();
    this.attempts = new Map();
    this.working = new Set();
    this.credentialWorking = new Set();
    this.store = store ?? new EncryptedSetupStore({ file: env.SETUP_STATE_FILE, key: env.SETUP_MASTER_KEY });
  }

  origin(value) {
    if (typeof value !== "string" || !this.config.origins.includes(value)) fail("origin-denied", 403);
    return value;
  }

  async initialize() {
    await this.store.initialize();
    const state = await this.store.read();
    for (const provider of providers) {
      const result = state.active[provider];
      if (result) await this.activate(structuredClone(result));
    }
    // A crash during a mutation leaves an explicitly uncertain journal.
    await this.store.transaction((next) => {
      for (const journal of Object.values(next.journals)) {
        if (journal.phase === "configuring") {
          journal.phase = "unknown";
          journal.error = "setup-reconciliation-required";
        }
      }
    });
  }

  login(body, origin) {
    this.origin(origin);
    onlyKeys(body, ["accessCode"]);
    if (!/^[0-9a-f]{64}$/i.test(this.env.SETUP_ADMIN_AUTH_SHA256 ?? "")) fail("setup-not-configured", 503);
    const key = origin;
    const recent = this.attempts.get(key);
    const bucket = !recent || recent.until <= this.now() ? { count: 0, until: this.now() + 60000 } : recent;
    bucket.count++;
    this.attempts.set(key, bucket);
    if (bucket.count > 8) fail("too-many-login-attempts", 429);
    if (typeof body.accessCode !== "string" || !/^[A-Za-z0-9_-]{32,256}$/.test(body.accessCode) ||
      !constantEqual(sha256(body.accessCode), this.env.SETUP_ADMIN_AUTH_SHA256)) fail("unauthorized", 401);
    for (const [hash, session] of this.sessions) if (session.expiresAt <= this.now()) this.sessions.delete(hash);
    if (this.sessions.size >= 8) fail("too-many-sessions", 429);
    const sessionToken = opaque();
    const expiresAt = this.now() + 600000;
    this.sessions.set(sha256(sessionToken), { origin, expiresAt });
    return { contractVersion: SETUP_CONTRACT, sessionToken, expiresAt: new Date(expiresAt).toISOString() };
  }

  authenticate(header, origin) {
    this.origin(origin);
    const session = this.sessions.get(sha256(bearer(header)));
    if (!session || session.origin !== origin || session.expiresAt <= this.now()) fail("session-expired", 401);
    return session;
  }

  async inspect(body) {
    const credentials = credentialsFor(body);
    const value = await this.operations[credentials.provider].inspect(credentials);
    if (!value || typeof value.accountLabel !== "string" || !Array.isArray(value.numbers) || value.numbers.length > 1000) fail("invalid-provider-response", 502);
    const secrets = privateValues(credentials);
    const numbers = value.numbers.map((number) => publicNumber(number, secrets));
    if (new Set(numbers.map((number) => number.id)).size !== numbers.length) fail("invalid-provider-response", 502);
    const accountLabel = publicText(value.accountLabel, credentials.provider, 160, secrets);
    const id = randomUUID();
    await this.store.transaction((state) => {
      for (const [key, connection] of Object.entries(state.connections)) {
        if (connection.expiresAt < this.now() && !Object.values(state.journals).some((j) => j.connectionId === key) &&
          !Object.values(state.active).some((active) => active.connectionId === key)) delete state.connections[key];
      }
      if (Object.keys(state.connections).length >= 16) fail("too-many-setup-connections", 429);
      state.connections[id] = { id, provider: credentials.provider, credentials,
        accountLabel, numbers, expiresAt: this.now() + 3600000 };
    });
    return { contractVersion: SETUP_CONTRACT, connectionId: id, provider: credentials.provider,
      accountLabel, numbers, phase: "select-number" };
  }

  async plan(body) {
    onlyKeys(body, ["connectionId", "numberId"]);
    const id = objectId(body.connectionId);
    const state = await this.store.read();
    const connection = state.connections[id];
    if (!connection || connection.expiresAt <= this.now()) fail("setup-connection-expired", 404);
    const selected = connection.numbers.find((n) => n.id === body.numberId && n.voiceEnabled);
    if (!selected) fail("number-not-eligible", 422);
    if (Object.values(state.journals).some((j) => j.connectionId === id && ["configuring", "unknown", "failed"].includes(j.phase))) fail("setup-reconciliation-required", 409);
    if (Object.values(state.journals).some((j) =>
      j.provider === connection.provider && j.number?.id === selected.id &&
      ["configuring", "unknown", "failed"].includes(j.phase))) fail("setup-reconciliation-required", 409);
    const result = await this.operations[connection.provider].plan(connection.credentials, body.numberId);
    const secrets = privateValues(connection.credentials);
    const number = publicNumber(result.number, secrets);
    if (number.id !== selected.id || number.phoneNumber !== selected.phoneNumber || !number.voiceEnabled ||
      typeof result.routingFingerprint !== "string" || !Array.isArray(result.steps) ||
      !result.steps.length || result.steps.length > 64 ||
      typeof result.willReplaceRouting !== "boolean") fail("invalid-provider-response", 502);
    const planId = randomUUID();
    const expiresAt = this.now() + 600000;
    const steps = result.steps.map((step) => {
      if (!step || typeof step.id !== "string" || step.id.length > 100 || typeof step.label !== "string" ||
        step.label.length > 240 || !["create", "reuse", "update", "verify"].includes(step.kind)) fail("invalid-provider-response", 502);
      if (!/^[\w.:@+-]{1,100}$/.test(step.id) || secrets.some((secret) => step.id.includes(secret))) fail("invalid-provider-response", 502);
      return { id: step.id, label: publicText(step.label, step.id, 240, secrets), kind: step.kind };
    });
    if (new Set(steps.map((step) => step.id)).size !== steps.length) fail("invalid-provider-response", 502);
    const plan = { ...result, number, steps, planId, connectionId: id, expiresAt };
    await this.store.transaction((next) => {
      for (const [key, prior] of Object.entries(next.plans)) if (prior.expiresAt <= this.now() && !next.journals[key]) delete next.plans[key];
      if (Object.keys(next.plans).length >= 32) fail("too-many-setup-plans", 429);
      next.plans[planId] = plan;
    });
    return { contractVersion: SETUP_CONTRACT, connectionId: id, planId, provider: connection.provider,
      number, expiresAt: new Date(expiresAt).toISOString(), steps,
      willReplaceRouting: result.willReplaceRouting, phase: "review" };
  }

  async apply(body) {
    onlyKeys(body, ["planId", "confirmation"]);
    const id = objectId(body.planId);
    onlyKeys(body.confirmation, ["configure", "replaceExistingRouting"]);
    if (body.confirmation.configure !== true || typeof body.confirmation.replaceExistingRouting !== "boolean") fail("setup-confirmation-required", 422);
    if (this.working.size) fail("setup-busy", 409);
    this.working.add(id);
    let connection, plan;
    try {
      const initial = await this.store.read();
      plan = initial.plans[id];
      if (!plan) fail("setup-plan-expired", 404);
      connection = initial.connections[plan.connectionId];
      if (!connection) fail("setup-connection-expired", 404);
      const previous = initial.journals[id];
      if (previous?.phase === "configured") return summary(connection, previous);
      if (previous) fail("setup-reconciliation-required", 409);
      if (Object.values(initial.journals).some((journal) =>
        journal.provider === connection.provider && journal.number?.id === plan.number.id &&
        ["configuring", "unknown", "failed"].includes(journal.phase))) fail("setup-reconciliation-required", 409);
      if (plan.expiresAt <= this.now() || connection.expiresAt <= this.now()) fail("setup-plan-expired", 409);
      if (plan.willReplaceRouting && body.confirmation.replaceExistingRouting !== true) fail("routing-replacement-confirmation-required", 422);
      await this.canConfigure();
      // Persist the intent before any external mutation; never blindly replay it.
      await this.store.transaction((state) => {
        if (Object.values(state.journals).some((j) => j.connectionId === connection.id &&
          ["configuring", "unknown", "failed"].includes(j.phase))) fail("setup-reconciliation-required", 409);
        state.journals[id] = { planId: id, connectionId: connection.id, phase: "configuring",
          provider: connection.provider, number: plan.number, startedAt: this.now(), checkpoints: [] };
      });
      const result = await this.operations[connection.provider].apply({
        connectionId: connection.id, credentials: structuredClone(connection.credentials), plan: structuredClone(plan),
        checkpoint: (stage, data) => this.store.transaction((state) => {
          const journal = state.journals[id];
          if (typeof stage !== "string" || stage.length > 160 || journal.checkpoints.length >= 64) fail("invalid-setup-checkpoint", 500);
          journal.checkpoints.push({ stage, at: this.now(), data: structuredClone(data ?? null) });
        }),
      });
      if (result?.provider !== connection.provider ||
        result.number?.id !== plan.number.id ||
        result.number?.phoneNumber !== plan.number.phoneNumber ||
        result.number?.voiceEnabled !== true ||
        (connection.provider === "twilio" &&
          (result.accountSid !== connection.credentials.accountSid ||
            typeof result.authToken !== "string" ||
            !constantEqual(result.authToken, connection.credentials.authToken))) ||
        (connection.provider === "telnyx" &&
          (typeof result.apiKey !== "string" ||
            !constantEqual(result.apiKey, connection.credentials.apiKey) ||
            result.publicKey !== connection.credentials.publicKey))) fail("invalid-provider-response", 502);
      const active = { ...result, connectionId: connection.id };
      // A configured carrier is not evidence of browser registration or audio.
      await this.activate(structuredClone(active));
      await this.store.transaction((state) => {
        state.active[connection.provider] = active;
        state.journals[id].phase = "configured";
        state.journals[id].finishedAt = this.now();
      });
      return summary(connection, { number: plan.number, phase: "configured" });
    } catch (error) {
      if (connection) {
        await this.store.transaction((state) => {
          const journal = state.journals[id];
          if (journal?.phase === "configuring") {
            journal.phase = "unknown";
            journal.error = "setup-reconciliation-required";
          }
        });
      }
      throw error;
    } finally { this.working.delete(id); }
  }

  async status(connectionId) {
    const id = objectId(connectionId);
    const state = await this.store.read();
    const connection = state.connections[id];
    if (!connection) fail("setup-connection-expired", 404);
    const journal = Object.values(state.journals).filter((j) => j.connectionId === id).sort((a, b) => b.startedAt - a.startedAt)[0];
    return summary(connection, journal);
  }

  async connections() {
    const state = await this.store.read();
    return providers.flatMap((provider) => {
      const active = state.active[provider];
      if (!active) return [];
      const connection = state.connections[active.connectionId];
      if (!connection || connection.provider !== provider) fail("invalid-setup-state", 500);
      return [summary(connection, { number: publicNumber(active.number, privateValues(active)), phase: "configured" })];
    });
  }

  async issueBrowserCredential(profile, agentId, issue, seconds) {
    const connectionId = objectId(profile.connectionId);
    if (profile.provider !== "telnyx" || typeof agentId !== "string" ||
      !/^[A-Za-z0-9_-]{1,80}$/.test(agentId) || typeof issue !== "function" ||
      !Number.isInteger(seconds) || seconds < 60 || seconds > 300) fail("invalid-browser-credential-request", 400);
    const key = connectionId + ":" + agentId;
    if (this.credentialWorking.has(key) || this.working.size) fail("setup-busy", 409);
    this.credentialWorking.add(key);
    try {
      let device;
      await this.store.transaction((state) => {
        const active = state.active.telnyx;
        if (!active || active.connectionId !== connectionId ||
          active.credentialConnectionId !== profile.credentialConnectionId) fail("provider-not-configured", 409);
        state.devices ??= {};
        device = state.devices[key];
        const prior = device?.checkpoint?.privateState;
        if (prior?.pending || prior?.unknown || device?.phase === "unknown") fail("setup-reconciliation-required", 409);
        const expires = Date.parse(device?.expiresAt ?? prior?.requestedExpiresAt);
        if (!device || (device.phase === "verified" && expires <= this.now() + 90000)) {
          // One reference browser per agent. A known idle, expiring parent may
          // rotate to a new server-owned identity; an uncertain create may not.
          device = { connectionId, agentId, deviceId: "owner-" + randomUUID().replaceAll("-", ""),
            phase: "issuing", startedAt: this.now(), checkpoint: null, checkpointCount: 0 };
          state.devices[key] = device;
        }
        device = structuredClone(device);
      });
      const value = await issue({
        connectionId, credentials: { provider: "telnyx", apiKey: profile.apiKey, publicKey: profile.publicKey },
        credentialConnectionId: profile.credentialConnectionId, agentId, deviceId: device.deviceId, seconds,
        ...(device.checkpoint ? { existing: structuredClone(device.checkpoint) } : {}),
        checkpoint: (stage, data) => this.store.transaction((state) => {
          const current = state.devices[key];
          if (current.deviceId !== device.deviceId || typeof stage !== "string" || stage.length > 160 ||
            current.checkpointCount >= 128 || !data?.privateState) fail("invalid-setup-checkpoint", 500);
          current.checkpoint = structuredClone(data);
          current.checkpointCount++;
          current.stage = stage;
          current.updatedAt = this.now();
          current.phase = stage === "unknown" || data.privateState.unknown ? "unknown" : "issuing";
        }),
      });
      const expiresAt = Date.parse(value?.expiresAt);
      if (!value || typeof value.credentialId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(value.credentialId) ||
        typeof value.sipUsername !== "string" || !/^gencred[A-Za-z0-9_-]{1,120}$/.test(value.sipUsername) ||
        typeof value.token !== "string" || value.token.length > 16384 ||
        !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value.token) ||
        !Number.isFinite(expiresAt) || expiresAt <= this.now() + 30000 || expiresAt > this.now() + seconds * 1000) {
        fail("invalid-provider-response", 502);
      }
      await this.store.transaction((state) => {
        const current = state.devices[key];
        if (current.deviceId !== device.deviceId || current.checkpoint?.privateState?.pending ||
          current.checkpoint?.privateState?.unknown) fail("setup-reconciliation-required", 409);
        current.phase = "verified";
        current.credentialId = value.credentialId;
        current.sipUsername = value.sipUsername;
        current.expiresAt = value.expiresAt;
      });
      return value;
    } finally {
      this.credentialWorking.delete(key);
    }
  }

  async testPermission(body) {
    onlyKeys(body, ["connectionId", "callerNumber", "seconds", "confirmation"]);
    const id = objectId(body.connectionId);
    if (!E164.test(body.callerNumber) || !Number.isInteger(body.seconds) || body.seconds < 30 || body.seconds > 120 ||
      body.confirmation !== true) fail("bounded-call-confirmation-required", 422);
    const state = await this.store.read();
    const active = Object.values(state.active).find((entry) => entry.connectionId === id);
    if (!active) fail("provider-not-configured", 409);
    if (!this.authorizeTest) fail("test-authorization-not-configured", 503);
    return this.authorizeTest(active, body);
  }
}
