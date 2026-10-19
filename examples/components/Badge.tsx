"use client";

import { Badge } from "@/components/ui/badge";

export default function BadgeExample() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="warning">In progress</Badge>
      <Badge variant="default">Ready for review</Badge>
      <Badge variant="outline">Draft</Badge>
    </div>
  );
}
