import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const resolver = registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); }
    catch (error) {
      if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});
const { queryCustomers, loadDemoCustomerPage } = await import("../src/demo/customer-adapter.ts");
const { createSaasSeed } = await import("../src/demo/saas-data.ts");
resolver.deregister();
const customers = createSaasSeed().data.studio.customers;
const query = { search: "", filters: [], sorting: [], pagination: { pageIndex: 0, pageSize: 5 } };

test("external pages retain the dataset total without locally repaginating the page", () => {
  const page = queryCustomers(customers, { ...query, pagination: { pageIndex: 1, pageSize: 5 } });
  assert.equal(page.total, 12);
  assert.equal(page.rows.length, 5);
  assert.equal(page.rows[0].id, "cus-006");
});
test("AND filters, numeric sorting and accent-insensitive search compose", () => {
  const page = queryCustomers(customers, { ...query, filters: [{ id: "status", value: { operator: "equals", value: "active" } }, { id: "amount", value: { operator: "gte", value: 249 } }], sorting: [{ id: "amount", desc: true }] });
  assert.equal(page.total, 5);
  assert.equal(page.rows[0].amount, 699);
  assert.ok(page.rows.every((row) => row.status === "active" && row.amount >= 249));
  assert.equal(queryCustomers(customers, { ...query, search: "Matias" }).rows[0].name, "Matías Vega");
});
test("a page is clamped after removals and foreign column IDs are ignored", () => {
  const page = queryCustomers(customers.slice(0, 3), { ...query, filters: [{ id: "__proto__", value: { operator: "equals", value: "bad" } }], pagination: { pageIndex: 10, pageSize: 5 } });
  assert.equal(page.query.pagination.pageIndex, 0);
  assert.equal(page.total, 3);
  assert.equal(page.rows.length, 3);
});
test("cancelled and failed demo queries cannot be mistaken for successful data", async () => {
  const controller = new AbortController();
  const pending = loadDemoCustomerPage(customers, query, { signal: controller.signal, delay: 100 });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  await assert.rejects(() => loadDemoCustomerPage(customers, query, { signal: new AbortController().signal, delay: 0, fail: true }));
  const page = await loadDemoCustomerPage(customers, query, { signal: new AbortController().signal, delay: 0 });
  assert.equal(page.total, 12);
});
