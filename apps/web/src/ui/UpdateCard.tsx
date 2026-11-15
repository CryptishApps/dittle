import { SourceTag } from "./InferenceMeter";

export type Mention = { note: string; before: string; after: string };

export function UpdateCard({
  change,
  mentions,
  onUpdateAll,
  onSkip,
}: {
  change: string;
  mentions: Mention[];
  onUpdateAll: () => void;
  onSkip: () => void;
}) {
  return (
    <div role="dialog" aria-label="Update other notes" className="w-[22rem] rounded-2xl border border-rule bg-paper-raised p-1 shadow-pop">
      <div className="flex items-start justify-between gap-3 px-3 pt-3 pb-2">
        <div>
          <p className="text-[14px] font-semibold">{change}</p>
          <p className="text-[12px] text-ink-soft">
            Also in {mentions.length} other {mentions.length === 1 ? "note" : "notes"}
          </p>
        </div>
        <SourceTag source="device" />
      </div>
      <ul className="mx-1 rounded-xl bg-paper px-3 py-1">
        {mentions.map((mention) => (
          <li key={mention.note} className="border-b border-rule py-2 last:border-0">
            <p className="text-[11px] font-medium text-ink-faint">{mention.note}</p>
            <p className="text-[13px]">
              <span className="text-ink-faint line-through decoration-ink-faint/60">{mention.before}</span>
              <span className="px-1.5 text-ink-faint">→</span>
              {mention.after}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-1 px-2 pt-2 pb-1.5">
        <button type="button" onClick={onSkip} className="rounded-full px-3 py-1.5 text-[13px] text-ink-soft hover:bg-paper-sunk hover:text-ink">
          Just this note
        </button>
        <button
          type="button"
          onClick={onUpdateAll}
          className="rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-accent-ink hover:brightness-105"
        >
          Update all
        </button>
      </div>
    </div>
  );
}
