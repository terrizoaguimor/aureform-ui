import { z } from "zod";
import type { CommunicationsProvider } from "./contracts";

/** Public DTOs only. Carrier credentials never belong in a snapshot or result. */
export const communicationsSetupVersion = "aureform.setup.v1" as const;

const identifier = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[\w.:@+-]+$/);
const connectionIdentifier = z.uuid({ version: "v4" });
const text = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^[^\u0000-\u001f\u007f]+$/);
const provider = z.enum(["twilio", "telnyx"]);

export const communicationsSetupCredentialsSchema = z.discriminatedUnion(
  "provider",
  [
    z
      .object({
        provider: z.literal("twilio"),
        accountSid: z.string().regex(/^AC[0-9a-f]{32}$/i),
        authToken: z.string().regex(/^[A-Za-z0-9]{32,128}$/),
      })
      .strict(),
    z
      .object({
        provider: z.literal("telnyx"),
        apiKey: z
          .string()
          .min(20)
          .max(1024)
          .regex(/^[^\s\u007f]+$/),
        // Canonical base64 for a 32-byte Ed25519 verification public key.
        publicKey: z.string().regex(/^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/),
      })
      .strict(),
  ],
);
export type CommunicationsSetupCredentials = z.infer<
  typeof communicationsSetupCredentialsSchema
>;

export const communicationsSetupNumberSchema = z
  .object({
    id: identifier,
    phoneNumber: z.string().regex(/^\+[1-9]\d{6,14}$/),
    label: text(160),
    voiceEnabled: z.boolean(),
    hasExistingRouting: z.boolean(),
  })
  .strict();
export type CommunicationsSetupNumber = z.infer<
  typeof communicationsSetupNumberSchema
>;

const envelope = {
  contractVersion: z.literal(communicationsSetupVersion),
  connectionId: connectionIdentifier,
  provider,
};

export const communicationsSetupInspectionSchema = z
  .object({
    ...envelope,
    accountLabel: text(160),
    numbers: z.array(communicationsSetupNumberSchema).max(1000),
    phase: z.literal("select-number"),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.numbers.map((number) => number.id)).size ===
      value.numbers.length,
    { message: "Duplicate number identifiers." },
  );
export type CommunicationsSetupInspection = z.infer<
  typeof communicationsSetupInspectionSchema
>;

export const communicationsSetupPlanSchema = z
  .object({
    ...envelope,
    planId: connectionIdentifier,
    number: communicationsSetupNumberSchema,
    expiresAt: z.iso.datetime({ offset: true }),
    steps: z
      .array(
        z
          .object({
            id: identifier.max(100),
            label: text(240),
            kind: z.enum(["create", "reuse", "update", "verify"]),
          })
          .strict(),
      )
      .min(1)
      .max(64),
    willReplaceRouting: z.boolean(),
    phase: z.literal("review"),
  })
  .strict()
  .refine(
    (value) =>
      value.number.voiceEnabled &&
      new Set(value.steps.map((step) => step.id)).size === value.steps.length,
    { message: "Invalid number or plan steps." },
  );
export type CommunicationsSetupPlan = z.infer<
  typeof communicationsSetupPlanSchema
>;

export const setupErrorMessages = {
  "invalid-credentials": "Check both credential fields and try again.",
  "authentication-required": "Sign in to the authenticated host to continue.",
  "permission-denied": "This account does not permit the requested setup.",
  "invalid-configuration": "Authenticated setup is unavailable.",
  "network-error": "The setup service could not be reached.",
  "invalid-response": "The setup service returned an invalid response.",
  "number-not-eligible": "Choose an existing voice-enabled number.",
  "setup-confirmation-required": "Review and confirm the configuration first.",
  "routing-replacement-confirmation-required":
    "Confirm replacing the selected number's existing routing.",
  "setup-plan-expired": "This plan has expired. Review a new plan.",
  "setup-connection-expired": "This setup session has expired. Inspect again.",
  "setup-failed": "Setup needs attention. Check the result before continuing.",
  "setup-reconciliation-required":
    "The setup result is not confirmed. Check its status before continuing.",
  "setup-busy": "A setup request is already in progress.",
  "invalid-state": "Complete the previous setup step first.",
  "request-cancelled": "The setup request was cancelled.",
  disposed: "This setup session is no longer available.",
  "demo-only": "The local demo accepts read-only fixture credentials only.",
} as const;
export type CommunicationsSetupErrorCode = keyof typeof setupErrorMessages;
export type CommunicationsSetupPublicError = Readonly<{
  code: CommunicationsSetupErrorCode;
  message: string;
}>;

export function setupPublicError(
  code: CommunicationsSetupErrorCode,
): CommunicationsSetupPublicError {
  return Object.freeze({ code, message: setupErrorMessages[code] });
}

/** Never retain a provider message, response body, credential or raw cause. */
export class CommunicationsSetupError extends Error {
  readonly code: CommunicationsSetupErrorCode;
  constructor(code: CommunicationsSetupErrorCode) {
    super(setupErrorMessages[code]);
    this.name = "CommunicationsSetupError";
    this.code = code;
  }
  toJSON(): CommunicationsSetupPublicError {
    return setupPublicError(this.code);
  }
}

const safeErrorSchema = z
  .object({
    code: z.enum(
      Object.keys(setupErrorMessages) as [
        CommunicationsSetupErrorCode,
        ...CommunicationsSetupErrorCode[],
      ],
    ),
    // Validate the wire field, then replace it with our fixed public copy.
    message: z.string().max(512).optional(),
  })
  .strict()
  .transform(({ code }) => setupPublicError(code));

const checksSchema = z
  .object({
    credentials: z.literal("passed"),
    webhooks: z.enum(["passed", "pending", "failed"]),
    browser: z.literal("pending"),
    testCall: z.literal("pending"),
  })
  .strict();
const resultEnvelope = {
  ...envelope,
  number: communicationsSetupNumberSchema,
  checks: checksSchema,
  error: safeErrorSchema.optional(),
};

export const communicationsSetupConfiguredSchema = z
  .object({ ...resultEnvelope, phase: z.literal("configured") })
  .strict()
  .refine((value) => value.number.voiceEnabled, {
    message: "The configured number must support voice.",
  });
export type CommunicationsSetupConfigured = z.infer<
  typeof communicationsSetupConfiguredSchema
>;

export const communicationsSetupResultSchema = z.discriminatedUnion("phase", [
  communicationsSetupConfiguredSchema,
  z.object({ ...resultEnvelope, phase: z.literal("failed") }).strict(),
  z.object({ ...resultEnvelope, phase: z.literal("unknown") }).strict(),
]);
export type CommunicationsSetupResult = z.infer<
  typeof communicationsSetupResultSchema
>;

/** GET status may observe an apply in progress or a pre-plan connection. */
export const communicationsSetupStatusSchema = z.discriminatedUnion("phase", [
  ...communicationsSetupResultSchema.options,
  z.object({ ...resultEnvelope, phase: z.literal("configuring") }).strict(),
  z
    .object({
      ...envelope,
      number: z.null(),
      checks: checksSchema,
      phase: z.literal("select-number"),
      error: safeErrorSchema.optional(),
    })
    .strict()
    .refine((value) => value.checks.webhooks === "pending", {
      message: "No routing has been configured.",
    }),
]);
export type CommunicationsSetupStatus = z.infer<
  typeof communicationsSetupStatusSchema
>;

export const communicationsSetupConfirmationSchema = z
  .object({
    configure: z.literal(true),
    replaceExistingRouting: z.boolean(),
  })
  .strict();
export type CommunicationsSetupConfirmation = z.infer<
  typeof communicationsSetupConfirmationSchema
>;

export type CommunicationsSetupPhase =
  | "credentials"
  | "select-number"
  | "review"
  | "configuring"
  | "configured"
  | "failed"
  | "unknown";
export type CommunicationsSetupSnapshot = Readonly<{
  mode: "demo" | "live";
  provider: CommunicationsProvider;
  phase: CommunicationsSetupPhase;
  busy: "inspect" | "plan" | "apply" | "status" | null;
  inspection: CommunicationsSetupInspection | null;
  plan: CommunicationsSetupPlan | null;
  result: CommunicationsSetupStatus | null;
  error: CommunicationsSetupPublicError | null;
}>;

export interface CommunicationsSetupAdapter {
  readonly mode: "demo" | "live";
  getSnapshot(): CommunicationsSetupSnapshot;
  getServerSnapshot(): CommunicationsSetupSnapshot;
  subscribe(listener: () => void): () => void;
  setProvider(provider: CommunicationsProvider): void;
  inspect(
    credentials: CommunicationsSetupCredentials,
  ): Promise<CommunicationsSetupInspection>;
  plan(numberId: string): Promise<CommunicationsSetupPlan>;
  apply(
    confirmation: CommunicationsSetupConfirmation,
  ): Promise<CommunicationsSetupResult>;
  reconcile(connectionId?: string): Promise<CommunicationsSetupStatus>;
  back(): void;
  /** Abort outstanding work; a dispatched apply stays reconciliation-only. */
  cancel(): void;
  dispose(): void;
}
