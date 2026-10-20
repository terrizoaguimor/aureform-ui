import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const { version } = JSON.parse(
  await readFile(new URL("package.json", root), "utf8"),
);
const checksums = JSON.parse(
  await readFile(new URL("public/downloads/checksums.json", root), "utf8"),
);
assert.equal(
  checksums.version,
  version,
  "Regenerate release packages before deploying a new version.",
);
const archive = checksums.archives.find(
  (item) => item.name === "aureform-ui-source.zip",
);
assert(archive, "The source archive must be recorded in checksums.json.");
assert.match(archive.sha256, /^[a-f0-9]{64}$/);
assert(Number.isSafeInteger(archive.bytes) && archive.bytes > 0);
const url = `https://github.com/terrizoaguimor/aureform-ui/releases/download/v${version}/aureform-ui-source.zip`;
const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
assert.equal(
  response.status,
  200,
  `Publish the matching GitHub release source archive before deploying v${version}.`,
);
assert(response.body, "The public source download must contain a body.");
const digest = createHash("sha256");
let bytes = 0;
for await (const chunk of response.body) {
  bytes += chunk.byteLength;
  assert(bytes <= archive.bytes, "The public source archive is oversized.");
  digest.update(chunk);
}
assert.equal(bytes, archive.bytes, "The public source download is incomplete.");
assert.equal(
  digest.digest("hex"),
  archive.sha256,
  "The public release must match the packaged source archive exactly.",
);
console.log(
  JSON.stringify(
    { status: "passed", version, bytes, sha256: archive.sha256, url },
    null,
    2,
  ),
);
