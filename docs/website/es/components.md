# Componentes y composición

Aureform separa componentes básicos, bloques reutilizables y plantillas de aplicación. Empieza por la capa más pequeña que resuelva tu necesidad. Las 44 familias principales tienen ejemplos independientes; las 127 entradas del registro también incluyen proveedores, efectos y flujos compuestos.

## Copia un ejemplo completo

1. Instala el código necesario mediante la [CLI local](cli.md) o el [registro](installation.md).
2. Copia el archivo completo de los [ejemplos de componentes](../../../examples/README.md), incluidos imports, estado, tipos y manejadores.
3. Sustituye datos ficticios, destinos de navegación y etiquetas por los de tu aplicación.
4. Conserva los estados de carga, vacío, error, deshabilitado y la interacción con teclado.

Los ejemplos usan `@/*` para `src/*`. El instalador local puede adaptar imports a los alias admitidos del destino en `components.json`; los fragmentos copiados manualmente deben usar los alias reales de tu proyecto. Copia los archivos multimedia a las rutas públicas correspondientes o aporta tus propios recursos.

## Usa Button sin el shell de la suite

Con el código, las dependencias, el CSS global de Tailwind y los estilos semánticos instalados, este ejemplo no necesita proveedores de idioma, workspace o comercio:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function FollowButton() {
  const [following, setFollowing] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      appearance="glass"
      size="sm"
      shape="pill"
      aria-pressed={following}
      onClick={() => setFollowing((value) => !value)}
    >
      {following ? "Siguiendo novedades" : "Seguir novedades"}
    </Button>
  );
}
```

Solo cambia estado local. `variant`, `appearance`, `size` y `shape` son props distintas. Button admite `loading`, que deshabilita la acción y expone su estado ocupado. Mantén un nombre accesible descriptivo.

## Aporta el contexto que requiere el código

La composición completa de [`Providers`](../../../src/components/providers.tsx) es `NextIntlClientProvider` → `AppearanceProvider` → `WorkspaceProvider` → `CommerceProvider`, con soporte interno de tooltips y notificaciones. Los bloques traducidos usan el contexto de idioma; comercio lee el workspace; los controles visuales leen la apariencia.

Para un ejemplo de apariencia aislado, usa `AppearanceScope`. Para un flujo completo de demostración, usa `Providers` o `AppPage`. Un Button básico no requiere todo el árbol de proveedores para recibir estilos.

## Trabaja con los contratos del código

Los controles compuestos requieren sus piezas documentadas, etiquetas y comportamiento de foco. Las plantillas pueden incluir rutas de demo y persistencia en el navegador; revisa sus dependencias antes de incorporarlas. [Tablas de datos](data-table.md), [Gráficos](charts.md), [Accesibilidad](accessibility.md) y los [contratos SaaS](../../../docs/saas-operations.es.md) explican las composiciones mayores y las responsabilidades del consumidor sobre los datos.
