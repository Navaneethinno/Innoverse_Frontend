import { request } from "@/Services/Epurse/onboarding.api";

// User Management > Users > Transaction limits: the largest amount a user
// may make and authorise in one transaction (maker-checker per user).
const BASE = "/config/user/txn_limit";
const call = (verb) => (body = {}) => request(`${BASE}/${verb}`, body);

export const txnLimitApi = {
  list: call("list"),
  get: call("get"),
  audit: call("audit"),
  edit: call("edit"),
  auth: call("auth"),
  deauth: call("deauth"),
};
