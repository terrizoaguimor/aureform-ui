import { z } from "zod";
import {
  CommunicationsError,
  type CommunicationsAdapter,
  type CommunicationsPresence,
  type CommunicationsProvider,
  type CommunicationsSnapshot,
} from "./contracts";

/**
 * Consumer-only binding for aureform.inbound-voice.v1, reviewed 2026-10-21.
 * baseUrl is the authenticated reference mount, e.g. /v1/communications.
 * Nothing connects, loads a carrier SDK or requests microphone access on import
 * or construction. The consumer supplies a separately installed SDK factory.
 */
export const communicationsWireVersion = "aureform.inbound-voice.v1";

const identifier = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[\w.:@+-]+$/);
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((v) => !v.includes("\0"));
const providerSchema = z.enum(["twilio", "telnyx"]);
const permissionSchema = z.enum([
  "unknown",
  "granted",
  "denied",
  "unavailable",
]);
const epoch = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const isoDate = z.iso.datetime({ offset: true });
const weekday = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
const callSchema = z
  .object({
    id: identifier,
    provider: providerSchema,
    providerCallId: text(512).optional(),
    direction: z.enum(["inbound", "outbound"]),
    from: text(256),
    to: text(256),
    callerName: text(256),
    company: text(256).optional(),
    avatar: text(2048).optional(),
    status: z.enum([
      "queued",
      "ringing",
      "connecting",
      "active",
      "held",
      "completed",
      "missed",
      "failed",
    ]),
    queuedAt: epoch,
    startedAt: epoch.optional(),
    answeredAt: epoch.optional(),
    endedAt: epoch.optional(),
    muted: z.boolean(),
    notes: text(2000),
    disposition: text(256).optional(),
    endReason: z
      .enum([
        "agent-hangup",
        "declined",
        "ring-timeout",
        "after-hours",
        "holiday",
        "queue-overflow",
        "cancelled-before-answer",
      ])
      .optional(),
    dtmfDigits: z
      .string()
      .max(128)
      .regex(/^[0-9*#]*$/)
      .optional(),
  })
  .strict();

export const communicationsLiveSnapshotSchema = z
  .object({
    mode: z.literal("live"),
    provider: providerSchema,
    connection: z.enum([
      "disconnected",
      "connecting",
      "ready",
      "reconnecting",
      "error",
    ]),
    presence: z.enum(["available", "away", "offline"]),
    activeCall: callSchema.nullable(),
    queue: z.array(callSchema).max(128),
    history: z.array(callSchema).max(128),
    error: text(512).nullable(),
    businessHours: z
      .object({
        timezone: text(100)
          .min(1)
          .refine((value) => {
            try {
              new Intl.DateTimeFormat("en", { timeZone: value });
              return true;
            } catch {
              return false;
            }
          }),
        weekly: z
          .array(
            z
              .object({
                day: weekday,
                start: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
                end: z.string().regex(/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/),
              })
              .strict(),
          )
          .max(64),
        holidays: z
          .array(
            z
              .object({
                date: z.iso.date(),
                label: text(256).optional(),
              })
              .strict(),
          )
          .max(366),
      })
      .strict(),
    businessHoursOpen: z.boolean(),
    caps: z
      .object({ hold: z.boolean(), mute: z.boolean(), dtmf: z.boolean() })
      .strict()
      .optional(),
    events: z
      .array(
        z
          .object({
            id: identifier,
            callId: identifier.optional(),
            type: text(100).min(1),
            at: epoch,
            source: z.enum(["demo", "backend", "sdk"]),
            detail: text(512).optional(),
          })
          .strict(),
      )
      .max(100)
      .optional(),
    audio: z
      .object({
        microphonePermission: permissionSchema,
        inputDeviceId: text(256).optional(),
        outputDeviceId: text(256).optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    const calls = [
      ...(snapshot.activeCall ? [snapshot.activeCall] : []),
      ...snapshot.queue,
      ...snapshot.history,
    ];
    if (
      new Set(calls.map((call) => call.id)).size !== calls.length ||
      calls.some((call) => call.provider !== snapshot.provider) ||
      snapshot.queue.some((call) => call.status !== "queued") ||
      snapshot.history.some(
        (call) => !["completed", "missed", "failed"].includes(call.status),
      ) ||
      (snapshot.activeCall &&
        !["ringing", "connecting", "active", "held"].includes(
          snapshot.activeCall.status,
        ))
    )
      ctx.addIssue({
        code: "custom",
        message: "Invalid live call projection.",
      });
  });

const scopeSchema = z
  .object({
    sessionId: identifier,
    tenantId: identifier,
    agentId: identifier,
    provider: providerSchema,
  })
  .strict();
const capabilitiesSchema = z
  .object({
    inbound: z.boolean(),
    outboundPstn: z.literal(false),
    hold: z.boolean(),
    transfer: z.literal(false),
    recording: z.literal(false),
    dtmf: z.boolean(),
    mute: z.boolean(),
    notes: z.boolean(),
  })
  .strict();
const bindingSchema = z
  .object({
    callId: identifier,
    provider: providerSchema,
    pstnCallId: text(512).min(1),
    browserCallId: text(512)
      .min(1)
      .nullish()
      .transform((value) => value ?? undefined),
    browserCallLegId: text(512)
      .min(1)
      .nullish()
      .transform((value) => value ?? undefined),
    callSessionId: text(512)
      .min(1)
      .nullish()
      .transform((value) => value ?? undefined),
    reservationId: identifier
      .nullish()
      .transform((value) => value ?? undefined),
    phase: z.enum([
      "queued",
      "offered",
      "connecting",
      "connected",
      "ending",
      "ended",
      "reconciliation-required",
    ]),
    topology: z.enum(["twilio-dial-client", "telnyx-sip-bridge"]),
    browserAnswered: z.boolean(),
    bridgeObserved: z.boolean(),
  })
  .strict();
export const communicationsSnapshotEnvelopeSchema = z
  .object({
    type: z.literal("snapshot"),
    contractVersion: z.literal(communicationsWireVersion),
    scope: scopeSchema,
    revision: epoch,
    cursor: epoch,
    snapshot: communicationsLiveSnapshotSchema,
    capabilities: capabilitiesSchema,
    bindings: z.array(bindingSchema).max(256),
    result: z
      .object({
        commandId: z.uuid(),
        outcome: z.enum(["applied", "duplicate", "unknown"]),
        errorCode: text(100).optional(),
      })
      .strict()
      .optional(),
    error: z
      .object({ code: text(100).min(1), message: text(512) })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((envelope, ctx) => {
    if (
      envelope.snapshot.provider !== envelope.scope.provider ||
      new Set(envelope.bindings.map((binding) => binding.callId)).size !==
        envelope.bindings.length ||
      envelope.bindings.some(
        (binding) =>
          binding.provider !== envelope.scope.provider ||
          (!["queued", "ended"].includes(binding.phase) &&
            !binding.reservationId) ||
          binding.topology !==
            (binding.provider === "twilio"
              ? "twilio-dial-client"
              : "telnyx-sip-bridge"),
      )
    )
      ctx.addIssue({ code: "custom", message: "Invalid live binding scope." });
  });
export type CommunicationsSnapshotEnvelope = z.infer<
  typeof communicationsSnapshotEnvelopeSchema
>;
export type CommunicationsLiveCapabilities =
  CommunicationsSnapshotEnvelope["capabilities"];

const accessTokenSchema = z
  .object({
    token: z
      .string()
      .max(16384)
      .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
    expiresAt: isoDate,
  })
  .strict();
export type VoiceAccessToken = z.infer<typeof accessTokenSchema>;

/** Shape/expiry checks only. JWT signature and grant authorization are SDK/server responsibilities. */
export function parseVoiceAccessToken(
  value: unknown,
  now = Date.now(),
): VoiceAccessToken {
  const parsed = accessTokenSchema.safeParse(value);
  if (!parsed.success)
    throw new CommunicationsError("invalid-argument", "Invalid voice token.");
  try {
    const part = parsed.data.token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(
      atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
      (character) => character.charCodeAt(0),
    );
    const claims: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    const expiry = z
      .object({ exp: z.number().int().positive() })
      .safeParse(claims);
    const reported = Date.parse(parsed.data.expiresAt);
    if (
      !expiry.success ||
      reported <= now ||
      expiry.data.exp * 1000 <= now ||
      reported > expiry.data.exp * 1000 + 1000
    )
      throw new Error("expiry");
  } catch {
    throw new CommunicationsError("invalid-argument", "Invalid voice token.");
  }
  // No fabricated shared TTL policy: Telnyx JWT expiry is bounded by its actual
  // parent credential; Twilio's supported maximum is not a recommended TTL.
  return parsed.data;
}

export const browserVoiceCallSchema = z
  .object({
    provider: providerSchema,
    nativeCallId: text(512).min(1),
    browserCallId: text(512).min(1).optional(),
    browserCallLegId: text(512).min(1).optional(),
    callSessionId: text(512).min(1).optional(),
    logicalCallId: identifier.optional(),
    reservationId: identifier.optional(),
    state: z.enum([
      "ringing",
      "connecting",
      "active",
      "held",
      "reconnecting",
      "ended",
    ]),
    muted: z.boolean(),
  })
  .strict();
export type BrowserVoiceCall = z.infer<typeof browserVoiceCallSchema>;
export const browserVoiceEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }).strict(),
  z.object({ type: z.literal("reconnecting") }).strict(),
  z.object({ type: z.literal("disconnected") }).strict(),
  z.object({ type: z.literal("token-expiring") }).strict(),
  z.object({ type: z.literal("call"), call: browserVoiceCallSchema }).strict(),
  z
    .object({
      type: z.literal("error"),
      code: z.enum(["provider-error", "invalid-notification", "media-error"]),
      microphonePermission: z.enum(["denied", "unavailable"]).optional(),
    })
    .strict(),
  z
    .object({ type: z.literal("microphone"), permission: z.literal("granted") })
    .strict(),
]);
export type BrowserVoiceEvent = z.infer<typeof browserVoiceEventSchema>;

/** Native media operations only; a local end is never proof the PSTN leg ended. */
export interface BrowserVoiceClient {
  readonly provider: CommunicationsProvider;
  subscribe(listener: (event: BrowserVoiceEvent) => void): () => void;
  getCalls(): readonly BrowserVoiceCall[];
  connect(token: VoiceAccessToken, signal: AbortSignal): Promise<void>;
  /** Re-register the same owned native client; never dial/answer/recreate a leg. */
  reconnect?(signal: AbortSignal): Promise<void>;
  refreshToken(token: VoiceAccessToken, signal: AbortSignal): Promise<void>;
  accept(nativeCallId: string): Promise<void>;
  decline(nativeCallId: string): Promise<void>;
  hangup(nativeCallId: string): Promise<void>;
  setMuted(nativeCallId: string, muted: boolean): Promise<void>;
  sendDtmf(nativeCallId: string, digit: string): Promise<void>;
  dispose(): void | Promise<void>;
}
export type BrowserVoiceClientFactory = (input: {
  provider: CommunicationsProvider;
  scope: CommunicationsSnapshotEnvelope["scope"];
}) => BrowserVoiceClient | Promise<BrowserVoiceClient>;

export function createVoiceEventChannel() {
  const listeners = new Set<(event: BrowserVoiceEvent) => void>();
  return {
    subscribe(listener: (event: BrowserVoiceEvent) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit(event: BrowserVoiceEvent) {
      for (const listener of [...listeners]) {
        try {
          listener(event);
        } catch {
          // A presentation subscriber cannot break native SDK cleanup.
        }
      }
    },
    clear() {
      listeners.clear();
    },
  };
}

export function stopVoiceMedia(stream: MediaStream | null | undefined) {
  try {
    stream?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        // Continue releasing the other tracks.
      }
    });
  } catch {
    // Teardown remains best effort if a native stream is already gone.
  }
}

export function voiceReadyGate(signal: AbortSignal, timeoutMs: number) {
  let settle: (error?: CommunicationsError) => void = () => {};
  const promise = new Promise<void>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(
      () =>
        finish(
          new CommunicationsError(
            "disconnected",
            "Voice registration timed out.",
          ),
        ),
      timeoutMs,
    );
    function finish(error?: CommunicationsError) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", aborted);
      if (error) reject(error);
      else resolve();
    }
    function aborted() {
      finish(
        new CommunicationsError("cancelled", "Voice registration cancelled."),
      );
    }
    settle = finish;
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) aborted();
  });
  return { promise, ready: () => settle(), fail: settle };
}

type TransportReply = { status: number; body: unknown };
export interface CommunicationsLiveTransport {
  request(
    resource: "session" | "commands",
    input: { headers: Headers; body: unknown; signal: AbortSignal },
  ): Promise<TransportReply>;
  subscribe(input: {
    headers: Headers;
    signal: AbortSignal;
    onEnvelope: (value: unknown) => void;
    onError: () => void;
  }): (() => void) | Promise<() => void>;
}
export type LiveCommunicationsAdapterOptions = {
  provider: CommunicationsProvider;
  baseUrl: string;
  fetch?: typeof fetch;
  transport?: CommunicationsLiveTransport;
  /** Required for SDK operation; absent means connect fails before HTTP/SDK work. */
  voiceClientFactory?: BrowserVoiceClientFactory;
  getAuthHeaders?: () => HeadersInit | Promise<HeadersInit>;
  /** Explicit HTTPS origin approval; loopback HTTP is permitted only when listed. */
  trustedBackendOrigins?: readonly string[];
  eventReconnectDelayMs?: number;
  maxEventReconnectAttempts?: number;
};
export interface LiveCommunicationsAdapter extends CommunicationsAdapter {
  readonly mode: "live";
  getCapabilities(): CommunicationsLiveCapabilities | null;
  dispose(): void;
}
const sessionSchema = z
  .object({
    contractVersion: z.literal(communicationsWireVersion),
    sessionId: identifier,
    sessionToken: z
      .string()
      .min(16)
      .max(4096)
      .regex(/^[A-Za-z0-9._~+/-]+=*$/),
    expiresAt: isoDate,
    provider: providerSchema,
    tenantId: identifier,
    agentId: identifier,
    credentials: z
      .object({
        kind: z.enum(["twilio-access-token", "telnyx-login-token"]),
        token: z.string(),
        expiresAt: isoDate,
      })
      .strict(),
    envelope: communicationsSnapshotEnvelopeSchema,
  })
  .strict();
type Session = z.infer<typeof sessionSchema>;
const emptyPayload = z.object({}).strict();
const commandBase = {
  commandId: z.uuid(),
  expectedRevision: epoch,
};
const commandSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...commandBase,
      type: z.literal("connect"),
      payload: emptyPayload,
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("disconnect"),
      payload: emptyPayload,
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("heartbeat"),
      payload: emptyPayload,
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("presence"),
      payload: z
        .object({ presence: z.enum(["available", "away", "offline"]) })
        .strict(),
    })
    .strict(),
  ...["accept", "decline", "hangup"].map((type) =>
    z
      .object({
        ...commandBase,
        type: z.literal(type),
        callId: identifier,
        payload: emptyPayload,
      })
      .strict(),
  ),
  z
    .object({
      ...commandBase,
      type: z.literal("mute"),
      callId: identifier,
      payload: z.object({ muted: z.boolean() }).strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("hold"),
      callId: identifier,
      payload: z.object({ held: z.boolean() }).strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("dtmf"),
      callId: identifier,
      payload: z.object({ digit: z.string().regex(/^[0-9*#]$/) }).strict(),
    })
    .strict(),
  z
    .object({
      ...commandBase,
      type: z.literal("notes"),
      callId: identifier,
      payload: z.object({ text: text(2000) }).strict(),
    })
    .strict(),
]);
type Command = z.infer<typeof commandSchema>;

function fail(
  message: string,
  code:
    | "invalid-argument"
    | "invalid-transition"
    | "disconnected" = "invalid-transition",
): never {
  throw new CommunicationsError(code, message);
}
function checkAbort(signal: AbortSignal) {
  if (signal.aborted)
    throw new CommunicationsError(
      "cancelled",
      "Communications operation cancelled.",
    );
}
/** Cancellation settles promptly even when an optional loader ignores AbortSignal. */
export function withVoiceCancellation<T>(
  pending: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    function finish(action: () => void) {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", aborted);
      action();
    }
    const aborted = () =>
      finish(() =>
        reject(
          new CommunicationsError(
            "cancelled",
            "Communications operation cancelled.",
          ),
        ),
      );
    signal.addEventListener("abort", aborted, { once: true });
    pending.then(
      (value) => {
        if (signal.aborted) aborted();
        else finish(() => resolve(value));
      },
      (error: unknown) => {
        finish(() => reject(error));
      },
    );
    if (signal.aborted) aborted();
  });
}
function frozenSnapshot(value: CommunicationsSnapshot): CommunicationsSnapshot {
  function freeze(item: object) {
    for (const child of Object.values(item))
      if (child && typeof child === "object" && !Object.isFrozen(child))
        freeze(child);
    Object.freeze(item);
  }
  freeze(value);
  return value;
}
function requestBase(options: LiveCommunicationsAdapterOptions) {
  const base = options.baseUrl.replace(/\/+$/, "");
  if (
    /[\u0000-\u0020\u007f\\?#]/.test(base) ||
    /(?:^|\/)\.\.?(?:\/|$)/.test(base)
  )
    return fail("Invalid communications API mount.", "invalid-argument");
  if (
    base.startsWith("/") &&
    !base.startsWith("//") &&
    !/[\u0000-\u0020\u007f\\?#]/.test(base) &&
    !base.includes("..") &&
    !/%(?:2e|2f|5c|0[0-9a-f]|1[0-9a-f]|20|7f)/i.test(base)
  )
    return base;
  try {
    const url = new URL(base);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol === "https:" || (url.protocol === "http:" && loopback)) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      !/[%\\]/.test(url.pathname) &&
      options.trustedBackendOrigins?.includes(url.origin)
    )
      return base;
  } catch {
    // Untrusted locations receive no auth material.
  }
  return fail(
    "Invalid or unapproved communications API mount.",
    "invalid-argument",
  );
}
async function readJson(
  response: Response,
  signal: AbortSignal,
): Promise<unknown> {
  if (
    response.redirected ||
    !/^(?:application\/json|application\/[\w.+-]+\+json)(?:;|$)/i.test(
      response.headers.get("content-type") ?? "",
    )
  )
    fail("Invalid communications response.", "disconnected");
  const body = await withVoiceCancellation(response.text(), signal);
  if (body.length > 524288)
    fail("Oversized communications response.", "disconnected");
  try {
    return JSON.parse(body);
  } catch {
    return fail("Invalid communications response.", "disconnected");
  }
}
function fetchTransport(
  options: LiveCommunicationsAdapterOptions,
  base: string,
): CommunicationsLiveTransport {
  const fetcher =
    options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  return {
    async request(resource, input) {
      if (resource !== "session" && resource !== "commands")
        fail("Unsupported communications endpoint.", "invalid-argument");
      const response = await withVoiceCancellation(
        fetcher(`${base}/${resource}`, {
          method: "POST",
          headers: input.headers,
          body: JSON.stringify(input.body),
          signal: input.signal,
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
        }),
        input.signal,
      );
      return {
        status: response.status,
        body: await readJson(response, input.signal),
      };
    },
    async subscribe(input) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      input.signal.addEventListener("abort", abort, { once: true });
      if (input.signal.aborted) abort();
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      const stop = () => {
        input.signal.removeEventListener("abort", abort);
        controller.abort();
        void reader?.cancel().catch(() => {});
      };
      try {
        const response = await withVoiceCancellation(
          fetcher(`${base}/events`, {
            method: "GET",
            headers: input.headers,
            signal: controller.signal,
            credentials: "same-origin",
            cache: "no-store",
            redirect: "error",
          }),
          controller.signal,
        );
        if (
          response.status !== 200 ||
          response.redirected ||
          !/^text\/event-stream(?:;|$)/i.test(
            response.headers.get("content-type") ?? "",
          ) ||
          !response.body
        )
          fail("Communications event stream unavailable.", "disconnected");
        reader = response.body.getReader();
        const currentReader = reader;
        void (async () => {
          const decoder = new TextDecoder("utf-8", { fatal: true });
          let buffer = "";
          let data: string[] = [];
          let event = "";
          let eventId = "";
          let frameSize = 0;
          function line(value: string) {
            if (!value) {
              if (data.length && (!event || event === "snapshot")) {
                const payload: unknown = JSON.parse(data.join("\n"));
                const parsed =
                  communicationsSnapshotEnvelopeSchema.safeParse(payload);
                if (
                  !parsed.success ||
                  (eventId && eventId !== String(parsed.data.cursor))
                )
                  fail("Invalid communications event.", "disconnected");
                input.onEnvelope(parsed.data);
              }
              data = [];
              event = "";
              eventId = "";
              frameSize = 0;
              return;
            }
            if (value.startsWith(":")) return;
            frameSize += value.length;
            if (frameSize > 524288)
              fail("Oversized communications event.", "disconnected");
            const split = value.indexOf(":");
            const field = split < 0 ? value : value.slice(0, split);
            const content =
              split < 0 ? "" : value.slice(split + 1).replace(/^ /, "");
            if (field === "data") data.push(content);
            if (field === "event") event = content;
            if (field === "id") eventId = content;
          }
          while (!controller.signal.aborted) {
            const chunk = await withVoiceCancellation(
              currentReader.read(),
              controller.signal,
            );
            if (chunk.done) {
              // A closed stream requires a fresh full snapshot, never guessed replay.
              throw new Error("closed");
            }
            buffer += decoder.decode(chunk.value, { stream: true });
            if (buffer.length > 524288) throw new Error("oversized");
            while (true) {
              const boundary = buffer.search(/[\r\n]/);
              if (
                boundary < 0 ||
                (buffer[boundary] === "\r" && boundary === buffer.length - 1)
              )
                break;
              const value = buffer.slice(0, boundary);
              const width =
                buffer[boundary] === "\r" && buffer[boundary + 1] === "\n"
                  ? 2
                  : 1;
              buffer = buffer.slice(boundary + width);
              line(value);
              if (controller.signal.aborted) break;
            }
          }
        })().catch(() => {
          if (!controller.signal.aborted) input.onError();
          stop();
        });
        return stop;
      } catch (error) {
        stop();
        throw error;
      }
    },
  };
}

function isVoiceClient(value: unknown): value is BrowserVoiceClient {
  if (!value || typeof value !== "object") return false;
  return (
    "provider" in value &&
    providerSchema.safeParse(value.provider).success &&
    "subscribe" in value &&
    typeof value.subscribe === "function" &&
    "getCalls" in value &&
    typeof value.getCalls === "function" &&
    "connect" in value &&
    typeof value.connect === "function" &&
    (!("reconnect" in value) ||
      value.reconnect === undefined ||
      typeof value.reconnect === "function") &&
    "refreshToken" in value &&
    typeof value.refreshToken === "function" &&
    "accept" in value &&
    typeof value.accept === "function" &&
    "decline" in value &&
    typeof value.decline === "function" &&
    "hangup" in value &&
    typeof value.hangup === "function" &&
    "setMuted" in value &&
    typeof value.setMuted === "function" &&
    "sendDtmf" in value &&
    typeof value.sendDtmf === "function" &&
    "dispose" in value &&
    typeof value.dispose === "function"
  );
}

export function createLiveCommunicationsAdapter(
  options: LiveCommunicationsAdapterOptions,
): LiveCommunicationsAdapter {
  if (
    !providerSchema.safeParse(options.provider).success ||
    typeof options.baseUrl !== "string"
  )
    fail("Invalid communications configuration.", "invalid-argument");
  const base = requestBase(options);
  const transport = options.transport ?? fetchTransport(options, base);
  const listeners = new Set<() => void>();
  let serverSnapshot: CommunicationsSnapshot = {
    mode: "live",
    provider: options.provider,
    connection: "disconnected",
    presence: "offline",
    activeCall: null,
    queue: [],
    history: [],
    error: null,
    businessHours: { timezone: "UTC", weekly: [], holidays: [] },
    businessHoursOpen: false,
    audio: { microphonePermission: "unknown" },
  };
  let snapshot = frozenSnapshot(serverSnapshot);
  let signature = JSON.stringify(snapshot);
  let session: Session | null = null;
  let envelope: CommunicationsSnapshotEnvelope | null = null;
  let voice: BrowserVoiceClient | null = null;
  let unregisterVoice: (() => void) | undefined;
  let stopEvents: (() => void) | undefined;
  let controller: AbortController | null = null;
  let connecting: Promise<void> | null = null;
  let commandTail = Promise.resolve();
  let disposed = false;
  let generation = 0;
  let registered = false;
  let localConnection: CommunicationsSnapshot["connection"] = "disconnected";
  let microphonePermission: CommunicationsSnapshot["audio"]["microphonePermission"] =
    "unknown";
  let localError: string | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let heartbeatTimer: ReturnType<typeof setTimeout> | undefined;
  let eventTimer: ReturnType<typeof setTimeout> | undefined;
  let renewal: Promise<void> | null = null;
  let browserRecovery: Promise<void> | null = null;
  let renewalRequested = false;
  let eventEpoch = 0;
  let eventsQuarantined = false;
  let eventAttempts = 0;
  const uncertain = new Map<string, Command>();
  const attemptedNative = new Set<string>();
  const retryDelay = options.eventReconnectDelayMs ?? 1000;
  const retryLimit = options.maxEventReconnectAttempts ?? 3;
  if (
    !Number.isInteger(retryDelay) ||
    retryDelay < 1 ||
    retryDelay > 30000 ||
    !Number.isInteger(retryLimit) ||
    retryLimit < 0 ||
    retryLimit > 10
  )
    fail("Invalid event recovery configuration.", "invalid-argument");

  function publish() {
    const active = serverSnapshot.activeCall;
    const binding = active
      ? envelope?.bindings.find((item) => item.callId === active.id)
      : undefined;
    const conversation =
      !!active &&
      ["active", "held"].includes(active.status) &&
      binding?.phase === "connected";
    let localCall: BrowserVoiceCall | undefined;
    if (conversation && active && registered && localConnection === "ready") {
      try {
        localCall = nativeCall(active.id);
      } catch {
        /* Pending or ambiguous IDs disable media controls. */
      }
    }
    const next = {
      ...serverSnapshot,
      connection: localConnection,
      audio: { ...serverSnapshot.audio, microphonePermission },
      error:
        localError ??
        (serverSnapshot.error
          ? "Communications backend reported an error."
          : null),
      caps: {
        hold: conversation && (envelope?.capabilities.hold ?? false),
        mute:
          !!localCall &&
          ["active", "held"].includes(localCall.state) &&
          (envelope?.capabilities.mute ?? false),
        dtmf:
          localCall?.state === "active" &&
          (envelope?.capabilities.dtmf ?? false),
      },
    };
    const nextSignature = JSON.stringify(next);
    if (signature === nextSignature || disposed) return;
    signature = nextSignature;
    snapshot = frozenSnapshot(next);
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        /* One subscriber cannot break state delivery. */
      }
    }
  }
  function requireOpen() {
    if (disposed)
      throw new CommunicationsError(
        "disposed",
        "Communications adapter disposed.",
      );
    if (!session || !controller || controller.signal.aborted)
      fail("Communications is disconnected.", "disconnected");
    return { current: session, signal: controller.signal, epoch: generation };
  }
  function sameScope(
    scope: CommunicationsSnapshotEnvelope["scope"],
    current: Session,
  ) {
    return (
      scope.sessionId === current.sessionId &&
      scope.tenantId === current.tenantId &&
      scope.agentId === current.agentId &&
      scope.provider === current.provider
    );
  }
  function acceptEnvelope(value: unknown) {
    const parsed = communicationsSnapshotEnvelopeSchema.safeParse(value);
    if (!parsed.success || !session || !sameScope(parsed.data.scope, session))
      fail("Invalid communications session or event scope.", "disconnected");
    const next = parsed.data;
    if (
      envelope &&
      (next.revision < envelope.revision || next.cursor < envelope.cursor)
    )
      return false;
    if (envelope && next.revision === envelope.revision) {
      const view = (item: CommunicationsSnapshotEnvelope) =>
        JSON.stringify([item.snapshot, item.bindings, item.capabilities]);
      if (view(next) !== view(envelope))
        fail("Unrevisioned communications state.", "disconnected");
    }
    envelope = next;
    serverSnapshot = next.snapshot;
    if (
      !serverSnapshot.activeCall &&
      localError === "Browser media ended; backend reconciliation is pending."
    ) {
      localError = null;
      if (registered) localConnection = "ready";
    }
    publish();
    return true;
  }
  async function headers(token?: string, signal = controller?.signal) {
    const supplied = options.getAuthHeaders
      ? signal
        ? await withVoiceCancellation(
            Promise.resolve(options.getAuthHeaders()),
            signal,
          )
        : await options.getAuthHeaders()
      : undefined;
    let result: Headers;
    try {
      result = new Headers(supplied);
    } catch {
      return fail("Invalid authentication headers.", "invalid-argument");
    }
    for (const [name, value] of result) {
      if (
        !["authorization", "x-csrf-token"].includes(name) ||
        !/^[\x20-\x7e]{1,4096}$/.test(value)
      )
        fail("Invalid authentication headers.", "invalid-argument");
    }
    if (token) result.set("Authorization", `Bearer ${token}`);
    result.set("Content-Type", "application/json");
    result.set("Accept", "application/json");
    return result;
  }
  function parseSession(value: unknown) {
    const parsed = sessionSchema.safeParse(value);
    if (!parsed.success)
      fail("Invalid communications session.", "disconnected");
    const next = parsed.data;
    if (
      next.provider !== options.provider ||
      !sameScope(next.envelope.scope, next) ||
      next.credentials.kind !==
        (next.provider === "twilio"
          ? "twilio-access-token"
          : "telnyx-login-token") ||
      Date.parse(next.expiresAt) <= Date.now()
    )
      fail("Invalid communications session.", "disconnected");
    parseVoiceAccessToken({
      token: next.credentials.token,
      expiresAt: next.credentials.expiresAt,
    });
    return next;
  }
  function nativeCall(
    callId: string,
    allowReconciliation = false,
  ): BrowserVoiceCall {
    const { current } = requireOpen();
    const binding = envelope?.bindings.find((item) => item.callId === callId);
    if (
      !binding ||
      binding.provider !== current.provider ||
      !voice ||
      ["queued", "ended"].includes(binding.phase) ||
      (!allowReconciliation && binding.phase === "reconciliation-required")
    )
      fail("No authorized browser leg is mapped to this call.");
    const calls = z
      .array(browserVoiceCallSchema)
      .max(32)
      .safeParse(voice.getCalls());
    if (!calls.success) fail("Invalid native browser call.", "disconnected");
    const matches = calls.data.filter((call) => {
      if (call.provider !== current.provider || call.state === "ended")
        return false;
      if (current.provider === "twilio") {
        if (call.logicalCallId && call.logicalCallId !== binding.callId)
          return false;
        if (call.reservationId && call.reservationId !== binding.reservationId)
          return false;
        return (
          (!!binding.browserCallId &&
            call.browserCallId === binding.browserCallId) ||
          (call.logicalCallId === binding.callId &&
            call.reservationId === binding.reservationId)
        );
      }
      return (
        !!binding.browserCallId &&
        call.browserCallId === binding.browserCallId &&
        (!binding.browserCallLegId ||
          call.browserCallLegId === binding.browserCallLegId) &&
        (!binding.callSessionId || call.callSessionId === binding.callSessionId)
      );
    });
    if (matches.length !== 1)
      fail("The exact authorized browser leg is not available.");
    return matches[0];
  }
  function requireCall(callId: string, states?: readonly string[]) {
    if (!identifier.safeParse(callId).success)
      fail("Invalid communications call ID.", "invalid-argument");
    requireOpen();
    const call = serverSnapshot.activeCall;
    if (
      !call ||
      call.id !== callId ||
      (states && !states.includes(call.status))
    )
      fail("This call is not the current authorized offer or conversation.");
  }
  async function sendCommand(
    type: string,
    callId?: string,
    payload: unknown = {},
  ) {
    const { current, signal, epoch: callGeneration } = requireOpen();
    const key = JSON.stringify([current.sessionId, type, callId, payload]);
    const saved = uncertain.get(key);
    const parsed = commandSchema.safeParse(
      saved ?? {
        commandId: crypto.randomUUID(),
        expectedRevision: envelope?.revision ?? 0,
        type,
        ...(callId ? { callId } : {}),
        payload,
      },
    );
    if (!parsed.success)
      fail("Invalid communications command.", "invalid-argument");
    const command = parsed.data;
    uncertain.set(key, command);
    let reply: TransportReply;
    try {
      const auth = await headers(current.sessionToken);
      checkAbort(signal);
      reply = await withVoiceCancellation(
        transport.request("commands", {
          headers: auth,
          body: command,
          signal,
        }),
        signal,
      );
    } catch {
      checkAbort(signal);
      localError =
        "Command outcome is unconfirmed; retry preserves its command ID.";
      publish();
      return fail(
        "Communications command outcome is unconfirmed.",
        "disconnected",
      );
    }
    if (callGeneration !== generation) checkAbort(signal);
    const parsedEnvelope = communicationsSnapshotEnvelopeSchema.safeParse(
      reply.body,
    );
    if (!parsedEnvelope.success)
      fail("Invalid communications command response.", "disconnected");
    const outcome = parsedEnvelope.data.result;
    if (outcome && outcome.commandId !== command.commandId)
      fail("Mismatched communications command response.", "disconnected");
    acceptEnvelope(parsedEnvelope.data);
    if (reply.status < 200 || reply.status >= 300) {
      uncertain.delete(key);
      localError =
        reply.status === 409
          ? "Communications changed; review the current call before retrying."
          : "Communications command was rejected.";
      publish();
      return fail(localError);
    }
    if (
      parsedEnvelope.data.error ||
      !outcome ||
      outcome.outcome === "unknown" ||
      reply.status === 202
    ) {
      localError =
        "Remote call state is uncertain; backend reconciliation is required.";
      publish();
      return fail(localError);
    }
    uncertain.delete(key);
    localError = null;
    publish();
    return command.commandId;
  }
  function serial(task: () => Promise<void>) {
    const queuedGeneration = generation;
    const next = commandTail.then(() => {
      if (disposed)
        throw new CommunicationsError(
          "disposed",
          "Communications adapter disposed.",
        );
      if (queuedGeneration !== generation)
        throw new CommunicationsError(
          "cancelled",
          "Communications operation cancelled.",
        );
      return task();
    });
    commandTail = next.catch(() => {});
    return next;
  }
  function executeNative(commandId: string, action: () => Promise<void>) {
    const { signal } = requireOpen();
    if (attemptedNative.has(commandId))
      return fail(
        "This native action was already attempted; it will not be replayed.",
      );
    attemptedNative.add(commandId);
    if (attemptedNative.size > 256)
      attemptedNative.delete(attemptedNative.values().next().value ?? "");
    return withVoiceCancellation(
      Promise.resolve().then(() => {
        checkAbort(signal);
        return action();
      }),
      signal,
    ).catch(() => {
      checkAbort(signal);
      localError =
        "The browser action failed; remote state requires reconciliation.";
      publish();
      return fail(localError, "disconnected");
    });
  }
  function clearTimers() {
    clearTimeout(refreshTimer);
    clearTimeout(heartbeatTimer);
    clearTimeout(eventTimer);
  }
  function closeEvents() {
    ++eventEpoch;
    const cleanup = stopEvents;
    stopEvents = undefined;
    cleanup?.();
  }
  function releaseBrowser() {
    clearTimers();
    controller?.abort();
    closeEvents();
    unregisterVoice?.();
    unregisterVoice = undefined;
    const old = voice;
    voice = null;
    if (old) {
      try {
        void Promise.resolve(old.dispose()).catch(() => {});
      } catch {
        /* Keep clearing auth state. */
      }
    }
    registered = false;
    renewal = null;
    browserRecovery = null;
    renewalRequested = false;
    uncertain.clear();
    attemptedNative.clear();
  }
  async function openEvents(callGeneration: number) {
    if (disposed || callGeneration !== generation || !session || !controller)
      return;
    const { current, signal } = requireOpen();
    closeEvents();
    const subscriptionEpoch = eventEpoch;
    const stream = new AbortController();
    let active = true;
    let transportCleanup: (() => void) | undefined;
    function stop() {
      if (!active) return;
      active = false;
      signal.removeEventListener("abort", stop);
      stream.abort();
      transportCleanup?.();
      transportCleanup = undefined;
      if (stopEvents === stop) stopEvents = undefined;
    }
    function isCurrent() {
      return (
        active &&
        !disposed &&
        callGeneration === generation &&
        subscriptionEpoch === eventEpoch &&
        !signal.aborted
      );
    }
    stopEvents = stop;
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted) stop();
    try {
      const auth = await headers(current.sessionToken, stream.signal);
      auth.set("Accept", "text/event-stream");
      checkAbort(stream.signal);
      const pending = Promise.resolve()
        .then(() =>
          transport.subscribe({
            headers: auth,
            signal: stream.signal,
            onEnvelope(value) {
              if (!isCurrent()) return;
              try {
                if (!acceptEnvelope(value)) return;
                eventAttempts = 0;
                if (registered && !eventsQuarantined) localConnection = "ready";
                publish();
              } catch {
                eventsQuarantined = true;
                stop();
                localConnection = "error";
                localError = "Invalid communications event or session scope.";
                publish();
              }
            },
            onError() {
              if (!isCurrent()) return;
              stop();
              localConnection = "reconnecting";
              localError =
                "Live updates disconnected; the remote call may still be active.";
              publish();
              if (eventAttempts++ >= retryLimit) {
                localConnection = "error";
                publish();
                return;
              }
              eventTimer = setTimeout(
                () => {
                  void openEvents(callGeneration).catch(() => {
                    if (
                      callGeneration === generation &&
                      !disposed &&
                      subscriptionEpoch + 1 === eventEpoch
                    ) {
                      localConnection = "error";
                      publish();
                    }
                  });
                },
                Math.min(retryDelay * 2 ** (eventAttempts - 1), 30000),
              );
            },
          }),
        )
        .then((cleanup) => {
          if (isCurrent()) transportCleanup = cleanup;
          else cleanup();
        });
      await withVoiceCancellation(pending, stream.signal);
    } catch (error) {
      stop();
      throw error;
    }
  }
  function schedule(callGeneration: number) {
    clearTimeout(refreshTimer);
    if (!session) return;
    const expiry = Math.min(
      Date.parse(session.expiresAt),
      Date.parse(session.credentials.expiresAt),
    );
    const warning = options.provider === "twilio" ? 10000 : 120000;
    refreshTimer = setTimeout(
      () => {
        void renew(callGeneration).catch(() => {});
      },
      Math.max(1000, expiry - Date.now() - warning),
    );
    clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => {
      if (disposed || generation !== callGeneration) return;
      void serial(async () => {
        await sendCommand("heartbeat");
      })
        .catch(() => {
          if (!disposed && generation === callGeneration) {
            localError =
              "Agent heartbeat failed; the remote reservation may remain active.";
            publish();
          }
        })
        .finally(() => {
          if (!disposed && generation === callGeneration)
            scheduleHeartbeat(callGeneration);
        });
    }, 15000);
  }
  function scheduleHeartbeat(callGeneration: number) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => {
      if (disposed || generation !== callGeneration) return;
      void serial(async () => {
        await sendCommand("heartbeat");
      })
        .catch(() => {
          if (!disposed && generation === callGeneration) {
            localError =
              "Agent heartbeat failed; the remote reservation may remain active.";
            publish();
          }
        })
        .finally(() => {
          if (!disposed && generation === callGeneration)
            scheduleHeartbeat(callGeneration);
        });
    }, 15000);
  }
  function renew(callGeneration: number): Promise<void> {
    if (renewal) return renewal;
    if (disposed || generation !== callGeneration) return Promise.resolve();
    if (localConnection === "connecting") {
      renewalRequested = true;
      return Promise.resolve();
    }
    const pending = serial(async () => {
      const { current, signal } = requireOpen();
      const reply = await withVoiceCancellation(
        transport.request("session", {
          headers: await headers(current.sessionToken),
          body: { provider: current.provider },
          signal,
        }),
        signal,
      );
      if (reply.status !== 200)
        fail("Voice credential renewal rejected.", "disconnected");
      const next = parseSession(reply.body);
      if (!sameScope(next.envelope.scope, current))
        fail(
          "Voice renewal changed the authenticated identity.",
          "disconnected",
        );
      const token = parseVoiceAccessToken({
        token: next.credentials.token,
        expiresAt: next.credentials.expiresAt,
      });
      if (!voice || !registered)
        fail("Voice transport is not registered.", "disconnected");
      await withVoiceCancellation(voice.refreshToken(token, signal), signal);
      checkAbort(signal);
      if (callGeneration !== generation) return;
      session = next;
      acceptEnvelope(next.envelope);
      closeEvents();
      eventsQuarantined = false;
      await openEvents(callGeneration);
      if (
        Date.parse(next.credentials.expiresAt) <=
        Date.parse(current.credentials.expiresAt)
      ) {
        // A new JWT does not extend a fixed Telnyx parent credential.
        localError =
          "Credential validity did not extend; re-authentication is required before expiry.";
        publish();
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(
          () => {
            if (callGeneration === generation && !disposed) {
              localConnection = "error";
              localError =
                "Voice credentials expired; remote call state is not confirmed.";
              publish();
            }
          },
          Math.max(
            1,
            Math.min(
              Date.parse(next.expiresAt),
              Date.parse(next.credentials.expiresAt),
            ) - Date.now(),
          ),
        );
      } else schedule(callGeneration);
    })
      .catch((error: unknown) => {
        if (
          !disposed &&
          generation === callGeneration &&
          !controller?.signal.aborted
        ) {
          localConnection = "error";
          localError =
            "Voice renewal failed; the remote call may remain active.";
          publish();
        }
        throw error;
      })
      .finally(() => {
        if (renewal === pending) renewal = null;
      });
    renewal = pending;
    return pending;
  }
  function voiceEvent(value: unknown, callGeneration: number) {
    if (disposed || generation !== callGeneration || controller?.signal.aborted)
      return;
    const parsed = browserVoiceEventSchema.safeParse(value);
    if (!parsed.success) {
      localConnection = "error";
      localError = "Invalid browser voice notification.";
      publish();
      return;
    }
    const event = parsed.data;
    if (event.type === "ready") {
      const recovering =
        !registered && localConnection === "reconnecting" && !connecting;
      registered = true;
      if (recovering && !browserRecovery && !eventsQuarantined) {
        const recovery = serial(async () => {
          await sendCommand("connect");
          if (
            !disposed &&
            callGeneration === generation &&
            registered &&
            !eventsQuarantined
          ) {
            localConnection = "ready";
            publish();
          }
        })
          .catch(() => {
            if (!disposed && callGeneration === generation) {
              localConnection = "error";
              localError =
                "Browser registration recovered; backend confirmation failed.";
              publish();
            }
          })
          .finally(() => {
            if (browserRecovery === recovery) browserRecovery = null;
          });
        browserRecovery = recovery;
      }
    } else if (event.type === "reconnecting" || event.type === "disconnected") {
      registered = false;
      localConnection = "reconnecting";
      localError =
        "Browser voice disconnected; remote call state is not confirmed.";
    } else if (event.type === "token-expiring") {
      void renew(callGeneration).catch(() => {});
    } else if (event.type === "microphone") {
      microphonePermission = event.permission;
    } else if (event.type === "error") {
      if (event.microphonePermission)
        microphonePermission = event.microphonePermission;
      localError = "Browser voice reported an error.";
      localConnection = "error";
    } else if (event.type === "call") {
      const call = browserVoiceCallSchema.safeParse(event.call);
      if (!call.success || call.data.provider !== options.provider) {
        localConnection = "error";
        localError = "Invalid browser call notification.";
      } else if (call.data.state === "ended" && serverSnapshot.activeCall) {
        localError = "Browser media ended; backend reconciliation is pending.";
      } else if (call.data.state === "reconnecting") {
        localConnection = "reconnecting";
      }
    }
    publish();
  }
  async function connect() {
    if (disposed)
      throw new CommunicationsError(
        "disposed",
        "Communications adapter disposed.",
      );
    if (connecting) return connecting;
    if (registered && localConnection === "ready") return;
    if (session && voice && controller && !controller.signal.aborted) {
      const currentGeneration = generation;
      const signal = controller.signal;
      const client = voice;
      localConnection = "connecting";
      localError = null;
      publish();
      connecting = (async () => {
        if (!registered) {
          if (!client.reconnect)
            fail(
              "The injected voice client cannot re-register this session.",
              "disconnected",
            );
          await withVoiceCancellation(client.reconnect(signal), signal);
          if (!registered)
            fail("The SDK did not confirm re-registration.", "disconnected");
        }
        await serial(async () => {
          await sendCommand("connect");
        });
        eventsQuarantined = false;
        eventAttempts = 0;
        await openEvents(currentGeneration);
        checkAbort(signal);
        localConnection = "ready";
        publish();
        schedule(currentGeneration);
        if (renewalRequested) {
          renewalRequested = false;
          void renew(currentGeneration).catch(() => {});
        }
      })()
        .catch((error: unknown) => {
          if (
            !disposed &&
            currentGeneration === generation &&
            !signal.aborted
          ) {
            localConnection = "error";
            localError =
              "Communications recovery failed; the current reservation is retained.";
            publish();
          }
          throw error instanceof CommunicationsError
            ? error
            : new CommunicationsError(
                "disconnected",
                "Communications recovery failed.",
              );
        })
        .finally(() => {
          if (currentGeneration === generation) connecting = null;
        });
      return connecting;
    }
    if (!options.voiceClientFactory)
      fail(
        "Supply an optional browser SDK factory before connecting.",
        "invalid-argument",
      );
    releaseBrowser();
    session = null;
    envelope = null;
    eventsQuarantined = false;
    eventAttempts = 0;
    controller = new AbortController();
    const signal = controller.signal;
    const callGeneration = ++generation;
    localConnection = "connecting";
    localError = null;
    publish();
    const factory = options.voiceClientFactory;
    connecting = (async () => {
      const reply = await withVoiceCancellation(
        transport.request("session", {
          headers: await headers(),
          body: { provider: options.provider },
          signal,
        }),
        signal,
      );
      if (reply.status !== 200)
        fail("Communications authentication failed.", "disconnected");
      session = parseSession(reply.body);
      acceptEnvelope(session.envelope);
      const prepared = Promise.resolve(
        factory({ provider: options.provider, scope: session.envelope.scope }),
      );
      prepared
        .then((client) => {
          if (signal.aborted && isVoiceClient(client))
            void Promise.resolve(client.dispose()).catch(() => {});
        })
        .catch(() => {});
      const client = await withVoiceCancellation(prepared, signal);
      if (!isVoiceClient(client) || client.provider !== options.provider)
        fail("Invalid optional browser SDK factory.", "invalid-argument");
      voice = client;
      unregisterVoice = client.subscribe((event) =>
        voiceEvent(event, callGeneration),
      );
      await withVoiceCancellation(
        client.connect(
          {
            token: session.credentials.token,
            expiresAt: session.credentials.expiresAt,
          },
          signal,
        ),
        signal,
      );
      if (!registered)
        fail("The SDK did not report registration.", "disconnected");
      await sendCommand("connect");
      localConnection = "ready";
      publish();
      await openEvents(callGeneration);
      schedule(callGeneration);
      if (renewalRequested) {
        renewalRequested = false;
        void renew(callGeneration).catch(() => {});
      }
    })()
      .catch((error: unknown) => {
        if (generation === callGeneration && !disposed && !signal.aborted) {
          releaseBrowser();
          session = null;
          localConnection = "error";
          localError = "Communications could not connect.";
          publish();
        }
        throw error instanceof CommunicationsError
          ? error
          : new CommunicationsError(
              "disconnected",
              "Communications could not connect.",
            );
      })
      .finally(() => {
        if (generation === callGeneration) connecting = null;
      });
    return connecting;
  }
  async function disconnect() {
    if (disposed) return;
    const prior = session;
    const priorRevision = envelope?.revision ?? 0;
    const closingGeneration = ++generation;
    releaseBrowser();
    connecting = null;
    session = null;
    envelope = null;
    localConnection = "disconnected";
    serverSnapshot = { ...serverSnapshot, presence: "offline" };
    publish();
    if (!prior) return;
    const closing = new AbortController();
    const timeout = setTimeout(() => closing.abort(), 5000);
    try {
      const auth = await headers(prior.sessionToken, closing.signal);
      const reply = await withVoiceCancellation(
        transport.request("commands", {
          headers: auth,
          signal: closing.signal,
          body: {
            commandId: crypto.randomUUID(),
            expectedRevision: priorRevision,
            type: "disconnect",
            payload: {},
          },
        }),
        closing.signal,
      );
      const parsed = communicationsSnapshotEnvelopeSchema.safeParse(reply.body);
      if (
        reply.status !== 200 ||
        !parsed.success ||
        !sameScope(parsed.data.scope, prior)
      )
        fail("Backend disconnect is unconfirmed.", "disconnected");
    } catch {
      if (!disposed && generation === closingGeneration) {
        localError =
          "Browser disconnected; backend reservation may require reconciliation.";
        publish();
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  async function localAction(
    type: "accept" | "decline" | "hangup" | "mute" | "dtmf",
    callId: string,
    payload: unknown = {},
  ) {
    requireCall(
      callId,
      type === "accept" || type === "decline"
        ? ["ringing"]
        : ["connecting", "active", "held"],
    );
    if (type === "hangup" || type === "decline") {
      const ownedClient = voice;
      let mapped: BrowserVoiceCall | undefined;
      let attemptedClose = false;
      let commandId: string | undefined;
      try {
        mapped = nativeCall(callId, true);
      } catch {
        /* Backend still owns the remote termination guard. */
      }
      const closeLocal = async () => {
        if (!mapped || !ownedClient || voice !== ownedClient) return;
        attemptedClose = true;
        if (type === "decline") await ownedClient.decline(mapped.nativeCallId);
        else await ownedClient.hangup(mapped.nativeCallId);
      };
      try {
        commandId = await sendCommand(type, callId, payload);
        if (mapped) await executeNative(commandId, closeLocal);
      } catch (error) {
        // Explicit local closure can stop our own media while a remote command
        // is denied, lost or unknown. No terminal PSTN state is synthesized.
        if (
          !attemptedClose &&
          (!commandId || !attemptedNative.has(commandId))
        ) {
          try {
            await closeLocal();
          } catch {
            /* Reconciliation remains visible. */
          }
        }
        throw error;
      }
      return;
    }
    if (!voice || !registered)
      fail("Browser voice is not ready.", "disconnected");
    const before = nativeCall(callId);
    if (type === "accept" && before.state !== "ringing")
      fail("The native browser offer is no longer ringing.");
    if ((type === "mute" || type === "dtmf") && !envelope?.capabilities[type])
      fail("This operation is not enabled for the authenticated session.");
    const commandId = await sendCommand(type, callId, payload);
    // Fresh correlation after the command guard: no action on a replaced leg.
    const after = nativeCall(callId);
    if (before.nativeCallId !== after.nativeCallId)
      fail("The browser call changed before the native action.");
    const client = voice;
    if (!client) fail("Browser voice is disconnected.", "disconnected");
    await executeNative(commandId, async () => {
      if (type === "accept") await client.accept(after.nativeCallId);
      if (type === "mute") {
        const parsed = z
          .object({ muted: z.boolean() })
          .strict()
          .safeParse(payload);
        if (!parsed.success) fail("Invalid mute command.", "invalid-argument");
        await client.setMuted(after.nativeCallId, parsed.data.muted);
      }
      if (type === "dtmf") {
        const parsed = z
          .object({ digit: z.string().regex(/^[0-9*#]$/) })
          .strict()
          .safeParse(payload);
        if (!parsed.success) fail("Invalid DTMF command.", "invalid-argument");
        await client.sendDtmf(after.nativeCallId, parsed.data.digit);
      }
    });
  }
  return {
    mode: "live",
    getSnapshot: () => snapshot,
    getCapabilities: () =>
      envelope ? Object.freeze({ ...envelope.capabilities }) : null,
    subscribe(listener) {
      if (!disposed) listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    connect,
    disconnect,
    setPresence: (presence: CommunicationsPresence) =>
      serial(async () => {
        await sendCommand("presence", undefined, { presence });
      }),
    accept: (callId) => serial(() => localAction("accept", callId)),
    decline: (callId) => serial(() => localAction("decline", callId)),
    hangup: (callId) => serial(() => localAction("hangup", callId)),
    setMuted: (callId, muted) =>
      serial(() => localAction("mute", callId, { muted })),
    sendDtmf: (callId, digit) =>
      serial(() => localAction("dtmf", callId, { digit })),
    setHeld: (callId, held) =>
      serial(async () => {
        requireCall(callId, ["active", "held"]);
        if (!envelope?.capabilities.hold)
          fail(
            "Hold requires an enabled backend topology; it is not a common SDK operation.",
          );
        await sendCommand("hold", callId, { held });
      }),
    setNotes: (callId, value) =>
      serial(async () => {
        requireCall(callId);
        if (!envelope?.capabilities.notes)
          fail("Notes are not enabled for this session.");
        await sendCommand("notes", callId, { text: value });
      }),
    dispose() {
      if (disposed) return;
      disposed = true;
      ++generation;
      releaseBrowser();
      session = null;
      envelope = null;
      connecting = null;
      listeners.clear();
      snapshot = frozenSnapshot({
        ...snapshot,
        connection: "disconnected",
        presence: "offline",
        error: null,
        audio: { ...snapshot.audio, microphonePermission: "unknown" },
      });
    },
  };
}
