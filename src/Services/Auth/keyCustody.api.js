import { request } from "@/Services/Epurse/onboarding.api";

// Key Custody (no menu id: being a custodian is the permission). status {}
// answers 403 keys.not_custodian for everyone else. unlock / component
// { component: 64 hex } (a locked platform / a key ceremony); lock {}.
export const keyCustodyApi = {
  status: () => request("/config/key_custody/status", {}),
  unlock: (component) => request("/config/key_custody/unlock", { component }),
  component: (component) => request("/config/key_custody/component", { component }),
  lock: () => request("/config/key_custody/lock", {}),
};
