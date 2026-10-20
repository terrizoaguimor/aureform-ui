import { z } from "zod";

export const qualityRoutes = ["landing", "documentation", "dashboard"] as const;
export const qualityProfiles = ["mobile", "desktop"] as const;
export const qualityCategories = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
] as const;
export const qualityMetrics = [
  "fcp",
  "lcp",
  "cls",
  "tbt",
  "speedIndex",
] as const;

export type QualityRoute = (typeof qualityRoutes)[number];
export type QualityProfile = (typeof qualityProfiles)[number];
export type QualityCategory = (typeof qualityCategories)[number];
export type QualityMetric = (typeof qualityMetrics)[number];

/** Build context only; it is never part of the recorded snapshot evidence. */
export type QualitySourceArchive = {
  reportOrigin: string;
  missingSnapshotIds: readonly string[];
};

export const qualityRoutePaths: Record<QualityRoute, string> = {
  landing: "/en/",
  documentation: "/en/docs/installation/",
  dashboard: "/en/dashboard/",
};

const pathSegment = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const sha256 = z.string().regex(/^[a-f0-9]{64}$/i);
const measurement = z.number().finite().nonnegative().nullable();
// Category medians use the public 0–100 scale. Time metrics are milliseconds;
// CLS is unitless. Null means that Lighthouse did not return a measurement.
const score = z.number().finite().min(0).max(100).nullable();

function reportFilename(extension: "json" | "html") {
  return z
    .string()
    .refine(
      (filename) =>
        filename.endsWith(`.${extension}`) &&
        filename.split("/").every((segment) => pathSegment.test(segment)),
      `Expected a relative ${extension.toUpperCase()} report filename.`,
    );
}

export const qualitySnapshotSchema = z
  .object({
    id: z.string().regex(pathSegment),
    createdAt: z.string().datetime({ offset: true }),
    sourceCommit: z.string().regex(/^[a-f0-9]{40}$/i),
    version: z.string().min(1),
    targetOrigin: z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          ["http:", "https:"].includes(url.protocol) &&
          !url.username &&
          !url.password &&
          url.pathname === "/" &&
          !url.search &&
          !url.hash
        );
      }, "Expected a public HTTP(S) origin without credentials or a path."),
    environment: z.object({
      node: z.string().min(1),
      lighthouse: z.string().min(1),
      chrome: z.string().min(1),
      platform: z.string().min(1),
    }),
    results: z.array(
      z.object({
        route: z.enum(qualityRoutes),
        pathname: z
          .string()
          .regex(/^\/(?:en|es)\/[^?#\\]*$/)
          .refine(
            (pathname) => !pathname.split("/").includes(".."),
            "Expected a localized site pathname.",
          ),
        profile: z.enum(qualityProfiles),
        scores: z.object({
          performance: score,
          accessibility: score,
          "best-practices": score,
          seo: score,
        }),
        metrics: z.object({
          fcp: measurement,
          lcp: measurement,
          cls: measurement,
          tbt: measurement,
          speedIndex: measurement,
        }),
        runs: z
          .array(
            z.object({
              id: z.string().regex(pathSegment),
              json: reportFilename("json"),
              html: reportFilename("html"),
              sha256: z.object({ json: sha256, html: sha256 }),
            }),
          )
          .min(1),
      }),
    ),
  })
  .superRefine((snapshot, context) => {
    const results = new Set<string>();
    for (const [index, result] of snapshot.results.entries()) {
      const key = `${result.route}:${result.profile}`;
      if (results.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["results", index],
          message: "A route/profile pair must appear only once per snapshot.",
        });
      }
      results.add(key);
      const runs = new Set<string>();
      for (const [runIndex, run] of result.runs.entries()) {
        if (runs.has(run.id)) {
          context.addIssue({
            code: "custom",
            path: ["results", index, "runs", runIndex, "id"],
            message: "Run IDs must be unique within a route/profile pair.",
          });
        }
        runs.add(run.id);
      }
    }
  });

const qualityIndexSchema = z
  .array(qualitySnapshotSchema)
  .superRefine((snapshots, context) => {
    const ids = new Set<string>();
    for (const [index, snapshot] of snapshots.entries()) {
      if (ids.has(snapshot.id)) {
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          message: "Snapshot IDs must be unique.",
        });
      }
      ids.add(snapshot.id);
    }
  });

export type QualitySnapshot = z.infer<typeof qualitySnapshotSchema>;
export type QualityResult = QualitySnapshot["results"][number];
export type QualityRun = QualityResult["runs"][number];

/** Reject malformed evidence rather than turning it into a published score. */
export function parseQualitySnapshots(value: unknown): QualitySnapshot[] {
  const result = qualityIndexSchema.safeParse(value);
  if (!result.success) {
    const reason = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "index"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid Lighthouse quality index: ${reason}`);
  }
  return result.data.sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

/** Keep every planned route/profile visible, including unmeasured pairs. */
export function qualityRows(snapshot?: QualitySnapshot) {
  return qualityRoutes.flatMap((route) =>
    qualityProfiles.map((profile) => ({
      route,
      profile,
      result: snapshot?.results.find(
        (result) => result.route === route && result.profile === profile,
      ),
    })),
  );
}

export function qualityReportPath(
  snapshot: Pick<QualitySnapshot, "id">,
  filename: string,
): string {
  return `/quality-reports/${encodeURIComponent(snapshot.id)}/${filename
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function qualityReportUrl(
  snapshot: Pick<QualitySnapshot, "id">,
  filename: string,
  reportOrigin?: string,
): string {
  const path = qualityReportPath(snapshot, filename);
  return reportOrigin ? new URL(path, reportOrigin).toString() : path;
}

export function formatQualityMetric(
  value: number,
  metric: QualityMetric,
  locale: "en" | "es",
): string {
  const decimals = metric === "cls" ? 3 : metric === "tbt" ? 0 : 2;
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: metric === "cls" ? 3 : 0,
    maximumFractionDigits: decimals,
  }).format(metric === "cls" || metric === "tbt" ? value : value / 1000);
  return metric === "cls"
    ? number
    : `${number}${metric === "tbt" ? " ms" : " s"}`;
}
