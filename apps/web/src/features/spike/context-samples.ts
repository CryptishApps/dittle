import type { Grain, TagKind } from "@/features/ai/describe";

export const CONTEXT_TODAY = new Date(2026, 10, 16);

export type ExpectedContext = {
  quote: string;
  kind?: TagKind;
  about?: string;
  event?: boolean;
  when?: { on: string; grain: Grain } | null;
  conditions?: string[];
  remarks?: string[];
  seconds?: number;
};

export type ContextCase = { id: string; note: string; text: string; expect: ExpectedContext[] };

export const CONTEXT_CASES: ContextCase[] = [
  {
    id: "c1",
    note: "Training log",
    text: "I ran 5 km today.",
    expect: [{ quote: "5 km", about: "run", event: true, when: { on: "2026-11-16", grain: "day" }, conditions: [], remarks: [] }],
  },
  {
    id: "c4",
    note: "Training log",
    text: "I ran my fastest 5K today.",
    expect: [{ quote: "5K", about: "run", event: true, when: { on: "2026-11-16", grain: "day" }, conditions: [], remarks: ["fastest"] }],
  },
  {
    id: "c6",
    note: "Training log",
    text: "My fastest 5K is still the one from March.",
    expect: [{ quote: "5K", about: "run", when: { on: "2026-03", grain: "month" }, remarks: ["fastest"] }],
  },
  {
    id: "c7",
    note: "Wedding",
    text: "Rosa's Kitchen can do 80 people on Saturdays.",
    expect: [{ quote: "80", kind: "count", about: "Rosa", event: false, when: null, conditions: ["on Saturdays"] }],
  },
  {
    id: "c10",
    note: "Wedding",
    text: "On weekdays Rosa's Kitchen only seats 60.",
    expect: [{ quote: "60", kind: "count", about: "Rosa", event: false, when: null, conditions: ["weekdays"] }],
  },
  {
    id: "c17",
    note: "Lisbon trip",
    text: "The Alfama hotel is €165 a night in August.",
    expect: [{ quote: "€165", kind: "money", about: "hotel", event: false, conditions: ["in August"] }],
  },
  {
    id: "c18",
    note: "Garden",
    text: "Planted 12 tomato seedlings on Saturday.",
    expect: [{ quote: "12", kind: "count", about: "tomato", event: true, when: { on: "2026-11-14", grain: "day" } }],
  },
  {
    id: "c20",
    note: "Football",
    text: "Mia scored 2 goals on Sunday and Leo scored 2 as well.",
    expect: [
      { quote: "2", about: "Mia", event: true, when: { on: "2026-11-15", grain: "day" } },
      { quote: "2", about: "Leo", event: true, when: { on: "2026-11-15", grain: "day" } },
    ],
  },
  {
    id: "d1",
    note: "Training log",
    text: "Parkrun this morning: 5 km in 27:40, my best yet.",
    expect: [
      { quote: "5 km", about: "run", event: true, when: { on: "2026-11-16", grain: "day" } },
      { quote: "27:40", kind: "duration", about: "run", event: true, seconds: 1660 },
    ],
  },
  {
    id: "d2",
    note: "Lisbon trip",
    text: "The flight from Gatwick to Lisbon is 2:40 each way.",
    expect: [{ quote: "2:40", kind: "duration", about: "flight", event: false, seconds: 9600 }],
  },
  {
    id: "d3",
    note: "Recipes",
    text: "Slow-roast the lamb shoulder for 4 hours, then rest it for 20 minutes.",
    expect: [
      { quote: "4 hours", kind: "duration", seconds: 14_400 },
      { quote: "20 minutes", kind: "duration", seconds: 1200 },
    ],
  },
  {
    id: "d4",
    note: "Cycling",
    text: "Sunday's 60 km ride took 2:05:30 with one stop.",
    expect: [
      { quote: "60 km", about: "ride", event: true, when: { on: "2026-11-15", grain: "day" } },
      { quote: "2:05:30", kind: "duration", about: "ride", event: true, when: { on: "2026-11-15", grain: "day" }, seconds: 7530 },
    ],
  },
];
