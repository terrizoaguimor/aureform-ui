import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const sourceRoot = new URL("../src/", import.meta.url);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/link") return nextResolve("next/link.js", context);
    if (specifier.startsWith("@/") || (specifier.startsWith(".") && context.parentURL?.startsWith(sourceRoot.href))) {
      const base = specifier.startsWith("@/") ? new URL(specifier.slice(2), sourceRoot) : new URL(specifier, context.parentURL);
      if (existsSync(base) && statSync(base).isFile()) return nextResolve(base.href, context);
      for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
        if (existsSync(new URL(base.href + suffix))) return nextResolve(base.href + suffix, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(sourceRoot.href) && url.endsWith(".css")) {
      return { format: "module", source: "export default {};", shortCircuit: true };
    }
    if (url.startsWith(sourceRoot.href) && url.endsWith(".json")) {
      return { format: "module", source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`, shortCircuit: true };
    }
    if (url.startsWith(sourceRoot.href) && url.endsWith(".tsx")) {
      return {
        format: "module", shortCircuit: true,
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
        }).outputText,
      };
    }
    return nextLoad(url, context);
  },
});
after(() => hooks.deregister());
const ai = await import("../src/lib/ai-integration.ts");
const { streamDemoReply } = await import("../src/demo/ai-adapter.ts");
const { AiMessageParts } = await import("../src/components/blocks/ai-message-parts.tsx");
const { AIWorkspace } = await import("../src/components/templates/ai-workspace.tsx");
const { NextIntlClientProvider } = await import("next-intl");
const { AppearanceProvider } = await import("../src/components/appearance-provider.tsx");
const { messages } = await import("../src/i18n/messages.ts");

function request(overrides = {}) {
  return {
    v: 1, id: "request-1", workspaceId: "demo", locale: "en", mode: "chat",
    model: { id: "balanced", provider: "demo" },
    messages: [{ role: "user", content: "A thoughtful beginning" }],
    system: "", temperature: 0.7, attachments: [], ...overrides,
  };
}
const event = (value, requestId = "request-1") => ({ v: 1, requestId, workspaceId: "demo", ...value });
const start = () => event({ type: "start" });
const complete = (finishReason = "stop") => event({ type: "complete", finishReason });
const tool = (state = "pending") => event({ type: "tool", id: "draft", name: "prepare_draft", state, summary: "Published tool summary." });
const approval = (state = "requested") => event({
  type: "approval", id: "approval-1", toolId: "draft", state,
  title: "Prepare this draft?", summary: "No external action until approved.",
});
const routing = (overrides = {}) => event({
  type: "routing", id: "route-1", runId: "run-1", basis: "reported", attempt: 1,
  gateway: "vercel-gateway", provider: "openai-responses", model: "approved-primary",
  fallback: null, summary: "Published routing record.", ...overrides,
});
const fallback = (overrides = {}) => routing({
  id: "route-2", attempt: 2, provider: "anthropic-messages", model: "approved-backup",
  fallback: { fromProvider: "openai-responses", fromModel: "approved-primary", reason: "rate-limit",
    summary: "The backend selected an authorized alternative." },
  ...overrides,
});
const progress = (state = "queued", overrides = {}) => event({
  type: "progress", id: "progress-1", runId: "run-1", basis: "reported",
  label: "Authorized response", summary: "Published progress summary.",
  state, completed: 0, total: 2, ...overrides,
});
const handoff = (state = "requested", overrides = {}) => event({
  type: "handoff", id: "handoff-1", runId: "run-1", basis: "reported",
  from: "Coordinator", to: "Writer", state, summary: "Published transfer summary.", ...overrides,
});
async function collect(events) {
  const output = [];
  for await (const value of events) output.push(value);
  return output;
}
function bytes(text, split = Infinity, onCancel) {
  const data = new TextEncoder().encode(text);
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= data.length) { controller.close(); return; }
      const size = Math.min(split, data.length - offset);
      controller.enqueue(data.slice(offset, offset + size));
      offset += size;
    },
    cancel: onCancel,
  });
}
function ndjson(events, { split, tail = true } = {}) {
  return bytes(events.map((value) => JSON.stringify(value)).join("\r\n") + (tail ? "\r\n" : ""), split);
}
const parse = (body, options = {}) => ai.parseAiNdjson(body, { requestId: "request-1", ...options });
function reduce(events) {
  return events.reduce(ai.applyAiEvent, { id: "request-1", role: "assistant", content: "", parts: [], status: "streaming" });
}
function render(message, locale = "en", props = {}) {
  return renderToStaticMarkup(createElement(AiMessageParts, { message, locale, ...props }));
}

test("provider-aware model options cover the SDK, native APIs and configured gateways", () => {
  const providers = ai.aiProviders.map((provider) => provider.id);
  for (const id of ["ai-sdk", "openai-responses", "anthropic-messages", "google-gemini", "vercel-gateway", "cloudflare-gateway", "openrouter", "litellm"]) {
    assert.ok(providers.includes(id), id);
  }
  assert.deepEqual(ai.demoAiModels.map((option) => option.id), ["balanced", "precise", "creative"]);
  assert.throws(() => ai.createHttpAiWorkspaceAdapter({ endpoint: "/backend/chat", models: [] }), /at least one model/);
  assert.throws(() => ai.createHttpAiWorkspaceAdapter({
    endpoint: "/backend/chat", models: [...ai.demoAiModels, ai.demoAiModels[0]],
  }), /unique/);
});

test("NDJSON v1 handles every byte boundary, CRLF, Unicode and an un-terminated final line", async () => {
  const events = [
    start(), event({ type: "status", state: "generating", summary: "Working." }),
    event({ type: "text", id: "answer", delta: "Hola café 👋" }),
    event({ type: "source", id: "reference", title: "Published source", url: "https://example.test/reference" }),
    tool(), tool("running"), tool("completed"),
    event({ type: "file", id: "file", name: "summary.txt", mediaType: "text/plain", url: "/files/summary.txt", bytes: 20 }),
    event({ type: "usage", basis: "reported", inputTokens: 0, outputTokens: null, totalTokens: null }),
    complete(),
  ];
  for (const split of [1, 7, 64, Infinity]) {
    assert.deepEqual(await collect(parse(ndjson(events, { split, tail: false }))), events);
  }
  const message = reduce(events);
  assert.equal(message.content, "Hola café 👋");
  assert.equal(message.status, "complete");
  assert.equal(message.usage.inputTokens, 0);
  assert.equal(message.usage.totalTokens, null);
  assert.deepEqual(message.parts.map((part) => part.type), ["text", "source", "tool", "file"]);
});

test("invalid JSON, versions, unknown parts and private tool payloads never reach the UI", async () => {
  for (const bad of [
    { ...start(), v: 2 },
    event({ type: "reasoning", text: "Not public." }),
    { ...tool(), arguments: { account: "private" } },
    event({ type: "source", id: "bad", title: "Invalid URL", url: "javascript:alert(1)" }),
    event({ type: "usage", basis: "unavailable", inputTokens: 1, outputTokens: null, totalTokens: null }),
    { ...complete(), requestId: "other-request" },
  ]) await assert.rejects(collect(parse(ndjson([start(), bad, complete()]))), ai.AiProtocolError);
  await assert.rejects(collect(parse(bytes('{"v":1,\n'))), /malformed NDJSON/);
  await assert.rejects(collect(parse(bytes("data: {\"type\":\"text\"}\n\n"))), /malformed NDJSON/);
  const origin = new URL("https://example.test");
  origin.username = "test-user";
  origin.password = "fixture";
  assert.throws(() => ai.validateAiEvent(event({ type: "source", id: "private", title: "Invalid reference", url: origin.href })), ai.AiProtocolError);
});

test("terminal events are mandatory and never convert incomplete or failed output into success", async () => {
  for (const events of [[], [start()], [event({ type: "text", id: "text", delta: "Hi" })],
    [start(), complete(), complete()], [start(), complete(), event({ type: "text", id: "text", delta: "Late" })]]) {
    await assert.rejects(collect(parse(ndjson(events))), ai.AiProtocolError);
  }
  const failure = event({ type: "error", code: "provider-unavailable", message: "Please try again later.", retryable: true });
  assert.equal(reduce(await collect(parse(ndjson([start(), failure])))).status, "failed");
  assert.equal(reduce(await collect(parse(ndjson([start(), complete("length")])))).status, "incomplete");
  assert.equal(reduce(await collect(parse(ndjson([start(), complete("cancelled")])))).status, "cancelled");
});

test("NDJSON is bounded by line bytes, total bytes, event count and valid UTF-8", async () => {
  await assert.rejects(collect(parse(ndjson([start(), event({ type: "text", id: "text", delta: "a".repeat(300) }), complete()]), {
    limits: { maxLineBytes: 128 },
  })), /limit/);
  await assert.rejects(collect(parse(bytes("\n".repeat(160)), { limits: { maxBytes: 128 } })), /byte limit/);
  await assert.rejects(collect(parse(ndjson([start(), event({ type: "text", id: "text", delta: "Hi" }), complete()]), {
    limits: { maxEvents: 2 },
  })), /event count/);
  await assert.rejects(collect(parse(ndjson([start(), complete()]), { limits: { maxBytes: Infinity } })), /positive integers/);
  const invalid = new ReadableStream({ start(controller) { controller.enqueue(Uint8Array.from([0xff])); controller.close(); } });
  await assert.rejects(collect(parse(invalid)), /valid UTF-8/);
});

test("cancellation releases a stalled reader and prevents another buffered event", async () => {
  let cancelled = false;
  const controller = new AbortController();
  const body = new ReadableStream({
    start(stream) { stream.enqueue(new TextEncoder().encode(JSON.stringify(start()) + "\n")); },
    cancel() { cancelled = true; },
  });
  const stream = parse(body, { signal: controller.signal });
  assert.equal((await stream.next()).value.type, "start");
  const pending = stream.next();
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(cancelled, true);
  const bufferedController = new AbortController();
  const buffered = parse(ndjson([start(), event({ type: "text", id: "text", delta: "Late" }), complete()]), {
    signal: bufferedController.signal,
  });
  await buffered.next();
  bufferedController.abort();
  await assert.rejects(buffered.next(), { name: "AbortError" });
});

test("custom injected iterators cancel even if their next operation ignores the signal", async () => {
  let returned = false;
  const controller = new AbortController();
  const events = {
    [Symbol.asyncIterator]() {
      return {
        next: () => new Promise(() => {}),
        return: async () => { returned = true; return { done: true }; },
      };
    },
  };
  const stream = ai.validateAiEventStream(events, { requestId: "request-1", signal: controller.signal });
  const pending = stream.next();
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(returned, true);
});

test("tools cannot run before backend approval, replay decisions or finish while approval is pending", async () => {
  for (const events of [
    [start(), approval(), complete()],
    [start(), tool(), approval(), tool("running"), complete()],
    [start(), tool(), approval(), complete()],
    [start(), tool(), complete()],
    [start(), tool(), approval(), approval("rejected"), tool("running"), complete()],
    [start(), tool(), approval(), approval("approved"), approval("approved"), complete()],
  ]) await assert.rejects(collect(parse(ndjson(events))), ai.AiProtocolError);
  const approved = [start(), tool(), approval(), approval("approved"), tool("running"), tool("completed"), complete()];
  assert.deepEqual(await collect(parse(ndjson(approved))), approved);
  const denied = [start(), tool(), approval(), approval("rejected"), tool("rejected"), complete()];
  assert.deepEqual(await collect(parse(ndjson(denied))), denied);
});

test("HTTP transport posts consumer model/context and explicit approval or rejection without native SSE assumptions", async () => {
  const calls = [];
  const adapter = ai.createHttpAiWorkspaceAdapter({
    endpoint: "/backend/ai", approvalEndpoint: "/backend/approve",
    models: [{ id: "primary", provider: "openai-responses", label: "Configured model" }],
    fetch: async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      if (url === "/backend/approve") return new Response(null, { status: 204 });
      return new Response(ndjson([start(), complete()]), { headers: { "Content-Type": "application/x-ndjson; charset=utf-8" } });
    },
  });
  const controller = new AbortController();
  const input = request({
    model: { id: "primary", provider: "openai-responses" }, system: "A public instruction.",
    attachments: [{ name: "note.txt", mediaType: "text/plain", text: "Attached context." }],
  });
  await collect(adapter.stream(input, controller.signal));
  assert.deepEqual(calls[0].body, input);
  assert.equal(calls[0].init.signal, controller.signal);
  assert.equal(calls[0].init.headers.get("Accept"), "application/x-ndjson");
  for (const approved of [true, false]) {
    await adapter.respondToApproval({ v: 1, requestId: input.id, approvalId: "approval-1", toolId: "draft", approved }, controller.signal);
    assert.equal(calls.at(-1).body.approved, approved);
    assert.equal(calls.at(-1).url, "/backend/approve");
  }
  const before = calls.length;
  controller.abort();
  await assert.rejects(collect(adapter.stream(input, controller.signal)), { name: "AbortError" });
  assert.equal(calls.length, before);
});

test("workspace identity travels through requests, streams and approval decisions and rejects another tenant", async () => {
  const workspaceId = "workspace-alpha", calls = [];
  const input = request({ workspaceId, model: { id: "primary", provider: "openai-responses" } });
  const adapter = ai.createHttpAiWorkspaceAdapter({
    endpoint: "/backend/ai", approvalEndpoint: "/backend/approve",
    models: [{ id: "primary", provider: "openai-responses", label: "Consumer model" }],
    fetch: async (url, init) => {
      calls.push(JSON.parse(init.body));
      return url.endsWith("approve") ? new Response(null, { status: 204 })
        : ai.createAiProtocolResponse(JSON.parse(init.body), async function* (received) {
          assert.equal(received.workspaceId, workspaceId);
          yield { type: "complete", finishReason: "stop" };
        });
    },
  });
  const signal = new AbortController().signal;
  const events = await collect(adapter.stream(input, signal));
  assert.ok(events.every((value) => value.workspaceId === workspaceId));
  await adapter.respondToApproval({
    v: 1, workspaceId, requestId: input.id, approvalId: "approval-1", toolId: "draft", approved: false,
  }, signal);
  assert.equal(calls[0].workspaceId, workspaceId);
  assert.equal(calls[1].workspaceId, workspaceId);
  await assert.rejects(collect(parse(ndjson(events))), /different workspace/);
  assert.deepEqual(await collect(parse(ndjson(events), { workspaceId })), events);
  await assert.rejects(collect(ai.validateAiEventStream((async function* () { yield* events; })(), {
    requestId: input.id, workspaceId: "workspace-beta",
  })), /different workspace/);
  const legacy = { ...request() };
  delete legacy.workspaceId;
  assert.equal(ai.validateAiWorkspaceRequest(legacy).workspaceId, ai.defaultAiWorkspaceId);
  assert.equal(ai.validateAiWorkspaceRequest(request({ workspaceId: "organization/acmé/workspace-1" })).workspaceId,
    "organization/acmé/workspace-1");
  for (const workspaceId of ["", "workspace\nalpha", "a".repeat(201)]) {
    assert.throws(() => ai.validateAiWorkspaceRequest(request({ workspaceId })), ai.AiProtocolError);
  }
});

test("HTTP failures, SSE responses and failed approval submissions remain explicit", async () => {
  for (const response of [
    () => new Response("Upstream failed", { status: 503 }),
    () => new Response("data: native-event\n\n", { headers: { "Content-Type": "text/event-stream" } }),
    () => new Response("", { headers: { "Content-Type": "application/x-ndjson-other" } }),
  ]) {
    const adapter = ai.createHttpAiWorkspaceAdapter({
      endpoint: "/backend/ai", models: ai.demoAiModels, fetch: async () => response(),
    });
    await assert.rejects(collect(adapter.stream(request(), new AbortController().signal)), ai.AiProtocolError);
    assert.equal(adapter.respondToApproval, undefined);
  }
  const adapter = ai.createHttpAiWorkspaceAdapter({
    endpoint: "/backend/ai", approvalEndpoint: "/backend/approve", models: ai.demoAiModels,
    fetch: async () => new Response(null, { status: 409 }),
  });
  await assert.rejects(adapter.respondToApproval({
    v: 1, requestId: "request-1", approvalId: "approval-1", toolId: "draft", approved: true,
  }, new AbortController().signal), /HTTP 409/);
});

test("demo keeps the original chat/code/playground, system and text-attachment outputs", async () => {
  for (const [mode, locale, model] of [["chat", "en", "balanced"], ["code", "es", "precise"], ["playground", "en", "creative"]]) {
    const input = request({
      mode, locale, model: { id: model, provider: "demo" }, system: "Be concise.", temperature: 0.2,
      attachments: [{ name: "note.txt", mediaType: "text/plain", text: "Attached reference." }],
    });
    const adapter = ai.createDemoAiWorkspaceAdapter({ delay: 0 });
    const events = await collect(ai.validateAiEventStream(adapter.stream(input, new AbortController().signal), { requestId: input.id }));
    let original = "";
    for await (const chunk of streamDemoReply("Be concise.\nA thoughtful beginning\n\nnote.txt: Attached reference.", {
      mode: mode === "code" ? "code" : "chat", locale, model, temperature: 0.2, delay: 0, signal: new AbortController().signal,
    })) original += chunk;
    const message = reduce(events);
    assert.equal(message.content, original);
    assert.equal(message.status, "complete");
    assert.equal(message.usage.basis, "demo");
    assert.ok(message.parts.some((part) => part.type === "source"));
    assert.match(render(message, locale), locale === "es" ? /sin consumo facturable/ : /no billable usage/);
  }
  await assert.rejects(collect(ai.createDemoAiWorkspaceAdapter({ delay: 0, fail: true }).stream(request(), new AbortController().signal)), /simulated/);
});

test("demo approval and rejection use the injected decision path and cancellation closes an unanswered approval", async () => {
  for (const approved of [true, false]) {
    const adapter = ai.createDemoAiWorkspaceAdapter({ delay: 0 });
    const input = request({ messages: [{ role: "user", content: "Use a tool to prepare a draft" }] });
    const controller = new AbortController(), received = [];
    for await (const value of ai.validateAiEventStream(adapter.stream(input, controller.signal), { requestId: input.id, signal: controller.signal })) {
      received.push(value);
      if (value.type === "approval" && value.state === "requested") {
        await assert.rejects(adapter.respondToApproval({ v: 1, requestId: "other", approvalId: value.id, toolId: value.toolId, approved }, controller.signal), /no longer pending/);
        const decision = { v: 1, requestId: input.id, approvalId: value.id, toolId: value.toolId, approved };
        await adapter.respondToApproval(decision, controller.signal);
        await assert.rejects(adapter.respondToApproval(decision, controller.signal), /no longer pending/);
      }
    }
    assert.ok(received.some((value) => value.type === "tool" && value.state === (approved ? "completed" : "rejected")));
    assert.equal(reduce(received).status, "complete");
  }
  const adapter = ai.createDemoAiWorkspaceAdapter({ delay: 0 }), controller = new AbortController();
  const input = request({ messages: [{ role: "user", content: "Approve a tool" }] });
  const stream = ai.validateAiEventStream(adapter.stream(input, controller.signal), { requestId: input.id, signal: controller.signal });
  let value;
  do { value = (await stream.next()).value; } while (value.type !== "approval");
  const waiting = stream.next();
  controller.abort();
  await assert.rejects(waiting, { name: "AbortError" });
});

test("the executable inference bridge round-trips public events and makes missing terminal output an error", async () => {
  const infer = async function* (_request, signal) {
    assert.equal(signal.aborted, false);
    yield { type: "text", id: "answer", delta: "Supplied inference." };
    yield { type: "usage", basis: "unavailable", inputTokens: null, outputTokens: null, totalTokens: null };
    yield { type: "complete", finishReason: "stop" };
  };
  const response = ai.createAiProtocolResponse(request(), infer);
  assert.match(response.headers.get("Content-Type"), /application\/x-ndjson/);
  assert.equal(reduce(await collect(parse(response.body))).content, "Supplied inference.");
  for (const infer of [
    async function* () { yield { type: "text", id: "answer", delta: "Interrupted" }; },
    async function* () { throw new Error("Internal inference detail"); },
  ]) {
    const events = await collect(parse(ai.createAiProtocolResponse(request(), infer).body));
    assert.equal(events.at(-1).type, "error");
    assert.doesNotMatch(JSON.stringify(events), /Internal inference detail/);
    assert.equal(reduce(events).status, "failed");
  }
});

test("the documented HTTP bridge is executable and enforces workspace authorization before inference or approval", async () => {
  const doc = readFileSync(new URL("../docs/integrations/ai.md", import.meta.url), "utf8");
  const source = doc.match(/<!-- executable-ai-bridge -->\s*```ts\n([\s\S]*?)\n```/)?.[1];
  assert.ok(source, "The documented consumer bridge must stay executable.");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const { createConsumerAiHandler } = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
  let inferenceCalls = 0, approvalCalls = 0, resolveDecision;
  const handler = createConsumerAiHandler({
    authorize: async (_request, workspaceId) => workspaceId === "workspace-alpha",
    infer: async function* (input, signal) {
      inferenceCalls++;
      assert.equal(input.workspaceId, "workspace-alpha");
      assert.equal(signal.aborted, false);
      const decision = new Promise((resolve) => { resolveDecision = resolve; });
      yield { type: "tool", id: "draft", name: "prepare_draft", state: "pending", summary: "Awaiting decision." };
      yield { type: "approval", id: "approval-1", toolId: "draft", state: "requested", title: "Prepare draft?", summary: "A reviewed local test." };
      const approved = await decision;
      yield { type: "approval", id: "approval-1", toolId: "draft", state: approved ? "approved" : "rejected",
        title: "Prepare draft?", summary: "Published decision." };
      yield { type: "tool", id: "draft", name: "prepare_draft", state: approved ? "completed" : "rejected", summary: "Published outcome." };
      yield { type: "text", id: "answer", delta: "Authorized published output." };
      yield { type: "complete", finishReason: "stop" };
    },
    decide: async (decision, signal) => {
      approvalCalls++;
      assert.equal(signal.aborted, false);
      assert.equal(decision.workspaceId, "workspace-alpha");
      assert.equal(decision.requestId, "request-1");
      assert.equal(decision.toolId, "draft");
      resolveDecision(decision.approved);
    },
  });
  const send = (path, input, headers = { "Content-Type": "application/json" }) => handler(new Request(
    new URL(path, "https://example.test"), { method: "POST", headers, body: JSON.stringify(input) },
  ));
  assert.equal((await send("/backend/ai", request())).status, 403);
  assert.equal((await send("/backend/ai/approvals", {
    v: 1, workspaceId: "workspace-beta", requestId: "request-1", approvalId: "approval-1", toolId: "draft", approved: true,
  })).status, 403);
  assert.equal(inferenceCalls, 0);
  assert.equal(approvalCalls, 0);
  assert.equal((await send("/backend/ai", { ...request(), credentials: "not accepted" })).status, 400);
  assert.equal((await send("/backend/ai", request(), { "Content-Type": "text/plain" })).status, 415);
  assert.equal((await handler(new Request("https://example.test/backend/ai"))).status, 405);
  assert.equal((await handler(new Request("https://example.test/elsewhere"))).status, 404);
  const adapter = ai.createHttpAiWorkspaceAdapter({
    endpoint: "/backend/ai", approvalEndpoint: "/backend/ai/approvals", models: ai.demoAiModels,
    fetch: async (path, init) => handler(new Request(new URL(path, "https://example.test"), init)),
  });
  const received = [], signal = new AbortController().signal;
  for await (const value of adapter.stream(request({ workspaceId: "workspace-alpha" }), signal)) {
    received.push(value);
    if (value.type === "approval" && value.state === "requested") {
      await adapter.respondToApproval({
        v: 1, workspaceId: value.workspaceId, requestId: value.requestId, approvalId: value.id, toolId: value.toolId, approved: false,
      }, signal);
    }
  }
  assert.equal(inferenceCalls, 1);
  assert.equal(approvalCalls, 1);
  assert.equal(reduce(received).status, "complete");
  assert.ok(received.some((value) => value.type === "tool" && value.state === "rejected"));
  assert.ok(received.every((value) => value.workspaceId === "workspace-alpha"));
});

test("cancelling the executable response aborts the supplied inference signal", async () => {
  let inferenceSignal;
  const controller = new AbortController();
  const infer = async function* (_input, signal) {
    inferenceSignal = signal;
    yield { type: "text", id: "answer", delta: "Partial public output." };
    await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
  };
  const response = ai.createAiProtocolResponse(request(), infer, { signal: controller.signal });
  const reader = response.body.getReader();
  await reader.read();
  await reader.read();
  await reader.cancel();
  assert.equal(inferenceSignal.aborted, true);
  reader.releaseLock();
  const cancelled = new AbortController();
  cancelled.abort();
  const result = ai.createAiProtocolResponse(request(), infer, { signal: cancelled.signal });
  await assert.rejects(result.text(), { name: "AbortError" });
});

test("consumer request parsing is bounded and rejected data never reaches inference", async () => {
  const input = new Request("https://example.test/backend", { method: "POST", body: JSON.stringify(request()) });
  assert.deepEqual(ai.validateAiWorkspaceRequest(await ai.readAiJsonBody(input)), request());
  assert.throws(() => ai.validateAiWorkspaceRequest({ ...request(), credentials: "not allowed" }), ai.AiProtocolError);
  assert.throws(() => ai.validateAiWorkspaceRequest({ ...request(), messages: [] }), ai.AiProtocolError);
  const oversized = new Request("https://example.test/backend", { method: "POST", body: "x".repeat(ai.aiStreamLimits.maxRequestBytes + 1) });
  await assert.rejects(ai.readAiJsonBody(oversized), /byte limit/);
});

test("structured UI localizes approvals, preserves unknown usage and renders only escaped summaries", () => {
  const message = reduce([start(), tool(), approval(), event({ type: "text", id: "text", delta: "<script>not HTML</script>" }),
    event({ type: "usage", basis: "reported", inputTokens: 0, outputTokens: null, totalTokens: null })]);
  for (const locale of ["en", "es"]) {
    const output = render(message, locale, { onApprovalDecision: () => {} });
    assert.match(output, locale === "es" ? /Aprobar herramienta/ : /Approve tool/);
    assert.match(output, locale === "es" ? /Rechazar herramienta/ : /Reject tool/);
    assert.match(output, /&lt;script&gt;/);
    assert.doesNotMatch(output, /<script>|arguments|reasoning/);
    assert.match(output, locale === "es" ? /Costo no disponible/ : /Cost unavailable/);
    assert.match(output, locale === "es" ? /aria-label="Desconocido"/ : /aria-label="Unknown"/);
    assert.match(render({ ...message, usage: undefined }, locale), locale === "es" ? /Consumo no disponible/ : /Usage unavailable/);
    assert.match(render(message, locale), locale === "es" ? /no está activa/ : /not active/);
    const pending = render(message, locale, { onApprovalDecision: () => {}, approvalActions: { "approval-1": { state: "submitted" } } });
    assert.match(pending, locale === "es" ? /Esperando confirmación/ : /Waiting for backend confirmation/);
    assert.match(pending, /disabled=""/);
  }
});

test("default modes retain their composer labels while injected models are client-owned", () => {
  for (const mode of ["chat", "code", "playground"]) {
    const output = renderToStaticMarkup(createElement(NextIntlClientProvider, { locale: "en", messages: messages.en, timeZone: "America/Bogota" },
      createElement(AppearanceProvider, null, createElement(AIWorkspace, { mode }))));
    assert.match(output, /aria-label="Your message"/);
    assert.match(output, /aria-label="Send message"/);
    assert.match(output, /aria-label="Choose demo model"/);
    assert.match(output, /Simulated responses/);
  }
  const adapter = ai.createHttpAiWorkspaceAdapter({ endpoint: "/backend/ai",
    models: [{ id: "primary", provider: "anthropic-messages", label: "Configured primary", labelEs: "Principal configurado" }] });
  const output = renderToStaticMarkup(createElement(NextIntlClientProvider, { locale: "es", messages: messages.es, timeZone: "America/Bogota" },
    createElement(AppearanceProvider, null, createElement(AIWorkspace, { adapter }))));
  assert.match(output, /Elegir proveedor y modelo/);
  assert.match(output, /Principal configurado/);
  assert.match(output, /Adaptador del consumidor/);
  assert.doesNotMatch(output, /Respuestas simuladas/);
});

test("a selected integration without an AI adapter stays unconfigured, injected demos stay visibly simulated and initial model IDs are exact", () => {
  const workspace = (props) => renderToStaticMarkup(createElement(NextIntlClientProvider, {
    locale: "en", messages: messages.en, timeZone: "America/Bogota",
  }, createElement(AppearanceProvider, null, createElement(AIWorkspace, props))));
  const missing = workspace({ providerOptionId: "openai-native", workspaceId: "workspace-alpha" });
  assert.match(missing, /data-ai-connection="unconfigured"/);
  assert.match(missing, /data-ai-workspace="workspace-alpha"/);
  assert.match(missing, /fieldset disabled=""/);
  assert.match(missing, /connection for integration reports does not configure AI/);
  assert.doesNotMatch(missing, /Simulated responses/);
  const demo = workspace({ providerOptionId: "ai-sdk", adapter: ai.createDemoAiWorkspaceAdapter() });
  assert.match(demo, /data-ai-connection="demo"/);
  assert.match(demo, /Simulated responses/);
  assert.doesNotMatch(demo, /Consumer adapter/);
  const adapter = ai.createHttpAiWorkspaceAdapter({ endpoint: "/backend/ai",
    models: [{ id: "consumer-model-1", provider: "ai-sdk", label: "Consumer primary" }] });
  assert.match(workspace({ adapter, initialModel: "consumer-model-1" }), /data-ai-connection="consumer"/);
  assert.match(workspace({ adapter, initialModel: "Consumer primary" }), /data-ai-connection="unconfigured"/);
  assert.match(workspace({ adapter, initialModel: "missing" }), /initial model must match its exact ID/);
  assert.match(workspace({ adapter, initialModel: "" }), /data-ai-connection="unconfigured"/);
});

test("run-linked routing, fallback, progress and handoffs survive byte boundaries and preserve published history", async () => {
  const events = [
    start(), routing(), progress(), handoff(), handoff("accepted"),
    fallback({ summary: "Alternativa autorizada · café 👋", safeTraceLink: { href: "/admin/traces/run-1" } }),
    progress("running", { completed: 1 }),
    handoff("completed"), progress("completed", { completed: 2 }),
    event({ type: "text", id: "answer", delta: "The published answer." }), complete(),
  ];
  for (const split of [1, 9, Infinity]) {
    assert.deepEqual(await collect(parse(ndjson(events, { split, tail: false }))), events);
  }
  const message = reduce(events);
  assert.equal(message.status, "complete");
  assert.equal(message.content, "The published answer.");
  assert.deepEqual(message.parts.map((part) => part.type), ["routing", "progress", "handoff", "routing", "text"]);
  assert.deepEqual(message.parts.filter((part) => part.type === "routing").map((part) => part.attempt), [1, 2]);
  assert.equal(message.parts.find((part) => part.type === "progress").completed, 2);
  assert.equal(message.parts.find((part) => part.type === "handoff").state, "completed");
  assert.equal(events[2].state, "queued", "reduction cannot mutate a previous published event");
});

test("diagnostic schemas reject private payloads, fabricated demo targets and out-of-bounds metadata", () => {
  for (const bad of [
    routing({ provider: "unknown-provider" }), routing({ attempt: 33 }), routing({ model: "x".repeat(257) }),
    routing({ raw: { providerResponse: "Not public" } }), routing({ reasoning: "Not public" }),
    fallback({ attempt: 1 }),
    fallback({ fallback: { fromProvider: "openai-responses", fromModel: "primary", reason: "timeout", arguments: {} } }),
    routing({ basis: "unavailable" }),
    routing({ basis: "demo", provider: "demo", gateway: null, safeTraceLink: { href: "/admin/traces/run-1" } }),
    routing({ basis: "demo", provider: "openai-responses", gateway: null }),
    progress("running", { completed: 1_000_001, total: null }),
    progress("running", { completed: 3 }), progress("completed", { completed: 1 }),
    handoff("accepted", { summary: "x".repeat(3001) }),
    handoff("requested", { internalState: {} }),
    event({ type: "error", code: "failed", message: "Public failure", retryable: true,
      safeTraceLink: { href: "/admin/traces/run-1" } }),
  ]) assert.throws(() => ai.validateAiEvent(bad), ai.AiProtocolError);
  assert.equal(ai.validateAiEvent(routing({
    basis: "unavailable", attempt: null, gateway: null, provider: null, model: null, fallback: null,
  })).basis, "unavailable");
  assert.equal(ai.validateAiEvent(progress("completed", { completed: null, total: null })).completed, null);
});

test("routing records cannot replay, regress, contradict fallback history or join another run", async () => {
  for (const [events, code] of [
    [[routing(), routing({ attempt: 2 })], "routing-replay"],
    [[routing(), fallback({ attempt: 1, fallback: null })], "routing-replay"],
    [[routing(), fallback({ fallback: { fromProvider: "google-gemini", fromModel: "other", reason: "unavailable" } })], "routing-fallback"],
    [[routing(), progress("completed", { runId: "other-run", completed: 2 })], "run-mismatch"],
    [[routing(), handoff("requested", { runId: "other-run" })], "run-mismatch"],
    [[routing(), event({ type: "error", runId: "other-run", code: "failed", message: "Public failure", retryable: false })], "run-mismatch"],
  ]) await assert.rejects(collect(parse(ndjson([start(), ...events, complete()]))),
    (error) => error instanceof ai.AiProtocolError && error.code === code);
});

test("progress and handoffs enforce monotonic state, identity, acknowledgements and resolution before stop", async () => {
  for (const [events, code] of [
    [[progress("running", { completed: 1 }), progress("queued", { completed: 1 })], "progress-state"],
    [[progress("running", { completed: 1 }), progress("running")], "progress-state"],
    [[progress("running", { completed: 1 }), progress("running", { completed: null })], "progress-state"],
    [[progress(), progress("running", { total: 3 })], "progress-state"],
    [[progress(), progress("running", { label: "Another task" })], "progress-state"],
    [[progress("completed", { completed: 2 }), progress("completed", { completed: 2 })], "progress-state"],
    [[handoff("accepted")], "handoff-state"],
    [[handoff(), handoff("completed")], "handoff-state"],
    [[handoff(), handoff("accepted"), handoff("accepted")], "handoff-state"],
    [[handoff(), handoff("accepted", { to: "Another agent" })], "handoff-state"],
    [[handoff(), handoff("rejected"), handoff("accepted")], "handoff-state"],
    [[progress()], "run-pending"], [[handoff()], "run-pending"],
  ]) await assert.rejects(collect(parse(ndjson([start(), ...events, complete()]))),
    (error) => error instanceof ai.AiProtocolError && error.code === code);
  for (const state of ["rejected", "failed", "cancelled"]) {
    const events = [start(), handoff(), handoff(state), complete()];
    assert.deepEqual(await collect(parse(ndjson(events))), events);
  }
  const interrupted = [start(), progress("running"), handoff(), complete("cancelled")];
  assert.equal(reduce(await collect(parse(ndjson(interrupted)))).status, "cancelled");
});

test("approved trace links reject credential, signed-query, fragment and encoded navigation hazards", () => {
  const credential = new URL("https://example.test/traces/run-1");
  credential.username = "test-user";
  credential.password = "fixture";
  const signed = new URL("https://example.test/traces/run-1");
  signed.searchParams.set("signature", "fixture");
  const unsafe = [
    credential.href, signed.href, "/traces/run-1#private", "//example.test/traces/run-1",
    "/%2fexample.test/traces/run-1", "/%252fexample.test/traces/run-1",
    "/traces/%0arun-1", "/traces/%2520run-1", "/traces/%5crun-1", "/traces/%zz",
    "javascript:alert(1)", "data:text/html,fixture",
    `https://example.test/${"a".repeat(2048)}`,
  ];
  for (const href of unsafe) {
    assert.equal(ai.isAiTraceLink(href), false, href);
    assert.throws(() => ai.validateAiEvent(routing({ safeTraceLink: { href } })), ai.AiProtocolError);
  }
  for (const href of ["/admin/traces/run-1", "https://example.test/traces/run-1"]) {
    assert.equal(ai.isAiTraceLink(href), true);
    assert.equal(ai.validateAiEvent(routing({ safeTraceLink: { href } })).safeTraceLink.href, href);
  }
  for (const value of [undefined, null, {}, 123]) assert.equal(ai.isAiTraceLink(value), false);
});

test("admin presentation reveals reported fallback and approved error traces without granting connectivity or rendering private HTML", () => {
  const error = event({ type: "error", runId: "run-1", code: "provider-unavailable",
    message: "Please retry.", retryable: true,
    safeTraceLink: { href: "https://example.test/traces/run-1", label: "<script>Approved trace</script>" } });
  const message = reduce([start(), routing(), fallback({ summary: "<script>Published summary</script>" }), error]);
  const publicOutput = render(message);
  assert.doesNotMatch(publicOutput, /data-ai-routing|approved-primary|approved-backup|example\.test\/traces|data-ai-error-diagnostics/);
  for (const locale of ["en", "es"]) {
    const output = render(message, locale, { diagnostics: true });
    assert.match(output, /data-ai-routing="route-1"/);
    assert.match(output, /data-ai-routing="route-2"/);
    assert.match(output, /data-ai-run-id="run-1"/);
    assert.match(output, /Vercel AI Gateway/);
    assert.match(output, /approved-primary/);
    assert.match(output, /approved-backup/);
    assert.match(output, locale === "es" ? /Proveedor alternativo/ : /Fallback/);
    assert.match(output, /data-ai-error-diagnostics/);
    assert.match(output, /href="https:\/\/example\.test\/traces\/run-1"/);
    assert.match(output, /rel="noopener noreferrer"/);
    assert.match(output, /&lt;script&gt;/);
    assert.doesNotMatch(output, /<script>/);
  }
  const signed = new URL("https://example.test/traces/run-1");
  signed.searchParams.set("signature", "fixture");
  const bypassed = { ...message, error: { ...message.error, safeTraceLink: { href: signed.href } } };
  const output = render(bypassed, "es", { diagnostics: true });
  assert.doesNotMatch(output, /href="https:\/\/example\.test\/traces\/run-1\?/);
  assert.match(output, /Traza no disponible/);
  const unavailable = render({ ...message, error: undefined }, "en", { diagnostics: true });
  assert.match(unavailable, /Trace unavailable/);
});

test("public progress and handoffs localize unknown counts and distinguish the last backend state from client cancellation", () => {
  const message = reduce([start(), progress("running", { completed: null, total: null }),
    handoff("requested", { from: "<script>Coordinator</script>" }), complete("cancelled")]);
  for (const locale of ["en", "es"]) {
    const output = render(message, locale);
    assert.match(output, /data-ai-progress-state="running"/);
    assert.match(output, /data-ai-handoff-state="requested"/);
    assert.match(output, /data-ai-last-reported="true"/);
    assert.match(output, locale === "es" ? /Cifras no disponibles/ : /Counts unavailable/);
    assert.match(output, locale === "es" ? /Último estado reportado/ : /Last reported state/);
    assert.match(output, /&lt;script&gt;Coordinator&lt;\/script&gt;/);
    assert.doesNotMatch(output, /data-ai-handoff-state="cancelled"|<script>|NaN|100%/);
  }
});

test("HTTP consumer metadata reaches the structured block and cancellation discards buffered run updates", async () => {
  const workspaceId = "workspace-alpha";
  const events = [start(), routing(), fallback(), progress("completed", { completed: 2 }),
    handoff(), handoff("accepted"), handoff("completed"), event({
      type: "error", runId: "run-1", code: "provider-unavailable", message: "Published failure.", retryable: true,
      safeTraceLink: { href: "/admin/traces/run-1" },
    })].map((value) => ({ ...value, workspaceId }));
  let received;
  const adapter = ai.createHttpAiWorkspaceAdapter({
    endpoint: "/backend/ai", models: [{ id: "approved-primary", provider: "openai-responses", label: "Approved primary" }],
    fetch: async (_url, init) => {
      received = JSON.parse(init.body);
      return new Response(ndjson(events, { split: 3 }), { headers: { "Content-Type": "application/x-ndjson" } });
    },
  });
  const input = request({ workspaceId, model: { id: "approved-primary", provider: "openai-responses" } });
  const message = reduce(await collect(adapter.stream(input, new AbortController().signal)));
  assert.deepEqual(received, input);
  assert.equal("diagnostics" in received, false, "a presentation flag cannot authorize backend diagnostics");
  assert.match(render(message, "en", { diagnostics: true }), /data-ai-fallback/);
  assert.match(render(message, "en", { diagnostics: true }), /data-ai-trace/);
  assert.equal(message.error.runId, "run-1");
  const controller = new AbortController();
  const stream = parse(ndjson(events), { workspaceId, signal: controller.signal });
  await stream.next();
  assert.equal((await stream.next()).value.type, "routing");
  controller.abort();
  await assert.rejects(stream.next(), { name: "AbortError" });
});

test("the offline demo explicitly simulates routing, progress and acknowledged handoffs without a fabricated trace", async () => {
  for (const locale of ["en", "es"]) {
    const input = request({ locale, messages: [{ role: "user", content: "Delegate this short answer" }] });
    const adapter = ai.createDemoAiWorkspaceAdapter({ delay: 0 });
    const events = await collect(ai.validateAiEventStream(adapter.stream(input, new AbortController().signal), { requestId: input.id }));
    const route = events.find((value) => value.type === "routing");
    assert.equal(route.basis, "demo");
    assert.equal(route.provider, "demo");
    assert.equal(route.gateway, null);
    assert.equal(route.safeTraceLink, undefined);
    assert.ok(events.filter((value) => ["routing", "progress", "handoff"].includes(value.type)).every((value) => value.runId === input.id));
    assert.deepEqual(events.filter((value) => value.type === "handoff").map((value) => value.state), ["requested", "accepted", "completed"]);
    const output = render(reduce(events), locale, { diagnostics: true });
    assert.match(output, locale === "es" ? /Transferencia simulada/ : /Simulated handoff/);
    assert.match(output, locale === "es" ? /Progreso simulado/ : /Simulated progress/);
    assert.match(output, locale === "es" ? /Traza no disponible/ : /Trace unavailable/);
    assert.doesNotMatch(output, /data-ai-trace="|href="[^"]*traces/);
  }
});

test("the published NDJSON examples execute with workspace identity, resolved metadata and terminal output", async () => {
  const documentation = readFileSync(new URL("../docs/integrations/ai.md", import.meta.url), "utf8");
  const examples = [...documentation.matchAll(/```ndjson\n([\s\S]*?)\n```/g)];
  assert.equal(examples.length, 2);
  for (const [, text] of examples) {
    const events = await collect(parse(bytes(text, 1), { workspaceId: "workspace-alpha" }));
    const message = reduce(events);
    assert.equal(message.status, "complete");
    assert.equal(events[0].type, "start");
    assert.equal(events.at(-1).type, "complete");
    assert.ok(events.every((value) => value.workspaceId === "workspace-alpha"));
  }
});
