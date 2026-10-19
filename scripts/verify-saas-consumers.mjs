#!/usr/bin/env node
import {
  access,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const DEFAULT_KIT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE = JSON.parse(
  await readFile(join(DEFAULT_KIT, "package.json"), "utf8"),
).version;
const CORE_MODES = ["cli-add", "registry", "cli-init"];
const ZIP_MODES = ["source", "starter", "free"];
const ITEMS = [
  ["onboarding-flow", "src/components/blocks/onboarding-flow.tsx"],
  ["member-management", "src/components/blocks/member-management.tsx"],
  ["data-workbench", "src/components/blocks/data-workbench.tsx"],
  ["import-wizard", "src/components/blocks/import-wizard.tsx"],
  ["customer-detail", "src/components/templates/customer-detail.tsx"],
  ["record-detail", "src/components/blocks/record-detail.tsx"],
  ["workspace-provider", "src/components/workspace-provider.tsx"],
];
const SHA256 = /^[a-f0-9]{64}$/;
const EXCLUDED = new Set([
  "node_modules",
  ".next",
  "out",
  ".git",
  "artifacts",
  "test-results",
  "playwright-report",
]);
const HOST_DEV_DEPENDENCIES = [
  "@tailwindcss/postcss",
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "eslint",
  "eslint-config-next",
  "tailwindcss",
  "typescript",
];

export const help = `Independent Aureform ${RELEASE} consumer verification

  node scripts/verify-saas-consumers.mjs --plan
  node scripts/verify-saas-consumers.mjs --run --base-url http://127.0.0.1:3012 --out /tmp/aureform-consumers-1.2-RUN
  node scripts/verify-saas-consumers.mjs --run --modes cli-add,registry --base-url http://127.0.0.1:3012 --out /tmp/aureform-consumers-1.2-HTTP
  node scripts/verify-saas-consumers.mjs --run --modes source,starter,free --checksums /absolute/checksums.json --checksums-sha256 <64-hex> --out /tmp/aureform-consumers-1.2-ZIP

Options:
  --kit <directory>         Read-only source kit; defaults to this repository.
  --modes <comma-list>      cli-add,registry,cli-init,source,starter,free.
  --base-url <HTTP origin>  Required by registry. No credentials or query string.
  --out <fresh directory>  Required by --run; must be outside the kit, in /tmp.
  --store-dir <directory>  Optional existing pnpm store; never node_modules.
  --offline                Require cache-only pnpm installs; failure stays a failure.
  --pnpm <executable>       Defaults to pnpm on PATH.
  --timeout-ms <number>    Per-command timeout, default 900000.
  --checksums <file>       Newly packed ZIP checksum manifest.
  --checksums-sha256 <hex> Owner-provided hash of that exact manifest.
  --plan                   Read-only plan. No HTTP, installs, files or subprocesses.
  --self-test              Pure runner contract checks; no consumer certification.

Every real run uses fresh consumer directories and real pnpm installations.
The official shadcn CLI is installed in its consumer, not borrowed from the kit.
ZIPs are pending unless explicitly selected with a pinned manifest.
No product source repairs, shared node_modules, browser or Figma execution.
`;

export const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const posix = (path) => path.split(sep).join("/");
const within = (root, path) => {
  const name = relative(root, path);
  return (
    name === "" ||
    (!isAbsolute(name) && name !== ".." && !name.startsWith(`..${sep}`))
  );
};
const exists = async (path) => {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};
async function write(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}
const writeJSON = (path, value) =>
  write(path, JSON.stringify(value, null, 2) + "\n");

export function safeRelativePath(path) {
  assert.equal(typeof path, "string", "Expected a relative file path.");
  assert(
    path.length > 0 &&
      !path.includes("\\") &&
      !path.includes("\0") &&
      !path.startsWith("/") &&
      !/^[a-z]:/i.test(path) &&
      path.split("/").every((part) => part && part !== "." && part !== ".."),
    `Unsafe path: ${path}`,
  );
  return path;
}

export function parseArgs(args) {
  const options = {
    kit: DEFAULT_KIT,
    pnpm: "pnpm",
    timeoutMs: 900_000,
    offline: false,
  };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (
      ["--run", "--plan", "--self-test", "--offline", "--help"].includes(flag)
    ) {
      options[flag.slice(2).replace("self-test", "selfTest")] = true;
      continue;
    }
    const names = {
      "--kit": "kit",
      "--modes": "modes",
      "--base-url": "baseURL",
      "--out": "out",
      "--store-dir": "storeDir",
      "--pnpm": "pnpm",
      "--timeout-ms": "timeoutMs",
      "--checksums": "checksums",
      "--checksums-sha256": "checksumsSHA256",
    };
    assert(names[flag], `Unknown option ${flag}. Use --help.`);
    assert(
      args[i + 1] && !args[i + 1].startsWith("--"),
      `${flag} requires a value.`,
    );
    options[names[flag]] = args[++i];
  }
  if (options.help || !args.length) return { ...options, help: true };
  assert(
    [options.run, options.plan, options.selfTest].filter(Boolean).length === 1,
    "Choose exactly one of --run, --plan or --self-test.",
  );
  options.kit = resolve(options.kit);
  options.timeoutMs = Number(options.timeoutMs);
  assert(
    Number.isSafeInteger(options.timeoutMs) &&
      options.timeoutMs >= 1000 &&
      options.timeoutMs <= 3_600_000,
    "--timeout-ms must be an integer between 1000 and 3600000.",
  );
  options.modes = options.modes
    ? options.modes.split(",")
    : [...CORE_MODES, ...(options.checksums ? ZIP_MODES : [])];
  assert(
    options.modes.length &&
      new Set(options.modes).size === options.modes.length &&
      options.modes.every((mode) =>
        [...CORE_MODES, ...ZIP_MODES].includes(mode),
      ),
    "Invalid or duplicate consumer mode.",
  );
  if (options.baseURL) {
    const url = new URL(options.baseURL);
    assert(
      ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname === "/",
      "--base-url must be an HTTP origin without credentials, path or query.",
    );
    options.baseURL = url.origin;
  }
  if (options.run) {
    assert(options.out, "--run requires a fresh --out directory.");
    options.out = resolve(options.out);
    assert(
      !within(options.kit, options.out),
      "Output must be outside the source kit.",
    );
    assert(
      within(resolve(tmpdir()), options.out) &&
        options.out !== resolve(tmpdir()),
      "Consumer output must be a fresh directory under the system temporary directory.",
    );
    if (options.modes.includes("registry")) {
      assert(options.baseURL, "Registry execution requires --base-url.");
    }
  }
  if (options.storeDir) options.storeDir = resolve(options.storeDir);
  if (options.checksums) options.checksums = resolve(options.checksums);
  assert(
    Boolean(options.checksums) === Boolean(options.checksumsSHA256),
    "Both --checksums and --checksums-sha256 are required together.",
  );
  if (options.checksumsSHA256) {
    assert(SHA256.test(options.checksumsSHA256), "Invalid manifest SHA-256.");
  }
  if (options.run && options.modes.some((mode) => ZIP_MODES.includes(mode))) {
    assert(
      options.checksums,
      "ZIP execution requires the owner's pinned checksum manifest.",
    );
  }
  return options;
}

export async function snapshotTree(
  root,
  { metadata = true, exclude = new Set() } = {},
) {
  const inventory = [];
  async function visit(path, name) {
    const info = await lstat(path, { bigint: true });
    const record = {
      path: name,
      type: info.isSymbolicLink()
        ? "symlink"
        : info.isDirectory()
          ? "directory"
          : "file",
    };
    if (metadata) {
      Object.assign(record, {
        mode: Number(info.mode),
        inode: info.ino.toString(),
        device: info.dev.toString(),
        mtimeNs: info.mtimeNs.toString(),
      });
    }
    if (info.isSymbolicLink()) record.target = await readlink(path);
    else if (info.isDirectory()) {
      for (const entry of (await readdir(path)).sort()) {
        if (!exclude.has(entry))
          await visit(join(path, entry), name ? `${name}/${entry}` : entry);
      }
    } else {
      assert(info.isFile(), `Unsupported consumer tree entry: ${path}`);
      const bytes = await readFile(path);
      record.bytes = bytes.length;
      record.sha256 = hash(bytes);
    }
    inventory.push(record);
  }
  await visit(root, "");
  return inventory.sort((a, b) => a.path.localeCompare(b.path));
}

function fileFingerprint(inventory) {
  // The installer briefly creates a lock in the root. File bytes, metadata,
  // directory membership and the absence of residue must remain idempotent.
  return inventory.map((entry) =>
    entry.type === "directory" ? { path: entry.path, type: entry.type } : entry,
  );
}

async function captureSource(kit, modes) {
  const files = [];
  const consumesCLI = modes.some((mode) =>
    ["cli-add", "cli-init", "source", "starter"].includes(mode),
  );
  for (const directory of [
    "src",
    "tokens",
    ...(consumesCLI ? ["bin", "scripts/lib"] : []),
  ]) {
    if (!(await exists(join(kit, directory)))) continue;
    const tree = await snapshotTree(join(kit, directory), {
      metadata: false,
      exclude: EXCLUDED,
    });
    for (const entry of tree.filter((entry) => entry.type === "file")) {
      files.push({
        path: `${directory}/${entry.path}`,
        bytes: entry.bytes,
        sha256: entry.sha256,
      });
    }
  }
  for (const path of [
    "package.json",
    "pnpm-lock.yaml",
    "components.json",
    "tsconfig.json",
    "next.config.ts",
    "next.config.mjs",
    "postcss.config.mjs",
    "eslint.config.mjs",
    "registry.json",
    "public/r/index.json",
    "public/r/registry.json",
    "scripts/verify-saas-consumers.mjs",
    ...(consumesCLI
      ? [
          "scripts/generate-tokens.mjs",
          "scripts/generate-registry.mjs",
          "scripts/preview.mjs",
        ]
      : []),
  ]) {
    if (!(await exists(join(kit, path)))) continue;
    const bytes = await readFile(join(kit, path));
    files.push({ path, bytes: bytes.length, sha256: hash(bytes) });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { files, sha256: hash(JSON.stringify(files)) };
}

export function assertArchiveSourceMatchesKit(inventory, sourceFiles) {
  const original = new Map(inventory.map((file) => [file.path, file.sha256]));
  assert.equal(original.size, inventory.length, "Duplicate source ZIP paths.");
  for (const file of sourceFiles)
    assert.equal(
      original.get(file.path),
      file.sha256,
      `Source ZIP differs from the selected kit at ${file.path}`,
    );
  return sourceFiles.length;
}

export function archiveProtectedPaths(inventory) {
  return inventory
    .filter(
      ({ path }) =>
        (path.startsWith("src/") &&
          (!path.startsWith("src/app/") || path.endsWith(".css"))) ||
        path.startsWith("tokens/") ||
        path.startsWith("scripts/") ||
        path.startsWith("bin/"),
    )
    .map(({ path }) => path);
}

export async function plan(options) {
  const manifest = await json(join(options.kit, "package.json"));
  assert.equal(
    manifest.version,
    RELEASE,
    `Expected the ${RELEASE} source kit.`,
  );
  return {
    kind: "PLAN_ONLY",
    consumerExecutionStarted: false,
    kit: options.kit,
    version: manifest.version,
    modes: options.modes,
    items: ITEMS.map(([name, sourcePath]) => ({ name, sourcePath })),
    dependencies: {
      host: Object.fromEntries(
        ["next", "react", "react-dom"].map((name) => [
          name,
          manifest.dependencies[name],
        ]),
      ),
      tools: Object.fromEntries(
        [...HOST_DEV_DEPENDENCIES, "shadcn"].map((name) => [
          name,
          manifest.devDependencies[name],
        ]),
      ),
    },
    packageManager: manifest.packageManager,
    installPolicy: {
      actualInstall: true,
      sharedNodeModules: false,
      storeDir: options.storeDir ?? "pnpm's actual configured default",
      offline: options.offline,
      frozenReplay:
        "Only after an actual successful install creates or accepts the lockfile.",
    },
    ZIPs: options.checksums
      ? "PINNED_INPUTS_REQUESTED_NOT_YET_VERIFIED"
      : "PENDING_OWNER_INPUTS",
    output: options.out ?? null,
    browserExecution: false,
    releaseCertification: false,
  };
}

function installFlags(options, frozen = false) {
  return [
    frozen ? "--frozen-lockfile" : "--no-frozen-lockfile",
    options.offline ? "--offline" : "--prefer-offline",
    "--ignore-scripts",
    ...(options.storeDir ? ["--store-dir", options.storeDir] : []),
  ];
}

function consumerTarget(sourcePath, custom = false) {
  const prefixes = custom
    ? [
        ["src/components/ui/", "design/ui/"],
        ["src/components/", "design/"],
        ["src/lib/", "core/"],
        ["src/hooks/", "hooks/"],
        ["src/", ""],
      ]
    : [];
  for (const [from, to] of prefixes) {
    if (sourcePath.startsWith(from)) return to + sourcePath.slice(from.length);
  }
  return sourcePath;
}

function importFrom(hostPath, targetPath) {
  const path = posix(relative(dirname(hostPath), targetPath)).replace(
    /\.(tsx?|m?js)$/,
    "",
  );
  return JSON.stringify(path.startsWith(".") ? path : `./${path}`);
}

export function saasHostSource(hostPath, target) {
  const source = (path) => importFrom(hostPath, target(path));
  return `"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { OnboardingFlow, type OnboardingFlowValue } from ${source(ITEMS[0][1])};
import { MemberManagement } from ${source(ITEMS[1][1])};
import { DataWorkbench, type DataWorkbenchValue, type DataWorkbenchSavedView } from ${source(ITEMS[2][1])};
import { ImportWizard } from ${source(ITEMS[3][1])};
import { CustomerDetailTemplate, type CustomerDetailNote } from ${source(ITEMS[4][1])};
import { GenericRecordDetail } from ${source(ITEMS[5][1])};
import { WorkspaceProvider, useWorkspace } from ${source(ITEMS[6][1])};
import { messages } from ${source("src/i18n/messages.ts")};
import { customerImportFields, getCustomerImportKey, type CustomerImportRow, type ImportCallback } from ${source("src/lib/csv-import.ts")};
import type { Customer } from ${source("src/demo/dashboard-data.ts")};

type Locale = "en" | "es";
const records: Customer[] = [
  { id: "consumer-a", name: "Consumer Alpha", email: "alpha@example.test", company: "Consumer Co", plan: "Pro", status: "active", amount: 249, joined: "2026-10-01" },
  { id: "consumer-b", name: "Consumer Beta", email: "beta@example.test", company: "Second Co", plan: "Starter", status: "trial", amount: 99, joined: "2026-10-02" },
  { id: "consumer-c", name: "Consumer Gamma", email: "gamma@example.test", company: "Third Co", plan: "Enterprise", status: "paused", amount: 699, joined: "2026-10-03" },
];
const initialValue: DataWorkbenchValue = {
  query: { search: "", filters: [], sorting: [], pagination: { pageIndex: 0, pageSize: 2 } },
  density: "comfortable",
};
const sample: CustomerImportRow = {
  name: "Imported customer", email: "imported@example.test", company: "Import Co",
  plan: "Pro", status: "active", amount: 249, joined: "2026-10-04",
};

// Consumer-owned synthetic records and callbacks. This is not a backend starter.
function Operations({ locale }: { locale: Locale }) {
  const workspace = useWorkspace();
  const l = useCallback((en: string, es: string) => locale === "es" ? es : en, [locale]);
  const [onboarding, setOnboarding] = useState<OnboardingFlowValue>({
    step: 0, organizationName: "Consumer Co", workspaceName: "Consumer team",
    workspaceSlug: "consumer-team", invites: [], completed: false,
  });
  const [value, setValue] = useState<DataWorkbenchValue>(initialValue);
  const [views, setViews] = useState<DataWorkbenchSavedView[]>([]);
  const [customer, setCustomer] = useState<Customer>(records[0]);
  const [notes, setNotes] = useState<CustomerDetailNote[]>([]);
  const [imported, setImported] = useState<CustomerImportRow[]>([]);
  const [tab, setTab] = useState("overview");
  const imports = useRef(0);
  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    { accessorKey: "name", header: l("Customer", "Cliente") },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "company", header: l("Company", "Empresa") },
  ], [l]);
  const matching = useMemo(() => {
    const search = value.query.search.toLowerCase();
    const result = records.filter((row) => [row.name, row.email, row.company].some((cell) => cell.toLowerCase().includes(search)));
    const sorting = value.query.sorting[0];
    if (sorting) result.sort((a, b) => {
      const key = sorting.id as keyof Customer;
      const order = String(a[key]).localeCompare(String(b[key]));
      return sorting.desc ? -order : order;
    });
    return result;
  }, [value.query]);
  const { pageIndex, pageSize } = value.query.pagination;
  const page = matching.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const onImport: ImportCallback<CustomerImportRow> = async (rows, context) => {
    context.signal.throwIfAborted();
    imports.current += 1;
    setImported((previous) => [...previous, ...rows]);
    context.onProgress({ completed: rows.length, total: rows.length });
    return { created: rows.length, updated: 0, skipped: 0, failed: 0 };
  };
  return <main data-consumer-host={locale} className="mx-auto grid max-w-6xl gap-8 p-6">
    <h1>{l("Independent SaaS consumer", "Consumidor SaaS independiente")}</h1>
    <p>{l("Synthetic frontend data. No emails, database or authorization service.", "Datos frontend sintéticos. Sin correos, base de datos ni servicio de autorización.")}</p>
    <nav aria-label={l("Consumer language", "Idioma del consumidor")}>
      <Link href="/consumer/en/">English</Link>{" "}<Link href="/consumer/es/">Español</Link>
    </nav>
    <section data-consumer-block="workspace-provider">
      <h2>WorkspaceProvider</h2>
      <label>{l("Consumer workspace", "Espacio del consumidor")}
        <select value={workspace.workspaceId} onChange={(event) => workspace.setWorkspace(event.target.value)}>
          {workspace.workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <output data-consumer-ready={String(workspace.ready)}>{workspace.workspace.name}</output>
    </section>
    <section data-consumer-block="onboarding-flow">
      <h2>OnboardingFlow</h2>
      <OnboardingFlow locale={locale} value={onboarding} onChange={setOnboarding}
        onComplete={(next) => { workspace.completeOnboarding(next); setOnboarding(next); }}
        onOpenCustomers={() => document.querySelector("#consumer-table")?.scrollIntoView()}
        onOpenImports={() => document.querySelector("#consumer-import")?.scrollIntoView()} />
    </section>
    <section data-consumer-block="member-management">
      <h2>MemberManagement</h2>
      <MemberManagement locale={locale} members={workspace.members} invitations={workspace.invitations}
        currentMemberId={workspace.currentMemberId} canManage={workspace.ready && workspace.can("members.manage")}
        canTransferOwnership={workspace.ready && workspace.can("ownership.transfer")}
        onInvite={workspace.inviteMember} onChangeRole={workspace.changeMemberRole}
        onRemoveMember={workspace.removeMember} onResendInvitation={workspace.resendInvitation}
        onAcceptInvitation={workspace.acceptInvitation} onRevokeInvitation={workspace.revokeInvitation}
        onTransferOwnership={workspace.transferOwnership} />
    </section>
    <section id="consumer-table" data-consumer-block="data-workbench">
      <h2>DataWorkbench</h2>
      <DataWorkbench<Customer> mode="external" rowCount={matching.length} data={page} columns={columns}
        value={value} onValueChange={setValue} savedViews={views}
        onSaveView={(view) => setViews((previous) => [...previous, view])}
        onDeleteView={(id) => setViews((previous) => previous.filter((view) => view.id !== id))}
        onShareView={async (next) => { await navigator.clipboard.writeText(JSON.stringify(next)); }}
        title={l("Consumer customers", "Clientes del consumidor")} />
    </section>
    <section id="consumer-import" data-consumer-block="import-wizard">
      <h2>ImportWizard</h2>
      <ImportWizard<CustomerImportRow> locale={locale} fields={customerImportFields}
        getRowKey={getCustomerImportKey} existingKeys={imported.map(getCustomerImportKey)}
        sampleRows={[sample]} onImport={onImport} resourceHref={\`/consumer/\${locale}/\`}
        title={l("Consumer CSV import", "Importación CSV del consumidor")} />
      <output>{l("Consumer accepted rows", "Filas aceptadas por el consumidor")}: {imported.length}</output>
    </section>
    <section data-consumer-block="customer-detail">
      <h2>CustomerDetailTemplate</h2>
      <CustomerDetailTemplate customer={customer} onSave={(next) => setCustomer(next)} canEdit
        notes={notes} onAddNote={(text) => setNotes((previous) => [...previous, {
          id: crypto.randomUUID(), text, author: "Consumer host", createdAt: new Date().toISOString(),
        }])} activity={[]} attachedFiles={[]} relatedInvoices={[]} backHref={\`/consumer/\${locale}/\`} />
    </section>
    <section data-consumer-block="record-detail">
      <h2>GenericRecordDetail</h2>
      <GenericRecordDetail title={l("Consumer record", "Registro del consumidor")}
        metadata={[{ id: "scope", label: l("Scope", "Alcance"), value: l("Frontend only", "Sólo frontend") }]}
        activeTab={tab} onTabChange={setTab} tabs={[
          { value: "overview", label: l("Overview", "Resumen"), content: <p>{customer.name}</p> },
          { value: "activity", label: l("Activity", "Actividad"), content: <p>{l("Caller-owned activity", "Actividad del consumidor")}</p> },
        ]} />
    </section>
  </main>;
}
export default function ConsumerHost({ locale }: { locale: Locale }) {
  return <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
    <WorkspaceProvider><Operations locale={locale} /></WorkspaceProvider>
  </NextIntlClientProvider>;
}
`;
}

async function createHost(
  project,
  kitManifest,
  { custom = false, official = false } = {},
) {
  const sourceRoot = custom ? "" : "src";
  const prefix = custom ? "~" : "@";
  const manifest = {
    name: `aureform-independent-${custom ? "cli-add" : "registry"}-consumer`,
    version: "0.0.0",
    private: true,
    type: "module",
    packageManager: kitManifest.packageManager,
    scripts: {
      typecheck: "tsc --noEmit",
      lint: "eslint . --max-warnings=0",
      build: "next build",
    },
    dependencies: Object.fromEntries(
      ["next", "react", "react-dom"].map((name) => [
        name,
        kitManifest.dependencies[name],
      ]),
    ),
    devDependencies: Object.fromEntries(
      [...HOST_DEV_DEPENDENCIES, ...(official ? ["shadcn"] : [])].map(
        (name) => [name, kitManifest.devDependencies[name]],
      ),
    ),
  };
  await writeJSON(join(project, "package.json"), manifest);
  await writeJSON(join(project, "tsconfig.json"), {
    compilerOptions: {
      target: "ES2017",
      lib: ["dom", "dom.iterable", "esnext"],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: "esnext",
      moduleResolution: "bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: "react-jsx",
      incremental: true,
      plugins: [{ name: "next" }],
      paths: { [`${prefix}/*`]: [custom ? "./*" : "./src/*"] },
    },
    include: [
      "next-env.d.ts",
      "**/*.ts",
      "**/*.tsx",
      ".next/types/**/*.ts",
      ".next/dev/types/**/*.ts",
    ],
    exclude: ["node_modules", "out", ".next/cache"],
  });
  await writeJSON(join(project, "components.json"), {
    $schema: "https://ui.shadcn.com/schema.json",
    style: "base-nova",
    rsc: true,
    tsx: true,
    tailwind: {
      config: "",
      css: posix(join(sourceRoot, "app/globals.css")),
      baseColor: "neutral",
      cssVariables: true,
      prefix: "",
    },
    iconLibrary: "lucide",
    aliases: {
      components: custom ? "~/design" : "@/components",
      ui: custom ? "~/design/ui" : "@/components/ui",
      lib: custom ? "~/core" : "@/lib",
      hooks: custom ? "~/hooks" : "@/hooks",
      utils: custom ? "~/core/utils" : "@/lib/utils",
    },
  });
  await write(
    join(project, "next.config.mjs"),
    'const nextConfig = { output: "export", trailingSlash: true, images: { unoptimized: true }, poweredByHeader: false };\nexport default nextConfig;\n',
  );
  await write(
    join(project, "postcss.config.mjs"),
    'const config = { plugins: { "@tailwindcss/postcss": {} } };\nexport default config;\n',
  );
  await write(
    join(project, sourceRoot, "app/globals.css"),
    '@import "tailwindcss";\n@custom-variant dark (&:where(.dark, .dark *));\nbody { margin: 0; font-family: system-ui, sans-serif; background: var(--background); color: var(--foreground); }\n',
  );
  await write(
    join(project, sourceRoot, "app/layout.tsx"),
    'import type { ReactNode } from "react";\nimport "./globals.css";\nexport default function Layout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }\n',
  );
  await write(
    join(project, sourceRoot, "app/page.tsx"),
    "export default function Page() { return <main>Independent consumer installation</main>; }\n",
  );
}

async function wireSaasHost(project, { custom = false } = {}) {
  const sourceRoot = custom ? "" : "src";
  const host = join(project, sourceRoot, "consumer-verification/host.tsx");
  const target = (path) => join(project, consumerTarget(path, custom));
  for (const [, path] of ITEMS) await access(target(path), constants.R_OK);
  for (const path of [
    "src/i18n/messages.ts",
    "src/lib/csv-import.ts",
    "src/demo/dashboard-data.ts",
  ]) {
    await access(target(path), constants.R_OK);
  }
  await write(host, saasHostSource(host, target));
  const created = [host];
  for (const locale of ["en", "es"]) {
    const route = join(project, sourceRoot, `app/consumer/${locale}/page.tsx`);
    await write(
      route,
      `import ConsumerHost from ${importFrom(route, host)};\nexport default function Page() { return <ConsumerHost locale="${locale}" />; }\n`,
    );
    created.push(route);
    if (!(await exists(join(project, sourceRoot, "app/layout.tsx")))) {
      const layout = join(dirname(route), "layout.tsx");
      await write(
        layout,
        `import type { ReactNode } from "react";\nimport "../../globals.css";\nexport default function Layout({ children }: { children: ReactNode }) { return <html lang="${locale}"><body>{children}</body></html>; }\n`,
      );
      created.push(layout);
    }
  }
  return {
    boundary:
      "Independent host with synthetic records and typed caller-owned callbacks.",
    nextIntlProvider: true,
    actualWorkspaceProvider: true,
    externalQuery: { rowCount: 3, loadedPageSize: 2, pageIndex: 0 },
    files: await Promise.all(
      created.map(async (path) => ({
        path: posix(relative(project, path)),
        sha256: hash(await readFile(path)),
      })),
    ),
    librarySourceRepairs: false,
    browserInteractionsExecuted: false,
  };
}

class Runner {
  constructor(options, report) {
    this.options = options;
    this.report = report;
    this.path = join(options.out, "consumer-report.json");
    this.environment = {
      ...process.env,
      CI: "1",
      NEXT_TELEMETRY_DISABLED: "1",
      npm_config_ignore_scripts: "true",
      npm_config_offline: options.offline ? "true" : "false",
      npm_config_prefer_offline: options.offline ? "false" : "true",
      npm_config_state_dir: join(options.out, "pnpm-state"),
      ...(options.storeDir ? { npm_config_store_dir: options.storeDir } : {}),
    };
    delete this.environment.NODE_PATH;
  }
  async save() {
    await writeJSON(`${this.path}.tmp`, this.report);
    await rename(`${this.path}.tmp`, this.path);
  }
  check(consumer, name, passed, evidence = {}) {
    consumer.checks.push({ name, passed: Boolean(passed), ...evidence });
    assert(passed, `${consumer.name}: ${name}`);
  }
  async step(
    consumer,
    label,
    command,
    { cwd = consumer.project, exitCode = 0, env = {} } = {},
  ) {
    const sequence = this.report.commands.length.toString().padStart(3, "0");
    const basename = `${sequence}-${consumer.name}-${label}`;
    this.report.pendingStep = basename;
    await this.save();
    const startedAt = new Date().toISOString();
    const start = Date.now(),
      stdout = [],
      stderr = [],
      combined = [];
    let processError,
      timedOut = false;
    const child = spawn(command[0], command.slice(1), {
      cwd,
      env: { ...this.environment, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    const logOnly = /(?:dry-run|diff)$/.test(label);
    child.stdout?.on("data", (bytes) => {
      stdout.push(bytes);
      combined.push(bytes);
      if (!logOnly) process.stdout.write(bytes);
    });
    child.stderr?.on("data", (bytes) => {
      stderr.push(bytes);
      combined.push(bytes);
      if (!logOnly) process.stderr.write(bytes);
    });
    child.once("error", (error) => {
      processError = { code: error.code, message: error.message };
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      const force = setTimeout(() => child.kill("SIGKILL"), 1000);
      force.unref();
    }, this.options.timeoutMs);
    const result = await new Promise((done) =>
      child.once("close", (code, signal) => done({ exitCode: code, signal })),
    );
    clearTimeout(timer);
    const bytes = Buffer.concat(combined);
    const log = join(this.options.out, "logs", `${basename}.log`);
    await write(log, bytes);
    const record = {
      consumer: consumer.name,
      label,
      command,
      cwd,
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      ...result,
      expectedExitCode: exitCode,
      timedOut,
      processError,
      passed: !processError && !timedOut && result.exitCode === exitCode,
      log,
      logSHA256: hash(bytes),
      stdoutSHA256: hash(Buffer.concat(stdout)),
      stderrSHA256: hash(Buffer.concat(stderr)),
    };
    this.report.commands.push(record);
    consumer.commands.push(record);
    await writeJSON(log.replace(/\.log$/, ".json"), record);
    await this.save();
    if (logOnly) console.log(`${consumer.name}: ${label} → ${log}`);
    assert(
      record.passed,
      `${basename}: exit ${result.exitCode}, ${processError?.code ?? result.signal ?? "no signal"}. See ${log}`,
    );
    return {
      record,
      stdout: Buffer.concat(stdout).toString("utf8"),
      stderr: Buffer.concat(stderr).toString("utf8"),
    };
  }
}

async function verifyReceipts(runner, consumer, kit, manifest) {
  const path = join(consumer.project, ".aureform/manifest.json");
  const receipt = await json(path);
  runner.check(consumer, "receipt schema", receipt.schemaVersion === 1);
  const verified = [];
  for (const [name, sourcePath] of ITEMS) {
    const item = receipt.items?.[name];
    runner.check(
      consumer,
      `${name}: receipt identity`,
      item?.origin === manifest.name &&
        item?.name === name &&
        item?.kitVersion === manifest.version,
    );
    runner.check(
      consumer,
      `${name}: primary source recorded`,
      item.files?.some((file) => file.sourcePath === sourcePath),
    );
    for (const file of item.files) {
      safeRelativePath(file.sourcePath);
      safeRelativePath(file.targetPath);
      const source = await readFile(join(kit, file.sourcePath));
      const target = await readFile(join(consumer.project, file.targetPath));
      runner.check(
        consumer,
        `${name}: receipt hashes ${file.targetPath}`,
        SHA256.test(file.sourceHash) &&
          SHA256.test(file.targetHash) &&
          file.sourceHash === hash(source) &&
          file.targetHash === hash(target),
      );
      verified.push({ item: name, ...file, bytes: target.length });
    }
    const installedManifest = await json(
      join(consumer.project, "package.json"),
    );
    for (const [group, dependencies] of [
      ["dependencies", item.dependencies],
      ["devDependencies", item.devDependencies],
    ]) {
      for (const [dependency, required] of Object.entries(dependencies ?? {})) {
        runner.check(
          consumer,
          `${name}: declared ${dependency}`,
          typeof required === "string" &&
            Boolean(
              installedManifest[group]?.[dependency] ??
              installedManifest.dependencies?.[dependency] ??
              installedManifest.devDependencies?.[dependency],
            ),
        );
      }
    }
  }
  consumer.receipt = { path, sha256: hash(await readFile(path)), verified };
  return verified;
}

async function testCLIAdd(
  runner,
  consumer,
  kit,
  manifest,
  { protect = false } = {},
) {
  const args = [
    process.execPath,
    join(kit, "bin/aureform.mjs"),
    "add",
    ...ITEMS.map(([name]) => name),
    "--cwd",
    consumer.project,
  ];
  const exclude = protect ? new Set() : EXCLUDED;
  const before = await snapshotTree(consumer.project, { exclude });
  const dry = await runner.step(consumer, "cli-dry-run", [
    ...args,
    "--dry-run",
  ]);
  runner.check(
    consumer,
    "dry-run reports ready",
    /Status: ready\./.test(dry.stdout) && /Dependencies:/.test(dry.stdout),
  );
  runner.check(
    consumer,
    "dry-run complete tree unchanged",
    JSON.stringify(before) ===
      JSON.stringify(await snapshotTree(consumer.project, { exclude })),
    { beforeSHA256: hash(JSON.stringify(before)) },
  );
  const diff = await runner.step(consumer, "cli-diff", [...args, "--diff"]);
  runner.check(
    consumer,
    "diff includes real text and paths",
    /@@ -/.test(diff.stdout) &&
      /onboarding-flow\.tsx/.test(diff.stdout) &&
      /workspace-provider\.tsx/.test(diff.stdout),
  );
  runner.check(
    consumer,
    "diff complete tree unchanged",
    JSON.stringify(before) ===
      JSON.stringify(await snapshotTree(consumer.project, { exclude })),
  );
  if (protect) {
    runner.check(
      consumer,
      "preview installed no dependencies or receipt",
      !(await exists(join(consumer.project, "node_modules"))) &&
        !(await exists(join(consumer.project, "pnpm-lock.yaml"))) &&
        !(await exists(join(consumer.project, ".aureform"))),
    );
  }
  await runner.step(consumer, "cli-real-add", args);
  const verified = await verifyReceipts(runner, consumer, kit, manifest);
  const installed = await snapshotTree(consumer.project, { exclude });
  await runner.step(consumer, "cli-idempotent-add", args);
  runner.check(
    consumer,
    "idempotent file bytes and metadata unchanged",
    JSON.stringify(fileFingerprint(installed)) ===
      JSON.stringify(
        fileFingerprint(await snapshotTree(consumer.project, { exclude })),
      ),
  );
  if (protect) {
    const primary = verified.find((file) => file.sourcePath === ITEMS[0][1]);
    const target = join(consumer.project, primary.targetPath);
    const original = await readFile(target);
    await writeFile(
      target,
      Buffer.concat([
        original,
        Buffer.from("\n// Independent consumer customization.\n"),
      ]),
    );
    const customized = await snapshotTree(consumer.project);
    const blockedDry = await runner.step(
      consumer,
      "customized-dry-run",
      [...args, "--dry-run"],
      { exitCode: 1 },
    );
    runner.check(
      consumer,
      "preview distinguishes customized conflict",
      /Status: blocked\./.test(blockedDry.stdout) &&
        /CONFLICT \[customized\]/.test(blockedDry.stdout),
    );
    runner.check(
      consumer,
      "customized preview unchanged",
      JSON.stringify(customized) ===
        JSON.stringify(await snapshotTree(consumer.project)),
    );
    const blockedReal = await runner.step(
      consumer,
      "customized-real-add-protected",
      args,
      { exitCode: 1 },
    );
    runner.check(
      consumer,
      "real add rejects overwrite without authorization",
      /overwrite|existing|conflict/i.test(blockedReal.stderr),
    );
    runner.check(
      consumer,
      "failed add atomic tree preservation",
      JSON.stringify(customized) ===
        JSON.stringify(await snapshotTree(consumer.project)),
    );
    const authorizedPreview = await runner.step(
      consumer,
      "explicit-overwrite-diff",
      [...args, "--overwrite", "--diff"],
    );
    runner.check(
      consumer,
      "explicit overwrite preview stays nonmutating",
      /Status: ready\./.test(authorizedPreview.stdout) &&
        /customized/.test(authorizedPreview.stdout) &&
        JSON.stringify(customized) ===
          JSON.stringify(await snapshotTree(consumer.project)),
    );
    await runner.step(consumer, "explicit-overwrite-real", [
      ...args,
      "--overwrite",
    ]);
    runner.check(
      consumer,
      "explicit overwrite restored original source",
      hash(await readFile(target)) === hash(original),
    );
    await verifyReceipts(runner, consumer, kit, manifest);
  }
}

async function dependencyProof(runner, consumer) {
  const project = await realpath(consumer.project);
  const modules = join(project, "node_modules");
  const info = await lstat(modules);
  runner.check(
    consumer,
    "node_modules is a real consumer directory",
    info.isDirectory() &&
      !info.isSymbolicLink() &&
      (await realpath(modules)) === modules,
  );
  const manifest = await json(join(project, "package.json"));
  const dependencies = [];
  for (const [name, requested] of Object.entries({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  })) {
    const packagePath = await realpath(join(modules, name, "package.json"));
    runner.check(
      consumer,
      `${name}: resolves inside consumer node_modules`,
      within(modules, packagePath),
    );
    const bytes = await readFile(packagePath),
      installed = JSON.parse(bytes);
    runner.check(
      consumer,
      `${name}: actual package identity`,
      installed.name === name && typeof installed.version === "string",
    );
    dependencies.push({
      name,
      requested,
      version: installed.version,
      packagePath,
      packageSHA256: hash(bytes),
    });
  }
  consumer.dependencies = dependencies;
  consumer.lockfile = {
    path: join(project, "pnpm-lock.yaml"),
    sha256: hash(await readFile(join(project, "pnpm-lock.yaml"))),
  };
}

async function installProject(runner, consumer, { originalLock = false } = {}) {
  if (!(await exists(join(consumer.project, "node_modules")))) {
    runner.check(consumer, "fresh install starts without node_modules", true);
  } else {
    runner.check(
      consumer,
      "existing modules came from this consumer's executed install",
      consumer.commands.some(
        (command) =>
          [
            "cli-init-default-install",
            "actual-pnpm-install",
            "archive-frozen-install",
          ].includes(command.label) && command.passed,
      ),
    );
  }
  await runner.step(
    consumer,
    originalLock ? "archive-frozen-install" : "actual-pnpm-install",
    [
      runner.options.pnpm,
      "install",
      ...installFlags(runner.options, originalLock),
    ],
  );
  const lock = hash(await readFile(join(consumer.project, "pnpm-lock.yaml")));
  await runner.step(consumer, "frozen-lockfile-replay", [
    runner.options.pnpm,
    "install",
    ...installFlags(runner.options, true),
  ]);
  runner.check(
    consumer,
    "frozen replay preserves lockfile",
    lock === hash(await readFile(join(consumer.project, "pnpm-lock.yaml"))),
  );
  await dependencyProof(runner, consumer);
}

async function libraryInventory(project, paths) {
  const inventory = [];
  for (const path of [...new Set(paths)].sort()) {
    const bytes = await readFile(join(project, safeRelativePath(path)));
    inventory.push({ path, bytes: bytes.length, sha256: hash(bytes) });
  }
  return inventory;
}

async function compileConsumer(
  runner,
  consumer,
  protectedPaths,
  { saas = true, source = false } = {},
) {
  const before = await libraryInventory(consumer.project, protectedPaths);
  consumer.installedSource = {
    files: before,
    sha256: hash(JSON.stringify(before)),
  };
  await runner.step(consumer, "typecheck", [
    runner.options.pnpm,
    "exec",
    "tsc",
    "--noEmit",
  ]);
  await runner.step(consumer, "lint", [
    runner.options.pnpm,
    "exec",
    "eslint",
    ".",
    "--max-warnings=0",
  ]);
  await runner.step(consumer, "production-build", [
    runner.options.pnpm,
    "build",
  ]);
  const after = await libraryInventory(consumer.project, protectedPaths);
  runner.check(
    consumer,
    "installed library bytes preserved through checks",
    JSON.stringify(before) === JSON.stringify(after),
  );
  const buildID = await readFile(join(consumer.project, ".next/BUILD_ID"));
  const outputs = [];
  for (const locale of saas ? ["en", "es"] : ["en"]) {
    const path = join(consumer.project, `out/consumer/${locale}/index.html`);
    const bytes = await readFile(path),
      html = bytes.toString("utf8");
    runner.check(
      consumer,
      `${locale}: real production HTML`,
      bytes.length > 1000 && /<!DOCTYPE html>/i.test(html),
    );
    if (saas) {
      runner.check(
        consumer,
        `${locale}: localized consumer rendered`,
        html.includes(
          locale === "es"
            ? "Consumidor SaaS independiente"
            : "Independent SaaS consumer",
        ),
      );
      for (const [name] of ITEMS) {
        runner.check(
          consumer,
          `${locale}: ${name} rendered in installed host`,
          html.includes(`data-consumer-block="${name}"`),
        );
      }
      runner.check(
        consumer,
        `${locale}: controlled onboarding rendered`,
        html.includes(
          locale === "es"
            ? "Dale un hogar a tu organización."
            : "Give your organization a home.",
        ),
      );
      const workbench =
        html
          .split('data-consumer-block="data-workbench"')[1]
          ?.split('data-consumer-block="import-wizard"')[0] ?? "";
      const body =
        workbench.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
      runner.check(
        consumer,
        `${locale}: external page contains only supplied rows`,
        body.includes("Consumer Alpha") &&
          body.includes("Consumer Beta") &&
          !body.includes("Consumer Gamma") &&
          (body.match(/<tr\b/g) ?? []).length === 2,
      );
      runner.check(
        consumer,
        `${locale}: actual customer detail rendered`,
        html.includes("Consumer Alpha") && html.includes("Consumer Co"),
      );
    } else {
      for (const name of [
        "button",
        "input",
        "textarea",
        "card",
        "badge",
        "avatar",
        "alert",
        "skeleton",
      ]) {
        runner.check(
          consumer,
          `free sample: ${name} rendered`,
          html.includes(`data-free-component="${name}"`),
        );
      }
    }
    outputs.push({ path, bytes: bytes.length, sha256: hash(bytes) });
  }
  if (!source) {
    const home = join(consumer.project, "out/index.html");
    outputs.push({ path: home, sha256: hash(await readFile(home)) });
  }
  consumer.production = {
    buildID: buildID.toString("utf8").trim(),
    buildIDSHA256: hash(buildID),
    outputs,
    staticServerRenderingVerified: true,
    browserInteractionsExecuted: false,
  };
}

async function captureHTTP(runner) {
  const inputs = [];
  for (const name of ["index", "registry", ...ITEMS.map(([name]) => name)]) {
    const url = `${runner.options.baseURL}/r/${name}.json`;
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    assert(response.ok, `${url}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const sourcePath = `public/r/${name}.json`;
    assert.equal(
      hash(bytes),
      hash(await readFile(join(runner.options.kit, sourcePath))),
      `${url}: live payload differs from the selected source kit.`,
    );
    const document = JSON.parse(bytes);
    if (name === "index")
      assert.equal(document.version, RELEASE, "Stale registry version.");
    const path = join(runner.options.out, "http-inputs", `${name}.json`);
    await write(path, bytes);
    inputs.push({
      name,
      url,
      path,
      sourcePath,
      bytes: bytes.length,
      sha256: hash(bytes),
    });
  }
  const index = await json(inputs[0].path),
    registry = await json(inputs[1].path);
  const names = index.items.map((item) => item.name);
  assert.equal(
    new Set(names).size,
    names.length,
    "Duplicate registry index items.",
  );
  assert.deepEqual(
    registry.items.map((item) => item.name).sort(),
    [...names].sort(),
    "Standard registry and index inventories differ.",
  );
  for (const [name] of ITEMS)
    assert(names.includes(name), `Missing ${name} registry entry.`);
  return { version: index.version, itemCount: names.length, inputs };
}

async function officialRegistry(runner, consumer, kitManifest) {
  await createHost(consumer.project, kitManifest, { official: true });
  await write(
    join(consumer.project, "eslint.config.mjs"),
    await readFile(join(runner.options.kit, "eslint.config.mjs")),
  );
  await installProject(runner, consumer);
  const schemaModule = await import(
    pathToFileURL(
      join(consumer.project, "node_modules/shadcn/dist/schema/index.js"),
    )
  );
  const registry = await json(
    join(runner.options.out, "http-inputs/registry.json"),
  );
  runner.check(
    consumer,
    "official schema accepts standard registry",
    schemaModule.registrySchema.safeParse(registry).success,
  );
  for (const [name] of ITEMS) {
    const item = await json(
      join(runner.options.out, `http-inputs/${name}.json`),
    );
    runner.check(
      consumer,
      `${name}: official item schema`,
      schemaModule.registryItemSchema.safeParse(item).success,
    );
  }
  await runner.step(consumer, "official-shadcn-http-add", [
    runner.options.pnpm,
    "exec",
    "shadcn",
    "add",
    ...ITEMS.map(([name]) => `${runner.options.baseURL}/r/${name}.json`),
    "--yes",
    "--cwd",
    consumer.project,
  ]);
  const documents = await Promise.all(
    ITEMS.map(async ([name]) =>
      json(join(runner.options.out, `http-inputs/${name}.json`)),
    ),
  );
  const paths = documents.flatMap((document) =>
    document.files.map((file) => {
      const replacements = {
        "@ui/": "src/components/ui/",
        "@components/": "src/components/",
        "@lib/": "src/lib/",
        "@hooks/": "src/hooks/",
        "~/": "",
      };
      for (const [prefix, target] of Object.entries(replacements)) {
        if (file.target.startsWith(prefix))
          return target + file.target.slice(prefix.length);
      }
      throw new Error(`Unsupported official file target: ${file.target}`);
    }),
  );
  consumer.host = await wireSaasHost(consumer.project);
  consumer.installMethod = {
    officialCLI: true,
    kitLibrarySubstitution: false,
    payloadRepairs: false,
  };
  await installProject(runner, consumer);
  await compileConsumer(runner, consumer, paths);
}

async function cliConsumer(runner, consumer, kitManifest) {
  const init = consumer.name === "cli-init";
  if (init) {
    await runner.step(
      consumer,
      "cli-init-default-install",
      [
        process.execPath,
        join(runner.options.kit, "bin/aureform.mjs"),
        "init",
        consumer.project,
      ],
      { cwd: runner.options.out, env: { CI: "0" } },
    );
    runner.check(
      consumer,
      "init identifies current kit",
      (await readFile(join(consumer.project, "README.md"), "utf8")).includes(
        `Aureform ${RELEASE} starter`,
      ),
    );
  } else {
    await createHost(consumer.project, kitManifest, { custom: true });
    await write(
      join(consumer.project, "eslint.config.mjs"),
      await readFile(join(runner.options.kit, "eslint.config.mjs")),
    );
  }
  await testCLIAdd(runner, consumer, runner.options.kit, kitManifest, {
    protect: !init,
  });
  consumer.host = await wireSaasHost(consumer.project, { custom: !init });
  await installProject(runner, consumer);
  await compileConsumer(
    runner,
    consumer,
    consumer.receipt.verified.map((file) => file.targetPath),
  );
}

// Python's independent ZIP reader checks CRC and extraction paths. The producer's
// scripts/lib/zip.mjs is deliberately not imported by this verifier.
const ZIP_INSPECTOR = String.raw`import sys, json, zipfile, hashlib, stat, re, io
from pathlib import Path, PurePosixPath
digest = lambda b: hashlib.sha256(b).hexdigest()
CORE_ARCHIVES = {"aureform-ui-source.zip":"source", "aureform-ui-starter.zip":"starter", "aureform-ui-free.zip":"free"}

def manifest_entries(raw, pin, version):
    if digest(raw) != pin: raise ValueError("Manifest differs from the owner's explicit SHA256")
    manifest = json.loads(raw)
    if manifest.get("version") != version: raise ValueError("Stale ZIP version")
    items = manifest.get("archives", [])
    if not isinstance(items, list): raise ValueError("Invalid archive manifest")
    for entry in items:
        name = entry.get("name") if isinstance(entry, dict) else None
        if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*\.zip", name):
            raise ValueError("Unsafe manifest archive name")
    if len({e["name"] for e in items}) != len(items): raise ValueError("Duplicate manifest archive")
    if not set(CORE_ARCHIVES).issubset({e["name"] for e in items}): raise ValueError("Missing source/starter/free archive")
    return items

def inspect_archive(raw, entry, version):
    name = entry["name"]
    kind = CORE_ARCHIVES.get(name, "evidence")
    if len(raw) != entry["bytes"] or digest(raw) != entry["sha256"]: raise ValueError(name + ": ZIP bytes/hash mismatch")
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        infos = archive.infolist()
        if len(infos) != entry["files"]: raise ValueError(name + ": file count mismatch")
        paths, inventory = set(), []
        if sum(i.file_size for i in infos) > 2 * 1024**3: raise ValueError("Archive exceeds 2 GiB extraction limit")
        for info in infos:
            filename, mode = info.filename, info.external_attr >> 16
            parts = PurePosixPath(filename).parts
            if (not filename or filename.startswith("/") or "\\" in filename or "\0" in filename
                or ".." in parts or re.match(r"^[A-Za-z]:", filename)
                or str(PurePosixPath(filename)) != filename or filename in paths):
                raise ValueError(name + ": unsafe/duplicate path " + filename)
            if (info.is_dir() or info.flag_bits & 1 or stat.S_IFMT(mode) not in {0, stat.S_IFREG}):
                raise ValueError(name + ": non-regular/encrypted entry " + filename)
            if any(p in {".git", ".openai", "node_modules", ".next", "out", "artifacts", "test-results", "playwright-report"}
                   or p.startswith(".env") or p.endswith(".tsbuildinfo") for p in parts):
                raise ValueError(name + ": excluded runtime/secret path " + filename)
            if filename.startswith("public/downloads/"): raise ValueError(name + ": nested generated downloads")
            if kind != "evidence" and filename == "bin/aureform.mjs" and stat.S_IMODE(mode) != 0o755: raise ValueError("CLI executable mode missing")
            paths.add(filename)
        failing = archive.testzip()
        if failing: raise ValueError(name + ": CRC failed at " + failing)
        required = []
        if kind != "evidence":
            package = json.loads(archive.read("package.json"))
            if kind in {"source", "free"} and package.get("version") != version: raise ValueError(name + ": packaged version mismatch")
            if kind == "starter" and ("Aureform " + version + " starter") not in archive.read("README.md").decode():
                raise ValueError("Starter does not identify current kit")
            required = {
              "source": ["bin/aureform.mjs", "scripts/lib/source-graph.mjs", "pnpm-lock.yaml", "public/r/index.json", "public/r/registry.json"],
              "starter": ["src/app/page.tsx", "src/components/providers.tsx", "scripts/lib/appearance-tokens.mjs"],
              "free": ["src/lib/appearance.ts", "src/styles/effects.css", "scripts/lib/appearance-tokens.mjs", "LICENSE"]
            }[kind]
        if kind == "source":
            index = json.loads(archive.read("public/r/index.json"))
            if index.get("version") != version: raise ValueError("Source registry version mismatch")
            names = [i["name"] for i in index["items"]]
            if len(set(names)) != len(names): raise ValueError("Duplicate source registry entries")
            required += ["public/r/" + n + ".json" for n in names]
            required += ["src/components/blocks/" + n + ".tsx" for n in ["onboarding-flow","member-management","data-workbench","import-wizard","record-detail"]]
            required += ["src/components/templates/customer-detail.tsx", "src/components/workspace-provider.tsx"]
        if kind == "free":
            required += ["src/components/ui/" + n + ".tsx" for n in ["button","input","textarea","card","badge","avatar","alert","skeleton"]]
        missing = [p for p in required if p not in paths]
        if missing: raise ValueError(name + ": missing documented payloads " + str(missing))
        for info in infos:
            content = archive.read(info)
            inventory.append({"path":info.filename,"bytes":len(content),"sha256":digest(content),"crc32":format(info.CRC,"08x")})
    return {"name":name,"kind":kind,"sha256":digest(raw),"bytes":len(raw),"files":len(inventory),"crcVerified":True,"consumerRequired":kind != "evidence","inventory":inventory}

def main(args):
    manifest_path, pin, version, out = args
    manifest_path, out = Path(manifest_path).resolve(), Path(out).resolve()
    items = manifest_entries(manifest_path.read_bytes(), pin, version)
    results = []
    for entry in items:
        path = manifest_path.parent / entry["name"]
        raw = path.read_bytes()
        inspected = inspect_archive(raw, entry, version)
        target = out / inspected["kind"]
        if inspected["kind"] == "evidence": target = target / Path(entry["name"]).stem
        if target.exists(): raise ValueError("Extraction target already exists: " + str(target))
        target.mkdir(parents=True)
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            for info in archive.infolist():
                destination = target / info.filename
                if not destination.resolve().is_relative_to(target): raise ValueError("Extraction escaped target")
                content = archive.read(info)
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(content)
                destination.chmod(stat.S_IMODE(info.external_attr >> 16) or 0o644)
        results.append({**inspected,"path":str(path),"project":str(target)})
    result = {"version":version,"manifest":str(manifest_path),"manifestSHA256":pin,"archives":results,"consumerCompileCertified":False}
    (out / "archive-inputs.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({"archiveIntegrity":"PASS","manifestSHA256":pin,"archives":[{k:e[k] for k in ["name","kind","sha256","files","consumerRequired"]} for e in results]}))

if __name__ == "__main__":
    main(sys.argv[1:])
`;

const ZIP_FIXTURE_TEST = String.raw`import sys, io, json, zipfile, stat, struct, hashlib
namespace = {"__name__":"synthetic_zip_contract"}
exec(compile(sys.stdin.read(), "embedded_archive_inspector", "exec"), namespace)
inspect_archive, manifest_entries = namespace["inspect_archive"], namespace["manifest_entries"]
digest = lambda b: hashlib.sha256(b).hexdigest()
version = "1.2.0"
def archive_bytes(files):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_STORED) as archive:
        for path, content in files.items():
            info = zipfile.ZipInfo(path)
            info.external_attr = (stat.S_IFREG | (0o755 if path == "bin/aureform.mjs" else 0o644)) << 16
            archive.writestr(info, content)
    return buffer.getvalue()
def entry(name, raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as archive: count = len(archive.infolist())
    return {"name":name,"bytes":len(raw),"sha256":digest(raw),"files":count}
source_files = {path:b"synthetic fixture" for path in [
    "bin/aureform.mjs","scripts/lib/source-graph.mjs","pnpm-lock.yaml","public/r/registry.json",
    "src/components/templates/customer-detail.tsx","src/components/workspace-provider.tsx",
    *["src/components/blocks/" + n + ".tsx" for n in ["onboarding-flow","member-management","data-workbench","import-wizard","record-detail"]]]}
source_files["package.json"] = json.dumps({"version":version}).encode()
source_files["public/r/index.json"] = json.dumps({"version":version,"items":[]}).encode()
starter_files = {path:b"synthetic fixture" for path in [
    "src/app/page.tsx","src/components/providers.tsx","scripts/lib/appearance-tokens.mjs"]}
starter_files["package.json"] = b"{}"
starter_files["README.md"] = ("Aureform " + version + " starter").encode()
free_files = {path:b"synthetic fixture" for path in [
    "src/lib/appearance.ts","src/styles/effects.css","scripts/lib/appearance-tokens.mjs","LICENSE",
    *["src/components/ui/" + n + ".tsx" for n in ["button","input","textarea","card","badge","avatar","alert","skeleton"]]]}
free_files["package.json"] = json.dumps({"version":version}).encode()
payloads = {
    "aureform-ui-source.zip":archive_bytes(source_files),
    "aureform-ui-starter.zip":archive_bytes(starter_files),
    "aureform-ui-free.zip":archive_bytes(free_files),
    "aureform-ui-native-evidence-1.1.zip":archive_bytes({".figma/proofs/1.1/frame.png":b"synthetic historical image bytes"}),
    "aureform-ui-native-evidence-1.2.zip":archive_bytes({".figma/proofs/1.2/frame.png":b"synthetic current image bytes"}),
}
manifest = json.dumps({"version":version,"archives":[entry(n,raw) for n,raw in payloads.items()]}).encode()
items = manifest_entries(manifest, digest(manifest), version)
inspected = [inspect_archive(payloads[item["name"]],item,version) for item in items]
assert len(inspected) == 5 and all(item["crcVerified"] for item in inspected)
assert sum(item["consumerRequired"] for item in inspected) == 3
evidence = [item for item in inspected if item["kind"] == "evidence"]
assert len(evidence) == 2 and all("package.json" not in [f["path"] for f in item["inventory"]] for item in evidence)
rejected = []
def reject(label, operation, message):
    try: operation()
    except (ValueError, zipfile.BadZipFile) as error:
        assert message.lower() in str(error).lower(), (label, str(error))
        rejected.append(label)
    else: raise AssertionError(label + " was accepted")
for proof in evidence:
    name, raw = proof["name"], payloads[proof["name"]]
    invalid_hash = {**entry(name,raw),"sha256":digest(b"different")}
    reject(name + ":SHA", lambda:inspect_archive(raw,invalid_hash,version), "hash mismatch")
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        info = archive.infolist()[0]
    name_length, extra_length = struct.unpack_from("<HH",raw,info.header_offset + 26)
    content_offset = info.header_offset + 30 + name_length + extra_length
    corrupt = bytearray(raw)
    corrupt[content_offset] ^= 1
    corrupt = bytes(corrupt)
    reject(name + ":CRC", lambda:inspect_archive(corrupt,entry(name,corrupt),version), "CRC")
    unsafe = archive_bytes({"../escape.png":b"synthetic image bytes"})
    reject(name + ":path", lambda:inspect_archive(unsafe,entry(name,unsafe),version), "unsafe")
print(json.dumps({"kind":"SYNTHETIC_ARCHIVE_CONTRACT_ONLY","inspectedArchives":len(inspected),
    "evidenceWithoutPackageJSON":len(evidence),"rejectedCases":rejected,"consumerExecutionStarted":False}))
`;

async function archiveFixtureTest() {
  const stdout = [],
    stderr = [];
  const child = spawn("python3", ["-B", "-c", ZIP_FIXTURE_TEST], {
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
  });
  child.stdout.on("data", (bytes) => stdout.push(bytes));
  child.stderr.on("data", (bytes) => stderr.push(bytes));
  let spawnError;
  child.once("error", (error) => {
    spawnError = error;
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), 30_000);
  child.stdin.on("error", () => {});
  child.stdin.end(ZIP_INSPECTOR);
  const result = await new Promise((done) =>
    child.once("close", (exitCode, signal) => done({ exitCode, signal })),
  );
  clearTimeout(timer);
  assert(
    !spawnError && result.exitCode === 0 && !result.signal,
    `Archive fixture test failed: ${spawnError?.message ?? Buffer.concat(stderr).toString("utf8")}`,
  );
  const proof = JSON.parse(Buffer.concat(stdout).toString("utf8"));
  assert.equal(proof.kind, "SYNTHETIC_ARCHIVE_CONTRACT_ONLY");
  assert.equal(proof.inspectedArchives, 5);
  assert.equal(proof.evidenceWithoutPackageJSON, 2);
  assert.equal(proof.rejectedCases.length, 6);
  assert.equal(proof.consumerExecutionStarted, false);
  return proof;
}

async function prepareArchives(runner, kitManifest) {
  const helper = join(runner.options.out, "archive-inspector.py");
  await write(helper, ZIP_INSPECTOR);
  const integrity = {
    name: "archive-integrity",
    project: runner.options.out,
    checks: [],
    commands: [],
  };
  await runner.step(integrity, "pinned-manifest-crc-path-extraction", [
    "python3",
    helper,
    runner.options.checksums,
    runner.options.checksumsSHA256,
    kitManifest.version,
    join(runner.options.out, "consumers"),
  ]);
  const result = await json(
    join(runner.options.out, "consumers/archive-inputs.json"),
  );
  const source = result.archives.find((archive) => archive.kind === "source");
  const compared = assertArchiveSourceMatchesKit(
    source.inventory,
    runner.report.sourceAtStart.files,
  );
  return {
    ...result,
    inspectorSHA256: hash(ZIP_INSPECTOR),
    sourceFilesComparedToKit: compared,
    checks: integrity.checks,
  };
}

async function freeHost(project, kit, kitManifest) {
  const manifest = await json(join(project, "package.json"));
  const originalSHA256 = hash(await readFile(join(project, "package.json")));
  manifest.packageManager = kitManifest.packageManager;
  manifest.scripts = {
    ...manifest.scripts,
    typecheck: "tsc --noEmit",
    lint: "eslint . --max-warnings=0",
    build: "next build",
  };
  manifest.dependencies = {
    ...manifest.dependencies,
    next: kitManifest.dependencies.next,
  };
  manifest.devDependencies = Object.fromEntries(
    HOST_DEV_DEPENDENCIES.map((name) => [
      name,
      kitManifest.devDependencies[name],
    ]),
  );
  await writeJSON(join(project, "package.json"), manifest);
  const hostTemplate = join(project, "host-template");
  await createHost(hostTemplate, kitManifest);
  for (const file of [
    "tsconfig.json",
    "next.config.mjs",
    "postcss.config.mjs",
  ]) {
    await write(join(project, file), await readFile(join(hostTemplate, file)));
  }
  // Keep the archive's globals.css, tokens, effects and eight library files.
  // host-template is not part of the compile tree.
  const { rm } = await import("node:fs/promises");
  await rm(hostTemplate, { recursive: true });
  await write(
    join(project, "eslint.config.mjs"),
    await readFile(join(kit, "eslint.config.mjs")),
  );
  await write(
    join(project, "src/app/layout.tsx"),
    'import type { ReactNode } from "react";\nimport "./globals.css";\nexport default function Layout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }\n',
  );
  const host = `"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
export default function Page() { return <main>
  <h1>Independent Apache 2.0 sample consumer</h1>
  <section data-free-component="button"><Button variant="outline">Sample action</Button></section>
  <section data-free-component="input"><Input aria-label="Sample input" defaultValue="Consumer input" /></section>
  <section data-free-component="textarea"><Textarea aria-label="Sample notes" defaultValue="Consumer notes" /></section>
  <section data-free-component="card"><Card appearance="flat">Sample card</Card></section>
  <section data-free-component="badge"><Badge>Sample badge</Badge></section>
  <section data-free-component="avatar"><Avatar name="Consumer Sample" /></section>
  <section data-free-component="alert"><Alert title="Sample alert">Consumer supplied content</Alert></section>
  <section data-free-component="skeleton"><Skeleton className="h-5 w-24" /></section>
</main>; }
`;
  await write(join(project, "src/app/consumer/en/page.tsx"), host);
  await write(
    join(project, "src/app/page.tsx"),
    "export default function Page() { return <main>Free sample integration host</main>; }\n",
  );
  return {
    originalPackageSHA256: originalSHA256,
    frameworkHostAdded: true,
    originalLibraryRepaired: false,
    sampleComponents: 8,
  };
}

async function archiveConsumer(runner, consumer, kitManifest) {
  const archive = runner.report.archives.archives.find(
    (archive) => archive.kind === consumer.name,
  );
  consumer.archive = {
    path: archive.path,
    sha256: archive.sha256,
    files: archive.files,
  };
  const source = runner.report.archives.archives.find(
    (archive) => archive.kind === "source",
  ).project;
  const protectedPaths = archiveProtectedPaths(archive.inventory);
  if (consumer.name === "free") {
    consumer.host = await freeHost(consumer.project, source, kitManifest);
  } else {
    if (consumer.name === "starter") {
      await testCLIAdd(
        runner,
        consumer,
        source,
        await json(join(source, "package.json")),
      );
      protectedPaths.push(
        ...consumer.receipt.verified.map((file) => file.targetPath),
      );
    }
    consumer.host = await wireSaasHost(consumer.project);
  }
  await installProject(runner, consumer, {
    originalLock: consumer.name === "source",
  });
  await compileConsumer(runner, consumer, protectedPaths, {
    saas: consumer.name !== "free",
    source: consumer.name === "source",
  });
}

export async function run(options) {
  const kit = await realpath(options.kit);
  assert.equal(
    kit,
    options.kit,
    "Use the kit's physical path, not a mirror symlink.",
  );
  const kitManifest = await json(join(kit, "package.json"));
  assert.equal(
    kitManifest.version,
    RELEASE,
    `Expected ${RELEASE}; old artifacts are not fallback inputs.`,
  );
  assert(
    !(await exists(options.out)),
    "Preserve previous reports; --out must not already exist.",
  );
  const parent = await realpath(dirname(options.out));
  assert(
    within(await realpath(tmpdir()), parent),
    "Output parent must stay inside /tmp.",
  );
  if (options.storeDir) await access(options.storeDir, constants.R_OK);
  await mkdir(options.out);
  await mkdir(join(options.out, "consumers"));
  const report = {
    schemaVersion: 1,
    releaseUnderTest: RELEASE,
    startedAt: new Date().toISOString(),
    status: "RUNNING",
    root: options.out,
    kit,
    modes: options.modes,
    scope:
      "Independent installation, API host typecheck, lint and production static build.",
    commands: [],
    consumers: [],
    pendingZIPs: ZIP_MODES.filter((mode) => !options.modes.includes(mode)),
    policy: {
      offline: options.offline,
      ignoreDependencyScripts: true,
      storeDir:
        options.storeDir ??
        "Actual pnpm configured default; captured in command log.",
      consumerNodeModulesShared: false,
      productSourceRepairs: false,
      browserExecution: false,
      FigmaExecution: false,
      releaseCertification: false,
    },
  };
  const runner = new Runner(options, report);
  await runner.save();
  try {
    report.sourceAtStart = await captureSource(kit, options.modes);
    report.sourceAtStartPath = join(options.out, "source-inputs-start.json");
    await writeJSON(report.sourceAtStartPath, report.sourceAtStart);
    const tools = {
      name: "tools",
      project: options.out,
      commands: [],
      checks: [],
    };
    const pnpm = await runner.step(tools, "pnpm-version", [
      options.pnpm,
      "--version",
    ]);
    assert(
      /^\d+\.\d+\.\d+$/.test(pnpm.stdout.trim()),
      "pnpm did not report an actual version.",
    );
    const store = await runner.step(tools, "actual-pnpm-store", [
      options.pnpm,
      "store",
      "path",
      ...(options.storeDir ? ["--store-dir", options.storeDir] : []),
    ]);
    assert(
      isAbsolute(store.stdout.trim()),
      "pnpm did not report its actual store path.",
    );
    report.tools = {
      node: process.version,
      nodeExecutable: process.execPath,
      pnpm: pnpm.stdout.trim(),
      storePath: store.stdout.trim(),
    };
    if (options.modes.includes("registry"))
      report.HTTPAtStart = await captureHTTP(runner);
    if (options.modes.some((mode) => ZIP_MODES.includes(mode)))
      report.archives = await prepareArchives(runner, kitManifest);
    for (const name of options.modes) {
      const consumer = {
        name,
        project: join(options.out, "consumers", name),
        status: "RUNNING",
        startedAt: new Date().toISOString(),
        commands: [],
        checks: [],
      };
      report.consumers.push(consumer);
      await runner.save();
      try {
        if (name === "registry")
          await officialRegistry(runner, consumer, kitManifest);
        else if (CORE_MODES.includes(name))
          await cliConsumer(runner, consumer, kitManifest);
        else await archiveConsumer(runner, consumer, kitManifest);
        assert(
          consumer.commands.length && consumer.checks.length,
          "Empty consumer execution is not a pass.",
        );
        consumer.status = "PASS";
      } catch (error) {
        consumer.status = "FAIL";
        consumer.failure = error.stack;
        console.error(error.stack);
      }
      consumer.finishedAt = new Date().toISOString();
      await runner.save();
    }
    if (report.HTTPAtStart) {
      report.HTTPEnd = [];
      for (const input of report.HTTPAtStart.inputs) {
        const response = await fetch(input.url, {
          cache: "no-store",
          signal: AbortSignal.timeout(30_000),
        });
        assert(response.ok, `${input.url}: ending HTTP ${response.status}`);
        const sha256 = hash(Buffer.from(await response.arrayBuffer()));
        report.HTTPEnd.push({
          name: input.name,
          sha256,
          unchanged: sha256 === input.sha256,
        });
        assert.equal(
          sha256,
          input.sha256,
          `${input.name}: HTTP source changed during the run.`,
        );
      }
    }
    if (report.archives) {
      assert.equal(
        hash(await readFile(options.checksums)),
        options.checksumsSHA256,
        "Archive manifest changed during the run.",
      );
      report.archiveEnd = [];
      for (const archive of report.archives.archives) {
        const sha256 = hash(await readFile(archive.path));
        report.archiveEnd.push({
          name: archive.name,
          kind: archive.kind,
          sha256,
          unchanged: sha256 === archive.sha256,
        });
        assert.equal(
          sha256,
          archive.sha256,
          `${archive.kind}: archive bytes changed during the run.`,
        );
      }
    }
    report.status = report.consumers.every(
      (consumer) => consumer.status === "PASS",
    )
      ? "PASS"
      : "FAIL";
  } catch (error) {
    report.status = "FAIL";
    report.failure = error.stack;
    console.error(error.stack);
  } finally {
    try {
      report.sourceAtEnd = await captureSource(kit, options.modes);
      report.sourceIntegrity = {
        startSHA256: report.sourceAtStart?.sha256,
        endSHA256: report.sourceAtEnd.sha256,
        unchanged: report.sourceAtStart?.sha256 === report.sourceAtEnd.sha256,
      };
      await writeJSON(
        join(options.out, "source-inputs-end.json"),
        report.sourceAtEnd,
      );
      if (!report.sourceIntegrity.unchanged) report.status = "FAIL";
    } catch (error) {
      report.status = "FAIL";
      report.sourceIntegrity = { unchanged: false, failure: error.message };
    }
    report.finishedAt = new Date().toISOString();
    report.results = {
      plannedConsumers: options.modes.length,
      executedConsumers: report.consumers.length,
      passedConsumers: report.consumers.filter(
        (consumer) => consumer.status === "PASS",
      ).length,
      failedConsumers: report.consumers.filter(
        (consumer) => consumer.status === "FAIL",
      ).length,
      checks: report.consumers.reduce(
        (count, consumer) => count + consumer.checks.length,
        0,
      ),
      passedChecks: report.consumers.reduce(
        (count, consumer) =>
          count + consumer.checks.filter((check) => check.passed).length,
        0,
      ),
    };
    delete report.pendingStep;
    await runner.save();
  }
  return { path: runner.path, report };
}

export async function selfTest() {
  const checks = [];
  const check = (name, operation) => {
    operation();
    checks.push(name);
  };
  check("preview parsing has no execution authorization", () =>
    assert.equal(parseArgs(["--plan"]).run, undefined),
  );
  check("run needs fresh output", () =>
    assert.throws(() => parseArgs(["--run"]), /--out/),
  );
  check("registry needs an explicit HTTP origin", () =>
    assert.throws(
      () => parseArgs(["--run", "--out", "/tmp/consumer-contract"]),
      /base-url/,
    ),
  );
  check("old-source destination rejected", () =>
    assert.throws(
      () =>
        parseArgs([
          "--run",
          "--kit",
          "/tmp/kit",
          "--out",
          "/tmp/kit/consumer",
          "--modes",
          "cli-add",
        ]),
      /outside/,
    ),
  );
  check("ZIP requires an owner pin", () =>
    assert.throws(
      () =>
        parseArgs([
          "--run",
          "--out",
          "/tmp/consumer-contract",
          "--modes",
          "source",
        ]),
      /pinned/,
    ),
  );
  check(
    "six modes accept one explicit manifest pin without executing consumers",
    () => {
      const options = parseArgs([
        "--plan",
        "--base-url",
        "http://127.0.0.1:3012",
        "--checksums",
        "/tmp/synthetic-owner-contract/checksums.json",
        "--checksums-sha256",
        hash("synthetic parser fixture; not a release checksum"),
      ]);
      assert.deepEqual(options.modes, [...CORE_MODES, ...ZIP_MODES]);
      assert.equal(options.run, undefined);
    },
  );
  check(
    "source ZIP binding rejects mismatched or missing captured configuration, lockfile, tokens and executable inputs",
    () => {
      const captured = [
        "src/lib/saas.ts",
        "bin/aureform.mjs",
        "pnpm-lock.yaml",
        "tsconfig.json",
        "components.json",
        "next.config.ts",
        "tokens/aureform.tokens.json",
        "scripts/generate-registry.mjs",
        "scripts/verify-saas-consumers.mjs",
        "public/r/registry.json",
      ].map((path) => ({ path, sha256: hash(`original:${path}`) }));
      assert.equal(
        assertArchiveSourceMatchesKit(captured, captured),
        captured.length,
      );
      for (const file of captured) {
        const different = captured.map((entry) =>
          entry.path === file.path
            ? { ...entry, sha256: hash("different bytes") }
            : entry,
        );
        assert.throws(
          () => assertArchiveSourceMatchesKit(different, captured),
          (error) => error.message.includes(file.path),
        );
        assert.throws(
          () =>
            assertArchiveSourceMatchesKit(
              captured.filter((entry) => entry.path !== file.path),
              captured,
            ),
          (error) => error.message.includes(file.path),
        );
      }
    },
  );
  check(
    "ZIP library preservation includes app CSS, tokens and shipped executable helpers while host routes can be added",
    () => {
      const preserved = [
        "src/components/ui/button.tsx",
        "src/lib/appearance.ts",
        "src/styles/tokens.css",
        "src/app/globals.css",
        "tokens/aureform.tokens.json",
        "scripts/generate-tokens.mjs",
        "scripts/lib/appearance-tokens.mjs",
        "bin/aureform.mjs",
      ];
      const host = [
        "src/app/page.tsx",
        "src/app/consumer/en/page.tsx",
        "package.json",
      ];
      assert.deepEqual(
        archiveProtectedPaths(
          [...preserved, ...host].map((path) => ({ path })),
        ),
        preserved,
      );
    },
  );
  check("credentials are not accepted", () =>
    assert.throws(
      () =>
        parseArgs(["--plan", "--base-url", "https://user:secret@example.test"]),
      /credentials/,
    ),
  );
  check("duplicate modes rejected", () =>
    assert.throws(
      () => parseArgs(["--plan", "--modes", "cli-add,cli-add"]),
      /duplicate/,
    ),
  );
  check("unsafe receipt paths rejected", () => {
    for (const path of [
      "../escape",
      "/root",
      "C:/root",
      "a\\b",
      "a//b",
      "./a",
      "a/../b",
    ]) {
      assert.throws(() => safeRelativePath(path), /Unsafe/);
    }
  });
  check("hashes bind exact bytes", () =>
    assert.notEqual(hash("consumer\n"), hash("consumer")),
  );
  check("custom alias targets differ from standard registry targets", () => {
    assert.equal(
      consumerTarget(ITEMS[0][1], true),
      "design/blocks/onboarding-flow.tsx",
    );
    assert.equal(
      consumerTarget("src/lib/csv-import.ts", true),
      "core/csv-import.ts",
    );
    assert.equal(
      consumerTarget("src/demo/dashboard-data.ts", true),
      "demo/dashboard-data.ts",
    );
    assert.equal(consumerTarget(ITEMS[6][1]), ITEMS[6][1]);
  });
  check("idempotence includes file metadata and directory membership", () => {
    assert.deepEqual(
      fileFingerprint([
        { path: "", type: "directory", mtimeNs: "1" },
        { path: "a", type: "file", sha256: "hash", inode: "12" },
      ]),
      [
        { path: "", type: "directory" },
        { path: "a", type: "file", sha256: "hash", inode: "12" },
      ],
    );
  });
  check("host uses all real installed APIs and provider boundaries", () => {
    const host = saasHostSource(
      "/tmp/consumer/consumer-verification/host.tsx",
      (path) => join("/tmp/consumer", consumerTarget(path, true)),
    );
    for (const token of [
      "<OnboardingFlow",
      "<MemberManagement",
      "<DataWorkbench<Customer>",
      "<ImportWizard<CustomerImportRow>",
      "<CustomerDetailTemplate",
      "<GenericRecordDetail",
      "<WorkspaceProvider>",
      "<NextIntlClientProvider",
      'mode="external"',
      "rowCount={matching.length}",
    ])
      assert(host.includes(token));
    assert(!host.includes(DEFAULT_KIT));
  });
  const archiveFixtures = await archiveFixtureTest();
  checks.push(
    "all five synthetic ZIPs are inspected; both evidence archives reject SHA, CRC and traversal defects without requiring package.json",
  );
  return {
    kind: "RUNNER_CONTRACT_ONLY",
    passed: checks.length,
    checks,
    archiveFixtures,
    runnerSHA256: hash(await readFile(fileURLToPath(import.meta.url))),
    archiveInspectorSHA256: hash(ZIP_INSPECTOR),
    consumerExecutionStarted: false,
  };
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) return console.log(help);
  if (options.selfTest)
    return console.log(JSON.stringify(await selfTest(), null, 2));
  if (options.plan)
    return console.log(JSON.stringify(await plan(options), null, 2));
  const result = await run(options);
  console.log(
    JSON.stringify(
      {
        status: result.report.status,
        ...result.report.results,
        report: result.path,
        pendingZIPs: result.report.pendingZIPs,
      },
      null,
      2,
    ),
  );
  if (result.report.status !== "PASS") process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.stack);
    process.exitCode = 1;
  });
}
