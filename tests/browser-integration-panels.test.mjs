import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire, registerHooks } from "node:module";
import { after, test } from "node:test";
import { setImmediate as nextTurn } from "node:timers/promises";
import vm from "node:vm";
import ts from "typescript";

const sourceRoot = new URL("../src/", import.meta.url);
const resolver = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/"))
      specifier = new URL(specifier.slice(2), sourceRoot).href;
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        for (const extension of [".ts", ".tsx"]) {
          const candidate = new URL(
            `${specifier}${extension}`,
            context.parentURL,
          );
          if (existsSync(candidate))
            return nextResolve(candidate.href, context);
        }
      }
      throw error;
    }
  },
});
after(() => resolver.deregister());
const [
  contracts,
  validation,
  snapshots,
  cancellation,
  picker,
  media,
  http,
  operations,
  definitions,
  demo,
] = await Promise.all([
  import("../src/lib/integrations/contracts.ts"),
  import("../src/lib/integrations/validation.ts"),
  import("../src/lib/integrations/connection-snapshot.ts"),
  import("../src/lib/integrations/cancelled-task.ts"),
  import("../src/lib/integrations/drive-picker.ts"),
  import("../src/lib/integrations/media-collection.ts"),
  import("../src/lib/integrations/http-adapter.ts"),
  import("../src/hooks/use-integration-operation.ts"),
  import("../src/lib/integrations/definitions.ts"),
  import("../src/lib/integrations/demo-adapter.ts"),
]);
const require = createRequire(import.meta.url);
const originalFetch = globalThis.fetch;
globalThis.fetch = () =>
  assert.fail("UI boundary tests cannot contact a provider.");
after(() => {
  globalThis.fetch = originalFetch;
});

// This local harness runs the actual component body, event handlers and
// dependency-based effect cleanup. It replaces only React scheduling,
// localization and presentation boundaries. It does not test DOM behavior,
// focus, browser rendering or native provider acceptance.
function runtime() {
  const slots = [];
  let cursor = 0;
  let dirty = true;
  let pendingEffects = [];
  let component;
  let props;
  let tree;
  const same = (left, right) =>
    left &&
    right &&
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) {
        const slot = {
          value: typeof initial === "function" ? initial() : initial,
        };
        slot.set = (next) => {
          const value = typeof next === "function" ? next(slot.value) : next;
          if (!Object.is(value, slot.value)) {
            slot.value = value;
            dirty = true;
          }
        };
        slots[index] = slot;
      }
      return [slots[index].value, slots[index].set];
    },
    useRef(initial) {
      const index = cursor++;
      slots[index] ??= { current: initial };
      return slots[index];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].dependencies, dependencies))
        slots[index] = { value: callback, dependencies };
      return slots[index].value;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      const slot = (slots[index] ??= {});
      if (!same(slot.dependencies, dependencies)) {
        slot.dependencies = dependencies;
        pendingEffects.push({ slot, effect });
      }
    },
  };
  function flush() {
    for (let iteration = 0; dirty; iteration++) {
      assert(iteration < 30, "Component effects must settle.");
      dirty = false;
      cursor = 0;
      pendingEffects = [];
      tree = component(props);
      const effects = pendingEffects;
      for (const { slot } of effects) slot.cleanup?.();
      for (const { slot, effect } of effects) slot.cleanup = effect();
    }
    return tree;
  }
  return {
    hooks,
    mount(value, initialProps) {
      component = value;
      props = initialProps;
      dirty = true;
      return flush();
    },
    update(nextProps) {
      props = nextProps;
      dirty = true;
      return flush();
    },
    get tree() {
      return flush();
    },
    async settle() {
      for (let index = 0; index < 3; index++) {
        flush();
        await nextTurn();
      }
      return flush();
    },
    async act(callback) {
      await callback();
      return this.settle();
    },
    unmount() {
      for (const slot of slots) slot.cleanup?.();
    },
  };
}

function loadPanel(name, hooks) {
  const bindings = {
    react: hooks,
    "lucide-react": new Proxy(
      {},
      { get: (_object, icon) => `icon-${String(icon)}` },
    ),
    "@/hooks/use-language": {
      useLanguage: () => ({ locale: "en", l: (en) => en }),
    },
    "@/hooks/use-integration-operation": operations,
    "@/components/ui/alert": { Alert: "alert" },
    "@/components/ui/button": { Button: "button" },
    "@/components/ui/checkbox": { Checkbox: "checkbox" },
    "@/components/ui/badge": { Badge: "badge" },
    "@/components/ui/dialog": Object.fromEntries(
      [
        "Dialog",
        "DialogContent",
        "DialogDescription",
        "DialogFooter",
        "DialogTitle",
      ].map((value) => [value, value === "Dialog" ? "dialog" : value]),
    ),
    "@/components/blocks/product-image-editor": {
      ProductImageEditor: "image-editor",
    },
    "@/lib/integrations/contracts": contracts,
    "@/lib/integrations/validation": validation,
    "@/lib/integrations/connection-snapshot": snapshots,
    "@/lib/integrations/cancelled-task": cancellation,
    "@/lib/integrations/drive-picker": picker,
    "@/lib/integrations/media-collection": media,
    "@/lib/integrations/http-adapter": http,
    "./product-ui": Object.fromEntries(
      ["ProductEmpty", "ProductPanel", "ProductDate", "ProductStatus"].map(
        (value) => [value, value],
      ),
    ),
  };
  const file = new URL(
    `../src/components/integrations/${name}.tsx`,
    import.meta.url,
  );
  const compiled = ts.transpileModule(readFileSync(file, "utf8"), {
    fileName: file.pathname,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(
    compiled,
    {
      module: compiledModule,
      exports: compiledModule.exports,
      AbortController,
      structuredClone,
      crypto: globalThis.crypto,
      require(id) {
        if (Object.hasOwn(bindings, id)) return bindings[id];
        if (id.startsWith("@/") || id.startsWith("."))
          throw new Error(`Unconfigured presentation boundary: ${id}`);
        return require(id);
      },
    },
    { filename: file.pathname },
  );
  return compiledModule.exports;
}

function elements(node, visibleOnly = true) {
  if (Array.isArray(node))
    return node.flatMap((child) => elements(child, visibleOnly));
  if (!node || typeof node !== "object" || !node.props) return [];
  return [
    node,
    ...(visibleOnly && node.type === "dialog" && !node.props.open
      ? []
      : elements(node.props.children, visibleOnly)),
  ];
}
function text(node) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (!node || typeof node !== "object") return "";
  if (node.type === "dialog" && !node.props.open) return "";
  if (node.type === "alert")
    return text([node.props.title, node.props.children]);
  return text(node.props?.children);
}
function find(ui, type, label) {
  const matches = elements(ui.tree).filter(
    (node) =>
      node.type === type &&
      (label === undefined || text(node.props.children).trim() === label),
  );
  assert.equal(matches.length, 1, `Expected one ${type}: ${label ?? ""}`);
  return matches[0];
}
async function click(ui, label) {
  const { props } = find(ui, "button", label);
  assert(!props.disabled && !props.loading, `${label} must be usable.`);
  await ui.act(() => props.onClick());
}
async function acknowledge(ui) {
  await ui.act(() => find(ui, "checkbox").props.onCheckedChange(true));
}
function deferred() {
  let resolve;
  const promise = new Promise((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}
async function context(id = "google-drive", workspaceId = "workspace-a") {
  const definition = definitions.getIntegrationDefinition(id);
  const result = await demo
    .createDemoIntegrationsAdapter({ delayMs: 0 })
    .connect(
      {
        integrationId: id,
        providerOptionId: definition.options[0].id,
        configuration: demo.demoIntegrationConfiguration(definition),
        permissions: definition.permissions.map((permission) => permission.id),
        resourceIds: [],
      },
      { workspaceId },
    );
  const applied = [];
  return {
    definition,
    connection: result.connection,
    scope: { workspaceId },
    adapter: {
      mode: "consumer",
      authorizationOrigins: ["https://admin.allowed.example"],
      resources: async () => [],
      get: async () => result.connection,
    },
    canManage: true,
    onConnectionChange(value) {
      applied.push(value);
    },
    applied,
  };
}
function mounted(t, file, exported, props) {
  const ui = runtime();
  const panel = loadPanel(file, ui.hooks)[exported];
  ui.mount(panel, props);
  t.after(() => ui.unmount());
  return ui;
}
const selected = {
  kind: "selected",
  files: [
    { id: "old-file-a", name: "Workspace A document", mimeType: "text/plain" },
  ],
};

test("Picker discards old selection and consent on every identity/binding boundary", async (t) => {
  for (const boundary of [
    "workspace",
    "connection",
    "provider",
    "binding",
    "adapter",
  ]) {
    const props = await context();
    let registrations = 0;
    props.binding = {
      select: async () => structuredClone(selected),
      register: async () => {
        registrations++;
        return props.connection;
      },
    };
    const ui = mounted(t, "drive-picker-panel", "DrivePickerPanel", props);
    await click(ui, "Open file picker");
    await acknowledge(ui);
    assert.equal(
      find(ui, "button", "Confirm selected files").props.disabled,
      false,
    );
    const next = { ...props };
    if (boundary === "workspace") {
      next.scope = { workspaceId: "workspace-b" };
      next.connection = { ...props.connection, workspaceId: "workspace-b" };
    } else if (boundary === "connection")
      next.connection = { ...props.connection, id: "another-connection" };
    else if (boundary === "provider")
      next.connection = {
        ...props.connection,
        providerOptionId: "another-provider-option",
      };
    else if (boundary === "binding") next.binding = { ...props.binding };
    else next.adapter = { ...props.adapter };
    ui.update(next);
    await ui.settle();
    assert(!text(ui.tree).includes("Workspace A document"), boundary);
    assert(
      !elements(ui.tree).some((node) => node.type === "checkbox"),
      boundary,
    );
    assert.equal(registrations, 0, boundary);
  }
});

test("Picker prevents registering a selection reviewed before a revision change", async (t) => {
  const props = await context();
  let registrations = 0;
  props.binding = {
    select: async () => structuredClone(selected),
    register: async () => {
      registrations++;
      return props.connection;
    },
  };
  const ui = mounted(t, "drive-picker-panel", "DrivePickerPanel", props);
  await click(ui, "Open file picker");
  await acknowledge(ui);
  ui.update({
    ...props,
    connection: {
      ...props.connection,
      revision: props.connection.revision + 1,
    },
  });
  await click(ui, "Confirm selected files");
  assert.equal(registrations, 0);
  assert.equal(
    find(ui, "button", "Confirm selected files").props.disabled,
    true,
  );
});

test("Picker preserves confirmed registration when optional resource refresh fails", async (t) => {
  const props = await context();
  props.adapter.resources = async () => {
    throw new contracts.IntegrationError("offline");
  };
  props.binding = {
    select: async () => structuredClone(selected),
    register: async () => ({
      ...props.connection,
      revision: props.connection.revision + 1,
      resourceIds: ["old-file-a"],
    }),
  };
  const ui = mounted(t, "drive-picker-panel", "DrivePickerPanel", props);
  await click(ui, "Open file picker");
  await acknowledge(ui);
  await click(ui, "Confirm selected files");
  assert.equal(props.applied.length, 1);
  assert.deepEqual(props.applied[0].resourceIds, ["old-file-a"]);
  assert(text(ui.tree).includes("File registration confirmed."));
  assert(!text(ui.tree).includes("Workspace A document"));
});

test("Enterprise removes old review and acknowledgment on every identity/binding boundary", async (t) => {
  for (const boundary of [
    "workspace",
    "connection",
    "provider",
    "binding",
    "adapter",
  ]) {
    const props = await context("enterprise-identity");
    let calls = 0;
    props.binding = {
      actions: ["verify-domain"],
      perform: async () => {
        calls++;
        return { kind: "connected", connection: props.connection };
      },
    };
    const ui = mounted(
      t,
      "enterprise-diagnostics",
      "EnterpriseDiagnostics",
      props,
    );
    await click(ui, "Check domain verification");
    await acknowledge(ui);
    assert.equal(find(ui, "button", "Continue").props.disabled, false);
    const next = { ...props };
    if (boundary === "workspace") {
      next.scope = { workspaceId: "workspace-b" };
      next.connection = { ...props.connection, workspaceId: "workspace-b" };
    } else if (boundary === "connection")
      next.connection = { ...props.connection, id: "another-connection" };
    else if (boundary === "provider")
      next.connection = {
        ...props.connection,
        providerOptionId: "another-provider-option",
      };
    else if (boundary === "binding") next.binding = { ...props.binding };
    else next.adapter = { ...props.adapter };
    ui.update(next);
    await ui.settle();
    assert.equal(find(ui, "dialog").props.open, false, boundary);
    const checkbox = elements(ui.tree, false).find(
      (node) => node.type === "checkbox",
    );
    assert.equal(checkbox.props.checked, false, boundary);
    assert.equal(calls, 0, boundary);
  }
});

test("Enterprise drops a late authorization result after scope replacement", async (t) => {
  const props = await context("enterprise-identity");
  const pending = deferred();
  props.binding = {
    actions: ["verify-domain"],
    perform: () => pending.promise,
  };
  const ui = mounted(
    t,
    "enterprise-diagnostics",
    "EnterpriseDiagnostics",
    props,
  );
  await click(ui, "Check domain verification");
  await acknowledge(ui);
  await click(ui, "Continue");
  ui.update({
    ...props,
    scope: { workspaceId: "workspace-b" },
    connection: { ...props.connection, workspaceId: "workspace-b" },
  });
  await ui.settle();
  assert.equal(find(ui, "dialog").props.open, false);
  pending.resolve({
    kind: "authorization",
    connection: props.connection,
    url: "https://admin.allowed.example/old-workspace",
  });
  await ui.settle();
  assert.equal(props.applied.length, 0);
  assert(!elements(ui.tree).some((node) => node.type === "a"));
});

test("Enterprise rejects stale reviews and malformed or misdirected response envelopes", async (t) => {
  const props = await context("enterprise-identity");
  let calls = 0;
  props.binding = {
    actions: ["verify-domain"],
    perform: async () => {
      calls++;
      return { kind: "connected", connection: props.connection };
    },
  };
  const ui = mounted(
    t,
    "enterprise-diagnostics",
    "EnterpriseDiagnostics",
    props,
  );
  await click(ui, "Check domain verification");
  await acknowledge(ui);
  ui.update({
    ...props,
    connection: {
      ...props.connection,
      revision: props.connection.revision + 1,
    },
  });
  await click(ui, "Continue");
  assert.equal(calls, 0);
  assert.equal(find(ui, "dialog").props.open, false);
  for (const change of [
    { kind: "unrecognized" },
    { connection: { ...props.connection, id: "foreign-connection" } },
    {
      connection: {
        ...props.connection,
        providerOptionId: "foreign-provider-option",
      },
    },
    {
      connection: {
        ...props.connection,
        revision: props.connection.revision - 1,
      },
    },
  ]) {
    const next = {
      ...props,
      binding: {
        actions: ["verify-domain"],
        perform: async () => ({
          kind: "connected",
          connection: props.connection,
          ...change,
        }),
      },
    };
    ui.update(next);
    await click(ui, "Check domain verification");
    await acknowledge(ui);
    await click(ui, "Continue");
    assert.equal(props.applied.length, 0);
    assert(elements(ui.tree).some((node) => node.type === "alert"));
  }
});

function mediaCollection(label, revision = 1) {
  return {
    id: `collection-${label}`,
    name: label,
    revision,
    images: [
      {
        id: `image-${label}`,
        src: "/assets/products/forma-desk-lamp.svg",
        alt: label,
      },
    ],
  };
}
test("Media clears old draft/review even when the replacement scope load fails", async (t) => {
  const props = await context("cloudinary");
  let saves = 0;
  props.binding = {
    load: async () => mediaCollection("Workspace A imagery"),
    save: async () => {
      saves++;
      return mediaCollection("Workspace A imagery", 2);
    },
  };
  const ui = mounted(
    t,
    "media-collection-panel",
    "MediaCollectionPanel",
    props,
  );
  await ui.settle();
  const editor = find(ui, "image-editor");
  await ui.act(() =>
    editor.props.onChange([
      { ...editor.props.images[0], alt: "Reviewed A draft" },
    ]),
  );
  await click(ui, "Review media changes");
  await acknowledge(ui);
  assert.equal(find(ui, "dialog").props.open, true);
  const next = {
    ...props,
    scope: { workspaceId: "workspace-b" },
    connection: {
      ...props.connection,
      workspaceId: "workspace-b",
      id: "media-b",
    },
    binding: {
      ...props.binding,
      load: async () => {
        throw new contracts.IntegrationError("offline");
      },
    },
  };
  ui.update(next);
  await ui.settle();
  assert.equal(find(ui, "dialog").props.open, false);
  assert(!elements(ui.tree).some((node) => node.type === "image-editor"));
  assert(!text(ui.tree).includes("Reviewed A draft"));
  assert.equal(saves, 0);
});

test("Media preserves a current-scope draft on refresh but clears it after read revocation", async (t) => {
  const props = await context("cloudinary");
  let loads = 0;
  props.binding = {
    load: async () => mediaCollection("Current imagery", ++loads),
    save: async () => assert.fail("This flow never reviews or saves."),
  };
  const ui = mounted(
    t,
    "media-collection-panel",
    "MediaCollectionPanel",
    props,
  );
  await ui.settle();
  const editor = find(ui, "image-editor");
  await ui.act(() =>
    editor.props.onChange([
      { ...editor.props.images[0], alt: "Unsaved current draft" },
    ]),
  );
  await click(ui, "Refresh and keep draft");
  assert.equal(
    find(ui, "image-editor").props.images[0].alt,
    "Unsaved current draft",
  );
  assert.equal(loads, 2);
  ui.update({
    ...props,
    connection: {
      ...props.connection,
      revision: props.connection.revision + 1,
      grantedPermissions: props.connection.grantedPermissions.filter(
        (value) => value !== "assets.read",
      ),
    },
  });
  await ui.settle();
  assert.equal(find(ui, "dialog").props.open, false);
  assert(!elements(ui.tree).some((node) => node.type === "image-editor"));
  assert.equal(loads, 2);
});

for (const panel of ["Picker", "Enterprise"]) {
  test(`${panel} does not apply a pending response older than a newly received connection revision`, async (t) => {
    const props = await context(
      panel === "Picker" ? "google-drive" : "enterprise-identity",
    );
    const pending = deferred();
    props.binding =
      panel === "Picker"
        ? {
            select: async () => structuredClone(selected),
            register: () => pending.promise,
          }
        : { actions: ["verify-domain"], perform: () => pending.promise };
    const ui = mounted(
      t,
      panel === "Picker" ? "drive-picker-panel" : "enterprise-diagnostics",
      panel === "Picker" ? "DrivePickerPanel" : "EnterpriseDiagnostics",
      props,
    );
    await click(
      ui,
      panel === "Picker" ? "Open file picker" : "Check domain verification",
    );
    await acknowledge(ui);
    await click(ui, panel === "Picker" ? "Confirm selected files" : "Continue");
    ui.update({
      ...props,
      connection: {
        ...props.connection,
        revision: props.connection.revision + 3,
      },
    });
    const outdated = {
      ...props.connection,
      revision: props.connection.revision + 1,
    };
    pending.resolve(
      panel === "Picker"
        ? outdated
        : { kind: "connected", connection: outdated },
    );
    await ui.settle();
    assert.equal(
      props.applied.length,
      0,
      "A late response must not roll back the live connection.",
    );
  });
}

for (const panel of ["Picker", "Enterprise"]) {
  test(`${panel} invalidates consent and pending results after management permission loss`, async (t) => {
    {
      const props = await context(
        panel === "Picker" ? "google-drive" : "enterprise-identity",
      );
      let calls = 0;
      props.binding =
        panel === "Picker"
          ? {
              select: async () => structuredClone(selected),
              register: async () => {
                calls++;
                return props.connection;
              },
            }
          : {
              actions: ["verify-domain"],
              perform: async () => {
                calls++;
                return { kind: "connected", connection: props.connection };
              },
            };
      const ui = mounted(
        t,
        panel === "Picker" ? "drive-picker-panel" : "enterprise-diagnostics",
        panel === "Picker" ? "DrivePickerPanel" : "EnterpriseDiagnostics",
        props,
      );
      await click(
        ui,
        panel === "Picker" ? "Open file picker" : "Check domain verification",
      );
      await acknowledge(ui);
      ui.update({ ...props, canManage: false });
      await ui.settle();
      const label = panel === "Picker" ? "Confirm selected files" : "Continue";
      const confirmation = elements(ui.tree).find(
        (node) =>
          node.type === "button" && text(node.props.children).trim() === label,
      );
      // Exercise an exposed, enabled control as a user would. A hidden or
      // disabled confirmation cannot initiate the mutation.
      if (
        confirmation &&
        !confirmation.props.disabled &&
        !confirmation.props.loading
      )
        await ui.act(() => confirmation.props.onClick());
      assert.equal(
        calls,
        0,
        "Revoked management permission must block a new mutation.",
      );
      for (const checkbox of elements(ui.tree, false).filter(
        (node) => node.type === "checkbox",
      ))
        assert.equal(
          checkbox.props.checked,
          false,
          "Old consent must be invalidated.",
        );

      ui.update(props);
      await ui.settle();
      const restored = elements(ui.tree).find(
        (node) =>
          node.type === "button" && text(node.props.children).trim() === label,
      );
      assert(
        !restored || restored.props.disabled,
        "Restoring permission must require a new review/acknowledgment.",
      );
    }
    {
      const props = await context(
        panel === "Picker" ? "google-drive" : "enterprise-identity",
      );
      const pending = deferred();
      let operationScope;
      const perform = (input) => {
        operationScope = input.scope;
        return pending.promise;
      };
      props.binding =
        panel === "Picker"
          ? { select: async () => structuredClone(selected), register: perform }
          : { actions: ["verify-domain"], perform };
      const ui = mounted(
        t,
        panel === "Picker" ? "drive-picker-panel" : "enterprise-diagnostics",
        panel === "Picker" ? "DrivePickerPanel" : "EnterpriseDiagnostics",
        props,
      );
      await click(
        ui,
        panel === "Picker" ? "Open file picker" : "Check domain verification",
      );
      await acknowledge(ui);
      await click(
        ui,
        panel === "Picker" ? "Confirm selected files" : "Continue",
      );
      assert(operationScope, "The reviewed mutation must already be pending.");
      ui.update({ ...props, canManage: false });
      await ui.settle();
      const abortedAtRevocation = operationScope.signal.aborted;
      const stillWaiting = elements(ui.tree).some(
        (node) => node.type === "button" && node.props.loading,
      );
      // The backend may already have accepted the operation. This test checks
      // cancellation of the obsolete UI task, never server-side rollback.
      const confirmed = {
        ...props.connection,
        revision: props.connection.revision + 1,
      };
      pending.resolve(
        panel === "Picker"
          ? confirmed
          : { kind: "connected", connection: confirmed },
      );
      await ui.settle();
      assert.deepEqual(
        {
          abortedAtRevocation,
          stillWaiting,
          lateUpdates: props.applied.length,
        },
        { abortedAtRevocation: true, stillWaiting: false, lateUpdates: 0 },
      );
    }
  });
}
