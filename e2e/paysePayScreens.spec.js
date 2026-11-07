import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Opens each PaysePay screen and checks it renders without a crash. Looks only.
const SCREENS = [
  "billautopay", "campaigns", "requestmoneyqr", "paymentrequests", "devicesecurity", "bounddevices",
  "guestpayments", "partnerapi", "cardriskrules", "cardreturns", "cardreports", "glbalancealerts",
  "bulkpayouts", "merchantbulkpayouts", "safqueue", "terminalbatches", "terminalmonitor",
  "agentfloatlimits", "posprofiletemplates", "productcatalogue", "customerblocks", "disputesettings",
];

test("PaysePay screens open without errors", async ({ page }) => {
  test.setTimeout(600000);
  await signIn(page);
  const report = [];
  for (const slug of SCREENS) {
    const errors = [];
    const onError = (e) => errors.push(e.message);
    page.on("pageerror", onError);
    await page.goto(`/${slug}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
    const text = await page.locator("main").innerText().catch(() => "");
    const crashed = /something went wrong|unexpected application error/i.test(text);
    report.push({ slug, crashed, errors, head: text.slice(0, 140).replace(/\s+/g, " ") });
    if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/pp-${slug}.png`, fullPage: true });
    page.off("pageerror", onError);
  }
  console.log(JSON.stringify(report, null, 1));
  expect(report.filter((r) => r.crashed || r.errors.length)).toEqual([]);
});
