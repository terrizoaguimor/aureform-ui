"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
  PopoverClose,
} from "@/components/ui/popover";

export default function PopoverExample() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Studio");

  return (
    <div className="grid justify-items-start gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button type="button" variant="outline" />}>
          Edit workspace name
        </PopoverTrigger>
        <PopoverContent>
          <PopoverTitle className="text-sm font-semibold">
            Workspace name
          </PopoverTitle>
          <PopoverDescription className="mt-1 text-xs text-muted-foreground">
            Changes affect only this local preview.
          </PopoverDescription>
          <div className="mt-4 grid gap-2">
            <label htmlFor={id} className="text-xs font-semibold">
              Name
            </label>
            <Input
              id={id}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <PopoverClose
            render={<Button type="button" size="sm" className="mt-4" />}
          >
            Done
          </PopoverClose>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        Current workspace: {name || "Untitled"}
      </p>
    </div>
  );
}
