import { API_ENDPOINTS } from "@/Utils/Constant";
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

export const cardBinsApi = cardSetup(API_ENDPOINTS.CARD_API.BIN);
export const cardProductsApi = cardSetup(API_ENDPOINTS.CARD_API.PRODUCT);
export const issuanceGroupsApi = cardSetup(API_ENDPOINTS.CARD_API.ISSUANCE_GROUP);
// Card Number Layout (154): the same routes, plus `preview` (saves nothing).
export const cardNumberLayoutsApi = calls(API_ENDPOINTS.CARD_API.NUMBER_LAYOUT, [...SETUP, "preview"]);

// Operations: Cards (198), Card Requests (199), Card Orders (200), Card Stock (201).
export const cardsApi = calls(API_ENDPOINTS.CARD_API.INSTANCE, ["options", "list", "get", "issue", "activate", "status", "pin_clear", "reissue"]);
export const cardRequestsApi = calls(API_ENDPOINTS.CARD_API.REQUEST, ["list", "get", "add", "accept", "reject", "deliver"]);
export const cardOrdersApi = calls(API_ENDPOINTS.CARD_API.ORDER, ["options", "holders", "holder_wallets", "list", "get", "add", "auth", "deauth", "cancel", "emboss", "receive", "receive_auth", "receive_deauth"]);
export const cardStockApi = calls(API_ENDPOINTS.CARD_API.STOCK, ["options", "list", "assign", "issue"]);
// PRE Files (158): one emboss file from cards across an issuance group's orders.
export const preFilesApi = calls(API_ENDPOINTS.CARD_API.PREFILE, ["list", "generate", "jobs"]);

// A fresh idempotency key per click (issue, request, reissue): sent again,
// the server answers what it already did and charges nothing twice.
export const idempotencyKey = uuid;
