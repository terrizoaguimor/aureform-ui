# Efectos y apariencia de Aureform 1.1

La suite incluye seis efectos reutilizables, seis paletas y la galería `/en/effects/` o `/es/effects/`. Appearance Studio permite editar materiales, colores, gradientes, movimiento y shaders. Son componentes de source y configuración local; no llaman a un backend de generación ni sincronizan presets con un servidor. La QA actual 1.1 pasa apariencia 44/348, movimiento 14/74 y consumer oficial fresco 85/85; [verificación](verification.es.md) registra el alcance.

## Integración y colores

`src/lib/appearance.ts` define Aurora, Violet, Ocean, Mint, Ember y Rose, cada una en claro/oscuro. `AppearanceProvider` aplica valores resueltos al documento; `AppearanceScope` configura un ejemplo aislado. El `Providers` de la suite incluye el proveedor de apariencia.

El generador llama a `scripts/lib/appearance-tokens.mjs`, que importa el contrato puro de TypeScript. `pnpm tokens` utiliza `node --experimental-strip-types` y deriva defaults, paletas, shades, efectos y radios de esa configuración. Los totales de primitivas y variables resueltas se leen de [cobertura](coverage.json); los 21 colores semánticos y 15 tokens base de efectos conservan su contrato.

Los estilos de entrada mantienen este orden:

```css
@import "tailwindcss";
@import "../styles/tokens.css";
@import "../styles/effects.css";
```

Cada efecto también importa `src/components/effects/effects.css`. La CLI y el registry siguen el grafo de imports, incluyendo ese CSS, los helpers y el import dinámico literal del runtime de shaders. No basta copiar únicamente el archivo TSX.

## Seis componentes

| Export               | Archivo / registry    | Propiedades principales                                                                                          |
| -------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `GradientBackground` | `gradient-background` | `kind`: linear/radial/mesh; `colors`, `angle`, `intensity`, `className`, `children`                              |
| `ShaderBackground`   | `shader-background`   | `kind`: aurora/waves/iridescent/none; `colors`, `speed`, `scale`, `intensity`, `paused`, `className`, `children` |
| `SpotlightCard`      | `spotlight-card`      | `spotlightColor`, `intensity`, `radius`; props de superficie                                                     |
| `GlowBorder`         | `glow-border`         | `colors`, `borderWidth`, `duration`; props de superficie                                                         |
| `TiltCard`           | `tilt-card`           | `maxTilt`, `perspective`; props de superficie                                                                    |
| `MagneticButton`     | `magnetic-button`     | `strength`, `maxDistance`, `asChild` y props nativas de botón                                                    |

GradientBackground es un campo CSS estático. ShaderBackground conserva un fondo CSS cuando no puede ejecutar WebGL. Sus estados `loading`, `running`, `paused`, `fallback` y `off` describen el runtime; no son una prop que fuerce resultados de GPU. Véase [shaders](shaders.md).

SpotlightCard, GlowBorder y TiltCard aceptan `as` o `asChild` para conservar la semántica del elemento real. `asChild` requiere un solo elemento que permita forwarding del ref. Una tarjeta decorativa no adquiere un tab stop ni un rol de botón. MagneticButton puede conservar un botón nativo o componer un único control/enlace compatible.

```tsx
"use client";

import { AppearanceScope } from "@/components/appearance-provider";
import { createAppearance } from "@/lib/appearance";
import {
  GradientBackground,
  ShaderBackground,
  SpotlightCard,
  GlowBorder,
  TiltCard,
  MagneticButton,
} from "@/components/effects";

const appearance = createAppearance("mint", "dark");
const colors = Object.values(appearance.colors);

export default function EffectsPreview() {
  return (
    <AppearanceScope appearance={appearance}>
      <section className="grid gap-4 p-6 sm:grid-cols-2">
        <GradientBackground colors={colors} kind="mesh" className="p-6">
          <h2>Campo de color</h2>
        </GradientBackground>
        <ShaderBackground
          colors={colors}
          kind="aurora"
          speed={0.2}
          className="p-6"
        >
          <h2>Atmósfera original</h2>
        </ShaderBackground>
        <SpotlightCard>
          <p>Luz que sigue el puntero.</p>
        </SpotlightCard>
        <GlowBorder colors={colors}>
          <p>Un perímetro de color.</p>
        </GlowBorder>
        <TiltCard maxTilt={6}>
          <p>Perspectiva suave.</p>
        </TiltCard>
        <MagneticButton onClick={() => window.alert("Acción local de ejemplo")}>
          Probar acción local
        </MagneticButton>
      </section>
    </AppearanceScope>
  );
}
```

## Apariencia aditiva

Button y Badge aceptan `appearance` con `solid`, `soft`, `outline`, `glass` o `gradient`. Card acepta `flat`, `elevated`, `glass` o `gradient`. `variant`, tamaño, loading y disabled siguen siendo controles separados; los tratamientos warning/destructive conservan los overrides del source.

```tsx
<Button variant="outline" appearance="glass" size="sm">Continuar</Button>
<Badge variant="neutral" appearance="soft">Local</Badge>
<Card appearance="gradient"><CardContent>Contenido del producto.</CardContent></Card>
```

Las utilidades `af-surface-gradient`, `af-hero-gradient`, `af-shadow-soft`, `af-shadow-elevated`, `af-shadow-floating`, `af-hover-card` y `af-hover-link` continúan disponibles. Aplicar `af-hover-card` cuando la superficie tenga una acción real; un efecto visual no sustituye un enlace o botón accesible. La composición de sombras conserva los anillos de foco de Tailwind.

## Movimiento, presets y entrega

Off/Gentle/Expressive se combina con la preferencia del sistema. Los efectos de puntero se limitan a condiciones compatibles y conservan señales estáticas con movimiento reducido; el shader tiene pausa y fallback. El owner comprueba comportamiento real, foco, dispositivos y restauración de recursos en la QA actual. El informe histórico de movimiento no certifica los efectos nuevos.

Studio guarda, aplica, duplica y elimina presets en este navegador. Exporta JSON completo, CSS resuelto o un ejemplo React con AppearanceScope; la importación valida el JSON antes de aplicarlo. [Guía de apariencia](appearance.md) · [Runtime de movimiento](motion-runtime.md) · [Verificación](verification.es.md).

El registry deriva su inventario del source e incluye seis efectos, `appearance-provider` y `appearance-controls`. Code Connect solo crea mappings para masters/sets con IDs y propiedades registrados por el owner. Sus tipos de source se verifican localmente mientras esos IDs siguen pendientes; no hay publicación cloud ni ejecución real en Figma en esa prueba.
