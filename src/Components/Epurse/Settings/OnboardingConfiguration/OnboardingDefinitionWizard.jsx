import { onboardingDefinitionApi, onboardingDefinitionOps } from "@/Services/Epurse/onboarding.api";
import { DefinitionFormWizard } from "../FormBuilder/DefinitionFormWizard";

// Individual customer type: its form is built from the institution's own
// fields and sections (onboarding form builder handoff); the old
// catalogue-driven configuration (save_config) is gone.
export function OnboardingDefinitionWizard(props) {
  return <DefinitionFormWizard kind="individual" api={onboardingDefinitionApi} ops={onboardingDefinitionOps} {...props} />;
}
