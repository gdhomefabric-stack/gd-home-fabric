import { useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";

const subscribeNever = () => () => {};

/**
 * `useReducedMotion` that is `false` on the server and during hydration, and
 * the user's real preference afterwards.
 *
 * Motion's own hook returns `null` on the server but `true` on the very first
 * client render for a reduced-motion user, so a component whose *markup*
 * branches on it (different elements, different counts) would not match the
 * server HTML and React would throw a hydration error (#418) and re-render the
 * tree. Use this wherever the preference changes what is rendered, not just
 * how it moves. Styles and transitions can keep using `useReducedMotion`.
 */
export function useReducedMotionSafe(): boolean {
  const prefers = useReducedMotion();
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  return hydrated && prefers === true;
}
