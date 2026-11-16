import { chromium, type Page } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:5180";
const out = new URL("../shots/", import.meta.url).pathname;
const executablePath = process.env.CHROME_PATH;
if (!executablePath) throw new Error("Set CHROME_PATH to a Chrome or Chromium binary.");

const browser = await chromium.launch({ executablePath });

for (const theme of ["light", "dark"] as const) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
  const shot = (name: string) => page.screenshot({ path: `${out}${name}-${theme}.png` });
  const away = async () => {
    await page.mouse.move(2, 450);
    await page.waitForTimeout(450);
  };

  await open(page);
  await page.locator(".token").nth(2).hover();
  await page.waitForTimeout(600);
  await shot("hover");

  await away();
  await page.getByRole("button", { name: /Insert 7 meals/ }).hover();
  await page.waitForTimeout(700);
  await shot("write");

  await away();
  const guests = page.getByRole("textbox", { name: "Guest count" });
  await guests.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("95");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1400);
  await shot("change");
  await away();
  await page.waitForTimeout(800);
  await shot("hero");

  await page.getByRole("button", { name: "Budget", exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.locator(".token").first().hover();
  await page.waitForTimeout(600);
  await shot("stale");
  await page.getByRole("button", { name: /^Use 95$/ }).click();
  await away();
  await page.getByRole("button", { name: /Inbox/ }).first().click();
  await page.waitForTimeout(1400);
  await shot("inbox");

  await page.close();
}

await browser.close();
console.log(`Saved screenshots to ${out}`);

async function open(page: Page) {
  await page.goto(`${base}/dev/designs/app`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "[data-dev-nav] { display: none !important; }" });
  await page.waitForTimeout(2600);
}
