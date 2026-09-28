import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "node_modules/**",
    ],
  },

  ...nextCoreWebVitals,

  // Applies everywhere.
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // `eslint-config-next` only registers the @typescript-eslint plugin for
  // TS files, so rules from it have to be scoped the same way.
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Prefer `import type` so the bundler can drop type-only imports cleanly.
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default config;
