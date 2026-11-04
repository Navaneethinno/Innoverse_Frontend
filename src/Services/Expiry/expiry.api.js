import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

// Expiry management: the dates that run out (customers' and merchants'
// documents, module subscriptions, the institution's licence, staff
// passwords). A nightly job warns before each date, reminds closer to it and,
// for documents, applies the institution's action after a grace period.

// GLOBAL SETTINGS > Expiry Rules (menu 197): one settings document per
// institution under maker-checker; Self applies a change at once.
export const expiryRulesApi = {
  get: (body = {}) => request(API_ENDPOINTS.GLOBAL_API.EXPIRY_RULE_GET, body),
  edit: (body) => request(API_ENDPOINTS.GLOBAL_API.EXPIRY_RULE_EDIT, body),
  auth: (body = {}) => request(API_ENDPOINTS.GLOBAL_API.EXPIRY_RULE_AUTH, body),
  deauth: (body = {}) => request(API_ENDPOINTS.GLOBAL_API.EXPIRY_RULE_DEAUTH, body),
};

// REPORTS > Expiring Documents (menu 198): the standard list (tabs EXPIRING,
// IN_GRACE, EXPIRED, VALID; filters kind, party, within_days,
// document_type_id; one customer's with subject_id).
export const expiringDocumentsApi = {
  listPath: API_ENDPOINTS.REPORT_API.EXPIRING_DOCUMENT_LIST,
  list: (body = {}) => request(API_ENDPOINTS.REPORT_API.EXPIRING_DOCUMENT_LIST, body),
};

// The signed-in user's own notices (modules, licence, password) and the
// institution's document counts; any signed-in user, no menu needed.
export const expiryNoticesApi = () => request(API_ENDPOINTS.EXPIRY_API.NOTICES, {});
