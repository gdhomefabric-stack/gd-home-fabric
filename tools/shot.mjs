// Headless visual check. Usage:
//   node tools/shot.mjs <url> <outDir> [--mobile] [--scrolls=0,0.15,0.3,...] [--settle=1800]
// Takes a screenshot at each scroll fraction, dumps console errors, reports
// horizontal overflow and the largest content width. Reuses the Playwright
// install from ~/confession-onboarding/.tools (chromium headless shell 1243).
// `--settle` is the wait after each scroll before the capture; the default
// outlasts ImageReveal's 1.3s clip wipe plus the card stagger, so a paper band
// in a capture is a trigger that did not fire, not a wipe caught mid-way.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/rohit93/confession-onboarding/.tools/node_modules/playwright-core/index.mjs";

const executablePath =
  "/Users/rohit93/confession-onboarding/.tools/browsers/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell";

const [url, outDir, ...flags] = process.argv.slice(2);
if (!url || !outDir) {
  console.error("usage: node tools/shot.mjs <url> <outDir> [--mobile] [--scrolls=a,b,c]");
  process.exit(2);
}
const mobile = flags.includes("--mobile");
const scrollsFlag = flags.find((f) => f.startsWith("--scrolls="));
const scrolls = scrollsFlag
  ? scrollsFlag.slice(10).split(",").map(Number)
  : [0, 0.08, 0.18, 0.3, 0.42, 0.55, 0.68, 0.8, 0.9, 1];
const settleFlag = flags.find((f) => f.startsWith("--settle="));
const settleMs = settleFlag ? Number(settleFlag.slice(9)) || 1800 : 1800;

mkdirSync(outDir, { recursive: true });
const width = mobile ? 390 : 1440;
const height = mobile ? 844 : 900;
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
  isMobile: mobile,
  hasTouch: mobile,
});
const logs = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") logs.push(`${m.type()}: ${m.text()}`);
});
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
page.on("requestfailed", (r) => logs.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ""}`));

await page.goto(url, { waitUntil: "load", timeout: 90_000 });
// wait for the preloader to finish (or 6s)
await page
  .waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 6_000 })
  .catch(() => logs.push("note: data-ready never set within 6s"));
await page.waitForTimeout(600);

const metrics = await page.evaluate(() => {
  const cw = document.documentElement.clientWidth;
  const describe = (el) =>
    `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 3).join(".")} right=${Math.round(el.getBoundingClientRect().right)}`;
  // An element inside an `overflow: hidden|clip` ancestor (html/body excluded,
  // since body hides overflow-x globally) whose own box fits the viewport is
  // clipped and cannot widen the page — e.g. a scaled hero photo or a marquee
  // track. Those are only counted (`clippedOverflow`); `overflowing` lists the
  // elements that can really cause horizontal scroll.
  const isClipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if ((ox === "hidden" || ox === "clip") && p.getBoundingClientRect().right <= cw + 1) return true;
    }
    return false;
  };
  const wide = [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > cw + 1);
  const real = wide.filter((el) => !isClipped(el));
  return {
    scrollHeight: document.documentElement.scrollHeight,
    clientWidth: cw,
    scrollWidth: document.documentElement.scrollWidth,
    overflowing: real.slice(0, 12).map(describe),
    clippedOverflow: wide.length - real.length,
    headings: [...document.querySelectorAll("h1,h2,h3")].map((h) => `${h.tagName} ${h.textContent?.trim().slice(0, 60)}`),
    // Only a genuinely absent `alt` counts: decorative duplicates (the product
    // hover crossfades) carry an intentional `alt=""` + `aria-hidden`.
    imagesMissingAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length,
    imagesBroken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc).slice(0, 10),
  };
});

const shots = [];
for (const f of scrolls) {
  const y = Math.round((metrics.scrollHeight - height) * f);
  // drive both native and Lenis scroll
  await page.evaluate((y) => {
    window.scrollTo({ top: y, behavior: "auto" });
    // @ts-ignore
    window.__lenis?.scrollTo?.(y, { immediate: true });
  }, y);
  await page.waitForTimeout(settleMs);
  const file = `${outDir}/${mobile ? "m" : "d"}-${String(Math.round(f * 100)).padStart(3, "0")}.png`;
  await page.screenshot({ path: file, fullPage: false });
  shots.push(file);
}

const report = { url, mobile, width, height, settleMs, metrics, logs, shots };
writeFileSync(`${outDir}/report-${mobile ? "mobile" : "desktop"}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
