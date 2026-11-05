import { API_ENDPOINTS } from "@/Utils/Constant";
import { calls } from "@/Services/Epurse/onboarding.api";

// Term Deposits (Admin Portal: Term Deposits handoff). Every call is a POST
// with a JSON body; records carry `actions` saying which buttons apply to
// this user now. Amounts and rates go as strings.
// `listPath`: the list call's path (list/options, live channel).

// TERM DEPOSITS > Deposit Products (menu 180): the policy, tenors and rate
// bands of a TERM_DEPOSIT account product, one maker-checker record.
export const depositProductsApi = calls(API_ENDPOINTS.DEPOSIT.PRODUCT, [
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
export const depositsApi = calls(API_ENDPOINTS.DEPOSIT.CONTRACT, [
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
export const balanceAdjustmentsApi = calls(API_ENDPOINTS.LEDGER.ADJUSTMENT, ["options", "lookup", "quote", "add", "auth", "deauth", "cancel", "list", "get"]);

// GLOBAL SETTINGS > Scheduled Jobs (menu 183): the platform's daily jobs.
export const scheduledJobsApi = calls(API_ENDPOINTS.SCHEDULER.JOB, ["list", "runs", "edit", "run"]);
