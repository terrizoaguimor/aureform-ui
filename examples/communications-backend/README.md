# Referencia de voz entrante: Node 22, Twilio y Telnyx

Servicio HTTP ejecutable, independiente del sitio estático de Aureform. Implementa admisión por horario, una FIFO en memoria, reserva de un agente por llamada, tokens de navegador, firmas de webhooks y las acciones reales de los dos proveedores. **Las llamadas y el audio con cuentas reales siguen sin verificar.** Las pruebas usan datos ficticios y transportes inyectados.

Código de referencia Apache-2.0. La dependencia servidor `twilio` está fijada en **6.2.0**, bajo MIT; su lockfile pertenece exclusivamente a este ejemplo. Telnyx usa HTTP v2 con `fetch` de Node. No hay modelos, pesos, SDK de navegador, dependencias de Next ni cambios al paquete raíz. Los gates de licencias de modelos del RFC siguen vigentes para futuras fases de IA.

El [documento de implementación](../../docs/communications/INBOUND-VOICE-REFERENCE.md) distingue código comprobado, APIs documentadas y aceptación de laboratorio pendiente. No implementa Flow DSL, IA, campañas, transferencias, hold, grabación, voicemail ni callbacks salientes.

La nueva [configuración automática](../../docs/communications/AUTOMATIC-SETUP.md) añade un laboratorio **single-owner**, con inspección de cuenta, número existente, revisión y apply explícito. Su [validación propia](../../docs/communications/AUTOMATIC-SETUP-VALIDATION.md) registra pruebas de navegador, autenticación privada, tipos SDK instalados y efectos de proveedor sintéticos. Configurar recursos no acredita registro SDK, entrega de webhooks ni audio real. La primera aceptación real prevista es Twilio; no se declara realizada.

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

## Setup automático privado

Desde este directorio, tras instalar las dependencias, sustituye los dominios de ejemplo por tus orígenes reales:

```sh
npm run setup:init -- --public-origin https://voice.example.com --frontend-origin https://app.example.com
npm run setup:serve
```

[setup-lab.mjs](setup-lab.mjs) usa `~/.config/aureform-communications` por defecto. `--directory PRIVATE_DIRECTORY` permite otro directorio **fuera del repositorio**. Rechaza archivos existentes, crea permisos privados y escribe `.env` al final. Genera `access-code.txt`, `lab-config.json`, `SETUP_ADMIN_AUTH_SHA256` y una `SETUP_MASTER_KEY` Base64 de **32 bytes**. El servidor crea `encrypted-setup.json` con AES-256-GCM para credenciales, secretos derivados y journal. Los ignore rules excluyen estos archivos privados; no se deben trasladar al checkout.

La inicialización fija un horario de laboratorio todos los días en `America/Bogota`, sin calendario festivo implícito; agentes/proveedores/permisos comienzan vacíos. No modifica cuentas ni hace llamadas. `setup:serve` escucha por defecto sólo en `127.0.0.1:8788`; el operador aporta proxy/túnel HTTPS con el `PUBLIC_BASE_URL` exacto y preservación de cuerpo/ruta firmados. El frontend debe estar en la allowlist de orígenes exactos.

Si expones el laboratorio con Cloudflare, usa un [túnel nombrado](https://developers.cloudflare.com/tunnel/get-started/). [Quick Tunnels no admite SSE ni clientes automáticos con su autenticación por email](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/). Las rutas `/webhooks/*` deben recibir firmas del carrier sin login/OTP interactivo; setup y sesiones siguen autenticados por bearer/origen. Conserva `Content-Type: text/event-stream` en `/v1/communications/events` para [evitar buffering](https://developers.cloudflare.com/tunnel/troubleshooting/). Credenciales/archivos de token y configuración del hostname/IDs privados van fuera de Git; no publicar valores del laboratorio. Salud del túnel no certifica registro WebRTC ni medios.

El 2026-10-21 el mantenedor reportó **HTTPS health 200 mediante el túnel nombrado privado**. Sólo acredita alcance HTTP de esa ruta: no demuestra entrega SSE, webhook firmado, registro del navegador ni audio. No se publican hostname, IDs o credenciales privados.

El host privado [ReferenceConnection](../../src/components/communications/reference-connection.tsx) recibe una URL aprobada como `https://voice.example.com/v1/communications`. `NEXT_PUBLIC_COMMUNICATIONS_BACKEND_URL` puede seleccionar ese host en el consumidor: es una URL **pública**, nunca un secreto. No definirla en la demo pública, ni poner allí claves, tokens o códigos de acceso.

Elige proveedor **antes** del login. **Código de acceso del propietario** autentica la aplicación y se obtiene del archivo privado; está separado de los dos campos del carrier. Login devuelve un bearer de diez minutos, limitado al origen y guardado en memoria. Renovarlo conserva el host y una llamada montada. Tras autenticar, `/setup/connections` devuelve hasta dos resúmenes públicos sin secretos y permite reanudar el perfil elegido con `ConnectedSoftphone.initialConfiguration`, sin generar otra clave, aplicar cambios ni conectar automáticamente. El selector queda bloqueado tras el login.

| Proveedor | Campos | Cambios internos tras revisión |
| --- | --- | --- |
| Twilio | Account SID + Auth token (principal) | Cuenta Full activa, clave Standard API propia, secreto de única entrega y rutas HTTPS inbound/status del número existente; REST US1. Se retiran precedencias/fallback de voz conflictivos y se verifican ajustes de mensajería conservados. |
| Telnyx | API key + Public key Ed25519 Base64 | Call Control Application, Credential Connection separada sin perfil saliente y asociación del número; readback estricto de recursos/política. El issuer de credenciales browser es un paso separado del setup. |

No se compra un número. El propietario selecciona uno de su cuenta con voz, revisa el plan y confirma expresamente cualquier reemplazo de routing. Inspección/plan son reads; apply sí modifica recursos aunque `ENABLE_CARRIER_OPERATIONS=false`. Ese flag controla llamadas, no convierte el setup autorizado en sólo lectura.

Twilio requiere una cuenta **Full** activa y el **Auth Token principal**. Según las fuentes oficiales consultadas el **2026-10-21**, [Trial bloquea `<Dial><Client>`](https://www.twilio.com/docs/usage/trials/try-out-voice) y las [firmas de webhooks usan el token principal](https://www.twilio.com/docs/usage/security), aunque un [token secundario pueda autenticar REST](https://www.twilio.com/docs/iam/api/secondary_authtoken). El adapter verifica tipo e identidad del token mediante [Account fetch](https://www.twilio.com/docs/iam/api/account) antes de los efectos de configuración. Cuenta no Full/no verificable o token primario ausente, enmascarado o diferente se rechazan; no hay upgrade ni promoción/rotación automática. `permission-denied` puede indicar el tipo de cuenta; `invalid-credentials`, el token ingresado. No se agregan campos al asistente.

El contrato de setup es `aureform.setup.v1`; todas las rutas usan `Origin` exacto y, salvo login, `Authorization: Bearer` del propietario:

| Método/ruta | Función |
| --- | --- |
| POST `/v1/communications/setup/login` | `{accessCode}` → bearer de propietario y expiración. |
| GET `/v1/communications/setup/connections` | Array de resúmenes configurados sin secretos, máximo dos. |
| POST `/v1/communications/setup/inspect` | `{provider, accountSid, authToken}` o `{provider, apiKey, publicKey}` → opciones de números existentes. |
| POST `/v1/communications/setup/plan` | `{connectionId, numberId}` → plan/expiración/pasos/reemplazo. |
| POST `/v1/communications/setup/apply` | `{planId, confirmation: {configure: true, replaceExistingRouting: boolean}}`. |
| GET `/v1/communications/setup/status?connectionId=…` | Lee el journal, sin ejecutar ni reparar automáticamente. |
| POST `/v1/communications/setup/authorize-test` | `{connectionId, callerNumber, seconds, confirmation: true}` → permiso entrante acotado, `observedCall: false`. |

El resultado configurado mantiene `checks.browser: pending` y `checks.testCall: pending`. `checks.webhooks: passed` es readback de URLs, no entrega observada de un webhook firmado. El registro SDK exige **Conectar sesión** por separado y no certifica audio. Un apply perdido/interrumpido queda `unknown`; el reinicio conserva esa incertidumbre. Plan y apply revisan también journals persistidos por **proveedor + ID del número seleccionado**: `configuring`, `unknown` y `failed` bloquean otra operación sobre ese par, incluso desde otra inspección o tras reiniciar. **Consultar configuración** no reintenta ni hace rollback. Antes de recuperar, un operador debe contrastar journal y recursos/routing reales; no borrar el estado para forzar otra mutación.

El issuer Telnyx automático ya está **implementado y conectado**. [AutomaticSetup](lib/automatic-setup.js) conserva `devices` y checkpoints cifrados por agente; [setup-providers](lib/setup-providers.js) crea/relee el padre conocido, exige la identidad SIP/conexión propia y verifica `exp` dentro de la expiración del padre y del TTL solicitado (60–300 segundos). Ese TTL es un límite solicitado y probado con respuestas sintéticas; **no se ha demostrado su disponibilidad/aceptación real por Telnyx**. Espera propagación y vuelve a comprobar recursos/política antes de entregar el JWT. Leer `exp` no verifica su firma ni convierte el token en inbound-only.

La referencia usa una identidad browser gestionada por agente. Solo una credencial **conocida y verificada** puede rotar cerca de su vencimiento mientras no haya llamada activa; el servidor comprueba el estado antes y después de emitir, incluido el race de una llamada que llega durante la emisión. Un create/mint **pending/unknown** sigue bloqueado aunque caduque, sin recrear otro recurso. Los [tests HTTP del issuer](test/managed-credentials-http.test.js) usan efectos de proveedor sintéticos. El suite ampliado pasó **245/245 con Node 22.22.3** (54 existentes + 12 setup + 115 proveedor + 30 HTTP + 23 initializer + 11 managed issuer HTTP), incluido el guard proveedor+número y 75 casos de requisitos/rechecks de cuenta y token Twilio. El [recibo de esta extensión](../../docs/communications/AUTOMATIC-SETUP-VALIDATION.md) registra también 1,036 unitarias, tipos/lint, navegador e instalación de consumidor. Esto no es aceptación live, renovación de audio sin interrupción ni certificación productiva.

**Autorizar llamada de prueba** exige navegador conectado y agente **Disponible**, proveedor concordante, caller E.164 exacto y consentimiento de cargos. El permiso dura cinco minutos, admite una llamada y un máximo de 120 segundos en la UI; API acepta 30–120 segundos. Al caducar se limpia la UI sin renovar el permiso. Después el propietario llama desde su teléfono al número mostrado: no existe autollamada ni endpoint outbound PSTN. La pierna browser/SIP vinculada puede ser facturable y los límites operativos no son un cap de factura.

Persisten cifrados los recursos/journal de setup; **no** persisten llamadas, cola, reservas, permisos ni dedup. Es un único proceso/propietario, no OIDC, KMS, multitenancy, recuperación durable de llamadas ni servicio gestionado. No mezclar setup automático con perfiles manuales: el servidor rechaza esa combinación.

Fuentes oficiales consultadas **2026-10-21**: [Twilio Standard Keys](https://www.twilio.com/docs/iam/api-keys/key-resource-v2010), [routing IncomingPhoneNumber](https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource), [OpenAPI oficial Telnyx](https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json) y [JWT Telnyx](https://developers.telnyx.com/docs/voice/webrtc/auth/jwt). Permisos/región, clave pública real, propagación/expiración, bloqueo outbound y medios requieren aceptación independiente. La [fuente Figma de la extensión, página 14](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=585-59) conserva su [mapa de código y límites](../../design/figma/communications-setup-native-source-2026-10-21.json).

## Configuración privada manual de laboratorio

Los pasos siguientes son la topología manual alternativa, no campos adicionales del asistente automático.

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

La configuración entregada tiene `ENABLE_CARRIER_OPERATIONS=false` y `approvals: []`. En el modo automático, el permiso explícito de `/setup/authorize-test` habilita una regla entrante acotada durante esa ventana; configurar el proveedor por sí solo no lo hace. Tokens Twilio se generan localmente; los reads/mint de JWT Telnyx no responden ni originan llamadas. Una sesión nunca arranca audio PSTN automáticamente.

Antes de cualquier experimento real se requiere autorización de gasto **separada** y una ventana de laboratorio concreta. Este trabajo de implementación no la otorga. Los **USD 75** del roadmap siguen siendo una propuesta no autorizada.

En la ruta **manual**, después de esa autorización, un operador puede habilitar la variable y añadir un objeto por **una** llamada esperada. El asistente automático crea esa regla mediante su autorización de prueba; no exige editar este JSON:

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

## Topología manual Twilio

En una cuenta elegible con un número aprobado, un operador configura manualmente:

1. Voice webhook del número, método POST: `https://YOUR_BACKEND/webhooks/twilio/inbound`.
2. Status callback del número, método POST: `https://YOUR_BACKEND/webhooks/twilio/status`. El backend no configura ese recurso; sin callback terminal o reconciliación no declara libre el agente.
3. API key SID/secret para Access Tokens y REST, Account SID esperado y Auth Token para la firma HMAC-SHA1. Son secretos exclusivamente del servidor. Verificar región y permisos del perfil elegido.
4. El consumidor carga opcionalmente su SDK Voice, obtiene `credentials.token`, registra el dispositivo y solo entonces envía `connect` y `presence: available`. Esta referencia emite **VoiceGrant entrante solamente**, sin `outgoingApplicationSid`; no necesita un TwiML App saliente.

Con agente away/offline, TwiML reproduce el aviso de espera y ejecuta `Pause` + `Redirect` con tickets nuevos. Es **FIFO del dominio**, no `<Queue>`, TaskRouter ni una conferencia. Cada poll firmado consulta la reserva actual. Cuando hay reserva, el servidor devuelve `<Dial><Client>` con identidad fija, grabación OFF, límite de duración y callbacks propios. No usa `calls.create()` para marcar un número PSTN.

La oferta incluye `aureformCallId` y `aureformReservationId` como `Parameter`. El SDK recibe el **CallSid hijo**; el backend conserva el **CallSid padre PSTN** y valida `ParentCallSid`. Una notificación anterior a la creación del hijo puede referirse al padre; no se inventa una identidad browser en ese caso. El callback `in-progress` del hijo o el resultado `DialBridged` documentan la conexión de esas piernas; no certifican sonido audible.

`dial-action` responde `<Hangup>` al terminar/no contestar el intento. No se reorigina una segunda pierna con un permiso que admite solo una. El caller no se reencola silenciosamente después de decline/no-answer.

## Topología manual Telnyx

Un operador prepara manualmente:

1. Un número aprobado asociado a una **Call Control Application**, webhook v2 POST `https://YOUR_BACKEND/webhooks/telnyx`. No mezclar TeXML con Call Control para esta llamada.
2. API key servidor y clave pública Ed25519 Base64 de la cuenta. Deben corresponder a esa aplicación/entorno.
3. Una **Credential Connection distinta** para WebRTC/SIP y una telephony credential por dispositivo. Para recibir SIP interno, revisar `sip_uri_calling_preference: internal`; esa preferencia regula recepción SIP y **no bloquea origination PSTN**.
4. Revisar la conexión exacta en **Telnyx Portal → Voice Suite → SIP Trunking → conexión configurada → Outbound Settings → Outbound Voice Profile**, sin perfil saliente asociado. La documentación describe el rechazo **D38/403** cuando falta ese perfil. Fijar `browserOutboundDisabledVerified: true` solamente tras esa revisión manual; sigue siendo una afirmación del operador, no una certificación de cuenta.
5. Preaprovisionar esa credencial con `expires_at` dentro del TTL configurado, por defecto cinco minutos y nunca más de diez. El backend hace GET de conexión/credencial, verifica resource ID/SIP username/expiración, y POST `…/telephony_credentials/{id}/token`. Si no hay expiración breve verificable, **no entrega un JWT de 24 horas**. Esperar propagación del nuevo recurso según la documentación antes de registrar el SDK.

**Privilegios del JWT:** representa la identidad SIP de la credencial, no un permiso exclusivo para recibir. El SDK documenta `newCall`; `capabilities.outboundPstn: false` limita el contrato del consumidor y no atenúa ese token. La revisión manual anterior es un prerrequisito **no automatizado, solo de laboratorio**. Fuentes consultadas **2026-10-21, America/Bogota**: [JWT](https://developers.telnyx.com/docs/voice/webrtc/auth/jwt), [SDK JS](https://developers.telnyx.com/docs/development/webrtc/js-sdk/reference/telnyxrtc), [ajustes SIP](https://support.telnyx.com/en/articles/4404448-sip-connection-inbound-outbound-settings) y [D38](https://support.telnyx.com/en/articles/4409457-telnyx-sip-response-codes).

Antes de cada emisión/renovación, el GET de conexión debe devolver el ID esperado y `outbound.outbound_voice_profile_id: null` explícito: perfil asignado se rechaza; campo omitido, vacío o de tipo ambiguo también se rechaza **antes** de leer la credencial o solicitar JWT. Esa representación estricta se prueba con fixtures; su respuesta real y posibles reglas de cuenta están pendientes de comprobar. Si la cuenta omite el campo, la bandera manual no permite saltar el rechazo. Un GET puntual no asegura que la política no cambie durante la vigencia del token. Ni parking ni un channel limit se usan como prueba de bloqueo. La recepción SIP y un rechazo real de origination requieren aceptación posterior específicamente autorizada.

En la **topología manual**, el backend no crea, renueva ni elimina esas credenciales preaprovisionadas. La expiración de la credencial es terminal; reemplazo manual y renovación durante audio activo son gates pendientes. POST `/session` conserva la sesión backend, pero no convierte una credencial vencida en renovable. El modo automático sí implementa el issuer cifrado y la rotación idle descritos arriba, probados con transportes sintéticos. Propagación/expiración reales, política de cuenta, registro y continuidad de audio siguen requiriendo aceptación independiente.

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

Single process, memoria acotada: dedup, cola, reservas, sesiones, notas, permisos de llamada y cursor desaparecen al reiniciar. El setup automático persiste su configuración/journal cifrados; eso no vuelve durable el ledger de llamadas. No hay HA, SQL, outbox durable, recuperación automática de llamadas, rate limiting distribuido, OIDC, auditoría productiva persistente ni garantía financiera/exactly-once. No desplegar múltiples réplicas de esta referencia.

Las transiciones terminales no regresan por un evento tardío. Los eventos Telnyx previos a initiated se bufferizan de forma acotada; terminal-before-initiated no dispara una nueva respuesta. El `command_id` del carrier no sustituye el ledger del dominio ni autoriza reintentos indefinidos. Twilio clásico no aporta un timestamp equivalente: se valida HMAC y dedup en memoria, no una protección durable contra replay.

Un timeout o error de transporte no certifica que el proveedor no ejecutó la acción. La reserva y el permiso siguen retenidos; no se crea otra pierna. `reconcile` consulta solo las piernas conocidas. Libera cuando ambas tienen evidencia terminal; una pierna desconocida no se declara ausente, y un GET negativo/no disponible no se transforma en hangup. Una incertidumbre sin ID exige inspección de la cuenta por un operador antes de reiniciar/rearmar.

Pendientes **por cada carrier**: cuenta/KYC y perfil elegible, permisos/región, dos dispositivos reales, auth del consumidor, registro SDK, callbacks con los IDs verdaderos, timbre/respuesta, audio bidireccional, mute/DTMF/hangup, cola sin agente, orden/duplicados/reintentos, closed/holiday, pérdida del SDK, renovación, reconciliación y factura. Eso requiere llamadas autorizadas posteriormente. Las pruebas del ejemplo no sustituyen esa aceptación.

Fuentes oficiales y fechas independientes se encuentran en [INBOUND-VOICE-REFERENCE.md](../../docs/communications/INBOUND-VOICE-REFERENCE.md); no se certifica GA, cuentas o producción a partir de una página de precios.
