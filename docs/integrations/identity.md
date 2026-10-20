# Identity workflows

Aureform supplies interactive sign-in, sign-up, recovery, verification and identity settings frontends. Inject `AuthWorkflowAdapter` from a Client Component to connect your application's identity service. The adapter submits requests and validates presentation data; the consumer's backend authenticates users, sets its session cookies, authorizes every operation and owns provider configuration.

No identity SDK is installed or activated by these components. Selecting a provider name does not connect an account. The identity panel without an adapter is explicitly labeled **Separate local demo**, including when it is displayed beside a connected integration hub.

## Connect a consumer backend

Serve the endpoints below under a same-origin path such as `/api/identity`. Aureform's static export contains no dynamic auth server. Host your consumer API separately behind the same public origin, or use your application's existing server. Dynamic cookie handling, POST route handlers and Server Actions cannot be implemented inside this static export. See the [Next static export guide](https://nextjs.org/docs/app/guides/static-exports).

Create a stable adapter in a Client Component. Continue to wrap your application in its existing Aureform appearance and `next-intl` providers; the components use their theme, motion settings and EN/ES locale.

```tsx
"use client";

import { useMemo } from "react";
import { AuthTemplate, type AuthMode } from "@/components/templates/auth";
import { IdentityIntegrationPanel } from "@/components/integrations/identity-panel";
import { createAuthHttpAdapter } from "@/lib/auth-integration";

export function ConsumerIdentity({
  applicationOrigin,
  mode,
}: {
  applicationOrigin: string;
  mode?: AuthMode;
}) {
  const adapter = useMemo(
    () =>
      createAuthHttpAdapter({
        basePath: "/api/identity",
        origin: applicationOrigin, // Public configuration, never a key.
        providerId: "better-auth",
        redirectPolicy: { origin: applicationOrigin, allowedOrigins: [] },
        // Your application's CSRF helper reads an ephemeral header value.
        // csrfToken: () => yourAppCsrfToken(),
      }),
    [applicationOrigin],
  );

  return mode ? (
    <AuthTemplate
      mode={mode}
      workflowAdapter={adapter}
      consentLabel="I accept my application's account terms and privacy policy."
      onWorkflowComplete={(result) => {
        // Only result.kind === "session" reports a session.
        // Your application may now refresh its own server session state.
        // Account creation, verification and recovery do not imply sign-in.
      }}
    />
  ) : (
    <IdentityIntegrationPanel providerId="better-auth" adapter={adapter} />
  );
}
```

`applicationOrigin` must match the browser's origin. HTTPS is required except for explicitly configured `http://localhost`, `http://127.0.0.1` or `http://[::1]` development origins. The HTTP factory checks this again before submitting credentials. Browser globals are not accessed while creating an adapter during prerendering.

`createAuthHttpAdapter(options)` accepts `basePath`, `providerId?`, `origin?`, `redirectPolicy?`, `fetch?` and `csrfToken?`. `origin` can be omitted in browser requests; non-browser calls must provide it. A `basePath` is an absolute same-origin path, never an external URL, query or fragment. Every request uses POST JSON, `credentials: "same-origin"`, `cache: "no-store"` and `redirect: "error"`. The only optional custom header is `X-CSRF-Token`. Successful responses must be JSON; empty bodies, incomplete data, redirects and responses larger than 2 MB are rejected.

## Template and panel props

```ts
interface AuthTemplateProps {
  mode: "sign-in" | "sign-up" | "reset-password" | "verify";
  authAdapter?: AuthAdapter; // Existing social-provider contract.
  onProviderSignIn?: ProviderSignInHandler; // Overrides authAdapter for social.
  workflowAdapter?: AuthWorkflowAdapter;
  verification?: {
    challengeId: string;
    email: string;
    codeLength?: 6 | 8;
  };
  verificationToken?: string;
  resetToken?: string;
  redirectPolicy?: AuthRedirectPolicy;
  onWorkflowComplete?: (result: AuthCompletionResult) => void;
  consentLabel?: string;
}

interface IdentityIntegrationPanelProps {
  providerId?: string;
  adapter?: AuthWorkflowAdapter;
}
```

Without `workflowAdapter`, the original email/OTP mock and social `AuthAdapter.signInWithProvider` / `onProviderSignIn` behavior remain in place. An injected workflow adapter is always used for credential and verification requests, including errors; there is no fallback to a demo after a consumer failure. With a consumer workflow and no separate `authAdapter` or `onProviderSignIn`, social buttons are disabled and show a localized message to configure a provider handler. They cannot call the default mock adapter, save a local demo profile or continue to a demo route. Standalone `SocialAuth demo={false}` applies the same guard. Default mock routes keep all three providers working. No component opens an OAuth authorization URL.

The template requires sign-up consent before calling the adapter. Your backend records and enforces its actual consent policy. Consumer sign-in accepts an existing password of any nonzero length; sign-up, reset confirmation and password changes require at least eight characters in the frontend. Your backend enforces the final password policy.

`signUp` and `signIn` can produce verification or MFA challenges. The same template switches to the corresponding form and submits `verifyEmail` or `verifyMfa`. Email codes support six or eight digits; MFA can offer TOTP and recovery codes. `onWorkflowComplete` receives validated session, challenge or `ok` results. Treat it as a lifecycle notification, not an authorization check.

For password reset confirmation, provide `mode="reset-password"`, `workflowAdapter` and the ephemeral `resetToken`. The form submits `confirmPasswordReset` and checks password confirmation. For an email link, provide `mode="verify"`, `workflowAdapter` and `verificationToken`; the user explicitly presses **Confirm email**. For an OTP challenge, provide `verification`, or let the sign-up/resend response supply it. Without a challenge, the verify screen lets the user request one by email.

Tokens are supplied by your application, not read from browser storage by Aureform. If your application receives a token in an incoming link, remove it from the current URL/history before mounting the confirmation form, retain it only for that request, and clear it after completion. Do not put provider access tokens or pending provider authentication tokens in `challengeId`; use a server-owned challenge reference.

The panel loads `getIdentity`, then reloads it after each successful action. It includes profile updates, email verification, password changes, TOTP setup/verification/revocation, organization creation/editing/switching/deletion, member role changes/removal, invitation creation/revocation/acceptance, current/other session revocation and logout. UI role checks help presentation; they are never authorization. Destructive changes have a review dialog. It validates but never follows redirect URLs.

All forms prevent duplicate requests, show localized pending/errors, and abort on unmount. Password/code/invitation inputs clear after submission, including failures and cancellation. TOTP setup material is temporary: it clears on confirmation, cancellation, leaving the security tab, logout or unmount. No connected password, provider key, token or session credential is written to `localStorage`, `sessionStorage`, cookies, IndexedDB or analytics. The existing legacy mock only persists its allowlisted non-secret demo profile.

Cancellation stops UI completion even if a consumer callback ignores `AbortSignal`. It cannot undo a backend mutation that already completed. The panel tells the user to refresh after cancellation.

## Complete HTTP handler contract

Every adapter method has this shape:

```ts
adapter.operation(request, { signal?: AbortSignal }): Promise<ValidatedResult>
```

All endpoints use **POST** under the configured `basePath`. Empty requests are `{}`. `AUTH_WORKFLOW_ENDPOINTS` exports the exact operation-to-path mapping.

| Adapter method         | Path                      | JSON request                                         | Valid result                                        |
| ---------------------- | ------------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `signIn`               | `/sign-in`                | `{email, password}`                                  | Session, verification or MFA challenge              |
| `signUp`               | `/sign-up`                | `{name, email, password, consent:true}`              | Session, challenge or `ok` without sign-in          |
| `requestPasswordReset` | `/password/reset/request` | `{email}`                                            | `ok`; do not disclose account existence             |
| `confirmPasswordReset` | `/password/reset/confirm` | `{token, password}`                                  | `ok`; no implied session                            |
| `verifyEmail`          | `/email/verify`           | `{challengeId, code}` **or** `{token}`               | Session, challenge or `ok`                          |
| `resendVerification`   | `/email/resend`           | `{email, challengeId?}`                              | Verification challenge                              |
| `getSession`           | `/session`                | `{}`                                                 | `{kind:"session", session:AuthSession               | null}` |
| `logout`               | `/logout`                 | `{}`                                                 | `ok`                                                |
| `getIdentity`          | `/identity`               | `{}`                                                 | `{kind:"identity", identity:AuthIdentityState}`     |
| `updateProfile`        | `/profile/update`         | `{name}`                                             | `ok`                                                |
| `changePassword`       | `/password/change`        | `{currentPassword, newPassword}`                     | `ok`                                                |
| `enrollMfa`            | `/mfa/enroll`             | `{label, password?}`                                 | MFA enrollment                                      |
| `verifyMfa`            | `/mfa/verify`             | `{enrollmentId, code}` **or** `{challengeId, code}`  | Enrollment: `ok`; login: session, challenge or `ok` |
| `revokeMfa`            | `/mfa/revoke`             | `{factorId, password?, code?}`                       | `ok`                                                |
| `createOrganization`   | `/organizations/create`   | `{name, slug}`                                       | `ok`                                                |
| `updateOrganization`   | `/organizations/update`   | `{organizationId, name, slug}`                       | `ok`                                                |
| `switchOrganization`   | `/organizations/switch`   | `{organizationId}`                                   | `ok`                                                |
| `deleteOrganization`   | `/organizations/delete`   | `{organizationId}`                                   | `ok`                                                |
| `inviteMember`         | `/invitations/create`     | `{organizationId, email, role:"admin"\|"member"}`    | `ok`                                                |
| `revokeInvitation`     | `/invitations/revoke`     | `{organizationId, invitationId}`                     | `ok`                                                |
| `acceptInvitation`     | `/invitations/accept`     | `{token}`                                            | `ok`                                                |
| `updateMemberRole`     | `/members/role`           | `{organizationId, memberId, role:"admin"\|"member"}` | `ok`                                                |
| `removeMember`         | `/members/remove`         | `{organizationId, memberId}`                         | `ok`                                                |
| `revokeSession`        | `/sessions/revoke`        | `{sessionId}`                                        | `ok`; revoking current session must end it          |
| `revokeOtherSessions`  | `/sessions/revoke-others` | `{}`                                                 | `ok`                                                |

The following is a complete transport handler you can mount in a consumer server. `handlersForRequest` supplies your existing provider/business handlers bound to the incoming server session. It can append `Set-Cookie` to `responseHeaders` when signing in/out. `verifyCsrf` must check the consumer's CSRF policy without consuming the body. Provider secrets and underlying provider tokens stay in that server layer.

```ts
import {
  AUTH_WORKFLOW_ENDPOINTS,
  AuthWorkflowError,
  validateAuthWorkflowRequest,
  validateAuthWorkflowResult,
  type AuthRedirectPolicy,
  type AuthWorkflowHandlers,
  type AuthWorkflowOperation,
} from "@/lib/auth-integration";

type ConsumerIdentityDependencies = {
  applicationOrigin: string;
  redirectPolicy: AuthRedirectPolicy;
  verifyCsrf(request: Request): Promise<boolean>;
  handlersForRequest(
    request: Request,
    responseHeaders: Headers,
  ): AuthWorkflowHandlers;
};

export async function handleIdentityRequest(
  request: Request,
  dependencies: ConsumerIdentityDependencies,
): Promise<Response> {
  const headers = new Headers({ "Cache-Control": "no-store" });
  const failure = (code: string, status: number) =>
    Response.json({ error: { code } }, { status, headers });
  const pathname = new URL(request.url).pathname;
  const operation = (
    Object.keys(AUTH_WORKFLOW_ENDPOINTS) as AuthWorkflowOperation[]
  ).find((key) => pathname === `/api/identity/${AUTH_WORKFLOW_ENDPOINTS[key]}`);

  if (!operation) return failure("unsupported", 404);
  if (request.method !== "POST") return failure("unsupported", 405);
  if (request.headers.get("Origin") !== dependencies.applicationOrigin)
    return failure("forbidden", 403);
  if (!(await dependencies.verifyCsrf(request)))
    return failure("forbidden", 403);
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    return failure("invalid-request", 415);

  try {
    // Also set the corresponding request-size limit in your consumer server.
    const body = await request.text();
    if (body.length > 16_384) return failure("invalid-request", 413);
    const input = validateAuthWorkflowRequest(operation, JSON.parse(body));
    const handlers = dependencies.handlersForRequest(request, headers);
    const output = await handlers[operation](input as never, {
      signal: request.signal,
    });
    const result = validateAuthWorkflowResult(
      operation,
      output,
      dependencies.redirectPolicy,
    );
    // Enrollment verification must not be mislabeled as a login.
    if (
      operation === "verifyMfa" &&
      "enrollmentId" in input &&
      result.kind !== "ok"
    )
      throw new AuthWorkflowError("invalid-response");
    return Response.json(result, { headers });
  } catch (error) {
    headers.delete("Set-Cookie");
    const code =
      error instanceof AuthWorkflowError
        ? error.code
        : error instanceof SyntaxError
          ? "invalid-request"
          : "network";
    const status =
      code === "unauthorized" || code === "invalid-credentials"
        ? 401
        : code === "forbidden"
          ? 403
          : code === "expired"
            ? 410
            : code === "conflict"
              ? 409
              : code === "rate-limited"
                ? 429
                : code === "unsupported"
                  ? 501
                  : code === "invalid-response" || code === "unsafe-url"
                    ? 502
                    : code === "network"
                      ? 503
                      : 400;
    return failure(code, status);
  }
}
```

Handlers must derive the acting user from the server session, verify organization membership/roles and invitation recipients, and validate every display ID against that user. IDs are non-secret references, not a bearer-token substitute. Password reset and verification challenges need expiry and one-time use. MFA revocation/enrollment and password changes follow your service's reauthentication policy; optional fields do not waive that policy. `logout` and revocation invalidate the real server session, not just a frontend flag.

Return safe domain errors as JSON, for example `{error:{code:"rate-limited",retryAfterSeconds:30}}`. Supported codes are exported as `AUTH_WORKFLOW_ERROR_CODES`. Provider error messages, SDK objects and credentials are never forwarded to the UI. Missing/disabled operations return `unsupported`; do not report success for an unavailable operation.

## Validated result shapes

```ts
type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};
type AuthSession = {
  id: string;
  user: AuthUser;
  createdAt: string;
  expiresAt: string;
};
type AuthFlowResult =
  | { kind: "session"; session: AuthSession; redirectTo?: string }
  | {
      kind: "verification-required";
      challengeId: string;
      email: string;
      codeLength?: 6 | 8;
    }
  | {
      kind: "mfa-required";
      challengeId: string;
      factors: ("totp" | "recovery-code")[];
      codeLength?: 6 | 8;
    };
type AuthActionResult = { kind: "ok" };
type AuthCompletionResult = AuthFlowResult | AuthActionResult;
type AuthMfaEnrollment = {
  kind: "mfa-enrollment";
  enrollmentId: string;
  secret: string;
  otpauthUri: string;
};
type AuthIdentityState = {
  session: AuthSession | null;
  organizations: {
    id: string;
    name: string;
    slug: string;
    role: "owner" | "admin" | "member";
  }[];
  activeOrganizationId: string | null;
  members: { id: string; user: AuthUser; role: "owner" | "admin" | "member" }[];
  invitations: {
    id: string;
    email: string;
    role: "admin" | "member";
    status: "pending" | "accepted" | "revoked";
    createdAt: string;
    expiresAt: string;
  }[];
  sessions: {
    id: string;
    device: string;
    location?: string;
    createdAt: string;
    lastActiveAt: string;
    expiresAt: string;
    current: boolean;
  }[];
  factors: { id: string; type: "totp"; label: string; createdAt: string }[];
};
```

Times are ISO datetimes with an explicit UTC/offset; expiry must be later than creation. Organization slugs use lowercase letters, numbers and hyphens. Members and invitations refer to the active organization only. A signed-in identity must have exactly one current device session matching `session.id`, and the current user's active membership role must match the organization role. Anonymous identities have empty private arrays and `activeOrganizationId:null`. Arrays reject duplicate IDs. Responses allowlist fields and discard extra SDK token/password fields at every level.

An enrollment returns an uppercase unpadded Base32 key and a matching `otpauth://totp/...` URI. Allowed URI parameters are `secret`, `issuer`, `algorithm` (SHA1/SHA256/SHA512), `digits` (6/8) and `period` (30/60). No external QR service or image URL is used. Return only setup material for the user-requested enrollment; the `getIdentity` response contains factor labels and IDs, never keys.

## Callback adapters and provider choices

`createAuthCallbackAdapter({providerId, handlers, redirectPolicy?})` wraps all 25 `AuthWorkflowHandlers` with input/output validation and cancellation. Every handler is required. The named factories below set the provider identity and apply the same contract:

```ts
createBetterAuthWorkflowAdapter({ handlers, redirectPolicy });
createClerkAuthWorkflowAdapter({ handlers, redirectPolicy });
createSupabaseAuthWorkflowAdapter({ handlers, redirectPolicy });
createAuthJsWorkflowAdapter({ handlers, redirectPolicy });
createWorkOSAuthWorkflowAdapter({ handlers, redirectPolicy });
createAuth0WorkflowAdapter({ handlers, redirectPolicy });
```

Use the same HTTP bridge for any of these providers, or adapt your existing consumer API callbacks. For example, this is a working callback composition with the same-origin transport; override individual methods with your application's already-normalized client callbacks when needed:

```ts
import {
  createAuthHttpAdapter,
  createBetterAuthWorkflowAdapter,
} from "@/lib/auth-integration";

const transport = createAuthHttpAdapter({
  basePath: "/api/identity",
  origin: applicationOrigin,
  redirectPolicy: { origin: applicationOrigin },
});
const adapter = createBetterAuthWorkflowAdapter({
  handlers: transport,
  redirectPolicy: { origin: applicationOrigin },
});
```

These are frontend callback adapters, not drop-in provider SDK/configuration installers. Map the actual backend results to the DTOs above, keep provider tokens in your backend session, and implement the remaining organization/session handlers with your application's data model where the provider does not supply them.

| Choice        | Consumer backend binding                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Better Auth   | Bind the email/password and verification/reset handlers to your existing [email/password setup](https://better-auth.com/docs/authentication/email-password). Apply your existing [two-factor](https://better-auth.com/docs/plugins/2fa) and [organization](https://better-auth.com/docs/plugins/organization) plugins to the corresponding handlers.                                                                                    |
| Clerk         | Normalize your configured [custom email/password flow](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password) and [MFA flow](https://clerk.com/docs/guides/development/custom-flows/authentication/multi-factor-authentication). Only an active consumer session maps to `kind:"session"`; handle other enabled session tasks in your application.                                                       |
| Supabase Auth | Bind your server-side [password auth](https://supabase.com/docs/guides/auth/passwords) and [TOTP enrollment/challenge/verification](https://supabase.com/docs/guides/auth/auth-mfa/totp). Normalize session/token replies to display IDs and user data; organization/member/invitation handlers use your authorized application tables.                                                                                                 |
| Auth.js       | Keep the existing social callback contract. Bind `signIn`, `getSession` and `logout` to your [Credentials/session setup](https://authjs.dev/getting-started/authentication/credentials); your consumer backend supplies registration, reset, verification, MFA and organization management rather than assuming Auth.js creates those workflows.                                                                                        |
| WorkOS        | Bind your existing [User Management](https://workos.com/docs) server API and server session to the normalized handlers for users, MFA, organizations, invitations and sessions. Hosted authorization remains in your separately configured provider callback.                                                                                                                                                                           |
| Auth0         | Bind your server session and permitted user/organization/session management operations to your existing Auth0 backend. The [MFA API](https://github.com/auth0/docs/blob/master/articles/api/authentication/_multifactor-authentication.md) can back normalized challenges where your tenant enables that flow; hosted authorization remains consumer-owned. A provider choice does not enable a password grant or bypass tenant policy. |

Raw SDK responses such as `{data,error}`, JWTs or `{user,access_token}` are not valid adapter results. Normalize them in your consumer handlers. For example, a verification-required signup returns a server challenge reference; a signup without automatic sign-in returns `{kind:"ok"}`; a verified server session returns the `AuthSession` DTO. Never synthesize an authenticated session for a provider callback that merely started a redirect.

## Redirects, mocks and checks

`AuthRedirectPolicy` is `{origin:string, allowedOrigins?:readonly string[]}`. Any `redirectTo` requires this explicit policy. Relative app paths and exactly listed HTTPS origins are supported; wildcards, userinfo, protocol-relative URLs, traversal/encoded slash tricks and credential query parameters are refused. The template shows an explicit continuation button after a validated session response. The settings panel never navigates. `validateAuthRedirect` is exported for consumer code.

`createMockAuthWorkflowAdapter({delayMs?,signedIn?,providerId?})` supplies the complete memory-only contract. It starts signed in by default with editable team/session fixtures, accepts demo passwords, uses code `123456`, recovery code `DEMO-RECOVERY`, email-link reference `demo-email`, reset reference `demo-reset` and invitation reference `demo-invitation`. These references are previews, not real credentials. `providerId` is a display choice. The mock never makes network requests or writes browser persistence.

`runAuthWorkflow(adapter, operation, request, scope?, redirectPolicy?)` also validates plain injected adapters. `createAuthWorkflowRunner().run(...)` adds a single-flight guard, returning `null` for duplicate submissions and releasing the guard after errors/cancellation. `validateAuthWorkflowRequest`, `validateAuthWorkflowResult`, `AuthWorkflowError` and `authWorkflowErrorMessage` are exported for consumer integrations.

Run the focused contract and legacy-compatibility checks:

```sh
node --experimental-strip-types --test tests/auth-integrations.test.mjs tests/demo-auth.test.mjs
```

They cover lifecycle mutations, all HTTP paths, consent, malformed/incomplete replies, URL/setup validation, secrets dropped from responses, cancellation before/after invocation, guard recovery and browser-persistence prohibition.
