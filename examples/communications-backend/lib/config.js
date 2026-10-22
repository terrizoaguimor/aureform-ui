// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from "node:fs";

export class ReferenceError extends Error {
  constructor(code, status = 400, message = code) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export const fail = (code, status = 400) => { throw new ReferenceError(code, status); };
export const isRecord = (v) => !!v && typeof v === "object" && !Array.isArray(v);
export function onlyKeys(value, allowed) {
  if (!isRecord(value) || Object.keys(value).some((key) => !allowed.includes(key))) fail("invalid-body");
}
export function boundedString(value, limit, pattern) {
  if (typeof value !== "string" || !value.length || value.length > limit || (pattern && !pattern.test(value))) fail("invalid-argument");
  return value;
}
export const E164 = /^\+[1-9]\d{7,14}$/;
export const ID = /^[A-Za-z0-9_-]{1,80}$/;
export const PROVIDERS = ["twilio", "telnyx"];
const hm = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
export const minute = (text) => text === "24:00" ? 1440 : Number(text.slice(0, 2)) * 60 + Number(text.slice(3));

export function validateSchedule(schedule) {
  onlyKeys(schedule, ["timezone", "weekly", "holidays"]);
  boundedString(schedule.timezone, 100);
  try { new Intl.DateTimeFormat("en-US", { timeZone: schedule.timezone }).format(); } catch { fail("invalid-timezone"); }
  if (!Array.isArray(schedule.weekly) || schedule.weekly.length > 28 || !Array.isArray(schedule.holidays) || schedule.holidays.length > 366) fail("invalid-schedule");
  for (const item of schedule.weekly) {
    onlyKeys(item, ["day", "start", "end"]);
    if (!Number.isInteger(item.day) || item.day < 0 || item.day > 6 || !hm.test(item.start) || !(hm.test(item.end) || item.end === "24:00") || item.start === item.end) fail("invalid-schedule");
  }
  for (const item of schedule.holidays) {
    onlyKeys(item, ["date", "label"]);
    if (typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || new Date(item.date + "T00:00:00Z").toISOString().slice(0, 10) !== item.date) fail("invalid-holiday");
    if (item.label !== undefined && (typeof item.label !== "string" || item.label.length > 100)) fail("invalid-holiday");
  }
  return structuredClone(schedule);
}

export function evaluateHours(schedule, epoch) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: schedule.timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(epoch)).map((p) => [p.type, p.value]));
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;
  const localTime = `${parts.hour}:${parts.minute}`;
  const weekday = new Date(localDate + "T12:00:00Z").getUTCDay();
  if (schedule.holidays.some((h) => h.date === localDate)) return { isOpen: false, reason: "holiday", localDate, localTime, weekday };
  const minutes = minute(localTime);
  const previous = (weekday + 6) % 7;
  const previousDate = new Date(new Date(localDate + "T12:00:00Z").getTime() - 86400000).toISOString().slice(0, 10);
  const isOpen = schedule.weekly.some((period) => {
    const start = minute(period.start), end = minute(period.end);
    if (end > start) return period.day === weekday && minutes >= start && minutes < end;
    return (period.day === weekday && minutes >= start) ||
      (period.day === previous && minutes < end && !schedule.holidays.some((h) => h.date === previousDate));
  });
  return { isOpen, reason: isOpen ? "open" : "closed", localDate, localTime, weekday };
}

export function validateConfig(input, env = {}) {
  if (!isRecord(input)) fail("invalid-config");
  const config = structuredClone(input);
  config.tenantId = boundedString(config.tenantId, 80, ID);
  config.schedule = validateSchedule(config.schedule);
  if (!Array.isArray(config.origins) || !Array.isArray(config.agents) || config.agents.length > 2) fail("invalid-config");
  config.origins = config.origins.map((origin) => {
    let url;
    try { url = new URL(origin); } catch { fail("invalid-origin"); }
    if (url.origin !== origin || !(url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) fail("invalid-origin");
    return origin;
  });
  for (const [key, fallback, min, max] of [
    ["maxQueueSize", 8, 1, 32], ["maxWaitSeconds", 120, 5, 300],
    ["ringSeconds", 20, 5, 30], ["heartbeatSeconds", 45, 15, 60],
    ["sessionSeconds", 600, 60, 600], ["carrierTokenSeconds", 300, 60, 600],
  ]) {
    config[key] ??= fallback;
    if (!Number.isInteger(config[key]) || config[key] < min || config[key] > max) fail("invalid-config");
  }
  config.closedMessage ??= "Our office is closed. Please call again during business hours.";
  config.waitMessage ??= "Please wait for the next available agent.";
  for (const text of [config.closedMessage, config.waitMessage]) boundedString(text, 500);
  config.providers ??= {};
  for (const provider of Object.keys(config.providers)) {
    if (!PROVIDERS.includes(provider)) fail("invalid-provider");
    if (!E164.test(config.providers[provider].inboundNumber)) fail("invalid-config-number");
    if (provider === "telnyx") {
      boundedString(config.providers[provider].applicationId, 120, ID);
      boundedString(config.providers[provider].credentialConnectionId, 120, ID);
    }
  }
  const identities = new Set();
  for (const agent of config.agents) {
    boundedString(agent.id, 80, ID);
    if (identities.has(agent.id)) fail("duplicate-agent");
    identities.add(agent.id);
    if (!Array.isArray(agent.providers) || !agent.providers.length || agent.providers.some((p) => !PROVIDERS.includes(p) || !config.providers[p])) fail("invalid-agent-provider");
    agent.bootstrapHash = env[agent.bootstrapHashEnv] ?? "";
    if (agent.bootstrapHash && !/^[0-9a-f]{64}$/i.test(agent.bootstrapHash)) fail("invalid-auth-hash");
    if (agent.providers.includes("twilio")) boundedString(agent.twilioIdentity, 80, /^[A-Za-z0-9_]+$/);
    if (agent.providers.includes("telnyx")) {
      if (agent.managedTelnyxCredentials !== true) {
        boundedString(agent.telnyxCredentialId, 120, ID);
        boundedString(agent.telnyxSipUsername, 120, /^gencred[A-Za-z0-9_-]+$/);
      }
    }
  }
  config.approvals ??= [];
  if (!Array.isArray(config.approvals) || config.approvals.length > 32) fail("invalid-approvals");
  const approvalIds = new Set();
  for (const rule of config.approvals) {
    onlyKeys(rule, ["id", "provider", "to", "from", "expiresAt", "maxCalls", "maxSeconds", "maxBrowserLegs", "maxActions", "consentScope", "pstnCallId"]);
    boundedString(rule.id, 80, ID);
    if (approvalIds.has(rule.id)) fail("duplicate-approval");
    approvalIds.add(rule.id);
    if (!config.providers[rule.provider] || rule.to !== config.providers[rule.provider].inboundNumber || !E164.test(rule.from) || !Number.isFinite(Date.parse(rule.expiresAt))) fail("invalid-approval");
    if (rule.maxCalls !== 1 || rule.maxBrowserLegs !== 1 || !Number.isInteger(rule.maxSeconds) || rule.maxSeconds < 30 || rule.maxSeconds > 300 || !Number.isInteger(rule.maxActions) || rule.maxActions < 2 || rule.maxActions > 12 || rule.consentScope !== "inbound-lab-single-call") fail("unbounded-approval");
    if (rule.pstnCallId !== undefined) boundedString(rule.pstnCallId, 512, /^[A-Za-z0-9_+=:/.-]+$/);
  }
  config.operationsEnabled = env.ENABLE_CARRIER_OPERATIONS === "true";
  config.publicBaseUrl = env.PUBLIC_BASE_URL ?? "";
  if (config.publicBaseUrl) {
    let url;
    try { url = new URL(config.publicBaseUrl); } catch { fail("invalid-public-url"); }
    if (url.protocol !== "https:" || url.origin !== config.publicBaseUrl || url.username || url.password) fail("invalid-public-url");
  }
  if (config.operationsEnabled && !config.publicBaseUrl) fail("public-url-not-configured");
  return config;
}

export function loadConfig(env = process.env) {
  const disabled = {
    tenantId: "disabled", origins: [], agents: [], providers: {}, approvals: [],
    schedule: { timezone: "UTC", weekly: [], holidays: [] },
  };
  const input = env.LAB_CONFIG_FILE ? JSON.parse(readFileSync(env.LAB_CONFIG_FILE, "utf8")) : disabled;
  return validateConfig(input, env);
}
