// SPDX-License-Identifier: Apache-2.0
import { randomUUID } from "node:crypto";
import { evaluateHours, fail, onlyKeys, boundedString, isRecord } from "./config.js";
import { sha256, canonicalJson } from "./security.js";
import { twilioXml } from "./providers.js";

export const CONTRACT = "aureform.inbound-voice.v1";
export const CAPS = Object.freeze({
  inbound: true, outboundPstn: false, hold: false, transfer: false,
  recording: false, dtmf: true, mute: true, notes: true,
});
const TERMINAL_TWILIO = new Set(["completed", "busy", "failed", "no-answer", "canceled"]);
const COMMANDS = ["connect", "disconnect", "presence", "accept", "decline", "hangup", "mute", "hold", "dtmf", "notes", "heartbeat", "reconcile"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const rawId = /^[A-Za-z0-9_+=:/.-]{1,512}$/;
const callKey = (provider, id) => provider + ":" + id;

export class InboundEngine {
  constructor(config, providers, { now = Date.now, id = randomUUID } = {}) {
    this.config = config;
    this.providers = providers;
    this.now = now;
    this.id = id;
    this.calls = new Map();
    this.pstnIndex = new Map();
    this.browserIndex = new Map();
    this.tombstones = new Map();
    this.orphans = new Map();
    this.webhookCache = new Map();
    this.eventLedger = new Map();
    this.commandLedger = new Map();
    this.usedApprovals = new Set();
    this.agents = new Map(config.agents.map((principal) => [principal.id, {
      principal, sessionId: null, provider: null, connected: false, presence: "away",
      heartbeat: 0, reservation: null, revisions: { twilio: 0, telnyx: 0 }, error: null,
    }]));
    this.cursor = 0;
    this.sequence = 0;
    this.listeners = new Set();
    this.pending = new Set();
    this.events = [];
  }
  remember(map, key, value, max = 2048) {
    if (!map.has(key) && map.size >= max) map.delete(map.keys().next().value);
    map.set(key, value);
  }
  touch(type, call, detail) {
    this.cursor++;
    this.events.push({ id: "event-" + this.cursor, ...(call ? { callId: call.id } : {}),
      type, at: this.now(), source: "backend", ...(detail ? { detail } : {}) });
    if (this.events.length > 50) this.events.shift();
    for (const agent of this.agents.values()) for (const provider of agent.principal.providers) agent.revisions[provider]++;
    for (const listener of this.listeners) {
      try { listener(); } catch { this.listeners.delete(listener); }
    }
  }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  agent(session) {
    const agent = this.agents.get(session.principal.id);
    if (!agent || agent.sessionId !== session.id || agent.provider !== session.provider) fail("stale-session", 403);
    return agent;
  }
  bindSession(session) {
    const agent = this.agents.get(session.principal.id);
    if (agent.reservation && (agent.provider !== session.provider || agent.sessionId !== session.id)) fail("agent-reservation-held", 409);
    if (agent.sessionId !== session.id) {
      agent.connected = false;
      agent.presence = "away";
    }
    agent.sessionId = session.id;
    agent.provider = session.provider;
    this.touch("session");
  }
  view(call) {
    const terminal = call.phase === "ended";
    const status = terminal ? (call.bridgeObserved ? "completed" : "missed")
      : call.phase === "queued" ? "queued"
        : call.phase === "connected" ? "active"
          : call.phase === "offered" ? "ringing" : "connecting";
    return {
      id: call.id, provider: call.provider, providerCallId: call.pstnCallId,
      direction: "inbound", from: call.from, to: call.to, callerName: "Inbound laboratory",
      status, queuedAt: call.createdAt, ...(call.offeredAt ? { startedAt: call.offeredAt } : {}),
      ...(call.connectedAt ? { answeredAt: call.connectedAt } : {}),
      ...(terminal ? { endedAt: call.endedAt, ...(call.endReason ? { endReason: call.endReason } : {}) } : {}),
      muted: call.muted, notes: call.notes, ...(call.disposition ? { disposition: call.disposition } : {}),
      ...(call.dtmfDigits ? { dtmfDigits: call.dtmfDigits } : {}),
    };
  }
  envelope(session, result, error = null) {
    const agent = this.agent(session);
    const relevant = [...this.calls.values()].filter((c) => c.provider === session.provider);
    const active = agent.reservation ? this.calls.get(agent.reservation) : null;
    const visible = relevant.filter((c) => c.phase === "queued" || c.owner === agent.principal.id);
    return {
      type: "snapshot", contractVersion: CONTRACT,
      scope: { sessionId: session.id, tenantId: this.config.tenantId, agentId: agent.principal.id, provider: session.provider },
      revision: agent.revisions[session.provider], cursor: this.cursor,
      snapshot: {
        mode: "live", provider: session.provider,
        connection: agent.error ? "error" : agent.connected ? "ready" : "disconnected",
        presence: agent.presence, activeCall: active && active.phase !== "ended" ? this.view(active) : null,
        queue: relevant.filter((c) => c.phase === "queued").sort((a, b) => a.sequence - b.sequence).map((c) => this.view(c)),
        history: relevant.filter((c) => c.phase === "ended" && (!c.owner || c.owner === agent.principal.id)).sort((a, b) => b.endedAt - a.endedAt).slice(0, 50).map((c) => this.view(c)),
        error: active?.uncertain ? "Remote call outcome requires reconciliation." : agent.error,
        businessHours: structuredClone(this.config.schedule),
        businessHoursOpen: evaluateHours(this.config.schedule, this.now()).isOpen,
        audio: { microphonePermission: "unknown" },
        // Only the browser can project usable SDK controls for an exact leg.
        caps: { hold: false, mute: false, dtmf: false },
        events: this.events.filter((e) => !e.callId || visible.some((c) => c.id === e.callId)).slice(-20),
      },
      capabilities: CAPS,
      bindings: visible.filter((c) => c.phase !== "ended").map((c) => ({
        callId: c.id, provider: c.provider, pstnCallId: c.pstnCallId,
        browserCallId: c.browserCallId ?? null, browserCallLegId: c.browserCallLegId ?? null,
        callSessionId: c.callSessionId ?? null, reservationId: c.reservationId ?? null,
        phase: c.phase, topology: c.provider === "twilio" ? "twilio-dial-client" : "telnyx-sip-bridge",
        browserAnswered: c.browserAnswered, bridgeObserved: c.bridgeObserved,
      })),
      ...(result ? { result } : {}), error,
    };
  }
  approval(provider, pstnCallId, from, to) {
    if (!this.config.operationsEnabled) return null;
    const rule = this.config.approvals.find((a) => !this.usedApprovals.has(a.id) &&
      a.provider === provider && a.to === to && a.from === from && Date.parse(a.expiresAt) > this.now() &&
      (!a.pstnCallId || a.pstnCallId === pstnCallId));
    if (!rule) return null;
    this.usedApprovals.add(rule.id);
    return { ...rule, boundPstnCallId: pstnCallId, browserLegsUsed: 0, actionsUsed: 0, budgetReserved: true };
  }
  charge(call, browser = false) {
    if (!this.config.operationsEnabled || !call.approval ||
      call.approval.boundPstnCallId !== call.pstnCallId || Date.parse(call.approval.expiresAt) <= this.now() ||
      this.now() - call.createdAt >= call.approval.maxSeconds * 1000 ||
      call.approval.actionsUsed >= call.approval.maxActions ||
      (browser && call.approval.browserLegsUsed >= call.approval.maxBrowserLegs)) fail("lab-call-budget-denied", 403);
    call.approval.actionsUsed++;
    if (browser) call.approval.browserLegsUsed++;
  }
  admit(provider, pstnCallId, from, to) {
    boundedString(pstnCallId, 512, rawId);
    boundedString(from, 128);
    boundedString(to, 128);
    const pc = this.config.providers[provider];
    if (!pc || to !== pc.inboundNumber) fail("unconfigured-number", 403);
    const key = callKey(provider, pstnCallId);
    const prior = this.pstnIndex.get(key);
    if (prior) return this.calls.get(prior);
    if (this.tombstones.has(key)) return null;
    if (this.calls.size >= 256) fail("lab-ledger-full", 503);
    const hours = evaluateHours(this.config.schedule, this.now());
    const approval = this.approval(provider, pstnCallId, from, to);
    const unanswered = [...this.calls.values()].filter((c) => ["queued", "offered", "connecting"].includes(c.phase)).length;
    const closed = !hours.isOpen;
    const overflow = unanswered >= this.config.maxQueueSize;
    const call = {
      id: this.id(), provider, pstnCallId, from, to, sequence: ++this.sequence,
      createdAt: this.now(), approval, hours, closed,
      phase: approval && !closed && !overflow ? "queued" : "ending",
      endReason: closed ? (hours.reason === "holiday" ? "holiday" : "after-hours") : overflow ? "queue-overflow" : !approval ? "cancelled-before-answer" : null,
      disposition: !approval ? "lab-operation-denied" : closed ? hours.reason : overflow ? "queue-overflow" : null,
      owner: null, reservationId: null, browserCallId: null, browserCallLegId: null,
      pstnAnswered: false, browserAnswered: false, browserEnded: false, pstnEnded: false,
      browserSetupStarted: false, browserSetupUnknown: false, dialActionObserved: false,
      bridgeObserved: false, uncertain: false, muted: false, notes: "", dtmfDigits: "",
    };
    this.calls.set(call.id, call);
    this.pstnIndex.set(key, call.id);
    this.touch("inbound", call);
    return call;
  }
  eligible(agent, provider) {
    return agent.provider === provider && agent.connected && agent.presence === "available" &&
      !agent.reservation && this.now() - agent.heartbeat < this.config.heartbeatSeconds * 1000;
  }
  dispatch() {
    const waiting = [...this.calls.values()].filter((c) => c.phase === "queued").sort((a, b) => a.sequence - b.sequence);
    for (const call of waiting) {
      if (call.uncertain || !evaluateHours(this.config.schedule, this.now()).isOpen) continue;
      if (call.provider === "telnyx" && !call.pstnAnswered) continue;
      const agent = [...this.agents.values()].find((a) => this.eligible(a, call.provider));
      if (!agent) continue;
      call.owner = agent.principal.id;
      call.reservationId = this.id();
      call.offeredAt = this.now();
      call.phase = "offered";
      agent.reservation = call.id;
      this.touch("offered", call);
      if (call.provider === "telnyx") {
        this.effect(call, "browser-sip-leg", () => {
          this.charge(call, true);
          call.browserSetupStarted = true;
          call.browserSetupUnknown = true;
          return this.providers.telnyx.offer(call, agent.principal, this.id());
        }, (ids) => this.bindBrowser(call, ids));
      }
    }
  }
  effect(call, action, run, success = () => {}) {
    const promise = (async () => {
      try {
        const value = await run();
        success(value);
        this.touch(action + "-requested", call);
        return value === "unknown" ? "unknown" : "applied";
      } catch {
        // Do not retry a possible billable operation, free the reservation,
        // release its approval, or turn missing callbacks into terminal facts.
        call.uncertain = true;
        call.phase = "reconciliation-required";
        this.touch("reconciliation-required", call, action);
        return "unknown";
      }
    })();
    this.pending.add(promise);
    void promise.finally(() => this.pending.delete(promise));
    return promise;
  }
  async idle() { while (this.pending.size) await Promise.all([...this.pending]); }
  bindBrowser(call, ids) {
    for (const field of ["browserCallId", "browserCallLegId", "callSessionId"]) {
      if (!ids[field]) continue;
      boundedString(ids[field], 512, rawId);
      if (call[field] && call[field] !== ids[field]) fail("provider-binding-conflict", 409);
      call[field] = ids[field];
    }
    if (call.browserCallId) this.browserIndex.set(callKey(call.provider, call.browserCallId), call.id);
    call.browserSetupUnknown = !call.browserCallId;
  }
  maybeConnected(call) {
    if (call.phase === "ended" || call.pstnEnded || call.browserEnded || call.uncertain) return;
    if (call.browserAnswered && call.bridgeObserved) {
      call.phase = "connected";
      call.connectedAt ??= this.now();
      this.touch("connected-observed", call);
    }
  }
  maybeEnded(call) {
    if (!call.pstnEnded) return;
    if (call.browserSetupUnknown || (call.browserCallId && !call.browserEnded && !call.dialActionObserved)) {
      call.phase = "reconciliation-required";
      call.uncertain = true;
      this.touch("remaining-leg-unverified", call);
      return;
    }
    call.phase = "ended";
    call.uncertain = false;
    call.endedAt ??= this.now();
    if (call.approval) call.approval.budgetReserved = false;
    const agent = this.agents.get(call.owner);
    if (agent?.reservation === call.id) agent.reservation = null;
    this.touch("ended-observed", call);
    this.dispatch();
  }
  finish(call, reason = "agent-hangup") {
    if (call.phase === "ended" || call.cleanupStarted) return Promise.resolve("applied");
    call.cleanupStarted = true;
    call.endReason ??= reason;
    call.phase = "ending";
    this.touch("hangup-requested", call);
    if (!this.config.operationsEnabled || !call.approval) return Promise.resolve("unknown");
    return this.effect(call, "hangup", async () => {
      // Cleanup may follow approval expiry; it cannot originate another leg.
      // Termination HTTP success remains a request, not terminal evidence.
      const ids = [...new Set([call.pstnCallId, call.browserCallId].filter(Boolean))];
      await Promise.all(ids.map((id) => this.providers[call.provider].hangup(id, this.id())));
    });
  }
  twilioInstruction(kind, form, query) {
    if (form.AccountSid !== this.config.twilioAccountSid) fail("provider-account-mismatch", 403);
    const sid = boundedString(form.CallSid, 40, /^CA[0-9a-f]{32}$/i);
    let call = this.calls.get(this.pstnIndex.get(callKey("twilio", sid)));
    if (kind === "inbound") {
      if (form.Direction !== "inbound" || form.To !== this.config.providers.twilio?.inboundNumber) fail("invalid-inbound-scope", 403);
      call = this.admit("twilio", sid, form.From, form.To);
    }
    if (!call) return twilioXml("hangup", this.config);
    if (query.get("call") && query.get("call") !== call.id) fail("callback-call-mismatch", 403);
    if (kind === "dial-action") {
      this.checkReservation(call, query);
      if (form.DialCallSid) this.bindBrowser(call, { browserCallId: form.DialCallSid });
      if (!TERMINAL_TWILIO.has(form.DialCallStatus)) fail("unverified-dial-outcome", 409);
      call.dialActionObserved = true;
      call.browserSetupUnknown = false;
      call.browserEnded = true;
      if (form.DialCallStatus === "completed" && form.DialBridged === "true") {
        call.bridgeObserved = true;
        call.browserAnswered = true;
      }
      call.endReason ??= call.bridgeObserved ? "agent-hangup" : "ring-timeout";
      call.phase = "ending";
      this.touch("dial-action-observed", call);
      return twilioXml("hangup", this.config);
    }
    if (call.phase === "ended") return twilioXml("hangup", this.config);
    if (!call.approval) return twilioXml("denied", this.config);
    if (call.closed || call.disposition === "queue-overflow") {
      if (!call.closedMessageIssued) {
        this.charge(call);
        call.closedMessageIssued = true;
        return call.closed ? twilioXml("closed", this.config) : twilioXml("hangup", this.config);
      }
      return twilioXml("hangup", this.config);
    }
    if (call.phase === "ending") return twilioXml("hangup", this.config);
    this.dispatch();
    if (call.phase === "offered" && !call.browserSetupStarted) {
      this.charge(call, true);
      call.browserSetupStarted = true;
      call.browserSetupUnknown = true;
      this.touch("browser-offer-instructions-issued", call);
      return twilioXml("offer", this.config, call, this.agents.get(call.owner).principal);
    }
    if (call.phase === "reconciliation-required") return twilioXml("wait", this.config, call);
    return twilioXml(kind === "inbound" ? "wait-first" : "wait", this.config, call);
  }
  checkReservation(call, query) {
    if (query.get("call") !== call.id || query.get("reservation") !== call.reservationId) fail("callback-reservation-mismatch", 403);
  }
  twilioEvent(kind, form, query) {
    if (form.AccountSid !== this.config.twilioAccountSid) fail("provider-account-mismatch", 403);
    const sid = boundedString(form.CallSid, 40, /^CA[0-9a-f]{32}$/i);
    if (kind === "client-status") {
      const call = this.calls.get(query.get("call"));
      if (!call || call.provider !== "twilio") fail("unknown-browser-callback", 403);
      this.checkReservation(call, query);
      if (!form.ParentCallSid && sid === call.pstnCallId) {
        // Documented pre-child notification. It is NOT a browser-leg identity.
        if (form.CallStatus === "in-progress") call.pstnAnswered = true;
        if (TERMINAL_TWILIO.has(form.CallStatus)) { call.pstnEnded = true; this.maybeEnded(call); }
        this.touch("pre-child-parent-status-observed", call);
        return;
      }
      if (form.ParentCallSid !== call.pstnCallId) fail("provider-parent-mismatch", 403);
      this.bindBrowser(call, { browserCallId: sid });
      if (form.CallStatus === "in-progress") {
        call.browserAnswered = true;
        // <Dial><Client> without a whisper URL connects these two mapped legs.
        call.bridgeObserved = true;
        this.maybeConnected(call);
      }
      if (TERMINAL_TWILIO.has(form.CallStatus)) {
        call.browserEnded = true;
        if (!call.pstnEnded && !call.dialActionObserved) call.phase = "ending";
        this.maybeEnded(call);
      }
      this.touch("browser-status-observed", call);
      return;
    }
    const call = this.calls.get(this.pstnIndex.get(callKey("twilio", sid)));
    if (!call) {
      if (TERMINAL_TWILIO.has(form.CallStatus)) this.remember(this.tombstones, callKey("twilio", sid), this.now());
      return;
    }
    if (form.To !== undefined && form.To !== call.to) fail("provider-number-mismatch", 403);
    if (form.CallStatus === "in-progress") call.pstnAnswered = true;
    if (TERMINAL_TWILIO.has(form.CallStatus)) { call.pstnEnded = true; this.maybeEnded(call); }
    this.touch("pstn-status-observed", call);
  }
  telnyxEvent(event) {
    if (!isRecord(event?.data) || !isRecord(event.data.payload)) fail("invalid-provider-event");
    const { id, event_type: type, payload: p } = event.data;
    boundedString(id, 120, /^[A-Za-z0-9_-]+$/);
    boundedString(type, 100, /^[a-z_.]+$/);
    // Delivery metadata (attempt, delivered_to) may differ on a retry.
    const digest = sha256(canonicalJson(event.data));
    if (this.eventLedger.has(id)) {
      if (this.eventLedger.get(id) !== digest) fail("event-id-conflict", 409);
      return;
    }
    if (p.connection_id !== this.config.providers.telnyx?.applicationId) fail("provider-application-mismatch", 403);
    const ccid = boundedString(p.call_control_id, 512, rawId);
    let call = this.calls.get(this.pstnIndex.get(callKey("telnyx", ccid))) ?? this.calls.get(this.browserIndex.get(callKey("telnyx", ccid)));
    if (!call && p.client_state) {
      let state;
      try { state = JSON.parse(Buffer.from(p.client_state, "base64").toString("utf8")); } catch { fail("invalid-provider-correlation", 403); }
      call = this.calls.get(state.callId);
      if (!call || !call.owner || state.agentId !== call.owner || state.reservationId !== call.reservationId || call.provider !== "telnyx" ||
        p.to !== "sip:" + this.agents.get(call.owner).principal.telnyxSipUsername + "@sip.telnyx.com") fail("provider-correlation-mismatch", 403);
      this.bindBrowser(call, { browserCallId: ccid, browserCallLegId: p.call_leg_id, callSessionId: p.call_session_id });
    }
    if (!call && type === "call.initiated" && p.direction === "incoming") {
      call = this.admit("telnyx", ccid, p.from, p.to);
      if (call) {
        // Do not guess that independently created legs share one session ID.
        call.pstnCallSessionId = p.call_session_id ?? null;
        const old = this.orphans.get(callKey("telnyx", ccid)) ?? [];
        this.orphans.delete(callKey("telnyx", ccid));
        for (const orphan of old) this.applyTelnyx(call, orphan.type, orphan.payload);
        if (call.approval && !call.pstnEnded && !call.pstnAnswered) this.effect(call, "pstn-answer", () => {
          this.charge(call);
          return this.providers.telnyx.answer(call, this.id());
        });
      }
    } else if (!call) {
      if (type === "call.hangup") this.remember(this.tombstones, callKey("telnyx", ccid), this.now());
      else if (["call.answered", "call.bridged"].includes(type)) {
        const list = this.orphans.get(callKey("telnyx", ccid)) ?? [];
        if (list.length < 8) list.push({ type, payload: p });
        this.remember(this.orphans, callKey("telnyx", ccid), list, 128);
      }
    }
    if (call) this.applyTelnyx(call, type, p);
    this.remember(this.eventLedger, id, digest);
  }
  applyTelnyx(call, type, p) {
    if (call.phase === "ended") return;
    const browser = p.call_control_id === call.browserCallId;
    if (type === "call.answered") {
      if (browser) call.browserAnswered = true;
      else call.pstnAnswered = true;
      if (!browser && call.closed && !call.closedMessageIssued && call.approval) {
        call.closedMessageIssued = true;
        this.effect(call, "closed-message", () => {
          this.charge(call);
          return this.providers.telnyx.closedMessage(call, this.id());
        });
      } else if (!browser && call.disposition === "queue-overflow" && call.approval) void this.finish(call, "queue-overflow");
      this.maybeConnected(call);
      this.dispatch();
    }
    if (type === "call.speak.ended" && call.closed && call.closedMessageIssued) void this.finish(call, call.endReason);
    if (type === "call.bridged") {
      call.bridgeObserved = true;
      if (browser) call.browserAnswered = true;
      this.maybeConnected(call);
    }
    if (type === "call.hangup") {
      if (browser) call.browserEnded = true;
      else call.pstnEnded = true;
      this.maybeEnded(call);
      if (browser && !call.pstnEnded) void this.finish(call, call.bridgeObserved ? "agent-hangup" : "ring-timeout");
    }
    this.touch("provider-event-observed", call, type);
  }
  async reconcile(call) {
    if (!call.approval || !this.config.operationsEnabled) fail("lab-call-budget-denied", 403);
    const p = this.providers[call.provider];
    const parent = await p.inspect(call.pstnCallId);
    if (parent.ended) call.pstnEnded = true;
    if (call.browserCallId) {
      const browser = await p.inspect(call.browserCallId);
      if (browser.ended) call.browserEnded = true;
    }
    // A live parent does not prove a bridge; an unknown child is not absent.
    this.maybeEnded(call);
    if (call.phase !== "ended") {
      call.uncertain = true;
      call.phase = "reconciliation-required";
      this.touch("reconciliation-incomplete", call);
      return "unknown";
    }
    return "applied";
  }
  async command(session, body) {
    onlyKeys(body, ["commandId", "expectedRevision", "type", "callId", "payload"]);
    if (!uuid.test(body.commandId) || !Number.isSafeInteger(body.expectedRevision) || !COMMANDS.includes(body.type)) fail("invalid-command");
    const agent = this.agent(session);
    const key = `${session.id}:${body.commandId}`;
    const contentHash = sha256(canonicalJson({ type: body.type, callId: body.callId ?? null, payload: body.payload ?? {} }));
    if (this.commandLedger.has(key)) {
      const previous = this.commandLedger.get(key);
      if (previous.hash !== contentHash) fail("command-id-conflict", 409);
      return this.envelope(session, { commandId: body.commandId, outcome: previous.outcome === "unknown" ? "unknown" : "duplicate" });
    }
    if (body.expectedRevision !== agent.revisions[session.provider]) fail("stale-revision", 409);
    const payload = body.payload ?? {};
    const payloadKeys = { presence: ["presence"], mute: ["muted"], hold: ["held"], dtmf: ["digit"], notes: ["text"] };
    onlyKeys(payload, payloadKeys[body.type] ?? []);
    const callAction = !["connect", "disconnect", "presence", "heartbeat"].includes(body.type);
    let call;
    if (callAction) {
      call = this.calls.get(body.callId);
      if (!call || call.owner !== agent.principal.id || call.provider !== session.provider || agent.reservation !== call.id || call.phase === "ended") fail("call-owner-mismatch", 403);
    } else if (body.callId !== undefined) fail("invalid-command");
    if (body.type === "hold") fail("unsupported-hold", 422);
    if (body.type === "reconcile" && !agent.principal.operator) fail("operator-required", 403);
    if (call?.uncertain && !["hangup", "notes", "reconcile"].includes(body.type)) fail("remote-outcome-unverified", 409);
    // Validate everything before claiming the idempotency key or taking an action.
    if (body.type === "presence" && !["available", "away", "offline"].includes(payload.presence)) fail("invalid-presence");
    if (body.type === "mute" && typeof payload.muted !== "boolean") fail("invalid-mute");
    if (body.type === "dtmf" && !/^[0-9*#]$/.test(payload.digit)) fail("invalid-digit");
    if (body.type === "notes" && (typeof payload.text !== "string" || payload.text.length > 2000)) fail("invalid-notes");
    if (body.type === "accept" && !["offered", "connecting"].includes(call.phase)) fail("invalid-transition", 409);
    if (["mute", "dtmf"].includes(body.type) && call.phase !== "connected") fail("invalid-transition", 409);
    const record = { hash: contentHash, outcome: "applied" };
    this.remember(this.commandLedger, key, record);
    let action;
    if (body.type === "connect") { agent.connected = true; agent.heartbeat = this.now(); agent.error = null; }
    if (body.type === "disconnect") {
      agent.connected = false; agent.presence = "offline";
      if (agent.reservation) {
        const active = this.calls.get(agent.reservation);
        active.uncertain = true; active.phase = "reconciliation-required";
      }
    }
    if (body.type === "presence") { agent.presence = payload.presence; agent.heartbeat = this.now(); }
    if (body.type === "heartbeat") agent.heartbeat = this.now();
    if (body.type === "accept") call.phase = "connecting";
    if (body.type === "decline") action = this.finish(call, "declined");
    if (body.type === "hangup") action = this.finish(call, "agent-hangup");
    if (body.type === "mute") call.muted = payload.muted;
    if (body.type === "dtmf") call.dtmfDigits = (call.dtmfDigits + payload.digit).slice(-32);
    if (body.type === "notes") call.notes = payload.text;
    if (body.type === "reconcile") action = this.effect(call, "reconcile", () => this.reconcile(call));
    this.touch("command-" + body.type, call);
    this.dispatch();
    if (action) {
      const outcome = await action;
      record.outcome = outcome;
    }
    return this.envelope(session, { commandId: body.commandId, outcome: record.outcome });
  }
  tick() {
    for (const agent of this.agents.values()) {
      if (agent.connected && this.now() - agent.heartbeat >= this.config.heartbeatSeconds * 1000) {
        agent.connected = false; agent.presence = "offline";
        if (agent.reservation) {
          const call = this.calls.get(agent.reservation);
          call.uncertain = true; call.phase = "reconciliation-required";
        }
        this.touch("agent-lease-expired");
      }
    }
    for (const call of this.calls.values()) {
      if (call.phase === "ended" || !call.approval) continue;
      if (this.now() - call.createdAt >= call.approval.maxSeconds * 1000 ||
        (call.phase === "queued" && this.now() - call.createdAt >= this.config.maxWaitSeconds * 1000)) {
        void this.finish(call, "ring-timeout");
      }
    }
    this.dispatch();
  }
}
