import { createFileRoute } from "@tanstack/react-router";
import { Moments } from "./-designs/Moments";

export const Route = createFileRoute("/dev/designs/moments")({
  component: Moments,
});
