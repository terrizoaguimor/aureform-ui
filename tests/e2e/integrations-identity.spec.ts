import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";
import {
  DEMO_AUTH_SESSION_KEY,
  type DemoAuthSession,
} from "../../src/lib/demo-auth";

type Locale = "en" | "es";
type StorageWrite = { key: string; value: string };
const currentPassword = "IdentityCurrent!2026";
const newPassword = "IdentityChanged!2026";
const differentPassword = "IdentityMismatch!2026";
const setupKey = "JBSWY3DPEHPK3PXP";
const privateValues = [
  currentPassword,
  newPassword,
  differentPassword,
  setupKey,
  "bad-identity-invitation",
  "demo-invitation",
  "DEMO-RECOVERY",
];
const supplied = process.env.AUREFORM_BASE_URL;
const mount = supplied ? new URL(supplied).pathname.replace(/\/+$/, "") : "";
const route = (path: string, locale: Locale = "en") =>
  `${mount}/${locale}/${path}/`;

// Each case uses the actual application frontend. Interception observes the local
// boundary without replacing identity responses or enabling a provider account.
const test = base.extend<{ identityBoundary: void }>({
  identityBoundary: [
    async ({ context, page, baseURL }, use, info) => {
      const origin = new URL(baseURL ?? supplied ?? "http://127.0.0.1:3124")
        .origin;
      const external: string[] = [];
      const consumerRequests: string[] = [];
      const errors: string[] = [];
      const resourceErrors: { message: string; url: string }[] = [];
      const writes: StorageWrite[] = [];
      await context.route(/^https?:\/\//, async (request) => {
        const url = new URL(request.request().url());
        if (url.origin !== origin) {
          external.push(`${url.origin}${url.pathname}`);
          await request.abort("blockedbyclient");
          return;
        }
        if (
          url.pathname.startsWith("/api/") ||
          (!["GET", "HEAD"].includes(request.request().method()) &&
            !/^\/(?:__nextjs_|_next\/)/.test(url.pathname))
        ) {
          consumerRequests.push(
            `${request.request().method()} ${url.pathname}`,
          );
        }
        await request.continue();
      });
      await context.routeWebSocket(/.*/, (socket) => {
        const url = new URL(socket.url());
        const socketOrigin = url.origin.replace(/^ws/, "http");
        if (socketOrigin !== origin) {
          external.push(`${url.origin}${url.pathname}`);
          socket.close({ code: 1008, reason: "External identity traffic" });
          return;
        }
        socket.connectToServer();
      });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        if (message.text().startsWith("Failed to load resource:")) {
          resourceErrors.push({
            message: message.text(),
            url: message.location().url,
          });
        } else errors.push(message.text());
      });
      await context.exposeBinding(
        "__aureformIdentityStorageWrite",
        (_source, entry: StorageWrite) => writes.push(entry),
      );
      await context.addInitScript(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          original.call(this, key, value);
          void (
            window as typeof window & {
              __aureformIdentityStorageWrite: (
                entry: StorageWrite,
              ) => Promise<unknown>;
            }
          ).__aureformIdentityStorageWrite({
            key: String(key),
            value: String(value),
          });
        };
      });
      await use();
      await info.attach("identity-boundary", {
        body: JSON.stringify({
          external,
          consumerRequests,
          errors,
          resourceErrors,
          storageKeys: [...new Set(writes.map((entry) => entry.key))],
        }),
        contentType: "application/json",
      });
      expect
        .soft(external, "Local identity never contacts a provider")
        .toEqual([]);
      expect
        .soft(consumerRequests, "Mock workflows do not call consumer APIs")
        .toEqual([]);
      expect.soft(errors, "No browser or hydration errors").toEqual([]);
      const sensitiveWrites = writes.filter(
        (entry) =>
          privateValues.some((value) => entry.value.includes(value)) ||
          /"(?:password|currentPassword|newPassword|verificationToken|resetToken|secret|otpauthUri|accessToken|refreshToken|code)"\s*:/i.test(
            entry.value,
          ),
      );
      expect
        .soft(
          sensitiveWrites.map((entry) => entry.key),
          "Passwords, codes, invitation references and MFA keys are never persisted",
        )
        .toEqual([]);
      expect
        .soft(
          (await context.cookies()).filter((cookie) =>
            /session|token|^auth/i.test(cookie.name),
          ),
          "The local preview creates no identity/session cookies",
        )
        .toEqual([]);
      expect
        .soft(context.pages(), "Mock OAuth does not open a popup")
        .toHaveLength(1);
    },
    { auto: true },
  ],
});

function identity(page: Page) {
  return page.locator('[data-integration-domain="identity"]');
}

function identityCard(domain: Locator, title: string) {
  return domain
    .locator("section")
    .filter({
      has: domain.page().getByRole("heading", { name: title, exact: true }),
    })
    .last();
}

async function idle(domain: Locator) {
  await expect(domain.locator("section[aria-busy]").first()).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

async function tab(domain: Locator, name: string) {
  const trigger = domain.getByRole("tab", { name, exact: true });
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-selected", "true");
}

async function select(page: Page, control: Locator, name: string) {
  await control.click();
  await page.getByRole("option", { name, exact: true }).click();
}

async function activate(
  page: Page,
  recipe = "better-auth",
  locale: Locale = "en",
  provider?: string,
) {
  const workbench = page.locator(`[data-integration-workbench="${recipe}"]`);
  if (provider) {
    await workbench
      .getByRole("tab", {
        name: locale === "es" ? "Conexión" : "Connection",
        exact: true,
      })
      .click();
    await select(
      page,
      workbench.getByRole("combobox", {
        name: locale === "es" ? "Proveedor" : "Provider choice",
        exact: true,
      }),
      provider,
    );
    await workbench
      .getByRole("button", {
        name:
          locale === "es"
            ? /^(Conectar demo local|Guardar configuración)$/
            : /^(Connect local demo|Save configuration)$/,
      })
      .click();
  } else {
    const start = workbench.getByRole("button", {
      name: locale === "es" ? "Iniciar demo local" : "Start local demo",
      exact: true,
    });
    // Wait for the connection read before deciding whether activation is needed.
    const readyStart = start.and(page.locator("button:enabled"));
    await expect(readyStart.or(identity(page))).toBeVisible();
    if (await readyStart.isVisible()) await readyStart.click();
  }
  const domain = identity(page);
  await expect(
    domain.getByRole("heading", {
      name: locale === "es" ? "Identidad y acceso" : "Identity & access",
      exact: true,
    }),
  ).toBeVisible();
  await idle(domain);
  return domain;
}

async function openIdentity(
  page: Page,
  recipe = "better-auth",
  locale: Locale = "en",
  provider?: string,
) {
  const response = await page.goto(route(`integrations/${recipe}`, locale));
  expect(response?.status()).toBe(200);
  await expect(page.locator("[data-integration-hub]")).toHaveAttribute(
    "data-integration-mode",
    "demo",
  );
  return activate(page, recipe, locale, provider);
}

async function demoSession(page: Page): Promise<DemoAuthSession | null> {
  return page.evaluate((key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }, DEMO_AUTH_SESSION_KEY);
}

function expectDisplayProfile(
  session: DemoAuthSession | null,
  provider: DemoAuthSession["provider"],
) {
  expect(session).toMatchObject({ version: 1, demo: true, provider });
  expect(Object.keys(session!).sort()).toEqual(
    ["createdAt", "demo", "email", "name", "provider", "version"].sort(),
  );
  expect(new Date(session!.createdAt).toISOString()).toBe(session!.createdAt);
}

async function confirm(page: Page, title: string, label: string) {
  const dialog = page.getByRole("dialog", { name: title, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(label);
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

async function rename(domain: Locator, name: string) {
  await domain.getByLabel("Full name", { exact: true }).fill(name);
  await domain
    .getByRole("button", { name: "Save profile", exact: true })
    .click();
  await idle(domain);
  await expect(domain.getByText(name, { exact: true })).toBeVisible();
}

async function signOut(page: Page, domain: Locator) {
  await domain.getByRole("button", { name: "Sign out", exact: true }).click();
  await confirm(page, "Sign out of this account?", "alex.morgan@example.com");
  await expect(
    domain.getByRole("heading", {
      name: "Sign in to manage your account",
      exact: true,
    }),
  ).toBeVisible();
}

async function pauseTimers(page: Page) {
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

async function enterOtp(input: Locator, value: string) {
  // The OTP input virtualizes its selection; replace the code as a keyboard user.
  await input.focus();
  await input.press("ControlOrMeta+A");
  await input.press("Backspace");
  await expect(input).toHaveValue("");
  await input.pressSequentially(value, { delay: 40 });
  await expect(input).toHaveValue(value);
}

const recipes = [
  { recipe: "better-auth", provider: "Better Auth" },
  { recipe: "clerk", provider: "Clerk" },
  { recipe: "supabase-auth", provider: "Supabase Auth" },
  { recipe: "authjs-nextauth", provider: "Auth.js / NextAuth" },
  { recipe: "enterprise-identity", provider: "WorkOS" },
  {
    recipe: "enterprise-identity",
    provider: "Auth0",
    choice: "Auth0",
  },
] as const;

for (const provider of recipes) {
  test(`${provider.provider}: the Hub opens a separate local identity with all four real auth links`, async ({
    page,
  }) => {
    const domain = await openIdentity(
      page,
      provider.recipe,
      "en",
      "choice" in provider ? provider.choice : undefined,
    );
    await expect(
      domain.getByText("Separate local demo", { exact: true }),
    ).toBeVisible();
    await expect(domain).toContainText("Changes disappear when you leave");
    await expect(domain).toContainText(
      "no emails or server sessions are created",
    );
    await expect(domain.getByLabel("Full name", { exact: true })).toHaveValue(
      "Alex Morgan",
    );
    await expect(domain.getByLabel("Email", { exact: true })).toHaveValue(
      "alex.morgan@example.com",
    );
    await expect(domain.getByLabel("Email", { exact: true })).toHaveAttribute(
      "readonly",
      "",
    );
    await expect(
      domain.getByText("Verified email", { exact: true }),
    ).toBeVisible();
    await expect(domain).toContainText("3 active sessions");
    for (const [name, path] of [
      ["Sign in", "sign-in"],
      ["Create account", "sign-up"],
      ["Recover account", "reset-password"],
      ["Verify code", "verify"],
    ]) {
      await expect(
        domain.getByRole("link", { name, exact: true }),
      ).toHaveAttribute("href", route(`auth/${path}`));
    }
    expect(await demoSession(page)).toBeNull();
  });
}

test("profile, refresh, logout and password sign-in change memory without overwriting a persisted AuthTemplate profile", async ({
  page,
}) => {
  await page.goto(route("auth/sign-in"));
  const main = page.getByRole("main");
  await main
    .getByLabel("Email", { exact: true })
    .fill("route-profile@example.com");
  await main.getByLabel("Password", { exact: true }).fill(currentPassword);
  await main
    .getByRole("button", { name: "Sign in to demo", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${route("dashboard")}$`));
  const persisted = await demoSession(page);
  expectDisplayProfile(persisted, "email");
  expect(persisted!.email).toBe("route-profile@example.com");

  let domain = await openIdentity(page);
  await expect(domain.getByLabel("Email", { exact: true })).toHaveValue(
    "alex.morgan@example.com",
  );
  await rename(domain, "Identity profile QA");
  await domain
    .getByRole("button", { name: "Refresh session", exact: true })
    .click();
  await expect(domain.getByRole("status")).toContainText(
    "Account details refreshed.",
  );
  await expect(domain.getByLabel("Full name", { exact: true })).toHaveValue(
    "Identity profile QA",
  );
  await tab(domain, "Team");
  await expect(
    identityCard(domain, "Members")
      .getByRole("listitem")
      .filter({ hasText: "alex.morgan@example.com" }),
  ).toContainText("Identity profile QA");

  await domain.getByRole("button", { name: "Sign out", exact: true }).click();
  const review = page.getByRole("dialog", {
    name: "Sign out of this account?",
    exact: true,
  });
  await expect(review).toContainText("alex.morgan@example.com");
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    domain.getByRole("tab", { name: "Team", exact: true }),
  ).toBeVisible();
  await signOut(page, domain);
  await expect(
    domain.getByRole("tablist", { name: "Identity settings" }),
  ).toHaveCount(0);
  await expect(domain).not.toContainText("Sam Rivera");
  expect(await demoSession(page)).toEqual(persisted);
  await domain
    .getByLabel("Email", { exact: true })
    .fill("identity-return@example.com");
  await domain.getByLabel("Password", { exact: true }).fill(currentPassword);
  await domain.getByRole("button", { name: "Sign in", exact: true }).click();
  await idle(domain);
  await expect(
    domain.getByText("Identity profile QA", { exact: true }),
  ).toBeVisible();
  await tab(domain, "Profile");
  await expect(domain.getByLabel("Email", { exact: true })).toHaveValue(
    "identity-return@example.com",
  );
  await expect(domain).toContainText("1 active sessions");
  expect(await demoSession(page)).toEqual(persisted);

  await page.reload();
  domain = await activate(page);
  await expect(domain.getByLabel("Full name", { exact: true })).toHaveValue(
    "Alex Morgan",
  );
  await expect(domain).toContainText("3 active sessions");
  expect(await demoSession(page)).toEqual(persisted);
});

test("password mismatches clear every sensitive input and a valid retry completes only a local preview", async ({
  page,
}) => {
  const domain = await openIdentity(page);
  await tab(domain, "Security");
  const password = identityCard(domain, "Change password");
  await password
    .getByLabel("Current password", { exact: true })
    .fill(currentPassword);
  await password.getByLabel("New password", { exact: true }).fill(newPassword);
  await password
    .getByLabel("Confirm new password", { exact: true })
    .fill(differentPassword);
  await password
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect(
    password.getByText("Passwords must match.", { exact: true }),
  ).toBeVisible();
  await expect(password.locator('input[type="password"]')).toHaveCount(3);
  for (const input of await password.locator('input[type="password"]').all())
    await expect(input).toHaveValue("");
  expect(await demoSession(page)).toBeNull();
  await password
    .getByLabel("Current password", { exact: true })
    .fill(currentPassword);
  await password.getByLabel("New password", { exact: true }).fill(newPassword);
  await password
    .getByLabel("Confirm new password", { exact: true })
    .fill(newPassword);
  await password
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect(domain.getByRole("status")).toContainText(
    "Local preview updated.",
  );
  await expect(
    password.getByText("Passwords must match.", { exact: true }),
  ).toHaveCount(0);
  for (const input of await password.locator('input[type="password"]').all())
    await expect(input).toHaveValue("");
  await tab(domain, "Profile");
  await expect(domain.getByLabel("Full name", { exact: true })).toHaveValue(
    "Alex Morgan",
  );
});

test("MFA setup keys disappear on cancel and navigation; invalid codes retry, login challenges and reviewed revocation work", async ({
  page,
}) => {
  const domain = await openIdentity(page);
  await tab(domain, "Security");
  const mfa = identityCard(domain, "Multi-factor authentication");
  const enroll = async () => {
    await mfa
      .getByLabel("Authenticator name", { exact: true })
      .fill("QA authenticator");
    await mfa
      .getByLabel("Current password, if required", { exact: true })
      .fill(currentPassword);
    await mfa
      .getByRole("button", { name: "Set up authenticator", exact: true })
      .click();
    await expect(mfa.getByText(setupKey, { exact: true })).toBeVisible();
  };
  await enroll();
  await expect(mfa).toContainText("SHA1");
  await expect(mfa).toContainText("30 seconds");
  await mfa.getByRole("button", { name: "Cancel setup", exact: true }).click();
  await expect(mfa.getByText(setupKey, { exact: true })).toHaveCount(0);
  await expect(
    domain.getByText("MFA available", { exact: true }),
  ).toBeVisible();
  await enroll();
  await tab(domain, "Profile");
  await expect(domain.getByText(setupKey, { exact: true })).toHaveCount(0);
  await tab(domain, "Security");
  await expect(
    mfa.getByLabel("Authenticator code", { exact: true }),
  ).toHaveCount(0);
  await enroll();
  await mfa.getByLabel("Authenticator code", { exact: true }).fill("000000");
  await mfa.getByRole("button", { name: "Enable MFA", exact: true }).click();
  await expect(domain.getByRole("alert")).toContainText(
    "The code could not be verified. Check it and try again.",
  );
  await expect(
    mfa.getByLabel("Authenticator code", { exact: true }),
  ).toHaveValue("");
  await expect(mfa.getByText(setupKey, { exact: true })).toBeVisible();
  await mfa.getByLabel("Authenticator code", { exact: true }).fill("123456");
  await mfa.getByRole("button", { name: "Enable MFA", exact: true }).click();
  await expect(
    mfa.getByText("QA authenticator", { exact: true }),
  ).toBeVisible();
  await expect(domain.getByText("MFA enabled", { exact: true })).toBeVisible();
  await expect(domain.getByText(setupKey, { exact: true })).toHaveCount(0);

  await signOut(page, domain);
  await domain.getByLabel("Password", { exact: true }).fill(currentPassword);
  await domain.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    domain.getByRole("heading", {
      name: "Complete your security check",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    domain.getByRole("tablist", { name: "Identity settings" }),
  ).toHaveCount(0);
  await domain.getByLabel("Verification code", { exact: true }).fill("000000");
  await domain.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(domain.getByRole("alert")).toContainText(
    "The code could not be verified.",
  );
  await expect(
    domain.getByLabel("Verification code", { exact: true }),
  ).toHaveValue("");
  await domain
    .getByLabel("Verification code", { exact: true })
    .fill("DEMO-RECOVERY");
  await domain.getByRole("button", { name: "Verify", exact: true }).click();
  await tab(domain, "Profile");
  await expect(
    domain.getByRole("heading", { name: "Your profile", exact: true }),
  ).toBeVisible();
  await expect(domain).toContainText("1 active sessions");
  await expect(domain.getByText("MFA enabled", { exact: true })).toBeVisible();
  await tab(domain, "Security");

  await mfa.getByRole("button", { name: "Remove", exact: true }).click();
  const review = page.getByRole("dialog", {
    name: "Remove this authenticator?",
    exact: true,
  });
  await expect(review).toContainText("QA authenticator");
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    mfa.getByText("QA authenticator", { exact: true }),
  ).toBeVisible();
  await mfa.getByRole("button", { name: "Remove", exact: true }).click();
  await review
    .getByLabel("Authenticator code, if required", { exact: true })
    .fill("000000");
  await review.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(review.getByRole("alert")).toContainText(
    "The code could not be verified.",
  );
  await expect(
    review.getByLabel("Authenticator code, if required", { exact: true }),
  ).toHaveValue("");
  await review
    .getByLabel("Authenticator code, if required", { exact: true })
    .fill("123456");
  await review.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(review).not.toBeVisible();
  await expect(
    domain.getByText("MFA available", { exact: true }),
  ).toBeVisible();
  await expect(mfa.getByText("QA authenticator", { exact: true })).toHaveCount(
    0,
  );
  expect(await demoSession(page)).toBeNull();
});

test("organization creation, conflicts, updates, switching, member roles and reviewed deletion change actual account data", async ({
  page,
}) => {
  const domain = await openIdentity(page);
  await tab(domain, "Team");
  const members = identityCard(domain, "Members");
  await expect(members.getByRole("listitem")).toHaveCount(3);
  await expect(
    members.getByRole("button", { name: "Remove Alex Morgan", exact: true }),
  ).toBeDisabled();
  const samRole = members.getByRole("combobox", {
    name: "Role for Sam Rivera",
    exact: true,
  });
  await expect(samRole).toContainText("Admin");
  await select(page, samRole, "Member");
  await idle(domain);
  await expect(samRole).toContainText("Member");
  await members
    .getByRole("button", { name: "Remove Jordan Lee", exact: true })
    .click();
  let review = page.getByRole("dialog", {
    name: "Confirm access change",
    exact: true,
  });
  await expect(review).toContainText("Jordan Lee");
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(members.getByRole("listitem")).toHaveCount(3);
  await members
    .getByRole("button", { name: "Remove Jordan Lee", exact: true })
    .click();
  await confirm(page, "Confirm access change", "Jordan Lee");
  await expect(members.getByRole("listitem")).toHaveCount(2);
  await domain
    .getByRole("button", { name: "Refresh session", exact: true })
    .click();
  await idle(domain);
  await expect(samRole).toContainText("Member");
  await expect(members).not.toContainText("Jordan Lee");

  const create = identityCard(domain, "Create a workspace");
  await create
    .getByLabel("Organization name", { exact: true })
    .fill("Identity QA Lab");
  await create
    .getByLabel("Unique slug", { exact: true })
    .fill("aureform-studio");
  await create
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(domain.getByRole("alert")).toContainText(
    "This record changed or already exists. Refresh and try again.",
  );
  await expect(
    identityCard(domain, "Workspace").getByLabel("Organization name", {
      exact: true,
    }),
  ).toHaveValue("Aureform Studio");
  await domain
    .getByRole("button", { name: "Reload account", exact: true })
    .click();
  await idle(domain);
  await expect(domain.getByRole("alert")).toHaveCount(0);
  await create
    .getByLabel("Unique slug", { exact: true })
    .fill("identity-qa-lab");
  await create
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await idle(domain);
  const workspace = identityCard(domain, "Workspace");
  await expect(
    workspace.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Identity QA Lab");
  await expect(members.getByRole("listitem")).toHaveCount(1);
  await expect(members).not.toContainText("Sam Rivera");
  await workspace
    .getByLabel("Organization name", { exact: true })
    .fill("Identity Lab renamed");
  await workspace
    .getByLabel("Organization slug", { exact: true })
    .fill("identity-lab-renamed");
  await workspace
    .getByRole("button", { name: "Save workspace", exact: true })
    .click();
  await idle(domain);
  const organizations = workspace.getByRole("combobox", {
    name: "Active organization",
    exact: true,
  });
  await expect(organizations).toContainText("Identity Lab renamed");
  await select(page, organizations, "Aureform Studio");
  await idle(domain);
  await expect(members.getByRole("listitem")).toHaveCount(2);
  await expect(samRole).toContainText("Member");
  await select(page, organizations, "Identity Lab renamed");
  await idle(domain);
  await expect(
    workspace.getByLabel("Organization slug", { exact: true }),
  ).toHaveValue("identity-lab-renamed");
  await workspace.getByRole("button", { name: "Delete", exact: true }).click();
  review = page.getByRole("dialog", {
    name: "Delete this workspace?",
    exact: true,
  });
  await expect(review).toContainText("Identity Lab renamed");
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(organizations).toContainText("Identity Lab renamed");
  await workspace.getByRole("button", { name: "Delete", exact: true }).click();
  await confirm(page, "Delete this workspace?", "Identity Lab renamed");
  await expect(organizations).toContainText("Aureform Studio");
  await organizations.click();
  await expect(
    page.getByRole("option", { name: "Identity Lab renamed", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  expect(await demoSession(page)).toBeNull();
});

test("invitation conflicts retry, revocation needs review, and accepting a reference applies real read-only membership", async ({
  page,
}) => {
  const domain = await openIdentity(page);
  await tab(domain, "Team");
  const invitations = identityCard(domain, "Invite a teammate");
  await expect(invitations.getByRole("listitem")).toHaveCount(1);
  await invitations
    .getByLabel("Email", { exact: true })
    .fill("sam@example.com");
  await invitations
    .getByRole("button", { name: "Invite member", exact: true })
    .click();
  await expect(domain.getByRole("alert")).toContainText(
    "This record changed or already exists.",
  );
  await expect(invitations.getByRole("listitem")).toHaveCount(1);
  await invitations
    .getByLabel("Email", { exact: true })
    .fill("identity-invite@example.com");
  await select(
    page,
    invitations.getByRole("combobox", { name: "Role", exact: true }),
    "Admin",
  );
  await invitations
    .getByRole("button", { name: "Invite member", exact: true })
    .click();
  await idle(domain);
  const invited = invitations.getByRole("listitem").filter({
    hasText: "identity-invite@example.com",
  });
  await expect(invited).toContainText("Admin");
  await expect(invitations.getByRole("listitem")).toHaveCount(2);
  await domain
    .getByRole("button", { name: "Refresh session", exact: true })
    .click();
  await idle(domain);
  await expect(invited).toBeVisible();
  await invited.getByRole("button", { name: "Revoke", exact: true }).click();
  const review = page.getByRole("dialog", {
    name: "Confirm access change",
    exact: true,
  });
  await expect(review).toContainText("identity-invite@example.com");
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(invited).toBeVisible();
  await invited.getByRole("button", { name: "Revoke", exact: true }).click();
  await confirm(page, "Confirm access change", "identity-invite@example.com");
  await expect(invited).toHaveCount(0);
  await expect(invitations.getByRole("listitem")).toHaveCount(1);

  const acceptance = identityCard(domain, "Accept an invitation");
  await acceptance
    .getByLabel("Invitation reference", { exact: true })
    .fill("bad-identity-invitation");
  await acceptance
    .getByRole("button", { name: "Accept invitation", exact: true })
    .click();
  await expect(domain.getByRole("alert")).toContainText(
    "This challenge or session has expired. Request a new one.",
  );
  await expect(
    acceptance.getByLabel("Invitation reference", { exact: true }),
  ).toHaveValue("");
  await acceptance
    .getByLabel("Invitation reference", { exact: true })
    .fill("demo-invitation");
  await acceptance
    .getByRole("button", { name: "Accept invitation", exact: true })
    .click();
  await idle(domain);
  const workspace = identityCard(domain, "Workspace");
  await expect(
    workspace.getByLabel("Organization name", { exact: true }),
  ).toHaveValue("Design Partners");
  await expect(
    workspace.getByLabel("Organization name", { exact: true }),
  ).toBeDisabled();
  await expect(
    workspace.getByRole("button", { name: "Save workspace", exact: true }),
  ).toBeDisabled();
  await expect(
    workspace.getByRole("button", { name: "Delete", exact: true }),
  ).toHaveCount(0);
  await expect(
    invitations.getByRole("button", { name: "Invite member", exact: true }),
  ).toBeDisabled();
  const members = identityCard(domain, "Members");
  await expect(members.getByRole("listitem")).toHaveCount(2);
  await expect(members).toContainText("Taylor Chen");
  await expect(
    members.getByRole("button", { name: "Remove Taylor Chen", exact: true }),
  ).toBeDisabled();
  await expect(
    members.getByRole("button", { name: "Remove Alex Morgan", exact: true }),
  ).toBeDisabled();
  await expect(
    acceptance.getByLabel("Invitation reference", { exact: true }),
  ).toHaveValue("");
  await select(
    page,
    workspace.getByRole("combobox", {
      name: "Active organization",
      exact: true,
    }),
    "Aureform Studio",
  );
  await idle(domain);
  await expect(
    invitations.getByRole("button", { name: "Invite member", exact: true }),
  ).toBeEnabled();
  await expect(invitations.getByRole("listitem")).toHaveCount(1);
  await expect(invited).toHaveCount(0);
});

test("reviewed device and current-session revocation refresh actual session counts and remove private account UI", async ({
  page,
}) => {
  const domain = await openIdentity(page);
  await tab(domain, "Sessions");
  const sessions = identityCard(domain, "Active sessions");
  await expect(sessions.getByRole("listitem")).toHaveCount(3);
  const laptop = sessions
    .getByRole("listitem")
    .filter({ hasText: "Safari · MacBook" });
  await laptop
    .getByRole("button", { name: "Revoke session", exact: true })
    .click();
  let review = page.getByRole("dialog", {
    name: "Confirm access change",
    exact: true,
  });
  await expect(review).toContainText("Safari · MacBook");
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(laptop).toBeVisible();
  await laptop
    .getByRole("button", { name: "Revoke session", exact: true })
    .click();
  await confirm(page, "Confirm access change", "Safari · MacBook");
  await expect(laptop).toHaveCount(0);
  await expect(sessions.getByRole("listitem")).toHaveCount(2);
  await expect(domain).toContainText("2 active sessions");
  await domain
    .getByRole("button", { name: "Refresh session", exact: true })
    .click();
  await idle(domain);
  await expect(laptop).toHaveCount(0);
  await sessions
    .getByRole("button", { name: "Sign out other devices", exact: true })
    .click();
  review = page.getByRole("dialog", {
    name: "Confirm access change",
    exact: true,
  });
  await expect(review).toContainText("All other sessions");
  await review.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(sessions.getByRole("listitem")).toHaveCount(2);
  await sessions
    .getByRole("button", { name: "Sign out other devices", exact: true })
    .click();
  await confirm(page, "Confirm access change", "All other sessions");
  await expect(sessions.getByRole("listitem")).toHaveCount(1);
  await expect(sessions).toContainText("This session");
  await expect(
    sessions.getByRole("button", {
      name: "Sign out other devices",
      exact: true,
    }),
  ).toBeDisabled();
  await sessions
    .getByRole("button", { name: "Revoke session", exact: true })
    .click();
  await confirm(page, "Confirm access change", "Chrome · This browser");
  await expect(
    domain.getByRole("heading", {
      name: "Sign in to manage your account",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    domain.getByRole("tablist", { name: "Identity settings" }),
  ).toHaveCount(0);
  await expect(sessions).toHaveCount(0);
  await domain
    .getByRole("button", { name: "Refresh session", exact: true })
    .click();
  await idle(domain);
  await expect(
    domain.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
  expect(await demoSession(page)).toBeNull();
});

test("cancelling a pending profile change prevents late mutation, releases the guard and preserves a retryable draft", async ({
  page,
}) => {
  const domain = await openIdentity(page);
  await pauseTimers(page);
  const name = domain.getByLabel("Full name", { exact: true });
  await name.fill("Cancelled identity draft");
  await domain
    .getByRole("button", { name: "Save profile", exact: true })
    .click();
  await expect(name).toBeDisabled();
  await expect(
    domain.getByRole("button", { name: "Refresh session", exact: true }),
  ).toBeDisabled();
  await domain.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(domain.getByRole("status")).toContainText("Request cancelled.");
  await page.clock.runFor(2000);
  await expect(domain.getByText("Alex Morgan", { exact: true })).toBeVisible();
  await expect(
    domain.getByText("Cancelled identity draft", { exact: true }),
  ).toHaveCount(0);
  await expect(name).toBeEnabled();
  await expect(name).toHaveValue("Cancelled identity draft");
  await domain
    .getByRole("button", { name: "Save profile", exact: true })
    .click();
  await page.clock.runFor(1500);
  await expect(
    domain.getByText("Cancelled identity draft", { exact: true }),
  ).toBeVisible();
  await expect(domain.getByRole("status")).toContainText(
    "Local preview updated.",
  );
  expect(await demoSession(page)).toBeNull();
  await page.clock.resume();
});

test("changing the selected provider and Hub workspace discards prior identity state and temporary enrollment", async ({
  page,
}) => {
  let domain = await openIdentity(page, "enterprise-identity");
  await rename(domain, "WorkOS-only profile");
  domain = await activate(page, "enterprise-identity", "en", "Auth0");
  await expect(domain.getByText("Auth0", { exact: true })).toBeVisible();
  await expect(domain.getByLabel("Full name", { exact: true })).toHaveValue(
    "Alex Morgan",
  );
  await expect(domain).not.toContainText("WorkOS-only profile");
  await rename(domain, "Studio-only Auth0 identity");
  await tab(domain, "Security");
  await domain
    .getByRole("button", { name: "Set up authenticator", exact: true })
    .click();
  await expect(domain.getByText(setupKey, { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: /^Aureform Studio\s+Aureform$/ })
    .click();
  await page
    .getByRole("menuitem", { name: "Personal space", exact: true })
    .click();
  domain = await activate(page, "enterprise-identity");
  await expect(domain.getByLabel("Full name", { exact: true })).toHaveValue(
    "Alex Morgan",
  );
  await expect(
    domain.getByText("MFA available", { exact: true }),
  ).toBeVisible();
  await expect(domain.getByText(setupKey, { exact: true })).toHaveCount(0);
  await expect(domain).not.toContainText("Studio-only Auth0 identity");
  await page
    .getByRole("button", { name: /^Personal space\s+Personal$/ })
    .click();
  await page
    .getByRole("menuitem", { name: "Aureform Studio", exact: true })
    .click();
  domain = await activate(page, "enterprise-identity");
  await expect(domain.getByText("Auth0", { exact: true })).toBeVisible();
  await expect(domain.getByLabel("Full name", { exact: true })).toHaveValue(
    "Alex Morgan",
  );
  await expect(domain.getByText(setupKey, { exact: true })).toHaveCount(0);
  await expect(domain).not.toContainText("Studio-only Auth0 identity");
  expect(await demoSession(page)).toBeNull();
});

test("Spanish identity actions and review remain localized and preserve the same memory-only session contract", async ({
  page,
}) => {
  const domain = await openIdentity(page, "clerk", "es");
  await expect(
    domain.getByText("Demo local independiente", { exact: true }),
  ).toBeVisible();
  await domain
    .getByLabel("Nombre completo", { exact: true })
    .fill("Perfil identidad QA");
  await domain
    .getByRole("button", { name: "Guardar perfil", exact: true })
    .click();
  await expect(domain.getByRole("status")).toContainText(
    "Vista previa local actualizada.",
  );
  await domain
    .getByRole("button", { name: "Actualizar sesión", exact: true })
    .click();
  await expect(domain.getByRole("status")).toContainText(
    "Datos de la cuenta actualizados.",
  );
  await expect(
    domain.getByLabel("Nombre completo", { exact: true }),
  ).toHaveValue("Perfil identidad QA");
  await tab(domain, "Sesiones");
  await expect(
    identityCard(domain, "Sesiones activas").getByRole("listitem"),
  ).toHaveCount(3);
  await domain
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  const review = page.getByRole("dialog", {
    name: "¿Cerrar sesión en esta cuenta?",
    exact: true,
  });
  await review.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    domain.getByRole("tab", { name: "Sesiones", exact: true }),
  ).toBeVisible();
  await domain
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await review.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(
    domain.getByRole("heading", {
      name: "Inicia sesión para gestionar tu cuenta",
      exact: true,
    }),
  ).toBeVisible();
  expect(await demoSession(page)).toBeNull();
});

test("real login validates input, aborts on route change, retries and persists only a display profile; recovery sends nothing", async ({
  page,
}) => {
  await page.goto(route("auth/sign-in"));
  let main = page.getByRole("main");
  await main
    .getByLabel("Email", { exact: true })
    .fill("identity-login@example.com");
  await main.getByLabel("Password", { exact: true }).fill("short");
  await main
    .getByRole("button", { name: "Sign in to demo", exact: true })
    .click();
  await expect(
    main.getByText("Use at least 8 characters.", { exact: true }),
  ).toBeVisible();
  expect(await demoSession(page)).toBeNull();
  await main.getByLabel("Password", { exact: true }).fill(currentPassword);
  await main
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(main.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await main
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(main.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await pauseTimers(page);
  await main
    .getByRole("button", { name: "Sign in to demo", exact: true })
    .click();
  await expect(main.getByLabel("Password", { exact: true })).toBeDisabled();
  await main
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${route("auth/sign-up")}$`));
  await expect(
    page.getByRole("heading", {
      name: "Build your next chapter.",
      exact: true,
    }),
  ).toBeVisible();
  await page.clock.runFor(1500);
  expect(await demoSession(page)).toBeNull();
  await expect(page).toHaveURL(new RegExp(`${route("auth/sign-up")}$`));
  await page
    .getByRole("main")
    .getByRole("navigation", { name: "Authentication screens", exact: true })
    .getByRole("link", { name: "Sign in", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${route("auth/sign-in")}$`));
  await expect(
    page.getByRole("heading", { name: "Welcome to what’s next.", exact: true }),
  ).toBeVisible();
  await page.clock.resume();
  main = page.getByRole("main");
  await expect(main.getByLabel("Password", { exact: true })).toHaveValue("");
  await main
    .getByLabel("Email", { exact: true })
    .fill("identity-login@example.com");
  await main.getByLabel("Password", { exact: true }).fill(currentPassword);
  await main
    .getByRole("button", { name: "Sign in to demo", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${route("dashboard")}$`));
  const profile = await demoSession(page);
  expectDisplayProfile(profile, "email");
  expect(profile!.email).toBe("identity-login@example.com");
  await page.reload();
  expect(await demoSession(page)).toEqual(profile);
  await page.goto(route("auth/sign-in"));
  await page
    .getByRole("main")
    .getByRole("link", { name: "Forgot password?", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${route("auth/reset-password")}$`));
  await page
    .getByRole("main")
    .getByLabel("Email", { exact: true })
    .fill("identity-login@example.com");
  await page
    .getByRole("button", { name: "Preview recovery", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("status")).toContainText(
    "No email was sent.",
  );
  expect(await demoSession(page)).toEqual(profile);
  await page
    .getByRole("link", { name: "Back to sign in", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Welcome to what’s next.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in to demo", exact: true }),
  ).toBeVisible();
});

test("real registration validates the password and consent before persisting a demo profile and navigating to onboarding", async ({
  page,
}) => {
  await page.goto(route("auth/sign-up"));
  const main = page.getByRole("main");
  await main
    .getByLabel("Full name", { exact: true })
    .fill("Identity Signup QA");
  await main
    .getByLabel("Email", { exact: true })
    .fill("identity-signup@example.com");
  await main.getByLabel("Password", { exact: true }).fill("short");
  await main
    .getByRole("button", { name: "Create demo account", exact: true })
    .click();
  await expect(
    main.getByText("Use at least 8 characters.", { exact: true }),
  ).toBeVisible();
  expect(await demoSession(page)).toBeNull();
  await main.getByLabel("Password", { exact: true }).fill(currentPassword);
  await main
    .getByRole("button", { name: "Create demo account", exact: true })
    .click();
  await expect(
    main.getByText("Accept the demo terms to continue.", { exact: true }),
  ).toBeVisible();
  expect(await demoSession(page)).toBeNull();
  await main
    .getByRole("checkbox", { name: "Accept demo terms", exact: true })
    .check();
  await main
    .getByRole("button", { name: "Create demo account", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${route("onboarding")}$`));
  const profile = await demoSession(page);
  expectDisplayProfile(profile, "email");
  expect(profile).toMatchObject({
    name: "Identity Signup QA",
    email: "identity-signup@example.com",
  });
  await page.reload();
  expect(await demoSession(page)).toEqual(profile);
});

for (const locale of ["en", "es"] as const) {
  test(`real ${locale} OTP route rejects a wrong code, resends a local hint and persists only the successful preview`, async ({
    page,
  }) => {
    const domain = await openIdentity(page, "better-auth", locale);
    await domain
      .getByRole("link", {
        name: locale === "es" ? "Verificar código" : "Verify code",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${route("auth/verify", locale)}$`),
    );
    const main = page.getByRole("main");
    const code = main.getByRole("textbox", {
      name: locale === "es" ? "Código de verificación" : "Verification code",
      exact: true,
    });
    await enterOtp(code, "000000");
    await main
      .getByRole("button", {
        name: locale === "es" ? "Verificar código" : "Verify code",
        exact: true,
      })
      .click();
    await expect(main.getByRole("alert")).toContainText(
      locale === "es"
        ? "Usa el código de ejemplo 123456."
        : "Use the demo code 123456.",
    );
    await expect(code).toHaveAttribute("aria-invalid", "true");
    expect(await demoSession(page)).toBeNull();
    await main
      .getByRole("button", {
        name: locale === "es" ? "Volver a enviar código" : "Resend code",
        exact: true,
      })
      .click();
    await expect(
      page.getByText(
        locale === "es"
          ? "Tu código de ejemplo es 123456."
          : "Your demo code is 123456.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(await demoSession(page)).toBeNull();
    await enterOtp(code, "123456");
    await main
      .getByRole("button", {
        name: locale === "es" ? "Verificar código" : "Verify code",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${route("dashboard", locale)}$`));
    const profile = await demoSession(page);
    expectDisplayProfile(profile, "otp");
    await page.reload();
    expect(await demoSession(page)).toEqual(profile);
  });
}

for (const [provider, name] of [
  ["google", "Google"],
  ["github", "GitHub"],
  ["microsoft", "Microsoft"],
] as const) {
  test(`real ${name} mock login persists a provider-specific display profile and requires explicit continuation`, async ({
    page,
  }) => {
    await page.goto(route("auth/sign-in"));
    const main = page.getByRole("main");
    await expect(
      main.getByText("Local preview. No connection to your provider account.", {
        exact: true,
      }),
    ).toBeVisible();
    await main
      .getByRole("button", { name: `Continue with ${name}`, exact: true })
      .click();
    await expect(main.getByRole("status")).toContainText(`${name} demo ready`);
    await expect(main.getByRole("status")).toContainText(
      "Only a local demo profile was saved.",
    );
    await expect(page).toHaveURL(new RegExp(`${route("auth/sign-in")}$`));
    const profile = await demoSession(page);
    expectDisplayProfile(profile, provider);
    expect(profile!.email).toBe(`alex.${provider}@example.com`);
    await main
      .getByRole("button", { name: "Continue to workspace", exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${route("dashboard")}$`));
    await page.reload();
    expect(await demoSession(page)).toEqual(profile);
  });
}

test("real social registration refuses persistence without consent and continues explicitly to onboarding", async ({
  page,
}) => {
  await page.goto(route("auth/sign-up"));
  const main = page.getByRole("main");
  await main
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(
    main.getByText("Accept the demo terms to continue.", { exact: true }),
  ).toBeVisible();
  expect(await demoSession(page)).toBeNull();
  await main
    .getByRole("checkbox", { name: "Accept demo terms", exact: true })
    .check();
  await main
    .getByRole("button", { name: "Continue with Google", exact: true })
    .click();
  await expect(main.getByRole("status")).toContainText("Google demo ready");
  await expect(page).toHaveURL(new RegExp(`${route("auth/sign-up")}$`));
  expectDisplayProfile(await demoSession(page), "google");
  await main
    .getByRole("button", { name: "Continue to onboarding", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${route("onboarding")}$`));
});
