import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // These files render runtime data-URL / user-uploaded images, which next/image cannot optimize.
  {
    files: [
      "app/components/ui/BeforeAfterSlider.tsx",
      "app/components/login/ProjectModal.tsx",
      "app/components/login/AccountDashboard.tsx",
      "app/components/studio/PrintBlueprint.tsx",
      "app/generate/page.tsx",
      "app/login/page.tsx",
    ],
    rules: { "@next/next/no-img-element": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
