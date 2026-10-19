import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { streamDemoReply } from "../src/demo/ai-adapter.ts";
import { csv } from "../src/lib/utils.ts";

// Resolve the kit's actual @/* -> src/* imports while loading the pure browser
// adapter and its metadata. No implementation or image result is substituted.
const sourceAliases = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/"))
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    return nextResolve(specifier, context);
  },
});
let prepareDemoVisuals;
try {
  ({ prepareDemoVisuals } = await import("../src/demo/visual-adapter.ts"));
} finally {
  sourceAliases.deregister();
}
test("streaming can be stopped without emitting another token", async () => {
  const controller = new AbortController(),
    stream = streamDemoReply("A new workspace", {
      locale: "en",
      model: "balanced",
      signal: controller.signal,
      delay: 1,
    });
  const first = await stream.next();
  assert.equal(first.done, false);
  controller.abort();
  await assert.rejects(() => stream.next(), { name: "AbortError" });
});
test("a failed adapter can be retried and both locales produce a complete local reply", async () => {
  await assert.rejects(async () => {
    for await (const chunk of streamDemoReply("Hello", {
      locale: "en",
      model: "balanced",
      signal: new AbortController().signal,
      delay: 0,
      fail: true,
    }))
      assert.fail(chunk);
  }, /simulated/);
  for (const locale of ["en", "es"]) {
    let reply = "";
    for await (const chunk of streamDemoReply("A good beginning", {
      locale,
      model: "precise",
      signal: new AbortController().signal,
      delay: 0,
    }))
      reply += chunk;
    assert.match(
      reply,
      locale === "en" ? /demonstration adapter/ : /adaptador local/,
    );
    assert.ok(reply.includes("A good beginning"));
  }
});
test("visual previews cancel, fail and deterministically select original prepared resources", async () => {
  const request = {
    kind: "images",
    prompt: "Quiet forest forms",
    ratio: "4:3",
    style: "editorial",
    count: 2,
    strength: 65,
    signal: new AbortController().signal,
    delay: 0,
  };
  assert.deepEqual(
    await prepareDemoVisuals(request),
    await prepareDemoVisuals(request),
  );
  await assert.rejects(
    () => prepareDemoVisuals({ ...request, fail: true }),
    /Simulated/,
  );
  const controller = new AbortController(),
    pending = prepareDemoVisuals({
      ...request,
      signal: controller.signal,
      delay: 100,
    });
  controller.abort();
  await assert.rejects(() => pending, { name: "AbortError" });
  const video = await prepareDemoVisuals({ ...request, kind: "video" });
  assert.equal(video.length, 1);
  assert.match(video[0].src, /\.webm$/);
});
test("CSV safely quotes content and prevents formula interpretation of user values", () => {
  const output = csv([
    { name: 'A "quoted", name', formula: "=1+1", amount: 42 },
  ]);
  assert.ok(output.includes('"A ""quoted"", name"'));
  assert.ok(output.includes(`"'=1+1"`));
  assert.ok(output.includes('"42"'));
  assert.equal(csv([]), "");
});
