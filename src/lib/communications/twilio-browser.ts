import { CommunicationsError } from "./contracts";
import {
  browserVoiceCallSchema,
  createVoiceEventChannel,
  parseVoiceAccessToken,
  stopVoiceMedia,
  voiceReadyGate,
  withVoiceCancellation,
  type BrowserVoiceCall,
  type BrowserVoiceClient,
  type VoiceAccessToken,
} from "./live-adapter";

/**
 * Optional @twilio/voice-sdk 2.18.5 boundary, verified 2026-10-21 against the
 * published declarations and official Device/Call documentation:
 * https://www.twilio.com/docs/voice/sdks/javascript/twiliodevice
 * https://www.twilio.com/docs/voice/sdks/javascript/twiliocall
 *
 * The adopting application installs/pins that SDK separately and supplies
 * createDevice or loadSdk. There is intentionally no package import here.
 * Example consumer loader: () => import("@twilio/voice-sdk").
 * tokenRefreshMs is the published option (default 10s). updateToken may cause
 * ~1s audio loss; this binding does not promise uninterrupted renewal, mobile
 * background service, PSTN termination, hold or transfer.
 */
type NativeListener = (...values: unknown[]) => void;
export interface TwilioNativeCall {
  readonly direction: string;
  readonly customParameters: { get(key: string): string | undefined };
  parameters: Record<string, string>;
  on(event: string, listener: NativeListener): unknown;
  off(event: string, listener: NativeListener): unknown;
  status(): string;
  accept(options?: { rtcConstraints?: MediaStreamConstraints }): void;
  reject(): void;
  disconnect(): void;
  mute(value: boolean): void;
  isMuted(): boolean;
  sendDigits(value: string): void;
  getLocalStream(): MediaStream | undefined;
  getRemoteStream(): MediaStream | undefined;
}
export interface TwilioNativeDevice {
  on(event: string, listener: NativeListener): unknown;
  off(event: string, listener: NativeListener): unknown;
  register(): Promise<void>;
  updateToken(token: string): void;
  disconnectAll(): void;
  destroy(): void;
}
type DeviceOptions = { tokenRefreshMs: number };
export type TwilioBrowserVoiceOptions = {
  /** A fresh Device exclusively owned by this binding. Never return a shared Device. */
  createDevice?: (
    token: string,
    options: DeviceOptions,
  ) => TwilioNativeDevice | Promise<TwilioNativeDevice>;
  loadSdk?: () => Promise<{
    Device: new (token: string, options: DeviceOptions) => TwilioNativeDevice;
  }>;
  tokenRefreshMs?: number;
  registrationTimeoutMs?: number;
};

function isCall(value: unknown): value is TwilioNativeCall {
  if (!value || typeof value !== "object") return false;
  return (
    "direction" in value &&
    value.direction === "INCOMING" &&
    "parameters" in value &&
    !!value.parameters &&
    typeof value.parameters === "object" &&
    "customParameters" in value &&
    !!value.customParameters &&
    typeof value.customParameters === "object" &&
    "get" in value.customParameters &&
    typeof value.customParameters.get === "function" &&
    "on" in value &&
    typeof value.on === "function" &&
    "off" in value &&
    typeof value.off === "function" &&
    "status" in value &&
    typeof value.status === "function" &&
    "accept" in value &&
    typeof value.accept === "function" &&
    "reject" in value &&
    typeof value.reject === "function" &&
    "disconnect" in value &&
    typeof value.disconnect === "function" &&
    "mute" in value &&
    typeof value.mute === "function" &&
    "isMuted" in value &&
    typeof value.isMuted === "function" &&
    "sendDigits" in value &&
    typeof value.sendDigits === "function" &&
    "getLocalStream" in value &&
    typeof value.getLocalStream === "function" &&
    "getRemoteStream" in value &&
    typeof value.getRemoteStream === "function"
  );
}
function state(value: string): BrowserVoiceCall["state"] | undefined {
  if (value === "pending" || value === "ringing") return "ringing";
  if (value === "connecting") return "connecting";
  if (value === "open") return "active";
  if (value === "reconnecting") return "reconnecting";
  if (value === "closed") return "ended";
}

export function createTwilioBrowserVoiceClient(
  options: TwilioBrowserVoiceOptions,
): BrowserVoiceClient {
  if (
    (!options.createDevice && !options.loadSdk) ||
    (options.createDevice && options.loadSdk)
  )
    throw new CommunicationsError(
      "invalid-argument",
      "Supply one optional Twilio SDK factory.",
    );
  const tokenRefreshMs = options.tokenRefreshMs ?? 10000;
  const timeout = options.registrationTimeoutMs ?? 20000;
  if (
    !Number.isInteger(tokenRefreshMs) ||
    tokenRefreshMs < 0 ||
    tokenRefreshMs > 120000 ||
    !Number.isInteger(timeout) ||
    timeout < 1 ||
    timeout > 120000
  )
    throw new CommunicationsError(
      "invalid-argument",
      "Invalid Twilio lifecycle options.",
    );
  const channel = createVoiceEventChannel();
  const calls = new Map<
    string,
    {
      native: TwilioNativeCall;
      view: BrowserVoiceCall;
      unlisten: (() => void)[];
    }
  >();
  const deviceListeners: (() => void)[] = [];
  let device: TwilioNativeDevice | null = null;
  let disposed = false;
  let registered = false;
  let creating = false;
  let recovering = false;
  let cancelRecovery: (() => void) | undefined;
  let cancelRegistration: (() => void) | undefined;
  let epoch = 0;

  function releaseCallMedia(call: TwilioNativeCall) {
    try {
      stopVoiceMedia(call.getLocalStream());
    } catch {
      /* Continue remote cleanup. */
    }
    try {
      stopVoiceMedia(call.getRemoteStream());
    } catch {
      /* Native stream already gone. */
    }
  }
  function nativeOperation(action: () => void) {
    try {
      action();
    } catch {
      throw new CommunicationsError(
        "disconnected",
        "Twilio browser operation failed.",
      );
    }
  }
  function requireCall(
    nativeCallId: string,
    allowed: readonly string[],
    needsRegistration = true,
  ) {
    if (disposed)
      throw new CommunicationsError(
        "disposed",
        "Twilio browser binding disposed.",
      );
    const item = calls.get(nativeCallId);
    if (
      (needsRegistration && !registered) ||
      !item ||
      !allowed.includes(item.view.state)
    )
      throw new CommunicationsError(
        "invalid-transition",
        "Twilio browser call is unavailable.",
      );
    return item;
  }
  function describe(call: TwilioNativeCall) {
    const id = call.parameters.CallSid;
    if (!/^CA[0-9a-f]{32}$/i.test(id ?? ""))
      throw new CommunicationsError(
        "invalid-argument",
        "Invalid Twilio incoming call reference.",
      );
    const logicalCallId = call.customParameters.get("aureformCallId");
    const reservationId = call.customParameters.get("aureformReservationId");
    const parsed = browserVoiceCallSchema.safeParse({
      provider: "twilio",
      nativeCallId: id,
      browserCallId: id,
      ...(logicalCallId ? { logicalCallId } : {}),
      ...(reservationId ? { reservationId } : {}),
      state: state(call.status()),
      muted: call.isMuted(),
    });
    if (!parsed.success)
      throw new CommunicationsError(
        "invalid-argument",
        "Invalid Twilio incoming call.",
      );
    return parsed.data;
  }
  function receive(value: unknown, currentEpoch: number) {
    if (!isCall(value) || calls.size >= 32)
      throw new CommunicationsError(
        "invalid-argument",
        "Invalid Twilio incoming notification.",
      );
    const call = value;
    const view = describe(call);
    const existing = calls.get(view.nativeCallId);
    if (existing) {
      if (existing.native !== call)
        throw new CommunicationsError(
          "invalid-argument",
          "Duplicate Twilio native call ID.",
        );
      return;
    }
    const item: {
      native: TwilioNativeCall;
      view: BrowserVoiceCall;
      unlisten: (() => void)[];
    } = { native: call, view, unlisten: [] };
    calls.set(view.nativeCallId, item);
    function listen(event: string, callback: NativeListener) {
      const handler: NativeListener = (...args) => {
        if (disposed || currentEpoch !== epoch || !calls.has(view.nativeCallId))
          return;
        try {
          callback(...args);
        } catch {
          channel.emit({ type: "error", code: "invalid-notification" });
        }
      };
      call.on(event, handler);
      item.unlisten.push(() => {
        call.off(event, handler);
      });
    }
    function changed(terminal = false) {
      item.view = terminal ? { ...item.view, state: "ended" } : describe(call);
      channel.emit({ type: "call", call: { ...item.view } });
      if (item.view.state === "active") {
        const stream = call.getLocalStream();
        if (
          stream?.getAudioTracks().some((track) => track.readyState === "live")
        )
          channel.emit({ type: "microphone", permission: "granted" });
      }
      if (terminal) {
        for (const off of item.unlisten) {
          try {
            off();
          } catch {
            /* Continue releasing owned handlers. */
          }
        }
        releaseCallMedia(call);
        calls.delete(view.nativeCallId);
      }
    }
    listen("accept", () => changed());
    listen("mute", (muted) => {
      if (typeof muted !== "boolean") throw new Error("mute");
      changed();
    });
    listen("reconnecting", () => {
      item.view = { ...item.view, state: "reconnecting" };
      channel.emit({ type: "call", call: { ...item.view } });
    });
    listen("reconnected", () => changed());
    listen("cancel", () => changed(true));
    listen("disconnect", () => changed(true));
    listen("reject", () => changed(true));
    listen("error", () =>
      channel.emit({ type: "error", code: "provider-error" }),
    );
    channel.emit({ type: "call", call: { ...view } });
    // Incoming notifications never answer themselves. Only explicit accept does.
  }
  function cleanup() {
    ++epoch;
    registered = false;
    cancelRegistration?.();
    cancelRegistration = undefined;
    cancelRecovery?.();
    cancelRecovery = undefined;
    for (const off of deviceListeners.splice(0)) {
      try {
        off();
      } catch {
        /* Continue teardown. */
      }
    }
    for (const item of calls.values()) {
      for (const off of item.unlisten) {
        try {
          off();
        } catch {
          /* Continue teardown. */
        }
      }
      releaseCallMedia(item.native);
    }
    calls.clear();
    const old = device;
    device = null;
    if (old) {
      try {
        old.disconnectAll();
      } catch {
        /* destroy still releases registration. */
      }
      try {
        old.destroy();
      } catch {
        /* No retained native reference. */
      }
    }
  }

  return {
    provider: "twilio",
    subscribe: channel.subscribe,
    getCalls: () => [...calls.values()].map((item) => ({ ...item.view })),
    async connect(input: VoiceAccessToken, signal: AbortSignal) {
      if (disposed)
        throw new CommunicationsError(
          "disposed",
          "Twilio browser binding disposed.",
        );
      if (device || creating)
        throw new CommunicationsError(
          "invalid-transition",
          "Twilio Device already exists.",
        );
      const token = parseVoiceAccessToken(input);
      if (signal.aborted)
        throw new CommunicationsError(
          "cancelled",
          "Twilio registration cancelled.",
        );
      creating = true;
      const currentEpoch = ++epoch;
      const registration = new AbortController();
      const abort = () => registration.abort();
      signal.addEventListener("abort", abort, { once: true });
      cancelRegistration = abort;
      try {
        const prepared = Promise.resolve().then(async () => {
          if (registration.signal.aborted)
            throw new CommunicationsError(
              "cancelled",
              "Twilio registration cancelled.",
            );
          if (options.createDevice)
            return options.createDevice(token.token, { tokenRefreshMs });
          const sdkModule = await options.loadSdk!();
          if (registration.signal.aborted)
            throw new CommunicationsError(
              "cancelled",
              "Twilio registration cancelled.",
            );
          return new sdkModule.Device(token.token, { tokenRefreshMs });
        });
        void prepared
          .then((late) => {
            if (
              disposed ||
              registration.signal.aborted ||
              currentEpoch !== epoch
            ) {
              try {
                late.disconnectAll();
              } catch {
                /* Still destroy the late result. */
              }
              try {
                late.destroy();
              } catch {
                /* No retained native reference. */
              }
            }
          })
          .catch(() => {});
        const sdk = await withVoiceCancellation(prepared, registration.signal);
        device = sdk;
        const gate = voiceReadyGate(registration.signal, timeout);
        function listen(event: string, callback: NativeListener) {
          const handler: NativeListener = (...args) => {
            if (disposed || currentEpoch !== epoch) return;
            try {
              callback(...args);
            } catch {
              channel.emit({ type: "error", code: "invalid-notification" });
            }
          };
          sdk.on(event, handler);
          deviceListeners.push(() => {
            sdk.off(event, handler);
          });
        }
        try {
          listen("registered", () => {
            registered = true;
            gate.ready();
            channel.emit({ type: "ready" });
          });
          listen("registering", () => {
            if (registered) {
              registered = false;
              channel.emit({ type: "reconnecting" });
            }
          });
          listen("unregistered", () => {
            registered = false;
            channel.emit({ type: "disconnected" });
          });
          listen("destroyed", () => {
            registered = false;
            channel.emit({ type: "disconnected" });
          });
          listen("tokenWillExpire", () =>
            channel.emit({ type: "token-expiring" }),
          );
          listen("incoming", (call) => receive(call, currentEpoch));
          listen("error", () => {
            gate.fail(
              new CommunicationsError(
                "disconnected",
                "Twilio registration failed.",
              ),
            );
            channel.emit({ type: "error", code: "provider-error" });
          });
          void Promise.resolve(sdk.register()).catch(() => {
            gate.fail(
              new CommunicationsError(
                "disconnected",
                "Twilio registration failed.",
              ),
            );
          });
        } catch {
          gate.fail(
            new CommunicationsError(
              "disconnected",
              "Twilio registration failed.",
            ),
          );
        }
        await gate.promise;
      } catch (error) {
        if (currentEpoch === epoch) cleanup();
        throw error instanceof CommunicationsError
          ? error
          : new CommunicationsError(
              "disconnected",
              "Twilio registration failed.",
            );
      } finally {
        signal.removeEventListener("abort", abort);
        creating = false;
        cancelRegistration = undefined;
      }
    },
    async refreshToken(input, signal) {
      const token = parseVoiceAccessToken(input);
      if (disposed || signal.aborted)
        throw new CommunicationsError("cancelled", "Twilio renewal cancelled.");
      if (!device || !registered)
        throw new CommunicationsError(
          "disconnected",
          "Twilio Device is not registered.",
        );
      // This official void operation is not a promise of uninterrupted media.
      const sdk = device;
      nativeOperation(() => sdk.updateToken(token.token));
    },
    async reconnect(signal) {
      if (disposed)
        throw new CommunicationsError(
          "disposed",
          "Twilio browser binding disposed.",
        );
      const sdk = device;
      if (!sdk)
        throw new CommunicationsError(
          "disconnected",
          "Twilio Device is unavailable.",
        );
      if (registered) return;
      if (recovering)
        throw new CommunicationsError(
          "invalid-transition",
          "Twilio recovery is already pending.",
        );
      recovering = true;
      const gate = voiceReadyGate(signal, timeout);
      cancelRecovery = () =>
        gate.fail(
          new CommunicationsError("cancelled", "Twilio recovery cancelled."),
        );
      const unsubscribe = channel.subscribe((event) => {
        if (event.type === "ready") gate.ready();
        if (event.type === "error" || event.type === "disconnected")
          gate.fail(
            new CommunicationsError("disconnected", "Twilio recovery failed."),
          );
      });
      try {
        if (!signal.aborted) {
          try {
            void Promise.resolve(sdk.register()).catch(() =>
              gate.fail(
                new CommunicationsError(
                  "disconnected",
                  "Twilio recovery failed.",
                ),
              ),
            );
          } catch {
            gate.fail(
              new CommunicationsError(
                "disconnected",
                "Twilio recovery failed.",
              ),
            );
          }
        }
        await gate.promise;
      } finally {
        unsubscribe();
        cancelRecovery = undefined;
        recovering = false;
      }
    },
    async accept(id) {
      const item = requireCall(id, ["ringing"]);
      nativeOperation(() => {
        item.native.accept({ rtcConstraints: { audio: true, video: false } });
        item.view = describe(item.native);
      });
    },
    async decline(id) {
      const item = requireCall(id, ["ringing"], false);
      nativeOperation(() => item.native.reject());
    },
    async hangup(id) {
      const item = requireCall(
        id,
        ["ringing", "connecting", "active", "held", "reconnecting"],
        false,
      );
      nativeOperation(() => item.native.disconnect());
    },
    async setMuted(id, muted) {
      if (typeof muted !== "boolean")
        throw new CommunicationsError(
          "invalid-argument",
          "Invalid mute value.",
        );
      const item = requireCall(id, ["active", "held"]);
      nativeOperation(() => {
        item.native.mute(muted);
        item.view = describe(item.native);
      });
    },
    async sendDtmf(id, digit) {
      if (typeof digit !== "string" || !/^[0-9*#]$/.test(digit))
        throw new CommunicationsError(
          "invalid-argument",
          "Use one DTMF keypad digit.",
        );
      const item = requireCall(id, ["active"]);
      nativeOperation(() => item.native.sendDigits(digit));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cleanup();
      channel.clear();
    },
  };
}
