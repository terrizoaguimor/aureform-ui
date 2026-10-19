import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import {
  changeWorkspaceMemberRole,
  hasCapability,
  mergeImportedCustomers,
  parseSaasState,
  removeWorkspaceMember,
  transferWorkspaceOwnership,
  updateWorkspaceData,
  workspaceSlug,
} from "../src/lib/saas.ts";
const typescriptResolution = registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        specifier.startsWith(".") &&
        !/\.[a-z]+$/i.test(specifier)
      ) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
const { createSaasSeed } = await import("../src/demo/saas-data.ts");
typescriptResolution.deregister();

test("persisted SaaS snapshots validate membership, IDs and active workspace", () => {
  const seed = createSaasSeed();
  assert.ok(parseSaasState(seed));
  assert.equal(parseSaasState({ ...seed, activeWorkspaceId: "foreign" }), null);
  assert.equal(parseSaasState({ ...seed, currentMemberId: "foreign" }), null);
  assert.equal(parseSaasState({ ...seed, version: 99 }), null);
  assert.equal(parseSaasState({}), null);
  const duplicate = createSaasSeed();
  duplicate.data.studio.customers.push(duplicate.data.studio.customers[0]);
  assert.equal(parseSaasState(duplicate), null);
  const ownerless = createSaasSeed();
  ownerless.data.studio.members[0].role = "viewer";
  assert.equal(parseSaasState(ownerless), null);
});

test("workspace updates cannot change another workspace's data", () => {
  const seed = createSaasSeed();
  const next = updateWorkspaceData(seed, "studio", (data) => ({
    ...data,
    customers: [],
  }));
  assert.equal(next.data.studio.customers.length, 0);
  assert.deepEqual(next.data.personal, seed.data.personal);
  assert.equal(seed.data.studio.customers.length, 12);
  assert.throws(() => updateWorkspaceData(seed, "__proto__", (data) => data));
});

test("capabilities separate viewers, members, administrators and ownership", () => {
  assert.equal(hasCapability("viewer", "customers.write"), false);
  assert.equal(hasCapability("viewer", "notes.write"), false);
  assert.equal(hasCapability("member", "customers.import"), true);
  assert.equal(hasCapability("member", "members.manage"), false);
  assert.equal(hasCapability("admin", "members.manage"), true);
  assert.equal(hasCapability("admin", "ownership.transfer"), false);
  assert.equal(hasCapability("owner", "ownership.transfer"), true);
});

test("ownership changes preserve exactly one active owner and cannot be forged by an administrator", () => {
  const members = createSaasSeed().data.studio.members;
  const next = transferWorkspaceOwnership(
    members,
    "member-you",
    "member-isabel",
  );
  assert.equal(next.filter((item) => item.role === "owner").length, 1);
  assert.equal(next.find((item) => item.id === "member-you").role, "admin");
  assert.equal(next.find((item) => item.id === "member-isabel").role, "owner");
  assert.equal(members[0].role, "owner");
  assert.throws(() =>
    transferWorkspaceOwnership(members, "member-isabel", "member-daniel"),
  );
  assert.throws(() =>
    transferWorkspaceOwnership(members, "member-you", "member-you"),
  );
  assert.throws(() =>
    changeWorkspaceMemberRole(members, "member-you", "viewer"),
  );
  assert.throws(() =>
    changeWorkspaceMemberRole(members, "member-isabel", "owner"),
  );
  assert.throws(() =>
    removeWorkspaceMember(members, "member-you", "member-you"),
  );
  assert.throws(() =>
    changeWorkspaceMemberRole(next, "member-you", "viewer", "member-you"),
  );
  assert.throws(() => removeWorkspaceMember(next, "member-you", "member-you"));
  assert.equal(
    changeWorkspaceMemberRole(
      next,
      "member-daniel",
      "viewer",
      "member-you",
    ).find((item) => item.id === "member-daniel").role,
    "viewer",
  );
});

test("CSV merge is case-insensitive, transactional and preserves identity during updates", () => {
  const customers = createSaasSeed().data.studio.customers;
  const duplicate = {
    ...customers[0],
    id: "import-other",
    email: customers[0].email.toUpperCase(),
    name: "Updated name",
  };
  const fresh = {
    ...customers[1],
    id: "import-new",
    email: "new@aureform.demo",
  };
  const skipped = mergeImportedCustomers(customers, [duplicate, fresh], "skip");
  assert.deepEqual(skipped.result, {
    created: 1,
    updated: 0,
    skipped: 1,
    failed: 0,
  });
  assert.equal(skipped.customers[0].name, customers[0].name);
  const updated = mergeImportedCustomers(
    customers,
    [duplicate, fresh],
    "update",
  );
  assert.deepEqual(updated.result, {
    created: 1,
    updated: 1,
    skipped: 0,
    failed: 0,
  });
  assert.equal(updated.customers[0].id, customers[0].id);
  assert.equal(updated.customers[0].name, "Updated name");
  assert.equal(customers[0].name, "Olivia Rhye");
  const invalid = mergeImportedCustomers(
    customers,
    [{ ...fresh, amount: -1 }],
    "skip",
  );
  assert.equal(invalid.result.failed, 1);
});

test("workspace slugs support Spanish names without retaining path punctuation", () => {
  assert.equal(
    workspaceSlug("Diseño & Operación / Bogotá"),
    "diseno-operacion-bogota",
  );
  assert.equal(workspaceSlug("../ My Workspace?"), "my-workspace");
});
