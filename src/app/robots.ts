import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-config";
import { publicPath } from "@/lib/public-path";

export const dynamic = "force-static";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: publicPath("/quality-reports/"),
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
}
