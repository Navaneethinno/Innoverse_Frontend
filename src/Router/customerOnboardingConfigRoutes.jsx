import { lazy } from "react";
import { pageElement } from "./routeSupport";

const CustomerTypes = lazy(() =>
  import("@/Components/OnboardingConfig/OnboardingDefinitionPage.jsx").then((m) => ({ default: m.OnboardingDefinitionPage })),
);
// The six /config/customer/indv_* endpoints (individual type, identification
// type, address type, employment, document requirement, document type
// config) were replaced by the customer-type definition + version model:
// identification/address/employment/document rules are now sections of one
// version's configuration (see OnboardingVersionWizard.jsx). The existing
// sidebar slugs stay valid and open the Customer Types screen.
const paths = [
  "individualtypeconfig",
  "identificationtypeconfig",
  "addresstypeconfig",
  "employmentconfig",
  "documentrequirementconfig",
  "documenttypeconfig",
];
export const customerOnboardingConfigRoutes = paths.flatMap((path) => [
  { path, element: pageElement(CustomerTypes) },
  { path: `${path}/:id`, element: pageElement(CustomerTypes) },
]);
