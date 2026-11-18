import type { CalculatedColumn, CollectionField, CollectionKey, Glance } from "@/features/notes/fact";
import type { IconName } from "./icons";

export type DaySpec = { ago: number } | { last: number } | { thisWeek: number } | { yearly: [month: number, day: number] } | { iso: string };

export type SampleValue = {
  v: string;
  f: string;
  e?: number;
  on?: DaySpec;
  amount?: number;
  before?: string;
  after?: string;
  unit?: string;
  seconds?: number;
};

export type Part = string | SampleValue;

export type Entry = { day?: DaySpec; label?: string };

export type ChangeTo = { text: string; amount?: number; seconds?: number };

export type ChangeSpec = { sentence: string; e?: number; f: string; to: ChangeTo };

export type Sample = { chip: string; parts: Part[]; entries: Entry[]; change?: ChangeSpec };

export type GlanceOption = { glance: Glance; label: string };

export type Recipe = {
  id: string;
  label: string;
  icon: IconName;
  folder: string;
  noteTitle: string;
  prompt: string;
  collection: { name: string; rowLabel: string; fields: CollectionField[]; columns?: CalculatedColumn[]; key: CollectionKey };
  glances: GlanceOption[];
  samples: Sample[];
  extras: Sample[];
};

const BY_DAY: CollectionKey = { by: "when", grain: "day" };
const BY_NAME: CollectionKey = { by: "name" };
const DATE_FIELD: CollectionField = { id: "date", name: "date", kind: "date" };

const SUN = 0;
const MON = 1;
const TUE = 2;
const WED = 3;
const THU = 4;
const FRI = 5;
const SAT = 6;

const day = (v: string, extra: Partial<SampleValue> = {}): SampleValue => ({ v, f: "date", ...extra });
const km = (amount: number, f = "distance", e?: number): SampleValue => ({ v: `${amount} km`, f, e, amount, before: "", after: " km", unit: "km" });
const kg = (amount: number, f = "weight", e?: number): SampleValue => ({ v: `${amount} kg`, f, e, amount, before: "", after: " kg", unit: "kg" });
const clock = (v: string, seconds: number, f = "time", e?: number): SampleValue => ({ v, f, e, seconds });
const pounds = (amount: number, f = "cost", e?: number): SampleValue => ({
  v: `£${new Intl.NumberFormat("en-GB").format(amount)}`,
  f,
  e,
  amount,
  before: "£",
  after: "",
  unit: "GBP",
});
const count = (amount: number, f: string, e?: number): SampleValue => ({ v: String(amount), f, e, amount, before: "", after: "" });
const words = (v: string, f: string, e?: number): SampleValue => ({ v, f, e });

const runs: Recipe = {
  id: "runs",
  label: "Running log",
  icon: "run",
  folder: "Running",
  noteTitle: "Running log",
  prompt: "Tell Dittle about a recent run.",
  collection: {
    name: "Runs",
    rowLabel: "run",
    fields: [DATE_FIELD, { id: "distance", name: "Distance", kind: "number" }, { id: "time", name: "Time", kind: "duration" }],
    columns: [{ id: "pace", name: "Pace", expr: "$1 / $2", inputs: ["time", "distance"] }],
    key: BY_DAY,
  },
  glances: [
    { glance: "total", label: "Distance this month" },
    { glance: "count", label: "Runs this week" },
    { glance: "average", label: "Average pace" },
  ],
  samples: [
    {
      chip: "this morning's run",
      parts: ["Ran ", km(5), " along the river ", day("this morning"), " in ", clock("27:40", 1660), "."],
      entries: [{ day: { ago: 0 } }],
      change: { sentence: "Actually this morning was 6 km, not 5", f: "distance", to: { text: "6 km", amount: 6 } },
    },
    {
      chip: "a lunchtime 7 km",
      parts: ["Lunchtime ", km(7), " ", day("yesterday"), " in ", clock("38:15", 2295), "."],
      entries: [{ day: { ago: 1 } }],
      change: { sentence: "Actually yesterday was 7.5 km, not 7", f: "distance", to: { text: "7.5 km", amount: 7.5 } },
    },
    {
      chip: "a parkrun PB",
      parts: ["Parkrun PB on ", day("Saturday"), ": ", km(5), " in ", clock("24:52", 1492), "."],
      entries: [{ day: { last: SAT } }],
      change: { sentence: "Actually the parkrun was 24:31, not 24:52", f: "time", to: { text: "24:31", seconds: 1471 } },
    },
  ],
  extras: [
    {
      chip: "Sunday's 8 km",
      parts: ["On ", day("Sunday"), " I ran ", km(8), " to Battersea Park and back in ", clock("46:10", 2770), "."],
      entries: [{ day: { last: SUN } }],
      change: { sentence: "Actually Sunday was 10 km, not 8", f: "distance", to: { text: "10 km", amount: 10 } },
    },
    {
      chip: "last Thursday's 6 km",
      parts: ["Easy ", km(6), " last ", day("Thursday"), " in ", clock("33:05", 1985), " with Priya."],
      entries: [{ day: { last: THU } }],
    },
  ],
};

const workouts: Recipe = {
  id: "workouts",
  label: "Workouts",
  icon: "dumbbell",
  folder: "Training",
  noteTitle: "Gym sessions",
  prompt: "Tell Dittle about your last workout.",
  collection: {
    name: "Workouts",
    rowLabel: "workout",
    fields: [DATE_FIELD, { id: "time", name: "Time", kind: "duration" }, { id: "weight", name: "Top weight", kind: "number" }],
    key: BY_DAY,
  },
  glances: [
    { glance: "count", label: "Workouts this week" },
    { glance: "total", label: "Time this month" },
  ],
  samples: [
    {
      chip: "leg day",
      parts: ["Leg day ", day("this morning"), ": ", clock("45 minutes", 2700), ", squats up to ", kg(80), "."],
      entries: [{ day: { ago: 0 } }],
      change: { sentence: "Actually squats went up to 85 kg, not 80", f: "weight", to: { text: "85 kg", amount: 85 } },
    },
    {
      chip: "an upper body session",
      parts: ["Upper body ", day("yesterday"), ", ", clock("50 minutes", 3000), ", bench press at ", kg(60), "."],
      entries: [{ day: { ago: 1 } }],
      change: { sentence: "Actually the bench was 62.5 kg, not 60", f: "weight", to: { text: "62.5 kg", amount: 62.5 } },
    },
  ],
  extras: [
    {
      chip: "Monday's deadlifts",
      parts: ["Deadlifts on ", day("Monday"), ", ", clock("40 minutes", 2400), ", top set ", kg(100), "."],
      entries: [{ day: { last: MON } }],
      change: { sentence: "Actually Monday's top set was 105 kg, not 100", f: "weight", to: { text: "105 kg", amount: 105 } },
    },
    {
      chip: "Saturday's circuit",
      parts: ["Circuit class on ", day("Saturday"), ", ", clock("30 minutes", 1800), " with ", kg(12), " kettlebells."],
      entries: [{ day: { last: SAT } }],
    },
  ],
};

const meals: Recipe = {
  id: "meals",
  label: "Weekly meal plan",
  icon: "fork",
  folder: "Meals",
  noteTitle: "This week's dinners",
  prompt: "What's for dinner this week?",
  collection: { name: "Dinners", rowLabel: "dinner", fields: [DATE_FIELD, { id: "dish", name: "Dish", kind: "text" }], key: BY_DAY },
  glances: [{ glance: "count", label: "Dinners planned this week" }],
  samples: [
    {
      chip: "three dinners",
      parts: [
        day("Monday"),
        " ",
        words("chilli", "dish"),
        ", ",
        day("Tuesday", { e: 1 }),
        " ",
        words("salmon traybake", "dish", 1),
        ", ",
        day("Wednesday", { e: 2 }),
        " ",
        words("pesto pasta", "dish", 2),
        ".",
      ],
      entries: [{ day: { thisWeek: MON } }, { day: { thisWeek: TUE } }, { day: { thisWeek: WED } }],
      change: { sentence: "Swap Tuesday to fish pie", e: 1, f: "dish", to: { text: "fish pie" } },
    },
    {
      chip: "a veggie week",
      parts: [day("Monday"), " ", words("dal", "dish"), ", ", day("Tuesday", { e: 1 }), " ", words("halloumi wraps", "dish", 1), "."],
      entries: [{ day: { thisWeek: MON } }, { day: { thisWeek: TUE } }],
      change: { sentence: "Swap Monday to mushroom risotto", f: "dish", to: { text: "mushroom risotto" } },
    },
  ],
  extras: [
    {
      chip: "Thursday's curry",
      parts: [day("Thursday"), " is ", words("green curry", "dish"), " with Sam."],
      entries: [{ day: { thisWeek: THU } }],
    },
    {
      chip: "Friday's pizza",
      parts: [day("Friday"), ": ", words("homemade pizza", "dish"), "."],
      entries: [{ day: { thisWeek: FRI } }],
      change: { sentence: "Swap Friday to takeaway", f: "dish", to: { text: "takeaway" } },
    },
  ],
};

const COST_DATE: CollectionField[] = [
  { id: "cost", name: "Cost", kind: "money" },
  { id: "date", name: "Date", kind: "date" },
];

const trips: Recipe = {
  id: "trips",
  label: "Trip plans",
  icon: "plane",
  folder: "Trips",
  noteTitle: "Lisbon in December",
  prompt: "Tell Dittle about a trip you're planning.",
  collection: { name: "Trip costs", rowLabel: "booking", fields: COST_DATE, key: BY_NAME },
  glances: [
    { glance: "countdown", label: "Days to Lisbon" },
    { glance: "total", label: "Trip total" },
  ],
  samples: [
    {
      chip: "the flights",
      parts: ["Flights to Lisbon on ", day("11 December", { on: { yearly: [12, 11] } }), ", ", pounds(236), " for the two of us."],
      entries: [{ label: "Flights" }],
      change: { sentence: "Actually the flights are £198, not £236", f: "cost", to: { text: "£198", amount: 198 } },
    },
    {
      chip: "the villa",
      parts: ["Villa in Alfama from ", day("11 December", { on: { yearly: [12, 11] } }), ", ", pounds(540), " for four nights."],
      entries: [{ label: "Villa" }],
      change: { sentence: "Actually the villa is £585, not £540", f: "cost", to: { text: "£585", amount: 585 } },
    },
  ],
  extras: [
    {
      chip: "the fado dinner",
      parts: ["Fado dinner on ", day("12 December", { on: { yearly: [12, 12] } }), ", ", pounds(90), " for two."],
      entries: [{ label: "Fado dinner" }],
    },
    {
      chip: "the Sintra train",
      parts: ["Train to Sintra on ", day("13 December", { on: { yearly: [12, 13] } }), ", ", pounds(24), "."],
      entries: [{ label: "Sintra train" }],
    },
  ],
};

const wedding: Recipe = {
  id: "wedding",
  label: "Wedding budget",
  icon: "heart",
  folder: "Wedding",
  noteTitle: "Wedding budget",
  prompt: "Tell Dittle about a wedding quote.",
  collection: { name: "Wedding budget", rowLabel: "supplier", fields: [{ id: "cost", name: "Cost", kind: "money" }], key: BY_NAME },
  glances: [
    { glance: "total", label: "Budget so far" },
    { glance: "count", label: "Suppliers" },
  ],
  samples: [
    {
      chip: "the caterer",
      parts: ["Rosa's Kitchen quoted ", pounds(3040), " for 80 guests."],
      entries: [{ label: "Catering" }],
      change: { sentence: "Actually the caterer is £3,400, not £3,040", f: "cost", to: { text: "£3,400", amount: 3400 } },
    },
    {
      chip: "the venue",
      parts: ["Hartley Barn is ", pounds(4500), " for the day."],
      entries: [{ label: "Venue" }],
      change: { sentence: "Actually the barn is £4,200, not £4,500", f: "cost", to: { text: "£4,200", amount: 4200 } },
    },
  ],
  extras: [
    { chip: "the flowers", parts: ["Flowers from Petal & Stem, ", pounds(650), "."], entries: [{ label: "Flowers" }] },
    { chip: "the band", parts: ["The Late Shift band, ", pounds(1200), " for the evening."], entries: [{ label: "Band" }] },
  ],
};

const reading: Recipe = {
  id: "reading",
  label: "Reading list",
  icon: "book",
  folder: "Reading",
  noteTitle: "Books this year",
  prompt: "Tell Dittle about a book you finished.",
  collection: {
    name: "Books",
    rowLabel: "book",
    fields: [
      { id: "pages", name: "Pages", kind: "count" },
      { id: "date", name: "Finished", kind: "date" },
    ],
    key: BY_NAME,
  },
  glances: [
    { glance: "count", label: "Books read" },
    { glance: "total", label: "Pages read" },
  ],
  samples: [
    {
      chip: "a novel",
      parts: ["Finished Tomorrow, and Tomorrow, and Tomorrow on ", day("Sunday", { on: { last: SUN } }), ", ", count(416, "pages"), " pages."],
      entries: [{ label: "Tomorrow, and Tomorrow, and Tomorrow" }],
      change: { sentence: "Actually it was 401 pages, not 416", f: "pages", to: { text: "401", amount: 401 } },
    },
    {
      chip: "a short one",
      parts: ["Read Small Things Like These ", day("yesterday", { on: { ago: 1 } }), ", only ", count(114, "pages"), " pages."],
      entries: [{ label: "Small Things Like These" }],
      change: { sentence: "Actually it was 128 pages, not 114", f: "pages", to: { text: "128", amount: 128 } },
    },
  ],
  extras: [
    { chip: "Piranesi", parts: ["Piranesi, ", count(272, "pages"), " pages, finished on ", day("1 November", { on: { yearly: [11, 1] } }), "."], entries: [{ label: "Piranesi" }] },
    { chip: "The Overstory", parts: ["The Overstory, ", count(502, "pages"), " pages, done ", day("last month", { on: { ago: 30 } }), "."], entries: [{ label: "The Overstory" }] },
  ],
};

const invoices: Recipe = {
  id: "invoices",
  label: "Freelance invoices",
  icon: "receipt",
  folder: "Invoices",
  noteTitle: "Invoices",
  prompt: "Tell Dittle about an invoice you sent.",
  collection: {
    name: "Invoices",
    rowLabel: "client",
    fields: [
      { id: "amount", name: "Amount", kind: "money" },
      { id: "date", name: "Due", kind: "date" },
    ],
    key: BY_NAME,
  },
  glances: [
    { glance: "total", label: "Invoiced so far" },
    { glance: "countdown", label: "Days to next payment" },
    { glance: "count", label: "Invoices" },
  ],
  samples: [
    {
      chip: "the logo job",
      parts: ["Invoiced Northwind ", pounds(1200, "amount"), " for the logo work, due ", day("30 November", { on: { yearly: [11, 30] } }), "."],
      entries: [{ label: "Northwind" }],
      change: { sentence: "Actually Northwind is £1,450, not £1,200", f: "amount", to: { text: "£1,450", amount: 1450 } },
    },
    {
      chip: "a day rate",
      parts: ["Two days for Fable Studio at ", pounds(900, "amount"), ", due ", day("5 December", { on: { yearly: [12, 5] } }), "."],
      entries: [{ label: "Fable Studio" }],
      change: { sentence: "Actually Fable Studio is £1,350, not £900", f: "amount", to: { text: "£1,350", amount: 1350 } },
    },
  ],
  extras: [
    { chip: "the Acme retainer", parts: ["Acme retainer ", pounds(2000, "amount"), ", due ", day("1 December", { on: { yearly: [12, 1] } }), "."], entries: [{ label: "Acme" }] },
    { chip: "the workshop", parts: ["Workshop for Brightside, ", pounds(650, "amount"), ", due ", day("15 December", { on: { yearly: [12, 15] } }), "."], entries: [{ label: "Brightside" }] },
  ],
};

const moving: Recipe = {
  id: "moving",
  label: "Moving house",
  icon: "box",
  folder: "Moving",
  noteTitle: "The move",
  prompt: "Tell Dittle about something you've booked for the move.",
  collection: { name: "Moving costs", rowLabel: "item", fields: COST_DATE, key: BY_NAME },
  glances: [
    { glance: "countdown", label: "Days to moving day" },
    { glance: "total", label: "Spent so far" },
  ],
  samples: [
    {
      chip: "the van",
      parts: ["Van booked for ", day("Sat 5 December", { on: { yearly: [12, 5] } }), ", ", pounds(180), "."],
      entries: [{ label: "Van" }],
      change: { sentence: "Actually the van is £210, not £180", f: "cost", to: { text: "£210", amount: 210 } },
    },
    {
      chip: "the removals firm",
      parts: ["Removals from Swift Move on ", day("5 December", { on: { yearly: [12, 5] } }), ", ", pounds(640), "."],
      entries: [{ label: "Removals" }],
      change: { sentence: "Actually Swift Move is £590, not £640", f: "cost", to: { text: "£590", amount: 590 } },
    },
  ],
  extras: [
    { chip: "the boxes", parts: ["Packing boxes and tape, ", pounds(45), " on ", day("Monday", { on: { last: MON } }), "."], entries: [{ label: "Boxes" }] },
    { chip: "the deposit", parts: ["Deposit for the flat, ", pounds(1500), ", due ", day("1 December", { on: { yearly: [12, 1] } }), "."], entries: [{ label: "Deposit" }] },
  ],
};

export const RECIPES: Recipe[] = [runs, workouts, meals, trips, wedding, reading, invoices, moving];

export const MAX_INTERACTIVE = 3;

const localIso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const shift = (today: Date, days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);

export function resolveDay(spec: DaySpec, today: Date): string {
  if ("iso" in spec) return spec.iso;
  if ("ago" in spec) return localIso(shift(today, -spec.ago));
  if ("last" in spec) return localIso(shift(today, -(((today.getDay() - spec.last + 6) % 7) + 1)));
  if ("thisWeek" in spec) {
    const monday = shift(today, -((today.getDay() + 6) % 7));
    return localIso(shift(monday, (spec.thisWeek + 6) % 7));
  }
  const [month, dayOfMonth] = spec.yearly;
  const thisYear = new Date(today.getFullYear(), month - 1, dayOfMonth);
  return localIso(thisYear >= shift(today, 0) ? thisYear : new Date(today.getFullYear() + 1, month - 1, dayOfMonth));
}

export const sentenceOf = (parts: Part[]) => parts.map((part) => (typeof part === "string" ? part : part.v)).join("");

export { localIso };
