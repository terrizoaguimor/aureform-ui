import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { strictCheckPayloads } = require("./verify-component-examples.cjs");
const root = new URL("../", import.meta.url);
const files = [
  "docs/website/en/integrations.md",
  "docs/website/es/integrations.md",
  "docs/integrations/identity.md",
  "docs/integrations/ai.md",
  "docs/integrations/commerce.md",
  "docs/integrations/product-workflows.md",
  "docs/integrations/operations.md",
  "docs/integrations/browser-bindings.md",
];
const payloads = [];
const records = [];
for (const file of files) {
  const markdown = await readFile(new URL(file, root), "utf8");
  const blocks = [...markdown.matchAll(/^```(?:tsx|ts)\n([\s\S]*?)^```/gm)];
  const complete = blocks.filter(
    (match) =>
      /^"use client";/.test(match[1]) ||
      /export (?:async )?function (?:handleIdentityRequest|createConsumerAiHandler|createConsumerCommerceHandler)\(/.test(
        match[1],
      ),
  );
  assert.ok(
    complete.length,
    `${file} must retain its complete consumer example.`,
  );
  for (const [index, block] of complete.entries()) {
    payloads.push({
      name: `integration-docs/${file.replaceAll("/", "-")}-${index}.tsx`,
      source: block[1],
    });
    records.push({
      file,
      block: blocks.indexOf(block) + 1,
      sha256: createHash("sha256").update(block[1]).digest("hex"),
    });
  }
}
assert.equal(
  payloads.length,
  11,
  "Retain the eight complete client examples and three consumer bridges.",
);
const compilation = strictCheckPayloads(payloads);
const { version } = JSON.parse(
  await readFile(new URL("package.json", root), "utf8"),
);
const report = {
  status: "passed-strict-integration-examples",
  version,
  checkedAt: new Date().toISOString(),
  examples: records,
  compilation,
};
const directory = new URL("artifacts/integration-examples/", root);
await mkdir(directory, { recursive: true });
await writeFile(
  new URL("validation.json", directory),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({ status: report.status, version, compilation }, null, 2),
);
