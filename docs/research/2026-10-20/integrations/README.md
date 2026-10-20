# Integration research evidence — October 20, 2026

[English chapter](../../../website/en/integration-research.md) · [Capítulo en español](../../../website/es/integration-research.md) · [English candidate cards](catalogue.md) · [Fichas en español](catalogue.es.md)

This study examines integration opportunities for Aureform **1.4.1**, against
commit `a93ab113170ec1456608cf1f85d1a89b23aaec68`. It supplements the
[earlier product research](../README.md); that study retains its separate
baseline, 52 searches and eight priorities.

Four completed headless AGY investigations recorded **99 search queries**:
34 for identity/data/payments, 17 for operations, 24 for AI and 24 for product
connectors. The selected model was `gemini-4-argon-high`, using AGY 1.4.3 with
public-web research prompts. Observed searches establish that research ran;
they do not expose native Google grounding metadata or certify generated claims.
The published chapters and cards incorporate independent code and primary-source
review rather than unreviewed model responses.

| Artifact                                                          | What it records                                                                                                            |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [agy-provenance.json](agy-provenance.json)                        | Versions, public queries, timings, statuses, response hashes, review corrections and publication boundaries.               |
| [npm-downloads.json](npm-downloads.json)                          | 70 selected packages, official npm responses and reproducible dated endpoints for October 12–18, 2026, inclusive.          |
| [package-metadata.json](package-metadata.json)                    | Dated stable-version metadata, engines, peer ranges and declared SDK licenses from the official npm registry.              |
| [sources.json](sources.json)                                      | Primary documentation and license references with retrieval status; reachability is separate from semantic review.         |
| [catalogue.json](catalogue.json)                                  | Bilingual candidate records with role, priority, current interface contracts, proposed UI, runtime, licensing and caveats. |
| [catalogue.md](catalogue.md) / [catalogue.es.md](catalogue.es.md) | Readable cards generated from the structured catalogue and the fixed npm snapshot.                                         |

Downloads are **installation events**, affected by CI, transitive dependencies
and SDK scope. They are not unique users, active customers, Next.js market share
or provider revenue. Do not sum related packages, rank unrelated roles together
or infer growth from one window. Providers without a comparable package signal
remain unmeasured.

Priorities and effort describe product judgment, not deadlines or demonstrated
customer demand. Package peers describe declared compatibility; no external
provider integration, comparative latency or bundle cost was runtime-tested here.
Grouped providers are choices within a role, not a required stack.

The demo remains a static frontend on Cloudflare Workers Static Assets and
GitHub Pages. Existing mock auth, Stripe transport, opt-in maps, controlled tables
and local AI streaming are distinguished from proposed recipes. Consumers own
runtime authentication, authorization, secrets, webhooks, model inference and
durable synchronization. No provider account, billing, tracking or OAuth flow is
enabled by this publication.

Original Aureform code remains Apache-2.0. SDK licenses, self-hosted server
licenses, hosted-service terms and embedding rights must be evaluated separately.
The source ledger is an aid to that review, not a redistribution of provider
documentation.

Public artifacts exclude credentials, private configuration, local machine
paths, conversation/session identifiers, thinking and provider transcripts.
Response digests identify unpublished input drafts; a digest does not establish
that the draft's claims are correct.

## Lectura en español

Este estudio revisa oportunidades de integración sobre Aureform **1.4.1**, commit
`a93ab113170ec1456608cf1f85d1a89b23aaec68`. Conserva la investigación de producto
anterior y su base independiente. Las cuatro ejecuciones de AGY completadas
aportan **99 búsquedas observadas**; sus respuestas se contrastaron antes de
publicar conclusiones.

La muestra de npm registra **70 paquetes** en la misma ventana inclusiva,
**12–18 de octubre de 2026**. Mide instalaciones con sesgos de CI, dependencias
transitivas y alcance del SDK. No mide usuarios únicos, clientes, cuota de
Next.js ni crecimiento. No sumar paquetes relacionados ni comparar funciones
distintas como si fueran un ranking general.

Las fichas separan lo que ya existe en el frontend de las recetas propuestas.
Prioridad y esfuerzo son juicios relativos; la compatibilidad de peers es
declarada y no equivale a una integración probada. Los consumidores resuelven
sesiones, permisos, secretos, cobros, inferencia y sincronización en su backend.
La publicación mantiene la demo estática y no activa cuentas de proveedores.

El código original sigue bajo Apache-2.0; cada SDK, servidor y servicio conserva
sus propias condiciones. Los datos públicos omiten configuración privada,
credenciales, identificadores de sesiones, pensamiento y transcripciones.
