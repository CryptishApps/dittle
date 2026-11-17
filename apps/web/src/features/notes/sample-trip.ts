import type { Collection, FactFields, Row, StoredValue } from "./fact";
import type { Inline, NoteDoc } from "./note-doc";

export type SamplePlan = {
  notes: { id: string; doc: NoteDoc }[];
  values: StoredValue[];
  collection: Omit<Collection, "createdAt">;
  rows: Omit<Row, "createdAt">[];
};

const DAY_MS = 86_400_000;
const LEAD_DAYS = 21;
const FRIDAY = 5;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

const DATE_LABEL = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" });

export function tripStart(today: Date): string {
  const lead = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + LEAD_DAYS);
  const weekday = new Date(lead).getUTCDay();
  return isoDay(new Date(lead + ((FRIDAY - weekday + 7) % 7) * DAY_MS));
}

const plusDays = (on: string, days: number) => isoDay(new Date(Date.parse(`${on}T00:00:00Z`) + days * DAY_MS));

type Piece = string | StoredValue;

const money = (amount: number, currency: "EUR" | "GBP"): Pick<FactFields, "text" | "kind" | "amount" | "before" | "after" | "unit"> => {
  const before = currency === "EUR" ? "€" : "£";
  return { text: `${before}${new Intl.NumberFormat("en-GB").format(amount)}`, kind: "money", amount, before, after: "", unit: currency };
};

const day = (on: string): Pick<FactFields, "text" | "kind" | "event" | "when"> => ({
  text: DATE_LABEL.format(new Date(`${on}T00:00:00Z`)),
  kind: "date",
  event: true,
  when: { on, grain: "day" },
});

export function sampleTrip(today = new Date(), id: () => string = () => crypto.randomUUID()): SamplePlan {
  const values: StoredValue[] = [];
  const notes: SamplePlan["notes"] = [];

  const value = (fields: Omit<FactFields, "conditions" | "remarks"> & Partial<Pick<FactFields, "conditions" | "remarks">>): StoredValue => {
    const made: StoredValue = { id: id(), event: false, conditions: [], remarks: [], ...fields };
    values.push(made);
    return made;
  };

  const note = (title: string, write: (noteId: string) => Piece[]) => {
    const noteId = id();
    const pieces = write(noteId);
    const sentence = pieces.map((piece) => (typeof piece === "string" ? piece : piece.text)).join("");
    for (const piece of pieces) if (typeof piece !== "string" && !piece.origin) piece.origin = { noteId, sentence };
    const body = pieces.flatMap((piece): Inline[] => (typeof piece !== "string" ? [{ t: "value", id: piece.id, label: piece.text }] : piece ? [{ t: "text", text: piece }] : []));
    notes.push({ id: noteId, doc: { v: 1, blocks: [{ t: "h", level: 1, c: [{ t: "text", text: title }] }, { t: "p", c: body }] } });
  };

  const start = tripStart(today);
  const collectionId = id();
  const rows: Omit<Row, "createdAt">[] = [];
  const row = (label: string) => {
    const made = { id: `${collectionId}.${id()}`, collectionId, label };
    rows.push(made);
    return made.id;
  };

  const group = value({ text: "6", kind: "count", name: "group_size", subject: { label: "Lisbon trip" }, amount: 6, before: "", after: "" });

  note("Villa", () => {
    const villa = value({ ...money(1680, "EUR"), name: "villa_cost", subject: { label: "villa" } });
    const each = value({ ...money(280, "EUR"), name: "villa_cost_per_person", subject: { label: "villa" }, formula: { expr: "$1 / $2", inputs: [villa.id, group.id] } });
    return ["The villa in Alfama is ", villa, " for four nights. There are ", group, " of us, so ", each, " each."];
  });

  note("Flights", () => {
    const seat = value({ ...money(118, "GBP"), name: "seat_price", subject: { label: "flights" } });
    const total = value({ ...money(708, "GBP"), name: "flights_total", subject: { label: "flights" }, formula: { expr: "$1 * $2", inputs: [group.id, seat.id] } });
    const landing = value({ ...day(start), name: "landing_date", subject: { label: "flights" } });
    return ["", group, " seats at ", seat, " each, ", total, " in total. We land on ", landing, "."];
  });

  const thingToDo = (title: string, about: string, price: number, on: string, write: (price: StoredValue, date: StoredValue) => Piece[], remarks: string[] = []) => {
    const rowId = row(about);
    note(title, () => {
      const cost = value({ ...money(price, "EUR"), name: "ticket_price", subject: { label: about, entityId: rowId }, field: "price", remarks });
      const date = value({ ...day(on), name: "visit_date", subject: { label: about, entityId: rowId }, field: "date" });
      return write(cost, date);
    });
  };

  thingToDo("Fado night", "Clube de Fado", 45, plusDays(start, 1), (price, date) => ["Dinner and fado at Clube de Fado is about ", price, " each. Booked for ", date, " at 8pm."], ["about"]);
  thingToDo("Pena Palace", "Pena Palace", 20, plusDays(start, 2), (price, date) => ["Pena Palace in Sintra is ", price, " each for the palace and park. We're going on ", date, ", first train from Rossio."]);
  thingToDo("Jerónimos and pastéis", "Jerónimos Monastery", 18, plusDays(start, 3), (price, date) => ["Jerónimos Monastery is ", price, " each, then pastéis de nata in Belém next door. Planned for ", date, " before the flight home."]);

  return {
    notes,
    values,
    collection: {
      id: collectionId,
      name: "Things to do",
      rowLabel: "thing to do",
      fields: [
        { id: "price", name: "price each", kind: "money" },
        { id: "date", name: "date", kind: "date" },
      ],
      key: { by: "name" },
    },
    rows,
  };
}
