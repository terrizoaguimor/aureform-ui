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
} from "./live-adapter";

/**
 * Optional @telnyx/webrtc 2.28.0 boundary, verified 2026-10-21 against its
 * published declarations/source (ee2d3dabc1bc202abf9e8e6aacc5d25209d5c419):
 * https://team-telnyx.github.io/webrtc/classes/TelnyxRTC.html
 * https://team-telnyx.github.io/webrtc/classes/Call.html
 * https://github.com/team-telnyx/webrtc/blob/ee2d3dabc1bc202abf9e8e6aacc5d25209d5c419/packages/js/src/Modules/Verto/BaseSession.ts
 *
 * Install/pin the SDK in the consumer and inject createClient or loadSdk.
 * Example consumer loader: () => import("@telnyx/webrtc").
 * No SDK import/default dial here. newCall is the verified outbound primitive,
 * declared for structural compatibility but never invoked by this inbound port.
 * Renewal uses login({creds:{login_token}}), not the conflicting updateToken
 * recipe. Warning34001 is120s in the pinned code. A resolved login promise alone
 * is not success: the pinned implementation can return early on a dead socket.
 * Parent-credential expiry still bounds the JWT. Browser background/media
 * continuity and remote PSTN completion are not certified by this binding.
 */
type NativeListener = (...values: unknown[]) => void;
export interface TelnyxNativeCall {
  readonly id: string;
  readonly direction: string;
  readonly state: string;
  readonly recoveredCallId?: string;
  readonly isAudioMuted: boolean;
  readonly telnyxIDs: {
    telnyxCallControlId?: string | null;
    telnyxSessionId?: string | null;
    telnyxLegId?: string | null;
  };
  readonly localStream: MediaStream | null;
  readonly remoteStream: MediaStream | null;
  answer(options?: { audio?: boolean; video?: boolean }): Promise<void>;
  hangup(): Promise<void>;
  muteAudio(): void;
  unmuteAudio(): void;
  dtmf(digit: string): void;
}
export interface TelnyxNativeClient {
  readonly connected: boolean;
  /** Native getter also accepts SDK callbacks; we only assign the host element. */
  remoteElement?: unknown;
  on(event: string, listener: NativeListener): unknown;
  off(event: string, listener: NativeListener): unknown;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  clearReconnectToken(): void;
  login(options: {
    creds: { login_token: string };
    onSuccess: () => void;
    onError: (error: unknown) => void;
  }): Promise<void>;
  /** Outbound dialing is outside the live inbound adapter's allowlist. */
  newCall(options: {
    destinationNumber: string;
    callerNumber?: string;
    audio?: boolean;
    video?: boolean;
  }): TelnyxNativeCall;
}
export type TelnyxBrowserVoiceOptions = {
  /** A fresh, exclusively owned TelnyxRTC. Never inject a shared/global client. */
  createClient?: (options: {
    login_token: string;
  }) => TelnyxNativeClient | Promise<TelnyxNativeClient>;
  loadSdk?: () => Promise<{
    TelnyxRTC: new (options: { login_token: string }) => TelnyxNativeClient;
  }>;
  /** Host-owned audible media element; the host handles its autoplay gesture. */
  remoteElement?: HTMLMediaElement;
  registrationTimeoutMs?: number;
};
function hasNativeReferences(value: unknown) {
  if (!value || typeof value !== "object") return false;
  return ["telnyxCallControlId", "telnyxSessionId", "telnyxLegId"].every(
    (key) => {
      const reference: unknown = Reflect.get(value, key);
      return (
        reference === undefined ||
        reference === null ||
        typeof reference === "string"
      );
    },
  );
}
function isCall(value: unknown): value is TelnyxNativeCall {
  if (!value || typeof value !== "object") return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "direction" in value &&
    value.direction === "inbound" &&
    "state" in value &&
    typeof value.state === "string" &&
    "isAudioMuted" in value &&
    typeof value.isAudioMuted === "boolean" &&
    "telnyxIDs" in value &&
    hasNativeReferences(value.telnyxIDs) &&
    (!("recoveredCallId" in value) ||
      value.recoveredCallId === undefined ||
      typeof value.recoveredCallId === "string") &&
    "localStream" in value &&
    "remoteStream" in value &&
    "answer" in value &&
    typeof value.answer === "function" &&
    "hangup" in value &&
    typeof value.hangup === "function" &&
    "muteAudio" in value &&
    typeof value.muteAudio === "function" &&
    "unmuteAudio" in value &&
    typeof value.unmuteAudio === "function" &&
    "dtmf" in value &&
    typeof value.dtmf === "function"
  );
}
function callState(value: string): BrowserVoiceCall["state"] | undefined {
  if (value === "ringing") return "ringing";
  if (["new", "trying", "requesting", "answering", "early"].includes(value))
    return "connecting";
  if (value === "recovering") return "reconnecting";
  if (value === "active") return "active";
  if (value === "held") return "held";
  if (["hangup", "destroy", "purge"].includes(value)) return "ended";
}
function numericCode(value: unknown, field: "error" | "warning") {
  if (!value || typeof value !== "object" || !(field in value))
    return undefined;
  const nested: unknown = Reflect.get(value, field);
  return nested &&
    typeof nested === "object" &&
    "code" in nested &&
    typeof nested.code === "number"
    ? nested.code
    : undefined;
}

export function createTelnyxBrowserVoiceClient(
  options: TelnyxBrowserVoiceOptions,
): BrowserVoiceClient {
  if (
    (!options.createClient && !options.loadSdk) ||
    (options.createClient && options.loadSdk)
  )
    throw new CommunicationsError(
      "invalid-argument",
      "Supply one optional Telnyx SDK factory.",
    );
  const timeout = options.registrationTimeoutMs ?? 20000;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120000)
    throw new CommunicationsError(
      "invalid-argument",
      "Invalid Telnyx registration timeout.",
    );
  const channel = createVoiceEventChannel();
  const lifecycle = new AbortController();
  const calls = new Map<
    string,
    { native: TelnyxNativeCall; view: BrowserVoiceCall }
  >();
  const unlisten: (() => void)[] = [];
  let client: TelnyxNativeClient | null = null;
  let disposed = false;
  let registered = false;
  let creating = false;
  let refreshing = false;
  let recovering = false;
  let epoch = 0;
  let cancelRegistration: (() => void) | undefined;
  let failRenewal: ((error: CommunicationsError) => void) | undefined;
  let cancelRecovery: (() => void) | undefined;
  function requireCall(
    id: string,
    allowed: readonly string[],
    needsRegistration = true,
  ) {
    if (disposed)
      throw new CommunicationsError(
        "disposed",
        "Telnyx browser binding disposed.",
      );
    const item = calls.get(id);
    if (
      (needsRegistration && !registered) ||
      !item ||
      !allowed.includes(item.view.state)
    )
      throw new CommunicationsError(
        "invalid-transition",
        "Telnyx browser call is unavailable.",
      );
    return item;
  }
  async function nativeOperation(action: () => void | Promise<void>) {
    try {
      await withVoiceCancellation(
        Promise.resolve().then(() => {
          if (lifecycle.signal.aborted)
            throw new CommunicationsError(
              "cancelled",
              "Telnyx operation cancelled.",
            );
          return action();
        }),
        lifecycle.signal,
      );
    } catch (error) {
      if (error instanceof CommunicationsError) throw error;
      throw new CommunicationsError(
        "disconnected",
        "Telnyx browser operation failed.",
      );
    }
  }
  function releaseCallMedia(call: TelnyxNativeCall) {
    try {
      stopVoiceMedia(call.localStream);
    } catch {
      /* Continue remote cleanup. */
    }
    try {
      stopVoiceMedia(call.remoteStream);
    } catch {
      /* Native stream already gone. */
    }
  }
  function describe(call: TelnyxNativeCall) {
    const ids = call.telnyxIDs;
    const parsed = browserVoiceCallSchema.safeParse({
      provider: "telnyx",
      nativeCallId: call.id,
      ...(ids.telnyxCallControlId
        ? { browserCallId: ids.telnyxCallControlId }
        : {}),
      ...(ids.telnyxLegId ? { browserCallLegId: ids.telnyxLegId } : {}),
      ...(ids.telnyxSessionId ? { callSessionId: ids.telnyxSessionId } : {}),
      state: callState(call.state),
      muted: call.isAudioMuted,
    });
    if (!parsed.success)
      throw new CommunicationsError(
        "invalid-argument",
        "Invalid Telnyx native call reference.",
      );
    return parsed.data;
  }
  function notification(value: unknown) {
    if (
      !value ||
      typeof value !== "object" ||
      !("type" in value) ||
      typeof value.type !== "string"
    )
      throw new CommunicationsError(
        "invalid-argument",
        "Invalid Telnyx notification.",
      );
    if (value.type !== "callUpdate") return; // Other official session notifications are not call offers.
    if (!("call" in value) || !isCall(value.call))
      throw new CommunicationsError(
        "invalid-argument",
        "Invalid Telnyx call notification.",
      );
    const call = value.call;
    const view = describe(call);
    if (!calls.has(view.nativeCallId) && calls.size >= 32)
      throw new CommunicationsError(
        "invalid-argument",
        "Too many Telnyx call references.",
      );
    // The SDK's recoveredCallId names a previous local object, not a carrier ID.
    // A replacement still requires the same actual backend leg/session binding.
    if (call.recoveredCallId && call.recoveredCallId !== call.id)
      calls.delete(call.recoveredCallId);
    calls.set(view.nativeCallId, { native: call, view });
    channel.emit({ type: "call", call: { ...view } });
    if (
      view.state === "active" &&
      call.localStream
        ?.getAudioTracks()
        .some((track) => track.readyState === "live")
    )
      channel.emit({ type: "microphone", permission: "granted" });
    if (view.state === "ended") {
      releaseCallMedia(call);
      calls.delete(view.nativeCallId);
    }
    // Never call answer() from the notification handler.
  }
  function cleanup() {
    ++epoch;
    registered = false;
    cancelRegistration?.();
    cancelRegistration = undefined;
    failRenewal?.(
      new CommunicationsError("cancelled", "Telnyx renewal cancelled."),
    );
    failRenewal = undefined;
    cancelRecovery?.();
    cancelRecovery = undefined;
    for (const off of unlisten.splice(0)) {
      try {
        off();
      } catch {
        /* Continue media cleanup. */
      }
    }
    const ownedCalls = [...calls.values()];
    calls.clear();
    for (const item of ownedCalls) {
      releaseCallMedia(item.native);
      try {
        void item.native.hangup().catch(() => {});
      } catch {
        /* Remote end is not claimed. */
      }
    }
    const old = client;
    client = null;
    if (old) {
      try {
        old.clearReconnectToken();
      } catch {
        /* SDK storage may be disabled. */
      }
      try {
        void old.disconnect().catch(() => {});
      } catch {
        /* All local references are still released. */
      }
    }
    try {
      options.remoteElement?.pause();
      if (options.remoteElement) options.remoteElement.srcObject = null;
    } catch {
      /* Host media element may already have been unmounted. */
    }
  }

  return {
    provider: "telnyx",
    subscribe: channel.subscribe,
    getCalls: () => [...calls.values()].map((item) => ({ ...item.view })),
    async connect(input, signal) {
      if (disposed)
        throw new CommunicationsError(
          "disposed",
          "Telnyx browser binding disposed.",
        );
      if (client || creating)
        throw new CommunicationsError(
          "invalid-transition",
          "Telnyx client already exists.",
        );
      const token = parseVoiceAccessToken(input);
      if (signal.aborted)
        throw new CommunicationsError(
          "cancelled",
          "Telnyx registration cancelled.",
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
              "Telnyx registration cancelled.",
            );
          if (options.createClient)
            return options.createClient({ login_token: token.token });
          const sdkModule = await options.loadSdk!();
          if (registration.signal.aborted)
            throw new CommunicationsError(
              "cancelled",
              "Telnyx registration cancelled.",
            );
          return new sdkModule.TelnyxRTC({ login_token: token.token });
        });
        void prepared
          .then((late) => {
            if (
              disposed ||
              registration.signal.aborted ||
              currentEpoch !== epoch
            ) {
              try {
                late.clearReconnectToken();
              } catch {
                /* SDK cache may be unavailable. */
              }
              try {
                void late.disconnect().catch(() => {});
              } catch {
                /* No retained native reference. */
              }
            }
          })
          .catch(() => {});
        const sdk = await withVoiceCancellation(prepared, registration.signal);
        client = sdk;
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
          unlisten.push(() => {
            sdk.off(event, handler);
          });
        }
        try {
          // The pinned SDK persists recovery markers internally. Clear its public
          // reconnect cache before an explicitly new registration; our adapter
          // never writes carrier JWTs or backend bearers to browser storage.
          sdk.clearReconnectToken();
          if (options.remoteElement) sdk.remoteElement = options.remoteElement;
          listen("telnyx.ready", () => {
            registered = true;
            gate.ready();
            channel.emit({ type: "ready" });
          });
          listen("telnyx.notification", notification);
          listen("telnyx.socket.close", () => {
            registered = false;
            failRenewal?.(
              new CommunicationsError(
                "disconnected",
                "Telnyx renewal lost its socket.",
              ),
            );
            channel.emit({ type: "reconnecting" });
          });
          listen("telnyx.socket.error", () => {
            registered = false;
            failRenewal?.(
              new CommunicationsError(
                "disconnected",
                "Telnyx renewal lost its socket.",
              ),
            );
            channel.emit({ type: "reconnecting" });
          });
          listen("telnyx.warning", (warning) => {
            if (numericCode(warning, "warning") === 34001)
              channel.emit({ type: "token-expiring" });
          });
          listen("telnyx.error", (error) => {
            const code = numericCode(error, "error");
            gate.fail(
              new CommunicationsError(
                "disconnected",
                "Telnyx registration failed.",
              ),
            );
            failRenewal?.(
              new CommunicationsError("disconnected", "Telnyx renewal failed."),
            );
            channel.emit({
              type: "error",
              code:
                code === 42001 || code === 42002
                  ? "media-error"
                  : "provider-error",
              ...(code === 42001 ? { microphonePermission: "denied" } : {}),
              ...(code === 42002
                ? { microphonePermission: "unavailable" }
                : {}),
            });
            // A recoverable SDK permission error is never resumed automatically.
          });
          void Promise.resolve(sdk.connect()).catch(() =>
            gate.fail(
              new CommunicationsError(
                "disconnected",
                "Telnyx registration failed.",
              ),
            ),
          );
        } catch {
          gate.fail(
            new CommunicationsError(
              "disconnected",
              "Telnyx registration failed.",
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
              "Telnyx registration failed.",
            );
      } finally {
        signal.removeEventListener("abort", abort);
        creating = false;
        cancelRegistration = undefined;
      }
    },
    async refreshToken(input, signal) {
      const token = parseVoiceAccessToken(input);
      const sdk = client;
      if (disposed || signal.aborted)
        throw new CommunicationsError("cancelled", "Telnyx renewal cancelled.");
      if (!sdk || !registered || !sdk.connected)
        throw new CommunicationsError(
          "disconnected",
          "Telnyx socket is not registered.",
        );
      if (refreshing)
        throw new CommunicationsError(
          "invalid-transition",
          "Telnyx renewal is already pending.",
        );
      refreshing = true;
      const currentEpoch = epoch;
      const gate = voiceReadyGate(signal, timeout);
      failRenewal = (error) => gate.fail(error);
      try {
        try {
          void Promise.resolve(
            sdk.login({
              creds: { login_token: token.token },
              onSuccess: () => {
                if (disposed || signal.aborted || currentEpoch !== epoch)
                  gate.fail(
                    new CommunicationsError(
                      "cancelled",
                      "Telnyx renewal cancelled.",
                    ),
                  );
                else if (!sdk.connected)
                  gate.fail(
                    new CommunicationsError(
                      "disconnected",
                      "Telnyx renewal lost its socket.",
                    ),
                  );
                else gate.ready();
              },
              onError: () =>
                gate.fail(
                  new CommunicationsError(
                    "disconnected",
                    "Telnyx renewal failed.",
                  ),
                ),
            }),
          ).then(
            () => {
              // A resolved login without an authentication callback is not success.
              if (!sdk.connected)
                gate.fail(
                  new CommunicationsError(
                    "disconnected",
                    "Telnyx renewal lost its socket.",
                  ),
                );
            },
            () =>
              gate.fail(
                new CommunicationsError(
                  "disconnected",
                  "Telnyx renewal failed.",
                ),
              ),
          );
        } catch {
          gate.fail(
            new CommunicationsError("disconnected", "Telnyx renewal failed."),
          );
        }
        await gate.promise;
      } finally {
        refreshing = false;
        failRenewal = undefined;
      }
    },
    async reconnect(signal) {
      if (disposed)
        throw new CommunicationsError(
          "disposed",
          "Telnyx browser binding disposed.",
        );
      const sdk = client;
      if (!sdk)
        throw new CommunicationsError(
          "disconnected",
          "Telnyx client is unavailable.",
        );
      if (registered && sdk.connected) return;
      if (recovering)
        throw new CommunicationsError(
          "invalid-transition",
          "Telnyx recovery is already pending.",
        );
      recovering = true;
      const gate = voiceReadyGate(signal, timeout);
      cancelRecovery = () =>
        gate.fail(
          new CommunicationsError("cancelled", "Telnyx recovery cancelled."),
        );
      const unsubscribe = channel.subscribe((event) => {
        if (event.type === "ready") gate.ready();
        if (event.type === "error")
          gate.fail(
            new CommunicationsError("disconnected", "Telnyx recovery failed."),
          );
      });
      try {
        if (!signal.aborted) {
          try {
            void Promise.resolve(sdk.connect()).catch(() =>
              gate.fail(
                new CommunicationsError(
                  "disconnected",
                  "Telnyx recovery failed.",
                ),
              ),
            );
          } catch {
            gate.fail(
              new CommunicationsError(
                "disconnected",
                "Telnyx recovery failed.",
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
      const currentEpoch = epoch;
      // Explicit consumer accept is the microphone consent action; connect and
      // incoming events never acquire media. Actual answer/bridge is event-driven.
      await nativeOperation(async () => {
        const answered = item.native.answer({ audio: true, video: false });
        void answered
          .then(() => {
            if (disposed || currentEpoch !== epoch) {
              releaseCallMedia(item.native);
              try {
                void item.native.hangup().catch(() => {});
              } catch {
                /* Only local closure is claimed. */
              }
            }
          })
          .catch(() => {});
        await answered;
        if (disposed || currentEpoch !== epoch)
          throw new CommunicationsError(
            "cancelled",
            "Telnyx answer cancelled.",
          );
        item.view = describe(item.native);
      });
    },
    async decline(id) {
      const item = requireCall(id, ["ringing"], false);
      await nativeOperation(() => item.native.hangup());
    },
    async hangup(id) {
      const item = requireCall(
        id,
        ["ringing", "connecting", "active", "held", "reconnecting"],
        false,
      );
      await nativeOperation(() => item.native.hangup());
    },
    async setMuted(id, muted) {
      if (typeof muted !== "boolean")
        throw new CommunicationsError(
          "invalid-argument",
          "Invalid mute value.",
        );
      const item = requireCall(id, ["active", "held"]);
      await nativeOperation(() => {
        if (muted) item.native.muteAudio();
        else item.native.unmuteAudio();
        item.view = describe(item.native);
        channel.emit({ type: "call", call: { ...item.view } });
      });
    },
    async sendDtmf(id, digit) {
      if (typeof digit !== "string" || !/^[0-9*#]$/.test(digit))
        throw new CommunicationsError(
          "invalid-argument",
          "Use one DTMF keypad digit.",
        );
      const item = requireCall(id, ["active"]);
      await nativeOperation(() => item.native.dtmf(digit));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      lifecycle.abort();
      cleanup();
      channel.clear();
    },
  };
}
