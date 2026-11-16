import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { startNote } from "@/features/notes/api";
import { Btn, MIcon } from "@/ui/kit";

export const Route = createFileRoute("/_app/notes/")({
  component: NoNoteOpen,
});

function NoNoteOpen() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const start = () => void navigate({ to: "/notes/$noteId", params: { noteId: startNote(queryClient, user.uid) } });

  return (
    <div className="grid flex-1 place-items-center px-6 text-center">
      <div>
        <p className="text-[13px] text-soft">Pick a note, or start a new one.</p>
        <Btn primary onClick={start} className="mt-5">
          <MIcon name="plus" className="size-3.5" />
          New note
        </Btn>
      </div>
    </div>
  );
}
