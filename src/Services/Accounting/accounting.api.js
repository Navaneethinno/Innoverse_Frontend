import { request } from "@/Services/Epurse/onboarding.api";
import { downloadAttachment, postForm } from "@/Services/api/fileTransfer";

// ACCOUNTING (module 12). Every call is a POST with a JSON body; changes are
// maker-checker (a second user authorises; Self applies at once).
// `listPath`: the list call's path (list/options, live channel).
const calls = (base, verbs) => ({ ...Object.fromEntries(verbs.map((verb) => [verb, (body = {}) => request(`${base}/${verb}`, body)])), listPath: `${base}/list` });

// Chart of Accounts (menu 213): one GL tree per institution. A parent only
// groups; an account (is_account) receives postings and gets its number
// (GL000123) when first authorised. Each GL is approved on its own.
export const glAccountsApi = calls("/config/accounting/gl_account", ["options", "tree", "list", "pending", "get", "audit", "add", "edit", "submit", "delete", "deactivate", "reactivate", "auth", "deauth"]);

// Upload of a chart of accounts (.xlsx / .csv): validate shows what each row
// would do; add submits the file as one batch for a checker.
export const glUploadsApi = {
  ...calls("/config/accounting/gl_upload", ["list", "get", "auth", "deauth"]),
  template: (format = "XLSX") => downloadAttachment("/config/accounting/gl_upload/template", { format }, `gl_template.${format === "CSV" ? "csv" : "xlsx"}`),
  validate: (fields) => postForm("/config/accounting/gl_upload/validate", fields),
  add: (fields) => postForm("/config/accounting/gl_upload/add", fields),
};

// GL Mapping (menu 214): which GL each posting leg goes to; one record per
// institution, approved as a whole. resolve tests a posting; unmapped lists
// postings that went to the fallback or system GL.
export const glMappingApi = calls("/config/accounting/gl_mapping", ["get", "options", "add", "edit", "submit", "auth", "deauth", "pending", "audit", "unmapped", "resolve"]);

// Manual Journal (menu 215): balanced DR/CR lines between GL accounts,
// posted when a checker authorises; settlement shows the settlement GLs for a day.
export const glJournalsApi = calls("/config/accounting/gl_journal", ["add", "get", "list", "accounts", "auth", "deauth", "cancel", "reverse", "settlement"]);

// GL Reports (menu 216): statement of one GL account, and the trial balance.
const exporter = (verb, name) => (body) => downloadAttachment(`/config/accounting/gl_report/${verb}`, body, `${name}.${body.format === "CSV" ? "csv" : "xlsx"}`);
export const glReportsApi = {
  ...calls("/config/accounting/gl_report", ["statement", "trial_balance"]),
  statementExport: exporter("statement_export", "gl_statement"),
  trialBalanceExport: exporter("trial_balance_export", "trial_balance"),
};

// Core Banking Setup (menu 193): branches, staff (loan officers, tellers),
// withholding tax, IFRS 9 ECL, credit bureau and the fiscal year; one
// document per institution under maker-checker. edit replaces only the
// sections sent (a list sent replaces the whole list).
export const coreBankingApi = calls("/config/accounting/core_banking", ["get", "edit", "auth", "deauth"]);

// Accounting Periods (menu 195): close a month (the fiscal year's last also
// posts the year-end close), reopen the latest closed one (another user),
// and a closed month's GL balances.
export const accountingPeriodsApi = calls("/config/accounting/period", ["list", "close", "reopen", "balances"]);

// Teller (menu 196): tills and vaults of a branch and currency, each with
// its own GL account. Self is working a till: open / close with a count,
// deposit, withdraw, loan repayment and transfers with the vault. Every
// money call carries the slip `reference` (never posts twice).
export const tellerApi = calls("/config/teller", ["list", "get", "add", "edit", "deactivate", "reactivate", "open", "close", "deposit", "withdraw", "loan_repay", "transfer_request", "transfer_approve", "transfer_reject", "transfer_cancel", "transfers", "transfer_get"]);
