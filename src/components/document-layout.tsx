import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { appearanceBootstrap } from "@/lib/appearance-bootstrap";
import { publicPath } from "@/lib/public-path";
import { siteOrigin } from "@/lib/site-config";
import { siteDescriptions, siteTitles } from "@/lib/site-metadata";
import "../app/globals.css";
const manrope = localFont({
  src: "../assets/fonts/Manrope.ttf",
  variable: "--font-manrope",
  display: "swap",
  weight: "200 800",
});
const instrument = localFont({
  src: [
    {
      path: "../assets/fonts/InstrumentSerif-Regular.ttf",
      style: "normal",
      weight: "400",
    },
    {
      path: "../assets/fonts/InstrumentSerif-Italic.ttf",
      style: "italic",
      weight: "400",
    },
  ],
  variable: "--font-instrument",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(`${siteOrigin}/`),
  title: {
    default: siteTitles.en,
    template: "%s · Aureform UI",
  },
  description: siteDescriptions.en,
  icons: { icon: publicPath("/favicon.svg") },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0F18",
};
export function DocumentLayout({
  children,
  locale,
}: Readonly<{ children: React.ReactNode; locale: "en" | "es" }>) {
  return (
    <html
      lang={locale}
      className="dark"
      data-palette="aurora"
      data-material="elevated"
      data-motion-level="expressive"
      data-hover-effect="glow"
      data-density="comfortable"
      data-typography="modern"
      suppressHydrationWarning
    >
      {/* eslint-disable-next-line @next/next/no-head-element -- App Router document: this script restores the saved appearance before first paint. */}
      <head>
        <script
          id="aureform-appearance"
          dangerouslySetInnerHTML={{ __html: appearanceBootstrap }}
        />
      </head>
      <body className={`${manrope.variable} ${instrument.variable}`}>
        {children}
      </body>
    </html>
  );
}
