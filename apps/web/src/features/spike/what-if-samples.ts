import type { WhatIfAnswer } from "@/features/ai/what-if-answer";
import { summarise, valueIdsOf } from "@/features/notes/note-doc";
import { sampleTrip } from "@/features/notes/sample-trip";
import { applyOperation, changeable, optionsFor } from "@/features/what-if/plan";

const trip = sampleTrip(new Date(2026, 10, 17), (() => {
  let next = 0;
  return () => `id${(next += 1)}`;
})());

const notes = trip.notes.map((note) => ({ id: note.id, title: summarise(note.doc).title, valueIds: valueIdsOf(note.doc) }));

export const WHAT_IF_VALUES = changeable(trip.values);
export const WHAT_IF_OPTIONS = optionsFor(WHAT_IF_VALUES, notes);

export type WhatIfCase = { id: string; question: string; expect: { name: string; amount: number } | null };

const to = (name: string, amount: number) => ({ name, amount });

export const WHAT_IF_CASES: WhatIfCase[] = [
  { id: "W1", question: "What if 2 more people come?", expect: to("group_size", 8) },
  { id: "W2", question: "What if we added 20 more guests?", expect: to("group_size", 26) },
  { id: "W3", question: "What if only 4 of us can make it?", expect: to("group_size", 4) },
  { id: "W4", question: "what if two people drop out", expect: to("group_size", 4) },
  { id: "W5", question: "What if three more friends join us?", expect: to("group_size", 9) },
  { id: "W6", question: "What if the group was twice as big?", expect: to("group_size", 12) },
  { id: "W7", question: "What if the villa goes up to €1,900?", expect: to("villa_cost", 1900) },
  { id: "W8", question: "What if the villa was €200 cheaper?", expect: to("villa_cost", 1480) },
  { id: "W9", question: "What if flights went up by £25 a seat?", expect: to("seat_price", 143) },
  { id: "W10", question: "What if seats were £99?", expect: to("seat_price", 99) },
  { id: "W11", question: "What if seat prices rose 10%?", expect: to("seat_price", 129.8) },
  { id: "W12", question: "What if the fado dinner is €60 each?", expect: to("ticket_price", 60) },
  { id: "W13", question: "What if Pena Palace tickets doubled?", expect: to("ticket_price", 40) },
  { id: "W14", question: "What if Jerónimos was half price?", expect: to("ticket_price", 9) },
  { id: "W15", question: "What if it rains on Sunday?", expect: null },
  { id: "W16", question: "What if we hire a car?", expect: null },
  { id: "W17", question: "What if dinner on the first night costs €30 each?", expect: null },
  { id: "W18", question: "What if the hotel in Porto is €90 a night?", expect: null },
  { id: "W19", question: "What if we fly out on Thursday instead?", expect: null },
  { id: "W20", question: "What if the taxi from the airport is €35?", expect: null },
];

const ABOUT: Record<string, string> = { W12: "Clube de Fado", W13: "Pena Palace", W14: "Jerónimos Monastery" };

export type WhatIfVerdict = { ok: boolean; got: string; want: string };

const describeAnswer = (answer: WhatIfAnswer) => {
  if (!answer) return "none";
  const value = WHAT_IF_VALUES[answer.option]!;
  return `${value.name} (${value.subject?.label}) ${answer.operation} ${answer.number} → ${applyOperation(value.amount ?? 0, answer.operation, answer.number)}`;
};

export function scoreWhatIf(sample: WhatIfCase, answer: WhatIfAnswer): WhatIfVerdict {
  const want = sample.expect ? `${sample.expect.name}${ABOUT[sample.id] ? ` (${ABOUT[sample.id]})` : ""} → ${sample.expect.amount}` : "none";
  const got = describeAnswer(answer);
  if (!sample.expect || !answer) return { ok: !sample.expect && !answer, got, want };
  const value = WHAT_IF_VALUES[answer.option]!;
  const rightValue = value.name === sample.expect.name && (!ABOUT[sample.id] || value.subject?.label === ABOUT[sample.id]);
  const amount = applyOperation(value.amount ?? 0, answer.operation, answer.number);
  return { ok: rightValue && Math.abs(amount - sample.expect.amount) < 0.01, got, want };
}
