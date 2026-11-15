import { createFileRoute, notFound } from "@tanstack/react-router";
import { NoteDesign, type NoteVariant } from "./-designs/tech/NoteDesign";

const VARIANTS: NoteVariant[] = ["page", "margin", "sheet"];

export const Route = createFileRoute("/dev/designs/note/$variant")({
  beforeLoad: ({ params }) => {
    if (!VARIANTS.includes(params.variant as NoteVariant)) throw notFound();
  },
  component: NoteRoute,
});

function NoteRoute() {
  const { variant } = Route.useParams();
  return <NoteDesign key={variant} variant={variant as NoteVariant} />;
}
