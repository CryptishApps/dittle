import { createFileRoute } from "@tanstack/react-router";
import { Welcome } from "../../features/welcome/Welcome";

export const Route = createFileRoute("/dev/designs/welcome")({
  component: () => <Welcome onStart={() => undefined} onGoogle={() => undefined} />,
});
