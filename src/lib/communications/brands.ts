import type { CommunicationsProvider } from "./contracts";

export type CommunicationsBrand = {
  id: CommunicationsProvider;
  name: string;
  src: string;
  width: number;
  height: number;
  display: "symbol" | "wordmark";
  background: "light";
  sourceURL: string;
  trademarkTermsURL: string;
  rightsNotice: string;
};

/**
 * Static public references make the original artwork and its notices travel
 * together through the Aureform CLI's existing dependency/asset closure.
 * Third-party artwork and trademarks are excluded from Aureform's Apache grant.
 */
export const communicationsBrandNotices = {
  manifest: "/assets/communications/manifest.json",
  readme: "/assets/communications/README.md",
} as const;

/** Original, unmodified official-site SVGs; no account connectivity is implied. */
export const communicationsBrands: Readonly<
  Record<CommunicationsProvider, CommunicationsBrand>
> = {
  twilio: {
    id: "twilio",
    name: "Twilio",
    src: "/assets/communications/twilio.svg",
    width: 520,
    height: 520,
    display: "symbol",
    background: "light",
    sourceURL:
      "https://www.twilio.com/content/dam/twilio-com/core-assets/social/safari-pinned-tab.svg",
    trademarkTermsURL: "https://www.twilio.com/en-us/legal/trademark",
    rightsNotice:
      "Twilio and all related logos are trademarks of Twilio Inc. or its affiliates.",
  },
  telnyx: {
    id: "telnyx",
    name: "Telnyx",
    src: "/assets/communications/telnyx.svg",
    width: 128,
    height: 40,
    display: "wordmark",
    background: "light",
    sourceURL:
      "https://dila2qpfw3s64.cloudfront.net/_next/static/media/telnyx-logo-text.3ol7qfk480jrf.svg?dpl=1dfe2a0",
    trademarkTermsURL: "https://telnyx.com/media-kit",
    rightsNotice: "Telnyx and its logo are trademarks of Telnyx LLC.",
  },
};

export function getCommunicationsBrand(
  provider: CommunicationsProvider,
): CommunicationsBrand {
  return communicationsBrands[provider];
}
