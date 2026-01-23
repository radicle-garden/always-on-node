import dotenv from "dotenv";
import { defineConfig } from "vite";

import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";

// Load .env file (committed shared defaults)
dotenv.config({ path: ".env", quiet: true });
// Load .env.local file (gitignored local overrides) - silently ignore if missing
dotenv.config({ path: ".env.local", override: true, quiet: true });

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
    host: "0.0.0.0",
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
});
