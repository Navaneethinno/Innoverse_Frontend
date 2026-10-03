import { request } from "@/Services/Epurse/onboarding.api";

// Term Deposits (Admin Portal: Term Deposits handoff). Every call is a POST
// with a JSON body; records carry `actions` saying which buttons apply to
// this user now. Amounts and rates go as strings.
const calls = (base, verbs) => Object.fromEntries(verbs.map((verb) => [verb, (body = {}) => request(`${base}/${verb}`, body)]));

// TERM DEPOSITS > Deposit Products (menu 180): the policy, tenors and rate
// bands of a TERM_DEPOSIT account product, one maker-checker record.
export const depositProductsApi = calls("/config/deposit/product", [
  "options",
  "list",
  "pending",
  "get",
  "audit",
  "rate_quote",
  "add",
  "edit",
  "submit",
  "delete",
  "deactivate",
  "reactivate",
  "auth",
  "deauth",
]);

// TERM DEPOSITS > Deposits (menu 181): deposits opened for customers and
// merchants, their interest, maturity instruction and early closure.
export const depositsApi = calls("/config/deposit/contract", [
  "options",
  "quote",
  "open",
  "auth",
  "deauth",
  "cancel",
  "list",
  "get",
  "accruals",
  "instruct",
  "preclose_quote",
  "preclose",
  "preclose_auth",
  "preclose_deauth",
  "preclose_cancel",
]);

// EPURSE > Balance Adjustments (menu 182): cash in / out and credit / debit
// corrections, posted through the transaction engine when a checker
// approves. options lists the four types; quote is the plan (fee, balance
// after) for the same body as add.
export const balanceAdjustmentsApi = calls("/config/ledger/adjustment", ["options", "quote", "add", "auth", "deauth", "cancel", "list", "get"]);

// GLOBAL SETTINGS > Scheduled Jobs (menu 183): the platform's daily jobs.
export const scheduledJobsApi = calls("/config/scheduler/job", ["list", "runs", "edit", "run"]);
