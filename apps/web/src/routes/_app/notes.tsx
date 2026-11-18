import { createFileRoute } from "@tanstack/react-router";
import { cachedThenLive, collectionsQuery, foldersQuery, notesQuery, rowsQuery, valuesQuery } from "@/features/notes/api";
import { NotesShell } from "@/features/notes/NotesShell";

export const Route = createFileRoute("/_app/notes")({
  loader: ({ context: { queryClient, account } }) => {
    const { uid } = account;
    const quietly = (loading: Promise<unknown>) => void loading.catch(() => undefined);
    quietly(cachedThenLive(queryClient, notesQuery(uid)));
    quietly(cachedThenLive(queryClient, valuesQuery(uid)));
    quietly(cachedThenLive(queryClient, foldersQuery(uid)));
    quietly(cachedThenLive(queryClient, collectionsQuery(uid)));
    quietly(cachedThenLive(queryClient, rowsQuery(uid)));
  },
  component: NotesRoute,
});

function NotesRoute() {
  const { account } = Route.useRouteContext();
  return <NotesShell account={account} />;
}
