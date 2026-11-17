import type { KnownVariable } from "@/features/ai/detect";
import type { ValueKind } from "@/features/ai/value-shapes";

export type ExpectedValue = { quote: string; kind: ValueKind; existing?: string; optional?: boolean };
export type Sample = { id: string; topic: string; text: string; values: ExpectedValue[]; requests?: string[] };

export const KNOWN: KnownVariable[] = [
  { name: "guest_count", value: "80", note: "Wedding: catering quote" },
  { name: "per_head_price", value: "£38", note: "Wedding: catering quote" },
  { name: "wedding_date", value: "14 June", note: "Wedding: venue" },
  { name: "venue_deposit", value: "£500", note: "Wedding: venue" },
  { name: "flight_cost", value: "£182", note: "Lisbon: flights" },
  { name: "hotel_nightly_rate", value: "€140", note: "Lisbon: hotel" },
  { name: "team_size", value: "6", note: "Work: team" },
  { name: "sprint_length", value: "two weeks", note: "Work: team" },
];

export const SAMPLES: Sample[] = [
  {
    id: "w1",
    topic: "Wedding",
    text: "Rosa's Kitchen can do a buffet for 80 guests at £38 a head, so roughly £3,040 before drinks.",
    values: [
      { quote: "80", kind: "count", existing: "guest_count" },
      { quote: "£38", kind: "money", existing: "per_head_price" },
      { quote: "£3,040", kind: "money" },
      { quote: "Rosa's Kitchen", kind: "place", optional: true },
    ],
  },
  {
    id: "w2",
    topic: "Wedding",
    text: "Booked Hartley Barn for 14 June. They need a £500 deposit by Friday to hold the date.",
    values: [
      { quote: "Hartley Barn", kind: "place" },
      { quote: "14 June", kind: "date", existing: "wedding_date" },
      { quote: "£500", kind: "money", existing: "venue_deposit" },
      { quote: "Friday", kind: "date" },
    ],
  },
  {
    id: "w3",
    topic: "Wedding",
    text: "Chair hire: 80 chairs plus 4 spare for the top table, £2.50 each.",
    values: [
      { quote: "80", kind: "count", existing: "guest_count" },
      { quote: "4", kind: "count" },
      { quote: "£2.50", kind: "money" },
    ],
  },
  {
    id: "w4",
    topic: "Wedding",
    text: "Email to Sam: we're expecting 80 people on 14 June, so the barn works.",
    values: [
      { quote: "Sam", kind: "person" },
      { quote: "80", kind: "count", existing: "guest_count" },
      { quote: "14 June", kind: "date", existing: "wedding_date" },
    ],
  },
  {
    id: "w5",
    topic: "Wedding",
    text: "Tastings are on Thursdays. Ask about the vegan menu for the 6 guests who need it.",
    values: [
      { quote: "6", kind: "count" },
      { quote: "Thursdays", kind: "date", optional: true },
    ],
  },
  {
    id: "w6",
    topic: "Wedding",
    text: "Menu ideas for the reception. add in a list of meals here",
    values: [],
    requests: ["add in a list of meals here"],
  },
  {
    id: "w7",
    topic: "Wedding",
    text: "We now think it'll be 95 guests, not 80, after Sam's side confirmed.",
    values: [
      { quote: "95", kind: "count", existing: "guest_count" },
      { quote: "Sam", kind: "person" },
      { quote: "80", kind: "count", optional: true },
    ],
  },
  {
    id: "w8",
    topic: "Wedding",
    text: "The venue holds 120 max, and the caterer needs final numbers 3 weeks before.",
    values: [
      { quote: "120", kind: "count" },
      { quote: "3 weeks", kind: "duration" },
    ],
  },
  {
    id: "l1",
    topic: "Lisbon",
    text: "Flights to Lisbon are £182 return each, leaving 3 May and back on 10 May.",
    values: [
      { quote: "Lisbon", kind: "place" },
      { quote: "£182", kind: "money", existing: "flight_cost" },
      { quote: "3 May", kind: "date" },
      { quote: "10 May", kind: "date" },
    ],
  },
  {
    id: "l2",
    topic: "Lisbon",
    text: "The hotel in Alfama is €140 a night and we're staying 7 nights, so about €980 total.",
    values: [
      { quote: "Alfama", kind: "place" },
      { quote: "€140", kind: "money", existing: "hotel_nightly_rate" },
      { quote: "7 nights", kind: "duration" },
      { quote: "€980", kind: "money" },
    ],
  },
  {
    id: "l3",
    topic: "Lisbon",
    text: "Pastel de nata tour with Joana at 10am on the 5th, meet outside the Time Out Market.",
    values: [
      { quote: "Joana", kind: "person" },
      { quote: "10am", kind: "date" },
      { quote: "5th", kind: "date" },
      { quote: "Time Out Market", kind: "place" },
    ],
  },
  {
    id: "l4",
    topic: "Lisbon",
    text: "Budget for the trip is £1,500 each, and we've spent about 60% of it already.",
    values: [
      { quote: "£1,500", kind: "money" },
      { quote: "60%", kind: "percent" },
    ],
  },
  {
    id: "l5",
    topic: "Lisbon",
    text: "Add a packing list for a week in Lisbon under this heading.",
    values: [
      { quote: "a week", kind: "duration", optional: true },
      { quote: "Lisbon", kind: "place", optional: true },
    ],
    requests: ["Add a packing list for a week in Lisbon under this heading."],
  },
  {
    id: "k1",
    topic: "Work",
    text: "Team of 6 for Q1. Sprints are two weeks long and planning is every other Monday.",
    values: [
      { quote: "6", kind: "count", existing: "team_size" },
      { quote: "two weeks", kind: "duration", existing: "sprint_length" },
      { quote: "Q1", kind: "date", optional: true },
      { quote: "Monday", kind: "date", optional: true },
    ],
  },
  {
    id: "k2",
    topic: "Work",
    text: "Priya is leading the payments migration; target is 31 March with a 15% buffer.",
    values: [
      { quote: "Priya", kind: "person" },
      { quote: "31 March", kind: "date" },
      { quote: "15%", kind: "percent" },
    ],
  },
  {
    id: "k3",
    topic: "Work",
    text: "Hiring: we have budget for 2 more engineers at £85,000 each, starting in April.",
    values: [
      { quote: "2", kind: "count" },
      { quote: "£85,000", kind: "money" },
      { quote: "April", kind: "date" },
    ],
  },
  {
    id: "k4",
    topic: "Work",
    text: "Standup moved to 9:30. Retro is 45 minutes on Friday afternoons.",
    values: [
      { quote: "9:30", kind: "date" },
      { quote: "45 minutes", kind: "duration" },
      { quote: "Friday", kind: "date", optional: true },
    ],
  },
  {
    id: "k5",
    topic: "Work",
    text: "The client signed off on the £24,000 quote. Invoice 50% upfront and the rest on delivery.",
    values: [
      { quote: "£24,000", kind: "money" },
      { quote: "50%", kind: "percent" },
    ],
  },
  {
    id: "k6",
    topic: "Work",
    text: "Write a short summary of the action items below this line.",
    values: [],
    requests: ["Write a short summary of the action items below this line."],
  },
  {
    id: "k7",
    topic: "Work",
    text: "Meeting notes: discussed the roadmap and agreed the design direction.",
    values: [],
  },
  {
    id: "r1",
    topic: "Recipes",
    text: "Banana bread: 3 ripe bananas, 250g flour, 2 eggs, bake for 55 minutes at 180°C.",
    values: [
      { quote: "3", kind: "count" },
      { quote: "250g", kind: "number" },
      { quote: "2", kind: "count" },
      { quote: "55 minutes", kind: "duration" },
      { quote: "180°C", kind: "number" },
    ],
  },
  {
    id: "r2",
    topic: "Recipes",
    text: "Doubling the curry for 12 people means 1.2kg of chicken and two tins of coconut milk.",
    values: [
      { quote: "12", kind: "count" },
      { quote: "1.2kg", kind: "number" },
      { quote: "two", kind: "count" },
    ],
  },
  {
    id: "r3",
    topic: "Recipes",
    text: "Sunday roast for 8: lamb shoulder at about £24, roast for 4 hours.",
    values: [
      { quote: "8", kind: "count" },
      { quote: "£24", kind: "money" },
      { quote: "4 hours", kind: "duration" },
      { quote: "Sunday", kind: "date", optional: true },
    ],
  },
  {
    id: "h1",
    topic: "Home",
    text: "Gym membership went up to £42 a month from 1 January.",
    values: [
      { quote: "£42", kind: "money" },
      { quote: "1 January", kind: "date" },
    ],
  },
  {
    id: "h2",
    topic: "Home",
    text: "Mum's birthday is 22 September. She mentioned wanting the new cookbook by Ottolenghi.",
    values: [
      { quote: "22 September", kind: "date" },
      { quote: "Ottolenghi", kind: "person" },
      { quote: "Mum", kind: "person", optional: true },
    ],
  },
  {
    id: "h3",
    topic: "Home",
    text: "Car service at Kwik Fit on 4 December, quoted £189 including the MOT.",
    values: [
      { quote: "Kwik Fit", kind: "place" },
      { quote: "4 December", kind: "date" },
      { quote: "£189", kind: "money" },
    ],
  },
  {
    id: "h4",
    topic: "Home",
    text: "Rent is £1,350, split three ways, so £450 each on the 1st of every month.",
    values: [
      { quote: "£1,350", kind: "money" },
      { quote: "three", kind: "count" },
      { quote: "£450", kind: "money" },
      { quote: "1st", kind: "date" },
    ],
  },
  {
    id: "h5",
    topic: "Home",
    text: "Remember to call the florist. Nothing else to note here.",
    values: [],
  },
];
