"use client";

import {
  Headphones,
  LoaderCircle,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Play,
  RotateCcw,
  ShieldAlert,
  Signal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SoftphoneState =
  | "idle"
  | "ringing"
  | "active"
  | "held"
  | "recovering"
  | "permission-denied"
  | "error";

export type SoftphoneLabels = {
  idle: string;
  ringing: string;
  active: string;
  held: string;
  recovering: string;
  permissionDenied: string;
  error: string;
  accept: string;
  decline: string;
  hangup: string;
  mute: string;
  unmute: string;
  hold: string;
  resume: string;
  reconnect: string;
  testDevice: string;
  idleDescription: string;
  ringingDescription: string;
  activeDescription: string;
  recoveringDescription: string;
  permissionDescription: string;
  errorDescription: string;
};

const defaultLabels: SoftphoneLabels = {
  idle: "Your call workspace",
  ringing: "Incoming call",
  active: "In a call",
  held: "On hold",
  recovering: "Reconnecting",
  permissionDenied: "Microphone permission denied",
  error: "Connection unavailable",
  accept: "Answer",
  decline: "Decline",
  hangup: "End call",
  mute: "Mute",
  unmute: "Unmute",
  hold: "Hold",
  resume: "Resume",
  reconnect: "Reconnect",
  testDevice: "Test device",
  idleDescription:
    "Connect your session to receive calls from the support queue.",
  ringingDescription: "A caller is waiting. Answer when you are ready.",
  activeDescription:
    "Mute and call status are separate from the connection state.",
  recoveringDescription:
    "Signaling was interrupted. The remote call remains open until the backend confirms its end.",
  permissionDescription:
    "Allow microphone access in your browser, then test the device again.",
  errorDescription:
    "Review the connection and reconnect when the service is available.",
};

export function formatCallDuration(seconds: number) {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return [
    hours || undefined,
    hours ? minutes : Math.floor(total / 60),
    remainder,
  ]
    .filter((part) => part !== undefined)
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export type SoftphoneProps = {
  state?: SoftphoneState;
  contact?: string;
  metadata?: string;
  seconds?: number;
  muted?: boolean;
  /** An answer was requested; the adapter has not confirmed the call yet. */
  pending?: boolean;
  busy?: boolean;
  holdAvailable?: boolean;
  disabled?: boolean;
  labels?: Partial<SoftphoneLabels>;
  onAccept?: () => void;
  onDecline?: () => void;
  onHangup?: () => void;
  onMute?: () => void;
  onHold?: () => void;
  onReconnect?: () => void;
  onTestDevice?: () => void;
  className?: string;
};

/** Controlled call surface. Runtime and provider credentials belong to an adapter. */
export function Softphone({
  state = "idle",
  contact,
  metadata,
  seconds = 0,
  muted = false,
  pending = false,
  busy = false,
  holdAvailable = false,
  disabled = false,
  labels: overrides,
  onAccept,
  onDecline,
  onHangup,
  onMute,
  onHold,
  onReconnect,
  onTestDevice,
  className,
}: SoftphoneProps) {
  const labels = { ...defaultLabels, ...overrides };
  const active = state === "active" || state === "held";
  const recovering = state === "recovering";
  const denied = state === "permission-denied";
  const failed = state === "error";
  const ringing = state === "ringing";
  const status = denied
    ? labels.permissionDenied
    : recovering
      ? labels.recovering
      : labels[
          state as Exclude<SoftphoneState, "permission-denied" | "recovering">
        ];
  const description = denied
    ? labels.permissionDescription
    : failed
      ? labels.errorDescription
      : recovering
        ? labels.recoveringDescription
        : ringing
          ? labels.ringingDescription
          : active
            ? labels.activeDescription
            : labels.idleDescription;
  const StatusIcon =
    denied || failed
      ? ShieldAlert
      : ringing
        ? PhoneIncoming
        : active
          ? Phone
          : Headphones;

  return (
    <Card
      className={cn(
        "relative grid content-start gap-4 overflow-hidden p-6",
        ringing && "border-primary/50",
        (denied || failed) && "border-destructive/45",
        className,
      )}
      data-testid="softphone-call-panel"
      data-softphone-state={state}
      aria-label={labels.idle}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[image:var(--af-gradient-primary)]"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge
          variant={
            denied || failed
              ? "destructive"
              : active || ringing
                ? "default"
                : "neutral"
          }
          data-testid="softphone-call-status"
          role="status"
          aria-live="polite"
        >
          {recovering ? (
            <LoaderCircle
              aria-hidden="true"
              className="motion-safe:animate-spin"
            />
          ) : (
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full bg-current",
                ringing && "motion-safe:animate-pulse",
              )}
            />
          )}
          {status}
        </Badge>
        <Signal aria-hidden="true" className="size-4 text-muted-foreground" />
      </div>
      <div className="pt-3">
        <span
          aria-hidden="true"
          className={cn(
            "mb-5 flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-accent text-primary",
            active &&
              "bg-[image:var(--af-gradient-primary)] text-primary-foreground",
          )}
        >
          <StatusIcon className="size-5" />
        </span>
        <h2 className="break-words text-2xl leading-9 font-semibold tracking-tight">
          {contact || labels.idle}
        </h2>
        {metadata && (
          <p className="mt-1 break-words text-[13px] leading-6 text-muted-foreground">
            {metadata}
          </p>
        )}
        {active && (
          <p
            className="mt-4 text-[32px] leading-10 font-medium tracking-tight tabular-nums"
            data-testid="softphone-duration"
            aria-label={formatCallDuration(seconds)}
          >
            {formatCallDuration(seconds)}
          </p>
        )}
      </div>

      {ringing && pending ? (
        <Button
          className="min-h-11"
          variant="destructive"
          data-testid="softphone-hangup"
          onClick={onHangup}
          loading={busy}
          disabled={disabled || !onHangup}
        >
          <PhoneOff aria-hidden="true" />
          {labels.hangup}
        </Button>
      ) : ringing ? (
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
          <Button
            className="min-h-11"
            appearance="gradient"
            data-testid="softphone-accept"
            onClick={onAccept}
            loading={busy}
            disabled={disabled || !onAccept}
          >
            <Phone aria-hidden="true" />
            {labels.accept}
          </Button>
          <Button
            className="min-h-11"
            variant="outline"
            data-testid="softphone-decline"
            onClick={onDecline}
            disabled={busy || disabled || !onDecline}
          >
            <PhoneOff aria-hidden="true" />
            {labels.decline}
          </Button>
        </div>
      ) : active ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="min-h-11"
              variant="outline"
              data-testid="softphone-mute"
              aria-pressed={muted}
              onClick={onMute}
              disabled={busy || disabled || !onMute}
            >
              {muted ? (
                <MicOff aria-hidden="true" />
              ) : (
                <Mic aria-hidden="true" />
              )}
              {muted ? labels.unmute : labels.mute}
            </Button>
            <Button
              className="min-h-11"
              variant="outline"
              data-testid="softphone-hold"
              aria-pressed={state === "held"}
              onClick={onHold}
              disabled={busy || disabled || !onHold || !holdAvailable}
            >
              {state === "held" ? (
                <Play aria-hidden="true" />
              ) : (
                <Pause aria-hidden="true" />
              )}
              {state === "held" ? labels.resume : labels.hold}
            </Button>
          </div>
          <Button
            className="min-h-11"
            variant="destructive"
            data-testid="softphone-hangup"
            onClick={onHangup}
            loading={busy}
            disabled={disabled || !onHangup}
          >
            <PhoneOff aria-hidden="true" />
            {labels.hangup}
          </Button>
        </>
      ) : recovering || failed ? (
        <Button
          className="min-h-11 w-fit"
          variant="outline"
          data-testid="softphone-reconnect"
          onClick={onReconnect}
          loading={busy}
          disabled={disabled || !onReconnect}
        >
          <RotateCcw aria-hidden="true" />
          {labels.reconnect}
        </Button>
      ) : (
        <Button
          className="min-h-11 w-fit"
          variant="outline"
          data-testid="softphone-test-device"
          onClick={onTestDevice}
          disabled={busy || !onTestDevice}
        >
          <Headphones aria-hidden="true" />
          {labels.testDevice}
        </Button>
      )}
      {recovering && onHangup && (
        <Button
          className="min-h-11 w-fit"
          variant="destructive"
          data-testid="softphone-hangup"
          onClick={onHangup}
          loading={busy}
          disabled={disabled}
        >
          <PhoneOff aria-hidden="true" />
          {labels.hangup}
        </Button>
      )}
      <p className="text-[13px] leading-6 text-muted-foreground">
        {description}
      </p>
    </Card>
  );
}
