# Tablas de datos

`DataTable<T extends { id: string }>` combina columnas TanStack con búsqueda, ordenación, selección y paginación. Conserva IDs estables entre páginas y ediciones. Admite arrays locales y consultas externas controladas; no realiza peticiones.

## Empieza con un array local

1. Instala `data-table` y sus dependencias en un proyecto con los estilos globales de Aureform.
2. Define el tipo de fila y las columnas `ColumnDef`.
3. Pasa el array local completo en modo cliente.

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
  new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "USD",
  }).format(cents / 100);
const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "name", header: "Factura",
    footer: "Total filtrado", enableHiding: false,
  },
  {
    accessorKey: "amount",
    header: "Importe",
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
      title="Registro de facturas"
      caption="Facturas ficticias en USD"
      data={rows}
      columns={columns}
      columnVisibility
      pageSizeOptions={[5, 10, 25]}
      labels={{
        search: "Buscar facturas…", empty: "No hay facturas",
        emptyDescription: "Prueba otra búsqueda o limpia filtros.",
        previous: "Página anterior", next: "Página siguiente",
        selectAll: "Seleccionar esta página", selectRow: "Seleccionar fila",
        selected: "seleccionadas", page: "Página", of: "de", rows: "facturas",
        clear: "Limpiar búsqueda", error: "Error al cargar facturas",
        retry: "Reintentar", loading: "Cargando facturas",
        columns: "Columnas", clearSelection: "Borrar selección",
        rowsPerPage: "Filas por página",
      }}
    />
  );
}
```

Los importes son centavos. El consumidor formatea moneda y calcula totales en `ColumnDef.footer`. Los accesores numéricos se alinean automáticamente; `DataTableColumnMeta` admite `numeric`, `align` y `label`.

## Controla datos externos

Usa `mode="external"` con `rowCount` obligatorio, el total de coincidencias, y pasa solo la página aceptada como `data`. Controla `query` y `onQueryChange`; `DataTableQuery` contiene `search`, `filters`, `sorting` y `pagination`, con `pageIndex` desde cero.

El propietario de los datos filtra, ordena y pagina. Cancela solicitudes sustituidas y descarta respuestas de otro workspace. Usa `loading`, `error` y `onRetry` para errores recuperables.

## Define selección y exportación

`rowSelection`, `onRowSelectionChange` y `onSelectedIdsChange` pueden representar IDs fuera de la página cargada. `onSelectionChange` y `selectedAction` solo resuelven registros suministrados. Seleccionar una página no selecciona todas las coincidencias; exportarlas requiere la fuente filtrada completa o tu backend.

## Conserva una presentación accesible

Aporta caption y etiquetas traducidas. `labels` admite cambios parciales con valores predeterminados en inglés. Material, densidad, franjas y visibilidad de columnas son controles independientes; conserva foco y semántica nativa de ordenación.

Consulta la [guía de tablas](../../../docs/data-table.md), los [contratos externos](../../../docs/saas-operations.es.md), las [props actuales](../../../src/components/ui/data-table.tsx) y los [tipos de consulta](../../../src/lib/data-query.ts).
