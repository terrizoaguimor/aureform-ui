import {
  communicationsBrandNotices,
  getCommunicationsBrand,
} from "@/lib/communications/brands";
import type { CommunicationsProvider } from "@/lib/communications/contracts";
import { publicPath } from "@/lib/public-path";
import { cn } from "@/lib/utils";

export type CommunicationsProviderLogoSize = "inline" | "sm" | "md";
export type CommunicationsProviderLogoProps = {
  provider: CommunicationsProvider;
  size?: CommunicationsProviderLogoSize;
  decorative?: boolean;
  className?: string;
};

const sizes: Record<CommunicationsProviderLogoSize, string> = {
  inline: "size-6 rounded-md p-1",
  sm: "size-9 rounded-lg p-1.5",
  md: "size-11 rounded-xl p-2",
};
const wordmarkSizes: Record<CommunicationsProviderLogoSize, string> = {
  inline: "w-9",
  sm: "w-14",
  md: "w-16",
};

/** Original provider artwork on the kit's approved neutral presentation plate. */
export function CommunicationsProviderLogo({
  provider,
  size = "md",
  decorative = true,
  className,
}: CommunicationsProviderLogoProps) {
  const brand = getCommunicationsBrand(provider);
  if (!brand) return null;

  return (
    <span
      data-communications-brand={brand.id}
      data-brand-manifest={publicPath(communicationsBrandNotices.manifest)}
      data-brand-notices={publicPath(communicationsBrandNotices.readme)}
      aria-hidden={decorative || undefined}
      title={brand.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-black/10 bg-white",
        sizes[size],
        brand.display === "wordmark" && wordmarkSizes[size],
        className,
      )}
    >
      <img
        src={publicPath(brand.src)}
        alt={decorative ? "" : brand.name}
        width={brand.width}
        height={brand.height}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
