import { m } from "motion/react";
import { ease } from "../../ui/kit";
import { FRAME, Icon, VALUE, useLoop } from "./quiet";

const STEPS = [1400, 1400, 7000];

const CHAT: { who: string; said: string }[] = [
  { who: "Tom", said: "villa’s confirmed!! €1,680 for the 4 nights" },
  { who: "Ana", said: "flights are £118 each, we land 9:40 fri 11th" },
  { who: "Tom", said: "so 6 of us right?" },
  { who: "Mia", said: "I’m out sorry, work thing" },
  { who: "Ana", said: "ok 5 then. fado on the sat is €45pp, I’ll book 9pm" },
];

export function TidyDemo() {
  const { ref, step } = useLoop(STEPS);
  const tidy = step === 2;
  return (
    <div ref={ref} className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.15fr)] lg:gap-8">
      <div>
        <p className="text-[13px] font-semibold text-faint">You pasted</p>
        <ul className="mt-3 space-y-2" aria-label="A pasted group chat">
          {CHAT.map((line, index) => (
            <li key={index} className="rounded-xl bg-panel px-3.5 py-2.5">
              <p className="text-[12.5px] font-semibold text-faint">{line.who}</p>
              <p className="text-[15px] leading-snug">{line.said}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-center pt-1 text-faint lg:pt-48">
        <Icon name="arrow" className="size-5 rotate-90 lg:rotate-0" />
      </div>
      <div>
        <p className="text-[13px] font-semibold text-faint">Dittle made</p>
        <m.div
          className={`${FRAME} mt-3 p-5 sm:p-7`}
          animate={{ opacity: step === 0 ? 0.35 : 1 }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="text-[24px] font-semibold tracking-[-0.025em]">Lisbon long weekend</p>
          <m.div
            className="mt-3 space-y-1.5 text-[16px] leading-[1.75]"
            initial={false}
            animate={{ opacity: tidy ? 1 : 0, y: tidy ? 0 : 6 }}
            transition={{ duration: 0.6, ease }}
          >
            <p>
              <span className={VALUE}>5</span> of us. Mia can’t come.
            </p>
            <p>
              Land <span className={VALUE}>Fri 11 Dec</span> at <span className={VALUE}>9:40</span>. Flights <span className={VALUE}>£118</span> each.
            </p>
            <p>
              Villa confirmed, <span className={VALUE}>€1,680</span> for <span className={VALUE}>4 nights</span>, so <span className={VALUE}>€336</span> each.
            </p>
            <p>
              Sat: fado at <span className={VALUE}>9pm</span>, <span className={VALUE}>€45</span> each. Ana is booking.
            </p>
            <div className="mt-4 border-t border-line pt-3 text-[13.5px] leading-relaxed text-faint">
              <p>Adds Fri 11 Dec to Coming up</p>
              <p>€336 each follows the villa price and the head count</p>
            </div>
          </m.div>
        </m.div>
      </div>
    </div>
  );
}
