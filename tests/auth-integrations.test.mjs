import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultAppearance } from "../src/lib/appearance.ts";
import * as demoAuth from "../src/lib/demo-auth.ts";
import * as authWorkflows from "../src/lib/auth-integration.ts";
import {
  AUTH_WORKFLOW_ENDPOINTS,
  AuthWorkflowError,
  authWorkflowErrorMessage,
  createAuth0WorkflowAdapter,
  createAuthCallbackAdapter,
  createAuthHttpAdapter,
  createAuthJsWorkflowAdapter,
  createAuthWorkflowRunner,
  createBetterAuthWorkflowAdapter,
  createClerkAuthWorkflowAdapter,
  createMockAuthWorkflowAdapter,
  createSupabaseAuthWorkflowAdapter,
  createWorkOSAuthWorkflowAdapter,
  runAuthWorkflow,
  validateAuthRedirect,
  validateAuthWorkflowRequest,
  validateAuthWorkflowResult,
} from "../src/lib/auth-integration.ts";

const origin = "https://app.example.com";
const redirectPolicy = {
  origin,
  allowedOrigins: ["https://workspace.example.com"],
};
const credentials = {
  email: "consumer@example.com",
  password: "test-only-private-password",
};
const mock = (options = {}) =>
  createMockAuthWorkflowAdapter({ delayMs: 0, ...options });
const state = async (adapter) => (await adapter.getIdentity({})).identity;
const json = (value, init) => Response.json(value, init);
const require = createRequire(import.meta.url);
const ts = require("typescript");
function clientModule(file, bindings) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(
    output,
    {
      module: compiledModule,
      exports: compiledModule.exports,
      AbortController,
      require: (id) => {
        if (id in bindings) return bindings[id];
        if (id.startsWith("@/"))
          throw new Error(`Missing test boundary: ${id}`);
        return require(id);
      },
    },
    { filename: file },
  );
  return compiledModule.exports;
}
function renderedAuth({ props = {}, standalone = false, locale = "en" } = {}) {
  const buttons = [],
    writes = [],
    providerCalls = [],
    redirects = [],
    finished = [];
  let complete;
  const providerFinished = new Promise((resolve) => {
    complete = resolve;
  });
  function Button({ loading, disabled, ...rest }) {
    const nativeProps = {
      ...rest,
      disabled: !!disabled || !!loading,
    };
    delete nativeProps.variant;
    delete nativeProps.size;
    buttons.push(nativeProps);
    return React.createElement("button", nativeProps);
  }
  const box = ({ children }) => React.createElement("div", {}, children);
  const bindings = {
    "@/components/ui/button": { Button, buttonVariants: () => "" },
    "@/components/ui/alert": { Alert: box },
    "@/components/ui/input": {
      Input: (props) => React.createElement("input", props),
    },
    "@/components/ui/field": { Field: box },
    "@/components/ui/checkbox": { Checkbox: box },
    "@/components/ui/input-otp": { InputOTP: box },
    "@/hooks/use-language": {
      useLanguage: () => ({
        locale,
        l: (en, es) => (locale === "es" ? es : en),
        currency: String,
      }),
    },
    "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
    "@/lib/demo-auth": {
      ...demoAuth,
      createDemoAuthAdapter: () => {
        const adapter = demoAuth.createDemoAuthAdapter({
          delayMs: 0,
          storage: { setItem: (key, value) => writes.push({ key, value }) },
        });
        return {
          signInWithProvider: async (request) => {
            providerCalls.push(request.provider);
            const result = await adapter.signInWithProvider(request);
            finished.push(result);
            complete();
            return result;
          },
        };
      },
    },
    "@/lib/auth-integration": authWorkflows,
    "@/components/appearance-provider": {
      useAppearance: () => ({ appearance: defaultAppearance }),
    },
    "@/components/brand": { Brand: box, AureformMark: box },
    "@/components/effects": { GlowBorder: box, ShaderBackground: box },
    "@/demo/dashboard-data": { revenueData: [{ value: 42000 }] },
    "next/link": {
      __esModule: true,
      default: ({ children, ...props }) =>
        React.createElement("a", props, children),
    },
    "next/navigation": {
      useRouter: () => ({ push: (path) => redirects.push(path) }),
    },
  };
  const { SocialAuth } = clientModule(
    "../src/components/blocks/social-auth.tsx",
    bindings,
  );
  bindings["@/components/blocks/social-auth"] = { SocialAuth };
  const { AuthTemplate } = clientModule(
    "../src/components/templates/auth.tsx",
    bindings,
  );
  const markup = renderToStaticMarkup(
    React.createElement(
      standalone ? SocialAuth : AuthTemplate,
      standalone ? props : { mode: "sign-in", ...props },
    ),
  );
  return {
    markup,
    writes,
    providerCalls,
    redirects,
    finished,
    providerFinished,
    providers: buttons.filter((button) =>
      /Google|GitHub|Microsoft/.test(button["aria-label"] ?? ""),
    ),
  };
}
function callbackOptions(overrides = {}, options = {}) {
  const preview = mock();
  return {
    handlers: Object.fromEntries(
      Object.keys(AUTH_WORKFLOW_ENDPOINTS).map((operation) => [
        operation,
        overrides[operation] ??
          ((request, scope) => preview[operation](request, scope)),
      ]),
    ),
    ...options,
  };
}

test("consumer-only auth renders three disabled social providers and cannot write a mock session or redirect", async () => {
  for (const locale of ["en", "es"]) {
    const rendered = renderedAuth({
      locale,
      props: {
        workflowAdapter: { mode: "consumer", providerId: "better-auth" },
      },
    });
    assert.equal(rendered.providers.length, 3);
    assert.ok(rendered.providers.every((button) => button.disabled));
    assert.match(
      rendered.markup,
      locale === "es"
        ? /Configura un handler de proveedor/
        : /Configure a provider handler/,
    );
    // Exercise the event closures too: disabled presentation is not the only guard.
    for (const button of rendered.providers) button.onClick();
    await Promise.resolve();
    assert.deepEqual(rendered.providerCalls, []);
    assert.deepEqual(rendered.writes, []);
    assert.deepEqual(rendered.redirects, []);
  }
});

test("standalone SocialAuth with a consumer disclosure never defaults to the mock without a handler", async () => {
  const rendered = renderedAuth({ standalone: true, props: { demo: false } });
  assert.equal(rendered.providers.length, 3);
  assert.ok(rendered.providers.every((button) => button.disabled));
  assert.match(rendered.markup, /Not configured/);
  for (const button of rendered.providers) button.onClick();
  await Promise.resolve();
  assert.deepEqual(rendered.providerCalls, []);
  assert.deepEqual(rendered.writes, []);
});

test("default auth routes keep Google, GitHub and Microsoft working as explicit local demos", async () => {
  for (const [index, provider] of demoAuth.SOCIAL_AUTH_PROVIDERS.entries()) {
    const rendered = renderedAuth();
    assert.ok(rendered.providers.every((button) => !button.disabled));
    assert.match(
      rendered.markup,
      /Local preview. No connection to your provider account/,
    );
    rendered.providers[index].onClick();
    await rendered.providerFinished;
    assert.deepEqual(rendered.providerCalls, [provider]);
    assert.equal(rendered.writes.length, 1);
    assert.equal(rendered.writes[0].key, demoAuth.DEMO_AUTH_SESSION_KEY);
    assert.equal(JSON.parse(rendered.writes[0].value).provider, provider);
    assert.equal(rendered.finished[0].kind, "demo");
  }
});

test("consumer auth keeps injected social callbacks enabled and preserves callback precedence without a mock", async () => {
  const calls = [];
  const rendered = renderedAuth({
    props: {
      workflowAdapter: { mode: "consumer", providerId: "better-auth" },
      authAdapter: {
        signInWithProvider: async () => {
          throw new Error("Callback must override this adapter");
        },
      },
      onProviderSignIn: async (request) => {
        calls.push(request.provider);
        return { kind: "handled" };
      },
    },
  });
  assert.ok(rendered.providers.every((button) => !button.disabled));
  rendered.providers[1].onClick();
  await Promise.resolve();
  assert.deepEqual(calls, ["github"]);
  assert.deepEqual(rendered.providerCalls, []);
  assert.deepEqual(rendered.writes, []);
  assert.deepEqual(rendered.redirects, []);
});

test("the memory-only mock supplies consistent identity, memberships and device sessions", async () => {
  const adapter = mock();
  const identity = await state(adapter);
  assert.equal(adapter.mode, "demo");
  assert.equal(identity.sessions.length, 3);
  assert.equal(
    identity.sessions.filter((item) => item.current)[0].id,
    identity.session.id,
  );
  assert.equal(
    identity.members.find(
      (member) => member.user.id === identity.session.user.id,
    ).role,
    "owner",
  );
  identity.members[0].user.name = "mutated outside the adapter";
  assert.equal((await state(adapter)).session.user.name, "Alex Morgan");
  await adapter.logout({});
  assert.deepEqual(await state(adapter), {
    session: null,
    organizations: [],
    activeOrganizationId: null,
    members: [],
    invitations: [],
    sessions: [],
    factors: [],
  });
  assert.equal((await adapter.getSession({})).session, null);
});

test("sign-up requires consent and a verified challenge before the mock returns a session", async () => {
  const adapter = mock({ signedIn: false });
  const signup = { ...credentials, name: "Consumer Test", consent: true };
  await assert.rejects(adapter.signUp({ ...signup, consent: false }), {
    code: "consent-required",
  });
  assert.equal((await adapter.getSession({})).session, null);
  const challenge = await adapter.signUp(signup);
  assert.equal(challenge.kind, "verification-required");
  assert.equal((await adapter.getSession({})).session, null);
  await assert.rejects(
    adapter.verifyEmail({ challengeId: challenge.challengeId, code: "000000" }),
    { code: "invalid-code" },
  );
  await assert.rejects(
    adapter.verifyEmail({
      challengeId: challenge.challengeId,
      code: "DEMO-RECOVERY",
    }),
    { code: "invalid-code" },
  );
  const resend = await adapter.resendVerification({
    email: credentials.email,
    challengeId: challenge.challengeId,
  });
  await assert.rejects(
    adapter.verifyEmail({ challengeId: challenge.challengeId, code: "123456" }),
    { code: "expired" },
  );
  const result = await adapter.verifyEmail({
    challengeId: resend.challengeId,
    code: "123456",
  });
  assert.equal(result.kind, "session");
  assert.equal(result.session.user.emailVerified, true);
  assert.equal(result.session.user.name, signup.name);
  assert.equal(result.session.user.email, signup.email);
  await assert.rejects(
    adapter.verifyEmail({ challengeId: resend.challengeId, code: "123456" }),
    { code: "expired" },
  );
});

test("recovery stays generic, validates the reset reference, and never signs a user in", async () => {
  const adapter = mock({ signedIn: false });
  assert.deepEqual(
    await adapter.requestPasswordReset({ email: "unknown@example.com" }),
    { kind: "ok" },
  );
  await assert.rejects(
    adapter.confirmPasswordReset({
      token: "expired-reset",
      password: credentials.password,
    }),
    { code: "expired" },
  );
  assert.deepEqual(
    await adapter.confirmPasswordReset({
      token: "demo-reset",
      password: credentials.password,
    }),
    { kind: "ok" },
  );
  assert.equal((await adapter.getSession({})).session, null);
  await assert.rejects(
    adapter.confirmPasswordReset({ token: "demo-reset", password: "short" }),
    { code: "invalid-request" },
  );
});

test("email-link confirmation is an explicit token request, separate from OTP challenges", async () => {
  const adapter = mock({ signedIn: false });
  await adapter.signUp({
    ...credentials,
    name: "Link Consumer",
    consent: true,
  });
  await assert.rejects(adapter.verifyEmail({ token: "expired-email-link" }), {
    code: "expired",
  });
  const result = await adapter.verifyEmail({ token: "demo-email" });
  assert.equal(result.kind, "session");
  assert.equal(result.session.user.emailVerified, true);
  assert.equal(result.session.user.email, credentials.email);
  assert.throws(
    () =>
      validateAuthWorkflowRequest("verifyEmail", {
        token: "demo-email",
        challengeId: "challenge",
        code: "123456",
      }),
    { code: "invalid-request" },
  );
});

test("a consumer can complete sign-up without claiming an authenticated session", async () => {
  const adapter = createAuthJsWorkflowAdapter(
    callbackOptions({
      signUp: async () => ({ kind: "ok" }),
      getSession: async () => ({ kind: "session", session: null }),
    }),
  );
  assert.deepEqual(
    await adapter.signUp({ ...credentials, name: "Consumer", consent: true }),
    { kind: "ok" },
  );
  assert.equal((await adapter.getSession({})).session, null);
});

test("profile changes refresh the session and membership without retaining credential data", async () => {
  const adapter = mock();
  await adapter.updateProfile({ name: "Updated Consumer" });
  await adapter.changePassword({
    currentPassword: "old-test-password",
    newPassword: credentials.password,
  });
  assert.equal(
    (await adapter.getSession({})).session.user.name,
    "Updated Consumer",
  );
  assert.equal((await state(adapter)).members[0].user.name, "Updated Consumer");
  assert.ok(
    !JSON.stringify(await state(adapter)).includes(credentials.password),
  );
});

test("organization create/update/switch/delete and invitations are real mock lifecycle mutations", async () => {
  const adapter = mock();
  await adapter.createOrganization({
    name: "Consumer Workspace",
    slug: "consumer-workspace",
  });
  const created = await state(adapter);
  const organizationId = created.activeOrganizationId;
  assert.equal(created.members.length, 1);
  assert.equal(
    created.organizations.find((item) => item.id === organizationId).role,
    "owner",
  );
  await adapter.updateOrganization({
    organizationId,
    name: "Renamed Workspace",
    slug: "renamed-workspace",
  });
  await adapter.inviteMember({
    organizationId,
    email: "invitee@example.com",
    role: "admin",
  });
  let current = await state(adapter);
  assert.equal(current.invitations[0].email, "invitee@example.com");
  await assert.rejects(
    adapter.inviteMember({
      organizationId,
      email: "invitee@example.com",
      role: "member",
    }),
    { code: "conflict" },
  );
  await adapter.revokeInvitation({
    organizationId,
    invitationId: current.invitations[0].id,
  });
  current = await state(adapter);
  assert.equal(current.invitations[0].status, "revoked");
  await adapter.switchOrganization({ organizationId: "demo-studio" });
  assert.equal((await state(adapter)).activeOrganizationId, "demo-studio");
  await adapter.updateMemberRole({
    organizationId: "demo-studio",
    memberId: "demo-member-sam",
    role: "member",
  });
  assert.equal(
    (await state(adapter)).members.find(
      (member) => member.id === "demo-member-sam",
    ).role,
    "member",
  );
  await adapter.removeMember({
    organizationId: "demo-studio",
    memberId: "demo-member-jordan",
  });
  assert.ok(
    !(await state(adapter)).members.some(
      (member) => member.id === "demo-member-jordan",
    ),
  );
  await assert.rejects(
    adapter.removeMember({
      organizationId: "demo-studio",
      memberId: "demo-member-alex",
    }),
    { code: "forbidden" },
  );
  await adapter.deleteOrganization({ organizationId });
  assert.ok(
    !(await state(adapter)).organizations.some(
      (item) => item.id === organizationId,
    ),
  );
  await adapter.acceptInvitation({ token: "demo-invitation" });
  assert.equal((await state(adapter)).activeOrganizationId, "demo-partners");
  await assert.rejects(
    adapter.updateOrganization({
      organizationId: "demo-partners",
      name: "Not allowed",
      slug: "not-allowed",
    }),
    { code: "forbidden" },
  );
  await assert.rejects(
    adapter.acceptInvitation({ token: "expired-invitation" }),
    { code: "expired" },
  );
});

test("session revocation handles other devices and the current session without a local auth flag", async () => {
  const adapter = mock();
  await adapter.revokeSession({ sessionId: "demo-session-phone" });
  assert.equal((await state(adapter)).sessions.length, 2);
  await adapter.revokeOtherSessions({});
  const identity = await state(adapter);
  assert.equal(identity.sessions.length, 1);
  await adapter.revokeSession({ sessionId: identity.session.id });
  assert.equal((await adapter.getSession({})).session, null);
  await assert.rejects(adapter.revokeOtherSessions({}), {
    code: "unauthorized",
  });
});

test("MFA enrollment, login challenges and revocation remain distinct lifecycle stages", async () => {
  const adapter = mock();
  const enrollment = await adapter.enrollMfa({
    label: "Test authenticator",
    password: credentials.password,
  });
  assert.equal(enrollment.kind, "mfa-enrollment");
  assert.equal(
    new URL(enrollment.otpauthUri).searchParams.get("secret"),
    enrollment.secret,
  );
  assert.equal((await state(adapter)).factors.length, 0);
  await assert.rejects(
    adapter.verifyMfa({
      enrollmentId: enrollment.enrollmentId,
      code: "000000",
    }),
    { code: "invalid-code" },
  );
  await adapter.verifyMfa({
    enrollmentId: enrollment.enrollmentId,
    code: "123456",
  });
  const factor = (await state(adapter)).factors[0];
  assert.equal(factor.label, "Test authenticator");
  assert.ok(!JSON.stringify(await state(adapter)).includes(enrollment.secret));
  await adapter.logout({});
  const challenge = await adapter.signIn(credentials);
  assert.equal(challenge.kind, "mfa-required");
  assert.equal((await adapter.getSession({})).session, null);
  await assert.rejects(
    adapter.verifyEmail({ challengeId: challenge.challengeId, code: "123456" }),
    { code: "expired" },
  );
  await assert.rejects(
    adapter.verifyMfa({ challengeId: challenge.challengeId, code: "000000" }),
    { code: "invalid-code" },
  );
  assert.equal(
    (
      await adapter.verifyMfa({
        challengeId: challenge.challengeId,
        code: "DEMO-RECOVERY",
      })
    ).kind,
    "session",
  );
  await adapter.revokeMfa({ factorId: factor.id, code: "123456" });
  assert.equal((await state(adapter)).factors.length, 0);
});

test("the six named consumer factories expose the full validated callback contract", async () => {
  const factories = [
    [createBetterAuthWorkflowAdapter, "better-auth"],
    [createClerkAuthWorkflowAdapter, "clerk"],
    [createSupabaseAuthWorkflowAdapter, "supabase-auth"],
    [createAuthJsWorkflowAdapter, "authjs"],
    [createWorkOSAuthWorkflowAdapter, "workos"],
    [createAuth0WorkflowAdapter, "auth0"],
  ];
  for (const [factory, providerId] of factories) {
    const adapter = factory(callbackOptions());
    assert.equal(adapter.providerId, providerId);
    assert.equal(adapter.mode, "consumer");
    assert.ok(
      Object.keys(AUTH_WORKFLOW_ENDPOINTS).every(
        (operation) => typeof adapter[operation] === "function",
      ),
    );
    assert.equal((await adapter.signIn(credentials)).kind, "session");
    await adapter.logout({});
    assert.equal((await adapter.getSession({})).session, null);
  }
  assert.throws(
    () =>
      createAuthCallbackAdapter({
        providerId: "consumer",
        handlers: { signIn: () => ({ kind: "ok" }) },
      }),
    { code: "invalid-request" },
  );
});

test("every operation rejects incomplete or malformed results instead of falling back to a demo", async () => {
  for (const operation of Object.keys(AUTH_WORKFLOW_ENDPOINTS)) {
    for (const value of [undefined, null, false, {}, { kind: "unexpected" }]) {
      assert.throws(
        () => validateAuthWorkflowResult(operation, value),
        { code: "invalid-response" },
        operation,
      );
    }
  }
  const session = (await mock().getSession({})).session;
  for (const invalid of [
    { ...session, expiresAt: "invalid-date" },
    { ...session, expiresAt: session.createdAt },
    { ...session, user: { ...session.user, emailVerified: "yes" } },
    { ...session, user: { ...session.user, email: "invalid" } },
    {
      version: 1,
      demo: true,
      name: "Local user",
      email: "user@example.com",
      createdAt: session.createdAt,
    },
  ])
    assert.throws(
      () =>
        validateAuthWorkflowResult("signIn", {
          kind: "session",
          session: invalid,
        }),
      { code: "invalid-response" },
    );
  const identity = await state(mock());
  for (const invalid of [
    { ...identity, activeOrganizationId: "missing-org" },
    { ...identity, sessions: [] },
    { ...identity, sessions: [identity.sessions[0], identity.sessions[0]] },
    { ...identity, session: null },
    { ...identity, members: [] },
  ])
    assert.throws(
      () =>
        validateAuthWorkflowResult("getIdentity", {
          kind: "identity",
          identity: invalid,
        }),
      { code: "invalid-response" },
    );
});

test("response allowlists discard passwords, provider tokens and opaque SDK fields at every level", async () => {
  const identity = await state(mock());
  const privateData = {
    password: credentials.password,
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
  };
  const result = validateAuthWorkflowResult("getIdentity", {
    kind: "identity",
    ...privateData,
    identity: {
      ...identity,
      ...privateData,
      session: {
        ...identity.session,
        ...privateData,
        user: { ...identity.session.user, ...privateData },
      },
      members: identity.members.map((member) => ({
        ...member,
        ...privateData,
        user: { ...member.user, ...privateData },
      })),
      sessions: identity.sessions.map((session) => ({
        ...session,
        ...privateData,
      })),
      organizations: identity.organizations.map((organization) => ({
        ...organization,
        ...privateData,
      })),
      invitations: identity.invitations.map((invitation) => ({
        ...invitation,
        ...privateData,
      })),
    },
  });
  assert.deepEqual(result.identity, identity);
  const output = JSON.stringify(result);
  for (const value of Object.values(privateData))
    assert.ok(!output.includes(value));
});

test("a plain injected adapter is validated just like a factory-created adapter", async () => {
  const adapter = {
    ...mock(),
    mode: "consumer",
    signIn: async () => ({ kind: "session", session: null }),
  };
  await assert.rejects(runAuthWorkflow(adapter, "signIn", credentials), {
    code: "invalid-response",
  });
  const valid = (await mock().getSession({})).session;
  adapter.signIn = async () => ({
    kind: "session",
    session: valid,
    redirectTo: "https://unapproved.example/",
  });
  await assert.rejects(
    runAuthWorkflow(adapter, "signIn", credentials, {}, redirectPolicy),
    { code: "unsafe-url" },
  );
});

test("request validation prevents invalid fields and consent from reaching consumer handlers", async () => {
  let calls = 0;
  const adapter = createBetterAuthWorkflowAdapter(
    callbackOptions({
      signUp: async () => {
        calls++;
        return { kind: "ok" };
      },
    }),
  );
  await assert.rejects(
    adapter.signUp({ ...credentials, name: "Consumer", consent: false }),
    { code: "consent-required" },
  );
  await assert.rejects(
    adapter.signUp({
      ...credentials,
      email: "invalid",
      name: "Consumer",
      consent: true,
    }),
    { code: "invalid-request" },
  );
  assert.equal(calls, 0);
  assert.throws(
    () =>
      validateAuthWorkflowRequest("verifyMfa", {
        enrollmentId: "enrollment",
        challengeId: "challenge",
        code: "123456",
      }),
    { code: "invalid-request" },
  );
  assert.deepEqual(
    validateAuthWorkflowRequest("requestPasswordReset", {
      email: credentials.email,
      password: credentials.password,
    }),
    { email: credentials.email },
  );
  assert.deepEqual(
    validateAuthWorkflowRequest("signIn", {
      ...credentials,
      token: "unrelated-token",
    }),
    credentials,
  );
});

test("MFA enrollment responses cannot authenticate a user or carry unsafe setup links", async () => {
  const session = (await mock().getSession({})).session;
  const adapter = createBetterAuthWorkflowAdapter(
    callbackOptions({ verifyMfa: async () => ({ kind: "session", session }) }),
  );
  await assert.rejects(
    adapter.verifyMfa({ enrollmentId: "enrollment", code: "123456" }),
    { code: "invalid-response" },
  );
  const enrollment = await mock().enrollMfa({ label: "Test" });
  for (const otpauthUri of [
    "javascript:alert(1)",
    "https://setup.example/secret",
    enrollment.otpauthUri.replace(enrollment.secret, "AAAAAAAAAAAAAAAA"),
    `${enrollment.otpauthUri}&callback=https://unapproved.example/`,
    `${enrollment.otpauthUri}&secret=${enrollment.secret}`,
  ])
    assert.throws(
      () =>
        validateAuthWorkflowResult("enrollMfa", { ...enrollment, otpauthUri }),
      { code: "unsafe-url" },
    );
});

test("redirect origins are explicitly configured and credential-bearing navigation is refused", async () => {
  assert.equal(
    validateAuthRedirect("/en/dashboard/?tab=overview#members", redirectPolicy),
    "/en/dashboard/?tab=overview#members",
  );
  assert.equal(
    validateAuthRedirect(
      "https://workspace.example.com/account/",
      redirectPolicy,
    ),
    "https://workspace.example.com/account/",
  );
  const unsafe = [
    "//unapproved.example/",
    "javascript:alert(1)",
    "data:text/html,unsafe",
    "https://app.example.com.unapproved.example/",
    "https://user@app.example.com/",
    "https://app.example.com\\@unapproved.example/",
    "http://app.example.com/",
    "/%2f%2funapproved.example/",
    "/%5cunapproved.example/",
    "/%252funapproved.example/",
    "/../account/",
    "/%2e%2e/account/",
    "https://app.example.com/a/../account/",
    "/account/?access_token=private",
    "/account/?accessToken=private",
    "/account/#access_token=private",
    "/account/?password=private",
    "/account/?code=private",
    "/account/\n",
    "/account/%00",
  ];
  for (const value of unsafe)
    assert.throws(
      () => validateAuthRedirect(value, redirectPolicy),
      { code: "unsafe-url" },
      value,
    );
  assert.throws(
    () =>
      validateAuthRedirect("/account/", {
        origin,
        allowedOrigins: ["https://*.example.com"],
      }),
    { code: "unsafe-url" },
  );
  const session = (await mock().getSession({})).session;
  assert.throws(
    () =>
      validateAuthWorkflowResult("signIn", {
        kind: "session",
        session,
        redirectTo: "/account/",
      }),
    { code: "unsafe-url" },
  );
  assert.equal(
    validateAuthRedirect("/account/", { origin: "http://localhost:3000" }),
    "/account/",
  );
});

test("HTTP transport posts only allowlisted input with same-origin cookies, CSRF and no redirects", async () => {
  const seen = [];
  const adapter = createAuthHttpAdapter({
    basePath: "/api/identity/",
    origin,
    csrfToken: () => "test-csrf",
    providerId: "better-auth",
    fetch: async (url, init) => {
      seen.push({ url, init });
      return json({ kind: "ok", password: "must-be-dropped" });
    },
  });
  assert.equal(adapter.mode, "consumer");
  const controller = new AbortController();
  assert.deepEqual(
    await adapter.requestPasswordReset(
      { email: credentials.email, password: credentials.password },
      { signal: controller.signal },
    ),
    { kind: "ok" },
  );
  const { url, init } = seen[0];
  assert.equal(url, `${origin}/api/identity/password/reset/request`);
  assert.equal(init.method, "POST");
  assert.equal(init.credentials, "same-origin");
  assert.equal(init.cache, "no-store");
  assert.equal(init.redirect, "error");
  assert.equal(init.signal, controller.signal);
  assert.deepEqual(JSON.parse(init.body), { email: credentials.email });
  assert.equal(init.headers["X-CSRF-Token"], "test-csrf");
  assert.equal(init.headers.Accept, "application/json");
  assert.ok(!("Authorization" in init.headers));
});

test("all 25 HTTP operations target their documented endpoints and validate their results", async () => {
  const preview = mock();
  const inputs = {
    signIn: credentials,
    signUp: { ...credentials, name: "Consumer", consent: true },
    requestPasswordReset: { email: credentials.email },
    confirmPasswordReset: {
      token: "demo-reset",
      password: credentials.password,
    },
    verifyEmail: { challengeId: "test-email-challenge", code: "123456" },
    resendVerification: { email: credentials.email },
    getSession: {},
    logout: {},
    getIdentity: {},
    updateProfile: { name: "Consumer" },
    changePassword: {
      currentPassword: "current-test-password",
      newPassword: credentials.password,
    },
    enrollMfa: { label: "Consumer authenticator" },
    verifyMfa: { enrollmentId: "test-enrollment", code: "123456" },
    revokeMfa: { factorId: "test-factor", code: "123456" },
    createOrganization: {
      name: "Consumer Workspace",
      slug: "consumer-workspace",
    },
    updateOrganization: {
      organizationId: "test-org",
      name: "Consumer Workspace",
      slug: "consumer-workspace",
    },
    switchOrganization: { organizationId: "test-org" },
    deleteOrganization: { organizationId: "test-org" },
    inviteMember: {
      organizationId: "test-org",
      email: "invitee@example.com",
      role: "member",
    },
    revokeInvitation: {
      organizationId: "test-org",
      invitationId: "test-invitation",
    },
    acceptInvitation: { token: "test-invitation-reference" },
    updateMemberRole: {
      organizationId: "test-org",
      memberId: "test-member",
      role: "admin",
    },
    removeMember: { organizationId: "test-org", memberId: "test-member" },
    revokeSession: { sessionId: "test-session" },
    revokeOtherSessions: {},
  };
  assert.equal(
    Object.keys(inputs).length,
    Object.keys(AUTH_WORKFLOW_ENDPOINTS).length,
  );
  const identity = await state(preview);
  const enrollment = await preview.enrollMfa({ label: "Test" });
  for (const [operation, endpoint] of Object.entries(AUTH_WORKFLOW_ENDPOINTS)) {
    const result = ["signIn", "signUp"].includes(operation)
      ? { kind: "session", session: identity.session }
      : operation === "getSession"
        ? { kind: "session", session: identity.session }
        : operation === "getIdentity"
          ? { kind: "identity", identity }
          : operation === "enrollMfa"
            ? enrollment
            : operation === "resendVerification"
              ? {
                  kind: "verification-required",
                  challengeId: "test-challenge",
                  email: credentials.email,
                }
              : { kind: "ok" };
    let called = false;
    const adapter = createAuthHttpAdapter({
      basePath: "/api/identity",
      origin,
      fetch: async (url, init) => {
        called = true;
        assert.equal(url, `${origin}/api/identity/${endpoint}`);
        assert.equal(init.method, "POST");
        assert.deepEqual(JSON.parse(init.body), inputs[operation]);
        return json(result);
      },
    });
    assert.deepEqual(await adapter[operation](inputs[operation]), result);
    assert.equal(called, true);
  }
});

test("unsafe HTTP paths or browser origin mismatches fail before sending credentials", async () => {
  for (const basePath of [
    "https://api.example.com/auth",
    "//api.example.com",
    "/api/../auth",
    "/api/%2e%2e/auth",
    "/api?query",
    "/api#hash",
    "/api/%2fescape",
    "/api\\auth",
    "/",
  ]) {
    assert.throws(() => createAuthHttpAdapter({ basePath, origin }), {
      code: "unsafe-url",
    });
  }
  const prior = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { origin } },
  });
  let calls = 0;
  try {
    const adapter = createAuthHttpAdapter({
      basePath: "/api/identity",
      origin: "https://another.example.com",
      fetch: async () => {
        calls++;
        return json({ kind: "ok" });
      },
    });
    await assert.rejects(
      adapter.requestPasswordReset({ email: credentials.email }),
      { code: "unsafe-url" },
    );
    assert.equal(calls, 0);
  } finally {
    if (prior) Object.defineProperty(globalThis, "window", prior);
    else delete globalThis.window;
  }
});

test("HTTP rejects HTML, empty/incomplete JSON, oversized reports and redirected responses", async () => {
  const responses = [
    new Response("<html>not an identity response</html>", {
      headers: { "content-type": "text/html" },
    }),
    new Response(null, { status: 204 }),
    new Response("{", { headers: { "content-type": "application/json" } }),
    json({ kind: "session" }),
    json({ kind: "session", session: null }),
    new Response("{}", {
      headers: {
        "content-type": "application/json",
        "content-length": "2000001",
      },
    }),
    new Response(`{"extra":"${"x".repeat(2_000_001)}"}`, {
      headers: { "content-type": "application/json" },
    }),
  ];
  for (const response of responses) {
    const adapter = createAuthHttpAdapter({
      basePath: "/api/identity",
      origin,
      fetch: async () => response,
    });
    await assert.rejects(adapter.signIn(credentials), {
      code: "invalid-response",
    });
  }
  const redirect = json({ kind: "ok" });
  Object.defineProperty(redirect, "redirected", { value: true });
  await assert.rejects(
    createAuthHttpAdapter({
      basePath: "/api/identity",
      origin,
      fetch: async () => redirect,
    }).requestPasswordReset({ email: credentials.email }),
    { code: "unsafe-url" },
  );
});

test("transport and callback errors expose safe actionable codes without provider text or credentials", async () => {
  const adapter = createAuthHttpAdapter({
    basePath: "/api/identity",
    origin,
    fetch: async () =>
      json(
        {
          error: {
            code: "rate-limited",
            retryAfterSeconds: 30,
            message: credentials.password,
            accessToken: "private-provider-token",
          },
        },
        { status: 429 },
      ),
  });
  await assert.rejects(adapter.signIn(credentials), (error) => {
    assert.equal(error.code, "rate-limited");
    assert.equal(error.retryAfterSeconds, 30);
    assert.ok(!String(error).includes(credentials.password));
    assert.ok(!JSON.stringify(error).includes("private-provider-token"));
    return true;
  });
  const callback = createBetterAuthWorkflowAdapter(
    callbackOptions({
      signIn: async () => {
        throw new Error(`internal provider text ${credentials.password}`);
      },
    }),
  );
  await assert.rejects(callback.signIn(credentials), (error) => {
    assert.equal(error.code, "network");
    assert.ok(!String(error).includes(credentials.password));
    assert.ok(
      !authWorkflowErrorMessage(error, "es").includes(credentials.password),
    );
    return true;
  });
  const domainFailure = new AuthWorkflowError("invalid-credentials");
  domainFailure.password = credentials.password;
  const domainCallback = createBetterAuthWorkflowAdapter(
    callbackOptions({
      signIn: () => {
        throw domainFailure;
      },
    }),
  );
  await assert.rejects(domainCallback.signIn(credentials), (error) => {
    assert.equal(error.code, "invalid-credentials");
    assert.ok(!JSON.stringify(error).includes(credentials.password));
    return true;
  });
  let calls = 0;
  const csrf = createAuthHttpAdapter({
    basePath: "/api/identity",
    origin,
    csrfToken: () => "unsafe\n",
    fetch: async () => {
      calls++;
      return json({ kind: "ok" });
    },
  });
  await assert.rejects(
    csrf.requestPasswordReset({ email: credentials.email }),
    { code: "invalid-request" },
  );
  assert.equal(calls, 0);
});

test("already aborted requests do not invoke a callback or send an HTTP body", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  const callback = createBetterAuthWorkflowAdapter(
    callbackOptions({
      signIn: async () => {
        calls++;
        return null;
      },
    }),
  );
  const http = createAuthHttpAdapter({
    basePath: "/api/identity",
    origin,
    fetch: async () => {
      calls++;
      return json({ kind: "ok" });
    },
  });
  for (const adapter of [callback, http]) {
    await assert.rejects(
      adapter.signIn(credentials, { signal: controller.signal }),
      { code: "aborted" },
    );
  }
  assert.equal(calls, 0);
});

test("cancellation releases the single-flight guard even when a consumer ignores AbortSignal", async () => {
  const session = (await mock().getSession({})).session;
  let finish, started;
  const entered = new Promise((resolve) => {
    started = resolve;
  });
  const deferred = new Promise((resolve) => {
    finish = resolve;
  });
  const adapter = createBetterAuthWorkflowAdapter(
    callbackOptions({
      signIn: async () => {
        started();
        return await deferred;
      },
    }),
  );
  const controller = new AbortController();
  const runner = createAuthWorkflowRunner();
  const pending = runner.run(adapter, "signIn", credentials, {
    signal: controller.signal,
  });
  await entered;
  assert.equal(runner.pending, true);
  assert.equal(await runner.run(adapter, "signIn", credentials), null);
  controller.abort();
  await assert.rejects(pending, { code: "aborted" });
  assert.equal(runner.pending, false);
  assert.equal(
    (await runner.run(mock(), "signIn", credentials)).kind,
    "session",
  );
  finish({ kind: "session", session });
  await Promise.resolve();
  assert.equal(runner.pending, false);
});

test("mock cancellation prevents mutations and failed requests remain retryable", async () => {
  const adapter = mock({ delayMs: 30 });
  const controller = new AbortController();
  const pending = adapter.updateProfile(
    { name: "Must not be applied" },
    { signal: controller.signal },
  );
  controller.abort();
  await assert.rejects(pending, { code: "aborted" });
  assert.equal((await state(adapter)).session.user.name, "Alex Morgan");
  const runner = createAuthWorkflowRunner();
  const invalid = { ...adapter, getSession: async () => undefined };
  await assert.rejects(runner.run(invalid, "getSession", {}), {
    code: "invalid-response",
  });
  assert.equal(runner.pending, false);
  assert.equal((await runner.run(adapter, "getSession", {})).kind, "session");
});

test("passwords, tokens and enrollment keys never touch browser persistence in a full lifecycle", async () => {
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const priorDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  let accesses = 0;
  const blockedStorage = () => {
    accesses++;
    throw new Error("Persistence is forbidden");
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { origin },
      get localStorage() {
        return blockedStorage();
      },
      get sessionStorage() {
        return blockedStorage();
      },
      get indexedDB() {
        return blockedStorage();
      },
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      get cookie() {
        return blockedStorage();
      },
      set cookie(_) {
        blockedStorage();
      },
    },
  });
  try {
    const adapter = mock({ signedIn: false });
    await adapter.signIn(credentials);
    await adapter.changePassword({
      currentPassword: credentials.password,
      newPassword: "new-test-password",
    });
    const enrollment = await adapter.enrollMfa({
      label: "Temporary setup",
      password: credentials.password,
    });
    await adapter.verifyMfa({
      enrollmentId: enrollment.enrollmentId,
      code: "123456",
    });
    const visible = JSON.stringify(await state(adapter));
    assert.ok(!visible.includes(credentials.password));
    assert.ok(!visible.includes("new-test-password"));
    assert.ok(!visible.includes(enrollment.secret));
    await adapter.confirmPasswordReset({
      token: "demo-reset",
      password: credentials.password,
    });
    await adapter.verifyEmail({ token: "demo-email" });
    await adapter.acceptInvitation({ token: "demo-invitation" });
    await adapter.logout({});
    const http = createAuthHttpAdapter({
      basePath: "/api/identity",
      fetch: async () =>
        json({
          kind: "session",
          session: (await mock().getSession({})).session,
          accessToken: "private-provider-token",
        }),
    });
    const output = await http.signIn(credentials);
    assert.ok(!JSON.stringify(output).includes("private-provider-token"));
    assert.equal(accesses, 0);
  } finally {
    if (priorWindow) Object.defineProperty(globalThis, "window", priorWindow);
    else delete globalThis.window;
    if (priorDocument)
      Object.defineProperty(globalThis, "document", priorDocument);
    else delete globalThis.document;
  }
});
