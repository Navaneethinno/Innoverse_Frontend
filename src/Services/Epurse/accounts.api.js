import { request } from "@/Services/Epurse/onboarding.api";

// EPURSE > Accounts (menu 178, view only). An account opens by itself when
// a customer or merchant is approved; the admin portal only reads them.
//   list: { page, limit (max 100), acct_num, owner_name, reference_id,
//           party, ownership, acct_product_id, digital_product_id,
//           inst_profile_id, status } -> data[0] = { total, page, limit, accounts }
//   get:  { id } or { acct_num } -> data[0] = the account, with its owner
//   ledger: { id or acct_num, from?, to?, txn_type?, page?, limit? } -> the
//           statement { account, total, page, lines }, newest first
//   txn:  { txn_id or rrn } -> one transaction with all its lines
// acct_class: CUSTOMER is a wallet, DEPOSIT a term deposit's own account.
export const accountsApi = {
  list: (body) => request("/config/account/list", body),
  get: (body) => request("/config/account/get", body),
  ledger: (body) => request("/config/account/ledger", body),
  txn: (body) => request("/config/account/txn", body),
  // Money sent to phone numbers with no account: { status, phone_number, sender_name, inst_profile_id, search, page, limit }
  phoneTransfers: (body) => request("/config/account/phone_transfer/list", body),
};

// Account actions (maker-checker): FREEZE, UNFREEZE, BLOCK, UNBLOCK, CLOSE,
// REACTIVATE, ACTIVATE, ADD_PARTY, REMOVE_PARTY. One open request per
// account; Self skips the checker (unless the product says closing needs
// a second person).
//   add: { acct_id, action, reason, party? } · auth / deauth: { id, narration }
//   cancel: { id } (the requester, while pending) · list: { acct_id, status, page, limit }
export const accountActionsApi = {
  listPath: "/config/account/action/list",
  add: (body) => request("/config/account/action/add", body),
  auth: (body) => request("/config/account/action/auth", body),
  deauth: (body) => request("/config/account/action/deauth", body),
  cancel: (body) => request("/config/account/action/cancel", body),
  get: (body) => request("/config/account/action/get", body),
  list: (body) => request("/config/account/action/list", body),
};

// The account's other parties (joint holders, guardian, group members,
// nominees) and its statements.
export const accountPartiesApi = { list: (body) => request("/config/account/party/list", body) };
export const accountStatementsApi = {
  list: (body) => request("/config/account/statement/list", body),
  get: (body) => request("/config/account/statement/get", body),
};
