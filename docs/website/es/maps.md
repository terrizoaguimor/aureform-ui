# Mapas

`MapsWorkspace` es un bloque de aplicación con rutas y ubicaciones esquemáticas locales. El modo predeterminado no necesita clave, tiles remotos, seguimiento ni solicitudes a Google. La geometría, fechas y progreso de envíos son datos ilustrativos.

## Monta el espacio local

Instala `maps-workspace` y sus dependencias mediante la CLI o el registro. Incluye los estilos globales y aporta los proveedores existentes:

```tsx
"use client";

import { Providers } from "@/components/providers";
import { MapsWorkspace } from "@/components/blocks/maps-workspace";

export default function MapsPage() {
  return (
    <Providers locale="es">
      <MapsWorkspace />
    </Providers>
  );
}
```

`MapsWorkspace` no recibe props. Lee los contextos de idioma, tema y apariencia. El wrapper completo es una composición cómoda para la demo; el bloque utiliza los datos ficticios incluidos.

1. Busca ciudades, identificadores de ruta o conductores y filtra por estado.
2. Selecciona una ruta o ubicación del directorio para revisar sus detalles.
3. Alterna mapa/lista, ajusta capas y exporta las rutas filtradas como GeoJSON.
4. Usa las flechas del esquema para desplazarte, `+`/`-` para zoom y Home para restablecer; los marcadores visibles admiten Enter/Espacio.

La vista general usa geometría MapLibre local con alternativa de respaldo; el esquema SVG y el directorio siguen disponibles sin servicios remotos.

## Conecta Google Maps de forma explícita

El espacio sigue local aunque haya una clave configurada. Selecciona Google Maps y abre Configurar mapa para introducir una clave de navegador restringida y un map ID para la vista montada.

El [ejemplo de entorno](../../../.env.example) también incluye opciones del build:

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=
```

Déjalas vacías para el modo local. Para tu conexión, configura Maps JavaScript API, facturación y cuotas de tu proyecto, restricciones de sitios y de APIs. Usa tu map ID de producción. Los valores `NEXT_PUBLIC_*` son configuración pública incorporada al build; recompila después de cambiarlos.

## Gestiona configuración y errores

Las claves introducidas permanecen en memoria React. Nunca se guardan en localStorage, sessionStorage, cookies, logs o exportaciones; el campo se limpia al cerrar. Desconectar vuelve a la demo, pero un SDK cargado conserva la clave del documento hasta recargar.

Los fallos de red permiten reintentar con la misma clave. Autenticación, timeout y cambio de clave requieren recarga. Mantén disponible la alternativa local y conserva la atribución de Google.

## Aporta datos reales conscientemente

Para mapas del consumidor, [`GoogleMap`](../../../src/components/blocks/google-map.tsx) admite ubicaciones tipadas y polilíneas propias desde [`src/lib/google-maps.ts`](../../../src/lib/google-maps.ts). No consulta geocodificación, Places ni Directions. Tu aplicación aporta datos operativos con derechos de uso y cualquier backend de rutas. La [guía completa de Maps](../../../docs/google-maps.md) documenta ciclo del SDK, selección, cámara y errores.
