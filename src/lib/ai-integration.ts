import { z } from "zod";
import { streamDemoReply, type DemoModel } from "@/demo/ai-adapter";

export const aiProviders = [
  { id: "demo", label: "Aureform demo" },
  { id: "ai-sdk", label: "AI SDK 7" },
  { id: "openai-responses", label: "OpenAI Responses" },
  { id: "anthropic-messages", label: "Anthropic Messages" },
  { id: "google-gemini", label: "Google Gemini" },
  { id: "vercel-gateway", label: "Vercel AI Gateway" },
  { id: "cloudflare-gateway", label: "Cloudflare AI Gateway" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "litellm", label: "LiteLLM" },
  { id: "azure-openai", label: "Azure OpenAI" },
  { id: "bedrock", label: "Amazon Bedrock" },
  { id: "vertex-ai", label: "Google Vertex AI" },
  { id: "custom", label: "Consumer backend" },
] as const;
export type AiProvider = (typeof aiProviders)[number]["id"];
export type AiProviderOptionId = AiProvider;
export const defaultAiWorkspaceId = "demo";
export type AiModelOption = {
  id: string;
  provider: AiProvider;
  label: string;
  labelEs?: string;
};
export const demoAiModels: readonly AiModelOption[] = [
  { id: "balanced", provider: "demo", label: "Aureform · Balanced", labelEs: "Aureform · Equilibrado" },
  { id: "precise", provider: "demo", label: "Aureform · Precise", labelEs: "Aureform · Preciso" },
  { id: "creative", provider: "demo", label: "Aureform · Creative", labelEs: "Aureform · Creativo" },
];

export const aiStreamLimits = {
  maxLineBytes: 64 * 1024,
  maxBytes: 2 * 1024 * 1024,
  maxEvents: 4096,
  maxRequestBytes: 2 * 1024 * 1024,
} as const;
export type AiStreamLimits = { maxLineBytes: number; maxBytes: number; maxEvents: number };
type StreamLimits = AiStreamLimits;
const encoder = new TextEncoder();
const id = z.string().min(1).max(128).regex(/^[\w.:-]+$/);
const workspaceIdSchema = z.string().min(1).max(200).refine((value) => !/[\u0000-\u001f\u007f]/.test(value));
const summary = z.string().max(3000);
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable();
const providers = aiProviders.map((provider) => provider.id);

/** Links are published references, not inline HTML, data URLs or provider payloads. */
export function isAiPublicLink(value: string) {
  if (/[\\\s]/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
const publicLink = z.string().min(1).max(2048).refine(isAiPublicLink);
/** Approved trace/proxy destinations cannot carry query credentials or fragments. */
export function isAiTraceLink(value: string) {
  if (typeof value !== "string" || value.length > 2048 || !isAiPublicLink(value)) return false;
  try {
    const url = new URL(value, "https://aureform.invalid");
    if (url.search || url.hash) return false;
    let path = url.pathname;
    for (let pass = 0; pass < 2; pass++) path = decodeURIComponent(path);
    return !path.startsWith("//") && !/[\u0000-\u0020\u007f\\]/.test(path);
  } catch {
    return false;
  }
}
const safeTraceLinkSchema = z.object({
  href: z.string().min(1).max(2048).refine(isAiTraceLink),
  label: z.string().min(1).max(128).optional(),
}).strict();
export type AiSafeTraceLink = z.infer<typeof safeTraceLinkSchema>;
const publishedBasis = z.enum(["reported", "demo"]);
const progressCount = z.number().int().min(0).max(1_000_000).nullable();
const gateways = ["vercel-gateway", "cloudflare-gateway", "openrouter", "litellm", "custom"] as const;
const modelSchema = z.object({
  id: z.string().min(1).max(256),
  provider: z.enum(providers),
}).strict();
const requestSchema = z.object({
  v: z.literal(1),
  id,
  workspaceId: workspaceIdSchema.default(defaultAiWorkspaceId),
  locale: z.enum(["en", "es"]),
  mode: z.enum(["chat", "code", "playground"]),
  model: modelSchema,
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(32 * 1024),
  }).strict()).min(1).max(64),
  system: z.string().max(16 * 1024),
  temperature: z.number().finite().min(0).max(2),
  attachments: z.array(z.object({
    name: z.string().min(1).max(256),
    mediaType: z.string().min(1).max(128),
    text: z.string().max(1024 * 1024),
  }).strict()).max(4),
}).strict().refine((request) => request.messages.at(-1)?.role === "user");
export type AiWorkspaceRequest = z.infer<typeof requestSchema>;
const approvalSchema = z.object({
  v: z.literal(1),
  requestId: id,
  workspaceId: workspaceIdSchema.default(defaultAiWorkspaceId),
  approvalId: id,
  toolId: id,
  approved: z.boolean(),
}).strict();
export type AiApprovalDecision = z.infer<typeof approvalSchema>;

const envelope = { v: z.literal(1), requestId: id, workspaceId: workspaceIdSchema.default(defaultAiWorkspaceId) };
const eventSchema = z.discriminatedUnion("type", [
  z.object({ ...envelope, type: z.literal("start") }).strict(),
  z.object({ ...envelope, type: z.literal("text"), id, delta: z.string().min(1).max(32 * 1024) }).strict(),
  z.object({
    ...envelope, type: z.literal("source"), id,
    title: z.string().min(1).max(256), url: publicLink.optional(), summary: summary.optional(),
  }).strict(),
  z.object({
    ...envelope, type: z.literal("tool"), id, name: z.string().min(1).max(128),
    state: z.enum(["pending", "running", "completed", "failed", "rejected"]),
    summary,
  }).strict(),
  z.object({
    ...envelope, type: z.literal("approval"), id, toolId: id,
    state: z.enum(["requested", "approved", "rejected"]),
    title: z.string().min(1).max(256), summary,
  }).strict(),
  z.object({
    ...envelope, type: z.literal("file"), id, name: z.string().min(1).max(256),
    mediaType: z.string().min(1).max(128), url: publicLink.optional(),
    bytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
  }).strict(),
  z.object({
    ...envelope, type: z.literal("usage"),
    basis: z.enum(["reported", "unavailable", "demo"]),
    inputTokens: count, outputTokens: count, totalTokens: count,
  }).strict(),
  z.object({
    ...envelope, type: z.literal("status"),
    state: z.enum(["queued", "generating", "waiting-approval"]), summary: summary.optional(),
  }).strict(),
  z.object({
    ...envelope, type: z.literal("routing"), id, runId: id,
    basis: z.enum(["reported", "demo", "unavailable"]),
    attempt: z.number().int().min(1).max(32).nullable(),
    gateway: z.enum(gateways).nullable(),
    provider: z.enum(providers).nullable(),
    model: z.string().min(1).max(256).nullable(),
    fallback: z.object({
      fromProvider: z.enum(providers), fromModel: z.string().min(1).max(256),
      reason: z.enum(["rate-limit", "unavailable", "timeout", "policy", "other"]),
      summary: summary.optional(),
    }).strict().nullable(),
    summary: summary.optional(),
    safeTraceLink: safeTraceLinkSchema.optional(),
  }).strict(),
  z.object({
    ...envelope, type: z.literal("progress"), id, runId: id,
    basis: publishedBasis, label: z.string().min(1).max(256), summary,
    state: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
    completed: progressCount, total: progressCount,
  }).strict(),
  z.object({
    ...envelope, type: z.literal("handoff"), id, runId: id,
    basis: publishedBasis, from: z.string().min(1).max(128), to: z.string().min(1).max(128),
    state: z.enum(["requested", "accepted", "completed", "failed", "rejected", "cancelled"]),
    summary,
  }).strict(),
  z.object({
    ...envelope, type: z.literal("complete"),
    finishReason: z.enum(["stop", "length", "content-filter", "tool-limit", "cancelled"]),
  }).strict(),
  z.object({
    ...envelope, type: z.literal("error"),
    code: z.string().min(1).max(128), message: z.string().min(1).max(3000), retryable: z.boolean(),
    runId: id.optional(), safeTraceLink: safeTraceLinkSchema.optional(),
  }).strict(),
]);
export type AiStreamEvent = z.infer<typeof eventSchema>;
type Published<T> = T extends AiStreamEvent ? Omit<T, "v" | "requestId" | "workspaceId"> : never;
/** Only public output: no reasoning, tool arguments, raw results or credentials. */
export type AiPublishedEvent = Exclude<Published<AiStreamEvent>, { type: "start" }>;
export type AiMessagePart = Exclude<Published<AiStreamEvent>, {
  type: "start" | "complete" | "error" | "usage" | "status" | "text";
}> | { type: "text"; id: string; text: string };
export type AiUsage = Extract<AiStreamEvent, { type: "usage" }>;
export type AiRoutingPart = Extract<AiMessagePart, { type: "routing" }>;
export type AiProgressPart = Extract<AiMessagePart, { type: "progress" }>;
export type AiHandoffPart = Extract<AiMessagePart, { type: "handoff" }>;
export type AiErrorDetails = Omit<Extract<AiPublishedEvent, { type: "error" }>, "type">;
export type AiMessageStatus = "streaming" | "waiting-approval" | "complete" | "incomplete" | "cancelled" | "failed";
export type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: AiMessageStatus;
  parts?: AiMessagePart[];
  usage?: AiUsage;
  activity?: "queued" | "generating" | "waiting-approval";
  activitySummary?: string;
  error?: AiErrorDetails;
};
export type AiApprovalActionState = { state: "sending" | "submitted" | "failed"; error?: string };
export type AiApprovalPart = Extract<AiMessagePart, { type: "approval" }>;
export interface AiWorkspaceAdapter {
  id: string;
  kind: "demo" | "http" | "custom";
  models: readonly AiModelOption[];
  stream(request: AiWorkspaceRequest, signal: AbortSignal): AsyncIterable<AiStreamEvent>;
  respondToApproval?(decision: AiApprovalDecision, signal: AbortSignal): Promise<void>;
}

export class AiProtocolError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AiProtocolError";
  }
}
function abortError() {
  return new DOMException("Generation cancelled", "AbortError");
}
function assertActive(signal?: AbortSignal) {
  if (signal?.aborted) throw abortError();
}
function boundedLimits(limits: Partial<StreamLimits> = {}): StreamLimits {
  const result = { ...aiStreamLimits, ...limits };
  for (const key of ["maxLineBytes", "maxBytes", "maxEvents"] as const) {
    if (!Number.isSafeInteger(result[key]) || result[key] < 1 || result[key] > aiStreamLimits[key]) {
      throw new AiProtocolError("invalid-limit", "Stream limits must be positive integers within the protocol bounds.");
    }
  }
  return result;
}
export function validateAiWorkspaceRequest(value: unknown): AiWorkspaceRequest {
  const result = requestSchema.safeParse(value);
  if (!result.success || encoder.encode(JSON.stringify(result.data)).byteLength > aiStreamLimits.maxRequestBytes) {
    throw new AiProtocolError("invalid-request", "Invalid or oversized AI workspace request.");
  }
  return result.data;
}
export function validateAiApprovalDecision(value: unknown): AiApprovalDecision {
  const result = approvalSchema.safeParse(value);
  if (!result.success) throw new AiProtocolError("invalid-approval", "Invalid AI approval decision.");
  return result.data;
}
export function validateAiEvent(value: unknown): AiStreamEvent {
  const result = eventSchema.safeParse(value);
  if (!result.success) throw new AiProtocolError("invalid-event", "Invalid NDJSON v1 event. Only published message fields are accepted.");
  const event = result.data;
  if (event.type === "usage" && event.basis === "unavailable" &&
      [event.inputTokens, event.outputTokens, event.totalTokens].some((value) => value !== null)) {
    throw new AiProtocolError("invalid-usage", "Unavailable usage cannot contain token counts.");
  }
  if (event.type === "routing") {
    if (event.basis === "unavailable" &&
        [event.attempt, event.gateway, event.provider, event.model, event.fallback, event.safeTraceLink].some((field) => field != null)) {
      throw new AiProtocolError("invalid-routing", "Unavailable routing cannot claim a target, fallback or trace.");
    }
    if (event.basis !== "unavailable" && (event.attempt === null || event.provider === null || event.model === null)) {
      throw new AiProtocolError("invalid-routing", "Published routing requires an attempt and provider/model target.");
    }
    if (event.fallback && (event.attempt === null || event.attempt < 2)) {
      throw new AiProtocolError("invalid-routing", "A published fallback must follow an earlier routing attempt.");
    }
    if (event.basis === "demo" && (event.provider !== "demo" || event.gateway !== null ||
        event.safeTraceLink || (event.fallback && event.fallback.fromProvider !== "demo"))) {
      throw new AiProtocolError("invalid-routing", "Demo routing cannot claim a real gateway, provider or trace.");
    }
  }
  if (event.type === "progress" && event.completed !== null && event.total !== null &&
      (event.completed > event.total || (event.state === "completed" && event.completed !== event.total))) {
    throw new AiProtocolError("invalid-progress", "Published progress counts must match their reported bounds and completion.");
  }
  if (event.type === "error" && event.safeTraceLink && !event.runId) {
    throw new AiProtocolError("invalid-trace", "An error trace must identify its published run.");
  }
  return event;
}
export function makeAiEvent(requestId: string, event: AiPublishedEvent | { type: "start" }, workspaceId = defaultAiWorkspaceId): AiStreamEvent {
  return validateAiEvent({ ...event, v: 1, requestId, workspaceId });
}
export function encodeAiEvent(event: AiStreamEvent): string {
  const line = JSON.stringify(validateAiEvent(event)) + "\n";
  if (encoder.encode(line).byteLength > aiStreamLimits.maxLineBytes) {
    throw new AiProtocolError("line-limit", "AI event exceeds the NDJSON line limit.");
  }
  return line;
}

class EventSequence {
  started = false;
  terminal = false;
  private events = 0;
  private bytes = 0;
  private ids = new Map<string, string>();
  private tools = new Map<string, Extract<AiStreamEvent, { type: "tool" }>>();
  private approvals = new Map<string, Extract<AiStreamEvent, { type: "approval" }>>();
  private routing = new Set<string>();
  private previousRouting: Extract<AiStreamEvent, { type: "routing" }> | undefined;
  private routeAttempt = 0;
  private runId: string | undefined;
  private progress = new Map<string, Extract<AiStreamEvent, { type: "progress" }>>();
  private handoffs = new Map<string, Extract<AiStreamEvent, { type: "handoff" }>>();
  private requestId: string;
  private workspaceId: string;
  private limits: StreamLimits;
  constructor(requestId: string, limits: StreamLimits, workspaceId = defaultAiWorkspaceId) {
    this.requestId = requestId;
    this.workspaceId = workspaceId;
    this.limits = limits;
  }
  accept(value: unknown): AiStreamEvent {
    const event = validateAiEvent(value);
    this.events++;
    const lineBytes = encoder.encode(JSON.stringify(event) + "\n").byteLength;
    this.bytes += lineBytes;
    if (lineBytes > this.limits.maxLineBytes || this.bytes > this.limits.maxBytes || this.events > this.limits.maxEvents) {
      throw new AiProtocolError("stream-limit", "AI stream exceeds its bounded size or event count.");
    }
    if (event.requestId !== this.requestId) throw new AiProtocolError("request-mismatch", "AI stream belongs to a different request.");
    if (event.workspaceId !== this.workspaceId) throw new AiProtocolError("workspace-mismatch", "AI stream belongs to a different workspace.");
    if (this.terminal) throw new AiProtocolError("after-terminal", "AI stream emitted an event after its terminal event.");
    if (!this.started) {
      if (event.type !== "start") throw new AiProtocolError("missing-start", "AI stream must begin with a start event.");
      this.started = true;
      return event;
    }
    if (event.type === "start") throw new AiProtocolError("duplicate-start", "AI stream can start only once.");
    if ("id" in event) {
      const previous = this.ids.get(event.id);
      if (previous && previous !== event.type) throw new AiProtocolError("part-conflict", "An AI message part ID cannot change type.");
      this.ids.set(event.id, event.type);
    }
    if ("runId" in event && event.runId) {
      if (this.runId && this.runId !== event.runId) {
        throw new AiProtocolError("run-mismatch", "Published AI metadata belongs to another run.");
      }
      this.runId = event.runId;
    }
    if (event.type === "routing") {
      if (this.routing.has(event.id) || (event.attempt !== null && event.attempt <= this.routeAttempt)) {
        throw new AiProtocolError("routing-replay", "Audited routing records are immutable and attempt numbers must increase.");
      }
      if (event.fallback && this.previousRouting && this.previousRouting.provider !== null &&
          (event.fallback.fromProvider !== this.previousRouting.provider || event.fallback.fromModel !== this.previousRouting.model)) {
        throw new AiProtocolError("routing-fallback", "A fallback must identify the previous published provider/model target.");
      }
      this.routing.add(event.id);
      if (event.attempt !== null) this.routeAttempt = event.attempt;
      this.previousRouting = event;
    }
    if (event.type === "progress") {
      const previous = this.progress.get(event.id);
      if (previous && (previous.basis !== event.basis || previous.label !== event.label ||
          ["completed", "failed", "cancelled"].includes(previous.state) ||
          (previous.state === "running" && event.state === "queued") ||
          (previous.completed !== null && (event.completed === null || event.completed < previous.completed)) ||
          (previous.total !== null && event.total !== previous.total))) {
        throw new AiProtocolError("progress-state", "Published progress cannot replay, regress or change its identity or total.");
      }
      this.progress.set(event.id, event);
    }
    if (event.type === "handoff") {
      const previous = this.handoffs.get(event.id);
      if ((!previous && event.state !== "requested") || (previous &&
          (previous.from !== event.from || previous.to !== event.to || previous.basis !== event.basis ||
           !["requested", "accepted"].includes(previous.state) ||
           event.state === "requested" || (previous.state === "accepted" && event.state === "accepted") ||
           (previous.state === "requested" && event.state === "completed")))) {
        throw new AiProtocolError("handoff-state", "A handoff must be requested, acknowledged and resolve without replay or identity changes.");
      }
      this.handoffs.set(event.id, event);
    }
    if (event.type === "tool") {
      const previous = this.tools.get(event.id);
      if (previous && (previous.name !== event.name || ["completed", "failed", "rejected"].includes(previous.state))) {
        throw new AiProtocolError("tool-state", "A terminal tool cannot execute again or change identity.");
      }
      if (!previous && event.state !== "pending") throw new AiProtocolError("tool-state", "A tool must first be declared pending.");
      if (previous?.state === "running" && event.state === "pending") throw new AiProtocolError("tool-state", "A running tool cannot return to pending.");
      const approval = [...this.approvals.values()].find((approval) => approval.toolId === event.id);
      if (approval && event.state !== "pending" && event.state !== "rejected" &&
          approval.state !== "approved" && event.state !== "failed") {
        throw new AiProtocolError("approval-required", "A tool must receive backend approval before execution.");
      }
      if (event.state === "rejected" && approval?.state !== "rejected") {
        throw new AiProtocolError("approval-required", "A tool rejection must be acknowledged by the backend.");
      }
      this.tools.set(event.id, event);
    }
    if (event.type === "approval") {
      const tool = this.tools.get(event.toolId);
      const previous = this.approvals.get(event.id);
      if (!tool || tool.state !== "pending" || (previous && (previous.toolId !== event.toolId || previous.state !== "requested")) ||
          (!previous && event.state !== "requested") || (previous && event.state === "requested") ||
          (!previous && [...this.approvals.values()].some((approval) => approval.toolId === event.toolId))) {
        throw new AiProtocolError("approval-state", "Approval must refer to one pending tool and resolve only once.");
      }
      this.approvals.set(event.id, event);
    }
    if (event.type === "complete" || event.type === "error") {
      if (event.type === "complete" && event.finishReason === "stop" &&
          [...this.approvals.values()].some((approval) => approval.state === "requested")) {
        throw new AiProtocolError("approval-pending", "An AI response cannot complete with an unanswered approval.");
      }
      if (event.type === "complete" && event.finishReason === "stop" &&
          [...this.tools.values()].some((tool) => tool.state === "pending" || tool.state === "running")) {
        throw new AiProtocolError("tool-pending", "An AI response cannot complete with an unfinished tool.");
      }
      if (event.type === "complete" && event.finishReason === "stop" &&
          ([...this.progress.values()].some((progress) => ["queued", "running"].includes(progress.state)) ||
           [...this.handoffs.values()].some((handoff) => ["requested", "accepted"].includes(handoff.state)))) {
        throw new AiProtocolError("run-pending", "An AI response cannot complete with unfinished published progress or handoffs.");
      }
      this.terminal = true;
    }
    return event;
  }
  finish() {
    if (!this.started || !this.terminal) throw new AiProtocolError("truncated-stream", "AI stream ended without a complete or error event.");
  }
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  assertActive(signal);
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const aborted = () => {
      signal.removeEventListener("abort", aborted);
      reject(abortError());
    };
    signal.addEventListener("abort", aborted, { once: true });
    promise.then(
      (value) => { signal.removeEventListener("abort", aborted); resolve(value); },
      (error) => { signal.removeEventListener("abort", aborted); reject(error); },
    );
  });
}
export async function* validateAiEventStream(
  events: AsyncIterable<AiStreamEvent>,
  { requestId, workspaceId = defaultAiWorkspaceId, signal, limits }: {
    requestId: string; workspaceId?: string; signal?: AbortSignal; limits?: Partial<StreamLimits>;
  },
): AsyncGenerator<AiStreamEvent> {
  const sequence = new EventSequence(requestId, boundedLimits(limits), workspaceId);
  const iterator = events[Symbol.asyncIterator]();
  try {
    for (;;) {
      assertActive(signal);
      const next = await abortable(iterator.next(), signal);
      assertActive(signal);
      if (next.done) break;
      yield sequence.accept(next.value);
    }
    sequence.finish();
  } finally {
    // Do not let an uncooperative consumer iterator delay cancellation of the UI.
    void iterator.return?.().catch(() => {});
  }
}

/** NDJSON v1 only. Native provider SSE and the AI SDK UI protocol require a backend bridge. */
export async function* parseAiNdjson(
  body: ReadableStream<Uint8Array>,
  { requestId, workspaceId = defaultAiWorkspaceId, signal, limits }: {
    requestId: string; workspaceId?: string; signal?: AbortSignal; limits?: Partial<StreamLimits>;
  },
): AsyncGenerator<AiStreamEvent> {
  const bounds = boundedLimits(limits);
  const sequence = new EventSequence(requestId, bounds, workspaceId);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const decode = (value?: Uint8Array, stream = false) => {
    try {
      return decoder.decode(value, { stream });
    } catch {
      throw new AiProtocolError("invalid-utf8", "AI stream is not valid UTF-8.");
    }
  };
  assertActive(signal);
  const reader = body.getReader();
  const cancelled = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener("abort", cancelled, { once: true });
  let buffer = "", bytes = 0;
  const parseLine = (line: string) => {
    if (encoder.encode(line).byteLength > bounds.maxLineBytes) throw new AiProtocolError("line-limit", "NDJSON line exceeds the protocol limit.");
    try {
      return sequence.accept(JSON.parse(line));
    } catch (error) {
      if (error instanceof AiProtocolError) throw error;
      throw new AiProtocolError("invalid-json", "AI endpoint returned malformed NDJSON.");
    }
  };
  try {
    for (;;) {
      assertActive(signal);
      const { value, done } = await abortable(reader.read(), signal);
      assertActive(signal);
      if (done) {
        buffer += decode();
        break;
      }
      bytes += value.byteLength;
      if (bytes > bounds.maxBytes) throw new AiProtocolError("stream-limit", "NDJSON stream exceeds the byte limit.");
      buffer += decode(value, true);
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        assertActive(signal);
        if (line.trim()) yield parseLine(line);
      }
      if (encoder.encode(buffer).byteLength > bounds.maxLineBytes) throw new AiProtocolError("line-limit", "NDJSON line exceeds the protocol limit.");
    }
    assertActive(signal);
    if (buffer.trim()) yield parseLine(buffer.replace(/\r$/, ""));
    sequence.finish();
  } catch (error) {
    if (signal?.aborted) throw abortError();
    throw error;
  } finally {
    signal?.removeEventListener("abort", cancelled);
    cancelled();
    reader.releaseLock();
  }
}

export function createHttpAiWorkspaceAdapter({
  endpoint, approvalEndpoint, models, fetch: request = globalThis.fetch,
  headers, credentials = "same-origin", limits,
}: {
  endpoint: string;
  approvalEndpoint?: string;
  models: readonly AiModelOption[];
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  limits?: Partial<StreamLimits>;
}): AiWorkspaceAdapter {
  if (!isAiPublicLink(endpoint) || (approvalEndpoint && !isAiPublicLink(approvalEndpoint)) || !models.length) {
    throw new AiProtocolError("invalid-adapter", "Supply a valid consumer endpoint and at least one model.");
  }
  for (const model of models) modelSchema.parse({ id: model.id, provider: model.provider });
  if (new Set(models.map((model) => model.id)).size !== models.length) throw new AiProtocolError("invalid-adapter", "Model IDs must be unique.");
  const bounds = boundedLimits(limits);
  const jsonHeaders = new Headers(headers);
  jsonHeaders.set("Content-Type", "application/json");
  const adapter: AiWorkspaceAdapter = {
    id: "consumer-http", kind: "http", models,
    async *stream(value, signal) {
      const input = validateAiWorkspaceRequest(value);
      if (!models.some((model) => model.id === input.model.id && model.provider === input.model.provider)) {
        throw new AiProtocolError("unknown-model", "The model is not configured on this adapter.");
      }
      const outgoing = new Headers(jsonHeaders);
      outgoing.set("Accept", "application/x-ndjson");
      assertActive(signal);
      const response = await abortable(request(endpoint, {
        method: "POST", headers: outgoing, body: JSON.stringify(input), credentials, signal,
      }), signal);
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new AiProtocolError("http-error", `AI endpoint returned HTTP ${response.status}.`);
      }
      if (response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/x-ndjson" || !response.body) {
        void response.body?.cancel().catch(() => {});
        throw new AiProtocolError("unsupported-protocol", "Expected NDJSON v1; native-provider SSE is not compatible.");
      }
      yield* parseAiNdjson(response.body, { requestId: input.id, workspaceId: input.workspaceId, signal, limits: bounds });
    },
  };
  if (approvalEndpoint) {
    adapter.respondToApproval = async (value, signal) => {
      const decision = validateAiApprovalDecision(value);
      assertActive(signal);
      const response = await abortable(request(approvalEndpoint, {
        method: "POST", headers: jsonHeaders, body: JSON.stringify(decision), credentials, signal,
      }), signal);
      void response.body?.cancel().catch(() => {});
      if (!response.ok) throw new AiProtocolError("approval-http-error", `Approval endpoint returned HTTP ${response.status}.`);
      // Acceptance is not execution. The ongoing stream must publish the decision
      // and subsequent tool states after the backend has checked its policy.
    };
  }
  return adapter;
}

export function applyAiEvent(message: AiMessage, event: AiStreamEvent): AiMessage {
  const parts = message.parts ?? [];
  const upsert = (part: AiMessagePart) => {
    const index = parts.findIndex((item) => item.id === part.id && item.type === part.type);
    return index < 0 ? [...parts, part] : parts.map((item, i) => i === index ? part : item);
  };
  switch (event.type) {
    case "start": return { ...message, status: "streaming", activity: "generating" };
    case "text": {
      const previous = parts.find((part) => part.type === "text" && part.id === event.id);
      return { ...message, content: message.content + event.delta, parts: upsert({
        type: "text", id: event.id, text: (previous?.type === "text" ? previous.text : "") + event.delta,
      }) };
    }
    case "source": case "file": case "tool": case "approval": case "routing": case "progress": case "handoff": {
      const { v, requestId, workspaceId, ...part } = event;
      if (v !== 1 || requestId !== message.id || !workspaceId) throw new AiProtocolError("request-mismatch", "Message part belongs to a different request.");
      const waiting = event.type === "approval" && event.state === "requested";
      const running = event.type === "tool" && event.state === "running";
      return { ...message, parts: upsert(part),
        ...(waiting ? { status: "waiting-approval" as const, activity: "waiting-approval" as const } : {}),
        ...(running ? { status: "streaming" as const, activity: "generating" as const } : {}),
      };
    }
    case "usage": return { ...message, usage: event };
    case "status": return { ...message, activity: event.state, activitySummary: event.summary,
      status: event.state === "waiting-approval" ? "waiting-approval" : "streaming" };
    case "complete": return { ...message, activity: undefined, activitySummary: undefined,
      status: event.finishReason === "stop" ? "complete" : event.finishReason === "cancelled" ? "cancelled" : "incomplete" };
    case "error": return { ...message, status: "failed", activity: undefined, activitySummary: undefined,
      error: { code: event.code, message: event.message, retryable: event.retryable,
        ...(event.runId ? { runId: event.runId } : {}),
        ...(event.safeTraceLink ? { safeTraceLink: event.safeTraceLink } : {}) } };
  }
}

/** Offline wrapper around the existing, independently tested text demo. */
export function createDemoAiWorkspaceAdapter({ delay, fail = false }: { delay?: number; fail?: boolean } = {}): AiWorkspaceAdapter {
  const waiting = new Map<string, { toolId: string; workspaceId: string; resolve: (approved: boolean) => void; decided: boolean }>();
  return {
    id: "aureform-demo", kind: "demo", models: demoAiModels,
    async *stream(value, signal) {
      const request = validateAiWorkspaceRequest(value);
      const l = (en: string, es: string) => request.locale === "es" ? es : en;
      const prompt = request.messages.at(-1)!.content;
      const context = request.attachments[0]
        ? `${prompt}\n\n${request.attachments[0].name}: ${request.attachments[0].text.slice(0, 1000)}` : prompt;
      const model = request.model.id as DemoModel;
      if (!demoAiModels.some((option) => option.id === model && request.model.provider === "demo")) {
        throw new AiProtocolError("unknown-model", "The demo only supports its three local model styles.");
      }
      const emit = (event: AiPublishedEvent | { type: "start" }) => makeAiEvent(request.id, event, request.workspaceId);
      assertActive(signal);
      yield emit({ type: "start" });
      yield emit({
        type: "routing", id: "demo-routing", runId: request.id, basis: "demo", attempt: 1,
        gateway: null, provider: "demo", model, fallback: null,
        summary: l("Simulated local routing. No gateway or native provider was called; trace unavailable.",
          "Ruta local simulada. No se llamó a un gateway ni a un proveedor nativo; traza no disponible."),
      });
      const progress = { type: "progress" as const, id: "demo-progress", runId: request.id, basis: "demo" as const,
        label: l("Local response", "Respuesta local"), total: 1 };
      yield emit({ ...progress, state: "running", completed: 0,
        summary: l("Simulated progress for this local response.", "Progreso simulado de esta respuesta local.") });
      const demonstrateHandoff = !fail && /\b(handoff|delegate|delegar|transferir)\b/i.test(prompt);
      const handoff = { type: "handoff" as const, id: "demo-handoff", runId: request.id, basis: "demo" as const,
        from: l("Demo coordinator", "Coordinador demo"), to: l("Demo writer", "Redactor demo") };
      if (demonstrateHandoff) {
        yield emit({ ...handoff, state: "requested", summary: l("Simulated handoff request; no external agent is connected.",
          "Solicitud de transferencia simulada; no hay un agente externo conectado.") });
        yield emit({ ...handoff, state: "accepted", summary: l("The local demonstration acknowledged the handoff.",
          "La demostración local confirmó la transferencia.") });
      }
      const toolId = "demo-draft", approvalId = "demo-draft-approval", key = `${request.id}:${approvalId}`;
      try {
        if (!fail && /\b(tool|approval|approve|send|schedule|publish|herramienta|aprobar|env[ií]a|publicar)\b/i.test(prompt)) {
          const decision = new Promise<boolean>((resolve) => waiting.set(key, { toolId, workspaceId: request.workspaceId, resolve, decided: false }));
          yield emit({ type: "tool", id: toolId, name: "prepare_demo_draft", state: "pending",
            summary: l("Prepare a local example draft. Nothing will be sent or published.", "Prepara un borrador local de ejemplo. No se enviará ni publicará nada.") });
          const approval = { type: "approval" as const, id: approvalId, toolId,
            title: l("Prepare this demo draft?", "¿Preparar este borrador de ejemplo?"),
            summary: l("This demonstrates a backend approval round-trip without an external action.", "Muestra el recorrido de aprobación sin ninguna acción externa.") };
          yield emit({ ...approval, state: "requested" });
          const approved = await abortable(decision, signal);
          yield emit({ ...approval, state: approved ? "approved" : "rejected" });
          if (approved) {
            yield emit({ type: "tool", id: toolId, name: "prepare_demo_draft", state: "running", summary: l("Preparing the local example.", "Preparando el ejemplo local.") });
            yield emit({ type: "tool", id: toolId, name: "prepare_demo_draft", state: "completed", summary: l("Local draft prepared. No external action occurred.", "Borrador local preparado. No hubo ninguna acción externa.") });
          } else {
            yield emit({ type: "tool", id: toolId, name: "prepare_demo_draft", state: "rejected", summary: l("Draft preparation declined. Continuing with text only.", "Preparación rechazada. Se continúa solo con texto.") });
          }
        }
        let text = "";
        for await (const delta of streamDemoReply(request.system ? `${request.system}\n${context}` : context, {
          locale: request.locale, model, signal, delay, fail,
          mode: request.mode === "code" ? "code" : "chat", temperature: request.temperature,
        })) {
          assertActive(signal);
          text += delta;
          yield emit({ type: "text", id: "answer", delta });
        }
        yield emit({ type: "source", id: "demo-reference",
          title: l("Example reference · Aureform documentation", "Referencia de ejemplo · Documentación de Aureform"),
          url: `/${request.locale}/docs/installation/`,
          summary: l("A local example citation, not a web search result.", "Una cita local de ejemplo; no es un resultado de búsqueda web.") });
        if (request.mode === "code") yield emit({ type: "file", id: "demo-file", name: "Summary.tsx", mediaType: "text/tsx" });
        const inputTokens = Math.ceil(context.length / 4), outputTokens = Math.ceil(text.length / 4);
        yield emit({ type: "usage", basis: "demo", inputTokens, outputTokens, totalTokens: inputTokens + outputTokens });
        if (demonstrateHandoff) yield emit({ ...handoff, state: "completed",
          summary: l("Simulated handoff completed locally. No external agent executed.",
            "Transferencia simulada completada localmente. No se ejecutó un agente externo.") });
        yield emit({ ...progress, state: "completed", completed: 1,
          summary: l("The local example response is complete.", "La respuesta local de ejemplo está completa.") });
        yield emit({ type: "complete", finishReason: "stop" });
      } finally {
        waiting.delete(key);
      }
    },
    async respondToApproval(value, signal) {
      assertActive(signal);
      const decision = validateAiApprovalDecision(value);
      const pending = waiting.get(`${decision.requestId}:${decision.approvalId}`);
      if (!pending || pending.toolId !== decision.toolId || pending.workspaceId !== decision.workspaceId || pending.decided) {
        throw new AiProtocolError("approval-unavailable", "This demo approval is no longer pending.");
      }
      pending.decided = true;
      pending.resolve(decision.approved);
    },
  };
}

export type AiInferenceHandler = (request: AiWorkspaceRequest, signal: AbortSignal) => AsyncIterable<AiPublishedEvent>;
/** Consumer backend recipe: encode normalized public output, never native SSE. */
export function createAiProtocolResponse(
  value: AiWorkspaceRequest, infer: AiInferenceHandler, { signal }: { signal?: AbortSignal } = {},
): Response {
  const request = validateAiWorkspaceRequest(value);
  const controller = new AbortController();
  const aborted = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", aborted, { once: true });
  const events = async function* () {
    yield makeAiEvent(request.id, { type: "start" }, request.workspaceId);
    for await (const event of infer(request, controller.signal)) yield makeAiEvent(request.id, event, request.workspaceId);
  };
  const stream = validateAiEventStream(events(), { requestId: request.id, workspaceId: request.workspaceId, signal: controller.signal });
  let terminal = false;
  const clean = () => signal?.removeEventListener("abort", aborted);
  return new Response(new ReadableStream<Uint8Array>({
    async pull(output) {
      try {
        const next = await stream.next();
        if (next.done) { clean(); output.close(); return; }
        terminal = next.value.type === "complete" || next.value.type === "error";
        output.enqueue(encoder.encode(encodeAiEvent(next.value)));
      } catch (error) {
        clean();
        if (controller.signal.aborted) { output.error(abortError()); return; }
        if (terminal) { output.error(new AiProtocolError("after-terminal", "Inference failed after its terminal event.")); return; }
        output.enqueue(encoder.encode(encodeAiEvent(makeAiEvent(request.id, {
          type: "error", code: error instanceof AiProtocolError ? error.code : "inference-error",
          message: "The inference handler could not complete this response.", retryable: true,
        }, request.workspaceId))));
        output.close();
      }
    },
    cancel() { controller.abort(); clean(); void stream.return(undefined).catch(() => {}); },
  }), { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

/** Bounded request decoding for the executable consumer HTTP bridge. */
export async function readAiJsonBody(request: Request): Promise<unknown> {
  if (!request.body) throw new AiProtocolError("invalid-request", "A JSON body is required.");
  const reader = request.body.getReader(), decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0, text = "";
  try {
    for (;;) {
      const { value, done } = await abortable(reader.read(), request.signal);
      assertActive(request.signal);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > aiStreamLimits.maxRequestBytes) throw new AiProtocolError("request-limit", "AI request exceeds its byte limit.");
      text += decoder.decode(value, { stream: true });
    }
    assertActive(request.signal);
    return JSON.parse(text + decoder.decode());
  } catch (error) {
    if (request.signal.aborted) throw abortError();
    if (error instanceof AiProtocolError) throw error;
    throw new AiProtocolError("invalid-request", "AI request must contain valid UTF-8 JSON.");
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
