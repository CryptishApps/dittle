import type { ReactNode } from "react";
import { MIcon } from "../../ui/kit";

export function Scenes() {
  return (
    <div className="grid gap-5 lg:grid-cols-6">
      <Scene
        className="lg:col-span-4"
        title="Notes that stay in step"
        body="Hops & Co raised their quote. Change it in the catering note and the budget note follows, along with the total worked out from it."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Sheet title="Catering">
            Hops & Co now quote{" "}
            <span className="value-chip" data-proposal="true">
              £42
            </span>{" "}
            a head for <span className="value-chip">80</span> guests, bar included.
          </Sheet>
          <Sheet title="Budget">
            Catering comes to{" "}
            <span className="value-chip" data-proposal="true">
              £3,360
            </span>
            , up from <s className="decoration-accent decoration-2">£3,040</s>. The barn is <span className="value-chip">£4,500</span>.
          </Sheet>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[13.5px] font-medium text-accent-ink">
          <MIcon name="check" className="size-4" />2 notes updated · total worked out by code
        </p>
      </Scene>

      <Scene className="lg:col-span-2" title="Logs that file themselves" body="Write down a run and it lands in your Runs collection as today's row.">
        <div className="overflow-hidden rounded-2xl bg-card text-[14.5px] shadow-[0_0_0_1px_var(--line)]">
          {[
            ["Today", "5 km", "27:40"],
            ["Sat", "8 km", "46:10"],
            ["Wed", "6 km", "33:05"],
          ].map(([day, distance, time], index) => (
            <div key={day} className="flex items-center justify-between gap-2 border-t border-line px-4 py-2 first:border-t-0">
              <span className={index === 0 ? "font-semibold" : "text-soft"}>{day}</span>
              <span className="flex gap-1.5">
                <span className="value-chip" data-proposal={index === 0 ? "true" : undefined}>
                  {distance}
                </span>
                <span className="value-chip">{time}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[14px] text-soft">
          <span className="font-semibold text-ink">19 km</span> this week · 5:38 a km
        </p>
      </Scene>

      <Scene className="lg:col-span-2" title="Dates that count down" body="The next dates in your notes count down on your home page.">
        <div className="flex items-center gap-4">
          <span aria-hidden className="w-[78px] shrink-0 -rotate-3 overflow-hidden rounded-2xl bg-card text-center shadow-[0_0_0_1px_var(--line),0_14px_20px_-14px_rgb(18_20_24/0.4)]">
            <span className="block bg-date py-1 text-[11px] font-bold tracking-[0.08em] text-date-ink">DEC</span>
            <span className="block pt-0.5 text-[32px] leading-tight font-semibold">11</span>
            <span className="block pb-1.5 text-[11px] font-semibold text-soft">Friday</span>
          </span>
          <span>
            <span className="block text-[34px] leading-none font-semibold tracking-[-0.04em]">24 days</span>
            <span className="mt-1 block text-[14.5px] text-soft">until the flight to Lisbon</span>
          </span>
        </div>
        <ul className="mt-4 divide-y divide-line text-[14.5px]">
          <li className="flex justify-between py-2">
            <span className="font-medium">Clube de Fado</span>
            <span className="text-soft">Sat 12 Dec</span>
          </li>
          <li className="flex justify-between py-2">
            <span className="font-medium">Pena Palace</span>
            <span className="text-soft">Sun 13 Dec</span>
          </li>
        </ul>
      </Scene>

      <Scene className="lg:col-span-2" title="Ask in the note" body="Write what you need where you need it. A button appears with it already written.">
        <p className="text-[15px] leading-[1.8]">
          <span className="text-soft underline decoration-accent-line decoration-dashed decoration-2 underline-offset-[6px]">Write a packing list for a long weekend in Lisbon.</span>{" "}
          <span className="inline-flex items-center gap-1 rounded-[9px] bg-accent px-2.5 text-[13.5px] leading-[1.9] font-semibold text-on-accent shadow-press">
            <MIcon name="plus" className="size-3.5" />
            Add a packing list
          </span>
        </p>
        <ul className="mt-3 space-y-1.5 rounded-2xl bg-card px-4 py-3 text-[14px] shadow-[0_0_0_1px_var(--line)]">
          {["Walking shoes for the hills", "A light jacket for evenings", "Plug adapter"].map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <span aria-hidden className="size-4 shrink-0 rounded-[5px] border-[1.5px] border-line-strong" />
              {item}
            </li>
          ))}
        </ul>
      </Scene>

      <Scene className="lg:col-span-2" title="Collections it suggests" body="When the same kind of detail turns up across notes, Dittle offers to line them up.">
        <div className="sticky-note rotate-1 px-5 pt-4 pb-5">
          <p className="text-[13px] font-semibold text-sticky-soft">Suggested collection</p>
          <p className="mt-1 text-[20px] leading-tight font-semibold tracking-[-0.02em]">Things to do</p>
          <p className="mt-1 text-[14px]">3 rows · price each, date</p>
          <span className="mt-3 flex gap-2">
            <span className="inline-flex h-8 items-center rounded-[9px] bg-sticky-ink px-3.5 text-[13.5px] font-semibold text-sticky">Create</span>
            <span className="inline-flex h-8 items-center rounded-[9px] bg-sticky-ink/8 px-3.5 text-[13.5px] font-semibold">Not now</span>
          </span>
        </div>
      </Scene>
    </div>
  );
}

function Scene({ title, body, className, children }: { title: string; body: string; className: string; children: ReactNode }) {
  return (
    <article className={`tile flex flex-col p-5 sm:p-6 ${className}`}>
      <div aria-hidden className="desk flex-1 rounded-[18px] p-4 sm:p-5">
        {children}
      </div>
      <h3 className="mt-5 text-[21px] font-semibold tracking-[-0.025em]">{title}</h3>
      <p className="mt-1.5 text-[15.5px] leading-[1.6] text-soft">{body}</p>
    </article>
  );
}

function Sheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-card px-4 py-3.5 shadow-[0_0_0_1px_var(--line)]">
      <p className="flex items-center gap-2 text-[13.5px] font-semibold">
        <MIcon name="file" className="size-4 text-accent" />
        {title}
      </p>
      <p className="mt-1.5 text-[15px] leading-[1.85] text-soft">{children}</p>
    </div>
  );
}
