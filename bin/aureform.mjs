#!/usr/bin/env node
import {
  readFile,
  writeFile,
  mkdir,
  stat,
  lstat,
  realpath,
  mkdtemp,
  open,
  link,
  rename,
  rm,
  rmdir,
  unlink,
} from "node:fs/promises";
import { resolve, dirname, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  kitRoot,
  entries,
  dependencyClosure,
  resolveLocal,
} from "../scripts/lib/source-graph.mjs";

export const help = `Aureform UI — local source installer

  node bin/aureform.mjs list
  node bin/aureform.mjs init <directory> [--no-install]
  node bin/aureform.mjs add <item...> --cwd <Next.js project> [--overwrite] [--dry-run | --diff]

init creates a Next.js 16 / React 19 / Tailwind 4 application with six palettes,
appearance providers, MotionSystem and all six reusable effects.
add copies source dependencies and assets, merges npm dependencies and applies
the Aureform semantic theme. Run your package manager after add.
Existing source files are protected unless --overwrite is explicitly supplied.
--dry-run previews paths, dependencies and conflicts without writing files.
--diff also shows text changes and always implies --dry-run. Neither installs packages.
Successful add records source and installed hashes in .aureform/manifest.json.
No files are downloaded from a public registry. No secrets are requested.`;
function parse(args) {
  const positional = [],
    options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cwd") {
      if (!args[i + 1] || args[i + 1].startsWith("--"))
        throw new Error("--cwd requires a path.");
      options.cwd = args[++i];
    } else if (
      ["--overwrite", "--no-install", "--help", "--dry-run", "--diff"].includes(
        args[i],
      )
    )
      options[args[i].slice(2)] = true;
    else if (args[i].startsWith("-"))
      throw new Error(`Unknown option ${args[i]}`);
    else positional.push(args[i]);
  }
  return { positional, options };
}
function jsonc(text) {
  try {
    return JSON.parse(text);
  } catch {}
  let output = "",
    quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      output += char;
      if (char === "\\") {
        output += text[++index] ?? "";
        continue;
      }
      if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') {
      quoted = true;
      output += char;
      continue;
    }
    if (text.slice(index, index + 2) === "//") {
      while (index < text.length && text[index] !== "\n") index++;
      output += "\n";
      continue;
    }
    if (text.slice(index, index + 2) === "/*") {
      const end = text.indexOf("*/", index + 2);
      if (end < 0) throw new Error("Unclosed tsconfig comment.");
      index = end + 1;
      continue;
    }
    if (char === ",") {
      let next = index + 1;
      while (next < text.length && /\s/.test(text[next])) next++;
      if (text[next] === "}" || text[next] === "]") continue;
    }
    output += char;
  }
  return JSON.parse(output);
}
async function exists(file) {
  return !!(await lstat(file).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  }));
}
async function safeTarget(project, path) {
  if (path !== project && !path.startsWith(project + sep))
    throw new Error(`Destination escapes project: ${path}`);
  let ancestor = dirname(path);
  while (!(await exists(ancestor))) ancestor = dirname(ancestor);
  if (!(await stat(ancestor)).isDirectory())
    throw new Error(`Destination parent is not a directory: ${ancestor}`);
  const actual = await realpath(ancestor),
    actualProject = await realpath(project);
  if (actual !== actualProject && !actual.startsWith(actualProject + sep))
    throw new Error(
      `Destination follows a symlink outside the project: ${path}`,
    );
  if (await exists(path)) {
    const real = await realpath(path).catch((error) => {
      if (error.code === "ENOENT")
        throw new Error(`Destination contains a broken symlink: ${path}`);
      throw error;
    });
    if (real !== actualProject && !real.startsWith(actualProject + sep))
      throw new Error(`Destination file points outside the project: ${path}`);
  }
}
async function preflight(project, files, overwrite) {
  for (const [file, content] of files) {
    await safeTarget(project, file);
    if (!overwrite && (await exists(file))) {
      const current = await readFile(file);
      if (
        !current.equals(
          Buffer.isBuffer(content) ? content : Buffer.from(content),
        )
      )
        throw new Error(
          `Existing file protected: ${relative(project, file)}. Review it before using --overwrite.`,
        );
    }
  }
}
async function commitFiles(files) {
  for (const [file, content] of files) {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  }
}
const receiptPath = ".aureform/manifest.json";
const sha256 = (content) => createHash("sha256").update(content).digest("hex");
const portable = (path) => path.replaceAll(sep, "/");
const projectPath = (project, file) => portable(relative(project, file));

async function snapshot(project, file) {
  await safeTarget(project, file);
  const info = await lstat(file).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!info) return { before: null, mode: 0o644 };
  if (!info.isFile() && !info.isSymbolicLink())
    throw new Error(`Destination is not a file: ${projectPath(project, file)}`);
  return {
    before: await readFile(file),
    mode: (await stat(file)).mode & 0o777,
    physicalPath: await realpath(file),
  };
}

async function receipts(project) {
  const file = resolve(project, receiptPath);
  const state = await snapshot(project, file);
  if (!state.before)
    return { state, manifest: { schemaVersion: 1, items: {} } };
  let manifest;
  try {
    manifest = JSON.parse(state.before.toString("utf8"));
    if (
      manifest.schemaVersion !== 1 ||
      !manifest.items ||
      Array.isArray(manifest.items) ||
      typeof manifest.items !== "object"
    )
      throw new Error("Unsupported receipt format.");
    for (const [name, item] of Object.entries(manifest.items)) {
      if (
        !/^[a-z][a-z0-9-]*$/.test(name) ||
        item.name !== name ||
        typeof item.origin !== "string" ||
        typeof item.kitVersion !== "string" ||
        !Array.isArray(item.files)
      )
        throw new Error(`Invalid item ${name}.`);
      for (const entry of item.files) {
        if (
          typeof entry.sourcePath !== "string" ||
          typeof entry.targetPath !== "string" ||
          !/^[a-f0-9]{64}$/.test(entry.sourceHash) ||
          !/^[a-f0-9]{64}$/.test(entry.targetHash)
        )
          throw new Error(`Invalid file in ${name}.`);
      }
    }
  } catch (error) {
    throw new Error(`Invalid ${receiptPath}: ${error.message}`);
  }
  return { state, manifest };
}

function fileStatus(before, previous) {
  if (!before) return "new";
  if (!previous.length) return "unknown";
  return previous.some((file) => file.targetHash === sha256(before))
    ? "unmodified"
    : "customized";
}

// Stage every changed file before touching the consumer. Recheck the complete
// snapshot, publish new files exclusively, and restore originals on failure.
async function commitPlan(project, records) {
  const changed = records.filter(
    ({ before, content }) => !before?.equals(content),
  );
  if (!changed.length) return;
  const lockPath = resolve(project, ".aureform-install.lock");
  const lock = await open(lockPath, "wx", 0o600).catch((error) => {
    if (error.code === "EEXIST")
      throw new Error(
        "Another Aureform install is in progress in this project.",
      );
    throw error;
  });
  let staging;
  const applied = [];
  const directories = [];
  async function unchanged(record) {
    const current = await snapshot(project, record.file);
    if (
      (record.before === null
        ? current.before !== null
        : !current.before?.equals(record.before)) ||
      current.physicalPath !== record.physicalPath
    )
      throw new Error(
        `Destination changed during preflight: ${record.path}. Retry after reviewing it.`,
      );
  }
  try {
    staging = await mkdtemp(resolve(project, ".aureform-install-"));
    for (const [index, record] of changed.entries()) {
      record.staged = resolve(staging, `${index}.new`);
      await writeFile(record.staged, record.content, {
        flag: "wx",
        mode: record.mode,
      });
    }
    for (const record of records) await unchanged(record);
    for (const [index, record] of changed.entries()) {
      await unchanged(record);
      const missing = [];
      let directory = dirname(record.file);
      while (!(await exists(directory))) {
        missing.push(directory);
        directory = dirname(directory);
      }
      await mkdir(dirname(record.file), { recursive: true });
      directories.push(...missing.reverse());
      await safeTarget(project, record.file);
      const target = record.physicalPath ?? record.file;
      const operation = { record, target, backup: null, published: false };
      applied.push(operation);
      if (record.before) {
        operation.backup = resolve(staging, `${index}.old`);
        await rename(target, operation.backup);
        if (!(await readFile(operation.backup)).equals(record.before))
          throw new Error(`Destination changed during commit: ${record.path}`);
      }
      await link(record.staged, target);
      operation.published = true;
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const operation of applied.reverse()) {
      try {
        if (operation.published) {
          if (
            !(await readFile(operation.target)).equals(operation.record.content)
          )
            throw new Error(
              `Concurrent edit preserved at ${operation.record.path}; original retained in ${staging}.`,
            );
          await unlink(operation.target);
        }
        if (operation.backup) await link(operation.backup, operation.target);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError.message);
      }
    }
    for (const directory of [...new Set(directories)].reverse())
      await rmdir(directory).catch(() => {});
    if (rollbackErrors.length) {
      // Keep backups if an external writer prevents a safe restore.
      staging = null;
      throw new Error(`${error.message} Rollback: ${rollbackErrors.join(" ")}`);
    }
    throw error;
  } finally {
    if (staging) await rm(staging, { recursive: true, force: true });
    await lock.close();
    await unlink(lockPath);
  }
}

function textDiff(path, before, after) {
  if (before?.equals(after)) return "";
  if (before?.includes(0) || after.includes(0))
    return `Binary file ${path}: ${before ? sha256(before) : "absent"} -> ${sha256(after)}\n`;
  const lines = (buffer) => {
    if (!buffer?.length) return [];
    const result = buffer.toString("utf8").split("\n");
    if (result.at(-1) === "") result.pop();
    return result;
  };
  const oldLines = lines(before);
  const newLines = lines(after);
  let prefix = 0;
  let suffix = 0;
  while (
    prefix < oldLines.length &&
    prefix < newLines.length &&
    oldLines[prefix] === newLines[prefix]
  )
    prefix++;
  while (
    suffix < oldLines.length - prefix &&
    suffix < newLines.length - prefix &&
    oldLines.at(-1 - suffix) === newLines.at(-1 - suffix)
  )
    suffix++;
  const left = oldLines.slice(prefix, oldLines.length - suffix);
  const right = newLines.slice(prefix, newLines.length - suffix);
  const operations = oldLines.slice(0, prefix).map((line) => [" ", line]);
  // Bound memory for large generated CSS. Small changes use LCS so separate
  // changes get compact context hunks; very large replacements remain explicit.
  if ((left.length + 1) * (right.length + 1) <= 1_000_000) {
    const columns = right.length + 1;
    const matrix = new Uint32Array((left.length + 1) * columns);
    for (let i = left.length - 1; i >= 0; i--)
      for (let j = right.length - 1; j >= 0; j--)
        matrix[i * columns + j] =
          left[i] === right[j]
            ? matrix[(i + 1) * columns + j + 1] + 1
            : Math.max(
                matrix[(i + 1) * columns + j],
                matrix[i * columns + j + 1],
              );
    let i = 0;
    let j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) {
        operations.push([" ", left[i++]]);
        j++;
      } else if (
        i < left.length &&
        (j === right.length ||
          matrix[(i + 1) * columns + j] >= matrix[i * columns + j + 1])
      )
        operations.push(["-", left[i++]]);
      else operations.push(["+", right[j++]]);
    }
  } else {
    operations.push(...left.map((line) => ["-", line]));
    operations.push(...right.map((line) => ["+", line]));
  }
  operations.push(
    ...oldLines.slice(oldLines.length - suffix).map((line) => [" ", line]),
  );
  const changes = operations.flatMap(([kind], index) =>
    kind === " " ? [] : [index],
  );
  const ranges = [];
  for (const index of changes) {
    const start = Math.max(0, index - 3);
    const end = Math.min(operations.length, index + 4);
    if (ranges.length && start <= ranges.at(-1)[1]) ranges.at(-1)[1] = end;
    else ranges.push([start, end]);
  }
  const output = [`--- ${before ? `a/${path}` : "/dev/null"}`, `+++ b/${path}`];
  for (const [start, end] of ranges) {
    const preceding = operations.slice(0, start);
    const hunk = operations.slice(start, end);
    const oldCount = hunk.filter(([kind]) => kind !== "+").length;
    const newCount = hunk.filter(([kind]) => kind !== "-").length;
    const oldStart =
      preceding.filter(([kind]) => kind !== "+").length + (oldCount ? 1 : 0);
    const newStart =
      preceding.filter(([kind]) => kind !== "-").length + (newCount ? 1 : 0);
    output.push(
      `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`,
      ...hunk.map(([kind, line]) => kind + line),
    );
  }
  if (before?.length && !before.toString("utf8").endsWith("\n"))
    output.push("\\ No newline at end of original file");
  if (after.length && !after.toString("utf8").endsWith("\n"))
    output.push("\\ No newline at end of proposed file");
  return output.join("\n") + "\n";
}
async function configuration(project) {
  const config = JSON.parse(
    await readFile(resolve(project, "components.json"), "utf8").catch(() => {
      throw new Error(
        "components.json is required. Use init, or configure shadcn aliases first.",
      );
    }),
  );
  const tsconfig = jsonc(
    await readFile(resolve(project, "tsconfig.json"), "utf8"),
  );
  const paths = tsconfig.compilerOptions?.paths ?? {};
  const rootAlias = Object.entries(paths).find(
    ([key, values]) =>
      key.endsWith("/*") && Array.isArray(values) && values[0].endsWith("/*"),
  );
  if (!rootAlias)
    throw new Error(
      "A root wildcard alias such as @/* -> ./src/* is required in tsconfig.json.",
    );
  const prefix = rootAlias[0].slice(0, -1),
    sourceRoot = resolve(project, rootAlias[1][0].slice(0, -2));
  function aliasPath(value) {
    for (const [key, values] of Object.entries(paths)) {
      const stem = key.replace(/\*$/, "");
      if (value.startsWith(stem)) {
        const replacement = values[0].replace(/\*$/, "");
        return resolve(project, replacement, value.slice(stem.length));
      }
    }
    throw new Error(`Cannot resolve configured alias ${value}.`);
  }
  const targets = {
    "src/components/ui/": aliasPath(config.aliases.ui) + sep,
    "src/components/": aliasPath(config.aliases.components) + sep,
    "src/lib/": aliasPath(config.aliases.lib ?? prefix + "lib") + sep,
    "src/hooks/": aliasPath(config.aliases.hooks ?? prefix + "hooks") + sep,
    "src/": sourceRoot + sep,
    "public/": resolve(project, "public") + sep,
  };
  function target(file) {
    for (const [stem, path] of Object.entries(targets))
      if (file.startsWith(stem)) return resolve(path, file.slice(stem.length));
    return resolve(project, file);
  }
  function importPath(file) {
    const full = target(file);
    for (const [stem, alias] of [
      ["src/components/ui/", config.aliases.ui],
      ["src/components/", config.aliases.components],
      ["src/lib/", config.aliases.lib ?? prefix + "lib"],
      ["src/hooks/", config.aliases.hooks ?? prefix + "hooks"],
      ["src/", prefix.slice(0, -1)],
    ])
      if (file.startsWith(stem))
        return (
          alias + "/" + file.slice(stem.length).replace(/\.(tsx?|m?js)$/, "")
        );
    return (
      prefix +
      relative(sourceRoot, full)
        .replaceAll(sep, "/")
        .replace(/\.(tsx?|m?js)$/, "")
    );
  }
  return { config, sourceRoot, target, importPath };
}
// Keep the bootstrap CLI dependency-free. Tokens retain literal offsets, so
// imports can be changed without touching equal strings in examples or comments.
function importTokens(source, jsx) {
  const tokens = [];
  let at = 0;
  const push = (type, value, start, end = at) =>
    tokens.push({ type, value, start, end });
  const regexPrefixes = new Set([
    "(",
    "[",
    "{",
    "=",
    ":",
    ",",
    ";",
    "!",
    "?",
    "&&",
    "||",
    "??",
    "=>",
    "+",
    "-",
    "*",
    "%",
    "&",
    "|",
    "^",
    "~",
    "return",
    "throw",
    "case",
    "delete",
    "void",
    "typeof",
    "yield",
    "await",
    "in",
    "of",
    "default",
    "else",
    "do",
  ]);
  const controlWords = new Set([
    "if",
    "while",
    "for",
    "with",
    "switch",
    "catch",
  ]);
  const expressionHeads = new Set([
    "=",
    "(",
    "[",
    ",",
    ":",
    "?",
    "return",
    "yield",
    "=>",
    "&&",
    "||",
    "??",
  ]);
  const parens = [];
  const classes = [];
  let afterControl = false;
  let closedParen;
  const expressionStart = () =>
    !tokens.length || afterControl || regexPrefixes.has(tokens.at(-1).value);
  function expressionDeclaration(index) {
    if (tokens[index - 1]?.value === "async") index--;
    return expressionHeads.has(tokens[index - 1]?.value);
  }

  function string(emit = true) {
    const start = at,
      quote = source[at++];
    let value = "";
    while (at < source.length) {
      const char = source[at++];
      if (char === quote) break;
      if (char !== "\\") {
        value += char;
        continue;
      }
      const escaped = source[at++];
      const escapes = {
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
        v: "\v",
        0: "\0",
      };
      if (escaped === "\n") continue;
      if (escaped === "\r") {
        if (source[at] === "\n") at++;
        continue;
      }
      const unicode =
        escaped === "u"
          ? source.slice(at).match(/^(?:\{([a-f\d]+)\}|([a-f\d]{4}))/i)
          : escaped === "x"
            ? source.slice(at).match(/^([a-f\d]{2})/i)
            : null;
      if (unicode) {
        value += String.fromCodePoint(parseInt(unicode[1] ?? unicode[2], 16));
        at += unicode[0].length;
      } else value += escapes[escaped] ?? escaped;
    }
    if (emit) push("string", value, start);
  }

  function template() {
    const start = at++;
    let interpolated = false;
    while (at < source.length) {
      if (source[at] === "\\") {
        at += 2;
      } else if (source[at] === "`") {
        at++;
        if (!interpolated) {
          // A no-substitution template is a static dynamic-import argument.
          // Decode it using the same string reader after locating its boundary.
          const end = at;
          at = start;
          string();
          tokens.at(-1).type = "template";
          at = end;
        } else push("other", "template-end", start);
        return;
      } else if (source.slice(at, at + 2) === "${") {
        if (!interpolated) push("other", "template-start", start, at);
        interpolated = true;
        at += 2;
        code(true);
      } else at++;
    }
  }

  function regexp() {
    const start = at++;
    let characterClass = false;
    while (at < source.length) {
      const char = source[at++];
      if (char === "\\") at++;
      else if (char === "[") characterClass = true;
      else if (char === "]") characterClass = false;
      else if (char === "/" && !characterClass) {
        while (/[a-z]/i.test(source[at] ?? "")) at++;
        break;
      }
    }
    push("other", "regexp", start);
  }

  function element() {
    const start = at++;
    while (at < source.length) {
      if (source[at] === '"' || source[at] === "'") string(false);
      else if (source[at] === "{") {
        at++;
        code(true);
      } else if (source[at] === ">") {
        const selfClosing = source[at - 1] === "/";
        at++;
        if (selfClosing) return push("other", "jsx", start);
        break;
      } else at++;
    }
    while (at < source.length) {
      if (source.slice(at, at + 2) === "</") {
        at = source.indexOf(">", at) + 1 || source.length;
        break;
      }
      if (source[at] === "<" && /[a-z>]/i.test(source[at + 1] ?? "")) element();
      else if (source[at] === "{") {
        at++;
        code(true);
      } else at++;
    }
    push("other", "jsx", start);
  }

  function code(stopOnBrace = false) {
    const braces = [];
    // Template substitutions and JSX braces start a new expression even if
    // the preceding emitted token ended an unrelated expression.
    if (stopOnBrace) {
      push("punctuation", "(", at - 1, at);
      afterControl = false;
    }
    while (at < source.length) {
      const start = at,
        char = source[at];
      if (/\s/.test(char)) {
        at++;
        continue;
      }
      if (source.slice(at, at + 2) === "//") {
        const end = source.indexOf("\n", at);
        at = end < 0 ? source.length : end;
        continue;
      }
      if (source.slice(at, at + 2) === "/*") {
        const end = source.indexOf("*/", at + 2);
        at = end < 0 ? source.length : end + 2;
        continue;
      }
      if (char === "}" && stopOnBrace && braces.length === 0) {
        at++;
        push("punctuation", ")", start);
        afterControl = false;
        return;
      }
      if (char === '"' || char === "'") {
        string();
        afterControl = false;
        continue;
      }
      if (char === "`") {
        template();
        afterControl = false;
        continue;
      }
      if (char === "/" && expressionStart()) {
        regexp();
        afterControl = false;
        continue;
      }
      if (
        jsx &&
        char === "<" &&
        expressionStart() &&
        (/^<[a-z_$][\w$.-]*(?:\s|\/?>)/i.test(source.slice(at)) ||
          source[at + 1] === ">") &&
        !/^<[a-z_$][\w$]*\s+extends\b/i.test(source.slice(at))
      ) {
        element();
        afterControl = false;
        continue;
      }
      if (/[a-z_$]/i.test(char)) {
        at++;
        while (/[\w$]/.test(source[at] ?? "")) at++;
        const word = source.slice(start, at);
        if (
          word === "class" &&
          ![".", "?."].includes(tokens.at(-1)?.value) &&
          source.slice(at).match(/^\s*(?:[a-z_$]|[{<])/i)
        )
          classes.push({
            depth: parens.length,
            expression: expressionDeclaration(tokens.length),
          });
        push("word", word, start);
        afterControl = false;
        continue;
      }
      const previous = tokens.at(-1);
      const pair = source.slice(at, at + 2);
      const value = ["?.", "=>", "&&", "||", "??", "++", "--"].includes(pair)
        ? pair
        : char;
      at += value.length;
      if (value === "(") {
        const context = {
          control:
            controlWords.has(previous?.value) &&
            ![".", "?."].includes(tokens.at(-2)?.value),
        };
        for (
          let i = tokens.length - 1;
          i >= Math.max(0, tokens.length - 3);
          i--
        ) {
          if (
            tokens[i].value === "function" &&
            ![".", "?."].includes(tokens[i - 1]?.value)
          ) {
            context.functionExpression = expressionDeclaration(i);
            break;
          }
          if (tokens[i].type !== "word" && tokens[i].value !== "*") break;
        }
        parens.push(context);
      }
      afterControl = false;
      if (value === ")") {
        closedParen = parens.pop();
        afterControl = Boolean(closedParen?.control);
      }
      if (value === "{") {
        const classHead = classes.at(-1);
        const expressionBody =
          previous?.value === "=>" ||
          (previous?.value === ")" && closedParen?.functionExpression === true);
        if (classHead?.depth === parens.length) {
          classes.pop();
          braces.push(classHead.expression ? "expression" : "block");
        } else
          braces.push(
            expressionBody
              ? "expression"
              : expressionHeads.has(previous?.value)
                ? "object"
                : "block",
          );
      }
      if (value === "}") afterControl = braces.pop() === "block";
      push("punctuation", value, start);
    }
  }
  code();
  return tokens;
}

function moduleLiterals(source, file) {
  const tokens = importTokens(source, /\.[jt]sx$/.test(file));
  const literals = new Map();
  const literal = (token, template = false) =>
    token?.type === "string" || (template && token?.type === "template");
  const remember = (token) => literals.set(token.start, token);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (
      token.type !== "word" ||
      !["import", "export", "require"].includes(token.value) ||
      [".", "?."].includes(tokens[i - 1]?.value)
    )
      continue;
    const next = tokens[i + 1];
    if (token.value !== "export" && next?.value === "(") {
      const argument = tokens[i + 2],
        end = tokens[i + 3]?.value;
      if (
        literal(argument, true) &&
        (end === ")" || (token.value === "import" && end === ","))
      )
        remember(argument);
      continue;
    }
    if (token.value === "require" || next?.value === ".") continue;
    if (token.value === "import" && literal(next)) {
      remember(next);
      continue;
    }
    let cursor = i + 1;
    if (
      tokens[cursor]?.value === "type" &&
      tokens[cursor + 1]?.value !== "from"
    )
      cursor++;
    if (token.value === "export" && !["{", "*"].includes(tokens[cursor]?.value))
      continue;
    if (
      token.value === "import" &&
      tokens[cursor]?.type !== "word" &&
      !["{", "*"].includes(tokens[cursor]?.value)
    )
      continue;
    let braces = 0;
    for (; cursor < tokens.length; cursor++) {
      const current = tokens[cursor];
      if (current.value === "{") braces++;
      if (current.value === "}") {
        if (!braces) break;
        braces--;
      }
      if (!braces && [";", "=", "(", ")"].includes(current.value)) break;
      if (!braces && current.value === "from" && literal(tokens[cursor + 1])) {
        remember(tokens[cursor + 1]);
        break;
      }
    }
  }
  return [...literals.values()];
}

export async function rewriteImports(text, file, config) {
  const edits = [];
  for (const literal of moduleLiterals(text, file)) {
    const imported = await resolveLocal(literal.value, file);
    if (!imported) continue;
    if (literal.value.startsWith(".") && config.target) {
      const sourceRelation = relative(
        dirname(resolve(kitRoot, file)),
        resolve(kitRoot, imported),
      );
      const targetRelation = relative(
        dirname(config.target(file)),
        config.target(imported),
      );
      // A relative import already names the correct copied dependency when
      // both files keep their relationship. Preserve bootstrap bytes so init
      // followed by add does not require overwriting untouched source files.
      if (sourceRelation === targetRelation) continue;
    }
    const quote = text[literal.start];
    let replacement = config
      .importPath(imported)
      .replaceAll("\\", "\\\\")
      .replaceAll(quote, `\\${quote}`);
    if (quote === "`") replacement = replacement.replaceAll("${", "\\${");
    edits.push({ start: literal.start + 1, end: literal.end - 1, replacement });
  }
  for (const edit of edits.sort((a, b) => b.start - a.start))
    text = text.slice(0, edit.start) + edit.replacement + text.slice(edit.end);
  return text;
}
async function sharedCss() {
  const css = await readFile(resolve(kitRoot, "src/app/globals.css"), "utf8"),
    tokens = await readFile(resolve(kitRoot, "src/styles/tokens.css"), "utf8"),
    effects = await readFile(
      resolve(kitRoot, "src/styles/effects.css"),
      "utf8",
    );
  return {
    content: css
      .replace('@import "tailwindcss";\n', "")
      .replace('@import "../styles/tokens.css";', tokens)
      .replace('@import "../styles/effects.css";', effects)
      .replace(
        "var(--font-manrope)",
        'var(--font-manrope, "Manrope", system-ui)',
      )
      .replaceAll(
        "var(--font-instrument)",
        'var(--font-instrument, "Instrument Serif", Georgia)',
      ),
    sources: [
      ["src/app/globals.css", css],
      ["src/styles/tokens.css", tokens],
      ["src/styles/effects.css", effects],
    ].map(([sourcePath, source]) => ({
      sourcePath,
      sourceHash: sha256(source),
    })),
  };
}
export async function addItems(
  names,
  project,
  { overwrite = false, dryRun = false, diff = false } = {},
) {
  if (!names.length)
    throw new Error("Choose at least one item. Use list to view names.");
  if (names.some((name) => !/^[a-z][a-z0-9-]*$/.test(name)))
    throw new Error(
      "Item names may contain only lowercase letters, digits and hyphens.",
    );
  const inventory = await entries(),
    unknown = names.filter((name) => !inventory[name]);
  if (unknown.length)
    throw new Error(`Unknown items: ${unknown.join(", ")}. Use list.`);
  project = resolve(project);
  const config = await configuration(project);
  const itemGraphs = await Promise.all(
    [...new Set(names)].map(async (name) => ({
      name,
      graph: await dependencyClosure([inventory[name].file]),
    })),
  );
  const graph = {
    files: [...new Set(itemGraphs.flatMap(({ graph }) => graph.files))].sort(),
    assets: [
      ...new Set(itemGraphs.flatMap(({ graph }) => graph.assets)),
    ].sort(),
    dependencies: Object.assign(
      {},
      ...itemGraphs.map(({ graph }) => graph.dependencies),
    ),
    devDependencies: Object.assign(
      {},
      ...itemGraphs.map(({ graph }) => graph.devDependencies),
    ),
  };
  const files = new Map();
  function planFile(file, content, kind, sourcePath, sourceContent = content) {
    const record = {
      file,
      path: projectPath(project, file),
      content: Buffer.isBuffer(content) ? content : Buffer.from(content),
      kind,
      sourcePath,
      sourceHash: sha256(sourceContent),
    };
    if (files.has(file) && !files.get(file).content.equals(record.content))
      throw new Error(
        `Configured aliases map different sources to ${record.path}.`,
      );
    files.set(file, record);
  }
  for (const file of graph.files) {
    const source = await readFile(resolve(kitRoot, file), "utf8");
    planFile(
      config.target(file),
      await rewriteImports(source, file, config),
      "source",
      file,
      source,
    );
  }
  for (const asset of graph.assets)
    planFile(
      config.target(asset),
      await readFile(resolve(kitRoot, asset)),
      "asset",
      asset,
    );
  const globalCss = resolve(project, config.config.tailwind.css),
    themeCss = resolve(dirname(globalCss), "aureform.css");
  const cssState = await snapshot(project, globalCss);
  if (!cssState.before)
    throw new Error(`Missing CSS file ${config.config.tailwind.css}`);
  const currentCss = cssState.before.toString("utf8");
  const sharedTheme = await sharedCss();
  planFile(themeCss, sharedTheme.content, "theme", "src/app/globals.css");
  files.get(themeCss).sourceHash = sharedTheme.sources[0].sourceHash;
  const manifestPath = resolve(project, "package.json");
  const manifestState = await snapshot(project, manifestPath);
  if (!manifestState.before) throw new Error("package.json is required.");
  const manifest = JSON.parse(manifestState.before.toString("utf8"));
  const kitManifest = JSON.parse(
    await readFile(resolve(kitRoot, "package.json"), "utf8"),
  );
  const receipt = await receipts(project);
  const priorFiles = Object.values(receipt.manifest.items)
    .filter((item) => item.origin === kitManifest.name)
    .flatMap((item) => item.files);
  const conflicts = [];
  const dependencyChanges = [];
  const updateDependencies = (group, required) => {
    manifest[group] ??= {};
    for (const [name, version] of Object.entries(required)) {
      const otherGroup =
        group === "dependencies" ? "devDependencies" : "dependencies";
      const current = manifest[group][name] ?? manifest[otherGroup]?.[name];
      const change = {
        name,
        group,
        required: version,
        current: current ?? null,
        currentGroup: manifest[group][name]
          ? group
          : current
            ? otherGroup
            : null,
        action: current ? "keep" : "add",
      };
      if (current) {
        const major = (value) => value.match(/\d+/)?.[0];
        if (major(current) !== major(version)) {
          change.action = "conflict";
          conflicts.push(
            `Review dependency ${name}: destination uses ${current}, kit requires ${version}.`,
          );
        }
      } else manifest[group][name] = version;
      dependencyChanges.push(change);
    }
  };
  updateDependencies("dependencies", graph.dependencies);
  updateDependencies("devDependencies", graph.devDependencies);
  // Preserve package.json bytes when no dependency changes are needed.
  planFile(
    manifestPath,
    dependencyChanges.some((change) => change.action === "add")
      ? JSON.stringify(manifest, null, 2) + "\n"
      : manifestState.before,
    "integration",
    null,
  );
  if (!currentCss.includes('@import "./aureform.css"'))
    planFile(
      globalCss,
      `@import "./aureform.css";\n${currentCss}`,
      "integration",
      null,
    );
  else planFile(globalCss, cssState.before, "integration", null);

  const physicalTargets = new Map();
  for (const record of files.values()) {
    Object.assign(
      record,
      record.file === manifestPath
        ? manifestState
        : record.file === globalCss
          ? cssState
          : await snapshot(project, record.file),
    );
    const physicalPath = record.physicalPath ?? record.file;
    if (physicalTargets.has(physicalPath))
      throw new Error(
        `Multiple destinations resolve to the same file: ${record.path} and ${physicalTargets.get(physicalPath)}.`,
      );
    physicalTargets.set(physicalPath, record.path);
    record.status =
      record.kind === "integration"
        ? "consumer"
        : fileStatus(
            record.before,
            priorFiles.filter((file) => file.targetPath === record.path),
          );
    record.action = !record.before
      ? "create"
      : record.before.equals(record.content)
        ? "unchanged"
        : record.kind === "integration"
          ? "merge"
          : "update";
    record.conflict = record.action === "update" && !overwrite;
    if (record.conflict)
      conflicts.push(
        `Existing file protected: ${record.path} (${record.status}). Review it before using --overwrite.`,
      );
  }
  const themeRecord = files.get(themeCss);
  for (const { name, graph: itemGraph } of itemGraphs) {
    const itemFiles = [
      ...itemGraph.files.map((file) => files.get(config.target(file))),
      ...itemGraph.assets.map((file) => files.get(config.target(file))),
      themeRecord,
    ];
    receipt.manifest.items[name] = {
      origin: kitManifest.name,
      name,
      kitVersion: kitManifest.version,
      files: itemFiles.flatMap((record) =>
        (record.kind === "theme"
          ? sharedTheme.sources
          : [{ sourcePath: record.sourcePath, sourceHash: record.sourceHash }]
        ).map((source) => ({
          ...source,
          targetPath: record.path,
          targetHash: sha256(record.content),
          kind: record.kind,
        })),
      ),
      dependencies: itemGraph.dependencies,
      devDependencies: itemGraph.devDependencies,
    };
  }
  planFile(
    resolve(project, receiptPath),
    JSON.stringify(receipt.manifest, null, 2) + "\n",
    "receipt",
    null,
  );
  const receiptRecord = files.get(resolve(project, receiptPath));
  Object.assign(receiptRecord, receipt.state, {
    status: receipt.state.before ? "recorded" : "new",
    action: !receipt.state.before
      ? "create"
      : receipt.state.before.equals(receiptRecord.content)
        ? "unchanged"
        : "record",
    conflict: false,
  });
  if (physicalTargets.has(receiptRecord.physicalPath ?? receiptRecord.file))
    throw new Error(`${receiptPath} overlaps a consumer destination.`);
  const result = {
    items: names,
    sourceFiles: graph.files.length,
    assets: graph.assets.length,
    dependencies: Object.keys(graph.dependencies),
    destination: project,
  };
  if (dryRun || diff)
    return {
      ...result,
      preview: true,
      overwrite,
      kitVersion: kitManifest.version,
      status: conflicts.length ? "blocked" : "ready",
      conflicts,
      dependencyChanges,
      files: [...files.values()].map((record) => ({
        path: record.path,
        sourcePath: record.sourcePath,
        kind: record.kind,
        status: record.status,
        action: record.action,
        conflict: record.conflict,
        currentHash: record.before ? sha256(record.before) : null,
        proposedHash: sha256(record.content),
      })),
      ...(diff
        ? {
            diff: [...files.values()]
              .map((record) =>
                textDiff(record.path, record.before, record.content),
              )
              .filter(Boolean)
              .join("\n"),
          }
        : {}),
    };
  if (conflicts.length) throw new Error(conflicts.join("\n"));
  await commitPlan(project, [...files.values()]);
  return result;
}
const starterPage = `"use client";
import {useState} from "react";
import {Providers,useTheme} from "@/components/providers";
import {PalettePicker} from "@/components/appearance-controls";
import {useAppearance} from "@/components/appearance-provider";
import {MotionSystem} from "@/components/motion-system";
import {GradientBackground} from "@/components/effects/gradient-background";
import {ShaderBackground} from "@/components/effects/shader-background";
import {SpotlightCard} from "@/components/effects/spotlight-card";
import {GlowBorder} from "@/components/effects/glow-border";
import {TiltCard} from "@/components/effects/tilt-card";
import {MagneticButton} from "@/components/effects/magnetic-button";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {Select} from "@/components/ui/select";
import {MetricCard} from "@/components/blocks/metric-card";
import {RevenuePanel} from "@/components/blocks/revenue-panel";
import {useLanguage} from "@/hooks/use-language";
function Workspace({onLanguage}:{onLanguage:()=>void}){
  const{l,locale}=useLanguage(),{theme,setTheme}=useTheme();
  const{appearance,setAppearance,resetAppearance}=useAppearance();
  const colors=Object.values(appearance.colors);
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-16 flex flex-wrap items-center justify-between gap-4">
        <Brand/>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onLanguage}>{locale==="en"?"Español":"English"}</Button>
          <Button variant="outline" size="sm" onClick={()=>setTheme(theme==="light"?"dark":"light")}>{l("Switch theme","Cambiar tema")}</Button>
        </div>
      </header>
      <p className="text-xs text-muted-foreground">Aureform UI</p>
      <h1 data-motion="intro" className="editorial mt-4 text-5xl">{l("A good place to begin.","Un buen lugar para empezar.")}</h1>
      <p className="mt-5 text-sm text-muted-foreground">{l("Your source. Your next ambitious product.","Tu código. Tu próximo producto.")}</p>
      <section aria-label={l("Appearance","Apariencia")} className="my-8 grid gap-6 sm:grid-cols-2">
        <PalettePicker compact/>
        <Select label={l("Motion","Movimiento")} value={appearance.motion}
          onValueChange={(motion)=>setAppearance((current)=>({...current,motion:motion as typeof current.motion}))}
          options={[{value:"off",label:l("Off","Desactivado")},{value:"gentle",label:l("Gentle","Suave")},{value:"expressive",label:l("Expressive","Expresivo")}]}/>
      </section>
      <div data-motion="reveal" className="my-8 grid gap-4 sm:grid-cols-3">
        <MetricCard label={l("Monthly revenue","Ingresos mensuales")} value="$48,295" change="+12.8%" trend="up"/>
        <MetricCard label={l("Customers","Clientes")} value="2,420"/>
        <MetricCard label={l("Growth","Crecimiento")} value="8.2%"/>
      </div>
      <RevenuePanel title={l("A little perspective","Un poco de perspectiva")} description={l("Illustrative local data.","Datos locales ilustrativos.")} label={l("Demo revenue","Ingresos de ejemplo")} valueLabel={l("Revenue","Ingresos")} data={[{label:"May",value:24000},{label:"Jun",value:31000},{label:"Jul",value:28500},{label:"Aug",value:36000},{label:"Sep",value:41200},{label:"Oct",value:48295}]}/>
      <section aria-label={l("Visual effects","Efectos visuales")} className="mt-8 grid gap-4 sm:grid-cols-2">
        <GradientBackground kind={appearance.gradient.kind} colors={appearance.gradient.stops.map((stop)=>stop.color)} angle={appearance.gradient.angle} intensity={appearance.gradient.intensity} className="p-6">
          <h2 className="text-xl font-semibold">{l("A color field, in your palette.","Un campo de color con tu paleta.")}</h2>
        </GradientBackground>
        <ShaderBackground {...appearance.shader} colors={colors} paused={appearance.shader.paused || appearance.motion==="off"} className="p-6">
          <h2 className="text-xl font-semibold">{l("An original shader atmosphere.","Una atmósfera con shaders originales.")}</h2>
        </ShaderBackground>
        <SpotlightCard><p>{l("A subtle light follows your pointer.","Una luz sutil sigue tu puntero.")}</p></SpotlightCard>
        <GlowBorder colors={colors}><p>{l("A border with a little energy.","Un borde con un poco de energía.")}</p></GlowBorder>
        <TiltCard><p>{l("Quiet depth for a featured surface.","Profundidad suave para una superficie destacada.")}</p></TiltCard>
        <div className="flex items-center justify-center rounded-xl border border-border p-6">
          <MagneticButton onClick={resetAppearance}>{l("Reset appearance","Restablecer apariencia")}</MagneticButton>
        </div>
      </section>
      <p className="mt-8 text-xs text-muted-foreground">{l("Edit src/app/page.tsx and add components with the local Aureform CLI.","Edita src/app/page.tsx y añade componentes con la CLI local de Aureform.")}</p>
    </main>
  );
}
export default function Home(){const[locale,setLocale]=useState<"en"|"es">("en");return <Providers locale={locale}><MotionSystem><Workspace onLanguage={()=>setLocale(locale==="en"?"es":"en")}/></MotionSystem></Providers>;}
`;
export async function initProject(project, { install = true } = {}) {
  project = resolve(project);
  if (project === kitRoot || kitRoot.startsWith(project + sep))
    throw new Error("Choose a new directory outside the source kit.");
  await mkdir(project, { recursive: true });
  const graph = await dependencyClosure([
    "src/components/document-layout.tsx",
    "src/components/providers.tsx",
    "src/components/appearance-controls.tsx",
    "src/components/motion-system.tsx",
    "src/components/effects/index.ts",
    "src/components/brand.tsx",
    "src/components/ui/button.tsx",
    "src/components/blocks/metric-card.tsx",
    "src/components/blocks/revenue-panel.tsx",
    "src/hooks/use-language.ts",
    "scripts/generate-tokens.mjs",
  ]);
  const files = new Map(),
    kitManifest = JSON.parse(
      await readFile(resolve(kitRoot, "package.json"), "utf8"),
    );
  const baseline = [
    "next.config.ts",
    "tsconfig.json",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "components.json",
    "src/app/globals.css",
    "src/styles/tokens.css",
    "src/styles/effects.css",
    "tokens/aureform.tokens.json",
    "scripts/generate-tokens.mjs",
    "scripts/preview.mjs",
    "scripts/lib/source-graph.mjs",
    "public/favicon.svg",
    "LICENSE",
    "LICENSE.md",
    "NOTICE",
    "THIRD_PARTY_NOTICES.md",
  ];
  for (const directory of ["src/assets/fonts", "licenses/third-party"]) {
    const { readdir } = await import("node:fs/promises");
    for (const file of await readdir(resolve(kitRoot, directory)))
      baseline.push(`${directory}/${file}`);
  }
  for (const file of new Set([...graph.files, ...graph.assets, ...baseline]))
    files.set(resolve(project, file), await readFile(resolve(kitRoot, file)));
  files.set(
    resolve(project, "src/app/layout.tsx"),
    `import type {Metadata} from "next";
import {DocumentLayout} from "@/components/document-layout";
export {viewport} from "@/components/document-layout";
export const metadata: Metadata = {
  title: "Aureform — your next product",
  description: "A refined starting point for your Next.js product.",
  icons: {icon: "/favicon.svg"}
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <DocumentLayout locale="en">{children}</DocumentLayout>;
}
`,
  );
  const manifest = {
    name: "aureform-product",
    version: "0.1.0",
    private: true,
    type: "module",
    license: "Apache-2.0",
    packageManager: kitManifest.packageManager,
    scripts: {
      dev: "next dev --hostname 0.0.0.0",
      build: "pnpm tokens && next build",
      start: "node scripts/preview.mjs",
      tokens: kitManifest.scripts.tokens,
      typecheck: "tsc --noEmit",
      lint: "eslint .",
    },
    dependencies: {
      ...graph.dependencies,
      next: kitManifest.dependencies.next,
      react: kitManifest.dependencies.react,
      "react-dom": kitManifest.dependencies["react-dom"],
    },
    devDependencies: Object.fromEntries(
      [
        "@tailwindcss/postcss",
        "@types/node",
        "@types/react",
        "@types/react-dom",
        "eslint",
        "eslint-config-next",
        "tailwindcss",
        "typescript",
      ].map((name) => [name, kitManifest.devDependencies[name]]),
    ),
  };
  files.set(
    resolve(project, "package.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  files.set(resolve(project, "src/app/page.tsx"), starterPage);
  files.set(
    resolve(project, ".gitignore"),
    "node_modules/\n.next/\nout/\n*.tsbuildinfo\n.env*\n",
  );
  files.set(
    resolve(project, "README.md"),
    `# Aureform ${kitManifest.version} starter\n\nNode 22.16+ and pnpm 10.\n\n\`\`\`sh\npnpm install\npnpm dev\npnpm build\npnpm start\n\`\`\`\n\nThe overview includes Aurora, Violet, Ocean, Mint, Ember and Rose palettes, Light/Dark controls, AppearanceProvider, MotionSystem, GradientBackground, ShaderBackground, SpotlightCard, GlowBorder, TiltCard and MagneticButton. The provider stores appearance in this browser; the page's records are illustrative local data.\n\nEdit src/app/page.tsx. Use useAppearance() beneath Providers to change settings, or AppearanceScope for an isolated configured example. The source appearance library includes createAppearance(), serializeAppearance() and appearanceToCSS(). The token generator and its appearance-tokens helper are included; pnpm tokens refreshes CSS from the same pure configuration. pnpm build exports to out/ and pnpm start serves it.\n\nThe full suite's /en/studio/, /en/themes/ and /en/effects/ screens live in the complete open-source kit at https://github.com/terrizoaguimor/aureform-ui. This starter's home exposes its own palette and motion controls. Add further source using the CLI from your extracted kit, then install merged dependencies in this project.\n\nOriginal Aureform code and assets are licensed under Apache 2.0, including this starter and the full suite. Keep LICENSE and NOTICE when distributing the work; see LICENSE.md for scope and THIRD_PARTY_NOTICES.md for independent upstream licenses. Authentication, billing and model providers require your own integration.\n`,
  );
  await preflight(project, files, false);
  await commitFiles(files);
  if (install)
    execFileSync(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      ["install"],
      { cwd: project, stdio: "inherit" },
    );
  return { destination: project, sourceFiles: files.size, installed: install };
}
export async function main(args = process.argv.slice(2)) {
  const { positional, options } = parse(args),
    [command, ...names] = positional;
  if (options.help || !command) {
    console.log(help);
    return;
  }
  if (command !== "add" && (options["dry-run"] || options.diff))
    throw new Error("--dry-run and --diff are supported only by add.");
  if (command === "list") {
    const inventory = await entries();
    console.log(
      Object.values(inventory)
        .map(
          (item) =>
            `${item.name.padEnd(24)} ${item.type === "registry:ui" ? "component" : "block / template"}`,
        )
        .join("\n"),
    );
    return;
  }
  if (command === "init") {
    if (names.length !== 1)
      throw new Error("init requires exactly one destination directory.");
    const result = await initProject(
      resolve(options.cwd ?? process.cwd(), names[0]),
      { install: !options["no-install"] },
    );
    console.log(
      `Created ${result.sourceFiles} files in ${result.destination}. ${result.installed ? "Run pnpm dev." : "Run pnpm install, then pnpm dev."}`,
    );
    return;
  }
  if (command === "add") {
    const result = await addItems(names, options.cwd ?? process.cwd(), {
      overwrite: options.overwrite,
      dryRun: options["dry-run"],
      diff: options.diff,
    });
    if (result.preview) {
      const lines = [
        `Preview ${result.items.join(", ")} (${result.kitVersion}) in ${result.destination}`,
        `Status: ${result.status}. No files written; no packages installed.`,
        "",
        "Files:",
        ...result.files.map(
          (file) =>
            `  ${file.conflict ? "CONFLICT" : file.action.toUpperCase()} [${file.status}] ${file.path}${file.sourcePath ? ` <- ${file.sourcePath}` : ""}`,
        ),
        "",
        "Dependencies:",
        ...result.dependencyChanges.map(
          (dependency) =>
            `  ${dependency.action.toUpperCase()} ${dependency.name}: ${dependency.current ?? "absent"} -> ${dependency.required} (${dependency.group}${dependency.currentGroup && dependency.currentGroup !== dependency.group ? `; currently ${dependency.currentGroup}` : ""})`,
        ),
      ];
      if (result.conflicts.length)
        lines.push(
          "",
          "Conflicts:",
          ...result.conflicts.map((message) => `  ${message}`),
        );
      if (options.diff) lines.push("", result.diff || "No file changes.");
      console.log(lines.join("\n"));
      if (result.status === "blocked") process.exitCode = 1;
      return;
    }
    console.log(
      `Added ${result.items.join(", ")}: ${result.sourceFiles} source files and ${result.assets} assets. Run your package manager to install the merged dependencies.`,
    );
    return;
  }
  throw new Error(`Unknown command ${command}. Use --help.`);
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)
)
  main().catch((error) => {
    console.error(`Aureform: ${error.message}`);
    process.exitCode = 1;
  });
