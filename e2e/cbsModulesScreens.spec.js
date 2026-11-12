import { expect, test } from "@playwright/test";
import { fillLogin } from "./helpers";

// Admin 19–24 (Interest, Deposits, Loans, Share Capital, Gold Loan,
// InnoTreasury): opens each screen and records crashes and refused API calls.
// Looks only: nothing is saved. Sign-in from E2E_ORG / E2E_USER / E2E_PASSWORD.
const LIST = [
  // Interest
  "interestschemes", "agecategories", "customerparameters", "benchmarkrates", "interestrateconfiguration", "productinterestmapping",
  "interestrateapproval", "interestsimulation", "accountinterestinquiry", "interestratehistory",
  // Deposits
  "recurringdepositproducts", "islamicdepositproducts", "depositproductrules", "depositcharges", "prematureclosurerules", "noticedepositterms",
  "groupsavingsschemes", "depositinsurance", "recurringdeposits", "noticedeposits", "sweep&flexideposits", "savingsgroups", "accountmandates",
  "depositortaxprofiles", "profitdistribution", "depositreports",
  // Loans
  "lendingregulatoryrules", "repaymentstructures", "loanservicingrules", "loanschemes", "islamicfinancingproducts", "loancalculator",
  "prepayments", "moratoriums", "penalties&waivers", "islamicfinancing", "charityfund", "loanreports",
  // Share Capital
  "sharecategories", "sharerequirementrules", "members", "sharepurchases", "shareholdings", "sharecertificates", "sharetransfers",
  "shareredemptions", "returns&dividends", "sharereports",
  // Gold Loan
  "purity&valuation", "goldratemanagement", "goldloanproducts", "lockermanagement", "newgoldloanapplication", "goldornamentinventory",
  "packetmanagement", "packetmovement", "goldloanaccounts", "interest&charges", "repayment&pre-closure", "goldrelease", "overduemanagement",
  "auctionmanagement", "physicalverification", "goldloanreports",
  // InnoTreasury
  "counterparties", "exposurelimits", "investmentpolicy", "interbankaccounts", "demataccounts", "securities", "statutoryreserves",
  "almassumptions", "alertrules", "marketrates", "interbanktransactions", "interbanktransfers", "bankreconciliation", "fd&moneymarket",
  "securitytransactions", "portfoliovaluation", "borrowingfacilities", "drawdowns&utilisation", "forexdeals", "fxrevaluation",
  "collateral&margin", "guarantees&lcs", "assetregister", "depreciation&disposal", "exposuremonitor", "reservecompliance", "alm&liquidity",
  "treasuryschedule", "alertcentre", "treasuryreports",
];
const SCREENS = process.env.E2E_SLUGS ? process.env.E2E_SLUGS.split(",") : LIST;

test("InnoCBS and InnoTreasury screens open without errors", async ({ page }) => {
  test.setTimeout(1800000);
  if (!process.env.E2E_PASSWORD) throw new Error("Set E2E_PASSWORD");
  await fillLogin(page, process.env.E2E_ORG ?? "AP", process.env.E2E_USER ?? "Astra1", process.env.E2E_PASSWORD);
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 60000 });
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible({ timeout: 30000 });

  const report = [];
  let refused = [];
  page.on("response", async (res) => {
    if (res.request().method() !== "POST" || !res.url().includes("innovitegrasuite") || !res.headers()["content-type"]?.includes("json")) return;
    let body;
    try {
      body = await res.json();
    } catch {
      return;
    }
    if (res.status() >= 400 || (body && body.code !== undefined && body.code !== 1 && body.status !== "Success")) {
      refused.push(`${new URL(res.url()).pathname} ${res.status()} ${String(body?.message ?? "").slice(0, 120)}`);
    }
  });
  for (const slug of SCREENS) {
    const errors = [];
    refused = [];
    const onError = (e) => errors.push(e.message);
    page.on("pageerror", onError);
    await page.goto(`/${encodeURI(slug)}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1200);
    const text = await page.locator("main").innerText().catch(() => "");
    const crashed = /something went wrong|unexpected application error|page not found/i.test(text);
    report.push({ slug, crashed, errors, refused: [...new Set(refused)], head: text.slice(0, 100).replace(/\s+/g, " ") });
    if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/cbs-${slug.replace(/[&]/g, "_")}.png`, fullPage: true });
    page.off("pageerror", onError);
  }
  console.log(JSON.stringify(report.filter((r) => r.crashed || r.errors.length || r.refused.length), null, 1));
  console.log(`checked ${report.length} screens`);
  expect(report.filter((r) => r.crashed || r.errors.length)).toEqual([]);
});
