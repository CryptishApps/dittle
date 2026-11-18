import { tmpdir } from "node:os";
import { chromium, type Page } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:5180";
const out = new URL("../shots/", import.meta.url).pathname;
const executablePath = process.env.CHROME_PATH;
if (!executablePath) throw new Error("Set CHROME_PATH to a Chrome or Chromium binary.");

const THEMES = ["light", "dark"] as const;
const AI_TIMEOUT = 60_000;
const CAPTURE = "New note, or jot something down";

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2.25 });
const page = await context.newPage();

try {
  await signUp(page);

  await note(page, "Sintra day trip", async () => {
    await tag(page, "Pena Palace with the train there, ", "€32", "each, on ");
    await tag(page, "", "Sun 13 December", "with lunch in the town.");
  });
  await page.locator(".note-editor .value-tag", { hasText: "€32" }).click();
  await page.locator("aside").getByRole("button", { name: /Start a collection/ }).click();
  await page.locator("aside #collection-name").fill("Things to do");
  const perThing = page.locator("aside").getByRole("radio", { name: "Row per thing" });
  if (await perThing.isVisible()) await perThing.click();
  await page.locator("aside").getByRole("button", { name: "Create" }).click();
  await waitForText(page, /Created Things to do/);
  await page.keyboard.press("Escape");

  await note(page, "Belém morning", async () => {
    await tag(page, "Jerónimos Monastery and pastéis, ", "€18", "each, on ");
    await tag(page, "", "Sat 12 December", "before lunch.");
  });
  await placed(page, "€18");

  await note(page, "Fado night", async () => {
    await tag(page, "Clube de Fado with dinner, ", "€45", "each, on ");
    await tag(page, "", "Sat 12 December", "at 9pm.");
  });
  await placed(page, "€45");

  await note(page, "Catering", async () => {
    await tag(page, "Hops & Co quoted ", "£38", "a head for ");
    await tag(page, "", "80", "guests, so ");
    await tag(page, "", "£3,040", "in total, bar included.");
  });
  await waitForText(page, /£3,040 now follows/);

  await note(page, "Wedding budget", async () => {
    await tag(page, "Catering is ", "£38", "a head for ", { existing: true });
    await tag(page, "", "80", "guests. The barn is ", { existing: true });
    await tag(page, "", "£4,500", "with a ");
    await tag(page, "", "£500", "deposit due on ");
    await tag(page, "", "Fri 11 December", ".");
  });

  await home(page);
  await page.getByRole("region", { name: "Tracking" }).waitFor();
  await page.getByRole("region", { name: "Tracking" }).getByText("Next up").waitFor({ timeout: AI_TIMEOUT });
  await settle(page);
  await shoot(page, "home");

  await openNote(page, "Fado night");
  await page.locator(".note-editor .value-tag", { hasText: "€45" }).click();
  await page.locator("aside table").waitFor();
  const rows = await page.locator("aside table tbody tr").count();
  if (rows !== 3) throw new Error(`Things to do has ${rows} rows instead of 3.`);
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

  await page.locator(".note-editor .value-tag", { hasText: "£38" }).click();
  const field = page.locator("aside").getByRole("spinbutton").first();
  await field.fill("42");
  await field.press("Enter");
  await page.locator("aside").getByRole("button", { name: /^Update all/ }).waitFor();
  await field.blur();
  await settle(page);
  await shoot(page, "change");
  await page.locator("aside").getByRole("button", { name: /^Update all/ }).click();
  await page.locator(".note-editor .value-tag", { hasText: "£3,360" }).waitFor({ timeout: AI_TIMEOUT });
  await settle(page);
  await shoot(page, "hero");
  await page.keyboard.press("Escape");

  await openNote(page, "Sintra day trip");
  await page.locator(".note-editor > p").last().click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Write a packing list for a day trip to Sintra in December. ", { delay: 15 });
  const request = page.locator('.request-button[data-status="ready"]').first();
  await request.waitFor({ timeout: AI_TIMEOUT });
  await request.hover();
  await page.getByRole("dialog", { name: "Preview" }).waitFor();
  await page.waitForTimeout(600);
  await shoot(page, "request");
  console.log(`Saved screenshots to ${out}`);
} catch (error) {
  process.exitCode = 1;
  console.error(error);
  const failed = `${tmpdir()}/dittle-shots-failed.png`;
  await page.screenshot({ path: failed }).then(() => console.error(`Saved the failing page to ${failed}`), () => undefined);
} finally {
  await deleteAccount(page).catch((error) => {
    process.exitCode = 1;
    console.error("Could not delete the throwaway account:", error);
  });
  await browser.close();
}

async function shoot(page: Page, name: string) {
  console.log(`Shooting ${name}`);
  await page.evaluate(() => document.querySelectorAll<HTMLElement>("[contenteditable]").forEach((element) => (element.spellcheck = false)));
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
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByLabel(CAPTURE).waitFor();
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
  await page.getByLabel(CAPTURE).fill("");
  await page.getByLabel(CAPTURE).press("Enter");
  await page.waitForURL("**/notes/*");
  await page.locator(".note-editor").waitFor();
  await page.waitForTimeout(400);
  await page.keyboard.type(title, { delay: 20 });
  await page.keyboard.press("Enter");
  await write();
  await described(page);
}

async function tag(page: Page, before: string, value: string, after: string, { existing = false } = {}) {
  await page.keyboard.type(`${before}@${value}`, { delay: 20 });
  await page.getByRole("listbox", { name: "Tag a value" }).waitFor();
  if (existing) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Tab");
  await page.keyboard.type(after, { delay: 20 });
}

async function described(page: Page) {
  await page.waitForTimeout(1800);
  await page.waitForFunction(() => !document.querySelector('.note-editor .value-tag[data-naming="true"]'), null, { timeout: AI_TIMEOUT });
}

async function home(page: Page) {
  if (new URL(page.url()).pathname === "/notes") return;
  await page.getByRole("navigation", { name: "Open notes" }).getByRole("link", { name: "Home" }).click();
  await page.waitForURL("**/notes");
}

async function openNote(page: Page, title: string) {
  await home(page);
  await page.getByRole("navigation", { name: "Notes" }).getByRole("link", { name: new RegExp(title) }).first().click();
  await page.locator(".note-editor").waitFor();
  await page.waitForTimeout(800);
}

async function placed(page: Page, value: string) {
  await page.locator(".note-editor .value-tag", { hasText: value }).click();
  await page.locator("aside table", { hasText: value }).waitFor({ timeout: AI_TIMEOUT });
  await page.keyboard.press("Escape");
}

async function waitForText(page: Page, text: RegExp) {
  await page.waitForFunction((source) => new RegExp(source).test(document.body.innerText), text.source, { timeout: AI_TIMEOUT });
}

async function settle(page: Page) {
  await page.waitForFunction(() => !document.querySelector("[role=status]"), null, { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(600);
}
