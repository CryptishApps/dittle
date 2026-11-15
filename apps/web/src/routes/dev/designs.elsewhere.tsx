import { createFileRoute } from "@tanstack/react-router";
import { ElsewhereDesign } from "./-designs/tech/ElsewhereDesign";

export const Route = createFileRoute("/dev/designs/elsewhere")({
  component: ElsewhereDesign,
});
