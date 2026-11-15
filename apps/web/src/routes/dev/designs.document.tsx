import { createFileRoute } from "@tanstack/react-router";
import { DocumentDesign } from "./-designs/tech/DocumentDesign";

export const Route = createFileRoute("/dev/designs/document")({
  component: DocumentDesign,
});
