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
const { NextIntlClientProvider } = await import("next-intl");
const { messages } = await import("../src/i18n/messages.ts");
const { ProductAgentRunSummary, productAgentTraceHref } = await import("../src/components/integrations/product-agent-run.tsx");
const { parseIntegrationResult } = await import("../src/lib/integrations/validation.ts");
const { getIntegrationDefinition } = await import("../src/lib/integrations/definitions.ts");
const { createDemoIntegrationsAdapter, demoIntegrationConfiguration } = await import("../src/lib/integrations/demo-adapter.ts");

const scope = { workspaceId: "agent-test-workspace" };
const run = (overrides = {}) => ({
  id: "consumer-run-1", name: "Published response", state: "running",
  input: { reasoning: "INPUT_MUST_NOT_RENDER" }, output: "OUTPUT_MUST_NOT_RENDER",
  progress: { label: "Authorized response", completed: 0, total: 3, state: "running", summary: "Public progress." },
  handoffs: [{ id: "handoff-1", from: "Coordinator", to: "Writer", state: "accepted", summary: "Public handoff." }],
  ...overrides,
});
function render(value, locale = "en", demo = false) {
  return renderToStaticMarkup(createElement(NextIntlClientProvider, {
    locale, messages: messages[locale], timeZone: "America/Bogota",
  }, createElement(ProductAgentRunSummary, { run: value, demo })));
}

test("consumer tool-run snapshots display only their published handoff/progress fields in EN/ES", () => {
  const value = parseIntegrationResult({ kind: "tool", run: run({
    progress: { ...run().progress, summary: "<script>Published progress</script>" },
    handoffs: [{ ...run().handoffs[0], summary: "<script>Published handoff</script>" }],
    privateProviderPayload: "PRIVATE_PAYLOAD_MUST_NOT_RENDER",
  }) }).run;
  for (const locale of ["en", "es"]) {
    const output = render(value, locale);
    assert.match(output, /data-product-agent-run="consumer-run-1"/);
    assert.match(output, /data-product-agent-progress-state="running"/);
    assert.match(output, /data-product-agent-handoff-state="accepted"/);
    assert.match(output, locale === "es" ? /Transferencias entre agentes/ : /Agent handoffs/);
    assert.match(output, /Coordinator/);
    assert.match(output, /Writer/);
    assert.match(output, /&lt;script&gt;Published/);
    assert.doesNotMatch(output, /<script>|INPUT_MUST_NOT_RENDER|OUTPUT_MUST_NOT_RENDER|PRIVATE_PAYLOAD_MUST_NOT_RENDER|reasoning/);
  }
});

test("handoff snapshots render every backend state without inventing commands, approvals or execution", () => {
  for (const state of ["requested", "accepted", "completed", "failed", "rejected", "cancelled"]) {
    const value = run({ handoffs: [{ ...run().handoffs[0], state }] });
    const previous = JSON.stringify(value);
    const output = render(value);
    assert.match(output, new RegExp(`data-product-agent-handoff-state="${state}"`));
    assert.doesNotMatch(output, /<button|Approve tool|Reject tool/);
    assert.equal(JSON.stringify(value), previous);
  }
});

test("unknown counts stay unknown and a reported zero is never a fabricated completion percentage", () => {
  for (const locale of ["en", "es"]) {
    const zero = render(run({ progress: { ...run().progress, completed: 0, total: null } }), locale);
    assert.match(zero, locale === "es" ? /0 \/ Desconocido/ : /0 \/ Unknown/);
    const unknown = render(run({ progress: { ...run().progress, completed: null, total: null } }), locale);
    assert.match(unknown, locale === "es" ? /Cifras no reportadas/ : /Counts not reported/);
    assert.doesNotMatch(unknown, /100%|NaN|0 \/ 0/);
  }
});

test("missing metadata and an explicitly empty handoff list have honest empty states and no trace target", () => {
  for (const locale of ["en", "es"]) {
    const missing = render(run({ progress: undefined, handoffs: undefined }), locale);
    assert.match(missing, locale === "es" ? /Progreso no reportado/ : /Progress not reported/);
    assert.match(missing, locale === "es" ? /Transferencias no reportadas/ : /Handoffs not reported/);
    assert.match(missing, locale === "es" ? /Traza no disponible/ : /Trace unavailable/);
    assert.doesNotMatch(missing, /href=|data-product-agent-handoff-state|data-product-agent-progress-state/);
    assert.match(render(run({ handoffs: [] }), locale),
      locale === "es" ? /Esta ejecución no tiene transferencias/ : /No handoffs in this run/);
  }
});

test("trace navigation preserves approved external destinations and rejects unsafe URLs even when a caller bypasses validation", () => {
  const approved = "https://example.test/traces/consumer-run-1";
  const parsed = parseIntegrationResult({ kind: "tool", run: run({ safeTraceUrl: approved }) }).run;
  const output = render(parsed, "es");
  assert.match(output, /href="https:\/\/example\.test\/traces\/consumer-run-1"/);
  assert.match(output, /Abrir traza aprobada/);
  assert.match(output, /rel="noopener noreferrer"/);
  const credentials = new URL(approved);
  credentials.username = "test-user";
  credentials.password = "fixture";
  const signed = new URL(approved);
  signed.searchParams.set("signature", "fixture");
  for (const safeTraceUrl of [
    credentials.href, signed.href, "/traces/run-1#private", "//example.test/traces/run-1",
    "/%252fexample.test/run-1", "/traces/%0arun-1", "javascript:alert(1)",
    `https://example.test/${"a".repeat(2048)}`,
  ]) {
    assert.equal(productAgentTraceHref(safeTraceUrl), undefined);
    const blocked = render(run({ safeTraceUrl }));
    assert.match(blocked, /Trace unavailable/);
    assert.doesNotMatch(blocked, /href=/);
  }
  assert.ok(productAgentTraceHref("/admin/traces/consumer-run-1").endsWith("/admin/traces/consumer-run-1"));
});

test("unfinished backend metadata on a terminal run is labelled as the last reported state", () => {
  for (const state of ["completed", "failed", "rejected"]) {
    const output = render(run({ state }));
    assert.match(output, /data-product-agent-handoff-state="accepted"/);
    assert.match(output, /data-product-agent-progress-state="running"/);
    assert.match(output, /Last reported handoff/);
    assert.match(output, /Last reported progress/);
    assert.doesNotMatch(output, /data-product-agent-handoff-state="cancelled"/);
  }
});

test("local simulation never claims a real agent or trace even if a consumer passes a reference", () => {
  const value = run({ safeTraceUrl: "https://example.test/traces/consumer-run-1" });
  for (const locale of ["en", "es"]) {
    const output = render(value, locale, true);
    assert.match(output, locale === "es" ? /Simulación local/ : /Local simulation/);
    assert.match(output, locale === "es" ? /no se llamó a un servicio de agentes/ : /no agent service was called/);
    assert.match(output, locale === "es" ? /Traza no disponible/ : /Trace unavailable/);
    assert.doesNotMatch(output, /href=|Backend reported/);
  }
});

test("OpenAI Agents demo approval/rejection snapshots round-trip through the core DTO and update the actual summary", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("The local agent fixture must not call a provider."); };
  t.after(() => { globalThis.fetch = originalFetch; });
  const definition = getIntegrationDefinition("openai-agents");
  for (const approved of [true, false]) {
    const adapter = createDemoIntegrationsAdapter({ delayMs: 0 });
    const { connection } = await adapter.connect({
      integrationId: definition.id, providerOptionId: "openai-agents",
      configuration: demoIntegrationConfiguration(definition),
      permissions: definition.permissions.map((permission) => permission.id), resourceIds: [],
    }, scope);
    const execute = (kind, values) => adapter.execute({
      integrationId: definition.id, connectionId: connection.id,
      actionId: definition.actions.find((action) => action.kind === kind).id, values,
    }, scope);
    const initial = parseIntegrationResult(await execute("run-agent", { prompt: "Prepare a local document" })).run;
    assert.equal(initial.handoffs[0].state, "accepted");
    assert.equal(initial.progress.completed, 1);
    assert.equal(initial.progress.total, 3);
    assert.match(render(initial, "en", true), /1 \/ 3/);
    const resolved = parseIntegrationResult(await execute("approve-tool", { approvalId: initial.approvalId, approved })).run;
    assert.equal(resolved.handoffs[0].state, approved ? "completed" : "rejected");
    assert.equal(resolved.progress.state, approved ? "completed" : "cancelled");
    assert.equal(resolved.progress.completed, approved ? 3 : 1);
    const output = render(resolved, "en", true);
    assert.match(output, new RegExp(`data-product-agent-handoff-state="${approved ? "completed" : "rejected"}"`));
    assert.match(output, new RegExp(`data-product-agent-progress-state="${approved ? "completed" : "cancelled"}"`));
    assert.match(output, /Trace unavailable/);
    assert.equal(initial.handoffs[0].state, "accepted", "a rendered snapshot is independent of later backend updates");
  }
});
