import { API_ENDPOINTS } from "@/Utils/Constant";
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
  listPath: API_ENDPOINTS.ACCOUNT_API.LIST,
  list: (body) => request(API_ENDPOINTS.ACCOUNT_API.LIST, body),
  get: (body) => request(API_ENDPOINTS.ACCOUNT_API.GET, body),
  ledger: (body) => request(API_ENDPOINTS.ACCOUNT_API.LEDGER, body),
  txn: (body) => request(API_ENDPOINTS.ACCOUNT_API.TXN, body),
  // Money sent to phone numbers with no account: { status, phone_number, sender_name, inst_profile_id, search, page, limit }
  phoneTransfers: (body) => request(API_ENDPOINTS.ACCOUNT_API.PHONE_TRANSFER_LIST, body),
};

// Opening a further account (maker-checker; Self opens at once).
//   options: { entity_type, entity_id } -> { owner, products (each with
//            `held`), accounts } · add: { entity_type, entity_id,
//            acct_product_id, reason } · auth / deauth: { id, narration? }
//   cancel / get: { id } · list: { entity_type?, entity_id?, status?, page, limit }
export const accountOpeningApi = {
  listPath: API_ENDPOINTS.ACCOUNT_API.OPEN_LIST,
  options: (body) => request(API_ENDPOINTS.ACCOUNT_API.OPEN_OPTIONS, body),
  add: (body) => request(API_ENDPOINTS.ACCOUNT_API.OPEN_ADD, body),
  auth: (body) => request(API_ENDPOINTS.ACCOUNT_API.OPEN_AUTH, body),
  deauth: (body) => request(API_ENDPOINTS.ACCOUNT_API.OPEN_DEAUTH, body),
  cancel: (body) => request(API_ENDPOINTS.ACCOUNT_API.OPEN_CANCEL, body),
  get: (body) => request(API_ENDPOINTS.ACCOUNT_API.OPEN_GET, body),
  list: (body) => request(API_ENDPOINTS.ACCOUNT_API.OPEN_LIST, body),
};

// Account actions (maker-checker): FREEZE, UNFREEZE, BLOCK, UNBLOCK, CLOSE,
// REACTIVATE, ACTIVATE, ADD_PARTY, REMOVE_PARTY. One open request per
// account; Self skips the checker (unless the product says closing needs
// a second person).
//   add: { acct_id, action, reason, party? } · auth / deauth: { id, narration }
//   cancel: { id } (the requester, while pending) · list: { acct_id, status, page, limit }
export const accountActionsApi = {
  listPath: API_ENDPOINTS.ACCOUNT_API.ACTION_LIST,
  add: (body) => request(API_ENDPOINTS.ACCOUNT_API.ACTION_ADD, body),
  auth: (body) => request(API_ENDPOINTS.ACCOUNT_API.ACTION_AUTH, body),
  deauth: (body) => request(API_ENDPOINTS.ACCOUNT_API.ACTION_DEAUTH, body),
  cancel: (body) => request(API_ENDPOINTS.ACCOUNT_API.ACTION_CANCEL, body),
  get: (body) => request(API_ENDPOINTS.ACCOUNT_API.ACTION_GET, body),
  list: (body) => request(API_ENDPOINTS.ACCOUNT_API.ACTION_LIST, body),
};

// The account's other parties (joint holders, guardian, group members,
// nominees) and its statements.
export const accountPartiesApi = { list: (body) => request(API_ENDPOINTS.ACCOUNT_API.PARTY_LIST, body) };
export const accountStatementsApi = {
  list: (body) => request(API_ENDPOINTS.ACCOUNT_API.STATEMENT_LIST, body),
  get: (body) => request(API_ENDPOINTS.ACCOUNT_API.STATEMENT_GET, body),
};

// Liens (Accounts menu): money held that no debit may touch. list { acct_id | acct_num }
// (active first) · add { acct_id, amount, reason COURT_ORDER | OTHER, narration } · release { id, narration }.
export const accountLiensApi = {
  list: (body) => request(API_ENDPOINTS.ACCOUNT_API.LIEN_LIST, body),
  add: (body) => request(API_ENDPOINTS.ACCOUNT_API.LIEN_ADD, body),
  release: (body) => request(API_ENDPOINTS.ACCOUNT_API.LIEN_RELEASE, body),
};

// Accounts > Institution wallets: the head office's and each branch's own wallet.
export const institutionWalletsApi = {
  list: (body) => request(API_ENDPOINTS.ACCOUNT_API.INSTITUTION_WALLET_LIST, body),
  add: (body) => request(API_ENDPOINTS.ACCOUNT_API.INSTITUTION_WALLET_ADD, body),
  products: () => request(API_ENDPOINTS.CONFIG_ACCT.ACCT_PRODUCT.GET_ACTIVE, { view: "dropdown" }),
};
export const activeAccountProducts = (body) => request(API_ENDPOINTS.CONFIG_ACCT.ACCT_PRODUCT.GET_ACTIVE, body);
