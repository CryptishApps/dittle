import { createFileRoute } from "@tanstack/react-router";
import { EditorMock } from "./-designs/EditorMock";

export const Route = createFileRoute("/dev/designs/editor")({
  component: EditorMock,
});
