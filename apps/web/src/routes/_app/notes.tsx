import { createFileRoute } from "@tanstack/react-router";
import { loadStore, notesQuery } from "@/features/notes/api";
import { NotesShell } from "@/features/notes/NotesShell";

export const Route = createFileRoute("/_app/notes")({
  loader: async ({ context: { queryClient, user } }) => {
    await Promise.all([loadStore(), queryClient.ensureQueryData(notesQuery(user.uid))]);
  },
  component: NotesRoute,
});

function NotesRoute() {
  const { user } = Route.useRouteContext();
  return <NotesShell user={user} />;
}
