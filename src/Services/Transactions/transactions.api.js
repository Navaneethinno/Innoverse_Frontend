import { request } from "@/Services/Epurse/onboarding.api";
import { downloadAttachment } from "@/Services/api/fileTransfer";

// Transactions, Fee Schedules and the transaction reports (Admin Portal:
// Transactions, Fee Schedules, Limits, Reports and Alerts handoff). Every
// call is a POST with a JSON body; amounts go as strings.
const calls = (base, verbs) => Object.fromEntries(verbs.map((verb) => [verb, (body = {}) => request(`${base}/${verb}`, body)]));
const exporter = (path, name) => (body) => downloadAttachment(path, body, `${name}.${body.format === "CSV" ? "csv" : "xlsx"}`);

// EPURSE > Transactions (menu 189): the journal, a party's history, the
// frozen receipt and the export.
export const transactionsApi = {
  ...calls("/config/transaction", ["list", "get", "history", "receipt", "options", "quote"]),
  export: exporter("/config/transaction/export", "transactions"),
};

// Staff transactions are requests: one user adds, another approves (Self
// posts at once). auth posts the money; a refused posting makes it FAILED.
export const transactionRequestsApi = calls("/config/transaction/request", ["add", "auth", "deauth", "cancel", "list", "get"]);

// GLOBAL SETTINGS > Fee Schedules (menu 190): one schedule per institution
// and currency, maker-checker as a whole.
export const feeSchedulesApi = calls("/config/global/fee_schedule", ["options", "list", "pending", "get", "audit", "add", "edit", "submit", "delete", "deactivate", "reactivate", "auth", "deauth", "quote"]);

// REPORTS > Transaction Summary, Fee Income, Failed Transactions, Reversals
// (menus 191-194). Each takes the usual period (or from / to) and filters.
const report = (name, verbs = ["list"]) => ({ ...calls(`/config/report/${name}`, verbs), export: exporter(`/config/report/${name}/export`, name) });
export const txnReportsApi = {
  summary: report("txn_summary"),
  feeIncome: report("fee_income"),
  failed: report("failed_txn", ["list", "summary"]),
  reversals: report("reversals"),
  // REPORTS > Card Summary (menu 202).
  cardSummary: report("card_summary"),
};
