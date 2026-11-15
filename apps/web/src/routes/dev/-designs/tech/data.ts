export type Tone = "green" | "blue" | "yellow" | "orange" | "pink" | "violet";

export type Bucket = { name: string; tone: Tone };

export const BUCKETS = {
  wedding: { name: "Wedding", tone: "green" },
  lisbon: { name: "Lisbon trip", tone: "orange" },
  work: { name: "Work", tone: "blue" },
  recipes: { name: "Recipes", tone: "yellow" },
} satisfies Record<string, Bucket>;

export type NoteId = "catering" | "budget" | "chairs" | "email" | "venue" | "lisbon" | "roadmap" | "rings" | "hotel" | "oneonone" | "sourdough";

export type Note = {
  id: NoteId;
  title: string;
  subtitle: string;
  bucket: Bucket;
  tile: string;
  edited: string;
  excerpt: (guests: number) => string;
};

export const NOTES: Record<NoteId, Note> = {
  catering: {
    id: "catering",
    title: "Catering quote",
    subtitle: "Rosa's Kitchen",
    bucket: BUCKETS.wedding,
    tile: "#ffc53d",
    edited: "2m",
    excerpt: (g) => `Buffet for ${g} guests at £38 a head, so roughly £${(g * 38).toLocaleString("en-GB")} before drinks.`,
  },
  budget: {
    id: "budget",
    title: "Budget",
    subtitle: "Wedding costs",
    bucket: BUCKETS.wedding,
    tile: "#ff8a3d",
    edited: "1d",
    excerpt: (g) => `Food ${g} × £38 = £${(g * 38).toLocaleString("en-GB")}. Chairs ${g} × £2. Barn £2,400.`,
  },
  chairs: {
    id: "chairs",
    title: "Chair hire",
    subtitle: "Chair Hire Co",
    bucket: BUCKETS.wedding,
    tile: "#f25c8a",
    edited: "3d",
    excerpt: (g) => `${g} chairs, plus 4 spare for the top table. Delivered the day before.`,
  },
  email: {
    id: "email",
    title: "Email to Sam",
    subtitle: "Draft",
    bucket: BUCKETS.wedding,
    tile: "#9b6bff",
    edited: "4d",
    excerpt: (g) => `We're expecting ${g} people on 14 June, so the barn works if we use the courtyard.`,
  },
  venue: {
    id: "venue",
    title: "Hartley Barn",
    subtitle: "Venue",
    bucket: BUCKETS.wedding,
    tile: "#5ec2f2",
    edited: "5d",
    excerpt: () => "Holds 120 seated. £2,400 for the weekend, £600 deposit. Booked for 14 June.",
  },
  lisbon: {
    id: "lisbon",
    title: "Flights to Lisbon",
    subtitle: "TAP from Gatwick",
    bucket: BUCKETS.lisbon,
    tile: "#ff8a3d",
    edited: "1w",
    excerpt: () => "2 adults, out on the 16th, back on the 22nd.",
  },
  roadmap: {
    id: "roadmap",
    title: "Q4 roadmap",
    subtitle: "Product",
    bucket: BUCKETS.work,
    tile: "#5b8def",
    edited: "1w",
    excerpt: () => "Ship offline mode first, then the Android beta.",
  },
  rings: {
    id: "rings",
    title: "Pick up the rings",
    subtitle: "Hatton Garden",
    bucket: BUCKETS.wedding,
    tile: "#3ccf8e",
    edited: "now",
    excerpt: () => "Friday after 2pm. Bring the receipt.",
  },
  hotel: {
    id: "hotel",
    title: "Hotel in Alfama",
    subtitle: "Memmo Alfama",
    bucket: BUCKETS.lisbon,
    tile: "#f2b33d",
    edited: "1w",
    excerpt: () => "Terrace room, 6 nights from the 16th. Breakfast included, late checkout asked.",
  },
  oneonone: {
    id: "oneonone",
    title: "1:1 with Priya",
    subtitle: "Weekly",
    bucket: BUCKETS.work,
    tile: "#7c8cff",
    edited: "2d",
    excerpt: () => "Offline mode is the priority. She wants the Android beta by the 30th.",
  },
  sourdough: {
    id: "sourdough",
    title: "Sourdough starter",
    subtitle: "Feeding schedule",
    bucket: BUCKETS.recipes,
    tile: "#e0a84f",
    edited: "2w",
    excerpt: () => "Feed at 9am and 9pm. 50g flour, 50g water, keep at room temperature.",
  },
};

export const RECENT: NoteId[] = ["catering", "rings", "budget", "chairs", "email", "venue", "lisbon", "roadmap"];

export type LinkedValue = { id: string; label: string; value: (guests: number) => string; notes: NoteId[] };

export const VALUES: LinkedValue[] = [
  { id: "guests", label: "Guest count", value: (g) => String(g), notes: ["catering", "budget", "chairs", "email"] },
  { id: "date", label: "Event date", value: () => "14 June", notes: ["catering", "email", "venue"] },
  { id: "perHead", label: "Price per head", value: () => "£38", notes: ["catering", "budget"] },
  { id: "food", label: "Food total", value: (g) => `£${(g * 38).toLocaleString("en-GB")}`, notes: ["catering", "budget"] },
  { id: "deposit", label: "Venue deposit", value: () => "£600", notes: ["venue"] },
];

export function valuesFor(note: NoteId): LinkedValue[] {
  return VALUES.filter((value) => value.notes.includes(note));
}

export type Call = { what: string; source: "device" | "cloud"; ms: number; tokens: number; at: string };

export const ACTIVITY: Partial<Record<NoteId, Call[]>> = {
  catering: [
    { what: "Read paragraph 1", source: "device", ms: 180, tokens: 46, at: "09:41:12" },
    { what: "Matched 4 values", source: "device", ms: 240, tokens: 31, at: "09:41:12" },
    { what: "Spotted a request", source: "device", ms: 150, tokens: 12, at: "09:41:20" },
    { what: "Wrote 7 meals", source: "device", ms: 1900, tokens: 188, at: "09:41:21" },
    { what: "Found Vendors collection", source: "cloud", ms: 2600, tokens: 412, at: "09:38:02" },
  ],
  venue: [
    { what: "Read paragraph 1", source: "device", ms: 160, tokens: 38, at: "Mon 10:02" },
    { what: "Matched 2 values", source: "device", ms: 210, tokens: 22, at: "Mon 10:02" },
  ],
  rings: [{ what: "Sorted into Wedding", source: "device", ms: 210, tokens: 18, at: "09:44:03" }],
};

export function activityFor(note: NoteId): Call[] {
  return (
    ACTIVITY[note] ?? [
      { what: "Read paragraph 1", source: "device", ms: 170, tokens: 40, at: "Tue 18:20" },
      { what: "Matched values", source: "device", ms: 220, tokens: 26, at: "Tue 18:20" },
    ]
  );
}

export const MEALS = [
  "Roast chicken with lemon and thyme",
  "Mushroom and chestnut Wellington (v)",
  "Slow-cooked lamb shoulder",
  "Charred broccoli with chilli and almonds (vg)",
  "Herby new potatoes",
  "Burnt aubergine with yoghurt",
  "Lemon posset with shortbread",
];
