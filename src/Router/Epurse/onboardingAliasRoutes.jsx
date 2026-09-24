import { lazy } from "react";
import { pageElement } from "../routeSupport";

const CustomerTypes = lazy(() =>
  import("@/Components/Epurse/Onboarding/OnboardingConfiguration/OnboardingConfigurationPage.jsx").then((m) => ({ default: m.OnboardingConfigurationPage })),
);
// The six /config/customer/indv_* endpoints (individual type, identification
// type, address type, employment, document requirement, document type
// config) were replaced by the customer-type definition model:
// identification/address/employment/document rules are now sections of one
// definition's own configuration (see OnboardingDefinitionWizard.jsx). The
// existing sidebar slugs stay valid and open the Customer Types screen.
const paths = [
  "individualtypeconfig",
  "identificationtypeconfig",
  "addresstypeconfig",
  "employmentconfig",
  "documentrequirementconfig",
  "documenttypeconfig",
];
export const onboardingAliasRoutes = paths.flatMap((path) => [
  { path, element: pageElement(CustomerTypes) },
  { path: `${path}/:id`, element: pageElement(CustomerTypes) },
]);
