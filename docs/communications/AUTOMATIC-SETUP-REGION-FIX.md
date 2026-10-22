# Twilio implicit US1 and setup gateway correction

Reviewed **2026-10-21**. This correction follows the automatic-setup checkpoint in commit [`edf0a67`](https://github.com/terrizoaguimor/aureform-ui/commit/edf0a67fdc3c6d901f88783db4f20af87cb497f5). The [original validation](AUTOMATIC-SETUP-VALIDATION.md) remains historical; the [separate correction receipt](AUTOMATIC-SETUP-REGION-FIX.json) records this change's source and verification.

## Verified cause

A read-only diagnostic reproduced this sequence without applying routing, creating provider resources or authorizing a call:

| Boundary | Observation before the correction |
| --- | --- |
| Twilio account and owned voice-number lookup | HTTP 200. |
| Twilio v2 inbound processing region lookup | HTTP 404, valid JSON with numeric code `20404` and status `404`. Both literal and encoded E.164 paths produced the same result. |
| Local setup plan | HTTP 502, redacted JSON error, correct allowed-origin CORS header. |
| The same plan through the HTTPS reverse proxy | HTTP 502, proxy-generated HTML and no allowed-origin CORS header. |
| Provider mutations | None; planning stopped before approval. |

The browser's CORS message concealed the upstream region error. Exact-origin preflight and unauthorized JSON responses already worked through both transports; allowing arbitrary origins would not fix the underlying problem.

Twilio's [inbound processing guide](https://www.twilio.com/docs/global-infrastructure/inbound-processing-api#check-which-region-your-phone-number-is-routed-to), consulted **2026-10-21**, documents this 404 for an API-provisioned number without an explicit region assignment: inbound voice uses US1 by default. The [v2 resource reference](https://www.twilio.com/docs/global-infrastructure/inbound-processing-region-api-phone-number) documents the normal explicit-region response. These provider facts do not independently establish account or number ownership.

## Implemented behavior

The adapter first verifies the active Full account, primary token and owned voice-enabled number. Only its fixed HTTPS **GET** to the v2 `PhoneNumbers` region endpoint can accept the documented missing assignment. Both numeric fields, `code: 20404` and `status: 404`, must be present in valid bounded JSON from an HTTP 404 response.

The fallback returns an internal symbol rather than a fabricated region resource. A JSON response cannot claim that symbol. HTML, invalid JSON, another error code, another resource's 404, a transport failure, a permission failure or an HTTP 200 response without matching account/number/region evidence cannot trigger the fallback. Explicit regions other than `us1` remain unsupported. Apply repeats eligibility and region checks; it does not change the number's processing region or purchase a number.

The HTTP server maps **SetupProviderError** dependency status 502 to **503**, preserving its existing redacted error classification and CORS for an explicitly allowed origin. Other error classes and the original manual reference behavior retain their status semantics. Forbidden origins are never reflected. An uncertain external write still returns `setup-reconciliation-required` and remains blocked by the durable journal; a readable 503 is not permission to retry it.

## Verification and limits

| Check | Result |
| --- | --- |
| Full backend on Node 22.22.3 | **321 passed**, including 76 new regression cases; zero failures or skipped cases. |
| Root unit suite on Node 22.22.3 | **1,036 passed**, zero failures or skipped cases. |
| Authenticated private planning | Four valid HTTP 200 review responses across loopback and named HTTPS, with exact-origin CORS and no credential echo. |
| Fresh Chromium context | Owner login and plan both HTTP 200; browser-enforced CORS permits reading the real review response. |
| Figma-bound UI | **9/9 source hashes unchanged**. |

The correction receipt separates injected provider/HTTP tests from private read-only provider observations. It records the full backend result, retained manual tests, public source audit and unchanged Figma-bound UI hashes. No provider credentials, account identifiers, private phone numbers, tunnel hostname or access tokens are included.

Read-only planning is not configuration acceptance. **Provider-resource creation, routing apply, browser registration, delivered signed webhooks, PSTN audio and a completed real call remain unverified by this correction.** Telnyx needs its own independent live acceptance; Twilio's documented missing-region behavior is not generalized to Telnyx.

## Resume the private review

After the backend restarts, choose **Renew owner access** and enter the application access code from the private configuration directory. This renews the owner bearer while keeping an open wizard's inspected number selection. Then select **Review setup** again. Inspection expires after one hour; an expired inspection requires a new account inspection.

Review and explicitly approve the exact number/routing changes before applying. Browser connection and the separately authorized bounded incoming test remain subsequent actions described in the [setup guide](AUTOMATIC-SETUP.md#one-explicit-incoming-test).

## Design source

This is a backend correction. The nine source files bound to [Figma page 14 · Communications · Automatic setup](https://www.figma.com/design/lHp5p10yGb7lqXJDnAox0N?node-id=585-59) and its native source map remain unchanged. This statement preserves the existing bounded design evidence; it does not claim a new design or real-call certification.
