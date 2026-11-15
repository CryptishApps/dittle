export type NoteId = "catering" | "budget" | "chairs" | "email" | "venue" | "lisbon" | "roadmap" | "rings" | "hotel" | "oneonone" | "sourdough";

export type Note = { title: string; subtitle: string; bucket: string; edited: string; excerpt: string };

export const NOTES: Record<NoteId, Note> = {
  catering: { title: "Catering quote", subtitle: "Rosa's Kitchen", bucket: "Wedding", edited: "2m", excerpt: "" },
  budget: { title: "Budget", subtitle: "Wedding costs", bucket: "Wedding", edited: "1d", excerpt: "" },
  chairs: { title: "Chair hire", subtitle: "Chair Hire Co", bucket: "Wedding", edited: "3d", excerpt: "" },
  email: { title: "Email to Sam", subtitle: "Draft", bucket: "Wedding", edited: "4d", excerpt: "" },
  venue: { title: "Hartley Barn", subtitle: "Venue", bucket: "Wedding", edited: "5d", excerpt: "" },
  rings: { title: "Pick up the rings", subtitle: "Hatton Garden", bucket: "Wedding", edited: "now", excerpt: "Friday after 2pm. Bring the receipt." },
  lisbon: { title: "Flights to Lisbon", subtitle: "TAP from Gatwick", bucket: "Lisbon trip", edited: "1w", excerpt: "2 adults, out on the 16th, back on the 22nd." },
  hotel: {
    title: "Hotel in Alfama",
    subtitle: "Memmo Alfama",
    bucket: "Lisbon trip",
    edited: "1w",
    excerpt: "Terrace room, 6 nights from the 16th. Breakfast included, late checkout asked.",
  },
  roadmap: { title: "Q4 roadmap", subtitle: "Product", bucket: "Work", edited: "1w", excerpt: "Ship offline mode first, then the Android beta." },
  oneonone: { title: "1:1 with Priya", subtitle: "Weekly", bucket: "Work", edited: "2d", excerpt: "Offline mode is the priority. She wants the Android beta by the 30th." },
  sourdough: {
    title: "Sourdough starter",
    subtitle: "Feeding schedule",
    bucket: "Recipes",
    edited: "2w",
    excerpt: "Feed at 9am and 9pm. 50g flour, 50g water, keep at room temperature.",
  },
};

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
  return BODIES[id] ?? [[NOTES[id].excerpt], ["Next: confirm with everyone by Friday."]];
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
