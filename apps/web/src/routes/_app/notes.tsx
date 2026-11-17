import { createFileRoute } from "@tanstack/react-router";
import { cachedThenLive, collectionsQuery, foldersQuery, notesQuery, rowsQuery, valuesQuery } from "@/features/notes/api";
import { NotesShell } from "@/features/notes/NotesShell";

export const Route = createFileRoute("/_app/notes")({
  loader: async ({ context: { queryClient, account } }) => {
    const { uid } = account;
    await Promise.all([
      cachedThenLive(queryClient, notesQuery(uid)),
      cachedThenLive(queryClient, valuesQuery(uid)),
      cachedThenLive(queryClient, foldersQuery(uid)),
      cachedThenLive(queryClient, collectionsQuery(uid)),
      cachedThenLive(queryClient, rowsQuery(uid)),
    ]);
  },
  component: NotesRoute,
});

function NotesRoute() {
  const { account } = Route.useRouteContext();
  return <NotesShell account={account} />;
}
