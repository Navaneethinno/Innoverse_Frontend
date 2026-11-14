import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

// Expiry management: the dates that run out (customers' and merchants'
// documents, module subscriptions, the institution's licence, staff
// passwords). A nightly job warns before each date, reminds closer to it and,
// for documents, applies the institution's action after a grace period.

// GLOBAL SETTINGS > Expiry Rules (menu 197): one settings document per
// institution under maker-checker; Self applies a change at once.
export const expiryRulesApi = {
  get: (body = {}) => request(API_ENDPOINTS.GLOBAL.EXPIRY_RULE_GET, body),
  edit: (body) => request(API_ENDPOINTS.GLOBAL.EXPIRY_RULE_EDIT, body),
  auth: (body = {}) => request(API_ENDPOINTS.GLOBAL.EXPIRY_RULE_AUTH, body),
  deauth: (body = {}) => request(API_ENDPOINTS.GLOBAL.EXPIRY_RULE_DEAUTH, body),
};

// REPORTS > Expiring Documents (menu 198): the standard list (tabs EXPIRING,
// IN_GRACE, EXPIRED, VALID; filters kind, party, within_days,
// document_type_id; one customer's with subject_id).
export const expiringDocumentsApi = {
  listPath: API_ENDPOINTS.REPORT.EXPIRING_DOCUMENT_LIST,
  list: (body = {}) => request(API_ENDPOINTS.REPORT.EXPIRING_DOCUMENT_LIST, body),
};

// The signed-in user's own notices (modules, licence, password) and the
// institution's document counts; any signed-in user, no menu needed.
export const expiryNoticesApi = () => request(API_ENDPOINTS.EXPIRY_NOTICES, {});

// A module subscription or licence save changes the expiry register at
// once: the banner reads /expiry/notices again on this event.
export const EXPIRY_RELOAD = "expiry:reload";
export const reloadExpiryNotices = () => window.dispatchEvent(new Event(EXPIRY_RELOAD));
// Wraps an API's write calls so each success reloads the banner.
const WRITES = ["add", "submit", "auth", "deauth", "edit", "delete", "deleteAuth", "deactivate", "reactivate"];
export const reloadingExpiry = (api) =>
  Object.fromEntries(
    Object.entries(api).map(([name, call]) => [
      name,
      WRITES.includes(name)
        ? async (...args) => {
            const result = await call(...args);
            reloadExpiryNotices();
            return result;
          }
        : call,
    ]),
  );
