# Referencia de voz entrante: Node 22, Twilio y Telnyx

Servicio HTTP ejecutable, independiente del sitio estático de Aureform. Implementa admisión por horario, una FIFO en memoria, reserva de un agente por llamada, tokens de navegador, firmas de webhooks y las acciones reales de los dos proveedores. **Las llamadas y el audio con cuentas reales siguen sin verificar.** Las pruebas usan datos ficticios y transportes inyectados.

Código de referencia Apache-2.0. La dependencia servidor `twilio` está fijada en **6.2.0**, bajo MIT; su lockfile pertenece exclusivamente a este ejemplo. Telnyx usa HTTP v2 con `fetch` de Node. No hay modelos, pesos, SDK de navegador, dependencias de Next ni cambios al paquete raíz. Los gates de licencias de modelos del RFC siguen vigentes para futuras fases de IA.

El [documento de implementación](../../docs/communications/INBOUND-VOICE-REFERENCE.md) distingue código comprobado, APIs documentadas y aceptación de laboratorio pendiente. No implementa Flow DSL, IA, campañas, transferencias, hold, grabación, voicemail ni callbacks salientes.

## Ejecutar sin credenciales

Desde este directorio, con Node 22.18 o posterior de la rama 22:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm test
npm start
```

`GET http://127.0.0.1:8788/health` responde. Sin configuración, todas las sesiones están denegadas y las operaciones de carrier están deshabilitadas. No existe un modo mock oculto que se convierta en carrier live. Las fixtures están exclusivamente en `test/`.

Docker es una alternativa de empaquetado, no un despliegue realizado. El Dockerfile usa Node 22 y usuario sin privilegios, instala solo las dependencias de este directorio y no incluye `.env` ni `lab-config.json`. Un consumidor debe fijar/verificar su digest de imagen y montar configuración/secrets de forma privada; no hay SQL ni persistencia en este contenedor.

## Configuración privada de laboratorio

Copiar `.env.example` a `.env` y `lab-config.example.json` a `lab-config.json`. Sustituir todos los placeholders; el validador rechaza números, usuarios SIP e identidades inválidos. Usar `npm run start:env` para cargar `.env`. Nada de esos archivos privados debe publicarse.

La configuración fija:

- Un tenant, uno o dos agentes, orígenes exactos y un número entrante E.164 por carrier.
- El SHA-256 de un bearer bootstrap de alta entropía, mediante `bootstrapHashEnv`. El navegador recibe ese bearer por el mecanismo de login del consumidor; jamás una API key/Auth Token del carrier.
- Identidad Twilio y credencial/SIP username Telnyx distintos por agente/dispositivo. El servidor los resuelve; no acepta IDs de tenant, agente, cuenta, conexión o destinos del cliente.
- Horario IANA, periodos semanales y fechas festivas explícitas. No se descarga ni se presume un calendario nacional. Horarios de esta referencia son política de atención del laboratorio, no una certificación legal.
- Mensaje de cierre y espera, capacidad FIFO, timeout de espera y límites breves. El horario se evalúa en servidor al llegar; una cola admitida no recibe nuevas ofertas si la atención ya cerró.

El bearer backend de sesión dura hasta diez minutos. Se envía en `Authorization: Bearer …` junto al `Origin` permitido. Se conserva en memoria del navegador; no en URLs, ejemplos públicos o logs. El bearer bootstrap es autenticación privada de laboratorio: **no es una implementación OIDC**, ni un login público de producción.

`PUBLIC_BASE_URL` debe ser el **origen HTTPS externo exacto**, sin prefijo de ruta, query ni slash final. Terminar TLS en un proxy propio y preservar ruta/query/cuerpo; no reescribir el formulario firmado. `Host`, `Forwarded` y `X-Forwarded-*` no reconstruyen la URL Twilio. La URL fija es la autoridad.

## Gate de operaciones y presupuesto

La configuración entregada tiene `ENABLE_CARRIER_OPERATIONS=false` y `approvals: []`. Tokens Twilio se generan localmente; los reads/mint de JWT Telnyx no responden ni originan llamadas. Una sesión nunca arranca audio PSTN automáticamente.

Antes de cualquier experimento real se requiere autorización de gasto **separada** y una ventana de laboratorio concreta. Este trabajo de implementación no la otorga. Los **USD 75** del roadmap siguen siendo una propuesta no autorizada.

Después de esa autorización futura, un operador puede habilitar la variable y añadir un objeto por **una** llamada esperada:

```json
{
  "id": "approved-single-call",
  "provider": "twilio",
  "to": "APPROVED_CONFIGURED_E164_NUMBER",
  "from": "APPROVED_LAB_CALLER_E164_NUMBER",
  "expiresAt": "APPROVED_UTC_WINDOW_END",
  "maxCalls": 1,
  "maxSeconds": 120,
  "maxBrowserLegs": 1,
  "maxActions": 8,
  "consentScope": "inbound-lab-single-call"
}
```

Los placeholders de ese objeto también deben sustituirse. `pstnCallId` puede fijarse adicionalmente si ya se conoce. Sin ese campo, el primer webhook firmado que coincida exactamente con proveedor/número/caller/ventana consume el permiso y lo liga al ID PSTN observado. Un duplicado no consume otro permiso. Un número diferente, caller anónimo/no previsto, permiso vencido o gate apagado **no ejecuta answer, speak ni apertura de pierna browser**.

No hay API de compra de números ni marcación PSTN. La llamada de navegador secundaria sí consume recursos: Twilio ejecuta `<Dial><Client>`; Telnyx origina exclusivamente el SIP URI del agente configurado mediante `POST /v2/calls`. **Esa pierna SIP saliente interna es parte del ingreso PSTN, es facturable y no equivale a una campaña o a un endpoint de destinos libres.**

`maxSeconds`, timeouts y contadores son límites operativos de laboratorio, no un cap garantizado de factura. Al expirar, el proceso solicita hangup; depende de proceso/red/callbacks y no sobrevive un reinicio. El tiempo de cola, piernas secundarias, anuncios, redondeo, impuestos y renta del número pueden facturarse. Esta referencia no vuelve a cotizar las tarifas del corte documental del 20 de octubre.

## Configurar Twilio, sin modificar la cuenta desde este ejemplo

En una cuenta elegible con un número aprobado, un operador configura manualmente:

1. Voice webhook del número, método POST: `https://YOUR_BACKEND/webhooks/twilio/inbound`.
2. Status callback del número, método POST: `https://YOUR_BACKEND/webhooks/twilio/status`. El backend no configura ese recurso; sin callback terminal o reconciliación no declara libre el agente.
3. API key SID/secret para Access Tokens y REST, Account SID esperado y Auth Token para la firma HMAC-SHA1. Son secretos exclusivamente del servidor. Verificar región y permisos del perfil elegido.
4. El consumidor carga opcionalmente su SDK Voice, obtiene `credentials.token`, registra el dispositivo y solo entonces envía `connect` y `presence: available`. Esta referencia emite **VoiceGrant entrante solamente**, sin `outgoingApplicationSid`; no necesita un TwiML App saliente.

Con agente away/offline, TwiML reproduce el aviso de espera y ejecuta `Pause` + `Redirect` con tickets nuevos. Es **FIFO del dominio**, no `<Queue>`, TaskRouter ni una conferencia. Cada poll firmado consulta la reserva actual. Cuando hay reserva, el servidor devuelve `<Dial><Client>` con identidad fija, grabación OFF, límite de duración y callbacks propios. No usa `calls.create()` para marcar un número PSTN.

La oferta incluye `aureformCallId` y `aureformReservationId` como `Parameter`. El SDK recibe el **CallSid hijo**; el backend conserva el **CallSid padre PSTN** y valida `ParentCallSid`. Una notificación anterior a la creación del hijo puede referirse al padre; no se inventa una identidad browser en ese caso. El callback `in-progress` del hijo o el resultado `DialBridged` documentan la conexión de esas piernas; no certifican sonido audible.

`dial-action` responde `<Hangup>` al terminar/no contestar el intento. No se reorigina una segunda pierna con un permiso que admite solo una. El caller no se reencola silenciosamente después de decline/no-answer.

## Configurar Telnyx, sin modificar la cuenta desde este ejemplo

Un operador prepara manualmente:

1. Un número aprobado asociado a una **Call Control Application**, webhook v2 POST `https://YOUR_BACKEND/webhooks/telnyx`. No mezclar TeXML con Call Control para esta llamada.
2. API key servidor y clave pública Ed25519 Base64 de la cuenta. Deben corresponder a esa aplicación/entorno.
3. Una **Credential Connection distinta** para WebRTC/SIP y una telephony credential por dispositivo. Para recibir SIP interno, revisar `sip_uri_calling_preference: internal`; esa preferencia regula recepción SIP y **no bloquea origination PSTN**.
4. Revisar la conexión exacta en **Telnyx Portal → Voice Suite → SIP Trunking → conexión configurada → Outbound Settings → Outbound Voice Profile**, sin perfil saliente asociado. La documentación describe el rechazo **D38/403** cuando falta ese perfil. Fijar `browserOutboundDisabledVerified: true` solamente tras esa revisión manual; sigue siendo una afirmación del operador, no una certificación de cuenta.
5. Preaprovisionar esa credencial con `expires_at` dentro del TTL configurado, por defecto cinco minutos y nunca más de diez. El backend hace GET de conexión/credencial, verifica resource ID/SIP username/expiración, y POST `…/telephony_credentials/{id}/token`. Si no hay expiración breve verificable, **no entrega un JWT de 24 horas**. Esperar propagación del nuevo recurso según la documentación antes de registrar el SDK.

**Privilegios del JWT:** representa la identidad SIP de la credencial, no un permiso exclusivo para recibir. El SDK documenta `newCall`; `capabilities.outboundPstn: false` limita el contrato del consumidor y no atenúa ese token. La revisión manual anterior es un prerrequisito **no automatizado, solo de laboratorio**. Fuentes consultadas **2026-10-21, America/Bogota**: [JWT](https://developers.telnyx.com/docs/voice/webrtc/auth/jwt), [SDK JS](https://developers.telnyx.com/docs/development/webrtc/js-sdk/reference/telnyxrtc), [ajustes SIP](https://support.telnyx.com/en/articles/4404448-sip-connection-inbound-outbound-settings) y [D38](https://support.telnyx.com/en/articles/4409457-telnyx-sip-response-codes).

Antes de cada emisión/renovación, el GET de conexión debe devolver el ID esperado y `outbound.outbound_voice_profile_id: null` explícito: perfil asignado se rechaza; campo omitido, vacío o de tipo ambiguo también se rechaza **antes** de leer la credencial o solicitar JWT. Esa representación estricta se prueba con fixtures; su respuesta real y posibles reglas de cuenta están pendientes de comprobar. Si la cuenta omite el campo, la bandera manual no permite saltar el rechazo. Un GET puntual no asegura que la política no cambie durante la vigencia del token. Ni parking ni un channel limit se usan como prueba de bloqueo. La recepción SIP y un rechazo real de origination requieren aceptación posterior específicamente autorizada.

El backend **no crea, renueva ni elimina credenciales**. La expiración de la credencial es terminal; reemplazo manual y renovación durante audio activo son gates pendientes. POST `/session` conserva la sesión backend, pero no convierte una credencial vencida en renovable.

Flujo Call Control: `call.initiated` entrante validado → autorización/horario → `answer` → observar `call.answered` → FIFO/reserva → `POST /v2/calls` **solo a `sip:gencred…@sip.telnyx.com` fijo** con `link_to`, `bridge_on_answer`, `prevent_double_bridge`, `command_id` y `client_state` → observar piernas/`call.bridged`. HTTP 200 no prueba answer ni bridge; `is_alive: false` de la respuesta de dial tampoco prueba terminación.

Los IDs `call_control_id`, `call_leg_id` y `call_session_id` se conservan por pierna. El ID local del SDK no se presume igual a ninguno de ellos. El cliente solo contesta un objeto SDK que pueda correlacionar con el binding autenticado.

Fuera de horario: answer aprobado → `call.answered` → `speak` básico `en-US` con mensaje fijo → `call.speak.ended` → hangup. Si el anuncio/callback falla, timeout/resultado remoto quedan visibles y se requiere reconciliación; no se anuncia voicemail ni callback inexistente. La espera abierta en Telnyx mantiene la pierna contestada **en silencio**: este ejemplo no añade música, assets, media engine ni una API de cola nativa.

## Wire HTTP v1

`contractVersion: aureform.inbound-voice.v1`.

| Endpoint | Autorización y función |
| --- | --- |
| GET `/v1/communications/session?provider=twilio` | Bootstrap bearer + Origin exacto. Selector de proveedor validado contra el principal; identidad/número/conexión fijos. |
| POST `/v1/communications/session` | JSON `{provider}` inicialmente, o `{}` con session bearer para renovar **mismo** sessionId/tenant/agente/proveedor/reserva. Rota el bearer; reconectar SSE con el nuevo. |
| GET `/v1/communications/events` | Session bearer en header; stream SSE mediante `fetch`, evento `snapshot`. Reconecta con snapshot completo; cursor solo de este proceso. |
| POST `/v1/communications/commands` | Session bearer; `commandId` UUID + `expectedRevision` + `type` + `payload` acotado + `callId` cuando corresponda. |
| POST `/webhooks/twilio/{inbound,wait,dial-action,client-status,status}` | Firma sobre URL pública fija y todos los parámetros. Solo `application/x-www-form-urlencoded`. |
| POST `/webhooks/telnyx` | Ed25519 sobre `timestamp\|rawbody`, ventana ±300 s, JSON original hasta 64 KiB. |

Sesión devuelve `{contractVersion,sessionId,sessionToken,expiresAt,provider,tenantId,agentId,credentials,envelope}`. `credentials` contiene `{kind,token,expiresAt}` exclusivamente para el SDK.

Comandos y SSE usan **el mismo envelope**:

```text
type: snapshot
contractVersion, scope: {sessionId, tenantId, agentId, provider}
revision, cursor
snapshot: {mode,provider,connection,presence,activeCall,queue,history,error,
           businessHours,businessHoursOpen,audio,caps,events}
capabilities: {inbound:true,outboundPstn:false,hold:false,transfer:false,
               recording:false,dtmf:true,mute:true,notes:true}
bindings: [{callId,provider,pstnCallId,browserCallId,browserCallLegId,
            callSessionId,reservationId,phase,topology,browserAnswered,bridgeObserved}]
result?: {commandId,outcome:applied|duplicate|unknown}
error: null | {code,message}
```

`snapshot` coincide con los contratos públicos de Communications; no importa código TS del paquete padre. `providerCallId` es **el ID PSTN real**, no el handle local del SDK. IDs browser nulos significan pendientes. `capabilities` enumera intenciones admitidas por el backend; no acredita una leg utilizable. El backend emite `snapshot.caps` en false y `audio.microphonePermission: unknown`. El consumidor proyecta mute/DTMF únicamente al intersectar ese inventario con el binding autenticado propio, una leg SDK única realmente correlacionada, conexión ready y estado nativo activo; mute también admite held. Ambos quedan false con IDs pendientes, reconexión o reconciliación. Hold sigue false.

Tipos permitidos: `connect`, `disconnect`, `presence`, `heartbeat`, `accept`, `decline`, `hangup`, `mute`, `hold`, `dtmf`, `notes`. `reconcile` es adicional **solo para operador autenticado**, sin requisito de botón en el softphone. `hold` siempre devuelve 422. `mute`/`dtmf` autorizan y registran intención local; el SDK del navegador ejecuta el efecto, no una API de medios universal inventada. `notes` es memoria acotada a 2.000 caracteres.

`accept` valida la reserva **antes** de `call.accept()`/`call.answer()` en el SDK. La respuesta no marca audio conectado. `connect` es la declaración del consumidor tras registro SDK; no prueba micrófono ni una cuenta compatible. Heartbeat recomendado cada veinte segundos. `disconnect`, SDK perdido o vencimiento de heartbeat conserva cualquier reserva activa.

409 devuelve el envelope vigente ante revisión obsoleta/resultado remoto pendiente. Repetir el mismo commandId/intent es idempotente aunque la revisión haya avanzado; cambiar el intent con ese ID es conflicto. 202/outcome `unknown` pausa el ciclo y conserva reserva/permiso. Errores no incluyen respuestas crudas ni secretos del carrier.

## Límites y aceptación pendiente

Single process, memoria acotada: dedup, cola, reservas, sesiones, notas y cursor desaparecen al reiniciar. No hay HA, SQL, outbox durable, recuperación automática, rate limiting distribuido, OIDC, auditoría persistente ni garantía financiera/exactly-once. No desplegar múltiples réplicas de esta referencia.

Las transiciones terminales no regresan por un evento tardío. Los eventos Telnyx previos a initiated se bufferizan de forma acotada; terminal-before-initiated no dispara una nueva respuesta. El `command_id` del carrier no sustituye el ledger del dominio ni autoriza reintentos indefinidos. Twilio clásico no aporta un timestamp equivalente: se valida HMAC y dedup en memoria, no una protección durable contra replay.

Un timeout o error de transporte no certifica que el proveedor no ejecutó la acción. La reserva y el permiso siguen retenidos; no se crea otra pierna. `reconcile` consulta solo las piernas conocidas. Libera cuando ambas tienen evidencia terminal; una pierna desconocida no se declara ausente, y un GET negativo/no disponible no se transforma en hangup. Una incertidumbre sin ID exige inspección de la cuenta por un operador antes de reiniciar/rearmar.

Pendientes **por cada carrier**: cuenta/KYC y perfil elegible, permisos/región, dos dispositivos reales, auth del consumidor, registro SDK, callbacks con los IDs verdaderos, timbre/respuesta, audio bidireccional, mute/DTMF/hangup, cola sin agente, orden/duplicados/reintentos, closed/holiday, pérdida del SDK, renovación, reconciliación y factura. Eso requiere llamadas autorizadas posteriormente. Las pruebas del ejemplo no sustituyen esa aceptación.

Fuentes oficiales y fechas independientes se encuentran en [INBOUND-VOICE-REFERENCE.md](../../docs/communications/INBOUND-VOICE-REFERENCE.md); no se certifica GA, cuentas o producción a partir de una página de precios.
