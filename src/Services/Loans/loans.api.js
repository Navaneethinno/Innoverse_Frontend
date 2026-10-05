import { request } from "@/Services/Epurse/onboarding.api";

// Loans (Admin Portal: Loans handoff, module LOANS). Every call is a POST
// with a JSON body; records carry `actions` saying which buttons apply to
// this user now. Amounts and rates go as strings; rates are percent a year.
const calls = (base, verbs) => Object.fromEntries(verbs.map((verb) => [verb, (body = {}) => request(`${base}/${verb}`, body)]));

// The record a reply carries: data[0], or data itself when it is an object.
export const recordOf = (response) => (Array.isArray(response?.data) ? response.data[0] : response?.data) ?? null;

// Reference rates (Loan Products menu) for VARIABLE rate bands:
//   list { code?, status? } · add { code, annual_rate, effective_from } · auth / deauth { id }
export const loanReferenceRatesApi = calls("/config/loan/reference_rate", ["list", "add", "auth", "deauth"]);

// Lending Regulatory Profile (menu 185): one per institution, maker-checker.
export const regulatoryProfileApi = calls("/config/loan/regulatory_profile", ["get", "edit", "auth", "deauth"]);

// Loan Products (menu 184): product, terms with rate bands, fees and the
// repayment, eligibility, approval and collateral policies, one record.
export const loanProductsApi = calls("/config/loan/product", [
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

// Loan Applications (menu 186): staff apply for the borrower; offer
// acceptance, credit checks, collateral and approvals.
export const loanApplicationsApi = calls("/config/loan/application", [
  "options",
  "quote",
  "add",
  "edit",
  "accept",
  "credit_check",
  "collateral_add",
  "collateral_remove",
  "approve",
  "decline",
  "request_info",
  "withdraw",
  "get",
  "list",
]);

// Loan Facilities (menu 187): the loan, its payout, repayments, early
// settlement, restructure, write-off, recovery, reversal and collections.
export const loanFacilitiesApi = calls("/config/loan/facility", [
  "create",
  "disburse",
  "cancel",
  "get",
  "list",
  "due",
  "repay",
  "settlement_quote",
  "settle",
  "restructure",
  "restructure_auth",
  "restructure_deauth",
  "write_off",
  "write_off_auth",
  "write_off_deauth",
  "recover",
  "reverse",
  "collection_add",
  "mandate_add",
  "mandate_cancel",
]);

// Regulatory Submissions (menu 188): reports of the loan book.
export const regulatorySubmissionsApi = calls("/config/loan/regulatory_submission", ["generate", "record", "get", "list"]);
