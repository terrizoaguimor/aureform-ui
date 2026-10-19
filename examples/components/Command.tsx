"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, type CommandItem } from "@/components/ui/command";

export default function CommandExample() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState("No action selected.");
  const items: CommandItem[] = [
    {
      id: "save",
      label: "Save draft",
      group: "Project",
      keywords: ["store", "draft"],
      onSelect: () => setResult("Draft saved in this example."),
    },
    {
      id: "preview",
      label: "Preview project",
      group: "Project",
      keywords: ["view", "preview"],
      onSelect: () => setResult("Local preview selected."),
    },
  ];

  return (
    <div className="grid justify-items-start gap-3">
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Search actions
      </Button>
      <Command
        open={open}
        onOpenChange={setOpen}
        label="Project actions"
        placeholder="Search project actions…"
        emptyLabel="No matching actions"
        closeLabel="Close action search"
        items={items}
      />
      <p role="status" className="text-xs text-muted-foreground">
        {result}
      </p>
    </div>
  );
}
