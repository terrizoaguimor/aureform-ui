# Empieza con Aureform UI

Aureform UI es un kit de frontend de código abierto para productos SaaS, dashboards y herramientas internas. Incluye código editable de Next.js, React y TypeScript, flujos reutilizables, datos locales de demostración y un sistema de apariencia. Puedes ejecutar la aplicación completa o copiar las piezas que necesita tu producto.

Explora la [demo](https://aureformui.com/es/dashboard/) y la [documentación](https://aureformui.com/es/docs/) en [aureformui.com](https://aureformui.com/), el sitio principal.

## Conoce lo que incluye

La demo contiene 70 vistas principales, un centro de integraciones y 65 páginas de recetas de proveedor. Las recetas comparten 17 familias de flujos y ofrecen 86 opciones de proveedor. Sus 44 familias de componentes principales sirven de base para 134 entradas del registro, entre bloques, plantillas, proveedores y efectos. Las seis paletas funcionan en temas claro y oscuro; los gráficos admiten 13 tipos. La demo incluye inglés y español.

Las 32 imágenes generadas incluidas representan personas, organizaciones, productos y escenas editoriales ficticias. Son archivos locales con prompts documentados, textos alternativos y originales. No necesitas un servicio de generación de imágenes para ejecutar el kit.

## Elige tu primer flujo

1. Sigue [Instalación](installation.md) para clonar la suite completa y abrir `/en/` o `/es/` en tu equipo.
2. Explora Componentes para encontrar ejemplos independientes; continúa con Gráficos y Tablas de datos para presentar información interactiva.
3. Abre el Estudio de apariencia para cambiar colores, material, tipografía, densidad y movimiento. Exporta JSON, CSS o un ejemplo React configurado.
4. Recorre Productos → Pedidos → Facturas para comprender el estado comercial compartido, o abre Mapas y Autenticación para revisar sus puntos de integración.
5. Abre [Integraciones](/es/integrations/) para probar los flujos conectados y sigue la [guía de conexión](integrations.md) para inyectar tus adaptadores.

Para crear una aplicación más pequeña, ejecuta el instalador local desde el repositorio:

```sh
node bin/aureform.mjs init ../my-product --no-install
pnpm --dir ../my-product install
pnpm --dir ../my-product dev
```

El proyecto inicial incluye controles de apariencia, movimiento, fuentes locales y efectos reutilizables. La navegación y las galerías de la suite permanecen en el repositorio completo.

## Conecta los servicios de tu aplicación

La aplicación predeterminada guarda registros de demostración en el navegador. Tu aplicación aporta identidad, autorización, pagos, almacenamiento compartido, correo e IA de producción. Las vistas previas de roles y los pagos simulados no conceden permisos en el servidor ni realizan un cobro.

Empieza por [Componentes](components.md), [Tokens](tokens.md) y la [guía de arquitectura](../../../docs/architecture.md). La [guía de integración](integrations.md) explica la suite completa; los [contratos anteriores de aplicaciones](../../../docs/application-integrations.es.md) siguen disponibles.

## Revisa el alcance de diseño y versiones

El trabajo original de Aureform usa [Apache 2.0](license.md). El checkpoint nativo de Figma 1.2.1 sigue congelado; los bloques de aplicación introducidos en 1.4 y 1.5 son incorporaciones de código. Las 92 plantillas locales de Code Connect usan validación sintética y no tienen certificación en la nube. Consulta la [Hoja de ruta](roadmap.md) y la [distribución de diseño](../../../docs/figma-distribution.es.md) para interpretar correctamente las evidencias históricas.
