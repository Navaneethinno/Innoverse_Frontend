import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

// The signed-in user's own inbox: Notification Center alerts that reached
// them and expiry notices. No menu permission; each user sees only theirs.
const call = (verb) => (body = {}) => request(`${API_ENDPOINTS.USER_API.NOTIFICATION}/${verb}`, body);

// Fired when a screen other than the bell marks messages read.
export const INBOX_CHANGED = "inbox:changed";

export const inboxApi = { list: call("list"), unreadCount: call("unread_count"), read: call("read") };
