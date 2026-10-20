import { lazy, type ComponentType } from "react";

type Loader<T> = () => Promise<{ default: T }>;
const loaders: Loader<unknown>[] = [];
const RELOAD_KEY = "wizchat-chunk-reload";

/** Lazy page loader that retries failed chunk downloads and recovers from stale builds. */
export function lazyWithRetry<T extends ComponentType<any>>(loader: Loader<T>) {
  loaders.push(loader as Loader<unknown>);
  return lazy(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const mod = await loader();
        sessionStorage.removeItem(RELOAD_KEY);
        return mod;
      } catch (err) {
        if (attempt === 2) {
          // Online + stale chunk (after a new publish): reload once for fresh files.
          if (navigator.onLine && !sessionStorage.getItem(RELOAD_KEY)) {
            sessionStorage.setItem(RELOAD_KEY, "1");
            window.location.reload();
            return new Promise<{ default: T }>(() => {});
          }
          throw err;
        }
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    throw new Error("unreachable");
  });
}

/** Download every page in the background so all tabs open offline later. */
export function prefetchAllPages() {
  if (!navigator.onLine) return;
  const run = () => loaders.forEach((l) => l().catch(() => {}));
  const ric = (window as any).requestIdleCallback as ((cb: () => void) => void) | undefined;
  setTimeout(() => (ric ? ric(run) : run()), 2500);
}
