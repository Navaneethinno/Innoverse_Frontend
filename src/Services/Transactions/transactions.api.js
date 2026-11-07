import { API_ENDPOINTS } from "@/Utils/Constant";
import { calls } from "@/Services/Epurse/onboarding.api";
import { downloadAttachment } from "@/Services/api/fileTransfer";

// Transactions, Fee Schedules and the transaction reports (Admin Portal:
// Transactions, Fee Schedules, Limits, Reports and Alerts handoff). Every
// call is a POST with a JSON body; amounts go as strings.
// `listPath`: the list call's path (list/options, live channel).
const exporter = (path, name) => (body) => downloadAttachment(path, body, `${name}.${body.format === "CSV" ? "csv" : "xlsx"}`);

// EPURSE > Transactions (menu 189): the journal, a party's history, the
// frozen receipt and the export.
export const transactionsApi = {
  ...calls(API_ENDPOINTS.TRANSACTION.ROOT, ["list", "get", "history", "receipt", "options", "quote"]),
  export: exporter(API_ENDPOINTS.TRANSACTION.EXPORT, "transactions"),
};

// Staff transactions are requests: one user adds, another approves (Self
// posts at once). auth posts the money; a refused posting makes it FAILED.
export const transactionRequestsApi = calls(API_ENDPOINTS.TRANSACTION.REQUEST, ["add", "auth", "deauth", "cancel", "list", "get"]);

// GLOBAL SETTINGS > Fee Schedules (menu 190): one schedule per institution
// and currency, maker-checker as a whole.
export const feeSchedulesApi = calls(API_ENDPOINTS.GLOBAL.FEE_SCHEDULE, ["options", "list", "pending", "get", "audit", "add", "edit", "submit", "delete", "deactivate", "reactivate", "auth", "deauth", "quote"]);

// GLOBAL SETTINGS > External Providers (menu 210): one setup per
// institution (its mobile-wallet providers, their prefixes, and groups),
// maker-checker as a whole like a fee schedule. `providers` lists the live
// ones with ids, for fee rules and limit conditions.
export const extProvidersApi = calls(API_ENDPOINTS.GLOBAL.EXT_PROVIDER, ["options", "list", "pending", "get", "audit", "add", "edit", "submit", "auth", "deauth", "deactivate", "reactivate", "delete", "providers"]);

// GLOBAL SETTINGS > Transaction Routing (menu 192): one setup per institution
// (interfaces, issuers and BIN ranges, ranked route groups, rules),
// maker-checker like External Providers. health / health_set: each
// interface's state and the operator's override (no checker); simulate:
// where a transaction would go on the live routing; decisions: the log;
// validate: the warnings an unsaved setup would be refused for (saves nothing).
export const routingApi = { ...calls(API_ENDPOINTS.GLOBAL.ROUTING, ["options", "list", "pending", "get", "audit", "add", "edit", "submit", "auth", "deauth", "deactivate", "reactivate", "delete", "health", "health_set", "simulate", "decisions", "validate"]), decisionsPath: API_ENDPOINTS.GLOBAL.ROUTING_DECISIONS };

// Finance > Bulk Payouts (menu 222): a payout file checked, filed, then paid
// in the background once a checker authorises it.
export const bulkPayoutsApi = calls(API_ENDPOINTS.TRANSACTION.BULK_PAYOUT, ["template", "check", "add", "list", "get", "auth", "deauth", "cancel", "retry", "result_file"]);
// MMS > Merchant Bulk Payouts (menu 223): the merchants own batches, read only.
export const merchantBulkPayoutsApi = calls(API_ENDPOINTS.MERCHANT_ADMIN.BULK_PAYOUT, ["list", "get", "result_file"]);
