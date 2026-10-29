import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/release/**", "**/data/**"],
  },
  // Base configuration for all JavaScript files
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },
  // Server-specific configuration
  {
    files: ["server/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  // Electron CommonJS
  {
    files: ["electron/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },
  // Client-specific configuration
  {
    files: ["client/**/*.{js,jsx}"],
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat["jsx-runtime"],
    languageOptions: {
      ...reactPlugin.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      ...reactPlugin.configs.flat.recommended.plugins,
      "react-hooks": reactHooksPlugin,
    },
    settings: {
      react: {
        version: "18.3",
      },
    },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactPlugin.configs.flat["jsx-runtime"].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react-hooks/set-state-in-effect": "warn",
      "react/prop-types": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];
