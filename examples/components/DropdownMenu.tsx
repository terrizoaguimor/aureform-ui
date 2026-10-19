"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function DropdownMenuExample() {
  const [result, setResult] = useState("No action selected.");

  return (
    <div className="grid justify-items-start gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="outline" />}
        >
          Project actions
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Local preview</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setResult("Edit action selected locally.")}
            >
              Edit project
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setResult("Duplicate action selected locally.")}
            >
              Duplicate project
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            onClick={() => setResult("Example reset.")}
          >
            Reset example
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p role="status" className="text-xs text-muted-foreground">
        {result}
      </p>
    </div>
  );
}
