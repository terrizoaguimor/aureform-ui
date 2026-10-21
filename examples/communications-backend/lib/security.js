// SPDX-License-Identifier: Apache-2.0
import { createHash, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto";
import { TextDecoder } from "node:util";
import twilio from "twilio";
import { fail, ReferenceError } from "./config.js";

export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export function canonicalJson(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key])).join(",") + "}";
  return JSON.stringify(value);
}
export const opaque = () => randomBytes(32).toString("base64url");
export const constantEqual = (left, right) => {
  const a = Buffer.from(left), b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};
export function bearer(header) {
  if (typeof header !== "string" || !/^Bearer [A-Za-z0-9_-]{32,256}$/.test(header)) fail("unauthorized", 401);
  return header.slice(7);
}
export function utf8(raw) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(raw); } catch { fail("invalid-utf8"); }
}
export async function readBody(request, maxBytes = 65536) {
  const declared = request.headers["content-length"];
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) fail("body-too-large", 413);
  if (request.headers["content-encoding"] && request.headers["content-encoding"] !== "identity") fail("unsupported-content-encoding", 415);
  let size = 0;
  const parts = [];
  for await (const part of request) {
    size += part.length;
    if (size > maxBytes) throw new ReferenceError("body-too-large", 413);
    parts.push(part);
  }
  return Buffer.concat(parts);
}
export function parseForm(raw) {
  const form = Object.create(null);
  const params = new URLSearchParams(utf8(raw));
  if ([...params].length > 256) fail("too-many-form-fields");
  for (const key of new Set(params.keys())) {
    if (key.length > 200) fail("invalid-form");
    const values = params.getAll(key);
    form[key] = values.length === 1 ? values[0] : values;
  }
  return form;
}
export function verifyTwilioWebhook(raw, signature, externalUrl, authToken) {
  if (!authToken || typeof signature !== "string") fail("invalid-webhook-signature", 403);
  const form = parseForm(raw);
  // Official helper covers all parameters, including future fields/multivalues.
  if (!twilio.validateRequest(authToken, signature, externalUrl, form)) fail("invalid-webhook-signature", 403);
  return form;
}
export function verifyTelnyxWebhook(raw, signature, timestamp, publicKey, now, tolerance = 300) {
  if (typeof timestamp !== "string" || !/^\d{1,12}$/.test(timestamp)) fail("invalid-webhook-timestamp", 403);
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(now / 1000 - seconds) > tolerance) fail("stale-webhook-timestamp", 403);
  if (typeof signature !== "string" || typeof publicKey !== "string") fail("invalid-webhook-signature", 403);
  let keyBytes, signedBytes;
  try {
    keyBytes = Buffer.from(publicKey, "base64");
    signedBytes = Buffer.from(signature, "base64");
    if (keyBytes.length !== 32 || signedBytes.length !== 64 || keyBytes.toString("base64") !== publicKey || signedBytes.toString("base64") !== signature) fail("invalid-webhook-signature", 403);
    const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), keyBytes]), format: "der", type: "spki" });
    if (!verify(null, Buffer.concat([Buffer.from(timestamp + "|", "ascii"), raw]), key, signedBytes)) fail("invalid-webhook-signature", 403);
  } catch { fail("invalid-webhook-signature", 403); }
  return utf8(raw);
}

export class SessionAuth {
  constructor(config, now = Date.now) {
    this.config = config;
    this.now = now;
    this.sessions = new Map();
  }
  origin(value) {
    if (typeof value !== "string" || !this.config.origins.includes(value)) fail("origin-denied", 403);
    return value;
  }
  bootstrap(header, origin) {
    this.origin(origin);
    const hash = sha256(bearer(header));
    const principal = this.config.agents.find((a) => a.bootstrapHash && constantEqual(a.bootstrapHash, hash));
    if (!principal) fail("unauthorized", 401);
    return principal;
  }
  get(header, origin) {
    this.origin(origin);
    const hash = sha256(bearer(header));
    const session = this.sessions.get(hash);
    if (!session || session.expires <= this.now() || session.origin !== origin) fail("session-expired", 401);
    return session;
  }
  issue(principal, provider, origin, previous) {
    if (!principal.providers.includes(provider)) fail("provider-denied", 403);
    const token = opaque();
    const session = {
      id: previous?.id ?? opaque(), principal, provider, origin,
      expires: this.now() + this.config.sessionSeconds * 1000,
      tokenHash: sha256(token),
    };
    if (previous) this.sessions.delete(previous.tokenHash);
    for (const [hash, value] of this.sessions) {
      if (value.expires <= this.now() || value.principal.id === principal.id) this.sessions.delete(hash);
    }
    if (this.sessions.size >= 16) fail("too-many-sessions", 429);
    this.sessions.set(session.tokenHash, session);
    return { session, token };
  }
}
