import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "aureform-ui",
    compatibilityDate: "2026-10-19",
    workersDev: false,
    domains: ["aureformui.com", "www.aureformui.com"],
    // The adapter supplies the asset directory through Build Output.
    assets: {
      htmlHandling: "force-trailing-slash",
      notFoundHandling: "404-page",
      runWorkerFirst: false,
    },
    observability: {
      enabled: true,
      redactQueryString: true,
      logs: { enabled: true, headSamplingRate: 1 },
      traces: { enabled: true, headSamplingRate: 0.01 },
    },
  },
});
