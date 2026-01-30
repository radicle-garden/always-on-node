import { defineConfig } from "vitest/config";

import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
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
