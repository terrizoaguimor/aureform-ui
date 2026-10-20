import type { IntegrationRecord } from "@/lib/integrations/contracts";

export type OperationalEmailProvider =
  "resend" | "postmark" | "sendgrid" | "ses";
export type OperationalEmailEventContext = {
  /** An authorized, tenant-scoped event/recipient ID chosen by the backend. */
  id: string;
  name: string;
  /** Provider event time, supplied after backend verification/reconciliation. */
  updatedAt: string;
  description?: string;
  recipient?: string;
};

const statuses: Record<string, readonly [string, string]> = {
  queued: ["Queued", "En cola"],
  sent: ["Sent", "Enviado"],
  delivered: ["Delivered", "Entregado"],
  failed: ["Failed", "Falló"],
  rejected: ["Rejected", "Rechazado"],
  bounced: ["Bounced", "Rebotado"],
};

export function operationalEmailStatus(status: string) {
  const known = Object.hasOwn(statuses, status);
  return {
    label: known ? statuses[status] : ([status, status] as const),
    variant: (["failed", "rejected", "bounced"].includes(status)
      ? "destructive"
      : status === "queued"
        ? "warning"
        : "neutral") as "destructive" | "warning" | "neutral",
    known,
  };
}

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function own(value: Record<string, unknown>, key: string) {
  return Object.hasOwn(value, key) ? value[key] : undefined;
}

function boundedText(value: unknown, max: number): string | null {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= max &&
    !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : null;
}

export function reportedEmailDetails(delivery: {
  status: string;
  reasonCode?: unknown;
  disposition?: unknown;
  occurredAt?: unknown;
}) {
  const occurredAt = boundedText(delivery.occurredAt, 100);
  return {
    reasonCode: boundedText(delivery.reasonCode, 300),
    disposition: boundedText(delivery.disposition, 300),
    occurredAt:
      occurredAt && Number.isFinite(Date.parse(occurredAt)) ? occurredAt : null,
  };
}

const nativeStatuses: Record<
  OperationalEmailProvider,
  Record<string, string>
> = {
  resend: {
    "email.scheduled": "queued",
    "email.sent": "sent",
    "email.delivered": "delivered",
    "email.failed": "failed",
    "email.bounced": "bounced",
    "email.suppressed": "rejected",
  },
  postmark: {
    Delivery: "delivered",
    Bounce: "bounced",
  },
  sendgrid: {
    processed: "queued",
    delivered: "delivered",
    bounce: "bounced",
    dropped: "rejected",
  },
  ses: {
    Send: "sent",
    Delivery: "delivered",
    Bounce: "bounced",
    Reject: "rejected",
    "Rendering Failure": "failed",
  },
};

/**
 * Pure DTO mapping for an already verified/unwrapped provider event.
 * It is not a webhook verifier, SDK transport or delivery-state reducer.
 * Unknown event types remain records with their exact reported status.
 */
export function mapOperationalEmailEvent(
  provider: OperationalEmailProvider,
  payload: unknown,
  context: OperationalEmailEventContext,
): IntegrationRecord {
  if (!Object.hasOwn(nativeStatuses, provider))
    throw new TypeError("Unsupported email event provider.");
  const event = object(payload);
  const data = object(own(event, "data"));
  const nativeEvent = boundedText(
    provider === "resend"
      ? own(event, "type")
      : provider === "postmark"
        ? own(event, "RecordType")
        : provider === "sendgrid"
          ? own(event, "event")
          : (own(event, "eventType") ?? own(event, "notificationType")),
    100,
  );
  if (!nativeEvent)
    throw new TypeError("A bounded native email event type is required.");
  const mapping = nativeStatuses[provider];
  let status = Object.hasOwn(mapping, nativeEvent)
    ? mapping[nativeEvent]
    : nativeEvent;
  let reasonCode: unknown;
  let disposition: unknown;
  if (provider === "resend") {
    const bounce = object(own(data, "bounce"));
    const suppressed = object(own(data, "suppressed"));
    reasonCode =
      nativeEvent === "email.bounced"
        ? own(bounce, "subType")
        : nativeEvent === "email.suppressed"
          ? own(suppressed, "type")
          : undefined;
    disposition = own(bounce, "type");
  } else if (provider === "postmark") {
    disposition = own(event, "Type");
    const code = own(event, "TypeCode");
    if (typeof code === "number" && Number.isSafeInteger(code) && code >= 0)
      reasonCode = String(code);
    if (nativeEvent === "Bounce" && disposition === "SMTPApiError")
      status = "rejected";
  } else if (provider === "sendgrid") {
    // SMTP status is a code; free-form reason/response, headers, IPs, custom
    // arguments and email content are intentionally not copied into the DTO.
    reasonCode = own(event, "status");
    disposition = own(event, "type");
  } else {
    const bounce = object(own(event, "bounce"));
    reasonCode =
      nativeEvent === "Reject"
        ? own(object(own(event, "reject")), "reason")
        : own(bounce, "bounceSubType");
    disposition = own(bounce, "bounceType");
  }
  const details = reportedEmailDetails({ status, reasonCode, disposition });
  const id = boundedText(context.id, 200);
  const name = boundedText(context.name, 300);
  const updatedAt = boundedText(context.updatedAt, 100);
  if (
    !id ||
    !name ||
    !updatedAt ||
    !Number.isFinite(Date.parse(updatedAt)) ||
    (context.description !== undefined &&
      (typeof context.description !== "string" ||
        context.description.length > 2000)) ||
    (context.recipient !== undefined && !boundedText(context.recipient, 500))
  )
    throw new TypeError(
      "A bounded, authorized email event context is required.",
    );
  return {
    id,
    name,
    type: "email-delivery",
    status,
    updatedAt,
    description: context.description ?? "",
    fields: {
      provider,
      nativeEvent,
      ...(context.recipient ? { recipient: context.recipient } : {}),
      ...(details.reasonCode ? { reasonCode: details.reasonCode } : {}),
      ...(details.disposition ? { disposition: details.disposition } : {}),
    },
  };
}
