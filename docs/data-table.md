# Data tables

`DataTable<T extends { id: string }>` keeps the kit's existing TanStack Table API. Existing customer, invoice, order, file and task consumers do not need to change. Search, sorting, page selection, pagination and caller-owned export/edit actions remain real interactions.

The visual direction follows the clear lead column, separate header band, quiet dividers and comfortable spacing in [Untitled UI's table guide and author images](https://www.untitledui.com/blog/create-tables-in-figma), which link to its [actual Community data table file](https://www.figma.com/community/file/1332203037536263387). Aureform's implementation, colors, states and code are original; no Untitled UI templates, source or image assets are included.

Additional Community reference credit: [Obra shadcn/ui Community](https://www.figma.com/community/file/1514746685758799870/) by [Obra Studio BV](https://obra.studio), under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as stated in [Obra's Community license, section 11](https://shadcn.obra.studio/license). Aureform adapts the general table conventions to its own tokens, responsive density, selection states and caller-formatted totals. No Obra Pro assets or code are included.

## API

All previous props are preserved: `data`, `columns`, `labels`, `pageSize`, `selectable`, `loading`, `error`, `onRetry`, `toolbar`, `onSelectionChange`, `selectedAction`, `className` and `search`. The default page size is still `5`, and selection and search remain enabled by default.

The following options are additive:

| Prop                                                         | Default                | Purpose                                                                           |
| ------------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------- |
| `title?: ReactNode`                                          | Omitted                | A table heading with a filtered record-count pill.                                |
| `description?: ReactNode`                                    | Omitted                | Supporting text, also associated with the table for assistive technology.         |
| `caption?: ReactNode`                                        | Title or `labels.rows` | The table's accessible caption; rendered visually hidden.                         |
| `appearance?: "flat" \| "elevated" \| "glass" \| "gradient"` | Scoped material tokens | All four approved materials using the existing surface CSS.                       |
| `density?: "comfortable" \| "compact"`                       | `"comfortable"`        | Row and header spacing.                                                           |
| `striped?: boolean`                                          | `false`                | Quiet alternating row backgrounds; hover, focus and selection remain distinct.    |
| `columnVisibility?: boolean`                                 | `false`                | A keyboard-operable column menu backed by actual TanStack visibility state.       |
| `pageSizeOptions?: readonly number[]`                        | Omitted                | An optional native page-size control. The initial size is included automatically. |

The original 15 `DataTableLabels` fields remain required for complete label objects. Three new fields are optional: `columns`, `clearSelection` and `rowsPerPage`. Their English defaults are “Columns”, “Clear selection” and “Rows per page”; localize them alongside existing labels when enabling these controls. For Spanish, use `Columnas`, `Borrar selección` and `Filas por página`.

The `toolbar` slot still accepts consumer-owned filters and export actions. A selected-row band displays the filtered selected count, the existing `selectedAction(rows, clear)` content, and a clear-selection control. Selection IDs survive page changes and temporary filtering, as before. `onSelectionChange` reports selected records from the supplied `data`; `selectedAction` receives selected records in the table's current global-search result. External filters remain owned by the consumer.

The column menu respects `enableHiding: false`, never hides the built-in selection column, and protects the last visible accessor column. For headers rendered with a function, provide a human-readable `meta.label`; otherwise the menu uses the string header or column ID.

## Alignment and totals

Numeric accessor values are automatically right-aligned with tabular figures, even when the cell renders formatted currency. The first visible accessor column receives slightly stronger text. Use explicit metadata for formatted strings, centered columns or an alignment override:

```tsx
import type { ColumnDef } from "@tanstack/react-table";
import type { DataTableColumnMeta } from "@/components/ui/data-table";

type Invoice = { id: string; name: string; amount: number };
const currency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "name",
    header: "Invoice",
    footer: "Filtered total",
    enableHiding: false,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    meta: { numeric: true, align: "right" } satisfies DataTableColumnMeta,
    cell: ({ row }) => currency(row.original.amount),
    footer: ({ table }) =>
      currency(
        table
          .getFilteredRowModel()
          .rows.reduce((sum, row) => sum + row.original.amount, 0),
      ),
  },
];
```

Totals use the existing `ColumnDef.footer` API. The table does not guess currencies or aggregate formatted strings. Footer functions can sum the filtered model, current page or selected model as appropriate to the product. Grouped headers and footers retain their column spans; empty states span only visible leaf columns.

## Complete consuming example

This example owns its status filter, lets the user switch between compact and comfortable rows, and exports actual selected records. It requires the existing kit components and helpers, with no new package or appearance provider.

```tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import type { TableDensity } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { csv, downloadText } from "@/lib/utils";

type Invoice = {
  id: string;
  name: string;
  studio: string;
  status: "paid" | "pending";
  amount: number;
};

const invoices: Invoice[] = [
  {
    id: "inv-a17",
    name: "INV-A17",
    studio: "Morrow Studio",
    status: "paid",
    amount: 480,
  },
  {
    id: "inv-a18",
    name: "INV-A18",
    studio: "North Workshop",
    status: "pending",
    amount: 1250,
  },
  {
    id: "inv-a19",
    name: "INV-A19",
    studio: "Arc Editions",
    status: "paid",
    amount: 320,
  },
  {
    id: "inv-a20",
    name: "INV-A20",
    studio: "Morrow Studio",
    status: "pending",
    amount: 840,
  },
];
const currency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount,
  );
const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "name",
    header: "Invoice",
    footer: "Filtered total",
    enableHiding: false,
  },
  { accessorKey: "studio", header: "Studio" },
  { accessorKey: "status", header: "Status" },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => currency(row.original.amount),
    footer: ({ table }) =>
      currency(
        table
          .getFilteredRowModel()
          .rows.reduce((sum, row) => sum + row.original.amount, 0),
      ),
  },
];

export default function InvoiceTableExample() {
  const [status, setStatus] = useState("all");
  const [density, setDensity] = useState<TableDensity>("comfortable");
  const [selected, setSelected] = useState<Invoice[]>([]);
  const data = invoices.filter(
    (invoice) => status === "all" || invoice.status === status,
  );

  return (
    <section className="grid min-w-0 gap-3">
      <DataTable<Invoice>
        title="Invoice ledger"
        description="A clear view of the work you have delivered."
        caption="Demo invoices, with amounts in US dollars"
        data={data}
        columns={columns}
        appearance="elevated"
        density={density}
        striped
        columnVisibility
        pageSize={2}
        pageSizeOptions={[2, 5, 10]}
        labels={{ rows: "invoices" }}
        onSelectionChange={setSelected}
        toolbar={
          <>
            <label className="flex items-center gap-2 text-sm">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-md border border-border bg-surface p-2"
              >
                <option value="all">All statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={density === "compact"}
              onClick={() =>
                setDensity((value) =>
                  value === "compact" ? "comfortable" : "compact",
                )
              }
            >
              {density === "compact" ? "Comfortable rows" : "Compact rows"}
            </Button>
          </>
        }
        selectedAction={(rows, clear) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              downloadText(
                "selected-invoices.csv",
                csv(rows),
                "text/csv;charset=utf-8",
              );
              clear();
            }}
          >
            Export selected
          </Button>
        )}
      />
      <p role="status" className="text-sm text-muted-foreground">
        {selected.length} invoices selected in the supplied data.
      </p>
    </section>
  );
}
```

## Table primitives and accessibility

`Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell` and `TableCaption` accept ordinary native HTML props, refs and caller classes. `Table` additionally accepts `appearance`, `density`, `striped` and `containerClassName`. It remains unframed unless an explicit material is supplied, so existing tables inside cards avoid a second card surface.

The horizontal scroll container is keyboard-focusable, with an inset focus ring. When the table supplies an accessible label, the scroll region shares it. Native column headers expose `aria-sort`; native checkboxes and `aria-selected` identify selected rows. Sort and pagination buttons have `type="button"` and visible keyboard focus, including when the table is embedded in a form.

Selection uses a contextual background and an edge marker. Ordinary rows have quiet hover/focus backgrounds and no glow, translation or animated gradient. Materials and state colors resolve from the actual appearance scope. Comfortable rows use 14px body text; compact rows use 13px. Narrow screens keep controls wrapped and allow the table itself to scroll horizontally. Meaningful record data, status labels, currency formatting and export contents stay under consumer control.

Source verification covers existing customer flows and an isolated consuming table with actual sort/search/filter/selection/pagination/export, column hiding, grouped spans, formatted totals, keyboard focus, material contrast and narrow layouts. The verification report is delivered separately so local source checks are not confused with the owner's final production build.
