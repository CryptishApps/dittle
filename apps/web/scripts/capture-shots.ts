import { chromium, type Page } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:5180";
const out = new URL("../shots/", import.meta.url).pathname;
const executablePath = process.env.CHROME_PATH;
if (!executablePath) throw new Error("Set CHROME_PATH to a Chrome or Chromium binary.");

const THEMES = ["light", "dark"] as const;
const AI_TIMEOUT = 60_000;

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2.25 });
const page = await context.newPage();

try {
  await signUp(page);

  await note(page, "Tuesday run", async () => {
    await tag(page, "Ran ", "6.4 km", "along the river in ");
    await tag(page, "", "31:05", "on Tuesday 10 November.");
  });
  await page.locator(".note-editor .value-tag", { hasText: "6.4 km" }).click();
  await page.locator("aside").getByRole("button", { name: /Start a collection/ }).click();
  await page.locator("aside #collection-name").fill("Runs");
  await page.locator("aside").getByRole("button", { name: "Create" }).click();
  await waitForText(page, /Created Runs/);
  await page.keyboard.press("Escape");

  await note(page, "Thursday run", async () => {
    await tag(page, "Easy ", "5 km", "loop in ");
    await tag(page, "", "26:58", "on Thursday 12 November.");
  });
  await waitForText(page, /Added to Runs/);

  await note(page, "Sunday long run", async () => {
    await tag(page, "", "12 km", "to the lighthouse and back in ");
    await tag(page, "", "1:04:20", "on Sunday 15 November. Legs fine.");
  });
  await waitForText(page, /Added to Runs/);

  await note(page, "Lisbon trip", async () => {
    await tag(page, "Flights land ", "Fri 4 December", "and the hotel by the river is ");
    await tag(page, "", "€140", "a night.");
  });

  await note(page, "Catering", async () => {
    await tag(page, "Rosa's Kitchen can do a buffet for ", "80", "guests at ");
    await tag(page, "", "£38", "a head, so roughly ");
    await tag(page, "", "£3,040", "before drinks.");
    await page.keyboard.press("Enter");
    await tag(page, "Deposit of ", "£500", "due by ");
    await tag(page, "", "Fri 27 November", "to hold the date.");
  });
  await waitForText(page, /now follows/);

  await note(page, "Wedding budget", async () => {
    await tag(page, "Food: ", "80", "guests × ");
    await tag(page, "", "£38", "= ");
    await tag(page, "", "£3,040", "for the buffet. Barn hire ");
    await tag(page, "", "£2,400", "with the deposit paid.");
  });

  await home(page);
  await page.locator("section[aria-label='What you track']").waitFor();
  await page.waitForFunction(() => document.querySelector("section[aria-label='What you track']")?.textContent?.includes("Coming up"), null, { timeout: AI_TIMEOUT });
  await settle(page);
  await shoot(page, "home");

  await openNote(page, "Sunday long run");
  await page.locator(".note-editor .value-tag", { hasText: "12 km" }).click();
  await page.locator("aside table").waitFor();
  await settle(page);
  await shoot(page, "panel");
  await page.keyboard.press("Escape");

  await openNote(page, "Catering");
  await page.locator(".note-editor .value-tag", { hasText: "£3,040" }).hover();
  await page.getByRole("dialog", { name: "About £3,040" }).waitFor();
  await page.waitForTimeout(500);
  await shoot(page, "hover");
  await page.mouse.move(4, 790);
  await page.waitForTimeout(500);

  await page.locator(".note-editor .value-tag", { hasText: /^80$/ }).click();
  const field = page.locator("aside").getByRole("spinbutton").first();
  await field.fill("95");
  await field.press("Enter");
  await page.locator("aside").getByRole("button", { name: /^Update all/ }).waitFor();
  await field.blur();
  await settle(page);
  await shoot(page, "change");
  await page.locator("aside").getByRole("button", { name: /^Update all/ }).click();
  await page.locator(".note-editor .value-tag", { hasText: "£3,610" }).waitFor({ timeout: AI_TIMEOUT });
  await settle(page);
  await shoot(page, "hero");
  await page.keyboard.press("Escape");

  await openNote(page, "Lisbon trip");
  await page.locator(".note-editor p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Write a packing list for a weekend in Lisbon. ", { delay: 15 });
  const request = page.locator('.request-button[data-status="ready"]').first();
  await request.waitFor({ timeout: AI_TIMEOUT });
  await request.hover();
  await page.getByRole("dialog", { name: "Preview" }).waitFor();
  await page.waitForTimeout(600);
  await shoot(page, "request");
} finally {
  await deleteAccount(page).catch((error) => {
    process.exitCode = 1;
    console.error("Could not delete the throwaway account:", error);
  });
  await browser.close();
}

console.log(`Saved screenshots to ${out}`);

async function shoot(page: Page, name: string) {
  console.log(`Shooting ${name}`);
  for (const theme of THEMES) {
    await page.emulateMedia({ colorScheme: theme });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}${name}-${theme}.png` });
  }
  await page.emulateMedia({ colorScheme: "light" });
}

async function signUp(page: Page) {
  const id = crypto.randomUUID().slice(0, 8);
  await page.goto(`${base}/signup`, { waitUntil: "load" });
  await page.getByLabel("Name").fill("Sam Rivera");
  await page.getByLabel("Email").fill(`dittle-shots-${id}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(`Shots-${crypto.randomUUID()}`);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/notes", { timeout: 30_000 });
  await page.getByLabel("Start a note with this title").waitFor();
}

async function deleteAccount(page: Page) {
  await page.goto(`${base}/notes`, { waitUntil: "load" });
  await page.getByRole("button", { name: "Account and status" }).click();
  await page.getByRole("menuitem", { name: "Delete account" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete account" }).click();
  await page.waitForURL(`${base}/`, { timeout: 30_000 });
  console.log("Deleted the throwaway account and its notes.");
}

async function note(page: Page, title: string, write: () => Promise<void>) {
  console.log(`Writing ${title}`);
  await home(page);
  await page.getByLabel("Start a note with this title").fill(title);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/notes/*");
  await page.locator(".note-editor").waitFor();
  await page.waitForTimeout(400);
  await write();
  await described(page);
}

async function tag(page: Page, before: string, value: string, after: string) {
  await page.keyboard.type(`${before}@${value}`, { delay: 20 });
  await page.getByRole("listbox", { name: "Tag a value" }).waitFor();
  await page.keyboard.press("Tab");
  await page.keyboard.type(after, { delay: 20 });
}

async function described(page: Page) {
  await page.waitForTimeout(1800);
  await page.waitForFunction(() => !document.querySelector('.note-editor .value-tag[data-naming="true"]'), null, { timeout: AI_TIMEOUT });
}

async function home(page: Page) {
  if (new URL(page.url()).pathname === "/notes") return;
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.waitForURL("**/notes");
}

async function openNote(page: Page, title: string) {
  await home(page);
  await page.getByRole("navigation", { name: "Notes" }).getByRole("link", { name: new RegExp(title) }).first().click();
  await page.locator(".note-editor").waitFor();
  await page.waitForTimeout(800);
}

async function waitForText(page: Page, text: RegExp) {
  await page.waitForFunction((source) => new RegExp(source).test(document.body.innerText), text.source, { timeout: AI_TIMEOUT });
}

async function settle(page: Page) {
  await page.waitForFunction(() => !document.querySelector("[role=status]"), null, { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(600);
}
