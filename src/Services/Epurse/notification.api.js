import { API_ENDPOINTS } from "@/Utils/Constant";
import { createLifecycle, request } from "@/Services/Epurse/onboarding.api";

// EPURSE > Notification Center. A group is a named list of recipients; an
// alert says what to send (email/SMS), to which groups, on which menu
// actions. Both use the standard maker-checker verbs; `edit` sends the whole
// record (both lists), never just the changed fields.
export const notificationGroupApi = createLifecycle(API_ENDPOINTS.NOTIFICATION.GROUP);

const alertLifecycle = createLifecycle(API_ENDPOINTS.NOTIFICATION.ALERT);
export const notificationAlertApi = {
  ...alertLifecycle,
  // Form options: trigger menus/actions the user may pick, placeholders and
  // the institution's active groups. inst_profile_id defaults server-side
  // to the user's institution.
  options: (payload = {}) => alertLifecycle.call("options", payload),
};

// Read-only outbox of the messages alerts produced (one row per recipient and
// channel). Filters: delivery_status (PENDING/SENT/FAILED), channel
// (EMAIL/SMS), noti_alert_id; sort_by by creation time. Needs View on
// Notification Alerts.
export const notificationOutboxApi = {
  listPath: API_ENDPOINTS.NOTIFICATION.OUTBOX_LIST,
  list: (payload = {}) => request(API_ENDPOINTS.NOTIFICATION.OUTBOX_LIST, payload),
};
