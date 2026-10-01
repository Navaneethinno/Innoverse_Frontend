import { request } from "@/Services/Epurse/onboarding.api";

// EPURSE > Accounts (menu 178, view only). An account opens by itself when
// a customer or merchant is approved; the admin portal only reads them.
//   list: { page, limit (max 100), acct_num, owner_name, reference_id,
//           party, ownership, acct_product_id, digital_product_id,
//           inst_profile_id, status } -> data[0] = { total, page, limit, accounts }
//   get:  { id } or { acct_num } -> data[0] = the account, with its owner
export const accountsApi = {
  list: (body) => request("/config/account/list", body),
  get: (body) => request("/config/account/get", body),
};
