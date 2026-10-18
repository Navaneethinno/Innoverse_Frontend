import { corpCustomerOnboardingApi } from "@/Services/Epurse/corporateCustomerOnboarding.api";
import { StaffOnboardingWizard } from "./StaffOnboardingWizard";

// Corporate customers onboarded by staff: same wizard, no KYC; add takes
// the company type (onboarding form builder handoff §8).
export function CorporateCustomerOnboardingWizard(props) {
  return <StaffOnboardingWizard kind="corporate" api={corpCustomerOnboardingApi} {...props} />;
}
