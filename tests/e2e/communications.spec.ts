import { test, expect, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

type Locale = "en" | "es";
type AudioProbe = {
  mode: "denied" | "unavailable" | "pending";
  requests: MediaStreamConstraints[];
  stopped: number;
  resolvePending?: () => void;
};
type ProbeWindow = typeof window & { __softphoneAudioProbe: AudioProbe };

// Match the application's mounted export as well as root development.
const mount = (
  (process.env.AUREFORM_BASE_URL
    ? new URL(process.env.AUREFORM_BASE_URL).pathname.replace(/\/+$/, "")
    : "") ||
  process.env.NEXT_PUBLIC_BASE_PATH ||
  ""
).replace(/\/+$/, "");
const route = (path: string, locale: Locale = "en") =>
  `${mount}/${locale}/${path ? `${path}/` : ""}`;

const copy = {
  en: {
    provider: "Voice provider",
    presence: "Agent availability",
    scenario: "Incoming-call scenario",
    disconnected: "Disconnected",
    connected: "Connected",
    recovering: "Reconnecting",
    local: "Local demo",
    available: "Available",
    away: "Away",
    offline: "Offline",
    queue: /^Queue/,
    context: "Call context",
    during: "During business hours",
    closed: "Outside business hours",
    holiday: "Holiday",
    overflow: "Queue capacity reached",
    full: "Queue full",
    completed: "Completed",
    audio: "Make yourself heard.",
    closeAudio: "Close audio settings",
    notTested: "Not tested",
    testing: "Testing",
    denied: "Permission denied",
    unavailable: "Unavailable",
    speakerError: "The browser could not play audio.",
    hours: "Time for a conversation.",
    zone: "Time zone",
    opens: "Opens",
    closes: "Closes",
    holidays: "Holiday dates",
    weekday: "Monday",
    weekend: "Sunday",
    scheduleError: "Check the timezone, time range and holiday dates.",
    keypad: "Call keypad",
    dtmfActivity: "Keypad input sent",
    closeKeypad: "Close keypad",
    closeHistory: "Close call details",
    csvHeader: "Contact,From,To,Provider,Outcome,Received,Ended,Duration",
  },
  es: {
    provider: "Proveedor de voz",
    presence: "Disponibilidad del agente",
    scenario: "Escenario de llamada entrante",
    disconnected: "Desconectada",
    connected: "Conectada",
    recovering: "Reconectando",
    local: "Demo local",
    available: "Disponible",
    away: "Ausente",
    offline: "No disponible",
    queue: /^Cola/,
    context: "Contexto",
    during: "En horario de atención",
    closed: "Fuera de horario",
    holiday: "Festivo",
    overflow: "Capacidad de cola alcanzada",
    full: "Cola llena",
    completed: "Completada",
    audio: "Hazte escuchar.",
    closeAudio: "Cerrar ajustes de audio",
    notTested: "Sin probar",
    testing: "Probando",
    denied: "Permiso denegado",
    unavailable: "No disponible",
    speakerError: "El navegador no pudo reproducir audio.",
    hours: "Tiempo para una conversación.",
    zone: "Zona horaria",
    opens: "Apertura",
    closes: "Cierre",
    holidays: "Fechas de festivos",
    weekday: "Lunes",
    weekend: "Domingo",
    scheduleError:
      "Revisa la zona horaria, el intervalo y las fechas de festivos.",
    keypad: "Teclado de la llamada",
    dtmfActivity: "Entrada de teclado enviada",
    closeKeypad: "Cerrar teclado",
    closeHistory: "Cerrar detalles de llamada",
    csvHeader:
      "Contacto,Origen,Destino,Proveedor,Resultado,Recibida,Finalizada,Duración",
  },
} as const;

const control = (page: Page, name: string) =>
  page.getByTestId(`softphone-${name}`);
const historyRows = (page: Page) =>
  control(page, "history").locator("tbody tr");
const panel = (page: Page) => control(page, "call-panel");

test.beforeEach(async ({ page, context, baseURL }) => {
  // Even an accidental provider/network regression cannot contact a carrier.
  const origin = new URL(
    baseURL || process.env.AUREFORM_BASE_URL || "http://127.0.0.1:3001",
  ).origin;
  await context.routeWebSocket(
    (url) => url.host !== new URL(origin).host,
    (socket) => socket.close({ code: 1000, reason: "Local demo tests only" }),
  );
  await context.route("**/*", async (request) => {
    const url = new URL(request.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) {
      await request.abort("blockedbyclient");
    } else {
      await request.continue();
    }
  });
  await page.addInitScript(() => {
    const probe: AudioProbe = { mode: "denied", requests: [], stopped: 0 };
    (window as ProbeWindow).__softphoneAudioProbe = probe;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        enumerateDevices: async () => [],
        getUserMedia: async (constraints: MediaStreamConstraints) => {
          probe.requests.push(constraints);
          if (probe.mode === "unavailable") {
            throw new DOMException("No test device", "NotFoundError");
          }
          if (probe.mode === "pending") {
            return new Promise<MediaStream>((resolve) => {
              probe.resolvePending = () =>
                resolve({
                  getTracks: () => [{ stop: () => (probe.stopped += 1) }],
                } as unknown as MediaStream);
            });
          }
          throw new DOMException("Test denial", "NotAllowedError");
        },
      },
    });
    // Never instantiate a physical speaker/audio output in this suite.
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "webkitAudioContext", {
      configurable: true,
      value: undefined,
    });
  });
});

async function fresh(page: Page, locale: Locale = "en") {
  const response = await page.goto(route("softphone", locale));
  expect(response?.status()).toBe(200);
  await expect(control(page, "workspace")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
  await expect(
    page.getByRole("heading", { level: 1, name: "Softphone" }),
  ).toBeVisible();
}

async function select(page: Page, label: string, value: string) {
  const trigger = page.getByRole("combobox", { name: label, exact: true });
  await trigger.click();
  // Provider artwork can contribute to the accessible option name.
  const option = page
    .getByRole("option")
    .filter({ has: page.getByText(value, { exact: true }) });
  await expect(option).toHaveCount(1);
  await option.click();
  await expect(trigger).toContainText(value);
}

async function connect(page: Page, locale: Locale = "en") {
  await control(page, "connect").click();
  await expect(control(page, "connection")).toContainText(
    copy[locale].connected,
  );
  await expect(control(page, "simulate")).toBeEnabled();
}

async function offer(page: Page) {
  await control(page, "simulate").click();
  await expect(panel(page)).toHaveAttribute("data-softphone-state", "ringing");
  await expect(control(page, "accept")).toBeEnabled();
  return (
    await panel(page).getByRole("heading", { level: 2 }).innerText()
  ).trim();
}

async function answer(page: Page) {
  const caller = await offer(page);
  await control(page, "accept").click();
  await expect(panel(page)).toHaveAttribute("data-softphone-state", "active");
  return caller;
}

async function noMicrophoneRequests(page: Page) {
  expect(
    await page.evaluate(
      () => (window as ProbeWindow).__softphoneAudioProbe.requests,
    ),
  ).toEqual([]);
}

async function noHorizontalOverflow(page: Page, dialog?: Locator) {
  const sizes = await page.evaluate(() => {
    const workspace = document.getElementById("softphone-workspace")!;
    return {
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      workspaceWidth: workspace.clientWidth,
      workspaceScroll: workspace.scrollWidth,
    };
  });
  expect(sizes.page).toBeLessThanOrEqual(sizes.viewport + 1);
  expect(sizes.workspaceScroll).toBeLessThanOrEqual(sizes.workspaceWidth + 1);
  if (dialog) {
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(-1);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(sizes.viewport + 1);
    expect(
      await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
    ).toBe(true);
  }
}

for (const locale of ["en", "es"] as const) {
  for (const provider of ["Twilio", "Telnyx"] as const) {
    test(`${locale}: ${provider} local call, controls, DTMF, private notes and history export`, async ({
      page,
    }, testInfo) => {
      await page.clock.install({ time: new Date("2026-10-21T14:00:00Z") });
      await fresh(page, locale);
      const c = copy[locale];
      const providerSelect = page.getByRole("combobox", { name: c.provider });
      await expect(control(page, "connection")).toContainText(c.disconnected);
      await expect(providerSelect).toBeEnabled();
      await expect(providerSelect).toContainText("Twilio");
      await expect(control(page, "simulate")).toBeDisabled();
      await expect(
        control(page, "workspace").getByText(c.local, { exact: true }).first(),
      ).toBeVisible();
      if (provider === "Telnyx") await select(page, c.provider, provider);
      await connect(page, locale);
      await expect(providerSelect).toBeDisabled();
      await expect(control(page, "connection")).toContainText(provider);
      const caller = await answer(page);
      await expect(control(page, "duration")).toHaveText(/^\d{2}:\d{2}$/);
      await page.clock.fastForward(2100);
      await expect(control(page, "duration")).not.toHaveText("00:00");
      await control(page, "mute").click();
      await expect(control(page, "mute")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await control(page, "mute").click();
      await expect(control(page, "mute")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
      await control(page, "hold").click();
      await expect(panel(page)).toHaveAttribute("data-softphone-state", "held");
      await expect(control(page, "hold")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(control(page, "keypad")).toBeDisabled();
      await control(page, "hold").click();
      await expect(panel(page)).toHaveAttribute(
        "data-softphone-state",
        "active",
      );
      await control(page, "keypad").click();
      const keypad = page.getByRole("dialog", { name: c.keypad, exact: true });
      await expect(
        keypad.locator('[data-testid^="softphone-key-"]'),
      ).toHaveCount(12);
      for (const key of ["1", "star", "hash"]) {
        await control(page, `key-${key}`).click();
      }
      await keypad
        .getByRole("button", { name: c.closeKeypad, exact: true })
        .click();
      await expect(
        control(page, "events").getByText(c.dtmfActivity, { exact: true }),
      ).toHaveCount(3);
      const note = `Private local note ${locale} ${provider}`;
      await control(page, "notes").fill(note);
      await control(page, "save-notes").click();
      await control(page, "hangup").click();
      await expect(panel(page)).toHaveAttribute("data-softphone-state", "idle");
      await expect(historyRows(page)).toHaveCount(4);
      const newest = historyRows(page).first();
      await expect(newest).toContainText(caller);
      await expect(newest).toContainText(c.completed);
      await newest.getByRole("button").click();
      const details = page.getByRole("dialog", { name: caller, exact: true });
      await expect(details.getByText(note, { exact: true })).toBeVisible();
      await details
        .getByRole("button", { name: c.closeHistory, exact: true })
        .click();
      const downloading = page.waitForEvent("download");
      await control(page, "export").click();
      const download = await downloading;
      expect(download.suggestedFilename()).toBe("call-history.csv");
      const csvPath = testInfo.outputPath("call-history.csv");
      await download.saveAs(csvPath);
      const exported = (await readFile(csvPath, "utf8")).replace(/^\uFEFF/, "");
      expect(exported.split(/\r?\n/)[0].replaceAll('"', "")).toBe(c.csvHeader);
      expect(exported).toContain(caller);
      expect(exported).toContain(provider.toLowerCase());
      expect(exported).not.toContain(note);
      await noMicrophoneRequests(page);
      await control(page, "connect").click();
      await expect(control(page, "connection")).toContainText(c.disconnected);
      await expect(providerSelect).toBeEnabled();
    });
  }

  test(`${locale}: FIFO, away/offline admission and recovery retain the local call`, async ({
    page,
  }) => {
    await fresh(page, locale);
    const c = copy[locale];
    await connect(page, locale);
    const caller = await answer(page);
    for (let count = 1; count <= 2; count++) {
      await control(page, "simulate").click();
      await expect(control(page, "queue-count")).toHaveText(String(count));
    }
    await page.getByRole("tab", { name: c.queue }).click();
    const waiting = control(page, "queue").locator("li");
    await expect(waiting).toHaveCount(2);
    const next = (await waiting.nth(0).locator("p").first().innerText()).trim();
    const last = (await waiting.nth(1).locator("p").first().innerText()).trim();
    expect(next).not.toBe(last);
    await control(page, "simulate-disconnect").click();
    await expect(control(page, "connection")).toContainText(c.recovering);
    await expect(panel(page)).toHaveAttribute(
      "data-softphone-state",
      "recovering",
    );
    await expect(control(page, "queue-count")).toHaveText("2");
    await expect(historyRows(page)).toHaveCount(3);
    await expect(control(page, "reconnect")).toBeEnabled();
    await control(page, "reconnect").click();
    await expect(control(page, "connection")).toContainText(c.connected);
    await expect(panel(page)).toHaveAttribute("data-softphone-state", "active");
    await expect(panel(page).getByRole("heading", { level: 2 })).toHaveText(
      caller,
    );
    await select(page, c.presence, c.away);
    await control(page, "hangup").click();
    await expect(panel(page)).toHaveAttribute("data-softphone-state", "idle");
    await expect(control(page, "queue-count")).toHaveText("2");
    await expect(control(page, "accept")).toHaveCount(0);
    await select(page, c.presence, c.offline);
    await expect(control(page, "queue-count")).toHaveText("2");
    await expect(control(page, "accept")).toHaveCount(0);
    await select(page, c.presence, c.available);
    await expect(panel(page)).toHaveAttribute(
      "data-softphone-state",
      "ringing",
    );
    await expect(panel(page).getByRole("heading", { level: 2 })).toHaveText(
      next,
    );
    await expect(control(page, "queue-count")).toHaveText("1");
    await control(page, "decline").click();
    await expect(panel(page).getByRole("heading", { level: 2 })).toHaveText(
      last,
    );
    await expect(control(page, "queue-count")).toHaveText("0");
    await control(page, "accept").click();
    await expect(panel(page)).toHaveAttribute("data-softphone-state", "active");
    await control(page, "hangup").click();
    await expect(historyRows(page)).toHaveCount(6);
    await noMicrophoneRequests(page);
  });

  test(`${locale}: closed, explicit holiday and overflow outcomes never offer a call`, async ({
    page,
  }) => {
    await fresh(page, locale);
    const c = copy[locale];
    await connect(page, locale);
    let rows = 3;
    for (const [scenario, outcome] of [
      [c.closed, c.closed],
      [c.holiday, c.holiday],
      [c.overflow, c.full],
    ]) {
      await select(page, c.scenario, scenario);
      await control(page, "simulate").click();
      await expect(historyRows(page)).toHaveCount(++rows);
      await expect(historyRows(page).first()).toContainText(outcome);
      await expect(panel(page)).toHaveAttribute("data-softphone-state", "idle");
      await expect(control(page, "accept")).toHaveCount(0);
      await expect(control(page, "queue-count")).toHaveText("0");
    }
  });

  test(`${locale}: IANA hours validate and persist explicit dates only in the session`, async ({
    page,
  }) => {
    await fresh(page, locale);
    const c = copy[locale];
    await control(page, "hours").click();
    const hours = page.getByRole("dialog", { name: c.hours, exact: true });
    const zone = hours.getByLabel(c.zone, { exact: true });
    const opens = hours.getByLabel(c.opens, { exact: true });
    const closes = hours.getByLabel(c.closes, { exact: true });
    const dates = hours.getByLabel(c.holidays, { exact: true });
    await expect(zone).toHaveValue("America/Bogota");
    await expect(opens).toHaveValue("08:00");
    await expect(closes).toHaveValue("18:00");
    await expect(dates).toHaveValue("");
    const weekdays =
      locale === "en"
        ? [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ]
        : [
            "Domingo",
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
          ];
    await expect(hours.getByRole("checkbox")).toHaveCount(7);
    for (const [day, label] of weekdays.entries()) {
      const checkbox = hours.getByRole("checkbox", {
        name: label,
        exact: true,
      });
      if (day >= 1 && day <= 5) await expect(checkbox).toBeChecked();
      else await expect(checkbox).not.toBeChecked();
    }
    await zone.fill("Invalid/Local-Test");
    await control(page, "save-hours").click();
    await expect(hours.getByRole("alert")).toHaveText(c.scheduleError);
    await zone.fill("America/New_York");
    await dates.fill("2026-02-30");
    await control(page, "save-hours").click();
    await expect(hours.getByRole("alert")).toHaveText(c.scheduleError);
    await dates.fill("2026-12-25");
    await control(page, "save-hours").click();
    await expect(hours).not.toBeVisible();
    await control(page, "hours").click();
    await expect(zone).toHaveValue("America/New_York");
    await expect(opens).toHaveValue("08:00");
    await expect(closes).toHaveValue("18:00");
    await expect(dates).toHaveValue("2026-12-25");
    await page.keyboard.press("Escape");
    await page.reload();
    await control(page, "hours").click();
    await expect(zone).toHaveValue("America/Bogota");
    await expect(dates).toHaveValue("");
  });

  test(`${locale}: 390px call and dialogs stay within the viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await fresh(page, locale);
    const c = copy[locale];
    await noHorizontalOverflow(page);
    await connect(page, locale);
    await offer(page);
    await noHorizontalOverflow(page);
    await control(page, "accept").click();
    await expect(panel(page)).toHaveAttribute("data-softphone-state", "active");
    await noHorizontalOverflow(page);
    await control(page, "keypad").click();
    const keypad = page.getByRole("dialog", { name: c.keypad, exact: true });
    await expect(keypad).toBeVisible();
    await noHorizontalOverflow(page, keypad);
    await page.keyboard.press("Escape");
    await control(page, "hours").click();
    const hours = page.getByRole("dialog", { name: c.hours, exact: true });
    await expect(hours).toBeVisible();
    await noHorizontalOverflow(page, hours);
  });

  test(`${locale}: keyboard controls, dialog focus and default axe critical checks`, async ({
    page,
  }, testInfo) => {
    await fresh(page, locale);
    await control(page, "connect").focus();
    await expect(control(page, "connect")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(control(page, "connection")).toContainText(
      copy[locale].connected,
    );
    await control(page, "simulate").focus();
    await page.keyboard.press("Enter");
    await expect(control(page, "accept")).toBeVisible();
    await control(page, "accept").focus();
    await page.keyboard.press("Enter");
    await expect(panel(page)).toHaveAttribute("data-softphone-state", "active");
    const result = await new AxeBuilder({ page })
      .include("#softphone-workspace")
      .analyze();
    await testInfo.attach("softphone-default-axe.json", {
      body: JSON.stringify(result.violations, null, 2),
      contentType: "application/json",
    });
    expect(
      result.violations.filter((violation) => violation.impact === "critical"),
    ).toEqual([]);
    await control(page, "keypad").focus();
    await page.keyboard.press("Enter");
    const keypad = page.getByRole("dialog", { name: copy[locale].keypad });
    await expect(keypad).toBeVisible();
    expect(
      await keypad.evaluate((node) => node.contains(document.activeElement)),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(keypad).not.toBeVisible();
    await expect(control(page, "keypad")).toBeFocused();
    await noMicrophoneRequests(page);
  });

  test(`${locale}: microphone denial is requested only by its explicit button`, async ({
    page,
  }) => {
    await fresh(page, locale);
    const c = copy[locale];
    await noMicrophoneRequests(page);
    await control(page, "test-device").click();
    const audio = page.getByRole("dialog", { name: c.audio, exact: true });
    await expect(control(page, "audio-state")).toHaveText(c.notTested);
    await noMicrophoneRequests(page);
    await control(page, "test-microphone").click();
    await expect(control(page, "audio-state")).toHaveText(c.denied);
    expect(
      await page.evaluate(
        () => (window as ProbeWindow).__softphoneAudioProbe.requests,
      ),
    ).toEqual([
      {
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      },
    ]);
    await expect(control(page, "test-microphone")).toBeEnabled();
    await expect(control(page, "connection")).toContainText(c.disconnected);
    await control(page, "test-speaker").click();
    await expect(audio.getByRole("alert")).toContainText(c.speakerError);
    await audio
      .getByRole("button", { name: c.closeAudio, exact: true })
      .click();
    await expect(audio).not.toBeVisible();
  });
}

test("client navigation preserves the active call, queue and saved notes; reload does not", async ({
  page,
}) => {
  await fresh(page);
  await connect(page);
  const caller = await answer(page);
  const note = "Session-only navigation note";
  await control(page, "notes").fill(note);
  await control(page, "save-notes").click();
  await control(page, "mute").click();
  await control(page, "simulate").click();
  await expect(control(page, "queue-count")).toHaveText("1");
  await page.evaluate(() => {
    document.documentElement.dataset.softphoneNavigationProbe = "same-document";
  });
  // The existing command palette uses router.push; sidebar anchors reload.
  const clientNavigate = async (path: string) => {
    await page.keyboard.press("Control+k");
    const command = page.getByRole("dialog", {
      name: "Search anything…",
      exact: true,
    });
    await expect(command).toBeVisible();
    await command.getByRole("combobox").fill(path);
    await command
      .locator(`[cmdk-item][data-value="navigation:${path}"]`)
      .click();
    await expect(command).not.toBeVisible();
  };
  await clientNavigate("dashboard");
  await expect(page).toHaveURL(new RegExp(`${route("dashboard")}$`));
  const softphoneLink = page
    .locator(`nav a[href="${route("softphone")}"]`)
    .first();
  await expect(softphoneLink).toHaveText("Softphone");
  if (!(await softphoneLink.isVisible())) {
    const applications = page
      .locator("nav details")
      .filter({ has: page.locator(`a[href="${route("softphone")}"]`) })
      .first();
    await applications.locator("summary").click();
  }
  await expect(softphoneLink).toBeVisible();
  await clientNavigate("softphone");
  await expect(control(page, "workspace")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-softphone-navigation-probe",
    "same-document",
  );
  await expect(panel(page)).toHaveAttribute("data-softphone-state", "active");
  await expect(panel(page).getByRole("heading", { level: 2 })).toHaveText(
    caller,
  );
  await expect(control(page, "notes")).toHaveValue(note);
  await expect(control(page, "queue-count")).toHaveText("1");
  await expect(control(page, "mute")).toHaveAttribute("aria-pressed", "true");
  const storage = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
  }));
  expect(JSON.stringify(storage)).not.toContain(note);
  await page.reload();
  await expect(control(page, "connection")).toContainText(copy.en.disconnected);
  await expect(control(page, "queue-count")).toHaveText("0");
  await expect(historyRows(page)).toHaveCount(3);
  await expect(control(page, "notes")).toBeDisabled();
  await noMicrophoneRequests(page);
});

test("private notes enforce the 2000-character browser limit and remain in call details", async ({
  page,
}) => {
  await fresh(page);
  await connect(page);
  await answer(page);
  const notes = control(page, "notes");
  await expect(notes).toHaveAttribute("maxlength", "2000");
  const value = "n".repeat(2000);
  await notes.fill(value);
  await notes.press("End");
  await notes.press("x");
  await expect(notes).toHaveValue(value);
  await control(page, "save-notes").click();
  await control(page, "hangup").click();
  await historyRows(page).first().getByRole("button").click();
  await expect(
    page.getByRole("dialog").getByText(value, { exact: true }),
  ).toBeVisible();
  await expect(control(page, "events")).not.toContainText(value);
});

test("an absent microphone reports unavailable without granting physical access", async ({
  page,
}) => {
  await fresh(page);
  await page.evaluate(() => {
    (window as ProbeWindow).__softphoneAudioProbe.mode = "unavailable";
  });
  await control(page, "test-device").click();
  await noMicrophoneRequests(page);
  await control(page, "test-microphone").click();
  await expect(control(page, "audio-state")).toHaveText(copy.en.unavailable);
  expect(
    await page.evaluate(
      () => (window as ProbeWindow).__softphoneAudioProbe.requests.length,
    ),
  ).toBe(1);
  await expect(control(page, "test-microphone")).toBeEnabled();
});

test("closing audio settings stops tracks from a later-resolved permission request", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await fresh(page);
  await page.evaluate(() => {
    (window as ProbeWindow).__softphoneAudioProbe.mode = "pending";
  });
  await control(page, "test-device").click();
  const audio = page.getByRole("dialog", { name: copy.en.audio, exact: true });
  await control(page, "test-microphone").click();
  await expect(control(page, "audio-state")).toHaveText(copy.en.testing);
  await expect(control(page, "test-microphone")).toBeDisabled();
  await audio
    .getByRole("button", { name: copy.en.closeAudio, exact: true })
    .click();
  await expect(audio).not.toBeVisible();
  await page.evaluate(() => {
    (window as ProbeWindow).__softphoneAudioProbe.resolvePending!();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as ProbeWindow).__softphoneAudioProbe.stopped,
      ),
    )
    .toBe(1);
  await control(page, "test-device").click();
  await expect(control(page, "audio-state")).toHaveText(copy.en.notTested);
  expect(errors).toEqual([]);
});

test("direct demo reset clears call, queue and notes and restores disconnected fixtures", async ({
  page,
}) => {
  await fresh(page);
  const dataRequests: string[] = [];
  page.on("request", (request) => {
    if (
      ["fetch", "xhr"].includes(request.resourceType()) &&
      !new URL(request.url()).pathname.includes("/_next/")
    ) {
      dataRequests.push(request.url());
    }
  });
  await connect(page);
  await answer(page);
  const note = "Private note cleared by local demo reset";
  await control(page, "notes").fill(note);
  await control(page, "save-notes").click();
  await control(page, "simulate").click();
  await expect(control(page, "queue-count")).toHaveText("1");
  await control(page, "reset").click();
  await expect(control(page, "connection")).toContainText(copy.en.disconnected);
  await expect(panel(page)).toHaveAttribute("data-softphone-state", "idle");
  await expect(control(page, "queue-count")).toHaveText("0");
  await expect(historyRows(page)).toHaveCount(3);
  await expect(control(page, "notes")).toBeDisabled();
  await expect(control(page, "notes")).toHaveValue("");
  await expect(control(page, "simulate")).toBeDisabled();
  await connect(page);
  const caller = await answer(page);
  await expect(panel(page)).toHaveAttribute("data-softphone-state", "active");
  await expect(control(page, "notes")).toHaveValue("");
  await control(page, "hangup").click();
  await expect(historyRows(page)).toHaveCount(4);
  await historyRows(page).first().getByRole("button").click();
  const details = page.getByRole("dialog", { name: caller, exact: true });
  await expect(
    details.getByText("No notes for this call.", { exact: true }),
  ).toBeVisible();
  await expect(details).not.toContainText(note);
  await noMicrophoneRequests(page);
  expect(dataRequests).toEqual([]);
});

test("server closed snapshot hydrates against an open browser clock without mismatch", async ({
  page,
  request,
}, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const monday = new Date("2026-10-26T14:00:00.000Z"); // 09:00 America/Bogota.
  await page.clock.setFixedTime(monday);
  const response = await request.get(route("softphone"));
  expect(response.status()).toBe(200);
  const serverBadge = await page.evaluate(
    (html) => {
      const document = new DOMParser().parseFromString(html, "text/html");
      const label = Array.from(document.querySelectorAll("span")).find(
        (node) => node.textContent?.trim() === "Support hours",
      );
      return label?.nextElementSibling?.textContent?.trim();
    },
    await response.text(),
  );
  expect(serverBadge).toBe("Closed");
  await fresh(page);
  const hoursRow = page
    .getByText("Support hours", { exact: true })
    .locator("..");
  await expect(hoursRow.getByText("Open", { exact: true })).toBeVisible();
  await connect(page);
  await expect(hoursRow.getByText("Open", { exact: true })).toBeVisible();
  await offer(page);
  await control(page, "decline").click();
  await expect(historyRows(page)).toHaveCount(4);
  const downloading = page.waitForEvent("download");
  await control(page, "export").click();
  const downloaded = await downloading;
  const csvPath = testInfo.outputPath("clock-disagreement-calls.csv");
  await downloaded.saveAs(csvPath);
  // These source fixtures have no commas in contact/from/to/provider/outcome.
  const received = (await readFile(csvPath, "utf8"))
    .split(/\r?\n/)[1]
    .split(",")[5]
    .replace(/^"|"$/g, "");
  expect(received).toBe(monday.toISOString());
  // Reconnecting on Sunday must evaluate the browser's clock as closed.
  const sunday = new Date("2026-11-01T14:00:00.000Z");
  await page.clock.setFixedTime(sunday);
  await control(page, "connect").click();
  await expect(control(page, "connection")).toContainText(copy.en.disconnected);
  await connect(page);
  await expect(hoursRow.getByText("Closed", { exact: true })).toBeVisible();
  const hydrationErrors = consoleErrors.filter((message) =>
    /hydrat|server[- ]rendered|did not match|minified react error #(418|423|425)/i.test(
      message,
    ),
  );
  await testInfo.attach("clock-disagreement-hydration.json", {
    body: JSON.stringify(
      {
        serverBadge,
        monday: monday.toISOString(),
        callerReceived: received,
        sunday: sunday.toISOString(),
        mondayBadge: "Open",
        sundayBadge: "Closed",
        consoleErrors,
        pageErrors,
        hydrationErrors,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(hydrationErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  await noMicrophoneRequests(page);
});
