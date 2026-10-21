/**
 * Editable communications contracts. A consumer backend owns real carrier
 * credentials, authorization, routing, media and durable session state.
 * Selecting a provider in a local demo does not establish carrier compatibility.
 */
export type CommunicationsProvider = "twilio" | "telnyx";
export type CommunicationsPresence = "available" | "away" | "offline";
export type CommunicationsConnection =
  "disconnected" | "connecting" | "ready" | "reconnecting" | "error";
export type CommunicationsCallStatus =
  | "queued"
  | "ringing"
  | "connecting"
  | "active"
  | "held"
  | "completed"
  | "missed"
  | "failed";

/** JavaScript weekday numbering: Sunday = 0, Monday = 1, Saturday = 6. */
export type BusinessHoursWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type BusinessHoursPeriod = {
  day: BusinessHoursWeekday;
  /** Local HH:mm, inclusive. */
  start: string;
  /** Local HH:mm (or 24:00), exclusive. An earlier end spans midnight. */
  end: string;
};
export type BusinessHoursHoliday = {
  /** An explicit local ISO date, YYYY-MM-DD; never an inferred country calendar. */
  date: string;
  label?: string;
};
export type BusinessHoursSchedule = {
  timezone: string;
  weekly: BusinessHoursPeriod[];
  holidays: BusinessHoursHoliday[];
};
export type BusinessHoursEvaluation = {
  isOpen: boolean;
  reason: "open" | "closed" | "holiday";
  localDate: string;
  localTime: string;
  weekday: BusinessHoursWeekday;
};

export type CommunicationsEndReason =
  | "agent-hangup"
  | "declined"
  | "ring-timeout"
  | "after-hours"
  | "holiday"
  | "queue-overflow"
  | "cancelled-before-answer";
export type CommunicationsDemoScenario =
  "open" | "closed" | "holiday" | "overflow";

export type CommunicationsCall = {
  id: string;
  provider: CommunicationsProvider;
  /** Opaque, actual carrier reference; the local adapter never fabricates one. */
  providerCallId?: string;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  callerName: string;
  company?: string;
  avatar?: string;
  status: CommunicationsCallStatus;
  queuedAt: number;
  /** First browser offer, not proof of a PSTN leg or audio connection. */
  startedAt?: number;
  answeredAt?: number;
  endedAt?: number;
  muted: boolean;
  notes: string;
  disposition?: string;
  endReason?: CommunicationsEndReason;
  /** Bounded local keypad log. A demo emits no tones to a carrier. */
  dtmfDigits?: string;
  /** Only set when a caller explicitly requests a local test scenario. */
  demoScenario?: CommunicationsDemoScenario;
};

export type CommunicationsEvent = {
  id: string;
  callId?: string;
  type: string;
  at: number;
  source: "demo" | "backend" | "sdk";
  /** Public operational summary, without notes, credentials or raw payloads. */
  detail?: string;
};
export type CommunicationsCapabilities = {
  /** True in a demo describes local state controls, never carrier audio support. */
  hold: boolean;
  mute: boolean;
  dtmf: boolean;
};

export type CommunicationsSnapshot = {
  mode: "demo" | "live";
  provider: CommunicationsProvider;
  connection: CommunicationsConnection;
  presence: CommunicationsPresence;
  /** Includes the single offered/connecting call as well as an answered call. */
  activeCall: CommunicationsCall | null;
  /** FIFO callers waiting behind the single browser-agent reservation. */
  queue: CommunicationsCall[];
  /** Most recently ended first; terminal calls never remain in the queue. */
  history: CommunicationsCall[];
  error: string | null;
  businessHours: BusinessHoursSchedule;
  businessHoursOpen: boolean;
  /** Optional consumer-reported capabilities; absence is not support. */
  caps?: CommunicationsCapabilities;
  /** Bounded operational events; demos mark every entry with source: "demo". */
  events?: CommunicationsEvent[];
  audio: {
    microphonePermission: "unknown" | "granted" | "denied" | "unavailable";
    inputDeviceId?: string;
    outputDeviceId?: string;
  };
};

export interface CommunicationsAdapter {
  /** Stable, immutable between emissions; suitable for useSyncExternalStore. */
  getSnapshot(): CommunicationsSnapshot;
  subscribe(listener: () => void): () => void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  setPresence(presence: CommunicationsPresence): Promise<void>;
  accept(callId: string): Promise<void>;
  decline(callId: string): Promise<void>;
  hangup(callId: string): Promise<void>;
  setMuted(callId: string, muted: boolean): Promise<void>;
  setHeld(callId: string, held: boolean): Promise<void>;
  sendDtmf(callId: string, digit: string): Promise<void>;
  setNotes(callId: string, text: string): Promise<void>;
}

export type SimulateIncomingOptions = {
  /** Omitting the scenario evaluates the configured schedule at arrival. */
  scenario?: CommunicationsDemoScenario;
  callerName?: string;
  from?: string;
};
export interface DemoCommunicationsAdapter extends CommunicationsAdapter {
  readonly mode: "demo";
  simulateIncoming(options?: SimulateIncomingOptions): Promise<void>;
  simulateDisconnect(): Promise<void>;
  /** Report a permission result obtained explicitly by the consumer UI. No prompt. */
  setMicrophonePermission(
    permission: CommunicationsSnapshot["audio"]["microphonePermission"],
  ): Promise<void>;
  reset(): Promise<void>;
  setSchedule(schedule: BusinessHoursSchedule): Promise<void>;
  /** Final teardown: cancel timers/pending work and release every subscriber. */
  dispose(): void;
}
export type DemoCommunicationsAdapterOptions = {
  provider?: CommunicationsProvider;
  /** Inject an epoch clock (or Date-valued clock) for deterministic scenarios. */
  now?: () => number | Date;
  ringTimeoutMs?: number;
  /** Counts all unanswered admitted callers, including the ringing offer. */
  maxQueueSize?: number;
};

export type CommunicationsErrorCode =
  | "invalid-argument"
  | "invalid-transition"
  | "not-found"
  | "disconnected"
  | "cancelled"
  | "disposed";
export class CommunicationsError extends Error {
  readonly code: CommunicationsErrorCode;

  constructor(code: CommunicationsErrorCode, message: string) {
    super(message);
    this.name = "CommunicationsError";
    this.code = code;
  }
}
