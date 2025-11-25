import { defineConfig } from "vitest/config";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    devtools(),
    nitro({ preset: "bun" }),
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  },
  test: {
    exclude: ["e2e/**", "node_modules/**"],
  },
});
