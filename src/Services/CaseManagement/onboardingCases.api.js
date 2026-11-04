import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

// CASE MANAGEMENT > Onboarding Cases (menu 179). A case opens when a new
// customer's or merchant's risk / AML outcome needs a person to decide.
// Every action takes { id, expected_updated_time?, ... } and replies with the
// whole case (as get does), so the screen redraws from the reply.
const BASE = API_ENDPOINTS.CASE_API.ONBOARDING;
const call = (verb) => (body) => request(`${BASE}/${verb}`, body);

export const onboardingCasesApi = {
  listPath: `${BASE}/list`,
  list: call("list"),
  get: call("get"),
  assign: call("assign"),
  note: call("note"),
  rescreen: call("rescreen"),
  propose: call("propose"),
  decide: call("decide"),
  reopen: call("reopen"),
  release: call("release"),
  // Asking the customer for more (phase 3): request takes up to 20
  // { kind, target, message, due_days }; review accepts an answer or asks
  // again; cancel withdraws an open or answered request.
  request: call("request"),
  requestReview: call("request_review"),
  requestCancel: call("request_cancel"),
};

// Onboarding Cases settings, per institution and maker-checker: edit
// proposes (send only what changes), auth applies, deauth drops. A service
// provider / System user adds inst_profile_id. Each replies like get.
export const caseSettingsApi = {
  get: (body = {}) => request(API_ENDPOINTS.CASE_API.SETTING_GET, body),
  edit: (body) => request(API_ENDPOINTS.CASE_API.SETTING_EDIT, body),
  auth: (body) => request(API_ENDPOINTS.CASE_API.SETTING_AUTH, body),
  deauth: (body) => request(API_ENDPOINTS.CASE_API.SETTING_DEAUTH, body),
};
