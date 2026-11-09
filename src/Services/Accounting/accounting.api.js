import { API_ENDPOINTS } from "@/Utils/Constant";
import { calls } from "@/Services/Epurse/onboarding.api";
import { downloadAttachment, postForm } from "@/Services/api/fileTransfer";

// ACCOUNTING (module 12). Every call is a POST with a JSON body; changes are
// maker-checker (a second user authorises; Self applies at once).
// `listPath`: the list call's path (list/options, live channel).

// Chart of Accounts (menu 213): one GL tree per institution. A parent only
// groups; an account (is_account) receives postings and gets its number
// (GL000123) when first authorised. Each GL is approved on its own.
export const glAccountsApi = calls(API_ENDPOINTS.ACCOUNTING.GL_ACCOUNT, ["options", "tree", "list", "pending", "get", "audit", "add", "edit", "submit", "delete", "deactivate", "reactivate", "auth", "deauth"]);

// Upload of a chart of accounts (.xlsx / .csv): validate shows what each row
// would do; add submits the file as one batch for a checker.
export const glUploadsApi = {
  ...calls(API_ENDPOINTS.ACCOUNTING.GL_UPLOAD, ["list", "get", "auth", "deauth"]),
  template: (format = "XLSX") => downloadAttachment(API_ENDPOINTS.ACCOUNTING.GL_UPLOAD_TEMPLATE, { format }, `gl_template.${format === "CSV" ? "csv" : "xlsx"}`),
  validate: (fields) => postForm(API_ENDPOINTS.ACCOUNTING.GL_UPLOAD_VALIDATE, fields),
  add: (fields) => postForm(API_ENDPOINTS.ACCOUNTING.GL_UPLOAD_ADD, fields),
};

// GL Mapping (menu 214): which GL each posting leg goes to; one record per
// institution, approved as a whole. resolve tests a posting; unmapped lists
// postings that went to the fallback or system GL.
export const glMappingApi = calls(API_ENDPOINTS.ACCOUNTING.GL_MAPPING, ["get", "options", "add", "edit", "submit", "auth", "deauth", "pending", "audit", "unmapped", "resolve"]);

// Manual Journal (menu 215): balanced DR/CR lines between GL accounts,
// posted when a checker authorises; settlement shows the settlement GLs for a day.
export const glJournalsApi = calls(API_ENDPOINTS.ACCOUNTING.GL_JOURNAL, ["add", "get", "list", "accounts", "auth", "deauth", "cancel", "reverse", "settlement"]);

// GL Reports (menu 216): statement of one GL account, and the trial balance.
const exporter = (verb, name) => (body) => downloadAttachment(`${API_ENDPOINTS.ACCOUNTING.GL_REPORT}/${verb}`, body, `${name}.${body.format === "CSV" ? "csv" : "xlsx"}`);
export const glReportsApi = {
  ...calls(API_ENDPOINTS.ACCOUNTING.GL_REPORT, ["statement", "trial_balance", "balance_sheet", "profit_loss", "cash_flow", "movement", "customer_balance"]),
  statementExport: exporter("statement_export", "gl_statement"),
  trialBalanceExport: exporter("trial_balance_export", "trial_balance"),
  balanceSheetExport: exporter("balance_sheet_export", "balance_sheet"),
  profitLossExport: exporter("profit_loss_export", "profit_loss"),
  cashFlowExport: exporter("cash_flow_export", "cash_flow"),
  movementExport: exporter("movement_export", "gl_movement"),
  customerBalanceExport: exporter("customer_balance_export", "customer_balances"),
};

// Treasury (menu 201): bulk cash movements between a branch vault and a
// settlement counterparty's chest, or between two branches' vaults
// (requested, approved by another user, dispatched, received with a count);
// the settlement positions with each counterparty; and what each branch owes
// the others through inter-branch suspense.
export const treasuryApi = {
  movements: calls(API_ENDPOINTS.TREASURY.CASH_MOVEMENT, ["list", "get", "add", "auth", "deauth", "dispatch", "receive", "cancel"]),
  ...calls(API_ENDPOINTS.TREASURY.ROOT, ["positions", "inter_branch"]),
};

// Core Banking Setup (menu 193): branches, staff (loan officers, tellers),
// withholding tax, IFRS 9 ECL, credit bureau and the fiscal year; one
// document per institution under maker-checker. edit replaces only the
// sections sent (a list sent replaces the whole list).
// The setup's sections as their own menus (menu tree v2): each has its own
// maker-checker and history.
const SECTION = ["get", "edit", "auth", "deauth"];
export const cbsBranchesApi = calls(API_ENDPOINTS.CBS.BRANCHES, SECTION);
export const cbsBranchStaffApi = calls(API_ENDPOINTS.CBS.BRANCH_STAFF, SECTION);
export const cbsWithholdingTaxApi = calls(API_ENDPOINTS.CBS.WITHHOLDING_TAX, SECTION);
export const cbsEclApi = calls(API_ENDPOINTS.CBS.ECL, SECTION);
export const cbsCreditBureauApi = calls(API_ENDPOINTS.CBS.CREDIT_BUREAU, SECTION);
export const cbsTreasuryApi = calls(API_ENDPOINTS.CBS.TREASURY, SECTION);
export const cbsTellerApi = calls(API_ENDPOINTS.CBS.TELLER, SECTION);
export const accountingSettingsApi = calls(API_ENDPOINTS.ACCOUNTING.SETTINGS, SECTION);

export const coreBankingApi = calls(API_ENDPOINTS.ACCOUNTING.CORE_BANKING, ["get", "edit", "auth", "deauth"]);

// Accounting Periods (menu 195): close a month (the fiscal year's last also
// posts the year-end close), reopen the latest closed one (another user),
// and a closed month's GL balances.
export const accountingPeriodsApi = calls(API_ENDPOINTS.ACCOUNTING.PERIOD, ["list", "close", "reopen", "balances"]);

// Teller (menu 196): tills and vaults of a branch and currency, each with
// its own GL account. Self is working a till: open / close with a count,
// deposit, withdraw, loan repayment and transfers with the vault. Every
// money call carries the slip `reference` (never posts twice).
export const tellerApi = calls(API_ENDPOINTS.TELLER.ROOT, ["list", "get", "add", "edit", "deactivate", "reactivate", "open", "close", "deposit", "withdraw", "loan_repay", "transfer_request", "transfer_approve", "transfer_reject", "transfer_cancel", "transfers", "transfer_get", "close_approve", "close_reject", "proof", "vault_count", "vault_counts", "eod_report", "day_close", "day_reopen"]);
// A till session's proof sheet as Excel or CSV.
export const tellerProofExport = (body) => downloadAttachment(API_ENDPOINTS.TELLER.PROOF_EXPORT, body, `proof.${body.format === "CSV" ? "csv" : "xlsx"}`);

// GL Balance Alerts (menu 219): a low and/or high limit on one GL in one
// currency; maker-checker like Fee Schedules. `alerts` is the history of
// alerts raised.
const glThresholdCalls = calls(API_ENDPOINTS.ACCOUNTING.GL_THRESHOLD, ["options", "list", "pending", "get", "audit", "alerts", "add", "edit", "delete", "deactivate", "reactivate", "auth", "deauth"]);
// `pending` replies data[0].items with the total beside it, not the list standard.
const asListReply = (reply) => {
  const page = Array.isArray(reply?.data) ? reply.data[0] : null;
  if (!Array.isArray(page?.items)) return reply;
  const limit = page.page_size ?? page.limit ?? (page.items.length || 1);
  return { ...reply, data: page.items, pagination: { totalRecords: page.total ?? page.items.length, currentPage: page.page ?? 1, pageSize: limit, totalPages: Math.max(1, Math.ceil((page.total ?? page.items.length) / limit)) } };
};
export const glThresholdsApi = { ...glThresholdCalls, pending: (body) => glThresholdCalls.pending(body).then(asListReply) };
export const glThresholdAlertsPath = `${API_ENDPOINTS.ACCOUNTING.GL_THRESHOLD}/alerts`;
export const glThresholdPendingPath = `${API_ENDPOINTS.ACCOUNTING.GL_THRESHOLD}/pending`;
