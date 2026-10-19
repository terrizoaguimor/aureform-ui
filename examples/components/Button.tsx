"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ButtonExample() {
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setPending(true);
    setSaved(false);
    // A local delay makes the loading state visible; no request is sent.
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    setPending(false);
    setSaved(true);
  }

  return (
    <div className="grid justify-items-start gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={pending}
        onClick={() => void save()}
      >
        Save changes
      </Button>
      <p role="status" className="text-xs text-muted-foreground">
        {pending
          ? "Saving locally…"
          : saved
            ? "Changes saved in this example."
            : "Ready to save."}
      </p>
    </div>
  );
}
