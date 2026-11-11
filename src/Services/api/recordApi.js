import { calls } from "@/Services/Epurse/onboarding.api";

// The common contract of every maker-checker record (Admin 18): one base
// route, every call a POST. `pendingPath` is the list of records with a change
// waiting for a checker.
const VERBS = ["list", "pending", "active", "get", "options", "add", "edit", "delete", "deactivate", "reactivate", "auth", "deauth", "audit", "versions"];

export const recordApi = (base, extra = []) => ({
  ...calls(base, [...VERBS, ...extra]),
  base,
  pendingPath: `${base}/pending`,
});
