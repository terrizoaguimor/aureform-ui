#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
import { mkdir, open, lstat, unlink } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaults = join(homedir(), ".config", "aureform-communications");
function options(args) {
  const result = { command: args[0] ?? "help", directory: defaults, origins: [] };
  for (let i = 1; i < args.length; i += 2) {
    const value = args[i + 1];
    if (!value || !["--directory", "--public-origin", "--frontend-origin"].includes(args[i])) throw new Error("invalid-arguments");
    if (args[i] === "--directory") result.directory = resolve(value);
    if (args[i] === "--public-origin") {
      const url = new URL(value);
      if (url.origin !== value || url.protocol !== "https:") throw new Error("invalid-public-origin");
      result.publicOrigin = value;
    }
    if (args[i] === "--frontend-origin") {
      const url = new URL(value);
      if (url.origin !== value || !(url.protocol === "https:" ||
        (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error("invalid-frontend-origin");
      result.origins.push(value);
    }
  }
  if (result.directory === repository || result.directory.startsWith(repository + "/")) throw new Error("private-directory-must-be-outside-repository");
  return result;
}

async function privateDirectory(directory) {
  // Check every existing ancestor before mkdir can follow a symlink into a
  // repository or an unrelated private directory.
  const ancestors = [];
  for (let path = directory; ; path = dirname(path)) {
    ancestors.push(path);
    if (dirname(path) === path) break;
  }
  for (const path of ancestors.reverse()) {
    try {
      const info = await lstat(path);
      if (info.isSymbolicLink() || !info.isDirectory()) throw new Error("insecure-private-directory");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const stat = await lstat(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 ||
    (typeof process.getuid === "function" && stat.uid !== process.getuid())) throw new Error("insecure-private-directory");
}

async function writeNew(path, contents) {
  const handle = await open(path, "wx", 0o600);
  try { await handle.writeFile(contents); await handle.sync(); } finally { await handle.close(); }
}

export async function initializeLab(args) {
  const parsed = options(["init", ...args]);
  await privateDirectory(parsed.directory);
  const accessCode = randomBytes(32).toString("base64url");
  const envFile = join(parsed.directory, ".env");
  const configFile = join(parsed.directory, "lab-config.json");
  const accessFile = join(parsed.directory, "access-code.txt");
  // All-day laboratory policy; paid calls still require a single-call permission.
  const config = {
    tenantId: "aureform-lab",
    origins: parsed.origins.length ? [...new Set(parsed.origins)] : ["http://localhost:3000", "http://127.0.0.1:3000"],
    schedule: { timezone: "America/Bogota", weekly: Array.from({ length: 7 }, (_, day) => ({ day, start: "00:00", end: "24:00" })), holidays: [] },
    agents: [], providers: {}, approvals: [],
    maxWaitSeconds: 120, ringSeconds: 20, carrierTokenSeconds: 300,
    closedMessage: "This test line is currently closed.",
    waitMessage: "Please wait while we connect your test call.",
  };
  const env = [
    "# Aureform single-owner incoming-call laboratory. Keep this directory private.",
    "HOST=127.0.0.1", "PORT=8788",
    "PUBLIC_BASE_URL=" + (parsed.publicOrigin ?? ""),
    "LAB_CONFIG_FILE=" + JSON.stringify(configFile),
    "ENABLE_CARRIER_OPERATIONS=false",
    "SETUP_STATE_FILE=" + JSON.stringify(join(parsed.directory, "encrypted-setup.json")),
    "SETUP_MASTER_KEY=" + randomBytes(32).toString("base64"),
    "SETUP_ADMIN_AUTH_SHA256=" + createHash("sha256").update(accessCode).digest("hex"),
    "",
  ].join("\n");
  // Refuse an existing owner's files before creating any part of a new setup.
  const files = [
    [configFile, JSON.stringify(config, null, 2) + "\n"],
    [accessFile, accessCode + "\n"],
    [envFile, env],
  ];
  for (const [path] of files) {
    try {
      await lstat(path);
      const error = new Error("configuration-already-exists");
      error.code = "EEXIST";
      throw error;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const created = [];
  try {
    // The environment file is the completion marker and is written last.
    for (const [path, contents] of files) {
      await writeNew(path, contents);
      created.push(path);
    }
  } catch (error) {
    for (const path of created) await unlink(path).catch(() => {});
    throw error;
  }
  return { status: "initialized", privateDirectory: parsed.directory, envFile, accessFile,
    publicOrigin: parsed.publicOrigin ?? null, frontendOrigins: config.origins,
    carrierCredentialsStored: false, carrierOperationsEnabled: false,
    note: "Provider credentials are entered through the authenticated setup UI; no resources or calls were created." };
}

export async function serveLab(args) {
  const parsed = options(["serve", ...args]);
  await privateDirectory(parsed.directory);
  const envFile = join(parsed.directory, ".env");
  const info = await lstat(envFile);
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0) throw new Error("insecure-laboratory-environment");
  process.loadEnvFile(envFile);
  const { createBackend } = await import("./server.js");
  const backend = createBackend();
  await backend.ready;
  if (backend.initializationFailed) throw new Error("private-configuration-error");
  const host = process.env.HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? 8788);
  if (host !== "127.0.0.1" || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("invalid-laboratory-listener");
  await new Promise((resolvePromise) => backend.server.listen(port, host, resolvePromise));
  console.log(JSON.stringify({ status: "laboratory-running", localBackend: `http://${host}:${port}`,
    automaticSetup: Boolean(backend.setup), publicOrigin: process.env.PUBLIC_BASE_URL || null,
    accessCodeFile: join(parsed.directory, "access-code.txt"), carrierOperationsEnabled: backend.engine.config.operationsEnabled }));
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await backend.close(); };
  process.on("SIGTERM", () => { void stop(); });
  process.on("SIGINT", () => { void stop(); });
  return backend;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [command, ...args] = process.argv.slice(2);
    if (command === "init") console.log(JSON.stringify(await initializeLab(args), null, 2));
    else if (command === "serve") await serveLab(args);
    else console.log("Usage: node setup-lab.mjs init|serve [--directory PRIVATE_DIRECTORY] [--public-origin HTTPS_ORIGIN] [--frontend-origin APP_ORIGIN]");
  } catch (error) {
    // Never print a filesystem/env/provider payload that could contain secrets.
    console.error("Laboratory setup refused:", ["EEXIST", "ENOENT"].includes(error.code) ? error.code :
      /^(?:invalid|insecure|private-directory)-/.test(error.message ?? "") ? error.message : "private-configuration-error");
    process.exitCode = 1;
  }
}
