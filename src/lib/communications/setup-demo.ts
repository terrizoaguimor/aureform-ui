import type { CommunicationsProvider } from "./contracts";
import { createSetupController } from "./setup-adapter";
import {
  CommunicationsSetupError,
  communicationsSetupVersion,
  setupPublicError,
  type CommunicationsSetupAdapter,
  type CommunicationsSetupCredentials,
  type CommunicationsSetupNumber,
  type CommunicationsSetupPlan,
  type CommunicationsSetupStatus,
} from "./setup-contracts";

/** Public, deliberately fictitious and read-only. These are not carrier keys. */
const credentials = {
  twilio: Object.freeze({
    provider: "twilio",
    accountSid: "AC00000000000000000000000000000000",
    authToken: "DEMOONLYDEMOONLYDEMOONLYDEMOONLY",
  }),
  telnyx: Object.freeze({
    provider: "telnyx",
    apiKey: "DEMOONLYTELNYXAPIKEY00000000000000",
    publicKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  }),
} satisfies Record<CommunicationsProvider, CommunicationsSetupCredentials>;

export function getCommunicationsSetupDemoCredentials(
  provider: CommunicationsProvider,
): CommunicationsSetupCredentials {
  return credentials[provider];
}

export type CommunicationsSetupDemoScenario =
  | "ready"
  | "single-number"
  | "empty"
  | "no-voice"
  | "invalid-credentials"
  | "permission-denied"
  | "network-error"
  | "unknown"
  | "failed"
  | "configuring";

export type DemoCommunicationsSetupAdapterOptions = {
  provider?: CommunicationsProvider;
  scenario?: CommunicationsSetupDemoScenario;
  latencyMs?: number;
  now?: () => number;
};

function numbersFor(
  provider: CommunicationsProvider,
): CommunicationsSetupNumber[] {
  return [
    {
      id: `demo-${provider}-support`,
      phoneNumber: "+12025550100",
      label: "Support line · demo",
      voiceEnabled: true,
      hasExistingRouting: false,
    },
    {
      id: `demo-${provider}-existing`,
      phoneNumber: "+12025550101",
      label: "Existing routing · demo",
      voiceEnabled: true,
      hasExistingRouting: true,
    },
    {
      id: `demo-${provider}-messages`,
      phoneNumber: "+12025550102",
      label: "Messaging-only line · demo",
      voiceEnabled: false,
      hasExistingRouting: false,
    },
  ];
}

/**
 * Fixture-only setup: no fetch, auth, SDK, persistence, devices or carrier API.
 * Arbitrary credential input is rejected rather than silently inspected.
 */
export function createDemoCommunicationsSetupAdapter(
  options: DemoCommunicationsSetupAdapterOptions = {},
): CommunicationsSetupAdapter {
  const scenario = options.scenario ?? "ready";
  const delay = options.latencyMs ?? 180;
  if (!Number.isFinite(delay) || delay < 0 || delay > 5000)
    throw new CommunicationsSetupError("invalid-configuration");
  const now = options.now ?? Date.now;
  let inspectionProvider = options.provider ?? "twilio";
  let plan: CommunicationsSetupPlan | null = null;
  let applied = false;
  let statusReads = 0;
  const connectionFor = (provider: CommunicationsProvider) =>
    provider === "twilio"
      ? "11111111-1111-4111-8111-111111111111"
      : "22222222-2222-4222-8222-222222222222";

  async function pause(signal: AbortSignal) {
    if (signal.aborted) throw new CommunicationsSetupError("request-cancelled");
    if (!delay) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, delay);
      function abort() {
        clearTimeout(timer);
        reject(new CommunicationsSetupError("request-cancelled"));
      }
      signal.addEventListener("abort", abort, { once: true });
    });
  }

  function result(
    phase: "configured" | "failed" | "unknown" | "configuring",
  ): CommunicationsSetupStatus {
    if (!plan) throw new CommunicationsSetupError("invalid-state");
    return {
      contractVersion: communicationsSetupVersion,
      connectionId: plan.connectionId,
      provider: plan.provider,
      number: plan.number,
      phase,
      checks: {
        credentials: "passed",
        webhooks: phase === "configured" ? "passed" : "pending",
        browser: "pending",
        testCall: "pending",
      },
      ...(phase === "failed" || phase === "unknown"
        ? { error: setupPublicError("setup-reconciliation-required") }
        : {}),
    };
  }

  return createSetupController({
    mode: "demo",
    provider: options.provider,
    now,
    operations: {
      async inspect(input, signal) {
        const fixture = credentials[input.provider];
        if (
          input.provider === "twilio"
            ? fixture.provider !== "twilio" ||
              input.accountSid !== fixture.accountSid ||
              input.authToken !== fixture.authToken
            : fixture.provider !== "telnyx" ||
              input.apiKey !== fixture.apiKey ||
              input.publicKey !== fixture.publicKey
        )
          throw new CommunicationsSetupError("demo-only");
        await pause(signal);
        if (
          scenario === "invalid-credentials" ||
          scenario === "permission-denied" ||
          scenario === "network-error"
        )
          throw new CommunicationsSetupError(scenario);
        inspectionProvider = input.provider;
        plan = null;
        applied = false;
        statusReads = 0;
        const numbers =
          scenario === "empty"
            ? []
            : scenario === "single-number"
              ? numbersFor(input.provider).slice(0, 1)
              : numbersFor(input.provider);
        return {
          contractVersion: communicationsSetupVersion,
          connectionId: connectionFor(input.provider),
          provider: input.provider,
          accountLabel: `${input.provider === "twilio" ? "Twilio" : "Telnyx"} demo account`,
          numbers:
            scenario === "no-voice"
              ? numbers.map((number) => ({ ...number, voiceEnabled: false }))
              : numbers,
          phase: "select-number",
        };
      },
      async plan(input, signal) {
        await pause(signal);
        const number = numbersFor(inspectionProvider).find(
          (value) => value.id === input.numberId,
        );
        if (!number?.voiceEnabled)
          throw new CommunicationsSetupError("number-not-eligible");
        plan = {
          contractVersion: communicationsSetupVersion,
          connectionId: input.connectionId,
          planId:
            inspectionProvider === "twilio"
              ? "33333333-3333-4333-8333-333333333333"
              : "44444444-4444-4444-8444-444444444444",
          provider: inspectionProvider,
          number,
          expiresAt: new Date(now() + 600000).toISOString(),
          steps: [
            {
              id: "voice-application",
              label: "Prepare browser voice application",
              kind: "create",
            },
            {
              id: "inbound-routing",
              label: "Set inbound number routing",
              kind: number.hasExistingRouting ? "update" : "create",
            },
            {
              id: "webhook-verification",
              label: "Verify webhook configuration",
              kind: "verify",
            },
          ],
          willReplaceRouting: number.hasExistingRouting,
          phase: "review",
        };
        return plan;
      },
      async apply(_input, signal, dispatched) {
        dispatched();
        await pause(signal);
        applied = true;
        return result(
          scenario === "unknown" || scenario === "configuring"
            ? "unknown"
            : scenario === "failed"
              ? "failed"
              : "configured",
        );
      },
      async status(connectionId, signal) {
        await pause(signal);
        statusReads += 1;
        if (applied) {
          return result(
            scenario === "failed"
              ? "failed"
              : scenario === "configuring" && statusReads === 1
                ? "configuring"
                : "configured",
          );
        }
        return {
          contractVersion: communicationsSetupVersion,
          connectionId,
          provider: inspectionProvider,
          number: null,
          phase: "select-number",
          checks: {
            credentials: "passed",
            webhooks: "pending",
            browser: "pending",
            testCall: "pending",
          },
        };
      },
    },
  });
}
