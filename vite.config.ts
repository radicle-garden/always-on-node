import { defineConfig } from "vitest/config";

import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    // Fix for vitest v4 setting base to '/'. For more details:
    // https://github.com/sveltejs/kit/issues/13376#issuecomment-3660772123
    {
      name: "reset-base",
      config() {
        return {
          base: "",
        };
      },
    },
    tailwindcss(),
    sveltekit(),
  ],
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: "./vite.config.ts",
        test: {
          name: "server",
          environment: "node",
          include: ["tests/unit/**/*.{test,spec}.{js,ts}"],
          exclude: ["tests/unit/**/*.svelte.{test,spec}.{js,ts}"],
        },
      },
    ],
  },
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
    host: "0.0.0.0",
  },
});
