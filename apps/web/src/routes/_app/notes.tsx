import { createFileRoute } from "@tanstack/react-router";
import { collectionsQuery, foldersQuery, loadStore, notesQuery, rowsQuery, valuesQuery } from "@/features/notes/api";
import { NotesShell } from "@/features/notes/NotesShell";

export const Route = createFileRoute("/_app/notes")({
  loader: async ({ context: { queryClient, user } }) => {
    const { uid } = user;
    await Promise.all([
      loadStore(),
      queryClient.ensureQueryData(notesQuery(uid)),
      queryClient.ensureQueryData(valuesQuery(uid)),
      queryClient.ensureQueryData(foldersQuery(uid)),
      queryClient.ensureQueryData(collectionsQuery(uid)),
      queryClient.ensureQueryData(rowsQuery(uid)),
    ]);
  },
  component: NotesRoute,
});

function NotesRoute() {
  const { user } = Route.useRouteContext();
  return <NotesShell user={user} />;
}
