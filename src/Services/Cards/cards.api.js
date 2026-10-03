import { request } from "@/Services/Epurse/onboarding.api";

// Card setup (Card setup handoff, 3 Oct 2026), module CARDS: Card BINs (195),
// Card Products (196) and Issuance Groups (197). The three share one set of
// maker-checker routes; `listPath` is the live channel's list path.
const VERBS = ["options", "list", "pending", "get", "audit", "add", "edit", "submit", "delete", "deactivate", "reactivate", "auth", "deauth"];
const cardSetup = (base) => ({
  ...Object.fromEntries(VERBS.map((verb) => [verb, (body = {}) => request(`${base}/${verb}`, body)])),
  listPath: `${base}/list`,
});

export const cardBinsApi = cardSetup("/config/card/bin");
export const cardProductsApi = cardSetup("/config/card/product");
export const issuanceGroupsApi = cardSetup("/config/card/issuance_group");
