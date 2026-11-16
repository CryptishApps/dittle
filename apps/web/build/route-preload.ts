import type { Plugin, Rolldown } from "vite";

type OutputBundle = Rolldown.OutputBundle;
type OutputChunk = Rolldown.OutputChunk;

type Options = { routesDir: string; authModule: string; sessionKey: string; everyPage: string[]; app: { paths: string[]; modules: string[] } };

export function routePreload({ routesDir, authModule, sessionKey, everyPage, app }: Options): Plugin {
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
          if (path) routes[path] = [...(routes[path] ?? []), ...[...closure(bundle, chunk.fileName)].filter((file) => !loaded.has(file)).map((file) => `/${file}`)];
        }
        const filesFor = (moduleIds: string[]) =>
          chunks
            .filter((chunk) => chunk.facadeModuleId && moduleIds.includes(chunk.facadeModuleId))
            .flatMap((chunk) => [...closure(bundle, chunk.fileName)])
            .filter((file, index, all) => !loaded.has(file) && all.indexOf(file) === index)
            .map((file) => `/${file}`);

        const signedIn = { auth: filesFor([authModule]), appPaths: app.paths, app: filesFor(app.modules) };
        const script = `(${preload})(${JSON.stringify(routes)},${JSON.stringify(filesFor(everyPage))},${JSON.stringify(signedIn)},${JSON.stringify(sessionKey)})`;
        return [{ tag: "script", children: script, injectTo: "head-prepend" }];
      },
    },
  };
}

function preload(
  routes: Record<string, string[]>,
  always: string[],
  signedIn: { auth: string[]; appPaths: string[]; app: string[] },
  key: string,
) {
  const path = location.pathname.replace(/\/$/, "") || "/";
  const parts = path.split("/");
  const matches = (pattern: string) => {
    const want = pattern.split("/");
    if (pattern !== "/" ? want.length > parts.length : path !== "/") return false;
    return want.every((segment, index) => segment === parts[index] || segment.startsWith("$"));
  };
  let files = always.concat(...Object.keys(routes).filter(matches).map((pattern) => routes[pattern]!));
  try {
    if (localStorage.getItem(key)) {
      files = files.concat(signedIn.auth);
      if (signedIn.appPaths.some((prefix) => path.startsWith(prefix))) files = files.concat(signedIn.app);
    }
  } catch {}
  for (const href of new Set(files)) {
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
  if (segments.some((segment) => segment.startsWith("("))) return undefined;
  return `/${segments.join("/")}`;
}
