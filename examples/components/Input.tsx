"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";

export default function InputExample() {
  const id = useId();
  const [email, setEmail] = useState("");

  return (
    <div className="grid max-w-sm gap-2">
      <label htmlFor={id} className="text-xs font-semibold">
        Work email
      </label>
      <Input
        id={id}
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        value={email}
        aria-describedby={`${id}-hint`}
        onChange={(event) => setEmail(event.target.value)}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        This example keeps the value in local React state.
      </p>
    </div>
  );
}
