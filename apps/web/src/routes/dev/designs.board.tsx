import { createFileRoute } from "@tanstack/react-router";
import { BoardDesign } from "./-designs/tech/BoardDesign";

export const Route = createFileRoute("/dev/designs/board")({
  component: BoardDesign,
});
