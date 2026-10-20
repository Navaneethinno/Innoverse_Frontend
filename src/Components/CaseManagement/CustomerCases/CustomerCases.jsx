import { CaseQueue, SUPPORT_QUEUE } from "../OnboardingCases/OnboardingCases";

// CASE MANAGEMENT > Customer Cases (menu 186): the AML Cases screen for the
// questions and complaints customers open themselves; closed in one step.
export function CustomerCases() {
  return <CaseQueue config={SUPPORT_QUEUE} />;
}
