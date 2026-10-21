"use client";

import { Providers } from "@/components/providers";
import { SoftphoneWorkspace } from "@/components/blocks/softphone-workspace";
import type { CommunicationsAdapter } from "@/lib/communications/contracts";

/**
 * Local inbound-call demonstration. No carrier credentials, SDK connection,
 * provisioned number or real call is required.
 *
 * Keep an injected adapter inside a Client Component: adapters contain methods
 * and subscriptions, so they are not serializable Server Component props.
 */
export default function CommunicationsSoftphoneExample() {
  return (
    <Providers locale="en">
      <SoftphoneWorkspace />
    </Providers>
  );
}

/**
 * The consumer host creates and tears down its stable adapter. It can supply
 * createLiveCommunicationsAdapter with its authenticated backend and an
 * optional provider SDK factory. Connection still requires the user's action.
 */
export function InjectedCommunicationsSoftphoneExample({
  adapter,
}: {
  adapter: CommunicationsAdapter;
}) {
  return (
    <Providers locale="en">
      <SoftphoneWorkspace adapter={adapter} />
    </Providers>
  );
}
