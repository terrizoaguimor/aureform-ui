"use client";

import { useState } from "react";
import { SoftphoneWorkspace } from "@/components/blocks/softphone-workspace";
import { getDemoCommunicationsSession } from "@/lib/communications/demo-session";
import type {
  CommunicationsAdapter,
  CommunicationsProvider,
} from "@/lib/communications/contracts";

export function SoftphoneTemplate({
  adapter,
}: {
  adapter?: CommunicationsAdapter;
}) {
  const [demoSession, setDemoSession] = useState(() =>
    getDemoCommunicationsSession("twilio"),
  );
  return (
    <SoftphoneWorkspace
      adapter={adapter ?? demoSession}
      onDemoProviderChange={
        adapter
          ? undefined
          : (provider: CommunicationsProvider) => {
              setDemoSession(getDemoCommunicationsSession(provider));
            }
      }
    />
  );
}
