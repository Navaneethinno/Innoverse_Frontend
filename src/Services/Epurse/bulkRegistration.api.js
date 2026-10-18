import { request } from "@/Services/Epurse/onboarding.api";

// EPURSE > Bulk Registration (menu 71): a maker uploads people, a checker
// authorises the batch and each is onboarded as a customer.
const BASE = "/customer/admin/bulk_registration";
const call = (verb) => (body = {}) => request(`${BASE}/${verb}`, body);

export const bulkRegistrationApi = {
  listPath: `${BASE}/list`,
  options: call("options"),
  // Type-ahead over corporate customers: name, reference, phone or email.
  employers: call("employers"),
  template: call("template"),
  list: call("list"),
  get: call("get"),
  check: call("check"),
  add: call("add"),
  // Answers at once with the batch PROCESSING; the rows run in the
  // background (processed_count), then the live channel says `done`.
  auth: call("auth"),
  deauth: call("deauth"),
  result_file: call("result_file"),
};
