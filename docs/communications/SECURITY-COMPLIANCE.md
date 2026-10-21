# Aureform: seguridad, privacidad y gates de comunicaciones

**Corte base de consulta de fuentes:** 2026-10-20, zona `America/Bogota`; adenda de Meta y diseño nativo el 2026-10-21, indicada junto a cada evidencia.  
**Estado del documento:** plan documental; controles propuestos; implementación y validación de producción pendientes.  
**Prioridades del plan:** roadmap iniciado por P1 voice inbound; runtime portable primero en la fase IA; modelo global desde el inicio; backend de referencia Node/Docker portable; UI actual en Cloudflare, separada del backend.  
**Alcance de entrega:** siete documentos del plan y fuentes nativas Figma, incluyendo recuperación de pendientes de diseño anteriores por instrucción del usuario.

Fuente de diseño: [tablero editable de seguridad y cumplimiento](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=341-771). Ver el [recibo nativo](../../design/reports/communications-2026-10-21.md); los controles descritos siguen pendientes de implementación y verificación.

Este documento reúne evidencia pública de proveedores, estándares y autoridades. No certifica el repositorio, una cuenta, un número, un despliegue ni el cumplimiento de todos los países. No constituye una conclusión jurídica global. Las obligaciones dependen del operador, la finalidad, el país y subdivisión de las personas involucradas, el canal, los datos tratados y los contratos aplicables.

El scope de entrega es documental: no incluye integraciones, credenciales, cuentas, llamadas, mensajes, compra de números, aprovisionamiento ni gasto. Los experimentos descritos son criterios futuros: **su ejecución no está acreditada para seguridad, SDK, carriers, llamadas, consentimiento, borrado ni QA de paridad**. La evidencia estructural Figma se distingue de esas pruebas.

## 1. Lectura de la evidencia y estados

Cada hallazgo documental identifica fuente primaria, fecha de consulta, requisitos y límites. Una URL accesible no demuestra disponibilidad en una cuenta concreta. Una página actual puede entrar en conflicto con otra documentación del mismo proveedor o de un intermediario. Las fuentes se parafrasean; no se reproducen cláusulas extensas.

| Estado | Significado y efecto propuesto |
| --- | --- |
| `documented` | La fuente oficial consultada respalda el hecho indicado. No equivale a una prueba de producción. |
| `conditional` | La fuente describe una capacidad u obligación condicionada por producto, país, contrato, permisos, edición o supuesto legal. |
| `provider_conflict` | Hay diferencias documentales relevantes; falta resolverlas para el adaptador y contrato concretos. |
| `missing_provider_verification` | Falta comprobar disponibilidad, versión, límites o comportamiento con evidencia del proveedor. Bloquea el perfil que depende de ello. |
| `missing_legal_verification` | Falta validar alcance, vigencia o interpretación jurídica para el perfil concreto. Bloquea su lanzamiento. |
| `design_parity_pending` | Auditoría estructural Figma realizada según evidencia aportada; recuperación y paridad de todas las UI, incluidas 1.4/1.5, pendientes de QA. |
| `proposed` | Requisito o control de Aureform planteado en este documento; no se afirma implementado. |
| `hypothesis` | Decisión provisional que necesita datos y validación. |
| `experiment_pending` | Hay un criterio demostrable, pero no un resultado. |

**Regla propuesta:** un perfil puede tener fuentes `documented` y seguir bloqueado. La autorización de producción requiere evidencia independiente de legalidad, disponibilidad del proveedor, seguridad, datos, costes, diseño y operación. Un desconocido no se transforma en permiso mediante un valor por defecto.

## 2. Modelo global y perfiles de autorización

**Propuesta de modelo, no cambio de arquitectura:** describir capacidades y políticas mediante datos versionados por perfil. El backend portable y la separación de UI y ejecución son recomendaciones del plan por revisar; este documento no demuestra su implementación actual.

| Dimensión del perfil | Información que debe quedar explícita antes de habilitarlo |
| --- | --- |
| Operador y tenant | Entidad que presta el servicio; propietario de la cuenta y número; responsable/encargados de datos; pertenencia y roles de usuarios. |
| Territorio | País y subdivisión del operador, origen, destino y participantes; ubicación pertinente para privacidad y emergencias; nivel de certeza. |
| Canal y dirección | PSTN, SIP/VoIP, navegador o WhatsApp; entrada, devolución solicitada o salida; todas las piernas y transferencias. |
| Finalidad | Atención solicitada, transacción, cobranza, marketing u otra. Una conversación mezclada debe evaluar el cambio de finalidad antes de una oferta comercial. |
| Automatización | Humano, IA conversacional, audio sintético o mensaje pregrabado; funciones RAG, herramientas y decisiones permitidas. |
| Consentimientos | Permiso de contacto por canal y finalidad, listas de exclusión, aviso de IA, consentimiento de grabación y autorización de gasto: evidencias separadas. |
| Datos | Audio en vivo, grabaciones, transcripciones, embeddings, metadatos, destinatarios, almacenamiento, backups, subencargados y regiones. |
| Proveedor | Producto, versión SDK/API, cuenta/subcuenta, tipo de número, registro requerido, disponibilidad y restricciones contractuales. |
| Calendario | Zona IANA, país/subdivisión, días festivos oficiales, horarios aplicables y revisión del calendario. |
| Coste | Moneda, tarifa y revisión, límites por tenant/campaña/pierna, concurrencia, duración máxima y aprobación vinculada a configuración. |
| Evidencia | URL, fecha consultada, vigencia conocida, restricciones, revisor responsable, revisión y caducidad de la validación. |

CO y US son prioridades provisionales; no una elección final de mercado. EU/UK/CA/BR/IN/AU son marcos representativos. MX y cualquier país sin perfil validado permanecen `missing_legal_verification`. No se propone completar manualmente todos los países durante seis meses: se propone un catálogo dimensional, fuentes oficiales y habilitación incremental de perfiles.

**Calendarios — evidencia:** [IANA Time Zone Database](https://www.iana.org/time-zones), consulta 2026-10-20, `documented`: publica reglas de zonas horarias; no es un catálogo de festivos. [UK Bank Holidays](https://www.gov.uk/bank-holidays), consulta 2026-10-20, `documented`: distingue territorios y días sustitutos; sirve como ejemplo de fuente oficial territorial, no como calendario mundial.

**Control propuesto:** resolver festivos por país/subdivisión, conservar fuente, revisión y zona IANA, y permitir overrides manuales con motivo, autor, aprobación y caducidad. Registrar la revisión efectiva usada en cada autorización de contacto. Un override operativo no puede dispensar una restricción legal. Si falta calendario relevante, bloquear el contacto saliente sujeto a horarios; no inferir jurisdicción completa a partir del prefijo telefónico.

## 3. Amenazas y fronteras de confianza

Las siguientes son **amenazas consideradas y controles propuestos**, no vulnerabilidades encontradas en el repositorio.

| Amenaza | Control propuesto | Evidencia demostrable requerida |
| --- | --- | --- |
| BOLA y fuga entre tenants | Autorizar cada objeto y operación en servidor; filtrar tenant antes de consultar llamadas, números, grabaciones, colas, trabajos, cachés o RAG. | Dos tenants sintéticos no pueden leer, mutar, recibir eventos ni recuperar contenido ajeno cambiando identificadores. |
| Confused deputy | Resolver cuenta, credencial y número desde registros internos autorizados; no aceptar un tenant o cuenta arbitrarios del navegador, webhook o LLM. | Un actor de A no consigue que credenciales administrativas operen sobre B mediante parámetros o callbacks. |
| Identidad válida con privilegios excesivos | Separar autenticación OIDC de autorización de recursos; roles mínimos y reautenticación para acciones sensibles. | Usuario autenticado sin permiso recibe denegación uniforme, también mediante API directa. |
| Webhook falsificado o repetido | Firma del producto, URL/cuerpo correctos, asociación de cuenta y tenant, ventana temporal cuando exista e inbox deduplicada. | Fixtures alterados, replay y eventos válidos de otra cuenta no generan efectos. |
| SSRF en medios, callback o herramientas | Egress restringido; validación de destino y de cada redirección; defensa frente a DNS rebinding. | Rechazo de metadata, redes internas, IPv6 local y redirecciones que cambian el destino autorizado. |
| Prompt injection y RAG cruzado | Contenido recuperado tratado como datos no confiables; ACL antes de recuperación; broker de herramientas fuera de la decisión libre del modelo. | Una instrucción en un documento no cambia permisos, tenant, destinatarios, presupuesto ni políticas. |
| Robo de secretos y tokens | Vault, credenciales por ámbito, auditoría sin valores secretos, rotación, tokens breves y renovaciones verificadas. | Logs, errores, UI, exportaciones y respuestas de herramientas no revelan credenciales. |
| Toll fraud y campañas abusivas | Países/prefijos permitidos, reservas de gasto, límites por pierna, aprobación de configuración y bloqueo de cambios no aprobados. | Carrera concurrente, tarifa desconocida o destinatario sustituido no superan la autorización. |
| Eventos fuera de orden y comandos desconocidos | Estados por pierna, versiones, inbox/outbox y reconciliación; ausencia de evento no demuestra fallo. | Duplicados y timeouts no crean una segunda llamada ni resucitan una pierna terminal. |
| Presencia falsa y doble asignación | Lease de presencia/asignación con vencimiento y fencing; aceptación confirmada por servidor. | Dos agentes o pestañas no adquieren la misma asignación; un propietario antiguo no actúa tras perder el lease. |
| Persistencia de audio o borrado incompleto | Retención por clase de datos y eliminación verificable de proveedor, objetos, índices y backups. | Una restauración no vuelve a publicar datos ya eliminados; excepciones documentadas y acotadas. |
| UI que promete seguridad inexistente | Fuente Figma nativa y paridad de estados, acompañadas por evidencias de backend y proveedor. | El estado visual coincide con el estado autorizado; un botón oculto no es el único control. |

**Fundamentos oficiales de estas propuestas:** [OWASP Multi-Tenant Security](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html), [SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html), [LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html) y [Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html); consultas 2026-10-20, `documented` como guías técnicas, no certificación ni pruebas de Aureform.

## 4. Autenticación OIDC y autorización de tenants

| ID / hecho documental | Fuente y consulta | Estado; requisitos y restricciones |
| --- | --- | --- |
| A01. OIDC añade identidad sobre OAuth; la validación del ID token incluye emisor, audiencia, firma, expiración y nonce cuando corresponda. | [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html), 2026-10-20. | `documented`. Un ID token no autoriza por sí mismo una llamada, un presupuesto ni el acceso a otro tenant. |
| A02. El BCP actual de OAuth trata PKCE, redirecciones, privilegios de tokens y protección frente a replay de refresh tokens. | [IETF RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html), 2026-10-20. | `documented`. Aplicar según tipo de cliente; no extrapolar un mecanismo de tokens del IdP a los JWT del carrier. |
| A03. Keycloak dispone de distribución Docker; su guía rápida usa modo de desarrollo y remite a configuración de producción. | [Keycloak Docker](https://www.keycloak.org/getting-started/getting-started-docker) y [Containers](https://www.keycloak.org/server/containers), 2026-10-20. | `conditional`. Keycloak es opcional. Producción necesita configuración de TLS, base de datos, hostname/proxy y administración; el ejemplo de desarrollo no prueba endurecimiento. |
| A04. El adaptador JavaScript de Keycloak documenta clientes públicos, tokens en memoria y renovación mediante `updateToken()`; SSO silencioso tiene restricciones de navegador. | [Keycloak JavaScript adapter](https://www.keycloak.org/securing-apps/javascript-adapter), 2026-10-20. | `documented`. El navegador no puede guardar de forma confidencial un client secret; fijar versión y comprobar redirect URIs, Web Origins y comportamiento real de sesión. |

**Requisitos propuestos:**

- Authorization Code con PKCE S256 para clientes públicos; rechazar flujos implicit/password en el perfil propuesto. Validar los tokens contra el emisor y audiencia configurados, sin aceptar un issuer arbitrario suministrado por el cliente.
- Elegir explícitamente BFF/sesión de servidor o cliente público según el despliegue. Para cookies: `HttpOnly`, `Secure`, política `SameSite` y protección CSRF apropiadas al flujo; para API y WS: origen permitido, autorización del recurso y sesión vigente. La separación Cloudflare/backend no justifica CORS abierto.
- Mapear identidad a membresías internas. Un claim o parámetro `tenant_id` es una entrada que se valida, no una autorización autónoma. Un realm Keycloak tampoco sustituye controles sobre datos de negocio.
- Roles separados para operador, administrador de tenant, aprobador de gasto, administrador de credenciales y revisor. Aprobación y modificación de la configuración deben poder atribuirse a actores distintos cuando el riesgo lo requiera.
- Reautenticación/MFA propuesta para cambiar credenciales, activar un perfil, elevar presupuesto o habilitar grabación. No se afirma que tales controles existan hoy.
- Tokens OIDC, JWT de navegador del carrier, secretos de API y firmas de webhooks pertenecen a fronteras diferentes. Ni un caller ID ni un webhook firmado equivalen a autenticación del consumidor.

## 5. Secretos, BYOK, cuentas y tokens de navegador

| ID / hecho documental | Fuente y consulta | Estado; requisitos, restricciones y disponibilidad |
| --- | --- | --- |
| C01. Twilio Access Tokens son JWT emitidos en servidor; su vida configurable admite hasta 24 horas y sus grants delimitan capacidades. | [Twilio Access Tokens](https://www.twilio.com/docs/iam/access-tokens), 2026-10-20. | `documented`. Asociar identidad, cuenta y Voice Grant/TwiML App correctos. El máximo no es un TTL recomendado para Aureform. |
| C02. Twilio.Device documenta `tokenWillExpire` y `updateToken()`. La tabla usa `tokenRefreshMs`; la sección del evento usa `refreshTokenMs`. También advierte posible impacto de audio al actualizar durante una llamada. | [Twilio.Device](https://www.twilio.com/docs/voice/sdks/javascript/twiliodevice), 2026-10-20. | `provider_conflict`. Fijar versión y verificar nombre/tipos, aviso previo y renovación. No prometer renovación sin interrupción ni deducir que expirar termina automáticamente una llamada activa. |
| C03. El JWT WebRTC de Telnyx vence a las 24 horas o al vencer su telephony credential, lo que ocurra primero. Tokens derivados de la misma credencial comparten identidad SIP. | [Telnyx JWT](https://developers.telnyx.com/docs/voice/webrtc/auth/jwt/index), 2026-10-20. | `documented`. No asumir el mismo parámetro TTL que Twilio. Evaluar credencial por dispositivo; comprobar propagación y aislamiento de registros SIP. |
| C04. Telnyx permite `expires_at` en telephony credentials y documenta expiración y eliminación de la credencial. | [Telnyx telephony credentials](https://developers.telnyx.com/docs/voice/webrtc/auth/telephony-credentials), 2026-10-20. | `conditional`. La expiración es terminal para la credencial; verificar el ciclo de reemplazo y el efecto sobre registros y llamadas activas. No inferir desconexión inmediata de todas las piernas. |
| C05. El SDK WebRTC Telnyx **2.28.0** publicado admite `login({ creds: { login_token } })`; puede retornar sin actualizar si el socket no está vivo. Su warning `34001` se anuncia a 120 s. | [BaseSession fijado](https://github.com/team-telnyx/webrtc/blob/ee2d3dabc1bc202abf9e8e6aacc5d25209d5c419/packages/js/src/Modules/Verto/BaseSession.ts#L671), [warnings fijados](https://github.com/team-telnyx/webrtc/blob/ee2d3dabc1bc202abf9e8e6aacc5d25209d5c419/packages/js/docs/error-handling.md), [guía de auth](https://developers.telnyx.com/docs/development/webrtc/js-sdk/how-to/authenticating-your-app), 2026-10-20. | `provider_conflict`: guía y artefacto publicado no coinciden. Código inspeccionado, renovación y continuidad de audio **no probadas**. La antigua URL de clases dio 404; no es la ausencia de toda evidencia oficial. No inventar equivalencia con `device.updateToken()`. |
| C06. Las subcuentas Twilio tienen límites de credenciales, pero la cuenta principal conserva facultades sobre recursos y comparte aspectos de facturación. | [Twilio Subaccounts](https://www.twilio.com/docs/iam/api/subaccounts), 2026-10-20. | `conditional`. Diferenciar Auth Token principal y API keys; no asumir que cualquier clave principal accede igual. Saldo/suspensión del padre impiden tratar una subcuenta como aislamiento financiero absoluto. |
| C07. Managed Accounts Telnyx es una capacidad de acceso limitado y permite administración delegada. El encabezado de cuenta administrada amplía el riesgo de confused deputy. | [Telnyx Managed Accounts](https://support.telnyx.com/en/articles/4951492-managed-accounts) y [Control mediante API key](https://telnyx.com/release-notes/control-managed-accounts-via-api-key), 2026-10-20. | `conditional`; elegibilidad no verificada. Resolver `x-managed-account-id` en servidor; no permitir que el navegador seleccione una cuenta arbitraria bajo una credencial del administrador. |

**Política propuesta de secretos:** API keys, Auth Tokens, secretos OAuth y claves privadas permanecen en un vault del backend, referenciados por identificadores internos de tenant/cuenta. No van a Figma, prompts, navegador, logs, trazas, transcripciones ni mensajes de error. Registrar quién crea, usa, rota o revoca una referencia sin almacenar su valor en el evento de auditoría.

BYOK debe distinguir dos productos: credenciales API aportadas por el tenant y claves de cifrado aportadas por él. No implica que todos los carriers admitan claves de cifrado externas en todos sus productos. Versionar la referencia, los permisos y el procedimiento de rotación/recuperación; verificar titularidad y vinculación de cuenta mediante un procedimiento posterior autorizado.

**TTL propuesto:** evaluar 5–15 minutos para Twilio, ajustado a los resultados de renovación. Para Telnyx, diseñar la duración mediante los mecanismos documentados de su credencial padre y comprobar si satisfacen el requisito; no etiquetar su JWT de 24 horas como equivalente a un token Twilio de cinco minutos. Un TTL local de sesión no acorta por sí solo la credencial del carrier.

**Gate de renovación SDK, `experiment_pending`:** demostrar emisión, renovación antes de vencimiento, fallo de renovación, reloj desfasado, pérdida de red, cambio de tenant, logout, revocación, múltiples pestañas y llamada activa. Medir audio, capacidad de iniciar/recibir llamadas y limpieza de identidad/presencia. No cerrar este gate con un ejemplo de documentación ni con un indicador verde en UI.

## 6. Firmas de ingress y asociación de cuenta

| ID / hecho documental | Fuente y consulta | Estado; requisitos y límites |
| --- | --- | --- |
| S01. Los webhooks clásicos Twilio usan `X-Twilio-Signature` y HMAC-SHA1 con el Auth Token; la firma depende de la URL solicitada y, para formularios, sus parámetros. | [Twilio Security](https://www.twilio.com/docs/usage/security), 2026-10-20. | `documented`. Usar helper oficial y todos los parámetros recibidos; no una lista fija. Respetar reglas del producto sobre URL y puertos. No confundir este esquema con OAuth/JWT. |
| S02. En JSON, Twilio documenta `bodySHA256` y validación con cuerpo original mediante `validateRequestWithBody`; un proxy puede alterar la URL visible para la aplicación. | [Twilio webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security), 2026-10-20. | `documented`. Preservar raw body, query y URL externa. No tratar JSON como formulario ni volver a serializarlo antes de validar. No hay un rango fijo universal de IP que sustituya la firma. |
| S03. Media Streams requiere validar la firma en el establecimiento WebSocket. | [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams), 2026-10-20. | `conditional`. Autenticar handshake y enlazar stream/call/cuenta. No afirmar una firma HMAC independiente de cada frame de audio. Validar detalles de URL del handshake con el SDK. |
| S04. Telnyx documenta Ed25519, firma codificada en Base64 y mensaje formado por timestamp, separador vertical y cuerpo JSON original. | [Telnyx webhook signatures](https://support.telnyx.com/en/articles/4334722-how-to-leverage-webhooks), 2026-10-20. | `documented`. Verificar `telnyx-signature-ed25519` y `telnyx-timestamp` con la clave pública correcta. No firmar solamente JSON ni una versión reserializada. |
| S05. El SDK Node oficial Telnyx consultado valida antigüedad y futuro del timestamp con tolerancia de 300 segundos. | [Telnyx Node, implementación de webhooks](https://github.com/team-telnyx/telnyx-node/blob/master/src/lib/webhooks.ts), 2026-10-20. | `documented` para el código consultado; versión desplegada desconocida. El mensaje es `timestamp\|rawbody`; ventana ±5 minutos. Fijar versión y mantener reloj sincronizado. La ventana no evita duplicados dentro de ella. |
| S06. La recepción y el código ACK dependen del producto Telnyx; existen helpers oficiales de verificación. | [Telnyx receiving webhooks](https://developers.telnyx.com/docs/development/api-fundamentals/webhooks/receiving-webhooks), 2026-10-20. | `conditional`. Inventariar cada endpoint/producto y evitar opciones que omitan verificación. No transferir automáticamente el contrato de un webhook a otro. |

**Contrato de validación propuesto:**

1. Capturar bytes originales y metadatos mínimos antes de parsear o modificar el cuerpo. Limitar tamaño y tipos esperados sin omitir campos desconocidos de la validación de firma.
2. Reconstruir la URL pública Twilio desde configuración del endpoint y proxies confiables. Un `Host`, `Forwarded` o `X-Forwarded-*` arbitrario no define la URL autorizada. Probar esquema, query, codificación, puertos y barra final del WS.
3. Seleccionar la credencial candidata desde un registro interno de ruta/cuenta. Los identificadores declarados en el payload ayudan a correlacionar; no autorizan un cambio de tenant ni una búsqueda indiscriminada de secretos.
4. Verificar firma y, para Telnyx, tiempo. Después, comprobar coherencia de cuenta, número, aplicación, llamada y tenant contra registros autorizados.
5. Aplicar deduplicación persistente. La firma clásica Twilio no aporta por sí sola una ventana temporal universal equivalente a Telnyx; una firma válida tampoco garantiza que un evento sea nuevo.
6. En WS, autorizar sesión y stream al conectar, y mantener controles de vida, tamaño, origen y correlación. Distinguir autenticidad del handshake, autorización de la llamada y contenido de audio.

## 7. Instrucciones síncronas, ACK y entrega

| ID / contrato documental | Fuente y consulta | Estado; restricciones para el plan |
| --- | --- | --- |
| D01. TwiML es XML con instrucciones que Twilio ejecuta en la llamada. | [Twilio TwiML](https://www.twilio.com/docs/voice/twiml), 2026-10-20. | `documented`. Un endpoint de instrucciones necesita respuesta válida dentro del contrato; un ACK vacío de notificación no es equivalente. |
| D02. TeXML obtiene instrucciones de la aplicación configurada. | [Telnyx TeXML applications](https://developers.telnyx.com/docs/voice/texml/rest-api/applications), 2026-10-20. | `documented` para el mecanismo; `missing_provider_verification` para deadline/fallback exactos del perfil. No atribuirle el límite Twilio sin fuente. |
| D03. Twilio impone un límite total de 15 segundos a solicitudes HTTP relacionadas con llamadas; connection overrides tiene políticas y contadores de retry propios. | [Twilio connection overrides](https://www.twilio.com/docs/usage/webhooks/webhooks-connection-overrides), 2026-10-20. | `documented`. El contador configurable es 0–5, con valor por defecto 1 en esta documentación. Los fallos reintentables dependen de la política; no son todos los errores HTTP. |
| D04. Twilio Event Streams entrega al menos una vez, puede duplicar y desordenar, y reintenta hasta cuatro horas. | [Twilio Event Streams delivery](https://www.twilio.com/docs/events/event-delivery-and-duplication), 2026-10-20. | `documented`, **solo Event Streams**. Documenta backoff/jitter y tratamiento de 429/5xx frente a otros 4xx. No extrapolar cuatro horas a todos los webhooks de Voice, Messaging o WS. |
| D05. Programmable Voice Telnyx espera 200; documenta failover cuando procede, duplicados, concurrencia y ausencia de orden garantizado. | [Telnyx Voice receiving webhooks](https://developers.telnyx.com/docs/voice/programmable-voice/receiving-webhooks), 2026-10-20. | `documented`. El timeout exacto no quedó validado para cada endpoint. No inferir entrega única ni orden de llegada. |
| D06. Twilio expone `SequenceNumber` para secuencia de eventos de llamada; las consultas REST de estado tienen consistencia eventual. | [Twilio Call Resource](https://www.twilio.com/docs/voice/api/call-resource), 2026-10-20. | `documented`. Orden de generación no significa orden de recepción. Un GET inmediato no basta para declarar fallida una llamada o disponible su grabación. |
| D07. Telnyx ignora duplicados de `command_id` dentro de 60 segundos; el comando de transferencia documenta asociación con `call_control_id`. | [Telnyx Voice webhooks](https://developers.telnyx.com/docs/voice/programmable-voice/receiving-webhooks) y [Transfer call](https://developers.telnyx.com/api-reference/call-commands/transfer-call), 2026-10-20. | `documented`, acotado al producto/comando. Sesenta segundos no es idempotencia indefinida ni garantía exactly-once. `client_state` es correlación, no autorización. |

**Propuesta para instrucciones:** resolver reglas ya autorizadas de manera determinista, con fallback seguro documentado. No esperar una inferencia LLM, una revisión legal ni una operación lenta para devolver XML. Definir un presupuesto interno inferior al deadline documentado y comprobar XML, error, timeout y fallback por proveedor. El número interno y el deadline TeXML quedan pendientes.

**Propuesta para notificaciones:** autenticar, persistir duraderamente la recepción y responder con el código requerido por el producto. Procesar el efecto después. No devolver éxito antes de asegurar la persistencia; ante duplicado ya persistido, reconocerlo sin repetir el efecto. Un 2xx de recepción no significa que una transferencia o llamada haya concluido.

### 7.1 Idempotencia propia y reconciliación

Los siguientes son **requisitos propuestos**, no garantías de Twilio o Telnyx:

- Inbox con clave de proveedor, cuenta, tenant e identificador de evento. Conservar un hash del payload semántico relevante. Si el mismo ID llega con otro contenido, registrar conflicto y ponerlo en cuarentena; no ejecutar el contenido sustituto.
- Separar el digest de los bytes usados en firma del hash usado en idempotencia. Headers de intento, destino de entrega y metadatos variables no deben convertir un retry legítimo en un evento de negocio distinto.
- Si falta ID fiable, definir una clave por contrato de evento y registrar esa limitación. `CallSid` solo no identifica todos los eventos de una llamada; un hash del cuerpo solo tampoco define universalmente la identidad del evento.
- Comando propio con ID estable y hash de payload autorizado, tenant, cuenta, pierna y revisión. Reutilizar el mismo ID con contenido diferente se rechaza; no se vuelve a emitir como una orden nueva.
- Outbox con estados `pending`, `sent`, `confirmed`, `unknown` y `failed`, y evidencia de cada transición. Una respuesta exitosa puede confirmar aceptación, sin confirmar todavía el efecto.
- Tras timeout de una orden que podría haber llegado, usar `unknown`. No redial ni transferencia automática con un ID nuevo para “asegurar” ejecución. Correlacionar eventos, consultar recursos disponibles y reconciliar tras el margen de consistencia; documentar comandos sin consulta de resultado fiable.
- Conservar órdenes pendientes en reconciliación y permitir intervención controlada cuando no exista evidencia suficiente. CDR y callbacks finales ayudan según producto y disponibilidad; no implican una fuente instantánea de verdad universal.
- Retención del ledger, límites de reintento y tratamiento de eventos muy antiguos deben quedar definidos por perfil. El token de intento HTTP Twilio no sustituye el ledger de comandos de Aureform.

## 8. Llamadas con múltiples piernas, transferencia y presencia

| ID / hecho documental | Fuente y consulta | Estado; requisitos y restricciones |
| --- | --- | --- |
| V01. Twilio `<Dial>` documenta un buffer de cinco segundos sobre el timeout configurado y resultados en su acción/callback. | [Twilio Dial](https://www.twilio.com/docs/voice/twiml/dial), 2026-10-20. | `documented`. No prometer corte exacto al segundo indicado en UI. Validar resultado de cada pierna y fallback. |
| V02. Una transferencia Telnyx tiene eventos y estado de piernas; una falla de la pierna destino no demuestra que la original terminó. | [Telnyx transfer call](https://developers.telnyx.com/api-reference/call-commands/transfer-call), 2026-10-20. | `conditional`. Comprobar timeout y respuesta por escenario. SIP TLS/SRTP, cuando disponible, no cifra de extremo a extremo una trayectoria PSTN completa. |
| V03. Telnyx distingue `call_control_id`, `call_leg_id` y `call_session_id`, correlacionando varias piernas en una sesión. | [Telnyx Voice webhooks](https://developers.telnyx.com/docs/voice/programmable-voice/receiving-webhooks), 2026-10-20. | `documented`. Un identificador de sesión no reemplaza el estado independiente de cada pierna. |

**Modelo de estado propuesto:** mantener relación entre sesión lógica y piernas, con dueño, proveedor, IDs, finalidad, destino, autorización, coste y estado terminal propio. Los estados terminales no se revierten por un callback tardío; registrar el evento como histórico o conflicto. La finalización de una pierna, del stream de medios, del WS de UI o del registro SIP son señales diferentes que deben reconciliarse.

Para presencia, proponer heartbeat y lease con expiración, revisión y fencing token. La etiqueta “disponible” del navegador no asigna llamadas. La asignación debe ser atómica; el agente acepta la revisión vigente. Tras caída de una pestaña o instancia, impedir acciones del propietario antiguo y reconciliar la pierna antes de liberar o reasignar. Duraciones, márgenes y recuperación quedan `experiment_pending`.

**Hipótesis del futuro piloto US:** dos agentes, cola FIFO y un número por carrier. FIFO se define sobre la elegibilidad y revisión de entrada autorizada, no sobre el último callback recibido. Demostrar ausencia de doble respuesta, recuperación de caída, transferencia sin respuesta, ocupado, rechazo, desconexión de red, hangup simultáneo y timeout con resultado desconocido.

## 9. Abuso, fraude y aprobación vinculada a costes

**Evidencia:** [Twilio Geographic Permissions](https://www.twilio.com/docs/sip-trunking/voice-dialing-geographic-permissions), consulta 2026-10-20, `conditional`: restricciones geográficas y de prefijos de riesgo en productos cubiertos. [Telnyx Caller ID policy](https://support.telnyx.com/en/articles/3546251-caller-id-number-policy), consulta 2026-10-20, `conditional`: usar un caller ID permitido exige requisitos del proveedor. Ninguna fuente demuestra que Aureform tenga límites de gasto, políticas de campaña o autorización implementados.

**Control propuesto de aprobación:** presentar una configuración revisable y vincular su autorización a un hash de representación canónica. Debe incluir tenant, actor, cuentas de proveedor, números origen, conjunto/revisión de destinatarios, territorios, canal, finalidad, política de IA, consentimiento requerido, perfil legal, calendario, tarifa/revisión, moneda, presupuesto máximo, concurrencia, duración, herramientas/modelo y versión de configuración. Vincular aprobador, permisos, fecha, expiración y alcance de la aprobación.

Cualquier cambio material invalida la aprobación previa. El backend recalcula el hash y verifica el alcance antes de reservar gasto o emitir comandos; la UI y el LLM no pueden declarar por sí mismos “aprobado”. Una aprobación de plan, diseño o grabación no autoriza gasto de campaña.

**Controles propuestos complementarios:**

- Reservar coste de forma atómica por sesión y pierna, con techo conservador para rutas, transferencias, medios, IA y tarifas del intermediario. No tratar estimaciones de facturación retrasadas como límite duro ya cumplido.
- Limitar países, destinos/prefijos de riesgo, concurrencia, llamadas por periodo, duración y herramientas con efectos. Bloquear nuevas órdenes si falta precio o la autorización expiró.
- Evitar loops de transferencia, redial ilimitado y escalamiento automático a rutas más caras. Cambiar carrier requiere respetar la aprobación, el perfil, la identidad origen y la restricción del canal.
- Separar permisos para configurar, aprobar, activar, pausar y aumentar presupuesto. Mantener auditoría de valores autorizados, reservas, liquidaciones y discrepancias.
- Suspender nuevas operaciones ante un umbral de fraude o inconsistencia; el tratamiento de llamadas activas y eventuales servicios de emergencia necesita un runbook específico, no una desconexión indiscriminada.

## 10. SSRF, medios y RAG

**Propuestas basadas en las guías OWASP citadas en la sección 3:**

Para medios o callbacks configurables, permitir únicamente protocolos, puertos y destinos aprobados. Validar A y AAAA, bloquear loopback, link-local, redes privadas y endpoints de metadata, y comprobar el destino efectivo al conectar. Revalidar redirecciones; no reenviar autenticación a otro origen. Un URL recibido en un webhook firmado sigue siendo un dato que se valida antes de descargarlo. Considerar un proxy de salida con reglas independientes del proceso de aplicación.

El experimento debe cubrir DNS rebinding entre validación y conexión, respuestas mixtas IPv4/IPv6, URLs con credenciales, puertos no previstos y redirects a redes bloqueadas. La allowlist no se acredita solo con una comparación de texto de hostname.

Para RAG, aplicar tenant y permisos antes de búsqueda y recuperación, también en vectores, cachés, adjuntos y conversación. Un documento o transcripción puede contener instrucciones maliciosas; no cambia el system prompt autorizado, las capacidades de herramientas ni la identidad. El broker valida schemas y recursos, y vuelve a comprobar finalidad, consentimiento, coste y actor en cada efecto. Las credenciales no entran al contexto del modelo.

Revisar exportaciones, resúmenes y logs para evitar que herramientas o asistentes revelen información de otros tenants. El filtro de salida complementa el control previo a recuperación; no lo sustituye.

## 11. Grabación, tratamiento de datos y retención

**Decisión documental solicitada para el piloto: `recording = OFF`.** No se afirma configuración efectiva de una cuenta o llamada. Este valor tampoco significa “sin datos personales”: el tratamiento de audio en vivo, STT, respuestas del modelo, metadatos y transcripciones debe inventariarse y autorizarse por separado.

| ID / hecho documental | Fuente y consulta | Estado; requisitos y límites |
| --- | --- | --- |
| P01. GDPR establece finalidad, minimización, limitación de conservación, bases jurídicas, información, seguridad y condiciones de transferencia internacional. | [GDPR, texto oficial](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679), 2026-10-20. | `conditional` según alcance territorial y rol. Consentimiento no es la única base jurídica. Contratos con encargados, evaluación de riesgo/DPIA cuando proceda y capítulo V no se resuelven con elegir una región de hosting. |
| P02. EDPB analiza datos y finalidades de asistentes de voz, incluyendo conservación y derechos. | [EDPB Guidelines 02/2021](https://www.edpb.europa.eu/system/files/2021-07/edpb_guidelines_202102_on_vva_v2.0_adopted_en.pdf), 2026-10-20. | `conditional`; orientación de asistentes virtuales por analogía pertinente, no una clasificación automática de toda llamada telefónica. |
| P03. Twilio ofrece cifrado de grabaciones con clave pública en ediciones elegibles y lo aplica antes de guardar la grabación en cloud. | [Recording settings](https://www.twilio.com/docs/voice/recording-settings) y [Voice recording encryption](https://www.twilio.com/docs/voice/tutorials/voice-recording-encryption), 2026-10-20. | `conditional`: Enterprise/Security Edition según documentación; disponibilidad contractual pendiente. No cubre como cifrado extremo a extremo toda la llamada PSTN ni el audio procesado en vivo por IA. Perder la clave privada afecta recuperación. |
| P04. Media Streams Twilio documenta regiones US1, IE1 y AU1 para ese producto. | [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams), 2026-10-20. | `conditional`. Región del stream no demuestra residencia de grabaciones, logs, facturación, soporte, LLM o backups de toda la cadena. |

**Gate propuesto para encender grabación:** opt-in verificable, perfil legal de todos los participantes relevantes, aviso/versiones/idioma, finalidad, alternativa operativa, permisos de acceso, región y subencargados, plazo, borrado y evidencia del comportamiento del carrier. El opt-in es política conservadora del producto; no se presenta como la única base jurídica universal.

| Clase de datos | Propuesta de política; plazo y región aún pendientes |
| --- | --- |
| Audio en vivo y buffers | Retención mínima para el procesamiento autorizado; impedir persistencia incidental en logs, debugging o fallbacks. |
| Grabaciones | OFF en piloto; activación por gate específico. Distinguir copias en carrier y almacenamiento propio. |
| Transcripciones y resúmenes | Decidir si se conservan o solo procesan; retención propia, acceso por tenant, redacción y borrado. No heredar automáticamente el plazo del audio. |
| RAG y embeddings | Finalidad y ACL del documento de origen; retirar chunks, índices y cachés al borrar o revocar acceso. |
| Eventos y ledger de comandos | Datos mínimos para operación, fraude y reconciliación; no guardar audio ni payload sensible íntegro por comodidad. Un ID/hash puede seguir siendo dato personal. |
| Logs y analítica | Redacción de tokens, teléfonos y texto sensible; permisos de soporte, región, plazo y exportaciones controladas. |
| Backups | Ventana de retención, cifrado y acceso explícitos; estrategia de tombstones para no reactivar datos borrados durante una restauración. |
| Evidencias de consentimiento | Versión de aviso, finalidad, canal, fecha, actor y revocación; plazo definido por perfil, acceso restringido y minimización. |
| Legal hold | Excepción documentada, limitada por finalidad y sujetos; liberación y borrado posterior verificables. |

**Restricciones propuestas:** no fijar “30 días globales” sin finalidad y fuente; no reutilizar llamadas para entrenamiento por defecto; registrar contratos y regiones de carrier, STT/TTS, LLM, observabilidad, objetos y backups. Una región elegida en UI no demuestra el recorrido real ni la base de transferencia.

## 12. CO y US: casos concretos de seguridad y cumplimiento

### 12.1 Colombia

| ID / hallazgo legal | Fuente primaria y consulta | Estado; requisitos y límites |
| --- | --- | --- |
| CO01. Ley 2300 regula contacto cubierto de cobranza y comercial: lunes a viernes 07:00–19:00, sábados 08:00–15:00, sin domingos ni festivos. Tras contacto directo, restringe más de un contacto diario y varios canales en la misma semana. | [Ley 2300 de 2023, normograma CRC](https://normograma.crcom.gov.co/crc/compilacion/docs/ley_2300_2023.htm), 2026-10-20. | `conditional`. Evaluar artículos 3, 5 y excepciones del 8 según finalidad. No convertir una excepción de información solicitada, transacción o fraude en autorización general para marketing. |
| CO02. RNE permite excluir canales de contacto comercial; las instrucciones SIC requieren consulta previa y tratan el efecto sobre autorizaciones anteriores. | [CRC RNE](https://www.crcom.gov.co/es/micrositios/comunicados-como-es/registro-numeros-excluidos) y [Circular SIC 001/2024](https://normograma.crcom.gov.co/crc/compilacion/docs/circular_superindustria_0001_2024.htm), 2026-10-20. | `conditional`. Una eventual autorización posterior exige evidencia y alcance; no elimina horarios ni demás obligaciones. Integración, legitimidad de acceso y mecanismo operativo de consulta no verificados. |
| CO03. Ley 1581 exige condiciones para tratar datos personales, autorización informada salvo excepción, finalidad, seguridad y derechos; regula transferencias internacionales. | [Ley 1581 de 2012](https://normograma.crcom.gov.co/crc/compilacion/docs/ley_1581_2012.htm), 2026-10-20. | `conditional`. Determinar responsable/encargado, autorización o excepción, transmisión/transferencia, contratos y países. Publicar una política de privacidad no demuestra por sí solo una autorización válida. |
| CO04. SIC imparte instrucciones de responsabilidad, riesgo y seguridad para tratamiento de datos en IA; disponibilidad en Internet no convierte automáticamente datos personales en datos públicos. | [Circular SIC 002/2024 sobre IA](https://normograma.crcom.gov.co/crc/compilacion/docs/circular_superindustria_0002_2024.htm), 2026-10-20. | `conditional`. Evaluar impacto cuando el riesgo lo requiera; no afirmar que toda IA exige la misma evaluación ni que una fuente web habilita entrenamiento o RAG sin base. |

**Gates propuestos para CO:** clasificar finalidad antes de contactar, conservar evidencia de canal y autorización, consultar RNE cuando corresponda, aplicar calendario CO y límites de contacto, honrar revocaciones y verificar privacidad/transferencias. Registrar la revisión usada; impedir que una campaña modifique su etiqueta a “atención” para evadir controles.

Una llamada entrante de atención solicitada no concede permiso ilimitado para salida comercial posterior. Una devolución solicitada debe quedar vinculada a esa solicitud y finalidad. Si una conversación de servicio incorpora marketing, evaluar el nuevo propósito; no reutilizar silenciosamente la base de atención. No se verificó una obligación colombiana universal de anunciar toda voz IA: el aviso propuesto del producto se separa de esa conclusión legal pendiente.

**Estado del perfil CO:** fuentes parciales `documented/conditional`; operación, número, finalidad, tratamiento real y aprobación jurídica `missing_legal_verification` y `missing_provider_verification`.

### 12.2 Estados Unidos

| ID / hallazgo legal | Fuente primaria y consulta | Estado; requisitos y límites |
| --- | --- | --- |
| US01. FCC determinó que la voz generada por IA se encuadra en voz artificial para TCPA. | [FCC-24-17](https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf) y [publicación oficial FCC preservada por GPO](https://www.govinfo.gov/content/pkg/GOVPUB-CC-PURL-gpo222468/pdf/GOVPUB-CC-PURL-gpo222468.pdf), 2026-10-20. | `documented`. No es una prohibición absoluta de IA; somete las llamadas cubiertas al régimen existente. El PDF de FCC tuvo acceso público limitado; la fuente GPO respalda el hallazgo. |
| US02. 47 CFR 64.1200 distingue números móviles/residenciales, finalidad, voz artificial/pregrabada, consentimiento y excepciones. | [47 CFR 64.1200, eCFR](https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-64/subpart-L/section-64.1200), 2026-10-20; vista actualizada al 2026-10-19. | `conditional`. Salida no comercial a móviles también puede requerir consentimiento expreso previo; marketing cubierto exige consentimiento escrito salvo excepción aplicable. Existen identificación, opt-out y límites específicos. eCFR es un servicio gubernamental continuamente actualizado, no la edición jurídica oficial del CFR. |
| US03. FTC exige controles DNC y reglas de telemarketing según alcance; su guía incluye actualización de consulta no mayor a 31 días, listas propias, horario 08:00–21:00 local y reglas especiales para mensajes pregrabados. | [FTC Telemarketing Sales Rule](https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule), 2026-10-20. | `conditional`. Consentimiento para marketing pregrabado y opt-out no se sustituyen automáticamente por una relación comercial. Exenciones inbound/B2B y upselling necesitan clasificación concreta; no son un permiso universal. |
| US04. FCC propuso divulgación específica de uso de IA; la agenda de agosto de 2026 mantiene el expediente como proceso regulatorio. | [NPRM de 2024](https://www.govinfo.gov/content/pkg/FR-2024-09-10/html/2024-19028.htm) y [agenda FCC 2026](https://www.govinfo.gov/content/pkg/FR-2026-08-14/html/2026-16615.htm), 2026-10-20. | `documented` como propuesta/agenda, no obligación final demostrada. No se corroboró aquí una regla federal final de ese aviso específico. El ruling sobre voz artificial de US01 sí es distinto y actual. |
| US05. California ha aplicado requisitos de consentimiento de todas las partes para grabación de conversaciones confidenciales en supuestos cubiertos. | [California Attorney General, enforcement de grabación](https://www.oag.ca.gov/news/press-releases/attorney-general-kamala-d-harris-district-attorneys-announce-85-million), 2026-10-20. | `conditional`, ejemplo estatal. No extrapolarlo a todo US ni concluir que basta identificar el estado del número. Jurisdicciones de participantes y leyes vigentes requieren revisión. |

**Gates propuestos para US:** separar entrada de servicio, devolución solicitada y salida comercial; definir tipo de destino y mecanismo de consentimiento; validar DNC federal/propio y reglas estatales, finalidad, horarios y opt-out. El inicio de una llamada por el usuario no autoriza campañas posteriores. Una relación comercial tampoco reemplaza sin análisis el consentimiento necesario para voz artificial.

**Vigencia mutable:** cambios recientes de consentimiento/revocación deben revisarse antes de activar un perfil. La referencia [FCC-26-67](https://docs.fcc.gov/public/attachments/FCC-26-67A1.pdf), consulta 2026-10-20, no pudo verificarse íntegramente mediante acceso público; estado `missing_legal_verification`. No se incorporan como hechos excepciones, waivers o plazos atribuidos a ese documento.

**Estado del perfil US:** conocimiento documental parcial; alcance TCPA/TSR, estados, revocación vigente, grabación, servicio y emergencia todavía `missing_legal_verification`. El futuro MVP no queda autorizado por esta matriz.

## 13. EU y marcos representativos globales

### 13.1 EU: transparencia de IA y privacidad

| ID / hallazgo | Fuente primaria y consulta | Estado; alcance y restricciones |
| --- | --- | --- |
| EU01. Artículo 50(1) exige informar a personas que interactúan directamente con IA, salvo supuestos específicos; el aviso debe ser claro y accesible al inicio correspondiente. | [AI Act, artículo 50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50), 2026-10-20. | `conditional`. Determinar si hay interacción directa y quién es proveedor/deployer. Artículo 50(2), marcado detectable de contenido sintético, y 50(4), deepfakes, son obligaciones diferentes; un saludo no las satisface automáticamente. |
| EU02. Las obligaciones de transparencia son aplicables y exigibles desde el 2 de agosto de 2026. | [Artículo 113](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-113) y [FAQ oficial de enforcement](https://ai-act-service-desk.ec.europa.eu/en/ai-act/faq/when-does-enforcement-start), 2026-10-20. | `documented`. No describir artículo 50 como una obligación futura en la fecha de consulta. Aplicación y enforcement dependen de disposición, actor y supuesto. |
| EU03. El texto consolidado consultado contempla hasta el 2 de diciembre de 2026 para 50(2) en sistemas de contenido sintético puestos en mercado antes del 2 de agosto de 2026. | [Artículo 111](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-111), 2026-10-20; fuente basada en consolidación de 2026-07-27. | `conditional`. La transición es para ese marcado y sistemas anteriores; no retrasa universalmente 50(1) ni habilita un lanzamiento nuevo sin revisión. |
| EU04. El alcance incluye determinados operadores/sistemas fuera de EU con outputs usados en EU. La excepción de software libre/open source no excluye sistemas comprendidos en artículo 50, 5 o alto riesgo. | [Artículo 2](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-2), 2026-10-20. | `conditional`. La licencia Apache OSS declarada para Aureform no determina por sí sola clasificación, actor ni excepción. No se auditó la licencia ni el rol contractual del operador. |
| EU05. GDPR y reglas nacionales de privacidad/grabación requieren evaluación independiente del AI Act. | [GDPR](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679) y [FAQ Comisión sobre artículo 50](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act), 2026-10-20. | `conditional`. Validar países, bases jurídicas, información, encargados, transferencias y reglas de comunicaciones. Cumplir transparencia de IA no prueba legalidad de grabación ni marketing. |

**Default propuesto del producto:** saludo transparente al comenzar interacción de IA, por ejemplo: “Soy el asistente de IA de [empresa]. Puedo ayudarte y ofrecer una vía de atención humana”. Ajustar contenido y accesibilidad al flujo real; repetir o aclarar al transferir desde humano cuando corresponda. No sugerir una vía humana inexistente.

Este default es una política de confianza y seguridad. **No se afirma que ese saludo sea legalmente obligatorio en todos los países**, ni que conceda consentimiento de contacto, grabación o entrenamiento. Las reglas sobre marcado de audio sintético requieren un gate técnico/legal propio para proveedor TTS y recorrido de medios.

### 13.2 UK, Canada, Brasil, India, Australia y México

| Perfil / evidencia representativa | Fuentes primarias y consulta | Estado y producción pendiente |
| --- | --- | --- |
| UK: PECR distingue marketing telefónico en vivo y automatizado; ICO exige consentimiento específico para llamadas automatizadas cubiertas y trata TPS/CTPS y exclusión propia. | [ICO Telephone marketing](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/telephone-marketing/), 2026-10-20. | `conditional`; guía bajo revisión por cambios legales de 2025. Clasificación de voz generativa conversacional, privacidad, grabación y cambios vigentes: `missing_legal_verification`. No equiparar automáticamente “sintética” con “en vivo” para evitar consentimiento. |
| Canada (CA): CRTC incluye voz pregrabada o sintetizada en ADAD; marketing ADAD requiere consentimiento expreso previo según reglas cubiertas. OPC trata aviso, finalidad y consentimiento de grabación comercial. | [CRTC Unsolicited Telecommunications Rules](https://crtc.gc.ca/eng/trules-reglest.htm) y [OPC Recording customer calls](https://www.priv.gc.ca/en/privacy-topics/surveillance/02_05_d_14/), 2026-10-20. | `conditional`. DNCL y exclusión propia siguen requiriendo análisis; una excepción DNCL no dispensa automáticamente consentimiento ADAD. PIPEDA, provincias y consentimiento implícito en ciertos casos no equivalen a autorización universal. |
| BR: ANPD establece mecanismos/condiciones para transferencias internacionales. Anatel informa que 0303 es facultativo y exige autenticación a originadores de más de 500.000 llamadas mensuales, agregadas por sus códigos y CNPJ. | [ANPD Resolución 19/2024](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024) y [Anatel 0303](https://www.gov.br/anatel/pt-br/regulado/numeracao/telemarketing-ativo-prefixo-0303), 2026-10-20; página Anatel modificada 2026-08-28. | `conditional`. La regla de volumen cuenta originaciones aunque no se completen; condiciones técnicas/comerciales se acuerdan con prestadora. No repetir el antiguo “0303 siempre obligatorio”. Base LGPD, sector, exclusiones y contratos: `missing_legal_verification`. |
| IN: TRAI cataloga una tercera enmienda de preferencias de comunicaciones comerciales del 18 de septiembre de 2026. La segunda enmienda de 2025 incluye controles de robocalls/autodialers. | [TRAI catálogo de enmiendas](https://trai.gov.in/release-publication/regulations/amendments-page/7617), [tercera enmienda 2026](https://trai.gov.in/sites/default/files/2026-09/Regulation_18092026.pdf) y [segunda enmienda 2025](https://www.trai.gov.in/sites/default/files/2025-02/Regulation_12022025.pdf), 2026-10-20. | `missing_legal_verification`: contenido íntegro/vigencia consolidada de septiembre no validados; acceso al catálogo intermitente y PDF voluminoso. No presentar el borrador de 2026 ni el texto 2025 aislado como régimen completo actual. |
| IN: las DPDP Rules finales de noviembre de 2025 tienen entrada escalonada, con disposiciones inmediatas, a un año y a dieciocho meses. | [MeitY DPDP Rules, publicación oficial](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf), 2026-10-20. | `conditional`. Al corte de octubre de 2026 no habían transcurrido los plazos de noviembre de 2026/mayo de 2027. Validar artículo y fase aplicables; no afirmar vigencia total ni ausencia de otras obligaciones de privacidad. |
| AU: ACMA indica telemarketing 09:00–20:00 entre semana y 09:00–17:00 sábado, sin domingos ni festivos nacionales; también DNCR, identificación y terminación a pedido. APP tiene alcance y excepciones propios. | [ACMA telemarketing](https://www.acma.gov.au/say-no-to-telemarketers), [Do Not Call Register](https://www.acma.gov.au/do-not-call-register) y [OAIC APP](https://www.oaic.gov.au/privacy/australian-privacy-principles), 2026-10-20. | `conditional`. Exenciones de registro no eliminan automáticamente otras reglas. Privacidad aplicable y grabación por estado/territorio: `missing_legal_verification`. Validar calendario y tipo de contacto. |
| MX: perfil solicitado, todavía sin validación jurídica o de proveedor. | Sin fuente primaria mexicana validada para este perfil al 2026-10-20. | `missing_legal_verification` y `missing_provider_verification`. Bloquear producción hasta revisar normas actuales, privacidad, contacto, grabación, numeración/rutas y requisitos del operador. No inventar licencia ni asumir cobertura de emergencia. |

Todos estos perfiles son **representativos y parciales**. No constituyen listas completas de países aprobados. Conservar reglas nacionales/subnacionales y finalidades como datos; identificar expresamente capacidades bloqueadas. El número telefónico, la residencia del tenant y la ubicación del servidor no resuelven por sí solos todas las jurisdicciones relevantes.

## 14. Numeración, 10DLC, STIR/SHAKEN y emergencias

| ID / hecho documental | Fuente y consulta | Estado; requisitos y restricciones |
| --- | --- | --- |
| N01. Los requisitos Twilio de números varían por país, tipo de número y documentación. Telnyx exige documentación/grupos regulatorios en mercados cubiertos; compra no garantiza activación inbound. | [Twilio Regulatory Guidelines](https://www.twilio.com/en-us/guidelines/regulatory), [Telnyx international numbers](https://support.telnyx.com/en/articles/5469551-international-numbers-required-documents) y [Requirement groups](https://support.telnyx.com/en/articles/9801714-requirement-groups-for-ordering-phone-numbers), 2026-10-20. | `conditional`. Verificar disponibilidad, documentos, dirección/localidad, rutas y CLI para el producto. Estas guías no prueban licencia universal de telecomunicaciones ni autorización de marketing. |
| N02. A2P 10DLC registra marcas/campañas de mensajería en rutas US correspondientes. | [Twilio A2P 10DLC](https://www.twilio.com/docs/messaging/compliance/a2p-10dlc) y [Telnyx 10DLC brand](https://support.telnyx.com/en/articles/5896911-how-to-create-a-10dlc-brand), 2026-10-20. | `conditional`: SMS/MMS y requisitos carrier. No es una licencia de voz, consentimiento de llamada ni permiso de marketing. Un piloto solo de voz no necesita fingir integración 10DLC; activar mensajería abre su gate propio. |
| N03. STIR/SHAKEN trata autenticación de caller ID en el régimen de proveedores cubiertos. | [47 CFR 64.6301](https://www.ecfr.gov/current/title-47/section-64.6301), 2026-10-20. | `conditional`. Attestation no prueba consentimiento, finalidad lícita ni identidad completa de la persona. No presentarlo en UI como “cliente verificado” o “marketing autorizado”. |
| N04. Twilio emergency calling depende de producto, países/números admitidos y requisitos de dirección/configuración. Telnyx diferencia E911 fijo y escenarios dinámicos. | [Twilio Emergency Calling](https://www.twilio.com/docs/voice/tutorials/emergency-calling-for-programmable-voice) y [Telnyx E911 setup](https://support.telnyx.com/en/articles/1130683-e911-setup-guide), 2026-10-20. | `conditional`; ninguna cobertura universal verificada. Verificar estado activo, dirección, movilidad, ubicación y producto. Una capacidad E911 US no prueba cobertura CO ni todos los países. |
| N05. 47 CFR 9.11 impone obligaciones a servicios interconnected VoIP comprendidos en su alcance. | [47 CFR 9.11](https://www.ecfr.gov/current/title-47/section-9.11), 2026-10-20. | `conditional`. Clasificar servicio y rol del operador. OSS, una UI de navegador o un disclaimer no determinan automáticamente exclusión del régimen. |

**Gate propuesto de emergencia:** no presentar Aureform como reemplazo de servicio de emergencia o dialer general antes de revisar alcance y cobertura. No habilitar destinos de emergencia mediante un fallback automático. Si un producto genera obligaciones, documentar cómo se cumplen; no usar “bloqueado” como sustituto de una obligación aplicable.

Los ensayos iniciales deben ser sintéticos. Un eventual número de prueba como 933 solo se usaría donde esté oficialmente disponible, en una cuenta habilitada y bajo autorización posterior específica; no llamar a 911 ni a otros centros reales para probar este plan.

## 15. WhatsApp: contrato Meta, ley y disponibilidad

WhatsApp es un perfil de canal propio. Sus términos contractuales pueden restringir un caso de uso aunque una ley no lo prohíba. A la inversa, cumplir términos Meta no demuestra cumplimiento de privacidad, contacto comercial o grabación.

### 15.1 Clasificación de IA: decisión pendiente

| ID / hallazgo contractual | Fuente primaria y consulta | Estado; requisitos y límites |
| --- | --- | --- |
| W01. La versión consultada de los términos Meta, modificada el 23 de septiembre de 2026, contiene cláusula 4.7 sobre AI Providers: restringe ofrecer IA como funcionalidad principal, frente a uso incidental/auxiliar; Meta conserva criterio de clasificación. | [WhatsApp Business Solution Terms, entrada oficial](https://www.whatsapp.com/legal/business-solution-terms/) y [Meta Terms for WhatsApp Business Platform](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform?locale=en_US), 2026-10-20. | `conditional`; texto consultado en investigación, reacceso público intermitente. No clasificar Aureform sin conocer operador, servicio real y funcionalidad ofrecida. Ser Solution Provider o distribuir OSS no elimina automáticamente la restricción. |
| W02. La política de mensajería, actualizada el 23 de septiembre de 2026, permite automatización de respuesta dentro de la ventana cubierta y exige vías claras de escalamiento; requiere permisos de contacto y respeto de opt-out. | [WhatsApp Business Messaging Policy](https://whatsappbusiness.com/policy/), 2026-10-20. | `conditional`. Automatización de soporte no equivale a aprobación general de un asistente de propósito general. Ventana, templates, finalidad y exclusiones siguen aplicando. |
| W03. El régimen específico de precios AI Providers refiere mercados donde Meta dice estar obligada a permitir ese caso de uso; se actualizó el 15 de octubre de 2026 por Türkiye. | [Meta AI Providers pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers/), 2026-10-20. | `conditional`. No modifica los precios de todos los negocios. La existencia de una tarifa no autoriza cualquier país ni clasifica un producto. La base jurídica nacional de cada excepción requiere revisión independiente. |
| W04. La misma página permite mensajes service de AI Providers a Türkiye (+90) sin cargo Meta desde el 15 de octubre; publica horizonte hasta el 11 de abril de 2027. | [Meta AI Providers pricing, Türkiye](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers/), 2026-10-20. | `conditional`. La página combina “al menos seis meses” con esa fecha: no ampliar por cálculo propio. BR y mercados europeos tienen condiciones diferentes; no se confirmó una excepción equivalente CO/US. |

**Decisiones pendientes, sin clasificación anticipada:**

| Supuesto a evaluar | Datos que faltan y gate propuesto |
| --- | --- |
| Asistente de propósito general | Quién lo provee, cómo se ofrece, si la IA es el producto principal, destinatarios y mercados permitidos. Bloqueado hasta determinar términos aplicables y elegibilidad. |
| Automatización de atención de un negocio concreto | Negocio, catálogo/finalidad, límites de preguntas y herramientas, escalamiento real y uso incidental. La interpretación favorable es una hipótesis, no aprobación blanket de Meta. |
| Aureform como tooling Apache OSS | Rol del distribuidor frente al operador desplegado, servicios administrados ofrecidos, acceso directo/indirecto y contratos. La licencia declarada no determina automáticamente el resultado de 4.7. |

**Restricción de datos — [términos Meta, W01](https://www.facebook.com/legal/Meta-Terms-for-WhatsApp-Business-Platform?locale=en_US), consulta 2026-10-20, `conditional`:** los términos limitan usar datos WhatsApp para entrenar/mejorar modelos generales y contemplan un supuesto acotado de ajuste exclusivo para el negocio. El gate debe revisar también datos derivados/agregados, prompts, evaluación y usos de subproveedores. No interpretar anonimización ni BYOK como permiso automático.

### 15.2 Precio, ventanas y conflictos históricos

| ID / hecho de precio | Fuente y consulta | Estado; requisitos y restricciones |
| --- | --- | --- |
| W05. Desde el 1 de octubre de 2026, según zona horaria de la Messaging account, los primeros 1.000 mensajes service entregados por mes y número comercial tienen franquicia; desde el 1.001 se cobra. No son 1.000 conversaciones ni una franquicia por tenant. | [Meta WhatsApp pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/), 2026-10-20. | `documented` para régimen ordinario descrito. Reinicio mensual, sin acumulación. Sin medio de pago, mensajes service posteriores a la franquicia no se entregan según la página. No activar billing en este plan. |
| W06. Utility dentro de 24 horas también pasó a tener cargo; la ventana habilita tipos de respuesta, no gratuidad universal. Persisten excepciones específicas de free entry point. | [Meta WhatsApp pricing, cambios de octubre](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/#effective-october-1-2026), 2026-10-20. | `documented`. Aplicar categoría, mercado, moneda y revisión tarifaria correctos. No extender la franquicia ordinaria al régimen especial AI Provider sin verificación. Fecha efectiva corroborada; fecha editorial “30 de septiembre” no verificada independientemente. |
| W07. Documentos Twilio de cambios de 2025 conservan reglas de gratuidad/ventanas anteriores a octubre de 2026. | [Twilio notice de cambios WhatsApp 2025](https://help.twilio.com/hc/en-us/articles/30304057900699-Notice-Changes-to-WhatsApp-s-Pricing-April-2025) y [Twilio WhatsApp pricing](https://www.twilio.com/en-us/whatsapp/pricing), 2026-10-20. | `provider_conflict` al usarlos como precio actual. No borrar la comisión del intermediario ni suponer contrato actualizado: confirmar passthrough, tarifa efectiva y evidencia de facturación del adaptador concreto. |

**Gate de coste WhatsApp propuesto:** distinguir régimen ordinario, AI Provider y otros productos; persistir revisión de tarifa en la configuración aprobada; mostrar categoría, ventana, franquicia estimada, moneda y cargos de Meta/intermediario/IA. Si el régimen o el precio no está verificado, no mostrar “gratis” ni autorizar envíos. Una ventana 24h de atención, el mes tarifario y el calendario legal son relojes diferentes.

Relectura oficial **2026-10-21**: la excepción service para gobiernos/ONG elegibles usa `paid_exempt` y vence 2027-12-31. La elegibilidad de cuenta permanece pendiente; no se deriva de publicar código open source. [Meta pricing](https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/).

### 15.3 Calling, permisos y prohibición PSTN

| ID / hecho de Calling | Fuente primaria y consulta | Estado; requisitos y límites |
| --- | --- | --- |
| W08. Meta publica permisos temporales de 168 horas, permanentes revocables y máximo de 100 llamadas conectadas por 24 horas, por pareja negocio/usuario con alcance del número comercial. | [Meta user call permissions](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/user-call-permissions), 2026-10-20. | `documented` para texto Meta; disponibilidad exacta por integración pendiente. Solicitudes y llamadas son cuotas diferentes. No confundir 100 llamadas con 100 agentes o concurrencia. |
| W09. Twilio conserva una restricción de cinco llamadas por 24 horas en su guía/error de Calling. | [Twilio WhatsApp Business Calling](https://www.twilio.com/docs/voice/whatsapp-business-calling) y [Twilio error 37006](https://www.twilio.com/docs/api/errors/37006), 2026-10-20. | `provider_conflict`: cinco frente a 100 Meta; intentos/conectadas, límites del adaptador y actualización contractual necesitan aclaración. No sustituir el límite Twilio por 100 sin evidencia. |
| W10. Meta no envía webhook cuando vence un permiso temporal; el webhook de aceptación aporta vencimiento y existe consulta del estado vigente. | [Meta call permissions, expiry](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/user-call-permissions#user-call-permission-reply-webhook), 2026-10-20. | `documented`. Calcular expiración localmente y reconciliar estado; un último evento “aceptado” no mantiene el permiso indefinidamente. Permanente sigue siendo revocable. |
| W11. Meta prohíbe contractualmente PSTN en cualquier pierna del flujo WhatsApp; SIP solo es admisible en topología exclusivamente VoIP. | [Meta Calling integration patterns](https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/integration-patterns), 2026-10-20. | `documented` como restricción de términos. Bloquear transferencia, consulta, conferencia o fallback que introduzca PSTN, aunque la entrada WhatsApp ya se haya puenteado a SIP. No presentarlo como ley universal. |

**Gates propuestos:** registrar permiso con usuario/negocio/número y revisión; expirar sin esperar webhook; reconciliar revocación y cuotas antes de nuevas llamadas cuando el estado esté desactualizado. Un permiso Calling no es consentimiento universal de marketing o grabación. Las solicitudes de permiso tienen límites propios y ejemplos documentales que requieren validar el contrato actual; no codificar límites de ejemplos como garantía.

Resolver el conflicto cinco/100 con documentación contractual y prueba autorizada del adaptador. Una cuota interna conservadora puede ser una política provisional, pero no certifica lo que el carrier permite. El estado de sandbox/test number tampoco demuestra restricciones de producción.

**Disponibilidad pendiente:** no se validó una oferta WhatsApp Calling Telnyx aplicable al proyecto. Soporte de Voice/SIP general no la demuestra. Mantener el adaptador WhatsApp por proveedor y país `missing_provider_verification`.

### 15.4 Embedded Signup v4 y versión publicada al corte

| ID / hecho documental | Fuente primaria y consulta | Estado; requisitos y restricciones |
| --- | --- | --- |
| W12. Embedded Signup v4 fue publicado el 8 de octubre de 2025; consolida selección de activos, información y permisos. Cloud API requiere los permisos de gestión/mensajería descritos y Advanced Access. | [Meta Embedded Signup v4](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/version-4), 2026-10-20. | `conditional`. Acceso avanzado, activos y productos dependen de configuración/revisión de la app. No asumir elegibilidad ni crear una app con este documento. |
| W13. El catálogo ya lista v5/v5-public-preview con publicación del 20 de octubre de 2026. v2/v3 quedaron deprecadas el 15 de octubre y varias solicitudes antiguas se sirven como v4. | [Meta Embedded Signup versions](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/versions), 2026-10-20. | `documented`. v4 es el baseline del plan solicitado, no “la versión más reciente”. Existe una excepción de continuidad WABA-only v2 hasta el 16 de noviembre. Cambios/compatibilidad v5: `missing_provider_verification`. |

**Seguridad propuesta de signup:** pin de versión/configuración; validar origen de mensajes del flujo y correlación de sesión; intercambio de código y custodia de secretos en servidor; vincular actor, tenant, activos WhatsApp compartidos, Messaging account y número mediante autorización verificable. Las denominaciones/IDs de activos deben seguir el esquema de la versión seleccionada, sin mezclar ejemplos históricos WABA con campos nuevos.

Registrar cancelación, permisos parciales, expiración, activo de otra entidad, reintento y desconexión. No aceptar un postMessage o ID aportado por navegador como prueba de titularidad. Un cambio a v5 requiere revisión de permisos, payload, estados y Figma; no actualización silenciosa.

## 16. Fuente Figma nativa, auditoría de estructura y paridad

**Fuente requerida:** [Figma Aureform](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N).  
**Evidencia estructural aportada al plan, 2026-10-20:** auditoría mediante Figma MCP de siete páginas de suite 1.1–1.3, 714 variables, 14 estilos de texto y seis estilos de sombra.  
**Estado actualizado, 2026-10-21:** la [recuperación fechada de fuentes](../../design/reports/communications-2026-10-21.md) acredita creación nativa y revisiones acotadas, incluidos Landing, Quality y Changelog en EN/Dark/desktop. La **paridad integral 1.4/1.5** y la comprobación en navegador siguen pendientes. Las actualizaciones y capturas nativas no cierran por sí mismas el gate.

Estas cifras se registran como evidencia compartida de estructura, no como nueva inspección independiente de todos los frames. No se inventan node IDs, nombres de componentes, versiones publicadas ni resultados de QA. Los ítems 1.4/1.5 deben enlazarse con su definición y fuente nativa verificables en el inventario.

**Requisito de producto:** todas las UI y sus interacciones deben tener fuente Figma nativa editable y paridad de estados. Exportaciones, capturas o recreaciones visuales aisladas no sustituyen el archivo fuente. El inventario debe cubrir también UI existente y pendientes, no únicamente pantallas de seguridad nuevas.

| Cobertura propuesta de interacciones | Estados que deben tener fuente/paridad | Evidencia futura requerida |
| --- | --- | --- |
| Login, sesión, tenant y roles | Inicio, callback, cancelación, expiración, renovación fallida, sin membresía, acceso denegado y cambio de tenant. | Frame/componente/variante nativos, revisión, rol y comportamiento observable. Sin inventario actual completo. |
| Cuenta, número, permisos y país | Vacío, configuración parcial, verificación pendiente, país bloqueado, provider conflict y capacidad no disponible. | Estado real del gate y explicación al usuario; fuente nativa vinculada a cada caso. |
| Cola FIFO y presencia | Disponible, ocupada, reconectando, lease perdido, asignación vencida, aceptación en curso y reasignación. | Paridad entre estado visible y autoridad del servidor; dos agentes/pestañas y fallos de red. |
| Llamada y transferencia | Ringing, conexión, mute, hold, transferencia pendiente, rechazo, timeout, resultado desconocido y reconciliado. | Estados por pierna y recuperación; no mostrar éxito solo por ACK. |
| Aprobación de coste/campaña | Borrador, estimación no disponible, revisión, aprobado, configuración modificada, aprobación invalidada, límite alcanzado y pausa. | Resumen revisable de alcance/moneda/límites y revisión; backend verifica hash y permisos. No exponer hashes técnicos si no ayudan al usuario. |
| IA, herramientas y atención humana | Aviso de IA, escalamiento, herramienta no autorizada, respuesta degradada, contenido no disponible y error recuperable. | Ruta humana real cuando se ofrece; evidencias de permisos y comportamiento aparte del diseño. |
| Grabación y privacidad | OFF, gate pendiente, opt-in solicitado/rechazado/revocado, acceso restringido, eliminación pendiente y excepción justificada. | Fuente nativa y pruebas de dato/operación; un toggle OFF no acredita ausencia de archivos. |
| WhatsApp | Ventana cerrada, permiso temporal/permanente/revocado/vencido, cuota bloqueada, precio pendiente y transferencia incompatible. | Caducidad sin evento, conflicto cinco/100 y restricción PSTN reflejados; prueba contractual separada. |
| Todas las UI y pendientes 1.4/1.5 | Normal, loading, empty, error, forbidden, conflicto, stale, offline y recuperación según la interacción. | Inventario completo, trazabilidad source → estado → UI → QA. Recuperación/paridad y QA siguen pendientes. |

**Método propuesto de evidencia:** registrar ubicación nativa, componente/variante, revisión, interacción, rol, estado inicial/final, captura o resultado de QA y discrepancia pendiente. Repetir QA de las interacciones afectadas tras cambios de diseño o contrato.

**Límite del diseño:** Figma demuestra estructura, intención y, cuando se pruebe, paridad visual/interactiva. **Figma no demuestra autorización de backend, firma de webhook, consentimiento válido, limitación de gasto, cobertura de emergencia, disponibilidad carrier ni borrado.** Los gates de diseño y seguridad/proveedor se cierran con evidencias diferentes.

## 17. Gates de producción específicos

Todos los cierres siguientes son **propuestos y pendientes**, salvo la evidencia estructural Figma delimitada arriba. Los responsables son roles a asignar, no personas identificadas ni aprobaciones existentes.

| Gate | Responsable propuesto / evidencia mínima | Bloqueo |
| --- | --- | --- |
| G01 — Perfil territorial/finalidad | Revisión legal: países/subdivisiones, inbound/outbound, propósito, consentimiento, DNC/RNE, horarios y revisión vigente de fuentes. | País/perfil desconocido o `missing_legal_verification`; MX y perfiles no revisados no se habilitan. |
| G02 — Número/cuenta/proveedor | Operación: titularidad, tipo de número, documentos, inbound activo, CLI permitido, capacidades y límites por contrato. | Compra o documentación general sin verificación del producto/cuenta. |
| G03 — Identidad y tenants | Seguridad: OIDC, membresías, permisos por objeto, CORS/orígenes, sesión y pruebas BOLA/confused deputy. | Fuga o uso de credenciales/cuentas fuera del ámbito autorizado. |
| G04 — TTL/SDK y revocación | Ingeniería: versión, renovación, expiración, llamadas activas, múltiples dispositivos, logout y revocación. | Conflicto Twilio de opciones o renovación Telnyx sin evidencia. |
| G05 — Ingress y respuesta | Ingeniería: fixtures de firmas, raw body/URL/proxy, cuenta/tenant, WS, XML/fallback y ACK por producto/deadline. | Aceptación de firma inválida, deadline desconocido o pérdida antes de ACK. |
| G06 — Entrega/estado/reconciliación | Ingeniería/operación: inbox/outbox, hashes, duplicados, orden, comandos unknown, piernas y lease/fencing. | Doble efecto, estado resucitado, redial ante incertidumbre o doble asignación. |
| G07 — Coste y abuso | Aprobador autorizado: presupuesto/moneda, hash de configuración, reservas por pierna y límites efectivos. | Falta de autorización, tarifa desconocida, cambio de hash o exceso de capacidad. |
| G08 — Datos/regiones/retención | Privacidad: inventario real, contratos, regiones, bases, acceso, plazos, purga/backups y subproveedores. | “Región” declarada sin evidencia o retención/transferencia indeterminada. |
| G09 — Grabación | Privacidad/legal/operación: opt-in, aviso, perfil de participantes, finalidad, región, retención y prueba del carrier. | OFF en piloto; activación bloqueada hasta cerrar este gate independientemente. |
| G10 — Emergencias y rol del servicio | Legal/operación: alcance regulatorio, cobertura real, dirección/movilidad y runbook. | Cobertura universal supuesta, fallback a emergencia o servicio sujeto a obligaciones sin solución acreditada. |
| G11 — IA y RAG | Seguridad/legal: aviso por perfil, marcado cuando corresponda, recuperación autorizada y broker de herramientas. | RAG cruzado, efectos por prompt injection o interpretación legal no revisada. |
| G12 — WhatsApp | Contratos/operación: clasificación 4.7, mercados, precios/régimen, signup/versiones, permisos y topología VoIP. | Clasificación desconocida, conflicto cinco/100, PSTN en alguna pierna o disponibilidad no comprobada. |
| G13 — Fuente/paridad UI | Diseño/QA: fuente nativa de todas las UI; inventario de estados y recuperación; QA de 1.4/1.5. | Auditoría estructural sin paridad/QA suficiente para las interacciones afectadas. |
| G14 — Operación y respuesta | Operación/seguridad: observabilidad mínima, reconciliación, alertas, aislamiento, rotación y rollback ensayados. | Incidentes sin responsable o procedimiento, secretos en logs o rollback que recupera datos borrados. |

Cerrar un gate debe registrar alcance, evidencia, revisión y caducidad. Una fuente o resultado nuevo que contradiga la validación reabre el gate afectado. Una aprobación visual, un alta de carrier y una revisión legal no se sustituyen entre sí.

## 18. Experimentos demostrables, sin ejecución acreditada

La primera fase puede usar fixtures, clocks controlados y servicios simulados sin cuentas ni tráfico real. Los ensayos de proveedor requieren autorización posterior, cuentas elegibles y presupuesto definido; no quedan autorizados por describirlos aquí.

| Experimento propuesto | Criterio de aceptación / gates |
| --- | --- |
| E01 — Dos tenants y actores con roles distintos | Intentos sobre IDs ajenos, exports, jobs, WS y vectores no revelan ni mutan recursos. Cuenta administrada no puede elegirse arbitrariamente. G03. |
| E02 — OIDC y sesión | Emisor/audiencia/firma inválidos, expiración, callback alterado, logout y cambio de tenant denegados; renovación no amplía privilegios. G03/G04. |
| E03 — Twilio tras proxy | Fixtures form/JSON/WS con URL externa correcta pasan; cambiar cuerpo, query, esquema u origen no confiable falla. XML y ACK se prueban por separado. G05. |
| E04 — Telnyx firma y replay | Cuerpo reserializado o firma solo de JSON falla; ±299/300/301 segundos prueban el límite de la versión fijada. Replay válido en ventana no repite efecto. G05/G06. |
| E05 — Persistencia y retries | Crash entre recepción, persistencia y procesamiento; 429/5xx, failover, duplicados y Event Streams modelados según contrato. No perder evento reconocido ni atribuir cuatro horas a otros productos. G05/G06. |
| E06 — Hash de evento/comando | Mismo ID y payload equivalente no repite; mismo ID y distinto payload entra en conflicto. Retries con metadatos distintos no crean otra acción. G06. |
| E07 — Timeout de comando | Proveedor simulado acepta pero respuesta se pierde; estado queda unknown, sin segunda llamada automática. Tras más de 60 segundos el ledger propio sigue evitando duplicación indebida. G06. |
| E08 — Piernas, FIFO y presencia | Dos agentes, varias pestañas, crash y callbacks desordenados no generan doble asignación. Fallo de destino no cierra ficticiamente la pierna original. G06. |
| E09 — Renovación real del SDK elegido | Verificar opción Twilio y flujo Telnyx, clock skew, renovación fallida, audio activo y revocación. Registrar mediciones, no solo eventos UI. G04. |
| E10 — Coste y carreras | Cambiar destino, moneda, tarifa, país o configuración invalida aprobación. Reservas concurrentes y transferencias respetan techo; precio faltante bloquea nueva orden. G07. |
| E11 — SSRF y prompt injection | DNS rebinding, redirect interno e instrucciones hostiles en RAG no alcanzan destinos bloqueados ni alteran tenant, permisos o presupuesto. G03/G11. |
| E12 — Retención y recording OFF | No hay grabación persistente atribuible al piloto; inventariar STT/buffers. Purga alcanza objetos/vectores/logs según política y no se revierte al restaurar backup. G08/G09. |
| E13 — Contacto y calendario | Fixtures CO/US y perfiles globales distinguen inbound, callback y marketing; revocaciones, festivos/subdivisiones y revisión de overrides se aplican. Unknown queda bloqueado. G01. |
| E14 — WhatsApp | Expirar permiso sin webhook, revocar permanente, resolver cuotas y bloquear cualquier pierna PSTN. Simular mensaje ordinario 1.000/1.001 y utility según tarifa, sin mezclar régimen AI Provider. G12/G07. |
| E15 — Figma y estados UI | Inventariar todas las UI y 1.4/1.5; vincular fuente nativa y revisión; QA cubre denegación, expiración, coste modificado, timeout/unknown y recuperación. Seguridad API se prueba aparte. G13/G03. |

Cada resultado futuro debe especificar versión, configuración, fixture o escenario, esperado/observado, fecha y limitaciones. Un experimento simulado no acredita entrega carrier, facturación, restricciones de sandbox ni consentimiento de usuarios reales.

## 19. Roadmap y decisiones abiertas

**Secuencia del plan:** P1 voice inbound primero; runtime portable primero al entrar en la fase IA. El modelo global de permisos, datos, costes y perfiles se define desde el inicio. Node/Docker portable y UI Cloudflare separada son condiciones del plan; no se propone aquí una implementación, un despliegue ni cambios de arquitectura/código.

| Etapa documental propuesta | Resultado y condición de salida |
| --- | --- |
| Base global | Matriz dimensional, estados de gate, amenazas, fuentes y decisiones explícitas. No equivale a habilitar todos los países. |
| P1 voice inbound | Definir entrada, asignación, dos agentes/FIFO como hipótesis de piloto, piernas, transferencia, presencia y recording OFF; validar interacción y recuperación. |
| Futuro MVP US, condicionado | Un número Twilio y uno Telnyx; dos agentes, FIFO y recording OFF. Solo después de elegir perfil, cerrar gates, autorizar cuentas/números y gasto. No asumir marketing, WhatsApp ni cobertura de emergencia incluidos. |
| Fase IA | Priorizar runtime portable; revisar audio/STT/TTS/LLM, saludo transparente, RAG y herramientas; conservar autorización y presupuestos fuera del modelo. |
| Nuevos países/canales | Añadir perfiles mediante datos, fuentes, revisión legal y experimentos de proveedor. Bloquear unknown; no replicar supuestos del MVP US a CO o al resto. |
| Grabación o campañas | Gates independientes de opt-in/retención/región o de contacto/consentimiento/coste. La aprobación inbound no habilita estas funciones automáticamente. |

**Decisiones y dudas pendientes:**

1. Elección de países/subdivisiones y entidades operadoras; CO/US siguen siendo prioridades provisionales. Definir atención entrante, callbacks y posibles finalidades mezcladas.
2. Cuentas, números y productos elegibles; contratos y disponibilidad real, incluida Managed Accounts Telnyx. No existe evidencia de aprovisionamiento.
3. Versión SDK, nombre de opción Twilio, flujo de renovación Telnyx, TTL viable, revocación y efectos sobre llamada activa; deadlines exactos TeXML y ACK de cada producto.
4. Resultado consultable de cada comando, ventanas de reconciliación, deduplicación y conservación del ledger; timeout de transferencia y duración de leases.
5. Consentimiento/revocación US vigentes y requisitos estatales; interpretación UK de voz conversacional; consolidación TRAI septiembre de 2026; privacidad/grabación provincial o territorial y perfil MX.
6. Retención por clase, regiones reales, subencargados, bases y mecanismos de transferencia; posibilidad y condiciones de BYOK. Grabación continúa OFF hasta su gate específico.
7. Rol Aureform/operador en cláusula Meta 4.7, incidental frente a principal, mercados y régimen de precios; disponibilidad WhatsApp por adaptador.
8. Límite WhatsApp cinco/100, cuotas de solicitud y semántica de llamadas conectadas; v4 baseline frente a v5, permisos/activos y compatibilidad contractual.
9. Presupuesto, moneda, aprobadores, contenido canónico de autorización y cómo cubrir retraso de costes; sin autorización de gasto actual.
10. Inventario completo y revisión de fuente Figma nativa, recuperación de paridad y QA de todas las UI, especialmente 1.4/1.5. Auditoría de estructura hecha no equivale a cierre de estos pendientes.

**Mantenimiento propuesto:** revalidar fuentes mutables antes de cada habilitación relevante, registrar fecha efectiva y revisión, priorizar conflictos detectados y reabrir gates cuando cambie proveedor, tarifa, ley, finalidad, diseño o recorrido de datos. No emitir una certificación global a partir de este documento.

