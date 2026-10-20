import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "https://native-binding-fixture.invalid/",
});
for (const key of [
  "window", "document", "navigator", "Node", "Element", "HTMLElement",
  "HTMLDivElement", "DocumentFragment", "DOMParser", "MutationObserver",
  "Range", "Text", "DOMRect", "getComputedStyle", "requestAnimationFrame",
  "cancelAnimationFrame",
]) {
  if (!(key in dom.window)) continue;
  const value = ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"].includes(key)
    ? dom.window[key].bind(dom.window)
    : dom.window[key];
  Object.defineProperty(globalThis, key, { value, configurable: true });
}
let networkRequests = 0;
const blockedNetwork = () => {
  networkRequests++;
  throw new Error("Native serialization fixtures must not make network requests.");
};
globalThis.fetch = blockedNetwork;
dom.window.fetch = blockedNetwork;
dom.window.navigator.sendBeacon = blockedNetwork;
for (const name of ["WebSocket", "XMLHttpRequest"]) {
  const constructor = class { constructor() { blockedNetwork(); } };
  Object.defineProperty(globalThis, name, { value: constructor, configurable: true });
  Object.defineProperty(dom.window, name, { value: constructor, configurable: true });
}

const tests = [];
async function verify(binding, description, check) {
  try {
    await check();
    tests.push({ binding, description, status: "passed" });
    console.log(`PASS ${binding}: ${description}`);
  } catch (error) {
    tests.push({ binding, description, status: "failed" });
    console.error(`FAIL ${binding}: ${error.message}`);
    process.exitCode = 1;
  }
}
try {
  await verify("tiptap", "Native JSON, formatting and onUpdate round-trip", async () => {
    const { Editor } = await import("@tiptap/core");
    const { default: StarterKit } = await import("@tiptap/starter-kit");
    let updates = 0;
    const text = "Local Tiptap JSON round-trip";
    const editor = new Editor({
      element: dom.window.document.createElement("div"),
      extensions: [StarterKit],
      content: { type: "doc", content: [{ type: "paragraph" }] },
      onUpdate: () => { updates++; },
    });
    try {
      editor.commands.setContent({
        type: "doc",
        content: [{ type: "heading", attrs: { level: 2 },
          content: [{ type: "text", text, marks: [{ type: "bold" }] }] }],
      }, { emitUpdate: true, errorOnInvalidContent: true });
      const stored = JSON.stringify(editor.getJSON());
      editor.commands.setContent(JSON.parse(stored), { emitUpdate: true, errorOnInvalidContent: true });
      assert.equal(JSON.stringify(editor.getJSON()), stored);
      assert.equal(editor.getJSON().content[0].content[0].text, text);
      assert.equal(editor.getJSON().content[0].type, "heading");
      assert.deepEqual(editor.getJSON().content[0].content[0].marks, [{ type: "bold" }]);
      assert.ok(updates > 0);
    } finally {
      editor.destroy();
    }
  });

  await verify("lexical", "SerializedEditorState JSON and update-listener round-trip", async () => {
    const { createEditor, $getRoot, $createParagraphNode, $createTextNode } = await import("lexical");
    const editor = createEditor({
      namespace: "aureform-local-round-trip",
      onError(error) { throw error; },
    });
    let updates = 0;
    const unsubscribe = editor.registerUpdateListener(() => { updates++; });
    const text = "Local Lexical JSON round-trip";
    try {
      editor.update(() => {
        $getRoot().clear().append($createParagraphNode().append($createTextNode(text).toggleFormat("bold")));
      }, { discrete: true });
      const stored = JSON.stringify(editor.getEditorState().toJSON());
      editor.update(() => {
        $getRoot().clear().append($createParagraphNode().append($createTextNode("Temporary local edit")));
      }, { discrete: true });
      editor.setEditorState(editor.parseEditorState(stored));
      await new Promise((resolve) => queueMicrotask(resolve));
      assert.equal(JSON.stringify(editor.getEditorState().toJSON()), stored);
      editor.getEditorState().read(() => { assert.equal($getRoot().getTextContent(), text); });
      assert.ok(updates > 0);
    } finally {
      unsubscribe();
      editor.setRootElement(null);
    }
  });

  await verify("blocknote", "Native block-array JSON and onChange round-trip", async () => {
    const { BlockNoteEditor } = await import("@blocknote/core");
    const text = "Local BlockNote JSON round-trip";
    const editor = BlockNoteEditor.create({ initialContent: [{ type: "paragraph", content: text }] });
    let updates = 0;
    const unsubscribe = editor.onChange(() => { updates++; });
    try {
      editor.updateBlock(editor.document[0], { type: "heading", props: { level: 2 } });
      const stored = JSON.stringify(editor.document);
      editor.replaceBlocks(editor.document, JSON.parse(stored));
      assert.equal(JSON.stringify(editor.document), stored);
      assert.equal(editor.document[0].type, "heading");
      assert.equal(editor.document[0].content[0].text, text);
      assert.ok(updates > 0);
    } finally {
      unsubscribe();
    }
  });

  await verify("mapbox", "Native coordinates/bounds and returned GeoJSON serialization", async () => {
    const { default: library } = await import("mapbox-gl");
    const { LngLat, LngLatBounds } = library;
    for (const constructor of [library.Map, library.Marker, library.NavigationControl, LngLat, LngLatBounds]) {
      assert.equal(typeof constructor, "function", "Use the native package's default runtime API.");
    }
    const coordinates = [[-74.0721, 4.711], [-75.5812, 6.2442]];
    const geojson = { type: "FeatureCollection", features: [{
      type: "Feature", properties: {},
      geometry: { type: "LineString", coordinates },
    }] };
    const stored = JSON.stringify(geojson);
    const restored = JSON.parse(stored);
    const nativeCoordinates = restored.features[0].geometry.coordinates
      .map((coordinate) => LngLat.convert(coordinate).toArray());
    assert.deepEqual(nativeCoordinates, coordinates);
    const bounds = new LngLatBounds();
    for (const coordinate of nativeCoordinates) bounds.extend(coordinate);
    assert.deepEqual(JSON.parse(JSON.stringify(bounds.toArray())), [[-75.5812, 4.711], [-74.0721, 6.2442]]);
    assert.equal(JSON.stringify(restored), stored);
  });
} finally {
  dom.window.close();
}
if (networkRequests !== 0) process.exitCode = 1;
const result = {
  passed: tests.filter((test) => test.status === "passed").length,
  failed: tests.filter((test) => test.status === "failed").length,
  networkRequests,
  tests,
};
await writeFile(process.argv[2] ?? "roundtrip-results.json", JSON.stringify(result, null, 2) + "\n");
