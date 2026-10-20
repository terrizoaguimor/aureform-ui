import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

type Locale = "en" | "es";
type LocalBoundary = {
  errors: string[];
  externalRequests: string[];
  consumerRequests: string[];
};

const mount = process.env.AUREFORM_BASE_URL
  ? new URL(process.env.AUREFORM_BASE_URL).pathname.replace(/\/+$/, "")
  : "";

const test = base.extend<{ localBoundary: LocalBoundary }>({
  localBoundary: [
    async ({ context, page, baseURL }, use, info) => {
      const evidence: LocalBoundary = {
        errors: [],
        externalRequests: [],
        consumerRequests: [],
      };
      const origin = new URL(baseURL!).origin;
      page.on("pageerror", (error) => evidence.errors.push(error.message));
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (/^https?:$/.test(url.protocol) && url.origin !== origin) {
          evidence.externalRequests.push(`${url.origin}${url.pathname}`);
          await route.abort();
          return;
        }
        if (/\/api\/(?:integrations|identity|ai|commerce)\b/.test(url.pathname))
          evidence.consumerRequests.push(url.pathname);
        await route.continue();
      });
      await use(evidence);
      await info.attach("g14-local-browser-boundary", {
        body: JSON.stringify({
          nativeProviderAcceptance: false,
          validationType: "local-demo-browser",
          ...evidence,
        }),
        contentType: "application/json",
      });
      expect(evidence.errors, "No uncaught collaboration errors").toEqual([]);
      expect(evidence.externalRequests, "No external HTTP attempts").toEqual(
        [],
      );
      expect(evidence.consumerRequests, "No consumer backend calls").toEqual(
        [],
      );
    },
    { auto: true },
  ],
});

test.use({
  viewport: { width: 360, height: 800 },
  hasTouch: true,
  serviceWorkers: "block",
});

const copy = {
  en: {
    start: "Start local demo",
    configured: "Local preview configured.",
    connection: "Connection",
    workflow: "Workflow",
    save: "Save configuration",
    saved: "Configuration saved.",
    workspace: "Shared workspace",
    resource: "Authorized resource",
    follow: "Follow live updates",
    refresh: "Refresh room",
    reconnect: "Reconnect from cursor",
    presence: "Presence",
    conversation: "Conversation",
    thread: "Thread",
    replyTo: "Reply to",
    parentLink: "Reply to",
    reply: "Reply",
    message: "Message",
    reviewReply: "Review reply",
    review: "Review this action",
    confirm: "Confirm action",
    back: "Back to editing",
  },
  es: {
    start: "Iniciar demo local",
    configured: "Demo local configurada.",
    connection: "Conexión",
    workflow: "Flujo",
    save: "Guardar configuración",
    saved: "Configuración guardada.",
    workspace: "Espacio compartido",
    resource: "Recurso autorizado",
    follow: "Seguir actualizaciones en vivo",
    refresh: "Actualizar espacio",
    reconnect: "Reconectar desde cursor",
    presence: "Presencia",
    conversation: "Conversación",
    thread: "Hilo",
    replyTo: "Responder a",
    parentLink: "Respuesta a",
    reply: "Respuesta",
    message: "Mensaje",
    reviewReply: "Revisar respuesta",
    review: "Revisa esta acción",
    confirm: "Confirmar acción",
    back: "Volver a editar",
  },
} as const;

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function noHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
    "The 360px conversation and review fit the viewport",
  ).toBeLessThanOrEqual(1);
}

async function loadedImage(image: Locator, file: string) {
  await expect(image).toHaveCount(1);
  await expect(image).toHaveAttribute(
    "src",
    new RegExp(`/assets/avatars/${escaped(file)}$`),
  );
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => ({
        complete: element.complete,
        loaded: element.naturalWidth > 0,
      })),
    )
    .toEqual({ complete: true, loaded: true });
}

async function openTwoRooms(page: Page, recipe: string, locale: Locale) {
  const labels = copy[locale];
  await page.goto(`${mount}/${locale}/integrations/${recipe}/`);
  const hub = page.locator("[data-integration-hub]");
  await expect(hub).toHaveAttribute("data-integration-mode", "demo");
  await hub.getByRole("button", { name: labels.start, exact: true }).click();
  await expect(hub.getByText(labels.configured, { exact: true })).toBeVisible();

  await hub.getByRole("tab", { name: labels.connection, exact: true }).click();
  const settings = hub.getByRole("tabpanel", {
    name: labels.connection,
    exact: true,
  });
  // Select only a second reported demo room, without broadening logical grants.
  await settings.getByRole("checkbox", { name: /Design room 1/ }).check();
  await settings
    .getByRole("button", { name: labels.save, exact: true })
    .click();
  await expect(hub.getByText(labels.saved, { exact: true })).toBeVisible();
  await hub.getByRole("tab", { name: labels.workflow, exact: true }).click();
  const product = hub.locator('[data-product-workbench="collaboration"]');
  await expect(product).toBeVisible();
  return product;
}

for (const recipe of ["liveblocks", "realtime-messaging"] as const) {
  for (const locale of ["en", "es"] as const) {
    test(`${recipe}: reported avatars and reviewed thread replies survive room changes (${locale}, 360px)`, async ({
      page,
    }, info) => {
      const labels = copy[locale];
      const product = await openTwoRooms(page, recipe, locale);
      const room = product.getByRole("region", {
        name: labels.workspace,
        exact: true,
      });
      const presence = product.getByRole("region", {
        name: labels.presence,
        exact: true,
      });
      const conversation = product.getByRole("region", {
        name: labels.conversation,
        exact: true,
      });
      await room
        .getByRole("checkbox", { name: labels.follow, exact: true })
        .check();
      const avatars = [
        ["Alex Morgan", "alex-morgan.svg"],
        ["Isabel Torres", "isabel-torres.svg"],
        ["Noor Ahmed", "noor-ahmed.svg"],
      ] as const;
      await expect(presence.getByRole("listitem")).toHaveCount(3);
      for (const [name, file] of avatars)
        await loadedImage(
          presence.getByRole("img", { name, exact: true }).locator("img"),
          file,
        );

      await room
        .getByRole("button", { name: labels.refresh, exact: true })
        .click();
      const threads = conversation.getByRole("region", {
        name: new RegExp(`^${labels.thread} `),
      });
      await expect(threads).toHaveCount(1);
      const threadLabel = (await threads.first().getAttribute("aria-label"))!;
      const threadId = threadLabel.slice(labels.thread.length + 1);
      expect(threadId.length).toBeGreaterThan(0);
      const thread = conversation.getByRole("region", {
        name: threadLabel,
        exact: true,
      });
      await expect(thread.getByRole("listitem")).toHaveCount(2);
      const parentLinks = thread.getByText(
        new RegExp(`^${labels.parentLink} .+ · .+$`),
      );
      await expect(parentLinks).toHaveCount(1);
      const parentLink = (await parentLinks.textContent())!;
      const parentId = parentLink.slice(parentLink.lastIndexOf(" · ") + 3);
      const rootReply = thread.getByRole("button", {
        name: new RegExp(`^${labels.replyTo} .+ · ${escaped(parentId)}$`),
      });
      await expect(rootReply).toBeEnabled();
      const replyLabel = (await rootReply.getAttribute("aria-label"))!;
      const authorName = replyLabel.slice(
        labels.replyTo.length + 1,
        replyLabel.lastIndexOf(" · "),
      );
      const authorAvatar = avatars.find(([name]) => name === authorName);
      expect(
        authorAvatar,
        "The loaded parent has a reported presence identity",
      ).toBeDefined();
      await loadedImage(
        thread
          .getByRole("img", { name: authorName, exact: true })
          .first()
          .locator("img"),
        authorAvatar![1],
      );
      await noHorizontalOverflow(page);

      await rootReply.click();
      const replyInput = conversation.getByRole("textbox", {
        name: labels.reply,
        exact: true,
      });
      const reviewReply = conversation.getByRole("button", {
        name: labels.reviewReply,
        exact: true,
      });
      await expect(reviewReply).toBeDisabled();
      const message = `G14 reviewed thread reply (${recipe}, ${locale})`;
      await replyInput.fill(message);
      await reviewReply.click();
      const review = product.getByRole("region", {
        name: labels.review,
        exact: true,
      });
      await expect(review.getByText(threadId, { exact: true })).toBeVisible();
      await expect(review.getByText(parentId, { exact: true })).toBeVisible();
      await expect(review.getByText(message, { exact: true })).toBeVisible();
      await noHorizontalOverflow(page);
      await review
        .getByRole("button", { name: labels.back, exact: true })
        .click();
      await expect(review).toHaveCount(0);
      await expect(replyInput).toHaveValue(message);
      await expect(thread.getByRole("listitem")).toHaveCount(2);
      await expect(thread.getByText(message, { exact: true })).toHaveCount(0);

      await reviewReply.click();
      await expect(review.getByText(parentId, { exact: true })).toBeVisible();
      await review
        .getByRole("button", { name: labels.confirm, exact: true })
        .click();
      await expect(review).toHaveCount(0);
      const delivered = thread
        .getByRole("listitem")
        .filter({ hasText: message });
      await expect(thread.getByRole("listitem")).toHaveCount(3);
      await expect(delivered.getByText(message, { exact: true })).toBeVisible();
      await expect(
        delivered.getByText(
          new RegExp(`^${labels.parentLink} .+ · ${escaped(parentId)}$`),
        ),
      ).toBeVisible();
      await expect(
        conversation.getByRole("textbox", {
          name: labels.message,
          exact: true,
        }),
      ).toHaveValue("");

      // Changing rooms must discard an unsent reply and its old immutable review.
      await rootReply.click();
      const abandoned = `G14 abandoned room draft (${recipe}, ${locale})`;
      await replyInput.fill(abandoned);
      await reviewReply.click();
      await expect(review.getByText(threadId, { exact: true })).toBeVisible();
      const resource = room.getByRole("combobox", {
        name: labels.resource,
        exact: true,
      });
      await resource.click();
      await page
        .getByRole("option", { name: "Design room 1", exact: true })
        .click();
      await expect(review).toHaveCount(0);
      await expect(thread).toHaveCount(0);
      await expect(
        conversation.getByRole("textbox", {
          name: labels.message,
          exact: true,
        }),
      ).toHaveValue("");
      await expect(
        conversation.getByText(abandoned, { exact: true }),
      ).toHaveCount(0);
      await room
        .getByRole("button", { name: labels.refresh, exact: true })
        .click();
      await expect(threads).toHaveCount(1);
      await expect(threads.getByRole("listitem")).toHaveCount(2);
      await expect(
        conversation.getByText(message, { exact: true }),
      ).toHaveCount(0);
      expect(await threads.first().getAttribute("aria-label")).not.toBe(
        threadLabel,
      );

      // Reload from the selected resource, not the previous room's retained UI rows.
      await resource.click();
      await page
        .getByRole("option", { name: "Product room 1", exact: true })
        .click();
      await room
        .getByRole("button", { name: labels.refresh, exact: true })
        .click();
      await expect(thread.getByRole("listitem")).toHaveCount(3);
      await expect(delivered.getByText(message, { exact: true })).toBeVisible();
      await expect(
        conversation.getByText(abandoned, { exact: true }),
      ).toHaveCount(0);
      await noHorizontalOverflow(page);
      await room
        .getByRole("checkbox", { name: labels.follow, exact: true })
        .uncheck();
      await expect(
        room.getByRole("button", { name: labels.reconnect, exact: true }),
      ).toHaveCount(0);
      await room
        .getByRole("button", { name: labels.refresh, exact: true })
        .click();
      await expect(thread.getByText(message, { exact: true })).toBeVisible();

      await info.attach("g14-avatar-thread-scenario", {
        body: JSON.stringify({
          nativeProviderAcceptance: false,
          validationType: "local-demo-browser",
          recipe,
          locale,
          viewport: { width: 360, height: 800 },
          avatars: avatars.map(([, file]) => file),
          threadId,
          parentId,
          reviewedReply: "persisted after room change and reload",
          abandonedReply: "discarded on room change",
          subscriptionCleanup:
            "old room context cleared; reconnect control removed after unfollow",
        }),
        contentType: "application/json",
      });
    });
  }
}
