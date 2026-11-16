import type { LinkFact } from "@/features/ai/link";

export type LinkCase = { id: string; sentence: string; item: LinkFact; candidates: LinkFact[]; expect: { match: number | null; changed?: boolean } };

const fact = (text: string, kind: LinkFact["kind"], name: string, about: string, extra: Partial<LinkFact> = {}): LinkFact => ({ text, kind, name, about, ...extra });

export const LINK_CASES: LinkCase[] = [
  {
    id: "L0",
    sentence: "Update for the wedding: we now expect 95 guests.",
    item: fact("95", "count", "guest_count", "wedding"),
    candidates: [fact("80", "count", "guest_count", "wedding", { noteTitle: "Catering" }), fact("120", "count", "venue_capacity", "Hartley Barn", { noteTitle: "Venue" })],
    expect: { match: 0, changed: true },
  },
  {
    id: "L0b",
    sentence: "Update for the wedding: we now expect 95 guests.",
    item: fact("95", "count", "guest_count", "wedding"),
    candidates: [fact("80", "count", "guest_count", "buffet", { noteTitle: "Catering", sentence: "Rosa's Kitchen can do a buffet for the wedding, 80 guests." })],
    expect: { match: 0, changed: true },
  },
  {
    id: "L3",
    sentence: "Legs are sore after this morning's 5 km.",
    item: fact("5 km", "number", "distance", "run", { when: { on: "2026-11-16", grain: "day" } }),
    candidates: [fact("5 km", "number", "distance", "run", { when: { on: "2026-11-16", grain: "day" }, noteTitle: "Training log" })],
    expect: { match: 0, changed: false },
  },
  {
    id: "L8",
    sentence: "Rosa's Kitchen can do 80 people.",
    item: fact("80", "count", "capacity", "Rosa's Kitchen"),
    candidates: [fact("80", "count", "capacity", "Rosa's Kitchen", { conditions: ["on Saturdays"], noteTitle: "Catering" })],
    expect: { match: null },
  },
  {
    id: "L9",
    sentence: "Rosa's now says 100 on Saturdays.",
    item: fact("100", "count", "capacity", "Rosa's Kitchen", { conditions: ["on Saturdays"] }),
    candidates: [
      fact("80", "count", "guest_count", "wedding", { noteTitle: "Catering" }),
      fact("80", "count", "capacity", "Rosa's Kitchen", { conditions: ["on Saturdays"], noteTitle: "Catering" }),
    ],
    expect: { match: 1, changed: true },
  },
  {
    id: "L11",
    sentence: "Rent goes up to £1,420 from 1 January.",
    item: fact("£1,420", "money", "rent", "flat"),
    candidates: [fact("£1,350", "money", "rent", "flat", { noteTitle: "Home costs" })],
    expect: { match: 0, changed: true },
  },
  {
    id: "L15",
    sentence: "The design team is 6 people now.",
    item: fact("6", "count", "team_size", "design team"),
    candidates: [fact("6", "count", "team_size", "payments team", { noteTitle: "Work" })],
    expect: { match: null },
  },
  {
    id: "L16",
    sentence: "We agreed sprints stay at two weeks.",
    item: fact("two weeks", "duration", "sprint_length", "sprints"),
    candidates: [fact("two weeks", "duration", "sprint_length", "sprints", { noteTitle: "Work" })],
    expect: { match: 0, changed: false },
  },
  {
    id: "L21",
    sentence: "For the double batch use 500g flour.",
    item: fact("500g", "number", "flour", "banana bread", { conditions: ["For the double batch"] }),
    candidates: [fact("250g", "number", "flour", "banana bread", { noteTitle: "Recipes" })],
    expect: { match: null },
  },
  {
    id: "L22",
    sentence: "Rosa's final invoice came to £3,180.",
    item: fact("£3,180", "money", "invoice_total", "Rosa's Kitchen"),
    candidates: [fact("£3,040", "money", "catering_quote", "Rosa's Kitchen", { noteTitle: "Catering", sentence: "Rosa's Kitchen quoted £3,040 for the buffet." })],
    expect: { match: null },
  },
];
