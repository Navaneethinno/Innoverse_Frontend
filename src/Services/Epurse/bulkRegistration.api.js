import { request } from "@/Services/Epurse/onboarding.api";

// EPURSE > Bulk Registration (menu 71): a maker uploads people, a checker
// authorises the batch and each is onboarded as a customer.
const BASE = "/customer/admin/bulk_registration";
const call = (verb, options) => (body = {}) => request(`${BASE}/${verb}`, body, options);

export const bulkRegistrationApi = {
  listPath: `${BASE}/list`,
  options: call("options"),
  template: call("template"),
  list: call("list"),
  get: call("get"),
  check: call("check"),
  add: call("add"),
  // Authorising registers every row before it answers: 1,000 rows can take
  // a few minutes.
  auth: call("auth", { timeoutMs: 15 * 60 * 1000 }),
  deauth: call("deauth"),
  result_file: call("result_file"),
};
