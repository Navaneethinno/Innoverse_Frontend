import { uuid } from "@/Utils/Lib/uuid";
import { request } from "@/Services/Epurse/onboarding.api";

// The CARDS module (Web admin: cards, 3 Oct 2026). Every api carries
// `listPath`, its live channel's list path.
const calls = (base, verbs) => ({
  ...Object.fromEntries(verbs.map((verb) => [verb, (body = {}) => request(`${base}/${verb}`, body)])),
  listPath: `${base}/list`,
});

// Setup: Card BINs (195), Card Products (196) and Issuance Groups (197) share
// one set of maker-checker routes.
const SETUP = ["options", "list", "pending", "get", "audit", "add", "edit", "submit", "delete", "deactivate", "reactivate", "auth", "deauth"];
const cardSetup = (base) => calls(base, SETUP);

export const cardBinsApi = cardSetup("/config/card/bin");
export const cardProductsApi = cardSetup("/config/card/product");
export const issuanceGroupsApi = cardSetup("/config/card/issuance_group");
// Card Number Layout (154): the same routes, plus `preview` (saves nothing).
export const cardNumberLayoutsApi = calls("/config/card/number_layout", [...SETUP, "preview"]);

// Operations: Cards (198), Card Requests (199), Card Orders (200), Card Stock (201).
export const cardsApi = calls("/config/card/instance", ["options", "list", "get", "issue", "activate", "status", "pin_clear", "reissue"]);
export const cardRequestsApi = calls("/config/card/request", ["list", "get", "add", "accept", "reject", "deliver"]);
export const cardOrdersApi = calls("/config/card/order", ["options", "holders", "list", "get", "add", "auth", "deauth", "cancel", "emboss", "receive", "receive_auth", "receive_deauth"]);
export const cardStockApi = calls("/config/card/stock", ["options", "list", "assign", "issue"]);
// PRE Files (158): one emboss file from cards across an issuance group's orders.
export const preFilesApi = calls("/config/card/prefile", ["list", "generate", "jobs"]);

// A fresh idempotency key per click (issue, request, reissue): sent again,
// the server answers what it already did and charges nothing twice.
export const idempotencyKey = uuid;
