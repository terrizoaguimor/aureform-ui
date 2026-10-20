import type { Locale } from "@/i18n/messages";
import { githubUrl, figmaUrl, kitVersion } from "@/lib/catalog";
import { siteOrigin, siteUrl, localizedSitePath } from "@/lib/site-config";
import { serializeStructuredData, siteDescriptions } from "@/lib/site-metadata";

export function SiteStructuredData({ locale }: { locale: Locale }) {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteOrigin}/#website`,
        name: "Aureform UI",
        url: siteUrl("/"),
        inLanguage: ["en", "es"],
        description: siteDescriptions[locale],
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": `${siteOrigin}/#source`,
        name: "Aureform UI",
        description: siteDescriptions[locale],
        url: siteUrl(localizedSitePath(locale)),
        codeRepository: githubUrl,
        programmingLanguage: ["TypeScript", "CSS"],
        runtimePlatform: ["Next.js", "React"],
        license: "https://www.apache.org/licenses/LICENSE-2.0",
        version: kitVersion,
        isAccessibleForFree: true,
        sameAs: [githubUrl, figmaUrl],
        targetProduct: {
          "@type": "SoftwareApplication",
          name: "Aureform UI",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Web",
        },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeStructuredData(graph) }}
    />
  );
}
