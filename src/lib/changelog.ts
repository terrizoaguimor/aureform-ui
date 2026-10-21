import type { Locale } from "@/i18n/messages";
import data from "./changelog-data.json";

type LocalizedText = Record<Locale, string>;
export type ChangelogGroup = {
  title: LocalizedText;
  items: readonly LocalizedText[];
};
export type ChangelogEntry = {
  title: LocalizedText;
  summary: LocalizedText;
  groups: readonly ChangelogGroup[];
  notes: LocalizedText;
};
export type ChangelogRelease = ChangelogEntry & {
  version: string;
  publishedAt: string;
  links: readonly { label: LocalizedText; path: string }[];
};

export const changelogRepository = data.repository;
export const changelogUnreleased: ChangelogEntry = data.unreleased;
export const changelogReleases: readonly ChangelogRelease[] = data.releases;
export const latestChangelogRelease = changelogReleases[0];

export function changelogReleaseId(version: string) {
  return `release-${version.replaceAll(".", "-")}`;
}

export function changelogReleaseUrl(version: string) {
  return `${changelogRepository}/releases/tag/v${version}`;
}

export function changelogMarkdownUrl(locale: Locale) {
  return `${changelogRepository}/blob/main/CHANGELOG${locale === "es" ? ".es" : ""}.md`;
}

export function formatChangelogDate(locale: Locale, publishedAt: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(publishedAt));
}
