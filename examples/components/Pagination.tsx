"use client";

import { useState } from "react";
import { Pagination } from "@/components/ui/pagination";

export default function PaginationExample() {
  const [page, setPage] = useState(1);
  const count = 8;

  return (
    <div className="grid gap-3">
      <Pagination
        page={page}
        count={count}
        onPageChange={setPage}
        label="Results page"
        previousLabel="Previous results page"
        nextLabel="Next results page"
      />
      <p role="status" className="text-xs text-muted-foreground">
        Page {page} of {count}
      </p>
    </div>
  );
}
