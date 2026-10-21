import type { CommunicationsCall, CommunicationsProvider } from "./contracts";

/** Fictional NANP 555-01xx addresses; no number is provisioned by this kit. */
export const communicationsDemoNumber = "+12025550100";
export const communicationsDemoCallers = [
  {
    callerName: "Isabel Torres",
    company: "Inbound laboratory",
    from: "+12025550124",
  },
  {
    callerName: "Mateo Rivera",
    company: "Inbound laboratory",
    from: "+12025550125",
  },
  {
    callerName: "Lucía Moreno",
    company: "Inbound laboratory",
    from: "+12025550126",
  },
] as const;

/** Fixed Wednesday 09:00 Bogotá fixture time, safe for server/client rendering. */
export const COMMUNICATIONS_DEMO_INITIAL_INSTANT = 1_792_591_200_000;

/** Static, clearly local history; timestamps never depend on rendering time. */
export function createCommunicationsDemoHistory(
  provider: CommunicationsProvider,
): CommunicationsCall[] {
  return [
    {
      id: `demo-history-${provider}-1`,
      provider,
      direction: "inbound",
      callerName: "Isabel Torres",
      company: "Inbound laboratory",
      from: communicationsDemoCallers[0].from,
      to: communicationsDemoNumber,
      status: "completed",
      queuedAt: 1_792_588_500_000,
      startedAt: 1_792_588_506_000,
      answeredAt: 1_792_588_510_000,
      endedAt: 1_792_588_690_000,
      muted: false,
      notes: "Local example: the inbound support request was resolved.",
      disposition: "resolved",
      endReason: "agent-hangup",
    },
    {
      id: `demo-history-${provider}-2`,
      provider,
      direction: "inbound",
      callerName: "Mateo Rivera",
      company: "Inbound laboratory",
      from: communicationsDemoCallers[1].from,
      to: communicationsDemoNumber,
      status: "missed",
      queuedAt: 1_792_587_000_000,
      startedAt: 1_792_587_001_000,
      endedAt: 1_792_587_031_000,
      muted: false,
      notes: "Local example: the browser agent did not answer the offer.",
      disposition: "ring-timeout",
      endReason: "ring-timeout",
    },
    {
      id: `demo-history-${provider}-3`,
      provider,
      direction: "inbound",
      callerName: "Lucía Moreno",
      company: "Inbound laboratory",
      from: communicationsDemoCallers[2].from,
      to: communicationsDemoNumber,
      status: "missed",
      queuedAt: 1_792_542_600_000,
      endedAt: 1_792_542_600_000,
      muted: false,
      notes:
        "Local example: the arrival was outside configured business hours.",
      disposition: "after-hours",
      endReason: "after-hours",
    },
  ];
}
