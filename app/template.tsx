"use client";

/**
 * Route transition — MOTION.md "Global (new files)".
 *
 * Next remounts a template on every navigation at its segment level, so this is
 * where a `stone` panel covers the incoming page and slides up (`y: 0 → -100%`,
 * 0.9s `EASE_IN_OUT`): moving to /credits and back feels like one site.
 *
 * On the very first load the Preloader owns the entrance. If
 * `document.documentElement.dataset.ready` is not "true" when this mounts, no
 * panel is rendered at all. That read never happens during render — the server
 * and the hydrating client both render only `children` — and it lives in a
 * layout effect rather than a passive one so that, on a client navigation, the
 * panel is already in place for the first painted frame instead of the new page
 * flashing for a frame before being covered. (React 19 no longer warns about
 * `useLayoutEffect` during SSR; it is simply a no-op there.) The decision is
 * re-taken per pathname, so it holds even if the segment instance is reused.
 *
 * The Preloader renders nothing on a client navigation (the document is already
 * marked ready), so the back direction from /credits is this wipe too, not a
 * second entrance ritual.
 *
 * Reduced motion: no panel — the page is shown immediately.
 */

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { EASE_IN_OUT } from "@/lib/motion";

type Panel = "undecided" | "cover" | "done";

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [panel, setPanel] = useState<Panel>("undecided");

  useLayoutEffect(() => {
    const firstLoad = document.documentElement.dataset.ready !== "true";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPanel(firstLoad || reduced ? "done" : "cover");
  }, [pathname]);

  return (
    <>
      {children}
      {panel === "cover" ? (
        <motion.div
          key={pathname}
          aria-hidden="true"
          className="fixed inset-0 z-[80] bg-stone will-change-transform"
          initial={{ y: 0 }}
          animate={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: EASE_IN_OUT }}
          onAnimationComplete={() => setPanel("done")}
        />
      ) : null}
    </>
  );
}
