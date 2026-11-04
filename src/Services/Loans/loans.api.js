import { API_ENDPOINTS } from "@/Utils/Constant";
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
export const loanReferenceRatesApi = calls(API_ENDPOINTS.LOAN_API.REFERENCE_RATE, ["list", "add", "auth", "deauth"]);

// Lending Regulatory Profile (menu 185): one per institution, maker-checker.
export const regulatoryProfileApi = calls(API_ENDPOINTS.LOAN_API.REGULATORY_PROFILE, ["get", "edit", "auth", "deauth"]);

// Loan Products (menu 184): product, terms with rate bands, fees and the
// repayment, eligibility, approval and collateral policies, one record.
export const loanProductsApi = calls(API_ENDPOINTS.LOAN_API.PRODUCT, [
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
export const loanApplicationsApi = calls(API_ENDPOINTS.LOAN_API.APPLICATION, [
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
export const loanFacilitiesApi = calls(API_ENDPOINTS.LOAN_API.FACILITY, [
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
export const loanPortfolioApi = { par: (body) => request(API_ENDPOINTS.LOAN_API.PORTFOLIO_PAR, body) };

// Regulatory Submissions (menu 188): reports of the loan book.
export const regulatorySubmissionsApi = calls(API_ENDPOINTS.LOAN_API.REGULATORY_SUBMISSION, ["generate", "record", "get", "list"]);

// Borrower Groups (menu 194): solidarity groups with an officer, meetings
// and joint liability; members, the collection sheet and one collection
// (Loan Facilities Add) for all the group's loans at once.
export const borrowerGroupsApi = calls(API_ENDPOINTS.LOAN_API.GROUP, ["list", "get", "add", "edit", "deactivate", "member_add", "member_role", "member_remove", "collection_sheet", "collect"]);

// Credit bureau file (Regulatory Submissions menu): a month's loan book as
// the bureau's CSV. generate { period: YYYY-MM } · list · file { id } (the
// CSV) · submit { id, submission_reference }.
export const bureauSubmissionsApi = {
  ...calls(API_ENDPOINTS.LOAN_API.BUREAU_SUBMISSION, ["generate", "list", "submit"]),
  file: (body, fallbackName) => downloadAttachment(API_ENDPOINTS.LOAN_API.BUREAU_SUBMISSION_FILE, body, fallbackName),
};

// Loan product groups and purposes (Loan Products menu): small lists saved at
// once (no checker). Each row carries `actions` { edit, delete }.
export const loanProductGroupsApi = calls(API_ENDPOINTS.LOAN_API.PRODUCT_GROUP, ["list", "add", "edit", "delete"]);
export const loanPurposesApi = calls(API_ENDPOINTS.LOAN_API.PURPOSE, ["list", "add", "edit", "delete"]);

// Who may approve how much (Lending Regulatory Profile › Approval limits).
export const lendingAuthorityApi = calls(API_ENDPOINTS.LOAN_API.LENDING_AUTHORITY, ["list", "save", "delete"]);

// A loan document's file: uploaded first (multipart, `id` = application or
// `facility_id`), then attached with document_add / tranche_proof / deceased.
export const uploadLoanDocument = (fields) => uploadFile(API_ENDPOINTS.LOAN_API.APPLICATION_DOCUMENT_UPLOAD, fields);
export const downloadLoanDocument = (body) => downloadFile(API_ENDPOINTS.LOAN_API.APPLICATION_DOCUMENT_FILE, body);
