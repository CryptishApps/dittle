import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dev/designs/")({
  beforeLoad: () => {
    throw redirect({ to: "/dev/designs/mono" });
  },
});
