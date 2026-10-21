import {
  CommunicationsError,
  type CommunicationsCall,
  type CommunicationsEndReason,
  type CommunicationsEvent,
  type CommunicationsSnapshot,
  type DemoCommunicationsAdapter,
  type DemoCommunicationsAdapterOptions,
  type SimulateIncomingOptions,
} from "./contracts";
import {
  createDefaultBusinessHoursSchedule,
  evaluateBusinessHours,
  validateBusinessHoursSchedule,
} from "./business-hours";
import {
  COMMUNICATIONS_DEMO_INITIAL_INSTANT,
  communicationsDemoCallers,
  communicationsDemoNumber,
  createCommunicationsDemoHistory,
} from "./fixtures";

export const COMMUNICATIONS_DEMO_MAX_QUEUE_SIZE = 5;
export const COMMUNICATIONS_NOTES_MAX_LENGTH = 2000;
export const COMMUNICATIONS_DTMF_MAX_LENGTH = 64;
const historyLimit = 100;
const eventLimit = 100;
type LocalEvent = Omit<CommunicationsEvent, "id" | "source" | "at">;

function immutable<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) immutable(child);
    Object.freeze(value);
  }
  return value;
}

function invalid(message: string): never {
  throw new CommunicationsError("invalid-argument", message);
}

/**
 * One in-memory browser-agent reservation. No network, carrier SDK, media,
 * microphone prompt, storage or real outbound operation exists in this adapter.
 *
 * Arrival-time hours gate admission; already admitted callers remain eligible
 * after closing. Signaling loss retains the current session and pauses ringing.
 * Reconnecting explicitly rearms an unanswered offer's timeout. Provider choice
 * is a local label, never evidence of real Twilio/Telnyx compatibility.
 */
export function createDemoCommunicationsAdapter(
  options: DemoCommunicationsAdapterOptions = {},
): DemoCommunicationsAdapter {
  const provider = options.provider ?? "twilio";
  const ringTimeoutMs = options.ringTimeoutMs ?? 30_000;
  const maxQueueSize =
    options.maxQueueSize ?? COMMUNICATIONS_DEMO_MAX_QUEUE_SIZE;
  if (provider !== "twilio" && provider !== "telnyx")
    return invalid("Choose a known communications provider.");
  if (
    !Number.isFinite(ringTimeoutMs) ||
    ringTimeoutMs < 1 ||
    ringTimeoutMs > 300_000
  )
    return invalid("The local ring timeout must be between 1 and 300000 ms.");
  if (!Number.isInteger(maxQueueSize) || maxQueueSize < 1 || maxQueueSize > 100)
    return invalid("The local queue size must be between 1 and 100.");
  if (options.now !== undefined && typeof options.now !== "function")
    return invalid(
      "The demo clock must be a function returning a Date or timestamp.",
    );
  const clock = options.now ?? Date.now;
  const time = () => {
    const result = clock();
    const value = result instanceof Date ? result.getTime() : result;
    if (
      typeof value !== "number" ||
      !Number.isFinite(new Date(value).getTime())
    )
      return invalid("The demo clock returned an invalid timestamp.");
    return value;
  };
  const initialInstant = options.now
    ? time()
    : COMMUNICATIONS_DEMO_INITIAL_INSTANT;
  const initial = (): CommunicationsSnapshot => {
    const schedule = createDefaultBusinessHoursSchedule();
    return {
      mode: "demo",
      provider,
      connection: "disconnected",
      presence: "available",
      activeCall: null,
      queue: [],
      history: createCommunicationsDemoHistory(provider),
      error: null,
      businessHours: schedule,
      businessHoursOpen: evaluateBusinessHours(schedule, initialInstant).isOpen,
      audio: { microphonePermission: "unknown" },
      caps: { hold: true, mute: true, dtmf: true },
      events: [],
    };
  };
  let snapshot = immutable(initial());
  let disposed = false;
  let generation = 0;
  let callSequence = 0;
  let callerSequence = 0;
  let eventSequence = 0;
  let answerGeneration = 0;
  let ringGeneration = 0;
  let ringTimer: ReturnType<typeof setTimeout> | null = null;
  let connectTask: Promise<void> | null = null;
  let acceptTask: { callId: string; task: Promise<void> } | null = null;
  const subscribers = new Set<{ listener: () => void }>();

  function ensureAlive() {
    if (disposed)
      throw new CommunicationsError(
        "disposed",
        "The local adapter has been disposed.",
      );
  }
  function cancelRing() {
    ringGeneration++;
    if (ringTimer !== null) clearTimeout(ringTimer);
    ringTimer = null;
  }
  function commit(
    next: CommunicationsSnapshot,
    events: LocalEvent[] = [],
    at = time(),
  ) {
    if (disposed || next === snapshot) return;
    const additions = events.map((event) => ({
      ...event,
      id: `demo-event-${provider}-${++eventSequence}`,
      at,
      source: "demo" as const,
    }));
    snapshot = immutable({
      ...next,
      businessHoursOpen: evaluateBusinessHours(next.businessHours, at).isOpen,
      events: [...(next.events ?? []), ...additions].slice(-eventLimit),
    });
    // A route unsubscribe never tears down a session owned by a browser host.
    for (const subscription of [...subscribers])
      if (subscribers.has(subscription)) subscription.listener();
  }
  function instantFor(call: CommunicationsCall) {
    return Math.max(
      time(),
      call.queuedAt,
      call.startedAt ?? call.queuedAt,
      call.answeredAt ?? call.queuedAt,
    );
  }
  function terminal(callId: string) {
    if (snapshot.history.some((call) => call.id === callId)) return true;
    // The monotonically increasing local IDs also identify retired calls after
    // bounded history eviction/reset, without an unbounded tombstone collection.
    const prefix = `demo-${provider}-call-`;
    if (typeof callId !== "string" || !callId.startsWith(prefix)) return false;
    const suffix = callId.slice(prefix.length);
    const sequence = Number(suffix);
    return (
      /^[1-9]\d*$/.test(suffix) &&
      Number.isSafeInteger(sequence) &&
      sequence <= callSequence &&
      snapshot.activeCall?.id !== callId &&
      !snapshot.queue.some((call) => call.id === callId)
    );
  }
  function current(callId: string): CommunicationsCall {
    const call = snapshot.activeCall;
    if (!call || call.id !== callId) {
      if (snapshot.queue.some((item) => item.id === callId) || terminal(callId))
        throw new CommunicationsError(
          "invalid-transition",
          "This call is not the current browser offer.",
        );
      throw new CommunicationsError(
        "not-found",
        "The local call does not exist.",
      );
    }
    return call;
  }
  function requireReady() {
    if (snapshot.connection !== "ready")
      throw new CommunicationsError(
        "disconnected",
        "Reconnect the local browser agent before controlling the call.",
      );
  }
  function answered(callId: string, allowHeld = true) {
    ensureAlive();
    requireReady();
    const call = current(callId);
    if (call.status !== "active" && !(allowHeld && call.status === "held"))
      throw new CommunicationsError(
        "invalid-transition",
        "This control requires an answered call.",
      );
    return call;
  }
  function armRing() {
    cancelRing();
    const call = snapshot.activeCall;
    if (
      !call ||
      call.status !== "ringing" ||
      snapshot.connection !== "ready" ||
      snapshot.presence !== "available"
    )
      return;
    const expected = ringGeneration;
    ringTimer = setTimeout(() => {
      if (disposed || expected !== ringGeneration) return;
      ringTimer = null;
      const active = snapshot.activeCall;
      if (
        active?.id !== call.id ||
        active.status !== "ringing" ||
        snapshot.connection !== "ready"
      )
        return;
      endCall(active, "missed", "ring-timeout");
    }, ringTimeoutMs);
    // Timers should not retain a Node SSR process; this is a browser demo.
    if (typeof ringTimer === "object" && "unref" in ringTimer)
      ringTimer.unref();
  }
  function dispatch() {
    if (
      disposed ||
      snapshot.connection !== "ready" ||
      snapshot.presence !== "available" ||
      snapshot.activeCall ||
      snapshot.queue.length === 0
    )
      return;
    const [call, ...queue] = snapshot.queue;
    const at = instantFor(call);
    commit(
      {
        ...snapshot,
        queue,
        activeCall: {
          ...call,
          status: "ringing",
          startedAt: call.startedAt ?? at,
        },
      },
      [
        {
          type: "queue.offered",
          callId: call.id,
          detail: "FIFO offer reserved for the single local browser agent.",
        },
      ],
      at,
    );
    armRing();
  }
  function endCall(
    call: CommunicationsCall,
    status: "completed" | "missed",
    reason: CommunicationsEndReason,
  ) {
    if (terminal(call.id)) return;
    const at = instantFor(call);
    if (snapshot.activeCall?.id === call.id) {
      cancelRing();
      answerGeneration++;
      acceptTask = null;
    }
    const ended: CommunicationsCall = {
      ...call,
      status,
      endedAt: at,
      endReason: reason,
      disposition: reason,
    };
    commit(
      {
        ...snapshot,
        activeCall:
          snapshot.activeCall?.id === call.id ? null : snapshot.activeCall,
        queue: snapshot.queue.filter((item) => item.id !== call.id),
        history: [ended, ...snapshot.history].slice(0, historyLimit),
      },
      [{ type: `call.${status}`, callId: call.id, detail: reason }],
      at,
    );
    dispatch();
  }
  function interruptedOffer() {
    const call = snapshot.activeCall;
    return call?.status === "connecting"
      ? { ...call, status: "ringing" as const }
      : call;
  }
  function invalidatePendingWork() {
    generation++;
    answerGeneration++;
    connectTask = null;
    acceptTask = null;
    cancelRing();
  }

  const adapter: DemoCommunicationsAdapter = {
    mode: "demo",
    // Closure methods are intentionally safe when passed to React unbound.
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      if (disposed) return () => {};
      if (typeof listener !== "function")
        return invalid("A subscription requires a listener.");
      const subscription = { listener };
      subscribers.add(subscription);
      return () => subscribers.delete(subscription);
    },
    connect: async () => {
      ensureAlive();
      if (snapshot.connection === "ready") return Promise.resolve();
      if (connectTask) return connectTask;
      const expected = generation;
      const task = Promise.resolve()
        .then(() => {
          if (disposed || generation !== expected)
            throw new CommunicationsError(
              "cancelled",
              "Local connection was cancelled.",
            );
          commit({ ...snapshot, connection: "ready", error: null }, [
            {
              type: "connection.ready",
              detail:
                "Local signaling ready; no carrier or microphone connected.",
            },
          ]);
          if (snapshot.activeCall?.status === "ringing") armRing();
          else dispatch();
        })
        .finally(() => {
          if (connectTask === task) connectTask = null;
        });
      connectTask = task;
      const connection =
        snapshot.connection === "reconnecting" ? "reconnecting" : "connecting";
      commit({ ...snapshot, connection, error: null }, [
        {
          type: `connection.${connection}`,
          detail: "Preparing the local browser-agent simulation.",
        },
      ]);
      return task;
    },
    disconnect: async () => {
      ensureAlive();
      if (snapshot.connection === "disconnected") return;
      invalidatePendingWork();
      commit(
        {
          ...snapshot,
          connection: "disconnected",
          error: null,
          activeCall: interruptedOffer(),
        },
        [
          {
            type: "connection.disconnected",
            detail:
              "Signaling paused; a retained call has not been declared ended.",
          },
        ],
      );
    },
    setPresence: async (presence) => {
      ensureAlive();
      if (!["available", "away", "offline"].includes(presence))
        return invalid("Unknown agent presence.");
      if (snapshot.presence === presence) return;
      const call = snapshot.activeCall;
      const returnOffer =
        presence !== "available" &&
        (call?.status === "ringing" || call?.status === "connecting");
      if (returnOffer) {
        cancelRing();
        answerGeneration++;
        acceptTask = null;
      }
      commit(
        {
          ...snapshot,
          presence,
          activeCall: returnOffer ? null : call,
          queue: returnOffer
            ? [{ ...call, status: "queued" }, ...snapshot.queue]
            : snapshot.queue,
        },
        [
          { type: "presence.changed", detail: presence },
          ...(returnOffer
            ? [
                {
                  type: "queue.requeued",
                  callId: call.id,
                  detail: "Unanswered offer returned to the FIFO head.",
                },
              ]
            : []),
        ],
      );
      dispatch();
    },
    accept: async (callId) => {
      ensureAlive();
      requireReady();
      if (acceptTask?.callId === callId) return acceptTask.task;
      const call = current(callId);
      if (call.status === "active" || call.status === "held")
        return Promise.resolve();
      if (call.status !== "ringing" || snapshot.presence !== "available")
        return Promise.reject(
          new CommunicationsError(
            "invalid-transition",
            "Only an available agent can accept its current ringing offer.",
          ),
        );
      cancelRing();
      const expected = generation;
      const expectedAnswer = ++answerGeneration;
      const task = Promise.resolve()
        .then(() => {
          if (
            disposed ||
            generation !== expected ||
            answerGeneration !== expectedAnswer ||
            snapshot.activeCall?.id !== callId ||
            snapshot.activeCall.status !== "connecting" ||
            snapshot.presence !== "available" ||
            snapshot.connection !== "ready"
          )
            throw new CommunicationsError(
              "cancelled",
              "The local answer was cancelled before confirmation.",
            );
          const connecting = snapshot.activeCall;
          commit(
            {
              ...snapshot,
              activeCall: {
                ...connecting,
                status: "active",
                answeredAt: instantFor(connecting),
              },
            },
            [
              {
                type: "call.active",
                callId,
                detail:
                  "Local answer confirmed; no PSTN or media session exists.",
              },
            ],
          );
        })
        .finally(() => {
          if (acceptTask?.task === task) acceptTask = null;
        });
      acceptTask = { callId, task };
      commit({ ...snapshot, activeCall: { ...call, status: "connecting" } }, [
        {
          type: "call.connecting",
          callId,
          detail: "Confirming the local answer.",
        },
      ]);
      return task;
    },
    decline: async (callId) => {
      ensureAlive();
      if (terminal(callId)) return;
      const call =
        snapshot.activeCall?.id === callId
          ? snapshot.activeCall
          : snapshot.queue.find((item) => item.id === callId);
      if (!call)
        throw new CommunicationsError(
          "not-found",
          "The local call does not exist.",
        );
      if (call.status !== "ringing" && call.status !== "queued")
        throw new CommunicationsError(
          "invalid-transition",
          "Only an unanswered local offer can be declined.",
        );
      endCall(call, "missed", "declined");
    },
    hangup: async (callId) => {
      ensureAlive();
      if (terminal(callId)) return;
      const call = current(callId);
      const hasAnswered = call.status === "active" || call.status === "held";
      endCall(
        call,
        hasAnswered ? "completed" : "missed",
        hasAnswered ? "agent-hangup" : "cancelled-before-answer",
      );
    },
    setMuted: async (callId, muted) => {
      if (typeof muted !== "boolean")
        return invalid("Mute requires a boolean.");
      const call = answered(callId);
      if (call.muted === muted) return;
      commit({ ...snapshot, activeCall: { ...call, muted } }, [
        {
          type: muted ? "call.muted" : "call.unmuted",
          callId,
          detail: "Local mute state only; no media is captured.",
        },
      ]);
    },
    setHeld: async (callId, held) => {
      if (typeof held !== "boolean") return invalid("Hold requires a boolean.");
      const call = answered(callId);
      const status = held ? "held" : "active";
      if (call.status === status) return;
      commit({ ...snapshot, activeCall: { ...call, status } }, [
        {
          type: held ? "call.held" : "call.resumed",
          callId,
          detail: "Local hold state only; no carrier audio is changed.",
        },
      ]);
    },
    sendDtmf: async (callId, digit) => {
      if (typeof digit !== "string" || !/^[0-9*#]$/.test(digit))
        return invalid("DTMF requires one digit, * or #.");
      const call = answered(callId, false);
      commit(
        {
          ...snapshot,
          activeCall: {
            ...call,
            dtmfDigits: `${call.dtmfDigits ?? ""}${digit}`.slice(
              -COMMUNICATIONS_DTMF_MAX_LENGTH,
            ),
          },
        },
        [
          {
            type: "call.dtmf",
            callId,
            detail: "One local keypad digit recorded; no carrier tone emitted.",
          },
        ],
      );
    },
    setNotes: async (callId, text) => {
      ensureAlive();
      if (
        typeof text !== "string" ||
        text.length > COMMUNICATIONS_NOTES_MAX_LENGTH
      )
        return invalid(
          `Notes must be text of at most ${COMMUNICATIONS_NOTES_MAX_LENGTH} characters.`,
        );
      const call = [
        snapshot.activeCall,
        ...snapshot.queue,
        ...snapshot.history,
      ].find((item) => item?.id === callId);
      if (!call)
        throw new CommunicationsError(
          "not-found",
          "The local call does not exist.",
        );
      if (call.notes === text) return;
      const replace = (item: CommunicationsCall) =>
        item.id === callId ? { ...item, notes: text } : item;
      commit(
        {
          ...snapshot,
          activeCall: snapshot.activeCall ? replace(snapshot.activeCall) : null,
          queue: snapshot.queue.map(replace),
          history: snapshot.history.map(replace),
        },
        [
          {
            type: "call.notes",
            callId,
            detail: "Local notes updated; note contents excluded from events.",
          },
        ],
      );
    },
    simulateIncoming: async (request: SimulateIncomingOptions = {}) => {
      ensureAlive();
      if (
        !request ||
        (request.scenario !== undefined &&
          !["open", "closed", "holiday", "overflow"].includes(request.scenario))
      )
        return invalid("Unknown local inbound scenario.");
      const caller =
        communicationsDemoCallers[
          callerSequence % communicationsDemoCallers.length
        ];
      const callerName = request.callerName ?? caller.callerName;
      const from = request.from ?? caller.from;
      if (
        typeof callerName !== "string" ||
        !callerName.trim() ||
        callerName.length > 80 ||
        /[\u0000-\u001f\u007f]/.test(callerName)
      )
        return invalid(
          "A local caller name must contain between 1 and 80 printable characters.",
        );
      if (typeof from !== "string" || !/^\+[1-9]\d{6,14}$/.test(from))
        return invalid(
          "A local caller address must use an E.164-style +number.",
        );
      const at = time();
      const hours = evaluateBusinessHours(snapshot.businessHours, at);
      const route = request.scenario ?? hours.reason;
      const waiting =
        snapshot.queue.length +
        (["ringing", "connecting"].includes(snapshot.activeCall?.status ?? "")
          ? 1
          : 0);
      const reason: CommunicationsEndReason | null =
        route === "closed"
          ? "after-hours"
          : route === "holiday"
            ? "holiday"
            : route === "overflow" || waiting >= maxQueueSize
              ? "queue-overflow"
              : null;
      const call: CommunicationsCall = {
        id: `demo-${provider}-call-${++callSequence}`,
        provider,
        direction: "inbound",
        from,
        to: communicationsDemoNumber,
        callerName: callerName.trim(),
        company: caller.company,
        status: reason ? "missed" : "queued",
        queuedAt: at,
        muted: false,
        notes: "",
        dtmfDigits: "",
        ...(request.scenario ? { demoScenario: request.scenario } : {}),
        ...(reason
          ? { endedAt: at, endReason: reason, disposition: reason }
          : {}),
      };
      callerSequence++;
      commit(
        {
          ...snapshot,
          queue: reason ? snapshot.queue : [...snapshot.queue, call],
          history: reason
            ? [call, ...snapshot.history].slice(0, historyLimit)
            : snapshot.history,
        },
        [
          {
            type: "call.received",
            callId: call.id,
            detail:
              "Synthetic local inbound arrival; no number or carrier provisioned.",
          },
          {
            type: reason ? `routing.${reason}` : "queue.enqueued",
            callId: call.id,
            detail: reason ?? "Admitted to the local FIFO queue.",
          },
        ],
        at,
      );
      dispatch();
    },
    simulateDisconnect: async () => {
      ensureAlive();
      if (snapshot.connection === "reconnecting") return;
      invalidatePendingWork();
      commit(
        {
          ...snapshot,
          connection: "reconnecting",
          activeCall: interruptedOffer(),
          error:
            "Local signaling disconnected. Reconnect to resume the retained session.",
        },
        [
          {
            type: "connection.reconnecting",
            detail:
              "Simulated signaling loss; current session retained and no remote hangup inferred.",
          },
        ],
      );
    },
    setMicrophonePermission: async (permission) => {
      ensureAlive();
      if (!["unknown", "granted", "denied", "unavailable"].includes(permission))
        return invalid("Unknown microphone permission state.");
      if (snapshot.audio.microphonePermission === permission) return;
      commit(
        {
          ...snapshot,
          audio: { ...snapshot.audio, microphonePermission: permission },
        },
        [
          {
            type: "audio.permission",
            detail: `Consumer-reported microphone permission: ${permission}; the demo captures no audio.`,
          },
        ],
      );
    },
    setSchedule: async (schedule) => {
      ensureAlive();
      const businessHours = validateBusinessHoursSchedule(schedule);
      commit({ ...snapshot, businessHours }, [
        {
          type: "schedule.updated",
          detail:
            "Local hours and explicit date overrides updated; no official holiday calendar inferred.",
        },
      ]);
    },
    reset: async () => {
      ensureAlive();
      invalidatePendingWork();
      callerSequence = 0;
      commit(initial(), [
        {
          type: "demo.reset",
          detail: "Local session cleared and original fixtures restored.",
        },
      ]);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      invalidatePendingWork();
      subscribers.clear();
      snapshot = immutable({
        ...snapshot,
        connection: "disconnected",
        presence: "offline",
        activeCall: null,
        queue: [],
        error: null,
      });
    },
  };
  return adapter;
}
