import { request } from "@/Services/Epurse/onboarding.api";

// CASE MANAGEMENT > Onboarding Cases (menu 179). A case opens when a new
// customer's or merchant's risk / AML outcome needs a person to decide.
// Every action takes { id, expected_updated_time?, ... } and replies with the
// whole case (as get does), so the screen redraws from the reply.
const BASE = "/config/case/onboarding";
const call = (verb) => (body) => request(`${BASE}/${verb}`, body);

export const onboardingCasesApi = {
  list: call("list"),
  get: call("get"),
  assign: call("assign"),
  note: call("note"),
  rescreen: call("rescreen"),
  propose: call("propose"),
  decide: call("decide"),
  reopen: call("reopen"),
  release: call("release"),
};
