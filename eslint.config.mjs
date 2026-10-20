import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".cloudflare/**",
    ".wrangler/**",
    "out/**",
    ".figma/**",
    "public/r/**",
    "artifacts/**",
    "next-env.d.ts",
  ]),
  // React Compiler is not enabled; RHF and TanStack expose mutable controlled APIs.
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["scripts/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);
