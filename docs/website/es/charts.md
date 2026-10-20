# Gráficos

`Chart` es un componente de código para visualizar valores numéricos con Recharts y vistas SVG propias. Incluye una tabla alternativa accesible y colores de la paleta. Instala sus dependencias y los estilos semánticos globales de Aureform antes de copiar un ejemplo.

## Elige el tipo de gráfico

El contrato actual `ChartKind` tiene 13 valores:

- Tendencias y comparaciones: `area`, `line`, `bar`, `horizontal-bar`, `stacked-bar`, `stacked-area`, `diverging-bar`.
- Categorías y progreso: `pie`, `radar`, `radial`, `gauge`, `rings`.
- Intensidad en cuadrícula: `heatmap`.

Usa valores con signo para comparar divergencias y dominios apropiados para progreso. Elige el tipo según la pregunta; las formas dibujadas en la demo no son mediciones reales.

## Renderiza datos numéricos explícitos

1. Instala `chart` mediante la CLI o el registro público.
2. Crea un componente cliente con tu propio `ChartDatum[]`.
3. Nombra claramente el gráfico, sus series y unidades.

```tsx
"use client";

import { Chart, type ChartDatum } from "@/components/ui/chart";

const data: ChartDatum[] = [
  { label: "Mayo", value: 28, secondary: 24 },
  { label: "Junio", value: 34, secondary: 28 },
  { label: "Julio", value: 42, secondary: 31 },
];

export default function OrdersChart() {
  return (
    <Chart
      kind="bar"
      data={data}
      label="Cantidad ficticia de pedidos mensuales"
      valueLabel="Pedidos actuales"
      secondaryLabel="Pedidos anteriores"
      locale="es"
      legend
      height={280}
      valueFormatter={(value) => `${value} pedidos`}
    />
  );
}
```

Son cantidades ficticias. `ChartDatum` requiere `label` y un `value` numérico; `secondary` y `tertiary` son opcionales. `tertiaryLabel` nombra la tercera serie. `visibleSeries` admite las claves `value`, `secondary` y `tertiary`.

## Define dominios y ausencia de datos

`maxValue` establece la meta de progreso y vale 100 por defecto; gauge/rings limitan su representación al rango visual. `appearance` admite `flat`, `gradient` o `glow`. El proyecto aporta el ancho; `height` establece el área del gráfico.

El valor principal no admite `null`. El heatmap actual dibuja como cero las celdas opcionales ausentes; explica las ausencias relevantes en la interfaz o adapta el contrato. No presentes una observación desconocida como un cero medido.

## Conserva el contexto accesible

Los botones de leyenda permiten alternar series o categorías con teclado. La tabla para lectores de pantalla conserva los datos suministrados, incluidas las series ocultas. Los formatters visuales no cambian sus números; incluye unidades en etiquetas y encabezados.

Revisa contenedores estrechos, ambos temas, traducciones y contraste al cambiar paletas. La [guía de gráficos](../../../docs/charts.md) contiene recetas y alcance histórico de diseño; [`ChartProps`](../../../src/components/ui/chart.tsx) define la API actual. Consulta [Accesibilidad](accessibility.md) para revisar la integración.
