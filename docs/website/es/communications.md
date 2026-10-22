# Comunicaciones

`SoftphoneWorkspace` es un bloque editable de softphone entrante. Su adaptador predeterminado ejecuta una demostración local: los nombres de proveedor identifican escenarios simulados de Twilio o Telnyx, sin comprar números, conectar un carrier ni realizar llamadas reales.

El botón **Configurar proveedor** de la suite pública abre un asistente de credenciales/número/revisión de sólo lectura. La configuración live exige un consumidor autenticado configurado de forma explícita; pulsar un proveedor no registra el SDK ni autoriza una llamada.

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

## Conecta y configura un proveedor

[CommunicationsSoftphoneTemplate](../../../src/components/templates/communications-softphone-template.tsx) envuelve la composición local existente. Sin configuración live conserva la demo y abre **Configurar proveedor** con credenciales ficticias de sólo lectura. No introduzcas secretos reales en la demo pública.

Un consumidor autenticado aporta `connection?: ConnectedSoftphoneLiveProps` o configura el host privado [ReferenceConnection](../../../src/components/communications/reference-connection.tsx). [ConnectedSoftphone](../../../src/components/communications/connected-softphone.tsx) gestiona el asistente y el adaptador live resultante. El formulario del carrier tiene exactamente dos campos:

| Proveedor | Campos | Recursos gestionados en servidor |
| --- | --- | --- |
| Twilio | **Account SID** y **Auth token** (principal) | Clave Standard API propia/secreto de única entrega y rutas entrantes/status fijas. |
| Telnyx | **API key** y **Public key** | Call Control Application y Credential Connection separada para el navegador. |

Elige un **número de voz existente de tu cuenta**, revisa el plan y confirma el reemplazo de su routing actual cuando corresponda. No hay compra de números, marcación automática ni campos adicionales de IDs del carrier. El setup Twilio actual usa REST US1; siguen aplicando permisos y elegibilidad regional.

Twilio requiere una cuenta **Full** activa y su **Auth Token principal**. [Trial bloquea el `<Dial><Client>` necesario](https://www.twilio.com/docs/usage/trials/try-out-voice) y las [firmas de webhooks usan el token principal](https://www.twilio.com/docs/usage/security). Fuentes consultadas el **2026-10-21**. El backend comprueba estos requisitos antes de configurar recursos; no actualiza la cuenta ni promueve tokens. Rechaza un tipo de cuenta o identidad de token que no pueda verificar. La [guía de setup](../../../docs/communications/AUTOMATIC-SETUP.md#twilio-prerequisites) explica los errores de cuenta/credenciales correspondientes.

Los números que usan la región **US1 implícita** documentada por Twilio son compatibles después de verificar la cuenta y el número. Sólo admite la respuesta JSON válida `404` / `20404` del endpoint de región; los demás fallos conservan el rechazo y una región explícita distinta de US1 queda bloqueada. [La corrección y su evidencia](../../../docs/communications/AUTOMATIC-SETUP-REGION-FIX.md) explican el error anterior de gateway/CORS. Los fallos de dependencias del setup devuelven JSON redactado con HTTP 503. Revisar el plan o recibir un error no aplica routing ni repite automáticamente una escritura al proveedor.

Inicializa el laboratorio Node privado desde el checkout, sustituyendo los dominios de ejemplo por tu backend HTTPS y el origen exacto del frontend:

```sh
cd examples/communications-backend
npm ci --ignore-scripts --no-audit --no-fund
npm run setup:init -- --public-origin https://voice.example.com --frontend-origin https://app.example.com
npm run setup:serve
```

Los archivos del propietario van por defecto a `~/.config/aureform-communications`, fuera de Git. La inicialización rechaza sobrescrituras y escribe `.env` al final. Genera un **Código de acceso del propietario** independiente y una clave de cifrado de **32 bytes** para el archivo de setup AES-256-GCM. Ese login autentica la aplicación; no es una tercera credencial del carrier.

El consumidor puede definir `NEXT_PUBLIC_COMMUNICATIONS_BACKEND_URL=https://voice.example.com/v1/communications`. Esa URL HTTPS aprobada es pública y se incorpora durante el build; nunca debe contener claves, tokens ni códigos de acceso. Déjala sin definir en el sitio público. `PUBLIC_BASE_URL` del backend es el **origen** HTTPS externo exacto, sin la ruta API; autoriza el origen preciso del frontend y conserva los cuerpos firmados de los webhooks.

En Cloudflare usa un [túnel nombrado](https://developers.cloudflare.com/tunnel/get-started/): [Quick Tunnels no soporta SSE y su login por email interactivo no admite clientes webhook automáticos](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/). Mantén credenciales, archivos de token y configuración del hostname privado fuera de Git. Los webhooks usan firmas del proveedor, sin redirigir a un login; el stream debe conservar [`text/event-stream`](https://developers.cloudflare.com/tunnel/troubleshooting/). Un túnel saludable no acredita audio funcional.

Elige proveedor antes del login; después queda bloqueado. El bearer del propietario dura diez minutos y se mantiene en memoria. **Renovar acceso del propietario** conserva montada la sesión/llamada. Tras el login, GET autenticado `/v1/communications/setup/connections` devuelve hasta dos resúmenes configurados sin secretos. El perfil guardado del proveedor se valida mediante `ConnectedSoftphone.initialConfiguration`, sin volver a inspeccionar, crear otra clave, aplicar routing ni conectar automáticamente.

Usa **Inspeccionar cuenta** → selecciona número → **Revisar configuración** → confirma los cambios → **Conectar y configurar**. **Número configurado** acredita readback de configuración, no entrega de un webhook firmado; conectar el navegador es distinto de verificar audio o una llamada real. Usa **Conectar sesión** por separado. Si un apply ya enviado expira o se cancela, usa **Consultar configuración**: el journal privado bloquea reintentos ciegos y no ofrece rollback automático. Un setup persistido `configuring`, `unknown` o `failed` bloquea otro plan/apply para el mismo proveedor + ID del número seleccionado, incluso tras otra inspección o un reinicio.

Para una prueba entrante autorizada, conecta el navegador, selecciona **Disponible**, introduce el teléfono E.164 exacto desde el que llamarás y confirma los cargos. **Autorizar llamada de prueba** admite una sola llamada entrante durante cinco minutos, con hasta 120 segundos en esta UI. Llama tú al número elegido; Aureform no origina la prueba. Al caducar se limpian permiso/consentimiento en la UI, sin renovarlos automáticamente. La pierna interna del navegador/SIP puede generar cargos; no es un tope financiero garantizado.

Es un laboratorio para un único propietario: las credenciales/checkpoints de setup se cifran en disco, pero llamadas, cola y permisos permanecen en memoria. El consumidor aporta los loaders oficiales; un registro fallido o control sin soporte no acredita audio funcional. El issuer gestionado Telnyx está implementado con registros cifrados de dispositivo/checkpoints por agente, límites estrictos de vida del padre/JWT y rotación de credenciales conocidas cuando el agente está inactivo. Las operaciones pending/unknown siguen bloqueadas incluso después de caducar, sin crear duplicados a ciegas. Las pruebas de proveedor/HTTP son sintéticas; no se ha demostrado que Telnyx acepte el TTL breve solicitado para el padre, acepte el JWT live ni permita renovar con audio ininterrumpido.

**Primera llamada entrante real Twilio: confirmada manualmente por el propietario el 21 de octubre de 2026.** El [registro fechado de aceptación](../../../docs/communications/TWILIO-MANUAL-ACCEPTANCE-2026-10-21.md) recoge que la llamada entró y funcionó correctamente. Es evidencia separada de las pruebas automáticas; los controles individuales, medios medidos, recuperación y preparación productiva requieren evidencia adicional. La aceptación live Telnyx permanece pendiente.

La [guía de setup automático](../../../docs/communications/AUTOMATIC-SETUP.md) incluye rutas API exactas, recuperación, archivos privados y fuentes oficiales consultadas el 2026-10-21. La [validación de esta extensión](../../../docs/communications/AUTOMATIC-SETUP-VALIDATION.md) registra **1,036 unitarias**, **245 pruebas de backend con Node 22.22.3**, tipos/lint, recorridos independientes de **38 casos** en raíz y bajo el prefijo de Pages, un consumidor SDK limpio y login privado por HTTPS. Estos resultados conservan sus límites y no reemplazan el recibo anterior del Softphone. La [nueva fuente editable en Figma](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=585-59) registra por separado setup, host conectado, referencia privada y diálogos.

Para el frontend privado local, usa `NEXT_PUBLIC_BASE_PATH='' pnpm dev --webpack --port 3000`; el recibo explica la recuperación del chunk de desarrollo observada. Las exportaciones públicas de producción se comprobaron por separado con Turbopack. El reporte manual Twilio es un checkpoint separado; cada consumidor debe realizar sus propias pruebas autorizadas por proveedor.

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
