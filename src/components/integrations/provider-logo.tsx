import { getIntegrationBrand } from "@/lib/integrations/brands";
import { publicPath } from "@/lib/public-path";
import { cn } from "@/lib/utils";

type LogoSize = "inline" | "sm" | "md" | "lg";

const sizes: Record<LogoSize, string> = {
  inline: "size-6 rounded-md p-1",
  sm: "size-9 rounded-lg p-1.5",
  md: "size-11 rounded-xl p-2",
  lg: "size-12 rounded-xl p-2.5",
};

const wordmarkSizes: Record<LogoSize, string> = {
  inline: "w-9",
  sm: "w-14",
  md: "w-16",
  lg: "w-18",
};

/** Original provider artwork, kept on its specified neutral background. */
export function IntegrationProviderLogo({
  optionId,
  size = "md",
  decorative = true,
  className,
}: {
  optionId: string;
  size?: LogoSize;
  decorative?: boolean;
  className?: string;
}) {
  const brand = getIntegrationBrand(optionId);
  if (!brand) return null;
  const compact = size === "inline" ? brand.compact : undefined;
  const artwork = compact ?? brand;

  return (
    <span
      data-integration-brand={brand.id}
      aria-hidden={decorative || undefined}
      title={brand.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center border border-black/10",
        brand.background === "dark" ? "bg-[#111111]" : "bg-white",
        sizes[size],
        !compact && brand.display === "wordmark" && wordmarkSizes[size],
        className,
      )}
    >
      <img
        src={publicPath(artwork.src)}
        alt={decorative ? "" : brand.name}
        width={artwork.width}
        height={artwork.height}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export function IntegrationProviderMarks({
  options,
  className,
}: {
  options: readonly { id: string }[];
  className?: string;
}) {
  const seen = new Set<string>();
  const brands = options.filter((option) => {
    const brand = getIntegrationBrand(option.id);
    if (!brand || seen.has(brand.id)) return false;
    seen.add(brand.id);
    return true;
  });

  return (
    <span
      className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}
    >
      {brands.map((option) => (
        <IntegrationProviderLogo
          key={option.id}
          optionId={option.id}
          size={brands.length > 1 ? "sm" : "md"}
        />
      ))}
    </span>
  );
}
