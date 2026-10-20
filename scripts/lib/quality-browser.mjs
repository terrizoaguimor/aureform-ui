import { createRequire } from "node:module";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  chromeVersion,
  chromiumRevision,
  playwrightVersion,
  projectRoot,
  requireCondition,
} from "./quality.mjs";

export async function pinnedBrowser(root = projectRoot) {
  const require = createRequire(resolve(root, "package.json"));
  const manifestPath = require.resolve("@playwright/test/package.json");
  requireCondition(
    require(manifestPath).version === playwrightVersion,
    `Root frozen Playwright must be ${playwrightVersion}; use pnpm install --frozen-lockfile.`,
  );
  const corePath = require.resolve("playwright-core/package.json", {
    paths: [dirname(manifestPath)],
  });
  const browsers = JSON.parse(
    await readFile(resolve(dirname(corePath), "browsers.json"), "utf8"),
  );
  const browser = browsers.browsers.find((entry) => entry.name === "chromium");
  requireCondition(
    browser?.revision === chromiumRevision &&
      browser.browserVersion === chromeVersion,
    `Root Playwright must provide full Chromium revision ${chromiumRevision}.`,
  );
  const { chromium } = require("@playwright/test");
  const executable = chromium.executablePath();
  try {
    await access(executable);
  } catch {
    throw new Error(
      "Pinned Chromium is not installed. Run pnpm exec playwright install chromium.",
    );
  }
  return { chromium, executable };
}

export async function freshAuditBrowser({
  root = projectRoot,
  chromium,
  executable,
}) {
  const temporaryRoot = resolve(root, "artifacts/quality/browser-profiles");
  await mkdir(temporaryRoot, { recursive: true });
  const userDataDir = await mkdtemp(resolve(temporaryRoot, "run-"));
  let context;
  const close = async () => {
    try {
      await context?.close();
    } finally {
      await rm(userDataDir, { recursive: true, force: true });
    }
  };
  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      executablePath: executable,
      headless: true,
      viewport: null,
      args: [
        "--remote-debugging-port=0",
        "--remote-debugging-address=127.0.0.1",
      ],
    });
    const actualVersion = context.browser().version();
    requireCondition(
      actualVersion === chromeVersion,
      `Launched Chromium ${actualVersion} does not match the pinned ${chromeVersion}.`,
    );
    const port = Number(
      (
        await readFile(resolve(userDataDir, "DevToolsActivePort"), "utf8")
      ).split("\n")[0],
    );
    requireCondition(
      Number.isInteger(port) && port > 0 && port <= 65535,
      "Fresh Chromium did not expose its local debugging port.",
    );
    return { port, chrome: actualVersion, close };
  } catch (error) {
    await close();
    throw error;
  }
}
