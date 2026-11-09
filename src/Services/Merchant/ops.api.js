import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

const calls = (root, names) => Object.fromEntries(names.map((name) => [name, (body) => request(`${root}/${name}`, body ?? {})]));
// A maker-checker settings document: get / edit / auth / deauth (as App Versions).
const docApi = (root, extra = []) => calls(root, ["get", "edit", "auth", "deauth", ...extra]);

const E = API_ENDPOINTS.OPS;
const M = API_ENDPOINTS.MERCHANT_ADMIN;

// MMS > Terminal Batches (230): list { tid|search, tab OPEN|CLOSED, date range } · get { id } · close { terminal_id } (Edit).
export const terminalBatchApi = { listPath: `${M.TERMINAL_BATCH}/list`, ...calls(M.TERMINAL_BATCH, ["list", "get", "close"]) };
// MMS > Terminal Monitor (231): list (summary tiles + rows) · health { terminal_id, page, limit }.
export const terminalMonitorApi = { listPath: `${M.TERMINAL_MONITOR}/list`, ...calls(M.TERMINAL_MONITOR, ["list", "health"]) };
// InnoEFT > SAF Queue (232).
export const safApi = { listPath: `${E.SAF}/list`, ...calls(E.SAF, ["list", "get", "replay", "auth", "deauth"]) };
// InnoMMS documents.
export const floatLimitApi = { listPath: `${E.FLOAT_LIMIT}/list`, ...docApi(E.FLOAT_LIMIT, ["list"]) };
export const posTemplateApi = docApi(E.POS_TEMPLATE, ["txn_types"]);
export const catalogueApi = { listPath: `${E.CATALOGUE}/list`, ...docApi(E.CATALOGUE, ["list"]) };
// ePurse > Customer Blocks (242).
export const partyBlockReasonApi = docApi(E.PARTY_BLOCK_REASON);
export const partyBlockApi = { listPath: `${E.PARTY_BLOCK}/list`, dormantPath: `${E.PARTY_BLOCK}/dormant_list`, ...calls(E.PARTY_BLOCK, ["list", "parties", "place", "lift", "auth", "deauth", "dormant_list"]) };
// Case Management > Dispute Settings (243); InnoCMS card pickup locations (155).
export const disputeSettingApi = docApi(E.DISPUTE_SETTING);
export const pickupLocationApi = docApi(E.PICKUP_LOCATION);
