# Movimiento y efectos

El sistema de movimiento de Aureform añade entradas finitas al contenido. GSAP gestiona animaciones dentro de su ámbito; Lenis aporta desplazamiento suave opcional. La apariencia y la preferencia de movimiento reducido del sistema operativo determinan si se ejecutan.

## Añade una entrada acotada

1. Instala `motion-system` con la [CLI local](cli.md) e instala las dependencias incorporadas en el proyecto consumidor.
2. Incluye los estilos globales y de efectos del kit.
3. Renderiza `MotionSystem` dentro de `AppearanceProvider` o de `Providers` de la suite completa.

```tsx
"use client";

import { AppearanceProvider } from "@/components/appearance-provider";
import { MotionSystem } from "@/components/motion-system";

export default function MotionExample() {
  return (
    <AppearanceProvider>
      <MotionSystem>
        <main className="mx-auto max-w-3xl p-6">
          <h1 data-motion="intro">Un buen lugar para empezar</h1>
          <section data-motion="reveal">
            <h2>Tu próximo flujo</h2>
            <p>Este contenido sigue visible antes de animarse.</p>
          </section>
        </main>
      </MotionSystem>
    </AppearanceProvider>
  );
}
```

`data-motion="intro"` marca entradas iniciales; `data-motion="reveal"` marca entradas al aparecer en pantalla. Cada elemento se anima como máximo una vez mientras permanece montado su wrapper. Las animaciones conservan la opacidad y restauran los estilos inline originales. El contenido sigue visible en el HTML del servidor y sin JavaScript de aplicación.

## Elige el nivel apropiado

La apariencia admite `off`, `gentle` y `expressive`. La preferencia del sistema por movimiento reducido prevalece sobre el nivel solicitado. Al enfocar un elemento marcado, se restauran inmediatamente sus estilos y los de sus ancestros marcados.

Separa los elementos con transformaciones propias, overlays fijos y navegación sticky. El wrapper usa `display: contents`; coloca espaciado, fondos y clases de layout en sus hijos.

## Conserva el desplazamiento nativo en aplicaciones

`smoothScroll` es `false` por defecto. Actívalo solo en una landing con un único responsable del desplazamiento suave por ventana. Lenis se inicia únicamente con movimiento habilitado, puntero preciso y sin solicitud de movimiento reducido.

La navegación táctil, diálogos, textareas, bloques de código y regiones `data-lenis-prevent` conservan el scroll nativo. Los cambios de preferencias y el desmontaje limpian animaciones, observadores, listeners y el runtime de desplazamiento.

## Combina efectos reutilizables

Los seis efectos son `GradientBackground`, `ShaderBackground`, `SpotlightCard`, `GlowBorder`, `TiltCard` y `MagneticButton`. Sus contratos difieren: usa las props y composiciones documentadas para cada uno.

El shader incluye una alternativa estática; el movimiento decorativo no debe transmitir información imprescindible. Revisa ambos temas y el movimiento desactivado después de cambiar colores. Consulta el [contrato del runtime](../../../docs/motion-runtime.md), el [ejemplo completo](../../../examples/MotionSystem.tsx), los [contratos de efectos](../../../docs/effects.es.md) y la [guía de shaders](../../../docs/shaders.md).
