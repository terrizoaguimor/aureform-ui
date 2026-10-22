// SPDX-License-Identifier: Apache-2.0
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { setTimeout as waitForPropagation } from "node:timers/promises";

/**
 * Configuration resources only: no purchases, Calls API, recordings or deletes.
 * Owner authentication, reviewed apply approval, encrypted storage, cross-process
 * serialization and the separate call/spend gate belong to the caller.
 *
 * checkpoint(stage, { operation, privateState }) MUST durably encrypt its data
 * before resolving. Stages: before-effect, after-effect, failed, unknown, verified.
 * Resume with existing = checkpointData.privateState. pending/unknown blocks
 * replay; it requires explicit external reconciliation, never automatic retry.
 * The entire apply result is PRIVATE; only result.publicResult is browser-safe.
 *
 * Official references consulted 2026-10-21, America/Bogota:
 * https://www.twilio.com/docs/iam/api/account
 * https://www.twilio.com/docs/usage/trials/try-out-voice
 * https://www.twilio.com/docs/usage/security
 * https://www.twilio.com/docs/iam/api/secondary_authtoken
 * https://www.twilio.com/docs/iam/api-keys/key-resource-v2010
 * https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource
 * https://www.twilio.com/docs/global-infrastructure/inbound-processing-region-api-phone-number
 * https://www.twilio.com/docs/global-infrastructure/inbound-processing-api
 * https://developers.telnyx.com/api-reference/numbers-features/retrieve-the-features-for-a-list-of-numbers
 * https://developers.telnyx.com/api-reference/call-control-applications/create-a-call-control-application
 * https://developers.telnyx.com/api-reference/credential-connections/create-a-credential-connection
 * https://developers.telnyx.com/api-reference/phone-number-configurations/update-a-phone-number
 * https://developers.telnyx.com/docs/voice/webrtc/auth/telephony-credentials
 * https://developers.telnyx.com/docs/voice/webrtc/auth/jwt
 *
 * US1 Twilio REST endpoint only. Readback is configuration verification, not
 * real-call, SIP, browser, regional eligibility or production certification.
 * Twilio requires active Full and an unmasked Account auth_token matching the
 * submitted primary token. Trial blocks Dial Client; secondary REST credentials
 * do not establish the primary token needed for webhook signatures. Missing,
 * masked or unrecognized account/token values fail closed. Rechecks before each
 * write and final readback cannot make concurrent provider changes atomic.
 * The documented v2 routing 404 means implicit US1 for API-provisioned numbers.
 * Accept it only after verifying owned number eligibility, on the exact routing
 * GET, with HTTP 404 and JSON code 20404/status 404. Never write a routing Region.
 */

const TWILIO = "https://api.twilio.com";
const TWILIO_ROUTES = "https://routes.twilio.com";
const TELNYX = "https://api.telnyx.com/v2";
const SID = { account: /^AC[0-9a-f]{32}$/i, number: /^PN[0-9a-f]{32}$/i, key: /^SK[0-9a-f]{32}$/i };
const RESOURCE_ID = /^[A-Za-z0-9_-]{1,80}$/;
const E164 = /^\+[1-9]\d{7,14}$/;
// Transport-only evidence; a successful JSON response cannot forge this value.
const TWILIO_IMPLICIT_US1 = Symbol("twilio-implicit-us1");
const MAX_PAGES = 100;
// Wizard/coordinator bound. Reject larger inventories explicitly, never truncate.
const MAX_NUMBERS = 1000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const copy = (v) => structuredClone(v);
const nonempty = (v) => typeof v === "string" && v.length > 0;
const nullable = (v) => typeof v === "string" && v.length ? v : null;
const flag = (v) => typeof v === "boolean" ? v : null;

export class SetupProviderError extends Error {
  constructor(code, provider = null, status = 400, outcome = "failed") {
    super(code);
    this.name = "SetupProviderError";
    this.code = code;
    this.provider = provider;
    this.status = status;
    this.outcome = outcome;
    this.unknown = outcome === "unknown";
    this.retryable = false;
    // Deliberately no raw response, request, credentials or underlying cause.
  }
}
const deny = (code, provider, status = 400, outcome = "failed") => {
  throw new SetupProviderError(code, provider, status, outcome);
};
function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (record(value)) return "{" + Object.keys(value).sort()
    .map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  return JSON.stringify(value);
}
const digest = (v) => createHash("sha256").update(canonical(v)).digest("hex");
function label(value, fallback, secrets = []) {
  let text = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f-\u009f]/g, "").trim() : "";
  for (const secret of secrets) if (nonempty(secret)) text = text.split(secret).join("[redacted]");
  return (text || fallback).slice(0, 100);
}
function credentialsFor(provider, credentials) {
  const keys = provider === "twilio" ? ["provider", "accountSid", "authToken"] : ["provider", "apiKey", "publicKey"];
  if (!record(credentials) || credentials.provider !== provider ||
      Object.keys(credentials).some((key) => !keys.includes(key))) deny("invalid-setup-credentials", provider);
  if (provider === "twilio") {
    if (typeof credentials.accountSid !== "string" || typeof credentials.authToken !== "string" ||
        !SID.account.test(credentials.accountSid) ||
        !/^[0-9a-f]{32}$/i.test(credentials.authToken ?? "")) deny("invalid-setup-credentials", provider);
  } else {
    if (typeof credentials.apiKey !== "string" || credentials.apiKey.length < 8 || credentials.apiKey.length > 512 ||
        !/^[A-Za-z0-9._~+/-]+=*$/.test(credentials.apiKey) || typeof credentials.publicKey !== "string") {
      deny("invalid-setup-credentials", provider);
    }
    const key = Buffer.from(credentials.publicKey, "base64");
    if (key.length !== 32 || key.toString("base64") !== credentials.publicKey) deny("invalid-setup-public-key", provider);
  }
  return { ...credentials };
}
function originFor(value) {
  if (value === undefined || value === null || value === "") return null;
  let url;
  try { url = new URL(value); } catch { deny("invalid-setup-public-url", null); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      url.pathname !== "/" || (url.port && url.port !== "443") || url.hostname === "localhost") {
    deny("invalid-setup-public-url", null);
  }
  return url.origin;
}
function scopeFor(provider, credentials) {
  // Telnyx has no assumed account-label/identity endpoint here: bind the plan to
  // this exact API-key scope. Rotating its key needs a newly reviewed plan.
  return digest(provider === "twilio"
    ? { provider, accountSid: credentials.accountSid }
    : { provider, apiKey: credentials.apiKey, publicKey: credentials.publicKey });
}
async function readText(response) {
  let text;
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const parts = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_RESPONSE_BYTES) {
          await reader.cancel().catch(() => {});
          throw new Error("oversize");
        }
        parts.push(Buffer.from(value));
      }
      text = Buffer.concat(parts).toString("utf8");
    } finally { reader.releaseLock(); }
  } else {
    text = await response.text();
    if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new Error("oversize");
  }
  return text;
}
async function readJson(response) {
  const value = JSON.parse(await readText(response));
  if (!record(value)) throw new Error("invalid-json-shape");
  return value;
}
function twNumber(data, credentials, expectedId, privateSecrets = []) {
  if (!record(data) || typeof data.sid !== "string" || !SID.number.test(data.sid) || data.account_sid !== credentials.accountSid ||
      (expectedId && data.sid !== expectedId) || !E164.test(data.phone_number ?? "") ||
      !record(data.capabilities) || typeof data.capabilities.voice !== "boolean") {
    deny("provider-number-response-invalid", "twilio", 502);
  }
  return {
    id: data.sid, phoneNumber: data.phone_number,
    label: label(data.friendly_name, data.phone_number, [credentials.accountSid, credentials.authToken, ...privateSecrets]),
    voiceEnabled: data.capabilities.voice,
    hasExistingRouting: [data.voice_url, data.voice_application_sid, data.trunk_sid,
      data.voice_fallback_url, data.status_callback].some(nonempty),
  };
}
function twRouting(data) {
  return {
    id: data.sid, accountSid: data.account_sid, phoneNumber: data.phone_number,
    voiceEnabled: data.capabilities.voice,
    voice: {
      url: nullable(data.voice_url), method: nullable(data.voice_method),
      applicationSid: nullable(data.voice_application_sid), trunkSid: nullable(data.trunk_sid),
      fallbackUrl: nullable(data.voice_fallback_url), fallbackMethod: nullable(data.voice_fallback_method),
      statusCallback: nullable(data.status_callback), statusCallbackMethod: nullable(data.status_callback_method),
      receiveMode: nullable(data.voice_receive_mode), callerIdLookup: flag(data.voice_caller_id_lookup),
    },
    messaging: {
      applicationSid: nullable(data.sms_application_sid), url: nullable(data.sms_url),
      method: nullable(data.sms_method), fallbackUrl: nullable(data.sms_fallback_url),
      fallbackMethod: nullable(data.sms_fallback_method),
    },
  };
}
function twEligible(data) {
  if (!data.capabilities.voice) deny("number-not-voice-enabled", "twilio", 422);
  if (nonempty(data.trunk_sid)) deny("twilio-trunk-routing-unsupported", "twilio", 422);
  if (data.voice_receive_mode && data.voice_receive_mode !== "voice") deny("twilio-number-voice-mode-required", "twilio", 422);
  if (data.status && data.status !== "in-use") deny("twilio-number-status-unsupported", "twilio", 422);
}
function twTarget(prior, hooks) {
  const result = copy(prior);
  Object.assign(result.voice, {
    url: hooks.twilioInbound, method: "POST", statusCallback: hooks.twilioStatus,
    statusCallbackMethod: "POST", applicationSid: null, fallbackUrl: null,
  });
  return result;
}
function assertTwRouting(data, credentials, plan, hooks) {
  twNumber(data, credentials, plan.number.id);
  twEligible(data);
  if (digest(twRouting(data)) !== digest(twTarget(plan.priorRouting, hooks))) {
    deny("routing-verification-failed", "twilio", 409);
  }
}
function telNumber(data, expectedId, voiceEnabled, credentials, privateSecrets = []) {
  if (!record(data) || typeof data.id !== "string" || !RESOURCE_ID.test(data.id) ||
      (expectedId && data.id !== expectedId) || !E164.test(data.phone_number ?? "") ||
      typeof data.status !== "string") deny("provider-number-response-invalid", "telnyx", 502);
  return {
    id: data.id, phoneNumber: data.phone_number,
    label: label(data.customer_reference, data.phone_number, [credentials.apiKey, credentials.publicKey, ...privateSecrets]),
    voiceEnabled: voiceEnabled && data.status === "active",
    hasExistingRouting: nonempty(data.connection_id) || data.call_forwarding_enabled === true ||
      data.call_recording_enabled === true,
  };
}
function telRouting(data, voice) {
  return {
    id: data.id, phoneNumber: data.phone_number, status: data.status,
    connectionId: nullable(data.connection_id), messagingProfileId: nullable(data.messaging_profile_id),
    forwardingEnabled: flag(data.call_forwarding_enabled), recordingEnabled: flag(data.call_recording_enabled),
    voice: {
      connectionId: nullable(voice.connection_id), translatedNumber: nullable(voice.translated_number),
      techPrefixEnabled: flag(voice.tech_prefix_enabled),
      callForwarding: copy(voice.call_forwarding ?? null), callRecording: copy(voice.call_recording ?? null),
      inboundCallScreening: nullable(voice.inbound_call_screening),
      mediaHandlingMode: nullable(voice.media_handling_mode),
      usagePaymentMethod: nullable(voice.usage_payment_method),
    },
  };
}
function telEligible(data, voice, enabled) {
  if (data.status !== "active") deny("number-not-active", "telnyx", 422);
  if (!enabled) deny("number-not-voice-enabled", "telnyx", 422);
  if (!record(voice) || voice.id !== data.id ||
      nullable(voice.connection_id) !== nullable(data.connection_id) ||
      !record(voice.call_forwarding) || typeof voice.call_forwarding.call_forwarding_enabled !== "boolean" ||
      !record(voice.call_recording) || typeof voice.call_recording.inbound_call_recording_enabled !== "boolean" ||
      typeof voice.tech_prefix_enabled !== "boolean" || typeof voice.inbound_call_screening !== "string") {
    deny("number-voice-policy-unverified", "telnyx", 422);
  }
  if (data.call_forwarding_enabled === true || data.call_recording_enabled === true ||
      voice.call_forwarding.call_forwarding_enabled || voice.call_recording.inbound_call_recording_enabled ||
      voice.tech_prefix_enabled || voice.inbound_call_screening !== "disabled" ||
      (nonempty(voice.translated_number) && voice.translated_number !== data.phone_number)) {
    deny("existing-voice-policy-unsupported", "telnyx", 422);
  }
}
function telTarget(prior, applicationId) {
  const target = copy(prior);
  target.connectionId = applicationId;
  target.voice.connectionId = applicationId;
  return target;
}
function assertTelRouting(data, voice, enabled, credentials, plan, applicationId) {
  telNumber(data, plan.number.id, enabled, credentials);
  telEligible(data, voice, enabled);
  if (digest(telRouting(data, voice)) !== digest(telTarget(plan.priorRouting, applicationId))) {
    deny("routing-verification-failed", "telnyx", 409);
  }
}
function appOwned(data, id, name, hook) {
  if (!record(data) || data.id !== id || data.application_name !== name || data.active !== true ||
      data.webhook_event_url !== hook || data.webhook_api_version !== "2" ||
      nonempty(data.webhook_event_failover_url)) deny("owned-application-verification-failed", "telnyx", 409);
}
function connectionOwned(data, id, seed) {
  if (!record(data) || data.id !== id || data.connection_name !== seed.name ||
      data.user_name !== seed.userName || data.active !== true ||
      data.sip_uri_calling_preference !== "internal") deny("owned-credential-connection-verification-failed", "telnyx", 409);
  const outbound = data.outbound;
  if (!record(outbound) || !Object.hasOwn(outbound, "outbound_voice_profile_id") ||
      outbound.outbound_voice_profile_id === undefined) deny("sip-outbound-policy-unverified", "telnyx", 422);
  if (nonempty(outbound.outbound_voice_profile_id)) deny("sip-outbound-policy-denied", "telnyx", 422);
  // An omitted field is not evidence. This is conservative lab readback, not
  // provider enforcement certification; JWTs have no incoming-only grant here.
  if (outbound.outbound_voice_profile_id !== null || outbound.call_parking_enabled === true) {
    deny("sip-outbound-policy-unverified", "telnyx", 422);
  }
}

export function createSetupProviderOperations({
  fetch: http = globalThis.fetch, publicBaseUrl, now = Date.now, wait = waitForPropagation,
} = {}) {
  if (typeof http !== "function" || typeof now !== "function" || typeof wait !== "function") deny("invalid-setup-options", null);
  const origin = originFor(publicBaseUrl);
  const inFlight = new Set();
  const attempts = new Map();
  const uncertainNumbers = new Set();
  const timestamp = () => {
    const value = now();
    if (!Number.isSafeInteger(value) || value < 0 || value > 8640000000000000) deny("invalid-setup-clock", null);
    return new Date(value).toISOString();
  };
  const hooksFor = () => {
    if (!origin) deny("setup-public-url-required", null, 503);
    return { twilioInbound: origin + "/webhooks/twilio/inbound",
      twilioStatus: origin + "/webhooks/twilio/status", telnyx: origin + "/webhooks/telnyx" };
  };
  async function request(provider, credentials, method, path, body, effect = false, text = false, options = {}) {
    const outcome = effect ? "unknown" : "failed";
    const url = provider === "twilio"
      ? (path.startsWith("/v2/PhoneNumbers/") ? TWILIO_ROUTES : TWILIO) + path : TELNYX + path;
    let response;
    try {
      response = await http(url, {
        method, redirect: "error", signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: provider === "twilio"
            ? "Basic " + Buffer.from(credentials.accountSid + ":" + credentials.authToken).toString("base64")
            : "Bearer " + credentials.apiKey,
          Accept: text ? "text/plain" : "application/json",
          ...(body ? { "Content-Type": provider === "twilio"
            ? "application/x-www-form-urlencoded" : "application/json" } : {}),
        },
        ...(body ? { body: provider === "twilio" ? new URLSearchParams(body).toString() : JSON.stringify(body) } : {}),
      });
    } catch { deny("provider-transport-failed", provider, 502, outcome); }
    if (!Number.isInteger(response?.status) || typeof response.ok !== "boolean") {
      deny("provider-response-invalid", provider, 502, outcome);
    }
    if (!response.ok) {
      if (options.defaultUs1OnNotFound === true && provider === "twilio" &&
          method === "GET" && body === undefined && !effect && !text &&
          /^\/v2\/PhoneNumbers\/%2B[1-9]\d{7,14}$/.test(path) &&
          url === TWILIO_ROUTES + path && response.status === 404) {
        let missing;
        try {
          missing = await readJson(response);
        } catch { deny("provider-response-invalid", provider, 502); }
        if (missing.code === 20404 && missing.status === 404) return TWILIO_IMPLICIT_US1;
      }
      // Never use vendor error messages: they can echo credentials or inputs.
      const uncertain = effect && (response.status >= 500 || response.status === 408);
      const code = response.status === 401 ? "provider-credentials-rejected"
        : response.status === 403 ? "provider-policy-denied"
        : response.status === 404 ? "provider-resource-not-found"
        : response.status === 429 ? "provider-rate-limited" : "provider-http-rejected";
      await response.body?.cancel?.().catch(() => {});
      deny(code, provider, response.status === 401 ? 401 : response.status === 403 ? 403 : 502,
        uncertain ? "unknown" : "failed");
    }
    try { return text ? (await readText(response)).trim() : await readJson(response); }
    catch { deny("provider-response-invalid", provider, 502, outcome); }
  }
  const twBase = (credentials) => "/2010-04-01/Accounts/" + credentials.accountSid;
  async function twAccount(credentials) {
    const data = await request("twilio", credentials, "GET", twBase(credentials) + ".json");
    if (data.sid !== credentials.accountSid || typeof data.status !== "string") {
      deny("provider-account-response-invalid", "twilio", 502);
    }
    if (data.status !== "active") deny("provider-account-inactive", "twilio", 422);
    if (data.type !== "Full") deny("provider-policy-denied", "twilio", 403);
    // REST authentication can accept a secondary token; webhook HMAC uses the
    // primary. Do not infer it from successful auth, a mask or an absent field.
    // Both validated tokens are 32 ASCII bytes; preserve case for this compare.
    if (typeof data.auth_token !== "string" || !/^[0-9a-f]{32}$/i.test(data.auth_token) ||
        !timingSafeEqual(Buffer.from(credentials.authToken, "utf8"), Buffer.from(data.auth_token, "utf8"))) {
      deny("provider-credentials-rejected", "twilio", 401);
    }
    return label(data.friendly_name, "Twilio", [credentials.accountSid, credentials.authToken]);
  }
  async function twSelected(credentials, id) {
    if (!SID.number.test(id ?? "")) deny("invalid-number-id", "twilio");
    const data = await request("twilio", credentials, "GET", twBase(credentials) + "/IncomingPhoneNumbers/" + id + ".json");
    twNumber(data, credentials, id);
    twEligible(data);
    const region = await request("twilio", credentials, "GET", "/v2/PhoneNumbers/" + encodeURIComponent(data.phone_number),
      undefined, false, false, { defaultUs1OnNotFound: true });
    // https://www.twilio.com/docs/global-infrastructure/inbound-processing-api
    // "Check which Region your phone number is routed to": a missing explicit
    // assignment defaults to US1. Ownership/E.164/voice were checked above.
    // Every apply readback repeats this check; JSON 200 must prove its Region.
    if (region !== TWILIO_IMPLICIT_US1) {
      if (region.account_sid !== credentials.accountSid || region.phone_number !== data.phone_number ||
          typeof region.voice_region !== "string") deny("twilio-processing-region-unverified", "twilio", 422);
      if (region.voice_region !== "us1") deny("twilio-processing-region-unsupported", "twilio", 422);
    }
    return data;
  }
  async function telFeatures(credentials, phones) {
    const result = new Map();
    for (let offset = 0; offset < phones.length; offset += 100) {
      const chunk = phones.slice(offset, offset + 100);
      // Documented read-only POST. Do not conflate it with number provisioning.
      const response = await request("telnyx", credentials, "POST", "/numbers_features", { phone_numbers: chunk });
      if (!Array.isArray(response.data)) deny("provider-features-response-invalid", "telnyx", 502);
      for (const data of response.data) {
        if (!record(data) || !chunk.includes(data.phone_number) || result.has(data.phone_number) ||
            !Array.isArray(data.features) || data.features.some((value) => typeof value !== "string")) {
          deny("provider-features-response-invalid", "telnyx", 502);
        }
        result.set(data.phone_number, data.features.includes("voice"));
      }
      if (chunk.some((phone) => !result.has(phone))) deny("provider-features-unverified", "telnyx", 422);
    }
    return result;
  }
  async function telSelected(credentials, id) {
    if (!RESOURCE_ID.test(id ?? "")) deny("invalid-number-id", "telnyx");
    const response = await request("telnyx", credentials, "GET", "/phone_numbers/" + encodeURIComponent(id));
    const data = response.data;
    telNumber(data, id, false, credentials);
    if (data.status !== "active") deny("number-not-active", "telnyx", 422);
    const enabled = (await telFeatures(credentials, [data.phone_number])).get(data.phone_number);
    const voice = (await request("telnyx", credentials, "GET", "/phone_numbers/" + encodeURIComponent(id) + "/voice")).data;
    telEligible(data, voice, enabled);
    return { data, voice, enabled };
  }
  function validatePlan(provider, credentials, plan) {
    const hooks = hooksFor();
    if (!record(plan) || plan.provider !== provider || plan.publicBaseUrl !== origin ||
        plan.credentialScope !== scopeFor(provider, credentials) || !record(plan.number) ||
        !record(plan.priorRouting) || plan.priorRouting.id !== plan.number.id ||
        plan.priorRouting.phoneNumber !== plan.number.phoneNumber ||
        !E164.test(plan.number.phoneNumber ?? "") || !record(plan.priorRouting.voice) ||
        (provider === "twilio" && (!SID.number.test(plan.number.id ?? "") ||
          plan.priorRouting.accountSid !== credentials.accountSid || !record(plan.priorRouting.messaging) ||
          plan.priorRouting.voiceEnabled !== true)) ||
        (provider === "telnyx" && (!RESOURCE_ID.test(plan.number.id ?? "") || plan.priorRouting.status !== "active")) ||
        digest(plan.priorRouting) !== plan.routingFingerprint) deny("invalid-or-unbound-setup-plan", provider, 409);
    return hooks;
  }
  function initialize(provider, credentials, plan, connectionId, existing) {
    if (typeof connectionId !== "string" || !/^[A-Za-z0-9_-]{1,48}$/.test(connectionId)) {
      deny("invalid-connection-id", provider);
    }
    const attemptKey = provider + ":" + plan.credentialScope + ":" + connectionId + ":" + plan.number.id;
    const numberKey = provider + ":" + plan.credentialScope + ":" + plan.number.id;
    if (uncertainNumbers.has(numberKey)) deny("setup-reconciliation-required", provider, 409, "unknown");
    let state = attempts.get(attemptKey) ?? existing?.privateState ?? existing;
    if (state !== undefined && state !== null) {
      if (!record(state) || state.version !== 1 || state.provider !== provider || state.connectionId !== connectionId ||
          state.numberId !== plan.number.id || state.credentialScope !== scopeFor(provider, credentials) ||
          state.routingFingerprint !== plan.routingFingerprint || !record(state.resources) ||
          typeof state.routingApplied !== "boolean" || !Object.hasOwn(state, "pending") || !Object.hasOwn(state, "unknown") ||
          (state.pending !== null && !record(state.pending)) || (state.unknown !== null && !record(state.unknown))) {
        deny("invalid-setup-checkpoint", provider, 409);
      }
      if (state.pending || state.unknown) deny("setup-reconciliation-required", provider, 409, "unknown");
      state = copy(state);
    } else {
      state = { version: 1, provider, connectionId, numberId: plan.number.id,
        credentialScope: plan.credentialScope, routingFingerprint: plan.routingFingerprint,
        resources: {}, routingApplied: false, pending: null, unknown: null };
    }
    attempts.set(attemptKey, state);
    return { state, attemptKey, numberKey };
  }
  function effectRunner(provider, state, persist, scopeKey) {
    async function checkpoint(stage, operation) {
      try { await persist(stage, { operation, privateState: copy(state) }); }
      catch { deny("checkpoint-persistence-failed", provider, 503); }
    }
    async function uncertain(operation, code) {
      state.pending ??= { operation, startedAt: timestamp() };
      state.unknown = { operation, code };
      uncertainNumbers.add(scopeKey);
      try { await checkpoint("unknown", operation); } catch { /* Durable intent already preceded the effect. */ }
    }
    async function effect(operation, send, capture) {
      state.pending = { operation, startedAt: timestamp() };
      state.unknown = null;
      // No remote write if the durable intent cannot be confirmed.
      await checkpoint("before-effect", operation);
      let response;
      try { response = await send(); }
      catch (error) {
        if (!(error instanceof SetupProviderError) || error.unknown) {
          const code = error instanceof SetupProviderError ? error.code : "provider-outcome-unknown";
          await uncertain(operation, code);
          deny(code, provider, 502, "unknown");
        }
        state.pending = null;
        try { await checkpoint("failed", operation); } catch { deny("checkpoint-persistence-failed", provider, 503); }
        throw error;
      }
      try {
        // Capture one-time secrets before doing anything else after a create.
        capture(response);
      } catch {
        await uncertain(operation, "created-or-updated-resource-unverified");
        deny("created-or-updated-resource-unverified", provider, 502, "unknown");
      }
      state.pending = null;
      try { await checkpoint("after-effect", operation); }
      catch {
        await uncertain(operation, "checkpoint-after-effect-unknown");
        deny("checkpoint-after-effect-unknown", provider, 503, "unknown");
      }
    }
    return { checkpoint, effect };
  }
  async function withApply(provider, input, run) {
    if (!record(input) || typeof input.checkpoint !== "function") deny("durable-checkpoint-required", provider, 503);
    const credentials = credentialsFor(provider, input.credentials);
    const hooks = validatePlan(provider, credentials, input.plan);
    const numberKey = provider + ":" + input.plan.credentialScope + ":" + input.plan.number.id;
    if (inFlight.has(numberKey)) deny("setup-apply-in-progress", provider, 409);
    const ctx = initialize(provider, credentials, input.plan, input.connectionId, input.existing);
    inFlight.add(ctx.numberKey);
    const { state } = ctx;
    const { checkpoint, effect } = effectRunner(provider, state, input.checkpoint, ctx.numberKey);
    try {
      const result = await run({ credentials, plan: input.plan, hooks, state, effect,
        connectionId: input.connectionId });
      state.verifiedAt = timestamp();
      await checkpoint("verified", "verify-configuration");
      return result;
    } finally {
      inFlight.delete(ctx.numberKey);
    }
  }
  function publicResult(provider, number, connectionId) {
    return { provider, number, connectionId, status: "configured", verification: "configuration-readback",
      operationsEnabled: false, labCallVerified: false,
      prerequisites: provider === "twilio"
        ? ["owner-reviewed-apply", "operator-number-and-region-eligibility", "https-webhooks-and-browser",
          "separate-bounded-call-authorization"]
        : ["owner-reviewed-apply", "managed-device-credential-issuer", "operator-outbound-policy-verification",
          "operator-public-key-account-verification", "operator-number-and-region-eligibility",
          "https-webhooks-and-browser", "separate-bounded-call-authorization"] };
  }
  const twilio = {
    async inspect(input) {
      const credentials = credentialsFor("twilio", input);
      const accountLabel = await twAccount(credentials);
      const path = twBase(credentials) + "/IncomingPhoneNumbers.json";
      let next = path + "?PageSize=100";
      const seenPages = new Set();
      const ids = new Set();
      const numbers = [];
      while (next) {
        if (seenPages.has(next) || seenPages.size >= MAX_PAGES) deny("provider-pagination-invalid", "twilio", 502);
        seenPages.add(next);
        const page = await request("twilio", credentials, "GET", next);
        if (!Array.isArray(page.incoming_phone_numbers)) deny("provider-number-response-invalid", "twilio", 502);
        for (const data of page.incoming_phone_numbers) {
          const number = twNumber(data, credentials);
          if (ids.has(number.id) || numbers.length >= MAX_NUMBERS) deny("provider-pagination-invalid", "twilio", 502);
          ids.add(number.id);
          numbers.push(number);
        }
        if (page.next_page_uri === null || page.next_page_uri === "") next = null;
        else {
          if (typeof page.next_page_uri !== "string") deny("provider-pagination-invalid", "twilio", 502);
          let url;
          try { url = new URL(page.next_page_uri, TWILIO); } catch { deny("provider-pagination-invalid", "twilio", 502); }
          if (url.origin !== TWILIO || url.pathname !== path || url.username || url.password || url.hash) {
            deny("provider-pagination-invalid", "twilio", 502);
          }
          next = url.pathname + url.search;
        }
      }
      return { accountLabel, numbers };
    },
    async plan(input, numberId) {
      const credentials = credentialsFor("twilio", input);
      const hooks = hooksFor();
      await twAccount(credentials);
      const data = await twSelected(credentials, numberId);
      const number = twNumber(data, credentials, numberId);
      const priorRouting = twRouting(data);
      const changed = digest(priorRouting) !== digest(twTarget(priorRouting, hooks));
      return { provider: "twilio", publicBaseUrl: origin, credentialScope: scopeFor("twilio", credentials),
        number, routingFingerprint: digest(priorRouting), priorRouting,
        steps: [
          { id: "account", label: "Verify active account, owned voice number and US1 inbound processing region", kind: "verify" },
          { id: "standard-key", label: "Create an internally owned Standard API key; store its one-time secret", kind: "create" },
          ...(nonempty(data.voice_application_sid) ? [{ id: "application-precedence",
            label: "Clear VoiceApplicationSid; the existing Application overrides VoiceUrl", kind: "update" }] : []),
          ...(nonempty(data.voice_fallback_url) ? [{ id: "voice-fallback",
            label: "Clear the existing voice fallback URL to avoid inheriting an external route", kind: "update" }] : []),
          { id: "number-routing", label: "Set fixed inbound/status HTTPS URLs using POST; preserve SMS settings",
            kind: changed ? "update" : "reuse" },
          { id: "readback", label: "Re-read API key ownership, routing and preserved messaging configuration", kind: "verify" },
        ], willReplaceRouting: changed && number.hasExistingRouting };
    },
    async apply(input) {
      return withApply("twilio", input, async ({ credentials, plan, hooks, state, effect, connectionId }) => {
        await twAccount(credentials);
        let data = await twSelected(credentials, plan.number.id);
        if (state.routingApplied) assertTwRouting(data, credentials, plan, hooks);
        else if (digest(twRouting(data)) !== plan.routingFingerprint) deny("routing-drift", "twilio", 409);
        const name = "aureform:" + connectionId + ":key";
        if (!state.resources.apiKey) {
          if (state.routingApplied) deny("invalid-setup-checkpoint", "twilio", 409);
          await effect("create-standard-key",
            async () => {
              // Recheck after the durable intent: awaiting storage can race a
              // token rotation or account-policy change. Never write on failure.
              await twAccount(credentials);
              return request("twilio", credentials, "POST", twBase(credentials) + "/Keys.json", { FriendlyName: name }, true);
            },
            (created) => {
              state.resources.apiKey = { sid: typeof created.sid === "string" ? created.sid : null,
                secret: typeof created.secret === "string" ? created.secret : null, name };
              if (typeof created.sid !== "string" || !SID.key.test(created.sid) || typeof created.secret !== "string" ||
                  created.secret.length < 16 || created.secret.length > 512 || /[\s\u0000-\u001f]/.test(created.secret) ||
                  (created.friendly_name !== undefined && created.friendly_name !== name)) throw new Error();
            });
        }
        const key = state.resources.apiKey;
        if (!record(key) || !SID.key.test(key.sid ?? "") || !nonempty(key.secret) || key.name !== name) {
          deny("invalid-setup-checkpoint", "twilio", 409);
        }
        const readKey = await request("twilio", credentials, "GET", twBase(credentials) + "/Keys/" + key.sid + ".json");
        if (readKey.sid !== key.sid || readKey.friendly_name !== name) deny("owned-api-key-verification-failed", "twilio", 409);
        if (!state.routingApplied) {
          // Re-check immediately before the routing write; no provider CAS is assumed.
          data = await twSelected(credentials, plan.number.id);
          if (digest(twRouting(data)) !== plan.routingFingerprint) deny("routing-drift", "twilio", 409);
          if (digest(twRouting(data)) !== digest(twTarget(plan.priorRouting, hooks))) {
            await effect("update-number-routing",
              async () => {
                await twAccount(credentials);
                return request("twilio", credentials, "POST",
                  twBase(credentials) + "/IncomingPhoneNumbers/" + plan.number.id + ".json", {
                    VoiceUrl: hooks.twilioInbound, VoiceMethod: "POST",
                    StatusCallback: hooks.twilioStatus, StatusCallbackMethod: "POST",
                    VoiceApplicationSid: "", VoiceFallbackUrl: "",
                  }, true);
              },
              (updated) => {
                state.resources.numberUpdate = { id: updated.sid ?? null };
                assertTwRouting(updated, credentials, plan, hooks);
                state.routingApplied = true;
              });
          }
        }
        data = await twSelected(credentials, plan.number.id);
        assertTwRouting(data, credentials, plan, hooks);
        // A late rotation/downgrade must not return a usable configuration.
        // Already confirmed effects and one-time secrets remain checkpointed.
        await twAccount(credentials);
        const number = twNumber(data, credentials, plan.number.id, [key.sid, key.secret]);
        return { provider: "twilio", number, accountSid: credentials.accountSid, authToken: credentials.authToken,
          apiKeySid: key.sid, apiKeySecret: key.secret, publicResult: publicResult("twilio", number, connectionId) };
      });
    },
  };
  const telnyx = {
    async inspect(input) {
      const credentials = credentialsFor("telnyx", input);
      const raw = [];
      const ids = new Set();
      let page = 1;
      while (true) {
        const response = await request("telnyx", credentials, "GET", "/phone_numbers?page[number]=" + page + "&page[size]=100");
        if (!Array.isArray(response.data) || !record(response.meta) ||
            !Number.isSafeInteger(response.meta.total_pages) || response.meta.total_pages < 0 ||
            response.meta.total_pages > MAX_PAGES || response.meta.page_number !== page) {
          deny("provider-pagination-invalid", "telnyx", 502);
        }
        for (const data of response.data) {
          telNumber(data, null, false, credentials);
          if (ids.has(data.id) || raw.length >= MAX_NUMBERS) deny("provider-pagination-invalid", "telnyx", 502);
          ids.add(data.id);
          raw.push(data);
        }
        if (page >= response.meta.total_pages) break;
        if (!response.data.length || page >= MAX_PAGES) deny("provider-pagination-invalid", "telnyx", 502);
        page++;
      }
      const phones = raw.filter((number) => number.status === "active").map((number) => number.phone_number);
      if (new Set(phones).size !== phones.length) deny("provider-number-response-invalid", "telnyx", 502);
      const features = await telFeatures(credentials, phones);
      const numbers = raw.map((data) => telNumber(data, data.id, features.get(data.phone_number) === true, credentials));
      return { accountLabel: "Telnyx (API-key scope)", numbers };
    },
    async plan(input, numberId) {
      const credentials = credentialsFor("telnyx", input);
      hooksFor();
      const { data, voice, enabled } = await telSelected(credentials, numberId);
      const number = telNumber(data, numberId, enabled, credentials);
      const priorRouting = telRouting(data, voice);
      return { provider: "telnyx", publicBaseUrl: origin, credentialScope: scopeFor("telnyx", credentials),
        number, routingFingerprint: digest(priorRouting), priorRouting,
        steps: [
          { id: "number", label: "Verify active owned number, voice feature and compatible voice settings", kind: "verify" },
          { id: "call-control-app", label: "Create an owned Call Control Application with the fixed v2 webhook", kind: "create" },
          { id: "credential-connection", label: "Create a separate owned internal SIP credential connection; no outbound profile", kind: "create" },
          { id: "sip-policy", label: "Require explicit no-profile readback; omission is not outbound policy proof", kind: "verify" },
          { id: "number-routing", label: "Attach only this number to the application; preserve messaging and voice settings", kind: "update" },
          { id: "readback", label: "Re-read both owned resources and the selected number; real calls remain disabled", kind: "verify" },
        ], willReplaceRouting: number.hasExistingRouting };
    },
    async apply(input) {
      return withApply("telnyx", input, async ({ credentials, plan, hooks, state, effect, connectionId }) => {
        let selected = await telSelected(credentials, plan.number.id);
        if (state.routingApplied) {
          if (!state.resources.application?.id) deny("invalid-setup-checkpoint", "telnyx", 409);
          assertTelRouting(selected.data, selected.voice, selected.enabled, credentials, plan, state.resources.application.id);
        } else if (digest(telRouting(selected.data, selected.voice)) !== plan.routingFingerprint) deny("routing-drift", "telnyx", 409);
        const appName = "aureform:" + connectionId + ":call-control";
        if (!state.resources.application) {
          if (state.routingApplied) deny("invalid-setup-checkpoint", "telnyx", 409);
          await effect("create-call-control-application",
            () => request("telnyx", credentials, "POST", "/call_control_applications", {
              application_name: appName, webhook_event_url: hooks.telnyx, webhook_api_version: "2", active: true,
            }, true),
            ({ data }) => {
              state.resources.application = { id: typeof data?.id === "string" ? data.id : null, name: appName };
              if (typeof data?.id !== "string" || !RESOURCE_ID.test(data.id) ||
                  (data.application_name !== undefined && data.application_name !== appName)) throw new Error();
            });
        }
        const app = state.resources.application;
        if (!record(app) || !RESOURCE_ID.test(app.id ?? "") || app.name !== appName) deny("invalid-setup-checkpoint", "telnyx", 409);
        appOwned((await request("telnyx", credentials, "GET", "/call_control_applications/" + app.id)).data,
          app.id, appName, hooks.telnyx);
        const connectionName = "aureform:" + connectionId + ":browser";
        if (!state.resources.credentialConnection) {
          if (state.routingApplied) deny("invalid-setup-checkpoint", "telnyx", 409);
          const seed = state.resources.credentialConnectionSeed ?? {
            name: connectionName, userName: "af" + randomBytes(12).toString("hex"),
            password: "Aa1" + randomBytes(24).toString("base64url"),
          };
          if (seed.name !== connectionName || !/^[A-Za-z0-9]{4,32}$/.test(seed.userName ?? "") ||
              typeof seed.password !== "string" || seed.password.length < 8 || seed.password.length > 128) {
            deny("invalid-setup-checkpoint", "telnyx", 409);
          }
          state.resources.credentialConnectionSeed = seed;
          await effect("create-credential-connection",
            () => request("telnyx", credentials, "POST", "/credential_connections", {
              connection_name: seed.name, user_name: seed.userName, password: seed.password,
              active: true, sip_uri_calling_preference: "internal", webhook_api_version: "2",
              // No outbound object/profile and no call parking.
            }, true),
            ({ data }) => {
              state.resources.credentialConnection = { id: typeof data?.id === "string" ? data.id : null,
                name: seed.name, userName: seed.userName };
              if (typeof data?.id !== "string" || !RESOURCE_ID.test(data.id) || data.id === app.id ||
                  (data.connection_name !== undefined && data.connection_name !== seed.name) ||
                  (data.user_name !== undefined && data.user_name !== seed.userName)) throw new Error();
            });
        }
        const connection = state.resources.credentialConnection;
        const seed = state.resources.credentialConnectionSeed;
        if (!record(connection) || !RESOURCE_ID.test(connection.id ?? "") || connection.id === app.id ||
            connection.name !== connectionName || !record(seed) || seed.name !== connectionName ||
            connection.userName !== seed.userName) deny("invalid-setup-checkpoint", "telnyx", 409);
        const verifyResources = async () => {
          appOwned((await request("telnyx", credentials, "GET", "/call_control_applications/" + app.id)).data,
            app.id, appName, hooks.telnyx);
          connectionOwned((await request("telnyx", credentials, "GET", "/credential_connections/" + connection.id)).data,
            connection.id, seed);
        };
        await verifyResources();
        if (!state.routingApplied) {
          selected = await telSelected(credentials, plan.number.id);
          if (digest(telRouting(selected.data, selected.voice)) !== plan.routingFingerprint) deny("routing-drift", "telnyx", 409);
          await effect("update-number-routing",
            () => request("telnyx", credentials, "PATCH", "/phone_numbers/" + plan.number.id,
              { connection_id: app.id }, true),
            ({ data }) => {
              state.resources.numberUpdate = { id: data?.id ?? null, connectionId: data?.connection_id ?? null };
              telNumber(data, plan.number.id, true, credentials);
              if (data.connection_id !== app.id || data.phone_number !== plan.number.phoneNumber ||
                  data.status !== "active" || nullable(data.messaging_profile_id) !== plan.priorRouting.messagingProfileId) {
                throw new Error();
              }
              state.routingApplied = true;
            });
        }
        selected = await telSelected(credentials, plan.number.id);
        assertTelRouting(selected.data, selected.voice, selected.enabled, credentials, plan, app.id);
        await verifyResources();
        const number = telNumber(selected.data, plan.number.id, selected.enabled, credentials, [seed.password]);
        return { provider: "telnyx", number, apiKey: credentials.apiKey, publicKey: credentials.publicKey,
          applicationId: app.id, credentialConnectionId: connection.id,
          publicResult: publicResult("telnyx", number, connectionId) };
      });
    },
    /**
     * PRIVATE managed issuer. agentId/deviceId is supplied by the authenticated
     * server, not a client-selected SIP identity. agentId alone represents the
     * reference's single authorized device for that agent. Separate concurrent
     * devices MUST use separate deviceId values and server ownership binding.
     * Default 300s, maximum 300s; no outgoing profile/URL/destination parameter.
     * Requires the same durable checkpoint discipline as apply.
     */
    async createBrowserCredential(input) {
      const allowed = ["connectionId", "credentials", "credentialConnectionId", "agentId", "deviceId",
        "seconds", "checkpoint", "existing"];
      if (!record(input) || Object.keys(input).some((key) => !allowed.includes(key))) {
        deny("invalid-browser-credential-request", "telnyx");
      }
      if (typeof input.checkpoint !== "function") deny("durable-checkpoint-required", "telnyx", 503);
      const credentials = credentialsFor("telnyx", input.credentials);
      hooksFor(); // Fixed configured HTTPS origin; no caller-supplied endpoints.
      const deviceId = input.deviceId ?? input.agentId;
      const seconds = input.seconds ?? 300;
      if (typeof input.connectionId !== "string" || !/^[A-Za-z0-9_-]{1,48}$/.test(input.connectionId) ||
          typeof input.credentialConnectionId !== "string" || !RESOURCE_ID.test(input.credentialConnectionId) ||
          typeof deviceId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(deviceId) ||
          (input.agentId !== undefined && (typeof input.agentId !== "string" || !RESOURCE_ID.test(input.agentId))) ||
          !Number.isSafeInteger(seconds) || seconds < 60 || seconds > 300) {
        deny("invalid-browser-credential-request", "telnyx");
      }
      const scope = scopeFor("telnyx", credentials);
      const key = "browser:telnyx:" + scope + ":" + input.connectionId + ":" + input.credentialConnectionId + ":" + deviceId;
      if (inFlight.has(key)) deny("setup-apply-in-progress", "telnyx", 409);
      if (uncertainNumbers.has(key)) deny("setup-reconciliation-required", "telnyx", 409, "unknown");
      let state = attempts.get(key) ?? input.existing?.privateState ?? input.existing;
      if (state !== undefined && state !== null) {
        if (!record(state) || state.version !== 1 || state.kind !== "browser-credential" || state.provider !== "telnyx" ||
            state.connectionId !== input.connectionId || state.credentialConnectionId !== input.credentialConnectionId ||
            state.deviceId !== deviceId || state.seconds !== seconds || state.credentialScope !== scope ||
            state.publicBaseUrl !== origin || !record(state.resources) || typeof state.requestedExpiresAt !== "string" ||
            (state.pending !== null && !record(state.pending)) || (state.unknown !== null && !record(state.unknown))) {
          deny("invalid-setup-checkpoint", "telnyx", 409);
        }
        if (state.pending || state.unknown) deny("setup-reconciliation-required", "telnyx", 409, "unknown");
        state = copy(state);
        // Known expired credentials cannot be renewed. A fresh explicit issuance
        // may create a new parent; unknown creations remain blocked even expired.
        if (Date.parse(state.requestedExpiresAt) <= now() && input.existing === undefined) state = undefined;
      }
      if (!state) state = {
        version: 1, kind: "browser-credential", provider: "telnyx", connectionId: input.connectionId,
        credentialConnectionId: input.credentialConnectionId, deviceId, seconds, credentialScope: scope,
        publicBaseUrl: origin, requestedExpiresAt: new Date(Date.parse(timestamp()) + seconds * 1000).toISOString(),
        resources: {}, pending: null, unknown: null,
      };
      const expiry = Date.parse(state.requestedExpiresAt);
      if (!Number.isFinite(expiry) || expiry <= now() + 30000 || expiry > now() + seconds * 1000) {
        deny("browser-credential-expired-or-unbounded", "telnyx", 422);
      }
      attempts.set(key, state);
      inFlight.add(key);
      const runner = effectRunner("telnyx", state, input.checkpoint, key);
      const connectionName = "aureform:" + input.connectionId + ":browser";
      const name = "aureform:" + input.connectionId + ":device:" + digest(deviceId).slice(0, 12);
      async function verifyConnection() {
        const data = (await request("telnyx", credentials, "GET", "/credential_connections/" + input.credentialConnectionId)).data;
        if (!record(data) || typeof data.user_name !== "string" || !/^[A-Za-z0-9]{4,32}$/.test(data.user_name)) {
          deny("owned-credential-connection-verification-failed", "telnyx", 409);
        }
        connectionOwned(data, input.credentialConnectionId, { name: connectionName, userName: data.user_name });
      }
      function verifyCredential(data, id) {
        const expires = Date.parse(data?.expires_at);
        if (!record(data) || typeof data.id !== "string" || !RESOURCE_ID.test(data.id) || (id && data.id !== id) ||
            data.resource_id !== "connection:" + input.credentialConnectionId || data.name !== name ||
            typeof data.sip_username !== "string" || !/^gencred[A-Za-z0-9_-]{1,120}$/.test(data.sip_username) ||
            data.expired === true || !Number.isFinite(expires) || expires <= now() + 30000 || expires > expiry) {
          deny("browser-credential-verification-failed", "telnyx", 422);
        }
        return { id: data.id, sipUsername: data.sip_username, expiresAt: new Date(expires).toISOString() };
      }
      function tokenExpiry(token, credential) {
        let payload;
        try {
          if (typeof token !== "string" || token.length > 16384 ||
              !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new Error();
          payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
        } catch { deny("provider-token-response-invalid", "telnyx", 502); }
        const parentExpiry = Date.parse(credential.expiresAt);
        if (!Number.isSafeInteger(payload?.exp) || payload.exp * 1000 <= now() + 30000 ||
            payload.exp * 1000 > parentExpiry || payload.exp * 1000 > expiry) {
          deny("provider-token-ttl-unbounded", "telnyx", 502);
        }
        // TLS-authenticated issuer response; SDK registration/crypto acceptance
        // is a later proof. Decoding exp does not certify an incoming-only JWT.
        return new Date(payload.exp * 1000).toISOString();
      }
      try {
        await verifyConnection();
        if (!state.resources.credential) {
          await runner.effect("create-browser-telephony-credential",
            () => request("telnyx", credentials, "POST", "/telephony_credentials", {
              connection_id: input.credentialConnectionId, expires_at: state.requestedExpiresAt, name,
            }, true),
            ({ data }) => {
              state.resources.credential = {
                id: typeof data?.id === "string" ? data.id : null,
                sipUsername: typeof data?.sip_username === "string" ? data.sip_username : null,
                expiresAt: typeof data?.expires_at === "string" ? data.expires_at : null,
              };
              state.resources.credential = verifyCredential(data);
            });
        }
        const credential = state.resources.credential;
        if (!record(credential) || typeof credential.id !== "string" || !RESOURCE_ID.test(credential.id)) {
          deny("invalid-setup-checkpoint", "telnyx", 409);
        }
        const readCredential = async () => {
          const data = (await request("telnyx", credentials, "GET", "/telephony_credentials/" + credential.id)).data;
          const actual = verifyCredential(data, credential.id);
          if (actual.sipUsername !== credential.sipUsername || actual.expiresAt !== credential.expiresAt) {
            deny("browser-credential-verification-failed", "telnyx", 422);
          }
        };
        await readCredential();
        await verifyConnection();
        if (!state.resources.token) {
          await runner.effect("create-browser-token",
            () => request("telnyx", credentials, "POST", "/telephony_credentials/" + credential.id + "/token",
              undefined, true, true),
            (token) => {
              state.resources.token = { token, expiresAt: null };
              state.resources.token.expiresAt = tokenExpiry(token, credential);
            });
        }
        try { await wait(5000); }
        catch { deny("credential-propagation-wait-failed", "telnyx", 503); }
        // A console policy change while minting/waiting must not return a token.
        await verifyConnection();
        await readCredential();
        const expiresAt = tokenExpiry(state.resources.token.token, credential);
        state.verifiedAt = timestamp();
        await runner.checkpoint("verified", "verify-browser-credential");
        return { credentialId: credential.id, sipUsername: credential.sipUsername,
          token: state.resources.token.token, expiresAt };
      } finally { inFlight.delete(key); }
    },
  };
  return { twilio, telnyx };
}
