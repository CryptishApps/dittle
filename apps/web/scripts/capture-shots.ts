import { chromium, type Page } from "playwright-core";

const base = process.env.BASE_URL ?? "http://localhost:5180";
const out = new URL("../public/shots/", import.meta.url).pathname;
const executablePath = process.env.CHROME_PATH;
if (!executablePath) throw new Error("Set CHROME_PATH to a Chrome or Chromium binary.");

const panels: Record<string, number> = {
  update: 1600,
  insert: 800,
  recalc: 3200,
  buckets: 2600,
  collections: 3600,
  offline: 800,
  activity: 1600,
};

const browser = await chromium.launch({ executablePath });

for (const theme of ["light", "dark"] as const) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: theme,
    reducedMotion: "no-preference",
  });

  for (const [name, wait] of Object.entries(panels)) {
    await page.goto(`${base}/dev/shots/${name}`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: "html, body { background: transparent !important; }" });
    await page.waitForTimeout(wait);
    await page.locator("[data-shot]").screenshot({ path: `${out}${name}-${theme}.png`, omitBackground: true });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/dev/designs/document`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "[data-dev-nav] { display: none !important; }" });
  await editGuestCount(page);
  await page.screenshot({ path: `${out}editor-${theme}.png` });
  await page.close();
}

await browser.close();
console.log(`Saved screenshots to ${out}`);

async function editGuestCount(page: Page) {
  await page.waitForTimeout(1800);
  const guests = page.getByRole("textbox", { name: "Guest count" });
  await guests.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.type("95");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
}
