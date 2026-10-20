import { AML_QUEUE, CaseQueue } from "../OnboardingCases/OnboardingCases";

// InnoAML > AML Cases (menu 185): the Onboarding Cases queue and case page,
// about an active customer, with a conversation and AML close outcomes.
export function AmlCases() {
  return <CaseQueue config={AML_QUEUE} />;
}
