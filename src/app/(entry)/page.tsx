import { MarketingPage } from "@/components/marketing-page";
import { SiteStructuredData } from "@/components/site-structured-data";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({ locale: "es" });

export default function Entry() {
  return (
    <>
      <SiteStructuredData locale="es" />
      <MarketingPage locale="es" />
    </>
  );
}
