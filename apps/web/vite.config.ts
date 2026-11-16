import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { routePreload } from "./build/route-preload.ts";
import { SESSION_HINT_KEY } from "./src/lib/session-key.ts";

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
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      routePreload({
        routesDir: fileURLToPath(new URL("./src/routes/", import.meta.url)),
        authModule: fileURLToPath(new URL("./src/lib/auth.ts", import.meta.url)),
        sessionKey: SESSION_HINT_KEY,
        everyPage: [fileURLToPath(new URL("./src/ui/motion-features.ts", import.meta.url))],
      }),
    ],
    resolve: {
      alias: [
        { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
        ...(build ? [{ find: /^\.\/routeTree\.gen$/, replacement: fileURLToPath(new URL(buildRouteTree, import.meta.url)) }] : []),
      ],
    },
    server: { port: 5180, strictPort: true },
  };
});
