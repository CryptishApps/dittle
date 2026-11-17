import type { UpdateTracked } from "@/features/ai/update-answer";

export type ExpectedUpdate = { value: number; amount?: number; seconds?: number; when?: string };
export type UpdateCase = { id: string; message: string; image?: boolean; today?: Date; expect: ExpectedUpdate[]; blocked?: number };

export const UPDATE_TODAY = new Date(2026, 2, 2);

export const UPDATE_TRACKED: UpdateTracked[] = [
  { text: "80", kind: "count", name: "guest_count", about: "wedding", noteTitle: "Catering", amount: 80, before: "", after: "" },
  { text: "£38", kind: "money", name: "price_per_head", about: "Rosa's Kitchen", noteTitle: "Catering", amount: 38, before: "£", after: "", unit: "GBP" },
  { text: "4 June", kind: "date", name: "deposit_due", about: "Rosa's Kitchen", noteTitle: "Catering", when: { on: "2026-06-04", grain: "day" } },
  { text: "£500", kind: "money", name: "deposit", about: "Rosa's Kitchen", noteTitle: "Catering", amount: 500, before: "£", after: "", unit: "GBP" },
  { text: "14 June", kind: "date", name: "wedding_date", about: "wedding", noteTitle: "Venue", when: { on: "2026-06-14", grain: "day" } },
  { text: "Hartley Barn", kind: "place", name: "venue", about: "wedding", noteTitle: "Venue" },
  { text: "£1,200", kind: "money", name: "venue_hire", about: "Hartley Barn", noteTitle: "Venue", amount: 1200, before: "£", after: "", unit: "GBP" },
  { text: "120", kind: "count", name: "capacity", about: "Hartley Barn", noteTitle: "Venue", amount: 120, before: "", after: "" },
  { text: "£180", kind: "money", name: "cake_price", about: "Sweet Tiers", noteTitle: "Cake", amount: 180, before: "£", after: "", unit: "GBP" },
  { text: "6 hours", kind: "duration", name: "set_length", about: "The Lindens", noteTitle: "Music", seconds: 21_600 },
  { text: "£950", kind: "money", name: "band_fee", about: "The Lindens", noteTitle: "Music", amount: 950, before: "£", after: "", unit: "GBP" },
];

export const UPDATE_CASES: UpdateCase[] = [
  {
    id: "U1",
    message: "Hi both,\n\nGood news from Rosa's Kitchen: we can now do £42 a head, and we'd need the deposit by 30 May.\n\nBest,\nRosa",
    expect: [{ value: 1, amount: 42 }, { value: 2, when: "2026-05-30" }],
  },
  {
    id: "U2",
    message: "Thanks for getting in touch! Our office is at 12 Market Street, Leeds LS1 6DT, and you can call us on 0113 496 0123. We've been catering weddings since 1998.",
    expect: [],
  },
  {
    id: "U3",
    message: "Just confirming we're all set for 80 guests at £38 a head. See you in June!",
    expect: [],
  },
  {
    id: "U4",
    message: "Hello from Hartley Barn. I'm sorry to say the flood repairs mean we've had to move your wedding to Saturday 20 June. Everything else about the booking stays the same.",
    expect: [{ value: 4, when: "2026-06-20" }],
  },
  {
    id: "U5",
    message: "Hi! The Lindens can do your evening for €1,100, travel included. Let us know.",
    expect: [],
    blocked: 10,
  },
  {
    id: "U6",
    message: "Thanks for letting us know you're now at 92 guests. That means two extra servers at £120 each.",
    expect: [{ value: 0, amount: 92 }],
  },
  {
    id: "U7",
    message: "Quick one from Rosa's Kitchen: the deposit is now £600 rather than £500. The per-head price stays at £38.",
    expect: [{ value: 3, amount: 600 }],
  },
  {
    id: "U8",
    message: "Hi, Green Fork Catering here. We'd love to quote for your wedding: £35 a head for a three-course meal, minimum 60 guests.",
    expect: [],
  },
  {
    id: "U9",
    message: "The Lindens: we can only play for 4 hours instead of 6 on the night, same fee. Sorry!",
    expect: [{ value: 9, seconds: 14_400 }],
  },
  {
    id: "U10",
    message: "Dear couple, hire of Hartley Barn has gone up to £1,350 for June weddings this year. Apologies for the change.",
    expect: [{ value: 6, amount: 1350 }],
  },
  {
    id: "U11",
    message: "Good news: with the marquee up, Hartley Barn can now seat 150.",
    expect: [{ value: 7, amount: 150 }],
  },
  {
    id: "U12",
    message: "Sweet Tiers here. Last year this cake was £150, but your quote of £180 still stands. Your order reference is 4471.",
    expect: [],
  },
  {
    id: "U13",
    message: "We've updated your booking to 95 guests. With the bigger group the price drops to £36 a head, and the deposit is still due on 4 June.",
    expect: [{ value: 0, amount: 95 }, { value: 1, amount: 36 }],
  },
  {
    id: "U14",
    message: "Could you get the deposit to us by the 28th of May instead? Our accounts close early this year.",
    expect: [{ value: 2, when: "2026-05-28" }],
  },
  {
    id: "U15",
    today: new Date(2026, 10, 17),
    message: "Hi Sam, Rosa's Kitchen again. Sorry for the change, but we'd need the deposit by 30 May after all, and it's £520 now.",
    expect: [{ value: 2, when: "2027-05-30" }, { value: 3, amount: 520 }],
  },
  {
    id: "I1",
    image: true,
    message: "ROSA'S KITCHEN\nRevised quote: wedding catering\nPrice per head: £42\nDeposit due: 30 May 2026\nThank you!",
    expect: [{ value: 1, amount: 42 }, { value: 2, when: "2026-05-30" }],
  },
  {
    id: "I2",
    image: true,
    message: "HILL'S HARDWARE\nPaint, white 2.5L   £24.99\nBrushes x3         £6.50\nTOTAL              £31.49\nVAT no. 123 4567 89",
    expect: [],
  },
];
