import { createFileRoute } from "@tanstack/react-router";
import { cachedThenLive, noteQuery, valuesQuery } from "@/features/notes/api";
import { NotePage } from "@/features/notes/NotePage";

export const Route = createFileRoute("/_app/notes/$noteId")({
  loader: ({ context: { queryClient, account }, params }) => {
    void cachedThenLive(queryClient, noteQuery(account.uid, params.noteId)).catch(() => undefined);
    void cachedThenLive(queryClient, valuesQuery(account.uid)).catch(() => undefined);
  },
  component: NoteRoute,
});

function NoteRoute() {
  const { account } = Route.useRouteContext();
  const { noteId } = Route.useParams();
  return <NotePage key={noteId} uid={account.uid} noteId={noteId} />;
}
