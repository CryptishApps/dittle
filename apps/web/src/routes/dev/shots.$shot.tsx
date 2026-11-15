import { createFileRoute, notFound } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BucketsPanel, CollectionsPanel, InsertPanel, MeterPanel, OfflinePanel, RecalcPanel, UpdatePanel } from "./-designs/panels";

const SHOTS: Record<string, () => ReactNode> = {
  update: () => <UpdatePanel />,
  insert: () => <InsertPanel peek />,
  recalc: () => <RecalcPanel />,
  buckets: () => <BucketsPanel />,
  collections: () => <CollectionsPanel />,
  offline: () => <OfflinePanel />,
  activity: () => <MeterPanel />,
};

export const Route = createFileRoute("/dev/shots/$shot")({
  loader: ({ params }) => {
    if (!SHOTS[params.shot]) throw notFound();
  },
  component: Shot,
});

function Shot() {
  const { shot } = Route.useParams();
  return (
    <div className="p-10">
      <div data-shot className="w-[600px] p-4">
        {SHOTS[shot]!()}
      </div>
    </div>
  );
}
