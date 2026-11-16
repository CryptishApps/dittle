import { createFileRoute } from "@tanstack/react-router";
import { foldersQuery, loadStore, notesQuery, valuesQuery } from "@/features/notes/api";
import { NotesShell } from "@/features/notes/NotesShell";

export const Route = createFileRoute("/_app/notes")({
  loader: async ({ context: { queryClient, user } }) => {
    await Promise.all([loadStore(), queryClient.ensureQueryData(notesQuery(user.uid)), queryClient.ensureQueryData(valuesQuery(user.uid)), queryClient.ensureQueryData(foldersQuery(user.uid))]);
  },
  component: NotesRoute,
});

function NotesRoute() {
  const { user } = Route.useRouteContext();
  return <NotesShell user={user} />;
}
