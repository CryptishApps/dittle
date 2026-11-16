import { readdir } from "node:fs/promises";
import sharp from "sharp";

const source = new URL("../shots/", import.meta.url).pathname;
const out = new URL("../public/shots/", import.meta.url).pathname;
export const SHOT_WIDTHS = [1440, 2880] as const;

const files = (await readdir(source)).filter((file) => file.endsWith(".png"));
await Promise.all(
  files.flatMap((file) => {
    const name = file.replace(/\.png$/, "");
    return SHOT_WIDTHS.flatMap((width) => {
      const image = () => sharp(`${source}${file}`).resize({ width, withoutEnlargement: true });
      return [
        image().avif({ quality: 55, effort: 7 }).toFile(`${out}${name}-${width}.avif`),
        image().webp({ quality: 80, effort: 6 }).toFile(`${out}${name}-${width}.webp`),
      ];
    });
  }),
);
console.log(`Encoded ${files.length} screenshots into ${out}`);
