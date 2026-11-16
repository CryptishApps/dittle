import { createFileRoute } from "@tanstack/react-router";
import { CollectionPage } from "@/features/collections/CollectionPage";

export const Route = createFileRoute("/_app/notes/collections/$collectionId")({
  component: CollectionRoute,
});

function CollectionRoute() {
  const { user } = Route.useRouteContext();
  const { collectionId } = Route.useParams();
  return <CollectionPage key={collectionId} uid={user.uid} collectionId={collectionId} />;
}
