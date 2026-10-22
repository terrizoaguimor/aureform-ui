"use client";

import { Providers } from "@/components/providers";
import {
  ConnectedSoftphone,
  type ConnectedSoftphoneLiveProps,
  type ConnectedTelnyxSdkLoader,
  type ConnectedTwilioSdkLoader,
} from "@/components/communications/connected-softphone";

/**
 * Inert default: no setup HTTP, carrier SDK, microphone or real call.
 * Loader callbacks, authentication and ownership remain inside Client Components.
 */
export default function CommunicationsConnectedExample() {
  return (
    <Providers locale="en">
      <ConnectedSoftphone />
    </Providers>
  );
}

/** A lazy constructor projection; invoking this factory does not import the SDK. */
export function createTwilioLoadSdk(
  importOfficialSdk: ConnectedTwilioSdkLoader,
): ConnectedTwilioSdkLoader {
  return async () => {
    const sdkModule = await importOfficialSdk();
    return { Device: sdkModule.Device };
  };
}

/** Telnyx audio is mounted/owned by ConnectedSoftphone, not a global element ID. */
export function createTelnyxLoadSdk(
  importOfficialSdk: ConnectedTelnyxSdkLoader,
): ConnectedTelnyxSdkLoader {
  return async () => {
    const sdkModule = await importOfficialSdk();
    return { TelnyxRTC: sdkModule.TelnyxRTC };
  };
}

/**
 * The adopting app installs optional @twilio/voice-sdk@2.18.5 and/or
 * @telnyx/webrtc@2.28.0 separately. The actual published constructors have been
 * checked against these loader types. Consumer Client Component example:
 *
 * const twilioLoadSdk = createTwilioLoadSdk(() => import("@twilio/voice-sdk"));
 * const telnyxLoadSdk = createTelnyxLoadSdk(() => import("@telnyx/webrtc"));
 *
 * <AuthenticatedConnectedSoftphoneExample
 *   backendUrl="https://voice.your-app.example/v1/communications"
 *   trustedBackendOrigins={["https://voice.your-app.example"]}
 *   provider="twilio"
 *   authSessionKey={authenticatedSession.nonsecretPrincipalKey}
 *   getAuthHeaders={() => authenticatedSession.getVoiceAuthHeaders()}
 *   twilioLoadSdk={twilioLoadSdk}
 *   telnyxLoadSdk={telnyxLoadSdk}
 * />
 *
 * setupBackendUrl optionally supplies a separate approved HTTPS mount ending
 * in /v1/communications/setup. Omit it for one HTTPS voice/setup backend;
 * otherwise list both origins in trustedBackendOrigins. Voice REST and SSE
 * always use backendUrl. Quick Tunnels do not support SSE (verified 2026-10-21):
 * https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
 *
 * Supply the current opaque app Bearer or opt into authMode="cookie-csrf" with
 * an authenticated CSRF header/controlled fetch. Never pass carrier keys or a
 * setup login access code to this host. Login/bootstrap belongs to the app.
 * authSessionKey changes on identity changes, not ordinary token renewal.
 * To resume a vault-backed number after refresh, the authenticated app can GET
 * /v1/communications/setup/connections and pass its selected public summary as
 * initialConfiguration. Only the first supplied summary is consumed; no setup
 * apply, SDK registration or test call happens during that restoration.
 * Keep this host outside route/locale content if calls must survive navigation.
 * Configuration does not connect a browser or prove webhook/media/call delivery.
 */
export function AuthenticatedConnectedSoftphoneExample(
  props: Omit<ConnectedSoftphoneLiveProps, "mode">,
) {
  return (
    <Providers locale="en">
      <ConnectedSoftphone mode="live" {...props} />
    </Providers>
  );
}
