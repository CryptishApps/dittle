import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const favicon = await Bun.file(new URL("../public/favicon.svg", import.meta.url)).text();
const fullBleed = Buffer.from(favicon.replace(' rx="9"', ""));
const rounded = Buffer.from(favicon);
const out = (name: string) => new URL(`../public/icons/${name}`, import.meta.url).pathname;

await mkdir(out(""), { recursive: true });
const icons: [Buffer, number, string][] = [
  [rounded, 192, "icon-192.png"],
  [rounded, 512, "icon-512.png"],
  [fullBleed, 512, "maskable-512.png"],
  [fullBleed, 180, "apple-touch-icon.png"],
];
for (const [svg, size, name] of icons) await sharp(svg, { density: (72 * size) / 32 }).resize(size, size).png({ compressionLevel: 9 }).toFile(out(name));
