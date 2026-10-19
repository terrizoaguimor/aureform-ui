import * as React from "react";
import { cn } from "@/lib/utils";
import { inputClasses } from "@/components/ui/input";
export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        inputClasses,
        "af-textarea min-h-28 resize-y py-3 leading-7",
        className,
      )}
      {...props}
    />
  );
}
