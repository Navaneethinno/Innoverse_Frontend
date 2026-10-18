import { customerOnboardingApi } from "@/Services/Epurse/customerOnboarding.api";
import { StaffOnboardingWizard } from "./StaffOnboardingWizard";

// Individual customers onboarded by staff, on the institution's own form
// (onboarding form builder handoff §8).
export function CustomerOnboardingWizard(props) {
  return <StaffOnboardingWizard kind="individual" api={customerOnboardingApi} {...props} />;
}
