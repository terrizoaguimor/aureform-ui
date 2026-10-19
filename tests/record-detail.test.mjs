import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { z } from "zod";

// Compile the exported pure functions without importing the client component
// boundary or substituting any of the actual validation/merge implementation.
const source = await readFile(
  new URL("../src/components/templates/customer-detail.tsx", import.meta.url),
  "utf8",
);
const ast = ts.createSourceFile(
  "customer-detail.tsx",
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const names = new Set(["createCustomerDetailSchema", "buildCustomerUpdate"]);
const declarations = ast.statements.filter(
  (node) => ts.isFunctionDeclaration(node) && names.has(node.name?.text),
);
assert.equal(declarations.length, names.size);
const compiled = ts.transpileModule(
  declarations.map((node) => node.getText(ast)).join("\n"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const api = {};
new Function("z", "exports", compiled)(z, api);
const { createCustomerDetailSchema, buildCustomerUpdate } = api;

const customer = Object.freeze({
  id: "cus-001",
  name: "Olivia Rhye",
  email: "olivia@layers.studio",
  company: "Layers",
  plan: "Pro",
  status: "active",
  amount: 249,
  joined: "2026-10-14",
});

test("customer validation trims editable strings without rounding amounts", () => {
  const result = createCustomerDetailSchema().parse({
    ...customer,
    name: "  Olivia Rhye  ",
    email: "  olivia@layers.studio  ",
    company: "  Layers  ",
    amount: 249.75,
  });
  assert.equal(result.name, customer.name);
  assert.equal(result.email, customer.email);
  assert.equal(result.company, customer.company);
  assert.equal(result.amount, 249.75);
  assert.equal(Object.hasOwn(result, "id"), false);
  assert.equal(Object.hasOwn(result, "joined"), false);
});

test("invalid contact details and non-finite or negative amounts are rejected", () => {
  const schema = createCustomerDetailSchema();
  for (const invalid of [
    { name: "O" },
    { name: " ".repeat(5) },
    { email: "olivia" },
    { plan: "" },
    { status: "" },
    { amount: -0.01 },
    { amount: NaN },
    { amount: Infinity },
  ]) {
    assert.equal(schema.safeParse({ ...customer, ...invalid }).success, false);
  }
  assert.equal(schema.safeParse({ ...customer, amount: 0 }).success, true);
});

test("CSV customers can keep an empty company when another field is edited", () => {
  const draft = createCustomerDetailSchema().parse({
    ...customer,
    company: "   ",
    name: "Olivia Updated",
  });
  const next = buildCustomerUpdate({ ...customer, company: "" }, draft);
  assert.equal(next.company, "");
  assert.equal(next.name, "Olivia Updated");
});

test("customer fields accept the foundation limits and reject longer values", () => {
  const schema = createCustomerDetailSchema();
  for (const [field, limit] of [
    ["name", 120],
    ["company", 200],
    ["plan", 60],
    ["status", 60],
  ]) {
    assert.equal(
      schema.safeParse({ ...customer, [field]: "a".repeat(limit) }).success,
      true,
      `${field} accepts ${limit} characters`,
    );
    assert.equal(
      schema.safeParse({ ...customer, [field]: "a".repeat(limit + 1) }).success,
      false,
      `${field} rejects ${limit + 1} characters`,
    );
  }
  assert.equal(schema.safeParse({ ...customer, name: "Al" }).success, true);
  const longestEmail = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
  assert.equal(longestEmail.length, 254);
  assert.equal(
    schema.safeParse({ ...customer, email: longestEmail }).success,
    true,
  );
  assert.equal(
    schema.safeParse({ ...customer, email: `${longestEmail}d` }).success,
    false,
  );
});

test("source Customer string fields preserve existing custom plans and statuses", () => {
  const parsed = createCustomerDetailSchema().parse({
    ...customer,
    plan: "Partner",
    status: "onboarding",
  });
  assert.equal(parsed.plan, "Partner");
  assert.equal(parsed.status, "onboarding");
});

test("validation errors use the active EN/ES labels", () => {
  for (const [locale, expected] of [
    ["en", /valid email address/],
    ["es", /correo válido/],
  ]) {
    const schema = createCustomerDetailSchema((en, es) =>
      locale === "es" ? es : en,
    );
    const result = schema.safeParse({ ...customer, email: "invalid" });
    assert.equal(result.success, false);
    assert.match(result.error.issues[0].message, expected);
  }
});

test("updating a customer preserves identity and join date without mutating props", () => {
  const next = buildCustomerUpdate(customer, {
    ...customer,
    id: "another-id",
    joined: "2000-01-01",
    name: "Olivia Updated",
    amount: 199.25,
  });
  assert.notEqual(next, customer);
  assert.equal(next.id, customer.id);
  assert.equal(next.joined, customer.joined);
  assert.equal(next.name, "Olivia Updated");
  assert.equal(next.amount, 199.25);
  assert.equal(customer.name, "Olivia Rhye");
  assert.equal(customer.amount, 249);
});
