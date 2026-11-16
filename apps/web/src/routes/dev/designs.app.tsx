import { createFileRoute } from "@tanstack/react-router";
import { domMax, LazyMotion } from "motion/react";
import { NotesApp } from "@/features/notes/NotesApp";

export const Route = createFileRoute("/dev/designs/app")({
  component: () => (
    <LazyMotion features={domMax}>
      <NotesApp />
    </LazyMotion>
  ),
});
