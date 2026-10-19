"use client";

import { useMemo } from "react";
import { AppPage } from "@/components/app-page";
import { createStripeCommerceAdapter } from "@/lib/stripe-commerce-adapter";
import type { ProviderSignInHandler } from "@/lib/demo-auth";

/**
 * Use this in a consumer application with its own authenticated API.
 * This example is not mounted by the static public demo.
 */
export function ConnectedCommerceExample() {
  const commerceAdapter = useMemo(
    () =>
      createStripeCommerceAdapter({
        baseUrl: "/api/commerce",
        getCsrfToken: () =>
          document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? null,
      }),
    [],
  );
  return (
    <AppPage locale="en" path="orders" commerceAdapter={commerceAdapter} />
  );
}

/** Supply your own OAuth client callback; the template remains frontend UI. */
export function SocialAuthAdapterExample({
  signIn,
}: {
  signIn: ProviderSignInHandler;
}) {
  return <AppPage locale="en" path="auth/sign-in" onProviderSignIn={signIn} />;
}
