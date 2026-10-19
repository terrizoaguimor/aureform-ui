"use client";

import { useId, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export default function TextareaExample() {
  const id = useId();
  const [description, setDescription] = useState("");
  const limit = 400;

  return (
    <div className="grid max-w-lg gap-2">
      <label htmlFor={id} className="text-xs font-semibold">
        Project description
      </label>
      <Textarea
        id={id}
        name="description"
        value={description}
        maxLength={limit}
        placeholder="A little about your idea…"
        aria-describedby={`${id}-count`}
        onChange={(event) => setDescription(event.target.value)}
      />
      <p id={`${id}-count`} className="text-xs text-muted-foreground">
        {description.length} of {limit} characters
      </p>
    </div>
  );
}
