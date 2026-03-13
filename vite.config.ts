import asciidoctor from "asciidoctor";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { type Plugin, defineConfig } from "vitest/config";

import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";

const ADOC_LINK_MAP: Record<string, string> = {
  "webhooks-quickstart.adoc": "/help/ci",
  "webhooks-smoke-test.adoc": "/help/ci/webhooks",
  "webhooks-jenkins.adoc": "/help/ci/jenkins",
};

function asciidoc(): Plugin {
  const processor = asciidoctor();
  return {
    name: "asciidoc",
    enforce: "pre",
    async transform(_code, id) {
      if (!id.endsWith(".adoc")) return null;
      const source = await readFile(id, "utf8");
      let html = processor.convert(source, {
        safe: "safe",
        standalone: false,
        base_dir: path.dirname(id),
        attributes: { idprefix: "", idseparator: "-" },
      }) as string;
      for (const [adoc, route] of Object.entries(ADOC_LINK_MAP)) {
        html = html.replaceAll(`href="${adoc}`, `href="${route}`);
      }
      for (const match of source.matchAll(/^include::([^[]+)\[/gm)) {
        this.addWatchFile(path.resolve(path.dirname(id), match[1]));
      }
      return {
        code: `export default ${JSON.stringify(html)};`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [asciidoc(), tailwindcss(), sveltekit()],
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
    fs: {
      allow: ["docs"],
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
    host: "0.0.0.0",
  },
});
