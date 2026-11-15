import { createFileRoute } from "@tanstack/react-router";
import { MonoDesign } from "./-designs/mono/MonoDesign";

export const Route = createFileRoute("/dev/designs/mono")({
  component: MonoDesign,
});
