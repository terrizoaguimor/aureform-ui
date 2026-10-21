import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Load the actual TypeScript domain under Node's native type stripping, using
// the same extensionless relative imports consumed by the Next.js application.
const resolver = registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (
        error.code === "ERR_MODULE_NOT_FOUND" &&
        specifier.startsWith(".") &&
        !/\.[a-z]+$/i.test(specifier)
      )
        return next(`${specifier}.ts`, context);
      throw error;
    }
  },
});
let createDemoCommunicationsAdapter,
  COMMUNICATIONS_NOTES_MAX_LENGTH,
  COMMUNICATIONS_DTMF_MAX_LENGTH;
let createDefaultBusinessHoursSchedule,
  validateBusinessHoursSchedule,
  evaluateBusinessHours,
  isBusinessHoursOpen;
let createCommunicationsDemoHistory;
try {
  ({
    createDemoCommunicationsAdapter,
    COMMUNICATIONS_NOTES_MAX_LENGTH,
    COMMUNICATIONS_DTMF_MAX_LENGTH,
  } = await import("../src/lib/communications/demo-adapter.ts"));
  ({
    createDefaultBusinessHoursSchedule,
    validateBusinessHoursSchedule,
    evaluateBusinessHours,
    isBusinessHoursOpen,
  } = await import("../src/lib/communications/business-hours.ts"));
  ({ createCommunicationsDemoHistory } =
    await import("../src/lib/communications/fixtures.ts"));
} finally {
  resolver.deregister();
}

const mondayMorning = Date.parse("2026-10-19T14:00:00Z");
const local = (t, options = {}) => {
  const adapter = createDemoCommunicationsAdapter({
    now: () => mondayMorning,
    ...options,
  });
  t.after(() => adapter.dispose());
  return adapter;
};
const expectError = (operation, code) =>
  assert.rejects(operation, { name: "CommunicationsError", code });
const terminalCount = (adapter, id) =>
  adapter.getSnapshot().history.filter((call) => call.id === id).length;
const offer = async (adapter, options) => {
  await adapter.simulateIncoming(options);
  return adapter.getSnapshot().activeCall?.id;
};

test("Bogotá business-hour boundaries are local, inclusive on opening and exclusive on closing", () => {
  const schedule = createDefaultBusinessHoursSchedule();
  for (const [instant, expected] of [
    ["2026-10-19T12:59:59Z", false],
    ["2026-10-19T13:00:00Z", true],
    ["2026-10-19T22:59:59Z", true],
    ["2026-10-19T23:00:00Z", false],
    ["2026-10-24T14:00:00Z", false],
    ["2026-10-25T14:00:00Z", false],
  ])
    assert.equal(
      isBusinessHoursOpen(schedule, new Date(instant)),
      expected,
      instant,
    );
  assert.deepEqual(evaluateBusinessHours(schedule, mondayMorning), {
    isOpen: true,
    reason: "open",
    localDate: "2026-10-19",
    localTime: "09:00",
    weekday: 1,
  });
});

test("holiday overrides use the schedule's local date, not the UTC date or a country assumption", () => {
  const schedule = {
    timezone: "America/Bogota",
    weekly: [{ day: 1, start: "00:00", end: "24:00" }],
    holidays: [{ date: "2026-10-20", label: "Explicit laboratory closure" }],
  };
  assert.equal(
    evaluateBusinessHours(schedule, Date.parse("2026-10-20T02:00:00Z")).reason,
    "open",
  );
  assert.equal(
    evaluateBusinessHours(schedule, Date.parse("2026-10-20T05:00:00Z")).reason,
    "holiday",
  );
  assert.deepEqual(createDefaultBusinessHoursSchedule().holidays, []);
});

test("timezone conversion handles daylight-saving gaps and repeated local hours", () => {
  const schedule = {
    timezone: "America/New_York",
    weekly: [{ day: 0, start: "01:30", end: "03:30" }],
    holidays: [],
  };
  for (const [instant, time, expected] of [
    ["2026-03-08T06:59:00Z", "01:59", true],
    ["2026-03-08T07:00:00Z", "03:00", true],
    ["2026-03-08T07:30:00Z", "03:30", false],
    ["2026-11-01T05:30:00Z", "01:30", true],
    ["2026-11-01T06:30:00Z", "01:30", true],
    ["2026-11-01T08:30:00Z", "03:30", false],
  ]) {
    const actual = evaluateBusinessHours(schedule, Date.parse(instant));
    assert.equal(actual.localTime, time);
    assert.equal(actual.isOpen, expected);
  }
});

test("overnight hours cross the week boundary while the next day's holiday closes carry-over", () => {
  const schedule = {
    timezone: "America/Bogota",
    weekly: [{ day: 6, start: "22:00", end: "02:00" }],
    holidays: [],
  };
  assert.equal(
    isBusinessHoursOpen(schedule, Date.parse("2026-10-25T03:00:00Z")),
    true,
  );
  assert.equal(
    isBusinessHoursOpen(schedule, Date.parse("2026-10-25T06:59:59Z")),
    true,
  );
  assert.equal(
    isBusinessHoursOpen(schedule, Date.parse("2026-10-25T07:00:00Z")),
    false,
  );
  schedule.holidays.push({ date: "2026-10-25" });
  assert.equal(
    evaluateBusinessHours(schedule, Date.parse("2026-10-25T06:00:00Z")).reason,
    "holiday",
  );
});

test("malformed policies fail before routing and validated policies do not alias caller-owned objects", () => {
  const base = createDefaultBusinessHoursSchedule();
  const badPolicies = [
    { ...base, timezone: "Mars/Olympus" },
    { ...base, weekly: [{ day: 7, start: "08:00", end: "18:00" }] },
    { ...base, weekly: [{ day: 1, start: "8:00", end: "18:00" }] },
    { ...base, weekly: [{ day: 1, start: "24:00", end: "18:00" }] },
    { ...base, weekly: [{ day: 1, start: "08:00", end: "08:00" }] },
    {
      ...base,
      weekly: [
        { day: 6, start: "22:00", end: "02:00" },
        { day: 0, start: "01:00", end: "03:00" },
      ],
    },
    { ...base, holidays: [{ date: "2026-02-30" }] },
    { ...base, holidays: [{ date: "2026-10-19" }, { date: "2026-10-19" }] },
  ];
  for (const policy of badPolicies)
    assert.throws(() => validateBusinessHoursSchedule(policy), {
      code: "invalid-argument",
    });
  assert.throws(() => evaluateBusinessHours(base, new Date("invalid")), {
    code: "invalid-argument",
  });
  assert.throws(() => evaluateBusinessHours(base, Number.NaN), {
    code: "invalid-argument",
  });
  const copy = validateBusinessHoursSchedule(base);
  copy.weekly[0].start = "09:00";
  assert.equal(base.weekly[0].start, "08:00");
});

test("initial SSR fixtures are deterministic even when two renders have different wall clocks", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: mondayMorning });
  const first = createDemoCommunicationsAdapter();
  t.after(() => first.dispose());
  t.mock.timers.setTime(mondayMorning + 6 * 24 * 60 * 60 * 1000);
  const second = createDemoCommunicationsAdapter();
  t.after(() => second.dispose());
  assert.deepEqual(first.getSnapshot(), second.getSnapshot());
  assert.equal(first.getSnapshot().connection, "disconnected");
  assert.equal(first.getSnapshot().mode, "demo");
  assert.equal(first.getSnapshot().activeCall, null);
  assert.equal(first.getSnapshot().queue.length, 0);
  assert.equal(first.getSnapshot().audio.microphonePermission, "unknown");
  assert.equal(first.getSnapshot().history.length, 3);
  assert.deepEqual(
    createCommunicationsDemoHistory("telnyx"),
    createCommunicationsDemoHistory("telnyx"),
  );
});

test("snapshots are stable and deeply immutable, and exported accessors work unbound", async (t) => {
  let clockReads = 0;
  const adapter = local(t, {
    now: () => {
      clockReads++;
      return mondayMorning;
    },
  });
  const { getSnapshot, subscribe, connect } = adapter;
  const first = getSnapshot();
  const reads = clockReads;
  for (let index = 0; index < 10; index++) assert.equal(getSnapshot(), first);
  assert.equal(clockReads, reads);
  assert.throws(() => first.history.push(first.history[0]), TypeError);
  assert.throws(() => {
    first.businessHours.weekly[0].start = "00:00";
  }, TypeError);
  let emissions = 0;
  const off = subscribe(() => emissions++);
  await connect();
  assert.equal(emissions, 2);
  assert.notEqual(getSnapshot(), first);
  const ready = getSnapshot();
  await connect();
  await adapter.setPresence("available");
  assert.equal(getSnapshot(), ready);
  off();
});

for (const provider of ["twilio", "telnyx"]) {
  test(`${provider} local label: inbound → FIFO → single reservation → answer → history`, async (t) => {
    const adapter = local(t, { provider });
    await adapter.simulateIncoming();
    assert.equal(adapter.getSnapshot().activeCall, null);
    assert.equal(adapter.getSnapshot().queue[0].callerName, "Isabel Torres");
    assert.equal(adapter.getSnapshot().queue[0].company, "Inbound laboratory");
    assert.equal(adapter.getSnapshot().queue[0].providerCallId, undefined);
    const firstId = adapter.getSnapshot().queue[0].id;
    const connecting = adapter.connect();
    assert.equal(adapter.getSnapshot().connection, "connecting");
    await connecting;
    assert.equal(adapter.getSnapshot().activeCall.id, firstId);
    assert.equal(adapter.getSnapshot().activeCall.status, "ringing");
    await adapter.simulateIncoming();
    await adapter.simulateIncoming();
    const nextIds = adapter.getSnapshot().queue.map((call) => call.id);
    const answering = adapter.accept(firstId);
    assert.equal(adapter.getSnapshot().activeCall.status, "connecting");
    await answering;
    assert.equal(adapter.getSnapshot().activeCall.status, "active");
    assert.equal(adapter.getSnapshot().activeCall.provider, provider);
    assert.equal(adapter.getSnapshot().activeCall.answeredAt, mondayMorning);
    await adapter.hangup(firstId);
    assert.equal(adapter.getSnapshot().history[0].status, "completed");
    assert.equal(adapter.getSnapshot().history[0].endReason, "agent-hangup");
    assert.equal(adapter.getSnapshot().activeCall.id, nextIds[0]);
    assert.deepEqual(
      adapter.getSnapshot().queue.map((call) => call.id),
      nextIds.slice(1),
    );
    assert.equal(adapter.getSnapshot().audio.microphonePermission, "unknown");
    assert.ok(
      adapter.getSnapshot().events.every((event) => event.source === "demo"),
    );
  });
}

test("presence and connectivity gate dispatch without treating agent presence as call status", async (t) => {
  const adapter = local(t);
  await adapter.setPresence("away");
  await adapter.connect();
  await adapter.simulateIncoming();
  await adapter.simulateIncoming();
  const [first, second] = adapter.getSnapshot().queue;
  assert.equal(adapter.getSnapshot().activeCall, null);
  await adapter.setPresence("available");
  assert.equal(adapter.getSnapshot().activeCall.id, first.id);
  await adapter.setPresence("offline");
  assert.equal(adapter.getSnapshot().activeCall, null);
  assert.deepEqual(
    adapter.getSnapshot().queue.map((call) => call.id),
    [first.id, second.id],
  );
  await adapter.setPresence("available");
  await adapter.accept(first.id);
  await adapter.setPresence("away");
  assert.equal(adapter.getSnapshot().activeCall.status, "active");
  await adapter.hangup(first.id);
  assert.equal(adapter.getSnapshot().activeCall, null);
  assert.equal(adapter.getSnapshot().queue[0].id, second.id);
  await adapter.setPresence("available");
  assert.equal(adapter.getSnapshot().activeCall.id, second.id);
});

test("closed and explicit holiday arrivals terminate locally without taking a queue slot", async (t) => {
  let now = Date.parse("2026-10-19T23:00:00Z");
  const adapter = local(t, { now: () => new Date(now) });
  await adapter.connect();
  await adapter.simulateIncoming();
  assert.equal(adapter.getSnapshot().businessHoursOpen, false);
  assert.equal(adapter.getSnapshot().history[0].endReason, "after-hours");
  assert.equal(adapter.getSnapshot().activeCall, null);
  now = mondayMorning;
  const schedule = createDefaultBusinessHoursSchedule();
  schedule.holidays = [{ date: "2026-10-19", label: "Explicit test override" }];
  await adapter.setSchedule(schedule);
  schedule.holidays[0].date = "2026-10-20";
  await adapter.simulateIncoming();
  assert.equal(adapter.getSnapshot().history[0].endReason, "holiday");
  assert.equal(adapter.getSnapshot().queue.length, 0);
  await adapter.simulateIncoming({ scenario: "open" });
  assert.equal(adapter.getSnapshot().activeCall.status, "ringing");
  assert.equal(adapter.getSnapshot().activeCall.demoScenario, "open");
  assert.equal(
    adapter.getSnapshot().businessHoursOpen,
    false,
    "test override must not falsify the configured calendar",
  );
});

test("admitted callers keep their FIFO place when business hours close", async (t) => {
  let now = mondayMorning;
  const adapter = local(t, { now: () => now });
  await adapter.connect();
  const first = await offer(adapter);
  await adapter.accept(first);
  await adapter.simulateIncoming();
  const second = adapter.getSnapshot().queue[0].id;
  now = Date.parse("2026-10-19T23:00:00Z");
  await adapter.simulateIncoming();
  assert.equal(adapter.getSnapshot().history[0].endReason, "after-hours");
  await adapter.hangup(first);
  assert.equal(adapter.getSnapshot().activeCall.id, second);
  assert.equal(adapter.getSnapshot().businessHoursOpen, false);
});

test("queue capacity includes unanswered offers and overflow cannot disturb an active reservation", async (t) => {
  const adapter = local(t, { maxQueueSize: 2 });
  await adapter.connect();
  const first = await offer(adapter);
  await adapter.simulateIncoming();
  const second = adapter.getSnapshot().queue[0].id;
  await adapter.simulateIncoming();
  assert.equal(adapter.getSnapshot().history[0].endReason, "queue-overflow");
  assert.equal(adapter.getSnapshot().activeCall.id, first);
  assert.equal(adapter.getSnapshot().queue.length, 1);
  await adapter.setPresence("away");
  assert.equal(adapter.getSnapshot().queue.length, 2);
  await adapter.simulateIncoming({ scenario: "overflow" });
  assert.deepEqual(
    adapter.getSnapshot().queue.map((call) => call.id),
    [first, second],
  );
  await adapter.setPresence("available");
  await adapter.accept(first);
  await adapter.simulateIncoming();
  assert.equal(
    adapter.getSnapshot().queue.length,
    2,
    "answered call frees an admission slot, not the single agent reservation",
  );
  assert.equal(adapter.getSnapshot().activeCall.id, first);
});

test("a declined offer is missed once and the next FIFO offer is dispatched", async (t) => {
  const adapter = local(t);
  await adapter.connect();
  const first = await offer(adapter);
  await adapter.simulateIncoming();
  const second = adapter.getSnapshot().queue[0].id;
  await adapter.decline(first);
  const afterDecline = adapter.getSnapshot();
  assert.equal(afterDecline.history[0].status, "missed");
  assert.equal(afterDecline.history[0].endReason, "declined");
  assert.equal(afterDecline.activeCall.id, second);
  await Promise.all([
    adapter.decline(first),
    adapter.hangup(first),
    adapter.hangup(first),
  ]);
  assert.equal(adapter.getSnapshot(), afterDecline);
  assert.equal(terminalCount(adapter, first), 1);
});

test("ring timeout has a clear missed outcome and starts the next caller's own timer", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: mondayMorning });
  const adapter = local(t, { now: Date.now, ringTimeoutMs: 1000 });
  await adapter.connect();
  const first = await offer(adapter);
  await adapter.simulateIncoming();
  const second = adapter.getSnapshot().queue[0].id;
  t.mock.timers.tick(1000);
  assert.equal(adapter.getSnapshot().history[0].id, first);
  assert.equal(adapter.getSnapshot().history[0].endReason, "ring-timeout");
  assert.equal(adapter.getSnapshot().activeCall.id, second);
  t.mock.timers.tick(999);
  assert.equal(adapter.getSnapshot().activeCall.id, second);
  await adapter.accept(second);
  t.mock.timers.tick(50_000);
  assert.equal(adapter.getSnapshot().activeCall.status, "active");
  assert.equal(terminalCount(adapter, second), 0);
});

test("concurrent arrivals and duplicate answers never allocate two browser calls", async (t) => {
  const adapter = local(t);
  await Promise.all([adapter.connect(), adapter.connect()]);
  await Promise.all(
    Array.from({ length: 8 }, () => adapter.simulateIncoming()),
  );
  const snapshot = adapter.getSnapshot();
  assert.equal(snapshot.activeCall.status, "ringing");
  assert.equal(snapshot.queue.length, 4);
  assert.equal(
    snapshot.history.filter((call) => call.endReason === "queue-overflow")
      .length,
    3,
  );
  const ids = [
    snapshot.activeCall.id,
    ...snapshot.queue.map((call) => call.id),
  ];
  assert.equal(new Set(ids).size, 5);
  await Promise.all([adapter.accept(ids[0]), adapter.accept(ids[0])]);
  assert.equal(adapter.getSnapshot().activeCall.status, "active");
  assert.equal(
    adapter.getSnapshot().events.filter((event) => event.type === "call.active")
      .length,
    1,
  );
  await expectError(() => adapter.accept(ids[1]), "invalid-transition");
  assert.equal(adapter.getSnapshot().activeCall.id, ids[0]);
});

test("invalid transitions reject without replacing the current snapshot or swallowing errors", async (t) => {
  const adapter = local(t);
  await expectError(() => adapter.accept("unknown"), "disconnected");
  await adapter.connect();
  await expectError(() => adapter.accept("unknown"), "not-found");
  const id = await offer(adapter);
  const before = adapter.getSnapshot();
  await expectError(() => adapter.setMuted(id, true), "invalid-transition");
  await expectError(() => adapter.setHeld(id, true), "invalid-transition");
  await expectError(() => adapter.sendDtmf(id, "1"), "invalid-transition");
  await expectError(() => adapter.setPresence("busy"), "invalid-argument");
  assert.equal(adapter.getSnapshot(), before);
  await adapter.accept(id);
  await expectError(() => adapter.decline(id), "invalid-transition");
  await expectError(() => adapter.hangup("unknown"), "not-found");
  await adapter.simulateIncoming();
  const queued = adapter.getSnapshot().queue[0].id;
  await expectError(() => adapter.hangup(queued), "invalid-transition");
});

test("signaling loss preserves the active session, controls, notes and queued callers through recovery", async (t) => {
  const adapter = local(t);
  await adapter.connect();
  const id = await offer(adapter);
  await adapter.accept(id);
  await adapter.setMuted(id, true);
  await adapter.setHeld(id, true);
  await adapter.setNotes(id, "Keep this local context through reconnect.");
  await adapter.simulateIncoming();
  const queued = adapter.getSnapshot().queue[0].id;
  const active = adapter.getSnapshot().activeCall;
  await adapter.simulateDisconnect();
  assert.equal(adapter.getSnapshot().connection, "reconnecting");
  assert.equal(adapter.getSnapshot().activeCall, active);
  assert.match(adapter.getSnapshot().error, /Reconnect/);
  await expectError(() => adapter.setHeld(id, false), "disconnected");
  await adapter.connect();
  assert.equal(adapter.getSnapshot().activeCall, active);
  assert.equal(adapter.getSnapshot().activeCall.id, id);
  assert.equal(adapter.getSnapshot().queue[0].id, queued);
  assert.equal(adapter.getSnapshot().error, null);
  await adapter.disconnect();
  assert.equal(adapter.getSnapshot().connection, "disconnected");
  assert.equal(adapter.getSnapshot().activeCall, active);
  await adapter.connect();
  await adapter.hangup(id);
  assert.equal(adapter.getSnapshot().activeCall.id, queued);
});

test("a disconnected ringing offer has no late timeout and is rearmed explicitly on recovery", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: mondayMorning });
  const adapter = local(t, { now: Date.now, ringTimeoutMs: 1000 });
  await adapter.connect();
  const id = await offer(adapter);
  t.mock.timers.tick(500);
  await adapter.simulateDisconnect();
  t.mock.timers.tick(5000);
  assert.equal(adapter.getSnapshot().activeCall.id, id);
  assert.equal(terminalCount(adapter, id), 0);
  await adapter.connect();
  t.mock.timers.tick(999);
  assert.equal(adapter.getSnapshot().activeCall.id, id);
  t.mock.timers.tick(1);
  assert.equal(adapter.getSnapshot().activeCall, null);
  assert.equal(terminalCount(adapter, id), 1);
});

test("disconnect during answer cannot resurrect a connecting or terminal call", async (t) => {
  const adapter = local(t);
  await adapter.connect();
  const id = await offer(adapter);
  const pending = adapter.accept(id);
  const rejection = expectError(() => pending, "cancelled");
  await adapter.simulateDisconnect();
  await rejection;
  assert.equal(adapter.getSnapshot().activeCall.status, "ringing");
  await adapter.connect();
  const nextAnswer = adapter.accept(id);
  const nextRejection = expectError(() => nextAnswer, "cancelled");
  await adapter.hangup(id);
  await nextRejection;
  assert.equal(adapter.getSnapshot().activeCall, null);
  assert.equal(terminalCount(adapter, id), 1);
  assert.equal(
    adapter.getSnapshot().history[0].endReason,
    "cancelled-before-answer",
  );
});

test("a rapid presence change cancels an old answer without cancelling the new offer's answer", async (t) => {
  const adapter = local(t);
  await adapter.connect();
  const id = await offer(adapter);
  const stale = adapter.accept(id);
  const rejection = expectError(() => stale, "cancelled");
  const away = adapter.setPresence("away");
  const available = adapter.setPresence("available");
  const current = adapter.accept(id);
  await Promise.all([away, available, current, rejection]);
  assert.equal(adapter.getSnapshot().activeCall.status, "active");
  assert.equal(
    adapter.getSnapshot().events.filter((event) => event.type === "call.active")
      .length,
    1,
  );
});

test("mute and hold are independent local controls and DTMF is validated, bounded and blocked on hold", async (t) => {
  const adapter = local(t);
  await adapter.connect();
  const id = await offer(adapter);
  await adapter.accept(id);
  await adapter.setMuted(id, true);
  await adapter.setHeld(id, true);
  assert.equal(adapter.getSnapshot().activeCall.status, "held");
  assert.equal(adapter.getSnapshot().activeCall.muted, true);
  await expectError(() => adapter.sendDtmf(id, "1"), "invalid-transition");
  await adapter.setHeld(id, false);
  assert.equal(adapter.getSnapshot().activeCall.muted, true);
  await adapter.setMuted(id, false);
  for (const digit of ["1", "*", "#"]) await adapter.sendDtmf(id, digit);
  assert.equal(adapter.getSnapshot().activeCall.dtmfDigits, "1*#");
  const before = adapter.getSnapshot();
  for (const digit of ["", "12", "A", "+", "\n"])
    await expectError(() => adapter.sendDtmf(id, digit), "invalid-argument");
  await expectError(() => adapter.setMuted(id, "true"), "invalid-argument");
  await expectError(() => adapter.setHeld(id, 1), "invalid-argument");
  assert.equal(adapter.getSnapshot(), before);
  for (let index = 0; index < 100; index++) await adapter.sendDtmf(id, "9");
  assert.equal(
    adapter.getSnapshot().activeCall.dtmfDigits.length,
    COMMUNICATIONS_DTMF_MAX_LENGTH,
  );
  assert.equal(adapter.getSnapshot().events.length, 100);
  assert.deepEqual(adapter.getSnapshot().caps, {
    hold: true,
    mute: true,
    dtmf: true,
  });
});

test("notes are bounded plain data and remain editable in waiting calls and completed history", async (t) => {
  const adapter = local(t);
  await adapter.simulateIncoming();
  const id = adapter.getSnapshot().queue[0].id;
  const text = "<script>plain text only</script>\nCustomer context";
  await adapter.setNotes(id, text);
  await adapter.connect();
  await adapter.accept(id);
  assert.equal(adapter.getSnapshot().activeCall.notes, text);
  await adapter.hangup(id);
  await adapter.setNotes(id, "Reviewed locally");
  assert.equal(adapter.getSnapshot().history[0].notes, "Reviewed locally");
  const before = adapter.getSnapshot();
  await expectError(
    () => adapter.setNotes(id, "x".repeat(COMMUNICATIONS_NOTES_MAX_LENGTH + 1)),
    "invalid-argument",
  );
  await expectError(() => adapter.setNotes("unknown", "text"), "not-found");
  assert.equal(adapter.getSnapshot(), before);
  assert.ok(
    adapter
      .getSnapshot()
      .events.every((event) => !event.detail?.includes(text)),
  );
});

test("subscriptions clean up independently, including duplicate functions and unsubscribe during notification", async (t) => {
  const adapter = local(t);
  let calls = 0;
  const listener = () => calls++;
  const offFirst = adapter.subscribe(listener);
  const offSecond = adapter.subscribe(listener);
  offFirst();
  offFirst();
  await adapter.connect();
  assert.equal(calls, 2);
  offSecond();
  await adapter.simulateIncoming();
  assert.equal(calls, 2);
  let removedCalled = false;
  let offRemoved;
  const offRemover = adapter.subscribe(() => offRemoved());
  offRemoved = adapter.subscribe(() => {
    removedCalled = true;
  });
  await adapter.setPresence("away");
  assert.equal(removedCalled, false);
  offRemover();
  await adapter.setPresence("available");
  assert.equal(removedCalled, false);
});

test("reset cancels old timers and pending connections and never reuses a live call ID", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: mondayMorning });
  const adapter = local(t, { now: Date.now, ringTimeoutMs: 1000 });
  const pending = adapter.connect();
  const rejection = expectError(() => pending, "cancelled");
  await adapter.reset();
  await rejection;
  assert.equal(adapter.getSnapshot().connection, "disconnected");
  await adapter.connect();
  const oldId = await offer(adapter);
  await adapter.reset();
  await adapter.connect();
  const newId = await offer(adapter);
  assert.notEqual(newId, oldId);
  assert.equal(adapter.getSnapshot().activeCall.callerName, "Isabel Torres");
  await adapter.hangup(oldId);
  assert.equal(adapter.getSnapshot().activeCall.id, newId);
  t.mock.timers.tick(1000);
  assert.equal(terminalCount(adapter, oldId), 0);
  assert.equal(terminalCount(adapter, newId), 1);
});

test("dispose cancels timers, rejects pending work and emits no late subscriber events", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: mondayMorning });
  const adapter = local(t, { now: Date.now, ringTimeoutMs: 1000 });
  let events = 0;
  adapter.subscribe(() => events++);
  await adapter.connect();
  const id = await offer(adapter);
  const answering = adapter.accept(id);
  const rejection = expectError(() => answering, "cancelled");
  adapter.dispose();
  adapter.dispose();
  const after = events;
  await rejection;
  t.mock.timers.tick(50_000);
  assert.equal(events, after);
  assert.equal(adapter.getSnapshot().connection, "disconnected");
  assert.equal(adapter.getSnapshot().activeCall, null);
  await expectError(() => adapter.connect(), "disposed");
  await expectError(() => adapter.reset(), "disposed");
  await expectError(() => adapter.simulateIncoming(), "disposed");
  const off = adapter.subscribe(() =>
    assert.fail("disposed adapter must not notify"),
  );
  off();
});

test("history eviction preserves idempotent terminal outcomes without unbounded call storage", async (t) => {
  const adapter = local(t);
  await adapter.connect();
  const first = await offer(adapter);
  await adapter.decline(first);
  for (let index = 0; index < 110; index++)
    await adapter.simulateIncoming({ scenario: "closed" });
  assert.equal(adapter.getSnapshot().history.length, 100);
  assert.equal(terminalCount(adapter, first), 0);
  const before = adapter.getSnapshot();
  await Promise.all([adapter.hangup(first), adapter.decline(first)]);
  assert.equal(adapter.getSnapshot(), before);
  assert.equal(adapter.getSnapshot().events.length, 100);
});

test("microphone updates only report explicit consumer results and never alter call admission", async (t) => {
  const adapter = local(t);
  await adapter.connect();
  assert.equal(adapter.getSnapshot().audio.microphonePermission, "unknown");
  await adapter.setMicrophonePermission("denied");
  assert.equal(adapter.getSnapshot().audio.microphonePermission, "denied");
  const id = await offer(adapter);
  await adapter.accept(id);
  assert.equal(
    adapter.getSnapshot().activeCall.status,
    "active",
    "the state-only demo does not need real microphone access",
  );
  await expectError(
    () => adapter.setMicrophonePermission("prompt"),
    "invalid-argument",
  );
});

test("invalid adapter options, inbound data and schedule changes fail before changing local state", async (t) => {
  for (const options of [
    { provider: "unknown" },
    { ringTimeoutMs: 0 },
    { ringTimeoutMs: Infinity },
    { maxQueueSize: 0 },
    { maxQueueSize: 1.5 },
    { now: () => new Date("invalid") },
  ])
    assert.throws(() => createDemoCommunicationsAdapter(options), {
      code: "invalid-argument",
    });
  const adapter = local(t);
  const before = adapter.getSnapshot();
  for (const request of [
    { scenario: "unknown" },
    { callerName: " " },
    { callerName: "x".repeat(81) },
    { callerName: "Name\nInjected" },
    { from: "911" },
    { from: "+0000000" },
  ])
    await expectError(
      () => adapter.simulateIncoming(request),
      "invalid-argument",
    );
  await expectError(
    () =>
      adapter.setSchedule({
        ...createDefaultBusinessHoursSchedule(),
        timezone: "invalid",
      }),
    "invalid-argument",
  );
  assert.equal(adapter.getSnapshot(), before);
});
