import { expect, test } from "@playwright/test";
import { fillLogin } from "./helpers";

// Layout check of a few Admin 19–24 screens: phone width, and an add form
// opened (never submitted). Screenshots go to E2E_SHOTS.
const SHOTS = process.env.E2E_SHOTS;
const SCREENS = ["interestrateconfiguration", "recurringdeposits", "goldloanaccounts", "treasuryschedule", "sharepurchases", "prepayments"];

async function login(page) {
  if (!process.env.E2E_PASSWORD) throw new Error("Set E2E_PASSWORD");
  await fillLogin(page, process.env.E2E_ORG ?? "AP", process.env.E2E_USER ?? "Astra1", process.env.E2E_PASSWORD);
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 60000 });
}

test("phone width has no sideways scroll", async ({ page }) => {
  test.setTimeout(600000);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const wide = [];
  for (const slug of SCREENS) {
    await page.goto(`/${slug}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1000);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 2) wide.push({ slug, over });
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/m-${slug}.png`, fullPage: true });
  }
  console.log(JSON.stringify(wide));
  expect(wide).toEqual([]);
});

test("add forms lay out", async ({ page }) => {
  test.setTimeout(600000);
  await login(page);
  for (const [slug, button] of [["interestschemes", "Add"], ["recurringdeposits", "Open a recurring deposit"], ["newgoldloanapplication", "New valuation"], ["forexdeals", "New deal"], ["interestrateconfiguration", "Enter a rate card"]]) {
    await page.goto(`/${slug}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.getByRole("button", { name: button, exact: true }).first().click();
    await page.waitForTimeout(1500);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/f-${slug}.png` });
    // and the bottom of the form, where the toggles sit
    await page.locator("[role=dialog] *").evaluateAll((els) => els.forEach((e) => { if (e.scrollHeight > e.clientHeight + 4) e.scrollTop = e.scrollHeight; }));
    await page.waitForTimeout(300);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/f-${slug}-end.png` });
    await page.keyboard.press("Escape");
  }
});
