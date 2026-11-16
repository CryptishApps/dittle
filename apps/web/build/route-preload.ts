import type { Plugin, Rolldown } from "vite";

type OutputBundle = Rolldown.OutputBundle;
type OutputChunk = Rolldown.OutputChunk;

type Options = { routesDir: string; authModule: string; sessionKey: string; everyPage: string[] };

export function routePreload({ routesDir, authModule, sessionKey, everyPage }: Options): Plugin {
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

        const routes: Record<string, string[]> = {};
        for (const chunk of chunks) {
          const id = chunk.facadeModuleId ?? "";
          if (!id.startsWith(routesDir) || !id.includes("tsr-split=component")) continue;
          const path = urlPath(id.slice(routesDir.length).replace(/\?.*$/, ""));
          if (path) routes[path] = [...closure(bundle, chunk.fileName)].filter((file) => !loaded.has(file)).map((file) => `/${file}`);
        }
        const filesFor = (moduleIds: string[]) =>
          chunks
            .filter((chunk) => chunk.facadeModuleId && moduleIds.includes(chunk.facadeModuleId))
            .flatMap((chunk) => [...closure(bundle, chunk.fileName)])
            .filter((file, index, all) => !loaded.has(file) && all.indexOf(file) === index)
            .map((file) => `/${file}`);

        const script = `(${preload})(${JSON.stringify(routes)},${JSON.stringify(filesFor(everyPage))},${JSON.stringify(filesFor([authModule]))},${JSON.stringify(sessionKey)})`;
        return [{ tag: "script", children: script, injectTo: "head-prepend" }];
      },
    },
  };
}

function preload(routes: Record<string, string[]>, always: string[], auth: string[], key: string) {
  let files = always.concat(routes[location.pathname] ?? []);
  try {
    if (localStorage.getItem(key)) files = files.concat(auth);
  } catch {}
  for (const href of files) {
    const link = document.createElement("link");
    link.rel = "modulepreload";
    link.href = href;
    document.head.appendChild(link);
  }
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
  if (segments.some((segment) => segment.startsWith("$") || segment.startsWith("("))) return undefined;
  return `/${segments.join("/")}`;
}
