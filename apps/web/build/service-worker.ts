import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { Plugin } from "vite";

type Options = { fileName: string; skip: (path: string) => boolean };

export function serviceWorker({ fileName, skip }: Options): Plugin {
  let outDir = "";
  return {
    name: "dittle:service-worker",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir.startsWith(sep) ? config.build.outDir : join(config.root, config.build.outDir);
    },
    async closeBundle() {
      const paths = (await readdir(outDir, { recursive: true, withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .map((entry) => `/${relative(outDir, join(entry.parentPath, entry.name)).split(sep).join("/")}`)
        .filter((path) => path !== `/${fileName}` && !skip(path))
        .sort();
      const hash = createHash("sha256");
      for (const path of paths) hash.update(path).update(await readFile(join(outDir, path)));
      const version = hash.digest("hex").slice(0, 12);
      await writeFile(join(outDir, fileName), `(${worker})(${JSON.stringify(version)},${JSON.stringify(paths)});\n`);
    },
  };
}

type ExtendableEvent = Event & { waitUntil(promise: Promise<unknown>): void };
type FetchEvent = ExtendableEvent & { request: Request; respondWith(response: Promise<Response>): void };
type WorkerScope = {
  location: Location;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  addEventListener(type: "install" | "activate", listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: "fetch", listener: (event: FetchEvent) => void): void;
};

function worker(version: string, files: string[]) {
  const scope = self as unknown as WorkerScope;
  const prefix = "dittle-app-";
  const cacheName = `${prefix}${version}`;
  const shell = "/index.html";
  const precached = new Set(files);
  const networkWait = 3000;

  scope.addEventListener("install", (event) => {
    event.waitUntil(
      caches
        .open(cacheName)
        .then((cache) => cache.addAll(files.map((file) => new Request(file, { cache: "no-cache" }))))
        .then(() => scope.skipWaiting()),
    );
  });

  scope.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((key) => key.startsWith(prefix) && key !== cacheName).map((key) => caches.delete(key))))
        .then(() => scope.clients.claim()),
    );
  });

  scope.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== scope.location.origin || url.pathname.startsWith("/__/")) return;
    if (request.mode === "navigate") event.respondWith(page(request));
    else if (precached.has(url.pathname)) event.respondWith(cached(url.pathname, request));
  });

  async function page(request: Request): Promise<Response> {
    const fromNetwork = fetch(request);
    fromNetwork.catch(() => undefined);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Slow network")), networkWait));
    try {
      return await Promise.race([fromNetwork, timeout]);
    } catch {
      return (await caches.match(shell, { cacheName })) ?? fromNetwork;
    }
  }

  async function cached(path: string, request: Request): Promise<Response> {
    return (await caches.match(path, { cacheName })) ?? fetch(request);
  }
}
