import { useSyncExternalStore } from "react";

/**
 * Price formatting and the date-gated pack-of-2 coupon (FACTS.md "Offer").
 *
 * The coupon copy lives here, in client code, and is never passed as a prop or
 * rendered on the server: it must not appear in the static HTML, the RSC
 * payload or the JSON-LD, and it must disappear by itself once the offer ends.
 * `usePromo()` is `false` on the server and during hydration, then checks the
 * visitor's clock after mount.
 */

/** 26 Oct 2026 00:00 IST. */
export const PROMO_START = Date.parse("2026-10-26T00:00:00+05:30");
/** 8 Nov 2026 23:59:59 IST: hidden automatically after this. */
export const PROMO_END = Date.parse("2026-11-08T23:59:59+05:30");

export const PROMO_TEXT = "5% coupon on Amazon.in, 26 Oct to 8 Nov 2026, applied on Amazon";

/** Only the pack-of-2 listings carry the coupon. */
export const promoApplies = (pack: string) => pack === "Pack of 2";

export function formatInr(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

const promoRunning = () => {
  const now = Date.now();
  return now >= PROMO_START && now <= PROMO_END;
};

/** Re-check at the next boundary (start or end) if it falls within a timer's reach. */
function subscribePromo(onChange: () => void): () => void {
  const now = Date.now();
  const next = now < PROMO_START ? PROMO_START : now <= PROMO_END ? PROMO_END + 1000 : null;
  if (next === null) return () => {};
  const wait = next - now;
  if (wait > 2_147_000_000) return () => {};
  const timer = window.setTimeout(onChange, wait);
  return () => window.clearTimeout(timer);
}

export function usePromo(): boolean {
  return useSyncExternalStore(subscribePromo, promoRunning, () => false);
}
