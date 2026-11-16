import { createFileRoute } from "@tanstack/react-router";
import { noteQuery, valuesQuery } from "@/features/notes/api";
import { NotePage } from "@/features/notes/NotePage";

export const Route = createFileRoute("/_app/notes/$noteId")({
  loader: async ({ context: { queryClient, user }, params }) => {
    await Promise.all([queryClient.ensureQueryData(noteQuery(user.uid, params.noteId)), queryClient.ensureQueryData(valuesQuery(user.uid))]);
  },
  component: NoteRoute,
});

function NoteRoute() {
  const { user } = Route.useRouteContext();
  const { noteId } = Route.useParams();
  return <NotePage key={noteId} uid={user.uid} noteId={noteId} />;
}
