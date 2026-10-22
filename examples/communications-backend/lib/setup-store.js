// SPDX-License-Identifier: Apache-2.0
import { constants } from "node:fs";
import { mkdir, open, rename, lstat, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { fail } from "./config.js";

const AAD = Buffer.from("aureform.setup.v1:single-owner-reference");
const NOFOLLOW = constants.O_NOFOLLOW ?? 0;
const empty = () => ({ version: 1, connections: {}, plans: {}, journals: {}, active: {} });

/**
 * Single-owner encrypted laboratory state. The key is supplied by the host,
 * never stored in this file. This is not a distributed vault or HA database.
 */
export class EncryptedSetupStore {
  constructor({ file, key }) {
    if (typeof file !== "string" || !file || typeof key !== "string") fail("setup-storage-not-configured", 503);
    this.file = resolve(file);
    this.key = Buffer.from(key, "base64");
    if (this.key.length !== 32 || this.key.toString("base64") !== key) fail("invalid-setup-storage-key", 503);
    this.tail = Promise.resolve();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    const folder = dirname(this.file);
    await mkdir(folder, { recursive: true, mode: 0o700 });
    const dir = await lstat(folder);
    if (!dir.isDirectory() || dir.isSymbolicLink() || (dir.mode & 0o077) !== 0 ||
      (typeof process.getuid === "function" && dir.uid !== process.getuid())) fail("insecure-setup-storage", 503);
    try {
      await this.read();
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await this.write(empty(), true);
    }
    this.initialized = true;
  }

  async read() {
    const handle = await open(this.file, constants.O_RDONLY | NOFOLLOW);
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || (stat.mode & 0o077) !== 0 || stat.size > 4 * 1024 * 1024 ||
        (typeof process.getuid === "function" && stat.uid !== process.getuid())) fail("insecure-setup-storage", 503);
      const raw = await handle.readFile("utf8");
      let envelope, value;
      try {
        envelope = JSON.parse(raw);
        if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") throw new Error();
        const iv = Buffer.from(envelope.iv, "base64");
        const tag = Buffer.from(envelope.tag, "base64");
        if (iv.length !== 12 || tag.length !== 16) throw new Error();
        const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
        decipher.setAAD(AAD);
        decipher.setAuthTag(tag);
        value = JSON.parse(Buffer.concat([
          decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final(),
        ]).toString("utf8"));
        if (value.version !== 1 || !value.connections || !value.plans || !value.journals || !value.active) throw new Error();
      } catch { fail("setup-storage-unreadable", 503); }
      return value;
    } finally { await handle.close(); }
  }

  async write(value, initial = false) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(AAD);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
    const text = JSON.stringify({ version: 1, algorithm: "aes-256-gcm", iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") }) + "\n";
    const temporary = this.file + ".pending-" + randomUUID();
    let handle;
    try {
      handle = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NOFOLLOW, 0o600);
      await handle.writeFile(text);
      await handle.sync();
      await handle.close();
      handle = undefined;
      if (initial) {
        // Do not overwrite another initializer's durable state.
        const destination = await open(this.file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NOFOLLOW, 0o600);
        try { await destination.writeFile(text); await destination.sync(); } finally { await destination.close(); }
        await unlink(temporary);
      } else {
        const stat = await lstat(this.file);
        if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) fail("insecure-setup-storage", 503);
        await rename(temporary, this.file);
      }
      const directory = await open(dirname(this.file), constants.O_RDONLY);
      try { await directory.sync(); } finally { await directory.close(); }
    } finally {
      await handle?.close();
      await unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw error; });
    }
  }

  transaction(fn) {
    const task = this.tail.then(async () => {
      await this.initialize();
      const state = await this.read();
      const result = await fn(state);
      await this.write(state);
      return result;
    });
    this.tail = task.catch(() => {});
    return task;
  }
}
