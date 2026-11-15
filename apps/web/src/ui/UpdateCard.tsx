export type Mention = { note: string; before: string; after: string };

export function UpdateCard({
  change,
  mentions,
  onUpdateAll,
  onSkip,
  flat = false,
}: {
  change: string;
  mentions: Mention[];
  onUpdateAll: () => void;
  onSkip: () => void;
  flat?: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-label="Update other notes"
      className={`w-[23rem] rounded-[22px] bg-[#121212] p-1.5 text-white dark:bg-[#232322] ${flat ? "" : "shadow-pop"}`}
    >
      <div className="flex items-start justify-between gap-3 px-3 pt-2.5 pb-2.5">
        <div>
          <p className="text-[15px] font-bold">{change}</p>
          <p className="text-[13px] text-white/55">
            Also in {mentions.length} other {mentions.length === 1 ? "note" : "notes"}
          </p>
        </div>
        <span className="rounded-full bg-hl-green px-2.5 py-1 text-[11px] leading-none font-bold text-hl-ink">On device</span>
      </div>
      <ul className="rounded-2xl bg-white/[0.07] px-3.5 py-1">
        {mentions.map((mention) => (
          <li key={mention.note} className="border-b border-white/10 py-2.5 last:border-0">
            <p className="text-[11px] font-semibold text-white/45">{mention.note}</p>
            <p className="text-[14px]">
              <span className="text-white/40 line-through decoration-white/40">{mention.before}</span>
              <span className="px-1.5 text-white/40">→</span>
              {mention.after}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-1 px-1 pt-1.5">
        <button type="button" onClick={onSkip} className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-white/65 hover:text-white">
          Just this note
        </button>
        <button type="button" onClick={onUpdateAll} className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#121212]">
          Update all
        </button>
      </div>
    </div>
  );
}
