import { request } from "@/Services/Epurse/onboarding.api";
import { downloadAttachment, downloadFile, uploadFile } from "@/Services/api/fileTransfer";

// Loans (Admin Portal: Loans handoff, module LOANS). Every call is a POST
// with a JSON body; records carry `actions` saying which buttons apply to
// this user now. Amounts and rates go as strings; rates are percent a year.
// `listPath`: the list call's path (list/options, live channel).
const calls = (base, verbs) => ({ ...Object.fromEntries(verbs.map((verb) => [verb, (body = {}) => request(`${base}/${verb}`, body)])), listPath: `${base}/list` });

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
  "guarantor_add",
  "guarantor_remove",
  "bureau_check",
  // Co-borrowers and documents (parts answers both), forwarding.
  "parts",
  "co_borrower_add",
  "co_borrower_remove",
  "document_add",
  "document_remove",
  "forward",
  "forward_options",
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
  "reassign_officer",
  "officer_history",
  // Repricing variable-rate loans.
  "reprice_mode",
  "reprice_quote",
  "reprice",
  "reprices",
  // Loans paid out in parts.
  "tranches",
  "tranche_plan",
  "tranche_proof",
  "tranche_disburse",
  // A borrower who dies: marked, then claims in order.
  "deceased",
  "deceased_claim_add",
  "deceased_claim_update",
]);

// Portfolio quality (Loan Facilities View): PAR 1/30/90, ageing buckets,
// provisions and interest in suspense by product, branch, officer or group.
export const loanPortfolioApi = { par: (body) => request("/config/loan/portfolio/par", body) };

// Regulatory Submissions (menu 188): reports of the loan book.
export const regulatorySubmissionsApi = calls("/config/loan/regulatory_submission", ["generate", "record", "get", "list"]);

// Borrower Groups (menu 194): solidarity groups with an officer, meetings
// and joint liability; members, the collection sheet and one collection
// (Loan Facilities Add) for all the group's loans at once.
export const borrowerGroupsApi = calls("/config/loan/group", ["list", "get", "add", "edit", "deactivate", "member_add", "member_role", "member_remove", "collection_sheet", "collect"]);

// Credit bureau file (Regulatory Submissions menu): a month's loan book as
// the bureau's CSV. generate { period: YYYY-MM } · list · file { id } (the
// CSV) · submit { id, submission_reference }.
export const bureauSubmissionsApi = {
  ...calls("/config/loan/bureau_submission", ["generate", "list", "submit"]),
  file: (body, fallbackName) => downloadAttachment("/config/loan/bureau_submission/file", body, fallbackName),
};

// Loan product groups and purposes (Loan Products menu): small lists saved at
// once (no checker). Each row carries `actions` { edit, delete }.
export const loanProductGroupsApi = calls("/config/loan/product_group", ["list", "add", "edit", "delete"]);
export const loanPurposesApi = calls("/config/loan/purpose", ["list", "add", "edit", "delete"]);

// Who may approve how much (Lending Regulatory Profile › Approval limits).
export const lendingAuthorityApi = calls("/config/loan/lending_authority", ["list", "save", "delete"]);

// A loan document's file: uploaded first (multipart, `id` = application or
// `facility_id`), then attached with document_add / tranche_proof / deceased.
export const uploadLoanDocument = (fields) => uploadFile("/config/loan/application/document_upload", fields);
export const downloadLoanDocument = (body) => downloadFile("/config/loan/application/document_file", body);
