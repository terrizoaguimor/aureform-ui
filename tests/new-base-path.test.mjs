import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { publicPath } from "../src/lib/public-path.ts";
import { dependencyClosure } from "../scripts/lib/source-graph.mjs";

const aliases = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      specifier.startsWith("@/")
        ? new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href
        : specifier,
      context,
    );
  },
});
let generatedImageBlob;
try {
  ({ generatedImageBlob } =
    await import("../src/lib/download-generated-image.ts"));
} finally {
  aliases.deregister();
}

test("root and mounted public paths retain query strings and fragments", () => {
  for (const path of [
    "/assets/avatars/alex-morgan.svg",
    "/assets/aureform-motion.webm",
    "/downloads/aureform-ui-source.zip",
    "/previews/light/dashboard.webp",
    "/r/button.json",
    "/en/customers/?view=hello%2Bworld#directory",
    "/",
  ]) {
    assert.equal(publicPath(path, ""), path);
    assert.equal(publicPath(path, "/"), path);
    assert.equal(publicPath(path, " /aureform-ui/ "), `/aureform-ui${path}`);
  }
});

test("mounted paths are idempotent and respect the full prefix boundary", () => {
  for (const path of [
    "/aureform-ui",
    "/aureform-ui/",
    "/aureform-ui/assets/art/arc.svg",
    "/aureform-ui?view=shared",
    "/aureform-ui#directory",
  ]) {
    assert.equal(publicPath(path, "/aureform-ui"), path);
  }
  assert.equal(
    publicPath("/aureform-ui-other/photo.webp", "/aureform-ui"),
    "/aureform-ui/aureform-ui-other/photo.webp",
  );
  assert.equal(
    publicPath("/assets/art/arc.svg", "/demos/aureform-ui/"),
    "/demos/aureform-ui/assets/art/arc.svg",
  );
});

test("external, protocol-relative, data, blob, hash and relative URLs are preserved", () => {
  for (const path of [
    "https://example.com/avatar.webp?size=320",
    "http://localhost:3000/r/button.json",
    "//images.example.com/avatar.webp",
    "data:image/webp;base64,UklGRg==",
    "blob:https://example.com/record",
    "mailto:hello@example.com",
    "#main-content",
    "assets/photo.webp",
    "../image.webp",
    "",
  ]) {
    assert.equal(publicPath(path, "/aureform-ui"), path);
  }
});

test("image downloads fetch the mounted container and preserve unavailable-file failures", async () => {
  const previousBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
  const originalFetch = globalThis.fetch;
  const requests = [];
  process.env.NEXT_PUBLIC_BASE_PATH = "/aureform-ui";
  globalThis.fetch = async (url) => {
    requests.push(url);
    return new Response("", { status: 404 });
  };
  try {
    for (const src of [
      "/assets/art/arc.svg",
      "/aureform-ui/assets/art/arc.svg",
      "https://example.com/art.svg",
    ]) {
      await assert.rejects(
        () => generatedImageBlob(src, 42),
        /Generated image container unavailable/,
      );
    }
    assert.deepEqual(requests, [
      "/aureform-ui/assets/art/arc.svg",
      "/aureform-ui/assets/art/arc.svg",
      "https://example.com/art.svg",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousBasePath === undefined) {
      delete process.env.NEXT_PUBLIC_BASE_PATH;
    } else {
      process.env.NEXT_PUBLIC_BASE_PATH = previousBasePath;
    }
  }
});

test("standalone image and link primitives carry the public-path helper into installs", async () => {
  for (const name of [
    "avatar",
    "gallery",
    "video-player",
    "link",
    "breadcrumb",
    "sidebar",
  ]) {
    const graph = await dependencyClosure([`src/components/ui/${name}.tsx`]);
    assert.ok(
      graph.files.includes("src/lib/public-path.ts"),
      `${name}: missing mount-point helper`,
    );
  }
  const graph = await dependencyClosure([
    "src/components/templates/media-studio.tsx",
    "src/components/templates/data-manager.tsx",
  ]);
  assert.ok(graph.files.includes("src/lib/download-generated-image.ts"));
  assert.ok(graph.assets.includes("public/assets/art/arc.svg"));
  assert.ok(
    graph.assets.includes("public/assets/products/forma-desk-lamp.svg"),
  );
  assert.ok(graph.assets.includes("public/assets/aureform-motion.webm"));
});
