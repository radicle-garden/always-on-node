import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    runes: true,
  },
  kit: {
    adapter: adapter(),
    alias: {
      $components: "./src/components",
      $types: "./src/types",
      "@http-client": "./http-client",
    },
    csrf: {
      trustedOrigins:
        process.env.NODE_ENV === "test" ? ["http://localhost:3000"] : undefined,
    },
  },
};

export default config;
