import nodeConfig from "config";
import path from "node:path";
import { defineConfig } from "vite";
import virtual from "vite-plugin-virtual";

export default defineConfig({
  plugins: [
    virtual({
      "virtual:config": nodeConfig.util.toObject(),
    }),
  ],
  test: {
    environment: "node",
    include: ["http-client/tests/*.test.ts"],
    reporters: "verbose",
    globalSetup: "./tests/support/globalSetup",
  },
  resolve: {
    alias: {
      "@tests": path.resolve("./tests"),
      "@app": path.resolve("./src"),
      "@http-client": path.resolve("./http-client"),
    },
  },
});
