// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { evaluateHours, validateSchedule, validateConfig } from "../lib/config.js";
import { fixtureEngine, fixtureConfig, command, ready, twilioForm, telnyxEvent, reservationQuery, NOW, sid } from "./fixtures.js";

test("hours use authoritative IANA local day, inclusive start and exclusive end", () => {
  const schedule = fixtureConfig().schedule;
  assert.equal(evaluateHours(schedule, Date.parse("2026-10-21T13:00:00Z")).isOpen, true);
  assert.equal(evaluateHours(schedule, Date.parse("2026-10-21T21:00:00Z")).isOpen, false);
  assert.throws(() => validateSchedule({ timezone: "invalid/timezone", weekly: [], holidays: [] }));
});
test("holiday overrides opening; an overnight tail does not reopen the holiday", () => {
  const schedule = { timezone: "UTC", weekly: [{ day: 2, start: "22:00", end: "02:00" }], holidays: [{ date: "2026-10-21" }] };
  assert.equal(evaluateHours(schedule, Date.parse("2026-10-21T01:00:00Z")).reason, "holiday");
  schedule.holidays = [];
  assert.equal(evaluateHours(schedule, Date.parse("2026-10-21T01:00:00Z")).isOpen, true);
  assert.equal(evaluateHours(schedule, Date.parse("2026-10-21T02:00:00Z")).isOpen, false);
});
test("DST hours follow local civil time instead of a fixed UTC offset", () => {
  const schedule = { timezone: "America/New_York", weekly: [{ day: 0, start: "01:00", end: "02:00" }], holidays: [] };
  assert.equal(evaluateHours(schedule, Date.parse("2026-11-01T05:30:00Z")).isOpen, true);
  assert.equal(evaluateHours(schedule, Date.parse("2026-11-01T06:30:00Z")).isOpen, true);
  assert.equal(evaluateHours(schedule, Date.parse("2026-11-01T07:00:00Z")).isOpen, false);
});
test("per-call consent/bounds and one configured number are mandatory", () => {
  const raw = { tenantId: "t", origins: [], agents: [], providers: { twilio: { inboundNumber: "+12025550101" } },
    schedule: { timezone: "UTC", weekly: [], holidays: [] },
    approvals: [{ id: "a", provider: "twilio", to: "+12025550101", from: "+12025550103", expiresAt: "2026-10-21T16:00:00Z",
      maxCalls: 10, maxBrowserLegs: 1, maxSeconds: 60, maxActions: 4, consentScope: "inbound-lab-single-call" }] };
  assert.throws(() => validateConfig(raw), /unbounded-approval/);
});
test("disabled carrier operations deny both providers before any remote command", async () => {
  const { engine, providers } = fixtureEngine({ enabled: false });
  const xml = engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  engine.telnyxEvent(telnyxEvent("call.initiated"));
  await engine.idle();
  assert.match(xml, /<Reject/);
  assert.equal(providers.operations.length, 0);
  assert.equal([...engine.calls.values()].filter((c) => c.phase === "queued").length, 0);
});
test("no approval, wrong caller and expired approval never issue call control", async () => {
  const { engine, providers, config } = fixtureEngine();
  config.approvals[0].expiresAt = "2026-10-21T14:00:00Z";
  assert.match(engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams()), /<Reject/);
  engine.telnyxEvent(telnyxEvent("call.initiated", 1, { from: "+12025550199" }));
  await engine.idle();
  assert.equal(providers.operations.length, 0);
});
test("Twilio away agent preserves FIFO without dialing; first ready offer is the oldest caller", async () => {
  const { engine, session } = fixtureEngine();
  const s = session();
  const first = engine.twilioInstruction("inbound", twilioForm(1), new URLSearchParams());
  const second = engine.twilioInstruction("inbound", twilioForm(2), new URLSearchParams());
  assert.match(first, /<Pause/); assert.doesNotMatch(second, /<Client/);
  assert.equal(engine.envelope(s).snapshot.queue.length, 2);
  await ready(engine, s);
  const active = engine.envelope(s).snapshot.activeCall;
  assert.equal(active.providerCallId, sid(1));
  const firstCall = engine.calls.get(active.id);
  const xml = engine.twilioInstruction("wait", twilioForm(1), new URLSearchParams({ call: firstCall.id }));
  assert.match(xml, /<Identity>fixture_1<\/Identity>/);
  assert.match(xml, /aureformCallId/); assert.doesNotMatch(xml, /<Number|<Conference|<Queue/);
  assert.equal(engine.envelope(s).snapshot.queue[0].providerCallId, sid(2));
});
test("wait redirects have fresh signed URL tickets so legitimate polling can advance", () => {
  const { engine } = fixtureEngine();
  const xml = engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  assert.match(xml, /\/webhooks\/twilio\/wait\?call=/);
  assert.match(xml, /tick=/);
});
test("Twilio parent/child identities and reservation are validated separately", async () => {
  const { engine, session } = fixtureEngine();
  const s = session(); await ready(engine, s);
  engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  const call = engine.calls.get(engine.envelope(s).snapshot.activeCall.id);
  assert.throws(() => engine.twilioEvent("client-status", twilioForm(10, { ParentCallSid: sid(2), CallStatus: "in-progress" }), reservationQuery(call)), /provider-parent-mismatch/);
  engine.twilioEvent("client-status", twilioForm(10, { ParentCallSid: sid(1), CallStatus: "in-progress" }), reservationQuery(call));
  assert.equal(engine.envelope(s).bindings[0].browserCallId, sid(10));
  assert.equal(engine.envelope(s).snapshot.activeCall.providerCallId, sid(1));
  assert.equal(engine.envelope(s).snapshot.activeCall.status, "active");
  // A carrier bridge does not establish availability of a browser SDK control.
  assert.deepEqual(engine.envelope(s).snapshot.caps, { hold: false, mute: false, dtmf: false });
  assert.equal(engine.envelope(s).capabilities.mute, true);
});
test("documented Twilio pre-child parent callback cannot fabricate a browser ID", async () => {
  const { engine, session } = fixtureEngine();
  const s = session(); await ready(engine, s);
  engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  const call = engine.calls.get(engine.envelope(s).snapshot.activeCall.id);
  engine.twilioEvent("client-status", twilioForm(1, { CallStatus: "initiated" }), reservationQuery(call));
  assert.equal(call.browserCallId, null);
  assert.equal(call.browserAnswered, false);
  assert.equal(call.phase, "offered");
});
test("answer intent never establishes a provider bridge or audible media", async () => {
  const { engine, session } = fixtureEngine();
  const s = session(); await ready(engine, s);
  engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  const call = engine.envelope(s).snapshot.activeCall;
  await command(engine, s, "accept", {}, call.id);
  assert.equal(engine.envelope(s).snapshot.activeCall.status, "connecting");
  assert.equal(engine.envelope(s).bindings[0].bridgeObserved, false);
});
test("terminal parent before a child callback holds the agent and approval until child proof", async () => {
  const { engine, session } = fixtureEngine();
  const s = session(); await ready(engine, s);
  engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  const call = engine.calls.get(engine.envelope(s).snapshot.activeCall.id);
  engine.twilioEvent("status", twilioForm(1, { CallStatus: "completed" }), new URLSearchParams());
  assert.equal(call.phase, "reconciliation-required");
  assert.equal(call.approval.budgetReserved, true);
  assert.equal(engine.agents.get("agent-1").reservation, call.id);
  engine.twilioEvent("client-status", twilioForm(10, { ParentCallSid: sid(1), CallStatus: "completed" }), reservationQuery(call));
  assert.equal(call.phase, "ended");
  assert.equal(call.approval.budgetReserved, false);
  assert.equal(engine.agents.get("agent-1").reservation, null);
});
test("late ringing/answer events cannot resurrect a terminated call", async () => {
  const { engine, session } = fixtureEngine();
  const s = session(); await ready(engine, s);
  engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  const call = engine.calls.get(engine.envelope(s).snapshot.activeCall.id);
  engine.twilioEvent("client-status", twilioForm(10, { ParentCallSid: sid(1), CallStatus: "completed" }), reservationQuery(call));
  engine.twilioEvent("status", twilioForm(1, { CallStatus: "completed" }), new URLSearchParams());
  engine.twilioEvent("client-status", twilioForm(10, { ParentCallSid: sid(1), CallStatus: "in-progress" }), reservationQuery(call));
  assert.equal(call.phase, "ended");
  assert.equal(engine.envelope(s).snapshot.activeCall, null);
});
test("two browser-agent reservations are atomic with one capacity per agent", async () => {
  const { engine, session } = fixtureEngine({ twoAgents: true });
  const a = session("twilio", 1), b = session("twilio", 2);
  await ready(engine, a); await ready(engine, b);
  engine.twilioInstruction("inbound", twilioForm(1), new URLSearchParams());
  engine.twilioInstruction("inbound", twilioForm(2), new URLSearchParams());
  const reservations = [...engine.agents.values()].map((x) => x.reservation);
  assert.equal(new Set(reservations).size, 2);
  assert.ok(reservations.every(Boolean));
  engine.twilioInstruction("inbound", twilioForm(3), new URLSearchParams());
  assert.equal(engine.envelope(a).snapshot.queue.length, 1);
});
test("a single agent cannot be reassigned across providers while a reservation exists", async () => {
  const { engine, session } = fixtureEngine();
  const a = session("twilio"); await ready(engine, a);
  engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  assert.throws(() => session("telnyx"), /agent-reservation-held/);
});
test("closed/holiday Twilio plays the configured message then hangs up without callback/voicemail", () => {
  const { engine } = fixtureEngine({ schedule: { timezone: "UTC", weekly: [], holidays: [{ date: "2026-10-21" }] } });
  const xml = engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  assert.match(xml, /<Say/); assert.match(xml, /<Hangup/);
  assert.doesNotMatch(xml, /<Dial|<Record|<Redirect/);
  assert.equal([...engine.calls.values()][0].endReason, "holiday");
});
test("Telnyx answers PSTN first, queues, then offers exactly one SIP leg only after answered webhook", async () => {
  const { engine, session, providers } = fixtureEngine();
  const s = session("telnyx"); await ready(engine, s);
  const e = telnyxEvent("call.initiated");
  engine.telnyxEvent(e);
  await engine.idle();
  assert.deepEqual(providers.operations.map((o) => o.action), ["answer"]);
  assert.equal(engine.envelope(s).snapshot.activeCall, null);
  engine.telnyxEvent(telnyxEvent("call.answered"));
  await engine.idle();
  assert.deepEqual(providers.operations.map((o) => o.action), ["answer", "offer"]);
  const call = engine.calls.get(engine.envelope(s).snapshot.activeCall.id);
  assert.notEqual(call.browserCallId, call.pstnCallId);
  assert.equal(call.bridgeObserved, false);
});
test("Telnyx retries with changed delivery metadata are deduplicated without duplicate cost", async () => {
  const { engine, providers } = fixtureEngine();
  const e = telnyxEvent("call.initiated");
  engine.telnyxEvent(e);
  engine.telnyxEvent({ ...e, meta: { attempt: 2 } });
  await engine.idle();
  assert.equal(providers.operations.length, 1);
  assert.throws(() => engine.telnyxEvent({ ...e, data: { ...e.data, payload: { ...e.data.payload, from: "+12025550199" } } }), /event-id-conflict/);
});
test("Telnyx answered-before-initiated is buffered and does not send a second answer", async () => {
  const { engine, providers } = fixtureEngine();
  engine.telnyxEvent(telnyxEvent("call.answered"));
  engine.telnyxEvent(telnyxEvent("call.initiated"));
  await engine.idle();
  assert.equal(providers.operations.length, 0);
  assert.equal([...engine.calls.values()][0].pstnAnswered, true);
});
test("terminal-before-initiated never starts call control after a delayed event", async () => {
  const { engine, providers } = fixtureEngine();
  engine.telnyxEvent(telnyxEvent("call.hangup"));
  engine.telnyxEvent(telnyxEvent("call.initiated"));
  await engine.idle();
  assert.equal(providers.operations.length, 0);
  assert.equal(engine.calls.size, 0);
});
test("Telnyx bridge observation is required; SDK intent and HTTP success are insufficient", async () => {
  const { engine, session } = fixtureEngine();
  const s = session("telnyx"); await ready(engine, s);
  engine.telnyxEvent(telnyxEvent("call.initiated")); await engine.idle();
  engine.telnyxEvent(telnyxEvent("call.answered")); await engine.idle();
  const call = engine.calls.get(engine.envelope(s).snapshot.activeCall.id);
  await command(engine, s, "accept", {}, call.id);
  engine.telnyxEvent(telnyxEvent("call.answered", 1, { call_control_id: call.browserCallId }));
  assert.equal(call.phase, "connecting");
  engine.telnyxEvent(telnyxEvent("call.bridged", 1, { call_control_id: call.browserCallId }));
  assert.equal(call.phase, "connected");
});
test("unknown Telnyx offer retains reservation/budget and is never retried automatically", async () => {
  const { engine, session, providers } = fixtureEngine();
  let attempts = 0;
  providers.telnyx.offer = async () => { attempts++; throw new Error("simulated timeout; never a real network request"); };
  const s = session("telnyx"); await ready(engine, s);
  engine.telnyxEvent(telnyxEvent("call.initiated")); await engine.idle();
  engine.telnyxEvent(telnyxEvent("call.answered")); await engine.idle();
  const call = engine.calls.get(engine.envelope(s).snapshot.activeCall.id);
  assert.equal(call.phase, "reconciliation-required");
  assert.equal(call.approval.budgetReserved, true);
  engine.dispatch(); engine.dispatch();
  assert.equal(attempts, 1);
  assert.equal(engine.agents.get("agent-1").reservation, call.id);
  await assert.rejects(command(engine, s, "accept", {}, call.id), /remote-outcome-unverified/);
});
test("SDK disconnect/heartbeat expiry never proves that PSTN terminated", async () => {
  const { engine, session, setTime } = fixtureEngine();
  const s = session(); await ready(engine, s);
  engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  const call = engine.calls.get(engine.envelope(s).snapshot.activeCall.id);
  setTime(NOW + 46000); engine.tick();
  assert.equal(engine.envelope(s).snapshot.presence, "offline");
  assert.equal(call.pstnEnded, false);
  assert.equal(call.phase, "reconciliation-required");
  assert.equal(engine.agents.get("agent-1").reservation, call.id);
});
test("reconciliation only releases after actual terminal proof for BOTH known legs", async () => {
  const { engine, session, providers } = fixtureEngine();
  const s = session(); await ready(engine, s);
  engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  const call = engine.calls.get(engine.envelope(s).snapshot.activeCall.id);
  engine.twilioEvent("client-status", twilioForm(10, { ParentCallSid: sid(1), CallStatus: "ringing" }), reservationQuery(call));
  await command(engine, s, "disconnect");
  let terminal = false;
  providers.twilio.inspect = async (id) => ({ ended: id === sid(1) || terminal, status: "observed" });
  let envelope = await command(engine, s, "reconcile", {}, call.id);
  assert.equal(envelope.result.outcome, "unknown");
  assert.equal(call.approval.budgetReserved, true);
  terminal = true;
  envelope = await command(engine, s, "reconcile", {}, call.id);
  assert.equal(envelope.result.outcome, "applied");
  assert.equal(call.phase, "ended");
  assert.equal(engine.agents.get("agent-1").reservation, null);
});
test("reconciliation cannot fabricate the absence of an unknown browser leg", async () => {
  const { engine, session, providers } = fixtureEngine();
  const s = session(); await ready(engine, s);
  engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  const call = engine.calls.get(engine.envelope(s).snapshot.activeCall.id);
  providers.twilio.inspect = async () => ({ ended: true });
  assert.equal(await engine.reconcile(call), "unknown");
  assert.equal(call.phase, "reconciliation-required");
  assert.equal(call.approval.budgetReserved, true);
});
test("idempotency survives stale expectedRevision but rejects reuse with different intent", async () => {
  const { engine, session } = fixtureEngine();
  const s = session();
  const id = randomUUID(), revision = engine.envelope(s).revision;
  await command(engine, s, "connect", {}, undefined, { commandId: id, expectedRevision: revision });
  const same = await command(engine, s, "connect", {}, undefined, { commandId: id, expectedRevision: revision });
  assert.equal(same.result.outcome, "duplicate");
  await assert.rejects(command(engine, s, "disconnect", {}, undefined, { commandId: id }), /command-id-conflict/);
  await assert.rejects(command(engine, s, "presence", { presence: "available" }, undefined, { expectedRevision: revision }), /stale-revision/);
});
test("hold is unsupported; caller-selected account/schedule/destinations and foreign calls are rejected", async () => {
  const { engine, session } = fixtureEngine();
  const s = session(); await ready(engine, s);
  engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  const call = engine.envelope(s).snapshot.activeCall;
  await assert.rejects(command(engine, s, "hold", { held: true }, call.id), /unsupported-hold/);
  await assert.rejects(command(engine, s, "presence", { presence: "available", timezone: "UTC" }), /invalid-body/);
  await assert.rejects(command(engine, s, "hangup", {}, "not-my-call"), /call-owner-mismatch/);
  await assert.rejects(command(engine, s, "dial", { to: "+12025550199" }), /invalid-command/);
});
test("mute/DTMF are bounded browser intent metadata, not invented server audio APIs", async () => {
  const { engine, session, providers } = fixtureEngine();
  const s = session(); await ready(engine, s);
  engine.twilioInstruction("inbound", twilioForm(), new URLSearchParams());
  const call = engine.calls.get(engine.envelope(s).snapshot.activeCall.id);
  engine.twilioEvent("client-status", twilioForm(10, { ParentCallSid: sid(1), CallStatus: "in-progress" }), reservationQuery(call));
  await command(engine, s, "mute", { muted: true }, call.id);
  await command(engine, s, "dtmf", { digit: "#" }, call.id);
  assert.equal(call.muted, true); assert.equal(call.dtmfDigits, "#");
  assert.equal(providers.operations.length, 0);
  await assert.rejects(command(engine, s, "dtmf", { digit: "12" }, call.id), /invalid-digit/);
});
test("closed Telnyx waits for answered and speak-ended, then requests hangup", async () => {
  const { engine, providers } = fixtureEngine({ schedule: { timezone: "UTC", weekly: [], holidays: [] } });
  engine.telnyxEvent(telnyxEvent("call.initiated")); await engine.idle();
  assert.deepEqual(providers.operations.map((o) => o.action), ["answer"]);
  engine.telnyxEvent(telnyxEvent("call.answered")); await engine.idle();
  assert.deepEqual(providers.operations.map((o) => o.action), ["answer", "speak"]);
  engine.telnyxEvent(telnyxEvent("call.speak.ended")); await engine.idle();
  assert.deepEqual(providers.operations.map((o) => o.action), ["answer", "speak", "hangup"]);
  assert.equal([...engine.calls.values()][0].phase, "ending");
});
