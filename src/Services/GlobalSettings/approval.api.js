import { request } from "@/Services/Epurse/onboarding.api";

// Multi-level approval (maker-checker with several checkers): policies
// (menu 202), delegations and supervisors (menu 203), and for any record
// its timeline; the caller's queue and the report.
const call = (path) => (body = {}) => request(`/config/approval/${path}`, body);
const crud = (base, verbs) => ({ listPath: `/config/approval/${base}/list`, ...Object.fromEntries(verbs.map((v) => [v, call(`${base}/${v}`)])) });

export const approvalApi = { timeline: call("timeline"), queue: call("queue"), report: call("report") };
export const policyApi = crud("policy", ["options", "list", "get", "pending", "add", "edit", "delete", "auth", "deauth"]);
export const delegationApi = crud("delegation", ["list", "pending", "add", "auth", "deauth", "cancel"]);
export const supervisorApi = crud("supervisor", ["list", "set", "remove"]);
