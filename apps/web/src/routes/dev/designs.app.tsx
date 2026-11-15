import { createFileRoute } from "@tanstack/react-router";
import { NotesApp } from "../../features/notes/NotesApp";

export const Route = createFileRoute("/dev/designs/app")({
  component: NotesApp,
});
