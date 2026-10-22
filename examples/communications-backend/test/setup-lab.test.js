// SPDX-License-Identifier: Apache-2.0
// Real local initializer, private temporary directories and synthetic secrets.
// Never starts the backend, a listener, a tunnel or a provider connection.
import test from "node:test";
import assert from "node:assert/strict";
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { syncBuiltinESMExports } from "node:module";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import dgram from "node:dgram";
import { initializeLab } from "../setup-lab.mjs";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const files = [".env", "access-code.txt", "lab-config.json"];
const hash = (value) => createHash("sha256").update(value).digest("hex");

async function temporary(t) {
  const directory = await mkdtemp(join(tmpdir(), "aureform-setup-lab-test-"));
  await chmod(directory, 0o700);
  assert.ok(!directory.startsWith(repository + "/"), "fixtures must remain outside the checkout");
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function artifacts(directory) {
  const values = await Promise.all([
    readFile(join(directory, ".env"), "utf8"),
    readFile(join(directory, "access-code.txt"), "utf8"),
    readFile(join(directory, "lab-config.json"), "utf8"),
  ]);
  return { env: parseEnv(values[0]), code: values[1].trim(), config: JSON.parse(values[2]) };
}

async function fileHashes(directory) {
  return Object.fromEntries(await Promise.all(files.map(async (name) => [
    name, hash(await readFile(join(directory, name))),
  ])));
}

async function absent(path) {
  try { await lstat(path); return false; } catch (error) {
    if (error.code === "ENOENT") return true;
    throw error;
  }
}

const rejected = (operation, expected) => assert.rejects(operation, (error) =>
  error instanceof Error && (expected === undefined || error.message === expected));

test("initializeLab creates private files, random 32-byte secrets and a disabled unconfigured laboratory", async (t) => {
  const directory = await temporary(t);
  const result = await initializeLab(["--directory", directory]);
  const { env, code, config } = await artifacts(directory);
  assert.equal(result.status, "initialized");
  assert.equal(result.privateDirectory, directory);
  assert.equal(result.envFile, join(directory, ".env"));
  assert.equal(result.accessFile, join(directory, "access-code.txt"));
  assert.equal(result.carrierCredentialsStored, false);
  assert.equal(result.carrierOperationsEnabled, false);
  assert.equal(result.publicOrigin, null);
  assert.deepEqual((await readdir(directory)).sort(), files);
  assert.equal((await lstat(directory)).mode & 0o777, 0o700);
  for (const name of files) {
    const info = await lstat(join(directory, name));
    assert.ok(info.isFile() && !info.isSymbolicLink());
    assert.equal(info.mode & 0o777, 0o600);
  }
  const master = Buffer.from(env.SETUP_MASTER_KEY, "base64");
  const decodedCode = Buffer.from(code, "base64url");
  assert.ok(master.length === 32 && master.toString("base64") === env.SETUP_MASTER_KEY, "master key is canonical random 32-byte material");
  assert.ok(master.some((byte) => byte !== 0), "master key must not be a zero-filled fixture");
  assert.ok(decodedCode.length === 32 && decodedCode.toString("base64url") === code, "access code is canonical 32-byte opaque material");
  assert.ok(/^[0-9a-f]{64}$/.test(env.SETUP_ADMIN_AUTH_SHA256), "operator hash is SHA-256");
  assert.ok(env.SETUP_ADMIN_AUTH_SHA256 === hash(code), "operator hash matches the privately stored access code");
  assert.equal(env.HOST, "127.0.0.1");
  assert.equal(env.PORT, "8788");
  assert.equal(env.PUBLIC_BASE_URL, "");
  assert.equal(env.LAB_CONFIG_FILE, join(directory, "lab-config.json"));
  assert.equal(env.SETUP_STATE_FILE, join(directory, "encrypted-setup.json"));
  assert.equal(env.ENABLE_CARRIER_OPERATIONS, "false");
  assert.deepEqual(Object.keys(env).sort(), [
    "ENABLE_CARRIER_OPERATIONS", "HOST", "LAB_CONFIG_FILE", "PORT",
    "PUBLIC_BASE_URL", "SETUP_ADMIN_AUTH_SHA256", "SETUP_MASTER_KEY", "SETUP_STATE_FILE",
  ]);
  assert.deepEqual(config.origins, ["http://localhost:3000", "http://127.0.0.1:3000"]);
  assert.deepEqual(result.frontendOrigins, config.origins);
  assert.deepEqual(config.agents, []);
  assert.deepEqual(config.providers, {});
  assert.deepEqual(config.approvals, []);
  assert.equal(config.schedule.timezone, "America/Bogota");
  assert.equal(await absent(env.SETUP_STATE_FILE), true, "initialization must not instantiate a backend or encrypted runtime state");
  const publicResult = JSON.stringify(result);
  for (const privateValue of [code, env.SETUP_MASTER_KEY, env.SETUP_ADMIN_AUTH_SHA256]) {
    assert.ok(!publicResult.includes(privateValue), "initializer result must contain no private credential material");
  }
  for (const key of Object.keys(result)) assert.ok(!/secret|master|accessCode|token|password/i.test(key), "initializer returns paths and safe metadata only");
});

test("independent initializations never reuse their master key, operator code or operator hash", async (t) => {
  const root = await temporary(t);
  const first = join(root, "first");
  const second = join(root, "second");
  await initializeLab(["--directory", first]);
  await initializeLab(["--directory", second]);
  const a = await artifacts(first);
  const b = await artifacts(second);
  assert.ok(a.code !== b.code, "independent operator codes must differ");
  assert.ok(a.env.SETUP_MASTER_KEY !== b.env.SETUP_MASTER_KEY, "independent master keys must differ");
  assert.ok(a.env.SETUP_ADMIN_AUTH_SHA256 !== b.env.SETUP_ADMIN_AUTH_SHA256, "independent operator hashes must differ");
});

test("generated environment loads in an isolated Node process without any private output or carrier configuration", async (t) => {
  const directory = await temporary(t);
  const result = await initializeLab(["--directory", directory]);
  const script = `
    import { readFileSync } from "node:fs";
    import { dirname, join } from "node:path";
    import { createHash } from "node:crypto";
    const config = JSON.parse(readFileSync(process.env.LAB_CONFIG_FILE, "utf8"));
    const code = readFileSync(join(dirname(process.env.LAB_CONFIG_FILE), "access-code.txt"), "utf8").trim();
    const master = Buffer.from(process.env.SETUP_MASTER_KEY ?? "", "base64");
    const checks = [
      master.length === 32,
      process.env.SETUP_ADMIN_AUTH_SHA256 === createHash("sha256").update(code).digest("hex"),
      process.env.ENABLE_CARRIER_OPERATIONS === "false",
      process.env.HOST === "127.0.0.1",
      process.env.PUBLIC_BASE_URL === "",
      Object.keys(config.providers).length === 0,
      config.agents.length === 0,
      config.approvals.length === 0,
      !Object.keys(process.env).some(key => /^(TWILIO_|TELNYX_)/.test(key)),
    ];
    if (checks.some(value => value !== true)) process.exit(17);
  `;
  const outcome = await new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ["--env-file=" + result.envFile, "--input-type=module", "-e", script], {
      cwd: directory, env: {}, stdio: ["ignore", "pipe", "pipe"], timeout: 5000,
    });
    let stdoutBytes = 0;
    let stderrBytes = 0;
    child.stdout.on("data", (value) => { stdoutBytes += value.length; });
    child.stderr.on("data", (value) => { stderrBytes += value.length; });
    child.on("error", reject);
    child.on("close", (exitCode, signal) => resolvePromise({ exitCode, signal, stdoutBytes, stderrBytes }));
  });
  assert.deepEqual(outcome, { exitCode: 0, signal: null, stdoutBytes: 0, stderrBytes: 0 });
});

test("a second initialization refuses overwrite and leaves every original file byte-identical", async (t) => {
  const directory = await temporary(t);
  await initializeLab(["--directory", directory]);
  const before = await fileHashes(directory);
  await rejected(() => initializeLab(["--directory", directory]), "configuration-already-exists");
  const after = await fileHashes(directory);
  assert.ok(files.every((name) => before[name] === after[name]), "reinitialization must not replace an owner's files");
  assert.deepEqual((await readdir(directory)).sort(), files);
});

for (const name of files) {
  test(`pre-existing ${name} prevents every new initializer file and preserves the existing bytes`, async (t) => {
    const directory = await temporary(t);
    const path = join(directory, name);
    await writeFile(path, randomBytes(64), { mode: 0o600 });
    const before = hash(await readFile(path));
    await rejected(() => initializeLab(["--directory", directory]), "configuration-already-exists");
    assert.ok(hash(await readFile(path)) === before, "existing private file must remain byte-identical");
    assert.deepEqual(await readdir(directory), [name]);
    assert.equal((await lstat(path)).mode & 0o777, 0o600);
  });
}

test("canonical explicit frontend origins are deduplicated and do not enable carrier operations", async (t) => {
  const directory = await temporary(t);
  const origin = "https://frontend.example.invalid";
  const result = await initializeLab([
    "--directory", directory,
    "--public-origin", "https://backend.example.invalid",
    "--frontend-origin", origin,
    "--frontend-origin", "http://127.0.0.1:3000",
    "--frontend-origin", origin,
  ]);
  const { env, config } = await artifacts(directory);
  assert.equal(env.PUBLIC_BASE_URL, "https://backend.example.invalid");
  assert.deepEqual(config.origins, [origin, "http://127.0.0.1:3000"]);
  assert.deepEqual(result.frontendOrigins, config.origins);
  assert.equal(env.ENABLE_CARRIER_OPERATIONS, "false");
});

for (const [label, args] of [
  ["HTTP public origin", ["--public-origin", "http://backend.example.invalid"]],
  ["public origin query", ["--public-origin", "https://backend.example.invalid?token=synthetic"]],
  ["public origin path", ["--public-origin", "https://backend.example.invalid/webhook"]],
  ["public origin fragment", ["--public-origin", "https://backend.example.invalid#fragment"]],
  ["remote HTTP frontend", ["--frontend-origin", "http://frontend.example.invalid"]],
  ["frontend path rather than origin", ["--frontend-origin", "https://frontend.example.invalid/application"]],
  ["frontend query rather than origin", ["--frontend-origin", "https://frontend.example.invalid?application=other"]],
]) {
  test(`${label} is rejected before creating the private directory`, async (t) => {
    const root = await temporary(t);
    const directory = join(root, "never-created");
    await rejected(() => initializeLab(["--directory", directory, ...args]));
    assert.equal(await absent(directory), true);
    assert.deepEqual(await readdir(root), []);
  });
}

for (const mode of [0o755, 0o770, 0o707]) {
  test(`insecure directory permissions ${mode.toString(8)} are rejected without changes or new files`, async (t) => {
    const directory = await temporary(t);
    await chmod(directory, mode);
    await rejected(() => initializeLab(["--directory", directory]), "insecure-private-directory");
    assert.equal((await lstat(directory)).mode & 0o777, mode);
    assert.deepEqual(await readdir(directory), []);
  });
}

test("a symlink private directory is rejected without writing to its target", async (t) => {
  const root = await temporary(t);
  const target = join(root, "target");
  const link = join(root, "private-link");
  await mkdir(target, { mode: 0o700 });
  await symlink(target, link, "dir");
  await rejected(() => initializeLab(["--directory", link]), "insecure-private-directory");
  assert.ok((await lstat(link)).isSymbolicLink());
  assert.deepEqual(await readdir(target), []);
});

test("a dangling pre-existing environment symlink is preserved and prevents partial initialization", async (t) => {
  const directory = await temporary(t);
  const target = join(directory, "never-created-target");
  const path = join(directory, ".env");
  await symlink(target, path);
  await rejected(() => initializeLab(["--directory", directory]), "configuration-already-exists");
  assert.ok((await lstat(path)).isSymbolicLink());
  assert.equal(await absent(target), true);
  assert.deepEqual(await readdir(directory), [".env"]);
});

test("symlink ancestors cannot redirect initialization to another directory", async (t) => {
  const root = await temporary(t);
  const target = join(root, "target");
  const link = join(root, "ancestor-link");
  await mkdir(target, { mode: 0o700 });
  await symlink(target, link, "dir");
  await rejected(() => initializeLab(["--directory", join(link, "private")]));
  assert.deepEqual(await readdir(target), [], "no directory or secret file may be created through a symlink ancestor");
});

test("repository root and nested checkout directories are rejected before private initialization", async () => {
  for (const directory of [repository, join(repository, "examples", "communications-backend")]) {
    await rejected(() => initializeLab(["--directory", directory]), "private-directory-must-be-outside-repository");
  }
});

test("local initialization performs no network requests, provider connections or listening", async (t) => {
  const directory = await temporary(t);
  let attempts = 0;
  const deny = () => { attempts++; throw new Error("network-disabled-for-initializer-test"); };
  const patched = [
    [globalThis, "fetch"], [http, "request"], [http, "get"],
    [https, "request"], [https, "get"], [net, "connect"], [net, "createConnection"],
    [net.Socket.prototype, "connect"], [net.Server.prototype, "listen"],
    [dgram.Socket.prototype, "send"], [dgram.Socket.prototype, "bind"],
  ];
  const originals = patched.map(([object, key]) => object[key]);
  t.after(() => {
    for (const [index, [object, key]] of patched.entries()) object[key] = originals[index];
    syncBuiltinESMExports();
  });
  for (const [object, key] of patched) object[key] = deny;
  syncBuiltinESMExports();
  const result = await initializeLab(["--directory", directory]);
  assert.equal(result.status, "initialized");
  assert.equal(attempts, 0);
  assert.equal(result.carrierCredentialsStored, false);
  assert.equal(result.carrierOperationsEnabled, false);
});
