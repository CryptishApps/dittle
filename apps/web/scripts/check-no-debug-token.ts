import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnv } from "vite";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const name = "VITE_APPCHECK_DEBUG_TOKEN";
const token = loadEnv("production", root, name)[name]?.trim();

if (!token) {
  console.log(`${name} is not set, so no debug token can be in dist.`);
} else {
  const needle = Buffer.from(token);
  const entries = await readdir(dist, { recursive: true, withFileTypes: true });
  const leaks: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const file = join(entry.parentPath, entry.name);
    if ((await readFile(file)).includes(needle)) leaks.push(file);
  }
  if (leaks.length > 0) {
    console.error(`The App Check debug token is in the build output. Do not deploy it:\n${leaks.join("\n")}`);
    process.exit(1);
  }
  console.log(`Checked ${entries.length} entries in dist: the App Check debug token is not there.`);
}
