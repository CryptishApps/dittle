import { NOTES, type NoteId } from "../tech/data";

export { NOTES, type NoteId };

export type VarId = "guests" | "perHead" | "food" | "date";

export type Variable = {
  id: VarId;
  label: string;
  derived?: (g: number) => string;
  notes: NoteId[];
};

export const VARIABLES: Record<VarId, Variable> = {
  guests: { id: "guests", label: "Guest count", notes: ["catering", "budget", "chairs", "email"] },
  perHead: { id: "perHead", label: "Price per head", notes: ["catering", "budget"] },
  food: { id: "food", label: "Food total", derived: (g) => `${g} × £38`, notes: ["catering", "budget"] },
  date: { id: "date", label: "Event date", notes: ["catering", "email", "venue"] },
};

export type Token = { v: VarId; text: (g: number) => string; editable?: boolean };
export type Part = string | Token;

const money = (n: number) => `£${n.toLocaleString("en-GB")}`;
const guests = (editable = false): Token => ({ v: "guests", text: (g) => String(g), editable });
const perHead: Token = { v: "perHead", text: () => "£38" };
const food: Token = { v: "food", text: (g) => money(g * 38) };
const date = (text: string): Token => ({ v: "date", text: () => text });

export const BODIES: Partial<Record<NoteId, Part[][]>> = {
  catering: [
    ["Rosa's Kitchen can do a buffet for ", guests(true), " guests at ", perHead, " a head, so roughly ", food, " before drinks."],
    ["They need a £500 deposit to hold the date, and the menu has to be final two weeks before the ", date("14th of June"), "."],
    ["Tastings are on Thursdays. Ask about a vegan cake."],
  ],
  budget: [
    ["Food: ", guests(), " × ", perHead, " = ", food, "."],
    ["Chairs: ", guests(), " × £2. Barn £2,400. Flowers £650."],
    ["Still to price: the band and the cake."],
  ],
  chairs: [["Chair Hire Co. ", guests(), " chairs, plus 4 spare for the top table."], ["Delivered the day before, collected on the Monday."]],
  email: [
    ["Hi Sam,"],
    ["We're expecting ", guests(), " people on ", date("14 June"), ", so the barn works if we use the courtyard for drinks."],
    ["Can you check the parking?"],
  ],
  venue: [["Hartley Barn holds 120 seated. £2,400 for the weekend, £600 deposit."], ["Booked for ", date("14 June"), ". Keys from 10am on the Friday."]],
};

export function bodyFor(id: NoteId): Part[][] {
  return BODIES[id] ?? [[NOTES[id].excerpt(80)], ["Next: confirm with everyone by Friday."]];
}

export const PATHS: Record<NoteId, string[]> = {
  catering: ["Wedding", "Vendors", "Catering"],
  budget: ["Wedding", "Budget"],
  chairs: ["Wedding", "Vendors", "Chairs"],
  email: ["Wedding", "Drafts"],
  venue: ["Wedding", "Venue"],
  rings: ["Wedding", "To do"],
  lisbon: ["Lisbon trip", "Travel"],
  hotel: ["Lisbon trip", "Stay"],
  roadmap: ["Work", "Product"],
  oneonone: ["Work", "1:1s"],
  sourdough: ["Recipes", "Bread"],
};

export const TREE: { id: string; name: string; notes: NoteId[] }[] = [
  { id: "wedding", name: "Wedding", notes: ["catering", "budget", "chairs", "email", "venue", "rings"] },
  { id: "lisbon", name: "Lisbon trip", notes: ["lisbon", "hotel"] },
  { id: "work", name: "Work", notes: ["roadmap", "oneonone"] },
  { id: "recipes", name: "Recipes", notes: ["sourdough"] },
];

export const MEALS = [
  "Roast chicken with lemon and thyme",
  "Mushroom and chestnut Wellington (v)",
  "Slow-cooked lamb shoulder",
  "Charred broccoli with chilli and almonds (vg)",
  "Herby new potatoes",
  "Burnt aubergine with yoghurt",
  "Lemon posset with shortbread",
];
