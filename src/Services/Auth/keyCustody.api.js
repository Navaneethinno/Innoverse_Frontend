import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

// Key Custody (no menu id: being a custodian is the permission). status {}
// answers 403 keys.not_custodian for everyone else. unlock / component
// { component: 64 hex } (a locked platform / a key ceremony); lock {}.
export const keyCustodyApi = {
  status: () => request(API_ENDPOINTS.KEY_CUSTODY_API.STATUS, {}),
  unlock: (component) => request(API_ENDPOINTS.KEY_CUSTODY_API.UNLOCK, { component }),
  component: (component) => request(API_ENDPOINTS.KEY_CUSTODY_API.COMPONENT, { component }),
  lock: () => request(API_ENDPOINTS.KEY_CUSTODY_API.LOCK, {}),
};
