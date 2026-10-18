import { corpOnboardingDefinitionApi, corpOnboardingDefinitionOps } from "@/Services/Epurse/onboarding.api";
import { DefinitionFormWizard } from "../FormBuilder/DefinitionFormWizard";

// Corporate customer type: same form builder as individual (no KYC; the
// related-party and screening uses apply).
export function CorporateOnboardingDefinitionWizard(props) {
  return <DefinitionFormWizard kind="corporate" api={corpOnboardingDefinitionApi} ops={corpOnboardingDefinitionOps} {...props} />;
}
