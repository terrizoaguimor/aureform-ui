"use client";

import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "@/components/ui/toast";

// Local helper: the kit exports Toaster and toast, not a ToastProvider.
function ToastProvider({
  children,
  toasterId,
}: {
  children: ReactNode;
  toasterId: string;
}) {
  return (
    <>
      {children}
      <Toaster
        id={toasterId}
        position="bottom-right"
        closeButton
        toastOptions={{
          style: {
            background: "var(--surface)",
            color: "var(--foreground)",
            borderColor: "var(--border)",
            fontFamily: "var(--font-manrope)",
          },
        }}
      />
    </>
  );
}

export default function ToastExample() {
  const toasterId = useId();

  return (
    <ToastProvider toasterId={toasterId}>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          toast.success("Changes saved", {
            toasterId,
            description: "Your local workspace preview is up to date.",
          })
        }
      >
        Show success toast
      </Button>
    </ToastProvider>
  );
}
