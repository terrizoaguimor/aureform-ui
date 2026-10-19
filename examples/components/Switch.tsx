"use client";

import { useId, useState } from "react";
import { Switch } from "@/components/ui/switch";

export default function SwitchExample() {
  const id = useId();
  const [enabled, setEnabled] = useState(true);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Switch id={id} checked={enabled} onCheckedChange={setEnabled} />
      <label htmlFor={id} className="text-sm">
        Weekly summary
      </label>
      <span className="text-xs text-muted-foreground">
        {enabled ? "On" : "Off"}
      </span>
    </div>
  );
}
