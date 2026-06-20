import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    // Lint app code only — exclude BMAD planning/tooling and generated output.
    ignores: [
      "_bmad/**",
      "_bmad-output/**",
      ".claude/**",
      "design-artifacts/**",
      "docs/**",
      "node_modules/**",
      ".next/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
