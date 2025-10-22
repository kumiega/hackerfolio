// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000, host: "0.0.0.0" },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ["heroic-pony-exact.ngrok-free.app", ".hackerfolio.test", "hackerfolio.test"],
    },
  },
  adapter: node({
    mode: "standalone",
  }),
  env: {
    schema: {
      PUBLIC_SUPABASE_URL: envField.string({ context: "client", access: "public" }),
      PUBLIC_SUPABASE_KEY: envField.string({ context: "client", access: "public" }),
      SUPABASE_SERVICE_ROLE_KEY: envField.string({ context: "server", access: "secret" }),
      SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID: envField.string({ context: "server", access: "secret" }),
      SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET: envField.string({ context: "server", access: "secret" }),
      // OPENROUTER_API_KEY: envField.string({ context: "server", access: "secret" }),
    },
  },
});
