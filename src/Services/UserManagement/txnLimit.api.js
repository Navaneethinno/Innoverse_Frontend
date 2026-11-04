import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

// User Management > Users > Transaction limits: the largest amount a user
// may make and authorise in one transaction, per currency (maker-checker
// per user and currency; edit / auth / deauth take currency_id).
const BASE = API_ENDPOINTS.USER_API.TXN_LIMIT;
const call = (verb) => (body = {}) => request(`${BASE}/${verb}`, body);

export const txnLimitApi = {
  list: call("list"),
  get: call("get"),
  audit: call("audit"),
  edit: call("edit"),
  auth: call("auth"),
  deauth: call("deauth"),
  // The caller's own limits in force; any signed-in user.
  mine: call("mine"),
  listPath: `${BASE}/list`,
};
