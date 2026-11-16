import { createRouter, RouterProvider } from "@tanstack/react-router";
import { LazyMotion } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { readSession, sessionHint } from "./lib/session";
import { routeTree } from "./routeTree.gen";
import "./styles/theme.css";

const loadMotionFeatures = () => import("./ui/motion-features").then((module) => module.default);

const router = createRouter({
  routeTree,
  context: { session: { hint: sessionHint, read: readSession } },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LazyMotion features={loadMotionFeatures} strict>
      <RouterProvider router={router} />
    </LazyMotion>
  </StrictMode>,
);
