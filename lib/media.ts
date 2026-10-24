import { useCallback, useSyncExternalStore } from "react";

const noop = () => {};

function canMatch(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

/**
 * `window.matchMedia(query).matches` as a hook that is `false` on the server
 * and during hydration (so server and client markup match), then the live
 * result, re-rendering whenever the query flips.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatch()) return noop;
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(
    () => (canMatch() ? window.matchMedia(query).matches : false),
    [query],
  );
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
