"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP } from "@/components/ui/input-otp";

export default function InputOTPExample() {
  const [code, setCode] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  return (
    <fieldset className="grid justify-items-start gap-3">
      <legend className="mb-3 text-xs font-semibold">Verification code</legend>
      <InputOTP
        label="Six-digit verification code"
        length={6}
        value={code}
        onChange={(value) => {
          setCode(value);
          setConfirmed(false);
        }}
      />
      <Button
        type="button"
        disabled={code.length !== 6}
        onClick={() => setConfirmed(true)}
      >
        Check code locally
      </Button>
      <p role="status" className="text-xs text-muted-foreground">
        {confirmed
          ? "Six digits entered; no verification request sent."
          : "Enter six digits."}
      </p>
    </fieldset>
  );
}
