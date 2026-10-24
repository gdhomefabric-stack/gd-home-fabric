// Headless interaction captures. Usage:
//   node tools/interact.mjs <url> <outDir>
// Same Playwright setup as tools/shot.mjs (desktop 1440x900, headless shell
// from ~/confession-onboarding/.tools). Waits for the preloader (data-ready),
// then drives the interactive states a scroll-only capture cannot reach —
// menu overlay, product hover, finder chips, care accordion, curtain footer —
// and writes one PNG per state plus interact.json (console errors, Lenis and
// custom-cursor presence).
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "/Users/rohit93/confession-onboarding/.tools/node_modules/playwright-core/index.mjs";

const executablePath =
  "/Users/rohit93/confession-onboarding/.tools/browsers/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell";

const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) {
  console.error("usage: node tools/interact.mjs <url> <outDir>");
  process.exit(2);
}

mkdirSync(outDir, { recursive: true });
const width = 1440;
const height = 900;
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
});

const logs = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") logs.push(`${m.type()}: ${m.text()}`);
});
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
page.on("requestfailed", (r) => logs.push(`requestfailed: ${r.url()} ${r.failure()?.errorText ?? ""}`));

const steps = [];
const shots = [];

/** Scroll so `selector`'s top sits `offset` px below the viewport top; drives native + Lenis. */
async function scrollToSelector(selector, offset = 96) {
  const ok = await page.evaluate(
    ({ selector, offset }) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const y = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - offset));
      window.scrollTo({ top: y, behavior: "auto" });
      // @ts-ignore
      window.__lenis?.scrollTo?.(y, { immediate: true });
      return true;
    },
    { selector, offset },
  );
  if (!ok) logs.push(`note: ${selector} not found for scroll`);
  return ok;
}

async function scrollToBottom() {
  await page.evaluate(() => {
    const y = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: y, behavior: "auto" });
    // @ts-ignore
    window.__lenis?.scrollTo?.(y, { immediate: true });
  });
}

async function shot(name) {
  const file = `${outDir}/${name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  shots.push(file);
  return file;
}

/** Click at the centre of an element without letting Playwright re-scroll the page. */
async function clickCentre(locator, label) {
  const box = await locator.first().boundingBox();
  if (!box) {
    logs.push(`note: ${label} has no bounding box (not found or hidden)`);
    return false;
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return true;
}

async function hoverCentre(locator, label) {
  const box = await locator.first().boundingBox();
  if (!box) {
    logs.push(`note: ${label} has no bounding box (not found or hidden)`);
    return false;
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
  return true;
}

await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
await page
  .waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 6_000 })
  .catch(() => logs.push("note: data-ready never set within 6s"));
await page.waitForTimeout(600);

// Wake the custom cursor so it is part of every capture (it only shows after a pointermove).
await page.mouse.move(width / 2, height / 2, { steps: 4 });
await page.waitForTimeout(200);

// 1. Menu overlay open.
{
  const menuBtn = page.locator('button[aria-controls="site-menu"]');
  const clicked = await clickCentre(menuBtn, "MENU button");
  await page.waitForTimeout(1200);
  const open = await page.evaluate(() => !!document.getElementById("site-menu"));
  steps.push({ step: "i-01-menu-open", clicked, menuRendered: open });
  await shot("i-01-menu-open");
  await page.keyboard.press("Escape");
  // The panel's exit wipe is 0.9s and AnimatePresence keeps #site-menu mounted
  // until it ends. Wait for the unmount itself (up to 4s) and record how long
  // it took, so a slow headless exit is distinguishable from a real failure.
  const escapedAt = Date.now();
  const closed = await page
    .waitForFunction(() => !document.getElementById("site-menu"), null, { timeout: 4000 })
    .then(() => true, () => false);
  steps.push({
    step: "i-01-menu-escape",
    closedAfterEscape: closed,
    closeMs: Date.now() - escapedAt,
  });
}

// 2. First product card hovered.
{
  await scrollToSelector("#range", 96);
  await page.waitForTimeout(1100);
  const card = page.locator("#range li.group");
  const hovered = await hoverCentre(card, "first product card");
  await page.waitForTimeout(1000);
  steps.push({ step: "i-02-product-hover", hovered, cards: await card.count() });
  await shot("i-02-product-hover");
  await page.mouse.move(width - 40, height / 2, { steps: 4 });
}

// 3. Finder: stomach + firm.
{
  await scrollToSelector("#finder", 96);
  await page.waitForTimeout(1100);
  const stomach = page.locator("#finder button[aria-pressed]", { hasText: /^\s*stomach\s*$/i });
  const firm = page.locator("#finder button[aria-pressed]", { hasText: /^\s*firm\s*$/i });
  const a = await clickCentre(stomach, 'finder "stomach" chip');
  await page.waitForTimeout(350);
  const b = await clickCentre(firm, 'finder "firm" chip');
  await page.waitForTimeout(1000);
  const pressed = await page.evaluate(() =>
    [...document.querySelectorAll('#finder button[aria-pressed="true"]')].map((el) => el.textContent?.trim()),
  );
  steps.push({ step: "i-03-finder", clickedStomach: a, clickedFirm: b, pressed });
  await shot("i-03-finder");
  await page.mouse.move(width - 40, height / 2, { steps: 4 });
}

// 4. Care: second question open.
{
  await scrollToSelector("#care", 96);
  await page.waitForTimeout(1100);
  const q2 = page.locator("#care button[aria-expanded]").nth(1);
  const clicked = await clickCentre(q2, "second care question");
  await page.waitForTimeout(1000);
  const expanded = await page.evaluate(() =>
    [...document.querySelectorAll("#care button[aria-expanded]")].map((el) => el.getAttribute("aria-expanded")),
  );
  steps.push({ step: "i-04-care-open", clicked, expanded });
  await shot("i-04-care-open");
  await page.mouse.move(width - 40, height / 2, { steps: 4 });
}

// 5. Footer uncovered.
{
  await scrollToBottom();
  await page.waitForTimeout(1200);
  const pos = await page.evaluate(() => ({
    scrollY: Math.round(window.scrollY),
    scrollHeight: document.documentElement.scrollHeight,
    footerH: getComputedStyle(document.documentElement).getPropertyValue("--footer-h").trim(),
  }));
  steps.push({ step: "i-05-footer", ...pos });
  await shot("i-05-footer");
}

const probe = await page.evaluate(() => ({
  hasLenis: !!window.__lenis,
  cursorPresent: !!document.querySelector("[data-gdhf-cursor]"),
}));

const report = { url, width, height, ...probe, logs, steps, shots };
writeFileSync(`${outDir}/interact.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
