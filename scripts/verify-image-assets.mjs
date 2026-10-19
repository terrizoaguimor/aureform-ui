#!/usr/bin/env node
/**
 * Independent image delivery checks. This never generates images or reads
 * credentials. Consumer installation and Chromium require --run-consumers.
 *
 * node scripts/verify-image-assets.mjs --assets-only
 * node scripts/verify-image-assets.mjs --plan-consumers
 * node scripts/verify-image-assets.mjs --out artifacts/image-assets-1.2.1/FRESH
 * node scripts/verify-image-assets.mjs --run-consumers --base-url http://127.0.0.1:3012 --consumer-root /tmp/aureform-image-consumers-FRESH
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import {
  mkdir,
  readFile,
  readdir,
  realpath,
  stat,
  statfs,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Script, createContext } from "node:vm";

const KIT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = "gpt-image-2.5-flare-2026-09-08";
const MANIFEST = "public/assets/generated-images.json";
const GROUPS = { avatars: 18, products: 8, art: 6 };
const ITEMS = ["dashboard", "data-manager", "media-studio", "files-support"];
const HELPERS = [
  "src/demo/avatar-assets.ts",
  "src/demo/product-assets.ts",
  "src/demo/editorial-assets.ts",
];
const DOWNLOAD = "src/lib/download-generated-image.ts";
const SHA = /^[a-f0-9]{64}$/;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const posix = (value) => value.split(sep).join("/");
const within = (root, value) => {
  const path = relative(root, value);
  return !isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`);
};
const help = `Aureform image asset verification (not release certification)

  --assets-only       Catalog, provenance, WebP decode, SVG bytes and budgets.
  --plan-consumers    Print the bounded consumer protocol; no writes/subprocesses.
  --run-consumers     Also install two fresh consumers and run real Chromium.
  --kit DIR           Defaults to this script's source kit.
  --out FRESH_DIR     Report directory; defaults to artifacts/image-assets-VERSION/TIMESTAMP.
  --python EXECUTABLE Defaults to python3, with Pillow and WebP support.
  --base-url ORIGIN   Required by consumers; HTTP(S), no credentials/query/hash.
  --consumer-root DIR Required by consumers; a fresh directory outside the kit in /tmp.
  --store-dir DIR     Optional real pnpm store, default /tmp/.pnpm-store.
  --pnpm EXECUTABLE   Defaults to pnpm.

Default: read-only asset/source/local-registry audit, plus a fresh report.
Only --run-consumers installs packages, serves fixtures or launches Chromium.
It tests image delivery and the actual installed download helper, not template
interactions, application typecheck/lint/build, ZIPs, Figma or the full 1.2 suite.
Masters are checked when available and are never required in source archives.
`;

function args(argv) {
  const options = {
    kit: KIT,
    python: "python3",
    pnpm: "pnpm",
    storeDir: "/tmp/.pnpm-store",
  };
  for (let i = 0; i < argv.length; i++) {
    const name = {
      "--kit": "kit",
      "--out": "out",
      "--python": "python",
      "--base-url": "baseURL",
      "--consumer-root": "consumerRoot",
      "--store-dir": "storeDir",
      "--pnpm": "pnpm",
    }[argv[i]];
    if (name) {
      assert(
        argv[i + 1] && !argv[i + 1].startsWith("--"),
        `${argv[i]} requires a value.`,
      );
      options[name] = argv[++i];
    } else if (
      [
        "--assets-only",
        "--plan-consumers",
        "--run-consumers",
        "--help",
      ].includes(argv[i])
    ) {
      options[
        argv[i].slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())
      ] = true;
    } else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  assert(
    [options.assetsOnly, options.planConsumers, options.runConsumers].filter(
      Boolean,
    ).length <= 1,
    "Choose one execution mode.",
  );
  options.kit = resolve(options.kit);
  if (options.out) options.out = resolve(options.out);
  if (options.runConsumers) {
    assert(
      options.baseURL && options.consumerRoot,
      "Consumers require --base-url and --consumer-root.",
    );
    const url = new URL(options.baseURL);
    assert(
      ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname === "/",
      "Use a plain HTTP(S) origin.",
    );
    options.baseURL = url.origin;
    options.consumerRoot = resolve(options.consumerRoot);
    assert(
      within("/tmp", options.consumerRoot) &&
        options.consumerRoot !== "/tmp" &&
        !within(options.kit, options.consumerRoot) &&
        !within(options.consumerRoot, options.kit),
      "Consumer root must be a new, separate directory in /tmp.",
    );
  }
  return options;
}

function safePath(value) {
  assert(
    typeof value === "string" &&
      value &&
      !value.includes("\\") &&
      !value.includes("\0") &&
      !isAbsolute(value) &&
      value.split("/").every((part) => part && part !== "." && part !== ".."),
    `Invalid relative path: ${value}`,
  );
  assert(
    !value
      .split("/")
      .some((part) => part === ".env" || part.startsWith(".env.")),
    "Environment files are outside this audit.",
  );
  return value;
}

function assetPath(url) {
  assert(
    /^\/assets\/[a-zA-Z0-9/_.-]+$/.test(url),
    `Expected a fixed local asset URL: ${url}`,
  );
  return safePath(`public${url}`);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

class Audit {
  constructor(options, report) {
    this.options = options;
    this.report = report;
    this.inputs = new Map();
  }
  check(name, passed, evidence = {}) {
    this.report.checks.push({ name, passed: Boolean(passed), ...evidence });
    return passed;
  }
  async read(path) {
    safePath(path);
    const absolute = resolve(this.options.kit, path);
    assert(
      within(await realpath(this.options.kit), await realpath(absolute)),
      `Input escapes kit: ${path}`,
    );
    const bytes = await readFile(absolute);
    const record = { path, bytes: bytes.length, sha256: hash(bytes) };
    const previous = this.inputs.get(path);
    assert(
      !previous || previous.sha256 === record.sha256,
      `Input changed while reading: ${path}`,
    );
    this.inputs.set(path, record);
    return bytes;
  }
  async json(path) {
    return JSON.parse((await this.read(path)).toString("utf8"));
  }
  async finishInputs() {
    const files = [...this.inputs.values()].sort((a, b) =>
      a.path.localeCompare(b.path),
    );
    const changed = [];
    for (const item of files) {
      try {
        if (
          hash(await readFile(resolve(this.options.kit, item.path))) !==
          item.sha256
        )
          changed.push(item.path);
      } catch {
        changed.push(item.path);
      }
    }
    this.report.sourceIntegrity = {
      trackedFiles: files.length,
      startSHA256: hash(JSON.stringify(files)),
      unchanged: !changed.length,
      changed,
    };
    this.report.inputs = files;
    this.check("captured inputs remained unchanged", !changed.length, {
      changed,
    });
  }
}

async function processBytes(command, { cwd, input, timeout = 120_000 } = {}) {
  return new Promise((done, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout = [],
      stderr = [];
    let timedOut = false,
      launchError;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      const force = setTimeout(() => child.kill("SIGKILL"), 1000);
      force.unref();
    }, timeout);
    child.on("error", (error) => {
      launchError = error;
    });
    child.stdout.on("data", (bytes) => stdout.push(bytes));
    child.stderr.on("data", (bytes) => stderr.push(bytes));
    child.stdin.on("error", () => {});
    child.stdin.end(input);
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      if (launchError) return reject(launchError);
      done({
        exitCode,
        signal,
        timedOut,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      });
    });
  });
}

// A decoder independent of prepare-image-assets.py. No resize/re-encoding.
const PYTHON = String.raw`
import base64, hashlib, io, json, re, struct, sys
from pathlib import Path
from xml.etree import ElementTree as ET
from PIL import Image, features
import PIL

request = json.load(sys.stdin)
root = Path(request["kit"]).resolve()
if not features.check("webp"):
    raise RuntimeError("Pillow has no WebP decoder")
Image.MAX_IMAGE_PIXELS = 16_000_000
digest = lambda data: hashlib.sha256(data).hexdigest()
records = []
for item in request["items"]:
    checks = []
    def check(name, passed, **evidence):
        checks.append({"name": item["id"] + ": " + name, "passed": bool(passed), **evidence})
    def decode(data):
        valid = len(data) >= 20 and data[:4] == b"RIFF" and data[8:12] == b"WEBP" and struct.unpack("<I", data[4:8])[0] + 8 == len(data)
        if not valid:
            raise ValueError("Invalid RIFF/WebP header or byte length")
        with Image.open(io.BytesIO(data)) as image:
            if image.format != "WEBP" or image.width * image.height > 16_000_000 or getattr(image, "n_frames", 1) != 1:
                raise ValueError("Expected one bounded WebP image")
            image.load()
            return {"format": image.format, "width": image.width, "height": image.height, "rgbaSHA256": digest(image.convert("RGBA").tobytes())}
    record = {"id": item["id"], "checks": checks, "masterStatus": "NOT_AVAILABLE"}
    try:
        raster = (root / ("public" + item["downloadSrc"])).read_bytes()
        svg_bytes = (root / ("public" + item["src"])).read_bytes()
        decoded = decode(raster)
        record["decoded"] = decoded
        check("WebP header, decode and dimensions", decoded["width"] == item["width"] and decoded["height"] == item["height"], **decoded)
        check("WebP bytes and SHA256", len(raster) == item["webpBytes"] and digest(raster) == item["webpSha256"], actualBytes=len(raster), actualSHA256=digest(raster))
        check("SVG bytes and SHA256", len(svg_bytes) == item["svgBytes"] and digest(svg_bytes) == item["svgSha256"], actualBytes=len(svg_bytes), actualSHA256=digest(svg_bytes))
        text = svg_bytes.decode("utf-8")
        if "<!DOCTYPE" in text.upper() or "<!ENTITY" in text.upper():
            raise ValueError("SVG must be a simple self-contained image")
        svg = ET.fromstring(text)
        namespace = "{http://www.w3.org/2000/svg}"
        images = list(svg.iter(namespace + "image"))
        allowed = {namespace + "svg", namespace + "title", namespace + "desc", namespace + "image"}
        check("SVG image-only structure", svg.tag == namespace + "svg" and len(images) == 1 and all(node.tag in allowed for node in svg.iter()) and all(not key.lower().startswith("on") for node in svg.iter() for key in node.attrib))
        check("SVG viewport matches raster", float(svg.attrib.get("width", "nan")) == item["width"] and float(svg.attrib.get("height", "nan")) == item["height"] and [float(v) for v in svg.attrib.get("viewBox", "").split()] == [0, 0, item["width"], item["height"]])
        if len(images) != 1:
            raise ValueError("Expected exactly one embedded image")
        image = images[0]
        href = image.attrib.get("href", image.attrib.get("{http://www.w3.org/1999/xlink}href", ""))
        match = re.fullmatch(r"data:image/webp;base64,([A-Za-z0-9+/=\s]+)", href)
        if not match:
            raise ValueError("Embedded image must be a data:image/webp URI")
        embedded = base64.b64decode(re.sub(r"\s", "", match.group(1)), validate=True)
        check("embedded bytes equal the WebP sibling", embedded == raster, embeddedSHA256=digest(embedded))
        check("embedded raster independently decodes", decode(embedded) == decoded)
        check("SVG image dimensions match raster", float(image.attrib.get("width", "nan")) == item["width"] and float(image.attrib.get("height", "nan")) == item["height"])
        hrefs = [value for node in svg.iter() for key, value in node.attrib.items() if key.endswith("href")]
        check("SVG contains no external resources", hrefs == [href] and not any(node.tag in (namespace + "script", namespace + "foreignObject") for node in svg.iter()))
        master = root / item["master"]
        if master.is_file():
            if not master.resolve().is_relative_to(root):
                raise ValueError("Master escapes source kit")
            original = master.read_bytes()
            original_decode = decode(original)
            record["masterDecoded"] = original_decode
            master_matches = digest(original) == item["masterSha256"] and len(original) == item["masterBytes"] and original_decode["width"] == item["masterWidth"] and original_decode["height"] == item["masterHeight"]
            record["masterStatus"] = "VERIFIED" if master_matches else "MISMATCH"
            check("available master hash, bytes and dimensions", master_matches)
            check("optimized output is smaller than available master", len(raster) < len(original))
    except Exception as error:
        record["error"] = str(error)
        check("complete image contract", False, error=str(error))
    records.append(record)
print(json.dumps({"python": sys.version.split()[0], "pillow": PIL.__version__, "webpDecoder": True, "items": records}))
`;

async function verifyAssets(audit) {
  const manifest = await audit.json(MANIFEST);
  const catalogPath = safePath(manifest.generation?.promptCatalog);
  const catalog = await audit.json(catalogPath);
  audit.report.releaseUnderTest = manifest.version;
  audit.report.modelDeclared = manifest.model;
  audit.check("asset manifest release is 1.2.1", manifest.version === "1.2.1");
  audit.check(
    "catalog and manifest declare the specified model",
    manifest.model === MODEL && catalog.model === MODEL,
  );
  const records = manifest.items;
  assert(
    Array.isArray(records) && Array.isArray(catalog.items),
    "Catalog and manifest need item arrays.",
  );
  audit.check(
    "catalog contains 32 unique assets",
    catalog.items.length === 32 &&
      new Set(catalog.items.map((item) => item.id)).size === 32,
  );
  audit.check(
    "manifest contains the same 32 identities",
    records.length === 32 &&
      new Set(records.map((item) => item.id)).size === 32 &&
      records.every((item) => catalog.items.some((row) => row.id === item.id)),
  );
  const byId = new Map(catalog.items.map((item) => [item.id, item]));
  for (const [group, count] of Object.entries(GROUPS))
    audit.check(
      `${group}: approved collection count`,
      records.filter((item) => item.group === group).length === count,
    );
  const budgets = {
    avatars: 128 * 1024,
    products: 512 * 1024,
    art: 1024 * 1024,
  };
  for (const item of records) {
    const original = byId.get(item.id);
    assert(
      original && Object.hasOwn(GROUPS, item.group),
      `Unknown asset ${item.id}`,
    );
    assert(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id),
      "Unsafe image identity.",
    );
    assert(
      item.src === `/assets/${item.group}/${item.id}.svg` &&
        item.downloadSrc === `/assets/${item.group}/${item.id}.webp`,
      `Nonfixed public paths: ${item.id}`,
    );
    for (const key of [
      "webpSha256",
      "svgSha256",
      "masterSha256",
      "promptSha256",
    ])
      assert(SHA.test(item[key]), `${item.id}: missing ${key}`);
    for (const key of [
      "width",
      "height",
      "webpBytes",
      "svgBytes",
      "masterWidth",
      "masterHeight",
      "masterBytes",
    ])
      assert(
        Number.isSafeInteger(item[key]) && item[key] > 0,
        `${item.id}: invalid ${key}`,
      );
    audit.check(
      `${item.id}: catalog metadata and prompt provenance`,
      original.group === item.group &&
        JSON.stringify(original.webSize) ===
          JSON.stringify([item.width, item.height]) &&
        original.size === `${item.masterWidth}x${item.masterHeight}` &&
        item.master === `output/imagegen/masters/${original.master}` &&
        typeof original.prompt === "string" &&
        hash(original.prompt) === item.promptSha256,
    );
    audit.check(
      `${item.id}: localized descriptive metadata`,
      ["en", "es"].every(
        (locale) =>
          typeof item.alt?.[locale] === "string" &&
          item.alt[locale].trim() &&
          item.alt[locale] === original.alt?.[locale],
      ),
    );
    const bytes = await audit.read(assetPath(item.downloadSrc));
    await audit.read(assetPath(item.src));
    audit.check(
      `${item.id}: optimized delivery budget`,
      bytes.length <= budgets[item.group] &&
        item.width <= 2048 &&
        item.height <= 2048,
      { bytes: bytes.length, limit: budgets[item.group] },
    );
    safePath(item.master);
    if (await exists(resolve(audit.options.kit, item.master)))
      await audit.read(item.master);
  }
  for (const group of Object.keys(GROUPS)) {
    const names = (
      await readdir(join(audit.options.kit, "public/assets", group))
    ).filter((name) => /\.(?:svg|webp)$/.test(name));
    const expected = records
      .filter((item) => item.group === group)
      .flatMap((item) => [`${item.id}.svg`, `${item.id}.webp`]);
    audit.check(
      `${group}: no missing or unlisted deliverables`,
      names.length === expected.length &&
        names.every((name) => expected.includes(name)),
    );
  }
  const total = records.reduce((sum, item) => sum + item.webpBytes, 0);
  audit.check(
    "optimized collection stays within 4 MiB",
    total <= 4 * 1024 * 1024,
    { bytes: total, limit: 4 * 1024 * 1024 },
  );
  const result = await processBytes(
    [audit.options.python, "-B", "-c", PYTHON],
    { input: JSON.stringify({ kit: audit.options.kit, items: records }) },
  );
  assert(
    result.exitCode === 0 && !result.timedOut,
    `Pillow verification failed: ${result.stderr.toString("utf8")}`,
  );
  const decoded = JSON.parse(result.stdout.toString("utf8"));
  assert(
    decoded.items.length === records.length,
    "Decoder did not execute the whole collection.",
  );
  for (const item of decoded.items)
    for (const check of item.checks) audit.report.checks.push(check);
  audit.report.assets = {
    manifestSHA256: audit.inputs.get(MANIFEST).sha256,
    catalogSHA256: audit.inputs.get(catalogPath).sha256,
    count: records.length,
    optimizedWebPBytes: total,
    portableSVGBytes: records.reduce((sum, item) => sum + item.svgBytes, 0),
    availableMastersVerified: decoded.items.filter(
      (item) => item.masterStatus === "VERIFIED" && !item.error,
    ).length,
    unavailableMasters: decoded.items
      .filter((item) => item.masterStatus === "NOT_AVAILABLE")
      .map((item) => item.id),
    decoder: {
      python: decoded.python,
      pillow: decoded.pillow,
      webp: decoded.webpDecoder,
    },
    items: decoded.items.map((record) =>
      Object.fromEntries(
        Object.entries(record).filter(([name]) => name !== "checks"),
      ),
    ),
  };
  return manifest;
}

async function sourceFiles(root) {
  const results = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && /\.(?:tsx?|jsx?|css)$/.test(entry.name))
        results.push(path);
    }
  }
  await visit(root);
  return results.sort();
}

function imageReferences(ts, text, name) {
  const result = new Set();
  if (name.endsWith(".css")) {
    for (const match of text.matchAll(
      /url\(\s*["']?(\/assets\/[^)"'\s]+)["']?\s*\)/g,
    ))
      result.add(match[1]);
    return result;
  }
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      node.text.startsWith("/assets/")
    )
      result.add(node.text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return result;
}

async function evaluateLookup(ts, audit, name, ancestors = []) {
  try {
    assert(
      !ancestors.includes(name),
      `Cyclic lookup dependency: ${[...ancestors, name].join(" -> ")}`,
    );
    const code = (await audit.read(name)).toString("utf8");
    const compiled = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const parsed = ts.createSourceFile(
      name,
      compiled,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    );
    const imports = new Set();
    function visit(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "require"
      ) {
        assert(
          node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]),
          "Lookup dependencies must use literal local module specifiers.",
        );
        imports.add(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    }
    visit(parsed);
    const dependencies = new Map();
    const demoRoot = resolve(audit.options.kit, "src/demo");
    for (const address of imports) {
      const base = address.startsWith("@/")
        ? resolve(audit.options.kit, "src", address.slice(2))
        : address.startsWith("./") || address.startsWith("../")
          ? resolve(audit.options.kit, dirname(name), address)
          : null;
      assert(
        base && within(demoRoot, base),
        `Lookup dependency must resolve inside src/demo: ${address}`,
      );
      const candidates = /\.(?:tsx?|jsx?)$/.test(base)
        ? [base]
        : [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js"].map(
            (suffix) => base + suffix,
          );
      let dependency;
      for (const candidate of candidates) {
        if (await exists(candidate)) {
          assert(
            within(await realpath(demoRoot), await realpath(candidate)),
            `Lookup dependency escapes src/demo: ${address}`,
          );
          dependency = posix(relative(audit.options.kit, candidate));
          break;
        }
      }
      assert(dependency, `Cannot resolve lookup dependency: ${address}`);
      dependencies.set(
        address,
        await evaluateLookup(ts, audit, dependency, [...ancestors, name]),
      );
    }
    const moduleRecord = { exports: {} };
    // Keep the VM's native JS intrinsics, including Object.prototype.
    const sandbox = createContext({
      exports: moduleRecord.exports,
      module: moduleRecord,
      require(address) {
        assert(
          dependencies.has(address),
          `Lookup requested an unevaluated dependency: ${address}`,
        );
        return dependencies.get(address);
      },
    });
    new Script(compiled, { filename: name }).runInContext(sandbox, {
      timeout: 1000,
    });
    return moduleRecord.exports;
  } catch (error) {
    throw new Error(`${name}: lookup evaluation failed: ${error.message}`, {
      cause: error,
    });
  }
}

async function verifySources(audit, manifest, ts) {
  const references = new Map();
  for (const absolute of await sourceFiles(join(audit.options.kit, "src"))) {
    const name = posix(relative(audit.options.kit, absolute));
    const code = (await audit.read(name)).toString("utf8");
    for (const url of imageReferences(ts, code, name)) {
      if (!references.has(url)) references.set(url, []);
      references.get(url).push(name);
    }
  }
  for (const [url, owners] of references)
    audit.check(
      `local source asset exists: ${url}`,
      await exists(join(audit.options.kit, assetPath(url))),
      { owners },
    );
  for (const item of manifest.items)
    audit.check(
      `${item.id}: literal source URL is discoverable`,
      references.has(item.src),
      { owners: references.get(item.src) ?? [] },
    );
  const avatar = (await audit.read("src/components/ui/avatar.tsx")).toString(
    "utf8",
  );
  audit.check(
    "generic Avatar remains independent of demo image metadata",
    !avatar.includes("/assets/") &&
      !avatar.includes("/demo/") &&
      !avatar.includes("getDemo"),
  );
  const [avatars, products, art] = await Promise.all(
    HELPERS.map((name) => evaluateLookup(ts, audit, name)),
  );
  for (const item of manifest.items.filter((item) => item.group === "avatars"))
    audit.check(
      `${item.id}: actual identity lookup returns its fixed source`,
      avatars.getDemoAvatarSrc(item.id) === item.src,
    );
  for (const value of [
    "__qa_unknown_identity__",
    "__proto__",
    "constructor",
    "toString",
  ]) {
    audit.check(
      `unknown avatar identity keeps fallback: ${value}`,
      avatars.getDemoAvatarSrc(value) === undefined &&
        avatars.getDemoFixtureAvatarSrc(value) === undefined,
    );
    audit.check(
      `unknown product keeps fallback: ${value}`,
      products.getProductAsset(value) === undefined,
    );
  }
  const productItems = Object.entries(products.productAssets);
  audit.check(
    "actual product map covers eight distinct generated products",
    productItems.length === GROUPS.products &&
      new Set(productItems.map(([, value]) => value.src)).size ===
        GROUPS.products,
  );
  for (const [id, value] of productItems) {
    const record = manifest.items.find(
      (item) => item.src === value.src && item.group === "products",
    );
    audit.check(
      `${id}: actual product lookup metadata matches the prepared raster`,
      !!record &&
        products.getProductAsset(id) === value &&
        record.width === value.width &&
        record.height === value.height &&
        record.id === value.slug,
    );
  }
  audit.check(
    "editorial map covers all six prepared assets",
    art.editorialAssets.length === GROUPS.art &&
      new Set(art.editorialAssets.map((value) => value.src)).size ===
        GROUPS.art,
  );
  for (const value of art.editorialAssets) {
    const record = manifest.items.find(
      (item) => item.src === value.src && item.group === "art",
    );
    audit.check(
      `${value.id}: actual editorial/download metadata is current`,
      !!record &&
        art.getEditorialAsset(value.src) === value &&
        art.getEditorialAsset(value.id) === value &&
        record.width === value.width &&
        record.height === value.height &&
        record.webpBytes === value.webpBytes &&
        record.svgBytes === value.svgBytes &&
        value.webpFilename === `${record.id}.webp` &&
        value.svgFilename === `${record.id}.svg`,
    );
  }
  audit.check(
    "unknown editorial source stays unknown",
    art.getEditorialAsset("__qa_unknown_source__") === undefined,
  );
  await audit.read(DOWNLOAD);
  audit.report.sourceReferences = {
    fixedAssetURLs: references.size,
    generatedAssetsCovered: manifest.items.filter((item) =>
      references.has(item.src),
    ).length,
    helperModules: HELPERS,
  };
}

function dependencyName(address) {
  if (address.startsWith("@")) return address.split("/").at(-1);
  if (/^https?:\/\//.test(address))
    return new URL(address).pathname
      .split("/")
      .at(-1)
      .replace(/\.json$/, "");
  if (address.endsWith(".json"))
    return address
      .split("/")
      .at(-1)
      .replace(/\.json$/, "");
  return null; // Bare names resolve to shadcn, not this registry.
}

async function verifyRegistry(audit, manifest, ts, requireKit) {
  const schemas = await import(
    pathToFileURL(requireKit.resolve("shadcn/schema")).href
  );
  const registry = await audit.json("public/r/registry.json");
  audit.check(
    "official registry root schema",
    schemas.registrySchema.safeParse(registry).success,
  );
  const items = new Map(),
    coverage = new Map(),
    sourceByURL = new Map(manifest.items.map((item) => [item.src, item]));
  let encodedBytes = 0;
  for (const entry of registry.items) {
    const path = `public/r/${entry.name}.json`;
    const payload = await audit.json(path);
    audit.check(
      `${entry.name}: official registry item schema`,
      schemas.registryItemSchema.safeParse(payload).success,
    );
    items.set(payload.name, payload);
    for (const file of payload.files ?? []) {
      if (!file.path?.startsWith("public/assets/")) continue;
      const url = file.path.slice("public".length);
      if (!sourceByURL.has(url)) continue;
      const expected = sourceByURL.get(url);
      audit.check(
        `${payload.name}: exact SVG file delivery ${expected.id}`,
        file.type === "registry:file" &&
          file.target === `~/${file.path}` &&
          typeof file.content === "string" &&
          hash(Buffer.from(file.content)) === expected.svgSha256,
      );
      if (!coverage.has(url)) coverage.set(url, []);
      coverage.get(url).push(payload.name);
      encodedBytes += Buffer.byteLength(file.content ?? "");
    }
    audit.check(
      `${payload.name}: generated binary siblings are not mislabeled as text`,
      !(payload.files ?? []).some((file) =>
        /^public\/assets\/(?:avatars|products|art)\/.*\.webp$/.test(file.path),
      ),
    );
  }
  const closure = (name, seen = new Set()) => {
    if (seen.has(name)) return [];
    seen.add(name);
    const item = items.get(name);
    if (!item) return [];
    return [
      ...(item.files ?? []),
      ...(item.registryDependencies ?? []).flatMap((address) =>
        closure(dependencyName(address), seen),
      ),
    ];
  };
  for (const item of items.values()) {
    const files = closure(item.name);
    const delivered = new Set(
      files
        .filter((file) => file.path?.startsWith("public/assets/"))
        .map((file) => file.path.slice("public".length)),
    );
    const refs = new Set(
      files
        .filter((file) => /\.(?:tsx?|jsx?|css)$/.test(file.path ?? ""))
        .flatMap((file) => [
          ...imageReferences(ts, file.content ?? "", file.path),
        ]),
    );
    for (const url of refs) {
      if (/^\/assets\/(?:avatars|products|art)\/.*\.svg$/.test(url))
        audit.check(
          `${item.name}: referenced image ships through its registry closure ${url}`,
          delivered.has(url),
        );
    }
  }
  for (const record of manifest.items)
    audit.check(
      `${record.id}: has a schema-valid registry SVG payload`,
      coverage.has(record.src),
      { items: coverage.get(record.src) ?? [] },
    );
  for (const name of ITEMS)
    audit.check(`consumer sampler exists: ${name}`, items.has(name));
  audit.report.registry = {
    itemCount: items.size,
    generatedAssetsCovered: coverage.size,
    repeatedSVGContentBytes: encodedBytes,
    copiesPerAsset: [...coverage].map(([src, names]) => ({
      src,
      copies: names.length,
    })),
    officialSchemaChecksExecuted: true,
  };
  return items;
}

async function command(audit, consumer, label, argv) {
  console.log(`${consumer.name}: ${label}`);
  const startedAt = new Date().toISOString();
  audit.report.scope.consumerExecutionStarted = true;
  const result = await processBytes(argv, {
    cwd: consumer.project,
    timeout: 600_000,
  });
  const bytes = Buffer.concat([result.stdout, result.stderr]);
  const log = join(
    audit.options.out,
    `${audit.report.commands.length.toString().padStart(3, "0")}-${consumer.name}-${label}.log`,
  );
  await writeFile(log, bytes);
  const record = {
    consumer: consumer.name,
    label,
    command: argv,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    startedAt,
    finishedAt: new Date().toISOString(),
    log,
    logSHA256: hash(bytes),
  };
  audit.report.commands.push(record);
  assert(
    result.exitCode === 0 && !result.timedOut,
    `${consumer.name}: ${label} failed; see ${log}`,
  );
}

async function fixture(project, packageJSON) {
  await mkdir(join(project, "app"), { recursive: true });
  const versions = {
    ...packageJSON.dependencies,
    ...packageJSON.devDependencies,
  };
  const files = {
    "package.json": JSON.stringify(
      {
        name: "aureform-image-consumer",
        private: true,
        type: "module",
        dependencies: {
          next: versions.next,
          react: versions.react,
          "react-dom": versions["react-dom"],
          tailwindcss: versions.tailwindcss,
        },
        devDependencies: {
          shadcn: versions.shadcn,
          typescript: versions.typescript,
          "@types/react": versions["@types/react"],
          "@types/node": versions["@types/node"],
        },
      },
      null,
      2,
    ),
    "components.json": JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema.json",
        style: "base-nova",
        rsc: true,
        tsx: true,
        tailwind: {
          config: "",
          css: "app/globals.css",
          baseColor: "neutral",
          cssVariables: true,
          prefix: "",
        },
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
          ui: "@/components/ui",
          lib: "@/lib",
          hooks: "@/hooks",
        },
      },
      null,
      2,
    ),
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          baseUrl: ".",
          paths: { "@/*": ["./*"] },
          jsx: "preserve",
          target: "ES2022",
          module: "esnext",
          moduleResolution: "bundler",
        },
      },
      null,
      2,
    ),
    "app/globals.css": '@import "tailwindcss";\n',
    "app/layout.tsx":
      "export default function Layout({children}:{children: React.ReactNode}) { return <html><body>{children}</body></html>; }\n",
    "app/page.tsx": "export default function Page() { return null; }\n",
  };
  for (const [name, content] of Object.entries(files))
    await writeFile(join(project, name), content);
}

async function browserConsumer(audit, consumer, manifest, ts, requireKit) {
  const helperPath = join(consumer.project, "lib/download-generated-image.ts");
  assert(
    await exists(helperPath),
    `${consumer.name}: actual download helper was not installed.`,
  );
  const helper = await readFile(helperPath, "utf8");
  const parsed = ts.createSourceFile(
    helperPath,
    helper,
    ts.ScriptTarget.Latest,
    true,
  );
  assert(
    !parsed.statements.some((node) => ts.isImportDeclaration(node)),
    "Browser fixture expects the installed, self-contained download helper.",
  );
  const compiled = ts.transpileModule(helper, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  consumer.downloadHelper = {
    path: helperPath,
    sha256: hash(helper),
    transpiledSHA256: hash(compiled),
    sourceRepairs: false,
  };
  const publicRoot = await realpath(join(consumer.project, "public"));
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url, "http://127.0.0.1").pathname;
      if (path === "/") {
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(
          `<!doctype html><html><head><meta charset="utf-8"><title>Installed image assets</title></head><body><h1>Installed image assets</h1><main style="display:grid;grid-template-columns:repeat(8,1fr);gap:12px">${manifest.items.map((item) => `<img id="${item.id}" src="${item.src}" alt="${item.id}" style="width:100%;height:100px;object-fit:contain">`).join("")}</main></body></html>`,
        );
      } else if (path === "/download-helper.js") {
        response.setHeader("Content-Type", "text/javascript");
        response.end(compiled);
      } else {
        const file = resolve(publicRoot, `.${path}`);
        if (
          !within(publicRoot, file) ||
          !(await exists(file)) ||
          !within(publicRoot, await realpath(file))
        ) {
          response.writeHead(404);
          response.end("Missing installed asset");
          return;
        }
        response.setHeader(
          "Content-Type",
          file.endsWith(".svg")
            ? "image/svg+xml"
            : file.endsWith(".webp")
              ? "image/webp"
              : "application/octet-stream",
        );
        response.end(await readFile(file));
      }
    } catch {
      response.writeHead(500);
      response.end("Asset fixture error");
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    const { chromium } = requireKit("@playwright/test");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      acceptDownloads: true,
      viewport: { width: 1200, height: 800 },
    });
    const errors = [],
      network = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!["data:", "blob:"].includes(url.protocol))
        network.push({ origin: url.origin, path: url.pathname });
    });
    await page.goto(origin, { waitUntil: "load" });
    audit.report.scope.browserExecuted = true;
    const decoded = await page.evaluate(async (records) => {
      const { generatedImageBlob } = await import("/download-helper.js");
      const sha = async (bytes) =>
        Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("");
      const results = [];
      for (const item of records) {
        const image = document.getElementById(item.id);
        await image.decode();
        const blob = await generatedImageBlob(item.src, item.webpBytes);
        const bytes = await blob.arrayBuffer();
        const raster = await createImageBitmap(blob);
        const svgCanvas = document.createElement("canvas"),
          webpCanvas = document.createElement("canvas");
        svgCanvas.width = webpCanvas.width = item.width;
        svgCanvas.height = webpCanvas.height = item.height;
        svgCanvas.getContext("2d").drawImage(image, 0, 0);
        webpCanvas.getContext("2d").drawImage(raster, 0, 0);
        const svgPixels = svgCanvas
          .getContext("2d")
          .getImageData(0, 0, item.width, item.height).data;
        const webpPixels = webpCanvas
          .getContext("2d")
          .getImageData(0, 0, item.width, item.height).data;
        results.push({
          id: item.id,
          dimensions: [image.naturalWidth, image.naturalHeight],
          recoveredDimensions: [raster.width, raster.height],
          mime: blob.type,
          bytes: bytes.byteLength,
          sha256: await sha(bytes),
          svgPixelsSHA256: await sha(svgPixels),
          rasterPixelsSHA256: await sha(webpPixels),
        });
        raster.close();
      }
      return results;
    }, manifest.items);
    consumer.browser = {
      origin,
      fixture:
        "actual installed public assets and actual installed download helper",
      templateRuntimeRendered: false,
      images: decoded,
      downloads: [],
    };
    for (const record of decoded) {
      const expected = manifest.items.find((item) => item.id === record.id);
      audit.check(
        `${consumer.name}/${record.id}: real browser display, raster recovery and pixels`,
        record.dimensions[0] === expected.width &&
          record.dimensions[1] === expected.height &&
          record.recoveredDimensions[0] === expected.width &&
          record.recoveredDimensions[1] === expected.height &&
          record.mime === "image/webp" &&
          record.bytes === expected.webpBytes &&
          record.sha256 === expected.webpSha256 &&
          record.svgPixelsSHA256 === record.rasterPixelsSHA256,
        record,
      );
    }
    for (const group of Object.keys(GROUPS)) {
      const item = manifest.items.find((record) => record.group === group);
      const event = page.waitForEvent("download");
      await page.evaluate(async (record) => {
        const { downloadGeneratedImage } = await import("/download-helper.js");
        await downloadGeneratedImage({
          src: record.src,
          filename: `${record.id}.webp`,
          expectedBytes: record.webpBytes,
        });
      }, item);
      const download = await event;
      assert((await download.failure()) === null, "Browser download failed.");
      const path = join(
        audit.options.out,
        `${consumer.name}-${download.suggestedFilename()}`,
      );
      await download.saveAs(path);
      const bytes = await readFile(path);
      audit.check(
        `${consumer.name}/${group}: actual helper download bytes`,
        download.suggestedFilename() === `${item.id}.webp` &&
          bytes.length === item.webpBytes &&
          hash(bytes) === item.webpSha256,
      );
      consumer.browser.downloads.push({
        path,
        sha256: hash(bytes),
        bytes: bytes.length,
      });
    }
    audit.check(
      `${consumer.name}: no browser errors or external image requests`,
      !errors.length && network.every((request) => request.origin === origin),
      { errors },
    );
    audit.check(
      `${consumer.name}: download helper needs no WebP sibling requests`,
      !network.some((request) => /\.webp$/.test(request.path)),
    );
    const screenshot = join(
      audit.options.out,
      `${consumer.name}-installed-assets.png`,
    );
    await page.screenshot({ path: screenshot, fullPage: true });
    consumer.browser.screenshot = {
      path: screenshot,
      sha256: hash(await readFile(screenshot)),
    };
  } finally {
    if (browser) await browser.close();
    await new Promise((done) => server.close(done));
  }
}

async function verifyConsumers(
  audit,
  manifest,
  ts,
  requireKit,
  registry,
  packageJSON,
) {
  const storage = await statfs("/tmp");
  audit.report.storageAtConsumerStart = {
    freeInodes: storage.ffree,
    availableBytes: storage.bavail * storage.bsize,
  };
  assert(
    storage.ffree >= 175_000 && storage.bavail * storage.bsize >= 2 * 1024 ** 3,
    "Insufficient /tmp reserve for two fresh consumers. No installs started; report storage before retrying.",
  );
  await mkdir(audit.options.consumerRoot, { recursive: false });
  const payloads = [];
  for (const name of ["registry", ...ITEMS]) {
    const url = `${audit.options.baseURL}/r/${name}.json`;
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    assert(response.ok, `${name}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    audit.check(
      `live registry matches captured source: ${name}`,
      hash(bytes) === audit.inputs.get(`public/r/${name}.json`).sha256,
    );
    payloads.push({ name, url, sha256: hash(bytes) });
  }
  for (const name of ["cli-add", "registry"]) {
    const reserve = await statfs("/tmp");
    const requiredInodes = name === "cli-add" ? 175_000 : 90_000;
    assert(
      reserve.ffree >= requiredInodes &&
        reserve.bavail * reserve.bsize >= 1024 ** 3,
      `${name}: /tmp has ${reserve.ffree} free inodes; stop before installing and report storage. No automatic cache cleanup.`,
    );
    const consumer = {
      name,
      project: join(audit.options.consumerRoot, name),
      status: "RUNNING",
      templateTypecheckLintBuildExecuted: false,
    };
    audit.report.consumers.push(consumer);
    await fixture(consumer.project, packageJSON);
    audit.check(
      `${name}: fresh consumer has no node_modules`,
      !(await exists(join(consumer.project, "node_modules"))),
    );
    if (name === "cli-add")
      await command(audit, consumer, "native-cli-add", [
        process.execPath,
        join(audit.options.kit, "bin/aureform.mjs"),
        "add",
        ...ITEMS,
        "--cwd",
        consumer.project,
      ]);
    const install = [
      audit.options.pnpm,
      "install",
      "--no-frozen-lockfile",
      "--prefer-offline",
      "--ignore-scripts",
      "--store-dir",
      audit.options.storeDir,
    ];
    await command(audit, consumer, "real-pnpm-install", install);
    if (name === "registry")
      await command(audit, consumer, "official-shadcn-add", [
        audit.options.pnpm,
        "exec",
        "shadcn",
        "add",
        ...ITEMS.map((item) => `${audit.options.baseURL}/r/${item}.json`),
        "--yes",
        "--cwd",
        consumer.project,
      ]);
    await command(audit, consumer, "frozen-install-replay", [
      audit.options.pnpm,
      "install",
      "--frozen-lockfile",
      "--prefer-offline",
      "--ignore-scripts",
      "--store-dir",
      audit.options.storeDir,
    ]);
    const lock = await readFile(join(consumer.project, "pnpm-lock.yaml"));
    consumer.lockfile = {
      path: join(consumer.project, "pnpm-lock.yaml"),
      sha256: hash(lock),
    };
    audit.check(
      `${name}: real node_modules belongs to this consumer`,
      within(
        consumer.project,
        await realpath(join(consumer.project, "node_modules")),
      ),
    );
    consumer.images = [];
    for (const item of manifest.items) {
      const path = join(consumer.project, assetPath(item.src));
      const bytes = await readFile(path);
      audit.check(
        `${name}/${item.id}: exact installed SVG bytes`,
        hash(bytes) === item.svgSha256 && bytes.length === item.svgBytes,
      );
      const sibling = join(consumer.project, assetPath(item.downloadSrc));
      if (name === "registry")
        audit.check(
          `${name}/${item.id}: binary sibling is absent and unnecessary`,
          !(await exists(sibling)),
        );
      else if (await exists(sibling))
        audit.check(
          `${name}/${item.id}: native binary bytes are intact`,
          hash(await readFile(sibling)) === item.webpSha256,
        );
      consumer.images.push({
        id: item.id,
        path,
        sha256: hash(bytes),
        webpSiblingPresent: await exists(sibling),
      });
    }
    for (const item of ITEMS)
      audit.check(
        `${name}: installs requested template ${item}`,
        await exists(
          join(consumer.project, "components/templates", `${item}.tsx`),
        ),
      );
    await browserConsumer(audit, consumer, manifest, ts, requireKit);
    consumer.status = "PASS";
  }
  for (const payload of payloads) {
    const response = await fetch(payload.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    audit.check(
      `live registry remained unchanged: ${payload.name}`,
      response.ok &&
        hash(Buffer.from(await response.arrayBuffer())) === payload.sha256,
    );
  }
  audit.report.liveRegistry = payloads;
  audit.report.consumerScope = {
    installedItems: ITEMS,
    methods: ["native Aureform CLI", "official installed shadcn CLI"],
    browserRasterRecovery: true,
    typecheckLintBuildExecuted: false,
    fullReleaseCertification: false,
  };
  assert(registry.size, "Registry audit must precede consumer execution.");
}

export async function run(options) {
  const report = {
    kind: options.assetsOnly
      ? "IMAGE_ASSET_BYTE_CONTRACT"
      : "IMAGE_ASSET_DELIVERY_AUDIT",
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    status: "RUNNING",
    checks: [],
    commands: [],
    consumers: [],
    scope: {
      fullReleaseCertification: false,
      imageGenerationExecuted: false,
      providerInvocationVerified: false,
      environmentFilesRead: false,
      sourceRepairs: false,
      browserExecuted: false,
      consumerExecutionStarted: false,
    },
  };
  const audit = new Audit(options, report);
  let failure;
  try {
    const packageJSON = await audit.json("package.json");
    report.kitVersion = packageJSON.version;
    const metadata = await audit.json(MANIFEST);
    assert(
      /^\d+\.\d+\.\d+$/.test(metadata.version),
      "Asset manifest must declare a release version.",
    );
    const artifactRoot = join(
      options.kit,
      "artifacts",
      `image-assets-${metadata.version}`,
    );
    options.out ??= join(
      artifactRoot,
      `${new Date().toISOString().replace(/[:.]/g, "-")}-${options.assetsOnly ? "bytes" : options.runConsumers ? "consumers" : "audit"}`,
    );
    assert(
      within(artifactRoot, options.out) ||
        (within("/tmp", options.out) && !within(options.kit, options.out)),
      "Reports must be in the image artifact directory or outside the kit in /tmp.",
    );
    await mkdir(dirname(options.out), { recursive: true });
    await mkdir(options.out, { recursive: false });
    report.outputDirectory = options.out;
    report.verifierSHA256 = hash(
      await audit.read("scripts/verify-image-assets.mjs"),
    );
    report.protectedConsumerRunnerSHA256 = hash(
      await audit.read("scripts/verify-saas-consumers.mjs"),
    );
    const manifest = await verifyAssets(audit);
    const requireKit = createRequire(join(options.kit, "package.json"));
    if (!options.assetsOnly) {
      const ts = requireKit("typescript");
      await verifySources(audit, manifest, ts);
      const registry = await verifyRegistry(audit, manifest, ts, requireKit);
      if (options.runConsumers) {
        assert(
          report.checks.every((check) => check.passed),
          "Local image contracts failed; consumer execution did not start.",
        );
        await verifyConsumers(
          audit,
          manifest,
          ts,
          requireKit,
          registry,
          packageJSON,
        );
      }
    } else
      report.pending = [
        "source/reference/helper audit",
        "generated registry audit",
        "two isolated consumer installations",
        "real browser decoding/downloads",
      ];
  } catch (error) {
    failure = error.stack;
    report.failure = failure;
    audit.check("execution completed", false, { error: error.message });
  } finally {
    try {
      await audit.finishInputs();
    } catch (error) {
      failure ??= error.stack;
      audit.check("captured input readback completed", false, {
        error: error.message,
      });
    }
    report.status =
      !failure && report.checks.every((check) => check.passed)
        ? "PASS"
        : "FAIL";
    for (const consumer of report.consumers)
      if (consumer.status === "RUNNING") consumer.status = "FAIL";
    report.finishedAt = new Date().toISOString();
    report.results = {
      checks: report.checks.length,
      passed: report.checks.filter((check) => check.passed).length,
      failed: report.checks.filter((check) => !check.passed).length,
      assets: report.assets?.count ?? 0,
      consumers: report.consumers.length,
    };
    if (report.outputDirectory) {
      const path = join(options.out, "image-assets-report.json");
      await writeFile(path, JSON.stringify(report, null, 2) + "\n");
      console.log(
        JSON.stringify(
          {
            status: report.status,
            releaseUnderTest: report.releaseUnderTest,
            kitVersion: report.kitVersion,
            results: report.results,
            scope: report.scope,
            report: path,
          },
          null,
          2,
        ),
      );
    } else console.log(JSON.stringify(report, null, 2));
  }
  return report;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const options = args(process.argv.slice(2));
  if (options.help) console.log(help);
  else if (options.planConsumers)
    console.log(
      JSON.stringify(
        {
          kind: "IMAGE_CONSUMER_PLAN_ONLY",
          consumerExecutionStarted: false,
          items: ITEMS,
          consumers: ["cli-add", "registry"],
          steps: [
            "After source freeze, capture catalog/manifest/assets/helper/registry hashes.",
            "Create two new independent /tmp roots; install packages with real pnpm and frozen replay.",
            "Install four templates with native CLI add and official shadcn HTTP add.",
            "Compare all 32 installed SVG hashes; official consumer has no WebP siblings.",
            "Serve only installed public assets and transpiled actual download helper.",
            "Chromium decodes 32 SVGs per consumer; recovered WebP bytes and pixels match.",
            "Perform three actual helper downloads per consumer: avatar, product, art.",
            "Read back captured source inputs and live registry hashes; preserve reports/logs.",
          ],
          notExecuted: [
            "image generation",
            "application typecheck/lint/build",
            "full release suite",
            "Figma",
            "ZIP validation",
          ],
          command:
            "node scripts/verify-image-assets.mjs --run-consumers --base-url http://127.0.0.1:3012 --consumer-root /tmp/aureform-image-consumers-1.2.1-FRESH --store-dir /tmp/.pnpm-store",
        },
        null,
        2,
      ),
    );
  else {
    const report = await run(options);
    if (report.status !== "PASS") process.exitCode = 1;
  }
}
