const FIRST_CONTENTFUL_PAINT = "first-contentful-paint";
const GIVE_UP_AFTER_MS = 3000;

let painted: Promise<void> | undefined;

export const hasPainted = (): boolean => performance.getEntriesByName(FIRST_CONTENTFUL_PAINT).length > 0;

export function afterFirstPaint(): Promise<void> {
  painted ??= new Promise<void>((resolve) => {
    const measurable = typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes.includes("paint");
    if (!measurable || document.visibilityState === "hidden") return resolve();
    const finish = () => {
      observer.disconnect();
      window.clearTimeout(timer);
      resolve();
    };
    const observer = new PerformanceObserver((entries) => {
      if (entries.getEntriesByName(FIRST_CONTENTFUL_PAINT).length > 0) finish();
    });
    const timer = window.setTimeout(finish, GIVE_UP_AFTER_MS);
    observer.observe({ type: "paint", buffered: true });
  });
  return painted;
}
