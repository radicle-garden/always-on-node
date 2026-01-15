import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";

import svelteConfig from "./svelte.config.js";

const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default [
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        svelteConfig,
        parser: tseslint.parser,
      },
    },
  },
];
