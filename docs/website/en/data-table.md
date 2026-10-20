# Data tables

`DataTable<T extends { id: string }>` combines TanStack columns with search, sorting, selection and pagination. Keep row IDs stable across edits and page changes. It supports local arrays and externally controlled queries; the component itself does not fetch records.

## Start with a local array

1. Install `data-table` and its dependencies into a host with Aureform's global styles.
2. Declare your row type and `ColumnDef` values.
3. Supply the complete local array for the default client mode.

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";

type Invoice = { id: string; name: string; amount: number };
const rows: Invoice[] = [
  { id: "inv-1", name: "INV-001", amount: 48000 },
  { id: "inv-2", name: "INV-002", amount: 125000 },
];
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
  }).format(cents / 100);
const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "name", header: "Invoice",
    footer: "Filtered total", enableHiding: false,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => money(row.original.amount),
    footer: ({ table }) => money(
      table.getFilteredRowModel().rows.reduce(
        (sum, row) => sum + row.original.amount, 0,
      ),
    ),
  },
];

export default function InvoiceTable() {
  return (
    <DataTable<Invoice>
      title="Invoice ledger"
      caption="Fictional invoice amounts in US dollars"
      data={rows}
      columns={columns}
      columnVisibility
      pageSizeOptions={[5, 10, 25]}
      labels={{ rows: "invoices" }}
    />
  );
}
```

These example amounts are cents. Currency formatting and `ColumnDef.footer` totals belong to the caller. Numeric accessors align automatically; `DataTableColumnMeta` supports explicit `numeric`, `align` and menu `label` values.

## Control external data

Set `mode="external"` with required `rowCount`, the total matching count, and supply only the accepted page as `data`. Control `query` and `onQueryChange`; `DataTableQuery` contains `search`, `filters`, `sorting` and `pagination`. Its `pageIndex` is zero-based.

External mode delegates filtering, sorting and pagination to the data owner. Cancel superseded requests and discard responses after workspace changes. Supply `loading`, `error` and `onRetry` for recoverable fetch states.

## Define selection and export scope

Controlled `rowSelection`, `onRowSelectionChange` and `onSelectedIdsChange` can represent IDs outside the loaded page. Row-based `onSelectionChange` and `selectedAction` only resolve supplied records. Selecting a page does not select every query match; exporting all matches needs a complete filtered source or your backend.

## Keep presentation accessible

Provide a caption and localized labels, including column-menu, clear-selection and page-size text. `labels` accepts partial overrides with English defaults. Materials, density, striping and column visibility are independent controls; retain keyboard focus and native sorting semantics.

See the [table guide](../../../docs/data-table.md), [external-query contracts](../../../docs/saas-operations.md), [current prop types](../../../src/components/ui/data-table.tsx) and [query types](../../../src/lib/data-query.ts) for complete integration details.
