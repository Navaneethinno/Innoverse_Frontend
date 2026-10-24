import { request } from "@/Services/Epurse/onboarding.api";
import { downloadAttachment } from "@/Services/api/fileTransfer";

// Transactions, Fee Schedules and the transaction reports (Admin Portal:
// Transactions, Fee Schedules, Limits, Reports and Alerts handoff). Every
// call is a POST with a JSON body; amounts go as strings.
// `listPath`: the list call's path (list/options, live channel).
const calls = (base, verbs) => ({ ...Object.fromEntries(verbs.map((verb) => [verb, (body = {}) => request(`${base}/${verb}`, body)])), listPath: `${base}/list` });
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

// GLOBAL SETTINGS > Transaction Routing (menu 192): one setup per institution
// (interfaces, issuers and BIN ranges, ranked route groups, rules),
// maker-checker like External Providers. health / health_set: each
// interface's state and the operator's override (no checker); simulate:
// where a transaction would go on the live routing; decisions: the log;
// validate: the warnings an unsaved setup would be refused for (saves nothing).
export const routingApi = { ...calls("/config/global/routing", ["options", "list", "pending", "get", "audit", "add", "edit", "submit", "auth", "deauth", "deactivate", "reactivate", "delete", "health", "health_set", "simulate", "decisions", "validate"]), decisionsPath: "/config/global/routing/decisions" };
