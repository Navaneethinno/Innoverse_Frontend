import { API_ENDPOINTS } from "@/Utils/Constant";
import { createLifecycle } from "@/Services/Epurse/onboarding.api";

// EPURSE > Risk Assessment. A setup scores one customer type from its
// onboarding answers: weighted criteria (fields backed by a list, each option
// scored 0–100) and levels covering 0–100. Standard maker-checker verbs;
// `edit` sends the whole record (criteria and levels included).
function riskApi(base) {
  const lifecycle = createLifecycle(base);
  return {
    ...lifecycle,
    // Without field_code: the usable fields and the risk actions. With one:
    // that field's options (fields[0].values).
    options: (payload = {}) => lifecycle.call("options", payload),
    // Score a sample customer: { id, values: { [field_code]: value_id } }.
    // Nothing is saved; it scores the setup as saved (approved version when
    // an edit is pending).
    score: (payload) => lifecycle.call("score", payload),
  };
}

export const individualRiskApi = riskApi(API_ENDPOINTS.RISK.INDIVIDUAL);
export const corporateRiskApi = riskApi(API_ENDPOINTS.RISK.CORPORATE);
