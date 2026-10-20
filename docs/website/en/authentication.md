# Authentication

Aureform supplies sign-in, sign-up, password reset and verification layouts. Their default behavior is a local demonstration, including Google, GitHub and Microsoft buttons. No provider account, OAuth request or server session is created by the public demo.

## Inspect the default behavior

1. Open an authentication view from the main navigation or template gallery.
2. Try validation, password visibility, sign-up consent and retry feedback.
3. Use the demo verification code `123456` to explore the OTP interaction.
4. Inspect the explicit demo disclosure before continuing to the application.

The default adapter saves only allowlisted display data: `demo: true`, provider, name, email and creation date. Passwords, access tokens and cookies are not stored. Browser-storage failures fall back to component memory. This profile is never proof of identity or permission.

## Inject a provider callback

[`AuthAdapter`](../../../src/lib/demo-auth.ts) has one method, `signInWithProvider`. A consuming Client Component can receive its application's implementation and pass it to the existing template:

```tsx
"use client";

import { AppPage } from "@/components/app-page";
import type {
  AuthAdapter,
  ProviderSignInHandler,
} from "@/lib/demo-auth";

export function SignInPage({ signIn }: { signIn: ProviderSignInHandler }) {
  const authAdapter: AuthAdapter = { signInWithProvider: signIn };
  return (
    <AppPage
      locale="en"
      path="auth/sign-in"
      authAdapter={authAdapter}
    />
  );
}
```

Supply `signIn` from your client integration; this snippet does not implement OAuth. Alternatively pass `onProviderSignIn={signIn}` to `AppPage`, `AuthTemplate` or `SocialAuth`. That callback takes precedence over `authAdapter`.

## Follow the callback contract

The handler receives `{ provider, intent, consent, signal }`. Providers are `google`, `github` or `microsoft`; intent is `sign-in` or `sign-up`. Sign-up consent is validated before invocation. Respect cancellation before side effects and reject failed work to expose retry feedback.

Return `{ kind: "handled" }` when your application owns the flow. This confirms callback completion only; it does not authenticate the user. Never return credentials as demo profile fields. Create function-valued adapters inside the client boundary rather than passing them from a Server Component.

## Complete the production integration

Your application owns provider registration, callback URLs, scopes, account linking, server sessions, authorization and redirects. The social adapter does not replace the email/password, recovery or OTP mock flows; connect those separately.

See [application integration](../../../docs/application-integrations.md), [the typed auth contract](../../../src/lib/demo-auth.ts), [SocialAuth source](../../../src/components/blocks/social-auth.tsx) and [client examples](../../../examples/ApplicationAdapters.tsx). Preserve accessible labels, pending states and consent focus when adapting the templates.
