"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function FieldExample() {
  const id = useId();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const error = touched && !valid ? "Enter a valid email address." : undefined;

  return (
    <form
      noValidate
      className="grid max-w-sm gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        setSaved(valid);
      }}
    >
      <Field
        htmlFor={id}
        label="Work email"
        description="We only use this value in the local example."
        error={error}
      >
        <Input
          id={id}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onBlur={() => setTouched(true)}
          onChange={(event) => {
            setEmail(event.target.value);
            setSaved(false);
          }}
        />
      </Field>
      <Button type="submit" className="justify-self-start">
        Save email locally
      </Button>
      <p role="status" className="text-xs text-muted-foreground">
        {saved ? "Email saved in this example." : "No changes submitted."}
      </p>
    </form>
  );
}
