import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import boundaries from "eslint-plugin-boundaries";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@next/next": nextPlugin,
      "react": reactPlugin,
      "react-hooks": hooksPlugin,
      "boundaries": boundaries,
    },
    settings: {
      "react": { "version": "detect" },
      "boundaries/elements": [
        { "type": "domain", "pattern": "src/core/domain/**/*" },
        { "type": "application", "pattern": "src/core/application/**/*" },
        { "type": "infrastructure", "pattern": "src/core/infrastructure/**/*" },
        { "type": "agent", "pattern": "src/core/agent/**/*" },
        { "type": "lib", "pattern": "src/core/lib/**/*" },
        { "type": "ui", "pattern": "src/app/**/*" },
        { "type": "components", "pattern": "src/components/**/*" },
      ],
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...hooksPlugin.configs.recommended.rules,
      
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-console": ["error", { "allow": ["warn", "error"] }],
      "max-lines": ["error", { "max": 300, "skipBlankLines": true, "skipComments": true }],
      "max-lines-per-function": ["error", { "max": 80, "skipBlankLines": true, "skipComments": true }],
      "complexity": ["error", { "max": 15 }],
      "boundaries/dependencies": ["error", {
        "default": "disallow",
        "rules": [
          { "from": "domain", "allow": ["domain"] },
          { "from": "application", "allow": ["domain", "application"] },
          { "from": "infrastructure", "allow": ["domain", "application", "infrastructure", "lib"] },
          { "from": "agent", "allow": ["domain", "application", "agent", "lib"] },
          { "from": "ui", "allow": ["domain", "application", "infrastructure", "agent", "lib", "ui", "components"] },
          { "from": "components", "allow": ["domain", "application", "lib", "components"] }
        ]
      }]
    }
  },
  {
    ignores: [".next/**", "node_modules/**", "build/**", "out/**"],
  },
  {
    files: [
      "src/core/infrastructure/adapters/console-logger.adapter.ts",
      "scripts/**/*.ts"
    ],
    rules: {
      "no-console": "off",
    }
  }
);
