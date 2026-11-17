import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/features/notes/HomePage";

export const Route = createFileRoute("/_app/notes/")({
  component: Home,
});

function Home() {
  const { user } = Route.useRouteContext();
  return <HomePage uid={user.uid} />;
}
