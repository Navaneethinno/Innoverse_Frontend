import { request } from "@/Services/Epurse/onboarding.api";

// The signed-in user's own inbox: Notification Center alerts that reached
// them and expiry notices. No menu permission; each user sees only theirs.
const call = (verb) => (body = {}) => request(`/config/user/notification/${verb}`, body);

export const inboxApi = { list: call("list"), unreadCount: call("unread_count"), read: call("read") };
