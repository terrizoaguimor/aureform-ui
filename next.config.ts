import type { NextConfig } from "next";

const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
if (basePath && !/^\/[a-zA-Z0-9_/-]+$/.test(basePath)) {
  throw new Error(
    "NEXT_PUBLIC_BASE_PATH must be empty or an absolute path such as /aureform-ui.",
  );
}

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  poweredByHeader: false,
};
export default nextConfig;
