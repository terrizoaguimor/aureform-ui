# Hoja de ruta y alcance de versiones

Esta página distingue las capacidades de frontend entregadas de las propuestas de investigación. Las propuestas no tienen fecha de entrega comprometida; su prioridad depende de una necesidad concreta, un contrato acordado y una aceptación documentada.

## Incluido en el kit actual

La base de la aplicación tiene 69 vistas de demo, 44 familias principales, 107 entradas del registro, seis paletas y 13 tipos de gráficos, con inglés/español y temas claro/oscuro.

- Componentes editables, ejemplos completos, instalación local, registro, preview/diff y recibos de instalación.
- Estudio de apariencia, presets locales, exportaciones JSON/CSS/React, movimiento acotado y seis efectos reutilizables.
- Onboarding, workspaces, miembros, importación CSV, tablas controladas de clientes, vistas guardadas y detalle.
- Edición de productos e imágenes, precios fijados al comprar, pagos simulados, facturas y facturación, con transporte tipado hacia un backend Stripe del consumidor.
- Mapas locales con conexión Google opcional y cuatro pantallas de autenticación con callbacks sociales sustituibles.

Son flujos y contratos de frontend. Identidad real, autorización de tenants, almacenamiento compartido, operaciones financieras y jobs duraderos pertenecen al consumidor. Consulta la [integración de aplicaciones](../../../docs/application-integrations.es.md) y el [registro de la versión 1.4](../../../docs/release-checklist-1.4.0.md).

## Propuestas de investigación

El [estudio actual de brechas](../../../docs/research-gaps-1.4.es.md) registra propuestas sobre la base 1.4. Incluye:

- Mejor continuidad al actualizar código copiado y personalizado, aprovechando previews y recibos existentes.
- Escenarios explícitos de sesión vencida, respuesta obsoleta, conflicto y fallo parcial con borradores recuperables.
- Cotizaciones comerciales más completas, pagos diferidos, devoluciones/reembolsos y previews de cambio de plan.
- Frescura y ausencia de datos analíticos, preferencias regionales e interacción táctil y de teclado en vistas densas.

Su presencia en un documento no añade APIs públicas. Cada propuesta necesita implementación y una nueva aceptación para considerarse entregada. El [plan de piloto](../../../docs/pilot-validation.es.md) propone entrevistas e integraciones voluntarias; no demuestra tasas de adopción ni ahorro de tiempo medido.

## Límites del diseño nativo y la verificación

El checkpoint nativo de Figma 1.2.1 sigue congelado. Los bloques de aplicación nuevos de 1.4 son solo código, sin nuevos masters nativos declarados. Las 92 plantillas locales de Code Connect usan un runtime sintético; no están certificadas en la nube ni acreditan publicación real.

Las pruebas de navegador, código, diseño nativo y archivos distribuidos tienen alcances distintos. Cambiar la versión o añadir capturas no recertifica evidencias históricas. Consulta la [distribución de diseño](../../../docs/figma-distribution.es.md).

## Ayuda a priorizar

1. Describe una tarea reproducible con versión, método de instalación, idioma y estado relevante.
2. Explica el resultado necesario y las responsabilidades de backend que puedes cubrir.
3. Propón un cambio acotado con estados accesibles y textos EN/ES.

Sigue [CONTRIBUTING](../../../CONTRIBUTING.md) y conserva contratos y avisos de licencia.
