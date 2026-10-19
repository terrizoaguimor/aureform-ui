import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { createSaasSeed } from "../../src/demo/saas-data";
import {
  parseSaasState,
  SAAS_STORAGE_KEY,
  type SaasDemoState,
} from "../../src/lib/saas";

type Locale = "en" | "es";
const copy = {
  en: {
    preview: "Preview role",
    actual: "Your role",
    owner: "Owner",
    admin: "Admin",
    viewer: "Viewer",
    organization: "Organization name",
    workspaceName: "Workspace name",
    slug: "Workspace identifier",
    description: "Description",
    continue: "Continue",
    back: "Back",
    finish: "Finish setup",
    skip: "Skip invitations",
    queueEmail: "Invitation email",
    queueRole: "Role",
    add: "Add",
    completed: "Your workspace is ready.",
    saveWorkspace: "Save workspace",
    resetWorkspace: "Reset changes",
    collision: "That email or workspace identifier already exists.",
    settingsNav: "Settings sections",
    workspaceTab: "Workspace",
    teamTab: "Team",
    membersList: "Workspace members",
    invitationsList: "Workspace invitations",
    inviteEmail: "Email address",
    inviteRole: "Invitation role",
    createInvite: "Create invitation",
    pending: "Pending",
    accepted: "Accepted",
    expired: "Expired",
    revoked: "Revoked",
    accept: "Accept in demo for",
    renew: "Refresh invitation for",
    revoke: "Revoke invitation for",
    confirmRevoke: "Revoke invitation",
    roleFor: "Role for",
    remove: "Remove member",
    transfer: "Transfer ownership to",
    confirmTransfer: "Transfer ownership",
    cancel: "Cancel",
    readAccess: "View access",
    expiredError: "This invitation has expired. Renew it first.",
    storageWarning: "Changes are kept in this session",
    retryStorage: "Try saving again",
  },
  es: {
    preview: "Ver como",
    actual: "Tu rol",
    owner: "Titular",
    admin: "Administrador",
    viewer: "Lector",
    organization: "Nombre de organización",
    workspaceName: "Nombre del espacio",
    slug: "Identificador del espacio",
    description: "Descripción",
    continue: "Continuar",
    back: "Atrás",
    finish: "Terminar configuración",
    skip: "Omitir invitaciones",
    queueEmail: "Correo de invitación",
    queueRole: "Rol",
    add: "Añadir",
    completed: "Tu espacio está listo.",
    saveWorkspace: "Guardar espacio",
    resetWorkspace: "Restablecer cambios",
    collision: "Ese correo o identificador de espacio ya existe.",
    settingsNav: "Secciones de configuración",
    workspaceTab: "Espacio de trabajo",
    teamTab: "Equipo",
    membersList: "Miembros del espacio",
    invitationsList: "Invitaciones del espacio",
    inviteEmail: "Correo electrónico",
    inviteRole: "Rol de invitación",
    createInvite: "Crear invitación",
    pending: "Pendiente",
    accepted: "Aceptada",
    expired: "Caducada",
    revoked: "Revocada",
    accept: "Aceptar en demo para",
    renew: "Renovar invitación de",
    revoke: "Revocar invitación de",
    confirmRevoke: "Revocar invitación",
    roleFor: "Rol de",
    remove: "Eliminar miembro",
    transfer: "Transferir propiedad a",
    confirmTransfer: "Transferir propiedad",
    cancel: "Cancelar",
    readAccess: "Acceso de lectura",
    expiredError: "Esta invitación ha caducado. Renuévala primero.",
    storageWarning: "Los cambios se conservan en esta sesión",
    retryStorage: "Reintentar guardado",
  },
} as const;

const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
});

test.afterEach(async ({ page }, info) => {
  const errors = runtimeErrors.get(page) ?? [];
  await info.attach("browser-errors", {
    body: JSON.stringify(errors, null, 2),
    contentType: "application/json",
  });
  if (!page.isClosed() && page.url().startsWith("http")) {
    await info.attach("final-browser-state", {
      body: JSON.stringify(
        await page.evaluate(
          (key) => ({
            url: location.href,
            state: JSON.parse(localStorage.getItem(key) ?? "null"),
            footer: Array.from(document.querySelectorAll("footer")).map(
              (element) => element.textContent,
            ),
          }),
          SAAS_STORAGE_KEY,
        ),
        null,
        2,
      ),
      contentType: "application/json",
    });
  }
  expect.soft(errors, "No browser errors or hydration failures").toEqual([]);
});

async function readState(page: Page): Promise<SaasDemoState> {
  const raw: unknown = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    SAAS_STORAGE_KEY,
  );
  expect(
    parseSaasState(raw),
    "The real persisted payload passes the application's schema",
  ).not.toBeNull();
  return raw as SaasDemoState;
}

async function ready(page: Page, locale: Locale = "en") {
  await expect(
    page.getByRole("combobox", { name: copy[locale].preview, exact: true }),
  ).toBeVisible();
}

async function open(page: Page, route: string, locale: Locale = "en") {
  const response = await page.goto(`/${locale}/${route}/`);
  expect(response?.status(), "The production route responds successfully").toBe(
    200,
  );
  await ready(page, locale);
}

function button(page: Page, name: string) {
  return page.getByRole("button", { name, exact: true });
}

function field(page: Page, name: string) {
  return page.getByRole("textbox", { name, exact: true });
}

async function choose(page: Page, control: Locator, option: string) {
  await control.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

function memberRow(page: Page, name: string, locale: Locale = "en") {
  return page
    .getByRole("list", { name: copy[locale].membersList, exact: true })
    .locator(":scope > li")
    .filter({
      has: page.getByRole("heading", { name, exact: true, level: 3 }),
    });
}

function invitationRow(page: Page, email: string, locale: Locale = "en") {
  return page
    .getByRole("list", { name: copy[locale].invitationsList, exact: true })
    .locator(":scope > li")
    .filter({ hasText: email });
}

/** Fixtures set up an edge condition; lifecycle assertions still use real UI actions. */
async function loadFixture(page: Page, state: SaasDemoState) {
  expect(
    parseSaasState(state),
    "The fixture is a valid application snapshot",
  ).not.toBeNull();
  await page.evaluate(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: SAAS_STORAGE_KEY, state },
  );
  await page.reload();
}

async function evidence(page: Page, info: TestInfo, name: string) {
  await info.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await info.attach(`${name}-state`, {
    body: JSON.stringify(await readState(page), null, 2),
    contentType: "application/json",
  });
}

async function createWorkspace(
  page: Page,
  locale: Locale,
  name: string,
  slug: string,
) {
  const t = copy[locale];
  await open(page, "onboarding", locale);
  await field(page, t.organization).fill("Setup QA organization");
  await button(page, t.continue).click();
  await field(page, t.workspaceName).fill(name);
  await field(page, t.slug).fill(slug);
  await button(page, t.continue).click();
  await button(page, t.skip).click();
  await button(page, t.finish).click();
  await expect(
    page.getByRole("heading", { name: t.completed, exact: true }),
  ).toBeVisible();
  const state = await readState(page);
  expect(state.onboarding.completed).toBe(true);
  expect(state.onboarding.workspaceId).toBe(state.activeWorkspaceId);
  return state.activeWorkspaceId;
}

async function switchWorkspace(page: Page, target: string) {
  const before = await readState(page);
  const current = before.workspaces.find(
    (item) => item.id === before.activeWorkspaceId,
  )!;
  await page
    .locator('button[aria-haspopup="menu"]:visible')
    .filter({ hasText: current.name })
    .click();
  await page.getByRole("menuitem", { name: target, exact: true }).click();
  await expect
    .poll(async () => {
      const state = await readState(page);
      return state.workspaces.find(
        (item) => item.id === state.activeWorkspaceId,
      )?.name;
    })
    .toBe(target);
}

async function invite(
  page: Page,
  email: string,
  locale: Locale,
  role?: string,
) {
  const t = copy[locale];
  await field(page, t.inviteEmail).fill(email);
  if (role) {
    await choose(
      page,
      page.getByRole("combobox", { name: t.inviteRole, exact: true }),
      role,
    );
  }
  await button(page, t.createInvite).click();
  await expect
    .poll(async () => {
      const state = await readState(page);
      return state.data[state.activeWorkspaceId].invitations.some(
        (item) =>
          item.email === email.trim().toLowerCase() &&
          item.status === "pending",
      );
    })
    .toBe(true);
}

async function expectInvitation(
  page: Page,
  email: string,
  status: "pending" | "accepted" | "expired" | "revoked",
) {
  await expect
    .poll(async () => {
      const state = await readState(page);
      return state.data[state.activeWorkspaceId].invitations.find(
        (item) => item.email === email,
      )?.status;
    })
    .toBe(status);
}

async function axe(page: Page, info: TestInfo, name: string) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await info.attach(`axe-${name}`, {
    body: JSON.stringify(
      {
        url: page.url(),
        violations: result.violations,
        incomplete: result.incomplete,
        passedRules: result.passes.length,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(
    result.violations,
    "The actual screen has no tagged WCAG A/AA violations",
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "The mobile document has no horizontal overflow",
  ).toBe(true);
}

for (const locale of ["en", "es"] as const) {
  const t = copy[locale];

  test(`${locale}: onboarding resumes each draft step after reload and commits once`, async ({
    page,
  }, info) => {
    await open(page, "onboarding", locale);
    await field(page, t.organization).fill("Resumable organization");
    await page.reload();
    await ready(page, locale);
    await expect(field(page, t.organization)).toHaveValue(
      "Resumable organization",
    );
    await button(page, t.continue).click();
    await field(page, t.workspaceName).fill("Resumable team");
    await field(page, t.slug).fill(`setup-resume-${locale}`);
    await page.reload();
    await ready(page, locale);
    await expect(field(page, t.workspaceName)).toHaveValue("Resumable team");
    await expect(field(page, t.slug)).toHaveValue(`setup-resume-${locale}`);
    expect((await readState(page)).onboarding.step).toBe(1);
    await button(page, t.continue).click();
    const email = `setup-resume-${locale}@example.test`;
    await field(page, t.queueEmail).fill(email);
    await choose(
      page,
      page.getByRole("combobox", { name: t.queueRole, exact: true }),
      t.viewer,
    );
    await button(page, t.add).click();
    await page.reload();
    await ready(page, locale);
    expect((await readState(page)).onboarding).toMatchObject({
      step: 2,
      invites: [{ email, role: "viewer" }],
      completed: false,
    });
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    await button(page, t.continue).click();
    await page.reload();
    await ready(page, locale);
    expect((await readState(page)).onboarding.step).toBe(3);
    await button(page, t.finish).click();
    await expect(
      page.getByRole("heading", { name: t.completed, exact: true }),
    ).toBeVisible();
    const state = await readState(page);
    expect(state.workspaces).toHaveLength(3);
    expect(state.onboarding.workspaceId).toBe(state.activeWorkspaceId);
    expect(state.data[state.activeWorkspaceId].invitations).toEqual([
      expect.objectContaining({ email, role: "viewer", status: "pending" }),
    ]);
    expect(state.data[state.activeWorkspaceId].customers).toEqual([]);
    await page.reload();
    await ready(page, locale);
    expect((await readState(page)).workspaces).toHaveLength(3);
    await expect(button(page, t.finish)).toHaveCount(0);
    await evidence(page, info, "completed-resumable-onboarding");
  });

  test(`${locale}: workspace validates limits and preserves the full draft on a slug collision`, async ({
    page,
  }, info) => {
    await open(page, "settings/workspace", locale);
    const before = await readState(page);
    await field(page, t.workspaceName).fill("x");
    await field(page, t.slug).fill("x");
    await button(page, t.saveWorkspace).click();
    await expect(field(page, t.workspaceName)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(field(page, t.slug)).toHaveAttribute("aria-invalid", "true");
    expect((await readState(page)).workspaces).toEqual(before.workspaces);
    await field(page, t.workspaceName).fill("Collision draft name");
    await field(page, t.slug).fill("personal-space");
    await field(page, t.description).fill(
      "Keep this draft after the collision.",
    );
    await button(page, t.saveWorkspace).click();
    await expect(page.getByText(t.collision, { exact: true })).toBeVisible();
    await expect(field(page, t.workspaceName)).toHaveValue(
      "Collision draft name",
    );
    await expect(field(page, t.slug)).toHaveValue("personal-space");
    await expect(field(page, t.description)).toHaveValue(
      "Keep this draft after the collision.",
    );
    expect((await readState(page)).workspaces).toEqual(before.workspaces);
    await evidence(page, info, "localized-workspace-collision");
    await field(page, t.workspaceName).fill("n".repeat(100));
    await field(page, t.slug).fill("s".repeat(64));
    await field(page, t.description).fill("d".repeat(500));
    await button(page, t.saveWorkspace).click();
    await expect
      .poll(
        async () =>
          (await readState(page)).workspaces.find(
            (item) => item.id === "studio",
          )?.name,
      )
      .toBe("n".repeat(100));
    const saved = (await readState(page)).workspaces.find(
      (item) => item.id === "studio",
    )!;
    expect(saved).toMatchObject({
      name: "n".repeat(100),
      slug: "s".repeat(64),
      description: "d".repeat(500),
      organizationName: "Aureform",
    });
    await page.reload();
    await ready(page, locale);
    await expect(field(page, t.workspaceName)).toHaveValue(saved.name);
    await expect(field(page, t.slug)).toHaveValue(saved.slug);
  });

  test(`${locale}: invitations reject invalid/duplicate emails and accept, revoke and renew through actual callbacks`, async ({
    page,
  }, info) => {
    await open(page, "settings/team", locale);
    const before = await readState(page);
    await field(page, t.inviteEmail).fill("not-an-email");
    await button(page, t.createInvite).click();
    await expect(field(page, t.inviteEmail)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    for (const duplicate of ["ALEX@AUREFORM.DEMO", "LANA@AUREFORM.DEMO"]) {
      await field(page, t.inviteEmail).fill(duplicate);
      await button(page, t.createInvite).click();
      await expect(field(page, t.inviteEmail)).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    }
    expect((await readState(page)).data.studio.invitations).toEqual(
      before.data.studio.invitations,
    );
    const acceptedEmail = `setup-${locale}-accepted@example.test`;
    await invite(page, acceptedEmail.toUpperCase(), locale, t.viewer);
    await page.reload();
    await ready(page, locale);
    await expect(
      invitationRow(page, acceptedEmail, locale).getByText(t.pending, {
        exact: true,
      }),
    ).toBeVisible();
    await button(page, `${t.accept} ${acceptedEmail}`).click();
    await expectInvitation(page, acceptedEmail, "accepted");
    expect((await readState(page)).data.studio.members).toContainEqual(
      expect.objectContaining({
        email: acceptedEmail,
        role: "viewer",
        status: "active",
      }),
    );
    const revokedEmail = `setup-${locale}-revoked@example.test`;
    await invite(page, revokedEmail, locale);
    await button(page, `${t.revoke} ${revokedEmail}`).click();
    await page.keyboard.press("Escape");
    await expectInvitation(page, revokedEmail, "pending");
    await button(page, `${t.revoke} ${revokedEmail}`).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: t.confirmRevoke, exact: true })
      .click();
    await expectInvitation(page, revokedEmail, "revoked");
    await expect(button(page, `${t.accept} ${revokedEmail}`)).toHaveCount(0);
    const expiredEmail = "leo@aureform.demo";
    await expect(
      invitationRow(page, expiredEmail, locale).getByText(t.expired, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(button(page, `${t.accept} ${expiredEmail}`)).toHaveCount(0);
    await button(page, `${t.renew} ${expiredEmail}`).click();
    await expectInvitation(page, expiredEmail, "pending");
    const renewed = (await readState(page)).data.studio.invitations.find(
      (item) => item.email === expiredEmail,
    )!;
    expect(Date.parse(renewed.expiresAt)).toBeGreaterThan(Date.now());
    await button(page, `${t.accept} ${expiredEmail}`).click();
    await expectInvitation(page, expiredEmail, "accepted");
    // A valid fixture exposes the domain's expired-pending error branch.
    const expiredPending = await readState(page);
    expiredPending.data.studio.invitations.find(
      (item) => item.id === "invite-lana",
    )!.expiresAt = new Date(Date.now() - 86400000).toISOString();
    await loadFixture(page, expiredPending);
    await ready(page, locale);
    await button(page, `${t.accept} lana@aureform.demo`).click();
    await expect(page.getByText(t.expiredError, { exact: true })).toBeVisible();
    await expectInvitation(page, "lana@aureform.demo", "pending");
    expect(
      (await readState(page)).data.studio.members.some(
        (item) => item.email === "lana@aureform.demo",
      ),
    ).toBe(false);
    await evidence(page, info, "expired-invitation-error-and-lifecycle");
  });

  test(`${locale}: own membership and the actual last owner remain protected`, async ({
    page,
  }) => {
    await open(page, "settings/team", locale);
    await expect(button(page, `${t.remove} Alex Morgan`)).toBeDisabled();
    await expect(
      page.getByRole("combobox", {
        name: `${t.roleFor} Alex Morgan`,
        exact: true,
      }),
    ).toBeDisabled();
    const state = await readState(page);
    state.data.studio.members.find((item) => item.id === "member-you")!.role =
      "admin";
    state.data.studio.members.find(
      (item) => item.id === "member-isabel",
    )!.role = "owner";
    await loadFixture(page, state);
    await ready(page, locale);
    await expect(button(page, `${t.remove} Alex Morgan`)).toBeDisabled();
    await expect(button(page, `${t.remove} Isabel Torres`)).toBeDisabled();
    await expect(
      page.getByRole("combobox", {
        name: `${t.roleFor} Isabel Torres`,
        exact: true,
      }),
    ).toBeDisabled();
    await expect(button(page, `${t.transfer} Daniel Kim`)).toHaveCount(0);
    expect((await readState(page)).data.studio.members).toEqual(
      state.data.studio.members,
    );
  });

  test(`${locale}: role preview persists through settings navigation and reload without changing the actual member role`, async ({
    page,
  }) => {
    await open(page, "settings/team", locale);
    await choose(
      page,
      page.getByRole("combobox", { name: t.preview, exact: true }),
      t.viewer,
    );
    await expect(page.getByText(t.readAccess, { exact: true })).toBeVisible();
    await expect(button(page, t.createInvite)).toHaveCount(0);
    await page
      .getByRole("navigation", { name: t.settingsNav, exact: true })
      .getByRole("link", { name: t.workspaceTab, exact: true })
      .click();
    await ready(page, locale);
    await expect(field(page, t.workspaceName)).toBeDisabled();
    expect((await readState(page)).previewRole).toBe("viewer");
    await page.reload();
    await ready(page, locale);
    expect((await readState(page)).previewRole).toBe("viewer");
    await expect(
      page.getByRole("combobox", { name: t.preview, exact: true }),
    ).toHaveText(t.viewer);
    await page
      .getByRole("navigation", { name: t.settingsNav, exact: true })
      .getByRole("link", { name: t.teamTab, exact: true })
      .click();
    await ready(page, locale);
    await expect(button(page, t.createInvite)).toHaveCount(0);
    expect(
      (await readState(page)).data.studio.members.find(
        (item) => item.id === "member-you",
      )?.role,
    ).toBe("owner");
    await choose(
      page,
      page.getByRole("combobox", { name: t.preview, exact: true }),
      t.actual,
    );
    await expect(button(page, t.createInvite)).toBeVisible();
    expect((await readState(page)).previewRole).toBeUndefined();
  });

  test(`${locale}: actual owner transfers once and the demoted admin cannot reverse it by previewing owner`, async ({
    page,
  }, info) => {
    await open(page, "settings/team", locale);
    await button(page, `${t.transfer} Isabel Torres`).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: t.cancel, exact: true })
      .click();
    expect(
      (await readState(page)).data.studio.members.find(
        (item) => item.id === "member-you",
      )?.role,
    ).toBe("owner");
    await button(page, `${t.transfer} Isabel Torres`).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: t.confirmTransfer, exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await readState(page)).data.studio.members.find(
            (item) => item.id === "member-isabel",
          )?.role,
      )
      .toBe("owner");
    const transferred = await readState(page);
    expect(
      transferred.data.studio.members.find((item) => item.id === "member-you")
        ?.role,
    ).toBe("admin");
    expect(
      transferred.data.studio.members.filter((item) => item.role === "owner"),
    ).toHaveLength(1);
    expect(transferred.previewRole).toBeUndefined();
    const ownRole = page.getByRole("combobox", {
      name: `${t.roleFor} Alex Morgan`,
      exact: true,
    });
    const ownRemoval = button(page, `${t.remove} Alex Morgan`);
    await expect(ownRole).toHaveText(t.admin);
    await expect(ownRole).toBeDisabled();
    await expect(ownRemoval).toBeDisabled();
    await choose(
      page,
      page.getByRole("combobox", { name: t.preview, exact: true }),
      t.owner,
    );
    await expect(
      page.getByRole("combobox", { name: t.preview, exact: true }),
    ).toHaveText(t.owner);
    for (const name of ["Isabel Torres", "Daniel Kim", "Noor Ahmed"]) {
      await expect(button(page, `${t.transfer} ${name}`)).toHaveCount(0);
    }
    await expect(ownRole).toBeDisabled();
    await expect(ownRemoval).toBeDisabled();
    await page.reload();
    await ready(page, locale);
    expect((await readState(page)).previewRole).toBe("owner");
    expect((await readState(page)).data.studio.members).toEqual(
      transferred.data.studio.members,
    );
    await expect(ownRole).toHaveText(t.admin);
    await expect(ownRole).toBeDisabled();
    await expect(ownRemoval).toBeDisabled();
    await expect(button(page, `${t.remove} Isabel Torres`)).toBeDisabled();
    await evidence(page, info, "actual-owner-transfer-preview-cannot-reverse");
  });
}

test("new workspace starts empty and dropdown navigation keeps customer/member/invitation data isolated", async ({
  page,
}, info) => {
  const workspaceId = await createWorkspace(
    page,
    "en",
    "Setup isolated team",
    "setup-isolated-team",
  );
  const initial = await readState(page);
  expect(initial.data[workspaceId]).toMatchObject({
    customers: [],
    invitations: [],
    notes: {},
    savedViews: [],
    members: [expect.objectContaining({ id: "member-you", role: "owner" })],
  });
  await button(page, "Open customers").click();
  await ready(page);
  await expect(
    page
      .locator('[data-slot="data-table"] tbody')
      .getByRole("button", { name: "Olivia Rhye", exact: true }),
  ).toHaveCount(0);
  await button(page, "Add customer").click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Full name", { exact: true })
    .fill("Setup isolated customer");
  await dialog
    .getByLabel("Email", { exact: true })
    .fill("setup-isolated@example.test");
  await dialog.getByLabel("Company", { exact: true }).fill("Setup QA");
  await dialog
    .getByRole("button", { name: "Add customer", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect
    .poll(
      async () => (await readState(page)).data[workspaceId].customers.length,
    )
    .toBe(1);
  await switchWorkspace(page, "Aureform Studio");
  await expect(
    page
      .locator('[data-slot="data-table"] tbody')
      .getByRole("button", { name: "Olivia Rhye", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Setup isolated customer", exact: true }),
  ).toHaveCount(0);
  expect((await readState(page)).data.studio.customers).toEqual(
    initial.data.studio.customers,
  );
  await open(page, "settings/team");
  await expect(
    page
      .getByRole("list", { name: copy.en.membersList, exact: true })
      .locator(":scope > li"),
  ).toHaveCount(4);
  await switchWorkspace(page, "Setup isolated team");
  await expect(
    page
      .getByRole("list", { name: copy.en.membersList, exact: true })
      .locator(":scope > li"),
  ).toHaveCount(1);
  await expect(
    page.getByRole("list", { name: copy.en.invitationsList, exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await ready(page);
  expect((await readState(page)).activeWorkspaceId).toBe(workspaceId);
  await open(page, "customers");
  await expect(
    page.getByRole("button", { name: "Setup isolated customer", exact: true }),
  ).toBeVisible();
  expect((await readState(page)).data.studio.customers).toEqual(
    initial.data.studio.customers,
  );
  await evidence(page, info, "isolated-workspace-dropdown");
});

test("a genuine second-tab update preserves the local workspace draft and blocks overwriting it", async ({
  page,
  context,
}, info) => {
  await open(page, "settings/workspace");
  await field(page, copy.en.workspaceName).fill("Local unsaved draft");
  await field(page, copy.en.description).fill("Local unsaved purpose.");
  const peer = await context.newPage();
  try {
    await open(peer, "settings/workspace");
    await field(peer, copy.en.workspaceName).fill("Updated by the other tab");
    await button(peer, copy.en.saveWorkspace).click();
    await expect(
      page.getByText("The workspace changed", { exact: true }),
    ).toBeVisible();
    await expect(field(page, copy.en.workspaceName)).toHaveValue(
      "Local unsaved draft",
    );
    await expect(field(page, copy.en.description)).toHaveValue(
      "Local unsaved purpose.",
    );
    await expect(button(page, copy.en.saveWorkspace)).toBeDisabled();
    expect(
      (await readState(page)).workspaces.find((item) => item.id === "studio")
        ?.name,
    ).toBe("Updated by the other tab");
    await evidence(page, info, "real-cross-tab-workspace-conflict");
    await button(page, "Load latest details").click();
    await expect(field(page, copy.en.workspaceName)).toHaveValue(
      "Updated by the other tab",
    );
    await expect(
      page.getByText("The workspace changed", { exact: true }),
    ).toHaveCount(0);
  } finally {
    await peer.close();
  }
});

test("invalid browser persistence falls back visibly to a valid seed and can be saved again", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({ version: "invalid" }));
  }, SAAS_STORAGE_KEY);
  await open(page, "settings/workspace");
  await expect(
    page.getByText(copy.en.storageWarning, { exact: true }),
  ).toBeVisible();
  await expect(field(page, copy.en.workspaceName)).toHaveValue(
    "Aureform Studio",
  );
  await button(page, copy.en.retryStorage).click();
  await expect(
    page.getByText(copy.en.storageWarning, { exact: true }),
  ).toHaveCount(0);
  expect((await readState(page)).activeWorkspaceId).toBe("studio");
});

test("storage write failures retain live workspace changes and retry commits the actual session state", async ({
  page,
}, info) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    let blocked = true;
    Object.defineProperty(window, "__aureformSetupAllowStorage", {
      value: () => {
        blocked = false;
      },
    });
    Storage.prototype.setItem = function (name, value) {
      if (name === key && blocked)
        throw new DOMException("QA storage fixture", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, SAAS_STORAGE_KEY);
  await open(page, "settings/workspace");
  await expect(
    page.getByText(copy.en.storageWarning, { exact: true }),
  ).toBeVisible();
  await field(page, copy.en.workspaceName).fill("Session-only update");
  await button(page, copy.en.saveWorkspace).click();
  await expect(
    page.getByText("Workspace changes saved.", { exact: true }),
  ).toBeVisible();
  await expect(field(page, copy.en.workspaceName)).toHaveValue(
    "Session-only update",
  );
  await page.evaluate(() => {
    const allow = Reflect.get(
      window,
      "__aureformSetupAllowStorage",
    ) as () => void;
    allow();
  });
  await button(page, copy.en.retryStorage).click();
  await expect(
    page.getByText(copy.en.storageWarning, { exact: true }),
  ).toHaveCount(0);
  expect(
    (await readState(page)).workspaces.find((item) => item.id === "studio")
      ?.name,
  ).toBe("Session-only update");
  await evidence(page, info, "storage-error-recovery");
});

for (const locale of ["en", "es"] as const) {
  const t = copy[locale];

  test(`${locale}: mobile onboarding supports keyboard progression, invitation role selection and axe`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "onboarding", locale);
    await page.keyboard.press("Tab");
    await expect(field(page, t.organization)).toBeFocused();
    await page.keyboard.type("Keyboard organization");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(field(page, t.workspaceName)).toBeFocused();
    await page.keyboard.type("Keyboard team");
    await field(page, t.slug).focus();
    await field(page, t.slug).fill(`keyboard-${locale}`);
    await axe(page, info, "mobile-onboarding-workspace-fields");
    await field(page, t.slug).press("Enter");
    await field(page, t.queueEmail).focus();
    await page.keyboard.type(`keyboard-${locale}@example.test`);
    const role = page.getByRole("combobox", { name: t.queueRole, exact: true });
    await role.focus();
    await role.press("Enter");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(role).toHaveText(t.viewer);
    await button(page, t.add).focus();
    await page.keyboard.press("Enter");
    expect((await readState(page)).onboarding.invites).toEqual([
      { email: `keyboard-${locale}@example.test`, role: "viewer" },
    ]);
    await evidence(page, info, "mobile-keyboard-queued-invitation");
    await axe(page, info, "mobile-onboarding-invitations");
  });

  test(`${locale}: mobile workspace edits and save use keyboard and pass axe`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "settings/workspace", locale);
    await field(page, t.workspaceName).focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Keyboard workspace");
    await page.keyboard.press("Tab");
    await expect(field(page, t.slug)).toBeFocused();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type(`mobile-workspace-${locale}`);
    await field(page, t.description).focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Updated with the keyboard.");
    await button(page, t.saveWorkspace).focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(
        async () =>
          (await readState(page)).workspaces.find(
            (item) => item.id === "studio",
          )?.slug,
      )
      .toBe(`mobile-workspace-${locale}`);
    await evidence(page, info, "mobile-keyboard-saved-workspace");
    await axe(page, info, "mobile-workspace");
  });

  test(`${locale}: mobile team dialogs contain keyboard focus and role updates pass axe`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, "settings/team", locale);
    const before = await readState(page);
    await button(page, `${t.remove} Daniel Kim`).focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    for (let index = 0; index < 5; index++) {
      await page.keyboard.press("Tab");
      await expect
        .poll(() =>
          page.evaluate(
            () => !!document.activeElement?.closest('[role="dialog"]'),
          ),
        )
        .toBe(true);
    }
    await axe(page, info, "mobile-team-confirmation");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    expect((await readState(page)).data.studio.members).toEqual(
      before.data.studio.members,
    );
    const role = memberRow(page, "Daniel Kim", locale).getByRole("combobox", {
      name: `${t.roleFor} Daniel Kim`,
      exact: true,
    });
    await role.focus();
    await role.press("Enter");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect
      .poll(
        async () =>
          (await readState(page)).data.studio.members.find(
            (item) => item.id === "member-daniel",
          )?.role,
      )
      .toBe("viewer");
    await evidence(page, info, "mobile-keyboard-team");
    await axe(page, info, "mobile-team-members");
  });
}

test("the stored actual owner fixture remains distinct from an owner preview", async ({
  page,
}) => {
  const fixture = createSaasSeed();
  fixture.data.studio.members.find((item) => item.id === "member-you")!.role =
    "admin";
  fixture.data.studio.members.find(
    (item) => item.id === "member-isabel",
  )!.role = "owner";
  fixture.previewRole = "owner";
  await page.addInitScript(
    ({ key, fixture }) => {
      localStorage.setItem(key, JSON.stringify(fixture));
    },
    { key: SAAS_STORAGE_KEY, fixture },
  );
  await open(page, "settings/team");
  await expect(
    page.getByRole("combobox", { name: copy.en.preview, exact: true }),
  ).toHaveText(copy.en.owner);
  for (const member of ["Isabel Torres", "Daniel Kim", "Noor Ahmed"]) {
    await expect(button(page, `${copy.en.transfer} ${member}`)).toHaveCount(0);
  }
  expect((await readState(page)).data.studio.members).toEqual(
    fixture.data.studio.members,
  );
});
