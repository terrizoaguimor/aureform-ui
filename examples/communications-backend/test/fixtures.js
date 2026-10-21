// SPDX-License-Identifier: Apache-2.0
// Synthetic inputs and injected transports. Never contact either carrier.
import { randomUUID } from "node:crypto";
import { validateConfig } from "../lib/config.js";
import { sha256 } from "../lib/security.js";
import { InboundEngine } from "../lib/engine.js";

export const NOW = Date.parse("2026-10-21T15:00:00Z");
export const ORIGIN = "https://softphone.example.invalid";
export const BOOTSTRAP = "fixture_bootstrap_" + "a".repeat(40);
export const ACCOUNT = "AC" + "a".repeat(32);
export const NUMBER = { twilio: "+12025550101", telnyx: "+12025550102" };
export const FROM = "+12025550103";
export const sid = (n) => "CA" + n.toString(16).padStart(32, "0");
export const incomingId = (provider, n) => provider === "twilio" ? sid(n) : "fixture-pstn-" + n;
export function fixtureConfig({ enabled = true, count = 4, schedule, twoAgents = false } = {}) {
  const rules = ["twilio", "telnyx"].flatMap((provider) => Array.from({ length: count }, (_, i) => ({
    id: provider + "-approval-" + i, provider, to: NUMBER[provider], from: FROM,
    pstnCallId: incomingId(provider, i + 1),
    expiresAt: new Date(NOW + 600000).toISOString(), maxCalls: 1, maxSeconds: 120,
    maxBrowserLegs: 1, maxActions: 8, consentScope: "inbound-lab-single-call",
  })));
  const agent = (n) => ({
    id: "agent-" + n, bootstrapHashEnv: "FIXTURE_AUTH_" + n,
    providers: ["twilio", "telnyx"], twilioIdentity: "fixture_" + n,
    telnyxCredentialId: "fixture-credential-" + n, telnyxSipUsername: "gencred_fixture_" + n,
    operator: true,
  });
  const config = validateConfig({
    tenantId: "fixture-tenant", origins: [ORIGIN],
    schedule: schedule ?? { timezone: "America/New_York", weekly: [{ day: 3, start: "09:00", end: "17:00" }], holidays: [] },
    maxQueueSize: 4, maxWaitSeconds: 60, ringSeconds: 20, heartbeatSeconds: 45,
    sessionSeconds: 600, carrierTokenSeconds: 300,
    agents: twoAgents ? [agent(1), agent(2)] : [agent(1)],
    providers: {
      twilio: { inboundNumber: NUMBER.twilio },
      telnyx: { inboundNumber: NUMBER.telnyx, applicationId: "fixture-app", credentialConnectionId: "fixture-connection", browserOutboundDisabledVerified: true },
    },
    approvals: rules,
  }, { ENABLE_CARRIER_OPERATIONS: String(enabled), PUBLIC_BASE_URL: "https://backend.example.invalid",
    FIXTURE_AUTH_1: sha256(BOOTSTRAP), FIXTURE_AUTH_2: sha256("b".repeat(40)) });
  config.twilioAccountSid = ACCOUNT;
  return config;
}
export function fixtureProviders() {
  const operations = [];
  const tokens = (kind) => async () => ({ kind, token: "fixture-not-a-real-carrier-token", expiresAt: new Date(NOW + 300000).toISOString() });
  const p = (provider) => ({
    token: tokens(provider === "twilio" ? "twilio-access-token" : "telnyx-login-token"),
    async answer(call, commandId) { operations.push({ action: "answer", provider, callId: call.pstnCallId, commandId }); return {}; },
    async offer(call, agent, commandId) {
      operations.push({ action: "offer", provider, callId: call.pstnCallId, agentId: agent.id, commandId });
      return { browserCallId: "fixture-browser-" + call.pstnCallId, browserCallLegId: "fixture-leg-" + call.id, callSessionId: "fixture-browser-session-" + call.id };
    },
    async closedMessage(call, commandId) { operations.push({ action: "speak", provider, callId: call.pstnCallId, commandId }); },
    async hangup(callId, commandId) { operations.push({ action: "hangup", provider, callId, commandId }); },
    async inspect(callId) { operations.push({ action: "inspect", provider, callId }); return { ended: false, status: "alive" }; },
  });
  return { twilio: p("twilio"), telnyx: p("telnyx"), operations };
}
export function fixtureEngine(options) {
  let time = NOW;
  const config = fixtureConfig(options), providers = fixtureProviders();
  const engine = new InboundEngine(config, providers, { now: () => time });
  const session = (provider = "twilio", n = 1) => {
    const value = { id: "fixture-session-" + n, principal: config.agents[n - 1], provider };
    engine.bindSession(value);
    return value;
  };
  return { config, providers, engine, session, setTime: (value) => { time = value; } };
}
export async function command(engine, session, type, payload = {}, callId, overrides = {}) {
  return engine.command(session, {
    commandId: randomUUID(), expectedRevision: engine.envelope(session).revision,
    type, payload, ...(callId ? { callId } : {}), ...overrides,
  });
}
export async function ready(engine, session) {
  await command(engine, session, "connect");
  await command(engine, session, "presence", { presence: "available" });
}
export function twilioForm(n = 1, extra = {}) {
  return { AccountSid: ACCOUNT, CallSid: sid(n), From: FROM, To: NUMBER.twilio, Direction: "inbound", CallStatus: "ringing", ...extra };
}
export function telnyxEvent(type, n = 1, extra = {}, eventId = randomUUID()) {
  return { data: { id: eventId, record_type: "event", occurred_at: new Date(NOW).toISOString(), event_type: type,
    payload: { connection_id: "fixture-app", call_control_id: incomingId("telnyx", n), call_leg_id: "fixture-pstn-leg-" + n,
      call_session_id: "fixture-pstn-session-" + n, from: FROM, to: NUMBER.telnyx, direction: "incoming", ...extra } },
    meta: { attempt: 1 } };
}
export function reservationQuery(call) {
  return new URLSearchParams({ call: call.id, reservation: call.reservationId });
}
