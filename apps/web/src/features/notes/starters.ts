import type { Block, NoteDoc } from "./note-doc";

export type Starter = { title: string; summary: string; doc: NoteDoc };

const text = (value: string) => [{ t: "text" as const, text: value }];
const h1 = (value: string): Block => ({ t: "h", level: 1, c: text(value) });
const h2 = (value: string): Block => ({ t: "h", level: 2, c: text(value) });
const p = (value: string): Block => ({ t: "p", c: text(value) });
const bullets = (...items: string[]): Block => ({ t: "ul", items: items.map((item) => ({ c: text(item) })) });
const todos = (...items: [string, boolean][]): Block => ({ t: "todo", items: items.map(([item, done]) => ({ done, c: text(item) })) });

const starter = (title: string, summary: string, ...body: Block[]): Starter => ({ title, summary, doc: { v: 1, blocks: [h1(title), ...body] } });

export const STARTERS: Starter[] = [
  starter(
    "Running log",
    "Three runs, each with a distance, a time and a day, ready to become a Runs collection.",
    p("Ran 5 km along the river today in 27:40. Legs felt fine after the long one."),
    p("On Saturday I ran 8 km to Battersea Park and back in 46:10."),
    p("Last Wednesday was an easy 6 km in 33:05 with Priya."),
    h2("Next"),
    todos(["Sign up for the Richmond 10K, £32 entry", true], ["New shoes before they pass 500 km", false], ["Try a 10 km run before 30 November", false]),
  ),
  starter(
    "Wedding budget",
    "Caterer quotes per head, a guest count and a venue deposit with a date.",
    p("We're planning for 80 guests at Hartley Barn on Sat 12 June 2027."),
    h2("Catering"),
    p("Rosa's Kitchen quoted £38 a head, so about £3,040 for everyone. Hops & Co are £42 a head but include the bar."),
    h2("Venue"),
    p("The barn is £4,500 for the day, with a £500 deposit due by 1 March."),
    bullets("Holds 120 seated, so there's room for the evening guests", "Tables and chairs included", "Last music at 11:30pm"),
    h2("To do"),
    todos(["Book a tasting with both caterers", false], ["Pay the £500 deposit", false], ["Send save the dates", true]),
  ),
  starter(
    "Lisbon long weekend",
    "Dates, prices for each plan, and a request Dittle can write for you.",
    p("Flights land on Fri 11 December at 9:40. Seats are £118 each for the 6 of us."),
    p("The villa in Alfama is €1,680 for four nights, ten minutes' walk from the 28 tram."),
    h2("Plans"),
    bullets(
      "Sat 12 December: Clube de Fado with dinner, €45 each, at 9pm",
      "Sun 13 December: Pena Palace and the train to Sintra, €32 each",
      "Mon 14 December: taxis to the airport at 6am",
    ),
    h2("Packing"),
    p("Write a packing list for a long weekend in Lisbon in December."),
  ),
  starter(
    "Team offsite",
    "A headcount, a room rate and a total that follows them.",
    p("22 of us at Fernhill House from Thu 4 March to Fri 5 March."),
    p("Rooms are £145 a night each, so £3,190 for the night. The coach from King's Cross leaves at 8:30 and costs £640 return."),
    h2("Agenda"),
    bullets("Thursday morning: where we are and what's next", "Thursday afternoon: team workshops", "Friday: walk and lunch, back by 4pm"),
    h2("To do"),
    todos(["Confirm dietary needs by 15 February", false], ["Book the coach", false]),
  ),
];
