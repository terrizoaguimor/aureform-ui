"use client";
import { OTPInput, REGEXP_ONLY_DIGITS } from "input-otp";
import { cn } from "@/lib/utils";
export function InputOTP({
  value,
  onChange,
  length = 6,
  label,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <OTPInput
      value={value}
      onChange={onChange}
      maxLength={length}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      aria-label={label}
      aria-invalid={invalid}
      disabled={disabled}
      containerClassName="flex gap-2"
      render={({ slots }) =>
        slots.map((slot, index) => (
          <div
            key={index}
            className={cn(
              "relative flex h-12 w-10 items-center justify-center rounded-md border border-border bg-surface text-lg font-semibold",
              slot.isActive && "border-ring ring-2 ring-ring/20",
              invalid && "border-destructive-foreground",
            )}
          >
            {slot.char ?? ""}
            {slot.hasFakeCaret && (
              <div className="h-5 w-px animate-pulse bg-foreground" />
            )}
          </div>
        ))
      }
    />
  );
}
