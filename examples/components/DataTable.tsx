"use client";

import { useId, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, type DataTableLabels } from "@/components/ui/data-table";

type Customer = {
  id: string;
  name: string;
  email: string;
  plan: "Starter" | "Pro";
};

const customers: Customer[] = [
  {
    id: "customer-1",
    name: "Alex Morgan",
    email: "alex@example.com",
    plan: "Pro",
  },
  {
    id: "customer-2",
    name: "Jules Chen",
    email: "jules@example.com",
    plan: "Starter",
  },
  {
    id: "customer-3",
    name: "Sam Rivera",
    email: "sam@example.com",
    plan: "Pro",
  },
  {
    id: "customer-4",
    name: "Casey Lee",
    email: "casey@example.com",
    plan: "Starter",
  },
  {
    id: "customer-5",
    name: "Robin Park",
    email: "robin@example.com",
    plan: "Pro",
  },
  {
    id: "customer-6",
    name: "Drew Taylor",
    email: "drew@example.com",
    plan: "Starter",
  },
];
const columns: ColumnDef<Customer>[] = [
  { accessorKey: "name", header: "Customer" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "plan", header: "Plan" },
];
const tableLabels: DataTableLabels = {
  search: "Search example customers…",
  empty: "No customers found",
  emptyDescription: "Try another search or clear the filters.",
  previous: "Previous customer page",
  next: "Next customer page",
  selectAll: "Select customers on this page",
  selectRow: "Select customer",
  selected: "customers selected",
  page: "Page",
  of: "of",
  rows: "customers",
  clear: "Clear customer search",
  error: "Could not load customers",
  retry: "Try again",
  loading: "Loading customers",
};

export default function DataTableExample() {
  const id = useId();
  const [selected, setSelected] = useState<Customer[]>([]);

  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-3">
      <h2 id={id} className="text-sm font-semibold">
        Example customers
      </h2>
      <DataTable<Customer>
        data={customers}
        columns={columns}
        labels={tableLabels}
        pageSize={3}
        selectable
        onSelectionChange={setSelected}
      />
      <p role="status" className="text-xs text-muted-foreground">
        {selected.length
          ? `Selected: ${selected.map((customer) => customer.name).join(", ")}`
          : "No customers selected."}
      </p>
    </section>
  );
}
