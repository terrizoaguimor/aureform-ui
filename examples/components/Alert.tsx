"use client";

import { Alert } from "@/components/ui/alert";

export default function AlertExample() {
  return (
    <Alert title="Changes saved" variant="success">
      Your local workspace preview is up to date.
    </Alert>
  );
}
