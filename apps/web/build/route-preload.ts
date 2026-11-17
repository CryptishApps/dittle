import type { Plugin, Rolldown } from "vite";

type OutputBundle = Rolldown.OutputBundle;
type OutputChunk = Rolldown.OutputChunk;

type SignedIn = { home: string; paths: string[]; first: string[]; later: string[] };
type Options = { routesDir: string; sessionKey: string; everyPage: string[]; signedIn: SignedIn };

export function routePreload({ routesDir, sessionKey, everyPage, signedIn }: Options): Plugin {
  return {
    name: "dittle:route-preload",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, { bundle }) {
        if (!bundle) return;
        const chunks = Object.values(bundle).filter((output): output is OutputChunk => output.type === "chunk");
        const entry = chunks.find((chunk) => chunk.isEntry);
        if (!entry) return;
        const loaded = closure(bundle, entry.fileName);

        const files: string[] = [];
        const numbered = (names: Iterable<string>) => [...new Set(names)].filter((file) => !loaded.has(file)).map((file) => (files.includes(file) ? files.indexOf(file) : files.push(file) - 1));

        const byRoute: Record<string, string[]> = {};
        for (const chunk of chunks) {
          const id = chunk.facadeModuleId ?? "";
          if (!id.startsWith(routesDir) || !id.includes("tsr-split=component")) continue;
          const path = urlPath(id.slice(routesDir.length).replace(/\?.*$/, ""));
          if (path) byRoute[path] = [...(byRoute[path] ?? []), ...closure(bundle, chunk.fileName)];
        }
        const routes = Object.fromEntries(Object.entries(byRoute).map(([path, names]) => [path, numbered(names)]));
        const filesFor = (moduleIds: string[]) =>
          numbered(chunks.filter((chunk) => chunk.facadeModuleId && moduleIds.includes(chunk.facadeModuleId)).flatMap((chunk) => [...closure(bundle, chunk.fileName)]));

        const plan = {
          routes,
          always: filesFor(everyPage),
          signedIn: { home: signedIn.home, paths: signedIn.paths, first: filesFor(signedIn.first), later: filesFor(signedIn.later) },
          files,
          key: sessionKey,
        };
        return [{ tag: "script", children: `(${preload})(${JSON.stringify(plan)})`, injectTo: "head" }];
      },
    },
  };
}

type Plan = {
  routes: Record<string, number[]>;
  always: number[];
  signedIn: { home: string; paths: string[]; first: number[]; later: number[] };
  files: string[];
  key: string;
};

function preload({ routes, always, signedIn, files, key }: Plan) {
  let hinted = false;
  try {
    hinted = Boolean(localStorage.getItem(key));
  } catch {}
  const visited = location.pathname.replace(/\/$/, "") || "/";
  const path = hinted && visited === "/" ? signedIn.home : visited;
  const parts = path.split("/");
  const matches = (pattern: string) => {
    const want = pattern.split("/");
    if (pattern !== "/" ? want.length > parts.length : path !== "/") return false;
    return want.every((segment, index) => segment === parts[index] || segment.startsWith("$"));
  };
  const inApp = hinted && signedIn.paths.some((prefix) => path.startsWith(prefix));
  const now = new Set(always.concat(...Object.keys(routes).filter(matches).map((pattern) => routes[pattern]!), inApp ? signedIn.first : []));
  const later = new Set(inApp ? signedIn.later.filter((file) => !now.has(file)) : []);
  const add = (file: number, priority?: string) => {
    const link = document.createElement("link");
    link.rel = "modulepreload";
    link.href = `/${files[file]}`;
    if (priority) link.setAttribute("fetchpriority", priority);
    document.head.appendChild(link);
  };
  now.forEach((file) => add(file));
  later.forEach((file) => add(file, "low"));
}

function closure(bundle: OutputBundle, start: string): Set<string> {
  const seen = new Set<string>();
  const visit = (file: string) => {
    const chunk = bundle[file];
    if (seen.has(file) || chunk?.type !== "chunk") return;
    seen.add(file);
    chunk.imports.forEach(visit);
  };
  visit(start);
  return seen;
}

function urlPath(file: string): string | undefined {
  const segments = file
    .replace(/\.tsx?$/, "")
    .split(/[/.]/)
    .filter((segment) => !segment.startsWith("_") && segment !== "index");
  if (segments.some((segment) => segment.startsWith("("))) return undefined;
  return `/${segments.join("/")}`;
}
