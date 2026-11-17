import { describe, expect, test } from "bun:test";
import { closeTab, keepTabs, openTab, type Tab } from "./tabs";

const note = (id: string): Tab => ({ kind: "note", id });
const tabsOf = (uid: string): Tab[] => {
  const seen: Tab[] = [];
  keepTabs(uid, (tab) => {
    seen.push(tab);
    return true;
  });
  return seen;
};

describe("open tabs", () => {
  test("opening a tab twice keeps one copy, in the order opened", () => {
    openTab("open-twice", note("villa"));
    openTab("open-twice", note("flights"));
    openTab("open-twice", note("villa"));
    expect(tabsOf("open-twice")).toEqual([note("villa"), note("flights")]);
  });

  test("a note and a collection with the same id are different tabs", () => {
    openTab("same-id", note("lisbon"));
    openTab("same-id", { kind: "collection", id: "lisbon" });
    expect(tabsOf("same-id")).toHaveLength(2);
  });

  test("closing a tab hands back the tab that takes its place", () => {
    for (const id of ["villa", "flights", "fado"]) openTab("close", note(id));
    expect(closeTab("close", note("flights"))).toEqual(note("fado"));
    expect(closeTab("close", note("fado"))).toEqual(note("villa"));
    expect(closeTab("close", note("villa"))).toBeUndefined();
    expect(tabsOf("close")).toEqual([]);
  });

  test("closing a tab that is not open changes nothing", () => {
    openTab("not-open", note("villa"));
    expect(closeTab("not-open", note("flights"))).toBeUndefined();
    expect(tabsOf("not-open")).toEqual([note("villa")]);
  });

  test("tabs for deleted notes can be dropped", () => {
    for (const id of ["villa", "gone", "fado"]) openTab("prune", note(id));
    keepTabs("prune", (tab) => tab.id !== "gone");
    expect(tabsOf("prune")).toEqual([note("villa"), note("fado")]);
  });

  test("each account keeps its own tabs", () => {
    openTab("account-a", note("villa"));
    expect(tabsOf("account-b")).toEqual([]);
  });
});
