import { request } from "@/Services/Epurse/onboarding.api";

// Expiry management: the dates that run out (customers' and merchants'
// documents, module subscriptions, the institution's licence, staff
// passwords). A nightly job warns before each date, reminds closer to it and,
// for documents, applies the institution's action after a grace period.

// GLOBAL SETTINGS > Expiry Rules (menu 197): one settings document per
// institution under maker-checker; Self applies a change at once.
export const expiryRulesApi = {
  get: (body = {}) => request("/config/global/expiry_rule/get", body),
  edit: (body) => request("/config/global/expiry_rule/edit", body),
  auth: (body = {}) => request("/config/global/expiry_rule/auth", body),
  deauth: (body = {}) => request("/config/global/expiry_rule/deauth", body),
};

// REPORTS > Expiring Documents (menu 198): the standard list (tabs EXPIRING,
// IN_GRACE, EXPIRED, VALID; filters kind, party, within_days,
// document_type_id; one customer's with subject_id).
export const expiringDocumentsApi = {
  listPath: "/config/report/expiring_document/list",
  list: (body = {}) => request("/config/report/expiring_document/list", body),
};

// The signed-in user's own notices (modules, licence, password) and the
// institution's document counts; any signed-in user, no menu needed.
export const expiryNoticesApi = () => request("/config/expiry/notices", {});
