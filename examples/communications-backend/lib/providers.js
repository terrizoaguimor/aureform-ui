// SPDX-License-Identifier: Apache-2.0
import twilio from "twilio";
import { randomUUID } from "node:crypto";
import { fail, isRecord } from "./config.js";

const terminalTwilio = new Set(["completed", "busy", "failed", "no-answer", "canceled"]);
export class ProviderFailure extends Error {
  constructor(code, unknown = true) {
    super(code);
    this.code = code;
    this.unknown = unknown;
  }
}
export function twilioXml(kind, config, call, agent) {
  const xml = new twilio.twiml.VoiceResponse();
  const hook = (path) => config.publicBaseUrl + path;
  if (kind === "denied") xml.reject({ reason: "busy" });
  else if (kind === "closed") { xml.say(config.closedMessage); xml.hangup(); }
  else if (kind === "hangup") xml.hangup();
  else if (kind === "offer") {
    const query = `?call=${encodeURIComponent(call.id)}&reservation=${encodeURIComponent(call.reservationId)}`;
    const dial = xml.dial({
      action: hook("/webhooks/twilio/dial-action") + query,
      method: "POST", timeout: config.ringSeconds, answerOnBridge: true, record: "do-not-record",
      timeLimit: call.approval.maxSeconds,
    });
    const client = dial.client({
      statusCallback: hook("/webhooks/twilio/client-status") + query,
      statusCallbackMethod: "POST", statusCallbackEvent: "initiated ringing answered completed",
    });
    client.identity(agent.twilioIdentity);
    client.parameter({ name: "aureformCallId", value: call.id });
    client.parameter({ name: "aureformReservationId", value: call.reservationId });
  } else {
    // A domain FIFO, not Twilio <Queue>. Each signed poll checks the reservation.
    if (kind === "wait-first") xml.say(config.waitMessage);
    xml.pause({ length: 5 });
    const query = `?call=${encodeURIComponent(call.id)}&tick=${randomUUID()}`;
    xml.redirect({ method: "POST" }, hook("/webhooks/twilio/wait") + query);
  }
  return xml.toString();
}

export function createProviders(config, env = process.env, { fetch: http = globalThis.fetch, now = Date.now, twilioClient } = {}) {
  const client = twilioClient ?? (env.TWILIO_ACCOUNT_SID && env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET
    ? twilio(env.TWILIO_API_KEY_SID, env.TWILIO_API_KEY_SECRET, {
      accountSid: env.TWILIO_ACCOUNT_SID, timeout: 5000, autoRetry: false,
    }) : null);
  const networkEnabled = () => { if (!config.operationsEnabled) fail("carrier-operations-disabled", 403); };
  const telnyxRequest = async (method, path, body, text = false) => {
    if (!env.TELNYX_API_KEY) fail("provider-not-configured", 503);
    try {
      const response = await http("https://api.telnyx.com/v2" + path, {
        method, redirect: "error", signal: AbortSignal.timeout(5000),
        headers: { Authorization: "Bearer " + env.TELNYX_API_KEY, Accept: text ? "text/plain" : "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!response.ok) throw new ProviderFailure("provider-http-" + response.status, response.status >= 500);
      // Never return SIP passwords, HTTP headers, or raw errors to the browser.
      return text ? await response.text() : await response.json();
    } catch (error) {
      if (error instanceof ProviderFailure) throw error;
      throw new ProviderFailure("provider-transport-outcome-unknown");
    }
  };
  return {
    twilio: {
      async token(agent) {
        if (!/^AC[0-9a-f]{32}$/i.test(env.TWILIO_ACCOUNT_SID ?? "") ||
          !/^SK[0-9a-f]{32}$/i.test(env.TWILIO_API_KEY_SID ?? "") || !env.TWILIO_API_KEY_SECRET) fail("provider-not-configured", 503);
        const token = new twilio.jwt.AccessToken(env.TWILIO_ACCOUNT_SID, env.TWILIO_API_KEY_SID, env.TWILIO_API_KEY_SECRET, {
          identity: agent.twilioIdentity, ttl: config.carrierTokenSeconds,
        });
        // No outgoingApplicationSid grant: SDK cannot initiate PSTN calls.
        token.addGrant(new twilio.jwt.AccessToken.VoiceGrant({ incomingAllow: true }));
        const jwt = token.toJwt();
        const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
        return { kind: "twilio-access-token", token: jwt,
          expiresAt: new Date(payload.exp * 1000).toISOString() };
      },
      async hangup(callId) {
        networkEnabled();
        if (!client) fail("provider-not-configured", 503);
        try {
          const resource = client.calls(callId);
          const call = await resource.fetch();
          if (terminalTwilio.has(call.status)) return;
          await resource.update({ status: ["queued", "ringing", "initiated"].includes(call.status) ? "canceled" : "completed" });
        }
        catch { throw new ProviderFailure("provider-transport-outcome-unverified"); }
      },
      async inspect(callId) {
        networkEnabled();
        if (!client) fail("provider-not-configured", 503);
        try {
          const call = await client.calls(callId).fetch();
          return { ended: terminalTwilio.has(call.status), status: call.status, parentId: call.parentCallSid ?? null };
        } catch { throw new ProviderFailure("provider-reconciliation-unavailable"); }
      },
    },
    telnyx: {
      async token(agent) {
        const pc = config.providers.telnyx;
        // This flag is an operator prerequisite, not a JWT incoming-only grant.
        if (pc?.browserOutboundDisabledVerified !== true) fail("sip-outbound-policy-unverified", 403);
        const { data: connection } = await telnyxRequest("GET", "/credential_connections/" + encodeURIComponent(pc.credentialConnectionId));
        if (connection?.id !== pc.credentialConnectionId) fail("sip-outbound-policy-denied", 403);
        const outbound = connection.outbound;
        if (!isRecord(outbound) || !Object.hasOwn(outbound, "outbound_voice_profile_id")) fail("sip-outbound-policy-unverified", 403);
        const profile = outbound.outbound_voice_profile_id;
        if (typeof profile === "string" && profile.length) fail("sip-outbound-policy-denied", 403);
        // Strict lab policy: explicit null only. An omitted field is not proof of
        // absence; its actual account representation must be verified separately.
        if (profile !== null) fail("sip-outbound-policy-unverified", 403);
        const { data: credential } = await telnyxRequest("GET", "/telephony_credentials/" + encodeURIComponent(agent.telnyxCredentialId));
        const expiry = Date.parse(credential?.expires_at);
        if (credential?.id !== agent.telnyxCredentialId || credential?.sip_username !== agent.telnyxSipUsername ||
          credential?.resource_id !== "connection:" + pc.credentialConnectionId || credential?.expired ||
          !Number.isFinite(expiry) || expiry <= now() + 30000 || expiry > now() + config.carrierTokenSeconds * 1000) fail("short-lived-credential-required", 403);
        const token = (await telnyxRequest("POST", "/telephony_credentials/" + encodeURIComponent(agent.telnyxCredentialId) + "/token", undefined, true)).trim();
        let jwt;
        try { jwt = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")); } catch { fail("invalid-provider-token", 502); }
        if (!Number.isSafeInteger(jwt.exp) || jwt.exp * 1000 > expiry + 1000 || jwt.exp * 1000 <= now() + 30000 ||
          jwt.exp * 1000 > now() + config.carrierTokenSeconds * 1000 + 1000) fail("provider-token-ttl-unbounded", 502);
        return { kind: "telnyx-login-token", token, expiresAt: new Date(Math.min(expiry, jwt.exp * 1000)).toISOString() };
      },
      async answer(call, commandId) {
        networkEnabled();
        return telnyxRequest("POST", "/calls/" + encodeURIComponent(call.pstnCallId) + "/actions/answer", { command_id: commandId });
      },
      async offer(call, agent, commandId) {
        networkEnabled();
        const to = "sip:" + agent.telnyxSipUsername + "@sip.telnyx.com";
        const result = await telnyxRequest("POST", "/calls", {
          connection_id: config.providers.telnyx.applicationId,
          from: config.providers.telnyx.inboundNumber, to,
          command_id: commandId, client_state: Buffer.from(JSON.stringify({
            callId: call.id, reservationId: call.reservationId, agentId: agent.id,
          })).toString("base64"),
          timeout_secs: config.ringSeconds, time_limit_secs: call.approval.maxSeconds,
          link_to: call.pstnCallId, bridge_on_answer: true, prevent_double_bridge: true,
          webhook_url: config.publicBaseUrl + "/webhooks/telnyx", webhook_url_method: "POST",
        });
        const data = result.data;
        if (typeof data?.call_control_id !== "string" || typeof data?.call_leg_id !== "string") throw new ProviderFailure("provider-leg-identifiers-missing");
        return { browserCallId: data.call_control_id, browserCallLegId: data.call_leg_id,
          callSessionId: data.call_session_id ?? null };
      },
      async closedMessage(call, commandId) {
        networkEnabled();
        return telnyxRequest("POST", "/calls/" + encodeURIComponent(call.pstnCallId) + "/actions/speak", {
          command_id: commandId, payload: config.closedMessage, payload_type: "text",
          voice: "female", language: "en-US", service_level: "basic",
          client_state: Buffer.from(JSON.stringify({ callId: call.id, purpose: "closed-message" })).toString("base64"),
        });
      },
      async hangup(callId, commandId = randomUUID()) {
        networkEnabled();
        return telnyxRequest("POST", "/calls/" + encodeURIComponent(callId) + "/actions/hangup", { command_id: commandId });
      },
      async inspect(callId) {
        networkEnabled();
        const { data } = await telnyxRequest("GET", "/calls/" + encodeURIComponent(callId));
        if (typeof data?.is_alive !== "boolean") throw new ProviderFailure("provider-reconciliation-incomplete");
        return { ended: !data.is_alive, status: data.is_alive ? "alive" : "ended" };
      },
    },
  };
}
