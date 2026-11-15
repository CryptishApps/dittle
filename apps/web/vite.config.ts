import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const buildRouteTree = "./src/routeTree.build.gen.ts";

export default defineConfig(({ command }) => {
  const build = command === "build";
  return {
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
        ...(build && { routeFileIgnorePattern: "^dev$", generatedRouteTree: buildRouteTree }),
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: build ? [{ find: /^\.\/routeTree\.gen$/, replacement: fileURLToPath(new URL(buildRouteTree, import.meta.url)) }] : [],
    },
    server: { port: 5180, strictPort: true },
  };
});
