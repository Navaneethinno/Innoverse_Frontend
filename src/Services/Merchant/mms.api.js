import { request } from "@/Services/Epurse/onboarding.api";

// MMS › Agents (menu 207): every merchant-side party's role (MERCHANT,
// AGENT, SUPER_AGENT) and its super agent; changes are maker-checker.
//   list:    { party_type, tier (AGENT | SUPER_AGENT | NONE), parent, search, page, limit } -> { items, total }
//   get:     { entity_type, entity_id } -> { party, agents, requests }
//   add:     { entity_type, entity_id, tier, parent?, reason } (the role as it should be afterwards)
//   auth / deauth: { id, narration } · cancel: { id } (the requester)
//   pending: { status (PENDING | ALL), entity_type?, entity_id?, page, limit } -> { items, total }
const agent = "/merchant/admin/agent";
export const agentsApi = {
  listPath: `${agent}/list`,
  list: (body) => request(`${agent}/list`, body),
  get: (body) => request(`${agent}/get`, body),
  add: (body) => request(`${agent}/add`, body),
  auth: (body) => request(`${agent}/auth`, body),
  deauth: (body) => request(`${agent}/deauth`, body),
  cancel: (body) => request(`${agent}/cancel`, body),
  pending: (body) => request(`${agent}/pending`, body),
};

// MMS › Stores (menu 208): merchants add stores in their portal, the bank
// approves them. list: { status, merchant, search, page, limit } · get: { id }
// (adds users) · approve / reject (narration required) / deactivate /
// reactivate: { id, narration }. wallets / set_wallets: a merchant's own
// store wallet setting ("" = the institution's).
const store = "/merchant/admin/store";
export const storesApi = {
  listPath: `${store}/list`,
  list: (body) => request(`${store}/list`, body),
  get: (body) => request(`${store}/get`, body),
  approve: (body) => request(`${store}/approve`, body),
  reject: (body) => request(`${store}/reject`, body),
  deactivate: (body) => request(`${store}/deactivate`, body),
  reactivate: (body) => request(`${store}/reactivate`, body),
  wallets: (body) => request(`${store}/wallets`, body),
  setWallets: (body) => request(`${store}/set_wallets`, body),
};

// MMS › Terminals (menu 209): POS terminals the bank registers and assigns
// to merchants. `auth` and `reset_secret` return terminal_secret once.
// merchants: { search, inst_profile_id (platform users), page, limit } -> the
// Active merchant-type parties a terminal can be assigned to.
const terminal = "/merchant/admin/terminal";
export const terminalsApi = {
  listPath: `${terminal}/list`,
  ...Object.fromEntries(
    ["types", "list", "get", "add", "edit", "auth", "deauth", "assign", "unassign", "deactivate", "reactivate", "retire", "merchants"].map((name) => [name, (body) => request(`${terminal}/${name}`, body ?? {})]),
  ),
  resetSecret: (body) => request(`${terminal}/reset_secret`, body),
};
