import { existsSync } from "node:fs";
import { registerHooks } from "node:module";

/** Node verification scripts share the kit's @/* aliases without changing TS consumers. */
export async function importCatalog() {
  const sourceRoot = new URL("../../src/", import.meta.url);
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/")) {
        specifier = new URL(specifier.slice(2), sourceRoot).href;
        for (const extension of [".ts", ".tsx"]) {
          if (existsSync(new URL(specifier + extension))) {
            return nextResolve(specifier + extension, context);
          }
        }
      }
      return nextResolve(specifier, context);
    },
  });
  try {
    return await import("../../src/lib/catalog.ts");
  } finally {
    hooks.deregister();
  }
}
