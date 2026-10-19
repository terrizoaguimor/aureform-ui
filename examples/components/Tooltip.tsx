"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

export default function TooltipExample() {
  return (
    <TooltipProvider delay={200}>
      <Tooltip content="This preference is stored only in the local example.">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="More information"
        >
          <Info aria-hidden="true" />
        </Button>
      </Tooltip>
    </TooltipProvider>
  );
}
