# Comunicaciones

`SoftphoneWorkspace` es un bloque editable de softphone entrante. Su adaptador predeterminado ejecuta una demostración local: los nombres de proveedor identifican escenarios simulados de Twilio o Telnyx, sin comprar números, conectar un carrier ni realizar llamadas reales.

## Monta el softphone local

Desde el checkout, copia `softphone-workspace` en un [consumidor configurado](cli.md). Revisa el preview, aplica e instala las dependencias incorporadas:

```sh
node bin/aureform.mjs add softphone-workspace --cwd ../my-product --diff
node bin/aureform.mjs add softphone-workspace --cwd ../my-product
pnpm --dir ../my-product install
```

`softphone` es la superficie de llamada controlada independiente; `softphone-template`, la composición de la suite. Incluye estilos globales y los proveedores existentes. El [ejemplo completo](../../../examples/communications-softphone.tsx) monta la demo predeterminada:

```tsx
"use client";

import { Providers } from "@/components/providers";
import { SoftphoneWorkspace } from "@/components/blocks/softphone-workspace";

export default function SoftphonePage() {
  return (
    <Providers locale="es">
      <SoftphoneWorkspace />
    </Providers>
  );
}
```

El [bloque](../../../src/components/blocks/softphone-workspace.tsx) recibe:

| Prop | Comportamiento |
| --- | --- |
| `adapter?: CommunicationsAdapter` | Sin este prop crea un adaptador local. Un adaptador inyectado gestiona su proveedor, estado y ciclo de vida. |
| `defaultProvider?: "twilio" \| "telnyx"` | Proveedor inicial de la demo propia; predeterminado `"twilio"`. No reemplaza el proveedor de un adaptador inyectado. |
| `onDemoProviderChange?: (provider: CommunicationsProvider) => void` | Callback opcional para un host con sesiones demo estables. No cambia llamadas live. |
| `className?: string` | Clases adicionales del contenedor del workspace. |

Crea un adaptador personalizado dentro de un Client Component: sus métodos y suscripciones no pueden atravesar el límite de un Server Component como props serializadas. El selector de proveedor se desactiva mientras hay conexión, llamada o cola, y para un adaptador live.

## Prueba el flujo entrante

1. Selecciona **Conectar sesión** y cambia **Disponibilidad del agente** a **Disponible**.
2. Conserva **En horario de atención** y pulsa **Simular llamada entrante**. El agente tiene una sola llamada ofrecida o activa; los demás contactos admitidos aparecen en **Cola** por orden FIFO.
3. Selecciona **Contestar** y prueba **Silenciar**, **En espera** y **Guardar notas**. Pulsa **Reanudar** antes de abrir **Teclado**.
4. Selecciona **Finalizar** y revisa **Historial de llamadas** o los detalles con **Ver**. Rechazo, timeout, fuera de horario, festivo y desbordamiento tienen motivos terminales distintos.
5. Selecciona **Probar recuperación** y después **Reconectar** para retomar la sesión conservada.

Mute y espera cambian el estado local. DTMF registra los dígitos del teclado sin transmitir tonos al carrier. Las identidades e historial incluidos son ficticios. Cambiar de proveedor en esta demo no migra llamadas reales ni constituye una prueba independiente de compatibilidad.

La pérdida de señalización conserva la llamada local y pausa el timeout de una oferta sin contestar. Vuelve a conectar para retomarla. El horario se evalúa al llegar el contacto; quien ya fue admitido sigue siendo elegible después del cierre.

## Configura horarios y festivos explícitos

La [política de horarios](../../../src/lib/communications/business-hours.ts) predeterminada es lunes–viernes, de 08:00 a 18:00 en `America/Bogota`. La apertura es inclusiva y el cierre exclusivo. En **Horario**, edita días, intervalo y zona horaria, añade un festivo `YYYY-MM-DD` por línea y selecciona **Guardar horario**. No se incluye un calendario oficial colombiano ni de otro país. Los horarios live y los horarios locales complejos, con horas distintas por día o varios intervalos diarios, se muestran en sólo lectura; edita esas políticas desde la aplicación que integra el bloque.

```ts
import { createDefaultBusinessHoursSchedule } from "@/lib/communications/business-hours";

const schedule = createDefaultBusinessHoursSchedule();
schedule.holidays = [
  { date: "2026-10-21", label: "Cierre de prueba local" },
];
```

La fecha representa un cierre de prueba, no una afirmación de que sea festivo nacional. Aplica la política mediante `setSchedule(schedule)` en un adaptador creado con [`createDemoCommunicationsAdapter`](../../../src/lib/communications/demo-adapter.ts). La validación rechaza fechas, zonas horarias e intervalos solapados inválidos.

El selector de escenarios es una excepción explícita de prueba, incluso su opción predeterminada **En horario de atención**. No cambia el indicador **Abierto/Cerrado** de la política. `simulateIncoming()` sin escenario evalúa el horario configurado al llegar la llamada.

## Micrófono, recuperación y datos

El adaptador demo no solicita acceso al micrófono ni captura audio. Abre **Audio** y pulsa **Probar micrófono** para la [prueba separada de dispositivos](../../../src/hooks/use-softphone-audio.ts): solicita permiso, mide un stream temporal durante cuatro segundos y detiene sus pistas. No lo graba ni lo transmite. **Reproducir tono** comprueba la salida de altavoz predeterminada del navegador.

Gestiona los estados denegado y no disponible antes de conectar medios reales. Después de una denegación, revisa los permisos del sitio en el navegador antes de reintentar. La prueba necesita un contexto seguro y compatible. Aceptar una llamada local no demuestra permiso de micrófono, audio audible ni conexión PSTN.

El adaptador demo conserva historial, eventos y notas acotados en memoria, sin localStorage, sessionStorage, cookies ni base de datos. `reset()` restaura los fixtures; `dispose()` detiene trabajo pendiente y suscripciones. Usa datos ficticios en la demo pública. El backend del consumidor debe gestionar estado autenticado, notas y políticas de retención y eliminación. No guardes secretos del carrier, tokens de acceso ni datos privados de los contactos en almacenamiento del navegador, variables públicas o archivos estáticos.

La [plantilla de la suite](../../../src/components/templates/softphone-template.tsx) conserva sesiones demo al navegar en la misma pestaña mediante un [host en memoria](../../../src/lib/communications/demo-session.ts). Una recarga completa empieza de nuevo. **Reiniciar demo** restaura los fixtures de ese proveedor. **Exportar CSV** descarga explícitamente direcciones de los contactos y metadatos del historial, sin notas; aplica tu política de exportación para datos reales.

## Aporta un adaptador live de forma explícita

El [contrato de comunicaciones](../../../src/lib/communications/contracts.ts) separa conexión, presencia, llamadas, cola FIFO, historial, permiso de audio reportado y capacidades opcionales. [`createLiveCommunicationsAdapter`](../../../src/lib/communications/live-adapter.ts) implementa el protocolo backend `aureform.inbound-voice.v1`. Construirlo no conecta ni carga un SDK.

Aporta `provider`, un `baseUrl` autenticado como `/v1/communications`, `voiceClientFactory` y `getAuthHeaders` de tu agente. Sin fábrica SDK, `connect()` falla antes de realizar solicitudes HTTP o trabajo SDK. Un backend en otro origen requiere autorización explícita mediante `trustedBackendOrigins`; utiliza un origen HTTPS aprobado. Conserva la autenticación en memoria y los secretos en el servidor. El cliente envía solicitudes de sesión/comandos y consume snapshots SSE; un evento de medios del navegador no confirma el cierre de la llamada PSTN.

Los bindings opcionales son [`createTwilioBrowserVoiceClient`](../../../src/lib/communications/twilio-browser.ts) y [`createTelnyxBrowserVoiceClient`](../../../src/lib/communications/telnyx-browser.ts). Copia uno o ambos con el cliente live:

```sh
node bin/aureform.mjs add communications-live twilio-browser-voice telnyx-browser-voice --cwd ../my-product --diff
node bin/aureform.mjs add communications-live twilio-browser-voice telnyx-browser-voice --cwd ../my-product
pnpm --dir ../my-product install
```

`communications-demo` instala la entrada local de dominio/demo por separado. Estas entradas no incorporan un SDK carrier obligatorio. Instala y fija el SDK oficial aparte en tu consumidor. Twilio acepta un `createDevice` o `loadSdk`; Telnyx, un `createClient` o `loadSdk`, además de `remoteElement`, propiedad del host, para audio audible. El consumidor gestiona reproducción y cierre del adaptador. `InjectedCommunicationsSoftphoneExample` monta un adaptador cuyo ciclo de vida ya gestiona tu Client Component.

Sigue la [guía del backend Node independiente](../../../examples/communications-backend/README.md) para configuración privada, orígenes, emisión de tokens y topologías de cada proveedor. Su endpoint health predeterminado funciona sin credenciales; las sesiones de agente siguen denegadas. Las operaciones carrier están apagadas y los permisos vacíos. La [referencia de implementación backend](../../../docs/communications/INBOUND-VOICE-REFERENCE.md) registra fuentes oficiales y gates de llamadas reales pendientes. Revisa el estado de implementación antes de considerar utilizable la combinación navegador/cliente/backend.

Una integración live necesita backend autenticado, credenciales de navegador de corta duración, HTTPS, webhooks verificados, comandos autorizados y decisiones de cola/routing del servidor. Prueba Twilio y Telnyx por separado, incluidos audio entrante, capacidades anunciadas, reconexión y cierre. Espera o DTMF sin soporte deben permanecer desactivados. Obtén autorización explícita antes de comprar números, realizar llamadas o habilitar recursos de pago.

Cloudflare o GitHub Pages pueden alojar la demo estática. Credenciales del carrier, webhooks, emisión de tokens y sesiones realtime pertenecen a un backend desplegado por separado; una clave pública no convierte una exportación estática en ese backend.

Consulta el [estado de implementación](../../../docs/communications/IMPLEMENTATION-STATUS.md) para conocer evidencias y condiciones pendientes. La [guía de seguridad](../../../docs/communications/SECURITY-COMPLIANCE.md) y la [investigación de arquitectura](../../../docs/communications/ARCHITECTURE-RFC.md) siguen siendo la referencia para producción. SMS, WhatsApp, transferencias, grabaciones, campañas y agentes de voz con IA quedan fuera de esta primera integración de softphone.

La [fuente implementada en Figma](../../../design/reports/softphone-native-source-2026-10-21.md) incluye estados de llamada, composiciones del workspace y diálogos editables, con un mapa de código propio y dos templates locales de Code Connect. El [registro de validación](../../../docs/communications/VALIDATION.md) distingue las pruebas del navegador local, la compatibilidad de tipos SDK y las pruebas del backend de referencia de las llamadas reales.
