# Tokens y apariencia

Aureform usa variables CSS semánticas en lugar de colores fijos dentro de cada componente. Utilidades como `bg-surface`, `text-foreground` y `border-border` se resuelven mediante el tema de Tailwind del proyecto. Conserva ese CSS global incluso al instalar un solo componente.

## Sigue el flujo del código fuente

[`src/lib/appearance.ts`](../../../src/lib/appearance.ts) define el contrato de configuración puro. `createAppearance` crea una configuración completa; `normalizeAppearance` valida opciones y rangos; `resolveAppearance` obtiene las variables CSS.

1. Cambia los valores predeterminados de paleta y apariencia en ese contrato.
2. Edita los valores independientes de espaciado o tipografía en [`tokens/aureform.tokens.json`](../../../tokens/aureform.tokens.json) cuando lo necesites.
3. Ejecuta el generador desde el repositorio:

```sh
pnpm tokens
```

El generador sincroniza colores, efectos, paletas y radios derivados de apariencia antes de escribir [`src/styles/tokens.css`](../../../src/styles/tokens.css). Los cambios directos en esos valores generados se perderán al regenerar. El [helper de tokens](../../../scripts/lib/appearance-tokens.mjs) muestra qué valores se calculan.

## Aísla un ejemplo configurado

Los identificadores de paleta son `aurora`, `violet`, `ocean`, `mint`, `ember` y `rose`. El tema puede ser `light` o `dark`, independientemente de la paleta.

```tsx
"use client";

import { AppearanceScope } from "@/components/appearance-provider";
import { createAppearance } from "@/lib/appearance";
import { Button } from "@/components/ui/button";

const appearance = createAppearance("ocean", "light");
appearance.motion = "gentle";

export default function AppearanceExample() {
  return (
    <AppearanceScope appearance={appearance} className="p-6">
      <Button appearance="gradient">Continuar</Button>
    </AppearanceScope>
  );
}
```

El scope aplica las variables al ejemplo sin guardar una preferencia global. Para editar toda la aplicación, usa `AppearanceProvider` y `useAppearance().setAppearance`, o `Providers` de la suite. Las opciones incluyen material, radio, densidad, tipografía, gradientes, sombras, bordes, hover y movimiento.

## Exporta y valida configuraciones

El Estudio guarda presets locales y exporta JSON, CSS o React. `serializeAppearance` escribe JSON validado; `parseAppearance` valida el texto importado y rechaza entradas de más de 32.768 caracteres. El `version: 1` del esquema es independiente de la versión del kit.

`appearanceToCSS` exporta variables resueltas; no instala componentes, el tema de Tailwind ni runtimes de efectos. Los presets son preferencias del navegador, no datos sincronizados de una cuenta.

## Revisa la presentación final

Comprueba texto, indicadores de foco, gráficos y gradientes interactivos en ambos temas después de personalizar. Los colores decorativos y los de controles cumplen funciones distintas. El formato de tokens de la aplicación no garantiza una importación directa en Tokens Studio ni constituye una exportación nativa de variables Figma. Consulta la [guía de apariencia](../../../docs/appearance.md) y las [notas de tokens de diseño](../../../design/tokens/README.md) para conocer sus alcances respectivos.
