import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Old HTML prototype
    "web/**",
    "nextjs-app/**",
    // CommonJS production scripts
    "prisma/seed-prod.js",
    "prisma/sync-templates.js",
    "prisma/sync-icd10.js",
  ]),
]);

export default eslintConfig;
