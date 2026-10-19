import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  autoMapCSVHeaders,
  createCSVSample,
  CSVImportError,
  customerImportFields,
  defaultCSVLimits,
  executeImportAttempt,
  formatCSVError,
  getCustomerImportKey,
  parseCSV,
  previewCSVImport,
  resolveCSVLimits,
  serializeCSV,
  validateCSVMapping,
  validateImportResult,
} from "../src/lib/csv-import.ts";
import { customerSchema } from "../src/lib/saas.ts";

const hasCode = (code) => (error) =>
  error instanceof CSVImportError && error.code === code;
const headings = [
  "name",
  "email",
  "company",
  "plan",
  "status",
  "amount",
  "joined",
];
const customer = (name, email, overrides = {}) => ({
  name,
  email,
  company: "Northstar",
  plan: "Pro",
  status: "active",
  amount: 249.5,
  joined: "2024-02-29",
  ...overrides,
});
function customerDocument(rows) {
  return parseCSV(
    serializeCSV(
      headings,
      rows.map((row) => headings.map((key) => row[key])),
    ),
  );
}
function customerPreview(rows, options = {}) {
  const document = customerDocument(rows);
  return previewCSVImport(
    document,
    customerImportFields,
    autoMapCSVHeaders(document.headers, customerImportFields),
    { getRowKey: getCustomerImportKey, ...options },
  );
}
function attempt(rows, options = {}) {
  return {
    rows,
    sources: rows.map((_, index) => ({
      rowNumber: index + 2,
      line: index + 2,
    })),
    mode: "skip",
    base: { created: 0, updated: 0, skipped: 0 },
    ...options,
  };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("CSV grammar and locations", () => {
  test("BOM, quoted commas, doubled quotes and multiline CRLF are lossless", () => {
    const csv =
      '\uFEFFname,note\r\n"A, One","He said ""go"""\r\nB,"first\r\nsecond"\r\n\r\nC,last';
    const document = parseCSV(csv);
    assert.deepEqual(document.headers, ["name", "note"]);
    assert.deepEqual(
      document.records.map((record) => record.values),
      [
        ["A, One", 'He said "go"'],
        ["B", "first\r\nsecond"],
        ["C", "last"],
      ],
    );
    assert.deepEqual(
      document.records.map(({ rowNumber, line }) => [rowNumber, line]),
      [
        [2, 2],
        [3, 3],
        [4, 6],
      ],
    );
    assert.equal(document.bytes, Buffer.byteLength(csv, "utf8"));
  });
  for (const [label, newline] of [
    ["LF", "\n"],
    ["CRLF", "\r\n"],
    ["CR", "\r"],
  ]) {
    test(`${label} records ignore blank lines and all-empty records`, () => {
      const document = parseCSV(
        `name,email${newline}${newline}Alex,a@example.test${newline},${newline}Bea,b@example.test${newline}`,
      );
      assert.deepEqual(
        document.records.map((record) => record.values[0]),
        ["Alex", "Bea"],
      );
      assert.deepEqual(
        document.records.map((record) => record.line),
        [3, 5],
      );
    });
  }
  test("empty quoted cells, trailing cells and final records without newline survive", () => {
    const document = parseCSV('name,note,last\nAlex,"",\nBea," a ",end');
    assert.deepEqual(
      document.records.map((record) => record.values),
      [
        ["Alex", "", ""],
        ["Bea", " a ", "end"],
      ],
    );
    assert.equal(parseCSV('name\n"Alex" \t').records[0].values[0], "Alex");
  });
  for (const [input, code] of [
    ['name\n"Alex', "unterminated_quote"],
    ['name\nAl"ex', "unexpected_quote"],
    ['name\n"Alex"x', "unexpected_character"],
    ['name\n"Alex" "again"', "unexpected_character"],
    ["name\nA\0lex", "invalid_character"],
  ]) {
    test(`rejects ${code} instead of guessing records`, () => {
      assert.throws(() => parseCSV(input), hasCode(code));
    });
  }
  test("locations describe physical lines after multiline values", () => {
    let error;
    try {
      parseCSV('name,note\nAlex,"first\nsecond"x');
    } catch (caught) {
      error = caught;
    }
    assert.equal(error.code, "unexpected_character");
    assert.equal(error.line, 3);
    assert.match(formatCSVError(error, "en"), /line 3/);
    assert.match(formatCSVError(error, "es"), /línea 3/);
  });
  test("empty files are rejected but a header-only document is inspectable", () => {
    assert.throws(() => parseCSV(" \r\n,\n\t"), hasCode("empty_file"));
    assert.equal(parseCSV("name,email\n").records.length, 0);
    assert.match(
      formatCSVError(new CSVImportError("no_records"), "es"),
      /no tiene registros/,
    );
  });
  test("wrong record widths remain available for row errors", () => {
    const document = parseCSV("name,email\nAlex\nBea,b@example.test,extra");
    const fields = [
      { key: "name", label: "Name", required: true },
      { key: "email", label: "Email" },
    ];
    const preview = previewCSVImport(document, fields, { name: 0, email: 1 });
    assert.equal(preview.summary.invalid, 2);
    assert.ok(
      preview.rows.every((row) =>
        row.issues.some(({ code }) => code === "column_count"),
      ),
    );
  });
});

describe("limits and safe headings", () => {
  test("default limits and undefined optional limits remain consistent", () => {
    assert.deepEqual(defaultCSVLimits, {
      maxBytes: 5 * 1024 * 1024,
      maxRows: 10_000,
      maxColumns: 200,
    });
    assert.deepEqual(
      resolveCSVLimits({ maxBytes: undefined, maxRows: undefined }),
      defaultCSVLimits,
    );
    assert.deepEqual(resolveCSVLimits({ maxRows: 7 }), {
      ...defaultCSVLimits,
      maxRows: 7,
    });
  });
  test("the full 5 MiB byte boundary is inclusive", () => {
    const csv = `name\n${"x".repeat(defaultCSVLimits.maxBytes - 5)}`;
    assert.equal(parseCSV(csv).bytes, defaultCSVLimits.maxBytes);
    assert.throws(() => parseCSV(`${csv}x`), hasCode("file_too_large"));
  });
  test("UTF-8 byte limits count BOM and multibyte characters", () => {
    assert.equal(parseCSV("\uFEFFa\né", { maxBytes: 7 }).bytes, 7);
    assert.throws(
      () => parseCSV("\uFEFFa\né", { maxBytes: 6 }),
      hasCode("file_too_large"),
    );
    assert.equal(parseCSV("a\n💡", { maxBytes: 6 }).bytes, 6);
    assert.throws(
      () => parseCSV("a\n💡", { maxBytes: 5 }),
      hasCode("file_too_large"),
    );
  });
  test("the full 10,000 row boundary excludes the header and blanks", () => {
    const csv = `name\n\n${Array.from({ length: 10_000 }, (_, index) => `record-${index}`).join("\n")}\n\n`;
    assert.equal(parseCSV(csv).records.length, 10_000);
    assert.throws(() => parseCSV(`${csv}extra`), hasCode("too_many_rows"));
  });
  test("quoted physical newlines do not consume the data record limit", () => {
    assert.equal(
      parseCSV('name\n"first\nsecond\nthird"\n\n', { maxRows: 1 }).records
        .length,
      1,
    );
    assert.throws(
      () => parseCSV("name\nAlex\n\nBea", { maxRows: 1 }),
      hasCode("too_many_rows"),
    );
  });
  test("column limits apply to header and data, not quoted commas", () => {
    const columns = Array.from(
      { length: 200 },
      (_, index) => `column-${index}`,
    );
    assert.equal(
      parseCSV(`${columns.join(",")}\n${columns.join(",")}`).headers.length,
      200,
    );
    assert.throws(
      () => parseCSV(`${columns.join(",")},extra\nvalue`),
      hasCode("too_many_columns"),
    );
    assert.throws(
      () => parseCSV("a,b\n1,2,3", { maxColumns: 2 }),
      hasCode("too_many_columns"),
    );
    assert.equal(
      parseCSV('a\n"one,two,three"', { maxColumns: 1 }).records[0].values
        .length,
      1,
    );
  });
  for (const value of [
    0,
    -1,
    1.5,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
    null,
  ]) {
    test(`invalid limits reject ${String(value)}`, () => {
      for (const key of ["maxBytes", "maxRows", "maxColumns"])
        assert.throws(
          () => parseCSV("name\nAlex", { [key]: value }),
          hasCode("invalid_limits"),
        );
    });
  }
  test("blank, trimmed duplicate, case duplicate and NFKC duplicate headings fail", () => {
    assert.throws(
      () => parseCSV("name,,email\nAlex,x,y"),
      hasCode("blank_header"),
    );
    for (const heading of ["Name, name ", "Email,EMAIL", "ｅmail,email"])
      assert.throws(
        () => parseCSV(`${heading}\na,b`),
        hasCode("duplicate_header"),
      );
  });
  test("prototype keys are rejected as headings or fields, but allowed as cell data", () => {
    const before = Object.getOwnPropertyNames(Object.prototype);
    for (const key of [
      "__proto__",
      "constructor",
      "prototype",
      "toString",
      "hasOwnProperty",
      "__defineGetter__",
    ]) {
      assert.throws(
        () => parseCSV(`${key},value\nx,y`),
        hasCode("unsafe_header"),
      );
      assert.throws(
        () => autoMapCSVHeaders(["name"], [{ key, label: "Name" }]),
        hasCode("unsafe_field"),
      );
    }
    assert.throws(
      () =>
        validateCSVMapping(
          ["name"],
          [{ key: "name", label: "Name" }],
          JSON.parse('{"__proto__":0}'),
        ),
      hasCode("unsafe_field"),
    );
    assert.equal(
      parseCSV("name\nconstructor").records[0].values[0],
      "constructor",
    );
    assert.deepEqual(Object.getOwnPropertyNames(Object.prototype), before);
  });
});

describe("mapping and validation", () => {
  test("reordered EN/ES headings and aliases map by index", () => {
    const names = [
      "Correo electrónico",
      "Nombre completo",
      "Empresa",
      "Plan",
      "Estado",
      "Monto",
      "Fecha",
    ];
    const mapping = autoMapCSVHeaders(names, customerImportFields);
    assert.deepEqual(mapping, {
      name: 1,
      email: 0,
      company: 2,
      plan: 3,
      status: 4,
      amount: 5,
      joined: 6,
    });
    assert.equal(
      validateCSVMapping(names, customerImportFields, mapping).length,
      0,
    );
  });
  test("ambiguous aliases and columns shared across fields are not guessed", () => {
    assert.deepEqual(
      autoMapCSVHeaders(
        ["Full Name", "full_name"],
        [{ key: "name", label: "Name", aliases: ["full name"] }],
      ),
      { name: null },
    );
    const fields = [
      { key: "first", label: "First", aliases: ["name"] },
      { key: "second", label: "Second", aliases: ["name"] },
    ];
    assert.deepEqual(autoMapCSVHeaders(["name"], fields), {
      first: 0,
      second: null,
    });
    assert.ok(
      validateCSVMapping(["name"], fields, { first: 0, second: 0 }).some(
        ({ code }) => code === "duplicate_mapping",
      ),
    );
  });
  test("missing, fractional, negative and out-of-range mappings never import rows", () => {
    const document = customerDocument([customer("Alex", "alex@example.test")]);
    const mapping = autoMapCSVHeaders(document.headers, customerImportFields);
    assert.ok(
      validateCSVMapping(document.headers, customerImportFields, {
        ...mapping,
        email: null,
      }).some(({ code }) => code === "missing_mapping"),
    );
    for (const index of [-1, 1.5, NaN, 999]) {
      const preview = previewCSVImport(document, customerImportFields, {
        ...mapping,
        email: index,
      });
      assert.equal(preview.summary.ready, 0);
      assert.ok(
        preview.mappingIssues.some(({ code }) => code === "invalid_mapping"),
      );
    }
  });
  test("optional unmapped fields use defaults, while zero values remain valid", () => {
    const document = parseCSV(
      "name,email,plan,status,amount,joined\nAlex,alex@example.test,Pro,active,0,2024-02-29",
    );
    const preview = previewCSVImport(
      document,
      customerImportFields,
      autoMapCSVHeaders(document.headers, customerImportFields),
    );
    assert.equal(preview.readyRows[0].company, "");
    assert.equal(preview.readyRows[0].amount, 0);
  });
  test("duplicate schema fields are rejected", () => {
    assert.throws(
      () =>
        autoMapCSVHeaders(
          ["name"],
          [
            { key: "name", label: "Name" },
            { key: "name", label: "Other" },
          ],
        ),
      hasCode("duplicate_field"),
    );
  });
  test("custom parsers and localized cross-field validators receive complete rows", () => {
    const fields = [
      { key: "code", label: "Code", required: true },
      {
        key: "quantity",
        label: "Quantity",
        required: true,
        parse: (raw) => {
          if (!/^\d+$/.test(raw)) throw new Error("Use a whole number");
          return Number(raw);
        },
        validate: (value) =>
          value === 0
            ? [{ en: "Choose a quantity", es: "Elige una cantidad" }]
            : undefined,
      },
    ];
    const document = parseCSV("code,quantity\nAA,2\nBB,0\nCC,no\nDD,4");
    Object.freeze(document.headers);
    document.records.forEach((record) => {
      Object.freeze(record.values);
      Object.freeze(record);
    });
    Object.freeze(document.records);
    Object.freeze(document);
    const preview = previewCSVImport(
      document,
      fields,
      { code: 0, quantity: 1 },
      {
        locale: "es",
        validateRow: ({ code, quantity }, context) =>
          code === "DD" && quantity === 4
            ? {
                en: `Unsupported row ${context.rowNumber}`,
                es: `Fila no admitida ${context.rowNumber}`,
              }
            : undefined,
      },
    );
    assert.deepEqual(preview.readyRows, [{ code: "AA", quantity: 2 }]);
    assert.equal(preview.rows[1].issues[0].message, "Elige una cantidad");
    assert.equal(preview.rows[2].issues[0].code, "parse");
    assert.equal(preview.rows[3].issues[0].message, "Fila no admitida 5");
    assert.deepEqual(document.records[0].values, ["AA", "2"]);
  });
  test("sample CSV handles quotes, multiline fields and preserves numeric negatives", () => {
    const csv = serializeCSV(
      ["name", "amount"],
      [['A "quoted", name\nsecond line', -25]],
    );
    assert.deepEqual(parseCSV(csv).records[0].values, [
      'A "quoted", name\nsecond line',
      "-25",
    ]);
    const safe = parseCSV(
      serializeCSV(["text"], [["=SUM(A1:A2)"], [" @command"], ["-formula"]]),
    );
    assert.deepEqual(
      safe.records.map((record) => record.values[0]),
      ["'=SUM(A1:A2)", "' @command", "'-formula"],
    );
  });
});

describe("Customer compatibility and duplicate policies", () => {
  test("sample input has seven fields and no caller-owned id", () => {
    const document = parseCSV(createCSVSample(customerImportFields));
    const preview = previewCSVImport(
      document,
      customerImportFields,
      autoMapCSVHeaders(document.headers, customerImportFields),
    );
    assert.deepEqual(preview.readyRows[0], {
      name: "Alex Rivera",
      email: "alex@example.demo",
      company: "Northstar",
      plan: "Pro",
      status: "active",
      amount: 249,
      joined: "2026-10-19",
    });
    assert.equal("id" in preview.readyRows[0], false);
    assert.ok(
      customerSchema.safeParse({
        ...preview.readyRows[0],
        id: "assigned-by-caller",
      }).success,
    );
  });
  test("name boundaries match foundation: one is invalid, 2 and 120 valid, 121 invalid", () => {
    const preview = customerPreview(
      [1, 2, 120, 121].map((length) =>
        customer("x".repeat(length), `${length}@example.test`),
      ),
    );
    assert.deepEqual(
      preview.rows.map((row) => row.action),
      ["invalid", "create", "create", "invalid"],
    );
    assert.ok(preview.rows[0].issues.some(({ field }) => field === "name"));
    for (const row of preview.readyRows)
      assert.ok(
        customerSchema.safeParse({ ...row, id: "assigned-by-caller" }).success,
      );
  });
  test("email format matches foundation and preserves spelling while keys normalize", () => {
    const emails = [
      "Mixed.Case+tag@Example.Test",
      "bad..dots@example.test",
      ".leading@example.test",
      "a@_domain.test",
      "a@example.c",
      "a b@example.test",
      "a@@example.test",
    ];
    const preview = customerPreview(
      emails.map((email, index) => customer(`Customer ${index}`, email)),
    );
    assert.equal(preview.summary.ready, 1);
    assert.equal(preview.readyRows[0].email, emails[0]);
    assert.equal(
      getCustomerImportKey(preview.readyRows[0]),
      "mixed.case+tag@example.test",
    );
    for (const row of preview.rows) {
      const domainValid = customerSchema.safeParse({
        ...row.data,
        id: "assigned-by-caller",
      }).success;
      assert.equal(row.action === "create", domainValid);
    }
  });
  test("plans and statuses canonicalize the current supported values", () => {
    const preview = customerPreview([
      customer("Starter user", "starter@example.test", {
        plan: "starter",
        status: "ACTIVE",
      }),
      customer("Pro user", "pro@example.test", {
        plan: "pro",
        status: "Trial",
      }),
      customer("Enterprise user", "enterprise@example.test", {
        plan: "ENTERPRISE",
        status: "paused",
      }),
    ]);
    assert.deepEqual(
      preview.readyRows.map(({ plan, status }) => [plan, status]),
      [
        ["Starter", "active"],
        ["Pro", "trial"],
        ["Enterprise", "paused"],
      ],
    );
  });
  test("invalid choices, amounts and dates are row errors, not commit failures", () => {
    const rows = [
      customer("Wrong plan", "plan@example.test", { plan: "Premium" }),
      customer("Wrong status", "status@example.test", { status: "disabled" }),
      customer("Negative", "negative@example.test", { amount: -1 }),
      customer("NaN amount", "nan@example.test", { amount: "NaN" }),
      customer("Infinite", "infinity@example.test", { amount: "Infinity" }),
      customer("Too large", "large@example.test", {
        amount: "9007199254740992",
      }),
      customer("Invalid leap", "date@example.test", { joined: "2023-02-29" }),
      customer("Invalid day", "day@example.test", { joined: "2024-02-30" }),
    ];
    const preview = customerPreview(rows, { locale: "es" });
    assert.equal(preview.summary.ready, 0);
    assert.equal(preview.summary.invalid, rows.length);
    assert.ok(preview.rows.every((row) => row.issues.length > 0));
  });
  const duplicateRows = [
    customer("Existing first", "EXISTING@example.test"),
    customer("New first", "new@example.test"),
    customer("New last", "NEW@example.test"),
    customer("Invalid later", "new@example.test", { amount: "NaN" }),
    customer("Existing last", "existing@example.test"),
  ];
  test("skip keeps first valid CSV row and leaves existing keys untouched", () => {
    const keys = new Set(["existing@example.test"]);
    const preview = customerPreview(duplicateRows, {
      mode: "skip",
      existingKeys: keys,
    });
    assert.deepEqual(
      preview.readyRows.map((row) => row.name),
      ["New first"],
    );
    assert.deepEqual(preview.summary, {
      total: 5,
      valid: 4,
      invalid: 1,
      duplicates: 3,
      skipped: 3,
      created: 1,
      updated: 0,
      ready: 1,
    });
    assert.deepEqual([...keys], ["existing@example.test"]);
  });
  test("update keeps last valid CSV row, preserving sources and existing classification", () => {
    const preview = customerPreview(duplicateRows, {
      mode: "update",
      existingKeys: ["existing@example.test"],
    });
    assert.deepEqual(
      preview.readyRows.map((row) => row.name),
      ["New last", "Existing last"],
    );
    assert.deepEqual(
      preview.rows.map((row) => row.action),
      ["skip", "skip", "create", "invalid", "update"],
    );
    assert.deepEqual(preview.summary, {
      total: 5,
      valid: 4,
      invalid: 1,
      duplicates: 3,
      skipped: 2,
      created: 1,
      updated: 1,
      ready: 2,
    });
    assert.equal(preview.rows[1].duplicate.rowNumber, 4);
  });
  test("invalid rows do not claim a key before a later valid occurrence", () => {
    const preview = customerPreview([
      customer("Invalid first", "same@example.test", { amount: "NaN" }),
      customer("Valid later", "same@example.test"),
    ]);
    assert.deepEqual(
      preview.readyRows.map((row) => row.name),
      ["Valid later"],
    );
    assert.equal(preview.summary.duplicates, 0);
  });
  test("key callbacks reject wrong types, blanks and nonfinite values; zero is valid", () => {
    const document = parseCSV("code\nAA");
    const fields = [{ key: "code", label: "Code", required: true }];
    for (const key of [null, undefined, " ", Infinity, NaN, {}, true]) {
      const preview = previewCSVImport(
        document,
        fields,
        { code: 0 },
        { getRowKey: () => key },
      );
      assert.equal(preview.summary.invalid, 1);
      assert.equal(preview.rows[0].issues[0].code, "invalid_key");
    }
    const preview = previewCSVImport(
      document,
      fields,
      { code: 0 },
      { getRowKey: () => 0, existingKeys: new Set([0]), mode: "update" },
    );
    assert.equal(preview.rows[0].key, "0");
    assert.equal(preview.rows[0].action, "update");
  });
});

describe("result and asynchronous transaction/retry contract", () => {
  test("results require exact nonnegative integer totals and clone failure identities", () => {
    const input = {
      created: 1,
      updated: 1,
      skipped: 0,
      failed: 1,
      failures: [{ index: 2, message: "Try again" }],
    };
    const verified = validateImportResult(input, 3);
    assert.deepEqual(verified, input);
    assert.notEqual(verified.failures, input.failures);
    assert.notEqual(verified.failures[0], input.failures[0]);
    for (const invalid of [
      { created: 1, updated: 0, skipped: 0, failed: 1 },
      { created: -1, updated: 3, skipped: 0, failed: 1 },
      { created: 1.5, updated: 0.5, skipped: 0, failed: 1 },
      { created: Infinity, updated: 0, skipped: 0, failed: 1 },
      { ...input, failures: null },
      { ...input, failures: [null] },
      { ...input, failures: [{ index: 3, message: "Out of range" }] },
      { ...input, failures: [{ index: 1.5, message: "Fraction" }] },
      { ...input, failures: [] },
      {
        ...input,
        failed: 2,
        updated: 0,
        failures: [
          { index: 2, message: "One" },
          { index: 2, message: "Same" },
        ],
      },
    ])
      assert.throws(
        () => validateImportResult(invalid, 3),
        hasCode("invalid_result"),
      );
    assert.throws(
      () => validateImportResult(input, -1),
      hasCode("invalid_result"),
    );
  });
  test("real callback progress is forwarded only while an attempt is pending", async () => {
    const progress = [];
    let publish;
    const first = attempt([{ code: "AA" }, { code: "BB" }], {
      mode: "update",
      base: { created: 0, updated: 0, skipped: 2 },
    });
    const outcome = await executeImportAttempt(
      first,
      async (rows, context) => {
        assert.equal(context.mode, "update");
        assert.equal(context.signal.aborted, false);
        publish = context.onProgress;
        context.onProgress({
          completed: 1,
          total: rows.length,
          message: "One prepared",
        });
        await Promise.resolve();
        context.onProgress({ completed: 2, total: rows.length });
        return { created: 1, updated: 1, skipped: 0, failed: 0 };
      },
      {
        signal: new AbortController().signal,
        onProgress: (value) => progress.push(value),
      },
    );
    assert.equal(outcome.status, "complete");
    assert.deepEqual(outcome.result, {
      created: 1,
      updated: 1,
      skipped: 2,
      failed: 0,
    });
    assert.equal(outcome.retry, null);
    assert.equal(progress.length, 2);
    publish({ completed: 999 });
    assert.equal(progress.length, 2);
  });
  test("pre-aborted attempts never invoke the data callback", async () => {
    const controller = new AbortController();
    controller.abort();
    let called = false;
    const input = attempt([{ code: "AA" }]);
    const outcome = await executeImportAttempt(
      input,
      async () => {
        called = true;
        throw new Error("Should not run");
      },
      { signal: controller.signal },
    );
    assert.equal(called, false);
    assert.equal(outcome.status, "cancelled");
    assert.equal(outcome.retry, input);
  });
  test("cancellation remains pending until the caller has rolled back", async () => {
    const controller = new AbortController();
    const entered = deferred();
    const rollback = deferred();
    const original = [{ code: "existing" }];
    let store = original.map((row) => ({ ...row }));
    let settled = false;
    const progress = [];
    const pending = executeImportAttempt(
      attempt([{ code: "AA" }]),
      async (rows, context) => {
        const snapshot = store;
        store = [...store, ...rows];
        entered.resolve();
        await new Promise((resolve) =>
          context.signal.addEventListener("abort", resolve, { once: true }),
        );
        context.onProgress({ completed: 1 });
        await rollback.promise;
        store = snapshot;
        throw context.signal.reason;
      },
      {
        signal: controller.signal,
        onProgress: (value) => progress.push(value),
      },
    );
    void pending.then(() => {
      settled = true;
    });
    await entered.promise;
    controller.abort();
    await Promise.resolve();
    assert.equal(settled, false);
    assert.equal(store.length, 2);
    rollback.resolve();
    const outcome = await pending;
    assert.equal(outcome.status, "cancelled");
    assert.deepEqual(store, original);
    assert.deepEqual(progress, []);
    assert.deepEqual(outcome.retry.rows, [{ code: "AA" }]);
  });
  test("a rejected callback can retry the same staged batch after rollback", async () => {
    let store = [];
    const input = attempt([{ code: "AA" }, { code: "BB" }]);
    const first = await executeImportAttempt(
      input,
      async (rows) => {
        const previous = store;
        store = [...store, ...rows];
        store = previous;
        throw new Error("Temporary failure");
      },
      { signal: new AbortController().signal },
    );
    assert.equal(first.status, "error");
    assert.deepEqual(store, []);
    const second = await executeImportAttempt(
      first.retry,
      async (rows) => {
        store = [...store, ...rows];
        return { created: rows.length, updated: 0, skipped: 0, failed: 0 };
      },
      { signal: new AbortController().signal },
    );
    assert.equal(second.status, "complete");
    assert.deepEqual(store, input.rows);
  });
  test("multiple partial retries submit only failed identities and accumulate totals once", async () => {
    const input = attempt([{ code: "AA" }, { code: "BB" }, { code: "CC" }], {
      mode: "update",
      base: { created: 0, updated: 0, skipped: 2 },
      sources: [
        { rowNumber: 2, line: 2 },
        { rowNumber: 4, line: 6 },
        { rowNumber: 8, line: 12 },
      ],
    });
    const calls = [];
    const first = await executeImportAttempt(
      input,
      async (rows) => {
        calls.push(rows.map((row) => row.code));
        return {
          created: 1,
          updated: 0,
          skipped: 0,
          failed: 2,
          failures: [
            { index: 1, message: "BB failed" },
            { index: 2, message: "CC failed" },
          ],
        };
      },
      { signal: new AbortController().signal },
    );
    assert.deepEqual(
      first.failures.map(({ rowNumber, line }) => [rowNumber, line]),
      [
        [4, 6],
        [8, 12],
      ],
    );
    const second = await executeImportAttempt(
      first.retry,
      async (rows) => {
        calls.push(rows.map((row) => row.code));
        return {
          created: 0,
          updated: 1,
          skipped: 0,
          failed: 1,
          failures: [{ index: 1, message: "Still failed" }],
        };
      },
      { signal: new AbortController().signal },
    );
    const third = await executeImportAttempt(
      second.retry,
      async (rows) => {
        calls.push(rows.map((row) => row.code));
        return { created: 0, updated: 0, skipped: 1, failed: 0 };
      },
      { signal: new AbortController().signal },
    );
    assert.deepEqual(calls, [["AA", "BB", "CC"], ["BB", "CC"], ["CC"]]);
    assert.deepEqual(third.result, {
      created: 1,
      updated: 1,
      skipped: 3,
      failed: 0,
    });
    assert.equal(third.status, "complete");
    assert.equal(third.retry, null);
    assert.deepEqual(input.base, { created: 0, updated: 0, skipped: 2 });
  });
  test("partial failures without row identities cannot replay committed successes", async () => {
    const outcome = await executeImportAttempt(
      attempt([{ code: "AA" }, { code: "BB" }]),
      async () => ({
        created: 1,
        updated: 0,
        skipped: 0,
        failed: 1,
      }),
      { signal: new AbortController().signal },
    );
    assert.equal(outcome.status, "partial");
    assert.equal(outcome.retry, null);
    assert.deepEqual(outcome.failures, []);
  });
  test("resolving after abort is unverified, with no automatic retry", async () => {
    const controller = new AbortController();
    const outcome = await executeImportAttempt(
      attempt([{ code: "AA" }]),
      async () => {
        controller.abort();
        return { created: 1, updated: 0, skipped: 0, failed: 0 };
      },
      { signal: controller.signal },
    );
    assert.equal(outcome.status, "unverified");
    assert.equal(outcome.result, null);
    assert.equal(outcome.retry, null);
  });
  test("malformed resolved counts and failure indexes are never retryable success", async () => {
    for (const result of [
      { created: 99, updated: 0, skipped: 0, failed: 0 },
      {
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        failures: [{ index: 1, message: "Out of range" }],
      },
    ]) {
      const outcome = await executeImportAttempt(
        attempt([{ code: "AA" }]),
        async () => result,
        { signal: new AbortController().signal },
      );
      assert.equal(outcome.status, "unverified");
      assert.equal(outcome.retry, null);
    }
  });
  test("invalid attempt metadata and overflowing totals cannot invoke a commit", async () => {
    let calls = 0;
    for (const input of [
      attempt([{ code: "AA" }], { sources: [] }),
      attempt([{ code: "AA" }], {
        base: { created: -1, updated: 0, skipped: 0 },
      }),
      attempt([{ code: "AA" }], {
        base: { created: Number.MAX_SAFE_INTEGER, updated: 0, skipped: 0 },
      }),
    ]) {
      const outcome = await executeImportAttempt(
        input,
        async () => {
          calls++;
          throw new Error("Unexpected commit");
        },
        { signal: new AbortController().signal },
      );
      assert.equal(outcome.status, "unverified");
      assert.equal(outcome.retry, null);
    }
    assert.equal(calls, 0);
  });
});
