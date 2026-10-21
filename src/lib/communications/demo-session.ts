import { createDemoCommunicationsAdapter } from "./demo-adapter";
import type {
  CommunicationsProvider,
  DemoCommunicationsAdapter,
} from "./contracts";

const browserSessions = new Map<
  CommunicationsProvider,
  DemoCommunicationsAdapter
>();
let pageListenerInstalled = false;

/**
 * The website's local lab keeps a session across same-tab client navigation.
 * No session, caller, notes or tokens are written to browser storage.
 * Consumers can instead own an adapter in their application's stable provider.
 */
export function getDemoCommunicationsSession(provider: CommunicationsProvider) {
  if (typeof window === "undefined") {
    return createDemoCommunicationsAdapter({ provider });
  }
  if (!pageListenerInstalled) {
    window.addEventListener("pagehide", (event) => {
      if (event.persisted) return;
      for (const session of browserSessions.values()) session.dispose();
      browserSessions.clear();
    });
    pageListenerInstalled = true;
  }
  let session = browserSessions.get(provider);
  if (!session) {
    session = createDemoCommunicationsAdapter({ provider });
    browserSessions.set(provider, session);
  }
  return session;
}
