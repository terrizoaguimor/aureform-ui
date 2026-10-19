"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function SkeletonExample() {
  return (
    <div role="status" aria-busy="true" className="grid max-w-sm gap-3">
      <span className="sr-only">Loading project details…</span>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
