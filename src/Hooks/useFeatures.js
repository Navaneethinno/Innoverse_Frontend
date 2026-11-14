import { useAuth } from "@/Hooks/useAuth";

// What the signed-in user's institution has, from the login / refresh reply
// (`features`). About the institution, not the user's role: menus and rights
// still come from the menu tree. Missing (an older session) = everything
// present, nothing waiting for setup, so no choice is hidden by mistake.
const ALL = { units: [], onboarding_review: true, aml: true, customer_risk: true, merchant_risk: true, not_set_up: [] };

export function useFeatures() {
  const features = useAuth((state) => state.user?.features);
  return { ...ALL, ...(features ?? {}), not_set_up: features?.not_set_up ?? [] };
}
