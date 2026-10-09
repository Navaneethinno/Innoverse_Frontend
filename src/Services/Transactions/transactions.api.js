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

// GLOBAL SETTINGS > External Providers (menu 210): one setup per
// institution (its mobile-wallet providers, their prefixes, and groups),
// maker-checker as a whole like a fee schedule. `providers` lists the live
// ones with ids, for fee rules and limit conditions.
export const extProvidersApi = calls("/config/global/ext_provider", ["options", "list", "pending", "get", "audit", "add", "edit", "submit", "auth", "deauth", "deactivate", "reactivate", "delete", "providers"]);
